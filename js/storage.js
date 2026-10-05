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

  function plain(o) {
    return o && typeof o === 'object' && !Array.isArray(o);
  }

  /** Kayıtları temizle: yalnızca sonlu sayılı süre/yıldız taşıyan kayıtlar kalır. */
  function cleanRecords(src) {
    var out = {};
    if (!plain(src)) return out;
    for (var k in src) {
      var r = src[k];
      if (plain(r) && isFinite(r.time) && r.time >= 0 && isFinite(r.stars)) {
        out[k] = { time: +r.time, stars: Math.max(1, Math.min(3, r.stars | 0)), steps: isFinite(r.steps) ? +r.steps : 0 };
      }
    }
    return out;
  }

  function load() {
    var d = defaults();
    try {
      var raw = root.localStorage.getItem(KEY);
      if (raw) {
        var p = JSON.parse(raw);
        // elle düzenlenmiş / bozuk kayıtlara karşı: her alanın türü doğrulanır
        if (plain(p)) {
          var u = Number(p.unlocked);
          d.unlocked = isFinite(u) ? Math.max(1, Math.min(999, Math.floor(u))) : 1;
          d.best = cleanRecords(p.best);
          d.daily = cleanRecords(p.daily);
          d.seen = plain(p.seen) ? p.seen : {};
          if (plain(p.settings)) for (var k in d.settings) if (typeof p.settings[k] === 'boolean') d.settings[k] = p.settings[k];
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
