/* 无浏览器环境下驱动搜打撤核心循环：
   - 地图生成（5 档位连通性 / 出生≠撤离 / 容器）
   - 进图 → 开箱 → 撤离成功（物品入库、货币结算、档位解锁）
   - 死亡路径（全丢）/ 存档读档 / 锁门钥匙 / 事件房间
   - 属性碎片（替代等级）/ 深渊词缀 / 传送门
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
      if(k==='measureText') return ()=>({ width: 40 });
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
  readyState:'complete',
  body: makeEl()
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

/* 无头：升级立刻消化 */
let pendingLevelCb = null;
let levelTriggered = false;
G.UI.renderLevelUp = function (g, opts, cb) { levelTriggered = true; pendingLevelCb = { cb: cb, opts: opts }; };

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
    } else if (G.game.state === 'level') {
      if (pendingLevelCb) {
        const pc = pendingLevelCb; pendingLevelCb = null;
        guard('levelUpLv', () => {
          if (pc.opts && pc.opts.length) pc.cb(pc.opts[0]);
          else { G.game.player.pendingLevels = 0; G.game.openLevelUp(); }
        });
      } else break;
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
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['alchemist'], 1));
  const g = G.game;
  g.player.maxHp = g.player.hp = 1e9;
  driveFrames(20);
  log(`  [开局] 状态=${g.state} 地图=${g.map.tier.name} 装备=${g.player.weapons.length}武+${g.player.items.length}物 背包=${g.bag.length} 词缀=${(g.mapMods||[]).map(x=>x.id).join(',')}`);
  if (g.player.weapons.length !== 2) throw new Error('应有两把武器（装备栏+职业补给）');
  if (g.player.items.length < 1) throw new Error('应有防具（职业补给）');
  if (!g.map.lockedDoors || !g.map.lockedDoors.length) throw new Error('T1 应有锁门');
  if (!g.mapMods || !g.mapMods.length) throw new Error('T1 应有词缀');

  const chest = g.containers.find(c => c.type === 'crate' || c.type === 'chest_wood');
  if (chest) {
    const matsBefore = g.materials;
    g.player.x = chest.x; g.player.y = chest.y;
    chest.started = true;
    driveFrames(60);
    log(`  [开箱] ${chest.type} opened=${chest.opened} 材料=${g.materials} 背包=${g.bag.length}`);
    if (!chest.opened) throw new Error('箱子未开启');
    if (typeof G.game.onContainerOpen !== 'function') throw new Error('onContainerOpen 缺失');
    if (g.materials <= matsBefore && g.bag.length === 0) throw new Error('开箱奖励未结算');
  }

  g.map.time = 61;
  guard('checkObjective', () => g.checkObjective());
  if (!g.map.extract.active) throw new Error('撤离点未激活');
  g.player.x = g.map.extract.x;
  g.player.y = g.map.extract.y;
  guard('flowA', () => g.tryInteract());
  if (!G.UI._flowOpen) throw new Error('抉择面板未打开');
  guard('extractNow', () => g.extractNow());
  driveFrames(120);
  await sleep(1200);
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
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['knight'], 2));
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
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['mage'], 3));
  const g = G.game;
  g.player.maxHp = g.player.hp = 1e9;
  driveFrames(15);
  const matsAt = g.materials;
  const shardsAt = g.shards || 0;
  const roomIdx = g.player.room;
  const rc2 = G.Map.roomRect(roomIdx % g.map.cols, Math.floor(roomIdx / g.map.cols));
  const saveX = (rc2.x0 + rc2.x1) / 2, saveY = (rc2.y0 + rc2.y1) / 2;
  g.player.x = saveX; g.player.y = saveY;
  guard('saveRun', () => g.saveRun());
  const snap = G.Save.getRun();
  if (!snap || snap.mode !== 'extract') throw new Error('快照缺失');
  guard('resumeRun', () => g.resumeRun(snap));
  log(`  [读档] 状态=${g.state} 地图=${g.map.tier.name} 材料=${g.materials} 碎片=${g.shards} 词缀=${(g.mapMods||[]).map(x=>x.id).join(',')}`);
  if (g.materials < matsAt) throw new Error('读档材料丢失');
  if ((g.shards || 0) < shardsAt) throw new Error('读档碎片丢失');
  if (G.dist(g.player.x, g.player.y, saveX, saveY) > 40) throw new Error('读档位置未恢复');
  G.Save.clearRun();
}

/* ---------- 4. 深图战斗回归（T4 大构筑） ---------- */
async function runKitchenSink() {
  log('\n===== 档案D：T4 构筑回归 (engineer) =====');
  resetMeta();
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['engineer'], 4));
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
  log(`  [T4] 状态=${g.state} 敌=${g.enemies.length} 杀=${p.stats.kills} 材料=${g.materials} 背包=${g.bag.length} 精英杀=${p.stats.eliteKills} 碎片=${g.shards}`);
  if (ERR === 0 && g.state !== 'result') {
    g.map.time = 999;
    g.checkObjective();
    if (g.map.extract.active) {
      g.player.x = g.map.extract.x; g.player.y = g.map.extract.y;
      guard('flowD', () => g.tryInteract());
      if (G.UI._flowOpen) g.extractNow();
      driveFrames(150);
      await sleep(1200);
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

/* ---------- 6. 事件房间 ---------- */
function runEvents() {
  log('\n===== 档案F：事件房间 (shadow / t1) =====');
  resetMeta();
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['shadow'], 1));
  const g = G.game;
  g.player.maxHp = g.player.hp = 1e9;
  if (!g.events || !g.events.length) throw new Error('T1 应有事件房间');
  const ev = g.events[0];
  g.player.x = ev.x; g.player.y = ev.y;
  const matsBefore = g.materials;
  guard('tryInteract', () => g.tryInteract());
  if (!G.UI._evtOpen) throw new Error('事件面板未打开');
  const choice = { id: 'test', name: '测试', col: '#fff', desc: '', apply: () => { G.game.addMaterials(5); } };
  guard('applyEvent', () => G.game.applyEvent(ev, choice));
  if (!ev.used) throw new Error('事件未标记已用');
  var matMul = (g.mapMods || []).some(function (x) { return x.id === 'mats'; }) ? 1.5 : 1;
  if (g.materials !== matsBefore + Math.round(5 * matMul)) throw new Error('事件效果未应用');
  guard('closeEvent', () => G.UI.closeEvent());
  log('  [事件] 触发→选择→应用→关闭 ✓');
}

/* ---------- 7. 属性碎片 ---------- */
function runShards() {
  log('\n===== 档案G：属性碎片 (mage / t1) =====');
  resetMeta();
  levelTriggered = false;
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['mage'], 1));
  const g = G.game, p = g.player;
  p.maxHp = p.hp = 1e9;
  const matBefore = g.materials;
  g.pickups.push(new G.Pickup(p.x + 2, p.y, 'shard', 1));
  driveFrames(8);
  if (g.shards !== 1) throw new Error('碎片未拾取 shards=' + g.shards);
  g.pickups.push(new G.Pickup(p.x + 2, p.y, 'shard', 1));
  driveFrames(6);
  g.pickups.push(new G.Pickup(p.x + 2, p.y, 'shard', 1));
  driveFrames(30);
  if (!levelTriggered) throw new Error('碎片未触发强化选择');
  if (p.level !== 1) throw new Error('不应有等级增长 level=' + p.level);
  g.pickups.push(new G.Pickup(p.x + 2, p.y, 'mat', 5));
  driveFrames(8);
  var matMul2 = (g.mapMods || []).some(function (x) { return x.id === 'mats'; }) ? 1.5 : 1;
  if (g.materials !== matBefore + Math.round(5 * matMul2)) throw new Error('材料拾取异常');
  log('  [碎片] 拾取→共鸣→强化 ✓ level=' + p.level + ' shards=' + g.shards + ' pending=' + p.pendingLevels);
}

/* ---------- 10. 新系统：词条/碰撞/深入/机关 ---------- */
function runNewSystems() {
  log('\n===== 档案J：词条/碰撞/深入/机关 =====');
  if (!G.STAT_HIDDEN || !G.STAT_HIDDEN.harvesting) throw new Error('隐藏词条未定义');
  if (G.STAT_DEFS.some(d => G.STAT_HIDDEN[d.key])) throw new Error('属性面板仍有隐藏词条');
  if (G.ITEM_MAP['sickle'] && G.ITEM_MAP['sickle'].mods && G.ITEM_MAP['sickle'].mods.harvesting !== undefined) throw new Error('物品仍有收获词条');
  resetMeta();
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['knight'], 1));
  const g = G.game, p = g.player;
  p.maxHp = p.hp = 1e9;

  /* 碰撞：不可穿墙、不瞬移 */
  const m = g.map;
  let wall = null;
  for (let c = 0; c < m.cols - 1 && !wall; c++) {
    for (let r = 0; r < m.rows; r++) {
      if (!m.doorsH[c][r]) { wall = { x: (c + 1) * G.Map.SEG, y: G.Map.roomRect(c, r).y0 + G.Map.ROOM / 2 }; break; }
    }
  }
  if (!wall) throw new Error('未找到墙体');
  g.keys.right = true;
  p.x = wall.x - p.r - 6;
  p.y = wall.y;
  const startX = p.x;
  driveFrames(60);
  g.keys.right = false;
  if (p.x > wall.x - p.r + 3) throw new Error('穿墙！x=' + p.x + ' wall=' + wall.x);
  if (Math.abs(p.x - startX) > 50) throw new Error('异常位移/瞬移');
  log('  [碰撞] 墙阻=✓ 位移=' + G.fmt(p.x - startX, 1));

  if (!g.barrels || !g.barrels.length) throw new Error('无爆炸桶');
  if (!g.traps || !g.traps.length) throw new Error('无尖刺陷阱');
  const barrel = g.barrels[0];
  const beforeBarrel = g.barrels.length;
  g.bullets.push(new G.Bullet({ x: barrel.x - 60, y: barrel.y, vx: 900, vy: 0, dmg: 50, r: 5, sprite: 'b_bullet', col: '#ffd24a', life: 0.4 }));
  driveFrames(10);
  if (g.barrels.length >= beforeBarrel) throw new Error('爆炸桶未被引爆');
  log('  [机关] 爆炸桶引爆 ✓ 陷阱=' + g.traps.length);

  const combatRooms = {};
  g.containers.forEach(c => { combatRooms[c.room] = (combatRooms[c.room] || 0) + 1; });
  let maxC = 0;
  m.rooms.forEach(rm => { if (rm.type === 'combat') maxC = Math.max(maxC, combatRooms[rm.idx] || 0); });
  if (maxC > 1) throw new Error('战斗房容器过多 ' + maxC);
  log('  [布置] 战斗房容器≤1 ✓');

  g.map.time = 61;
  g.checkObjective();
  g.player.x = g.map.extract.x; g.player.y = g.map.extract.y;
  guard('flowJ', () => g.tryInteract());
  if (!G.UI._flowOpen) throw new Error('抉择面板未打开');
  const tierBefore = g.map.tierId;
  guard('descend', () => g.descend());
  if (g.map.tierId !== tierBefore + 1) throw new Error('未深入下一层');
  if ((g.depth || 0) !== 1) throw new Error('深度未记录');
  if (!g._pendingDescend || g.state !== 'pause') throw new Error('层间整备未开启');
  guard('beginNextFloor', () => g.beginNextFloor());
  if (g.state !== 'play') throw new Error('深入后未进入战斗');
  guard('closeFlow', () => G.UI.closeFlow());
  log('  [深入] T' + tierBefore + '→T' + g.map.tierId + ' ✓');
}
/* ---------- 11. 背包拖拽/整理 ---------- */
function runInvDrag() {
  log('\n===== 档案K：背包拖拽/整理 =====');
  resetMeta();
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['ranger'], 1));
  const g = G.game, p = g.player;
  p.maxHp = p.hp = 1e9;
  const a = G.makeItem('clover', 0);
  const b = G.makeItem('lucky_coin', 0);
  const c = G.makeWeapon('pistol', 2);
  const d = G.makeItem('executioner', 4);
  if (!G.addBagItem(a) || !G.addBagItem(b) || !G.addBagItem(c) || !G.addBagItem(d)) throw new Error('入包失败');
  G.invFixLayout(g.bag, 5, 4);
  let freeCell = null;
  for (let y = 0; y < 4 && !freeCell; y++) for (let x = 0; x < 5 && !freeCell; x++)
    if (G.invCanPlace(g.bag, 5, 4, x, y, 1, 1, null)) freeCell = { x: x, y: y };
  if (!freeCell) throw new Error('无空位');
  const oldB = { x: b.ix, y: b.iy };
  const r1 = G.invTryMove(g.bag, 5, 4, a, freeCell.x, freeCell.y);
  if (!r1.ok || a.ix !== freeCell.x || a.iy !== freeCell.y) throw new Error('拖拽移动失败');
  const r2 = G.invTryMove(g.bag, 5, 4, b, freeCell.x, freeCell.y);
  if (!r2.ok || !r2.swap) throw new Error('同尺寸交换失败');
  if (b.ix !== freeCell.x || b.iy !== freeCell.y || a.ix !== oldB.x || a.iy !== oldB.y) throw new Error('交换坐标错误');
  const r3 = G.invTryMove(g.bag, 5, 4, d, 4, 3);
  if (r3.ok) throw new Error('越界应拒绝');
  G.invSort(g.bag);
  G.invPackAll(g.bag, 5, 4);
  const first = g.bag[0];
  if (!G.invCanPlace(g.bag, 5, 4, first.ix, first.iy, first.size[0], first.size[1], first)) throw new Error('整理后重叠');
  const d1 = G.itemData(a);
  const a2 = G.itemFromData(d1);
  if (a2.ix !== a.ix || a2.iy !== a.iy) throw new Error('坐标未持久化');
  guard('renderBag', () => G.UI.renderBag());
  guard('renderBase', () => G.UI.renderBase());
  log('  [拖拽] 移动✓ 交换✓ 越界拒绝✓ 整理✓ 持久化✓');
}
/* ---------- 12. 分层内容密度 ---------- */
function runTierDensity() {
  log('\n===== 档案L：分层内容密度 =====');
  const counts = [];
  for (let tier = 1; tier <= 5; tier++) {
    resetMeta();
    guard('init', () => G.game.init());
    guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['knight'], tier));
    const g = G.game;
    const chests = g.containers.filter(c => c.type !== 'shrine' && c.type !== 'altar').length;
    const traps = g.traps.length;
    const trapRooms = g.map.rooms.filter(rm => rm.type === 'trap').length;
    const itemRooms = g.map.rooms.filter(rm => rm.type === 'item').length;
    const itemChests = g.containers.filter(c => c.forceItem).length;
    counts.push({ tier, chests, traps, trapRooms, itemRooms, itemChests });
  }
  log('  ' + counts.map(c => 'T' + c.tier + ' 箱' + c.chests + ' 陷' + c.traps + ' 陷阱房' + c.trapRooms + ' 道具房' + c.itemRooms).join(' | '));
  const c1 = counts[0], c5 = counts[4];
  if (c5.chests <= c1.chests * 1.5) throw new Error('深层宝箱未显著增多 T1=' + c1.chests + ' T5=' + c5.chests);
  if (counts[1].trapRooms < 1 || counts[2].trapRooms < 1) throw new Error('T2/T3 应有陷阱房');
  if (counts[0].itemRooms < 1) throw new Error('T1 应有道具房');
  if (counts[4].trapRooms < 2) throw new Error('T5 陷阱房应 >= 2');
  if (counts[0].itemChests < 1) throw new Error('道具房箱子未标记必出物品');
  log('  [分层] 深层宝箱/陷阱显著增多 ✓ 陷阱房/道具房 ✓ 必出物品 ✓');
}
/* ---------- 13. 怪物台词 / 快捷回应 ---------- */
function runChat() {
  log('\n===== 档案M：怪物台词 / 快捷回应 =====');
  resetMeta();
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['knight'], 1));
  const g = G.game, p = g.player;
  p.maxHp = p.hp = 1e9;
  if (!G.Chat || !G.Chat.playerSay) throw new Error('Chat 模块缺失');
  G.Chat.playerSay();
  if (!p.bubble || !p.bubble.text) throw new Error('玩家气泡未生成');
  const e = g.spawnEnemy('worm', p.x + 200, p.y);
  if (!e) throw new Error('生成敌人失败');
  G.Chat.lastT = 0;
  G.Chat.say(e, '饿……', 2);
  if (!e.bubble || !e.bubble.text) throw new Error('敌人气泡未生成');
  guard('render', () => g.render());
  guard('tick', () => G.Chat.tick(g, 0.1));
  G.Chat.end(e);
  log('  [台词] 玩家回应 ✓ 敌人气泡 ✓ 渲染/衰减 ✓');
}
/* ---------- 14. 数值平衡 / 整备栏显隐 ---------- */
function runBalance() {
  log('\n===== 档案N：数值平衡 / 整备栏 =====');
  resetMeta();
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['knight'], 2));
  const g = G.game, p = g.player;
  p.maxHp = p.hp = 1e9;
  const ra = G.rollAffixes;
  G.rollAffixes = () => [];
  const e1 = g.spawnEnemy('worm', p.x + 200, p.y);
  const e2 = g.spawnEnemy('el_warden', p.x + 300, p.y);
  const b1 = g.spawnEnemy('boss_behemoth', p.x + 400, p.y);
  G.rollAffixes = ra;
  const sc = G.waveScale(g.map.wave || 1);
  const expectWorm = Math.round(Math.round(G.ENEMY_MAP['worm'].hp * sc.hp) * 1.3);
  const expectEl = Math.round(Math.round(G.ENEMY_MAP['el_warden'].hp * sc.hp) * 0.35);
  if (Math.abs(e1.maxHp - expectWorm) > Math.max(2, expectWorm * 0.05)) throw new Error('小怪加成未生效 ' + e1.maxHp + ' vs ' + expectWorm);
  if (Math.abs(e2.maxHp - expectEl) > Math.max(2, expectEl * 0.05)) throw new Error('精英削减未生效 ' + e2.maxHp + ' vs ' + expectEl);
  if (b1.maxHp !== G.ENEMY_MAP['boss_behemoth'].hp) throw new Error('BOSS 不应受影响');
  /* 整备栏显隐：正常打开背包不应显示 */
  G.game._pendingDescend = null;
  G.UI.toggleBag();
  const normalOpen = !document.getElementById('scrBag').classList.contains('hidden');
  const barDisplay = document.getElementById('bagPrepBar') ? document.getElementById('bagPrepBar').style.display : 'none';
  if (!normalOpen) throw new Error('背包未打开');
  if (barDisplay === 'flex') throw new Error('正常打开背包不应显示整备栏');
  G.UI.toggleBag();
  log('  [平衡] 小怪↑ 精英↓ BOSS不变 ✓ 整备栏显隐 ✓');
}
/* ---------- 9. 物品占格 ---------- */
function runInvSizes() {
  log('\n===== 档案I：物品占格 (ranger / t1) =====');
  resetMeta();
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['ranger'], 1));
  const g = G.game, p = g.player;
  p.maxHp = p.hp = 1e9;
  const w = G.makeWeapon('pistol', 2);
  const relic = G.makeItem('executioner', 4);
  const trink = G.makeItem('clover', 0);
  if (!w || w.size[0] !== 2 || w.size[1] !== 1) throw new Error('武器占格错误');
  if (!relic || relic.size[0] !== 2 || relic.size[1] !== 2) throw new Error('遗物占格错误');
  if (!trink || trink.size[0] !== 1) throw new Error('饰品占格错误');
  g.bag.push(w, relic, trink);
  const placed = G.packItems(g.bag, G.BAG_COLS, G.BAG_ROWS);
  if (!placed || placed.length !== 3) throw new Error('打包失败');
  if (G.invCells(g.bag) !== 7) throw new Error('格数统计错误');
  const big = G.makeItem('phoenix_ash', 4);
  let filled = 0;
  while (filled < 30) {
    const it = G.makeItem('clover', 0);
    if (!G.addBagItem(it)) break;
    filled++;
  }
  const cellsNow = G.invCells(g.bag);
  if (cellsNow > G.BAG_CELLS) throw new Error('超出容量 ' + cellsNow);
  if (filled === 0) throw new Error('无法放入小件');
  if (G.addBagItem(big)) throw new Error('满时不应再放入');
  guard('renderBag', () => G.UI.renderBag());
  guard('renderBase', () => G.UI.renderBase());
  log('  [占格] 武器2x1 遗物2x2 饰品1x1 ✓ 容量=' + cellsNow + '/' + G.BAG_CELLS + ' 小件=' + filled);
}
/* ---------- 8. 深渊词缀 / 传送门 ---------- */
function runModsPortal() {
  log('\n===== 档案H：词缀 / 传送门 (knight / t2) =====');
  resetMeta();
  guard('init', () => G.game.init());
  guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['knight'], 2));
  const g = G.game;
  g.player.maxHp = g.player.hp = 1e9;
  if (!g.mapMods || !g.mapMods.length) throw new Error('T2 应有词缀');
  if (!g.portals || !g.portals.length) throw new Error('应有传送门');
  const pt = g.portals[0];
  const fromX = g.player.x, fromY = g.player.y;
  g.player.x = pt.x; g.player.y = pt.y;
  guard('portalUse', () => g.tryInteract());
  if (!pt.used) throw new Error('传送门未使用');
  if (G.dist(g.player.x, g.player.y, fromX, fromY) < 250) throw new Error('未传送');
  driveFrames(10);
  log('  [随机] 词缀=' + g.mapMods.map(x => x.id).join(',') + ' 传送 ✓');
}

(async function () {
  try {
    verifyMaps();
    await runExtractSuccess();
    await runDeath();
    runSaveResume();
    await runKitchenSink();
    runLockedDoors();
    runEvents();
    runShards();
    runModsPortal();
    runInvSizes();
    runNewSystems();
    runTierDensity();
    runChat();
    runBalance();
    runInvDrag();
    log(`\n结果：地图✓ 撤离✓ 死亡✓ 读档✓ T4✓ 锁门✓ 事件✓ 碎片✓ 词缀/传送✓ 占格✓ 新系统✓ 拖拽✓ 分层✓ 台词✓ 平衡✓ 错误数=${ERR}`);
  } catch (e) {
    log('TOP-LEVEL THROW: ' + (e && e.stack || e));
    ERR++;
  }
  process.exit(ERR ? 1 : 0);
})();
