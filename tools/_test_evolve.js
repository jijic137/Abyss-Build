/* 武器进化针对性校验：
   - 白→绿升档且扣费正确
   - 费用不足拒绝
   - 红档锁定（不可再进化）
   - 只有武器可进化
   - 红档 weaponMods 额外获得攻击速度词缀
   - 进化后仓库实例持久化 tier 保留 */
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

function freshMeta() {
  G.Meta.reload();
  const d = G.Meta.get();
  d.stash = []; d.currency = 500; d.stats = d.stats || {};
  G.Meta.flush();
}

// 构造一把白档武器入仓
function addWhiteWeapon() {
  const inst = G.makeWeapon('knife', 0);
  inst.type = 'weapon';
  inst.def = G.WEAPON_MAP.knife;
  return G.Meta.addToStash(inst) ? inst : null;
}

// 1) 白→绿 扣费正确
freshMeta();
const w = addWhiteWeapon();
check('白档武器入仓', !!w, w ? ('tier=' + w.tier) : 'null');
const pre = G.Meta.currency();
const r1 = G.Meta.evolveStashWeapon(w);
check('进化到绿档', r1.ok && w.tier === 1, JSON.stringify(r1));
check('扣费=45', G.Meta.currency() === pre - 45, (pre - G.Meta.currency()) + ' 币');

// 2) 费用不足拒绝
freshMeta();
G.Meta.get().currency = 10; G.Meta.flush();
const w2 = addWhiteWeapon();
const r2 = G.Meta.evolveStashWeapon(w2);
check('费用不足拒绝', !r2.ok && w2.tier === 0, JSON.stringify(r2));

// 3) 红档锁定
freshMeta();
const wr = G.Meta.addToStash(G.makeWeapon('knife', 4)) ? G.Meta.stash().slice(-1)[0] : null;
wr.type = 'weapon'; wr.def = G.WEAPON_MAP.knife;
const r3 = G.Meta.evolveStashWeapon(wr);
check('红档拒绝进化', !r3.ok, JSON.stringify(r3));

// 4) 只有武器可进化
freshMeta();
const item = G.ITEM_MAP['cloth_wrap'];
const iInst = { uid: 'i1', defId: item.id, type: 'armor', tier: 0, def: item };
const r4 = G.Meta.evolveStashWeapon(iInst);
check('非武器拒绝', !r4.ok, JSON.stringify(r4));

// 5) 红档 weaponMods 有额外攻击速度
const base = G.weaponMods(G.WEAPON_MAP['knife'], 3);
const red = G.weaponMods(G.WEAPON_MAP['knife'], 4);
check('红档 attackSpeed 词缀', red && (red.attackSpeed || 0) > 0, 'red.attackSpeed=' + (red && red.attackSpeed));
check('红档比紫档多攻速', (red ? red.attackSpeed : 0) > (base ? (base.attackSpeed || 0) : 0));

// 6) 进化后仓库持久化（tier 保留在 stash）
freshMeta();
const w6 = addWhiteWeapon();
G.Meta.evolveStashWeapon(w6);
const inStash = G.Meta.stash().find(s => s.uid === w6.uid);
check('进化后仓库持久化', inStash && inStash.tier === 1, inStash ? ('tier=' + inStash.tier) : 'not found');

console.log(ERR === 0 ? '\n武器进化校验 PASS' : '\n有 ' + ERR + ' 项未通过');
process.exit(ERR === 0 ? 0 : 1);
