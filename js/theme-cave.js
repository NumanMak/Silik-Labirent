/* Silik — 2. Sezon · Mağara teması.
 * Yer altı, fener ışığında: kara kâğıt üzerine tebeşirle çizim. Duvarlar sivri kenarlı kaya, zemin toz ve çakıl,
 * ayna yerine kristal, kapı kilitli bir taş kemer, toplanabilirler parlayan mantar. Kalıcı (mürekkepli) alan
 * fener gibi kehribar rengiyle parlar. Oyuncunun fenerinin ışığı görüş yarıçapıyla birlikte küçülür.
 */
(function (root) {
  'use strict';
  var S = root.Silik;
  var K = S.ThemeKit;
  var rgba = K.rgba;
  var pen = K.pen;

  var CHALK = [222, 218, 204];
  var INK = [255, 186, 84];
  var TEAL = [96, 204, 212];

  /* ---------- karolar ---------- */

  function tri(ctx, ax, ay, bx, by, cx, cy) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
  }

  function paintWall(ctx, T, mask, v, ink, rand) {
    var col = ink ? INK : CHALK;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, T, T);
    ctx.clip();
    ctx.fillStyle = ink ? 'rgba(255,168,60,0.22)' : 'rgba(178,190,208,0.11)';
    ctx.fillRect(0, 0, T, T);
    // kaya yüzeyleri: koyu ve açık üçgen kesitler
    for (var f = 0; f < 4; f++) {
      var bx = rand() * T;
      var by = rand() * T;
      tri(ctx, bx, by, bx + (rand() - 0.3) * T * 0.7, by + (rand() - 0.5) * T * 0.6, bx + (rand() - 0.5) * T * 0.6, by + (rand() * 0.7 + 0.2) * T * 0.7);
      ctx.fillStyle = f % 2 ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.045)';
      ctx.fill();
    }
    // kırık çapraz tarama (komşu karolarla aynı ritimde)
    var sp = T / 5;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, T * 0.028);
    for (var h = -T; h < T * 2; h += sp) {
      ctx.strokeStyle = rgba(col, (ink ? 0.5 : 0.3) * (0.7 + rand() * 0.5));
      // iki parçaya bölünmüş çizgi: tebeşirin kesik kesik tutması
      var cut = 0.3 + rand() * 0.4;
      var jx = (rand() - 0.5) * T * 0.02;
      ctx.beginPath();
      ctx.moveTo(h + jx, T);
      ctx.lineTo(h + T * cut + jx, T * (1 - cut));
      ctx.moveTo(h + T * (cut + 0.08) + jx, T * (1 - cut - 0.08));
      ctx.lineTo(h + T + jx, 0);
      ctx.stroke();
    }
    // katman çizgileri
    ctx.strokeStyle = rgba(col, ink ? 0.45 : 0.22);
    ctx.lineWidth = Math.max(1, T * 0.022);
    for (var s = 0; s < 2; s++) {
      var sy = T * (0.2 + rand() * 0.6);
      ctx.beginPath();
      ctx.moveTo(T * rand() * 0.3, sy);
      ctx.lineTo(T * (0.4 + rand() * 0.2), sy + (rand() - 0.5) * T * 0.15);
      ctx.lineTo(T * (0.7 + rand() * 0.3), sy + (rand() - 0.5) * T * 0.2);
      ctx.stroke();
    }
    // tebeşir tozu
    ctx.fillStyle = rgba(col, ink ? 0.55 : 0.4);
    for (var d = 0; d < 7; d++) {
      ctx.beginPath();
      ctx.arc(rand() * T, rand() * T, Math.max(0.7, T * 0.012), 0, 6.3);
      ctx.fill();
    }
    if (v === 1) {
      // minik parlak damar noktaları
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      K.star4(ctx, T * (0.2 + rand() * 0.6), T * (0.2 + rand() * 0.6), T * 0.045);
      ctx.fill();
    }
    ctx.restore();

    // sivri dış hat: yalnızca açıkta kalan kenarlar
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    var a = T * 0.04;
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = rgba(col, pass ? 0.38 : ink ? 0.98 : 0.86);
      ctx.lineWidth = pass ? Math.max(1, T * 0.026) : Math.max(1.4, T * 0.052);
      var o = pass ? T * 0.022 : T * 0.026;
      var r2 = pass ? function () { return rand() * 0.7; } : rand;
      if (mask & 1) {
        ctx.beginPath();
        ctx.moveTo(0, o);
        K.jagged(ctx, 0, o, T, o, 0, 1, a, 6, r2);
        ctx.stroke();
      }
      if (mask & 2) {
        ctx.beginPath();
        ctx.moveTo(T - o, 0);
        K.jagged(ctx, T - o, 0, T - o, T, 1, 0, a, 6, r2);
        ctx.stroke();
      }
      if (mask & 4) {
        ctx.beginPath();
        ctx.moveTo(T, T - o);
        K.jagged(ctx, T, T - o, 0, T - o, 0, 1, a, 6, r2);
        ctx.stroke();
      }
      if (mask & 8) {
        ctx.beginPath();
        ctx.moveTo(o, T);
        K.jagged(ctx, o, T, o, 0, 1, 0, a, 6, r2);
        ctx.stroke();
      }
    }
  }

  function paintFloor(ctx, T, v, ink, rand) {
    ctx.fillStyle = ink ? 'rgba(255,176,70,0.14)' : 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, 0, T, T);
    var col = ink ? INK : CHALK;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var lw = Math.max(1, T * 0.022);
    // çakıllar
    var n = v === 0 ? 2 : 3;
    for (var i = 0; i < n; i++) {
      var x = T * (0.14 + rand() * 0.72);
      var y = T * (0.14 + rand() * 0.72);
      ctx.strokeStyle = rgba(col, ink ? 0.5 : 0.24);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(x, y, T * (0.03 + rand() * 0.035), T * (0.022 + rand() * 0.025), rand() * 3, 0, 6.3);
      ctx.stroke();
    }
    // çatlak
    if (v === 1) {
      ctx.strokeStyle = rgba(col, ink ? 0.45 : 0.18);
      var cx = T * (0.2 + rand() * 0.3);
      var cy = T * (0.25 + rand() * 0.5);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + T * 0.12, cy - T * 0.06);
      ctx.lineTo(cx + T * 0.2, cy + T * 0.03);
      ctx.lineTo(cx + T * 0.32, cy - T * 0.04);
      ctx.stroke();
    }
    // toz noktaları
    ctx.fillStyle = rgba(col, ink ? 0.55 : 0.22);
    for (var d = 0; d < (ink ? 6 : 4); d++) {
      ctx.beginPath();
      ctx.arc(T * (0.08 + rand() * 0.84), T * (0.08 + rand() * 0.84), Math.max(0.7, T * 0.011), 0, 6.3);
      ctx.fill();
    }
  }

  function prism(ctx, x, baseY, w, h, tilt, hi) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, baseY);
    ctx.lineTo(x - w / 2, baseY - h * 0.7);
    ctx.lineTo(x + tilt, baseY - h);
    ctx.lineTo(x + w / 2, baseY - h * 0.7);
    ctx.lineTo(x + w / 2, baseY);
    ctx.closePath();
    var g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, 'rgba(120,230,240,0.78)');
    g.addColorStop(1, hi ? 'rgba(170,150,250,0.78)' : 'rgba(110,170,240,0.78)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,250,255,0.95)';
    ctx.lineWidth = Math.max(1, w * 0.12);
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + tilt * 0.3, baseY);
    ctx.lineTo(x + tilt, baseY - h);
    ctx.strokeStyle = 'rgba(210,252,255,0.6)';
    ctx.lineWidth = Math.max(1, w * 0.08);
    ctx.stroke();
  }

  /** Ayna = kristal kümesi: ışığı yansıtır, haritaya sahte koridorlar çizer. */
  function paintMirror(ctx, T, mask, ink, rand) {
    paintWall(ctx, T, mask, 0, ink, rand); // kristal, kayanın içinden büyür
    ctx.fillStyle = ink ? 'rgba(110,214,236,0.34)' : 'rgba(100,206,232,0.22)';
    ctx.fillRect(0, 0, T, T);
    var g = ctx.createRadialGradient(T * 0.5, T * 0.55, 0, T * 0.5, T * 0.55, T * 0.7);
    g.addColorStop(0, 'rgba(160,240,255,0.38)');
    g.addColorStop(1, 'rgba(160,240,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, T, T);
    prism(ctx, T * 0.3, T * 0.9, T * 0.2, T * 0.5, T * 0.02, false);
    prism(ctx, T * 0.68, T * 0.92, T * 0.22, T * 0.62, -T * 0.02, true);
    prism(ctx, T * 0.49, T * 0.95, T * 0.26, T * 0.8, T * 0.03, false);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    K.star4(ctx, T * 0.56, T * 0.26, T * 0.085);
    ctx.fill();
    K.star4(ctx, T * 0.22, T * 0.5, T * 0.05);
    ctx.fill();
    // çerçeve: dört kenar, parlak
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = rgba(TEAL, pass ? 0.4 : 0.95);
      ctx.lineWidth = pass ? Math.max(1, T * 0.03) : Math.max(1.6, T * 0.06);
      var i = T * 0.03 + (pass ? T * 0.02 : 0);
      if (mask & 1) K.wobble(ctx, 0, i, T, i, rand, T * 0.015, 5);
      if (mask & 2) K.wobble(ctx, T - i, 0, T - i, T, rand, T * 0.015, 5);
      if (mask & 4) K.wobble(ctx, 0, T - i, T, T - i, rand, T * 0.015, 5);
      if (mask & 8) K.wobble(ctx, i, 0, i, T, rand, T * 0.015, 5);
    }
  }

  function paintWind(ctx, T, v) {
    ctx.strokeStyle = 'rgba(160,200,232,0.62)';
    ctx.lineWidth = Math.max(1.2, T * 0.04);
    ctx.lineCap = 'round';
    var y = T * (v ? 0.62 : 0.4);
    [[0.12, 0.0], [0.2, 0.17]].forEach(function (l, i) {
      var yy = y + l[1] * T;
      ctx.beginPath();
      ctx.moveTo(T * l[0], yy);
      ctx.bezierCurveTo(T * (l[0] + 0.16), yy - T * 0.14, T * (l[0] + 0.32), yy + T * 0.12, T * (l[0] + 0.5), yy);
      if (i === 0) ctx.bezierCurveTo(T * 0.72, yy - T * 0.06, T * 0.8, yy, T * 0.84, yy - T * 0.06);
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(214,226,240,0.7)';
    [[0.74, 0.3], [0.82, 0.42], [0.66, 0.22], [0.86, 0.6]].forEach(function (d) {
      ctx.beginPath();
      ctx.arc(T * d[0], T * (d[1] + (v ? 0.2 : 0)), Math.max(0.9, T * 0.016), 0, 6.3);
      ctx.fill();
    });
  }

  /* ---------- nesneler ---------- */

  function drawKey(ctx, cx, cy, s, t) {
    ctx.save();
    ctx.translate(cx, cy + Math.sin(t * 2.4) * s * 0.04);
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.7);
    g.addColorStop(0, 'rgba(255,200,100,' + (0.55 + Math.sin(t * 3) * 0.12) + ')');
    g.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(-0.65 + Math.sin(t * 1.7) * 0.08);
    var lw = Math.max(1.5, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(-0.08 * s, 0);
    ctx.lineTo(0.3 * s, 0);
    ctx.lineTo(0.3 * s, 0.1 * s);
    ctx.moveTo(0.2 * s, 0);
    ctx.lineTo(0.2 * s, 0.08 * s);
    pen(ctx, null, '#3a2808', lw * 1.5);
    ctx.beginPath();
    ctx.moveTo(-0.08 * s, 0);
    ctx.lineTo(0.3 * s, 0);
    ctx.lineTo(0.3 * s, 0.1 * s);
    ctx.moveTo(0.2 * s, 0);
    ctx.lineTo(0.2 * s, 0.08 * s);
    pen(ctx, null, '#ffd36a', lw * 0.9);
    ctx.beginPath();
    ctx.arc(-0.2 * s, 0, 0.14 * s, 0, 6.3);
    ctx.moveTo(-0.1 * s, 0);
    ctx.arc(-0.2 * s, 0, 0.065 * s, 0, 6.3, true);
    pen(ctx, '#f4bf46', '#3a2808', lw);
    ctx.restore();
  }

  /** Kapı: taş kemer. Kilitliyken demir parmaklık, anahtar varken içerden kehribar ışık sızar. */
  function drawDoor(ctx, x, y, s, hasKey, open, t) {
    var cx = x + s / 2;
    var lw = Math.max(1.6, s * 0.05);
    var top = y + s * 0.1;
    var base = y + s * 0.94;
    if (hasKey) {
      var pulse = 0.55 + Math.sin(t * 4) * 0.2 + open * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(cx, y + s * 0.55, s * 0.05, cx, y + s * 0.55, s * 1.0);
      g.addColorStop(0, 'rgba(255,190,90,' + Math.min(0.9, pulse * 0.62) + ')');
      g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - s * 0.6, y - s * 0.5, s * 2.2, s * 2);
      ctx.restore();
    }
    // taş çerçeve
    ctx.beginPath();
    ctx.moveTo(x + 0.1 * s, base);
    ctx.lineTo(x + 0.1 * s, y + 0.42 * s);
    ctx.arc(cx, y + 0.42 * s, 0.4 * s, Math.PI, 0);
    ctx.lineTo(x + 0.9 * s, base);
    ctx.closePath();
    pen(ctx, 'rgba(150,160,176,0.55)', 'rgba(228,224,210,0.95)', lw);
    // taş blok çizgileri
    ctx.strokeStyle = 'rgba(228,224,210,0.45)';
    ctx.lineWidth = lw * 0.55;
    for (var b = 0; b < 4; b++) {
      var ang = Math.PI + (b + 0.5) * (Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 0.27 * s, y + 0.42 * s + Math.sin(ang) * 0.27 * s);
      ctx.lineTo(cx + Math.cos(ang) * 0.4 * s, y + 0.42 * s + Math.sin(ang) * 0.4 * s);
      ctx.stroke();
    }
    // iç açıklık
    ctx.beginPath();
    ctx.moveTo(x + 0.24 * s, base);
    ctx.lineTo(x + 0.24 * s, y + 0.42 * s);
    ctx.arc(cx, y + 0.42 * s, 0.26 * s, Math.PI, 0);
    ctx.lineTo(x + 0.76 * s, base);
    ctx.closePath();
    var inner = hasKey
      ? 'rgba(255,' + Math.round(196 + open * 40) + ',' + Math.round(110 + open * 70) + ',' + (0.55 + open * 0.4) + ')'
      : 'rgba(6,8,12,0.88)';
    pen(ctx, inner, 'rgba(228,224,210,0.9)', lw * 0.8);
    // rün: elmas + nokta; anahtar varken parlar
    ctx.strokeStyle = hasKey ? 'rgba(255,236,170,0.95)' : 'rgba(150,170,196,0.75)';
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx, y + 0.22 * s);
    ctx.lineTo(cx + 0.08 * s, y + 0.32 * s);
    ctx.lineTo(cx, y + 0.42 * s);
    ctx.lineTo(cx - 0.08 * s, y + 0.32 * s);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(cx, y + 0.32 * s, 0.018 * s, 0, 6.3);
    ctx.fill();
    if (!hasKey) {
      // demir parmaklık + asma kilit
      ctx.strokeStyle = 'rgba(200,204,214,0.85)';
      ctx.lineWidth = lw * 0.9;
      for (var k = 0; k < 3; k++) {
        var bx = x + (0.34 + k * 0.16) * s;
        ctx.beginPath();
        ctx.moveTo(bx, y + 0.5 * s);
        ctx.lineTo(bx, base);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, y + 0.66 * s, 0.06 * s, Math.PI, 0);
      pen(ctx, null, '#1a1a1a', lw * 0.9);
      ctx.beginPath();
      ctx.rect(cx - 0.085 * s, y + 0.66 * s, 0.17 * s, 0.13 * s);
      pen(ctx, '#f0b64a', '#1a1a1a', lw * 0.8);
    }
    void top;
  }

  /** Toplanabilir: parlayan mantar kümesi. */
  function drawPickup(ctx, cx, cy, s, t) {
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + cx * 0.013);
    var lw = Math.max(1.3, s * 0.045);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.7);
    g.addColorStop(0, 'rgba(110,235,225,' + (0.3 + 0.25 * pulse) + ')');
    g.addColorStop(1, 'rgba(110,235,225,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
    ctx.restore();
    function mush(x, y, r, tilt, cap) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      // sap
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, 0);
      ctx.quadraticCurveTo(-r * 0.2, r * 0.7, -r * 0.34, r * 1.05);
      ctx.lineTo(r * 0.34, r * 1.05);
      ctx.quadraticCurveTo(r * 0.2, r * 0.7, r * 0.28, 0);
      ctx.closePath();
      pen(ctx, 'rgba(236,240,226,0.95)', 'rgba(40,80,84,0.9)', lw * 0.8);
      // şapka
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.bezierCurveTo(-r, -r * 1.05, r, -r * 1.05, r, 0);
      ctx.quadraticCurveTo(0, r * 0.25, -r, 0);
      ctx.closePath();
      pen(ctx, cap, 'rgba(18,70,76,0.95)', lw);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      [[-0.4, -0.34, 0.14], [0.1, -0.55, 0.17], [0.46, -0.28, 0.12]].forEach(function (d) {
        ctx.beginPath();
        ctx.arc(d[0] * r, d[1] * r, d[2] * r, 0, 6.3);
        ctx.fill();
      });
      ctx.restore();
    }
    mush(cx - s * 0.2, cy + s * 0.05, s * 0.13, -0.22, 'rgba(236,140,190,0.92)');
    mush(cx + s * 0.19, cy + s * 0.08, s * 0.11, 0.25, 'rgba(160,150,250,0.92)');
    mush(cx, cy - s * 0.02, s * 0.19, 0, 'rgba(100,226,218,0.95)');
  }

  function drawStone(ctx, cx, cy, s, type, t, born) {
    var lw = Math.max(1.4, s * 0.05);
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + born);
    var col = type === 'sound' ? TEAL : INK;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.55);
    g.addColorStop(0, rgba(col, 0.28 + 0.12 * pulse));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, s * (0.3 + pulse * 0.04), 0, 6.3);
    ctx.setLineDash([s * 0.06, s * 0.06]);
    ctx.strokeStyle = rgba(col, 0.8);
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    ctx.setLineDash([]);
    if (type === 'sound') {
      // yankı taşı: kesilmiş kristal
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.2);
      ctx.lineTo(cx + s * 0.15, cy - s * 0.02);
      ctx.lineTo(cx + s * 0.08, cy + s * 0.17);
      ctx.lineTo(cx - s * 0.08, cy + s * 0.17);
      ctx.lineTo(cx - s * 0.15, cy - s * 0.02);
      ctx.closePath();
      pen(ctx, 'rgba(110,214,224,0.95)', 'rgba(220,252,255,0.95)', lw);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.15, cy - s * 0.02);
      ctx.lineTo(cx + s * 0.15, cy - s * 0.02);
      ctx.moveTo(cx, cy - s * 0.2);
      ctx.lineTo(cx - s * 0.03, cy + s * 0.17);
      pen(ctx, null, 'rgba(220,252,255,0.6)', lw * 0.6);
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, cy + s * 0.02, s * 0.2, s * 0.155, -0.3, 0, 6.3);
      pen(ctx, '#aeb4bf', '#2a2f38', lw);
      ctx.beginPath();
      ctx.arc(cx - s * 0.06, cy - s * 0.04, s * 0.06, 3.6, 5.2);
      pen(ctx, null, 'rgba(255,255,255,0.7)', lw * 0.8);
    }
  }

  function drawArrow(ctx, cx, cy, s, dir, t) {
    var bob = Math.sin(t * 3.2) * s * 0.035;
    var dx = dir.dx;
    var dy = dir.dy;
    var tail = s * 0.26;
    var tip = s * 0.5 + bob;
    var lw = Math.max(2, s * 0.075);
    ctx.save();
    ctx.shadowColor = 'rgba(96,204,212,0.9)';
    ctx.shadowBlur = s * 0.2;
    ctx.strokeStyle = rgba(TEAL, 0.98);
    ctx.fillStyle = rgba(TEAL, 0.98);
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + dx * tail, cy + dy * tail);
    ctx.lineTo(cx + dx * (tip - s * 0.08), cy + dy * (tip - s * 0.08));
    ctx.stroke();
    var hx = cx + dx * (tip + s * 0.06);
    var hy = cy + dy * (tip + s * 0.06);
    var px = -dy;
    var py = dx;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - dx * s * 0.17 + px * s * 0.11, hy - dy * s * 0.17 + py * s * 0.11);
    ctx.lineTo(hx - dx * s * 0.17 - px * s * 0.11, hy - dy * s * 0.17 - py * s * 0.11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = lw * 0.55;
    ctx.lineCap = 'round';
    for (var i = 0; i < 2; i++) {
      var r = s * (0.36 + i * 0.1 + ((t * 0.9) % 1) * 0.08);
      var a0 = Math.atan2(dy, dx);
      ctx.strokeStyle = rgba(TEAL, 0.55 - i * 0.2);
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0 - 0.5, a0 + 0.5);
      ctx.stroke();
    }
  }

  function drawGoalMark(ctx, cx, cy, s, t) {
    ctx.strokeStyle = rgba(TEAL, 0.95);
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * 6.283 + t;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * s * 0.34, cy + Math.sin(a) * s * 0.34);
      ctx.lineTo(cx + Math.cos(a) * s * 0.46, cy + Math.sin(a) * s * 0.46);
      ctx.stroke();
    }
  }

  /** Soluk mavi pelerinli gezgin; yanında kehribar bir fener taşır. */
  function drawPlayer(ctx, cx, cy, s, p, t, alpha) {
    var bob = p.moving ? Math.sin(p.walk * 7.5) : Math.sin(t * 2) * 0.35;
    var sq = 1 + bob * 0.05;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.2, s * 0.24, s * 0.09, 0, 0, 6.3);
    ctx.fill();
    ctx.translate(cx, cy - s * 0.04 - Math.abs(bob) * s * 0.025);
    ctx.scale(1 / sq, sq);
    var lw = Math.max(1.5, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.34);
    ctx.bezierCurveTo(s * 0.12, -s * 0.2, s * 0.26, -s * 0.06, s * 0.25, s * 0.1);
    ctx.bezierCurveTo(s * 0.24, s * 0.22, s * 0.1, s * 0.26, 0, s * 0.26);
    ctx.bezierCurveTo(-s * 0.1, s * 0.26, -s * 0.24, s * 0.22, -s * 0.25, s * 0.1);
    ctx.bezierCurveTo(-s * 0.26, -s * 0.06, -s * 0.12, -s * 0.2, 0, -s * 0.34);
    ctx.closePath();
    pen(ctx, '#aebfd6', '#0a1018', lw * 1.2);
    ctx.strokeStyle = 'rgba(20,34,52,0.5)';
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.2);
    ctx.quadraticCurveTo(0, s * 0.1, s * 0.12, s * 0.2);
    ctx.stroke();
    var fx = Math.cos(p.face) * s * 0.07;
    var fy = Math.sin(p.face) * s * 0.05;
    ctx.beginPath();
    ctx.ellipse(fx, -s * 0.02 + fy, s * 0.15, s * 0.12, 0, 0, 6.3);
    pen(ctx, '#1b2330', null, 0);
    ctx.fillStyle = '#f4ecd2';
    var ex = Math.cos(p.face) * s * 0.045;
    var ey = Math.sin(p.face) * s * 0.035;
    ctx.beginPath();
    ctx.arc(fx - s * 0.05 + ex, -s * 0.02 + fy + ey, s * 0.03, 0, 6.3);
    ctx.arc(fx + s * 0.05 + ex, -s * 0.02 + fy + ey, s * 0.03, 0, 6.3);
    ctx.fill();
    // fener
    var sw = Math.sin(t * 3) * 0.06;
    ctx.translate(s * 0.27, s * 0.02);
    ctx.rotate(sw);
    ctx.strokeStyle = '#0a1018';
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.12);
    ctx.lineTo(0, -s * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(-s * 0.05, -s * 0.05, s * 0.1, s * 0.13);
    pen(ctx, '#ffc866', '#0a1018', lw * 0.8);
    ctx.restore();
  }

  /* ---------- atmosfer ---------- */

  var glowCache = {};
  /** Işık sprite'ı: yumuşak gradyan + alfa kanalına gürültü (dither) -> kademeli halkalar (banding) görünmez. */
  function glowSprite(R) {
    var key = Math.round(R);
    if (glowCache[key]) return glowCache[key];
    var size = Math.ceil(R * 2);
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var gl = g.createRadialGradient(size / 2, size / 2, R * 0.05, size / 2, size / 2, R);
    var stops = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
    stops.forEach(function (u) {
      var a = Math.pow(1 - u, 2.2) * 0.55; // yumuşak sönüm
      gl.addColorStop(u, 'rgba(255,' + Math.round(176 - u * 20) + ',' + Math.round(88 - u * 20) + ',' + a + ')');
    });
    g.fillStyle = gl;
    g.fillRect(0, 0, size, size);
    var img = g.getImageData(0, 0, size, size);
    var d = img.data;
    var seed = 12345;
    for (var i = 3; i < d.length; i += 4) {
      if (d[i] === 0) continue;
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0; // hızlı rastgele sayı
      var n = ((seed >>> 24) / 255 - 0.5) * 2.6;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
    }
    g.putImageData(img, 0, 0);
    glowCache = {}; // yalnızca son boyutu tut (bellek)
    glowCache[key] = c;
    return c;
  }

  /** Fener: oyuncunun etrafını sıcak bir ışıkla aydınlatır (hafifçe titrer). */
  function drawGlow(ctx, x, y, r, t) {
    var f = 0.94 + 0.06 * Math.sin(t * 9.1) * Math.sin(t * 5.3 + 1.2);
    var sprite = glowSprite(r);
    var D = sprite.width * (0.985 + 0.015 * f);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = f;
    ctx.drawImage(sprite, x - D / 2, y - D / 2, D, D);
    ctx.restore();
  }

  var beaconSprite = null;
  /** Parlayan mantar: karanlıkta, görüş dışındayken bile soluk pembe bir ışık verir (k: 0..1 yakınlık). */
  function drawBeacon(ctx, cx, cy, s, t, k) {
    if (!beaconSprite) beaconSprite = K.glowSprite(64, [238, 147, 184]);
    var D = s * 2.3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, 0.95 * (0.3 + 0.7 * k) * (0.7 + 0.3 * Math.sin(t * 2.1 + cx * 0.013 + cy * 0.017)));
    ctx.drawImage(beaconSprite, cx - D / 2, cy - D / 2, D, D);
    ctx.restore();
  }

  var dust = null;
  /** Havada süzülen toz zerreleri. */
  function drawAmbient(ctx, W, H, t, dpr) {
    if (!dust) dust = K.glowSprite(32, [255, 214, 150]); // fener ışığında uçuşan sıcak toz
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 14; i++) {
      var u = (i * 0.61803 + 0.2) % 1;
      var v = (i * 0.41421 + 0.07) % 1;
      var x = (((u + 0.03 * Math.sin(t * 0.15 + i * 2.7) + t * 0.003 * ((i % 3) - 1)) % 1) + 1) % 1;
      var y = (((v - t * 0.012 * (1 + (i % 4) * 0.4) + 0.02 * Math.sin(t * 0.2 + i)) % 1) + 1) % 1;
      var a = 0.06 + 0.14 * Math.pow(0.5 + 0.5 * Math.sin(t * (0.5 + (i % 5) * 0.15) + i * 2.1), 2);
      var sz = (3 + (i % 4) * 1.7) * dpr;
      ctx.globalAlpha = a;
      ctx.drawImage(dust, x * W - sz / 2, y * H - sz / 2, sz, sz);
    }
    ctx.restore();
  }

  /** Cereyan: ekranı geçen soluk toz çizgileri. */
  function drawWindFx(ctx, W, H, t, dpr, k) {
    ctx.strokeStyle = 'rgba(170,205,235,' + 0.26 * k + ')';
    ctx.lineWidth = Math.max(1.2, dpr * 1.3);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var wi = 0; wi < 18; wi++) {
      var wy = (((wi * 137.5) % 100) / 100) * H;
      var len = (60 + ((wi * 53) % 90)) * dpr;
      var wx = ((wi * 211 + t * (260 + (wi % 5) * 70) * dpr) % (W + len * 2)) - len;
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + len * 0.5, wy - 6 * dpr, wx + len, wy + 2 * dpr);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(214,226,240,' + 0.5 * k + ')';
    for (var di = 0; di < 22; di++) {
      var dy = (((di * 97.7) % 100) / 100) * H;
      var dx = ((di * 173 + t * (300 + (di % 4) * 60) * dpr) % (W + 40 * dpr)) - 20 * dpr;
      ctx.beginPath();
      ctx.arc(dx, dy, (1 + (di % 3) * 0.6) * dpr, 0, 6.3);
      ctx.fill();
    }
  }

  S.Themes.cave = {
    key: 'cave',
    name: 'Mağara',
    paper: '#1f232a',
    grid: 'rgba(160,184,214,0.07)',
    speckDark: [0, 0, 0],
    speckLight: [200, 212, 232],
    vignette: 'rgba(0,0,0,0.66)',
    smudge: 'rgba(31,35,42,0.96)',
    trail: [232, 228, 214],
    pencil: CHALK,
    ink: INK,
    teal: TEAL,
    glowComposite: 'lighter',
    glowScale: 1.12,
    glowAbove: true,
    ringRGB: function (kind) {
      return kind === 'sound' ? TEAL : INK;
    },
    paintWall: paintWall,
    paintFloor: paintFloor,
    paintMirror: paintMirror,
    paintWind: paintWind,
    drawKey: drawKey,
    drawDoor: drawDoor,
    drawPickup: drawPickup,
    drawBeacon: drawBeacon,
    drawStone: drawStone,
    drawArrow: drawArrow,
    drawGoalMark: drawGoalMark,
    drawPlayer: drawPlayer,
    drawGlow: drawGlow,
    drawAmbient: drawAmbient,
    drawWindFx: drawWindFx,
  };
})(window);
