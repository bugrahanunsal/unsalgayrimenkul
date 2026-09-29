/**
 * cms-client.js — Sitenin panelden yönetilen içeriklerini okuyan ortak yardımcı.
 * Sadece OKUMA yapar (publishable key + RLS). Oturum saklamaz.
 * Güvenlik: tüm metinler textContent ile yazılır; URL'ler IUSafe/safeImg ile doğrulanır.
 */
(function (root) {
  'use strict';
  const URL_ = 'https://gosmkthmamloafgtvhpj.supabase.co';
  const KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4';
  let client = null;

  function waitFor(test, ms) {
    return new Promise((res) => {
      const t0 = Date.now();
      (function tick() {
        if (test()) return res(true);
        if (Date.now() - t0 > ms) return res(false);
        setTimeout(tick, 60);
      })();
    });
  }
  async function getClient() {
    if (client) return client;
    if (!(await waitFor(() => root.supabase && root.supabase.createClient, 10000))) return null;
    client = root.supabase.createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return client;
  }
  const safeImg = (u) => /^https:\/\/[^\s"'<>()]+$/i.test(String(u || '').trim()) ? String(u).trim() : '';
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  function langPrefix() { const m = location.pathname.match(/^\/(en|fr|de|ru|ar)(\/|$)/); return m ? '/' + m[1] : ''; }
  function postUrl(p) { return langPrefix() + '/blog/' + (SLUG_RE.test(p.slug || '') ? p.slug : ''); }
  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return ''; }
  }

  async function publishedPosts(limit) {
    const c = await getClient(); if (!c) return [];
    try {
      const { data, error } = await c.from('blog_posts')
        .select('id,slug,baslik_tr,ozet_tr,kategori,kapak_foto,yayin_tarihi,created_at')
        .eq('durum', 'yayinda').order('yayin_tarihi', { ascending: false }).limit(limit || 50);
      if (error) return [];
      return (data || []).filter(p => SLUG_RE.test(p.slug || ''));
    } catch (_) { return []; }
  }

  root.IUCms = { getClient, safeImg, postUrl, fmtDate, publishedPosts, langPrefix, SLUG_RE };
})(window);
