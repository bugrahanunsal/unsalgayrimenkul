/**
 * Panel — E-posta kampanyası: kitle seç → tasarım seç → test → gönder.
 * Gönderim /api/admin/kampanya üzerinden (sunucu kitleyi kendisi hesaplar, iptal edenleri çıkarır).
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const R = window.IUEmailRender;
  const KATS = [['daire', 'Daire'], ['villa', 'Villa / Ev'], ['arsa', 'Arsa'], ['isyeri', 'İşyeri']];
  const DILLER = [['tr', 'Türkçe'], ['en', 'İngilizce'], ['de', 'Almanca'], ['fr', 'Fransızca'], ['ru', 'Rusça'], ['ar', 'Arapça']];
  let templates = [];
  let design = null;
  let props = {};
  let countTimer = null;
  let lastCount = 0;

  function chip(box, name, v, l) {
    const lb = document.createElement('label'); lb.className = 'chip';
    const i = document.createElement('input'); i.type = 'checkbox'; i.name = name; i.value = v;
    const s = document.createElement('span'); s.textContent = l; lb.append(i, s); box.appendChild(lb);
  }
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);

  function audience() {
    return {
      aboneler: $('useAbone').checked,
      musteriler: $('useMusteri').checked,
      listeler: $('useListe').checked ? checked('liste') : [],
      manuel: $('useManuel').checked ? $('manuel').value.slice(0, 20000) : '',
      filtre: { kategoriler: checked('kat'), bolgeler: checked('bolge'), diller: checked('dil') }
    };
  }
  async function api(body) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın.');
    const r = await fetch('/api/admin/kampanya', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(body) });
    let j = {}; try { j = await r.json(); } catch (_) {}
    if (!r.ok || !j.ok) throw new Error(j.message || ('İşlem başarısız (' + r.status + ')'));
    return j;
  }
  function refreshSources() {
    ['Abone', 'Musteri', 'Liste', 'Manuel'].forEach(k => $('src' + k).classList.toggle('on', $('use' + k).checked));
    scheduleCount();
  }
  function scheduleCount() { clearTimeout(countTimer); countTimer = setTimeout(count, 600); }
  async function count() {
    const a = audience();
    if (!a.aboneler && !a.musteriler && !a.listeler.length && !a.manuel.trim()) { $('cnt').textContent = '0'; $('cntNote').textContent = 'Kaynak seçin'; lastCount = 0; return; }
    $('cntNote').textContent = 'Hesaplanıyor…';
    try {
      const j = await api({ action: 'kitle', audience: a });
      lastCount = j.count; $('cnt').textContent = j.count.toLocaleString('tr-TR');
      $('cntNote').textContent = 'Tekrarlar birleştirildi' + (j.excluded_unsubscribed ? ` · ${j.excluded_unsubscribed} kişi abonelikten çıktığı için hariç` : '');
    } catch (e) { $('cntNote').textContent = e.message; }
  }

  // ---- tasarımlar ----
  async function loadTemplates(keep) {
    const cur = $('tplSel').value;
    const { data, error } = await supabaseClient.from('email_templates').select('id,name,subject,design').order('updated_at', { ascending: false }).limit(200);
    templates = error ? [] : (data || []);
    const s = $('tplSel'); s.textContent = '';
    const g1 = document.createElement('optgroup'); g1.label = 'Kayıtlı tasarımlarım';
    templates.forEach(t => { const o = document.createElement('option'); o.value = 'id:' + t.id; o.textContent = t.name || 'Adsız'; g1.appendChild(o); });
    const g2 = document.createElement('optgroup'); g2.label = 'Hazır şablonlar';
    Object.entries(R.TEMPLATES).forEach(([k, t]) => { const o = document.createElement('option'); o.value = 'new:' + k; o.textContent = t.name; g2.appendChild(o); });
    if (templates.length) s.appendChild(g1); s.appendChild(g2);
    const qid = new URLSearchParams(location.search).get('tasarim');
    s.value = keep && cur ? cur : (qid && templates.some(t => t.id === qid) ? 'id:' + qid : (templates[0] ? 'id:' + templates[0].id : 'new:bos'));
    await pickTemplate();
  }
  async function pickTemplate() {
    const v = $('tplSel').value;
    if (v.startsWith('id:')) {
      const t = templates.find(x => 'id:' + x.id === v); design = t ? t.design : null;
      if (t && t.subject && !$('subject').value) $('subject').value = t.subject;
      $('editTpl').href = '/admin/email-tasarim.html?id=' + encodeURIComponent(t ? t.id : '');
    } else {
      design = (R.TEMPLATES[v.slice(4)] || R.TEMPLATES.bos).design;
      $('editTpl').href = '/admin/email-tasarim.html';
    }
    const ids = [...new Set(((design && design.blocks) || []).filter(b => b.type === 'listings').flatMap(b => b.ids || []))].filter(id => !props[id]);
    if (ids.length) {
      const { data } = await supabaseClient.from('properties').select('id,slug,baslik_tr,ilce,mahalle,fiyat,para_birimi,m2,oda_sayisi,durum,property_images(url,ana_foto,sira)').in('id', ids);
      (data || []).filter(p => p.durum === 'aktif').forEach(p => { props[p.id] = p; });
    }
    preview();
  }
  function html() { return R.render(design || R.TEMPLATES.bos.design, { props, preheader: $('pre').value, subject: $('subject').value }); }
  function preview() { $('pv').srcdoc = html().replace(/\{\{\s*ad\s*\}\}/g, 'Ahmet Bey').replace(/\{\{\s*abonelik_iptal\s*\}\}/g, '#'); }

  function warn(m) { $('warn').textContent = m || ''; $('warn').style.display = m ? 'block' : 'none'; }
  function hasEmptyListings() { return ((design && design.blocks) || []).some(b => b.type === 'listings' && !(b.ids || []).some(id => props[id])); }

  async function sendTest() {
    const subject = $('subject').value.trim();
    if (subject.length < 3) { warn('Önce e-posta konusunu yazın.'); $('subject').focus(); return; }
    warn(''); const b = $('testBtn'); b.disabled = true;
    try { await api({ action: 'test', subject, html: html(), to: $('testTo').value.trim() }); App.toast('Test e-postası gönderildi: ' + $('testTo').value, 'success'); }
    catch (e) { warn(e.message); }
    finally { b.disabled = false; }
  }

  async function send() {
    const subject = $('subject').value.trim();
    if (subject.length < 3) { warn('E-posta konusunu yazın.'); $('subject').focus(); return; }
    await count();
    if (!lastCount) { warn('Seçilen kitlede gönderilecek kimse yok.'); return; }
    if (hasEmptyListings()) { warn('Tasarımdaki "İlanlar" bloğunda seçili aktif ilan yok. Tasarımı düzenleyin veya bloğu kaldırın.'); return; }
    warn('');
    if (!(await App.confirm(`"${subject}" konulu e-posta ${lastCount} kişiye gönderilecek.\n\nGönderdikten sonra geri alınamaz. Emin misiniz?`, 'Kampanyayı Gönder'))) return;
    const btn = $('sendBtn'); btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    const a = audience();
    let campId = null;
    try {
      const tplId = $('tplSel').value.startsWith('id:') ? $('tplSel').value.slice(3) : null;
      const ins = await supabaseClient.from('email_campaigns').insert({ subject, campaign_type: 'custom', status: 'sending', audience: a, template_id: tplId, created_by_id: App.currentUser && App.currentUser.id }).select('id').single();
      if (!ins.error) campId = ins.data.id;
    } catch (_) {}
    try {
      const j = await api({ action: 'gonder', subject, html: html(), preheader: $('pre').value, audience: a });
      if (campId) await supabaseClient.from('email_campaigns').update({ status: j.partial ? 'partial' : 'sent', sent_count: j.sent, sent_at: new Date().toISOString() }).eq('id', campId);
      try { await Security.logSecurityEvent('campaign_sent', { campaign_id: campId, recipient_count: j.sent }, 'info'); } catch (_) {}
      App.toast(`${j.sent} kişiye gönderildi${j.partial ? ' (bir kısmı gönderilemedi)' : ''}`, j.partial ? 'warning' : 'success', 'Kampanya');
      loadHistory();
    } catch (e) {
      if (campId) await supabaseClient.from('email_campaigns').update({ status: 'failed' }).eq('id', campId);
      warn(e.message); App.toast(e.message, 'error');
    } finally { btn.disabled = false; App.iconText(btn, 'send', 'Kampanyayı Gönder'); }
  }

  async function loadHistory() {
    const tb = $('hist'); tb.textContent = '';
    const { data, error } = await supabaseClient.from('email_campaigns').select('*').order('created_at', { ascending: false }).limit(50);
    const rows = error ? [] : (data || []);
    if (!rows.length) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 4; td.style.color = '#64748B'; td.textContent = 'Henüz kampanya gönderilmedi.'; tr.appendChild(td); tb.appendChild(tr); return; }
    const ST = { sent: ['Gönderildi', 'success'], sending: ['Gönderiliyor', 'info'], partial: ['Kısmen', 'warning'], failed: ['Başarısız', 'danger'], draft: ['Taslak', 'gray'] };
    rows.forEach(c => {
      const tr = document.createElement('tr');
      const td = (v) => { const x = document.createElement('td'); if (v instanceof Node) x.appendChild(v); else x.textContent = v == null ? '' : v; tr.appendChild(x); };
      td(App.formatDate(c.sent_at || c.created_at, true)); td(c.subject || '');
      td(c.sent_count != null ? c.sent_count : (c.recipient_count != null ? c.recipient_count : '—'));
      const st = ST[c.status] || [c.status || '—', 'gray']; const b = document.createElement('span'); b.className = 'badge badge-' + st[1]; b.textContent = st[0]; td(b);
      tb.appendChild(tr);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('campaigns'))) return;
    KATS.forEach(([v, l]) => chip($('fKat'), 'kat', v, l));
    (window.ILCELER || []).forEach(v => chip($('fBolge'), 'bolge', v, v));
    DILLER.forEach(([v, l]) => chip($('fDil'), 'dil', v, l));
    try {
      const { data } = await supabaseClient.from('marketing_contacts').select('tags').eq('unsubscribed', false).limit(20000);
      const cnt = new Map(); (data || []).forEach(r => (r.tags || []).forEach(t => cnt.set(t, (cnt.get(t) || 0) + 1)));
      if (cnt.size) [...cnt.entries()].sort((a, b) => b[1] - a[1]).forEach(([t, n]) => chip($('fListe'), 'liste', t, `${t} (${n})`));
      else { const m = document.createElement('div'); m.className = 'form-help'; m.textContent = 'Henüz liste yok.'; $('fListe').appendChild(m); }
    } catch (_) {}
    $('testTo').value = (App.currentUser && App.currentUser.email) || '';
    ['useAbone', 'useMusteri', 'useListe', 'useManuel'].forEach(id => $(id).addEventListener('change', refreshSources));
    document.querySelectorAll('.cp-sub').forEach(x => x.addEventListener('change', scheduleCount));
    $('manuel').addEventListener('input', scheduleCount);
    $('cntBtn').onclick = count;
    $('tplSel').addEventListener('change', pickTemplate);
    $('reloadTpl').onclick = () => loadTemplates(true);
    $('pre').addEventListener('input', () => { clearTimeout(window.__pt); window.__pt = setTimeout(preview, 400); });
    $('testBtn').onclick = sendTest;
    $('sendBtn').onclick = send;
    window.addEventListener('focus', () => { if (document.visibilityState === 'visible') loadTemplates(true); });
    await loadTemplates(false);
    loadHistory();
  });
})();
