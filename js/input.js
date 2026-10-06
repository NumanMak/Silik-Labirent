/* Silik — girdi: klavye (WASD / oklar) + esnek dokunmatik joystick (Pointer Events) */
(function (root) {
  'use strict';
  var S = (root.Silik = root.Silik || {});

  var KEYS = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };
  var ACTIONS = {
    Space: 'stone',
    KeyE: 'switch',
    KeyQ: 'switch',
    Escape: 'pause',
    KeyP: 'pause',
    KeyM: 'mute',
  };

  var held = {};
  var enabled = false;
  var stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, active: false };
  var els = {};
  var STICK_R = 54;
  var DEAD = 0.16;

  var Input = {
    onAction: null,
    usedTouch: false,
    override: null, // test/demo için sanal vektör
    stickRadius: STICK_R,
  };

  function fire(name) {
    if (Input.onAction) Input.onAction(name);
  }

  function setEnabled(v) {
    enabled = v;
    if (!v) {
      held = {};
      endStick();
    }
  }

  function endStick() {
    stick.id = null;
    stick.active = false;
    stick.x = stick.y = 0;
    if (els.root) els.root.classList.remove('on');
  }

  function placeStick() {
    if (!els.root) return;
    els.root.style.transform = 'translate(' + stick.ox + 'px,' + stick.oy + 'px)';
    els.knob.style.transform = 'translate(' + stick.x * STICK_R + 'px,' + stick.y * STICK_R + 'px)';
  }

  function init(opts) {
    els.surface = opts.surface;
    els.root = opts.stick;
    els.knob = opts.knob;

    root.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = KEYS[e.code];
      var a = ACTIONS[e.code];
      if (!k && !a) return;
      if (a === 'pause' || a === 'mute') {
        if (!e.repeat) fire(a);
        e.preventDefault();
        return;
      }
      if (!enabled) return;
      e.preventDefault();
      if (k) held[k] = true;
      else if (!e.repeat) fire(a);
    });
    root.addEventListener('keyup', function (e) {
      var k = KEYS[e.code];
      if (k) held[k] = false;
    });
    root.addEventListener('blur', function () {
      held = {};
      endStick();
    });

    var s = els.surface;
    s.addEventListener('pointerdown', function (e) {
      if (!enabled || stick.id !== null) return;
      if (e.pointerType === 'touch') Input.usedTouch = true;
      stick.id = e.pointerId;
      stick.ox = e.clientX;
      stick.oy = e.clientY;
      stick.x = stick.y = 0;
      stick.active = true;
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* yok say */
      }
      if (els.root) els.root.classList.add('on');
      placeStick();
      e.preventDefault();
    });
    s.addEventListener('pointermove', function (e) {
      if (e.pointerId !== stick.id) return;
      var dx = e.clientX - stick.ox;
      var dy = e.clientY - stick.oy;
      var len = Math.hypot(dx, dy);
      if (len > STICK_R) {
        // parmak sınırı aşarsa taban parmağı takip eder: baş parmağı geri çekmeden yön değiştirilebilir
        var k = (len - STICK_R) / len;
        stick.ox += dx * k;
        stick.oy += dy * k;
        dx = e.clientX - stick.ox;
        dy = e.clientY - stick.oy;
        len = STICK_R;
      }
      stick.x = dx / STICK_R;
      stick.y = dy / STICK_R;
      placeStick();
      e.preventDefault();
    });
    function up(e) {
      if (e.pointerId !== stick.id) return;
      endStick();
    }
    s.addEventListener('pointerup', up);
    s.addEventListener('pointercancel', up);
    s.addEventListener('lostpointercapture', up);
    s.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });

    // iOS: sayfa kaydırma / yakınlaştırma / çift dokunma engeli
    document.addEventListener(
      'touchmove',
      function (e) {
        if (!e.target.closest || !e.target.closest('.scroll, .card, #s-title')) e.preventDefault();
      },
      { passive: false }
    );
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) {
      document.addEventListener(n, function (e) {
        e.preventDefault();
      });
    });
  }

  /** -1..1 aralığında hareket vektörü. */
  function vector() {
    if (Input.override) return Input.override;
    if (!enabled) return { x: 0, y: 0 };
    if (stick.active) {
      var m = Math.hypot(stick.x, stick.y);
      if (m < DEAD) return { x: 0, y: 0 };
      var scale = (m - DEAD) / (1 - DEAD) / m;
      return { x: stick.x * scale, y: stick.y * scale };
    }
    var x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    var y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    if (x && y) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x: x, y: y };
  }

  Input.init = init;
  Input.vector = vector;
  Input.setEnabled = setEnabled;
  Input.fire = fire;
  S.Input = Input;
})(window);
