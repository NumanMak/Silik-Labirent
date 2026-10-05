/* Silik — labirent üretimi ve yol bulma (tarayıcı + Node uyumlu)
 *
 * Izgara: 1 = duvar, 0 = zemin. Koridorlar tek karelik, kenarlar her zaman duvar.
 * Tüm yerleşimler (anahtar, kapı, çiçek, ayna, rüzgâr) tohuma bağlıdır; aynı tohum
 * her zaman aynı bölümü verir, böylece en iyi süreler karşılaştırılabilir.
 */
(function (root, factory) {
  var m = factory(typeof module === 'object' && module.exports ? require('./util.js') : root.Silik.Util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.Silik.Maze = m;
})(this, function (Util) {
  'use strict';

  var DIRS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  function odd(n) {
    n = Math.max(7, n | 0);
    return n % 2 === 0 ? n + 1 : n;
  }

  /** Tek kaynaklı genişlik öncelikli arama. Ulaşılamayanlar -1. */
  function bfs(tiles, w, h, sx, sy) {
    return bfsMulti(tiles, w, h, [sy * w + sx]);
  }

  function bfsMulti(tiles, w, h, sources) {
    var dist = new Int32Array(w * h).fill(-1);
    var queue = new Int32Array(w * h);
    var qh = 0;
    var qt = 0;
    for (var i = 0; i < sources.length; i++) {
      dist[sources[i]] = 0;
      queue[qt++] = sources[i];
    }
    while (qh < qt) {
      var c = queue[qh++];
      var cx = c % w;
      var cy = (c / w) | 0;
      for (var d = 0; d < 4; d++) {
        var nx = cx + DIRS[d][0];
        var ny = cy + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var n = ny * w + nx;
        if (tiles[n] !== 0 || dist[n] !== -1) continue;
        dist[n] = dist[c] + 1;
        queue[qt++] = n;
      }
    }
    return dist;
  }

  /** from -> to arası en kısa yol (indeks dizisi, ikisi de dahil). */
  function path(tiles, w, h, from, to) {
    var dist = bfsMulti(tiles, w, h, [to]); // hedeften yayıl, kaynaktan inerek yürü
    if (dist[from] < 0) return null;
    var out = [from];
    var cur = from;
    while (cur !== to) {
      var cx = cur % w;
      var cy = (cur / w) | 0;
      var best = -1;
      for (var d = 0; d < 4; d++) {
        var nx = cx + DIRS[d][0];
        var ny = cy + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var n = ny * w + nx;
        if (dist[n] >= 0 && dist[n] < dist[cur]) {
          best = n;
          break;
        }
      }
      if (best < 0) return null;
      out.push(best);
      cur = best;
    }
    return out;
  }

  function generate(p) {
    var rand = Util.rng(p.seed);
    var w = odd(p.w);
    var h = odd(p.h);
    var N = w * h;
    var tiles = new Uint8Array(N).fill(1);
    var mirror = new Uint8Array(N);
    var wind = new Uint8Array(N);

    function at(x, y) {
      return y * w + x;
    }
    function inside(x, y) {
      return x >= 0 && y >= 0 && x < w && y < h;
    }
    function degree(x, y) {
      var n = 0;
      for (var d = 0; d < 4; d++) {
        var nx = x + DIRS[d][0];
        var ny = y + DIRS[d][1];
        if (inside(nx, ny) && tiles[at(nx, ny)] === 0) n++;
      }
      return n;
    }

    /* 1) "Büyüyen ağaç" ile oyma: çoğunlukla en yeni hücreden (uzun koridorlar), arada
          rastgele bir hücreden devam eder (dallanma/kavşak). Düz gitmeye hafif eğilim var. */
    var corners = [
      [1, 1],
      [w - 2, 1],
      [1, h - 2],
      [w - 2, h - 2],
    ];
    var sc = corners[Math.floor(rand() * 4)];
    var straight = p.straight != null ? p.straight : 0.5;
    var branch = p.branch != null ? p.branch : 0.3;
    var active = [[sc[0], sc[1], -1]];
    tiles[at(sc[0], sc[1])] = 0;
    while (active.length) {
      var pick = rand() < branch ? Math.floor(rand() * active.length) : active.length - 1;
      var cur = active[pick];
      var opts = [];
      for (var d = 0; d < 4; d++) {
        var nx = cur[0] + DIRS[d][0] * 2;
        var ny = cur[1] + DIRS[d][1] * 2;
        if (nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && tiles[at(nx, ny)] === 1) opts.push(d);
      }
      if (!opts.length) {
        active.splice(pick, 1);
        continue;
      }
      var dir;
      if (cur[2] >= 0 && opts.indexOf(cur[2]) >= 0 && rand() < straight) dir = cur[2];
      else dir = opts[Math.floor(rand() * opts.length)];
      tiles[at(cur[0] + DIRS[dir][0], cur[1] + DIRS[dir][1])] = 0;
      tiles[at(cur[0] + DIRS[dir][0] * 2, cur[1] + DIRS[dir][1] * 2)] = 0;
      active.push([cur[0] + DIRS[dir][0] * 2, cur[1] + DIRS[dir][1] * 2, dir]);
    }

    /* 2) Döngüler: bazı çıkmaz sokakları komşu koridora bağla */
    var braid = p.braid || 0;
    if (braid > 0) {
      for (var y = 1; y < h - 1; y += 2) {
        for (var x = 1; x < w - 1; x += 2) {
          if (degree(x, y) !== 1 || rand() > braid) continue;
          var cand = [];
          for (var dd = 0; dd < 4; dd++) {
            var wx = x + DIRS[dd][0];
            var wy = y + DIRS[dd][1];
            var bx = x + DIRS[dd][0] * 2;
            var by = y + DIRS[dd][1] * 2;
            if (wx > 0 && wy > 0 && wx < w - 1 && wy < h - 1 && inside(bx, by) && tiles[at(wx, wy)] === 1 && tiles[at(bx, by)] === 0) {
              cand.push(at(wx, wy));
            }
          }
          if (cand.length) tiles[cand[Math.floor(rand() * cand.length)]] = 0;
        }
      }
    }

    /* 3) Başlangıç, kapı, anahtar */
    var start = at(sc[0], sc[1]);
    var dS = bfs(tiles, w, h, sc[0], sc[1]);
    var floorCount = 0;
    var deadEnds = [];
    for (var i = 0; i < N; i++) {
      if (tiles[i] !== 0) continue;
      floorCount++;
      if (i !== start && degree(i % w, (i / w) | 0) === 1) deadEnds.push(i);
    }
    if (!deadEnds.length) deadEnds.push(dS.indexOf(Math.max.apply(null, Array.prototype.slice.call(dS))));

    var byStart = deadEnds.slice().sort(function (a, b) {
      return dS[b] - dS[a];
    });
    var pool = byStart.slice(0, Math.max(3, Math.ceil(byStart.length * 0.1)));
    var door = pool[Math.floor(rand() * pool.length)];
    var dD = bfs(tiles, w, h, door % w, (door / w) | 0);

    var keyCands = deadEnds
      .filter(function (c) {
        return c !== door && dS[c] > 4 && dD[c] > 4;
      })
      .map(function (c) {
        return { c: c, s: Math.min(dS[c], dD[c]) + 0.25 * Math.max(dS[c], dD[c]) };
      })
      .sort(function (a, b) {
        return b.s - a.s;
      });
    if (!keyCands.length) {
      keyCands = deadEnds
        .filter(function (c) {
          return c !== door;
        })
        .map(function (c) {
          return { c: c, s: 0 };
        });
    }
    var key = keyCands[Math.floor(rand() * Math.min(3, keyCands.length))].c;

    /* 4) Ana güzergâh: başlangıç -> anahtar -> kapı */
    var routeA = path(tiles, w, h, start, key);
    var routeB = path(tiles, w, h, key, door);
    var route = routeA.concat(routeB);
    var routeSet = {};
    route.forEach(function (c) {
      routeSet[c] = 1;
    });
    var dRoute = bfsMulti(tiles, w, h, route);

    /* 5) Çiçekler: ana yoldan sapılarak ulaşılan çıkmaz sokaklar */
    var flowers = [];
    var want = p.flowers || 0;
    if (want) {
      var taken = {};
      taken[start] = taken[key] = taken[door] = 1;
      var farDead = Util.shuffle(
        deadEnds.filter(function (c) {
          return !taken[c] && dRoute[c] >= 3;
        }),
        rand
      );
      var others = Util.shuffle(
        route.length
          ? Array.prototype.slice
              .call(dRoute)
              .map(function (v, c) {
                return v >= 3 && tiles[c] === 0 && !taken[c] ? c : -1;
              })
              .filter(function (c) {
                return c >= 0;
              })
          : [],
        rand
      );
      var order = farDead.concat(others);
      var minGap = 7;
      while (flowers.length < want && minGap >= 0) {
        for (var oi = 0; oi < order.length && flowers.length < want; oi++) {
          var c = order[oi];
          if (flowers.some(function (f) {
            return f.i === c;
          })) continue;
          var cx = c % w;
          var cy = (c / w) | 0;
          var ok = flowers.every(function (f) {
            return Math.abs(f.x - cx) + Math.abs(f.y - cy) >= minGap;
          });
          if (ok) flowers.push({ x: cx, y: cy, i: c });
        }
        minGap -= 3;
      }
    }

    /* 6) Ayna duvarlar: çıkmaz sokağın ucundaki duvar -> koridor "devam ediyormuş" gibi yansır */
    var mirrors = [];
    var mWant = p.mirrors || 0;
    if (mWant) {
      var sx0 = sc[0];
      var sy0 = sc[1];
      var okMirror = function (mx, my) {
        if (mx < 1 || my < 1 || mx > w - 2 || my > h - 2) return false;
        if (tiles[at(mx, my)] !== 1 || mirror[at(mx, my)]) return false;
        if (Math.abs(mx - sx0) + Math.abs(my - sy0) < 5) return false;
        for (var k = 0; k < mirrors.length; k++) {
          var q = mirrors[k];
          if (Math.abs((q % w) - mx) + Math.abs(((q / w) | 0) - my) < 4) return false;
        }
        return true;
      };
      var ends = Util.shuffle(deadEnds.slice(), rand);
      for (var e = 0; e < ends.length && mirrors.length < mWant; e++) {
        var ex = ends[e] % w;
        var ey = (ends[e] / w) | 0;
        for (var ed = 0; ed < 4; ed++) {
          var ox = ex + DIRS[ed][0];
          var oy = ey + DIRS[ed][1];
          if (!inside(ox, oy) || tiles[at(ox, oy)] !== 0) continue;
          var mx = ex - DIRS[ed][0];
          var my = ey - DIRS[ed][1];
          if (okMirror(mx, my)) {
            mirror[at(mx, my)] = 1;
            mirrors.push(at(mx, my));
          }
          break;
        }
      }
      // yetmezse koridor yanlarındaki duvarlar
      var walls = [];
      for (var wy2 = 1; wy2 < h - 1; wy2++) {
        for (var wx2 = 1; wx2 < w - 1; wx2++) {
          if (tiles[at(wx2, wy2)] === 1 && degree(wx2, wy2) >= 1) walls.push(at(wx2, wy2));
        }
      }
      Util.shuffle(walls, rand);
      for (var wi = 0; wi < walls.length && mirrors.length < mWant; wi++) {
        var mx2 = walls[wi] % w;
        var my2 = (walls[wi] / w) | 0;
        if (okMirror(mx2, my2)) {
          mirror[walls[wi]] = 1;
          mirrors.push(walls[wi]);
        }
      }
    }

    /* 7) Rüzgâr bölgeleri */
    var windRects = [];
    var zones = p.wind || 0;
    for (var z = 0; z < zones; z++) {
      for (var attempt = 0; attempt < 30; attempt++) {
        var zw = Math.round(w * (0.26 + rand() * 0.14));
        var zh = Math.round(h * (0.26 + rand() * 0.14));
        var zx = 1 + Math.floor(rand() * Math.max(1, w - 2 - zw));
        var zy = 1 + Math.floor(rand() * Math.max(1, h - 2 - zh));
        var zcx = zx + zw / 2;
        var zcy = zy + zh / 2;
        var farFromStart = Math.abs(zcx - sc[0]) + Math.abs(zcy - sc[1]) > 7;
        var overlaps = windRects.some(function (r) {
          return Math.abs(r.x + r.w / 2 - zcx) < (r.w + zw) / 2 * 0.8 && Math.abs(r.y + r.h / 2 - zcy) < (r.h + zh) / 2 * 0.8;
        });
        if (farFromStart && !overlaps) {
          windRects.push({ x: zx, y: zy, w: zw, h: zh });
          break;
        }
      }
    }
    windRects.forEach(function (r) {
      for (var yy = r.y; yy < r.y + r.h; yy++) for (var xx = r.x; xx < r.x + r.w; xx++) wind[at(xx, yy)] = 1;
    });

    return {
      w: w,
      h: h,
      tiles: tiles,
      mirror: mirror,
      wind: wind,
      windRects: windRects,
      mirrors: mirrors,
      start: { x: sc[0], y: sc[1] },
      key: { x: key % w, y: (key / w) | 0 },
      door: { x: door % w, y: (door / w) | 0 },
      flowers: flowers.map(function (f) {
        return { x: f.x, y: f.y };
      }),
      route: route,
      stats: {
        floor: floorCount,
        toKey: dS[key],
        keyToDoor: dD[key],
        deadEnds: deadEnds.length,
      },
    };
  }

  return { DIRS: DIRS, generate: generate, bfs: bfs, bfsMulti: bfsMulti, path: path };
});
