/* ============================================================
   02_stats.js —— 属性系统
   22 项角色属性 + 结算公式 + 角色（职业）定义
   ============================================================ */
'use strict';

(function () {

  /* ------------------------------------------------------------
     属性表
     key       内部键
     name      显示名
     base      角色基础值
     suf       后缀（'%' 或 ''）
     dec       小数位
     group     分组：生存 / 输出 / 机动 / 增益
     desc      说明
     ------------------------------------------------------------ */
  var STAT_DEFS = [
    { key: 'maxHp',          name: '最大生命',   base: 100, suf: '',  dec: 0, group: '生存', desc: '生命值归零即结束本局。' },
    { key: 'hpRegen',        name: '生命回复',   base: 0,   suf: '/s', dec: 1, group: '生存', desc: '每秒回复的生命值。' },
    { key: 'lifesteal',      name: '生命偷取',   base: 0,   suf: '%', dec: 0, group: '生存', desc: '造成伤害时按比例回复生命（每次至少回 1 点，有 0.15 秒内置冷却）。' },
    { key: 'armor',          name: '护甲',       base: 0,   suf: '',  dec: 0, group: '生存', desc: '减伤 = 护甲 / (护甲 + 30)，上限 80%。负数护甲会额外增伤。' },
    { key: 'dodge',          name: '闪避',       base: 0,   suf: '%', dec: 0, group: '生存', desc: '完全免疫一次伤害的概率，上限 60%。' },
    { key: 'thorns',         name: '荆棘',       base: 0,   suf: '',  dec: 0, group: '生存', desc: '被近战命中时反弹的伤害。' },

    { key: 'damage',         name: '伤害',       base: 0,   suf: '%', dec: 0, group: '输出', desc: '所有伤害的百分比加成，最后结算。' },
    { key: 'meleeDamage',    name: '近战伤害',   base: 0,   suf: '',  dec: 0, group: '输出', desc: '近战武器的固定伤害加成。' },
    { key: 'rangedDamage',   name: '远程伤害',   base: 0,   suf: '',  dec: 0, group: '输出', desc: '远程武器的固定伤害加成。' },
    { key: 'elementalDamage',name: '元素伤害',   base: 0,   suf: '',  dec: 0, group: '输出', desc: '元素武器与灼烧/中毒的固定伤害加成。' },
    { key: 'engineering',    name: '工程学',     base: 0,   suf: '',  dec: 0, group: '输出', desc: '提升炮台等结构类武器的伤害与耐久。' },
    { key: 'attackSpeed',    name: '攻击速度',   base: 0,   suf: '%', dec: 0, group: '输出', desc: '缩短武器冷却，实际倍率 = 1 / (1 + 攻速%)。' },
    { key: 'critChance',     name: '暴击率',     base: 5,   suf: '%', dec: 0, group: '输出', desc: '暴击概率，上限 100%。' },
    { key: 'critDamage',     name: '暴击伤害',   base: 50,  suf: '%', dec: 0, group: '输出', desc: '暴击时的额外伤害百分比。' },
    { key: 'range',          name: '攻击范围',   base: 0,   suf: '%', dec: 0, group: '输出', desc: '武器射程与索敌距离。' },

    { key: 'speed',          name: '移动速度',   base: 0,   suf: '%', dec: 0, group: '机动', desc: '角色移动速度。' },
    { key: 'pickupRange',    name: '拾取范围',   base: 0,   suf: '%', dec: 0, group: '机动', desc: '材料的自动吸附半径。' },

    { key: 'luck',           name: '幸运',       base: 0,   suf: '',  dec: 0, group: '增益', desc: '提升商店出现高稀有度物品的概率，也提升掉落。' },
    { key: 'harvesting',     name: '收获',       base: 0,   suf: '',  dec: 0, group: '增益', desc: '每波结束时额外获得的材料（受波次加成）。' },
    { key: 'dropRate',       name: '掉落率',     base: 0,   suf: '%', dec: 0, group: '增益', desc: '敌人掉落材料数量的加成。' },
    { key: 'xpGain',         name: '经验获取',   base: 0,   suf: '%', dec: 0, group: '增益', desc: '获得经验值的加成。' },
    { key: 'waveHeal',       name: '波末治疗',   base: 8,   suf: '%', dec: 0, group: '增益', desc: '每波结束时按最大生命的百分比回血。' }
  ];

  G.STAT_DEFS = STAT_DEFS;
  G.STAT_MAP = {};
  STAT_DEFS.forEach(function (s) { G.STAT_MAP[s.key] = s; });

  /** 生成一份基础属性对象 */
  G.baseStats = function () {
    var o = {};
    STAT_DEFS.forEach(function (s) { o[s.key] = s.base; });
    return o;
  };
  /** 生成一份全 0 的属性对象 */
  G.zeroStats = function () {
    var o = {};
    STAT_DEFS.forEach(function (s) { o[s.key] = 0; });
    return o;
  };

  /** 把 mods（部分键）加到 target 上 */
  G.addStats = function (target, mods, mul) {
    mul = mul === undefined ? 1 : mul;
    for (var k in mods) {
      if (target[k] === undefined) target[k] = 0;
      target[k] += mods[k] * mul;
    }
    return target;
  };

  /** 属性值格式化，用于 UI */
  G.statText = function (key, val) {
    var d = G.STAT_MAP[key];
    if (!d) return G.fmt(val, 1);
    return G.fmt(val, d.dec) + d.suf;
  };
  /** 带正负号的增量文本，如 "+12%" */
  G.modText = function (key, val) {
    var d = G.STAT_MAP[key];
    var suf = d ? d.suf : '';
    var dec = d ? d.dec : 0;
    return (val >= 0 ? '+' : '') + G.fmt(val, dec) + suf;
  };
  G.statName = function (key) {
    var d = G.STAT_MAP[key];
    return d ? d.name : key;
  };

  /* ------------------------------------------------------------
     结算公式
     ------------------------------------------------------------ */
  var F = {};
  G.F = F;

  /** 护甲减伤系数（0~1，乘到伤害上） */
  F.armorMul = function (armor) {
    if (armor >= 0) {
      var red = armor / (armor + 30);
      return 1 - Math.min(red, 0.80);
    }
    return 1 + Math.min(-armor * 0.012, 1.2);
  };

  /** 闪避概率 */
  F.dodgeChance = function (dodge) { return G.clamp(dodge / 100, 0, 0.60); };

  /** 攻速 → 冷却倍率 */
  F.cdMul = function (attackSpeed) {
    return Math.max(0.18, 1 / (1 + attackSpeed / 100));
  };

  /** 移动速度（像素/秒） */
  F.moveSpeed = function (baseSpd, speedStat) {
    return baseSpd * Math.max(0.25, 1 + speedStat / 100);
  };

  /** 射程倍率 */
  F.rangeMul = function (rangeStat) { return Math.max(0.35, 1 + rangeStat / 100); };

  /** 每波结束的收获材料 */
  F.harvestGain = function (harvesting, wave) {
    if (harvesting <= 0) return 0;
    return Math.floor(harvesting * (1 + wave * 0.10));
  };

  /**
   * 武器伤害结算
   * @param {object} st   角色最终属性
   * @param {object} w    武器实例 {base, tags:[], tier}
   * @returns {{dmg:number, crit:boolean}}
   */
  F.weaponDamage = function (st, w) {
    var flat = 0;
    if (w.tags.indexOf('melee') >= 0)      flat += st.meleeDamage;
    if (w.tags.indexOf('ranged') >= 0)     flat += st.rangedDamage;
    if (w.tags.indexOf('elemental') >= 0)  flat += st.elementalDamage;
    if (w.tags.indexOf('engineering') >= 0) flat += st.engineering * 0.85;

    var dmg = (w.base + flat) * (1 + st.damage / 100);
    var crit = Math.random() < G.clamp(st.critChance / 100, 0, 1);
    if (crit) dmg *= 1 + st.critDamage / 100;
    // ±8% 浮动，手感更活
    dmg *= 0.92 + Math.random() * 0.16;
    return { dmg: Math.max(1, dmg), crit: crit };
  };

  /**
   * 武器的「伤害加成来源」显示名（供 UI 描述使用）。
   * 规则与 weaponDamage 完全一致：melee→近战伤害 / ranged→远程伤害 /
   * elemental→元素伤害 / engineering→工程学(×0.85)；所有武器额外吃全局「伤害%」。
   * 由 tags 推导，单一权威来源，避免与武器描述文本脱节。
   */
  F.damageAttrText = function (tags) {
    if (!tags) return '通用伤害';
    var parts = [];
    if (tags.indexOf('melee') >= 0)       parts.push('近战伤害');
    if (tags.indexOf('ranged') >= 0)      parts.push('远程伤害');
    if (tags.indexOf('elemental') >= 0)   parts.push('元素伤害');
    if (tags.indexOf('engineering') >= 0) parts.push('工程学');
    return parts.length ? parts.join('、') : '通用伤害';
  };

  /** 商店稀有度权重（受波次与幸运影响） */
  F.rarityWeights = function (wave, luck) {
    var l = luck / 100;
    var w = wave;
    return [
      Math.max(3,  92  - w * 3.6 - l * 26),                 // 白：早期主导，随波次缓降
      Math.max(6,  20  + w * 1.7 + l * 12),                 // 绿：全程稳定供给
      Math.max(2,  4   + w * 2.1 + l * 17),                 // 蓝：中后期主力升级
      Math.max(1,  (w >= 4 ? -2 + w * 1.25 : 0) + l * 14),  // 紫：第 4 波起解锁
      Math.max(0,  (w >= 8 ? -4 + w * 0.80 : 0) + l * 11)   // 红：第 8 波起解锁
    ];
  };

  /* ------------------------------------------------------------
     角色（职业）
     ------------------------------------------------------------ */
  G.CHARACTERS = [
    {
      id: 'knight', name: '铁卫', sprite: 'char_knight', color: '#7d8aa8',
      desc: '厚实的前排。用护甲和血量硬扛，代价是慢。',
      mods: { maxHp: 25, armor: 6, attackSpeed: -12, speed: -6 },
      startWeapon: 'spear', startMat: 15,
      skill: {
        id: 'shield_wall', name: '地裂', sym: '地', col: '#7d8aa8',
        cd: 10, desc: '挥出地裂，将周围敌人击退并造成伤害，同时短暂提升护甲。',
        effect: 'quake'
      }
    },
    {
      id: 'ranger', name: '游侠', sprite: 'char_ranger', color: '#4fa86b',
      desc: '稳健的远程手。射程与攻速都不错，但很脆。',
      mods: { maxHp: -12, rangedDamage: 3, attackSpeed: 10, range: 15 },
      startWeapon: 'pistol', startMat: 12,
      skill: {
        id: 'volley', name: '箭雨突袭', sym: '箭', col: '#4fa86b',
        cd: 9, desc: '向周围方向齐射一轮箭矢，每支箭锁定一名敌人。',
        effect: 'volley'
      }
    },
    {
      id: 'mage', name: '术士', sprite: 'char_mage', color: '#8b5cf6',
      desc: '元素专精。灼烧、闪电、冰霜都为他而生。',
      mods: { maxHp: -18, elementalDamage: 6, range: 18, armor: -2, critChance: -3 },
      startWeapon: 'wand', startMat: 12,
      skill: {
        id: 'nova', name: '元素星爆', sym: '星', col: '#8b5cf6',
        cd: 9, desc: '在身体四周炸开一圈元素星爆，对一圈敌人造成元素伤害。',
        effect: 'nova'
      }
    },
    {
      id: 'brute', name: '狂徒', sprite: 'char_brute', color: '#c0392b',
      desc: '贴脸打。伤害极高，但必须冲进敌群里去拿。',
      mods: { maxHp: 10, meleeDamage: 5, damage: 15, armor: -4, range: -20 },
      startWeapon: 'hammer', startMat: 10,
      skill: {
        id: 'rage', name: '狂暴', sym: '狂', col: '#c0392b',
        cd: 14, desc: '期间暴击和攻击速度大幅提升。',
        effect: 'rage'
      }
    },
    {
      id: 'engineer', name: '工匠', sprite: 'char_engineer', color: '#e0902a',
      desc: '让炮台替你开火。前期弱，成型后是坐着赢。',
      mods: { engineering: 14, harvesting: 3, damage: -18, speed: -4 },
      startWeapon: 'turret', startMat: 20,
      skill: {
        id: 'overcharge', name: '爆能过载', sym: '能', col: '#e0902a',
        cd: 12, desc: '所有炮台和机器仆人全部恢复并附赠一段短暂爆发。',
        effect: 'overcharge'
      }
    },
    {
      id: 'shadow', name: '影刺', sprite: 'char_shadow', color: '#3d4a6b',
      desc: '靠暴击和闪避活着。血很薄，容错极低。',
      mods: { maxHp: -25, critChance: 12, critDamage: 25, dodge: 8, speed: 12 },
      startWeapon: 'knife', startMat: 12,
      skill: {
        id: 'ambush', name: '影袭', sym: '影', col: '#3d4a6b',
        cd: 9, desc: '移动到周围最近的敌人并划出影弧，对一圈目标造成伤害。',
        effect: 'ambush'
      }
    },
    {
      id: 'alchemist', name: '炼金术士', sprite: 'char_alchemist', color: '#4f8a3a',
      desc: '毒与元素的操盘手。持续伤害把敌人磨死，但自己很脆。',
      mods: { maxHp: -12, elementalDamage: 6, harvesting: 2, armor: -2, critChance: -3 },
      startWeapon: 'dart', startMat: 12,
      skill: {
        id: 'smoke', name: '毒雾遮蔽', sym: '毒', col: '#4f8a3a',
        cd: 11, desc: '布置一片毒雾屏障，对其中敌人持续造成伤害并附加中毒。',
        effect: 'smoke'
      }
    },
    {
      id: 'warden', name: '守望者', sprite: 'char_warden', color: '#5a7d9c',
      desc: '让炮台与护甲替你扛线。成型极稳，但输出迟滞。',
      mods: { engineering: 12, armor: 4, damage: -14, speed: -3, hpRegen: 0.3 },
      startWeapon: 'turret', startMat: 20,
      skill: {
        id: 'bulwark', name: '守护圆舞', sym: '守', col: '#5a7d9c',
        cd: 13, desc: '打开守护圆舞，短暂隔绝伤害并震慑周围敌人。',
        effect: 'bulwark'
      }
    }
  ];

  /* 按 id 快速查找角色定义（存档读档用） */
  G.CHAR_BY_ID = {};
  G.CHARACTERS.forEach(function (c) { G.CHAR_BY_ID[c.id] = c; });

  /* ------------------------------------------------------------
     升级选项池（等级提升时四选一）
     每项：属性键 + 数值范围 + 权重
     ------------------------------------------------------------ */
  G.LEVEL_POOL = [
    { key: 'maxHp',           amt: [8, 14],  w: 10 },
    { key: 'hpRegen',         amt: [0.4, 0.7], w: 7, dec: 1 },
    { key: 'lifesteal',       amt: [2, 3],   w: 6 },
    { key: 'armor',           amt: [2, 4],   w: 9 },
    { key: 'dodge',           amt: [3, 5],   w: 7 },
    { key: 'thorns',          amt: [3, 6],   w: 5 },
    { key: 'damage',          amt: [6, 10],  w: 10 },
    { key: 'meleeDamage',     amt: [2, 4],   w: 8 },
    { key: 'rangedDamage',    amt: [2, 4],   w: 8 },
    { key: 'elementalDamage', amt: [2, 4],   w: 8 },
    { key: 'engineering',     amt: [3, 5],   w: 6 },
    { key: 'attackSpeed',     amt: [6, 9],   w: 10 },
    { key: 'critChance',      amt: [3, 5],   w: 8 },
    { key: 'critDamage',      amt: [10, 16], w: 6 },
    { key: 'range',           amt: [8, 12],  w: 7 },
    { key: 'speed',           amt: [5, 8],   w: 8 },
    { key: 'pickupRange',     amt: [12, 20], w: 4 },
    { key: 'luck',            amt: [5, 9],   w: 7 },
    { key: 'harvesting',      amt: [2, 4],   w: 7 },
    { key: 'dropRate',        amt: [8, 12],  w: 5 },
    { key: 'xpGain',          amt: [6, 10],  w: 5 }
  ];

  /* 升级「权衡卡」：+ 主属性 / − 小幅副属性，负面幅度克制，契合「物品普遍带负面」主题
     约 1/4 的升级选项会来自此表 */
  G.TRADEOFF_POOL = [
    { w: 7, pos: { key: 'damage',          amt: [8, 12],  w: 10 }, neg: { key: 'speed',        amt: [4, 7] } },
    { w: 7, pos: { key: 'maxHp',          amt: [10, 16], w: 9  }, neg: { key: 'attackSpeed', amt: [4, 7] } },
    { w: 7, pos: { key: 'meleeDamage',    amt: [3, 5],   w: 8  }, neg: { key: 'pickupRange', amt: [10, 18] } },
    { w: 6, pos: { key: 'critChance',     amt: [4, 6],   w: 7  }, neg: { key: 'maxHp',       amt: [5, 9] } },
    { w: 7, pos: { key: 'attackSpeed',    amt: [7, 10],  w: 9  }, neg: { key: 'armor',       amt: [2, 4] } },
    { w: 7, pos: { key: 'speed',          amt: [6, 9],   w: 8  }, neg: { key: 'damage',      amt: [4, 7] } },
    { w: 6, pos: { key: 'elementalDamage',amt: [3, 5],   w: 7  }, neg: { key: 'hpRegen',     amt: [0.3, 0.5], dec: 1 } },
    { w: 7, pos: { key: 'rangedDamage',   amt: [3, 5],   w: 8  }, neg: { key: 'dodge',       amt: [3, 5] } },
    { w: 6, pos: { key: 'range',          amt: [10, 14], w: 6  }, neg: { key: 'luck',        amt: [4, 7] } },
    { w: 6, pos: { key: 'engineering',    amt: [4, 6],   w: 6  }, neg: { key: 'speed',       amt: [3, 5] } },
    { w: 6, pos: { key: 'critDamage',     amt: [10, 16], w: 6  }, neg: { key: 'hpRegen',     amt: [0.3, 0.5], dec: 1 } },
    { w: 5, pos: { key: 'lifesteal',      amt: [2, 3],   w: 6  }, neg: { key: 'maxHp',       amt: [4, 7] } }
  ];

  /** 抽 n 个不重复的升级选项（约 1/4 为带负面权衡卡） */
  G.rollLevelOptions = function (n, level) {
    var pure = G.LEVEL_POOL.slice();
    var trade = G.TRADEOFF_POOL.slice();
    var out = [];
    var used = {};   // 已展示的主/副属性 key，避免重复
    var scale = 1 + level * 0.035;
    function amtOf(def) {
      var raw = G.rand(def.amt[0], def.amt[1]) * scale;
      var dec = def.dec || 0;
      var val = dec ? Math.round(raw * 10) / 10 : Math.round(raw);
      return Math.max(dec ? 0.1 : 1, val);
    }
    while (out.length < n) {
      var isTrade = Math.random() < 0.27;   // ≈ 1/4
      if (isTrade && trade.length) {
        var tws = trade.map(function (p) { return p.w; });
        var t = G.weightedPick(trade, tws);
        trade.splice(trade.indexOf(t), 1);
        if (used[t.pos.key] || used[t.neg.key]) continue;   // 主/副属性已被占用则跳过，换一张
        out.push({
          key: t.pos.key, val: amtOf(t.pos),
          negKey: t.neg.key, negVal: amtOf(t.neg),
          trade: true
        });
        used[t.pos.key] = 1; used[t.neg.key] = 1;
      } else {
        if (!pure.length) { if (trade.length) continue; break; }
        var pws = pure.map(function (p) { return p.w; });
        var p = G.weightedPick(pure, pws);
        pure.splice(pure.indexOf(p), 1);
        if (used[p.key]) continue;
        out.push({ key: p.key, val: amtOf(p) });
        used[p.key] = 1;
      }
    }
    return out;
  };

  /** 升到下一级所需经验 */
  G.xpForLevel = function (lv) {
    return Math.floor(6 + lv * 4 + lv * lv * 1.35);
  };

  /* ------------------------------------------------------------
     成就表（在结算时根据战局指标评定）
     icon 为装饰性符号（非 emoji），契合暗色像素风
     ------------------------------------------------------------ */
  G.ACHIEVEMENTS = [
    { id: 'first_dive',  name: '初入深渊',   icon: '✦', desc: '完成第一波战斗' },
    { id: 'halfway',     name: '半程',       icon: '⟁', desc: '抵达第 10 波' },
    { id: 'conqueror',   name: '深渊征服者', icon: '☉', desc: '通关全部 20 波' },
    { id: 'slayer100',   name: '百杀',       icon: '⚔', desc: '单局击杀 ≥ 100' },
    { id: 'elite_hunter',name: '精英猎手',   icon: '✸', desc: '单局精英击杀 ≥ 5' },
    { id: 'boss_slayer', name: '屠龙者',     icon: '☠', desc: '单局击败 2 个 BOSS' },
    { id: 'combo_master',name: '连击大师',   icon: '✺', desc: '单局最高连击 ≥ 30' },
    { id: 'annihilator', name: '毁灭输出',   icon: '✹', desc: '单局 DPS ≥ 10000' },
    { id: 'ascetic',     name: '苦行者',     icon: '✠', desc: '不持有任何物品通关' },
    { id: 'collector',   name: '全职业通关', icon: '⬡', desc: '用全部职业各通关一次' },
    { id: 'speedrun',    name: '速通',       icon: '⟳', desc: '10 分钟内通关' },
    { id: 'tycoon',      name: '暴富',       icon: '❖', desc: '单局累计材料 ≥ 500' }
  ];

})();
