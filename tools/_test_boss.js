/* BOSS 阶段技能专项无头验证：三连践踏(boss1) / 裂地(boss2 phase3) 触发无错误。
   用法：node tools/_test_boss.js
*/
'use strict';
const fs = require('fs');
const vm = require('vm');

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
const lsStub = { getItem(k){ return k in mem ? mem[k] : null; }, setItem(k,v){ mem[k]=String(v); }, removeItem(k){ delete mem[k]; } };
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
sandbox.addEventListener = ()=>{};
sandbox.removeEventListener = ()=>{};
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
function guard(label, fn) {
  try { return fn(); }
  catch (e) { console.log('  ✗ ' + label + ': ' + (e && e.stack || e)); ERR++; }
}

guard('init', () => G.game.init());
guard('newRun', () => G.game.newRun(G.CHAR_BY_ID['engineer']));
const g = G.game;
g.player.maxHp = 1e9; g.player.hp = 1e9;
g.player.stats.kills = 0;

// 1) 腐化巨兽 phase2 三连践踏
console.log('— boss1 腐化巨兽 phase2 三连践踏 —');
let b1 = null;
guard('spawn boss1', () => { b1 = g.spawnEnemy('boss_behemoth', 700, 400); });
b1.phase = 2; b1.hp = b1.maxHp * 0.4; // 已 phase2，hpr=0.4 不再触发 enterPhase（会重置 state）
b1.state = 'slamWind'; b1.sTimer = 0.01;
for (let i = 0; i < 200; i++) { // ~6.7s 游戏时间
  guard('boss1 update', () => b1.update(1 / 30));
}
console.log('  状态: ' + b1.state + ' phase=' + b1.phase + ' slamN=' + (b1.slamN !== undefined ? b1.slamN : 'n/a'));
check('三连践踏执行完回到 idle 且 slamN=0', b1.state === 'idle' && b1.slamN === 0);
g.enemies.length = 0;

// 2) 深渊之主 phase3 裂地
console.log('— boss2 深渊之主 phase3 裂地 —');
let b2 = null;
guard('spawn boss2', () => { b2 = g.spawnEnemy('boss_abyss', 700, 400); });
b2.phase = 3; b2.hp = b2.maxHp * 0.5; // 直接 phase3 且不再转阶段
b2.state = 'riftWind'; b2.sTimer = 0.01;
guard('riftWind 一帧', () => b2.update(1 / 30));
check('裂地蓄力后进入 idle 且生成 4 个裂口', b2.state === 'idle' && b2.rifts && b2.rifts.length === 4);
// 独立驱动裂口倒计时（不跑 AI，只验证引爆）
b2.state = 'idle'; b2.sTimer = 999;
for (let i = 0; i < 120; i++) {
  guard('rifts 倒计时', () => b2.update(1 / 30));
}
check('裂口已全部引爆', !b2.rifts || b2.rifts.length === 0);

// 3) 完整 BOSS 战驱动 20 秒（含 render）
console.log('— BOSS 战 20s 完整驱动 —');
g.enemies.length = 0;
b1 = g.spawnEnemy('boss_behemoth', 700, 400);
b1.hp = b1.maxHp * 0.4;
g.state = 'play'; g.waveTime = 100; g.waveDur = 120;
const errBefore = ERR;
for (let i = 0; i < 600; i++) {
  guard('play update', () => g.update(1 / 30));
  guard('play render', () => g.render());
  g.player.hp = g.player.st.maxHp = 1e9;
  if (b1.hp > 0 && Math.random() < 0.02) b1.hp -= 1000;
}
console.log('  state=' + g.state + ' wave=' + g.wave + ' boss hp=' + Math.round(b1.hp));
check('完整驱动无新错误', ERR === errBefore);

console.log(ERR === 0 ? '\nRESULT: PASS — BOSS 技能正常' : '\nRESULT: FAIL (' + ERR + ' 错误)');
process.exit(ERR ? 1 : 0);

function check(label, cond) {
  if (cond) console.log('  ✓ ' + label);
  else { console.log('  ✗ ' + label); ERR++; }
}
