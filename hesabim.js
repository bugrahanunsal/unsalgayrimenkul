/**
 * Hesabım — müşteri sayfası (giriş yapan / bültene abone olan müşteriler)
 *  Özet · Favorilerim · Arama Alarmlarım · Mesajlarım · Bülten · Profilim · Güvenlik
 * Güvenlik: yalnızca herkese açık (publishable) anahtar; tüm veriler RLS ve güvenli fonksiyonlarla
 * (iu_hesap_*) yalnızca kullanıcının KENDİ kayıtlarıyla sınırlı. Kullanıcı verisi her zaman textContent ile yazılır;
 * satır içi onclick yoktur. Görsel adresleri yalnızca https.
 */
(function () {
  'use strict';
  const SB_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
  const SB_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4';
  const ILCELER = ['Merkez', 'Çınarcık', 'Termal', 'Altınova', 'Armutlu', 'Çiftlikköy', 'Akköy'];
  const KAT = [['daire', 'Daire'], ['villa', 'Villa / Ev'], ['arsa', 'Arsa'], ['isyeri', 'İşyeri']];
  const KAT_NAME = Object.fromEntries(KAT);
  const PROP_KAT = { daire: 'Daire', villa: 'Villa', mustakil_ev: 'Müstakil Ev', yazlik: 'Yazlık', arsa: 'Arsa', tarla: 'Tarla', isyeri: 'İşyeri', bina: 'Bina' };
  const TIP = { satilik: 'Satılık', kiralik: 'Kiralık', her_ikisi: 'Satılık / Kiralık' };
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const TABS = ['ozet', 'favoriler', 'alarmlar', 'talepler', 'bulten', 'profil', 'guvenlik'];
  const $ = (id) => document.getElementById(id);
  let sb = null, user = null, profile = null, bulten = null;
  let favs = null, alarms = null, talepler = null;

  // ---------------- yardımcılar ----------------
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; }
  function toast(msg, type) {
    let box = document.querySelector('.toast-stack');
    if (!box) { box = el('div', 'toast-stack'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = el('div', 'toast toast-' + (type === 'error' ? 'error' : 'success'), msg);
    t.setAttribute('role', 'status');
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3200);
  }
  function say(id, text, type) {
    const b = $(id); if (!b) return; b.textContent = '';
    if (text) b.appendChild(el('div', 'alert alert-' + (type || 'info'), text));
  }
  function fmtPrice(v, cur) {
    const n = Number(v);
    if (!n) return 'Fiyat için arayın';
    const sym = { TL: '₺', TRY: '₺', USD: '$', EUR: '€', GBP: '£' }[String(cur || 'TL').toUpperCase()] || '₺';
    return new Intl.NumberFormat('tr-TR').format(n) + ' ' + sym;
  }
  const fmtDate = (d) => d ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d)) : '';
  const listingUrl = (p) => p && p.slug && SLUG_RE.test(p.slug) ? '/ilan/' + p.slug : '/ilan?id=' + encodeURIComponent(String(p && p.id || ''));
  function mainImg(p) {
    const imgs = ((p && p.property_images) || []).filter(i => i && typeof i.url === 'string' && /^https:\/\//i.test(i.url));
    const m = imgs.find(i => i.ana_foto) || imgs.sort((a, b) => (a.sira || 0) - (b.sira || 0))[0];
    return m ? m.url : '';
  }
  const num = (v) => { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d ? Math.min(1e12, Number(d)) : null; };
  const fmtNumInput = (n) => n ? new Intl.NumberFormat('tr-TR').format(n) : '';
  function chip(box, name, value, label, checked) {
    const lb = el('label', 'chip');
    const i = el('input'); i.type = 'checkbox'; i.name = name; i.value = value; i.checked = !!checked;
    lb.append(i, el('span', null, label)); box.appendChild(lb);
  }
  const checkedVals = (name) => Array.from(document.querySelectorAll('input[name="' + name + '"]:checked')).map(i => i.value);
  function emailConfirmed() { return !!(user && (user.email_confirmed_at || user.confirmed_at)); }

  function propCard(p, opts) {
    const card = el('div', 'prop-card');
    const img = typeof p.img === 'string' ? p.img : mainImg(p);
    const url = p.url || listingUrl(p);
    if (img) {
      const a = el('a'); a.href = url; a.tabIndex = -1; a.setAttribute('aria-hidden', 'true');
      const im = el('img', 'prop-img'); im.src = img; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      a.appendChild(im); card.appendChild(a);
    } else card.appendChild(el('div', 'prop-img ph', 'Fotoğraf yok'));
    const mid = el('div');
    const t = el('a', 'prop-t', p.baslik || p.baslik_tr || 'İlan'); t.href = url; mid.appendChild(t);
    const meta = [p.konum || [p.mahalle, p.ilce].filter(Boolean).join(', '), [TIP[p.tip], PROP_KAT[p.kategori]].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    if (meta) mid.appendChild(el('div', 'prop-m', meta));
    mid.appendChild(el('div', 'prop-p', fmtPrice(p.fiyat, p.para_birimi)));
    card.appendChild(mid);
    const act = el('div', 'prop-act');
    const open = el('a', 'btn btn-sm', 'İlanı aç'); open.href = url; act.appendChild(open);
    if (opts && opts.remove) {
      const rm = el('button', 'btn btn-outline btn-sm', 'Kaldır'); rm.type = 'button';
      rm.dataset.act = 'fav-remove'; rm.dataset.id = String(p.id); act.appendChild(rm);
    }
    card.appendChild(act);
    return card;
  }
  function emptyBox(box, title, text, link) {
    box.textContent = '';
    const d = el('div', 'muted-empty'); d.appendChild(el('b', null, title)); d.appendChild(el('span', null, text));
    if (link) { const p = el('p'); p.style.marginTop = '14px'; const a = el('a', 'btn btn-sm', link[0]); a.href = link[1]; p.appendChild(a); d.appendChild(p); }
    box.appendChild(d);
  }
  function loading(box) { box.textContent = ''; const l = el('div', 'loader'); l.appendChild(el('div', 'spinner')); box.appendChild(l); }

  // ---------------- açılış ----------------
  async function init() {
    if (!window.supabase || !window.supabase.createClient) { $('pageLoading').hidden = true; $('loginRequired').hidden = false; return; }
    sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, storageKey: 'ismailunsal-customer-session' } });
    let u = null;
    try { const { data } = await sb.auth.getUser(); u = data && data.user; } catch (_) {}
    $('pageLoading').hidden = true;
    if (!u) { $('heroTitle').textContent = 'Hesabım'; $('loginRequired').hidden = false; return; }
    user = u;

    try {
      const { data: adm } = await sb.from('admin_users').select('role').eq('id', u.id).maybeSingle();
      if (adm) { $('adminRedirect').hidden = false; setTimeout(() => location.replace('/admin/index.html'), 900); return; }
    } catch (_) {}

    const meta = u.user_metadata || {};
    try {
      let { data: prof } = await sb.from('customer_profiles').select('*').eq('id', u.id).maybeSingle();
      if (!prof) {
        const ins = await sb.from('customer_profiles').insert({ id: u.id, email: u.email, full_name: String(meta.full_name || '').slice(0, 100), language: ['tr', 'en', 'de', 'fr', 'ru'].includes(meta.language) ? meta.language : 'tr' }).select().maybeSingle();
        prof = ins.data;
      }
      profile = prof || { email: u.email, full_name: meta.full_name || '' };
    } catch (_) { profile = { email: u.email, full_name: meta.full_name || '' }; }

    renderProfile();
    setupForms();
    $('accountContent').hidden = false;
    const h = decodeURIComponent(location.hash.slice(1));
    openTab(TABS.includes(h) ? h : 'ozet', true);
    loadSummary();
  }

  function renderProfile() {
    const name = String(profile.full_name || '').trim() || user.email.split('@')[0];
    $('userAvatar').textContent = name.charAt(0).toLocaleUpperCase('tr-TR');
    $('userName').textContent = name;
    $('userEmail').textContent = user.email;
    $('verifyBadge').textContent = emailConfirmed() ? 'DOĞRULANMIŞ HESAP' : 'E-POSTA DOĞRULANMADI';
    $('heroTitle').textContent = 'Merhaba, ' + name.split(' ')[0] + '!';
    $('pName').value = profile.full_name || '';
    $('pPhone').value = profile.phone || '';
    $('pEmail').value = user.email;
    const hint = $('pEmailHint'); hint.textContent = '';
    if (emailConfirmed()) { hint.className = 'hint ok'; hint.textContent = 'E-posta adresiniz doğrulandı.'; }
    else {
      hint.className = 'hint warn'; hint.textContent = 'E-posta adresiniz henüz doğrulanmadı. ';
      const b = el('button', 'btn btn-outline btn-sm', 'Doğrulama e-postasını tekrar gönder'); b.type = 'button'; b.id = 'resendBtn';
      hint.appendChild(b);
    }
    const vn = $('verifyNote'); vn.textContent = '';
    if (!emailConfirmed()) vn.appendChild(el('div', 'alert alert-warning', 'E-posta adresinizi doğrulayın: size gönderdiğimiz bağlantıya tıklayın. Doğrulamadan bülten ve arama alarmı e-postaları gönderilemez.'));
  }

  // ---------------- sekmeler ----------------
  function openTab(tab, initial) {
    if (!TABS.includes(tab)) tab = 'ozet';
    document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
    document.querySelectorAll('#accNav .nav-item[data-tab]').forEach(n => {
      const on = n.dataset.tab === tab; n.classList.toggle('active', on);
      if (on) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
    });
    try { history.replaceState(null, '', tab === 'ozet' ? location.pathname : '#' + tab); } catch (_) {}
    if (tab === 'favoriler') loadFavorites();
    if (tab === 'alarmlar') renderAlarms();
    if (tab === 'talepler') renderTalepler();
    if (tab === 'bulten') renderBulten();
    if (tab === 'ozet') renderRecent();
    if (!initial && window.matchMedia('(max-width: 900px)').matches) {
      const c = document.querySelector('.content'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ---------------- özet ----------------
  async function loadSummary() {
    const set = (id, v) => { const n = $(id); if (n) n.textContent = v; };
    const nav = (id, v) => { const n = $(id); if (n) n.textContent = v ? String(v) : ''; };
    const jobs = [
      sb.from('favorites').select('property_id', { count: 'exact', head: true }).eq('customer_id', user.id)
        .then(({ count, error }) => { if (!error) { set('ovFav', count || 0); nav('navFav', count); } }),
      loadAlarms().then(() => { if (alarms) { const n = alarms.filter(a => a.bildirim_aktif !== false).length; set('ovAlarm', n); nav('navAlarm', alarms.length); } }),
      loadTalepler().then(() => { if (talepler) { set('ovTalep', talepler.length); nav('navTalep', talepler.length); } }),
      loadBulten().then(() => { set('ovBulten', !bulten ? '–' : bulten.durum === 'aktif' ? 'Açık' : bulten.durum === 'bekliyor' ? 'Bekliyor' : 'Kapalı'); })
    ];
    await Promise.allSettled(jobs);
    renderRecent();
  }

  function renderRecent() {
    const box = $('recentList');
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem('iu_son_bakilan') || '[]'); } catch (_) { arr = []; }
    arr = (Array.isArray(arr) ? arr : []).filter(x => x && /^[0-9a-zA-Z-]{1,40}$/.test(String(x.id || '')) && typeof x.t === 'string').slice(0, 6);
    if (!arr.length) { emptyBox(box, 'Henüz ilan incelemediniz', 'İlanlara göz attıkça burada listelenecek.', ['İlanlara göz atın', '/']); return; }
    box.textContent = '';
    arr.forEach(x => box.appendChild(propCard({
      id: x.id, slug: SLUG_RE.test(x.slug || '') ? x.slug : '', baslik: x.t.slice(0, 140), fiyat: x.f, para_birimi: x.c,
      konum: String(x.l || '').slice(0, 80), img: typeof x.i === 'string' && /^https:\/\//i.test(x.i) ? x.i : ''
    })));
  }

  // ---------------- favoriler ----------------
  async function loadFavorites() {
    const box = $('favoritesList'); loading(box);
    const { data, error } = await sb.from('favorites')
      .select('property_id, created_at, properties(id, slug, baslik_tr, fiyat, para_birimi, ilce, mahalle, kategori, tip, durum, property_images(url, ana_foto, sira))')
      .eq('customer_id', user.id).order('created_at', { ascending: false });
    if (error) { box.textContent = ''; box.appendChild(el('div', 'alert alert-error', 'Favoriler yüklenemedi. Lütfen sayfayı yenileyin.')); return; }
    favs = data || [];
    $('ovFav').textContent = favs.length; $('navFav').textContent = favs.length ? String(favs.length) : '';
    if (!favs.length) { emptyBox(box, 'Henüz favori ilanınız yok', 'İlanlardaki kalp simgesine dokunarak favorilerinize ekleyebilirsiniz.', ['İlanları incele', '/']); return; }
    box.textContent = '';
    favs.forEach(f => {
      const p = f.properties;
      if (!p || p.durum !== 'aktif') {
        const c = el('div', 'prop-card');
        c.appendChild(el('div', 'prop-img ph', 'Yayında değil'));
        const mid = el('div'); mid.appendChild(el('div', 'prop-t', p && p.baslik_tr ? p.baslik_tr : 'Bu ilan artık yayında değil'));
        mid.appendChild(el('div', 'prop-m', 'İlan satılmış veya yayından kaldırılmış olabilir.')); c.appendChild(mid);
        const act = el('div', 'prop-act'); const rm = el('button', 'btn btn-outline btn-sm', 'Kaldır'); rm.type = 'button';
        rm.dataset.act = 'fav-remove'; rm.dataset.id = String(f.property_id); act.appendChild(rm); c.appendChild(act);
        box.appendChild(c); return;
      }
      box.appendChild(propCard(p, { remove: true }));
    });
  }
  async function removeFavorite(id) {
    const { error } = await sb.from('favorites').delete().eq('customer_id', user.id).eq('property_id', id);
    if (error) { toast('Kaldırılamadı: ' + error.message, 'error'); return; }
    toast('Favorilerden kaldırıldı');
    loadFavorites();
  }

  // ---------------- arama alarmları ----------------
  async function loadAlarms() {
    const { data, error } = await sb.from('saved_searches').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });
    alarms = error ? null : (data || []);
    return alarms;
  }
  function alarmSummary(a) {
    const parts = [];
    parts.push(TIP[a.islem_tipi] || 'Satılık / Kiralık');
    parts.push((a.kategoriler || []).length ? a.kategoriler.map(k => KAT_NAME[k] || k).join(', ') : 'Tüm emlak türleri');
    parts.push((a.bolgeler || []).length ? a.bolgeler.join(', ') : 'Tüm Yalova');
    if (a.min_fiyat || a.max_fiyat) parts.push((a.min_fiyat ? fmtPrice(a.min_fiyat) : '0') + ' – ' + (a.max_fiyat ? fmtPrice(a.max_fiyat) : 'sınırsız'));
    if (a.min_oda_sayisi) parts.push(a.min_oda_sayisi + '+ oda');
    return parts.join(' · ');
  }
  function landing(a) {
    const k = (a.kategoriler || []).length === 1 ? a.kategoriler[0] : '';
    const t = a.islem_tipi;
    const map = { 'satilik:daire': '/yalova-satilik-daire', 'satilik:arsa': '/yalova-satilik-arsa', 'satilik:villa': '/yalova-satilik-ev', 'kiralik:daire': '/yalova-kiralik-daire', 'kiralik:villa': '/yalova-kiralik-villa' };
    return map[t + ':' + k] || '/';
  }
  function renderAlarms() {
    const box = $('alarmList');
    if (alarms === null) { loading(box); loadAlarms().then(() => { if (alarms === null) { box.textContent = ''; box.appendChild(el('div', 'alert alert-error', 'Alarmlar yüklenemedi. Lütfen sayfayı yenileyin.')); } else renderAlarms(); }); return; }
    box.textContent = '';
    if (!alarms.length) { emptyBox(box, 'Henüz arama alarmınız yok', '"Yeni alarm" ile aradığınız özellikleri kaydedin; uygun ilan çıktığında size e-posta gönderelim.'); return; }
    alarms.forEach(a => {
      const on = a.bildirim_aktif !== false;
      const card = el('div', 'alarm' + (on ? '' : ' off'));
      const info = el('div');
      info.appendChild(el('div', 'alarm-t', a.arama_adi));
      info.appendChild(el('div', 'alarm-d', alarmSummary(a)));
      info.appendChild(el('div', 'alarm-s', a.son_bildirim_at ? 'Son bildirim: ' + fmtDate(a.son_bildirim_at) : 'Henüz bildirim gönderilmedi · Kuruldu: ' + fmtDate(a.created_at)));
      card.appendChild(info);
      const act = el('div', 'alarm-a');
      const sw = el('label', 'switch-row');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = on; cb.setAttribute('role', 'switch'); cb.dataset.act = 'alarm-toggle'; cb.dataset.id = a.id;
      cb.setAttribute('aria-label', a.arama_adi + ' bildirimleri');
      sw.append(cb, el('span', 'switch'), el('span', null, on ? 'Bildirim açık' : 'Bildirim kapalı'));
      act.appendChild(sw);
      const see = el('a', 'btn btn-outline btn-sm', 'İlanları gör'); see.href = landing(a); act.appendChild(see);
      const del = el('button', 'btn btn-outline btn-sm', 'Sil'); del.type = 'button'; del.dataset.act = 'alarm-del'; del.dataset.id = a.id; act.appendChild(del);
      card.appendChild(act);
      box.appendChild(card);
    });
  }
  function autoName() {
    const islem = (document.querySelector('input[name="islem"]:checked') || {}).value || 'satilik';
    const kats = checkedVals('akat'), bol = checkedVals('abolge');
    const kp = kats.length === 1 ? KAT_NAME[kats[0]].split(' /')[0] : kats.length ? kats.length + ' tür' : 'Emlak';
    const bp = bol.length === 1 ? bol[0] : bol.length ? bol.length + ' bölge' : 'Yalova';
    return ((islem === 'her_ikisi' ? '' : TIP[islem] + ' ') + kp + ' · ' + bp).slice(0, 60);
  }
  async function saveAlarm(e) {
    e.preventDefault();
    const islem = (document.querySelector('input[name="islem"]:checked') || {}).value || 'satilik';
    const min = num($('aMin').value), max = num($('aMax').value);
    if (min && max && min > max) { say('alarmMsg', 'En düşük fiyat, en yüksek fiyattan büyük olamaz.', 'error'); return; }
    const name = String($('aName').value || '').replace(/[\u0000-\u001F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || autoName();
    const row = { customer_id: user.id, arama_adi: name, kategoriler: checkedVals('akat'), bolgeler: checkedVals('abolge').filter(b => ILCELER.includes(b)),
      islem_tipi: islem, min_fiyat: min, max_fiyat: max, min_oda_sayisi: $('aOda').value ? Number($('aOda').value) : null, bildirim_aktif: true };
    const { error } = await sb.from('saved_searches').insert(row);
    if (error) { say('alarmMsg', /En fazla 10/.test(error.message) ? 'En fazla 10 arama alarmı kurabilirsiniz. Önce eski bir alarmı silin.' : 'Kaydedilemedi: ' + error.message, 'error'); return; }
    say('alarmMsg', '');
    $('alarmForm').reset(); $('alarmForm').hidden = true; $('newAlarmBtn').hidden = false;
    toast('Arama alarmı kuruldu');
    await loadAlarms(); renderAlarms(); updateAlarmCounts();
  }
  function updateAlarmCounts() {
    if (!alarms) return;
    $('ovAlarm').textContent = alarms.filter(a => a.bildirim_aktif !== false).length;
    $('navAlarm').textContent = alarms.length ? String(alarms.length) : '';
  }
  async function toggleAlarm(id, on) {
    const { error } = await sb.from('saved_searches').update({ bildirim_aktif: on }).eq('id', id).eq('customer_id', user.id);
    if (error) { toast('Değiştirilemedi: ' + error.message, 'error'); }
    else toast(on ? 'Bildirim açıldı' : 'Bildirim kapatıldı');
    await loadAlarms(); renderAlarms(); updateAlarmCounts();
  }
  async function deleteAlarm(id) {
    if (!confirm('Bu arama alarmı silinsin mi?')) return;
    const { error } = await sb.from('saved_searches').delete().eq('id', id).eq('customer_id', user.id);
    if (error) { toast('Silinemedi: ' + error.message, 'error'); return; }
    toast('Alarm silindi');
    await loadAlarms(); renderAlarms(); updateAlarmCounts();
  }

  // ---------------- mesajlarım ----------------
  async function loadTalepler() {
    const { data, error } = await sb.rpc('iu_hesap_taleplerim');
    talepler = error ? null : (Array.isArray(data) ? data : []);
    return talepler;
  }
  function renderTalepler() {
    const box = $('talepList');
    if (talepler === null) { loading(box); loadTalepler().then(() => { if (talepler === null) { box.textContent = ''; box.appendChild(el('div', 'alert alert-info', 'Mesajlarınız şu anda gösterilemiyor.')); } else renderTalepler(); }); return; }
    box.textContent = '';
    if (!emailConfirmed()) { box.appendChild(el('div', 'alert alert-warning', 'Mesajlarınızı görebilmek için önce e-posta adresinizi doğrulayın.')); return; }
    if (!talepler.length) { emptyBox(box, 'Henüz mesajınız yok', 'İlan sayfalarındaki "Bilgi al" formundan veya İletişim sayfasından bize yazdığınızda burada görünür.', ['İletişim', '/iletisim']); return; }
    const ST = { alindi: 'Alındı', donus: 'Size dönüş yapıldı', tamam: 'Tamamlandı' };
    talepler.forEach(t => {
      const c = el('div', 'talep');
      const h = el('div', 'talep-h');
      const left = el('div');
      if (t.ilan_baslik) { const a = el('a', 'talep-l', t.ilan_baslik); a.href = listingUrl({ slug: t.ilan_slug, id: t.ilan_id }); left.appendChild(a); }
      else left.appendChild(el('span', 'talep-l', 'Genel mesaj'));
      left.appendChild(el('div', 'talep-d', fmtDate(t.tarih)));
      h.appendChild(left);
      h.appendChild(el('span', 'pill ' + (ST[t.durum] ? t.durum : 'alindi'), ST[t.durum] || 'Alındı'));
      c.appendChild(h);
      const msg = String(t.mesaj || '').split('\n').filter(l => !/^Kaynak:/.test(l) && !/^İlan: https?:\/\//.test(l)).join('\n').trim();
      if (msg) c.appendChild(el('div', 'talep-m', msg));
      box.appendChild(c);
    });
  }

  // ---------------- bülten ----------------
  async function loadBulten() {
    const { data, error } = await sb.rpc('iu_hesap_bulten');
    bulten = error ? null : data;
    return bulten;
  }
  function renderBulten() {
    const st = $('bultenState'); st.textContent = '';
    const form = $('bultenForm');
    if (bulten === null) {
      st.appendChild(el('div', 'alert alert-info', 'Bülten bilgisi yükleniyor…'));
      loadBulten().then(() => { if (bulten === null) { st.textContent = ''; st.appendChild(el('div', 'alert alert-error', 'Bülten ayarları şu anda yüklenemedi. Lütfen daha sonra tekrar deneyin.')); form.hidden = true; } else renderBulten(); });
      return;
    }
    form.hidden = false;
    const b = bulten || {};
    let cls = 'off', text = 'Bülten aboneliğiniz kapalı.';
    if (!b.dogrulandi) { cls = 'wait'; text = 'Bülteni açabilmek için önce e-posta adresinizi doğrulayın (size gönderdiğimiz bağlantıya tıklayın).'; }
    else if (b.durum === 'aktif') { cls = 'on'; text = 'Bülten aboneliğiniz açık. Yeni ilan duyuruları ve fırsatlar ' + user.email + ' adresine gelir.'; }
    else if (b.durum === 'bekliyor') { cls = 'wait'; text = 'Aboneliğiniz e-posta onayı bekliyor. Aşağıdan kaydederseniz hesabınız doğrulanmış olduğu için hemen açılır.'; }
    st.appendChild(el('div', 'state ' + cls, text));
    const pr = profile || {};
    const kats = b.durum ? (b.kategoriler || []) : (pr.ilgi_kategoriler || []);
    const bols = b.durum ? (b.bolgeler || []) : (pr.ilgi_bolgeler || []);
    const kb = $('bKat'); kb.textContent = ''; KAT.forEach(([v, l]) => chip(kb, 'bkat', v, l, kats.includes(v)));
    const bb = $('bBolge'); bb.textContent = ''; ILCELER.forEach(v => chip(bb, 'bbolge', v, v, bols.includes(v)));
    $('bIslem').value = (b.durum ? b.islem_tipi : pr.islem_tipi) || 'her_ikisi';
    $('bDil').value = (b.durum ? b.dil : pr.language) || 'tr';
    $('bMin').value = fmtNumInput(b.durum ? b.min_fiyat : pr.min_fiyat);
    $('bMax').value = fmtNumInput(b.durum ? b.max_fiyat : pr.max_fiyat);
    $('bAbone').checked = b.durum === 'aktif';
    $('bAbone').disabled = !b.dogrulandi;
    $('bultenSave').disabled = !b.dogrulandi;
    $('bultenPrefs').disabled = !b.dogrulandi;
  }
  async function saveBulten(e) {
    e.preventDefault();
    const min = num($('bMin').value), max = num($('bMax').value);
    if (min && max && min > max) { say('bultenMsg', 'En düşük fiyat, en yüksek fiyattan büyük olamaz.', 'error'); return; }
    const btn = $('bultenSave'); btn.disabled = true;
    const { data, error } = await sb.rpc('iu_hesap_bulten_kaydet', {
      p_abone: $('bAbone').checked, p_kategoriler: checkedVals('bkat'), p_bolgeler: checkedVals('bbolge'),
      p_dil: $('bDil').value, p_islem: $('bIslem').value, p_min: min, p_max: max
    });
    btn.disabled = false;
    if (error) { say('bultenMsg', error.message || 'Kaydedilemedi.', 'error'); return; }
    bulten = data; say('bultenMsg', '');
    renderBulten();
    $('ovBulten').textContent = bulten && bulten.durum === 'aktif' ? 'Açık' : 'Kapalı';
    toast(bulten && bulten.durum === 'aktif' ? 'Bülten aboneliğiniz açık' : 'Bülten aboneliğiniz kapatıldı');
  }

  // ---------------- profil ----------------
  async function saveProfile(e) {
    e.preventDefault();
    const name = String($('pName').value || '').replace(/[\u0000-\u001F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    const phone = String($('pPhone').value || '').trim().slice(0, 20);
    if (name.length < 2) { say('profileMsg', 'Lütfen adınızı ve soyadınızı yazın.', 'error'); return; }
    if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) { say('profileMsg', 'Telefon numarası geçersiz görünüyor.', 'error'); return; }
    const { error } = await sb.from('customer_profiles').update({ full_name: name, phone: phone || null }).eq('id', user.id);
    if (error) { say('profileMsg', 'Kaydedilemedi: ' + error.message, 'error'); return; }
    profile.full_name = name; profile.phone = phone || null;
    say('profileMsg', 'Profiliniz güncellendi.', 'success');
    renderProfile();
  }
  async function resendVerify() {
    const b = $('resendBtn'); if (b) b.disabled = true;
    try {
      const { error } = await sb.auth.resend({ type: 'signup', email: user.email, options: { emailRedirectTo: location.origin + '/hesabim' } });
      toast(error ? 'Gönderilemedi: ' + error.message : 'Doğrulama e-postası gönderildi', error ? 'error' : 'success');
    } catch (_) { toast('Gönderilemedi', 'error'); }
  }

  // ---------------- güvenlik ----------------
  function pwScore(p) {
    let s = 0;
    if (p.length >= 8) s++; if (p.length >= 12) s++;
    if (/[a-zçğıöşü]/.test(p) && /[A-ZÇĞİÖŞÜ]/.test(p)) s++;
    if (/\d/.test(p)) s++; if (/[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(p)) s++;
    return s;
  }
  function updateMeter() {
    const p = $('pw1').value, s = pwScore(p);
    const bar = $('pwBar');
    bar.style.width = (p ? Math.max(12, s * 20) : 0) + '%';
    bar.style.background = s >= 4 ? '#16A34A' : s >= 3 ? '#F59E0B' : '#DC2626';
    $('pwHint').textContent = !p ? '' : s >= 4 ? 'Güçlü şifre' : s >= 3 ? 'Orta — bir sembol veya daha uzun bir şifre ekleyin' : 'Zayıf — en az 8 karakter, büyük-küçük harf ve rakam kullanın';
  }
  async function savePassword(e) {
    e.preventDefault();
    const a = $('pw1').value, b = $('pw2').value;
    if (a.length < 8 || pwScore(a) < 3) { say('passwordMsg', 'Şifre çok zayıf: en az 8 karakter, büyük-küçük harf ve rakam kullanın.', 'error'); return; }
    if (a !== b) { say('passwordMsg', 'Şifreler eşleşmiyor.', 'error'); return; }
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) { say('passwordMsg', /different from the old/i.test(error.message) ? 'Yeni şifre eskisiyle aynı olamaz.' : 'Şifre değiştirilemedi: ' + error.message, 'error'); return; }
    $('passwordForm').reset(); updateMeter();
    say('passwordMsg', 'Şifreniz değiştirildi.', 'success');
  }
  async function exportData() {
    const btn = $('exportBtn'); btn.disabled = true;
    try {
      const [fav, al, tl, bl] = await Promise.all([
        sb.from('favorites').select('created_at, properties(baslik_tr, slug, fiyat, para_birimi, ilce)').eq('customer_id', user.id),
        sb.from('saved_searches').select('arama_adi, kategoriler, bolgeler, islem_tipi, min_fiyat, max_fiyat, min_oda_sayisi, bildirim_aktif, created_at, son_bildirim_at').eq('customer_id', user.id),
        sb.rpc('iu_hesap_taleplerim'), sb.rpc('iu_hesap_bulten')
      ]);
      const pr = Object.assign({}, profile); delete pr.ip_address; delete pr.user_agent;
      const out = {
        olusturulma: new Date().toISOString(),
        hesap: { email: user.email, eposta_dogrulandi: emailConfirmed(), kayit_tarihi: user.created_at, son_giris: user.last_sign_in_at },
        profil: pr, favoriler: fav.data || [], arama_alarmlari: al.data || [], mesajlarim: tl.data || [], bulten: bl.data || null,
        not: 'TURYAP İsmail Ünsal — KVKK kapsamında kişisel verilerinizin kopyası.'
      };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hesap-verilerim-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    } catch (_) { toast('Veriler hazırlanamadı', 'error'); }
    finally { btn.disabled = false; }
  }
  const delOk = () => ['SİL', 'SIL'].includes(String($('delConfirm').value || '').trim().toLocaleUpperCase('tr-TR'));
  async function deleteAccount() {
    if (!delOk()) return;
    if (!confirm('Hesabınız ve tüm kayıtlarınız kalıcı olarak silinecek. Emin misiniz?')) return;
    const btn = $('deleteBtn'); btn.disabled = true;
    const { data, error } = await sb.rpc('iu_hesap_sil');
    if (error) { say('deleteMsg', 'Hesap silinemedi: ' + error.message, 'error'); btn.disabled = false; return; }
    try { localStorage.removeItem('iu_son_bakilan'); } catch (_) {}
    await sb.auth.signOut().catch(() => {});
    alert(data && data.giris_silindi === false
      ? 'Hesap verileriniz silindi. Giriş bilginizin de tamamen kaldırılması için lütfen bize e-posta gönderin.'
      : 'Hesabınız silindi. Ana sayfaya yönlendiriliyorsunuz.');
    location.href = '/';
  }

  // ---------------- olaylar ----------------
  function setupForms() {
    $('accNav').addEventListener('click', (e) => { const b = e.target.closest('.nav-item[data-tab]'); if (b) openTab(b.dataset.tab); });
    document.querySelector('.ov-grid').addEventListener('click', (e) => { const b = e.target.closest('[data-goto]'); if (b) openTab(b.dataset.goto); });
    $('logoutBtn').addEventListener('click', async () => { if (!confirm('Çıkış yapmak istediğinize emin misiniz?')) return; await sb.auth.signOut().catch(() => {}); location.href = '/'; });
    $('favoritesList').addEventListener('click', (e) => { const b = e.target.closest('[data-act="fav-remove"]'); if (b) removeFavorite(b.dataset.id); });
    // alarmlar
    KAT.forEach(([v, l]) => chip($('alarmKat'), 'akat', v, l));
    ILCELER.forEach(v => chip($('alarmBolge'), 'abolge', v, v));
    $('newAlarmBtn').addEventListener('click', () => {
      if (!emailConfirmed()) { toast('Önce e-posta adresinizi doğrulayın', 'error'); return; }
      $('alarmForm').hidden = false; $('newAlarmBtn').hidden = true; $('aName').placeholder = autoName();
    });
    $('alarmCancel').addEventListener('click', () => { $('alarmForm').reset(); $('alarmForm').hidden = true; $('newAlarmBtn').hidden = false; say('alarmMsg', ''); });
    $('alarmForm').addEventListener('change', () => { $('aName').placeholder = autoName(); });
    $('alarmForm').addEventListener('submit', saveAlarm);
    ['aMin', 'aMax', 'bMin', 'bMax'].forEach(id => $(id).addEventListener('blur', () => { $(id).value = fmtNumInput(num($(id).value)); }));
    $('alarmList').addEventListener('change', (e) => { const cb = e.target.closest('[data-act="alarm-toggle"]'); if (cb) toggleAlarm(cb.dataset.id, cb.checked); });
    $('alarmList').addEventListener('click', (e) => { const b = e.target.closest('[data-act="alarm-del"]'); if (b) deleteAlarm(b.dataset.id); });
    // bülten
    $('bultenForm').addEventListener('submit', saveBulten);
    // profil
    $('profileForm').addEventListener('submit', saveProfile);
    $('pEmailHint').addEventListener('click', (e) => { if (e.target.closest('#resendBtn')) resendVerify(); });
    // güvenlik
    $('pw1').addEventListener('input', updateMeter);
    document.querySelectorAll('.pw-toggle').forEach(b => b.addEventListener('click', () => {
      const i = $(b.dataset.for); const show = i.type === 'password';
      i.type = show ? 'text' : 'password'; b.textContent = show ? 'Gizle' : 'Göster';
      b.setAttribute('aria-pressed', show ? 'true' : 'false'); b.setAttribute('aria-label', show ? 'Şifreyi gizle' : 'Şifreyi göster');
    }));
    $('passwordForm').addEventListener('submit', savePassword);
    $('exportBtn').addEventListener('click', exportData);
    $('delConfirm').addEventListener('input', () => { $('deleteBtn').disabled = !delOk(); });
    $('deleteBtn').addEventListener('click', deleteAccount);
    window.addEventListener('hashchange', () => { const h = decodeURIComponent(location.hash.slice(1)); if (TABS.includes(h)) openTab(h); });
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-auth]');
    if (b && window.IUAuth) window.IUAuth.open(b.dataset.openAuth === 'signup' ? 'signup' : 'login');
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
