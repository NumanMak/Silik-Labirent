/* Silik — çizim: kâğıt üzerine kurşun kalem. Keşfedilen yerler kalemle çizilir, silinirken
 * silgi izi gibi soluklaşır; hatıra taşlarının kilitlediği alan mürekkeple çizilmiş gibi koyu kalır.
 *
 * Karo görselleri (duvar / zemin / ayna / silgi / rüzgâr) açılışta ve ekran boyutu değişince
 * bir atlas tuvaline önceden çizilir; kare başına yalnızca drawImage çağrılır.
 */
(function (root) {
  'use strict';
  var S = (root.Silik = root.Silik || {});
  var Util = S.Util;
  var Game = S.Game;

  var PAPER = '#f0e8d4';
  var PENCIL = [58, 54, 50];
  var INK = [24, 36, 76];
  var TEAL = [47, 127, 134];

  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function hash2(x, y) {
    return ((Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0) % 9973;
  }

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

  function wobble(ctx, x0, y0, x1, y1, rand, amp, segs) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (var s = 1; s < segs; s++) {
      var t = s / segs;
      ctx.lineTo(x0 + (x1 - x0) * t + (rand() - 0.5) * amp, y0 + (y1 - y0) * t + (rand() - 0.5) * amp);
    }
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function edges(ctx, T, mask, rand, color, lw, alpha) {
    var i = lw * 0.55;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = rgba(color, pass ? alpha * 0.5 : alpha);
      ctx.lineWidth = pass ? lw * 0.6 : lw;
      var off = pass ? lw * 0.5 : 0;
      var amp = T * 0.025;
      if (mask & 1) wobble(ctx, 0, i + off, T, i + off, rand, amp, 4);
      if (mask & 2) wobble(ctx, T - i - off, 0, T - i - off, T, rand, amp, 4);
      if (mask & 4) wobble(ctx, 0, T - i - off, T, T - i - off, rand, amp, 4);
      if (mask & 8) wobble(ctx, i + off, 0, i + off, T, rand, amp, 4);
    }
  }

  function paintWall(ctx, T, mask, v, ink, mirror, rand) {
    var col = ink ? INK : PENCIL;
    var lw = Math.max(1, T * 0.03);
    if (mirror) {
      ctx.fillStyle = 'rgba(86,140,156,' + (ink ? 0.3 : 0.2) + ')';
      ctx.fillRect(0, 0, T, T);
      // ince tarama
      ctx.lineWidth = lw;
      ctx.strokeStyle = rgba(TEAL, 0.28);
      for (var k = -T; k < T * 2; k += T / 6) {
        ctx.beginPath();
        ctx.moveTo(k, T);
        ctx.lineTo(k + T, 0);
        ctx.stroke();
      }
      // parıltı
      ctx.lineCap = 'round';
      var glints = [
        [0.18, 0.5, 0.95],
        [0.36, 0.28, 0.7],
        [0.5, 0.2, 0.5],
      ];
      glints.forEach(function (g, gi) {
        ctx.strokeStyle = 'rgba(255,255,255,' + g[2] + ')';
        ctx.lineWidth = T * (gi === 0 ? 0.1 : 0.05);
        ctx.beginPath();
        ctx.moveTo(T * g[0], T * (g[0] + g[1] * 0.5 + 0.35));
        ctx.lineTo(T * (g[0] + g[1] * 0.6), T * (g[0] + 0.12));
        ctx.stroke();
      });
      // yıldız
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      var sx = T * 0.7;
      var sy = T * 0.3;
      var r = T * 0.09;
      ctx.beginPath();
      ctx.moveTo(sx, sy - r);
      ctx.quadraticCurveTo(sx, sy, sx + r, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy + r);
      ctx.quadraticCurveTo(sx, sy, sx - r, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy - r);
      ctx.fill();
      // çerçeve: her zaman 4 kenar
      edges(ctx, T, 15, rand, TEAL, lw * 2.1, 0.9);
      return;
    }
    ctx.fillStyle = rgba(col, ink ? 0.2 : 0.12);
    ctx.fillRect(0, 0, T, T);
    // çapraz tarama: komşu karolarla kesintisiz devam eder
    var sp = T / 6;
    ctx.lineCap = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = rgba(col, ink ? 0.55 : 0.4);
    for (var h = -T; h < T * 2; h += sp) {
      var j = (rand() - 0.5) * T * 0.02;
      ctx.beginPath();
      ctx.moveTo(h + j, T);
      ctx.lineTo(h + T + j, 0);
      ctx.stroke();
    }
    if (v === 1) {
      ctx.strokeStyle = rgba(col, 0.16);
      for (var q = -T; q < T * 2; q += sp * 2) {
        ctx.beginPath();
        ctx.moveTo(q, 0);
        ctx.lineTo(q + T, T);
        ctx.stroke();
      }
    }
    edges(ctx, T, mask, rand, col, Math.max(1.4, T * 0.062), ink ? 0.95 : 0.8);
  }

  function paintFloor(ctx, T, v, ink, rand) {
    ctx.fillStyle = ink ? rgba(INK, 0.1) : 'rgba(150,125,85,0.085)';
    ctx.fillRect(0, 0, T, T);
    var col = ink ? INK : PENCIL;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, T * 0.025);
    ctx.strokeStyle = rgba(col, ink ? 0.16 : 0.1);
    for (var s = 0; s < 2 + v; s++) {
      var x = T * (0.15 + rand() * 0.6);
      var y = T * (0.15 + rand() * 0.6);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + T * 0.12, y - T * 0.08, x + T * (0.12 + rand() * 0.12), y + T * 0.05);
      ctx.stroke();
    }
    if (ink) {
      ctx.fillStyle = rgba(INK, 0.22);
      for (var d = 0; d < 4; d++) {
        ctx.beginPath();
        ctx.arc(T * (0.15 + rand() * 0.7), T * (0.15 + rand() * 0.7), Math.max(0.8, T * 0.012), 0, 6.3);
        ctx.fill();
      }
    }
  }

  function paintSmudge(ctx, T, v, rand) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(240,232,212,0.95)';
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

  function paintWindGlyph(ctx, T, v) {
    ctx.strokeStyle = 'rgba(70,105,130,0.6)';
    ctx.lineWidth = Math.max(1.2, T * 0.045);
    ctx.lineCap = 'round';
    var y0 = T * (v ? 0.62 : 0.4);
    for (var l = 0; l < 2; l++) {
      var y = y0 + l * T * 0.17 * (v ? -1 : 1);
      ctx.beginPath();
      ctx.moveTo(T * 0.15, y);
      ctx.bezierCurveTo(T * 0.3, y - T * 0.14, T * 0.45, y + T * 0.14, T * 0.6, y);
      ctx.bezierCurveTo(T * 0.7, y - T * 0.08, T * 0.8, y - T * 0.02, T * 0.85, y - T * 0.06);
      ctx.stroke();
    }
  }

  function buildAtlas(Tp) {
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
      fn(Util.rng(i * 7919 + 13));
      ctx.restore();
    }
    var ink, v, m;
    for (ink = 0; ink < 2; ink++) {
      for (v = 0; v < 2; v++) {
        for (m = 0; m < 16; m++) {
          (function (ink, v, m) {
            each(wallIdx(ink, v, m), function (r) {
              paintWall(ctx, Tp, m, v, ink, false, r);
            });
          })(ink, v, m);
        }
      }
      for (m = 0; m < 16; m++) {
        (function (ink, m) {
          each(mirrorIdx(ink, m), function (r) {
            paintWall(ctx, Tp, m, 0, ink, true, r);
          });
        })(ink, m);
      }
      for (v = 0; v < 3; v++) {
        (function (ink, v) {
          each(floorIdx(ink, v), function (r) {
            paintFloor(ctx, Tp, v, ink, r);
          });
        })(ink, v);
      }
    }
    for (v = 0; v < 3; v++) {
      (function (v) {
        each(SMUDGE + v, function (r) {
          paintSmudge(ctx, Tp, v, r);
        });
      })(v);
    }
    for (v = 0; v < 2; v++) {
      (function (v) {
        each(WINDG + v, function () {
          paintWindGlyph(ctx, Tp, v);
        });
      })(v);
    }
    return c;
  }

  /* ---------- kâğıt dokusu ve vinyet ---------- */

  function buildPaper(size, dpr) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    var r = Util.rng(4242);
    for (var i = 0; i < size * 1.6; i++) {
      var x = r() * size;
      var y = r() * size;
      var a = 0.03 + r() * 0.07;
      ctx.fillStyle = r() < 0.5 ? 'rgba(120,95,55,' + a + ')' : 'rgba(255,255,255,' + a * 1.6 + ')';
      ctx.fillRect(x, y, dpr * (0.6 + r() * 1.4), dpr * (0.6 + r() * 1.4));
    }
    ctx.lineCap = 'round';
    for (var f = 0; f < 70; f++) {
      var fx = r() * size;
      var fy = r() * size;
      ctx.strokeStyle = 'rgba(110,90,60,' + (0.03 + r() * 0.04) + ')';
      ctx.lineWidth = dpr * 0.7;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + (r() - 0.5) * 24 * dpr, fy + (r() - 0.5) * 24 * dpr, fx + (r() - 0.5) * 40 * dpr, fy + (r() - 0.5) * 40 * dpr);
      ctx.stroke();
    }
    return c;
  }

  function buildVignette(W, H) {
    var c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    g.addColorStop(0, 'rgba(90,65,30,0)');
    g.addColorStop(1, 'rgba(90,65,30,0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return c;
  }

  /* ---------- nesneler ---------- */

  function pencilPath(ctx, fill, stroke, lw) {
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
  }

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
    // sap
    ctx.beginPath();
    ctx.moveTo(-0.08 * s, 0);
    ctx.lineTo(0.3 * s, 0);
    ctx.lineTo(0.3 * s, 0.1 * s);
    ctx.moveTo(0.2 * s, 0);
    ctx.lineTo(0.2 * s, 0.08 * s);
    pencilPath(ctx, null, '#7a520b', lw * 1.3);
    // halka
    ctx.beginPath();
    ctx.arc(-0.2 * s, 0, 0.14 * s, 0, 6.3);
    ctx.moveTo(-0.1 * s, 0);
    ctx.arc(-0.2 * s, 0, 0.065 * s, 0, 6.3, true);
    pencilPath(ctx, '#e0a82e', '#7a520b', lw);
    ctx.restore();
  }

  function drawDoor(ctx, x, y, s, hasKey, open, t) {
    var lw = Math.max(1.6, s * 0.06);
    if (hasKey && open < 0.01) {
      var pulse = 0.5 + Math.sin(t * 4) * 0.25;
      var g = ctx.createRadialGradient(x + s / 2, y + s / 2, s * 0.1, x + s / 2, y + s / 2, s * 0.8);
      g.addColorStop(0, 'rgba(255,205,110,' + pulse * 0.55 + ')');
      g.addColorStop(1, 'rgba(255,205,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - s * 0.4, y - s * 0.4, s * 1.8, s * 1.8);
    }
    // kasa
    ctx.beginPath();
    ctx.moveTo(x + 0.14 * s, y + 0.92 * s);
    ctx.lineTo(x + 0.14 * s, y + 0.4 * s);
    ctx.arc(x + 0.5 * s, y + 0.4 * s, 0.36 * s, Math.PI, 0);
    ctx.lineTo(x + 0.86 * s, y + 0.92 * s);
    ctx.closePath();
    pencilPath(ctx, open > 0.01 ? 'rgba(255,225,150,0.9)' : 'rgba(180,73,47,0.25)', '#8f3a25', lw);
    // kapı kanadı
    var leaf = 1 - open * 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 0.2 * s, y + 0.92 * s);
    ctx.lineTo(x + 0.2 * s, y + 0.4 * s);
    ctx.arc(x + 0.2 * s + 0.3 * s * leaf, y + 0.4 * s, 0.3 * s * leaf, Math.PI, 0);
    ctx.lineTo(x + 0.2 * s + 0.6 * s * leaf, y + 0.92 * s);
    ctx.closePath();
    pencilPath(ctx, 'rgba(172,76,48,0.55)', '#8f3a25', lw * 0.8);
    ctx.strokeStyle = 'rgba(80,30,15,0.5)';
    ctx.lineWidth = lw * 0.5;
    for (var p = 1; p < 3; p++) {
      ctx.beginPath();
      ctx.moveTo(x + 0.2 * s + 0.2 * s * p * leaf, y + 0.35 * s);
      ctx.lineTo(x + 0.2 * s + 0.2 * s * p * leaf, y + 0.92 * s);
      ctx.stroke();
    }
    if (!hasKey) {
      // asma kilit
      ctx.beginPath();
      ctx.arc(x + 0.5 * s, y + 0.52 * s, 0.07 * s, Math.PI, 0);
      pencilPath(ctx, null, '#3b2a14', lw * 0.9);
      ctx.beginPath();
      ctx.rect(x + 0.4 * s, y + 0.52 * s, 0.2 * s, 0.16 * s);
      pencilPath(ctx, '#c58b1a', '#3b2a14', lw * 0.8);
    } else if (open < 0.01) {
      ctx.beginPath();
      ctx.arc(x + 0.66 * s, y + 0.64 * s, 0.035 * s, 0, 6.3);
      pencilPath(ctx, '#e0a82e', '#7a520b', lw * 0.6);
    }
  }

  function drawFlower(ctx, cx, cy, s, t) {
    var sway = Math.sin(t * 1.6 + cx * 0.01) * s * 0.04;
    var lw = Math.max(1.4, s * 0.05);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, 0.36 * s);
    ctx.quadraticCurveTo(sway * 0.5, 0.2 * s, sway, 0.0);
    pencilPath(ctx, null, '#5c7a4a', lw);
    ctx.beginPath();
    ctx.ellipse(-0.08 * s + sway * 0.4, 0.22 * s, 0.09 * s, 0.045 * s, -0.5, 0, 6.3);
    pencilPath(ctx, 'rgba(120,160,95,0.7)', '#5c7a4a', lw * 0.7);
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * 6.283 - 1.57;
      ctx.beginPath();
      ctx.arc(sway + Math.cos(a) * 0.1 * s, -0.04 * s + Math.sin(a) * 0.1 * s, 0.085 * s, 0, 6.3);
      pencilPath(ctx, '#e3a0b4', '#a24a68', lw * 0.7);
    }
    ctx.beginPath();
    ctx.arc(sway, -0.04 * s, 0.06 * s, 0, 6.3);
    pencilPath(ctx, '#e9c46a', '#a0771d', lw * 0.6);
    ctx.restore();
  }

  function drawStone(ctx, cx, cy, s, type, t, born) {
    var col = type === 'sound' ? TEAL : INK;
    var lw = Math.max(1.4, s * 0.05);
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + born);
    // dış halka
    ctx.beginPath();
    ctx.arc(cx, cy, s * (0.3 + pulse * 0.04), 0, 6.3);
    ctx.setLineDash([s * 0.06, s * 0.06]);
    ctx.strokeStyle = rgba(col, 0.55);
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    ctx.setLineDash([]);
    // taş
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.02, s * 0.2, s * 0.155, -0.3, 0, 6.3);
    pencilPath(ctx, type === 'sound' ? '#3f9aa2' : '#2a3a6b', rgba(col, 0.95), lw);
    ctx.beginPath();
    ctx.arc(cx - s * 0.06, cy - s * 0.04, s * 0.06, 3.6, 5.2);
    pencilPath(ctx, null, 'rgba(255,255,255,0.55)', lw * 0.8);
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
    // fısıltı yayları
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

  function drawPlayer(ctx, cx, cy, s, p, t, alpha) {
    var bob = p.moving ? Math.sin(p.walk * 7.5) : Math.sin(t * 2) * 0.35;
    var sq = 1 + bob * 0.05;
    ctx.save();
    ctx.globalAlpha = alpha;
    // gölge
    ctx.fillStyle = 'rgba(40,30,15,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.2, s * 0.24, s * 0.09, 0, 0, 6.3);
    ctx.fill();
    ctx.translate(cx, cy - s * 0.04 - Math.abs(bob) * s * 0.025);
    ctx.scale(1 / sq, sq);
    var lw = Math.max(1.5, s * 0.05);
    // gövde: sivri kapüşonlu küçük figür
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.34);
    ctx.bezierCurveTo(s * 0.12, -s * 0.2, s * 0.26, -s * 0.06, s * 0.25, s * 0.1);
    ctx.bezierCurveTo(s * 0.24, s * 0.22, s * 0.1, s * 0.26, 0, s * 0.26);
    ctx.bezierCurveTo(-s * 0.1, s * 0.26, -s * 0.24, s * 0.22, -s * 0.25, s * 0.1);
    ctx.bezierCurveTo(-s * 0.26, -s * 0.06, -s * 0.12, -s * 0.2, 0, -s * 0.34);
    ctx.closePath();
    pencilPath(ctx, '#2b3358', '#141a33', lw);
    // yüz boşluğu
    var fx = Math.cos(p.face) * s * 0.07;
    var fy = Math.sin(p.face) * s * 0.05;
    ctx.beginPath();
    ctx.ellipse(fx, -s * 0.02 + fy, s * 0.15, s * 0.12, 0, 0, 6.3);
    pencilPath(ctx, '#f6efdc', null, 0);
    ctx.fillStyle = '#1b2140';
    var ex = Math.cos(p.face) * s * 0.045;
    var ey = Math.sin(p.face) * s * 0.035;
    ctx.beginPath();
    ctx.arc(fx - s * 0.05 + ex, -s * 0.02 + fy + ey, s * 0.024, 0, 6.3);
    ctx.arc(fx + s * 0.05 + ex, -s * 0.02 + fy + ey, s * 0.024, 0, 6.3);
    ctx.fill();
    ctx.restore();
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
    this.atlas = null;
    this.atlasTp = 0;
    this.slowFrames = 0;
    this.resize();
  }

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
    this.T = Util.clamp(Math.round(Math.min(w, h) / 10.5), 30, 58);
    this.Tp = Math.max(16, Math.round(this.T * dpr));
    if (this.atlasTp !== this.Tp) {
      this.atlas = buildAtlas(this.Tp);
      this.atlasTp = this.Tp;
    }
    this.paperSize = Math.round(240 * dpr);
    this.paper = buildPaper(this.paperSize, dpr);
    this.paperPat = this.ctx.createPattern(this.paper, 'repeat');
    this.vignette = buildVignette(this.W, this.H);
  };

  /** Çok yavaş cihazlarda çözünürlüğü otomatik düşür. */
  Renderer.prototype.adapt = function (dt) {
    if (dt > 0.028) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 2);
    if (this.slowFrames > 120 && this.quality > 0.55) {
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
    ctx.fillStyle = PAPER;
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
    ctx.strokeStyle = 'rgba(105,140,170,0.16)';
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

    // fener: görüş alanını aydınlatır
    var psx = cx0 + (p.x - camX) * Tp;
    var psy = cy0 + (p.y - camY) * Tp;
    var gl = ctx.createRadialGradient(psx, psy, Tp * 0.4, psx, psy, Game.VIS_R * Tp);
    gl.addColorStop(0, 'rgba(255,250,232,0.55)');
    gl.addColorStop(1, 'rgba(255,250,232,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(psx - Game.VIS_R * Tp, psy - Game.VIS_R * Tp, Game.VIS_R * Tp * 2, Game.VIS_R * Tp * 2);

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

    // iz (kurşun kalemle çizilmiş yürüyüş yolu)
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
        ctx.strokeStyle = 'rgba(70,66,62,' + (0.12 + (b + 0.5) * 0.065) + ')';
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
      return dtype[j] === 1 ? Math.min(1, dalpha[j]) : 0;
    };
    var door = world.maze.door;
    var da = visibleAt(door.x, door.y);
    if (da > 0.02) {
      ctx.globalAlpha = da;
      drawDoor(ctx, gx(door.x), gy(door.y), Tp, world.hasKey, world.state === 'play' ? 0 : Math.min(1, world.exitT * 1.6), t);
      ctx.globalAlpha = 1;
    }
    if (!world.hasKey) {
      var ky = world.maze.key;
      var ka = visibleAt(ky.x, ky.y);
      if (ka > 0.02) {
        ctx.globalAlpha = ka;
        drawKey(ctx, gx(ky.x) + Tp / 2, gy(ky.y) + Tp / 2, Tp, t);
        ctx.globalAlpha = 1;
      }
    }
    for (var fi = 0; fi < world.flowers.length; fi++) {
      var fl = world.flowers[fi];
      if (fl.taken) continue;
      var fa = visibleAt(fl.x, fl.y);
      if (fa < 0.02) continue;
      ctx.globalAlpha = fa;
      drawFlower(ctx, gx(fl.x) + Tp / 2, gy(fl.y) + Tp / 2, Tp, t);
      ctx.globalAlpha = 1;
    }
    for (var si = 0; si < world.stones.length; si++) {
      var st = world.stones[si];
      var scx = gx(st.cx) + Tp / 2;
      var scy = gy(st.cy) + Tp / 2;
      var grow = Math.min(1, (world.t - st.born) * 5);
      ctx.globalAlpha = grow;
      drawStone(ctx, scx, scy, Tp, st.type, t, st.born);
      if (st.type === 'sound') {
        if (st.dir) drawArrow(ctx, scx, scy, Tp, st.dir, t);
        else if (st.atGoal) drawGoalMark(ctx, scx, scy, Tp, t);
      }
      ctx.globalAlpha = 1;
    }

    // oyuncu
    drawPlayer(ctx, psx, psy, Tp, p, t, world.state === 'exiting' ? Math.max(0, 1 - world.exitT * 0.9) : 1);

    // parçacıklar
    var parts = world.particles;
    for (var pi = 0; pi < parts.length; pi++) {
      var pt = parts[pi];
      var u = pt.life / pt.max;
      var sx = cx0 + (pt.x - camX) * Tp;
      var sy = cy0 + (pt.y - camY) * Tp;
      if (pt.kind === 'ring') {
        var rr = (0.35 + 2.7 * (1 - Math.pow(1 - u, 3))) * Tp;
        ctx.strokeStyle = rgba(pt.color === 'sound' ? TEAL : INK, (1 - u) * 0.65);
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

    // rüzgâr çizgileri (ekran uzayı)
    this.windFx += ((world.inWind ? 1 : 0) - this.windFx) * Math.min(1, dt * 3);
    if (this.windFx > 0.02) {
      ctx.strokeStyle = 'rgba(70,105,130,' + 0.26 * this.windFx + ')';
      ctx.lineWidth = Math.max(1.2, dpr * 1.3);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var wi = 0; wi < 18; wi++) {
        var wy = ((wi * 137.5) % 100) / 100 * H;
        var len = (60 + (wi * 53) % 90) * dpr;
        var wx = ((wi * 211 + t * (260 + (wi % 5) * 70) * dpr) % (W + len * 2)) - len;
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(wx + len * 0.5, wy - 6 * dpr, wx + len, wy + 2 * dpr);
      }
      ctx.stroke();
    }

    // vinyet
    ctx.drawImage(this.vignette, 0, 0);
  };

  S.Renderer = Renderer;
})(window);
