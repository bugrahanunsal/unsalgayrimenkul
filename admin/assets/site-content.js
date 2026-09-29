/**
 * Panel — Site İçeriği (görsel düzenleyici)
 * Sayfa önizlemesinde tıklanan yazı/fotoğraf düzenlenir, site_content tablosuna kaydedilir.
 * Kayıt anahtarı = orijinal içeriğin parmak izi (cms-content.js ile aynı algoritma).
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
  const rowKey = (scope, key) => (scope === 'genel' ? 'genel' : page) + '|' + key;
  const safeImg = (u) => /^https:\/\/[^\s"'<>()]+$/i.test(String(u || '').trim()) ? String(u).trim() : '';

  async function loadRows() {
    const { data, error } = await supabaseClient.from('site_content').select('id,sayfa,bolum_key,icerik_tr,foto_url,aktif').in('sayfa', [page, 'genel']).limit(3000);
    if (error) { App.toast('İçerik okunamadı: ' + error.message, 'error'); return; }
    rows = new Map((data || []).map(r => [r.sayfa + '|' + r.bolum_key, r]));
  }

  function frameDoc() { try { return $('frame').contentDocument; } catch (_) { return null; } }

  function loadFrame() {
    found = null; sel = null; showEditor(null);
    $('itemList').textContent = 'Önizleme yükleniyor…';
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
      if (Date.now() - t0 > 8000) { $('itemList').textContent = 'Bu sayfa düzenlenemiyor.'; return; }
      setTimeout(wait, 100);
    })();
  }

  function setup(w, d) {
    found = w.IUCmsContent.found;
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

  function renderList() {
    const box = $('itemList'); box.textContent = '';
    if (!found) return;
    const q = $('search').value.trim().toLocaleLowerCase('tr-TR');
    const only = $('onlyChanged').checked;
    const items = [...found.texts.map(t => ['t', t]), ...found.imgs.map(i => ['i', i])];
    let n = 0;
    items.forEach(([type, it]) => {
      const changed = rows.has(rowKey(it.scope, it.key));
      if (only && !changed) return;
      const label = type === 't' ? (it.el.textContent || '').replace(/\s+/g, ' ').trim() : ('Fotoğraf ' + (it.alt ? '— ' + it.alt : ''));
      if (q && !label.toLocaleLowerCase('tr-TR').includes(q)) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sc-item' + (changed ? ' ch' : '') + (sel && sel.item === it ? ' sel' : '');
      const tg = document.createElement('span'); tg.className = 't'; tg.textContent = type === 'i' ? 'FOTO' : (TAG_LABEL[it.tag] || it.tag).toUpperCase();
      const x = document.createElement('span'); x.className = 'x'; x.textContent = label || '(boş)';
      b.append(tg, x); b.onclick = () => select(type, it, true);
      box.appendChild(b); n++;
    });
    if (!n) box.textContent = only ? 'Bu sayfada henüz değişiklik yok.' : 'Sonuç yok.';
  }

  function select(type, item, scroll) {
    const d = frameDoc();
    if (d) d.querySelectorAll('.cms-sel').forEach(x => x.classList.remove('cms-sel'));
    sel = { type, item };
    item.el.classList.add('cms-sel');
    if (scroll) item.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showEditor(sel); renderList();
  }

  function showEditor(s) {
    $('editEmpty').style.display = s ? 'none' : '';
    $('editText').style.display = s && s.type === 't' ? '' : 'none';
    $('editImg').style.display = s && s.type === 'i' ? '' : 'none';
    if (!s) return;
    const it = s.item, r = rows.get(rowKey(it.scope, it.key));
    if (s.type === 't') {
      $('etTag').textContent = TAG_LABEL[it.tag] || it.tag;
      $('etScope').style.display = it.scope === 'genel' ? '' : 'none';
      editor.setHTML(r && r.icerik_tr != null ? r.icerik_tr : it.html);
      $('etOrig').textContent = it.text;
      $('etRevert').disabled = !r;
      setTimeout(() => editor.el.focus(), 30);
    } else {
      $('eiScope').style.display = it.scope === 'genel' ? '' : 'none';
      const cur = (r && safeImg(r.foto_url)) || it.src;
      $('eiUrl').value = r && r.foto_url ? r.foto_url : '';
      $('eiPrev').src = cur;
      $('eiRevert').disabled = !r;
    }
  }

  async function upsert(scope, key, fields) {
    const sayfa = scope === 'genel' ? 'genel' : page;
    const existing = rows.get(sayfa + '|' + key);
    const data = Object.assign({ sayfa, bolum_key: key, aktif: true }, fields);
    const res = existing
      ? await supabaseClient.from('site_content').update(fields).eq('id', existing.id).select().single()
      : await supabaseClient.from('site_content').insert(Object.assign({ sira: 0 }, data)).select().single();
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
    } catch (e) { App.toast(e.message, 'error'); }
    finally { btn.disabled = false; }
  }
  async function revertText() {
    if (!sel || sel.type !== 't') return;
    const it = sel.item;
    if (!(await App.confirm('Bu yazı orijinal haline dönsün mü?'))) return;
    try { await removeRow(it.scope, it.key); it.el.innerHTML = it.html; markChanged(); showEditor(sel); renderList(); App.toast('Orijinale döndü', 'success'); }
    catch (e) { App.toast(e.message, 'error'); }
  }

  async function uploadSiteImage(file, prefix) {
    const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!/^(jpe?g|png|webp)$/.test(ext)) throw new Error('Sadece JPG, PNG veya WEBP yükleyebilirsiniz');
    if (file.size > 5 * 1024 * 1024) throw new Error('Dosya 5MB\'dan küçük olmalı');
    const name = `site/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabaseClient.storage.from('property-photos').upload(name, file, { cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return supabaseClient.storage.from('property-photos').getPublicUrl(name).data.publicUrl;
  }
  function applyImg(it, url) {
    if (it.kind === 'img') { it.el.setAttribute('src', url); it.el.removeAttribute('srcset'); }
    else it.el.style.backgroundImage = 'url("' + url.replace(/["\\]/g, '') + '")';
  }
  async function saveImg() {
    if (!sel || sel.type !== 'i') return;
    const it = sel.item; const u = safeImg($('eiUrl').value);
    if (!u) { App.toast('Fotoğraf adresi https:// ile başlamalı (veya yükleyin)', 'warning'); return; }
    try { await upsert(it.scope, it.key, { foto_url: u }); applyImg(it, u); markChanged(); showEditor(sel); renderList(); App.toast('Fotoğraf kaydedildi', 'success'); }
    catch (e) { App.toast(e.message, 'error'); }
  }
  async function revertImg() {
    if (!sel || sel.type !== 'i') return;
    try { await removeRow(sel.item.scope, sel.item.key); applyImg(sel.item, sel.item.src); markChanged(); showEditor(sel); renderList(); App.toast('Orijinal fotoğrafa dönüldü', 'success'); }
    catch (e) { App.toast(e.message, 'error'); }
  }

  // ---------- Logo & favicon ----------
  async function loadBrand() {
    const { data } = await supabaseClient.from('site_content').select('id,bolum_key,foto_url').eq('sayfa', 'genel').in('bolum_key', ['logo_url', 'favicon_url']);
    const m = new Map((data || []).map(r => [r.bolum_key, r]));
    const lp = $('logoPrev'); lp.textContent = '';
    const lu = m.get('logo_url') && safeImg(m.get('logo_url').foto_url);
    if (lu) { const i = document.createElement('img'); i.src = lu; i.alt = 'Logo'; lp.appendChild(i); }
    else { const i = document.createElement('img'); i.src = '/admin/assets/default-logo.svg'; i.alt = 'Varsayılan logo'; lp.appendChild(i); }
    $('logoReset').disabled = !lu;
    const fp = $('favPrev'); fp.textContent = '';
    const fu = (m.get('favicon_url') && safeImg(m.get('favicon_url').foto_url)) || '/favicon-192.png';
    [16, 32, 64].forEach(s => { const i = document.createElement('img'); i.src = fu; i.width = s; i.height = s; i.alt = ''; fp.appendChild(i); });
    const note = document.createElement('span'); note.style.cssText = 'font-size:12px;color:#64748B'; note.textContent = m.get('favicon_url') ? 'Özel favicon' : 'Varsayılan favicon'; fp.appendChild(note);
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
    PAGES.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; ps.appendChild(o); });
    const qp = new URLSearchParams(location.search).get('sayfa');
    if (qp && PAGES.some(p => p[0] === qp)) { page = qp; ps.value = qp; }
    ps.onchange = async () => { page = ps.value; await loadRows(); loadFrame(); };
    $('frame').addEventListener('load', onFrameLoad);
    $('reloadBtn').onclick = loadFrame;
    $('devMob').onclick = () => $('frame').classList.add('mob');
    $('devDesk').onclick = () => $('frame').classList.remove('mob');
    $('search').addEventListener('input', renderList);
    $('onlyChanged').addEventListener('change', renderList);
    $('etSave').onclick = saveText; $('etRevert').onclick = revertText;
    $('eiSave').onclick = saveImg; $('eiRevert').onclick = revertImg;
    $('eiUrl').addEventListener('input', () => { const u = safeImg($('eiUrl').value); if (u) $('eiPrev').src = u; });
    $('eiFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { const u = await uploadSiteImage(f, 'foto'); $('eiUrl').value = u; $('eiPrev').src = u; App.toast('Yüklendi — kaydetmeyi unutmayın', 'info'); }
      catch (err) { App.toast(err.message, 'error'); }
    });
    document.querySelectorAll('.sc-tab').forEach(t => t.onclick = () => {
      document.querySelectorAll('.sc-tab').forEach(x => x.classList.toggle('on', x === t));
      $('tab-texts').style.display = t.dataset.tab === 'texts' ? '' : 'none';
      $('tab-brand').style.display = t.dataset.tab === 'brand' ? '' : 'none';
      if (t.dataset.tab === 'brand') loadBrand();
    });
    const brandUp = (inputId, key, prefix) => $(inputId).addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { const u = await uploadSiteImage(f, prefix); await setBrand(key, u); App.toast('Kaydedildi — sitede görünüyor', 'success'); loadBrand(); }
      catch (err) { App.toast(err.message, 'error'); }
    });
    brandUp('logoFile', 'logo_url', 'logo'); brandUp('favFile', 'favicon_url', 'favicon');
    $('logoReset').onclick = () => resetBrand('logo_url');
    $('favReset').onclick = () => resetBrand('favicon_url');
    await loadRows(); loadFrame();
  });
})();
