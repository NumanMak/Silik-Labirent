/* Kayıt (localStorage) dayanıklılığı — çalıştır: node tests/storage.test.js */
'use strict';
const assert = require('assert');
const path = require('path');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('  ok  ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + (e.stack || e.message)); }
}

function load(raw, opts) {
  opts = opts || {};
  const store = {};
  global.window = global;
  global.localStorage = opts.throws
    ? { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } }
    : { getItem: () => raw, setItem: (k, v) => { store[k] = v; } };
  delete require.cache[require.resolve(path.join('..', 'js', 'storage.js'))];
  delete global.Silik;
  require(path.join('..', 'js', 'storage.js'));
  return { Save: global.Silik.Save, store };
}

const BAD = [
  'null', '5', '"abc"', '[]', '{bad', '',
  '{"best":5}', '{"best":"x"}', '{"daily":5}', '{"daily":[]}', '{"seen":5}', '{"seen":"s"}', '{"settings":5}',
  '{"unlocked":"3"}', '{"unlocked":-5}', '{"unlocked":1e20}', '{"unlocked":null}',
  '{"best":{"1":{"time":"x","stars":3}}}', '{"best":{"1":null}}', '{"best":{"1":{"time":-4,"stars":2}}}',
];

BAD.forEach((raw) => {
  check('bozuk kayıt ' + JSON.stringify(raw) + ': yükleme ve kayıt çökmez, şekil geçerli', () => {
    const { Save } = load(raw === '' ? null : raw);
    const d = Save.data;
    assert.ok(Number.isInteger(d.unlocked) && d.unlocked >= 1 && d.unlocked <= 999);
    assert.ok(d.best && typeof d.best === 'object' && !Array.isArray(d.best));
    assert.ok(d.daily && typeof d.daily === 'object' && !Array.isArray(d.daily));
    assert.ok(d.seen && typeof d.seen === 'object' && !Array.isArray(d.seen));
    Object.values(d.best).forEach((r) => assert.ok(isFinite(r.time) && r.stars >= 1 && r.stars <= 3));
    Save.markSeen('x');
    const res = Save.record({ id: 1 }, 12.5, 3, 40);
    assert.equal(res.record, true);
    Save.record({ daily: true, dateKey: '2026-01-01' }, 20, 2, 50);
    assert.equal(Save.data.unlocked >= 2, true);
  });
});

check('geçerli kayıt korunur', () => {
  const { Save } = load(JSON.stringify({ v: 1, unlocked: 4, best: { 1: { time: 20, stars: 3, steps: 50 } }, daily: {}, settings: { sfx: false, music: true, vib: false }, seen: { move: 1 } }));
  assert.equal(Save.data.unlocked, 4);
  assert.equal(Save.data.best[1].stars, 3);
  assert.equal(Save.data.settings.sfx, false);
  assert.equal(Save.data.seen.move, 1);
});

check('localStorage erişilemezse bellekte çalışır', () => {
  const { Save } = load(null, { throws: true });
  assert.equal(Save.data.unlocked, 1);
  Save.record({ id: 1 }, 10, 3, 30);
  assert.equal(Save.data.unlocked, 2);
});

check('daha kötü süre en iyiyi bozmaz, yıldız düşmez', () => {
  const { Save } = load(null);
  Save.record({ id: 1 }, 10, 3, 30);
  const r = Save.record({ id: 1 }, 50, 1, 90);
  assert.equal(r.record, false);
  assert.equal(Save.data.best[1].time, 10);
  assert.equal(Save.data.best[1].stars, 3);
});

if (failed) { console.log('\n' + failed + ' test başarısız'); process.exit(1); }
console.log('\nHepsi geçti.');
