/* ============================================================
   47_aiart3.js —— AI 集成三：市场/记录页背景（生成后自动生效）
   用 Image onload 探测，图片落地即替换背景；缺失时沿用现背景。
   无头环境（node 冒烟）无 Image，直接降级。
   ============================================================ */
'use strict';

(function () {

  if (typeof Image === 'undefined') return;
  var $ = G.$;

  function swapBg(screenId, url) {
    var el = $(screenId);
    if (!el) return;
    var im = new Image();
    im.onload = function () {
      el.style.backgroundImage = "url('" + url + "')";
    };
    im.src = url;
  }

  swapBg('scrMarket', 'assets/art/ai/market/market_stall.png');
  swapBg('scrRecords', 'assets/art/ai/records/records_wall.png');

})();
