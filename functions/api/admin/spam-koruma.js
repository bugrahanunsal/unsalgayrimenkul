/**
 * POST /api/admin/spam-koruma — Panel → Spam Koruması (Google reCAPTCHA v3)
 *
 *  action "durum"  → ayarlar + sunucu hazırlığı + son 30 günün istatistiği (gizli anahtar ASLA dönmez; yalnızca son 4 karakteri)
 *  action "kaydet" → { site_key, secret? }  anahtarları kaydeder. Anahtar değişirse koruma KAPANIR ve yeniden test gerekir.
 *  action "test"   → { token }  panelde üretilen reCAPTCHA anahtarını Google'a doğrulatır, sonucu kaydeder
 *  action "ayar"   → { aktif?, min_skor?, formlar? }  korumayı açar/kapatır. Açmak için son testin başarılı olması ŞART.
 *  action "kaldir" → anahtarları siler, korumayı kapatır
 *
 * GÜVENLİK
 *  - Yalnızca kendi sitemizden (Origin) + Supabase oturumu + AKTİF admin/super_admin.
 *  - Ayar tablolarına tarayıcıdan erişim yoktur; burada SUPABASE_SERVICE_ROLE_KEY (Cloudflare Secret) ile yazılır.
 *  - Gizli anahtar yalnızca bu sunucuda okunur, hiçbir yanıtta geri gönderilmez.
 */
import { ALLOWED_HOSTS, FORMS, KEY_RE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, _resetCache, hostAllowed, loadConfig, logResult, sbHeaders, serviceKey, verifyToken } from '../../_lib/spam.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hits = new Map();
function limited(k, max, win) { const n = Date.now(); const a = (hits.get(k) || []).filter(t => n - t < win); a.push(n); hits.set(k, a); if (hits.size > 2000) hits.clear(); return a.length > max; }
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const NO_KEY = 'Sunucu ayarı eksik: Cloudflare → Settings → Variables and Secrets bölümüne SUPABASE_SERVICE_ROLE_KEY (Secret) ekleyin ve yeniden yayınlayın.';

async function verifyAdmin(token, env) {
  if (!token || token.length > 4096 || !/^[A-Za-z0-9\-_=.]+$/.test(token)) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  if (!u || !UUID_RE.test(u.id || '')) return null;
  const key = serviceKey(env);
  const q = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?id=eq.${u.id}&select=role,is_active&limit=1`,
    { headers: key ? sbHeaders(key) : { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } }).catch(() => null);
  const row = q && q.ok ? (await q.json().catch(() => []))[0] : null;
  if (!row || !row.is_active || !['admin', 'super_admin'].includes(row.role)) return null;
  return { id: u.id, role: row.role };
}

async function patch(env, table, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.1`, { method: 'PATCH', headers: sbHeaders(serviceKey(env), { Prefer: 'return=minimal' }), body: JSON.stringify(body) });
  if (!r.ok) throw new Error('db_' + r.status + ':' + (await r.text()).slice(0, 160));
}

async function stats(env) {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/spam_kayit?created_at=gte.${encodeURIComponent(since)}&select=form,sonuc,skor,neden,created_at&order=created_at.desc&limit=5000`, { headers: sbHeaders(serviceKey(env)) });
  if (!r.ok) return null;
  const rows = await r.json();
  const out = { toplam: 0, gecti: 0, spam: 0, reddedildi: 0, hata: 0, formlar: {}, son: [] };
  rows.forEach(x => {
    if (x.form === 'test') return;
    out.toplam++; out[x.sonuc] = (out[x.sonuc] || 0) + 1;
    const f = out.formlar[x.form] || (out.formlar[x.form] = { gecti: 0, spam: 0, reddedildi: 0, hata: 0 });
    f[x.sonuc] = (f[x.sonuc] || 0) + 1;
  });
  out.son = rows.filter(x => x.sonuc !== 'gecti').slice(0, 12).map(x => ({ form: x.form, sonuc: x.sonuc, skor: x.skor, neden: x.neden, tarih: x.created_at }));
  return out;
}

function publicState(cfg) {
  return {
    site_key: cfg.site_key, aktif: cfg.aktif, min_skor: cfg.min_skor, formlar: cfg.formlar, updated_at: cfg.updated_at,
    gizli: { var: !!cfg.secret, son4: cfg.secret ? cfg.secret.slice(-4) : null },
    test: { ok: cfg.test.ok && !!cfg.site_key && cfg.test.site_key === cfg.site_key && !!cfg.secret, at: cfg.test.at, skor: cfg.test.skor, host: cfg.test.host, hata: cfg.test.hata }
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const origin = request.headers.get('Origin'); let host = '';
  try { host = new URL(origin).hostname; } catch (_) {}
  const selfHost = new URL(request.url).hostname;
  if (!origin || !(host === selfHost || ALLOWED_HOSTS.includes(host))) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false, error: 'bad_request' }, 415);
  if ((+request.headers.get('Content-Length') || 0) > 8000) return json({ ok: false, error: 'too_large' }, 413);
  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  if (limited('ip:' + ip, 60, 10 * 60 * 1000)) return json({ ok: false, error: 'rate_limited', message: 'Çok fazla istek. Biraz sonra tekrar deneyin.' }, 429);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  let me = null; try { me = await verifyAdmin(token, env); } catch (_) {}
  if (!me) return json({ ok: false, error: 'unauthorized', message: 'Oturum geçersiz veya yetkiniz yok.' }, 401);

  let b; try { b = JSON.parse((await request.text()).slice(0, 8000)); } catch (_) { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad_json' }, 400);

  const sunucu = { service_key: !!serviceKey(env), resend: !!env.RESEND_API_KEY };
  if (!sunucu.service_key) {
    if (b.action === 'durum') return json({ ok: true, sunucu, ayar: null });
    return json({ ok: false, error: 'not_configured', message: NO_KEY }, 503);
  }

  try {
    if (b.action === 'durum') {
      const cfg = await loadConfig(env, true);
      if (!cfg.ok) return json({ ok: false, error: 'db', message: 'Veritabanı kurulumu eksik görünüyor (spam koruması SQL dosyasını çalıştırın).' }, 500);
      return json({ ok: true, sunucu, ayar: publicState(cfg), istatistik: await stats(env).catch(() => null) });
    }

    if (b.action === 'kaydet') {
      if (limited('k:' + me.id, 20, 60 * 60 * 1000)) return json({ ok: false, error: 'rate_limited', message: 'Çok fazla deneme. Biraz sonra tekrar deneyin.' }, 429);
      const siteKey = String(b.site_key || '').trim();
      const secret = b.secret == null ? '' : String(b.secret).trim();
      if (!KEY_RE.test(siteKey)) return json({ ok: false, error: 'bad_site_key', message: 'Site anahtarı geçersiz görünüyor. Google\'daki "Anahtar kimliği / Site key" değerini eksiksiz yapıştırın.' }, 400);
      if (secret && !KEY_RE.test(secret)) return json({ ok: false, error: 'bad_secret', message: 'Gizli anahtar geçersiz görünüyor. Google\'daki "Gizli anahtar / Secret key" değerini eksiksiz yapıştırın.' }, 400);
      if (secret && secret === siteKey) return json({ ok: false, error: 'same_keys', message: 'Site anahtarı ile gizli anahtar aynı olamaz. Gizli anahtarı Google\'da "Eski anahtarı kullan / Use legacy key" bölümünden alın.' }, 400);
      const cfg = await loadConfig(env, true);
      if (!cfg.ok) return json({ ok: false, error: 'db', message: 'Veritabanı kurulumu eksik görünüyor (spam koruması SQL dosyasını çalıştırın).' }, 500);
      if (!secret && !cfg.secret) return json({ ok: false, error: 'no_secret', message: 'Gizli anahtarı da girin.' }, 400);
      const changed = siteKey !== cfg.site_key || (secret && secret !== cfg.secret);
      if (changed) {
        // Önce korumayı kapat (yanlış anahtarla ziyaretçiler engellenmesin), sonra anahtarları yaz
        await patch(env, 'spam_koruma', { aktif: false, site_key: siteKey, updated_at: new Date().toISOString(), updated_by: me.id });
        const g = { test_ok: false, test_at: null, test_site_key: null, test_skor: null, test_host: null, test_hata: null, updated_at: new Date().toISOString(), updated_by: me.id };
        if (secret) g.secret = secret;
        await patch(env, 'spam_koruma_gizli', g);
      }
      _resetCache();
      const now = await loadConfig(env, true);
      return json({ ok: true, degisti: !!changed, korumaKapandi: !!(changed && cfg.aktif), ayar: publicState(now) });
    }

    if (b.action === 'test') {
      if (limited('t:' + me.id, 30, 60 * 60 * 1000)) return json({ ok: false, error: 'rate_limited', message: 'Çok fazla test. Biraz sonra tekrar deneyin.' }, 429);
      const cfg = await loadConfig(env, true);
      if (!cfg.ok || !cfg.site_key || !cfg.secret) return json({ ok: false, error: 'no_keys', message: 'Önce iki anahtarı da kaydedin.' }, 400);
      const tok = String(b.token || '');
      let hata = null, v = null;
      if (!/^[A-Za-z0-9_-]{20,4096}$/.test(tok)) hata = 'Tarayıcıda reCAPTCHA çalışmadı. Site anahtarını ve Google\'daki alan adı listesini (ismailunsal.com.tr) kontrol edin; reklam engelleyici açıksa kapatın.';
      else {
        v = await verifyToken(cfg.secret, tok, ip);
        const codes = Array.isArray(v['error-codes']) ? v['error-codes'].map(String) : [];
        if (v.network) hata = 'Google\'a şu anda ulaşılamadı. Birkaç dakika sonra tekrar deneyin.';
        else if (codes.some(c => /secret/i.test(c))) hata = 'Gizli anahtar hatalı. Google Cloud\'da anahtarın "Entegrasyon → Eski anahtarı kullan (Use legacy key)" bölümündeki gizli anahtarı yapıştırın.';
        else if (v.success !== true) hata = 'Google doğrulamayı kabul etmedi (' + (codes.join(', ') || 'bilinmeyen hata') + '). Site anahtarı ile gizli anahtar aynı Google anahtarına mı ait?';
        else if (!hostAllowed(v.hostname, selfHost)) hata = 'Doğrulama farklı bir alan adından geldi (' + String(v.hostname || '?').slice(0, 80) + '). Google\'daki anahtar ayarlarına bu alan adını ekleyin.';
        else if (typeof v.score !== 'number') hata = 'Bu anahtar "puan tabanlı (v3)" değil. Google\'da yeni anahtar oluştururken "Onay kutusu (checkbox)" seçeneğini KAPALI bırakın.';
        else if (v.action && v.action !== 'admin_test') hata = 'Beklenmeyen işlem adı (' + String(v.action).slice(0, 40) + ').';
      }
      await patch(env, 'spam_koruma_gizli', {
        test_ok: !hata, test_at: new Date().toISOString(), test_site_key: cfg.site_key,
        test_skor: v && typeof v.score === 'number' ? Math.round(v.score * 100) / 100 : null,
        test_host: v && v.hostname ? String(v.hostname).slice(0, 120) : null, test_hata: hata ? hata.slice(0, 200) : null
      });
      await logResult(env, 'test', hata ? 'hata' : 'gecti', v && typeof v.score === 'number' ? v.score : null, hata ? hata.slice(0, 120) : null);
      _resetCache();
      const now = await loadConfig(env, true);
      return json({ ok: !hata, message: hata || 'Test başarılı. Artık korumayı açabilirsiniz.', skor: v && v.score, host: v && v.hostname, ayar: publicState(now) }, hata ? 400 : 200);
    }

    if (b.action === 'ayar') {
      const cfg = await loadConfig(env, true);
      if (!cfg.ok) return json({ ok: false, error: 'db', message: 'Veritabanı kurulumu eksik görünüyor.' }, 500);
      const body = { updated_at: new Date().toISOString(), updated_by: me.id };
      if (b.min_skor != null) {
        const s = Math.round(Number(b.min_skor) * 10) / 10;
        if (!(s >= 0.1 && s <= 0.9)) return json({ ok: false, error: 'bad_score', message: 'Eşik 0.1 ile 0.9 arasında olmalı.' }, 400);
        body.min_skor = s;
      }
      if (b.formlar != null) {
        if (!Array.isArray(b.formlar) || b.formlar.some(f => !FORMS.includes(f))) return json({ ok: false, error: 'bad_forms' }, 400);
        body.formlar = [...new Set(b.formlar)];
      }
      if (b.aktif != null) {
        const on = b.aktif === true;
        if (on) {
          const st = publicState(cfg);
          if (!st.test.ok) return json({ ok: false, error: 'not_tested', message: 'Korumayı açmadan önce "Test et" ile anahtarların çalıştığını doğrulayın.' }, 409);
          const forms = body.formlar || cfg.formlar;
          if (!forms.length) return json({ ok: false, error: 'no_forms', message: 'En az bir form seçin.' }, 400);
        }
        body.aktif = on;
      }
      await patch(env, 'spam_koruma', body);
      _resetCache();
      const now = await loadConfig(env, true);
      return json({ ok: true, ayar: publicState(now) });
    }

    if (b.action === 'kaldir') {
      await patch(env, 'spam_koruma', { aktif: false, site_key: null, updated_at: new Date().toISOString(), updated_by: me.id });
      await patch(env, 'spam_koruma_gizli', { secret: null, test_ok: false, test_at: null, test_site_key: null, test_skor: null, test_host: null, test_hata: null, updated_at: new Date().toISOString(), updated_by: me.id });
      _resetCache();
      const now = await loadConfig(env, true);
      return json({ ok: true, ayar: publicState(now) });
    }

    return json({ ok: false, error: 'bad_action' }, 400);
  } catch (e) {
    console.warn('[spam-koruma]', e && e.message);
    const missing = /db_404|db_400|42P01|42703/.test(String(e && e.message));
    return json({ ok: false, error: 'server_error', message: missing ? 'Veritabanı kurulumu eksik görünüyor (spam koruması SQL dosyasını çalıştırın).' : 'Beklenmeyen bir hata oluştu.' }, 500);
  }
}
