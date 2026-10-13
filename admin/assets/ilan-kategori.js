/* İlan kategorisi ve tipi — yanlış kategoride kaydı önler.
 *
 * Neden: Kategori listesi "Daire" ile başladığı için değiştirilmeyen arsa ilanı "Daire" olarak
 * kaydediliyor, sitede Arsa sayfasında görünmüyordu.
 *
 *  - Yeni ilanda başlık yazılırken kategori ve tip başlıktan seçilir ("… arsa satılık" → Arsa / Satılık),
 *    kişi listeden kendisi seçtiyse ona dokunulmaz.
 *  - Kaydetmeden önce (yeni ve düzenle): başlık başka bir kategori söylüyorsa sorar
 *    ("Başlıkta 'arsa' yazıyor ama Kategori 'Daire'…  Arsa olarak düzeltilsin mi?").
 *
 *  - "Sitede görüneceği yer": tip / kategori / ilçe / eşyalı seçildikçe ilanın sitede hangi bölümde
 *    (ana sayfa kartı + kategori sayfası) görüneceğini yazar. Kural sitedekiyle aynıdır
 *    (frontend-supabase.js ve yalova-*.html): Villa → Villa bölümleri, Müstakil Ev → Ev bölümleri.
 *
 * Kullanım:  IlanKategori.bagla(form, { otomatik: true })   // yeni ilan sayfası
 *            IlanKategori.yerBagla(form)                     // form doldurulduktan sonra (yeni + düzenle)
 *            await IlanKategori.kontrol(form)                // submit içinde, FormData'dan ÖNCE
 */
(function () {
  'use strict';

  const ETIKET = { daire: 'Daire', villa: 'Villa', arsa: 'Arsa', mustakil_ev: 'Müstakil Ev', isyeri: 'İşyeri',
    yazlik: 'Yazlık', tarla: 'Tarla', bina: 'Bina' };
  const TIP_ETIKET = { satilik: 'Satılık', kiralik: 'Kiralık' };
  // Sitede aynı sayfalarda listelenen kategoriler birbirinin yerine geçebilir (uyarı gerekmez).
  // Villa ile Müstakil Ev artık ayrı bölümlerde: Satılık/Kiralık Villa ↔ Satılık/Kiralık Ev.
  const GRUP = { arsa: 'arazi', tarla: 'arazi', villa: 'villa', mustakil_ev: 'ev', daire: 'daire', yazlik: 'daire', isyeri: 'isyeri', bina: 'bina' };

  // Sitedeki bölümler (ana sayfa kartı + kategori sayfası)
  const BOLUM = {
    'satilik:daire': 'Yalova Satılık Daire', 'satilik:villa': 'Yalova Satılık Villa', 'satilik:mustakil_ev': 'Yalova Satılık Ev',
    'satilik:arsa': 'Yalova Satılık Arsa', 'satilik:tarla': 'Yalova Satılık Arsa', 'satilik:isyeri': 'Yalova Satılık İşyeri',
    'kiralik:daire': 'Yalova Kiralık Daire', 'kiralik:villa': 'Yalova Kiralık Villa', 'kiralik:mustakil_ev': 'Yalova Kiralık Ev',
    'kiralik:arsa': 'Yalova Kiralık Arsa', 'kiralik:tarla': 'Yalova Kiralık Arsa'
  };
  // Sayfası olan ama ana sayfada ve menüde bağlantısı olmayan bölümler
  const MENUDE_YOK = new Set(['satilik:mustakil_ev', 'kiralik:mustakil_ev']);
  /** tip + kategori (+ ilçe, eşyalı) → sitede listelendiği bölümler */
  function bolumler(tip, kategori, ilce, esyali) {
    const ana = BOLUM[tip + ':' + kategori];
    const list = ana ? [ana] : [];
    if (tip === 'kiralik' && kategori === 'daire') {
      if (ilce === 'Merkez') list.push('Yalova Merkez Kiralık Daire');
      if (esyali) list.push('Yalova Eşyalı Kiralık Daire');
    }
    return list;
  }

  // Başlıktaki kelime → kategori (sıra önemli: "villa imarlı arsa" bir arsadır)
  const KURALLAR = [
    [/(^|[^a-z])arsa/, 'arsa', 'arsa'],
    [/(^|[^a-z])tarla/, 'tarla', 'tarla'],
    [/(^|[^a-z])komple bina/, 'bina', 'komple bina'],
    [/(^|[^a-z])(is ?yeri|dukkan|ofis|magaza)/, 'isyeri', null],
    [/(^|[^a-z])villa/, 'villa', 'villa'],
    [/(^|[^a-z])mustakil/, 'mustakil_ev', 'müstakil'],
    [/(^|[^a-z])yazlik/, 'yazlik', 'yazlık'],
    [/(^|[^a-z])daire/, 'daire', 'daire'],
    [/(^|[^0-9])\d\s*\+\s*\d([^0-9]|$)/, 'daire', null]
  ];

  // Türkçe harfler ve büyük/küçük harf farkı karşılaştırmayı bozmasın
  function sade(s) {
    return String(s || '').toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u')
      .replace(/\s+/g, ' ');
  }

  /** başlık → { kategori, kelime, tip } (bulunamayan alan null) */
  function tahmin(baslik) {
    const s = sade(baslik);
    let kategori = null, kelime = null;
    for (const [re, k, w] of KURALLAR) {
      const m = re.exec(s);
      if (m) { kategori = k; kelime = w || m[0].replace(/^[^a-z0-9]+/, ''); break; }
    }
    const kir = /(^|[^a-z])kiralik/.test(s), sat = /(^|[^a-z])satilik/.test(s);
    const tip = kir && !sat ? 'kiralik' : sat && !kir ? 'satilik' : null;
    return { kategori, kelime, tip };
  }

  function alanlar(form) {
    return { baslik: form.elements['baslik_tr'], kat: form.elements['kategori'], tip: form.elements['tip'] };
  }

  function ipucu(sel) {
    let h = sel._katIpucu;
    if (!h) {
      h = document.createElement('div');
      h.className = 'kat-ipucu';
      h.setAttribute('aria-live', 'polite');
      sel.insertAdjacentElement('afterend', h);
      sel._katIpucu = h;
    }
    return h;
  }

  /** Yeni ilan: başlık yazıldıkça kategori / tip seç (kişi listeden seçtiyse dokunma) */
  function bagla(form, opts) {
    const f = alanlar(form);
    if (!f.baslik || !f.kat) return;
    [f.kat, f.tip].forEach((sel) => {
      if (!sel) return;
      // Bu dosya seçimi .value ile yapar (olay tetiklenmez); "change" geldiyse seçimi kişi yapmıştır
      sel.addEventListener('change', () => { sel.dataset.elle = '1'; ipucu(sel).textContent = ''; });
    });
    if (!(opts && opts.otomatik)) return;
    const uygula = () => {
      const t = tahmin(f.baslik.value);
      if (t.kategori && f.kat.dataset.elle !== '1' && f.kat.value !== t.kategori) {
        f.kat.value = t.kategori;
        ipucu(f.kat).textContent = 'Başlıktaki “' + t.kelime + '” kelimesine göre seçildi.';
      } else if (!t.kategori && f.kat.dataset.elle !== '1' && f.kat._katIpucu && f.kat._katIpucu.textContent) {
        f.kat.value = '';
        ipucu(f.kat).textContent = '';
      }
      if (t.tip && f.tip && f.tip.dataset.elle !== '1' && f.tip.value !== t.tip) {
        f.tip.value = t.tip;
        ipucu(f.tip).textContent = 'Başlığa göre seçildi.';
      }
      yerGuncelle(form);
    };
    f.baslik.addEventListener('input', uygula);
    f.baslik.addEventListener('change', uygula);
    uygula();
  }

  /** Kaydetmeden önce: başlık ile kategori / tip çelişiyorsa sor. Her durumda kayda devam edilir. */
  async function kontrol(form) {
    const f = alanlar(form);
    if (!f.baslik || !f.kat) return;
    const t = tahmin(f.baslik.value);
    const sor = (m) => (window.App && App.confirm ? App.confirm(m, 'Kategori kontrolü') : Promise.resolve(window.confirm(m)));
    if (t.kategori && f.kat.value && GRUP[t.kategori] !== GRUP[f.kat.value]) {
      const yeni = ETIKET[t.kategori], eski = ETIKET[f.kat.value] || f.kat.value;
      const tip = f.tip ? f.tip.value : '';
      const yerEski = BOLUM[tip + ':' + f.kat.value], yerYeni = BOLUM[tip + ':' + t.kategori];
      const neden = yerEski && yerYeni
        ? 'Bu ilan sitede “' + yerEski + '” bölümünde görünür, “' + yerYeni + '” bölümünde görünmez.'
        : 'Bu ilan sitede ' + eski + ' sayfasında görünür, ' + yeni + ' sayfasında görünmez.';
      const ok = await sor('Başlıkta “' + t.kelime + '” yazıyor ama Kategori “' + eski + '” seçili. ' + neden +
        '\n\nKategori “' + yeni + '” olarak düzeltilsin mi?\n\n' +
        'Tamam: ' + yeni + ' olarak kaydet\nİptal: ' + eski + ' olarak bırak');
      if (ok) { f.kat.value = t.kategori; yerGuncelle(form); }
    }
    if (t.tip && f.tip && f.tip.value && t.tip !== f.tip.value) {
      const yeni = TIP_ETIKET[t.tip], eski = TIP_ETIKET[f.tip.value] || f.tip.value;
      const ok = await sor('Başlıkta “' + yeni.toLocaleLowerCase('tr-TR') + '” yazıyor ama İlan Tipi “' + eski + '” seçili.\n\n' +
        'İlan Tipi “' + yeni + '” olarak düzeltilsin mi?\n\nTamam: ' + yeni + ' olarak kaydet\nİptal: ' + eski + ' olarak bırak');
      if (ok) { f.tip.value = t.tip; yerGuncelle(form); }
    }
  }

  // ---------- "Sitede görüneceği yer" ----------
  function yerKutusu(form) {
    if (form._ilanYer) return form._ilanYer;
    const kat = form.elements['kategori'];
    if (!kat) return null;
    const box = document.createElement('p');
    box.className = 'ilan-yer';
    box.setAttribute('aria-live', 'polite');
    const row = kat.closest('.form-row') || kat;
    row.insertAdjacentElement('afterend', box);
    form._ilanYer = box;
    return box;
  }

  /** Seçimlere göre ilanın sitedeki yerini yazar (yalnızca textContent) */
  function yerGuncelle(form) {
    const box = form && form._ilanYer;
    if (!box) return;
    const el = form.elements;
    const tip = el['tip'] ? el['tip'].value : '', kat = el['kategori'] ? el['kategori'].value : '';
    const ilce = el['ilce'] ? el['ilce'].value : '';
    const cb = form.querySelector('[name="esyali"], [data-ozellik="esyali"]');
    const durum = el['durum'] ? el['durum'].value : 'aktif';
    if (!tip || !kat) { box.textContent = ''; return; }
    const list = bolumler(tip, kat, ilce, !!(cb && cb.checked));
    let txt = list.length
      ? 'Sitede görüneceği yer: ' + list.join(', ') + (list.length > 1 ? ' bölümleri.' : ' bölümü.')
      : 'Bu tip ve kategori için sitede ayrı bir bölüm yok; ilan kendi sayfasında yayınlanır.';
    if (MENUDE_YOK.has(tip + ':' + kat)) txt += ' Bu sayfanın ana sayfada ve menüde bağlantısı yok.';
    if (durum && durum !== 'aktif') txt = 'Durum “Aktif” olunca sitede görünür. ' + txt;
    box.textContent = txt;
  }

  /** Kutuyu ekler, alanlar değiştikçe günceller. Form doldurulduktan sonra çağırın. */
  function yerBagla(form) {
    if (!form || !yerKutusu(form)) return;
    if (!form._ilanYerBagli) {
      form._ilanYerBagli = true;
      const tazele = (e) => { const n = e.target && (e.target.name || (e.target.dataset && e.target.dataset.ozellik));
        if (['tip', 'kategori', 'ilce', 'esyali', 'durum'].includes(n)) yerGuncelle(form); };
      form.addEventListener('change', tazele);
      form.addEventListener('input', tazele);
    }
    yerGuncelle(form);
  }

  const css = document.createElement('style');
  css.textContent = '.kat-ipucu{margin-top:6px;min-height:0;font-size:12.5px;line-height:1.35;color:#1D4ED8}.kat-ipucu:empty{display:none}' +
    '.ilan-yer{margin:4px 0 0;padding:9px 12px;border:1px solid #BFDBFE;border-radius:8px;background:#EFF6FF;color:#1E3A8A;font-size:13px;line-height:1.45}' +
    '.ilan-yer:empty{display:none}';
  document.head.appendChild(css);

  window.IlanKategori = { tahmin, bagla, kontrol, yerBagla, yerGuncelle, bolumler, ETIKET, TIP_ETIKET };
})();
