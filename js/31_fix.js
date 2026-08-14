/* ============================================================
   31_fix.js —— 开箱奖励落地修复（onContainerOpen 缺失）+ 加固
   根因：10_game.js 漏定义 game.onContainerOpen，18_fix 的
   条件调用永不触发，箱子开了但奖励不结算。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* 兼容 14_map 里的 g.popText 笔误 */
  G.game.popText = function () { return G.popText.apply(null, arguments); };

  /* ---------------- 补上缺失的开箱结算入口 ---------------- */
  G.game.onContainerOpen = function (c, out) {
    if (out && out.noMat) {
      G.popText(c.x, c.y - 44, '材料不足（12）', { col: '#ff6b6b', size: 13, life: 1 });
      return;
    }
    if (c.type === 'shrine' || c.type === 'altar') return;
    var col = (G.CONTAINER_INFO[c.type] || {}).col || '#ffd24a';
    G.fx('ring', { x: c.x, y: c.y, r0: 8, r1: 150, col: col, w: 5, life: 0.5 });
    G.fx('flash', { x: c.x, y: c.y, r: 60, col: col, life: 0.2 });
    this.shake(6, 0.22);
    G.Audio.sfx('chest_open', 0, { tier: (G.chestTierOf && c.type) ? G.chestTierOf(c.type) : 1 });
    if (out) this.applyContainerReward(c, out);
    /* 宝库/深渊箱概率出「贸易代币」，用于升级市场 */
    if (G.Market && G.Market.addToken && (c.type === 'chest_gold' || c.type === 'chest_abyss')) {
      var tkCh = c.type === 'chest_abyss' ? 0.5 : 0.28;
      if (Math.random() < tkCh) {
        G.Market.addToken(1);
        G.popText(c.x, c.y - 46, '贸易代币 +1', { col: '#ffd24a', size: 14, life: 1.4 });
        G.burst(c.x, c.y, 10, '#ffd24a', 160, { size: 3 });
        G.Audio.sfx('item_get');
      }
    }
    this.saveRun();
  };

  /* ---------------- 容器更新兜底：单箱异常不崩循环 ---------------- */
  var _cU = G.Container.prototype.update;
  G.Container.prototype.update = function (dt) {
    try {
      return _cU.call(this, dt);
    } catch (e) {
      if (typeof console !== 'undefined') console.error('container error', e);
      this.opened = true;
      this.used = true;
      this.started = false;
    }
  };

  /* ---------------- 掉落手感：普通箱更常出货 ---------------- */
  if (G.CONTAINER_INFO) {
    if (G.CONTAINER_INFO.barrel) G.CONTAINER_INFO.barrel.itemCh = 0.24;
    if (G.CONTAINER_INFO.crate) G.CONTAINER_INFO.crate.itemCh = 0.34;
    if (G.CONTAINER_INFO.chest_wood) G.CONTAINER_INFO.chest_wood.itemCh = 0.75;
    if (G.CONTAINER_INFO.chest_iron) G.CONTAINER_INFO.chest_iron.itemCh = 0.9;
  }

})();
