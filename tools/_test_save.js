/* 单存档覆盖语义专项校验：
   - 当前槽位覆盖保存（同样式写回同一档位）
   - 换槽位时各槽位互不覆盖、来回切换进度不丢
   - 读取后能正确恢复
   验证「一个存档入口、覆盖保存、下次点开进度不丢」的本地不变量。 */
'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = global;

function classList(){ const s={}; return { add(c){s[c]=1;}, remove(c){delete s[c];}, toggle(c,f){s[c]=f!==undefined?!!f:!s[c];return !!s[c];}, contains(c){return !!s[c];} }; }
function ctxStub(){ return new Proxy({}, { get(t,k){ if(k==='createImageData'||k==='getImageData') return (w,h)=>({data:new Uint8ClampedArray(((w|0)*(h|0)||1)*4),width:w,height:h}); if(k==='createRadialGradient'||k==='createLinearGradient') return ()=>({addColorStop(){}}); if(k==='putImageData') return ()=>{}; if(k==='measureText') return ()=>({width:40}); if(k in t) return t[k]; return ()=>{}; }, set(t,k,v){t[k]=v;return true;} }); }
function makeEl(){ const style=new Proxy({}, {get(t,k){ if(k==='setProperty') return ()=>{}; return t[k]; }, set(t,k,v){t[k]=v;return true;}}); return { style, dataset:{}, classList:classList(), children:[], innerHTML:'', textContent:'', parentNode:null, appendChild(){}, removeChild(){}, insertBefore(){}, addEventListener(){}, setAttribute(){}, getAttribute(){return null;}, querySelector(){return null;}, querySelectorAll(){return [];}, getContext(){return ctxStub();} }; }
global.document = { readyState:'complete', addEventListener(){}, removeEventListener(){}, createElement(){return makeEl();}, createElementNS(){return makeEl();}, getElementById(){return makeEl();}, querySelector(){return null;}, querySelectorAll(){return [];}, body:makeEl(), documentElement:makeEl(), head:makeEl(), createEvent(){return {initEvent(){}};} };
global.localStorage = { _s:{}, getItem(k){ return this._s.hasOwnProperty(k)?this._s[k]:null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; } };
global.addEventListener = global.window.addEventListener = function(){};
global.Event = function(){};
global.dispatchEvent = function(){};
global.AudioContext = function(){};
global.requestAnimationFrame = function(){ return 0; };

const html = fs.readFileSync('index.html','utf8');
const files = [];
const re = /<script src="js\/([\w.-]+\.js)"><\/script>/g;
let m;
while ((m = re.exec(html)) !== null) files.push(m[1]);
for (const f of files) { vm.runInThisContext(fs.readFileSync(`js/${f}`,'utf8'), {filename:`js/${f}`}); }

const G = global.G;
let ERR = 0;
function check(label, cond, detail){ if(cond) console.log('  ✓ '+label+(detail?'  ['+detail+']':'')); else { ERR++; console.log('  ✗ '+label+(detail?'  ['+detail+']':'')); } }

function clearLS(){ global.localStorage._s = {}; G.Meta.reload(); G.Save.reload(); }

/* 工具：直接写当前 profile 的货币，作为"进度"锚点 */
function setCurrency(v){ G.Meta.get().currency = v; G.Meta.flush(); }
function getCurrency(){ return G.Meta.get().currency; }

// 1) 默认当前槽位 = 1
clearLS();
check('默认槽位=1', G.Storage.currentSlot() === 1, 'slot='+G.Storage.currentSlot());

// 2) 槽位1 覆盖保存：写进度 A→保存→改写 B→再保存，读取仍是 B（覆盖）
clearLS();
setCurrency(100);
G.Storage.saveSlot(1);
setCurrency(999);
G.Storage.saveSlot(1);   // 覆盖当前档位
// 重新加载槽位1 验证是 999 而非 100
G.Save.reload(); G.Meta.reload();
const s1 = G.Storage.slotData(1);
check('槽位1 覆盖保存生效', s1 && s1.profile && s1.profile.meta && s1.profile.meta.currency === 999,
  s1 && s1.profile && s1.profile.meta && JSON.stringify(s1.profile.meta.currency));

// 3) 换槽位互不干扰：槽1=999，另开槽2=50，来回切换不丢
clearLS();
setCurrency(999); G.Storage.saveSlot(1);
G.Storage.loadSlot(2);      // 空槽切换 → 仍本地态
setCurrency(50); G.Storage.saveSlot(2);  // 槽2 存 50
check('当前槽=2 写入 50', G.Storage.slotData(2).profile.meta.currency === 50,
  'slot2='+G.Storage.slotData(2).profile.meta.currency);
G.Storage.loadSlot(1);      // 切回槽1
check('槽1 进度仍 999', getCurrency() === 999, 'cur='+getCurrency());
G.Storage.loadSlot(2);
check('槽2 进度仍 50', getCurrency() === 50, 'cur='+getCurrency());

// 4) slotSummary 快照合理（curve 展示用）
const sm = G.Storage.slotSummary(2);
check('slotSummary 可用', !!sm && typeof sm.currency === 'number', sm && JSON.stringify(sm));

console.log(ERR===0?'\n单存档覆盖语义校验 PASS':'\n有 '+ERR+' 项未通过');
process.exit(ERR===0?0:1);
