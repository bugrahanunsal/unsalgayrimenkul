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

  async function loadAllScripts() {
    try {
      // 1. Önce Supabase SDK
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');

      // 2. Auth widget (Giriş/Hesabım butonları + modal)
      await loadScript('/subscribe-widget.js');

      // 3. Frontend database entegrasyonu (ilan listesi, FAQ, kategori sayaçları)
      await loadScript('/frontend-supabase.js');

      console.log('[SiteLoader] Tüm scriptler yüklendi ✓');
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
