/**
 * POST /api/sifre-sifirla — "Şifremi Unuttum" (yönetici ve müşteri hesapları).
 *
 * Neden ayrı bir uç: Supabase'in kendi sıfırlama e-postası, bağlantıyı Supabase → Authentication → URL Configuration
 * ayarına göre yönlendirir; o ayar eksikse bağlantı "localhost"a gider ve çalışmaz. Bu uç o ayara bağlı DEĞİLDİR:
 *  1) Supabase Admin API (generate_link, type=recovery) tek kullanımlık bir kod (hashed_token) üretir.
 *     Bu çağrıda Supabase e-posta GÖNDERMEZ.
 *  2) Bağlantıyı kendimiz kurarız: https://ismailunsal.com.tr/sifre-belirle?token_hash=…&type=recovery
 *     (sifre-belirle sayfası kodu verifyOtp ile doğrular → yeni şifre belirlenir).
 *  3) E-postayı Resend ile göndeririz (talep.js / abone.js ile aynı gönderici).
 *  RESEND_API_KEY yoksa Supabase'in kendi sıfırlama e-postası istenir (URL ayarları doğruysa o da çalışır).
 *
 * Kötüye kullanım önlemleri: yalnızca kendi sitemiz (Origin), JSON + boyut sınırı, bot tuzağı, IP ve adres başına
 *   sınır, aynı hesaba 3 dakikada en fazla 1 bağlantı (Supabase'teki recovery_sent_at ile, tüm sunucularda geçerli).
 * Yanıt, hesap olsa da olmasa da AYNIDIR (kimin üye olduğu öğrenilemez). E-posta adresi ve kod loglanmaz.
 * Cloudflare Secrets: SUPABASE_SERVICE_ROLE_KEY (zorunlu), RESEND_API_KEY, LEAD_FROM_EMAIL / LEAD_TO_EMAIL (opsiyonel).
 */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, sbHeaders, serviceKey } from '../_lib/spam.js';
import { readText } from '../_lib/body.js';

const SITE = 'https://ismailunsal.com.tr';
const DEFAULT_FROM = 'TURYAP İsmail Ünsal <onboarding@resend.dev>';
const DEFAULT_REPLY = 'ismunsal.59@gmail.com';
const ALLOWED_HOSTS = ['ismailunsal.com.tr', 'www.ismailunsal.com.tr'];
const EMAIL_RE = /^[^\s@<>"',;:()\[\]\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,200}$/;
const MIN = 60 * 1000;
const COOLDOWN = 3 * MIN;
const OK_MSG = 'Bu e-posta adresiyle kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve spam (gereksiz) klasörünü kontrol edin.';

const hits = new Map();
function limited(k, max, win) { const n = Date.now(); const a = (hits.get(k) || []).filter(t => n - t < win); a.push(n); hits.set(k, a); if (hits.size > 5000) hits.clear(); return a.length > max; }
export function _resetLimits() { hits.clear(); }
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' } });
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Adres kontrolünden sonraki her yanıt yaklaşık aynı sürede döner: yanıt hızı, adresin kayıtlı olup olmadığını ele
    vermesin (e-posta göndermek, hiçbir şey yapmamaktan yavaştır). Testler bu değerleri düşürebilir. */
export const TIMING = { floor: 1200, jitter: 400 };
const settle = async (t0) => {
  const wait = TIMING.floor - (Date.now() - t0) + Math.floor(Math.random() * (TIMING.jitter + 1));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
};
const timed = (opts) => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? Object.assign({ signal: AbortSignal.timeout(8000) }, opts) : opts);

function sameOrigin(request) {
  const origin = request.headers.get('Origin'); let host = '';
  try { host = new URL(origin).hostname; } catch (_) {}
  const self = new URL(request.url).hostname;
  return !!origin && (host === self || ALLOWED_HOSTS.includes(host) || host.endsWith('.pages.dev'));
}

const T = {
  tr: { subject: 'Şifre sıfırlama bağlantınız — TURYAP İsmail Ünsal', title: 'Şifrenizi sıfırlayın',
    intro: 'Hesabınız için bir şifre sıfırlama isteği aldık. Yeni şifrenizi belirlemek için aşağıdaki düğmeye tıklayın.',
    button: 'Yeni şifre belirle', expiry: 'Bağlantı kısa bir süre geçerlidir ve yalnızca bir kez kullanılabilir.',
    notYou: 'Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.' },
  en: { subject: 'Reset your password — TURYAP Ismail Unsal', title: 'Reset your password',
    intro: 'We received a request to reset the password for your account. Click the button below to choose a new password.',
    button: 'Choose a new password', expiry: 'This link is valid for a short time and can be used only once.',
    notYou: 'If you did not ask for this, you can ignore this email; your password will not change.' },
  de: { subject: 'Passwort zurücksetzen — TURYAP Ismail Unsal', title: 'Passwort zurücksetzen',
    intro: 'Wir haben eine Anfrage zum Zurücksetzen des Passworts für Ihr Konto erhalten. Klicken Sie auf die Schaltfläche, um ein neues Passwort festzulegen.',
    button: 'Neues Passwort festlegen', expiry: 'Der Link ist nur kurze Zeit gültig und kann nur einmal verwendet werden.',
    notYou: 'Wenn Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren; Ihr Passwort bleibt unverändert.' },
  fr: { subject: 'Réinitialisez votre mot de passe — TURYAP Ismail Unsal', title: 'Réinitialisez votre mot de passe',
    intro: 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.',
    button: 'Choisir un nouveau mot de passe', expiry: 'Ce lien n’est valable que peu de temps et ne peut être utilisé qu’une seule fois.',
    notYou: 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe ne changera pas.' },
  ru: { subject: 'Сброс пароля — TURYAP Ismail Unsal', title: 'Сброс пароля',
    intro: 'Мы получили запрос на сброс пароля для вашей учётной записи. Нажмите кнопку ниже, чтобы задать новый пароль.',
    button: 'Задать новый пароль', expiry: 'Ссылка действует недолго и может быть использована только один раз.',
    notYou: 'Если вы не запрашивали сброс, просто проигнорируйте это письмо — ваш пароль не изменится.' }
};

export function resetEmail(link, lang) {
  const t = T[lang] || T.tr;
  const html = `<!DOCTYPE html><html lang="${esc(T[lang] ? lang : 'tr')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.subject)}</title></head>
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

/** Bu adrese son 3 dakikada bağlantı gönderildi mi? (Supabase'teki recovery_sent_at; okunamazsa "hayır") */
async function sentRecently(email, H) {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50&filter=${encodeURIComponent(email)}`, timed({ headers: H }));
    if (!r.ok) return false;
    const j = await r.json();
    const list = Array.isArray(j) ? j : (j && Array.isArray(j.users) ? j.users : []);
    const u = list.find(x => String((x && x.email) || '').toLowerCase() === email);
    const at = u && u.recovery_sent_at ? Date.parse(u.recovery_sent_at) : NaN;
    return Number.isFinite(at) && Date.now() - at < COOLDOWN;
  } catch (_) { return false; }
}

async function handle(context, mark) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false, error: 'bad_request' }, 415);
  if ((+request.headers.get('Content-Length') || 0) > 2000) return json({ ok: false, error: 'too_large' }, 413);
  const raw = await readText(request, 2000); if (raw == null) return json({ ok: false, error: 'too_large' }, 413);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json({ ok: false, error: 'bad_json' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  if (limited('ip:' + ip, 5, 15 * MIN)) return json({ ok: false, code: 'rate', message: 'Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.' }, 429);
  if (b.website) return json({ ok: true, message: OK_MSG });                                  // bot tuzağı → başarılı gibi görün

  const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(email)) return json({ ok: false, code: 'email', message: 'Geçerli bir e-posta adresi girin.' }, 400);
  mark();
  const lang = T[b.dil] ? b.dil : (b.dil === 'ar' ? 'en' : 'tr');
  if (!serviceKey(env)) {
    console.warn('[sifre-sifirla] SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
    return json({ ok: false, code: 'off', message: 'Şifre sıfırlama şu anda yapılamıyor. Lütfen daha sonra tekrar deneyin.' }, 503);
  }
  if (limited('e:' + email, 5, 60 * MIN)) return json({ ok: true, message: OK_MSG });
  const H = sbHeaders(serviceKey(env));

  try {
    if (await sentRecently(email, H)) return json({ ok: true, message: OK_MSG });             // az önce gönderildi: aynı yanıt, yeni e-posta yok

    // Resend yoksa: Supabase'in kendi e-postası (bağlantı Supabase URL ayarlarına göre yönlenir)
    if (!env.RESEND_API_KEY) {
      const rr = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(SITE + '/sifre-belirle')}`, timed({
        method: 'POST', headers: sbHeaders(SUPABASE_PUBLISHABLE_KEY), body: JSON.stringify({ email }) }));
      if (!rr.ok) console.warn('[sifre-sifirla] recover', rr.status);
      return json({ ok: true, message: OK_MSG });
    }

    // 1) Tek kullanımlık kod (hesap yoksa Supabase 404 döner → aynı yanıt, e-posta yok)
    const g = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, timed({ method: 'POST', headers: H, body: JSON.stringify({ type: 'recovery', email }) }));
    if (g.status === 404 || g.status === 422) return json({ ok: true, message: OK_MSG });
    if (!g.ok) throw new Error('generate ' + g.status);
    const gj = await g.json().catch(() => ({}));
    const hashed = String((gj && (gj.hashed_token || (gj.properties && gj.properties.hashed_token))) || '');
    if (!TOKEN_RE.test(hashed)) throw new Error('no token');

    // 2) Bağlantı + e-posta (Resend)
    const link = `${SITE}/sifre-belirle?token_hash=${encodeURIComponent(hashed)}&type=recovery`;
    const m = resetEmail(link, lang);
    const s = await fetch('https://api.resend.com/emails', timed({
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.LEAD_FROM_EMAIL || DEFAULT_FROM, to: [email], reply_to: env.LEAD_TO_EMAIL || DEFAULT_REPLY, subject: m.subject, html: m.html, text: m.text })
    }));
    if (!s.ok) console.warn('[sifre-sifirla] Resend', s.status, (await s.text().catch(() => '')).slice(0, 200));
    return json({ ok: true, message: OK_MSG });
  } catch (e) {
    console.warn('[sifre-sifirla]', e && e.message);
    return json({ ok: false, code: 'fail', message: 'Bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.' }, 502);
  }
}

export async function onRequest(context) {
  const box = { t0: 0 };
  const res = await handle(context, () => { box.t0 = Date.now(); });
  if (box.t0) await settle(box.t0);                // adres kontrolünden sonra her yanıt yaklaşık aynı sürer
  return res;
}
