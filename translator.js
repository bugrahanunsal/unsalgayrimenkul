/**
 * ==================================================================
 * OTOMATİK DIL ÇEVİRİCİ - İsmail Ünsal Gayrimenkul
 * ==================================================================
 * Türkçe orijinali kaynak alarak Google Translate ile otomatik çeviri.
 * Desteklenen diller: TR (orijinal), EN, FR, DE, RU, AR
 * URL yapısı: /en/yalova-satilik-arsa, /ar/yalova-satilik-arsa, vs.
 * Arapça için otomatik RTL (right-to-left) desteği.
 * ==================================================================
 */
(function() {
  'use strict';

  const SUPPORTED = ['tr', 'en', 'fr', 'de', 'ru', 'ar'];
  const path = location.pathname.toLowerCase();

  // URL'den dil tespit et: /en/xxx, /ar/xxx, vs. yoksa TR
  const langMatch = path.match(/^\/(en|fr|de|ru|ar)(\/|$)/);
  const currentLang = langMatch ? langMatch[1] : 'tr';

  // Globale kaydet (diğer scriptler kullanabilir)
  window.IULang = {
    current: currentLang,
    supported: SUPPORTED,

    // Dil değiştir: /en/current-path'e git
    switchTo: function(lang) {
      if (!SUPPORTED.includes(lang)) return;
      // Mevcut path'ten dil prefix'ini çıkar
      let cleanPath = path.replace(/^\/(en|fr|de|ru|ar)(\/|$)/, '/');
      if (!cleanPath || cleanPath === '/') cleanPath = '/';
      // Yeni URL oluştur
      const newPath = lang === 'tr' ? cleanPath : ('/' + lang + cleanPath);
      window.location.href = newPath + window.location.search + window.location.hash;
    }
  };

  // HTML lang attribute'ünü güncelle (SEO için)
  document.documentElement.lang = currentLang;

  // Arapça ise RTL layout
  if (currentLang === 'ar') {
    document.documentElement.dir = 'rtl';
    // Body'ye class ekle (RTL CSS için)
    if (document.body) {
      document.body.classList.add('iu-rtl');
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.classList.add('iu-rtl'));
    }
    // RTL CSS override (metin sağdan sola, ama sayılar/fiyatlar solda kalır)
    if (!document.getElementById('iu-rtl-css')) {
      const s = document.createElement('style');
      s.id = 'iu-rtl-css';
      s.textContent = `
        html[dir="rtl"] body { direction: rtl; text-align: right; }
        html[dir="rtl"] .top-info, html[dir="rtl"] .top-right,
        html[dir="rtl"] .header-inner, html[dir="rtl"] .nav,
        html[dir="rtl"] .footer-inner { direction: rtl; }
        html[dir="rtl"] .iu-cta-call, html[dir="rtl"] .iu-cta-wa,
        html[dir="rtl"] .btn-call, html[dir="rtl"] .listing-price-pillar,
        html[dir="rtl"] .iu-price, html[dir="rtl"] .iu-card-v2__price,
        html[dir="rtl"] a[href^="tel:"] { direction: ltr; unicode-bidi: embed; }
        html[dir="rtl"] .iu-card-v2 { text-align: right; }
        html[dir="rtl"] .iu-card-v2__feats { direction: rtl; }
      `;
      document.head.appendChild(s);
    }
  }

  // TR ise çeviri yapma — orijinal içerik zaten Türkçe
  if (currentLang === 'tr') return;

  // ============================================================
  // GOOGLE TRANSLATE WIDGET (ücretsiz, güvenilir, kaliteli)
  // ============================================================
  // Widget'ı sayfaya ekle ve otomatik tetikle. UI gizli, sadece
  // arka planda çalışacak.
  function initGoogleTranslate() {
    // Gizli container
    if (!document.getElementById('google_translate_element')) {
      const div = document.createElement('div');
      div.id = 'google_translate_element';
      div.style.cssText = 'position:absolute;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
      document.body.appendChild(div);
    }

    // Widget başlatıldığında dili otomatik seç
    window.googleTranslateElementInit = function() {
      try {
        new window.google.translate.TranslateElement({
          pageLanguage: 'tr',
          includedLanguages: SUPPORTED.filter(l => l !== 'tr').join(','),
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');
        // Widget yüklendikten sonra dili değiştir
        setTimeout(() => selectLanguage(currentLang), 500);
      } catch (err) {
        console.warn('[Translator] Google Translate init hatası:', err);
      }
    };

    // Google Translate script'i yükle
    if (!document.querySelector('script[src*="translate.google.com/translate_a"]')) {
      const s = document.createElement('script');
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.async = true;
      s.onerror = () => console.warn('[Translator] Google Translate yüklenemedi');
      document.body.appendChild(s);
    }
  }

  // Widget'taki dili programmatik seç (globalde expose et — dışarıdan da çağrılabilir)
  function selectLanguage(lang) {
    let attempts = 0;
    const maxAttempts = 30; // 30 * 200ms = 6 saniye

    function tryClick() {
      const select = document.querySelector('.goog-te-combo, select.goog-te-combo');
      if (select) {
        select.value = lang;
        select.dispatchEvent(new Event('change'));
        console.log('[Translator] Dil değiştirildi:', lang);
        return true;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryClick, 200);
      } else {
        console.warn('[Translator] Google Translate combo bulunamadı');
      }
      return false;
    }
    tryClick();
  }

  // Global: header sonradan enjekte edilirse çeviriyi tekrar tetikle
  // Google Translate combo'yu önce boşalt sonra hedefe getir → tam re-scan
  window.__IURetranslate = function() {
    function force() {
      const select = document.querySelector('.goog-te-combo, select.goog-te-combo');
      if (!select) return false;
      // Önce Türkçe'ye (kaynak) — mevcut çeviriyi sıfırla
      select.value = '';
      select.dispatchEvent(new Event('change'));
      // Kısa gecikme, sonra tekrar hedef dile
      setTimeout(() => {
        const s2 = document.querySelector('.goog-te-combo, select.goog-te-combo');
        if (s2) {
          s2.value = currentLang;
          s2.dispatchEvent(new Event('change'));
        }
      }, 250);
      return true;
    }
    // Combo hazır olana kadar dene
    let tries = 0;
    (function attempt() {
      if (force() || ++tries > 20) return;
      setTimeout(attempt, 250);
    })();
  };

  // Header injection eventini dinle — yeni içerik geldiğinde tekrar çevir
  document.addEventListener('iu:header-injected', () => {
    console.log('[Translator] Header enjekte edildi, tekrar çeviri tetikleniyor');
    window.__IURetranslate();
  });

  // Google Translate widget UI'sını gizle (banner, tooltip, vs.)
  function hideGoogleUI() {
    if (document.getElementById('iu-hide-gt-css')) return;
    const s = document.createElement('style');
    s.id = 'iu-hide-gt-css';
    s.textContent = `
      /* Google Translate widget'ını görsel olarak gizle */
      .goog-te-banner-frame, .skiptranslate,
      #goog-gt-tt, .goog-te-balloon-frame,
      div.goog-te-gadget-simple { display: none !important; }
      body { top: 0 !important; }
      /* Highlighted çeviri stilleri temizle */
      .goog-text-highlight { background: none !important; box-shadow: none !important; }
      /* iframe barını gizle */
      iframe.goog-te-banner-frame { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  // Başlat
  hideGoogleUI();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGoogleTranslate);
  } else {
    initGoogleTranslate();
  }

  console.log('[Translator] Dil:', currentLang, '— Google Translate ile otomatik çeviri aktif');
})();
