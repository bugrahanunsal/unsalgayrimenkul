/**
 * ============================================
 * AUTHENTICATION LAYER
 * İsmail Ünsal Emlak - Admin Panel
 * ============================================
 */

const Auth = {

  /**
  * Login
   */
  async login(email, password) {
    // Rate limiting
    const rateCheck = Security.rateLimiter.check('login', 5, 60000);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.message };
    }

    // Input validation
    email = Security.sanitizeInput(email, { email: true });

    if (!Security.isValidEmail(email)) {
      return { success: false, error: 'Geçersiz email formatı' };
    }

    if (!password || password.length < 8) {
      return { success: false, error: 'Şifre en az 8 karakter olmalı' };
    }

    // Suspicious activity check
    if (Security.detectSuspicious(email)) {
      await Security.logSecurityEvent('login_suspicious', { email }, 'critical');
      return { success: false, error: 'Şüpheli aktivite tespit edildi' };
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Failed login tracking
        await this.trackFailedLogin(email, error.message);

        // Kullanıcı dostu error mesajı
        let userMessage = 'Giriş başarısız';
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Email veya şifre hatalı';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Email doğrulanmamış';
        } else if (error.message.includes('rate limit')) {
          userMessage = 'Çok fazla deneme, lütfen bekleyin';
        }

        return { success: false, error: userMessage };
      }

      // Admin kontrolü
      const roleCheck = await Security.checkRole('admin');
      if (!roleCheck.hasRole) {
        // Admin değil, logout
        await supabaseClient.auth.signOut();
        await Security.logSecurityEvent('unauthorized_login_attempt', { email }, 'warning');
        return { success: false, error: 'Bu hesabın admin yetkisi yok' };
      }

      // Successful login log
      await this.trackSuccessfulLogin(data.user.id, email);
      Security.rateLimiter.reset('login');

      // CSRF token oluştur
      Security.csrf.generate();

      // Last activity
      localStorage.setItem('lastActivity', Date.now().toString());

      return {
        success: true,
        user: data.user,
        role: roleCheck.role,
        session: data.session
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Bir hata oluştu, tekrar deneyin' };
    }
  },

  /**
  * Logout - Ana siteye yönlendir
   */
  async logout() {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();

      if (user) {
        // Log logout event
        await Security.logSecurityEvent('logout', { user_id: user.id }, 'info');
      }

      // Clear sensitive data
      sessionStorage.clear();
      localStorage.removeItem('lastActivity');

      await supabaseClient.auth.signOut();

      // Ana siteye dön (login yapmak isterse oradan modal ile yapar)
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  },

  /**
  * Get Current User with Profile
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      if (error || !user) return null;

      // Admin profile'ini al
      const { data: profile } = await supabaseClient
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        ...user,
        profile
      };
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },

  /**
  * Require Auth (Page Protection)
   * Session yoksa ana siteye yönlendirir (login modal orada)
   */
  async requireAuth(minRole = 'admin') {
    const validation = await Security.validateSession();

    if (!validation.valid) {
      console.warn('Auth failed:', validation.reason);
      // Ana siteye yönlendir, orada login modal açılsın
      window.location.href = '/?login=1&redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }

    const roleCheck = await Security.checkRole(minRole);
    if (!roleCheck.hasRole) {
      // Admin değil - ana siteye yönlendir
      alert('Bu sayfaya erişim yetkiniz yok. Ana sayfaya yönlendiriliyorsunuz.');
      window.location.href = '/';
      return false;
    }

    return true;
  },

  /**
  * Track Failed Login
   */
  async trackFailedLogin(email, reason) {
    try {
      const ip = await Security.getClientIP();

      // Failed login tablosuna ekle
      await supabaseClient.from('failed_login_attempts').insert({
        email,
        ip_address: ip,
        attempts: 1
      });

      // Security log
      await Security.logSecurityEvent('login_failed', {
        email,
        reason
      }, 'warning');
    } catch (error) {
      console.error('Failed login tracking error:', error);
    }
  },

  /**
  * Track Successful Login
   */
  async trackSuccessfulLogin(userId, email) {
    try {
      const ip = await Security.getClientIP();

      // Login log
      await supabaseClient.from('admin_login_log').insert({
        admin_id: userId,
        email,
        ip_address: ip,
        user_agent: navigator.userAgent,
        success: true
      });

      // Login count artır
      const { data: current } = await supabaseClient
        .from('admin_users')
        .select('login_count')
        .eq('id', userId)
        .single();

      await supabaseClient
        .from('admin_users')
        .update({
          last_login: new Date().toISOString(),
          login_count: (current?.login_count || 0) + 1
        })
        .eq('id', userId);

      // Security log
      await Security.logSecurityEvent('login_success', { email }, 'info');
    } catch (error) {
      console.error('Successful login tracking error:', error);
    }
  },

  /**
  * Refresh Session
   */
  async refreshSession() {
    try {
      const { data, error } = await supabaseClient.auth.refreshSession();
      if (error) throw error;
      return { success: true, session: data.session };
    } catch (error) {
      console.error('Session refresh failed:', error);
      return { success: false, error: error.message };
    }
  }
};

window.Auth = Auth;

// Otomatik session refresh (her 45 dakikada bir)
setInterval(async () => {
  const validation = await Security.validateSession();
  if (validation.valid) {
    await Auth.refreshSession();
  }
}, 45 * 60 * 1000);

console.log(' Auth layer loaded');
