/**
 * ============================================================
 * POST /api/admin/ilan-gonder — Cloudflare Pages Function
 * ============================================================
 * Admin panelinden e-posta ile ilan gönderme:
 *
 *  action: "musteri"  → Seçilen müşteriye, seçilen (filtrelenmiş) ilanları gönderir.
 *          body: { action, to_email, to_name?, property_ids: [..1-20], message?, subject?, preview? }
 *
 *  action: "duyuru"   → Yeni ilanı, ilgi alanı eşleşen AKTİF + DOĞRULANMIŞ abonelere duyurur.
 *          body: { action, property_id, dry_run? }   (dry_run: sadece kaç kişiye gideceğini söyler)
 *
 * GÜVENLİK
 *  - Yalnızca kendi sitemizden (Origin) gelen istekler.
 *  - Authorization: Bearer <Supabase oturum token'ı> ZORUNLU. Token Supabase'e
 *    sorularak doğrulanır; kullanıcı admin_users'da aktif ve rolü admin/super_admin olmalı.
 *  - Veritabanı sorguları adminin KENDİ token'ı ile yapılır (RLS geçerli kalır).
 *    Service role key KULLANILMAZ, bu dosyada hiçbir gizli anahtar YOKTUR.
 *  - İlan içerikleri istemciden alınmaz; sunucu ID'lerle kendisi çeker (yalnızca aktif ilanlar).
 *  - Tüm metinler HTML-escape edilir; alıcı e-postası doğrulanır; hız sınırı vardır.
 *
 * Cloudflare Secrets: RESEND_API_KEY (zorunlu), LEAD_FROM_EMAIL, LEAD_TO_EMAIL (opsiyonel)
 * NOT: Resend'de domain doğrulanmadan (onboarding@resend.dev) SADECE Resend hesabının
 *      kendi adresine mail gider. Müşterilere göndermek için ismailunsal.com.tr domaini
 *      Resend'de doğrulanmalı ve LEAD_FROM_EMAIL = "TURYAP İsmail Ünsal <ilan@ismailunsal.com.tr>" yapılmalı.
 */

const SUPABASE_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4'; // public (zaten sitede)
const SITE = 'https://ismailunsal.com.tr';
const DEFAULT_FROM = 'TURYAP İsmail Ünsal <onboarding@resend.dev>';
const DEFAULT_REPLY = 'ismunsal.59@gmail.com';
const ALLOWED_HOSTS = ['ismailunsal.com.tr', 'www.ismailunsal.com.tr'];
const ADMIN_ROLES = ['admin', 'super_admin'];
const PHONE = '+90 507 518 84 82';
const WA = 'https://wa.me/905075188482';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@<>"',;:()\[\]\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const MAX_LISTINGS = 20;
const MAX_BROADCAST = 1000;

const KATEGORI = { daire: 'Daire', villa: 'Villa', arsa: 'Arsa', mustakil_ev: 'Müstakil Ev', isyeri: 'İşyeri', yazlik: 'Yazlık', tarla: 'Tarla', bina: 'Bina' };
const TIP = { satilik: 'Satılık', kiralik: 'Kiralık' };
// İlan kategorisi → abone formundaki ilgi kategorisi
const ILGI = { daire: 'daire', villa: 'villa', mustakil_ev: 'villa', yazlik: 'villa', arsa: 'arsa', tarla: 'arsa', isyeri: 'isyeri', bina: 'isyeri' };

// ---------------- yardımcılar ----------------
const hits = new Map();
function rateLimited(key, max, winMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < winMs);
  arr.push(now); hits.set(key, arr);
  if (hits.size > 2000) hits.clear();
  return arr.length > max;
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (v, n) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, n);
const clean = (v, n) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

function fmtPrice(v, cur) {
  if (!v) return 'Fiyat için arayın';
  const sym = { TL: '₺', TRY: '₺', USD: '$', EUR: '€', GBP: '£' }[cur] || '₺';
  return new Intl.NumberFormat('tr-TR').format(v) + ' ' + sym;
}
export function listingUrl(p) {
  return (p.slug && SLUG_RE.test(p.slug) && p.slug.length <= 220)
    ? `${SITE}/ilan/${p.slug}` : `${SITE}/ilan?id=${encodeURIComponent(p.id)}`;
}
function mainImage(p) {
  const imgs = (p.property_images || []).filter(i => i && typeof i.url === 'string' && /^https:\/\//i.test(i.url));
  if (!imgs.length) return '';
  const m = imgs.find(i => i.ana_foto === true) || imgs.slice().sort((a, b) => (a.sira || 0) - (b.sira || 0))[0];
  return m.url;
}
function facts(p) {
  const f = [];
  if (p.oda_sayisi) f.push(p.oda_sayisi);
  if (p.m2) f.push(p.m2 + ' m²');
  if (p.banyo_sayisi) f.push(p.banyo_sayisi + ' banyo');
  if (p.kat) f.push('Kat: ' + p.kat);
  const oz = p.ozellikler || {};
  if (oz.bahceli) f.push('Bahçeli');
  if (oz.deniz_manzarali) f.push('Deniz manzaralı');
  if (oz.havuzlu) f.push('Havuzlu');
  if (oz.esyali) f.push('Eşyalı');
  return f.slice(0, 6);
}

// ---------------- e-posta şablonu ----------------
function card(p) {
  const url = listingUrl(p);
  const img = mainImage(p);
  const loc = [p.mahalle, p.ilce, 'Yalova'].filter(Boolean).join(', ');
  const badge = [TIP[p.tip], KATEGORI[p.kategori]].filter(Boolean).join(' · ');
  return `
  <tr><td style="padding:0 0 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;background:#FFFFFF;">
      ${img ? `<tr><td><a href="${esc(url)}" target="_blank"><img src="${esc(img)}" width="100%" alt="${esc(p.baslik_tr)}" style="display:block;width:100%;max-height:260px;object-fit:cover;border:0;"></a></td></tr>` : ''}
      <tr><td style="padding:16px 18px 18px;font-family:Arial,Helvetica,sans-serif;">
        ${badge ? `<div style="display:inline-block;background:#EFF6FF;color:#1D4ED8;font-size:11px;font-weight:700;letter-spacing:.5px;padding:4px 10px;border-radius:999px;margin-bottom:8px;">${esc(badge.toUpperCase())}</div>` : ''}
        <div style="font-size:17px;font-weight:700;color:#0A2A5E;line-height:1.35;margin-bottom:4px;">${esc(p.baslik_tr || 'İlan')}</div>
        <div style="font-size:13px;color:#6B7280;margin-bottom:10px;">📍 ${esc(loc)}</div>
        ${facts(p).length ? `<div style="font-size:13px;color:#374151;margin-bottom:12px;">${facts(p).map(esc).join(' &nbsp;•&nbsp; ')}</div>` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:19px;font-weight:800;color:#0A2A5E;white-space:nowrap;">${esc(fmtPrice(p.fiyat, p.para_birimi))}</td>
          <td align="right"><a href="${esc(url)}" target="_blank" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:8px;">İlanı İncele →</a></td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

export function renderListingsEmail({ name, message, properties, intro, unsubscribeUrl, footerNote }) {
  const hello = name ? `Merhaba ${esc(oneLine(name, 60))},` : 'Merhaba,';
  const msgHtml = message ? `<div style="background:#F8FAFC;border-left:4px solid #2563EB;border-radius:6px;padding:14px 16px;margin:0 0 20px;font-size:14px;line-height:1.6;color:#1F2937;white-space:pre-line;">${esc(message)}</div>` : '';
  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>İlanlar</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <tr><td style="background:#0A2A5E;border-radius:14px 14px 0 0;padding:20px 22px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="background:#FFFFFF;color:#0A2A5E;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:13px;letter-spacing:1.5px;padding:7px 9px;border-radius:3px;white-space:nowrap;">TURYAP</td>
      <td style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;white-space:nowrap;"><span style="color:#FFFFFF;font-weight:800;font-size:18px;letter-spacing:1px;">İSMAİL </span><span style="color:#60A5FA;font-weight:800;font-size:18px;letter-spacing:1px;">ÜNSAL</span><div style="color:rgba(255,255,255,.6);font-size:9px;letter-spacing:3px;margin-top:2px;">REAL ESTATE</div></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#FFFFFF;padding:24px 22px 8px;font-family:Arial,Helvetica,sans-serif;">
    <div style="font-size:16px;color:#0A2A5E;font-weight:700;margin-bottom:8px;">${hello}</div>
    <div style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:18px;">${esc(intro)}</div>
    ${msgHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${properties.map(card).join('')}</table>
  </td></tr>
  <tr><td style="background:#FFFFFF;padding:4px 22px 24px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border-radius:10px;"><tr><td style="padding:16px 18px;">
      <div style="font-size:14px;font-weight:700;color:#0A2A5E;margin-bottom:6px;">Görmek veya bilgi almak ister misiniz?</div>
      <div style="font-size:13px;color:#374151;line-height:1.6;">📞 <a href="tel:+905075188482" style="color:#1D4ED8;text-decoration:none;font-weight:700;">${PHONE}</a> &nbsp;·&nbsp; 💬 <a href="${WA}" style="color:#1D4ED8;text-decoration:none;font-weight:700;">WhatsApp</a><br>Bu e-postayı yanıtlayarak da bize ulaşabilirsiniz.</div>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#0A2A5E;border-radius:0 0 14px 14px;padding:16px 22px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:rgba(255,255,255,.7);text-align:center;">
    TURYAP İsmail Ünsal Real Estate · Yalova · <a href="${SITE}" style="color:#93C5FD;text-decoration:none;">ismailunsal.com.tr</a>
    ${footerNote ? `<br>${esc(footerNote)}` : ''}
    ${unsubscribeUrl ? `<br><a href="${esc(unsubscribeUrl)}" style="color:#93C5FD;">Abonelikten çık</a>` : ''}
  </td></tr>
</table></td></tr></table></body></html>`;
  const text = [hello.replace(/&[^;]+;/g, ''), '', intro, message ? '\n' + message + '\n' : '',
    ...properties.map(p => `• ${p.baslik_tr} — ${fmtPrice(p.fiyat, p.para_birimi)}\n  ${listingUrl(p)}`),
    '', `Telefon: ${PHONE} · WhatsApp: ${WA}`, unsubscribeUrl ? `Abonelikten çık: ${unsubscribeUrl}` : ''].join('\n');
  return { html, text };
}

// ---------------- abone eşleştirme ----------------
const arr = (v) => Array.isArray(v) ? v.map(x => String(x).toLowerCase().trim()).filter(Boolean) : [];
const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u').trim();
export function subscriberMatches(s, p) {
  const kats = arr(s.ilgi_kategoriler);
  if (kats.length && !kats.includes(ILGI[p.kategori] || p.kategori)) return false;
  const tip = String(s.islem_tipi || '').toLowerCase();
  if (tip && !['hepsi', 'tumu', 'all', 'her_ikisi', 'ikisi'].includes(tip) && tip !== p.tip) return false;
  const bolgeler = arr(s.ilgi_bolgeler).map(norm);
  if (bolgeler.length && !bolgeler.some(b => b === norm(p.ilce) || (p.mahalle && b === norm(p.mahalle)))) return false;
  const fiyat = Number(p.fiyat) || 0;
  if (fiyat && s.min_fiyat && fiyat < Number(s.min_fiyat)) return false;
  if (fiyat && s.max_fiyat && fiyat > Number(s.max_fiyat)) return false;
  return true;
}

// ---------------- Supabase (adminin kendi token'ı ile) ----------------
async function sb(path, token) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  if (!r.ok) throw new Error('db_' + r.status);
  return r.json();
}
async function verifyAdmin(token) {
  if (!token || token.length > 4096 || !/^[A-Za-z0-9\-_=.]+$/.test(token)) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const user = await r.json();
  if (!user || !UUID_RE.test(user.id || '')) return null;
  const rows = await sb(`/rest/v1/admin_users?id=eq.${user.id}&select=role,is_active&limit=1`, token).catch(() => []);
  const row = rows && rows[0];
  if (!row || !row.is_active || !ADMIN_ROLES.includes(row.role)) return null;
  return { id: user.id, email: user.email, role: row.role };
}
const PROP_FIELDS = 'id,slug,baslik_tr,tip,kategori,ilce,mahalle,fiyat,para_birimi,m2,oda_sayisi,banyo_sayisi,kat,ozellikler,durum,property_images(url,ana_foto,sira)';

async function resend(env, payload, batch) {
  const r = await fetch(`https://api.resend.com/emails${batch ? '/batch' : ''}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await r.text();
  return { ok: r.ok, status: r.status, body: body.slice(0, 400) };
}
function resendError(res) {
  if (/only send testing emails|verify a domain|domain is not verified/i.test(res.body)) {
    return { error: 'domain_not_verified', message: 'Resend\'de ismailunsal.com.tr domaini henüz doğrulanmadı. Doğrulanana kadar sadece kendi adresinize test maili gider.' };
  }
  return { error: 'send_failed', message: 'E-posta gönderilemedi (' + res.status + ').' };
}

// ---------------- işlemler ----------------
async function sendToCustomer(b, env, token, admin) {
  const to = oneLine(b.to_email, 254).toLowerCase();
  if (!EMAIL_RE.test(to)) return json({ ok: false, error: 'bad_email', message: 'Geçerli bir e-posta adresi girin.' }, 400);
  const ids = [...new Set(Array.isArray(b.property_ids) ? b.property_ids : [])].filter(x => UUID_RE.test(String(x)));
  if (!ids.length) return json({ ok: false, error: 'no_listings', message: 'En az 1 ilan seçin.' }, 400);
  if (ids.length > MAX_LISTINGS) return json({ ok: false, error: 'too_many', message: `En fazla ${MAX_LISTINGS} ilan gönderilebilir.` }, 400);
  const props = await sb(`/rest/v1/properties?id=in.(${ids.join(',')})&durum=eq.aktif&select=${PROP_FIELDS}`, token);
  if (!props.length) return json({ ok: false, error: 'no_active', message: 'Seçilen ilanlar aktif değil.' }, 400);
  const order = new Map(ids.map((id, i) => [id, i]));
  props.sort((a, c) => order.get(a.id) - order.get(c.id));

  const name = oneLine(b.to_name, 60);
  const message = clean(b.message, 1000);
  const { html, text } = renderListingsEmail({
    name, message, properties: props,
    intro: props.length === 1 ? 'Aradığınız kriterlere uygun bir ilanı sizin için seçtik:' : `Aradığınız kriterlere uygun ${props.length} ilanı sizin için seçtik:`,
    footerNote: 'Bu e-posta, talebiniz üzerine danışmanınız tarafından gönderilmiştir.'
  });
  const subject = oneLine(b.subject, 150) || (props.length === 1 ? `Size özel ilan: ${oneLine(props[0].baslik_tr, 90)}` : `Size özel ${props.length} ilan — TURYAP İsmail Ünsal`);
  if (b.preview === true) return json({ ok: true, preview: true, subject, html });
  if (rateLimited('m:' + admin.id, 40, 60 * 60 * 1000)) return json({ ok: false, error: 'rate_limited', message: 'Çok fazla gönderim. Biraz sonra tekrar deneyin.' }, 429);
  const res = await resend(env, {
    from: env.LEAD_FROM_EMAIL || DEFAULT_FROM, to: [to], reply_to: env.LEAD_TO_EMAIL || DEFAULT_REPLY,
    subject, html, text
  });
  if (!res.ok) { console.warn('[ilan-gonder] resend', res.status, res.body); return json({ ok: false, ...resendError(res) }, 502); }
  return json({ ok: true, sent: 1, listings: props.length });
}

async function announce(b, env, token, admin) {
  const id = String(b.property_id || '');
  if (!UUID_RE.test(id)) return json({ ok: false, error: 'bad_id' }, 400);
  const props = await sb(`/rest/v1/properties?id=eq.${id}&durum=eq.aktif&select=${PROP_FIELDS}`, token);
  const p = props[0];
  if (!p) return json({ ok: false, error: 'no_active', message: 'İlan bulunamadı veya aktif değil.' }, 404);

  const subs = await sb(`/rest/v1/subscribers?is_active=eq.true&email_verified=eq.true&select=*&limit=${MAX_BROADCAST}`, token);
  const targets = subs.filter(s => s && EMAIL_RE.test(String(s.email || '')) && subscriberMatches(s, p));
  if (b.dry_run) return json({ ok: true, dry_run: true, total_subscribers: subs.length, matched: targets.length });
  if (!targets.length) return json({ ok: true, sent: 0, matched: 0 });
  if (rateLimited('a:' + admin.id, 10, 60 * 60 * 1000)) return json({ ok: false, error: 'rate_limited', message: 'Çok fazla duyuru. Biraz sonra tekrar deneyin.' }, 429);

  const from = env.LEAD_FROM_EMAIL || DEFAULT_FROM;
  const subject = `Yeni ilan: ${oneLine(p.baslik_tr, 100)}`;
  const emails = targets.map(s => {
    const tok = s.unsubscribe_token || s.token;
    const unsubscribeUrl = tok && UUID_RE.test(String(tok)) ? `${SITE}/unsubscribe?token=${tok}` : '';
    const { html, text } = renderListingsEmail({
      name: s.full_name, properties: [p],
      intro: 'İlgi alanlarınıza uygun yeni bir ilan yayınladık:',
      unsubscribeUrl,
      footerNote: 'Bu e-postayı ilan bültenimize abone olduğunuz için aldınız.' + (unsubscribeUrl ? '' : ' Abonelikten çıkmak için bu e-postayı "çıkar" yazarak yanıtlayın.')
    });
    const e = { from, to: [String(s.email).toLowerCase()], reply_to: env.LEAD_TO_EMAIL || DEFAULT_REPLY, subject, html, text };
    if (unsubscribeUrl) e.headers = { 'List-Unsubscribe': `<${unsubscribeUrl}>` };
    return e;
  });
  let sent = 0; let lastErr = null;
  for (let i = 0; i < emails.length; i += 100) {
    const res = await resend(env, emails.slice(i, i + 100), true);
    if (res.ok) sent += Math.min(100, emails.length - i);
    else { lastErr = res; console.warn('[ilan-gonder] batch', res.status, res.body); break; }
  }
  if (!sent && lastErr) return json({ ok: false, ...resendError(lastErr) }, 502);
  return json({ ok: true, sent, matched: targets.length });
}

// ---------------- handler ----------------
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const origin = request.headers.get('Origin');
  let host = '';
  try { host = new URL(origin).hostname; } catch (_) {}
  const selfHost = new URL(request.url).hostname;
  if (!origin || !(host === selfHost || ALLOWED_HOSTS.includes(host))) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false, error: 'bad_request' }, 415);
  if ((+request.headers.get('Content-Length') || 0) > 16000) return json({ ok: false, error: 'too_large' }, 413);

  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  if (rateLimited('ip:' + ip, 60, 10 * 60 * 1000)) return json({ ok: false, error: 'rate_limited' }, 429);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  let admin;
  try { admin = await verifyAdmin(token); } catch (_) { admin = null; }
  if (!admin) return json({ ok: false, error: 'unauthorized', message: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' }, 401);
  let b;
  try { b = JSON.parse((await request.text()).slice(0, 16000)); } catch (_) { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!b || typeof b !== 'object') return json({ ok: false, error: 'bad_json' }, 400);
  if (!env.RESEND_API_KEY && !b.preview && !b.dry_run) return json({ ok: false, error: 'no_email_key', message: 'E-posta servisi yapılandırılmamış.' }, 500);

  try {
    if (b.action === 'musteri') return await sendToCustomer(b, env, token, admin);
    if (b.action === 'duyuru') return await announce(b, env, token, admin);
    return json({ ok: false, error: 'bad_action' }, 400);
  } catch (e) {
    console.warn('[ilan-gonder] hata', e && e.message);
    return json({ ok: false, error: 'server_error', message: 'Beklenmeyen bir hata oluştu.' }, 500);
  }
}
