/**
 * ============================================
 * YALOVA EMLAK FAQ - SEO OPTIMIZED
 * İsmail Ünsal Gayrimenkul
 * ============================================
 *
 * Kullanım:
 *   <div id="faqContainer" data-faq-category="arsa"></div>
 *   <script src="/faq-yalova-emlak.js"></script>
 *
 * Otomatik olarak:
 * - Google için JSON-LD FAQPage schema ekler
 * - Accordion FAQ UI render eder
 * - Kategoriye göre uygun soruları gösterir
 */

(function() {
  'use strict';

  // ==================== YALOVA EMLAK FAQ VERİTABANI ====================
  const FAQS = {
    // GENEL - Her sayfada gösterilebilir
    genel: [
      {
        q: 'Yalova\'da gayrimenkul yatırımı yapmak mantıklı mı?',
        a: 'Yalova, İstanbul\'a 1 saat mesafede olması, gelişen altyapısı, deniz manzarası ve termal turizm potansiyeli sayesinde Türkiye\'nin en hızlı büyüyen yatırım bölgelerinden biridir. Son 5 yılda Yalova gayrimenkul fiyatları ortalama %180-220 arasında değer kazanmıştır. Özellikle Çınarcık, Termal ve Altınova bölgeleri yatırımcıların gözdesi konumundadır. İstanbul\'dan yapılan 1 saatlik feribot ulaşımı ve İstanbul-İzmir otoyolu bağlantısı bölgeyi cazip kılıyor.'
      },
      {
        q: 'Yalova\'nın hangi ilçesinde ev almalıyım?',
        a: 'Tercih ettiğiniz yaşam tarzına bağlıdır: Merkez, tüm imkanlara yakınlığı ile aileler için idealdir. Çınarcık, deniz manzarası ve dinlenme için popülerdir. Termal, kaplıca turizmi ve doğa hayatı arayanlar için harika bir seçenektir. Altınova, otoyola yakınlığı ve gelişen sanayi bölgesi ile yatırımcılar için avantajlıdır. Armutlu, sakin bir yaşam ve deniz kıyısı için tercih edilmektedir.'
      },
      {
        q: 'Yalova\'da ev fiyatları ne kadar?',
        a: 'Yalova\'da 2+1 daireler merkez konumda 2.500.000 ₺ ile 5.000.000 ₺ arasında değişmektedir. Deniz manzaralı 3+1 daireler 4.000.000 ₺ - 8.000.000 ₺ bandında bulunmaktadır. Villa fiyatları konum ve özelliklere göre 8.000.000 ₺ ile 25.000.000 ₺ arasında seyretmektedir. Termal bölgesinde yazlıklar 3.000.000 ₺ - 7.000.000 ₺, arsalar ise m² başına 2.500 ₺ - 15.000 ₺ arasındadır. Güncel fiyatlar için ilan sayfalarımızı ziyaret edebilirsiniz.'
      },
      {
        q: 'Yalova\'da tapu işlemleri nasıl yürüyor?',
        a: 'Yalova\'da tapu işlemleri Yalova Tapu Müdürlüğü\'nde yapılır. Alıcı ve satıcı kimlik, tapu senedi, DASK sigortası, emlak beyan değeri ile başvurur. İşlem süresi ortalama 3-5 iş günüdür. Yabancı uyruklu alıcılar için ek belgeler gereklidir. TURYAP Yetkili Danışmanı olarak biz süreç boyunca yanınızdayız ve tüm işlemleri sizin adınıza takip ediyoruz. Alım-satım işlemlerinde noter, tapu harcı, emlak vergisi ödemeleri hakkında detaylı bilgilendirme yapıyoruz.'
      },
      {
        q: 'İsmail Ünsal Gayrimenkul ile nasıl iletişime geçebilirim?',
        a: 'Bizimle 0507 518 84 82 numaralı telefondan Pazartesi-Cumartesi 09:00-19:00 arasında iletişime geçebilirsiniz. Ayrıca WhatsApp üzerinden mesaj bırakabilir, sitemizden iletişim formunu doldurabilir veya Yalova\'daki ofisimizi ziyaret edebilirsiniz. TURYAP Yetkili Danışmanı olarak 20+ yıllık tecrübemizle Yalova\'nın her bölgesinde size en uygun gayrimenkulü bulmanız için hizmetinizdeyiz.'
      }
    ],

    // ARSA & TARLA
    arsa: [
      {
        q: 'Yalova\'da imarlı arsa fiyatları ne kadar?',
        a: 'Yalova\'da konut imarlı arsalar bölgeye göre m² başına 3.000 ₺ ile 15.000 ₺ arasında değişmektedir. Çınarcık ve Merkez\'de konut imarlı arsalar ortalama 5.000-10.000 ₺/m², Termal ve Armutlu\'da 3.000-7.000 ₺/m², Altınova ticari imarlı arsalar 6.000-12.000 ₺/m² bandındadır. Tarım arazileri ise m² başına 500 ₺ - 2.500 ₺ arasında bulunabilmektedir. Sahile yakın ve manzaralı arsalar prim yapmaktadır.'
      },
      {
        q: 'Yalova\'da arsa alırken nelere dikkat etmeliyim?',
        a: 'Arsa alırken şu kontrolleri yapmanız çok önemlidir: 1) İmar durumu (konut imarlı, ticari imarlı, tarla?), 2) Emsal ve gabari (kaç kat inşaat yapılabilir), 3) Ada/parsel bilgileri ve tapu kaydı, 4) Yol cephesi ve genişliği, 5) Elektrik-su-doğalgaz altyapısı, 6) Deprem bölgesi risk durumu, 7) Kadastro ölçümü, 8) Üzerinde ipotek/haciz kaydı var mı, 9) Yapı yasağı bölgesinde mi (SİT, orman, tarım koruma), 10) Zemin etüdü. TURYAP olarak tüm bu kontrolleri size ücretsiz raporluyoruz.'
      },
      {
        q: 'Yalova\'da arsaya ev yapabilir miyim?',
        a: 'Arsanız konut imarlı ise, belediyeden ruhsat alarak ev yapabilirsiniz. Emsal oranı (0.30, 0.60 gibi) arsanızın kaç m² kısmına ev yapabileceğinizi belirler. Örneğin 1000 m² arsanız ve 0.30 emsal varsa, 300 m² taban alanlı yapı inşa edebilirsiniz. Ayrıca gabari (yükseklik) sınırı ve çekme mesafeleri de vardır. Yalova Belediyesi\'nden imar durumu belgesi almak ilk adımdır. Tarla vasfındaki arsalarda ise sadece bahçe kulübesi tipi yapılar (max 90 m²) yapılabilir.'
      },
      {
        q: 'Yalova\'da tarım arazisi almak avantajlı mı?',
        a: 'Yalova\'da tarım arazileri konut arsalarına göre çok daha uygun fiyatlıdır (m² başına 500-2.500 ₺). Uzun vadede tarım arazilerinin bir kısmı imara açılabilir ve büyük değer kazanabilir. Zeytin, kivi, meyve bahçesi yatırımı yapabilir, hem gelir elde eder hem toprağın kıymetini korursunuz. Ancak 2018 sonrası tarım arazilerinde bölünme kısıtları vardır — minimum satış parseli genellikle 5.000 m²\'dir. Ayrıca sadece çiftçi belgesi olanlara satış yapılabilme kısıtı bazı bölgelerde uygulanabilir.'
      },
      {
        q: 'Çınarcık\'ta arsa yatırımı için hangi bölgeler avantajlı?',
        a: 'Çınarcık\'ta Şenköy, Koru, Ortaburun ve Kocadere bölgeleri hem deniz manzarası hem de gelişim potansiyeli açısından yatırımcıların ilk tercihi. Şenköy merkeze yakınlığı, Koru sakin doğal yapısı, Ortaburun panoramik manzarası, Kocadere ise sahile yürüme mesafesi ile öne çıkıyor. Son 3 yılda Çınarcık arsa fiyatları %150 civarında değerlendi. TURYAP olarak bu bölgelerde imarlı, tapulu, sorunsuz arsalar sunuyoruz.'
      }
    ],

    // DAİRE
    daire: [
      {
        q: 'Yalova\'da satılık daire ararken nelere dikkat etmeliyim?',
        a: 'Daire alırken şunlara mutlaka dikkat edin: 1) Deprem yönetmeliğine uygunluk (2018 sonrası yapılar tercih edilmeli), 2) İskan (yapı kullanım izin belgesi), 3) Kat mülkiyeti durumu, 4) Aidat miktarı ve site yönetimi, 5) Isıtma sistemi (kombi mi, merkezi mi), 6) Manzara ve gün ışığı, 7) Otopark durumu, 8) Asansör ve güvenlik, 9) Ulaşım imkanları (dolmuş, minibüs), 10) Yakındaki okul, market, hastane. Yalova\'da özellikle deniz manzaralı, güneş alan, 2018 sonrası binalar daha çok tercih edilmektedir.'
      },
      {
        q: 'Yalova merkez daire fiyatları ne kadar?',
        a: 'Yalova merkez\'de 2+1 daireler yaklaşık 2.500.000 ₺ - 4.500.000 ₺, 3+1 daireler 3.500.000 ₺ - 6.500.000 ₺ arasındadır. Deniz manzaralı, yeni yapı, siteli daireler daha yüksek fiyatlıdır. Rüstem Paşa, Kazım Karabekir, Süleyman Bey mahalleleri en popüler bölgelerdir. Fiyatlar bina yaşı, kat, manzara ve site özelliklerine göre değişir. Güncel fiyatlar için ilan sayfamızı ziyaret edebilirsiniz.'
      },
      {
        q: 'Kiraya vermek için Yalova\'da hangi daireyi almalıyım?',
        a: 'Yatırımlık daire için: 1) Merkez konumda 2+1 daireler en hızlı kiraya verilen tiplerdir, 2) Aylık kira getirisi 12.000-20.000 ₺ arasındadır, 3) Yıllık kira getirisi/satış fiyatı oranı (kira çarpanı) %4-6 seviyesindedir, 4) Öğrenci ve genç profesyonel bölgeleri (Yalova Üniversitesi çevresi) tercih edilebilir, 5) Deniz manzaralı daireler yazlık kiralamaya (Airbnb) uygundur. Yalova\'da özellikle yaz dönemi kiralama gelirleri 3-4 katına çıkabilmektedir.'
      },
      {
        q: 'Yalova\'da yeni yapı daire projeleri hangileri?',
        a: 'Yalova\'da son yıllarda birçok kaliteli konut projesi hayata geçti: Merkez\'de deniz manzaralı residence projeleri, Çınarcık\'ta lüks site projeleri, Termal\'de doğa içinde villa siteleri bulunuyor. Yeni yapılar 2018 sonrası deprem yönetmeliği ile inşa edildiği için daha güvenlidir. İskân alınmış, tapu hazır projelerde satın alma süreci hızlıdır. Detaylı proje bilgileri için bizimle iletişime geçebilirsiniz.'
      }
    ],

    // VİLLA
    villa: [
      {
        q: 'Yalova\'da villa fiyatları ne kadar?',
        a: 'Yalova\'da villa fiyatları konum, arsa büyüklüğü, iç m² ve özelliklere göre 6.000.000 ₺ - 30.000.000 ₺ arasında değişmektedir. Çınarcık ve Termal\'de deniz/orman manzaralı villalar 8-15 milyon ₺, havuzlu-bahçeli lüks villalar 15-25 milyon ₺, ultra lüks özel projeler 25-30+ milyon ₺ bandındadır. Villa ararken arsa m², iç m², oda sayısı, havuz-jakuzi, güvenlik, manzara kriterlerini değerlendirmelisiniz.'
      },
      {
        q: 'Termal\'de villa almak avantajlı mı?',
        a: 'Termal, Yalova\'nın en prestijli bölgelerinden biridir ve villa yatırımı için mükemmel bir tercihtir. Kaplıca sularına yakınlık, doğa manzarası, sessiz yaşam ve İstanbul yakınlığı sayesinde villa fiyatları düzenli değer kazanmaktadır. Termal\'de villalar hem yazlık hem daimi yaşam için ideal olup, kısa dönem kiralama (Airbnb, Booking) ile yüksek getiri elde etme fırsatı sunar. Yaz sezonu haftalık 25.000-50.000 ₺ kiralama bedelleri görülmektedir.'
      },
      {
        q: 'Villa alırken nelere dikkat etmeliyim?',
        a: 'Villa satın alırken önemli kontroller: 1) Arsa tapusu (müstakil tapu tercih edin), 2) İskan belgesi, 3) İnşaat kalitesi ve deprem dayanımı, 4) Bahçe ve havuz alanı, 5) Otopark ve güvenlik, 6) Isınma sistemi (yerden ısıtma, doğalgaz), 7) Su ve elektrik altyapısı, 8) Villa çevresindeki gelişim planları, 9) Kadastro ölçümleri, 10) Vergiler ve harcamalar. TURYAP olarak size özel villa turlarına eşlik ediyor, tüm kontrolleri sizin adınıza yapıyoruz.'
      }
    ],

    // KİRALIK
    kiralik: [
      {
        q: 'Yalova\'da kiralık daire fiyatları ne kadar?',
        a: 'Yalova\'da kiralık daire fiyatları konum ve özelliklere göre değişir. Merkez\'de 1+1 daireler 8.000-12.000 ₺, 2+1 daireler 12.000-20.000 ₺, 3+1 daireler 18.000-30.000 ₺ arasındadır. Deniz manzaralı, siteli, yeni yapı daireler daha yüksek fiyatlarla kiraya verilmektedir. Çınarcık ve Termal\'de yazlık kısa dönem kiralamalar (haftalık/aylık) genellikle daha yüksek getiri sağlar. Kiracı olarak depozito, hava parası, komisyon konularında bilgi almak için bize danışabilirsiniz.'
      },
      {
        q: 'Yalova\'da yazlık kiralamak mı satın almak mı avantajlı?',
        a: 'Kısa süre (1-2 yıl) kullanacaksanız kiralamak, uzun vadede (5+ yıl) yatırım yapacaksanız satın almak daha mantıklıdır. Yalova\'da yazlık daireler yıllık %5-8 kira getirisi sağlar. Uzun vadede fiyat artışı da dikkate alındığında satın alma daha karlıdır. Ayrıca kendi mülkünüzde konfor ve özgürlük vardır. Sadece belirli dönemler kullanacaksanız kiralama uygun olabilir. Amacınıza ve bütçenize göre size en uygun seçeneği belirlemek için bizden danışmanlık alabilirsiniz.'
      },
      {
        q: 'Kiralama sözleşmesinde nelere dikkat etmeliyim?',
        a: 'Kiralama sözleşmesinde dikkat edilecek maddeler: 1) Kira başlangıç ve bitiş tarihi, 2) Kira miktarı ve yıllık artış oranı (TÜFE veya sabit), 3) Depozito miktarı (genellikle 1-3 aylık kira), 4) Ödeme yöntemi ve tarihi, 5) Yakıt-elektrik-su faturaları kimin sorumluluğu, 6) Aidat ödemesi, 7) Tadilat ve boyama yetkisi, 8) Ev sahibi ve kiracının yükümlülükleri, 9) Feshin şartları, 10) Kefil durumu. Sözleşmeyi imzalamadan önce mutlaka okuyun ve gerekirse hukuki danışmanlık alın.'
      }
    ],

    // İŞYERİ & TİCARİ
    isyeri: [
      {
        q: 'Yalova\'da işyeri açmak için hangi bölge iyidir?',
        a: 'Yalova\'da işyeri konumu sektöre göre değişir: Perakende ve restaurant için merkez cadde üzeri, Yaz turizmine yönelik işletmeler için Çınarcık ve Termal, Toptan ticaret ve depo için Altınova sanayi bölgesi, Ofis ve hizmet sektörü için Yalova merkez iş hanları tercih edilebilir. Kira fiyatları merkez perakende dükkanlarda m² başına aylık 300-800 ₺ arasında değişmektedir. Bölge analizi ve pazar araştırması için bizden destek alabilirsiniz.'
      },
      {
        q: 'Yalova\'da satılık dükkan fiyatları ne kadar?',
        a: 'Yalova\'da satılık dükkan fiyatları konuma ve alana göre değişir: Merkez cadde üzeri 50-100 m² dükkanlar 5.000.000 ₺ - 15.000.000 ₺, ara sokak dükkanlar 2.000.000 ₺ - 5.000.000 ₺, yeni yapı iş merkezlerindeki mağazalar 3.000.000 ₺ - 10.000.000 ₺ bandındadır. Yatırım için m² başına 40.000-150.000 ₺ arasında dükkan fiyatları görülmektedir. Yıllık kira getirisi ortalama %5-7 seviyesindedir.'
      },
      {
        q: 'Yalova\'da ofis kiralama fiyatları nedir?',
        a: 'Yalova\'da ofis kiralama fiyatları konum ve büyüklüğe göre değişir. Merkez iş hanlarında 40-100 m² ofisler aylık 8.000-20.000 ₺, yeni yapı iş merkezlerinde 15.000-35.000 ₺, prestijli plazalarda 25.000-60.000 ₺ bandında bulunmaktadır. Home-office alternatifi olarak Yalova\'da co-working alanları da mevcuttur. Kiralama öncesi ofisin konumu, ulaşım imkanları, otopark ve teknik altyapı kontrol edilmelidir.'
      }
    ],

    // YATIRIM & FİNANSMAN
    yatirim: [
      {
        q: 'Yalova\'da gayrimenkul kredisi almak mümkün mü?',
        a: 'Evet, Yalova\'daki gayrimenkuller için tüm bankalardan konut kredisi kullanabilirsiniz. Genel kurallar: 1) Ekspertiz değerinin %80\'i kadar kredi verilir, 2) Vade genellikle 10-20 yıl arasındadır, 3) Faiz oranları aylık %2-3.5 civarındadır (piyasa koşullarına göre değişir), 4) Kredi başvurusu için ekspertiz raporu, tapu, iskan belgesi ve gelir belgesi gereklidir, 5) Yabancı uyruklular için özel koşullar geçerlidir. Bankaların Yalova\'daki değerlemeleri farklı olabilir; birkaç bankadan teklif almak avantajlıdır.'
      },
      {
        q: 'Yalova\'da hangi bölgelerde fiyatlar en hızlı artıyor?',
        a: 'Son 3 yılda Yalova\'da en yüksek fiyat artışı gösteren bölgeler: Çınarcık (%150-180), Termal (%140-170), Altınova (%120-160), Yalova Merkez (%110-140), Armutlu (%100-130) civarındadır. Deniz manzaralı bölgeler ve yeni yapı projelerinin bulunduğu alanlar özellikle prim yapıyor. Yalova Üniversitesi çevresi kira geliri açısından, otoyola yakın bölgeler ise arsa yatırımı açısından ön plandadır. TURYAP olarak size bölge analiz raporu ücretsiz sunuyoruz.'
      },
      {
        q: 'Yalova\'da yatırım için ne kadar bütçe gerekiyor?',
        a: 'Yalova\'da yatırım için minimum bütçeler: 1) Arsa yatırımı 500.000 ₺\'den başlar, 2) Küçük 1+1 daire için 1.500.000-2.500.000 ₺ gerekir, 3) Yatırımlık 2+1 daire 2.500.000-4.500.000 ₺ bandındadır, 4) Airbnb için deniz manzaralı yazlık 3.500.000-6.000.000 ₺, 5) Kısa vadeli değer kazanacak arsa 800.000-2.000.000 ₺, 6) Ticari mülk (dükkan) 2.000.000-8.000.000 ₺ arasındadır. Bütçenize ve yatırım hedeflerinize göre size özel plan hazırlıyoruz.'
      }
    ],

    // YABANCI ALICILAR
    yabanci: [
      {
        q: 'Yabancılar Yalova\'da gayrimenkul alabilir mi?',
        a: 'Evet, yabancı uyruklu kişiler Yalova\'da gayrimenkul edinebilir. Türkiye\'de yabancıların en çok tercih ettiği şehirlerden biri olan Yalova, konumu ve fiyat avantajı ile öne çıkmaktadır. Yabancı alıcılar için gereken belgeler: 1) Pasaport, 2) Vergi numarası (T.C. vergi dairesinden alınır), 3) Tapu döner sermaye harcı ödemesi, 4) Askeri bölge sorgulama sertifikası, 5) Deprem sigortası (DASK). Ayrıca 400.000 USD üzeri gayrimenkul yatırımı ile Türk vatandaşlığı başvurusu yapılabilmektedir.'
      },
      {
        q: 'Yalova\'da yabancı için en uygun bölgeler hangileridir?',
        a: 'Yabancı yatırımcılar için Yalova\'da öne çıkan bölgeler: 1) Çınarcık deniz manzaralı daireler ve villalar için popülerdir, 2) Termal kaplıca turizmi arayan Ortadoğulu alıcılar tarafından tercih edilir, 3) Merkez daimi yaşam için hastane, üniversite ve alışveriş imkanlarına yakınlığı ile uygundur, 4) Altınova otoyola yakınlığı ve ticari fırsatlar için avantajlıdır, 5) Armutlu sakin, sahil kesimli yaşam arayanlar için idealdir. Türkçe dahil 6 dilde (Türkçe, İngilizce, Almanca, Fransızca, Rusça, Arapça) danışmanlık hizmeti sunuyoruz.'
      }
    ],

    // BÖLGE REHBERİ
    bolge: [
      {
        q: 'Yalova Çınarcık\'ta yaşamak nasıl?',
        a: 'Çınarcık, deniz kıyısında sakin ve doğal bir yaşam sunar. Marmara Denizi\'ne cephe, temiz hava, İstanbul\'a 1 saat feribotla ulaşım avantajları vardır. Çınarcık\'ta okul, hastane, market ve restoran gibi temel ihtiyaçlar karşılanmaktadır. Yaz aylarında turistik hareketlilik yaşanır, kışın ise oldukça sessizdir. Ortalama nüfusu 20.000 civarındadır ve son yıllarda hızla gelişen bir bölgedir. Ev fiyatları merkeze göre daha uygundur.'
      },
      {
        q: 'Termal ilçesinin özellikleri nelerdir?',
        a: 'Termal, adından da anlaşılacağı gibi kaplıca ve termal su kaynakları ile ünlü bir ilçedir. Yılın 12 ayı ziyaretçi ağırlar. Yeşil doğa, ormanlık alanlar ve tarihi Atatürk Köşkü ile öne çıkar. Yalova merkeze 12 km uzaklıktadır. Termal\'de yaşam sakin, huzurlu ve doğa iç içedir. Bölgede lüks villa siteleri, termal otel ve residence projeleri bulunmaktadır. Emekliler ve sağlık turizmi arayanlar için ideal bir bölgedir.'
      },
      {
        q: 'Altınova sanayi bölgesi olarak nasıl?',
        a: 'Altınova, Yalova\'nın gelişen sanayi ve ticaret bölgesidir. İstanbul-İzmir Otoyolu\'na yakınlığı sayesinde lojistik açısından avantajlıdır. Yalova Otoyol Gişesi buradadır. Bölgede fabrika, depo ve ticari işletmeler bulunmaktadır. Konut fiyatları merkeze göre daha uygundur ve yatırımcılar için değer artışı potansiyeli yüksektir. Altınova ayrıca 15 dakika uzaklıkta Adalar\'a ulaşım sağlayan feribot terminaline de sahiptir.'
      }
    ],

    // HUKUK & VERGİ
    hukuk: [
      {
        q: 'Yalova\'da gayrimenkul alım-satım vergileri nelerdir?',
        a: 'Yalova\'da (ve Türkiye genelinde) gayrimenkul alım-satımında ödenecek vergi ve harçlar: 1) Tapu Harcı: alım-satım bedelinin %4\'ü (alıcı %2 + satıcı %2), 2) DASK zorunlu deprem sigortası (bina için ~500-2.000 ₺/yıl), 3) Damga vergisi (kiralamada), 4) Emlak vergisi (yıllık, belediyeye ödenir; bina/arsa için farklı oran), 5) Değer artış kazancı vergisi (5 yıldan az elde tutup satarsanız kazanç üzerinden %15-40), 6) Noter harcı. Toplam maliyet genellikle alım bedelinin %5-6\'sıdır.'
      },
      {
        q: 'Gayrimenkul satın alırken hangi belgeleri kontrol etmeliyim?',
        a: 'Satın almadan önce mutlaka kontrol edilmesi gereken belgeler: 1) Tapu senedi (güncel ve temiz olmalı, ipotek/haciz kaydı olmamalı), 2) İskan (Yapı Kullanım İzin Belgesi), 3) İmar durumu, 4) Kat mülkiyeti veya kat irtifakı belgesi, 5) DASK sigortası, 6) Emlak vergisi borç yok yazısı, 7) Aidat borç yok yazısı, 8) Elektrik-su-doğalgaz abonelik bilgileri, 9) Belediye emlak beyan değeri, 10) Ölçekli mimari proje ve statik hesap raporu. TURYAP olarak tüm bu belgeleri sizin adınıza inceliyor ve raporluyoruz.'
      }
    ]
  };

  // ==================== FAQ RENDER ====================

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  // Helper: sade, temiz vurgular — sadece kalın + renkli metin
  function highlightKeywords(html) {
    // Fiyat aralıkları ve tek fiyatlar → turuncu bold
    html = html.replace(/(\d{1,3}(?:\.\d{3})+)\s*₺(?!\s*-\s*\d)/g,
      '<strong class="iu-hi-price">$1 ₺</strong>');
    html = html.replace(/(\d{1,3}(?:\.\d{3})+)\s*₺\s*-\s*(\d{1,3}(?:\.\d{3})+)\s*₺/g,
      '<strong class="iu-hi-price">$1 – $2 ₺</strong>');
    // m² fiyatları
    html = html.replace(/(\d[\d.,–\-\s]*)\s*(?:₺|TL)\s*\/\s*m²/g,
      '<strong class="iu-hi-price">$1 ₺/m²</strong>');
    // Yüzdeler → yeşil bold
    html = html.replace(/(%\d+(?:[-–]\d+)?)/g,
      '<strong class="iu-hi-pct">$1</strong>');
    // TURYAP markası → lacivert bold (sade)
    html = html.replace(/\b(TURYAP)\b/g,
      '<strong class="iu-hi-brand">$1</strong>');
    // Bölge/yer isimleri → lacivert bold (sade, ikon yok, pill yok)
    html = html.replace(/\b(Yalova|Çınarcık|Termal|Altınova|Armutlu|Akköy|Merkez)\b/g,
      '<strong class="iu-hi-region">$1</strong>');
    return html;
  }

  // Numaralı liste parse: "1) A, 2) B, 3) C" — parantez içindeki virgülleri korur
  function parseNumberedList(text) {
    const parts = text.split(/,\s*(?=\d+\))/);
    const items = [];
    let intro = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      const m = part.match(/^(\d+)\)\s*(.+)$/s);
      if (m) {
        items.push({ n: m[1], text: m[2].trim().replace(/[.,;\s]+$/, '') });
      } else if (i === 0) {
        intro = part;
      }
    }
    return { intro, items };
  }

  // Cevap metnini güzel formata çevir
  function formatAnswer(text) {
    if (!text) return '';
    const escaped = esc(text);

    // Numaralı liste mi? En az 3 madde varsa
    const firstNumMatch = escaped.match(/(\d+)\)/);
    if (firstNumMatch) {
      const introEnd = firstNumMatch.index;
      const intro = escaped.substring(0, introEnd).trim().replace(/[:.]$/, '');
      const listPart = escaped.substring(introEnd);
      const parsed = parseNumberedList(listPart);
      const items = parsed.items;

      if (items.length >= 3) {
        let html = '<div class="iu-answer">';
        if (intro) {
          html += '<div class="iu-intro-box"><i class="fa-solid fa-lightbulb"></i><p>' +
            highlightKeywords(intro) + '</p></div>';
        }
        html += '<ol class="iu-num-list">';
        items.forEach(it => {
          html += '<li class="iu-num-item">';
          html += '<span class="iu-num-badge">' + esc(it.n) + '</span>';
          html += '<div class="iu-num-text">' + highlightKeywords(it.text) + '</div>';
          html += '</li>';
        });
        html += '</ol>';
        html += '</div>';
        return html;
      }
    }

    // Düz paragraf — highlight uygula
    // Cümlelere göre böl (2'şer cümlelik grup)
    const sentences = escaped.split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/);
    let html = '<div class="iu-answer">';
    if (sentences.length >= 4) {
      for (let i = 0; i < sentences.length; i += 2) {
        const group = sentences.slice(i, i + 2).join(' ');
        html += '<p class="iu-para">' + highlightKeywords(group) + '</p>';
      }
    } else {
      html += '<p class="iu-para">' + highlightKeywords(escaped) + '</p>';
    }
    html += '</div>';
    return html;
  }

  function renderFAQs(container, faqs, options = {}) {
    const title = options.title || 'Sıkça Sorulan Sorular';
    const subtitle = options.subtitle || 'Yalova gayrimenkul hakkında merak ettikleriniz';

    container.innerHTML = `
      <section class="iu-faq-section" style="max-width:900px;margin:80px auto;padding:0 24px;">
        <div style="text-align:center;margin-bottom:48px;">
          <span class="iu-faq-badge notranslate" translate="no" style="display:inline-block;background:rgba(10,42,94,0.06);color:#0A2A5E;border:1.5px solid rgba(10,42,94,0.18);padding:9px 24px 9px 28px;border-radius:999px;font-size:15px;font-weight:800;letter-spacing:4px;text-transform:uppercase;line-height:1;margin-bottom:16px;">FAQ</span>
          <h2 style="font-size:36px;color:#0A2A5E;margin:16px 0 12px;font-weight:800;line-height:1.2;font-family:'League Spartan','Montserrat',sans-serif;">${esc(title)}</h2>
          <p style="color:#6B7280;font-size:16px;max-width:600px;margin:0 auto;">${esc(subtitle)}</p>
        </div>
        <div class="iu-faq-list">
          ${faqs.map((f, i) => `
            <details class="iu-faq-item">
              <summary>
                <span class="iu-faq-q">${esc(f.q)}</span>
                <span class="iu-faq-icon">+</span>
              </summary>
              <div class="iu-faq-a">${formatAnswer(f.a)}</div>
            </details>
          `).join('')}
        </div>
      </section>
      <style>
        .iu-faq-item {
          background: #FFFFFF;
          border-radius: 14px;
          margin-bottom: 14px;
          box-shadow: 0 4px 16px rgba(10, 42, 94, 0.06);
          overflow: hidden;
          border: 1px solid #E5E7EB;
          transition: all 0.3s ease;
        }
        .iu-faq-item:hover {
          box-shadow: 0 8px 24px rgba(10, 42, 94, 0.1);
          border-color: rgba(37,99,235, 0.3);
        }
        .iu-faq-item[open] {
          border-color: #2563EB;
          box-shadow: 0 8px 32px rgba(37,99,235, 0.15);
        }
        .iu-faq-item summary {
          cursor: pointer;
          padding: 22px 26px;
          font-weight: 700;
          color: #0A2A5E;
          font-size: 16px;
          list-style: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          transition: background 0.2s;
        }
        .iu-faq-item summary:hover {
          background: rgba(37,99,235, 0.03);
        }
        .iu-faq-item summary::-webkit-details-marker { display: none; }
        .iu-faq-item summary::marker { display: none; }
        .iu-faq-q {
          flex: 1;
          line-height: 1.4;
        }
        .iu-faq-icon {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          color: #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 300;
          flex-shrink: 0;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(37,99,235, 0.3);
        }
        .iu-faq-item[open] .iu-faq-icon {
          transform: rotate(45deg);
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        }
        .iu-faq-a {
          padding: 8px 26px 26px;
          color: #374151;
          line-height: 1.75;
          font-size: 15px;
          border-top: 1px solid rgba(37,99,235, 0.15);
          margin-top: -4px;
          padding-top: 22px;
          background: linear-gradient(180deg, rgba(37,99,235, 0.03), rgba(10, 42, 94, 0.01));
        }
        /* ==== ANSWER RICH FORMATTING ==== */
        .iu-answer {
          font-size: 15px;
          color: #1f2937;
          line-height: 1.75;
        }
        .iu-answer .iu-para {
          margin: 0 0 14px 0;
          padding: 0;
        }
        .iu-answer .iu-para:last-child { margin-bottom: 0; }

        /* Intro paragrafı — sade */
        .iu-intro-box {
          display: block;
          margin: 0 0 14px 0;
        }
        .iu-intro-box i { display: none; }
        .iu-intro-box p {
          margin: 0;
          color: #374151;
          line-height: 1.7;
        }

        /* Numaralı liste — sade, minimal */
        .iu-num-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 8px;
        }
        .iu-num-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 0;
        }
        .iu-num-badge {
          flex-shrink: 0;
          width: 22px; height: 22px;
          background: #2563EB;
          color: #FFFFFF;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          margin-top: 2px;
        }
        .iu-num-text {
          flex: 1;
          color: #374151;
          line-height: 1.65;
        }

        /* Sade highlight'lar — sadece renk + kalın, arka plan yok */
        .iu-hi-price {
          color: #1E40AF;
          font-weight: 700;
          white-space: nowrap;
        }
        .iu-hi-pct {
          color: #059669;
          font-weight: 700;
        }
        .iu-hi-brand {
          color: #0A2A5E;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .iu-hi-region {
          color: #0A2A5E;
          font-weight: 700;
        }
        /* Legacy paragraf desteği */
        .iu-faq-a p { margin: 0 0 14px 0; }
        .iu-faq-a p:last-child { margin-bottom: 0; }
        @media (max-width: 768px) {
          .iu-faq-section {
            margin: 50px auto !important;
            padding: 0 16px !important;
          }
          .iu-faq-section h2 { font-size: 24px !important; }
          .iu-faq-item summary {
            font-size: 14px !important;
            padding: 18px 20px !important;
          }
          .iu-faq-a {
            padding: 16px 20px 20px !important;
            font-size: 14px !important;
          }
          .iu-faq-icon {
            width: 28px !important;
            height: 28px !important;
            font-size: 18px !important;
          }
          .iu-answer { font-size: 14px !important; }
          .iu-num-item { padding: 12px 14px !important; gap: 12px !important; }
          .iu-num-badge { width: 28px !important; height: 28px !important; font-size: 12px !important; }
          .iu-intro-box { padding: 12px 14px !important; gap: 10px !important; }
          .iu-price-range, .iu-price, .iu-price-m2, .iu-percent, .iu-brand, .iu-region, .iu-area {
            font-size: 0.88em !important;
          }
        }
      </style>
    `;
  }

  // JSON-LD FAQPage Schema - Google için (SEO KRİTİK)
  function injectSchema(faqs) {
    const existingSchema = document.getElementById('faq-schema');
    if (existingSchema) existingSchema.remove();

    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.a
        }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-schema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  // ==================== INIT ====================

  function init() {
    const containers = document.querySelectorAll('[id^="faqContainer"], .iu-faq-container');
    containers.forEach(container => {
      const category = container.getAttribute('data-faq-category') || 'genel';
      const showAll = container.getAttribute('data-faq-all') === 'true';
      const customTitle = container.getAttribute('data-faq-title');
      const customSubtitle = container.getAttribute('data-faq-subtitle');

      let faqs;
      if (showAll) {
        // Tüm FAQ'ları birleştir (SSS sayfası için)
        faqs = [];
        Object.keys(FAQS).forEach(key => {
          faqs = faqs.concat(FAQS[key]);
        });
      } else if (category === 'genel') {
        // Ana sayfa: genel + her kategoriden 1 = 8+ soru
        faqs = [...FAQS.genel];
        faqs.push(FAQS.arsa[0], FAQS.daire[0], FAQS.villa[0], FAQS.kiralik[0]);
      } else {
        // Kategori sayfası: kategori soruları + genel = min 8 soru
        const catFaqs = FAQS[category] || [];
        // Genel sorulardan yeterli sayıda al (toplam 8'e ulaşacak şekilde)
        const needed = Math.max(0, 8 - catFaqs.length);
        const generalFaqs = FAQS.genel.slice(0, needed + 1);
        faqs = [...catFaqs, ...generalFaqs];
      }

      // Duplicate temizle (aynı soru varsa çıkar)
      const seen = new Set();
      faqs = faqs.filter(f => {
        if (seen.has(f.q)) return false;
        seen.add(f.q);
        return true;
      });

      renderFAQs(container, faqs, {
        title: customTitle,
        subtitle: customSubtitle
      });

      // Google için schema ekle
      injectSchema(faqs);

      // FAQ render edildikten sonra Google Translate'e yeni içeriği çevirmesini söyle
      // (translator.js'de tanımlı olan re-scan fonksiyonu)
      if (typeof window.__IURetranslate === 'function') {
        setTimeout(() => window.__IURetranslate(), 300);
      }
      // Ayrıca translations.js'in data-i18n çevirilerini uygula
      if (typeof window.applyTranslations === 'function') {
        setTimeout(() => window.applyTranslations(), 100);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Global erişim
  window.IUFAQ = { FAQS, renderFAQs, injectSchema };

  console.log('[FAQ] Yalova Emlak FAQ yüklendi');
})();
