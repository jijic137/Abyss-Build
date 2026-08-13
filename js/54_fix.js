/* ============================================================
   54_fix.js —— 整备栏显隐 + 数值平衡（搜打撤模式）
   - 背包正常打开时隐藏「继续深入」整备栏，仅层间整备（撤离点触发深入）时显示
   - 数值平衡：普通怪增强（HP+30% / 伤害+15% / 速度+5%），
     精英大幅下调（HP-65% / 伤害-45%），BOSS 不受影响
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* 背包渲染后按状态控制整备栏显隐 */
  var _rb3 = G.UI.renderBag;
  G.UI.renderBag = function () {
    var r = _rb3.call(this);
    var bar = $('bagPrepBar');
    if (bar) {
      bar.style.display = (G.game && G.game._pendingDescend) ? 'flex' : 'none';
    }
    return r;
  };

  /* 数值平衡（作用于生成后的敌人实例） */
  var _spB = G.game.spawnEnemy;
  G.game.spawnEnemy = function (id, x, y) {
    var e = _spB.call(this, id, x, y);
    if (!e) return e;
    if (e.def.boss) return e;                       // BOSS 不动
    if (e.def.elite) {                              // 精英大幅下调
      e.maxHp = Math.max(1, Math.round(e.maxHp * 0.35));
      e.hp = e.maxHp;
      e.dmg = Math.round(e.dmg * 0.55);
      e.spd = e.spd * 0.96;
    } else {                                        // 小怪增强
      e.maxHp = Math.max(1, Math.round(e.maxHp * 1.30));
      e.hp = e.maxHp;
      e.dmg = Math.round(e.dmg * 1.15);
      e.spd = e.spd * 1.05;
    }
    return e;
  };

})();
