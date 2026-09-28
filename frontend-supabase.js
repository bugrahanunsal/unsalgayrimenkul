/**
 * ============================================================
 * FRONTEND SUPABASE INTEGRATION - v3.0 FINAL
 * ismailunsal.com.tr
 * ============================================================
 * Gerçek Supabase kolonları kullanır:
 * - properties: baslik_tr, kategori, tip, ilce, mahalle, fiyat, para_birimi,
 *   m2, oda_sayisi, banyo_sayisi, bina_yasi, aciklama_tr, ozellikler(JSONB),
 *   ada_parsel, imar_durumu, emsal, one_cikan, durum
 * - property_images: property_id, url, sira, ana_foto (is_main DEĞİL!)
 */

(function() {
  'use strict';

  const CONFIG = {
    SUPABASE_URL: 'https://gosmkthmamloafgtvhpj.supabase.co',
    SUPABASE_KEY: 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4',
    PLACEHOLDER_IMAGES: {
      daire: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80',
      villa: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80',
      arsa: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
      mustakil_ev: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&q=80',
      isyeri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
      yazlik: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
      default: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80'
    }
  };

  let sbClient;
  function init() {
    if (!window.supabase) { console.warn('[Frontend] Supabase SDK yüklenmemiş'); return null; }
    if (!sbClient) {
      sbClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    return sbClient;
  }

  function esc(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  // Kart CSS: yeni sınıf adları ile (mevcut sayfa CSS'i ile çakışmaz)
  function injectCardSafeCSS() {
    if (document.getElementById('iu-card-v2-css')) return;
    const s = document.createElement('style');
    s.id = 'iu-card-v2-css';
    s.textContent = `
      /* Grid container */
      #iu-dynamic-listings {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
        gap: 28px !important;
        max-width: 1280px !important;
        margin: 0 auto !important;
        padding: 0 20px 60px !important;
      }
      /* Card wrapper */
      article.iu-card-v2 {
        display: block !important;
        width: 100% !important;
        background: #FFFFFF !important;
        border-radius: 14px !important;
        overflow: hidden !important;
        box-shadow: 0 8px 24px rgba(10,42,94,0.08) !important;
        border: 1px solid #E5E7EB !important;
        transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease !important;
      }
      article.iu-card-v2:hover {
        transform: translateY(-6px) !important;
        box-shadow: 0 20px 40px rgba(10,42,94,0.15) !important;
        border-color: #F49B1C !important;
      }
      /* Image */
      article.iu-card-v2 > .iu-card-v2__img {
        display: block !important;
        width: 100% !important;
        height: 240px !important;
        position: relative !important;
        background-size: cover !important;
        background-position: center !important;
        background-color: #E5E7EB !important;
      }
      article.iu-card-v2 > .iu-card-v2__img::after {
        content: '' !important;
        position: absolute !important;
        inset: 0 !important;
        background: linear-gradient(180deg, transparent 0%, rgba(10,42,94,0.35) 100%) !important;
      }
      /* Badges */
      article.iu-card-v2 .iu-card-v2__tag {
        position: absolute !important;
        top: 14px !important; left: 14px !important;
        background: #F49B1C !important; color: #0A2A5E !important;
        padding: 6px 14px !important; border-radius: 50px !important;
        font-size: 11px !important; font-weight: 800 !important;
        letter-spacing: 1px !important; z-index: 2 !important;
      }
      article.iu-card-v2 .iu-card-v2__tag.vip {
        background: #0A2A5E !important; color: #F49B1C !important;
      }
      article.iu-card-v2 .iu-card-v2__type {
        position: absolute !important;
        top: 14px !important; right: 14px !important;
        background: rgba(255,255,255,0.95) !important; color: #0A2A5E !important;
        padding: 6px 14px !important; border-radius: 50px !important;
        font-size: 11px !important; font-weight: 700 !important;
        z-index: 2 !important; backdrop-filter: blur(10px) !important;
      }
      /* Content */
      article.iu-card-v2 > .iu-card-v2__content {
        display: block !important;
        width: 100% !important;
        padding: 22px !important;
        box-sizing: border-box !important;
      }
      article.iu-card-v2 .iu-card-v2__loc {
        display: flex !important; align-items: center !important; gap: 6px !important;
        color: #6B7280 !important; font-size: 12px !important;
        margin: 0 0 8px 0 !important; font-weight: 600 !important; letter-spacing: 0.5px !important;
      }
      article.iu-card-v2 .iu-card-v2__loc i { color: #F49B1C !important; }
      article.iu-card-v2 .iu-card-v2__title {
        font-family: 'League Spartan', 'Montserrat', sans-serif !important;
        font-size: 19px !important; font-weight: 700 !important;
        color: #0A2A5E !important; margin: 0 0 14px 0 !important; line-height: 1.3 !important;
      }
      article.iu-card-v2 .iu-card-v2__feats {
        display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important;
        padding: 14px 0 !important;
        border-top: 1px solid #E5E7EB !important; border-bottom: 1px solid #E5E7EB !important;
        margin: 0 0 14px 0 !important;
      }
      article.iu-card-v2 .iu-card-v2__feats span {
        display: flex !important; align-items: center !important; gap: 6px !important;
        color: #4B5563 !important; font-size: 13px !important;
      }
      article.iu-card-v2 .iu-card-v2__feats i { color: #F49B1C !important; }
      article.iu-card-v2 .iu-card-v2__price {
        font-family: 'League Spartan', 'Montserrat', sans-serif !important;
        font-size: 22px !important; font-weight: 800 !important;
        color: #0A2A5E !important; margin: 0 0 12px 0 !important;
      }
      article.iu-card-v2 .iu-card-v2__desc {
        color: #6B7280 !important; font-size: 13px !important; line-height: 1.5 !important;
        margin: 0 0 16px 0 !important;
      }
      article.iu-card-v2 .iu-card-v2__cta {
        display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important;
      }
      article.iu-card-v2 .iu-card-v2__cta a {
        display: flex !important; align-items: center !important; justify-content: center !important;
        gap: 8px !important; padding: 12px 16px !important; border-radius: 8px !important;
        font-weight: 700 !important; font-size: 13px !important; text-decoration: none !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
      }
      article.iu-card-v2 .iu-card-v2__cta .iu-cta-call {
        background: #0A2A5E !important; color: #FFFFFF !important;
      }
      article.iu-card-v2 .iu-card-v2__cta .iu-cta-call:hover {
        background: #071F44 !important; transform: translateY(-1px) !important;
      }
      article.iu-card-v2 .iu-card-v2__cta .iu-cta-wa {
        background: #25D366 !important; color: #FFFFFF !important;
      }
      article.iu-card-v2 .iu-card-v2__cta .iu-cta-wa:hover {
        background: #1DA851 !important; transform: translateY(-1px) !important;
      }
    `;
    document.head.appendChild(s);
  }

  function formatPrice(price, currency) {
    if (!price) return 'Bilgi İçin Arayın';
    const symbols = { TL: '₺', USD: '$', EUR: '€' };
    return new Intl.NumberFormat('tr-TR').format(price) + ' ' + (symbols[currency] || currency || '₺');
  }

  function getMainImage(p) {
    // property_images join'den ana_foto=true olan, yoksa ilk, yoksa placeholder
    if (p.property_images && p.property_images.length) {
      const main = p.property_images.find(i => i.ana_foto === true) || p.property_images[0];
      if (main && main.url) return main.url;
    }
    return CONFIG.PLACEHOLDER_IMAGES[p.kategori] || CONFIG.PLACEHOLDER_IMAGES.default;
  }

  // ==================== SORGU FONKSİYONLARI ====================

  // Timeout yardımcı: promise 10 saniyeden uzun sürerse iptal
  function withTimeout(promise, ms = 10000, label = 'sorgu') {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(label + ' timeout (' + ms + 'ms)')), ms))
    ]);
  }

  // Property fetch - property_images ile join, sıralanmış
  async function fetchProperties(filters = {}) {
    const sb = init();
    if (!sb) return { data: null, error: 'SDK yok' };

    let q = sb.from('properties')
      .select('*, property_images(url, ana_foto, sira)')
      .eq('durum', 'aktif');

    if (filters.tip) q = q.eq('tip', filters.tip);
    if (filters.kategori) q = q.eq('kategori', filters.kategori);
    if (filters.kategoriIn) q = q.in('kategori', filters.kategoriIn);
    if (filters.ilce) q = q.eq('ilce', filters.ilce);
    if (filters.one_cikan === true) q = q.eq('one_cikan', true);

    q = q.order('one_cikan', { ascending: false }).order('created_at', { ascending: false });
    if (filters.limit) q = q.limit(filters.limit);

    try {
      // 10 saniyelik timeout — sonsuz yükleme olmasın
      const result = await withTimeout(q, 10000, 'properties fetch');
      // Property_images join başarısız olursa (RLS/kolon eksik), retry — sadece properties
      if (result.error && String(result.error.message || result.error).toLowerCase().includes('property_images')) {
        console.warn('[Frontend] property_images join başarısız, sadece properties çekiliyor');
        let q2 = sb.from('properties').select('*').eq('durum', 'aktif');
        if (filters.tip) q2 = q2.eq('tip', filters.tip);
        if (filters.kategori) q2 = q2.eq('kategori', filters.kategori);
        if (filters.kategoriIn) q2 = q2.in('kategori', filters.kategoriIn);
        if (filters.ilce) q2 = q2.eq('ilce', filters.ilce);
        if (filters.one_cikan === true) q2 = q2.eq('one_cikan', true);
        q2 = q2.order('one_cikan', { ascending: false }).order('created_at', { ascending: false });
        if (filters.limit) q2 = q2.limit(filters.limit);
        return await withTimeout(q2, 10000, 'properties fallback');
      }
      return result;
    } catch (err) {
      console.error('[Frontend] fetchProperties hata:', err);
      return { data: null, error: err };
    }
  }

  // ==================== ANA SAYFA: KATEGORİ SAYAÇLARI ====================

  function matchCategoryKey(href) {
    if (!href) return null;
    href = href.toLowerCase();
    if (href.includes('satilik-daire')) return 'satilik-daire';
    if (href.includes('kiralik-villa')) return 'kiralik-villa';
    if (href.includes('esyali-kiralik')) return 'esyali-kiralik';
    if (href.includes('merkez-kiralik')) return 'merkez-kiralik-daire';
    if (href.includes('kiralik-daire')) return 'kiralik-daire';
    if (href.includes('satilik-arsa')) return 'satilik-arsa';
    if (href.includes('satilik-ev')) return 'satilik-ev';
    if (href.includes('kiralik-ev')) return 'kiralik-ev';
    return null;
  }

  function classifyProperty(p) {
    const keys = [];
    const kat = (p.kategori || '').toLowerCase();
    const tip = (p.tip || '').toLowerCase();
    const ilce = (p.ilce || '').toLowerCase();
    const esyali = p.ozellikler?.esyali === true;

    if (kat === 'daire' && tip === 'satilik') keys.push('satilik-daire');
    if (kat === 'daire' && tip === 'kiralik') keys.push('kiralik-daire');
    if (kat === 'arsa' && tip === 'satilik') keys.push('satilik-arsa');
    if (kat === 'villa' && tip === 'kiralik') keys.push('kiralik-villa');
    if ((kat === 'villa' || kat === 'mustakil_ev') && tip === 'satilik') keys.push('satilik-ev');
    if (esyali && tip === 'kiralik') keys.push('esyali-kiralik');
    if (kat === 'daire' && tip === 'kiralik' && ilce === 'merkez') keys.push('merkez-kiralik-daire');
    if (kat === 'mustakil_ev' && tip === 'kiralik') keys.push('kiralik-ev');
    return keys;
  }

  async function updateCategoryCounts() {
    try {
      const { data: properties, error } = await fetchProperties({});
      if (error) throw error;
      if (!properties) return;

      console.log('[Frontend] Toplam ' + properties.length + ' aktif ilan');

      const counts = {};
      const firstImages = {};

      properties.forEach(p => {
        const keys = classifyProperty(p);
        keys.forEach(key => {
          counts[key] = (counts[key] || 0) + 1;
          if (!firstImages[key]) {
            const img = getMainImage(p);
            if (img && !img.includes('unsplash')) firstImages[key] = img;
          }
        });
      });

      const cards = document.querySelectorAll('.cat-card');
      cards.forEach(card => {
        const href = card.getAttribute('href');
        const key = matchCategoryKey(href);
        if (!key) return;

        const count = counts[key] || 0;
        const metaSpans = card.querySelectorAll('.cat-card-meta span[data-i18n]');
        metaSpans.forEach(span => {
          const i18nKey = span.getAttribute('data-i18n');
          if (i18nKey && i18nKey.includes('count')) {
            span.textContent = count + ' aktif ilan';
          }
        });

        if (firstImages[key]) {
          const imgDiv = card.querySelector('.cat-card-image');
          if (imgDiv) imgDiv.style.backgroundImage = `url('${firstImages[key]}')`;
        }
      });

      const totalEl = document.getElementById('totalListings');
      if (totalEl) totalEl.textContent = properties.length;
    } catch (err) {
      console.error('[Frontend] Kategori güncelleme hatası:', err);
    }
  }

  // ==================== KATEGORİ SAYFASI ====================

  function findCategoryContainer() {
    // Yeni temiz container (kategori sayfaları için)
    let c = document.getElementById('iu-dynamic-listings');
    if (c) return c;
    // Eski selector'lar (geriye uyumluluk için)
    c = document.getElementById('categoryPropertiesList');
    if (c) return c;
    c = document.querySelector('.listings-grid-pillar');
    if (c) return c;
    c = document.querySelector('.listings-grid');
    if (c) return c;
    c = document.querySelector('.property-grid');
    if (c) return c;
    return null;
  }

  // BRAND NEW class names to avoid ANY conflict with page CSS
  function renderPillarCard(p) {
    const img = getMainImage(p);
    const wa = 'https://wa.me/905075188482?text=' + encodeURIComponent('Merhaba, ' + (p.baslik_tr || 'İlan') + ' hakkında bilgi almak istiyorum');
    const fiyat = formatPrice(p.fiyat, p.para_birimi);
    const isNew = p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 30 * 86400000;
    const typeUpper = (p.tip || 'satilik').toUpperCase();

    // <article> root — semantic + no external CSS targets it
    const card = document.createElement('article');
    card.className = 'iu-card-v2';

    // Image div
    const imgDiv = document.createElement('div');
    imgDiv.className = 'iu-card-v2__img';
    imgDiv.style.setProperty('background-image', 'url("' + img + '")', 'important');

    if (p.one_cikan) {
      const t = document.createElement('span');
      t.className = 'iu-card-v2__tag vip';
      t.textContent = '💎 VIP FIRSAT';
      imgDiv.appendChild(t);
    } else if (isNew) {
      const t = document.createElement('span');
      t.className = 'iu-card-v2__tag';
      t.textContent = '🆕 YENİ İLAN';
      imgDiv.appendChild(t);
    }

    const typeBadge = document.createElement('span');
    typeBadge.className = 'iu-card-v2__type';
    typeBadge.textContent = typeUpper;
    imgDiv.appendChild(typeBadge);

    card.appendChild(imgDiv);

    // Content div
    const contentDiv = document.createElement('div');
    contentDiv.className = 'iu-card-v2__content';

    // Location
    const loc = document.createElement('div');
    loc.className = 'iu-card-v2__loc';
    const locI = document.createElement('i');
    locI.className = 'fa-solid fa-location-dot';
    loc.appendChild(locI);
    loc.appendChild(document.createTextNode(' ' + (p.ilce || 'YALOVA').toUpperCase() + (p.mahalle ? ', ' + p.mahalle.toUpperCase() : '')));
    contentDiv.appendChild(loc);

    // Title
    const title = document.createElement('h3');
    title.className = 'iu-card-v2__title';
    title.textContent = p.baslik_tr || 'İlan';
    contentDiv.appendChild(title);

    // Features
    const feats = document.createElement('div');
    feats.className = 'iu-card-v2__feats';
    const featList = [];
    if (p.m2) featList.push({ icon: 'fa-mountain', text: p.m2 + ' m²' });
    if (p.oda_sayisi) featList.push({ icon: 'fa-bed', text: p.oda_sayisi });
    if (p.emsal) featList.push({ icon: 'fa-compass', text: p.emsal + ' Emsal' });
    if (p.ada_parsel) featList.push({ icon: 'fa-map', text: p.ada_parsel });
    if (featList.length < 4 && p.imar_durumu) featList.push({ icon: 'fa-file-contract', text: p.imar_durumu });
    if (featList.length < 4 && p.bina_yasi != null) featList.push({ icon: 'fa-clock', text: p.bina_yasi + ' yaş' });
    if (featList.length < 2) featList.push({ icon: 'fa-location-dot', text: p.ilce || 'Yalova' });

    featList.forEach(f => {
      const s = document.createElement('span');
      const i = document.createElement('i');
      i.className = 'fa-solid ' + f.icon;
      s.appendChild(i);
      s.appendChild(document.createTextNode(' ' + f.text));
      feats.appendChild(s);
    });
    contentDiv.appendChild(feats);

    // Price
    const price = document.createElement('div');
    price.className = 'iu-card-v2__price';
    price.textContent = fiyat;
    contentDiv.appendChild(price);

    // Description
    const desc = (p.aciklama_tr || '').substring(0, 130).trim();
    if (desc) {
      const dEl = document.createElement('p');
      dEl.className = 'iu-card-v2__desc';
      dEl.textContent = desc + ((p.aciklama_tr || '').length > 130 ? '...' : '');
      contentDiv.appendChild(dEl);
    }

    // CTA
    const cta = document.createElement('div');
    cta.className = 'iu-card-v2__cta';
    const callBtn = document.createElement('a');
    callBtn.href = 'tel:+905075188482';
    callBtn.className = 'iu-cta-call';
    callBtn.innerHTML = '<i class="fa-solid fa-phone"></i> Ara';
    const waBtn = document.createElement('a');
    waBtn.href = wa;
    waBtn.target = '_blank';
    waBtn.rel = 'noopener noreferrer';
    waBtn.className = 'iu-cta-wa';
    waBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Sor';
    cta.appendChild(callBtn);
    cta.appendChild(waBtn);
    contentDiv.appendChild(cta);

    card.appendChild(contentDiv);

    return card;
  }

  async function loadCategoryPageProperties() {
    const found = findCategoryContainer();
    if (!found) return;

    // Yeni temiz container mı yoksa eski legacy container mı?
    let container;
    if (found.id === 'iu-dynamic-listings') {
      // Yeni format: doğrudan kullan
      container = found;
    } else {
      // Eski format: gizle, yerine yeni container koy
      found.style.setProperty('display', 'none', 'important');
      container = document.getElementById('iu-dynamic-listings');
      if (!container) {
        container = document.createElement('div');
        container.id = 'iu-dynamic-listings';
        found.parentNode.insertBefore(container, found.nextSibling);
      }
    }

    const pathname = window.location.pathname.toLowerCase();
    const filters = {};

    if (pathname.includes('satilik')) filters.tip = 'satilik';
    else if (pathname.includes('kiralik')) filters.tip = 'kiralik';

    if (pathname.includes('arsa') || pathname.includes('tarla')) filters.kategoriIn = ['arsa', 'tarla'];
    else if (pathname.includes('daire')) filters.kategori = 'daire';
    else if (pathname.includes('villa')) filters.kategori = 'villa';
    else if (pathname.includes('mustakil') || pathname.includes('kiralik-ev') || pathname.includes('satilik-ev')) filters.kategoriIn = ['villa', 'mustakil_ev'];
    else if (pathname.includes('isyeri') || pathname.includes('dukkan')) filters.kategori = 'isyeri';
    else if (pathname.includes('yazlik')) filters.kategori = 'yazlik';
    else if (pathname.includes('luks')) filters.one_cikan = true;

    if (pathname.includes('cinarcik')) filters.ilce = 'Çınarcık';
    else if (pathname.includes('termal')) filters.ilce = 'Termal';
    else if (pathname.includes('altinova')) filters.ilce = 'Altınova';
    else if (pathname.includes('armutlu')) filters.ilce = 'Armutlu';
    else if (pathname.includes('merkez')) filters.ilce = 'Merkez';

    try {
      const { data: properties, error } = await fetchProperties(filters);
      if (error) throw error;

      console.log('[Frontend] Kategori sayfası: ' + (properties?.length || 0) + ' ilan');

      if (!properties || properties.length === 0) {
        container.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
            <div style="font-size:56px;margin-bottom:20px;">🏡</div>
            <h3 style="color:#0A2A5E;margin-bottom:12px;font-size:22px;">Bu kategoride henüz ilan yok</h3>
            <p style="color:#6B7280;max-width:400px;margin:0 auto;">Yakında yeni ilanlar eklenecek. Bültenimize kayıt olursanız ilk siz haberdar olursunuz.</p>
          </div>
        `;
        return;
      }

      // DOM API ile kartları ekle (wrapper sıyrılma sorunlarını önler)
      container.innerHTML = '';
      properties.forEach(p => {
        container.appendChild(renderPillarCard(p));
      });

      document.querySelectorAll('[data-property-count]').forEach(el => {
        el.textContent = properties.length;
      });
    } catch (err) {
      console.error('[Frontend] Kategori sayfası hatası:', err);
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#EF4444;">Yükleme hatası. Sayfayı yenileyin.</div>';
    }
  }

  // ==================== İLAN DETAY SAYFASI ====================

  async function loadPropertyDetail() {
    const container = document.getElementById('propertyDetail');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    const sb = init();
    if (!sb) return;

    try {
      const { data: p, error } = await sb
        .from('properties')
        .select('*, property_images(url, ana_foto, sira)')
        .eq('id', id)
        .eq('durum', 'aktif')
        .maybeSingle();

      if (error) throw error;
      if (!p) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">İlan bulunamadı</p>';
        return;
      }

      sb.from('properties').update({ goruntulenme: (p.goruntulenme || 0) + 1 }).eq('id', id).then(() => {});

      const images = (p.property_images || []).sort((a, b) => (a.sira || 0) - (b.sira || 0));
      const mainImg = getMainImage(p);

      container.innerHTML = `
        <div style="max-width:1200px;margin:0 auto;padding:40px 24px;">
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:32px;">
            <div>
              <img id="detailMainImg" src="${esc(mainImg)}" style="width:100%;height:500px;object-fit:cover;border-radius:16px;margin-bottom:16px;">
              ${images.length > 1 ? `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                  ${images.slice(0, 8).map(i => `<img src="${esc(i.url)}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="document.getElementById('detailMainImg').src=this.src">`).join('')}
                </div>` : ''}
            </div>
            <div>
              <span style="display:inline-block;background:${p.tip === 'satilik' ? '#F49B1C' : '#0A2A5E'};color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;">${esc((p.tip || '').toUpperCase())}</span>
              <h1 style="font-size:28px;color:#0A2A5E;margin:12px 0;">${esc(p.baslik_tr)}</h1>
              <div style="font-size:36px;font-weight:800;color:#F49B1C;margin:20px 0;">${formatPrice(p.fiyat, p.para_birimi)}</div>
              <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin:20px 0;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
                  <div><strong>Konum:</strong> ${esc(p.ilce || '-')}${p.mahalle ? ', ' + esc(p.mahalle) : ''}</div>
                  <div><strong>Alan:</strong> ${p.m2 || '-'} m²</div>
                  <div><strong>Oda:</strong> ${esc(p.oda_sayisi || '-')}</div>
                  <div><strong>Banyo:</strong> ${p.banyo_sayisi || '-'}</div>
                  <div><strong>Kat:</strong> ${esc(p.kat || '-')}</div>
                  <div><strong>Yaş:</strong> ${p.bina_yasi != null ? p.bina_yasi : '-'}</div>
                  <div><strong>Isınma:</strong> ${esc(p.isinma || '-')}</div>
                  <div><strong>İmar:</strong> ${esc(p.imar_durumu || '-')}</div>
                </div>
              </div>
              <a href="tel:+905075188482" style="display:block;background:#0A2A5E;color:white;padding:16px;border-radius:12px;text-align:center;text-decoration:none;font-weight:700;margin-bottom:8px;"><i class="fa-solid fa-phone"></i> HEMEN ARA</a>
              <a href="https://wa.me/905075188482" target="_blank" style="display:block;background:#25D366;color:white;padding:16px;border-radius:12px;text-align:center;text-decoration:none;font-weight:700;"><i class="fa-brands fa-whatsapp"></i> WHATSAPP</a>
            </div>
          </div>
          <div style="margin-top:32px;background:white;padding:24px;border-radius:16px;">
            <h2 style="color:#0A2A5E;margin-bottom:12px;">Açıklama</h2>
            <p style="line-height:1.7;color:#374151;">${esc(p.aciklama_tr || 'Bu ilan için açıklama eklenmemiş.')}</p>
          </div>
        </div>
      `;

      document.title = p.baslik_tr + ' - İsmail Ünsal Gayrimenkul';
    } catch (err) {
      console.error('[Frontend] İlan detay hatası:', err);
      container.innerHTML = '<p style="text-align:center;padding:40px;color:#EF4444;">Yükleme hatası</p>';
    }
  }

  // ==================== ANA SAYFA ÖNE ÇIKAN ====================

  async function loadFeaturedProperties() {
    const container = document.getElementById('featuredProperties');
    if (!container) return;

    try {
      let { data: properties } = await fetchProperties({ one_cikan: true, limit: 6 });
      if (!properties || properties.length === 0) {
        const res = await fetchProperties({ limit: 6 });
        properties = res.data || [];
      }
      container.innerHTML = '';
      properties.forEach(p => container.appendChild(renderPillarCard(p)));
    } catch (err) {
      console.error('[Frontend] Öne çıkan hatası:', err);
    }
  }

  // ==================== OTOMATİK FAQ INJECTION ====================

  function autoInjectFAQ() {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('/sss') || pathname.includes('/faq')) return;
    if (pathname.includes('/ilan.html')) return;
    if (pathname.includes('/hesabim') || pathname.includes('/account')) return;
    if (pathname.includes('/iletisim') || pathname.includes('/contact')) return;
    if (pathname.includes('/hakkimizda') || pathname.includes('/hakkimda')) return;
    if (pathname.includes('/admin')) return;
    if (pathname.includes('/verify') || pathname.includes('/unsubscribe')) return;

    // Container zaten var mı?
    let container = document.getElementById('faqContainer');
    let hadContainer = !!container;

    if (!container) {
      // Homepage (index.html) için genel FAQ, kategori sayfaları için o kategori
      let category = 'genel';
      let title = 'Yalova Emlak Hakkında Sıkça Sorulan Sorular';
      let subtitle = 'Uzman TURYAP danışmanından cevaplar';

      if (pathname.includes('arsa') || pathname.includes('tarla')) {
        category = 'arsa'; title = 'Yalova Arsa Rehberi';
      } else if (pathname.includes('daire')) {
        category = 'daire'; title = 'Yalova Daire Rehberi';
      } else if (pathname.includes('villa') || pathname.includes('satilik-ev') || pathname.includes('kiralik-ev')) {
        category = 'villa'; title = 'Yalova Villa Rehberi';
      } else if (pathname.includes('kiralik')) {
        category = 'kiralik'; title = 'Yalova Kiralık Rehberi';
      } else if (pathname.includes('isyeri') || pathname.includes('dukkan')) {
        category = 'isyeri'; title = 'Yalova İşyeri Rehberi';
      }

      container = document.createElement('div');
      container.id = 'faqContainer';
      container.setAttribute('data-faq-category', category);
      container.setAttribute('data-faq-title', title);
      container.setAttribute('data-faq-subtitle', subtitle);

      const footer = document.querySelector('footer');
      if (footer) footer.parentNode.insertBefore(container, footer);
      else document.body.appendChild(container);

      console.log('[Frontend] FAQ container otomatik eklendi: ' + category);
    }

    // FAQ script zaten yüklüyse, doğrudan render et
    if (window.IUFAQ && !hadContainer) {
      const cat = container.getAttribute('data-faq-category') || 'genel';
      const title = container.getAttribute('data-faq-title');
      const subtitle = container.getAttribute('data-faq-subtitle');

      let faqs;
      if (cat === 'genel') {
        faqs = [...window.IUFAQ.FAQS.genel];
        faqs.push(window.IUFAQ.FAQS.arsa[0], window.IUFAQ.FAQS.daire[0], window.IUFAQ.FAQS.villa[0], window.IUFAQ.FAQS.kiralik[0]);
      } else {
        const catFaqs = window.IUFAQ.FAQS[cat] || [];
        const needed = Math.max(0, 8 - catFaqs.length);
        const generalFaqs = window.IUFAQ.FAQS.genel.slice(0, needed + 1);
        faqs = [...catFaqs, ...generalFaqs];
      }
      const seen = new Set();
      faqs = faqs.filter(f => { if (seen.has(f.q)) return false; seen.add(f.q); return true; });
      window.IUFAQ.renderFAQs(container, faqs, { title, subtitle });
      window.IUFAQ.injectSchema(faqs);
      console.log('[Frontend] FAQ elle render edildi (' + faqs.length + ' soru)');
    }
  }

  // ==================== INIT ====================

  async function start() {
    injectCardSafeCSS();
    // Kategori sayfasını ÖNCE ve BAĞIMSIZ yükle (kullanıcı beklemesin)
    loadCategoryPageProperties().catch(err => {
      console.error('[Frontend] Kategori sayfası hata:', err);
      const c = document.getElementById('iu-dynamic-listings');
      if (c) c.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#EF4444;">Yükleme hatası. Lütfen sayfayı yenileyin.</div>';
    });
    // FAQ'ı da ERKEN inject et (kullanıcı yükleme beklemesin)
    autoInjectFAQ();
    // Sonrakiler paralel — herhangi biri hata verse diğerlerini engellemesin
    Promise.allSettled([
      updateCategoryCounts(),
      loadFeaturedProperties(),
      loadPropertyDetail()
    ]).then(() => {
      // Hepsi bitince FAQ'ı tekrar dene (belki container o an eklendi)
      autoInjectFAQ();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.IUFrontend = { updateCategoryCounts, loadFeaturedProperties, loadCategoryPageProperties, loadPropertyDetail };

})();
