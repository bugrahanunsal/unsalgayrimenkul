/**
 * RichEditor — panel için basit, güvenli görsel metin editörü (Word benzeri).
 * Kullanım: const ed = RichEditor.create(containerEl, { html, uploadImage: async(file)=>url, compact })
 *           ed.getHTML()  → IUSafe ile temizlenmiş HTML
 *           ed.setHTML(h)
 * Güvenlik: yapıştırılan ve kaydedilen içerik IUSafe.sanitize beyaz listesinden geçer.
 */
(function () {
  'use strict';
  const CSS = `
  .re-wrap{border:1.5px solid #E2E8F0;border-radius:10px;background:#fff;overflow:hidden}
  .re-bar{display:flex;flex-wrap:wrap;gap:4px;padding:8px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;position:sticky;top:0;z-index:2}
  .re-bar button{border:1px solid transparent;background:transparent;border-radius:6px;padding:6px 9px;font-size:13px;font-weight:600;color:#1E293B;cursor:pointer;line-height:1}
  .re-bar button:hover{background:#E2E8F0}
  .re-bar .sep{width:1px;background:#E2E8F0;margin:2px 4px}
  .re-area{min-height:320px;max-height:60vh;overflow:auto;padding:18px 20px;outline:none;font-size:15px;line-height:1.7;color:#1F2937}
  .re-area.compact{min-height:110px}
  .re-area:empty:before{content:attr(data-placeholder);color:#94A3B8}
  .re-area h2{font-size:22px;margin:18px 0 8px;color:#0A2A5E}
  .re-area h3{font-size:18px;margin:14px 0 6px;color:#0A2A5E}
  .re-area p{margin:0 0 10px}
  .re-area blockquote{border-left:4px solid #2563EB;margin:12px 0;padding:8px 14px;background:#F8FAFC;color:#334155}
  .re-area .info-box{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:12px 16px;margin:12px 0}
  .re-area img{max-width:100%;border-radius:8px}
  .re-area table{border-collapse:collapse;width:100%;margin:10px 0}.re-area td,.re-area th{border:1px solid #E2E8F0;padding:6px 8px}
  .re-area a{color:#2563EB}
  .re-area .highlight,.re-area .accent{color:#2563EB;font-style:italic;font-weight:700}`;
  let styled = false;

  function btn(label, title, fn) {
    const b = document.createElement('button'); b.type = 'button'; b.innerHTML = label; b.title = title;
    b.addEventListener('mousedown', e => e.preventDefault());   // seçimi kaybetme
    b.addEventListener('click', fn); return b;
  }

  function create(container, opts = {}) {
    if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
    const wrap = document.createElement('div'); wrap.className = 're-wrap';
    const bar = document.createElement('div'); bar.className = 're-bar';
    const area = document.createElement('div'); area.className = 're-area' + (opts.compact ? ' compact' : '');
    area.contentEditable = 'true'; area.setAttribute('data-placeholder', opts.placeholder || 'Yazmaya başlayın…');
    wrap.append(bar, area); container.appendChild(wrap);
    const exec = (c, v) => { area.focus(); document.execCommand(c, false, v); };
    const block = (tag) => exec('formatBlock', tag);

    const tools = opts.compact
      ? [['<b>B</b>', 'Kalın', () => exec('bold')], ['<span style="color:#2563EB;font-style:italic;font-weight:800">Vurgu</span>', 'Seçili kelimeyi mavi vurgulu yap (başlıklarda)', highlight], ['<i>I</i>', 'İtalik', () => exec('italic')], ['• Liste', 'Madde listesi', () => exec('insertUnorderedList')], ['<i class="ic ic-link" aria-hidden="true"></i>', 'Link', addLink], ['<i class="ic ic-eraser" aria-hidden="true"></i>', 'Biçimi temizle', () => exec('removeFormat')]]
      : [['Başlık', 'Büyük başlık (H2)', () => block('H2')], ['Alt başlık', 'Alt başlık (H3)', () => block('H3')], ['¶ Paragraf', 'Normal paragraf', () => block('P')], 'sep',
         ['<b>B</b>', 'Kalın', () => exec('bold')], ['<i>I</i>', 'İtalik', () => exec('italic')], ['<u>U</u>', 'Altı çizili', () => exec('underline')], 'sep',
         ['• Liste', 'Madde listesi', () => exec('insertUnorderedList')], ['1. Liste', 'Numaralı liste', () => exec('insertOrderedList')], ['<i class="ic ic-quote" aria-hidden="true"></i> Alıntı', 'Alıntı', () => block('BLOCKQUOTE')], 'sep',
         ['<i class="ic ic-link" aria-hidden="true"></i> Link', 'Link ekle', addLink], ['<i class="ic ic-image" aria-hidden="true"></i> Görsel', 'Görsel yükle', addImage], ['<i class="ic ic-info" aria-hidden="true"></i> Bilgi kutusu', 'Vurgulu bilgi kutusu', addInfo], 'sep',
         ['<i class="ic ic-eraser" aria-hidden="true"></i> Temizle', 'Seçili metnin biçimini temizle', () => exec('removeFormat')]];
    tools.forEach(t => {
      if (t === 'sep') { const s = document.createElement('span'); s.className = 'sep'; bar.appendChild(s); return; }
      bar.appendChild(btn(t[0], t[1], t[2]));
    });

    function addLink() {
      const u = prompt('Link adresi (https://... veya /sayfa):', 'https://');
      if (!u) return;
      const safe = window.IUSafe.safeUrl(u);
      if (!safe) { alert('Geçersiz link. https:// ile başlamalı veya site içi bir yol olmalı.'); return; }
      exec('createLink', safe);
    }
    function addImage() {
      if (!opts.uploadImage) { const u = prompt('Görsel adresi (https://...)'); if (u && window.IUSafe.safeUrl(u, true)) exec('insertHTML', `<img src="${u.replace(/"/g, '')}" alt="">`); return; }
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        if (f.size > 5 * 1024 * 1024) { alert('Görsel 5MB\'dan küçük olmalı'); return; }
        try { const url = await opts.uploadImage(f); if (url) { area.focus(); exec('insertHTML', `<img src="${String(url).replace(/"/g, '')}" alt="">`); } }
        catch (e) { alert('Yükleme hatası: ' + e.message); }
      };
      inp.click();
    }
    function highlight() {
      const t = String(window.getSelection() || '');
      if (!t.trim()) { alert('Önce vurgulamak istediğiniz kelimeyi seçin.'); return; }
      const e = t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      exec('insertHTML', '<span class="highlight">' + e + '</span>');
    }
    function addInfo() { exec('insertHTML', '<div class="info-box"><p><strong>Önemli:</strong> Buraya vurgulamak istediğiniz bilgiyi yazın.</p></div><p><br></p>'); }

    // Yapıştırmada Word/Web kirini temizle
    area.addEventListener('paste', (e) => {
      const cd = e.clipboardData; if (!cd) return;
      e.preventDefault();
      const html = cd.getData('text/html'); const text = cd.getData('text/plain');
      if (html) exec('insertHTML', window.IUSafe.sanitize(html));
      else exec('insertText', text);
    });
    area.addEventListener('drop', e => e.preventDefault());

    const api = {
      el: area,
      getHTML: () => window.IUSafe.sanitize(area.innerHTML).replace(/^(<p><br><\/p>)+|(<p><br><\/p>)+$/g, ''),
      setHTML: (h) => { area.innerHTML = window.IUSafe.sanitize(h || ''); },
      getText: () => area.innerText.trim()
    };
    if (opts.html) api.setHTML(opts.html);
    return api;
  }
  window.RichEditor = { create };
})();
