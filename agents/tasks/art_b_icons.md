# Task: 物品像素图标生成器 — js/33_art4.js

你是美术子代理，为 Abyss-Build（HTML5 Canvas 2D 像素游戏）生成程序化物品图标。
项目路径：C:\Users\ts\Desktop\Abyss-Build

## 硬性约束
- 只允许创建/修改这一个文件：js/33_art4.js
- 禁止修改 index.html 或任何其他文件；不要运行 git 命令；不要提交。
- 文件必须自执行、可独立加载（挂在全局 G 上），不依赖 DOM。

## 背景
- 请先阅读：
  - js/01_pixel.js（G.PX 精灵体系、调色板、注册方式）
  - js/03_items.js（物品定义：type 字段如 weapon/armor/trinket/relic，name、rarity 等）
  - js/04_weapons.js（42 把武器：基础型字段、name）
  - js/00_util.js（RAR 稀有度表与颜色）
- 现状：背包/出货卡里物品只有文字，需要程序化像素图标来填充。

## 交付物（全部写入 js/33_art4.js）
提供 G.PX.itemIcon(def) -> 精灵名（或返回 {g, pal} 结构），要求：
1. 覆盖 42 种武器基础型（按 04_weapons.js 实际字段：剑/斧/匕首/枪/弓/法杖/霰弹/炮/拳/环绕/近战/投掷/工程等），
   每个基础型至少 2-3 种视觉变体（按 name 关键词或 rarity 选择），避免千篇一律。
2. 覆盖物品类型：防具（胸甲/头盔）、饰品（戒指/项链/护符）、遗物（纹章/圣物/神像）、消耗（药剂/卷轴），
   每类至少 3 个不同形状，总计图标 ≥ 54 个。
3. 图标 12x12 或 16x16，自带稀有度边框（边缘 1px 用 RAR 颜色描边）。
4. 全部挂 G.PX，调用简单：G.PX.itemIcon(def) 返回可用精灵名。

## 验收
- node --check js/33_art4.js 通过（node 路径：
  C:\Users\ts\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe）
- 图标覆盖清单齐全；不修改任何现有文件。
- 报告：覆盖清单、调用示例。
