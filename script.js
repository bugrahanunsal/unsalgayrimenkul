// ============================================
// ÜNSAL GAYRIMENKUL - SHARED SCRIPTS
// Dil sistemi: translations.js dosyasında
// ============================================

// ==================== OTOMATİK SCRIPT LOADER ====================
// Bu sayede her sayfada:
// - Supabase SDK
// - Auth widget (Giriş/Hesabım)
// - Frontend database integration
// - FAQ (SEO için)
// otomatik olarak yüklenir. HTML dosyalarına ek script eklemeye gerek yok.

(function() {
  const pathname = window.location.pathname.toLowerCase();
  const isAdmin = pathname.includes('/admin');

  // Admin panelde yükleme (o kendi scriptlerini yükler)
  if (isAdmin) return;

  function loadScript(src, async = false) {
    return new Promise((resolve, reject) => {
      // Zaten yüklü mü? Dosya adına göre (sayfa aynı dosyayı başka bir ?v= ile eklemiş olabilir;
      // aynı dosya iki kez çalışırsa çeviri / SSS / üyelik kutusu iki kez kurulur)
      const bare = (u) => String(u || '').split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
      const want = bare(src);
      if (Array.prototype.some.call(document.scripts, (sc) => sc.getAttribute('src') && bare(sc.getAttribute('src')) === want)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = async;
      script.onload = () => resolve();
      script.onerror = () => {
        console.warn('[SiteLoader] Yüklenemedi: ' + src);
        resolve(); // hata olsa da devam et
      };
      document.head.appendChild(script);
    });
  }

  // Cache-buster: her deploy sonrası tarayıcının yeni JS'i çekmesi için
  // (kullanıcıların Ctrl+Shift+R yapmasına gerek kalmaz)
  const SITE_VERSION = '20261013-sekme';

  async function loadAllScripts() {
    try {
      // 1. Önce Supabase SDK
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');

      // 2. Auth widget (Giriş/Hesabım butonları + modal)
      await loadScript('/subscribe-widget.js?v=' + SITE_VERSION);

      // 3. Frontend database entegrasyonu (ilan listesi, kategori sayaçları)
      await loadScript('/frontend-supabase.js?v=' + SITE_VERSION);

      // 4. FAQ (SEO ve SSS sayfası için)
      await loadScript('/faq-yalova-emlak.js?v=' + SITE_VERSION);

      // 5. Çevirmen (otomatik dil çevirisi)
      await loadScript('/translator.js?v=' + SITE_VERSION);

      console.log('[SiteLoader] Tüm scriptler yüklendi ✓ (v=' + SITE_VERSION + ')');
    } catch (err) {
      console.error('[SiteLoader] Yükleme hatası:', err);
    }
  }

  // DOM hazır olur olmaz başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllScripts);
  } else {
    loadAllScripts();
  }
})();

(function () {
  'use strict';
  // Açılır menüler (SATILIK / KİRALIK / ARSA / LÜKS): ok düğmesi aç/kapa, dışarı tıklayınca ve Esc ile kapanır.
  // Fareyle üzerine gelince CSS açar. Aynı kod script.js'te de var; hangisi önce çalışırsa o bağlar (bir kez).
  function iuBindSubmenus() {
    if (window.__iuSubBound) return;
    window.__iuSubBound = true;
    const items = () => Array.from(document.querySelectorAll('.nav .nav-item.has-sub'));
    const setOpen = (item, open) => {
      item.classList.toggle('open', open);
      const b = item.querySelector('.nav-sub-btn');
      if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    document.addEventListener('click', (e) => {
      const t = e.target && e.target.closest ? e.target : null;
      const btn = t && t.closest('.nav-sub-btn');
      if (btn) {
        e.preventDefault();
        const item = btn.closest('.nav-item');
        const open = !item.classList.contains('open');
        items().forEach(i => { if (i !== item) setOpen(i, false); });
        setOpen(item, open);
        return;
      }
      if (t && t.closest('.nav-item.has-sub')) return;
      items().forEach(i => setOpen(i, false));
    });
    // Klavyeyle menünün dışına çıkılınca açık liste kapanır
    // (mobil menüde değil: orada kapanan liste, parmağın altındaki satırları kaydırıp yanlış yere dokundurur)
    document.addEventListener('focusin', (e) => {
      items().forEach(i => {
        if (!i.classList.contains('open') || i.contains(e.target)) return;
        const panel = i.closest('.nav.open');
        if (panel && panel.contains(e.target)) return;
        setOpen(i, false);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const it = items().find(i => i.classList.contains('open') || i.contains(document.activeElement));
      if (!it) return;
      const hadFocus = it.contains(document.activeElement);
      setOpen(it, false);
      const b = it.querySelector('.nav-sub-btn');
      if (b && hadFocus) b.focus();
    });
  }
  iuBindSubmenus();
})();

// ==================== MEVCUT UI KODLARI ====================

// ==================== HEADER ====================
// Header artık SADECE /unified-header.js'ten gelir (tek kaynak).
// Buradaki eski ikinci kopya kaldırıldı — iki sistem birbirinin üzerine yazıyordu.

// ==================== TELİF SATIRI TEK SATIR (MOBİL) ====================
// Mobilde telif yazısı iki satıra düşmesin: sığmıyorsa font'u 0.5px adımlarla
// küçült (en az 9px). Çeviri/dil değişimi ve font yüklenmesinden sonra tekrar ölç.
(function fitCopyrightLine() {
  function fit() {
    const p = document.querySelector('.footer-bottom > p:first-child');
    if (!p) return;
    p.style.fontSize = '';                        // CSS'teki başlangıç boyutuna dön
    p.style.whiteSpace = '';
    if (window.innerWidth > 968) return;          // sadece mobil/tablet
    let size = parseFloat(getComputedStyle(p).fontSize);
    while (p.scrollWidth > p.clientWidth + 1 && size > 9) {
      size -= 0.5;
      p.style.fontSize = size + 'px';
    }
    // En küçük boyutta bile sığmıyorsa (çok dar ekran + uzun dil) taşırma, alt satıra geç
    p.style.whiteSpace = p.scrollWidth > p.clientWidth + 1 ? 'normal' : '';
  }
  const run = () => requestAnimationFrame(fit);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.addEventListener('load', run);
  window.addEventListener('resize', run);
  document.addEventListener('iu:header-injected', () => setTimeout(run, 50));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  setTimeout(run, 1500);                          // translations.js metni değiştirdikten sonra
})();

// ==================== FOOTER LOGO DÜZELTMESİ ====================
// Eski "ÜNSAL GAYRİMENKUL" logosunu yeni "TURYAP | İSMAİL ÜNSAL" logosuyla değiştir
document.addEventListener('DOMContentLoaded', () => {
  const footerBrand = document.querySelector('.footer .footer-brand');
  if (!footerBrand) return;

  const oldLogo = footerBrand.querySelector('.logo-svg');
  if (!oldLogo) return;

  // Eski logoda "GAYRİMENKUL" veya küçük text yoksa (=TURYAP versiyonuysa) dokunma
  const svgHtml = oldLogo.outerHTML;
  if (svgHtml.includes('TURYAP') && svgHtml.includes('ÜNSAL')) return;

  // Yeni logoyla değiştir
  const newLogoSvg = `
    <svg class="logo-svg" viewBox="-38 0 340 80" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TURYAP İsmail Ünsal Real Estate" style="margin-bottom:16px">
      <rect x="0" y="10" width="80" height="60" rx="4" fill="#FFFFFF"/>
      <text x="40" y="46" font-family="League Spartan, Montserrat, sans-serif" font-size="18" font-weight="800" fill="#0A2A5E" text-anchor="middle" letter-spacing="2">TURYAP</text>
      <line x1="93" y1="18" x2="93" y2="62" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1.5"/>
      <text x="106" y="41" font-family="Poppins, DM Sans, sans-serif" font-size="21" font-weight="800" letter-spacing="1.2"><tspan fill="#FFFFFF">İSMAİL </tspan><tspan fill="#60A5FA">ÜNSAL</tspan></text>
      <text x="107" y="60" font-family="Poppins, DM Sans, sans-serif" font-size="8.5" font-weight="600" fill="#FFFFFF" fill-opacity="0.6" letter-spacing="3.6">REAL ESTATE</text>
    </svg>
  `;
  oldLogo.outerHTML = newLogoSvg;

  // Copyright metnini de düzelt
  const copyright = document.querySelector('.footer-bottom p');
  if (copyright && copyright.textContent.includes('ÜNSAL Gayrimenkul')) {
    copyright.textContent = '© 2026 TURYAP İsmail Ünsal Real Estate. Tüm hakları saklıdır.';
  }

  console.log('[SiteLoader] Footer logo TURYAP versiyonuyla güncellendi');
});

// ==================== NAV MENÜYE SSS (FAQ) EKLE ====================
// Her sayfada nav menüsüne SSS linkini otomatik ekle (İLETİŞİM'den önce).
// Görünen ad: Türkçede "SSS" (sayfanın kendisi ve altbilgi "Sıkça Sorulan Sorular"), diğer dillerde
// translations.js'teki "nav.sss" karşılığı (EN/FR/DE: FAQ). Adres her dilde /faq.
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  const faqLabel = (typeof window.t === 'function' && window.t('nav.sss') !== 'nav.sss') ? window.t('nav.sss') : 'SSS';

  // Zaten var mı kontrol (eski /sss link'i varsa güncelle)
  const existing = nav.querySelector('a[href*="/sss"], a[href="sss.html"], a[href*="/faq"], a[href="faq.html"]');
  if (existing) {
    existing.setAttribute('href', '/faq');
    existing.setAttribute('data-i18n', 'nav.sss');
    existing.textContent = faqLabel;
    return;
  }

  // Nav'da metin olarak 'SSS' geçen link var mı? (bazı sayfalarda text-based)
  const allLinks = nav.querySelectorAll('a');
  for (const a of allLinks) {
    const t = (a.textContent || '').trim().toUpperCase();
    if (t === 'SSS' || t === 'FAQ') {
      a.setAttribute('href', '/faq');
      a.setAttribute('data-i18n', 'nav.sss');
      a.textContent = faqLabel;
      return;
    }
  }

  const faqLink = document.createElement('a');
  faqLink.href = '/faq';
  faqLink.textContent = faqLabel;
  faqLink.setAttribute('data-i18n', 'nav.sss');

  // Aktif sayfa kontrolü (özel adreste asıl sayfa anahtarı <html data-iu-page> ile gelir)
  const p = document.documentElement.getAttribute('data-iu-page') === 'faq' ? '/faq' : window.location.pathname.toLowerCase();
  if (p.includes('/faq') || p.includes('/sss')) {
    faqLink.className = 'active';
  }

  // İLETİŞİM'den önce ekle (varsa)
  const links = nav.querySelectorAll('a');
  let iletisimLink = null;
  links.forEach(a => {
    if (a.textContent.trim().toUpperCase().includes('İLETİŞİM') || a.textContent.trim().toUpperCase().includes('ILETISIM')) {
      iletisimLink = a;
    }
  });

  if (iletisimLink) {
    nav.insertBefore(faqLink, iletisimLink);
  } else {
    nav.appendChild(faqLink);
  }
});

// ==================== INTERNAL LINK LANGUAGE PRESERVER ====================
// Kullanıcı /en/, /ar/ gibi bir dil URL'sindeyken, sayfa içindeki tüm
// internal linkler (nav, footer, kart, buton) o dil prefix'i ile yönlendirsin.
// Böylece dil seçimi bir sonraki sayfada da korunuyor — asla Türkçe'ye
// düşmüyor. Sadece kullanıcı bayrak seçerek değiştirebilir.
(function() {
  const path = window.location.pathname;
  const m = path.match(/^\/(en|fr|de|ru|ar)(\/|$)/);
  // Panelden (SEO Ayarları) adresi değiştirilen sayfalar: sunucu <html data-iu-slugs="eski=yeni,..."> verir.
  // Menü/kart gibi sonradan eklenen linkler de doğrudan yeni adrese gitsin (yönlendirme beklemeden).
  const SLUGS = {};
  String(document.documentElement.getAttribute('data-iu-slugs') || '').split(',').forEach(pair => {
    const kv = pair.split('=');
    if (kv.length === 2 && /^[a-z0-9-]{1,80}$/.test(kv[0]) && /^[a-z0-9-]{1,80}$/.test(kv[1])) SLUGS[kv[0]] = kv[1];
  });
  const hasSlugs = Object.keys(SLUGS).length > 0;
  if (!m && !hasSlugs) return; // Türkçe (kök URL) ve özel adres yok — rewrite gereksiz
  const lang = m ? m[1] : '';
  const prefix = lang ? '/' + lang : '';

  // Not: ".html" uzantısı MUTLAKA kaldırılır. Cloudflare Pages "/ar/x.html"
  // isteğini temiz URL'ye ("/x") 308 ile yönlendirip dil önekini düşürüyordu.
  const LANG_RE = /^\/(en|fr|de|ru|ar)(?=\/|$)/;
  function rewrite(href) {
    if (!href) return href;
    const h = href.trim();
    if (/^(#|tel:|mailto:|javascript:|data:|sms:|whatsapp:|blob:)/i.test(h)) return href;
    let rest = h;
    if (/^(https?:)?\/\//i.test(h)) {                    // mutlak URL: yalnızca aynı site
      try {
        const u = new URL(h, location.href);
        if (u.origin !== location.origin) return href;
        rest = u.pathname + u.search + u.hash;
      } catch (e) { return href; }
    }
    const cut = rest.search(/[?#]/);
    let p = cut === -1 ? rest : rest.slice(0, cut);
    const tail = cut === -1 ? '' : rest.slice(cut);
    p = p.replace(/^\.\//, '');
    if (!p.startsWith('/')) p = '/' + p;                  // site düz yapıda: kök-göreli
    if (/^\/(admin|api|cdn-cgi)(\/|$)/i.test(p)) return href;
    const last = p.split('/').pop();
    if (/\.[a-z0-9]{2,5}$/i.test(last) && !/\.html?$/i.test(last)) return href;  // resim/pdf/xml
    p = p.replace(LANG_RE, '') || '/';
    p = p.replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '');
    const mapped = SLUGS[p.replace(/^\/+|\/+$/g, '').toLowerCase()];
    if (mapped) p = '/' + mapped;
    if (!prefix) return mapped ? p + tail : href;   // Türkçe: yalnızca adresi değişen sayfalara dokun
    return prefix + (p === '/' ? '/' : p) + tail;
  }

  function rewriteAllLinks(root) {
    (root || document).querySelectorAll('a[href]').forEach(a => {
      // Dil switcher linklerine dokunma (kendi mantığı var)
      if (a.closest('.lang-option, .lang-dropdown, .lang-switcher')) return;
      const original = a.getAttribute('href');
      const rewritten = rewrite(original);
      if (rewritten !== original) {
        a.setAttribute('href', rewritten);
        a.setAttribute('data-iu-orig-href', original);
      }
    });
  }

  // İlk çalıştırma
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => rewriteAllLinks());
  } else {
    rewriteAllLinks();
  }

  // Header injection sonrası tekrar (nav linkleri güncellensin)
  document.addEventListener('iu:header-injected', () => rewriteAllLinks());

  // Dinamik eklenen içerikler için: 500ms ve 2000ms sonra tekrar
  setTimeout(rewriteAllLinks, 500);
  setTimeout(rewriteAllLinks, 2000);

  // MutationObserver — sonradan eklenen linkleri (Supabase kartları, FAQ vs) de yakala
  if (typeof MutationObserver !== 'undefined') {
    const linkObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            if (node.tagName === 'A' && node.hasAttribute('href')) {
              const original = node.getAttribute('href');
              const rewritten = rewrite(original);
              if (rewritten !== original) node.setAttribute('href', rewritten);
            } else if (node.querySelectorAll) {
              rewriteAllLinks(node);
            }
          }
        }
      }
    });
    const start = () => linkObserver.observe(document.body, { childList: true, subtree: true });
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
  }

  // Tıklama anında son kontrol (geç eklenen linkler için emniyet)
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.closest('.lang-option, .lang-dropdown, .lang-switcher')) return;
    if (a.target && a.target !== '_self') return;
    const h = a.getAttribute('href'); const r = rewrite(h);
    if (r !== h) a.setAttribute('href', r);
  }, true);

  if (lang) console.log('[LangPreserve] Aktif dil:', lang, '— tüm internal linkler', prefix, 'ile prefix\'lendi');
})();

// ==================== LANGUAGE SWITCHER ====================
// Dil bayrağına tıklayınca URL'yi değiştir (/en/, /ar/, vs.)
// Event delegation: dropdown ne zaman DOM'a eklense yakalar
(function() {
  const SUPPORTED = ['tr', 'en', 'fr', 'de', 'ru', 'ar'];

  function switchLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    const path = location.pathname;
    // Mevcut dil prefix'ini kaldır
    let cleanPath = path.replace(/^\/(en|fr|de|ru|ar)(?=\/|$)/, '');
    cleanPath = cleanPath.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '');
    if (!cleanPath || cleanPath === '') cleanPath = '/';
    // Yeni URL: TR ise prefix'siz, diğerleri /xx prefix ile
    const newPath = lang === 'tr' ? cleanPath : ('/' + lang + (cleanPath === '/' ? '/' : cleanPath));
    console.log('[LangSwitch] ' + lang + ' → ' + newPath);
    window.location.href = newPath + location.search + location.hash;
  }

  // Global (translator.js ile paylaşımlı)
  window.__IUSwitchLang = switchLang;

  // Event delegation — capture phase ile Google Translate'in araya girmesini önle
  document.addEventListener('click', function(e) {
    // .lang-option ya da içindekiler
    const opt = e.target.closest && e.target.closest('.lang-option[data-lang]');
    if (!opt) return;
    e.preventDefault();
    e.stopPropagation();
    const lang = opt.getAttribute('data-lang');
    switchLang(lang);
  }, true); // capture: true

  // Sayfa yüklendiğinde current language göstergesini + href'leri güncelle
  function updateCurrentLangDisplay() {
    const path = location.pathname;
    const m = path.match(/^\/(en|fr|de|ru|ar)(\/|$)/);
    const current = m ? m[1] : 'tr';

    const currentEl = document.getElementById('currentLang');
    const currentFlagEl = document.getElementById('currentFlag');
    const codeMap = { tr: 'TR', en: 'EN', fr: 'FR', de: 'DE', ru: 'RU', ar: 'AR' };

    if (currentEl) currentEl.textContent = codeMap[current] || 'TR';

    const activeOpt = document.querySelector('.lang-option[data-lang="' + current + '"] .flag svg');
    if (activeOpt && currentFlagEl) currentFlagEl.innerHTML = activeOpt.outerHTML;

    document.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
    const activeLink = document.querySelector('.lang-option[data-lang="' + current + '"]');
    if (activeLink) activeLink.classList.add('active');

    // Her lang-option'a gerçek href ver (JS başarısız olsa bile browser navigate etsin)
    let cleanPath = path.replace(/^\/(en|fr|de|ru|ar)(?=\/|$)/, '');
    if (!cleanPath || cleanPath === '') cleanPath = '/';
    document.querySelectorAll('.lang-option[data-lang]').forEach(opt => {
      const lang = opt.getAttribute('data-lang');
      const newHref = lang === 'tr' ? cleanPath : ('/' + lang + (cleanPath === '/' ? '/' : cleanPath));
      opt.setAttribute('href', newHref);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCurrentLangDisplay);
  } else {
    updateCurrentLangDisplay();
  }
  // Header injection sonrası tekrar
  setTimeout(updateCurrentLangDisplay, 500);
  setTimeout(updateCurrentLangDisplay, 1500);
})();

// ==================== MOBİL MENÜ: SAĞDAN AÇILAN PANEL ====================
// Hamburger görünürken (TR/AR ≤968 px, EN/FR/DE/RU ≤1050 px) <html> "iu-mnav" sınıfını alır ve menü sağdan kayan
// tam boy panel olur (görünüm: nav.css). Panelin başlığı (logo + kapat), alttaki iletişim bloğu ve arkadaki karartma
// burada bir kez kurulur: index.html'in sabit header'ı ile unified-header.js'in header'ı aynı menüyü kullanır.
// Menü hamburger düğmesindeki onclick ile "open" sınıfı alır; bu kod sınıf değişimini izler.
function iuMobileMenu() {
  const mainNav = document.getElementById('mainNav');
  if (!mainNav || mainNav.__iuMenu) return;
  mainNav.__iuMenu = true;
  const menuToggle = document.querySelector('.menu-toggle');
  const root = document.documentElement;
  const tx = (key, fallback) => {
    const v = typeof window.t === 'function' ? window.t(key) : '';
    return v && v !== key ? v : fallback;
  };
  const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const isDrawer = () => root.classList.contains('iu-mnav');
  const isOpen = () => mainNav.classList.contains('open');
  const isClosing = () => root.classList.contains('iu-nav-closing');

  // Kapanış: panel önce kayarak çıkar ("open" sınıfı bu sürede kalır, içerik yerinden oynamaz), sonra kapanır
  let closingTimer = 0;
  function finishClose() {
    clearTimeout(closingTimer);
    root.classList.remove('iu-nav-closing');
    mainNav.classList.remove('open');
  }
  function close() {
    if (!isOpen()) return;
    if (!isDrawer() || reduceMotion()) { finishClose(); return; }
    if (isClosing()) return;
    const hadFocus = mainNav.contains(document.activeElement);
    root.classList.add('iu-nav-closing');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    mainNav.setAttribute('inert', '');
    if (hadFocus && menuToggle) menuToggle.focus({ preventScroll: true });   // odak hamburger düğmesine döner
    closingTimer = setTimeout(finishClose, 300);
  }

  // Küçük DOM yardımcısı (metinler textContent ile girer)
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => n.setAttribute(k, attrs[k]));
    (kids || []).forEach(k => n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k));
    return n;
  }

  // ---- Panelin başlığı: logo (ana sayfa) + kapat ----
  const closeBtn = el('button', { type: 'button', class: 'nav-close', 'aria-label': tx('nav.close', 'Menüyü kapat') },
    [el('i', { class: 'fa-solid fa-xmark', 'aria-hidden': 'true' })]);
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });   // açık alt liste kayarken kapanmasın
  const head = el('div', { class: 'nav-drawer-head' });
  const logo = document.querySelector('.header .logo');
  const home = el('a', { class: 'nav-drawer-logo notranslate', translate: 'no', href: (logo && logo.getAttribute('href')) || '/' });
  const svg = logo && logo.querySelector('svg');
  if (svg) {
    const c = svg.cloneNode(true);
    c.setAttribute('class', 'nav-drawer-logo-svg');
    c.removeAttribute('style');
    home.appendChild(c);
  } else {
    home.appendChild(document.createTextNode('TURYAP İsmail Ünsal'));
  }
  head.appendChild(home);
  head.appendChild(closeBtn);
  mainNav.insertBefore(head, mainNav.firstChild);
  // Giriş / Üye Ol başlığın hemen altında: ekrandaki sıra ile klavye / ekran okuyucu sırası aynı olsun
  const auth = Array.prototype.find.call(mainNav.children, c => c.classList.contains('nav-auth-mobile'));
  if (auth) mainNav.insertBefore(auth, head.nextSibling);

  // ---- En altta iletişim: iki danışmanın telefonu, WhatsApp, çalışma saatleri ----
  const contact = el('div', { class: 'nav-contact' });
  [['İsmail Ünsal', '+905075188482', '+90 507 518 84 82'], ['Ramazan Aydemir', '+905325013275', '+90 532 501 32 75']].forEach(p => {
    contact.appendChild(el('a', { class: 'nav-contact-call', href: 'tel:' + p[1] }, [
      el('span', { class: 'ncc-ico', 'aria-hidden': 'true' }, [el('i', { class: 'fa-solid fa-phone' })]),
      el('span', { class: 'ncc-txt notranslate', translate: 'no' }, [el('small', null, [p[0]]), el('span', { class: 'ncc-num' }, [p[2]])])
    ]));
  });
  contact.appendChild(el('a', { class: 'nav-contact-wa', href: 'https://wa.me/905075188482', target: '_blank', rel: 'noopener noreferrer' }, [
    el('i', { class: 'fa-brands fa-whatsapp', 'aria-hidden': 'true' }),
    el('span', { 'data-i18n': 'nav.contact.whatsapp' }, [tx('nav.contact.whatsapp', "WhatsApp'tan yazın")])
  ]));
  contact.appendChild(el('p', { class: 'nav-contact-hours' }, [
    el('i', { class: 'fa-solid fa-clock', 'aria-hidden': 'true' }),
    el('span', { 'data-i18n': 'topbar.hours' }, [tx('topbar.hours', 'Pzt-Cmt: 08:00 - 17:00')])
  ]));
  mainNav.appendChild(contact);

  // ---- Arkadaki karartma: dokununca kapanır (iPhone'da dokunmanın tıklama sayılması için kendi dinleyicisi var) ----
  const scrim = el('div', { class: 'nav-scrim', 'aria-hidden': 'true' });
  scrim.addEventListener('click', close);
  mainNav.parentNode.insertBefore(scrim, mainNav);

  if (menuToggle) {
    menuToggle.setAttribute('aria-controls', 'mainNav');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', tx('nav.menu', menuToggle.getAttribute('aria-label') || 'Menü'));
  }

  // ---- Panel mi, masaüstü menü mü? Karar CSS'teki hamburger kurallarında (dil ve genişlik) ----
  const headerCss = document.getElementById('iu-header-css');   // unified-header.js'in eklediği stil (yüklenmeden karar verme)
  function syncMode() {
    const cssReady = !headerCss || !!headerCss.sheet;
    const on = cssReady && !!menuToggle && getComputedStyle(menuToggle).display !== 'none';
    if (on !== isDrawer()) {
      if (!on && isOpen()) finishClose();             // masaüstüne geçince açık menü hemen kapanır
      root.classList.toggle('iu-mnav', on);
    }
    // ekran dışındaki kapalı panel klavyeye ve ekran okuyucuya görünmesin
    mainNav.toggleAttribute('inert', on && (!isOpen() || isClosing()));
  }

  // ---- Sayfa kaydırma kilidi (iPhone Safari dahil) ----
  // Kilit yalnızca overflow:hidden ile (CSS). Sayfa yerinden oynatılmaz: aşağı kaydırılmışken body'yi
  // position:fixed + top:-scrollY ile taşımak üst menüyü ve açılan menüyü ekranın dışına itiyor, ekran bembeyaz kalıyordu.
  let lockY = 0, touchY = 0;
  const onTouchStart = (e) => { if (e.touches && e.touches[0]) touchY = e.touches[0].clientY; };
  function preventBodyScroll(e) {
    if (!isOpen()) return;
    if (!mainNav.contains(e.target)) { e.preventDefault(); return; }   // arkadaki sayfa kaymasın
    // Panelin içi serbestçe kayar; yalnızca en üstte aşağı, en altta yukarı çekince durdur (sayfaya geçmesin)
    const y = e.touches && e.touches[0] ? e.touches[0].clientY : touchY;
    const dy = y - touchY;
    touchY = y;
    const atTop = mainNav.scrollTop <= 0;
    const atBottom = mainNav.scrollTop + mainNav.clientHeight >= mainNav.scrollHeight - 1;
    if ((atTop && dy > 0) || (atBottom && dy < 0)) e.preventDefault();
  }
  function syncBodyLock(open) {
    if (open) {
      if (document.body.classList.contains('iu-nav-open')) return;
      lockY = window.scrollY;
      root.classList.add('iu-nav-open');
      document.body.classList.add('iu-nav-open');
      document.body.style.top = '';
      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchmove', preventBodyScroll, { passive: false });
    } else if (document.body.classList.contains('iu-nav-open')) {
      root.classList.remove('iu-nav-open');
      document.body.classList.remove('iu-nav-open');
      document.body.style.top = '';
      // eski önbellekteki CSS sayfayı başa atmışsa eski yere dön (yeni CSS'te kaydırma değişmez)
      if (Math.abs(window.scrollY - lockY) > 2) window.scrollTo(0, lockY);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', preventBodyScroll);
    }
  }

  // ---- Açılış / kapanış ----
  let wasOpen = false;
  function closeSubLists() {
    mainNav.querySelectorAll('.nav-item.open').forEach(i => {
      i.classList.remove('open');
      const b = i.querySelector('.nav-sub-btn');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  function onNavClass() {
    const open = isOpen();
    syncBodyLock(open);
    if (open === wasOpen) return;
    wasOpen = open;
    if (menuToggle) menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    clearTimeout(closingTimer);
    root.classList.remove('iu-nav-closing');
    syncMode();
    if (open) {
      if (!isDrawer()) return;
      mainNav.scrollTop = 0;
      // odak panelin içine (kapat düğmesi); dokunarak açınca odak halkası görünmez
      setTimeout(() => { if (isOpen() && !isClosing()) closeBtn.focus({ preventScroll: true }); }, 40);
      return;
    }
    closeSubLists();                                 // bir sonraki açılış temiz başlasın
    // odak hâlâ paneldeyse hamburger düğmesine dönsün
    const a = document.activeElement;
    if (menuToggle && isDrawer() && a && mainNav.contains(a)) menuToggle.focus({ preventScroll: true });
  }
  new MutationObserver(onNavClass).observe(mainNav, { attributes: true, attributeFilter: ['class'] });

  // Menüdeki bir bağlantıya ya da Giriş / Üye Ol düğmesine dokununca menüyü kapat (sonradan eklenenler dahil)
  mainNav.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('a, .iu-authbar-btn') : null;
    if (t && mainNav.contains(t)) close();
  });
  // Alt liste açılınca panelin görünür alanına kaydır (en alttaki LÜKS gibi)
  mainNav.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('.nav-sub-btn') : null;
    if (!btn || !isDrawer()) return;
    const item = btn.closest('.nav-item');
    setTimeout(() => {
      if (!item || !item.classList.contains('open') || !isOpen()) return;
      const box = mainNav.getBoundingClientRect(), r = item.getBoundingClientRect();
      const over = r.bottom - box.bottom + 16;
      if (over <= 0) return;
      const room = r.top - box.top - head.offsetHeight;  // başlık satırı panelin üstünde sabit
      const by = Math.min(over, Math.max(0, room));
      if (by > 0) mainNav.scrollBy({ top: by, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }, reduceMotion() ? 0 : 300);
  });
  // Menü açıkken dışarıya dokunmak YALNIZCA menüyü kapatsın: alttaki ilan/link açılmasın
  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    const t = e.target;
    if (mainNav.contains(t) || (menuToggle && menuToggle.contains(t))) return;
    if (t && t.closest && t.closest('#iu-auth-modal, [role="dialog"], [aria-modal="true"]')) return;
    e.preventDefault();
    e.stopPropagation();
    close();
  }, true);

  // Klavye: Esc kapatır (açık alt listede önce liste kapanır), Tab panelin içinde döner
  const focusables = () => Array.prototype.filter.call(
    mainNav.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'),
    n => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden');
  document.addEventListener('keydown', (e) => {
    if (!isOpen() || !isDrawer() || isClosing()) return;
    if (e.key === 'Escape' || e.key === 'Esc') {
      const item = mainNav.querySelector('.nav-item.open');
      if (item && item.contains(document.activeElement)) return;
      e.preventDefault();
      e.stopPropagation();                           // açık alt liste panel kayarken kapanmasın
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!mainNav.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }, true);

  // Ekran boyutu / dil değişince yeniden karar ver (masaüstüne geçerken açık menü kapanır)
  let rz = 0;
  const queueSync = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(syncMode); };
  window.addEventListener('resize', queueSync);
  window.addEventListener('load', queueSync);
  if (headerCss && !headerCss.sheet) headerCss.addEventListener('load', queueSync);
  new MutationObserver(queueSync).observe(document.body, { attributes: true, attributeFilter: ['data-lang'] });
  syncMode();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iuMobileMenu); else iuMobileMenu();
document.addEventListener('iu:header-injected', iuMobileMenu);

document.addEventListener('DOMContentLoaded', () => {
  // Generic filter tabs (eski pillar pages için)
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Sub filter pills
  document.querySelectorAll('.sub-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const group = pill.parentElement;
      group.querySelectorAll('.sub-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
});
