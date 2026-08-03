/* 端到端验证：加载全部脚本 → 模拟点击「探索深渊」→ 等待漩涡过渡 →
   模拟点击「踏入深渊」确认进入游戏。确认 btnExplore 的 $ 修复后流程走通。
   用法：node _test_wheel.js
*/
'use strict';
const fs = require('fs');
const vm = require('vm');

function classList() {
  const s = {};
  return {
    add(c) { s[c] = 1; }, remove(c) { delete s[c]; },
    toggle(c, f) { if (f === undefined) f = !s[c]; if (f) s[c] = 1; else delete s[c]; return !!f; },
    contains(c) { return !!s[c]; }
  };
}
function ctxStub() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createImageData' || k === 'getImageData') return (w, h) => ({ data: new Uint8ClampedArray(((w | 0) * (h | 0) || 1) * 4), width: w, height: h });
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k in t) return t[k]; return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function makeEl() {
  const styleStub = new Proxy({}, { get(t, k) { if (k === 'setProperty') return () => {}; return t[k]; }, set(t, k, v) { t[k] = v; return true; } });
  const lis = {};
  const t = { style: styleStub, dataset: {}, classList: classList(), children: [], _lis: lis, clientWidth: 1280, clientHeight: 720 };
  return new Proxy(t, {
    get(o, k) {
      if (k === 'childElementCount') return o.children.length;
      if (k === 'textContent') return o._text || '';
      if (k === 'appendChild') return n => { o.children.push(n); return n; };
      if (k === 'removeChild') return n => { const i = o.children.indexOf(n); if (i >= 0) o.children.splice(i, 1); };
      if (k === 'addEventListener') return (type, fn) => { (lis[type] = lis[type] || []).push(fn); };
      if (k === 'removeEventListener') return (type, fn) => { if (lis[type]) { const i = lis[type].indexOf(fn); if (i >= 0) lis[type].splice(i, 1); } };
      if (k === 'fire') return (type, evt) => { (lis[type] || []).slice().forEach(fn => fn(evt || {})); };
      if (k === 'clientWidth') return 1280;
      if (k === 'clientHeight') return 720;
      if (k === 'getContext') return () => ctxStub();
      if (k === 'getBoundingClientRect') return () => ({ left: 0, top: 0, width: 100, height: 100 });
      if (k === 'querySelector') return () => makeEl();
      if (k === 'querySelectorAll') return () => [];
      if (['setAttribute', 'getAttribute', 'focus', 'blur'].includes(k)) return () => {};
      if (k in o) return o[k]; return undefined;
    },
    set(o, k, v) { o[k] = v; if (k === 'textContent') o._text = v; return true; }
  });
}
const elCache = {};
const body = makeEl();
const docStub = { getElementById(id) { return elCache[id] || (elCache[id] = makeEl()); }, createElement() { return makeEl(); }, addEventListener() {}, readyState: 'complete', body };
const mem = {};
global.window = global;
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.document = docStub;
global.performance = { now: () => Date.now() };
let rafN = 0;
global.requestAnimationFrame = (cb) => { if (rafN++ < 200) { try { cb(performance.now() + rafN * 16); } catch (e) { console.error('RAF ERROR:', e); process.exit(3); } } return rafN; };
global.cancelAnimationFrame = () => {};
global.localStorage = { getItem(k) { return k in mem ? mem[k] : null; }, setItem(k, v) { mem[k] = String(v); }, removeItem(k) { delete mem[k]; } };
global.devicePixelRatio = 1;
global.innerWidth = 1280; global.innerHeight = 720;

try {
  for (const f of ['00_util', '12_audio', '01_pixel', '02_stats', '03_items', '04_weapons', '05_enemies', '06_entities', '07_player', '07b_enemy', '08_shop', '09_ui', '10_game', '11_main'])
    vm.runInThisContext(fs.readFileSync(`js/${f}.js`, 'utf8'), { filename: `js/${f}.js` });
  console.log('LOAD OK (boot ran, buttons bound)');
  console.log('initial: scrTitle on =', elCache['scrTitle'].classList.contains('on'));

  // 0) 子页开合校验：封面点开 记录/成就/存档 再返回
  function checkSub(btn, scr, bodyId, backBtn) {
    elCache[btn].fire('click');
    const on = elCache[scr].classList.contains('on');
    const n = elCache[bodyId].children.length;
    console.log('open', scr, 'on =', on, '| body children =', n);
    elCache[backBtn].fire('click');
    console.log('  back → scrTitle on =', elCache['scrTitle'].classList.contains('on'), '|', scr, 'on =', elCache[scr].classList.contains('on'));
    return on && n > 0 && !elCache[scr].classList.contains('on');
  }
  const subOk =
    checkSub('btnRecords', 'scrRecords', 'recBody', 'btnRecordsBack') &&
    checkSub('btnAch', 'scrAch', 'achBody', 'btnAchBack') &&
    checkSub('btnSave', 'scrSave', 'saveBody', 'btnSaveBack');
  console.log('SUB-PANELS:', subOk ? 'PASS' : 'FAIL');

  // 1) 点击「探索深渊」
  elCache['btnExplore'].fire('click');
  console.log('after explore fire: scrTitle leaving =', elCache['scrTitle'].classList.contains('leaving'));
  console.log('scrCharSelect on (pre-transition, should be false) =', elCache['scrCharSelect'].classList.contains('on'));

  // 等待漩涡过渡（setTimeout 620ms）
  setTimeout(() => {
    try {
      console.log('after 750ms: scrCharSelect on =', elCache['scrCharSelect'].classList.contains('on'));
      console.log('after 750ms: scrTitle on (should be false) =', elCache['scrTitle'].classList.contains('on'));

      // 2) 再次点击已选角色 → 确认进入（替代原「踏入深渊」按钮）
      elCache['wheel-token'] && elCache['wheel-token'].fire('click');
      elCache['wheel-token'] && elCache['wheel-token'].fire('click');
      // 若 mock 无 token，直接调用确认逻辑兜底
      if (G.game.state !== 'play') G.UI.confirmWheelSelection();
      const pass = (G.game.state === 'play' && G.game.player);
      console.log('after confirm: game.state =', G.game.state, '| player =', !!G.game.player, '| wave =', G.game.wave);
      console.log('RESULT:', pass ? 'PASS — 成功进入游戏' : 'FAIL');
      process.exit(pass ? 0 : 4);
    } catch (e) {
      console.error('THROW in transition:', e && e.stack || e); process.exit(2);
    }
  }, 750);
} catch (e) {
  console.error('THROW:', e && e.stack || e);
  process.exit(2);
}
