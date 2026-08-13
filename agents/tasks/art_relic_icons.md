# 任务：遗物大图标 + 出货闪光帧

你是像素美术生产任务。为一个 HTML5 Canvas 像素 Roguelike 游戏制作"遗物级大图标与出货闪光"。

## 只能做的事
1. 用 apply_patch 的 Add File 创建新文件：`js/art_relic.js`（注意：apply_patch 只支持新增文件；不要运行 shell；不要读其他文件；不要修改任何已有文件）。
2. 不要执行其他任务，完成后回复"文件已创建"。

## 文件骨架
'use strict';
(function () {
  G.PX.tint('rel_abyss_eye', [ ... ]);   // 16x16
  G.PX.tint('rel_void_crown', [ ... ]);
  G.PX.tint('rel_blood_heart', [ ... ]);
  G.PX.tint('rel_eldritch_book', [ ... ]);
  G.PX.tint('rel_storm_core', [ ... ]);
  G.PX.tint('rel_gold_skull', [ ... ]);
  G.PX.tint('spark_rays_1', [ ... ]);    // 12x12 闪光/射线帧 1
  G.PX.tint('spark_rays_2', [ ... ]);    // 帧 2
  G.PX.tint('spark_rays_3', [ ... ]);    // 帧 3
  G.Art = G.Art || {};
  G.Art.relicIcons = ['rel_abyss_eye', 'rel_void_crown', 'rel_blood_heart', 'rel_eldritch_book', 'rel_storm_core', 'rel_gold_skull'];
  G.Art.sparkFrames = ['spark_rays_1', 'spark_rays_2', 'spark_rays_3'];
  G.Art.sparkFrameTime = 0.07;
})();

## 规格
- 6 个遗物图标：16x16 像素网格，风格华丽（紫金/猩红/深渊蓝），有轮廓与高光，主题分别是：深渊之眼、虚空王冠、血之心、禁忌之书、风暴核心、黄金颅。
- 3 个闪光帧：12x12，中心亮 + 放射状光线（帧 1 收拢、帧 2 最亮、帧 3 扩散变淡），用于出货瞬间的闪光叠加。
- 每行长度必须完全相等；字母：o=描边、A=主色、B=暗部、C=亮部、D=高光、w=白、k=黑、.=透明。
- 加载时只调用 G.PX.tint，不要引用 document/window。

## 验收
输出文件可被 node 直接加载（不抛错），G.Art.relicIcons 6 项、G.Art.sparkFrames 3 项。
