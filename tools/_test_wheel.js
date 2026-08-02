/* 聚焦验证：加载全部脚本 → 打开轮盘角色选择 → 驱动若干帧，确认无运行时错误。
   复用 _smoke_waves.js 的 DOM/Canvas 桩，但用受控 rAF 限制帧数（避免无限循环）。
   用法：node _test_wheel.js
*/
'use strict';
const fs = require('fs');
const vm = require('vm');
function classList() {
  const s = {};
  return { add(c){ s[c]=1; }, remove(c){ delete s[c]; },
    toggle(c,f){ if(f===undefined) f=!s[c]; if(f) s[c]=1; else delete s[c]; return !!f; },
    contains(c){ return !!s[c]; } };
}
function ctxStub() {
  return new Proxy({}, { get(t,k){
    if(k==='createImageData'||k==='getImageData') return (w,h)=>({ data:new Uint8ClampedArray(((w|0)*(h|0)||1)*4), width:w, height:h });
    if(k==='createRadialGradient'||k==='createLinearGradient') return ()=>({ addColorStop(){} });
    if(k in t) return t[k]; return ()=>{}; }, set(t,k,v){ t[k]=v; return true; } });
}
function makeEl() {
  const styleStub = new Proxy({}, { get(t,k){ if(k==='setProperty') return ()=>{}; return t[k]; }, set(t,k,v){ t[k]=v; return true; } });
  const t = { style: styleStub, dataset:{}, classList: classList(), children:[] };
  return new Proxy(t, { get(o,k){
    if(k==='childElementCount') return o.children.length;
    if(k==='textContent') return o._text||'';
    if(k==='appendChild') return n=>{ o.children.push(n); return n; };
    if(k==='removeChild') return n=>{ const i=o.children.indexOf(n); if(i>=0) o.children.splice(i,1); };
    if(['addEventListener','removeEventListener','setAttribute','getAttribute','focus','blur'].includes(k)) return ()=>{};
    if(k==='getContext') return ()=>ctxStub();
    if(k==='getBoundingClientRect') return ()=>({left:0,top:0,width:100,height:100});
    if(k==='querySelector') return ()=>makeEl();
    if(k==='querySelectorAll') return ()=>[];
    if(k in o) return o[k]; return undefined;
  }, set(o,k,v){ o[k]=v; if(k==='textContent') o._text=v; return true; } });
}
const elCache = {};
const body = makeEl();
const docStub = { getElementById(id){ return elCache[id] || (elCache[id]=makeEl()); }, createElement(){ return makeEl(); }, addEventListener(){}, readyState:'complete', body };
const mem = {};
global.window = global;
global.addEventListener = ()=>{};
global.removeEventListener = ()=>{};
global.document = docStub;
global.performance = { now:()=>Date.now() };
let rafN = 0;
global.requestAnimationFrame = (cb) => { if (rafN++ < 200) { try { cb(performance.now()+rafN*16); } catch(e){ console.error('RAF ERROR:', e); process.exit(3);} } return rafN; };
global.cancelAnimationFrame = ()=>{};
global.localStorage = { getItem(k){ return k in mem?mem[k]:null; }, setItem(k,v){ mem[k]=String(v); }, removeItem(k){ delete mem[k]; } };
global.devicePixelRatio = 1;
global.innerWidth = 1280; global.innerHeight = 720;

try {
  for (const f of ['00_util','12_audio','01_pixel','02_stats','03_items','04_weapons','05_enemies','06_entities','07_player','07b_enemy','08_shop','09_ui','10_game','11_main'])
    vm.runInThisContext(fs.readFileSync(`js/${f}.js`,'utf8'), { filename:`js/${f}.js` });
  console.log('LOAD OK');
  G.UI.showScreen('scrTitle');
  console.log('showScreen(scrTitle) OK');
  G.UI.renderCharWheel(function (ch) { /* onPick */ });
  console.log('renderCharWheel OK; items=', G.UI._wheel.items.length);
  // 模拟用户旋转与选中
  G.UI.selectWheelIndex(3);
  G.UI.selectWheelIndex(7);
  G.UI._wheel.spinning = false;
  // 再驱动若干帧（rAF 已在 renderCharWheel 内启动，这里手动补帧）
  for (let i=0;i<30;i++){ if (G.UI._wheel.active) { /* 触发一次布局选择检测 */ G.UI._wheel.rot += (G.UI._wheel.targetRot-G.UI._wheel.rot)*0.16; } }
  console.log('wheel drive OK; selected=', G.UI._wheel.selected);
  G.UI.showScreen('scrCharSelect');
  console.log('showScreen(scrCharSelect) OK');
  G.UI.stopWheel();
  console.log('stopWheel OK');
  console.log('ALL OK');
  process.exit(0);
} catch (e) {
  console.error('THROW:', e && e.stack || e);
  process.exit(2);
}
