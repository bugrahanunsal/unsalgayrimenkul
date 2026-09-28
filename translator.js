/**
 * ==================================================================
 * OTOMATİK DIL ÇEVİRİCİ v3 - İsmail Ünsal Gayrimenkul
 * ==================================================================
 * Client-side translation using MyMemory API + Google Translate fallback.
 * Türkçe orijinali kaynak alarak tüm metin nodelarını çevirir.
 * Cache: localStorage (aynı çeviri tekrar API çağırmaz).
 * ==================================================================
 */
(function() {
  'use strict';

  const SUPPORTED = ['tr', 'en', 'fr', 'de', 'ru', 'ar'];
  const path = location.pathname.toLowerCase();
  const langMatch = path.match(/^\/(en|fr|de|ru|ar)(\/|$)/);
  const currentLang = langMatch ? langMatch[1] : 'tr';

  // Globalde erişim
  window.IULang = {
    current: currentLang,
    supported: SUPPORTED,
    switchTo: function(lang) {
      if (!SUPPORTED.includes(lang)) return;
      let cleanPath = path.replace(/^\/(en|fr|de|ru|ar)(\/|$)/, '/');
      if (!cleanPath || cleanPath === '/') cleanPath = '/';
      const newPath = lang === 'tr' ? cleanPath : ('/' + lang + cleanPath);
      window.location.href = newPath + window.location.search + window.location.hash;
    }
  };

  // Body'ye data-lang attribute ekle (CSS matching)
  function setBodyLang() {
    if (document.body) document.body.setAttribute('data-lang', currentLang);
  }
  if (document.body) setBodyLang();
  else document.addEventListener('DOMContentLoaded', setBodyLang);

  // TR ise çeviri yapmaya gerek yok — orijinal içerik zaten Türkçe
  if (currentLang === 'tr') {
    console.log('[Translator] Türkçe — çeviri gereksiz');
    return;
  }

  // ============================================================
  // LOCALSTORAGE CACHE
  // ============================================================
  const CACHE_KEY = 'iu-trans-' + currentLang;
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) {}

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
  }

  // ============================================================
  // TRANSLATION APIS
  // ============================================================
  // Ücretsiz Google Translate proxy (Lingva) veya MyMemory
  const APIS = {
    // Google Translate ücretsiz endpoint (undocumented ama stabil)
    google: async function(text, targetLang) {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=' +
                  targetLang + '&dt=t&q=' + encodeURIComponent(text);
      const res = await fetch(url);
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map(s => s[0]).join('');
      }
      return null;
    },
    // MyMemory API (5000 char/gün free tier)
    mymemory: async function(text, targetLang) {
      const url = 'https://api.mymemory.translated.net/get?q=' +
                  encodeURIComponent(text) + '&langpair=tr|' + targetLang;
      const res = await fetch(url);
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
      return null;
    }
  };

  async function translateOne(text) {
    text = text.trim();
    if (!text || text.length < 2) return text;
    if (cache[text]) return cache[text];

    // Sayı-only, sembol-only atla
    if (/^[\d\s.,+\-–—:%€$₺£¥]+$/.test(text)) return text;

    // Önce Google, hata durumunda MyMemory
    let result = null;
    try {
      result = await APIS.google(text, currentLang);
    } catch (e) {
      try {
        result = await APIS.mymemory(text, currentLang);
      } catch (e2) {
        console.warn('[Translator] Çeviri başarısız:', text.substring(0, 40));
      }
    }

    if (result) {
      cache[text] = result;
      // Her 5 çeviride bir cache'i kaydet (performance)
      if (Math.random() < 0.2) saveCache();
      return result;
    }
    return text;
  }

  // ============================================================
  // DOM SCANNER
  // ============================================================
  const SKIP_TAGS = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'IFRAME', 'SVG', 'CANVAS', 'INPUT', 'TEXTAREA'];
  const SKIP_CLASSES = ['no-translate', 'notranslate', 'iu-hi-price', 'lang-code'];

  function shouldSkipElement(el) {
    if (!el || !el.tagName) return true;
    if (SKIP_TAGS.includes(el.tagName)) return true;
    if (el.hasAttribute('translate') && el.getAttribute('translate') === 'no') return true;
    if (el.classList) {
      for (const cls of SKIP_CLASSES) {
        if (el.classList.contains(cls)) return true;
      }
    }
    // Telefon numarası, email link — çevirme
    const href = el.getAttribute && el.getAttribute('href');
    if (href && (href.startsWith('tel:') || href.startsWith('mailto:'))) return true;
    return false;
  }

  function collectTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(
      root || document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const text = node.nodeValue;
          if (!text || !text.trim() || text.trim().length < 2) return NodeFilter.FILTER_REJECT;
          // Sayıdan/simgeden ibaret ise atla
          if (/^[\d\s.,+\-–—:%€$₺£¥\/()]+$/.test(text.trim())) return NodeFilter.FILTER_REJECT;
          // Parent element check
          let parent = node.parentElement;
          while (parent && parent !== document.body) {
            if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node;
    while (node = walker.nextNode()) nodes.push(node);
    return nodes;
  }

  // Batch translate with concurrency limit (max 4 aynı anda)
  async function translateBatch(nodes) {
    const CONCURRENCY = 4;
    let i = 0;
    async function worker() {
      while (i < nodes.length) {
        const idx = i++;
        const node = nodes[idx];
        const original = node.nodeValue;
        const translated = await translateOne(original);
        if (translated && translated !== original) {
          try {
            node.nodeValue = translated;
          } catch (e) { /* node may have been removed */ }
        }
      }
    }
    const workers = [];
    for (let w = 0; w < CONCURRENCY; w++) workers.push(worker());
    await Promise.all(workers);
    saveCache();
  }

  // Tüm sayfayı çevir
  let isTranslating = false;
  async function translatePage(root) {
    if (isTranslating) return;
    isTranslating = true;
    try {
      const nodes = collectTextNodes(root);
      if (nodes.length === 0) return;
      console.log('[Translator] ' + nodes.length + ' text node çevriliyor →', currentLang);
      await translateBatch(nodes);
      console.log('[Translator] Çeviri tamamlandı');
    } finally {
      isTranslating = false;
    }
  }

  // ============================================================
  // ATTRIBUTE TRANSLATION (placeholder, alt, title)
  // ============================================================
  async function translateAttributes(root) {
    const els = (root || document.body).querySelectorAll('[placeholder], [alt], [title]');
    const tasks = [];
    els.forEach(el => {
      if (shouldSkipElement(el)) return;
      ['placeholder', 'alt', 'title'].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val && val.trim().length > 2) {
          tasks.push(translateOne(val).then(translated => {
            if (translated && translated !== val) {
              try { el.setAttribute(attr, translated); } catch (e) {}
            }
          }));
        }
      });
    });
    await Promise.all(tasks);
    saveCache();
  }

  // ============================================================
  // İLK RENDER + DYNAMIC CONTENT (MutationObserver)
  // ============================================================
  function initTranslator() {
    // İlk çeviri
    translatePage();
    setTimeout(() => translateAttributes(), 800);

    // Dinamik olarak eklenen içerikleri de yakala (ilan kartları, FAQ)
    if (typeof MutationObserver !== 'undefined') {
      let pendingNodes = new Set();
      let timeoutId = null;
      const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (n.nodeType === 1) pendingNodes.add(n);
          }
        }
        // Debounce: 300ms sonra batch'i çevir
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          const toTranslate = Array.from(pendingNodes);
          pendingNodes.clear();
          for (const n of toTranslate) {
            await translatePage(n);
          }
        }, 300);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Header değişikliklerinde yeniden çevir
  document.addEventListener('iu:header-injected', () => {
    setTimeout(() => translatePage(), 200);
  });

  // Global expose
  window.__IURetranslate = function() {
    isTranslating = false;
    translatePage();
    translateAttributes();
  };

  // Başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTranslator);
  } else {
    initTranslator();
  }

  console.log('[Translator v3] Dil:', currentLang, '— Google Translate API + MyMemory fallback');
})();
