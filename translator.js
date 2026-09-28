/**
 * ==================================================================
 * OTOMATİK DIL ÇEVİRİCİ v4 - İsmail Ünsal Gayrimenkul
 * ==================================================================
 * FAST batch translation:
 *   - Groups up to ~30 text nodes into a single API call (joined
 *     with a paragraph marker Google Translate preserves)
 *   - 6 parallel batches at a time  →  typical page in ~3-6s
 *   - Pre-seeds cache from window.translations (menu, buttons etc.
 *     never hit the network)
 *   - Proper queue instead of a blocking flag, so MutationObserver
 *     (FAQ, dynamic listings) never gets dropped mid-load
 *   - localStorage cache per language (repeat visits: instant)
 *
 * Security: no keys, no tokens, no admin/service_role exposure.
 * Only public Google Translate + MyMemory endpoints.
 * ==================================================================
 */
(function() {
  'use strict';

  const SUPPORTED = ['tr', 'en', 'fr', 'de', 'ru', 'ar'];
  const path = location.pathname.toLowerCase();
  const langMatch = path.match(/^\/(en|fr|de|ru|ar)(\/|$)/);
  const currentLang = langMatch ? langMatch[1] : 'tr';

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

  function setBodyLang() {
    if (document.body) document.body.setAttribute('data-lang', currentLang);
  }
  if (document.body) setBodyLang();
  else document.addEventListener('DOMContentLoaded', setBodyLang);

  if (currentLang === 'tr') {
    console.log('[Translator v4] Türkçe — çeviri gereksiz');
    return;
  }

  // ============================================================
  // CACHE (localStorage per language)
  // ============================================================
  const CACHE_KEY = 'iu-trans-' + currentLang;
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) {}

  let cacheDirty = false;
  let cacheSaveTimer = null;
  function scheduleSaveCache() {
    cacheDirty = true;
    if (cacheSaveTimer) return;
    cacheSaveTimer = setTimeout(() => {
      cacheSaveTimer = null;
      if (!cacheDirty) return;
      cacheDirty = false;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
    }, 1500);
  }

  // ============================================================
  // PRE-SEED cache from window.translations (huge speedup on
  // repeated UI strings that we already have hand-translated)
  // ============================================================
  function seedFromDict() {
    try {
      const dict = window.translations;
      if (!dict || !dict.tr || !dict[currentLang]) return;
      const trMap = dict.tr;
      const langMap = dict[currentLang];
      for (const key in trMap) {
        const trText = trMap[key];
        const otherText = langMap[key];
        if (typeof trText === 'string' && typeof otherText === 'string'
            && trText.trim() && otherText.trim()) {
          if (!cache[trText.trim()]) cache[trText.trim()] = otherText.trim();
        }
      }
    } catch (e) {}
  }
  seedFromDict();
  // Also retry seed after DOMContentLoaded (translations.js may load after us)
  document.addEventListener('DOMContentLoaded', seedFromDict);

  // ============================================================
  // TRANSLATION APIs (batched)
  // ============================================================
  // Marker between joined items — Google Translate preserves paragraph
  // breaks (double newline) reliably. We use a distinctive triple marker
  // to reduce false splits if the source text itself contains blank lines.
  const SEP_SEND = '\n\n@@\n\n';
  const SEP_SPLIT_RE = /\n\s*@@\s*\n|\n\s*@\s*@\s*\n/;

  async function translateBatchGoogle(texts, targetLang) {
    // Normalize: collapse internal newlines to spaces so our marker is unique
    const safe = texts.map(t => t.replace(/\s+/g, ' ').trim());
    const joined = safe.join(SEP_SEND);
    const encoded = encodeURIComponent(joined);
    if (encoded.length > 6500) throw new Error('too_large');

    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=' +
                targetLang + '&dt=t&q=' + encoded;
    const res = await fetch(url);
    if (!res.ok) throw new Error('http_' + res.status);
    const data = await res.json();
    if (!data || !Array.isArray(data[0])) throw new Error('bad_shape');

    // Concatenate every translated segment
    const full = data[0].map(s => (s && s[0]) || '').join('');
    // Split by our marker (allowing for spacing drift)
    let parts = full.split(SEP_SPLIT_RE);
    if (parts.length !== texts.length) {
      // Fallback split: try plain double newline
      parts = full.split(/\n\s*\n+/).filter(p => p.trim().length > 0);
    }
    if (parts.length !== texts.length) throw new Error('split_mismatch');
    return parts.map(p => p.trim());
  }

  async function translateSingleMyMemory(text, targetLang) {
    const url = 'https://api.mymemory.translated.net/get?q=' +
                encodeURIComponent(text) + '&langpair=tr|' + targetLang;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    return null;
  }

  async function translateSingleGoogle(text, targetLang) {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=' +
                targetLang + '&dt=t&q=' + encodeURIComponent(text);
    const res = await fetch(url);
    if (!res.ok) throw new Error('http');
    const data = await res.json();
    if (data && data[0]) return data[0].map(s => (s && s[0]) || '').join('').trim();
    return null;
  }

  // ============================================================
  // Batch translate helper — returns map: trimmed source → translated
  // ============================================================
  const MAX_BATCH_ITEMS  = 30;
  const MAX_BATCH_CHARS  = 2500;   // raw text before encoding
  const MAX_PARALLEL     = 6;

  function isTranslatable(text) {
    text = text.trim();
    if (!text || text.length < 2) return false;
    if (/^[\d\s.,+\-–—:%€$₺£¥\/()]+$/.test(text)) return false;
    return true;
  }

  async function translateStrings(uniqueTexts) {
    // Skip anything already in cache
    const need = uniqueTexts.filter(t => !cache[t] && isTranslatable(t));
    if (!need.length) return;

    // Chunk
    const chunks = [];
    let cur = [], curChars = 0;
    for (const t of need) {
      if (cur.length && (cur.length >= MAX_BATCH_ITEMS || curChars + t.length > MAX_BATCH_CHARS)) {
        chunks.push(cur);
        cur = []; curChars = 0;
      }
      cur.push(t);
      curChars += t.length;
    }
    if (cur.length) chunks.push(cur);

    // Process chunks in parallel waves
    for (let base = 0; base < chunks.length; base += MAX_PARALLEL) {
      const wave = chunks.slice(base, base + MAX_PARALLEL);
      await Promise.all(wave.map(async chunk => {
        let translated = null;
        try {
          translated = await translateBatchGoogle(chunk, currentLang);
        } catch (e) {
          // Batch failed — fall back to parallel per-item calls
          translated = await Promise.all(chunk.map(async t => {
            try { return await translateSingleGoogle(t, currentLang); }
            catch (e2) {
              try { return await translateSingleMyMemory(t, currentLang); }
              catch (e3) { return null; }
            }
          }));
        }
        for (let i = 0; i < chunk.length; i++) {
          const src = chunk[i];
          const tr = translated && translated[i];
          if (tr && tr !== src) cache[src] = tr;
        }
      }));
      scheduleSaveCache();
    }
  }

  // ============================================================
  // DOM SCANNER
  // ============================================================
  const SKIP_TAGS = ['SCRIPT','STYLE','CODE','PRE','NOSCRIPT','IFRAME','SVG','CANVAS','INPUT','TEXTAREA'];
  const SKIP_CLASSES = ['no-translate','notranslate','iu-hi-price','lang-code','iu-price-hidden'];

  function shouldSkipElement(el) {
    if (!el || !el.tagName) return true;
    if (SKIP_TAGS.includes(el.tagName)) return true;
    if (el.hasAttribute && el.hasAttribute('translate') && el.getAttribute('translate') === 'no') return true;
    if (el.classList) {
      for (const cls of SKIP_CLASSES) {
        if (el.classList.contains(cls)) return true;
      }
    }
    const href = el.getAttribute && el.getAttribute('href');
    if (href && (href.startsWith('tel:') || href.startsWith('mailto:'))) return true;
    return false;
  }

  function collectTextNodes(root) {
    const nodes = [];
    if (!root || !document.body) return nodes;
    const startNode = (root === document.body || document.body.contains(root)) ? root : document.body;
    const walker = document.createTreeWalker(
      startNode,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const text = node.nodeValue;
          if (!text || !text.trim() || text.trim().length < 2) return NodeFilter.FILTER_REJECT;
          if (/^[\d\s.,+\-–—:%€$₺£¥\/()]+$/.test(text.trim())) return NodeFilter.FILTER_REJECT;
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

  // Track nodes already translated so we don't redo work
  const translatedNodes = new WeakSet();

  function applyTranslationToNode(node) {
    const orig = node.nodeValue;
    const trimmed = orig.trim();
    const translated = cache[trimmed];
    if (!translated || translated === trimmed) return false;
    const leading  = orig.match(/^\s*/)[0];
    const trailing = orig.match(/\s*$/)[0];
    try {
      node.nodeValue = leading + translated + trailing;
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================
  // ATTRIBUTES (placeholder, alt, title)
  // ============================================================
  function collectAttrTargets(root) {
    const els = (root || document.body).querySelectorAll('[placeholder], [alt], [title]');
    const items = [];
    els.forEach(el => {
      if (shouldSkipElement(el)) return;
      ['placeholder','alt','title'].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val && val.trim().length > 2 && isTranslatable(val)) {
          items.push({ el, attr, text: val.trim() });
        }
      });
    });
    return items;
  }

  function applyAttrTranslation(item) {
    const tr = cache[item.text];
    if (tr && tr !== item.text) {
      try { item.el.setAttribute(item.attr, tr); } catch (e) {}
    }
  }

  // ============================================================
  // PROCESSING QUEUE (proper, non-blocking)
  // ============================================================
  const pendingRoots = new Set();
  let mutationTimer = null;
  let processing = false;

  async function processPending() {
    if (processing) return;
    processing = true;
    try {
      while (pendingRoots.size) {
        const roots = Array.from(pendingRoots);
        pendingRoots.clear();

        // Gather all text nodes across pending roots
        const allNodes = [];
        const seen = new Set();
        for (const root of roots) {
          if (!root || (root.nodeType === 1 && !document.body.contains(root))) continue;
          const nodes = collectTextNodes(root);
          for (const n of nodes) {
            if (translatedNodes.has(n)) continue;
            if (seen.has(n)) continue;
            seen.add(n);
            allNodes.push(n);
          }
        }

        // Gather attribute targets
        const attrItems = [];
        for (const root of roots) {
          if (root && root.nodeType === 1 && document.body.contains(root)) {
            attrItems.push(...collectAttrTargets(root));
          } else if (root === document.body) {
            attrItems.push(...collectAttrTargets(document.body));
          }
        }

        if (!allNodes.length && !attrItems.length) continue;

        // Build unique text list to translate
        const uniq = new Set();
        for (const n of allNodes) uniq.add(n.nodeValue.trim());
        for (const a of attrItems) uniq.add(a.text);
        const uniqArr = Array.from(uniq);

        console.log('[Translator] batch:', allNodes.length, 'nodes /',
                    attrItems.length, 'attrs /', uniqArr.length, 'unique →', currentLang);

        // Translate (populates cache)
        await translateStrings(uniqArr);

        // Apply
        for (const n of allNodes) {
          applyTranslationToNode(n);
          translatedNodes.add(n);
        }
        for (const a of attrItems) applyAttrTranslation(a);
      }
    } finally {
      processing = false;
    }
  }

  // ============================================================
  // INIT + DYNAMIC CONTENT
  // ============================================================
  function initTranslator() {
    // Kick off initial translation
    seedFromDict(); // in case translations.js just finished loading
    pendingRoots.add(document.body);
    processPending();

    // Watch for dynamic content (FAQ, listing cards, header inject, etc.)
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (n.nodeType === 1) pendingRoots.add(n);
            else if (n.nodeType === 3 && n.parentElement) pendingRoots.add(n.parentElement);
          }
          // Also handle characterData changes (text swaps)
          if (m.type === 'characterData' && m.target && m.target.parentElement) {
            pendingRoots.add(m.target.parentElement);
          }
        }
        if (mutationTimer) clearTimeout(mutationTimer);
        mutationTimer = setTimeout(processPending, 200);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Header re-injection: retranslate
  document.addEventListener('iu:header-injected', () => {
    setTimeout(() => {
      pendingRoots.add(document.body);
      processPending();
    }, 150);
  });

  // Public API: force retranslate (used by FAQ script etc.)
  window.__IURetranslate = function(root) {
    pendingRoots.add(root || document.body);
    processPending();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTranslator);
  } else {
    initTranslator();
  }

  console.log('[Translator v4] Dil:', currentLang,
              '— batch API (30/req, 6 paralel) + dict pre-cache');
})();
