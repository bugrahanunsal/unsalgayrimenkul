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

    return await q;
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
    let c = document.getElementById('categoryPropertiesList');
    if (c) return c;
    c = document.querySelector('.listings-grid-pillar');
    if (c) return c;
    c = document.querySelector('.listings-grid');
    if (c) return c;
    c = document.querySelector('.property-grid');
    if (c) return c;
    return null;
  }

  function renderPillarCard(p) {
    const img = getMainImage(p);
    const wa = 'https://wa.me/905075188482?text=' + encodeURIComponent('Merhaba, ' + (p.baslik_tr || 'İlan') + ' hakkında bilgi almak istiyorum');
    const fiyat = formatPrice(p.fiyat, p.para_birimi);

    // 4 feature slot (grid 2x2)
    const features = [];
    if (p.m2) features.push('<span><i class="fa-solid fa-mountain"></i> ' + esc(p.m2) + ' m²</span>');
    if (p.oda_sayisi) features.push('<span><i class="fa-solid fa-bed"></i> ' + esc(p.oda_sayisi) + '</span>');
    if (p.emsal) features.push('<span><i class="fa-solid fa-compass"></i> ' + esc(p.emsal) + ' Emsal</span>');
    if (p.ada_parsel) features.push('<span><i class="fa-solid fa-map"></i> ' + esc(p.ada_parsel) + '</span>');
    if (features.length < 4 && p.imar_durumu) features.push('<span><i class="fa-solid fa-file-contract"></i> ' + esc(p.imar_durumu) + '</span>');
    if (features.length < 4 && p.bina_yasi != null) features.push('<span><i class="fa-solid fa-clock"></i> ' + esc(p.bina_yasi) + ' yaş</span>');
    if (features.length < 2) features.push('<span><i class="fa-solid fa-location-dot"></i> ' + esc(p.ilce || 'Yalova') + '</span>');

    const isNew = p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 30 * 86400000;
    let tag = '';
    if (p.one_cikan) tag = '<span class="listing-tag-pillar vip">\u{1F48E} VIP FIRSAT</span>';
    else if (isNew) tag = '<span class="listing-tag-pillar" style="background:#F49B1C;color:#0A2A5E;">\u{1F195} YENİ İLAN</span>';

    const desc = (p.aciklama_tr || '').substring(0, 130).trim();
    const typeUpper = (p.tip || 'satilik').toUpperCase();
    const bgImg = 'background-image: url(\'' + img.replace(/'/g, "\\'") + '\');';

    return '<div class="listing-card-pillar">' +
      '<div class="listing-image-pillar" style="' + bgImg + '">' +
        tag +
        '<span class="listing-type-badge-pillar">' + esc(typeUpper) + '</span>' +
      '</div>' +
      '<div class="listing-content-pillar">' +
        '<div class="listing-location-pillar">' +
          '<i class="fa-solid fa-location-dot"></i> ' + esc((p.ilce || 'YALOVA').toUpperCase()) + (p.mahalle ? ', ' + esc(p.mahalle.toUpperCase()) : '') +
        '</div>' +
        '<h3 class="listing-title-pillar">' + esc(p.baslik_tr || 'İlan') + '</h3>' +
        '<div class="listing-features-pillar">' + features.join('') + '</div>' +
        '<div class="listing-price-pillar">' + fiyat + '</div>' +
        (desc ? '<p class="listing-desc-pillar">' + esc(desc) + ((p.aciklama_tr || '').length > 130 ? '...' : '') + '</p>' : '') +
        '<div class="listing-cta-pillar">' +
          '<a href="tel:+905075188482" class="cta-pillar-call"><i class="fa-solid fa-phone"></i> Ara</a>' +
          '<a href="' + wa + '" target="_blank" class="cta-pillar-wa"><i class="fa-brands fa-whatsapp"></i> Sor</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  async function loadCategoryPageProperties() {
    const container = findCategoryContainer();
    if (!container) return;

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

      container.innerHTML = properties.map(renderPillarCard).join('');

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
      container.innerHTML = properties.map(renderPillarCard).join('');
    } catch (err) {
      console.error('[Frontend] Öne çıkan hatası:', err);
    }
  }

  // ==================== OTOMATİK FAQ INJECTION ====================

  function autoInjectFAQ() {
    if (document.getElementById('faqContainer')) return;
    const pathname = window.location.pathname.toLowerCase();
    if (pathname === '/' || pathname === '/index.html') return;
    if (pathname.includes('/sss')) return;
    if (pathname.includes('/ilan.html')) return;
    if (pathname.includes('/hesabim')) return;
    if (pathname.includes('/iletisim')) return;
    if (pathname.includes('/hakkimizda')) return;
    if (pathname.includes('/admin')) return;
    if (pathname.includes('/blog')) return;

    let category = 'genel';
    if (pathname.includes('arsa') || pathname.includes('tarla')) category = 'arsa';
    else if (pathname.includes('daire')) category = 'daire';
    else if (pathname.includes('villa') || pathname.includes('ev')) category = 'villa';
    else if (pathname.includes('kiralik')) category = 'kiralik';
    else if (pathname.includes('isyeri')) category = 'isyeri';

    const labels = {
      arsa: 'Yalova Arsa Rehberi',
      daire: 'Yalova Daire Rehberi',
      villa: 'Yalova Villa Rehberi',
      kiralik: 'Yalova Kiralık Rehberi',
      isyeri: 'Yalova İşyeri Rehberi',
      genel: 'Yalova Emlak Rehberi'
    };

    const faqDiv = document.createElement('div');
    faqDiv.id = 'faqContainer';
    faqDiv.setAttribute('data-faq-category', category);
    faqDiv.setAttribute('data-faq-title', labels[category]);

    const footer = document.querySelector('footer');
    if (footer) footer.parentNode.insertBefore(faqDiv, footer);
    else document.body.appendChild(faqDiv);

    if (!document.querySelector('script[src*="faq-yalova-emlak"]')) {
      const s = document.createElement('script');
      s.src = '/faq-yalova-emlak.js';
      s.async = true;
      document.body.appendChild(s);
      console.log('[Frontend] FAQ otomatik eklendi (' + category + ')');
    }
  }

  // ==================== INIT ====================

  async function start() {
    await updateCategoryCounts();
    await loadFeaturedProperties();
    await loadCategoryPageProperties();
    await loadPropertyDetail();
    autoInjectFAQ();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.IUFrontend = { updateCategoryCounts, loadFeaturedProperties, loadCategoryPageProperties, loadPropertyDetail };

})();
