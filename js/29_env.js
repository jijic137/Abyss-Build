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

    /* 区域主题瓷砖纹理 */
    var biome = null;
    if (G.Art && G.Art.getBiome) {
      try { biome = G.Art.getBiome(m.tierId); } catch (e) { biome = null; }
    }
    var tileSpr = biome && G.PX.getTint(biome.floor, biome.floorCol, 3);

    for (var r = r0; r <= r1; r++) {
      for (var cc = c0; cc <= c1; cc++) {
        var rm = m.rooms[cc + r * m.cols];
        if (!rm.explored) continue;
        var rc = G.Map.roomRect(cc, r);

        /* 地板纹理 */
        if (tileSpr) {
          c.save();
          c.globalAlpha = 0.28;
          var step = 48;
          for (var tx = rc.x0 + 8; tx < rc.x1 - 8; tx += step) {
            for (var ty = rc.y0 + 8; ty < rc.y1 - 8; ty += step) {
              G.PX.draw(c, tileSpr, tx, ty);
            }
          }
          c.restore();
        }

        /* 环境装饰（确定性种子，避免每帧乱跳） */
        if (G.Art && G.Art.drawEnv && G.Art.envSprites && rm.type !== 'extract' && rm.type !== 'spawn') {
          var names = Object.keys(G.Art.envSprites);
          var n = rm.type === 'treasure' ? 3 : (rm.type === 'combat' ? 2 : 1);
          for (var d = 0; d < n; d++) {
            var h1 = (rm.idx * 7919 + d * 104729 + (m.salt || 0) * 31) >>> 0;
            var h2 = (rm.idx * 104729 + d * 7919 + (m.salt || 0) * 17) >>> 0;
            var rx = rc.x0 + 90 + (h1 % (rc.x1 - rc.x0 - 180));
            var ry = rc.y0 + 90 + (h2 % (rc.y1 - rc.y0 - 180));
            var name = names[(h1 + d) % names.length];
            var seed = (h1 ^ (h2 >>> 3)) >>> 0;
            try { G.Art.drawEnv(c, name, rx, ry, seed); } catch (e) { /* 装饰失败不阻塞 */ }
          }
        }
      }
    }
  };

})();
