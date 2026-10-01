/**
 * Panel — Kişi listeleri (marketing_contacts): CSV içe aktarma, etiket (liste) yönetimi.
 * CSV tarayıcıda ayrıştırılır; tüm hücreler metin olarak işlenir (textContent), e-postalar doğrulanır.
 * CSV dışa aktarımda formül enjeksiyonu (=,+,-,@) engellenir.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const EMAIL_RE = /^[^\s@<>"',;:()\[\]\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
  let parsed = [];            // {email,name,phone,region}
  let contacts = [];
  let activeTag = '';
  let shown = 200;

  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
  const tagClean = (t) => clean(t, 40).replace(/[",{}\\]/g, '');

  // --- CSV ayrıştırıcı (tırnaklı alanlar, ; veya , ayırıcı) ---
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
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
    if (iE < 0) { // başlık yoksa e-postayı içeren sütunu bul
      iE = rows[0].findIndex(v => EMAIL_RE.test(String(v).trim())); start = 0;
      if (iE < 0) return [];
    }
    return rows.slice(start).map(r => ({
      email: clean(r[iE], 254).toLowerCase(),
      name: iN >= 0 && iN !== iE ? clean(r[iN], 80) : '',
      phone: iP >= 0 ? clean(r[iP], 30) : '',
      region: iR >= 0 ? clean(r[iR], 60) : ''
    }));
  }

  function showParsed() {
    const valid = parsed.filter(r => EMAIL_RE.test(r.email));
    const uniq = new Map(); valid.forEach(r => { if (!uniq.has(r.email)) uniq.set(r.email, r); });
    const bad = parsed.length - valid.length;
    $('csvInfo').textContent = '';
    const s = document.createElement('div');
    s.innerHTML = `<i class="ic ic-check-circle" aria-hidden="true"></i> <b></b> geçerli kişi` + (bad ? ` · <span class="kl-bad"><i class="ic ic-alert" aria-hidden="true"></i> <b></b> satırda e-posta geçersiz (atlanacak)</span>` : '') + (valid.length !== uniq.size ? ` · ${valid.length - uniq.size} tekrar birleştirildi` : '');
    s.querySelectorAll('b')[0].textContent = uniq.size; if (bad) s.querySelectorAll('b')[1].textContent = bad;
    $('csvInfo').appendChild(s);
    parsed = [...uniq.values()];
    const pv = $('csvPrev'); pv.textContent = ''; pv.hidden = !parsed.length;
    const t = document.createElement('table'); const hr = document.createElement('tr');
    ['E-posta', 'Ad', 'Telefon', 'Bölge'].forEach(x => { const th = document.createElement('th'); th.textContent = x; hr.appendChild(th); }); t.appendChild(hr);
    parsed.slice(0, 50).forEach(r => { const tr = document.createElement('tr'); [r.email, r.name, r.phone, r.region].forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); t.appendChild(tr); });
    pv.appendChild(t);
    if (parsed.length > 50) { const m = document.createElement('div'); m.style.cssText = 'padding:6px 8px;color:#64748B'; m.textContent = `… ve ${parsed.length - 50} kişi daha`; pv.appendChild(m); }
    updateBtn();
  }
  function updateBtn() { $('importBtn').disabled = !(parsed.length && tagClean($('listName').value) && $('consent').checked); }

  function readFile(f) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { App.toast('Dosya 5MB\'dan küçük olmalı', 'error'); return; }
    const rd = new FileReader();
    rd.onload = () => {
      // Excel (Türkçe Windows) CSV'leri çoğu zaman windows-1254 kaydeder: önce UTF-8 dene
      let txt = '';
      try { txt = new TextDecoder('utf-8', { fatal: true }).decode(rd.result); }
      catch (_) { try { txt = new TextDecoder('windows-1254').decode(rd.result); } catch (__) { txt = new TextDecoder('iso-8859-9').decode(rd.result); } }
      parsed = mapRows(parseCSV(txt));
      if (!parsed.length) { $('csvInfo').textContent = 'Dosyada e-posta sütunu bulunamadı.'; $('csvPrev').hidden = true; updateBtn(); return; }
      if (!$('listName').value) $('listName').value = tagClean(f.name.replace(/\.[a-z]+$/i, '')).slice(0, 40);
      showParsed();
    };
    rd.readAsArrayBuffer(f);
  }

  async function upsertContacts(list, tag, source) {
    let added = 0, updated = 0;
    for (let i = 0; i < list.length; i += 400) {
      const chunk = list.slice(i, i + 400);
      const { data: ex, error: e1 } = await supabaseClient.from('marketing_contacts').select('email,tags,full_name,phone,ilce').in('email', chunk.map(c => c.email));
      if (e1) throw e1;
      const exMap = new Map((ex || []).map(r => [r.email, r]));
      const rows = chunk.map(c => {
        const old = exMap.get(c.email);
        const tags = Array.from(new Set([...(old && old.tags || []), tag])).slice(0, 30);
        old ? updated++ : added++;
        return { email: c.email, full_name: c.name || (old && old.full_name) || null, phone: c.phone || (old && old.phone) || null, ilce: c.region || (old && old.ilce) || null, tags, source: old ? undefined : source, consent: true };
      }).map(r => { if (r.source === undefined) delete r.source; return r; });
      const { error } = await supabaseClient.from('marketing_contacts').upsert(rows, { onConflict: 'email' });
      if (error) throw error;
    }
    return { added, updated };
  }

  async function doImport() {
    const tag = tagClean($('listName').value);
    if (!tag || !parsed.length || !$('consent').checked) return;
    const btn = $('importBtn'); btn.disabled = true; btn.textContent = 'Ekleniyor...';
    try {
      const r = await upsertContacts(parsed, tag, 'csv');
      App.toast(`${r.added} yeni kişi eklendi, ${r.updated} kişi güncellendi → "${tag}"`, 'success', 'İçe aktarıldı');
      try { await Security.logSecurityEvent('contacts_imported', { tag, count: parsed.length }, 'info'); } catch (_) {}
      parsed = []; $('csvPrev').hidden = true; $('csvInfo').textContent = ''; $('consent').checked = false;
      activeTag = tag; await loadContacts();
    } catch (e) { App.toast(e.message.includes('marketing_contacts') ? 'Veritabanı kurulumu eksik (SQL dosyasını çalıştırın)' : e.message, 'error'); }
    finally { App.iconText(btn, 'plus', 'Listeye ekle'); updateBtn(); }
  }

  async function addOne() {
    const email = clean($('oneEmail').value, 254).toLowerCase(), name = clean($('oneName').value, 80);
    const tag = tagClean($('listName').value) || 'Manuel';
    if (!EMAIL_RE.test(email)) { App.toast('Geçerli e-posta girin', 'warning'); return; }
    try { await upsertContacts([{ email, name }], tag, 'manuel'); $('oneEmail').value = ''; $('oneName').value = ''; App.toast('Eklendi → ' + tag, 'success'); loadContacts(); }
    catch (e) { App.toast(e.message, 'error'); }
  }

  async function loadContacts() {
    const { data, error } = await supabaseClient.from('marketing_contacts').select('id,email,full_name,phone,ilce,tags,unsubscribed,source,created_at').order('created_at', { ascending: false }).limit(20000);
    if (error) { $('rows').textContent = ''; $('total').textContent = '— kurulum gerekli'; App.toast('Kişi listesi okunamadı. SQL kurulumu yapıldı mı?', 'warning'); return; }
    contacts = data || [];
    renderTags(); renderRows();
  }
  function renderTags() {
    const counts = new Map();
    contacts.forEach(c => (c.tags || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
    const box = $('tags'); box.textContent = '';
    const mk = (t, label, n) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kl-tag' + (activeTag === t ? ' on' : ''); b.textContent = label; const s = document.createElement('small'); s.textContent = n; b.appendChild(s); b.onclick = () => { activeTag = t; shown = 200; renderTags(); renderRows(); }; box.appendChild(b); };
    mk('', 'Tümü', contacts.length);
    [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([t, n]) => mk(t, t, n));
    const dl = $('tagList'); dl.textContent = ''; [...counts.keys()].forEach(t => { const o = document.createElement('option'); o.value = t; dl.appendChild(o); });
  }
  function filtered() {
    const q = $('search').value.trim().toLocaleLowerCase('tr-TR');
    return contacts.filter(c => (!activeTag || (c.tags || []).includes(activeTag)) && (!q || (c.email + ' ' + (c.full_name || '')).toLocaleLowerCase('tr-TR').includes(q)));
  }
  function renderRows() {
    const list = filtered(); $('total').textContent = '(' + list.length + ')';
    const tb = $('rows'); tb.textContent = '';
    list.slice(0, shown).forEach(c => {
      const tr = document.createElement('tr');
      const td = (v) => { const x = document.createElement('td'); if (v instanceof Node) x.appendChild(v); else x.textContent = v || ''; tr.appendChild(x); return x; };
      td(c.email); td(c.full_name);
      const tg = document.createElement('div'); (c.tags || []).forEach(t => { const s = document.createElement('span'); s.className = 'kl-chip'; s.textContent = t; tg.appendChild(s); }); td(tg);
      const st = document.createElement('span'); st.className = 'badge ' + (c.unsubscribed ? 'badge-gray' : 'badge-success'); st.textContent = c.unsubscribed ? 'Çıktı' : 'Aktif'; td(st);
      const act = document.createElement('div'); act.style.cssText = 'display:flex;gap:4px;justify-content:flex-end;';
      if (activeTag) { const rm = document.createElement('button'); rm.className = 'btn btn-outline btn-sm'; rm.textContent = 'Listeden çıkar'; rm.onclick = () => removeTag(c); act.appendChild(rm); }
      const del = document.createElement('button'); del.className = 'btn btn-danger btn-sm'; App.iconText(del, 'trash'); del.title = 'Kişiyi tamamen sil'; del.setAttribute('aria-label', 'Kişiyi tamamen sil'); del.onclick = () => removeContact(c); act.appendChild(del);
      td(act);
      tb.appendChild(tr);
    });
    $('more').textContent = '';
    if (list.length > shown) { const b = document.createElement('button'); b.className = 'btn btn-outline btn-sm'; b.textContent = `Daha fazla göster (${list.length - shown})`; b.onclick = () => { shown += 300; renderRows(); }; $('more').appendChild(b); }
  }
  async function removeTag(c) {
    const tags = (c.tags || []).filter(t => t !== activeTag);
    const { error } = await supabaseClient.from('marketing_contacts').update({ tags }).eq('id', c.id);
    if (error) App.toast(error.message, 'error'); else { c.tags = tags; renderTags(); renderRows(); }
  }
  async function removeContact(c) {
    if (!(await App.confirm(`${c.email} tüm listelerden silinsin mi?`))) return;
    const { error } = await supabaseClient.from('marketing_contacts').delete().eq('id', c.id);
    if (error) App.toast(error.message, 'error'); else { contacts = contacts.filter(x => x.id !== c.id); renderTags(); renderRows(); }
  }
  function exportCSV() {
    const safe = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const lines = [['email', 'ad', 'telefon', 'bolge', 'listeler', 'durum'].join(';')];
    filtered().forEach(c => lines.push([c.email, c.full_name, c.phone, c.ilce, (c.tags || []).join(', '), c.unsubscribed ? 'cikti' : 'aktif'].map(safe).join(';')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kisiler' + (activeTag ? '-' + activeTag.replace(/[^a-z0-9]+/gi, '-') : '') + '.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('kisiler'))) return;
    const drop = $('drop');
    drop.onclick = () => $('csvFile').click();
    drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('csvFile').click(); } };
    $('csvFile').onchange = (e) => { readFile(e.target.files[0]); e.target.value = ''; };
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); readFile(e.dataTransfer.files[0]); });
    $('listName').addEventListener('input', updateBtn);
    $('consent').addEventListener('change', updateBtn);
    $('importBtn').onclick = doImport;
    $('oneBtn').onclick = addOne;
    $('search').addEventListener('input', () => { shown = 200; renderRows(); });
    $('exportBtn').onclick = exportCSV;
    loadContacts();
  });
  window.__IUKisiler = { parseCSV, mapRows };
})();
