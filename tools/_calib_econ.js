/* 无头模拟：对比「旧波次配置」与「新波次配置」的每波潜在材料，
   计算使总经济≈旧水平的全局掉落系数 G.MAT_MUL。
   用法：node _calib_econ.js
*/
'use strict';
const fs = require('fs');
const vm = require('vm');

/* ---------- 最小沙箱（仅需纯数据，不触 DOM） ---------- */
const sandbox = {
  window: {}, document: { getElementById(){}, createElement(){ return {}; }, addEventListener(){} },
  performance: { now: () => Date.now() }, console,
  Math, JSON, Date, Array, Object, isFinite, parseInt, parseFloat
};
sandbox.window.G = {};
sandbox.global = sandbox;
vm.createContext(sandbox);
try {
  for (const f of ['00_util', '02_stats', '05_enemies']) {
    vm.runInContext(fs.readFileSync(`js/${f}.js`, 'utf8'), sandbox, { filename: `js/${f}.js` });
  }
} catch (e) { console.error('LOAD ERROR', e); process.exit(2); }
const G = sandbox.window.G;

/* ---------- 旧配置（校准基准，取自改动前 05_enemies.js） ---------- */
const OLD_W = [
  { dur: 20, rate: 1.55, pool: [['worm', 9], ['bat', 6], ['slime', 4], ['mite', 4]], elites: [] },
  { dur: 22, rate: 2.00, pool: [['worm', 8], ['bat', 7], ['slime', 6], ['skeleton', 4], ['mite', 4]], elites: [] },
  { dur: 24, rate: 2.40, pool: [['worm', 7], ['bat', 7], ['slime', 6], ['skeleton', 6], ['spider', 3], ['mite', 5]], elites: [] },
  { dur: 26, rate: 2.85, pool: [['worm', 6], ['bat', 6], ['slime', 6], ['skeleton', 6], ['spider', 5], ['mite', 5]], elites: [] },
  { dur: 30, rate: 3.00, pool: [['bat', 6], ['slime', 6], ['skeleton', 7], ['spider', 5]], elites: [['el_butcher', 0.42]] },
  { dur: 30, rate: 3.40, pool: [['skeleton', 7], ['spider', 6], ['beetle', 5], ['eye', 4], ['swarmling', 6], ['void_horror', 4], ['ogre', 3], ['crystal', 3]], elites: [] },
  { dur: 32, rate: 3.85, pool: [['skeleton', 6], ['spider', 6], ['beetle', 6], ['eye', 5], ['wraith', 4], ['hex_archer', 4], ['gargoyle', 4], ['crystal', 4], ['mite', 4]], elites: [] },
  { dur: 34, rate: 4.30, pool: [['spider', 6], ['beetle', 6], ['eye', 5], ['wraith', 5], ['bomber', 4], ['gargoyle', 5], ['mimic', 3], ['ogre', 3], ['crystal', 3]], elites: [] },
  { dur: 36, rate: 4.70, pool: [['beetle', 6], ['eye', 5], ['wraith', 5], ['bomber', 5], ['warlock', 4]], elites: [['el_hexer', 0.35], ['el_ironclad', 0.70]] },
  { dur: 62, rate: 1.60, pool: [['worm', 6], ['bat', 5], ['skeleton', 4]], elites: [], boss: 'boss_behemoth' },
  { dur: 38, rate: 5.10, pool: [['skeleton', 5], ['beetle', 6], ['wraith', 5], ['bomber', 5], ['warlock', 5], ['stone', 3], ['mimic', 4], ['glutton', 4], ['gargoyle', 4], ['ogre', 4], ['crystal', 4]], elites: [] },
  { dur: 40, rate: 5.50, pool: [['beetle', 6], ['wraith', 5], ['bomber', 5], ['warlock', 5], ['stone', 4], ['charger', 3], ['void_horror', 5], ['hex_archer', 5], ['ogre', 3], ['crystal', 3]], elites: [] },
  { dur: 42, rate: 5.95, pool: [['spider', 5], ['bomber', 6], ['warlock', 5], ['stone', 5], ['charger', 4], ['eye', 4], ['ogre', 3], ['crystal', 3]], elites: [] },
  { dur: 44, rate: 6.40, pool: [['beetle', 5], ['wraith', 6], ['bomber', 5], ['warlock', 6], ['stone', 5], ['charger', 5]], elites: [['el_brood', 0.40], ['el_warden', 0.58], ['el_reaper', 0.72]] },
  { dur: 45, rate: 6.10, pool: [['skeleton', 4], ['wraith', 6], ['bomber', 6], ['warlock', 6], ['stone', 5], ['charger', 5], ['glutton', 5], ['void_horror', 5], ['ogre', 4], ['crystal', 4]], elites: [['el_ironclad', 0.30], ['el_warden', 0.46], ['el_butcher', 0.62]] },
  { dur: 46, rate: 6.55, pool: [['beetle', 5], ['wraith', 6], ['bomber', 6], ['warlock', 6], ['stone', 6], ['charger', 6], ['spider', 5], ['hex_archer', 5], ['ogre', 4], ['crystal', 4]], elites: [] },
  { dur: 48, rate: 6.90, pool: [['wraith', 6], ['bomber', 7], ['warlock', 6], ['stone', 6], ['charger', 6], ['eye', 5], ['ogre', 4], ['crystal', 4]], elites: [['el_hexer', 0.34], ['el_brood', 0.66], ['el_warden', 0.74], ['el_reaper', 0.80]] },
  { dur: 50, rate: 7.40, pool: [['beetle', 6], ['wraith', 6], ['bomber', 7], ['warlock', 7], ['stone', 7], ['charger', 7], ['ogre', 4], ['crystal', 4]], elites: [] },
  { dur: 52, rate: 7.95, pool: [['wraith', 7], ['bomber', 7], ['warlock', 7], ['stone', 7], ['charger', 8], ['spider', 6], ['ogre', 5], ['crystal', 5]], elites: [['el_ironclad', 0.25], ['el_butcher', 0.50], ['el_warden', 0.62], ['el_hexer', 0.75], ['el_reaper', 0.88]] },
  { dur: 95, rate: 2.30, pool: [['wraith', 6], ['bomber', 5], ['skeleton', 5], ['spider', 5]], elites: [], boss: 'boss_abyss' }
];

/* 复刻 10_game.js 的刷怪预算循环，记录每波「若清场」的普通怪 e.mat 列表
   与精英/BOSS 材料；dropRate 取 0（与真实 dropLoot 的 floor 行为一致）。 */
function simWave(cfg, wave) {
  const matScale = G.waveScale(wave).mat;
  let budget = 0;
  const regMats = [];
  let eb = 0;
  const dt = 1 / 30;
  let t = 0;
  (cfg.elites || []).forEach(e => { eb += Math.round(G.ENEMY_MAP[e[0]].mat * matScale); });
  if (cfg.boss) eb += Math.round(G.ENEMY_MAP[cfg.boss].mat * matScale);
  while (t < cfg.dur) {
    budget += cfg.rate * dt;
    let guard = 0;
    while (budget > 0 && guard++ < 12) {
      const id = G.rollEnemy(wave);
      const def = G.ENEMY_MAP[id];
      if (budget < def.danger) break;
      budget -= def.danger;
      if (def.elite || def.boss) eb += Math.round(def.mat * matScale);
      else regMats.push(Math.round(def.mat * matScale));
    }
    t += dt;
  }
  return { regMats, eb };
}

// 真实 dropLoot（10_game.js）为概率化掉落：每杀普通怪的【期望值】= e.mat × m，
// 用「整数必掉 + 小数按概率补 1 材料包」实现，故不加每杀硬下限（否则经济压不下去）。
// 精英/BOSS 不缩放，作为里程碑奖励。
function waveTotal(sim, m) {
  let s = sim.eb;
  for (const em of sim.regMats) s += em * m;
  return s;
}

const old = OLD_W.map((cfg, i) => simWave(cfg, i + 1));
const neu = G.WAVES.map((cfg, i) => simWave(cfg, i + 1));
const oldTot = old.reduce((s, w) => s + waveTotal(w, 1), 0);

// 二分搜索使「新配置经过 MAT_MUL 后总材料 ≈ 旧配置」
let lo = 0.01, hi = 1.0;
for (let k = 0; k < 48; k++) {
  const mid = (lo + hi) / 2;
  const tot = neu.reduce((s, w) => s + waveTotal(w, mid), 0);
  // tot 随 m 单调递增：tot>目标 ⇒ m 偏大 ⇒ 收上限；否则收下限
  if (tot > oldTot) hi = mid; else lo = mid;
}
const MAT_MUL = (lo + hi) / 2;

console.log('方案（期望值模型，匹配真实概率化 dropLoot）：普通怪 ×MAT_MUL，精英/BOSS 不缩放');
console.log('波次 |   旧材料 |  新材料 | ×MAT_MUL后 | 偏差%');
console.log('-----+---------+---------+------------+------');
let maxDev = 0;
for (let i = 0; i < 20; i++) {
  const adj = waveTotal(neu[i], MAT_MUL);
  const devPct = (adj - waveTotal(old[i], 1)) / waveTotal(old[i], 1) * 100;
  maxDev = Math.max(maxDev, Math.abs(devPct));
  console.log(
    `  ${String(i + 1).padStart(2)} | ${String(waveTotal(old[i], 1)).padStart(6)} | ${String(waveTotal(neu[i], 1)).padStart(6)} | ${String(Math.round(adj)).padStart(9)} | ${devPct >= 0 ? '+' : ''}${devPct.toFixed(0)}%`
  );
}
const newAdj = neu.reduce((s, w) => s + waveTotal(w, MAT_MUL), 0);
console.log('-----+---------+---------+------------+------');
console.log(`合计  旧=${Math.round(oldTot)}  校准后=${Math.round(newAdj)}  MAT_MUL=${MAT_MUL.toFixed(4)}`);
console.log(`单波最大偏差 ≈ ${maxDev.toFixed(0)}%`);
console.log(`建议写入 js/05_enemies.js：G.MAT_MUL = ${MAT_MUL.toFixed(3)};`);


