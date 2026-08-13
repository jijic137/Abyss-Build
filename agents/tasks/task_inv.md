# 任务：背包多格物品系统（子代理 B）

项目：C:\Users\ts\Desktop\Abyss-Build（浏览器游戏，无构建，脚本挂全局 G）

## 背景
- 局内背包是 `g.bag` 数组，元素是物品实例 `{uid, defId, def, tier, type}`，type ∈ weapon/armor/trinket/relic（`G.itemType(def)` 判定）。
- 现在背包按"件数"计数：`G.BAG_SIZE = 12`（在 js/10_game.js）。UI 在 js/15_extract.js 的 `G.UI.renderBag` 里每件画一格。
- 需求：物品不再都占一格——武器占 2x1、防具占 1x2、饰品占 1x1、遗物占 2x2；背包改为 6 列 x 4 行 = 24 格的面积制。

## 你的产出（纯逻辑，不碰现有文件）
新建 `js/32_inv.js`（apply_patch），挂 window.G，必须无 DOM 依赖：
- `G.Inv = {}`
- `G.Inv.BAG_W = 6`、`G.Inv.BAG_H = 4`、`G.Inv.AREA = 24`
- `G.Inv.sizeOf(inst)` → `{w,h}`：weapon {2,1}，armor {1,2}，trinket {1,1}，relic {2,2}；未知类型默认 {1,1}。
- `G.Inv.rects(bag)` → 每个实例的 `{x:inst.px, y:inst.py, w, h}`。
- `G.Inv.cellCount(bag)` → 所有物品 w*h 之和。
- `G.Inv.fit(bag, w, h)` → 从 (0,0) 逐行逐列找第一个能放下的位置 `{x,y}`，放不下返回 null（已占格来自 rects，且不越界）。
- `G.Inv.place(bag, inst)` → 找空位，设 `inst.px/inst.py` 后 push，成功 true / 失败 false（不 push）。
- `G.Inv.remove(bag, idx)` → splice 并返回实例。
- `G.Inv.packAll(bag)` → 按当前顺序重新 first-fit 摆放全部物品（用于读档后重排）。
- `G.Inv.selfTest()` → 纯逻辑自测：放一件 weapon 占 2 格、放满到只剩 1 格时 relic(4格) 放不进去、remove 后能再放、packAll 后无重叠且全部在界内；全部通过返回 true。

再新建 `tools/_check_inv.js`：node 里 `window={}` 桩加载 js/32_inv.js（依赖不存在就用假对象构造 `{type:'weapon'}` 等），跑 selfTest，打印 `INV_OK`。
用 `C:\Users\ts\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` 跑自检（沙箱进程可能失败，读/跑命令需 escalation + justification）。

## 约束
- 只新建 `js/32_inv.js` 与 `tools/_check_inv.js`，不修改任何既有文件。
- 不要 git commit，不要碰 index.html、10_game.js、15_extract.js（根代理负责接线）。
- 完成后汇报：API 清单、selfTest 输出。
