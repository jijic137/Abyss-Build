/* ============================================================
   60_ui2.js —— 暂停菜单上下文信息
   打开暂停时显示：第 x / 16 小关 · 小关名 · 当前目标
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  function objTxt(o) {
    if (!o) return '';
    if (o.type === 'survive') return '存活 ' + o.survive + ' 秒';
    if (o.type === 'elite') return '击杀精英 ' + (G.game.map ? G.game.map.eliteKills : 0) + ' / ' + o.need;
    if (o.type === 'boss') return 'BOSS 战';
    return '';
  }

  var _tp3 = G.game.togglePause;
  G.game.togglePause = function () {
    var r = _tp3.apply(this, arguments);
    var el = $('pauseContext');
    if (el && this.map) {
      var sub = this.sublevel || 1;
      var S = G.SUBLEVELS[sub - 1];
      el.textContent = '深渊 · 第 ' + sub + ' / 16 小关 · ' +
        (S ? S.name : '') +
        (this.map.obj ? ' · ' + objTxt(this.map.obj) : '');
    }
    return r;
  };

})();
