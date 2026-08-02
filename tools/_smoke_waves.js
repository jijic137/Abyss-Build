/* 无浏览器环境下驱动全 20 波，验证新增敌人/武器/物品/波次/平衡数值无运行时错误。
   复用 _test_save.js 的 DOM/Canvas 桩；手动驱动 game.update / game.render。
   日志用 fs.appendFileSync 同步写入，避免崩溃时丢失。
   用法：node _smoke_waves.js
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

process.on('uncaughtException', (e) => { log('UNCAUGHT: ' + (e && e.stack || e)); process.exit(3); });
process.on('unhandledRejection', (e) => { log('UNHANDLED: ' + (e && e.stack || e)); });

/* ---------- 顺序加载全部脚本 ---------- */
const files = ['00_util','12_audio','01_pixel','02_stats','03_items','04_weapons','05_enemies',
               '06_entities','07_player','07b_enemy','08_shop','09_ui','10_game','11_main'];
try {
  for(const f of files){
    const code = fs.readFileSync(`js/${f}.js`,'utf8');
    vm.runInThisContext(code, { filename:`js/${f}.js` });
  }
} catch (e) { log('LOAD ERROR: ' + (e && e.stack || e)); process.exit(2); }

// 正确模拟：renderLevelUp 只暂存回调，由驱动每帧处理一个升级（避免 openLevelUp 同步递归爆栈）
let pendingLevelCb = null;
G.UI.renderLevelUp = function (g, opts, cb) { pendingLevelCb = { cb: cb, opts: opts }; };
G.UI.renderShop = function () {};

let ERR = 0;
function guard(label, fn) {
  try { return fn(); }
  catch (e) { ERR++; log('  ✗ 运行时错误 @ ' + label + ': ' + (e && e.stack || e)); }
}

function runProfile(name, charId, setup) {
  log(`\n===== 档案 ${name} (${charId}) =====`);
  guard('init', () => G.game.init());
  const charDef = G.CHAR_BY_ID[charId];
  guard('newRun', () => G.game.newRun(charDef));
  if (setup) guard('setup', () => setup(G.game.player, G.game));

  G.game.player.maxHp = 1e9;
  G.game.player.hp = 1e9;

  const dt = 1/30;
  const CAP = 200000;
  let frames = 0, peakBullets = 0, lastWave = G.game.wave, wframes = 0, wmax = 0;
  while (G.game.state !== 'result' && frames < CAP) {
    if (G.game.state === 'play') {
      guard('update@w' + G.game.wave, () => G.game.update(dt));
      guard('render@w' + G.game.wave, () => G.game.render());
      G.game.player.hp = G.game.player.st.maxHp = 1e9;
      const nb = G.game.bullets.length + G.game.ebullets.length;
      peakBullets = Math.max(peakBullets, nb); wmax = Math.max(wmax, nb);
      if (G.game.waveTime <= 0 && G.game.bossAlive()) {
        G.game.enemies.slice().forEach(e => { if (e.def.boss) guard('killBoss', () => G.game.killEnemy(e)); });
      }
      wframes++;
    } else if (G.game.state === 'shop') {
      guard('nextWave@w' + G.game.wave, () => G.game.nextWave());
    } else if (G.game.state === 'level') {
      // 每帧只消化一个升级，避免 openLevelUp 递归爆栈
      if (pendingLevelCb) {
        const pc = pendingLevelCb; pendingLevelCb = null;
        guard('levelUp@w' + G.game.wave, () => {
          if (pc.opts && pc.opts.length) pc.cb(pc.opts[0]);
          else { G.game.player.pendingLevels = 0; G.game.openShop(); }
        });
      }
    }
    if (G.game.wave !== lastWave) {
      log(`  [${name}] wave ${G.game.wave} state=${G.game.state} enemies=${G.game.enemies.length} peakBullets=${peakBullets}`);
      lastWave = G.game.wave; peakBullets = 0;
    }
    if (frames % 600 === 0) log(`  ... heartbeat ${name} wave=${G.game.wave} state=${G.game.state} frames=${frames} pend=${G.game.player && G.game.player.pendingLevels} kills=${G.game.player && G.game.player.stats.kills}`);
    frames++;
  }
  const ks = G.game.player ? G.game.player.stats.kills : 0;
  log(`[run] ${name} -> state=${G.game.state} wave=${G.game.wave} peakBullets=${peakBullets} kills=${ks} frames=${frames}`);
  return G.game.state === 'result';
}

try {
  const skipA = process.env.SKIP_A === '1';
  const okA = skipA ? true : runProfile('new-alchemist', 'alchemist', null);
  const okB = runProfile('kitchenSink-mage', 'mage', function (p, g) {
    p.maxWeapons = 12;
    ['spark_rod','club','trident','blunderbuss','throwing_axe',
     'gravity_cannon','storm_staff','spike_shotgun','pulse_core','orbit_blade'].forEach(id =>
      p.addWeapon(G.makeWeapon(id, 4)));
    ['cloth_wrap','pebble','wood_stick','cheap_ring','rope_belt','dry_berry',
     'spiked_boot','quiver','focus_lens','war_paint','spring_coil','blood_charm',
     'storm_brand','frost_sigil','iron_will',
     'tin_can','greased_gear','razor_edge','vampiric_charm','soul_reaver',
     'frost_mail','abyssal_blade','glutton_core'].forEach(id => {
       const d = G.ITEM_MAP[id]; if (d) p.addItem(d);
     });
    p.recalc();
  });
  log(`\n结果：档案A=${okA?'到达结算':'未完成'} 档案B=${okB?'到达结算':'未完成'} 错误数=${ERR}`);
} catch (e) {
  log('TOP-LEVEL THROW: ' + (e && e.stack || e));
}
process.exit(ERR ? 1 : 0);
