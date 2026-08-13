# Task: 容器美术（Abyss-Build 搜打撤）— js/32_art3.js

你是美术子代理，为 Abyss-Build（HTML5 Canvas 2D 像素游戏）新增容器/宝箱美术。
项目路径：C:\Users\ts\Desktop\Abyss-Build

## 硬性约束
- 只允许创建/修改这一个文件：js/32_art3.js
- 禁止修改 index.html、js/01_pixel.js 或任何其他文件；不要运行 git 命令；不要提交。
- 文件必须自执行、可独立加载（挂在全局 G 上），不依赖 DOM。

## 背景
- 游戏零依赖，所有精灵在 js/01_pixel.js 里用“字符网格 + 调色板”在运行时拼装（G.PX 体系）。
- js/30_art2.js 是已存在的环境美术文件（圣泉/祭坛/装饰），js/29_env.js 是地板/墙体瓷砖。
- 请先完整阅读 js/01_pixel.js（精灵注册与渲染 API、色键规范）、js/30_art2.js（写法范例）、
  js/21_explore.js（容器种类与开启流程）、js/14_map.js（房间类型）。

## 交付物（全部写入 js/32_art3.js）
1. 4 档容器的 16x16 像素精灵，每档含 closed / open 两个状态：
   - 木箱 wood（浅棕木纹）
   - 铁箱 iron（灰蓝金属、铆钉、棱角）
   - 金箱 gold（金色、宝石镶嵌）
   - 深渊箱 abyss（深紫黑、紫色纹路/眼睛）
   打开态必须有明显视觉差异（盖子掀起、裂开、发光），让玩家一眼看出已开。
   命名用新名字（如 p_chest_wood_closed / p_chest_wood_open），不要覆盖现有 p_crate。
2. 每档容器提供“品质氛围”配置：显示名、主色、辉光色（如
   G.PX.chestTier = { name:'木箱', glow:'#c98a5b', ... }，命名风格与 01_pixel 一致）。
3. 一组 8x8 星光/火花粒子形状（star/spark 等 3-4 个），供开箱出货反馈使用。

## 验收
- node --check js/32_art3.js 通过（用项目自带 node：
  C:\Users\ts\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check）
- 精灵字符串宽高一致；色键要么复用 PX 已有键，要么自注册（遵循 01_pixel.js 的注册方式）。
- 报告：新增精灵清单、尺寸、调用方式示例。
