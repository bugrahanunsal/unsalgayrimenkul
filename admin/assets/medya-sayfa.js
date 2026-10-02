/**
 * Panel — Görsel Deposu (admin/medya.html)
 * Sitedeki TÜM fotoğraflar tek yerde: panelden yüklenenler (site, ilan, blog, SEO, e-posta, ekip), sitenin sayfalarındaki
 * hazır fotoğraflar ve başka adresten kullanılan görseller. Tıklayınca dosya adı, alt metin, nerede kullanıldığı,
 * fotoğrafı değiştir / küçült / sil. Yükleme alanından eklenen her fotoğraf en fazla 150 KB'a küçültülür.
 * Veri: Medya modülü (medya.js). Kullanıcı / veritabanı verisi DOM'a yalnızca textContent / value ile yazılır.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const FILTERS = [['all', 'Tümü'], ['site', 'Site'], ['ilan', 'İlanlar'], ['blog', 'Blog'], ['seo', 'SEO'], ['email', 'E-posta'], ['ekip', 'Ekip'],
    ['hazir', 'Sitenin hazır fotoğrafları'], ['unused', 'Kullanılmayan'], ['noalt', 'Alt metni eksik'], ['big', '150 KB üstü'], ['archive', 'Arşiv']];
  const FOLDER_LABEL = { site: 'Site fotoğrafı', ilan: 'İlan fotoğrafı', blog: 'Blog görseli', email: 'E-posta görseli', ekip: 'Ekip fotoğrafı' };
  const USE_LABEL = { site: 'Site', seo: 'SEO', blog: 'Blog', ilan: 'İlan', ekip: 'Ekip', eposta: 'E-posta' };
  const S = { items: [], uses: new Map(), filter: 'all', q: '', cur: null, saved: '', isAdmin: false, busy: false, setup: false };

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const usesOf = (it) => it.origin === 'site' ? (it.uses || []) : (S.uses.get(it.url) || []);
  const lower = (s) => String(s || '').toLocaleLowerCase('tr-TR');
  const keyOf = (it) => it.origin === 'depo' ? it.bucket + '/' + it.path : it.origin + ':' + it.url;
  const isBig = (it) => it.origin === 'depo' && !it.archived && it.size != null && it.size > Medya.MAX_BYTES;
  const altApplies = (it) => it.origin === 'depo' || (it.origin === 'site' ? !it.bgOnly : usesOf(it).some(u => u.type === 'site' || u.type === 'ilan'));
  const needsAlt = (it) => !it.archived && !it.alt && altApplies(it);

  function match(it, f) {
    if (f === 'archive') return it.archived;
    if (it.archived) return false;
    switch (f) {
      case 'all': return true;
      case 'unused': return it.origin === 'depo' && !usesOf(it).length;
      case 'noalt': return needsAlt(it);
      case 'big': return isBig(it);
      case 'hazir': return it.origin === 'site';
      case 'seo': return usesOf(it).some(u => u.type === 'seo');
      default: return it.folder === f;
    }
  }
  function visible() {
    const q = lower(S.q).trim();
    return S.items.filter(it => match(it, S.filter) && (!q || lower(it.name).includes(q) || lower(it.alt).includes(q) || lower(it.path).includes(q)));
  }

  // ------------------------------------------------------------------ liste
  function renderChips() {
    const box = $('chips'); box.textContent = '';
    FILTERS.forEach(([k, label]) => {
      const n = S.items.filter(it => match(it, k)).length;
      if ((k === 'archive' || k === 'big' || k === 'hazir') && !n) return;
      const b = el('button', 'mp-chip' + (S.filter === k ? ' on' : '') + (k === 'big' ? ' warn' : '')); b.type = 'button';
      b.setAttribute('aria-pressed', S.filter === k ? 'true' : 'false');
      b.append(label + ' ');
      b.appendChild(el('span', 'n', String(n)));
      b.onclick = () => { S.filter = k; renderChips(); renderGrid(); };
      box.appendChild(b);
    });
  }
  function subLine(it) {
    if (it.origin === 'site') { const n = usesOf(it).length; return 'Sitenin hazır fotoğrafı · ' + n + (n === 1 ? ' sayfada' : ' sayfada'); }
    if (it.origin === 'dis') return 'Başka adresten · ' + (FOLDER_LABEL[it.folder] || 'Görsel');
    return [FOLDER_LABEL[it.folder] || '', Medya.fmtSize(it.size), Medya.fmtDate(it.created)].filter(Boolean).join(' · ');
  }
  function renderGrid() {
    const g = $('grid'); g.textContent = '';
    const arr = visible();
    $('count').textContent = arr.length ? arr.length + ' fotoğraf' : '';
    if (!arr.length) {
      const e = el('div', 'mp-empty');
      const ic = el('span', 'mp-empty-ic'); ic.appendChild(App.icon('images'));
      e.append(ic, el('div', null, S.items.length ? 'Bu filtreye uyan fotoğraf yok.' : 'Henüz fotoğraf yok. Yukarıdaki alandan yükleyebilirsiniz.'));
      g.appendChild(e); return;
    }
    arr.forEach(it => {
      const b = el('button', 'mp-card'); b.type = 'button'; b.dataset.key = keyOf(it);
      const th = el('span', 'mp-th');
      const img = el('img'); img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; img.referrerPolicy = 'no-referrer';
      const src = Medya.viewUrl(it.url); if (src) img.src = src;
      th.appendChild(img);
      const n = usesOf(it).length;
      const tags = el('span', 'mp-tags');
      const left = el('span', 'mp-tagl');
      left.appendChild(el('span', 'mp-badge' + (it.archived ? ' arch' : n ? '' : ' none'), it.archived ? 'Arşiv' : n ? n + ' yerde' : 'Kullanılmıyor'));
      if (it.origin === 'site') left.appendChild(el('span', 'mp-badge ready', 'Hazır'));
      tags.appendChild(left);
      const right = el('span', 'mp-tagr');
      if (isBig(it)) right.appendChild(el('span', 'mp-big', Medya.fmtSize(it.size)));
      if (needsAlt(it)) right.appendChild(el('span', 'mp-noalt', 'Alt metin yok'));
      tags.appendChild(right);
      th.appendChild(tags);
      const nm = el('span', 'mp-nm', it.name); nm.title = it.name;
      b.append(th, nm, el('span', 'mp-sub', subLine(it)));
      b.addEventListener('click', () => open(it));
      g.appendChild(b);
    });
  }
  function renderBigBar() {
    const big = S.items.filter(isBig);
    $('bigBar').hidden = !big.length;
    if (!big.length) return;
    const total = big.reduce((s, it) => s + (it.size || 0), 0);
    $('bigText').textContent = big.length + ' fotoğraf 150 KB sınırının üstünde (toplam ' + Medya.fmtSize(total) + '). Küçültülünce site daha hızlı açılır; kullanıldıkları her yer otomatik güncellenir.';
    $('bigBtn').disabled = S.setup;
    $('bigNote').hidden = !S.setup;
  }

  // ------------------------------------------------------------------ ayrıntı paneli
  const draft = () => JSON.stringify({ n: Medya.slug($('drName').value, 60), a: $('drAlt').value.replace(/\s+/g, ' ').trim() });
  const isDirty = () => !!S.cur && draft() !== S.saved;
  function updDirty() { $('drDirty').hidden = !isDirty(); $('drAltCount').textContent = String($('drAlt').value.length); }

  function open(it) {
    S.cur = it;
    $('dr').hidden = false; document.body.style.overflow = 'hidden';
    $('drTitle').textContent = it.name;
    const pv = $('drPrevImg'); pv.textContent = '';
    const img = el('img'); img.alt = it.alt || ''; img.referrerPolicy = 'no-referrer';
    const src = Medya.viewUrl(it.url); if (src) img.src = src;
    pv.appendChild(img);
    const meta = $('drMeta');
    const drawMeta = (w, h) => {
      meta.textContent = '';
      const parts = it.origin === 'depo'
        ? [FOLDER_LABEL[it.folder], w && h ? w + ' × ' + h + ' px' : '', Medya.fmtSize(it.size), Medya.fmtDate(it.created) ? 'Yüklendi: ' + Medya.fmtDate(it.created) : '']
        : [it.origin === 'site' ? 'Sitenin hazır fotoğrafı' : 'Başka adresten kullanılıyor', w && h ? w + ' × ' + h + ' px' : ''];
      parts.filter(Boolean).forEach((t, i) => { if (i) meta.appendChild(el('span', 'dot', '·')); meta.appendChild(el('span', null, t)); });
      if (isBig(it)) { meta.appendChild(el('span', 'dot', '·')); meta.appendChild(el('span', 'mp-bigtxt', '150 KB sınırının üstünde')); }
    };
    drawMeta(it.w, it.h);
    if (!it.w) img.addEventListener('load', () => { if (S.cur === it) drawMeta(img.naturalWidth, img.naturalHeight); }, { once: true });

    const parts = Medya.splitExt(it.name);
    $('drName').value = it.origin === 'depo' ? parts.base : Medya.slug(parts.base, 60);
    $('drExt').textContent = it.origin === 'depo' ? (parts.ext || '') : '.jpg';
    $('drNameHelp').textContent = it.origin === 'depo'
      ? 'Kısa, tire ile ayrılmış, Türkçe karaktersiz (ör. yalova-deniz-manzarali-daire). Değişince fotoğrafın adresi de değişir; sitede kullanıldığı her yer otomatik güncellenir.'
      : 'Bu fotoğraf depoda değil (' + (it.origin === 'site' ? 'sitenin kendi dosyası' : 'başka bir adresten') + '). Dosya adı verirseniz fotoğraf bu adla Görsel Deposu\'na en fazla 150 KB olarak kopyalanır ve sitede onun yerine kullanılır.';
    $('drAlt').value = it.alt || '';
    const altOk = altApplies(it);
    $('drAlt').disabled = it.archived || !altOk;
    $('drAltHelp').textContent = !altOk
      ? (it.origin === 'site' ? 'Bu fotoğraf arka plan görseli: Google arka plan görsellerini okumaz, alt metin gerekmez.' : 'Bu görselin kullanıldığı yerde (blog kapağı, paylaşım görseli, e-posta) alt metin alanı yok.')
      : 'Görme engelliler ve Google için kısa açıklama. ' + (it.origin === 'site' ? 'Bu fotoğrafın sitedeki her yerine uygulanır.' : 'Site İçeriği ve ilan sayfalarında bu fotoğrafın kullanıldığı her yere uygulanır.');
    $('drName').disabled = it.archived; $('drReplace').disabled = it.archived;
    $('drSave').hidden = it.archived;
    $('drShrink').hidden = !isBig(it);
    $('drShrink').disabled = S.setup;
    const arch = $('drArchived');
    arch.hidden = !it.archived && !S.setup;
    arch.textContent = '';
    if (it.archived) {
      arch.appendChild(App.icon('info'));
      arch.append(' Bu dosyanın adı değiştirildi veya yerine yeni fotoğraf kondu' + (it.newPath ? ' (' + Medya.baseName(it.newPath) + ')' : '') +
        '. Daha önce gönderilmiş e-postalarda görünmeye devam etsin diye saklanıyor.');
    } else if (S.setup) {
      arch.appendChild(App.icon('info'));
      arch.append(' Dosya adı ve alt metin kaydetmek için önce veritabanı güncellemesini yapın (' + Medya.SQL_FILE + ').');
    }
    $('drOpen').href = src || '#';

    const ul = $('drUsage'); ul.textContent = '';
    const uses = usesOf(it);
    if (!uses.length) ul.appendChild(el('li', 'mp-unone', 'Sitede hiçbir yerde kullanılmıyor.'));
    uses.forEach(u => {
      const li = el('li');
      li.appendChild(el('span', 'mp-utype', USE_LABEL[u.type] || ''));
      const a = el('a', null, u.label.replace(/^[^·]+·\s*/, '')); a.href = u.href; li.appendChild(a);
      ul.appendChild(li);
    });

    const del = $('drDelete'), note = $('drDeleteNote');
    $('drDangerBox').hidden = !S.isAdmin || it.origin !== 'depo';
    del.disabled = !S.isAdmin || uses.length > 0;
    note.textContent = uses.length ? 'Kullanımdaki fotoğraf silinemez.' : (it.archived ? 'Eski e-postalarda görünmez olur.' : '');

    const list = visible(); const i = list.indexOf(it);
    $('drPrev').disabled = i <= 0; $('drNext').disabled = i < 0 || i >= list.length - 1;
    S.saved = draft(); updDirty();
    setTimeout(() => { if (!it.archived && altOk) $('drAlt').focus(); }, 40);
  }
  function hideDrawer() { S.cur = null; $('dr').hidden = true; document.body.style.overflow = ''; }
  function close(after) {
    if (isDirty() && !window.confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden kapatılsın mı?')) return;
    hideDrawer();
    if (after) after();
  }
  function step(d) {
    const list = visible(); const i = list.indexOf(S.cur); const nx = list[i + d];
    if (!nx) return;
    if (isDirty() && !window.confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden geçilsin mi?')) return;
    open(nx);
  }

  async function reload(keepKey) {
    const r = await Medya.list(true);
    S.setup = r.setupNeeded; $('setupAlert').hidden = !r.setupNeeded;
    const [uses, site] = await Promise.all([Medya.usage(), Medya.siteImages().catch(() => [])]);
    S.uses = uses;
    const known = new Set(r.items.map(i => i.url));
    site.forEach(i => known.add(i.url));
    const ext = [];
    uses.forEach((u, url) => { if (!known.has(url) && !Medya.parseUrl(url)) ext.push(Medya.externalItem(url, u)); });
    S.items = r.items.concat(site, ext);
    renderChips(); renderGrid(); renderBigBar();
    if (keepKey) { const it = S.items.find(x => keyOf(x) === keepKey); if (it) open(it); }
  }

  async function save() {
    const it = S.cur; if (!it || S.busy || it.archived) return;
    const name = Medya.slug($('drName').value, 60);
    const alt = $('drAlt').disabled ? (it.alt || '') : $('drAlt').value.replace(/\s+/g, ' ').trim().slice(0, 250);
    if (!name) { App.toast('Dosya adı boş olamaz.', 'warning'); $('drName').focus(); return; }
    const base0 = it.origin === 'depo' ? Medya.splitExt(it.name).base : Medya.slug(Medya.splitExt(it.name).base, 60);
    const renaming = name !== base0;
    const altChanged = alt !== (it.alt || '');
    if (!renaming && !altChanged) { hideDrawer(); return; }
    if (S.setup) { App.toast('Önce veritabanı güncellemesini yapın (' + Medya.SQL_FILE + ').', 'warning', 'Kaydedilemedi'); return; }
    const n = usesOf(it).length;
    if (renaming) {
      const ext = it.origin === 'depo' ? (Medya.splitExt(it.name).ext || '') : '.jpg';
      const msg = it.origin === 'depo'
        ? 'Dosya adı "' + it.name + '" → "' + name + ext + '" olacak.' + (n ? '\n\nBu fotoğraf ' + n + ' yerde kullanılıyor; hepsi yeni adrese otomatik taşınır.' : '') +
          (isBig(it) ? '\n\nFotoğraf aynı anda en fazla 150 KB\'a küçültülür.' : '') + '\n\nEski dosya, gönderilmiş e-postalar bozulmasın diye arşivde saklanır.'
        : 'Fotoğraf "' + name + '.jpg" adıyla Görsel Deposu\'na kopyalanacak (en fazla 150 KB) ve sitede ' + (n || 1) + ' yerde onun yerine kullanılacak.';
      if (!(await App.confirm(msg, 'Dosya adını değiştir'))) return;
    }
    S.busy = true; const btn = $('drSave'); btn.disabled = true; App.iconText(btn, 'clock', 'Kaydediliyor…');
    try {
      let key = keyOf(it);
      if (it.origin === 'depo') {
        let cur = it;
        if (renaming) cur = await Medya.rename(it, name);
        if (altChanged || renaming) await Medya.setAlt(cur, alt);
        key = cur.bucket + '/' + cur.path;
      } else if (renaming) {
        const up = await Medya.importItem(it, name, alt);
        key = up.bucket + '/' + up.path;
      } else {
        await Medya.setAlt(it, alt);
      }
      S.saved = draft();
      App.toast(renaming ? 'Dosya adı kaydedildi; sitede kullanıldığı her yer güncellendi.' : 'Alt metin kaydedildi — sitede görünüyor.', 'success', 'Görsel Deposu');
      hideDrawer();
      await reload(key);
    } catch (e) {
      App.toast(e && e.user ? e.message : Medya.friendly(e), 'error', 'Kaydedilemedi');
    } finally {
      S.busy = false; btn.disabled = false; App.iconText(btn, 'save', 'Kaydet');
    }
  }

  function chooseFile(multiple) {
    return new Promise((resolve) => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp,image/gif'; inp.multiple = !!multiple;
      inp.onchange = () => resolve(Array.from(inp.files || []));
      inp.click();
    });
  }
  async function replacePhoto() {
    const it = S.cur; if (!it || it.archived || S.busy) return;
    if (S.setup) { App.toast('Önce veritabanı güncellemesini yapın (' + Medya.SQL_FILE + ').', 'warning'); return; }
    const n = usesOf(it).length;
    const [f] = await chooseFile(false); if (!f) return;
    if (n && !(await App.confirm('Bu fotoğraf ' + n + ' yerde kullanılıyor; hepsinde yeni fotoğraf görünecek (en fazla 150 KB). Devam edilsin mi?', 'Fotoğrafı değiştir'))) return;
    const btn = $('drReplace'); btn.disabled = true; S.busy = true; App.iconText(btn, 'clock', 'Yükleniyor…');
    try {
      const r = await Medya.replace(it, f);
      App.toast('Fotoğraf değiştirildi (' + Medya.fmtSize(r.after) + ')' + (n ? '; ' + n + ' yerde güncellendi.' : '.'), 'success', 'Görsel Deposu');
      hideDrawer();
      await reload(r.bucket + '/' + r.path);
    } catch (e) { App.toast(e && e.user ? e.message : Medya.friendly(e), 'error', 'Fotoğraf değiştirilemedi'); }
    finally { S.busy = false; btn.disabled = false; App.iconText(btn, 'camera', 'Fotoğrafı değiştir'); }
  }

  async function shrinkOne() {
    const it = S.cur; if (!it || !isBig(it) || S.busy || S.setup) return;
    const btn = $('drShrink'); btn.disabled = true; S.busy = true; App.iconText(btn, 'clock', 'Küçültülüyor…');
    try {
      const r = await Medya.shrink(it, usesOf(it));
      App.toast(Medya.fmtSize(it.size) + ' → ' + Medya.fmtSize(r.after) + '. Kullanıldığı her yer güncellendi.', 'success', 'Fotoğraf küçültüldü');
      hideDrawer();
      await reload(r.bucket + '/' + r.path);
    } catch (e) { App.toast(e && e.user ? e.message : Medya.friendly(e), 'error', 'Küçültülemedi'); }
    finally { S.busy = false; btn.disabled = false; App.iconText(btn, 'refresh', '150 KB\'a küçült'); }
  }
  async function shrinkAll() {
    const big = S.items.filter(isBig);
    if (!big.length || S.busy || S.setup) return;
    if (!(await App.confirm(big.length + ' fotoğraf en fazla 150 KB olacak şekilde küçültülsün mü?\n\nSitede kullanıldıkları her yer yeni (küçük) dosyaya taşınır; büyük dosyalar gönderilmiş e-postalar için arşivde saklanır.', 'Büyük fotoğrafları küçült'))) return;
    S.busy = true; let done = 0, fail = 0; const btn = $('bigBtn'); btn.disabled = true;
    for (const it of big) {
      App.iconText(btn, 'clock', 'Küçültülüyor ' + (done + fail + 1) + ' / ' + big.length);
      try { await Medya.shrink(it, usesOf(it)); done++; } catch (_) { fail++; }
    }
    S.busy = false; App.iconText(btn, 'refresh', 'Hepsini küçült');
    App.toast(done + ' fotoğraf küçültüldü' + (fail ? ', ' + fail + ' tanesi küçültülemedi' : '') + '.', fail ? 'warning' : 'success', 'Görsel Deposu');
    await reload();
  }

  async function removePhoto() {
    const it = S.cur; if (!it || !S.isAdmin || it.origin !== 'depo') return;
    const uses = usesOf(it);
    if (uses.length) return;
    if (!(await App.confirm('"' + it.name + '" kalıcı olarak silinsin mi?' + (it.archived ? ' Bu eski kopya daha önce gönderilmiş e-postalarda görünmez olur.' : ''), 'Fotoğrafı sil'))) return;
    try {
      await Medya.remove(it, uses);
      App.toast('Fotoğraf silindi.', 'success', 'Görsel Deposu');
      hideDrawer();
      await reload();
    } catch (e) { App.toast(e && e.user ? e.message : Medya.friendly(e), 'error', 'Silinemedi'); }
  }

  // ------------------------------------------------------------------ yükleme alanı
  async function uploadFiles(files) {
    const arr = (files || []).filter(Boolean);
    if (!arr.length || S.busy) return;
    const folder = $('upFolder').value;
    const list = $('upList'); list.hidden = false;
    S.busy = true;
    let ok = 0, lastKey = null;
    for (const f of arr) {
      const li = el('li', 'mp-upit');
      const nm = el('span', 'mp-upnm', f.name.slice(0, 80));
      const st = el('span', 'mp-upst', 'Küçültülüp yükleniyor…');
      li.append(nm, st); list.prepend(li);
      try {
        const r = await Medya.upload(f, { folder, name: Medya.splitExt(f.name).base, maxSide: folder === 'ekip' ? 1000 : 1920 });
        st.textContent = Medya.fmtSize(r.before) + ' → ' + Medya.fmtSize(r.after) + ' · ' + r.name;
        li.classList.add('ok'); ok++; lastKey = r.bucket + '/' + r.path;
      } catch (e) {
        st.textContent = e && e.user ? e.message : Medya.friendly(e); li.classList.add('err');
      }
    }
    S.busy = false;
    if (ok) {
      App.toast(ok + ' fotoğraf yüklendi (her biri en fazla 150 KB).' + (ok === 1 ? ' Şimdi dosya adını ve alt metnini yazabilirsiniz.' : ''), 'success', 'Görsel Deposu');
      await reload(ok === 1 && arr.length === 1 ? lastKey : null);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('medya'))) return;
    const role = (App.currentUser && App.currentUser.profile && App.currentUser.profile.role) || '';
    S.isAdmin = role === 'super_admin' || role === 'admin';
    $('q').addEventListener('input', () => { S.q = $('q').value; renderGrid(); });
    const drop = $('upDrop'), inp = $('upInput');
    $('upBtn').addEventListener('click', () => inp.click());
    inp.addEventListener('change', () => { const f = Array.from(inp.files || []); inp.value = ''; uploadFiles(f); });
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    ['dragenter', 'dragover'].forEach(n => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(n => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', (e) => { uploadFiles(Array.from((e.dataTransfer && e.dataTransfer.files) || [])); });
    $('bigBtn').addEventListener('click', shrinkAll);
    $('drClose').addEventListener('click', () => close()); $('drCancel').addEventListener('click', () => close());
    $('drPrev').addEventListener('click', () => step(-1)); $('drNext').addEventListener('click', () => step(1));
    $('dr').addEventListener('mousedown', (e) => { if (e.target === $('dr')) close(); });
    $('drName').addEventListener('input', () => {
      const v = $('drName').value; const s = v.toLocaleLowerCase('tr-TR').replace(/\s+/g, '-');
      if (s !== v) $('drName').value = s; updDirty();
    });
    $('drName').addEventListener('blur', () => { if (S.cur && !S.cur.archived) { $('drName').value = Medya.slug($('drName').value, 60) || Medya.slug(Medya.splitExt(S.cur.name).base, 60); updDirty(); } });
    $('drAlt').addEventListener('input', updDirty);
    $('drSave').addEventListener('click', save);
    $('drReplace').addEventListener('click', replacePhoto);
    $('drShrink').addEventListener('click', shrinkOne);
    $('drDelete').addEventListener('click', removePhoto);
    $('drCopy').addEventListener('click', async () => {
      if (!S.cur) return;
      try { await navigator.clipboard.writeText(S.cur.url); App.toast('Fotoğraf adresi kopyalandı.', 'success'); }
      catch (_) { window.prompt('Fotoğraf adresi:', S.cur.url); }
    });
    document.addEventListener('keydown', (e) => {
      if ($('dr').hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); save(); }
    });
    window.addEventListener('beforeunload', (e) => { if (isDirty() || S.busy) { e.preventDefault(); e.returnValue = ''; } });
    const want = new URLSearchParams(location.search).get('dosya');
    await reload(want && /^[a-z-]+\/[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(want) ? want : null);
  });
})();
