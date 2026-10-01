/**
 * Panel — SEO Ayarları (admin/seo.html)
 * Yoast benzeri düzenleyici: odak anahtar kelime, SEO başlığı, adres (slug), meta açıklama,
 * Google önizlemesi (mobil / masaüstü), SEO analizi, sayfa fotoğrafı (yükle / sil), noindex, eski adresler.
 *
 * Veri kaynakları:
 *  - Sayfa listesi ve varsayılan odak kelimeler: /api/seo-sayfalar (functions/_middleware.js)
 *  - Sayfaların varsayılan başlık / açıklama / içerik: sayfanın ham HTML'i (X-IU-Seo-Raw başlığı)
 *  - Kayıtlar: sayfa_seo, properties, blog_posts (RLS: yalnızca panel kullanıcıları yazabilir)
 * Güvenlik: kullanıcı / veritabanı verisi DOM'a yalnızca textContent, value ve doğrulanmış
 * görsel adresleriyle yazılır (innerHTML'e veri basılmaz).
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const SITE = 'https://ismailunsal.com.tr';
  const BRAND = 'TURYAP İsmail Ünsal';
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const KATEGORI = { daire: 'Daire', villa: 'Villa', arsa: 'Arsa', mustakil_ev: 'Müstakil Ev', isyeri: 'İşyeri', tarla: 'Tarla', yazlik: 'Yazlık', dukkan: 'Dükkan' };
  const TIP = { satilik: 'Satılık', kiralik: 'Kiralık' };
  const PARA = { TL: '₺', USD: '$', EUR: '€' };
  const DURUM = { aktif: 'Yayında', pasif: 'Pasif', satildi: 'Satıldı', kiralandi: 'Kiralandı', taslak: 'Taslak', yayinda: 'Yayında', arsiv: 'Arşiv' };
  const MAXSLUG = { sayfa: 80, ilan: 220, blog: 200 };
  const STOP = new Set(['ve', 'ile', 'için', 'icin', 'bir', 'bu', 'şu', 'da', 'de', 'ta', 'te', 'ya', 'veya', 'mi', 'mı', 'mu', 'mü', 'ki', 'en']);

  const S = {
    reg: null,
    items: { sayfa: [], ilan: [], blog: [] },
    tab: 'sayfa', filter: '', q: '',
    dbReady: true, seoCols: true,
    cur: null, draft: null, saved: '', device: 'mobile', busy: false
  };

  // ------------------------------------------------------------------ yardımcılar
  const safeImg = (u) => { const s = String(u || '').trim(); return /^https:\/\/[^\s"'<>()\\`]+$/i.test(s) && s.length <= 600 ? s : ''; };
  const imgOrLocal = (u) => safeImg(u) || (/^\/[a-z0-9\-_/.]+\.(?:jpe?g|png|webp|svg)$/i.test(String(u || '')) ? String(u) : '');
  const trLower = (s) => String(s || '').toLocaleLowerCase('tr-TR');
  const clean = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  function asciiTr(s) {
    return trLower(s).replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function slugify(t, max) {
    return asciiTr(t).replace(/['’`´]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max || 80).replace(/-+$/g, '');
  }
  function slugLive(t, max) {                     // yazarken: sondaki tireye izin ver
    return asciiTr(t).replace(/['’`´]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '').slice(0, max || 80);
  }
  function tokens(s) { return trLower(s).replace(/['’`´]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean); }
  function content(kw) { const c = kw.filter(w => !STOP.has(w)); return c.length ? c : kw; }
  function wm(t, k) {                             // kelime eşleşmesi (Türkçe ekleri ve k→ğ gibi yumuşamayı tolere eder)
    if (!t || !k) return false;
    if (t.startsWith(k)) return true;
    if (k.length >= 5) { let i = 0; while (i < t.length && i < k.length && t[i] === k[i]) i++; return i >= k.length - 1; }
    return false;
  }
  function phrasePos(tk, kw) {
    outer: for (let i = 0; i + kw.length <= tk.length; i++) { for (let j = 0; j < kw.length; j++) if (!wm(tk[i + j], kw[j])) continue outer; return i; }
    return -1;
  }
  function phraseCount(tk, kw) {
    let n = 0;
    outer: for (let i = 0; i + kw.length <= tk.length; i++) { for (let j = 0; j < kw.length; j++) if (!wm(tk[i + j], kw[j])) continue outer; n++; i += kw.length - 1; }
    return n;
  }
  const allIn = (tk, cw) => cw.length > 0 && cw.every(k => tk.some(t => wm(t, k)));
  function cutWords(s, max) {
    const t = clean(s); if (t.length <= max) return t;
    const cut = t.slice(0, max - 1); const sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–—-]+$/, '') + '…';
  }
  function titleCase(s) {
    return clean(s).split(' ').map(w => w ? w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1) : w).join(' ');
  }
  let canvas = null;
  function px(s, font) {
    canvas = canvas || document.createElement('canvas');
    const c = canvas.getContext('2d'); c.font = font; return c.measureText(String(s || '')).width;
  }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (_) { return ''; } }
  const isMissingTable = (e) => !!e && (/sayfa_seo|does not exist|schema cache|PGRST205|42P01/i.test((e.message || '') + ' ' + (e.code || '')));
  const isMissingCol = (e) => !!e && /column|42703|PGRST204|seo_|odak_kelime|eski_sluglar/i.test((e.message || '') + ' ' + (e.code || ''));

  // ------------------------------------------------------------------ değerlendirmeler
  function titleState(t) {
    const w = px(t, '20px Arial');
    const s = !t ? 'bad' : w > 600 ? 'bad' : (w > 580 || w < 300) ? 'ok' : 'good';
    return { w: Math.round(w), s, pct: Math.min(100, (w / 600) * 100) };
  }
  function descState(d) {
    const n = d.length;
    const s = !n ? 'bad' : n < 120 ? 'ok' : n <= 156 ? 'good' : n <= 170 ? 'ok' : 'bad';
    return { n, s, pct: Math.min(100, (n / 156) * 100) };
  }

  /** Yoast benzeri SEO analizi. v = düzenlenen değerler, it = öğe (içerik bilgisiyle) */
  function analyze(it, v) {
    const R = [];
    const add = (s, t) => R.push({ s, t });
    const c = it.content || {};
    const kw = tokens(v.odak);
    const cw = content(kw);
    if (!kw.length) {
      add('bad', 'Odak anahtar kelime girilmemiş. Bu sayfanın Google\'da bulunmasını istediğiniz ana kelimeyi yazın (ör. "yalova satılık daire").');
    } else {
      if (cw.length > 4) add('ok', 'Anahtar kelime uzun (' + cw.length + ' kelime). 2–4 kelimelik ifadeler daha etkilidir.');
      else add('good', 'Anahtar kelime uzunluğu iyi.');
      const tt = tokens(v.baslik); const tpos = phrasePos(tt, kw);
      if (tpos === 0) add('good', 'Anahtar kelime SEO başlığının başında. Harika!');
      else if (tpos > 0) add('ok', 'Anahtar kelime başlıkta var ama başta değil. Başa almak daha etkilidir.');
      else if (allIn(tt, cw)) add('ok', 'Anahtar kelimenin kelimeleri başlıkta var ama yan yana geçmiyor.');
      else add('bad', 'Anahtar kelime SEO başlığında geçmiyor.');
      const dt = tokens(v.aciklama); const dc = phraseCount(dt, kw);
      if (dc === 1 || dc === 2) add('good', 'Anahtar kelime meta açıklamada geçiyor.');
      else if (dc > 2) add('ok', 'Anahtar kelime meta açıklamada ' + dc + ' kez geçiyor; 1–2 kez yeterli.');
      else if (allIn(dt, cw)) add('ok', 'Anahtar kelimenin kelimeleri meta açıklamada var ama yan yana geçmiyor.');
      else add('bad', 'Anahtar kelime meta açıklamada geçmiyor.');
      if (!it.locked) {
        const sw = String(v.slug || '').split('-').filter(Boolean);
        const kws = cw.map(k => slugify(k)).filter(Boolean);
        const hit = kws.filter(k => sw.some(s => wm(s, k) || wm(k, s))).length;
        if (kws.length && hit === kws.length) add('good', 'Anahtar kelime adreste (slug) geçiyor.');
        else if (hit > 0) add('ok', 'Anahtar kelimenin bir kısmı adreste (slug) geçiyor.');
        else add('ok', 'Anahtar kelime adreste (slug) geçmiyor. Adresi değiştirmek isterseniz "Anahtar kelimeden oluştur"u kullanabilirsiniz (eski adres otomatik yönlenir).');
      }
      if (c.h1s) {
        if (!c.h1s.length) add('bad', 'Sayfada ana başlık (H1) yok.');
        else {
          const h = c.h1s.map(tokens);
          if (h.some(x => phrasePos(x, kw) >= 0 || allIn(x, cw))) add('good', 'Anahtar kelime ana başlıkta (H1) geçiyor.');
          else add('ok', 'Anahtar kelime sayfanın ana başlığında (H1) geçmiyor.');
          if (c.h1s.length > 1) add('ok', 'Sayfada ' + c.h1s.length + ' ana başlık (H1) var; tek H1 önerilir.');
        }
      }
      if (c.intro != null) {
        if (c.intro && allIn(tokens(c.intro), cw)) add('good', 'Anahtar kelime giriş paragrafında geçiyor.');
        else add('ok', 'Anahtar kelime giriş paragrafında geçmiyor. İlk paragrafta kullanmak faydalı olur.');
      }
      if (c.tokens && c.tokens.length >= 80) {
        const n = c.sentences ? c.sentences.filter(st => allIn(st, cw)).length : phraseCount(c.tokens, kw); const words = c.tokens.length;
        const min = Math.max(2, Math.round(words * 0.004)), max = Math.max(4, Math.round(words * 0.03));
        if (!n) add('bad', 'Anahtar kelime sayfa metninde hiç geçmiyor.');
        else if (n < min) add('ok', 'Anahtar kelime metinde ' + n + ' kez geçiyor; ' + min + '–' + max + ' kez önerilir.');
        else if (n > max) add('bad', 'Anahtar kelime metinde ' + n + ' kez geçiyor; bu kadar tekrar (aşırı kullanım) zarar verebilir. En fazla ' + max + ' kez önerilir.');
        else add('good', 'Anahtar kelime metinde ' + n + ' kez geçiyor. Yoğunluk iyi.');
      }
      if (c.imgAlts) {
        if (!c.imgAlts.length) add('ok', 'Sayfa metninde görsel yok. Açıklamalı (alt metinli) bir görsel eklemek faydalı olur.');
        else if (c.imgAlts.some(a => allIn(tokens(a), cw))) add('good', 'Görsellerin açıklamasında (alt metin) anahtar kelime var.');
        else add('ok', 'Görsellerin açıklamasında (alt metin) anahtar kelime yok.');
      }
      const dup = dupOf(it, v.odak);
      if (dup) add('bad', 'Bu anahtar kelimeyi "' + dup.ad + '" için de kullanıyorsunuz. Her sayfa farklı bir kelimeye odaklanmalı.');
    }
    const ts = titleState(v.baslik);
    if (!v.baslik) add('bad', 'SEO başlığı boş.');
    else if (ts.s === 'bad') add('bad', 'SEO başlığı çok uzun (' + v.baslik.length + ' karakter). Google sonunu kesecek; ~60 karakteri geçmeyin.');
    else if (ts.w < 300) add('ok', 'SEO başlığı kısa. Alanı daha iyi kullanabilirsiniz (50–60 karakter ideal).');
    else if (ts.s === 'ok') add('ok', 'SEO başlığı sınırda; Google sonunu kesebilir.');
    else add('good', 'SEO başlığının uzunluğu ideal.');
    const ds = descState(v.aciklama);
    if (!ds.n) add('bad', 'Meta açıklama boş. Google sayfadan rastgele bir metin gösterir.');
    else if (ds.n < 120) add('ok', 'Meta açıklama kısa (' + ds.n + ' karakter). 120–156 karakter idealdir.');
    else if (ds.n <= 156) add('good', 'Meta açıklamanın uzunluğu ideal.');
    else add(ds.s, 'Meta açıklama uzun (' + ds.n + ' karakter). Google ~156 karakterden sonrasını keser.');
    if (!it.locked && String(v.slug || '').length > 60) add('ok', 'Adres (slug) uzun. Kısa adresler daha kolay okunur ve paylaşılır.');
    if (c.tokens) {
      const n = c.tokens.length; const lo = it.kind === 'ilan' ? 60 : 150, hi = it.kind === 'ilan' ? 120 : 300;
      if (n >= hi) add('good', 'Metin uzunluğu yeterli (' + n + ' kelime).');
      else if (n >= lo) add('ok', 'Metin biraz kısa (' + n + ' kelime). En az ' + hi + ' kelime önerilir.');
      else add('bad', 'Metin çok kısa (' + n + ' kelime). En az ' + hi + ' kelime önerilir.');
    }
    if (c.internal != null) {
      if (c.internal > 0) add('good', 'Sayfada site içi bağlantılar var.');
      else add('ok', 'Sayfada site içi bağlantı yok. İlgili sayfalara bağlantı verin.');
    }
    if (effPhoto(it, v)) add('good', 'Sayfa fotoğrafı var — Google ve paylaşımlarda (WhatsApp, Facebook) görünür.');
    else add('ok', 'Sayfa fotoğrafı yok. Paylaşımlarda daha dikkat çekici görünmesi için fotoğraf ekleyin.');
    if (v.noindex) add('bad', 'Bu sayfa Google\'da gizli (noindex). Görünmesini istiyorsanız "Gelişmiş" bölümünden kapatın.');
    return R;
  }
  function score(R) {
    if (!R.length) return 'bad';
    if (R.some(r => r.s === 'bad' && /Odak anahtar kelime girilmemiş|noindex/.test(r.t))) return 'bad';
    const p = R.reduce((a, r) => a + (r.s === 'good' ? 9 : r.s === 'ok' ? 6 : 3), 0) / R.length;
    return p >= 7.6 ? 'good' : p >= 5.6 ? 'ok' : 'bad';
  }
  const SCORE_TXT = { good: 'İyi', ok: 'Geliştirilebilir', bad: 'Sorunlu' };

  // ------------------------------------------------------------------ öğe modeli
  const allItems = () => S.items.sayfa.concat(S.items.ilan, S.items.blog);
  /** Blog'a taşınmış (panelde yayında) sabit yazı sayfası: site onu blog adresine yönlendirir */
  const isHiddenPage = (it) => it.kind === 'sayfa' && !!it.blogSlug && S.items.blog.some(b => b.row.slug === it.blogSlug && b.row.durum === 'yayinda');
  /** Aynı odak kelimeyi kullanan başka kayıt (ilanlar yalnızca elle girilmiş kelimelerle karşılaştırılır) */
  function rebuildKwIndex() {
    S.kw = new Map();
    allItems().forEach(o => {
      if (isHiddenPage(o) || (o.kind === 'ilan' && !o.row.odak_kelime)) return;
      const k = tokens(o.val.odak).join(' '); if (!k) return;
      const g = (o.kind === 'ilan' ? 'i:' : 'p:') + k;
      if (!S.kw.has(g)) S.kw.set(g, []);
      S.kw.get(g).push(o);
    });
  }
  function dupOf(it, odak) {
    const key = tokens(odak).join(' ');
    if (!key || !S.kw || isHiddenPage(it)) return null;
    const listing = it.kind === 'ilan';
    if (listing && !(it.row.odak_kelime || clean(odak) !== it.def.odak)) return null;
    return (S.kw.get((listing ? 'i:' : 'p:') + key) || []).find(o => o !== it) || null;
  }
  function refreshAll() { allItems().forEach(refreshVal); rebuildKwIndex(); allItems().forEach(refreshVal); }
  function effPhoto(it, v) {
    if (it.kind === 'ilan') return it.def.foto;
    if (it.kind === 'blog') return safeImg(v.foto_url);
    return safeImg(v.foto_url) || (v.foto_kaldir ? '' : it.def.foto);
  }
  function pathOf(it, slug) {
    if (it.kind === 'ilan') return '/ilan/' + slug;
    if (it.kind === 'blog') return '/blog/' + slug;
    return it.id === 'index' ? '/' : '/' + (slug || it.id);
  }
  function refreshVal(it) {
    const r = it.row || {};
    if (it.kind === 'sayfa') {
      it.val = {
        odak: clean(r.odak_kelime) || it.def.odak,
        baslik: clean(r.baslik) || it.def.baslik,
        aciklama: clean(r.aciklama) || it.def.aciklama,
        slug: (!it.locked && SLUG_RE.test(r.slug || '')) ? r.slug : it.id === 'index' ? '' : it.id,
        foto_url: safeImg(r.foto_url), foto_kaldir: r.foto_kaldir === true, foto_kapak: r.foto_kapak !== false,
        foto_karartma: Number.isFinite(+r.foto_karartma) && r.foto_karartma !== null ? Math.min(95, Math.max(50, +r.foto_karartma)) : 80,
        noindex: r.noindex === true, eski: Array.isArray(r.eski_sluglar) ? r.eski_sluglar.slice() : []
      };
      it.changed = !!(r.slug || r.odak_kelime || r.baslik || r.aciklama || r.foto_url || r.foto_kaldir || r.noindex);
    } else {
      it.val = {
        odak: clean(r.odak_kelime) || it.def.odak,
        baslik: clean(r.seo_baslik) || it.def.baslik,
        aciklama: clean(r.seo_aciklama) || it.def.aciklama,
        slug: r.slug || '', foto_url: it.kind === 'blog' ? safeImg(r.kapak_foto) : '', foto_kaldir: false, foto_kapak: true, foto_karartma: 80,
        noindex: false, eski: Array.isArray(r.eski_sluglar) ? r.eski_sluglar.slice() : []
      };
      it.changed = !!(r.seo_baslik || r.seo_aciklama || r.odak_kelime);
    }
    it.results = analyze(it, it.val);
    it.score = score(it.results);
  }

  function extractHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const meta = (sel) => { const m = doc.querySelector(sel); return m ? clean(m.getAttribute('content')) : ''; };
    const head = { title: clean((doc.querySelector('title') || {}).textContent), desc: meta('meta[name="description"]'), og: meta('meta[property="og:image"]') };
    const root = doc.body || doc.documentElement;
    root.querySelectorAll('header.header, .top-bar, nav, footer, script, style, noscript, template, svg, form, .lang-switcher, .lang-dropdown, .whatsapp-float, #iu-dynamic-listings, #listingsGrid, .listings-grid, .breadcrumb, .breadcrumb-page, [aria-hidden="true"]').forEach(n => n.remove());
    return Object.assign(head, contentOf(root, doc));
  }
  function contentOf(root, doc) {
    const parts = [];
    const w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const t = w.currentNode.nodeValue; if (t && t.trim()) parts.push(t); }
    const text = parts.join(' ');
    const h1s = Array.from(root.querySelectorAll('h1')).map(h => clean(h.textContent)).filter(Boolean);
    const BLOCK = 'h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,dd,dt,figcaption,summary';
    const sentences = [];
    root.querySelectorAll(BLOCK).forEach(b => {
      if (b.querySelector(BLOCK)) return;                         // yalnızca en içteki bloklar
      (clean(b.textContent).match(/[^.!?…]+[.!?…]*/g) || []).forEach(x => { const tk = tokens(x); if (tk.length) sentences.push(tk); });   // eski Safari: lookbehind yok
    });
    const p = Array.from(root.querySelectorAll('p')).map(x => clean(x.textContent)).find(t => t.length >= 60) || '';
    const imgAlts = Array.from(root.querySelectorAll('img')).filter(i => !/^data:/i.test(i.getAttribute('src') || '')).map(i => clean(i.getAttribute('alt')));
    let internal = 0, external = 0;
    root.querySelectorAll('a[href]').forEach(a => {
      const h = (a.getAttribute('href') || '').trim();
      if (!h || /^(#|tel:|mailto:|javascript:|sms:|whatsapp:)/i.test(h)) return;
      if (/^https?:\/\//i.test(h)) {
        if (/^https?:\/\/(www\.)?ismailunsal\.com\.tr/i.test(h)) internal++;
        else if (!/(wa\.me|whatsapp|facebook\.com|instagram\.com|youtube\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|goo\.gl\/maps|google\.[a-z.]+\/maps)/i.test(h)) external++;
      } else internal++;
    });
    return { h1s, intro: p, tokens: tokens(text), sentences, imgAlts, internal, external, heroH1: h1s[0] || '' };
  }

  function listingDefaults(p) {
    const baslik = clean(p.baslik_tr).slice(0, 150) || 'İlan';
    const cat = [TIP[p.tip], KATEGORI[p.kategori]].filter(Boolean).join(' ');
    let title = baslik + ' | ' + BRAND;
    if (title.length > 65) title = baslik + ' | TURYAP';
    if (title.length > 65) title = cutWords(baslik, 62);
    const loc = [clean(p.mahalle).slice(0, 40).trim(), clean(p.ilce).slice(0, 40).trim(), 'Yalova'].filter(Boolean).join(', ');
    const fiyat = Number(p.fiyat) > 0 ? new Intl.NumberFormat('tr-TR').format(Number(p.fiyat)) + ' ' + (PARA[p.para_birimi] || '₺') : '';
    const bits = [loc, cat, fiyat].filter(Boolean).join(' — ');
    const desc = cutWords((bits ? bits + '. ' : '') + clean(p.aciklama_tr).slice(0, 600), 156);
    const odak = trLower([clean(p.ilce) || 'yalova', TIP[p.tip] || '', KATEGORI[p.kategori] || ''].filter(Boolean).join(' '));
    const imgs = (Array.isArray(p.property_images) ? p.property_images : []).filter(i => i && safeImg(i.url));
    const main = imgs.find(i => i.ana_foto === true) || imgs.slice().sort((a, b) => (a.sira || 0) - (b.sira || 0))[0];
    return { odak, baslik: title, aciklama: desc, foto: main ? safeImg(main.url) : '' };
  }
  function blogDefaults(p) {
    const baslik = clean(p.baslik_tr) || 'Blog Yazısı';
    const regHit = (S.reg.sayfalar || []).find(x => x.blogSlug && x.blogSlug === p.slug);
    const words = clean(p.baslik_tr).split(' ').map(w => w.split(/['’]/)[0]).map(trLower).map(w => w.replace(/[^\p{L}\p{N}]+/gu, ''))
      .filter(w => w && !STOP.has(w) && !/^\d+$/.test(w)).slice(0, 3);
    return {
      odak: regHit ? regHit.odak : words.join(' '),
      baslik: baslik + ' | ' + BRAND,
      aciklama: cutWords(p.ozet_tr || p.baslik_tr || '', 156),
      foto: ''
    };
  }

  // ------------------------------------------------------------------ veri yükleme
  async function loadRegistry() {
    const r = await fetch('/api/seo-sayfalar', { cache: 'no-store', credentials: 'same-origin' });
    if (!r.ok) throw new Error('SEO modülü yanıt vermedi (' + r.status + ')');
    const j = await r.json();
    if (!j || !Array.isArray(j.sayfalar)) throw new Error('SEO modülü beklenmeyen yanıt verdi');
    S.reg = j;
  }
  async function loadPages() {
    let rows = [];
    const { data, error } = await supabaseClient.from('sayfa_seo').select('*').limit(500);
    if (error) { S.dbReady = false; if (!isMissingTable(error)) App.toast('SEO ayarları okunamadı: ' + error.message, 'error'); }
    else rows = data || [];
    const byKey = new Map(rows.map(r => [r.sayfa, r]));
    S.items.sayfa = await Promise.all(S.reg.sayfalar.map(async (p) => {
      let html = '';
      try {
        const r = await fetch(p.yol, { headers: { 'X-IU-Seo-Raw': '1' }, cache: 'no-store', credentials: 'same-origin' });
        if (r.ok) html = await r.text();
      } catch (_) { /* içerik okunamadı */ }
      const x = html ? extractHtml(html) : { title: '', desc: '', og: '', h1s: null, intro: null, tokens: null, imgAlts: null, internal: null, external: null, heroH1: '' };
      const it = {
        kind: 'sayfa', id: p.key, ad: p.ad, grup: p.grup, locked: !!p.kilitli, prefix: '/', kapak: !!p.kapakAlani,
        blogSlug: p.blogSlug || '', row: byKey.get(p.key) || null,
        def: { odak: p.odak || '', baslik: x.title, aciklama: x.desc, foto: safeImg(p.varsayilanFoto) || imgOrLocal(x.og) },
        defHero: !!safeImg(p.varsayilanFoto),
        // metin:false → iletişim / liste / SSS / yasal sayfa: metin uzunluğu ve yoğunluk değerlendirilmez
        // makale → yazı sayfaları: görsel ve bağlantı kontrolleri de yapılır
        content: {
          h1s: x.h1s, heroH1: x.heroH1,
          intro: p.metin === false ? null : x.intro, tokens: p.metin === false ? null : x.tokens, sentences: p.metin === false ? null : x.sentences,
          imgAlts: p.makale ? x.imgAlts : null, internal: p.makale ? x.internal : null
        }
      };
      return it;
    }));
  }
  async function loadListings() {
    const base = 'id,slug,baslik_tr,aciklama_tr,durum,tip,kategori,ilce,mahalle,fiyat,para_birimi,created_at,property_images(url,ana_foto,sira)';
    let res = await supabaseClient.from('properties').select(base + ',seo_baslik,seo_aciklama,odak_kelime,eski_sluglar').order('created_at', { ascending: false }).limit(2000);
    if (res.error && isMissingCol(res.error)) { S.seoCols = false; res = await supabaseClient.from('properties').select(base).order('created_at', { ascending: false }).limit(2000); }
    if (res.error) { App.toast('İlanlar okunamadı: ' + res.error.message, 'error'); S.items.ilan = []; return; }
    S.items.ilan = (res.data || []).map(p => ({
      kind: 'ilan', id: p.id, ad: clean(p.baslik_tr) || '(başlıksız ilan)', grup: '', locked: false, prefix: '/ilan/', row: p,
      status: p.durum, def: listingDefaults(p),
      content: { h1s: [clean(p.baslik_tr)].filter(Boolean), intro: (clean(p.aciklama_tr).match(/^.*?[.!?](\s|$)/) || [clean(p.aciklama_tr)])[0], tokens: tokens(p.aciklama_tr), imgAlts: null, internal: null, external: null, heroH1: clean(p.baslik_tr) }
    }));
  }
  async function loadBlog() {
    const base = 'id,slug,baslik_tr,ozet_tr,icerik_tr,kapak_foto,durum,yayin_tarihi,created_at';
    let res = await supabaseClient.from('blog_posts').select(base + ',seo_baslik,seo_aciklama,odak_kelime,eski_sluglar').order('created_at', { ascending: false }).limit(1000);
    if (res.error && isMissingCol(res.error)) { S.seoCols = false; res = await supabaseClient.from('blog_posts').select(base).order('created_at', { ascending: false }).limit(1000); }
    if (res.error) { App.toast('Blog yazıları okunamadı: ' + res.error.message, 'error'); S.items.blog = []; return; }
    S.items.blog = (res.data || []).map(p => {
      const doc = new DOMParser().parseFromString('<div>' + String(p.icerik_tr || '') + '</div>', 'text/html');
      const c = contentOf(doc.body, doc);
      c.h1s = [clean(p.baslik_tr)].filter(Boolean); c.heroH1 = clean(p.baslik_tr);
      return { kind: 'blog', id: p.id, ad: clean(p.baslik_tr) || '(başlıksız yazı)', grup: '', locked: false, prefix: '/blog/', row: p, status: p.durum, def: blogDefaults(p), content: c };
    });
  }

  // ------------------------------------------------------------------ liste
  function visible() {
    const q = trLower(S.q).trim();
    return S.items[S.tab].filter(it => {
      if (isHiddenPage(it)) return false;
      if (S.filter === 'fix' && it.score === 'good') return false;
      if (S.filter === 'changed' && !it.changed) return false;
      if (!q) return true;
      return [it.ad, it.val.slug, it.val.baslik, it.val.odak].some(x => trLower(x).includes(q));
    });
  }
  function renderCounts() {
    ['sayfa', 'ilan', 'blog'].forEach(k => {
      const arr = S.items[k].filter(it => !isHiddenPage(it));
      const bad = arr.filter(i => i.score !== 'good').length;
      $('cnt-' + k).textContent = arr.length ? '(' + arr.length + (bad ? ' · ' + bad + ' düzeltilecek' : '') + ')' : '';
    });
  }
  function renderList() {
    renderCounts();
    const box = $('list'); box.textContent = '';
    const arr = visible();
    if (!arr.length) {
      box.appendChild(el('div', 'seo-empty', S.items[S.tab].length ? 'Bu filtreye uyan kayıt yok.' : (S.tab === 'ilan' ? 'Henüz ilan yok.' : S.tab === 'blog' ? 'Panelde henüz blog yazısı yok. (Sitedeki sabit yazılar "Sayfalar" sekmesinde.)' : 'Sayfa bulunamadı.')));
      return;
    }
    let lastGroup = null;
    arr.forEach(it => {
      if (it.grup && it.grup !== lastGroup) { box.appendChild(el('div', 'seo-group', it.grup)); lastGroup = it.grup; }
      const b = el('button', 'seo-row'); b.type = 'button';
      const face = el('span', 'face ' + it.score); face.title = 'SEO: ' + SCORE_TXT[it.score]; face.setAttribute('role', 'img'); face.setAttribute('aria-label', 'SEO: ' + SCORE_TXT[it.score]);
      const mid = el('div');
      const nm = el('div', 'r-name', it.ad);
      if (it.changed) nm.appendChild(el('span', 'tag ch', 'DEĞİŞTİRİLDİ'));
      if (it.val.noindex) nm.appendChild(el('span', 'tag hid', 'GOOGLE\'DA GİZLİ'));
      if (it.status && !['aktif', 'yayinda'].includes(it.status)) nm.appendChild(el('span', 'tag st', (DURUM[it.status] || it.status).toUpperCase()));
      mid.appendChild(nm);
      mid.appendChild(el('div', 'r-url', 'ismailunsal.com.tr' + pathOf(it, it.val.slug)));
      mid.appendChild(el('div', 'r-title', it.val.baslik || '(başlık yok)'));
      const meta = el('div', 'r-meta');
      const k = el('span'); k.appendChild(App.icon('key')); k.append(' '); k.appendChild(el('b', null, it.val.odak || '—')); meta.appendChild(k);
      const ts = titleState(it.val.baslik), ds = descState(it.val.aciklama);
      const t1 = el('span'); t1.appendChild(el('i', 'dot ' + ts.s)); t1.append(' Başlık ' + it.val.baslik.length); meta.appendChild(t1);
      const t2 = el('span'); t2.appendChild(el('i', 'dot ' + ds.s)); t2.append(' Açıklama ' + it.val.aciklama.length); meta.appendChild(t2);
      [t1, t2].forEach(x => { x.style.display = 'inline-flex'; x.style.alignItems = 'center'; x.style.gap = '5px'; });
      mid.appendChild(meta);
      const ph = effPhoto(it, it.val);
      const th = el('span', 'r-thumb' + (ph ? '' : ' none'), ph ? null : 'FOTO YOK');
      if (ph) th.style.backgroundImage = 'url("' + ph.replace(/["\\]/g, '') + '")';
      b.append(face, mid, th, el('span', 'r-go', 'Düzenle →'));
      b.onclick = () => openEditor(it);
      box.appendChild(b);
    });
  }

  // ------------------------------------------------------------------ düzenleyici
  function draftOf(it) {
    const v = it.val;
    return { odak: v.odak, baslik: v.baslik, aciklama: v.aciklama, slug: v.slug, foto_url: v.foto_url, foto_kaldir: v.foto_kaldir, foto_kapak: v.foto_kapak, foto_karartma: v.foto_karartma, noindex: v.noindex, eski: v.eski.slice() };
  }
  const isDirty = () => !!S.cur && JSON.stringify(S.draft) !== S.saved;
  const canEdit = (it) => it.kind === 'sayfa' ? S.dbReady : S.seoCols;

  function openEditor(it) {
    S.cur = it; S.draft = draftOf(it); S.saved = JSON.stringify(S.draft);
    $('ed').hidden = false; document.body.style.overflow = 'hidden';
    $('edTitle').textContent = it.ad;
    $('fOdak').value = S.draft.odak; $('fTitle').value = S.draft.baslik; $('fDesc').value = S.draft.aciklama;
    $('fSlug').value = it.locked ? '' : S.draft.slug;
    $('fSlug').disabled = it.locked; $('fSlug').placeholder = it.locked ? '(ana sayfa adresi değiştirilemez)' : '';
    $('sugSlug').hidden = it.locked;
    $('slugPre').textContent = 'ismailunsal.com.tr' + (it.kind === 'sayfa' ? '/' : it.prefix);
    $('fNoindex').checked = S.draft.noindex; $('noindexRow').hidden = it.kind !== 'sayfa';
    const editable = canEdit(it);
    ['fOdak', 'fTitle', 'fDesc', 'edSave', 'edReset', 'sugTitle', 'sugDesc', 'rstTitle', 'rstDesc', 'fNoindex', 'phUpBtn', 'phUrlBtn', 'phDel', 'phReset', 'phKapak', 'phDark'].forEach(id => { $(id).disabled = !editable; });
    if (!it.locked) $('fSlug').disabled = !editable;
    $('edSave').title = editable ? 'Kaydet (Ctrl+S)' : 'Önce veritabanı kurulumunu yapın (SQL dosyası)';
    $('phUrlRow').hidden = true;
    const list = visible(); const i = list.indexOf(it);
    $('edPrev').disabled = i <= 0; $('edNext').disabled = i < 0 || i >= list.length - 1;
    renderEditor();
    setTimeout(() => $('fOdak').focus(), 30);
  }
  function tryClose(after) {
    if (isDirty() && !window.confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?')) return false;
    if (after) after(); else { $('ed').hidden = true; document.body.style.overflow = ''; S.cur = null; renderList(); }
    return true;
  }
  function step(d) {
    const list = visible(); const i = list.indexOf(S.cur);
    const nx = list[i + d]; if (!nx) return;
    tryClose(() => openEditor(nx));
  }

  function renderEditor() {
    const it = S.cur; if (!it) return;
    const d = S.draft;
    // Başlık / açıklama çubukları
    const ts = titleState(d.baslik), ds = descState(d.aciklama);
    $('barTitle').className = ts.s; $('barTitle').style.width = ts.pct + '%';
    $('barDesc').className = ds.s; $('barDesc').style.width = ds.pct + '%';
    $('metaTitle').textContent = d.baslik.length + ' karakter · ~' + ts.w + ' / 600 px' + (ts.s === 'bad' && d.baslik ? ' — Google sonunu keser' : '');
    $('metaDesc').textContent = d.aciklama.length + ' karakter · ideal 120–156';
    $('rstTitle').disabled = !canEdit(it) || d.baslik === it.def.baslik;
    $('rstDesc').disabled = !canEdit(it) || d.aciklama === it.def.aciklama;
    // Adres
    const sl = slugCheck();
    $('fSlug').parentElement.classList.toggle('bad', !!sl.err);
    $('metaSlug').textContent = sl.err || sl.note;
    $('metaSlug').className = sl.err ? 'err' : 'yo-note';
    const livePath = pathOf(it, it.locked ? '' : (sl.slug || ''));
    const savedPath = pathOf(it, it.val.slug);
    const openable = it.kind === 'sayfa' || ['aktif', 'yayinda'].includes(it.status);
    App.iconText($('edOpen'), openable ? 'external' : '', openable ? ('ismailunsal.com.tr' + savedPath) : ('ismailunsal.com.tr' + savedPath + ' (' + (DURUM[it.status] || it.status || '') + ')'));
    if (openable) $('edOpen').href = savedPath + '?iu-seo-yenile=' + Date.now(); else $('edOpen').removeAttribute('href');
    // Odak kelime uyarısı
    const dup = dupOf(it, d.odak);
    $('odakWarn').hidden = !dup; if (dup) App.iconText($('odakWarn'), 'alert', 'Bu anahtar kelime "' + dup.ad + '" için de kullanılıyor.');
    // Google önizlemesi
    const gp = $('gp'); gp.className = 'gp ' + S.device;
    document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.dev === S.device));
    $('gpUrl').textContent = SITE + (livePath === '/' ? '' : ' › ' + livePath.replace(/^\//, '').split('/').join(' › '));
    let title = d.baslik || '(başlık yok)';
    const limit = S.device === 'desktop' ? 600 : 700;
    if (px(title, '20px Arial') > limit) { while (title.length > 5 && px(title + ' ...', '20px Arial') > limit) title = title.slice(0, -1); title = title.trim() + ' ...'; }
    $('gpTitle').textContent = title;
    const dmax = S.device === 'desktop' ? 158 : 130;
    $('gpDesc').textContent = d.aciklama ? (d.aciklama.length > dmax ? cutWords(d.aciklama, dmax).replace(/…$/, ' ...') : d.aciklama) : 'Meta açıklama yok — Google sayfadan rastgele bir metin gösterir.';
    const date = it.kind === 'blog' ? fmtDate(it.row.yayin_tarihi || it.row.created_at) : '';
    $('gpDate').textContent = date ? date + ' — ' : '';
    const ph = effPhoto(it, d);
    $('gpImg').hidden = !ph; $('gpImg').style.backgroundImage = ph ? 'url("' + ph.replace(/["\\]/g, '') + '")' : '';
    renderPhoto();
    // Analiz
    const R = analyze(it, d); const sc = score(R);
    $('edFace').className = 'face ' + sc; $('edFace').title = 'SEO: ' + SCORE_TXT[sc];
    $('scoreTxt').className = 'yo-score ' + sc; $('scoreTxt').textContent = SCORE_TXT[sc];
    const an = $('analysis'); const open = new Set(Array.from(an.querySelectorAll('.an-group:not(.closed)')).map(g => g.dataset.g));
    an.textContent = '';
    [['bad', 'Sorunlar'], ['ok', 'İyileştirmeler'], ['good', 'İyi sonuçlar']].forEach(([k, label]) => {
      const rs = R.filter(r => r.s === k); if (!rs.length) return;
      const g = el('div', 'an-group'); g.dataset.g = k;
      if (k === 'good' && !open.has('good')) g.classList.add('closed');
      const h = el('button', 'an-gh'); h.type = 'button'; h.appendChild(el('span', 'chev', '▾')); h.append(label + ' (' + rs.length + ')');
      h.onclick = () => g.classList.toggle('closed');
      const ul = el('ul', 'an-items');
      rs.forEach(r => { const li = el('li'); li.appendChild(el('i', 'dot ' + r.s)); li.appendChild(el('span', null, r.t)); ul.appendChild(li); });
      g.append(h, ul); an.appendChild(g);
    });
    // Eski adresler
    $('oldBox').hidden = !d.eski.length;
    const ol = $('oldList'); ol.textContent = '';
    d.eski.forEach(s => {
      const o = el('span', 'old'); o.append('ismailunsal.com.tr' + it.prefix.replace(/\/$/, '') + '/' + s);
      if (canEdit(it)) {
        const x = el('button', null, '×'); x.type = 'button'; x.title = 'Bu yönlendirmeyi kaldır';
        x.onclick = () => { if (window.confirm('"' + s + '" adresinden yeni adrese yönlendirme kaldırılsın mı? (Bu eski adrese gelenler sayfayı bulamaz.)')) { S.draft.eski = S.draft.eski.filter(z => z !== s); renderEditor(); } };
        o.appendChild(x);
      }
      ol.appendChild(o);
    });
    $('dirty').hidden = !isDirty();
  }

  function renderPhoto() {
    const it = S.cur, d = S.draft;
    const ph = effPhoto(it, d);
    const isCustom = !!safeImg(d.foto_url);
    const prev = $('phPrev');
    prev.classList.toggle('empty', !ph);
    const showHero = it.kind === 'sayfa' && it.kapak && ((isCustom && d.foto_kapak) || (!isCustom && !d.foto_kaldir && it.defHero));
    const dark = isCustom ? d.foto_karartma : 92;
    prev.style.backgroundImage = ph ? (showHero
      ? 'linear-gradient(135deg,rgba(10,42,94,' + (dark / 100) + ') 0%,rgba(27,67,128,' + (Math.max(30, dark - 10) / 100) + ') 100%),url("' + ph.replace(/["\\]/g, '') + '")'
      : 'url("' + ph.replace(/["\\]/g, '') + '")') : '';
    $('phH1').textContent = showHero ? (it.content.heroH1 || it.ad) : '';
    const help = $('photoHelp'); const st = $('phState');
    const btnsEditable = it.kind !== 'ilan';
    $('phBtns').hidden = !btnsEditable; $('phListingLink').hidden = btnsEditable;
    $('phKapakRow').hidden = !(it.kind === 'sayfa' && it.kapak && isCustom);
    $('phDarkRow').hidden = !(it.kind === 'sayfa' && it.kapak && isCustom && d.foto_kapak);
    $('phKapak').checked = !!d.foto_kapak; $('phDark').value = String(d.foto_karartma); $('phDarkV').textContent = '%' + d.foto_karartma;
    if (it.kind === 'ilan') {
      help.textContent = 'İlanın ana fotoğrafı Google\'da ve paylaşımlarda (WhatsApp, Facebook) görünür. İlan fotoğrafları ilan düzenleme sayfasından yönetilir.';
      st.textContent = ph ? 'Ana fotoğraf: ilanın vitrin fotoğrafı.' : 'Bu ilanda fotoğraf yok.';
      $('phListingLink').href = '/admin/property-edit.html?id=' + encodeURIComponent(it.id);
      return;
    }
    if (it.kind === 'blog') {
      help.textContent = 'Yazının kapak fotoğrafı: yazının üstünde, Google\'da ve paylaşımlarda görünür.';
      st.textContent = isCustom ? 'Kapak fotoğrafı var.' : 'Kapak fotoğrafı yok.';
      $('phDel').disabled = !canEdit(it) || !isCustom; $('phReset').hidden = true;
      return;
    }
    $('phReset').hidden = false;
    help.textContent = 'Sayfanın fotoğrafı Google\'da ve paylaşımlarda (WhatsApp, Facebook) görünür.' + (it.kapak ? ' İsterseniz sayfanın en üstünde (kapak alanında) da gösterilir.' : '');
    if (isCustom) st.textContent = 'Özel fotoğraf yüklendi' + (it.kapak ? (d.foto_kapak ? ' — sayfanın üstünde ve paylaşımlarda görünüyor.' : ' — yalnızca paylaşımlarda görünüyor.') : '.');
    else if (d.foto_kaldir) st.textContent = 'Fotoğraf silindi — sayfada ve paylaşımlarda fotoğraf görünmüyor.';
    else if (it.defHero) st.textContent = 'Varsayılan: sayfanın mevcut üst fotoğrafı. Yeni fotoğraf yükleyerek değiştirebilir ya da silebilirsiniz.';
    else st.textContent = ph ? 'Varsayılan: sitenin paylaşım görseli (sayfanın üstünde fotoğraf yok). Bu sayfaya özel fotoğraf yükleyebilirsiniz.' : 'Bu sayfada fotoğraf yok.';
    $('phDel').disabled = !canEdit(it) || !ph;
    $('phReset').disabled = !canEdit(it) || !(isCustom || d.foto_kaldir);
  }

  /** Adres doğrulama → { slug, err, note } */
  function slugCheck() {
    const it = S.cur;
    if (it.locked) return { slug: '', err: '', note: 'Ana sayfanın adresi sabittir.' };
    const max = MAXSLUG[it.kind];
    const raw = String($('fSlug').value || '');
    let s = slugify(raw, max);
    if (it.kind === 'sayfa' && !s) s = it.id;
    if (!s) return { slug: '', err: 'Adres boş olamaz.' };
    if (!SLUG_RE.test(s)) return { slug: s, err: 'Adreste yalnızca küçük harf, rakam ve tire (-) kullanılabilir.' };
    if (it.kind === 'sayfa') {
      if (s !== it.id && (S.reg.rezerve || []).includes(s)) return { slug: s, err: '"' + s + '" adresi sistem tarafından kullanılıyor. Başka bir adres yazın.' };
      const other = S.items.sayfa.find(o => o !== it && (o.id === s || o.val.slug === s));
      if (other) return { slug: s, err: 'Bu adres "' + other.ad + '" sayfasında kullanılıyor.' };
    }
    const changed = s !== it.val.slug;
    const note = changed && it.val.slug
      ? 'Adres değişecek: /' + (it.kind === 'sayfa' ? '' : it.prefix.replace(/^\/|\/$/g, '') + '/') + it.val.slug + ' → yeni adres. Eski adres otomatik olarak yeni adrese yönlendirilir (301).'
      : (it.kind === 'sayfa' && s === it.id ? 'Varsayılan adres.' : 'Kısa, anlaşılır ve anahtar kelimeyi içeren adresler en iyisidir.');
    return { slug: s, err: '', note };
  }

  function suggestTitle() {
    const it = S.cur, d = S.draft;
    const kp = titleCase(d.odak || it.def.odak || '');
    if (!kp) { App.toast('Önce odak anahtar kelimeyi yazın.', 'warning'); return; }
    let t;
    if (it.kind === 'ilan') t = clean(it.row.baslik_tr);
    else if (it.kind === 'blog') t = clean(it.row.baslik_tr);
    else t = kp;
    if (it.kind !== 'sayfa' && phrasePos(tokens(t), tokens(kp)) < 0) t = kp + ' – ' + t;
    let out = t + ' | ' + BRAND;
    if (px(out, '20px Arial') > 580) out = t + ' | TURYAP';
    if (px(out, '20px Arial') > 590) out = cutWords(t, 58);
    S.draft.baslik = out; $('fTitle').value = out; renderEditor();
  }
  function suggestDesc() {
    const it = S.cur, d = S.draft;
    const kp = clean(d.odak || it.def.odak || '');
    if (!kp) { App.toast('Önce odak anahtar kelimeyi yazın.', 'warning'); return; }
    let base = clean(it.kind === 'ilan' ? it.row.aciklama_tr : it.kind === 'blog' ? (it.row.ozet_tr || '') : (it.content.intro || it.def.aciklama));
    if (!base) base = it.def.aciklama || '';
    const kpc = kp.charAt(0).toLocaleUpperCase('tr-TR') + kp.slice(1);
    let out = allIn(tokens(base.slice(0, 120)), content(tokens(kp))) ? base : kpc + ': ' + base.charAt(0).toLocaleLowerCase('tr-TR') + base.slice(1);
    if (out.length > 156) {
      const cut = out.slice(0, 156); const dot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
      out = dot > 100 ? cut.slice(0, dot + 1) : cutWords(out, 155);
    }
    S.draft.aciklama = out; $('fDesc').value = out; renderEditor();
  }

  /** Kaydettikten sonra sitenin bu bölgedeki ayar önbelleğini hemen yeniler (başka yerlerde en geç ~30 sn). */
  function pingSite(it) {
    try { fetch(pathOf(it, it.val.slug) + '?iu-seo-yenile=' + Date.now(), { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' }).catch(() => {}); } catch (_) { /* önemli değil */ }
  }

  // ------------------------------------------------------------------ kaydetme
  async function save() {
    const it = S.cur; if (!it || S.busy) return;
    if (!canEdit(it)) { App.toast('Önce veritabanı kurulumunu yapın (SQL dosyası).', 'warning'); return; }
    const d = S.draft;
    d.odak = clean($('fOdak').value).slice(0, 100); d.baslik = clean($('fTitle').value).slice(0, 120); d.aciklama = clean($('fDesc').value).slice(0, 320);
    const sl = slugCheck();
    if (sl.err) { App.toast(sl.err, 'error'); $('fSlug').focus(); return; }
    if (!d.baslik) { App.toast('SEO başlığı boş olamaz ("Varsayılan başlık" ile geri alabilirsiniz).', 'warning'); $('fTitle').focus(); return; }
    if (!d.aciklama) { App.toast('Meta açıklama boş olamaz.', 'warning'); $('fDesc').focus(); return; }
    const newSlug = it.locked ? '' : sl.slug;
    if (!it.locked && newSlug !== it.val.slug && it.val.slug) {
      const ok = await App.confirm('Sayfanın adresi değişecek:\n\n' + 'ismailunsal.com.tr' + pathOf(it, it.val.slug) + '\n→ ismailunsal.com.tr' + pathOf(it, newSlug) +
        '\n\nEski adrese gelenler otomatik olarak yeni adrese yönlendirilir (Google sıralaması korunur).', 'Adres değişikliği');
      if (!ok) return;
    }
    S.busy = true; $('edSave').disabled = true; $('edSave').textContent = 'Kaydediliyor…';
    try {
      if (it.kind === 'sayfa') {
        const row = {
          sayfa: it.id,
          slug: it.locked || newSlug === it.id ? null : newSlug,
          odak_kelime: d.odak && d.odak !== it.def.odak ? d.odak : null,
          baslik: d.baslik !== it.def.baslik ? d.baslik : null,
          aciklama: d.aciklama !== it.def.aciklama ? d.aciklama : null,
          foto_url: safeImg(d.foto_url) || null,
          foto_kaldir: !safeImg(d.foto_url) && !!d.foto_kaldir,
          foto_kapak: !!d.foto_kapak,
          foto_karartma: Math.min(95, Math.max(50, Math.round(+d.foto_karartma || 80))),
          noindex: !!d.noindex,
          eski_sluglar: d.eski.filter(s => SLUG_RE.test(s)),
          aktif: true
        };
        const { data, error } = await supabaseClient.from('sayfa_seo').upsert(row, { onConflict: 'sayfa' }).select().single();
        if (error) throw error;
        it.row = data;
      } else {
        const table = it.kind === 'ilan' ? 'properties' : 'blog_posts';
        if (newSlug !== it.val.slug) {
          const { data: taken, error: e1 } = await supabaseClient.from(table).select('id').eq('slug', newSlug).neq('id', it.id).limit(1);
          if (e1) throw e1;
          if (taken && taken.length) throw new Error('Bu adres başka bir ' + (it.kind === 'ilan' ? 'ilanda' : 'yazıda') + ' kullanılıyor.');
        }
        const upd = {
          slug: newSlug,
          odak_kelime: d.odak && d.odak !== it.def.odak ? d.odak : null,
          seo_baslik: d.baslik !== it.def.baslik ? d.baslik : null,
          seo_aciklama: d.aciklama !== it.def.aciklama ? d.aciklama : null,
          eski_sluglar: d.eski.filter(s => SLUG_RE.test(s))
        };
        const { data, error } = await supabaseClient.from(table).update(upd).eq('id', it.id).select().single();
        if (error) throw error;
        Object.assign(it.row, data || upd);
        if (it.kind === 'ilan') it.def = listingDefaults(it.row); else it.def = blogDefaults(it.row);
      }
      const slugChanged = !it.locked && newSlug !== it.val.slug;
      refreshAll(); S.draft = draftOf(it); S.saved = JSON.stringify(S.draft);
      pingSite(it);
      $('fOdak').value = S.draft.odak; $('fTitle').value = S.draft.baslik; $('fDesc').value = S.draft.aciklama; if (!it.locked) $('fSlug').value = S.draft.slug;
      renderEditor(); renderCounts();
      App.toast(slugChanged ? 'Kaydedildi. Yeni adres en geç 1 dakika içinde yayında; eski adres otomatik yönlenir.' : 'Kaydedildi — en geç 1 dakika içinde sitede yayında.', 'success', 'SEO');
    } catch (e) {
      App.toast(friendly(e), 'error', 'Kaydedilemedi');
    } finally {
      S.busy = false; $('edSave').disabled = !canEdit(it); App.iconText($('edSave'), 'save', 'Kaydet');
    }
  }
  function friendly(e) {
    const m = (e && e.message) || String(e);
    if (/duplicate key|unique/i.test(m)) return 'Bu adres başka bir kayıtta kullanılıyor. Farklı bir adres yazın.';
    if (/row-level security|permission denied/i.test(m)) return 'Bu işlem için yetkiniz yok.';
    if (/check constraint/i.test(m)) return 'Girilen değer kurallara uymuyor (adres, fotoğraf adresi veya uzunluk).';
    if (isMissingTable(e) || isMissingCol(e)) return 'Önce veritabanı kurulumunu yapın (supabase-seo-2026-09-30.sql).';
    return m;
  }

  /** Fotoğraf değişikliklerini hemen kaydeder (yükle / adresle ekle / sil / varsayılana dön). */
  async function savePhoto(fields, msg) {
    const it = S.cur; if (!it) return;
    try {
      if (it.kind === 'sayfa') {
        const row = Object.assign({ sayfa: it.id, aktif: true }, fields);
        const { data, error } = await supabaseClient.from('sayfa_seo').upsert(row, { onConflict: 'sayfa' }).select().single();
        if (error) throw error;
        it.row = data;
      } else if (it.kind === 'blog') {
        const { data, error } = await supabaseClient.from('blog_posts').update({ kapak_foto: fields.foto_url || null }).eq('id', it.id).select().single();
        if (error) throw error;
        Object.assign(it.row, data || { kapak_foto: fields.foto_url || null });
      }
      // Sadece fotoğraf alanlarını güncelle; diğer kaydedilmemiş değişiklikler korunur
      const keep = S.draft; const before = JSON.parse(S.saved);
      refreshAll(); pingSite(it);
      const fresh = draftOf(it);
      ['foto_url', 'foto_kaldir', 'foto_kapak', 'foto_karartma'].forEach(k => { keep[k] = fresh[k]; before[k] = fresh[k]; });
      S.saved = JSON.stringify(before);
      renderEditor();
      App.toast(msg, 'success', 'Fotoğraf');
    } catch (e) { App.toast(friendly(e), 'error', 'Fotoğraf kaydedilemedi'); }
  }

  /** "Fotoğrafı değiştir": bilgisayardan yükle veya Görsel Deposu'ndan seç (dosya adıyla birlikte) → hemen kaydedilir */
  async function pickPhoto() {
    const it = S.cur; if (!it || !canEdit(it) || it.kind === 'ilan') return;
    const res = await Medya.picker({
      title: it.kind === 'blog' ? 'Kapak fotoğrafı' : 'Sayfa fotoğrafı',
      name: Medya.slug(clean(S.draft.odak || it.def.odak || it.ad), 60), noAlt: true,
      folder: it.kind === 'blog' ? 'blog' : 'site', current: effPhoto(it, S.draft)
    });
    if (!res || !safeImg(res.url)) return;
    await savePhoto({ foto_url: res.url, foto_kaldir: false, foto_kapak: true }, 'Fotoğraf kaydedildi.');
  }

  // ------------------------------------------------------------------ olaylar
  function bind() {
    document.querySelectorAll('.seo-tab').forEach(b => b.onclick = () => {
      S.tab = b.dataset.tab;
      document.querySelectorAll('.seo-tab').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      renderList();
    });
    document.querySelectorAll('.seo-filter button').forEach(b => b.onclick = () => {
      S.filter = b.dataset.f; document.querySelectorAll('.seo-filter button').forEach(x => x.classList.toggle('on', x === b)); renderList();
    });
    $('q').addEventListener('input', () => { S.q = $('q').value; renderList(); });
    $('edClose').onclick = () => tryClose(); $('edCancel').onclick = () => tryClose();
    $('edPrev').onclick = () => step(-1); $('edNext').onclick = () => step(1);
    $('ed').addEventListener('mousedown', (e) => { if (e.target === $('ed')) tryClose(); });
    document.addEventListener('keydown', (e) => {
      if ($('ed').hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); tryClose(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); save(); }
    });
    window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
    $('fOdak').addEventListener('input', () => { S.draft.odak = $('fOdak').value; renderEditor(); });
    $('fTitle').addEventListener('input', () => { S.draft.baslik = $('fTitle').value; renderEditor(); });
    $('fDesc').addEventListener('input', () => { S.draft.aciklama = $('fDesc').value; renderEditor(); });
    $('fSlug').addEventListener('input', () => {
      const f = $('fSlug'); const v = slugLive(f.value, MAXSLUG[S.cur.kind]);
      if (v !== f.value) f.value = v;
      S.draft.slug = slugify(v, MAXSLUG[S.cur.kind]) || (S.cur.kind === 'sayfa' ? S.cur.id : ''); renderEditor();
    });
    $('fSlug').addEventListener('blur', () => { const f = $('fSlug'); if (S.cur && !S.cur.locked) { f.value = slugify(f.value, MAXSLUG[S.cur.kind]) || (S.cur.kind === 'sayfa' ? S.cur.id : ''); S.draft.slug = f.value; renderEditor(); } });
    $('sugSlug').onclick = () => {
      const s = slugify(S.draft.odak || S.cur.def.odak, MAXSLUG[S.cur.kind]);
      if (!s) { App.toast('Önce odak anahtar kelimeyi yazın.', 'warning'); return; }
      $('fSlug').value = s; S.draft.slug = s; renderEditor();
    };
    $('sugTitle').onclick = suggestTitle; $('sugDesc').onclick = suggestDesc;
    $('rstTitle').onclick = () => { S.draft.baslik = S.cur.def.baslik; $('fTitle').value = S.draft.baslik; renderEditor(); };
    $('rstDesc').onclick = () => { S.draft.aciklama = S.cur.def.aciklama; $('fDesc').value = S.draft.aciklama; renderEditor(); };
    document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { S.device = b.dataset.dev; renderEditor(); });
    $('fNoindex').onchange = () => { S.draft.noindex = $('fNoindex').checked; renderEditor(); };
    $('phKapak').onchange = () => { S.draft.foto_kapak = $('phKapak').checked; renderEditor(); };
    $('phDark').addEventListener('input', () => { S.draft.foto_karartma = +$('phDark').value; renderEditor(); });
    $('phUpBtn').addEventListener('click', pickPhoto);
    $('phUrlBtn').onclick = () => { $('phUrlRow').hidden = !$('phUrlRow').hidden; if (!$('phUrlRow').hidden) $('phUrl').focus(); };
    $('phUrlOk').onclick = async () => {
      const u = safeImg($('phUrl').value);
      if (!u) { App.toast('Fotoğraf adresi https:// ile başlamalı ve boşluk / tırnak içermemeli.', 'warning'); return; }
      const ok = await new Promise(res => { const i = new Image(); const t = setTimeout(() => res(false), 12000); i.onload = () => { clearTimeout(t); res(i.naturalWidth > 0); }; i.onerror = () => { clearTimeout(t); res(false); }; i.src = u; });
      if (!ok) { App.toast('Bu adreste bir görsel bulunamadı.', 'error'); return; }
      $('phUrl').value = ''; $('phUrlRow').hidden = true;
      await savePhoto({ foto_url: u, foto_kaldir: false, foto_kapak: true }, 'Fotoğraf eklendi ve kaydedildi.');
    };
    $('phDel').onclick = async () => {
      if (!(await App.confirm(S.cur.kind === 'blog' ? 'Kapak fotoğrafı kaldırılsın mı?' : 'Sayfa fotoğrafı kaldırılsın mı? Sayfanın üst kısmında ve paylaşımlarda fotoğraf görünmez. (Dosya Görsel Deposu\'nda kalır.)', 'Fotoğrafı kaldır'))) return;
      await savePhoto(S.cur.kind === 'blog' ? { foto_url: null } : { foto_url: null, foto_kaldir: true }, 'Fotoğraf kaldırıldı.');
    };
    $('phReset').onclick = async () => {
      if (!(await App.confirm('Sayfanın varsayılan fotoğraf ayarına dönülsün mü?', 'Varsayılan fotoğraf'))) return;
      await savePhoto({ foto_url: null, foto_kaldir: false, foto_kapak: true, foto_karartma: 80 }, 'Varsayılan fotoğrafa dönüldü.');
    };
    $('edReset').onclick = async () => {
      const it = S.cur;
      if (!(await App.confirm('Bu ' + (it.kind === 'sayfa' ? 'sayfanın' : it.kind === 'ilan' ? 'ilanın' : 'yazının') + ' odak kelime, başlık ve açıklaması varsayılana dönsün mü?' + (it.kind === 'sayfa' && !it.locked ? ' Adres de varsayılan adrese döner (özel adres varsa oradan yönlendirilir).' : '') + ' Kaydet\'e basınca uygulanır.', 'Varsayılana dön'))) return;
      S.draft.odak = it.def.odak; S.draft.baslik = it.def.baslik; S.draft.aciklama = it.def.aciklama;
      if (it.kind === 'sayfa') { S.draft.noindex = false; if (!it.locked) { S.draft.slug = it.id; $('fSlug').value = it.id; } }
      $('fOdak').value = S.draft.odak; $('fTitle').value = S.draft.baslik; $('fDesc').value = S.draft.aciklama; $('fNoindex').checked = S.draft.noindex;
      renderEditor();
    };
    $('edSave').onclick = save;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('seo'))) return;
    bind();
    try {
      await loadRegistry();
    } catch (e) {
      $('list').textContent = '';
      $('list').appendChild(el('div', 'seo-empty', 'SEO modülüne ulaşılamadı: ' + e.message + '. Sayfayı yenileyin; sorun sürerse site güncellemesinin yayına girmesini bekleyin.'));
      return;
    }
    await Promise.all([loadPages(), loadListings(), loadBlog()]);
    refreshAll();          // yinelenen anahtar kelime kontrolü tüm liste yüklendikten sonra hesaplanır
    $('setupAlert').hidden = S.dbReady && S.seoCols;
    renderList();
    const qp = new URLSearchParams(location.search);
    const want = qp.get('sayfa'), ilan = qp.get('ilan'), blog = qp.get('blog');
    const target = want ? S.items.sayfa.find(i => i.id === want) : ilan ? S.items.ilan.find(i => String(i.id) === ilan) : blog ? S.items.blog.find(i => String(i.id) === blog) : null;
    if (target) { S.tab = target.kind; document.querySelectorAll('.seo-tab').forEach(x => x.classList.toggle('on', x.dataset.tab === S.tab)); renderList(); openEditor(target); }
  });
})();
