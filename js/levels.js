/* Silik — bölüm tanımları (tarayıcı + Node uyumlu)
 *
 * Her bölüm tohumlu üretilir; yeni bölüm eklemek için listeye bir satır eklemek yeter.
 *   stones  : bölüm başına hatıra taşı
 *   sound   : ses taşı sayısı (0 ise yok)
 *   flowers : çiçek sayısı (her biri +1 hatıra taşı)
 *   wind    : rüzgâr bölgesi sayısı (harita 2 kat hızlı silinir)
 *   mirrors : ayna duvar sayısı (haritaya sahte izler bırakır)
 *   mem     : haritanın tamamen silinme süresi (sn)
 *   intro   : bölümün başında gösterilen "yeni öğe" kartı
 */
(function (root, factory) {
  var m = factory(typeof module === 'object' && module.exports ? require('./util.js') : root.Silik.Util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.Silik.Levels = m;
})(this, function (Util) {
  'use strict';

  var BASE = { stones: 3, sound: 0, flowers: 0, wind: 0, mirrors: 0, mem: 15, braid: 0, straight: 0.5, branch: 0.3 };

  function L(o) {
    var r = {};
    for (var k in BASE) r[k] = BASE[k];
    for (var j in o) r[j] = o[j];
    return r;
  }

  var LIST = [
    L({
      id: 1, name: 'Uyanış', sub: 'Gözlerini sisli bir labirentte açtın.',
      w: 15, h: 15, seed: 1101, branch: 0.18,
      intro: { icon: 'pencil', title: 'Hatırla ya da unut', text: 'Gördüğün yerler kâğıda çizilir ama yaklaşık 15 saniyede silinir. Taş bırakarak bir yeri kalıcı kıl.' },
    }),
    L({
      id: 2, name: 'Sis', sub: 'Anahtar ve kapı hiçbir zaman yan yana değildir.',
      w: 19, h: 19, seed: 2207, braid: 0.05,
      intro: { icon: 'key', title: 'Anahtar ve kapı', text: 'Önce anahtarı bul, sonra kapıyı. İkisi birbirinden uzaktır; taşlarını bu ikisi için sakla.' },
    }),
    L({
      id: 3, name: 'Çiçek Tarlası', sub: 'Yoldan sapanı bir ödül bekler.',
      w: 21, h: 21, seed: 3303, flowers: 2, braid: 0.05,
      intro: { icon: 'flower', title: 'Çiçekler', text: 'Her çiçek sana bir taş daha kazandırır. Ama onlara ulaşmak için ana yoldan sapman gerekir.' },
    }),
    L({
      id: 4, name: 'Rüzgâr', sub: 'Bazı yerlerde hatıralar daha çabuk uçar.',
      w: 21, h: 21, seed: 4409, wind: 2, flowers: 1, braid: 0.08,
      intro: { icon: 'wind', title: 'Rüzgâr', text: 'Rüzgârlı bölgelerde harita iki kat hızlı silinir. Oralarda bir taş çok daha değerlidir.' },
    }),
    L({
      id: 5, name: 'Fısıltı', sub: 'Taşlar da konuşabilir.',
      w: 23, h: 23, seed: 5501, sound: 1, flowers: 1, braid: 0.08,
      intro: { icon: 'sound', title: 'Ses taşı', text: 'Düğmeyle taş türünü değiştir. Ses taşı bırakıldığında yakındaki yolun yönünü ok olarak fısıldar. Önce anahtarı, sonra kapıyı gösterir.' },
    }),
    L({
      id: 6, name: 'Yansıma', sub: 'Her parlayan şey doğruyu söylemez.',
      w: 23, h: 23, seed: 6607, mirrors: 5, flowers: 1, braid: 0.08,
      intro: { icon: 'mirror', title: 'Ayna duvarlar', text: 'Ayna duvarlar haritana yanlış yönü gösteren sahte izler bırakır. Mürekkeple çizilmiş alan ise her zaman doğruyu söyler.' },
    }),
    L({
      id: 7, name: 'Uzun Yol', sub: 'Hatıralar uçuşurken adımların ağırlaşıyor.',
      w: 27, h: 27, seed: 7703, wind: 2, flowers: 2, braid: 0.1,
    }),
    L({
      id: 8, name: 'Fısıltılı Rüzgâr', sub: 'Rüzgârın içinde bir ses var.',
      w: 27, h: 27, seed: 8807, wind: 3, sound: 2, flowers: 1, braid: 0.1,
    }),
    L({
      id: 9, name: 'Sahte İzler', sub: 'Haritana güvenme.',
      w: 27, h: 27, seed: 9901, mirrors: 9, flowers: 2, braid: 0.1,
    }),
    L({
      id: 10, name: 'Aynalı Rüzgâr', sub: 'Hem unutuyorsun hem yanılıyorsun.',
      w: 29, h: 29, seed: 10103, wind: 2, mirrors: 8, sound: 1, flowers: 2, braid: 0.1,
    }),
    L({
      id: 11, name: 'Unutuş', sub: 'Hafıza daha da kısa.',
      w: 31, h: 31, seed: 11213, mem: 12, wind: 3, mirrors: 8, sound: 2, flowers: 3, braid: 0.12,
    }),
    L({
      id: 12, name: 'Silik', sub: 'Son sayfa. Geriye ne hatırladığın kalır.',
      w: 35, h: 35, seed: 12347, mem: 12, wind: 4, mirrors: 12, sound: 2, flowers: 4, braid: 0.12,
    }),
  ];

  /** Günlük labirent: tarihten türeyen tohum, herkes için aynı. */
  function daily(key) {
    var seed = Util.hashString('silik-' + key);
    var r = Util.rng(seed);
    var size = 25 + 2 * Math.floor(r() * 3);
    return L({
      id: 'daily',
      daily: true,
      dateKey: key,
      name: 'Günlük Labirent',
      sub: key,
      w: size, h: size, seed: seed,
      wind: 1 + Math.floor(r() * 2),
      mirrors: 3 + Math.floor(r() * 4),
      sound: 1,
      flowers: 2,
      braid: 0.1,
      mem: 14,
    });
  }

  function byId(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  return { LIST: LIST, daily: daily, byId: byId };
});
