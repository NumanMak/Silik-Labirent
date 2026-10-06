/* Silik — çizim motoru (tema bağımsız).
 *
 * Görünüm, seçili temadan (Silik.Themes.forest / .cave) gelir: kâğıt, kalem, mürekkep renkleri,
 * duvar/zemin/ayna karoları, anahtar-kapı-toplanabilir-taş-oyuncu çizimleri, fener ışığı, atmosfer.
 * Bu dosya kamerayı, karo döngüsünü, izi, parçacıkları ve atlası yönetir.
 *
 * Karo görselleri (duvar / zemin / ayna / silgi / rüzgâr) tema başına açılışta ve ekran boyutu
 * değişince bir atlas tuvaline önceden çizilir; kare başına yalnızca drawImage çağrılır.
 */
(function (root) {
  'use strict';
  var S = (root.Silik = root.Silik || {});
  var Util = S.Util;
  var K = S.ThemeKit;
  var rgba = K.rgba;
  var hash2 = K.hash2;

  /* ---------- atlas ---------- */

  var COLS = 16;
  var N_SPRITES = 107;
  function wallIdx(ink, v, mask) {
    return (ink * 2 + v) * 16 + mask;
  }
  function mirrorIdx(ink, mask) {
    return 64 + ink * 16 + mask;
  }
  function floorIdx(ink, v) {
    return 96 + ink * 3 + v;
  }
  var SMUDGE = 102;
  var WINDG = 105;

  function paintSmudge(ctx, T, theme, rand) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = theme.smudge;
    for (var s = 0; s < 3; s++) {
      ctx.lineWidth = T * (0.22 + rand() * 0.14);
      var x = T * (0.1 + rand() * 0.5);
      var y = T * (0.05 + rand() * 0.7);
      ctx.beginPath();
      ctx.moveTo(x, y + T * 0.25);
      ctx.lineTo(x + T * (0.3 + rand() * 0.3), y);
      ctx.stroke();
    }
  }

  function buildAtlas(Tp, theme) {
    var rows = Math.ceil(N_SPRITES / COLS);
    var c = document.createElement('canvas');
    c.width = COLS * Tp;
    c.height = rows * Tp;
    var ctx = c.getContext('2d');
    function each(i, fn) {
      ctx.save();
      ctx.translate((i % COLS) * Tp, Math.floor(i / COLS) * Tp);
      ctx.beginPath();
      ctx.rect(0, 0, Tp, Tp);
      ctx.clip();
      // her sprite için kalıcı bir tohum: tema değişse de aynı görünür
      fn(Util.rng(i * 7919 + 13 + (theme.key === 'cave' ? 5000 : 0)));
      ctx.restore();
    }
    var ink, v, m;
    for (ink = 0; ink < 2; ink++) {
      for (v = 0; v < 2; v++) {
        for (m = 0; m < 16; m++) {
          (function (ink, v, m) {
            each(wallIdx(ink, v, m), function (r) {
              theme.paintWall(ctx, Tp, m, v, ink, r);
            });
          })(ink, v, m);
        }
      }
      for (m = 0; m < 16; m++) {
        (function (ink, m) {
          each(mirrorIdx(ink, m), function (r) {
            theme.paintMirror(ctx, Tp, m, ink, r);
          });
        })(ink, m);
      }
      for (v = 0; v < 3; v++) {
        (function (ink, v) {
          each(floorIdx(ink, v), function (r) {
            theme.paintFloor(ctx, Tp, v, ink, r);
          });
        })(ink, v);
      }
    }
    for (v = 0; v < 3; v++) {
      each(SMUDGE + v, function (r) {
        paintSmudge(ctx, Tp, theme, r);
      });
    }
    for (v = 0; v < 2; v++) {
      (function (v) {
        each(WINDG + v, function () {
          theme.paintWind(ctx, Tp, v);
        });
      })(v);
    }
    return c;
  }

  /* ---------- kâğıt dokusu ve vinyet ---------- */

  function buildPaper(size, dpr, theme) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    var r = Util.rng(4242);
    var dk = theme.speckDark;
    var lt = theme.speckLight;
    var dark = theme.key === 'cave';
    for (var i = 0; i < size * 1.6; i++) {
      var x = r() * size;
      var y = r() * size;
      var a = (dark ? 0.02 : 0.03) + r() * (dark ? 0.06 : 0.07);
      ctx.fillStyle = r() < 0.5 ? rgba(dk, a) : rgba(lt, a * (dark ? 1 : 1.6));
      ctx.fillRect(x, y, dpr * (0.6 + r() * 1.4), dpr * (0.6 + r() * 1.4));
    }
    ctx.lineCap = 'round';
    for (var f = 0; f < 70; f++) {
      var fx = r() * size;
      var fy = r() * size;
      ctx.strokeStyle = rgba(dark ? lt : dk, (dark ? 0.025 : 0.03) + r() * 0.04);
      ctx.lineWidth = dpr * 0.7;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + (r() - 0.5) * 24 * dpr, fy + (r() - 0.5) * 24 * dpr, fx + (r() - 0.5) * 40 * dpr, fy + (r() - 0.5) * 40 * dpr);
      ctx.stroke();
    }
    return c;
  }

  function buildVignette(W, H, theme) {
    var c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    var ctx = c.getContext('2d');
    var m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(theme.vignette);
    var edge = theme.vignette;
    var clear = 'rgba(' + m[1] + ',' + m[2] + ',' + m[3] + ',0)';
    var start = theme.key === 'cave' ? 0.2 : 0.35;
    var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * start, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    g.addColorStop(0, clear);
    g.addColorStop(1, edge);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // koyu ekranda kademe halkaları görünmesin: alfaya çok hafif gürültü (ışık sprite'ındakiyle aynı yöntem)
    try {
      var img = ctx.getImageData(0, 0, W, H);
      var d = img.data;
      var seed = 777;
      for (var i = 3; i < d.length; i += 4) {
        if (d[i] === 0) continue;
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        d[i] = Math.max(0, Math.min(255, d[i] + ((seed >>> 24) / 255 - 0.5) * 2.6));
      }
      ctx.putImageData(img, 0, 0);
    } catch (e) {
      /* canvas okunamıyorsa düz vinyet kalır */
    }
    return c;
  }

  /* ---------- Renderer ---------- */

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.quality = 1;
    this.T = 40;
    this.Tp = 40;
    this.W = 1;
    this.H = 1;
    this.cam = { x: 0, y: 0 };
    this.t = 0;
    this.windFx = 0;
    this.atlases = {};
    this.theme = S.Themes.forest;
    this.slowFrames = 0;
    this.reduceMotion = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.resize();
  }

  Renderer.prototype.themeAssets = function () {
    var th = this.theme;
    this.atlas = this.atlases[th.key] || (this.atlases[th.key] = buildAtlas(this.Tp, th));
    this.paper = buildPaper(this.paperSize, this.dpr, th);
    this.paperPat = this.ctx.createPattern(this.paper, 'repeat');
    this.vignette = buildVignette(this.W, this.H, th);
  };

  Renderer.prototype.setTheme = function (key) {
    var th = S.Themes[key] || S.Themes.forest;
    if (th === this.theme) return;
    this.theme = th;
    this.themeAssets();
  };

  Renderer.prototype.resize = function () {
    var w = Math.max(1, root.innerWidth);
    var h = Math.max(1, root.innerHeight);
    var dpr = Math.min(root.devicePixelRatio || 1, 2.5) * this.quality;
    this.cssW = w;
    this.cssH = h;
    this.dpr = dpr;
    this.W = Math.round(w * dpr);
    this.H = Math.round(h * dpr);
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    var T = Util.clamp(Math.round(Math.min(w, h) / 10.5), 30, 58);
    var Tp = Math.max(16, Math.round(T * dpr));
    if (Tp !== this.Tp) this.atlases = {}; // karo boyutu değişti: tüm temaların atlası yeniden çizilir
    this.T = T;
    this.Tp = Tp;
    this.paperSize = Math.round(240 * dpr);
    this.themeAssets();
  };

  /** Çok yavaş cihazlarda çözünürlüğü otomatik düşür. */
  Renderer.prototype.adapt = function (dt) {
    if (dt > 0.038) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 2);
    if (this.slowFrames > 45 && this.quality > 0.55) {
      this.quality = Math.max(0.55, this.quality - 0.2);
      this.slowFrames = 0;
      this.resize();
    }
  };

  Renderer.prototype.snap = function (world) {
    this.cam.x = world.player.x;
    this.cam.y = world.player.y;
  };

  Renderer.prototype.frame = function (world, dt) {
    if (world.theme && world.theme !== this.theme.key) this.setTheme(world.theme);
    var th = this.theme;
    var ctx = this.ctx;
    var W = this.W;
    var H = this.H;
    var Tp = this.Tp;
    var dpr = this.dpr;
    this.t += dt;
    var t = this.t;
    var p = world.player;

    // kamera
    var k = Math.min(1, dt * 7);
    this.cam.x += (p.x - this.cam.x) * k;
    this.cam.y += (p.y - this.cam.y) * k;
    var camX = this.cam.x;
    var camY = this.cam.y;
    var cx0 = W / 2;
    var cy0 = H * (H > W ? 0.46 : 0.5);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = th.paper;
    ctx.fillRect(0, 0, W, H);

    // kâğıt dokusu (haritayla birlikte kayar)
    var ps = this.paperSize;
    var ox = -(((camX * Tp) % ps) + ps) % ps;
    var oy = -(((camY * Tp) % ps) + ps) % ps;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = this.paperPat;
    ctx.fillRect(-ox, -oy, W, H);
    ctx.restore();

    var gx = function (wx) {
      return Math.round(cx0 + (wx - camX) * Tp);
    };
    var gy = function (wy) {
      return Math.round(cy0 + (wy - camY) * Tp);
    };
    var tx0 = Math.floor(camX - cx0 / Tp) - 1;
    var tx1 = Math.ceil(camX + (W - cx0) / Tp) + 1;
    var ty0 = Math.floor(camY - cy0 / Tp) - 1;
    var ty1 = Math.ceil(camY + (H - cy0) / Tp) + 1;

    // kareli defter çizgileri
    ctx.strokeStyle = th.grid;
    ctx.lineWidth = Math.max(1, Math.round(dpr * 0.7));
    ctx.beginPath();
    for (var gxi = tx0; gxi <= tx1; gxi++) {
      var lx = gx(gxi) + 0.5;
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, H);
    }
    for (var gyi = ty0; gyi <= ty1; gyi++) {
      var ly = gy(gyi) + 0.5;
      ctx.moveTo(0, ly);
      ctx.lineTo(W, ly);
    }
    ctx.stroke();

    // fener / aydınlık: görüş alanını vurgular
    var psx = cx0 + (p.x - camX) * Tp;
    var psy = cy0 + (p.y - camY) * Tp;
    if (!th.glowAbove) th.drawGlow(ctx, psx, psy, (world.visR || 3.6) * Tp * th.glowScale, t);

    // karolar
    var w = world.w;
    var h = world.h;
    var dtype = world.dtype;
    var dalpha = world.dalpha;
    var dink = world.dink;
    var atlas = this.atlas;
    var xa = Math.max(0, tx0);
    var xb = Math.min(w - 1, tx1);
    var ya = Math.max(0, ty0);
    var yb = Math.min(h - 1, ty1);
    var wallLike = function (x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      var d = dtype[y * w + x];
      return d === 2 || d === 3;
    };
    for (var y = ya; y <= yb; y++) {
      for (var x = xa; x <= xb; x++) {
        var i = y * w + x;
        var ty = dtype[i];
        if (!ty) continue;
        var a = dalpha[i];
        if (a < 0.015) continue;
        var ink = dink[i];
        var hv = hash2(x, y);
        var sprite;
        if (ty === 1) sprite = floorIdx(ink, hv % 3);
        else {
          var mask = (wallLike(x, y - 1) ? 0 : 1) | (wallLike(x + 1, y) ? 0 : 2) | (wallLike(x, y + 1) ? 0 : 4) | (wallLike(x - 1, y) ? 0 : 8);
          sprite = ty === 3 ? mirrorIdx(ink, mask) : wallIdx(ink, hv % 2, mask);
        }
        var dx = gx(x);
        var dy = gy(y);
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(atlas, (sprite % COLS) * Tp, Math.floor(sprite / COLS) * Tp, Tp, Tp, dx, dy, Tp, Tp);
        if (a < 0.75 && !ink) {
          var sm = SMUDGE + (hv % 3);
          ctx.globalAlpha = (0.75 - a) * 1.2;
          ctx.drawImage(atlas, (sm % COLS) * Tp, Math.floor(sm / COLS) * Tp, Tp, Tp, dx, dy, Tp, Tp);
        }
        if (ty === 1 && world.wind[i] && a > 0.08) {
          var wg = WINDG + (hv % 2);
          ctx.globalAlpha = a * 0.85;
          ctx.drawImage(atlas, (wg % COLS) * Tp, Math.floor(wg / COLS) * Tp, Tp, Tp, dx, dy, Tp, Tp);
        }
      }
    }
    ctx.globalAlpha = 1;

    // mağarada fener ışığı karoların üstüne biner: silinme lekeleri ışıkta siyah kir gibi görünmesin
    if (th.glowAbove) th.drawGlow(ctx, psx, psy, (world.visR || 3.6) * Tp * th.glowScale, t);

    // iz (kalemle/tebeşirle çizilmiş yürüyüş yolu)
    var trail = world.trail;
    if (trail.length > 1) {
      var buckets = [[], [], [], [], [], []];
      for (var q = 1; q < trail.length; q++) {
        var a0 = trail[q - 1];
        var a1 = trail[q];
        if (Math.hypot(a1.x - a0.x, a1.y - a0.y) > 0.9) continue;
        var sa = Math.min(world.strength(a0.age), world.strength(a1.age));
        if (sa < 0.04) continue;
        buckets[Math.min(5, Math.floor(sa * 6))].push(q);
      }
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.4, Tp * 0.045);
      ctx.setLineDash([Tp * 0.1, Tp * 0.09]);
      for (var b = 0; b < 6; b++) {
        if (!buckets[b].length) continue;
        ctx.strokeStyle = rgba(th.trail, 0.12 + (b + 0.5) * 0.065);
        ctx.beginPath();
        for (var bi = 0; bi < buckets[b].length; bi++) {
          var qq = buckets[b][bi];
          ctx.moveTo(cx0 + (trail[qq - 1].x - camX) * Tp, cy0 + (trail[qq - 1].y - camY) * Tp);
          ctx.lineTo(cx0 + (trail[qq].x - camX) * Tp, cy0 + (trail[qq].y - camY) * Tp);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // nesneler (yalnızca haritada görünür olan hücrelerde)
    var visibleAt = function (cx, cy) {
      var j = cy * w + cx;
      return dtype[j] === 1 && !world.dghost[j] ? Math.min(1, dalpha[j]) : 0; // ayna hayaleti gerçek nesneyi göstermez
    };
    var door = world.maze.door;
    var da = visibleAt(door.x, door.y);
    if (da > 0.02) {
      ctx.globalAlpha = da;
      th.drawDoor(ctx, gx(door.x), gy(door.y), Tp, world.hasKey, world.state === 'play' ? 0 : Math.min(1, world.exitT * 1.6), t);
      ctx.globalAlpha = 1;
    }
    if (!world.hasKey) {
      var ky = world.maze.key;
      var ka = visibleAt(ky.x, ky.y);
      if (ka > 0.02) {
        ctx.globalAlpha = ka;
        th.drawKey(ctx, gx(ky.x) + Tp / 2, gy(ky.y) + Tp / 2, Tp, t);
        ctx.globalAlpha = 1;
      }
    }
    for (var fi = 0; fi < world.flowers.length; fi++) {
      var fl = world.flowers[fi];
      if (fl.taken) continue;
      var fa = visibleAt(fl.x, fl.y);
      if (fa < 0.02) {
        // mağarada mantarlar karanlıkta bile hafifçe parlar: yakındaysa ışığı seçilir
        if (th.drawBeacon) {
          var bd = Math.hypot(fl.x + 0.5 - p.x, fl.y + 0.5 - p.y);
          var br = (world.visR || 3.6) * 2.3;
          if (bd < br) th.drawBeacon(ctx, gx(fl.x) + Tp / 2, gy(fl.y) + Tp / 2, Tp, t, 1 - bd / br);
        }
        continue;
      }
      ctx.globalAlpha = fa;
      th.drawPickup(ctx, gx(fl.x) + Tp / 2, gy(fl.y) + Tp / 2, Tp, t);
      ctx.globalAlpha = 1;
    }
    for (var si = 0; si < world.stones.length; si++) {
      var st = world.stones[si];
      var scx = gx(st.cx) + Tp / 2;
      var scy = gy(st.cy) + Tp / 2;
      var grow = Math.min(1, (world.t - st.born) * 5);
      ctx.globalAlpha = grow;
      th.drawStone(ctx, scx, scy, Tp, st.type, t, st.born);
      if (st.type === 'sound') {
        if (st.dir) th.drawArrow(ctx, scx, scy, Tp, st.dir, t);
        if (st.atGoal) th.drawGoalMark(ctx, scx, scy, Tp, t);
      }
      ctx.globalAlpha = 1;
    }

    // oyuncu
    th.drawPlayer(ctx, psx, psy, Tp, p, t, world.state === 'play' ? 1 : Math.max(0, 1 - world.exitT * 0.9));

    // parçacıklar
    var parts = world.particles;
    for (var pi = 0; pi < parts.length; pi++) {
      var pt = parts[pi];
      var u = pt.life / pt.max;
      var sx = cx0 + (pt.x - camX) * Tp;
      var sy = cy0 + (pt.y - camY) * Tp;
      if (pt.kind === 'ring') {
        var rr = (0.35 + 2.7 * (1 - Math.pow(1 - u, 3))) * Tp;
        ctx.strokeStyle = rgba(th.ringRGB(pt.color), (1 - u) * 0.7);
        ctx.lineWidth = Math.max(1.5, Tp * 0.06 * (1 - u));
        ctx.beginPath();
        ctx.arc(sx, sy, rr, 0, 6.3);
        ctx.stroke();
      } else if (pt.kind === 'paper') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(pt.rot);
        ctx.globalAlpha = Math.min(1, (1 - u) * 1.6);
        ctx.fillStyle = pt.color;
        ctx.fillRect(-pt.size * Tp, -pt.size * Tp * 0.6, pt.size * Tp * 2, pt.size * Tp * 1.2);
        ctx.restore();
      } else {
        ctx.globalAlpha = (1 - u) * (pt.kind === 'crumb' ? 0.55 : 0.9);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.8, pt.size * Tp), 0, 6.3);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // atmosfer: ateş böcekleri / toz
    if (!this.reduceMotion) th.drawAmbient(ctx, W, H, t, dpr);

    // rüzgâr / cereyan çizgileri (ekran uzayı)
    this.windFx += ((world.inWind ? 1 : 0) - this.windFx) * Math.min(1, dt * 3);
    if (this.windFx > 0.02) th.drawWindFx(ctx, W, H, t, dpr, this.windFx);

    // vinyet
    ctx.drawImage(this.vignette, 0, 0);
  };

  S.Renderer = Renderer;
})(window);
