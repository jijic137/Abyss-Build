/* 工程武器专项无头验证：装备 5 把新工程武器，驱动若干波，确认部署/开火/引爆无运行时错误。
   用法：node tools/_test_eng.js
*/
'use strict';
const fs = require('fs');
const vm = require('vm');

/* ---------- DOM / Canvas 桩（与 _smoke_waves.js 一致） ---------- */
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
sandbox.requestAnimationFrame = () => 0;
vm.createContext(sandbox);
for (const f of FILES) vm.runInContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: f });
const G = sandbox.G;

// 商店桩（不递归）
let pendingLevelCb = null;
G.UI.renderLevelUp = function (g, opts, cb) { pendingLevelCb = { cb, opts }; };
G.UI.renderShop = function () {};

let ERR = 0;
function guard(label, fn) {
  try { return fn(); }
  catch (e) { ERR++; console.log('  ✗ ' + label + ': ' + (e && e.stack || e)); }
}

// 1) 注册检查：5 把新武器都在表里
const ids = ['turret','drone','mine','laser_turret','nanite_swarm','shock_field'];
for (const id of ids) {
  const w = G.WEAPONS.find(x => x.id === id);
  if (!w) { console.log('✗ 武器未注册: ' + id); ERR++; }
  else console.log('  ✓ ' + id + ' → ' + w.name + ' (kind=' + w.kind + ', tags=' + w.tags.join(',') + ')');
}

// 2) 实战：工程师职业，6 把武器全装上，跑 3 波
guard('init', () => G.game.init());
const charDef = G.CHAR_BY_ID['engineer'];
guard('newRun', () => G.game.newRun(charDef));
const p = G.game.player;
ids.forEach(id => guard('addWeapon ' + id, () => p.addWeapon(G.makeWeapon(id, 2))));
p.recalc();

let frames = 0;
const dt = 1/30;
let waveGo = G.game.wave;
let peakDrones = 0, peakMines = 0, peakTurrets = 0;
while (G.game.wave <= 3 && frames < 9000) {
  if (G.game.state === 'play') {
    guard('update@w' + G.game.wave, () => G.game.update(dt));
    guard('render@w' + G.game.wave, () => G.game.render());
    G.game.player.hp = G.game.player.st.maxHp = 1e9;
    peakDrones = Math.max(peakDrones, G.game.drones.length);
    peakMines = Math.max(peakMines, G.game.mines.length);
    peakTurrets = Math.max(peakTurrets, G.game.turrets.length);
  } else if (G.game.state === 'shop') {
    guard('nextWave', () => G.game.nextWave());
  } else if (G.game.state === 'level') {
    if (pendingLevelCb) {
      const pc = pendingLevelCb; pendingLevelCb = null;
      guard('levelUp', () => { if (pc.opts && pc.opts.length) pc.cb(pc.opts[0]); else { p.pendingLevels = 0; G.game.openShop(); } });
    }
  }
  if (G.game.wave !== waveGo) { console.log(`  ✓ 进入第 ${G.game.wave} 波（turrets=${G.game.turrets.length} drones=${G.game.drones.length} mines=${G.game.mines.length}）`); waveGo = G.game.wave; }
  frames++;
}
console.log(`  峰值实体: turrets=${peakTurrets} drones=${peakDrones} mines=${peakMines}`);
console.log('  结算状态: ' + G.game.state + ' wave=' + G.game.wave + ' 敌人击杀=' + (p.stats.kills));
console.log(ERR === 0 ? '\nRESULT: PASS — 工程武器全部正常' : '\nRESULT: FAIL (' + ERR + ' 错误)');
process.exit(ERR ? 1 : 0);
