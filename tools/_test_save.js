/* 无浏览器环境下验证：存档序列化/续局恢复 + newRun 不再污染全局角色定义 */
'use strict';
const fs = require('fs');
const vm = require('vm');

/* ---------- DOM / Canvas 桩 ---------- */
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
      if(k==='putImageData') return ()=>{};
      if(k in t) return t[k];
      return ()=>{};
    },
    set(t,k,v){ t[k]=v; return true; }
  });
}
function makeEl() {
  const styleStub = new Proxy({}, {
    get(t,k){ if(k==='setProperty') return ()=>{}; return t[k]; },
    set(t,k,v){ t[k]=v; return true; }
  });
  const t = { style: styleStub, dataset:{}, classList: classList(), children:[] };
  return new Proxy(t, {
    get(o,k){
      if(k==='childElementCount') return o.children.length;
      if(k==='textContent') return o._text||'';
      if(k==='appendChild') return n=>{ o.children.push(n); return n; };
      if(k==='removeChild') return n=>{ const i=o.children.indexOf(n); if(i>=0) o.children.splice(i,1); };
      if(['addEventListener','removeEventListener','setAttribute','getAttribute','focus','blur'].includes(k)) return ()=>{};
      if(k==='getContext') return ()=>ctxStub();
      if(k==='getBoundingClientRect') return ()=>({left:0,top:0,width:100,height:100});
      if(k==='querySelector') return ()=>makeEl();
      if(k==='querySelectorAll') return ()=>[];
      if(k in o) return o[k];
      return undefined;
    },
    set(o,k,v){ o[k]=v; if(k==='textContent') o._text=v; return true; }
  });
}
const elCache = {};
const docStub = {
  getElementById(id){ return elCache[id] || (elCache[id]=makeEl()); },
  createElement(){ return makeEl(); },
  addEventListener(){}, readyState:'complete'
};
const mem = {};
const lsStub = {
  getItem(k){ return k in mem ? mem[k] : null; },
  setItem(k,v){ mem[k]=String(v); },
  removeItem(k){ delete mem[k]; }
};

/* ---------- 全局环境 ---------- */
global.window = global;
global.addEventListener = ()=>{};
global.removeEventListener = ()=>{};
global.document = docStub;
global.performance = { now:()=>Date.now() };
global.requestAnimationFrame = ()=>0;
global.localStorage = lsStub;
global.devicePixelRatio = 1;
global.innerWidth = 1280; global.innerHeight = 720;
// 不定义 AudioContext → 音频自动降级为 no-op

/* ---------- 顺序加载脚本 ---------- */
const files = ['00_util','12_audio','01_pixel','02_stats','03_items','04_weapons','05_enemies',
               '06_entities','07_player','07b_enemy','08_shop','09_ui','10_game','11_main'];
for(const f of files){
  const code = fs.readFileSync(`js/${f}.js`,'utf8');
  vm.runInThisContext(code, { filename:`js/${f}.js` });
}

/* ---------- 断言工具 ---------- */
let pass=0, fail=0;
function ok(name, cond){ if(cond){ pass++; console.log('  ✓ '+name); } else { fail++; console.log('  ✗ '+name); } }

/* ---------- 1. 全局角色定义不被 newRun 污染 ---------- */
console.log('\n[1] newRun 克隆角色定义：');
const mageDef = G.CHAR_BY_ID['mage'];
const beforeMods = JSON.stringify(mageDef.mods);
G.game.init();
G.game.newRun(mageDef);
// 模拟一次升级写回（与 10_game.openLevelUp 同款操作）
G.game.player.char.mods.maxHp = (G.game.player.char.mods.maxHp||0) + 99;
const afterMods = JSON.stringify(mageDef.mods);
ok('升级写回未污染全局 G.CHAR_BY_ID.mage.mods', beforeMods === afterMods);
ok('玩家自身携带了 +99 maxHp', G.game.player.char.mods.maxHp === (JSON.parse(beforeMods).maxHp + 99));

/* ---------- 2. 构建一套构筑并存盘 ---------- */
console.log('\n[2] 存档序列化：');
const p = G.game.player;
p.addItem(G.ITEMS[0]);
p.addItem(G.ITEMS[1]);
p.addWeapon(G.makeWeapon(G.WEAPONS[2].id, 2));
p.level = 4; p.xp = 50; p.pendingLevels = 2; p.hp = 33;
G.game.wave = 3; G.game.materials = 123; G.game.runTime = 55.5;
G.game.saveRun();

const data = G.Save.getRun();
ok('存盘存在', !!data);
ok('charId 正确', data && data.charId === 'mage');
ok('weapons 快照 = 起手1 + 添加1 = 2', data && data.weapons.length === 2);
ok('items 快照 = 2', data && data.items.length === 2);
ok('wave 快照 = 3', data && data.wave === 3);
ok('materials 快照 = 123', data && data.materials === 123);
ok('level 快照 = 4', data && data.level === 4);
ok('pendingLevels 快照 = 2', data && data.pendingLevels === 2);
ok('charMods 携带升级', data && data.charMods.maxHp === (JSON.parse(beforeMods).maxHp + 99));

/* ---------- 3. 续局恢复 ---------- */
console.log('\n[3] 续局恢复：');
// 清掉旧玩家，模拟从标题读档
G.game.player = null;
const okResume = G.game.resumeRun(data);
ok('resumeRun 返回 true', okResume === true);
const rp = G.game.player;
ok('恢复后职业 = mage', rp && rp.char.id === 'mage');
ok('恢复后 weapons = 2', rp && rp.weapons.length === 2);
ok('恢复后 items = 2', rp && rp.items.length === 2);
ok('恢复后 wave = 3', G.game.wave === 3);
ok('恢复后 materials = 123', G.game.materials === 123);
ok('恢复后 level = 4', rp && rp.level === 4);
ok('恢复后 pendingLevels = 2', rp && rp.pendingLevels === 2);
ok('恢复后 charMods 含升级', rp && rp.char.mods.maxHp === (JSON.parse(beforeMods).maxHp + 99));
ok('存档已再次写入（openShop 内 saveRun）', !!G.Save.getRun());
ok('state 进入 shop', G.game.state === 'shop');

/* ---------- 4. 设置存档往返 ---------- */
console.log('\n[4] 设置存档：');
G.Save.setSettings({ volume:0.3, shake:0.6 });
const s = G.Save.getSettings();
ok('volume = 0.3', s.volume === 0.3);
ok('shake = 0.6', s.shake === 0.6);
// 重开新档应覆盖默认
G.Save.setSettings({ volume:0.5 });
ok('部分更新只改 volume', G.Save.getSettings().volume === 0.5 && G.Save.getSettings().shake === 0.6);

/* ---------- 5. 死亡清除续局 ---------- */
console.log('\n[5] 死亡/通关清除续局：');
G.Save.saveRun(data);
ok('存盘存在（清理前）', !!G.Save.getRun());
G.game.onVictory();
ok('通关后续局被清除', !G.Save.getRun());

/* ---------- 结果 ---------- */
console.log(`\n结果：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);
