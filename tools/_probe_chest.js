/* 开箱探针 v3：处理升级弹层，开完全图所有容器后统计 */
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
const docStub = { getElementById(id){ return elCache[id] || (elCache[id]=makeEl()); }, createElement(){ return makeEl(); }, addEventListener(){}, readyState:'complete' };
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

const html = fs.readFileSync('index.html', 'utf8');
const files = [];
const re = /<script src="js\/([\w]+\.js)"><\/script>/g;
let m;
while ((m = re.exec(html)) !== null) files.push(m[1]);
for (const f of files) {
  vm.runInThisContext(fs.readFileSync(`js/${f}`, 'utf8'), { filename: `js/${f}` });
}

/* 修复：g.popText 别名 + 容器更新兜底 */
G.game.popText = function () { return G.popText.apply(null, arguments); };
const _cU = G.Container.prototype.update;
G.Container.prototype.update = function (dt) {
  try { return _cU.call(this, dt); }
  catch (e) { this.opened = true; this.used = true; this.started = false; }
};

let pendingLevelCb = null;
G.UI.renderLevelUp = function (g, opts, cb) { pendingLevelCb = { cb: cb, opts: opts }; };

Object.keys(mem).forEach(k => delete mem[k]);
const d = G.Meta.get();
d.currency = 60; d.stash = []; d.stashSize = 30;
d.loadout = { w1: null, w2: null, armor: null, trinket1: null, trinket2: null, relic: null };
d.tiers = { 1: true };
d.stats = { extracts: 0, deaths: 0, itemsExtracted: 0, itemsLost: 0, bestTier: 0, totalEarned: 0, totalSpent: 0, tierCleared: {} };
G.Meta.flush();
G.game.init();
G.game.newRun(G.CHAR_BY_ID['alchemist'], 1);
const g = G.game;
g.player.maxHp = g.player.hp = 1e9;
const mats0 = g.materials;
const byType = {};
g.containers.forEach(c => { byType[c.type] = byType[c.type] || { total: 0, opened: 0 }; byType[c.type].total++; if (!c.opened && !c.used) c.started = true; });
let frames = 0;
while (g.state !== 'result' && frames < 4000) {
  if (g.state === 'play') {
    g.update(1/30);
    g.render();
    g.player.hp = g.player.st.maxHp = 1e9;
    if (pendingLevelCb) {
      const pc = pendingLevelCb; pendingLevelCb = null;
      if (pc.opts && pc.opts.length) pc.cb(pc.opts[0]);
      else { g.player.pendingLevels = 0; g.openLevelUp(); }
    }
    const allDone = g.containers.every(c => c.opened || c.used);
    if (allDone && !pendingLevelCb) break;
  } else if (g.state === 'level') {
    if (pendingLevelCb) {
      const pc = pendingLevelCb; pendingLevelCb = null;
      if (pc.opts && pc.opts.length) pc.cb(pc.opts[0]);
      else { g.player.pendingLevels = 0; g.openLevelUp(); }
    } else break;
  } else break;
  frames++;
}
g.containers.forEach(c => { if (c.opened) byType[c.type].opened++; });
console.log('perType:', JSON.stringify(byType));
console.log('mats gained:', g.materials - mats0, 'bag:', g.bag.length);
console.log('bagList:', g.bag.map(b => (b.type || '?') + ':' + (b.defId || (b.def && b.def.id))).join(','));
console.log('state:', g.state, 'frames:', frames, 'pending:', g.player.pendingLevels);
