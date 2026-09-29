/**
 * blog-yazi.js — /blog/<slug> : panelden yazılan blog yazısını gösterir.
 * İçerik IUSafe.sanitize ile beyaz listeden geçirilir (XSS yok).
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  function slugFromPath() {
    const m = location.pathname.match(/\/blog\/([^/?#]+)\/?$/);
    const s = m ? decodeURIComponent(m[1]).toLowerCase() : '';
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 220 ? s : '';
  }
  function setMeta(sel, attr, val) { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); }
  function readTime(html) {
    const words = String(html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200)) + ' dk okuma';
  }
  function notFound() {
    document.title = 'Yazı bulunamadı | TURYAP İsmail Ünsal';
    let r = document.querySelector('meta[name="robots"]');
    if (r) r.setAttribute('content', 'noindex, follow');
    $('bpTitle').textContent = 'Yazı bulunamadı';
    const c = $('bpContent'); c.textContent = '';
    const p = document.createElement('p'); p.textContent = 'Aradığınız yazı kaldırılmış veya adresi değişmiş olabilir. ';
    const a = document.createElement('a'); a.href = window.IUCms.langPrefix() + '/blog'; a.textContent = 'Tüm yazılara dönün →';
    a.style.cssText = 'color:#2563EB;font-weight:700;';
    p.appendChild(a); c.appendChild(p);
  }

  async function fillRecent(currentSlug) {
    const ul = document.querySelector('.sb-posts'); if (!ul) return;
    const posts = (await window.IUCms.publishedPosts(6)).filter(p => p.slug !== currentSlug).slice(0, 4);
    posts.reverse().forEach(p => {
      const li = document.createElement('li'); const a = document.createElement('a');
      a.href = window.IUCms.postUrl(p);
      const i = document.createElement('i'); i.className = 'fa-solid fa-chevron-right';
      a.append(i, document.createTextNode(' ' + (p.baslik_tr || '')));
      li.appendChild(a); ul.insertBefore(li, ul.firstChild);
    });
    // Eski sabit yazı linkini (varsa DB'dekiyle aynıysa) tekrar gösterme
    ul.querySelectorAll('a[href*="/blog-"]').forEach(a => a.closest('li').remove());
  }

  async function init() {
    const slug = slugFromPath();
    if (!window.IUCms || !window.IUSafe) return;
    if (!slug) { location.replace(window.IUCms.langPrefix() + '/blog'); return; }
    const c = await window.IUCms.getClient();
    let post = null;
    if (c) {
      try {
        const { data } = await c.from('blog_posts').select('*').eq('slug', slug).eq('durum', 'yayinda').limit(1);
        post = data && data[0];
      } catch (_) {}
    }
    if (!post) return notFound();

    const title = String(post.baslik_tr || 'Blog Yazısı').slice(0, 200);
    const desc = String(post.ozet_tr || '').replace(/\s+/g, ' ').trim().slice(0, 158) || title;
    const url = 'https://ismailunsal.com.tr/blog/' + slug;
    const cover = window.IUCms.safeImg(post.kapak_foto);
    document.title = title + ' | TURYAP İsmail Ünsal';
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', url);
    if (cover) setMeta('meta[property="og:image"]', 'content', cover);

    $('bpTitle').textContent = title;
    $('bpCrumb').textContent = title.length > 40 ? title.slice(0, 40) + '…' : title;
    if (post.kategori) { $('bpCat').textContent = post.kategori; $('bpCat').hidden = false; }
    const d = post.yayin_tarihi || post.created_at;
    if (d) { $('bpDate').textContent = window.IUCms.fmtDate(d); $('bpDateWrap').hidden = false; }
    const html = window.IUSafe.sanitize(post.icerik_tr || '');
    $('bpRead').textContent = readTime(html); $('bpReadWrap').hidden = false;
    if (cover) { $('bpCover').style.backgroundImage = 'url("' + cover.replace(/["\\]/g, '') + '")'; $('bpCover').hidden = false; }
    $('bpContent').innerHTML = html;

    // Etiketler: kategori
    const tags = $('bpTags'); tags.textContent = '';
    ['Yalova', post.kategori].filter(Boolean).forEach(t => { const s = document.createElement('span'); s.textContent = t; tags.appendChild(s); });
    // Paylaş
    const share = $('bpShare'); share.textContent = '';
    const enc = encodeURIComponent;
    [['https://wa.me/?text=' + enc(title + ' - ' + url), 'fa-brands fa-whatsapp', 'WhatsApp'],
     ['https://www.facebook.com/sharer/sharer.php?u=' + enc(url), 'fa-brands fa-facebook', 'Facebook'],
     ['https://www.linkedin.com/sharing/share-offsite/?url=' + enc(url), 'fa-brands fa-linkedin', 'LinkedIn'],
     ['https://twitter.com/intent/tweet?url=' + enc(url) + '&text=' + enc(title), 'fa-brands fa-x-twitter', 'X']
    ].forEach(([href, icon, label]) => {
      const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', label);
      const i = document.createElement('i'); i.className = icon; a.appendChild(i); share.appendChild(a);
    });

    // SEO: yapılandırılmış veri
    const ld = document.createElement('script'); ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc,
      image: cover || undefined, datePublished: d || undefined, dateModified: post.updated_at || d || undefined,
      author: { '@type': 'Person', name: 'İsmail Ünsal' },
      publisher: { '@type': 'Organization', name: 'TURYAP İsmail Ünsal' }, mainEntityOfPage: url
    }).replace(/</g, '\\u003c');
    document.head.appendChild(ld);
    fillRecent(slug);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
