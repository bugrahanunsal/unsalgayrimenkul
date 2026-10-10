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
 * Kullanım:  IlanKategori.bagla(form, { otomatik: true })   // yeni ilan sayfası
 *            await IlanKategori.kontrol(form)                // submit içinde, FormData'dan ÖNCE
 */
(function () {
  'use strict';

  const ETIKET = { daire: 'Daire', villa: 'Villa', arsa: 'Arsa', mustakil_ev: 'Müstakil Ev', isyeri: 'İşyeri',
    yazlik: 'Yazlık', tarla: 'Tarla', bina: 'Bina' };
  const TIP_ETIKET = { satilik: 'Satılık', kiralik: 'Kiralık' };
  // Sitede aynı sayfalarda listelenen kategoriler birbirinin yerine geçebilir (uyarı gerekmez)
  const GRUP = { arsa: 'arazi', tarla: 'arazi', villa: 'ev', mustakil_ev: 'ev', daire: 'daire', yazlik: 'daire', isyeri: 'isyeri', bina: 'bina' };

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
      const ok = await sor('Başlıkta “' + t.kelime + '” yazıyor ama Kategori “' + eski + '” seçili. Bu ilan sitede ' + eski +
        ' sayfasında görünür, ' + yeni + ' sayfasında görünmez.\n\nKategori “' + yeni + '” olarak düzeltilsin mi?\n\n' +
        'Tamam: ' + yeni + ' olarak kaydet\nİptal: ' + eski + ' olarak bırak');
      if (ok) f.kat.value = t.kategori;
    }
    if (t.tip && f.tip && f.tip.value && t.tip !== f.tip.value) {
      const yeni = TIP_ETIKET[t.tip], eski = TIP_ETIKET[f.tip.value] || f.tip.value;
      const ok = await sor('Başlıkta “' + yeni.toLocaleLowerCase('tr-TR') + '” yazıyor ama İlan Tipi “' + eski + '” seçili.\n\n' +
        'İlan Tipi “' + yeni + '” olarak düzeltilsin mi?\n\nTamam: ' + yeni + ' olarak kaydet\nİptal: ' + eski + ' olarak bırak');
      if (ok) f.tip.value = t.tip;
    }
  }

  const css = document.createElement('style');
  css.textContent = '.kat-ipucu{margin-top:6px;min-height:0;font-size:12.5px;line-height:1.35;color:#1D4ED8}.kat-ipucu:empty{display:none}';
  document.head.appendChild(css);

  window.IlanKategori = { tahmin, bagla, kontrol, ETIKET, TIP_ETIKET };
})();
