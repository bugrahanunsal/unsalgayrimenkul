/**
 * Panel — Site İçeriği (görsel düzenleyici)
 * Sayfa önizlemesinde (veya sağdaki listede) seçilen yazı / fotoğraf düzenlenir, site_content tablosuna kaydedilir.
 * Kayıt anahtarı = orijinal içeriğin parmak izi (cms-content.js ile aynı algoritma).
 * Fotoğraflar: tıklayınca "Fotoğrafı değiştir" (bilgisayardan yükle / Görsel Deposu'ndan seç), dosya adı ve alt metin.
 * Güvenlik: veritabanı / kullanıcı verisi DOM'a yalnızca textContent / value ile yazılır; görsel adresleri doğrulanır.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const PAGES = [
    ['index', 'Ana Sayfa'], ['hakkimizda', 'Hakkımızda'], ['iletisim', 'İletişim'],
    ['yalova-satilik-daire', 'Satılık Daire'], ['yalova-satilik-ev', 'Satılık Ev'], ['yalova-satilik-arsa', 'Satılık Arsa'],
    ['yalova-kiralik-daire', 'Kiralık Daire'], ['yalova-kiralik-ev', 'Kiralık Ev'], ['yalova-kiralik-villa', 'Lüks / Kiralık Villa'],
    ['yalova-esyali-kiralik-daire', 'Eşyalı Kiralık'], ['yalova-merkez-kiralik-daire', 'Merkez Kiralık'],
    ['blog', 'Blog (liste sayfası)'], ['faq', 'Sıkça Sorulan Sorular'], ['724-destek', '7/24 Destek'],
    ['cok-dilli-hizmet', 'Çok Dilli Hizmet'], ['yerel-uzmanlik', 'Yerel Uzmanlık'], ['gizlilik-politikasi', 'Gizlilik Politikası']
  ];
  const TAG_LABEL = { H1: 'Ana başlık', H2: 'Başlık', H3: 'Alt başlık', H4: 'Küçük başlık', H5: 'Başlık', H6: 'Başlık', P: 'Paragraf', LI: 'Liste', A: 'Link/Buton', BUTTON: 'Buton', SPAN: 'Etiket', DIV: 'Kutu', TD: 'Tablo', TH: 'Tablo', BLOCKQUOTE: 'Alıntı', LABEL: 'Etiket', SMALL: 'Not', STRONG: 'Vurgu', EM: 'Vurgu', B: 'Vurgu', DD: 'Metin', DT: 'Metin', FIGCAPTION: 'Açıklama' };

  let page = 'index';
  let rows = new Map();          // 'sayfa|key' → row
  let found = null;              // iframe'deki tarama
  let sel = null;                // seçili öğe {type:'t'|'i', item}
  let editor = null;
  let kind = 'i';
  let altCol = true;             // site_content.foto_alt var mı (SQL çalıştırıldı mı)
  let busy = false;
  let savedImg = '';
  const rowKey = (scope, key) => (scope === 'genel' ? 'genel' : page) + '|' + key;
  const safeImg = (u) => /^https:\/\/[^\s"'<>()\\`]+$/i.test(String(u || '').trim()) ? String(u).trim() : '';
  const clean = (s) => String(s == null ? '' : s).replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim();
  const missingAlt = (e) => !!e && /foto_alt|column|42703|PGRST204/i.test(((e.message || '') + ' ' + (e.code || '')));
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const userErr = (msg) => Object.assign(new Error(msg), { user: true });

  async function loadRows() {
    let res = await supabaseClient.from('site_content').select('id,sayfa,bolum_key,icerik_tr,foto_url,foto_alt,aktif').in('sayfa', [page, 'genel']).limit(3000);
    if (res.error && missingAlt(res.error)) {
      altCol = false;
      res = await supabaseClient.from('site_content').select('id,sayfa,bolum_key,icerik_tr,foto_url,aktif').in('sayfa', [page, 'genel']).limit(3000);
    }
    if (res.error) { App.toast('İçerik okunamadı: ' + res.error.message, 'error'); return; }
    rows = new Map((res.data || []).map(r => [r.sayfa + '|' + r.bolum_key, r]));
    $('setupAlert').hidden = altCol;
  }

  function frameDoc() { try { return $('frame').contentDocument; } catch (_) { return null; } }

  function loadFrame() {
    found = null; sel = null; showEditor(null);
    const box = $('itemList'); box.textContent = ''; box.appendChild(el('div', 'sc-note', 'Önizleme yükleniyor…'));
    const path = page === 'index' ? '/' : '/' + page;
    $('prevUrl').textContent = path;
    $('frame').src = path + '?cms-edit=' + Date.now();
  }

  function onFrameLoad() {
    const w = $('frame').contentWindow, d = frameDoc();
    if (!w || !d) return;
    const t0 = Date.now();
    (function wait() {
      if (w.IUCmsContent && w.IUCmsContent.found) return setup(w, d);
      if (Date.now() - t0 > 8000) { const box = $('itemList'); box.textContent = ''; box.appendChild(el('div', 'sc-note', 'Bu sayfa düzenlenemiyor.')); return; }
      setTimeout(wait, 100);
    })();
  }

  function setup(w, d) {
    found = w.IUCmsContent.found;
    found.imgs.forEach(it => { try { it.abs = it.kind === 'img' ? new URL(it.src, d.baseURI).href : it.src; } catch (_) { it.abs = it.src; } });
    const st = d.createElement('style');
    st.textContent = `[data-cms-h],[data-cms-i]{cursor:pointer!important;transition:outline-color .15s}
      [data-cms-h]:hover,[data-cms-i]:hover{outline:2px dashed #2563EB!important;outline-offset:3px}
      .cms-changed{outline:2px solid rgba(37,99,235,.55)!important;outline-offset:2px;background-color:rgba(37,99,235,.06)!important}
      .cms-sel{outline:3px solid #2563EB!important;outline-offset:3px}`;
    d.head.appendChild(st);
    // Önizlemede tıklama = seçme (link/form çalışmasın)
    d.addEventListener('click', (e) => {
      const a = e.target.closest('a,button,[onclick]'); if (a) e.preventDefault();
      const t = e.target.closest('[data-cms-h],[data-cms-i]');
      if (!t) return;
      e.preventDefault(); e.stopPropagation();
      if (t.hasAttribute('data-cms-i') && (!t.hasAttribute('data-cms-h') || e.target.tagName === 'IMG')) {
        const it = found.imgs.find(i => i.el === t); if (it) select('i', it);
      } else {
        const it = found.texts.find(x => x.el === t); if (it) select('t', it);
      }
    }, true);
    d.addEventListener('submit', e => e.preventDefault(), true);
    markChanged(); renderList();
  }

  function markChanged() {
    if (!found) return;
    found.texts.forEach(t => t.el.classList.toggle('cms-changed', rows.has(rowKey(t.scope, t.key))));
    found.imgs.forEach(i => i.el.classList.toggle('cms-changed', rows.has(rowKey(i.scope, i.key))));
  }

  // ------------------------------------------------------------------ fotoğraf yardımcıları
  function photoLabel(it) {
    // Fotoğrafın ait olduğu kartın / bölümün başlığı (ör. "Yalova Satılık Daire")
    for (let e = it.el; e && e.tagName !== 'BODY'; e = e.parentElement) {
      const h = e.querySelector && e.querySelector('h1,h2,h3,h4');
      if (h && h.textContent.trim()) return h.textContent.replace(/\s+/g, ' ').trim();
    }
    return it.alt || 'Fotoğraf';
  }
  const rowOf = (it) => rows.get(rowKey(it.scope, it.key));
  function curSrc(it) { const r = rowOf(it); return (r && safeImg(r.foto_url)) || it.abs || it.src; }
  function curAlt(it) { const r = rowOf(it); return r && r.foto_alt != null ? r.foto_alt : (it.alt || ''); }
  function viewSrc(u) { const s = String(u || ''); return /^https?:\/\//i.test(s) || s.startsWith('/') ? s : ''; }
  /** Dosya adı → { base, ext, stored } (stored: Görsel Deposu'nda mı) */
  function fileOf(it) {
    const src = curSrc(it);
    const sto = Medya.parseUrl(src);
    if (sto) { const p = Medya.splitExt(Medya.baseName(sto.path)); return { base: p.base, ext: p.ext || '.jpg', stored: sto, src }; }
    let last = '';
    try { last = decodeURIComponent(new URL(src, location.origin).pathname.split('/').pop() || ''); } catch (_) { last = ''; }
    const p = Medya.splitExt(last);
    return { base: Medya.slug(p.base, 60) || 'fotograf', ext: p.ext && /^\.(jpe?g|png|webp)$/i.test(p.ext) ? p.ext.toLowerCase() : '.jpg', stored: null, src };
  }
  function applyImg(it, url) {
    if (it.kind === 'img') { it.el.setAttribute('src', url); it.el.removeAttribute('srcset'); }
    else it.el.style.backgroundImage = 'url("' + String(url).replace(/["\\]/g, '') + '")';
  }

  // ------------------------------------------------------------------ liste
  function renderList() {
    const box = $('itemList'); box.textContent = '';
    if (!found) return;
    $('imgCount').textContent = String(found.imgs.length);
    $('txtCount').textContent = String(found.texts.length);
    const q = $('search').value.trim().toLocaleLowerCase('tr-TR');
    const only = $('onlyChanged').checked;
    let n = 0;
    if (kind === 'i') {
      const grid = el('div', 'sc-pgrid');
      found.imgs.forEach(it => {
        const changed = !!rowOf(it);
        if (only && !changed) return;
        const label = photoLabel(it);
        if (q && !label.toLocaleLowerCase('tr-TR').includes(q) && !fileOf(it).base.includes(q)) return;
        const card = el('div', 'sc-pcard' + (sel && sel.item === it ? ' sel' : ''));
        const th = el('button', 'sc-pthumb'); th.type = 'button'; th.setAttribute('aria-label', 'Fotoğrafı değiştir: ' + label);
        const img = el('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
        const v = viewSrc(curSrc(it)); if (v) img.src = v;
        const ov = el('span', 'sc-pov'); const ovs = el('span'); App.iconText(ovs, 'camera', 'Fotoğrafı değiştir'); ov.appendChild(ovs);
        const chg = el('span', 'sc-pchg'); chg.appendChild(App.icon('camera'));
        th.append(img, ov, chg);
        if (changed) th.appendChild(el('span', 'sc-pbadge', 'DEĞİŞTİ'));
        th.addEventListener('click', () => { select('i', it, true); changePhoto(); });
        const lb = el('button', 'sc-plabel'); lb.type = 'button'; lb.title = 'Dosya adı ve alt metin';
        lb.appendChild(el('span', null, label)); lb.appendChild(App.icon('edit'));
        lb.setAttribute('aria-label', label + ' — dosya adı ve alt metin');
        lb.addEventListener('click', () => select('i', it, true));
        card.append(th, lb);
        grid.appendChild(card); n++;
      });
      if (n) box.appendChild(grid);
    } else {
      found.texts.forEach(it => {
        const changed = rows.has(rowKey(it.scope, it.key));
        if (only && !changed) return;
        const label = (it.el.textContent || '').replace(/\s+/g, ' ').trim();
        if (q && !label.toLocaleLowerCase('tr-TR').includes(q)) return;
        const b = el('button', 'sc-item' + (changed ? ' ch' : '') + (sel && sel.item === it ? ' sel' : '')); b.type = 'button';
        const tg = el('span', 't', (TAG_LABEL[it.tag] || it.tag).toLocaleUpperCase('tr-TR'));
        const x = el('span', 'x', label || '(boş)');
        b.append(tg, x); b.addEventListener('click', () => select('t', it, true));
        box.appendChild(b); n++;
      });
    }
    if (!n) box.appendChild(el('div', 'sc-note', kind === 'i' ? (only ? 'Bu sayfada değiştirilmiş fotoğraf yok.' : (q ? 'Sonuç yok.' : 'Bu sayfada değiştirilebilir fotoğraf yok.')) : (only ? 'Bu sayfada henüz değişiklik yok.' : 'Sonuç yok.')));
  }

  function setKind(k) {
    kind = k;
    document.querySelectorAll('.sc-seg button').forEach(x => { const on = x.dataset.kind === k; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
    renderList();
  }

  /** Yalnızca önizlemeyi kaydırır (scrollIntoView panelin kendisini de kaydırıyordu) */
  function scrollFrameTo(node) {
    try {
      const w = $('frame').contentWindow; const r = node.getBoundingClientRect();
      w.scrollTo({ top: Math.max(0, w.scrollY + r.top - w.innerHeight / 2 + r.height / 2), behavior: 'smooth' });
    } catch (_) { /* önizleme hazır değil */ }
  }

  function select(type, item, scroll) {
    if (sel && sel.type === 'i' && sel.item !== item && imgDirty() && !window.confirm('Fotoğraf bilgilerinde kaydedilmemiş değişiklik var. Kaydetmeden geçilsin mi?')) return;
    const d = frameDoc();
    if (d) d.querySelectorAll('.cms-sel').forEach(x => x.classList.remove('cms-sel'));
    sel = { type, item };
    item.el.classList.add('cms-sel');
    if (scroll) scrollFrameTo(item.el);
    if ((type === 'i') !== (kind === 'i')) setKind(type === 'i' ? 'i' : 't');
    showEditor(sel); renderList();
    if (window.innerWidth <= 1100) $('editCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ------------------------------------------------------------------ düzenleyici
  const imgDraft = () => JSON.stringify({ n: Medya.slug($('eiName').value, 60), a: clean($('eiAlt').value) });
  const imgDirty = () => !!sel && sel.type === 'i' && imgDraft() !== savedImg;
  function updImgDirty() { $('eiDirty').hidden = !imgDirty(); $('eiAltCount').textContent = String($('eiAlt').value.length); }

  function showEditor(s) {
    $('editEmpty').hidden = !!s;
    $('editText').hidden = !(s && s.type === 't');
    $('editImg').hidden = !(s && s.type === 'i');
    if (!s) return;
    const it = s.item, r = rowOf(it);
    if (s.type === 't') {
      $('etTag').textContent = TAG_LABEL[it.tag] || it.tag;
      $('etScope').hidden = it.scope !== 'genel';
      const st = $('etState'); st.textContent = r ? 'Değiştirildi' : 'Orijinal'; st.className = 'sc-chip' + (r ? ' ch' : '');
      editor.setHTML(r && r.icerik_tr != null ? r.icerik_tr : it.html);
      $('etOrig').textContent = it.text;
      $('etRevert').disabled = !r;
      setTimeout(() => editor.el.focus(), 30);
      return;
    }
    $('eiScope').hidden = it.scope !== 'genel';
    $('eiLabel').textContent = photoLabel(it);
    const st = $('eiState'); st.textContent = r ? 'Değiştirildi' : 'Orijinal'; st.className = 'sc-chip' + (r ? ' ch' : '');
    const f = fileOf(it);
    const prev = $('eiPrev'); const v = viewSrc(f.src);
    prev.alt = it.kind === 'img' ? curAlt(it) : '';
    const info = $('eiInfo');
    const drawInfo = (w, h) => {
      info.textContent = [f.base + f.ext, w && h ? w + ' × ' + h + ' px' : '', f.stored ? 'Görsel Deposu' : 'Sitenin orijinal fotoğrafı'].filter(Boolean).join(' · ');
    };
    drawInfo(0, 0);
    prev.onload = () => { if (sel && sel.item === it) drawInfo(prev.naturalWidth, prev.naturalHeight); };
    if (v) prev.src = v; else prev.removeAttribute('src');
    const lib = $('eiLib');
    lib.hidden = !f.stored;
    if (f.stored) lib.href = '/admin/medya.html?dosya=' + encodeURIComponent(f.stored.bucket) + '/' + f.stored.path.split('/').map(encodeURIComponent).join('/');
    $('eiName').value = f.base; $('eiExt').textContent = f.ext;
    $('eiNameHelp').textContent = f.stored
      ? 'Kısa, tire ile ayrılmış, Türkçe karaktersiz (ör. yalova-satilik-daire). Değişince fotoğrafın adresi de değişir; sitede kullanıldığı her yer otomatik güncellenir.'
      : 'Bu, sitenin orijinal fotoğrafı. Dosya adını değiştirirseniz fotoğrafın bu adla bir kopyası Görsel Deposu\'na kaydedilir ve burada o kullanılır.';
    const alt = $('eiAlt');
    if (it.kind === 'img') {
      alt.disabled = false; alt.value = curAlt(it);
      $('eiAltHelp').textContent = altCol ? 'Fotoğrafta ne görünüyor? Görme engelliler ve Google için kısa açıklama (125 karaktere kadar ideal).' : 'Alt metni kaydetmek için önce veritabanı güncellemesini yapın (sayfanın üstündeki uyarı).';
    } else {
      alt.disabled = true; alt.value = '';
      $('eiAltHelp').textContent = 'Bu fotoğraf arka plan görseli: Google arka plan görsellerini okumaz, alt metin gerekmez.';
    }
    $('eiRevert').disabled = !r;
    savedImg = imgDraft(); updImgDirty();
  }

  // ------------------------------------------------------------------ kayıt
  async function upsert(scope, key, fields) {
    const sayfa = scope === 'genel' ? 'genel' : page;
    const existing = rows.get(sayfa + '|' + key);
    const run = (f) => existing
      ? supabaseClient.from('site_content').update(f).eq('id', existing.id).select().single()
      : supabaseClient.from('site_content').insert(Object.assign({ sira: 0, sayfa, bolum_key: key, aktif: true }, f)).select().single();
    let res = await run(fields);
    if (res.error && 'foto_alt' in fields && missingAlt(res.error)) {
      altCol = false; $('setupAlert').hidden = false;
      const f2 = Object.assign({}, fields); delete f2.foto_alt;
      if (!Object.keys(f2).length) throw userErr('Alt metni kaydetmek için önce veritabanı güncellemesini yapın.');
      res = await run(f2);
      App.toast('Fotoğraf kaydedildi; alt metin için veritabanı güncellemesi gerekli.', 'warning');
    }
    if (res.error) throw res.error;
    rows.set(sayfa + '|' + key, res.data);
  }
  async function removeRow(scope, key) {
    const sayfa = scope === 'genel' ? 'genel' : page;
    const r = rows.get(sayfa + '|' + key); if (!r) return;
    const { error } = await supabaseClient.from('site_content').delete().eq('id', r.id);
    if (error) throw error;
    rows.delete(sayfa + '|' + key);
  }
  /** Boş kalan fotoğraf kaydını sil (ne fotoğraf ne alt metin değişikliği kaldıysa) */
  async function tidy(it) {
    const r = rowOf(it);
    if (r && !safeImg(r.foto_url) && (r.foto_alt == null) && r.icerik_tr == null) await removeRow(it.scope, it.key);
  }

  async function saveText() {
    if (!sel || sel.type !== 't') return;
    const it = sel.item; const html = editor.getHTML();
    if (!editor.getText()) { App.toast('Metin boş olamaz. Kaldırmak yerine "Orijinale dön" kullanın.', 'warning'); return; }
    const btn = $('etSave'); btn.disabled = true;
    try {
      if (html === window.IUSafe.sanitize(it.html)) await removeRow(it.scope, it.key);
      else await upsert(it.scope, it.key, { icerik_tr: html });
      it.el.innerHTML = html; it.el.removeAttribute('data-i18n');
      App.toast('Kaydedildi — sitede görünüyor', 'success');
      markChanged(); showEditor(sel); renderList();
    } catch (e) { App.toast(e && e.user ? e.message : e.message, 'error'); }
    finally { btn.disabled = false; }
  }
  async function revertText() {
    if (!sel || sel.type !== 't') return;
    const it = sel.item;
    if (!(await App.confirm('Bu yazı orijinal haline dönsün mü?'))) return;
    try { await removeRow(it.scope, it.key); it.el.innerHTML = it.html; markChanged(); showEditor(sel); renderList(); App.toast('Orijinale döndü', 'success'); }
    catch (e) { App.toast(e.message, 'error'); }
  }

  /** "Fotoğrafı değiştir": bilgisayardan yükle veya Görsel Deposu'ndan seç → hemen kaydedilir */
  async function changePhoto() {
    if (!sel || sel.type !== 'i' || busy) return;
    const it = sel.item;
    const res = await Medya.picker({
      title: 'Fotoğrafı değiştir', name: Medya.slug(photoLabel(it), 60), alt: it.kind === 'img' ? curAlt(it) : '',
      altDisabled: it.kind !== 'img', folder: 'site', current: curSrc(it)
    });
    if (!res || !safeImg(res.url)) return;
    busy = true;
    try {
      const fields = { foto_url: res.url };
      if (it.kind === 'img' && altCol) fields.foto_alt = res.alt === (it.alt || '') ? null : res.alt;
      await upsert(it.scope, it.key, fields);
      applyImg(it, res.url);
      if (it.kind === 'img') it.el.setAttribute('alt', res.alt || it.alt || '');
      markChanged(); showEditor(sel); renderList();
      App.toast('Fotoğraf değiştirildi — sitede görünüyor', 'success');
    } catch (e) { App.toast(e && e.user ? e.message : Medya.friendly(e), 'error', 'Kaydedilemedi'); }
    finally { busy = false; }
  }

  async function fetchOriginal(url) {
    const r = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'force-cache' });
    if (!r.ok) throw userErr('Orijinal fotoğraf indirilemedi.');
    const b = await r.blob();
    if (!/^image\/(jpeg|png|webp)$/.test(b.type)) throw userErr('Orijinal fotoğraf kopyalanamadı (desteklenmeyen biçim).');
    return b;
  }

  /** Dosya adı ve alt metni kaydet */
  async function saveImgDetails() {
    if (!sel || sel.type !== 'i' || busy) return;
    const it = sel.item;
    const f = fileOf(it);
    const newBase = Medya.slug($('eiName').value, 60);
    if (!newBase) { App.toast('Dosya adı boş olamaz.', 'warning'); $('eiName').focus(); return; }
    const alt = clean($('eiAlt').value).slice(0, 250);
    const nameChanged = newBase !== f.base;
    const altChanged = it.kind === 'img' && alt !== clean(curAlt(it));
    if (!nameChanged && !altChanged) { App.toast('Değişiklik yok.', 'info'); return; }
    if (altChanged && !altCol && !nameChanged) { App.toast('Alt metni kaydetmek için önce veritabanı güncellemesini yapın.', 'warning'); return; }
    if (nameChanged && f.stored) {
      const ok = await App.confirm('Dosya adı "' + f.base + f.ext + '" → "' + newBase + f.ext + '" olacak.\n\nBu fotoğraf sitede başka yerlerde de kullanılıyorsa, hepsi yeni adrese otomatik taşınır. Eski dosya, gönderilmiş e-postalar bozulmasın diye arşivde saklanır.', 'Dosya adını değiştir');
      if (!ok) return;
    }
    busy = true; const btn = $('eiSave'); btn.disabled = true; App.iconText(btn, 'clock', 'Kaydediliyor…');
    try {
      let url = f.src;
      if (nameChanged) {
        if (f.stored) {
          const item = { bucket: f.stored.bucket, path: f.stored.path, name: Medya.baseName(f.stored.path), url: f.src, alt, folder: Medya.folderOf(f.stored.bucket, f.stored.path) };
          const renamed = await Medya.rename(item, newBase);
          url = renamed.url;
          await loadRows();                                      // adres veritabanında her yerde taşındı
        } else {
          const blob = await fetchOriginal(f.src);
          const up = await Medya.upload(new File([blob], newBase + f.ext, { type: blob.type }), { name: newBase, folder: 'site', alt: it.kind === 'img' ? alt : '' });
          url = up.url;
          await upsert(it.scope, it.key, { foto_url: url });
        }
        applyImg(it, url);
      }
      if (altChanged && altCol) {
        const v = alt === clean(it.alt || '') ? null : alt;
        if (rowOf(it) || v !== null) await upsert(it.scope, it.key, { foto_alt: v });
        const sto = Medya.parseUrl(url);
        if (sto) { try { await supabaseClient.from('medya').upsert({ bucket: sto.bucket, yol: sto.path, alt_metin: alt || null }, { onConflict: 'bucket,yol' }); } catch (_) { /* önemli değil */ } }
        it.el.setAttribute('alt', alt || it.alt || '');
      }
      await tidy(it);
      markChanged(); showEditor(sel); renderList();
      App.toast(nameChanged ? 'Dosya adı ve bilgiler kaydedildi — sitede görünüyor' : 'Alt metin kaydedildi — sitede görünüyor', 'success');
    } catch (e) {
      App.toast(e && e.user ? e.message : Medya.friendly(e), 'error', 'Kaydedilemedi');
    } finally {
      busy = false; btn.disabled = false; App.iconText(btn, 'save', 'Kaydet');
    }
  }
  async function revertImg() {
    if (!sel || sel.type !== 'i') return;
    if (!(await App.confirm('Bu fotoğraf sitenin orijinal fotoğrafına (ve orijinal alt metnine) dönsün mü?', 'Orijinale dön'))) return;
    const it = sel.item;
    try {
      await removeRow(it.scope, it.key); applyImg(it, it.src);
      if (it.kind === 'img') it.el.setAttribute('alt', it.alt || '');
      markChanged(); showEditor(sel); renderList(); App.toast('Orijinal fotoğrafa dönüldü', 'success');
    } catch (e) { App.toast(e.message, 'error'); }
  }

  // ---------- Logo & favicon ----------
  async function uploadBrandImage(file, prefix) {
    const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!/^(jpe?g|png|webp)$/.test(ext)) throw new Error('Sadece JPG, PNG veya WEBP yükleyebilirsiniz');
    if (file.size > 5 * 1024 * 1024) throw new Error('Dosya 5MB\'dan küçük olmalı');
    const name = `site/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabaseClient.storage.from('property-photos').upload(name, file, { cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return supabaseClient.storage.from('property-photos').getPublicUrl(name).data.publicUrl;
  }
  async function loadBrand() {
    const { data } = await supabaseClient.from('site_content').select('id,bolum_key,foto_url').eq('sayfa', 'genel').in('bolum_key', ['logo_url', 'favicon_url']);
    const m = new Map((data || []).map(r => [r.bolum_key, r]));
    const lp = $('logoPrev'); lp.textContent = '';
    const lu = m.get('logo_url') && safeImg(m.get('logo_url').foto_url);
    const li = el('img'); li.src = lu || '/admin/assets/default-logo.svg'; li.alt = lu ? 'Logo' : 'Varsayılan logo'; lp.appendChild(li);
    $('logoReset').disabled = !lu;
    const fp = $('favPrev'); fp.textContent = '';
    const fu = (m.get('favicon_url') && safeImg(m.get('favicon_url').foto_url)) || '/favicon-192.png';
    [16, 32, 64].forEach(s => { const i = el('img'); i.src = fu; i.width = s; i.height = s; i.alt = ''; fp.appendChild(i); });
    const note = el('span', null, m.get('favicon_url') ? 'Özel favicon' : 'Varsayılan favicon'); note.style.cssText = 'font-size:12px;color:#64748B'; fp.appendChild(note);
    $('favReset').disabled = !m.get('favicon_url');
    return m;
  }
  async function setBrand(key, url) {
    const { data } = await supabaseClient.from('site_content').select('id').eq('sayfa', 'genel').eq('bolum_key', key).limit(1);
    const res = data && data[0]
      ? await supabaseClient.from('site_content').update({ foto_url: url, aktif: true }).eq('id', data[0].id)
      : await supabaseClient.from('site_content').insert({ sayfa: 'genel', bolum_key: key, foto_url: url, aktif: true, sira: 0 });
    if (res.error) throw res.error;
  }
  async function resetBrand(key) {
    if (!(await App.confirm('Varsayılana dönülsün mü?'))) return;
    const { error } = await supabaseClient.from('site_content').delete().eq('sayfa', 'genel').eq('bolum_key', key);
    if (error) App.toast(error.message, 'error'); else { App.toast('Varsayılana dönüldü', 'success'); loadBrand(); }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('site-content'))) return;
    editor = RichEditor.create($('etHost'), { compact: true, placeholder: 'Yeni metni yazın…' });
    const ps = $('pageSel');
    PAGES.forEach(([v, l]) => { const o = el('option', null, l); o.value = v; ps.appendChild(o); });
    const qp = new URLSearchParams(location.search).get('sayfa');
    if (qp && PAGES.some(p => p[0] === qp)) { page = qp; ps.value = qp; }
    ps.addEventListener('change', async () => {
      if (imgDirty() && !window.confirm('Fotoğraf bilgilerinde kaydedilmemiş değişiklik var. Sayfa değiştirilsin mi?')) { ps.value = page; return; }
      page = ps.value; await loadRows(); loadFrame();
    });
    $('frame').addEventListener('load', onFrameLoad);
    $('reloadBtn').addEventListener('click', loadFrame);
    const setDev = (mob) => {
      $('frame').classList.toggle('mob', mob);
      $('devMob').classList.toggle('on', mob); $('devDesk').classList.toggle('on', !mob);
      $('devMob').setAttribute('aria-pressed', mob ? 'true' : 'false'); $('devDesk').setAttribute('aria-pressed', mob ? 'false' : 'true');
    };
    $('devMob').addEventListener('click', () => setDev(true));
    $('devDesk').addEventListener('click', () => setDev(false));
    $('search').addEventListener('input', renderList);
    document.querySelectorAll('.sc-seg button').forEach(bt => bt.addEventListener('click', () => setKind(bt.dataset.kind)));
    $('onlyChanged').addEventListener('change', renderList);
    $('etSave').addEventListener('click', saveText); $('etRevert').addEventListener('click', revertText);
    $('eiPhoto').addEventListener('click', changePhoto);
    $('eiSave').addEventListener('click', saveImgDetails); $('eiRevert').addEventListener('click', revertImg);
    $('eiName').addEventListener('input', () => {
      const v = $('eiName').value; const s = v.toLocaleLowerCase('tr-TR').replace(/\s+/g, '-');
      if (s !== v) $('eiName').value = s;
      updImgDirty();
    });
    $('eiName').addEventListener('blur', () => { if (sel && sel.type === 'i') { $('eiName').value = Medya.slug($('eiName').value, 60) || fileOf(sel.item).base; updImgDirty(); } });
    $('eiAlt').addEventListener('input', updImgDirty);
    window.addEventListener('beforeunload', (e) => { if (imgDirty()) { e.preventDefault(); e.returnValue = ''; } });
    document.querySelectorAll('.sc-tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.sc-tab').forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      $('tab-texts').hidden = t.dataset.tab !== 'texts';
      $('tab-brand').hidden = t.dataset.tab !== 'brand';
      if (t.dataset.tab === 'brand') loadBrand();
    }));
    const brandUp = (inputId, key, prefix) => $(inputId).addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { const u = await uploadBrandImage(f, prefix); await setBrand(key, u); App.toast('Kaydedildi — sitede görünüyor', 'success'); loadBrand(); }
      catch (err) { App.toast(err.message, 'error'); }
    });
    brandUp('logoFile', 'logo_url', 'logo'); brandUp('favFile', 'favicon_url', 'favicon');
    $('logoReset').addEventListener('click', () => resetBrand('logo_url'));
    $('favReset').addEventListener('click', () => resetBrand('favicon_url'));
    await loadRows(); loadFrame();
  });
})();
