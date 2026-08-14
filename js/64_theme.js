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

  /* ---- 变体纹理（与主纹混用，打破整齐平铺） ---- */
  PX.tint('t_floor_moss_v2', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAABAAAAAAAABAAo',
    'oAAAAAAAAAAAAAo',
    'oAAACAAACAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAABAAAAAAAABAAo',
    'oAAAAAAAAAAAAAo',
    'oAAACAAACAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAABAAAAAAAABAAo',
    'oAAAAAAAAAAAAAo',
    'oAAACAAACAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);

  PX.tint('t_floor_stone_v2', [
    'oooooooooooooooo',
    'oAAABAAABAAABAAo',
    'oAAABAAABAAABAAo',
    'oAAABAAABAAABAAo',
    'oABBBABBBABBBABo',
    'oBAAABAAABAAABAo',
    'oBAAABAAABAAABAo',
    'oBAAABAAABAAABAo',
    'oAAABAAABAAABAAo',
    'oAAABAAABAAABAAo',
    'oAAABAAABAAABAAo',
    'oABBBABBBABBBABo',
    'oBAAABAAABAAABAo',
    'oBAAABAAABAAABAo',
    'oBAAABAAABAAABAo',
    'oooooooooooooooo'
  ]);

  PX.tint('t_floor_mine_v2', [
    'oooooooooooooooo',
    'oAAAAAAAkAAAAAAo',
    'oAAADAAAAAAADAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAAAAo',
    'oAAAkAAAAAAAkAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAAAkAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAAAAo',
    'oAAADAAAAAAADAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAkAAAAAAo',
    'oAAAkAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);

  PX.tint('t_floor_meadow_v2', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oACCAACCAACCAACo',
    'oAAAAAAADAAAAAo',
    'oACCAACCAACCAACo',
    'oAADAAAAAAAADAAo',
    'oACCAACCAACCAACo',
    'oAAAAAABAAAAAAo',
    'oACCAACCAACCAACo',
    'oAAAAAAADAAAAAo',
    'oACCAACCAACCAACo',
    'oAADAAAAAAAAAAo',
    'oACCAACCAACCAACo',
    'oAAAAAAAABAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);

  PX.tint('t_floor_void_v2', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAkAAkAAkAAkAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAAAAo',
    'oAAkAAAAAAAAkAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAkAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAAAo.',
    'oAAkAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAAAAAAko.',
    'oAAAAAAAAAAAAAo',
    'oAAkAAkAAkAAkAAo',
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
     地面材质元素素材（散布用，可染色）——让地面"读得出来"是什么材质
     ------------------------------------------------------------ */
  PX.tint('g_grass_tuft', [
    '...o...o..',
    '..oA.o.Ao.',
    '..oA.o.Ao.',
    '.oAA.oAAo.',
    '.oAAooAAo.',
    '.oAo..oAo.',
    '..o....o..',
    '..oo..oo..'
  ]);
  PX.tint('g_grass_blade', [
    '.o..',
    '.Ao.',
    '.Ao.',
    '.Ao.',
    '.Ao.',
    '..Ao',
    '..Ao',
    '..oo'
  ]);
  PX.tint('g_moss_patch', [
    '..ooooo...',
    '.oAAAAAo..',
    'oACCAACCAo',
    'oAAAAAAAo.',
    'oACCAACCAo',
    '.oAAAAAo..',
    '..ooooo...'
  ]);
  PX.tint('g_pebble', [
    '..oooo.',
    '.oAAAo.',
    'oACCCAo',
    '.oAAAo.',
    '..oooo.'
  ]);
  PX.tint('g_dirt_patch', [
    '...oooo....',
    '..oAAAAo...',
    '.oAAAAAAo..',
    'oAABBAABo..',
    'oAAAAAAAo..',
    '.oAAAAAAo..',
    '..oAAAAo...',
    '...oooo....'
  ]);
  PX.tint('g_leaf', [
    '.oo..',
    'oAAo.',
    'oAAAo',
    '.oAAo',
    '..oo.'
  ]);
  PX.tint('g_slab', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  PX.tint('g_crack', [
    '...........o..',
    '.........o.o..',
    '.......o.o....',
    '.....o.o......',
    '...o.o........',
    '...o..........'
  ]);
  PX.tint('g_chip', [
    '.ooo.',
    'oAAAo',
    'oAABo',
    '.ooo.',
    '.....'
  ]);
  PX.tint('g_dust', [
    '..oooo..',
    '.oAAAAo.',
    'oAAAAAAo',
    'oAAAAAAo',
    '.oAAAAo.',
    '..oooo..'
  ]);
  PX.tint('g_rock_chunk', [
    '..oooo....',
    '.oAAAAo...',
    'oACCCCAo..',
    'oACCCCCAo.',
    'oACCCCAo..',
    '.oAAAAAo..',
    '.oAAAAo...',
    '..oooo....'
  ]);
  PX.tint('g_crystal_grain', [
    '..D...',
    '.DCD..',
    '.DCD..',
    'oACCo.',
    'oACCo.',
    'oACCo.',
    '.oAo..',
    '..oo..'
  ]);
  PX.tint('g_slag', [
    '..oooo.',
    '.oAAAAo',
    'oAkAAo.',
    'oAAAkAo',
    '.oAAo..',
    '..ooo..'
  ]);
  PX.tint('g_char', [
    '..ooooo...',
    '.oAAAAAo..',
    'oAkkAAAo..',
    'oAkAAkAo..',
    'oAAAAkAo..',
    '.oAAAAAo..',
    '..ooooo...'
  ]);
  PX.tint('g_bone_chip', [
    '.o.o.o.',
    'oAoAoAo',
    'oAAAAAo',
    '.oAAAo.',
    '..ooo..'
  ]);
  PX.tint('g_ash_patch', [
    '...ooooo..',
    '..oAAAAo..',
    '.oAAAAAo..',
    'oAAAAAAo..',
    'oAAAAAAo..',
    '.oAAAAAo..',
    '..ooooo...'
  ]);
  PX.tint('g_blood_crack', [
    '..........o.....',
    '........o.o.....',
    '......o.o.......',
    '....o.o.........',
    '..o.o...........',
    '..o.............'
  ]);
  PX.tint('g_flower', [
    '...o..o..',
    '..oAo.oA.',
    '..oAAoAA.',
    '...oAAo..',
    '..oAAAAo.',
    '..oAAAAo.',
    '...oAAo..',
    '....oo...'
  ]);
  PX.tint('g_mushroom', [
    '..ooooo.',
    '.oAAAAo.',
    '.oAAAAo.',
    '..oAAAo.',
    '...oAo..',
    '...oAo..',
    '...oAo..',
    '...ooo..'
  ]);
  PX.tint('g_twig', [
    '..o.....',
    '.oAo....',
    '.oAo....',
    'oAAo....',
    '.oAo....',
    '..oo....',
    '........'
  ]);

  /* ------------------------------------------------------------
     泰拉瑞亚式手绘 tile 集（v7）：每块 16×16 手绘材质纹理。
     渲染用 G.Art.floorTile（浅描边自定义调色板），避免深色网格线。
     ------------------------------------------------------------ */
  G.Art.TILE_ROWS = G.Art.TILE_ROWS || {};
  function T7(name, rows) {
    G.Art.TILE_ROWS[name] = rows;
    PX.tint(name, rows);
  }
  /* 裂隙边缘 · 草地 */
  T7('t_fm_a', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAACACAACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACAACo',
    'oAAAAAAAAAAAAAo',
    'oAABACACAACABAAo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACAACo',
    'oAAAAAAAAAAAAAo',
    'oAACACAACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAABACACAACABAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_fm_b', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAACAAAACAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAABAAAAAAABo',
    'oAAAAAAAAAAAAAo',
    'oAAAACAAAACAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_fm_c', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAABBBAAAAAo',
    'oAAAAABBBBAAAAAo',
    'oAAAAAABBBAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_fm_d', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAABAAAAAAAAAABo',
    'oAABAAAAAAAAAABo',
    'oAAAAACAAAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAABAAAAAAAAAABo',
    'oAABAAAAAAAAAABo',
    'oAAAAACAAAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  /* 幽暗回廊 · 石板 */
  T7('t_sc_a', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_sc_b', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAACAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_sc_c', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAAAAAAAo',
    'oAAAAkAAAAAAAkAo',
    'oAAAAkAAAAAAkAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAAkAAAAkAAAAo',
    'oAAAAkAAkAAAAAAo',
    'oAAAAkAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_sc_d', [
    'oooooooooooooooo',
    'oAAAAAACAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAABBBBBBAAAAo',
    'oAAAABBBBBBAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oBBBBBBBBBBBBBBo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAACAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  /* 深部矿坑 · 矿岩 */
  T7('t_mn_a', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAADAAAAAAkAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAADAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAAAAAAkAo',
    'oAAAAAAAAAAAAAo',
    'oAAAADAAAAAAkAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAADAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAAAAAAkAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_mn_b', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAkAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAkAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAAAAAkAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAkAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAAAkAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAkAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_mn_c', [
    'oooooooooooooooo',
    'oAAAAADAAAAADAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAADAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAADAAAAAAADAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAADAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAADAAAAAAADAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAADAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAADAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_mn_d', [
    'oooooooooooooooo',
    'oAAAAkAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAkAAAAAAo',
    'oAAADAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAAAkAAAo.',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAkAAAAAAo',
    'oAAADAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAAAkAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAkAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  /* 深渊腹地 · 花园草地 */
  T7('t_hm_a', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAADAAAAAAADAAo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAADAAAAAAADAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_hm_b', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAAAADo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAAAADo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAAAADo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_hm_c', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAABBBBBBAAAAo',
    'oAAAAABBBBBBAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAAAADo',
    'oAAAAAAAAAAAAAo',
    'oAACACACACACACAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_hm_d', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAACAAAAACAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAAAADo',
    'oAAAAAAAAAAAAAo',
    'oAAAACAAAAACAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAAAADo',
    'oAAAAAAAAAAAAAo',
    'oAAAACAAAAACAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAADAAAAAAADo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  /* 终焉之门 · 焦土 */
  T7('t_vd_a', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAAAkAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAAAkAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAAAkAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_vd_b', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAkAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAkAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAkAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAkAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAkAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAkAAkAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_vd_c', [
    'oooooooooooooooo',
    'oAAAAACAAAAACAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAAAkAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAAAkAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAAAkAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAACAAAAACAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);
  T7('t_vd_d', [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAkAAAkAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAkAAkAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAkAAAkAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAkAAkAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAkAAAAkAAAkAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAkAAkAAkAAAAo',
    'oAAAAAAAAAAAAAo',
    'oAAAAAAAAAAAAAo',
    'oooooooooooooooo'
  ]);

  /* ------------------------------------------------------------
     手绘 tile 渲染：浅描边自定义调色板（避免深色网格线）
     ------------------------------------------------------------ */
  G.Art.floorTile = function (name, col, scale) {
    scale = scale || 3;
    var key = 'ft|' + name + '|' + col + '|' + scale;
    if (G._ftCache && G._ftCache[key]) return G._ftCache[key];
    var rows = G.Art.TILE_ROWS[name];
    if (!rows) return null;
    var pal = {
      o: G.PX.shade(col, -0.38),
      A: col,
      B: G.PX.shade(col, -0.28),
      C: G.PX.shade(col, 0.42),
      D: G.PX.shade(col, 0.72),
      w: '#f2f4ff',
      k: '#10121a'
    };
    PX.def('__ft_' + name + '_' + key.length, pal, rows);
    var cv = PX.get('__ft_' + name + '_' + key.length, scale);
    G._ftCache = G._ftCache || {};
    return (G._ftCache[key] = cv);
  };

  /* ------------------------------------------------------------
     像素风地板纹理（无边框、图案连续、平铺无缝）——v5 覆盖版
     ------------------------------------------------------------ */
  PX.tint('t_floor_moss', [
    'AAAAAAAAAAAAAAAA',
    'ACCAACCAACCAACCA',
    'AAAAAAAABAAAAAAA',
    'ACCAACCAACCAACCA',
    'AABAAAAAAAAAAAAA',
    'ACCAACCAACCAACCA',
    'AAAAAABAAAAAAAAC',
    'ACCAACCAACCAACCA',
    'AAAAAAAAAABAAAAA',
    'ACCAACCAACCAACCA',
    'AABAAAAAAAAAAAAA',
    'ACCAACCAACCAACCA',
    'AAAAAAAAAAAABAAA',
    'ACCAACCAACCAACCA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);
  PX.tint('t_floor_moss_v2', [
    'AAAAAAAAAAAAAAAA',
    'AABAAAAAAAAAAAAB',
    'AAAAAAAAAAAAAAAA',
    'AAACAAACAAACAAAC',
    'AAAAAAAAAAAAAAAA',
    'AABAAAAAAAAAAAAB',
    'AAAAAAAAAAAAAAAA',
    'AAACAAACAAACAAAC',
    'AAAAAAAAAAAAAAAA',
    'AABAAAAAAAAAAAAB',
    'AAAAAAAAAAAAAAAA',
    'AAACAAACAAACAAAC',
    'AAAAAAAAAAAAAAAA',
    'AABAAAAAAAAAAAAB',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);
  PX.tint('t_floor_stone', [
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAABAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'BBBBBBBBBBBBBBBB',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'BBBBBBBBBBBBBBBB',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'BBBBBBBBBBBBBBBB',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);
  PX.tint('t_floor_stone_v2', [
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAABAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'BBBBBBBBBBBBBBBB',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAABAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'BBBBBBBBBBBBBBBB',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);
  PX.tint('t_floor_mine', [
    'AAAAAAAAAAAAAAAA',
    'AAAAkAAAAAAAAAAA',
    'AAAADAAAAAAkAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAkAAAAAAkAA',
    'AAAAAAAAAAAAAAAA',
    'AAAkAAAAADAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAADAAAAAAkAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAkAAAAAAAA',
    'AAAAkAAAAAAAAAAA',
    'AAAAAAAAAAkAAAAA',
    'AAAADAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);
  PX.tint('t_floor_mine_v2', [
    'AAAAAAAAAAAAAAAA',
    'AAAAAAADAAAAAAAA',
    'AAAAkAAAAAAkAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAADAAAAAAADAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAkAAAAAAAkA',
    'AAAAAAAAAAAAAAAA',
    'AAAAkAAADAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAADAAAAkAAA',
    'AAAAkAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAADAAAAAAkAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);
  PX.tint('t_floor_meadow', [
    'AAAAAAAAAAAAAAAA',
    'ACCAACCAACCAACCA',
    'AAAAAAADAAAAAAAA',
    'ACCAACCAACCAACCA',
    'AADAAAAAAAAAAAAA',
    'ACCAACCAACCAACCA',
    'AAAAAAADAAAAAAAA',
    'ACCAACCAACCAACCA',
    'AAAAAAAAAADAAAAA',
    'ACCAACCAACCAACCA',
    'AADAAAAAAAAAAAAA',
    'ACCAACCAACCAACCA',
    'AAAAADAAAAAAAAAA',
    'ACCAACCAACCAACCA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);
  PX.tint('t_floor_meadow_v2', [
    'AAAAAAAAAAAAAAAA',
    'AADAAAAAAAAAAAAD',
    'AAAAAAAAAAAAAAAA',
    'AAACAAACAAACAAAC',
    'AAAAAADAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AADAAAAAAAAAAAAD',
    'AAACAAACAAACAAAC',
    'AAAAAAAAAAAAAAAA',
    'AAAAAADAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAACAAACAAACAAAC',
    'AAAAAADAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);
  PX.tint('t_floor_void', [
    'AAAAAAAAAAAAAAAA',
    'AAkAAAAAAAAAAAAA',
    'AAAAAAkAAAAAAkAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAkAAAAAAAAAAA',
    'AAAAAAAAAAkAAAAA',
    'AAAAAAAkAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAkAAAAAAkAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAkAAAAAAkAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAkAAAAAAAAAAA',
    'AAAAAAAAAAkAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);
  PX.tint('t_floor_void_v2', [
    'AAAAAAAAAAAAAAAA',
    'AAAAkAAAAAAAAAAA',
    'AAkAAAAAAkAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAkAAAAAAAAA',
    'AAAAAAAkAAkAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAkAAAAAAAAAAA',
    'AAkAAAAAAAAAAAkA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAkAAAAAAkAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAkAAAAAAAAAAA',
    'AAAAAAAkAAAAAAAA',
    'AAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAA'
  ]);

  /* ------------------------------------------------------------
     主题配置：T1 生机 → T2 荒凉 → T3 破败 → T4 阳光骗局 → T5 终焉
     ------------------------------------------------------------ */
  G.Art.THEMES = {
    1: {
      id: 'fringe', name: '裂隙边缘', concept: '地表边缘 · 尚有生机',
      floor: { sprite: 't_fm_a', variants: ['t_fm_a', 't_fm_b', 't_fm_c', 't_fm_d'], col: '#5f9a52', alpha: 0.42, tileAlpha: 0.92 },
      wall: { col: '#39493c' },
      void: ['#141c14', '#182218'],
      ground: { density: 0.16, elements: [
        { spr: 'g_grass_tuft', col: '#6fae5a', w: 4 },
        { spr: 'g_grass_blade', col: '#7fbf68', w: 4 },
        { spr: 'g_moss_patch', col: '#4f8a44', w: 3 },
        { spr: 'g_pebble', col: '#5f6655', w: 2 },
        { spr: 'g_dirt_patch', col: '#4a443a', w: 2 },
        { spr: 'g_leaf', col: '#8a7a4a', w: 1 },
        { spr: 'g_twig', col: '#6a5a3a', w: 1 }
      ] },
      decor: [
        { spr: 't_grass', col: '#5f9a4f', n: 7 },
        { spr: 't_moss', col: '#4a7a3a', n: 5 },
        { spr: 't_flower', col: '#e8e0b0', n: 2 },
        { spr: 't_pebble', col: '#5f6655', n: 4 },
        { spr: 't_bone', col: '#c9c9c9', n: 1 }
      ],
      ambient: { top: 'rgba(130,190,130,0.08)', bottom: 'rgba(0,0,0,0.38)', glow: '#7fbf7f', glowA: 0.05 },
      particles: { col: '#9fcf8f' }
    },
    2: {
      id: 'corridor', name: '幽暗回廊', concept: '中层回廊 · 严肃荒凉',
      floor: { sprite: 't_sc_a', variants: ['t_sc_a', 't_sc_b', 't_sc_c', 't_sc_d'], col: '#6a78a8', alpha: 0.46, tileAlpha: 0.92 },
      wall: { col: '#3a4160' },
      void: ['#12162a', '#161c36'],
      ground: { density: 0.14, elements: [
        { spr: 'g_slab', col: '#4a5270', w: 3 },
        { spr: 'g_crack', col: '#242a3c', w: 3 },
        { spr: 'g_chip', col: '#5a6278', w: 2 },
        { spr: 'g_dust', col: '#3c4460', w: 2 },
        { spr: 'g_pebble', col: '#4a5068', w: 1 }
      ] },
      decor: [
        { spr: 't_bone', col: '#b9c0cc', n: 5 },
        { spr: 't_rubble', col: '#5a6278', n: 5 },
        { spr: 't_vine', col: '#4a5a44', n: 3 },
        { spr: 't_pebble', col: '#4a5068', n: 3 }
      ],
      ambient: { top: 'rgba(90,110,170,0.08)', bottom: 'rgba(0,0,0,0.42)', glow: '#7fa8ff', glowA: 0.04 },
      particles: { col: '#8fa8d8' }
    },
    3: {
      id: 'mine', name: '深部矿坑', concept: '深部矿脉 · 黑暗破败',
      floor: { sprite: 't_mn_a', variants: ['t_mn_a', 't_mn_b', 't_mn_c', 't_mn_d'], col: '#7a68a8', alpha: 0.44, tileAlpha: 0.92 },
      wall: { col: '#4a3c5a' },
      void: ['#141020', '#181230'],
      ground: { density: 0.15, elements: [
        { spr: 'g_rock_chunk', col: '#3a3548', w: 4 },
        { spr: 'g_crystal_grain', col: '#a06fff', w: 3 },
        { spr: 'g_slag', col: '#2a2634', w: 3 },
        { spr: 'g_crack', col: '#1c1826', w: 2 },
        { spr: 'g_dust', col: '#4a4058', w: 1 }
      ] },
      decor: [
        { spr: 't_crystal', col: '#a06fff', n: 5 },
        { spr: 't_rubble', col: '#3a3548', n: 5 },
        { spr: 't_ash', col: '#2a2634', n: 4 },
        { spr: 't_bone', col: '#8f8898', n: 2 }
      ],
      ambient: { top: 'rgba(120,80,180,0.08)', bottom: 'rgba(0,0,0,0.48)', glow: '#c07fff', glowA: 0.06 },
      particles: { col: '#b88fff' }
    },
    4: {
      id: 'heart', name: '深渊腹地', concept: '阳光骗局 · 地面镜像',
      floor: { sprite: 't_hm_a', variants: ['t_hm_a', 't_hm_b', 't_hm_c', 't_hm_d'], col: '#78c06a', alpha: 0.55, tileAlpha: 0.92 },
      wall: { col: '#b09a6a' },
      void: ['#242a16', '#2c341c'],
      ground: { density: 0.15, elements: [
        { spr: 'g_grass_tuft', col: '#7fbf68', w: 4 },
        { spr: 'g_flower', col: '#ffe9a0', w: 3 },
        { spr: 'g_mushroom', col: '#d8a06a', w: 2 },
        { spr: 'g_pebble', col: '#8a8f6a', w: 2 },
        { spr: 'g_leaf', col: '#9a8a4a', w: 2 }
      ] },
      decor: [
        { spr: 't_flower', col: '#ffe9a0', n: 6 },
        { spr: 't_grass', col: '#8fc06a', n: 5 },
        { spr: 't_mushroom', col: '#d8a06a', n: 2 },
        { spr: 't_pebble', col: '#8a8f6a', n: 3 }
      ],
      ambient: { top: 'rgba(255,230,150,0.16)', bottom: 'rgba(60,40,10,0.28)', glow: '#ffe9a0', glowA: 0.10 },
      light: { sun: true, col: '#ffe9a0', beamA: 0.10, spots: 3 },
      particles: { col: '#ffe9a0' }
    },
    5: {
      id: 'gate', name: '终焉之门', concept: '深渊之心 · 最黑暗破败',
      floor: { sprite: 't_vd_a', variants: ['t_vd_a', 't_vd_b', 't_vd_c', 't_vd_d'], col: '#6a4458', alpha: 0.46, tileAlpha: 0.92 },
      wall: { col: '#4a2a3a' },
      void: ['#120a10', '#160c14'],
      ground: { density: 0.15, elements: [
        { spr: 'g_char', col: '#2a1c24', w: 4 },
        { spr: 'g_ash_patch', col: '#3a2a34', w: 3 },
        { spr: 'g_blood_crack', col: '#8a2438', w: 3 },
        { spr: 'g_bone_chip', col: '#6a5a62', w: 2 },
        { spr: 'g_slag', col: '#241820', w: 2 }
      ] },
      decor: [
        { spr: 't_ash', col: '#2a1c24', n: 6 },
        { spr: 't_bone', col: '#6a5a62', n: 3 },
        { spr: 't_rune', col: '#ff4a6b', n: 3 },
        { spr: 't_crystal', col: '#ff4a6b', n: 2 },
        { spr: 't_eye', col: '#ff3b6b', n: 1 }
      ],
      ambient: { top: 'rgba(120,20,40,0.08)', bottom: 'rgba(0,0,0,0.55)', glow: '#ff4a6b', glowA: 0.07 },
      particles: { col: '#ff5a7a' }
    }
  };

  G.Art.themeOf = function (tierId) {
    return G.Art.THEMES[tierId] || G.Art.THEMES[1];
  };

  /* ------------------------------------------------------------
     像素风块状地面：350×350 离屏画布。
     双线性插值生成明暗渐变 → 量化为 ~25px 大像素块（显示约 50px），
     每块左上高光、右下阴影、块间细缝——经典像素地面斑驳感。
     ------------------------------------------------------------ */
  G.Art.groundOf = function (map, roomIdx) {
    map._grounds = map._grounds || {};
    if (map._grounds[roomIdx]) return map._grounds[roomIdx];
    var th = G.Art.themeOf(map.tierId);
    var base = G.PX.hex2rgb(th.floor.col);
    var S = 9;
    var W = 350, H = 350;
    function hs(x, y) {
      var n = ((x * 374761393 + y * 668265263 + roomIdx * 73856093 + (map.salt || 0) * 19349663) >>> 0);
      n = ((n ^ (n >>> 13)) * 1274126177) >>> 0;
      return n;
    }
    var pts = [];
    for (var sy = 0; sy < S; sy++) {
      pts.push([]);
      for (var sx = 0; sx < S; sx++) {
        var h = hs(sx, sy);
        var v = (h % 1000) / 1000 - 0.5;
        var br = 1 + v * 0.30;
        var r = base[0] * br + ((h % 13) - 6) * 0.5;
        var g2 = base[1] * br + (((h >>> 4) % 13) - 6) * 0.5;
        var b2 = base[2] * br + (((h >>> 8) % 13) - 6) * 0.5;
        pts[sy].push([G.clamp(r, 0, 255), G.clamp(g2, 0, 255), G.clamp(b2, 0, 255)]);
      }
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function sample(fx, fy) {
      var x0 = Math.min(S - 2, Math.floor(fx)), y0 = Math.min(S - 2, Math.floor(fy));
      var tx = fx - x0, ty = fy - y0;
      var p00 = pts[y0][x0], p10 = pts[y0][x0 + 1], p01 = pts[y0 + 1][x0], p11 = pts[y0 + 1][x0 + 1];
      return [
        lerp(lerp(p00[0], p10[0], tx), lerp(p01[0], p11[0], tx), ty),
        lerp(lerp(p00[1], p10[1], tx), lerp(p01[1], p11[1], tx), ty),
        lerp(lerp(p00[2], p10[2], tx), lerp(p01[2], p11[2], tx), ty)
      ];
    }
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(W, H);
    var data = img.data;
    var idx = 0;
    for (var py = 0; py < H; py++) {
      var fy = py / (H - 1) * (S - 1);
      for (var px = 0; px < W; px++) {
        var fx = px / (W - 1) * (S - 1);
        var cc = sample(fx, fy);
        data[idx++] = cc[0];
        data[idx++] = cc[1];
        data[idx++] = cc[2];
        data[idx++] = 255;
      }
    }
    /* 量化 + 像素块立体边（14×14 逻辑块） */
    var B = 14, bw = W / B;
    function colArr(c) { return [c[0], c[1], c[2]]; }
    for (var by = 0; by < B; by++) {
      for (var bx = 0; bx < B; bx++) {
        var c0 = sample((bx + 0.5) / B * (S - 1), (by + 0.5) / B * (S - 1));
        var hi = [Math.min(255, c0[0] + 22), Math.min(255, c0[1] + 22), Math.min(255, c0[2] + 22)];
        var sh = [c0[0] * 0.68, c0[1] * 0.68, c0[2] * 0.68];
        var seam = [c0[0] * 0.5, c0[1] * 0.5, c0[2] * 0.5];
        var x0 = Math.floor(bx * bw), x1 = Math.floor((bx + 1) * bw);
        var y0 = Math.floor(by * bw), y1 = Math.floor((by + 1) * bw);
        for (var py = y0; py < y1; py++) {
          for (var px = x0; px < x1; px++) {
            var di = (py * W + px) * 4;
            var col = c0;
            if (py === y0 || px === x0) col = seam;
            else if (py - y0 < 2 || px - x0 < 2) col = hi;
            else if (py >= y1 - 2 || px >= x1 - 2) col = sh;
            data[di] = col[0];
            data[di + 1] = col[1];
            data[di + 2] = col[2];
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return (map._grounds[roomIdx] = cv);
  };

  /* ------------------------------------------------------------
     地面材质元素散布：确定性位置/种类/大小/透明度/镜像，
     避开中心安全区与房内墙体。让地面"读得出来"是什么材质。
     ------------------------------------------------------------ */
  G.Art.groundElements = function (map, roomIdx) {
    map._groundEls = map._groundEls || {};
    if (map._groundEls[roomIdx]) return map._groundEls[roomIdx];
    var th = G.Art.themeOf(map.tierId);
    var gd = th.ground;
    if (!gd || !gd.elements || !gd.elements.length) return (map._groundEls[roomIdx] = []);
    var rc = G.Map.roomRect(map.rooms[roomIdx].c, map.rooms[roomIdx].r);
    var totalW = 0;
    gd.elements.forEach(function (e) { totalW += e.w; });
    var n = Math.round((gd.density || 0.15) * 230);
    var iRect = map.interiorByRoom ? map.interiorByRoom[roomIdx] : null;
    var cx = rc.x0 + G.Map.ROOM / 2, cy = rc.y0 + G.Map.ROOM / 2;
    var salt = (map.salt || 0);
    var out = [];
    /* 低矮贴地元素（可在中心安全区出现，不遮挡交互） */
    var FLAT = {
      g_moss_patch: 1, g_dirt_patch: 1, g_dust: 1, g_crack: 1,
      g_ash_patch: 1, g_blood_crack: 1, g_pebble: 1, g_slag: 1,
      g_char: 1, g_leaf: 1
    };
    var flatList = gd.elements.filter(function (e) { return FLAT[e.spr]; });
    for (var i = 0; i < n; i++) {
      var h = ((i * 104729 + roomIdx * 73856093 + salt * 19349663) >>> 0);
      h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
      var h2 = ((h >>> 7) * 668265263 + i * 7919) >>> 0;
      var x = 0, y = 0, ok = false;
      var centerZone = false;
      for (var tr = 0; tr < 8 && !ok; tr++) {
        x = rc.x0 + 70 + ((h + tr * 7919) % Math.max(1, G.Map.ROOM - 140));
        y = rc.y0 + 70 + (((h2 >>> 4) + tr * 104729) % Math.max(1, G.Map.ROOM - 140));
        centerZone = Math.abs(x - cx) < 180 && Math.abs(y - cy) < 180;
        if (centerZone && !flatList.length) continue;   // 中心区只放低矮元素
        ok = true;
        if (iRect) {
          for (var ir = 0; ir < iRect.length; ir++) {
            if (x > iRect[ir][0] - 20 && x < iRect[ir][2] + 20 &&
                y > iRect[ir][1] - 20 && y < iRect[ir][3] + 20) { ok = false; break; }
          }
        }
      }
      if (!ok) continue;
      var roll = h2 % totalW;
      var pool = centerZone ? flatList : gd.elements;
      var poolW = 0;
      pool.forEach(function (e) { poolW += e.w; });
      roll = h2 % poolW;
      var pick = pool[0];
      for (var wi = 0; wi < pool.length; wi++) {
        roll -= pool[wi].w;
        if (roll < 0) { pick = pool[wi]; break; }
      }
      var sc = pick.sc
        ? pick.sc[Math.floor((h2 >>> 8) % pick.sc.length)]
        : (pick.scale || 2);
      out.push({
        spr: pick.spr, col: pick.col, x: x, y: y,
        sc: sc,
        a: 0.72 + ((h2 >>> 11) % 26) / 100,
        flip: ((h2 >>> 13) % 3) === 0
      });
    }
    return (map._groundEls[roomIdx] = out);
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
