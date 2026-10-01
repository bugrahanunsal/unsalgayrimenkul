/**
 * cms-content.js — Panelden (Site İçeriği) yapılan metin/görsel değişikliklerini sayfaya uygular.
 *
 * Nasıl çalışır:
 *  - Sayfa yüklenir yüklenmez (başka script'ler değiştirmeden önce) düzenlenebilir öğeler
 *    bulunur ve ORİJİNAL içeriklerinin parmak iziyle (hash) işaretlenir: data-cms-h / data-cms-i
 *  - Panel aynı taramayı sayfanın ham HTML'i üzerinde yapar → aynı anahtarlar.
 *  - site_content tablosundan bu sayfanın ve "genel" (tüm sayfalar: footer, logo, favicon)
 *    kayıtları okunup uygulanır. Sayfanın HTML'i sonradan değişse bile yanlış yere yazılmaz
 *    (anahtar orijinal metnin kendisinden üretilir).
 *
 * Güvenlik: metinler IUSafe beyaz listesinden geçer (yalnızca kalın/italik/vurgu),
 * görseller yalnızca https. Veritabanına yazma sadece admin (RLS).
 */
(function (root) {
  'use strict';
  const SUPA_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
  const SUPA_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4';
  const INLINE_OK = new Set(['STRONG', 'EM', 'B', 'U', 'BR', 'SPAN', 'SMALL', 'MARK', 'SUP', 'SUB']);
  const KEEP_CLASSES = new Set(['highlight', 'accent']);
  const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'BLOCKQUOTE', 'FIGCAPTION', 'TD', 'TH', 'DT', 'DD', 'A', 'BUTTON', 'SPAN', 'LABEL', 'SMALL', 'STRONG', 'DIV', 'EM', 'B']);
  const SKIP_AREA = 'header.header, .top-bar, script, style, noscript, svg, template, .lang-switcher, .lang-dropdown, [id^="iu-"], .iu-authbar, .nav-auth-mobile, [data-cms-skip], select, option, textarea, form input, .iu-faq-section, [data-sidebar-listings], #listingsGrid, .listings-grid';
  const GLOBAL_AREA = 'footer, .footer';

  function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function hash(str) {                       // FNV-1a 32bit → base36
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  }
  function pageKey(pathname) {
    let p = String(pathname || '/').toLowerCase().replace(/^\/(en|fr|de|ru|ar)(?=\/|$)/, '');
    p = p.replace(/\/index\.html?$/, '/').replace(/\.html?$/, '').replace(/\/+$/, '');
    if (!p) return 'index';
    return p.replace(/^\//, '').replace(/[^a-z0-9\-/]/g, '').slice(0, 80) || 'index';
  }
  function isInlineOnly(el) {
    for (const d of el.querySelectorAll('*')) {
      if (!INLINE_OK.has(d.tagName) || (d.tagName === 'SPAN' && d.children.length)) return false;
      // Özel stilli parçalar (ör. marka rozeti) korunmalı → üst öğe bütün olarak düzenlenmez
      const cls = (d.getAttribute('class') || '').split(/\s+/).filter(Boolean);
      if (cls.some(c => !KEEP_CLASSES.has(c)) || d.hasAttribute('style') || d.hasAttribute('id')) return false;
    }
    return true;
  }
  function editable(el) {
    if (!TEXT_TAGS.has(el.tagName)) return false;
    const txt = norm(el.textContent);
    if (txt.length < 2 || /^[\d\s.,+%₺$€\-–/:]+$/.test(txt)) return false;      // boş / sadece sayı (JS doldurur)
    if (!isInlineOnly(el)) return false;
    if (el.tagName === 'DIV' || el.tagName === 'SPAN' || el.tagName === 'STRONG' || el.tagName === 'EM' || el.tagName === 'B') {
      // Bu kaplar, üstündeki öğe zaten düzenlenebilir değilse aday olur
      const p = el.parentElement;
      if (p && TEXT_TAGS.has(p.tagName) && p.tagName !== 'DIV' && isInlineOnly(p) && norm(p.textContent).length >= 2) return false;
    }
    return true;
  }
  /**
   * Belgedeki düzenlenebilir öğeleri tarar. Aynı fonksiyon panelde ham HTML'e uygulanır.
   * @returns {{texts:Array,imgs:Array}}
   */
  function scan(doc) {
    const texts = [], imgs = [];
    const all = doc.body ? doc.body.querySelectorAll('*') : [];
    const taken = new Set();
    for (const el of all) {
      if (el.closest(SKIP_AREA)) continue;
      const scope = el.closest(GLOBAL_AREA) ? 'genel' : 'sayfa';
      if (el.tagName === 'IMG') {
        const src = el.getAttribute('src') || '';
        if (!/^(https:|\/|[a-z0-9])/i.test(src) || /^data:/i.test(src)) continue;
        imgs.push({ el, scope, key: 'i' + hash(src), src, alt: el.getAttribute('alt') || '', kind: 'img' });
        continue;
      }
      const st = el.getAttribute('style') || '';
      const bg = st.match(/background(?:-image)?\s*:[^;]*url\(\s*['"]?(https:[^'")]+)['"]?\s*\)/i);
      if (bg) imgs.push({ el, scope, key: 'i' + hash(bg[1]), src: bg[1], alt: '', kind: 'bg' });
      if (!editable(el)) continue;
      // Üst öğesi zaten alınmışsa (iç içe) atla
      let skip = false; for (let p = el.parentElement; p; p = p.parentElement) { if (taken.has(p)) { skip = true; break; } }
      if (skip) continue;
      taken.add(el);
      const html = el.innerHTML;
      texts.push({ el, scope, key: 't' + hash(norm(el.textContent)), text: norm(el.textContent), html, tag: el.tagName });
    }
    return { texts, imgs };
  }

  // ----- Sitede uygula -----
  const CACHE_KEY = 'iu-cms-v1:';
  function applyRows(rows, found) {
    if (!rows || !rows.length) return;
    const map = new Map(rows.map(r => [r.sayfa + '|' + r.bolum_key, r]));
    const get = (scope, key) => map.get((scope === 'genel' ? 'genel' : found.page) + '|' + key);
    found.texts.forEach(t => {
      const r = get(t.scope, t.key);
      if (!r || r.icerik_tr == null || r.aktif === false) return;
      const html = root.IUSafe ? root.IUSafe.sanitize(r.icerik_tr) : null;
      if (html == null) return;
      t.el.removeAttribute('data-i18n');                 // sözlük çevirisi eski metni geri yazmasın
      if (t.el.innerHTML !== html) t.el.innerHTML = html;
    });
    found.imgs.forEach(im => {
      const r = get(im.scope, im.key);
      if (!r || r.aktif === false) return;
      const u = /^https:\/\/[^\s"'<>()]+$/i.test(r.foto_url || '') ? r.foto_url : '';
      if (u) {
        if (im.kind === 'img') { im.el.setAttribute('src', u); im.el.removeAttribute('srcset'); }
        else im.el.style.backgroundImage = 'url("' + u.replace(/["\\]/g, '') + '")';
      }
      // Alt metin (panelde Site İçeriği → fotoğraf → Alt metin); düz metin olarak, en fazla 250 karakter
      if (im.kind === 'img' && typeof r.foto_alt === 'string') {
        im.el.setAttribute('alt', r.foto_alt.replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 250));
      }
    });
    // Genel: logo & favicon
    const logo = map.get('genel|logo_url'), fav = map.get('genel|favicon_url');
    const safe = (r) => r && r.aktif !== false && /^https:\/\/[^\s"'<>()]+$/i.test(r.foto_url || '') ? r.foto_url : '';
    const fu = safe(fav);
    if (fu) {
      document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(l => l.remove());
      const l = document.createElement('link'); l.rel = 'icon'; l.href = fu; document.head.appendChild(l);
      const a = document.createElement('link'); a.rel = 'apple-touch-icon'; a.href = fu; document.head.appendChild(a);
    }
    const lu = safe(logo);
    if (lu) {
      const put = () => document.querySelectorAll('a.logo, .footer-brand .logo, .footer-logo').forEach(a => {
        if (a.querySelector('img.iu-custom-logo')) return;
        const img = document.createElement('img'); img.className = 'iu-custom-logo'; img.src = lu; img.alt = 'TURYAP İsmail Ünsal';
        img.style.cssText = 'height:56px;width:auto;max-width:260px;object-fit:contain;display:block;';
        a.textContent = ''; a.appendChild(img);
      });
      put(); document.addEventListener('iu:header-injected', put); setTimeout(put, 1500);
    }
  }

  async function loadAndApply(found) {
    // Önbellek: tekrar ziyarette anında uygula (kişisel kolaylık; hata olursa yok sayılır)
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE_KEY + found.page) || 'null'); } catch (_) {}
    if (cached && Array.isArray(cached.rows)) applyRows(cached.rows, found);
    const t0 = Date.now();
    while (!(root.supabase && root.supabase.createClient) && Date.now() - t0 < 10000) await new Promise(r => setTimeout(r, 60));
    if (!(root.supabase && root.supabase.createClient)) return;
    try {
      const c = root.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      let res = await c.from('site_content').select('sayfa,bolum_key,icerik_tr,foto_url,foto_alt,aktif').in('sayfa', [found.page, 'genel']).limit(2000);
      if (res.error) res = await c.from('site_content').select('sayfa,bolum_key,icerik_tr,foto_url,aktif').in('sayfa', [found.page, 'genel']).limit(2000);   // alt metin sütunu henüz yoksa
      if (res.error) return;
      const rows = res.data || [];
      try { localStorage.setItem(CACHE_KEY + found.page, JSON.stringify({ t: Date.now(), rows })); } catch (_) {}
      applyRows(rows, found);
    } catch (_) {}
  }

  function init() {
    if (!document.body) return;
    // Sayfaya panelden özel adres (slug) verildiyse sunucu asıl sayfa anahtarını <html data-iu-page> ile bildirir
    const real = document.documentElement.getAttribute('data-iu-page') || '';
    const page = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(real) ? real : pageKey(location.pathname);
    const res = scan(document);
    res.texts.forEach(t => t.el.setAttribute('data-cms-h', t.key));
    res.imgs.forEach(i => i.el.setAttribute('data-cms-i', i.key));
    const found = { page, texts: res.texts, imgs: res.imgs };
    root.IUCmsContent = { found, applyRows };
    loadAndApply(found);
  }

  root.IUCmsScan = { scan, pageKey, hash, norm };
  // Panel ham HTML taraması için yüklendiğinde otomatik çalışma (data-cms-noinit)
  if (!(document.currentScript && document.currentScript.hasAttribute('data-cms-noinit'))) {
    // </body> öncesinde senkron yüklenir: sayfa içeriği hazır, diğer script'ler henüz değiştirmedi
    if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
  }
})(window);
