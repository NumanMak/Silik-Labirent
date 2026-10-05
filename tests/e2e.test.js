/* Uçtan uca test: gerçek tarayıcıda (mobil emülasyonu) dokunmatik joystick, taş düğmesi,
 * duraklatma, bölümü bitirme, kayıt, klavye ve çevrimdışı çalışma.
 *
 *   npm i -D playwright        (ya da global playwright + NODE_PATH)
 *   CHROMIUM_PATH=/yol/chromium node tests/e2e.test.js
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  console.log('playwright bulunamadı; e2e testi atlandı.');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function serve() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('yok'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, () => ok(srv)));
}

(async () => {
  const srv = await serve();
  const url = 'http://localhost:' + srv.address().port + '/index.html';
  const browser = await playwright.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const errs = [];
  const watch = (p) => {
    p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
    p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  };
  const ok = (m) => console.log('  ok  ' + m);

  /* ---------- mobil ---------- */
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await mctx.newPage();
  watch(p);
  await p.goto(url);
  await p.waitForTimeout(400);
  const cdp = await mctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const S = () => p.evaluate(() => { const w = Silik.App.world; return { x: w.player.x, y: w.player.y, stones: w.stones.length, inv: w.inv.memory, mode: Silik.App.mode, time: w.time }; });
  const center = (sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);

  // menüden bölüm 1'e
  await p.tap('[data-go=levels]');
  await p.tap('.lvl:not(.daily):not(.locked)');
  await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => Silik.App.mode), 'intro');
  await p.tap('#btn-start');
  await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => Silik.App.mode), 'play');
  ok('menü -> bölüm tanıtımı -> oyun (dokunmatik)');

  const s0 = await S();
  const dir = await p.evaluate(() => { const w = Silik.App.world; const pa = Silik.Maze.path(w.tiles, w.w, w.h, w.idx(Math.floor(w.player.x), Math.floor(w.player.y)), w.idx(w.maze.key.x, w.maze.key.y)); const n = pa[1]; return { dx: (n % w.w) - Math.floor(w.player.x), dy: ((n / w.w) | 0) - Math.floor(w.player.y) }; });
  await touch('touchStart', [{ x: 160, y: 500, id: 1 }]);
  for (let i = 1; i <= 6; i++) { await touch('touchMove', [{ x: 160 + dir.dx * 8 * i, y: 500 + dir.dy * 8 * i, id: 1 }]); await p.waitForTimeout(30); }
  assert.ok(await p.evaluate(() => document.querySelector('#stick').classList.contains('on')), 'joystick görünmüyor');
  await p.waitForTimeout(800);
  const s1 = await S();
  assert.ok(Math.hypot(s1.x - s0.x, s1.y - s0.y) > 1.5, 'karakter joystick ile hareket etmedi');
  ok('sürükleyerek yürüme');

  const btn = await center('#btn-stone');
  const keep = { x: 160 + dir.dx * 48, y: 500 + dir.dy * 48, id: 1 };
  await touch('touchStart', [keep, { x: btn.x, y: btn.y, id: 2 }]);
  await p.waitForTimeout(60);
  await touch('touchEnd', [keep]);
  await p.waitForTimeout(300);
  assert.equal((await S()).stones, 1, 'çoklu dokunmada taş bırakılamadı');
  await touch('touchEnd', []);
  await p.waitForTimeout(300);
  const a = await S(); await p.waitForTimeout(300); const b = await S();
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.01, 'parmak kalkınca karakter durmadı');
  ok('bir parmak yürürken diğeriyle taş bırakma; bırakınca durma');

  await p.evaluate(() => { const w = Silik.App.world; const s = w.stones[0]; w.player.x = s.cx + 0.5; w.player.y = s.cy + 0.5; });
  await p.waitForTimeout(150);
  assert.equal(await p.textContent('#stone-lbl'), 'Geri Al');
  await p.touchscreen.tap(btn.x, btn.y);
  await p.waitForTimeout(200);
  const s4 = await S();
  assert.equal(s4.stones, 0); assert.equal(s4.inv, 3);
  ok('taşın üstünde "Geri Al"');

  const pb = await center('#btn-pause');
  await p.touchscreen.tap(pb.x, pb.y);
  await p.waitForTimeout(300);
  assert.equal((await S()).mode, 'pause');
  const t1 = (await S()).time; await p.waitForTimeout(400);
  assert.equal((await S()).time, t1, 'duraklatınca süre işliyor');
  await p.tap('#btn-resume');
  assert.equal((await S()).mode, 'play');
  ok('duraklat / devam');

  // sanal joystick botuyla bölümü bitir
  await p.evaluate(() => {
    const w = Silik.App.world; const I = Silik.Input; let phase = 0, plan = [];
    const idx = () => w.idx(Math.floor(w.player.x), Math.floor(w.player.y));
    const go = (t) => { plan = Silik.Maze.path(w.tiles, w.w, w.h, idx(), t); plan.shift(); };
    go(w.idx(w.maze.key.x, w.maze.key.y));
    (function tick() {
      if (!plan.length && phase === 0) { phase = 1; go(w.idx(w.maze.door.x, w.maze.door.y)); }
      if (plan.length) {
        const tx = (plan[0] % w.w) + 0.5, ty = ((plan[0] / w.w) | 0) + 0.5;
        const dx = tx - w.player.x, dy = ty - w.player.y, m = Math.hypot(dx, dy);
        if (m < 0.12) plan.shift(); else I.override = { x: dx / m, y: dy / m };
      } else I.override = { x: 0, y: 0 };
      if (Silik.App.mode === 'play' || Silik.App.mode === 'win') requestAnimationFrame(tick); else I.override = null;
    })();
  });
  await p.waitForFunction(() => Silik.App.mode === 'win', null, { timeout: 90000 });
  await p.evaluate(() => { Silik.Input.override = null; });
  const save = await p.evaluate(() => JSON.parse(localStorage.getItem('silik.v1')));
  assert.equal(save.unlocked, 2);
  assert.ok(save.best[1] && save.best[1].stars >= 1);
  ok('bölüm bitti, sonraki bölüm açıldı, yıldız kaydedildi');
  await p.tap('#btn-next');
  await p.waitForTimeout(300);
  assert.equal(await p.textContent('#intro-name'), 'Sis');
  ok('sonraki bölüm tanıtımı');

  /* ---------- masaüstü: klavye + çevrimdışı ---------- */
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'allow' });
  const d = await dctx.newPage();
  watch(d);
  await d.goto(url);
  await d.mouse.click(640, 360);
  await d.evaluate(async () => {
    Silik.Audio.unlock(); Silik.Audio.startMusic();
    for (const n of ['step', 'drop', 'pick', 'key', 'flower', 'locked', 'door', 'whisper', 'mirror', 'win', 'click', 'erase']) Silik.Audio.sfx(n);
    Silik.Audio.setWind(1);
    await navigator.serviceWorker.ready;
  });
  await d.waitForTimeout(1500);
  await dctx.setOffline(true);
  await d.reload();
  await d.waitForTimeout(800);
  assert.equal(await d.textContent('#s-title .logo'), 'Silik');
  ok('çevrimdışı açılış (service worker)');
  await d.click('#btn-play');
  await d.keyboard.press('Enter');
  await d.waitForTimeout(200);
  assert.equal(await d.evaluate(() => Silik.App.mode), 'play');
  const dr = await d.evaluate(() => { const w = Silik.App.world; const pa = Silik.Maze.path(w.tiles, w.w, w.h, w.idx(Math.floor(w.player.x), Math.floor(w.player.y)), w.idx(w.maze.key.x, w.maze.key.y)); const n = pa[1]; return [(n % w.w) - Math.floor(w.player.x), ((n / w.w) | 0) - Math.floor(w.player.y)].join(','); });
  const key = { '1,0': 'ArrowRight', '-1,0': 'ArrowLeft', '0,1': 'ArrowDown', '0,-1': 'ArrowUp' }[dr];
  const q0 = await d.evaluate(() => Silik.App.world.player.x + Silik.App.world.player.y);
  await d.keyboard.down(key); await d.waitForTimeout(700); await d.keyboard.up(key);
  const q1 = await d.evaluate(() => Silik.App.world.player.x + Silik.App.world.player.y);
  assert.ok(Math.abs(q1 - q0) > 1.5, 'klavye ile hareket yok');
  await d.keyboard.press('Space');
  assert.equal(await d.evaluate(() => Silik.App.world.stones.length), 1);
  await d.keyboard.press('Space');
  assert.equal(await d.evaluate(() => Silik.App.world.stones.length), 0);
  await d.keyboard.press('KeyP');
  assert.equal(await d.evaluate(() => Silik.App.mode), 'pause');
  await d.keyboard.press('Escape');
  assert.equal(await d.evaluate(() => Silik.App.mode), 'play');
  ok('klavye: yürü, Boşluk ile taş bırak/geri al, P/Esc ile duraklat');

  assert.deepStrictEqual(errs, [], 'konsol hataları: ' + errs.join(' | '));
  ok('konsolda hata/uyarı yok');
  await browser.close();
  srv.close();
  console.log('\nHepsi geçti.');
})().catch((e) => { console.error('\nTEST HATASI', e); process.exit(1); });
