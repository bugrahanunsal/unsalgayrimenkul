/**
 * ============================================================================
 *  functions/_middleware.js — SEO & ADRES (URL) YÖNETİCİSİ
 *  İsmail Ünsal Gayrimenkul — Cloudflare Pages Functions
 * ============================================================================
 *  Panelde (Admin → SEO Ayarları) yapılan ayarları, sayfa tarayıcıya / Google'a
 *  gitmeden ÖNCE sunucuda uygular:
 *   • Özel adres (slug): /yeni-adres → ilgili sayfa (içerik aynı, adres yeni)
 *   • Eski adresler (varsayılan adres, .html, önceki slug'lar) → 301 ile yeni adrese
 *   • <title>, meta açıklama, canonical, Open Graph / Twitter etiketleri, noindex
 *   • Sayfa fotoğrafı: sayfanın üst (kapak) alanı + Google / WhatsApp / Facebook görseli
 *   • İlan (/ilan/<slug>) ve blog (/blog/<slug>) sayfalarında sunucu tarafı SEO,
 *     eski slug → 301, olmayan ilan/yazı → gerçek 404 (Google "soft 404" görmez)
 *   • /sitemap.xml: her zaman güncel (sayfalar + aktif ilanlar + yayındaki yazılar)
 *
 *  Güvenlik:
 *   • Yalnızca herkese açık (publishable) Supabase anahtarı kullanılır. Veritabanı
 *     RLS kuralları sadece yayındaki verinin okunmasına izin verir; yazma yok.
 *   • Veritabanından gelen HER değer HTML'e yazılmadan önce doğrulanır ve kaçışlanır:
 *     slug yalnızca [a-z0-9-], görsel yalnızca https (tırnak/parantez/boşluk yok),
 *     metinler HTML-escape. Yönlendirmeler yalnızca site içi yollara yapılır.
 *   • Hata / zaman aşımı olursa site ETKİLENMEZ: ayarlar uygulanmadan normal sayfa döner.
 * ============================================================================
 */

const SITE = 'https://ismailunsal.com.tr';
// Eski / alternatif alan adları → tek resmi adrese 301 (Google tek adres görsün)
const ALT_HOSTS = new Set(['www.ismailunsal.com.tr', 'unsalgayrimenkul.com', 'www.unsalgayrimenkul.com']);
const SUPABASE_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4'; // herkese açık anahtar (RLS korur)
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_IMG_RE = /^https:\/\/[^\s"'<>()\\`]+$/i;
const LANG_RE = /^\/(en|fr|de|ru|ar)(?=\/|$)/i;
const TTL = 30 * 1000;              // panel değişikliği en geç ~30 sn'de yayında
const SITEMAP_TTL = 10 * 60 * 1000;
const FETCH_TIMEOUT = 2500;
const H = { html: true };

/**
 * Sitenin sabit sayfaları. key = dosya adı (uzantısız) = varsayılan adres.
 * odak = varsayılan odak anahtar kelime (panelden değiştirilebilir).
 * hero = sayfanın üst (kapak) alanının CSS seçicisi (sayfa fotoğrafı buraya uygulanır).
 */
const SAYFALAR = [
  { key: 'index', ad: 'Ana Sayfa', grup: 'Ana sayfalar', hero: '.hero', odak: 'yalova emlak', kilitli: true,
    varsayilanFoto: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80' },
  { key: 'hakkimizda', ad: 'Hakkımızda', grup: 'Ana sayfalar', hero: '.about-hero', odak: 'yalova gayrimenkul danışmanı' },
  { key: 'iletisim', ad: 'İletişim', grup: 'Ana sayfalar', hero: '.contact-hero', odak: 'turyap yalova iletişim', metin: false },
  { key: 'blog', ad: 'Blog (liste sayfası)', grup: 'Ana sayfalar', hero: '.page-hero', odak: 'yalova emlak rehberi', metin: false },
  { key: 'faq', ad: 'Sıkça Sorulan Sorular', grup: 'Ana sayfalar', hero: '.sss-hero', odak: 'yalova emlak soruları', metin: false },
  { key: 'yalova-satilik-daire', ad: 'Satılık Daire', grup: 'İlan kategorileri', hero: '.page-hero', odak: 'yalova satılık daire' },
  { key: 'yalova-satilik-ev', ad: 'Satılık Ev', grup: 'İlan kategorileri', hero: '.page-hero', odak: 'yalova satılık ev' },
  { key: 'yalova-satilik-arsa', ad: 'Satılık Arsa', grup: 'İlan kategorileri', hero: '.page-hero', odak: 'yalova satılık arsa' },
  { key: 'yalova-kiralik-daire', ad: 'Kiralık Daire', grup: 'İlan kategorileri', hero: '.page-hero', odak: 'yalova kiralık daire' },
  { key: 'yalova-kiralik-ev', ad: 'Kiralık Ev', grup: 'İlan kategorileri', hero: '.page-hero', odak: 'yalova kiralık ev' },
  { key: 'yalova-kiralik-villa', ad: 'Kiralık Villa (Lüks)', grup: 'İlan kategorileri', hero: '.page-hero', odak: 'yalova kiralık villa' },
  { key: 'yalova-esyali-kiralik-daire', ad: 'Eşyalı Kiralık Daire', grup: 'İlan kategorileri', hero: '.page-hero', odak: 'yalova eşyalı kiralık daire' },
  { key: 'yalova-merkez-kiralik-daire', ad: 'Merkez Kiralık Daire', grup: 'İlan kategorileri', hero: '.page-hero', odak: 'yalova merkez kiralık daire' },
  { key: 'yerel-uzmanlik', ad: 'Yerel Uzmanlık', grup: 'Hizmetler', hero: '.svc-hero', odak: 'yalova bölge' },
  { key: 'cok-dilli-hizmet', ad: 'Çok Dilli Hizmet', grup: 'Hizmetler', hero: '.svc-hero', odak: 'yabancı yatırımcı' },
  { key: '724-destek', ad: '7/24 Destek', grup: 'Hizmetler', hero: '.svc-hero', odak: '7/24 destek' },
  { key: 'blog-yalova-arsa-yatirimi-2026', ad: 'Yazı: Yalova Arsa Yatırımı 2026', grup: 'Blog yazıları (sitede sabit)', hero: '.article-hero',
    odak: 'yalova arsa yatırımı', blogSlug: 'yalova-arsa-yatirimi-2026', makale: true },
  { key: 'blog-akkoy-yatirim-rehberi', ad: 'Yazı: Akköy Yatırım Rehberi', grup: 'Blog yazıları (sitede sabit)', hero: '.article-hero',
    odak: 'akköy yatırım', blogSlug: 'akkoy-yatirim-rehberi', makale: true },
  { key: 'gizlilik-politikasi', ad: 'Gizlilik Politikası (KVKK)', grup: 'Yasal', hero: '.legal-hero', odak: 'gizlilik politikası', metin: false }
];
const BY_KEY = new Map(SAYFALAR.map(p => [p.key, p]));

// Hiçbir sayfaya verilemeyecek adresler: sistem yolları, diller, sitedeki diğer dosyalar,
// mevcut kısa yönlendirmeler (_redirects).
const REZERVE = new Set([
  'admin', 'api', 'ilan', 'blog', 'blog-yazi', 'en', 'fr', 'de', 'ru', 'ar', 'tr', 'cdn-cgi', 'functions', 'assets',
  'sitemap', 'robots', 'favicon', 'index', 'hesabim', 'account', 'favorilerim', 'sifre-belirle', 'sifre-sifirla',
  'verify', 'unsubscribe', 'login', 'giris', 'kayit', 'arama', 'search', 'sss', 'sikca-sorulan-sorular', 'hakkimda',
  'contact', 'kvkk', 'kvkk-aydinlatma-metni', 'kullanim-kosullari', 'privacy', 'privacy-policy', 'terms', 'gizlilik',
  'yalova-satilik', 'yalova-kiralik', 'luks', 'foto-bekleniyor', 'ismail-unsal', 'apple-touch-icon'
]);

// ---------------------------------------------------------------------------
//  Giriş noktası
// ---------------------------------------------------------------------------
export async function onRequest(context) {
  const { request, next } = context;
  try { if (typeof context.passThroughOnException === 'function') context.passThroughOnException(); } catch (_) { /* yok */ }
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD') return next();
  let url;
  try { url = new URL(request.url); } catch (_) { return next(); }
  const state = { fetched: null };
  try {
    return await handle(context, url, state);
  } catch (err) {
    console.error('[seo] hata:', err && err.message ? err.message : err);
    // Sayfa zaten alındıysa onu olduğu gibi döndür; alınmadıysa normal akış
    return state.fetched || next();
  }
}

async function handle(context, url, state) {
  const { request, env } = context;
  const path = url.pathname;

  // 1) Resmi alan adına yönlendir (www / eski alan adı)
  if (ALT_HOSTS.has(url.hostname.toLowerCase()) && !path.startsWith('/admin') && !path.startsWith('/api/')) {
    return redirect(SITE + path + url.search, 3600);
  }

  // 2) Panelin kullandığı sayfa listesi (herkese açık, gizli bilgi yok)
  if (path === '/api/seo-sayfalar') return registryResponse();
  if (path.startsWith('/api/') || path.startsWith('/admin') || path.startsWith('/cdn-cgi/')) return context.next();

  // 3) Güncel site haritası
  if (path === '/sitemap.xml') return sitemapResponse(context, url);

  // Panel kaydettikten sonra "?iu-seo-yenile" ile ayarları hemen tazeletir (kötüye kullanıma karşı 3 sn'de en fazla 1 kez)
  if (url.searchParams.has('iu-seo-yenile') && Date.now() - MEM.forcedAt > 3000) {
    MEM.forcedAt = Date.now(); MEM.force = true; MEM.at = 0; MEM.failAt = 0; SITEMAP_MEM.at = 0; LISTING_MEM.clear();
  }

  // Uzantılı dosyalar (.js, .css, .png ...) — dokunma (.html hariç)
  const last = path.slice(path.lastIndexOf('/') + 1);
  if (/\.[a-z0-9]{1,6}$/i.test(last) && !/\.html?$/i.test(last)) return context.next();

  // Panel, varsayılan içeriği görmek için ham sayfayı ister (ayar uygulanmaz)
  if (request.headers.get('x-iu-seo-raw') === '1') return context.next(cleanRequest(request, url.toString()));

  const { lang, rest } = splitLang(path);
  const lp = lang ? '/' + lang : '';

  // 4) İlan sayfası: /ilan/<slug>  ve eski biçim /ilan?id=<id>
  const mIlan = rest.match(/^\/ilan\/([^/]+)\/?$/i);
  if (mIlan) return listingPage(context, url, state, lp, mIlan[1]);
  if (/^\/ilan(\.html)?\/?$/i.test(rest) && url.searchParams.has('id')) return listingById(context, url, lp);

  // 5) Blog yazısı: /blog/<slug>
  const mBlog = rest.match(/^\/blog\/([^/]+)\/?$/i);
  if (mBlog) return blogPage(context, url, state, lp, mBlog[1]);

  // 6) Sabit sayfalar
  const seg = pageSegment(rest);
  if (seg === null) return context.next();
  return staticPage(context, url, state, lang, lp, seg);
}

// ---------------------------------------------------------------------------
//  Sabit sayfalar
// ---------------------------------------------------------------------------
async function staticPage(context, url, state, lang, lp, seg) {
  const bundle = await getBundle(context, url);
  const R = routing(bundle);
  let key;
  if (seg === '') key = 'index';
  else if (R.slugToKey.has(seg)) key = R.slugToKey.get(seg);
  else if (R.keyToSlug.has(seg) && R.keyToSlug.get(seg) !== seg) {
    return redirect(url.origin + lp + pagePath(seg, R) + url.search, 600);   // varsayılan adres → özel adres
  } else if (R.oldToKey.has(seg)) {
    return redirect(url.origin + lp + pagePath(R.oldToKey.get(seg), R) + url.search, 600); // eski slug → güncel
  } else {
    return context.next();                                                      // bizim sayfamız değil
  }

  const P = BY_KEY.get(key);
  // Panele aktarılmış sabit blog yazısı → yeni blog adresine kalıcı yönlendir
  if (P.blogSlug && R.blogBySlug.has(P.blogSlug)) {
    return redirect(url.origin + lp + '/blog/' + P.blogSlug + url.search, 600);
  }

  // Adresin tek resmi biçimi: küçük harf, .html yok, sonda / yok (dil ana sayfası hariç)
  const canonicalPath = lp + pagePath(key, R);
  const isLangHome = key === 'index' && lang;
  if (!isLangHome && url.pathname !== canonicalPath) return redirect(url.origin + canonicalPath + url.search, 600);

  const assetPath = key === 'index' ? '/' : '/' + key;
  const res = await context.env.ASSETS.fetch(cleanRequest(context.request, url.origin + assetPath));
  state.fetched = res;
  if (!isHtmlOk(res) || context.request.method === 'HEAD') return res;

  const S = R.settings.get(key) || {};
  const canonical = SITE + pagePath(key, R);
  const photo = S.foto_url || '';
  return transform(res, {
    title: S.baslik || '',
    desc: S.aciklama || '',
    canonical,
    image: photo,
    removeImage: !photo && !!S.foto_kaldir,
    noindex: !!S.noindex,
    htmlAttrs: Object.assign({ 'data-iu-page': key }, R.slugAttr ? { 'data-iu-slugs': R.slugAttr } : {}),
    headExtra: heroCss(P, S),
    linkMap: R.linkMap,
    status: res.status
  });
}

function pagePath(key, R) {
  if (key === 'index') return '/';
  return '/' + (R.keyToSlug.get(key) || key);
}

function heroCss(P, S) {
  if (!P || !P.hero) return '';
  const sel = P.hero;
  if (S.foto_url && S.foto_kapak !== false) {
    const k = Math.min(95, Math.max(40, parseInt(S.foto_karartma, 10) || 80));
    const a = (k / 100).toFixed(2), b = (Math.max(30, k - 10) / 100).toFixed(2);
    return `<link rel="preload" as="image" href="${escAttr(S.foto_url)}" fetchpriority="high">` +
      `<style id="iu-seo-foto">${sel}{background:linear-gradient(135deg,rgba(10,42,94,${a}) 0%,rgba(27,67,128,${b}) 100%),url("${S.foto_url}") center/cover no-repeat !important}</style>`;
  }
  if (S.foto_kaldir && !S.foto_url && P.varsayilanFoto) {
    return `<style id="iu-seo-foto">${sel}{background:linear-gradient(135deg,#0A2A5E 0%,#1B4380 100%) !important}</style>`;
  }
  return '';
}

// ---------------------------------------------------------------------------
//  İlan sayfaları
// ---------------------------------------------------------------------------
const KATEGORI = { daire: 'Daire', villa: 'Villa', arsa: 'Arsa', mustakil_ev: 'Müstakil Ev', isyeri: 'İşyeri', tarla: 'Tarla', yazlik: 'Yazlık', dukkan: 'Dükkan' };
const TIP = { satilik: 'Satılık', kiralik: 'Kiralık' };
const PARA = { TL: '₺', USD: '$', EUR: '€' };

async function listingPage(context, url, state, lp, rawSlug) {
  let s;
  try { s = decodeURIComponent(rawSlug).toLowerCase(); } catch (_) { return context.next(); }
  if (!SLUG_RE.test(s) || s.length > 220) return context.next();
  const want = lp + '/ilan/' + s;
  if (url.pathname !== want) return redirect(url.origin + want + url.search, 600);

  const info = await getListing(context, url, s);
  if (info && info.redirect) return redirect(url.origin + lp + '/ilan/' + info.redirect + url.search, 600);

  const res = await context.next(cleanRequest(context.request, url.toString()));
  state.fetched = res;
  if (!info || !isHtmlOk(res) || context.request.method === 'HEAD') {
    if (info && info.missing && context.request.method === 'HEAD') return withStatus(res, 404);
    return res;
  }
  const R = routing(await getBundle(context, url));
  if (info.missing) {
    return transform(res, { noindex: true, status: 404, linkMap: R.linkMap, htmlAttrs: R.slugAttr ? { 'data-iu-slugs': R.slugAttr } : {} });
  }
  const p = info.row;
  const seo = listingSeo(p);
  const attrs = { 'data-iu-seo': '1' };
  if (R.slugAttr) attrs['data-iu-slugs'] = R.slugAttr;
  return transform(res, {
    title: seo.title, desc: seo.desc, canonical: SITE + '/ilan/' + p.slug, ogType: 'product',
    image: seo.image, htmlAttrs: attrs, linkMap: R.linkMap, status: res.status
  });
}

/** İlan için varsayılan SEO başlığı / açıklaması (panel de aynı kuralı gösterir). */
function listingSeo(p) {
  const baslik = clean(p.baslik_tr, 150) || 'İlan';
  const cat = [TIP[p.tip], KATEGORI[p.kategori]].filter(Boolean).join(' ');
  const ilce = clean(p.ilce, 40);
  const suffix = ' | TURYAP İsmail Ünsal';
  let title = clean(p.seo_baslik, 120);
  if (!title) {
    title = baslik + suffix;
    if (title.length > 65) title = baslik + ' | TURYAP';
    if (title.length > 65) title = cutWords(baslik, 62);
  }
  let desc = clean(p.seo_aciklama, 320);
  if (!desc) {
    const loc = [clean(p.mahalle, 40), ilce, 'Yalova'].filter(Boolean).join(', ');
    const fiyat = Number(p.fiyat) > 0 ? new Intl.NumberFormat('tr-TR').format(Number(p.fiyat)) + ' ' + (PARA[p.para_birimi] || '₺') : '';
    const bits = [loc, cat, fiyat].filter(Boolean).join(' — ');
    desc = cutWords((bits ? bits + '. ' : '') + clean(p.aciklama_tr, 600), 156);
  }
  const imgs = (Array.isArray(p.property_images) ? p.property_images : []).filter(i => i && SAFE_IMG_RE.test(i.url || '') && i.url.length <= 600);
  const main = imgs.find(i => i.ana_foto === true) || imgs.slice().sort((a, b) => (a.sira || 0) - (b.sira || 0))[0];
  return { title, desc, image: main ? main.url : '' };
}

async function listingById(context, url, lp) {
  const id = url.searchParams.get('id') || '';
  if (!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || /^\d{1,12}$/.test(id))) return context.next();
  try {
    const rows = await supa(context.env, 'properties?select=slug&durum=eq.aktif&limit=1&id=eq.' + encodeURIComponent(id));
    const slug = rows && rows[0] && rows[0].slug;
    if (typeof slug === 'string' && SLUG_RE.test(slug) && slug.length <= 220) return redirect(url.origin + lp + '/ilan/' + slug, 600);
  } catch (_) { /* normal akış */ }
  return context.next();
}

const LISTING_MEM = new Map();
async function getListing(context, url, slug) {
  const now = Date.now();
  const hit = LISTING_MEM.get(slug);
  if (hit && now - hit.at < (hit.v ? 60000 : 20000)) return hit.v;
  const cols = 'id,slug,baslik_tr,aciklama_tr,seo_baslik,seo_aciklama,tip,kategori,ilce,mahalle,fiyat,para_birimi,property_images(url,ana_foto,sira)';
  let v = null;
  try {
    const rows = await supa(context.env, 'properties?select=' + cols + '&durum=eq.aktif&limit=1&slug=eq.' + slug);
    if (rows && rows[0] && rows[0].slug === slug) v = { row: rows[0] };
    else {
      const old = await supa(context.env, 'properties?select=slug&durum=eq.aktif&limit=1&eski_sluglar=cs.%7B' + slug + '%7D');
      const ns = old && old[0] && old[0].slug;
      v = (typeof ns === 'string' && SLUG_RE.test(ns) && ns.length <= 220 && ns !== slug) ? { redirect: ns } : { missing: true };
    }
  } catch (_) {
    v = null;                       // veritabanına ulaşılamadı → sayfayı olduğu gibi göster (kısa süre tekrar deneme)
  }
  if (LISTING_MEM.size > 300) LISTING_MEM.clear();
  LISTING_MEM.set(slug, { at: now, v });
  return v;
}

// ---------------------------------------------------------------------------
//  Blog yazıları
// ---------------------------------------------------------------------------
async function blogPage(context, url, state, lp, rawSlug) {
  let s;
  try { s = decodeURIComponent(rawSlug).toLowerCase(); } catch (_) { return context.next(); }
  if (!SLUG_RE.test(s) || s.length > 200) return context.next();
  const want = lp + '/blog/' + s;
  if (url.pathname !== want) return redirect(url.origin + want + url.search, 600);

  const bundle = await getBundle(context, url);
  const R = routing(bundle);
  if (R.blogOld.has(s)) return redirect(url.origin + lp + '/blog/' + R.blogOld.get(s) + url.search, 600);

  const res = await context.next(cleanRequest(context.request, url.toString()));
  state.fetched = res;
  if (!bundle || !bundle.blog || !isHtmlOk(res)) return res;
  const post = R.blogBySlug.get(s);
  if (context.request.method === 'HEAD') return post ? res : withStatus(res, 404);
  if (!post) return transform(res, { noindex: true, status: 404, linkMap: R.linkMap, htmlAttrs: R.slugAttr ? { 'data-iu-slugs': R.slugAttr } : {} });
  const title = post.seo_baslik || ((post.baslik_tr || 'Blog Yazısı') + ' | TURYAP İsmail Ünsal');
  const desc = post.seo_aciklama || cutWords(post.ozet_tr || post.baslik_tr || '', 156);
  const attrs = { 'data-iu-seo': '1' };
  if (R.slugAttr) attrs['data-iu-slugs'] = R.slugAttr;
  return transform(res, {
    title, desc, canonical: SITE + '/blog/' + s, ogType: 'article',
    image: post.kapak_foto || '', htmlAttrs: attrs, linkMap: R.linkMap, status: res.status
  });
}

// ---------------------------------------------------------------------------
//  Site haritası
// ---------------------------------------------------------------------------
const SITEMAP_MEM = { xml: '', at: 0 };
async function sitemapResponse(context, url) {
  const now = Date.now();
  if (!SITEMAP_MEM.xml || now - SITEMAP_MEM.at > SITEMAP_TTL) {
    const bundle = await getBundle(context, url);
    const R = routing(bundle);
    const out = [];
    const add = (loc, lastmod) => out.push('  <url><loc>' + SITE + loc + '</loc>' + (lastmod ? '<lastmod>' + lastmod + '</lastmod>' : '') + '</url>');
    for (const P of SAYFALAR) {
      const S = R.settings.get(P.key) || {};
      if (S.noindex) continue;
      if (P.blogSlug && R.blogBySlug.has(P.blogSlug)) continue;   // blog'a taşındı
      add(pagePath(P.key, R));
    }
    for (const post of R.blogBySlug.values()) add('/blog/' + post.slug, day(post.updated_at || post.yayin_tarihi || post.created_at));
    let listings = null;
    try {
      listings = await supa(context.env, 'properties?select=slug,created_at,updated_at&durum=eq.aktif&slug=not.is.null&order=created_at.desc&limit=5000');
    } catch (_) {
      try { listings = await supa(context.env, 'properties?select=slug,created_at&durum=eq.aktif&slug=not.is.null&order=created_at.desc&limit=5000'); }
      catch (__) { listings = null; }
    }
    const seen = new Set();
    for (const l of listings || []) {
      if (typeof l.slug !== 'string' || !SLUG_RE.test(l.slug) || l.slug.length > 220 || seen.has(l.slug)) continue;
      seen.add(l.slug);
      add('/ilan/' + l.slug, day(l.updated_at || l.created_at));
    }
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + out.join('\n') + '\n</urlset>\n';
    // Veritabanına ulaşılamadıysa kısa süre tut (yeniden denensin)
    SITEMAP_MEM.xml = xml;
    SITEMAP_MEM.at = (bundle && listings) ? now : now - SITEMAP_TTL + 60000;
  }
  return new Response(context.request.method === 'HEAD' ? null : SITEMAP_MEM.xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600', 'x-content-type-options': 'nosniff' }
  });
}

function day(v) {
  const m = typeof v === 'string' && v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

// ---------------------------------------------------------------------------
//  Panel için sayfa listesi
// ---------------------------------------------------------------------------
function registryResponse() {
  const body = {
    v: 1,
    site: SITE,
    sayfalar: SAYFALAR.map(p => ({
      key: p.key, ad: p.ad, grup: p.grup, yol: p.key === 'index' ? '/' : '/' + p.key,
      kilitli: !!p.kilitli, odak: p.odak, kapakAlani: !!p.hero,
      varsayilanFoto: p.varsayilanFoto || '', blogSlug: p.blogSlug || '',
      metin: p.metin !== false, makale: !!p.makale
    })),
    rezerve: Array.from(REZERVE)
  };
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
  });
}

// ---------------------------------------------------------------------------
//  Ayarları veritabanından oku (önbellekli, hata olursa son iyi kopya)
// ---------------------------------------------------------------------------
const MEM = { bundle: null, at: 0, failAt: 0, inflight: null, forcedAt: 0, force: false };

async function getBundle(context, url) {
  const now = Date.now();
  if (MEM.bundle && now - MEM.at < TTL) return MEM.bundle;
  if (MEM.inflight) return MEM.inflight;
  MEM.inflight = (async () => {
    const cache = (typeof caches !== 'undefined' && caches && caches.default) ? caches.default : null;
    const key = new Request(url.origin + '/__iu-seo/bundle-v1');
    let cached = null;
    const force = MEM.force; MEM.force = false;
    if (cache && !force) {
      try {
        const r = await cache.match(key);
        if (r) { const j = await r.json(); if (j && j.v === 1 && typeof j.at === 'number') cached = j; }
      } catch (_) { cached = null; }
    }
    if (cached && now - cached.at < TTL) { MEM.bundle = cached; MEM.at = cached.at; return cached; }
    // Veritabanı kısa süre önce yanıt vermediyse tekrar tekrar deneme
    if (now - MEM.failAt < 10000) return MEM.bundle || cached || null;
    const fresh = await fetchBundle(context.env);
    if (fresh) {
      MEM.bundle = fresh; MEM.at = fresh.at;
      if (cache) {
        try {
          context.waitUntil(cache.put(key, new Response(JSON.stringify(fresh), {
            headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=604800' }
          })));
        } catch (_) { /* önbellek olmadan devam */ }
      }
      return fresh;
    }
    MEM.failAt = now;
    return MEM.bundle || cached || null;      // eski ama sağlam kopya varsa onu kullan
  })();
  try { return await MEM.inflight; } finally { MEM.inflight = null; }
}

async function fetchBundle(env) {
  const pagesQ = 'sayfa_seo?select=sayfa,slug,baslik,aciklama,foto_url,foto_kaldir,foto_kapak,foto_karartma,noindex,eski_sluglar&aktif=eq.true&limit=500';
  const blogQ = 'blog_posts?select=slug,eski_sluglar,baslik_tr,ozet_tr,seo_baslik,seo_aciklama,kapak_foto,yayin_tarihi,updated_at,created_at&durum=eq.yayinda&limit=2000';
  const blogQOld = 'blog_posts?select=slug,baslik_tr,ozet_tr,kapak_foto,yayin_tarihi,created_at&durum=eq.yayinda&limit=2000';
  const [pages, blog] = await Promise.all([
    supa(env, pagesQ).catch(() => null),
    supa(env, blogQ).catch(() => supa(env, blogQOld).catch(() => null))   // SEO sütunları henüz yoksa
  ]);
  if (!Array.isArray(pages) && !Array.isArray(blog)) return null;
  return { v: 1, at: Date.now(), pages: Array.isArray(pages) ? pages : null, blog: Array.isArray(blog) ? blog : null };
}

async function supa(env, path) {
  // Yalnızca yerel test için adres değiştirilebilir (localhost); canlıda her zaman resmi adres
  const alt = env && typeof env.IU_SUPABASE_URL === 'string' ? env.IU_SUPABASE_URL : '';
  const base = /^http:\/\/(127\.0\.0\.1|localhost)(:\d{2,5})?$/.test(alt) ? alt : SUPABASE_URL;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(base + '/rest/v1/' + path, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY, Accept: 'application/json' },
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error('supabase ' + r.status);
    const j = await r.json();
    if (!Array.isArray(j)) throw new Error('beklenmeyen yanıt');
    return j;
  } finally { clearTimeout(timer); }
}

// ---------------------------------------------------------------------------
//  Ayarlardan yönlendirme tablosu (doğrulanmış)
// ---------------------------------------------------------------------------
const ROUTING_CACHE = new WeakMap();
const EMPTY_ROUTING_KEY = {};

function routing(bundle) {
  const k = bundle || EMPTY_ROUTING_KEY;
  const hit = ROUTING_CACHE.get(k);
  if (hit) return hit;
  const settings = new Map();
  for (const raw of (bundle && Array.isArray(bundle.pages) ? bundle.pages : [])) {
    const s = sanitizeSetting(raw);
    if (s) settings.set(s.sayfa, s);
  }
  const slugToKey = new Map(), keyToSlug = new Map(), oldToKey = new Map();
  for (const P of SAYFALAR) if (P.key !== 'index') slugToKey.set(P.key, P.key);
  for (const P of SAYFALAR) {
    const s = settings.get(P.key);
    const custom = s && s.slug && s.slug !== P.key && !P.kilitli ? s.slug : '';
    if (custom && !slugToKey.has(custom)) { slugToKey.set(custom, P.key); keyToSlug.set(P.key, custom); }
  }
  // Özel adresi olan sayfanın varsayılan adresi artık o sayfaya "ait" değil (→ 301)
  for (const [key, slug] of keyToSlug) if (slugToKey.get(key) === key && slug !== key) slugToKey.delete(key);
  for (const P of SAYFALAR) {
    const s = settings.get(P.key);
    for (const old of (s && s.eski_sluglar) || []) if (!slugToKey.has(old) && !keyToSlug.has(old) && !oldToKey.has(old)) oldToKey.set(old, P.key);
  }
  // Blog
  const blogBySlug = new Map(), blogOld = new Map();
  for (const p of (bundle && Array.isArray(bundle.blog) ? bundle.blog : [])) {
    if (!p || typeof p.slug !== 'string' || !SLUG_RE.test(p.slug) || p.slug.length > 200) continue;
    blogBySlug.set(p.slug, {
      slug: p.slug,
      baslik_tr: clean(p.baslik_tr, 200), ozet_tr: clean(p.ozet_tr, 600),
      seo_baslik: clean(p.seo_baslik, 120), seo_aciklama: clean(p.seo_aciklama, 320),
      kapak_foto: typeof p.kapak_foto === 'string' && SAFE_IMG_RE.test(p.kapak_foto) && p.kapak_foto.length <= 600 ? p.kapak_foto : '',
      yayin_tarihi: p.yayin_tarihi, updated_at: p.updated_at, created_at: p.created_at,
      eski: Array.isArray(p.eski_sluglar) ? p.eski_sluglar.filter(x => typeof x === 'string' && SLUG_RE.test(x) && x.length <= 200) : []
    });
  }
  for (const post of blogBySlug.values()) for (const old of post.eski) if (!blogBySlug.has(old) && !blogOld.has(old)) blogOld.set(old, post.slug);

  const linkMap = new Map(keyToSlug);                  // varsayılan anahtar → özel adres
  const slugAttr = Array.from(keyToSlug).map(([a, b]) => a + '=' + b).join(',');
  const out = { settings, slugToKey, keyToSlug, oldToKey, blogBySlug, blogOld, linkMap, slugAttr };
  ROUTING_CACHE.set(k, out);
  return out;
}

function sanitizeSetting(r) {
  if (!r || typeof r.sayfa !== 'string' || !BY_KEY.has(r.sayfa)) return null;
  const slug = typeof r.slug === 'string' && SLUG_RE.test(r.slug) && r.slug.length <= 80 && !REZERVE.has(r.slug) ? r.slug : '';
  const foto = typeof r.foto_url === 'string' && SAFE_IMG_RE.test(r.foto_url) && r.foto_url.length <= 600 ? r.foto_url : '';
  return {
    sayfa: r.sayfa,
    slug,
    baslik: clean(r.baslik, 120),
    aciklama: clean(r.aciklama, 320),
    foto_url: foto,
    foto_kaldir: r.foto_kaldir === true,
    foto_kapak: r.foto_kapak !== false,
    foto_karartma: Number.isFinite(+r.foto_karartma) ? Math.round(+r.foto_karartma) : 80,
    noindex: r.noindex === true,
    eski_sluglar: Array.isArray(r.eski_sluglar)
      ? r.eski_sluglar.filter(x => typeof x === 'string' && SLUG_RE.test(x) && x.length <= 80 && !REZERVE.has(x)).slice(-50)
      : []
  };
}

// ---------------------------------------------------------------------------
//  HTML dönüştürücü (HTMLRewriter — akış halinde, hızlı)
// ---------------------------------------------------------------------------
function transform(res, o) {
  const seen = Object.create(null);
  const title = o.title || '';
  const desc = o.desc || '';
  const rw = new HTMLRewriter();

  rw.on('html', { element(e) { for (const [k, v] of Object.entries(o.htmlAttrs || {})) e.setAttribute(k, v); } });
  if (title) rw.on('title', { element(e) { seen.title = true; e.setInnerContent(title); } });
  rw.on('meta', {
    element(e) {
      const name = (e.getAttribute('name') || '').toLowerCase();
      const prop = (e.getAttribute('property') || '').toLowerCase();
      const k = name || prop;
      const attr = name ? 'name' : 'property';
      switch (k) {
        case 'description':
          seen.desc = true; if (desc) e.replace(metaTag('name', 'description', desc), H); break;
        case 'robots':
          seen.robots = true; if (o.noindex) e.replace(metaTag('name', 'robots', 'noindex, follow'), H); break;
        case 'og:title': case 'twitter:title':
          seen[k] = true; if (title) e.replace(metaTag(attr, k, title), H); break;
        case 'og:description': case 'twitter:description':
          seen[k] = true; if (desc) e.replace(metaTag(attr, k, desc), H); break;
        case 'og:url':
          seen[k] = true; if (o.canonical) e.replace(metaTag(attr, k, o.canonical), H); break;
        case 'og:type':
          seen[k] = true; if (o.ogType) e.replace(metaTag(attr, k, o.ogType), H); break;
        case 'og:image': case 'twitter:image':
          seen[k] = true;
          if (o.removeImage) e.remove(); else if (o.image) e.replace(metaTag(attr, k, o.image), H);
          break;
        case 'og:image:width': case 'og:image:height': case 'og:image:alt': case 'twitter:image:alt':
          if (o.removeImage || o.image) e.remove(); break;
        default: break;
      }
    }
  });
  rw.on('link[rel="canonical"]', { element(e) { seen.canonical = true; if (o.canonical) e.replace(linkTag(o.canonical), H); } });
  rw.on('head', {
    element(e) {
      e.onEndTag(end => {
        let add = '';
        if (title && !seen.title) add += '<title>' + escText(title) + '</title>';
        if (desc && !seen.desc) add += metaTag('name', 'description', desc);
        if (o.noindex && !seen.robots) add += metaTag('name', 'robots', 'noindex, follow');
        if (o.canonical && !seen.canonical) add += linkTag(o.canonical);
        if (o.canonical && !seen['og:url']) add += metaTag('property', 'og:url', o.canonical);
        if (o.ogType && !seen['og:type']) add += metaTag('property', 'og:type', o.ogType);
        if (title && !seen['og:title']) add += metaTag('property', 'og:title', title);
        if (desc && !seen['og:description']) add += metaTag('property', 'og:description', desc);
        if (o.image && !seen['og:image']) add += metaTag('property', 'og:image', o.image);
        if (o.image && !seen['twitter:image']) add += metaTag('name', 'twitter:image', o.image);
        if (o.headExtra) add += o.headExtra;
        if (add) end.before(add, H);
      });
    }
  });
  if (o.linkMap && o.linkMap.size) {
    rw.on('a[href]', {
      element(e) {
        const n = mapHref(e.getAttribute('href'), o.linkMap);
        if (n) e.setAttribute('href', n);
      }
    });
    let buf = '';
    rw.on('script[type="application/ld+json"]', {
      text(t) {
        buf += t.text;
        if (t.lastInTextNode) { t.replace(fixJsonLd(buf, o.linkMap), H); buf = ''; } else t.remove();
      }
    });
  }

  const headers = new Headers(res.headers);
  headers.delete('etag');
  headers.delete('last-modified');
  headers.delete('content-length');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  if (o.noindex) headers.set('x-robots-tag', 'noindex');
  const out = rw.transform(res);
  return new Response(out.body, { status: o.status || res.status, statusText: o.status === 404 ? 'Not Found' : res.statusText, headers });
}

/** Site içi bir bağlantı, adresi değişmiş bir sayfaya gidiyorsa yeni adrese çevirir. */
function mapHref(href, map) {
  if (typeof href !== 'string' || !href || href.length > 300) return null;
  let h = href.trim();
  let abs = '';
  if (h.toLowerCase().startsWith(SITE + '/')) { abs = SITE; h = h.slice(SITE.length); }
  else if (/^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith('//') || h.startsWith('#')) return null;
  const cut = h.search(/[?#]/);
  const p = cut === -1 ? h : h.slice(0, cut);
  const tail = cut === -1 ? '' : h.slice(cut);
  if (tail && !/^[A-Za-z0-9\-._~/=%?#:+,]*$/.test(tail)) return null;   // güvenli olmayan karakter → dokunma
  const m = p.match(/^(?:\.\/|\/)?(?:(en|fr|de|ru|ar)\/)?([A-Za-z0-9-]+)(?:\.html?)?\/?$/);
  if (!m) return null;
  const slug = map.get(m[2].toLowerCase());
  if (!slug) return null;
  return abs + (m[1] ? '/' + m[1].toLowerCase() : '') + '/' + slug + tail;
}

/** JSON-LD içindeki sayfa adreslerini yeni adrese çevirir (yalnızca güvenli karakterler eklenir). */
function fixJsonLd(text, map) {
  return text.replace(/https:\/\/ismailunsal\.com\.tr\/(?:(en|fr|de|ru|ar)\/)?([a-z0-9-]+)(?:\.html)?(?=["/#?\\])/g, (all, l, k) => {
    const slug = map.get(k);
    return slug ? SITE + (l ? '/' + l : '') + '/' + slug : all;
  });
}

// ---------------------------------------------------------------------------
//  Yardımcılar
// ---------------------------------------------------------------------------
function splitLang(pathname) {
  const m = pathname.match(LANG_RE);
  if (!m) return { lang: '', rest: pathname };
  return { lang: m[1].toLowerCase(), rest: pathname.slice(m[0].length) || '/' };
}

/** '/', '/x', '/x/', '/x.html', '/index.html' → sayfa parçası ('' = ana sayfa); başka biçim → null */
function pageSegment(rest) {
  let p;
  try { p = decodeURIComponent(rest); } catch (_) { return null; }
  if (p === '/' || p === '') return '';
  let s = p.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!s || s.includes('/')) return s ? null : '';
  s = s.replace(/\.html?$/i, '').toLowerCase();
  if (s === 'index') return '';
  return SLUG_RE.test(s) && s.length <= 80 ? s : null;
}

/** Koşullu başlıklar olmadan istek: dönüştürülecek sayfanın her zaman tam gövdesi gelsin. */
function cleanRequest(request, targetUrl) {
  const headers = new Headers(request.headers);
  headers.delete('if-none-match');
  headers.delete('if-modified-since');
  headers.delete('x-iu-seo-raw');
  return new Request(targetUrl, { method: request.method, headers, redirect: 'manual' });
}

function isHtmlOk(res) {
  return res && res.status === 200 && /text\/html/i.test(res.headers.get('content-type') || '');
}

function withStatus(res, status) {
  return new Response(res.body, { status, headers: res.headers });
}

function redirect(location, maxAge) {
  // Kısa tarayıcı önbelleği: adres tekrar değişirse döngü oluşmaz (Google için yine kalıcı 301)
  return new Response(null, { status: 301, headers: { Location: location, 'cache-control': 'public, max-age=' + (maxAge || 600) } });
}

function clean(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max).trim() : s;
}

function cutWords(s, max) {
  const t = clean(s, 2000);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–—-]+$/, '') + '…';
}

function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return escText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function metaTag(attr, key, content) {
  return '<meta ' + attr + '="' + escAttr(key) + '" content="' + escAttr(content) + '">';
}
function linkTag(href) {
  return '<link rel="canonical" href="' + escAttr(href) + '">';
}
