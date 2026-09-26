/**
 * ============================================
 * ADMIN APP - Utilities & Layout
 * İsmail Ünsal Emlak
 * ============================================
 */

const App = {
  currentUser: null,

  /**
   * Sayfayı başlat
   */
  async init(pageName) {
    // Auth kontrol
    const isAuthed = await Auth.requireAuth('admin');
    if (!isAuthed) return false;

    // Kullanıcı bilgisini al
    this.currentUser = await Auth.getCurrentUser();

    // Layout render
    this.renderLayout(pageName);

    return true;
  },

  /**
   * Layout HTML'ini oluştur
   */
  renderLayout(activePage) {
    const user = this.currentUser;
    const role = user?.profile?.role || 'admin';
    const roleLabel = role === 'super_admin' ? 'Super Admin' : 'Admin';
    const initial = (user?.profile?.full_name || user?.email || 'A').charAt(0).toUpperCase();
    const name = user?.profile?.full_name || user?.email || 'Admin';

    // Sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.innerHTML = `
        <div class="sidebar-header">
          <a href="/admin/index.html" style="text-decoration: none; color: inherit; display: block;">
            <div class="sidebar-logo" style="font-size: 18px; letter-spacing: 1px;">İSMAİL <span style="color: #d4a54e;">ÜNSAL</span></div>
            <div class="sidebar-subtitle" style="font-size: 10px; letter-spacing: 2px; margin-top: 2px;">GAYRİMENKUL YÖNETİM</div>
          </a>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section">
            <div class="nav-section-title">Ana Menü</div>
            <a href="/admin/index.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
              <span class="nav-icon">📊</span>
              <span>Dashboard</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-section-title">İçerik Yönetimi</div>
            <a href="/admin/properties.html" class="nav-item ${activePage === 'properties' ? 'active' : ''}">
              <span class="nav-icon">🏡</span>
              <span>İlanlar</span>
            </a>
            <a href="/admin/property-new.html" class="nav-item ${activePage === 'property-new' ? 'active' : ''}">
              <span class="nav-icon">➕</span>
              <span>Yeni İlan</span>
            </a>
            <a href="/admin/team.html" class="nav-item ${activePage === 'team' ? 'active' : ''}">
              <span class="nav-icon">👥</span>
              <span>Ekip</span>
            </a>
            <a href="/admin/blog.html" class="nav-item ${activePage === 'blog' ? 'active' : ''}">
              <span class="nav-icon">📝</span>
              <span>Blog</span>
            </a>
            <a href="/admin/site-content.html" class="nav-item ${activePage === 'site-content' ? 'active' : ''}">
              <span class="nav-icon">🎨</span>
              <span>Site İçeriği</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-section-title">Müşteriler & Email</div>
            <a href="/admin/leads.html" class="nav-item ${activePage === 'leads' ? 'active' : ''}">
              <span class="nav-icon">💬</span>
              <span>Mesajlar</span>
              <span class="nav-badge" id="leadsBadge" style="display:none;">0</span>
            </a>
            <a href="/admin/subscribers.html" class="nav-item ${activePage === 'subscribers' ? 'active' : ''}">
              <span class="nav-icon">📧</span>
              <span>Aboneler</span>
              <span class="nav-badge" id="subscribersBadge" style="display:none;">0</span>
            </a>
            <a href="/admin/campaigns.html" class="nav-item ${activePage === 'campaigns' ? 'active' : ''}">
              <span class="nav-icon">📨</span>
              <span>Email Kampanyaları</span>
            </a>
          </div>

          ${role === 'super_admin' ? `
          <div class="nav-section">
            <div class="nav-section-title">Sistem</div>
            <a href="/admin/security-logs.html" class="nav-item ${activePage === 'security' ? 'active' : ''}">
              <span class="nav-icon">🛡️</span>
              <span>Güvenlik Logları</span>
            </a>
            <a href="/admin/audit-log.html" class="nav-item ${activePage === 'audit' ? 'active' : ''}">
              <span class="nav-icon">📜</span>
              <span>Değişiklik Geçmişi</span>
            </a>
            <a href="/admin/admins.html" class="nav-item ${activePage === 'admins' ? 'active' : ''}">
              <span class="nav-icon">👤</span>
              <span>Adminler</span>
            </a>
          </div>
          ` : ''}

          <div class="nav-section">
            <div class="nav-section-title">Hesap</div>
            <a href="/admin/settings.html" class="nav-item ${activePage === 'settings' ? 'active' : ''}">
              <span class="nav-icon">⚙️</span>
              <span>Ayarlar</span>
            </a>
            <a href="#" onclick="Auth.logout(); return false;" class="nav-item">
              <span class="nav-icon">🚪</span>
              <span>Çıkış Yap</span>
            </a>
          </div>
        </nav>
      `;
    }

    // Topbar user menu
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
      userMenu.innerHTML = `
        <div class="user-avatar">${Security.escapeHtml(initial)}</div>
        <div class="user-info">
          <div class="user-name">${Security.escapeHtml(name)}</div>
          <div class="user-role">${roleLabel}</div>
        </div>
      `;
    }

    // Bekleyen mesaj sayısı
    this.updateLeadsBadge();
  },

  /**
   * Yeni mesaj sayısını göster
   */
  async updateLeadsBadge() {
    try {
      const { count } = await supabaseClient
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('durum', 'yeni');

      const badge = document.getElementById('leadsBadge');
      if (badge && count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      }
    } catch (error) {
      console.error('Leads count error:', error);
    }
  },

  /**
   * Toast bildirimi
   */
  toast(message, type = 'info', title = '') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    toast.innerHTML = `
      ${title ? `<div class="toast-title">${icons[type] || ''} ${Security.escapeHtml(title)}</div>` : ''}
      <div class="toast-message">${Security.escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * Confirmation dialog
   */
  async confirm(message, title = 'Onay') {
    return new Promise((resolve) => {
      const result = window.confirm(`${title}\n\n${message}`);
      resolve(result);
    });
  },

  /**
   * Format currency
   */
  formatPrice(amount, currency = 'TL') {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';

    const symbols = { TL: '₺', USD: '$', EUR: '€' };
    return `${num.toLocaleString('tr-TR')} ${symbols[currency] || currency}`;
  },

  /**
   * Format date
   */
  formatDate(dateString, includeTime = false) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    return date.toLocaleDateString('tr-TR', options);
  },

  /**
   * Relative time
   */
  timeAgo(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Az önce';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dakika önce`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün önce`;
    return this.formatDate(dateString);
  },

  /**
   * Slug oluştur (SEO friendly URL)
   */
  slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};

window.App = App;
console.log('✅ App loaded');
