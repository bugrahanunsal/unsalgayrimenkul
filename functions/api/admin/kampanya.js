/**
 * POST /api/admin/kampanya — E-posta pazarlama (kitle hesaplama, test ve toplu gönderim)
 *
 * action "kitle" : { audience }                     → { count, sample[] }
 * action "test"  : { subject, html, to }            → tek test e-postası
 * action "gonder": { audience, subject, html, preheader? } → toplu gönderim
 *
 * audience = {
 *   aboneler: bool, musteriler: bool, listeler: [etiket...], manuel: "a@b.com, c@d.com",
 *   filtre: { kategoriler: [...], bolgeler: [...], diller: [...] }   // sadece abonelere uygulanır
 * }
 *
 * GÜVENLİK
 *  - Origin + Supabase oturumu + aktif admin/super_admin rolü zorunlu.
 *  - Veriler adminin KENDİ token'ı ile (RLS altında) okunur; gizli anahtar yok.
 *  - Abonelikten çıkmış herkes (marketing_contacts.unsubscribed) otomatik hariç tutulur.
 *  - HTML'den script/iframe/olay öznitelikleri ayıklanır; boyut ve alıcı sayısı sınırlıdır.
 *  - Her alıcıya kişisel "abonelikten çık" bağlantısı + List-Unsubscribe başlığı eklenir.
 */
const SUPABASE_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4';
const SITE = 'https://ismailunsal.com.tr';
const DEFAULT_FROM = 'TURYAP İsmail Ünsal <onboarding@resend.dev>';
const DEFAULT_REPLY = 'ismunsal.59@gmail.com';
const ALLOWED_HOSTS = ['ismailunsal.com.tr', 'www.ismailunsal.com.tr'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@<>"',;:()\[\]\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const MAX_RECIPIENTS = 2000;
const MAX_HTML = 300 * 1024;

const hits = new Map();
function rateLimited(key, max, win) { const now = Date.now(); const a = (hits.get(key) || []).filter(t => now - t < win); a.push(now); hits.set(key, a); if (hits.size > 2000) hits.clear(); return a.length > max; }
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (v, n) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, n);
const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u').trim();
const arr = (v, n = 50) => Array.isArray(v) ? v.map(x => oneLine(x, 60)).filter(Boolean).slice(0, n) : [];

/** Yönetici tarafından üretilse de: çalıştırılabilir içerikleri ayıkla */
export function cleanHtml(h) {
  return String(h || '').slice(0, MAX_HTML)
    .replace(/<\s*(script|iframe|object|embed|form|input|button|textarea|select|link|meta|base|frame|frameset|svg|math)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, '')
    .replace(/<\s*(script|iframe|object|embed|link|meta|base)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|vbscript|data):[^"']*\2/gi, '$1="#"');
}
export function personalize(html, name, unsubUrl) {
  return html.replace(/\{\{\s*ad\s*\}\}/g, esc(oneLine(name, 60)) || 'Değerli müşterimiz')
    .replace(/\{\{\s*abonelik_iptal\s*\}\}/g, esc(unsubUrl || `${SITE}/unsubscribe`));
}
export function parseManual(s) {
  return String(s || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(x => EMAIL_RE.test(x)).slice(0, 500);
}
const ILGI = { daire: 'daire', villa: 'villa', mustakil_ev: 'villa', yazlik: 'villa', arsa: 'arsa', tarla: 'arsa', isyeri: 'isyeri', bina: 'isyeri' };
export function subscriberPasses(s, f) {
  const kats = arr(f.kategoriler).map(k => ILGI[k] || k);
  const bol = arr(f.bolgeler).map(norm);
  const dil = arr(f.diller);
  if (kats.length) { const si = arr(s.ilgi_kategoriler).map(x => x.toLowerCase()); if (!si.some(x => kats.includes(x))) return false; }
  if (bol.length) { const sb = arr(s.ilgi_bolgeler).map(norm); if (!sb.some(x => bol.includes(x))) return false; }
  if (dil.length && !dil.includes(String(s.language || 'tr'))) return false;
  return true;
}

async function sbGet(path, token) {
  const r = await fetch(`${SUPABASE_URL}${path}`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (!r.ok) throw new Error('db_' + r.status);
  return r.json();
}
async function verifyAdmin(token) {
  if (!token || token.length > 4096 || !/^[A-Za-z0-9\-_=.]+$/.test(token)) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json(); if (!u || !UUID_RE.test(u.id || '')) return null;
  const row = (await sbGet(`/rest/v1/admin_users?id=eq.${u.id}&select=role,is_active&limit=1`, token).catch(() => []))[0];
  if (!row || !row.is_active || !['admin', 'super_admin'].includes(row.role)) return null;
  return { id: u.id, email: String(u.email || '').toLowerCase() };
}

/** Kitleyi hesapla: e-posta → {email, name} (tekil) */
async function resolveAudience(a, token) {
  a = a || {};
  const out = new Map();
  const add = (email, name, src) => {
    email = String(email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || out.has(email)) return;
    out.set(email, { email, name: oneLine(name, 60), src });
  };
  if (a.aboneler) {
    const subs = await sbGet('/rest/v1/subscribers?is_active=eq.true&email_verified=eq.true&select=email,full_name,ilgi_kategoriler,ilgi_bolgeler,language&limit=5000', token);
    subs.filter(s => subscriberPasses(s, a.filtre || {})).forEach(s => add(s.email, s.full_name, 'abone'));
  }
  if (a.musteriler) {
    const leads = await sbGet('/rest/v1/leads?email=not.is.null&select=email,isim&order=created_at.desc&limit=5000', token);
    leads.forEach(l => add(l.email, l.isim, 'musteri'));
  }
  const tags = arr(a.listeler, 20);
  if (tags.length) {
    const q = tags.map(t => '"' + t.replace(/["\\,{}]/g, '') + '"').join(',');
    const rows = await sbGet(`/rest/v1/marketing_contacts?unsubscribed=eq.false&tags=ov.${encodeURIComponent('{' + q + '}')}&select=email,full_name&limit=5000`, token);
    rows.forEach(r => add(r.email, r.full_name, 'liste'));
  }
  parseManual(a.manuel).forEach(e => add(e, '', 'manuel'));
  return out;
}

/** Herkesi marketing_contacts'a (varsa dokunmadan) kaydet → kişisel iptal token'ı + iptal durumu */
async function ensureContacts(list, token) {
  const res = new Map();
  for (let i = 0; i < list.length; i += 500) {
    const chunk = list.slice(i, i + 500).map(x => ({ email: x.email, full_name: x.name || null, source: x.src }));
    await fetch(`${SUPABASE_URL}/rest/v1/marketing_contacts?on_conflict=email`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(chunk)
    });
    const emails = chunk.map(c => '"' + c.email.replace(/"/g, '') + '"').join(',');
    const rows = await sbGet(`/rest/v1/marketing_contacts?email=in.(${encodeURIComponent(emails)})&select=email,unsubscribed,unsubscribe_token`, token);
    rows.forEach(r => res.set(String(r.email).toLowerCase(), r));
  }
  return res;
}

async function resend(env, payload, batch) {
  const r = await fetch(`https://api.resend.com/emails${batch ? '/batch' : ''}`, { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 300) };
}
function resendError(res) {
  if (/only send testing emails|verify a domain|domain is not verified/i.test(res.body)) return { error: 'domain_not_verified', message: 'Resend\'de ismailunsal.com.tr domaini henüz doğrulanmadı. Doğrulanana kadar sadece kendi adresinize test gönderebilirsiniz.' };
  return { error: 'send_failed', message: 'E-posta gönderilemedi (' + res.status + ').' };
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const origin = request.headers.get('Origin'); let host = '';
  try { host = new URL(origin).hostname; } catch (_) {}
  if (!origin || !(host === new URL(request.url).hostname || ALLOWED_HOSTS.includes(host))) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false, error: 'bad_request' }, 415);
  if ((+request.headers.get('Content-Length') || 0) > MAX_HTML + 20000) return json({ ok: false, error: 'too_large', message: 'Tasarım çok büyük.' }, 413);
  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  if (rateLimited('ip:' + ip, 120, 10 * 60 * 1000)) return json({ ok: false, error: 'rate_limited' }, 429);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  let me = null; try { me = await verifyAdmin(token); } catch (_) {}
  if (!me) return json({ ok: false, error: 'unauthorized', message: 'Oturum geçersiz veya yetkiniz yok.' }, 401);

  let b; try { b = JSON.parse((await request.text()).slice(0, MAX_HTML + 20000)); } catch (_) { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!b || typeof b !== 'object') return json({ ok: false, error: 'bad_json' }, 400);

  try {
    if (b.action === 'kitle') {
      const m = await resolveAudience(b.audience, token);
      const list = [...m.values()];
      let unsub = 0;
      if (list.length) {
        const emails = list.slice(0, 3000).map(x => '"' + x.email.replace(/"/g, '') + '"');
        for (let i = 0; i < emails.length; i += 300) {
          const rows = await sbGet(`/rest/v1/marketing_contacts?unsubscribed=eq.true&email=in.(${encodeURIComponent(emails.slice(i, i + 300).join(','))})&select=email`, token).catch(() => []);
          unsub += rows.length;
        }
      }
      return json({ ok: true, count: Math.max(0, list.length - unsub), excluded_unsubscribed: unsub, sample: list.slice(0, 8).map(x => x.email) });
    }

    const subject = oneLine(b.subject, 150);
    if (subject.length < 3) return json({ ok: false, error: 'no_subject', message: 'E-posta konusu girin.' }, 400);
    const html = cleanHtml(b.html);
    if (html.length < 50 || !/\{\{\s*abonelik_iptal\s*\}\}/.test(html)) return json({ ok: false, error: 'bad_html', message: 'Tasarım geçersiz (abonelikten çıkma bağlantısı zorunludur).' }, 400);
    if (!env.RESEND_API_KEY) return json({ ok: false, error: 'no_email_key', message: 'E-posta servisi yapılandırılmamış.' }, 500);
    const from = env.LEAD_FROM_EMAIL || DEFAULT_FROM, reply = env.LEAD_TO_EMAIL || DEFAULT_REPLY;
    const text = (h) => h.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim().slice(0, 20000);

    if (b.action === 'test') {
      const to = oneLine(b.to || me.email, 254).toLowerCase();
      if (!EMAIL_RE.test(to)) return json({ ok: false, error: 'bad_email', message: 'Geçerli test adresi girin.' }, 400);
      if (rateLimited('t:' + me.id, 30, 60 * 60 * 1000)) return json({ ok: false, error: 'rate_limited', message: 'Çok fazla test gönderimi.' }, 429);
      const h = personalize(html, 'Test', `${SITE}/unsubscribe`);
      const res = await resend(env, { from, to: [to], reply_to: reply, subject: '[TEST] ' + subject, html: h, text: text(h) });
      if (!res.ok) return json({ ok: false, ...resendError(res) }, 502);
      return json({ ok: true, sent: 1 });
    }

    if (b.action === 'gonder') {
      if (rateLimited('g:' + me.id, 6, 60 * 60 * 1000)) return json({ ok: false, error: 'rate_limited', message: 'Saatte en fazla 6 kampanya gönderilebilir.' }, 429);
      const m = await resolveAudience(b.audience, token);
      let list = [...m.values()];
      if (!list.length) return json({ ok: false, error: 'empty', message: 'Seçilen kitlede kimse yok.' }, 400);
      if (list.length > MAX_RECIPIENTS) return json({ ok: false, error: 'too_many', message: `Tek seferde en fazla ${MAX_RECIPIENTS} kişiye gönderilebilir. Kitleyi daraltın.` }, 400);
      const contacts = await ensureContacts(list, token);
      list = list.filter(x => { const c = contacts.get(x.email); return !(c && c.unsubscribed); });
      const pre = oneLine(b.preheader, 140);
      const emails = list.map(x => {
        const c = contacts.get(x.email);
        const tok = c && UUID_RE.test(String(c.unsubscribe_token || '')) ? c.unsubscribe_token : '';
        const unsub = tok ? `${SITE}/unsubscribe?m=${tok}` : `${SITE}/unsubscribe`;
        const h = personalize(html, x.name, unsub);
        const e = { from, to: [x.email], reply_to: reply, subject, html: h, text: text(h) };
        if (tok) e.headers = { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
        return e;
      });
      let sent = 0, lastErr = null;
      for (let i = 0; i < emails.length; i += 100) {
        const res = await resend(env, emails.slice(i, i + 100), true);
        if (res.ok) sent += Math.min(100, emails.length - i); else { lastErr = res; break; }
      }
      if (!sent && lastErr) return json({ ok: false, ...resendError(lastErr) }, 502);
      return json({ ok: true, sent, total: emails.length, partial: !!lastErr, preheader: !!pre });
    }
    return json({ ok: false, error: 'bad_action' }, 400);
  } catch (e) {
    console.warn('[kampanya] hata', e && e.message);
    const missing = /db_404|db_400/.test(String(e && e.message));
    return json({ ok: false, error: 'server_error', message: missing ? 'Veritabanı kurulumu eksik görünüyor (SQL kurulum dosyasını çalıştırın).' : 'Beklenmeyen bir hata oluştu.' }, 500);
  }
}
