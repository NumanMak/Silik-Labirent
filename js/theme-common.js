/* Silik — tema altyapısı: orman ve mağara temalarının ortak çizim yardımcıları.
 *
 * Her tema (js/theme-forest.js, js/theme-cave.js) Silik.Themes[anahtar] altında şunları sağlar:
 *   renkler  : paper, grid, pencil, ink, teal, smudge, trail, vignette, speck
 *   karolar  : paintWall, paintMirror, paintFloor, paintWind   (atlas açılışta bir kez çizer)
 *   nesneler : drawDoor, drawKey, drawPickup, drawStone, drawArrow, drawGoalMark, drawPlayer
 *   atmosfer : drawGlow, drawAmbient, drawWindFx, ringRGB
 */
(function (root) {
  'use strict';
  var S = (root.Silik = root.Silik || {});

  var K = {};

  K.rgba = function (c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  };

  K.hash2 = function (x, y) {
    return ((Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0) % 9973;
  };

  /** Hafifçe titreyen elle çizilmiş çizgi. */
  K.wobble = function (ctx, x0, y0, x1, y1, rand, amp, segs) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (var s = 1; s < segs; s++) {
      var t = s / segs;
      ctx.lineTo(x0 + (x1 - x0) * t + (rand() - 0.5) * amp, y0 + (y1 - y0) * t + (rand() - 0.5) * amp);
    }
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  /** Dört uçlu parıltı yolu (doldurmak için). */
  K.star4 = function (ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
  };

  /** Mevcut yolu doldur ve/veya çiz (kalem çizgisi görünümü). */
  K.pen = function (ctx, fill, stroke, lw) {
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  /** (x0,y0)->(x1,y1) arasında, (nx,ny) yönüne doğru şişen n adet yay ekler (yaprak/çalı kenarı). */
  K.scallop = function (ctx, x0, y0, x1, y1, nx, ny, amp, n) {
    for (var i = 0; i < n; i++) {
      var ax = x0 + ((x1 - x0) * i) / n;
      var ay = y0 + ((y1 - y0) * i) / n;
      var bx = x0 + ((x1 - x0) * (i + 1)) / n;
      var by = y0 + ((y1 - y0) * (i + 1)) / n;
      ctx.quadraticCurveTo((ax + bx) / 2 + nx * amp * 2, (ay + by) / 2 + ny * amp * 2, bx, by);
    }
  };

  /** (x0,y0)->(x1,y1) arasında kırık (sivri) bir çizgi ekler; kaya kenarı. */
  K.jagged = function (ctx, x0, y0, x1, y1, nx, ny, amp, n, rand) {
    for (var i = 1; i <= n; i++) {
      var t = i / n;
      var off = i === n ? 0 : (rand() - 0.5) * 2 * amp;
      ctx.lineTo(x0 + (x1 - x0) * t + nx * off, y0 + (y1 - y0) * t + ny * off);
    }
  };

  /** Karenin yalnızca iki komşu kenarı açıkta olan köşelerini yuvarlatan yol (mask: 1 üst, 2 sağ, 4 alt, 8 sol). */
  K.softCorners = function (ctx, T, mask, r) {
    var tl = mask & 1 && mask & 8 ? r : 0;
    var tr = mask & 1 && mask & 2 ? r : 0;
    var br = mask & 4 && mask & 2 ? r : 0;
    var bl = mask & 4 && mask & 8 ? r : 0;
    ctx.beginPath();
    ctx.moveTo(tl, 0);
    ctx.lineTo(T - tr, 0);
    if (tr) ctx.quadraticCurveTo(T, 0, T, tr);
    ctx.lineTo(T, T - br);
    if (br) ctx.quadraticCurveTo(T, T, T - br, T);
    ctx.lineTo(bl, T);
    if (bl) ctx.quadraticCurveTo(0, T, 0, T - bl);
    ctx.lineTo(0, tl);
    if (tl) ctx.quadraticCurveTo(0, 0, tl, 0);
    ctx.closePath();
  };

  /** Küçük, yumuşak bir ışık lekesi (ateş böceği, toz, mantar ışığı) için önceden çizilmiş sprite. */
  K.glowSprite = function (size, rgb) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',1)');
    gr.addColorStop(0.35, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.35)');
    gr.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  };

  S.Themes = S.Themes || {};
  S.ThemeKit = K;
})(window);
