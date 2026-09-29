/**
 * cms-safe.js — Panelden gelen zengin içeriği (blog yazısı vb.) GÜVENLİ HTML'e çevirir.
 * Beyaz liste yaklaşımı: sadece izin verilen etiket/özellik/sınıflar kalır.
 * <script>, on* olayları, style, iframe, form, javascript: linkleri vb. ASLA geçmez.
 * Hem sitede (blog yazı sayfası) hem panelde (önizleme/editör) kullanılır.
 */
(function (root) {
  'use strict';
  const TAGS = new Set(['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'BR', 'HR',
    'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'IMG', 'FIGURE', 'FIGCAPTION', 'DIV', 'SPAN']);
  const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA',
    'SELECT', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH', 'LINK', 'META', 'BASE', 'FRAME', 'FRAMESET', 'AUDIO', 'VIDEO', 'SOURCE', 'HEAD', 'TITLE']);
  const CLASSES = new Set(['info-box', 'article-intro', 'article-cta-inline', 'cta-buttons', 'cta-phone', 'cta-wa', 'price-table', 'cms-img', 'cms-center', 'highlight', 'accent']);

  function safeUrl(u, forImg) {
    u = String(u || '').trim();
    if (!u) return '';
    if (forImg) return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : '';
    if (/^(https?:\/\/|mailto:|tel:)[^\s"'<>]*$/i.test(u)) return u;
    if (/^\/(?!\/)[^\s"'<>]*$/.test(u)) return u;                       // site-içi mutlak yol
    if (/^[a-z0-9][a-z0-9\-._\/]*(\.html)?([?#][^\s"'<>]*)?$/i.test(u)) return '/' + u.replace(/^\.?\//, ''); // göreli
    return '';
  }

  function cleanNode(node, doc) {
    const out = doc.createDocumentFragment();
    node.childNodes.forEach(ch => {
      if (ch.nodeType === 3) { out.appendChild(doc.createTextNode(ch.nodeValue)); return; }
      if (ch.nodeType !== 1) return;
      const tag = ch.tagName.toUpperCase();
      if (DROP_WITH_CONTENT.has(tag)) return;
      if (!TAGS.has(tag)) { out.appendChild(cleanNode(ch, doc)); return; }   // etiketi at, içeriği koru
      const el = doc.createElement(tag.toLowerCase() === 'b' ? 'strong' : tag.toLowerCase() === 'i' ? 'em' : tag.toLowerCase());
      if (tag === 'A') {
        const href = safeUrl(ch.getAttribute('href'));
        if (href) {
          el.setAttribute('href', href);
          if (/^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?ismailunsal\.com\.tr/i.test(href)) {
            el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener nofollow');
          }
        }
      }
      if (tag === 'IMG') {
        const src = safeUrl(ch.getAttribute('src'), true);
        if (!src) return;
        el.setAttribute('src', src);
        el.setAttribute('alt', String(ch.getAttribute('alt') || '').slice(0, 200));
        el.setAttribute('loading', 'lazy');
      }
      if ((tag === 'TD' || tag === 'TH') && /^\d{1,2}$/.test(ch.getAttribute('colspan') || '')) el.setAttribute('colspan', ch.getAttribute('colspan'));
      const cls = String(ch.getAttribute('class') || '').split(/\s+/).filter(c => CLASSES.has(c));
      if (cls.length) el.setAttribute('class', cls.join(' '));
      if (tag !== 'IMG' && tag !== 'BR' && tag !== 'HR') el.appendChild(cleanNode(ch, doc));
      out.appendChild(el);
    });
    return out;
  }

  // Düz metin (etiketsiz) yazıları paragraflara çevir
  function textToHtml(t) {
    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return String(t || '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean).map(b => {
      if (/^##\s+/.test(b)) return '<h2>' + esc(b.replace(/^##\s+/, '')) + '</h2>';
      if (/^###\s+/.test(b)) return '<h3>' + esc(b.replace(/^###\s+/, '')) + '</h3>';
      if (/^[-•]\s+/m.test(b) && b.split('\n').every(l => /^[-•]\s+/.test(l))) return '<ul>' + b.split('\n').map(l => '<li>' + esc(l.replace(/^[-•]\s+/, '')) + '</li>').join('') + '</ul>';
      return '<p>' + esc(b).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  /** Güvenli HTML string döner */
  function sanitize(input) {
    const s = String(input || '');
    const html = /<[a-z][\s\S]*>/i.test(s) ? s : textToHtml(s);
    const doc = document.implementation.createHTMLDocument('x');
    const tpl = doc.createElement('div');
    tpl.innerHTML = html;                 // inert doküman: script çalışmaz, resim yüklenmez
    const clean = doc.createElement('div');
    clean.appendChild(cleanNode(tpl, doc));
    return clean.innerHTML;
  }
  /** Hedef elemana güvenli içerik yaz */
  function render(target, input) {
    target.innerHTML = sanitize(input);
  }
  root.IUSafe = { sanitize, render, safeUrl };
})(window);
