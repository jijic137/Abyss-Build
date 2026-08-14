/* ============================================================
   63_interior.js —— 房内结构墙体的像素纹理外观
   四类纹理（可染色，按区域主题着色）：砖墙 / 石柱 / 乱石 / 栏板
   替换原先的纯色矩形，让掩体有砖缝、柱帽、高光与阴影的立体感。
   ============================================================ */
'use strict';

(function () {

  var PX = G.PX;
  G.Art = G.Art || {};

  /* ---------- 像素纹理（16×16，tint：o 描边 / A 主色 / B 暗部 / C 高光 / D 亮部 / k 裂缝） ---------- */
  PX.tint('wall_brick', [
    'oooooooooooooooo',
    'oAACCCAACCCAACCk',
    'oAACCCAACCCAACCk',
    'oAACCCAACCCAACCk',
    'oBBAABBAABBAABBk',
    'oBAACBAACBAACBAk',
    'oBAACBAACBAACBAk',
    'oBAACBAACBAACBAk',
    'oBBAABBAABBAABBk',
    'oAACCCAACCCAACCk',
    'oAACCCAACCCAACCk',
    'oAACCCAACCCAACCk',
    'oBBAABBAABBAABBk',
    'oBAACBAACBAACBAk',
    'oBAACBAACBAACBAk',
    'oBAACBAACBAACBAk'
  ]);

  PX.tint('wall_pillar', [
    '..oooooooooo....',
    '..oAAAAAAAAo....',
    '..oADDDDDDAo....',
    '..oADDDDDDAo....',
    '..oACCCCCCAo....',
    '..oABBBBBBAo....',
    '..oABBBBBBAo....',
    '..oAAAAAAAo.....',
    '..oABBBBBBAo....',
    '..oABBBBBBAo....',
    '..oACCCCCCAo....',
    '..oADDDDDDAo....',
    '..oADDDDDDAo....',
    '..oAAAAAAAAo....',
    '..oooooooooo....',
    '................'
  ]);

  PX.tint('wall_ruin', [
    '................',
    '...oooo..oooo...',
    '..oAAAoo.oAAAo..',
    '..oAAAAooAAAAo..',
    '..oAAAAooAAAAo..',
    '...oooo..oooo...',
    '......oooo......',
    '.....oAAAAo.....',
    '.....oAAAAo.....',
    '......oooo......',
    '..ooo......ooo..',
    '.oAAAo....oAAAo.',
    '.oAAAAo..oAAAAo.',
    '..oooo....oooo..',
    '................',
    '................'
  ]);

  PX.tint('wall_panel', [
    'oooooooooooooooo',
    'oAADDAADDAADDAAo',
    'oAADDAADDAADDAAo',
    'oAAAAAAAAAAAAAo',
    'oBABABABABABABAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAAAAAAAAAAAo',
    'oAADDAADDAADDAAo',
    'oAADDAADDAADDAAo',
    'oAAAAAAAAAAAAAo',
    'oBABABABABABABAo',
    'oBBBBBBBBBBBBBBo',
    'oooooooooooooooo',
    '................',
    '................',
    '................'
  ]);

  /* ---------- 绘制：平铺纹理 + 边缘立体 ---------- */
  G.Art.drawInterior = function (c, map, camX, camY) {
    var list = map.interior || [];
    if (!list.length) return;
    var kindSpr = { pillar: 'wall_pillar', cross: 'wall_brick', corner: 'wall_brick', alcove: 'wall_panel', ruins: 'wall_ruin' };
    var zone = map.tierId || 1;
    var col = '#7d8aa8';
    if (G.Art.getBiome) {
      try {
        var bio = G.Art.getBiome(zone);
        if (bio && bio.wallCol) col = bio.wallCol;
      } catch (e) { /* 忽略 */ }
    }
    var g = G.game;
    var vw = g ? g.vw : 1280, vh = g ? g.vh : 720;
    var vx0 = camX - 60, vy0 = camY - 60, vx1 = camX + vw + 60, vy1 = camY + vh + 60;

    c.save();
    c.translate(Math.round(-camX), Math.round(-camY));
    for (var i = 0; i < list.length; i++) {
      var iv = list[i];
      var spr = PX.getTint(kindSpr[iv.kind] || 'wall_brick', col, 3);
      for (var r = 0; r < iv.rects.length; r++) {
        var rc = iv.rects[r];
        if (rc[2] < vx0 || rc[0] > vx1 || rc[3] < vy0 || rc[1] > vy1) continue;
        var w = rc[2] - rc[0], h = rc[3] - rc[1];
        var pad = 2;                                        // 侧壁厚度（细墙配细侧壁）
        var side = G.PX.shade(col, -0.58);                  // 侧壁（深色，像墙的厚度）
        var top = G.PX.shade(col, 0.10);                    // 顶面（受光，比侧壁亮）
        /* 1) 投影（更远更深，强化凸起） */
        c.fillStyle = 'rgba(0,0,0,0.50)';
        c.fillRect(rc[0] + 10, rc[1] + 12, w, h);
        /* 2) 外扩侧壁（整块浮雕的厚度） */
        c.fillStyle = side;
        c.fillRect(rc[0] - pad, rc[1] - pad, w + pad * 2, h + pad * 2);
        /* 3) 顶面（亮于侧壁，明确"面朝上"） */
        c.fillStyle = top;
        c.fillRect(rc[0], rc[1], w, h);
        /* 4) 顶面纹理（材质细节，低透明度） */
        if (spr) {
          c.save();
          c.globalAlpha = 0.55;
          for (var x = rc[0]; x < rc[2]; x += spr.width) {
            for (var y = rc[1]; y < rc[3]; y += spr.height) {
              c.drawImage(spr, x, y);
            }
          }
          c.restore();
        }
        /* 5) 顶面高光条（受光最亮处） */
        c.fillStyle = 'rgba(255,255,255,0.30)';
        c.fillRect(rc[0], rc[1], w, 3);
        /* 6) 顶面内侧轮廓 */
        c.strokeStyle = 'rgba(0,0,0,0.38)';
        c.lineWidth = 1;
        c.strokeRect(rc[0] + 0.5, rc[1] + 0.5, w - 1, h - 1);
        /* 柱帽 / 栏帽（跨出顶面上沿，更醒目） */
        if (iv.kind === 'pillar' || iv.kind === 'alcove') {
          c.fillStyle = side;
          c.fillRect(rc[0] - pad - 2, rc[1] - pad - 3, w + (pad + 2) * 2, 4);
          c.fillStyle = 'rgba(255,255,255,0.28)';
          c.fillRect(rc[0] - pad - 2, rc[1] - pad - 3, w + (pad + 2) * 2, 2);
        }
        if (iv.kind === 'ruins') {
          /* 顶面亮边，像石块顶 */
          c.fillStyle = 'rgba(255,255,255,0.16)';
          c.fillRect(rc[0] + 3, rc[1] + 3, w - 6, 3);
        }
      }
    }
    c.restore();
  };

  /* ---------- 挂载：地面之后、实体之前绘制 ---------- */
  var _dm3 = G.game.drawMap;
  G.game.drawMap = function (c) {
    _dm3.call(this, c);
    if (this.map && G.Art.drawInterior) {
      G.Art.drawInterior(c, this.map, this.camX, this.camY);
    }
  };

})();
