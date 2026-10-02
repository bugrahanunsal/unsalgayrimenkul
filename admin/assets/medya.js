/**
 * Görsel Deposu — ortak modül (Görsel Deposu, Site İçeriği, SEO, ilanlar, blog, ekip, e-posta tasarımları kullanır)
 *
 *  Medya.compress(file, opts)       HER yükleme bu yoldan geçer: fotoğraf tarayıcıda en fazla 150 KB'a küçültülür
 *  Medya.uploadTo(bucket, dir, ad, file, opts)   küçült → seçilen dosya adıyla depoya yükle → bilgilerini kaydet
 *  Medya.upload(file, opts)         aynısı, klasöre göre (site / blog / email / ekip)
 *  Medya.list()                     depodaki tüm görseller (+ alt metin, ölçü, arşiv bilgisi)
 *  Medya.siteImages()               sitenin sayfalarındaki hazır fotoğraflar (HTML'deki, depoya hiç yüklenmemiş olanlar)
 *  Medya.usage()                    hangi görsel sitede nerede kullanılıyor
 *  Medya.rename(item, ad)           dosya adını değiştir: yeni adla kopyala, sitedeki tüm kullanımları taşı (eski dosya arşivde kalır)
 *  Medya.replace(item, file)        fotoğrafı her yerde değiştir
 *  Medya.shrink(item, uses)         150 KB'tan büyük eski bir fotoğrafı küçült (adres yenilenir, kullanımlar taşınır)
 *  Medya.importItem(item, ad, alt)  sitenin hazır / dış adresli fotoğrafını bu adla depoya al ve sitede onu kullan
 *  Medya.setAlt(item, alt)          alt metni kaydet (bu görseli kullanan Site İçeriği ve ilan fotoğraflarına da uygulanır)
 *  Medya.remove(item)               sil (yalnızca admin, kullanılmayan görseller)
 *  Medya.picker(opts)               "Fotoğrafı değiştir" penceresi: bilgisayardan yükle veya depodan seç
 *
 * Güvenlik: yalnızca publishable anahtar (supabaseClient). Yetkiyi veritabanı kuralları (RLS) ve depo kuralları belirler;
 * depo da 150 KB üstü dosyayı kabul etmez (supabase-gorsel-deposu-2026-10-02.sql).
 * Kullanıcı / veritabanı verisi DOM'a yalnızca textContent / value ile yazılır; görsel adresleri https olarak doğrulanır.
 */
(function () {
  'use strict';
  const BUCKETS = ['property-photos', 'blog-photos', 'team-photos'];
  const MAX_BYTES = 150 * 1024;                 // her fotoğraf en fazla 150 KB
  const MAX_INPUT = 40 * 1024 * 1024;           // tarayıcıda açılabilecek en büyük dosya (küçültülmeden önce)
  const SAFE_URL = /^https:\/\/[^\s"'<>()\\`]+$/i;
  const PATH_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/;
  const DIR_RE = /^([A-Za-z0-9][A-Za-z0-9_-]*\/){0,3}$/;
  const UUID_DIR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;
  const SQL_FILE = 'supabase-gorsel-deposu-2026-10-02.sql';
  const PAGE_NAMES = {
    index: 'Ana Sayfa', hakkimizda: 'Hakkımızda', iletisim: 'İletişim', 'yalova-satilik-daire': 'Satılık Daire',
    'yalova-satilik-ev': 'Satılık Ev', 'yalova-satilik-arsa': 'Satılık Arsa', 'yalova-kiralik-daire': 'Kiralık Daire',
    'yalova-kiralik-ev': 'Kiralık Ev', 'yalova-kiralik-villa': 'Lüks / Kiralık Villa', 'yalova-esyali-kiralik-daire': 'Eşyalı Kiralık',
    'yalova-merkez-kiralik-daire': 'Merkez Kiralık', blog: 'Blog', faq: 'SSS', '724-destek': '7/24 Destek',
    'cok-dilli-hizmet': 'Çok Dilli Hizmet', 'yerel-uzmanlik': 'Yerel Uzmanlık', 'gizlilik-politikasi': 'Gizlilik Politikası', genel: 'Tüm sayfalar'
  };
  const SITE_PAGES = Object.keys(PAGE_NAMES).filter(k => k !== 'genel');

  // ------------------------------------------------------------------ yardımcılar
  const clean = (s) => String(s == null ? '' : s).replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim();
  const safeUrl = (u) => { const s = String(u || '').trim(); return SAFE_URL.test(s) && s.length <= 600 ? s : ''; };
  /** Sitenin kendi dosyaları (aynı adres) veya https */
  const viewUrl = (u) => { const s = String(u || '').trim(); return safeUrl(s) || (s.startsWith(location.origin + '/') && !/["'<>\s\\`]/.test(s) ? s : ''); };
  function slug(s, max) {
    return String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ö/g, 'o').replace(/ç/g, 'c').normalize('NFD').replace(/\p{M}+/gu, '').replace(/['’`´]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max || 60).replace(/-+$/g, '');
  }
  const baseName = (path) => String(path || '').split('/').pop() || '';
  const dirOf = (path) => { const p = String(path || ''); return p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : ''; };
  function splitExt(name) { const m = String(name || '').match(/^(.*?)(\.[a-z0-9]{2,5})?$/i); return { base: m ? m[1] : name, ext: m && m[2] ? m[2].toLowerCase() : '' }; }
  function folderOf(bucket, path) {
    if (bucket === 'blog-photos') return /^email\//.test(path) ? 'email' : 'blog';
    if (bucket === 'team-photos') return 'ekip';
    if (UUID_DIR.test(path)) return 'ilan';
    return 'site';
  }
  function publicUrl(bucket, path) { return supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl; }
  /** Bu projenin depo adresi mi? → { bucket, path } */
  function parseUrl(url) {
    const u = safeUrl(url);
    const m = u.match(/^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/([a-z0-9-]+)\/([^?#]+)$/i);
    if (!m || !BUCKETS.includes(m[1])) return null;
    let path; try { path = decodeURIComponent(m[2]); } catch (_) { return null; }
    if (!PATH_RE.test(path) || path.includes('..')) return null;
    return { bucket: m[1], path };
  }
  function fmtSize(n) {
    if (!n && n !== 0) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (_) { return ''; } }
  const isMissing = (e) => !!e && /iu_medya|medya|foto_alt|alt_metin|does not exist|schema cache|PGRST20[0-9]|42P01|42883|42703/i.test(((e.message || '') + ' ' + (e.code || '')));
  function friendly(e) {
    const m = (e && e.message) || String(e || '');
    if (/already exists|duplicate|409/i.test(m)) return 'Bu adla bir dosya zaten var. Başka bir ad deneyin.';
    if (/row-level security|permission|not allowed|yetkiniz|unauthorized|403/i.test(m)) return 'Bu işlem için yetkiniz yok.';
    if (/payload too large|413|maximum allowed size|exceeded the maximum/i.test(m)) return 'Dosya 150 KB sınırının üstünde; depo kabul etmedi.';
    if (/mime type|invalid_mime/i.test(m)) return 'Bu dosya türü depoya yüklenemez (JPG, PNG, WEBP veya GIF).';
    if (/failed to fetch|network/i.test(m)) return 'Bağlantı yok. İnternetinizi kontrol edip tekrar deneyin.';
    if (isMissing(e)) return 'Önce veritabanı güncellemesini yapın (' + SQL_FILE + ').';
    return m || 'İşlem tamamlanamadı.';
  }
  const userErr = (msg) => Object.assign(new Error(msg), { user: true });
  const taken = (e) => !!e && /already exists|duplicate|409/i.test(((e.message || '') + ' ' + (e.statusCode || e.status || '')));

  // ------------------------------------------------------------------ 150 KB küçültme (tüm yüklemeler)
  async function decode(blob) {
    if (typeof createImageBitmap === 'function') {
      try {
        const b = await createImageBitmap(blob, { imageOrientation: 'from-image' });
        return { src: b, w: b.width, h: b.height, done: () => { try { b.close(); } catch (_) { /* yok */ } } };
      } catch (_) { /* <img> ile dene */ }
    }
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(userErr('Bu fotoğraf açılamadı. JPG veya PNG olarak kaydedip tekrar deneyin.')); i.src = url; });
      return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
    } catch (e) { URL.revokeObjectURL(url); throw e; }
  }
  function canvasOf(src, w, h, flatten) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (flatten) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    return c;
  }
  const toBlob = (c, type, q) => new Promise(r => c.toBlob(b => r(b), type, q));
  function hasAlpha(src, w, h) {
    const k = Math.min(1, 160 / Math.max(w, h));
    const c = canvasOf(src, Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), false);
    let d; try { d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; } catch (_) { return false; }
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
    return false;
  }
  /**
   * Fotoğrafı en fazla 150 KB'a küçültür. Önce en büyük ölçüde en iyi kaliteyi arar; sığmazsa ölçüyü %15 küçültür.
   * Konum (GPS) gibi fotoğraf bilgileri yeniden kaydedilirken silinir. Şeffaf PNG'ler (logo) PNG kalır.
   * opts: { maxSide = 1920 (uzun kenar), maxBytes = 150 KB }
   * → { blob, w, h, ext, type, before, after }
   */
  async function compress(file, opts) {
    const o = Object.assign({ maxSide: 1920, maxBytes: MAX_BYTES }, opts || {});
    if (!file || !/^image\//.test(file.type || '') || /svg/i.test(file.type)) throw userErr('Sadece fotoğraf yükleyebilirsiniz (JPG, PNG, WEBP veya GIF).');
    if (file.size > MAX_INPUT) throw userErr('Dosya çok büyük (en fazla 40 MB). Fotoğrafı telefonda "küçük boyut" ile paylaşıp tekrar deneyin.');
    const pic = await decode(file);
    try {
      const W = pic.w, H = pic.h;
      if (!W || !H) throw userErr('Bu fotoğraf açılamadı.');
      if (W < 16 || H < 16) throw userErr('Fotoğraf çok küçük.');
      const long = Math.max(W, H);
      // Zaten küçük PNG / GIF (logo, ikon, hareketli GIF): olduğu gibi kalır
      if (/^image\/(png|gif)$/.test(file.type) && file.size <= o.maxBytes && long <= o.maxSide) {
        return { blob: file, w: W, h: H, ext: file.type === 'image/png' ? 'png' : 'gif', type: file.type, before: file.size, after: file.size };
      }
      const sides = [];
      for (let s = Math.min(long, o.maxSide); s >= 200; s = Math.floor(s * 0.85)) sides.push(s);
      if (!sides.length) sides.push(Math.min(long, o.maxSide));
      const dims = (s) => { const k = s / long; return [Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k))]; };
      // çok büyük fotoğraf: önce ara ölçüye indir (daha keskin sonuç, daha az bellek)
      let src = pic.src, sw = W, sh = H, tmp = null;
      if (long > sides[0] * 2) { [sw, sh] = dims(sides[0] * 2); tmp = canvasOf(pic.src, sw, sh, false); src = tmp; }
      const at = (s) => { const k = s / Math.max(sw, sh); return [Math.max(1, Math.round(sw * k)), Math.max(1, Math.round(sh * k))]; };
      if (file.type !== 'image/jpeg' && hasAlpha(src, sw, sh)) {
        for (const s of sides) {
          const [w, h] = at(s); const b = await toBlob(canvasOf(src, w, h, false), 'image/png');
          if (b && b.size <= o.maxBytes) return { blob: b, w, h, ext: 'png', type: 'image/png', before: file.size, after: b.size };
        }
      }
      for (const s of sides) {
        const [w, h] = at(s); const c = canvasOf(src, w, h, true);
        let best = null;
        const first = await toBlob(c, 'image/jpeg', 0.86);
        if (first && first.size <= o.maxBytes) best = first;
        else {
          let lo = 0.6, hi = 0.86;
          for (let i = 0; i < 5; i++) {                       // sığan en yüksek kalite (ikili arama)
            const q = (lo + hi) / 2; const b = await toBlob(c, 'image/jpeg', q);
            if (b && b.size <= o.maxBytes) { best = b; lo = q; } else hi = q;
          }
          if (!best) { const b = await toBlob(c, 'image/jpeg', 0.6); if (b && b.size <= o.maxBytes) best = b; }
        }
        c.width = c.height = 0;
        if (best) { if (tmp) tmp.width = tmp.height = 0; return { blob: best, w, h, ext: 'jpg', type: 'image/jpeg', before: file.size, after: best.size }; }
      }
      throw userErr('Fotoğraf 150 KB altına küçültülemedi.');
    } finally { pic.done(); }
  }

  // ------------------------------------------------------------------ liste
  function toItem(r) {
    const path = String(r.yol || r.name || '');
    const bucket = String(r.bucket || r.bucket_id || '');
    return {
      origin: 'depo', bucket, path, name: baseName(path), url: publicUrl(bucket, path), folder: folderOf(bucket, path),
      size: r.boyut != null ? Number(r.boyut) : (r.metadata && r.metadata.size != null ? Number(r.metadata.size) : null),
      type: r.tur || (r.metadata && r.metadata.mimetype) || '', created: r.olusturma || r.created_at || null,
      alt: clean(r.alt_metin || ''), w: r.genislik || null, h: r.yukseklik || null,
      archived: r.arsiv === true, newPath: r.yeni_yol || ''
    };
  }
  /** Veritabanı fonksiyonu yoksa (SQL çalıştırılmamış) depo listeleme yedeği */
  async function listViaStorage() {
    const out = [];
    const walk = async (bucket, prefix, depth) => {
      const { data, error } = await supabaseClient.storage.from(bucket).list(prefix.replace(/\/$/, ''), { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
      if (error || !Array.isArray(data)) return;
      for (const o of data) {
        if (!o || !o.name || o.name === '.emptyFolderPlaceholder') continue;
        const p = prefix + o.name;
        if (!o.id) { if (depth < 2) await walk(bucket, p + '/', depth + 1); continue; }
        if (o.metadata && o.metadata.mimetype && !/^image\//.test(o.metadata.mimetype)) continue;
        out.push(toItem({ bucket, name: p, metadata: o.metadata, created_at: o.created_at }));
      }
    };
    await Promise.all(BUCKETS.map(b => walk(b, '', 0)));
    return out.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
  }
  let LIST_CACHE = null;
  /** → { items, setupNeeded } */
  async function list(force) {
    if (LIST_CACHE && !force) return LIST_CACHE;
    const { data, error } = await supabaseClient.rpc('iu_medya_liste');
    if (error) {
      const items = await listViaStorage().catch(() => []);
      LIST_CACHE = { items, setupNeeded: isMissing(error), error: isMissing(error) ? null : error };
      return LIST_CACHE;
    }
    let items = (data || []).map(toItem);
    if (!items.length) items = await listViaStorage().catch(() => []);
    LIST_CACHE = { items, setupNeeded: false, error: null };
    return LIST_CACHE;
  }

  /** Site İçeriği kayıtları (fotoğraf değişiklikleri / alt metinler) → Map('sayfa|anahtar' → satır) */
  async function slotRows() {
    let res = await supabaseClient.from('site_content').select('id,sayfa,bolum_key,foto_url,foto_alt,aktif').like('bolum_key', 'i%').limit(5000);
    if (res.error && isMissing(res.error)) res = await supabaseClient.from('site_content').select('id,sayfa,bolum_key,foto_url,aktif').like('bolum_key', 'i%').limit(5000);
    const m = new Map();
    (res.data || []).forEach(r => m.set(r.sayfa + '|' + r.bolum_key, r));
    return m;
  }

  /**
   * Sitenin sayfalarındaki hazır fotoğraflar (sayfanın HTML'inde yazılı olanlar). Site İçeriği ile aynı tarama (cms-content.js).
   * Panelde başka bir fotoğrafla değiştirilmiş yerler sayılmaz; aynı fotoğraf birkaç yerde ise tek kart olur.
   * → [{ origin:'site', url, name, alt, folder:'site', slots:[{page, scope, key, kind, htmlAlt}], uses:[...] }]
   */
  async function siteImages() {
    const Scan = window.IUCmsScan;
    if (!Scan || typeof DOMParser !== 'function') return [];
    const rows = await slotRows().catch(() => new Map());
    const parser = new DOMParser();
    const groups = new Map();
    const seenGlobal = new Set();
    await Promise.all(SITE_PAGES.map(async (pg) => {
      let html = '';
      try {
        const r = await fetch(pg === 'index' ? '/' : '/' + pg, { credentials: 'same-origin' });
        if (!r.ok || !/text\/html/i.test(r.headers.get('content-type') || 'text/html')) return;
        html = await r.text();
      } catch (_) { return; }
      let found;
      try { found = Scan.scan(parser.parseFromString(html, 'text/html')); } catch (_) { return; }
      found.imgs.forEach(im => {
        let abs = '';
        try { abs = new URL(im.src, location.origin + '/').href; } catch (_) { return; }
        if (!viewUrl(abs)) return;
        const sayfa = im.scope === 'genel' ? 'genel' : pg;
        if (im.scope === 'genel') { if (seenGlobal.has(im.key)) return; seenGlobal.add(im.key); }
        const row = rows.get(sayfa + '|' + im.key);
        if (row && row.aktif !== false && safeUrl(row.foto_url)) return;        // panelden değiştirilmiş: bu fotoğraf orada görünmüyor
        let gk = abs; try { const u = new URL(abs); gk = u.origin + u.pathname; } catch (_) { /* olduğu gibi */ }
        if (!groups.has(gk)) groups.set(gk, { url: abs, slots: [] });
        const altOver = row && typeof row.foto_alt === 'string' ? row.foto_alt : null;
        groups.get(gk).slots.push({ page: pg, scope: im.scope, key: im.key, kind: im.kind, htmlAlt: clean(im.alt), alt: clean(altOver != null ? altOver : im.alt) });
      });
    }));
    const out = [];
    groups.forEach((g, gk) => {
      let last = ''; try { last = decodeURIComponent(new URL(gk).pathname.split('/').pop() || ''); } catch (_) { last = ''; }
      const imgSlot = g.slots.find(s => s.kind === 'img');
      const pages = []; g.slots.forEach(s => { const p = s.scope === 'genel' ? 'genel' : s.page; if (!pages.includes(p)) pages.push(p); });
      out.push({
        origin: 'site', bucket: '', path: '', name: last || 'fotograf', url: g.url, folder: 'site', size: null, type: '', created: null,
        alt: imgSlot ? imgSlot.alt : '', bgOnly: !imgSlot, w: null, h: null, archived: false, newPath: '', slots: g.slots,
        uses: pages.map(p => ({ type: 'site', label: 'Site İçeriği · ' + (PAGE_NAMES[p] || p), href: '/admin/site-content.html' + (p === 'genel' ? '' : '?sayfa=' + encodeURIComponent(p)) }))
      });
    });
    return out;
  }

  /** Veritabanında kullanılan ama depoda olmayan (dış adresli) görsel → kart */
  function externalItem(url, uses) {
    let last = ''; try { last = decodeURIComponent(new URL(url).pathname.split('/').pop() || ''); } catch (_) { last = ''; }
    const t = (uses && uses[0] && uses[0].type) || 'site';
    const folder = t === 'eposta' ? 'email' : t === 'ekip' ? 'ekip' : t === 'blog' ? 'blog' : t === 'ilan' ? 'ilan' : 'site';
    return { origin: 'dis', bucket: '', path: '', name: last || 'gorsel', url, folder, size: null, type: '', created: null, alt: '', w: null, h: null, archived: false, newPath: '' };
  }

  /** Hangi görsel nerede kullanılıyor → Map(url → [{ type, label, href }]) */
  async function usage() {
    const map = new Map();
    const add = (url, u) => { const k = safeUrl(url); if (!k) return; if (!map.has(k)) map.set(k, []); map.get(k).push(u); };
    const q = async (fn) => { try { const r = await fn(); return r && !r.error && Array.isArray(r.data) ? r.data : []; } catch (_) { return []; } };
    const [sc, seo, blog, imgs, team, mails] = await Promise.all([
      q(() => supabaseClient.from('site_content').select('sayfa,bolum_key,foto_url,aktif').not('foto_url', 'is', null).limit(3000)),
      q(() => supabaseClient.from('sayfa_seo').select('sayfa,foto_url').not('foto_url', 'is', null).limit(500)),
      q(() => supabaseClient.from('blog_posts').select('id,baslik_tr,kapak_foto,icerik_tr').limit(1000)),
      q(() => supabaseClient.from('property_images').select('url,property_id,properties(baslik_tr)').limit(5000)),
      q(() => supabaseClient.from('team_members').select('isim,fotograf_url').limit(200)),
      q(() => supabaseClient.from('email_templates').select('id,name,design').limit(300))
    ]);
    sc.forEach(r => {
      if (r.aktif === false) return;
      const page = PAGE_NAMES[r.sayfa] || r.sayfa;
      const label = r.bolum_key === 'logo_url' ? 'Site logosu' : r.bolum_key === 'favicon_url' ? 'Favicon' : 'Site İçeriği · ' + page;
      add(r.foto_url, { type: 'site', label, href: r.sayfa === 'genel' ? '/admin/site-content.html' : '/admin/site-content.html?sayfa=' + encodeURIComponent(r.sayfa) });
    });
    seo.forEach(r => add(r.foto_url, { type: 'seo', label: 'SEO paylaşım fotoğrafı · ' + (PAGE_NAMES[r.sayfa] || r.sayfa), href: '/admin/seo.html?sayfa=' + encodeURIComponent(r.sayfa) }));
    const urlRe = /https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/[a-z0-9-]+\/[A-Za-z0-9/_.-]+/gi;
    blog.forEach(r => {
      const t = clean(r.baslik_tr) || 'Blog yazısı';
      if (r.kapak_foto) add(r.kapak_foto, { type: 'blog', label: 'Blog kapak · ' + t, href: '/admin/blog.html' });
      const inline = new Set((String(r.icerik_tr || '').match(urlRe) || []));
      inline.forEach(u => add(u, { type: 'blog', label: 'Blog yazısı içinde · ' + t, href: '/admin/blog.html' }));
    });
    imgs.forEach(r => add(r.url, { type: 'ilan', label: 'İlan · ' + (clean(r.properties && r.properties.baslik_tr) || 'İlan'), href: '/admin/property-edit.html?id=' + encodeURIComponent(r.property_id || '') }));
    team.forEach(r => add(r.fotograf_url, { type: 'ekip', label: 'Ekip · ' + (clean(r.isim) || 'Üye'), href: '/admin/team.html' }));
    mails.forEach(r => {
      const found = new Set((JSON.stringify(r.design || {}).match(urlRe) || []));
      found.forEach(u => add(u, { type: 'eposta', label: 'E-posta tasarımı · ' + (clean(r.name) || 'Tasarım'), href: '/admin/email-tasarim.html?id=' + encodeURIComponent(r.id) }));
    });
    return map;
  }

  // ------------------------------------------------------------------ yükleme
  const FOLDER_DEST = { site: ['property-photos', 'site/'], blog: ['blog-photos', 'blog/'], email: ['blog-photos', 'email/'], ekip: ['team-photos', 'team/'] };

  async function saveMeta(bucket, path, fields) {
    const row = Object.assign({ bucket, yol: path }, fields);
    const { error } = await supabaseClient.from('medya').upsert(row, { onConflict: 'bucket,yol' });
    if (error && !isMissing(error)) throw error;
  }
  /**
   * Küçültüp (≤150 KB) yükler. bucket: property-photos | blog-photos | team-photos; dir: 'site/', '<ilan-id>/' …; base: dosya adı
   * opts: { alt, maxSide }  → { url, bucket, path, name, w, h, alt, before, after }
   */
  async function uploadTo(bucket, dir, base, file, opts) {
    const o = opts || {};
    if (!BUCKETS.includes(bucket) || !DIR_RE.test(dir || '')) throw userErr('Geçersiz klasör.');
    const c = await compress(file, { maxSide: o.maxSide || 1920 });
    const b0 = slug(base, 60) || 'fotograf';
    let path = '';
    for (let i = 1; i <= 60; i++) {
      path = (dir || '') + b0 + (i > 1 ? '-' + i : '') + '.' + c.ext;
      const { error } = await supabaseClient.storage.from(bucket).upload(path, c.blob, { cacheControl: '31536000', upsert: false, contentType: c.type });
      if (!error) break;
      if (!taken(error) || i === 60) throw error;
    }
    const alt = clean(o.alt).slice(0, 250);
    await saveMeta(bucket, path, { alt_metin: alt || null, genislik: c.w, yukseklik: c.h }).catch(() => {});
    LIST_CACHE = null;
    return { url: publicUrl(bucket, path), bucket, path, name: baseName(path), w: c.w, h: c.h, alt, before: c.before, after: c.after };
  }
  /** opts: { name: 'yalova-satilik-daire', folder: 'site'|'blog'|'email'|'ekip', alt: '...', maxSide } */
  async function upload(file, opts) {
    const o = opts || {};
    const [bucket, dir] = FOLDER_DEST[o.folder] || FOLDER_DEST.site;
    return uploadTo(bucket, dir, o.name || splitExt(file && file.name).base, file, o);
  }

  /** Dış adresten / depodan fotoğrafı indirir (Unsplash ise en büyük kullanışlı boyut) */
  async function fetchImage(url) {
    let src = viewUrl(url);
    if (!src) throw userErr('Fotoğraf adresi geçersiz.');
    if (/^https:\/\/images\.unsplash\.com\//i.test(src)) {
      try { const u = new URL(src); u.searchParams.set('w', '1920'); u.searchParams.set('q', '85'); u.searchParams.delete('h'); src = u.href; } catch (_) { /* olduğu gibi */ }
    }
    let r;
    try { r = await fetch(src, { mode: 'cors', credentials: 'omit', cache: 'no-store' }); } catch (_) { throw userErr('Fotoğraf indirilemedi (bağlantı veya izin sorunu).'); }
    if (!r.ok) throw userErr('Fotoğraf indirilemedi.');
    const b = await r.blob();
    if (!/^image\//.test(b.type) || /svg/i.test(b.type)) throw userErr('Bu dosya fotoğraf değil.');
    return b;
  }
  const asFile = (blob, base) => new File([blob], base + (blob.type === 'image/png' ? '.png' : '.jpg'), { type: blob.type });
  async function moveRefs(oldUrl, newUrl, archive) {
    const { data, error } = await supabaseClient.rpc('iu_medya_url_degistir', { p_eski: oldUrl, p_yeni: newUrl, p_arsivle: !!archive });
    if (error) throw error;
    return data || {};
  }
  /** Anlamsız dosya adı (ör. 1790525877320-0) yerine kullanıldığı yerden ad üret */
  function betterBase(item, uses) {
    const b = splitExt(item.name).base;
    if (!/^[\d_-]+$/.test(b) && !/^(photo-)?[\da-f-]{12,}$/i.test(b)) return slug(b, 60) || 'fotograf';
    const u = (uses || [])[0];
    const label = u ? u.label.replace(/^[^·]+·\s*/, '') : '';
    return slug(label, 50) || (item.folder === 'ilan' ? 'ilan-fotografi' : 'fotograf');
  }

  /** Dosya adını değiştir: yeni adla kopyala → sitedeki tüm adresleri taşı (eski dosya arşivlenir, silinmez). 150 KB üstüyse küçültülerek. */
  async function rename(item, newName) {
    const base = slug(newName, 60);
    if (!base) throw userErr('Dosya adı boş olamaz.');
    const ext = splitExt(item.name).ext || '.jpg';
    const dir = dirOf(item.path);
    if (dir + base + ext === item.path) return item;
    let path = '', url = '', blob = null, size = item.size;
    if (size == null) { blob = await fetchImage(item.url); size = blob.size; }      // boyutu bilinmiyor: indirip bak
    if (size > MAX_BYTES) {
      // 150 KB üstü: yeni adla küçültülmüş kopyası yüklenir
      const up = await uploadTo(item.bucket, dir, base, asFile(blob || await fetchImage(item.url), base), { alt: item.alt, maxSide: item.folder === 'ekip' ? 1000 : 1920 });
      path = up.path; url = up.url;
    } else {
      // küçük dosya: depoda olduğu gibi kopyalanır (kalite kaybı yok)
      for (let i = 1; i <= 40; i++) {
        path = dir + base + (i > 1 ? '-' + i : '') + ext;
        if (path === item.path) return item;
        const { error } = await supabaseClient.storage.from(item.bucket).copy(item.path, path);
        if (!error) break;
        if (!taken(error) || i === 40) throw error;
      }
      url = publicUrl(item.bucket, path);
    }
    const moved = await moveRefs(item.url, url, true);
    LIST_CACHE = null;
    return Object.assign({}, item, { path, name: baseName(path), url, archived: false, newPath: '', moved });
  }

  /** 150 KB'tan büyük fotoğrafı küçült: küçük kopyası yüklenir, sitedeki tüm kullanımlar ona taşınır, büyük dosya arşive alınır. */
  async function shrink(item, uses) {
    const base = betterBase(item, uses);
    const up = await uploadTo(item.bucket, dirOf(item.path), base, asFile(await fetchImage(item.url), base), { alt: item.alt, maxSide: item.folder === 'ekip' ? 1000 : 1920 });
    const moved = await moveRefs(item.url, up.url, true);
    LIST_CACHE = null;
    return Object.assign(up, { moved });
  }

  /** Site İçeriği'ndeki bir fotoğraf yuvasına yaz (sayfa + anahtar) */
  async function upsertSlot(slot, fields) {
    const sayfa = slot.scope === 'genel' ? 'genel' : slot.page;
    const { data, error } = await supabaseClient.from('site_content').select('id').eq('sayfa', sayfa).eq('bolum_key', slot.key).limit(1);
    if (error) throw error;
    const run = (f) => data && data[0]
      ? supabaseClient.from('site_content').update(f).eq('id', data[0].id)
      : supabaseClient.from('site_content').insert(Object.assign({ sira: 0, sayfa, bolum_key: slot.key, aktif: true }, f));
    let res = await run(fields);
    if (res.error && 'foto_alt' in fields && isMissing(res.error)) {
      const f2 = Object.assign({}, fields); delete f2.foto_alt;
      if (!Object.keys(f2).length) throw userErr('Alt metni kaydetmek için önce veritabanı güncellemesini yapın (' + SQL_FILE + ').');
      res = await run(f2);
    }
    if (res.error) throw res.error;
  }

  /** Sitenin hazır / dış adresli fotoğrafını bu adla depoya al (≤150 KB) ve sitede onun yerine kullan */
  async function importItem(item, name, alt) {
    const base = slug(name, 60) || betterBase(item, item.uses);
    const [bucket, dir] = FOLDER_DEST[item.folder === 'ilan' ? 'site' : item.folder] || FOLDER_DEST.site;
    const a = clean(alt).slice(0, 250);
    const up = await uploadTo(bucket, dir, base, asFile(await fetchImage(item.url), base), { alt: a, maxSide: item.folder === 'ekip' ? 1000 : 1920 });
    if (item.origin === 'site') {
      for (const s of item.slots || []) await upsertSlot(s, s.kind === 'img' ? { foto_url: up.url, foto_alt: a || null } : { foto_url: up.url });
    } else {
      await moveRefs(item.url, up.url, false);
    }
    LIST_CACHE = null;
    return up;
  }

  /** Fotoğrafı her yerde değiştir: yeni dosyayı yükle → tüm kullanımları yenisine taşı. */
  async function replace(item, file) {
    if (item.origin === 'site' || item.origin === 'dis') {
      const base = betterBase(item, item.uses);
      const [bucket, dir] = FOLDER_DEST[item.folder === 'ilan' ? 'site' : item.folder] || FOLDER_DEST.site;
      const up = await uploadTo(bucket, dir, base, file, { alt: item.alt });
      if (item.origin === 'site') { for (const s of item.slots || []) await upsertSlot(s, { foto_url: up.url }); }
      else await moveRefs(item.url, up.url, false);
      LIST_CACHE = null;
      return up;
    }
    const up = await uploadTo(item.bucket, dirOf(item.path), betterBase(item, item.uses), file, { alt: item.alt, maxSide: item.folder === 'ekip' ? 1000 : 1920 });
    const moved = await moveRefs(item.url, up.url, true);
    LIST_CACHE = null;
    return Object.assign(up, { moved });
  }

  /** Alt metni kaydet: görsel bilgisi + sitede bu fotoğrafı kullanan her yer (Site İçeriği, ilan fotoğrafları) */
  async function setAlt(item, alt) {
    const a = clean(alt).slice(0, 250);
    if (item.origin === 'site') {
      for (const s of (item.slots || []).filter(x => x.kind === 'img')) await upsertSlot(s, { foto_alt: a === s.htmlAlt ? null : (a || '') });
      LIST_CACHE = null;
      return a;
    }
    const { error } = await supabaseClient.rpc('iu_medya_alt_kaydet', { p_url: item.url, p_alt: a || null });
    if (error) {
      if (!isMissing(error)) throw error;
      // eski kurulum: depo bilgisi + Site İçeriği
      if (item.bucket) await saveMeta(item.bucket, item.path, { alt_metin: a || null });
      const r = await supabaseClient.from('site_content').update({ foto_alt: a || null }).eq('foto_url', item.url);
      if (r.error && isMissing(r.error)) throw userErr('Alt metni kaydetmek için önce veritabanı güncellemesini yapın (' + SQL_FILE + ').');
      if (r.error) throw r.error;
    }
    LIST_CACHE = null;
    return a;
  }

  /** Sil (admin). Kullanımdaysa silinmez. */
  async function remove(item, uses) {
    if (item.origin !== 'depo') throw userErr('Bu fotoğraf depoda değil; silinecek dosya yok.');
    if (uses && uses.length) throw userErr('Bu fotoğraf sitede kullanılıyor; önce kullanıldığı yerlerden kaldırın.');
    const { error } = await supabaseClient.storage.from(item.bucket).remove([item.path]);
    if (error) throw error;
    await supabaseClient.from('medya').delete().eq('bucket', item.bucket).eq('yol', item.path);
    LIST_CACHE = null;
  }

  // ------------------------------------------------------------------ "Fotoğrafı değiştir" penceresi
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function ic(name) { return window.App && App.icon ? App.icon(name) : el('span'); }
  const cssUrl = (u) => 'url("' + String(u).replace(/["\\\n\r]/g, '') + '")';

  /**
   * opts: { title, name (önerilen dosya adı), alt (mevcut alt metin), altDisabled (arka plan görseli), folder, current (mevcut adres), maxSide }
   * → Promise<{ url, alt, name, item } | null>
   */
  function picker(opts) {
    const o = opts || {};
    return new Promise((resolve) => {
      let tab = 'upload', file = null, previewUrl = '', chosen = null, items = [], busy = false;
      const bd = el('div', 'md-backdrop'); bd.setAttribute('role', 'dialog'); bd.setAttribute('aria-modal', 'true'); bd.setAttribute('aria-label', o.title || 'Fotoğrafı değiştir');
      const box = el('div', 'md-box');
      const head = el('div', 'md-head');
      head.append(el('h2', 'md-title', o.title || 'Fotoğrafı değiştir'));
      const x = el('button', 'md-x'); x.type = 'button'; x.setAttribute('aria-label', 'Kapat'); x.appendChild(ic('x')); head.appendChild(x);
      const tabs = el('div', 'md-tabs'); tabs.setAttribute('role', 'tablist');
      const t1 = el('button', 'on'); t1.type = 'button'; t1.setAttribute('role', 'tab'); App.iconText(t1, 'upload', 'Bilgisayardan yükle');
      const t2 = el('button'); t2.type = 'button'; t2.setAttribute('role', 'tab'); App.iconText(t2, 'images', 'Görsel deposundan seç');
      tabs.append(t1, t2);

      // yükleme
      const up = el('div', 'md-pane');
      const drop = el('label', 'md-drop'); drop.tabIndex = 0;
      const inp = el('input'); inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp,image/gif'; inp.hidden = true;
      const dz = el('div', 'md-dz');
      const dzi = el('span', 'md-dz-ic'); dzi.appendChild(ic('upload'));
      dz.append(dzi, el('b', null, 'Fotoğrafı buraya sürükleyin veya tıklayıp seçin'), el('small', null, 'JPG, PNG veya WEBP · yüklenirken otomatik olarak en fazla 150 KB’a küçültülür'));
      const pv = el('div', 'md-pv'); pv.hidden = true;
      drop.append(inp, dz, pv);
      const fName = el('div', 'md-field');
      const lN = el('label', 'md-label', 'Dosya adı'); lN.htmlFor = 'mdName';
      const nRow = el('div', 'md-namerow');
      const nInp = el('input', 'form-input'); nInp.id = 'mdName'; nInp.maxLength = 60; nInp.autocomplete = 'off'; nInp.spellcheck = false;
      nInp.value = slug(o.name || '', 60);
      const ext = el('span', 'md-ext', '.jpg');
      nRow.append(nInp, ext);
      fName.append(lN, nRow, el('div', 'md-help', 'Kısa, tire ile ayrılmış, Türkçe karaktersiz yazın (ör. yalova-satilik-daire). Google Görseller için önemlidir.'));
      up.append(drop, fName);

      // depo
      const lib = el('div', 'md-pane'); lib.hidden = true;
      const sRow = el('div', 'md-search');
      const sIc = el('span', 'md-search-ic'); sIc.appendChild(ic('search'));
      const sInp = el('input', 'form-input'); sInp.type = 'search'; sInp.placeholder = 'Dosya adı veya alt metin ara…'; sInp.setAttribute('aria-label', 'Görsel ara');
      sRow.append(sIc, sInp);
      const grid = el('div', 'md-grid'); grid.textContent = 'Yükleniyor…';
      lib.append(sRow, grid);

      // alt metin (iki sekmede ortak)
      const fAlt = el('div', 'md-field');
      const lA = el('label', 'md-label', 'Alt metin'); lA.htmlFor = 'mdAlt';
      const aInp = el('input', 'form-input'); aInp.id = 'mdAlt'; aInp.maxLength = 250; aInp.autocomplete = 'off';
      aInp.value = clean(o.alt || ''); aInp.placeholder = 'Fotoğrafta ne görünüyor? (ör. Yalova merkezde deniz manzaralı satılık daire)';
      const aHelp = el('div', 'md-help', o.altDisabled ? 'Bu fotoğraf arka plan görseli: Google arka plan görsellerini okumaz, alt metin gerekmez.' : 'Görme engelliler ve Google için kısa açıklama (125 karaktere kadar ideal).');
      aInp.disabled = !!o.altDisabled;
      fAlt.append(lA, aInp, aHelp);
      if (o.noAlt) fAlt.hidden = true;

      const foot = el('div', 'md-foot');
      const cancel = el('button', 'btn btn-outline'); cancel.type = 'button'; cancel.textContent = 'Vazgeç';
      const okLabel = o.uploadOnly ? 'Yükle' : 'Bu fotoğrafı kullan';
      const ok = el('button', 'btn btn-primary md-ok'); ok.type = 'button'; App.iconText(ok, o.uploadOnly ? 'upload' : 'check', okLabel); ok.disabled = true;
      if (o.uploadOnly) tabs.hidden = true;
      foot.append(cancel, ok);
      box.append(head, tabs, up, lib, fAlt, foot);
      bd.appendChild(box); document.body.appendChild(bd);
      document.body.style.overflow = 'hidden';
      setTimeout(() => drop.focus(), 30);

      const close = (val) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        document.removeEventListener('keydown', onKey); bd.remove(); document.body.style.overflow = '';
        resolve(val);
      };
      const onKey = (e) => { if (e.key === 'Escape' && !busy) close(null); };
      document.addEventListener('keydown', onKey);
      x.onclick = () => { if (!busy) close(null); }; cancel.onclick = () => { if (!busy) close(null); };
      bd.addEventListener('mousedown', (e) => { if (e.target === bd && !busy) close(null); });
      const refreshOk = () => { ok.disabled = busy || (tab === 'upload' ? !file : !chosen); };
      const setTab = (t) => {
        tab = t; t1.classList.toggle('on', t === 'upload'); t2.classList.toggle('on', t === 'lib');
        t1.setAttribute('aria-selected', t === 'upload' ? 'true' : 'false'); t2.setAttribute('aria-selected', t === 'lib' ? 'true' : 'false');
        up.hidden = t !== 'upload'; lib.hidden = t !== 'lib';
        if (t === 'lib') { loadLib(); if (chosen && !aInp.disabled && !aInp.dataset.touched) aInp.value = chosen.alt || aInp.value; }
        refreshOk();
      };
      t1.onclick = () => setTab('upload'); t2.onclick = () => setTab('lib');
      aInp.addEventListener('input', () => { aInp.dataset.touched = '1'; });
      nInp.addEventListener('blur', () => { nInp.value = slug(nInp.value, 60); });

      const pick = (f) => {
        if (!f) return;
        if (!/^image\//.test(f.type || '') || /svg/i.test(f.type)) { App.toast('Sadece fotoğraf yükleyebilirsiniz (JPG, PNG, WEBP veya GIF).', 'warning'); return; }
        if (f.size > MAX_INPUT) { App.toast('Dosya çok büyük (en fazla 40 MB).', 'warning'); return; }
        file = f;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(f);
        pv.hidden = false; dz.hidden = true; pv.textContent = '';
        const im = el('div', 'md-pv-img'); im.style.backgroundImage = cssUrl(previewUrl);
        const meta = el('div', 'md-pv-meta');
        meta.append(el('b', null, f.name.slice(0, 80)), el('small', null, fmtSize(f.size) + (f.size > MAX_BYTES ? ' → yüklenirken en fazla 150 KB' : '')));
        const again = el('span', 'md-pv-again'); App.iconText(again, 'refresh', 'Başka fotoğraf seç');
        meta.appendChild(again);
        pv.append(im, meta);
        if (!nInp.value) nInp.value = slug(splitExt(f.name).base, 60);
        ext.textContent = f.type === 'image/png' ? '.png / .jpg' : f.type === 'image/gif' && f.size <= MAX_BYTES ? '.gif' : '.jpg';
        refreshOk();
      };
      inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.value = ''; pick(f); });
      drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
      ['dragenter', 'dragover'].forEach(n => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach(n => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
      drop.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; pick(f); });

      let libLoaded = false;
      async function loadLib() {
        if (libLoaded) return; libLoaded = true;
        try { const r = await list(); items = r.items.filter(i => !i.archived && safeUrl(i.url)); }
        catch (_) { items = []; }
        drawLib();
      }
      function drawLib() {
        const qq = sInp.value.trim().toLocaleLowerCase('tr-TR');
        grid.textContent = '';
        const arr = items.filter(i => !qq || i.name.toLocaleLowerCase('tr-TR').includes(qq) || (i.alt || '').toLocaleLowerCase('tr-TR').includes(qq)).slice(0, 300);
        if (!arr.length) { grid.appendChild(el('div', 'md-empty', items.length ? 'Sonuç yok.' : 'Depoda henüz fotoğraf yok. "Bilgisayardan yükle" ile ekleyin.')); return; }
        arr.forEach(it => {
          const b = el('button', 'md-card' + (chosen === it ? ' sel' : '')); b.type = 'button'; b.title = it.name;
          const th = el('span', 'md-th'); th.style.backgroundImage = cssUrl(it.url);
          if (o.current && o.current === it.url) th.appendChild(el('span', 'md-cur', 'Şu an kullanılan'));
          const chk = el('span', 'md-chk'); chk.appendChild(ic('check')); th.appendChild(chk);
          b.append(th, el('span', 'md-nm', it.name));
          b.onclick = () => { chosen = it; if (!aInp.disabled && !aInp.dataset.touched) aInp.value = it.alt || ''; drawLib(); refreshOk(); };
          grid.appendChild(b);
        });
      }
      sInp.addEventListener('input', drawLib);

      ok.onclick = async () => {
        if (busy) return;
        const alt = aInp.disabled ? '' : clean(aInp.value).slice(0, 250);
        if (tab === 'lib') {
          if (!chosen) return;
          close({ url: chosen.url, alt, name: chosen.name, item: chosen, fromLibrary: true });
          return;
        }
        if (!file) return;
        busy = true; refreshOk(); App.iconText(ok, 'clock', 'Küçültülüp yükleniyor…');
        try {
          const r = await upload(file, { name: nInp.value || o.name, folder: o.folder || 'site', alt, maxSide: o.maxSide });
          close({ url: r.url, alt, name: r.name, before: r.before, after: r.after, item: toItem({ bucket: r.bucket, yol: r.path, genislik: r.w, yukseklik: r.h, alt_metin: alt, boyut: r.after }), fromLibrary: false });
        } catch (e) {
          busy = false; App.iconText(ok, o.uploadOnly ? 'upload' : 'check', okLabel); refreshOk();
          App.toast(e && e.user ? e.message : friendly(e), 'error', 'Fotoğraf yüklenemedi');
        }
      };
      setTab('upload');
    });
  }

  window.Medya = {
    MAX_BYTES, SQL_FILE, list, siteImages, externalItem, usage, compress, upload, uploadTo, rename, replace, shrink, importItem, setAlt, remove, picker,
    parseUrl, publicUrl, slug, splitExt, baseName, fmtSize, fmtDate, friendly, safeUrl, viewUrl, folderOf, betterBase, PAGE_NAMES
  };
})();
