/* ============================================================
   64_theme.js —— 五层深渊主题视觉（手动像素绘制）

   设定：逐步深入深渊
     T1 裂隙边缘  地表边缘，尚有苔藓小草（生机渐弱）
     T2 幽暗回廊  严肃荒凉（灰石枯骨）
     T3 深部矿坑  更黑暗破败（矿岩晶簇余烬）
     T4 深渊腹地  风格突变：阳光明媚（深渊的骗局，地面镜像）
     T5 终焉之门  回归最黑暗破败（焦土血纹，BOSS 前）

   每个主题包含：地板纹理/墙面配色/装饰集合/环境光/氛围粒子/（可选）阳光。
   ============================================================ */
'use strict';

(function () {

  var PX = G.PX;
  G.Art = G.Art || {};

  /* ------------------------------------------------------------
     地板纹理（16×16，可染色：o/A/B/C/D/k）
     ------------------------------------------------------------ */
  PX.tint('t_floor_moss', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oACCAACCAACCAACo',
    'oAAAAAAAABAAAAo',
    'oACCAACCAACCAACo',
    'oAABAAAAAAAAAAo',
    'oACCAACCAACCAACo',
    'oAAAAAABAAAAAAo',
    'oACCAACCAACCAACo',
    'oAAAAAAAABAAAAo',
    'oACCAACCAACCAACo',
    'oAABAAAAAAAAAAo',
    'oACCAACCAACCAACo',
    'oAAAAAAAAAAAABo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);

  PX.tint('t_floor_stone', [
    'oooooooooooooooo',
    'oAAABAAABAAABAAo',
    'oAAABAAABAAABAAo',
    'oAAABAAABAAABAAo',
    'oBBBABBBABBBABBo',
    'oBAAABAAABAAABAo',
    'oBAAABAAABAAABAo',
    'oBAAABAAABAAABAo',
    'oBBBABBBABBBABBo',
    'oAAABAAABAAABAAo',
    'oAAABAAABAAABAAo',
    'oAAABAAABAAABAAo',
    'oBBBABBBABBBABBo',
    'oBAAABAAABAAABAo',
    'oBAAABAAABAAABAo',
    'oooooooooooooooo'
  ]);

  PX.tint('t_floor_mine', [
    'oooooooooooooooo',
    'oAAAABAAAAAABAAo',
    'oAAABAAkAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAAAkAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAAAkAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAAAAo',
    'oAAAADAAAAAAkAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAADAAAAAAo',
    'oAABAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAABAAAAAAAo',
    'oooooooooooooooo'
  ]);

  PX.tint('t_floor_meadow', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAACCAACCAACCAo.',
    'oAAAAAAAABAAAAo',
    'oACCAACCAACCAACo',
    'oAADAAAAAAADAAo',
    'oACCAACCAACCAACo',
    'oAAAAAABAAAAAAo',
    'oACCAACCAACCAACo',
    'oAAAAAAADAAAAAo',
    'oACCAACCAACCAACo',
    'oAABAAAAAAAAAAo',
    'oACCAACCAACCAACo',
    'oAAAAAAAABAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);

  PX.tint('t_floor_void', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAkAAAAAAkAAAAo',
    'oAAAAkAAAAAAAkAo',
    'oAAAAAAAAAAAAAo',
    'oAAkAAAAkAAAAAAo',
    'oAAAAAAAkAAAAkAo',
    'oAAAAkAAAAAAAAo',
    'oAAAAAAAAkAAAAo',
    'oAAAAAAkAAAAAAo.',
    'oAAkAAAAAAAkAAAo',
    'oAAAAkAAAAAAAAo',
    'oAAAAAAAAAAkAAo',
    'oAAAAkAAAAAAAko.',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);

  /* ------------------------------------------------------------
     装饰素材（可染色）
     ------------------------------------------------------------ */
  PX.tint('t_grass', [
    '....o...o...',
    '...oA.o.Ao..',
    '..oAA.oAAo..',
    '..oAAooAAo..',
    '.oAAAooAAAo.',
    '.oAAo..oAAo.',
    '..oA....Ao..',
    '..oo....oo..',
    '............',
    '............'
  ]);

  PX.tint('t_moss', [
    '..oooooo..',
    '.oAAAAAAo.',
    'oACCAACCAo',
    'oAAAAAAAo.',
    'oACCAACCAo',
    '.oAAAAAAo.',
    '..oooooo..',
    '...........'
  ]);

  PX.tint('t_flower', [
    '...o..o...',
    '..oAo.oAo.',
    '..oAAoAAo.',
    '...oAAo...',
    '..oAAAAo..',
    '..oAAAAo..',
    '...oAAo...',
    '....oo....',
    '...o..o...',
    '..o....o..'
  ]);

  PX.tint('t_pebble', [
    '..oooo...',
    '.oAAAAo..',
    'oACCCCAo.',
    'oAAAAAAo.',
    '.oAAAAo..',
    '..oooo...',
    '.........'
  ]);

  PX.tint('t_bone', [
    '.o.o.o.o..',
    'oAAoAAoAAo',
    'oAAAAAAAAo',
    '.oAAAAAAo.',
    '..oAAAAo..',
    '...oooo...',
    '......... '
  ]);

  PX.tint('t_crystal', [
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
    '.....oo.....'
  ]);

  PX.tint('t_rubble', [
    '..oo...oo..',
    '.oAAAo.oAAo',
    'oAAAAoooAAA',
    'oAAAAAAoAAo',
    '.oAAAAAAAo.',
    '..ooooooo..',
    '...........'
  ]);

  PX.tint('t_vine', [
    '..oA......',
    '.oAAA.....',
    '.oACAo....',
    '.oAAoA....',
    '.oAo.oA...',
    '.oA.o.oA..',
    '.oA..o.oA.',
    '..o...oAo.',
    '......oA..',
    '......... '
  ]);

  PX.tint('t_ash', [
    '..ooooo...',
    '.oAAAAAo..',
    'oAkAAAAo..',
    'oAAAAkAo..',
    '.oAAAAAo..',
    '.oAkAAAo..',
    '..ooooo...',
    '.........'
  ]);

  PX.tint('t_rune', [
    '..oooooo..',
    '.oAAAAAAo.',
    'oAADDAADo.',
    'oAAkAAkAo.',
    'oAADDAADo.',
    'oAAAAAAAo.',
    '.oAAAAAAo.',
    '..oooooo..',
    '...........'
  ]);

  PX.tint('t_skull', [
    '..oooo..',
    '.oAAAAo.',
    'oAkkkkAo',
    'oAkkkkAo',
    'oAAAAAAo',
    '.oAAAAo.',
    '..oooo..',
    '........'
  ]);

  PX.tint('t_eye', [
    '..oooooo..',
    '.oAAAAAAo.',
    'oAAkkkkAAo',
    'oAkwwwwkAo',
    'oAkwwwwkAo',
    'oAAkkkkAAo',
    '.oAAAAAAo.',
    '..oooooo..',
    '....o.o...',
    '...o...o..'
  ]);

  PX.tint('t_mushroom', [
    '...ooooo...',
    '..oAAAAAo..',
    '..oAAAAAo..',
    '...oAAAo...',
    '....oAo....',
    '....oAo....',
    '....oAo....',
    '....ooo....',
    '............'
  ]);

  /* ------------------------------------------------------------
     主题配置：T1 生机 → T2 荒凉 → T3 破败 → T4 阳光骗局 → T5 终焉
     ------------------------------------------------------------ */
  G.Art.THEMES = {
    1: {
      id: 'fringe', name: '裂隙边缘', concept: '地表边缘 · 尚有生机',
      floor: { sprite: 't_floor_moss', col: '#4f7a44', alpha: 0.42 },
      wall: { col: '#39493c' },
      void: ['#0b0f0b', '#0d120d'],
      decor: [
        { spr: 't_grass', col: '#5f9a4f', n: 7 },
        { spr: 't_moss', col: '#4a7a3a', n: 5 },
        { spr: 't_flower', col: '#e8e0b0', n: 2 },
        { spr: 't_pebble', col: '#5f6655', n: 4 },
        { spr: 't_bone', col: '#c9c9c9', n: 1 }
      ],
      ambient: { top: 'rgba(130,190,130,0.10)', bottom: 'rgba(0,0,0,0.52)', glow: '#7fbf7f', glowA: 0.05 },
      particles: { col: '#9fcf8f' }
    },
    2: {
      id: 'corridor', name: '幽暗回廊', concept: '中层回廊 · 严肃荒凉',
      floor: { sprite: 't_floor_stone', col: '#3c4460', alpha: 0.46 },
      wall: { col: '#3a4160' },
      void: ['#0a0c14', '#0c0f18'],
      decor: [
        { spr: 't_bone', col: '#b9c0cc', n: 5 },
        { spr: 't_rubble', col: '#5a6278', n: 5 },
        { spr: 't_vine', col: '#4a5a44', n: 3 },
        { spr: 't_pebble', col: '#4a5068', n: 3 }
      ],
      ambient: { top: 'rgba(90,110,170,0.10)', bottom: 'rgba(0,0,0,0.60)', glow: '#7fa8ff', glowA: 0.04 },
      particles: { col: '#8fa8d8' }
    },
    3: {
      id: 'mine', name: '深部矿坑', concept: '深部矿脉 · 黑暗破败',
      floor: { sprite: 't_floor_mine', col: '#5a4a6a', alpha: 0.44 },
      wall: { col: '#4a3c5a' },
      void: ['#0a0810', '#0c0a14'],
      decor: [
        { spr: 't_crystal', col: '#a06fff', n: 5 },
        { spr: 't_rubble', col: '#3a3548', n: 5 },
        { spr: 't_ash', col: '#2a2634', n: 4 },
        { spr: 't_bone', col: '#8f8898', n: 2 }
      ],
      ambient: { top: 'rgba(120,80,180,0.08)', bottom: 'rgba(0,0,0,0.70)', glow: '#c07fff', glowA: 0.06 },
      particles: { col: '#b88fff' }
    },
    4: {
      id: 'heart', name: '深渊腹地', concept: '阳光骗局 · 地面镜像',
      floor: { sprite: 't_floor_meadow', col: '#6fae5f', alpha: 0.55 },
      wall: { col: '#b09a6a' },
      void: ['#1a1c10', '#202414'],
      decor: [
        { spr: 't_flower', col: '#ffe9a0', n: 6 },
        { spr: 't_grass', col: '#8fc06a', n: 5 },
        { spr: 't_mushroom', col: '#d8a06a', n: 2 },
        { spr: 't_pebble', col: '#8a8f6a', n: 3 }
      ],
      ambient: { top: 'rgba(255,230,150,0.18)', bottom: 'rgba(60,40,10,0.36)', glow: '#ffe9a0', glowA: 0.10 },
      light: { sun: true, col: '#ffe9a0', beamA: 0.10, spots: 3 },
      particles: { col: '#ffe9a0' }
    },
    5: {
      id: 'gate', name: '终焉之门', concept: '深渊之心 · 最黑暗破败',
      floor: { sprite: 't_floor_void', col: '#4a2a3a', alpha: 0.46 },
      wall: { col: '#4a2a3a' },
      void: ['#0a0608', '#0c070a'],
      decor: [
        { spr: 't_ash', col: '#2a1c24', n: 6 },
        { spr: 't_bone', col: '#6a5a62', n: 3 },
        { spr: 't_rune', col: '#ff4a6b', n: 3 },
        { spr: 't_crystal', col: '#ff4a6b', n: 2 },
        { spr: 't_eye', col: '#ff3b6b', n: 1 }
      ],
      ambient: { top: 'rgba(120,20,40,0.10)', bottom: 'rgba(0,0,0,0.82)', glow: '#ff4a6b', glowA: 0.07 },
      particles: { col: '#ff5a7a' }
    }
  };

  G.Art.themeOf = function (tierId) {
    return G.Art.THEMES[tierId] || G.Art.THEMES[1];
  };

  /* 兼容旧接口：biome（地板/墙 tile 与配色）从主题派生 */
  G.Art.getBiome = function (tierId) {
    var th = G.Art.themeOf(tierId);
    var names = { fringe: 'bio_fringe_floor', corridor: 'bio_corridor_floor', mine: 'bio_mine_floor', heart: 'bio_heart_floor', gate: 'bio_gate_floor' };
    return {
      floor: names[th.id] || 'bio_fringe_floor',
      wall: 'bio_fringe_wall',
      floorCol: th.floor.col,
      wallCol: th.wall.col
    };
  };

  /* ------------------------------------------------------------
     环境渲染：void 底色 / 区域光 / 阳光（T4）/ 终焉脉动（T5）
     ------------------------------------------------------------ */
  /* 形状外底色（最底层，先于地板绘制） */
  G.Art.drawVoidBase = function (c, map, vw, vh) {
    var th = G.Art.themeOf(map.tierId);
    c.save();
    c.fillStyle = th.void[0];
    c.fillRect(0, 0, vw, vh);
    var vg = c.createLinearGradient(0, 0, 0, vh);
    vg.addColorStop(0, th.void[0]);
    vg.addColorStop(1, th.void[1]);
    c.fillStyle = vg;
    c.fillRect(0, 0, vw, vh);
    /* 噪点（确定性，避免闪烁） */
    var seed = (map.salt || 0) * 31 + (map.tierId || 1) * 7;
    c.fillStyle = 'rgba(255,255,255,0.018)';
    for (var i = 0; i < 90; i++) {
      var hx = ((seed * 374761393 + i * 104729) & 0x7fffffff) / 0x7fffffff;
      var hy = ((seed * 668265263 + i * 7919) & 0x7fffffff) / 0x7fffffff;
      c.fillRect(hx * vw, hy * vh, 2, 2);
    }
    c.restore();
  };

  G.Art.drawAmbient = function (c, map, camX, camY) {
    var th = G.Art.themeOf(map.tierId);
    var g = G.game;
    var vw = g ? g.vw : 1280, vh = g ? g.vh : 720;
    var t = g ? (g.runTime || 0) : 0;

    /* 区域光：顶部冷/暖 + 底部暗角 */
    c.save();
    var amb = th.ambient;
    var topG = c.createLinearGradient(0, 0, 0, vh * 0.55);
    topG.addColorStop(0, amb.top);
    topG.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = topG;
    c.fillRect(0, 0, vw, vh * 0.55);
    var botG = c.createLinearGradient(0, vh * 0.4, 0, vh);
    botG.addColorStop(0, 'rgba(0,0,0,0)');
    botG.addColorStop(1, amb.bottom);
    c.fillStyle = botG;
    c.fillRect(0, vh * 0.4, vw, vh * 0.6);
    /* 区域辉光（中心偏上） */
    if (amb.glowA > 0) {
      var gr = c.createRadialGradient(vw / 2, vh * 0.35, 10, vw / 2, vh * 0.35, vh * 0.75);
      gr.addColorStop(0, amb.glow);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = amb.glowA;
      c.fillStyle = gr;
      c.fillRect(0, 0, vw, vh);
      c.globalAlpha = 1;
    }
    c.restore();

    /* T4 阳光：斜光柱 + 地面光斑 */
    if (th.light && th.light.sun) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      var beam = c.createLinearGradient(0, 0, vw * 0.9, vh);
      beam.addColorStop(0, 'rgba(255,233,160,0)');
      beam.addColorStop(0.45, 'rgba(255,233,160,' + th.light.beamA + ')');
      beam.addColorStop(1, 'rgba(255,233,160,0)');
      c.fillStyle = beam;
      c.beginPath();
      c.moveTo(-40, 0);
      c.lineTo(vw * 0.5, 0);
      c.lineTo(vw * 0.95, vh);
      c.lineTo(vw * 0.2, vh);
      c.closePath();
      c.fill();
      /* 地面光斑 */
      var spots = th.light.spots || 3;
      for (var s = 0; s < spots; s++) {
        var sx = vw * (0.18 + 0.26 * s) + Math.sin(t * 0.7 + s * 2) * 20;
        var sy = vh * (0.62 + 0.1 * s);
        var sr = 70 + Math.sin(t * 1.3 + s * 3) * 14;
        var sg = c.createRadialGradient(sx, sy, 4, sx, sy, sr);
        sg.addColorStop(0, 'rgba(255,244,190,0.16)');
        sg.addColorStop(1, 'rgba(255,244,190,0)');
        c.fillStyle = sg;
        c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }

    /* T5 终焉：中央暗红脉动 + 加重暗角 */
    if (map.tierId === 5) {
      c.save();
      var pulse = 0.5 + 0.5 * Math.sin(t * 0.9);
      var pr = c.createRadialGradient(vw / 2, vh * 0.45, 20, vw / 2, vh * 0.45, vh * 0.85);
      pr.addColorStop(0, 'rgba(255,60,90,' + (0.05 + pulse * 0.04) + ')');
      pr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = pr;
      c.fillRect(0, 0, vw, vh);
      var vn = c.createRadialGradient(vw / 2, vh / 2, vh * 0.25, vw / 2, vh / 2, vh * 0.75);
      vn.addColorStop(0, 'rgba(0,0,0,0)');
      vn.addColorStop(1, 'rgba(0,0,0,0.42)');
      c.fillStyle = vn;
      c.fillRect(0, 0, vw, vh);
      c.restore();
    }
  };

  /* 挂载：void 底色最底层，环境光在链尾（仍在实体之前，因为 drawMap 先于实体绘制） */
  var _dm4 = G.game.drawMap;
  G.game.drawMap = function (c) {
    var m = this.map;
    if (m && G.Art.drawVoidBase) {
      G.Art.drawVoidBase(c, m, this.vw, this.vh);
    }
    _dm4.call(this, c);
    if (m && G.Art.drawAmbient) {
      G.Art.drawAmbient(c, m, this.camX, this.camY);
    }
  };

})();
