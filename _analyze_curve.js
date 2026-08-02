/* 临时分析：加载真实波次配置，输出每波压力/经济指标，验证难度曲线更平滑 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = 'js/05_enemies.js';
const src = fs.readFileSync(path, 'utf8');

function weightedPick(ids, ws) {
  let s = 0; ws.forEach(w => s += w);
  let r = Math.random() * s;
  for (let i = 0; i < ids.length; i++) { r -= ws[i]; if (r <= 0) return ids[i]; }
  return ids[ids.length - 1];
}
const sandbox = {
  Math, console,
  G: {
    weightedPick,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  },
};
sandbox.document = { createElement: () => ({ getContext: () => ({}) }) };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: path });

const W = sandbox.G.WAVES;
const EM = sandbox.G.ENEMY_MAP;
const S = sandbox.G.waveScale;

console.log('波  时长 敌/秒  总敌数(估)  主敌HP(x)  主敌DMG  材料收入(估)');
for (let i = 0; i < W.length; i++) {
  const cfg = W[i];
  const wave = i + 1;
  const sc = S(wave);
  // 加权平均 danger
  let dsum = 0, wsum = 0;
  cfg.pool.forEach(p => { dsum += EM[p[0]].danger * p[1]; wsum += p[1]; });
  const avgD = dsum / wsum;
  const perSec = cfg.rate / avgD;
  const total = Math.round(cfg.rate * cfg.dur / avgD);
  // 取池中权重最大的敌人作为"主敌"
  let main = cfg.pool[0][0], maxw = -1;
  cfg.pool.forEach(p => { if (p[1] > maxw) { maxw = p[1]; main = p[0]; } });
  const mainHp = Math.round(EM[main].hp * sc.hp);
  const mainDmg = (EM[main].dmg * sc.dmg).toFixed(1);
  // 材料收入估计：每个敌平均 mat * sc.mat，乘敌数
  let msum = 0;
  cfg.pool.forEach(p => { msum += EM[p[0]].mat * p[1]; });
  const avgMat = msum / wsum;
  const income = Math.round(avgMat * sc.mat * total);
  const boss = cfg.boss ? ' [BOSS]' : (cfg.elites ? ' [精英]' : '');
  console.log(
    String(wave).padStart(2) + '  ' +
    String(cfg.dur).padStart(4) + ' ' +
    perSec.toFixed(2).padStart(6) + ' ' +
    String(total).padStart(10) + '  ' +
    String(mainHp).padStart(7) + '   ' +
    String(mainDmg).padStart(7) + '  ' +
    String(income).padStart(10) + boss
  );
}
