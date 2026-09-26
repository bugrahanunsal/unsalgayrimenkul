/**
 * ============================================
 * SUPABASE CONFIGURATION
 * İsmail Ünsal Emlak - Admin Panel
 * ============================================
 *
 * ⚠️ GÜVENLİK NOTU:
 * - Bu key PUBLIC key'dir (publishable)
 * - RLS politikaları onu kısıtlar
 * - Sadece login yapmış kullanıcılar yazma/silme yapabilir
 * - Secret key ASLA burada olmamalı
 */

const SUPABASE_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4';

// Supabase Client Initialization
const { createClient } = window.supabase;

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'ismailunsal-admin-session',
    flowType: 'pkce' // PKCE flow - daha güvenli
  },
  global: {
    headers: {
      'X-Client-Info': 'ismailunsal-admin-v1.0'
    }
  }
});

// Storage bucket referansları
const STORAGE_BUCKETS = {
  PROPERTY_PHOTOS: 'property-photos',
  TEAM_PHOTOS: 'team-photos',
  BLOG_PHOTOS: 'blog-photos'
};

// Rol tanımları
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

// İlan durumları
const PROPERTY_STATUS = {
  ACTIVE: 'aktif',
  PASSIVE: 'pasif',
  SOLD: 'satildi',
  RENTED: 'kiralandi',
  DRAFT: 'taslak'
};

// Kategoriler
const CATEGORIES = {
  DAIRE: 'daire',
  VILLA: 'villa',
  ARSA: 'arsa',
  MUSTAKIL_EV: 'mustakil_ev',
  ISYERI: 'isyeri',
  YAZLIK: 'yazlik',
  TARLA: 'tarla',
  BINA: 'bina'
};

// İlçeler
const ILCELER = [
  'Merkez',
  'Çınarcık',
  'Termal',
  'Altınova',
  'Armutlu',
  'Çiftlikköy',
  'Akköy'
];

// Global window'a ekle (diğer scriptler kullansın)
window.supabaseClient = supabaseClient;
window.STORAGE_BUCKETS = STORAGE_BUCKETS;
window.ROLES = ROLES;
window.PROPERTY_STATUS = PROPERTY_STATUS;
window.CATEGORIES = CATEGORIES;
window.ILCELER = ILCELER;

console.log('✅ Supabase client initialized');
