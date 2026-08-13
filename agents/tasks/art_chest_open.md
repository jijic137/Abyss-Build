# 任务：宝箱开盖动画帧（像素精灵）

你是像素美术生产任务。为一个 HTML5 Canvas 像素 Roguelike 游戏制作"开箱开盖动画帧"。

## 只能做的事
1. 用 apply_patch 的 Add File 创建新文件：`js/art_chest_open.js`（注意：apply_patch 只支持新增文件；不要运行 shell；不要读其他文件；不要修改任何已有文件）。
2. 不要执行其他任务，完成后回复"文件已创建"。

## 文件骨架
'use strict';
(function () {
  G.PX.tint('crt_wood_0', [ ... ]);
  G.PX.tint('crt_wood_1', [ ... ]);
  G.PX.tint('crt_wood_2', [ ... ]);
  // crate / barrel / iron / gold / abyss 同理，各 3 帧
  G.Art = G.Art || {};
  G.Art.chestFrames = {
    chest_wood: ['crt_wood_0', 'crt_wood_1', 'crt_wood_2'],
    crate: ['crt_crate_0', 'crt_crate_1', 'crt_crate_2'],
    barrel: ['crt_barrel_0', 'crt_barrel_1', 'crt_barrel_2'],
    chest_iron: ['crt_iron_0', 'crt_iron_1', 'crt_iron_2'],
    chest_gold: ['crt_gold_0', 'crt_gold_1', 'crt_gold_2'],
    chest_abyss: ['crt_abyss_0', 'crt_abyss_1', 'crt_abyss_2']
  };
  G.Art.chestFrameTime = 0.12; // 每帧时长（秒），供播放器使用
})();

## 规格
- 每种箱子 3 帧：0=闭合、1=开盖一半（盖子掀开 45°，露出箱内亮光 D）、2=完全打开（盖子立起，箱内高亮，顶部有宝光溢出）。
- 建议 12x12（barrel 可 10x12），每帧所有行长度必须相等；同一组 3 帧尺寸一致。
- 字母：o=描边、A=主色、B=暗部、C=亮部、D=高光、w=白、k=黑、.=透明。
- 用 A/B/C 做出箱体体积感；第 2 帧箱内用 D/w 表现宝光，gold/abyss 帧 2 可在箱口上方加 2-3 个 D 光点。
- 加载时只调用 G.PX.tint，不要引用 document/window。

## 验收
输出文件可被 node 直接加载（不抛错），G.Art.chestFrames 含 6 种箱子各 3 帧。
