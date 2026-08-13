# 任务：品质化开箱/拾取音效（子代理 A）

项目：C:\Users\ts\Desktop\Abyss-Build（浏览器游戏，无构建，脚本挂全局 G）

## 背景
- 稀有度 0~4：普通(白 #d9dde8) / 优良(绿 #4fd06b) / 稀有(蓝 #46a2ff) / 史诗(紫 #b45cff) / 传说(红 #ff4a4a)。
- `js/12_audio.js` 是 WebAudio 程序化合成：内部有 `SOUNDS` 表（name -> function(A,t)）与 `_gap` 节流表，`AudioSys.prototype.sfx(name,pan)` 负责播放。可用合成原语（原型方法）：
  - `A._tone(t, {type,f0,f1,dur,gain,atk,detune,fm:{ratio,idx,decay},send,center,lfo:{rate,depth,target}})`
  - `A._noise(t, {dur,gain,filt:{type,f0,f1,q},send,center})`
  - `A._chord(t, [freqs], {type,dur,gain,stagger,f1:[...],send,center})`
  - 无 AudioContext（无头/node）时 `sfx` 已静默降级，新代码也要同样防御。

## 目标：开箱要有"搜索"过程感 + 品质越高反馈越强的音效
1. 在 `js/12_audio.js` 内新增（这是唯一允许修改的既有文件）：
   - `AudioSys.prototype.registerSound = function (name, fn, gap) {}` —— 向 `SOUNDS` 与 `_gap` 注册新音效（放在该 IIFE 作用域内，直接操作 SOUNDS/_gap 变量）。
2. 新建 `js/32_audio.js`（apply_patch 创建），挂在 window.G 上：
   - 用 registerSound 注册 `loot_reveal_0` ~ `loot_reveal_4`：开箱"搜索扫描"音，档位越高扫频时间越长、层数越多、音高越华丽（0 短促一声 + 细碎噪声；4 长 riser + 和弦 + 高频 shimmer）。
   - 注册 `loot_gain_0` ~ `loot_gain_4`：物品入包"确认"音，按档位升阶（0 单音 blip；1 双音；2 小三和弦；3 大调和弦+铃；4 完整号角感 + 混响 + 闪烁噪声）。
   - `G.Audio.playChestReveal(tier)`：编排序列——先放 `chest_open`（已有），延时 0.08s 放对应 `loot_reveal_*`，再延时 0.28s 放 `loot_gain_*`（tier 高时在 0.38s 追加一次泛音层）。用 ctx.currentTime 规划，不用 setTimeout。
   - `G.Audio.playItemGain(tier)`：直接放 `loot_gain_*`。
   - 所有方法在 `this.ctx` 为空时直接 return；单音异常 catch。
   - 音量克制：单个音 gain 0.08~0.22，传说档可以到 0.26 但不要爆音。
3. 新建 `tools/_check_audio.js`：node 环境 `window={}` 桩加载 12_audio.js 与 32_audio.js，调用 playChestReveal(0..4) 与 playItemGain(0..4) 不抛异常即通过，最后打印 `AUDIO_OK`。
4. 用 `C:\Users\ts\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` 跑自检（沙箱进程可能失败，读/跑命令需 escalation + justification）。

## 约束
- 只允许修改 `js/12_audio.js`（加一个方法）并新建 `js/32_audio.js`、`tools/_check_audio.js`。其余文件一律不动。
- 不要 git commit，不要碰 index.html（根代理接线）。
- 完成后汇报：改了什么、注册了哪些音效、自检输出。
