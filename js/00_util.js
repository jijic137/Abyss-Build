/* ============================================================
   00_util.js —— 基础工具
   ============================================================ */
'use strict';

var G = window.G || {};
window.G = G;

/* ---------------- 数学 ---------------- */
G.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
G.lerp = function (a, b, t) { return a + (b - a) * t; };
G.dist2 = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
G.dist = function (ax, ay, bx, by) { return Math.sqrt(G.dist2(ax, ay, bx, by)); };
G.angleTo = function (ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); };
G.sign = function (v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); };

/* ---------------- 随机 ---------------- */
G.rand = function (a, b) {
  if (a === undefined) return Math.random();
  if (b === undefined) { b = a; a = 0; }
  return a + Math.random() * (b - a);
};
G.randInt = function (a, b) { return Math.floor(G.rand(a, b + 1)); };
G.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
G.chance = function (p) { return Math.random() < p; };
G.shuffle = function (arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};
/** 带权重随机：weights 为与 items 等长的数值数组 */
G.weightedPick = function (items, weights) {
  var total = 0, i;
  for (i = 0; i < weights.length; i++) total += weights[i];
  var r = Math.random() * total;
  for (i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
};

/* ---------------- 稀有度 ---------------- */
G.RARITY = [
  { id: 0, key: 'common',    name: '普通', color: '#d9dde8', priceMul: 1.0 },
  { id: 1, key: 'uncommon',  name: '优良', color: '#4fd06b', priceMul: 1.9 },
  { id: 2, key: 'rare',      name: '稀有', color: '#46a2ff', priceMul: 3.4 },
  { id: 3, key: 'epic',      name: '史诗', color: '#b45cff', priceMul: 6.0 },
  { id: 4, key: 'legendary', name: '传说', color: '#ff4a4a', priceMul: 10.5 }
];
G.rarityColor = function (r) { return G.RARITY[G.clamp(r, 0, 4)].color; };
G.rarityName = function (r) { return G.RARITY[G.clamp(r, 0, 4)].name; };

/* ---------------- DOM ---------------- */
G.$ = function (id) { return document.getElementById(id); };
G.el = function (tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

/* ---------------- 数值格式 ---------------- */
G.fmt = function (v, dec) {
  dec = dec === undefined ? 0 : dec;
  var s = v.toFixed(dec);
  if (dec > 0) s = s.replace(/\.?0+$/, '');
  return s;
};
G.signed = function (v, dec) {
  return (v >= 0 ? '+' : '') + G.fmt(v, dec);
};

/* ---------------- 计时 ---------------- */
G.now = function () { return performance.now() / 1000; };

/* ---------------- 本地存档（localStorage，无则降级内存） ----------------
   存档内容：
   - settings：音量 / 震屏强度（全局偏好）
   - best*：历史最高分（最高波次 / 最多击杀 / 是否通关）
   - run：进行中战局进度（关卡 + 构筑），可「继续游戏」
   ---------------------------------------------------------------- */
G.Save = (function () {
  var KEY = 'abyss_build_best_v1';
  var mem = null;
  function defaults() {
    return {
      version: 1,
      settings: { volume: 0.22, shake: 0.4, bgm: true, music: 0.5 },   // 与 12_audio / 10_game 默认值对齐
      bestWave: 0, bestKills: 0, lastWin: false,
      run: null
    };
  }
  function num(v, fb) { var n = +v; return isFinite(n) ? n : fb; }
  function load() {
    if (mem) return mem;
    mem = defaults();
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var d = JSON.parse(raw);
          if (d && typeof d === 'object') {
            if (d.settings) {
              mem.settings.volume = num(d.settings.volume, mem.settings.volume);
              mem.settings.shake = num(d.settings.shake, mem.settings.shake);
              mem.settings.bgm = (d.settings.bgm == null) ? true : !!d.settings.bgm;
              mem.settings.music = num(d.settings.music, mem.settings.music);
            }
            mem.bestWave = d.bestWave || 0;
            mem.bestKills = d.bestKills || 0;
            mem.lastWin = !!d.lastWin;
            mem.run = d.run || null;
          }
        }
      }
    } catch (e) { /* 隐私模式 / 无 localStorage：用内存档 */ }
    return mem;
  }
  function persist() {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(mem)); }
    catch (e) { /* 忽略 */ }
  }
  return {
    get: function () { return load(); },
    getSettings: function () { return load().settings; },
    setSettings: function (patch) {
      var d = load();
      if (patch && patch.volume != null) d.settings.volume = num(patch.volume, d.settings.volume);
      if (patch && patch.shake != null) d.settings.shake = num(patch.shake, d.settings.shake);
      if (patch && patch.bgm != null) d.settings.bgm = !!patch.bgm;
      if (patch && patch.music != null) d.settings.music = num(patch.music, d.settings.music);
      persist();
    },
    submit: function (wave, kills, win) {
      var d = load();
      var rec = { newWave: wave > d.bestWave, newKills: kills > d.bestKills };
      if (rec.newWave) d.bestWave = wave;
      if (rec.newKills) d.bestKills = kills;
      d.lastWin = !!win;
      persist();
      return rec;
    },
    saveRun: function (obj) { var d = load(); d.run = obj; persist(); },
    getRun: function () { return load().run; },
    clearRun: function () { var d = load(); d.run = null; persist(); }
  };
})();

