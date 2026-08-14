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
    var cells = (inst.def && inst.def.size) ? inst.def.size[0] * inst.def.size[1] : 1;
    var sizeMul = 1 + (cells - 1) * 0.22;
    return Math.max(1, Math.round(b * 1.25 * sizeMul));
  };
  G.itemCost = function (inst) {
    var b = inst.type === 'weapon' ? WPN_BASE[inst.tier] : ITEM_BASE[inst.tier];
    var cells = (inst.def && inst.def.size) ? inst.def.size[0] * inst.def.size[1] : 1;
    var sizeMul = 1 + (cells - 1) * 0.22;
    return Math.max(1, Math.round(b * 2.5 * sizeMul));
  };

  /* ------------------------------------------------------------
     地图档位（对应深渊不同区域）
     ------------------------------------------------------------ */
  G.TIERS = [
    { id: 1, name: '裂隙边缘', sub: '浅层裂隙 · 侦察与入门', grid: [6, 5], fee: 0,
      waveBand: [1, 4], danger: 1.0, loot: 1.0, obj: '存活 60 秒后撤离点开放', col: '#7fbf7f', unlock: true },
    { id: 2, name: '幽暗回廊', sub: '中层回廊 · 精英出没', grid: [7, 5], fee: 45,
      waveBand: [5, 9], danger: 1.9, loot: 1.6, obj: '击杀 1 名精英后撤离点开放', col: '#7fa8ff', unlock: false },
    { id: 3, name: '深部矿坑', sub: '深部矿脉 · 腐化巨兽盘踞', grid: [7, 6], fee: 140,
      waveBand: [10, 14], danger: 3.3, loot: 2.7, obj: '击败腐化巨兽后撤离点开放', col: '#c07fff', unlock: false },
    { id: 4, name: '深渊腹地', sub: '腹地长廊 · 精英成群', grid: [8, 6], fee: 380,
      waveBand: [15, 19], danger: 5.2, loot: 4.4, obj: '击杀 2 名精英后撤离点开放', col: '#ff9a5a', unlock: false },
    { id: 5, name: '终焉之门', sub: '深渊之心 · 深渊之主', grid: [8, 7], fee: 950,
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
      discovered: {},
      treasureReward: null,
      shop: null                 // 市场缓存 {tier:1, level:1, tokens:n, offers:[...]}
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
            mem.discovered = (d.discovered && typeof d.discovered === 'object') ? d.discovered : {};
            mem.treasureReward = d.treasureReward || null;
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
    level: 1,
    refreshCost: function () { return 12; },
    refresh: function (tier, luck) {
      this.tier = tier || 1;
      this.level = G.Market.levelOf();
      this.offers = [];
      var n = 12;
      for (var i = 0; i < n; i++) this.offers.push(this.rollOffer(luck));
      var d = load();
      d.shop = { tier: this.tier, level: this.level, tokens: G.Market.tokenCount(), offers: this.offers.map(function (o) {
        return { kind: o.kind, defId: o.defId, tier: o.tier };
      }) };
      persist();
      return this.offers;
    },
    rollOffer: function (luck) {
      var r = rollRarityForMarket(this.tier, luck);
      r = Math.min(r, G.Market.maxRarity());
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
      this.offers[idx] = this.rollOffer(0);   // 买完补新商品，可无限购买
      G.Market.saveOffers();
      return { ok: true, cost: cost };
    },
    restore: function () {
      var d = load();
      if (d.shop && d.shop.offers) {
        this.tier = d.shop.tier || 1;
        this.level = d.shop.level || 1;
        this.offers = d.shop.offers.map(function (o) {
          var inst = (o.kind === 'weapon') ? G.makeWeapon(o.defId, o.tier) : G.makeItem(o.defId, o.tier);
          if (!inst) inst = G.makeItem(o.defId, o.tier);
          return { kind: o.kind, defId: o.defId, def: inst ? inst.def : null, tier: o.tier };
        });
      }
    },
    /* 确保货架始终铺满当前等级允许的稀有度（清理旧档超品质存货） */
    ensureValid: function () {
      var lv = G.Market.levelOf();
      var valid = [], i;
      for (i = 0; i < this.offers.length; i++) {
        var o = this.offers[i];
        var inst = o ? this.instance(o) : null;
        if (inst && inst.tier <= lv) valid.push(o);
      }
      var changed = valid.length !== this.offers.length;
      while (valid.length < 12) { valid.push(this.rollOffer(0)); changed = true; }
      if (changed) {
        this.offers = valid;
        this.saveOffers();
      }
      return valid;
    },
    /* ---------- 市场等级 / 贸易代币 ---------- */
    maxRarity: function () { return G.Market.levelOf(); },
    levelOf: function () {
      var d = load();
      return Math.max(1, Math.min(4, (d.shop && d.shop.level) || 1));
    },
    tokenCount: function () {
      var d = load();
      return (d.shop && d.shop.tokens) || 0;
    },
    addToken: function (v) {
      var d = load();
      if (!d.shop) d.shop = { tier: 1, level: 1, tokens: 0, offers: [] };
      d.shop.tokens = (d.shop.tokens || 0) + (v || 1);
      persist();
      return d.shop.tokens;
    },
nextUpgrade: function () {
var lv = G.Market.levelOf();
var cost = [0, 3, 6, 10, 0][lv] || 0;
return cost;
},
    upgrade: function () {
      var lv = G.Market.levelOf();
      if (lv >= 4) return { ok: false, msg: '已满级' };
      var cost = G.Market.nextUpgrade();
      var d = load();
      if (!d.shop) d.shop = { tier: 1, level: 1, tokens: 0, offers: [] };
      if ((d.shop.tokens || 0) < cost) return { ok: false, msg: '贸易代币不足' };
      d.shop.tokens -= cost;
      d.shop.level = lv + 1;
      persist();
      this.level = lv + 1;
      var tier = Math.max(1, (G.Meta.stats && G.Meta.stats().bestTier) || 1);
      this.refresh(tier, 0);
      return { ok: true, cost: cost, level: lv + 1 };
    },
    saveOffers: function () {
      var d = load();
      if (!d.shop) d.shop = { tier: 1, level: 1, tokens: 0, offers: [] };
      d.shop.offers = this.offers.map(function (o) {
        return { kind: o.kind, defId: o.defId, tier: o.tier };
      });
      persist();
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

  /* 抽一件可收集宝物（占格 1x1 ~ 3x3，不参与战斗） */
  G.rollLootTreasure = function (mapTier) {
    var list = G.ITEMS.filter(function (it) { return it.type === 'treasure'; });
    if (!list.length) return null;
    var t = G.clamp(mapTier, 1, 5);
    /* 每层宝物稀有度分布：越深越偏爱稀有/大件，1 层以白绿为主、5 层以紫红为主 */
    var rarDist = [
      [0.45, 0.35, 0.14, 0.05, 0.01],
      [0.18, 0.42, 0.27, 0.10, 0.03],
      [0.05, 0.22, 0.45, 0.22, 0.06],
      [0.02, 0.12, 0.34, 0.40, 0.12],
      [0,    0.06, 0.24, 0.46, 0.24]
    ][t - 1];
    var buckets = [[], [], [], [], []];
    list.forEach(function (it) { buckets[it.r].push(it); });
    var r = G.rand(0, 1), acc = 0, chosenR = 4;
    for (var b = 0; b < 5; b++) {
      acc += rarDist[b];
      if (r < acc) { chosenR = b; break; }
    }
    var pool = buckets[chosenR];
    if (!pool || !pool.length) pool = buckets[chosenR - 1] || list;
    return G.makeItem(G.pick(pool).id, chosenR);
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
      var bt = G.rollLootTreasure(mapTier);
      if (bt) out.push(bt);
    } else if (def.elite) {
      out.push(G.rollLootItem(mapTier, luck));
      if (Math.random() < 0.45) out.push(G.rollLootWeapon(mapTier, luck));
      if (Math.random() < 0.5) {
        var et = G.rollLootTreasure(mapTier);
        if (et) out.push(et);
      }
    } else {
      var chance = (0.045 + mapTier * 0.011) * dropMul;
      if (Math.random() < chance) out.push(G.rollLootItem(mapTier, luck));
    }
    return out.filter(Boolean);
  };

  /* 贸易代币掉落：精英 / BOSS 概率掉落，用于升级市场 */
  G.Market.dropTokenChance = function (def, luck) {
    var p = 0;
    if (def && def.boss) p = 0.6;
    else if (def && def.elite) p = 0.22 + Math.min(0.2, luck / 500);
    if (def && def.boss) G.Market.addToken(1);
    else if (def && def.elite && Math.random() < p) G.Market.addToken(1);
  };

})();
