// ============================================
// ÜNSAL GAYRIMENKUL - SHARED SCRIPTS
// Dil sistemi: translations.js dosyasında
// ============================================

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
