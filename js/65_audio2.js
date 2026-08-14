/* ============================================================
   65_audio2.js —— 音效 2.0：战斗爽感 + 出货分级 + 多版本方案
   - 在 12_audio（合成引擎）+ 17_audio（追加层）之上链式增强
   - 三档音效风格：1 经典 / 2 冲击（默认）/ 3 史诗；
     可全局切换（G.Audio.setSfxStyle），也可单音效覆盖
     （G.Audio.setSfxVariant('crit', 3)）
   - 出货按稀有度分级（白 0 / 绿 1 / 蓝 2 / 紫 3 / 红 4）：
     loot_t0..t4（物品弹出）+ chest_open_t0..t4（开箱，按容器品质）
   - 新增原语：底鼓 _kick / 军鼓 _snare / 琶音 _sparkle / 扫频 _sweep
   - 主总线插入压缩器，多音效堆叠时瞬态更稳、不削波
   ============================================================ */
'use strict';

(function () {

  var G = window.G || (window.G = {});
  var A = G.Audio;
  if (!A) return;

  var baseSfx = A.sfx.bind(A);
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---------------- 风格参数表 ---------------- */
  var STYLE = {
    1: { name: '经典', mul: 0.92, send: 0.8, layers: 1, bright: 0.92, thump: 0.9, dist: 0.8 },
    2: { name: '冲击', mul: 1.0, send: 1.0, layers: 2, bright: 1.0, thump: 1.0, dist: 1.0 },
    3: { name: '史诗', mul: 1.06, send: 1.4, layers: 3, bright: 1.1, thump: 1.12, dist: 1.1 }
  };

  /* ---------------- 风格状态（持久化） ---------------- */
  A.sfxStyle = 2;
  A.sfxOverride = {};      // 单音效覆盖：name -> 1..3
  try {
    if (typeof localStorage !== 'undefined') {
      var saved = parseInt(localStorage.getItem('abyss_hunter_sfx_style') || '0', 10);
      if (saved >= 1 && saved <= 3) A.sfxStyle = saved;
    }
  } catch (e) { /* 无 localStorage 时保持默认 */ }

  A.styleParams = function () { return STYLE[A.sfxStyle] || STYLE[2]; };
  A.sfxStyleName = function () { return STYLE[A.sfxStyle].name; };

  A.setSfxStyle = function (n) {
    n = (n === 1 || n === 2 || n === 3) ? n : 2;
    A.sfxStyle = n;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('abyss_hunter_sfx_style', String(n)); } catch (e) {}
    return n;
  };
  A.setSfxVariant = function (name, v) { if (name) A.sfxOverride[name] = v; };
  A.clearSfxVariant = function (name) { if (name) delete A.sfxOverride[name]; };

  /* ---------------- 主总线压缩器 ---------------- */
  var _init = A.init.bind(A);
  A.init = function () {
    _init();
    if (!this.ctx || this._comp) return;
    try {
      var c = this.ctx.createDynamicsCompressor();
      c.threshold.value = -20;
      c.knee.value = 22;
      c.ratio.value = 4;
      c.attack.value = 0.003;
      c.release.value = 0.16;
      this.master.disconnect();
      this.master.connect(c);
      c.connect(this.ctx.destination);
      this._comp = c;
    } catch (e) { /* 老环境无压缩器则跳过 */ }
  };

  /* ---------------- 新合成原语 ---------------- */
  /* 底鼓：低频正弦下坠 + 高频点击 */
  A._kick = function (t, opt) {
    var o = opt || {};
    var dur = o.dur || 0.16;
    this._tone(t, { type: 'sine', f0: o.f0 || 150, f1: o.f1 || 42, dur: dur,
      gain: o.gain || 0.3, atk: 0.002, send: o.send, center: o.center });
    this._noise(t, { dur: Math.min(0.04, dur * 0.3), gain: (o.gain || 0.3) * 0.22,
      filt: { type: 'highpass', f0: 2400 }, send: o.send, center: o.center });
  };

  /* 军鼓：带通噪声 + 短音 */
  A._snare = function (t, opt) {
    var o = opt || {};
    var dur = o.dur || 0.12;
    this._noise(t, { dur: dur, gain: o.gain || 0.16,
      filt: { type: 'bandpass', f0: o.f0 || 1800, f1: o.f1, q: 0.9 }, send: o.send, center: o.center });
    this._tone(t, { type: 'triangle', f0: o.tone || 330,
      f1: (o.tone2 != null ? o.tone2 : (o.tone || 330) * 0.72),
      dur: Math.min(0.08, dur * 0.6), gain: (o.gain || 0.16) * 0.4 });
  };

  /* 琶音闪光：一串快速上行音符（出货/暴击点缀） */
  A._sparkle = function (t, base, opts) {
    var o = opts || {};
    var n = o.notes || 4;
    var step = o.step || 0.055;
    var type = o.type || 'triangle';
    var mul = o.stepMul || 1.17;
    for (var i = 0; i < n; i++) {
      var f = base * Math.pow(mul, i);
      this._tone(t + i * step, { type: type, f0: f, f1: f * 1.08, dur: o.dur || 0.09,
        gain: (o.gain || 0.1) * (1 - i * 0.12), send: o.send, center: o.center });
    }
  };

  /* 噪声扫频（风/传送/下滑） */
  A._sweep = function (t, opt) {
    var o = opt || {};
    this._noise(t, { dur: o.dur || 0.5, gain: o.gain || 0.12,
      filt: { type: o.type || 'bandpass', f0: o.f0 || 300, f1: o.f1 || 2400, q: o.q || 1.1 },
      send: o.send, center: o.center });
    if (o.tone) {
      this._tone(t, { type: 'sawtooth', f0: o.tone0 || 120, f1: o.tone1 || 300,
        dur: o.dur || 0.5, gain: (o.gain || 0.12) * 0.45, send: o.send, center: o.center });
    }
  };

  /* ---------------- 音效定义（EXTRA2） ---------------- */
  var EXTRA2 = {
    /* ================= 战斗 ================= */
    fire: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'square', f0: 880, f1: 320, dur: 0.055, gain: 0.11 * P.mul, detune: 45,
        fm: { ratio: 1.4, idx: 50, decay: true }, send: 0.05 * P.send });
      A._noise(t, { dur: 0.04, gain: 0.05 * P.mul, filt: { type: 'highpass', f0: 1500 } });
      A._tone(t, { type: 'sine', f0: 180, f1: 72, dur: 0.06, gain: 0.05 * P.thump });
    },
    fire_v2: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'square', f0: 900, f1: 300, dur: 0.06, gain: 0.12 * P.mul, detune: 50,
        fm: { ratio: 1.5, idx: 60, decay: true }, distort: 0.25 * P.dist, send: 0.08 * P.send });
      A._noise(t, { dur: 0.05, gain: 0.06 * P.mul, filt: { type: 'highpass', f0: 1500 } });
      A._noise(t + 0.005, { dur: 0.05, gain: 0.045 * P.mul, filt: { type: 'bandpass', f0: 900, q: 1.2 } });
      A._kick(t, { dur: 0.1, f0: 140, f1: 50, gain: 0.1 * P.thump });
    },
    fire_v3: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'square', f0: 950, f1: 290, dur: 0.07, gain: 0.1 * P.mul, detune: 60,
        fm: { ratio: 1.6, idx: 70, decay: true }, distort: 0.3 * P.dist, send: 0.12 * P.send });
      A._tone(t + 0.028, { type: 'square', f0: 890, f1: 310, dur: 0.06, gain: 0.08 * P.mul, detune: -40,
        fm: { ratio: 1.4, idx: 55, decay: true } });
      A._noise(t, { dur: 0.07, gain: 0.07 * P.mul, filt: { type: 'highpass', f0: 1400 } });
      A._kick(t, { dur: 0.13, f0: 130, f1: 44, gain: 0.12 * P.thump, send: 0.08 * P.send });
    },

    swing: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.12, gain: 0.1 * P.mul, filt: { type: 'bandpass', f0: 500, f1: 1800, q: 1.1 } });
      A._tone(t, { type: 'triangle', f0: 480, f1: 210, dur: 0.09, gain: 0.05 * P.mul });
    },
    swing_v2: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.13, gain: 0.11 * P.mul, filt: { type: 'bandpass', f0: 520, f1: 2000, q: 1.0 } });
      A._noise(t + 0.03, { dur: 0.08, gain: 0.05 * P.mul, filt: { type: 'highpass', f0: 2600 } });
      A._tone(t, { type: 'triangle', f0: 460, f1: 190, dur: 0.1, gain: 0.05 * P.mul });
      A._tone(t + 0.05, { type: 'sine', f0: 1250, f1: 940, dur: 0.05, gain: 0.035 * P.bright, send: 0.08 * P.send });
    },
    swing_v3: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.16, gain: 0.12 * P.mul, filt: { type: 'bandpass', f0: 400, f1: 2200, q: 0.9 } });
      A._noise(t + 0.04, { dur: 0.1, gain: 0.06 * P.mul, filt: { type: 'highpass', f0: 2800 } });
      A._tone(t, { type: 'triangle', f0: 500, f1: 170, dur: 0.13, gain: 0.06 * P.mul });
      A._tone(t + 0.06, { type: 'sine', f0: 1500, f1: 1050, dur: 0.09, gain: 0.04 * P.bright, send: 0.14 * P.send });
    },

    hit: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.05, gain: 0.1 * P.mul, filt: { type: 'lowpass', f0: 950, f1: 420 }, send: 0.05 * P.send });
      A._tone(t, { type: 'square', f0: 300, f1: 150, dur: 0.05, gain: 0.07 * P.mul, detune: 30 });
    },
    hit_v2: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.06, gain: 0.11 * P.mul, filt: { type: 'lowpass', f0: 1000, f1: 380 }, send: 0.08 * P.send });
      A._tone(t, { type: 'square', f0: 310, f1: 140, dur: 0.06, gain: 0.08 * P.mul, detune: 35, distort: 0.3 * P.dist });
      A._kick(t, { dur: 0.09, f0: 150, f1: 55, gain: 0.1 * P.thump });
      A._noise(t + 0.01, { dur: 0.02, gain: 0.03, filt: { type: 'highpass', f0: 3200 } });
    },
    hit_v3: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.08, gain: 0.12 * P.mul, filt: { type: 'lowpass', f0: 1100, f1: 320 }, send: 0.12 * P.send });
      A._noise(t + 0.01, { dur: 0.04, gain: 0.05 * P.mul, filt: { type: 'highpass', f0: 2400 } });
      A._tone(t, { type: 'square', f0: 330, f1: 130, dur: 0.07, gain: 0.09 * P.mul, detune: 40, distort: 0.35 * P.dist });
      A._kick(t, { dur: 0.12, f0: 150, f1: 45, gain: 0.13 * P.thump });
      A._tone(t + 0.02, { type: 'sine', f0: 95, f1: 48, dur: 0.1, gain: 0.07 * P.thump });
    },

    crit: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'square', f0: 1300, f1: 1750, dur: 0.07, gain: 0.12 * P.mul, detune: 40,
        fm: { ratio: 2, idx: 110, decay: true }, send: 0.08 * P.send });
      A._tone(t + 0.04, { type: 'square', f0: 1750, f1: 2150, dur: 0.07, gain: 0.09 * P.mul, detune: 40 });
      A._noise(t, { dur: 0.06, gain: 0.06 * P.mul, filt: { type: 'highpass', f0: 2000 } });
    },
    crit_v2: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'square', f0: 1350, f1: 1800, dur: 0.07, gain: 0.13 * P.mul, detune: 45,
        fm: { ratio: 2, idx: 130, decay: true }, distort: 0.2 * P.dist, send: 0.14 * P.send });
      A._tone(t + 0.045, { type: 'square', f0: 1800, f1: 2250, dur: 0.07, gain: 0.1 * P.mul, detune: 45 });
      A._tone(t + 0.02, { type: 'sine', f0: 2300, f1: 3400, dur: 0.12, gain: 0.055 * P.bright, send: 0.18 * P.send });
      A._noise(t, { dur: 0.07, gain: 0.07 * P.mul, filt: { type: 'highpass', f0: 2100 } });
      A._sparkle(t + 0.06, 1800, { notes: 3, step: 0.04, gain: 0.05 * P.mul, send: 0.12 * P.send });
    },
    crit_v3: function (A, t) {
      var P = A.styleParams();
      A._sparkle(t, 1500, { notes: 4, step: 0.045, gain: 0.07 * P.mul, send: 0.16 * P.send });
      A._tone(t, { type: 'square', f0: 1400, f1: 1900, dur: 0.08, gain: 0.12 * P.mul, detune: 50,
        fm: { ratio: 2.2, idx: 150, decay: true }, distort: 0.25 * P.dist, send: 0.18 * P.send });
      A._noise(t, { dur: 0.12, gain: 0.08 * P.mul, filt: { type: 'highpass', f0: 2600 }, send: 0.16 * P.send });
      A._kick(t, { dur: 0.13, f0: 130, f1: 42, gain: 0.1 * P.thump, send: 0.1 * P.send });
    },

    kill: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.1, gain: 0.12 * P.mul, filt: { type: 'lowpass', f0: 700, f1: 200 }, send: 0.12 * P.send, distort: 6 * P.dist });
      A._tone(t, { type: 'sawtooth', f0: 200, f1: 75, dur: 0.1, gain: 0.1 * P.mul, distort: 5 * P.dist });
      A._kick(t, { dur: 0.12, f0: 160, f1: 55, gain: 0.1 * P.thump });
    },
    kill_v2: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.14, gain: 0.14 * P.mul, filt: { type: 'lowpass', f0: 750, f1: 160 }, send: 0.2 * P.send, distort: 8 * P.dist });
      A._tone(t, { type: 'sawtooth', f0: 210, f1: 62, dur: 0.13, gain: 0.12 * P.mul, distort: 7 * P.dist });
      A._kick(t, { dur: 0.17, f0: 160, f1: 46, gain: 0.16 * P.thump, send: 0.12 * P.send });
      A._noise(t + 0.02, { dur: 0.05, gain: 0.045 * P.mul, filt: { type: 'highpass', f0: 2800 } });
    },
    kill_v3: function (A, t) {
      var P = A.styleParams();
      A._kick(t, { dur: 0.22, f0: 150, f1: 38, gain: 0.19 * P.thump, send: 0.18 * P.send });
      A._noise(t, { dur: 0.22, gain: 0.15 * P.mul, filt: { type: 'lowpass', f0: 800, f1: 120 }, send: 0.28 * P.send, distort: 10 * P.dist });
      A._tone(t, { type: 'sawtooth', f0: 220, f1: 48, dur: 0.2, gain: 0.13 * P.mul, distort: 8 * P.dist, send: 0.2 * P.send });
      A._noise(t + 0.03, { dur: 0.08, gain: 0.06 * P.mul, filt: { type: 'highpass', f0: 3000 }, send: 0.18 * P.send });
      A._tone(t + 0.05, { type: 'sine', f0: 1300, f1: 1900, dur: 0.12, gain: 0.05 * P.bright, send: 0.24 * P.send });
    },

    bossdie: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.8, gain: 0.3 * P.mul, filt: { type: 'lowpass', f0: 800, f1: 110 }, send: 0.32 * P.send, distort: 12 * P.dist, center: true });
      A._tone(t, { type: 'sawtooth', f0: 170, f1: 36, dur: 0.75, gain: 0.2 * P.mul, distort: 9 * P.dist, center: true });
      A._tone(t + 0.05, { type: 'square', f0: 290, f1: 52, dur: 0.55, gain: 0.11 * P.mul, center: true });
      A._tone(t + 0.2, { type: 'sine', f0: 85, f1: 28, dur: 0.6, gain: 0.16 * P.thump, send: 0.2 * P.send, center: true });
    },
    bossdie_v2: function (A, t) {
      var P = A.styleParams();
      A._kick(t, { dur: 0.5, f0: 90, f1: 28, gain: 0.2 * P.thump, send: 0.24 * P.send, center: true });
      A._noise(t, { dur: 1.0, gain: 0.34 * P.mul, filt: { type: 'lowpass', f0: 850, f1: 90 }, send: 0.4 * P.send, distort: 14 * P.dist, center: true });
      A._tone(t, { type: 'sawtooth', f0: 180, f1: 32, dur: 0.9, gain: 0.22 * P.mul, distort: 11 * P.dist, send: 0.26 * P.send, center: true });
      A._tone(t + 0.06, { type: 'square', f0: 300, f1: 48, dur: 0.65, gain: 0.12 * P.mul, center: true });
      A._tone(t + 0.25, { type: 'sine', f0: 80, f1: 24, dur: 0.75, gain: 0.18 * P.thump, send: 0.24 * P.send, center: true });
    },
    bossdie_v3: function (A, t) {
      var P = A.styleParams();
      A._kick(t, { dur: 0.6, f0: 95, f1: 26, gain: 0.22 * P.thump, send: 0.3 * P.send, center: true });
      A._noise(t, { dur: 1.2, gain: 0.36 * P.mul, filt: { type: 'lowpass', f0: 900, f1: 80 }, send: 0.46 * P.send, distort: 16 * P.dist, center: true });
      A._chord(t, [110, 165, 220], { type: 'sawtooth', dur: 0.8, gain: 0.12 * P.mul, stagger: 0.1, f1: [55, 82, 110], distort: 9 * P.dist, send: 0.34 * P.send, center: true });
      A._tone(t, { type: 'sawtooth', f0: 190, f1: 30, dur: 1.05, gain: 0.2 * P.mul, distort: 12 * P.dist, send: 0.3 * P.send, center: true });
      A._noise(t + 0.4, { dur: 0.7, gain: 0.08 * P.mul, filt: { type: 'highpass', f0: 3500 }, send: 0.36 * P.send, center: true });
      A._tone(t + 0.5, { type: 'sine', f0: 70, f1: 22, dur: 0.9, gain: 0.2 * P.thump, send: 0.3 * P.send, center: true });
    },

    boss: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'sawtooth', f0: 155, f1: 64, dur: 0.6, gain: 0.22 * P.mul, send: 0.25 * P.send, center: true, lfo: { rate: 5, depth: 16, target: 'freq' } });
      A._noise(t, { dur: 0.35, gain: 0.1 * P.mul, filt: { type: 'lowpass', f0: 420 }, center: true });
    },
    boss_v2: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'sawtooth', f0: 160, f1: 58, dur: 0.75, gain: 0.24 * P.mul, send: 0.3 * P.send, center: true, lfo: { rate: 5, depth: 20, target: 'freq' }, distort: 0.25 * P.dist });
      A._tone(t + 0.04, { type: 'sawtooth', f0: 155, f1: 62, dur: 0.7, gain: 0.14 * P.mul, detune: -14, center: true });
      A._noise(t, { dur: 0.45, gain: 0.12 * P.mul, filt: { type: 'lowpass', f0: 400 }, center: true });
      A._tone(t + 0.1, { type: 'sine', f0: 60, f1: 38, dur: 0.6, gain: 0.14 * P.thump, center: true });
    },
    boss_v3: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [98, 147, 196], { type: 'sawtooth', dur: 0.9, gain: 0.13 * P.mul, stagger: 0.09, f1: [62, 92, 123], distort: 0.3 * P.dist, send: 0.36 * P.send, center: true });
      A._tone(t, { type: 'sawtooth', f0: 165, f1: 52, dur: 0.85, gain: 0.22 * P.mul, send: 0.3 * P.send, center: true, lfo: { rate: 6, depth: 22, target: 'freq' } });
      A._noise(t, { dur: 0.55, gain: 0.13 * P.mul, filt: { type: 'lowpass', f0: 380 }, center: true });
      A._tone(t + 0.12, { type: 'sine', f0: 55, f1: 34, dur: 0.8, gain: 0.16 * P.thump, send: 0.2 * P.send, center: true });
      A._noise(t + 0.3, { dur: 0.5, gain: 0.05 * P.mul, filt: { type: 'highpass', f0: 3200 }, send: 0.28 * P.send, center: true });
    },

    hurt: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.14, gain: 0.24 * P.mul, filt: { type: 'lowpass', f0: 330 }, send: 0.06 * P.send });
      A._tone(t, { type: 'sawtooth', f0: 220, f1: 110, dur: 0.13, gain: 0.15 * P.mul, distort: 5 * P.dist });
    },
    hurt_v2: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.16, gain: 0.26 * P.mul, filt: { type: 'lowpass', f0: 320 }, send: 0.1 * P.send });
      A._tone(t, { type: 'sawtooth', f0: 225, f1: 100, dur: 0.15, gain: 0.16 * P.mul, distort: 6 * P.dist });
      A._kick(t, { dur: 0.14, f0: 140, f1: 52, gain: 0.13 * P.thump });
    },
    hurt_v3: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.2, gain: 0.28 * P.mul, filt: { type: 'lowpass', f0: 300 }, send: 0.14 * P.send });
      A._tone(t, { type: 'sawtooth', f0: 230, f1: 90, dur: 0.18, gain: 0.17 * P.mul, distort: 7 * P.dist });
      A._kick(t, { dur: 0.18, f0: 135, f1: 46, gain: 0.16 * P.thump });
      A._tone(t + 0.1, { type: 'sine', f0: 62, f1: 44, dur: 0.25, gain: 0.1 * P.thump, send: 0.1 * P.send });
    },

    death: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'sawtooth', f0: 420, f1: 50, dur: 0.95, gain: 0.26 * P.mul, distort: 8 * P.dist, send: 0.28 * P.send, center: true });
      A._noise(t + 0.1, { dur: 0.45, gain: 0.15 * P.mul, filt: { type: 'lowpass', f0: 300 }, center: true });
    },
    death_v2: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'sawtooth', f0: 430, f1: 44, dur: 1.1, gain: 0.28 * P.mul, distort: 10 * P.dist, send: 0.34 * P.send, center: true });
      A._noise(t + 0.1, { dur: 0.55, gain: 0.17 * P.mul, filt: { type: 'lowpass', f0: 280 }, center: true });
      A._kick(t, { dur: 0.5, f0: 110, f1: 32, gain: 0.18 * P.thump, send: 0.2 * P.send, center: true });
      A._tone(t + 0.25, { type: 'sine', f0: 160, f1: 38, dur: 0.8, gain: 0.13 * P.mul, send: 0.24 * P.send, center: true });
    },
    death_v3: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [330, 262, 196, 147], { type: 'sawtooth', dur: 1.2, gain: 0.14 * P.mul, stagger: 0.12, f1: [196, 147, 110, 82], distort: 8 * P.dist, send: 0.36 * P.send, center: true });
      A._tone(t, { type: 'sawtooth', f0: 440, f1: 40, dur: 1.3, gain: 0.25 * P.mul, distort: 12 * P.dist, send: 0.32 * P.send, center: true });
      A._noise(t + 0.15, { dur: 0.8, gain: 0.16 * P.mul, filt: { type: 'lowpass', f0: 260 }, send: 0.3 * P.send, center: true });
      A._kick(t, { dur: 0.7, f0: 105, f1: 28, gain: 0.2 * P.thump, send: 0.24 * P.send, center: true });
    },

    /* ================= 出货 / 拾取 ================= */
    chest_start: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.18, gain: 0.1 * P.mul, filt: { type: 'lowpass', f0: 950, f1: 300 }, send: 0.08 * P.send });
      A._tone(t, { type: 'triangle', f0: 210, f1: 170, dur: 0.2, gain: 0.07 * P.mul });
      A._tone(t + 0.04, { type: 'sawtooth', f0: 130, f1: 88, dur: 0.28, gain: 0.035 * P.mul });
    },

    chest_open_t0: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.14, gain: 0.16 * P.mul, filt: { type: 'lowpass', f0: 700, f1: 250 }, send: 0.08 * P.send });
      A._tone(t, { type: 'square', f0: 260, f1: 110, dur: 0.1, gain: 0.1 * P.mul });
      A._tone(t + 0.12, { type: 'triangle', f0: 700, f1: 950, dur: 0.1, gain: 0.07 * P.mul, send: 0.08 * P.send });
    },
    chest_open_t1: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.15, gain: 0.17 * P.mul, filt: { type: 'lowpass', f0: 720, f1: 240 }, send: 0.1 * P.send });
      A._tone(t, { type: 'square', f0: 270, f1: 105, dur: 0.11, gain: 0.11 * P.mul });
      A._tone(t + 0.1, { type: 'triangle', f0: 720, f1: 980, dur: 0.11, gain: 0.08 * P.mul });
      A._tone(t + 0.17, { type: 'triangle', f0: 980, f1: 1280, dur: 0.12, gain: 0.07 * P.mul, send: 0.12 * P.send });
    },
    chest_open_t2: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.18, gain: 0.18 * P.mul, filt: { type: 'lowpass', f0: 750, f1: 220 }, send: 0.12 * P.send });
      A._tone(t, { type: 'square', f0: 280, f1: 100, dur: 0.12, gain: 0.11 * P.mul, distort: 0.2 * P.dist });
      A._chord(t + 0.08, [660, 880, 1175], { type: 'triangle', dur: 0.16, gain: 0.11 * P.mul, stagger: 0.05, send: 0.16 * P.send });
      A._sparkle(t + 0.2, 1320, { notes: 3, step: 0.05, gain: 0.06 * P.mul, send: 0.14 * P.send });
    },
    chest_open_t3: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.2, gain: 0.2 * P.mul, filt: { type: 'lowpass', f0: 800, f1: 200 }, send: 0.16 * P.send });
      A._tone(t, { type: 'square', f0: 290, f1: 95, dur: 0.13, gain: 0.12 * P.mul, distort: 0.25 * P.dist });
      A._kick(t, { dur: 0.18, f0: 130, f1: 46, gain: 0.13 * P.thump, send: 0.12 * P.send });
      A._chord(t + 0.1, [523, 659, 784, 1047], { type: 'triangle', dur: 0.22, gain: 0.13 * P.mul, stagger: 0.06, send: 0.24 * P.send });
      A._sparkle(t + 0.24, 1568, { notes: 4, step: 0.05, gain: 0.07 * P.mul, send: 0.2 * P.send });
      A._noise(t + 0.28, { dur: 0.25, gain: 0.05 * P.mul, filt: { type: 'highpass', f0: 5000 }, send: 0.18 * P.send });
    },
    chest_open_t4: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.24, gain: 0.22 * P.mul, filt: { type: 'lowpass', f0: 850, f1: 170 }, send: 0.2 * P.send });
      A._tone(t, { type: 'square', f0: 300, f1: 90, dur: 0.15, gain: 0.13 * P.mul, distort: 0.3 * P.dist });
      A._kick(t, { dur: 0.24, f0: 125, f1: 40, gain: 0.18 * P.thump, send: 0.16 * P.send });
      A._chord(t + 0.1, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.34, gain: 0.16 * P.mul, stagger: 0.08, send: 0.32 * P.send });
      A._sparkle(t + 0.3, 1568, { notes: 6, step: 0.055, gain: 0.08 * P.mul, send: 0.26 * P.send });
      A._tone(t + 0.28, { type: 'sine', f0: 1568, f1: 2093, dur: 0.55, gain: 0.09 * P.bright, send: 0.34 * P.send });
      A._tone(t + 0.5, { type: 'sine', f0: 2093, f1: 2637, dur: 0.5, gain: 0.07 * P.bright, send: 0.36 * P.send });
      A._noise(t + 0.35, { dur: 0.5, gain: 0.06 * P.mul, filt: { type: 'highpass', f0: 5500 }, send: 0.3 * P.send });
    },

    loot_t0: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'triangle', f0: 560, f1: 820, dur: 0.08, gain: 0.12 * P.mul, send: 0.06 * P.send });
      A._noise(t, { dur: 0.04, gain: 0.04, filt: { type: 'highpass', f0: 1800 } });
    },
    loot_t1: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'triangle', f0: 660, f1: 900, dur: 0.09, gain: 0.13 * P.mul });
      A._tone(t + 0.07, { type: 'triangle', f0: 900, f1: 1150, dur: 0.1, gain: 0.11 * P.mul, send: 0.08 * P.send });
      A._noise(t + 0.05, { dur: 0.05, gain: 0.045, filt: { type: 'highpass', f0: 2200 } });
    },
    loot_t2: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [660, 880, 1175], { type: 'triangle', dur: 0.14, gain: 0.13 * P.mul, stagger: 0.055, send: 0.14 * P.send });
      A._sparkle(t + 0.12, 1320, { notes: 3, step: 0.05, gain: 0.055 * P.mul, send: 0.12 * P.send });
      A._noise(t + 0.1, { dur: 0.12, gain: 0.05 * P.mul, filt: { type: 'highpass', f0: 3000 } });
    },
    loot_t3: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [523, 659, 784], { type: 'triangle', dur: 0.2, gain: 0.15 * P.mul, stagger: 0.07, send: 0.22 * P.send });
      A._tone(t + 0.16, { type: 'square', f0: 1047, f1: 1319, dur: 0.14, gain: 0.07 * P.mul });
      A._sparkle(t + 0.2, 1568, { notes: 4, step: 0.05, gain: 0.065 * P.mul, send: 0.2 * P.send });
      A._noise(t, { dur: 0.3, gain: 0.06 * P.mul, filt: { type: 'lowpass', f0: 500, f1: 200 }, send: 0.14 * P.send });
      A._noise(t + 0.22, { dur: 0.2, gain: 0.045 * P.mul, filt: { type: 'highpass', f0: 5200 }, send: 0.18 * P.send });
    },
    loot_t4: function (A, t) {
      var P = A.styleParams();
      A._kick(t, { dur: 0.2, f0: 130, f1: 42, gain: 0.16 * P.thump, send: 0.14 * P.send });
      A._chord(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.32, gain: 0.17 * P.mul, stagger: 0.07, send: 0.3 * P.send });
      A._sparkle(t + 0.26, 1568, { notes: 6, step: 0.055, gain: 0.075 * P.mul, send: 0.26 * P.send });
      A._tone(t + 0.24, { type: 'sine', f0: 1568, f1: 2093, dur: 0.5, gain: 0.085 * P.bright, send: 0.32 * P.send });
      A._tone(t + 0.45, { type: 'sine', f0: 2093, f1: 2637, dur: 0.45, gain: 0.065 * P.bright, send: 0.32 * P.send });
      A._noise(t + 0.3, { dur: 0.45, gain: 0.055 * P.mul, filt: { type: 'highpass', f0: 5600 }, send: 0.28 * P.send });
    },

    item_get: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'triangle', f0: 900, f1: 1250, dur: 0.09, gain: 0.14 * P.mul, send: 0.08 * P.send });
      A._tone(t + 0.07, { type: 'triangle', f0: 1250, f1: 1650, dur: 0.12, gain: 0.12 * P.mul, send: 0.12 * P.send });
      A._noise(t + 0.05, { dur: 0.06, gain: 0.045, filt: { type: 'highpass', f0: 3000 } });
    },
    item_get_v2: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'triangle', f0: 950, f1: 1350, dur: 0.1, gain: 0.15 * P.mul, send: 0.12 * P.send });
      A._tone(t + 0.07, { type: 'triangle', f0: 1350, f1: 1800, dur: 0.13, gain: 0.13 * P.mul });
      A._sparkle(t + 0.12, 1800, { notes: 3, step: 0.05, gain: 0.055 * P.mul, send: 0.16 * P.send });
      A._noise(t + 0.05, { dur: 0.07, gain: 0.05, filt: { type: 'highpass', f0: 3200 } });
    },
    item_get_v3: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'triangle', f0: 1000, f1: 1400, dur: 0.11, gain: 0.15 * P.mul, send: 0.16 * P.send });
      A._chord(t + 0.06, [1400, 1760, 2200], { type: 'triangle', dur: 0.16, gain: 0.08 * P.mul, stagger: 0.05, send: 0.2 * P.send });
      A._sparkle(t + 0.14, 2000, { notes: 4, step: 0.05, gain: 0.06 * P.mul, send: 0.2 * P.send });
      A._tone(t + 0.22, { type: 'sine', f0: 2637, f1: 3136, dur: 0.25, gain: 0.05 * P.bright, send: 0.24 * P.send });
    },

    pickup: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'square', f0: 1250, f1: 1850, dur: 0.05, gain: 0.09 * P.mul });
      A._tone(t + 0.05, { type: 'square', f0: 1650, f1: 2350, dur: 0.06, gain: 0.07 * P.mul, send: 0.06 * P.send });
      A._noise(t + 0.03, { dur: 0.03, gain: 0.035, filt: { type: 'highpass', f0: 5200 } });
    },

    /* ================= 流程 ================= */
    map_enter: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'sawtooth', f0: 130, f1: 60, dur: 0.6, gain: 0.16 * P.mul, send: 0.25 * P.send, center: true });
      A._noise(t, { dur: 0.35, gain: 0.07 * P.mul, filt: { type: 'lowpass', f0: 500, f1: 180 }, center: true });
      A._tone(t + 0.05, { type: 'sine', f0: 55, f1: 40, dur: 0.55, gain: 0.09 * P.thump, center: true });
    },
    descend: function (A, t) {
      var P = A.styleParams();
      A._sweep(t, { dur: 0.5, f0: 1700, f1: 220, q: 1.2, gain: 0.12 * P.mul, send: 0.2 * P.send, center: true });
      A._tone(t, { type: 'sawtooth', f0: 220, f1: 58, dur: 0.45, gain: 0.12 * P.mul, send: 0.18 * P.send, center: true });
      A._kick(t + 0.38, { dur: 0.18, f0: 130, f1: 44, gain: 0.15 * P.thump, send: 0.12 * P.send, center: true });
      A._sparkle(t + 0.42, 1319, { notes: 4, step: 0.055, gain: 0.06 * P.mul, send: 0.2 * P.send, center: true });
    },

    extract_ready: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [523, 659, 784, 1047], { type: 'triangle', dur: 0.24, gain: 0.15 * P.mul, stagger: 0.065, send: 0.26 * P.send, center: true });
      A._tone(t + 0.26, { type: 'sine', f0: 1047, f1: 1319, dur: 0.32, gain: 0.09 * P.bright, send: 0.2 * P.send, center: true });
    },
    extract_ready_v2: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [523, 659, 784, 1047], { type: 'triangle', dur: 0.26, gain: 0.16 * P.mul, stagger: 0.07, send: 0.3 * P.send, center: true });
      A._tone(t + 0.26, { type: 'sine', f0: 1047, f1: 1319, dur: 0.34, gain: 0.1 * P.bright, send: 0.24 * P.send, center: true });
      A._sparkle(t + 0.3, 1568, { notes: 3, step: 0.05, gain: 0.05 * P.mul, send: 0.22 * P.send, center: true });
      A._noise(t + 0.28, { dur: 0.25, gain: 0.04 * P.mul, filt: { type: 'highpass', f0: 4800 }, send: 0.2 * P.send, center: true });
    },
    extract_ready_v3: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.3, gain: 0.17 * P.mul, stagger: 0.075, send: 0.36 * P.send, center: true });
      A._sparkle(t + 0.28, 1568, { notes: 5, step: 0.055, gain: 0.06 * P.mul, send: 0.28 * P.send, center: true });
      A._tone(t + 0.32, { type: 'sine', f0: 1568, f1: 2093, dur: 0.5, gain: 0.08 * P.bright, send: 0.32 * P.send, center: true });
    },

    extract_start: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'sine', f0: 330, f1: 440, dur: 0.3, gain: 0.09 * P.mul, send: 0.12 * P.send, center: true, lfo: { rate: 6, depth: 10, target: 'freq' } });
      A._tone(t + 0.52, { type: 'sine', f0: 440, f1: 550, dur: 0.32, gain: 0.09 * P.mul, send: 0.14 * P.send, center: true, lfo: { rate: 7, depth: 12, target: 'freq' } });
      A._sparkle(t + 0.55, 880, { notes: 3, step: 0.06, gain: 0.045 * P.mul, send: 0.12 * P.send, center: true });
    },

    extract_done: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.4, gain: 0.18 * P.mul, stagger: 0.09, send: 0.32 * P.send, center: true });
      A._tone(t + 0.32, { type: 'sine', f0: 660, f1: 880, dur: 0.7, gain: 0.11 * P.bright, send: 0.28 * P.send, center: true });
      A._noise(t, { dur: 0.5, gain: 0.09 * P.mul, filt: { type: 'lowpass', f0: 900, f1: 220 }, send: 0.24 * P.send, center: true });
    },
    extract_done_v2: function (A, t) {
      var P = A.styleParams();
      A._kick(t, { dur: 0.2, f0: 140, f1: 46, gain: 0.14 * P.thump, send: 0.12 * P.send, center: true });
      A._chord(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.42, gain: 0.19 * P.mul, stagger: 0.09, send: 0.36 * P.send, center: true });
      A._sparkle(t + 0.3, 1568, { notes: 5, step: 0.055, gain: 0.065 * P.mul, send: 0.28 * P.send, center: true });
      A._tone(t + 0.34, { type: 'sine', f0: 1047, f1: 1568, dur: 0.75, gain: 0.1 * P.bright, send: 0.32 * P.send, center: true });
      A._noise(t, { dur: 0.6, gain: 0.1 * P.mul, filt: { type: 'lowpass', f0: 850, f1: 200 }, send: 0.28 * P.send, center: true });
    },
    extract_done_v3: function (A, t) {
      var P = A.styleParams();
      A._kick(t, { dur: 0.24, f0: 135, f1: 42, gain: 0.17 * P.thump, send: 0.16 * P.send, center: true });
      A._chord(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.45, gain: 0.18 * P.mul, stagger: 0.09, send: 0.38 * P.send, center: true });
      A._chord(t + 0.32, [659, 784, 1047, 1319, 1568], { type: 'triangle', dur: 0.38, gain: 0.13 * P.mul, stagger: 0.07, send: 0.4 * P.send, center: true });
      A._sparkle(t + 0.6, 2093, { notes: 6, step: 0.055, gain: 0.06 * P.mul, send: 0.32 * P.send, center: true });
      A._tone(t + 0.4, { type: 'sine', f0: 1319, f1: 2093, dur: 0.9, gain: 0.1 * P.bright, send: 0.36 * P.send, center: true });
      A._noise(t, { dur: 0.75, gain: 0.1 * P.mul, filt: { type: 'lowpass', f0: 900, f1: 180 }, send: 0.32 * P.send, center: true });
    },

    victory: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [523, 659, 784, 1047], { type: 'triangle', dur: 0.34, gain: 0.17 * P.mul, stagger: 0.1, send: 0.3 * P.send, center: true });
    },
    victory_v2: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [523, 659, 784, 1047], { type: 'triangle', dur: 0.36, gain: 0.18 * P.mul, stagger: 0.1, send: 0.34 * P.send, center: true });
      A._sparkle(t + 0.3, 1568, { notes: 4, step: 0.055, gain: 0.06 * P.mul, send: 0.26 * P.send, center: true });
      A._tone(t + 0.34, { type: 'sine', f0: 1568, f1: 2093, dur: 0.6, gain: 0.08 * P.bright, send: 0.3 * P.send, center: true });
    },
    victory_v3: function (A, t) {
      var P = A.styleParams();
      A._kick(t, { dur: 0.2, f0: 140, f1: 46, gain: 0.14 * P.thump, send: 0.12 * P.send, center: true });
      A._chord(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.42, gain: 0.19 * P.mul, stagger: 0.09, send: 0.38 * P.send, center: true });
      A._chord(t + 0.32, [784, 1047, 1319, 1568], { type: 'triangle', dur: 0.36, gain: 0.13 * P.mul, stagger: 0.07, send: 0.4 * P.send, center: true });
      A._sparkle(t + 0.6, 2093, { notes: 6, step: 0.055, gain: 0.06 * P.mul, send: 0.3 * P.send, center: true });
    },

    lose: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [330, 262, 196], { type: 'sawtooth', dur: 0.7, gain: 0.13 * P.mul, stagger: 0.12, f1: [196, 147, 110], send: 0.26 * P.send, center: true });
      A._tone(t + 0.1, { type: 'sine', f0: 98, f1: 55, dur: 0.6, gain: 0.1 * P.thump, center: true });
      A._noise(t + 0.2, { dur: 0.4, gain: 0.06 * P.mul, filt: { type: 'lowpass', f0: 320 }, send: 0.2 * P.send, center: true });
    },

    save: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'triangle', f0: 700, f1: 1050, dur: 0.08, gain: 0.1 * P.mul });
      A._tone(t + 0.08, { type: 'triangle', f0: 1050, f1: 1400, dur: 0.1, gain: 0.08 * P.mul, send: 0.1 * P.send });
      A._kick(t + 0.02, { dur: 0.09, f0: 180, f1: 90, gain: 0.06 * P.thump });
    },

    levelup: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [523, 659, 784, 1047], { type: 'triangle', dur: 0.2, gain: 0.15 * P.mul, stagger: 0.06, send: 0.22 * P.send });
      A._sparkle(t + 0.18, 1568, { notes: 3, step: 0.05, gain: 0.055 * P.mul, send: 0.18 * P.send });
    },

    buy: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'square', f0: 900, f1: 1300, dur: 0.07, gain: 0.14 * P.mul });
      A._tone(t + 0.06, { type: 'square', f0: 1300, f1: 1700, dur: 0.08, gain: 0.12 * P.mul, send: 0.1 * P.send });
      A._noise(t + 0.05, { dur: 0.04, gain: 0.04, filt: { type: 'highpass', f0: 4800 } });
    },

    reroll: function (A, t) {
      var P = A.styleParams();
      A._noise(t, { dur: 0.24, gain: 0.09 * P.mul, filt: { type: 'bandpass', f0: 800, f1: 2400, q: 1.4 }, send: 0.1 * P.send });
      A._tone(t + 0.12, { type: 'square', f0: 500, f1: 950, dur: 0.12, gain: 0.08 * P.mul });
      A._tone(t + 0.2, { type: 'square', f0: 950, f1: 1400, dur: 0.08, gain: 0.06 * P.mul });
    },

    abyss: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'sawtooth', f0: 90, f1: 260, dur: 0.62, gain: 0.2 * P.mul, send: 0.3 * P.send, center: true, lfo: { rate: 7, depth: 20, target: 'freq' } });
      A._tone(t + 0.05, { type: 'sine', f0: 180, f1: 50, dur: 0.66, gain: 0.16 * P.mul, send: 0.26 * P.send, center: true });
      A._noise(t, { dur: 0.55, gain: 0.11 * P.mul, filt: { type: 'lowpass', f0: 300, f1: 1700 }, center: true });
    },

    heal: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [600, 900, 1200], { type: 'sine', dur: 0.24, gain: 0.12 * P.mul, stagger: 0.06, f1: [760, 1140, 1500], send: 0.22 * P.send });
    },

    /* ================= UI ================= */
    confirm: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [523, 659, 784, 1047], { type: 'triangle', dur: 0.26, gain: 0.15 * P.mul, stagger: 0.055, send: 0.28 * P.send, center: true });
    },
    select: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [660, 990], { type: 'triangle', dur: 0.15, gain: 0.13 * P.mul, stagger: 0.05, f1: [780, 1180], send: 0.18 * P.send });
      A._tone(t + 0.02, { type: 'square', f0: 1400, f1: 1900, dur: 0.06, gain: 0.055 * P.mul });
    },
    back: function (A, t) {
      var P = A.styleParams();
      A._chord(t, [660, 440], { type: 'triangle', dur: 0.18, gain: 0.11 * P.mul, stagger: 0.05, f1: [520, 330], send: 0.12 * P.send });
    },
    hover: function (A, t) {
      var P = A.styleParams();
      A._tone(t, { type: 'sine', f0: 880, f1: 1120, dur: 0.05, gain: 0.045 * P.mul, detune: 25 });
    }
  };

  /* ---------------- 节流 ---------------- */
  var GAPS2 = {
    fire: 0.05, swing: 0.07, hit: 0.045, crit: 0.04, kill: 0.055,
    bossdie: 0, boss: 0, hurt: 0.08, death: 0,
    chest_start: 0.3, chest_open: 0.15, loot: 0.05,
    item_get: 0.1, pickup: 0.04,
    map_enter: 0, descend: 0.5, extract_ready: 0, extract_start: 0.5,
    extract_done: 0, victory: 0, lose: 0, save: 0.3,
    levelup: 0.1, buy: 0.05, reroll: 0.1, abyss: 0, heal: 0.1,
    confirm: 0, select: 0.04, back: 0.05, hover: 0.04
  };
  for (var gk in GAPS2) A._gap[gk] = GAPS2[gk];

  /* ---------------- 变体解析 ---------------- */
  function resolve(name, opts) {
    var v = A.sfxStyle;
    if (opts && opts.v) v = opts.v;
    if (A.sfxOverride[name]) v = A.sfxOverride[name];
    var tier = (opts && opts.tier != null) ? Math.max(0, Math.min(4, opts.tier | 0)) : null;
    if (tier != null && EXTRA2[name + '_t' + tier + '_v' + v]) return name + '_t' + tier + '_v' + v;
    if (tier != null && EXTRA2[name + '_t' + tier]) return name + '_t' + tier;
    if (v !== 1 && EXTRA2[name + '_v' + v]) return name + '_v' + v;
    if (EXTRA2[name]) return name;
    return null;
  }

  /* ---------------- 链式 sfx ---------------- */
  A.sfx = function (name, pan, opts) {
    if (this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) {} }
    var rn = resolve(name, opts);
    if (!rn) { baseSfx(name, pan); return; }
    var gap = (GAPS2[name] != null) ? GAPS2[name] : (this._gap[name] || 0);
    if (gap > 0) {
      var now = this.ctx.currentTime;
      var last = this._last[name] || 0;
      if (now - last < gap) return;
      this._last[name] = now;
    }
    this._curPan = (pan == null) ? 0 : clamp(pan, -1, 1);
    try { EXTRA2[rn](this, this.ctx.currentTime); } catch (e) { /* 单音失败不影响游戏 */ }
  };

  /* ---------------- 出货分级入口 ---------------- */
  G.chestTierOf = function (type) {
    var m = { crate: 0, barrel: 0, chest_wood: 1, chest_iron: 2, chest_gold: 3, chest_abyss: 4, shrine: 1, altar: 2 };
    return (m[type] != null) ? m[type] : 1;
  };

  if (G.Loot) {
    G.Loot.sfx = function (tier) {
      if (!A || A.muted || !A.ctx) return;
      A.sfx('loot', 0, { tier: (tier == null) ? 0 : Math.max(0, Math.min(4, tier | 0)) });
    };
  }

  /* ---------------- 深入下一层音效挂接 ---------------- */
  if (G.game && G.game.descend) {
    var _desc = G.game.descend;
    G.game.descend = function () {
      var r = _desc.apply(this, arguments);
      A.sfx('descend');
      return r;
    };
  }

})();
