# 资源目录规划（Assets）

所有美术 / 音频 / 3D / 字体等外部资源统一放在 `assets/` 下管理。
代码引用一律使用**相对路径**（如 `assets/art/chars/knight.png`），不跨目录随意放置。

```
assets/
├── art/                  # 美术资源
│   ├── covers/           # 封面 / 宣传海报 / 标题背景
│   │   └── cover.png     #   当前 AI 克苏鲁深渊封面（1536×914）
│   ├── chars/            # 角色形象（立绘 / 头像 / 海报）
│   │   ├── knight.png    #   铁卫（AI 像素立绘）
│   │   ├── ranger.png    #   游侠
│   │   ├── mage.png      #   术士
│   │   ├── brute.png     #   狂徒
│   │   ├── engineer.png  #   工匠
│   │   ├── shadow.png    #   影刺
│   │   ├── alchemist.png #   炼金术士
│   │   └── warden.png    #   守望者
│   ├── sprites/          # 精灵图（像素图源 / 未来 PNG 精灵 / 动画帧）
│   ├── ui/               # UI 元素（图标 / 按钮 / 面板 / 角标 / 装饰）
│   ├── fx/               # 特效贴图（粒子 / 光效 / 烟雾 / 材质 / 纹理）
│   └── audio/            #（备用：美术目录内音频拆分用，见下方 audio/）
├── audio/                # 音频资源（外部文件；当前音效/BGM 为 WebAudio 程序化合成，零文件）
│   ├── bgm/              # 背景音乐（.ogg / .mp3）
│   ├── sfx/              # 音效（.wav / .ogg）
│   └── voice/            # 语音 / 剧情配音（预留）
├── models/               # 3D 模型（预留）
│   ├── characters/       # 角色模型
│   ├── props/            # 道具 / 武器 / 场景物件
│   └── maps/             # 地图 / 环境 / 关卡
└── fonts/                # 字体文件（.ttf / .otf / .woff2）

```

## 命名规范
- **小写 + 下划线**：`knight.png`、`bgm_dungeon_01.ogg`、`fx_poison_cloud.png`
- 角色资源按职业 id：`knight / ranger / mage / brute / engineer / shadow / alchemist / warden`
- 版本 / 变体追加后缀：`cover_v2.png`、`knight_dark.png`
- 程序生成 / 去水印临时文件**不得**提交进 `assets/`（用 `tools/` 或临时目录）

## 引用约定
- 游戏内引用：`assets/art/...`、`assets/audio/...`
- 新增资源时：先放对目录，再改代码；不建新顶层目录除非有明确类型（如 video/ 视频）
- 代码中的精灵（`01_pixel.js` 字符网格）目前是纯代码生成，未来如需外部 PNG 精灵替换，统一放 `assets/art/sprites/`

## 与代码的关系
- 封面：`index.html` → `assets/art/covers/cover.png`
- 轮盘角色背景：`js/09_ui.js` → `assets/art/chars/{id}.png`
- 音效 / BGM：`js/12_audio.js`（当前全程序化合成，零外部文件；未来接入外部音频时放 `assets/audio/`）
