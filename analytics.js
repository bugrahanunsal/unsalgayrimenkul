/**
 * Google Analytics 4 — İsmail Ünsal Gayrimenkul (Admin → Analitik'ten açılıp kapatılır; kod değişikliği gerekmez)
 *
 *  • KVKK ve Gizlilik Politikası (Madde 8.3): analitik çerezler RIZAYA bağlıdır. Ziyaretçi "Kabul et" demeden
 *    Google'a HİÇBİR şey gönderilmez, gtag.js yüklenmez, çerez yazılmaz. "Reddet" de aynı kolaylıktadır.
 *    Tercih bu tarayıcıda 12 ay saklanır; Gizlilik Politikası sayfasındaki "Çerez tercihimi değiştir" ile değişir.
 *  • Ölçüm kimliği (G-…) veritabanından okunur (iu_site_tags(): ziyaretçinin okuyabildiği TEK şey), yalnızca takip
 *    açıkken; bu tarayıcıda 30 dakika hatırlanır.
 *  • Hiç çalışmadığı yerler: panel (/admin), hesap / şifre / doğrulama / abonelikten çıkma sayfaları, tarayıcı
 *    "Global Privacy Control" gönderiyorsa, Admin → Analitik'te "Bu tarayıcıdaki ziyaretlerimi sayma" seçildiyse.
 *  • Google'a giden adres temizlenir: # ve sorgu (?…) atılır, yalnızca kampanya etiketleri (utm_…, gclid) kalır —
 *    bağlantıdaki bir anahtar (token) asla sızmaz.
 *  • Olaylar: generate_lead (ilan / iletişim formu), newsletter_signup, phone_click, whatsapp_click, email_click —
 *    yalnızca adları; ziyaretçinin yazdığı hiçbir şey gönderilmez.
 */
(function () {
  'use strict';
  const PRIVATE = /^\/(?:(?:en|fr|de|ru|ar)\/)?(?:admin|api|hesabim|favorilerim|account|sifre-belirle|sifre-sifirla|verify|unsubscribe)(?:[/.]|$)/i;
  const ID_RE = /^G-[A-Z0-9]{4,20}$/;
  const SUPABASE_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4';       // herkese açık anahtar (RLS korur)
  const TAG_KEY = 'iu-ga', CONSENT_KEY = 'iu-cerez', FRESH = 30 * 60 * 1000, YEAR = 365 * 24 * 3600 * 1000;
  const KEEP = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'gclid', 'gbraid', 'wbraid', 'gad_source', 'msclkid'];

  const path = location.pathname || '/';
  if (PRIVATE.test(path)) return;
  if (navigator.globalPrivacyControl === true) return;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* gizli sekme */ } },
    del(k) { try { localStorage.removeItem(k); } catch (_) { /* gizli sekme */ } }
  };
  if (store.get('iu-ga-off') === '1') return;

  // ------------------------------------------------------------------ dil (adres önekinden)
  const m = /^\/(en|fr|de|ru|ar)(?=\/|$)/i.exec(path);
  const LANG = m ? m[1].toLowerCase() : 'tr';
  const TEXT = {
    tr: { t: 'Çerez tercihi', p: 'Ziyaret istatistikleri için Google Analytics çerezlerini kullanmak istiyoruz: baktığınız sayfalar, cihaz türü, yaklaşık konum ve Google\'ın tahmin ettiği yaş aralığı ile cinsiyet. Adınız, telefonunuz ve formlara yazdıklarınız asla gönderilmez.', ok: 'Kabul et', no: 'Reddet', more: 'Ayrıntılar' },
    en: { t: 'Cookie choice', p: 'We\'d like to use Google Analytics cookies for visit statistics: pages viewed, device type, approximate location and Google\'s estimated age range and gender. Your name, phone number and anything you type in our forms are never sent.', ok: 'Accept', no: 'Decline', more: 'Details' },
    fr: { t: 'Choix des cookies', p: 'Nous souhaitons utiliser les cookies Google Analytics pour les statistiques de visite : pages consultées, type d\'appareil, localisation approximative, ainsi que la tranche d\'âge et le sexe estimés par Google. Votre nom, votre téléphone et ce que vous saisissez dans nos formulaires ne sont jamais transmis.', ok: 'Accepter', no: 'Refuser', more: 'Détails' },
    de: { t: 'Cookie-Auswahl', p: 'Wir möchten Google-Analytics-Cookies für Besuchsstatistiken verwenden: aufgerufene Seiten, Gerätetyp, ungefährer Standort sowie die von Google geschätzte Altersgruppe und das Geschlecht. Ihr Name, Ihre Telefonnummer und Ihre Formulareingaben werden nie übermittelt.', ok: 'Akzeptieren', no: 'Ablehnen', more: 'Details' },
    ru: { t: 'Выбор cookie', p: 'Мы хотели бы использовать файлы cookie Google Analytics для статистики посещений: просмотренные страницы, тип устройства, приблизительное местоположение, а также возрастная группа и пол по оценке Google. Ваше имя, телефон и данные из форм никогда не передаются.', ok: 'Принять', no: 'Отклонить', more: 'Подробнее' },
    ar: { t: 'اختيار ملفات تعريف الارتباط', p: 'نودّ استخدام ملفات تعريف الارتباط من Google Analytics لإحصاءات الزيارات: الصفحات التي تزورها، ونوع الجهاز، والموقع التقريبي، والفئة العمرية والجنس كما تقدّرهما Google. لا نرسل أبداً اسمك أو رقم هاتفك أو ما تكتبه في نماذجنا.', ok: 'أوافق', no: 'أرفض', more: 'التفاصيل' }
  };
  const T = TEXT[LANG] || TEXT.tr;

  // ------------------------------------------------------------------ rıza
  function consent() {
    let c = null;
    try { c = JSON.parse(store.get(CONSENT_KEY) || 'null'); } catch (_) { c = null; }
    if (!c || (c.v !== 'evet' && c.v !== 'hayir') || typeof c.t !== 'number' || c.t > Date.now() || Date.now() - c.t > YEAR) return '';
    return c.v;
  }
  function remember(v) { store.set(CONSENT_KEY, JSON.stringify({ v, t: Date.now() })); }
  /** Google Analytics çerezlerini siler (_ga, _ga_XXXX) — "Reddet" sonrası */
  function dropCookies() {
    const host = location.hostname, parts = host.split('.');
    const domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-3).join('.'), '.' + parts.slice(-2).join('.'));
    document.cookie.split(';').map(x => x.split('=')[0].trim()).filter(n => /^_ga(_|$)|^_gid$|^_gat/.test(n)).forEach((n) => {
      domains.forEach((d) => { document.cookie = n + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '') + '; SameSite=Lax'; });
    });
  }

  // ------------------------------------------------------------------ adresler
  function cleanUrl(u) {
    let x;
    try { x = new URL(u, location.origin); } catch (_) { return location.origin + '/'; }
    const q = new URLSearchParams();
    KEEP.forEach(k => { const v = x.searchParams.get(k); if (v) q.set(k, v.slice(0, 100)); });
    const s = q.toString();
    return x.origin + x.pathname + (s ? '?' + s : '');
  }
  function cleanRef(r) {
    if (!r) return undefined;
    try { const x = new URL(r); return /^https?:$/.test(x.protocol) ? x.origin + x.pathname : undefined; } catch (_) { return undefined; }
  }

  // ------------------------------------------------------------------ Google Analytics
  function start(id) {
    if (!ID_RE.test(id || '') || window.__iuGa) return;
    window.__iuGa = id;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { page_location: cleanUrl(location.href), page_referrer: cleanRef(document.referrer) });
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    events();
  }
  function events() {
    const ev = (name, params) => { try { window.gtag('event', name, params || {}); } catch (_) { /* sayfayı asla bozma */ } };
    document.addEventListener('iu:lead', (e) => ev('generate_lead', { lead_source: e && e.detail && /^[a-z]{2,20}$/.test(e.detail.form || '') ? e.detail.form : 'form' }));
    document.addEventListener('iu:subscribe', () => ev('newsletter_signup'));
    document.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      const kind = /^tel:/i.test(href) ? 'phone_click' : /^mailto:/i.test(href) ? 'email_click'
        : /^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/|whatsapp:)/i.test(href) ? 'whatsapp_click' : '';
      if (!kind) return;
      ev(kind, { link_location: a.closest('header, .top-bar, nav') ? 'header' : a.closest('footer') ? 'footer' : 'page' });
    }, true);
  }

  // ------------------------------------------------------------------ rıza kutusu
  let box = null;
  function privacyHref() { return (LANG === 'tr' ? '' : '/' + LANG) + '/gizlilik-politikasi#cerezler'; }
  function banner(id) {
    if (box) { box.hidden = false; return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/analytics.css?v=20261016-cerez';
    const show = () => {
      box = document.createElement('section');
      box.className = 'iu-cerez notranslate';
      box.setAttribute('translate', 'no');
      box.setAttribute('aria-label', T.t);
      if (LANG === 'ar') box.setAttribute('dir', 'rtl');
      const p = document.createElement('p');
      p.textContent = T.p + ' ';
      const more = document.createElement('a');
      more.href = privacyHref();
      more.textContent = T.more;
      p.appendChild(more);
      const row = document.createElement('div');
      row.className = 'iu-cerez-b';
      const yes = document.createElement('button');
      yes.type = 'button'; yes.className = 'iu-cerez-ok'; yes.textContent = T.ok;
      const no = document.createElement('button');
      no.type = 'button'; no.className = 'iu-cerez-no'; no.textContent = T.no;
      yes.addEventListener('click', () => { remember('evet'); box.hidden = true; start(id); });
      no.addEventListener('click', () => {
        remember('hayir'); box.hidden = true;
        if (window.__iuGa && window.gtag) { try { window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }); } catch (_) { /* yok */ } }
        dropCookies();
      });
      row.append(no, yes);
      box.append(p, row);
      document.body.appendChild(box);
    };
    css.onload = show;
    css.onerror = show;
    document.head.appendChild(css);
  }

  function go(id) {
    if (!ID_RE.test(id || '')) return;
    // Gizlilik Politikası → "Çerez tercihimi değiştir"
    document.addEventListener('click', (e) => {
      const b = e.target && e.target.closest ? e.target.closest('[data-iu-cerez]') : null;
      if (!b) return;
      e.preventDefault();
      banner(id);
    });
    const c = consent();
    if (c === 'evet') start(id);
    else if (c !== 'hayir') {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => banner(id)); else banner(id);
    }
  }

  // ölçüm kimliği: 30 dakika hatırlanır, yoksa veritabanına sorulur (herkese açık anahtar; RLS'ye uygun fonksiyon)
  let cached = null;
  try { cached = JSON.parse(store.get(TAG_KEY) || 'null'); } catch (_) { cached = null; }
  if (cached && typeof cached.t === 'number' && cached.t <= Date.now() && Date.now() - cached.t < FRESH) {
    if (ID_RE.test(cached.id || '')) go(cached.id);
    return;
  }
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : 0;
  fetch(SUPABASE_URL + '/rest/v1/rpc/iu_site_tags', { headers: { apikey: SUPABASE_KEY, Accept: 'application/json' }, credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
    .then(r => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || typeof j !== 'object') return;
      const id = typeof j.ga === 'string' && ID_RE.test(j.ga) ? j.ga : '';
      store.set(TAG_KEY, JSON.stringify({ id, t: Date.now() }));
      if (id) go(id);
    })
    .catch(() => { /* bu sefer analitik yok; sayfa etkilenmez */ })
    .finally(() => { if (timer) clearTimeout(timer); });
})();

// Bugrahan Ünsal'ın portfolyosunda (bugrahanunsal.com, "canlı siteyi gez" penceresi) gösterilirken o sayfaya sitenin
// yüklendiğini ve hangi sayfanın açık olduğunu söyler (yalnızca adres yolu; sorgu ve # gönderilmez). Mesajı yalnızca
// bugrahanunsal.com alır; o sayfadan hiçbir şey okunmaz.
(function () {
  if (window.top === window.self) return;
  var tell = function () {
    try { window.parent.postMessage({ bu: 'live', path: location.pathname }, 'https://bugrahanunsal.com'); } catch (e) { /* portfolyo değil */ }
  };
  tell();
  window.addEventListener('pageshow', tell);
})();
