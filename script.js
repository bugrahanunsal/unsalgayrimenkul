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
  const SITE_VERSION = '20260929-logo';

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
