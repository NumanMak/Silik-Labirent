/* Labirent üretimi testleri — çalıştır: node tests/maze.test.js */
'use strict';
const assert = require('assert');
const Maze = require('../js/maze.js');
const Levels = require('../js/levels.js');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('  ok  ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}

const defs = Levels.LIST.concat([Levels.daily('2026-10-05'), Levels.daily('2027-01-31')]);

defs.forEach(function (def) {
  const m = Maze.generate(def);
  const { w, h, tiles } = m;
  const idx = (p) => p.y * w + p.x;
  console.log('\n[' + def.id + '] ' + def.name + ' ' + w + 'x' + h);

  check('kenarlar duvar', () => {
    for (let x = 0; x < w; x++) { assert.equal(tiles[x], 1); assert.equal(tiles[(h - 1) * w + x], 1); }
    for (let y = 0; y < h; y++) { assert.equal(tiles[y * w], 1); assert.equal(tiles[y * w + w - 1], 1); }
  });
  check('başlangıç, anahtar, kapı zemin ve birbirinden farklı', () => {
    [m.start, m.key, m.door].forEach((p) => assert.equal(tiles[idx(p)], 0));
    assert.notEqual(idx(m.start), idx(m.key));
    assert.notEqual(idx(m.start), idx(m.door));
    assert.notEqual(idx(m.key), idx(m.door));
  });
  check('anahtar ve kapıya ulaşılabilir', () => {
    const d = Maze.bfs(tiles, w, h, m.start.x, m.start.y);
    assert.ok(d[idx(m.key)] > 0, 'anahtar'); assert.ok(d[idx(m.door)] > 0, 'kapı');
    m.flowers.forEach((f) => assert.ok(d[idx(f)] > 0, 'çiçek'));
  });
  check('tüm zeminler tek parça (mükemmel/örgülü labirent)', () => {
    const d = Maze.bfs(tiles, w, h, m.start.x, m.start.y);
    for (let i = 0; i < w * h; i++) if (tiles[i] === 0) assert.ok(d[i] >= 0);
  });
  check('anahtar kapıdan uzak', () => {
    assert.ok(m.stats.keyToDoor >= Math.min(w, h) * 0.8, 'keyToDoor=' + m.stats.keyToDoor);
    assert.ok(m.stats.toKey >= 6, 'toKey=' + m.stats.toKey);
  });
  check('çiçek sayısı ve ana yoldan uzaklık', () => {
    assert.equal(m.flowers.length, def.flowers);
    const dr = Maze.bfsMulti(tiles, w, h, m.route);
    m.flowers.forEach((f) => assert.ok(dr[idx(f)] >= 3, 'çiçek ana yola çok yakın'));
  });
  check('ayna sayısı, iç duvarda, zemin üstünde değil', () => {
    assert.equal(m.mirrors.length, def.mirrors);
    m.mirrors.forEach((i) => { assert.equal(tiles[i], 1); assert.equal(m.mirror[i], 1); });
  });
  check('rüzgâr bölgesi sayısı', () => {
    assert.equal(m.windRects.length, def.wind);
  });
  check('aynı tohum aynı labirent', () => {
    const m2 = Maze.generate(def);
    assert.deepStrictEqual(Array.from(m2.tiles), Array.from(tiles));
    assert.deepStrictEqual(m2.key, m.key);
  });
  console.log('      zemin=' + m.stats.floor + ' başlangıç→anahtar=' + m.stats.toKey + ' anahtar→kapı=' + m.stats.keyToDoor + ' çıkmaz=' + m.stats.deadEnds);
});

console.log('\n[süpürme] rastgele tohum/boyut/parametreler');
check('kapı tek çıkmaz sokak olsa bile üretim çökmez (bilinen tohum)', () => {
  const m = Maze.generate({ seed: 926374139, w: 15, h: 15, braid: 0.05, branch: 0.1, straight: 0.9 });
  assert.notEqual(m.key.x + ',' + m.key.y, m.door.x + ',' + m.door.y);
});
check('1500 rastgele labirent: çökme yok, anahtar/kapı/çiçek erişilebilir, rüzgâr başlangıçta değil, bölgeler çakışmıyor', () => {
  const R = require('../js/util.js').rng(777);
  for (let i = 0; i < 1500; i++) {
    const size = 15 + 2 * Math.floor(R() * 14);
    const def = { seed: Math.floor(R() * 1e9), w: size, h: size, braid: R() * 0.3, branch: R(), straight: R(), flowers: Math.floor(R() * 4), mirrors: Math.floor(R() * 8), wind: Math.floor(R() * 4) };
    const m = Maze.generate(def);
    const d = Maze.bfs(m.tiles, m.w, m.h, m.start.x, m.start.y);
    const at = (p) => p.y * m.w + p.x;
    assert.ok(d[at(m.key)] > 0 && d[at(m.door)] > 0, 'ulaşılamıyor ' + JSON.stringify(def));
    assert.notEqual(at(m.key), at(m.door));
    m.flowers.forEach((f) => assert.ok(d[at(f)] > 0));
    assert.equal(m.wind[at(m.start)], 0, 'başlangıç rüzgârda ' + JSON.stringify(def));
    for (let a = 0; a < m.windRects.length; a++) for (let b = a + 1; b < m.windRects.length; b++) {
      const p = m.windRects[a], q = m.windRects[b];
      assert.ok(p.x + p.w <= q.x || q.x + q.w <= p.x || p.y + p.h <= q.y || q.y + q.h <= p.y, 'rüzgâr bölgeleri çakışıyor');
    }
  }
});
check('anahtar ile kapı düz mesafeyle de uzak (12 bölüm)', () => {
  Levels.LIST.forEach((def) => {
    const m = Maze.generate(def);
    const sep = Math.abs(m.key.x - m.door.x) + Math.abs(m.key.y - m.door.y);
    assert.ok(sep >= 0.4 * Math.max(m.w, m.h) - 1e-9, 'bölüm ' + def.id + ' ayrım=' + sep);
  });
});

if (failed) { console.log('\n' + failed + ' test başarısız'); process.exit(1); }
console.log('\nHepsi geçti.');
