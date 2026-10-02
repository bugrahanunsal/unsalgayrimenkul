/**
 * Panel — Müşteri Grupları
 * Aboneleri, mesaj bırakan müşterileri, hesap sahiplerini ve CSV/elle eklenen kişileri gruplara ayırır.
 * Kampanyalar sayfasında "Müşteri gruplarım" listesinden seçilir (sunucu kitleyi gruptan kendisi hesaplar).
 *  - Veriler: musteri_gruplari / musteri_grup_uyeleri (yalnızca admin; RLS), iu_grup_ozet(), iu_hesap_sahipleri()
 *  - Kişi bilgileri her zaman textContent ile yazılır; CSV dışa aktarımda formül enjeksiyonu engellenir.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const EMAIL_RE = /^[^\s@<>"',;:()\[\]\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const SRC = { abone: 'Abone', musteri: 'Mesaj bırakan', hesap: 'Hesap sahibi', liste: 'Kişi listesi', manuel: 'Elle eklendi', csv: 'CSV' };
  const KAT = { daire: 'Daire', villa: 'Villa', arsa: 'Arsa', isyeri: 'İşyeri' };
  let groups = [];
  let current = null;
  let members = [];
  let memberSet = new Set();
  let unsubSet = new Set();
  let srcTab = 'abone';
  const srcCache = {};
  const picked = new Set();
  let shown = 200;
  let csvRows = [];

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; }
  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
  const lower = (e) => String(e || '').trim().toLowerCase();
  const plural = (n, w) => Number(n || 0).toLocaleString('tr-TR') + ' ' + w;
  function dbError(e) {
    const m = String((e && e.message) || e || '');
    if (/musteri_grup|iu_grup_ozet|iu_hesap_sahipleri|does not exist|schema cache/i.test(m)) return 'Veritabanı kurulumu eksik: "supabase-spam-gruplar" SQL dosyasını Supabase\'de çalıştırın.';
    if (/duplicate key|musteri_gruplari_ad_uq|23505/i.test(m) || (e && e.code === '23505')) return 'Bu adda bir grup zaten var.';
    if (/check constraint/i.test(m)) return 'Geçersiz değer (grup adı en fazla 60 karakter olmalı ve < > " { } içermemeli).';
    return m || 'Beklenmeyen bir hata oluştu.';
  }

  // ---------------- gruplar ----------------
  async function loadGroups(selectId) {
    const { data, error } = await supabaseClient.rpc('iu_grup_ozet');
    if (error) { $('gList').textContent = ''; $('gList').appendChild(el('div', 'gr-empty', dbError(error))); return; }
    groups = Array.isArray(data) ? data : [];
    $('gCount').textContent = '(' + groups.length + ')';
    renderGroups();
    const want = selectId || (current && current.id) || decodeURIComponent(location.hash.slice(1));
    if (want && UUID_RE.test(want) && groups.some(g => g.id === want)) await select(want, true);
    else { current = null; showDetail(); }
  }
  function renderGroups() {
    const q = $('gSearch').value.trim().toLocaleLowerCase('tr-TR');
    const box = $('gList'); box.textContent = '';
    const list = groups.filter(g => !q || (g.ad + ' ' + (g.aciklama || '')).toLocaleLowerCase('tr-TR').includes(q));
    if (!groups.length) { box.appendChild(el('div', 'gr-empty', 'Henüz grup yok. "Yeni grup" ile ilk grubunuzu oluşturun.')); return; }
    if (!list.length) { box.appendChild(el('div', 'gr-empty', 'Aramaya uyan grup yok.')); return; }
    list.forEach(g => {
      const b = el('button', 'gr-item'); b.type = 'button'; b.dataset.id = g.id;
      b.setAttribute('aria-current', current && current.id === g.id ? 'true' : 'false');
      b.appendChild(el('b', null, g.ad));
      const extra = g.ulasilabilir < g.uye ? ' · ' + plural(g.uye - g.ulasilabilir, 'kişi çıktı') : '';
      b.appendChild(el('small', null, plural(g.uye, 'kişi') + extra));
      box.appendChild(b);
    });
  }

  async function select(id, keepScroll) {
    current = groups.find(g => g.id === id) || null;
    if (!current) { showDetail(); return; }
    try { history.replaceState(null, '', '#' + id); } catch (_) {}
    picked.clear(); shown = 200; $('mSearch').value = '';
    renderGroups();
    await loadMembers();
    showDetail();
    if (!keepScroll && window.matchMedia('(max-width:1100px)').matches) $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadMembers() {
    members = []; memberSet = new Set(); unsubSet = new Set();
    if (!current) return;
    const { data, error } = await supabaseClient.from('musteri_grup_uyeleri').select('email,ad,kaynak,eklendi_at').eq('grup_id', current.id).order('eklendi_at', { ascending: false }).limit(20000);
    if (error) { App.toast(dbError(error), 'error'); return; }
    members = data || [];
    memberSet = new Set(members.map(m => m.email));
    const emails = members.map(m => m.email);
    for (let i = 0; i < emails.length; i += 300) {
      const { data: u } = await supabaseClient.from('marketing_contacts').select('email').eq('unsubscribed', true).in('email', emails.slice(i, i + 300));
      (u || []).forEach(r => unsubSet.add(r.email));
    }
  }

  function showDetail() {
    $('noGroup').hidden = !!current;
    $('groupView').hidden = !current;
    $('editForm').hidden = true;
    if (!current) return;
    $('gName').textContent = current.ad;
    $('gDesc').textContent = current.aciklama || '';
    $('gDesc').hidden = !current.aciklama;
    const c = $('gCounts'); c.textContent = '';
    c.appendChild(el('span', null, plural(members.length, 'kişi')));
    if (unsubSet.size) c.appendChild(el('span', null, plural(unsubSet.size, 'kişi kampanyalardan çıktı')));
    $('sendLink').href = '/admin/campaigns.html?grup=' + encodeURIComponent(current.id);
    renderMembers();
    renderSource();
  }

  function renderMembers() {
    const q = $('mSearch').value.trim().toLocaleLowerCase('tr-TR');
    const list = members.filter(m => !q || (m.email + ' ' + (m.ad || '')).toLocaleLowerCase('tr-TR').includes(q));
    $('mCount').textContent = '(' + list.length + ')';
    const tb = $('mRows'); tb.textContent = '';
    if (!list.length) {
      const tr = el('tr'); const td = el('td', null, members.length ? 'Aramaya uyan kişi yok.' : 'Bu grup boş. Yukarıdan kişi ekleyin.');
      td.colSpan = 6; td.style.color = '#64748B'; td.style.padding = '18px 8px'; tr.appendChild(td); tb.appendChild(tr);
    }
    list.slice(0, shown).forEach(m => {
      const tr = el('tr');
      tr.appendChild(el('td', 'em', m.email));
      tr.appendChild(el('td', null, m.ad || ''));
      const s = el('td'); s.appendChild(el('span', 'gr-src', SRC[m.kaynak] || m.kaynak)); tr.appendChild(s);
      const st = el('td'); const out = unsubSet.has(m.email);
      st.appendChild(el('span', 'badge ' + (out ? 'badge-gray' : 'badge-success'), out ? 'Çıktı' : 'Aktif'));
      if (out) st.title = 'Bu kişi e-postalarımızdan çıktı; kampanya gönderilmez.';
      tr.appendChild(st);
      tr.appendChild(el('td', null, m.eklendi_at ? App.formatDate(m.eklendi_at) : ''));
      const act = el('td'); act.style.textAlign = 'right';
      const rm = el('button', 'btn btn-outline btn-sm'); rm.type = 'button'; rm.textContent = 'Çıkar';
      rm.title = 'Gruptan çıkar'; rm.dataset.email = m.email; rm.dataset.act = 'remove';
      act.appendChild(rm); tr.appendChild(act);
      tb.appendChild(tr);
    });
    $('mMore').textContent = '';
    if (list.length > shown) {
      const b = el('button', 'btn btn-outline btn-sm', 'Daha fazla göster (' + (list.length - shown) + ')'); b.type = 'button';
      b.addEventListener('click', () => { shown += 300; renderMembers(); });
      $('mMore').appendChild(b);
    }
  }

  async function removeMember(email) {
    if (!current) return;
    const { error } = await supabaseClient.from('musteri_grup_uyeleri').delete().eq('grup_id', current.id).eq('email', email);
    if (error) { App.toast(dbError(error), 'error'); return; }
    members = members.filter(m => m.email !== email); memberSet.delete(email);
    current.uye = Math.max(0, (current.uye || 1) - 1);
    App.toast(email + ' gruptan çıkarıldı', 'success');
    renderGroups(); showDetail();
  }

  // ---------------- kişi ekleme ----------------
  async function loadSource(src) {
    if (srcCache[src]) return srcCache[src];
    let list = [];
    if (src === 'abone') {
      const { data, error } = await supabaseClient.from('subscribers').select('email,full_name,language,ilgi_kategoriler,ilgi_bolgeler').eq('is_active', true).eq('email_verified', true).order('subscribed_at', { ascending: false }).limit(5000);
      if (error) throw error;
      list = (data || []).map(s => ({ email: lower(s.email), ad: s.full_name || '', kaynak: 'abone',
        meta: [(s.language || 'tr').toUpperCase(), (s.ilgi_kategoriler || []).map(k => KAT[k] || k).join(', '), (s.ilgi_bolgeler || []).join(', ')].filter(Boolean).join(' · ') }));
    } else if (src === 'musteri') {
      const { data, error } = await supabaseClient.from('leads').select('email,isim,created_at,durum').not('email', 'is', null).order('created_at', { ascending: false }).limit(5000);
      if (error) throw error;
      const seen = new Set();
      (data || []).forEach(l => {
        const e = lower(l.email);
        if (!e || seen.has(e) || l.durum === 'spam') return; seen.add(e);
        list.push({ email: e, ad: l.isim || '', kaynak: 'musteri', meta: 'Son mesaj: ' + App.formatDate(l.created_at) });
      });
    } else if (src === 'hesap') {
      const { data, error } = await supabaseClient.rpc('iu_hesap_sahipleri');
      if (error) throw error;
      list = (data || []).map(h => ({ email: lower(h.email), ad: h.ad || '', kaynak: 'hesap', meta: (h.bulten ? 'Bülten açık · ' : '') + 'Üyelik: ' + App.formatDate(h.kayit) }));
    }
    list = list.filter(x => EMAIL_RE.test(x.email));
    srcCache[src] = list;
    return list;
  }

  function setTab(src) {
    srcTab = src; picked.clear();
    document.querySelectorAll('#srcTabs .gr-tab').forEach(t => t.setAttribute('aria-selected', t.dataset.src === src ? 'true' : 'false'));
    $('pickPane').hidden = !['abone', 'musteri', 'hesap'].includes(src);
    $('manualPane').hidden = src !== 'manuel';
    $('csvPane').hidden = src !== 'csv';
    $('pickSearch').value = '';
    renderSource();
  }

  async function renderSource() {
    if (!current || $('pickPane').hidden) return;
    const box = $('pickList'); box.textContent = ''; box.appendChild(el('div', 'gr-empty', 'Yükleniyor…'));
    let list;
    try { list = await loadSource(srcTab); }
    catch (e) { box.textContent = ''; box.appendChild(el('div', 'gr-empty', dbError(e))); return; }
    const q = $('pickSearch').value.trim().toLocaleLowerCase('tr-TR');
    const vis = list.filter(x => !q || (x.email + ' ' + x.ad).toLocaleLowerCase('tr-TR').includes(q));
    box.textContent = '';
    const notes = { abone: 'Yalnızca e-postasını doğrulamış aktif aboneler listelenir.', musteri: 'Sitedeki formlardan e-postasıyla yazanlar (spam olarak işaretlenenler hariç).', hesap: 'Sitede üyelik hesabı açan müşteriler.' };
    $('pickNote').textContent = notes[srcTab] || '';
    if (!vis.length) { box.appendChild(el('div', 'gr-empty', list.length ? 'Aramaya uyan kişi yok.' : 'Bu kaynakta henüz kimse yok.')); updatePickBtn(); return; }
    vis.slice(0, 400).forEach(x => {
      const inG = memberSet.has(x.email);
      const lb = el('label', inG ? 'in' : '');
      const cb = el('input'); cb.type = 'checkbox'; cb.value = x.email; cb.disabled = inG; cb.checked = inG || picked.has(x.email);
      const who = el('span', 'who');
      who.appendChild(el('b', null, x.ad || x.email));
      who.appendChild(el('small', null, (x.ad ? x.email + ' · ' : '') + (inG ? 'Zaten grupta' : x.meta || '')));
      lb.append(cb, who); box.appendChild(lb);
    });
    if (vis.length > 400) box.appendChild(el('div', 'gr-empty', 'İlk 400 kişi gösteriliyor; aramayla daraltın.'));
    updatePickBtn();
  }
  function updatePickBtn() {
    const n = picked.size;
    $('pickAdd').disabled = !n;
    $('pickAdd').textContent = n ? 'Seçilenleri ekle (' + n + ')' : 'Seçilenleri ekle';
  }

  async function addMembers(rows) {
    if (!current || !rows.length) return 0;
    const payload = rows.filter(r => EMAIL_RE.test(r.email)).map(r => ({ grup_id: current.id, email: lower(r.email), ad: clean(r.ad, 100) || null, kaynak: r.kaynak }));
    let added = 0;
    for (let i = 0; i < payload.length; i += 500) {
      const chunk = payload.slice(i, i + 500);
      const { error } = await supabaseClient.from('musteri_grup_uyeleri').upsert(chunk, { onConflict: 'grup_id,email', ignoreDuplicates: true });
      if (error) throw error;
      added += chunk.filter(r => !memberSet.has(r.email)).length;
      chunk.forEach(r => memberSet.add(r.email));
    }
    try { await Security.logSecurityEvent('group_members_added', { grup_id: current.id, count: added }, 'info'); } catch (_) {}
    return added;
  }
  async function afterAdd(added) {
    App.toast(added ? plural(added, 'kişi') + ' "' + current.ad + '" grubuna eklendi' : 'Seçilen kişiler zaten grupta', added ? 'success' : 'info');
    const id = current.id;
    await loadGroups(id);
  }

  async function addPicked() {
    const list = srcCache[srcTab] || [];
    const rows = list.filter(x => picked.has(x.email));
    const btn = $('pickAdd'); btn.disabled = true;
    try { const n = await addMembers(rows); picked.clear(); await afterAdd(n); }
    catch (e) { App.toast(dbError(e), 'error'); }
    finally { updatePickBtn(); }
  }

  function parseEmails(text) {
    return [...new Set(String(text || '').split(/[\s,;]+/).map(lower).filter(e => EMAIL_RE.test(e)))].slice(0, 2000);
  }
  function updateManual() {
    const n = parseEmails($('manualEmails').value).length;
    $('manualNote').textContent = n ? plural(n, 'geçerli e-posta') : '';
    $('manualAdd').disabled = !(n && $('manualConsent').checked);
  }
  async function addManual() {
    const emails = parseEmails($('manualEmails').value);
    if (!emails.length || !$('manualConsent').checked) return;
    const btn = $('manualAdd'); btn.disabled = true;
    try { const n = await addMembers(emails.map(e => ({ email: e, ad: '', kaynak: 'manuel' }))); $('manualEmails').value = ''; $('manualConsent').checked = false; await afterAdd(n); }
    catch (e) { App.toast(dbError(e), 'error'); }
    finally { updateManual(); }
  }

  // ---------------- CSV ----------------
  function parseCSV(text) {
    text = String(text || '').replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.includes('\t') ? '\t' : ',');
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
      if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; if (rows.length > 20001) break; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim()));
  }
  const H = (h) => String(h || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
  function mapRows(rows) {
    if (!rows.length) return [];
    const head = rows[0].map(H);
    const find = (...names) => head.findIndex(h => names.some(n => h === n || h.includes(n)));
    let iE = find('email', 'eposta', 'mail');
    const iN = find('adsoyad', 'isim', 'ad', 'name', 'fullname', 'musteri');
    const iP = find('telefon', 'phone', 'tel', 'gsm', 'cep');
    const iR = find('bolge', 'ilce', 'sehir', 'region', 'city');
    let start = 1;
    if (iE < 0) { iE = rows[0].findIndex(v => EMAIL_RE.test(String(v).trim())); start = 0; if (iE < 0) return []; }
    return rows.slice(start).map(r => ({
      email: lower(clean(r[iE], 254)),
      name: iN >= 0 && iN !== iE ? clean(r[iN], 80) : '',
      phone: iP >= 0 ? clean(r[iP], 30) : '',
      region: iR >= 0 ? clean(r[iR], 60) : ''
    }));
  }
  function readFile(f) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { App.toast('Dosya 5 MB\'dan küçük olmalı', 'error'); return; }
    const rd = new FileReader();
    rd.onload = () => {
      let txt = '';
      try { txt = new TextDecoder('utf-8', { fatal: true }).decode(rd.result); }
      catch (_) { try { txt = new TextDecoder('windows-1254').decode(rd.result); } catch (__) { txt = new TextDecoder('iso-8859-9').decode(rd.result); } }
      const all = mapRows(parseCSV(txt));
      const valid = new Map(); let bad = 0;
      all.forEach(r => { if (EMAIL_RE.test(r.email)) { if (!valid.has(r.email)) valid.set(r.email, r); } else bad++; });
      csvRows = [...valid.values()];
      const info = $('csvInfo'); info.textContent = '';
      if (!all.length) info.textContent = 'Dosyada e-posta sütunu bulunamadı.';
      else info.textContent = plural(csvRows.length, 'geçerli kişi') + (bad ? ' · ' + plural(bad, 'satır') + ' geçersiz (atlanacak)' : '');
      updateCsv();
    };
    rd.readAsArrayBuffer(f);
  }
  function updateCsv() { $('csvAdd').disabled = !(csvRows.length && $('csvConsent').checked); }
  async function addCsv() {
    if (!csvRows.length || !$('csvConsent').checked) return;
    const btn = $('csvAdd'); btn.disabled = true; btn.textContent = 'Ekleniyor…';
    try {
      // Kişi bilgileri (ad, telefon, bölge) kişi kartına; "çıktı" olanların durumu DEĞİŞMEZ
      for (let i = 0; i < csvRows.length; i += 400) {
        const chunk = csvRows.slice(i, i + 400);
        const { data: ex, error: e1 } = await supabaseClient.from('marketing_contacts').select('email,full_name,phone,ilce').in('email', chunk.map(c => c.email));
        if (e1) throw e1;
        const old = new Map((ex || []).map(r => [r.email, r]));
        const rows = chunk.map(c => {
          const o = old.get(c.email);
          const r = { email: c.email, full_name: c.name || (o && o.full_name) || null, phone: c.phone || (o && o.phone) || null, ilce: c.region || (o && o.ilce) || null, consent: true };
          if (!o) r.source = 'csv';
          return r;
        });
        const { error } = await supabaseClient.from('marketing_contacts').upsert(rows, { onConflict: 'email' });
        if (error) throw error;
      }
      const n = await addMembers(csvRows.map(r => ({ email: r.email, ad: r.name, kaynak: 'csv' })));
      try { await Security.logSecurityEvent('contacts_imported', { grup_id: current.id, count: csvRows.length }, 'info'); } catch (_) {}
      csvRows = []; $('csvInfo').textContent = ''; $('csvConsent').checked = false;
      await afterAdd(n);
    } catch (e) { App.toast(dbError(e), 'error'); }
    finally { btn.textContent = 'Gruba ekle'; updateCsv(); }
  }

  function exportCSV() {
    if (!current) return;
    const safe = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const lines = [['email', 'ad', 'kaynak', 'durum', 'eklendi'].join(';')];
    members.forEach(m => lines.push([m.email, m.ad, SRC[m.kaynak] || m.kaynak, unsubSet.has(m.email) ? 'cikti' : 'aktif', m.eklendi_at ? m.eklendi_at.slice(0, 10) : ''].map(safe).join(';')));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'grup-' + (current.ad.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9ğüşöçı]+/gi, '-').replace(/^-|-$/g, '') || 'liste') + '.csv';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------------- grup oluştur / düzenle / sil ----------------
  async function createGroup(e) {
    e.preventDefault();
    const ad = clean($('newName').value, 60), aciklama = clean($('newDesc').value, 300);
    if (!ad) { $('newName').focus(); return; }
    const { data, error } = await supabaseClient.from('musteri_gruplari').insert({ ad, aciklama: aciklama || null }).select('id').single();
    if (error) { App.toast(dbError(error), 'error'); return; }
    $('newForm').reset(); $('newForm').hidden = true;
    try { await Security.logSecurityEvent('group_created', { grup_id: data.id }, 'info'); } catch (_) {}
    App.toast('"' + ad + '" grubu oluşturuldu', 'success');
    await loadGroups(data.id);
  }
  async function saveEdit(e) {
    e.preventDefault();
    if (!current) return;
    const ad = clean($('editName').value, 60), aciklama = clean($('editDesc').value, 300);
    if (!ad) { $('editName').focus(); return; }
    const { error } = await supabaseClient.from('musteri_gruplari').update({ ad, aciklama: aciklama || null }).eq('id', current.id);
    if (error) { App.toast(dbError(error), 'error'); return; }
    App.toast('Grup güncellendi', 'success');
    await loadGroups(current.id);
  }
  async function deleteGroup() {
    if (!current) return;
    if (!(await App.confirm('"' + current.ad + '" grubu silinsin mi? İçindeki ' + plural(members.length, 'kişi') + ' silinmez, yalnızca bu gruptan çıkar.', 'Grubu sil'))) return;
    const { error } = await supabaseClient.from('musteri_gruplari').delete().eq('id', current.id);
    if (error) { App.toast(dbError(error), 'error'); return; }
    try { await Security.logSecurityEvent('group_deleted', { grup_id: current.id }, 'warning'); } catch (_) {}
    App.toast('Grup silindi', 'success');
    current = null;
    try { history.replaceState(null, '', location.pathname); } catch (_) {}
    await loadGroups();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('gruplar'))) return;
    $('newBtn').addEventListener('click', () => { $('newForm').hidden = false; $('newName').focus(); });
    $('newCancel').addEventListener('click', () => { $('newForm').reset(); $('newForm').hidden = true; });
    $('newForm').addEventListener('submit', createGroup);
    $('gSearch').addEventListener('input', renderGroups);
    $('gList').addEventListener('click', (e) => { const b = e.target.closest('.gr-item'); if (b) select(b.dataset.id); });
    $('editBtn').addEventListener('click', () => { $('editName').value = current.ad; $('editDesc').value = current.aciklama || ''; $('editForm').hidden = false; $('editName').focus(); });
    $('editCancel').addEventListener('click', () => { $('editForm').hidden = true; });
    $('editForm').addEventListener('submit', saveEdit);
    $('delBtn').addEventListener('click', deleteGroup);
    $('srcTabs').addEventListener('click', (e) => { const t = e.target.closest('.gr-tab'); if (t) setTab(t.dataset.src); });
    $('pickSearch').addEventListener('input', () => { clearTimeout(window.__grq); window.__grq = setTimeout(renderSource, 200); });
    $('pickList').addEventListener('change', (e) => { const cb = e.target; if (cb && cb.type === 'checkbox' && !cb.disabled) { if (cb.checked) picked.add(cb.value); else picked.delete(cb.value); updatePickBtn(); } });
    $('pickAll').addEventListener('click', () => { $('pickList').querySelectorAll('input[type=checkbox]:not(:disabled)').forEach(cb => { cb.checked = true; picked.add(cb.value); }); updatePickBtn(); });
    $('pickAdd').addEventListener('click', addPicked);
    $('manualEmails').addEventListener('input', updateManual);
    $('manualConsent').addEventListener('change', updateManual);
    $('manualAdd').addEventListener('click', addManual);
    const drop = $('drop');
    drop.addEventListener('click', () => $('csvFile').click());
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('csvFile').click(); } });
    $('csvFile').addEventListener('change', (e) => { readFile(e.target.files[0]); e.target.value = ''; });
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); readFile(e.dataTransfer.files[0]); });
    $('csvConsent').addEventListener('change', updateCsv);
    $('csvAdd').addEventListener('click', addCsv);
    $('mSearch').addEventListener('input', () => { shown = 200; renderMembers(); });
    $('mRows').addEventListener('click', (e) => { const b = e.target.closest('[data-act="remove"]'); if (b) removeMember(b.dataset.email); });
    $('exportBtn').addEventListener('click', exportCSV);
    await loadGroups();
  });
  window.__IUGruplar = { parseCSV, mapRows, parseEmails };
})();
