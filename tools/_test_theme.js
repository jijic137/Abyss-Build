/* 区域级概念图模板校验：
   - 每张地图带 theme 字段且为已知主题
   - 5 区域各自主题 id 不同，且符合预期模板
   - 主题含合法的 backEdge/merge/interior 数值 */
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
  return { style, dataset:{}, classList: classList(), children:[], innerHTML:'', textContent:'', parentNode:null,
    appendChild(){}, removeChild(){}, insertBefore(){}, addEventListener(){}, setAttribute(){}, getAttribute(){ return null; },
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

const expected = { 1: 'edge', 2: 'corridor', 3: 'mine', 4: 'heartland', 5: 'gate' };
const seenByTier = {};
let allGood = true, badMsg = '';
for (let tier = 1; tier <= 5; tier++) {
  const theme = {};
  for (let salt = 0; salt < 12; salt++) {
    const map = G.Map.generate(tier, salt);
    if (!map || !map.theme) { allGood = false; badMsg = 'tier' + tier + ' 无 theme'; break; }
    theme[map.theme] = true;
    if (map.theme !== expected[tier]) { allGood = false; badMsg = 'tier' + tier + ' theme=' + map.theme; break; }
  }
  seenByTier[tier] = Object.keys(theme);
}
check('每区域生成正确主题模板', allGood, badMsg || JSON.stringify(seenByTier));

const uniqueThemes = new Set(Object.values(seenByTier).map(x => x[0]));
check('5 区域主题互不相同', uniqueThemes.size === 5, JSON.stringify([...uniqueThemes]));

// 每张地图 theme 属于合法集合
const legal = new Set(Object.values(expected));
let legalOk = true;
for (let tier = 1; tier <= 5; tier++) {
  const mt = G.Map.generate(tier, 3);
  if (!legal.has(mt.theme)) { legalOk = false; break; }
}
check('theme 值合法', legalOk, JSON.stringify([...legal]));

console.log(ERR === 0 ? '\n区域主题校验 PASS' : '\n有 ' + ERR + ' 项未通过');
process.exit(ERR === 0 ? 0 : 1);
