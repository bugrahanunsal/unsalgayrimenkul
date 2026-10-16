/* Google Analytics 4 in the admin panel: Google sign-in and the reports. Built to be copied to another site's admin
   unchanged (Lumen Painting, İsmail Ünsal Gayrimenkul, Bloor West Medspa): it knows nothing about any site's database.
   Messages in English or Turkish: GaReport.setLang('tr').
   • Sign-in: Google Identity Services (accounts.google.com/gsi/client, allowed by the CSP of /admin/analytics only), the
     "token" model — Google's own window asks the person, and this page receives a read-only access token
     (scope analytics.readonly) that lasts about an hour. The token is kept in this tab only (sessionStorage) and is
     revoked on "Sign out of Google". No password, no secret and no refresh token ever reach this site.
   • Reports: the Google Analytics Data API (runReport / batchRunReports / runRealtimeReport) and the Admin API
     (accountSummaries, dataStreams), called from the browser with the token.
   Everything Google sends back is data: the page shows it through textContent only. */
(function () {
  'use strict';
  const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
  const GIS = 'https://accounts.google.com/gsi/client';
  const DATA = 'https://analyticsdata.googleapis.com/v1beta/properties/';
  const ADMIN = 'https://analyticsadmin.googleapis.com/v1beta/';
  const KEY = 'lp-ga-token';
  const CLIENT_RE = /^[0-9]{4,30}-[a-z0-9]{8,64}\.apps\.googleusercontent\.com$/;
  const PROP_RE = /^[0-9]{4,20}$/;

  const fail = (code, message, detail) => Object.assign(new Error(message), { code, detail: detail || '', user: true });
  const MSG = {
    en: {
      client: 'Save the Google sign-in client ID first (Connection settings below).',
      gisLoading: 'Google sign-in is still loading. Try again in a second.',
      gisFail: 'Google sign-in did not load. Reload the page and try again.',
      gisBlocked: 'Google sign-in could not load. Check your connection (or an ad blocker) and reload the page.',
      cancelled: 'Google sign-in was cancelled, or access to Analytics was not allowed.',
      notSigned: (e) => 'Google did not sign you in' + (e ? ' (' + e + ')' : '') + '. Try again.',
      scope: 'Tick "See and download your Google Analytics data" in Google\'s window, so the reports can be read.',
      popupBlocked: 'Your browser blocked Google\'s sign-in window. Allow pop-ups for this site, then try again.',
      popupClosed: 'Google\'s sign-in window was closed before you finished.',
      popupOther: 'Google sign-in did not finish. Try again.',
      restarted: 'A new sign-in was started.',
      signin: 'Sign in with Google to see the reports.',
      network: 'Google Analytics could not be reached. Check your connection and try again.',
      expired: 'Your Google sign-in has expired. Sign in again to see the reports.',
      apiOff: (api) => 'The ' + api + ' is turned off in your Google Cloud project. Turn it on, wait a minute, then try again.',
      noAccess: 'This Google account cannot read that Analytics property. Sign in with an account that has access, or give this account the Viewer role in Google Analytics → Admin → Property access management.',
      quota: 'Google limits how many reports can be read per hour. Try again in a little while.',
      missing: 'Google Analytics does not know this property ID. Choose the property again.',
      bad: (m) => 'Google could not make this report' + (m ? ': ' + m : '.'),
      http: (s) => 'Google Analytics did not answer (' + s + '). Try again in a moment.',
      choose: 'Choose the Analytics property first.'
    },
    tr: {
      client: 'Önce Google giriş istemci kimliğini (Client ID) kaydedin (aşağıda Bağlantı ayarları).',
      gisLoading: 'Google girişi hâlâ yükleniyor. Bir saniye sonra tekrar deneyin.',
      gisFail: 'Google girişi yüklenemedi. Sayfayı yenileyip tekrar deneyin.',
      gisBlocked: 'Google girişi yüklenemedi. İnternet bağlantınızı (veya reklam engelleyiciyi) kontrol edip sayfayı yenileyin.',
      cancelled: 'Google girişi iptal edildi ya da Analytics verilerine erişime izin verilmedi.',
      notSigned: (e) => 'Google girişi tamamlanmadı' + (e ? ' (' + e + ')' : '') + '. Tekrar deneyin.',
      scope: 'Raporların okunabilmesi için Google penceresinde "Google Analytics verilerinizi görme ve indirme" iznini işaretleyin.',
      popupBlocked: 'Tarayıcınız Google giriş penceresini engelledi. Bu site için açılır pencerelere izin verip tekrar deneyin.',
      popupClosed: 'Google giriş penceresi işlem bitmeden kapatıldı.',
      popupOther: 'Google girişi tamamlanmadı. Tekrar deneyin.',
      restarted: 'Yeni bir giriş başlatıldı.',
      signin: 'Raporları görmek için Google ile giriş yapın.',
      network: 'Google Analytics\'e ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.',
      expired: 'Google oturumunuzun süresi doldu. Raporları görmek için tekrar giriş yapın.',
      apiOff: (api) => api + ' Google Cloud projenizde kapalı. Açın, bir dakika bekleyin ve tekrar deneyin.',
      noAccess: 'Bu Google hesabının bu Analytics mülküne erişimi yok. Erişimi olan hesapla giriş yapın ya da Google Analytics → Yönetici (Admin) → Mülk erişim yönetimi bölümünden bu hesaba Görüntüleyici (Viewer) rolü verin.',
      quota: 'Google saatte okunabilecek rapor sayısını sınırlıyor. Biraz sonra tekrar deneyin.',
      missing: 'Google Analytics bu mülk kimliğini (Property ID) tanımıyor. Mülkü yeniden seçin.',
      bad: (m) => 'Google bu raporu hazırlayamadı' + (m ? ': ' + m : '.'),
      http: (s) => 'Google Analytics yanıt vermedi (' + s + '). Birazdan tekrar deneyin.',
      choose: 'Önce Analytics mülkünü seçin.'
    }
  };
  let LANG = 'en';
  const M = (k, a) => { const v = (MSG[LANG] || MSG.en)[k]; return typeof v === 'function' ? v(a) : v; };

  // ------------------------------------------------------------------ the token (this tab only)
  function token() {
    try {
      const t = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (t && typeof t.t === 'string' && typeof t.e === 'number' && t.e - 60000 > Date.now()) return t.t;
    } catch (_) { /* no storage */ }
    return '';
  }
  function expiresAt() { try { const t = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return t && t.e ? t.e : memExp; } catch (_) { return memExp; } }
  function keep(accessToken, seconds) {
    const e = Date.now() + Math.min(Math.max(Number(seconds) || 3600, 60), 3600) * 1000;
    try { sessionStorage.setItem(KEY, JSON.stringify({ t: accessToken, e })); } catch (_) { /* memory only */ }
    mem = accessToken; memExp = e;
  }
  let mem = '', memExp = 0;
  function clear() { try { sessionStorage.removeItem(KEY); } catch (_) { /* fine */ } mem = ''; memExp = 0; }
  /** the token, while it has more than a minute left (also when this browser keeps nothing in sessionStorage) */
  const current = () => token() || (mem && memExp - 60000 > Date.now() ? mem : '');

  // ------------------------------------------------------------------ Google Identity Services
  let gisPromise = null;
  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GIS; s.async = true; s.defer = true;
      s.onload = () => (window.google && google.accounts && google.accounts.oauth2 ? resolve() : reject(fail('gis', M('gisFail'))));
      s.onerror = () => { gisPromise = null; reject(fail('gis', M('gisBlocked'))); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }
  const gisReady = () => !!(window.google && google.accounts && google.accounts.oauth2);

  let client = null, clientFor = '', pending = null;
  /** Opens Google's window. Call it straight from a click (browsers block windows opened later). → Promise<token> */
  function signIn(clientId, pickAccount) {
    if (!CLIENT_RE.test(clientId || '')) return Promise.reject(fail('client', M('client')));
    if (!gisReady()) { loadGis().catch(() => {}); return Promise.reject(fail('gis', M('gisLoading'))); }
    if (!client || clientFor !== clientId) {
      client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        prompt: '',
        callback: (resp) => {
          const p = pending; pending = null;
          if (!p) return;
          if (!resp || resp.error || !resp.access_token) {
            const why = resp && resp.error === 'access_denied' ? M('cancelled') : M('notSigned', resp && resp.error ? String(resp.error).slice(0, 60) : '');
            p.reject(fail('denied', why));
            return;
          }
          if (!google.accounts.oauth2.hasGrantedAllScopes(resp, SCOPE)) {
            p.reject(fail('scope', M('scope')));
            return;
          }
          keep(resp.access_token, resp.expires_in);
          p.resolve(resp.access_token);
        },
        error_callback: (err) => {
          const p = pending; pending = null;
          if (!p) return;
          const type = err && err.type;
          p.reject(fail(type || 'popup', type === 'popup_failed_to_open' ? M('popupBlocked') : type === 'popup_closed' ? M('popupClosed') : M('popupOther')));
        }
      });
      clientFor = clientId;
    }
    return new Promise((resolve, reject) => {
      if (pending) pending.reject(fail('popup', M('restarted')));
      pending = { resolve, reject };
      client.requestAccessToken(pickAccount ? { prompt: 'select_account' } : {});
    });
  }
  function signOut() {
    const t = current();
    clear();
    if (t && gisReady()) { try { google.accounts.oauth2.revoke(t, () => {}); } catch (_) { /* the token expires within the hour anyway */ } }
  }

  // ------------------------------------------------------------------ calling Google
  /** the "turn this API on" link Google sends when an API is off in the Cloud project (only Google's own console) */
  function activationUrl(j) {
    const det = (j && j.error && Array.isArray(j.error.details)) ? j.error.details : [];
    for (const d of det) {
      const u = d && d.metadata && d.metadata.activationUrl;
      if (typeof u === 'string' && /^https:\/\/console\.(developers|cloud)\.google\.com\/[^\s"'<>]*$/.test(u) && u.length < 400) return u;
      const links = d && Array.isArray(d.links) ? d.links : [];
      for (const l of links) if (l && typeof l.url === 'string' && /^https:\/\/console\.(developers|cloud)\.google\.com\/[^\s"'<>]*$/.test(l.url) && l.url.length < 400) return l.url;
    }
    return '';
  }
  async function call(url, body) {
    const t = current();
    if (!t) throw fail('signin', M('signin'));
    let r;
    try {
      r = await fetch(url, {
        method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: Object.assign({ Authorization: 'Bearer ' + t, Accept: 'application/json' }, body ? { 'Content-Type': 'application/json' } : {}),
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (_) { throw fail('network', M('network')); }
    let j = null;
    try { j = await r.json(); } catch (_) { j = null; }
    if (r.ok) return j || {};
    const msg = j && j.error && typeof j.error.message === 'string' ? j.error.message.slice(0, 400) : '';
    const reasons = JSON.stringify((j && j.error && j.error.details) || []) + ' ' + ((j && j.error && j.error.status) || '');
    if (r.status === 401) { clear(); throw fail('signin', M('expired'), msg); }
    if (/SERVICE_DISABLED|has not been used in project|it is disabled/i.test(msg + reasons)) {
      const api = /analyticsadmin/.test(url) ? 'Google Analytics Admin API' : 'Google Analytics Data API';
      throw Object.assign(fail('api', M('apiOff', api), msg), { api, link: activationUrl(j) });
    }
    if (r.status === 403) throw fail('denied', M('noAccess'), msg);
    if (r.status === 429) throw fail('quota', M('quota'), msg);
    if (r.status === 404) throw fail('missing', M('missing'), msg);
    if (r.status === 400) throw fail('bad', M('bad', msg.slice(0, 160)), msg);
    throw fail('http', M('http', r.status), msg);
  }

  /** every account and property this Google account can read → [{account, properties: [{id, name}]}] */
  async function properties() {
    const out = [];
    let page = '';
    for (let i = 0; i < 10; i++) {
      const j = await call(ADMIN + 'accountSummaries?pageSize=200' + (page ? '&pageToken=' + encodeURIComponent(page) : ''));
      (j.accountSummaries || []).forEach((a) => {
        const props = (a.propertySummaries || []).map(p => ({ id: String(p.property || '').replace(/^properties\//, ''), name: String(p.displayName || '').slice(0, 120) }))
          .filter(p => PROP_RE.test(p.id));
        if (props.length) out.push({ account: String(a.displayName || 'Account').slice(0, 120), properties: props });
      });
      page = typeof j.nextPageToken === 'string' ? j.nextPageToken : '';
      if (!page) break;
    }
    return out;
  }
  /** the property's website streams → [{id: 'G-…', name, url}] */
  async function streams(propertyId) {
    if (!PROP_RE.test(propertyId || '')) throw fail('missing', M('choose'));
    const j = await call(ADMIN + 'properties/' + propertyId + '/dataStreams?pageSize=50');
    return (j.dataStreams || []).filter(s => s && s.webStreamData && /^G-[A-Z0-9]{4,20}$/.test(s.webStreamData.measurementId || ''))
      .map(s => ({ id: s.webStreamData.measurementId, name: String(s.displayName || '').slice(0, 120), url: String(s.webStreamData.defaultUri || '').slice(0, 200) }));
  }
  /** up to 5 reports in one call → the reports, in the same order */
  async function batch(propertyId, requests) {
    if (!PROP_RE.test(propertyId || '')) throw fail('missing', M('choose'));
    const j = await call(DATA + propertyId + ':batchRunReports', { requests });
    return Array.isArray(j.reports) ? j.reports : [];
  }
  /** people on the site in the last 30 minutes */
  async function live(propertyId) {
    if (!PROP_RE.test(propertyId || '')) return null;
    const j = await call(DATA + propertyId + ':runRealtimeReport', { metrics: [{ name: 'activeUsers' }] });
    const v = j && j.rows && j.rows[0] && j.rows[0].metricValues && j.rows[0].metricValues[0] ? Number(j.rows[0].metricValues[0].value) : 0;
    return Number.isFinite(v) ? v : 0;
  }

  /** a report's rows as plain objects: {d: [dimension values], m: [numbers]} */
  function rows(report) {
    return ((report && report.rows) || []).map(r => ({
      d: (r.dimensionValues || []).map(x => String((x && x.value) || '')),
      m: (r.metricValues || []).map(x => { const n = Number(x && x.value); return Number.isFinite(n) ? n : 0; })
    }));
  }
  const thresholded = (report) => !!(report && report.metadata && report.metadata.subjectToThresholding);

  /** GaReport.setLang('tr') — messages in Turkish (default English) */
  function setLang(l) { LANG = MSG[l] ? l : 'en'; }

  window.GaReport = { SCOPE, CLIENT_RE, PROP_RE, setLang, loadGis, gisReady, signIn, signOut, token: current, expiresAt, properties, streams, batch, live, rows, thresholded };
})();
