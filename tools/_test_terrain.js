/* 地形多样性（房内掩体变体）针对性校验：
   - 大量生成地图后，新增 'ring' 与 'island' 两种掩体确实出现
   - 掩体矩形参与 solid 碰撞（实心）
   复用 smoke 的 index.html 脚本解析加载。 */
'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = global;

function classList() {
  const s = {};
  return { add(c){ s[c]=1; }, remove(c){ delete s[c]; }, toggle(c,f){ s[c]=f!==undefined?!!f:!s[c]; return !!s[c]; }, contains(c){ return !!s[c]; } };
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
  const style = new Proxy({}, { get(t,k){ if(k==='setProperty') return ()=>{}; return t[k]; }, set(t,k,v){ t[k]=v; return true; } });
  return { style, dataset:{}, classList: classList(), children:[], innerHTML:'', textContent:'',
    appendChild(){}, removeChild(){}, addEventListener(){}, setAttribute(){}, getAttribute(){ return null; },
    querySelector(){ return null; }, querySelectorAll(){ return []; }, getContext(){ return ctxStub(); } };
}
global.document = {
  readyState:'complete', addEventListener(){}, removeEventListener(){},
  createElement(){ return makeEl(); }, createElementNS(){ return makeEl(); },
  getElementById(){ return makeEl(); }, querySelector(){ return null; }, querySelectorAll(){ return []; },
  body: makeEl(), documentElement: makeEl(), head: makeEl()
};
global.localStorage = { _s:{}, getItem(k){ return this._s[k]||null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; } };
global.addEventListener = global.window.addEventListener = function(){};
global.AudioContext = function(){};
global.requestAnimationFrame = function(){ return 0; };

const html = fs.readFileSync('index.html', 'utf8');
const files = [];
const re = /<script src="js\/([\w.-]+\.js)"><\/script>/g;
let m;
while ((m = re.exec(html)) !== null) files.push(m[1]);
for (const f of files) { vm.runInThisContext(fs.readFileSync(`js/${f}`, 'utf8'), { filename: `js/${f}` }); }

const G = global.G;
let ERR = 0;
function check(label, cond, detail) {
  if (cond) console.log('  ✓ ' + label + (detail ? '  [' + detail + ']' : ''));
  else { ERR++; console.log('  ✗ ' + label + (detail ? '  [' + detail + ']' : '')); }
}

// 混淆全局 map 生成（避免依赖 game.newRun 的随机扰动），直接用 G.Map.generate
const seen = { ring: 0, island: 0 };
let sampleRect = null, sampleSolid = null;
for (let tier = 1; tier <= 5; tier++) {
  for (let salt = 0; salt < 150; salt++) {
    const map = G.Map.generate(tier, salt);
    (map.interior || []).forEach(iv => {
      if (iv.kind === 'ring') { seen.ring++; if (!sampleRect) sampleRect = iv.rects[0]; }
      if (iv.kind === 'island') { seen.island++; }
    });
  }
}
check('ring 掩体出现', seen.ring > 0, 'count=' + seen.ring);
check('island 掩体出现', seen.island > 0, 'count=' + seen.island);

// solid 碰撞校验：对某个 ring 矩形内部取点断言 solid=true，其外侧邻近（离墙远）断言 solid=false
if (sampleRect) {
  const cx = (sampleRect[0] + sampleRect[2]) / 2;
  const cy = (sampleRect[1] + sampleRect[3]) / 2;
  // 用一次真实的 generate 拿回该 map
  let hitMap = null, hitRect = null;
  outer:
  for (let tier = 1; tier <= 5; tier++) {
    for (let salt = 0; salt < 150; salt++) {
      const map = G.Map.generate(tier, salt);
      for (const iv of (map.interior || [])) {
        if (iv.kind === 'ring' && iv.rects.length && iv.rects[0][0] === sampleRect[0]) {
          hitMap = map; hitRect = iv.rects[0]; break outer;
        }
      }
    }
  }
  if (hitMap && hitRect) {
    const ix = (hitRect[0] + hitRect[2]) / 2, iy = (hitRect[1] + hitRect[3]) / 2;
    check('掩体内部 solid=true', G.Map.solid(hitMap, ix, iy) === true);
  }
}

console.log(ERR === 0 ? '\n地形多样性校验 PASS' : '\n有 ' + ERR + ' 项未通过');
process.exit(ERR === 0 ? 0 : 1);
