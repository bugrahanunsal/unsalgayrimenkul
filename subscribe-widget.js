/**
 * ============================================================
 * İSMAİL ÜNSAL GAYRİMENKUL - AUTH & SUBSCRIBE WIDGET v2.0
 * ============================================================
 *
 * ANA SITE İÇİN KULLANIM:
 *
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * <script src="/subscribe-widget.js"></script>
 *
 * Header'a buton koymak için:
 *   <div data-iu-auth></div>  (otomatik "Giriş/Üye Ol" butonu ekler)
 *
 * Manuel açmak için:
 *   IUAuth.open('signup')      → Müşteri kayıt
 *   IUAuth.open('login')       → Müşteri girişi
 *   IUAuth.open('admin')       → Admin girişi
 *   IUAuth.open('subscribe')   → Bültene kayıt
 *
 * Footer/inline widget için:
 *   <div id="subscribe-form"></div>  (bültene kayıt formu)
 *
 * Kullanıcı durumu:
 *   IUAuth.user     → Mevcut giriş yapmış kullanıcı (null olabilir)
 *   IUAuth.logout() → Çıkış
 *
 * Favori toggle (property card'larda):
 *   IUAuth.toggleFavorite('property-id')  → Favori ekle/çıkar
 *
 * ============================================================
 * GÜVENLİK
 * ============================================================
 * - CSRF Token
 * - Rate limiting (client + server)
 * - Honeypot bot protection
 * - Input sanitization + XSS koruma
 * - Double opt-in email verification (KVKK)
 * - RLS policies (server-side)
 */

(function() {
  'use strict';

  const CONFIG = {
    SUPABASE_URL: 'https://gosmkthmamloafgtvhpj.supabase.co',
    SUPABASE_KEY: 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4',
    ADMIN_URL: '/admin/login.html',
    ACCOUNT_URL: '/hesabim.html',
    SITE_URL: 'https://ismailunsal.com.tr'
  };

  // Supabase client (persistent - kullanıcı oturumu kalır)
  let supabase;
  function initSupabase() {
    if (!window.supabase) {
      console.error('[IUAuth] Supabase JS SDK yüklenmemiş');
      return null;
    }
    if (!supabase) {
      supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'ismailunsal-customer-session'
        }
      });
    }
    return supabase;
  }

  // ==================== GÜVENLİK ====================
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
    checkPasswordStrength(pass) {
      if (!pass || pass.length < 8) return { valid: false, level: 'zayıf', score: 0 };
      let score = 0;
      if (pass.length >= 8) score++;
      if (pass.length >= 12) score++;
      if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
      if (/\d/.test(pass)) score++;
      if (/[^A-Za-z0-9]/.test(pass)) score++;
      const levels = ['çok zayıf', 'zayıf', 'orta', 'iyi', 'güçlü', 'çok güçlü'];
      return { valid: score >= 3, level: levels[score] || 'zayıf', score };
    },
    checkClientRateLimit(key = 'default', maxAttempts = 3, windowMs = 3600000) {
      const storageKey = `iuauth_rate_${key}`;
      try {
        const now = Date.now();
        const attempts = JSON.parse(localStorage.getItem(storageKey) || '[]')
          .filter(t => now - t < windowMs);
        if (attempts.length >= maxAttempts) return false;
        attempts.push(now);
        localStorage.setItem(storageKey, JSON.stringify(attempts));
        return true;
      } catch (e) { return true; }
    }
  };

  // ==================== STİLLER ====================
  function injectStyles() {
    if (document.getElementById('iu-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'iu-widget-styles';
    style.textContent = `
      .iu-modal, .iu-modal *, .iu-widget, .iu-widget *, .iu-authbar, .iu-authbar * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      /* Header Auth Bar */
      .iu-authbar { display: flex; gap: 8px; align-items: center; }
      .iu-authbar-btn {
        padding: 9px 18px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.15s;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        line-height: 1;
      }
      .iu-authbar-signup {
        background: #3b82f6;
        color: #ffffff;
      }
      .iu-authbar-signup:hover {
        background: #b8912e;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(212,165,78,0.3);
      }
      .iu-authbar-login {
        background: transparent;
        color: #3b82f6;
        border-color: #3b82f6;
      }
      .iu-authbar-login:hover {
        background: #3b82f6;
        color: #ffffff;
      }
      .iu-authbar-user {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 14px 6px 6px;
        background: rgba(212,165,78,0.1);
        border-radius: 30px;
        cursor: pointer;
        transition: all 0.15s;
        border: 1px solid rgba(212,165,78,0.3);
      }
      .iu-authbar-user:hover { background: rgba(212,165,78,0.15); }
      .iu-authbar-avatar {
        width: 28px; height: 28px;
        border-radius: 50%;
        background: #3b82f6;
        color: #ffffff;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700;
        font-size: 13px;
      }
      .iu-authbar-name {
        font-size: 13px;
        color: #ffffff;
        font-weight: 600;
      }

      /* User menu dropdown - HER YERDE OKUNUR OLSUN */
      .iu-user-menu {
        position: absolute !important;
        top: calc(100% + 8px) !important;
        right: 0 !important;
        background: #ffffff !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.25) !important;
        border: 1px solid #e5e7eb !important;
        min-width: 240px !important;
        overflow: hidden !important;
        z-index: 999998 !important;
        display: none;
        animation: iuFadeIn 0.15s;
      }
      .iu-user-menu.open { display: block !important; }
      .iu-user-menu-header {
        padding: 16px !important;
        background: #f9fafb !important;
        border-bottom: 1px solid #e5e7eb !important;
        color: #0a1929 !important;
      }
      .iu-user-menu-header > div:first-child {
        color: #0a1929 !important;
        font-weight: 700 !important;
      }
      .iu-user-menu-email {
        font-size: 12px !important;
        color: #6b7280 !important;
        margin-top: 2px !important;
      }
      .iu-user-menu a {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 12px 16px !important;
        color: #0a1929 !important;
        background: #ffffff !important;
        text-decoration: none !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        transition: background 0.15s !important;
        border: none !important;
      }
      .iu-user-menu a:hover {
        background: #f3f4f6 !important;
        color: #0a1929 !important;
      }
      .iu-user-menu a svg {
        color: #6b7280 !important;
        flex-shrink: 0;
      }
      .iu-user-menu a:hover svg { color: #F49B1C !important; }
      .iu-user-menu-divider {
        height: 1px !important;
        background: #e5e7eb !important;
      }
      .iu-user-menu-logout,
      .iu-user-menu a.iu-user-menu-logout {
        color: #ef4444 !important;
      }
      .iu-user-menu-logout:hover,
      .iu-user-menu a.iu-user-menu-logout:hover {
        background: #fef2f2 !important;
        color: #dc2626 !important;
      }
      .iu-user-menu-logout svg,
      .iu-user-menu a.iu-user-menu-logout svg { color: #ef4444 !important; }

      /* Modal */
      .iu-modal {
        display: none;
        position: fixed; inset: 0;
        background: rgba(10, 25, 41, 0.75);
        z-index: 999999;
        padding: 20px;
        align-items: center; justify-content: center;
        backdrop-filter: blur(6px);
      }
      .iu-modal.active { display: flex; }

      .iu-modal-content {
        background: white;
        border-radius: 20px;
        max-width: 480px;
        width: 100%;
        max-height: 92vh;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0,0,0,0.35);
        animation: iuModalSlide 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex; flex-direction: column;
      }
      @keyframes iuModalSlide {
        from { opacity: 0; transform: translateY(30px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes iuFadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .iu-modal-header {
        background: linear-gradient(135deg, #0a1929, #1a3a5f);
        color: white;
        padding: 24px 28px;
        position: relative;
      }
      .iu-modal-brand {
        font-size: 18px; font-weight: 800; letter-spacing: 1px;
        margin-bottom: 4px;
      }
      .iu-modal-brand .accent { color: #3b82f6; }
      .iu-modal-subtitle {
        font-size: 11px; letter-spacing: 2px; opacity: 0.7;
        text-transform: uppercase;
      }
      .iu-modal-close {
        position: absolute; top: 16px; right: 16px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.15);
        width: 34px; height: 34px;
        border-radius: 50%;
        cursor: pointer;
        color: rgba(255,255,255,0.85);
        padding: 0;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease;
        z-index: 10;
      }
      .iu-modal-close svg { width: 14px; height: 14px; stroke-width: 2.2; }
      .iu-modal-close:hover {
        background: rgba(255,255,255,0.2);
        border-color: rgba(255,255,255,0.3);
        color: #ffffff;
      }
      .iu-modal-close:active { transform: scale(0.94); }
      @media (max-width: 640px) {
        .iu-modal-close {
          width: 38px; height: 38px;
          top: 14px; right: 14px;
        }
        .iu-modal-close svg { width: 16px; height: 16px; }
      }

      .iu-modal-body {
        padding: 24px 28px;
        overflow-y: auto;
        flex: 1;
      }

      /* Tabs */
      .iu-tabs {
        display: flex;
        gap: 2px;
        background: #f3f4f6;
        padding: 4px;
        border-radius: 10px;
        margin-bottom: 20px;
      }
      .iu-tab {
        flex: 1;
        padding: 10px 12px;
        background: none;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 12px;
        color: #6b7280;
        transition: all 0.15s;
      }
      .iu-tab.active {
        background: white;
        color: #0a1929;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .iu-tab-content { display: none; animation: iuFadeIn 0.2s; }
      .iu-tab-content.active { display: block; }

      .iu-intro {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 20px;
        line-height: 1.5;
      }

      /* Form */
      .iu-form-group { margin-bottom: 14px; }
      .iu-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .iu-required { color: #ef4444; }
      .iu-input, .iu-select {
        width: 100%;
        padding: 11px 14px;
        border: 1.5px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        color: #0a1929;
        transition: all 0.15s;
        background: white;
        font-family: inherit;
      }
      .iu-input:focus, .iu-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        color: #0a1929;
      }
      .iu-input::placeholder { color: #9ca3af; }
      .iu-checkbox-label { color: #374151; }

      /* Password field wrapper with show/hide toggle */
      .iu-password-wrap {
        position: relative;
        width: 100%;
      }
      .iu-password-wrap .iu-input {
        padding-right: 46px;
      }
      .iu-password-toggle {
        position: absolute;
        right: 6px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: all 0.15s;
      }
      .iu-password-toggle:hover {
        background: #f3f4f6;
        color: #0a1929;
      }
      .iu-password-toggle:active { transform: translateY(-50%) scale(0.94); }
      .iu-password-toggle svg { width: 18px; height: 18px; }
      .iu-checkboxes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .iu-checkbox-label {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 10px;
        border: 1.5px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s;
      }
      .iu-checkbox-label:hover { border-color: #3b82f6; }
      .iu-checkbox-label input { margin: 0; accent-color: #3b82f6; }

      /* Buttons */
      .iu-btn {
        display: block;
        width: 100%;
        padding: 13px 20px;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.15s;
        margin-top: 8px;
        font-family: inherit;
      }
      .iu-btn-primary { background: #3b82f6; color: #ffffff; }
      .iu-btn-primary:hover:not(:disabled) {
        background: #b8912e;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(212,165,78,0.3);
      }
      .iu-btn-dark { background: #0a1929; color: white; }
      .iu-btn-dark:hover:not(:disabled) { background: #1a3a5f; }
      .iu-btn-outline {
        background: transparent;
        border: 1.5px solid #e5e7eb;
        color: #374151;
      }
      .iu-btn-outline:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; }
      .iu-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      /* Message boxes */
      .iu-msg {
        padding: 11px 14px;
        border-radius: 8px;
        font-size: 13px;
        margin: 12px 0;
        line-height: 1.5;
      }
      .iu-msg-success { background: #d1fae5; color: #065f46; border-left: 3px solid #10b981; }
      .iu-msg-error { background: #fee2e2; color: #991b1b; border-left: 3px solid #ef4444; }
      .iu-msg-info { background: #dbeafe; color: #1e40af; border-left: 3px solid #3b82f6; }

      /* Honeypot */
      .iu-hp {
        position: absolute !important;
        left: -9999px !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* Footer widget (bültene kayıt) */
      .iu-widget {
        background: linear-gradient(135deg, #0a1929, #1a3a5f);
        color: white;
        padding: 48px 32px;
        border-radius: 16px;
        text-align: center;
        margin: 40px auto;
        max-width: 700px;
        position: relative;
        overflow: hidden;
      }
      .iu-widget::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -20%;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(212,165,78,0.2), transparent 70%);
        pointer-events: none;
      }
      .iu-widget h3 { font-size: 26px; margin: 0 0 8px 0; color: #3b82f6; position: relative; }
      .iu-widget p { font-size: 15px; opacity: 0.9; margin: 0 0 24px 0; position: relative; }
      .iu-widget-form {
        display: flex; gap: 8px; max-width: 480px; margin: 0 auto;
        position: relative;
      }
      .iu-widget-form input {
        flex: 1;
        padding: 14px 16px;
        border: none;
        border-radius: 8px;
        font-size: 15px;
      }
      .iu-widget-form button {
        padding: 14px 28px;
        background: #3b82f6;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }
      .iu-widget-form button:hover { background: #b8912e; }
      .iu-widget small {
        display: block; margin-top: 16px;
        opacity: 0.7; font-size: 12px; position: relative;
      }

      .iu-kvkk {
        font-size: 11px;
        color: #6b7280;
        margin-top: 12px;
        line-height: 1.5;
      }
      .iu-kvkk a { color: #3b82f6; text-decoration: none; }

      .iu-spinner {
        display: inline-block;
        width: 16px; height: 16px;
        border: 2px solid rgba(0,0,0,0.15);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: iuSpin 0.8s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
      }
      @keyframes iuSpin { to { transform: rotate(360deg); } }

      .iu-forgot-link {
        display: block;
        text-align: right;
        margin-top: -8px;
        margin-bottom: 12px;
        font-size: 12px;
        color: #3b82f6;
        text-decoration: none;
        font-weight: 500;
      }
      .iu-forgot-link:hover { text-decoration: underline; }

      @media (max-width: 640px) {
        /* Modal: tam ekran + iOS Safari dinamik viewport */
        .iu-modal {
          padding: 0 !important;
          align-items: stretch !important;
        }
        .iu-modal-content {
          max-width: 100% !important;
          width: 100% !important;
          max-height: 100dvh !important;
          height: 100dvh !important;
          border-radius: 0 !important;
        }
        /* Header: kompakt, X butonu net görünür */
        .iu-modal-header {
          padding: 18px 20px 16px !important;
        }
        .iu-modal-brand { font-size: 16px !important; }
        .iu-modal-subtitle { font-size: 10px !important; }
        /* Body: yeterli padding + safe area alt */
        .iu-modal-body {
          padding: 18px 20px calc(24px + env(safe-area-inset-bottom)) !important;
        }
        /* Form: satır aralıkları sıkılaştırıldı */
        .iu-tabs {
          margin-bottom: 14px !important;
          padding: 3px !important;
        }
        .iu-tab {
          padding: 9px 8px !important;
          font-size: 11px !important;
        }
        .iu-intro { font-size: 13px !important; margin-bottom: 14px !important; }
        .iu-form-group { margin-bottom: 10px !important; }
        .iu-label { font-size: 11px !important; margin-bottom: 4px !important; }
        /* iOS Safari otomatik zoom fix: input font-size >= 16px olmalı
           yoksa focus'ta zoom-in yapıp modal kapansa da geri gelmiyor */
        .iu-input, .iu-select {
          padding: 12px 14px !important;
          font-size: 16px !important;
        }
        .iu-widget-form input {
          font-size: 16px !important;
        }
        .iu-btn {
          padding: 12px 18px !important;
          font-size: 14px !important;
          margin-top: 6px !important;
        }
        .iu-kvkk { font-size: 10px !important; margin-top: 10px !important; }
        .iu-checkboxes { grid-template-columns: 1fr; gap: 5px !important; }
        .iu-widget-form { flex-direction: column; }
        .iu-authbar { flex-direction: column; gap: 4px; }
        .iu-authbar-btn { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== MODAL ====================
  function createModal() {
    if (document.getElementById('iu-auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'iu-auth-modal';
    modal.className = 'iu-modal';
    modal.innerHTML = `
      <div class="iu-modal-content" onclick="event.stopPropagation()">
        <div class="iu-modal-header">
          <div class="iu-modal-brand">İSMAİL <span class="accent">ÜNSAL</span></div>
          <div class="iu-modal-subtitle">Gayrimenkul</div>
          <button class="iu-modal-close" onclick="IUAuth.close()" aria-label="Kapat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        <div class="iu-modal-body">
          <div class="iu-tabs">
            <button class="iu-tab active" data-tab="signup" onclick="IUAuth.switchTab('signup')">Üye Ol</button>
            <button class="iu-tab" data-tab="login" onclick="IUAuth.switchTab('login')">Giriş</button>
            <button class="iu-tab" data-tab="subscribe" onclick="IUAuth.switchTab('subscribe')">Bülten</button>
          </div>

          <!-- SIGNUP (Müşteri Kayıt) -->
          <div class="iu-tab-content active" id="iu-tab-signup">
            <p class="iu-intro">🏠 Hesap açarak favori ilanlarınızı kaydedin, kişiselleştirilmiş bildirimlere abone olun.</p>

            <form id="iu-signup-form" novalidate>
              <input type="text" name="website" class="iu-hp" tabindex="-1" autocomplete="off">

              <div class="iu-form-group">
                <label class="iu-label">Ad Soyad <span class="iu-required">*</span></label>
                <input type="text" name="full_name" class="iu-input" required maxlength="100" placeholder="Ahmet Yılmaz" autocomplete="name">
              </div>

              <div class="iu-form-group">
                <label class="iu-label">Email <span class="iu-required">*</span></label>
                <input type="email" name="email" class="iu-input" required maxlength="254" placeholder="ornek@email.com" autocomplete="email">
              </div>

              <div class="iu-form-group">
                <label class="iu-label">Telefon (opsiyonel)</label>
                <input type="tel" name="phone" class="iu-input" maxlength="20" placeholder="+90 555 123 45 67" autocomplete="tel">
              </div>

              <div class="iu-form-group">
                <label class="iu-label">Şifre <span class="iu-required">*</span> <small style="font-weight:400;color:#6b7280;text-transform:none;letter-spacing:0">(En az 8 karakter)</small></label>
                <div class="iu-password-wrap">
                  <input type="password" name="password" id="iu-signup-password" class="iu-input" required minlength="8" maxlength="128" placeholder="••••••••" autocomplete="new-password">
                  <button type="button" class="iu-password-toggle" onclick="IUAuth.togglePassword('iu-signup-password', this)" aria-label="Şifreyi göster/gizle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>

              <div class="iu-form-group">
                <label class="iu-label">Email Dili</label>
                <select name="language" class="iu-select">
                  <option value="tr">🇹🇷 Türkçe</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="ru">🇷🇺 Русский</option>
                </select>
              </div>

              <div id="iu-signup-msg"></div>

              <button type="submit" class="iu-btn iu-btn-primary" id="iu-signup-btn">
                🎉 Hesap Oluştur
              </button>

              <div class="iu-kvkk">
                Kayıt olarak <a href="/kvkk" target="_blank">KVKK Aydınlatma Metni</a>'ni okuduğunuzu ve <a href="/kullanim-kosullari" target="_blank">Kullanım Koşulları</a>'nı kabul ettiğinizi onaylarsınız.
              </div>
            </form>
          </div>

          <!-- LOGIN (Genel Giriş - Müşteri/Admin otomatik) -->
          <div class="iu-tab-content" id="iu-tab-login">
            <p class="iu-intro">👋 Hoş geldiniz! Hesabınıza giriş yapın.</p>

            <form id="iu-login-form" novalidate>
              <div class="iu-form-group">
                <label class="iu-label">Email</label>
                <input type="email" name="email" class="iu-input" required maxlength="254" placeholder="ornek@email.com" autocomplete="email">
              </div>

              <div class="iu-form-group">
                <label class="iu-label">Şifre</label>
                <div class="iu-password-wrap">
                  <input type="password" name="password" id="iu-login-password" class="iu-input" required minlength="8" placeholder="••••••••" autocomplete="current-password">
                  <button type="button" class="iu-password-toggle" onclick="IUAuth.togglePassword('iu-login-password', this)" aria-label="Şifreyi göster/gizle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>

              <a href="#" onclick="IUAuth.forgotPassword(event)" class="iu-forgot-link">Şifremi Unuttum</a>

              <div id="iu-login-msg"></div>

              <button type="submit" class="iu-btn iu-btn-dark" id="iu-login-btn">
                🔐 Giriş Yap
              </button>

              <div style="text-align: center; margin-top: 16px; font-size: 13px; color: #6b7280;">
                Hesabınız yok mu? <a href="#" onclick="IUAuth.switchTab('signup'); return false;" style="color: #3b82f6; font-weight: 600; text-decoration: none;">Üye Ol</a>
              </div>
            </form>
          </div>

          <!-- SUBSCRIBE (Hızlı Bülten - Hesap gerektirmez) -->
          <div class="iu-tab-content" id="iu-tab-subscribe">
            <p class="iu-intro">📬 Hesap açmadan hızlı bülten kaydı. Yeni ilanlardan haberdar olun.</p>

            <form id="iu-subscribe-form" novalidate>
              <input type="text" name="website" class="iu-hp" tabindex="-1" autocomplete="off">

              <div class="iu-form-group">
                <label class="iu-label">Email <span class="iu-required">*</span></label>
                <input type="email" name="email" class="iu-input" required maxlength="254" placeholder="ornek@email.com" autocomplete="email">
              </div>

              <div class="iu-form-group">
                <label class="iu-label">İlgi Alanlarınız</label>
                <div class="iu-checkboxes">
                  <label class="iu-checkbox-label"><input type="checkbox" name="kat" value="arsa"> 🏞️ Arsa</label>
                  <label class="iu-checkbox-label"><input type="checkbox" name="kat" value="daire"> 🏢 Daire</label>
                  <label class="iu-checkbox-label"><input type="checkbox" name="kat" value="villa"> 🏡 Villa</label>
                  <label class="iu-checkbox-label"><input type="checkbox" name="kat" value="isyeri"> 🏪 İşyeri</label>
                </div>
              </div>

              <div id="iu-sub-msg"></div>

              <button type="submit" class="iu-btn iu-btn-primary" id="iu-sub-btn">
                📬 Bültene Kayıt Ol
              </button>

              <div class="iu-kvkk">
                <a href="/kvkk" target="_blank">KVKK Aydınlatma Metni</a>'ni kabul ediyorum.
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
    document.getElementById('iu-signup-form').addEventListener('submit', handleSignup);
    document.getElementById('iu-login-form').addEventListener('submit', handleLogin);
    document.getElementById('iu-subscribe-form').addEventListener('submit', handleSubscribe);
  }

  function showMsg(id, text, type = 'info') {
    document.getElementById(id).innerHTML = `<div class="iu-msg iu-msg-${type}">${Security.escapeHtml(text)}</div>`;
  }

  // MÜŞTERİ KAYIT
  async function handleSignup(e) {
    e.preventDefault();
    const btn = document.getElementById('iu-signup-btn');
    const originalText = btn.innerHTML;

    try {
      const form = e.target;
      if (form.website.value) return; // honeypot

      if (!Security.checkClientRateLimit('signup', 3, 3600000)) {
        showMsg('iu-signup-msg', 'Çok fazla deneme. 1 saat sonra tekrar deneyin.', 'error');
        return;
      }

      const email = form.email.value.trim().toLowerCase();
      const password = form.password.value;
      const fullName = Security.sanitizeInput(form.full_name.value, 100);
      const phone = form.phone.value.trim();
      const language = form.language.value;

      if (!fullName || fullName.length < 2) {
        showMsg('iu-signup-msg', 'Ad soyad giriniz.', 'error');
        return;
      }
      if (!Security.isValidEmail(email)) {
        showMsg('iu-signup-msg', 'Geçerli bir email girin.', 'error');
        return;
      }
      if (phone && !Security.isValidPhone(phone)) {
        showMsg('iu-signup-msg', 'Geçerli bir telefon numarası girin.', 'error');
        return;
      }

      const strength = Security.checkPasswordStrength(password);
      if (!strength.valid) {
        showMsg('iu-signup-msg', `Şifre çok zayıf (${strength.level}). En az 8 karakter, büyük/küçük harf ve rakam kullanın.`, 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="iu-spinner"></span>Kayıt yapılıyor...';

      const sb = initSupabase();

      // Supabase Auth signup
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, language, phone },
          emailRedirectTo: `${CONFIG.SITE_URL}/verify-account`
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          showMsg('iu-signup-msg', 'Bu email zaten kayıtlı. Giriş yapmayı deneyin.', 'info');
        } else {
          showMsg('iu-signup-msg', 'Kayıt hatası: ' + error.message, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      // Phone bilgisini profile update et
      if (phone && data.user) {
        await sb.from('customer_profiles').update({ phone }).eq('id', data.user.id);
      }

      showMsg('iu-signup-msg',
        '✅ Kayıt başarılı! Email adresinize doğrulama linki gönderdik. Lütfen mailinizi kontrol edin (spam klasörünü de).',
        'success'
      );

      form.reset();
      setTimeout(() => {
        IUAuth.close();
        checkUserStatus();
      }, 3000);

    } catch (err) {
      console.error('[Signup]', err);
      showMsg('iu-signup-msg', 'Beklenmeyen hata: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  // GİRİŞ (Müşteri veya Admin)
  async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('iu-login-btn');
    const originalText = btn.innerHTML;

    try {
      const email = e.target.email.value.trim().toLowerCase();
      const password = e.target.password.value;

      if (!Security.isValidEmail(email)) {
        showMsg('iu-login-msg', 'Geçerli bir email girin.', 'error');
        return;
      }
      if (password.length < 8) {
        showMsg('iu-login-msg', 'Şifre en az 8 karakter olmalı.', 'error');
        return;
      }

      if (!Security.checkClientRateLimit('login_' + email, 5, 60000)) {
        showMsg('iu-login-msg', 'Çok fazla deneme. 1 dakika bekleyin.', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="iu-spinner"></span>Giriş yapılıyor...';

      const sb = initSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      if (error) {
        showMsg('iu-login-msg', error.message === 'Invalid login credentials' ? 'Email veya şifre hatalı.' : error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      // Admin mi kontrol et
      const { data: adminData } = await sb.from('admin_users').select('role').eq('id', data.user.id).maybeSingle();

      // URL'den redirect parametresini al
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirect');

      if (adminData) {
        showMsg('iu-login-msg', '✅ Admin girişi başarılı! Admin panele yönlendiriliyorsunuz...', 'success');
        setTimeout(() => {
          window.location.href = redirectTo || '/admin/index.html';
        }, 800);
      } else {
        showMsg('iu-login-msg', '✅ Hoş geldiniz! Yönlendiriliyorsunuz...', 'success');
        setTimeout(() => {
          IUAuth.close();
          checkUserStatus();
          if (redirectTo) {
            window.location.href = redirectTo;
          } else if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            window.location.href = CONFIG.ACCOUNT_URL;
          } else {
            window.location.reload();
          }
        }, 800);
      }

    } catch (err) {
      console.error('[Login]', err);
      showMsg('iu-login-msg', 'Hata: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  // BÜLTEN KAYIT (Hesap gerektirmez)
  async function handleSubscribe(e) {
    e.preventDefault();
    const btn = document.getElementById('iu-sub-btn');
    const originalText = btn.innerHTML;

    try {
      const form = e.target;
      if (form.website.value) return;

      if (!Security.checkClientRateLimit('subscribe', 3, 3600000)) {
        showMsg('iu-sub-msg', 'Çok fazla deneme. 1 saat sonra deneyin.', 'error');
        return;
      }

      const email = form.email.value.trim().toLowerCase();
      if (!Security.isValidEmail(email)) {
        showMsg('iu-sub-msg', 'Geçerli bir email girin.', 'error');
        return;
      }

      const kategoriler = Array.from(form.querySelectorAll('input[name="kat"]:checked')).map(c => c.value);

      btn.disabled = true;
      btn.innerHTML = '<span class="iu-spinner"></span>Kaydediliyor...';

      const sb = initSupabase();
      const { data, error } = await sb.from('subscribers').insert({
        email,
        ilgi_kategoriler: kategoriler,
        language: 'tr',
        signup_source: 'modal_widget',
        user_agent: navigator.userAgent.substring(0, 500)
      }).select('id').single();

      if (error) {
        if (error.code === '23505') {
          showMsg('iu-sub-msg', 'Bu email zaten kayıtlı.', 'info');
        } else {
          showMsg('iu-sub-msg', 'Hata: ' + error.message, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      // Verification email tetikle
      fetch(`${CONFIG.SUPABASE_URL}/functions/v1/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
        },
        body: JSON.stringify({ subscriberId: data.id })
      }).catch(() => {});

      showMsg('iu-sub-msg', '✅ Kayıt başarılı! Email adresinize doğrulama linki gönderdik.', 'success');
      form.reset();

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }, 3000);

    } catch (err) {
      console.error('[Subscribe]', err);
      showMsg('iu-sub-msg', 'Hata: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  // ==================== USER STATUS ====================
  async function checkUserStatus() {
    const sb = initSupabase();
    const { data: { user } } = await sb.auth.getUser();
    IUAuth.user = user;
    renderAuthBar();
  }

  // ==================== OTOMATIK AUTH INJECTION ====================
  // Home page ile tutarlı: .top-right içine, .top-social'dan sonra, .lang-switcher'dan önce
  function autoInjectAuthContainer() {
    if (window.location.pathname.toLowerCase().includes('/admin')) return;

    // 1) TOPBAR auth (desktop için gösterilir, mobile'da CSS hide eder)
    if (!document.querySelector('.topbar-auth[data-iu-auth]')) {
      const topRight = document.querySelector('.top-bar-inner .top-right, .top-right');
      if (topRight) {
        const authDiv = document.createElement('div');
        authDiv.setAttribute('data-iu-auth', '');
        authDiv.className = 'topbar-auth';
        const langSw = topRight.querySelector('.lang-switcher, #langSwitcher');
        if (langSw) topRight.insertBefore(authDiv, langSw);
        else topRight.appendChild(authDiv);
      } else {
        // Fallback: floating
        const authDiv = document.createElement('div');
        authDiv.setAttribute('data-iu-auth', '');
        authDiv.className = 'topbar-auth';
        authDiv.style.cssText = 'position:fixed;top:14px;right:20px;z-index:99998;background:rgba(10,42,94,0.95);padding:8px 14px;border-radius:24px;box-shadow:0 4px 20px rgba(0,0,0,0.25);';
        document.body.appendChild(authDiv);
      }
    }

    // 2) NAV mobile menu içine auth (mobile'da menüyü açtığında görünür)
    // Her sayfada nav var: <nav class="nav"> ... </nav>
    if (!document.querySelector('.nav-auth-mobile[data-iu-auth]')) {
      const nav = document.querySelector('nav.nav, .nav, #mainNav');
      if (nav) {
        const navAuthDiv = document.createElement('div');
        navAuthDiv.setAttribute('data-iu-auth', '');
        navAuthDiv.className = 'nav-auth-mobile';
        // Nav'ın EN BAŞINA ekle (order: -1 CSS ile en üste geçer)
        nav.insertBefore(navAuthDiv, nav.firstChild);
        console.log('[IUAuth] nav-auth-mobile eklendi');
      }
    }
  }

  // Auth widget için tutarlı stil ekle - HOME PAGE İLE AYNI (index.html'den kopyalandı)
  function injectAuthStyles() {
    if (document.getElementById('iu-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'iu-auth-styles';
    style.textContent = `
      /* AUTH BUTONLARI - Home page ile aynı tasarım */
      .topbar-auth {
        display: inline-flex;
        align-items: center;
        margin-right: 16px;
        padding-right: 16px;
        border-right: 1px solid rgba(255,255,255,0.15);
      }
      .topbar-auth .iu-authbar {
        gap: 4px !important;
        flex-direction: row !important;
        display: inline-flex !important;
        align-items: center;
      }
      .topbar-auth .iu-authbar-btn {
        padding: 5px 12px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        letter-spacing: 0.3px !important;
        border-radius: 4px !important;
        border-width: 1px !important;
        border-style: solid !important;
        line-height: 1.4 !important;
        display: inline-flex !important;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        font-family: inherit;
      }
      .topbar-auth .iu-authbar-signup {
        background: #F49B1C !important;
        color: #0A2A5E !important;
        border-color: #F49B1C !important;
      }
      .topbar-auth .iu-authbar-signup:hover {
        background: #FFB543 !important;
      }
      .topbar-auth .iu-authbar-login {
        background: transparent !important;
        color: #FFFFFF !important;
        border-color: rgba(255,255,255,0.4) !important;
      }
      .topbar-auth .iu-authbar-login:hover {
        background: rgba(255,255,255,0.1) !important;
      }
      .topbar-auth .iu-authbar-user {
        padding: 3px 10px 3px 3px !important;
        background: rgba(255,255,255,0.1) !important;
        border: 1px solid rgba(255,255,255,0.2) !important;
        border-radius: 20px !important;
        display: inline-flex !important;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
      .topbar-auth .iu-authbar-avatar {
        width: 22px !important; height: 22px !important;
        font-size: 11px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #F49B1C, #d4831a);
        color: #0A2A5E;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
      }
      .topbar-auth .iu-authbar-name {
        color: #FFFFFF !important;
        font-size: 11px !important;
        font-weight: 600;
        max-width: 100px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .topbar-auth .iu-authbar-user {
        max-width: 160px !important;
        overflow: hidden !important;
      }
      .topbar-auth .iu-user-menu {
        background: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
        top: calc(100% + 12px) !important;
        min-width: 240px !important;
      }
      .topbar-auth .iu-user-menu-header {
        background: #f9fafb !important;
        border-bottom: 1px solid #e5e7eb !important;
        padding: 14px 16px !important;
      }
      .topbar-auth .iu-user-menu-header > div {
        color: #0a1929 !important;
        font-weight: 700 !important;
        font-size: 14px !important;
      }
      .topbar-auth .iu-user-menu-email {
        color: #6b7280 !important;
        font-size: 12px !important;
        margin-top: 2px !important;
      }
      .topbar-auth .iu-user-menu a {
        color: #0a1929 !important;
        padding: 10px 16px !important;
        font-size: 13px !important;
        display: flex !important;
        align-items: center;
        gap: 8px;
        text-decoration: none;
      }
      .topbar-auth .iu-user-menu a:hover {
        background: #f3f4f6 !important;
      }
      .topbar-auth .iu-user-menu-logout {
        color: #dc2626 !important;
      }
      .topbar-auth .iu-user-menu-divider {
        border-top: 1px solid #e5e7eb;
        margin: 4px 0;
      }
      @media (max-width: 768px) {
        /* Not logged in: keep buttons in topbar but compact */
        .topbar-auth {
          margin-right: 6px !important;
          padding-right: 6px !important;
        }
        .topbar-auth .iu-authbar-name { display: none !important; }
        .topbar-auth .iu-authbar-btn {
          padding: 5px 10px !important;
          font-size: 10px !important;
        }
        /* When logged in: move the user badge OUT of topbar to a fixed
           bottom-right floating pill so it does not compress the top row
           (numbers + social icons + language switcher were crashing).
           Both selectors so it works with or without :has() support. */
        .topbar-auth.iu-signed-in,
        .topbar-auth:has(.iu-authbar-user) {
          position: fixed !important;
          bottom: 20px !important;
          left: 12px !important;
          right: auto !important;
          top: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          z-index: 999997 !important;
        }
        .topbar-auth.iu-signed-in .iu-authbar-user,
        .topbar-auth:has(.iu-authbar-user) .iu-authbar-user {
          background: rgba(10,42,94,0.95) !important;
          border: 2px solid rgba(244,155,28,0.5) !important;
          padding: 8px 14px 8px 8px !important;
          border-radius: 40px !important;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25) !important;
          backdrop-filter: blur(8px);
        }
        .topbar-auth.iu-signed-in .iu-authbar-name,
        .topbar-auth:has(.iu-authbar-user) .iu-authbar-name {
          display: inline-block !important;
          color: #ffffff !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          max-width: 100px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .topbar-auth.iu-signed-in .iu-authbar-avatar,
        .topbar-auth:has(.iu-authbar-user) .iu-authbar-avatar {
          width: 32px !important;
          height: 32px !important;
          border: 2px solid #F49B1C !important;
        }
        /* User menu opens upward on mobile to stay on screen */
        .topbar-auth.iu-signed-in .iu-user-menu,
        .topbar-auth:has(.iu-authbar-user) .iu-user-menu {
          top: auto !important;
          bottom: calc(100% + 10px) !important;
          left: 0 !important;
          right: auto !important;
          min-width: 260px !important;
          max-width: calc(100vw - 24px) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== HEADER AUTH BAR ====================
  function renderAuthBar() {
    // Önce stil ekle + otomatik enjekte et (yoksa)
    injectAuthStyles();
    autoInjectAuthContainer();

    // Manuel yerleştirilmiş [data-iu-auth] elementleri
    const containers = document.querySelectorAll('[data-iu-auth]');

    containers.forEach(container => {
      container.innerHTML = ''; // temizle
      // Class-based state marker (fallback for :has() unsupported browsers)
      if (IUAuth.user) container.classList.add('iu-signed-in');
      else container.classList.remove('iu-signed-in');

      // SVG icons (renksiz, sade)
      const iconUser = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="flex-shrink:0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
      const iconUserPlus = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="flex-shrink:0"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
      const iconAccount = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="flex-shrink:0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
      const iconHeart = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
      const iconSearch = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
      const iconLogout = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
      const iconAdmin = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>';

      if (IUAuth.user) {
        // Giriş yapmış kullanıcı
        const initial = (IUAuth.user.user_metadata?.full_name || IUAuth.user.email || 'U').charAt(0).toUpperCase();
        const name = IUAuth.user.user_metadata?.full_name || IUAuth.user.email.split('@')[0];
        const isAdmin = IUAuth.isAdmin === true;

        // Admin için farklı menü - admin panele git en üstte olsun
        const adminMenuItem = isAdmin ? `
          <a href="/admin/index.html" style="background: linear-gradient(90deg, #dbeafe, transparent); color: #1e40af; font-weight: 600;">
            ${iconAdmin} Admin Panele Git
          </a>
          <div class="iu-user-menu-divider"></div>
        ` : '';

        // Admin kullanıcı için Hesabım linki admin paneline gitsin (customer sayfası değil)
        const accountLink = isAdmin ? '/admin/index.html' : CONFIG.ACCOUNT_URL;

        // Mobile-specific: separate action buttons (bypass .iu-user-menu
        // positioning issues). Hidden on desktop via CSS.
        const mobileAction1 = isAdmin
          ? `<a href="/admin/index.html" class="iu-mobile-btn iu-mobile-btn-admin">Admin Panel</a>`
          : `<a href="${accountLink}" class="iu-mobile-btn iu-mobile-btn-account">Hesabım</a>`;
        const mobileAction2 = `<a href="#" onclick="IUAuth.logout(event); return false;" class="iu-mobile-btn iu-mobile-btn-logout">Çıkış Yap</a>`;

        container.innerHTML = `
          <div class="iu-authbar" style="position: relative;">
            <div class="iu-authbar-user" onclick="IUAuth.toggleUserMenu(event)">
              <div class="iu-authbar-avatar" style="${isAdmin ? 'background: linear-gradient(135deg, #3b82f6, #1e40af);' : ''}">${Security.escapeHtml(initial)}</div>
              <div class="iu-authbar-name">${Security.escapeHtml(name)}${isAdmin ? ' <span style="font-size:10px; color:#3b82f6; margin-left:4px;">●</span>' : ''}</div>
            </div>
            <div class="iu-user-menu">
              <div class="iu-user-menu-header">
                <div style="font-weight: 600;">${Security.escapeHtml(name)}${isAdmin ? ' <span style="background:#3b82f6;color:white;font-size:10px;padding:2px 6px;border-radius:8px;margin-left:6px;">ADMIN</span>' : ''}</div>
                <div class="iu-user-menu-email">${Security.escapeHtml(IUAuth.user.email)}</div>
              </div>
              ${adminMenuItem}
              ${!isAdmin ? `<a href="${accountLink}">${iconAccount} Hesabım</a>
              <a href="/favorilerim">${iconHeart} Favorilerim</a>
              <a href="/aramalarim">${iconSearch} Kayıtlı Aramalar</a>` : ''}
              ${!isAdmin ? '<div class="iu-user-menu-divider"></div>' : ''}
              <a href="#" onclick="IUAuth.logout(event)" class="iu-user-menu-logout">${iconLogout} Çıkış Yap</a>
            </div>
            <div class="iu-mobile-actions">
              ${mobileAction1}
              ${mobileAction2}
            </div>
          </div>
        `;
      } else {
        // Giriş yapmamış — inline styles ile mobile'da FULL WIDTH garantili
        // (nav-auth-mobile içindeyse; topbar-auth'ta zaten kompakt)
        const isMobileNav = container.classList.contains('nav-auth-mobile');
        const barStyle = isMobileNav
          ? 'display:flex !important; flex-direction:row !important; width:100% !important; gap:8px !important; box-sizing:border-box;'
          : '';
        const btnStyle = isMobileNav
          ? 'flex:1 1 0 !important; width:100% !important; min-width:0 !important; max-width:none !important; padding:10px 8px !important; font-size:13px !important; justify-content:center !important; align-items:center !important; display:flex !important; box-sizing:border-box !important; border-radius:8px !important;'
          : '';
        container.innerHTML = `
          <div class="iu-authbar" style="${barStyle}">
            <button class="iu-authbar-btn iu-authbar-login" style="${btnStyle}" onclick="IUAuth.open('login')">${iconUser} Giriş</button>
            <button class="iu-authbar-btn iu-authbar-signup" style="${btnStyle}" onclick="IUAuth.open('signup')">${iconUserPlus} Üye Ol</button>
          </div>
        `;
      }
    });
  }

  // ==================== FOOTER WIDGET ====================
  function createFooterWidget() {
    const targets = document.querySelectorAll('#subscribe-form, .subscribe-form-container');
    targets.forEach(target => {
      target.innerHTML = `
        <div class="iu-widget">
          <h3>📬 Fırsatlardan İlk Siz Haberdar Olun</h3>
          <p>Yalova'nın en güncel gayrimenkul ilanları haftalık bültenimizde. Ücretsiz.</p>
          <form class="iu-widget-form" onsubmit="IUAuth.quickSubscribe(event)">
            <input type="email" placeholder="email@adres.com" required maxlength="254">
            <button type="submit">Kayıt Ol</button>
          </form>
          <small>Detaylı tercih ve hesap için <a href="#" onclick="IUAuth.open('signup'); return false;" style="color: #3b82f6;">buraya tıklayın</a></small>
        </div>
      `;
    });
  }

  // ==================== PUBLIC API ====================
  window.IUAuth = {
    user: null,

    open(tab = 'signup') {
      const modal = document.getElementById('iu-auth-modal');
      if (!modal) return;
      modal.classList.add('active');
      this.switchTab(tab);
      document.body.style.overflow = 'hidden';
    },

    close() {
      const modal = document.getElementById('iu-auth-modal');
      if (!modal) return;
      // Focus'u input'tan al ki iOS Safari zoom stuck'da kalmasın
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      modal.classList.remove('active');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      ['iu-signup-msg', 'iu-login-msg', 'iu-sub-msg'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
      });
      // iOS Safari için: viewport meta'yı toggle et → zoom seviyesi resetlensin
      // Yalnız gerektiğinde (touch device'larda) ve maximum-scale değişikliği geçici
      try {
        const vp = document.querySelector('meta[name="viewport"]');
        if (vp && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          const orig = vp.getAttribute('content');
          vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
          // Bir sonraki tick'te orijinal viewport'a döndür (kullanıcı pinch-zoom yapabilsin)
          setTimeout(() => {
            vp.setAttribute('content', orig || 'width=device-width, initial-scale=1');
          }, 300);
        }
      } catch (e) { /* noop */ }
    },

    switchTab(tab) {
      document.querySelectorAll('.iu-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
      });
      document.querySelectorAll('.iu-tab-content').forEach(c => {
        c.classList.toggle('active', c.id === `iu-tab-${tab}`);
      });
    },

    /**
     * Toggle password visibility for a specific input.
     * Security: only toggles the `type` attribute on the input; the value
     * itself never leaves the client and no logging happens. Autocomplete
     * hints (new-password / current-password) are preserved.
     */
    togglePassword(inputId, btn) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const isShown = input.type === 'text';
      input.type = isShown ? 'password' : 'text';
      // Swap icon: eye ↔ eye-off
      const showSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      const hideSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      if (btn) btn.innerHTML = isShown ? showSvg : hideSvg;
    },

    async logout(e) {
      if (e) e.preventDefault();
      const sb = initSupabase();
      await sb.auth.signOut();
      this.user = null;
      renderAuthBar();
      if (window.location.pathname.startsWith('/hesab') || window.location.pathname.startsWith('/favorilerim')) {
        window.location.href = '/';
      }
    },

    toggleUserMenu(e) {
      e.stopPropagation();
      const menus = document.querySelectorAll('.iu-user-menu');
      menus.forEach(m => m.classList.toggle('open'));
    },

    async forgotPassword(e) {
      e.preventDefault();
      const email = prompt('Şifrenizi sıfırlamak için email adresinizi girin:');
      if (!email || !Security.isValidEmail(email)) return;

      const sb = initSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${CONFIG.SITE_URL}/sifre-sifirla`
      });

      if (error) {
        alert('Hata: ' + error.message);
      } else {
        alert('✅ Şifre sıfırlama linki email adresinize gönderildi.');
      }
    },

    async quickSubscribe(e) {
      e.preventDefault();
      const email = e.target.querySelector('input').value.trim().toLowerCase();
      if (!Security.isValidEmail(email)) { alert('Geçerli bir email girin'); return; }
      if (!Security.checkClientRateLimit('quick_sub', 3, 3600000)) { alert('Çok fazla deneme. 1 saat sonra deneyin.'); return; }

      const sb = initSupabase();
      const { data, error } = await sb.from('subscribers').insert({
        email, language: 'tr', signup_source: 'footer_widget',
        user_agent: navigator.userAgent.substring(0, 500)
      }).select('id').single();

      if (error) {
        alert(error.code === '23505' ? 'Bu email zaten kayıtlı!' : 'Hata: ' + error.message);
        return;
      }

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
      alert('✅ Kayıt başarılı! Email doğrulama linki gönderdik.');
    },

    async toggleFavorite(propertyId) {
      if (!this.user) {
        this.open('login');
        return { requires_login: true };
      }

      const sb = initSupabase();
      const { data, error } = await sb.rpc('toggle_favorite', { p_property_id: propertyId });
      if (error) {
        console.error('[Favorite]', error);
        return { error: error.message };
      }
      return data?.[0] || {};
    }
  };

  // Admin kontrolü - kullanıcının admin olup olmadığını cek
  async function checkAdminStatus(user) {
    if (!user) return false;
    try {
      const sb = initSupabase();
      const { data } = await sb.from('admin_users').select('role, is_active').eq('id', user.id).maybeSingle();
      return !!(data && data.is_active !== false);
    } catch (err) {
      console.warn('[Admin check]', err);
      return false;
    }
  }

  // ==================== INIT ====================
  async function init() {
    injectStyles();
    createModal();
    createFooterWidget();

    // Session kontrolü
    const sb = initSupabase();
    if (sb) {
      const { data: { user } } = await sb.auth.getUser();
      IUAuth.user = user;
      IUAuth.isAdmin = await checkAdminStatus(user);
      renderAuthBar();

      // Session değişimini dinle
      sb.auth.onAuthStateChange(async (event, session) => {
        IUAuth.user = session?.user || null;
        IUAuth.isAdmin = await checkAdminStatus(IUAuth.user);
        renderAuthBar();
      });
    }

    // URL parametresi kontrol - eğer zaten login olmuş ve redirect param varsa direkt yönlendir
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');

    if (IUAuth.user && redirectParam) {
      // Zaten login olmuş ve redirect var - direkt admin panele git
      if (IUAuth.isAdmin) {
        window.location.href = redirectParam;
        return;
      }
    }

    // Modal otomatik açma (?login=1 veya ?signup=1)
    if (urlParams.get('login') === '1' && !IUAuth.user) {
      setTimeout(() => IUAuth.open('login'), 100);
    } else if (urlParams.get('signup') === '1' && !IUAuth.user) {
      setTimeout(() => IUAuth.open('signup'), 100);
    }

    // Dropdown dışına tıklayınca kapat
    document.addEventListener('click', () => {
      document.querySelectorAll('.iu-user-menu.open').forEach(m => m.classList.remove('open'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
