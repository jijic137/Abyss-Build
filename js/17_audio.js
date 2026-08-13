/* ============================================================
   17_audio.js —— 搜打撤新增音效（开箱 / 出货 / 撤离 / 进图）
   ============================================================ */
'use strict';

(function () {

  var EXTRA = {
    map_enter: function (A, t) {
      A._tone(t, { type: 'sawtooth', f0: 130, f1: 70, dur: 0.5, gain: 0.18, send: 0.25, center: true });
      A._noise(t, { dur: 0.3, gain: 0.08, filt: { type: 'lowpass', f0: 500, f1: 200 }, center: true });
    },
    chest_start: function (A, t) {
      A._noise(t, { dur: 0.16, gain: 0.12, filt: { type: 'lowpass', f0: 900, f1: 300 }, send: 0.1 });
      A._tone(t, { type: 'triangle', f0: 220, f1: 180, dur: 0.18, gain: 0.08 });
    },
    chest_open: function (A, t) {
      /* 开盖闷响 + 清脆上扬 */
      A._noise(t, { dur: 0.12, gain: 0.22, filt: { type: 'lowpass', f0: 700, f1: 250 }, send: 0.14 });
      A._tone(t, { type: 'square', f0: 260, f1: 120, dur: 0.1, gain: 0.14 });
      A._tone(t + 0.1, { type: 'triangle', f0: 700, f1: 1150, dur: 0.14, gain: 0.14, send: 0.18 });
      A._tone(t + 0.2, { type: 'triangle', f0: 1050, f1: 1500, dur: 0.16, gain: 0.12, send: 0.2 });
    },
    item_get: function (A, t) {
      A._tone(t, { type: 'triangle', f0: 900, f1: 1200, dur: 0.09, gain: 0.16, send: 0.1 });
      A._tone(t + 0.07, { type: 'triangle', f0: 1200, f1: 1600, dur: 0.12, gain: 0.14, send: 0.15 });
      A._noise(t + 0.05, { dur: 0.06, gain: 0.05, filt: { type: 'highpass', f0: 3000 } });
    },
    extract_ready: function (A, t) {
      A._chord(t, [523, 659, 784, 1047], { type: 'triangle', dur: 0.22, gain: 0.16, stagger: 0.07, send: 0.28, center: true });
      A._tone(t + 0.24, { type: 'sine', f0: 1047, f1: 1319, dur: 0.3, gain: 0.1, send: 0.2, center: true });
    },
    extract_start: function (A, t) {
      A._tone(t, { type: 'sine', f0: 330, f1: 440, dur: 0.35, gain: 0.1, send: 0.15, center: true, lfo: { rate: 6, depth: 12, target: 'freq' } });
    },
    extract_done: function (A, t) {
      A._chord(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.38, gain: 0.2, stagger: 0.1, send: 0.35, center: true });
      A._tone(t + 0.3, { type: 'sine', f0: 660, f1: 880, dur: 0.7, gain: 0.12, send: 0.3, center: true });
      A._noise(t, { dur: 0.5, gain: 0.1, filt: { type: 'lowpass', f0: 900, f1: 200 }, send: 0.25, center: true });
    },
    reroll: function (A, t) {
      A._noise(t, { dur: 0.25, gain: 0.09, filt: { type: 'bandpass', f0: 800, f1: 2400, q: 1.4 }, send: 0.1 });
      A._tone(t + 0.12, { type: 'square', f0: 500, f1: 950, dur: 0.12, gain: 0.08 });
    },
    lose: function (A, t) {
      A._chord(t, [330, 262, 196], { type: 'sawtooth', dur: 0.6, gain: 0.13, stagger: 0.12, f1: [262, 196, 147], send: 0.25, center: true });
    }
  };

  var GAPS = { item_get: 0.12, chest_open: 0, extract_start: 0.5, map_enter: 0 };
  var _last = {};
  var baseSfx = G.Audio.sfx.bind(G.Audio);

  G.Audio.sfx = function (name, pan) {
    var fn = EXTRA[name];
    if (!fn) { baseSfx(name, pan); return; }
    if (this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) {} }
    var gap = GAPS[name] || 0;
    var now = this.ctx.currentTime;
    var last = _last[name] || 0;
    if (gap > 0 && now - last < gap) return;
    _last[name] = now;
    this._curPan = (pan == null) ? 0 : G.clamp(pan, -1, 1);
    try { fn(this, now); } catch (e) {}
  };

})();
