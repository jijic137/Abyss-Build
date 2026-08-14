/* ============================================================
   29_env.js —— 环境装饰与区域主题渲染（对接 art_env / art_biome）
   - 已探索房间按确定性种子撒环境装饰（骸骨/岩石/水晶/火把/藤蔓/碎石）
   - 地板叠加深渊区域主题瓷砖纹理（5 档差异化）
   ============================================================ */
'use strict';

(function () {

  var _dm = G.game.drawMap;
  G.game.drawMap = function (c) {
    _dm.call(this, c);
    var m = this.map;
    if (!m) return;

    /* 可见房间范围 */
    var c0 = G.clamp(Math.floor((this.camX - G.Map.WALL) / G.Map.SEG), 0, m.cols - 1);
    var r0 = G.clamp(Math.floor((this.camY - G.Map.WALL) / G.Map.SEG), 0, m.rows - 1);
    var c1 = G.clamp(Math.ceil((this.camX + this.vw - G.Map.WALL) / G.Map.SEG), 0, m.cols - 1);
    var r1 = G.clamp(Math.ceil((this.camY + this.vh - G.Map.WALL) / G.Map.SEG), 0, m.rows - 1);

    /* 区域主题包（64_theme：地板/装饰/氛围） */
    var th = null;
    if (G.Art && G.Art.themeOf) {
      try { th = G.Art.themeOf(m.tierId); } catch (e) { th = null; }
    }
    var tileSpr = th && G.PX.getTint(th.floor.sprite, th.floor.col, 3);
    var tileA = th ? th.floor.alpha : 0.28;

    for (var r = r0; r <= r1; r++) {
      for (var cc = c0; cc <= c1; cc++) {
        var rm = m.rooms[cc + r * m.cols];
        if (!rm.explored) continue;
        var rc = G.Map.roomRect(cc, r);

        /* 地板纹理 */
        if (tileSpr) {
          c.save();
          c.globalAlpha = tileA;
          var step = 48;
          for (var tx = rc.x0 + 8; tx < rc.x1 - 8; tx += step) {
            for (var ty = rc.y0 + 8; ty < rc.y1 - 8; ty += step) {
              G.PX.draw(c, tileSpr, tx, ty);
            }
          }
          c.restore();
        }

        /* 环境装饰（主题驱动：苔藓/枯骨/晶簇/花朵/焦土…，确定性种子，避开中心与房内结构） */
        if (th && th.decor && th.decor.length && rm.type !== 'extract' && rm.type !== 'spawn') {
          var n = rm.type === 'treasure' ? 3 : (rm.type === 'combat' ? 2 : 1);
          var totalW = 0;
          th.decor.forEach(function (dd) { totalW += dd.n; });
          var iRect = m.interiorByRoom ? m.interiorByRoom[rm.idx] : null;
          for (var d = 0; d < n; d++) {
            var h1 = (rm.idx * 7919 + d * 104729 + (m.salt || 0) * 31) >>> 0;
            var h2 = (rm.idx * 104729 + d * 7919 + (m.salt || 0) * 17) >>> 0;
            var cx2 = rc.x0 + G.Map.ROOM / 2, cy2 = rc.y0 + G.Map.ROOM / 2;
            var rx = 0, ry = 0, ok2 = false;
            for (var tr = 0; tr < 6 && !ok2; tr++) {
              rx = rc.x0 + 90 + ((h1 + tr * 104729) % Math.max(1, rc.x1 - rc.x0 - 180));
              ry = rc.y0 + 90 + (((h2 >>> 4) + tr * 7919) % Math.max(1, rc.y1 - rc.y0 - 180));
              if (Math.abs(rx - cx2) < 150 && Math.abs(ry - cy2) < 150) continue;   // 中心安全区
              ok2 = true;
              if (iRect) {
                for (var ir2 = 0; ir2 < iRect.length; ir2++) {
                  if (rx > iRect[ir2][0] - 20 && rx < iRect[ir2][2] + 20 &&
                      ry > iRect[ir2][1] - 20 && ry < iRect[ir2][3] + 20) { ok2 = false; break; }
                }
              }
            }
            if (!ok2) continue;
            var roll = (h1 ^ (h2 >>> 3)) % totalW;
            var pick = th.decor[0];
            for (var di = 0; di < th.decor.length; di++) {
              roll -= th.decor[di].n;
              if (roll < 0) { pick = th.decor[di]; break; }
            }
            var cv2 = G.PX.getTint(pick.spr, pick.col, 2);
            if (cv2) G.PX.draw(c, cv2, rx, ry, { alpha: 0.9 });
          }
        }
      }
    }
  };

})();
