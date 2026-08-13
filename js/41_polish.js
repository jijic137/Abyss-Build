/* ============================================================
   41_polish.js —— 图标一致性：遗物大图标接入全部渲染位
   遗物（16x16）替代旧 10x10 图标，并按展示位归一比例。
   ============================================================ */
'use strict';

(function () {

  var _itemIcon = G.itemIcon;
  G.itemIcon = function (it, scale) {
    if (it && G.itemType(it) === 'relic' && G.Art && G.Art.relicIcons && it.id) {
      var arr = G.Art.relicIcons;
      var h = 0;
      for (var i = 0; i < it.id.length; i++) h = (h * 31 + it.id.charCodeAt(i)) >>> 0;
      var spr = arr[h % arr.length];
      var s = scale >= 5 ? 3.4 : (scale >= 4 ? 3.1 : 2.5);
      var cv = G.PX.getTint(spr, it.col || '#b45cff', s);
      if (cv) return cv;
    }
    return _itemIcon.call(this, it, scale);
  };

})();
