/* Silik — oyun dünyası (mantık). DOM'a bağımlı değildir; tarayıcıda da Node'da da çalışır.
 *
 * Hafıza modeli:
 *   - Görüş alanındaki hücreler "yaş" 0'dır. Görüşten çıkan hücrenin yaşı artar.
 *   - Güç = 1 (ilk HOLD sn) sonra 0'a yumuşakça iner; `mem` saniyede tamamen silinir.
 *   - Rüzgârlı hücrelerde yaş 2 kat hızlı artar.
 *   - Hatıra taşı bırakılınca çevresindeki hücreler kilitlenir (mürekkep): yaşlanmaz.
 *   - Ayna duvar, görüş alanındaki zemin/duvarları kendi düzleminde yansıtır; bunlar "hayalet"
 *     hücre olarak haritaya sahte yol çizer. Mürekkep (kilitli) hücrelerde hayalet oluşmaz.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var m = factory(node ? require('./util.js') : root.Silik.Util, node ? require('./maze.js') : root.Silik.Maze);
  if (node) module.exports = m;
  else root.Silik.Game = m;
})(this, function (Util, Maze) {
  'use strict';

  const VIS_R = 3.6; // görüş yarıçapı (kare)
  const STONE_R = 3.0; // taşın kalıcı kıldığı alan
  const SPEED = 3.9; // kare / sn
  const PR = 0.27; // oyuncu yarıçapı
  const HOLD = 1.5; // silinmeden önceki tam görünürlük süresi (sn)
  const DIRS = Maze.DIRS;

  class World {
    constructor(def, opts) {
      opts = opts || {};
      this.def = def;
      this.demo = !!opts.demo;
      const m = (this.maze = Maze.generate(def));
      this.w = m.w;
      this.h = m.h;
      const N = (this.N = m.w * m.h);
      this.tiles = m.tiles;
      this.mirrorMap = m.mirror;
      this.wind = m.wind;
      this.mirrors = m.mirrors;
      this.mem = def.mem;
      this.doorIdx = m.door.y * m.w + m.door.x;

      this.known = new Uint8Array(N);
      this.age = new Float32Array(N);
      this.appear = new Float32Array(N);
      this.lock = new Uint8Array(N);
      this.ptype = new Uint8Array(N);
      this.page = new Float32Array(N);
      this.pap = new Float32Array(N);
      this.vis = new Uint8Array(N);
      this.visList = [];
      this.dtype = new Uint8Array(N); // 0 yok, 1 zemin, 2 duvar, 3 ayna
      this.dalpha = new Float32Array(N);
      this.dink = new Uint8Array(N);

      this.player = { x: m.start.x + 0.5, y: m.start.y + 0.5, face: Math.PI / 2, moving: false, walk: 0 };
      this.hasKey = false;
      this.flowers = m.flowers.map((f) => ({ x: f.x, y: f.y, taken: false }));
      this.flowersTaken = 0;
      this.inv = { memory: def.stones, sound: def.sound || 0 };
      this.total = { memory: def.stones, sound: def.sound || 0 };
      this.cur = 'memory'; // seçili taş türü
      this.stones = [];
      this.trail = [];
      this.particles = [];
      this.t = 0; // dünya saati (animasyonlar)
      this.time = 0; // oyun süresi
      this.steps = 0;
      this.placedCount = 0;
      this.started = false;
      this.state = 'play'; // play | exiting | won
      this.exitT = 0;
      this.inWind = false;
      this.fadeSeen = false;
      this.mirrorSeen = false;
      this.stepAcc = 0;
      this.lockedMsgT = 0;
      this.onEvent = null;

      // sesli taş okları için hedef mesafe haritaları
      this.distKey = Maze.bfs(this.tiles, m.w, m.h, m.key.x, m.key.y);
      this.distDoor = Maze.bfs(this.tiles, m.w, m.h, m.door.x, m.door.y);

      this.updateVisibility(0);
      this.buildDisplay();
    }

    emit(name, data) {
      if (this.onEvent) this.onEvent(name, data);
    }

    idx(x, y) {
      return y * this.w + x;
    }

    /* ---------- hareket ve çarpışma ---------- */

    solid(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
      const i = ty * this.w + tx;
      if (this.tiles[i] === 1) return true;
      return i === this.doorIdx && !this.hasKey;
    }

    moveX(dx) {
      const p = this.player;
      let nx = p.x + dx;
      const y0 = Math.floor(p.y - PR + 1e-6);
      const y1 = Math.floor(p.y + PR - 1e-6);
      if (dx > 0) {
        const tx = Math.floor(nx + PR);
        for (let ty = y0; ty <= y1; ty++) if (this.solid(tx, ty)) { nx = tx - PR - 1e-4; this.bump(tx, ty); break; }
      } else if (dx < 0) {
        const tx = Math.floor(nx - PR);
        for (let ty = y0; ty <= y1; ty++) if (this.solid(tx, ty)) { nx = tx + 1 + PR + 1e-4; this.bump(tx, ty); break; }
      }
      const moved = nx - p.x;
      p.x = nx;
      return moved;
    }

    moveY(dy) {
      const p = this.player;
      let ny = p.y + dy;
      const x0 = Math.floor(p.x - PR + 1e-6);
      const x1 = Math.floor(p.x + PR - 1e-6);
      if (dy > 0) {
        const ty = Math.floor(ny + PR);
        for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) { ny = ty - PR - 1e-4; this.bump(tx, ty); break; }
      } else if (dy < 0) {
        const ty = Math.floor(ny - PR);
        for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) { ny = ty + 1 + PR + 1e-4; this.bump(tx, ty); break; }
      }
      const moved = ny - p.y;
      p.y = ny;
      return moved;
    }

    bump(tx, ty) {
      if (ty * this.w + tx === this.doorIdx && !this.hasKey && this.lockedMsgT <= 0) {
        this.lockedMsgT = 1.6;
        this.emit('locked');
      }
    }

    /** Girdi vektörü (-1..1) ile oyuncuyu ilerletir. Koridor ortasına yumuşak çekim uygular. */
    move(dt, vx, vy) {
      const p = this.player;
      const mag = Math.min(1, Math.hypot(vx, vy));
      if (mag < 0.02) {
        p.moving = false;
        return 0;
      }
      const speed = SPEED * (0.35 + 0.65 * mag);
      let ux = vx / Math.hypot(vx, vy);
      let uy = vy / Math.hypot(vx, vy);
      const ax = Math.abs(ux);
      const ay = Math.abs(uy);
      let pullX = false;
      let pullY = false;
      if (ax > ay * 1.9) {
        ux = Math.sign(ux);
        uy = 0;
        pullY = true;
      } else if (ay > ax * 1.9) {
        uy = Math.sign(uy);
        ux = 0;
        pullX = true;
      }
      const pull = speed * 1.15 * dt;
      if (pullX) {
        const c = Math.floor(p.x) + 0.5;
        const d = c - p.x;
        if (Math.abs(d) > 1e-4) this.moveX(Math.sign(d) * Math.min(Math.abs(d), pull));
      }
      if (pullY) {
        const c = Math.floor(p.y) + 0.5;
        const d = c - p.y;
        if (Math.abs(d) > 1e-4) this.moveY(Math.sign(d) * Math.min(Math.abs(d), pull));
      }
      const mx = this.moveX(ux * speed * dt);
      const my = this.moveY(uy * speed * dt);
      const dist = Math.hypot(mx, my);
      p.moving = dist > 1e-4;
      if (dist > 1e-4) {
        p.face = Math.atan2(uy || my, ux || mx);
        p.walk += dist;
      }
      return dist;
    }

    /* ---------- görüş ---------- */

    /** (px,py) noktasından R yarıçapında görüş hattı olan hücreler için cb(i) çağırır. */
    los(px, py, R, cb) {
      const w = this.w;
      const h = this.h;
      const tiles = this.tiles;
      const x0 = Math.max(0, Math.floor(px - R));
      const x1 = Math.min(w - 1, Math.floor(px + R));
      const y0 = Math.max(0, Math.floor(py - R));
      const y1 = Math.min(h - 1, Math.floor(py + R));
      const pcx = Math.floor(px);
      const pcy = Math.floor(py);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const dx = tx + 0.5 - px;
          const dy = ty + 0.5 - py;
          const dist = Math.hypot(dx, dy);
          if (dist > R) continue;
          if (Math.abs(tx - pcx) <= 1 && Math.abs(ty - pcy) <= 1) {
            cb(ty * w + tx);
            continue;
          }
          const steps = Math.ceil(dist / 0.2);
          const sx = dx / steps;
          const sy = dy / steps;
          let x = px;
          let y = py;
          let seen = true;
          for (let s = 1; s <= steps; s++) {
            x += sx;
            y += sy;
            const ix = Math.floor(x);
            const iy = Math.floor(y);
            if (ix === tx && iy === ty) break;
            if (tiles[iy * w + ix] === 1) {
              seen = false;
              break;
            }
          }
          if (seen) cb(ty * w + tx);
        }
      }
    }

    /** Görülen zeminlere komşu duvarları da ekler: koridor kenarları eksiksiz çizilsin. */
    addWallFaces(list, mask) {
      const w = this.w;
      const h = this.h;
      const n = list.length;
      for (let k = 0; k < n; k++) {
        const i = list[k];
        if (this.tiles[i] !== 0) continue;
        const x = i % w;
        const y = (i / w) | 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = x + ox;
            const ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const j = ny * w + nx;
            if (!mask[j] && this.tiles[j] === 1) {
              mask[j] = 1;
              list.push(j);
            }
          }
        }
      }
    }

    updateVisibility(dt) {
      const vis = this.vis;
      for (let k = 0; k < this.visList.length; k++) vis[this.visList[k]] = 0;
      const list = (this.visList = []);
      this.los(this.player.x, this.player.y, VIS_R, (i) => {
        if (!vis[i]) {
          vis[i] = 1;
          list.push(i);
        }
      });
      this.addWallFaces(list, vis);
      for (let k = 0; k < list.length; k++) {
        const i = list[k];
        this.known[i] = 1;
        this.age[i] = 0;
        this.ptype[i] = 0; // gerçeği görünce sahte iz silinir
        this.appear[i] = Math.min(1, this.appear[i] + (dt > 0 ? dt * 6 : 1));
      }
    }

    /* ---------- ayna duvarlar ---------- */

    updatePhantoms() {
      if (!this.mirrors.length) return;
      const w = this.w;
      const h = this.h;
      const vis = this.vis;
      const list = this.visList;
      let created = 0;
      for (let mi = 0; mi < this.mirrors.length; mi++) {
        const m = this.mirrors[mi];
        if (!vis[m]) continue;
        if (!this.mirrorSeen) {
          this.mirrorSeen = true;
          this.emit('mirror');
        }
        const mx = m % w;
        const my = (m / w) | 0;
        for (let d = 0; d < 4; d++) {
          const ddx = DIRS[d][0];
          const ddy = DIRS[d][1];
          const qx = mx - ddx;
          const qy = my - ddy;
          if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
          const qi = qy * w + qx;
          if (!vis[qi] || this.tiles[qi] !== 0) continue; // oyuncu tarafı görünen bir zemin olmalı
          for (let k = 0; k < list.length; k++) {
            const v = list[k];
            const vx = v % w;
            const vy = (v / w) | 0;
            const side = (mx - vx) * ddx + (my - vy) * ddy;
            if (side < 1) continue;
            if (Math.abs(vx - mx) + Math.abs(vy - my) > 5) continue;
            const rx = vx + 2 * side * ddx;
            const ry = vy + 2 * side * ddy;
            if (rx < 1 || ry < 1 || rx > w - 2 || ry > h - 2) continue;
            const ri = ry * w + rx;
            if (vis[ri] || this.lock[ri]) continue;
            const type = this.tiles[v] === 0 ? 1 : 2;
            if (this.ptype[ri] !== type) created++;
            this.ptype[ri] = type;
            this.page[ri] = 0;
            this.pap[ri] = Math.min(1, this.pap[ri] + 0.12);
          }
        }
      }
      if (created > 6 && this.t - (this._phT || -9) > 2.5) {
        this._phT = this.t;
        this.emit('phantom');
      }
    }

    /* ---------- hafıza silinmesi ---------- */

    strength(age) {
      if (age <= HOLD) return 1;
      const u = (age - HOLD) / (this.mem - HOLD);
      if (u >= 1) return 0;
      return 1 - Util.smoothstep(u);
    }

    updateMemory(dt) {
      const N = this.N;
      const vis = this.vis;
      for (let i = 0; i < N; i++) {
        if (this.known[i] && !vis[i]) {
          if (this.lock[i]) {
            this.age[i] = 0;
            this.appear[i] = Math.min(1, this.appear[i] + dt * 6);
          } else {
            this.age[i] += dt * (this.wind[i] ? 2 : 1);
            if (this.age[i] >= this.mem) {
              this.known[i] = 0;
              this.appear[i] = 0;
            }
          }
        }
        if (this.ptype[i]) {
          if (this.lock[i]) {
            this.ptype[i] = 0;
            continue;
          }
          this.page[i] += dt * (this.wind[i] ? 2 : 1);
          this.pap[i] = Math.min(1, this.pap[i] + dt * 5);
          if (this.page[i] >= this.mem) {
            this.ptype[i] = 0;
            this.pap[i] = 0;
          }
        } else if (this.pap[i]) {
          this.pap[i] = 0;
        }
      }
    }

    buildDisplay() {
      const N = this.N;
      let minS = 1;
      for (let i = 0; i < N; i++) {
        const locked = this.lock[i] > 0;
        let real = 0;
        if (this.known[i]) real = locked ? 1 : this.strength(this.age[i]);
        const app = Math.max(0, Math.min(1, this.appear[i]));
        let ph = 0;
        if (this.ptype[i] && !locked) ph = this.strength(this.page[i]);
        if (real > 0 && real >= ph) {
          this.dtype[i] = this.tiles[i] === 0 ? 1 : this.mirrorMap[i] ? 3 : 2;
          this.dalpha[i] = real * app;
          this.dink[i] = locked ? 1 : 0;
          if (!locked && !this.vis[i] && real < minS) minS = real;
        } else if (ph > 0) {
          this.dtype[i] = this.ptype[i];
          this.dalpha[i] = ph * Math.min(1, this.pap[i]);
          this.dink[i] = 0;
        } else {
          this.dtype[i] = 0;
          this.dalpha[i] = 0;
          this.dink[i] = 0;
        }
      }
      if (!this.fadeSeen && minS < 0.8) {
        this.fadeSeen = true;
        this.emit('fade');
      }
    }

    /* ---------- taşlar ---------- */

    stoneAt(cx, cy) {
      for (let i = 0; i < this.stones.length; i++) {
        if (this.stones[i].cx === cx && this.stones[i].cy === cy) return this.stones[i];
      }
      return null;
    }

    get onStone() {
      return !!this.stoneAt(Math.floor(this.player.x), Math.floor(this.player.y));
    }

    get hasSoundType() {
      return this.total.sound > 0;
    }

    switchType() {
      if (this.state !== 'play' || !this.hasSoundType) return;
      this.cur = this.cur === 'memory' ? 'sound' : 'memory';
      this.emit('switch', this.cur);
    }

    /** Boşluk: altında taş varsa geri al, yoksa seçili türden bir taş bırak. */
    toggleStone() {
      if (this.state !== 'play') return;
      const cx = Math.floor(this.player.x);
      const cy = Math.floor(this.player.y);
      const here = this.stoneAt(cx, cy);
      if (here) {
        this.unlockArea(here);
        this.stones.splice(this.stones.indexOf(here), 1);
        this.inv[here.type]++;
        this.emit('pickup', here);
        return;
      }
      if (this.inv[this.cur] <= 0) {
        this.emit('nostone', this.cur);
        return;
      }
      const s = { cx, cy, type: this.cur, cells: [], dir: null, born: this.t };
      this.inv[this.cur]--;
      this.placedCount++;
      this.stones.push(s);
      this.lockArea(s);
      this.refreshArrows();
      this.ring(cx + 0.5, cy + 0.5, s.type);
      this.emit('drop', s);
      if (s.type === 'sound') this.emit('whisper', s);
    }

    lockArea(s) {
      const cells = [];
      const mask = new Set();
      const sx = s.cx + 0.5;
      const sy = s.cy + 0.5;
      const add = (i) => {
        if (mask.has(i)) return;
        mask.add(i);
        cells.push(i);
      };
      this.los(sx, sy, STONE_R, add);
      // görülen zeminlerin komşu duvarları
      const tmp = cells.slice();
      for (let k = 0; k < tmp.length; k++) {
        const i = tmp[k];
        if (this.tiles[i] !== 0) continue;
        const x = i % this.w;
        const y = (i / this.w) | 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = x + ox;
            const ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
            const j = ny * this.w + nx;
            if (this.tiles[j] === 1) add(j);
          }
        }
      }
      s.cells = cells;
      for (let k = 0; k < cells.length; k++) {
        const i = cells[k];
        const fresh = !this.known[i];
        this.lock[i]++;
        this.known[i] = 1;
        this.age[i] = 0;
        this.ptype[i] = 0;
        if (fresh) {
          // mürekkep taşın çevresinden dışa doğru yayılır
          const d = Math.hypot((i % this.w) + 0.5 - sx, ((i / this.w) | 0) + 0.5 - sy);
          this.appear[i] = -d * 0.12;
        }
      }
    }

    unlockArea(s) {
      for (let k = 0; k < s.cells.length; k++) {
        const i = s.cells[k];
        if (this.lock[i] > 0) this.lock[i]--;
        if (!this.lock[i]) this.age[i] = 0; // geri alınan alan yeniden silinmeye başlar
      }
      s.cells = [];
    }

    /** Ses taşlarının oku: mevcut hedefe (anahtar, sonra kapı) en kısa yolun ilk adımı. */
    refreshArrows() {
      const dist = this.hasKey ? this.distDoor : this.distKey;
      const w = this.w;
      for (let k = 0; k < this.stones.length; k++) {
        const s = this.stones[k];
        if (s.type !== 'sound') continue;
        const here = dist[s.cy * w + s.cx];
        s.dir = null;
        s.atGoal = here === 0;
        if (here <= 0) continue;
        let best = -1;
        for (let d = 0; d < 4; d++) {
          const nx = s.cx + DIRS[d][0];
          const ny = s.cy + DIRS[d][1];
          if (nx < 0 || ny < 0 || nx >= w || ny >= this.h) continue;
          const v = dist[ny * w + nx];
          if (v >= 0 && v < here) {
            best = d;
            break;
          }
        }
        if (best >= 0) s.dir = { dx: DIRS[best][0], dy: DIRS[best][1] };
      }
    }

    /* ---------- parçacıklar ---------- */

    ring(x, y, kind) {
      this.particles.push({ kind: 'ring', x, y, life: 0, max: 0.9, color: kind });
    }

    spark(x, y, n, color) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 0.8 + Math.random() * 1.8;
        this.particles.push({
          kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4,
          life: 0, max: 0.6 + Math.random() * 0.6, size: 0.04 + Math.random() * 0.05, color,
        });
      }
    }

    confetti(x, y, n) {
      const colors = ['#b4492f', '#c58b1a', '#2f7f86', '#1e2b4d', '#c25b7a'];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 1.5 + Math.random() * 3.2;
        this.particles.push({
          kind: 'paper', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2,
          life: 0, max: 1.4 + Math.random() * 1.2, size: 0.07 + Math.random() * 0.06,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, color: colors[i % colors.length],
        });
      }
    }

    updateParticles(dt) {
      const ps = this.particles;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        if (p.life >= p.max) {
          ps.splice(i, 1);
          continue;
        }
        if (p.kind === 'ring') continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'paper') {
          p.vy += 5 * dt;
          p.vx *= 1 - 0.8 * dt;
          p.rot += p.vr * dt;
        } else if (p.kind === 'crumb') {
          p.vy += 0.4 * dt;
        } else {
          p.vy += 1.2 * dt;
        }
      }
      // silgi tozları: solan hücrelerden dökülür
      if (this.particles.length < 90 && !this.demoQuiet) {
        for (let k = 0; k < 2; k++) {
          const tx = Math.floor(this.player.x + (Math.random() - 0.5) * 16);
          const ty = Math.floor(this.player.y + (Math.random() - 0.5) * 12);
          if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
          const i = ty * this.w + tx;
          const a = this.dalpha[i];
          if (this.dtype[i] && !this.vis[i] && !this.lock[i] && a > 0.05 && a < 0.7 && Math.random() < 0.3) {
            this.particles.push({
              kind: 'crumb', x: tx + Math.random(), y: ty + Math.random(), vx: 0.25 + Math.random() * 0.4, vy: 0.1,
              life: 0, max: 1.2 + Math.random(), size: 0.018 + Math.random() * 0.02, color: this.dink[i] ? '#1e2b4d' : '#4a4743',
            });
          }
        }
      }
    }

    /* ---------- ana adım ---------- */

    update(dt, vec) {
      dt = Math.min(dt, 0.05);
      this.t += dt;
      if (this.lockedMsgT > 0) this.lockedMsgT -= dt;
      const p = this.player;

      if (this.state === 'play') {
        const dist = this.move(dt, vec.x, vec.y);
        if (dist > 0 && !this.started) {
          this.started = true;
          this.emit('start');
        }
        if (this.started) this.time += dt;
        if (dist > 0) {
          this.steps += dist;
          this.stepAcc += dist;
          if (this.stepAcc >= 0.62) {
            this.stepAcc = 0;
            this.emit('step');
          }
          const last = this.trail[this.trail.length - 1];
          if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 0.3) {
            this.trail.push({ x: p.x, y: p.y, age: 0 });
            if (this.trail.length > 520) this.trail.shift();
          }
        }
        this.collect();
        const wi = this.wind[this.idx(Math.floor(p.x), Math.floor(p.y))] === 1;
        if (wi !== this.inWind) {
          this.inWind = wi;
          this.emit('wind', wi);
        }
      } else if (this.state === 'exiting') {
        this.exitT += dt;
        const dx = this.maze.door.x + 0.5 - p.x;
        const dy = this.maze.door.y + 0.5 - p.y;
        p.x += dx * Math.min(1, dt * 5);
        p.y += dy * Math.min(1, dt * 5);
        p.moving = false;
        if (this.exitT > 1.1) {
          this.state = 'won';
          this.emit('win');
        }
      }

      this.updateVisibility(dt);
      this.updatePhantoms();
      this.updateMemory(dt);
      this.buildDisplay();

      // iz silinmesi
      for (let i = this.trail.length - 1; i >= 0; i--) {
        const tp = this.trail[i];
        const wind = this.wind[this.idx(Math.floor(tp.x), Math.floor(tp.y))] ? 2 : 1;
        tp.age += dt * wind;
        if (tp.age >= this.mem) {
          this.trail.splice(0, i + 1);
          break;
        }
      }
      this.updateParticles(dt);
    }

    collect() {
      const p = this.player;
      const k = this.maze.key;
      if (!this.hasKey && Math.hypot(p.x - (k.x + 0.5), p.y - (k.y + 0.5)) < 0.6) {
        this.hasKey = true;
        this.refreshArrows();
        this.spark(k.x + 0.5, k.y + 0.5, 16, '#c58b1a');
        this.emit('key');
      }
      for (let i = 0; i < this.flowers.length; i++) {
        const f = this.flowers[i];
        if (f.taken) continue;
        if (Math.hypot(p.x - (f.x + 0.5), p.y - (f.y + 0.5)) < 0.6) {
          f.taken = true;
          this.flowersTaken++;
          this.inv.memory++;
          this.total.memory++;
          this.spark(f.x + 0.5, f.y + 0.5, 14, '#c25b7a');
          this.emit('flower');
        }
      }
      if (this.hasKey) {
        const d = this.maze.door;
        if (Math.hypot(p.x - (d.x + 0.5), p.y - (d.y + 0.5)) < 0.55 && this.state === 'play') {
          this.state = 'exiting';
          this.exitT = 0;
          this.confetti(d.x + 0.5, d.y + 0.5, 60);
          this.emit('door');
        }
      }
    }
  }

  /* ---------- puanlama ---------- */

  /**
   * Hiçbir şeyi unutmayan bir gezginin (en yakın keşfedilmemiş noktaya giden açgözlü bot)
   * anahtarı bulup kapıya ulaşması için yürüdüğü kare sayısı. Süre ölçütümüz bu.
   */
  function exploreCost(maze) {
    const w = maze.w;
    const h = maze.h;
    const tiles = maze.tiles;
    const ctx = { w, h, tiles };
    const seen = new Uint8Array(w * h);
    const at = (p) => p.y * w + p.x;
    const keyI = at(maze.key);
    const doorI = at(maze.door);
    let pos = at(maze.start);
    let cost = 0;

    const see = (i) => World.prototype.los.call(ctx, (i % w) + 0.5, ((i / w) | 0) + 0.5, VIS_R, (j) => { seen[j] = 1; });
    const walk = (to, stopWhen) => {
      const p = Maze.path(tiles, w, h, pos, to);
      for (let k = 1; k < p.length; k++) {
        pos = p[k];
        cost++;
        see(pos);
        if (stopWhen && stopWhen()) return;
      }
    };
    const explore = (goalSeen) => {
      see(pos);
      let guard = 0;
      while (!goalSeen() && guard++ < 5000) {
        const dist = Maze.bfs(tiles, w, h, pos % w, (pos / w) | 0);
        let best = -1;
        for (let i = 0; i < w * h; i++) {
          if (tiles[i] !== 0 || !seen[i] || dist[i] <= 0) continue;
          let frontier = false;
          const x = i % w;
          const y = (i / w) | 0;
          for (let d = 0; d < 4 && !frontier; d++) {
            const nx = x + DIRS[d][0];
            const ny = y + DIRS[d][1];
            if (tiles[ny * w + nx] === 0 && !seen[ny * w + nx]) frontier = true;
          }
          if (frontier && (best < 0 || dist[i] < dist[best])) best = i;
        }
        if (best < 0) break;
        walk(best, goalSeen);
      }
    };

    explore(() => seen[keyI] === 1);
    walk(keyI);
    explore(() => seen[doorI] === 1);
    walk(doorI);
    return cost;
  }

  /** Mükemmel hafızalı bir oyuncunun süresi (sn). */
  function parTime(maze) {
    if (maze._par == null) maze._par = exploreCost(maze) / SPEED;
    return maze._par;
  }

  /** 3 yıldız: ideal gezginin 1.8 katı içinde; 2 yıldız: 3.2 katı içinde. */
  function stars(maze, time) {
    const par = parTime(maze);
    if (time <= par * 1.8) return 3;
    if (time <= par * 3.2) return 2;
    return 1;
  }

  return { World, VIS_R, STONE_R, SPEED, PR, HOLD, parTime, stars };
});
