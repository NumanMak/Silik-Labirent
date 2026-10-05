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
  var NOTES = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];

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
    bp.frequency.value = 520;
    bp.Q.value = 0.7;
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
      noise({ f: 1700 + Math.random() * 900, q: 1.2, dur: 0.05, gain: 0.035 });
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
    windGain.gain.setTargetAtTime(sfxOn ? v * 0.16 : 0, ctx.currentTime, 0.4);
  }

  function scheduleNote() {
    if (!ctx || !musicOn || !wantMusic) return;
    if (ctx.state === 'running') {
      var f = NOTES[Math.floor(Math.random() * NOTES.length)];
      tone({ f: f, dur: 4.5, gain: 0.05, attack: 0.9, dest: musicBus, wet: 1, type: 'sine' });
      if (Math.random() < 0.3) tone({ f: f * 2, dur: 3, gain: 0.018, attack: 1.2, dest: musicBus, wet: 1, type: 'triangle' });
    }
    musicTimer = setTimeout(scheduleNote, 2200 + Math.random() * 3800);
  }

  function startMusic() {
    wantMusic = true;
    if (!ctx || !musicOn || musicTimer) return;
    if (!drone) {
      drone = [110, 164.81].map(function (f) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.value = 0.014;
        o.connect(g);
        g.connect(musicBus);
        o.start();
        return g;
      });
    }
    scheduleNote();
  }

  function stopMusic() {
    wantMusic = false;
    clearTimeout(musicTimer);
    musicTimer = null;
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
      musicTimer = null;
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
    setSfx: setSfx,
    suspend: function () {
      if (ctx && ctx.state === 'running') ctx.suspend();
    },
    resume: resumeCtx,
  };
})(window);
