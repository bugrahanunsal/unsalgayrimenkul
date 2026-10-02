/**
 * Ortak form gönderimi → POST /api/talep (Cloudflare Pages Function)
 * Talep hem admin → Başvurular'a kaydedilir hem ismunsal.59@gmail.com'a e-posta gider.
 *  - IULead.send(payload) → { ok, error }
 *  - IULead.bind(form, { kaynak, extra() }) → form'u otomatik bağlar
 * Spam koruması (reCAPTCHA) panelden açıldıysa gönderim anında doğrulama anahtarı eklenir (/spam-koruma.js).
 * Tarayıcıda hiçbir gizli anahtar yoktur.
 */
(function () {
  'use strict';

  let captchaP = null;
  function captchaLib() {
    if (window.IUCaptcha) return Promise.resolve(window.IUCaptcha);
    if (!captchaP) captchaP = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = '/spam-koruma.js?v=20261002-spam';
      s.async = true;
      s.onload = () => resolve(window.IUCaptcha || null);
      s.onerror = () => { captchaP = null; resolve(null); };
      document.head.appendChild(s);
    });
    return captchaP;
  }
  async function captchaToken(form) {
    const c = await captchaLib();
    return c ? c.token(form) : null;
  }

  async function post(payload) {
    try {
      const r = await fetch('/api/talep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ sayfa: location.pathname }, payload))
      });
      let j = {};
      try { j = await r.json(); } catch (_) {}
      return { ok: r.ok && j.ok === true, error: j.error, code: j.code };
    } catch (e) {
      return { ok: false, error: null };
    }
  }

  async function send(payload) {
    const form = payload && payload.kaynak === 'ilan' ? 'ilan' : 'iletisim';
    const token = await captchaToken(form);
    if (token === '') return { ok: false, error: 'Güvenlik doğrulaması yüklenemedi (reklam engelleyici açık olabilir). Sayfayı yenileyip tekrar deneyin.' };
    let res = await post(Object.assign({}, payload, token ? { captcha: token } : {}));
    // Koruma bu sayfa açıkken açıldıysa: ayarı yenile, bir kez daha dene
    if (!res.ok && res.code === 'captcha' && !token && window.IUCaptcha) {
      await window.IUCaptcha.refresh();
      const t2 = await window.IUCaptcha.token(form);
      if (t2) res = await post(Object.assign({}, payload, { captcha: t2 }));
    }
    return res;
  }

  function waFallback(d) {
    const txt = [d.isim, d.telefon, d.mesaj, location.href].filter(Boolean).join('\n');
    return 'https://wa.me/905075188482?text=' + encodeURIComponent(txt);
  }

  // Form elemanları: isim, telefon, email, mesaj, konu(ops.), kvkk, website(honeypot) + .lead-msg
  function bind(form, opts) {
    opts = opts || {};
    const started = Date.now();
    const msgBox = form.querySelector('[data-lead-msg]');
    const cform = opts.kaynak === 'ilan' ? 'ilan' : 'iletisim';
    // Koruma açıksa Google'ın istediği bilgilendirme notu; forma dokununca reCAPTCHA önceden yüklenir
    captchaLib().then(c => { if (c) c.notice(form, cform); });
    form.addEventListener('focusin', () => { captchaLib().then(c => { if (c) c.warm(cform); }); }, { once: true });
    const say = (t, ok) => { if (!msgBox) return; msgBox.textContent = t; msgBox.className = msgBox.className.replace(/\s*\b(ok|err)\b/g, '') + (ok ? ' ok' : ' err'); };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const d = {
        kaynak: opts.kaynak || 'iletisim',
        isim: String(fd.get('isim') || '').trim().slice(0, 80),
        telefon: String(fd.get('telefon') || '').replace(/[^\d+]/g, '').slice(0, 16),
        email: String(fd.get('email') || '').trim().slice(0, 120),
        mesaj: String(fd.get('mesaj') || '').trim().slice(0, 1500),
        konu: fd.get('konu') ? String(fd.get('konu')) : undefined,
        kvkk: !!fd.get('kvkk'),
        website: String(fd.get('website') || ''),
        t: Date.now() - started
      };
      if (typeof opts.extra === 'function') Object.assign(d, opts.extra());
      if (d.isim.length < 2) return say('Lütfen adınızı yazın.');
      if (!/^\+?\d{10,15}$/.test(d.telefon)) return say('Lütfen geçerli bir telefon numarası yazın (ör. 0532 123 45 67).');
      if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return say('E-posta adresi geçersiz görünüyor.');
      if (!d.kvkk) return say('Devam etmek için KVKK onayını işaretleyin.');

      const btn = form.querySelector('[type=submit]');
      const label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Gönderiliyor...'; }
      const res = await send(d);
      if (btn) { btn.disabled = false; btn.innerHTML = label; }

      if (res.ok) {
        form.reset();
        say(opts.successText || 'Teşekkürler! Mesajınız bize ulaştı, en kısa sürede size dönüş yapacağız.', true);
        if (typeof opts.onSuccess === 'function') opts.onSuccess();
      } else {
        // Talep kaybolmasın: sunucu hatasında WhatsApp ile gönderme seçeneği
        say((res.error && res.error.length < 140 ? res.error + ' ' : 'Mesajınız şu anda gönderilemedi. '));
        if (msgBox && !(res.error && /telefon|adınızı|E-posta|KVKK/i.test(res.error))) {
          const a = document.createElement('a');
          a.href = waFallback(d); a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.textContent = 'WhatsApp ile gönderin →';
          msgBox.appendChild(a);
        }
      }
    });
  }

  window.IULead = { send, bind };
})();
