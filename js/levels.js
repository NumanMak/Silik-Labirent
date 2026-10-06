/* Silik — sezonlar ve bölüm tanımları (tarayıcı + Node uyumlu)
 *
 * İki sezon, her biri 12 bölüm:
 *   1. Sezon · Orman  (bölüm  1–12): sisli bir sabah ormanı, kâğıt + kurşun kalem + yeşil mürekkep
 *   2. Sezon · Mağara (bölüm 13–24): yer altı, kara kâğıt + tebeşir + fener ışığı
 *
 * Her bölüm tohumlu üretilir; yeni bölüm eklemek için listeye bir satır eklemek yeter.
 *   stones  : bölüm başına hatıra taşı
 *   sound   : ses taşı sayısı (0 ise yok)
 *   flowers : toplanabilir sayısı (ormanda çiçek, mağarada parlayan mantar; her biri +1 hatıra taşı)
 *   wind    : rüzgâr / cereyan bölgesi sayısı (harita 2 kat hızlı silinir)
 *   mirrors : ayna sayısı (ormanda göl, mağarada kristal; haritaya sahte izler bırakır)
 *   mem     : haritanın tamamen silinme süresi (sn)
 *   vision  : görüş yarıçapı (kare); 0 = varsayılan 3.6. Mağarada fener ışığı daha küçüktür
 *   intro   : bölümün başında gösterilen "yeni öğe" kartı
 *   epilogue: bölümü bitirince gösterilen kapanış yazısı
 */
(function (root, factory) {
  var m = factory(typeof module === 'object' && module.exports ? require('./util.js') : root.Silik.Util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.Silik.Levels = m;
})(this, function (Util) {
  'use strict';

  var PER_SEASON = 12;

  var SEASONS = [
    {
      id: 1, key: 'forest', theme: 'forest', name: 'Orman', title: '1. Sezon', tagline: 'Sisli bir sabah ormanı',
      first: 1, last: 12,
      story: 'Sisli bir ormanda uyandın. Yapraklar arasında gördüğün her yer bir süre sonra aklından siliniyor.',
    },
    {
      id: 2, key: 'cave', theme: 'cave', name: 'Mağara', title: '2. Sezon', tagline: 'Fener ışığında yer altı',
      first: 13, last: 24,
      story: 'Kökler arasındaki mağara ağzından içeri girdin. Elindeki fener yalnızca birkaç adımı aydınlatıyor.',
    },
  ];

  /** Temaya göre değişen kelimeler (arayüz metinleri bunları kullanır). */
  var TEXT = {
    forest: { pickup: 'çiçek', pickups: 'Çiçekler', pickupIcon: 'flower', wind: 'Rüzgâr', mirror: 'Göl', mirrorPlural: 'Göletler', mirrorIcon: 'mirror' },
    cave: { pickup: 'mantar', pickups: 'Mantarlar', pickupIcon: 'mushroom', wind: 'Cereyan', mirror: 'Kristal', mirrorPlural: 'Kristaller', mirrorIcon: 'crystal' },
  };

  var BASE = { stones: 3, sound: 0, flowers: 0, wind: 0, mirrors: 0, mem: 15, braid: 0, straight: 0.5, branch: 0.3, vision: 0 };

  function L(o) {
    var r = {};
    for (var k in BASE) r[k] = BASE[k];
    for (var j in o) r[j] = o[j];
    r.season = o.id <= PER_SEASON ? 1 : 2;
    r.theme = SEASONS[r.season - 1].theme;
    r.seasonStart = o.id === SEASONS[r.season - 1].first;
    return r;
  }

  var LIST = [
    /* ---------- 1. SEZON · ORMAN ---------- */
    L({
      id: 1, name: 'Uyanış', sub: 'Gözlerini sisli bir ormanda açtın.',
      w: 15, h: 15, seed: 1101, branch: 0.18,
      intro: { icon: 'pencil', title: 'Hatırla ya da unut', text: 'Gördüğün yerler kâğıda çizilir ama yaklaşık 15 saniyede silinir. Taş bırakarak bir yeri kalıcı kıl.' },
    }),
    L({
      id: 2, name: 'Sis', sub: 'Ağaçların arasında anahtar ve kapı hiç yan yana değildir.',
      w: 19, h: 19, seed: 49721, braid: 0.05,
      intro: { icon: 'key', title: 'Anahtar ve kapı', text: 'Önce anahtarı bul, sonra kovuktaki kapıyı. İkisi birbirinden uzaktır; taşlarını bu ikisi için sakla.' },
    }),
    L({
      id: 3, name: 'Çiçek Tarlası', sub: 'Yoldan sapanı bir ödül bekler.',
      w: 21, h: 21, seed: 3303, flowers: 2, braid: 0.05,
      intro: { icon: 'flower', title: 'Çiçekler', text: 'Her çiçek sana bir taş daha kazandırır. Ama onlara ulaşmak için ana yoldan sapman gerekir.' },
    }),
    L({
      id: 4, name: 'Rüzgâr', sub: 'Yapraklar uçuşurken hatıralar da uçar.',
      w: 21, h: 21, seed: 20247, wind: 2, flowers: 1, braid: 0.08,
      intro: { icon: 'wind', title: 'Rüzgâr', text: 'Rüzgârlı bölgelerde harita iki kat hızlı silinir. Oralarda bir taş çok daha değerlidir.' },
    }),
    L({
      id: 5, name: 'Fısıltı', sub: 'Taşlar da konuşabilir.',
      w: 23, h: 23, seed: 29258, sound: 1, flowers: 1, braid: 0.08,
      intro: { icon: 'sound', title: 'Ses taşı', text: 'Düğmeyle taş türünü değiştir. Ses taşı bırakıldığında yakındaki yolun yönünü ok olarak fısıldar. Önce anahtarı, sonra kapıyı gösterir.' },
    }),
    L({
      id: 6, name: 'Göl Yansıması', sub: 'Durgun suyun yüzü doğruyu söylemez.',
      w: 23, h: 23, seed: 14526, mirrors: 5, flowers: 1, braid: 0.08,
      intro: { icon: 'mirror', title: 'Göletler', text: 'Göletlerin yansıması haritana yanlış yönü gösteren sahte izler bırakır. Mürekkeple çizilmiş alan ise her zaman doğruyu söyler.' },
    }),
    L({
      id: 7, name: 'Eski Patika', sub: 'Yaprakların altında yol uzayıp gidiyor.',
      w: 27, h: 27, seed: 39379, wind: 2, flowers: 2, braid: 0.1,
    }),
    L({
      id: 8, name: 'Fısıltılı Rüzgâr', sub: 'Dalların arasında bir ses var.',
      w: 27, h: 27, seed: 56321, wind: 3, sound: 2, flowers: 1, braid: 0.1,
    }),
    L({
      id: 9, name: 'Sahte İzler', sub: 'Göletler yanıltır. Haritana güvenme.',
      w: 27, h: 27, seed: 160362, mirrors: 9, flowers: 2, braid: 0.1,
    }),
    L({
      id: 10, name: 'Gölün Rüzgârı', sub: 'Hem unutuyorsun hem yanılıyorsun.',
      w: 29, h: 29, seed: 222010, wind: 2, mirrors: 8, sound: 1, flowers: 2, braid: 0.1,
    }),
    L({
      id: 11, name: 'Unutuş', sub: 'Orman sıklaştı, hafıza kısaldı.',
      w: 31, h: 31, seed: 129998, mem: 12, wind: 3, mirrors: 8, sound: 2, flowers: 3, braid: 0.12,
    }),
    L({
      id: 12, name: 'Ormanın Kalbi', sub: 'Son sayfa. Geriye ne hatırladığın kalır.',
      w: 35, h: 35, seed: 51942, mem: 12, wind: 4, mirrors: 12, sound: 2, flowers: 4, braid: 0.12,
      epilogue: 'Ormanın kalbini geçtin. Ağaçlar aralandı; kökler arasında karanlık bir mağara ağzı açılıyor. Aşağıda daha derin bir unutuş seni bekliyor.',
    }),

    /* ---------- 2. SEZON · MAĞARA ---------- */
    L({
      id: 13, name: 'Mağara Ağzı', sub: 'Gün ışığı geride kaldı. Fener yanıyor.',
      w: 29, h: 29, seed: 266415, flowers: 2, braid: 0.1, mem: 14, vision: 3.3,
      intro: { icon: 'lantern', title: 'Karanlık', text: 'Mağarada fener ışığın daha küçük: gördüğün alan daraldı. Harita yine siliniyor; taşlarını daha dikkatli kullan.' },
    }),
    L({
      id: 14, name: 'Damla Sesi', sub: 'Her damla uzaktan bir yankı getiriyor.',
      w: 31, h: 31, seed: 29849, wind: 2, flowers: 2, braid: 0.1, mem: 14, vision: 3.3,
      intro: { icon: 'wind', title: 'Cereyan', text: 'Dar geçitlerde soğuk bir hava akımı var. Cereyanlı bölgelerde harita iki kat hızlı silinir.' },
    }),
    L({
      id: 15, name: 'Kristal Duvarlar', sub: 'Işığı yansıtan her yüzey yalan söyleyebilir.',
      w: 31, h: 31, seed: 244664, mirrors: 6, flowers: 2, braid: 0.1, mem: 14, vision: 3.2,
      intro: { icon: 'crystal', title: 'Kristaller', text: 'Kristal duvarlar fener ışığını yansıtıp haritana sahte koridorlar çizer. Mürekkeple çizilmiş alan her zaman doğruyu söyler.' },
    }),
    L({
      id: 16, name: 'Yankı Odası', sub: 'Taşın fısıltısı duvarlara çarpıp dönüyor.',
      w: 33, h: 33, seed: 21281, wind: 2, sound: 2, flowers: 2, braid: 0.1, mem: 14, vision: 3.2,
    }),
    L({
      id: 17, name: 'Parlayan Mantarlar', sub: 'Karanlıkta ışık veren tek şey onlar.',
      w: 33, h: 33, seed: 64535, wind: 2, mirrors: 4, flowers: 5, braid: 0.12, mem: 13, vision: 3.1,
      intro: { icon: 'mushroom', title: 'Parlayan mantarlar', text: 'Her mantar sana bir taş daha kazandırır. Işıkları seni yoldan saptırabilir; ama taşlar zordur.' },
    }),
    L({
      id: 18, name: 'Derin Çatlak', sub: 'Kayanın içinde yol ikiye, üçe ayrılıyor.',
      w: 35, h: 35, seed: 18023, wind: 3, mirrors: 9, sound: 1, flowers: 3, braid: 0.12, mem: 13, vision: 3.1,
    }),
    L({
      id: 19, name: 'Yeraltı Nehri', sub: 'Suyun sesi yönünü şaşırtıyor.',
      w: 37, h: 37, seed: 539663, wind: 4, mirrors: 6, sound: 2, flowers: 3, braid: 0.12, mem: 13, vision: 3.0,
    }),
    L({
      id: 20, name: 'Fısıltı Galerisi', sub: 'Burada her şey yankılanır, her yankı yanıltır.',
      w: 39, h: 39, seed: 339931, wind: 3, mirrors: 10, sound: 3, flowers: 4, braid: 0.13, mem: 12, vision: 3.0,
    }),
    L({
      id: 21, name: 'Karanlığın Kalbi', sub: 'Fenerin ışığı sönmeye yaklaşıyor.',
      w: 41, h: 41, seed: 547764, wind: 4, mirrors: 10, sound: 2, flowers: 4, braid: 0.13, mem: 12, vision: 2.8,
    }),
    L({
      id: 22, name: 'Eski Maden', sub: 'Ray izleri bir yere gidiyor. Ama nereye?',
      w: 43, h: 43, seed: 222010, wind: 4, mirrors: 12, sound: 3, flowers: 5, braid: 0.14, mem: 11, vision: 2.8,
    }),
    L({
      id: 23, name: 'Sessiz Derinlik', sub: 'Yalnızca kendi adımlarını duyuyorsun.',
      w: 45, h: 45, seed: 613499, wind: 5, mirrors: 12, sound: 3, flowers: 6, braid: 0.14, mem: 11, vision: 2.7,
    }),
    L({
      id: 24, name: 'Işığa Doğru', sub: 'Son sayfa. Karanlığın ötesinde bir çıkış var.',
      w: 47, h: 47, seed: 506187, wind: 5, mirrors: 14, sound: 3, flowers: 6, braid: 0.14, mem: 10, vision: 2.6,
      epilogue: 'Fenerin ışığı gün ışığına karıştı. Hatırladıkların seni buraya getirdi; unuttukların ise zaten yolun bir parçasıydı. Silik’ten çıktın.',
    }),
  ];

  /** Günlük labirent: tarihten türeyen tohum, herkes için aynı. Tema da tarihe göre seçilir. */
  function daily(key) {
    var seed = Util.hashString('silik-' + key);
    var r = Util.rng(seed);
    var size = 25 + 2 * Math.floor(r() * 3);
    var wind = 1 + Math.floor(r() * 2);
    var mirrors = 3 + Math.floor(r() * 4);
    var cave = r() < 0.5; // diğer değerleri değiştirmeden, sona eklendi
    var def = L({
      id: 'daily',
      daily: true,
      dateKey: key,
      name: 'Günlük Labirent',
      sub: key,
      w: size, h: size, seed: seed,
      wind: wind,
      mirrors: mirrors,
      sound: 1,
      flowers: 2,
      braid: 0.1,
      mem: 14,
      vision: cave ? 3.2 : 0,
    });
    def.season = cave ? 2 : 1;
    def.theme = cave ? 'cave' : 'forest';
    def.seasonStart = false;
    return def;
  }

  function byId(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  function seasonOf(def) {
    return SEASONS[(def && def.season ? def.season : 1) - 1];
  }

  return { LIST: LIST, SEASONS: SEASONS, TEXT: TEXT, PER_SEASON: PER_SEASON, daily: daily, byId: byId, seasonOf: seasonOf };
});
