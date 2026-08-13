# 任务：宝箱出货飞行动画（js/34_loot_fly.js + css/extract.css）

你是一个子代理，负责为《深渊猎手》实现"开箱出货飞行动画"。项目根目录：
`C:\Users\ts\Desktop\Abyss-Build`（纯前端 HTML5 游戏，所有模块挂全局 `G` 命名空间，按 index.html 顺序加载）。

## 背景（已由主代理定位）
- 开箱结算入口是 `G.game.applyContainerReward(c, out)`（定义在 js/10_game.js，js/32_loot.js 又包了一层做品质特效）。
- js/32_loot.js 已实现：分级音效 `G.Loot.sfx(tier)`、画布粒子 `G.Loot.fx(x,y,tier)`、出货卡片队列 `G.UI.showLootCard(inst)`（toast 卡片，DOM id：lootToast/lootIcon/lootName/lootSub）。
- 你要**新做** js/34_loot_fly.js：物品从宝箱位置弹出、带稀有度辉光、飞向左下/底部 loot toast 区域的飞行动画。**不要修改任何已有 js 文件**（除 index.html 的注册由主代理负责），CSS 只能**追加**到 css/extract.css 末尾。

## 实现要求
1. 定义 `G.UI.lootFly(inst, worldX, worldY, delayMs)`：
   - 用 `G.PX.node(G.weaponIcon(inst.def, inst.tier, 4))` 或 `G.itemIcon(inst.def, 4)`（inst.type==='weapon' 用前者）生成图标 canvas，包一个 div。
   - 屏幕坐标：`sx = worldX - G.game.camX + G.game.vw/2 + canvasRect.left`，`sy = worldY - G.game.camY + G.game.vh/2 + canvasRect.top`；canvasRect = `G.game.canvas.getBoundingClientRect()`。
   - 稀有度颜色：`inst.tier===0 ? '#d9dde8' : G.rarityColor(inst.tier)`。
   - 动画阶段：弹出（从宝箱处 scale .3→1 弹跳 + 辉光闪现）→ 停顿 150ms → 飞向目标点（lootToast 元素中心，找不到就屏幕左下 1/4 处）并缩小淡出，总时长约 650ms，结束后移除 DOM 节点。
   - `delayMs` 支持排队错开（默认 0）。
2. 在文件内包裹 `G.game.applyContainerReward`（注意保留原函数调用链）：调用原函数后，遍历 out，对 `o.inst` 且 `G.game.bag.indexOf(o.inst) >= 0`（确认真的入包了）的，按 i*140ms 错开调 `G.UI.lootFly`。如果 `G.UI.showLootCard` 是函数则无需再触发卡片（原函数已触发）。
3. CSS 追加到 extract.css 末尾：`.loot-fly{ position:fixed; z-index:80; pointer-events:none; display:flex; align-items:center; justify-content:center; }`、辉光用 `filter:drop-shadow(0 0 8px var(--rc,#ffd24a))`、弹出/飞行两段关键帧动画（飞行段用 `transition` 或关键帧皆可，元素中心点作为基准，避免偏移跳动）。
4. 自检：用 node 做语法检查（`node --check`），并读 js/32_loot.js、js/10_game.js 确认 `applyContainerReward` 签名与 `G.PX.node`/`G.weaponIcon`/`G.itemIcon` 的用法。不要运行整页游戏；不要 git 提交。
5. 完成后在最终回复里说明：新建文件路径、CSS 追加的行数、以及你如何验证。

## 关键约定
- 不要修改 js/32_loot.js、js/10_game.js、index.html、其他 js 文件。
- CSS 只允许追加到 css/extract.css（用 Add-Content 或 apply_patch 追加即可）。
- 全部代码风格：'use strict'; IIFE；var 声明；与现有文件一致。
