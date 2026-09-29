/**
 * ============================================================
 * POST /api/talep — Cloudflare Pages Function
 * ============================================================
 * İlan sayfası "bilgi talep" formu + İletişim sayfası formu buraya gelir.
 *  1) Girdiyi doğrular (uzunluk, telefon, e-posta, bot tuzağı, hız)
 *  2) İlan talebiyse ilanı Supabase'den KENDİSİ çeker (formdan gelen başlık/link'e güvenmez)
 *  3) Supabase `leads` tablosuna kaydeder (admin → Başvurular)
 *  4) ismunsal.59@gmail.com adresine HTML e-posta gönderir (Resend)
 *
 * Cloudflare Pages → Settings → Variables and Secrets (hepsi "Secret"):
 *   RESEND_API_KEY            (zorunlu — e-posta için)        re_xxx
 *   LEAD_TO_EMAIL             (opsiyonel) varsayılan: ismunsal.59@gmail.com
 *   LEAD_FROM_EMAIL           (opsiyonel) varsayılan: "TURYAP İsmail Ünsal <onboarding@resend.dev>"
 *                             Domain Resend'de doğrulanınca: "TURYAP İsmail Ünsal <bildirim@ismailunsal.com.tr>"
 *   SUPABASE_SERVICE_ROLE_KEY (opsiyonel) leads'e RLS'e takılmadan yazmak için. SADECE burada
 *                             (sunucu) durur, tarayıcıya asla gönderilmez.
 * Hiçbir gizli anahtar bu dosyada YOKTUR.
 */

const SUPABASE_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4'; // public (zaten sitede)
const SITE = 'https://ismailunsal.com.tr';
const DEFAULT_TO = 'ismunsal.59@gmail.com';
const DEFAULT_FROM = 'TURYAP İsmail Ünsal <onboarding@resend.dev>';
const ALLOWED_HOSTS = ['ismailunsal.com.tr', 'www.ismailunsal.com.tr'];
const KONULAR = {
  satin_alma: 'Gayrimenkul satın almak istiyorum',
  satis: 'Mülkümü satmak istiyorum',
  kiralama: 'Kiralık arıyorum',
  kiraya_verme: 'Mülkümü kiraya vermek istiyorum',
  degerleme: 'Ücretsiz değerleme istiyorum',
  yatirim: 'Yatırım danışmanlığı',
  diger: 'Diğer'
};

// Basit IP bazlı hız sınırı (her Worker örneği için; ek güvenlik katmanı)
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000, max = 5;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (v, n) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, n);
const clean = (v, n) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

function fmtPrice(v, cur) {
  if (!v) return 'Fiyat için arayın';
  const sym = { TL: '₺', TRY: '₺', USD: '$', EUR: '€' }[cur] || '₺';
  return new Intl.NumberFormat('tr-TR').format(v) + ' ' + sym;
}
function waNumber(tel) {           // 0532... → 90532...
  let d = tel.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '9' + d;
  if (d.length === 10 && d.startsWith('5')) d = '90' + d;
  return d;
}
function prettyPhone(tel) {
  const d = waNumber(tel);
  const m = d.match(/^90(\d{3})(\d{3})(\d{2})(\d{2})$/);
  if (m) return `+90 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  const us = d.match(/^1(\d{3})(\d{3})(\d{4})$/);           // ABD / Kanada
  if (us) return `+1 ${us[1]} ${us[2]} ${us[3]}`;
  return d.length >= 11 ? '+' + d : tel;
}

// ---------------- doğrulama ----------------
function validate(b) {
  const kaynak = b.kaynak === 'ilan' ? 'ilan' : b.kaynak === 'iletisim' ? 'iletisim' : null;
  if (!kaynak) return { error: 'Geçersiz form.' };
  const isim = oneLine(b.isim, 80);
  const telefon = String(b.telefon || '').replace(/[^\d+]/g, '').slice(0, 16);
  const email = oneLine(b.email, 120).toLowerCase();
  const mesaj = clean(b.mesaj, 1500);
  const konu = KONULAR[b.konu] ? b.konu : (kaynak === 'iletisim' ? 'diger' : null);
  const property_id = typeof b.property_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.property_id) ? b.property_id
    : (typeof b.property_id === 'number' || /^\d{1,12}$/.test(String(b.property_id || ''))) && b.property_id ? String(b.property_id) : null;
  if (isim.length < 2) return { error: 'Lütfen adınızı yazın.' };
  if (!/^\+?\d{10,15}$/.test(telefon)) return { error: 'Lütfen geçerli bir telefon numarası yazın.' };
  if (email && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(email)) return { error: 'E-posta adresi geçersiz.' };
  if (b.kvkk !== true) return { error: 'KVKK onayı gerekli.' };
  if (kaynak === 'ilan' && !property_id) return { error: 'İlan bilgisi eksik.' };
  const sayfa = typeof b.sayfa === 'string' && b.sayfa.startsWith('/') ? oneLine(b.sayfa, 200) : '';
  return { data: { kaynak, isim, telefon, email, mesaj, konu, property_id, sayfa } };
}

// ---------------- Supabase ----------------
async function fetchProperty(id) {
  const col = /^\d+$/.test(id) ? id : encodeURIComponent(id);
  const url = `${SUPABASE_URL}/rest/v1/properties?id=eq.${col}&durum=eq.aktif&limit=1` +
    `&select=id,slug,baslik_tr,fiyat,para_birimi,ilce,mahalle,tip,kategori,m2,oda_sayisi,property_images(url,ana_foto,sira)`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function saveLead(env, d, prop) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;
  const parts = [];
  if (d.kaynak === 'iletisim') parts.push('Konu: ' + KONULAR[d.konu], 'Kaynak: İletişim formu');
  if (d.mesaj) parts.push('', d.mesaj);
  if (prop) parts.push('', 'İlan: ' + listingUrl(prop));
  const r = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ isim: d.isim, telefon: d.telefon, email: d.email || null, mesaj: parts.join('\n').trim() || null, property_id: prop ? prop.id : null })
  });
  if (!r.ok) console.warn('[talep] leads insert failed', r.status, (await r.text()).slice(0, 200));
  return r.ok;
}

function listingUrl(p) {
  return SITE + (p.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) ? '/ilan/' + p.slug : '/ilan?id=' + encodeURIComponent(p.id));
}
function mainImage(p) {
  const imgs = (p.property_images || []).filter(i => i && typeof i.url === 'string' && /^https:\/\//i.test(i.url));
  const m = imgs.find(i => i.ana_foto) || imgs.sort((a, b) => (a.sira || 0) - (b.sira || 0))[0];
  return m ? m.url : null;
}

// ---------------- E-POSTA ŞABLONU ----------------
export function renderEmail(d, prop, now = new Date()) {
  const tarih = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'long' }).format(now);
  const isIlan = d.kaynak === 'ilan' && prop;
  const baslik = isIlan ? 'Yeni İlan Bilgi Talebi' : 'Yeni İletişim Mesajı';
  const etiket = isIlan ? 'İLAN TALEBİ' : 'İLETİŞİM FORMU';
  const tel = prettyPhone(d.telefon);
  const wa = waNumber(d.telefon);
  const title = isIlan ? oneLine(prop.baslik_tr || 'İlan', 120) : '';
  const subject = isIlan
    ? `🏡 Yeni talep: ${title} — ${d.isim}`
    : `✉️ Yeni mesaj: ${KONULAR[d.konu]} — ${d.isim}`;
  const waText = encodeURIComponent(`Merhaba ${d.isim}, ${isIlan ? `"${title}" ilanı için` : 'web sitemiz üzerinden'} bize ulaştınız. TURYAP İsmail Ünsal olarak size yardımcı olmak isteriz.`);

  const btn = (href, label, bg, fg) => `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;background:${bg};color:${fg};text-decoration:none;font-weight:700;font-size:14px;padding:10px 16px;border-radius:8px;border:2px solid ${bg === '#FFFFFF' ? fg : bg};font-family:Arial,Helvetica,sans-serif;white-space:nowrap">${label}</a>`;
  const row = (k, v) => v ? `<tr><td style="padding:9px 0;color:#6B7280;font-size:13px;width:96px;vertical-align:top;border-bottom:1px solid #EEF1F5">${k}</td><td style="padding:9px 0;color:#0A2A5E;font-size:15px;font-weight:600;border-bottom:1px solid #EEF1F5">${v}</td></tr>` : '';

  let ilanHtml = '';
  if (isIlan) {
    const img = mainImage(prop);
    const loc = [prop.mahalle, prop.ilce, 'Yalova'].filter(Boolean).join(', ');
    const facts = [prop.m2 ? prop.m2 + ' m²' : '', prop.oda_sayisi || ''].filter(Boolean).join(' • ');
    ilanHtml = `
      <tr><td style="padding:8px 28px 4px"><div style="font-size:11px;font-weight:800;letter-spacing:1.5px;color:#2563EB;font-family:Arial,Helvetica,sans-serif">İLGİLENİLEN İLAN</div></td></tr>
      <tr><td style="padding:8px 28px 20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;border-collapse:separate">
          ${img ? `<tr><td><a href="${esc(listingUrl(prop))}"><img src="${esc(img)}" width="544" alt="${esc(title)}" style="display:block;width:100%;max-width:544px;height:auto;border:0"></a></td></tr>` : ''}
          <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif">
            <div style="font-size:17px;font-weight:800;color:#0A2A5E;margin-bottom:4px">${esc(title)}</div>
            <div style="font-size:13px;color:#6B7280;margin-bottom:10px">📍 ${esc(loc)}${facts ? ' &nbsp;•&nbsp; ' + esc(facts) : ''}</div>
            <div style="font-size:22px;font-weight:800;color:#0A2A5E;margin-bottom:12px">${esc(fmtPrice(prop.fiyat, prop.para_birimi))}</div>
            <a href="${esc(listingUrl(prop))}" style="display:inline-block;color:#0A2A5E;background:#EFF6FF;border:1px solid #2563EB;text-decoration:none;font-weight:700;font-size:13px;padding:9px 14px;border-radius:8px">İlanı sitede aç →</a>
          </td></tr>
        </table>
      </td></tr>`;
  }

  const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(baslik)}</title></head>
<body style="margin:0;padding:0;background:#EEF1F5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(d.isim)} • ${esc(tel)}${isIlan ? ' • ' + esc(title) : ''}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1F5;padding:24px 8px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(10,42,94,0.08)">
  <tr><td style="background:#0A2A5E;padding:20px 20px;border-bottom:4px solid #2563EB">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:Arial,Helvetica,sans-serif">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle"><span style="display:inline-block;background:#FFFFFF;color:#0A2A5E;font-weight:900;font-size:12px;letter-spacing:2px;padding:7px 8px;border-radius:4px;white-space:nowrap">TURYAP</span></td>
          <td style="vertical-align:middle;padding-left:11px"><div style="border-left:1px solid rgba(255,255,255,0.3);padding-left:11px;white-space:nowrap">
            <div style="color:#FFFFFF;font-weight:800;font-size:15px;letter-spacing:1px;line-height:1.2">İSMAİL <span style="color:#60A5FA">ÜNSAL</span></div>
            <div style="font-size:8.5px;color:rgba(255,255,255,0.6);letter-spacing:3px;font-weight:600;line-height:1.6">REAL ESTATE</div>
          </div></td>
        </tr></table>
      </td>
      <td align="right" style="font-family:Arial,Helvetica,sans-serif"><span style="display:inline-block;white-space:nowrap;background:#2563EB;color:#FFFFFF;font-size:10px;font-weight:800;letter-spacing:1.5px;padding:6px 10px;border-radius:20px">${etiket}</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:26px 28px 6px;font-family:Arial,Helvetica,sans-serif">
    <div style="font-size:13px;color:#6B7280">${esc(tarih)}</div>
    <h1 style="margin:6px 0 4px;font-size:24px;line-height:1.25;color:#0A2A5E">${esc(baslik)}</h1>
    <div style="font-size:15px;color:#374151"><strong style="color:#0A2A5E">${esc(d.isim)}</strong> ${isIlan ? 'bu ilan hakkında bilgi istiyor.' : 'size web sitesinden mesaj gönderdi.'}</div>
  </td></tr>
  <tr><td style="padding:16px 28px 4px">
      ${btn('tel:+' + wa, '📞 Hemen Ara', '#0A2A5E', '#FFFFFF')}${btn('https://wa.me/' + wa + '?text=' + waText, '💬 WhatsApp', '#25D366', '#FFFFFF')}${d.email ? btn('mailto:' + d.email, '✉️ E-posta', '#FFFFFF', '#0A2A5E') : ''}
  </td></tr>
  <tr><td style="padding:14px 28px 6px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Ad Soyad', esc(d.isim))}
      ${row('Telefon', `<a href="tel:+${esc(wa)}" style="color:#0A2A5E;text-decoration:none">${esc(tel)}</a>`)}
      ${row('E-posta', d.email ? `<a href="mailto:${esc(d.email)}" style="color:#0A2A5E">${esc(d.email)}</a>` : '<span style="color:#9CA3AF;font-weight:400">belirtilmedi</span>')}
      ${d.kaynak === 'iletisim' ? row('Konu', esc(KONULAR[d.konu])) : ''}
    </table>
  </td></tr>
  ${d.mesaj ? `<tr><td style="padding:14px 28px 18px;font-family:Arial,Helvetica,sans-serif">
    <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;color:#2563EB;margin-bottom:8px">MESAJ</div>
    <div style="background:#F5F7FA;border-left:4px solid #2563EB;border-radius:8px;padding:14px 16px;font-size:15px;line-height:1.6;color:#1F2937;white-space:pre-wrap">${esc(d.mesaj)}</div>
  </td></tr>` : ''}
  ${ilanHtml}
  <tr><td style="padding:6px 28px 24px;font-family:Arial,Helvetica,sans-serif">
    <a href="${SITE}/admin/leads.html" style="display:inline-block;color:#6B7280;font-size:13px;text-decoration:underline">Tüm başvuruları admin panelinde görüntüle</a>
  </td></tr>
  <tr><td style="background:#F5F7FA;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;line-height:1.6">
    Bu e-posta <a href="${SITE}${esc(d.sayfa || '/')}" style="color:#6B7280">ismailunsal.com.tr${esc(d.sayfa || '')}</a> formundan otomatik gönderildi.
    Kişi KVKK aydınlatma metnini onaylamıştır.${d.email ? ' Bu e-postayı yanıtlarsanız doğrudan kişiye gider.' : ''}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    baslik, tarih, '',
    'Ad Soyad: ' + d.isim, 'Telefon: ' + tel, 'E-posta: ' + (d.email || '-'),
    d.kaynak === 'iletisim' ? 'Konu: ' + KONULAR[d.konu] : '',
    d.mesaj ? '\nMesaj:\n' + d.mesaj : '',
    isIlan ? `\nİlan: ${title} — ${fmtPrice(prop.fiyat, prop.para_birimi)}\n${listingUrl(prop)}` : '',
    '\nWhatsApp: https://wa.me/' + wa
  ].filter(Boolean).join('\n');

  return { subject: oneLine(subject, 150), html, text };
}

async function sendEmail(env, d, prop) {
  if (!env.RESEND_API_KEY) { console.warn('[talep] RESEND_API_KEY tanımlı değil — e-posta gönderilmedi'); return false; }
  const { subject, html, text } = renderEmail(d, prop);
  const body = { from: env.LEAD_FROM_EMAIL || DEFAULT_FROM, to: [env.LEAD_TO_EMAIL || DEFAULT_TO], subject, html, text };
  if (d.email) body.reply_to = d.email;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) console.warn('[talep] Resend hata', r.status, (await r.text()).slice(0, 300));
  return r.ok;
}

// ---------------- handler ----------------
async function handlePost({ request, env }) {
  // 1) Sadece kendi sitemizden gelen istekler
  const origin = request.headers.get('Origin');
  if (origin) {
    let host = '';
    try { host = new URL(origin).hostname; } catch (_) {}
    const selfHost = new URL(request.url).hostname;
    const ok = host === selfHost || ALLOWED_HOSTS.includes(host) || host.endsWith('.pages.dev');
    if (!ok) return json({ ok: false, error: 'forbidden' }, 403);
  }
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false, error: 'bad_request' }, 415);
  const len = +request.headers.get('Content-Length') || 0;
  if (len > 8000) return json({ ok: false, error: 'too_large' }, 413);

  let b;
  try { b = JSON.parse((await request.text()).slice(0, 8000)); } catch (_) { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!b || typeof b !== 'object') return json({ ok: false, error: 'bad_json' }, 400);

  // 2) Bot filtreleri — botlara başarılı gibi görün, hiçbir şey yapma
  if (b.website) return json({ ok: true });
  if (typeof b.t === 'number' && b.t < 2500) return json({ ok: true });

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (rateLimited(ip)) return json({ ok: false, error: 'Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin veya bizi arayın.' }, 429);

  const v = validate(b);
  if (v.error) return json({ ok: false, error: v.error }, 422);
  const d = v.data;

  let prop = null;
  if (d.kaynak === 'ilan') {
    try { prop = await fetchProperty(d.property_id); } catch (e) { console.warn('[talep] ilan çekilemedi', e && e.message); }
    if (!prop) d.kaynak = 'iletisim', d.konu = 'diger';   // ilan kaldırılmışsa genel mesaj olarak ilet
  }

  const [saved, emailed] = await Promise.all([
    saveLead(env, d, prop).catch(() => false),
    sendEmail(env, d, prop).catch(e => { console.warn('[talep] e-posta hata', e && e.message); return false; })
  ]);
  if (!saved && !emailed) return json({ ok: false, error: 'Talebiniz şu anda iletilemedi.' }, 502);
  return json({ ok: true });
}

// Tek giriş noktası (sadece POST kabul edilir)
export async function onRequest(context) {
  if (context.request.method === 'POST') return handlePost(context);
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
