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
    return langPrefix + '/' + page.replace(/^\//, '');
  }

  // Determine which menu item is active from URL
  const cleanPath = path.replace(/^\/(en|fr|de|ru|ar)/, '') || '/';
  function isActive(match) {
    if (match === '/') return cleanPath === '/' || cleanPath === '/index.html';
    if (Array.isArray(match)) return match.some(m => cleanPath.includes(m));
    return cleanPath.includes(match);
  }

  // Menu items — CHANGE HERE, applies EVERYWHERE
  // Home page ile birebir aynı (SATILIK, KİRALIK, ARSA, LÜKS, BLOG, HAKKIMIZDA, İLETİŞİM)
  // i18n key'leri Türkçe formatta (nav.satilik, nav.kiralik vb.)
  const menuItems = [
    { href: lp('yalova-satilik-daire.html'), key: 'nav.satilik',    label: 'SATILIK',    match: ['satilik'] },
    { href: lp('yalova-kiralik-daire.html'), key: 'nav.kiralik',    label: 'KİRALIK',    match: ['kiralik'] },
    { href: lp('yalova-satilik-arsa.html'),  key: 'nav.arsa',       label: 'ARSA',       match: ['arsa'] },
    { href: lp('yalova-kiralik-villa.html'), key: 'nav.luks',       label: 'LÜKS',       match: ['kiralik-villa','villa'], badge: 'YENİ', badgeKey: 'nav.luks.badge' },
    { href: lp('blog.html'),                 key: 'nav.blog',       label: 'BLOG',       match: ['/blog'] },
    { href: lp('hakkimizda.html'),           key: 'nav.hakkimizda', label: 'HAKKIMIZDA', match: ['hakkimizda'] },
    { href: lp('iletisim.html'),             key: 'nav.iletisim',   label: 'İLETİŞİM',   match: ['iletisim'] }
  ];

  // Language flag SVGs (compact) — kept as data blobs
  const flagSVGs = {
    tr: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#E30A17"/><circle cx="22" cy="20" r="8" fill="#fff"/><circle cx="24" cy="20" r="6.4" fill="#E30A17"/><polygon fill="#fff" points="32,20 28.5,21.1 30.7,18.2 30.7,21.8 28.5,18.9"/></svg>',
    en: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" stroke-width="3"/><path d="M30,0 V40 M0,20 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V40 M0,20 H60" stroke="#C8102E" stroke-width="6"/></svg>',
    fr: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ED2939"/></svg>',
    de: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#000"/><rect width="60" height="13.33" y="13.33" fill="#DD0000"/><rect width="60" height="13.34" y="26.66" fill="#FFCE00"/></svg>',
    ru: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#fff"/><rect width="60" height="13.33" y="13.33" fill="#0039A6"/><rect width="60" height="13.34" y="26.66" fill="#D52B1E"/></svg>',
    ar: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#006C35"/></svg>'
  };
  const langNames = { tr: 'Türkçe', en: 'English', fr: 'Français', de: 'Deutsch', ru: 'Русский', ar: 'العربية' };

  // Build language dropdown pointing to current path in each language
  function buildLangDropdown() {
    const currentPage = path.replace(/^\/(en|fr|de|ru|ar)/, '') || '/';
    return ['tr','en','fr','de','ru','ar'].map(lang => {
      const url = (lang === 'tr' ? '' : '/' + lang) + (currentPage === '/' ? '/' : currentPage) + location.search + location.hash;
      const active = lang === currentLang ? ' active' : '';
      return `<a href="${url}" class="lang-option${active}"><span class="flag">${flagSVGs[lang]}</span><span>${langNames[lang]}</span></a>`;
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
      <span><i class="fa-solid fa-location-dot"></i> <span>Yalova, Türkiye</span></span>
      <span><i class="fa-solid fa-clock"></i> <span>Pzt-Cmt: 09:00 - 19:00</span></span>
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
          <span class="flag">${flagSVGs[currentLang]}</span>
          <span class="lang-code">${currentLang.toUpperCase()}</span>
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
      <svg class="logo-svg" viewBox="0 0 340 80" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="10" width="80" height="60" rx="4" fill="#0A2A5E"/>
        <text x="40" y="46" font-family="League Spartan, Montserrat, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">TURYAP</text>
        <line x1="92" y1="20" x2="92" y2="60" stroke="#0A2A5E" stroke-width="2"/>
        <text x="100" y="42" font-family="League Spartan, Montserrat, sans-serif" font-size="20" font-weight="800" fill="#0A2A5E" letter-spacing="2">İSMAİL ÜNSAL</text>
        <text x="100" y="60" font-family="Poppins, DM Sans, sans-serif" font-size="9" font-weight="600" fill="#555555" letter-spacing="3">REAL ESTATE</text>
      </svg>
    </a>
    <nav class="nav" id="mainNav">
      ${buildMenuHTML()}
      <!-- Mobile: hamburger içinde auth butonları (Giriş/Üye Ol veya user) -->
      <div data-iu-auth class="nav-auth-mobile"></div>
    </nav>
    <div class="header-cta">
      <a href="tel:+905075188482" class="btn-call"><i class="fa-solid fa-phone"></i> <span data-i18n="btn.callnow">HEMEN ARA</span></a>
      <button class="menu-toggle" aria-label="Menü" onclick="document.getElementById('mainNav').classList.toggle('open')"><i class="fa-solid fa-bars"></i></button>
    </div>
  </div>
</header>`;

  const fullHeaderHTML = topBarHTML + headerHTML;

  // ============================================================
  // INJECTION: Replace existing header OR prepend to body
  // ============================================================
  function inject() {
    // If DOM not ready, wait
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
      return;
    }

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

    // Wire up language switcher click behavior (unified)
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

    // Dispatch event so other scripts (auth widget, translator) know header is ready
    document.dispatchEvent(new CustomEvent('iu:header-injected'));
  }

  inject();
})();
