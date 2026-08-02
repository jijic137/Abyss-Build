/* ============================================================
   08_shop.js —— 商店逻辑
   每波结束后开启，4 个卡位。可锁定、可重掷、可出售。
   稀有度概率随波次与「幸运」提升。
   ============================================================ */
'use strict';

(function () {

  var Shop = {
    offers: [],
    rerolls: 0,
    wave: 1
  };
  G.Shop = Shop;

  /** 抽一个稀有度 */
  function rollRarity(wave, luck) {
    var w = G.F.rarityWeights(wave, luck);
    if (wave < 4) { w[3] = 0; w[4] = 0; }
    if (wave < 8) { w[4] = 0; }
    return G.weightedPick([0, 1, 2, 3, 4], w);
  }

  /** 玩家已达上限的物品 id 集合 */
  function maxedIds(p) {
    var count = {}, out = {};
    p.items.forEach(function (it) { count[it.id] = (count[it.id] || 0) + 1; });
    for (var id in count) {
      var def = G.ITEM_MAP[id];
      if (def && def.max && count[id] >= def.max) out[id] = true;
    }
    return out;
  }

  /** 生成一个商品 */
  function rollOffer(wave, p, existing) {
    var luck = p.st.luck;
    var maxed = maxedIds(p);
    var wantWeapon = Math.random() < (p.weapons.length < p.maxWeapons ? 0.36 : 0.14);

    for (var tries = 0; tries < 24; tries++) {
      var r = rollRarity(wave, luck);
      if (wantWeapon) {
        var pool = G.WEAPONS;
        var def = G.pick(pool);
        var dup = existing.some(function (o) {
          return o && o.kind === 'weapon' && o.def.id === def.id && o.tier === r;
        });
        if (dup) continue;
        return {
          kind: 'weapon', def: def, tier: r,
          price: G.weaponPrice(def, r, wave), locked: false, sold: false
        };
      } else {
        var list = G.ITEMS_BY_R[r];
        if (!list || !list.length) continue;
        var it = G.pick(list);
        if (maxed[it.id]) continue;
        var dup2 = existing.some(function (o) { return o && o.kind === 'item' && o.def.id === it.id; });
        if (dup2) continue;
        return {
          kind: 'item', def: it, tier: r,
          price: G.itemPrice(it, wave), locked: false, sold: false
        };
      }
    }
    // 兜底：白色物品
    var f = G.pick(G.ITEMS_BY_R[0]);
    return { kind: 'item', def: f, tier: 0, price: G.itemPrice(f, wave), locked: false, sold: false };
  }

  /** 打开商店（新的一波结束） */
  Shop.open = function (wave, p) {
    this.wave = wave;
    this.rerolls = 0;
    this.offers = [];
    for (var i = 0; i < 4; i++) this.offers.push(rollOffer(wave, p, this.offers));
  };

  /** 重掷（保留锁定的） */
  Shop.reroll = function (p) {
    var cost = this.rerollCost();
    if (G.game.materials < cost) return false;
    G.game.materials -= cost;
    this.rerolls++;
    var kept = this.offers.map(function (o) { return (o && o.locked && !o.sold) ? o : null; });
    for (var i = 0; i < 4; i++) {
      if (kept[i]) continue;
      kept[i] = rollOffer(this.wave, p, kept);
    }
    this.offers = kept;
    return true;
  };

  Shop.rerollCost = function () {
    return Math.max(1, Math.round((2 + this.wave * 0.55) * (1 + this.rerolls * 0.6)));
  };

  /** 购买 */
  Shop.buy = function (idx, p) {
    var o = this.offers[idx];
    if (!o || o.sold) return { ok: false, msg: '已售出' };
    if (G.game.materials < o.price) return { ok: false, msg: '材料不足' };

    if (o.kind === 'weapon') {
      if (p.weapons.length >= p.maxWeapons) return { ok: false, msg: '武器栏已满（最多 6 把）' };
      p.addWeapon(G.makeWeapon(o.def.id, o.tier));
    } else {
      var cnt = p.items.filter(function (x) { return x.id === o.def.id; }).length;
      if (o.def.max && cnt >= o.def.max) return { ok: false, msg: '已达持有上限' };
      p.addItem(o.def);
    }
    G.game.materials -= o.price;
    o.sold = true;
    G.Audio.sfx('buy');
    if (G.game.saveRun) G.game.saveRun();   // 购买后及时存盘
    return { ok: true };
  };

  /** 出售武器 */
  Shop.sellWeapon = function (idx, p) {
    var w = p.weapons[idx];
    if (!w) return false;
    G.game.materials += G.weaponSell(w.def, w.tier, this.wave);
    p.removeWeapon(idx);
    if (G.game.saveRun) G.game.saveRun();
    return true;
  };

  /** 出售物品 */
  Shop.sellItem = function (idx, p) {
    var it = p.items[idx];
    if (!it) return false;
    G.game.materials += G.sellPrice(it, this.wave);
    p.removeItem(idx);
    if (G.game.saveRun) G.game.saveRun();
    return true;
  };

})();
