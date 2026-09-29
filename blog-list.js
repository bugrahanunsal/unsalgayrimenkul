/**
 * blog-list.js — blog.html: panelde "Yayında" olan yazıları listenin başına ekler.
 * Aynı yazının eski sabit kopyası (içe aktarılmışsa) listeden gizlenir.
 * Eski sabit yazı sayfalarında (data-static-slug) panele aktarılmış sürüm varsa oraya yönlendirir.
 */
(function () {
  'use strict';
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(c) { const i = document.createElement('i'); i.className = c; return i; }

  function card(p) {
    const C = window.IUCms; const url = C.postUrl(p);
    const art = el('article', 'blog-post-card');
    const img = el('a', 'blog-post-img'); img.href = url;
    const cover = C.safeImg(p.kapak_foto) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
    img.style.backgroundImage = 'url("' + cover.replace(/["\\]/g, '') + '")';
    if (p.kategori) img.appendChild(el('span', 'blog-post-cat', p.kategori));
    const body = el('div', 'blog-post-body');
    const meta = el('div', 'blog-post-meta');
    const d = p.yayin_tarihi || p.created_at;
    if (d) { const s = el('span'); s.append(icon('fa-solid fa-calendar'), document.createTextNode(' ' + C.fmtDate(d))); meta.appendChild(s); }
    const h = el('h2'); const ha = el('a', null, p.baslik_tr || 'Blog yazısı'); ha.href = url; h.appendChild(ha);
    const ex = el('p', null, String(p.ozet_tr || '').slice(0, 320));
    const more = el('a', 'blog-post-more', 'Devamını Oku '); more.href = url; more.appendChild(icon('fa-solid fa-arrow-right'));
    body.append(meta, h, ex, more); art.append(img, body);
    art.dataset.slug = p.slug;
    return art;
  }

  async function initList() {
    const list = document.querySelector('.blog-posts');
    if (!list || !window.IUCms) return;
    const posts = await window.IUCms.publishedPosts(50);
    if (!posts.length) return;
    const slugs = new Set(posts.map(p => p.slug));
    // Sabit kopyası panele aktarılmış yazıları gizle
    list.querySelectorAll('article.blog-post-card').forEach(a => {
      const link = a.querySelector('a[href*="blog-"]');
      const m = link && link.getAttribute('href').match(/blog-([a-z0-9-]+?)(?:\.html)?$/);
      if (m && slugs.has(m[1])) a.remove();
    });
    const frag = document.createDocumentFragment();
    posts.forEach(p => frag.appendChild(card(p)));
    list.insertBefore(frag, list.firstChild);
  }

  async function initStaticRedirect() {
    const slug = document.documentElement.getAttribute('data-static-slug');
    if (!slug || !window.IUCms) return;
    const posts = await window.IUCms.publishedPosts(100);
    if (posts.some(p => p.slug === slug)) location.replace(window.IUCms.langPrefix() + '/blog/' + slug);
  }

  function init() { initList(); initStaticRedirect(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
