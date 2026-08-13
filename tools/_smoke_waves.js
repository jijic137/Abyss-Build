/* 无浏览器环境下驱动搜打撤核心循环：
   - 地图生成（5 档位连通性 / 出生≠撤离 / 容器）
   - 进图 → 开箱 → 撤离成功（物品入库、货币结算、档位解锁）
   - 死亡路径（全丢）
   - 存档 / 读档
   - 上锁房门 / 深渊钥匙
   脚本列表从 index.html 解析，与页面永远同步。
   日志写入 _smoke3.log，错误数=0 即通过。
   用法：node tools/_smoke_waves.js
*/
'use strict';
const fs = require('fs');
const vm = require('vm');
const LOG = '_smoke3.log';
fs.writeFileSync(LOG, '');
function log(m) { fs.appendFileSync(LOG, m + '\n'); }

/* ---------- DOM / Canvas 桩 ---------- */
function classList() {
  const s = {};
  return {
    add(c){ s[c]=1; }, remove(c){ delete s[c]; },
    toggle(c,f){ if(f===undefined) f=!s[c]; if(f) s[c]=1; else delete s[c]; return !!f; },
    contains(c){ return !!s[c]; }
  };
}
function ctxStub() {
  return new Proxy({}, {
    get(t,k){
      if(k==='createImageData'||k==='getImageData') return (w,h)=>({ data:new Uint8ClampedArray(((w|0)*(h|0)||1)*4), width:w, height:h });
      if(k==='createRadialGradient'||k==='createLinearGradient') return ()=>({ addColorStop(){} });
      if(k==='putImageData') return ()=>{};
      if(k in t) return t[k];
      return ()=>{};
    },
    set(t,k,v){ t[k]=v; return true; }
  });
}
function makeEl() {
  const styleStub = new Proxy({}, {
    get(t,k){ if(k==='setProperty') return ()=>{}; return t[k]; },
    set(t,k,v){ t[k]=v; return true; }
  });
  const t = { style: styleStub, dataset:{}, classList: classList(), children:[] };
  return new Proxy(t, {
    get(o,k){
      if(k==='childElementCount') return o.children.length;
      if(k==='textContent') return o._text||'';
      if(k==='appendChild') return n=>{ o.children.push(n); return n; };
      if(k==='removeChild') return n=>{ const i=o.children.indexOf(n); if(i>=0) o.children.splice(i,1); };
      if(['addEventListener','removeEventListener','setAttribute','getAttribute','focus','blur'].includes(k)) return ()=>{};
      if(k==='getContext') return ()=>ctxStub();
      if(k==='getBoundingClientRect') return ()=>({left:0,top:0,width:100,height:100});
      if(k==='querySelector') return ()=>makeEl();
      if(k==='querySelectorAll') return ()=>[];
      if(k==='remove') return ()=>{};
      if(k in o) return o[k];
      return undefined;
    },
    set(o,k,v){ o[k]=v; if(k==='textContent') o._text=v; return true; }
  });
}
const elCache = {};
const docStub = {
  getElementById(id){ return elCache[id] || (elCache[id]=makeEl()); },
  createElement(){ return makeEl(); },
  addEventListener(){},
  readyState:'complete'
};
const mem = {};
const lsStub = {
  getItem(k){ return k in mem ? mem[k] : null; },
  setItem(k,v){ mem[k]=String(v); },
  removeItem(k){ delete mem[k]; }
};

global.window = global;
global.addEventListener = ()=>{};
global.removeEventListener = ()=>{};
global.document = docStub;
global.performance = { now:()=>Date.now() };
global.requestAnimationFrame = ()=>0;
global.localStorage = lsStub;
global.devicePixelRatio = 1;
global.innerWidth = 1280; global.innerHeight = 720;

process.on('uncaughtException', (e) => { log('UNCAUGHT: ' + (e && e.stack || e)); process.exit(3); });
process.on('unhandledRejection', (e) => { log('UNHANDLED: ' + (e && e.stack || e)); });

/* ---------- 从 index.html 解析脚本列表 ---------- */
const html = fs.readFileSync('index.html', 'utf8');
const files = [];
const re = /<script src="js\/([\w]+\.js)"><\/script>/g;
let m;
while ((m = re.exec(html)) !== null) files.push(m[1]);
log('脚本列表：' + files.join(', '));
try {
  for (const f of files) {
    const code = fs.readFileSync(`js/${f}`, 'utf8');
    vm.runInThisContext(code, { filename: `js/${f}` });
  }
} catch (e) { log('LOAD ERROR: ' + (e && e.stack || e)); process.exit(2); }

/* 无头：升级立刻消化，避免递归/浮层卡死 */
let pendingLevelCb = null;
G.UI.renderLevelUp = function (g, opts, cb) { pendingLevelCb = { cb: cb, opts: opts }; };

let ERR = 0;
function guard(label, fn) {
  try { return fn(); }
  catch (e) { ERR++; log('  ✗ 运行时错误 @ ' + label + ': ' + (e && e.stack || e)); }
}
function resetMeta() {
  Object.keys(mem).forEach(k => delete mem[k]);
  const d = G.Meta.get();
  d.currency = 60; d.stash = []; d.stashSize = 30;
  d.loadout = { w1: null, w2: null, armor: null, trinket1: null, trinket2: null, relic: null };
  d.tiers = { 1: true };
  d.stats = { extracts: 0, deaths: 0, itemsExtracted: 0, itemsLost: 0, bestTier: 0, totalEarned: 0, totalSpent: 0, tierCleared: {} };
  G.Meta.flush();
}
function driveFrames(n, dt) {
  dt = dt || 1/30;
  for (let i = 0; i < n; i++) {
    if (G.game.state === 'play') {
      guard('update', () => G.game.update(dt));
      guard('render', () => G.game.render());
      G.game.player.hp = G.game.player.st.maxHp = 1e9;
      if (pendingLevelCb) {
        const pc = pendingLevelCb; pendingLevelCb = null;
        guard('levelUp', () => {
          if (pc.opts && pc.opts.length) pc.cb(pc.opts[0]);
          else { G.game.player.pendingLevels = 0; G.game.openLevelUp(); }
        });
      }
    } else {
      break;
    }
  }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 0. 地图生成验证（5 档位） ---------- */
function verifyMaps() {
  log('===== 地图生成验证 =====');
  for (let tier = 1; tier <= 5; tier++) {
    const m = guard('gen@t' + tier, () => G.Map.generate(tier));
    if (!m) continue;
    guard('mapChecks@t' + tier, () => {
      if (m.spawn.room === m.extractRoom) throw new Error('出生与撤离同房');
      if (!m.containers.length) throw new Error('无容器');
      const W = G.Map.WALL, S = G.Map.SEG;
      const c0 = Math.floor((m.spawn.x - W) / S), r0 = Math.floor((m.spawn.y - W) / S);
      const rc = G.Map.roomRect(c0, r0);
      if (G.Map.solid(m, m.spawn.x, m.spawn.y)) throw new Error('出生点在墙内');
      if (!G.Map.solid(m, (c0 + 1) * S + W / 2, rc.y0 + 10)) throw new Error('墙判定失效');
      const seen = new Set([m.startRoom]);
      const q = [m.startRoom];
      while (q.length) {
        const cur = q.shift();
        const cc = cur % m.cols, cr = Math.floor(cur / m.cols);
        const nbs = [];
        if (cc > 0 && m.doorsH[cc-1][cr]) nbs.push(cur-1);
        if (cc < m.cols-1 && m.doorsH[cc][cr]) nbs.push(cur+1);
        if (cr > 0 && m.doorsV[cc][cr-1]) nbs.push(cur-m.cols);
        if (cr < m.rows-1 && m.doorsV[cc][cr]) nbs.push(cur+m.cols);
        nbs.forEach(nb => { if (!seen.has(nb)) { seen.add(nb); q.push(nb); } });
      }
      if (seen.size !== m.cols * m.rows) throw new Error(`连通性不足 ${seen.size}/${m.cols*m.rows}`);
      log(`  [t${tier}] ${m.cols}x${m.rows} 房间 ${m.rooms.length} 容器 ${m.containers.length} 连通 ✓`);
    });
  }
}

/* ---------- 1. 撤离成功路径 ---------- */
async function runExtractSuccess() {
  log('\n===== 档案A：撤离成功 (alchemist / t1) =====');
  resetMeta();
  guard('init', () => G.game.init());
  const charDef = G.CHAR_BY_ID['alchemist'];
  guard('newRun', () => G.game.newRun(charDef, 1));
  const g = G.game;
  g.player.maxHp = g.player.hp = 1e9;
  driveFrames(20);
  log(`  [开局] 状态=${g.state} 地图=${g.map.tier.name} 装备=${g.player.weapons.length}武+${g.player.items.length}物 背包=${g.bag.length} 锁门=${(g.map.lockedDoors||[]).length}`);
  if (g.player.weapons.length !== 2) throw new Error('应有两把武器（装备栏+职业补给）');
  if (g.player.items.length < 1) throw new Error('应有防具（职业补给）');
  if (!g.map.lockedDoors || !g.map.lockedDoors.length) throw new Error('T1 应有锁门');

  const chest = g.containers.find(c => c.type === 'crate' || c.type === 'chest_wood');
  if (chest) {
    g.player.x = chest.x; g.player.y = chest.y;
    chest.started = true;
    driveFrames(60);
    log(`  [开箱] ${chest.type} opened=${chest.opened} 材料=${g.materials} 背包=${g.bag.length}`);
    if (!chest.opened) throw new Error('箱子未开启');
  }

  g.map.time = 61;
  guard('checkObjective', () => g.checkObjective());
  if (!g.map.extract.active) throw new Error('撤离点未激活');
  g.player.x = g.map.extract.x;
  g.player.y = g.map.extract.y;
  driveFrames(120);
  await sleep(900);
  log(`  [撤离] 状态=${g.state} 提取=${G.Meta.stats().itemsExtracted} 币=${G.Meta.currency()} 仓=${G.Meta.stash().length} t2解锁=${G.Meta.tierUnlocked(2)}`);
  if (g.state !== 'result') throw new Error('未进入结算');
  if (G.Meta.stats().extracts !== 1) throw new Error('撤离统计未记录');
  if (G.Meta.stash().length === 0) throw new Error('仓库未收到物品');
  if (!G.Meta.tierUnlocked(2)) throw new Error('第 2 层未解锁');

  guard('renderBase', () => G.UI.renderBase());
  guard('renderMarket', () => G.UI.renderMarket());
  guard('renderMapSelect', () => G.UI.renderMapSelect());
  log('  [界面] 整备/市场/选图渲染 ✓');
}

/* ---------- 2. 死亡全丢路径 ---------- */
async function runDeath() {
  log('\n===== 档案B：死亡全丢 (knight / t2) =====');
  resetMeta();
  guard('init', () => G.game.init());
  const charDef = G.CHAR_BY_ID['knight'];
  guard('newRun', () => G.game.newRun(charDef, 2));
  const g = G.game;
  g.player.maxHp = g.player.hp = 1e9;
  driveFrames(20);
  const stashBefore = G.Meta.stash().length;
  guard('onPlayerDeath', () => g.onPlayerDeath());
  await sleep(1100);
  log(`  [死亡] 状态=${g.state} 死亡=${G.Meta.stats().deaths} 损失=${G.Meta.stats().itemsLost} 仓=${G.Meta.stash().length}`);
  if (g.state !== 'result') throw new Error('死亡未进入结算');
  if (G.Meta.stash().length !== stashBefore) throw new Error('死亡后仓库不应变化');
  if (G.Meta.stats().itemsLost < 1) throw new Error('损失统计未记录');
}

/* ---------- 3. 存档 / 读档 ---------- */
function runSaveResume() {
  log('\n===== 档案C：存档/读档 (mage / t3) =====');
  resetMeta();
  guard('init', () => G.game.init());
  const charDef = G.CHAR_BY_ID['mage'];
  guard('newRun', () => G.game.newRun(charDef, 3));
  const g = G.game;
  g.player.maxHp = g.player.hp = 1e9;
  driveFrames(15);
  const levelAt = g.player.level;
  const matsAt = g.materials;
  guard('saveRun', () => g.saveRun());
  const snap = G.Save.getRun();
  if (!snap || snap.mode !== 'extract') throw new Error('快照缺失');
  guard('resumeRun', () => g.resumeRun(snap));
  log(`  [读档] 状态=${g.state} 地图=${g.map.tier.name} Lv=${g.player.level} 材料=${g.materials}`);
  if (g.player.level < levelAt) throw new Error('读档等级丢失');
  if (g.materials < matsAt) throw new Error('读档材料丢失');
  G.Save.clearRun();
}

/* ---------- 4. 深图战斗回归（T4 大构筑） ---------- */
async function runKitchenSink() {
  log('\n===== 档案D：T4 构筑回归 (engineer) =====');
  resetMeta();
  guard('init', () => G.game.init());
  const charDef = G.CHAR_BY_ID['engineer'];
  guard('newRun', () => G.game.newRun(charDef, 4));
  const g = G.game, p = g.player;
  p.maxHp = p.hp = 1e9;
  p.maxWeapons = 6;
  ['spark_rod','club','turret','gravity_cannon','pulse_core','orbit_blade'].forEach(id => {
    const w = G.makeWeapon(id, 3); if (w) p.addWeapon(w);
  });
  ['cloth_wrap','iron_plate','blood_charm','storm_brand','frost_sigil','iron_will',
   'soul_reaver','frost_mail','abyssal_blade','glutton_core'].forEach(id => {
    const d = G.ITEM_MAP[id]; if (d) p.addItem(d);
  });
  p.recalc();
  driveFrames(240);
  log(`  [T4] 状态=${g.state} 敌=${g.enemies.length} 杀=${p.stats.kills} 材料=${g.materials} 背包=${g.bag.length} 精英杀=${p.stats.eliteKills}`);
  if (ERR === 0 && g.state !== 'result') {
    g.map.time = 999;
    g.checkObjective();
    if (g.map.extract.active) {
      g.player.x = g.map.extract.x; g.player.y = g.map.extract.y;
      driveFrames(150);
      await sleep(900);
    }
  }
}

/* ---------- 5. 上锁房门 / 深渊钥匙 ---------- */
function runLockedDoors() {
  log('\n===== 档案E：上锁房门 / 钥匙 (ranger / t2) =====');
  resetMeta();
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['ranger'], 2));
  const g = G.game;
  g.player.maxHp = g.player.hp = 1e9;
  if (!g.map.lockedDoors || !g.map.lockedDoors.length) throw new Error('T2 应有锁门');
  const ld = g.map.lockedDoors[0];
  const SEG = G.Map.SEG, W = G.Map.WALL, DOOR = G.Map.DOOR;
  let rc;
  if (ld.dir === 'H') {
    const rr = G.Map.roomRect(ld.c, ld.r);
    const dy = rr.y0 + G.Map.ROOM / 2;
    rc = { x0: (ld.c + 1) * SEG, y0: dy - DOOR / 2, x1: (ld.c + 1) * SEG + W, y1: dy + DOOR / 2 };
  } else {
    const rr = G.Map.roomRect(ld.c, ld.r);
    const dx = rr.x0 + G.Map.ROOM / 2;
    rc = { x0: dx - DOOR / 2, y0: (ld.r + 1) * SEG, x1: dx + DOOR / 2, y1: (ld.r + 1) * SEG + W };
  }
  const cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
  if (!G.Map.solid(g.map, cx, cy)) throw new Error('锁门应为实心');
  g.player.x = cx; g.player.y = cy;
  guard('tryInteract(noKey)', () => g.tryInteract());
  if (g.unlockedDoors[ld.key]) throw new Error('无钥匙不应解锁');
  g.depthKeys = 1;
  guard('tryInteract(key)', () => g.tryInteract());
  if (!g.unlockedDoors[ld.key]) throw new Error('持钥匙未解锁');
  if (G.Map.solid(g.map, cx, cy)) throw new Error('解锁后应可通过');
  log('  [锁门] 上锁→解锁 ✓ 剩余钥匙=' + g.depthKeys);
}

(async function () {
  try {
    verifyMaps();
    await runExtractSuccess();
    await runDeath();
    runSaveResume();
    await runKitchenSink();
    runLockedDoors();
    log(`\n结果：地图✓ 撤离✓ 死亡✓ 读档✓ T4回归✓ 锁门✓ 错误数=${ERR}`);
  } catch (e) {
    log('TOP-LEVEL THROW: ' + (e && e.stack || e));
    ERR++;
  }
  process.exit(ERR ? 1 : 0);
})();
