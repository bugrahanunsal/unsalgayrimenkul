/**
 * ============================================================
 * İLAN DETAY SAYFASI — /ilan/<slug>  (ilan.html)
 * ============================================================
 * - URL: /ilan/<slug>, /en/ilan/<slug> ... veya /ilan?id=<id>
 * - Veri: Supabase properties + property_images (sadece durum='aktif')
 * - Güvenlik: tüm ilan verisi textContent / esc() ile basılır, URL parametresi
 *   regex ile doğrulanır, sadece publishable (anon) key kullanılır,
 *   ziyaretçi tarayıcısı veritabanında hiçbir şeyi GÜNCELLEMEZ.
 *   Tek yazma işlemi: bilgi talep formu → leads tablosuna INSERT.
 * - Altında: benzer ilanlar + diğer ilanlar + danışman/iletişim bilgileri.
 */
(function () {
  'use strict';

  const SITE = 'https://ismailunsal.com.tr';
  const PHONE_MAIN = '+905075188482';

  const KATEGORI = { daire: 'Daire', villa: 'Villa', arsa: 'Arsa', mustakil_ev: 'Müstakil Ev',
    isyeri: 'İşyeri', yazlik: 'Yazlık', tarla: 'Tarla', bina: 'Bina' };
  const TIP = { satilik: 'Satılık', kiralik: 'Kiralık' };
  const ISINMA = { kombi: 'Kombi', klima: 'Klima', soba: 'Soba', merkezi: 'Merkezi', dogalgaz: 'Doğalgaz Sobası', yok: 'Yok' };
  const IMAR = { konut: 'Konut', ticari: 'Ticari', tarim: 'Tarım', sanayi: 'Sanayi', turistik: 'Turistik' };
  const OZELLIK = [
    ['deniz_manzarali', 'Deniz Manzaralı', 'fa-water'],
    ['havuzlu', 'Havuzlu', 'fa-person-swimming'],
    ['bahceli', 'Bahçeli', 'fa-tree'],
    ['otoparkli', 'Otoparklı', 'fa-square-parking'],
    ['esyali', 'Eşyalı', 'fa-couch'],
    ['asansorlu', 'Asansörlü', 'fa-elevator'],
    ['guvenlikli', 'Güvenlikli Site', 'fa-shield-halved'],
    ['balkonlu', 'Balkonlu', 'fa-building']
  ];
  const CURRENCY_ISO = { TL: 'TRY', TRY: 'TRY', USD: 'USD', EUR: 'EUR' };

  const root = document.getElementById('ilanDetay');
  if (!root) return;

  // ---------------- küçük DOM yardımcıları ----------------
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;            // SADECE sabit (bizim yazdığımız) HTML için
      else n.setAttribute(k, v);
    }
    (children || []).forEach(c => { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  const icon = (cls) => el('i', { class: cls, 'aria-hidden': 'true' });

  function lp(path) { return (window.IUFrontend ? window.IUFrontend.langPrefix() : '') + path; }

  function categoryPage(p) {
    const k = p.kategori, t = p.tip === 'kiralik' ? 'kiralik' : 'satilik';
    if (k === 'arsa' || k === 'tarla') return { href: lp('/yalova-satilik-arsa'), label: 'Satılık Arsa' };
    if (k === 'villa') return t === 'kiralik' ? { href: lp('/yalova-kiralik-villa'), label: 'Kiralık Villa' } : { href: lp('/yalova-satilik-ev'), label: 'Satılık Ev & Villa' };
    if (k === 'mustakil_ev') return { href: lp('/yalova-' + t + '-ev'), label: TIP[t] + ' Ev' };
    return { href: lp('/yalova-' + t + '-daire'), label: TIP[t] + ' Daire' };
  }

  function title(p) {
    const lang = (window.IUFrontend ? window.IUFrontend.langPrefix() : '').replace('/', '');
    return (lang && p['baslik_' + lang]) || p.baslik_tr || 'İlan';
  }

  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  // ---------------- URL → slug / id (doğrulanmış) ----------------
  function readKey() {
    let path = location.pathname;
    try { path = decodeURIComponent(path); } catch (_) { return null; }
    path = path.toLowerCase();
    const m = path.match(/\/ilan\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
    if (m && m[1].length <= 220) return { slug: m[1] };
    const id = new URLSearchParams(location.search).get('id') || '';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || /^\d{1,12}$/.test(id)) return { id };
    return null;
  }

  // frontend-supabase.js (script.js yükler) hazır olana kadar bekle
  function waitFrontend(timeoutMs) {
    return new Promise((resolve) => {
      if (window.IUFrontend && window.IUFrontend.client) return resolve(true);
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (window.IUFrontend && window.IUFrontend.client) { clearInterval(iv); resolve(true); }
        else if (Date.now() - t0 > timeoutMs) { clearInterval(iv); resolve(false); }
      }, 100);
    });
  }

  // ---------------- SEO (başlık, meta, canonical, JSON-LD) ----------------
  function setMeta(attr, key, content) {
    let m = document.head.querySelector('meta[' + attr + '="' + key + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m); }
    m.setAttribute('content', content);
  }
  function applySEO(p, images) {
    const t = title(p);
    const cat = (TIP[p.tip] || '') + ' ' + (KATEGORI[p.kategori] || 'Gayrimenkul');
    const loc = [p.mahalle, p.ilce, 'Yalova'].filter(Boolean).join(', ');
    const price = window.IUFrontend.formatPrice(p.fiyat, p.para_birimi);
    const url = SITE + window.IUFrontend.listingUrl(p);
    const desc = (loc + ' — ' + cat + ' — ' + price + '. ' + (p.aciklama_tr || '')).replace(/\s+/g, ' ').slice(0, 158);
    document.title = t + ' | ' + cat + ' ' + (p.ilce || 'Yalova') + ' — TURYAP İsmail Ünsal';
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', t);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', 'product');
    if (images[0]) setMeta('property', 'og:image', images[0]);
    let c = document.head.querySelector('link[rel="canonical"]');
    if (!c) { c = document.createElement('link'); c.rel = 'canonical'; document.head.appendChild(c); }
    c.href = url;

    const ld = {
      '@context': 'https://schema.org',
      '@graph': [{
        '@type': 'RealEstateListing',
        name: t,
        description: (p.aciklama_tr || '').slice(0, 5000),
        url: url,
        image: images.slice(0, 10),
        datePosted: p.created_at,
        about: {
          '@type': p.kategori === 'arsa' || p.kategori === 'tarla' ? 'Place' : 'Accommodation',
          address: { '@type': 'PostalAddress', addressLocality: p.ilce || 'Yalova', addressRegion: 'Yalova', addressCountry: 'TR' },
          floorSize: p.m2 ? { '@type': 'QuantitativeValue', value: p.m2, unitCode: 'MTK' } : undefined,
          numberOfRooms: p.oda_sayisi || undefined
        },
        offers: p.fiyat ? {
          '@type': 'Offer', price: p.fiyat, priceCurrency: CURRENCY_ISO[p.para_birimi] || 'TRY',
          availability: 'https://schema.org/InStock',
          businessFunction: p.tip === 'kiralik' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
          seller: { '@type': 'RealEstateAgent', name: 'TURYAP İsmail Ünsal', telephone: PHONE_MAIN, url: SITE }
        } : undefined
      }, {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: categoryPage(p).label, item: SITE + categoryPage(p).href },
          { '@type': 'ListItem', position: 3, name: t, item: url }
        ]
      }]
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);          // textContent → HTML olarak yorumlanmaz
    document.head.appendChild(s);
  }

  // ---------------- GALERİ ----------------
  function buildGallery(p, images) {
    const t = title(p);
    let idx = 0;
    const main = el('div', { class: 'ild-gal-main' });
    const img = el('img', { src: images[0], alt: t, loading: 'eager', fetchpriority: 'high' });
    const counter = el('span', { class: 'ild-gal-count' });
    const prev = el('button', { class: 'ild-gal-nav prev', type: 'button', 'aria-label': 'Önceki fotoğraf' }, [icon('fa-solid fa-chevron-left')]);
    const next = el('button', { class: 'ild-gal-nav next', type: 'button', 'aria-label': 'Sonraki fotoğraf' }, [icon('fa-solid fa-chevron-right')]);
    const zoom = el('button', { class: 'ild-gal-zoom', type: 'button', 'aria-label': 'Tam ekran' }, [icon('fa-solid fa-expand')]);
    main.append(img, counter, zoom);
    if (images.length > 1) main.append(prev, next);

    // badges
    const badges = el('div', { class: 'ild-gal-badges' });
    badges.appendChild(el('span', { class: 'ild-badge type', text: (TIP[p.tip] || 'Satılık').toUpperCase() }));
    if (p.one_cikan) badges.appendChild(el('span', { class: 'ild-badge vip', text: 'VIP FIRSAT' }));
    else if (p.created_at && Date.now() - new Date(p.created_at).getTime() < 30 * 86400000)
      badges.appendChild(el('span', { class: 'ild-badge new', text: 'YENİ İLAN' }));
    main.appendChild(badges);

    const thumbs = el('div', { class: 'ild-gal-thumbs', role: 'list' });
    images.forEach((u, i) => {
      const b = el('button', { class: 'ild-thumb', type: 'button', 'aria-label': (i + 1) + '. fotoğraf', role: 'listitem' },
        [el('img', { src: u, alt: '', loading: 'lazy' })]);
      b.addEventListener('click', () => show(i));
      thumbs.appendChild(b);
    });

    function show(i) {
      idx = (i + images.length) % images.length;
      img.src = images[idx];
      counter.textContent = (idx + 1) + ' / ' + images.length;
      thumbs.querySelectorAll('.ild-thumb').forEach((t, j) => t.classList.toggle('active', j === idx));
      const at = thumbs.children[idx];
      if (at && thumbs.scrollWidth > thumbs.clientWidth) thumbs.scrollTo({ left: at.offsetLeft - thumbs.clientWidth / 2 + at.clientWidth / 2, behavior: 'smooth' });
    }
    prev.addEventListener('click', () => show(idx - 1));
    next.addEventListener('click', () => show(idx + 1));

    // mobil kaydırma (swipe)
    let x0 = null;
    main.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    main.addEventListener('touchend', e => {
      if (x0 == null || images.length < 2) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    });

    // tam ekran
    function openLightbox() {
      const lb = el('div', { class: 'ild-lb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Fotoğraflar' });
      const lbImg = el('img', { src: images[idx], alt: t });
      const close = el('button', { class: 'ild-lb-close', type: 'button', 'aria-label': 'Kapat' }, [icon('fa-solid fa-xmark')]);
      const lbCount = el('span', { class: 'ild-lb-count', text: (idx + 1) + ' / ' + images.length });
      lb.append(lbImg, close, lbCount);
      const go = (d) => { show(idx + d); lbImg.src = images[idx]; lbCount.textContent = (idx + 1) + ' / ' + images.length; };
      if (images.length > 1) {
        const lp_ = el('button', { class: 'ild-lb-nav prev', type: 'button', 'aria-label': 'Önceki' }, [icon('fa-solid fa-chevron-left')]);
        const ln_ = el('button', { class: 'ild-lb-nav next', type: 'button', 'aria-label': 'Sonraki' }, [icon('fa-solid fa-chevron-right')]);
        lp_.addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
        ln_.addEventListener('click', (e) => { e.stopPropagation(); go(1); });
        lb.append(lp_, ln_);
      }
      let sx = null;
      lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); });
      const onKey = (e) => { if (e.key === 'Escape') done(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
      function done() { lb.remove(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; zoom.focus(); }
      close.addEventListener('click', done);
      lb.addEventListener('click', (e) => { if (e.target === lb) done(); });
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      document.body.appendChild(lb);
      close.focus();
    }
    zoom.addEventListener('click', openLightbox);
    img.addEventListener('click', openLightbox);

    show(0);
    const wrap = el('div', { class: 'ild-gal' }, [main]);
    if (images.length > 1) wrap.appendChild(thumbs);
    return wrap;
  }

  // ---------------- ÖZET KARTI (başlık, fiyat, butonlar) ----------------
  function buildSummary(p) {
    const F = window.IUFrontend;
    const loc = [p.mahalle, p.ilce, 'Yalova'].filter(Boolean).join(', ');
    const quick = el('div', { class: 'ild-quick' });
    const q = [];
    if (p.m2) q.push(['fa-ruler-combined', p.m2 + ' m²', 'Alan']);
    if (p.oda_sayisi) q.push(['fa-bed', p.oda_sayisi, 'Oda']);
    if (p.banyo_sayisi) q.push(['fa-bath', p.banyo_sayisi, 'Banyo']);
    if (p.imar_durumu && q.length < 3) q.push(['fa-file-contract', IMAR[p.imar_durumu] || p.imar_durumu, 'İmar']);
    if (p.emsal && q.length < 3) q.push(['fa-compass', p.emsal, 'Emsal']);
    if (p.bina_yasi != null && q.length < 3) q.push(['fa-clock', p.bina_yasi + ' yıl', 'Bina Yaşı']);
    q.slice(0, 3).forEach(([ic, v, l]) => quick.appendChild(el('div', { class: 'ild-quick-item' }, [icon('fa-solid ' + ic), el('strong', { text: String(v) }), el('span', { text: l })])));

    const share = el('div', { class: 'ild-share' }, [
      el('span', { text: 'Paylaş:' }),
      el('a', { href: 'https://wa.me/?text=' + encodeURIComponent(title(p) + ' — ' + F.listingUrl(p, true)), target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'WhatsApp ile paylaş' }, [icon('fa-brands fa-whatsapp')]),
      el('a', { href: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(F.listingUrl(p, true)), target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Facebook ile paylaş' }, [icon('fa-brands fa-facebook-f')])
    ]);
    const copyBtn = el('button', { type: 'button', class: 'ild-copy', 'aria-label': 'Linki kopyala' }, [icon('fa-solid fa-link')]);
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(F.listingUrl(p, true)); copyBtn.classList.add('ok'); copyBtn.title = 'Kopyalandı'; setTimeout(() => copyBtn.classList.remove('ok'), 1600); } catch (e) {}
    });
    share.appendChild(copyBtn);

    const box = el('div', { class: 'ild-summary' }, [
      el('div', { class: 'ild-sum-cat', text: ((TIP[p.tip] || '') + ' ' + (KATEGORI[p.kategori] || '')).trim().toUpperCase() }),
      el('h1', { class: 'ild-title', text: title(p) }),
      el('div', { class: 'ild-loc' }, [icon('fa-solid fa-location-dot'), ' ' + loc]),
      el('div', { class: 'ild-price', text: F.formatPrice(p.fiyat, p.para_birimi) }),
      q.length ? quick : null,
      el('div', { class: 'ild-actions' }, [
        el('a', { class: 'ild-btn call', href: 'tel:' + PHONE_MAIN }, [icon('fa-solid fa-phone'), ' Hemen Ara']),
        el('a', { class: 'ild-btn wa', href: F.waLink(p), target: '_blank', rel: 'noopener noreferrer' }, [icon('fa-brands fa-whatsapp'), ' WhatsApp']),
        el('a', { class: 'ild-btn ghost', href: '#ilan-bilgi-formu' }, [icon('fa-regular fa-envelope'), ' Bilgi İste'])
      ]),
      el('div', { class: 'ild-meta' }, [
        el('span', { text: 'İlan No: ' + String(p.id).slice(0, 8).toUpperCase() }),
        p.created_at ? el('span', { text: 'İlan Tarihi: ' + fmtDate(p.created_at) }) : null
      ]),
      share
    ]);
    if (p.turyap_link && /^https:\/\/([a-z0-9-]+\.)*turyap\.com\.tr\//i.test(p.turyap_link)) {
      box.appendChild(el('a', { class: 'ild-turyap', href: p.turyap_link, target: '_blank', rel: 'noopener noreferrer' }, [icon('fa-solid fa-arrow-up-right-from-square'), ' Bu ilanı TURYAP.com.tr\'de görüntüle']));
    }
    return box;
  }

  // ---------------- DETAY BÖLÜMLERİ ----------------
  function section(id, heading, body) {
    return el('section', { class: 'ild-sec', id: id }, [el('h2', { text: heading }), body]);
  }

  function buildFacts(p) {
    const rows = [
      ['İlan No', String(p.id).slice(0, 8).toUpperCase()],
      ['İlan Tarihi', p.created_at ? fmtDate(p.created_at) : null],
      ['Emlak Tipi', ((TIP[p.tip] || '') + ' ' + (KATEGORI[p.kategori] || '')).trim()],
      ['İlçe', p.ilce], ['Mahalle', p.mahalle],
      ['Alan', p.m2 ? p.m2 + ' m²' : null],
      ['Oda Sayısı', p.oda_sayisi], ['Banyo Sayısı', p.banyo_sayisi],
      ['Bulunduğu Kat', p.kat], ['Bina Yaşı', p.bina_yasi != null ? p.bina_yasi + ' yıl' : null],
      ['Isınma', p.isinma ? (ISINMA[p.isinma] || p.isinma) : null],
      ['İmar Durumu', p.imar_durumu ? (IMAR[p.imar_durumu] || p.imar_durumu) : null],
      ['Emsal', p.emsal], ['Ada / Parsel', p.ada_parsel]
    ].filter(r => r[1] != null && r[1] !== '');
    const dl = el('dl', { class: 'ild-facts' });
    rows.forEach(([k, v]) => { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { text: String(v) })); });
    return dl;
  }

  function buildFeatures(p) {
    const oz = p.ozellikler || {};
    const on = OZELLIK.filter(([k]) => oz[k] === true);
    if (!on.length) return null;
    const ul = el('ul', { class: 'ild-feats' });
    on.forEach(([, label, ic]) => ul.appendChild(el('li', null, [icon('fa-solid ' + ic), ' ' + label])));
    return ul;
  }

  function buildMap(p) {
    const q = [p.mahalle, p.ilce, 'Yalova', 'Türkiye'].filter(Boolean).join(', ');
    const wrap = el('div', { class: 'ild-map' });
    wrap.appendChild(el('p', { class: 'ild-map-note' }, [icon('fa-solid fa-location-dot'), ' ' + q.replace(', Türkiye', '') + ' — Gizlilik için harita yaklaşık konumu gösterir. Kesin adres için bizi arayın.']));
    wrap.appendChild(el('iframe', {
      title: 'Konum haritası', loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade',
      src: 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=13&output=embed'
    }));
    return wrap;
  }

  const AGENTS = [
    { name: 'İsmail Ünsal', role: 'TURYAP Gayrimenkul Danışmanı', phone: '+905075188482', phoneLabel: '+90 507 518 84 82', img: '/ismail-unsal.jpg' },
    { name: 'Ramazan Aydemir', role: 'TURYAP Gayrimenkul Danışmanı', phone: '+905325013275', phoneLabel: '+90 532 501 32 75', img: '/ramazan-aydemir.jpg' }
  ];
  function buildAgents(p) {
    const box = el('div', { class: 'ild-agents' }, [el('h3', { text: 'İlan Danışmanlarınız' })]);
    AGENTS.forEach(a => {
      const msg = 'Merhaba ' + a.name.split(' ')[0] + ' Bey, "' + title(p) + '" ilanı hakkında bilgi almak istiyorum.\n' + window.IUFrontend.listingUrl(p, true);
      box.appendChild(el('div', { class: 'ild-agent' }, [
        el('img', { src: a.img, alt: a.name, loading: 'lazy', width: '56', height: '56' }),
        el('div', { class: 'ild-agent-info' }, [el('strong', { text: a.name }), el('span', { text: a.role }), el('a', { href: 'tel:' + a.phone, text: a.phoneLabel })]),
        el('div', { class: 'ild-agent-btns' }, [
          el('a', { href: 'tel:' + a.phone, 'aria-label': a.name + ' ara' }, [icon('fa-solid fa-phone')]),
          el('a', { class: 'wa', href: 'https://wa.me/' + a.phone.replace('+', '') + '?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener noreferrer', 'aria-label': a.name + ' WhatsApp' }, [icon('fa-brands fa-whatsapp')])
        ])
      ]));
    });
    box.appendChild(el('div', { class: 'ild-office' }, [
      el('div', null, [icon('fa-solid fa-location-dot'), ' Yalova, Türkiye']),
      el('div', null, [icon('fa-solid fa-clock'), ' Pzt-Cmt: 09:00 - 19:00']),
      el('div', null, [icon('fa-solid fa-award'), ' Resmi TURYAP Yetkili Danışmanı'])
    ]));
    return box;
  }

  // ---------------- BİLGİ TALEP FORMU → leads ----------------
  function buildLeadForm(p) {
    const form = el('form', { class: 'ild-form', id: 'ilan-bilgi-formu', novalidate: 'novalidate' });
    form.innerHTML = [
      '<h3>Bu ilan hakkında bilgi alın</h3>',
      '<p class="ild-form-sub">Formu doldurun, danışmanımız en kısa sürede sizi arasın.</p>',
      '<label><span>Ad Soyad</span><input name="isim" type="text" autocomplete="name" maxlength="80" required></label>',
      '<label><span>Telefon</span><input name="telefon" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="05xx xxx xx xx" required></label>',
      '<label><span>E-posta <em>(isteğe bağlı)</em></span><input name="email" type="email" autocomplete="email" maxlength="120"></label>',
      '<label><span>Mesajınız</span><textarea name="mesaj" rows="3" maxlength="1000"></textarea></label>',
      // honeypot: botlar doldurur, insanlar görmez
      '<label class="ild-hp" aria-hidden="true">Web sitesi<input name="website" type="text" tabindex="-1" autocomplete="off"></label>',
      '<label class="ild-consent"><input name="kvkk" type="checkbox" required> <span><a href="/gizlilik-politikasi" target="_blank">KVKK Aydınlatma Metni</a>\'ni okudum, iletişim için bilgilerimin kullanılmasını kabul ediyorum.</span></label>',
      '<button type="submit" class="ild-btn call"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Gönder</button>',
      '<div class="ild-form-msg" role="status" aria-live="polite"></div>'
    ].join('');
    form.querySelector('textarea').value = '"' + title(p) + '" ilanı hakkında bilgi almak istiyorum.';
    const msgBox = form.querySelector('.ild-form-msg');
    const say = (t, ok) => { msgBox.textContent = t; msgBox.className = 'ild-form-msg ' + (ok ? 'ok' : 'err'); };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      if (fd.get('website')) return;                               // bot
      const isim = String(fd.get('isim') || '').trim().slice(0, 80);
      const telefon = String(fd.get('telefon') || '').replace(/[^\d+]/g, '').slice(0, 16);
      const email = String(fd.get('email') || '').trim().slice(0, 120);
      const mesaj = String(fd.get('mesaj') || '').trim().slice(0, 1000);
      if (isim.length < 2) return say('Lütfen adınızı yazın.');
      if (!/^\+?\d{10,15}$/.test(telefon)) return say('Lütfen geçerli bir telefon numarası yazın.');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return say('E-posta adresi geçersiz görünüyor.');
      if (!fd.get('kvkk')) return say('Devam etmek için KVKK onayını işaretleyin.');
      try {                                                          // aynı tarayıcıdan dakikada 1 gönderim
        const last = +sessionStorage.getItem('iu_lead_ts') || 0;
        if (Date.now() - last < 60000) return say('Talebiniz zaten alındı. Kısa süre içinde size dönüş yapacağız.', true);
      } catch (_) {}
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const sb = window.IUFrontend.client();
        const { error } = await sb.from('leads').insert({
          isim, telefon, email: email || null,
          mesaj: mesaj + '\n\nİlan: ' + window.IUFrontend.listingUrl(p, true),
          property_id: p.id
        });
        if (error) throw error;
        try { sessionStorage.setItem('iu_lead_ts', String(Date.now())); } catch (_) {}
        form.reset();
        say('Teşekkürler! Talebiniz alındı, danışmanımız en kısa sürede sizi arayacak.', true);
      } catch (err) {
        console.warn('[İlan] Form kaydedilemedi:', err && err.message);
        // Kayıt başarısızsa talep kaybolmasın: WhatsApp'a yönlendir
        msgBox.className = 'ild-form-msg err';
        msgBox.textContent = 'Form şu anda gönderilemedi. ';
        const wa = 'https://wa.me/905075188482?text=' + encodeURIComponent(isim + ' — ' + telefon + '\n' + mesaj + '\n' + window.IUFrontend.listingUrl(p, true));
        msgBox.appendChild(el('a', { href: wa, target: '_blank', rel: 'noopener noreferrer', text: 'WhatsApp ile gönderin →' }));
      } finally {
        btn.disabled = false;
      }
    });
    return form;
  }

  // ---------------- BENZER + DİĞER İLANLAR ----------------
  async function buildRelated(p) {
    const F = window.IUFrontend;
    const wrap = el('section', { class: 'ild-related' });
    const grid1 = el('div', { class: 'ild-grid' });
    const grid2 = el('div', { class: 'ild-grid' });
    try {
      const sim = await F.fetchProperties({ tip: p.tip, kategoriIn: p.kategori === 'arsa' || p.kategori === 'tarla' ? ['arsa', 'tarla'] : [p.kategori], limit: 7 });
      const similar = (sim.data || []).filter(x => x.id !== p.id).slice(0, 6);
      const seen = new Set([p.id].concat(similar.map(x => x.id)));
      const all = await F.fetchProperties({ limit: 24 });
      const others = (all.data || []).filter(x => !seen.has(x.id)).slice(0, 6);
      const cp = categoryPage(p);
      if (similar.length) {
        similar.forEach(x => grid1.appendChild(F.renderCard(x)));
        wrap.append(el('div', { class: 'ild-rel-head' }, [el('h2', { text: 'Benzer İlanlar' }), el('a', { href: cp.href }, ['Tüm ' + cp.label + ' ilanları ', icon('fa-solid fa-arrow-right')])]), grid1);
      }
      if (others.length) {
        others.forEach(x => grid2.appendChild(F.renderCard(x)));
        wrap.append(el('div', { class: 'ild-rel-head' }, [el('h2', { text: similar.length ? 'Diğer İlanlarımız' : 'Diğer İlanlar' })]), grid2);
      }
    } catch (e) { console.warn('[İlan] Benzer ilanlar yüklenemedi', e); }
    return wrap.children.length ? wrap : null;
  }

  // ---------------- BULUNAMADI ----------------
  async function renderNotFound() {
    setMeta('name', 'robots', 'noindex, follow');
    document.title = 'İlan bulunamadı — TURYAP İsmail Ünsal';
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'ild-notfound' }, [
      el('div', { class: 'ild-nf-icon', html: '<i class="fa-solid fa-house-circle-xmark" aria-hidden="true"></i>' }),
      el('h1', { text: 'Bu ilan artık yayında değil' }),
      el('p', { text: 'İlan satılmış, kiralanmış ya da kaldırılmış olabilir. Güncel ilanlarımıza göz atın veya bize ulaşın — size uygun seçenekleri birlikte bulalım.' }),
      el('div', { class: 'ild-actions inline' }, [
        el('a', { class: 'ild-btn call', href: 'tel:' + PHONE_MAIN }, [icon('fa-solid fa-phone'), ' Hemen Ara']),
        el('a', { class: 'ild-btn wa', href: 'https://wa.me/905075188482', target: '_blank', rel: 'noopener noreferrer' }, [icon('fa-brands fa-whatsapp'), ' WhatsApp'])
      ])
    ]));
    if (window.IUFrontend) {
      const rel = await buildRelated({ id: null, tip: 'satilik', kategori: 'daire' });
      if (rel) root.appendChild(rel);
    }
  }

  // ---------------- ANA AKIŞ ----------------
  async function main() {
    const key = readKey();
    const ready = await waitFrontend(15000);
    if (!key) return renderNotFound();
    if (!ready) {
      root.querySelector('.ild-loading') && (root.querySelector('.ild-loading').textContent = 'İlan yüklenemedi. Lütfen sayfayı yenileyin.');
      return;
    }
    const F = window.IUFrontend;
    const sb = F.client();
    let p = null;
    try {
      let q = sb.from('properties').select('*, property_images(url, ana_foto, sira)').eq('durum', 'aktif');
      q = key.slug ? q.eq('slug', key.slug) : q.eq('id', key.id);
      const { data, error } = await q.limit(1);
      if (error) throw error;
      p = data && data[0];
    } catch (e) {
      console.error('[İlan] Yükleme hatası:', e);
      root.innerHTML = '';
      root.appendChild(el('p', { class: 'ild-error', text: 'İlan yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.' }));
      return;
    }
    if (!p) return renderNotFound();

    // Fotoğraflar: ana foto önce, sonra sıra
    let images = (p.property_images || []).filter(i => i && i.url && /^https:\/\//i.test(i.url))
      .sort((a, b) => (b.ana_foto === true) - (a.ana_foto === true) || (a.sira || 0) - (b.sira || 0))
      .map(i => i.url);
    if (!images.length) images = [F.getMainImage(p)];

    applySEO(p, images);

    const cp = categoryPage(p);
    const crumbs = el('nav', { class: 'ild-crumbs', 'aria-label': 'Sayfa yolu' }, [
      el('a', { href: lp('/'), text: 'Ana Sayfa' }), icon('fa-solid fa-chevron-right'),
      el('a', { href: cp.href, text: cp.label }), icon('fa-solid fa-chevron-right'),
      el('span', { text: title(p) })
    ]);

    const desc = el('div', { class: 'ild-desc', text: p.aciklama_tr || 'Bu ilan için henüz açıklama eklenmemiş. Detaylı bilgi için danışmanımızı arayabilirsiniz.' });
    const feats = buildFeatures(p);

    const left = el('div', { class: 'ild-left' }, [
      buildGallery(p, images),
      el('div', { class: 'ild-summary-mobile' }),                   // mobilde özet burada
      section('ilan-ozellikleri', 'İlan Bilgileri', buildFacts(p)),
      feats ? section('ilan-olanaklar', 'Özellikler', feats) : null,
      section('ilan-aciklama', 'Açıklama', desc),
      section('ilan-konum', 'Konum', buildMap(p))
    ]);
    const summary = buildSummary(p);
    const right = el('aside', { class: 'ild-right' }, [summary, buildAgents(p), buildLeadForm(p)]);

    root.innerHTML = '';
    root.append(crumbs, el('div', { class: 'ild-layout' }, [left, right]));

    // Mobil: özet kartı galerinin hemen altına taşı (tek DOM, iki konum)
    const mq = window.matchMedia('(max-width: 968px)');
    const slot = left.querySelector('.ild-summary-mobile');
    const place = () => { if (mq.matches) slot.appendChild(summary); else right.insertBefore(summary, right.firstChild); };
    place();
    (mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place));

    // Mobil sabit alt bar: Ara / WhatsApp
    const bar = el('div', { class: 'ild-sticky' }, [
      el('div', { class: 'ild-sticky-price', text: F.formatPrice(p.fiyat, p.para_birimi) }),
      el('a', { class: 'ild-btn call', href: 'tel:' + PHONE_MAIN, 'aria-label': 'Hemen ara' }, [icon('fa-solid fa-phone'), ' Ara']),
      el('a', { class: 'ild-btn wa', href: F.waLink(p), target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'WhatsApp' }, [icon('fa-brands fa-whatsapp'), ' WhatsApp'])
    ]);
    document.body.appendChild(bar);
    document.body.classList.add('ild-has-sticky');

    const rel = await buildRelated(p);
    if (rel) root.appendChild(rel);
  }

  main();
})();
