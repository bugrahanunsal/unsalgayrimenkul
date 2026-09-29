/**
 * Panel — Blog yönetimi (admin/blog.html)
 * Tüm liste DOM ile kurulur (innerHTML'e kullanıcı verisi basılmaz).
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const STATIC_POSTS = [
    { file: '/blog-yalova-arsa-yatirimi-2026.html', slug: 'yalova-arsa-yatirimi-2026' },
    { file: '/blog-akkoy-yatirim-rehberi.html', slug: 'akkoy-yatirim-rehberi' }
  ];
  let posts = [];
  let editor = null;
  let editingSlugLocked = false;

  const slugify = (t) => String(t || '').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  const safeImg = (u) => /^https:\/\/[^\s"'<>()]+$/i.test(String(u || '').trim()) ? String(u).trim() : '';

  async function uploadImage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
    if (!/^(jpe?g|png|webp)$/.test(ext)) throw new Error('Sadece JPG, PNG veya WEBP');
    const name = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabaseClient.storage.from('blog-photos').upload(name, file, { cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return supabaseClient.storage.from('blog-photos').getPublicUrl(name).data.publicUrl;
  }

  async function loadPosts() {
    const { data, error } = await supabaseClient.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (error) { $('blogList').textContent = 'Hata: ' + error.message; return; }
    posts = data || [];
    render();
    const missing = STATIC_POSTS.filter(s => !posts.some(p => p.slug === s.slug));
    $('importBox').style.display = missing.length ? '' : 'none';
    $('importCount').textContent = missing.length;
  }

  function badge(d) {
    const s = document.createElement('span');
    s.className = 'badge badge-' + (d === 'yayinda' ? 'success' : d === 'arsiv' ? 'gray' : 'warning');
    s.textContent = d === 'yayinda' ? 'Yayında' : d === 'arsiv' ? 'Arşiv' : 'Taslak';
    return s;
  }

  function render() {
    const box = $('blogList'); box.textContent = '';
    if (!posts.length) {
      const c = document.createElement('div'); c.className = 'card';
      c.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div>Henüz blog yazısı yok</div></div>';
      const b = document.createElement('button'); b.className = 'btn btn-primary btn-sm'; b.style.marginTop = '16px'; b.textContent = 'İlk Yazıyı Yaz';
      b.onclick = () => openEditor(); c.querySelector('.empty-state').appendChild(b);
      box.appendChild(c); return;
    }
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;';
    posts.forEach(p => {
      const card = document.createElement('div'); card.className = 'card'; card.style.cssText = 'padding:0;overflow:hidden;display:flex;flex-direction:column;';
      const img = document.createElement('div');
      const cover = safeImg(p.kapak_foto);
      img.style.cssText = 'height:150px;background:#E2E8F0 center/cover no-repeat;';
      if (cover) img.style.backgroundImage = 'url("' + cover.replace(/["\\]/g, '') + '")';
      const body = document.createElement('div'); body.style.cssText = 'padding:14px 16px;display:flex;flex-direction:column;gap:8px;flex:1;';
      const top = document.createElement('div'); top.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
      top.appendChild(badge(p.durum));
      if (p.kategori) { const k = document.createElement('span'); k.style.cssText = 'font-size:12px;color:#64748B;'; k.textContent = p.kategori; top.appendChild(k); }
      const t = document.createElement('div'); t.style.cssText = 'font-weight:700;color:#0A2A5E;line-height:1.35;'; t.textContent = p.baslik_tr || '(başlıksız)';
      const d = document.createElement('div'); d.style.cssText = 'font-size:12px;color:#64748B;'; d.textContent = App.formatDate(p.yayin_tarihi || p.created_at);
      const act = document.createElement('div'); act.style.cssText = 'display:flex;gap:8px;margin-top:auto;flex-wrap:wrap;';
      const e = document.createElement('button'); e.className = 'btn btn-primary btn-sm'; e.textContent = '✏️ Düzenle'; e.onclick = () => openEditor(p);
      act.appendChild(e);
      if (p.durum === 'yayinda' && SLUG_RE.test(p.slug || '')) {
        const v = document.createElement('a'); v.className = 'btn btn-outline btn-sm'; v.textContent = '🌐 Sitede gör';
        v.href = '/blog/' + p.slug; v.target = '_blank'; v.rel = 'noopener'; act.appendChild(v);
      }
      const del = document.createElement('button'); del.className = 'btn btn-danger btn-sm'; del.textContent = '🗑️'; del.title = 'Sil';
      del.onclick = () => deletePost(p); act.appendChild(del);
      body.append(top, t, d, act); card.append(img, body); grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  function setCoverPreview() {
    const u = safeImg($('fCover').value);
    $('coverPrev').style.display = u ? '' : 'none';
    if (u) $('coverPrev').src = u;
  }

  function openEditor(p) {
    $('editorTitle').textContent = p ? 'Yazıyı Düzenle' : 'Yeni Blog Yazısı';
    $('blogId').value = p ? p.id : '';
    $('fTitle').value = p ? (p.baslik_tr || '') : '';
    $('fSlug').value = p ? (p.slug || '') : '';
    editingSlugLocked = !!(p && p.slug);
    $('fCat').value = p ? (p.kategori || '') : '';
    $('fStatus').value = p ? (p.durum || 'taslak') : 'taslak';
    $('fCover').value = p ? (p.kapak_foto || '') : '';
    $('fSummary').value = p ? (p.ozet_tr || '') : '';
    editor.setHTML(p ? (p.icerik_tr || '') : '');
    const v = $('viewLink');
    if (p && p.durum === 'yayinda' && SLUG_RE.test(p.slug || '')) { v.href = '/blog/' + p.slug; v.style.display = ''; } else v.style.display = 'none';
    setCoverPreview();
    $('editorModal').style.display = 'flex';
    $('fTitle').focus();
  }
  function closeEditor() { $('editorModal').style.display = 'none'; }

  async function save(e) {
    e.preventDefault();
    const title = $('fTitle').value.trim().slice(0, 200);
    const html = editor.getHTML();
    if (!title) { App.toast('Başlık gerekli', 'warning'); return; }
    if (!editor.getText()) { App.toast('İçerik boş olamaz', 'warning'); return; }
    let slug = slugify($('fSlug').value || title);
    if (!SLUG_RE.test(slug)) slug = 'yazi-' + Date.now();
    const id = $('blogId').value;
    const clash = posts.find(p => p.slug === slug && p.id !== id);
    if (clash) slug = slug + '-' + Date.now().toString(36);
    const status = $('fStatus').value;
    const prev = posts.find(p => p.id === id);
    const cover = $('fCover').value.trim();
    if (cover && !safeImg(cover)) { App.toast('Kapak fotoğrafı https:// ile başlamalı', 'warning'); return; }
    const data = {
      baslik_tr: title, slug,
      icerik_tr: html,
      ozet_tr: $('fSummary').value.trim().slice(0, 500) || null,
      kategori: $('fCat').value.trim().slice(0, 60) || null,
      kapak_foto: cover || null,
      durum: status,
      yayin_tarihi: status === 'yayinda' ? ((prev && prev.yayin_tarihi) || new Date().toISOString()) : (prev ? prev.yayin_tarihi : null)
    };
    const btn = $('saveBtn'); btn.disabled = true; btn.textContent = 'Kaydediliyor...';
    try {
      const { error } = id ? await supabaseClient.from('blog_posts').update(data).eq('id', id) : await supabaseClient.from('blog_posts').insert(data);
      if (error) throw error;
      App.toast(id ? 'Yazı güncellendi' : 'Yazı eklendi', 'success');
      closeEditor(); await loadPosts();
    } catch (err) { App.toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '💾 Kaydet'; }
  }

  async function deletePost(p) {
    if (!(await App.confirm(`"${p.baslik_tr}" yazısını silmek istediğinize emin misiniz?`))) return;
    const { error } = await supabaseClient.from('blog_posts').delete().eq('id', p.id);
    if (error) { App.toast(error.message, 'error'); return; }
    App.toast('Yazı silindi', 'success'); loadPosts();
  }

  // ---- Sitedeki sabit yazıları içe aktar ----
  async function importStatic() {
    const btn = $('importBtn'); btn.disabled = true; btn.textContent = 'Aktarılıyor...';
    let n = 0;
    for (const s of STATIC_POSTS) {
      if (posts.some(p => p.slug === s.slug)) continue;
      try {
        const res = await fetch(s.file, { cache: 'no-store' });
        if (!res.ok) continue;
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const art = doc.querySelector('article.article-body'); if (!art) continue;
        const coverEl = art.querySelector('.article-cover');
        const coverM = coverEl && (coverEl.getAttribute('style') || '').match(/url\(['"]?(https:[^'")]+)['"]?\)/);
        art.querySelectorAll('.article-cover,.article-footer-meta,script,style').forEach(x => x.remove());
        const title = (doc.querySelector('.article-hero h1') || {}).textContent || s.slug;
        const cat = (doc.querySelector('.article-cat') || {}).textContent || null;
        const desc = (doc.querySelector('meta[name="description"]') || { getAttribute: () => '' }).getAttribute('content') || '';
        const ld = doc.querySelector('script[type="application/ld+json"]');
        let date = null; try { date = JSON.parse(ld.textContent).datePublished; } catch (_) {}
        const data = {
          baslik_tr: title.trim().slice(0, 200), slug: s.slug,
          icerik_tr: window.IUSafe.sanitize(art.innerHTML),
          ozet_tr: desc.slice(0, 500) || null, kategori: cat ? cat.trim().slice(0, 60) : null,
          kapak_foto: coverM ? coverM[1] : null, durum: 'yayinda',
          yayin_tarihi: date ? new Date(date).toISOString() : new Date().toISOString()
        };
        const { error } = await supabaseClient.from('blog_posts').insert(data);
        if (error) throw error;
        n++;
      } catch (err) { App.toast('İçe aktarma hatası: ' + err.message, 'error'); }
    }
    btn.disabled = false; btn.textContent = '📥 Sitedeki yazıları içe aktar';
    if (n) App.toast(`${n} yazı panele aktarıldı`, 'success');
    loadPosts();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('blog'))) return;
    editor = RichEditor.create($('editorHost'), { uploadImage, placeholder: 'Yazınızı buraya yazın. Üstteki düğmelerle başlık, liste, görsel ekleyebilirsiniz.' });
    $('newBtn').onclick = () => openEditor();
    $('closeBtn').onclick = closeEditor;
    $('blogForm').addEventListener('submit', save);
    $('importBtn').onclick = importStatic;
    $('fTitle').addEventListener('input', () => { if (!editingSlugLocked) $('fSlug').value = slugify($('fTitle').value); });
    $('fSlug').addEventListener('input', () => { editingSlugLocked = true; });
    $('fCover').addEventListener('input', setCoverPreview);
    $('coverFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) { App.toast('Foto 5MB\'dan küçük olmalı', 'error'); return; }
      try { $('fCover').value = await uploadImage(f); setCoverPreview(); App.toast('Kapak yüklendi', 'success'); }
      catch (err) { App.toast(err.message, 'error'); }
    });
    loadPosts();
  });
})();
