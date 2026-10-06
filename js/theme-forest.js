/* Silik — 1. Sezon · Orman teması.
 * Sisli bir sabah ormanı: krem kâğıt, zeytin-grafit kurşun kalem, koyu zümrüt mürekkep.
 * Duvarlar yaprak kümeleri (kenarları yay yay çalı gibi), zemin patika, ayna yerine durgun göl,
 * kapı bir ağaç kovuğu, havada ateş böcekleri. Kalıcı (mürekkepli) alan zümrüt yeşili çizilir.
 */
(function (root) {
  'use strict';
  var S = root.Silik;
  var K = S.ThemeKit;
  var rgba = K.rgba;
  var pen = K.pen;

  var PENCIL = [62, 70, 52];
  var INK = [8, 62, 40];
  var TEAL = [34, 126, 122];

  function almond(ctx, x, y, len, wid, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.quadraticCurveTo(0, -wid, len / 2, 0);
    ctx.quadraticCurveTo(0, wid, -len / 2, 0);
    ctx.restore();
  }

  /* ---------- karolar ---------- */

  function paintWall(ctx, T, mask, v, ink, rand) {
    var d = T * 0.085; // çalı kenarının şişme miktarı
    var col = ink ? INK : PENCIL;
    var inT = mask & 1 ? d : 0;
    var inR = mask & 2 ? d : 0;
    var inB = mask & 4 ? d : 0;
    var inL = mask & 8 ? d : 0;
    var x0 = inL;
    var y0 = inT;
    var x1 = T - inR;
    var y1 = T - inB;

    function blob() {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      if (mask & 1) K.scallop(ctx, x0, y0, x1, y0, 0, -1, d, 3);
      else ctx.lineTo(x1, y0);
      if (mask & 2) K.scallop(ctx, x1, y0, x1, y1, 1, 0, d, 3);
      else ctx.lineTo(x1, y1);
      if (mask & 4) K.scallop(ctx, x1, y1, x0, y1, 0, 1, d, 3);
      else ctx.lineTo(x0, y1);
      if (mask & 8) K.scallop(ctx, x0, y1, x0, y0, -1, 0, d, 3);
      else ctx.lineTo(x0, y0);
      ctx.closePath();
    }

    ctx.save();
    blob();
    ctx.clip();
    // gövde rengi
    ctx.fillStyle = ink ? 'rgba(14,92,58,0.66)' : 'rgba(104,142,82,0.21)';
    ctx.fillRect(0, 0, T, T);
    // yaprak kümelerinin gölge/ışık lekeleri
    for (var m = 0; m < 4; m++) {
      ctx.fillStyle = ink ? 'rgba(2,34,20,0.30)' : 'rgba(40,80,44,0.09)';
      ctx.beginPath();
      ctx.arc(T * (0.3 + rand() * 0.4), T * (0.3 + rand() * 0.4), T * (0.12 + rand() * 0.09), 0, 6.3); // karo kenarını aşmasın: dikiş izi kalmaz
      ctx.fill();
    }
    // yaprak kıvrımları: küçük "c" kavisleri
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, T * 0.026);
    for (var i = 0; i < 20; i++) {
      var cx = T * (0.04 + rand() * 0.92);
      var cy = T * (0.04 + rand() * 0.92);
      var r = T * (0.045 + rand() * 0.05);
      var a0 = rand() * 6.28;
      ctx.strokeStyle = ink ? 'rgba(170,230,170,' + 0.55 * (0.6 + rand() * 0.6) + ')' : rgba(col, 0.34 * (0.6 + rand() * 0.6));
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a0 + 2.5 + rand());
      ctx.stroke();
    }
    // tek tük yaprak
    for (var l = 0; l < 4; l++) {
      ctx.fillStyle = ink ? 'rgba(90,190,120,0.42)' : 'rgba(104,150,70,0.22)';
      almond(ctx, T * (0.12 + rand() * 0.76), T * (0.12 + rand() * 0.76), T * 0.2, T * 0.06, rand() * 3.14);
      ctx.fill();
    }
    // bazı karolarda böğürtlen / çiçek
    if (v === 1) {
      for (var b = 0; b < 2; b++) {
        ctx.fillStyle = b === 1 ? 'rgba(208,150,52,0.6)' : 'rgba(176,56,48,0.58)';
        ctx.beginPath();
        ctx.arc(T * (0.18 + rand() * 0.64), T * (0.18 + rand() * 0.64), Math.max(1.2, T * 0.032), 0, 6.3);
        ctx.fill();
      }
    }
    ctx.restore();

    // dış hat: yalnızca açıkta kalan kenarlar, yay yay
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = rgba(col, pass ? 0.45 : ink ? 1 : 0.72);
      ctx.lineWidth = pass ? Math.max(1, T * 0.026) : Math.max(1.4, T * (ink ? 0.07 : 0.046));
      var o = pass ? T * 0.012 : 0;
      if (mask & 1) {
        ctx.beginPath();
        ctx.moveTo(x0, y0 + o);
        K.scallop(ctx, x0, y0 + o, x1, y0 + o, 0, -1, d, 3);
        ctx.stroke();
      }
      if (mask & 2) {
        ctx.beginPath();
        ctx.moveTo(x1 - o, y0);
        K.scallop(ctx, x1 - o, y0, x1 - o, y1, 1, 0, d, 3);
        ctx.stroke();
      }
      if (mask & 4) {
        ctx.beginPath();
        ctx.moveTo(x1, y1 - o);
        K.scallop(ctx, x1, y1 - o, x0, y1 - o, 0, 1, d, 3);
        ctx.stroke();
      }
      if (mask & 8) {
        ctx.beginPath();
        ctx.moveTo(x0 + o, y1);
        K.scallop(ctx, x0 + o, y1, x0 + o, y0, -1, 0, d, 3);
        ctx.stroke();
      }
    }
  }

  function paintFloor(ctx, T, v, ink, rand) {
    ctx.fillStyle = ink ? 'rgba(40,140,90,0.30)' : 'rgba(180,152,92,0.12)';
    ctx.fillRect(0, 0, T, T);
    var col = ink ? INK : PENCIL;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var lw = Math.max(1, T * 0.024);
    // ot tutamları
    var tufts = v === 0 ? 1 : 2;
    for (var k = 0; k < tufts; k++) {
      var x = T * (0.16 + rand() * 0.68);
      var y = T * (0.42 + rand() * 0.5);
      ctx.strokeStyle = rgba(col, ink ? 0.8 : 0.3);
      ctx.lineWidth = lw;
      for (var b = -1; b <= 1; b++) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + b * T * 0.03, y - T * 0.08, x + b * T * 0.07, y - T * (0.13 + (b === 0 ? 0.03 : 0)));
        ctx.stroke();
      }
    }
    // düşmüş yaprak
    if (v === 1) {
      ctx.fillStyle = ink ? 'rgba(60,150,92,0.35)' : 'rgba(176,128,52,0.26)';
      almond(ctx, T * (0.3 + rand() * 0.4), T * (0.2 + rand() * 0.3), T * 0.2, T * 0.06, rand() * 3.14);
      ctx.fill();
      ctx.strokeStyle = rgba(col, ink ? 0.45 : 0.26);
      ctx.stroke();
    }
    // çakıl
    if (v === 2) {
      ctx.strokeStyle = rgba(col, ink ? 0.5 : 0.28);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(T * (0.25 + rand() * 0.5), T * (0.25 + rand() * 0.5), T * 0.055, T * 0.038, rand(), 0, 6.3);
      ctx.stroke();
    }
    if (ink) {
      ctx.fillStyle = 'rgba(30,110,70,0.3)';
      for (var d = 0; d < 5; d++) {
        ctx.beginPath();
        ctx.arc(T * (0.1 + rand() * 0.8), T * (0.1 + rand() * 0.8), Math.max(0.8, T * 0.012), 0, 6.3);
        ctx.fill();
      }
    }
  }

  /** Ayna = durgun göl: yansıması haritaya sahte izler bırakır. */
  function paintMirror(ctx, T, mask, ink, rand) {
    ctx.save();
    K.softCorners(ctx, T, mask, T * 0.16);
    ctx.clip();
    ctx.fillStyle = ink ? 'rgba(52,150,172,0.52)' : 'rgba(92,164,180,0.40)';
    ctx.fillRect(0, 0, T, T);
    var g = ctx.createRadialGradient(T * 0.42, T * 0.4, 0, T * 0.42, T * 0.4, T * 0.62);
    g.addColorStop(0, 'rgba(220,245,248,0.5)');
    g.addColorStop(1, 'rgba(220,245,248,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, T, T);
    // dalgacıklar
    ctx.lineWidth = Math.max(1, T * 0.024);
    ctx.lineCap = 'round';
    for (var r = 1; r <= 3; r++) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 - r * 0.15) + ')';
      ctx.beginPath();
      ctx.ellipse(T * 0.4, T * 0.62, T * 0.07 * r, T * 0.038 * r, 0, 0, 6.3);
      ctx.stroke();
    }
    // yansıma çizgileri
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(1.2, T * 0.035);
    [[0.52, 0.2, 0.74], [0.6, 0.3, 0.66], [0.2, 0.18, 0.4]].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(T * s[0] - T * 0.1, T * s[1] + T * 0.05);
      ctx.lineTo(T * s[2], T * s[1]);
      ctx.stroke();
    });
    // nilüfer yaprağı
    ctx.fillStyle = 'rgba(96,160,84,0.9)';
    ctx.strokeStyle = 'rgba(40,86,44,0.9)';
    ctx.lineWidth = Math.max(1, T * 0.03);
    ctx.beginPath();
    ctx.moveTo(T * 0.72, T * 0.32);
    ctx.arc(T * 0.72, T * 0.32, T * 0.12, 0.35 * Math.PI, 1.75 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(232,138,160,0.95)';
    ctx.beginPath();
    ctx.arc(T * 0.74, T * 0.3, T * 0.035, 0, 6.3);
    ctx.fill();
    // kıyı çizgisi: dört kenar, dalgalı
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = rgba(TEAL, pass ? 0.4 : 0.92);
      ctx.lineWidth = pass ? Math.max(1, T * 0.03) : Math.max(1.6, T * 0.06);
      var i = T * 0.03 + (pass ? T * 0.02 : 0);
      var a = T * 0.02;
      if (mask & 1) K.wobble(ctx, 0, i, T, i, rand, a, 5);
      if (mask & 2) K.wobble(ctx, T - i, 0, T - i, T, rand, a, 5);
      if (mask & 4) K.wobble(ctx, 0, T - i, T, T - i, rand, a, 5);
      if (mask & 8) K.wobble(ctx, i, 0, i, T, rand, a, 5);
    }
    ctx.restore();
  }

  function paintWind(ctx, T, v) {
    ctx.strokeStyle = 'rgba(54,112,92,0.6)';
    ctx.lineWidth = Math.max(1.2, T * 0.045);
    ctx.lineCap = 'round';
    var y = T * (v ? 0.62 : 0.4);
    ctx.beginPath();
    ctx.moveTo(T * 0.12, y);
    ctx.bezierCurveTo(T * 0.3, y - T * 0.16, T * 0.46, y + T * 0.14, T * 0.62, y);
    ctx.bezierCurveTo(T * 0.72, y - T * 0.08, T * 0.8, y + T * 0.0, T * 0.78, y - T * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(T * 0.2, y + T * 0.17);
    ctx.bezierCurveTo(T * 0.34, y + T * 0.08, T * 0.5, y + T * 0.28, T * 0.64, y + T * 0.16);
    ctx.stroke();
    // savrulan yaprak
    ctx.fillStyle = v ? 'rgba(176,120,48,0.8)' : 'rgba(112,152,64,0.85)';
    almond(ctx, T * 0.8, y - T * 0.12, T * 0.2, T * 0.065, -0.6);
    ctx.fill();
  }

  /* ---------- nesneler ---------- */

  function drawKey(ctx, cx, cy, s, t) {
    ctx.save();
    ctx.translate(cx, cy + Math.sin(t * 2.4) * s * 0.04);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.62);
    g.addColorStop(0, 'rgba(255,214,120,' + (0.5 + Math.sin(t * 3) * 0.12) + ')');
    g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.rotate(-0.65 + Math.sin(t * 1.7) * 0.08);
    var lw = Math.max(1.5, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(-0.08 * s, 0);
    ctx.lineTo(0.3 * s, 0);
    ctx.lineTo(0.3 * s, 0.1 * s);
    ctx.moveTo(0.2 * s, 0);
    ctx.lineTo(0.2 * s, 0.08 * s);
    pen(ctx, null, '#6e4a09', lw * 1.3);
    ctx.beginPath();
    ctx.arc(-0.2 * s, 0, 0.14 * s, 0, 6.3);
    ctx.moveTo(-0.1 * s, 0);
    ctx.arc(-0.2 * s, 0, 0.065 * s, 0, 6.3, true);
    pen(ctx, '#e0a82e', '#6e4a09', lw);
    ctx.restore();
  }

  /** Kapı: koca bir ağacın kovuğu. Kilitliyken asma kilit, anahtar varken sıcak ışık sızar. */
  function drawDoor(ctx, x, y, s, hasKey, open, t) {
    var cx = x + s / 2;
    var cy = y + s / 2;
    var lw = Math.max(1.6, s * 0.05);
    if (hasKey && open < 0.01) {
      var pulse = 0.5 + Math.sin(t * 4) * 0.25;
      var g = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, s * 0.85);
      g.addColorStop(0, 'rgba(255,205,110,' + pulse * 0.55 + ')');
      g.addColorStop(1, 'rgba(255,205,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - s * 0.5, y - s * 0.5, s * 2, s * 2);
    }
    // gövde
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.03, s * 0.47, s * 0.45, 0, 0, 6.3);
    pen(ctx, 'rgba(126,92,56,0.62)', '#4a3320', lw);
    // yıllık halkalar / kabuk çizgileri
    ctx.strokeStyle = 'rgba(70,48,28,0.55)';
    ctx.lineWidth = lw * 0.6;
    [[-0.3, 0.2, 0.5], [0.34, 0.55, 1.3], [-0.38, 0.9, 1.4]].forEach(function (a) {
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.03, s * 0.36, Math.PI * a[0] + 3.4, Math.PI * a[0] + 3.4 + a[1] * 2);
      ctx.stroke();
    });
    // kökler
    ctx.strokeStyle = '#4a3320';
    ctx.lineWidth = lw;
    [[-0.34, 0.36, -0.46, 0.46], [0.3, 0.38, 0.44, 0.47]].forEach(function (r) {
      ctx.beginPath();
      ctx.moveTo(cx + r[0] * s, cy + r[1] * s);
      ctx.quadraticCurveTo(cx + r[0] * s * 1.2, cy + r[3] * s, cx + r[2] * s, cy + r[3] * s);
      ctx.stroke();
    });
    // kovuk (kemerli açıklık)
    ctx.beginPath();
    ctx.moveTo(cx - 0.17 * s, cy + 0.36 * s);
    ctx.lineTo(cx - 0.17 * s, cy - 0.02 * s);
    ctx.arc(cx, cy - 0.02 * s, 0.17 * s, Math.PI, 0);
    ctx.lineTo(cx + 0.17 * s, cy + 0.36 * s);
    ctx.closePath();
    pen(ctx, open > 0.01 ? 'rgba(255,226,150,0.95)' : 'rgba(28,18,8,0.8)', '#3a2614', lw);
    // kapı kanadı
    var leaf = 1 - open * 0.85;
    ctx.beginPath();
    ctx.moveTo(cx - 0.17 * s, cy + 0.36 * s);
    ctx.lineTo(cx - 0.17 * s, cy - 0.02 * s);
    ctx.arc(cx - 0.17 * s + 0.17 * s * leaf, cy - 0.02 * s, 0.17 * s * leaf, Math.PI, 0);
    ctx.lineTo(cx - 0.17 * s + 0.34 * s * leaf, cy + 0.36 * s);
    ctx.closePath();
    pen(ctx, 'rgba(176,84,52,0.88)', '#6a2e1a', lw * 0.8);
    ctx.strokeStyle = 'rgba(80,32,16,0.5)';
    ctx.lineWidth = lw * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - 0.17 * s + 0.17 * s * leaf, cy - 0.12 * s);
    ctx.lineTo(cx - 0.17 * s + 0.17 * s * leaf, cy + 0.36 * s);
    ctx.stroke();
    if (!hasKey) {
      ctx.beginPath();
      ctx.arc(cx, cy + 0.12 * s, 0.06 * s, Math.PI, 0);
      pen(ctx, null, '#2d2010', lw * 0.9);
      ctx.beginPath();
      ctx.rect(cx - 0.085 * s, cy + 0.12 * s, 0.17 * s, 0.13 * s);
      pen(ctx, '#c58b1a', '#2d2010', lw * 0.8);
    } else if (open < 0.01) {
      ctx.beginPath();
      ctx.arc(cx + 0.09 * s, cy + 0.17 * s, 0.032 * s, 0, 6.3);
      pen(ctx, '#e0a82e', '#6e4a09', lw * 0.6);
    }
  }

  /** Toplanabilir: orman çiçeği. */
  function drawPickup(ctx, cx, cy, s, t) {
    var sway = Math.sin(t * 1.6 + cx * 0.01) * s * 0.04;
    var lw = Math.max(1.4, s * 0.05);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, 0.36 * s);
    ctx.quadraticCurveTo(sway * 0.5, 0.2 * s, sway, 0.0);
    pen(ctx, null, '#56764a', lw);
    ctx.beginPath();
    ctx.ellipse(-0.08 * s + sway * 0.4, 0.22 * s, 0.09 * s, 0.045 * s, -0.5, 0, 6.3);
    pen(ctx, 'rgba(120,160,95,0.75)', '#56764a', lw * 0.7);
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * 6.283 - 1.57;
      ctx.beginPath();
      ctx.arc(sway + Math.cos(a) * 0.1 * s, -0.04 * s + Math.sin(a) * 0.1 * s, 0.085 * s, 0, 6.3);
      pen(ctx, '#e8a4b6', '#a24a68', lw * 0.7);
    }
    ctx.beginPath();
    ctx.arc(sway, -0.04 * s, 0.06 * s, 0, 6.3);
    pen(ctx, '#ecc86a', '#a0771d', lw * 0.6);
    ctx.restore();
  }

  function drawStone(ctx, cx, cy, s, type, t, born) {
    var col = type === 'sound' ? TEAL : INK;
    var lw = Math.max(1.4, s * 0.05);
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + born);
    ctx.beginPath();
    ctx.arc(cx, cy, s * (0.3 + pulse * 0.04), 0, 6.3);
    ctx.setLineDash([s * 0.06, s * 0.06]);
    ctx.strokeStyle = rgba(col, 0.6);
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.02, s * 0.2, s * 0.155, -0.3, 0, 6.3);
    pen(ctx, type === 'sound' ? '#3fa0a0' : '#2c6b4d', rgba(col, 0.95), lw);
    ctx.beginPath();
    ctx.arc(cx - s * 0.06, cy - s * 0.04, s * 0.06, 3.6, 5.2);
    pen(ctx, null, 'rgba(255,255,255,0.55)', lw * 0.8);
    // taşın üstünde minik yosun
    ctx.fillStyle = 'rgba(120,170,80,0.7)';
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.07, cy - s * 0.1, s * 0.05, s * 0.025, 0.4, 0, 6.3);
    ctx.fill();
  }

  function drawArrow(ctx, cx, cy, s, dir, t) {
    var bob = Math.sin(t * 3.2) * s * 0.035;
    var dx = dir.dx;
    var dy = dir.dy;
    var tail = s * 0.26;
    var tip = s * 0.5 + bob;
    var lw = Math.max(2, s * 0.075);
    ctx.strokeStyle = rgba(TEAL, 0.95);
    ctx.fillStyle = rgba(TEAL, 0.95);
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
    ctx.lineWidth = lw * 0.55;
    for (var i = 0; i < 2; i++) {
      var r = s * (0.36 + i * 0.1 + ((t * 0.9) % 1) * 0.08);
      var a0 = Math.atan2(dy, dx);
      ctx.strokeStyle = rgba(TEAL, 0.45 - i * 0.18);
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0 - 0.5, a0 + 0.5);
      ctx.stroke();
    }
  }

  function drawGoalMark(ctx, cx, cy, s, t) {
    ctx.strokeStyle = rgba(TEAL, 0.9);
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

  /** Yeşil pelerinli küçük gezgin; başlığında bir yaprak. */
  function drawPlayer(ctx, cx, cy, s, p, t, alpha) {
    var bob = p.moving ? Math.sin(p.walk * 7.5) : Math.sin(t * 2) * 0.35;
    var sq = 1 + bob * 0.05;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(40,30,15,0.22)';
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
    pen(ctx, '#2f6247', '#11291d', lw);
    // pelerin kıvrımı
    ctx.strokeStyle = 'rgba(10,36,24,0.45)';
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.2);
    ctx.quadraticCurveTo(0, s * 0.1, s * 0.12, s * 0.2);
    ctx.stroke();
    var fx = Math.cos(p.face) * s * 0.07;
    var fy = Math.sin(p.face) * s * 0.05;
    ctx.beginPath();
    ctx.ellipse(fx, -s * 0.02 + fy, s * 0.15, s * 0.12, 0, 0, 6.3);
    pen(ctx, '#f6efdc', null, 0);
    ctx.fillStyle = '#13271c';
    var ex = Math.cos(p.face) * s * 0.045;
    var ey = Math.sin(p.face) * s * 0.035;
    ctx.beginPath();
    ctx.arc(fx - s * 0.05 + ex, -s * 0.02 + fy + ey, s * 0.024, 0, 6.3);
    ctx.arc(fx + s * 0.05 + ex, -s * 0.02 + fy + ey, s * 0.024, 0, 6.3);
    ctx.fill();
    // başlığa takılmış yaprak
    ctx.fillStyle = '#86b25a';
    almond(ctx, s * 0.05, -s * 0.3, s * 0.2, s * 0.06, -0.7);
    ctx.fill();
    ctx.strokeStyle = '#3b6a2a';
    ctx.lineWidth = lw * 0.5;
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- atmosfer ---------- */

  function drawGlow(ctx, x, y, r) {
    var gl = ctx.createRadialGradient(x, y, r * 0.11, x, y, r);
    gl.addColorStop(0, 'rgba(255,250,222,0.55)');
    gl.addColorStop(1, 'rgba(255,250,222,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  var fly = null;
  /** Ateş böcekleri: yavaşça süzülür, sıcak sarı parlayıp söner; birkaç yaprak da düşer. */
  function drawAmbient(ctx, W, H, t, dpr) {
    if (!fly) fly = K.glowSprite(48, [255, 200, 40]);
    ctx.save();
    for (var i = 0; i < 10; i++) {
      var u = (i * 0.61803) % 1;
      var v = (i * 0.41421 + 0.13) % 1;
      var x = (((u + 0.05 * Math.sin(t * 0.21 + i * 2.1) + t * 0.004 * ((i % 3) - 1)) % 1) + 1) % 1;
      var y = (((v + 0.05 * Math.sin(t * 0.17 + i * 1.3)) % 1) + 1) % 1;
      var pulse = Math.pow(0.5 + 0.5 * Math.sin(t * (0.9 + (i % 4) * 0.25) + i * 3.3), 2);
      var sz = (12 + (i % 3) * 4) * dpr;
      ctx.globalAlpha = 0.15 + 0.45 * pulse;
      ctx.drawImage(fly, x * W - sz / 2, y * H - sz / 2, sz, sz);
      // parlak çekirdek
      ctx.globalAlpha = 0.25 + 0.7 * pulse;
      ctx.fillStyle = '#fff6c0';
      ctx.beginPath();
      ctx.arc(x * W, y * H, 1.3 * dpr, 0, 6.3);
      ctx.fill();
    }
    ctx.restore();
    // düşen yapraklar
    ctx.save();
    for (var l = 0; l < 6; l++) {
      var lx = ((l * 0.37 + t * 0.012 * (1 + (l % 3) * 0.4) + 0.1 * Math.sin(t * 0.5 + l)) % 1 + 1) % 1;
      var ly = ((l * 0.29 + t * 0.02 * (1 + (l % 2) * 0.5)) % 1);
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = l % 2 ? 'rgba(168,118,50,1)' : 'rgba(104,148,64,1)';
      almond(ctx, lx * W, ly * H, 9 * dpr, 3 * dpr, t * 0.8 + l * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Rüzgârlı bölgedeyken ekranı geçen yaprak çizgileri. */
  function drawWindFx(ctx, W, H, t, dpr, k) {
    ctx.strokeStyle = 'rgba(58,110,84,' + 0.3 * k + ')';
    ctx.lineWidth = Math.max(1.2, dpr * 1.3);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var wi = 0; wi < 16; wi++) {
      var wy = (((wi * 137.5) % 100) / 100) * H;
      var len = (60 + ((wi * 53) % 90)) * dpr;
      var wx = ((wi * 211 + t * (260 + (wi % 5) * 70) * dpr) % (W + len * 2)) - len;
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + len * 0.5, wy - 6 * dpr, wx + len, wy + 2 * dpr);
    }
    ctx.stroke();
    for (var li = 0; li < 7; li++) {
      var ly = (((li * 191.3) % 100) / 100) * H;
      var lx = ((li * 331 + t * (330 + li * 40) * dpr) % (W + 80 * dpr)) - 40 * dpr;
      ctx.globalAlpha = 0.55 * k;
      ctx.fillStyle = li % 2 ? 'rgba(176,120,48,1)' : 'rgba(110,152,64,1)';
      almond(ctx, lx, ly + Math.sin(t * 3 + li) * 6 * dpr, 12 * dpr, 4 * dpr, 0.4 + Math.sin(t * 2 + li) * 0.6);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  S.Themes.forest = {
    key: 'forest',
    name: 'Orman',
    paper: '#efe8ce',
    grid: 'rgba(104,148,108,0.16)',
    speckDark: [112, 100, 56],
    speckLight: [255, 255, 238],
    vignette: 'rgba(78,92,40,0.32)',
    smudge: 'rgba(236,230,204,0.95)',
    trail: [66, 74, 56],
    pencil: PENCIL,
    ink: INK,
    teal: TEAL,
    glowComposite: 'source-over',
    glowScale: 1,
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
    drawStone: drawStone,
    drawArrow: drawArrow,
    drawGoalMark: drawGoalMark,
    drawPlayer: drawPlayer,
    drawGlow: drawGlow,
    drawAmbient: drawAmbient,
    drawWindFx: drawWindFx,
  };
})(window);
