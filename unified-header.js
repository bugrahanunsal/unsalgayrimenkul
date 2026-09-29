/**
 * ==================================================================
 * UNIFIED HEADER v1 — Tüm sayfalar için tek header/top-bar
 * ==================================================================
 * Runs EARLY in <head> or top of <body>. Replaces any existing
 * <div class="top-bar"> and <header class="header"> with the
 * unified template. Menu is defined ONCE here; changing it changes
 * every page.
 *
 * Usage in HTML:
 *   <script src="/unified-header.js?v=..."></script>
 * Placed AFTER <body> opening tag, or as the FIRST script in body.
 * Old <div class="top-bar"> and <header> in HTML are replaced.
 * If neither exists, unified header is prepended to <body>.
 * ==================================================================
 */
(function() {
  'use strict';

  // Detect language from URL prefix
  const path = location.pathname.toLowerCase();
  const langMatch = path.match(/^\/(en|fr|de|ru|ar)(\/|$)/);
  const currentLang = langMatch ? langMatch[1] : 'tr';
  const langPrefix = currentLang === 'tr' ? '' : '/' + currentLang;

  // Language-aware URL builder
  function lp(page) {
    // .html uzantısız temiz URL: Cloudflare "/ar/x.html" → "/x" yönlendirmesi dili düşürüyordu
    return langPrefix + '/' + page.replace(/^\//, '').replace(/\.html$/i, '');
  }

  // Determine which menu item is active from URL
  const cleanPath = path.replace(/^\/(en|fr|de|ru|ar)/, '') || '/';
  function isActive(match) {
    if (match === '/') return cleanPath === '/' || cleanPath === '/index.html';
    if (Array.isArray(match)) return match.some(m => cleanPath.includes(m));
    return cleanPath.includes(match);
  }

  // Menu items — CHANGE HERE, applies EVERYWHERE
  // Home page ile birebir aynı: SATILIK, KİRALIK, ARSA, LÜKS(YENİ), BLOG, HAKKIMIZDA, FAQ, İLETİŞİM
  // i18n key'leri Türkçe formatta (nav.satilik, nav.kiralik vb.)
  const menuItems = [
    { href: lp('yalova-satilik-daire.html'), key: 'nav.satilik',    label: 'SATILIK',    match: ['satilik-daire','satilik-ev'] },
    { href: lp('yalova-kiralik-daire.html'), key: 'nav.kiralik',    label: 'KİRALIK',    match: ['kiralik-daire','kiralik-ev','esyali-kiralik','merkez-kiralik'] },
    { href: lp('yalova-satilik-arsa.html'),  key: 'nav.arsa',       label: 'ARSA',       match: ['satilik-arsa'] },
    { href: lp('yalova-kiralik-villa.html'), key: 'nav.luks',       label: 'LÜKS',       match: ['kiralik-villa'], badge: 'YENİ', badgeKey: 'nav.luks.badge' },
    { href: lp('blog.html'),                 key: 'nav.blog',       label: 'BLOG',       match: ['/blog'] },
    { href: lp('hakkimizda.html'),           key: 'nav.hakkimizda', label: 'HAKKIMIZDA', match: ['hakkimizda'] },
    { href: lp('faq.html'),                  key: 'nav.sss',        label: 'FAQ',        match: ['faq','sss'] },
    { href: lp('iletisim.html'),             key: 'nav.iletisim',   label: 'İLETİŞİM',   match: ['iletisim'] }
  ];

  // Language flag SVGs (compact) — kept as data blobs
  const flagSVGs = {
    tr: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#E30A17"/><circle cx="22" cy="20" r="8" fill="#fff"/><circle cx="24" cy="20" r="6.4" fill="#E30A17"/><polygon fill="#fff" points="32,20 28.5,21.1 30.7,18.2 30.7,21.8 28.5,18.9"/></svg>',
    en: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" stroke-width="3"/><path d="M30,0 V40 M0,20 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V40 M0,20 H60" stroke="#C8102E" stroke-width="6"/></svg>',
    fr: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ED2939"/></svg>',
    de: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#000"/><rect width="60" height="13.33" y="13.33" fill="#DD0000"/><rect width="60" height="13.34" y="26.66" fill="#FFCE00"/></svg>',
    ru: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#fff"/><rect width="60" height="13.33" y="13.33" fill="#0039A6"/><rect width="60" height="13.34" y="26.66" fill="#D52B1E"/></svg>',
    ar: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#000"/><rect width="60" height="13.34" y="13.33" fill="#fff"/><rect width="60" height="13.33" y="26.67" fill="#007A3D"/><polygon points="20,20 26,17 26,23" fill="#CE1126"/></svg>'
  };
  const langNames = { tr: 'Türkçe', en: 'English', fr: 'Français', de: 'Deutsch', ru: 'Русский', ar: 'العربية' };

  // Build language dropdown pointing to current path in each language
  function buildLangDropdown() {
    const currentPage = path.replace(/^\/(en|fr|de|ru|ar)/, '').replace(/\/index\.html$/i, '/').replace(/\.html$/i, '') || '/';
    return ['tr','en','fr','de','ru','ar'].map(lang => {
      const url = (lang === 'tr' ? '' : '/' + lang) + (currentPage === '/' ? '/' : currentPage) + location.search + location.hash;
      const active = lang === currentLang ? ' active' : '';
      return `<a href="${url}" class="lang-option${active}" data-lang="${lang}"><span class="flag">${flagSVGs[lang]}</span><span>${langNames[lang]}</span></a>`;
    }).join('');
  }

  // Menu items HTML — home page ile birebir aynı format
  function buildMenuHTML() {
    return menuItems.map(item => {
      const active = isActive(item.match) ? ' class="active"' : '';
      if (item.badge) {
        // LÜKS gibi: <a><span data-i18n>LÜKS</span><span class="nav-badge" data-i18n>YENİ</span></a>
        return `<a href="${item.href}"${active}><span data-i18n="${item.key}">${item.label}</span><span class="nav-badge" data-i18n="${item.badgeKey || 'nav.luks.badge'}">${item.badge}</span></a>`;
      }
      return `<a href="${item.href}"${active} data-i18n="${item.key}">${item.label}</a>`;
    }).join('\n      ');
  }

  // TOP BAR (upper strip with phone, socials, language)
  const topBarHTML = `
<div class="top-bar">
  <div class="top-bar-inner">
    <div class="top-info">
      <span><i class="fa-solid fa-location-dot"></i> <span data-i18n="topbar.location">Yalova, Türkiye</span></span>
      <span><i class="fa-solid fa-clock"></i> <span data-i18n="topbar.hours">Pzt-Cmt: 09:00 - 19:00</span></span>
      <span><i class="fa-solid fa-phone"></i> +90 507 518 84 82</span>
    </div>
    <div class="top-right">
      <div data-iu-auth class="topbar-auth"></div>
      <div class="top-social">
        <a href="https://www.instagram.com/" target="_blank" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
        <a href="https://www.facebook.com/" target="_blank" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
        <a href="https://wa.me/905075188482" target="_blank" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
        <a href="https://www.youtube.com/" target="_blank" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>
      </div>
      <div class="lang-switcher" id="langSwitcher">
        <div class="lang-current" id="langCurrent">
          <span class="flag" id="currentFlag">${flagSVGs[currentLang]}</span>
          <span class="lang-code" id="currentLang">${currentLang.toUpperCase()}</span>
          <i class="fa-solid fa-chevron-down" style="font-size:10px"></i>
        </div>
        <div class="lang-dropdown">${buildLangDropdown()}</div>
      </div>
    </div>
  </div>
</div>`;

  // MAIN HEADER (logo + nav + CTA)
  const headerHTML = `
<header class="header">
  <div class="header-inner">
    <a href="${langPrefix || ''}/" class="logo" aria-label="Ana Sayfa">
      <svg class="logo-svg" viewBox="0 0 340 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TURYAP İsmail Ünsal Real Estate">
        <rect x="0" y="10" width="80" height="60" rx="4" fill="#0A2A5E"/>
        <text x="40" y="46" font-family="League Spartan, Montserrat, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">TURYAP</text>
        <line x1="93" y1="18" x2="93" y2="62" stroke="#0A2A5E" stroke-opacity="0.25" stroke-width="1.5"/>
        <text x="106" y="41" font-family="Poppins, DM Sans, sans-serif" font-size="21" font-weight="800" letter-spacing="1.2"><tspan fill="#0A2A5E">İSMAİL </tspan><tspan fill="#2563EB">ÜNSAL</tspan></text>
        <text x="107" y="60" font-family="Poppins, DM Sans, sans-serif" font-size="8.5" font-weight="600" fill="#6B7280" letter-spacing="3.6">REAL ESTATE</text>
      </svg>
    </a>
    <nav class="nav" id="mainNav">
      ${buildMenuHTML()}
      <!-- Mobile: hamburger içinde auth butonları (Giriş/Üye Ol veya user) -->
      <div data-iu-auth class="nav-auth-mobile"></div>
    </nav>
    <div class="header-cta">
      <a href="tel:+905075188482" class="btn-call"><i class="fa-solid fa-phone"></i> <span data-i18n="nav.cta">HEMEN ARA</span></a>
      <button class="menu-toggle" aria-label="Menü" onclick="document.getElementById('mainNav').classList.toggle('open')"><i class="fa-solid fa-bars"></i></button>
    </div>
  </div>
</header>`;

  const fullHeaderHTML = topBarHTML + headerHTML;

  // ============================================================
  // INJECTION: Replace existing header OR prepend to body
  // ============================================================
  const HEADER_CSS_VERSION = '20260929-admin';

  // Add a stylesheet once. toBodyEnd=true → appended at end of <body> so it
  // wins the cascade over page-specific header CSS. skipIfMatch → skip when
  // an existing <link> href already contains that text (e.g. font-awesome).
  function ensureStylesheet(href, id, toBodyEnd, skipIfMatch) {
    if (document.getElementById(id)) return;
    if (skipIfMatch && document.querySelector('link[href*="' + skipIfMatch + '"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.id = id;
    (toBodyEnd ? document.body : document.head).appendChild(link);
  }

  function inject() {
    // If DOM not ready, wait
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
      return;
    }

    // Tek kaynak header stili — body'nin EN SONUNA eklenir ki sayfaların
    // kendi (farklı) header CSS'lerinden sonra gelsin ve home page ile
    // birebir aynı görünüm garanti olsun.
    ensureStylesheet('/header.css?v=' + HEADER_CSS_VERSION, 'iu-header-css', true);
    ensureStylesheet('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', 'iu-fa-css', false, 'font-awesome');
    ensureStylesheet('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=League+Spartan:wght@400;500;600;700;800;900&display=swap', 'iu-fonts-css', false, 'League+Spartan');

    // Hesabım / verify / unsubscribe sayfalarındaki eski mini header'ı kaldır
    document.querySelectorAll('header.site-header').forEach(h => h.remove());

    const existingTopbar = document.querySelector('.top-bar');
    const existingHeader = document.querySelector('header.header');

    if (existingTopbar && existingHeader) {
      // Replace: remove both, insert unified before first sibling
      const parent = existingTopbar.parentNode;
      const nextSibling = existingHeader.nextSibling;
      existingTopbar.remove();
      existingHeader.remove();
      // Insert unified header HTML at the position
      const wrapper = document.createElement('div');
      wrapper.innerHTML = fullHeaderHTML.trim();
      // Move all children (top-bar + header) to parent
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, nextSibling);
      }
      console.log('[UnifiedHeader] Replaced existing top-bar + header');
    } else if (existingHeader) {
      // Only header exists
      const parent = existingHeader.parentNode;
      const nextSibling = existingHeader.nextSibling;
      existingHeader.remove();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = fullHeaderHTML.trim();
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, nextSibling);
      }
      console.log('[UnifiedHeader] Replaced existing header');
    } else {
      // Nothing exists — prepend to body
      const wrapper = document.createElement('div');
      wrapper.innerHTML = fullHeaderHTML.trim();
      while (wrapper.lastChild) {
        document.body.insertBefore(wrapper.lastChild, document.body.firstChild);
      }
      console.log('[UnifiedHeader] Prepended to body');
    }

    // Dil menüsü aç/kapa: translations.js zaten bağlıyorsa (home page ile aynı)
    // tekrar bağlama — iki kez bağlanırsa toggle iki kez çalışır ve menü açılmaz.
    if (typeof window.switchLanguageURL !== 'function') {
      const switcher = document.getElementById('langSwitcher');
      const current = document.getElementById('langCurrent');
      if (current && switcher) {
        current.addEventListener('click', (e) => {
          e.stopPropagation();
          switcher.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
          if (!switcher.contains(e.target)) switcher.classList.remove('active');
        });
      }
    }

    // TURYAP logosu, dil kodları, bayraklar ve auth alanı Google Translate ile çevrilmesin
    document.querySelectorAll('.logo svg, .lang-code, .flag, .nav-badge, [data-iu-auth]').forEach(el => {
      el.setAttribute('translate', 'no');
      el.classList.add('notranslate');
    });

    // Dispatch event so other scripts (auth widget, translator) know header is ready
    document.dispatchEvent(new CustomEvent('iu:header-injected'));
  }

  inject();
})();
