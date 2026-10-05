/* Silik — ilerleme ve ayarların kaydı (localStorage; erişilemezse bellekte çalışır) */
(function (root) {
  'use strict';
  var S = (root.Silik = root.Silik || {});
  var KEY = 'silik.v1';

  function defaults() {
    return {
      v: 1,
      unlocked: 1, // açık olan en yüksek bölüm
      best: {}, // { bölümId: { time, stars, steps } }
      daily: {}, // { 'YYYY-AA-GG': { time, stars } }
      settings: { sfx: true, music: true, vib: true },
      seen: {}, // bir kez gösterilen ipuçları
    };
  }

  function load() {
    var d = defaults();
    try {
      var raw = root.localStorage.getItem(KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          d.unlocked = Math.max(1, p.unlocked | 0);
          d.best = p.best || {};
          d.daily = p.daily || {};
          d.seen = p.seen || {};
          for (var k in d.settings) if (p.settings && typeof p.settings[k] === 'boolean') d.settings[k] = p.settings[k];
        }
      }
    } catch (e) {
      /* özel gezinti vb.: varsayılanlarla devam */
    }
    return d;
  }

  var data = load();

  function save() {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* yazılamıyorsa oyun yine de çalışır */
    }
  }

  S.Save = {
    get data() {
      return data;
    },
    save: save,
    /** Sonucu kaydeder; yeni rekor mu ve sonraki bölüm açıldı mı döner. */
    record: function (def, time, stars, steps) {
      var rec;
      var prev;
      if (def.daily) {
        prev = data.daily[def.dateKey];
        rec = data.daily[def.dateKey] = prev && prev.time <= time ? prev : { time: time, stars: stars, steps: steps };
        if (prev && prev.stars > rec.stars) rec.stars = prev.stars;
      } else {
        prev = data.best[def.id];
        rec = prev && prev.time <= time ? prev : { time: time, stars: stars, steps: steps };
        if (prev && prev.stars > rec.stars) rec.stars = prev.stars;
        data.best[def.id] = rec;
        if (def.id + 1 > data.unlocked) data.unlocked = def.id + 1;
      }
      save();
      return { record: !prev || time < prev.time, best: rec };
    },
    markSeen: function (id) {
      if (!data.seen[id]) {
        data.seen[id] = 1;
        save();
        return true;
      }
      return false;
    },
    reset: function () {
      var s = data.settings;
      data = defaults();
      data.settings = s;
      save();
    },
  };
})(window);
