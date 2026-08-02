/* 单元测试：验证结算成就评定 + 扩展记录（G.Save 新方法）。
   加载全部脚本后，构造一局「通关」与一局「失败的短局」，检查解锁与统计。
   用法：node _test_ach.js
*/
'use strict';
const fs = require('fs');
const vm = require('vm');

function classList() {
  const s = {};
  return {
    add(c) { s[c] = 1; }, remove(c) { delete s[c]; },
    toggle(c, f) { if (f === undefined) f = !s[c]; if (f) s[c] = 1; else delete s[c]; return !!f; },
    contains(c) { return !!s[c]; }
  };
}
function ctxStub() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createImageData' || k === 'getImageData') return (w, h) => ({ data: new Uint8ClampedArray(((w | 0) * (h | 0) || 1) * 4), width: w, height: h });
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k in t) return t[k]; return () => {};
    }, set(t, k, v) { t[k] = v; return true; }
  });
}
function makeEl() {
  const styleStub = new Proxy({}, { get(t, k) { if (k === 'setProperty') return () => {}; return t[k]; }, set(t, k, v) { t[k] = v; return true; } });
  const lis = {};
  const t = { style: styleStub, dataset: {}, classList: classList(), children: [], clientWidth: 1280, clientHeight: 720 };
  return new Proxy(t, {
    get(o, k) {
      if (k === 'childElementCount') return o.children.length;
      if (k === 'textContent') return o._text || '';
      if (k === 'appendChild') return n => { o.children.push(n); return n; };
      if (k === 'removeChild') return n => { const i = o.children.indexOf(n); if (i >= 0) o.children.splice(i, 1); };
      if (k === 'addEventListener') return (type, fn) => { (lis[type] = lis[type] || []).push(fn); };
      if (k === 'fire') return (type, evt) => { (lis[type] || []).slice().forEach(fn => fn(evt || {})); };
      if (k === 'getContext') return () => ctxStub();
      if (k === 'getBoundingClientRect') return () => ({ left: 0, top: 0, width: 100, height: 100 });
      if (['setAttribute', 'getAttribute', 'focus', 'blur'].includes(k)) return () => {};
      if (k in o) return o[k]; return undefined;
    }, set(o, k, v) { o[k] = v; if (k === 'textContent') o._text = v; return true; }
  });
}
const elCache = {};
const body = makeEl();
global.window = global;
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.document = { getElementById(id) { return elCache[id] || (elCache[id] = makeEl()); }, createElement() { return makeEl(); }, addEventListener() {}, readyState: 'complete', body };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};
const mem = {};
global.localStorage = { getItem(k) { return k in mem ? mem[k] : null; }, setItem(k, v) { mem[k] = String(v); }, removeItem(k) { delete mem[k]; } };
global.devicePixelRatio = 1;
global.innerWidth = 1280; global.innerHeight = 720;

let fails = 0;
function ok(name, cond) { console.log((cond ? '  ok  ' : ' FAIL ') + name); if (!cond) fails++; }

try {
  for (const f of ['00_util', '12_audio', '01_pixel', '02_stats', '03_items', '04_weapons', '05_enemies', '06_entities', '07_player', '07b_enemy', '08_shop', '09_ui', '10_game', '11_main'])
    vm.runInThisContext(fs.readFileSync(`js/${f}.js`, 'utf8'), { filename: `js/${f}.js` });
  console.log('LOAD OK\n');

  // ---- 一局「通关」：mage，20 波，全指标拉满 ----
  const gWin = { wave: 20, runTime: 300 };
  const pWin = {
    char: { id: 'mage' }, level: 15, items: [],
    stats: { kills: 150, eliteKills: 6, bossKills: 2, comboMax: 42, dmgDealt: 2000000, matEarned: 600 }
  };
  const newAch = G.UI.evaluateEnd(gWin, pWin, true);
  const got = G.Save.getAch();
  const st = G.Save.getStats();

  console.log('--- 通关局评定 ---');
  ok('解锁 初入深渊 first_dive', !!got.first_dive);
  ok('解锁 半程 halfway', !!got.halfway);
  ok('解锁 深渊征服者 conqueror', !!got.conqueror);
  ok('解锁 百杀 slayer100', !!got.slayer100);
  ok('解锁 精英猎手 elite_hunter', !!got.elite_hunter);
  ok('解锁 屠龙者 boss_slayer', !!got.boss_slayer);
  ok('解锁 连击大师 combo_master', !!got.combo_master);
  ok('解锁 毁灭输出 annihilator', !!got.annihilator);
  ok('解锁 苦行者 ascetic (无物品通关)', !!got.ascetic);
  ok('解锁 速通 speedrun (300s<600s)', !!got.speedrun);
  ok('解锁 暴富 tycoon (mat≥500)', !!got.tycoon);
  ok('记录 总场次=1', st.totalRuns === 1);
  ok('记录 胜场=1', st.wins === 1);
  ok('记录 累计击杀=150', st.totalKills === 150);
  ok('记录 最高连击=42', st.bestCombo === 42);
  ok('记录 最高DPS=6667', st.bestDps === 6667);
  ok('记录 最快通关=300', st.fastestWin === 300);
  ok('记录 已通关职业含 mage', !!st.charsWon.mage);
  ok('evaluateEnd 返回新解锁数组非空', newAch.length > 0);

  // 再次评定同一局：不应重复解锁（unlockAch 幂等）
  const dup = G.UI.evaluateEnd(gWin, pWin, true);
  ok('重复评定不再解锁（幂等）', dup.length === 0);
  ok('总场次累加=2', G.Save.getStats().totalRuns === 2);

  // ---- 一局「失败短局」：wave 5，少量击杀，无成就门槛 ----
  // 注意：成就全局累积，前面通关局已解锁全部；此处断言「本局不新解锁」强成就。
  const gLose = { wave: 5, runTime: 90 };
  const pLose = {
    char: { id: 'knight' }, level: 3, items: [{ id: 'x' }],
    stats: { kills: 12, eliteKills: 0, bossKills: 0, comboMax: 8, dmgDealt: 4000, matEarned: 40 }
  };
  const newLose = G.UI.evaluateEnd(gLose, pLose, false);
  console.log('--- 失败短局评定 ---');
  ok('失败局不新解锁 半程 (wave<10)', newLose.indexOf('halfway') < 0);
  ok('失败局不新解锁 征服者', newLose.indexOf('conqueror') < 0);
  ok('失败局不新解锁 苦行者 (有物品且未通关)', newLose.indexOf('ascetic') < 0);
  ok('失败短局未产生任何新解锁（强成就已在通关局解锁）', newLose.length === 0);
  ok('失败局记录 胜场仍=2（未+1）', G.Save.getStats().wins === 2);

  // ---- 扩展记录持久化（localStorage 落库）----
  const raw = JSON.parse(mem['abyss_build_best_v1']);
  ok('achievements 已写入 localStorage', raw && raw.achievements && raw.achievements.conqueror);
  ok('stats 已写入 localStorage', raw && raw.stats && raw.stats.totalRuns === 3);

  console.log('\n' + (fails === 0 ? 'ALL PASS' : (fails + ' FAILED')));
  process.exit(fails === 0 ? 0 : 1);
} catch (e) {
  console.error('THROW:', e && e.stack || e);
  process.exit(2);
}
