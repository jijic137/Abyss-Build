# 深渊猎手 · 内容登记表 (Content Registry)

> 本文件由 _gen_registry.js 从源码生成主体表格（保证与代码一致）；底部「变更日志」为手工维护，重新生成时保留。
> 每次新增/修改敌人、武器、物品、地图档位、品质比例或平衡数值后，都应重新生成本表并追加一条变更记录。

## 1. 数值总览

- 敌人总数：**30**（普通 22 / 精英 6 / BOSS 2）
- 武器总数：**42**（按标签：melee×10，ranged×16，elemental×10，engineering×6）
- 物品总数：**154**（白 32 / 绿 40 / 蓝 39 / 紫 25 / 红 18；防具 25 / 饰品 77 / 遗物 21 / 宝物 31）
- 角色（职业）：**8**
- 深渊区域（地图档位）：**5**
- 波次配置：**20**（作为地图刷怪难度曲线复用；BOSS 波：10、20）

## 2. 敌人

### 2.1 普通敌人（22）

| id | 名称 | sprite | 缩放 | 半径 | HP | 速度 | 伤害 | 护甲 | 材料 | 危险 | AI | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| worm | 腐虫 | e_worm | 3 | 15 | 18 | 54 | 5 | 0 | 1 | 1 | chase |  |
| bat | 尖啸蝠 | e_bat | 3 | 14 | 14 | 120 | 4 | 0 | 1 | 1.3 | zigzag |  |
| slime | 裂胶怪 | e_slime | 3 | 17 | 30 | 56 | 6 | 0 | 2 | 2 | splitter | 分裂→slimelet×2 |
| slimelet | 小裂胶 | e_slime | 3 | 11 | 11 | 84 | 4 | 0 | 1 | 0 | chase |  |
| skeleton | 枯骨兵 | e_skeleton | 3 | 15 | 32 | 76 | 7 | 1 | 2 | 2 | chase |  |
| beetle | 铁甲虫 | e_beetle | 3 | 18 | 46 | 46 | 8 | 4 | 2 | 2.6 | chase |  |
| eye | 窥视者 | e_eye | 3 | 16 | 24 | 44 | 6 | 0 | 2 | 2.5 | shooter |  |
| spider | 跃蛛 | e_spider | 3 | 15 | 24 | 96 | 5 | 0 | 1 | 2 | leaper |  |
| wraith | 游魂 | e_wraith | 3 | 16 | 28 | 94 | 7 | 0 | 2 | 2.5 | chase | 虚体 |
| bomber | 爆弹虫 | e_bomber | 3 | 16 | 26 | 98 | 6 | 0 | 2 | 3 | bomber |  |
| warlock | 邪术师 | e_warlock | 3 | 17 | 40 | 40 | 9 | 1 | 3 | 4 | shooter | 齐射×3 |
| stone | 石傀 | e_stone | 3 | 21 | 80 | 33 | 12 | 7 | 4 | 4.2 | chase |  |
| charger | 犀角兽 | e_charger | 3 | 20 | 58 | 58 | 14 | 2 | 4 | 4.6 | charger |  |
| swarmling | 虫群 | e_swarmling | 3 | 10 | 9 | 140 | 3 | 0 | 1 | 1.2 | chase |  |
| mimic | 拟态箱 | e_mimic | 3 | 16 | 36 | 60 | 9 | 2 | 8 | 2.4 | chase |  |
| gargoyle | 石像鬼 | e_gargoyle | 3 | 19 | 52 | 44 | 10 | 6 | 3 | 3.5 | chase |  |
| hex_archer | 咒术弓手 | e_hex_archer | 3 | 16 | 26 | 50 | 7 | 0 | 2 | 3 | shooter |  |
| void_horror | 虚空恐魔 | e_void_horror | 3 | 16 | 29 | 110 | 8 | 0 | 2 | 3.2 | zigzag |  |
| glutton | 贪食体 | e_glutton | 3 | 18 | 40 | 58 | 7 | 1 | 2 | 2.8 | splitter | 分裂→swarmling×3 |
| mite | 噬螨 | e_mite | 3 | 10 | 11 | 150 | 3 | 0 | 1 | 1.1 | chase |  |
| crystal | 寒晶 | e_crystal | 3 | 16 | 30 | 38 | 6 | 2 | 2 | 2.8 | shooter | 齐射×3 |
| ogre | 石拳魔 | e_ogre | 3 | 19 | 96 | 34 | 16 | 8 | 5 | 4.4 | chase |  |

### 2.2 精英（6，随波次缩放）

| id | 名称 | sprite | 缩放 | 半径 | HP | 速度 | 伤害 | 护甲 | 材料 | 危险 | AI | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| el_warden | 精英 · 守望者 | el_warden | 4 | 25 | 380 | 46 | 18 | 10 | 30 | 0 | chase | 精英 |
| el_ironclad | 精英 · 铁卫 | el_ironclad | 4 | 26 | 1120 | 42 | 20 | 16 | 26 | 0 | chase | 精英 |
| el_butcher | 精英 · 血屠 | el_butcher | 4 | 24 | 840 | 92 | 23 | 6 | 26 | 0 | charger | 精英 |
| el_hexer | 精英 · 术法者 | el_hexer | 4 | 24 | 720 | 48 | 16 | 5 | 26 | 0 | shooter | 齐射×5; 精英 |
| el_brood | 精英 · 孵化者 | el_brood | 4 | 25 | 960 | 52 | 17 | 7 | 26 | 0 | summoner | 召唤→spider×3; 精英 |
| el_reaper | 精英 · 收割者 | el_reaper | 4 | 25 | 1160 | 80 | 24 | 8 | 28 | 0 | charger | 精英 |

### 2.3 BOSS（2，固定不随波次）

| id | 名称 | sprite | 缩放 | 半径 | HP | 速度 | 伤害 | 护甲 | 材料 | 危险 | AI | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| boss_behemoth | 腐化巨兽 | boss_behemoth | 5 | 46 | 21000 | 46 | 30 | 16 | 130 | 0 | boss1 | 固定(不随波次); BOSS |
| boss_abyss | 深渊之主 | boss_abyss | 5 | 48 | 72000 | 52 | 38 | 24 | 300 | 0 | boss2 | 固定(不随波次); BOSS |

### 2.4 二十波配置

| 波 | 时长 | 投放率 | 精英 | BOSS | 标签 |
|---|---|---|---|---|---|
| 1 | 40 | 2.17 |  |  | 试探 |
| 2 | 42 | 2.8 |  |  | 骚动 |
| 3 | 44 | 3.36 |  |  | 增殖 |
| 4 | 46 | 3.99 |  |  | 骸骨 |
| 5 | 50 | 4.2 | el_butcher@0.4 |  | 精英出现 |
| 6 | 50 | 4.76 |  |  | 甲壳 |
| 7 | 52 | 5.39 |  |  | 游魂 |
| 8 | 54 | 6.02 |  |  | 引爆 |
| 9 | 56 | 6.58 | el_warden@0.35, el_hexer@0.7 |  | 双精英 |
| 10 | 74 | 2.24 |  | boss_behemoth | BOSS · 腐化巨兽 |
| 11 | 58 | 7.14 |  |  | 硬化 |
| 12 | 60 | 7.7 |  |  | 冲锋 |
| 13 | 62 | 8.33 |  |  | 压迫 |
| 14 | 64 | 8.96 | el_brood@0.3, el_ironclad@0.5, el_reaper@0.7 |  | 孵化 |
| 15 | 65 | 8.54 | el_butcher@0.3, el_warden@0.48, el_hexer@0.64 |  | 围剿 |
| 16 | 66 | 9.17 |  |  | 洪流 |
| 17 | 68 | 9.66 | el_ironclad@0.3, el_brood@0.5, el_reaper@0.66, el_warden@0.8 |  | 术法围城 |
| 18 | 70 | 10.36 |  |  | 崩坏 |
| 19 | 72 | 11.13 | el_butcher@0.28, el_hexer@0.46, el_ironclad@0.62, el_reaper@0.76, el_warden@0.88 |  | 最后一夜 |
| 20 | 107 | 3.4 |  | boss_abyss | BOSS · 深渊之主 |

## 3. 武器（42）

| id | 名称 | 类型 | 标签 | 基础伤害 | 冷却 | 特性 | 描述 |
|---|---|---|---|---|---|---|---|
| knife | 小刀 | swing | melee | 7 | 0.52 | 射程78, 弧度1.5 | 出手极快的短刃，暴击率天生偏高。 |
| sword | 巨剑 | swing | melee | 15 | 0.95 | 射程96, 弧度2.1 | 大开大合，一刀能扫倒一整排。 |
| hammer | 战锤 | swing | melee | 28 | 1.55 | 射程88, 弧度1.8 | 慢得让人着急，砸中就是一片。带击退与短暂硬直。 |
| spear | 长矛 | thrust | melee | 13 | 0.78 | 射程132 | 安全距离上的近战，直线穿透。 |
| fist | 铁拳 | swing | melee | 5 | 0.32 | 射程58, 弧度1.3 | 贴脸乱捶。攻速离谱，射程感人。 |
| chainsaw | 电锯 | swing | melee | 3.2 | 0.12 | 射程66, 弧度1.15 | 贴上去就不松口，每一帧都在削。 |
| pistol | 手枪 | shot | ranged | 11 | 0.68 | 射程340, 弹b_bullet | 没有短板，也没有惊喜。 |
| shotgun | 霰弹枪 | spread | ranged | 5.5 | 1.15 | 射程215, 弹b_small, 弹数5 | 五发一起走。贴近了才是真正的伤害。 |
| smg | 冲锋枪 | shot | ranged | 4.2 | 0.16 | 射程275, 弹b_small | 泼水一样的弹幕，单发很轻。 |
| sniper | 狙击枪 | shot | ranged | 42 | 2.05 | 射程640, 弹b_bullet, 穿透4 | 一条直线上的所有人一起解决。 |
| crossbow | 强弩 | shot | ranged | 17 | 0.98 | 射程420, 弹b_shard, 穿透2 | 穿透两个目标，箭很重。 |
| grenade | 手雷 | lob | ranged | 24 | 1.5 | 射程330 | 扔出去，炸一片。别站太近。 |
| boomerang | 回旋镖 | returner | ranged | 14 | 1.05 | 射程300 | 去程和回程各打一次，穿透所有目标。 |
| shuriken | 手里剑 | bouncer | ranged | 9 | 0.5 | 射程320 | 在敌群里弹来弹去，人越多越赚。 |
| flamer | 火焰喷射器 | cone | elemental | 2.6 | 0.08 | 射程138, 灼烧3, 弧度0.75 | 短距离持续灼烧，会点燃目标。 |
| wand | 法杖 | homing | elemental | 10 | 0.58 | 射程350, 弹b_orb | 追踪弹。不用瞄，它自己会找。 |
| lightning | 闪电权杖 | chain | elemental | 13 | 1.1 | 射程300, 连锁3 | 瞬发连锁，在敌群里越跳越远。 |
| ice | 冰锥 | shot | elemental | 12 | 0.86 | 射程360, 弹b_shard, 穿透2, 减速0.42 | 穿透并减速。控场比伤害更值钱。 |
| dart | 毒镖 | shot | elemental | 6 | 0.62 | 射程330, 弹b_shard, 毒4.5 | 直伤很低，但毒会一直走下去。 |
| turret | 哨戒炮 | turret | engineering | 7 | 6 | 射程300, 弹b_bullet | 在脚下部署一座自动炮台，伤害吃工程学。 |
| drone | 无人机 | drone | engineering | 5 | 7 | 射程300, 弹b_bullet, 弹数1 | 部署一架跟随你的自动无人机，边飞边射，工程学越高越凶。 |
| mine | 震荡地雷 | mine | engineering | 20 | 2.2 |  | 在脚下埋雷，敌人踩上去被炸上天；爆完就没了，记得补。 |
| laser_turret | 激光塔 | turret | engineering | 8 | 7.5 | 射程340, 弹b_bullet, 穿透7 | 部署激光炮塔，光束贯穿一整排敌人。 |
| nanite_swarm | 纳米虫群 | orbit | engineering | 4 | 3 | 弹数8 | 一圈纳米虫环绕飞行，碰到什么啃什么。 |
| shock_field | 震荡力场 | pulse | engineering | 15 | 3.4 | 射程150, 减速0.5 | 周期性脉冲震开周围敌人，并让他们脚步迟缓。 |
| katana | 武士刀 | swing | melee | 9 | 0.44 | 射程86, 弧度1.6 | 快刀。出手快、暴击天生高，但单发偏轻。 |
| halberd | 长戟 | thrust | melee | 16 | 0.82 | 射程140 | 长柄直线穿刺，距离就是安全。 |
| railgun | 磁轨炮 | shot | ranged | 60 | 2.4 | 射程720, 弹b_bullet, 穿透6 | 蓄力一击，贯穿整条战线。装填慢得让人不安。 |
| frost_staff | 霜寒之杖 | cone | elemental | 3 | 0.1 | 射程140, 减速0.4, 弧度0.8 | 短距锥形喷射，命中的敌人被冻得越来越慢。 |
| venom_spray | 毒雾喷壶 | cone | elemental | 2.4 | 0.09 | 射程130, 毒5, 弧度0.8 | 喷出毒雾，命中后持续掉血。 |
| tesla_orb | 特斯拉法球 | chain | elemental | 14 | 0.95 | 射程320, 连锁4 | 强力连锁闪电，在敌群里跳得更远。 |
| magma_launcher | 熔岩发射器 | lob | ranged | 30 | 1.7 | 射程340 | 重型抛射，落点一片火海。别站在圈里。 |
| club | 巨棒 | swing | melee | 10 | 0.72 | 射程82, 弧度1.8 | 笨重但扎实，敲中带短暂硬直。 |
| trident | 三叉戟 | thrust | melee | 14 | 0.8 | 射程134 | 三根尖刺，距离与穿透兼顾。 |
| blunderbuss | 喇叭枪 | spread | ranged | 6 | 1.2 | 射程205, 弹b_small, 弹数6 | 近距一轰一大片，离远了就散了。 |
| throwing_axe | 飞斧 | returner | ranged | 13 | 1 | 射程280 | 去回程各砍一次，穿透整条线。 |
| spark_rod | 电杖 | chain | elemental | 11 | 1 | 射程280, 连锁3 | 瞬发连锁，在敌群里跳三下。 |
| gravity_cannon | 重力炮 | shot | ranged | 34 | 1.7 | 射程360 | 沉重的一击，落地炸开并把敌人轰飞。 |
| storm_staff | 风暴法杖 | homing | elemental | 8 | 0.92 | 射程350, 弹b_orb, 弹数3 | 同时放出三枚追踪法球，各自寻找目标。 |
| spike_shotgun | 钉刺霰弹 | spread | ranged | 6 | 1.25 | 射程210, 弹b_small, 弹数4, 穿透2 | 四发散射且贯穿两个目标，贴脸火力凶猛。 |
| pulse_core | 脉冲星 | pulse | ranged | 16 | 1.35 | 射程150 | 以自身为中心周期性爆发冲击波，清场兼控场。 |
| orbit_blade | 环绕刃 | orbit | ranged | 11 | 1.1 | 射程150, 弹w_shuriken, 弹数2 | 两把卫星刃绕身旋转，持续削切靠近的一切。 |

> 武器在掉落/商店出现时，其「品质档位」= 抽到的稀有度（0白~4红），档位只改数值（TIER_DMG / TIER_CD）不改机制。

## 4. 物品（按品质）

### 4.1 白 · 稀有度 0（32）

| id | 名称 | 类型 | 主要属性 | 特效 | 风味 |
|---|---|---|---|---|---|
| rag_armor | 破布护甲 | 饰品 | armor +2, speed -3 |  | 总比什么都不穿强。 |
| rusty_dagger | 生锈匕首 | 饰品 | damage +8, armor -1 |  | 锈是它唯一的附魔。 |
| old_shoes | 旧跑鞋 | 饰品 | speed +8 |  | 鞋底快磨穿了，但还能跑。 |
| hard_bread | 硬面包 | 防具 | maxHp +8 |  | 能吃，也能当钝器。 |
| iron_plate | 铁片 | 饰品 | armor +3, attackSpeed -5 |  | 沉，但挡得住。 |
| whetstone | 磨刀石 | 饰品 | meleeDamage +2 |  | 刃口的耐心。 |
| ammo_pouch | 弹药袋 | 饰品 | rangedDamage +2 |  | 装得比看起来多。 |
| matchbox | 火柴盒 | 饰品 | elementalDamage +2 |  | 一切大火都是从这里开始的。 |
| clover | 四叶草 | 饰品 | luck +6 |  | 第四片是自己掰上去的。 |
| sickle | 镰刀 | 饰品 | harvesting +2 |  | 收割不分对象。 |
| leather_glove | 皮手套 | 饰品 | attackSpeed +7, damage -2 |  | 手快了，力道就散了。 |
| glasses | 眼镜 | 饰品 | range +5, critChance +2 |  | 看得清才打得中。 |
| magnet_frag | 磁铁碎片 | 饰品 | pickupRange +20 |  | 会吸走地上的东西，也会吸走口袋里的。 |
| bandage | 绷带 | 防具 | hpRegen +0.5 |  | 缠紧点就没事了。 |
| lucky_coin | 幸运硬币 | 饰品 | luck +4, harvesting +1 |  | 正反面都是正面。 |
| wood_shield | 木盾 | 防具 | maxHp +6, armor +1, speed -2 |  | 会碎，但不是现在。 |
| crow_feather | 乌鸦羽毛 | 防具 | dodge +3, maxHp -3 |  | 轻得像不存在。 |
| dried_herb | 干草药 | 饰品 | hpRegen +0.35, xpGain +5 |  | 苦，但清醒。 |
| tin_helm | 铁皮盔 | 防具 | maxHp +6, attackSpeed -2 |  | 敲起来当当响，比没有强。 |
| sharpened_rock | 磨尖石 | 饰品 | meleeDamage +1, rangedDamage +1 |  | 一把能用的石头。 |
| pocket_watch | 怀表 | 饰品 | attackSpeed +4, speed -2 |  | 时间走得比腿快。 |
| cloth_wrap | 布甲缠带 | 防具 | maxHp +6, armor +1, speed -1 |  | 缠紧了，心就定了。 |
| pebble | 投石袋 | 饰品 | rangedDamage +1, meleeDamage +1 |  | 随手一把，远近都够。 |
| wood_stick | 木棍 | 饰品 | meleeDamage +1, attackSpeed +3 |  | 比拳头远一点。 |
| cheap_ring | 铜戒 | 饰品 | luck +3, maxHp -2 |  | 便宜的好运也是好运。 |
| rope_belt | 麻绳腰带 | 饰品 | armor +1, speed -2 |  | 勒紧肚子，也勒紧胆子。 |
| dry_berry | 干果 | 防具 | hpRegen +0.3, maxHp +4 |  | 甜，能顶一会儿。 |
| tin_can | 铁皮罐头 | 防具 | maxHp +10, damage -2 |  | 装进去就出不来了，包括你。 |
| greased_gear | 油滑齿轮 | 饰品 | speed +6, armor -2 |  | 滑，但好用。 |
| tre_ashtray | 黄铜烟灰缸 | 宝物 |  |  | 一件老派的小摆件，能换个好价。 |
| tre_burner | 琉璃香炉 | 宝物 |  |  | 青焰纹路的古香炉，香气早已散尽，价格还在。 |
| tre_gear | 黄铜齿轮箱 | 宝物 |  |  | 精密咬合的旧机械，拆下来论斤也值钱。 |

### 4.2 绿 · 稀有度 1（40）

| id | 名称 | 类型 | 主要属性 | 特效 | 风味 |
|---|---|---|---|---|---|
| spike_bracer | 尖刺护腕 | 饰品 | damage +12, thorns +4, maxHp -5 |  | 别人抓你，先流血的是他。 |
| tac_vest | 战术背心 | 饰品 | armor +6, speed -7 |  | 安全感是有重量的。 |
| hunter_eye | 猎人之眼 | 饰品 | critChance +7, attackSpeed -4 |  | 等，然后一击。 |
| feather_boot | 轻羽靴 | 饰品 | speed +15, armor -3 |  | 跑得快就不需要护甲——理论上。 |
| battery | 蓄电池 | 饰品 | attackSpeed +13, elementalDamage -2 |  | 电流催得太急，火候就没了。 |
| toolbox | 工具箱 | 饰品 | engineering +7, speed -3 |  | 拎着它的人不用亲自动手。 |
| bat_wing | 吸血蝠翼 | 防具 | lifesteal +4, maxHp -6 |  | 你从别人身上拿回来的，永远少一点。 |
| prayer_bead | 苦修念珠 | 饰品 | hpRegen +1.1, damage -8 |  | 恢复的代价是钝。 |
| spyglass | 望远镜 | 饰品 | range +14, speed -6 |  | 看得远，走得慢。 |
| shadow_cloak | 影子斗篷 | 防具 | dodge +8, maxHp -5 |  | 打不中的人不需要血。 |
| miner_pick | 矿工镐 | 饰品 | harvesting +5, attackSpeed -5 |  | 一下一下，总会挖出点什么。 |
| double_blade | 双刃剑 | 防具 | meleeDamage +6, maxHp -6 |  | 两边都开刃，包括对着你的那边。 |
| hollow_point | 精制弹头 | 饰品 | rangedDamage +6, attackSpeed -6 |  | 打得深，装得慢。 |
| sulfur | 硫磺粉 | 饰品 | elementalDamage +6, armor -2 |  | 闻起来像地狱的厨房。 |
| gambler_dice | 赌徒骰子 | 饰品 | luck +14, damage -8 |  | 运气好的人不需要实力。 |
| scholar_note | 学者手札 | 饰品 | xpGain +18, maxHp -5 |  | 知识让人成长，也让人熬夜。 |
| thorn_vest | 荆棘外衣 | 防具 | thorns +9, speed -5 |  | 拥抱它的人会后悔。 |
| greed_hand | 贪婪之手 | 饰品 | dropRate +22, maxHp -6 |  | 手伸得越长，护得住的越少。 |
| ember_ring | 余烬指环 | 饰品 | elementalDamage +4, damage +5, hpRegen -0.3 |  | 一直在烧，包括你。 |
| venom_vial | 毒液瓶 | 饰品 | elementalDamage +2 | poisonOnHit | 小心瓶塞。 |
| static_gauntlet | 静电拳套 | 饰品 | attackSpeed +6, armor -2 | thunderAura | 每次出拳都带火花。 |
| iron_jaw | 铁颌 | 防具 | thorns +5, meleeDamage +2, maxHp -4 |  | 咬合力也是武器。 |
| swift_charm | 疾风符 | 饰品 | speed +10, dodge +3, maxHp -4 |  | 快，但不经打。 |
| spiked_boot | 尖刺靴 | 饰品 | damage +8, speed +6, armor -2 |  | 踢人也很疼。 |
| quiver | 箭袋 | 饰品 | rangedDamage +4, attackSpeed +4, maxHp -3 |  | 手快，眼更快。 |
| focus_lens | 聚能镜 | 饰品 | critChance +5, rangedDamage +3, speed -4 |  | 聚焦的地方会碎。 |
| war_paint | 战纹 | 防具 | damage +6, maxHp +8, armor -2 |  | 画上去就不好惹了。 |
| spring_coil | 弹簧芯 | 饰品 | attackSpeed +9, speed +4, maxHp -4 |  | 绷着的劲。 |
| blood_charm | 血玉 | 饰品 | lifesteal +3, damage +4, maxHp -5 |  | 温的，一直温着。 |
| razor_edge | 利刃环 | 饰品 | critChance +6, armor -3 |  | 转起来才锋利。 |
| vampiric_charm | 吸血符 | 防具 | lifesteal +4, maxHp -5 |  | 戴久了手会暖。 |
| tre_suit | 定制西装 | 宝物 |  |  | 裁剪讲究得连深渊都在意体面。 |
| tre_battery | 高能燃料罐 | 宝物 |  |  | 浓缩能源，工业区的心跳。 |
| tre_router | 古董收音机 | 宝物 |  |  | 能收到深渊的杂音，收藏价值很高。 |
| tre_boots | 限量战靴 | 宝物 |  |  | 旧年代的限量款，鞋底仍残留深渊的灰。 |
| tre_vial | 霓虹药剂瓶 | 宝物 |  |  | 还透光的化学药瓶，买主爱它的颜色胜过内容。 |
| tre_figure | 星尘手办 | 宝物 |  |  | 绝版限定款，圈内人一眼就认得出。 |
| tre_specs | 深空目镜 | 宝物 |  |  | 瞄准过远方的镜片，如今只照得出深渊。 |
| tre_dyn | 蒸汽动力泵 | 宝物 |  |  | 把热能换成嘶吼的老机器，还有行情。 |
| tre_corner | 首层地图 | 宝物 |  |  | 画着早已失效的入口路线，纸质泛黄。 |

### 4.3 蓝 · 稀有度 2（39）

| id | 名称 | 类型 | 主要属性 | 特效 | 风味 |
|---|---|---|---|---|---|
| berserk_blood | 狂战之血 | 饰品 | damage +24, maxHp -12, armor -3 |  | 疼痛只是延迟到达的信息。 |
| dragon_scale | 龙鳞甲 | 饰品 | armor +11, speed -11, attackSpeed -6 |  | 据说来自龙。也可能是大蜥蜴。 |
| assassin_glove | 刺客手套 | 饰品 | critChance +12, attackSpeed +9, maxHp -8 |  | 第一刀要么致命，要么白来。 |
| pacemaker | 心脏起搏器 | 防具 | maxHp +30, hpRegen +0.6, speed -10 |  | 它替你决定什么时候跳。 |
| thunder_core | 雷霆核心 | 饰品 | attackSpeed +22, maxHp -8, critChance -4 |  | 快到来不及瞄准。 |
| blueprint | 军械图纸 | 饰品 | engineering +16, speed -8 |  | 看得懂的人不用亲自上前线。 |
| vampire_fang | 吸血鬼獠牙 | 饰品 | lifesteal +9, attackSpeed -12 |  | 慢慢咬，才吸得干净。 |
| gale_rune | 疾风符 | 饰品 | speed +24, damage -7, armor -2 |  | 风不需要盔甲。 |
| far_scope | 千里镜 | 饰品 | range +26, rangedDamage +5, speed -10 |  | 战场变小了，你也是。 |
| phantom_cape | 幻影披风 | 防具 | dodge +15, maxHp -11 |  | 你在，但不完全在。 |
| horn_plenty | 丰饶号角 | 饰品 | harvesting +10, luck +7, damage -9 |  | 装得下一整个秋天。 |
| regen_cell | 再生细胞 | 饰品 | hpRegen +2.4, damage -12 |  | 长回来的肉，总比原来的软。 |
| lava_heart | 熔岩之心 | 饰品 | elementalDamage +11, maxHp -9 |  | 它在胸腔里还没冷却。 |
| heavy_rune | 重锤符文 | 饰品 | meleeDamage +11, attackSpeed -13 |  | 一次就够了。 |
| sniper_proto | 狙击协议 | 饰品 | rangedDamage +11, range +12, speed -14 |  | 站定，呼气，扣扳机。 |
| soul_lantern | 灵魂提灯 | 饰品 | xpGain +34, harvesting +4, maxHp -10 |  | 照亮别人走过的路。 |
| iron_maiden | 铁处女 | 防具 | thorns +18, armor +4, speed -12 |  | 一个只会拥抱的刑具。 |
| burn_brand | 烙印之种 | 防具 | elementalDamage +3, maxHp -8 | burnOnHit | 火不会问你是谁。 |
| static_charm | 静电吊坠 | 饰品 | attackSpeed +6, armor -2 | chainOnHit | 空气里总有一点火药味。 |
| frost_aura | 霜寒核心 | 饰品 | elementalDamage +4, speed -6 | frostAura | 靠近你就要付出代价。 |
| frost_lens | 霜冻透镜 | 饰品 | rangedDamage +4, range +14, attackSpeed -4 |  | 看见的远方都结了霜。 |
| venom_blade | 淬毒刃 | 饰品 | meleeDamage +6, speed -4 | poisonOnHit | 刃上永远有绿光。 |
| thunder_totem | 雷霆图腾 | 饰品 | attackSpeed +14, maxHp -6 | thunderAura | 云层在你头顶打转。 |
| berserk_totem | 狂怒图腾 | 饰品 | damage +18, speed +8, maxHp -10, armor -4 |  | 越打越上头。 |
| warding_rune | 守护符文 | 防具 | armor +9, hpRegen +0.4, speed -6 |  | 把伤害挡在外面。 |
| storm_brand | 风暴烙印 | 饰品 | attackSpeed +8, elementalDamage +3 | chainOnHit | 皮肤下有人在打雷。 |
| frost_sigil | 冰霜印记 | 饰品 | elementalDamage +5, armor +3, speed -5 | frostAura | 贴身一股寒意。 |
| iron_will | 钢铁意志 | 防具 | armor +10, maxHp +15, speed -8 |  | 不躲，就不怕。 |
| soul_reaver | 噬魂符 | 防具 | damage +6, maxHp -6 | leechOnKill | 它们最后的呼声是你的补给。 |
| frost_mail | 寒霜链甲 | 饰品 | armor +8, speed -10 |  | 冷，但踏实。 |
| tre_clock | 金怀表 | 宝物 |  |  | 指针仍在走，仿佛时间在这里还有意义。 |
| tre_crystal | 蚀刻水晶 | 宝物 |  |  | 能折射光源的贵价标本。 |
| tre_disk | 深渊数据盘 | 宝物 |  |  | 加密过的资料，行家愿意出大价钱。 |
| tre_solar | 聚变电池芯 | 宝物 |  |  | 一颗还能持续发热的能源核心。 |
| tre_orb | 古鎏金宝球 | 宝物 |  |  | 表面刻满已无人能解的铭文，底座沉得惊人。 |
| tre_unit | 低温储存单元 | 宝物 |  |  | 内部恒温恒压，保存着某个被遗忘的实验样本。 |
| tre_lyre | 鎏银七弦琴 | 宝物 |  |  | 弦已锈断，琴身仍讲究得像刚离工匠之手。 |
| tre_helmet | 刻纹战盔 | 宝物 |  |  | 曾属于某个无名远征者，盔内刻着一串名字。 |
| tre_jade | 鎏边玉璧 | 宝物 |  |  | 中间镂空，边缘鎏金，是身份的旧信物。 |

### 4.4 紫 · 稀有度 3（25）

| id | 名称 | 类型 | 主要属性 | 特效 | 风味 |
|---|---|---|---|---|---|
| blood_totem | 血祭图腾 | 饰品 | damage +36, lifesteal +5, maxHp -22, armor -6 |  | 用你的血换他们的。 |
| titan_bulwark | 泰坦壁垒 | 防具 | armor +19, maxHp +35, speed -18, attackSpeed -12 |  | 你不再移动，你成为地形。 |
| invisible_edge | 无形之刃 | 饰品 | critChance +20, meleeDamage +13, maxHp -14 |  | 看不见的东西没法格挡。 |
| hourglass | 时间沙漏 | 饰品 | attackSpeed +32, speed +11, damage -11 |  | 你偷来的每一秒都在别处漏掉。 |
| perp_core | 永动核心 | 饰品 | engineering +24, elementalDamage +9, maxHp -12 |  | 工程师说它不可能。它还在转。 |
| abyss_pact | 深渊契约 | 饰品 | damage +42, maxHp -28, dodge -10 |  | 签的时候没人念条款。 |
| tree_life | 生命之树 | 防具 | hpRegen +4, maxHp +34, attackSpeed -16 |  | 长得慢的东西活得久。 |
| void_eye | 虚空之眼 | 饰品 | range +42, rangedDamage +15, speed -20 |  | 你看它，它也在看你。 |
| fate_spindle | 命运纺锤 | 饰品 | luck +32, harvesting +13, damage -13 |  | 线在谁手里，谁说了算。 |
| afterimage | 疾影残像 | 防具 | dodge +26, speed +19, maxHp -17 |  | 他们打中的一直是三秒前的你。 |
| gore_crown | 血冠 | 饰品 | lifesteal +12, meleeDamage +10, hpRegen -1, armor -4 |  | 王冠是用伤口镶的。 |
| plague_orb | 瘟疫之球 | 遗物 | elementalDamage +8, maxHp -14 | poisonAura | 不需要动手。 |
| demolition | 爆破协议 | 遗物 | elementalDamage +5, armor -3 | explodeOnKill | 死亡应该是连锁的。 |
| void_prism | 虚空棱镜 | 遗物 | critChance +14, critDamage +25, maxHp -12 | critSlow | 折射的不只是光。 |
| plague_lord | 瘟疫之主 | 遗物 | elementalDamage +6, damage +14, maxHp -16 | poisonAura | 你走过的地方草都枯了。 |
| storm_caller | 风暴召唤者 | 遗物 | attackSpeed +18, elementalDamage +6, maxHp -12 | thunderAura | 雷声是她的鼓点。 |
| abyssal_blade | 深渊刃 | 饰品 | meleeDamage +12, critChance +10, maxHp -12 |  | 刃上挂着一小片夜。 |
| tre_cpu | 量子核心 | 宝物 |  |  | 一块还在发热的电子核心，数据像活的一样。 |
| tre_ingot | 秘银锭 | 宝物 |  |  | 一整块沉淀的贵金属。 |
| tre_crown | 失落王冠 | 宝物 |  |  | 曾有王座之物，如今是深渊里的展品。 |
| tre_totem | 啖盐图腾柱 | 宝物 |  |  | 一整根赭石雕刻，盐渍渗进每道裂隙。 |
| tre_goblet | 鎏金高脚杯 | 宝物 |  |  | 杯沿有磨痕，也挡不住金匠的手艺。 |
| tre_relay | 混沌继电器 | 宝物 |  |  | 接上电流会有细微的杂音，像在低语。 |
| tre_grandpulse | 星象巨钟 | 宝物 |  |  | 指针指向早已消失的星座，机芯仍在低鸣。 |
| tre_tapestry | 织金壁毯 | 宝物 |  |  | 用金线织出的战争与丰收，一整幅都搬得动才值钱。 |

### 4.5 红 · 稀有度 4（18）

| id | 名称 | 类型 | 主要属性 | 特效 | 风味 |
|---|---|---|---|---|---|
| divine_engine | 神性引擎 | 遗物 | damage +52, attackSpeed +26, maxHp -38, armor -12 |  | 神也需要保养。 |
| immortal_heart | 不朽之心 | 遗物 | maxHp +95, hpRegen +6, damage -26, speed -15 |  | 它不会停，你也别想停。 |
| reaper_scythe | 死神镰刀 | 遗物 | critChance +34, critDamage +55, meleeDamage +22, lifesteal +8, maxHp -34 |  | 收割者从不为自己留后路。 |
| omni_forge | 万物熔炉 | 遗物 | elementalDamage +30, engineering +26, attackSpeed -20, maxHp -22 |  | 什么都能炼，包括炼它的人。 |
| chaos_wheel | 混沌骰盘 | 遗物 | luck +62, harvesting +26, damage +22, maxHp -22, attackSpeed -20 |  | 概率是唯一的信仰。 |
| absolute_zero | 绝对零度 | 遗物 | armor +22, dodge +24, maxHp +45, damage -32 | frostAura | 停下来的世界不会伤害你。 |
| lightspeed | 光速协议 | 遗物 | speed +48, attackSpeed +42, maxHp -30, armor -9 |  | 快到时间跟不上。 |
| phoenix_ash | 不死鸟之烬 | 遗物 | elementalDamage +12, maxHp -18 | revive | 灰烬也算一种存在方式。 |
| executioner | 处决程式 | 遗物 | damage +18, critChance +12, maxHp -20, armor -5 | execute | 不值得补第二刀。 |
| thorn_king | 荆棘之王 | 遗物 | thorns +62, armor +14, maxHp +40, damage -34, speed -14 |  | 他从不出手，也从没输过。 |
| singularity | 奇点吸引器 | 遗物 | pickupRange +190, harvesting +18, luck +22, dropRate +42, maxHp -16, damage -12 |  | 所有东西都朝你去。包括麻烦。 |
| crit_nova | 暴击新星 | 遗物 | critChance +16, critDamage +40, maxHp -20, attackSpeed -10 | critExplode | 每一次好运都该被听见。 |
| world_ender | 灭世者 | 遗物 | damage +45, critChance +20, maxHp -30, armor -10 |  | 握住的瞬间世界安静了。 |
| toxic_throne | 剧毒王座 | 遗物 | elementalDamage +25, maxHp -20 | poisonOnHit | 坐上去就别想下来。 |
| tempest_core | 风暴核心 | 遗物 | attackSpeed +30, speed +15, maxHp -25 | thunderAura | 雷暴在你手心成形。 |
| glutton_core | 暴食核心 | 遗物 | damage +20, maxHp -16, armor -4 | leechOnKill | 它永远在饿。 |
| tre_painting | 深渊仕女图 | 宝物 |  |  | 名画级古物，画中人似在凝视每一个拾起它的人。 |
| tre_altarpiece | 深渊祭坛画 | 宝物 |  |  | 整幅祭坛画仍透着庙堂的冷光，收藏家愿倾囊。 |

## 5. 品质分布

### 5.1 权重公式 (02_stats.js 的 F.rarityWeights(wave, luck)，luck 为幸运属性/100)

~~~
白 = max(3,   92  - wave*3.6 - luck*26)
绿 = max(6,   20  + wave*1.7 + luck*12)
蓝 = max(2,   4   + wave*2.1 + luck*17)
紫 = max(1,  (wave>=4 ? -2 + wave*1.25 : 0) + luck*14)
红 = max(0,  (wave>=8 ? -4 + wave*0.80 : 0) + luck*11)
（式中 luck 为 幸运属性/100；02_stats.js 内 F.rarityWeights 实际以 l=luck/100 代入）
~~~

### 5.2 抽取门槛 (13_meta.js 的 rollRarityForMarket / rollLootTier)

- 市场/掉落按地图档位动态上浮；紫色、红色随档位与幸运逐步解锁

### 5.3 实际比例（幸运=0，已应用门槛）

| 波次 | 白% | 绿% | 蓝% | 紫% | 红% |
|---|---|---|---|---|---|
| 1 | 76.1 | 18.7 | 5.2 | 0 | 0 |
| 4 | 64.8 | 22.4 | 10.4 | 2.5 | 0 |
| 8 | 49.4 | 26.3 | 16.3 | 6.3 | 1.9 |
| 10 | 42.3 | 27.9 | 18.9 | 7.9 | 3 |
| 14 | 29.4 | 31 | 23.6 | 11 | 5.1 |
| 19 | 15.5 | 34.2 | 28.7 | 14.2 | 7.3 |

## 6. 平衡参数

### 6.1 难度成长 G.waveScale(wave)（作用于普通/精英；BOSS 用 noScale 固定）

~~~
hp  = 1 + 0.5*(wave-1) + 0.04*(wave-1)^2
dmg = 1 + 0.105*(wave-1)
spd = 1 + 0.011*(wave-1)
mat = 1 + 0.13*(wave-1)
~~~

### 6.2 经济参数（搜打撤）

- 局外货币「深渊币」：卖掉落物（≈基础价×1.25）、撤离时材料 1:1 折现、首通奖励 25×层数
- 市场买入价 ≈ 基础价×2.5；仓库初始 30 格，扩容 +10 格 = 120×(扩容次数+1) 币
- 进图门票：T1 免费，T2~T5 分别为 45/140/380/950 币；通关上一层解锁下一层
- 死亡惩罚：本局携带（装备+背包+材料）全部失去

## 7. 搜打撤地图档位

| 层 | 区域 | 房间 | 门票 | 难度 | 掉落 | 撤离目标 |
|---|---|---|---|---|---|---|
| 1 | 裂隙边缘 | 6×5 | 0 | ▲ | ◆ | 存活 60 秒后撤离点开放 |
| 2 | 幽暗回廊 | 7×5 | 45 | ▲▲ | ◆◆ | 击杀 1 名精英后撤离点开放 |
| 3 | 深部矿坑 | 7×6 | 140 | ▲▲▲ | ◆◆◆ | 击败腐化巨兽后撤离点开放 |
| 4 | 深渊腹地 | 8×6 | 380 | ▲▲▲▲▲ | ◆◆◆◆ | 击杀 2 名精英后撤离点开放 |
| 5 | 终焉之门 | 8×7 | 950 | ▲▲▲▲▲▲▲▲ | ◆◆◆◆◆◆◆ | 击败深渊之主后撤离点开放 |

> 地图为房间网格世界（js/14_map.js）：房间 700px、墙 36px、门洞 104px；每层随机连通+回边，迷雾逐房揭示；房间类型含 战斗/宝库/精英/BOSS/圣泉/祭坛/撤离。

## 8. 如何扩充（改动清单）

- **新增敌人**：js/05_enemies.js 的 E 数组；若需新像素，在 js/01_pixel.js 用 PX.def 定义 sprite，注意行宽一致。出现波次在 W 数组的 pool/elites/boss。
- **新增武器**：js/04_weapons.js 的 WEAPONS；图标在 js/01_pixel.js 用 PX.tint 定义 icon。
- **新增物品**：js/03_items.js 的 ITEMS，设 r（0~4）决定品质；类型由 js/13_meta.js 的 G.itemType 按属性自动判定（防具/饰品/遗物）。
- **新增地图档位**：js/13_meta.js 的 G.TIERS（房间网格、门票、难度、掉落、撤离目标）。
- **调品质比例**：02_stats.js 的 F.rarityWeights + 13_meta.js 的 rollRarityForMarket / rollLootTier。
- **调平衡**：05_enemies.js 的 waveScale 与敌人基础值；精英/Boss 的血量直接改 hp（Boss 为 noScale 固定值）。
- **改完后**：node --check 各文件 → 重跑 _gen_registry.js 刷新本表 → 追加变更日志。

<!--CHANGELOG_START-->











## 设计规范 · 武器伤害加成来源

每把武器的伤害按 `kind` 对应的 `tags` 加成**一项专属伤害属性**，最后再乘全局「伤害%」。规则固化在 `js/02_stats.js` 的 `F.weaponDamage`，并由 `F.damageAttrText(tags)` 生成给 UI 显示的文本——商店卡与悬停提示均自动展示「伤害加成 · XXX」，单一权威来源，永不脱节。

| 武器标签 `tags` | 加成的伤害属性 | 适用范围 |
|---|---|---|
| `melee` | 近战伤害 | 所有近战武器（swing / thrust） |
| `ranged` | 远程伤害 | 所有远程武器（shot / spread / lob / returner / bouncer / pulse / orbit） |
| `elemental` | 元素伤害 | 所有元素武器（cone / chain / homing 元素系） |
| `engineering` | 工程学（×0.85） | 哨戒炮（turret） |

通用结算规则：
- 基础伤害 = `def.base × 档位系数 TIER_DMG[tier]`
- 最终伤害 = `(基础伤害 + 对应属性加成) × (1 + 伤害%/100)`，再叠暴击与 ±8% 浮动
- 全局「伤害%」（`damage` 属性）对**所有武器**生效，是唯一通用加成；其余四项为各武器专属
- 当前 37 把武器均为单一标签，每把只吃一种专属属性；若未来某武器需双标签，`weaponDamage` 会自动叠加两项加成（UI 也会并列显示）

武器归类（按加成属性）：
- **近战伤害**：knife / sword / hammer / spear / fist / chainsaw / katana / halberd / club / trident
- **远程伤害**：pistol / shotgun / smg / sniper / crossbow / grenade / boomerang / shuriken / railgun / magma_launcher / blunderbuss / throwing_axe / gravity_cannon / spike_shotgun / pulse_core / orbit_blade
- **元素伤害**：flamer / wand / lightning / ice / dart / frost_staff / venom_spray / tesla_orb / spark_rod / storm_staff
- **工程学**：turret


## 变更日志

### 2026-08-01 · 内容扩充 + 平衡（第二批）
- **新增普通怪 3 种**（js/05_enemies.js + js/01_pixel.js 精灵）：
  - `mite` 噬螨（高速追击，danger 1.1，前 4 波 + 游魂波）
  - `crystal` 寒晶（远程三连发 shooter，danger 2.8，第 7 波起进中后波次）
  - `ogre` 石拳魔（高威胁坦克，hp70/armor8，danger 4.4，第 6 波起进中后波次）
- **新增精英 1 种**：`el_warden` 精英·守望者（震荡波，hp380→按波次缩放），进第 14/17/19 波。
- **新增武器 5 把**（js/04_weapons.js + js/01_pixel.js 图标）：`club` 巨棒(swing/击晕)、`trident` 三叉戟(thrust)、`blunderbuss` 喇叭枪(spread)、`throwing_axe` 飞斧(returner)、`spark_rod` 电杖(chain)。武器总数 27→**32**。
- **新增物品 15 件**（js/03_items.js，重点补低级）：
  - 白(6)：布甲缠带 / 投石袋 / 木棍 / 铜戒 / 麻绳腰带 / 干果
  - 绿(6)：尖刺靴 / 箭袋 / 聚能镜 / 战纹 / 弹簧芯 / 血玉
  - 蓝(3)：风暴烙印(chainOnHit) / 冰霜印记(frostAura) / 钢铁意志
  - 物品总数 100→**115**（白27/绿29/蓝28/紫16/红15）。
- **品质比例调整**（js/02_stats.js 的 `F.rarityWeights`）：白随波次缓降但保持前期主导，蓝/紫/红中后期权重上调，使蓝（数量最多）成为中后期主力升级档；门槛改为紫第 4 波、红第 8 波解锁（与 08_shop.js 的 rollRarity 一致）。详见第 5.1 节公式。
- **精英/Boss 加血**（用户诉求“太容易被击杀”）：精英 hp 整体 ~1.9×、Boss 约 3.8×(behemoth 2100→8000) / 4.6×(abyss 5200→24000)，并同步上调 dmg/armor。Boss 为 noScale 固定值，故此改直接生效。
- **波次分配**：ogre/crystal 铺入第 6/8/11/12/13/15/16/17/18/19 波；el_warden 加入第 14/17/19 波精英列表。
- **波次精灵/图标**：新增 e_mite/e_crystal/e_ogre/el_warden 与 w_club/w_trident/w_blunder/w_axe/w_rod。
- **验证**：4 个改动文件 `node --check` 全过；`_gen_registry.js` 重生成本表（敌30/武32/物115）；`_smoke_waves.js` 无头驱动 20 波（new-alchemist 与满载新内容的 kitchenSink-mage 双档案）**0 运行时错误**，覆盖全部新武器/物品特效、双 Boss 与新精英波次。

### 2026-08-02 · 精英/Boss 血量激进上调（用户原话：“可以激进一点”）
- 在 08-01 平衡基础上**仅上调 hp**（dmg/armor 维持不变）：
  - 精英基础血量整体再 ×2（约 3.7~3.9× 原始设计值，仍随波次 `waveScale` 放大）：
    - `el_ironclad` 560→**1120**、`el_butcher` 420→**840**、`el_hexer` 360→**720**、`el_brood` 480→**960**、`el_reaper` 580→**1160**
  - Boss 为 `noScale` 固定值，直接大幅抬（约 8.6× / 10.6× 原始 2100 / 5200）：
    - `boss_behemoth` 8000→**18000**、`boss_abyss` 24000→**55000**
- 验证：js/05_enemies.js `node --check` 通过；`_gen_registry.js` 刷新本表敌人 hp 列；`_smoke_waves.js` 无头驱动全 20 波（new-alchemist 与满载新内容的 kitchenSink-mage 双档案）**0 运行时错误**，含 18000 与 55000 血双 Boss 战、el_warden 精英波及全部新武器/物品特效，两档案均到达结算。

### 2026-08-02 · 普通怪重绘（更大 + 更强辨识度）
- 用户诉求：普通怪太多「圆脸两眼睛」缺乏辨识度、体型太小。按「明显放大 + 同步加厚」方案执行（js/01_pixel.js + js/05_enemies.js）。
- **全部 22 个普通怪精灵重绘到 14~16px 网格**（原多为 8~12px），每个给独特轮廓 + 清晰配色：
  -  elongate 蠕虫、展翼蝙蝠、甲壳带裂线的铁甲虫、单体大眼的窥视者、圆顶滴液的裂胶、骨人枯骨兵、多足蜘蛛、飘逸破布的游魂、顶有引信火花的爆弹虫、兜帽持杖邪术师、方块石傀、四足犄角犀角兽、多眼虚空恐魔、巨口贪食体、宝箱利齿拟态箱、展翼石像鬼、持弓咒术弓手、小蜈蚣虫群、圆身噬螨、棱角寒晶、巨拳石拳魔。
  - 修复 `e_crystal` 旧精灵误用大写调色板字母（C/A）导致几乎只画轮廓的预存 bug。
- **同步加厚（命中半径 r）**：普通怪 r 整体 +3~5（小怪噬螨/虫群/小裂胶 r7→10/10/11），并令 `mite`/`swarmling`/`slimelet` 的 `sc` 由 2 抬到 3，使视觉与命中半径一致（实际绘制约 42~48px，较原 24~36px 约 +1.5×）。精英/Boss 不变。
- **波次密度**：最大刷怪速率的 5 波（围剿/洪流/崩坏等，原 rate 6.4~8.8）下调约 10%（→5.8~7.95），避免变大后堵屏。其余波次不变。
- 新增 `enemy_preview.html`：离屏渲染全部普通怪重绘精灵（局内 ×3 与放大 ×7 对照），双击即看，无需进游戏。
- 新增 `_validate_sprites.js`：扫描所有 `PX.def` 校验行宽一致 + vm 编译，边改边兜底。
- 验证：js/01_pixel.js / js/05_enemies.js `node --check` 通过；`_validate_sprites.js` 报告 40 个精灵**行宽全齐、编译全 OK**；`_gen_registry.js` 刷新本表（敌30/武32/物115）；`_smoke_waves.js` 无头驱动全 20 波双档案确认 0 运行时错误（进行中）。

### 2026-08-02 · 对局内 BGM 开关 + 设置可从暂停进入
- 用户诉求：「对局中可以打开设置调整 BGM 开启或者关闭」。背景：游戏原本已在开局强制启动程序化 BGM（`12_audio.js` 的 `startMusic` 早已实现），但**无任何开关、且设置页只能从标题进**。
- **存档（js/00_util.js）**：`settings` 新增 `bgm:true` 与 `music:0.5`，`load`/`setSettings` 同步支持，与默认值对齐。
- **音频（js/12_audio.js）**：新增 `setBgm(on)` —— 按开关在有 ctx 时启停 `startMusic`/`stopMusic`；标题界面 ctx 未解锁时仅记录标志，开局再启动。
- **设置页（index.html + js/09_ui.js）**：`scrSettings` 增加「音乐音量」滑块与「背景音乐」开关系关；`js/09_ui.js` 新增 `isScreenOn`/`openSettings(from)`/`closeSettings`，使设置可从「标题」或「对局内暂停」进入并正确返回原界面。
- **暂停页（index.html）**：`scrPause` 新增「设置」按钮（`btnPauseSettings`）。
- **接线（js/11_main.js + js/10_game.js）**：开局/续局按 `settings.bgm` 启停 BGM（替换原无条件 `startMusic`）；`setBgm`/`setMusic` 控件实时生效并写存档；ESC 在设置页内直接返回（`closeSettings`），不触发暂停切换。HUD 提示更新为「ESC 暂停 / 设置」。
- 样式（css/style.css）：新增像素风开关 `.switch`（`.track` + 滑块）。
- 验证：5 个改动 JS 文件 `node --check` 全通过；11_main.js 引用的全部 DOM id 在 index.html 中均存在。

### 2026-08-02 · 方向一：升级/购买反馈增强 + 权衡卡
- 用户诉求：①购买物品与选择升级需要更强反馈（光效/粒子/音效）；②每次升级属性选择需设计成「部分卡片同时有正面和负面属性」。
- **权衡卡池（js/02_stats.js）**：新增 `G.TRADEOFF_POOL`（12 项 pos/neg 结构，如 `damage+8~12 / -speed4~7`）。重写 `G.rollLevelOptions`：约 1/4（随机 <0.27）来自权衡卡池，主/副属性经 `used` 表去重避免重复；产出 `{key,val,negKey,negVal,trade:true}`。
- **权衡卡应用（js/10_game.js `openLevelUp` 回调）**：`p.char.mods` 同时写 `negKey -= negVal`；`recalc` 后 `maxHp` 夹紧到 ≥1，且负面削减最大生命后同步夹紧当前血量；若正属性是 `maxHp` 则回对应血量。
- **升级卡渲染（js/09_ui.js `renderLevelUp`）**：权衡卡加 `.lv-trade` 红边 + 负属性行 `.dn`（红字 `− {name} {modText}`）；点击先加 `.picked` 脉冲辉光类 + `UI.burstDom` 粒子爆发 + `sfx('levelup')`，240ms 后再提交，强化选择仪式感。
- **购买反馈（js/09_ui.js 商店 `buy`）**：成功时卡片加 `.buy-pop` 脉冲动画 + `UI.burstDom(...,'#ffd24a',10)` + 230ms 后重绘。
- **DOM 粒子（js/09_ui.js 新增 `UI.burstDom`）**：生成 `dom-particle` div，颜色同时设 `background` 与 `currentColor`（供辉光 `box-shadow:currentColor`），用 `--dx/--dy` CSS 变量做扩散，零外部依赖。
- 样式（css/style.css）：`.lv-trade`/`.lv-trade .dn`、`.lv-opt.picked`@lvPop、`.card.buy-pop`@buyPop、`.dom-particle`@domBurst。
- 验证：js/02_stats.js / js/09_ui.js / js/10_game.js `node --check` 全过。

### 2026-08-02 · 方向二：波次时长/种类/数量扩充 + 精英轮换 + 经济校准
- 用户诉求：波次太短（每波 +18~22s）；每波种类与数量都要增加；精英与 Boss 区分、精英首次一只后多只兼顾；刷新逻辑精心设计；怪物增多后每波经济与当前比「不会有太大变化」，可调整掉落率控制。
- **波次时长（js/05_enemies.js `W`）**：普通波 +20s、Boss 波（w10/w20）+12s（如 w1 20→40、w10 62→74、w20 95→107）。
- **刷怪速率**：全波 `rate` 整体上浮约 40%（×1.4，四舍五入 2 位），叠加时长 → 每波怪物数量显著提升。
- **种类扩充**：各波 `pool` 加入更多敌种（前中期也引入 `swarmling`/`glutton` 等群怪），覆盖全部普通敌种。
- **精英轮换表**（Boss 波不出精英，与 Boss 区分）：w5 首只 `el_butcher` → w9 两只（warden/hexer）→ w14 三只（brood/ironclad/reaper）→ w15 三只（butcher/warden/hexer）→ w17 四只 → w19 五只（butcher/hexer/ironclad/reaper/warden）；全程 6 种精英各至少登场一次。
- **经济校准（js/05_enemies.js `G.MAT_MUL=0.493` + js/10_game.js `dropLoot`）**：因数量增多，普通怪每杀的「期望材料」= `e.mat × MAT_MUL × (1+dropRate%)`，以「整数必掉 + 小数按概率补一个 1 材料包」的概率化掉落实现，使每波总材料≈旧配置（由 `_calib_econ.js` 无头模拟求得：旧合计≈10757 → 校准后≈10776，单波偏差早期 +24~37% 受「每杀至少 1」下限限制、中后段 ±0~18%、Boss 波 -7~-9%）；**精英/BOSS 为里程碑奖励，保持原设计不缩放**。
- 新增 `_calib_econ.js`：vm 加载 00_util/02_stats/05_enemies，复刻刷怪预算循环，对比旧/新每波潜在材料并二分搜索 `MAT_MUL`，输出每波偏差与建议值。
- 验证：js/05_enemies.js / js/10_game.js `node --check` 通过；`_calib_econ.js` 输出 `G.MAT_MUL=0.493`；`_smoke_waves.js` 双档案 20 波回归（含新波次/精英轮换/概率化掉落）0 运行时错误。

<!--CHANGELOG_END-->
