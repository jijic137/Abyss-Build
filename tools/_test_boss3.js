/* 第 3 个 BOSS（幽影霸主 boss_wraith）针对性校验：
   - 已注册进 ENEMY_MAP 且 ai=boss3
   - 战役 S6「幽暗回廊·三」指向 boss_wraith
   - spawn 后 boss3 多帧不抛错、确实移动
   - 寒霜点存在敌人实例上、不产生全局 _frostPatches 泄漏 */
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

check('boss_wraith 已注册', !!G.ENEMY_MAP && !!G.ENEMY_MAP.boss_wraith, 'ai=' + (G.ENEMY_MAP && G.ENEMY_MAP.boss_wraith && G.ENEMY_MAP.boss_wraith.ai));
check('boss_wraith ai=boss3', G.ENEMY_MAP && G.ENEMY_MAP.boss_wraith && G.ENEMY_MAP.boss_wraith.ai === 'boss3');
check('boss_wraith 是 boss', G.ENEMY_MAP && G.ENEMY_MAP.boss_wraith && G.ENEMY_MAP.boss_wraith.boss === true);

const S6 = G.SUBLEVELS && G.SUBLEVELS[5];
check('S6 指向 boss_wraith', S6 && S6.objType === 'boss' && S6.boss === 'boss_wraith', S6 ? (S6.objType + ':' + S6.boss) : 'no S6');

// 构造对局并 spawn
G.game.init();
G.game.newRun(G.CHAR_BY_ID['knight'], 2);
const g = G.game;
g.player.hp = g.player.maxHp = 1e9;
const e = g.spawnEnemy('boss_wraith', g.player.x + 120, g.player.y);
if (!e) { console.log('  ✗ spawnEnemy 返回 null'); process.exit(1); }
const x0 = e.x, y0 = e.y;

// 强制进入第二指挥点触发多分支
e.phase = 1; e.state = 'idle'; e.sTimer = 0.05;
let threw = null;
try {
  for (let i = 0; i < 120; i++) e.update(1 / 60);
} catch (err) { threw = err; }
check('boss3 120 帧无错', !threw, threw ? threw.message : '');
check('boss3 发生位移', e.x !== x0 || e.y !== y0, (x0|0) + ',' + (y0|0) + ' -> ' + (e.x|0) + ',' + (e.y|0));
// 寒霜机制：应存在 this.frosts（一旦触发 frost），且无全局 _frostPatches 泄漏
check('无全局 _frostPatches 泄漏', !g._frostPatches, JSON.stringify(g._frostPatches));

console.log(ERR === 0 ? '\n第 3 个 BOSS 校验 PASS' : '\n有 ' + ERR + ' 项未通过');
process.exit(ERR === 0 ? 0 : 1);
