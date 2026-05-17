// ==========================================
// ÜNSAL GAYRİMENKUL - ÇEVİRİ SİSTEMİ
// Türkçe, İngilizce, Fransızca, Almanca, Rusça
// ==========================================

const translations = {
  tr: {
    // TOP BAR
    "topbar.location": "Yalova, Türkiye",
    "topbar.hours": "Pzt-Cmt: 09:00 - 19:00",

    // NAVIGATION
    "nav.satilik": "SATILIK",
    "nav.kiralik": "KİRALIK",
    "nav.arsa": "ARSA",
    "nav.luks": "LÜKS",
    "nav.luks.badge": "YENİ",
    "nav.blog": "BLOG",
    "nav.hakkimizda": "HAKKIMIZDA",
    "nav.iletisim": "İLETİŞİM",
    "nav.cta": "HEMEN ARA",

    // HERO
    "hero.eyebrow": "YALOVA'NIN GÜVENİLİR EMLAK MARKASI",
    "hero.title.part1": "Yalova'da Hayalindeki",
    "hero.title.highlight": "Mülk",
    "hero.title.part2": "Burada",
    "hero.subtitle": "Satılık, kiralık, arsa, villa — hepsi tek yerde. Akıllı arama ile aradığınızı saniyeler içinde bulun.",

    // SEARCH
    "search.all": "TÜMÜ",
    "search.satilik": "SATILIK",
    "search.kiralik": "KİRALIK",
    "search.arsa": "ARSA",
    "search.placeholder": "Çınarcık, daire, deniz manzaralı, arsa...",
    "search.button": "ARA",
    "search.ai.hint": "Akıllı arama — doğal dilde yazın, anında bulalım",
    "search.popular": "🔥 POPÜLER ARAMALAR",

    // CATEGORIES
    "cat.eyebrow": "KATEGORİLER",
    "cat.title.all": "Tüm Kategoriler",
    "cat.subtitle.all": "Yalova'nın her bölgesinden gayrimenkul seçenekleri",
    "cat.title.satilik": "Satılık Kategoriler",
    "cat.subtitle.satilik": "Satın almak için en iyi fırsatlar",
    "cat.title.kiralik": "Kiralık Kategoriler",
    "cat.subtitle.kiralik": "Kiralık daire, ev, villa seçenekleri",
    "cat.title.arsa": "Arsa Yatırım Fırsatları",
    "cat.subtitle.arsa": "İmarlı, deniz manzaralı yatırımlık arsalar",

    "cat.filter.showing": "kategori gösteriliyor",
    "cat.filter.total": "Toplam",
    "cat.filter.activelisting": "aktif ilan",
    "cat.search.results": "için sonuçlar",
    "cat.search.matching": "Aramanıza en uygun kategoriler",

    // CARDS
    "card.satilik.daire.title": "Yalova Satılık Daire",
    "card.satilik.daire.count": "87 aktif ilan",
    "card.kiralik.daire.title": "Yalova Kiralık Daire",
    "card.kiralik.daire.count": "42 aktif ilan",
    "card.satilik.arsa.title": "Yalova Satılık Arsa",
    "card.satilik.arsa.count": "23 aktif ilan",
    "card.satilik.arsa.tag": "Yatırım fırsatları",
    "card.kiralik.villa.title": "Yalova Kiralık Villa",
    "card.kiralik.villa.count": "15 aktif ilan",
    "card.kiralik.villa.tag": "Havuzlu, manzaralı",
    "card.satilik.ev.title": "Yalova Satılık Ev",
    "card.satilik.ev.count": "31 aktif ilan",
    "card.esyali.kiralik.title": "Yalova Eşyalı Kiralık",
    "card.esyali.kiralik.count": "18 aktif ilan",
    "card.merkez.kiralik.title": "Merkez Kiralık Daire",
    "card.merkez.kiralik.count": "22 aktif ilan",
    "card.kiralik.ev.title": "Yalova Kiralık Ev",
    "card.kiralik.ev.count": "14 aktif ilan",
    "card.cta": "İlanları Gör",

    "tag.popular": "EN POPÜLER",
    "tag.popular2": "POPÜLER",
    "tag.vip": "💎 VIP",
    "tag.luxury": "💎 LÜKS",
    "type.satilik": "SATILIK",
    "type.kiralik": "KİRALIK",

    // NO RESULTS
    "noresults.title": "Sonuç bulunamadı",
    "noresults.text": "Aramanıza uygun kategori bulunamadı. Filtreleri sıfırlayıp tekrar deneyin.",
    "noresults.button": "Filtreleri Sıfırla",

    // FEATURED
    "featured.tag": "💎 ÖZEL FIRSAT",
    "featured.price.label": "Akköy, Yalova • Konut İmarlı",
    "featured.location": "AKKÖY, YALOVA",
    "featured.title": "Deniz Manzaralı 435 m² Yatırımlık Arsa",
    "featured.description": "İstanbul'a yakın, gelişen Akköy bölgesinde, deniz manzaralı, konut imarlı eşsiz arsa fırsatı. 0.30 emsalli, villa veya apart projesi için ideal. Profesyonel danışmanlık ile yatırımınızı güvence altına alın.",
    "featured.stat.area": "ALAN",
    "featured.stat.emsal": "EMSAL",
    "featured.stat.imar": "İMAR",
    "featured.stat.imar.value": "Konut",
    "featured.stat.parsel": "ADA/PARSEL",
    "featured.cta.details": "DETAYLARI GÖR",
    "featured.cta.info": "BİLGİ AL",

    // BLOG
    "blog.eyebrow": "BLOG & REHBER",
    "blog.title": "Yatırım Rehberi & Piyasa Analizleri",
    "blog.subtitle": "Yalova emlak piyasası hakkında uzman görüşleri ve yatırım tavsiyeleri",
    "blog.tag.vip": "💎 VIP REHBER",
    "blog.tag.analysis": "PİYASA ANALİZİ",
    "blog.tag.region": "💎 BÖLGE REHBERİ",
    "blog.coming": "Yakında",
    "blog.read": "dk okuma",
    "blog.post1.title": "Yalova'da Arsa Yatırımı 2026 Rehberi",
    "blog.post1.excerpt": "İstanbul'a yakınlığı ve gelişen altyapısıyla Yalova'da arsa yatırımının avantajları ve fırsat bölgeleri...",
    "blog.post2.title": "2026 Yalova Emlak Piyasası Analizi",
    "blog.post2.excerpt": "Yalova'da daire fiyatları, kira getirileri ve 2026 yılı için piyasa öngörüleri...",
    "blog.post3.title": "Termal Bölgesinde Yatırımın 7 Avantajı",
    "blog.post3.excerpt": "Yalova Termal'in turizm potansiyeli, sağlık turizmi ve gayrimenkul değerlendirmesi...",
    "blog.readmore": "Devamını Oku",
    "blog.allposts": "Tüm Blog Yazıları",

    // SERVICES
    "services.eyebrow": "HİZMETLERİMİZ",
    "services.title": "Neden ÜNSAL Gayrimenkul?",
    "services.subtitle": "Turyap güvencesinde profesyonel emlak danışmanlığı",
    "service1.title": "Turyap Güvencesi",
    "service1.text": "Türkiye'nin en güvenilir emlak markası altında profesyonel hizmet",
    "service2.title": "Yerel Uzmanlık",
    "service2.text": "Yalova'nın her köşesini bilen, deneyimli kadro",
    "service3.title": "5 Dilde Hizmet",
    "service3.text": "TR, EN, FR, DE, RU dillerinde uluslararası müşteri desteği",
    "service4.title": "7/24 Destek",
    "service4.text": "WhatsApp ve telefon ile her zaman ulaşabileceğiniz danışmanlık",

    // HOME CTA
    "homecta.title": "Hayalindeki Mülkü Bulalım",
    "homecta.subtitle": "Ücretsiz danışmanlık için hemen iletişime geçin. Size en uygun seçenekleri sunalım.",
    "homecta.call": "HEMEN ARA: +90 507 518 84 82",
    "homecta.wa": "WHATSAPP",

    // FOOTER
    "footer.about": "Yalova'da güvenilir gayrimenkul danışmanlığı. Turyap güvencesinde profesyonel hizmet.",
    "footer.quick": "Hızlı Erişim",
    "footer.regions": "Bölgeler",
    "footer.contact": "İletişim",
    "footer.copyright": "© 2026 ÜNSAL Gayrimenkul. Tüm hakları saklıdır. • İsmail Ünsal",

    // SUGGESTIONS
    "sug.cinarcik": "Çınarcık satılık daire",
    "sug.termal": "Termal kiralık villa",
    "sug.akkoy": "Akköy yatırımlık arsa",
    "sug.merkez": "Merkez kiralık 2+1",
    "sug.esyali": "Eşyalı kiralık daire",
    "sug.deniz": "Deniz manzaralı satılık",
    "sug.mustakil": "Müstakil bahçeli ev",
    "sug.havuzlu": "Havuzlu lüks villa"
  },

  en: {
    "topbar.location": "Yalova, Turkey",
    "topbar.hours": "Mon-Sat: 09:00 - 19:00",

    "nav.satilik": "FOR SALE",
    "nav.kiralik": "FOR RENT",
    "nav.arsa": "LAND",
    "nav.luks": "LUXURY",
    "nav.luks.badge": "NEW",
    "nav.blog": "BLOG",
    "nav.hakkimizda": "ABOUT US",
    "nav.iletisim": "CONTACT",
    "nav.cta": "CALL NOW",

    "hero.eyebrow": "YALOVA'S TRUSTED REAL ESTATE BRAND",
    "hero.title.part1": "Find Your Dream",
    "hero.title.highlight": "Property",
    "hero.title.part2": "in Yalova",
    "hero.subtitle": "For sale, for rent, land, villa — all in one place. Find what you're looking for in seconds with smart search.",

    "search.all": "ALL",
    "search.satilik": "FOR SALE",
    "search.kiralik": "FOR RENT",
    "search.arsa": "LAND",
    "search.placeholder": "Çınarcık, apartment, sea view, land...",
    "search.button": "SEARCH",
    "search.ai.hint": "Smart search — write in natural language, find it instantly",
    "search.popular": "🔥 POPULAR SEARCHES",

    "cat.eyebrow": "CATEGORIES",
    "cat.title.all": "All Categories",
    "cat.subtitle.all": "Real estate options from every district of Yalova",
    "cat.title.satilik": "Properties For Sale",
    "cat.subtitle.satilik": "Best opportunities to buy",
    "cat.title.kiralik": "Properties For Rent",
    "cat.subtitle.kiralik": "Rental apartments, houses, villas",
    "cat.title.arsa": "Land Investment Opportunities",
    "cat.subtitle.arsa": "Zoned lands with sea views for investment",

    "cat.filter.showing": "categories shown",
    "cat.filter.total": "Total",
    "cat.filter.activelisting": "active listings",
    "cat.search.results": "results for",
    "cat.search.matching": "Categories matching your search",

    "card.satilik.daire.title": "Yalova Apartments For Sale",
    "card.satilik.daire.count": "87 active listings",
    "card.kiralik.daire.title": "Yalova Apartments For Rent",
    "card.kiralik.daire.count": "42 active listings",
    "card.satilik.arsa.title": "Yalova Land For Sale",
    "card.satilik.arsa.count": "23 active listings",
    "card.satilik.arsa.tag": "Investment opportunities",
    "card.kiralik.villa.title": "Yalova Villa Rentals",
    "card.kiralik.villa.count": "15 active listings",
    "card.kiralik.villa.tag": "Pool, sea view",
    "card.satilik.ev.title": "Yalova Houses For Sale",
    "card.satilik.ev.count": "31 active listings",
    "card.esyali.kiralik.title": "Yalova Furnished Rentals",
    "card.esyali.kiralik.count": "18 active listings",
    "card.merkez.kiralik.title": "City Center Rentals",
    "card.merkez.kiralik.count": "22 active listings",
    "card.kiralik.ev.title": "Yalova Houses For Rent",
    "card.kiralik.ev.count": "14 active listings",
    "card.cta": "View Listings",

    "tag.popular": "MOST POPULAR",
    "tag.popular2": "POPULAR",
    "tag.vip": "💎 VIP",
    "tag.luxury": "💎 LUXURY",
    "type.satilik": "FOR SALE",
    "type.kiralik": "FOR RENT",

    "noresults.title": "No results found",
    "noresults.text": "No categories match your search. Reset filters and try again.",
    "noresults.button": "Reset Filters",

    "featured.tag": "💎 SPECIAL OFFER",
    "featured.price.label": "Akköy, Yalova • Residential Zoning",
    "featured.location": "AKKÖY, YALOVA",
    "featured.title": "Sea View 435 m² Investment Land",
    "featured.description": "Unique land opportunity in the developing Akköy region, close to Istanbul, with sea views and residential zoning. With a 0.30 floor area ratio, ideal for villa or apart-hotel projects. Secure your investment with professional consultancy.",
    "featured.stat.area": "AREA",
    "featured.stat.emsal": "FAR",
    "featured.stat.imar": "ZONING",
    "featured.stat.imar.value": "Residential",
    "featured.stat.parsel": "BLOCK/PARCEL",
    "featured.cta.details": "VIEW DETAILS",
    "featured.cta.info": "GET INFO",

    "blog.eyebrow": "BLOG & GUIDE",
    "blog.title": "Investment Guides & Market Analysis",
    "blog.subtitle": "Expert insights and investment advice on the Yalova real estate market",
    "blog.tag.vip": "💎 VIP GUIDE",
    "blog.tag.analysis": "MARKET ANALYSIS",
    "blog.tag.region": "💎 REGION GUIDE",
    "blog.coming": "Coming Soon",
    "blog.read": "min read",
    "blog.post1.title": "Yalova Land Investment Guide 2026",
    "blog.post1.excerpt": "Advantages of land investment in Yalova with its proximity to Istanbul and developing infrastructure, plus opportunity regions...",
    "blog.post2.title": "2026 Yalova Real Estate Market Analysis",
    "blog.post2.excerpt": "Apartment prices in Yalova, rental yields and market forecasts for 2026...",
    "blog.post3.title": "7 Advantages of Investing in Termal Region",
    "blog.post3.excerpt": "Yalova Termal's tourism potential, health tourism and real estate evaluation...",
    "blog.readmore": "Read More",
    "blog.allposts": "All Blog Posts",

    "services.eyebrow": "OUR SERVICES",
    "services.title": "Why ÜNSAL Real Estate?",
    "services.subtitle": "Professional real estate consultancy under Turyap assurance",
    "service1.title": "Turyap Assurance",
    "service1.text": "Professional service under Turkey's most trusted real estate brand",
    "service2.title": "Local Expertise",
    "service2.text": "Experienced team familiar with every corner of Yalova",
    "service3.title": "Service in 5 Languages",
    "service3.text": "International customer support in TR, EN, FR, DE, RU",
    "service4.title": "24/7 Support",
    "service4.text": "Consultancy reachable anytime via WhatsApp and phone",

    "homecta.title": "Let's Find Your Dream Property",
    "homecta.subtitle": "Contact us now for free consultation. Let us offer you the most suitable options.",
    "homecta.call": "CALL NOW: +90 507 518 84 82",
    "homecta.wa": "WHATSAPP",

    "footer.about": "Trusted real estate consultancy in Yalova. Professional service under Turyap assurance.",
    "footer.quick": "Quick Links",
    "footer.regions": "Regions",
    "footer.contact": "Contact",
    "footer.copyright": "© 2026 ÜNSAL Real Estate. All rights reserved. • İsmail Ünsal",

    "sug.cinarcik": "Çınarcık apartments for sale",
    "sug.termal": "Termal villa rentals",
    "sug.akkoy": "Akköy investment land",
    "sug.merkez": "City center 2+1 rentals",
    "sug.esyali": "Furnished apartments for rent",
    "sug.deniz": "Sea view properties for sale",
    "sug.mustakil": "Detached house with garden",
    "sug.havuzlu": "Luxury villa with pool"
  },

  fr: {
    "topbar.location": "Yalova, Turquie",
    "topbar.hours": "Lun-Sam: 09h00 - 19h00",

    "nav.satilik": "À VENDRE",
    "nav.kiralik": "À LOUER",
    "nav.arsa": "TERRAIN",
    "nav.luks": "LUXE",
    "nav.luks.badge": "NOUVEAU",
    "nav.blog": "BLOG",
    "nav.hakkimizda": "À PROPOS",
    "nav.iletisim": "CONTACT",
    "nav.cta": "APPELEZ",

    "hero.eyebrow": "LA MARQUE IMMOBILIÈRE DE CONFIANCE DE YALOVA",
    "hero.title.part1": "Trouvez Votre",
    "hero.title.highlight": "Propriété",
    "hero.title.part2": "de Rêve à Yalova",
    "hero.subtitle": "À vendre, à louer, terrain, villa — tout au même endroit. Trouvez ce que vous cherchez en secondes avec la recherche intelligente.",

    "search.all": "TOUT",
    "search.satilik": "À VENDRE",
    "search.kiralik": "À LOUER",
    "search.arsa": "TERRAIN",
    "search.placeholder": "Çınarcık, appartement, vue mer, terrain...",
    "search.button": "RECHERCHER",
    "search.ai.hint": "Recherche intelligente — écrivez en langage naturel, trouvez instantanément",
    "search.popular": "🔥 RECHERCHES POPULAIRES",

    "cat.eyebrow": "CATÉGORIES",
    "cat.title.all": "Toutes les Catégories",
    "cat.subtitle.all": "Options immobilières de chaque district de Yalova",
    "cat.title.satilik": "Biens à Vendre",
    "cat.subtitle.satilik": "Les meilleures opportunités d'achat",
    "cat.title.kiralik": "Biens à Louer",
    "cat.subtitle.kiralik": "Appartements, maisons, villas à louer",
    "cat.title.arsa": "Opportunités d'Investissement en Terrains",
    "cat.subtitle.arsa": "Terrains zonés avec vue sur la mer pour investissement",

    "cat.filter.showing": "catégories affichées",
    "cat.filter.total": "Total",
    "cat.filter.activelisting": "annonces actives",
    "cat.search.results": "résultats pour",
    "cat.search.matching": "Catégories correspondant à votre recherche",

    "card.satilik.daire.title": "Appartements à Vendre à Yalova",
    "card.satilik.daire.count": "87 annonces actives",
    "card.kiralik.daire.title": "Appartements à Louer à Yalova",
    "card.kiralik.daire.count": "42 annonces actives",
    "card.satilik.arsa.title": "Terrains à Vendre à Yalova",
    "card.satilik.arsa.count": "23 annonces actives",
    "card.satilik.arsa.tag": "Opportunités d'investissement",
    "card.kiralik.villa.title": "Villas à Louer à Yalova",
    "card.kiralik.villa.count": "15 annonces actives",
    "card.kiralik.villa.tag": "Piscine, vue mer",
    "card.satilik.ev.title": "Maisons à Vendre à Yalova",
    "card.satilik.ev.count": "31 annonces actives",
    "card.esyali.kiralik.title": "Locations Meublées à Yalova",
    "card.esyali.kiralik.count": "18 annonces actives",
    "card.merkez.kiralik.title": "Locations Centre-Ville",
    "card.merkez.kiralik.count": "22 annonces actives",
    "card.kiralik.ev.title": "Maisons à Louer à Yalova",
    "card.kiralik.ev.count": "14 annonces actives",
    "card.cta": "Voir les Annonces",

    "tag.popular": "PLUS POPULAIRE",
    "tag.popular2": "POPULAIRE",
    "tag.vip": "💎 VIP",
    "tag.luxury": "💎 LUXE",
    "type.satilik": "À VENDRE",
    "type.kiralik": "À LOUER",

    "noresults.title": "Aucun résultat trouvé",
    "noresults.text": "Aucune catégorie ne correspond à votre recherche. Réinitialisez les filtres et réessayez.",
    "noresults.button": "Réinitialiser les Filtres",

    "featured.tag": "💎 OFFRE SPÉCIALE",
    "featured.price.label": "Akköy, Yalova • Zone Résidentielle",
    "featured.location": "AKKÖY, YALOVA",
    "featured.title": "Terrain d'Investissement 435 m² Vue Mer",
    "featured.description": "Opportunité unique de terrain dans la région d'Akköy en développement, près d'Istanbul, avec vue sur la mer et zonage résidentiel. Avec un coefficient de 0,30, idéal pour des projets de villa ou d'apart-hôtel. Sécurisez votre investissement avec un conseil professionnel.",
    "featured.stat.area": "SURFACE",
    "featured.stat.emsal": "COS",
    "featured.stat.imar": "ZONAGE",
    "featured.stat.imar.value": "Résidentiel",
    "featured.stat.parsel": "ÎLOT/PARCELLE",
    "featured.cta.details": "VOIR DÉTAILS",
    "featured.cta.info": "INFOS",

    "blog.eyebrow": "BLOG & GUIDE",
    "blog.title": "Guides d'Investissement & Analyses du Marché",
    "blog.subtitle": "Avis d'experts et conseils d'investissement sur le marché immobilier de Yalova",
    "blog.tag.vip": "💎 GUIDE VIP",
    "blog.tag.analysis": "ANALYSE DE MARCHÉ",
    "blog.tag.region": "💎 GUIDE RÉGIONAL",
    "blog.coming": "Bientôt",
    "blog.read": "min de lecture",
    "blog.post1.title": "Guide d'Investissement Terrain Yalova 2026",
    "blog.post1.excerpt": "Avantages de l'investissement en terrain à Yalova avec sa proximité d'Istanbul et son infrastructure en développement, plus régions d'opportunité...",
    "blog.post2.title": "Analyse du Marché Immobilier de Yalova 2026",
    "blog.post2.excerpt": "Prix des appartements à Yalova, rendements locatifs et prévisions du marché pour 2026...",
    "blog.post3.title": "7 Avantages d'Investir dans la Région de Termal",
    "blog.post3.excerpt": "Potentiel touristique de Yalova Termal, tourisme de santé et évaluation immobilière...",
    "blog.readmore": "Lire la Suite",
    "blog.allposts": "Tous les Articles",

    "services.eyebrow": "NOS SERVICES",
    "services.title": "Pourquoi ÜNSAL Immobilier?",
    "services.subtitle": "Conseil immobilier professionnel sous l'assurance Turyap",
    "service1.title": "Assurance Turyap",
    "service1.text": "Service professionnel sous la marque immobilière la plus fiable de Turquie",
    "service2.title": "Expertise Locale",
    "service2.text": "Équipe expérimentée connaissant chaque coin de Yalova",
    "service3.title": "Service en 5 Langues",
    "service3.text": "Support client international en TR, EN, FR, DE, RU",
    "service4.title": "Support 24/7",
    "service4.text": "Conseil joignable à tout moment via WhatsApp et téléphone",

    "homecta.title": "Trouvons Votre Propriété de Rêve",
    "homecta.subtitle": "Contactez-nous pour une consultation gratuite. Laissez-nous vous proposer les meilleures options.",
    "homecta.call": "APPELEZ: +90 507 518 84 82",
    "homecta.wa": "WHATSAPP",

    "footer.about": "Conseil immobilier de confiance à Yalova. Service professionnel sous l'assurance Turyap.",
    "footer.quick": "Liens Rapides",
    "footer.regions": "Régions",
    "footer.contact": "Contact",
    "footer.copyright": "© 2026 ÜNSAL Immobilier. Tous droits réservés. • İsmail Ünsal",

    "sug.cinarcik": "Appartements à vendre à Çınarcık",
    "sug.termal": "Locations de villa à Termal",
    "sug.akkoy": "Terrain d'investissement à Akköy",
    "sug.merkez": "Locations 2+1 centre-ville",
    "sug.esyali": "Appartements meublés à louer",
    "sug.deniz": "Biens vue mer à vendre",
    "sug.mustakil": "Maison individuelle avec jardin",
    "sug.havuzlu": "Villa de luxe avec piscine"
  },

  de: {
    "topbar.location": "Yalova, Türkei",
    "topbar.hours": "Mo-Sa: 09:00 - 19:00",

    "nav.satilik": "VERKAUF",
    "nav.kiralik": "MIETE",
    "nav.arsa": "GRUNDSTÜCK",
    "nav.luks": "LUXUS",
    "nav.luks.badge": "NEU",
    "nav.blog": "BLOG",
    "nav.hakkimizda": "ÜBER UNS",
    "nav.iletisim": "KONTAKT",
    "nav.cta": "ANRUFEN",

    "hero.eyebrow": "YALOVAS VERTRAUENSWÜRDIGE IMMOBILIENMARKE",
    "hero.title.part1": "Finden Sie Ihre Traum",
    "hero.title.highlight": "Immobilie",
    "hero.title.part2": "in Yalova",
    "hero.subtitle": "Verkauf, Miete, Grundstücke, Villen — alles an einem Ort. Finden Sie mit smarter Suche in Sekunden, was Sie suchen.",

    "search.all": "ALLE",
    "search.satilik": "VERKAUF",
    "search.kiralik": "MIETE",
    "search.arsa": "GRUNDSTÜCK",
    "search.placeholder": "Çınarcık, Wohnung, Meerblick, Grundstück...",
    "search.button": "SUCHEN",
    "search.ai.hint": "Smarte Suche — schreiben Sie in natürlicher Sprache, finden Sie sofort",
    "search.popular": "🔥 BELIEBTE SUCHEN",

    "cat.eyebrow": "KATEGORIEN",
    "cat.title.all": "Alle Kategorien",
    "cat.subtitle.all": "Immobilienoptionen aus jedem Bezirk von Yalova",
    "cat.title.satilik": "Immobilien zum Verkauf",
    "cat.subtitle.satilik": "Beste Kaufgelegenheiten",
    "cat.title.kiralik": "Immobilien zur Miete",
    "cat.subtitle.kiralik": "Miet-Wohnungen, Häuser, Villen",
    "cat.title.arsa": "Grundstücks-Investitionsmöglichkeiten",
    "cat.subtitle.arsa": "Bauland mit Meerblick zur Investition",

    "cat.filter.showing": "Kategorien angezeigt",
    "cat.filter.total": "Insgesamt",
    "cat.filter.activelisting": "aktive Inserate",
    "cat.search.results": "Ergebnisse für",
    "cat.search.matching": "Kategorien passend zu Ihrer Suche",

    "card.satilik.daire.title": "Wohnungen zum Verkauf in Yalova",
    "card.satilik.daire.count": "87 aktive Inserate",
    "card.kiralik.daire.title": "Wohnungen zur Miete in Yalova",
    "card.kiralik.daire.count": "42 aktive Inserate",
    "card.satilik.arsa.title": "Grundstücke in Yalova zu Verkaufen",
    "card.satilik.arsa.count": "23 aktive Inserate",
    "card.satilik.arsa.tag": "Investitionsmöglichkeiten",
    "card.kiralik.villa.title": "Villen zur Miete in Yalova",
    "card.kiralik.villa.count": "15 aktive Inserate",
    "card.kiralik.villa.tag": "Pool, Meerblick",
    "card.satilik.ev.title": "Häuser zum Verkauf in Yalova",
    "card.satilik.ev.count": "31 aktive Inserate",
    "card.esyali.kiralik.title": "Möblierte Mietobjekte in Yalova",
    "card.esyali.kiralik.count": "18 aktive Inserate",
    "card.merkez.kiralik.title": "Stadtzentrum Mietwohnungen",
    "card.merkez.kiralik.count": "22 aktive Inserate",
    "card.kiralik.ev.title": "Häuser zur Miete in Yalova",
    "card.kiralik.ev.count": "14 aktive Inserate",
    "card.cta": "Inserate Anzeigen",

    "tag.popular": "AM BELIEBTESTEN",
    "tag.popular2": "BELIEBT",
    "tag.vip": "💎 VIP",
    "tag.luxury": "💎 LUXUS",
    "type.satilik": "VERKAUF",
    "type.kiralik": "MIETE",

    "noresults.title": "Keine Ergebnisse gefunden",
    "noresults.text": "Keine Kategorien passen zu Ihrer Suche. Setzen Sie die Filter zurück und versuchen Sie es erneut.",
    "noresults.button": "Filter Zurücksetzen",

    "featured.tag": "💎 SONDERANGEBOT",
    "featured.price.label": "Akköy, Yalova • Wohngebiet",
    "featured.location": "AKKÖY, YALOVA",
    "featured.title": "Meerblick 435 m² Investitionsgrundstück",
    "featured.description": "Einzigartige Grundstücksmöglichkeit in der sich entwickelnden Akköy-Region, nahe Istanbul, mit Meerblick und Wohngebietszonierung. Mit 0,30 Geschossflächenzahl ideal für Villa- oder Aparthotel-Projekte. Sichern Sie Ihre Investition mit professioneller Beratung.",
    "featured.stat.area": "FLÄCHE",
    "featured.stat.emsal": "GFZ",
    "featured.stat.imar": "ZONIERUNG",
    "featured.stat.imar.value": "Wohngebiet",
    "featured.stat.parsel": "BLOCK/PARZELLE",
    "featured.cta.details": "DETAILS ANSEHEN",
    "featured.cta.info": "INFO ERHALTEN",

    "blog.eyebrow": "BLOG & RATGEBER",
    "blog.title": "Investitionsratgeber & Marktanalysen",
    "blog.subtitle": "Expertenmeinungen und Investitionsberatung zum Immobilienmarkt Yalova",
    "blog.tag.vip": "💎 VIP RATGEBER",
    "blog.tag.analysis": "MARKTANALYSE",
    "blog.tag.region": "💎 REGIONALER RATGEBER",
    "blog.coming": "Demnächst",
    "blog.read": "Min. Lesezeit",
    "blog.post1.title": "Yalova Grundstücksinvestitions-Ratgeber 2026",
    "blog.post1.excerpt": "Vorteile von Grundstücksinvestitionen in Yalova mit der Nähe zu Istanbul und sich entwickelnder Infrastruktur, plus Chancenregionen...",
    "blog.post2.title": "Yalova Immobilienmarkt-Analyse 2026",
    "blog.post2.excerpt": "Wohnungspreise in Yalova, Mietrenditen und Marktprognosen für 2026...",
    "blog.post3.title": "7 Vorteile einer Investition in der Termal-Region",
    "blog.post3.excerpt": "Yalova Termals Tourismuspotenzial, Gesundheitstourismus und Immobilienbewertung...",
    "blog.readmore": "Weiterlesen",
    "blog.allposts": "Alle Blog-Beiträge",

    "services.eyebrow": "UNSERE DIENSTE",
    "services.title": "Warum ÜNSAL Immobilien?",
    "services.subtitle": "Professionelle Immobilienberatung unter Turyap-Sicherung",
    "service1.title": "Turyap-Sicherung",
    "service1.text": "Professioneller Service unter der vertrauenswürdigsten Immobilienmarke der Türkei",
    "service2.title": "Lokale Expertise",
    "service2.text": "Erfahrenes Team, das jede Ecke von Yalova kennt",
    "service3.title": "Service in 5 Sprachen",
    "service3.text": "Internationaler Kundensupport in TR, EN, FR, DE, RU",
    "service4.title": "24/7 Support",
    "service4.text": "Beratung jederzeit über WhatsApp und Telefon erreichbar",

    "homecta.title": "Lassen Sie Uns Ihre Traumimmobilie Finden",
    "homecta.subtitle": "Kontaktieren Sie uns jetzt für eine kostenlose Beratung. Lassen Sie uns Ihnen die besten Optionen anbieten.",
    "homecta.call": "JETZT ANRUFEN: +90 507 518 84 82",
    "homecta.wa": "WHATSAPP",

    "footer.about": "Vertrauenswürdige Immobilienberatung in Yalova. Professioneller Service unter Turyap-Sicherung.",
    "footer.quick": "Schnellzugriff",
    "footer.regions": "Regionen",
    "footer.contact": "Kontakt",
    "footer.copyright": "© 2026 ÜNSAL Immobilien. Alle Rechte vorbehalten. • İsmail Ünsal",

    "sug.cinarcik": "Çınarcık Wohnungen zum Verkauf",
    "sug.termal": "Termal Villa Vermietungen",
    "sug.akkoy": "Akköy Investitionsgrundstück",
    "sug.merkez": "Stadtzentrum 2+1 Vermietungen",
    "sug.esyali": "Möblierte Wohnungen zur Miete",
    "sug.deniz": "Meerblick Immobilien zum Verkauf",
    "sug.mustakil": "Einfamilienhaus mit Garten",
    "sug.havuzlu": "Luxusvilla mit Pool"
  },

  ru: {
    "topbar.location": "Ялова, Турция",
    "topbar.hours": "Пн-Сб: 09:00 - 19:00",

    "nav.satilik": "ПРОДАЖА",
    "nav.kiralik": "АРЕНДА",
    "nav.arsa": "УЧАСТОК",
    "nav.luks": "ЛЮКС",
    "nav.luks.badge": "НОВЫЙ",
    "nav.blog": "БЛОГ",
    "nav.hakkimizda": "О НАС",
    "nav.iletisim": "КОНТАКТЫ",
    "nav.cta": "ПОЗВОНИТЬ",

    "hero.eyebrow": "НАДЕЖНЫЙ БРЕНД НЕДВИЖИМОСТИ ЯЛОВЫ",
    "hero.title.part1": "Найдите Свою",
    "hero.title.highlight": "Недвижимость",
    "hero.title.part2": "Мечты в Ялове",
    "hero.subtitle": "Продажа, аренда, участки, виллы — все в одном месте. Найдите то, что ищете за секунды с умным поиском.",

    "search.all": "ВСЕ",
    "search.satilik": "ПРОДАЖА",
    "search.kiralik": "АРЕНДА",
    "search.arsa": "УЧАСТОК",
    "search.placeholder": "Чинарджик, квартира, вид на море, участок...",
    "search.button": "ПОИСК",
    "search.ai.hint": "Умный поиск — пишите на естественном языке, находите мгновенно",
    "search.popular": "🔥 ПОПУЛЯРНЫЕ ПОИСКИ",

    "cat.eyebrow": "КАТЕГОРИИ",
    "cat.title.all": "Все Категории",
    "cat.subtitle.all": "Варианты недвижимости из каждого района Яловы",
    "cat.title.satilik": "Недвижимость на Продажу",
    "cat.subtitle.satilik": "Лучшие возможности для покупки",
    "cat.title.kiralik": "Недвижимость в Аренду",
    "cat.subtitle.kiralik": "Аренда квартир, домов, вилл",
    "cat.title.arsa": "Инвестиционные Возможности в Землю",
    "cat.subtitle.arsa": "Земельные участки с видом на море для инвестиций",

    "cat.filter.showing": "категорий показано",
    "cat.filter.total": "Всего",
    "cat.filter.activelisting": "активных объявлений",
    "cat.search.results": "результаты для",
    "cat.search.matching": "Категории, соответствующие вашему поиску",

    "card.satilik.daire.title": "Квартиры на Продажу в Ялове",
    "card.satilik.daire.count": "87 активных объявлений",
    "card.kiralik.daire.title": "Квартиры в Аренду в Ялове",
    "card.kiralik.daire.count": "42 активных объявлений",
    "card.satilik.arsa.title": "Земельные Участки на Продажу в Ялове",
    "card.satilik.arsa.count": "23 активных объявлений",
    "card.satilik.arsa.tag": "Инвестиционные возможности",
    "card.kiralik.villa.title": "Виллы в Аренду в Ялове",
    "card.kiralik.villa.count": "15 активных объявлений",
    "card.kiralik.villa.tag": "Бассейн, вид на море",
    "card.satilik.ev.title": "Дома на Продажу в Ялове",
    "card.satilik.ev.count": "31 активных объявлений",
    "card.esyali.kiralik.title": "Меблированная Аренда в Ялове",
    "card.esyali.kiralik.count": "18 активных объявлений",
    "card.merkez.kiralik.title": "Аренда в Центре",
    "card.merkez.kiralik.count": "22 активных объявлений",
    "card.kiralik.ev.title": "Дома в Аренду в Ялове",
    "card.kiralik.ev.count": "14 активных объявлений",
    "card.cta": "Смотреть Объявления",

    "tag.popular": "САМЫЙ ПОПУЛЯРНЫЙ",
    "tag.popular2": "ПОПУЛЯРНЫЙ",
    "tag.vip": "💎 VIP",
    "tag.luxury": "💎 ЛЮКС",
    "type.satilik": "ПРОДАЖА",
    "type.kiralik": "АРЕНДА",

    "noresults.title": "Результаты не найдены",
    "noresults.text": "Нет категорий, соответствующих вашему поиску. Сбросьте фильтры и попробуйте снова.",
    "noresults.button": "Сбросить Фильтры",

    "featured.tag": "💎 СПЕЦИАЛЬНОЕ ПРЕДЛОЖЕНИЕ",
    "featured.price.label": "Акёй, Ялова • Жилая Зона",
    "featured.location": "АКЁЙ, ЯЛОВА",
    "featured.title": "Инвестиционный Участок 435 м² с Видом на Море",
    "featured.description": "Уникальная возможность приобретения земли в развивающемся районе Акёй, недалеко от Стамбула, с видом на море и жилым зонированием. С коэффициентом 0.30, идеально подходит для виллы или апарт-отеля. Защитите свои инвестиции с профессиональной консультацией.",
    "featured.stat.area": "ПЛОЩАДЬ",
    "featured.stat.emsal": "КИЗ",
    "featured.stat.imar": "ЗОНИРОВАНИЕ",
    "featured.stat.imar.value": "Жилое",
    "featured.stat.parsel": "БЛОК/УЧАСТОК",
    "featured.cta.details": "ПОДРОБНЕЕ",
    "featured.cta.info": "УЗНАТЬ",

    "blog.eyebrow": "БЛОГ И ГИД",
    "blog.title": "Инвестиционные Гиды и Анализ Рынка",
    "blog.subtitle": "Экспертные мнения и инвестиционные советы по рынку недвижимости Яловы",
    "blog.tag.vip": "💎 VIP ГИД",
    "blog.tag.analysis": "АНАЛИЗ РЫНКА",
    "blog.tag.region": "💎 РЕГИОНАЛЬНЫЙ ГИД",
    "blog.coming": "Скоро",
    "blog.read": "мин чтения",
    "blog.post1.title": "Гид по Инвестициям в Землю Ялова 2026",
    "blog.post1.excerpt": "Преимущества инвестиций в землю в Ялове благодаря близости к Стамбулу и развивающейся инфраструктуре, плюс перспективные регионы...",
    "blog.post2.title": "Анализ Рынка Недвижимости Ялова 2026",
    "blog.post2.excerpt": "Цены на квартиры в Ялове, доходность аренды и прогнозы рынка на 2026 год...",
    "blog.post3.title": "7 Преимуществ Инвестиций в Регионе Термал",
    "blog.post3.excerpt": "Туристический потенциал Ялова Термал, медицинский туризм и оценка недвижимости...",
    "blog.readmore": "Читать Далее",
    "blog.allposts": "Все Статьи Блога",

    "services.eyebrow": "НАШИ УСЛУГИ",
    "services.title": "Почему ÜNSAL Недвижимость?",
    "services.subtitle": "Профессиональные консультации по недвижимости под гарантией Turyap",
    "service1.title": "Гарантия Turyap",
    "service1.text": "Профессиональный сервис под самым надежным брендом недвижимости Турции",
    "service2.title": "Местная Экспертиза",
    "service2.text": "Опытная команда, знающая каждый уголок Яловы",
    "service3.title": "Обслуживание на 5 Языках",
    "service3.text": "Международная поддержка клиентов на TR, EN, FR, DE, RU",
    "service4.title": "Поддержка 24/7",
    "service4.text": "Консультации доступны в любое время через WhatsApp и телефон",

    "homecta.title": "Давайте Найдем Вашу Идеальную Недвижимость",
    "homecta.subtitle": "Свяжитесь с нами для бесплатной консультации. Предложим вам наилучшие варианты.",
    "homecta.call": "ПОЗВОНИТЬ: +90 507 518 84 82",
    "homecta.wa": "WHATSAPP",

    "footer.about": "Надежные консультации по недвижимости в Ялове. Профессиональный сервис под гарантией Turyap.",
    "footer.quick": "Быстрые Ссылки",
    "footer.regions": "Регионы",
    "footer.contact": "Контакты",
    "footer.copyright": "© 2026 ÜNSAL Недвижимость. Все права защищены. • İsmail Ünsal",

    "sug.cinarcik": "Чинарджик квартиры на продажу",
    "sug.termal": "Аренда виллы в Термале",
    "sug.akkoy": "Инвестиционный участок Акёй",
    "sug.merkez": "Аренда 2+1 в центре",
    "sug.esyali": "Меблированные квартиры в аренду",
    "sug.deniz": "Недвижимость с видом на море",
    "sug.mustakil": "Отдельный дом с садом",
    "sug.havuzlu": "Люкс вилла с бассейном"
  }
};

// ==========================================
// ÇEVİRİ MOTORU
// ==========================================

// AKILLI DİL TESPİTİ: Önce URL'den, sonra localStorage'dan, son çare TR
function detectLangFromURL() {
  const path = window.location.pathname;
  if (path.includes('/en/')) return 'en';
  if (path.includes('/fr/')) return 'fr';
  if (path.includes('/de/')) return 'de';
  if (path.includes('/ru/')) return 'ru';
  return null;
}

const urlLang = detectLangFromURL();
let currentLang = urlLang || localStorage.getItem('ungLang') || 'tr';
// URL'de dil varsa localStorage'a da yaz (sonraki ziyaretler için)
if (urlLang) localStorage.setItem('ungLang', urlLang);

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('ungLang', lang);

  // Tüm data-i18n elementleri güncelle
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = translations[lang][key];
    if (translation) el.textContent = translation;
  });

  // data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = translations[lang][key];
    if (translation) el.setAttribute('placeholder', translation);
  });

  // data-i18n-html (HTML içeren çeviriler için)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const translation = translations[lang][key];
    if (translation) el.innerHTML = translation;
  });

  // HTML lang attribute güncelle
  document.documentElement.lang = lang;

  // Dil switcher UI güncelle
  updateLanguageSwitcher(lang);

  // Custom event tetikle (filter sistemi vs için)
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function updateLanguageSwitcher(lang) {
  const langCodes = { tr: 'TR', en: 'EN', fr: 'FR', de: 'DE', ru: 'RU' };
  const langCodeEl = document.getElementById('currentLang');
  if (langCodeEl) langCodeEl.textContent = langCodes[lang];

  // Bayrak güncelle
  const flagSVGs = {
    tr: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#E30A17"/><circle cx="22" cy="20" r="8" fill="#fff"/><circle cx="24" cy="20" r="6.4" fill="#E30A17"/><polygon fill="#fff" points="32,20 28.5,21.1 30.7,18.2 30.7,21.8 28.5,18.9"/></svg>',
    en: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" stroke-width="3"/><path d="M30,0 V40 M0,20 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V40 M0,20 H60" stroke="#C8102E" stroke-width="6"/></svg>',
    fr: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ED2939"/></svg>',
    de: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#000"/><rect width="60" height="13.33" y="13.33" fill="#DD0000"/><rect width="60" height="13.34" y="26.66" fill="#FFCE00"/></svg>',
    ru: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="13.33" y="0" fill="#fff"/><rect width="60" height="13.33" y="13.33" fill="#0039A6"/><rect width="60" height="13.34" y="26.66" fill="#D52B1E"/></svg>'
  };

  const currentFlagEl = document.getElementById('currentFlag');
  if (currentFlagEl) currentFlagEl.innerHTML = flagSVGs[lang];

  // Active state güncelle
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
  });
}

// Dil seçici event listener
document.addEventListener('DOMContentLoaded', () => {
  // İlk dili yükle
  setLanguage(currentLang);

  // Dropdown toggle
  const langSwitcher = document.getElementById('langSwitcher');
  if (langSwitcher) {
    const langCurrent = langSwitcher.querySelector('.lang-current');
    if (langCurrent) {
      langCurrent.addEventListener('click', (e) => {
        e.stopPropagation();
        langSwitcher.classList.toggle('active');
      });
    }
  }

  // Dil seçenekleri
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = opt.getAttribute('data-lang');
      setLanguage(lang);
      if (langSwitcher) langSwitcher.classList.remove('active');
    });
  });

  // Dışarı tıklayınca dropdown kapansın
  document.addEventListener('click', (e) => {
    if (langSwitcher && !langSwitcher.contains(e.target)) {
      langSwitcher.classList.remove('active');
    }
  });
});

// Translations'a erişim için global
window.translations = translations;
window.setLanguage = setLanguage;
window.getCurrentLang = () => currentLang;
window.t = (key) => (translations[currentLang] && translations[currentLang][key]) || key;
