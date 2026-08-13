/* ============================================================
   56_ux.js —— 物品类型角标 + 整备栏文案
   背包/仓库每件物品左上角显示类型标记（武/防/饰/遗），一眼可判。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;
  var TYPE_META = {
    weapon: { label: '武', col: '#9ad0ff' },
    armor: { label: '防', col: '#7fe0c0' },
    trinket: { label: '饰', col: '#ffd24a' },
    relic: { label: '遗', col: '#c07fff' }
  };

  function badgeEl(inst) {
    var m = TYPE_META[inst.type] || { label: '?', col: '#8a90a8' };
    var b = document.createElement('span');
    b.className = 'inv2-type';
    b.style.background = m.col;
    b.textContent = m.label;
    return b;
  }

  /* 背包物品角标 */
  var _rb5 = G.UI.renderBag;
  G.UI.renderBag = function () {
    var r = _rb5.call(this);
    var g = G.game;
    var wrap = $('bagGrid');
    if (!g || !wrap) return r;
    var tiles = wrap.querySelectorAll ? wrap.querySelectorAll('.inv2-grid .inv2-tile.draggable') : [];
    for (var i = 0; i < tiles.length && i < g.bag.length; i++) {
      var t = tiles[i];
      if (t && !t.querySelector('.inv2-type')) t.appendChild(badgeEl(g.bag[i]));
    }
    return r;
  };

  /* 仓库物品角标 */
  var _rb6 = G.UI.renderBase;
  G.UI.renderBase = function () {
    var r = _rb6.call(this);
    var meta = G.Meta.get();
    var sg = $('stashGrid');
    if (!sg) return r;
    var tiles = sg.querySelectorAll ? sg.querySelectorAll('.inv2-tile.draggable') : [];
    for (var i = 0; i < tiles.length && i < meta.stash.length; i++) {
      var t = tiles[i];
      if (t && !t.querySelector('.inv2-type')) t.appendChild(badgeEl(meta.stash[i]));
    }
    return r;
  };

  /* 整备栏文案：小关 */
  var _op5 = G.UI.openPrep;
  G.UI.openPrep = function () {
    var r = _op5.call(this);
    var bar = $('bagPrepBar');
    var prep = G.game && G.game._pendingDescend;
    if (bar && prep) {
      var txt = bar.querySelector ? bar.querySelector('span') : null;
      if (txt) txt.textContent = '层间整备 · 即将进入 ' + prep.name + '（第 ' + prep.sublevel + ' / 16 小关）';
    }
    return r;
  };

})();
