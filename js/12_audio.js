/* ============================================================
   12_audio.js —— WebAudio 程序化音效（高质量合成版）
   - 零外部文件、零依赖，全部用振荡器/噪声实时合成
   - 特性：随机音高微调、ADSR 包络、FM 合成、滤波噪声扫频、
           立体声定位、卷积混响、波形整形失真、LFO 调制、
           程序化芯片音乐 BGM、连续长音（boss 光环）
   - AudioContext 不可用时（无头测试 / file:// 双击）自动降级为静默 no-op
   - 浏览器自动播放策略：在首次用户手势（开始按钮）里调用 unlock()
   ============================================================ */
(function () {
  var G = window.G || (window.G = {});

  var ACtor = (typeof window !== 'undefined')
    ? (window.AudioContext || window.webkitAudioContext)
    : null;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function AudioSys() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.reverb = null;
    this.reverbGain = null;
    this.volume = 0.22;        // 总音量（设置滑块控制）
    this.musicVolume = 0.5;    // BGM 相对音量
    this.muted = false;
    this._last = {};
    this._curPan = 0;
    this._bgmEnabled = true;   // 设置项：是否播放 BGM（受存档控制）
    this._musicOn = false;
    this._musicTimer = null;
    this._bpm = 104;
    // 每个音效的全局最小间隔（秒），避免同一帧大量命中时吵成一片
    this._gap = {
      fire: 0.09, swing: 0.10, hit: 0.06, crit: 0.05, kill: 0.05,
      pickup: 0.06, heal: 0, wave: 0, boss: 0, levelup: 0,
      buy: 0, hurt: 0, death: 0, victory: 0, bossdie: 0
    };
  }

  AudioSys.prototype.init = function () {
    if (!ACtor || this.ctx) return;
    try {
      this.ctx = new ACtor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 1;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicVolume;
      this.musicBus.connect(this.master);
      // 卷积混响（程序化生成脉冲响应）
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this._makeIR(1.6, 3.0);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.22;
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.master);
    } catch (e) { this.ctx = null; }
  };

  // 由用户手势触发（开始游戏点击）——解锁/恢复 AudioContext
  AudioSys.prototype.unlock = function () {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (e) {}
    }
  };

  AudioSys.prototype.setVolume = function (v) {
    this.volume = clamp(v, 0, 1);
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  };

  AudioSys.prototype.setMusicVolume = function (v) {
    this.musicVolume = clamp(v, 0, 1);
    if (this.musicBus) this.musicBus.gain.value = this.musicVolume;
  };

  // 按设置项启停 BGM：
  // - 标题界面 ctx 可能尚未解锁（未触发用户手势），此时仅记录标志，开局时再启动
  // - 对局内 ctx 已存在，可直接 start/stop
  AudioSys.prototype.setBgm = function (on) {
    this._bgmEnabled = !!on;
    if (!this.ctx) return;
    if (this._bgmEnabled) this.startMusic();
    else this.stopMusic();
  };

  AudioSys.prototype.toggleMute = function () {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
    return this.muted;
  };

  /* —— 内部合成原语 —— */

  // 程序化混响脉冲响应（指数衰减噪声）
  AudioSys.prototype._makeIR = function (seconds, decay) {
    var rate = this.ctx.sampleRate, len = Math.max(1, Math.floor(rate * seconds));
    var buf = this.ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  };

  // 波形整形（失真），用于爆炸/受伤的颗粒感
  AudioSys.prototype._distortion = function (amount) {
    var n = 1024, curve = new Float32Array(n), k = amount;
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1;
      curve[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x));
    }
    var ws = this.ctx.createWaveShaper();
    ws.curve = curve; ws.oversample = '2x';
    return ws;
  };

  // 路由：node -> [声像] -> [混响发送] -> dest
  AudioSys.prototype._route = function (node, opt) {
    var ctx = this.ctx;
    var pan = (opt.dest === this.musicBus) ? 0
            : (opt.pan != null ? opt.pan : (opt.center ? 0 : (this._curPan || 0)));
    var out = node;
    if (pan && ctx.createStereoPanner) {
      var p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      node.connect(p); out = p;
    }
    out.connect(opt.dest || this.sfxBus);
    if (opt.send && this.reverb) {
      var sg = ctx.createGain();
      sg.gain.value = opt.send;
      out.connect(sg); sg.connect(this.reverb);
    }
  };

  // 单振荡器音（支持 ADSR / FM / 失真 / LFO / 声像 / 混响发送）
  AudioSys.prototype._tone = function (t, opt) {
    var ctx = this.ctx;
    var dur = opt.dur || 0.12;
    var o = ctx.createOscillator();
    o.type = opt.type || 'square';
    var f0 = Math.max(1, opt.f0), f1 = (opt.f1 == null) ? f0 : Math.max(1, opt.f1);
    // 随机音高微调，消除机械重复感
    var det = opt.detune ? (Math.random() * 2 - 1) * opt.detune : 0;
    o.detune.setValueAtTime(det, t);
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);

    // FM 合成（调制器 -> 载波频率）
    if (opt.fm) {
      var mod = ctx.createOscillator();
      mod.type = opt.fm.type || 'sine';
      var mr = opt.fm.ratio || 1;
      mod.frequency.setValueAtTime(Math.max(1, f0 * mr), t);
      if (f1 !== f0) mod.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * mr), t + dur);
      var mg = ctx.createGain();
      mg.gain.setValueAtTime(opt.fm.idx || 80, t);
      if (opt.fm.decay) mg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      mod.connect(mg); mg.connect(o.frequency);
      mod.start(t); mod.stop(t + dur + 0.05);
    }

    // ADSR 包络
    var g = ctx.createGain();
    var peak = Math.max(0.0002, opt.gain == null ? 0.3 : opt.gain);
    var atk = opt.atk == null ? 0.005 : opt.atk;
    var sus = opt.sus == null ? 0 : opt.sus;
    var rel = opt.rel == null ? 0.04 : opt.rel;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + atk);
    if (sus > 0 && dur > atk + rel) {
      g.gain.linearRampToValueAtTime(Math.max(0.0002, peak * sus), t + atk + (dur - atk - rel));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    var last = o;
    if (opt.distort) { var ws = this._distortion(opt.distort); o.connect(ws); last = ws; }
    last.connect(g);

    // LFO（颤音 / 抖动）
    if (opt.lfo) {
      var lfo = ctx.createOscillator();
      lfo.frequency.value = opt.lfo.rate || 6;
      var lg = ctx.createGain(); lg.gain.value = opt.lfo.depth || 0;
      lfo.connect(lg);
      if (opt.lfo.target === 'gain') lg.connect(g.gain); else lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }

    this._route(g, opt);
    o.start(t); o.stop(t + dur + 0.06);
  };

  // 噪声（支持滤波类型 / 扫频 / 声像 / 混响发送）
  AudioSys.prototype._noise = function (t, opt) {
    var ctx = this.ctx;
    var dur = opt.dur || 0.1;
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var data = buf.getChannelData(0);
    var decay = (opt.decay == null) ? 1 : opt.decay;
    for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var g = ctx.createGain();
    g.gain.setValueAtTime(opt.gain == null ? 0.2 : opt.gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var last = src;
    if (opt.filt) {
      var f = ctx.createBiquadFilter();
      f.type = opt.filt.type || 'lowpass';
      f.frequency.setValueAtTime(Math.max(1, opt.filt.f0 || 1000), t);
      if (opt.filt.f1 != null) f.frequency.exponentialRampToValueAtTime(Math.max(1, opt.filt.f1), t + dur);
      if (opt.filt.q != null) f.Q.value = opt.filt.q;
      src.connect(f); last = f;
    }
    last.connect(g);
    this._route(g, opt);
    src.start(t); src.stop(t + dur + 0.03);
  };

  AudioSys.prototype._chord = function (t, freqs, opt) {
    for (var i = 0; i < freqs.length; i++) {
      this._tone(t + (opt.stagger ? i * opt.stagger : 0), {
        type: opt.type || 'triangle',
        f0: freqs[i],
        f1: (opt.f1 ? opt.f1[i] : freqs[i]),
        dur: opt.dur, gain: opt.gain == null ? 0.2 : opt.gain,
        atk: opt.atk, sus: opt.sus, rel: opt.rel, detune: opt.detune,
        pan: opt.pan, send: opt.send, distort: opt.distort,
        lfo: opt.lfo, dest: opt.dest, center: opt.center
      });
    }
  };

  /* —— 各音效定义（高质量合成） —— */
  var SOUNDS = {
    // 远程开火：方波下滑 + FM 金属感 + 高通噪声
    fire: function (A, t) {
      A._tone(t, { type: 'square', f0: 900, f1: 340, dur: 0.07, gain: 0.12, detune: 50,
        fm: { ratio: 1.5, idx: 60, decay: true }, send: 0.05 });
      A._noise(t, { dur: 0.05, gain: 0.06, filt: { type: 'highpass', f0: 1400 } });
    },
    // 近战挥击：带通噪声扫频（呼啸感）
    swing: function (A, t) {
      A._noise(t, { dur: 0.11, gain: 0.10, filt: { type: 'bandpass', f0: 500, f1: 1700, q: 1.2 } });
      A._tone(t, { type: 'triangle', f0: 480, f1: 220, dur: 0.09, gain: 0.06 });
    },
    // 命中：低通噪声 + 方波闷击
    hit: function (A, t) {
      A._noise(t, { dur: 0.05, gain: 0.10, filt: { type: 'lowpass', f0: 900, f1: 400 }, send: 0.05 });
      A._tone(t, { type: 'square', f0: 300, f1: 160, dur: 0.05, gain: 0.07, detune: 30 });
    },
    // 暴击：FM 双声上扬 + 高通噪声火花
    crit: function (A, t) {
      A._tone(t, { type: 'square', f0: 1300, f1: 1750, dur: 0.07, gain: 0.13, detune: 40,
        fm: { ratio: 2, idx: 120, decay: true } });
      A._tone(t + 0.04, { type: 'square', f0: 1750, f1: 2150, dur: 0.07, gain: 0.10, detune: 40 });
      A._noise(t, { dur: 0.06, gain: 0.06, filt: { type: 'highpass', f0: 2000 } });
    },
    // 击杀：噪声爆 + 锯齿下滑 + 失真
    kill: function (A, t) {
      A._noise(t, { dur: 0.10, gain: 0.12, filt: { type: 'lowpass', f0: 700, f1: 200 }, send: 0.12, distort: 8 });
      A._tone(t, { type: 'sawtooth', f0: 200, f1: 80, dur: 0.09, gain: 0.10, distort: 6 });
    },
    // BOSS 死亡：长低频轰鸣 + 失真 + 混响（居中）
    bossdie: function (A, t) {
      A._noise(t, { dur: 0.8, gain: 0.32, filt: { type: 'lowpass', f0: 800, f1: 120 }, send: 0.35, distort: 14, center: true });
      A._tone(t, { type: 'sawtooth', f0: 180, f1: 38, dur: 0.75, gain: 0.22, distort: 10, center: true });
      A._tone(t + 0.05, { type: 'square', f0: 300, f1: 55, dur: 0.55, gain: 0.12, center: true });
      A._tone(t + 0.2, { type: 'sine', f0: 90, f1: 30, dur: 0.6, gain: 0.18, center: true, send: 0.2 });
    },
    // 拾取材料：清脆上扬
    pickup: function (A, t) {
      A._tone(t, { type: 'triangle', f0: 1200, f1: 1750, dur: 0.08, gain: 0.12, send: 0.08 });
    },
    // 拾取治疗：柔和双音 + 混响
    heal: function (A, t) {
      A._chord(t, [600, 900], { type: 'sine', dur: 0.2, gain: 0.13, stagger: 0.06, f1: [760, 1100], send: 0.22 });
    },
    // 波次开始：庄重两音（居中）
    wave: function (A, t) {
      A._chord(t, [440, 660], { type: 'triangle', dur: 0.22, gain: 0.16, stagger: 0.10, send: 0.18, center: true });
    },
    // BOSS 登场：低沉压迫 + LFO 抖动（居中）
    boss: function (A, t) {
      A._tone(t, { type: 'sawtooth', f0: 160, f1: 68, dur: 0.6, gain: 0.24, send: 0.25, center: true, lfo: { rate: 5, depth: 18, target: 'freq' } });
      A._noise(t, { dur: 0.35, gain: 0.11, filt: { type: 'lowpass', f0: 400 }, center: true });
    },
    // 升级：上行琶音
    levelup: function (A, t) {
      A._chord(t, [523, 659, 784], { type: 'triangle', dur: 0.16, gain: 0.16, stagger: 0.07, send: 0.2 });
    },
    // 购买：清脆双声
    buy: function (A, t) {
      A._tone(t, { type: 'square', f0: 900, f1: 1300, dur: 0.07, gain: 0.15 });
      A._tone(t + 0.06, { type: 'square', f0: 1300, f1: 1700, dur: 0.08, gain: 0.13 });
    },
    // 受伤：噪声 + 锯齿下滑 + 失真
    hurt: function (A, t) {
      A._noise(t, { dur: 0.14, gain: 0.26, filt: { type: 'lowpass', f0: 320 } });
      A._tone(t, { type: 'sawtooth', f0: 220, f1: 110, dur: 0.13, gain: 0.16, distort: 5 });
    },
    // 玩家死亡：长下滑 + 失真 + 混响（居中）
    death: function (A, t) {
      A._tone(t, { type: 'sawtooth', f0: 420, f1: 55, dur: 0.9, gain: 0.28, distort: 8, send: 0.25, center: true });
      A._noise(t + 0.1, { dur: 0.4, gain: 0.16, filt: { type: 'lowpass', f0: 300 }, center: true });
    },
    // 胜利：大调上行琶音 + 混响（居中）
    victory: function (A, t) {
      A._chord(t, [523, 659, 784, 1047], { type: 'triangle', dur: 0.32, gain: 0.18, stagger: 0.12, send: 0.3, center: true });
    }
  };

  AudioSys.prototype.sfx = function (name, pan) {
    if (this.muted) return;
    if (!this.ctx) return;            // 未初始化 / 降级环境：静默
    if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) {} }
    var gap = this._gap[name] || 0;
    if (gap > 0) {
      var now = this.ctx.currentTime;
      var last = this._last[name] || 0;
      if (now - last < gap) return;
      this._last[name] = now;
    }
    var fn = SOUNDS[name];
    if (!fn) return;
    this._curPan = (pan == null) ? 0 : clamp(pan, -1, 1);
    try { fn(this, this.ctx.currentTime); } catch (e) { /* 单音失败不影响游戏 */ }
  };

  /* —— 程序化芯片音乐 BGM —— */
  AudioSys.prototype._initMusicPattern = function () {
    // 小调 16 步循环：琶音 + 贝斯 + 反拍踩镲
    this._arp = [0, 7, 12, 7, 3, 10, 15, 10, 0, 7, 12, 7, 5, 12, 17, 12];
    this._bass = [0, 0, -5, -5, 3, 3, -2, -2, 0, 0, -5, -5, 5, 5, -2, -2];
    this._root = 220; // A3
  };

  AudioSys.prototype.startMusic = function () {
    if (!this.ctx || this._musicOn) return;
    this._initMusicPattern();
    this._musicOn = true;
    this._step = 0;
    this._nextNoteTime = this.ctx.currentTime + 0.08;
    var self = this;
    this._musicTimer = setInterval(function () { self._scheduler(); }, 25);
  };

  AudioSys.prototype.stopMusic = function () {
    this._musicOn = false;
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
  };

  AudioSys.prototype._scheduler = function () {
    if (!this._musicOn || !this.ctx) return;
    var secPerStep = 60 / this._bpm / 4; // 16 分音符
    while (this._nextNoteTime < this.ctx.currentTime + 0.12) {
      this._playStep(this._step, this._nextNoteTime);
      this._nextNoteTime += secPerStep;
      this._step = (this._step + 1) % 16;
    }
  };

  AudioSys.prototype._playStep = function (step, t) {
    var root = this._root;
    // 琶音（每步）
    var freq = root * Math.pow(2, this._arp[step] / 12);
    this._tone(t, { type: 'square', f0: freq, f1: freq, dur: 0.16, gain: 0.05, atk: 0.005, dest: this.musicBus, send: 0.12, detune: 8 });
    // 贝斯（每 4 步）
    if (step % 4 === 0) {
      var bf = (root / 2) * Math.pow(2, this._bass[step] / 12);
      this._tone(t, { type: 'sawtooth', f0: bf, f1: bf, dur: 0.45, gain: 0.10, atk: 0.01, dest: this.musicBus, send: 0.08 });
    }
    // 反拍踩镲
    if (step % 2 === 1) {
      this._noise(t, { dur: 0.03, gain: 0.025, filt: { type: 'highpass', f0: 7000 }, dest: this.musicBus });
    }
    // 主音点缀（每 8 步）
    if (step % 8 === 4) {
      var lf = root * 2 * Math.pow(2, this._arp[step] / 12);
      this._tone(t, { type: 'triangle', f0: lf, dur: 0.3, gain: 0.045, dest: this.musicBus, send: 0.2 });
    }
  };

  G.Audio = new AudioSys();
})();
