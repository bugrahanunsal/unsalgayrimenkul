/**
 * IUEmailRender — Blok tabanlı e-posta tasarımını (JSON) e-posta istemcisi uyumlu HTML'e çevirir.
 * Tablo tabanlı, 600px, mobilde tek sütun. Tüm kullanıcı metinleri escape edilir;
 * zengin metin blokları IUSafe beyaz listesinden geçer. URL'ler doğrulanır.
 * Kişiselleştirme: {{ad}} ve {{abonelik_iptal}} yer tutucularını sunucu doldurur.
 */
(function (root) {
  'use strict';
  const SITE = 'https://ismailunsal.com.tr';
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const color = (c, d) => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : d;
  const num = (n, d, min, max) => { n = Number(n); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
  const align = (a) => ['left', 'center', 'right'].includes(a) ? a : 'left';
  const img = (u) => /^https:\/\/[^\s"'<>()]+$/i.test(String(u || '').trim()) ? String(u).trim() : '';
  function href(u) {
    u = String(u || '').trim();
    if (/^(https?:\/\/|mailto:|tel:)[^\s"'<>]*$/i.test(u)) return u;
    if (/^\/(?!\/)[^\s"'<>]*$/.test(u)) return SITE + u;
    if (u === '{{abonelik_iptal}}') return u;
    return '';
  }
  const FONTS = { Arial: 'Arial,Helvetica,sans-serif', Georgia: 'Georgia,Times,serif', Verdana: 'Verdana,Geneva,sans-serif', Trebuchet: "'Trebuchet MS',Arial,sans-serif" };
  function fmtPrice(v, cur) { if (!v) return 'Fiyat için arayın'; const s = { TL: '₺', TRY: '₺', USD: '$', EUR: '€', GBP: '£' }[cur] || '₺'; return new Intl.NumberFormat('tr-TR').format(v) + ' ' + s; }
  function propUrl(p) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug || '') ? `${SITE}/ilan/${p.slug}` : `${SITE}/ilan?id=${encodeURIComponent(p.id)}`; }
  function propImg(p) {
    const im = (p.property_images || []).filter(i => i && img(i.url));
    return im.length ? (im.find(i => i.ana_foto) || im[0]).url : '';
  }
  function richText(html) {
    if (!root.IUSafe) return esc(String(html || '').replace(/<[^>]+>/g, ''));
    return root.IUSafe.sanitize(html || '');
  }

  function blockHTML(b, S, props) {
    const F = FONTS[S.font] || FONTS.Arial;
    const pad = 'padding:12px 28px;';
    switch (b.type) {
      case 'header': {
        const dark = b.style !== 'white';
        return `<tr><td style="background:${dark ? '#0A2A5E' : '#FFFFFF'};padding:22px 28px;${dark ? '' : 'border-bottom:1px solid #E5E7EB;'}">
          <table role="presentation" cellpadding="0" cellspacing="0" align="${align(b.align) === 'center' ? 'center' : 'left'}"><tr>
          <td style="background:${dark ? '#FFFFFF' : '#0A2A5E'};color:${dark ? '#0A2A5E' : '#FFFFFF'};font-family:Arial,sans-serif;font-weight:800;font-size:13px;letter-spacing:1.5px;padding:7px 9px;border-radius:3px;white-space:nowrap;">TURYAP</td>
          <td style="padding-left:12px;font-family:Arial,sans-serif;white-space:nowrap;"><span style="color:${dark ? '#FFFFFF' : '#0A2A5E'};font-weight:800;font-size:18px;letter-spacing:1px;">İSMAİL </span><span style="color:${dark ? '#60A5FA' : '#2563EB'};font-weight:800;font-size:18px;letter-spacing:1px;">ÜNSAL</span><div style="color:${dark ? 'rgba(255,255,255,.6)' : '#6B7280'};font-size:9px;letter-spacing:3px;margin-top:2px;">REAL ESTATE</div></td>
          </tr></table></td></tr>`;
      }
      case 'heading': {
        const size = num(b.size, 26, 16, 44);
        return `<tr><td style="${pad}padding-top:18px;font-family:${F};font-size:${size}px;line-height:1.25;font-weight:800;color:${color(b.color, '#0A2A5E')};text-align:${align(b.align)};">${esc(b.text || '')}</td></tr>`;
      }
      case 'text':
        return `<tr><td class="iu-txt" style="${pad}font-family:${F};font-size:${num(b.size, 15, 12, 22)}px;line-height:1.65;color:${color(b.color, S.text)};text-align:${align(b.align)};">${richText(b.html)}</td></tr>`;
      case 'image': {
        const u = img(b.src); if (!u) return '';
        const w = num(b.width, 100, 20, 100); const h = href(b.href);
        const tag = `<img src="${esc(u)}" alt="${esc(b.alt || '')}" width="${Math.round(544 * w / 100)}" style="display:block;width:${w}%;max-width:${Math.round(544 * w / 100)}px;height:auto;border:0;border-radius:${num(b.radius, 10, 0, 30)}px;${align(b.align) === 'center' ? 'margin:0 auto;' : ''}">`;
        return `<tr><td style="${pad}" align="${align(b.align)}">${h ? `<a href="${esc(h)}" target="_blank">${tag}</a>` : tag}</td></tr>`;
      }
      case 'button': {
        const h = href(b.href) || SITE;
        const bg = color(b.bg, S.accent), fg = color(b.color, '#FFFFFF');
        return `<tr><td style="${pad}padding-top:16px;padding-bottom:16px;" align="${align(b.align || 'center')}">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${bg};border-radius:${num(b.radius, 10, 0, 30)}px;">
          <a href="${esc(h)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${F};font-size:15px;font-weight:700;color:${fg};text-decoration:none;">${esc(b.text || 'Hemen İncele')}</a>
          </td></tr></table></td></tr>`;
      }
      case 'divider':
        return `<tr><td style="${pad}"><div style="border-top:1px solid ${color(b.color, '#E5E7EB')};font-size:0;line-height:0;">&nbsp;</div></td></tr>`;
      case 'spacer':
        return `<tr><td style="height:${num(b.h, 24, 4, 120)}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
      case 'imagetext': {
        const u = img(b.src);
        const left = b.side !== 'right';
        const im = u ? `<img src="${esc(u)}" alt="" width="250" style="display:block;width:100%;max-width:250px;height:auto;border:0;border-radius:10px;">` : '';
        const tx = `<div style="font-family:${F};font-size:15px;line-height:1.6;color:${S.text};">${richText(b.html)}</div>`;
        const c1 = `<td class="iu-col" width="50%" valign="top" style="padding:0 10px;">${left ? im : tx}</td>`, c2 = `<td class="iu-col" width="50%" valign="top" style="padding:0 10px;">${left ? tx : im}</td>`;
        return `<tr><td style="padding:12px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${c1}${c2}</tr></table></td></tr>`;
      }
      case 'listings': {
        const list = (b.ids || []).map(id => props && props[id]).filter(Boolean);
        if (!list.length) return `<tr><td style="${pad}font-family:${F};color:#94A3B8;font-size:13px;text-align:center;">[İlan seçilmedi]</td></tr>`;
        const two = Number(b.columns) === 2;
        const card = (p) => {
          const u = propImg(p); const url = propUrl(p);
          const loc = [p.mahalle, p.ilce].filter(Boolean).join(', ');
          const facts = [p.oda_sayisi, p.m2 ? p.m2 + ' m²' : ''].filter(Boolean).join(' · ');
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;background:#FFFFFF;">
            ${u ? `<tr><td><a href="${esc(url)}" target="_blank"><img src="${esc(u)}" alt="" width="${two ? 262 : 544}" style="display:block;width:100%;height:auto;max-height:${two ? 170 : 260}px;object-fit:cover;border:0;"></a></td></tr>` : ''}
            <tr><td style="padding:14px 16px 16px;font-family:${F};">
              <div style="font-size:${two ? 15 : 17}px;font-weight:700;color:#0A2A5E;line-height:1.35;">${esc(p.baslik_tr || 'İlan')}</div>
              ${loc ? `<div style="font-size:12px;color:#6B7280;margin-top:4px;">${esc(loc)}</div>` : ''}
              ${facts ? `<div style="font-size:12px;color:#374151;margin-top:4px;">${esc(facts)}</div>` : ''}
              <div style="font-size:${two ? 16 : 19}px;font-weight:800;color:#0A2A5E;margin:10px 0 12px;">${esc(fmtPrice(p.fiyat, p.para_birimi))}</div>
              <a href="${esc(url)}" target="_blank" style="display:inline-block;background:${S.accent};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:13px;padding:9px 16px;border-radius:8px;">İlanı İncele →</a>
            </td></tr></table>`;
        };
        if (!two) return list.map(p => `<tr><td style="padding:8px 28px;">${card(p)}</td></tr>`).join('');
        let rows = '';
        for (let i = 0; i < list.length; i += 2) {
          rows += `<tr><td style="padding:8px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td class="iu-col" width="50%" valign="top" style="padding:0 10px;">${card(list[i])}</td>
            <td class="iu-col" width="50%" valign="top" style="padding:0 10px;">${list[i + 1] ? card(list[i + 1]) : ''}</td></tr></table></td></tr>`;
        }
        return rows;
      }
      case 'contact':
        return `<tr><td style="padding:14px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border-radius:12px;"><tr><td style="padding:16px 18px;font-family:${F};">
          <div style="font-size:15px;font-weight:700;color:#0A2A5E;margin-bottom:6px;">${esc(b.title || 'Bilgi almak ister misiniz?')}</div>
          <div style="font-size:14px;color:#374151;line-height:1.7;">Tel: <a href="tel:+905075188482" style="color:#1D4ED8;text-decoration:none;font-weight:700;">+90 507 518 84 82</a> &nbsp;·&nbsp; WhatsApp: <a href="https://wa.me/905075188482" style="color:#1D4ED8;text-decoration:none;font-weight:700;">WhatsApp</a><br><a href="${SITE}" style="color:#1D4ED8;text-decoration:none;">ismailunsal.com.tr</a></div>
        </td></tr></table></td></tr>`;
      default: return '';
    }
  }

  /**
   * @param design {settings, blocks}
   * @param opts {props: {id: property}, preheader}
   */
  function render(design, opts = {}) {
    const S0 = (design && design.settings) || {};
    const S = { bg: color(S0.bg, '#F1F5F9'), content: color(S0.content, '#FFFFFF'), accent: color(S0.accent, '#2563EB'), text: color(S0.text, '#1F2937'), font: FONTS[S0.font] ? S0.font : 'Arial' };
    const blocks = Array.isArray(design && design.blocks) ? design.blocks.slice(0, 60) : [];
    const body = blocks.map(b => blockHTML(b || {}, S, opts.props || {})).join('\n');
    const pre = esc(String(opts.preheader || '').slice(0, 140));
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${esc(opts.subject || '')}</title>
<style>@media (max-width:620px){.iu-col{display:block!important;width:100%!important;padding:0 0 14px!important}.iu-wrap{width:100%!important}}
.iu-txt p{margin:0 0 12px}.iu-txt h2{font-size:22px;color:#0A2A5E;margin:10px 0 8px}.iu-txt h3{font-size:18px;color:#0A2A5E;margin:8px 0 6px}.iu-txt a{color:${S.accent}}.iu-txt .highlight{color:${S.accent};font-weight:700}.iu-txt img{max-width:100%;height:auto;border-radius:8px}</style></head>
<body style="margin:0;padding:0;background:${S.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${S.bg};"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" class="iu-wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:${S.content};border-radius:14px;overflow:hidden;">
${body}
<tr><td style="background:#0A2A5E;padding:18px 28px;font-family:Arial,sans-serif;font-size:11px;line-height:1.7;color:rgba(255,255,255,.72);text-align:center;">
TURYAP İsmail Ünsal Real Estate · Yalova · <a href="${SITE}" style="color:#93C5FD;text-decoration:none;">ismailunsal.com.tr</a><br>
Bu e-postayı TURYAP İsmail Ünsal ile iletişiminiz / aboneliğiniz nedeniyle aldınız.<br>
<a href="{{abonelik_iptal}}" style="color:#93C5FD;">Abonelikten çık</a>
</td></tr></table></td></tr></table></body></html>`;
  }

  const TEMPLATES = {
    bos: { name: 'Boş tasarım', design: { settings: {}, blocks: [{ type: 'header' }, { type: 'text', html: '<p>Merhaba {{ad}},</p><p>Buraya mesajınızı yazın.</p>' }, { type: 'contact' }] } },
    ilan: { name: 'Yeni ilan duyurusu', design: { settings: {}, blocks: [
      { type: 'header' },
      { type: 'heading', text: 'Size uygun yeni ilanlar yayında', align: 'left' },
      { type: 'text', html: '<p>Merhaba {{ad}},</p><p>Portföyümüze eklenen ve ilginizi çekebilecek ilanları sizin için seçtik.</p>' },
      { type: 'listings', ids: [], columns: 1 },
      { type: 'button', text: 'Tüm İlanları Gör', href: 'https://ismailunsal.com.tr/yalova-satilik-daire', align: 'center' },
      { type: 'contact' }] } },
    bulten: { name: 'Aylık bülten', design: { settings: {}, blocks: [
      { type: 'header' },
      { type: 'image', src: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80', width: 100, align: 'center' },
      { type: 'heading', text: 'Yalova Emlak Bülteni', align: 'center' },
      { type: 'text', html: '<p>Merhaba {{ad}},</p><p>Bu ay Yalova emlak piyasasında öne çıkan gelişmeleri ve fırsatları sizin için derledik.</p>', align: 'left' },
      { type: 'divider' },
      { type: 'imagetext', src: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80', html: '<h3>Arsa yatırımı</h3><p>Bölgedeki güncel fiyat aralıkları ve yatırım tavsiyeleri.</p>', side: 'left' },
      { type: 'listings', ids: [], columns: 2 },
      { type: 'button', text: 'Blogumuzu Okuyun', href: 'https://ismailunsal.com.tr/blog', align: 'center' },
      { type: 'contact' }] } }
  };

  root.IUEmailRender = { render, TEMPLATES, esc };
})(window);
