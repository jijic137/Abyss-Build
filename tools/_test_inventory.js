/* 背包格子系统专项校验：
   - 背包容量恒 7×3=21（G.BAG_* 与 G.Inv2 一致）
   - adapt() 在不同视口宽度下都不改背包列/行（唯一事实源）
   - 占格满 21 后 addBagItem 拒绝，容量与显示一致 */
'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = global;

function classList(){ const s={}; return { add(c){s[c]=1;}, remove(c){delete s[c];}, toggle(c,f){s[c]=f!==undefined?!!f:!s[c];return !!s[c];}, contains(c){return !!s[c];} }; }
function ctxStub(){ return new Proxy({}, { get(t,k){ if(k==='createImageData'||k==='getImageData') return (w,h)=>({data:new Uint8ClampedArray(((w|0)*(h|0)||1)*4),width:w,height:h}); if(k==='createRadialGradient'||k==='createLinearGradient') return ()=>({addColorStop(){}}); if(k==='putImageData') return ()=>{}; if(k==='measureText') return ()=>({width:40}); if(k in t) return t[k]; return ()=>{}; }, set(t,k,v){t[k]=v;return true;} }); }
function makeEl(){ const style=new Proxy({}, {get(t,k){ if(k==='setProperty') return ()=>{}; return t[k]; }, set(t,k,v){t[k]=v;return true;}}); return { style, dataset:{}, classList:classList(), children:[], innerHTML:'', textContent:'', parentNode:null, appendChild(){}, removeChild(){}, insertBefore(){}, addEventListener(){}, setAttribute(){}, getAttribute(){return null;}, querySelector(){return null;}, querySelectorAll(){return [];}, getContext(){return ctxStub();} }; }
global.document = { readyState:'complete', addEventListener(){}, removeEventListener(){}, createElement(){return makeEl();}, createElementNS(){return makeEl();}, getElementById(){return makeEl();}, querySelector(){return null;}, querySelectorAll(){return [];}, body:makeEl(), documentElement:makeEl(), head:makeEl() };
global.localStorage = { _s:{}, getItem(k){return this._s[k]||null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} };
global.addEventListener = global.window.addEventListener = function(){};
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

// 1) 三要素一致且=21
check('BAG 7×3=21', G.BAG_COLS===7 && G.BAG_ROWS===3 && G.BAG_CELLS===21, G.BAG_COLS+'x'+G.BAG_ROWS+'='+G.BAG_CELLS);
check('Inv2 与 BAG 一致', G.Inv2.bagCols===7 && G.Inv2.bagRows===3, G.Inv2.bagCols+'x'+G.Inv2.bagRows);
check('cellsFor=21', G.Inv2.cellsFor('bag')===21, 'cells='+G.Inv2.cellsFor('bag'));

// 2) adapt 不同视口不改列/行，只改格子尺寸
const before = { c:G.Inv2.bagCols, r:G.Inv2.bagRows };
for (const w of [360,480,600,800,1200,1600]) {
  global.window.innerWidth = w;
  G.Inv2.adapt();
}
check('adapt 不改背包列', G.Inv2.bagCols===before.c, G.Inv2.bagCols+' vs '+before.c);
check('adapt 不改背包行', G.Inv2.bagRows===before.r, G.Inv2.bagRows+' vs '+before.r);

// 3) 满 21 后拒绝 + 容量一致
G.game.init();
G.game.newRun(G.CHAR_BY_ID['ranger'], 1);
const g = G.game, p = g.player;
p.maxHp = p.hp = 1e9;
let filled = 0;
while (filled < 100) {
  const it = G.makeItem('clover', 0);
  if (!G.addBagItem(it)) break;
  filled++;
}
check('可放入 21 件 1x1', filled === 21, 'filled='+filled);
check('容量=21 且未超', G.invCells(g.bag) === 21, 'cells='+G.invCells(g.bag));
const extra = G.makeItem('clover', 0);
check('满时 addBagItem 拒绝', G.addBagItem(extra) === false);

console.log(ERR===0?'\n格子系统校验 PASS':'\n有 '+ERR+' 项未通过');
process.exit(ERR===0?0:1);
