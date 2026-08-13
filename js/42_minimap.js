/* ============================================================
   42_minimap.js —— 小地图探索标记
   在已探索房间内标出：未开宝箱/事件/传送门/锁门/爆炸桶，
   让"搜"更有目的性。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  var _uh4 = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh4.call(this, g);
    var cv = $('minimap');
    if (!cv || !g.map) return;
    var c = cv.getContext('2d');
    var m = g.map;
    var scale = Math.min(cv.width / m.worldW, cv.height / m.worldH);
    var ox = (cv.width - m.worldW * scale) / 2;
    var oy = (cv.height - m.worldH * scale) / 2;
    var i;

    function explored(roomIdx) {
      var rm = m.rooms[roomIdx];
      return rm && rm.explored;
    }
    function dot(x, y, col, size) {
      c.fillStyle = col;
      c.fillRect(x - size / 2, y - size / 2, size, size);
    }

    /* 未开容器（金箱/深渊箱更亮） */
    for (i = 0; i < g.containers.length; i++) {
      var ct = g.containers[i];
      if (ct.opened || ct.used || !explored(ct.room)) continue;
      var hot = ct.type === 'chest_gold' || ct.type === 'chest_abyss';
      dot(ox + ct.x * scale, oy + ct.y * scale, hot ? '#ffd24a' : '#8f96a8', hot ? 2.6 : 1.8);
    }
    /* 事件 */
    if (g.events) {
      for (i = 0; i < g.events.length; i++) {
        var ev = g.events[i];
        if (ev.used || !explored(ev.room)) continue;
        dot(ox + ev.x * scale, oy + ev.y * scale, '#c07fff', 2.4);
      }
    }
    /* 传送门 */
    if (g.portals) {
      for (i = 0; i < g.portals.length; i++) {
        var pt = g.portals[i];
        if (pt.used || !explored(pt.room)) continue;
        dot(ox + pt.x * scale, oy + pt.y * scale, '#8f7fff', 2.4);
      }
    }
    /* 爆炸桶 */
    if (g.barrels) {
      for (i = 0; i < g.barrels.length; i++) {
        var b = g.barrels[i];
        if (b.dead || !explored(b.room)) continue;
        dot(ox + b.x * scale, oy + b.y * scale, '#ff9a3a', 1.6);
      }
    }
    /* 锁门 */
    if (m.lockedDoors) {
      var SEG = G.Map.SEG, W = G.Map.WALL, DOOR = G.Map.DOOR;
      for (i = 0; i < m.lockedDoors.length; i++) {
        var ld = m.lockedDoors[i];
        if (g.unlockedDoors && g.unlockedDoors[ld.key]) continue;
        var rc = G.Map.roomRect(ld.c, ld.r);
        var dx, dy;
        if (ld.dir === 'H') { dx = (ld.c + 1) * SEG + W / 2; dy = rc.y0 + G.Map.ROOM / 2; }
        else { dx = rc.x0 + G.Map.ROOM / 2; dy = (ld.r + 1) * SEG + W / 2; }
        if (!explored(ld.c + ld.r * m.cols) &&
            !explored((ld.dir === 'H' ? ld.c + 1 : ld.c) + (ld.dir === 'H' ? ld.r : ld.r + 1) * m.cols)) continue;
        dot(ox + dx * scale, oy + dy * scale, '#ffd24a', 1.8);
      }
    }
  };

})();
