/* 新敌人行为 orbit（咒环虫）针对性校验：
   - hexfly 已注册进 ENEMY_MAP
   - 敌人 AI 走 orbit 分支多帧不抛错、确实移动
   复用 smoke 加载方式。 */
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

check('hexfly 已注册', !!G.ENEMY_MAP && !!G.ENEMY_MAP.hexfly, 'ai=' + (G.ENEMY_MAP && G.ENEMY_MAP.hexfly && G.ENEMY_MAP.hexfly.ai));
check('hexfly ai=orbit', G.ENEMY_MAP && G.ENEMY_MAP.hexfly && G.ENEMY_MAP.hexfly.ai === 'orbit');

// 构造完整对局，方便 spawn
G.game.init();
G.game.newRun(G.CHAR_BY_ID['knight'], 5);
const g = G.game;
g.player.hp = g.player.maxHp = 1e9;

const def = G.ENEMY_MAP.hexfly;
const e = g.spawnEnemy('hexfly', g.player.x + 60, g.player.y);
if (!e) { console.log('  ✗ spawnEnemy 返回 null'); process.exit(1); }
const x0 = e.x, y0 = e.y;

// 驱动若干帧，使 orbit 分支多次执行（含 moveTo、fireT 递减、shoot）
let threw = null;
try {
  for (let i = 0; i < 60; i++) {
    e.update(1 / 60); // 走 ai + 分轴移动 + 碰撞的完整真实路径
  }
} catch (err) { threw = err; }
check('orbit 分支 60 帧无错', !threw, threw ? threw.message : '');
check('hexfly 发生位移', e.x !== x0 || e.y !== y0, (x0|0) + ',' + (y0|0) + ' -> ' + (e.x|0) + ',' + (e.y|0));

console.log(ERR === 0 ? '\n新敌人 orbit 校验 PASS' : '\n有 ' + ERR + ' 项未通过');
process.exit(ERR === 0 ? 0 : 1);
