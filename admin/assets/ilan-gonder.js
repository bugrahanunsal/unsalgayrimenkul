/**
 * Müşteriye İlan Gönder — admin/ilan-gonder.html
 * Kriterlere uyan AKTİF ilanları listeler, seçilenleri /api/admin/ilan-gonder
 * üzerinden müşteriye tek e-posta olarak yollar.
 * Güvenlik: tüm çıktı escape edilir / textContent ile yazılır; istek admin
 * oturum token'ı ile gider, sunucu admin yetkisini ayrıca doğrular.
 */
(function () {
  'use strict';

  const KATEGORILER = [
    ['daire', 'Daire'], ['villa', 'Villa'], ['mustakil_ev', 'Müstakil Ev'], ['yazlik', 'Yazlık'],
    ['arsa', 'Arsa'], ['tarla', 'Tarla'], ['isyeri', 'İşyeri'], ['bina', 'Bina']
  ];
  const ODALAR = ['1+0', '1+1', '2+1', '3+1', '4+1', '5+'];
  const OZELLIKLER = [
    ['deniz_manzarali', 'Deniz manzarası'], ['esyali', 'Eşyalı'], ['havuzlu', 'Havuz'],
    ['asansorlu', 'Asansör'], ['otoparkli', 'Otopark'], ['balkonlu', 'Balkon'], ['guvenlikli', 'Güvenlik']
  ];
  const TIP = { satilik: 'Satılık', kiralik: 'Kiralık' };
  const KAT_AD = Object.fromEntries(KATEGORILER);
  const EMAIL_RE = /^[^\s@<>"',;:()\[\]\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

  // ---------- saf yardımcılar (test edilebilir) ----------
  const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u').trim();

  // "3+1", "3 + 1", "3+1 dubleks" → {oda:3, salon:1}
  function parseOda(v) {
    const m = String(v || '').match(/(\d+)\s*\+\s*(\d+)/);
    if (m) return { oda: +m[1], salon: +m[2] };
    const n = String(v || '').match(/^\s*(\d+)/);
    return n ? { oda: +n[1], salon: 0 } : null;
  }
  function odaMatches(value, wanted) {
    if (!wanted.length) return true;
    const o = parseOda(value);
    if (!o) return false;
    return wanted.some(w => w === '5+' ? o.oda >= 5 : (() => { const x = parseOda(w); return x && x.oda === o.oda && x.salon === o.salon; })());
  }
  // Kat metni → sayı. Zemin/bahçe/giriş = 0, bodrum/kot = negatif, "Çatı" vb. = null
  function parseKat(v) {
    const t = norm(v);
    if (!t) return null;
    if (/bodrum|kot/.test(t)) { const n = t.match(/-?\d+/); return n ? -Math.abs(+n[0]) : -1; }
    if (/zemin|bahce|giris|yuksek giris|^z$/.test(t)) return 0;
    const n = t.match(/-?\d+/);
    return n ? +n[0] : null;
  }
  function matches(p, f) {
    if (f.tip && p.tip !== f.tip) return false;
    if (f.kategoriler.length && !f.kategoriler.includes(p.kategori)) return false;
    if (f.ilceler.length && !f.ilceler.includes(norm(p.ilce))) return false;
    if (f.mahalleler.length) {
      const hay = norm((p.mahalle || '') + ' ' + (p.baslik_tr || ''));
      if (!f.mahalleler.some(m => hay.includes(m))) return false;
    }
    if (!odaMatches(p.oda_sayisi, f.odalar)) return false;
    if (f.banyoMin && !((+p.banyo_sayisi || 0) >= f.banyoMin)) return false;
    const oz = p.ozellikler || {};
    if (f.bahce === 'evet' && !oz.bahceli) return false;
    if (f.bahce === 'hayir' && oz.bahceli) return false;
    if (f.katTip) {
      const k = parseKat(p.kat);
      if (f.katTip === 'zemin' && k !== 0) return false;
      if (f.katTip === 'zemin_degil' && (k === null || k <= 0)) return false;
      if (f.katTip === 'aralik') {
        if (k === null) return false;
        if (f.katMin !== null && k < f.katMin) return false;
        if (f.katMax !== null && k > f.katMax) return false;
      }
    }
    const fiyat = +p.fiyat || 0;
    if (f.fiyatMin !== null && fiyat < f.fiyatMin) return false;
    if (f.fiyatMax !== null && fiyat > f.fiyatMax) return false;
    const m2 = +p.m2 || 0;
    if (f.m2Min !== null && m2 < f.m2Min) return false;
    if (f.m2Max !== null && m2 > f.m2Max) return false;
    for (const k of f.ozellikler) if (!oz[k]) return false;
    return true;
  }
  window.IUMatch = { parseOda, odaMatches, parseKat, matches, norm };
  if (!document.getElementById('results')) return;   // test ortamı

  // ---------- durum ----------
  let all = [];
  const selected = new Set();
  let lastMatchIds = [];
  const $ = (id) => document.getElementById(id);
  const num = (id) => { const v = $(id).value.trim(); return v === '' ? null : Number(v); };

  function chip(container, name, value, label, type = 'checkbox') {
    const l = document.createElement('label'); l.className = 'chip';
    const i = document.createElement('input'); i.type = type; i.name = name; i.value = value;
    const s = document.createElement('span'); s.textContent = label;
    l.append(i, s); container.appendChild(l);
  }
  function buildControls() {
    KATEGORILER.forEach(([v, l]) => chip($('fKategori'), 'kategori', v, l));
    (window.ILCELER || []).forEach(v => chip($('fIlce'), 'ilce', norm(v), v));
    ODALAR.forEach(v => chip($('fOda'), 'oda', v, v === '5+' ? '5+1 ve üzeri' : v));
    OZELLIKLER.forEach(([v, l]) => chip($('fOzellik'), 'oz', v, l));
  }
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);

  function readFilters() {
    return {
      tip: (document.querySelector('input[name="tip"]:checked') || {}).value || '',
      kategoriler: checked('kategori'),
      ilceler: checked('ilce'),
      mahalleler: $('fMahalle').value.split(',').map(norm).filter(Boolean),
      odalar: checked('oda'),
      banyoMin: +$('fBanyo').value || 0,
      bahce: $('fBahce').value,
      katTip: $('fKatTip').value,
      katMin: num('fKatMin'), katMax: num('fKatMax'),
      fiyatMin: num('fFiyatMin'), fiyatMax: num('fFiyatMax'),
      m2Min: num('fM2Min'), m2Max: num('fM2Max'),
      ozellikler: checked('oz')
    };
  }

  function mainImage(p) {
    const imgs = (p.property_images || []).filter(i => i && /^https:\/\//i.test(i.url || ''));
    if (!imgs.length) return '';
    return (imgs.find(i => i.ana_foto) || imgs.sort((a, b) => (a.sira || 0) - (b.sira || 0))[0]).url;
  }
  function priceText(p) {
    if (!p.fiyat) return 'Fiyat yok';
    const sym = { TL: '₺', TRY: '₺', USD: '$', EUR: '€', GBP: '£' }[p.para_birimi] || '₺';
    return new Intl.NumberFormat('tr-TR').format(p.fiyat) + ' ' + sym;
  }
  function factsText(p) {
    const f = [TIP[p.tip], KAT_AD[p.kategori] || p.kategori];
    if (p.oda_sayisi) f.push(p.oda_sayisi);
    if (p.m2) f.push(p.m2 + ' m²');
    if (p.banyo_sayisi) f.push(p.banyo_sayisi + ' banyo');
    if (p.kat) f.push('Kat: ' + p.kat);
    if ((p.ozellikler || {}).bahceli) f.push('Bahçeli');
    return f.filter(Boolean).join(' · ');
  }

  function render() {
    const f = readFilters();
    const list = all.filter(p => matches(p, f));
    const ids = list.map(p => p.id);
    // Yeni eşleşenler otomatik seçili; artık uymayanlar seçimden çıkar
    ids.forEach(id => { if (!lastMatchIds.includes(id)) selected.add(id); });
    Array.from(selected).forEach(id => { if (!ids.includes(id)) selected.delete(id); });
    lastMatchIds = ids;

    const box = $('results'); box.textContent = '';
    $('matchCount').textContent = list.length;
    if (!list.length) {
      const e = document.createElement('div'); e.className = 'ig-empty';
      e.textContent = all.length ? 'Bu kriterlere uyan aktif ilan yok. Kriterleri biraz genişletmeyi deneyin.' : 'Aktif ilan bulunamadı.';
      box.appendChild(e);
    }
    for (const p of list) {
      const row = document.createElement('label'); row.className = 'ig-item' + (selected.has(p.id) ? ' on' : '');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = selected.has(p.id);
      cb.addEventListener('change', () => { cb.checked ? selected.add(p.id) : selected.delete(p.id); row.classList.toggle('on', cb.checked); updateCount(); });
      const src = mainImage(p);
      let img;
      if (src) { img = document.createElement('img'); img.src = src; img.alt = ''; img.loading = 'lazy'; }
      else { img = document.createElement('div'); img.className = 'noimg'; }
      const info = document.createElement('div'); info.style.minWidth = '0';
      const t = document.createElement('div'); t.className = 'ig-t'; t.textContent = p.baslik_tr || 'İlan';
      const m = document.createElement('div'); m.className = 'ig-m'; App.iconText(m, 'map-pin', [p.mahalle, p.ilce].filter(Boolean).join(', '));
      const fa = document.createElement('div'); fa.className = 'ig-f'; fa.textContent = factsText(p);
      info.append(t, m, fa);
      const pr = document.createElement('div'); pr.className = 'ig-p'; pr.textContent = priceText(p);
      row.append(cb, img, info, pr);
      box.appendChild(row);
    }
    updateCount();
  }
  function updateCount() { $('selCount').textContent = selected.size; }

  async function loadProperties() {
    const { data, error } = await supabaseClient
      .from('properties')
      .select('id,slug,baslik_tr,tip,kategori,ilce,mahalle,fiyat,para_birimi,m2,oda_sayisi,banyo_sayisi,kat,ozellikler,property_images(url,ana_foto,sira)')
      .eq('durum', 'aktif')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    all = data || [];
  }

  async function loadCustomers() {
    const sel = $('pickCustomer');
    const seen = new Set();
    const add = (group, email, name, extra) => {
      email = String(email || '').trim().toLowerCase();
      if (!EMAIL_RE.test(email) || seen.has(email)) return;
      seen.add(email);
      const o = document.createElement('option');
      o.value = email; o.dataset.name = name || '';
      o.textContent = (name ? name + ' — ' : '') + email + (extra ? ' (' + extra + ')' : '');
      group.appendChild(o);
    };
    const gL = document.createElement('optgroup'); gL.label = 'Mesaj gönderenler';
    const gS = document.createElement('optgroup'); gS.label = 'Aboneler';
    try {
      const { data } = await supabaseClient.from('leads').select('id,isim,email,created_at').not('email', 'is', null).order('created_at', { ascending: false }).limit(300);
      (data || []).forEach(l => add(gL, l.email, l.isim));
      // leads.html'den "İlan Gönder" ile gelindiyse o müşteriyi seç
      const leadId = new URLSearchParams(location.search).get('lead');
      const hit = leadId && (data || []).find(l => l.id === leadId);
      if (hit && EMAIL_RE.test(String(hit.email || ''))) { $('toEmail').value = hit.email.toLowerCase(); $('toName').value = (hit.isim || '').slice(0, 60); }
    } catch (_) {}
    try {
      const { data } = await supabaseClient.from('subscribers').select('email,full_name,is_active').eq('is_active', true).order('subscribed_at', { ascending: false }).limit(500);
      (data || []).forEach(s => add(gS, s.email, s.full_name));
    } catch (_) {}
    if (gL.children.length) sel.appendChild(gL);
    if (gS.children.length) sel.appendChild(gS);
    sel.addEventListener('change', () => {
      const o = sel.selectedOptions[0];
      if (!o || !o.value) return;
      $('toEmail').value = o.value;
      $('toName').value = o.dataset.name || '';
    });
  }

  function showWarn(msg) { const w = $('warn'); w.textContent = msg || ''; w.style.display = msg ? 'block' : 'none'; }

  async function callApi(payload) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { location.href = '/?login=1&redirect=' + encodeURIComponent('/admin/ilan-gonder.html'); throw new Error('Oturum yok'); }
    const r = await fetch('/api/admin/ilan-gonder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify(payload)
    });
    let j = {};
    try { j = await r.json(); } catch (_) {}
    if (!r.ok || !j.ok) throw new Error(j.message || 'İşlem başarısız (' + r.status + ')');
    return j;
  }

  function buildPayload(preview) {
    const email = $('toEmail').value.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { showWarn('Lütfen müşterinin geçerli e-posta adresini girin.'); $('toEmail').focus(); return null; }
    const ids = lastMatchIds.filter(id => selected.has(id));
    if (!ids.length) { showWarn('Gönderilecek en az 1 ilan seçin.'); return null; }
    if (ids.length > 20) { showWarn('Tek e-postada en fazla 20 ilan gönderilebilir. Kriterleri daraltın veya bazılarının işaretini kaldırın.'); return null; }
    showWarn('');
    return {
      action: 'musteri', preview: !!preview, to_email: email,
      to_name: $('toName').value.trim().slice(0, 60),
      subject: $('subject').value.trim().slice(0, 150),
      message: $('message').value.trim().slice(0, 1000),
      property_ids: ids
    };
  }

  async function onPreview() {
    const payload = buildPayload(true); if (!payload) return;
    const btn = $('previewBtn'); btn.disabled = true;
    try {
      const j = await callApi(payload);
      $('previewSubject').textContent = j.subject || 'Önizleme';
      $('previewFrame').srcdoc = j.html;
      $('previewModal').style.display = 'flex';
    } catch (e) { showWarn(e.message); }
    finally { btn.disabled = false; }
  }

  async function onSend() {
    const payload = buildPayload(false); if (!payload) return;
    const ok = await App.confirm(`${payload.property_ids.length} ilan ${payload.to_email} adresine gönderilecek. Onaylıyor musunuz?`);
    if (!ok) return;
    const btn = $('sendBtn'); btn.disabled = true; btn.textContent = 'Gönderiliyor...';
    try {
      await callApi(payload);
      App.toast(`${payload.property_ids.length} ilan ${payload.to_email} adresine gönderildi.`, 'success', 'Gönderildi');
      try { await Security.logSecurityEvent('listings_sent_to_customer', { to: payload.to_email, count: payload.property_ids.length }, 'info'); } catch (_) {}
    } catch (e) { showWarn(e.message); App.toast(e.message, 'error'); }
    finally { btn.disabled = false; App.iconText(btn, 'send', 'Müşteriye Gönder'); }
  }

  function reset() {
    document.querySelectorAll('#fKategori input,#fIlce input,#fOda input,#fOzellik input').forEach(i => { i.checked = false; });
    document.querySelector('input[name="tip"][value=""]').checked = true;
    ['fMahalle', 'fKatMin', 'fKatMax', 'fFiyatMin', 'fFiyatMax', 'fM2Min', 'fM2Max'].forEach(id => { $(id).value = ''; });
    ['fBanyo', 'fBahce', 'fKatTip'].forEach(id => { $(id).value = ''; });
    $('katAralik').style.display = 'none';
    render();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const ok = await App.init('ilan-gonder');
    if (!ok) return;
    buildControls();
    // Sadece kriter kartındaki değişiklikler listeyi yeniden çizer
    // (mesaj/e-posta alanları ve ilan kutucukları listeyi bozmasın)
    $('criteria').addEventListener('input', render);
    $('criteria').addEventListener('change', (e) => {
      if (e.target.id === 'fKatTip') $('katAralik').style.display = e.target.value === 'aralik' ? '' : 'none';
      render();
    });
    $('selAll').addEventListener('click', () => { lastMatchIds.forEach(id => selected.add(id)); render(); });
    $('selNone').addEventListener('click', () => { selected.clear(); render(); });
    $('resetBtn').addEventListener('click', reset);
    $('previewBtn').addEventListener('click', onPreview);
    $('sendBtn').addEventListener('click', onSend);
    $('closePreview').addEventListener('click', () => { $('previewModal').style.display = 'none'; });
    $('previewModal').addEventListener('click', (e) => { if (e.target.id === 'previewModal') $('previewModal').style.display = 'none'; });
    try { await loadProperties(); } catch (e) { $('results').textContent = 'İlanlar yüklenemedi: ' + e.message; return; }
    render();
    loadCustomers();
  });
})();
