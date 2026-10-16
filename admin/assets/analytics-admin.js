/**
 * ============================================
 * ANALİTİK — İsmail Ünsal Gayrimenkul (Admin → Analitik, yalnızca admin)
 * ============================================
 * Sitenin ziyaretçileri Google Analytics 4'ten: önceki döneme göre değişimiyle toplamlar, zaman içinde ziyaretçi,
 * trafik kaynağı (kanallar ve kaynaklar), ülke, il / bölge, şehir, cinsiyet, yaş, cihazlar, en çok bakılan sayfalar
 * ve şu an sitede olanlar. Ayrıca bağlantı ayarları: Google giriş istemcisi, raporların okunduğu mülk ve site takibi
 * (sitenin ziyaretleri gönderdiği G-… ölçüm kimliği → /analytics.js; ziyaretçi çerez iznini kabul ederse).
 *
 * Güvenlik:
 *  • Google girişi ve Google'a yapılan her çağrı: ga-report.js (salt okunur izin, erişim anahtarı yalnızca bu sekmede
 *    ~1 saat; şifre, gizli anahtar veya yenileme anahtarı bu siteye hiç gelmez). Bu sayfanın kendi CSP'si var (_headers).
 *  • Ayarlar: site_analytics tablosu (yalnızca admin okur/yazar — veritabanı RLS ile kontrol eder).
 *  • Google'dan ve veritabanından gelen her değer sayfaya yalnızca textContent ile yazılır.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const G = window.GaReport;
  const SITE = 'https://ismailunsal.com.tr';
  const TZ = 'Europe/Istanbul';
  const MID_RE = /^G-[A-Z0-9]{4,20}$/;
  const YMD = /^\d{4}-\d{2}-\d{2}$/;
  const S = { cfg: null, period: '28', from: '', to: '', seq: 0, liveTimer: 0, shownFor: '' };
  G.setLang('tr');
  LpCharts.setLang('tr');

  // ------------------------------------------------------------------ yardımcılar
  /** küçük DOM yardımcısı: h('div', {class, text, onclick, …}, çocuklar…) — veri asla innerHTML ile yazılmaz */
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach(c => { if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : String(c)); });
    return e;
  }
  const icon = (n) => App.icon(n);
  const toast = (m, t) => App.toast(m, t || 'info');
  const NF = new Intl.NumberFormat('tr-TR');
  const int = (n) => NF.format(Math.round(Number(n) || 0));
  const pctText = (v) => '%' + (v >= 10 || v === 0 ? Math.round(v) : (Math.round(v * 10) / 10).toString().replace('.', ','));
  const rate = (x) => pctText((Number(x) || 0) * 100);
  function dur(s) { s = Math.round(Number(s) || 0); const m = Math.floor(s / 60), r = s % 60; return m ? m + ' dk ' + String(r).padStart(2, '0') + ' sn' : r + ' sn'; }
  const share = (v, tot) => (tot > 0 ? pctText(v / tot * 100) : '');
  function todayIst() {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const g = (t) => (p.find(x => x.type === t) || {}).value;
    return g('year') + '-' + g('month') + '-' + g('day');
  }
  function addDays(ymd, n) { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  const daysIn = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5) + 1;
  const fmtDay = (ymd, o) => new Date(ymd + 'T12:00:00Z').toLocaleDateString('tr-TR', Object.assign({ timeZone: 'UTC', month: 'short', day: 'numeric' }, o || {}));
  const unknown = (v) => !v || v === '(not set)' || v === '(other)' || v === 'unknown';
  function errText(e, fb) {
    if (e && e.user) return e.message;
    const m = e && typeof e.message === 'string' ? e.message : '';
    if (/row-level security|permission denied|not allowed/i.test(m)) return 'Bu işlem için yetkiniz yok.';
    if (m && m.length < 200 && !/[{}<>]|syntax|column|relation|function/i.test(m)) return m;
    return fb || 'Bir şeyler ters gitti. Lütfen tekrar deneyin.';
  }
  const say = (el, text) => { el.textContent = text; return el; };

  // ------------------------------------------------------------------ ayarlar (site_analytics, tek satır)
  const COLS = 'measurement_id,tracking_on,property_id,property_name,client_id,updated_at';
  async function loadCfg() {
    const { data, error } = await supabaseClient.from('site_analytics').select(COLS).eq('id', 1).maybeSingle();
    if (error) throw error;
    S.cfg = data || {};
  }
  async function saveCfg(patch, okText) {
    const { data, error } = await supabaseClient.from('site_analytics').update(patch).eq('id', 1).select(COLS).maybeSingle();
    if (error) { toast(errText(error, 'Ayarlar kaydedilemedi.'), 'error'); return false; }
    if (!data) { toast('Ayarlar kaydedilemedi. Yetkiniz olmayabilir.', 'error'); return false; }
    S.cfg = data;
    try { localStorage.removeItem('iu-ga'); } catch (_) { /* bu tarayıcıdaki ölçüm kimliği kopyası */ }
    if (okText) toast(okText, 'success');
    renderSettings();
    view();
    return true;
  }

  // ------------------------------------------------------------------ ne gösterilecek
  function view() {
    const c = S.cfg || {};
    const signed = !!G.token();
    const ready = !!(c.client_id && signed && c.property_id);
    $('anConnect').hidden = ready;
    $('anReports').hidden = !ready;
    const steps = { client: !!c.client_id, signin: signed, property: !!c.property_id, tracking: !!(c.tracking_on && c.measurement_id) };
    document.querySelectorAll('#anSteps li').forEach((li) => {
      const done = !!steps[li.dataset.step];
      li.classList.toggle('done', done);
      const dot = li.querySelector('.an-dot'); dot.textContent = ''; if (done) dot.append(icon('check'));
      li.setAttribute('aria-label', li.querySelector('b').textContent + (done ? ': tamam' : ': yapılacak'));
    });
    const btn = $('anSignIn'), note = $('anConnectNote');
    btn.disabled = !c.client_id;
    btn.textContent = signed && c.client_id && !c.property_id ? 'Analytics mülkünü seçin' : 'Google ile giriş yap';
    $('anOtherAcct').hidden = !c.client_id;
    note.hidden = !!c.client_id;
    note.textContent = c.client_id ? '' : 'Önce aşağıdaki Bağlantı ayarları bölümünden Google giriş istemcisini ekleyin (bir kez).';
    $('anSignOut').hidden = !signed;
    const exp = G.expiresAt();
    $('anSignedIn').textContent = signed && exp ? 'Bu sekmede Google oturumu ' + new Date(exp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' saatine kadar açık.' : '';
    if (!c.client_id) $('anSettings').open = true;
    if (ready) {
      $('anPropName').textContent = (c.property_name || 'Mülk') + ' (' + c.property_id + ')';
      if (S.shownFor !== c.property_id) { S.shownFor = c.property_id; loadReports(); startLive(); } else trackingBanner();
    } else { S.shownFor = ''; stopLive(); }
  }

  // ------------------------------------------------------------------ bağlan
  async function signIn(pick) {
    const c = S.cfg || {};
    hideErr();
    try { await G.signIn(c.client_id, pick); }
    catch (e) { showErr(errText(e, 'Google girişi tamamlanmadı.')); return; }
    toast('Google ile giriş yapıldı.', 'success');
    view();
    if (!c.property_id) pickProperty();
  }
  async function pickProperty() {
    if (!G.token()) { showErr('Önce Google ile giriş yapın, sonra mülkü seçin.'); return; }
    const dlg = $('anPropDialog'), list = $('anPropList');
    list.textContent = '';
    list.append(h('p', { class: 'an-skel', text: 'Google Analytics mülkleriniz yükleniyor…' }));
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    let accounts;
    try { accounts = await G.properties(); }
    catch (e) {
      list.textContent = '';
      list.append(h('p', { class: 'form-help', text: errText(e, 'Mülkler listelenemedi.') }));
      if (e && e.link) list.append(h('a', { class: 'btn btn-outline btn-sm', href: e.link, target: '_blank', rel: 'noopener noreferrer', text: 'Google Cloud\'da aç' }));
      list.append(h('p', { class: 'form-help', text: 'Mülk kimliğini Bağlantı ayarları bölümüne elle de yazabilirsiniz (Google Analytics → Yönetici → Mülk ayrıntıları).' }));
      return;
    }
    list.textContent = '';
    if (!accounts.length) {
      list.append(h('p', { text: 'Bu Google hesabının henüz bir Google Analytics mülkü yok ya da erişimi yok.' }),
        h('p', { class: 'form-help', text: 'analytics.google.com adresinden bir mülk oluşturun (Yönetici → Oluştur → Mülk) ya da mülkün sahibi olan hesapla giriş yapın.' }));
      return;
    }
    accounts.forEach((a) => {
      const grp = h('div', null, h('h4', { text: a.account }));
      a.properties.forEach((p) => grp.append(h('button', { type: 'button', onclick: async () => {
        dlg.close();
        const ok = await saveCfg({ property_id: p.id, property_name: p.name || null }, 'Mülk seçildi: ' + (p.name || p.id) + '.');
        if (ok) suggestMeasurementId(true);
      } }, h('span', { text: p.name || 'Mülk' }), h('small', { text: 'Mülk kimliği ' + p.id }))));
      list.append(grp);
    });
    const first = list.querySelector('button'); if (first) first.focus();
  }
  /** mülkün web veri akışı → G-… kimliği (yazılır; daha önce kayıtlı değilse hemen kaydedilir) */
  async function suggestMeasurementId(quiet) {
    const c = S.cfg || {};
    if (!c.property_id) { toast('Önce Analytics mülkünü seçin.', 'warning'); return; }
    if (!G.token()) { toast('Önce Google ile giriş yapın.', 'warning'); return; }
    let list = [];
    try { list = await G.streams(c.property_id); }
    catch (e) { if (!quiet) toast(errText(e, 'Veri akışları okunamadı.'), 'error'); return; }
    if (!list.length) { if (!quiet) toast('Bu mülkte henüz web veri akışı yok. Google Analytics: Yönetici → Veri akışları → Akış ekle → Web.', 'warning'); return; }
    const s = list[0];
    $('anMid').value = s.id;
    if (!c.measurement_id) await saveCfg({ measurement_id: s.id }, 'Ölçüm kimliği bulundu: ' + s.id + '. Başlatmak için "Site ziyaretlerini Google Analytics\'te say" kutusunu işaretleyip kaydedin.');
    else if (!quiet) toast('Bulundu: ' + s.id + (s.url ? ' (' + s.url + ')' : '') + '. Kullanmak için "Takibi kaydet"e basın.', 'info');
  }

  // ------------------------------------------------------------------ raporlar
  function ranges() {
    const t = todayIst();
    if (S.period === 'today') return { cur: [t, t], prev: [addDays(t, -1), addDays(t, -1)], unit: 'hour' };
    let cur;
    if (S.period === 'custom' && YMD.test(S.from) && YMD.test(S.to)) cur = [S.from, S.to];
    else { const n = Number(S.period) || 28; cur = [addDays(t, -n), addDays(t, -1)]; }
    const n = daysIn(cur[0], cur[1]);
    return { cur, prev: [addDays(cur[0], -n), addDays(cur[0], -1)], unit: n > 120 ? 'week' : 'day' };
  }
  function rangeText(r) {
    if (S.period === 'today') return 'Bugün (şu ana kadar), dünle karşılaştırmalı';
    return fmtDay(r.cur[0], { year: 'numeric' }) + ' – ' + fmtDay(r.cur[1], { year: 'numeric' }) + ', önceki ' + daysIn(r.cur[0], r.cur[1]) + ' günle karşılaştırmalı';
  }
  function requests(r) {
    const cur = { startDate: r.cur[0], endDate: r.cur[1], name: 'cur' }, prev = { startDate: r.prev[0], endDate: r.prev[1], name: 'prev' };
    const M = (...n) => n.map(name => ({ name })), D = M;
    const top = (m) => [{ metric: { metricName: m }, desc: true }];
    const time = r.unit === 'hour' ? 'hour' : r.unit === 'week' ? 'isoYearIsoWeek' : 'date';
    return [[
      { dateRanges: [cur, prev], metrics: M('activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'userEngagementDuration', 'keyEvents') },
      { dateRanges: [cur, prev], dimensions: D(time), metrics: M('activeUsers', 'sessions'), limit: 1000 },
      { dateRanges: [cur], dimensions: D('sessionDefaultChannelGroup'), metrics: M('sessions', 'activeUsers', 'engagedSessions', 'keyEvents'), orderBys: top('sessions'), limit: 12 },
      { dateRanges: [cur], dimensions: D('sessionSourceMedium'), metrics: M('sessions', 'activeUsers', 'keyEvents'), orderBys: top('sessions'), limit: 10 },
      { dateRanges: [cur], dimensions: D('countryId', 'country'), metrics: M('activeUsers', 'sessions'), orderBys: top('activeUsers'), limit: 10 }
    ], [
      { dateRanges: [cur], dimensions: D('region', 'country'), metrics: M('activeUsers', 'sessions'), orderBys: top('activeUsers'), limit: 10 },
      { dateRanges: [cur], dimensions: D('city', 'region'), metrics: M('activeUsers'), orderBys: top('activeUsers'), limit: 10 },
      { dateRanges: [cur], dimensions: D('userGender'), metrics: M('activeUsers'), orderBys: top('activeUsers'), limit: 6 },
      { dateRanges: [cur], dimensions: D('userAgeBracket'), metrics: M('activeUsers'), limit: 12 },
      { dateRanges: [cur], dimensions: D('pagePath'), metrics: M('screenPageViews', 'activeUsers'), orderBys: top('screenPageViews'), limit: 15 }
    ], [
      { dateRanges: [cur], dimensions: D('deviceCategory'), metrics: M('activeUsers', 'sessions'), orderBys: top('activeUsers'), limit: 6 }
    ]];
  }
  /** iki dönemli raporun satırları → {cur: [...], prev: [...]} (dönem "dateRange" adlı boyuttadır) */
  function split(report) {
    const heads = ((report && report.dimensionHeaders) || []).map(x => x && x.name);
    const at = heads.indexOf('dateRange');
    const out = { cur: [], prev: [] };
    G.rows(report).forEach((r) => {
      const which = at >= 0 ? r.d[at] : 'cur';
      const d = at >= 0 ? r.d.filter((_, i) => i !== at) : r.d;
      (which === 'prev' ? out.prev : out.cur).push({ d, m: r.m });
    });
    return out;
  }
  async function loadReports() {
    const c = S.cfg || {};
    if (!c.property_id || !G.token()) return;
    const seq = ++S.seq;
    const r = ranges();
    $('anRange').textContent = rangeText(r);
    const boxes = document.querySelectorAll('#anKpis, #anReports .an-card');
    boxes.forEach(b => b.classList.add('lc-busy'));
    hideErr();
    try {
      const [qa, qb, qc] = requests(r);
      const [ra, rb, rc] = await Promise.all([G.batch(c.property_id, qa), G.batch(c.property_id, qb), G.batch(c.property_id, qc)]);
      if (seq !== S.seq) return;
      render(r, ra, rb, rc);
    } catch (e) {
      if (seq !== S.seq) return;
      fault(e);
    } finally {
      if (seq === S.seq) boxes.forEach(b => b.classList.remove('lc-busy'));
    }
  }
  function fault(e) {
    if (e && e.code === 'signin') { showErr(e.message); view(); return; }
    const err = $('anErr');
    err.textContent = '';
    err.append(h('span', { text: errText(e, 'Raporlar yüklenemedi.') + ' ' }));
    if (e && e.link) err.append(h('a', { href: e.link, target: '_blank', rel: 'noopener noreferrer', text: 'Google Cloud\'da açın' }), ' ');
    if (e && e.code === 'denied') err.append(h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Başka bir Google hesabı kullan', onclick: () => signIn(true) }), ' ');
    if (e && e.code === 'missing') err.append(h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Mülkü seç', onclick: () => pickProperty() }), ' ');
    err.append(h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Tekrar dene', onclick: () => loadReports() }));
    err.hidden = false;
  }
  function showErr(t) { const e = $('anErr'); e.textContent = t; e.hidden = false; }
  function hideErr() { $('anErr').hidden = true; }

  function render(r, ra, rb, rc) {
    const kp = split(ra[0]);
    const cur = (kp.cur[0] && kp.cur[0].m) || [0, 0, 0, 0, 0, 0, 0];
    const prev = (kp.prev[0] && kp.prev[0].m) || null;
    const users = cur[0];
    renderKpis(cur, S.period === 'today' ? null : prev);
    renderTrend(r, ra[1]);
    renderChannels(ra[2]);
    renderSources(ra[3]);
    renderCountries(ra[4], users);
    renderRegions(rb[0], users);
    renderCities(rb[1], users);
    renderGender(rb[2]);
    renderAge(rb[3]);
    renderPages(rb[4]);
    renderDevices(rc[0]);
    trackingBanner();
  }

  /** önceki döneme göre değişim: ok + işaret + yazı (renk tek başına anlam taşımaz) */
  function kpi(ic, label, value, now, before, fmtDelta, hint) {
    const box = h('div', { class: 'an-kpi' }, h('span', { class: 'an-kpi-l' }, icon(ic), h('span', { text: label })), h('span', { class: 'an-kpi-v', text: value }));
    if (before === null || before === undefined) {
      if (hint && !now) box.append(h('span', { class: 'an-kpi-d', text: hint }));
      return box;
    }
    let text = '', dir = 0;
    if (now === before) text = 'Değişmedi';
    else if (fmtDelta) { dir = now > before ? 1 : -1; text = fmtDelta(now, before); }
    else if (before === 0) text = 'Bu dönem yeni';
    else {
      const ch = (now - before) / before * 100;
      if (Math.abs(ch) < 0.5) text = 'Hemen hemen aynı';
      else { dir = ch > 0 ? 1 : -1; text = '%' + Math.round(Math.abs(ch)); }
    }
    const d = h('span', { class: 'an-kpi-d' + (dir > 0 ? ' up' : dir < 0 ? ' down' : '') });
    if (dir) d.append(icon(dir > 0 ? 'arrow-up' : 'arrow-down'));
    d.append(document.createTextNode((dir > 0 ? '+' : dir < 0 ? '−' : '') + text), h('span', { text: ' önceki döneme göre' }));
    d.setAttribute('aria-label', (dir > 0 ? text + ' arttı' : dir < 0 ? text + ' azaldı' : text) + ', önceki döneme göre');
    box.append(d);
    if (hint && !now && !before) box.append(h('span', { class: 'an-kpi-d', text: hint }));
    return box;
  }
  function renderKpis(c, p) {
    const box = $('anKpis');
    box.textContent = '';
    const [users, fresh, sessions, views, eng, , leads] = c;
    const pv = (i) => (p ? p[i] : null);
    const perUser = (m) => (m[0] > 0 ? m[5] / m[0] : 0);
    const ppv = (m) => (m[2] > 0 ? m[3] / m[2] : 0);
    const pts = (a, b) => (Math.round(Math.abs(a - b) * 1000) / 10).toString().replace('.', ',') + ' puan';
    box.append(
      kpi('users', 'Ziyaretçi', int(users), users, pv(0)),
      kpi('user-plus', 'Yeni ziyaretçi', int(fresh), fresh, pv(1)),
      kpi('activity', 'Ziyaret', int(sessions), sessions, pv(2)),
      kpi('eye', 'Sayfa görüntüleme', int(views), views, pv(3)),
      kpi('check', 'Etkileşimli ziyaret', rate(eng), eng, p ? p[4] : null, (a, b) => pts(a, b)),
      kpi('clock', 'Ziyaretçi başına süre', dur(perUser(c)), perUser(c), p ? perUser(p) : null),
      kpi('file', 'Ziyaret başına sayfa', (Math.round(ppv(c) * 10) / 10).toFixed(1).replace('.', ','), ppv(c), p ? ppv(p) : null),
      kpi('send', 'Talepler', int(leads), leads, pv(6), null, 'Saymak için Google Analytics\'te generate_lead olayını "önemli etkinlik" (key event) yapın'));
    if (box.children[4]) box.children[4].title = '10 saniyeden uzun süren, 2 veya daha fazla sayfa görülen ya da talep gönderilen ziyaretler';
  }

  /** ISO hafta "202641" → o haftanın pazartesisi, YYYY-AA-GG */
  function isoWeekMonday(code) {
    const y = Number(String(code).slice(0, 4)), w = Number(String(code).slice(4));
    const jan4 = new Date(Date.UTC(y, 0, 4)), dow = (jan4.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(y, 0, 4 - dow + (w - 1) * 7)).toISOString().slice(0, 10);
  }
  function isoMonday(ymd) { const d = new Date(ymd + 'T12:00:00Z'); return addDays(ymd, -((d.getUTCDay() + 6) % 7)); }
  function renderTrend(r, report) {
    const box = $('anTrend');
    const sp = split(report);
    const pts = [], rows = [];
    const vis = (v) => int(v) + ' ziyaretçi';
    if (r.unit === 'hour') {
      const hourNow = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date())) % 24;
      const cm = new Map(sp.cur.map(x => [Number(x.d[0]), x.m[0]])), pm = new Map(sp.prev.map(x => [Number(x.d[0]), x.m[0]]));
      for (let i = 0; i <= hourNow; i++) {
        const lab = String(i).padStart(2, '0') + ':00';
        pts.push({ label: lab, short: lab, v: cm.get(i) || 0, p: pm.get(i) || 0, plabel: 'dün' });
        rows.push([lab, int(cm.get(i) || 0), int(pm.get(i) || 0)]);
      }
      $('anTrendT').textContent = 'Saatlik ziyaretçi';
    } else if (r.unit === 'week') {
      const cm = new Map(sp.cur.map(x => [isoWeekMonday(x.d[0]), x.m[0]])), pm = new Map(sp.prev.map(x => [isoWeekMonday(x.d[0]), x.m[0]]));
      for (let k = isoMonday(r.cur[0]), j = isoMonday(r.prev[0]); k <= r.cur[1]; k = addDays(k, 7), j = addDays(j, 7)) {
        const lab = fmtDay(k < r.cur[0] ? r.cur[0] : k, { year: 'numeric' }) + ' haftası';
        pts.push({ label: lab, short: fmtDay(k), v: cm.get(k) || 0, p: pm.get(j) || 0, plabel: fmtDay(j) + ' haftası' });
        rows.push([lab, int(cm.get(k) || 0), int(pm.get(j) || 0)]);
      }
      $('anTrendT').textContent = 'Haftalık ziyaretçi';
    } else {
      const ymd = (s) => s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8);
      const cm = new Map(sp.cur.map(x => [ymd(x.d[0]), x.m[0]])), pm = new Map(sp.prev.map(x => [ymd(x.d[0]), x.m[0]]));
      const n = daysIn(r.cur[0], r.cur[1]);
      for (let i = 0; i < n; i++) {
        const k = addDays(r.cur[0], i), j = addDays(r.prev[0], i);
        const lab = fmtDay(k, { weekday: 'short', year: 'numeric' });
        pts.push({ label: lab, short: fmtDay(k), v: cm.get(k) || 0, p: pm.get(j) || 0, plabel: fmtDay(j) });
        rows.push([lab, int(cm.get(k) || 0), int(pm.get(j) || 0)]);
      }
      $('anTrendT').textContent = 'Günlük ziyaretçi';
    }
    if (!pts.some(p => p.v > 0 || p.p > 0)) { empty(box, 'Bu dönemde kayıtlı ziyaret yok. Takibi yeni açtıysanız ilk rakamlar Google Analytics\'te bir-iki gün içinde görünür.'); return; }
    LpCharts.line(box, pts, { height: 230, format: vis, seriesLabel: S.period === 'today' ? 'Bugün' : 'Bu dönem', prevLabel: S.period === 'today' ? 'Dün' : 'Önceki dönem', label: $('anTrendT').textContent });
    box.append(LpCharts.table([r.unit === 'hour' ? 'Saat' : r.unit === 'week' ? 'Hafta' : 'Gün', S.period === 'today' ? 'Bugün' : 'Bu dönem', S.period === 'today' ? 'Dün' : 'Önceki dönem'], rows));
  }
  function empty(box, text) { box.textContent = ''; box.append(h('p', { class: 'lc-empty', text })); }
  function note(box, text) { box.append(h('p', { class: 'an-note' }, icon('info'), h('span', { text }))); }
  const PRIVACY = 'Google, ziyaretçilerin gizliliğini korumak için küçük grupları gizler; bu yüzden bu rakamlar toplamdan düşük olabilir.';

  const CHANNELS = { 'Organic Search': 'Organik arama', 'Direct': 'Doğrudan', 'Referral': 'Yönlendiren site', 'Organic Social': 'Sosyal medya',
    'Organic Maps': 'Haritalar', 'Organic Video': 'Video', 'Organic Shopping': 'Alışveriş', 'Paid Search': 'Ücretli arama', 'Paid Social': 'Ücretli sosyal',
    'Paid Video': 'Ücretli video', 'Paid Shopping': 'Ücretli alışveriş', 'Paid Other': 'Diğer ücretli', 'Display': 'Görüntülü reklam', 'Cross-network': 'Çapraz ağ',
    'Email': 'E-posta', 'SMS': 'SMS', 'Mobile Push Notifications': 'Mobil bildirim', 'Affiliates': 'Ortaklık', 'Audio': 'Ses', 'Unassigned': 'Belirsiz' };
  const channel = (v) => (unknown(v) ? 'Belirsiz' : CHANNELS[v] || v);
  function renderChannels(report) {
    const box = $('anChannels');
    const rows = G.rows(report);
    if (!rows.length) { empty(box, 'Bu dönemde ziyaret yok.'); return; }
    const tot = rows.reduce((a, x) => a + x.m[0], 0);
    LpCharts.bars(box, rows.map(x => ({ label: channel(x.d[0]), value: x.m[0], text: int(x.m[0]), share: share(x.m[0], tot) })), { label: 'Kanala göre ziyaretler' });
    box.append(LpCharts.table(['Kanal', 'Ziyaret', 'Ziyaretçi', 'Etkileşimli', 'Talep'],
      rows.map(x => [channel(x.d[0]), int(x.m[0]), int(x.m[1]), share(x.m[2], x.m[0]) || '%0', int(x.m[3])]), 'Rakamları göster'));
  }
  function sourceName(v) {
    if (v === '(direct) / (none)') return 'Doğrudan (adres yazıldı veya yer imi)';
    return unknown(v) ? 'Bilinmiyor' : v;
  }
  function renderSources(report) {
    const box = $('anSources');
    box.textContent = '';
    const rows = G.rows(report);
    if (!rows.length) { empty(box, 'Bu dönemde ziyaret yok.'); return; }
    const t = h('table', { class: 'an-tbl' });
    t.append(h('thead', null, h('tr', null, h('th', { scope: 'col', text: 'Kaynak / nasıl' }), h('th', { scope: 'col', class: 'lc-num', text: 'Ziyaret' }), h('th', { scope: 'col', class: 'lc-num', text: 'Talep' }))));
    const tb = h('tbody');
    rows.forEach(x => tb.append(h('tr', null, h('td', { text: sourceName(x.d[0]) }), h('td', { class: 'lc-num', text: int(x.m[0]) }), h('td', { class: 'lc-num', text: int(x.m[2]) }))));
    t.append(tb);
    box.append(h('div', { class: 'table-container' }, t));
  }
  let regionNames = null;
  try { regionNames = new Intl.DisplayNames(['tr'], { type: 'region' }); } catch (_) { regionNames = null; }
  function countryName(code, name) {
    if (code === 'ZZ' || unknown(code) && unknown(name)) return 'Bilinmiyor';
    if (/^[A-Z]{2}$/.test(code || '') && regionNames) { try { const n = regionNames.of(code); if (n && n !== code) return n; } catch (_) { /* eski tarayıcı */ } }
    return unknown(name) ? 'Bilinmiyor' : name;
  }
  function renderCountries(report, users) {
    const box = $('anCountries');
    const rows = G.rows(report);
    if (!rows.length) { empty(box, 'Bu dönemde ziyaret yok.'); return; }
    const list = rows.map(x => ({ label: countryName(x.d[0], x.d[1]), value: x.m[0], text: int(x.m[0]), share: share(x.m[0], users) }));
    LpCharts.bars(box, list, { label: 'Ülkeye göre ziyaretçiler' });
    box.append(LpCharts.table(['Ülke', 'Ziyaretçi', 'Pay'], list.map(x => [x.label, x.text, x.share])));
  }
  function renderRegions(report, users) {
    const box = $('anRegions');
    const rows = G.rows(report);
    if (!rows.length) { empty(box, 'Bu dönemde ziyaret yok.'); return; }
    const list = rows.map(x => ({ label: unknown(x.d[0]) ? 'Bilinmiyor' : x.d[0], sub: unknown(x.d[1]) ? '' : x.d[1], value: x.m[0], text: int(x.m[0]), share: share(x.m[0], users) }));
    LpCharts.bars(box, list, { label: 'İl veya bölgeye göre ziyaretçiler' });
    box.append(LpCharts.table(['İl / bölge', 'Ülke', 'Ziyaretçi', 'Pay'], list.map(x => [x.label, x.sub, x.text, x.share])));
    if (G.thresholded(report)) note(box, PRIVACY);
  }
  function renderCities(report, users) {
    const box = $('anCities');
    const rows = G.rows(report);
    if (!rows.length) { empty(box, 'Bu dönemde ziyaret yok.'); return; }
    const list = rows.map(x => ({ label: unknown(x.d[0]) ? 'Bilinmiyor' : x.d[0], sub: unknown(x.d[1]) ? '' : x.d[1], value: x.m[0], text: int(x.m[0]), share: share(x.m[0], users) }));
    LpCharts.bars(box, list, { label: 'Şehre göre ziyaretçiler' });
    box.append(LpCharts.table(['Şehir', 'İl / bölge', 'Ziyaretçi', 'Pay'], list.map(x => [x.label, x.sub, x.text, x.share])));
    if (G.thresholded(report)) note(box, PRIVACY);
  }
  const DEVICES = { mobile: 'Telefon', desktop: 'Bilgisayar', tablet: 'Tablet', 'smart tv': 'Televizyon' };
  function renderDevices(report) {
    const box = $('anDevices');
    const rows = G.rows(report);
    if (!rows.length) { empty(box, 'Bu dönemde ziyaret yok.'); return; }
    const tot = rows.reduce((a, x) => a + x.m[0], 0);
    const list = rows.map(x => ({ label: DEVICES[String(x.d[0]).toLowerCase()] || (unknown(x.d[0]) ? 'Bilinmiyor' : x.d[0]), value: x.m[0], text: int(x.m[0]), share: share(x.m[0], tot) }));
    LpCharts.bars(box, list, { label: 'Cihaza göre ziyaretçiler' });
    box.append(LpCharts.table(['Cihaz', 'Ziyaretçi', 'Pay'], list.map(x => [x.label, x.text, x.share])));
  }
  const SIGNALS = 'Henüz yaş veya cinsiyet bilgisi yok. Google Analytics\'te Google sinyallerini açın (Yönetici → Veri toplama ve değiştirme → Veri toplama). Google bu bilgiyi yalnızca Google\'a giriş yapmış ziyaretçiler için ve yeterli sayıya ulaşınca gösterir.';
  function renderGender(report) {
    const box = $('anGender');
    const rows = G.rows(report);
    if (!rows.some(x => !unknown(String(x.d[0]).toLowerCase()))) { empty(box, SIGNALS); return; }
    const tot = rows.reduce((a, x) => a + x.m[0], 0);
    const name = (v) => ({ female: 'Kadın', male: 'Erkek' })[String(v).toLowerCase()] || 'Bilinmiyor';
    const list = rows.map(x => ({ label: name(x.d[0]), value: x.m[0], text: int(x.m[0]), share: share(x.m[0], tot) }))
      .sort((a, b) => (a.label === 'Bilinmiyor') - (b.label === 'Bilinmiyor') || b.value - a.value);
    LpCharts.bars(box, list, { label: 'Cinsiyete göre ziyaretçiler' });
    box.append(LpCharts.table(['Cinsiyet', 'Ziyaretçi', 'Pay'], list.map(x => [x.label, x.text, x.share])));
    if (G.thresholded(report)) note(box, PRIVACY);
  }
  const AGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  function renderAge(report) {
    const box = $('anAge');
    const rows = G.rows(report);
    const map = new Map(rows.map(x => [x.d[0], x.m[0]]));
    const knownTot = AGES.reduce((a, k) => a + (map.get(k) || 0), 0);
    if (!knownTot) { empty(box, SIGNALS); return; }
    const unk = rows.filter(x => !AGES.includes(x.d[0])).reduce((a, x) => a + x.m[0], 0);
    const list = AGES.map(k => ({ label: k.replace('-', '–') + ' yaş', short: k.replace('-', '–'), value: map.get(k) || 0, text: int(map.get(k) || 0) + ' · ' + share(map.get(k) || 0, knownTot) }));
    LpCharts.columns(box, list, { height: 170, label: 'Yaşa göre ziyaretçiler', valueLabel: 'ziyaretçi · bilinen yaşlar içindeki pay' });
    box.append(LpCharts.table(['Yaş', 'Ziyaretçi', 'Bilinen yaşlar içindeki pay'], list.map(x => [x.label, int(x.value), share(x.value, knownTot)])));
    if (unk) note(box, 'Yaşı bilinmeyen ' + int(unk) + ' ziyaretçi gösterilmiyor.');
    if (G.thresholded(report)) note(box, PRIVACY);
  }
  const PRIVATE_PATH = /^\/(?:(?:en|fr|de|ru|ar)\/)?(?:admin|api|hesabim|favorilerim|account|sifre-belirle|sifre-sifirla|verify|unsubscribe)(?:[/.]|$)/i;
  function pageLabel(path) {
    if (path === '/') return 'Ana sayfa (/)';
    const m = /^\/(?:(en|fr|de|ru|ar)\/)?ilan\/([a-z0-9-]+)\/?$/i.exec(path);
    if (m) return 'İlan: ' + m[2].replace(/-/g, ' ') + (m[1] ? ' (' + m[1].toUpperCase() + ')' : '');
    return path;
  }
  function renderPages(report) {
    const box = $('anPages');
    box.textContent = '';
    const rows = G.rows(report);
    if (!rows.length) { empty(box, 'Bu dönemde sayfa görüntüleme yok.'); return; }
    const t = h('table', { class: 'an-tbl' });
    t.append(h('thead', null, h('tr', null, h('th', { scope: 'col', text: 'Sayfa' }), h('th', { scope: 'col', class: 'lc-num', text: 'Görüntüleme' }), h('th', { scope: 'col', class: 'lc-num', text: 'Ziyaretçi' }))));
    const tb = h('tbody');
    rows.forEach((x) => {
      const path = String(x.d[0] || '');
      let cell;
      if (/^\/[A-Za-z0-9/_.~%-]{0,300}$/.test(path) && !path.includes('..') && !path.startsWith('//') && !PRIVATE_PATH.test(path)) {   // '//x' başka siteye gider
        cell = h('a', { href: path, target: '_blank', rel: 'noopener', text: pageLabel(path), title: path });
      } else cell = h('span', { text: path || 'Bilinmiyor' });
      tb.append(h('tr', null, h('td', null, cell), h('td', { class: 'lc-num', text: int(x.m[0]) }), h('td', { class: 'lc-num', text: int(x.m[1]) })));
    });
    t.append(tb);
    box.append(h('div', { class: 'table-container' }, t));
  }
  function trackingBanner() {
    const c = S.cfg || {};
    const old = $('anTrackBanner');
    if (old) old.remove();
    if (c.tracking_on && c.measurement_id) return;
    const b = h('div', { class: 'alert alert-warning an-msg', id: 'anTrackBanner', role: 'status' },
      h('span', { text: 'Site takibi kapalı: site henüz Google Analytics\'e ziyaret göndermiyor. ' }),
      h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Takibi ayarla', onclick: () => { $('anSettings').open = true; $('anMid').focus(); $('anTagT').scrollIntoView({ behavior: 'smooth', block: 'center' }); } }));
    $('anReports').insertBefore(b, $('anReports').firstElementChild.nextSibling);
  }

  // ------------------------------------------------------------------ şu an sitede
  function startLive() {
    stopLive();
    const tick = async () => {
      if (document.hidden || $('anReports').hidden) return;
      try {
        const n = await G.live((S.cfg || {}).property_id);
        if (n === null) { $('anLive').hidden = true; return; }
        $('anLiveT').textContent = n === 0 ? 'Şu an sitede kimse yok' : 'Şu an sitede ' + int(n) + ' kişi';
        $('anLive').hidden = false;
      } catch (_) { $('anLive').hidden = true; }
    };
    tick();
    S.liveTimer = setInterval(tick, 60000);
  }
  function stopLive() { if (S.liveTimer) clearInterval(S.liveTimer); S.liveTimer = 0; }

  // ------------------------------------------------------------------ ayarlar kartı
  function origins() {
    const out = [location.origin];
    if (!out.includes(SITE)) out.push(SITE);
    return out.filter(o => /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
  }
  function renderSettings() {
    const c = S.cfg || {};
    const ul = $('anOrigins');
    ul.textContent = '';
    origins().forEach((o) => {
      const copy = h('button', { type: 'button', class: 'btn btn-outline btn-sm', 'aria-label': o + ' adresini kopyala', text: 'Kopyala' });
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(o); toast('Kopyalandı: ' + o, 'success'); } catch (_) { toast('Adresi seçip elle kopyalayın.', 'info'); } });
      ul.append(h('li', null, h('code', { text: o }), copy));
    });
    $('anClientId').value = c.client_id || '';
    say($('anClientState'), c.client_id ? 'Eklendi' : 'Eklenmedi').classList.toggle('ok', !!c.client_id);
    $('anPropId').value = c.property_id || '';
    say($('anPropState'), c.property_id ? (c.property_name || 'Mülk ' + c.property_id) : 'Seçilmedi').classList.toggle('ok', !!c.property_id);
    $('anMid').value = c.measurement_id || '';
    $('anTrackOn').checked = !!c.tracking_on;
    say($('anTagState'), c.tracking_on && c.measurement_id ? 'Açık · ' + c.measurement_id : 'Kapalı').classList.toggle('ok', !!(c.tracking_on && c.measurement_id));
    let me = false; try { me = localStorage.getItem('iu-ga-off') === '1'; } catch (_) { me = false; }
    $('anNotMe').checked = me;
  }

  // ------------------------------------------------------------------ başlat
  function syncPeriod() {
    document.querySelectorAll('#anPeriods button').forEach(b => { const on = b.dataset.p === S.period; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    $('anCustom').hidden = S.period !== 'custom';
  }
  function bind() {
    $('anSignIn').addEventListener('click', () => {
      const c = S.cfg || {};
      if (G.token() && c.client_id && !c.property_id) { pickProperty(); return; }
      signIn(false);
    });
    $('anOtherAcct').addEventListener('click', () => signIn(true));
    $('anSignOut').addEventListener('click', () => { G.signOut(); S.seq++; toast('Bu sekmede Google oturumu kapatıldı.', 'success'); view(); });
    $('anRefresh').addEventListener('click', () => loadReports());
    $('anPeriods').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-p]'); if (!b) return;
      S.period = b.dataset.p;
      syncPeriod();
      if (S.period === 'custom') {
        if (!S.from || !S.to) { const t = todayIst(); S.to = addDays(t, -1); S.from = addDays(t, -28); }
        $('anFrom').value = S.from; $('anTo').value = S.to; $('anFrom').max = todayIst(); $('anTo').max = todayIst();
        $('anFrom').focus();
      }
      loadReports();
    });
    $('anApply').addEventListener('click', () => {
      const a = $('anFrom').value, b = $('anTo').value;
      if (!YMD.test(a) || !YMD.test(b)) { toast('İki tarihi de seçin.', 'warning'); return; }
      const t = todayIst();
      let x = a <= b ? a : b, y = a <= b ? b : a;
      if (y > t) y = t; if (x > t) x = t;
      if (daysIn(x, y) > 730) { x = addDays(y, -729); toast('En fazla 2 yıl gösterilir; başlangıç tarihi ayarlandı.', 'info'); }
      S.from = x; S.to = y;
      loadReports();
    });
    $('anClientSave').addEventListener('click', async () => {
      const v = String($('anClientId').value || '').trim().toLowerCase();
      if (v && !G.CLIENT_RE.test(v)) { toast('İstemci kimliği .apps.googleusercontent.com ile biter. Google Cloud → Google Auth Platform → Clients bölümünden kopyalayın.', 'error'); $('anClientId').focus(); return; }
      if ((S.cfg || {}).client_id !== v) G.signOut();
      if (await saveCfg({ client_id: v || null }, v ? 'Google giriş istemcisi kaydedildi.' : 'Google giriş istemcisi kaldırıldı.')) if (v) G.loadGis().catch(() => {});
    });
    $('anPickProp').addEventListener('click', () => (G.token() ? pickProperty() : showErr('Önce Google ile giriş yapın (yukarıdaki düğme), sonra mülkü seçin.')));
    $('anPropClose').addEventListener('click', () => $('anPropDialog').close());
    $('anPropSave').addEventListener('click', () => {
      const v = String($('anPropId').value || '').replace(/^properties\//i, '').trim();
      if (v && !G.PROP_RE.test(v)) { toast('Mülk kimliği yalnızca rakamdır, örneğin 412345678.', 'error'); $('anPropId').focus(); return; }
      saveCfg({ property_id: v || null, property_name: v && v === (S.cfg || {}).property_id ? (S.cfg || {}).property_name : null }, v ? 'Mülk kaydedildi.' : 'Mülk kaldırıldı.');
    });
    $('anMidFind').addEventListener('click', () => suggestMeasurementId(false));
    $('anTagSave').addEventListener('click', () => {
      const v = String($('anMid').value || '').trim().toUpperCase();
      if (v && !MID_RE.test(v)) { toast('Ölçüm kimliği G-XXXXXXXXXX biçimindedir.', 'error'); $('anMid').focus(); return; }
      const on = $('anTrackOn').checked;
      if (on && !v) { toast('Önce ölçüm kimliğini (G-…) girin.', 'error'); $('anMid').focus(); return; }
      saveCfg({ measurement_id: v || null, tracking_on: on }, on ? 'Takip açık: site, izin veren ziyaretçileri ' + v + ' mülküne sayıyor.' : 'Takip kapalı: site Google Analytics\'e hiçbir şey göndermiyor.');
    });
    $('anNotMe').addEventListener('change', () => {
      try {
        if ($('anNotMe').checked) localStorage.setItem('iu-ga-off', '1'); else localStorage.removeItem('iu-ga-off');
        toast($('anNotMe').checked ? 'Bu tarayıcıdaki ziyaretleriniz artık sayılmıyor.' : 'Bu tarayıcıdaki ziyaretleriniz yeniden sayılıyor.', 'success');
      } catch (_) { toast('Bu tarayıcı bu tercihi kaydetmeye izin vermiyor.', 'error'); }
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('anReports').hidden && !G.token()) view(); });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('analytics'))) return;
    bind();
    syncPeriod();
    try { await loadCfg(); }
    catch (e) {
      const missing = e && (/^(PGRST20[25]|42P01)$/.test(e.code || '') || /schema cache|does not exist/i.test(e.message || ''));
      showErr(missing ? 'Analitik henüz kurulmadı. Supabase\'de supabase-analitik-2026-10-16.sql dosyasını bir kez çalıştırın (SQL Editor → New query → yapıştır → RUN), sonra sayfayı yenileyin.'
        : errText(e, 'Analitik ayarları yüklenemedi. Sayfayı yenileyin.'));
      return;
    }
    renderSettings();
    if ((S.cfg || {}).client_id) G.loadGis().catch((e) => showErr(errText(e, 'Google girişi yüklenemedi.')));
    view();
  });
})();
