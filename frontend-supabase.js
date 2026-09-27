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

  // Kategori sayfası container'ı otomatik bul (birden fazla olası yer)
  function findCategoryContainer() {
    // 1. Öncelik: özel ID
    let c = document.getElementById('categoryPropertiesList');
    if (c) return { el: c, mode: 'replace' };

    // 2. Mevcut sitedeki class'lar (hardcoded ilanlar için)
    c = document.querySelector('.listings-grid-pillar');
    if (c) return { el: c, mode: 'replace' };

    c = document.querySelector('.listings-grid');
    if (c) return { el: c, mode: 'replace' };

    c = document.querySelector('.property-grid');
    if (c) return { el: c, mode: 'replace' };

    c = document.querySelector('.properties-list');
    if (c) return { el: c, mode: 'replace' };

    return null;
  }

  // Mevcut siteye uyumlu ilan kartı (listings-grid-pillar için)
  function renderPillarCard(p) {
    const img = p.property_images?.find(i => i.is_main)?.url ||
                p.property_images?.[0]?.url ||
                CONFIG.PLACEHOLDER_IMAGES[p.kategori] ||
                CONFIG.PLACEHOLDER_IMAGES.default;

    const phone = '+905075188482';
    const wa = 'https://wa.me/905075188482?text=' + encodeURIComponent((p.baslik_tr || 'İlan') + ' hakkında bilgi almak istiyorum');

    // Fiyat formatı
    const fiyat = p.fiyat ? formatPrice(p.fiyat) : 'Bilgi İçin Arayın';

    // Alan / oda / kategori bilgileri
    const features = [];
    if (p.alan) features.push('<span>📐 ' + esc(p.alan) + ' m²</span>');
    if (p.oda_sayisi) features.push('<span>🛏 ' + esc(p.oda_sayisi) + '</span>');
    if (p.bina_yasi != null) features.push('<span>🏗 ' + esc(p.bina_yasi) + ' yaş</span>');
    if (p.emsal) features.push('<span>🧭 ' + esc(p.emsal) + ' Emsal</span>');
    if (features.length === 0) features.push('<span>📍 ' + esc(p.ilce || 'Yalova') + '</span>');

    // Etiket (öne çıkan / yeni / normal)
    const tag = p.one_cikan
      ? '<span class="listing-tag-pillar vip">💎 VIP FIRSAT</span>'
      : (p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 7 * 86400000)
        ? '<span class="listing-tag-pillar" style="background:#F49B1C;color:white;">🆕 YENİ İLAN</span>'
        : '';

    const typeUpper = (p.tip || '').toUpperCase();

    return `
      <a href="ilan.html?id=${esc(p.id)}" class="listing-card-pillar" style="text-decoration:none;color:inherit;display:block;">
        <div class="listing-image-pillar" style="background-image: url('${esc(img)}'); background-size: cover; background-position: center;">
          ${tag}
          <span class="listing-type-badge-pillar">${esc(typeUpper)}</span>
        </div>
        <div class="listing-content-pillar">
          <div class="listing-location-pillar">
            📍 ${esc((p.ilce || 'YALOVA').toUpperCase())}${p.mahalle ? ', ' + esc(p.mahalle.toUpperCase()) : ''}
          </div>
          <h3 class="listing-title-pillar">${esc(p.baslik_tr || 'İlan')}</h3>
          <div class="listing-features-pillar">
            ${features.join('')}
          </div>
          <div class="listing-price-pillar">${fiyat}</div>
          <p class="listing-desc-pillar">${esc((p.aciklama_tr || p.ozet_tr || '').substring(0, 120))}${(p.aciklama_tr || '').length > 120 ? '...' : ''}</p>
          <div class="listing-cta-pillar">
            <a href="tel:${phone}" class="cta-pillar-call" onclick="event.stopPropagation();">📞 Ara</a>
            <a href="${wa}" target="_blank" class="cta-pillar-wa" onclick="event.stopPropagation();">💬 Sor</a>
          </div>
        </div>
      </a>
    `;
  }

  async function loadCategoryPageProperties() {
    const found = findCategoryContainer();
    if (!found) return; // Kategori sayfası değil

    const { el: container } = found;
    const sb = init();
    if (!sb) return;

    // Sayfa URL'inden kategori tahmini
    const pathname = window.location.pathname.toLowerCase();
    let query = sb.from('properties')
      .select('*, property_images(url, is_main)')
      .eq('durum', 'aktif');

    // URL'ye göre tip filtresi
    if (pathname.includes('satilik')) query = query.eq('tip', 'satilik');
    else if (pathname.includes('kiralik')) query = query.eq('tip', 'kiralik');

    // URL'ye göre kategori filtresi
    if (pathname.includes('arsa') || pathname.includes('tarla')) query = query.in('kategori', ['arsa', 'tarla']);
    else if (pathname.includes('daire')) query = query.eq('kategori', 'daire');
    else if (pathname.includes('villa')) query = query.eq('kategori', 'villa');
    else if (pathname.includes('mustakil') || pathname.includes('ev')) query = query.in('kategori', ['villa', 'mustakil_ev']);
    else if (pathname.includes('isyeri') || pathname.includes('dukkan')) query = query.eq('kategori', 'isyeri');
    else if (pathname.includes('yazlik')) query = query.eq('kategori', 'yazlik');
    else if (pathname.includes('bina')) query = query.eq('kategori', 'bina');
    else if (pathname.includes('luks')) query = query.eq('one_cikan', true);

    // İlçe filtresi
    if (pathname.includes('cinarcik')) query = query.eq('ilce', 'Çınarcık');
    else if (pathname.includes('termal')) query = query.eq('ilce', 'Termal');
    else if (pathname.includes('altinova')) query = query.eq('ilce', 'Altınova');
    else if (pathname.includes('armutlu')) query = query.eq('ilce', 'Armutlu');
    else if (pathname.includes('ciftlikkoy')) query = query.eq('ilce', 'Çiftlikköy');
    else if (pathname.includes('akkoy')) query = query.eq('ilce', 'Akköy');
    else if (pathname.includes('merkez')) query = query.eq('ilce', 'Merkez');

    query = query.order('one_cikan', { ascending: false }).order('created_at', { ascending: false });

    try {
      const { data: properties, error } = await query;
      if (error) throw error;

      console.log('[Frontend] Kategori sayfası: ' + (properties?.length || 0) + ' ilan bulundu');

      // Container'ın class'ına göre render seç
      const isPillar = container.classList.contains('listings-grid-pillar');

      if (!properties || properties.length === 0) {
        container.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
            <div style="font-size:48px;margin-bottom:16px;">🏡</div>
            <h3 style="color:#0A2A5E;margin-bottom:8px;">Bu kategoride henüz ilan yok</h3>
            <p style="color:#6B7280;">Yakında yeni ilanlar eklenecek. Bültenimize kayıt olun, ilk siz haberdar olun.</p>
          </div>
        `;
        return;
      }

      if (isPillar) {
        container.innerHTML = properties.map(renderPillarCard).join('');
      } else {
        renderPropertyGrid(container, properties);
      }

      // Sayfa başlığında sayı güncelle
      const titleEl = document.getElementById('categoryCount');
      if (titleEl) titleEl.textContent = properties.length;

      // Sayı gösteren tüm elementleri güncelle
      document.querySelectorAll('[data-property-count]').forEach(el => {
        el.textContent = properties.length;
      });

    } catch (err) {
      console.error('[Frontend] Kategori sayfası hatası:', err);
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#EF4444;">Yükleme hatası: ' + esc(err.message) + '</div>';
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

  // ==================== OTOMATIK FAQ INJECTION ====================

  function autoInjectFAQ() {
    // Zaten FAQ container varsa dokunma
    if (document.getElementById('faqContainer')) return;

    const pathname = window.location.pathname.toLowerCase();

    // Ana sayfa, ilan detay, veya /sss'de otomatik ekleme yapma
    if (pathname === '/' || pathname === '/index.html') return;
    if (pathname.includes('/sss')) return;
    if (pathname.includes('/ilan.html')) return;
    if (pathname.includes('/hesabim')) return;
    if (pathname.includes('/iletisim')) return;
    if (pathname.includes('/hakkimizda')) return;
    if (pathname.includes('/admin')) return;

    // FAQ kategorisi tahmini
    let category = 'genel';
    if (pathname.includes('arsa') || pathname.includes('tarla')) category = 'arsa';
    else if (pathname.includes('daire')) category = 'daire';
    else if (pathname.includes('villa') || pathname.includes('ev')) category = 'villa';
    else if (pathname.includes('kiralik')) category = 'kiralik';
    else if (pathname.includes('isyeri') || pathname.includes('dukkan')) category = 'isyeri';

    // Sayfa başlığı için etiket
    const categoryLabels = {
      arsa: 'Yalova Arsa Rehberi',
      daire: 'Yalova Daire Rehberi',
      villa: 'Yalova Villa Rehberi',
      kiralik: 'Yalova Kiralık Rehberi',
      isyeri: 'Yalova İşyeri Rehberi',
      genel: 'Yalova Emlak Rehberi'
    };

    // Sayfaya container ekle (footer'dan önce, yoksa body sonuna)
    const faqDiv = document.createElement('div');
    faqDiv.id = 'faqContainer';
    faqDiv.setAttribute('data-faq-category', category);
    faqDiv.setAttribute('data-faq-title', categoryLabels[category]);
    faqDiv.setAttribute('data-faq-subtitle', 'Uzman TURYAP danışmanından cevaplar');

    const footer = document.querySelector('footer');
    if (footer) {
      footer.parentNode.insertBefore(faqDiv, footer);
    } else {
      document.body.appendChild(faqDiv);
    }

    // FAQ script'ini yükle (eğer zaten yüklenmemişse)
    if (!document.querySelector('script[src*="faq-yalova-emlak"]')) {
      const script = document.createElement('script');
      script.src = '/faq-yalova-emlak.js';
      script.async = true;
      document.body.appendChild(script);
      console.log('[Frontend] FAQ otomatik eklendi (' + category + ')');
    }
  }

  // ==================== INIT ====================

  async function start() {
    // Sayfa tipine göre yükleme yap
    await updateCategoryCounts();      // Ana sayfada kategori kartları
    await loadFeaturedProperties();    // Ana sayfada öne çıkan (varsa)
    await loadCategoryPageProperties(); // Kategori sayfalarında
    await loadPropertyDetail();        // İlan detay sayfasında

    // Kategori sayfalarına otomatik FAQ ekle (SEO için)
    autoInjectFAQ();
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
