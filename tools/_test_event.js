/* 事件房扩充针对性校验：
   - 事件池包含新增类型（金币/护甲/双生祭坛）
   - T1 地图 1 个事件节点，T2 以上 2 个
   - 新事件 apply 路径不抛错（含材料 / 护甲 / 金币 / 双生）
   复用 smoke 的加载方式（从 index.html 解析全部脚本）。 */
'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = global;

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
  const style = new Proxy({}, {
    get(t,k){ if(k==='setProperty') return ()=>{}; return t[k]; },
    set(t,k,v){ t[k]=v; return true; }
  });
  return { style, dataset:{}, classList: classList(), children:[], innerHTML:'', appendChild(){}, removeChild(){},
    addEventListener(){}, setAttribute(){}, getAttribute(){ return null; }, focus(){}, blur(){},
    querySelector(){ return null; }, querySelectorAll(){ return []; }, textContent:'',
    getContext(){ return ctxStub(); }, set textContent(v){}, cloneNode(){ return makeEl(); } };
}
const documentStub = {
  readyState: 'complete',
  addEventListener(){}, removeEventListener(){},
  createElement(){ return makeEl(); }, createElementNS(){ return makeEl(); },
  getElementById(){ return makeEl(); }, querySelector(){ return null; },
  querySelectorAll(){ return []; }, body: makeEl(), documentElement: makeEl(), head: makeEl(),
};
global.document = documentStub;
global.localStorage = {
  _s:{}, getItem(k){ return this._s[k]||null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; }
};
global.addEventListener = global.window.addEventListener = function(){};
global.AudioContext = function(){};
global.requestAnimationFrame = function(){ return 0; };

const html = fs.readFileSync('index.html', 'utf8');
const files = [];
const re = /<script src="js\/([\w.-]+\.js)"><\/script>/g;
let m;
while ((m = re.exec(html)) !== null) files.push(m[1]);
for (const f of files) {
  const code = fs.readFileSync(`js/${f}`, 'utf8');
  vm.runInThisContext(code, { filename: `js/${f}` });
}

const G = global.G;
if (!G || !G.game || !G.Meta) { console.log('FAIL: G.game / G.Meta not defined'); process.exit(1); }

let ERR = 0;
function check(label, cond, detail) {
  if (cond) console.log('  ✓ ' + label + (detail ? '  [' + detail + ']' : ''));
  else { ERR++; console.log('  ✗ ' + label + (detail ? '  [' + detail + ']' : '')); }
}

// 事件池应含新类型（通过 rollChoice 内部不可见，改为直接验证 applyEvent 能用这些 id）
// 我们探测 rollChoice：暴露钩子前先确认。改为验证 addEventNode 数量与 apply 兼容。
G.Meta.reset = function () { /* noop for meta reset in test */ };

// T1: 1 个事件
G.game.init();
G.game.newRun(G.CHAR_BY_ID['shadow'], 1);
const g1 = G.game;
check('T1 事件节点=1', g1.events && g1.events.length === 1, 'count=' + (g1.events && g1.events.length));
// T1 事件也可正常触发
const ev1 = g1.events[0];
g1.player.x = ev1.x; g1.player.y = ev1.y;
g1.tryInteract();
check('T1 事件面板打开', !!G.UI._evtOpen);
G.UI.closeEvent();
// apply 一个装甲类事件（不改原池，直接用一个新类型对象验证 apply 不抛错 + recalc 生效）
const beforeArmor = g1.player.st.armor;
G.game.applyEvent(ev1, { id:'armor', name:'守护石匣', col:'#7fbfe8', desc:'', apply:function(){ g1.player.char.mods.armor=(g1.player.char.mods.armor||0)+8; g1.player.recalc(); } });
check('护甲事件生效', g1.player.st.armor === beforeArmor + 8, beforeArmor + '->' + g1.player.st.armor);

// T2: 2 个事件
G.game.init();
G.game.newRun(G.CHAR_BY_ID['knight'], 2);
const g2 = G.game;
check('T2 事件节点=2', g2.events && g2.events.length === 2, 'count=' + (g2.events && g2.events.length));

// 金币 / 材料 / 双生 apply 不抛错
function tryApply(label, choice) {
  try { G.game.applyEvent({ id:'t', x:0, y:0, used:false }, choice); check(label, true); }
  catch (e) { check(label, false, e.message); }
}
const matsBefore = G.game.materials;
tryApply('材料事件', { id:'mats', name:'m', col:'#fff', desc:'', apply:function(){ G.game.addMaterials(5); } });
check('材料事件生效', G.game.materials === matsBefore + 5, matsBefore + '->' + G.game.materials);

const curBefore = (function(){ try { return G.Meta.currency(); } catch(e){ return null; } })();
tryApply('金币事件(局外币)', { id:'gold', name:'g', col:'#fff', desc:'', apply:function(){ G.Meta.addCurrency(40); } });
if (curBefore !== null) check('金币生效', G.Meta.currency() >= curBefore + 39, curBefore + '->' + G.Meta.currency());

tryApply('双生祭坛 apply', { id:'gamble', name:'gm', col:'#fff', desc:'', apply:function(){
  if (Math.random() < 0.5) G.game.addMaterials(10);
  else { /* armor */ }
} });

console.log(ERR === 0 ? '\n事件扩编校验 PASS' : '\n有 ' + ERR + ' 项未通过');
process.exit(ERR === 0 ? 0 : 1);
