/* ============================================================
   13_meta.js —— 搜打撤持久化层（局外仓库 / 货币 / 装备栏 / 地图档位 / 掉落）
   ============================================================
   局外（持久）：
     - currency   深渊币：卖掉落物 / 撤离结算获得；用于市场购买、扩容仓库、进图门票
     - stash      仓库：物品实例数组（容量有限，可扩容）
     - loadout    装备栏：武器×2 / 防具×1 / 饰品×2 / 遗物×1
     - tiers      地图档位解锁状态
   局内（战局内）：
     - materials  材料：击杀 / 开箱获得，用于局内临时强化（祭坛）与稀有容器开启，撤离时 1:1 换币
     - bag        背包：局内搜刮到的物品实例，撤离带出 / 死亡全丢
   ============================================================ */
'use strict';

(function () {

  /* ------------------------------------------------------------
     物品类型：防具 / 饰品 / 遗物（武器独立）
     防具 = 防御性属性主导；遗物 = 传说级或带特效；其余 = 饰品
     ------------------------------------------------------------ */
  var SURVIVAL_KEYS = ['armor', 'maxHp', 'hpRegen', 'thorns', 'dodge'];

  G.ITEM_TYPES = ['weapon', 'armor', 'trinket', 'relic'];
  G.ITEM_TYPE_NAMES = { weapon: '武器', armor: '防具', trinket: '饰品', relic: '遗物' };

  G.itemType = function (def) {
    if (!def) return 'trinket';
    if (def.type) return def.type;
    if (def.r >= 4 || (def.r >= 3 && def.sp)) return 'relic';
    var m = def.mods || {};
    var surv = 0, other = 0;
    SURVIVAL_KEYS.forEach(function (k) { surv += Math.abs(m[k] || 0); });
    for (var k in m) if (SURVIVAL_KEYS.indexOf(k) < 0) other += Math.abs(m[k]);
    return (surv >= other && surv > 0) ? 'armor' : 'trinket';
  };

  /* 物品实例 */
  G._iuid = 0;
  G.makeItem = function (defId, tier) {
    var def = G.ITEM_MAP[defId];
    if (!def) return null;
    tier = (tier == null) ? def.r : G.clamp(tier, 0, 4);
    return {
      uid: 'it' + (++G._iuid) + '_' + Date.now().toString(36),
      defId: defId, def: def, tier: tier, type: G.itemType(def)
    };
  };

  /* 实例 → 存档纯数据 */
  G.itemData = function (inst) { return { defId: inst.defId, tier: inst.tier }; };
  G.itemFromData = function (d) {
    if (!d) return null;
    var inst = G.makeItem(d.defId, d.tier);
    return inst;
  };
  G.itemName = function (inst) { return (inst.def ? inst.def.name : inst.defId) + ' · ' + G.rarityName(inst.tier); };

  /* 价值（货币） */
  var ITEM_BASE = [9, 18, 33, 58, 96];
  var WPN_BASE = [11, 21, 38, 65, 108];
  G.itemWorth = function (inst) {
    var b = inst.type === 'weapon' ? WPN_BASE[inst.tier] : ITEM_BASE[inst.tier];
    return Math.max(1, Math.round(b * 1.25));
  };
  G.itemCost = function (inst) {
    var b = inst.type === 'weapon' ? WPN_BASE[inst.tier] : ITEM_BASE[inst.tier];
    return Math.max(1, Math.round(b * 2.5));
  };

  /* ------------------------------------------------------------
     地图档位（对应深渊不同区域）
     ------------------------------------------------------------ */
  G.TIERS = [
    { id: 1, name: '裂隙边缘', sub: '浅层裂隙 · 侦察与入门', grid: [4, 3], fee: 0,
      waveBand: [1, 4], danger: 1.0, loot: 1.0, obj: '存活 60 秒后撤离点开放', col: '#7fbf7f', unlock: true },
    { id: 2, name: '幽暗回廊', sub: '中层回廊 · 精英出没', grid: [4, 4], fee: 45,
      waveBand: [5, 9], danger: 1.9, loot: 1.6, obj: '击杀 1 名精英后撤离点开放', col: '#7fa8ff', unlock: false },
    { id: 3, name: '深部矿坑', sub: '深部矿脉 · 腐化巨兽盘踞', grid: [5, 4], fee: 140,
      waveBand: [10, 14], danger: 3.3, loot: 2.7, obj: '击败腐化巨兽后撤离点开放', col: '#c07fff', unlock: false },
    { id: 4, name: '深渊腹地', sub: '腹地长廊 · 精英成群', grid: [5, 5], fee: 380,
      waveBand: [15, 19], danger: 5.2, loot: 4.4, obj: '击杀 2 名精英后撤离点开放', col: '#ff9a5a', unlock: false },
    { id: 5, name: '终焉之门', sub: '深渊之心 · 深渊之主', grid: [6, 5], fee: 950,
      waveBand: [20, 20], danger: 7.8, loot: 7.2, obj: '击败深渊之主后撤离点开放', col: '#ff4a6b', unlock: false }
  ];
  G.TIER_MAP = {};
  G.TIERS.forEach(function (t) { G.TIER_MAP[t.id] = t; });

  /* ------------------------------------------------------------
     局外元存档 G.Meta
     ------------------------------------------------------------ */
  var KEY = 'abyss_hunter_meta_v1';
  var BAK_KEY = KEY + '.bak';               // 双槽冗余备份：主 key 损坏可回滚

  function defaults() {
    return {
      v: 1,
      currency: 60,
      stash: [],                 // [{defId, tier, type, uid?}] 物品实例
      stashSize: 30,
      loadout: { w1: null, w2: null, armor: null, trinket1: null, trinket2: null, relic: null },
      tiers: { 1: true },
      stats: { extracts: 0, deaths: 0, itemsExtracted: 0, itemsLost: 0, bestTier: 0, totalEarned: 0, totalSpent: 0 },
      expansions: 0,
      shop: null                 // 市场缓存 {tier:1, offers:[...]}
    };
  }

  var mem = null;
  function load() {
    if (mem) return mem;
    mem = defaults();
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(KEY);
        var bak = localStorage.getItem(BAK_KEY);
        if (!raw && bak) raw = bak;                       // 主丢失：用备份恢复
        var corrupt = false;
        if (raw) {
          var d = null;
          try { d = JSON.parse(raw); }
          catch (e) {
            corrupt = true;
            if (bak) { try { d = JSON.parse(bak); } catch (e2) { d = null; } }
          }
          if (d && typeof d === 'object') {
            mem.currency = (d.currency == null) ? 60 : +d.currency;
            mem.stash = Array.isArray(d.stash) ? d.stash : [];
            mem.stashSize = +d.stashSize || 30;
            if (d.loadout && typeof d.loadout === 'object') mem.loadout = d.loadout;
            if (d.tiers && typeof d.tiers === 'object') mem.tiers = d.tiers;
            if (d.stats && typeof d.stats === 'object') {
              for (var k in d.stats) mem.stats[k] = d.stats[k];
            }
            mem.expansions = +d.expansions || 0;
            mem.shop = d.shop || null;
          }
        }
        if (corrupt) persist();   // 用备份恢复后回写主 key
      }
    } catch (e) { /* 隐私模式降级内存 */ }
    return mem;
  }
  function persist() {
    try {
      mem.updatedAt = Date.now();
      var raw = JSON.stringify(mem);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KEY, raw);
        localStorage.setItem(BAK_KEY, raw);
      }
    }
    catch (e) { /* 忽略 */ }
  }

  var Meta = {
    get: function () { return load(); },
    flush: persist,
    reload: function () { mem = null; },

    currency: function () { return load().currency; },
    addCurrency: function (v) { load().currency += Math.max(0, Math.floor(v)); persist(); return load().currency; },
    spend: function (v) {
      var d = load();
      if (d.currency < v) return false;
      d.currency -= v;
      d.stats.totalSpent += v;
      persist();
      return true;
    },

    /* ---------- 仓库 ---------- */
    stash: function () { return load().stash; },
    stashFree: function () { var d = load(); return Math.max(0, d.stashSize - d.stash.length); },
    stashFull: function () { return load().stash.length >= load().stashSize; },
    addToStash: function (inst) {
      var d = load();
      if (d.stash.length >= d.stashSize) return false;
      d.stash.push(inst);
      persist();
      return true;
    },
    addStashData: function (itemData) {
      var inst = G.itemFromData(itemData);
      if (!inst) return null;
      return this.addToStash(inst) ? inst : null;
    },
    removeFromStash: function (uid) {
      var d = load();
      for (var i = 0; i < d.stash.length; i++) {
        if (d.stash[i].uid === uid) { d.stash.splice(i, 1); persist(); return true; }
      }
      return false;
    },
    expandStash: function () {
      var d = load();
      var cost = 120 * (d.expansions + 1);
      if (d.currency < cost) return { ok: false, msg: '深渊币不足' };
      d.currency -= cost;
      d.stashSize += 10;
      d.expansions++;
      d.stats.totalSpent += cost;
      persist();
      return { ok: true, cost: cost };
    },
    expandCost: function () { return 120 * (load().expansions + 1); },

    /* ---------- 装备栏 ---------- */
    loadout: function () { return load().loadout; },
    SLOT_ORDER: ['w1', 'w2', 'armor', 'trinket1', 'trinket2', 'relic'],
    slotType: function (slot) {
      if (slot === 'w1' || slot === 'w2') return 'weapon';
      if (slot === 'armor') return 'armor';
      if (slot === 'trinket1' || slot === 'trinket2') return 'trinket';
      return 'relic';
    },
    setLoadout: function (slot, inst) {
      var d = load();
      if (Meta.SLOT_ORDER.indexOf(slot) < 0) return false;
      d.loadout[slot] = inst || null;
      persist();
      return true;
    },
    equippedCount: function () {
      var lo = load().loadout, n = 0;
      for (var k in lo) if (lo[k]) n++;
      return n;
    },

    /* ---------- 档位 ---------- */
    tierUnlocked: function (id) { return !!load().tiers[id]; },
    unlockTier: function (id) { load().tiers[id] = true; persist(); },

    /* ---------- 统计 ---------- */
    addStat: function (k, v) {
      var s = load().stats;
      s[k] = (s[k] || 0) + v;
      persist();
      return s[k];
    },
    stats: function () { return load().stats; }
  };
  G.Meta = Meta;

  /* ------------------------------------------------------------
     市场（局外商店）：深渊币购买，商品入仓
     ------------------------------------------------------------ */
  function rollRarityForMarket(tier, luck) {
    var l = luck / 100;
    var w = [
      Math.max(2, 55 - tier * 7 - l * 20),
      Math.max(4, 26 + tier * 4 + l * 12),
      Math.max(2, 12 + tier * 3 + l * 12),
      Math.max(1, tier >= 2 ? 5 + tier * 2 + l * 10 : 0),
      Math.max(0, tier >= 3 ? -2 + tier * 2 + l * 9 : 0)
    ];
    return G.weightedPick([0, 1, 2, 3, 4], w);
  }

  G.Market = {
    offers: [],
    tier: 1,
    refreshCost: function () { return 12; },
    refresh: function (tier, luck) {
      this.tier = tier || 1;
      this.offers = [];
      for (var i = 0; i < 4; i++) this.offers.push(this.rollOffer(luck));
      var d = load();
      d.shop = { tier: this.tier, offers: this.offers.map(function (o) {
        return { kind: o.kind, defId: o.defId, tier: o.tier };
      }) };
      persist();
      return this.offers;
    },
    rollOffer: function (luck) {
      var r = rollRarityForMarket(this.tier, luck);
      var wantWeapon = Math.random() < 0.34;
      if (wantWeapon) {
        var w = G.pick(G.WEAPONS);
        return { kind: 'weapon', defId: w.id, def: w, tier: r };
      }
      var list = G.ITEMS_BY_R[r];
      var it = G.pick(list || G.ITEMS_BY_R[0]);
      return { kind: 'item', defId: it.id, def: it, tier: it.r };
    },
    instance: function (o) {
      return o.kind === 'weapon'
        ? G.makeWeapon(o.defId, o.tier)
        : G.makeItem(o.defId, o.tier);
    },
    price: function (o) { return G.itemCost(this.instance(o)); },
    buy: function (idx) {
      var o = this.offers[idx];
      if (!o) return { ok: false, msg: '无此商品' };
      var inst = this.instance(o);
      var cost = G.itemCost(inst);
      if (!Meta.spend(cost)) return { ok: false, msg: '深渊币不足' };
      if (Meta.stashFull()) {
        Meta.addCurrency(Math.round(cost * 0.5));   // 仓库满：退 50%
        return { ok: false, msg: '仓库已满' };
      }
      Meta.addToStash(inst);
      return { ok: true, cost: cost };
    },
    restore: function () {
      var d = load();
      if (d.shop && d.shop.offers) {
        this.tier = d.shop.tier || 1;
        this.offers = d.shop.offers.map(function (o) {
          var inst = G.makeWeapon(o.defId, o.tier);
          if (!inst) inst = G.makeItem(o.defId, o.tier);
          return { kind: o.kind, defId: o.defId, def: inst ? inst.def : null, tier: o.tier };
        });
      }
    }
  };
  G.Market.restore();

  /* ------------------------------------------------------------
     局内掉落
     ------------------------------------------------------------ */
  /* 掉落品质：mapTier 1..5，luck 影响高稀有度 */
  G.rollLootTier = function (mapTier, luck) {
    var l = luck / 100;
    var t = G.clamp(mapTier, 1, 5);
    var w = [
      Math.max(2, 58 - t * 8 - l * 24),
      Math.max(3, 26 + t * 3 + l * 12),
      Math.max(1, 10 + t * 3 + l * 13),
      Math.max(0, t >= 2 ? 3 + t * 2 + l * 12 : 0),
      Math.max(0, t >= 4 ? -3 + t * 1.6 + l * 10 : 0)
    ];
    return G.weightedPick([0, 1, 2, 3, 4], w);
  };

  /* 抽一件局内物品实例（按稀有度加权，兼顾类型分布） */
  G.rollLootItem = function (mapTier, luck) {
    var r = G.rollLootTier(mapTier, luck);
    var list = G.ITEMS_BY_R[r];
    if (!list || !list.length) return null;
    var it = G.pick(list);
    return G.makeItem(it.id, r);
  };

  /* 抽一把武器实例 */
  G.rollLootWeapon = function (mapTier, luck) {
    var r = G.rollLootTier(mapTier, luck);
    var w = G.pick(G.WEAPONS);
    return G.makeWeapon(w.id, r);
  };

  /* 敌人掉落：返回实例数组（普通小概率、精英必掉、BOSS 多件） */
  G.rollEnemyLoot = function (def, mapTier, luck) {
    var out = [];
    var p = G.game && G.game.player;
    var dropMul = p ? (1 + (p.st.dropRate || 0) / 100) : 1;
    if (def.boss) {
      out.push(G.rollLootItem(mapTier, luck));
      out.push(G.rollLootItem(mapTier, luck + 10));
      out.push(G.rollLootWeapon(mapTier, luck + 15));
    } else if (def.elite) {
      out.push(G.rollLootItem(mapTier, luck));
      if (Math.random() < 0.45) out.push(G.rollLootWeapon(mapTier, luck));
    } else {
      var chance = (0.045 + mapTier * 0.011) * dropMul;
      if (Math.random() < chance) out.push(G.rollLootItem(mapTier, luck));
    }
    return out.filter(Boolean);
  };

})();
