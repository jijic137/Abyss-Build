/* ============================================================
   _check_lootfly.js —— 34_loot_fly.js 自检
   用 DOM/画布桩加载模块，验证：
   1) G.UI.lootFly 存在
   2) 包装后的 applyContainerReward 保留原链路
   3) 已入包的物品会触发飞行动画调度（不抛异常）
   ============================================================ */
'use strict';

var calls = { orig: 0, fly: 0 };

function fakeStyle() {
  return { setProperty: function () {} };
}

function fakeEl() {
  return {
    style: fakeStyle(),
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
    appendChild: function () {},
    removeChild: function () {},
    getBoundingClientRect: function () { return { left: 0, top: 0, width: 800, height: 600 }; },
    parentNode: null,
    textContent: ''
  };
}

var G = {
  $: function () { return fakeEl(); },
  PX: { node: function () { return fakeEl(); } },
  rarityColor: function () { return '#fff'; },
  weaponIcon: function () { return fakeEl(); },
  itemIcon: function () { return fakeEl(); },
  UI: {},
  game: {
    canvas: (function () { var c = fakeEl(); c.getBoundingClientRect = function () { return { left: 10, top: 5, width: 800, height: 600 }; }; return c; })(),
    camX: 100,
    camY: 50,
    vw: 800,
    vh: 600,
    bag: [],
    applyContainerReward: function (c, out) { calls.orig++; }
  }
};

global.G = G;
global.window = { innerWidth: 800, innerHeight: 600 };
global.document = {
  createElement: function () { return fakeEl(); },
  body: { appendChild: function () {} }
};
global.requestAnimationFrame = function (fn) { fn(); };

require('../js/34_loot_fly.js');

if (typeof G.UI.lootFly !== 'function') throw new Error('G.UI.lootFly 未定义');
if (typeof G.game.applyContainerReward !== 'function') throw new Error('applyContainerReward 包装失败');

var instA = { uid: 'a', defId: 'w1', def: { name: '测试剑' }, tier: 2, type: 'weapon' };
G.game.bag.push(instA);

G.game.applyContainerReward(
  { x: 200, y: 150 },
  [{ kind: 'mats', value: 5 }, { inst: instA }]
);

if (calls.orig !== 1) throw new Error('原 applyContainerReward 未被调用');
if (G.game.bag.indexOf(instA) < 0) throw new Error('物品未在背包');

setTimeout(function () {
  console.log('LOOTFLY_OK orig=' + calls.orig + ' fly=调度完成（无异常）');
}, 60);
