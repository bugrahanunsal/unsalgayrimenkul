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
    // Menü ve üst çubuk ANINDA çizilir (son girişteki rol/isimle): oturum kontrolü birkaç saniye
    // sürse de yan menü boş kalmaz. Yetki her zaman aşağıda (ve sunucuda/RLS'de) doğrulanır;
    // önbellekteki bilgi yalnızca hangi bağlantıların önce görüneceğini belirler.
    this.renderLayout(pageName, this.cachedUser());

    // Auth kontrol
    const isAuthed = await Auth.requireAuth('admin');
    if (!isAuthed) return false;

    // Kullanıcı bilgisini al
    this.currentUser = await Auth.getCurrentUser();
    this.cacheUser(this.currentUser);

    // Layout render (gerçek rol ve isimle)
    this.renderLayout(pageName);
    this.updateLeadsBadge();

    return true;
  },

  UI_KEY: 'iu_admin_ui',
  /** Son girişte kaydedilen menü bilgisi (yalnızca görünüm için; yetki DEĞİLDİR) */
  cachedUser() {
    let c = null;
    try { c = JSON.parse(localStorage.getItem(this.UI_KEY) || 'null'); } catch (_) { c = null; }
    const role = c && ['super_admin', 'admin', 'editor', 'viewer'].includes(c.role) ? c.role : 'admin';
    return { email: c && typeof c.email === 'string' ? c.email.slice(0, 254) : '', provisional: true,
      profile: { role, full_name: c && typeof c.name === 'string' ? c.name.slice(0, 100) : '' } };
  },
  cacheUser(u) {
    try {
      if (u && u.profile) localStorage.setItem(this.UI_KEY, JSON.stringify({ role: u.profile.role, name: u.profile.full_name || '', email: u.email || '' }));
    } catch (_) {}
  },

  /**
   * Layout HTML'ini oluştur
   */
  renderLayout(activePage, userOverride) {
    const user = userOverride || this.currentUser;
    const role = user?.profile?.role || 'admin';
    const roleLabel = role === 'super_admin' ? 'Super Admin' : 'Admin';
    const initial = (user?.profile?.full_name || user?.email || (user?.provisional ? ' ' : 'A')).charAt(0).toUpperCase();
    const name = user?.profile?.full_name || user?.email || (user?.provisional ? 'Yönetim Paneli' : 'Admin');

    // SVG Icons
    const icons = {
      dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
      properties: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
      team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
      seo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><polyline points="8 11.5 10.2 13.5 14 9"/></svg>',
      site: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
      messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      subscribers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
      design: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
      contacts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      match: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
      campaigns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
      security: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>',
      admins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 16V5a2 2 0 0 1 2-2h11"/><circle cx="11.5" cy="11.5" r="1.5"/><polyline points="21 17 17.5 13.5 11 20"/></svg>',
      logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
    };

    // Sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.innerHTML = `
        <div class="sidebar-header">
          <a href="/admin/index.html" style="text-decoration: none; color: inherit; display: block;">
            <div class="sidebar-logo">İSMAİL <span>ÜNSAL</span></div>
            <div class="sidebar-subtitle">GAYRİMENKUL YÖNETİM</div>
          </a>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section">
            <div class="nav-section-title">Ana Menü</div>
            <a href="/admin/index.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
              <span class="nav-icon">${icons.dashboard}</span>
              <span>Dashboard</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-section-title">İçerik Yönetimi</div>
            <a href="/admin/properties.html" class="nav-item ${activePage === 'properties' ? 'active' : ''}">
              <span class="nav-icon">${icons.properties}</span>
              <span>İlanlar</span>
            </a>
            <a href="/admin/property-new.html" class="nav-item ${activePage === 'property-new' ? 'active' : ''}">
              <span class="nav-icon">${icons.add}</span>
              <span>Yeni İlan</span>
            </a>
            <a href="/admin/team.html" class="nav-item ${activePage === 'team' ? 'active' : ''}">
              <span class="nav-icon">${icons.team}</span>
              <span>Ekip</span>
            </a>
            <a href="/admin/blog.html" class="nav-item ${activePage === 'blog' ? 'active' : ''}">
              <span class="nav-icon">${icons.blog}</span>
              <span>Blog</span>
            </a>
            <a href="/admin/site-content.html" class="nav-item ${activePage === 'site-content' ? 'active' : ''}">
              <span class="nav-icon">${icons.site}</span>
              <span>Site İçeriği</span>
            </a>
            <a href="/admin/medya.html" class="nav-item ${activePage === 'medya' ? 'active' : ''}">
              <span class="nav-icon">${icons.media}</span>
              <span>Görsel Deposu</span>
            </a>
            <a href="/admin/seo.html" class="nav-item ${activePage === 'seo' ? 'active' : ''}">
              <span class="nav-icon">${icons.seo}</span>
              <span>SEO Ayarları</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-section-title">Müşteriler & Email</div>
            <a href="/admin/leads.html" class="nav-item ${activePage === 'leads' ? 'active' : ''}">
              <span class="nav-icon">${icons.messages}</span>
              <span>Mesajlar</span>
              <span class="nav-badge" id="leadsBadge" style="display:none;">0</span>
            </a>
            <a href="/admin/ilan-gonder.html" class="nav-item ${activePage === 'ilan-gonder' ? 'active' : ''}">
              <span class="nav-icon">${icons.match}</span>
              <span>Müşteriye İlan Gönder</span>
            </a>
            <a href="/admin/subscribers.html" class="nav-item ${activePage === 'subscribers' ? 'active' : ''}">
              <span class="nav-icon">${icons.subscribers}</span>
              <span>Aboneler</span>
              <span class="nav-badge" id="subscribersBadge" style="display:none;">0</span>
            </a>
            <a href="/admin/campaigns.html" class="nav-item ${activePage === 'campaigns' ? 'active' : ''}">
              <span class="nav-icon">${icons.campaigns}</span>
              <span>E-posta Kampanyaları</span>
            </a>
            <a href="/admin/email-tasarim.html" class="nav-item ${activePage === 'email-tasarim' ? 'active' : ''}">
              <span class="nav-icon">${icons.design}</span>
              <span>E-posta Tasarımları</span>
            </a>
            <a href="/admin/gruplar.html" class="nav-item ${activePage === 'gruplar' ? 'active' : ''}">
              <span class="nav-icon">${icons.contacts}</span>
              <span>Müşteri Grupları</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-section-title">Sistem</div>
            <a href="/admin/spam-koruma.html" class="nav-item ${activePage === 'spam' ? 'active' : ''}">
              <span class="nav-icon">${icons.security}</span>
              <span>Spam Koruması</span>
            </a>
          ${role === 'super_admin' ? `
            <a href="/admin/security-logs.html" class="nav-item ${activePage === 'security' ? 'active' : ''}">
              <span class="nav-icon">${icons.security}</span>
              <span>Güvenlik Logları</span>
            </a>
            <a href="/admin/audit-log.html" class="nav-item ${activePage === 'audit' ? 'active' : ''}">
              <span class="nav-icon">${icons.audit}</span>
              <span>Değişiklik Geçmişi</span>
            </a>
            <a href="/admin/admins.html" class="nav-item ${activePage === 'admins' ? 'active' : ''}">
              <span class="nav-icon">${icons.admins}</span>
              <span>Adminler</span>
            </a>
          ` : ''}
          </div>

          <div class="nav-section">
            <div class="nav-section-title">Hesap</div>
            <a href="/admin/settings.html" class="nav-item ${activePage === 'settings' ? 'active' : ''}">
              <span class="nav-icon">${icons.settings}</span>
              <span>Ayarlar</span>
            </a>
            <a href="#" onclick="Auth.logout(); return false;" class="nav-item nav-logout">
              <span class="nav-icon">${icons.logout}</span>
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

    // "Siteyi Görüntüle": her sayfanın üst çubuğunda aynı yerde (kullanıcı menüsünün solunda), yeni sekmede açılır
    this.renderSiteLink();
    // Telefonda menü butonu (yan menü ekran dışında kalıyordu; sayfalar arası geçiş için)
    this.renderMobileMenu();
  },

  renderMobileMenu() {
    const topbar = document.querySelector('.topbar');
    const sidebar = document.getElementById('sidebar');
    if (!topbar || !sidebar || topbar.querySelector('.menu-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn';
    btn.setAttribute('aria-controls', 'sidebar');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Menüyü aç');
    btn.appendChild(this.icon('menu'));
    topbar.insertBefore(btn, topbar.firstChild);
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.hidden = true;
    document.body.appendChild(backdrop);
    const set = (open) => {
      sidebar.classList.toggle('open', open);
      backdrop.hidden = !open;
      document.body.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    };
    btn.addEventListener('click', () => set(!sidebar.classList.contains('open')));
    backdrop.addEventListener('click', () => set(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sidebar.classList.contains('open')) { set(false); btn.focus(); } });
    sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  },

  renderSiteLink() {
    const actions = document.querySelector('.topbar .topbar-actions');
    if (!actions || actions.querySelector('[data-site-link]')) return;
    const a = document.createElement('a');
    a.href = '/';
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'btn btn-outline btn-sm topbar-site';
    a.setAttribute('data-site-link', '');
    a.title = 'Siteyi yeni sekmede aç';
    a.setAttribute('aria-label', 'Siteyi Görüntüle (yeni sekmede açılır)');
    a.appendChild(this.icon('external'));
    const t = document.createElement('span');
    t.className = 'topbar-site-t';
    t.textContent = 'Siteyi Görüntüle';
    a.appendChild(t);
    actions.insertBefore(a, actions.querySelector(':scope > #userMenu'));
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
   * Tek renk çizgi ikon (admin.css → .ic-*). Renk yazı renginden gelir; renkli emoji kullanılmaz.
   * App.icon('save') → <i class="ic ic-save" aria-hidden="true"></i> öğesi
   */
  icon(name, cls) {
    const i = document.createElement('i');
    i.className = 'ic ic-' + String(name || '').replace(/[^a-z0-9-]/g, '') + (cls ? ' ' + cls : '');
    i.setAttribute('aria-hidden', 'true');
    return i;
  },
  iconHtml(name, cls) {
    return '<i class="ic ic-' + String(name || '').replace(/[^a-z0-9-]/g, '') + (cls ? ' ' + String(cls).replace(/[^a-z0-9 -]/g, '') : '') + '" aria-hidden="true"></i>';
  },
  /** el'in içeriğini "ikon + yazı" yapar; yazı her zaman düz metin olarak eklenir (güvenli) */
  iconText(el, name, text) {
    if (!el) return el;
    el.textContent = '';
    if (name) el.appendChild(this.icon(name));
    if (text != null && text !== '') el.appendChild(document.createTextNode((name ? ' ' : '') + text));
    return el;
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

    const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert', info: 'info' };

    toast.innerHTML = `
      ${title ? `<div class="toast-title">${icons[type] ? App.iconHtml(icons[type]) : ''} ${Security.escapeHtml(title)}</div>` : ''}
      <div class="toast-message">${Security.escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
  * Yeni ilanı, ilgi alanı uyan abonelere e-posta ile duyur.
   * Önce kaç kişiye gideceğini sorar (dry_run), onay gelirse gönderir.
   * Sunucu (/api/admin/ilan-gonder) admin yetkisini ayrıca doğrular.
   */
  async announceProperty(propertyId) {
    const call = async (body) => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın.');
      const r = await fetch('/api/admin/ilan-gonder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify(body)
      });
      let j = {}; try { j = await r.json(); } catch (_) {}
      if (!r.ok || !j.ok) throw new Error(j.message || ('İşlem başarısız (' + r.status + ')'));
      return j;
    };
    try {
      const dry = await call({ action: 'duyuru', property_id: propertyId, dry_run: true });
      if (!dry.matched) {
        this.toast('Bu ilanın kriterlerine uyan doğrulanmış abone veya arama alarmı yok; e-posta gönderilmedi.', 'info', 'Duyuru');
        return { sent: 0 };
      }
      const subsN = dry.subscribers_matched != null ? dry.subscribers_matched : dry.matched;
      const alarmN = dry.alarm_matched || 0;
      const kime = [subsN ? `ilgi alanı uyan ${subsN} aboneye` : '', alarmN ? `arama alarmı uyan ${alarmN} müşteriye` : ''].filter(Boolean).join(' ve ');
      const ok = await this.confirm(`Bu ilan ${kime} e-posta ile duyurulacak (toplam ${dry.total_subscribers} abone). Gönderilsin mi?`, 'Abonelere Duyur');
      if (!ok) return { sent: 0 };
      const res = await call({ action: 'duyuru', property_id: propertyId });
      this.toast(`İlan ${res.sent} kişiye gönderildi.`, 'success', 'Duyuru');
      return res;
    } catch (e) {
      this.toast(e.message, 'error', 'Duyuru');
      return { sent: 0, error: e.message };
    }
  },

  /**
  * Özel Fırsat: aynı anda sadece 1 ilan olabilir.
   * Başka bir ilan zaten seçiliyse onu döndürür (id, baslik_tr), yoksa null.
   */
  async findOzelFirsat(exceptId) {
    let q = supabaseClient.from('properties').select('id,baslik_tr').eq('ozel_firsat', true).limit(1);
    if (exceptId) q = q.neq('id', exceptId);
    const { data, error } = await q;
    if (error) {
      if (/ozel_firsat/.test(error.message || '')) throw new Error('Özel Fırsat özelliği için veritabanı kurulumu gerekli (SQL dosyasını çalıştırın).');
      throw error;
    }
    return (data && data[0]) || null;
  },
  ozelFirsatError(other) {
    return `Özel Fırsat zaten seçili: "${other.baslik_tr || 'bir ilan'}". Aynı anda sadece 1 ilan özel fırsat olabilir. Önce o ilanın işaretini kaldırın.`;
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
console.log(' App loaded');
