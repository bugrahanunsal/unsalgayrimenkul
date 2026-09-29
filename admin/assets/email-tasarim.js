/**
 * Panel — E-posta tasarımcısı (blok tabanlı, Mailchimp benzeri)
 * Tasarım JSON'u email_templates tablosuna kaydedilir; HTML'e IUEmailRender çevirir.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const R = window.IUEmailRender;
  const BLOCKS = {
    header: { icon: '🏷️', name: 'Logo başlığı', def: { style: 'navy', align: 'left' } },
    heading: { icon: '🔠', name: 'Başlık', def: { text: 'Başlık yazın', size: 26, align: 'left', color: '#0A2A5E' } },
    text: { icon: '📝', name: 'Metin', def: { html: '<p>Merhaba {{ad}},</p><p>Metninizi buraya yazın.</p>', align: 'left', size: 15 } },
    image: { icon: '🖼️', name: 'Görsel', def: { src: '', alt: '', href: '', width: 100, align: 'center', radius: 10 } },
    button: { icon: '🔘', name: 'Buton', def: { text: 'Hemen İncele', href: 'https://ismailunsal.com.tr', align: 'center', bg: '#2563EB', color: '#FFFFFF', radius: 10 } },
    listings: { icon: '🏠', name: 'İlanlar', def: { ids: [], columns: 1 } },
    imagetext: { icon: '🧩', name: 'Görsel + metin', def: { src: '', html: '<h3>Başlık</h3><p>Kısa açıklama</p>', side: 'left' } },
    contact: { icon: '📞', name: 'İletişim kutusu', def: { title: 'Bilgi almak ister misiniz?' } },
    divider: { icon: '➖', name: 'Ayırıcı çizgi', def: { color: '#E5E7EB' } },
    spacer: { icon: '↕️', name: 'Boşluk', def: { h: 24 } }
  };
  let design = { settings: {}, blocks: [] };
  let selIdx = -1;             // -1 = genel ayarlar
  let templates = [];
  let currentId = null;
  let props = {};              // id → ilan
  let propList = [];
  let dirty = false;
  let renderTimer = null;

  const uid = () => Math.random().toString(36).slice(2, 10);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const safeImg = (u) => /^https:\/\/[^\s"'<>()]+$/i.test(String(u || '').trim()) ? String(u).trim() : '';

  function setDirty(v) { dirty = v; $('saveBtn').textContent = v ? '💾 Kaydet *' : '💾 Kaydet'; }
  function preview() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      const html = R.render(design, { props }).replace(/\{\{\s*ad\s*\}\}/g, 'Ahmet Bey').replace(/\{\{\s*abonelik_iptal\s*\}\}/g, '#');
      const f = $('pv'); const y = f.contentWindow ? f.contentWindow.scrollY : 0;
      f.srcdoc = html;
      f.onload = () => { try { f.contentWindow.scrollTo(0, y); } catch (_) {} };
    }, 120);
  }
  function changed() { setDirty(true); preview(); }

  // ---------- Blok listesi ----------
  function blockLabel(b) {
    const t = BLOCKS[b.type] || { name: b.type, icon: '•' };
    let extra = '';
    if (b.type === 'heading' || b.type === 'button') extra = b.text || '';
    if (b.type === 'text') extra = String(b.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (b.type === 'listings') extra = (b.ids || []).length + ' ilan';
    return t.icon + ' ' + t.name + (extra ? ' — ' + extra.slice(0, 40) : '');
  }
  function renderBlocks() {
    const box = $('blocks'); box.textContent = '';
    const g = document.createElement('div'); g.className = 'ed-b' + (selIdx === -1 ? ' sel' : '');
    const gn = document.createElement('span'); gn.className = 'n'; gn.textContent = '🎨 Genel ayarlar (renkler, yazı tipi)';
    g.appendChild(gn); g.onclick = () => { selIdx = -1; renderBlocks(); renderProps(); }; box.appendChild(g);
    design.blocks.forEach((b, i) => {
      const row = document.createElement('div'); row.className = 'ed-b' + (i === selIdx ? ' sel' : ''); row.draggable = true;
      const h = document.createElement('span'); h.className = 'h'; h.textContent = '⋮⋮';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = blockLabel(b);
      const mk = (t, title, fn) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = t; x.title = title; x.onclick = (e) => { e.stopPropagation(); fn(); }; return x; };
      row.append(h, n,
        mk('▲', 'Yukarı', () => move(i, -1)), mk('▼', 'Aşağı', () => move(i, 1)),
        mk('⧉', 'Kopyala', () => { design.blocks.splice(i + 1, 0, Object.assign(clone(b), { id: uid() })); selIdx = i + 1; renderBlocks(); renderProps(); changed(); }),
        mk('✕', 'Sil', () => { design.blocks.splice(i, 1); selIdx = Math.min(selIdx, design.blocks.length - 1); renderBlocks(); renderProps(); changed(); }));
      row.onclick = () => { selIdx = i; renderBlocks(); renderProps(); };
      row.addEventListener('dragstart', (e) => { row.classList.add('drag'); e.dataTransfer.setData('text/plain', String(i)); });
      row.addEventListener('dragend', () => row.classList.remove('drag'));
      row.addEventListener('dragover', (e) => e.preventDefault());
      row.addEventListener('drop', (e) => {
        e.preventDefault(); const from = +e.dataTransfer.getData('text/plain'); if (!Number.isInteger(from) || from === i) return;
        const [m] = design.blocks.splice(from, 1); design.blocks.splice(i, 0, m); selIdx = i; renderBlocks(); renderProps(); changed();
      });
      box.appendChild(row);
    });
  }
  function move(i, d) {
    const j = i + d; if (j < 0 || j >= design.blocks.length) return;
    [design.blocks[i], design.blocks[j]] = [design.blocks[j], design.blocks[i]]; selIdx = j; renderBlocks(); renderProps(); changed();
  }
  function addBlock(type) {
    const b = Object.assign({ id: uid(), type }, clone(BLOCKS[type].def));
    const at = selIdx >= 0 ? selIdx + 1 : design.blocks.length;
    design.blocks.splice(at, 0, b); selIdx = at; renderBlocks(); renderProps(); changed();
  }

  // ---------- Özellik paneli ----------
  function field(label, input) { const g = document.createElement('div'); g.className = 'form-group'; const l = document.createElement('label'); l.className = 'form-label'; l.textContent = label; g.append(l, input); return g; }
  function inp(val, on, attrs = {}) { const i = document.createElement('input'); i.className = 'form-input'; i.value = val == null ? '' : val; Object.assign(i, attrs); i.addEventListener('input', () => on(i.value)); return i; }
  function sel(val, opts, on) { const s = document.createElement('select'); s.className = 'form-select'; opts.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; s.appendChild(o); }); s.value = val; s.addEventListener('change', () => on(s.value)); return s; }
  function colorInp(val, on) {
    const w = document.createElement('div'); w.className = 'ed-color';
    const c = document.createElement('input'); c.type = 'color'; c.value = /^#[0-9a-f]{6}$/i.test(val || '') ? val : '#2563EB';
    const t = document.createElement('input'); t.className = 'form-input'; t.value = c.value; t.maxLength = 7;
    c.addEventListener('input', () => { t.value = c.value; on(c.value); });
    t.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) { c.value = t.value; on(t.value); } });
    w.append(c, t); return w;
  }
  const ALIGN = [['left', 'Sola'], ['center', 'Ortaya'], ['right', 'Sağa']];
  async function upload(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!/^(jpe?g|png|webp|gif)$/.test(ext)) throw new Error('Sadece JPG, PNG, WEBP veya GIF');
    if (file.size > 5 * 1024 * 1024) throw new Error('Görsel 5MB\'dan küçük olmalı');
    const name = `email/${Date.now()}-${uid()}.${ext}`;
    const { error } = await supabaseClient.storage.from('blog-photos').upload(name, file, { cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return supabaseClient.storage.from('blog-photos').getPublicUrl(name).data.publicUrl;
  }
  function imageField(b, key) {
    const w = document.createElement('div');
    const pv = document.createElement('img'); pv.style.cssText = 'width:100%;max-height:120px;object-fit:cover;border-radius:8px;background:#E2E8F0;margin-bottom:6px;display:' + (safeImg(b[key]) ? 'block' : 'none');
    if (safeImg(b[key])) pv.src = b[key];
    const url = inp(b[key], v => { b[key] = v; const u = safeImg(v); pv.style.display = u ? 'block' : 'none'; if (u) pv.src = u; changed(); }, { placeholder: 'https://… veya yükleyin' });
    const up = document.createElement('label'); up.className = 'btn btn-outline btn-sm'; up.style.cssText = 'cursor:pointer;margin-top:6px;'; up.textContent = '📷 Bilgisayardan yükle';
    const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/jpeg,image/png,image/webp,image/gif'; f.hidden = true; up.appendChild(f);
    f.addEventListener('change', async () => {
      const file = f.files[0]; f.value = ''; if (!file) return;
      try { const u = await upload(file); b[key] = u; url.value = u; pv.src = u; pv.style.display = 'block'; changed(); App.toast('Görsel yüklendi', 'success'); }
      catch (e) { App.toast(e.message, 'error'); }
    });
    w.append(pv, url, up); return w;
  }
  function richField(b) {
    const host = document.createElement('div');
    const ed = RichEditor.create(host, { compact: true, html: b.html });
    ed.el.addEventListener('input', () => { b.html = ed.getHTML(); changed(); });
    return host;
  }

  function renderProps() {
    const P = $('props'); P.textContent = '';
    const h = document.createElement('h3');
    if (selIdx === -1) {
      h.textContent = '🎨 Genel ayarlar'; P.appendChild(h);
      const S = design.settings;
      P.appendChild(field('Arka plan rengi', colorInp(S.bg || '#F1F5F9', v => { S.bg = v; changed(); })));
      P.appendChild(field('İçerik alanı rengi', colorInp(S.content || '#FFFFFF', v => { S.content = v; changed(); })));
      P.appendChild(field('Vurgu rengi (buton, link)', colorInp(S.accent || '#2563EB', v => { S.accent = v; changed(); })));
      P.appendChild(field('Yazı rengi', colorInp(S.text || '#1F2937', v => { S.text = v; changed(); })));
      P.appendChild(field('Yazı tipi', sel(S.font || 'Arial', [['Arial', 'Arial (sade)'], ['Verdana', 'Verdana (okunaklı)'], ['Trebuchet', 'Trebuchet'], ['Georgia', 'Georgia (klasik)']], v => { S.font = v; changed(); })));
      const tip = document.createElement('div'); tip.className = 'ed-tip';
      tip.textContent = 'İpucu: Metinlerde {{ad}} yazarsanız her alıcıda kendi adı görünür. En alttaki "Abonelikten çık" bağlantısı yasal zorunluluktur ve otomatik eklenir.';
      P.appendChild(tip); return;
    }
    const b = design.blocks[selIdx]; if (!b) return;
    h.textContent = (BLOCKS[b.type] || {}).icon + ' ' + (BLOCKS[b.type] || {}).name; P.appendChild(h);
    switch (b.type) {
      case 'header':
        P.appendChild(field('Stil', sel(b.style || 'navy', [['navy', 'Lacivert zemin'], ['white', 'Beyaz zemin']], v => { b.style = v; changed(); })));
        P.appendChild(field('Hizalama', sel(b.align || 'left', [['left', 'Sola'], ['center', 'Ortaya']], v => { b.align = v; changed(); })));
        break;
      case 'heading':
        P.appendChild(field('Başlık metni', inp(b.text, v => { b.text = v; renderBlocksSoft(); changed(); }, { maxLength: 150 })));
        P.appendChild(field('Yazı boyutu', sel(String(b.size || 26), [['20', 'Küçük'], ['26', 'Orta'], ['32', 'Büyük'], ['40', 'Çok büyük']], v => { b.size = +v; changed(); })));
        P.appendChild(field('Hizalama', sel(b.align || 'left', ALIGN, v => { b.align = v; changed(); })));
        P.appendChild(field('Renk', colorInp(b.color || '#0A2A5E', v => { b.color = v; changed(); })));
        break;
      case 'text':
        P.appendChild(field('Metin', richField(b)));
        P.appendChild(field('Hizalama', sel(b.align || 'left', ALIGN, v => { b.align = v; changed(); })));
        P.appendChild(field('Yazı boyutu', sel(String(b.size || 15), [['13', 'Küçük'], ['15', 'Normal'], ['17', 'Büyük']], v => { b.size = +v; changed(); })));
        break;
      case 'image':
        P.appendChild(field('Görsel', imageField(b, 'src')));
        P.appendChild(field('Tıklanınca gidilecek adres (isteğe bağlı)', inp(b.href, v => { b.href = v; changed(); }, { placeholder: 'https://…' })));
        P.appendChild(field('Genişlik', sel(String(b.width || 100), [['100', 'Tam genişlik'], ['75', '%75'], ['50', 'Yarım'], ['35', 'Küçük']], v => { b.width = +v; changed(); })));
        P.appendChild(field('Hizalama', sel(b.align || 'center', ALIGN, v => { b.align = v; changed(); })));
        P.appendChild(field('Açıklama (görme engelliler için)', inp(b.alt, v => { b.alt = v; changed(); }, { maxLength: 120 })));
        break;
      case 'button':
        P.appendChild(field('Buton yazısı', inp(b.text, v => { b.text = v; renderBlocksSoft(); changed(); }, { maxLength: 40 })));
        P.appendChild(field('Link', inp(b.href, v => { b.href = v; changed(); }, { placeholder: 'https://ismailunsal.com.tr/...' })));
        P.appendChild(field('Hizalama', sel(b.align || 'center', ALIGN, v => { b.align = v; changed(); })));
        P.appendChild(field('Buton rengi', colorInp(b.bg || '#2563EB', v => { b.bg = v; changed(); })));
        P.appendChild(field('Yazı rengi', colorInp(b.color || '#FFFFFF', v => { b.color = v; changed(); })));
        P.appendChild(field('Köşe', sel(String(b.radius ?? 10), [['0', 'Keskin'], ['10', 'Yuvarlak'], ['30', 'Hap']], v => { b.radius = +v; changed(); })));
        break;
      case 'listings': {
        P.appendChild(field('Düzen', sel(String(b.columns || 1), [['1', 'Alt alta (büyük)'], ['2', 'Yan yana (2 sütun)']], v => { b.columns = +v; changed(); })));
        const q = inp('', v => draw(v), { placeholder: '🔍 İlan ara…' });
        const box = document.createElement('div'); box.className = 'ed-plist';
        const draw = (v) => {
          box.textContent = ''; const qq = String(v || '').toLocaleLowerCase('tr-TR');
          propList.filter(p => !qq || (p.baslik_tr || '').toLocaleLowerCase('tr-TR').includes(qq) || (p.ilce || '').toLocaleLowerCase('tr-TR').includes(qq)).slice(0, 200).forEach(p => {
            const l = document.createElement('label'); const c = document.createElement('input'); c.type = 'checkbox'; c.checked = (b.ids || []).includes(p.id);
            c.onchange = () => { b.ids = b.ids || []; if (c.checked) { if (b.ids.length >= 12) { c.checked = false; App.toast('En fazla 12 ilan', 'warning'); return; } b.ids.push(p.id); } else b.ids = b.ids.filter(x => x !== p.id); renderBlocksSoft(); changed(); };
            const im = document.createElement('img'); const u = (p.property_images || []).find(i => i.ana_foto) || (p.property_images || [])[0]; if (u && safeImg(u.url)) im.src = u.url; im.alt = '';
            const t = document.createElement('span'); t.textContent = (p.baslik_tr || 'İlan') + (p.ilce ? ' · ' + p.ilce : '');
            l.append(c, im, t); box.appendChild(l);
          });
          if (!box.children.length) box.textContent = 'İlan bulunamadı';
        };
        draw('');
        P.appendChild(field('İlanları seçin (en fazla 12)', q)); P.appendChild(box);
        break;
      }
      case 'imagetext':
        P.appendChild(field('Görsel', imageField(b, 'src')));
        P.appendChild(field('Görsel tarafı', sel(b.side || 'left', [['left', 'Solda'], ['right', 'Sağda']], v => { b.side = v; changed(); })));
        P.appendChild(field('Metin', richField(b)));
        break;
      case 'contact':
        P.appendChild(field('Kutu başlığı', inp(b.title, v => { b.title = v; changed(); }, { maxLength: 80 })));
        break;
      case 'divider':
        P.appendChild(field('Çizgi rengi', colorInp(b.color || '#E5E7EB', v => { b.color = v; changed(); })));
        break;
      case 'spacer':
        P.appendChild(field('Yükseklik', sel(String(b.h || 24), [['12', 'Az'], ['24', 'Orta'], ['48', 'Çok'], ['80', 'Çok fazla']], v => { b.h = +v; changed(); })));
        break;
    }
  }
  function renderBlocksSoft() { const rows = $('blocks').querySelectorAll('.ed-b .n'); const b = design.blocks[selIdx]; if (b && rows[selIdx + 1]) rows[selIdx + 1].textContent = blockLabel(b); }

  // ---------- Şablonlar ----------
  async function loadTemplates() {
    const { data, error } = await supabaseClient.from('email_templates').select('id,name,subject,design,updated_at').order('updated_at', { ascending: false }).limit(200);
    if (error) { App.toast('Tasarımlar okunamadı (SQL kurulumu yapıldı mı?): ' + error.message, 'warning'); templates = []; }
    else templates = data || [];
    const s = $('tplSel'); s.textContent = '';
    const g1 = document.createElement('optgroup'); g1.label = 'Kayıtlı tasarımlarım';
    templates.forEach(t => { const o = document.createElement('option'); o.value = 'id:' + t.id; o.textContent = t.name || 'Adsız'; g1.appendChild(o); });
    const g2 = document.createElement('optgroup'); g2.label = 'Hazır şablonla yeni başla';
    Object.entries(R.TEMPLATES).forEach(([k, t]) => { const o = document.createElement('option'); o.value = 'new:' + k; o.textContent = '➕ ' + t.name; g2.appendChild(o); });
    if (templates.length) s.appendChild(g1); s.appendChild(g2);
    s.value = currentId ? 'id:' + currentId : 'new:ilan';
  }
  function openValue(v) {
    if (v.startsWith('id:')) {
      const t = templates.find(x => 'id:' + x.id === v); if (!t) return;
      currentId = t.id; design = normalize(t.design); $('tplName').value = t.name || ''; $('tplSubject').value = t.subject || '';
    } else {
      const t = R.TEMPLATES[v.slice(4)]; if (!t) return;
      currentId = null; design = normalize(clone(t.design)); $('tplName').value = ''; $('tplSubject').value = '';
    }
    selIdx = -1; renderBlocks(); renderProps(); preview(); setDirty(false);
    $('delBtn').disabled = !currentId;
    const u = new URL(location.href); if (currentId) u.searchParams.set('id', currentId); else u.searchParams.delete('id'); history.replaceState(null, '', u);
  }
  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    return { settings: d.settings && typeof d.settings === 'object' ? d.settings : {}, blocks: (Array.isArray(d.blocks) ? d.blocks : []).filter(b => b && BLOCKS[b.type]).map(b => Object.assign({ id: uid() }, b)) };
  }
  async function save(asNew) {
    const name = $('tplName').value.trim().slice(0, 80);
    if (!name) { App.toast('Tasarıma bir ad verin', 'warning'); $('tplName').focus(); return; }
    const row = { name, subject: $('tplSubject').value.trim().slice(0, 150) || null, design, updated_at: new Date().toISOString() };
    try {
      const res = (currentId && !asNew)
        ? await supabaseClient.from('email_templates').update(row).eq('id', currentId).select().single()
        : await supabaseClient.from('email_templates').insert(Object.assign({ created_by: App.currentUser && App.currentUser.id }, row)).select().single();
      if (res.error) throw res.error;
      currentId = res.data.id; setDirty(false); App.toast('Tasarım kaydedildi', 'success');
      await loadTemplates(); $('delBtn').disabled = false;
      const u = new URL(location.href); u.searchParams.set('id', currentId); history.replaceState(null, '', u);
    } catch (e) { App.toast(e.message, 'error'); }
  }
  async function del() {
    if (!currentId || !(await App.confirm('Bu tasarım silinsin mi?'))) return;
    const { error } = await supabaseClient.from('email_templates').delete().eq('id', currentId);
    if (error) { App.toast(error.message, 'error'); return; }
    App.toast('Silindi', 'success'); currentId = null; await loadTemplates(); openValue('new:ilan');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('email-tasarim'))) return;
    Object.entries(BLOCKS).forEach(([k, v]) => {
      const b = document.createElement('button'); b.type = 'button';
      const i = document.createElement('b'); i.textContent = v.icon; b.append(i, document.createTextNode(v.name));
      b.onclick = () => addBlock(k); $('palette').appendChild(b);
    });
    try {
      const { data } = await supabaseClient.from('properties').select('id,slug,baslik_tr,ilce,mahalle,fiyat,para_birimi,m2,oda_sayisi,property_images(url,ana_foto,sira)').eq('durum', 'aktif').order('created_at', { ascending: false }).limit(300);
      propList = data || []; props = Object.fromEntries(propList.map(p => [p.id, p]));
    } catch (_) {}
    await loadTemplates();
    const qid = new URLSearchParams(location.search).get('id');
    if (qid && templates.some(t => t.id === qid)) { currentId = qid; $('tplSel').value = 'id:' + qid; openValue('id:' + qid); }
    else openValue('new:ilan');
    $('tplSel').addEventListener('change', async (e) => {
      if (dirty && !(await App.confirm('Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?'))) { $('tplSel').value = currentId ? 'id:' + currentId : $('tplSel').value; return; }
      openValue(e.target.value);
    });
    $('saveBtn').onclick = () => save(false);
    $('saveAsBtn').onclick = () => save(true);
    $('delBtn').onclick = del;
    $('tplName').addEventListener('input', () => setDirty(true));
    $('tplSubject').addEventListener('input', () => setDirty(true));
    $('pvMob').onclick = () => $('pv').classList.add('mob');
    $('pvDesk').onclick = () => $('pv').classList.remove('mob');
    window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  });
})();
