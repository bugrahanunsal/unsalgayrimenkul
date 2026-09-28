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
      // Zaten yüklü mü kontrol
      if (document.querySelector('script[src="' + src + '"]') ||
          document.querySelector('script[src*="' + src.replace(/^\//, '') + '"]')) {
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
  const SITE_VERSION = '20260927-v8';

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

// ==================== MEVCUT UI KODLARI ====================

// ==================== UNIFIED HEADER MENU (HOMEPAGE STYLE) ====================
// Her sayfada TAMAMEN AYNI header menü (homepage'deki gibi) - kullanıcı isteği
// Her sayfanın kendi headerlarını kaldırıp homepage'deki HTML'i yerleştirir
(function unifiedHeaderInjection() {
  const path = window.location.pathname.toLowerCase();
  const isAdmin = path.includes('/admin');
  if (isAdmin) return;

  // Homepage'de zaten doğru header var, dokunma
  const isHomepage = path === '/' || path.endsWith('/index.html') || path === '/index';
  if (isHomepage) return;

  // Aktif sayfayı belirle - sıra önemli (özelden genele)
  function getActiveNav() {
    if (path.includes('yalova-satilik-arsa')) return 'arsa';
    if (path.includes('yalova-kiralik-villa')) return 'luks';
    if (path.includes('yalova-satilik')) return 'satilik';
    if (path.includes('yalova-kiralik') || path.includes('yalova-esyali') || path.includes('yalova-merkez-kiralik')) return 'kiralik';
    if (path.includes('/blog') || path.endsWith('blog.html')) return 'blog';
    if (path.includes('hakkimizda')) return 'hakkimizda';
    if (path.includes('iletisim')) return 'iletisim';
    if (path.includes('/sss') || path.endsWith('sss.html')) return 'sss';
    return '';
  }

  const active = getActiveNav();
  const cls = (name) => active === name ? ' class="active"' : '';

  // Homepage'deki EXACT top-bar + header HTML
  const headerHTML = `
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
        <a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
        <a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
        <a href="https://wa.me/905075188482" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
        <a href="#" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>
      </div>
      <div class="lang-switcher" id="langSwitcher">
        <div class="lang-current" id="langCurrent">
          <span class="flag" id="currentFlag"><svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#E30A17"/><circle cx="22" cy="20" r="8" fill="#fff"/><circle cx="24" cy="20" r="6.4" fill="#E30A17"/><polygon fill="#fff" points="32,20 28.5,21.1 30.7,18.2 30.7,21.8 28.5,18.9"/></svg></span>
          <span class="lang-code" id="currentLang">TR</span>
          <i class="fa-solid fa-chevron-down" style="font-size:10px"></i>
        </div>
        <div class="lang-dropdown">
          <a href="#" class="lang-option active" data-lang="tr"><span class="flag"><svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#E30A17"/><circle cx="22" cy="20" r="8" fill="#fff"/><circle cx="24" cy="20" r="6.4" fill="#E30A17"/><polygon fill="#fff" points="32,20 28.5,21.1 30.7,18.2 30.7,21.8 28.5,18.9"/></svg></span><span>Türkçe</span></a>
          <a href="#" class="lang-option" data-lang="en"><span class="flag"><svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" stroke-width="3"/><path d="M30,0 V40 M0,20 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V40 M0,20 H60" stroke="#C8102E" stroke-width="6"/></svg></span><span>English</span></a>
          <a href="#" class="lang-option" data-lang="fr"><span class="flag"><svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ED2939"/></svg></span><span>Français</span></a>
          <a href="#" class="lang-option" data-lang="de"><span class="flag"><svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#000"/><rect width="60" height="13.33" y="13.33" fill="#DD0000"/><rect width="60" height="13.34" y="26.66" fill="#FFCE00"/></svg></span><span>Deutsch</span></a>
          <a href="#" class="lang-option" data-lang="ru"><span class="flag"><svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#fff"/><rect width="60" height="13.33" y="13.33" fill="#0039A6"/><rect width="60" height="13.34" y="26.66" fill="#D52B1E"/></svg></span><span>Русский</span></a>
        </div>
      </div>
    </div>
  </div>
</div>

<header class="header">
  <div class="header-inner">
    <a href="index.html" class="logo">
      <svg class="logo-svg" viewBox="0 0 340 80" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="10" width="80" height="60" rx="4" fill="#0A2A5E"/>
        <text x="40" y="46" font-family="League Spartan, Montserrat, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">TURYAP</text>
        <line x1="92" y1="20" x2="92" y2="60" stroke="#0A2A5E" stroke-width="2"/>
        <text x="100" y="42" font-family="League Spartan, Montserrat, sans-serif" font-size="20" font-weight="800" fill="#0A2A5E" letter-spacing="2">İSMAİL ÜNSAL</text>
        <text x="100" y="60" font-family="Poppins, DM Sans, sans-serif" font-size="9" font-weight="600" fill="#555555" letter-spacing="3">REAL ESTATE</text>
      </svg>
    </a>
    <nav class="nav" id="mainNav">
      <a href="yalova-satilik-daire.html"${cls('satilik')} data-i18n="nav.satilik">SATILIK</a>
      <a href="yalova-kiralik-daire.html"${cls('kiralik')} data-i18n="nav.kiralik">KİRALIK</a>
      <a href="yalova-satilik-arsa.html"${cls('arsa')} data-i18n="nav.arsa">ARSA</a>
      <a href="yalova-kiralik-villa.html"${cls('luks')}><span data-i18n="nav.luks">LÜKS</span><span class="nav-badge" data-i18n="nav.luks.badge">YENİ</span></a>
      <a href="blog.html"${cls('blog')} data-i18n="nav.blog">BLOG</a>
      <a href="hakkimizda.html"${cls('hakkimizda')} data-i18n="nav.hakkimizda">HAKKIMIZDA</a>
      <a href="/sss"${cls('sss')}>SSS</a>
      <a href="iletisim.html"${cls('iletisim')} data-i18n="nav.iletisim">İLETİŞİM</a>
      <div data-iu-auth class="nav-auth-mobile"></div>
    </nav>
    <div class="header-cta">
      <a href="tel:+905075188482" class="btn-call"><i class="fa-solid fa-phone"></i> <span data-i18n="nav.cta">HEMEN ARA</span></a>
      <button class="menu-toggle" onclick="document.getElementById('mainNav').classList.toggle('open')" aria-label="Menü"><i class="fa-solid fa-bars"></i></button>
    </div>
  </div>
</header>
`;

  function replaceHeader() {
    // Var olan .top-bar ve .header'ı bul
    const existingTopBar = document.querySelector('body > .top-bar');
    const existingHeader = document.querySelector('body > header.header');

    // Yerleştirilecek konumu belirle (body'nin en üstü)
    const container = document.createElement('div');
    container.innerHTML = headerHTML.trim();
    // Blank text node'ları temizle
    const nodes = Array.from(container.childNodes).filter(n => n.nodeType === 1);

    // Eski headeri kaldır ve yerine yenisini koy
    if (existingTopBar) {
      const parent = existingTopBar.parentNode;
      const anchor = existingTopBar;
      nodes.forEach(n => parent.insertBefore(n, anchor));
      existingTopBar.remove();
    } else {
      // Top-bar yoksa body'nin başına ekle
      nodes.forEach(n => document.body.insertBefore(n, document.body.firstChild));
    }
    if (existingHeader) existingHeader.remove();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceHeader);
  } else {
    replaceHeader();
  }
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
  if (svgHtml.includes('TURYAP') && svgHtml.includes('İSMAİL ÜNSAL')) return;

  // Yeni logoyla değiştir
  const newLogoSvg = `
    <svg class="logo-svg" viewBox="0 0 340 80" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:16px">
      <rect x="0" y="10" width="80" height="60" rx="4" fill="#FFFFFF"/>
      <text x="40" y="46" font-family="League Spartan, Montserrat, sans-serif" font-size="18" font-weight="800" fill="#0A2A5E" text-anchor="middle" letter-spacing="2">TURYAP</text>
      <line x1="92" y1="20" x2="92" y2="60" stroke="#F49B1C" stroke-width="2"/>
      <text x="100" y="42" font-family="League Spartan, Montserrat, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF" letter-spacing="2">İSMAİL ÜNSAL</text>
      <text x="100" y="60" font-family="Poppins, DM Sans, sans-serif" font-size="9" font-weight="600" fill="#F49B1C" letter-spacing="3">REAL ESTATE</text>
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

// ==================== NAV MENÜYE SSS EKLE ====================
// Her sayfada nav menüsüne SSS linkini otomatik ekle (İLETİŞİM'den önce)
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  // Zaten var mı kontrol
  if (nav.querySelector('a[href*="/sss"], a[href="sss.html"]')) return;

  const sssLink = document.createElement('a');
  sssLink.href = '/sss';
  sssLink.textContent = 'SSS';

  // Aktif sayfa kontrolü
  if (window.location.pathname.toLowerCase().includes('/sss')) {
    sssLink.className = 'active';
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
    nav.insertBefore(sssLink, iletisimLink);
  } else {
    nav.appendChild(sssLink);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu close on link click
  const mainNav = document.getElementById('mainNav');
  const menuToggle = document.querySelector('.menu-toggle');
  if (mainNav) {
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => mainNav.classList.remove('open'));
    });
    document.addEventListener('click', (e) => {
      if (mainNav.classList.contains('open') && !mainNav.contains(e.target) && menuToggle && !menuToggle.contains(e.target)) {
        mainNav.classList.remove('open');
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 968) mainNav.classList.remove('open');
    });
  }

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
