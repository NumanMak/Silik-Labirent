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

if (failed) { console.log('\n' + failed + ' test başarısız'); process.exit(1); }
console.log('\nHepsi geçti.');
