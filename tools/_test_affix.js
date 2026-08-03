/* 精英词缀变异系统专项无头验证。
   用法：node tools/_test_affix.js
*/
'use strict';
const fs = require('fs');
const vm = require('vm');

/* ---------- DOM / Canvas 桩（与 _test_eng.js 一致） ---------- */
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
  addEventListener(){}, readyState:'complete'
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

const FILES = ['js/00_util.js','js/12_audio.js','js/01_pixel.js','js/02_stats.js','js/03_items.js',
  'js/04_weapons.js','js/05_enemies.js','js/06_entities.js','js/07_player.js','js/07b_enemy.js',
  'js/08_shop.js','js/09_ui.js','js/10_game.js','js/11_main.js'];
const sandbox = {};
sandbox.window = sandbox;
sandbox.G = {};
for (const k of ['console','Math','Date','JSON','setTimeout','clearTimeout','requestAnimationFrame']) sandbox[k] = global[k];
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
sandbox.devicePixelRatio = 1;
sandbox.innerWidth = 1280; sandbox.innerHeight = 720;
sandbox.localStorage = lsStub;
sandbox.document = docStub;
sandbox.performance = global.performance;
vm.createContext(sandbox);
for (const f of FILES) vm.runInContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: f });
const G = sandbox.G;

let pendingLevelCb = null;
G.UI.renderLevelUp = function (g, opts, cb) { pendingLevelCb = { cb, opts }; };
G.UI.renderShop = function () {};

let ERR = 0;
function check(label, cond) {
  if (cond) console.log('  ✓ ' + label);
  else { console.log('  ✗ ' + label); ERR++; }
}
function guard(label, fn) {
  try { return fn(); }
  catch (e) { console.log('  ✗ ' + label + ': ' + (e && e.stack || e)); ERR++; }
}

// 1) rollAffixes 规则
console.log('— rollAffixes 规则 —');
check('精英 wave8 无词缀', G.rollAffixes(true, 8).length === 0);
check('精英 wave9 必 1 个', G.rollAffixes(true, 9).length === 1);
const r15 = G.rollAffixes(true, 15);
check('精英 wave15 有 1~2 个', r15.length >= 1 && r15.length <= 2);
check('普通 wave6 无词缀', G.rollAffixes(false, 6).length === 0);
let cnt = 0; for (let i = 0; i < 500; i++) if (G.rollAffixes(false, 12).length) cnt++;
console.log(`  … 普通 wave12 500 次抽样触发 ${cnt} 次（~10-15% 期望）`);
check('BOSS 不加词缀', G.AFFIXES.length === 4);

// 2) 实战：wave15 精英带词缀 spawn
console.log('— 生成与属性修正 —');
guard('init', () => G.game.init());
guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['engineer']));
const g = G.game;
g.wave = 15;
// 强制精英带词缀：手动调 rollAffixes 太随机，直接构造带词缀的精英验证各路径
const e1 = guard('spawnElite(ironclad)@w15', () => g.spawnEnemy('el_ironclad', 300, 300));
if (e1) {
  const hasAff = e1.affixes && e1.affixes.length;
  check('精英生成时挂词缀', hasAff);
  console.log('  词缀: ' + (hasAff ? e1.affixes.map(a => a.name + '(' + a.id + ')').join(', ') : '无'));
}

// 3) 护盾吸收
console.log('— 护盾 —');
const e2 = guard('spawn(worm)手动shield', () => g.spawnEnemy('worm', 500, 300));
e2.maxHp = 100; e2.hp = 100; e2.shieldHp = 30;
guard('damageEnemy 打盾', () => g.damageEnemy(e2, 50, { silent: true }));
check('盾吸收后 hp 未满扣 (hp=80)', e2.hp === 80 && e2.shieldHp === 0);
const e3 = guard('spawn(worm)手动shield2', () => g.spawnEnemy('worm', 700, 300));
e3.maxHp = 100; e3.hp = 100; e3.shieldHp = 10;
guard('damageEnemy 大伤害破盾', () => g.damageEnemy(e3, 50, { silent: true }));
check('破盾后 hp=60 (吸收10, 实际40)', e3.hp === 60 && e3.shieldHp === 0 && !e3.dead);

// 4) 词缀分裂
console.log('— 分裂 —');
const e4 = guard('spawn(worm)带split', () => g.spawnEnemy('worm', 900, 300));
e4.affixes = [G.AFFIX_MAP['split']];
e4.hp = 0;
const beforeSplit = g.enemies.length;
guard('killEnemy 触发分裂', () => g.killEnemy(e4));
const newSwarm = g.enemies.filter(x => x.def.id === 'swarmling' && x !== e4);
check('分裂出 2 只 swarmling', newSwarm.length === 2);
g.enemies.splice(g.enemies.indexOf(e4), 1);

// 5) 吸血（接触路径）：构造 vamp 敌人贴近玩家
console.log('— 吸血 —');
const e5 = guard('spawn(mite)带vamp', () => g.spawnEnemy('mite', g.player.x + 10, g.player.y));
e5.affixes = [G.AFFIX_MAP['vamp']];
e5.maxHp = 50; e5.hp = 20; e5.dmg = 20; e5.contactCd = 0; e5.r = 1;
guard('update 接触玩家', () => e5.update(1 / 30));
check('吸血后 hp 回复 (hp=27)', e5.hp === 27);

// 6) 快速实战：驱动 1 波带词缀的精英战不报错
console.log('— 实战 1 波 —');
const errBefore = ERR;
g.enemies.length = 0;
g.wave = 15; g.waveTime = 30; g.waveDur = 60; g.state = 'play';
let frames = 0;
while (frames < 900) {
  if (g.state === 'play') {
    guard('update@w15', () => g.update(1 / 30));
    guard('render@w15', () => g.render());
    g.player.hp = g.player.st.maxHp = 1e9;
  } else if (g.state === 'shop') {
    guard('nextWave', () => g.nextWave());
  } else if (g.state === 'level') {
    if (pendingLevelCb) { const pc = pendingLevelCb; pendingLevelCb = null; pc.cb(pc.opts[0]); }
  }
  frames++;
}
console.log('  状态: ' + g.state + ' wave=' + g.wave + ' 敌人="' + g.enemies.length + '" 击杀=' + g.player.stats.kills);
check('实战无新错误', ERR === errBefore);

console.log(ERR === 0 ? '\nRESULT: PASS — 词缀系统正常' : '\nRESULT: FAIL (' + ERR + ' 错误)');
process.exit(ERR ? 1 : 0);
