/**
 * team-public.js — Hakkımızda: panelde "Ekip" bölümüne eklenen aktif üyeleri gösterir.
 * Sayfada zaten büyük tanıtımı olan kişiler (data-static-member) tekrar gösterilmez.
 * Güvenlik: tüm alanlar textContent; linkler doğrulanır (tel/wa/mailto/https linkedin).
 */
(function () {
  'use strict';
  const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const EMAIL_RE = /^[^\s@<>"'()]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,}$/;
  function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function icon(c) { const i = document.createElement('i'); i.className = c; return i; }
  function btn(href, cls, ic, label, blank) {
    const a = el('a', cls); a.href = href; if (blank) { a.target = '_blank'; a.rel = 'noopener'; }
    a.append(icon(ic), document.createTextNode(' ' + label)); return a;
  }
  function card(m) {
    const c = el('article', 'tm-card');
    const ph = el('div', 'tm-photo');
    const u = window.IUCms.safeImg(m.fotograf_url);
    if (u) { const img = document.createElement('img'); img.src = u; img.alt = m.isim || ''; img.loading = 'lazy'; ph.appendChild(img); }
    else ph.appendChild(el('span', 'tm-initial', (m.isim || '?').trim().charAt(0).toLocaleUpperCase('tr-TR')));
    const b = el('div', 'tm-body');
    b.appendChild(el('h3', 'tm-name', m.isim || ''));
    if (m.pozisyon_tr) b.appendChild(el('div', 'tm-role', m.pozisyon_tr));
    if (m.biyografi_tr) b.appendChild(el('p', 'tm-bio', String(m.biyografi_tr).slice(0, 400)));
    const act = el('div', 'tm-actions');
    const tel = digits(m.telefon); if (tel.length >= 10 && tel.length <= 15) act.appendChild(btn('tel:+' + (tel.length === 10 ? '90' + tel : tel.replace(/^0/, '90')), 'tm-btn', 'fa-solid fa-phone', 'Ara'));
    const wa = digits(m.whatsapp || m.telefon); if (wa.length >= 10 && wa.length <= 15) act.appendChild(btn('https://wa.me/' + (wa.length === 10 ? '90' + wa : wa.replace(/^0/, '90')), 'tm-btn wa', 'fa-brands fa-whatsapp', 'WhatsApp', true));
    if (EMAIL_RE.test(m.email || '')) act.appendChild(btn('mailto:' + m.email, 'tm-btn', 'fa-solid fa-envelope', 'E-posta'));
    if (/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/[^\s"'<>]+$/i.test(m.linkedin || '')) act.appendChild(btn(m.linkedin, 'tm-btn', 'fa-brands fa-linkedin', 'LinkedIn', true));
    if (act.children.length) b.appendChild(act);
    c.append(ph, b); return c;
  }
  async function init() {
    const sec = document.getElementById('teamSection'); if (!sec || !window.IUCms) return;
    const c = await window.IUCms.getClient(); if (!c) return;
    let data = [];
    try { const r = await c.from('team_members').select('isim,pozisyon_tr,fotograf_url,telefon,whatsapp,email,linkedin,biyografi_tr,sira,aktif').eq('aktif', true).order('sira', { ascending: true }).limit(50); data = r.data || []; } catch (_) { return; }
    const statics = new Set(Array.from(document.querySelectorAll('[data-static-member]')).map(e => norm(e.getAttribute('data-static-member'))));
    const list = data.filter(m => m && m.isim && !statics.has(norm(m.isim)));
    if (!list.length) return;
    const grid = sec.querySelector('.tm-grid'); grid.textContent = '';
    list.forEach(m => grid.appendChild(card(m)));
    sec.hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
