/* Silik — uygulama denetleyicisi: ekranlar, arayüz, olaylar, döngü. */
(function (root) {
  'use strict';
  var S = root.Silik;
  var Util = S.Util;
  var Maze = S.Maze;
  var Levels = S.Levels;
  var Save = S.Save;
  var Audio = S.Audio;
  var Input = S.Input;
  var Game = S.Game;

  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };
  var $$ = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };

  var SCREENS = ['title', 'levels', 'howto', 'settings', 'intro', 'pause', 'win'];

  var App = {
    mode: 'menu', // menu | intro | play | pause | win
    screen: 'title',
    stack: [],
    world: null,
    def: null,
    renderer: null,
  };
  S.App = App;

  var hud = {};
  var toastTimer = null;
  var hintTimer = null;
  var hudSig = '';
  var lastTimeText = '';
  var wake = null;
  var installEvent = null;

  /* ---------- yardımcılar ---------- */

  function isTouch() {
    return Input.usedTouch || (root.matchMedia && root.matchMedia('(pointer: coarse)').matches);
  }

  function vib(p) {
    if (Save.data.settings.vib && navigator.vibrate) {
      try {
        navigator.vibrate(p);
      } catch (e) {
        /* desteklenmiyor */
      }
    }
  }

  function toast(text, kind, ms) {
    var t = hud.toast;
    t.textContent = text;
    t.className = 'show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.className = '';
    }, ms || 2300);
  }

  function hint(text, ms) {
    var h = hud.hint;
    h.textContent = text;
    h.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      h.classList.remove('show');
    }, ms || 5000);
  }
  function clearHint() {
    clearTimeout(hintTimer);
    hud.hint.classList.remove('show');
  }

  function lockScreen() {
    try {
      if ('wakeLock' in navigator && !wake) {
        navigator.wakeLock.request('screen').then(function (l) {
          wake = l;
          l.addEventListener('release', function () {
            wake = null;
          });
        }, function () {});
      }
    } catch (e) {
      /* yok say */
    }
  }
  function unlockScreen() {
    try {
      if (wake) wake.release();
    } catch (e) {
      /* yok say */
    }
    wake = null;
  }

  /* ---------- ekran yönetimi ---------- */

  function setScreen(name) {
    App.screen = name;
    SCREENS.forEach(function (n) {
      $('#s-' + n).classList.toggle('show', n === name);
    });
    var inLevel = App.mode === 'intro' || App.mode === 'play' || App.mode === 'pause' || App.mode === 'win';
    hud.root.hidden = !inLevel;
    if (name === 'levels') buildLevels();
    if (name === 'settings') syncSettings();
    if (name === 'title') syncTitle();
    var primary = name && $('#s-' + name + ' .btn.primary');
    if (primary && root.matchMedia && root.matchMedia('(hover: hover)').matches) primary.focus({ preventScroll: true });
  }

  function go(name) {
    App.stack.push(App.screen);
    setScreen(name);
  }

  function back() {
    var prev = App.stack.pop() || 'title';
    setScreen(prev);
  }

  /* ---------- demo (ana menü arkasında kendi kendine gezen karakter) ---------- */

  var ai = { path: [], nextDrop: 6, born: 0 };

  function startDemo() {
    var seed = ((Date.now() / 1000) | 0) % 100000;
    var def = {
      id: 'demo', name: 'Demo', w: 25, h: 25, seed: seed, stones: 3, sound: 0, flowers: 0,
      wind: 2, mirrors: 3, mem: 15, braid: 0.1, straight: 0.5, branch: 0.3,
    };
    var w = new Game.World(def, { demo: true });
    w.maze.key = { x: -9, y: -9 }; // demoda anahtar alınmasın
    w.onEvent = null;
    App.world = w;
    App.def = null;
    ai.path = [];
    ai.nextDrop = 7;
    ai.born = 0;
    App.renderer.snap(w);
    Audio.setWind(0);
  }

  function demoVec(w) {
    var p = w.player;
    if (w.t - ai.born > 110) {
      startDemo();
      return { x: 0, y: 0 };
    }
    if (!ai.path.length) {
      var from = w.idx(Math.floor(p.x), Math.floor(p.y));
      var dist = Maze.bfs(w.tiles, w.w, w.h, from % w.w, (from / w.w) | 0);
      var cands = [];
      for (var i = 0; i < w.N; i++) {
        if (dist[i] >= 6 && dist[i] <= 22 && i !== w.doorIdx && w.tiles[i] === 0) cands.push(i);
      }
      if (!cands.length) return { x: 0, y: 0 };
      var to = cands[Math.floor(Math.random() * cands.length)];
      ai.path = Maze.path(w.tiles, w.w, w.h, from, to) || [];
      ai.path.shift();
    }
    if (w.t > ai.nextDrop && w.inv.memory > 0 && !w.onStone && w.stones.length < 2) {
      w.toggleStone();
      ai.nextDrop = w.t + 14;
    }
    if (!ai.path.length) return { x: 0, y: 0 };
    var tx = (ai.path[0] % w.w) + 0.5;
    var ty = ((ai.path[0] / w.w) | 0) + 0.5;
    var dx = tx - p.x;
    var dy = ty - p.y;
    var m = Math.hypot(dx, dy);
    if (m < 0.14) {
      ai.path.shift();
      return { x: 0, y: 0 };
    }
    return { x: (dx / m) * 0.8, y: (dy / m) * 0.8 };
  }

  /* ---------- bölüm akışı ---------- */

  function startLevel(def, skipIntro) {
    App.def = def;
    App.stack = [];
    var w = new Game.World(def);
    w.onEvent = onEvent;
    App.world = w;
    App.renderer.snap(w);
    hudSig = '';
    lastTimeText = '';
    Audio.setWind(0);
    Audio.startMusic();
    clearHint();
    hud.toast.className = '';
    hud.btnStone.classList.remove('pulse');

    hud.num.textContent = def.daily ? '★' : def.id;
    hud.name.textContent = def.name;
    hud.chipFlower.hidden = !(w.flowers.length > 0);
    hud.chipWind.hidden = true;
    hud.chipKey.classList.remove('has');
    hud.time.textContent = '00:00';

    if (skipIntro) {
      begin();
      return;
    }
    App.mode = 'intro';
    fillIntro(def);
    updateHud(w, true);
    setScreen('intro');
  }

  function fillIntro(def) {
    $('#intro-kicker').textContent = def.daily ? 'Günlük · ' + def.dateKey : 'Bölüm ' + def.id;
    $('#intro-name').textContent = def.name;
    $('#intro-sub').textContent = def.daily ? 'Bugünün labirenti herkes için aynı.' : def.sub;
    var nb = $('#intro-new');
    if (def.intro) {
      nb.hidden = false;
      nb.querySelector('use').setAttribute('href', '#i-' + def.intro.icon);
      $('#intro-new-title').textContent = def.intro.title;
      $('#intro-new-text').textContent = def.intro.text;
    } else {
      nb.hidden = true;
    }
    var rows = [];
    if (def.id === 1) {
      if (isTouch()) {
        rows.push(['Sürükle', 'Ekranda herhangi bir yere basıp sürükle: karakter o yöne yürür.']);
        rows.push(['Taş düğmesi', 'Sağ altta. Taş bırakır; taşın üstündeyken basarsan geri alır.']);
      } else {
        rows.push(['WASD / Oklar', 'Yürü.']);
        rows.push(['Boşluk', 'Hatıra taşı bırak; taşın üstündeyken basarsan geri alırsın.']);
      }
    } else {
      rows.push(['Hedef', 'Anahtarı bul, sonra kapıya ulaş.']);
      var stones = def.stones + ' hatıra taşı' + (def.sound ? ' + ' + def.sound + ' ses taşı' : '');
      rows.push(['Taşların', stones + '.']);
      if (def.mem < 15) rows.push(['Hafıza', 'Harita ' + def.mem + ' saniyede siliniyor.']);
    }
    $('#intro-how').innerHTML = rows
      .map(function (r) {
        return '<div class="hm"><b>' + r[0] + '</b><span>' + r[1] + '</span></div>';
      })
      .join('');
  }

  function begin() {
    App.mode = 'play';
    setScreen(null);
    Input.setEnabled(true);
    lockScreen();
    var w = App.world;
    if (App.def && App.def.id === 1 && !Save.data.seen.move) {
      hint(isTouch() ? 'Yürümek için ekranda parmağını sürükle.' : 'WASD veya yön tuşlarıyla yürü.', 7000);
    }
    updateHud(w, true);
  }

  function pause() {
    if (App.mode !== 'play') return;
    App.mode = 'pause';
    Input.setEnabled(false);
    clearHint();
    hud.btnStone.classList.remove('pulse');
    Audio.setWind(0);
    unlockScreen();
    setScreen('pause');
  }

  function resume() {
    if (App.mode !== 'pause') return;
    App.stack = [];
    App.mode = 'play';
    setScreen(null);
    Input.setEnabled(true);
    lockScreen();
    if (App.world.inWind) Audio.setWind(1);
  }

  function exitToMenu() {
    App.mode = 'menu';
    Input.setEnabled(false);
    App.stack = [];
    unlockScreen();
    startDemo();
    setScreen('title');
  }

  function openLevels() {
    // bölüm seçimi: bitmiş/duraklatılmış seviyeyi bırak, arka planda demo
    if (App.mode !== 'menu') {
      App.mode = 'menu';
      Input.setEnabled(false);
      unlockScreen();
      startDemo();
    }
    App.stack = ['title'];
    setScreen('levels');
  }

  function nextDef() {
    if (!App.def || App.def.daily) return null;
    return Levels.byId(App.def.id + 1);
  }

  function playFromTitle() {
    var id = Math.min(Save.data.unlocked, Levels.LIST.length);
    startLevel(Levels.byId(id));
  }

  /* ---------- olaylar ---------- */

  function onEvent(name, data) {
    switch (name) {
      case 'start':
        if (!Save.data.seen.move) Save.markSeen('move');
        clearHint();
        break;
      case 'step':
        Audio.sfx('step');
        break;
      case 'fade':
        // ipucu yalnızca henüz taş bırakmamış oyuncuya gösterilir
        if (App.world.placedCount === 0 && Save.markSeen('fade')) {
          hint('Harita silinmeye başladı! Taş düğmesine basıp bir hatıra taşı bırak.', 7000);
          hud.btnStone.classList.add('pulse');
        }
        break;
      case 'drop':
        Audio.sfx('drop');
        vib(18);
        hud.btnStone.classList.remove('pulse');
        if (Save.markSeen('drop')) hint('Taşın çevresi mürekkeple çizildi, artık silinmez. Aynı taşın üstündeyken tekrar basarsan geri alırsın.', 7500);
        break;
      case 'pickup':
        Audio.sfx('pick');
        vib(10);
        break;
      case 'nostone':
        Audio.sfx('locked');
        toast(data === 'sound' ? 'Ses taşın kalmadı.' : 'Taşın kalmadı. Bıraktığın bir taşı geri alabilirsin.', 'warn');
        break;
      case 'switch':
        Audio.sfx('click');
        toast(data === 'sound' ? 'Ses taşı seçildi' : 'Hatıra taşı seçildi', data === 'sound' ? 'teal' : '', 1400);
        break;
      case 'whisper':
        Audio.sfx('whisper');
        vib([10, 30, 10]);
        toast('Ses taşı fısıldıyor… oku izle.', 'teal');
        break;
      case 'key':
        Audio.sfx('key');
        vib([20, 30, 20]);
        toast('Anahtar sende! Şimdi kapıyı bul.', 'good');
        break;
      case 'flower':
        Audio.sfx('flower');
        vib(15);
        toast('+1 hatıra taşı', 'good', 1600);
        break;
      case 'locked':
        Audio.sfx('locked');
        vib([30, 40, 30]);
        toast('Kapı kilitli. Önce anahtarı bul.', 'warn');
        break;
      case 'door':
        Audio.sfx('door');
        Audio.setWind(0);
        vib(30);
        break;
      case 'wind':
        Audio.setWind(data ? 1 : 0);
        break;
      case 'mirror':
        if (Save.markSeen('mirror')) toast('Ayna duvar! Haritana sahte izler bırakabilir.', 'teal', 3200);
        break;
      case 'phantom':
        Audio.sfx('mirror');
        break;
      case 'win':
        showWin();
        break;
      default:
    }
  }

  function showWin() {
    var w = App.world;
    var def = App.def;
    Input.setEnabled(false);
    unlockScreen();
    clearHint();
    hud.btnStone.classList.remove('pulse');
    Audio.sfx('win');
    vib([40, 60, 40, 60, 140]);
    var time = w.time;
    var stars = Game.stars(w.maze, time);
    var res = Save.record(def, time, stars, Math.round(w.steps));
    App.mode = 'win';

    $('#win-kicker').textContent = def.daily ? 'Günlük labirent' : 'Bölüm ' + def.id + ' · ' + def.name;
    $('#win-title').textContent = stars === 3 ? 'Kusursuz hafıza!' : stars === 2 ? 'Çıkışı buldun!' : 'Çıktın!';
    $$('#win-stars svg').forEach(function (s, i) {
      s.classList.toggle('on', i < stars);
    });
    $('#win-record').hidden = !res.record;
    $('#win-time').textContent = Util.fmtTime(time);
    $('#win-steps').textContent = Math.round(w.steps);
    $('#win-stones').textContent = w.placedCount;
    $('#win-best').textContent = Util.fmtTime(res.best.time);

    var nx = nextDef();
    var finished = !def.daily && !nx;
    var ep = $('#win-epilogue');
    ep.hidden = !finished;
    if (finished) ep.textContent = 'Silik’ten çıktın. Hatırladıkların seni buraya getirdi; unuttukların ise zaten yolun bir parçasıydı.';
    $('#btn-next').textContent = nx ? 'Sonraki Bölüm' : 'Bölümler';
    $('#btn-share').hidden = !(navigator.share || (navigator.clipboard && navigator.clipboard.writeText));
    setScreen('win');
  }

  /* ---------- arayüz: HUD ---------- */

  function buildSlots(container, total, inv, cur) {
    var html = '';
    for (var i = 0; i < total; i++) {
      html += '<svg class="pebble' + (i >= inv ? ' used' : '') + '"><use href="#i-stone"/></svg>';
    }
    container.innerHTML = html;
    container.classList.toggle('active', cur);
  }

  function updateHud(w, force) {
    var t = Util.fmtTime(w.time);
    if (t !== lastTimeText) {
      lastTimeText = t;
      hud.time.textContent = t;
    }
    var onStone = w.onStone;
    var sig = [w.total.memory, w.inv.memory, w.total.sound, w.inv.sound, w.cur, w.hasKey ? 1 : 0, w.flowersTaken, onStone ? 1 : 0, w.inWind ? 1 : 0].join('|');
    if (sig === hudSig && !force) return;
    hudSig = sig;

    var hasSound = w.total.sound > 0;
    buildSlots(hud.slotsMemory, w.total.memory, w.inv.memory, hasSound && w.cur === 'memory');
    hud.slotsSound.hidden = !hasSound;
    if (hasSound) buildSlots(hud.slotsSound, w.total.sound, w.inv.sound, w.cur === 'sound');
    hud.chipKey.classList.toggle('has', w.hasKey);
    if (w.flowers.length) hud.flowerCount.textContent = w.flowersTaken + '/' + w.flowers.length;
    hud.chipWind.hidden = !w.inWind;

    var cur = w.cur;
    hud.btnSwitch.hidden = !hasSound;
    hud.btnSwitch.classList.toggle('sound', cur === 'sound');
    hud.btnSwitch.querySelector('.ic use').setAttribute('href', cur === 'sound' ? '#i-sound' : '#i-stone');
    hud.btnStone.classList.toggle('sound', cur === 'sound');
    hud.btnStone.classList.toggle('pickup', onStone);
    hud.btnStone.classList.toggle('empty', !onStone && w.inv[cur] <= 0);
    hud.btnStone.querySelector('.ic use').setAttribute('href', cur === 'sound' ? '#i-sound' : '#i-stone');
    hud.stoneLbl.textContent = onStone ? 'Geri Al' : 'Bırak';
    hud.stoneCount.textContent = onStone ? '↺' : w.inv[cur];
  }

  function bindPress(btn, fn) {
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('down');
      fn();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
      btn.addEventListener(n, function () {
        btn.classList.remove('down');
      });
    });
  }

  /* ---------- arayüz: menüler ---------- */

  function starsHtml(n) {
    var h = '';
    for (var i = 0; i < 3; i++) h += '<svg class="' + (i < n ? 'on' : '') + '"><use href="#i-star"/></svg>';
    return h;
  }

  function buildLevels() {
    var grid = $('#level-grid');
    grid.innerHTML = '';
    var unlocked = Save.data.unlocked;
    var total = 0;

    var dKey = Util.todayKey();
    var dRec = Save.data.daily[dKey];
    var d = document.createElement('button');
    d.className = 'lvl daily';
    d.innerHTML =
      '<span class="num">Günlük Labirent</span><span class="nm">' + dKey + '</span><span class="st">' + starsHtml(dRec ? dRec.stars : 0) + '</span>';
    d.addEventListener('click', function () {
      startLevel(Levels.daily(dKey));
    });
    grid.appendChild(d);

    Levels.LIST.forEach(function (def) {
      var rec = Save.data.best[def.id];
      var locked = def.id > unlocked;
      if (rec) total += rec.stars;
      var b = document.createElement('button');
      b.className = 'lvl' + (locked ? ' locked' : '');
      b.setAttribute('aria-label', 'Bölüm ' + def.id + ' ' + def.name + (locked ? ' (kilitli)' : ''));
      b.innerHTML =
        '<span class="num">' + def.id + '</span><span class="nm">' + def.name + '</span>' +
        '<span class="st">' + starsHtml(rec ? rec.stars : 0) + '</span>' +
        (locked ? '<svg class="lock"><use href="#i-lock"/></svg>' : '');
      if (!locked) {
        b.addEventListener('click', function () {
          startLevel(def);
        });
      }
      grid.appendChild(b);
    });
    $('#levels-note').textContent = total + ' / ' + Levels.LIST.length * 3 + ' ★';
  }

  function syncTitle() {
    var u = Save.data.unlocked;
    $('#btn-play').textContent = u > 1 ? 'Devam Et · Bölüm ' + Math.min(u, Levels.LIST.length) : 'Oyna';
  }

  function syncSettings() {
    var s = Save.data.settings;
    $('#set-sfx').checked = s.sfx;
    $('#set-music').checked = s.music;
    $('#set-vib').checked = s.vib;
    $('#row-vib').hidden = !navigator.vibrate;
    $('#set-fs').hidden = !(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    $('#set-install').hidden = !installEvent;
    var r = $('#set-reset');
    r.querySelector('span').textContent = 'İlerlemeyi sıfırla';
    r.dataset.armed = '';
  }

  function applySettings() {
    var s = Save.data.settings;
    Audio.setSfx(s.sfx);
    Audio.setMusic(s.music);
  }

  /* ---------- bağlama ---------- */

  function init() {
    var canvas = $('#game');
    App.renderer = new S.Renderer(canvas);

    hud = {
      root: $('#hud'), toast: $('#toast'), hint: $('#hint'), time: $('#hud-time'), num: $('#hud-num'), name: $('#hud-name'),
      slotsMemory: $('#slots-memory'), slotsSound: $('#slots-sound'), chipKey: $('#chip-key'), chipFlower: $('#chip-flower'),
      chipWind: $('#chip-wind'), flowerCount: $('#flower-count'), btnStone: $('#btn-stone'), btnSwitch: $('#btn-switch'),
      stoneLbl: $('#stone-lbl'), stoneCount: $('#stone-count'),
    };

    Input.init({ surface: canvas, stick: $('#stick'), knob: $('#stick .knob') });
    Input.onAction = function (a) {
      var w = App.world;
      if (a === 'stone') {
        if (App.mode === 'play') w.toggleStone();
      } else if (a === 'switch') {
        if (App.mode === 'play') w.switchType();
      } else if (a === 'pause') {
        if (App.mode === 'play') pause();
        else if (App.mode === 'pause') resume();
        else if (App.screen === 'levels' || App.screen === 'howto' || App.screen === 'settings') back();
      } else if (a === 'mute') {
        var s = Save.data.settings;
        var on = !(s.sfx || s.music);
        s.sfx = s.music = on;
        Save.save();
        applySettings();
        toast(on ? 'Ses açık' : 'Ses kapalı', '', 1200);
      }
    };

    bindPress($('#btn-pause'), pause);
    bindPress(hud.btnStone, function () {
      if (App.mode === 'play') App.world.toggleStone();
    });
    bindPress(hud.btnSwitch, function () {
      if (App.mode === 'play') App.world.switchType();
    });

    // menü düğmeleri
    $$('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-go');
        if (t === 'levels') openLevels();
        else go(t);
      });
    });
    $$('[data-back]').forEach(function (b) {
      b.addEventListener('click', back);
    });
    $('#btn-play').addEventListener('click', function () {
      Audio.startMusic();
      playFromTitle();
    });
    $('#btn-daily').addEventListener('click', function () {
      Audio.startMusic();
      startLevel(Levels.daily(Util.todayKey()));
    });
    $('#btn-start').addEventListener('click', begin);
    $('#btn-resume').addEventListener('click', resume);
    $('#btn-restart').addEventListener('click', function () {
      startLevel(App.def, true);
    });
    $('#btn-pause-settings').addEventListener('click', function () {
      go('settings');
    });
    $('#btn-pause-levels').addEventListener('click', openLevels);
    $('#btn-pause-menu').addEventListener('click', exitToMenu);
    $('#btn-again').addEventListener('click', function () {
      startLevel(App.def, true);
    });
    $('#btn-win-levels').addEventListener('click', openLevels);
    $('#btn-next').addEventListener('click', function () {
      var nx = nextDef();
      if (nx) startLevel(nx);
      else openLevels();
    });
    $('#btn-share').addEventListener('click', function () {
      var d = App.def;
      var st = $$('#win-stars svg.on').length;
      var text = 'Silik · ' + (d.daily ? 'Günlük Labirent ' + d.dateKey : 'Bölüm ' + d.id + ' ' + d.name) + ' ' + $('#win-time').textContent + ' ' + '★'.repeat(st) + '☆'.repeat(3 - st);
      if (navigator.share) {
        navigator.share({ title: 'Silik', text: text, url: location.href }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text + ' ' + location.href).then(function () {
          toast('Panoya kopyalandı', 'good', 1500);
        });
      }
    });

    // ayarlar
    $('#set-sfx').addEventListener('change', function (e) {
      Save.data.settings.sfx = e.target.checked;
      Save.save();
      applySettings();
      Audio.unlock();
      Audio.sfx('click');
    });
    $('#set-music').addEventListener('change', function (e) {
      Save.data.settings.music = e.target.checked;
      Save.save();
      Audio.unlock();
      applySettings();
      Audio.startMusic();
    });
    $('#set-vib').addEventListener('change', function (e) {
      Save.data.settings.vib = e.target.checked;
      Save.save();
      vib(30);
    });
    $('#set-fs').addEventListener('click', function () {
      var d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen).call(d.documentElement);
    });
    $('#set-install').addEventListener('click', function () {
      if (!installEvent) return;
      installEvent.prompt();
      installEvent = null;
      $('#set-install').hidden = true;
    });
    $('#set-reset').addEventListener('click', function () {
      var b = $('#set-reset');
      if (b.dataset.armed === '1') {
        Save.reset();
        b.dataset.armed = '';
        b.querySelector('span').textContent = 'İlerlemeyi sıfırla';
        toast('İlerleme sıfırlandı', 'warn', 1600);
        syncTitle();
      } else {
        b.dataset.armed = '1';
        b.querySelector('span').textContent = 'Emin misin? Silmek için tekrar dokun';
        setTimeout(function () {
          if (b.dataset.armed === '1') {
            b.dataset.armed = '';
            b.querySelector('span').textContent = 'İlerlemeyi sıfırla';
          }
        }, 3500);
      }
    });

    // ses: ilk dokunuşta aç, tıklama sesi
    // iOS ses kilidi yalnızca touchend / click içinde açılır; hepsini dinle (ucuz)
    var unlockAudio = function () {
      Audio.unlock();
    };
    ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(function (n) {
      root.addEventListener(n, unlockAudio, { passive: true, capture: true });
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.btn, .lvl:not(.locked), .icon-btn, .row')) Audio.sfx('click');
    });

    // Enter: ekrandaki ana düğmeye bas
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || document.activeElement !== document.body) return;
      var b = App.screen && $('#s-' + App.screen + ' .btn.primary');
      if (b) {
        e.preventDefault();
        b.click();
      }
    });

    // pencere olayları
    var rt;
    var onResize = function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        App.renderer.resize();
      }, 100);
    };
    root.addEventListener('resize', onResize);
    root.addEventListener('orientationchange', onResize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (App.mode === 'play') pause();
        Audio.suspend();
      } else {
        Audio.resume();
      }
    });
    root.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      installEvent = e;
    });

    applySettings();
    startDemo();
    setScreen('title');

    var last = performance.now();
    function frame(now) {
      root.requestAnimationFrame(frame);
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      var w = App.world;
      if (!w) return;
      if (App.mode === 'play') {
        w.update(dt, Input.vector());
        updateHud(w, false);
      } else if (App.mode === 'menu') {
        w.update(dt, demoVec(w));
      } else if (App.mode === 'win') {
        w.update(dt, { x: 0, y: 0 });
      }
      App.renderer.frame(w, dt);
      App.renderer.adapt(dt);
    }
    root.requestAnimationFrame(frame);

    // tek dosyalık sürümde (silik.html) service worker kaydedilmez
    if (!root.SILIK_STANDALONE && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      root.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }

  // test ve hata ayıklama için
  App.debug = { startLevel: startLevel, pause: pause, resume: resume, begin: begin, toast: toast };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
