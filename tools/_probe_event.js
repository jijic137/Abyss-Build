/* 探针：循环运行事件档案，抓取"事件效果未应用"的失败现场 */
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

const html = fs.readFileSync('index.html', 'utf8');
const files = [];
const re = /<script src="js\/([\w]+\.js)"><\/script>/g;
let m;
while ((m = re.exec(html)) !== null) files.push(m[1]);
for (const f of files) {
  vm.runInThisContext(fs.readFileSync(`js/${f}`, 'utf8'), { filename: `js/${f}` });
}

let levelTriggered = false;
G.UI.renderLevelUp = function (g, opts, cb) { levelTriggered = true; };

function resetMeta() {
  Object.keys(mem).forEach(k => delete mem[k]);
  const d = G.Meta.get();
  d.currency = 60; d.stash = []; d.stashSize = 30;
  d.loadout = { w1: null, w2: null, armor: null, trinket1: null, trinket2: null, relic: null };
  d.tiers = { 1: true };
  G.Meta.flush();
}

let fails = 0;
for (let it = 0; it < 40; it++) {
  resetMeta();
  G.game.init();
  G.game.newRun(G.CHAR_BY_ID['shadow'], 1);
  const g = G.game;
  g.player.maxHp = g.player.hp = 1e9;
  if (!g.events || !g.events.length) { console.log(`#${it} 无事件`); continue; }
  const ev = g.events[0];
  g.player.x = ev.x; g.player.y = ev.y;
  const matsBefore = g.materials;
  const steps = { afterNewRun: matsBefore };
  try { g.tryInteract(); } catch (e) { console.log(`#${it} tryInteract THROW: ${e.message}`); continue; }
  steps.afterTry = g.materials;
  const opened = !!G.UI._evtOpen;
  const evUsedBefore = !!ev.used;
  const choice = { id: 'test', name: '测试', col: '#fff', desc: '', apply: () => { G.game.addMaterials(5); } };
  steps.beforeApply = g.materials;
  let applied = 'no-call', threw = null;
  try {
    g.applyEvent(ev, choice);
    applied = 'ok';
  } catch (e) {
    applied = 'threw';
    threw = e && e.stack || e;
  }
  const delta = g.materials - matsBefore;
  if (delta !== 5) {
    fails++;
    console.log(`#${it} FAIL mats=${matsBefore}->${g.materials} delta=${delta} steps=${JSON.stringify(steps)} opened=${opened} evUsedBefore=${evUsedBefore} applied=${applied} evt=${ev.id} x=${ev.x.toFixed(0)},${ev.y.toFixed(0)} events=${g.events.length} throw=${threw}`);
  }
}
console.log(`done fails=${fails}/40`);
process.exit(fails ? 1 : 0);
