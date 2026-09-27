/**
 * ============================================================
 * FRONTEND SUPABASE INTEGRATION
 * ismailunsal.com.tr - Ana site database bağlantısı
 * ============================================================
 *
 * Bu dosya ana site'nin (index.html + kategori sayfaları) Supabase
 * database'ine bağlanmasını sağlar. Şunları yapar:
 *
 * 1. Ana sayfa kategori kartlarındaki sayıları dinamik günceller
 * 2. Öne çıkan ilanlar bölümünü doldurur (varsa)
 * 3. Kategori sayfalarında ilan listesini çeker
 * 4. Toplam ilan sayısını günceller
 *
 * KULLANIM:
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * <script src="/frontend-supabase.js"></script>
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
      default: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80'
    }
  };

  let sbClient;

  function init() {
    if (!window.supabase) {
      console.warn('[Frontend] Supabase SDK yüklenmemiş');
      return null;
    }
    if (!sbClient) {
      sbClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    return sbClient;
  }

  // ==================== YARDIMCI FONKSİYONLAR ====================

  function esc(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatPrice(price) {
    if (!price) return '-';
    return new Intl.NumberFormat('tr-TR').format(price) + ' ₺';
  }

  // Kategori adı → HTML card href eşleştirmesi
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

  // Property → kategori key
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

  // ==================== ANA SAYFA: KATEGORİ SAYAÇLARINI GÜNCELLE ====================

  async function updateCategoryCounts() {
    const sb = init();
    if (!sb) return;

    try {
      const { data: properties, error } = await sb
        .from('properties')
        .select('id, kategori, tip, ilce, ozellikler, property_images(url, is_main)')
        .eq('durum', 'aktif');

      if (error) throw error;
      if (!properties) return;

      console.log('[Frontend] ' + properties.length + ' aktif ilan yüklendi');

      // Kategori sayacları
      const counts = {};
      const firstImages = {};

      properties.forEach(p => {
        const keys = classifyProperty(p);
        keys.forEach(key => {
          counts[key] = (counts[key] || 0) + 1;

          // İlk fotoğrafı sakla
          if (!firstImages[key]) {
            const img = p.property_images?.find(i => i.is_main)?.url ||
                        p.property_images?.[0]?.url;
            if (img) firstImages[key] = img;
          }
        });
      });

      // HTML kartlarını güncelle
      const cards = document.querySelectorAll('.cat-card');
      cards.forEach(card => {
        const href = card.getAttribute('href');
        const key = matchCategoryKey(href);
        if (!key) return;

        const count = counts[key] || 0;

        // Sayı güncelle - meta içindeki data-i18n span'ı bul
        const metaSpans = card.querySelectorAll('.cat-card-meta span[data-i18n]');
        metaSpans.forEach(span => {
          const i18nKey = span.getAttribute('data-i18n');
          if (i18nKey && i18nKey.includes('count')) {
            span.textContent = count + ' aktif ilan';
          }
        });

        // Fotoğrafı güncelle (eğer database'de foto varsa)
        if (firstImages[key]) {
          const imgDiv = card.querySelector('.cat-card-image');
          if (imgDiv) {
            imgDiv.style.backgroundImage = `url('${firstImages[key]}')`;
          }
        }

        // Kart href'ini de dinamik yap (kategori sayfası için query param)
        // Ör: yalova-satilik-daire.html?kategori=daire&tip=satilik
        // (Kategori sayfaları da database okuyacak - Phase 2)
      });

      // Toplam ilan sayısı
      const totalEl = document.getElementById('totalListings');
      if (totalEl) {
        totalEl.textContent = properties.length;
      }

      // Filter status: gösterilen kategori sayısı (hep 8 gösterelim)
      const resultEl = document.getElementById('resultCount');
      if (resultEl) resultEl.textContent = cards.length;

    } catch (err) {
      console.error('[Frontend] Kategori güncellemesi hatası:', err);
    }
  }

  // ==================== ÖNE ÇIKAN İLANLAR ====================

  async function loadFeaturedProperties() {
    const container = document.getElementById('featuredProperties');
    if (!container) return; // Container yoksa atla

    const sb = init();
    if (!sb) return;

    try {
      const { data: properties, error } = await sb
        .from('properties')
        .select('*, property_images(url, is_main)')
        .eq('durum', 'aktif')
        .eq('one_cikan', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (!properties?.length) {
        // Öne çıkan yoksa en son eklenenlerı göster
        const { data: latest } = await sb
          .from('properties')
          .select('*, property_images(url, is_main)')
          .eq('durum', 'aktif')
          .order('created_at', { ascending: false })
          .limit(6);

        renderPropertyGrid(container, latest || []);
      } else {
        renderPropertyGrid(container, properties);
      }
    } catch (err) {
      console.error('[Frontend] Öne çıkan ilanlar hatası:', err);
    }
  }

  function renderPropertyGrid(container, properties) {
    if (!properties.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;">Henüz ilan yok. Yakında eklenecek!</div>';
      return;
    }

    container.innerHTML = properties.map(p => {
      const img = p.property_images?.find(i => i.is_main)?.url ||
                  p.property_images?.[0]?.url ||
                  CONFIG.PLACEHOLDER_IMAGES[p.kategori] ||
                  CONFIG.PLACEHOLDER_IMAGES.default;

      return `
        <a href="ilan.html?id=${esc(p.id)}" class="property-card" style="display:block;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(10,42,94,0.08);text-decoration:none;color:inherit;transition:all 0.2s;">
          <div style="height:220px;background:url('${esc(img)}') center/cover;position:relative;">
            <span style="position:absolute;top:12px;left:12px;background:${p.tip === 'satilik' ? '#F49B1C' : '#0A2A5E'};color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
              ${esc(p.tip)}
            </span>
            ${p.one_cikan ? '<span style="position:absolute;top:12px;right:12px;background:#EF4444;color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;">⭐ ÖNE ÇIKAN</span>' : ''}
          </div>
          <div style="padding:20px;">
            <h3 style="font-size:17px;color:#0A2A5E;margin-bottom:8px;line-height:1.3;">${esc(p.baslik_tr || 'İlan')}</h3>
            <div style="font-size:12px;color:#6B7280;margin-bottom:12px;">
              📍 ${esc(p.ilce || 'Yalova')} • ${esc(p.kategori || '')}
              ${p.alan ? `• ${p.alan}m²` : ''}
              ${p.oda_sayisi ? `• ${esc(p.oda_sayisi)}` : ''}
            </div>
            <div style="font-size:22px;font-weight:800;color:#F49B1C;">${formatPrice(p.fiyat)}</div>
          </div>
        </a>
      `;
    }).join('');
  }

  // ==================== KATEGORİ SAYFASI: İLAN LİSTESİ ====================

  async function loadCategoryPageProperties() {
    const container = document.getElementById('categoryPropertiesList');
    if (!container) return; // Kategori sayfasında değiliz

    const sb = init();
    if (!sb) return;

    // Sayfa URL'inden kategori tahmini
    const pathname = window.location.pathname.toLowerCase();
    let query = sb.from('properties')
      .select('*, property_images(url, is_main)')
      .eq('durum', 'aktif');

    // URL'ye göre filtrele
    if (pathname.includes('satilik')) query = query.eq('tip', 'satilik');
    if (pathname.includes('kiralik')) query = query.eq('tip', 'kiralik');

    if (pathname.includes('daire')) query = query.eq('kategori', 'daire');
    else if (pathname.includes('arsa')) query = query.eq('kategori', 'arsa');
    else if (pathname.includes('villa')) query = query.eq('kategori', 'villa');
    else if (pathname.includes('ev')) query = query.in('kategori', ['villa', 'mustakil_ev']);

    if (pathname.includes('merkez')) query = query.eq('ilce', 'Merkez');

    query = query.order('created_at', { ascending: false });

    try {
      const { data: properties, error } = await query;
      if (error) throw error;

      renderPropertyGrid(container, properties || []);

      // Sayfa başlığında sayı güncelle
      const titleEl = document.getElementById('categoryCount');
      if (titleEl) titleEl.textContent = (properties?.length || 0);

    } catch (err) {
      console.error('[Frontend] Kategori sayfası hatası:', err);
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#EF4444;">Yükleme hatası: ' + esc(err.message) + '</div>';
    }
  }

  // ==================== İLAN DETAY SAYFASI ====================

  async function loadPropertyDetail() {
    const container = document.getElementById('propertyDetail');
    if (!container) return; // Detay sayfasında değiliz

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
      container.innerHTML = '<p style="text-align:center;padding:40px;">İlan ID bulunamadı</p>';
      return;
    }

    const sb = init();
    if (!sb) return;

    try {
      const { data: p, error } = await sb
        .from('properties')
        .select('*, property_images(url, is_main)')
        .eq('id', id)
        .eq('durum', 'aktif')
        .maybeSingle();

      if (error) throw error;
      if (!p) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">İlan bulunamadı veya kaldırıldı</p>';
        return;
      }

      // Görüntülenme sayısını arttır
      sb.from('properties').update({ goruntulenme: (p.goruntulenme || 0) + 1 }).eq('id', id).then(() => {});

      const images = p.property_images || [];
      const mainImg = images.find(i => i.is_main)?.url || images[0]?.url || CONFIG.PLACEHOLDER_IMAGES.default;

      container.innerHTML = `
        <div style="max-width:1200px;margin:0 auto;padding:40px 24px;">
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:32px;">
            <div>
              <img src="${esc(mainImg)}" style="width:100%;height:500px;object-fit:cover;border-radius:16px;margin-bottom:16px;">
              ${images.length > 1 ? `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                  ${images.slice(0, 8).map(i => `<img src="${esc(i.url)}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="document.querySelector('.detail-main-img').src=this.src">`).join('')}
                </div>
              ` : ''}
            </div>
            <div>
              <span style="display:inline-block;background:${p.tip === 'satilik' ? '#F49B1C' : '#0A2A5E'};color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;">${esc(p.tip)}</span>
              <h1 style="font-size:28px;color:#0A2A5E;margin:12px 0;">${esc(p.baslik_tr)}</h1>
              <div style="font-size:36px;font-weight:800;color:#F49B1C;margin:20px 0;">${formatPrice(p.fiyat)}</div>

              <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin:20px 0;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
                  <div><strong>Konum:</strong> ${esc(p.ilce)}, ${esc(p.mahalle || '')}</div>
                  <div><strong>Alan:</strong> ${p.alan || '-'} m²</div>
                  <div><strong>Oda:</strong> ${esc(p.oda_sayisi || '-')}</div>
                  <div><strong>Kat:</strong> ${esc(p.bulundugu_kat || '-')}</div>
                  <div><strong>Yaş:</strong> ${p.bina_yasi || '-'}</div>
                  <div><strong>Isıtma:</strong> ${esc(p.isitma || '-')}</div>
                </div>
              </div>

              <a href="tel:+905075188482" style="display:block;background:#0A2A5E;color:white;padding:16px;border-radius:12px;text-align:center;text-decoration:none;font-weight:700;margin-bottom:8px;">📞 HEMEN ARA</a>
              <a href="https://wa.me/905075188482" style="display:block;background:#25D366;color:white;padding:16px;border-radius:12px;text-align:center;text-decoration:none;font-weight:700;">💬 WHATSAPP</a>
            </div>
          </div>
          <div style="margin-top:32px;background:white;padding:24px;border-radius:16px;">
            <h2 style="color:#0A2A5E;margin-bottom:12px;">Açıklama</h2>
            <p style="line-height:1.7;color:#374151;">${esc(p.aciklama_tr || 'Bu ilan için açıklama eklenmemiş.')}</p>
          </div>
        </div>
      `;

      // Sayfa title güncelle
      document.title = p.baslik_tr + ' - İsmail Ünsal Gayrimenkul';

    } catch (err) {
      console.error('[Frontend] İlan detay hatası:', err);
      container.innerHTML = '<p style="text-align:center;padding:40px;color:#EF4444;">Hata: ' + esc(err.message) + '</p>';
    }
  }

  // ==================== INIT ====================

  async function start() {
    // Sayfa tipine göre yükleme yap
    await updateCategoryCounts();      // Ana sayfada kategori kartları
    await loadFeaturedProperties();    // Ana sayfada öne çıkan (varsa)
    await loadCategoryPageProperties(); // Kategori sayfalarında
    await loadPropertyDetail();        // İlan detay sayfasında
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Global expose - konsoldan test için
  window.IUFrontend = {
    updateCategoryCounts,
    loadFeaturedProperties,
    loadCategoryPageProperties,
    loadPropertyDetail
  };

})();
