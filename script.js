// ============================================
// ÜNSAL GAYRIMENKUL - SHARED SCRIPTS
// Tüm landing page'ler için ortak JS
// ============================================

const flagSVG = {
  tr: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#E30A17"/><circle cx="22" cy="20" r="8" fill="#fff"/><circle cx="24" cy="20" r="6.4" fill="#E30A17"/><polygon fill="#fff" points="32,20 28.5,21.1 30.7,18.2 30.7,21.8 28.5,18.9"/></svg>',
  en: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" stroke-width="3"/><path d="M30,0 V40 M0,20 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V40 M0,20 H60" stroke="#C8102E" stroke-width="6"/></svg>',
  fr: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ED2939"/></svg>',
  de: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#000"/><rect width="60" height="13.33" y="13.33" fill="#DD0000"/><rect width="60" height="13.34" y="26.66" fill="#FFCE00"/></svg>',
  ru: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#fff"/><rect width="60" height="13.33" y="13.33" fill="#0039A6"/><rect width="60" height="13.34" y="26.66" fill="#D52B1E"/></svg>'
};
const langCodeMap = { tr: 'TR', en: 'EN', fr: 'FR', de: 'DE', ru: 'RU' };

function setLanguage(lang) {
  const currentFlag = document.getElementById('currentFlag');
  if (currentFlag && flagSVG[lang]) currentFlag.innerHTML = flagSVG[lang];
  const currentLang = document.getElementById('currentLang');
  if (currentLang) currentLang.textContent = langCodeMap[lang];
  document.querySelectorAll('.lang-option').forEach(a => {
    a.classList.toggle('active', a.getAttribute('data-lang') === lang);
  });
  localStorage.setItem('unsal-lang', lang);
  document.documentElement.setAttribute('lang', lang);
}

document.addEventListener('DOMContentLoaded', () => {
  // Language switcher
  const langSwitcher = document.getElementById('langSwitcher');
  const langCurrent = document.getElementById('langCurrent');
  if (langCurrent && langSwitcher) {
    langCurrent.addEventListener('click', (e) => {
      e.stopPropagation();
      langSwitcher.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!langSwitcher.contains(e.target)) langSwitcher.classList.remove('active');
    });
  }
  document.querySelectorAll('.lang-option').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setLanguage(a.getAttribute('data-lang'));
      if (langSwitcher) langSwitcher.classList.remove('active');
    });
  });

  // Load saved language
  const savedLang = localStorage.getItem('unsal-lang') || 'tr';
  setLanguage(savedLang);

  // Mobile menu
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

  // Filter tabs
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
