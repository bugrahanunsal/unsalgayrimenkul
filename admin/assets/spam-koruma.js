/**
 * Panel — Spam Koruması (Google reCAPTCHA v3)
 * Tüm okuma/yazma /api/admin/spam-koruma üzerinden (sunucu, gizli anahtarı tarayıcıya hiç göndermez).
 * Test: bu sayfa kayıtlı site anahtarıyla reCAPTCHA'yı yükler, "admin_test" işlemi için token üretir, sunucu Google'a doğrulatır.
 * Tüm metinler textContent ile yazılır.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KEY_RE = /^[A-Za-z0-9_-]{20,100}$/;
  const FORM_NAMES = { iletisim: 'İletişim formu', ilan: 'İlan bilgi talebi', abone: 'Bülten', test: 'Test' };
  const RESULT = { gecti: ['Geçti', 'badge-success'], spam: ['Spam (düşük puan)', 'badge-warning'], reddedildi: ['Engellendi (bot)', 'badge-danger'], hata: ['Doğrulanamadı', 'badge-gray'] };
  let state = null;          // sunucudan gelen ayar
  let loadedKey = null;      // sayfaya yüklenen reCAPTCHA site anahtarı

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; }
  function msg(box, text, kind) {
    const b = $(box); b.textContent = '';
    if (!text) return;
    b.appendChild(el('div', 'sk-msg ' + (kind || 'info'), text));
  }
  async function api(body) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın.');
    const r = await fetch('/api/admin/spam-koruma', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(body) });
    let j = {}; try { j = await r.json(); } catch (_) {}
    if (j && j.ayar) state = j.ayar;
    if (!r.ok || !j.ok) { const e = new Error(j.message || ('İşlem başarısız (' + r.status + ')')); e.data = j; throw e; }
    return j;
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.textContent = label || 'Lütfen bekleyin…'; }
    else { btn.disabled = false; btn.textContent = btn.dataset.label || btn.textContent; }
  }
  const fmt = (d) => d ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(new Date(d)) : '';

  // ---------- çizim ----------
  function renderState(sunucu) {
    const s = state;
    const st = $('state');
    const tested = !!(s && s.test && s.test.ok);
    if (s && s.aktif) { st.className = 'sk-state on'; st.textContent = 'Açık'; }
    else if (s && s.site_key && s.gizli && s.gizli.var && !tested) { st.className = 'sk-state wait'; st.textContent = 'Test bekliyor'; }
    else { st.className = 'sk-state off'; st.textContent = 'Kapalı'; }

    const list = $('checks'); list.textContent = '';
    const item = (ok, title, sub) => {
      const li = el('li', ok ? 'ok' : 'bad');
      li.appendChild(el('span', 'sk-dot', ok ? '✓' : ''));
      const d = el('div'); d.appendChild(el('span', null, title)); if (sub) d.appendChild(el('small', null, sub));
      li.appendChild(d); list.appendChild(li);
    };
    item(!!(sunucu && sunucu.service_key), 'Sunucu bağlantısı', sunucu && sunucu.service_key ? 'Cloudflare\'de SUPABASE_SERVICE_ROLE_KEY tanımlı.' : 'Cloudflare\'e SUPABASE_SERVICE_ROLE_KEY eklenmeli.');
    item(!!(s && s.site_key), 'Site anahtarı kaydedildi', s && s.site_key ? s.site_key.slice(0, 10) + '…' + s.site_key.slice(-4) : 'Google\'dan alınan Key ID');
    item(!!(s && s.gizli && s.gizli.var), 'Gizli anahtar kaydedildi', s && s.gizli && s.gizli.var ? 'Sonu …' + s.gizli.son4 + ' (yalnızca sunucuda)' : 'Google\'da "Eski anahtarı kullan" bölümündeki gizli anahtar');
    item(tested, 'Test başarılı', tested ? fmt(s.test.at) + ' · puan ' + (s.test.skor != null ? Number(s.test.skor).toFixed(1) : '—') + (s.test.host ? ' · ' + s.test.host : '')
      : (s && s.test && s.test.hata ? 'Son test: ' + s.test.hata : 'Anahtarları kaydedip "Test et"e basın.'));
    item(!!(s && s.aktif), 'Koruma açık', s && s.aktif ? 'Seçili formlar Google reCAPTCHA ile korunuyor.' : 'Test başarılı olunca "Korumayı aç".');

    $('onBtn').hidden = !!(s && s.aktif);
    $('onBtn').disabled = !tested || !(sunucu && sunucu.service_key);
    $('offBtn').hidden = !(s && s.aktif);
    $('testBtn').disabled = !(s && s.site_key && s.gizli && s.gizli.var);
    $('removeKeys').hidden = !(s && (s.site_key || (s.gizli && s.gizli.var)));
    if (s) {
      if (document.activeElement !== $('siteKey')) $('siteKey').value = s.site_key || '';
      $('secret').placeholder = s.gizli && s.gizli.var ? 'Kayıtlı (…' + s.gizli.son4 + ')' : '6Lc…';
      $('secretHelp').textContent = s.gizli && s.gizli.var ? 'Kayıtlı gizli anahtar gösterilmez. Değiştirmek için yenisini yapıştırın; boş bırakırsanız kayıtlı olan korunur.' : '';
      document.querySelectorAll('input[name="form"]').forEach(i => { i.checked = (s.formlar || []).includes(i.value); });
      const want = String(s.min_skor != null ? Number(s.min_skor).toFixed(1) : '0.5');
      const radios = Array.from(document.querySelectorAll('input[name="skor"]'));
      (radios.find(r => r.value === want) || radios[1]).checked = true;
    }
  }

  function renderStats(st) {
    const box = $('stats'); box.textContent = '';
    const tb = $('log'); tb.textContent = '';
    const add = (cls, n, label) => { const d = el('div', 'sk-stat ' + cls); d.appendChild(el('b', null, n == null ? '–' : Number(n).toLocaleString('tr-TR'))); d.appendChild(el('span', null, label)); box.appendChild(d); };
    add('', st && st.toplam, 'Doğrulama');
    add('', st && st.gecti, 'Geçti');
    add('spam', st && st.spam, 'Spam (düşük puan)');
    add('bot', st && st.reddedildi, 'Engellenen bot');
    const rows = (st && st.son) || [];
    if (!rows.length) {
      const tr = el('tr'); const td = el('td', null, st && st.toplam ? 'Son 30 günde engellenen veya şüpheli gönderim yok.' : 'Henüz kayıt yok. Koruma açıldıktan sonra sonuçlar burada görünür.');
      td.colSpan = 5; td.style.color = '#64748B'; tr.appendChild(td); tb.appendChild(tr); return;
    }
    rows.forEach(r => {
      const tr = el('tr');
      tr.appendChild(el('td', null, fmt(r.tarih)));
      tr.appendChild(el('td', null, FORM_NAMES[r.form] || r.form));
      const res = RESULT[r.sonuc] || [r.sonuc, 'badge-gray'];
      const td = el('td'); td.appendChild(el('span', 'badge ' + res[1], res[0])); tr.appendChild(td);
      tr.appendChild(el('td', null, r.skor != null ? Number(r.skor).toFixed(1) : '—'));
      tr.appendChild(el('td', null, r.neden || ''));
      tb.appendChild(tr);
    });
  }

  async function load() {
    try {
      const j = await api({ action: 'durum' });
      $('noServer').hidden = !!(j.sunucu && j.sunucu.service_key);
      renderState(j.sunucu);
      renderStats(j.istatistik);
      window.__skServer = j.sunucu;
    } catch (e) {
      msg('stateMsg', e.message, 'err');
      renderState(null); renderStats(null);
    }
  }

  // ---------- reCAPTCHA (test) ----------
  function loadRecaptcha(siteKey) {
    return new Promise((resolve, reject) => {
      if (loadedKey && loadedKey !== siteKey) { reject(new Error('reload')); return; }
      if (window.grecaptcha && window.grecaptcha.execute && loadedKey === siteKey) { window.grecaptcha.ready(() => resolve(window.grecaptcha)); return; }
      loadedKey = siteKey;
      const s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(siteKey);
      s.async = true;
      s.onload = () => (window.grecaptcha && window.grecaptcha.ready) ? window.grecaptcha.ready(() => resolve(window.grecaptcha)) : reject(new Error('load'));
      s.onerror = () => reject(new Error('load'));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error('timeout')), 12000);
    });
  }

  async function runTest() {
    if (!state || !KEY_RE.test(state.site_key || '')) return;
    const btn = $('testBtn'); busy(btn, true, 'Test ediliyor…'); msg('keyMsg', '');
    let token = '';
    try {
      const g = await loadRecaptcha(state.site_key);
      token = await Promise.race([g.execute(state.site_key, { action: 'admin_test' }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
    } catch (e) {
      if (e && e.message === 'reload') { location.reload(); return; }
      token = '';    // sunucu da "tarayıcıda çalışmadı" sonucunu kaydeder
    }
    try {
      const j = await api({ action: 'test', token: token || 'x' });
      msg('keyMsg', j.message + (j.skor != null ? ' (puan ' + Number(j.skor).toFixed(1) + ')' : ''), 'ok');
      try { await Security.logSecurityEvent('spam_protection_tested', { ok: true }, 'info'); } catch (_) {}
    } catch (e) { msg('keyMsg', e.message, 'err'); }
    finally { busy(btn, false); renderState(window.__skServer); }
  }

  async function saveKeys() {
    const siteKey = $('siteKey').value.trim();
    const secret = $('secret').value.trim();
    if (!KEY_RE.test(siteKey)) { msg('keyMsg', 'Site anahtarı geçersiz görünüyor. Google\'daki "Anahtar kimliği (Key ID)" değerini eksiksiz yapıştırın.', 'err'); $('siteKey').focus(); return; }
    if (secret && !KEY_RE.test(secret)) { msg('keyMsg', 'Gizli anahtar geçersiz görünüyor.', 'err'); $('secret').focus(); return; }
    if (state && state.aktif && (siteKey !== state.site_key || secret)) {
      if (!(await App.confirm('Anahtarları değiştirirseniz koruma kapanır; yeni anahtarları test edip yeniden açmanız gerekir. Devam edilsin mi?', 'Anahtarları değiştir'))) return;
    }
    const btn = $('saveKeys'); busy(btn, true, 'Kaydediliyor…');
    try {
      const j = await api({ action: 'kaydet', site_key: siteKey, secret: secret || null });
      $('secret').value = '';
      try { await Security.logSecurityEvent('spam_protection_keys_saved', { changed: !!j.degisti }, 'warning'); } catch (_) {}
      if (j.degisti && loadedKey && loadedKey !== siteKey) {
        // farklı anahtarla yüklenmiş reCAPTCHA'yı temizlemek için sayfayı yenile
        try { sessionStorage.setItem('sk_after_save', '1'); } catch (_) {}
        location.reload(); return;
      }
      msg('keyMsg', j.degisti ? 'Anahtarlar kaydedildi. Şimdi "Test et"e basın.' + (j.korumaKapandi ? ' (Koruma güvenlik için kapatıldı.)' : '') : 'Değişiklik yok; anahtarlar zaten kayıtlı.', 'ok');
    } catch (e) { msg('keyMsg', e.message, 'err'); }
    finally { busy(btn, false); renderState(window.__skServer); }
  }

  async function setActive(on) {
    if (!on && !(await App.confirm('Spam koruması kapatılsın mı? Formlar reCAPTCHA olmadan çalışmaya devam eder.', 'Korumayı kapat'))) return;
    const btn = on ? $('onBtn') : $('offBtn'); busy(btn, true);
    try {
      await api({ action: 'ayar', aktif: on, formlar: checkedForms() });
      msg('stateMsg', on ? 'Koruma açıldı. Seçili formlar artık Google reCAPTCHA ile doğrulanıyor.' : 'Koruma kapatıldı.', on ? 'ok' : 'info');
      try { await Security.logSecurityEvent(on ? 'spam_protection_on' : 'spam_protection_off', {}, 'warning'); } catch (_) {}
    } catch (e) { msg('stateMsg', e.message, 'err'); }
    finally { busy(btn, false); renderState(window.__skServer); }
  }
  const checkedForms = () => Array.from(document.querySelectorAll('input[name="form"]:checked')).map(i => i.value);

  async function saveSettings() {
    const forms = checkedForms();
    if (state && state.aktif && !forms.length) { msg('stateMsg', 'Koruma açıkken en az bir form seçili olmalı (hepsini kaldırmak için korumayı kapatın).', 'err'); return; }
    const r = document.querySelector('input[name="skor"]:checked');
    const btn = $('saveSettings'); busy(btn, true, 'Kaydediliyor…');
    try {
      await api({ action: 'ayar', formlar: forms, min_skor: r ? Number(r.value) : 0.5 });
      App.toast('Ayarlar kaydedildi', 'success');
    } catch (e) { App.toast(e.message, 'error'); }
    finally { busy(btn, false); renderState(window.__skServer); }
  }

  async function removeKeys() {
    if (!(await App.confirm('Anahtarlar silinsin ve koruma kapatılsın mı?', 'Anahtarları kaldır'))) return;
    try {
      await api({ action: 'kaldir' });
      $('siteKey').value = ''; $('secret').value = '';
      msg('keyMsg', 'Anahtarlar kaldırıldı.', 'info');
      try { await Security.logSecurityEvent('spam_protection_keys_removed', {}, 'warning'); } catch (_) {}
    } catch (e) { msg('keyMsg', e.message, 'err'); }
    renderState(window.__skServer);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await App.init('spam'))) return;
    $('saveKeys').addEventListener('click', saveKeys);
    $('testBtn').addEventListener('click', runTest);
    $('onBtn').addEventListener('click', () => setActive(true));
    $('offBtn').addEventListener('click', () => setActive(false));
    $('saveSettings').addEventListener('click', saveSettings);
    $('removeKeys').addEventListener('click', removeKeys);
    $('showSecret').addEventListener('click', () => {
      const i = $('secret'); const show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      $('showSecret').textContent = show ? 'Gizle' : 'Göster';
      $('showSecret').setAttribute('aria-pressed', show ? 'true' : 'false');
    });
    await load();
    let after = false;
    try { after = !!sessionStorage.getItem('sk_after_save'); sessionStorage.removeItem('sk_after_save'); } catch (_) {}
    if (after) msg('keyMsg', 'Anahtarlar kaydedildi. Şimdi "Test et"e basın.', 'ok');
  });
})();
