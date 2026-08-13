/* ============================================================
   59_minimap.js —— 小地图增强
   - 撤离点开放后：绿色脉冲信标
   - 已探索房间内的精英 / BOSS：橙色 / 红色脉冲标记
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  var _uh9 = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh9.call(this, g);
    var cv = $('minimap');
    if (!cv || !g.map || !g.player) return;
    var c = cv.getContext('2d');
    var m = g.map;
    var scale = Math.min(cv.width / m.worldW, cv.height / m.worldH);
    var ox = (cv.width - m.worldW * scale) / 2;
    var oy = (cv.height - m.worldH * scale) / 2;
    var t = (g.runTime || 0);

    function explored(roomIdx) {
      var rm = m.rooms[roomIdx];
      return rm && rm.explored;
    }
    function dot(x, y, col, size) {
      c.fillStyle = col;
      c.fillRect(x - size / 2, y - size / 2, size, size);
    }

    /* 撤离点信标 */
    var ex = m.extract;
    if (ex && ex.active) {
      var pr = 2.4 + Math.sin(t * 5) * 1.0;
      c.strokeStyle = 'rgba(110,231,135,0.9)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(ox + ex.x * scale, oy + ex.y * scale, pr + 2, 0, Math.PI * 2);
      c.stroke();
      dot(ox + ex.x * scale, oy + ex.y * scale, '#6ee787', 3.2);
    }

    /* 精英 / BOSS 标记（仅已探索房间，避免剧透未探区域） */
    if (g.enemies) {
      for (var i = 0; i < g.enemies.length; i++) {
        var e = g.enemies[i];
        if (e.dead || !(e.def.elite || e.def.boss)) continue;
        if (!explored(e.room)) continue;
        var col = e.def.boss ? '#ff4a6b' : '#ffb347';
        var r = (e.def.boss ? 3.4 : 2.6) + Math.sin(t * 6 + i) * 0.8;
        c.strokeStyle = col;
        c.globalAlpha = 0.75;
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(ox + e.x * scale, oy + e.y * scale, r, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
        dot(ox + e.x * scale, oy + e.y * scale, col, e.def.boss ? 3.0 : 2.2);
      }
    }
  };

})();
