/* ============================================================
   20_fix.js —— 背包武器读档修复 + 兜底
   ============================================================ */
'use strict';

(function () {

  /* 物品/武器数据 → 实例（武器进背包后仍可读档） */
  G.itemFromData = function (d) {
    if (!d) return null;
    if (G.WEAPON_MAP[d.defId]) return G.makeWeapon(d.defId, d.tier);
    return G.makeItem(d.defId, d.tier);
  };

})();
