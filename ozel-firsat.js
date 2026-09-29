/**
 * ozel-firsat.js — Ana sayfa "💎 Özel Fırsat" vitrini.
 * Panelde "Özel Fırsat" işaretlenen TEK aktif ilanı gösterir; yoksa bölüm gizli kalır.
 * Güvenlik: tüm alanlar textContent; görsel yalnızca https; linkler kontrollü.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const IMAR = { konut: 'Konut', ticari: 'Ticari', konut_ticari: 'Konut + Ticari', turizm: 'Turizm', sanayi: 'Sanayi', tarim: 'Tarım', bag_bahce: 'Bağ-Bahçe', imarsiz: 'İmarsız', villa: 'Villa' };
  const KAT = { daire: 'Daire', villa: 'Villa', arsa: 'Arsa', mustakil_ev: 'Müstakil Ev', isyeri: 'İşyeri', yazlik: 'Yazlık', tarla: 'Tarla', bina: 'Bina' };
  const TIP = { satilik: 'Satılık', kiralik: 'Kiralık' };
  function price(v, cur) { if (!v) return 'Fiyat için arayın'; const s = { TL: '₺', TRY: '₺', USD: '$', EUR: '€', GBP: '£' }[cur] || '₺'; return new Intl.NumberFormat('tr-TR').format(v) + ' ' + s; }
  function mainImg(p) {
    const im = (p.property_images || []).filter(i => i && /^https:\/\/[^\s"'<>()]+$/i.test(i.url || ''));
    if (!im.length) return '';
    return (im.find(i => i.ana_foto) || im.slice().sort((a, b) => (a.sira || 0) - (b.sira || 0))[0]).url;
  }
  function stat(num, label) {
    const d = document.createElement('div'); d.className = 'featured-stat';
    const n = document.createElement('span'); n.className = 'num'; n.textContent = num;
    const l = document.createElement('span'); l.className = 'label'; l.textContent = label;
    d.append(n, l); return d;
  }
  async function init() {
    const sec = $('ozelFirsat'); if (!sec || !window.IUCms) return;
    const c = await window.IUCms.getClient(); if (!c) return;
    let p = null;
    try {
      const { data, error } = await c.from('properties')
        .select('id,slug,baslik_tr,aciklama_tr,tip,kategori,ilce,mahalle,fiyat,para_birimi,m2,oda_sayisi,banyo_sayisi,kat,bina_yasi,emsal,imar_durumu,ada_parsel,durum,property_images(url,ana_foto,sira)')
        .eq('ozel_firsat', true).eq('durum', 'aktif').limit(1);
      if (error) return;
      p = data && data[0];
    } catch (_) { return; }
    if (!p) return;

    const url = window.IUCms.langPrefix() + (window.IUCms.SLUG_RE.test(p.slug || '') ? '/ilan/' + p.slug : '/ilan?id=' + encodeURIComponent(p.id));
    const loc = [p.mahalle, p.ilce, 'Yalova'].filter(Boolean);
    $('ofTitle').textContent = p.baslik_tr || 'Özel Fırsat';
    $('ofLoc').textContent = loc.join(', ').toLocaleUpperCase('tr-TR');
    const desc = String(p.aciklama_tr || '').replace(/\s+/g, ' ').trim();
    $('ofDesc').textContent = desc.length > 260 ? desc.slice(0, 257).replace(/\s\S*$/, '') + '…' : desc;
    $('ofDesc').hidden = !desc;
    $('ofPrice').textContent = price(p.fiyat, p.para_birimi);
    $('ofSub').textContent = [loc.slice(0, 2).join(', '), [TIP[p.tip], KAT[p.kategori]].filter(Boolean).join(' ')].filter(Boolean).join(' • ');

    const img = mainImg(p);
    if (img) {
      $('ofImg').style.backgroundImage = 'linear-gradient(135deg, rgba(10,42,94,.15), rgba(5,26,61,.35)), url("' + img.replace(/["\\]/g, '') + '")';
      $('ofIcon').hidden = true;
    }
    $('ofImg').href = url; $('ofDetail').href = url;
    const msg = 'Merhaba, "' + (p.baslik_tr || 'Özel fırsat') + '" ilanı hakkında bilgi almak istiyorum.\n' + location.origin + url;
    $('ofWa').href = 'https://wa.me/905075188482?text=' + encodeURIComponent(msg);

    const st = $('ofStats'); st.textContent = '';
    const land = ['arsa', 'tarla'].includes(p.kategori);
    if (p.m2) st.appendChild(stat(new Intl.NumberFormat('tr-TR').format(p.m2) + ' m²', land ? 'ALAN' : 'BRÜT ALAN'));
    if (land) {
      if (p.emsal) st.appendChild(stat(String(p.emsal), 'EMSAL'));
      if (p.imar_durumu) st.appendChild(stat(IMAR[p.imar_durumu] || String(p.imar_durumu).replace(/_/g, ' '), 'İMAR'));
      if (p.ada_parsel) st.appendChild(stat(String(p.ada_parsel), 'ADA/PARSEL'));
    } else {
      if (p.oda_sayisi) st.appendChild(stat(String(p.oda_sayisi), 'ODA'));
      if (p.banyo_sayisi) st.appendChild(stat(String(p.banyo_sayisi), 'BANYO'));
      if (p.kat) st.appendChild(stat(String(p.kat), 'KAT'));
      else if (p.bina_yasi != null) st.appendChild(stat(String(p.bina_yasi), 'BİNA YAŞI'));
    }
    st.hidden = !st.children.length;
    sec.hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
