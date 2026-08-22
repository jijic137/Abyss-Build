/* ============================================================
   04_weapons.js —— 武器数据库
   每把武器有 5 个品质档位（白 绿 蓝 紫 红），档位只改数值不改机制。
   武器自动索敌、自动开火，玩家只负责走位。

   kind 说明：
     swing    —— 近战扇形挥击（可同时命中多个）
     thrust   —— 近战直线突刺（穿透）
     shot     —— 发射弹丸
     spread   —— 一次多发弹丸（霰弹）
     lob      —— 抛射，落点爆炸
     cone     —— 持续锥形喷射
     chain    —— 瞬发连锁闪电
     homing   —— 追踪弹
     returner —— 回旋镖
     bouncer  —— 弹跳飞镖
     turret   —— 部署炮台
   ============================================================ */
'use strict';

(function () {

  var TIER_DMG = [0.82, 1.28, 1.9, 2.85, 4.1];
  var TIER_CD  = [1, 0.97, 0.94, 0.90, 0.86];
  var BASE_WPRICE = [11, 21, 38, 65, 108];

  var WEAPONS = [

    /* ---------------- 近战 ---------------- */
    {
      id: 'knife', name: '小刀', icon: 'w_knife', col: '#c0c8d8', kind: 'swing',
      tags: ['melee'], base: 7, cd: 0.52, range: 78, arc: 1.5, knock: 60,
      mods: { critChance: 4 },
      desc: '出手极快的短刃，暴击率天生偏高。'
    },
    {
      id: 'sword', name: '巨剑', icon: 'w_sword', col: '#9fb4d8', kind: 'swing',
      tags: ['melee'], base: 15, cd: 0.95, range: 96, arc: 2.1, knock: 110,
      mods: { meleeDamage: 1 },
      desc: '大开大合，一刀能扫倒一整排。'
    },
    {
      id: 'hammer', name: '战锤', icon: 'w_hammer', col: '#a8763f', kind: 'swing',
      tags: ['melee'], base: 28, cd: 1.55, range: 88, arc: 1.8, knock: 260, stun: 0.35,
      mods: { attackSpeed: -4 },
      desc: '慢得让人着急，砸中就是一片。带击退与短暂硬直。'
    },
    {
      id: 'spear', name: '长矛', icon: 'w_spear', col: '#c9a86b', kind: 'thrust',
      tags: ['melee'], base: 13, cd: 0.78, range: 132, width: 26, knock: 70,
      mods: { range: 5 },
      desc: '安全距离上的近战，直线穿透。'
    },
    {
      id: 'fist', name: '铁拳', icon: 'w_fist', col: '#c07a3a', kind: 'swing',
      tags: ['melee'], base: 5, cd: 0.32, range: 58, arc: 1.3, knock: 45,
      mods: { attackSpeed: 5, lifesteal: 1 },
      desc: '贴脸乱捶。攻速离谱，射程感人。'
    },
    {
      id: 'chainsaw', name: '电锯', icon: 'w_chainsaw', col: '#d8503a', kind: 'swing',
      tags: ['melee'], base: 3.2, cd: 0.12, range: 66, arc: 1.15, knock: 14,
      mods: { speed: -4 },
      desc: '贴上去就不松口，每一帧都在削。'
    },

    /* ---------------- 远程 ---------------- */
    {
      id: 'pistol', name: '手枪', icon: 'w_pistol', col: '#8f96a8', kind: 'shot',
      tags: ['ranged'], base: 11, cd: 0.68, range: 340, bspd: 620, bullet: 'b_bullet',
      desc: '没有短板，也没有惊喜。'
    },
    {
      id: 'shotgun', name: '霰弹枪', icon: 'w_shotgun', col: '#a3763f', kind: 'spread',
      tags: ['ranged'], base: 5.5, cd: 1.15, range: 215, bspd: 560, count: 5, spread: 0.62,
      bullet: 'b_small', knock: 90,
      desc: '五发一起走。贴近了才是真正的伤害。'
    },
    {
      id: 'smg', name: '冲锋枪', icon: 'w_smg', col: '#6f7688', kind: 'shot',
      tags: ['ranged'], base: 4.2, cd: 0.16, range: 275, bspd: 680, jitter: 0.16,
      bullet: 'b_small',
      desc: '泼水一样的弹幕，单发很轻。'
    },
    {
      id: 'sniper', name: '狙击枪', icon: 'w_sniper', col: '#5a7d5a', kind: 'shot',
      tags: ['ranged'], base: 42, cd: 2.05, range: 640, bspd: 1500, pierce: 4,
      bullet: 'b_bullet',
      mods: { critChance: 8, range: 10 },
      desc: '一条直线上的所有人一起解决。'
    },
    {
      id: 'crossbow', name: '强弩', icon: 'w_crossbow', col: '#8b6f4e', kind: 'shot',
      tags: ['ranged'], base: 17, cd: 0.98, range: 420, bspd: 780, pierce: 2,
      bullet: 'b_shard',
      desc: '穿透两个目标，箭很重。'
    },
    {
      id: 'grenade', name: '手雷', icon: 'w_grenade', col: '#5a7a3a', kind: 'lob',
      tags: ['ranged'], base: 24, cd: 1.5, range: 330, bspd: 380, boom: 76,
      mods: { range: -5 },
      desc: '扔出去，炸一片。别站太近。'
    },
    {
      id: 'boomerang', name: '回旋镖', icon: 'w_boomerang', col: '#c9a227', kind: 'returner',
      tags: ['ranged'], base: 14, cd: 1.05, range: 300, bspd: 480,
      desc: '去程和回程各打一次，穿透所有目标。'
    },
    {
      id: 'shuriken', name: '手里剑', icon: 'w_shuriken', col: '#7f8fa8', kind: 'bouncer',
      tags: ['ranged'], base: 9, cd: 0.5, range: 320, bspd: 640, bounce: 3,
      mods: { attackSpeed: 3 },
      desc: '在敌群里弹来弹去，人越多越赚。'
    },

    /* ---------------- 元素 ---------------- */
    {
      id: 'flamer', name: '火焰喷射器', icon: 'w_flamer', col: '#e07b39', kind: 'cone',
      tags: ['elemental'], base: 2.6, cd: 0.08, range: 138, arc: 0.75, burn: 3,
      mods: { speed: -3 },
      desc: '短距离持续灼烧，会点燃目标。'
    },
    {
      id: 'wand', name: '法杖', icon: 'w_wand', col: '#8b5cf6', kind: 'homing',
      tags: ['elemental'], base: 10, cd: 0.58, range: 350, bspd: 340, turn: 5.0,
      bullet: 'b_orb',
      desc: '追踪弹。不用瞄，它自己会找。'
    },
    {
      id: 'lightning', name: '闪电权杖', icon: 'w_staff', col: '#5ad1ff', kind: 'chain',
      tags: ['elemental'], base: 13, cd: 1.1, range: 300, chain: 3, chainRange: 150, falloff: 0.78,
      desc: '瞬发连锁，在敌群里越跳越远。'
    },
    {
      id: 'ice', name: '冰锥', icon: 'w_ice', col: '#7fd8ff', kind: 'shot',
      tags: ['elemental'], base: 12, cd: 0.86, range: 360, bspd: 700, pierce: 2,
      slow: 0.42, slowTime: 1.6, bullet: 'b_shard',
      desc: '穿透并减速。控场比伤害更值钱。'
    },
    {
      id: 'dart', name: '毒镖', icon: 'w_dart', col: '#8fc040', kind: 'shot',
      tags: ['elemental'], base: 6, cd: 0.62, range: 330, bspd: 620, poison: 4.5, bullet: 'b_shard',
      desc: '直伤很低，但毒会一直走下去。'
    },

    /* ---------------- 工程 ---------------- */
    {
      id: 'turret', name: '哨戒炮', icon: 'w_turret', col: '#e0902a', kind: 'turret',
      tags: ['engineering'], base: 7, cd: 6.0, range: 300, tcd: 0.55, tlife: 14, bspd: 620,
      bullet: 'b_bullet',
      mods: { engineering: 2 },
      desc: '在脚下部署一座自动炮台，伤害吃工程学。'
    },
    {
      id: 'drone', name: '无人机', icon: 'w_drone', col: '#4fd0e8', kind: 'drone',
      tags: ['engineering'], base: 5, cd: 7.0, count: 1, tcd: 0.42, range: 300, bspd: 640, tlife: 24,
      bullet: 'b_bullet',
      mods: { engineering: 3 },
      desc: '部署一架跟随你的自动无人机，边飞边射，工程学越高越凶。'
    },
    {
      id: 'mine', name: '震荡地雷', icon: 'w_mine', col: '#ff9a3a', kind: 'mine',
      tags: ['engineering'], base: 20, cd: 2.2, cap: 8, rad: 110, armT: 0.5,
      mods: { engineering: 2, harvesting: 1 },
      desc: '在脚下埋雷，敌人踩上去被炸上天；爆完就没了，记得补。'
    },
    {
      id: 'laser_turret', name: '激光塔', icon: 'w_turret', col: '#5ad1ff', kind: 'turret',
      tags: ['engineering'], base: 8, cd: 7.5, range: 340, tcd: 0.95, tlife: 12, bspd: 1500, pierce: 7,
      bullet: 'b_bullet', laser: true,
      mods: { engineering: 3, range: 4 },
      desc: '部署激光炮塔，光束贯穿一整排敌人。'
    },
    {
      id: 'nanite_swarm', name: '纳米虫群', icon: 'w_shuriken', col: '#7fe8a0', kind: 'orbit',
      tags: ['engineering'], base: 4, cd: 3.0, count: 8, orbR: 0.56, orbSpd: 3.4,
      mods: { engineering: 2, speed: -2 },
      desc: '一圈纳米虫环绕飞行，碰到什么啃什么。'
    },
    {
      id: 'shock_field', name: '震荡力场', icon: 'w_tesla', col: '#7fd8ff', kind: 'pulse',
      tags: ['engineering'], base: 15, cd: 3.4, range: 150, slow: 0.5, slowTime: 1.8,
      mods: { engineering: 3 },
      desc: '周期性脉冲震开周围敌人，并让他们脚步迟缓。'
    },

    /* ---------------- 新增武器 ---------------- */
    {
      id: 'katana', name: '武士刀', icon: 'w_katana', col: '#c0d8ff', kind: 'swing',
      tags: ['melee'], base: 9, cd: 0.44, range: 86, arc: 1.6, knock: 50,
      mods: { critChance: 6, attackSpeed: 2 },
      desc: '快刀。出手快、暴击天生高，但单发偏轻。'
    },
    {
      id: 'halberd', name: '长戟', icon: 'w_halberd', col: '#c9a86b', kind: 'thrust',
      tags: ['melee'], base: 16, cd: 0.82, range: 140, width: 28, knock: 80,
      mods: { range: 6, meleeDamage: 1 },
      desc: '长柄直线穿刺，距离就是安全。'
    },
    {
      id: 'railgun', name: '磁轨炮', icon: 'w_sniper', col: '#5a8f7d', kind: 'shot',
      tags: ['ranged'], base: 60, cd: 2.4, range: 720, bspd: 1600, pierce: 6,
      bullet: 'b_bullet',
      mods: { critChance: 10, range: 12, attackSpeed: -6 },
      desc: '蓄力一击，贯穿整条战线。装填慢得让人不安。'
    },
    {
      id: 'frost_staff', name: '霜寒之杖', icon: 'w_froststaff', col: '#7fd8ff', kind: 'cone',
      tags: ['elemental'], base: 3.0, cd: 0.10, range: 140, arc: 0.8, slow: 0.4, slowTime: 1.6,
      mods: { speed: -3 },
      desc: '短距锥形喷射，命中的敌人被冻得越来越慢。'
    },
    {
      id: 'venom_spray', name: '毒雾喷壶', icon: 'w_poison', col: '#8fc040', kind: 'cone',
      tags: ['elemental'], base: 2.4, cd: 0.09, range: 130, arc: 0.8, poison: 5,
      mods: { elementalDamage: 1 },
      desc: '喷出毒雾，命中后持续掉血。'
    },
    {
      id: 'tesla_orb', name: '特斯拉法球', icon: 'w_tesla', col: '#7fe8ff', kind: 'chain',
      tags: ['elemental'], base: 14, cd: 0.95, range: 320, chain: 4, chainRange: 160, falloff: 0.8,
      mods: { attackSpeed: -2 },
      desc: '强力连锁闪电，在敌群里跳得更远。'
    },
    {
      id: 'magma_launcher', name: '熔岩发射器', icon: 'w_grenade', col: '#e0502a', kind: 'lob',
      tags: ['ranged'], base: 30, cd: 1.7, range: 340, bspd: 400, boom: 120,
      mods: { range: -5 },
      desc: '重型抛射，落点一片火海。别站在圈里。'
    },

    /* ---------------- 第二批新增武器 ---------------- */
    {
      id: 'club', name: '巨棒', icon: 'w_club', col: '#a8763f', kind: 'swing',
      tags: ['melee'], base: 10, cd: 0.72, range: 82, arc: 1.8, knock: 95, stun: 0.18,
      mods: { attackSpeed: -3 },
      desc: '笨重但扎实，敲中带短暂硬直。'
    },
    {
      id: 'trident', name: '三叉戟', icon: 'w_trident', col: '#c9a86b', kind: 'thrust',
      tags: ['melee'], base: 14, cd: 0.8, range: 134, width: 26, knock: 75,
      mods: { range: 4, meleeDamage: 1 },
      desc: '三根尖刺，距离与穿透兼顾。'
    },
    {
      id: 'blunderbuss', name: '喇叭枪', icon: 'w_blunder', col: '#a3763f', kind: 'spread',
      tags: ['ranged'], base: 6, cd: 1.2, range: 205, bspd: 540, count: 6, spread: 0.7,
      bullet: 'b_small', knock: 80,
      mods: { range: -6 },
      desc: '近距一轰一大片，离远了就散了。'
    },
    {
      id: 'throwing_axe', name: '飞斧', icon: 'w_axe', col: '#b0b6c4', kind: 'returner',
      tags: ['ranged'], base: 13, cd: 1.0, range: 280, bspd: 460,
      desc: '去回程各砍一次，穿透整条线。'
    },
    {
      id: 'spark_rod', name: '电杖', icon: 'w_rod', col: '#7fd8ff', kind: 'chain',
      tags: ['elemental'], base: 11, cd: 1.0, range: 280, chain: 3, chainRange: 140, falloff: 0.8,
      mods: { attackSpeed: -2 },
      desc: '瞬发连锁，在敌群里跳三下。'
    },

    /* ---------------- 第三批新增武器（新机制） ---------------- */
    {
      id: 'gravity_cannon', name: '重力炮', icon: 'w_grenade', col: '#7b6cff', kind: 'shot',
      tags: ['ranged'], base: 34, cd: 1.7, range: 360, bspd: 520, boom: 78,
      mods: { attackSpeed: -8 },
      desc: '沉重的一击，落地炸开并把敌人轰飞。'
    },
    {
      id: 'storm_staff', name: '风暴法杖', icon: 'w_wand', col: '#9b6bff', kind: 'homing',
      tags: ['elemental'], base: 8, cd: 0.92, range: 350, bspd: 340, turn: 4.5, count: 3,
      bullet: 'b_orb',
      desc: '同时放出三枚追踪法球，各自寻找目标。'
    },
    {
      id: 'spike_shotgun', name: '钉刺霰弹', icon: 'w_shotgun', col: '#b0763f', kind: 'spread',
      tags: ['ranged'], base: 6, cd: 1.25, range: 210, bspd: 560, count: 4, spread: 0.55,
      pierce: 2, bullet: 'b_small', knock: 70,
      desc: '四发散射且贯穿两个目标，贴脸火力凶猛。'
    },
    {
      id: 'pulse_core', name: '脉冲星', icon: 'w_tesla', col: '#7fe8ff', kind: 'pulse',
      tags: ['ranged'], base: 16, cd: 1.35, range: 150,
      mods: { attackSpeed: -4 },
      desc: '以自身为中心周期性爆发冲击波，清场兼控场。'
    },
    {
      id: 'orbit_blade', name: '环绕刃', icon: 'w_shuriken', col: '#c0d8ff', kind: 'orbit',
      tags: ['ranged'], base: 11, cd: 1.1, range: 150, count: 2, orbSpd: 2.6,
      bullet: 'w_shuriken',
      desc: '两把卫星刃绕身旋转，持续削切靠近的一切。'
    }
  ];

  G.WEAPONS = WEAPONS;
  G.WEAPON_MAP = {};
  WEAPONS.forEach(function (w) { G.WEAPON_MAP[w.id] = w; });

  G.weaponPrice = function (def, tier, wave) {
    var p = BASE_WPRICE[tier] * (1 + wave * 0.085);
    return Math.max(1, Math.round(p));
  };
  G.weaponSell = function (def, tier, wave) {
    return Math.max(1, Math.floor(G.weaponPrice(def, tier, wave) * 0.4));
  };

  /** 创建一把武器实例 */
  G.makeWeapon = function (defId, tier) {
    var def = G.WEAPON_MAP[defId];
    if (!def) { console.warn('未知武器', defId); return null; }
    tier = G.clamp(tier || 0, 0, 4);
    return {
      uid: (G._wuid = (G._wuid || 0) + 1),
      defId: defId,
      def: def,
      tier: tier,
      timer: G.rand(0, 0.3),   // 错开开火节奏
      angle: 0,
      swingT: 0,
      slotIdx: 0
    };
  };

  /** 该武器在该档位的实际基础伤害 */
  G.wDamage = function (w) { return w.def.base * TIER_DMG[w.tier]; };
  /** 该武器在该档位的冷却基数 */
  G.wCooldown = function (w) { return w.def.cd * TIER_CD[w.tier]; };
  /** 图标 —— 按品质染色 */
  G.weaponIcon = function (def, tier, scale) {
    scale = scale || 3;
    var key = 'wi|' + def.icon + '|' + tier + '|' + scale;
    if (G._wiCache && G._wiCache[key]) return G._wiCache[key];
    var c = tier === 0 ? def.col : G.RARITY[tier].color;
    var base = G.PX.getTint(def.icon, c, scale);
    if (!base) return null;
    // 统一增强：柔和投影 + 同色辉光轮廓，让武器图标更精致（像素+辉光混合）。
    // 包装 canvas 比 base 每边多 4px，base 居中绘制，PX.draw 居中后仍对齐图形中心。
    var cv = document.createElement('canvas');
    cv.width = base.width + 8; cv.height = base.height + 8;
    var cx = cv.getContext('2d');
    var ox = 4, oy = 4;
    // 1) 投影
    cx.shadowColor = 'rgba(0,0,0,0.5)'; cx.shadowBlur = 3;
    cx.shadowOffsetX = 1; cx.shadowOffsetY = 2;
    cx.drawImage(base, ox, oy);
    // 2) 同色辉光轮廓
    cx.shadowColor = 'transparent'; cx.shadowBlur = 0;
    cx.shadowOffsetX = 0; cx.shadowOffsetY = 0;
    cx.shadowColor = c; cx.shadowBlur = 4;
    cx.drawImage(base, ox, oy);
    // 3) 本体
    cx.shadowColor = 'transparent'; cx.shadowBlur = 0;
    cx.drawImage(base, ox, oy);
    cv.pw = base.pw; cv.ph = base.ph;
    G._wiCache = G._wiCache || {};
    return (G._wiCache[key] = cv);
  };
  G.TIER_DMG = TIER_DMG;

  /** 武器的属性附加（按档位放大） */
  G.weaponMods = function (def, tier) {
    if (!def.mods) return null;
    var out = {}, mul = 1 + tier * 0.35;
    for (var k in def.mods) out[k] = Math.round(def.mods[k] * mul * 10) / 10;
    /* 红档进化：额外获得攻击速度奖励（体现质变） */
    if (tier === 4) out.attackSpeed = (out.attackSpeed || 0) + 18;
    return out;
  };

})();
