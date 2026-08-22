/* ============================================================
  67_set.js ? ???? (Set Bonus System)
  ?????? index.html ??? js/66_dodge.js ????? 66 ?? 65_audio2.js ????
  ============================================================
  ????????????
  1. ????? G.SET_DEFS????? G.SETS?? id ????
  2. ???????????items ????????? set ???????????
     ????? 03_items.js ?????G.ITEM_MAP ?????????
  3. ???????? this.items?????????/??/????**?????**
     ?? ????????????????????????????????????
  4. ?????**????**????????????????(need<=count)??? mods ??????
     ?? Diablo ?????????????????????????????????
     ????(sp)??????? sp ?????? this.sp ??? +1??? (x||0)+1 ????
     ?? player.hasSp(key) ?????/?????????
  5. ??????? 07_player.js???? recalc ??????? recalc ?? this.st/this.sp?
     ???????????? recalc ? maxHp ???/??????????
  6. ?? sp ??????????????frostAura/thunderAura/chainOnHit/explodeOnKill/leechOnKill??
     ????????????????????????
  ============================================================ */
(function () {
  'use strict';
  if (!G || !G.Player) return;

  var SET_DEFS = [
    {
      id: 'iron_guard', name: '????', color: '#8f96a8',
      items: ['iron_plate', 'tin_helm', 'tac_vest', 'dragon_scale', 'iron_will', 'titan_bulwark'],
      bonuses: [
        { need: 2, mods: { armor: 8, maxHp: 15 } },
        { need: 3, mods: { armor: 10, maxHp: 25, thorns: 4 } },
        { need: 5, mods: { armor: 14, maxHp: 35, thorns: 6, hpRegen: 0.4 } }
      ]
    },
    {
      id: 'shadow', name: '????', color: '#7f8fd6',
      items: ['crow_feather', 'feather_boot', 'shadow_cloak', 'gale_rune', 'phantom_cape', 'afterimage'],
      bonuses: [
        { need: 2, mods: { dodge: 4, speed: 3 } },
        { need: 3, mods: { dodge: 6, speed: 4, critChance: 5 } },
        { need: 5, mods: { dodge: 8, speed: 5, critChance: 6 } }
      ]
    },
    {
      id: 'elemental', name: '????', color: '#e0602a',
      items: ['matchbox', 'sulfur', 'ember_ring', 'frost_aura', 'storm_brand', 'frost_sigil'],
      bonuses: [
        { need: 2, mods: { elementalDamage: 8 } },
        { need: 3, mods: { elementalDamage: 12 }, sp: 'frostAura', spTxt: '??????? 130 ???????' },
        { need: 5, mods: { elementalDamage: 18, critChance: 4 }, sp: 'chainOnHit', spTxt: '??????????????' }
      ]
    },
    {
      id: 'engineer', name: '????', color: '#5ad1ff',
      items: ['ammo_pouch', 'battery', 'toolbox', 'blueprint', 'perp_core', 'divine_engine'],
      bonuses: [
        { need: 2, mods: { engineering: 10, attackSpeed: 4 } },
        { need: 3, mods: { engineering: 14, attackSpeed: 6, rangedDamage: 8 } },
        { need: 5, mods: { engineering: 18, attackSpeed: 8, rangedDamage: 12 }, sp: 'explodeOnKill', spTxt: '?????????????' }
      ]
    },
    {
      id: 'blood', name: '????', color: '#c03a4a',
      items: ['bat_wing', 'blood_charm', 'berserk_blood', 'vampire_fang', 'blood_totem', 'gore_crown'],
      bonuses: [
        { need: 2, mods: { lifesteal: 4, damage: 5 } },
        { need: 3, mods: { lifesteal: 5, damage: 6 }, sp: 'leechOnKill', spTxt: '???????????' },
        { need: 5, mods: { lifesteal: 7, damage: 8, maxHp: 20 } }
      ]
    }
  ];

  G.SET_DEFS = SET_DEFS;
  G.SETS = {};
  for (var si = 0; si < SET_DEFS.length; si++) {
    var set = SET_DEFS[si];
    G.SETS[set.id] = set;
    for (var mi = 0; mi < set.items.length; mi++) {
      var def = G.ITEM_MAP && G.ITEM_MAP[set.items[mi]];
      if (def) def.set = set.id;
    }
    // ????????????????? UI?
    set.tierText = [];
    for (var bi = 0; bi < set.bonuses.length; bi++) {
      var bn = set.bonuses[bi];
      var parts = [];
      for (var k in (bn.mods || {})) parts.push(G.statName(k) + ' ' + G.modText(k, bn.mods[k]));
      if (bn.spTxt) parts.push(bn.spTxt);
      set.tierText.push({ need: bn.need, txt: parts.join('?') });
    }
  }

  /* ? UI ??????? */
  G.setInfo = function (setId) { return G.SETS[setId] || null; };

  /* ?????????????set_id -> count???? this.items?????? */
  if (G.Player && G.Player.prototype) {
    G.Player.prototype.getSetCounts = function () {
      var counts = {};
      for (var i = 0; i < this.items.length; i++) {
        var def = this.items[i];
        if (def && def.set) {
          var sid = def.set;
          if (G.SETS[sid]) counts[sid] = (counts[sid] || 0) + 1;
        }
      }
      return counts;
    };
  }

  /* ??? recalc????????????????? 07_player.js? */
  var _orig = G.Player.prototype.recalc;
  G.Player.prototype.recalc = function () {
    var oldMax = this.st ? this.st.maxHp : 0;
    _orig.call(this);

    var counts = this.getSetCounts();
    this.setTiers = {};          // set_id -> ?????? need?? UI?
    this.setSpActive = {};       // set_id -> ??? sp ??????? UI?
    var total = {};
    var sid;
    for (sid in counts) {
      var set = G.SETS[sid];
      if (!set) continue;
      var c = counts[sid];
      this.setTiers[sid] = 0;
      this.setSpActive[sid] = [];
      for (var b = 0; b < set.bonuses.length; b++) {
        var bn = set.bonuses[b];
        if (c >= bn.need) {
          if (bn.need > this.setTiers[sid]) this.setTiers[sid] = bn.need;
          if (bn.mods) G.addStats(total, bn.mods);
          if (bn.sp) {
            this.sp[bn.sp] = (this.sp[bn.sp] || 0) + 1;
            this.setSpActive[sid].push(bn.sp);
          }
        }
      }
    }

    if (Object.keys(total).length) {
      G.addStats(this.st, total);
      this.st.maxHp = Math.max(10, Math.round(this.st.maxHp));
      if (this.st.maxHp > oldMax) this.hp += (this.st.maxHp - oldMax);
      this.hp = G.clamp(this.hp, 1, this.st.maxHp);
    }
  };
})();
