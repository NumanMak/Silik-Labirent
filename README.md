# Silik

> Gördüğün her yer bir süre sonra hafızandan siliniyor. Çıkışı bulmak için neyi hatırlayacağını kendin seçmen gerekiyor.

2D yukarıdan bakış, keşif ve bulmaca oyunu. Kâğıt üzerine kurşun kalem çizimi görünümünde; **telefonda (dokunmatik) ve bilgisayarda (klavye)** oynanır. Derleme adımı, kütüphane ya da ses/görsel dosyası yoktur: saf HTML5 Canvas + JavaScript.

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

### Kontroller

| | Dokunmatik | Klavye |
| --- | --- | --- |
| Hareket | Ekranda herhangi bir yere basıp sürükle (esnek joystick) | WASD / yön tuşları |
| Taş bırak / geri al | Sağ alttaki **Bırak / Geri Al** düğmesi | Boşluk |
| Taş türünü değiştir (ses taşı olan bölümlerde) | Düğmenin yanındaki küçük düğme | Q veya E |
| Duraklat | Sol üstteki düğme | P veya Esc |
| Sesi aç / kapat | Ayarlar | M |

## Eklenenler (temel oyunun üstüne)

- **12 bölüm** ve her gün herkes için aynı olan **Günlük Labirent**. Yeni öğeler bölümlerle tanıtılır.
- Bölümler tohumlu üretilir: aynı bölüm her zaman aynı labirenttir, süreler karşılaştırılabilir.
- **Yıldız sistemi**: süre, "hiçbir şeyi unutmayan bir gezginin" süresine göre değerlendirilir. İlerleme ve en iyi süreler cihazda saklanır.
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
js/levels.js          bölüm tanımları (yeni bölüm eklemek için bir satır)
js/game.js            oyun mantığı: hareket, görüş, hafıza silinmesi, taşlar, ayna, puan
js/renderer.js        canvas çizimi: kâğıt, kalem, mürekkep, silgi, nesneler
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
- Ayna duvarlar, görüş alanındaki zeminleri ve duvarları kendi düzlemlerinde yansıtır. Bunlar haritada "hayalet" hücre olarak çizilir ve gerçek hücre görülünce ya da mürekkep alanında silinir.

### Yeni bölüm eklemek

`js/levels.js` içindeki `LIST` dizisine bir satır ekle:

```js
L({ id: 13, name: 'Yeni Bölüm', sub: 'Alt başlık', w: 31, h: 31, seed: 13579,
    stones: 3, sound: 1, flowers: 2, wind: 2, mirrors: 6, mem: 12, braid: 0.1 }),
```

## Testler

```bash
npm test             # labirent üretimi, oyun mantığı (bot ile tüm bölümler çözülür), kayıt dayanıklılığı
npm run test:e2e     # gerçek tarayıcıda dokunmatik/klavye/çevrimdışı (playwright gerekir)
```

Uçtan uca test için `playwright` kurulu olmalı; sistemde farklı bir Chromium varsa `CHROMIUM_PATH` ile belirt.

## Yazı tipi

`fonts/` içindeki Patrick Hand yazı tipi SIL Open Font License 1.1 kapsamındadır (`fonts/OFL.txt`).
