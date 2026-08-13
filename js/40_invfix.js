/* ============================================================
   40_invfix.js —— 拖拽交换校验修正
   交换时需同时排除「正在移动的物品」与「被交换的物品」，
   否则原位置与自身重叠导致交换永远失败。
   ============================================================ */
'use strict';

(function () {

  G.invTryMove = function (items, cols, rows, inst, tx, ty) {
    var w = (inst.size && inst.size[0]) || 1;
    var h = (inst.size && inst.size[1]) || 1;
    if (G.invCanPlace(items, cols, rows, tx, ty, w, h, inst)) {
      inst.ix = tx; inst.iy = ty;
      return { ok: true, swap: false };
    }
    var ox = inst.ix, oy = inst.iy;
    var hit = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it === inst || it.ix == null) continue;
      var s = it.size || [1, 1];
      if (G.invOverlap(tx, ty, w, h, it.ix, it.iy, s[0], s[1])) { hit = it; break; }
    }
    if (hit) {
      var hs = hit.size || [1, 1];
      if (hs[0] === w && hs[1] === h) {
        /* 校验被交换物品能否落到「正在移动物品」的原位（两者都排除） */
        var ox2 = inst.ix, oy2 = inst.iy;
        inst.ix = undefined; inst.iy = undefined;
        var swapOk = G.invCanPlace(items, cols, rows, ox, oy, w, h, hit);
        inst.ix = ox2; inst.iy = oy2;
        if (swapOk) {
          hit.ix = ox; hit.iy = oy;
          inst.ix = tx; inst.iy = ty;
          return { ok: true, swap: true };
        }
      }
    }
    return { ok: false };
  };

})();
