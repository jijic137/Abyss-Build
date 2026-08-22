/* 套装系统针对性校验：加载整套脚本（同 smoke 的解析方式），
   构造穿同套装不同件数的玩家并断言 recalc 的属性和 sp 叠加。 */
'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = global;

/* ---------- DOM / Canvas 桩（从 _smoke_waves.js 复用精简版） ---------- */
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
  return { style, dataset:{}, classList: classList(), children:[], appendChild(){}, removeChild(){},
    addEventListener(){}, setAttribute(){}, getAttribute(){ return null; }, focus(){}, blur(){},
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    getContext(){ return ctxStub(); }, cloneNode(){ return makeEl(); } };
}
const documentStub = {
  readyState: 'complete',
  addEventListener(){}, removeEventListener(){},
  createElement(){ return makeEl(); }, createElementNS(){ return makeEl(); },
  getElementById(){ return makeEl(); }, querySelector(){ return null; },
  querySelectorAll(){ return []; }, body: makeEl(), documentElement: makeEl(),
  head: makeEl(),
};
global.document = documentStub;
global.localStorage = {
  _s:{}, getItem(k){ return this._s[k]||null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; }
};
global.addEventListener = global.window.addEventListener = function(){};
global.AudioContext = function(){};
global.requestAnimationFrame = function(cb){ return 0; };

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
if (!G || !G.Player || !G.SETS) { console.log('FAIL: G.Player or G.SETS not defined'); process.exit(1); }

let ERR = 0;
function check(label, cond, detail) {
  if (cond) console.log('  ✓ ' + label + (detail ? '  [' + detail + ']' : ''));
  else { ERR++; console.log('  ✗ ' + label + (detail ? '  [' + detail + ']' : '')); }
}

// 5 套 set must exist
check('5 套定义', Object.keys(G.SETS).length === 5, Object.keys(G.SETS).join(','));

// 用临时角色构造玩家，再覆写 items 并 recalc
function makePlayer(setItems) {
  const p = new G.Player({ id: 'test', name: '测试', mods: {} });
  p.items = setItems.map(def => ({ mods: Object.assign({}, def.mods), sp: def.sp, set: def.set }));
  p.recalc();
  return p;
}

const IG = G.ITEM_MAP;
const iron2 = makePlayer([IG.iron_plate, IG.tin_helm]);
check('铁卫 2 件 armor=8', iron2.st.armor >= 8, 'armor=' + iron2.st.armor);
check('铁卫 2 件 setTiers=2', iron2.setTiers.iron_guard === 2, JSON.stringify(iron2.setTiers));

const iron3 = makePlayer([IG.iron_plate, IG.tin_helm, IG.tac_vest]);
check('铁卫 3 件 armor=18', iron3.st.armor >= 18, 'armor=' + iron3.st.armor);
check('铁卫 3 件 maxHp bonus', iron3.st.maxHp >= 40, 'maxHp=' + iron3.st.maxHp);
check('铁卫 3 件 setTiers=3', iron3.setTiers.iron_guard === 3, JSON.stringify(iron3.setTiers));

// elemental 3 件应激活 frostAura sp
const elem3 = makePlayer([IG.matchbox, IG.frost_aura, IG.storm_brand]);
check('元素 set sp 激活', !!elem3.sp.frostAura, 'sp=' + JSON.stringify(elem3.sp));
check('元素 setSpActive', JSON.stringify(elem3.setSpActive.elemental || []).indexOf('frostAura') >= 0, JSON.stringify(elem3.setSpActive.elemental));

// shadow 2 件
const sh2 = makePlayer([IG.crow_feather, IG.feather_boot]);
check('暗影 2 件 dodge=4', sh2.st.dodge >= 4, 'dodge=' + sh2.st.dodge);
check('暗影 2 件 speed=3', sh2.st.speed >= 3, 'speed=' + sh2.st.speed);

// dodge: 66 提供的方法
check('66 dodgeReady 存在', typeof G.Player.prototype.dodgeReady === 'function');
check('66 update 保留原版', G.Player.prototype.update.toString().indexOf('_origUpdate.call') >= 0);

// 68 hud 应挂到 G.HUD68
check('68 HUD68 挂载', !!G.HUD68 && typeof G.HUD68.decorate === 'function');

console.log(ERR === 0 ? '\n套装/闪避/HUD 校验 PASS' : '\n有 ' + ERR + ' 项未通过');
process.exit(ERR === 0 ? 0 : 1);
