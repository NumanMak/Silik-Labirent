/* Silik — ses: tüm sesler WebAudio ile üretilir, harici dosya yoktur. */
(function (root) {
  'use strict';
  var S = (root.Silik = root.Silik || {});

  var ctx = null;
  var master, sfxBus, musicBus, windBus, reverb, noiseBuf;
  var sfxOn = true;
  var musicOn = true;
  var windGain = null;
  var musicTimer = null;
  var drone = null;
  var wantMusic = false;
  var windFilter = null;
  var ambTimer = null;
  var theme = 'forest';

  /* Sezon başına ses kimliği: orman = aydınlık gam, kuş cıvıltısı, hışırtı; mağara = alçak gam, damla yankısı, uğultu */
  var THEME = {
    forest: {
      notes: [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33],
      drone: [130.81, 196, 0], droneGain: 0.012, windF: 900, windQ: 0.55, windGain: 0.15,
      step: { f: 2600, spread: 1400, q: 1.3, dur: 0.045, gain: 0.032 },
      noteEvery: [2200, 3800], ambEvery: [6000, 13000], wet: 0.6,
    },
    cave: {
      notes: [110, 130.81, 146.83, 164.81, 196, 220, 261.63],
      drone: [55, 82.41, 110], droneGain: 0.022, windF: 280, windQ: 1.1, windGain: 0.2,
      step: { f: 650, spread: 350, q: 3.5, dur: 0.075, gain: 0.05 },
      noteEvery: [3200, 5200], ambEvery: [3500, 9000], wet: 1.2,
    },
  };

  function ensure() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? 1 : 0;
    musicBus.connect(master);

    // kısa, sönümlü gürültüden basit yankı
    var len = ctx.sampleRate * 2.2;
    var ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb = ctx.createConvolver();
    reverb.buffer = ir;
    var rg = ctx.createGain();
    rg.gain.value = 0.35;
    reverb.connect(rg);
    rg.connect(master);

    // beyaz gürültü (rüzgâr ve fısıltı için)
    var nl = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, nl, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var n = 0; n < nl; n++) nd[n] = Math.random() * 2 - 1;

    // sürekli rüzgâr katmanı (sessiz başlar)
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = THEME[theme].windF;
    bp.Q.value = THEME[theme].windQ;
    windFilter = bp;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    src.connect(bp);
    bp.connect(windGain);
    windGain.connect(sfxBus);
    src.start();
    return ctx;
  }

  function resumeCtx() {
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      var p = ctx.resume();
      if (p && p.then) p.then(function () { if (wantMusic) startMusic(); });
    } else if (wantMusic) {
      startMusic();
    }
  }

  function unlock() {
    if (ensure()) resumeCtx();
  }

  function tone(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.at || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    var a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.1, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    g.connect(o.dest || sfxBus);
    if (o.wet && reverb) {
      var w = ctx.createGain();
      w.gain.value = o.wet;
      g.connect(w);
      w.connect(reverb);
    }
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  function noise(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.at || 0);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1500, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    f.Q.value = o.q || 1;
    var g = ctx.createGain();
    var a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.1, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.dest || sfxBus);
    if (o.wet && reverb) {
      var w = ctx.createGain();
      w.gain.value = o.wet;
      g.connect(w);
      w.connect(reverb);
    }
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + o.dur + 0.05);
  }

  var SFX = {
    step: function () {
      var st = THEME[theme].step;
      noise({ f: st.f + Math.random() * st.spread, q: st.q, dur: st.dur, gain: st.gain, wet: theme === 'cave' ? 0.5 : 0 });
      if (theme === 'cave') tone({ f: 150 + Math.random() * 30, to: 90, dur: 0.06, gain: 0.04, wet: 0.7 });
    },
    // orman: kuş cıvıltısı (kısa, yükselip alçalan tiz notalar)
    chirp: function () {
      var base = 2300 + Math.random() * 1500;
      var n = 2 + Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) {
        tone({ f: base * (1 + Math.random() * 0.25), to: base * (1.25 + Math.random() * 0.3), dur: 0.07 + Math.random() * 0.04, gain: 0.022, at: i * 0.11, wet: 0.6 });
      }
    },
    // mağara: tavandan düşen damla ve yankısı
    drip: function () {
      var f = 900 + Math.random() * 700;
      tone({ f: f, to: f * 0.45, dur: 0.16, gain: 0.05, wet: 1.4 });
      tone({ f: f * 0.8, to: f * 0.38, dur: 0.2, gain: 0.02, at: 0.32, wet: 1.6 });
      tone({ f: f * 0.7, to: f * 0.33, dur: 0.22, gain: 0.01, at: 0.62, wet: 1.8 });
    },
    drop: function () {
      tone({ f: 190, to: 62, dur: 0.22, gain: 0.32, type: 'sine' });
      noise({ filter: 'lowpass', f: 700, dur: 0.07, gain: 0.16 });
      tone({ f: 523, dur: 0.5, gain: 0.05, wet: 0.6, at: 0.03 });
    },
    pick: function () {
      tone({ f: 300, to: 640, dur: 0.14, gain: 0.14, type: 'triangle' });
      noise({ f: 2600, dur: 0.05, gain: 0.04 });
    },
    key: function () {
      [880, 1318.5, 1760].forEach(function (f, i) {
        tone({ f: f, dur: 1.1 - i * 0.2, gain: 0.11 - i * 0.025, at: i * 0.05, wet: 0.7 });
      });
    },
    flower: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone({ f: f, dur: 0.5, gain: 0.09, at: i * 0.075, type: 'triangle', wet: 0.6 });
      });
    },
    locked: function () {
      tone({ f: 120, to: 85, dur: 0.16, gain: 0.16, type: 'square' });
      noise({ filter: 'lowpass', f: 400, dur: 0.08, gain: 0.12 });
    },
    door: function () {
      noise({ f: 300, to: 900, q: 3, dur: 0.7, gain: 0.12, attack: 0.1 });
      tone({ f: 90, to: 140, dur: 0.7, gain: 0.07, type: 'sawtooth', attack: 0.1 });
    },
    whisper: function () {
      noise({ f: 1100, to: 2800, q: 5, dur: 1.1, gain: 0.14, attack: 0.35, wet: 0.5 });
      tone({ f: 660, to: 880, dur: 0.9, gain: 0.035, attack: 0.3, wet: 0.8 });
    },
    mirror: function () {
      tone({ f: 2100, to: 3400, dur: 0.35, gain: 0.04, wet: 0.8 });
    },
    win: function () {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone({ f: f, dur: 1.4, gain: 0.1, at: i * 0.11, type: 'triangle', wet: 0.9 });
      });
    },
    click: function () {
      tone({ f: 640, dur: 0.05, gain: 0.07, type: 'triangle' });
    },
    erase: function () {
      noise({ f: 900, to: 400, q: 0.8, dur: 0.25, gain: 0.05, attack: 0.05 });
    },
  };

  function sfx(name) {
    if (!sfxOn || !ensure() || !SFX[name]) return;
    try {
      SFX[name]();
    } catch (e) {
      /* ses asla oyunu bozmasın */
    }
  }

  /** v: 0..1 — rüzgârlı bölgede yükselir, dışarıda kısılır. */
  function setWind(v) {
    if (!ctx || !windGain) return;
    windGain.gain.setTargetAtTime(sfxOn ? v * THEME[theme].windGain : 0, ctx.currentTime, 0.4);
  }

  function scheduleNote() {
    if (!ctx || !musicOn || !wantMusic) return;
    var T = THEME[theme];
    if (ctx.state === 'running') {
      var f = T.notes[Math.floor(Math.random() * T.notes.length)];
      tone({ f: f, dur: 4.5, gain: theme === 'cave' ? 0.055 : 0.05, attack: 0.9, dest: musicBus, wet: T.wet, type: theme === 'cave' ? 'triangle' : 'sine' });
      if (Math.random() < 0.3) tone({ f: f * 2, dur: 3, gain: 0.018, attack: 1.2, dest: musicBus, wet: T.wet, type: 'triangle' });
    }
    musicTimer = setTimeout(scheduleNote, T.noteEvery[0] + Math.random() * (T.noteEvery[1] - T.noteEvery[0]));
  }

  /** Ortam sesleri (kuş / damla): müzik açıkken ara sıra, rastgele aralıklarla. */
  function scheduleAmbient() {
    if (!ctx || !musicOn || !wantMusic) return;
    var T = THEME[theme];
    if (ctx.state === 'running' && sfxOn) {
      try {
        SFX[theme === 'cave' ? 'drip' : 'chirp']();
      } catch (e) {
        /* ses asla oyunu bozmasın */
      }
    }
    ambTimer = setTimeout(scheduleAmbient, T.ambEvery[0] + Math.random() * (T.ambEvery[1] - T.ambEvery[0]));
  }

  function tuneDrone() {
    if (!drone) return;
    var T = THEME[theme];
    drone.forEach(function (d, i) {
      var f = T.drone[i];
      d.g.gain.setTargetAtTime(f ? T.droneGain : 0, ctx.currentTime, 1.2);
      if (f) d.o.frequency.setTargetAtTime(f, ctx.currentTime, 1.2);
    });
  }

  function startMusic() {
    wantMusic = true;
    if (!ctx || !musicOn || musicTimer) return;
    if (!drone) {
      drone = [0, 1, 2].map(function () {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 110;
        g.gain.value = 0;
        o.connect(g);
        g.connect(musicBus);
        o.start();
        return { o: o, g: g };
      });
      tuneDrone();
    }
    scheduleNote();
    clearTimeout(ambTimer);
    ambTimer = setTimeout(scheduleAmbient, 2500 + Math.random() * 3000);
  }

  /** Sezon teması: müzik gamı, drone, rüzgâr rengi ve adım sesi değişir. */
  function setTheme(name) {
    if (!THEME[name] || name === theme) return;
    theme = name;
    if (ctx && windFilter) {
      windFilter.frequency.setTargetAtTime(THEME[theme].windF, ctx.currentTime, 0.3);
      windFilter.Q.setTargetAtTime(THEME[theme].windQ, ctx.currentTime, 0.3);
    }
    tuneDrone();
  }

  function stopMusic() {
    wantMusic = false;
    clearTimeout(musicTimer);
    clearTimeout(ambTimer);
    musicTimer = null;
    ambTimer = null;
  }

  function setMusic(on) {
    musicOn = !!on;
    if (musicBus) musicBus.gain.setTargetAtTime(musicOn ? 1 : 0, ctx.currentTime, 0.3);
    if (musicOn) {
      if (wantMusic) {
        clearTimeout(musicTimer);
        musicTimer = null;
        startMusic();
      }
    } else {
      clearTimeout(musicTimer);
      clearTimeout(ambTimer);
      musicTimer = null;
      ambTimer = null;
    }
  }

  function setSfx(on) {
    sfxOn = !!on;
    if (!sfxOn) setWind(0);
  }

  S.Audio = {
    unlock: unlock,
    sfx: sfx,
    setWind: setWind,
    startMusic: startMusic,
    stopMusic: stopMusic,
    setMusic: setMusic,
    setTheme: setTheme,
    setSfx: setSfx,
    suspend: function () {
      if (ctx && ctx.state === 'running') ctx.suspend();
    },
    resume: resumeCtx,
  };
})(window);
