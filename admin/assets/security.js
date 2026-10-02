/**
 * ============================================
 * SECURITY LAYER
 * İsmail Ünsal Emlak - Admin Panel
 * ============================================
 *
 * Güvenlik özellikleri:
 * - XSS koruması (HTML sanitization)
 * - CSRF token yönetimi
 * - Rate limiting (client-side)
 * - Session validation
 * - Input validation
 * - Password strength check
 * - Failed login tracking
 * - IP logging
 */

const Security = {

  /**
  * XSS Koruması - HTML Escape
   * Kullanıcı input'unu HTML olarak render etmeden önce temizler
   */
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    return String(text).replace(/[&<>"'`=\/]/g, (s) => map[s]);
  },

  /**
  * Input Sanitization
   * Genel input temizleme
   */
  sanitizeInput(input, options = {}) {
    if (input === null || input === undefined) return '';

    let clean = String(input).trim();

    // Max length
    if (options.maxLength) {
      clean = clean.substring(0, options.maxLength);
    }

    // Sadece harf/rakam
    if (options.alphanumeric) {
      clean = clean.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s]/g, '');
    }

    // Rakam only
    if (options.numeric) {
      clean = clean.replace(/[^0-9]/g, '');
    }

    // Email format
    if (options.email) {
      clean = clean.toLowerCase();
    }

    return clean;
  },

  /**
  * Email Validation
   */
  isValidEmail(email) {
    if (!email) return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  },

  /**
  * Phone Validation (Türkiye)
   */
  isValidPhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 13;
  },

  /**
  * Password Strength Check
   */
  checkPasswordStrength(password) {
    if (!password) return { score: 0, level: 'çok zayıf', valid: false };

    let score = 0;
    const feedback = [];

    // Uzunluk
    if (password.length >= 8) score += 1;
    else feedback.push('En az 8 karakter');

    if (password.length >= 12) score += 1;

    // Küçük harf
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Küçük harf içermeli');

    // Büyük harf
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Büyük harf içermeli');

    // Rakam
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Rakam içermeli');

    // Özel karakter
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push('Özel karakter içermeli (!@#$%)');

    const levels = ['çok zayıf', 'zayıf', 'orta', 'iyi', 'güçlü', 'çok güçlü'];
    const level = levels[Math.min(score, 5)];
    const valid = score >= 4;

    return { score, level, valid, feedback };
  },

  /**
  * Rate Limiter (Client-side)
   * Aynı işlemin çok sık yapılmasını önler
   */
  rateLimiter: {
    attempts: {},

    check(action, maxAttempts = 5, windowMs = 60000) {
      const now = Date.now();
      const key = action;

      if (!this.attempts[key]) {
        this.attempts[key] = [];
      }

      // Eski denemeleri temizle
      this.attempts[key] = this.attempts[key].filter(time => now - time < windowMs);

      // Limit kontrol
      if (this.attempts[key].length >= maxAttempts) {
        const oldestAttempt = this.attempts[key][0];
        const waitTime = Math.ceil((windowMs - (now - oldestAttempt)) / 1000);
        return {
          allowed: false,
          waitTime,
          message: `Çok fazla deneme! ${waitTime} saniye bekleyin.`
        };
      }

      // Yeni deneme ekle
      this.attempts[key].push(now);

      return {
        allowed: true,
        remaining: maxAttempts - this.attempts[key].length
      };
    },

    reset(action) {
      delete this.attempts[action];
    }
  },

  /**
  * Session Validator
   * Aktif session kontrol
   */
  async validateSession() {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error || !session) {
        return { valid: false, reason: 'Session bulunamadı' };
      }

      // Session expiry check
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();

      if (now >= expiresAt) {
        await supabaseClient.auth.signOut();
        return { valid: false, reason: 'Session süresi doldu' };
      }

      // Idle timeout (30 dakika)
      const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
      const idleTimeout = 30 * 60 * 1000; // 30 dakika

      if (lastActivity && (now - lastActivity) > idleTimeout) {
        // Sayaç da temizlenir; yoksa bir sonraki girişte tekrar düşürür (giriş döngüsü)
        localStorage.removeItem('lastActivity');
        await supabaseClient.auth.signOut();
        return { valid: false, reason: 'Uzun süre işlem yapılmadı' };
      }

      // Update last activity
      localStorage.setItem('lastActivity', now.toString());

      return { valid: true, session };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, reason: 'Doğrulama hatası' };
    }
  },

  /**
  * Role Check
   * Kullanıcının yetkisi var mı?
   */
  async checkRole(requiredRole = 'admin') {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return { hasRole: false };

      const { data, error } = await supabaseClient
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data || !data.is_active) {
        this._authCache = null;
        return { hasRole: false, role: null };
      }
      // Aynı sayfa açılışında Auth.getCurrentUser() aynı bilgiyi tekrar sormasın (2 ağ isteği daha az → sayfa daha hızlı)
      this._authCache = { at: Date.now(), user, profile: data };

      // Role hiyerarşisi
      const roleHierarchy = {
        'super_admin': 4,
        'admin': 3,
        'editor': 2,
        'viewer': 1
      };

      const userLevel = roleHierarchy[data.role] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;

      return {
        hasRole: userLevel >= requiredLevel,
        role: data.role,
        userLevel
      };
    } catch (error) {
      console.error('Role check error:', error);
      return { hasRole: false, role: null };
    }
  },

  /**
  * CSRF Token
   * Cross-site request forgery koruması
   */
  csrf: {
    generate() {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem('csrf_token', token);
      return token;
    },

    get() {
      let token = sessionStorage.getItem('csrf_token');
      if (!token) {
        token = this.generate();
      }
      return token;
    },

    validate(token) {
      const stored = sessionStorage.getItem('csrf_token');
      return stored && stored === token;
    }
  },

  /**
  * Get Client IP (approximate)
   */
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  },

  /**
  * Log Security Event
   */
  async logSecurityEvent(eventType, metadata = {}, severity = 'info') {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      const ip = await this.getClientIP();

      await supabaseClient.from('security_logs').insert({
        event_type: eventType,
        user_id: user?.id || null,
        ip_address: ip,
        user_agent: navigator.userAgent,
        request_path: window.location.pathname,
        metadata,
        severity
      });
    } catch (error) {
      console.error('Security log failed:', error);
    }
  },

  /**
  * Detect Suspicious Activity
   */
  detectSuspicious(input) {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // onclick, onerror, etc.
      /SELECT.*FROM/i,
      /UNION.*SELECT/i,
      /DROP\s+TABLE/i,
      /INSERT\s+INTO/i,
      /UPDATE.*SET/i,
      /DELETE\s+FROM/i,
      /--/,
      /\/\*/,
      /eval\(/i,
      /alert\(/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        this.logSecurityEvent('suspicious_input', {
          pattern: pattern.toString(),
          input: input.substring(0, 100)
        }, 'warning');
        return true;
      }
    }
    return false;
  }
};

// Global'e ekle
window.Security = Security;

// Kullanıcı aktivitesi izle (idle timeout için)
['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
  document.addEventListener(event, () => {
    localStorage.setItem('lastActivity', Date.now().toString());
  }, { passive: true });
});

console.log(' Security layer loaded');
