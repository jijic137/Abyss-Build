/* ============================================================
   24_art.js —— 搜打撤像素资产（容器 / 碎片 / 钥匙 / 传送门 / 地板基调）
   用程序化盒子精灵构建容器外观，替代 6×6 的 p_crate 光点
   ============================================================ */
'use strict';

(function () {

  /* 程序化盒子精灵：o 描边 / A 主色 / B 暗 / C 亮 / D 高光 / k 黑 */
  function boxSprite(w, h, o) {
    o = o || {};
    var rows = [];
    for (var y = 0; y < h; y++) {
      var row = '';
      for (var x = 0; x < w; x++) {
        var c = 'A';
        var edge = (x === 0 || y === 0 || x === w - 1 || y === h - 1);
        if (edge) c = 'o';
        else if (o.lid && y === o.lid) c = 'A';
        else if (o.lid && y === o.lid + 1) c = 'D';
        else if (o.plank && (x === o.plank || x === w - 1 - o.plank)) c = 'B';
        else if (o.band && (y === o.band || y === h - 1 - o.band)) c = 'B';
        else if (o.inner && x >= 2 && x <= w - 3 && y >= 2 && y <= h - 3) {
          c = ((x + y) % 4 < 2) ? 'C' : 'B';
        } else if (x === 1 || x === w - 2) c = 'B';
        if (o.lock && x === Math.floor(w / 2) && y === h - 2) c = 'k';
        if (o.gem && ((x === Math.floor(w / 2)) && (y === 2 || y === 3))) c = 'D';
        row += c;
      }
      rows.push(row);
    }
    return rows;
  }

  G.PX.tint('crt_crate', boxSprite(12, 11, { plank: 3, inner: true }));
  G.PX.tint('crt_barrel', boxSprite(10, 12, { band: 3, inner: true }));
  G.PX.tint('crt_wood', boxSprite(12, 12, { lid: 2, inner: true }));
  G.PX.tint('crt_iron', boxSprite(12, 12, { lid: 2, band: 7, inner: true }));
  G.PX.tint('crt_gold', boxSprite(12, 12, { lid: 2, lock: true, inner: true, gem: true }));
  G.PX.tint('crt_abyss', boxSprite(12, 12, { lid: 2, lock: true, gem: true }));

  /* 圣泉 / 祭坛底座 */
  G.PX.tint('crt_shrine', [
    '...wwww...',
    '...wDDw...',
    '...wDDw...',
    '...wwww...',
    '....AA....',
    '....AA....',
    'oAAAAAAAAo',
    'oABBBBBBAo',
    'oACCCCCCAo',
    'oABBBBBBAo',
    'oAAAAAAAAo',
    '.oooooooo.'
  ]);
  G.PX.tint('crt_altar', [
    '..oooooo..',
    'oAAAAAAAAo',
    'oABBBBBBAo',
    'oACCCCCCAo',
    'oABBBBBBAo',
    'oAAAAAAAAD',
    'oAADDDDAAo',
    'oAADDDDAAo',
    'oAAAAAAAAo',
    '.oooooooo.'
  ]);

  /* 属性碎片 / 钥匙 / 传送门 */
  G.PX.tint('p_shard', [
    '..AAA..',
    '.ACCCA.',
    'ACDDDCA',
    'ACDDDCA',
    'ACDDDCA',
    '.ACCCA.',
    '..AAA..'
  ]);
  G.PX.tint('p_key', [
    'ooAoo.....',
    'oAABBo....',
    'oAAABBo...',
    'oAAABBo...',
    'oAABBo....',
    'ooAoo.....'
  ]);
  G.PX.tint('p_portal', [
    '...oooo...',
    '..oAAAAo..',
    '.oABBBBAo.',
    '.oABCCBAo.',
    'oABCCCCBAo',
    'oABCDDCBAo',
    'oABCDDCBAo',
    'oABCCCCBAo',
    '.oABCCBAo.',
    '.oABBBBAo.',
    '..oAAAAo..',
    '...oooo...'
  ]);

  /* ------------------------------------------------------------
     容器绘制（替换 19_fix 的 p_crate 版）
     ------------------------------------------------------------ */
  var SPRITE_BY_TYPE = {
    barrel: 'crt_barrel',
    crate: 'crt_crate',
    chest_wood: 'crt_wood',
    chest_iron: 'crt_iron',
    chest_gold: 'crt_gold',
    chest_abyss: 'crt_abyss'
  };
  var SCALE_BY_TYPE = { barrel: 3, crate: 3, chest_wood: 3.4, chest_iron: 3.4, chest_gold: 3.6, chest_abyss: 3.8 };

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
      c.globalAlpha = 0.55 + 0.3 * (Math.sin(this.pulse * 2) + 1) / 2;
      c.strokeStyle = col; c.lineWidth = 2;
      c.beginPath(); c.arc(this.x, this.y, 30 + Math.sin(this.pulse * 2) * 4, 0, Math.PI * 2); c.stroke();
      c.restore();
      var cv = G.PX.getTint(this.type === 'shrine' ? 'crt_shrine' : 'crt_altar', col, 3.2);
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
      var glow = 0.16 + 0.11 * (Math.sin(this.pulse * 2.4) + 1) / 2;
      c.save();
      c.globalAlpha = glow;
      c.fillStyle = col2;
      c.beginPath(); c.arc(this.x, this.y, 42 + Math.sin(this.pulse * 2.4) * 4, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    var spr = SPRITE_BY_TYPE[this.type] || 'crt_crate';
    var scale = SCALE_BY_TYPE[this.type] || 3;
    var cv2 = G.PX.getTint(spr, col2, scale);
    G.PX.draw(c, cv2, this.x, this.y + bob);
    if (this.type === 'chest_abyss') {
      c.save(); c.textAlign = 'center';
      c.font = 'bold 12px "Segoe UI",sans-serif'; c.fillStyle = '#e0c0ff';
      c.fillText('✦', this.x, this.y + 22);
      c.restore();
    }
    if (this.started) this._channel(c);
  };

  /* ------------------------------------------------------------
     属性碎片掉落物绘制（覆盖 06_entities 的 Pickup.draw）
     ------------------------------------------------------------ */
  G.Pickup.prototype.draw = function (c) {
    var bob = Math.sin(this.t * 5) * 2;
    if (this.type === 'shard') {
      var cv = G.PX.getTint('p_shard', '#c07fff', 2.4);
      G.PX.draw(c, cv, this.x, this.y + bob);
      c.save();
      c.globalAlpha = 0.18 + 0.12 * (Math.sin(this.t * 6) + 1) / 2;
      c.fillStyle = '#c07fff';
      c.beginPath(); c.arc(this.x, this.y, 13, 0, Math.PI * 2); c.fill();
      c.restore();
      return;
    }
    if (this.type === 'item') {
      var inst = this.value;
      if (!inst) return;
      var col = inst.tier === 0 ? '#d9dde8' : G.rarityColor(inst.tier);
      c.save();
      c.globalAlpha = 0.18 + 0.10 * (Math.sin(this.t * 5) + 1) / 2;
      c.fillStyle = col;
      c.beginPath(); c.arc(this.x, this.y, 14, 0, Math.PI * 2); c.fill();
      c.restore();
      var ic = inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 3) : G.itemIcon(inst.def, 3);
      G.PX.draw(c, ic, this.x, this.y + bob - 4);
      return;
    }
    var cv2 = G.PX.get(this.type === 'mat' ? 'p_mat' : 'p_heal', 3);
    G.PX.draw(c, cv2, this.x, this.y + bob);
  };

  /* ------------------------------------------------------------
     地板基调：按层数给房间地板着色（视觉差异化）
     ------------------------------------------------------------ */
  var _drawMap = G.game.drawMap;
  G.game.drawMap = function (c) {
    _drawMap.call(this, c);
    var m = this.map;
    if (!m) return;
    var tintCol = m.tier.col || '#7fa8ff';
    var c0 = G.clamp(Math.floor((this.camX - G.Map.WALL) / G.Map.SEG), 0, m.cols - 1);
    var r0 = G.clamp(Math.floor((this.camY - G.Map.WALL) / G.Map.SEG), 0, m.rows - 1);
    var c1 = G.clamp(Math.ceil((this.camX + this.vw - G.Map.WALL) / G.Map.SEG), 0, m.cols - 1);
    var r1 = G.clamp(Math.ceil((this.camY + this.vh - G.Map.WALL) / G.Map.SEG), 0, m.rows - 1);
    c.save();
    c.globalAlpha = 0.05;
    c.fillStyle = tintCol;
    for (var r = r0; r <= r1; r++) {
      for (var cc = c0; cc <= c1; cc++) {
        var rm = m.rooms[cc + r * m.cols];
        if (!rm.explored) continue;
        var rc = G.Map.roomRect(cc, r);
        c.fillRect(rc.x0, rc.y0, rc.x1 - rc.x0, rc.y1 - rc.y0);
      }
    }
    c.restore();
  };

})();
