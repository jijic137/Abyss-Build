/* ============================================================
   19_fix.js —— 容器绘制修正（p_crate 为固定调色板精灵，用 PX.get）
   ============================================================ */
'use strict';

(function () {

  G.Container.prototype.draw = function (c) {
    if (this.opened) return;
    var info = this.info;
    var bob = Math.sin(this.pulse * 2.2) * 2;

    if (this.type === 'shrine' || this.type === 'altar') {
      var col = this.type === 'shrine' ? '#6ee787' : '#c07fff';
      var pulseA = 0.16 + 0.10 * (Math.sin(this.pulse * 3) + 1) / 2;
      c.save();
      c.globalAlpha = pulseA;
      c.fillStyle = col;
      c.beginPath(); c.arc(this.x, this.y, 44, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.5 + 0.3 * (Math.sin(this.pulse * 2) + 1) / 2;
      c.strokeStyle = col; c.lineWidth = 2;
      c.beginPath(); c.arc(this.x, this.y, 30 + Math.sin(this.pulse * 2) * 4, 0, Math.PI * 2); c.stroke();
      c.restore();
      var cv = G.PX.get('p_crate', 3);
      G.PX.draw(c, cv, this.x, this.y + bob);
      c.save(); c.textAlign = 'center'; c.fillStyle = col;
      c.font = 'bold 11px "Segoe UI",sans-serif';
      c.fillText(this.type === 'shrine' ? '圣泉' : '祭坛', this.x, this.y - 34);
      c.restore();
      if (this.started) this._channel(c);
      return;
    }

    var col2 = info ? info.col : '#a8763f';
    if (this.type === 'chest_gold' || this.type === 'chest_abyss') {
      var glow = 0.14 + 0.10 * (Math.sin(this.pulse * 2.4) + 1) / 2;
      c.save();
      c.globalAlpha = glow;
      c.fillStyle = col2;
      c.beginPath(); c.arc(this.x, this.y, 34 + Math.sin(this.pulse * 2.4) * 3, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    var cv2 = G.PX.get('p_crate', this.type === 'barrel' || this.type === 'crate' ? 2 : 3);
    G.PX.draw(c, cv2, this.x, this.y + bob);
    if (this.type === 'chest_abyss') {
      c.save(); c.textAlign = 'center';
      c.font = 'bold 10px "Segoe UI",sans-serif'; c.fillStyle = '#e0c0ff';
      c.fillText('✦', this.x, this.y + 22);
      c.restore();
    }
    if (this.started) this._channel(c);
  };

  G.Container.prototype._channel = function (c) {
    var t = G.clamp(this.ch / 0.95, 0, 1);
    c.save();
    c.strokeStyle = '#ffd24a'; c.lineWidth = 3;
    c.beginPath(); c.arc(this.x, this.y, 34, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2); c.stroke();
    c.globalAlpha = 0.25; c.fillStyle = '#ffd24a';
    c.beginPath(); c.arc(this.x, this.y, 30, 0, Math.PI * 2); c.fill();
    c.restore();
  };

})();
