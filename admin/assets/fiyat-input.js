/* Fiyat alanları — yazarken binlik ayraçlı gösterim (2.500.000) ve altında okunuşu (≈ 2,5 milyon TL).
 *
 * Kullanım:  <input type="text" inputmode="numeric" name="fiyat" data-fiyat ...>
 *   - Alan sayfa açılınca kendiliğinden hazırlanır (data-fiyat olan tüm alanlar).
 *   - Kaydederken:      FiyatInput.parse(form.fiyat.value)  → sayı (2500000)   ("2.500.000" → 2500000)
 *   - Veritabanından:   FiyatInput.set(input, 2500000)      → "2.500.000"
 * Ondalık gerekiyorsa virgül: 3.500.000,50 (en çok 2 hane). Türkçe yazım: nokta binlik, virgül ondalık ayıracıdır.
 * Okunuş satırı aynı formdaki "para_birimi" seçimine göre TL / USD / EUR yazar; 1 milyar ve üstü vurgulanır
 * (milyon yerine yanlışlıkla milyar yazılmasın diye).
 */
(function () {
  'use strict';
  const NF = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

  /** "2.500.000" / "2.500.000,5" / "2500000" → sayı; boş veya geçersizse NaN */
  function parse(v) {
    const s = String(v == null ? '' : v).replace(/\s/g, '');
    if (!s || !/^[\d.,]+$/.test(s)) return NaN;
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }

  const group = (digits) => digits.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  /** yazılan metni biçimle: yalnızca rakam ve tek virgül; binlikler noktayla */
  function format(raw) {
    const s = String(raw == null ? '' : raw).replace(/[^\d,]/g, '');
    const i = s.indexOf(',');
    const whole = (i >= 0 ? s.slice(0, i) : s).slice(0, 15);
    const dec = i >= 0 ? s.slice(i + 1).replace(/,/g, '').slice(0, 2) : null;
    let out = group(whole);
    if (dec !== null) out = (out || '0') + ',' + dec;
    return out;
  }

  /** Yabancı sitelerden yapıştırılan İngilizce yazım ($2,500,000.50) → Türkçe yazım (2500000,50); değilse null */
  function fromForeign(v) {
    const s = String(v == null ? '' : v).replace(/[^\d.,]/g, '');
    const m = /^(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/.exec(s);
    return m ? m[1].replace(/,/g, '') + (m[2] ? ',' + m[2] : '') : null;
  }

  /** veritabanındaki sayı → alan metni */
  function fromNumber(n) {
    if (n === null || n === undefined || n === '') return '';
    const x = Number(n);
    if (!Number.isFinite(x)) return '';
    const parts = Math.abs(x).toFixed(2).split('.');
    const dec = parts[1].replace(/0+$/, '');
    return group(parts[0]) + (dec ? ',' + dec : '');
  }

  function words(n, cur) {
    if (!(n > 0)) return '';
    const u = cur || 'TL';
    if (n >= 1e12) return NF.format(n / 1e12) + ' trilyon ' + u;
    if (n >= 1e9) return NF.format(n / 1e9) + ' milyar ' + u;
    if (n >= 1e6) return NF.format(n / 1e6) + ' milyon ' + u;
    if (n >= 1e3) return NF.format(n / 1e3) + ' bin ' + u;
    return NF.format(n) + ' ' + u;
  }

  function currencyOf(el) {
    const sel = el.form && el.form.elements ? el.form.elements['para_birimi'] : null;
    return sel && sel.value ? String(sel.value) : 'TL';
  }

  function hintEl(el) {
    let h = el._fiyatHint;
    if (!h) {
      h = document.createElement('div');
      h.className = 'fiyat-hint';
      h.setAttribute('aria-live', 'polite');
      if (!el.id) el.id = 'fiyat-' + Math.random().toString(36).slice(2, 8);
      h.id = el.id + '-okunus';
      el.setAttribute('aria-describedby', ((el.getAttribute('aria-describedby') || '') + ' ' + h.id).trim());
      el.insertAdjacentElement('afterend', h);
      el._fiyatHint = h;
    }
    return h;
  }

  function hint(el) {
    if (el.getAttribute('data-fiyat-hint') === 'off') return;      // ör. filtrelerde okunuş satırı yok
    const h = hintEl(el);
    const n = parse(el.value);
    const w = Number.isFinite(n) && n > 0 ? words(n, currencyOf(el)) : '';
    h.textContent = w ? '≈ ' + w : '';
    h.classList.toggle('dikkat', Number.isFinite(n) && n >= 1e9);
  }

  function onInput(e) {
    const el = e.target;
    const pasted = e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop';
    const foreign = pasted ? fromForeign(el.value) : null;
    if (foreign !== null) {                       // "2,500,000" yapıştırıldı → 2.500.000 (2,50 olmasın)
      el.value = format(foreign);
      try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) { /* bazı tarayıcılar */ }
      hint(el);
      return;
    }
    const pos = el.selectionStart == null ? el.value.length : el.selectionStart;
    const before = el.value.slice(0, pos).replace(/[^\d,]/g, '').length;   // imleçten önceki rakam sayısı
    const out = format(el.value);
    if (out !== el.value) {
      el.value = out;
      let seen = 0, p = 0;
      while (p < out.length && seen < before) { if (/[\d,]/.test(out[p])) seen++; p++; }
      try { el.setSelectionRange(p, p); } catch (_) { /* bazı tarayıcılar */ }
    }
    hint(el);
  }

  function attach(el) {
    if (!el || el._fiyatReady) return;
    el._fiyatReady = true;
    el.type = 'text';
    el.setAttribute('inputmode', 'decimal');
    el.setAttribute('autocomplete', 'off');
    el.setAttribute('maxlength', '24');
    el.removeAttribute('step');
    el.removeAttribute('min');
    if (el.value) el.value = /,/.test(el.value) || /\.\d{3}/.test(el.value) ? format(el.value) : fromNumber(el.value);
    el.addEventListener('input', onInput);
    el.addEventListener('blur', () => { if (/,$/.test(el.value)) el.value = el.value.slice(0, -1); hint(el); });
    const sel = el.form && el.form.elements ? el.form.elements['para_birimi'] : null;
    if (sel && sel.addEventListener) sel.addEventListener('change', () => hint(el));
    hint(el);
  }

  function set(el, n) {
    if (!el) return;
    attach(el);
    el.value = fromNumber(n);
    hint(el);
  }

  function init() { document.querySelectorAll('input[data-fiyat]').forEach(attach); }

  const css = document.createElement('style');
  css.textContent = '.fiyat-hint{margin-top:6px;min-height:16px;font-size:12.5px;line-height:1.3;color:#64748B}' +
    '.fiyat-hint.dikkat{color:#B45309;font-weight:700}';
  document.head.appendChild(css);

  window.FiyatInput = { parse, format, fromForeign, fromNumber, words, attach, set, init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
