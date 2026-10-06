# Silik

> Gördüğün her yer bir süre sonra hafızandan siliniyor. Çıkışı bulmak için neyi hatırlayacağını kendin seçmen gerekiyor.

2D yukarıdan bakış, keşif ve bulmaca oyunu. Kâğıt üzerine kurşun kalem çizimi görünümünde; **telefonda (dokunmatik) ve bilgisayarda (klavye)** oynanır. İki sezon, 24 bölüm: **1. Sezon · Orman** ve **2. Sezon · Mağara**. Derleme adımı, kütüphane ya da ses/görsel dosyası yoktur: saf HTML5 Canvas + JavaScript.

## Oynanış

Küçük bir karakter sisli bir labirentte uyanır. Etrafında küçük bir görüş alanı vardır; geçtiği yerler kâğıda kurşun kalemle çizilir. Ama harita yaklaşık **15 saniye** içinde silgi izi gibi soluklaşıp kaybolur.

1. Labirenti keşfet. Harita arkanda yavaş yavaş siliniyor.
2. Anahtarı bul, kapıyı bul. Genelde ikisi birbirinden uzaktır.
3. **Hatıra taşlarını** stratejik noktalara bırak. Bırakılan taşın çevresi mürekkeple çizilir ve kalıcı olur.
4. Silinmiş yolları hatırlamaya çalışarak çıkışa ulaş.

| Öğe | Etkisi |
| --- | --- |
| Hatıra taşı | Çevresindeki küçük alanı kalıcı kılar. Üstündeyken tekrar basarsan geri alırsın. |
| Rüzgâr | Rüzgârlı bölgelerde harita iki kat hızlı silinir. |
| Ayna duvarlar | Haritaya yanlış yönü gösteren sahte izler (yansıyan sahte koridorlar) bırakır. Mürekkeple çizilmiş alan her zaman doğruyu söyler. |
| Ses taşı | Bırakıldığında yakındaki yolun yönünü ok olarak fısıldar (önce anahtarı, anahtar alınınca kapıyı gösterir). |
| Çiçekler | Toplayınca bir taş daha kazandırır; ana yoldan sapmak gerekir. |
| İpucu | Takılınca **Duraklat → İpucu iste**: ses taşı olmayan bölümde 1 ses taşı verir. O bölümde en çok ★★ alınır. Uzun süre anahtarı bulamayan oyuncuya bir kez hatırlatılır. |

### Kontroller

| | Dokunmatik | Klavye |
| --- | --- | --- |
| Hareket | Ekranda herhangi bir yere basıp sürükle (esnek joystick) | WASD / yön tuşları |
| Taş bırak / geri al | Sağ alttaki **Bırak / Geri Al** düğmesi | Boşluk |
| Taş türünü değiştir (ses taşı olan bölümlerde) | Düğmenin yanındaki küçük düğme | Q veya E |
| Duraklat | Sol üstteki düğme | P veya Esc |
| Sesi aç / kapat | Ayarlar | M |

**Bölümleri denemek için:** Ayarlar → *Tüm bölümleri aç* (ya da sayfa adresinin sonuna `?unlock` ekle). Yalnızca listedeki kilitleri kaldırır; gerçek ilerleme ve “Devam Et” değişmez.

## İki sezon, iki dünya

| | 1. Sezon · Orman (bölüm 1–12) | 2. Sezon · Mağara (bölüm 13–24) |
| --- | --- | --- |
| Görünüm | Krem kâğıt, zeytin-grafit kurşun kalem, **koyu zümrüt mürekkep** | Kara kâğıt, **tebeşir**, kalıcı alan **kehribar fener ışığı** gibi parlar |
| Duvarlar | Yay yay kenarlı yaprak/çalı kümeleri | Sivri kenarlı, kırık tarama kaya |
| Ayna | **Göl**: yansıması sahte izler bırakır | **Kristal**: ışığı yansıtıp sahte koridor çizer |
| Rüzgâr | Rüzgâr (uçuşan yapraklar) | Cereyan (toz çizgileri) |
| Toplanabilir | Çiçek (+1 taş) | Parlayan mantar (+1 taş); karanlıkta uzaktan soluk pembe parlar |
| Kapı | Ağaç kovuğunda ahşap kapı | Demir parmaklıklı taş kemer; anahtarla ışık sızar |
| Atmosfer | Ateş böcekleri, düşen yapraklar, kuş sesleri | Süzülen toz, fener titremesi, damla yankıları |
| Görüş | 3,6 kare | 3,3 → 2,6 kare: fener ışığı bölüm bölüm küçülür |
| Hafıza | 15 sn (son iki bölümde 12 sn) | 14 sn → 10 sn |

Mağara, ormanın son bölümü bitince açılır. Her sezonun ilk bölümünde sezon başlığı ve kısa bir hikâye gösterilir; sezon geçişinde ekran perde gibi karışır. Müzik gamı, ortam sesleri, rüzgâr sesi ve adım sesi de sezona göre değişir.

Zorluk eğrisi her sezonda düzgün artar: her bölümün tohumu, **mükemmel hafızalı bir gezginin** (par) süresi hedef eğriyi (orman 28 → 218 sn, mağara 123 → 442 sn) tutturacak biçimde seçilmiştir (`tests/maze.test.js` bunu denetler). Orman 10. bölüm ile mağara 16 ve 19–24. bölümlerin tohumları, bağımsız bir botun gerçek oyun dünyasındaki ölçümüne göre yeniden seçildi; ani zorluk sıçramaları giderildi.

## Eklenenler (temel oyunun üstüne)

- **24 bölüm** (2 sezon × 12) ve her gün herkes için aynı olan **Günlük Labirent** (tarihe göre orman ya da mağara). Yeni öğeler bölümlerle tanıtılır.
- Bölümler tohumlu üretilir: aynı bölüm her zaman aynı labirenttir, süreler karşılaştırılabilir.
- **Yıldız sistemi**: süre, "hiçbir şeyi unutmayan bir gezginin" süresine göre değerlendirilir (orman: 3 yıldız için 1,8 katı; mağara: karanlıkta unutmak daha çok zaman aldığı için 2,2 katı). İlerleme ve en iyi süreler cihazda saklanır.
- **Mobil öncelikli**: esnek joystick, çoklu dokunma (bir parmak yürürken diğeriyle taş bırak), titreşim geri bildirimi, çentik/güvenli alan desteği, yatay ve dikey düzen, ekran açık kalma (Wake Lock).
- **PWA**: ana ekrana eklenebilir, tam ekran ve **çevrimdışı** çalışır.
- Sesler (adım, taş, anahtar, rüzgâr, fısıltı…) ve hafif üretken müzik WebAudio ile üretilir; ses dosyası yoktur.
- Performans: karo görselleri açılışta bir atlas tuvaline çizilir; cihaz yavaşsa çözünürlük kendiliğinden düşer.

## Tek dosya olarak oynamak

`silik.html`, oyunun tamamını (HTML, CSS, JS, yazı tipi ve simgeler) tek dosyada taşır. İndirip çift tıklamak ya da herhangi bir yere yüklemek yeterlidir; internet ya da başka dosya gerekmez. İstediğin adla (ör. `Silik Labirent.html`) kaydedebilirsin.

```bash
npm run build:single   # kaynaklardan silik.html'i yeniden üretir (elle düzenleme)
```

Not: Tek dosyada service worker ve "yükle" desteği yoktur; bunlar için klasör sürümünü bir `https` adresinden yayınla. Telefonda yerel dosya açmak (özellikle iPhone'da) güvenilir değildir; telefon için bir adrese yüklemek daha iyidir.

## Çalıştırma

Dosyaları herhangi bir statik sunucudan açmak yeterli:

```bash
npm start            # ya da: python3 -m http.server 8000
# tarayıcıda http://localhost:8000
```

Telefonda denemek için aynı ağdaki bilgisayarın adresini (`http://<bilgisayar-ip>:8000`) açabilirsin. Service worker ve "ana ekrana ekle" için sayfanın `https` (ya da `localhost`) üzerinden sunulması gerekir.

### Yayınlama (GitHub Pages)

Depo kökü zaten yayınlanabilir bir sitedir: **Settings → Pages → Build and deployment → Deploy from a branch** ile ana dalı ve `/ (root)` klasörünü seç. Telefonda sayfayı açıp tarayıcı menüsünden **Ana ekrana ekle** dersen uygulama gibi tam ekran açılır.

## Proje yapısı

```
index.html            iskelet, simge takımı ve ekranlar
css/style.css         kâğıt/kurşun kalem teması, mobil düzen
js/util.js            rastgele sayı (tohumlu), yardımcılar
js/maze.js            labirent üretimi, BFS / yol bulma, yerleşimler
js/levels.js          sezonlar, temaya göre kelimeler ve 24 bölüm (yeni bölüm için bir satır)
js/game.js            oyun mantığı: hareket, görüş, hafıza silinmesi, taşlar, ayna, puan
js/renderer.js        tema bağımsız canvas motoru: kamera, karolar, iz, parçacıklar, atlas
js/theme-common.js    tema altyapısı ve ortak çizim yardımcıları
js/theme-forest.js    1. Sezon · Orman: çalı duvarlar, göl, kovuk kapı, ateş böcekleri
js/theme-cave.js      2. Sezon · Mağara: kaya, kristal, taş kemer, mantar, fener ışığı
js/input.js           klavye + esnek dokunmatik joystick
js/audio.js           WebAudio ile ses ve müzik
js/storage.js         ilerleme ve ayarlar (localStorage)
js/app.js             ekranlar, arayüz, olaylar, ana döngü
sw.js, manifest.webmanifest, icons/   PWA
fonts/                Patrick Hand (SIL OFL), Türkçe karakterlerle
tests/                birim ve uçtan uca testler
tools/make-icons.js   icon.svg'den PNG simgeleri üretir
```

`maze.js`, `levels.js` ve `game.js` DOM'a bağlı değildir; Node'da da çalışır ve botla test edilir.

### Hafıza modeli

- Görüş alanındaki hücrelerin "yaşı" 0'dır; görüşten çıkan hücrenin yaşı artar.
- Hücre ilk 1,5 sn tam görünür, sonra yumuşakça soluklaşır; bölümün `mem` süresinde (varsayılan 15 sn) tamamen silinir.
- Rüzgârlı hücrelerde yaş 2 kat hızlı artar.
- Hatıra taşı bırakılınca çevresindeki hücreler kilitlenir (mürekkep) ve yaşlanmaz; taş geri alınınca yeniden silinmeye başlar.
- Ayna duvarlar, görüş alanındaki zeminleri ve duvarları kendi düzlemlerinde yansıtır. Bunlar haritada "hayalet" hücre olarak çizilir; gerçek hücre görülünce ya da mürekkep alanında silinir, gerçek hafızadan 2 kat hızlı solar ve gerçek anahtar/kapı/çiçeği göstermez.

### Yeni bölüm eklemek

`js/levels.js` içindeki `LIST` dizisine bir satır ekle (sezon ve tema `id`'den gelir: 1–12 orman, 13–24 mağara):

```js
L({ id: 25, name: 'Yeni Bölüm', sub: 'Alt başlık', w: 31, h: 31, seed: 13579,
    stones: 3, sound: 1, flowers: 2, wind: 2, mirrors: 6, mem: 12, vision: 3.0, braid: 0.1 }),
```

Yeni bir sezon/tema eklemek için `SEASONS` listesine bir kayıt, `TEXT` içine temaya özgü kelimeler ve `js/theme-*.js` benzeri bir tema dosyası (`Silik.Themes.<anahtar>`) gerekir; `css/style.css` içinde `[data-theme="<anahtar>"]` bloğu arayüz paletini belirler. Ayrıca `js/levels.js` içindeki `L()` ve `daily()` şu an iki sezon varsayar (`season = id <= 12 ? 1 : 2`), `THEME_COLOR` (`js/app.js`) ve `THEME` (`js/audio.js`) tabloları da yeni temayı içermelidir.

## Testler

```bash
npm test             # labirent üretimi, oyun mantığı (bot ile tüm bölümler çözülür), kayıt dayanıklılığı, çevrimdışı önbellek listesi
npm run test:e2e     # gerçek tarayıcıda dokunmatik/klavye/çevrimdışı (playwright gerekir)
```

Uçtan uca test için `playwright` kurulu olmalı; sistemde farklı bir Chromium varsa `CHROMIUM_PATH` ile belirt.

## Yazı tipi

`fonts/` içindeki Patrick Hand yazı tipi SIL Open Font License 1.1 kapsamındadır (`fonts/OFL.txt`).
