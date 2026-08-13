/* ============================================================
   38_art3.js —— 宝箱开盖动画帧 + 遗物大图标 + 出货闪光（本地补产）
   ============================================================ */
'use strict';

(function () {

  G.Art = G.Art || {};

  /* ---------------- 程序化宝箱开盖帧 ---------------- */
  function chestRows(w, h, frame, opts) {
    opts = opts || {};
    var rows = [];
    for (var y = 0; y < h; y++) {
      var row = '';
      for (var x = 0; x < w; x++) {
        var c = 'A';
        var edge = (x === 0 || y === 0 || x === w - 1 || y === h - 1);
        var lidRow = y === 1 || y === 2;
        if (edge) {
          c = 'o';
        } else if (frame === 0) {
          /* 闭合：箱盖一体，高光带 */
          if (y === 1) c = 'D';
          else if (y === 2) c = 'C';
          else if (x === 1 || x === w - 2) c = 'B';
          else c = ((x + y) % 4 < 2) ? 'C' : 'B';
        } else if (frame === 1) {
          /* 半开：顶部出现宝光缝隙，盖向右移 */
          if (y === 1 && x >= Math.floor(w / 2)) c = 'D';
          else if (y === 1) c = '.';
          else if (y === 2) c = (x % 3 === 0) ? 'D' : 'w';
          else if (x === 1 || x === w - 2) c = 'B';
          else c = ((x + y) % 4 < 2) ? 'C' : 'B';
        } else {
          /* 全开：盖立起（顶部斜线），箱内宝光溢出 */
          if (y === 1) c = '.';
          else if (y === 2) c = (x < Math.floor(w / 2)) ? 'D' : '.';
          else if (y === 3) c = (x < Math.floor(w / 2)) ? 'w' : 'D';
          else if (y === 4) c = 'w';
          else if (y === 5) c = 'D';
          else if (x === 1 || x === w - 2) c = 'B';
          else c = ((x + y) % 4 < 2) ? 'C' : 'B';
        }
        if (opts.lock && x === Math.floor(w / 2) && y === h - 2) c = 'k';
        if (opts.gem && y >= 2 && y <= 3 && x === Math.floor(w / 2) && frame === 0) c = 'D';
        row += c;
      }
      rows.push(row);
    }
    return rows;
  }

  var CHEST_TYPES = ['chest_wood', 'crate', 'barrel', 'chest_iron', 'chest_gold', 'chest_abyss'];
  var CHEST_W = { chest_wood: 12, crate: 12, barrel: 10, chest_iron: 12, chest_gold: 12, chest_abyss: 12 };
  var CHEST_H = { chest_wood: 12, crate: 11, barrel: 12, chest_iron: 12, chest_gold: 12, chest_abyss: 12 };
  var CHEST_OPT = { chest_gold: { lock: true, gem: true }, chest_abyss: { lock: true, gem: true } };

  G.Art.chestFrames = {};
  CHEST_TYPES.forEach(function (t) {
    G.Art.chestFrames[t] = [];
    for (var f = 0; f < 3; f++) {
      var name = 'crt_open_' + t + '_' + f;
      G.PX.tint(name, chestRows(CHEST_W[t], CHEST_H[t], f, CHEST_OPT[t]));
      G.Art.chestFrames[t].push(name);
    }
  });
  G.Art.chestFrameTime = 0.16;

  /* ---------------- 遗物大图标（16x16） ---------------- */
  G.PX.tint('rel_abyss_eye', [
    '....oooooo....',
    '..ooAAAAAAoo..',
    '.oACCCCCCCCAo.',
    '.oACCCCCCCCAo.',
    'oACCCkkkkCCCAo',
    'oACCCkwwkCCCAo',
    'oACCCkwwkCCCAo',
    'oACCCkkkkCCCAo',
    'oACCCCCCCCCCAo',
    '.oACCCCCCCCAo.',
    '.oACCCCCCCCAo.',
    '..ooAAAAAAoo..',
    '....oooooo....',
    '......AA......',
    '.....oAAo.....',
    '.....oooo.....'
  ]);
  G.PX.tint('rel_void_crown', [
    '..oD..D..D..o.',
    '.oADD.DD.DDDAo',
    'oAADDDDDDDDDAA',
    'oAADDDDDDDDDAA',
    'oAADDDDDDDDDAA',
    'oAAAAAAAAAAAAo',
    'oABBBBBBBBBBBAo',
    'oABCCCCCCCCBAo',
    'oABCCCCCCCCBAo',
    'oABCCCCCCCCBAo',
    'oABBBBBBBBBBBAo',
    'oAAAAAAAAAAAAo',
    '.oooooooooooo.',
    '......AA......',
    '.....oAAo.....',
    '.....oooo.....'
  ]);
  G.PX.tint('rel_blood_heart', [
    '..oooo..oooo..',
    '.oAAAAooAAAAo.',
    'oAAkAAooAAkAAo',
    'oAkAkAooAkAkAo',
    'oAkAkAooAkAkAo',
    'oAAkAAooAAkAAo',
    '.oAAAAooAAAAo.',
    '..oAAAooAAAo..',
    '...oAAooAAo...',
    '....oAAoAo....',
    '.....oAAAo....',
    '......oAo.....',
    '.......o......',
    '......AA......',
    '.....oAAo.....',
    '.....oooo.....'
  ]);
  G.PX.tint('rel_eldritch_book', [
    '.....oooo.....',
    '....oAAAAo....',
    '...oABBBBAo...',
    '..oABCCCCBAo..',
    '.oABCCkkCCBAo.',
    'oABCCkwwkCCBAo',
    'oABCCkkkkCCBAo',
    'oABCCCCCCCCBAo',
    '.oABCCCCCCBAo.',
    '..oABCCCCBAo..',
    '...oABBBBAo...',
    '....oAAAAo....',
    '.....oooo.....',
    '......AA......',
    '.....oAAo.....',
    '.....oooo.....'
  ]);
  G.PX.tint('rel_storm_core', [
    '.....oooo.....',
    '....oAAAAo....',
    '...oACCCCAo...',
    '..oACDDDCCAo..',
    '.oACDwwwDCAo..',
    '.oACDwwwDCAo..',
    '.oACDwwwDCAo..',
    '.oACDDDDDCAo..',
    '..oACDDDCAo...',
    '...oACCCAo....',
    '....oAAAo.....',
    '.....oo.......',
    '......o.......',
    '......AA......',
    '.....oAAo.....',
    '.....oooo.....'
  ]);
  G.PX.tint('rel_gold_skull', [
    '....oooooo....',
    '..ooAAAAAAoo..',
    '.oACDDDDDDCAo.',
    '.oACDkkkkDCAo.',
    'oACDkwwwwkDCAo',
    'oACDkwwwwkDCAo',
    'oACDkwwwwkDCAo',
    'oACDkkkkkkDCAo',
    '.oACCCCCCCCAo.',
    '.oACkkkkkkCAo.',
    '.oACkkkkkkCAo.',
    '..ooAAAAAAoo..',
    '....oooooo....',
    '......AA......',
    '.....oAAo.....',
    '.....oooo.....'
  ]);
  G.Art.relicIcons = ['rel_abyss_eye', 'rel_void_crown', 'rel_blood_heart', 'rel_eldritch_book', 'rel_storm_core', 'rel_gold_skull'];

  /* ---------------- 出货闪光帧（12x12 射线） ---------------- */
  function sparkRows(frame) {
    var rows = [], w = 12, h = 12;
    var cx = 5, cy = 5;
    for (var y = 0; y < h; y++) {
      var row = '';
      for (var x = 0; x < w; x++) {
        var dx = x - cx, dy = y - cy;
        var d = Math.max(Math.abs(dx), Math.abs(dy));
        var c = '.';
        if (d <= 1) c = 'w';
        else if (d <= 2) c = (frame === 1) ? 'D' : ((x + y) % 2 ? 'C' : '.');
        else if (d <= 3) c = (frame === 1) ? 'C' : ((x === cx || y === cy) ? 'D' : '.');
        else if (d <= 4 && frame === 2) c = ((x === cx || y === cy) ? 'C' : '.');
        row += c;
      }
      rows.push(row);
    }
    return rows;
  }
  G.Art.sparkFrames = [];
  for (var sf = 0; sf < 3; sf++) {
    var sn = 'spark_rays_' + (sf + 1);
    G.PX.tint(sn, sparkRows(sf));
    G.Art.sparkFrames.push(sn);
  }
  G.Art.sparkFrameTime = 0.07;

  /* ---------------- 开箱帧播放（包在现有 Container.draw 外） ---------------- */
  var _cdraw = G.Container.prototype.draw;
  G.Container.prototype.draw = function (c) {
    var frames = G.Art.chestFrames && G.Art.chestFrames[this.type];
    if (this.started && !this.opened && frames && frames.length) {
      var t = G.clamp(this.ch / 0.95, 0, 1);
      var f = Math.min(frames.length - 1, Math.floor(t * frames.length));
      var col = (G.CONTAINER_INFO[this.type] || {}).col || '#a8763f';
      var cv = G.PX.getTint(frames[f], col, 3.6);
      if (cv) {
        G.PX.draw(c, cv, this.x, this.y + Math.sin(this.pulse * 2.2) * 2);
        this._channel(c);
        return;
      }
    }
    return _cdraw.call(this, c);
  };

})();
