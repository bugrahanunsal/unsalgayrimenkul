/**
 * BLOG SIDEBAR - Öne çıkan ilanlar loader
 * Sidebar'daki [data-sidebar-listings] div'ine 3 öne çıkan ilan basar.
 * Supabase'den one_cikan=true & durum=aktif olanları çeker.
 */
(function() {
  'use strict';

  const CONFIG = {
    SUPABASE_URL: 'https://gosmkthmamloafgtvhpj.supabase.co',
    SUPABASE_KEY: 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4',
    LIMIT: 3
  };

  const PLACEHOLDER = {
    villa: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80',
    daire: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80',
    mustakil_ev: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&q=80',
    arsa: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80',
    default: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80'
  };

  function fmtPrice(v, cur) {
    if (!v) return 'Fiyat İçin Arayın';
    const symbol = { TL: '₺', TRY: '₺', USD: '$', EUR: '€', GBP: '£' }[cur] || '₺';
    return symbol + ' ' + Number(v).toLocaleString('tr-TR');
  }

  function pickImage(p) {
    if (p.property_images && p.property_images.length) {
      const main = p.property_images.find(i => i.ana_foto) || p.property_images[0];
      if (main && main.url) return main.url;
    }
    return PLACEHOLDER[p.kategori] || PLACEHOLDER.default;
  }

  function slugify(s) {
    return (s || '').toString().toLowerCase()
      .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o')
      .replace(/ş/g,'s').replace(/ü/g,'u')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  // HTML'e basılan her ilan verisi kaçış yapılır (XSS önlemi)
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // İlanın kendi sayfası: /ilan/<slug> (frontend-supabase.js listingUrl ile aynı kural)
  function detailLink(p) {
    const langMatch = location.pathname.toLowerCase().match(/^\/(en|fr|de|ru|ar)(\/|$)/);
    const prefix = langMatch ? '/' + langMatch[1] : '';
    if (p.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) && p.slug.length <= 220) return prefix + '/ilan/' + p.slug;
    return prefix + '/ilan?id=' + encodeURIComponent(p.id);
  }

  function renderCard(p) {
    const img = pickImage(p);
    const price = fmtPrice(p.fiyat, p.para_birimi);
    const title = p.baslik_tr || 'İlan';
    const loc = [p.ilce, p.mahalle].filter(Boolean).join(', ');
    const tipLabel = p.tip === 'kiralik' ? 'KİRALIK' : 'SATILIK';
    const safeImg = /^https:\/\//i.test(img) ? img.replace(/["'()\\\s]/g, c => encodeURIComponent(c)) : PLACEHOLDER.default;
    return `
      <a href="${esc(detailLink(p))}" class="sb-listing-card">
        <div class="sb-listing-img" style="background-image:url('${esc(safeImg)}')">
          <span class="sb-listing-tag">${tipLabel}</span>
        </div>
        <div class="sb-listing-body">
          <div class="sb-listing-loc"><i class="fa-solid fa-location-dot"></i> ${esc(loc || 'Yalova')}</div>
          <h4 class="sb-listing-title">${esc(title)}</h4>
          <div class="sb-listing-price">${esc(price)}</div>
        </div>
      </a>
    `;
  }

  async function loadFeatured() {
    const container = document.querySelector('[data-sidebar-listings]');
    if (!container) return;
    if (!window.supabase) {
      // Wait for supabase SDK
      let tries = 0;
      while (!window.supabase && tries < 30) {
        await new Promise(r => setTimeout(r, 200));
        tries++;
      }
      if (!window.supabase) {
        container.innerHTML = '<p class="sb-empty">İlanlar yüklenemedi.</p>';
        return;
      }
    }
    try {
      const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      // Try one_cikan=true first
      let { data, error } = await sb
        .from('properties')
        .select('*, property_images(url, ana_foto, sira)')
        .eq('durum', 'aktif')
        .eq('one_cikan', true)
        .order('created_at', { ascending: false })
        .limit(CONFIG.LIMIT);
      // Fallback: any aktif if no featured
      if (!error && (!data || data.length === 0)) {
        const r2 = await sb
          .from('properties')
          .select('*, property_images(url, ana_foto, sira)')
          .eq('durum', 'aktif')
          .order('created_at', { ascending: false })
          .limit(CONFIG.LIMIT);
        data = r2.data;
        error = r2.error;
      }
      if (error) throw error;
      if (!data || !data.length) {
        container.innerHTML = '<p class="sb-empty">Şu anda öne çıkan ilan yok.</p>';
        return;
      }
      container.innerHTML = data.map(renderCard).join('');
    } catch (e) {
      console.warn('[BlogSidebar] fetch failed', e);
      container.innerHTML = '<p class="sb-empty">İlanlar yüklenemedi.</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeatured);
  } else {
    loadFeatured();
  }
})();
