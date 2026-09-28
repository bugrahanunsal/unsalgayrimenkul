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
  const SITE_VERSION = '20260928-logo-big';

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

  // Mevcut dil URL prefix'i (/en, /ar vs.) — sayfa gecişlerinde koru
  const langMatch = path.match(/^\/(en|fr|de|ru|ar)(\/|$)/);
  const langPrefix = langMatch ? '/' + langMatch[1] : '';

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

  // Sayfaya dil prefix'i ekle (satilik-daire.html → /en/satilik-daire.html)
  const lp = (page) => langPrefix + '/' + page.replace(/^\//, '');

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
          <a href="#" class="lang-option" data-lang="ar"><span class="flag"><svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#000"/><rect width="60" height="13.34" y="13.33" fill="#fff"/><rect width="60" height="13.33" y="26.67" fill="#007A3D"/><polygon points="20,20 26,17 26,23" fill="#CE1126"/></svg></span><span>العربية</span></a>
        </div>
      </div>
    </div>
  </div>
</div>

<header class="header">
  <div class="header-inner">
    <a href="${langPrefix || '/'}" class="logo">
      <svg class="logo-svg" viewBox="0 0 340 80" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="10" width="80" height="60" rx="4" fill="#0A2A5E"/>
        <text x="40" y="46" font-family="League Spartan, Montserrat, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">TURYAP</text>
        <line x1="92" y1="20" x2="92" y2="60" stroke="#0A2A5E" stroke-width="2"/>
        <text x="100" y="42" font-family="League Spartan, Montserrat, sans-serif" font-size="20" font-weight="800" fill="#0A2A5E" letter-spacing="2">İSMAİL ÜNSAL</text>
        <text x="100" y="60" font-family="Poppins, DM Sans, sans-serif" font-size="9" font-weight="600" fill="#555555" letter-spacing="3">REAL ESTATE</text>
      </svg>
    </a>
    <nav class="nav" id="mainNav">
      <a href="${lp('yalova-satilik-daire')}"${cls('satilik')} data-i18n="nav.satilik">SATILIK</a>
      <a href="${lp('yalova-kiralik-daire')}"${cls('kiralik')} data-i18n="nav.kiralik">KİRALIK</a>
      <a href="${lp('yalova-satilik-arsa')}"${cls('arsa')} data-i18n="nav.arsa">ARSA</a>
      <a href="${lp('yalova-kiralik-villa')}"${cls('luks')}><span data-i18n="nav.luks">LÜKS</span><span class="nav-badge" data-i18n="nav.luks.badge">YENİ</span></a>
      <a href="${lp('blog')}"${cls('blog')} data-i18n="nav.blog">BLOG</a>
      <a href="${lp('hakkimizda')}"${cls('hakkimizda')} data-i18n="nav.hakkimizda">HAKKIMIZDA</a>
      <a href="${lp('faq')}"${cls('sss')} data-i18n="nav.sss">FAQ</a>
      <a href="${lp('iletisim')}"${cls('iletisim')} data-i18n="nav.iletisim">İLETİŞİM</a>
      <!-- .nav-auth-mobile kaldırıldı: header'da çift auth pill oluyordu.
           Top-bar'daki .topbar-auth zaten yeterli, mobil hamburger menüsünde
           auth widget gerekmez. -->
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

    // TURYAP marka SVG'sinin ve dil kodlarının çevrilmesini engelle
    document.querySelectorAll('.logo svg, .lang-code, .flag, .nav-badge, [data-iu-auth]').forEach(el => {
      el.setAttribute('translate', 'no');
      el.classList.add('notranslate');
    });

    // Header değişti — dinleyenlere bildir (translator.js Google Translate'i tekrar tetikler)
    document.dispatchEvent(new CustomEvent('iu:header-injected'));
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

// ==================== NAV MENÜYE FAQ EKLE ====================
// Her sayfada nav menüsüne FAQ linkini otomatik ekle (İLETİŞİM'den önce)
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  // Zaten var mı kontrol (eski /sss link'i varsa güncelle)
  const existing = nav.querySelector('a[href*="/sss"], a[href="sss.html"], a[href*="/faq"], a[href="faq.html"]');
  if (existing) {
    existing.setAttribute('href', '/faq');
    existing.setAttribute('data-i18n', 'nav.sss');
    existing.textContent = 'FAQ';
    return;
  }

  // Nav'da metin olarak 'SSS' geçen link var mı? (bazı sayfalarda text-based)
  const allLinks = nav.querySelectorAll('a');
  for (const a of allLinks) {
    const t = (a.textContent || '').trim().toUpperCase();
    if (t === 'SSS' || t === 'FAQ') {
      a.setAttribute('href', '/faq');
      a.setAttribute('data-i18n', 'nav.sss');
      a.textContent = 'FAQ';
      return;
    }
  }

  const faqLink = document.createElement('a');
  faqLink.href = '/faq';
  faqLink.textContent = 'FAQ';
  faqLink.setAttribute('data-i18n', 'nav.sss');

  // Aktif sayfa kontrolü
  const p = window.location.pathname.toLowerCase();
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
  if (!m) return; // Türkçe (kök URL) — rewrite gereksiz
  const lang = m[1];
  const prefix = '/' + lang;

  function shouldSkip(href) {
    if (!href) return true;
    if (href.startsWith('#')) return true;
    if (href.startsWith('tel:')) return true;
    if (href.startsWith('mailto:')) return true;
    if (href.startsWith('javascript:')) return true;
    if (href.startsWith('http://') || href.startsWith('https://')) return true;
    if (href.startsWith('//')) return true;
    if (href.startsWith('data:')) return true;
    // Zaten dil prefix'i varsa dokunma
    if (href.match(/^\/(en|fr|de|ru|ar)(\/|$|\?)/)) return true;
    // Admin panele dokunma (backend, dil bağımsız)
    if (href.startsWith('/admin')) return true;
    return false;
  }

  function rewrite(href) {
    if (shouldSkip(href)) return href;
    // "/foo" veya "foo.html" veya "/foo.html" — hepsini /xx/foo formatına çevir
    let clean = href.startsWith('/') ? href : ('/' + href);
    return prefix + clean;
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

  console.log('[LangPreserve] Aktif dil:', lang, '— tüm internal linkler', prefix, 'ile prefix\'lendi');
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

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu close on link click + body scroll lock
  const mainNav = document.getElementById('mainNav');
  const menuToggle = document.querySelector('.menu-toggle');

  // Body scroll lock helper (iOS Safari uyumlu): .nav.open class değiştiğinde uygula
  let scrollY = 0;
  // Menü içindeki scroll'a izin ver, arkasına yasak
  function preventBodyScroll(e) {
    const nav = document.getElementById('mainNav');
    if (!nav || !nav.classList.contains('open')) return;
    // Nav içindeki dokunma ise: içinde scroll edebilsin
    if (nav.contains(e.target)) {
      // Bottom veya top'a dayanmışsa preventDefault
      const el = nav;
      if (el.scrollTop <= 0 && e.touches && e.touches[0]) {
        // top'ta ve aşağı çekiyorsa engelle
        if (e.type === 'touchmove') e.preventDefault();
      }
      return; // İçeride serbest
    }
    // Arka planda scroll'u iptal et
    e.preventDefault();
  }
  function syncBodyLock(nav) {
    if (!nav) return;
    const isOpen = nav.classList.contains('open');
    if (isOpen) {
      scrollY = window.scrollY;
      document.documentElement.classList.add('iu-nav-open');
      document.body.classList.add('iu-nav-open');
      document.body.style.top = '-' + scrollY + 'px';
      // iOS için touchmove'u engelle
      document.addEventListener('touchmove', preventBodyScroll, { passive: false });
    } else if (document.body.classList.contains('iu-nav-open')) {
      document.documentElement.classList.remove('iu-nav-open');
      document.body.classList.remove('iu-nav-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
      document.removeEventListener('touchmove', preventBodyScroll);
    }
  }

  if (mainNav) {
    // Nav'da class değişimini izle (menu-toggle butonu toggle ediyor)
    const observer = new MutationObserver(() => syncBodyLock(mainNav));
    observer.observe(mainNav, { attributes: true, attributeFilter: ['class'] });

    // Link'e tıklanınca menüyü kapat
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => mainNav.classList.remove('open'));
    });
    // Dışına tıklanınca menüyü kapat
    document.addEventListener('click', (e) => {
      if (mainNav.classList.contains('open') && !mainNav.contains(e.target) && menuToggle && !menuToggle.contains(e.target)) {
        mainNav.classList.remove('open');
      }
    });
    // Ekran büyüyünce menüyü kapat
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
