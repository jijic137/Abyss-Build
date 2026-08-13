/* ============================================================
   33_inv.js —— 物品占格系统（多尺寸背包/仓库）
   武器 2x1 · 防具 2x1 · 饰品 1x1 · 遗物 2x2 · 钥匙 1x1
   背包 5 列 × 20 格，仓库 8 列自适应；首次适配式自动打包。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  G.ITEM_SIZE = { weapon: [2, 1], armor: [2, 1], trinket: [1, 1], relic: [2, 2], key: [1, 1] };
  G.BAG_COLS = 5;
  G.BAG_CELLS = 20;
  G.STASH_COLS = 8;
  G.BAG_ROWS = Math.ceil(G.BAG_CELLS / G.BAG_COLS);

  /* 实例挂载占格 */
  var _mkW3 = G.makeWeapon;
  G.makeWeapon = function (defId, tier) {
    var w = _mkW3.call(this, defId, tier);
    if (w) w.size = [2, 1];
    return w;
  };
  var _mkI3 = G.makeItem;
  G.makeItem = function (defId, tier) {
    var it = _mkI3.call(this, defId, tier);
    if (it) it.size = G.ITEM_SIZE[it.type] || [1, 1];
    return it;
  };

  /* 首次适配打包：返回 [{inst,x,y,w,h}] 或 null（放不下） */
  G.packItems = function (items, cols, rows) {
    var grid = [], placed = [], i, x, y, xx, yy, ok;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      var w = (it.size && it.size[0]) || ((G.ITEM_SIZE[it.type] || [1, 1])[0]);
      var h = (it.size && it.size[1]) || ((G.ITEM_SIZE[it.type] || [1, 1])[1]);
      var found = false;
      for (y = 0; y <= rows - h && !found; y++) {
        for (x = 0; x <= cols - w && !found; x++) {
          ok = true;
          for (yy = 0; yy < h && ok; yy++) {
            for (xx = 0; xx < w && ok; xx++) {
              if (grid[(y + yy) * cols + (x + xx)]) ok = false;
            }
          }
          if (ok) {
            for (yy = 0; yy < h; yy++) {
              for (xx = 0; xx < w; xx++) grid[(y + yy) * cols + (x + xx)] = 1;
            }
            placed.push({ inst: it, x: x, y: y, w: w, h: h });
            found = true;
          }
        }
      }
      if (!found) return null;
    }
    return placed;
  };

  G.invCells = function (items) {
    var n = 0;
    for (var i = 0; i < items.length; i++) {
      var s = items[i].size || G.ITEM_SIZE[items[i].type] || [1, 1];
      n += s[0] * s[1];
    }
    return n;
  };

  /* 入包：按格数检查容量 */
  var _abi2 = G.addBagItem;
  G.addBagItem = function (inst) {
    var g = G.game;
    if (!g || !g.bag) return false;
    if (inst && !inst.size) inst.size = G.ITEM_SIZE[inst.type] || [1, 1];
    if (!G.packItems(g.bag.concat([inst]), G.BAG_COLS, G.BAG_ROWS)) return false;
    g.bag.push(inst);
    return true;
  };

  /* ---------------- 背包渲染（占格版） ---------------- */
  G.UI.renderBag = function () {
    var g = G.game, p = g.player;
    var grid = $('bagGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var i;
    var used = {};
    var slotNames = { w1: '武器①', w2: '武器②', armor: '防具', trinket1: '饰品①', trinket2: '饰品②', relic: '遗物' };

    /* 装备栏行（紧凑，不占格） */
    var eqRow = G.el('div', 'bag-equip-row');
    G.Meta.SLOT_ORDER.forEach(function (slot) {
      var t = G.Meta.slotType(slot);
      var inst = null;
      if (t === 'weapon') {
        var wi = slot === 'w1' ? 0 : 1;
        if (p.weapons[wi]) inst = { uid: p.weapons[wi].uid, defId: p.weapons[wi].defId, def: p.weapons[wi].def, tier: p.weapons[wi].tier, type: 'weapon' };
      } else {
        for (i = 0; i < p.items.length; i++) {
          if (G.itemType(p.items[i]) === t && !used[i]) {
            inst = { uid: p.items[i].id, defId: p.items[i].id, def: p.items[i], tier: G.clamp(p.items[i].r, 0, 4), type: t };
            used[i] = true;
            break;
          }
        }
      }
      var cell = G.el('div', 'bag-cell equip-slot');
      if (inst) {
        cell.style.borderColor = inst.tier === 0 ? '#333a52' : G.rarityColor(inst.tier);
        cell.appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 3) : G.itemIcon(inst.def, 3)));
        cell.title = slotNames[slot] + '：' + inst.def.name;
        cell.addEventListener('click', function () { G.UI.bagUnequip(slot, inst); });
      } else {
        cell.classList.add('empty');
        cell.title = slotNames[slot];
      }
      eqRow.appendChild(cell);
    });
    grid.appendChild(eqRow);

    /* 背包占格网格 */
    var placed = G.packItems(g.bag, G.BAG_COLS, G.BAG_ROWS) || [];
    var bagWrap = G.el('div', 'bag-pack');
    bagWrap.style.gridTemplateColumns = 'repeat(' + G.BAG_COLS + ', 1fr)';
    var total = G.BAG_COLS * G.BAG_ROWS;
    for (i = 0; i < total; i++) bagWrap.appendChild(G.el('div', 'bag-slot'));
    placed.forEach(function (pl, idx) {
      var inst = pl.inst;
      var cell = G.el('div', 'bag-cell bag-packed');
      cell.style.gridColumn = (pl.x + 1) + ' / span ' + pl.w;
      cell.style.gridRow = (pl.y + 1) + ' / span ' + pl.h;
      cell.style.borderColor = inst.tier === 0 ? '#333a52' : G.rarityColor(inst.tier);
      cell.appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, pl.w > 1 ? 3 : 2.5) : G.itemIcon(inst.def, pl.w > 1 ? 3 : 2.5)));
      cell.addEventListener('mouseenter', function (e) {
        G.UI.showTip(inst.type === 'weapon' ? G.UI.weaponTip(inst.def, inst.tier) : G.UI.itemTip(inst.def), e.clientX, e.clientY);
      });
      cell.addEventListener('mousemove', function (e) {
        G.UI.showTip(inst.type === 'weapon' ? G.UI.weaponTip(inst.def, inst.tier) : G.UI.itemTip(inst.def), e.clientX, e.clientY);
      });
      cell.addEventListener('mouseleave', G.UI.hideTip);
      cell.addEventListener('click', function () { G.UI.bagEquip(inst); });
      bagWrap.appendChild(cell);
    });
    grid.appendChild(bagWrap);
  };

  /* 卸下装备：占格入包 */
  G.UI.bagUnequip = function (slot, inst) {
    var g = G.game, p = g.player, t = G.Meta.slotType(slot);
    if (t === 'weapon') {
      var idx = slot === 'w1' ? 0 : 1;
      if (!p.weapons[idx]) return;
      var old = p.weapons[idx];
      var back = G.makeWeapon(old.defId, old.tier);
      if (!G.addBagItem(back)) { G.UI.flashText(null, '背包放不下这件装备'); return; }
      p.removeWeapon(idx);
      G.Audio.sfx('back');
    } else {
      for (var i = 0; i < p.items.length; i++) {
        if (G.itemType(p.items[i]) === t) {
          var def = p.items[i];
          var back2 = G.makeItem(def.id, G.clamp(def.r, 0, 4));
          if (!G.addBagItem(back2)) { G.UI.flashText(null, '背包放不下这件装备'); return; }
          p.removeItem(i);
          G.Audio.sfx('back');
          break;
        }
      }
    }
    G.UI.renderBag();
  };

  /* 装备背包物品（占格交换） */
  G.UI.bagEquip = function (inst) {
    var g = G.game, p = g.player;
    var t = inst.type;
    if (t === 'weapon') {
      if (p.weapons.length >= p.maxWeapons) {
        var old = p.weapons[0];
        var back = G.makeWeapon(old.defId, old.tier);
        if (!G.addBagItem(back)) { G.UI.flashText(null, '背包放不下换下的武器'); return; }
        p.removeWeapon(0);
      }
      p.addWeapon(G.makeWeapon(inst.defId, inst.tier));
      removeFromBag(inst);
      G.Audio.sfx('buy');
    } else {
      for (var i = 0; i < p.items.length; i++) {
        if (G.itemType(p.items[i]) === t) {
          var def = p.items[i];
          var back2 = G.makeItem(def.id, G.clamp(def.r, 0, 4));
          if (!G.addBagItem(back2)) { G.UI.flashText(null, '背包放不下换下的装备'); return; }
          p.removeItem(i);
          break;
        }
      }
      p.addItem(inst.def);
      removeFromBag(inst);
      G.Audio.sfx('buy');
    }
    G.UI.renderBag();
    G.UI.updateHud(g);
  };

  function removeFromBag(inst) {
    var g = G.game;
    for (var i = 0; i < g.bag.length; i++) {
      if (g.bag[i] === inst) { g.bag.splice(i, 1); return; }
    }
  }

  /* ---------------- 仓库渲染（占格版） ---------------- */
  G.UI.renderBase = function () {
    var meta = G.Meta.get();
    $('baseCurrency').textContent = meta.currency;
    var cells = G.invCells(meta.stash);
    $('baseStashCount').textContent = cells + ' / ' + meta.stashSize + ' 格 · ' + meta.stash.length + ' 件';
    var eb = $('equipGrid');
    eb.innerHTML = '';
    G.Meta.SLOT_ORDER.forEach(function (slot) {
      var inst = meta.loadout[slot];
      var cell = G.el('div', 'inv-cell equip-cell');
      var label = G.el('div', 'equip-label', SLOT_LABEL2[slot]);
      cell.appendChild(label);
      if (inst) {
        cell.style.borderColor = inst.tier === 0 ? '#333a52' : G.rarityColor(inst.tier);
        cell.appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 3) : G.itemIcon(inst.def, 3)));
        cell.appendChild(G.el('div', 'equip-name', inst.def.name));
        cell.addEventListener('mouseenter', function (e) {
          G.UI.showTip(inst.type === 'weapon' ? G.UI.weaponTip(inst.def, inst.tier) : G.UI.itemTip(inst.def), e.clientX, e.clientY);
        });
        cell.addEventListener('mouseleave', G.UI.hideTip);
        cell.addEventListener('click', function () {
          if (G.Meta.stashFull()) { G.UI.flashText(null, '仓库已满，无法卸下'); return; }
          G.Meta.setLoadout(slot, null);
          G.Meta.addToStash(inst);
          G.Audio.sfx('back');
          G.UI.renderBase();
        });
      } else {
        cell.classList.add('empty');
      }
      eb.appendChild(cell);
    });

    /* 仓库占格网格 */
    var sg = $('stashGrid');
    sg.innerHTML = '';
    var rows = Math.max(3, Math.ceil(meta.stashSize / G.STASH_COLS));
    sg.style.gridTemplateColumns = 'repeat(' + G.STASH_COLS + ', 1fr)';
    var placed = G.packItems(meta.stash, G.STASH_COLS, rows) || [];
    var total = G.STASH_COLS * rows;
    for (var i = 0; i < total; i++) sg.appendChild(G.el('div', 'bag-slot'));
    placed.forEach(function (pl) {
      var inst = pl.inst;
      var cell = G.el('div', 'inv-cell stash-cell bag-packed');
      cell.style.gridColumn = (pl.x + 1) + ' / span ' + pl.w;
      cell.style.gridRow = (pl.y + 1) + ' / span ' + pl.h;
      cell.style.borderColor = inst.tier === 0 ? '#333a52' : G.rarityColor(inst.tier);
      cell.appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 3) : G.itemIcon(inst.def, 3)));
      var sell = G.el('div', 'stash-sell', '售 ' + G.itemWorth(inst));
      cell.appendChild(sell);
      cell.addEventListener('mouseenter', function (e) {
        G.UI.showTip(inst.type === 'weapon' ? G.UI.weaponTip(inst.def, inst.tier) : G.UI.itemTip(inst.def), e.clientX, e.clientY);
      });
      cell.addEventListener('mouseleave', G.UI.hideTip);
      cell.addEventListener('click', function () {
        var t = inst.type;
        var slot = null;
        if (t === 'weapon') {
          slot = meta.loadout.w1 ? (meta.loadout.w2 ? null : 'w2') : 'w1';
        } else {
          for (var s = 0; s < G.Meta.SLOT_ORDER.length; s++) {
            var sl = G.Meta.SLOT_ORDER[s];
            if (G.Meta.slotType(sl) === t && !meta.loadout[sl]) { slot = sl; break; }
          }
        }
        if (!slot) { G.UI.flashText(null, '对应栏位已满（点「售」出售）'); return; }
        G.Meta.setLoadout(slot, inst);
        G.Meta.removeFromStash(inst.uid);
        G.Audio.sfx('buy');
        G.UI.renderBase();
      });
      sell.addEventListener('click', function (e) {
        e.stopPropagation();
        G.Meta.removeFromStash(inst.uid);
        G.Meta.addCurrency(G.itemWorth(inst));
        G.Audio.sfx('select');
        G.UI.renderBase();
      });
      sg.appendChild(cell);
    });
    var expand = $('btnBaseExpand');
    if (expand) expand.textContent = '扩容仓库 +10 格 · ' + G.Meta.expandCost();
  };

  var SLOT_LABEL2 = { w1: '武器①', w2: '武器②', armor: '防具', trinket1: '饰品①', trinket2: '饰品②', relic: '遗物' };

  /* HUD 背包计数按格 */
  var _uh2 = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh2.call(this, g);
    var bc = $('bagCount');
    if (bc && g.bag) bc.textContent = G.invCells(g.bag) + ' / ' + G.BAG_CELLS + ' 格';
  };

  /* ---------------- 仓库容量按格计算（替换 13_meta 的计数语义） ---------------- */
  G.Meta.stashFull = function () {
    var d = G.Meta.get();
    return G.invCells(d.stash) >= d.stashSize;
  };
  G.Meta.stashFree = function () {
    var d = G.Meta.get();
    return Math.max(0, d.stashSize - G.invCells(d.stash));
  };
  var _addToStash = G.Meta.addToStash;
  G.Meta.addToStash = function (inst) {
    var d = G.Meta.get();
    if (!inst || G.invCells(d.stash.concat([inst])) > d.stashSize) return false;
    return _addToStash.call(G.Meta, inst);
  };

  /* 市场购买：按格检查，防止大件放不下时物品丢失 */
  var _buy = G.Market.buy;
  G.Market.buy = function (idx) {
    var o = this.offers[idx];
    if (!o) return { ok: false, msg: '无此商品' };
    var inst = this.instance(o);
    var cost = G.itemCost(inst);
    if (!G.Meta.spend(cost)) return { ok: false, msg: '深渊币不足' };
    if (!G.Meta.addToStash(inst)) {
      G.Meta.addCurrency(Math.round(cost * 0.5));
      return { ok: false, msg: '仓库空间不足' };
    }
    return { ok: true, cost: cost };
  };

  /* 旧档/水合实例补齐占格 */
  function normalizeSize(inst) {
    if (inst && !inst.size) inst.size = G.ITEM_SIZE[inst.type] || [1, 1];
  }
  (function () {
    var d = G.Meta.get();
    d.stash.forEach(normalizeSize);
    var lo = d.loadout || {};
    for (var k in lo) normalizeSize(lo[k]);
    G.Meta.flush();
  })();

})();
