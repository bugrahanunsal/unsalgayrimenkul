# 🚀 TURYAP İSMAİL ÜNSAL — Tam Rebrand + 5 Dilli Site

## 📦 PAKETTE NE VAR?

```
teslim/
├── index.html              ← TR ana sayfa (rebrand edildi)
├── translations.js         ← URL-bazlı dil tespiti
├── sitemap.xml             ← Google'a 5 dili tanıtır
├── robots.txt              ← Arama motorları yönlendirmesi
│
├── en/index.html           ← İngilizce (statik içerik)
├── fr/index.html           ← Fransızca
├── de/index.html           ← Almanca
└── ru/index.html           ← Rusça
```

---

## ✅ NE DEĞIŞTİ?

### 1. 🎨 Görsel Değişiklikler
- **Header (menu):** Lacivert → **BEYAZ** + lacivert yazılar
- **Logo:** ÜNSAL ev-ikonu → **TURYAP + İSMAİL ÜNSAL Real Estate**
- **"HEMEN ARA" butonu:** Turuncu → **LACİVERT + beyaz**
- **Üst bar:** Lacivert kalıyor, ikonlar beyaz
- **Menu altı:** İnce **altın çizgi** (premium dokunuş)
- **Footer:** Lacivert kalıyor + **"TURYAP YETKİLİ DANIŞMANI"** rozeti
- **Logo (footer):** TURYAP beyaz + İSMAİL ÜNSAL beyaz, REAL ESTATE altın

### 2. 🌍 SEO için 5 Dilli URL Yapısı
- `/` → Türkçe
- `/en/` → English
- `/fr/` → Français
- `/de/` → Deutsch
- `/ru/` → Русский

Her dilin **kendi statik HTML'i** var — Google JavaScript beklemeden indeksler.

### 3. 📊 SEO Bonusları
- Her dilin kendi `<title>`, `meta description`, `og:*` etiketleri
- Schema.org JSON-LD: "TURYAP İsmail Ünsal Real Estate"
- `hreflang` etiketleri tüm dilleri bağlıyor
- `sitemap.xml`'de tüm diller alternate olarak listeli
- Bayrak butonları gerçek URL'lere bağlı (Google takip edebilir)

---

## 📤 GITHUB'A YÜKLEME

### En Kolay Yol: Toplu Yükleme

1. https://github.com/bugrahanunsal/unsalgayrimenkul adresine gidin
2. **"Add file" → "Upload files"** tıklayın
3. `teslim/` klasörü içindeki **TÜM dosya ve klasörleri** seçin
4. GitHub'a sürükleyin (klasör yapısı otomatik korunur)
5. Aşağıdaki commit mesajını yazın:
   ```
   Rebrand: TURYAP İsmail Ünsal + 5 dilli SEO yapısı
   ```
6. **"Commit changes"** tıklayın

### Üzerine Yazma Onayları

Şu dosyalar **var olanın üzerine yazılacak**, **OK** deyin:
- ✅ `index.html`
- ✅ `translations.js`

Yeni eklenenler:
- ✅ `sitemap.xml`
- ✅ `robots.txt`
- ✅ `en/` klasörü
- ✅ `fr/` klasörü
- ✅ `de/` klasörü
- ✅ `ru/` klasörü

---

## 🧪 TEST EDİLECEKLER

GitHub Pages 1-2 dakikada güncellenir, sonra:

### ✅ Test 1: Anasayfa
- https://bugrahanunsal.github.io/unsalgayrimenkul/
- Beklenen: Beyaz menu, TURYAP+İSMAİL ÜNSAL logo, lacivert "HEMEN ARA"

### ✅ Test 2: Dil Sayfaları (her biri ayrı URL!)
- https://bugrahanunsal.github.io/unsalgayrimenkul/en/ → English
- https://bugrahanunsal.github.io/unsalgayrimenkul/fr/ → Français
- https://bugrahanunsal.github.io/unsalgayrimenkul/de/ → Deutsch
- https://bugrahanunsal.github.io/unsalgayrimenkul/ru/ → Русский

### ✅ Test 3: Bayrak Tıklama
- TR sayfada bayrağa tıkla → İngilizce seç → URL `/en/`'e gitmeli
- Sayfa yenilenmeden değil, **gerçek URL değişikliği**

### ✅ Test 4: F12 Console
- Hiç kırmızı hata olmamalı
- `typeof translations` → `"object"`

---

## 📈 GOOGLE'A TANITIM (Sonraki Adım)

Domain alındıktan sonra:

### 1. Google Search Console
1. https://search.google.com/search-console
2. Property ekle: `unsalgayrimenkul.com` (veya yeni domain)
3. Sitemap submit: `sitemap.xml`
4. Google 1-2 hafta içinde **5 dilde** indekslemeye başlar

### 2. Google Business Profile
1. https://business.google.com
2. "İsmail Ünsal - TURYAP Yalova" işletmesi ekle
3. Adres: Yalova
4. Telefon: +90 507 518 84 82
5. Website: yeni domain
6. **Yalova'da arayan biri Google'da sizi haritada görür**

### 3. Bing Webmaster Tools
- https://www.bing.com/webmasters
- Aynı sitemap.xml'i submit edin
- Bonus: Bing, ChatGPT search'ün de altyapısı (önemli!)

---

## ⚠️ ÖNEMLİ NOTLAR

### Logo Hakkında
HTML'de **SVG placeholder logo** var şu anda:
```
[TURYAP] | İSMAİL ÜNSAL
          REAL ESTATE
```

Gerçek logoyu (jpg/png) yüklediğinizde:
1. GitHub'a `logo.png` veya `logo.jpg` yükleyin
2. Sonra bana söyleyin, HTML'i `<img>` ile güncelleyim

### Pillar Sayfalar
Diğer 8 HTML sayfa (`yalova-satilik-daire.html` vb.) **henüz rebrand edilmedi**:
- Beyaz menüsü yok
- Eski lacivert menü görüntüsü
- TR olarak kalıyor

Bunlar **sonraki adım** olacak. Test edip anasayfalar onaylanırsa pillar sayfalara geçeceğiz.

### Domain Değişimi
Şu anki kod `unsalgayrimenkul.com` domain'iyle hazırlandı. Eğer yeni domain (`ismailunsalemlak.com` gibi) alırsanız:
1. Bana söyleyin
2. Sitemap.xml ve meta tag'lerdeki tüm URL'leri güncelleyeyim
3. Yeniden teslim

---

## 🎯 ÖZET

✅ 5 dilde SEO uyumlu site
✅ Beyaz menu + lacivert yazı + lacivert CTA
✅ TURYAP + İSMAİL ÜNSAL logo (placeholder)
✅ Footer'da "TURYAP YETKİLİ DANIŞMANI" rozeti
✅ Sitemap.xml + robots.txt
✅ Schema.org JSON-LD güncel
✅ Tüm meta tag'ler her dilde özelleştirilmiş

**Yapmanız gereken:** Tüm dosyaları GitHub'a yükleyin, test edin, bana sonucu söyleyin! 🚀
