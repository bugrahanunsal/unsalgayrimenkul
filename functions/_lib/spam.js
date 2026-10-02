/**
 * Spam koruması (Google reCAPTCHA v3) — YALNIZCA SUNUCU. Bu dosya bir sayfa/adres değildir (onRequest yok).
 *
 * Ayarlar Supabase'de:
 *   spam_koruma        → site anahtarı (herkese açık bir değer), açık/kapalı, eşik puanı, korunan formlar
 *   spam_koruma_gizli  → reCAPTCHA GİZLİ anahtarı + son test sonucu
 * İki tabloya da tarayıcıdan erişim YOKTUR; yalnızca SUPABASE_SERVICE_ROLE_KEY (Cloudflare Secret) ile okunur.
 * Bu dosyada hiçbir gizli anahtar yoktur; gizli anahtar hiçbir yanıtta tarayıcıya dönmez.
 *
 * Karar kuralları (checkSpam):
 *   koruma kapalı / form korunmuyor                      → pass
 *   token yok / geçersiz / başka siteye veya forma ait     → reject  (bot)
 *   puan eşiğin altında                                  → spam    (mesaj "Spam" olarak saklanır, bildirim gitmez)
 *   Google'a ulaşılamadı / sunucu ayarı eksik             → pass    (gerçek müşteriyi kaybetmemek için) + kayıt
 */
export const SUPABASE_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4'; // herkese açık (sitede zaten var)
export const ALLOWED_HOSTS = ['ismailunsal.com.tr', 'www.ismailunsal.com.tr'];
export const FORMS = ['iletisim', 'ilan', 'abone'];
export const KEY_RE = /^[A-Za-z0-9_-]{20,100}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,4096}$/;
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const CACHE_MS = 60 * 1000;

export const serviceKey = (env) => (env && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY)) || '';
/** Yeni (sb_secret_/sb_publishable_) anahtarlar yalnızca `apikey` başlığında; eski JWT anahtarlar ikisinde de. */
export function sbHeaders(key, extra = {}) {
  const h = { apikey: key, 'Content-Type': 'application/json', Accept: 'application/json', ...extra };
  if (/^eyJ/.test(key)) h.Authorization = `Bearer ${key}`;
  return h;
}

let CACHE = { at: 0, cfg: null };
export function _resetCache() { CACHE = { at: 0, cfg: null }; }

/** Ayarları oku (60 sn önbellek). Gizli anahtar dahil — ASLA istemciye gönderme. */
export async function loadConfig(env, force = false) {
  const key = serviceKey(env);
  if (!key) return { ok: false, reason: 'no_service_key' };
  if (!force && CACHE.cfg && Date.now() - CACHE.at < CACHE_MS) return CACHE.cfg;
  const H = sbHeaders(key);
  const [a, b] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/spam_koruma?id=eq.1&select=site_key,aktif,min_skor,formlar,updated_at`, { headers: H }),
    fetch(`${SUPABASE_URL}/rest/v1/spam_koruma_gizli?id=eq.1&select=secret,test_ok,test_at,test_site_key,test_skor,test_host,test_hata,updated_at`, { headers: H })
  ]);
  if (!a.ok || !b.ok) return { ok: false, reason: 'db_' + (a.ok ? b.status : a.status) };
  const k = (await a.json())[0] || {}, g = (await b.json())[0] || {};
  const cfg = {
    ok: true,
    site_key: KEY_RE.test(k.site_key || '') ? k.site_key : null,
    aktif: k.aktif === true,
    min_skor: Number.isFinite(+k.min_skor) ? Math.min(0.9, Math.max(0.1, +k.min_skor)) : 0.5,
    formlar: Array.isArray(k.formlar) ? k.formlar.filter(f => FORMS.includes(f)) : [],
    updated_at: k.updated_at || null,
    secret: KEY_RE.test(g.secret || '') ? g.secret : null,
    test: { ok: g.test_ok === true, at: g.test_at || null, site_key: g.test_site_key || null, skor: g.test_skor, host: g.test_host || null, hata: g.test_hata || null }
  };
  CACHE = { at: Date.now(), cfg };
  return cfg;
}

/** Google siteverify. Ağ hatası/zaman aşımında { network: true } döner. */
export async function verifyToken(secret, token, ip) {
  const body = new URLSearchParams({ secret, response: token });
  if (ip && /^[0-9a-f:.]{3,45}$/i.test(ip)) body.set('remoteip', ip);
  try {
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body };
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(6000);
    const r = await fetch(VERIFY_URL, opts);
    if (!r.ok) return { network: true, status: r.status };
    const j = await r.json();
    return j && typeof j === 'object' ? j : { network: true };
  } catch (_) {
    return { network: true };
  }
}

export function hostAllowed(hostname, requestHost) {
  const h = String(hostname || '').toLowerCase();
  if (!h) return false;
  return ALLOWED_HOSTS.includes(h) || (!!requestHost && h === String(requestHost).toLowerCase());
}

/** Sonucu istatistik tablosuna yaz (IP / e-posta YOK). Hata siteyi etkilemez. */
export async function logResult(env, form, sonuc, skor, neden) {
  const key = serviceKey(env);
  if (!key) return;
  const row = { form, sonuc, skor: Number.isFinite(skor) ? Math.round(skor * 100) / 100 : null, neden: neden ? String(neden).slice(0, 120) : null };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/spam_kayit`, { method: 'POST', headers: sbHeaders(key, { Prefer: 'return=minimal' }), body: JSON.stringify(row) });
  } catch (_) {}
}

/**
 * Formu kontrol et. → { action: 'pass'|'spam'|'reject', enforced, score?, reason? }
 * opts: { form, token, ip, host, waitUntil? }
 */
export async function checkSpam(env, opts) {
  const form = FORMS.includes(opts.form) ? opts.form : 'iletisim';
  const later = (p) => { if (typeof opts.waitUntil === 'function') opts.waitUntil(p); else return p; };
  let cfg;
  try { cfg = await loadConfig(env); } catch (_) { cfg = { ok: false, reason: 'db_error' }; }
  if (!cfg.ok || !cfg.aktif || !cfg.formlar.includes(form)) return { action: 'pass', enforced: false, reason: cfg.ok ? 'off' : cfg.reason };
  if (!cfg.secret || !cfg.site_key) { await later(logResult(env, form, 'hata', null, 'gizli_anahtar_yok')); return { action: 'pass', enforced: true, reason: 'no_secret' }; }
  const token = typeof opts.token === 'string' ? opts.token : '';
  if (!TOKEN_RE.test(token)) { await later(logResult(env, form, 'reddedildi', null, 'token_yok')); return { action: 'reject', enforced: true, reason: 'no_token' }; }
  const v = await verifyToken(cfg.secret, token, opts.ip);
  if (v.network) { await later(logResult(env, form, 'hata', null, 'google_yanit_vermedi')); return { action: 'pass', enforced: true, reason: 'google_unreachable' }; }
  const codes = Array.isArray(v['error-codes']) ? v['error-codes'].map(String) : [];
  if (v.success !== true) {
    if (codes.some(c => /secret/i.test(c))) { await later(logResult(env, form, 'hata', null, 'gizli_anahtar_gecersiz')); return { action: 'pass', enforced: true, reason: 'bad_secret' }; }
    await later(logResult(env, form, 'reddedildi', null, codes.join(',') || 'basarisiz'));
    return { action: 'reject', enforced: true, reason: 'invalid_token' };
  }
  if (!hostAllowed(v.hostname, opts.host)) { await later(logResult(env, form, 'reddedildi', null, 'alan_adi:' + String(v.hostname || '').slice(0, 80))); return { action: 'reject', enforced: true, reason: 'host' }; }
  if (v.action && v.action !== form) { await later(logResult(env, form, 'reddedildi', null, 'islem:' + String(v.action).slice(0, 40))); return { action: 'reject', enforced: true, reason: 'action' }; }
  const score = typeof v.score === 'number' ? v.score : null;
  if (score != null && score < cfg.min_skor) { await later(logResult(env, form, 'spam', score, 'dusuk_puan')); return { action: 'spam', enforced: true, score }; }
  await later(logResult(env, form, 'gecti', score, null));
  return { action: 'pass', enforced: true, score };
}

/** Ziyaretçiye gösterilecek mesaj (bot olmayan biri reddedilirse ne yapacağını bilsin) */
export const REJECT_MESSAGE = 'Güvenlik doğrulaması tamamlanamadı. Lütfen sayfayı yenileyip tekrar deneyin veya bize WhatsApp\'tan yazın.';
