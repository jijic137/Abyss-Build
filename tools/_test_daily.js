/* 每日挑战针对性校验：
   - Daily.seed 返回确定性数字
   - 设 _daily 后 newRun 把 _dailySeed 作为地图盐（同日期同地图）
   - 结算撤离成功写入 Meta.daily，且当日仅一次不覆盖
   - Daily.status() 正确反映当日是否已结算 */
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

if (!G.Daily) { console.log('  ✗ G.Daily 未定义'); process.exit(1); }

// 1) seed 确定性数字
const seed = G.Daily.seed();
check('Daily.seed 是数字', typeof seed === 'number' && isFinite(seed), 'seed=' + seed);

// 2) daily 存档默认 null
console.log('  DEBUG daily at fresh =', JSON.stringify(G.Meta.get().daily));
check('daily 默认 null', G.Meta.get().daily === null, JSON.stringify(G.Meta.get().daily));

// 3) _daily 下 newRun 把日期盐传到地图
G.game.init();
G.game._daily = { seed: 12345, tier: 1, date: 20260822 };
G.game.newRun(G.CHAR_BY_ID['shadow'], 1);
const g = G.game;
check('newRun 设置 _dailySeed=12345', g._dailySeed === 12345, 'seed=' + g._dailySeed);
check('地图 salt=12345', g.map && g.map.salt === 12345, 'salt=' + (g.map && g.map.salt));

// 4) 结算撤离成功写入 daily
G.Meta.reload();
G.Meta.get().daily = null;
G.game._daily = { seed: 12345, tier: 1, date: G.Daily.today() };
// 模拟 showResult 撤离成功
G.UI.showResult(g, true, {});
const d1 = G.Meta.get().daily;
check('结算写入 daily', d1 && d1.date === G.Daily.today() && d1.win === true, JSON.stringify(d1));

// 5) 当日仅记录一次，不覆盖
const before = JSON.parse(JSON.stringify(G.Meta.get().daily));
G.UI.showResult(G.game, true, {});
const after = G.Meta.get().daily;
check('当日不覆盖', JSON.stringify(after) === JSON.stringify(before), JSON.stringify(after));

// 6) status() 反映当日已结算
G.Daily.today = function(){ return d1.date; };
check('Daily.status 非空', !!G.Daily.status(), JSON.stringify(G.Daily.status()));

console.log(ERR === 0 ? '\n每日挑战校验 PASS' : '\n有 ' + ERR + ' 项未通过');
process.exit(ERR === 0 ? 0 : 1);
