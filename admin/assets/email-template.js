/**
 * EMAIL HTML TEMPLATE (6 Dilli)
 * ismailunsal.com.tr
 *
 * Modern, responsive, inbox-friendly email template
 * Test edildi: Gmail, Outlook, Yahoo, Apple Mail
 */

const EmailTemplate = (() => {

  const SITE_URL = 'https://ismailunsal.com.tr';
  const LOGO_URL = 'https://ismailunsal.com.tr/logo-email.png';

  const translations = {
    tr: {
      preheader: 'Bu haftaki yeni gayrimenkul fırsatları',
      greeting: 'Merhaba',
      intro: 'Bu hafta portföyümüze eklediğimiz seçkin gayrimenkulleri sizinle paylaşmak istiyoruz.',
      viewDetails: 'Detayları Gör',
      contact: 'İletişime Geç',
      contactPhone: 'Ara: ',
      contactWhatsapp: 'WhatsApp',
      contactEmail: 'Email',
      viewAll: 'Tüm İlanları Gör',
      footer: 'Bu emaili, ismailunsal.com.tr sitemize abone olduğunuz için alıyorsunuz.',
      unsubscribe: 'Aboneliği İptal Et',
      preferences: 'Tercihlerimi Güncelle',
      copyright: 'Tüm hakları saklıdır',
      companyName: 'İsmail Ünsal Gayrimenkul',
      companyDesc: 'TURYAP Yalova Franchise',
      addressLabel: 'Adres:',
      address: 'Yalova, Türkiye',
      forFA: 'Fiyat:'
    },
    en: {
      preheader: 'This week\'s new real estate opportunities',
      greeting: 'Hello',
      intro: 'We\'d like to share the exclusive properties we\'ve added to our portfolio this week.',
      viewDetails: 'View Details',
      contact: 'Contact',
      contactPhone: 'Call: ',
      contactWhatsapp: 'WhatsApp',
      contactEmail: 'Email',
      viewAll: 'View All Listings',
      footer: 'You\'re receiving this email because you subscribed to ismailunsal.com.tr',
      unsubscribe: 'Unsubscribe',
      preferences: 'Update Preferences',
      copyright: 'All rights reserved',
      companyName: 'Ismail Unsal Real Estate',
      companyDesc: 'TURYAP Yalova Franchise',
      addressLabel: 'Address:',
      address: 'Yalova, Turkey',
      forFA: 'Price:'
    },
    de: {
      preheader: 'Neue Immobilienangebote dieser Woche',
      greeting: 'Hallo',
      intro: 'Wir möchten Ihnen die exklusiven Immobilien vorstellen, die wir diese Woche zu unserem Portfolio hinzugefügt haben.',
      viewDetails: 'Details ansehen',
      contact: 'Kontakt',
      contactPhone: 'Anrufen: ',
      contactWhatsapp: 'WhatsApp',
      contactEmail: 'E-Mail',
      viewAll: 'Alle Anzeigen',
      footer: 'Sie erhalten diese E-Mail, weil Sie ismailunsal.com.tr abonniert haben.',
      unsubscribe: 'Abmelden',
      preferences: 'Einstellungen aktualisieren',
      copyright: 'Alle Rechte vorbehalten',
      companyName: 'Ismail Unsal Immobilien',
      companyDesc: 'TURYAP Yalova Franchise',
      addressLabel: 'Adresse:',
      address: 'Yalova, Türkei',
      forFA: 'Preis:'
    },
    fr: {
      preheader: 'Les nouvelles opportunités immobilières de cette semaine',
      greeting: 'Bonjour',
      intro: 'Nous aimerions partager les propriétés exclusives que nous avons ajoutées à notre portefeuille cette semaine.',
      viewDetails: 'Voir les détails',
      contact: 'Contact',
      contactPhone: 'Appeler: ',
      contactWhatsapp: 'WhatsApp',
      contactEmail: 'E-mail',
      viewAll: 'Voir toutes les annonces',
      footer: 'Vous recevez cet e-mail parce que vous êtes abonné à ismailunsal.com.tr',
      unsubscribe: 'Se désabonner',
      preferences: 'Mettre à jour les préférences',
      copyright: 'Tous droits réservés',
      companyName: 'Ismail Unsal Immobilier',
      companyDesc: 'TURYAP Yalova Franchise',
      addressLabel: 'Adresse:',
      address: 'Yalova, Turquie',
      forFA: 'Prix:'
    },
    ru: {
      preheader: 'Новые предложения недвижимости на этой неделе',
      greeting: 'Здравствуйте',
      intro: 'Мы хотели бы поделиться эксклюзивными объектами, которые мы добавили в наш портфель на этой неделе.',
      viewDetails: 'Подробнее',
      contact: 'Связаться',
      contactPhone: 'Позвонить: ',
      contactWhatsapp: 'WhatsApp',
      contactEmail: 'Email',
      viewAll: 'Все объявления',
      footer: 'Вы получаете это письмо, потому что подписались на ismailunsal.com.tr',
      unsubscribe: 'Отписаться',
      preferences: 'Обновить настройки',
      copyright: 'Все права защищены',
      companyName: 'Недвижимость Исмаил Унсал',
      companyDesc: 'Франшиза TURYAP Ялова',
      addressLabel: 'Адрес:',
      address: 'Ялова, Турция',
      forFA: 'Цена:'
    }
  };

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatPrice(price, lang = 'tr') {
    if (!price) return '-';
    const locales = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', fr: 'fr-FR', ru: 'ru-RU' };
    return new Intl.NumberFormat(locales[lang] || 'tr-TR').format(price) + ' ₺';
  }

  function buildPropertyCard(property, lang = 'tr', unsubToken = '') {
    const t = translations[lang] || translations.tr;
    const titleKey = 'baslik_' + lang;
    const descKey = 'aciklama_' + lang;
    const title = property[titleKey] || property.baslik_tr;
    const desc = (property[descKey] || property.aciklama_tr || '').substring(0, 120);

    const mainImage = property.property_images?.find(i => i.is_main)?.url ||
                      property.property_images?.[0]?.url ||
                      'https://ismailunsal.com.tr/placeholder.jpg';

    const propUrl = `${SITE_URL}/ilan/${property.id}?utm_source=email&utm_medium=newsletter&utm_campaign=weekly_digest`;

    return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <tr>
        <td>
          <a href="${propUrl}" style="text-decoration: none;">
            <img src="${escapeHtml(mainImage)}" alt="${escapeHtml(title)}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block;">
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px;">
          <div style="font-size: 12px; color: #2563EB; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            ${escapeHtml(property.kategori || '')} • ${escapeHtml(property.tip || '')}
          </div>
          <h2 style="font-size: 20px; color: #0a1929; margin: 0 0 12px 0; font-weight: 700; line-height: 1.3;">
            <a href="${propUrl}" style="color: #0a1929; text-decoration: none;">${escapeHtml(title)}</a>
          </h2>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
            ${escapeHtml(desc)}${desc.length >= 120 ? '...' : ''}
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td>
                <div style="font-size: 24px; color: #0a1929; font-weight: 700;">
                  ${formatPrice(property.fiyat, lang)}
                </div>
              </td>
              <td align="right">
                <a href="${propUrl}" style="display: inline-block; background: #2563EB; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  ${t.viewDetails} →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  function build({ subject, language = 'tr', properties = [], customMessage = '', unsubscribeToken = '', recipientName = '' }) {
    const t = translations[language] || translations.tr;
    const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
    const prefsUrl = `${SITE_URL}/preferences?token=${encodeURIComponent(unsubscribeToken)}`;
    const year = new Date().getFullYear();

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${language}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background: #f3f4f6; }
    a { color: #2563EB; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .mobile-hide { display: none !important; }
      h1 { font-size: 24px !important; }
      h2 { font-size: 18px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .dark-bg { background: #1a1a1a !important; }
      .dark-text { color: #f3f4f6 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Preheader (Inbox preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${escapeHtml(t.preheader)} - ${properties.length} ${language === 'tr' ? 'yeni ilan' : 'new properties'}
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 20px 0;">

        <!-- CONTAINER -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width: 600px; width: 100%;">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a1929 0%, #1a3a5f 100%); padding: 32px 40px; border-radius: 12px 12px 0 0;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 20px; color: #2563EB; font-weight: 700; letter-spacing: 1px;">
                      İSMAİL ÜNSAL
                    </div>
                    <div style="font-size: 12px; color: #ffffff; opacity: 0.8; letter-spacing: 2px; margin-top: 4px;">
                      GAYRİMENKUL DANIŞMANI
                    </div>
                  </td>
                  <td align="right" class="mobile-hide">
                    <div style="font-size: 11px; color: #ffffff; opacity: 0.7; letter-spacing: 1px;">TURYAP YALOVA</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- INTRO -->
          <tr>
            <td style="background: #ffffff; padding: 32px 40px 24px 40px;" class="mobile-padding">
              <h1 style="font-size: 28px; color: #0a1929; margin: 0 0 16px 0; font-weight: 700; line-height: 1.2;">
                ${escapeHtml(t.greeting)}${recipientName ? ' ' + escapeHtml(recipientName) : ''},
              </h1>
              <p style="font-size: 16px; color: #4b5563; margin: 0 0 12px 0; line-height: 1.6;">
                ${escapeHtml(t.intro)}
              </p>
              ${customMessage ? `
                <div style="background: #EFF6FF; border-left: 4px solid #2563EB; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 0; font-size: 14px; color: #1E3A8A; line-height: 1.5;">
                    ${escapeHtml(customMessage)}
                  </p>
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- PROPERTIES -->
          <tr>
            <td style="background: #ffffff; padding: 0 40px 20px 40px;" class="mobile-padding">
              ${properties.map(p => buildPropertyCard(p, language, unsubscribeToken)).join('')}
            </td>
          </tr>

          <!-- VIEW ALL BUTTON -->
          <tr>
            <td style="background: #ffffff; padding: 20px 40px 40px 40px; text-align: center;" class="mobile-padding">
              <a href="${SITE_URL}?utm_source=email&utm_medium=newsletter" style="display: inline-block; background: #0a1929; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                ${escapeHtml(t.viewAll)}
              </a>
            </td>
          </tr>

          <!-- CONTACT BAR -->
          <tr>
            <td style="background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="font-size: 14px; color: #374151; font-weight: 600; margin-bottom: 12px;">
                      ${escapeHtml(t.contact)}
                    </div>
                    <a href="tel:+905551234567" style="display: inline-block; margin: 4px 6px; padding: 8px 14px; background: #ffffff; border: 1px solid #d1d5db; border-radius: 6px; color: #0a1929; text-decoration: none; font-size: 13px; font-weight: 500;">
                      ${escapeHtml(t.contactPhone)}+90 555 123 45 67
                    </a>
                    <a href="https://wa.me/905551234567" style="display: inline-block; margin: 4px 6px; padding: 8px 14px; background: #25D366; border-radius: 6px; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 500;">
                      ${escapeHtml(t.contactWhatsapp)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background: #0a1929; padding: 32px 40px; border-radius: 0 0 12px 12px;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="font-size: 14px; color: #2563EB; font-weight: 600; margin-bottom: 4px;">
                      ${escapeHtml(t.companyName)}
                    </div>
                    <div style="font-size: 12px; color: #ffffff; opacity: 0.7; margin-bottom: 16px;">
                      ${escapeHtml(t.companyDesc)}
                    </div>
                    <div style="font-size: 11px; color: #ffffff; opacity: 0.6; line-height: 1.6; margin-bottom: 16px;">
                      ${escapeHtml(t.addressLabel)} ${escapeHtml(t.address)}<br>
                      <a href="${SITE_URL}" style="color: #2563EB; text-decoration: none;">ismailunsal.com.tr</a>
                    </div>

                    <!-- Unsubscribe links (KVKK/GDPR zorunlu) -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 16px;">
                      <p style="font-size: 11px; color: #ffffff; opacity: 0.5; margin: 0 0 8px 0; line-height: 1.5;">
                        ${escapeHtml(t.footer)}
                      </p>
                      <a href="${unsubUrl}" style="color: #2563EB; text-decoration: underline; font-size: 11px; margin: 0 8px;">
                        ${escapeHtml(t.unsubscribe)}
                      </a>
                      <span style="color: #ffffff; opacity: 0.3;">•</span>
                      <a href="${prefsUrl}" style="color: #2563EB; text-decoration: underline; font-size: 11px; margin: 0 8px;">
                        ${escapeHtml(t.preferences)}
                      </a>
                    </div>

                    <div style="font-size: 10px; color: #ffffff; opacity: 0.4; margin-top: 12px;">
                      © ${year} ${escapeHtml(t.companyName)}. ${escapeHtml(t.copyright)}.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /CONTAINER -->

      </td>
    </tr>
  </table>

</body>
</html>`;
  }

  function buildVerificationEmail({ email, verificationToken, language = 'tr', fullName = '' }) {
    const verifyUrl = `${SITE_URL}/verify?token=${encodeURIComponent(verificationToken)}`;
    const t = translations[language] || translations.tr;

    const verifyTexts = {
      tr: {
        subject: 'Email adresinizi doğrulayın',
        title: 'Email Doğrulama',
        text: 'Aboneliğinizi tamamlamak için lütfen aşağıdaki butona tıklayarak email adresinizi doğrulayın.',
        button: 'Emailimi Doğrula',
        expiry: 'Bu link 24 saat geçerlidir.',
        notYou: 'Bu emaili beklemiyorduysanız görmezden gelin.'
      },
      en: {
        subject: 'Verify your email address',
        title: 'Email Verification',
        text: 'To complete your subscription, please verify your email by clicking the button below.',
        button: 'Verify My Email',
        expiry: 'This link expires in 24 hours.',
        notYou: 'If you didn\'t expect this email, please ignore it.'
      }
    };
    const vt = verifyTexts[language] || verifyTexts.tr;

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${escapeHtml(vt.subject)}</title></head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
    <table width="500" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
      <tr><td style="background: linear-gradient(135deg, #0a1929, #1a3a5f); padding: 40px; text-align: center;">
        <div style="font-size: 24px; color: #2563EB; font-weight: 700;">İSMAİL ÜNSAL</div>
        <div style="font-size: 12px; color: white; opacity: 0.8; margin-top: 4px;">GAYRİMENKUL</div>
      </td></tr>
      <tr><td style="padding: 40px;">
        <h1 style="color: #0a1929; margin: 0 0 16px 0;">${escapeHtml(vt.title)}</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">${escapeHtml(vt.text)}</p>
        <table cellpadding="0" cellspacing="0" style="margin: 30px auto;"><tr><td>
          <a href="${verifyUrl}" style="display: inline-block; background: #2563EB; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            ${escapeHtml(vt.button)}
          </a>
        </td></tr></table>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
          ${escapeHtml(vt.expiry)}<br>
          ${escapeHtml(vt.notYou)}
        </p>
      </td></tr>
      <tr><td style="background: #f9fafb; padding: 20px; text-align: center; font-size: 11px; color: #9ca3af;">
        © ${new Date().getFullYear()} İsmail Ünsal Gayrimenkul • ismailunsal.com.tr
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  }

  return {
    build,
    buildVerificationEmail,
    escapeHtml,
    formatPrice
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailTemplate;
}
