/* Oyun mantığı testleri — çalıştır: node tests/game.test.js */
'use strict';
const assert = require('assert');
const Maze = require('../js/maze.js');
const Levels = require('../js/levels.js');
const Game = require('../js/game.js');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('  ok  ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + (e.stack || e.message)); }
}

/** Sanal joystick: hedef hücrelere sırayla yürür. */
function walkTo(world, targetIdx, maxSec) {
  const w = world.w;
  const path = Maze.path(world.tiles, w, world.h, world.idx(Math.floor(world.player.x), Math.floor(world.player.y)), targetIdx);
  assert.ok(path, 'yol yok');
  let t = 0;
  for (let k = 1; k < path.length; k++) {
    const tx = (path[k] % w) + 0.5, ty = ((path[k] / w) | 0) + 0.5;
    let guard = 0;
    while (Math.hypot(tx - world.player.x, ty - world.player.y) > 0.12 && guard++ < 600) {
      const dx = tx - world.player.x, dy = ty - world.player.y, m = Math.hypot(dx, dy);
      world.update(1 / 60, { x: dx / m, y: dy / m });
      t += 1 / 60;
      if (world.state !== 'play') return t;
    }
    assert.ok(guard < 600, 'takıldı: hücre ' + k + ' / ' + path.length);
    if (t > maxSec) break;
  }
  return t;
}

const def = Levels.byId(6); // aynalı bölüm
let world;

check('bölüm 6: anahtara yürü, anahtar alınır', () => {
  world = new Game.World(def);
  const events = [];
  world.onEvent = (n) => events.push(n);
  walkTo(world, world.idx(world.maze.key.x, world.maze.key.y), 600);
  assert.ok(world.hasKey, 'anahtar alınmadı');
  assert.ok(events.includes('key') && events.includes('start') && events.includes('step'));
  assert.ok(world.time > 5, 'süre işlemiyor');
});

check('kapıya yürü, bölüm biter', () => {
  const events = [];
  world.onEvent = (n) => events.push(n);
  walkTo(world, world.idx(world.maze.door.x, world.maze.door.y), 600);
  for (let i = 0; i < 120; i++) world.update(1 / 60, { x: 0, y: 0 });
  assert.equal(world.state, 'won');
  assert.ok(events.includes('door') && events.includes('win'));
});

check('anahtarsız kapı kilitli', () => {
  const w2 = new Game.World(Levels.byId(1));
  const events = [];
  w2.onEvent = (n) => events.push(n);
  // kapının yanına kadar git (kapıya girme) ve ittir
  const d = w2.maze.door;
  const path = Maze.path(w2.tiles, w2.w, w2.h, w2.idx(w2.maze.start.x, w2.maze.start.y), w2.idx(d.x, d.y));
  const pre = path[path.length - 2];
  walkTo(w2, pre, 600);
  const dx = d.x - (pre % w2.w), dy = d.y - ((pre / w2.w) | 0);
  for (let i = 0; i < 90; i++) w2.update(1 / 60, { x: dx, y: dy });
  assert.ok(events.includes('locked'));
  assert.equal(w2.state, 'play');
  assert.equal(w2.hasKey, false);
});

check('hafıza: görüşten çıkan hücre ~mem sn içinde silinir', () => {
  const w3 = new Game.World(Levels.byId(1));
  const start = w3.idx(w3.maze.start.x, w3.maze.start.y);
  assert.ok(w3.known[start] === 1);
  // yerinde dur: görüş değişmez
  for (let i = 0; i < 60 * 20; i++) w3.update(1 / 60, { x: 0, y: 0 });
  assert.ok(w3.known[start] === 1, 'görüşteki hücre silinmemeli');
  // uzağa git
  const far = w3.idx(w3.maze.key.x, w3.maze.key.y);
  walkTo(w3, far, 600);
  for (let i = 0; i < 60 * 16; i++) w3.update(1 / 60, { x: 0, y: 0 });
  assert.equal(w3.known[start], 0, 'başlangıç hücresi 16 sn sonra silinmeli');
});

check('hatıra taşı: alan kilitlenir, geri alınınca silinmeye başlar', () => {
  const w4 = new Game.World(Levels.byId(1));
  const start = w4.idx(w4.maze.start.x, w4.maze.start.y);
  w4.toggleStone();
  assert.equal(w4.inv.memory, 2);
  assert.equal(w4.stones.length, 1);
  const cells = w4.stones[0].cells.slice();
  assert.ok(cells.length >= 9, 'kilitli hücre sayısı ' + cells.length);
  cells.forEach((i) => assert.ok(w4.lock[i] > 0));
  walkTo(w4, w4.idx(w4.maze.key.x, w4.maze.key.y), 600);
  for (let i = 0; i < 60 * 30; i++) w4.update(1 / 60, { x: 0, y: 0 });
  assert.equal(w4.known[start], 1, 'kilitli hücre 30 sn sonra da durmalı');
  assert.equal(w4.dink[start], 1, 'mürekkep stili');
  // geri dön ve al
  walkTo(w4, start, 600);
  w4.toggleStone();
  assert.equal(w4.inv.memory, 3);
  assert.equal(w4.stones.length, 0);
  cells.forEach((i) => assert.equal(w4.lock[i], 0));
});

check('taş bitince bırakılamaz', () => {
  const w5 = new Game.World(Levels.byId(1));
  const events = [];
  w5.onEvent = (n) => events.push(n);
  const path = Maze.path(w5.tiles, w5.w, w5.h, w5.idx(w5.maze.start.x, w5.maze.start.y), w5.idx(w5.maze.key.x, w5.maze.key.y));
  for (let k = 0; k < 3; k++) { walkTo(w5, path[3 + k * 4], 600); w5.toggleStone(); }
  assert.equal(w5.inv.memory, 0);
  walkTo(w5, path[18], 600);
  w5.toggleStone();
  assert.ok(events.includes('nostone'));
  assert.equal(w5.stones.length, 3);
});

check('çiçek +1 taş verir', () => {
  const w6 = new Game.World(Levels.byId(3));
  assert.equal(w6.flowers.length, 2);
  const f = w6.flowers[0];
  walkTo(w6, w6.idx(f.x, f.y), 900);
  assert.equal(w6.inv.memory, 4);
  assert.equal(w6.total.memory, 4);
  assert.ok(f.taken);
});

check('rüzgârlı hücre 2 kat hızlı silinir', () => {
  const w7 = new Game.World(Levels.byId(4));
  // rüzgâr içinde ve dışında birer hücre bul
  let inW = -1, outW = -1;
  for (let i = 0; i < w7.N; i++) { if (w7.tiles[i] === 0) { if (w7.wind[i] && inW < 0) inW = i; if (!w7.wind[i] && outW < 0) outW = i; } }
  w7.known[inW] = 1; w7.known[outW] = 1; w7.age[inW] = 0; w7.age[outW] = 0;
  w7.player.x = 1.5; w7.player.y = 1.5;
  const far = w7.visList.indexOf(inW) < 0 && w7.visList.indexOf(outW) < 0;
  if (!far) return;
  for (let i = 0; i < 60 * 7; i++) w7.update(1 / 60, { x: 0, y: 0 });
  const sIn = w7.strength(w7.age[inW]), sOut = w7.strength(w7.age[outW]);
  assert.ok(w7.age[inW] > w7.age[outW] * 1.9, 'yaş oranı ' + w7.age[inW] + '/' + w7.age[outW]);
  assert.ok(sIn < sOut);
});

check('ses taşı: ok anahtara, anahtardan sonra kapıya bakar', () => {
  const w8 = new Game.World(Levels.byId(5));
  w8.cur = 'sound';
  assert.equal(w8.total.sound, 1);
  w8.toggleStone();
  const s = w8.stones[0];
  assert.equal(s.type, 'sound');
  assert.ok(s.dir, 'ok yönü yok');
  const nx = s.cx + s.dir.dx, ny = s.cy + s.dir.dy;
  assert.ok(w8.distKey[ny * w8.w + nx] < w8.distKey[s.cy * w8.w + s.cx], 'ok anahtara yaklaştırmıyor');
  walkTo(w8, w8.idx(w8.maze.key.x, w8.maze.key.y), 900);
  assert.ok(w8.hasKey);
  assert.ok(w8.distDoor[(s.cy + s.dir.dy) * w8.w + s.cx + s.dir.dx] < w8.distDoor[s.cy * w8.w + s.cx], 'ok kapıya dönmeli');
});

check('ayna: görüşteki ayna hayalet hücre üretir, mürekkep alanında üretmez', () => {
  const w9 = new Game.World(Levels.byId(6));
  const m = w9.mirrors[0];
  const mx = m % w9.w, my = (m / w9.w) | 0;
  // aynaya komşu zemini bul
  let nb = -1;
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => { const i = (my+dy)*w9.w + mx+dx; if (w9.tiles[i] === 0) nb = i; });
  assert.ok(nb >= 0);
  let events = [];
  w9.onEvent = (n) => events.push(n);
  walkTo(w9, nb, 900);
  for (let i = 0; i < 10; i++) w9.update(1 / 60, { x: 0, y: 0 });
  assert.ok(events.includes('mirror'));
  let ph = 0;
  for (let i = 0; i < w9.N; i++) if (w9.ptype[i]) ph++;
  assert.ok(ph > 0, 'hayalet hücre oluşmadı');
});

check('tüm bölümler ve günlük için bot kapıya ulaşır', () => {
  Levels.LIST.concat([Levels.daily('2026-10-05')]).forEach((d) => {
    const wd = new Game.World(d);
    walkTo(wd, wd.idx(wd.maze.key.x, wd.maze.key.y), 3000);
    walkTo(wd, wd.idx(wd.maze.door.x, wd.maze.door.y), 3000);
    for (let i = 0; i < 100; i++) wd.update(1 / 60, { x: 0, y: 0 });
    assert.equal(wd.state, 'won', 'bölüm ' + d.id);
    const par = Game.parTime(wd.maze);
    console.log('      [' + d.id + '] ideal yürüyüş=' + wd.time.toFixed(1) + 's  par=' + par.toFixed(1) + 's  yıldız(ideal)=' + Game.stars(wd.maze, wd.time));
  });
});

if (failed) { console.log('\n' + failed + ' test başarısız'); process.exit(1); }
console.log('\nHepsi geçti.');
