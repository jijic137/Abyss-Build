/* ============================================================
   30_art2.js —— 环境装饰 + 区域主题瓷砖（G.Art 资产集）
   由主代理直接生产（并行子代理任务未送达，改为本地完成）
   ============================================================ */
'use strict';

(function () {

  G.Art = G.Art || {};

  /* ---------------- 环境装饰精灵（12x12 系） ---------------- */
  G.PX.tint('env_bone', [
    '...oooo.....',
    '..oAAAAAo..',
    '.oACCCCBAo.',
    '.oACkkCCAo.',
    '.oACkkCCAo.',
    '.oACCCCCAo.',
    '.oACCCCCAo.',
    '..oAAAAAo..',
    '..oAkkkkAo.',
    '..oAAAAAo..',
    '............',
    '............'
  ]);
  G.PX.tint('env_rock', [
    '...oooo.....',
    '..oAAAAABo..',
    '.oACCCCCBBo.',
    '.oACDDCCCBo.',
    '.oACCCCCCBo.',
    '.oABBBBBBDo.',
    '..ooooooo...',
    '............'
  ]);
  G.PX.tint('env_crystal', [
    '......D.....',
    '.....DCD....',
    '....DCCCD...',
    '...oACCCA...',
    '..oACCCCCo..',
    '.oACCCCCCCo.',
    '.oACCCCCCCo.',
    '..oACCCCCo..',
    '...oACCCA...',
    '....oACCo...',
    '.....oAo....',
    '............'
  ]);
  G.PX.tint('env_torch', [
    '....DD.....',
    '...wDDw....',
    '...wDDw....',
    '...oAAo....',
    '...oAAo....',
    '....oo.....',
    '....oo.....',
    '....oo.....',
    '....oo.....',
    '....oo.....',
    '....oo.....',
    '....oo.....'
  ]);
  G.PX.tint('env_vine', [
    '..........',
    '...oA.....',
    '..oAAA....',
    '..oACo....',
    '..oAo.o...',
    '..oAooAo..',
    '...oAooAo.',
    '...oAo....',
    '....oA....',
    '..........'
  ]);
  G.PX.tint('env_rubble', [
    '............',
    '..oooo....o.',
    '.oAAAAo.ooo.',
    '.oACCAo.oAo.',
    '..oAAAo.ooo.',
    '............'
  ]);

  G.Art.envSprites = {
    bone: 'env_bone', rock: 'env_rock', crystal: 'env_crystal',
    torch: 'env_torch', vine: 'env_vine', rubble: 'env_rubble'
  };
  G.Art.envColors = {
    bone: '#c9c9d8', rock: '#7d7f8c', crystal: '#3bd6ff',
    torch: '#ffb347', vine: '#4f8a3a', rubble: '#6a6f88'
  };

  G.Art.drawEnv = function (c, name, x, y, seed) {
    var spr = G.Art.envSprites[name];
    if (!spr) return;
    var h1 = ((seed * 374761393 + 37) & 0x7fffffff) / 0x7fffffff;
    var h2 = ((seed * 668265263 + 91) & 0x7fffffff) / 0x7fffffff;
    var cv = G.PX.getTint(spr, G.Art.envColors[name] || '#7d7f8c', 2.5);
    if (!cv) return;
    G.PX.draw(c, cv, x + (h1 - 0.5) * 8, y + (h2 - 0.5) * 8, { alpha: 0.92 });
  };

  /* ---------------- 区域瓷砖（程序化生成，保证平铺无缝） ---------------- */
  function buildTile(seed, kind) {
    var rows = [], r1 = 16, r2 = 16;
    for (var y = 0; y < r1; y++) {
      var row = '';
      for (var x = 0; x < r2; x++) {
        var c = 'A';
        var v = ((x + 1) * 73 + (y + 1) * 151 + seed * 997) % 97;
        if (kind === 'wall') {
          if (y === 0) c = 'D';
          else if (y === 1) c = 'C';
          else if ((y % 4) === 2 && v < 70) c = 'B';
          else if ((x % 4) === 0 && v < 45) c = 'B';
          else if (v > 90) c = 'C';
        } else {
          /* 地板：斜向裂缝无缝 + 斑驳 */
          if (((x + y) % 16) === 0 || ((x + y + 1) % 16) === 0) c = 'B';
          else if (v > 88) c = 'C';
          else if (v < 5) c = 'B';
        }
        row += c;
      }
      rows.push(row);
    }
    return rows;
  }

  G.Art.biomes = {
    fringe: { floor: 'bio_fringe_floor', wall: 'bio_fringe_wall', floorCol: '#243026', wallCol: '#39493c', seed: 1 },
    corridor: { floor: 'bio_corridor_floor', wall: 'bio_corridor_wall', floorCol: '#20243a', wallCol: '#3a4160', seed: 2 },
    mine: { floor: 'bio_mine_floor', wall: 'bio_mine_wall', floorCol: '#2a2418', wallCol: '#4a3c24', seed: 3 },
    heart: { floor: 'bio_heart_floor', wall: 'bio_heart_wall', floorCol: '#301d24', wallCol: '#54303a', seed: 4 },
    gate: { floor: 'bio_gate_floor', wall: 'bio_gate_wall', floorCol: '#241a26', wallCol: '#4a3348', seed: 5 }
  };
  Object.keys(G.Art.biomes).forEach(function (key) {
    var b = G.Art.biomes[key];
    G.PX.tint(b.floor, buildTile(b.seed, 'floor'));
    G.PX.tint(b.wall, buildTile(b.seed, 'wall'));
  });

  G.Art.getBiome = function (tierId) {
    var names = ['', 'fringe', 'corridor', 'mine', 'heart', 'gate'];
    return G.Art.biomes[names[tierId]] || G.Art.biomes.fringe;
  };

})();
