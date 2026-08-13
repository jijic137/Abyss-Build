/* ============================================================
   28_ui.js —— 撤离区提示 + 键位标签微调
   站在未开放的撤离区时，显示还差什么目标。
   ============================================================ */
'use strict';

(function () {

  var _tag = G.game.drawInteractTag;
  G.game.drawInteractTag = function () {
    _tag.call(this);
    var p = this.player, ex = this.map.extract;
    if (!ex || ex.active || G.dist(p.x, p.y, ex.x, ex.y) > 130) return;
    var c = this.ctx;
    var msg = '撤离点未开放 · ' + G.UI._objText;
    c.save();
    c.font = 'bold 12px "Segoe UI",sans-serif';
    var w = c.measureText(msg).width + 22;
    var bob = Math.sin(this.runTime * 4) * 2;
    var sx = Math.round(ex.x - this.camX), sy = Math.round(ex.y - this.camY - 78 + bob);
    c.globalAlpha = 0.8;
    c.fillStyle = '#0a0c12';
    c.fillRect(sx - w / 2, sy - 20, w, 24);
    c.strokeStyle = '#5a5f72';
    c.lineWidth = 1.5;
    c.strokeRect(sx - w / 2, sy - 20, w, 24);
    c.globalAlpha = 1;
    c.fillStyle = '#9aa0b0';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(msg, sx, sy - 8);
    c.restore();
  };

})();
