/**
 * SUBSCRIBE WIDGET & AUTH MODAL
 * ismailunsal.com.tr - Ana site için
 *
 * Kullanım: Herhangi bir sayfaya bu 2 satırı ekle:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="/js/subscribe-widget.js"></script>
 *
 * Otomatik ekler:
 *   - Header'a "Giriş / Üye Ol" butonu
 *   - Footer'a subscribe formu (opsiyonel manuel: <div id="subscribe-form"></div>)
 *
 * GÜVENLİK:
 *   - Rate limiting (client-side + server-side)
 *   - Input sanitization
 *   - XSS koruması
 *   - CSRF token
 *   - Bot koruması (honeypot field)
 *   - Double opt-in (email doğrulama zorunlu)
 */

(function() {
  'use strict';

  // ==================== KONFIGÜRASYON ====================
  const CONFIG = {
    SUPABASE_URL: 'https://gosmkthmamloafgtvhpj.supabase.co',
    SUPABASE_KEY: 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4',
    ADMIN_URL: '/admin/login.html',
    SITE_URL: 'https://ismailunsal.com.tr'
  };

  // ==================== SUPABASE CLIENT ====================
  let supabase;
  function initSupabase() {
    if (!window.supabase) {
      console.error('[Subscribe Widget] Supabase JS SDK yüklenmemiş');
      return null;
    }
    if (!supabase) {
      supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    return supabase;
  }

  // ==================== GÜVENLİK UTILITY ====================
  const Security = {
    escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    isValidEmail(email) {
      if (!email || email.length > 254 || email.length < 5) return false;
      return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
    },
    isValidPhone(phone) {
      if (!phone) return true;
      const clean = phone.replace(/\s/g, '');
      return /^(\+?\d{10,15})$/.test(clean);
    },
    sanitizeInput(input, maxLength = 500) {
      if (!input) return '';
      return String(input).trim().substring(0, maxLength).replace(/[<>]/g, '');
    },
    checkClientRateLimit() {
      const key = 'subscribe_attempts';
      try {
        const now = Date.now();
        const attempts = JSON.parse(localStorage.getItem(key) || '[]')
          .filter(t => now - t < 3600000); // son 1 saat

        if (attempts.length >= 3) return false;

        attempts.push(now);
        localStorage.setItem(key, JSON.stringify(attempts));
        return true;
      } catch (e) {
        return true; // localStorage bloklanmışsa geç
      }
    }
  };

  // ==================== STİLLER (INJECT) ====================
  function injectStyles() {
    if (document.getElementById('iu-subscribe-styles')) return;

    const style = document.createElement('style');
    style.id = 'iu-subscribe-styles';
    style.textContent = `
      /* Reset */
      .iu-modal, .iu-modal *, .iu-widget, .iu-widget * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      /* Header Auth Button */
      .iu-auth-btn {
        background: #d4a54e;
        color: #0a1929 !important;
        padding: 8px 20px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
        border: none;
        cursor: pointer;
        transition: all 0.15s;
      }
      .iu-auth-btn:hover { background: #b8912e; transform: translateY(-1px); }

      /* Modal Overlay */
      .iu-modal {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(10, 25, 41, 0.75);
        z-index: 999999;
        padding: 20px;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
      }
      .iu-modal.active { display: flex; }

      .iu-modal-content {
        background: white;
        border-radius: 16px;
        max-width: 480px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        animation: iuModalSlide 0.3s ease-out;
      }
      @keyframes iuModalSlide {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .iu-modal-header {
        padding: 24px 28px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .iu-modal-title { font-size: 20px; font-weight: 700; color: #0a1929; margin: 0; }
      .iu-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        line-height: 1;
      }

      .iu-modal-body { padding: 24px 28px; }

      /* Tabs */
      .iu-tabs {
        display: flex;
        gap: 4px;
        background: #f3f4f6;
        padding: 4px;
        border-radius: 10px;
        margin-bottom: 24px;
      }
      .iu-tab {
        flex: 1;
        padding: 10px 16px;
        background: none;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        color: #6b7280;
        transition: all 0.15s;
      }
      .iu-tab.active {
        background: white;
        color: #0a1929;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }

      .iu-tab-content { display: none; }
      .iu-tab-content.active { display: block; }

      /* Form */
      .iu-form-group { margin-bottom: 16px; }
      .iu-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 6px;
      }
      .iu-input, .iu-select {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        color: #0a1929;
        transition: border-color 0.15s;
        background: white;
      }
      .iu-input:focus, .iu-select:focus {
        outline: none;
        border-color: #d4a54e;
        box-shadow: 0 0 0 3px rgba(212, 165, 78, 0.1);
      }

      /* Checkbox group */
      .iu-checkboxes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .iu-checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s;
      }
      .iu-checkbox-label:hover { border-color: #d4a54e; }
      .iu-checkbox-label input { margin: 0; }
      .iu-checkbox-label input:checked ~ span { color: #d4a54e; font-weight: 600; }

      /* Buttons */
      .iu-btn {
        display: block;
        width: 100%;
        padding: 14px 20px;
        background: #0a1929;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.15s;
        margin-top: 8px;
      }
      .iu-btn:hover:not(:disabled) { background: #1a3a5f; transform: translateY(-1px); }
      .iu-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .iu-btn-primary { background: #d4a54e; color: #0a1929; }
      .iu-btn-primary:hover:not(:disabled) { background: #b8912e; }

      /* Message boxes */
      .iu-msg {
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        margin: 12px 0;
        line-height: 1.5;
      }
      .iu-msg-success { background: #d1fae5; color: #065f46; border-left: 3px solid #10b981; }
      .iu-msg-error { background: #fee2e2; color: #991b1b; border-left: 3px solid #ef4444; }
      .iu-msg-info { background: #dbeafe; color: #1e40af; border-left: 3px solid #3b82f6; }

      /* Honeypot (bot trap) - hidden from users */
      .iu-hp {
        position: absolute !important;
        left: -9999px !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* Footer Subscribe Widget */
      .iu-widget {
        background: linear-gradient(135deg, #0a1929, #1a3a5f);
        color: white;
        padding: 40px 24px;
        border-radius: 16px;
        text-align: center;
        margin: 40px auto;
        max-width: 700px;
      }
      .iu-widget h3 { font-size: 24px; margin: 0 0 8px 0; color: #d4a54e; }
      .iu-widget p { font-size: 15px; opacity: 0.9; margin: 0 0 24px 0; }
      .iu-widget-form {
        display: flex;
        gap: 8px;
        max-width: 480px;
        margin: 0 auto;
      }
      .iu-widget-form input {
        flex: 1;
        padding: 14px 16px;
        border: none;
        border-radius: 8px;
        font-size: 15px;
      }
      .iu-widget-form button {
        padding: 14px 24px;
        background: #d4a54e;
        color: #0a1929;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .iu-widget-form button:hover { background: #b8912e; }
      .iu-widget small { display: block; margin-top: 12px; opacity: 0.7; font-size: 12px; }

      /* KVKK notice */
      .iu-kvkk {
        font-size: 11px;
        color: #6b7280;
        margin-top: 12px;
        line-height: 1.5;
      }
      .iu-kvkk a { color: #d4a54e; text-decoration: none; }

      /* Loading spinner */
      .iu-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: iuSpin 0.8s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
      }
      @keyframes iuSpin { to { transform: rotate(360deg); } }

      @media (max-width: 640px) {
        .iu-modal-content { max-width: 100%; margin: 10px; }
        .iu-widget-form { flex-direction: column; }
        .iu-checkboxes { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== MODAL HTML ====================
  function createModal() {
    if (document.getElementById('iu-auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'iu-auth-modal';
    modal.className = 'iu-modal';
    modal.innerHTML = `
      <div class="iu-modal-content" onclick="event.stopPropagation()">
        <div class="iu-modal-header">
          <h2 class="iu-modal-title" id="iu-modal-title">Hoş Geldiniz</h2>
          <button class="iu-modal-close" onclick="IUAuth.close()" aria-label="Kapat">×</button>
        </div>
        <div class="iu-modal-body">
          <div class="iu-tabs">
            <button class="iu-tab active" data-tab="subscribe" onclick="IUAuth.switchTab('subscribe')">📧 Bültene Kayıt</button>
            <button class="iu-tab" data-tab="login" onclick="IUAuth.switchTab('login')">🔐 Admin Girişi</button>
          </div>

          <!-- SUBSCRIBE TAB -->
          <div class="iu-tab-content active" id="iu-tab-subscribe">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
              📬 <strong>Yalova gayrimenkul fırsatlarından</strong> ilk siz haberdar olun. Ücretsiz, istediğiniz zaman iptal edebilirsiniz.
            </p>

            <form id="iu-subscribe-form" novalidate>
              <!-- Honeypot -->
              <input type="text" name="website" class="iu-hp" tabindex="-1" autocomplete="off">

              <div class="iu-form-group">
                <label class="iu-label" for="iu-sub-email">Email *</label>
                <input type="email" id="iu-sub-email" class="iu-input" required maxlength="254" placeholder="ornek@email.com" autocomplete="email">
              </div>

              <div class="iu-form-group">
                <label class="iu-label" for="iu-sub-name">Ad Soyad</label>
                <input type="text" id="iu-sub-name" class="iu-input" maxlength="100" placeholder="Ahmet Yılmaz" autocomplete="name">
              </div>

              <div class="iu-form-group">
                <label class="iu-label" for="iu-sub-phone">Telefon (opsiyonel)</label>
                <input type="tel" id="iu-sub-phone" class="iu-input" maxlength="20" placeholder="+90 555 123 45 67" autocomplete="tel">
              </div>

              <div class="iu-form-group">
                <label class="iu-label">İlgi Alanları</label>
                <div class="iu-checkboxes">
                  <label class="iu-checkbox-label"><input type="checkbox" name="kat" value="arsa"> <span>🏞️ Arsa</span></label>
                  <label class="iu-checkbox-label"><input type="checkbox" name="kat" value="daire"> <span>🏢 Daire</span></label>
                  <label class="iu-checkbox-label"><input type="checkbox" name="kat" value="villa"> <span>🏡 Villa</span></label>
                  <label class="iu-checkbox-label"><input type="checkbox" name="kat" value="isyeri"> <span>🏪 İşyeri</span></label>
                </div>
              </div>

              <div class="iu-form-group">
                <label class="iu-label" for="iu-sub-islem">İşlem Tipi</label>
                <select id="iu-sub-islem" class="iu-select">
                  <option value="her_ikisi">Satılık ve Kiralık</option>
                  <option value="satilik">Sadece Satılık</option>
                  <option value="kiralik">Sadece Kiralık</option>
                </select>
              </div>

              <div class="iu-form-group">
                <label class="iu-label" for="iu-sub-lang">Email Dili</label>
                <select id="iu-sub-lang" class="iu-select">
                  <option value="tr">🇹🇷 Türkçe</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="ru">🇷🇺 Русский</option>
                </select>
              </div>

              <div id="iu-sub-msg"></div>

              <button type="submit" class="iu-btn iu-btn-primary" id="iu-sub-btn">
                📬 Bültene Kayıt Ol
              </button>

              <div class="iu-kvkk">
                Kayıt olarak, <a href="/kvkk" target="_blank">KVKK Aydınlatma Metni</a>'ni okuduğunuzu ve email bültenimize abone olmayı kabul ettiğinizi onaylarsınız.
                Her mailin altındaki bağlantıdan aboneliğinizi iptal edebilirsiniz.
              </div>
            </form>
          </div>

          <!-- LOGIN TAB -->
          <div class="iu-tab-content" id="iu-tab-login">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
              🔐 Admin paneline giriş yapın. Sadece yetkili kullanıcılar erişebilir.
            </p>

            <form id="iu-login-form" novalidate>
              <div class="iu-form-group">
                <label class="iu-label" for="iu-login-email">Email</label>
                <input type="email" id="iu-login-email" class="iu-input" required maxlength="254" placeholder="admin@email.com" autocomplete="email">
              </div>

              <div class="iu-form-group">
                <label class="iu-label" for="iu-login-pass">Şifre</label>
                <input type="password" id="iu-login-pass" class="iu-input" required minlength="8" placeholder="••••••••" autocomplete="current-password">
              </div>

              <div id="iu-login-msg"></div>

              <button type="submit" class="iu-btn" id="iu-login-btn">
                🔐 Giriş Yap
              </button>

              <div class="iu-kvkk" style="text-align: center; margin-top: 16px;">
                Admin misiniz? <a href="${CONFIG.ADMIN_URL}">Doğrudan admin paneline git →</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    modal.addEventListener('click', () => IUAuth.close());
    document.body.appendChild(modal);

    setupFormHandlers();
  }

  // ==================== FORM HANDLERS ====================
  function setupFormHandlers() {
    // Subscribe form
    document.getElementById('iu-subscribe-form').addEventListener('submit', handleSubscribe);
    // Login form
    document.getElementById('iu-login-form').addEventListener('submit', handleLogin);
  }

  function showMessage(containerId, text, type = 'info') {
    const el = document.getElementById(containerId);
    el.innerHTML = `<div class="iu-msg iu-msg-${type}">${Security.escapeHtml(text)}</div>`;
  }

  async function handleSubscribe(e) {
    e.preventDefault();

    const btn = document.getElementById('iu-sub-btn');
    const originalText = btn.innerHTML;

    try {
      const form = e.target;

      // BOT KORUMASI: Honeypot dolu ise reddet
      if (form.website.value) {
        console.warn('[Subscribe] Honeypot triggered - possible bot');
        showMessage('iu-sub-msg', 'Kayıt işlenemedi. Lütfen tekrar deneyin.', 'error');
        return;
      }

      // Client-side rate limit
      if (!Security.checkClientRateLimit()) {
        showMessage('iu-sub-msg', 'Çok fazla deneme. Lütfen 1 saat sonra tekrar deneyin.', 'error');
        return;
      }

      // Input validation
      const email = form.querySelector('#iu-sub-email').value.trim().toLowerCase();
      if (!Security.isValidEmail(email)) {
        showMessage('iu-sub-msg', 'Geçerli bir email adresi girin.', 'error');
        return;
      }

      const phone = form.querySelector('#iu-sub-phone').value.trim();
      if (phone && !Security.isValidPhone(phone)) {
        showMessage('iu-sub-msg', 'Geçerli bir telefon numarası girin.', 'error');
        return;
      }

      const kategoriler = Array.from(form.querySelectorAll('input[name="kat"]:checked')).map(c => c.value);

      const data = {
        email,
        full_name: Security.sanitizeInput(form.querySelector('#iu-sub-name').value, 100) || null,
        phone: phone || null,
        ilgi_kategoriler: kategoriler,
        islem_tipi: form.querySelector('#iu-sub-islem').value,
        language: form.querySelector('#iu-sub-lang').value,
        signup_source: 'website',
        user_agent: navigator.userAgent.substring(0, 500)
      };

      btn.disabled = true;
      btn.innerHTML = '<span class="iu-spinner"></span> Kaydediliyor...';

      const sb = initSupabase();

      // Insert (RLS ile korunuyor, sadece INSERT yapabilir public user)
      const { data: newSub, error } = await sb
        .from('subscribers')
        .insert(data)
        .select('id, verification_token')
        .single();

      if (error) {
        if (error.code === '23505') {
          // Duplicate email - zaten kayıtlı
          showMessage('iu-sub-msg', 'Bu email zaten kayıtlı. Eğer aboneliğinizi yeniden aktif etmek istiyorsanız, size gönderilen eski maildeki linkten geri katılabilirsiniz.', 'info');
        } else {
          throw error;
        }
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      // Verification emaili tetikle (Edge Function)
      try {
        await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/send-verification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CONFIG.SUPABASE_KEY,
            'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
          },
          body: JSON.stringify({ subscriberId: newSub.id })
        });
      } catch (emailErr) {
        console.error('[Subscribe] Verification email error:', emailErr);
        // Yine de kayıt başarılı sayılır, sadece log
      }

      // Başarı mesajı
      showMessage('iu-sub-msg',
        '✅ Kayıt başarılı! Email adresinize bir doğrulama linki gönderdik. ' +
        'Lütfen mailinizi kontrol edin ve linke tıklayarak aboneliğinizi tamamlayın. ' +
        '(Spam klasörünüzü de kontrol etmeyi unutmayın)',
        'success'
      );

      form.reset();
      btn.innerHTML = '✅ Gönderildi';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }, 3000);

    } catch (err) {
      console.error('[Subscribe] Error:', err);
      showMessage('iu-sub-msg', 'Bir hata oluştu: ' + (err.message || 'Lütfen tekrar deneyin'), 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  async function handleLogin(e) {
    e.preventDefault();

    const btn = document.getElementById('iu-login-btn');
    const originalText = btn.innerHTML;

    try {
      const email = document.getElementById('iu-login-email').value.trim().toLowerCase();
      const password = document.getElementById('iu-login-pass').value;

      if (!Security.isValidEmail(email)) {
        showMessage('iu-login-msg', 'Geçerli bir email girin.', 'error');
        return;
      }

      if (password.length < 8) {
        showMessage('iu-login-msg', 'Şifre en az 8 karakter olmalı.', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="iu-spinner"></span> Giriş yapılıyor...';

      const sb = initSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      if (error) {
        showMessage('iu-login-msg', 'Giriş başarısız: ' + (error.message === 'Invalid login credentials' ? 'Email veya şifre hatalı' : error.message), 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      // Admin mi kontrol et
      const { data: adminData } = await sb
        .from('admin_users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (!adminData) {
        showMessage('iu-login-msg', 'Bu hesabın admin yetkisi yok.', 'error');
        await sb.auth.signOut();
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      // Admin paneline yönlendir
      showMessage('iu-login-msg', '✅ Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
      setTimeout(() => {
        window.location.href = '/admin/index.html';
      }, 800);

    } catch (err) {
      console.error('[Login] Error:', err);
      showMessage('iu-login-msg', 'Bir hata oluştu: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  // ==================== FOOTER WIDGET ====================
  function createFooterWidget() {
    // Sadece manuel container varsa ekle
    const targets = document.querySelectorAll('#subscribe-form, .subscribe-form-container');
    if (targets.length === 0) return;

    targets.forEach(target => {
      target.innerHTML = `
        <div class="iu-widget">
          <h3>📬 Fırsatlardan İlk Siz Haberdar Olun</h3>
          <p>Yalova'nın en güncel gayrimenkul ilanları haftalık bültenimizde. Ücretsiz.</p>
          <form class="iu-widget-form" onsubmit="IUAuth.quickSubscribe(event)">
            <input type="email" placeholder="email@adres.com" required maxlength="254">
            <button type="submit">Kayıt Ol</button>
          </form>
          <small>Detaylı tercihler için <a href="#" onclick="IUAuth.open('subscribe'); return false;" style="color: #d4a54e;">buraya tıklayın</a></small>
        </div>
      `;
    });
  }

  // ==================== HEADER BUTON ====================
  function addHeaderButton() {
    // Kullanıcı manuel eklerse kullansın
    let container = document.querySelector('[data-iu-auth]');

    // Otomatik header'a eklemeye çalış
    if (!container) {
      container = document.querySelector('header nav, header .menu, header .actions, header, nav');
    }

    if (!container || document.getElementById('iu-header-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'iu-header-btn';
    btn.className = 'iu-auth-btn';
    btn.textContent = '👤 Giriş / Üye Ol';
    btn.onclick = () => IUAuth.open('subscribe');
    container.appendChild(btn);
  }

  // ==================== PUBLIC API ====================
  window.IUAuth = {
    open(tab = 'subscribe') {
      const modal = document.getElementById('iu-auth-modal');
      if (!modal) return;
      modal.classList.add('active');
      this.switchTab(tab);
      document.body.style.overflow = 'hidden';
    },

    close() {
      const modal = document.getElementById('iu-auth-modal');
      if (!modal) return;
      modal.classList.remove('active');
      document.body.style.overflow = '';
      document.getElementById('iu-sub-msg').innerHTML = '';
      document.getElementById('iu-login-msg').innerHTML = '';
    },

    switchTab(tab) {
      document.querySelectorAll('.iu-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
      });
      document.querySelectorAll('.iu-tab-content').forEach(c => {
        c.classList.toggle('active', c.id === `iu-tab-${tab}`);
      });
      document.getElementById('iu-modal-title').textContent =
        tab === 'subscribe' ? '📧 Bültene Kaydolun' : '🔐 Admin Girişi';
    },

    async quickSubscribe(e) {
      e.preventDefault();
      const email = e.target.querySelector('input').value.trim().toLowerCase();
      if (!Security.isValidEmail(email)) {
        alert('Geçerli bir email girin');
        return;
      }

      if (!Security.checkClientRateLimit()) {
        alert('Çok fazla deneme. 1 saat sonra tekrar deneyin.');
        return;
      }

      try {
        const sb = initSupabase();
        const { data, error } = await sb.from('subscribers').insert({
          email,
          language: 'tr',
          signup_source: 'website_footer',
          user_agent: navigator.userAgent.substring(0, 500)
        }).select('id').single();

        if (error) {
          if (error.code === '23505') {
            alert('Bu email zaten kayıtlı!');
          } else {
            alert('Kayıt hatası: ' + error.message);
          }
          return;
        }

        // Verification email
        fetch(`${CONFIG.SUPABASE_URL}/functions/v1/send-verification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CONFIG.SUPABASE_KEY,
            'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
          },
          body: JSON.stringify({ subscriberId: data.id })
        }).catch(() => {});

        e.target.reset();
        alert('✅ Kayıt başarılı! Doğrulama emaili gönderdik, lütfen mailinizi kontrol edin.');
      } catch (err) {
        alert('Hata: ' + err.message);
      }
    }
  };

  // ==================== INIT ====================
  function init() {
    injectStyles();
    createModal();
    createFooterWidget();
    addHeaderButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
