/**
 * İSMAİL ÜNSAL GAYRİMENKUL — "Üye ol" bölümü
 * Ana sayfada, ana satış sayfalarında ve her ilan sayfasında üyeliğe davet eder.
 *
 *   <div data-uye-ol="home"></div>        ana sayfa: iki sütunlu bölüm (davet + 4 fayda)
 *   <div data-uye-ol="kategori"></div>    satış sayfaları: ilanların hemen altında yatay kart
 *   <div data-uye-ol="ilan" data-property-id="…"></div>
 *                                         ilan sayfası: sağ sütunda kart (ilan-detay.js ekler)
 *
 * Ziyaretçi → faydalar + "Ücretsiz Üye Ol" / "Giriş Yap" (subscribe-widget.js penceresi açılır).
 * Üye       → Favorilerim / Arama alarmı / Hesabım kısayolları; ilan sayfasında "Favorilere ekle".
 * Yönetici  → ziyaretçinin gördüğü bölüm + küçük bir önizleme notu.
 *
 * GÜVENLİK: veritabanından ya da kullanıcıdan gelen hiçbir değer HTML olarak yazılmaz (yalnızca
 * textContent). İlan kimliği yalnızca UUID ya da sayıysa kullanılır. Tarayıcıda saklanan oturum
 * yalnızca ilk görünümü seçmek için okunur; asıl durum subscribe-widget.js'ten (Supabase) gelir.
 * Metinler ve simgeler bu dosyada sabittir; sayfa diline göre seçilir (tr, en, fr, de, ru, ar).
 */
(function () {
  'use strict';
  if (window.IUUyeOl) return;

  const LANG = ((location.pathname.match(/^\/(en|fr|de|ru|ar)(\/|$)/) || [])[1]) || 'tr';
  const PRE = LANG === 'tr' ? '' : '/' + LANG;
  const ACCOUNT = PRE + '/hesabim';
  const ID_RE = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{1,12})$/i;
  const SESSION_KEY = 'ismailunsal-customer-session';

  const T = {
    tr: {
      eb: 'ÜCRETSİZ ÜYELİK', ebMember: 'HESABINIZ',
      homeTitle: 'Yeni ilanları ilk siz görün',
      homeText: 'Ücretsiz üye olun; beğendiğiniz ilanları kaydedin, aradığınız özellikte yeni bir ilan eklendiğinde e-postayla haberiniz olsun.',
      b1t: 'Favori ilanlar', b1d: 'Beğendiğiniz ilanları tek tıkla kaydedin, dilediğiniz zaman karşılaştırın.',
      b2t: 'Arama alarmı', b2d: 'Bölge, fiyat ve oda sayısını seçin; uygun yeni ilan eklenince size e-posta gelsin.',
      b3t: 'Fırsatlar önce size', b3d: 'Bültenimizle portföye yeni giren fırsatlardan ilk siz haberdar olun.',
      b4t: 'Her şey tek yerde', b4d: 'Taleplerinizi ve son baktığınız ilanları Hesabım’dan takip edin.',
      signup: 'Ücretsiz Üye Ol', login: 'Giriş Yap',
      note: 'Ücretsiz · 1 dakika · Hesabınızı istediğiniz zaman silebilirsiniz',
      katTitle: 'Aradığınızı bulamadınız mı?',
      katText: 'Ücretsiz üye olun ve arama alarmı kurun: aradığınız özellikte yeni bir ilan eklendiğinde size hemen e-posta gönderelim.',
      ilanTitle: 'Bu ilanı kaydedin',
      ilanText: 'Ücretsiz üye olun: ilanı favorilerinize ekleyin, benzer yeni ilanlar için arama alarmı kurun.',
      hello: 'Hoş geldiniz',
      memberHome: 'Favori ilanlarınız, arama alarmlarınız ve talepleriniz Hesabım’da.',
      memberKat: 'Aradığınız özellikte ilan eklendiğinde haber almak için bir arama alarmı kurun.',
      memberIlan: 'Bu ilanı favorilerinize ekleyin, benzer ilanlar için arama alarmı kurun.',
      favAdd: 'Favorilere ekle', favOn: 'Favorilerinizde', favErr: 'İşlem yapılamadı. Lütfen tekrar deneyin.',
      favAdded: 'Favorilerinize eklendi.', favRemoved: 'Favorilerinizden çıkarıldı.',
      alarm: 'Arama alarmı kur', favs: 'Favorilerim', account: 'Hesabım',
      adminNote: 'Yönetici önizlemesi: ziyaretçiler bu bölümü böyle görür; üye müşteriler burada favori ve alarm kısayollarını görür.',
      adminPanel: 'Yönetim paneli'
    },
    en: {
      eb: 'FREE MEMBERSHIP', ebMember: 'YOUR ACCOUNT',
      homeTitle: 'Be the first to see new listings',
      homeText: 'Sign up for free: save the listings you like and get an email when a new property matching your search is added.',
      b1t: 'Favourite listings', b1d: 'Save listings with one click and compare them whenever you like.',
      b2t: 'Search alerts', b2d: 'Choose the area, price and rooms — we email you when a matching listing is added.',
      b3t: 'Opportunities first', b3d: 'Hear about new opportunities first with our newsletter.',
      b4t: 'Everything in one place', b4d: 'Follow your enquiries and recently viewed listings in My account.',
      signup: 'Sign Up Free', login: 'Sign In',
      note: 'Free · 1 minute · Delete your account at any time',
      katTitle: 'Didn’t find what you’re looking for?',
      katText: 'Sign up for free and create a search alert — we’ll email you as soon as a matching listing is added.',
      ilanTitle: 'Save this listing',
      ilanText: 'Sign up for free to add this listing to your favourites and get alerts for similar new listings.',
      hello: 'Welcome',
      memberHome: 'Your favourites, search alerts and enquiries are in My account.',
      memberKat: 'Create a search alert to hear about new listings that match what you are looking for.',
      memberIlan: 'Add this listing to your favourites and create an alert for similar listings.',
      favAdd: 'Add to favourites', favOn: 'In your favourites', favErr: 'Something went wrong. Please try again.',
      favAdded: 'Added to your favourites.', favRemoved: 'Removed from your favourites.',
      alarm: 'Create a search alert', favs: 'My favourites', account: 'My account',
      adminNote: 'Admin preview: visitors see this section like this; members see their favourites and alert shortcuts here.',
      adminPanel: 'Admin panel'
    },
    fr: {
      eb: 'ADHÉSION GRATUITE', ebMember: 'VOTRE COMPTE',
      homeTitle: 'Soyez le premier à voir les nouvelles annonces',
      homeText: 'Inscrivez-vous gratuitement : enregistrez les annonces qui vous plaisent et recevez un e-mail dès qu’un bien correspondant à votre recherche est ajouté.',
      b1t: 'Annonces favorites', b1d: 'Enregistrez les annonces en un clic et comparez-les quand vous voulez.',
      b2t: 'Alertes de recherche', b2d: 'Choisissez le quartier, le prix et le nombre de pièces : nous vous écrivons dès qu’une annonce correspond.',
      b3t: 'Les opportunités d’abord', b3d: 'Soyez informé en premier des nouvelles opportunités grâce à notre newsletter.',
      b4t: 'Tout au même endroit', b4d: 'Suivez vos demandes et les annonces consultées dans Mon compte.',
      signup: 'Inscription gratuite', login: 'Se connecter',
      note: 'Gratuit · 1 minute · Supprimez votre compte à tout moment',
      katTitle: 'Vous n’avez pas trouvé ce que vous cherchez ?',
      katText: 'Inscrivez-vous gratuitement et créez une alerte : nous vous envoyons un e-mail dès qu’une annonce correspondante est ajoutée.',
      ilanTitle: 'Enregistrez cette annonce',
      ilanText: 'Inscrivez-vous gratuitement pour ajouter cette annonce à vos favoris et recevoir des alertes pour des annonces similaires.',
      hello: 'Bienvenue',
      memberHome: 'Vos favoris, alertes et demandes se trouvent dans Mon compte.',
      memberKat: 'Créez une alerte pour être informé des nouvelles annonces qui correspondent à votre recherche.',
      memberIlan: 'Ajoutez cette annonce à vos favoris et créez une alerte pour des annonces similaires.',
      favAdd: 'Ajouter aux favoris', favOn: 'Dans vos favoris', favErr: 'Une erreur s’est produite. Veuillez réessayer.',
      favAdded: 'Ajoutée à vos favoris.', favRemoved: 'Retirée de vos favoris.',
      alarm: 'Créer une alerte', favs: 'Mes favoris', account: 'Mon compte',
      adminNote: 'Aperçu administrateur : les visiteurs voient cette section ainsi ; les membres y voient leurs raccourcis favoris et alertes.',
      adminPanel: 'Administration'
    },
    de: {
      eb: 'KOSTENLOSE MITGLIEDSCHAFT', ebMember: 'IHR KONTO',
      homeTitle: 'Neue Angebote als Erste sehen',
      homeText: 'Registrieren Sie sich kostenlos: Speichern Sie Angebote, die Ihnen gefallen, und erhalten Sie eine E-Mail, sobald eine passende Immobilie hinzukommt.',
      b1t: 'Favoriten', b1d: 'Angebote mit einem Klick speichern und jederzeit vergleichen.',
      b2t: 'Suchalarm', b2d: 'Gegend, Preis und Zimmerzahl wählen – wir schreiben Ihnen, sobald ein passendes Angebot hinzukommt.',
      b3t: 'Chancen zuerst', b3d: 'Mit unserem Newsletter erfahren Sie als Erste von neuen Gelegenheiten.',
      b4t: 'Alles an einem Ort', b4d: 'Ihre Anfragen und zuletzt angesehenen Angebote finden Sie unter Mein Konto.',
      signup: 'Kostenlos registrieren', login: 'Anmelden',
      note: 'Kostenlos · 1 Minute · Konto jederzeit löschbar',
      katTitle: 'Nicht das Richtige gefunden?',
      katText: 'Registrieren Sie sich kostenlos und legen Sie einen Suchalarm an – wir schicken Ihnen sofort eine E-Mail, wenn ein passendes Angebot hinzukommt.',
      ilanTitle: 'Dieses Angebot speichern',
      ilanText: 'Kostenlos registrieren: Angebot zu den Favoriten hinzufügen und Alarme für ähnliche neue Angebote erhalten.',
      hello: 'Willkommen',
      memberHome: 'Ihre Favoriten, Suchalarme und Anfragen finden Sie unter Mein Konto.',
      memberKat: 'Legen Sie einen Suchalarm an, um von passenden neuen Angeboten zu erfahren.',
      memberIlan: 'Fügen Sie dieses Angebot zu Ihren Favoriten hinzu und legen Sie einen Alarm für ähnliche Angebote an.',
      favAdd: 'Zu Favoriten hinzufügen', favOn: 'In Ihren Favoriten', favErr: 'Das hat nicht geklappt. Bitte erneut versuchen.',
      favAdded: 'Zu Ihren Favoriten hinzugefügt.', favRemoved: 'Aus Ihren Favoriten entfernt.',
      alarm: 'Suchalarm anlegen', favs: 'Meine Favoriten', account: 'Mein Konto',
      adminNote: 'Admin-Vorschau: So sehen Besucher diesen Bereich; Mitglieder sehen hier ihre Favoriten- und Alarm-Verknüpfungen.',
      adminPanel: 'Verwaltung'
    },
    ru: {
      eb: 'БЕСПЛАТНОЕ ЧЛЕНСТВО', ebMember: 'ВАШ АККАУНТ',
      homeTitle: 'Узнавайте о новых объявлениях первыми',
      homeText: 'Зарегистрируйтесь бесплатно: сохраняйте понравившиеся объявления и получайте письмо, как только появится подходящий объект.',
      b1t: 'Избранное', b1d: 'Сохраняйте объявления одним щелчком и сравнивайте их в любое время.',
      b2t: 'Поисковые оповещения', b2d: 'Выберите район, цену и количество комнат — мы напишем, когда появится подходящее объявление.',
      b3t: 'Выгодные предложения первыми', b3d: 'Узнавайте о новых предложениях первыми из нашей рассылки.',
      b4t: 'Всё в одном месте', b4d: 'Следите за своими запросами и недавно просмотренными объявлениями в Личном кабинете.',
      signup: 'Бесплатная регистрация', login: 'Войти',
      note: 'Бесплатно · 1 минута · Аккаунт можно удалить в любой момент',
      katTitle: 'Не нашли то, что искали?',
      katText: 'Зарегистрируйтесь бесплатно и создайте оповещение — мы сразу напишем вам, когда появится подходящее объявление.',
      ilanTitle: 'Сохраните это объявление',
      ilanText: 'Зарегистрируйтесь бесплатно, чтобы добавить объявление в избранное и получать оповещения о похожих.',
      hello: 'Добро пожаловать',
      memberHome: 'Избранное, оповещения и запросы — в Личном кабинете.',
      memberKat: 'Создайте поисковое оповещение, чтобы узнавать о подходящих новых объявлениях.',
      memberIlan: 'Добавьте объявление в избранное и создайте оповещение о похожих.',
      favAdd: 'В избранное', favOn: 'В избранном', favErr: 'Не удалось выполнить. Попробуйте ещё раз.',
      favAdded: 'Добавлено в избранное.', favRemoved: 'Удалено из избранного.',
      alarm: 'Создать оповещение', favs: 'Избранное', account: 'Личный кабинет',
      adminNote: 'Просмотр администратора: так этот раздел видят посетители; участники видят здесь ярлыки избранного и оповещений.',
      adminPanel: 'Панель управления'
    },
    ar: {
      eb: 'عضوية مجانية', ebMember: 'حسابك',
      homeTitle: 'كن أول من يرى الإعلانات الجديدة',
      homeText: 'سجّل مجانًا: احفظ الإعلانات التي تعجبك واحصل على بريد إلكتروني عند إضافة عقار يطابق بحثك.',
      b1t: 'الإعلانات المفضلة', b1d: 'احفظ الإعلانات بنقرة واحدة وقارن بينها متى شئت.',
      b2t: 'تنبيهات البحث', b2d: 'اختر المنطقة والسعر وعدد الغرف، وسنراسلك عند إضافة إعلان مناسب.',
      b3t: 'الفرص أولاً', b3d: 'اعرف أولاً بالفرص الجديدة عبر نشرتنا البريدية.',
      b4t: 'كل شيء في مكان واحد', b4d: 'تابع طلباتك والإعلانات التي شاهدتها مؤخرًا في حسابي.',
      signup: 'سجّل مجانًا', login: 'تسجيل الدخول',
      note: 'مجاني · دقيقة واحدة · يمكنك حذف حسابك في أي وقت',
      katTitle: 'لم تجد ما تبحث عنه؟',
      katText: 'سجّل مجانًا وأنشئ تنبيه بحث، وسنرسل لك بريدًا إلكترونيًا فور إضافة إعلان مناسب.',
      ilanTitle: 'احفظ هذا الإعلان',
      ilanText: 'سجّل مجانًا لإضافة هذا الإعلان إلى مفضلتك وتلقي تنبيهات بالإعلانات المشابهة.',
      hello: 'مرحبًا',
      memberHome: 'مفضلتك وتنبيهات البحث وطلباتك في حسابي.',
      memberKat: 'أنشئ تنبيه بحث لتعرف بالإعلانات الجديدة المطابقة لما تبحث عنه.',
      memberIlan: 'أضف هذا الإعلان إلى مفضلتك وأنشئ تنبيهًا للإعلانات المشابهة.',
      favAdd: 'أضف إلى المفضلة', favOn: 'في مفضلتك', favErr: 'تعذّر تنفيذ العملية. حاول مرة أخرى.',
      favAdded: 'أضيف إلى مفضلتك.', favRemoved: 'أزيل من مفضلتك.',
      alarm: 'أنشئ تنبيه بحث', favs: 'مفضلتي', account: 'حسابي',
      adminNote: 'معاينة المدير: هكذا يرى الزوار هذا القسم؛ ويرى الأعضاء هنا اختصارات المفضلة والتنبيهات.',
      adminPanel: 'لوحة الإدارة'
    }
  };
  const t = (k) => (T[LANG] && T[LANG][k]) || T.tr[k] || '';

  // ---------------- küçük yardımcılar (yalnızca textContent / setAttribute) ----------------
  function h(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'onclick') n.addEventListener('click', v);
      else n.setAttribute(k, v === true ? '' : String(v));
    });
    (kids || []).forEach((c) => { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  const icon = (name) => h('i', { class: 'fa-solid ' + name, 'aria-hidden': 'true' });
  let uid = 0;

  const CSS = `
.iu-uye{--uy-navy:#0A2A5E;--uy-blue:#2563EB;--uy-ink:#0F172A;--uy-soft:#475569;--uy-line:#E2E8F0;--uy-tint:#EFF6FF;
  font-family:'Poppins','DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;color:var(--uy-ink);box-sizing:border-box}
.iu-uye *,.iu-uye *::before,.iu-uye *::after{box-sizing:border-box}
.iu-uye h2,.iu-uye h3{font-family:'League Spartan','Montserrat',sans-serif;color:var(--uy-navy);margin:0;line-height:1.2}
.iu-uye p{margin:0}
.iu-uye-eb{display:inline-block;background:rgba(37,99,235,.12);color:var(--uy-blue);padding:6px 14px;border-radius:50px;
  font-size:11px;font-weight:700;letter-spacing:1.5px}
.iu-uye-btns{display:flex;flex-wrap:wrap;gap:10px}
.iu-uye-btn{white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:12px 22px;border-radius:12px;
  font-family:inherit;font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;cursor:pointer;border:2px solid transparent;transition:background .2s,border-color .2s,color .2s,transform .2s}
.iu-uye-btn:focus-visible{outline:3px solid rgba(37,99,235,.45);outline-offset:2px}
.iu-uye-btn--pri{background:var(--uy-navy);color:#fff}
.iu-uye-btn--pri:hover{background:#1B4380;transform:translateY(-1px)}
.iu-uye-btn--sec{background:#fff;color:var(--uy-navy);border-color:var(--uy-navy)}
.iu-uye-btn--sec:hover{background:var(--uy-tint)}
.iu-uye-btn--fav[aria-pressed="true"]{background:#fff;color:#BE123C;border-color:#FECDD3}
.iu-uye-btn--fav[aria-pressed="true"]:hover{background:#FFF1F2}
.iu-uye-btn[disabled]{opacity:.6;cursor:default;transform:none}
.iu-uye-note{font-size:12.5px;color:#64748B}
.iu-uye-admin{margin-top:4px;font-size:12.5px;color:#64748B;border-top:1px dashed var(--uy-line);padding-top:10px}
.iu-uye-admin a{color:var(--uy-blue);font-weight:600}
.iu-uye-msg{font-size:13px;min-height:1em;color:#15803D;font-weight:600}
.iu-uye-msg.err{color:#B91C1C}
.iu-uye-msg:empty{display:none}
.iu-uye-ic{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:var(--uy-tint);
  color:var(--uy-blue);font-size:18px;flex-shrink:0}
/* ana sayfa */
.iu-uye--home{padding:72px 24px;background:linear-gradient(180deg,#F8FAFC 0%,#fff 100%)}
.iu-uye--home .iu-uye-in{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:48px;align-items:center;
  background:#fff;border:1px solid var(--uy-line);border-radius:24px;padding:48px;box-shadow:0 20px 50px rgba(10,42,94,.08)}
.iu-uye--home .iu-uye-lead{display:flex;flex-direction:column;align-items:flex-start;gap:16px}
.iu-uye--home h2{font-size:clamp(28px,3.6vw,38px);font-weight:700}
.iu-uye--home .iu-uye-lead>p{font-size:16px;line-height:1.65;color:var(--uy-soft)}
.iu-uye-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.iu-uye-tile{display:flex;flex-direction:column;gap:10px;height:100%;padding:20px;border:1px solid var(--uy-line);border-radius:16px;background:#fff;
  color:inherit;text-decoration:none;transition:border-color .2s,box-shadow .2s,transform .2s}
a.iu-uye-tile:hover{border-color:#BFDBFE;box-shadow:0 10px 24px rgba(10,42,94,.08);transform:translateY(-2px)}
a.iu-uye-tile:focus-visible{outline:3px solid rgba(37,99,235,.45);outline-offset:2px}
.iu-uye-tile .tx{display:flex;flex-direction:column;gap:6px}
.iu-uye-tile b{font-size:16px;color:var(--uy-navy)}
.iu-uye-tile span.d{font-size:14px;line-height:1.55;color:var(--uy-soft)}
/* satış sayfaları */
.iu-uye--kat{padding:8px 24px 64px;background:#fff}
.iu-uye--kat .iu-uye-in{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:28px;align-items:center;
  border-radius:22px;padding:32px 36px;background:linear-gradient(135deg,#0A2A5E 0%,#1B4380 100%);color:#fff;box-shadow:0 18px 44px rgba(10,42,94,.18)}
.iu-uye--kat h2{color:#fff;font-size:clamp(22px,2.6vw,28px)}
.iu-uye--kat .iu-uye-eb{background:rgba(255,255,255,.14);color:#BFDBFE}
.iu-uye--kat .iu-uye-lead{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.iu-uye--kat .iu-uye-lead>p{font-size:15px;line-height:1.6;color:#DBEAFE}
.iu-uye--kat .iu-uye-big{display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:20px;background:rgba(255,255,255,.12);color:#fff;font-size:28px}
.iu-uye-mini{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13.5px;color:#E0E7FF}
.iu-uye-mini li{display:inline-flex;align-items:center;gap:7px}
.iu-uye-mini i{color:#93C5FD}
.iu-uye--kat .iu-uye-side{display:flex;flex-direction:column;align-items:stretch;gap:10px;min-width:220px}
.iu-uye--kat .iu-uye-btn--pri{background:#fff;color:var(--uy-navy)}
.iu-uye--kat .iu-uye-btn--pri:hover{background:#EFF6FF}
.iu-uye--kat .iu-uye-btn--sec{background:transparent;color:#fff;border-color:rgba(255,255,255,.55)}
.iu-uye--kat .iu-uye-btn--sec:hover{background:rgba(255,255,255,.1)}
.iu-uye--kat .iu-uye-note,.iu-uye--kat .iu-uye-admin{color:#BFDBFE;text-align:center}
.iu-uye--kat .iu-uye-admin{border-top-color:rgba(255,255,255,.25);text-align:left}
.iu-uye--kat .iu-uye-admin a{color:#fff}
/* ilan sayfası (sağ sütun) */
.iu-uye--ilan{background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:12px;
  box-shadow:0 12px 32px rgba(10,42,94,.06)}
.iu-uye--ilan .iu-uye-row{display:flex;align-items:center;gap:12px}
.iu-uye--ilan h3{font-size:18px}
.iu-uye--ilan .iu-uye-eb{padding:4px 10px;font-size:10px}
.iu-uye--ilan>p{font-size:14px;line-height:1.6;color:var(--uy-soft)}
.iu-uye--ilan .iu-uye-btns .iu-uye-btn{flex:1 1 140px;padding:11px 14px;font-size:14px}
.iu-uye-links{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:14px}
.iu-uye-links a{color:var(--uy-blue);font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.iu-uye-links a:hover{text-decoration:underline}
@media (max-width:968px){
  .iu-uye--home{padding:48px 16px}
  .iu-uye--home .iu-uye-in{grid-template-columns:minmax(0,1fr);padding:28px 22px;gap:28px;border-radius:20px}
  .iu-uye--kat{padding:0 16px 48px}
  .iu-uye--kat .iu-uye-in{grid-template-columns:minmax(0,1fr);padding:26px 22px;gap:18px;text-align:left}
  .iu-uye--kat .iu-uye-big{width:56px;height:56px;font-size:22px;border-radius:16px}
  .iu-uye--kat .iu-uye-side{min-width:0}
}
@media (max-width:560px){
  .iu-uye-grid{grid-template-columns:minmax(0,1fr)}
  .iu-uye-tile{flex-direction:row;align-items:flex-start;gap:14px;padding:16px}
  .iu-uye-btns .iu-uye-btn,.iu-uye--ilan .iu-uye-btns .iu-uye-btn{flex:1 1 100%}
}
[dir="rtl"].iu-uye .iu-uye-lead,[dir="rtl"].iu-uye .iu-uye-side{text-align:right}
`;
  function injectCss() {
    if (document.getElementById('iu-uye-css')) return;
    const st = document.createElement('style');
    st.id = 'iu-uye-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------------- oturum durumu ----------------
  /** Tarayıcıda saklı oturumdan yalnızca görünen ad (ilk çizim için; güvenlik kararı değildir) */
  function storedSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const u = s && (s.user || (s.currentSession && s.currentSession.user));
      if (!u || typeof u.id !== 'string') return null;
      if (s.expires_at && Number(s.expires_at) * 1000 < Date.now() - 7 * 864e5) return null;   // çok eski oturum
      return u;
    } catch (_) { return null; }
  }
  function firstName(u) {
    const m = u && u.user_metadata;
    const full = m && typeof m.full_name === 'string' ? m.full_name : '';
    return full.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().split(/\s+/)[0].slice(0, 40);
  }
  let settled = false;     // widget'ı yeterince bekledik (eski önbellekteki widget "ready" bildirmeyebilir)
  function state() {
    const A = window.IUAuth;
    if (A && (A.ready || settled)) {
      if (!A.user) return { kind: 'guest' };
      if (A.isAdmin === true) return { kind: 'admin' };
      return { kind: 'member', name: firstName(A.user) };
    }
    if (settled) return { kind: 'guest' };                 // widget hiç yüklenmedi: butonlar ?signup=1 ile çalışır
    const u = storedSession();        // widget henüz hazır değil: saklı oturum varsa üye görünümüyle başla
    return u ? { kind: 'member', name: firstName(u), pending: true } : { kind: 'guest', pending: true };
  }

  /** Giriş/üye ol penceresi: widget hazır değilse kısa bir süre bekle, olmazsa ?signup=1 ile sayfayı aç */
  function openAuth(tab) {
    const go = () => { if (window.IUAuth && typeof window.IUAuth.open === 'function') { window.IUAuth.open(tab); return true; } return false; };
    if (go()) return;
    let n = 0;
    const iv = setInterval(() => {
      if (go()) { clearInterval(iv); return; }
      if (++n > 40) {                       // ~6 sn
        clearInterval(iv);
        const u = new URL(location.href);
        u.searchParams.set(tab === 'login' ? 'login' : 'signup', '1');
        location.href = u.pathname + u.search + u.hash;
      }
    }, 150);
  }

  // ---------------- parçalar ----------------
  const BENEFITS = [
    ['fa-heart', 'b1t', 'b1d', '#favoriler'],
    ['fa-bell', 'b2t', 'b2d', '#alarmlar'],
    ['fa-tag', 'b3t', 'b3d', '#bulten'],
    ['fa-user-check', 'b4t', 'b4d', '#ozet']
  ];
  function authButtons() {
    return h('div', { class: 'iu-uye-btns' }, [
      h('button', { type: 'button', class: 'iu-uye-btn iu-uye-btn--pri', onclick: () => openAuth('signup') }, [icon('fa-user-plus'), t('signup')]),
      h('button', { type: 'button', class: 'iu-uye-btn iu-uye-btn--sec', onclick: () => openAuth('login') }, [t('login')])
    ]);
  }
  function memberButtons(withAlarmFirst) {
    const fav = h('a', { class: 'iu-uye-btn ' + (withAlarmFirst ? 'iu-uye-btn--sec' : 'iu-uye-btn--pri'), href: ACCOUNT + '#favoriler' }, [icon('fa-heart'), t('favs')]);
    const alarm = h('a', { class: 'iu-uye-btn ' + (withAlarmFirst ? 'iu-uye-btn--pri' : 'iu-uye-btn--sec'), href: ACCOUNT + '#alarmlar' }, [icon('fa-bell'), t('alarm')]);
    return h('div', { class: 'iu-uye-btns' }, withAlarmFirst ? [alarm, fav] : [fav, alarm]);
  }
  function adminNote() {
    return h('p', { class: 'iu-uye-admin' }, [t('adminNote') + ' ', h('a', { href: '/admin/index.html', text: t('adminPanel') })]);
  }
  const hello = (st) => t('hello') + (st.name ? ', ' + st.name : '');

  function renderHome(box, st) {
    const member = st.kind === 'member';
    const id = 'iu-uye-h' + (++uid);
    const tiles = BENEFITS.map(([ic, kt, kd, hash]) => {
      const inner = [h('span', { class: 'iu-uye-ic' }, [icon(ic)]), h('span', { class: 'tx' }, [h('b', { text: t(kt) }), h('span', { class: 'd', text: t(kd) })])];
      return h('li', null, [member ? h('a', { class: 'iu-uye-tile', href: ACCOUNT + hash }, inner) : h('div', { class: 'iu-uye-tile' }, inner)]);
    });
    const lead = h('div', { class: 'iu-uye-lead' }, [
      h('span', { class: 'iu-uye-eb', text: member ? t('ebMember') : t('eb') }),
      h('h2', { id, text: member ? hello(st) : t('homeTitle') }),
      h('p', { text: member ? t('memberHome') : t('homeText') }),
      member ? memberButtons(false) : authButtons(),
      member ? h('p', { class: 'iu-uye-links' }, [h('a', { href: ACCOUNT }, [icon('fa-user'), t('account')])]) : h('p', { class: 'iu-uye-note', text: t('note') }),
      st.kind === 'admin' ? adminNote() : null
    ]);
    return h('section', { class: 'iu-uye iu-uye--home', 'aria-labelledby': id }, [h('div', { class: 'iu-uye-in' }, [lead, h('ul', { class: 'iu-uye-grid' }, tiles)])]);
  }

  function renderKategori(box, st) {
    const member = st.kind === 'member';
    const id = 'iu-uye-h' + (++uid);
    const lead = h('div', { class: 'iu-uye-lead' }, [
      h('span', { class: 'iu-uye-eb', text: member ? t('ebMember') : t('eb') }),
      h('h2', { id, text: member ? hello(st) : t('katTitle') }),
      h('p', { text: member ? t('memberKat') : t('katText') }),
      h('ul', { class: 'iu-uye-mini' }, BENEFITS.slice(0, 3).map(([ic, kt]) => h('li', null, [icon(ic), t(kt)])))
    ]);
    const side = h('div', { class: 'iu-uye-side' }, member
      ? [memberButtons(true)]
      : [authButtons(), h('p', { class: 'iu-uye-note', text: t('note') }), st.kind === 'admin' ? adminNote() : null]);
    return h('section', { class: 'iu-uye iu-uye--kat', 'aria-labelledby': id }, [h('div', { class: 'iu-uye-in' }, [
      h('span', { class: 'iu-uye-big', 'aria-hidden': 'true' }, [icon('fa-bell')]), lead, side])]);
  }

  function renderIlan(box, st) {
    const member = st.kind === 'member';
    const id = 'iu-uye-h' + (++uid);
    const pid = String(box.getAttribute('data-property-id') || '');
    const kids = [
      h('div', { class: 'iu-uye-row' }, [h('span', { class: 'iu-uye-ic' }, [icon('fa-heart')]),
        h('div', null, [h('span', { class: 'iu-uye-eb', text: member ? t('ebMember') : t('eb') }), h('h3', { id, text: t('ilanTitle') })])]),
      h('p', { text: member ? t('memberIlan') : t('ilanText') })
    ];
    if (member && ID_RE.test(pid)) {
      const msg = h('p', { class: 'iu-uye-msg', role: 'status', 'aria-live': 'polite' });
      const btn = h('button', { type: 'button', class: 'iu-uye-btn iu-uye-btn--pri iu-uye-btn--fav', 'aria-pressed': 'false' });
      const paint = (on) => {
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.textContent = '';
        btn.append(icon(on ? 'fa-heart-circle-check' : 'fa-heart'), on ? t('favOn') : t('favAdd'));
        btn.classList.toggle('iu-uye-btn--pri', !on);
      };
      paint(false);
      btn.addEventListener('click', async () => {
        const A = window.IUAuth;
        if (!A || typeof A.toggleFavorite !== 'function') { openAuth('login'); return; }
        btn.disabled = true; msg.textContent = ''; msg.classList.remove('err');
        try {
          const r = await A.toggleFavorite(pid);
          if (r && r.requires_login) return;
          if (!r || r.error || typeof r.favorited !== 'boolean') throw new Error('fav');
          paint(r.favorited);
          msg.textContent = r.favorited ? t('favAdded') : t('favRemoved');
        } catch (_) {
          msg.textContent = t('favErr'); msg.classList.add('err');
        } finally { btn.disabled = false; }
      });
      if (!st.pending && window.IUAuth && typeof window.IUAuth.isFavorite === 'function') {
        window.IUAuth.isFavorite(pid).then((on) => { if (btn.isConnected) paint(on === true); }).catch(() => {});
      }
      kids.push(h('div', { class: 'iu-uye-btns' }, [btn]), msg,
        h('p', { class: 'iu-uye-links' }, [h('a', { href: ACCOUNT + '#alarmlar' }, [icon('fa-bell'), t('alarm')]), h('a', { href: ACCOUNT + '#favoriler' }, [icon('fa-heart'), t('favs')])]));
    } else if (member) {
      kids.push(memberButtons(false));
    } else {
      kids.push(authButtons(), h('p', { class: 'iu-uye-note', text: t('note') }));
      if (st.kind === 'admin') kids.push(adminNote());
    }
    return h('div', { class: 'iu-uye iu-uye--ilan', role: 'region', 'aria-labelledby': id }, kids);
  }

  const RENDER = { home: renderHome, kategori: renderKategori, ilan: renderIlan };

  function draw(box) {
    const kind = box.getAttribute('data-uye-ol');
    const fn = RENDER[kind];
    if (!fn) return;
    const st = state();
    const key = st.kind + '|' + (st.name || '') + '|' + (st.pending ? 'p' : 'r');
    if (box.__iuUyeKey === key) return;            // değişiklik yok
    box.__iuUyeKey = key;
    const node = fn(box, st);
    if (LANG === 'ar') node.setAttribute('dir', 'rtl');
    node.classList.add('notranslate');
    node.setAttribute('translate', 'no');
    box.textContent = '';
    box.appendChild(node);
    box.setAttribute('data-uye-ol-ready', '1');
  }

  function drawAll() { document.querySelectorAll('[data-uye-ol]').forEach(draw); }

  function mount(box) {
    if (!box || !box.getAttribute) return;
    injectCss();
    draw(box);
  }

  function init() {
    injectCss();
    drawAll();
    window.addEventListener('iu-auth-change', drawAll);
    // Eski önbellekteki widget olay göndermeyebilir: en fazla ~10 sn durumu kontrol et, sonra elindekine güven
    let n = 0;
    const iv = setInterval(() => {
      if (window.IUAuth && window.IUAuth.ready) { clearInterval(iv); drawAll(); return; }
      if (++n >= 20) { clearInterval(iv); settled = true; drawAll(); }
    }, 500);
  }

  window.IUUyeOl = { mount, refresh: drawAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
