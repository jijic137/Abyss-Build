/* ============================================================
   45_ux.js —— 手感打磨：背包暂停世界 / 深度展示
   - 打开背包时冻结战场（安全整理，关闭恢复）
   - HUD 词缀行前置「深度 ×N」；结算页追加深度行
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* 背包打开 = 安全区（世界冻结） */
  var _tb = G.UI.toggleBag;
  G.UI.toggleBag = function () {
    var g = G.game;
    var n = $('scrBag');
    if (!n) return _tb.call(this);
    var wasOpen = !n.classList.contains('hidden');
    if (!wasOpen && g && g.state === 'play') {
      g._bagPrev = g.state;
      g.state = 'pause';
    }
    var r = _tb.call(this);
    if (wasOpen && g && g._bagPrev) {
      g.state = g._bagPrev;
      g._bagPrev = null;
    }
    return r;
  };

  /* HUD：深度前置 */
  var _uh6 = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh6.call(this, g);
    var e = $('modLine');
    if (e && g && g.depth > 0 && e.textContent && e.textContent.indexOf('深度') < 0) {
      e.textContent = '深度 ×' + g.depth + ' · ' + e.textContent;
    }
  };

  /* 结算：深度行 */
  var _sr4 = G.UI.showResult;
  G.UI.showResult = function (g, win, info) {
    var r = _sr4.call(this, g, win, info);
    var host = $('resultStats');
    if (host && g && (g.depth || 0) > 0) {
      var row = G.el('div', 'stat-row');
      row.appendChild(G.el('span', 'k', '深入深度'));
      row.appendChild(G.el('span', 'v', '×' + g.depth));
      host.appendChild(row);
    }
    return r;
  };

})();
