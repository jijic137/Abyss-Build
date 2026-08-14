/* ============================================================
   03_items.js —— 物品数据库
   设计原则：几乎每件物品都是「明确的正面 + 少量负面」，
   稀有度越高，正面越夸张，负面也越致命。构筑的乐趣在于
   让负面互相抵消、让正面叠成体系。

   字段：
     id      唯一键
     name    名称
     r       稀有度 0白 1绿 2蓝 3紫 4红
     icon    可染色图标名
     col     图标主色
     mods    属性增量
     sp      特殊效果 id（可选）
     spTxt   特殊效果说明（可选）
     max     最大持有数（可选，默认无限）
     fl      风味文本
   ============================================================ */
'use strict';

(function () {

  var ITEMS = [

    /* ================= 白 · 普通 ================= */
    { id: 'rag_armor',  name: '破布护甲', r: 0, icon: 'ic_shield', col: '#9aa0b0',
      mods: { armor: 2, speed: -3 }, fl: '总比什么都不穿强。' },
    { id: 'rusty_dagger', name: '生锈匕首', r: 0, icon: 'ic_blade', col: '#a08a5a',
      mods: { damage: 8, armor: -1 }, fl: '锈是它唯一的附魔。' },
    { id: 'old_shoes',  name: '旧跑鞋', r: 0, icon: 'ic_boot', col: '#8b6f4e',
      mods: { speed: 8 }, fl: '鞋底快磨穿了，但还能跑。' },
    { id: 'hard_bread', name: '硬面包', r: 0, icon: 'ic_potion', col: '#c9975a',
      mods: { maxHp: 8 }, fl: '能吃，也能当钝器。' },
    { id: 'iron_plate', name: '铁片', r: 0, icon: 'ic_shield', col: '#8f96a8',
      mods: { armor: 3, attackSpeed: -5 }, fl: '沉，但挡得住。' },
    { id: 'whetstone',  name: '磨刀石', r: 0, icon: 'ic_gem', col: '#9c9c9c',
      mods: { meleeDamage: 2 }, fl: '刃口的耐心。' },
    { id: 'ammo_pouch', name: '弹药袋', r: 0, icon: 'ic_coin', col: '#b08d4a',
      mods: { rangedDamage: 2 }, fl: '装得比看起来多。' },
    { id: 'matchbox',   name: '火柴盒', r: 0, icon: 'ic_flame', col: '#e07b39',
      mods: { elementalDamage: 2 }, fl: '一切大火都是从这里开始的。' },
    { id: 'clover',     name: '四叶草', r: 0, icon: 'ic_leaf', col: '#4fd06b',
      mods: { luck: 6 }, fl: '第四片是自己掰上去的。' },
    { id: 'sickle',     name: '镰刀', r: 0, icon: 'ic_blade', col: '#a8b0c0',
      mods: { harvesting: 2 }, fl: '收割不分对象。' },
    { id: 'leather_glove', name: '皮手套', r: 0, icon: 'ic_claw', col: '#a3763f',
      mods: { attackSpeed: 7, damage: -2 }, fl: '手快了，力道就散了。' },
    { id: 'glasses',    name: '眼镜', r: 0, icon: 'ic_eye', col: '#7fc8ff',
      mods: { range: 5, critChance: 2 }, fl: '看得清才打得中。' },
    { id: 'magnet_frag', name: '磁铁碎片', r: 0, icon: 'ic_gem', col: '#c0392b',
      mods: { pickupRange: 20 }, fl: '会吸走地上的东西，也会吸走口袋里的。' },
    { id: 'bandage',    name: '绷带', r: 0, icon: 'ic_potion', col: '#e8e2d0',
      mods: { hpRegen: 0.5 }, fl: '缠紧点就没事了。' },
    { id: 'lucky_coin', name: '幸运硬币', r: 0, icon: 'ic_coin', col: '#ffd24a',
      mods: { luck: 4, harvesting: 1 }, fl: '正反面都是正面。' },
    { id: 'wood_shield', name: '木盾', r: 0, icon: 'ic_shield', col: '#8b6f4e',
      mods: { maxHp: 6, armor: 1, speed: -2 }, fl: '会碎，但不是现在。' },
    { id: 'crow_feather', name: '乌鸦羽毛', r: 0, icon: 'ic_wing', col: '#5a5f72',
      mods: { dodge: 3, maxHp: -3 }, fl: '轻得像不存在。' },
    { id: 'dried_herb', name: '干草药', r: 0, icon: 'ic_leaf', col: '#7ea85a',
      mods: { hpRegen: 0.35, xpGain: 5 }, fl: '苦，但清醒。' },

    /* ================= 绿 · 优良 ================= */
    { id: 'spike_bracer', name: '尖刺护腕', r: 1, icon: 'ic_claw', col: '#b0563a',
      mods: { damage: 12, thorns: 4, maxHp: -5 }, fl: '别人抓你，先流血的是他。' },
    { id: 'tac_vest',   name: '战术背心', r: 1, icon: 'ic_shield', col: '#4f6b4a',
      mods: { armor: 6, speed: -7 }, fl: '安全感是有重量的。' },
    { id: 'hunter_eye', name: '猎人之眼', r: 1, icon: 'ic_eye', col: '#e0b040',
      mods: { critChance: 7, attackSpeed: -4 }, fl: '等，然后一击。' },
    { id: 'feather_boot', name: '轻羽靴', r: 1, icon: 'ic_boot', col: '#7fd8e8',
      mods: { speed: 15, armor: -3 }, fl: '跑得快就不需要护甲——理论上。' },
    { id: 'battery',    name: '蓄电池', r: 1, icon: 'ic_bolt', col: '#5ad1ff',
      mods: { attackSpeed: 13, elementalDamage: -2 }, fl: '电流催得太急，火候就没了。' },
    { id: 'toolbox',    name: '工具箱', r: 1, icon: 'ic_gear', col: '#e0902a',
      mods: { engineering: 7, speed: -3 }, fl: '拎着它的人不用亲自动手。' },
    { id: 'bat_wing',   name: '吸血蝠翼', r: 1, icon: 'ic_wing', col: '#8a3f6b',
      mods: { lifesteal: 4, maxHp: -6 }, fl: '你从别人身上拿回来的，永远少一点。' },
    { id: 'prayer_bead', name: '苦修念珠', r: 1, icon: 'ic_ring', col: '#c9a86b',
      mods: { hpRegen: 1.1, damage: -8 }, fl: '恢复的代价是钝。' },
    { id: 'spyglass',   name: '望远镜', r: 1, icon: 'ic_eye', col: '#5a8fc0',
      mods: { range: 14, speed: -6 }, fl: '看得远，走得慢。' },
    { id: 'shadow_cloak', name: '影子斗篷', r: 1, icon: 'ic_wing', col: '#3d4a6b',
      mods: { dodge: 8, maxHp: -5 }, fl: '打不中的人不需要血。' },
    { id: 'miner_pick', name: '矿工镐', r: 1, icon: 'ic_gear', col: '#9a7b4f',
      mods: { harvesting: 5, attackSpeed: -5 }, fl: '一下一下，总会挖出点什么。' },
    { id: 'double_blade', name: '双刃剑', r: 1, icon: 'ic_blade', col: '#c0c8d8',
      mods: { meleeDamage: 6, maxHp: -6 }, fl: '两边都开刃，包括对着你的那边。' },
    { id: 'hollow_point', name: '精制弹头', r: 1, icon: 'ic_bolt', col: '#d0a860',
      mods: { rangedDamage: 6, attackSpeed: -6 }, fl: '打得深，装得慢。' },
    { id: 'sulfur',     name: '硫磺粉', r: 1, icon: 'ic_flame', col: '#e0c040',
      mods: { elementalDamage: 6, armor: -2 }, fl: '闻起来像地狱的厨房。' },
    { id: 'gambler_dice', name: '赌徒骰子', r: 1, icon: 'ic_star', col: '#e05a8a',
      mods: { luck: 14, damage: -8 }, fl: '运气好的人不需要实力。' },
    { id: 'scholar_note', name: '学者手札', r: 1, icon: 'ic_book', col: '#5a8fc0',
      mods: { xpGain: 18, maxHp: -5 }, fl: '知识让人成长，也让人熬夜。' },
    { id: 'thorn_vest', name: '荆棘外衣', r: 1, icon: 'ic_leaf', col: '#4f8a3a',
      mods: { thorns: 9, speed: -5 }, fl: '拥抱它的人会后悔。' },
    { id: 'greed_hand', name: '贪婪之手', r: 1, icon: 'ic_claw', col: '#c9a227',
      mods: { dropRate: 22, maxHp: -6 }, fl: '手伸得越长，护得住的越少。' },
    { id: 'ember_ring', name: '余烬指环', r: 1, icon: 'ic_ring', col: '#e0602a',
      mods: { elementalDamage: 4, damage: 5, hpRegen: -0.3 }, fl: '一直在烧，包括你。' },

    /* ================= 蓝 · 稀有 ================= */
    { id: 'berserk_blood', name: '狂战之血', r: 2, icon: 'ic_potion', col: '#c0392b',
      mods: { damage: 24, maxHp: -12, armor: -3 }, fl: '疼痛只是延迟到达的信息。' },
    { id: 'dragon_scale', name: '龙鳞甲', r: 2, icon: 'ic_shield', col: '#3f8a5a',
      mods: { armor: 11, speed: -11, attackSpeed: -6 }, fl: '据说来自龙。也可能是大蜥蜴。' },
    { id: 'assassin_glove', name: '刺客手套', r: 2, icon: 'ic_claw', col: '#5a4a8f',
      mods: { critChance: 12, attackSpeed: 9, maxHp: -8 }, fl: '第一刀要么致命，要么白来。' },
    { id: 'pacemaker', name: '心脏起搏器', r: 2, icon: 'ic_heart', col: '#e0505a',
      mods: { maxHp: 30, hpRegen: 0.6, speed: -10 }, fl: '它替你决定什么时候跳。' },
    { id: 'thunder_core', name: '雷霆核心', r: 2, icon: 'ic_bolt', col: '#7fd8ff',
      mods: { attackSpeed: 22, maxHp: -8, critChance: -4 }, fl: '快到来不及瞄准。' },
    { id: 'blueprint',  name: '军械图纸', r: 2, icon: 'ic_book', col: '#e0902a',
      mods: { engineering: 16, speed: -8 }, fl: '看得懂的人不用亲自上前线。' },
    { id: 'vampire_fang', name: '吸血鬼獠牙', r: 2, icon: 'ic_bone', col: '#d0d8e8',
      mods: { lifesteal: 9, attackSpeed: -12 }, fl: '慢慢咬，才吸得干净。' },
    { id: 'gale_rune',  name: '疾风符', r: 2, icon: 'ic_wing', col: '#7fe0c0',
      mods: { speed: 24, damage: -7, armor: -2 }, fl: '风不需要盔甲。' },
    { id: 'far_scope',  name: '千里镜', r: 2, icon: 'ic_eye', col: '#4f8fd0',
      mods: { range: 26, rangedDamage: 5, speed: -10 }, fl: '战场变小了，你也是。' },
    { id: 'phantom_cape', name: '幻影披风', r: 2, icon: 'ic_wing', col: '#8f5cd6',
      mods: { dodge: 15, maxHp: -11 }, fl: '你在，但不完全在。' },
    { id: 'horn_plenty', name: '丰饶号角', r: 2, icon: 'ic_horn', col: '#c9a227',
      mods: { harvesting: 10, luck: 7, damage: -9 }, fl: '装得下一整个秋天。' },
    { id: 'regen_cell', name: '再生细胞', r: 2, icon: 'ic_orb', col: '#5ad19a',
      mods: { hpRegen: 2.4, damage: -12 }, fl: '长回来的肉，总比原来的软。' },
    { id: 'lava_heart', name: '熔岩之心', r: 2, icon: 'ic_flame', col: '#e0502a',
      mods: { elementalDamage: 11, maxHp: -9 }, fl: '它在胸腔里还没冷却。' },
    { id: 'heavy_rune', name: '重锤符文', r: 2, icon: 'ic_hammer_r', col: '#a8763f',
      mods: { meleeDamage: 11, attackSpeed: -13 }, fl: '一次就够了。' },
    { id: 'sniper_proto', name: '狙击协议', r: 2, icon: 'ic_bolt', col: '#c0c860',
      mods: { rangedDamage: 11, range: 12, speed: -14 }, fl: '站定，呼气，扣扳机。' },
    { id: 'soul_lantern', name: '灵魂提灯', r: 2, icon: 'ic_orb', col: '#7fd8ff',
      mods: { xpGain: 34, harvesting: 4, maxHp: -10 }, fl: '照亮别人走过的路。' },
    { id: 'iron_maiden', name: '铁处女', r: 2, icon: 'ic_mask', col: '#7d7f8c',
      mods: { thorns: 18, armor: 4, speed: -12 }, fl: '一个只会拥抱的刑具。' },

    /* -------- 蓝 · 特效 -------- */
    { id: 'burn_brand', name: '烙印之种', r: 2, icon: 'ic_flame', col: '#ff8a3a',
      sp: 'burnOnHit', spTxt: '命中有 25% 概率点燃敌人，每秒造成 (4 + 元素伤害×0.4) 伤害，持续 3 秒',
      mods: { elementalDamage: 3, maxHp: -8 }, fl: '火不会问你是谁。' },
    { id: 'static_charm', name: '静电吊坠', r: 2, icon: 'ic_bolt', col: '#8fd8ff',
      sp: 'chainOnHit', spTxt: '命中有 12% 概率引发连锁闪电，跳跃 3 次',
      mods: { attackSpeed: 6, armor: -2 }, fl: '空气里总有一点火药味。' },
    { id: 'frost_aura', name: '霜寒核心', r: 2, icon: 'ic_crystal', col: '#7fd8ff',
      sp: 'frostAura', spTxt: '身边 130 范围内的敌人移动速度降低 30%',
      mods: { elementalDamage: 4, speed: -6 }, fl: '靠近你就要付出代价。' },

    /* ================= 紫 · 史诗 ================= */
    { id: 'blood_totem', name: '血祭图腾', r: 3, icon: 'ic_skull', col: '#a02a3a',
      mods: { damage: 36, lifesteal: 5, maxHp: -22, armor: -6 }, fl: '用你的血换他们的。' },
    { id: 'titan_bulwark', name: '泰坦壁垒', r: 3, icon: 'ic_shield', col: '#5a7d9c',
      mods: { armor: 19, maxHp: 35, speed: -18, attackSpeed: -12 }, fl: '你不再移动，你成为地形。' },
    { id: 'invisible_edge', name: '无形之刃', r: 3, icon: 'ic_blade', col: '#c0d8ff',
      mods: { critChance: 20, meleeDamage: 13, maxHp: -14 }, fl: '看不见的东西没法格挡。' },
    { id: 'hourglass',  name: '时间沙漏', r: 3, icon: 'ic_hourglass', col: '#e0c860',
      mods: { attackSpeed: 32, speed: 11, damage: -11 }, fl: '你偷来的每一秒都在别处漏掉。' },
    { id: 'perp_core',  name: '永动核心', r: 3, icon: 'ic_gear', col: '#5ad1ff',
      mods: { engineering: 24, elementalDamage: 9, maxHp: -12 }, fl: '工程师说它不可能。它还在转。' },
    { id: 'abyss_pact', name: '深渊契约', r: 3, icon: 'ic_book', col: '#6b2a8f',
      mods: { damage: 42, maxHp: -28, dodge: -10 }, fl: '签的时候没人念条款。' },
    { id: 'tree_life',  name: '生命之树', r: 3, icon: 'ic_leaf', col: '#4fd06b',
      mods: { hpRegen: 4.0, maxHp: 34, attackSpeed: -16 }, fl: '长得慢的东西活得久。' },
    { id: 'void_eye',   name: '虚空之眼', r: 3, icon: 'ic_eye', col: '#8f5cd6',
      mods: { range: 42, rangedDamage: 15, speed: -20 }, fl: '你看它，它也在看你。' },
    { id: 'fate_spindle', name: '命运纺锤', r: 3, icon: 'ic_star', col: '#e0a840',
      mods: { luck: 32, harvesting: 13, damage: -13 }, fl: '线在谁手里，谁说了算。' },
    { id: 'afterimage', name: '疾影残像', r: 3, icon: 'ic_wing', col: '#7f8fd6',
      mods: { dodge: 26, speed: 19, maxHp: -17 }, fl: '他们打中的一直是三秒前的你。' },
    { id: 'gore_crown', name: '血冠', r: 3, icon: 'ic_horn', col: '#c03a4a',
      mods: { lifesteal: 12, meleeDamage: 10, hpRegen: -1.0, armor: -4 }, fl: '王冠是用伤口镶的。' },
    { id: 'plague_orb', name: '瘟疫之球', r: 3, icon: 'ic_orb', col: '#8fc040',
      sp: 'poisonAura', spTxt: '身边 150 范围内的敌人每秒受到 (3 + 元素伤害×0.35) 伤害',
      mods: { elementalDamage: 8, maxHp: -14 }, fl: '不需要动手。' },
    { id: 'demolition', name: '爆破协议', r: 3, icon: 'ic_flame', col: '#ff6b3a',
      sp: 'explodeOnKill', spTxt: '敌人死亡时爆炸，造成 (12 + 元素伤害) 范围伤害',
      mods: { elementalDamage: 5, armor: -3 }, fl: '死亡应该是连锁的。' },

    /* ================= 红 · 传说 ================= */
    { id: 'divine_engine', name: '神性引擎', r: 4, icon: 'ic_gear', col: '#ffd24a',
      mods: { damage: 52, attackSpeed: 26, maxHp: -38, armor: -12 }, fl: '神也需要保养。' },
    { id: 'immortal_heart', name: '不朽之心', r: 4, icon: 'ic_heart', col: '#ff5f6d',
      mods: { maxHp: 95, hpRegen: 6.0, damage: -26, speed: -15 }, fl: '它不会停，你也别想停。' },
    { id: 'reaper_scythe', name: '死神镰刀', r: 4, icon: 'ic_blade', col: '#c060ff',
      mods: { critChance: 34, critDamage: 55, meleeDamage: 22, lifesteal: 8, maxHp: -34 },
      fl: '收割者从不为自己留后路。' },
    { id: 'omni_forge', name: '万物熔炉', r: 4, icon: 'ic_flame', col: '#ff8a2a',
      mods: { elementalDamage: 30, engineering: 26, attackSpeed: -20, maxHp: -22 },
      fl: '什么都能炼，包括炼它的人。' },
    { id: 'chaos_wheel', name: '混沌骰盘', r: 4, icon: 'ic_star', col: '#ff5fa8',
      mods: { luck: 62, harvesting: 26, damage: 22, maxHp: -22, attackSpeed: -20 },
      fl: '概率是唯一的信仰。' },
    { id: 'absolute_zero', name: '绝对零度', r: 4, icon: 'ic_crystal', col: '#8fe8ff',
      sp: 'frostAura', spTxt: '身边 130 范围内的敌人移动速度降低 30%',
      mods: { armor: 22, dodge: 24, maxHp: 45, damage: -32 }, fl: '停下来的世界不会伤害你。' },
    { id: 'lightspeed', name: '光速协议', r: 4, icon: 'ic_bolt', col: '#8ff0ff',
      mods: { speed: 48, attackSpeed: 42, maxHp: -30, armor: -9 }, fl: '快到时间跟不上。' },
    { id: 'phoenix_ash', name: '不死鸟之烬', r: 4, icon: 'ic_potion', col: '#ff9a3a',
      sp: 'revive', spTxt: '倒下时以 45% 生命复活一次（每局一次）', max: 1,
      mods: { elementalDamage: 12, maxHp: -18 }, fl: '灰烬也算一种存在方式。' },
    { id: 'executioner', name: '处决程式', r: 4, icon: 'ic_skull', col: '#ff4a4a',
      sp: 'execute', spTxt: '对生命低于 18% 的敌人造成 3 倍伤害',
      mods: { damage: 18, critChance: 12, maxHp: -20, armor: -5 }, fl: '不值得补第二刀。' },
    { id: 'thorn_king', name: '荆棘之王', r: 4, icon: 'ic_claw', col: '#4fd06b',
      mods: { thorns: 62, armor: 14, maxHp: 40, damage: -34, speed: -14 },
      fl: '他从不出手，也从没输过。' },
    { id: 'singularity', name: '奇点吸引器', r: 4, icon: 'ic_orb', col: '#b45cff',
      mods: { pickupRange: 190, harvesting: 18, luck: 22, dropRate: 42, maxHp: -16, damage: -12 },
      fl: '所有东西都朝你去。包括麻烦。' },
    { id: 'crit_nova',  name: '暴击新星', r: 4, icon: 'ic_star', col: '#ffcf4a',
      sp: 'critExplode', spTxt: '暴击时引发爆炸，造成本次伤害 60% 的范围伤害',
      mods: { critChance: 16, critDamage: 40, maxHp: -20, attackSpeed: -10 },
      fl: '每一次好运都该被听见。' },

    /* ================= 新增 · 白 ================= */
    { id: 'tin_helm', name: '铁皮盔', r: 0, icon: 'ic_shield', col: '#9aa0b0',
      mods: { maxHp: 6, attackSpeed: -2 }, fl: '敲起来当当响，比没有强。' },
    { id: 'sharpened_rock', name: '磨尖石', r: 0, icon: 'ic_blade', col: '#a08a5a',
      mods: { meleeDamage: 1, rangedDamage: 1 }, fl: '一把能用的石头。' },
    { id: 'pocket_watch', name: '怀表', r: 0, icon: 'ic_gear', col: '#c9a227',
      mods: { attackSpeed: 4, speed: -2 }, fl: '时间走得比腿快。' },

    /* ================= 新增 · 绿 ================= */
    { id: 'venom_vial', name: '毒液瓶', r: 1, icon: 'ic_potion', col: '#8fc040',
      sp: 'poisonOnHit', spTxt: '命中有 22% 概率使敌人中毒，每秒造成 (4 + 元素伤害×0.3) 伤害，持续 3.5 秒',
      mods: { elementalDamage: 2 }, fl: '小心瓶塞。' },
    { id: 'static_gauntlet', name: '静电拳套', r: 1, icon: 'ic_bolt', col: '#8fd8ff',
      sp: 'thunderAura', spTxt: '每约 0.9 秒向最近敌人释放连锁闪电，跳跃 3 次',
      mods: { attackSpeed: 6, armor: -2 }, fl: '每次出拳都带火花。' },
    { id: 'iron_jaw', name: '铁颌', r: 1, icon: 'ic_claw', col: '#b0563a',
      mods: { thorns: 5, meleeDamage: 2, maxHp: -4 }, fl: '咬合力也是武器。' },
    { id: 'swift_charm', name: '疾风符', r: 1, icon: 'ic_wing', col: '#7fe0c0',
      mods: { speed: 10, dodge: 3, maxHp: -4 }, fl: '快，但不经打。' },

    /* ================= 新增 · 蓝 ================= */
    { id: 'frost_lens', name: '霜冻透镜', r: 2, icon: 'ic_crystal', col: '#7fd8ff',
      mods: { rangedDamage: 4, range: 14, attackSpeed: -4 }, fl: '看见的远方都结了霜。' },
    { id: 'venom_blade', name: '淬毒刃', r: 2, icon: 'ic_blade', col: '#8fc040',
      sp: 'poisonOnHit', spTxt: '命中有 22% 概率使敌人中毒，每秒造成 (4 + 元素伤害×0.3) 伤害，持续 3.5 秒',
      mods: { meleeDamage: 6, speed: -4 }, fl: '刃上永远有绿光。' },
    { id: 'thunder_totem', name: '雷霆图腾', r: 2, icon: 'ic_bolt', col: '#9fe8ff',
      sp: 'thunderAura', spTxt: '每约 0.9 秒向最近敌人释放连锁闪电，跳跃 3 次',
      mods: { attackSpeed: 14, maxHp: -6 }, fl: '云层在你头顶打转。' },
    { id: 'berserk_totem', name: '狂怒图腾', r: 2, icon: 'ic_skull', col: '#a02a3a',
      mods: { damage: 18, speed: 8, maxHp: -10, armor: -4 }, fl: '越打越上头。' },
    { id: 'warding_rune', name: '守护符文', r: 2, icon: 'ic_shield', col: '#5a7d9c',
      mods: { armor: 9, hpRegen: 0.4, speed: -6 }, fl: '把伤害挡在外面。' },

    /* ================= 新增 · 紫 ================= */
    { id: 'void_prism', name: '虚空棱镜', r: 3, icon: 'ic_crystal', col: '#9f5cff',
      sp: 'critSlow', spTxt: '暴击使敌人减速 40%，持续 1.2 秒',
      mods: { critChance: 14, critDamage: 25, maxHp: -12 }, fl: '折射的不只是光。' },
    { id: 'plague_lord', name: '瘟疫之主', r: 3, icon: 'ic_orb', col: '#8fc040',
      sp: 'poisonAura', spTxt: '身边 150 范围内的敌人每秒受到 (3 + 元素伤害×0.35) 伤害',
      mods: { elementalDamage: 6, damage: 14, maxHp: -16 }, fl: '你走过的地方草都枯了。' },
    { id: 'storm_caller', name: '风暴召唤者', r: 3, icon: 'ic_bolt', col: '#7fd8ff',
      sp: 'thunderAura', spTxt: '每约 0.9 秒向最近敌人释放连锁闪电，跳跃 3 次',
      mods: { attackSpeed: 18, elementalDamage: 6, maxHp: -12 }, fl: '雷声是她的鼓点。' },

    /* ================= 新增 · 红 ================= */
    { id: 'world_ender', name: '灭世者', r: 4, icon: 'ic_blade', col: '#c060ff',
      mods: { damage: 45, critChance: 20, maxHp: -30, armor: -10 }, fl: '握住的瞬间世界安静了。' },
    { id: 'toxic_throne', name: '剧毒王座', r: 4, icon: 'ic_orb', col: '#8fc040',
      sp: 'poisonOnHit', spTxt: '命中有 22% 概率使敌人中毒，每秒造成 (4 + 元素伤害×0.3) 伤害，持续 3.5 秒',
      mods: { elementalDamage: 25, maxHp: -20 }, fl: '坐上去就别想下来。' },
    { id: 'tempest_core', name: '风暴核心', r: 4, icon: 'ic_bolt', col: '#9fe8ff',
      sp: 'thunderAura', spTxt: '每约 0.9 秒向最近敌人释放连锁闪电，跳跃 3 次',
      mods: { attackSpeed: 30, speed: 15, maxHp: -25 }, fl: '雷暴在你手心成形。' },

    /* ================= 第二批新增 · 白（补齐低级种类） ================= */
    { id: 'cloth_wrap', name: '布甲缠带', r: 0, icon: 'ic_shield', col: '#b9bcc8',
      mods: { maxHp: 6, armor: 1, speed: -1 }, fl: '缠紧了，心就定了。' },
    { id: 'pebble', name: '投石袋', r: 0, icon: 'ic_coin', col: '#a08a5a',
      mods: { rangedDamage: 1, meleeDamage: 1 }, fl: '随手一把，远近都够。' },
    { id: 'wood_stick', name: '木棍', r: 0, icon: 'ic_blade', col: '#9a7b4f',
      mods: { meleeDamage: 1, attackSpeed: 3 }, fl: '比拳头远一点。' },
    { id: 'cheap_ring', name: '铜戒', r: 0, icon: 'ic_ring', col: '#b8763f',
      mods: { luck: 3, maxHp: -2 }, fl: '便宜的好运也是好运。' },
    { id: 'rope_belt', name: '麻绳腰带', r: 0, icon: 'ic_shield', col: '#8b6f4e',
      mods: { armor: 1, speed: -2 }, fl: '勒紧肚子，也勒紧胆子。' },
    { id: 'dry_berry', name: '干果', r: 0, icon: 'ic_leaf', col: '#c98a4a',
      mods: { hpRegen: 0.3, maxHp: 4 }, fl: '甜，能顶一会儿。' },

    /* ================= 第二批新增 · 绿（补齐低级种类） ================= */
    { id: 'spiked_boot', name: '尖刺靴', r: 1, icon: 'ic_boot', col: '#b0563a',
      mods: { damage: 8, speed: 6, armor: -2 }, fl: '踢人也很疼。' },
    { id: 'quiver', name: '箭袋', r: 1, icon: 'ic_coin', col: '#b08d4a',
      mods: { rangedDamage: 4, attackSpeed: 4, maxHp: -3 }, fl: '手快，眼更快。' },
    { id: 'focus_lens', name: '聚能镜', r: 1, icon: 'ic_eye', col: '#5a8fc0',
      mods: { critChance: 5, rangedDamage: 3, speed: -4 }, fl: '聚焦的地方会碎。' },
    { id: 'war_paint', name: '战纹', r: 1, icon: 'ic_claw', col: '#c0392b',
      mods: { damage: 6, maxHp: 8, armor: -2 }, fl: '画上去就不好惹了。' },
    { id: 'spring_coil', name: '弹簧芯', r: 1, icon: 'ic_gear', col: '#9aa0b0',
      mods: { attackSpeed: 9, speed: 4, maxHp: -4 }, fl: '绷着的劲。' },
    { id: 'blood_charm', name: '血玉', r: 1, icon: 'ic_ring', col: '#c03a4a',
      mods: { lifesteal: 3, damage: 4, maxHp: -5 }, fl: '温的，一直温着。' },

    /* ================= 第二批新增 · 蓝 ================= */
    { id: 'storm_brand', name: '风暴烙印', r: 2, icon: 'ic_bolt', col: '#8fd8ff',
      sp: 'chainOnHit', spTxt: '命中有 12% 概率引发连锁闪电，跳跃 3 次',
      mods: { attackSpeed: 8, elementalDamage: 3 }, fl: '皮肤下有人在打雷。' },
    { id: 'frost_sigil', name: '冰霜印记', r: 2, icon: 'ic_crystal', col: '#7fd8ff',
      sp: 'frostAura', spTxt: '身边 130 范围内的敌人移动速度降低 30%',
      mods: { elementalDamage: 5, armor: 3, speed: -5 }, fl: '贴身一股寒意。' },
    { id: 'iron_will', name: '钢铁意志', r: 2, icon: 'ic_shield', col: '#5a7d9c',
      mods: { armor: 10, maxHp: 15, speed: -8 }, fl: '不躲，就不怕。' },

    /* ================= 第三批新增 · 白（权衡卡） ================= */
    { id: 'tin_can', name: '铁皮罐头', r: 0, icon: 'ic_shield', col: '#9aa0b0',
      mods: { maxHp: 10, damage: -2 }, fl: '装进去就出不来了，包括你。' },
    { id: 'greased_gear', name: '油滑齿轮', r: 0, icon: 'ic_gear', col: '#a08a5a',
      mods: { speed: 6, armor: -2 }, fl: '滑，但好用。' },

    /* ================= 第三批新增 · 绿 ================= */
    { id: 'razor_edge', name: '利刃环', r: 1, icon: 'ic_blade', col: '#c0c8d8',
      mods: { critChance: 6, armor: -3 }, fl: '转起来才锋利。' },
    { id: 'vampiric_charm', name: '吸血符', r: 1, icon: 'ic_ring', col: '#c03a4a',
      mods: { lifesteal: 4, maxHp: -5 }, fl: '戴久了手会暖。' },

    /* ================= 第三批新增 · 蓝（含新特效） ================= */
    { id: 'soul_reaver', name: '噬魂符', r: 2, icon: 'ic_skull', col: '#8f5cd6',
      sp: 'leechOnKill', spTxt: '击杀敌人时回复 (1.2% 最大生命) 的生命',
      mods: { damage: 6, maxHp: -6 }, fl: '它们最后的呼声是你的补给。' },
    { id: 'frost_mail', name: '寒霜链甲', r: 2, icon: 'ic_shield', col: '#7fd8ff',
      mods: { armor: 8, speed: -10 }, fl: '冷，但踏实。' },

    /* ================= 第三批新增 · 紫 ================= */
    { id: 'abyssal_blade', name: '深渊刃', r: 3, icon: 'ic_blade', col: '#9f5cff',
      mods: { meleeDamage: 12, critChance: 10, maxHp: -12 }, fl: '刃上挂着一小片夜。' },

    /* ================= 第三批新增 · 红（含新特效） ================= */
    { id: 'glutton_core', name: '暴食核心', r: 4, icon: 'ic_skull', col: '#ff5fa8',
      sp: 'leechOnKill', spTxt: '击杀敌人时回复 (1.2% 最大生命) 的生命',
      mods: { damage: 20, maxHp: -16, armor: -4 }, fl: '它永远在饿。' }
  ];

  /* ic_hammer_r 复用锤子图标 */
  if (!G.PX.has('ic_hammer_r')) {
    G.PX.tint('ic_hammer_r', [
      '.oooooo...',
      'oCAAAABo..',
      'oCADDAABo.',
      'oBAAAAABo.',
      '..oooAo...',
      '....oAo...',
      '....oAo...',
      '....oAo...',
      '...oBBBo..',
      '...ooooo..'
    ]);
  }

  /* ================= 可收集宝物（不参与战斗，占格 1x1 ~ 3x3） ================= */
  var TREASURE = [
    { id: 'tre_ashtray',  name: '黄铜烟灰缸', r: 0, type: 'treasure', icon: 'ic_tre_art', col: '#c9a86b', size: [1, 1], fl: '一件老派的小摆件，能换个好价。' },
    { id: 'tre_suit',     name: '定制西装', r: 1, type: 'treasure', icon: 'ic_tre_fashion', col: '#3d4a6b', size: [2, 2], fl: '裁剪讲究得连深渊都在意体面。' },
    { id: 'tre_battery',  name: '高能燃料罐', r: 1, type: 'treasure', icon: 'ic_tre_fuel', col: '#e0902a', size: [2, 1], fl: '浓缩能源，工业区的心跳。' },
    { id: 'tre_cpu',      name: '量子核心', r: 3, type: 'treasure', icon: 'ic_tre_elect', col: '#5ad1ff', size: [1, 1], fl: '一块还在发热的电子核心，数据像活的一样。' },
    { id: 'tre_clock',    name: '金怀表', r: 2, type: 'treasure', icon: 'ic_tre_art', col: '#ffd24a', size: [1, 1], fl: '指针仍在走，仿佛时间在这里还有意义。' },
    { id: 'tre_painting',name: '深渊仕女图', r: 4, type: 'treasure', icon: 'ic_tre_art', col: '#b45cff', size: [3, 3], fl: '名画级古物，画中人似在凝视每一个拾起它的人。' },
    { id: 'tre_crystal',  name: '蚀刻水晶', r: 2, type: 'treasure', icon: 'ic_tre_crystal', col: '#7fd8ff', size: [2, 2], fl: '能折射光源的贵价标本。' },
    { id: 'tre_router',   name: '古董收音机', r: 1, type: 'treasure', icon: 'ic_tre_elect', col: '#8a6f4e', size: [2, 2], fl: '能收到深渊的杂音，收藏价值很高。' },
    { id: 'tre_ingot',    name: '秘银锭', r: 3, type: 'treasure', icon: 'ic_tre_ingot', col: '#c0c8d8', size: [1, 1], fl: '一整块沉淀的贵金属。' },
    { id: 'tre_burner',   name: '琉璃香炉', r: 0, type: 'treasure', icon: 'ic_tre_art', col: '#c86a4e', size: [1, 1], fl: '青焰纹路的古香炉，香气早已散尽，价格还在。' },
    { id: 'tre_boots',    name: '限量战靴', r: 1, type: 'treasure', icon: 'ic_tre_fashion', col: '#6a8f4e', size: [2, 1], fl: '旧年代的限量款，鞋底仍残留深渊的灰。' },
    { id: 'tre_disk',     name: '深渊数据盘', r: 2, type: 'treasure', icon: 'ic_tre_elect', col: '#4e9fc8', size: [1, 1], fl: '加密过的资料，行家愿意出大价钱。' },
    { id: 'tre_crown',    name: '失落王冠', r: 3, type: 'treasure', icon: 'ic_tre_art', col: '#ffd24a', size: [2, 2], fl: '曾有王座之物，如今是深渊里的展品。' },
    { id: 'tre_solar',    name: '聚变电池芯', r: 2, type: 'treasure', icon: 'ic_tre_fuel', col: '#7fd5ff', size: [1, 2], fl: '一颗还能持续发热的能源核心。' }
  ];
  TREASURE.forEach(function (t) { ITEMS.push(t); });

  /* 宝物专属像素图标（可染色，A 主色 / B 暗 / C 亮） */
  if (!G.PX.has('ic_tre_art')) {
    G.PX.tint('ic_tre_art', [
      'ooooooo..',
      'oAAAABBo.',
      'oACCCABo.',
      'oAAAAABD.',
      'oABBBBAo.',
      'oAAAAAo..',
      '.ooooo...'
    ]);
  }
  if (!G.PX.has('ic_tre_fashion')) {
    G.PX.tint('ic_tre_fashion', [
      '.ooooooo.',
      'oAAACCCAo',
      'oAAAACCBo',
      '.ooAAAoo.',
      '..ooAoo..',
      '.ooAAAoo.',
      'ooAAAAAoo'
    ]);
  }
  if (!G.PX.has('ic_tre_fuel')) {
    G.PX.tint('ic_tre_fuel', [
      '..oooo..',
      '.oAAAAB.',
      '.oACCCB.',
      '.oAAAAB.',
      '.oAAAAB.',
      '.oABBBB.',
      '..oooo..'
    ]);
  }
  if (!G.PX.has('ic_tre_elect')) {
    G.PX.tint('ic_tre_elect', [
      '.oooooo.',
      'oABBBBBo',
      'oAoooooB',
      'oAoooooB',
      'oAoooooB',
      'oABBBBBB',
      '.oooooo.'
    ]);
  }
  if (!G.PX.has('ic_tre_crystal')) {
    G.PX.tint('ic_tre_crystal', [
      '..oo..',
      '.oAAo.',
      'oACCCo',
      'oAAAo.',
      'oAABo.',
      '.oo...'
    ]);
  }
  if (!G.PX.has('ic_tre_ingot')) {
    G.PX.tint('ic_tre_ingot', [
      '..ooooo.',
      '.oAAAACo',
      'oAAAACC.',
      '.oAAABo.',
      '..ooo...'
    ]);
  }

  G.ITEMS = ITEMS;
  G.ITEM_MAP = {};
  ITEMS.forEach(function (it) { G.ITEM_MAP[it.id] = it; });

  /* 各稀有度的基础售价 */
  var BASE_PRICE = [9, 18, 33, 58, 96];

  G.itemPrice = function (it, wave) {
    var cells = (it.size ? it.size[0] * it.size[1] : 1);
    var sizeMul = 1 + (cells - 1) * 0.22;
    var p = BASE_PRICE[it.r] * (1 + wave * 0.085) * sizeMul;
    return Math.max(1, Math.round(p));
  };
  G.sellPrice = function (it, wave) {
    return Math.max(1, Math.floor(G.itemPrice(it, wave) * 0.4));
  };

  /** 按稀有度分组，供商店抽取 */
  G.ITEMS_BY_R = [[], [], [], [], []];
  ITEMS.forEach(function (it) { G.ITEMS_BY_R[it.r].push(it); });

  /** 物品图标画布 */
  G.itemIcon = function (it, scale) {
    return G.PX.getTint(it.icon, it.col, scale || 3);
  };

})();
