/**
 * Panel — Görsel Deposu (admin/medya.html)
 * Depodaki tüm fotoğraflar; tıklayınca dosya adı, alt metin, "nerede kullanılıyor", fotoğrafı değiştir, sil.
 * Veri: Medya modülü (medya.js). Kullanıcı / veritabanı verisi DOM'a yalnızca textContent / value ile yazılır.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const FILTERS = [['all', 'Tümü'], ['site', 'Site'], ['ilan', 'İlanlar'], ['blog', 'Blog'], ['email', 'E-posta'], ['ekip', 'Ekip'],
    ['unused', 'Kullanılmayan'], ['noalt', 'Alt metni eksik'], ['archive', 'Arşiv']];
  const FOLDER_LABEL = { site: 'Site fotoğrafı', ilan: 'İlan fotoğrafı', blog: 'Blog görseli', email: 'E-posta görseli', ekip: 'Ekip fotoğrafı' };
  const USE_LABEL = { site: 'Site', seo: 'SEO', blog: 'Blog', ilan: 'İlan', ekip: 'Ekip', eposta: 'E-posta' };
  const S = { items: [], uses: new Map(), filter: 'all', q: '', cur: null, saved: '', isAdmin: false, busy: false };

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const usesOf = (it) => S.uses.get(it.url) || [];
  const lower = (s) => String(s || '').toLocaleLowerCase('tr-TR');

  function match(it, f) {
    if (f === 'archive') return it.archived;
    if (it.archived) return false;
    if (f === 'all') return true;
    if (f === 'unused') return !usesOf(it).length;
    if (f === 'noalt') return !it.alt;
    return it.folder === f;
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
      if (k === 'archive' && !n) return;
      const b = el('button', 'mp-chip' + (S.filter === k ? ' on' : '')); b.type = 'button';
      b.setAttribute('aria-pressed', S.filter === k ? 'true' : 'false');
      b.append(label + ' ');
      b.appendChild(el('span', 'n', String(n)));
      b.onclick = () => { S.filter = k; renderChips(); renderGrid(); };
      box.appendChild(b);
    });
  }
  function renderGrid() {
    const g = $('grid'); g.textContent = '';
    const arr = visible();
    $('count').textContent = arr.length ? arr.length + ' fotoğraf' : '';
    if (!arr.length) {
      const e = el('div', 'mp-empty');
      const ic = el('span', 'mp-empty-ic'); ic.appendChild(App.icon('images'));
      e.append(ic, el('div', null, S.items.length ? 'Bu filtreye uyan fotoğraf yok.' : 'Depoda henüz fotoğraf yok. Sağ üstteki "Fotoğraf yükle" ile ekleyebilirsiniz.'));
      g.appendChild(e); return;
    }
    arr.forEach(it => {
      const b = el('button', 'mp-card'); b.type = 'button'; b.dataset.key = it.bucket + '/' + it.path;
      const th = el('span', 'mp-th');
      const img = el('img'); img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; img.src = it.url;
      th.appendChild(img);
      const n = usesOf(it).length;
      const badge = el('span', 'mp-badge' + (it.archived ? ' arch' : n ? '' : ' none'), it.archived ? 'Arşiv' : n ? n + ' yerde' : 'Kullanılmıyor');
      const tags = el('span', 'mp-tags'); tags.appendChild(badge);
      if (!it.archived && !it.alt) tags.appendChild(el('span', 'mp-noalt', 'Alt metin yok'));
      th.appendChild(tags);
      const nm = el('span', 'mp-nm', it.name); nm.title = it.name;
      const sub = el('span', 'mp-sub', [FOLDER_LABEL[it.folder] || '', Medya.fmtSize(it.size), Medya.fmtDate(it.created)].filter(Boolean).join(' · '));
      b.append(th, nm, sub);
      b.addEventListener('click', () => open(it));
      g.appendChild(b);
    });
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
    const img = el('img'); img.alt = it.alt || ''; img.src = it.url; pv.appendChild(img);
    const meta = $('drMeta');
    const drawMeta = (w, h) => {
      meta.textContent = '';
      [FOLDER_LABEL[it.folder], w && h ? w + ' × ' + h + ' px' : '', Medya.fmtSize(it.size), Medya.fmtDate(it.created) ? 'Yüklendi: ' + Medya.fmtDate(it.created) : '']
        .filter(Boolean).forEach((t, i) => { if (i) meta.appendChild(el('span', 'dot', '·')); meta.appendChild(el('span', null, t)); });
    };
    drawMeta(it.w, it.h);
    if (!it.w) img.addEventListener('load', () => { if (S.cur === it) drawMeta(img.naturalWidth, img.naturalHeight); }, { once: true });

    const parts = Medya.splitExt(it.name);
    $('drName').value = parts.base; $('drExt').textContent = parts.ext || '';
    $('drAlt').value = it.alt || '';
    $('drName').disabled = it.archived; $('drAlt').disabled = it.archived; $('drReplace').disabled = it.archived;
    $('drSave').hidden = it.archived;
    const arch = $('drArchived');
    arch.hidden = !it.archived;
    if (it.archived) {
      arch.textContent = '';
      arch.appendChild(App.icon('info'));
      arch.append(' Bu dosyanın adı değiştirildi veya yerine yeni fotoğraf kondu' + (it.newPath ? ' (' + Medya.baseName(it.newPath) + ')' : '') +
        '. Daha önce gönderilmiş e-postalarda görünmeye devam etsin diye saklanıyor.');
    }
    $('drOpen').href = it.url;

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
    $('drDangerBox').hidden = !S.isAdmin;
    del.disabled = !S.isAdmin || uses.length > 0;
    note.textContent = uses.length ? 'Kullanımdaki fotoğraf silinemez.' : (it.archived ? 'Eski e-postalarda görünmez olur.' : '');

    const list = visible(); const i = list.indexOf(it);
    $('drPrev').disabled = i <= 0; $('drNext').disabled = i < 0 || i >= list.length - 1;
    S.saved = draft(); updDirty();
    setTimeout(() => { if (!it.archived) $('drAlt').focus(); }, 40);
  }
  function close(after) {
    if (isDirty() && !window.confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden kapatılsın mı?')) return;
    $('dr').hidden = true; document.body.style.overflow = ''; S.cur = null;
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
    S.items = r.items; $('setupAlert').hidden = !r.setupNeeded;
    S.uses = await Medya.usage();
    renderChips(); renderGrid();
    if (keepKey) { const it = S.items.find(x => x.bucket + '/' + x.path === keepKey); if (it) open(it); }
  }

  async function save() {
    const it = S.cur; if (!it || S.busy || it.archived) return;
    const name = Medya.slug($('drName').value, 60);
    const alt = $('drAlt').value.replace(/\s+/g, ' ').trim().slice(0, 250);
    if (!name) { App.toast('Dosya adı boş olamaz.', 'warning'); $('drName').focus(); return; }
    const renaming = name !== Medya.splitExt(it.name).base;
    if (renaming) {
      const n = usesOf(it).length;
      const ok = await App.confirm('Dosya adı "' + it.name + '" → "' + name + (Medya.splitExt(it.name).ext || '') + '" olacak.' +
        (n ? '\n\nBu fotoğraf ' + n + ' yerde kullanılıyor; hepsi yeni adrese otomatik taşınır.' : '') +
        '\n\nEski dosya, gönderilmiş e-postalar bozulmasın diye arşivde saklanır.', 'Dosya adını değiştir');
      if (!ok) return;
    }
    S.busy = true; const btn = $('drSave'); btn.disabled = true; App.iconText(btn, 'clock', 'Kaydediliyor…');
    try {
      let cur = it;
      if (renaming) cur = await Medya.rename(it, name);
      if (alt !== (it.alt || '') || renaming) await Medya.setAlt(cur, alt);
      S.saved = draft();
      App.toast(renaming ? 'Dosya adı değişti; sitedeki tüm kullanımlar güncellendi.' : 'Kaydedildi.', 'success', 'Görsel Deposu');
      S.cur = null; $('dr').hidden = true; document.body.style.overflow = '';
      await reload(cur.bucket + '/' + cur.path);
    } catch (e) {
      App.toast(e && e.user ? e.message : Medya.friendly(e), 'error', 'Kaydedilemedi');
    } finally {
      S.busy = false; btn.disabled = false; App.iconText(btn, 'save', 'Kaydet');
    }
  }

  async function replacePhoto() {
    const it = S.cur; if (!it || it.archived) return;
    const n = usesOf(it).length;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      if (n && !(await App.confirm('Bu fotoğraf ' + n + ' yerde kullanılıyor; hepsinde yeni fotoğraf görünecek. Devam edilsin mi?', 'Fotoğrafı değiştir'))) return;
      const btn = $('drReplace'); btn.disabled = true; App.iconText(btn, 'clock', 'Yükleniyor…');
      try {
        const r = await Medya.replace(it, f);
        App.toast('Fotoğraf değiştirildi' + (n ? '; ' + n + ' yerde güncellendi.' : '.'), 'success', 'Görsel Deposu');
        S.cur = null; $('dr').hidden = true; document.body.style.overflow = '';
        await reload(r.bucket + '/' + r.path);
      } catch (e) { App.toast(e && e.user ? e.message : Medya.friendly(e), 'error', 'Fotoğraf değiştirilemedi'); }
      finally { btn.disabled = false; App.iconText(btn, 'camera', 'Fotoğrafı değiştir'); }
    };
    inp.click();
  }

  async function removePhoto() {
    const it = S.cur; if (!it || !S.isAdmin) return;
    const uses = usesOf(it);
    if (uses.length) return;
    if (!(await App.confirm('"' + it.name + '" kalıcı olarak silinsin mi?' + (it.archived ? ' Bu eski kopya daha önce gönderilmiş e-postalarda görünmez olur.' : ''), 'Fotoğrafı sil'))) return;
    try {
      await Medya.remove(it, uses);
      App.toast('Fotoğraf silindi.', 'success', 'Görsel Deposu');
      S.cur = null; $('dr').hidden = true; document.body.style.overflow = '';
      await reload();
    } catch (e) { App.toast(e && e.user ? e.message : Medya.friendly(e), 'error', 'Silinemedi'); }
  }

  async function uploadNew() {
    const r = await Medya.picker({ title: 'Fotoğraf yükle', uploadOnly: true, folder: 'site' });
    if (!r) return;
    App.toast('Fotoğraf yüklendi.', 'success', 'Görsel Deposu');
    await reload(r.item ? r.item.bucket + '/' + r.item.path : null);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('medya'))) return;
    const role = (App.currentUser && App.currentUser.profile && App.currentUser.profile.role) || '';
    S.isAdmin = role === 'super_admin' || role === 'admin';
    $('q').addEventListener('input', () => { S.q = $('q').value; renderGrid(); });
    $('upBtn').addEventListener('click', uploadNew);
    $('drClose').addEventListener('click', () => close()); $('drCancel').addEventListener('click', () => close());
    $('drPrev').addEventListener('click', () => step(-1)); $('drNext').addEventListener('click', () => step(1));
    $('dr').addEventListener('mousedown', (e) => { if (e.target === $('dr')) close(); });
    $('drName').addEventListener('input', () => {
      const v = $('drName').value; const s = v.toLocaleLowerCase('tr-TR').replace(/\s+/g, '-');
      if (s !== v) $('drName').value = s; updDirty();
    });
    $('drName').addEventListener('blur', () => { if (S.cur && !S.cur.archived) { $('drName').value = Medya.slug($('drName').value, 60) || Medya.splitExt(S.cur.name).base; updDirty(); } });
    $('drAlt').addEventListener('input', updDirty);
    $('drSave').addEventListener('click', save);
    $('drReplace').addEventListener('click', replacePhoto);
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
    window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
    const want = new URLSearchParams(location.search).get('dosya');
    await reload(want && /^[a-z-]+\/[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(want) ? want : null);
  });
})();
