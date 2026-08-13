/* ============================================================
   23_eventfix.js —— 事件面板打开时 ESC 关闭而非暂停
   ============================================================ */
'use strict';

(function () {

  var _tp = G.game.togglePause;
  G.game.togglePause = function () {
    if (G.UI._evtOpen) {
      G.UI.closeEvent();
      return;
    }
    return _tp.call(this);
  };

})();
