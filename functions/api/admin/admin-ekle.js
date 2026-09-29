/**
 * POST /api/admin/admin-ekle — Panelden yeni admin davet etme (Supabase'e girmeden)
 *
 * body: { email, full_name, role: 'admin' | 'editor' | 'viewer' }
 *
 * Akış:
 *  1) Çağıran kişinin oturumu doğrulanır ve admin_users'ta AKTİF "super_admin" olmalı.
 *  2) Kişi Supabase Auth'ta yoksa davet e-postası gönderilir (şifresini kendisi belirler:
 *     /sifre-belirle). Varsa mevcut hesabı kullanılır.
 *  3) admin_users tablosuna eklenir / güncellenir.
 *
 * GÜVENLİK
 *  - SUPABASE_SERVICE_ROLE_KEY yalnızca Cloudflare Secret'tır; bu dosyada YOKTUR ve
 *    tarayıcıya asla gönderilmez. Sadece doğrulanmış super_admin isteğinde kullanılır.
 *  - Bu uç noktadan "super_admin" oluşturulamaz (yetki yükseltme engeli).
 *  - Origin kontrolü, JSON/boyut sınırı, hız sınırı, girdi doğrulama.
 */
const SUPABASE_URL = 'https://gosmkthmamloafgtvhpj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iTHuziWSB_dtIguKLcxIKw_zFeJeRW4';
const SITE = 'https://ismailunsal.com.tr';
const ALLOWED_HOSTS = ['ismailunsal.com.tr', 'www.ismailunsal.com.tr'];
const ROLES = ['admin', 'editor', 'viewer'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@<>"',;:()\[\]\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

const hits = new Map();
function rateLimited(key, max, win) {
  const now = Date.now(); const a = (hits.get(key) || []).filter(t => now - t < win); a.push(now); hits.set(key, a);
  if (hits.size > 2000) hits.clear(); return a.length > max;
}
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const oneLine = (v, n) => String(v == null ? '' : v).replace(/[\r\n\t<>]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, n);

async function verifySuperAdmin(token) {
  if (!token || token.length > 4096 || !/^[A-Za-z0-9\-_=.]+$/.test(token)) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json();
  if (!u || !UUID_RE.test(u.id || '')) return null;
  const q = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?id=eq.${u.id}&select=role,is_active&limit=1`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
  if (!q.ok) return null;
  const row = (await q.json())[0];
  if (!row || !row.is_active || row.role !== 'super_admin') return null;
  return { id: u.id, email: u.email };
}

function svc(env) {
  const k = env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' };
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const origin = request.headers.get('Origin'); let host = '';
  try { host = new URL(origin).hostname; } catch (_) {}
  if (!origin || !(host === new URL(request.url).hostname || ALLOWED_HOSTS.includes(host))) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false, error: 'bad_request' }, 415);
  if ((+request.headers.get('Content-Length') || 0) > 4000) return json({ ok: false, error: 'too_large' }, 413);
  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  if (rateLimited('ip:' + ip, 20, 10 * 60 * 1000)) return json({ ok: false, error: 'rate_limited', message: 'Çok fazla deneme. Biraz sonra tekrar deneyin.' }, 429);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  let me = null; try { me = await verifySuperAdmin(token); } catch (_) {}
  if (!me) return json({ ok: false, error: 'unauthorized', message: 'Bu işlem için Süper Admin yetkisi gerekir.' }, 401);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ ok: false, error: 'not_configured', message: 'Kurulum eksik: Cloudflare\'e SUPABASE_SERVICE_ROLE_KEY eklenmeli.' }, 503);
  if (rateLimited('u:' + me.id, 10, 60 * 60 * 1000)) return json({ ok: false, error: 'rate_limited', message: 'Saatte en fazla 10 davet gönderilebilir.' }, 429);

  let b; try { b = JSON.parse((await request.text()).slice(0, 4000)); } catch (_) { return json({ ok: false, error: 'bad_json' }, 400); }
  const email = oneLine(b && b.email, 254).toLowerCase();
  const name = oneLine(b && b.full_name, 100);
  const role = String(b && b.role || '');
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'bad_email', message: 'Geçerli bir e-posta girin.' }, 400);
  if (name.length < 2) return json({ ok: false, error: 'bad_name', message: 'Ad soyad girin.' }, 400);
  if (!ROLES.includes(role)) return json({ ok: false, error: 'bad_role', message: 'Geçersiz rol.' }, 400);
  if (email === String(me.email || '').toLowerCase()) return json({ ok: false, error: 'self', message: 'Kendinizi tekrar ekleyemezsiniz.' }, 400);

  try {
    // 1) Davet et (yeni kullanıcı) — varsa mevcut hesabın ID'sini al
    let userId = null, invited = false;
    const inv = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: 'POST', headers: svc(env),
      body: JSON.stringify({ email, data: { full_name: name }, redirect_to: `${SITE}/sifre-belirle` })
    });
    const invBody = await inv.json().catch(() => ({}));
    if (inv.ok && UUID_RE.test(invBody.id || '')) { userId = invBody.id; invited = true; }
    else {
      // Zaten kayıtlı: e-posta göndermeden kullanıcı kaydını al
      const gl = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
        method: 'POST', headers: svc(env), body: JSON.stringify({ type: 'magiclink', email })
      });
      const glBody = await gl.json().catch(() => ({}));
      const u = glBody.user || glBody;
      if (gl.ok && UUID_RE.test(u.id || '')) userId = u.id;
      else {
        console.warn('[admin-ekle] invite', inv.status, JSON.stringify(invBody).slice(0, 200));
        return json({ ok: false, error: 'invite_failed', message: 'Davet gönderilemedi. Birkaç dakika sonra tekrar deneyin.' }, 502);
      }
    }
    // Mevcut super_admin'i bu uçtan düşürmeye izin verme
    const ex = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?id=eq.${userId}&select=role&limit=1`, { headers: svc(env) });
    const exRow = ex.ok ? (await ex.json())[0] : null;
    if (exRow && exRow.role === 'super_admin') return json({ ok: false, error: 'is_super', message: 'Bu kişi zaten Süper Admin.' }, 409);

    // 2) admin_users kaydı (ekle veya güncelle)
    const up = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?on_conflict=id`, {
      method: 'POST', headers: Object.assign(svc(env), { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ id: userId, email, full_name: name, role, is_active: true })
    });
    if (!up.ok) {
      console.warn('[admin-ekle] upsert', up.status, (await up.text()).slice(0, 200));
      return json({ ok: false, error: 'db_failed', message: 'Admin kaydı yapılamadı.' }, 502);
    }
    return json({ ok: true, invited, message: invited ? 'Davet e-postası gönderildi. Kişi e-postadaki bağlantıyla şifresini belirleyip giriş yapabilir.' : 'Bu kişinin zaten sitede hesabı var; admin yetkisi verildi. Mevcut şifresiyle giriş yapabilir.' });
  } catch (e) {
    console.warn('[admin-ekle] hata', e && e.message);
    return json({ ok: false, error: 'server_error', message: 'Beklenmeyen bir hata oluştu.' }, 500);
  }
}
