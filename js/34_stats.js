/* ============================================================
   34_stats.js —— 词条清理：移除波次时代残留
   收获 harvesting / 经验获取 xpGain / 波末治疗 waveHeal
   （搜打撤已无波次与经验，这些词条不再生效且不应展示）
   ============================================================ */
'use strict';

(function () {

  G.STAT_HIDDEN = { harvesting: 1, xpGain: 1, waveHeal: 1 };

  /* 属性面板与升级池不再展示隐藏词条 */
  G.STAT_DEFS = G.STAT_DEFS.filter(function (d) {
    return !G.STAT_HIDDEN[d.key];
  });

  /* 物品/武器上的隐藏词条直接移除（tooltip 与构筑不再出现） */
  G.ITEMS.forEach(function (it) {
    if (it.mods) {
      delete it.mods.harvesting;
      delete it.mods.xpGain;
      delete it.mods.waveHeal;
    }
  });
  G.WEAPONS.forEach(function (w) {
    if (w.mods) {
      delete w.mods.harvesting;
      delete w.mods.xpGain;
      delete w.mods.waveHeal;
    }
  });

  /* 升级选项过滤隐藏词条（内层池仍含，展示前剔除并补抽） */
  var _rlo = G.rollLevelOptions;
  G.rollLevelOptions = function (n, level) {
    var opts = _rlo.call(this, n, level);
    var out = opts.filter(function (o) {
      return !G.STAT_HIDDEN[o.key] && !(o.negKey && G.STAT_HIDDEN[o.negKey]);
    });
    if (out.length < n) {
      var more = _rlo.call(this, n, level);
      var extra = more.filter(function (o) {
        return !G.STAT_HIDDEN[o.key] && !(o.negKey && G.STAT_HIDDEN[o.negKey]);
      });
      out = out.concat(extra).slice(0, n);
    }
    return out;
  };

})();
