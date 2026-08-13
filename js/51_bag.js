/* ============================================================
   51_bag.js —— 背包弹层优化：大格 / 背景点击关闭
   背包 7 列 × 3 行，58px 大格；点背景关闭（层间整备时禁止）。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* 放大背包格子（拖拽落点/打包/渲染共用） */
  G.Inv2.cell.bag = 58;
  G.BAG_COLS = 7;
  G.BAG_ROWS = 3;
  G.BAG_CELLS = 21;
  G.Inv2.bagCols = 7;
  G.Inv2.bagRows = 3;

  /* 背景点击关闭 */
  var bag = $('scrBag');
  var backdrop = bag && bag.querySelector ? bag.querySelector('.bag-backdrop') : null;
  if (backdrop) {
    backdrop.addEventListener('click', function () {
      var g = G.game;
      if (g && g._pendingDescend) {
        G.UI.flashText(null, '层间整备中，先点击「继续深入」');
        G.Audio.sfx('back');
        return;
      }
      G.UI.toggleBag();
    });
  }

})();
