/**
 * Görsel Deposu — ortak modül (Site İçeriği, SEO Ayarları ve Görsel Deposu sayfası kullanır)
 *
 *  Medya.list()               depodaki tüm görseller (+ alt metin, ölçü, arşiv bilgisi)
 *  Medya.usage()              hangi görsel sitede nerede kullanılıyor
 *  Medya.upload(file, opts)   küçült → seçilen dosya adıyla depoya yükle → bilgilerini kaydet
 *  Medya.rename(item, ad)     dosya adını değiştir: yeni adla kopyala, sitedeki tüm kullanımları taşı (eski dosya arşivde kalır)
 *  Medya.replace(item, file)  fotoğrafı her yerde değiştir
 *  Medya.setAlt(item, alt)    alt metni kaydet (bu görseli kullanan Site İçeriği fotoğraflarına da uygulanır)
 *  Medya.remove(item)         sil (yalnızca admin, kullanılmayan görseller)
 *  Medya.picker(opts)         "Fotoğrafı değiştir" penceresi: bilgisayardan yükle veya depodan seç
 *
 * Güvenlik: yalnızca publishable anahtar (supabaseClient). Yetkiyi veritabanı kuralları (RLS) ve depo kuralları belirler.
 * Kullanıcı / veritabanı verisi DOM'a yalnızca textContent / value ile yazılır; görsel adresleri https olarak doğrulanır.
 */
(function () {
  'use strict';
  const BUCKETS = ['property-photos', 'blog-photos', 'team-photos'];
  const SAFE_URL = /^https:\/\/[^\s"'<>()\\`]+$/i;
  const PATH_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/;
  const UUID_DIR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;
  const PAGE_NAMES = {
    index: 'Ana Sayfa', hakkimizda: 'Hakkımızda', iletisim: 'İletişim', 'yalova-satilik-daire': 'Satılık Daire',
    'yalova-satilik-ev': 'Satılık Ev', 'yalova-satilik-arsa': 'Satılık Arsa', 'yalova-kiralik-daire': 'Kiralık Daire',
    'yalova-kiralik-ev': 'Kiralık Ev', 'yalova-kiralik-villa': 'Lüks / Kiralık Villa', 'yalova-esyali-kiralik-daire': 'Eşyalı Kiralık',
    'yalova-merkez-kiralik-daire': 'Merkez Kiralık', blog: 'Blog', faq: 'SSS', '724-destek': '7/24 Destek',
    'cok-dilli-hizmet': 'Çok Dilli Hizmet', 'yerel-uzmanlik': 'Yerel Uzmanlık', 'gizlilik-politikasi': 'Gizlilik Politikası', genel: 'Tüm sayfalar'
  };

  // ------------------------------------------------------------------ yardımcılar
  const clean = (s) => String(s == null ? '' : s).replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim();
  const safeUrl = (u) => { const s = String(u || '').trim(); return SAFE_URL.test(s) && s.length <= 600 ? s : ''; };
  function slug(s, max) {
    return String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ö/g, 'o').replace(/ç/g, 'c').normalize('NFD').replace(/\p{M}+/gu, '').replace(/['’`´]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max || 60).replace(/-+$/g, '');
  }
  const baseName = (path) => String(path || '').split('/').pop() || '';
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
  const isMissing = (e) => !!e && /iu_medya|medya|foto_alt|does not exist|schema cache|PGRST20[0-9]|42P01|42883|42703/i.test(((e.message || '') + ' ' + (e.code || '')));
  function friendly(e) {
    const m = (e && e.message) || String(e || '');
    if (/already exists|duplicate|409/i.test(m)) return 'Bu adla bir dosya zaten var. Başka bir ad deneyin.';
    if (/row-level security|permission|not allowed|yetkiniz|unauthorized|403/i.test(m)) return 'Bu işlem için yetkiniz yok.';
    if (/payload too large|413|maximum allowed size/i.test(m)) return 'Dosya çok büyük.';
    if (/failed to fetch|network/i.test(m)) return 'Bağlantı yok. İnternetinizi kontrol edip tekrar deneyin.';
    if (isMissing(e)) return 'Önce veritabanı güncellemesini yapın (supabase-medya-2026-10-01.sql).';
    return m || 'İşlem tamamlanamadı.';
  }
  const userErr = (msg) => Object.assign(new Error(msg), { user: true });

  // ------------------------------------------------------------------ liste
  function toItem(r) {
    const path = String(r.yol || r.name || '');
    const bucket = String(r.bucket || r.bucket_id || '');
    return {
      bucket, path, name: baseName(path), url: publicUrl(bucket, path), folder: folderOf(bucket, path),
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

  /** Hangi görsel nerede kullanılıyor → Map(url → [{ type, label, href }]) */
  async function usage() {
    const map = new Map();
    const add = (url, u) => { const k = safeUrl(url); if (!k) return; if (!map.has(k)) map.set(k, []); map.get(k).push(u); };
    const q = async (fn) => { try { const r = await fn(); return r && !r.error && Array.isArray(r.data) ? r.data : []; } catch (_) { return []; } };
    const [sc, seo, blog, imgs, team, mails] = await Promise.all([
      q(() => supabaseClient.from('site_content').select('sayfa,bolum_key,foto_url').not('foto_url', 'is', null).limit(3000)),
      q(() => supabaseClient.from('sayfa_seo').select('sayfa,foto_url').not('foto_url', 'is', null).limit(500)),
      q(() => supabaseClient.from('blog_posts').select('id,baslik_tr,kapak_foto,icerik_tr').limit(1000)),
      q(() => supabaseClient.from('property_images').select('url,property_id,properties(baslik_tr)').limit(5000)),
      q(() => supabaseClient.from('team_members').select('isim,fotograf_url').limit(200)),
      q(() => supabaseClient.from('email_templates').select('id,name,design').limit(300))
    ]);
    sc.forEach(r => {
      const page = PAGE_NAMES[r.sayfa] || r.sayfa;
      const label = r.bolum_key === 'logo_url' ? 'Site logosu' : r.bolum_key === 'favicon_url' ? 'Favicon' : 'Site İçeriği · ' + page;
      add(r.foto_url, { type: 'site', label, href: r.sayfa === 'genel' ? '/admin/site-content.html' : '/admin/site-content.html?sayfa=' + encodeURIComponent(r.sayfa) });
    });
    seo.forEach(r => add(r.foto_url, { type: 'seo', label: 'SEO sayfa fotoğrafı · ' + (PAGE_NAMES[r.sayfa] || r.sayfa), href: '/admin/seo.html?sayfa=' + encodeURIComponent(r.sayfa) }));
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
  /** Fotoğrafı tarayıcıda küçültür (en fazla 1920 px), JPEG'e çevirir; şeffaf PNG'ler PNG kalır. */
  async function compress(file) {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw userErr('Sadece JPG, PNG veya WEBP fotoğraf yükleyebilirsiniz.');
    if (file.size > 15 * 1024 * 1024) throw userErr('Dosya çok büyük (en fazla 15 MB).');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(userErr('Bu fotoğraf açılamadı.')); i.src = url; });
      const w = img.naturalWidth, h = img.naturalHeight;
      if (w < 200 || h < 120) throw userErr('Fotoğraf çok küçük (en az 1200 px genişlik önerilir).');
      const scale = Math.min(1, 1920 / w);
      const keepPng = file.type === 'image/png' && file.size <= 1.5 * 1024 * 1024 && scale === 1;
      if (keepPng) return { blob: file, w, h, ext: 'png', type: 'image/png' };
      if (scale === 1 && file.type === 'image/jpeg' && file.size <= 600 * 1024) return { blob: file, w, h, ext: 'jpg', type: 'image/jpeg' };
      const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.84));
      if (!blob) throw userErr('Fotoğraf işlenemedi.');
      return { blob, w: c.width, h: c.height, ext: 'jpg', type: 'image/jpeg' };
    } finally { URL.revokeObjectURL(url); }
  }
  const FOLDER_DEST = { site: ['property-photos', 'site/'], blog: ['blog-photos', 'blog/'], email: ['blog-photos', 'email/'], ekip: ['team-photos', 'team/'] };
  const taken = (e) => !!e && /already exists|duplicate|409/i.test(((e.message || '') + ' ' + (e.statusCode || e.status || '')));

  async function saveMeta(bucket, path, fields) {
    const row = Object.assign({ bucket, yol: path }, fields);
    const { error } = await supabaseClient.from('medya').upsert(row, { onConflict: 'bucket,yol' });
    if (error && !isMissing(error)) throw error;
  }
  /**
   * opts: { name: 'yalova-satilik-daire', folder: 'site'|'blog'|'email'|'ekip', alt: '...' }
   * → { url, bucket, path, name, w, h, alt }
   */
  async function upload(file, opts) {
    const o = opts || {};
    const c = await compress(file);
    const [bucket, prefix] = FOLDER_DEST[o.folder] || FOLDER_DEST.site;
    const base = slug(o.name || splitExt(file.name).base, 60) || 'fotograf';
    let path = '';
    for (let i = 1; i <= 40; i++) {
      path = prefix + base + (i > 1 ? '-' + i : '') + '.' + c.ext;
      const { error } = await supabaseClient.storage.from(bucket).upload(path, c.blob, { cacheControl: '31536000', upsert: false, contentType: c.type });
      if (!error) break;
      if (!taken(error) || i === 40) throw error;
    }
    const alt = clean(o.alt).slice(0, 250);
    await saveMeta(bucket, path, { alt_metin: alt || null, genislik: c.w, yukseklik: c.h }).catch(() => {});
    LIST_CACHE = null;
    return { url: publicUrl(bucket, path), bucket, path, name: baseName(path), w: c.w, h: c.h, alt };
  }

  /** Dosya adını değiştir: yeni adla kopyala → sitedeki tüm adresleri taşı (eski dosya arşivlenir, silinmez). */
  async function rename(item, newName) {
    const base = slug(newName, 60);
    if (!base) throw userErr('Dosya adı boş olamaz.');
    const ext = splitExt(item.name).ext || '.jpg';
    const dir = item.path.includes('/') ? item.path.slice(0, item.path.lastIndexOf('/') + 1) : '';
    if (dir + base + ext === item.path) return item;
    let path = '';
    for (let i = 1; i <= 40; i++) {
      path = dir + base + (i > 1 ? '-' + i : '') + ext;
      if (path === item.path) return item;
      const { error } = await supabaseClient.storage.from(item.bucket).copy(item.path, path);
      if (!error) break;
      if (!taken(error) || i === 40) throw error;
    }
    const url = publicUrl(item.bucket, path);
    const { data, error } = await supabaseClient.rpc('iu_medya_url_degistir', { p_eski: item.url, p_yeni: url, p_arsivle: true });
    if (error) throw error;
    LIST_CACHE = null;
    return Object.assign({}, item, { path, name: baseName(path), url, archived: false, newPath: '', moved: data || {} });
  }

  /** Fotoğrafı her yerde değiştir: yeni dosyayı yükle (aynı ad) → tüm adresleri yenisine taşı. */
  async function replace(item, file) {
    const up = await upload(file, { name: splitExt(item.name).base, folder: item.folder === 'ilan' ? 'site' : item.folder, alt: item.alt });
    const { data, error } = await supabaseClient.rpc('iu_medya_url_degistir', { p_eski: item.url, p_yeni: up.url, p_arsivle: true });
    if (error) throw error;
    LIST_CACHE = null;
    return Object.assign(up, { moved: data || {} });
  }

  /** Alt metni kaydet; bu görseli kullanan Site İçeriği fotoğraflarına da uygula. */
  async function setAlt(item, alt) {
    const a = clean(alt).slice(0, 250);
    await saveMeta(item.bucket, item.path, { alt_metin: a || null });
    const { error } = await supabaseClient.from('site_content').update({ foto_alt: a || null }).eq('foto_url', item.url);
    if (error && !isMissing(error)) throw error;
    LIST_CACHE = null;
    return a;
  }

  /** Sil (admin). Kullanımdaysa silinmez. */
  async function remove(item, uses) {
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
   * opts: { title, name (önerilen dosya adı), alt (mevcut alt metin), altDisabled (arka plan görseli), folder, current (mevcut adres) }
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
      const inp = el('input'); inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp'; inp.hidden = true;
      const dz = el('div', 'md-dz');
      const dzi = el('span', 'md-dz-ic'); dzi.appendChild(ic('upload'));
      dz.append(dzi, el('b', null, 'Fotoğrafı buraya sürükleyin veya tıklayıp seçin'), el('small', null, 'JPG, PNG veya WEBP · en fazla 15 MB · büyük fotoğraflar otomatik küçültülür'));
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
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { App.toast('Sadece JPG, PNG veya WEBP fotoğraf yükleyebilirsiniz.', 'warning'); return; }
        file = f;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(f);
        pv.hidden = false; dz.hidden = true; pv.textContent = '';
        const im = el('div', 'md-pv-img'); im.style.backgroundImage = cssUrl(previewUrl);
        const meta = el('div', 'md-pv-meta');
        meta.append(el('b', null, f.name.slice(0, 80)), el('small', null, fmtSize(f.size)));
        const again = el('span', 'md-pv-again'); App.iconText(again, 'refresh', 'Başka fotoğraf seç');
        meta.appendChild(again);
        pv.append(im, meta);
        if (!nInp.value) nInp.value = slug(splitExt(f.name).base, 60);
        ext.textContent = f.type === 'image/png' && f.size <= 1.5 * 1024 * 1024 ? '.png' : '.jpg';
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
        busy = true; refreshOk(); App.iconText(ok, 'clock', 'Yükleniyor…');
        try {
          const r = await upload(file, { name: nInp.value || o.name, folder: o.folder || 'site', alt });
          close({ url: r.url, alt, name: r.name, item: Object.assign(toItem({ bucket: r.bucket, yol: r.path, genislik: r.w, yukseklik: r.h, alt_metin: alt }), {}), fromLibrary: false });
        } catch (e) {
          busy = false; App.iconText(ok, o.uploadOnly ? 'upload' : 'check', okLabel); refreshOk();
          App.toast(e && e.user ? e.message : friendly(e), 'error', 'Fotoğraf yüklenemedi');
        }
      };
      setTab('upload');
    });
  }

  window.Medya = { list, usage, upload, rename, replace, setAlt, remove, picker, compress, parseUrl, publicUrl, slug, splitExt, baseName, fmtSize, fmtDate, friendly, safeUrl, folderOf, PAGE_NAMES };
})();
