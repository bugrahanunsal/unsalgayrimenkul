/**
 * Spam koruması (Google reCAPTCHA v3) — tarayıcı tarafı. Panel → Spam Koruması'ndan açılınca devreye girer.
 * Bu dosyada gizli anahtar YOKTUR: site anahtarı herkese açık bir değerdir ve veritabanından okunur.
 *
 *   IUCaptcha.token(form)        → Promise<string|null>
 *        null : koruma kapalı veya bu form korunmuyor (token gerekmez)
 *        ''   : koruma açık ama reCAPTCHA yüklenemedi (ör. reklam engelleyici) — sunucu reddeder
 *        'x'  : Google'ın verdiği tek kullanımlık doğrulama anahtarı (2 dk geçerli → gönderim anında alınır)
 *   IUCaptcha.notice(formEl, form) → koruma açıksa formun altına Google'ın istediği bilgilendirme notu
 *   IUCaptcha.warm(form)           → ziyaretçi forma dokununca reCAPTCHA'yı önceden yükler (gönderim hızlı olsun)
 *   IUCaptcha.refresh()            → ayarı yeniden oku (sunucu "doğrulama gerekli" derse bir kez denenir)
 * Google'ın betiği yalnızca koruma AÇIKKEN ve ziyaretçi bir forma dokunduğunda yüklenir (hız + gizlilik).
 */
(function () {
  'use strict';
  if (window.IUCaptcha) return;
  var SB = 'https://gosmkthmamloafgtvhpj.supabase.co';
  var KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4';
  var KEY_RE = /^[A-Za-z0-9_-]{20,100}$/;
  var cfgP = null, libP = null, styled = false;

  function config() {
    if (!cfgP) {
      cfgP = fetch(SB + '/rest/v1/rpc/iu_spam_koruma_genel', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: '{}'
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && j.aktif === true && KEY_RE.test(j.site_key || '')) return { siteKey: j.site_key, formlar: Array.isArray(j.formlar) ? j.formlar : [] };
          return { off: true };
        })
        .catch(function () { cfgP = null; return { off: true, error: true }; });
    }
    return cfgP;
  }

  function lib(siteKey) {
    if (!libP) {
      libP = new Promise(function (resolve) {
        var done = function (g) { resolve(g); };
        if (window.grecaptcha && window.grecaptcha.execute) { window.grecaptcha.ready(function () { done(window.grecaptcha); }); return; }
        var s = document.createElement('script');
        s.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(siteKey);
        s.async = true;
        s.onload = function () {
          if (window.grecaptcha && window.grecaptcha.ready) window.grecaptcha.ready(function () { done(window.grecaptcha); });
          else done(null);
        };
        s.onerror = function () { libP = null; done(null); };
        document.head.appendChild(s);
        setTimeout(function () { if (!window.grecaptcha) libP = null; done(null); }, 10000);
      });
    }
    return libP;
  }

  function protects(c, form) { return !!(c && !c.off && c.formlar.indexOf(form) !== -1); }

  function token(form) {
    return config().then(function (c) {
      if (!protects(c, form)) return null;
      return lib(c.siteKey).then(function (g) {
        if (!g) return '';
        return new Promise(function (resolve) {
          var t = setTimeout(function () { resolve(''); }, 8000);
          try {
            g.execute(c.siteKey, { action: form }).then(function (v) { clearTimeout(t); resolve(typeof v === 'string' ? v : ''); }, function () { clearTimeout(t); resolve(''); });
          } catch (_) { clearTimeout(t); resolve(''); }
        });
      });
    });
  }

  function warm(form) {
    config().then(function (c) { if (protects(c, form)) lib(c.siteKey); });
  }

  var TXT = {
    tr: ['Bu form reCAPTCHA ile korunmaktadır; Google ', 'Gizlilik Politikası', ' ve ', 'Hizmet Şartları', ' geçerlidir.'],
    en: ['This form is protected by reCAPTCHA and the Google ', 'Privacy Policy', ' and ', 'Terms of Service', ' apply.'],
    de: ['Dieses Formular ist durch reCAPTCHA geschützt; es gelten die ', 'Datenschutzerklärung', ' und ', 'Nutzungsbedingungen', ' von Google.'],
    fr: ['Ce formulaire est protégé par reCAPTCHA ; les ', 'Règles de confidentialité', ' et les ', "Conditions d'utilisation", ' de Google s\'appliquent.'],
    ru: ['Эта форма защищена reCAPTCHA; действуют ', 'Политика конфиденциальности', ' и ', 'Условия использования', ' Google.'],
    ar: ['هذا النموذج محمي بواسطة reCAPTCHA وتنطبق ', 'سياسة الخصوصية', ' و', 'شروط الخدمة', ' من Google.']
  };
  function lang() {
    var l = (document.documentElement.getAttribute('lang') || 'tr').slice(0, 2).toLowerCase();
    return TXT[l] ? l : 'tr';
  }
  function link(href, text) {
    var a = document.createElement('a');
    a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = text;
    return a;
  }
  function style() {
    if (styled) return; styled = true;
    var st = document.createElement('style');
    // Rozet gizlenir; Google'ın kuralı gereği aynı bilgi formun altında yazı olarak gösterilir
    st.textContent = '.grecaptcha-badge{visibility:hidden!important}.iu-recaptcha-note{font-size:11.5px;line-height:1.5;color:#6B7280;margin:10px 0 0}.iu-recaptcha-note a{color:inherit;text-decoration:underline}';
    document.head.appendChild(st);
  }
  function notice(formEl, form) {
    if (!formEl) return Promise.resolve(false);
    return config().then(function (c) {
      if (!protects(c, form) || formEl.querySelector('.iu-recaptcha-note')) return false;
      style();
      var t = TXT[lang()];
      var p = document.createElement('p');
      p.className = 'iu-recaptcha-note';
      p.append(t[0], link('https://policies.google.com/privacy', t[1]), t[2], link('https://policies.google.com/terms', t[3]), t[4]);
      formEl.appendChild(p);
      return true;
    });
  }
  function refresh() { cfgP = null; return config(); }

  window.IUCaptcha = { token: token, notice: notice, warm: warm, refresh: refresh };
})();
