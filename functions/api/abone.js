/**
 * POST /api/abone — Bülten aboneliği (hesap gerektirmez), ÇİFT ONAYLI.
 *  1) Adres "doğrulanmamış" olarak kaydedilir; tarayıcı bu tabloya artık doğrudan yazamaz (yalnızca bu sunucu).
 *  2) Doğrulama e-postası gönderilir; kişi bağlantıya tıklayınca (verify → verify_subscriber) aktif olur.
 *  3) Spam koruması (reCAPTCHA) panelden açıldıysa doğrulanır; botlara "başarılı" görünülür ama hiçbir şey yapılmaz.
 * Kötüye kullanım önlemleri: yalnızca kendi sitemiz (Origin), JSON + boyut sınırı, bot tuzağı + hız kontrolü,
 *   IP ve adres başına sınır, adres başına 24 saatte en fazla 1 doğrulama e-postası.
 * Yanıt, adres zaten kayıtlı olsa da olmasa da AYNIDIR (kimin abone olduğu öğrenilemez).
 * Cloudflare Secrets: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, LEAD_FROM_EMAIL (opsiyonel).
 */
import { checkSpam, REJECT_MESSAGE, SUPABASE_URL, sbHeaders, serviceKey } from '../_lib/spam.js';
import { readText } from '../_lib/body.js';

const SITE = 'https://ismailunsal.com.tr';
const DEFAULT_FROM = 'TURYAP İsmail Ünsal <onboarding@resend.dev>';
const DEFAULT_REPLY = 'ismunsal.59@gmail.com';
const ALLOWED_HOSTS = ['ismailunsal.com.tr', 'www.ismailunsal.com.tr'];
const EMAIL_RE = /^[^\s@<>"',;:()\[\]\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const KATEGORILER = ['arsa', 'daire', 'villa', 'isyeri'];
const DILLER = ['tr', 'en', 'de', 'fr', 'ru'];
const KAYNAKLAR = ['modal_widget', 'footer_widget', 'website'];
const DAY = 24 * 60 * 60 * 1000;
const OK_MSG = 'Teşekkürler! Aboneliğinizi tamamlamak için e-posta adresinize gönderdiğimiz bağlantıya tıklayın.';

const hits = new Map();
function limited(k, max, win) { const n = Date.now(); const a = (hits.get(k) || []).filter(t => n - t < win); a.push(n); hits.set(k, a); if (hits.size > 5000) hits.clear(); return a.length > max; }
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function sameOrigin(request) {
  const origin = request.headers.get('Origin'); let host = '';
  try { host = new URL(origin).hostname; } catch (_) {}
  const self = new URL(request.url).hostname;
  return !!origin && (host === self || ALLOWED_HOSTS.includes(host) || host.endsWith('.pages.dev'));
}

const T = {
  tr: { subject: 'E-posta adresinizi doğrulayın — TURYAP İsmail Ünsal', title: 'Aboneliğinizi onaylayın', intro: 'Yalova\'daki yeni ilanlardan ve fırsatlardan ilk siz haberdar olmak için aşağıdaki düğmeye tıklayın.', button: 'E-postamı doğrula', expiry: 'Bağlantı 7 gün geçerlidir.', notYou: 'Bu isteği siz yapmadıysanız bu e-postayı yok sayın; size başka e-posta göndermeyiz.' },
  en: { subject: 'Please confirm your email — TURYAP Ismail Unsal', title: 'Confirm your subscription', intro: 'Click the button below to be the first to hear about new listings and opportunities in Yalova.', button: 'Confirm my email', expiry: 'This link is valid for 7 days.', notYou: 'If you did not request this, simply ignore this email — we will not contact you again.' },
  de: { subject: 'Bitte bestätigen Sie Ihre E-Mail — TURYAP Ismail Unsal', title: 'Abonnement bestätigen', intro: 'Klicken Sie auf die Schaltfläche, um als Erster von neuen Angeboten in Yalova zu erfahren.', button: 'E-Mail bestätigen', expiry: 'Der Link ist 7 Tage gültig.', notYou: 'Wenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail einfach.' },
  fr: { subject: 'Confirmez votre e-mail — TURYAP Ismail Unsal', title: 'Confirmez votre abonnement', intro: 'Cliquez sur le bouton ci-dessous pour être informé en premier des nouvelles annonces à Yalova.', button: 'Confirmer mon e-mail', expiry: 'Ce lien est valable 7 jours.', notYou: "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail." },
  ru: { subject: 'Подтвердите ваш email — TURYAP Ismail Unsal', title: 'Подтвердите подписку', intro: 'Нажмите кнопку ниже, чтобы первыми узнавать о новых объектах в Ялове.', button: 'Подтвердить email', expiry: 'Ссылка действительна 7 дней.', notYou: 'Если вы не запрашивали подписку, просто проигнорируйте это письмо.' }
};

export function verifyEmail(link, lang) {
  const t = T[lang] || T.tr;
  const html = `<!DOCTYPE html><html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.subject)}</title></head>
<body style="margin:0;padding:0;background:#EEF1F5;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1F5;padding:24px 10px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:14px;overflow:hidden">
<tr><td style="background:#0A2A5E;padding:20px 22px;border-bottom:4px solid #2563EB">
  <span style="display:inline-block;background:#FFFFFF;color:#0A2A5E;font-weight:900;font-size:12px;letter-spacing:2px;padding:6px 8px;border-radius:4px">TURYAP</span>
  <span style="color:#FFFFFF;font-weight:800;font-size:15px;letter-spacing:1px;margin-left:10px">İSMAİL <span style="color:#60A5FA">ÜNSAL</span></span>
</td></tr>
<tr><td style="padding:26px 24px 8px">
  <h1 style="margin:0 0 10px;font-size:22px;color:#0A2A5E">${esc(t.title)}</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151">${esc(t.intro)}</p>
  <p style="margin:0 0 22px;text-align:center"><a href="${esc(link)}" style="display:inline-block;background:#0A2A5E;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:8px">${esc(t.button)}</a></p>
  <p style="margin:0 0 8px;font-size:12px;color:#6B7280">${esc(t.expiry)}</p>
  <p style="margin:0 0 18px;font-size:12px;color:#6B7280;word-break:break-all"><a href="${esc(link)}" style="color:#1D4ED8">${esc(link)}</a></p>
</td></tr>
<tr><td style="background:#F5F7FA;padding:14px 24px;font-size:12px;line-height:1.6;color:#6B7280">${esc(t.notYou)}<br>TURYAP İsmail Ünsal · Yalova · <a href="${SITE}" style="color:#1D4ED8">ismailunsal.com.tr</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${t.title}\n\n${t.intro}\n\n${t.button}: ${link}\n\n${t.expiry}\n${t.notYou}\n\nTURYAP İsmail Ünsal · ${SITE}`;
  return { subject: t.subject, html, text };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false, error: 'bad_request' }, 415);
  if ((+request.headers.get('Content-Length') || 0) > 6000) return json({ ok: false, error: 'too_large' }, 413);
  const raw = await readText(request, 6000); if (raw == null) return json({ ok: false, error: 'too_large' }, 413);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad_json' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  if (limited('ip:' + ip, 5, 10 * 60 * 1000)) return json({ ok: false, code: 'rate', message: 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.' }, 429);
  if (b.website || !(+b.t > 1500)) return json({ ok: true, message: OK_MSG });           // bot tuzağı → başarılı gibi görün

  const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(email)) return json({ ok: false, code: 'email', message: 'Geçerli bir e-posta adresi girin.' }, 400);
  const lang = DILLER.includes(b.dil) ? b.dil : 'tr';
  const kategoriler = Array.isArray(b.kategoriler) ? [...new Set(b.kategoriler.filter(k => KATEGORILER.includes(k)))] : [];
  const kaynak = KAYNAKLAR.includes(b.kaynak) ? b.kaynak : 'website';

  if (!serviceKey(env) || !env.RESEND_API_KEY) {
    console.warn('[abone] SUPABASE_SERVICE_ROLE_KEY veya RESEND_API_KEY tanımlı değil');
    return json({ ok: false, code: 'off', message: 'Bülten kaydı şu anda yapılamıyor. Lütfen daha sonra tekrar deneyin.' }, 503);
  }

  const spam = await checkSpam(env, { form: 'abone', token: b.captcha, ip, host: new URL(request.url).hostname, waitUntil: context.waitUntil && context.waitUntil.bind(context) });
  if (spam.action === 'reject') return json({ ok: false, code: 'captcha', message: REJECT_MESSAGE }, 400);
  if (spam.action === 'spam') return json({ ok: true, message: OK_MSG });
  if (limited('e:' + email, 3, DAY)) return json({ ok: true, message: OK_MSG });

  const H = sbHeaders(serviceKey(env));
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    // (SQL dosyası henüz çalıştırılmadıysa dogrulama_gonderildi_at sütunu yoktur → onsuz devam)
    let track = true;
    let r = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=id,is_active,email_verified,dogrulama_gonderildi_at&limit=1`, { headers: H });
    if (r.status === 400) { track = false; r = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=id,is_active,email_verified&limit=1`, { headers: H }); }
    if (!r.ok) throw new Error('lookup ' + r.status);
    const row = (await r.json())[0];
    if (row && row.is_active && row.email_verified) return json({ ok: true, message: OK_MSG });           // zaten abone — aynı yanıt
    if (row && row.dogrulama_gonderildi_at && Date.now() - Date.parse(row.dogrulama_gonderildi_at) < DAY) return json({ ok: true, message: OK_MSG });
    const patch = { verification_token: token, email_verified: false, language: lang };
    if (track) patch.dogrulama_gonderildi_at = now;
    if (kategoriler.length) patch.ilgi_kategoriler = kategoriler;
    const w = row
      ? await fetch(`${SUPABASE_URL}/rest/v1/subscribers?id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: sbHeaders(serviceKey(env), { Prefer: 'return=minimal' }), body: JSON.stringify(patch) })
      : await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, { method: 'POST', headers: sbHeaders(serviceKey(env), { Prefer: 'return=minimal' }),
          body: JSON.stringify(Object.assign({ email, ilgi_kategoriler: kategoriler, language: lang, signup_source: kaynak, user_agent: String(request.headers.get('User-Agent') || '').slice(0, 300),
            verification_token: token, email_verified: false }, track ? { dogrulama_gonderildi_at: now } : {})) });
    if (!w.ok) {
      if (w.status === 409) return json({ ok: true, message: OK_MSG });     // aynı anda iki istek
      throw new Error('write ' + w.status);
    }
    const m = verifyEmail(`${SITE}/verify?token=${token}`, lang);
    const s = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.LEAD_FROM_EMAIL || DEFAULT_FROM, to: [email], reply_to: env.LEAD_TO_EMAIL || DEFAULT_REPLY, subject: m.subject, html: m.html, text: m.text })
    });
    if (!s.ok) {
      console.warn('[abone] Resend', s.status, (await s.text()).slice(0, 200));
      // bir sonraki denemede tekrar gönderilebilsin
      if (track) await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}`, { method: 'PATCH', headers: sbHeaders(serviceKey(env), { Prefer: 'return=minimal' }), body: JSON.stringify({ dogrulama_gonderildi_at: null }) }).catch(() => {});
      return json({ ok: false, code: 'mail', message: 'Doğrulama e-postası şu anda gönderilemedi. Lütfen daha sonra tekrar deneyin.' }, 502);
    }
    return json({ ok: true, message: OK_MSG });
  } catch (e) {
    console.warn('[abone]', e && e.message);
    return json({ ok: false, code: 'fail', message: 'Bir sorun oluştu. Lütfen daha sonra tekrar deneyin.' }, 502);
  }
}
