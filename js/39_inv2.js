/* ============================================================
   39_inv2.js —— 背包/仓库深度优化：拖拽摆放 + 质感网格
   - 物品持有格子坐标 ix/iy（背包随战局存档，仓库跨会话保存）
   - 拖拽移动 / 同尺寸交换 / 无效落点回弹
   - 一键整理（类型→品质排序 + 自动打包）
   - 容量条 / 稀有度磁贴 / 落点高亮
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  G.Inv2 = {
    bagCols: G.BAG_COLS || 5,
    bagRows: G.BAG_ROWS || 4,
    stashCols: G.STASH_COLS || 8,
    cell: { bag: 44, stash: 52 },
    gap: 5,
    cellsFor: function (where) { return where === 'bag' ? this.bagCols * this.bagRows : G.Meta.get().stashSize; },
    rowsFor: function (where) {
      return where === 'bag' ? this.bagRows : Math.max(3, Math.ceil(G.Meta.get().stashSize / this.stashCols));
    },
    colsFor: function (where) { return where === 'bag' ? this.bagCols : this.stashCols; },
    cellFor: function (where) { return this.cell[where]; },
    adapt: function () {
      var vw = window.innerWidth || 1200;
      /* 背包固定 7×3=21 格（G.BAG_COLS/BAG_ROWS/BAG_CELLS 为唯一事实源），
         窄屏只缩小格子视觉尺寸，绝不再改列数——否则放置边界与容量显示会脱节。 */
      var sCols = 8, sCell = 52, bCell = 58;
      if (vw < 640) { sCols = 6; sCell = 46; bCell = 54; }
      else if (vw < 820) { sCols = 7; sCell = 48; bCell = 56; }
      var changed = this.stashCols !== sCols || this.cell.stash !== sCell || this.cell.bag !== bCell;
      this.stashCols = sCols;
      this.cell.stash = sCell;
      this.cell.bag = bCell;
      return changed;
    }
  };

  /* ---------- 几何 ---------- */
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }
  G.invOverlap = rectsOverlap;

  G.invCanPlace = function (items, cols, rows, ix, iy, w, h, exclude) {
    if (ix < 0 || iy < 0 || ix + w > cols || iy + h > rows) return false;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it === exclude || it.ix == null || it.iy == null) continue;
      var s = it.size || [1, 1];
      if (rectsOverlap(ix, iy, w, h, it.ix, it.iy, s[0], s[1])) return false;
    }
    return true;
  };

  G.invAutoPlace = function (items, cols, rows, inst) {
    var w = (inst.size && inst.size[0]) || 1;
    var h = (inst.size && inst.size[1]) || 1;
    for (var y = 0; y <= rows - h; y++) {
      for (var x = 0; x <= cols - w; x++) {
        if (G.invCanPlace(items, cols, rows, x, y, w, h, inst)) {
          inst.ix = x; inst.iy = y;
          return true;
        }
      }
    }
    return false;
  };

  /* 修正布局：越界/重叠的物品自动重排 */
  G.invFixLayout = function (items, cols, rows) {
    var i;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      var s = it.size || [1, 1];
      if (it.ix == null || it.iy == null ||
          !G.invCanPlace(items, cols, rows, it.ix, it.iy, s[0], s[1], it)) {
        it.ix = undefined; it.iy = undefined;
        G.invAutoPlace(items, cols, rows, it);
      }
    }
  };

  /* 尝试移动；支持与单件同尺寸物品交换 */
  G.invTryMove = function (items, cols, rows, inst, tx, ty) {
    var w = (inst.size && inst.size[0]) || 1;
    var h = (inst.size && inst.size[1]) || 1;
    if (G.invCanPlace(items, cols, rows, tx, ty, w, h, inst)) {
      inst.ix = tx; inst.iy = ty;
      return { ok: true, swap: false };
    }
    var ox = inst.ix, oy = inst.iy;
    var hit = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it === inst || it.ix == null) continue;
      var s = it.size || [1, 1];
      if (rectsOverlap(tx, ty, w, h, it.ix, it.iy, s[0], s[1])) { hit = it; break; }
    }
    if (hit) {
      var hs = hit.size || [1, 1];
      if (hs[0] === w && hs[1] === h &&
          G.invCanPlace(items, cols, rows, ox, oy, w, h, hit)) {
        hit.ix = ox; hit.iy = oy;
        inst.ix = tx; inst.iy = ty;
        return { ok: true, swap: true };
      }
    }
    return { ok: false };
  };

  /* 一键整理：类型→品质排序后顺序打包 */
  G.invSort = function (items) {
    var rank = { weapon: 0, armor: 1, trinket: 2, relic: 3 };
    items.sort(function (a, b) {
      var ra = rank[a.type] != null ? rank[a.type] : 9;
      var rb = rank[b.type] != null ? rank[b.type] : 9;
      if (ra !== rb) return ra - rb;
      if (b.tier !== a.tier) return b.tier - a.tier;
      return (a.def && a.def.name || '').localeCompare(b.def && b.def.name || '');
    });
    items.forEach(function (it) { it.ix = undefined; it.iy = undefined; });
  };
  G.invPackAll = function (items, cols, rows) {
    items.forEach(function (it) {
      if (it.ix == null) G.invAutoPlace(items, cols, rows, it);
    });
    G.invFixLayout(items, cols, rows);
  };

  /* ---------- 持久化：仓库布局跨会话（按序匹配恢复） ---------- */
  (function restoreStashLayout() {
    try {
      if (typeof localStorage === 'undefined') return;
      var raw = localStorage.getItem('abyss_hunter_meta_v1');
      if (!raw) return;
      var d = JSON.parse(raw);
      if (!Array.isArray(d.stash)) return;
      var st = G.Meta.stash();
      var j = 0;
      for (var i = 0; i < d.stash.length && j < st.length; i++) {
        var r = d.stash[i];
        if (!r || !r.defId) continue;
        if (st[j].defId !== r.defId || st[j].tier !== r.tier) continue;
        if (r.ix != null && r.iy != null) { st[j].ix = r.ix; st[j].iy = r.iy; }
        j++;
      }
    } catch (e) { /* 忽略 */ }
  })();

  /* 背包战局存档：坐标随物品数据 */
  var _id3 = G.itemData;
  G.itemData = function (inst) {
    var d = _id3.call(this, inst);
    if (inst.ix != null) d.ix = inst.ix;
    if (inst.iy != null) d.iy = inst.iy;
    return d;
  };
  var _ifd3 = G.itemFromData;
  G.itemFromData = function (d) {
    var inst = _ifd3.call(this, d);
    if (inst && d && d.ix != null && d.iy != null) { inst.ix = d.ix; inst.iy = d.iy; }
    return inst;
  };

  /* 新增物品自动落位 */
  var _abi4 = G.addBagItem;
  G.addBagItem = function (inst) {
    var g = G.game;
    var ok = _abi4.call(this, inst);
    if (ok && g && g.bag) G.invAutoPlace(g.bag, G.Inv2.bagCols, G.Inv2.bagRows, inst);
    return ok;
  };
  var _ats2 = G.Meta.addToStash;
  G.Meta.addToStash = function (inst) {
    var ok = _ats2.call(this, inst);
    if (ok) {
      var rows = G.Inv2.rowsFor('stash');
      G.invAutoPlace(G.Meta.stash(), G.Inv2.stashCols, rows, inst);
      G.Meta.flush();
    }
    return ok;
  };

  /* ---------- 渲染：背包（装备行 + 拖拽网格） ---------- */
  var SLOTS = [
    { s: 'w1', t: 'weapon', name: '武器①' },
    { s: 'w2', t: 'weapon', name: '武器②' },
    { s: 'armor', t: 'armor', name: '防具' },
    { s: 'trinket1', t: 'trinket', name: '饰品①' },
    { s: 'trinket2', t: 'trinket', name: '饰品②' },
    { s: 'relic', t: 'relic', name: '遗物' }
  ];

  function rarityCol(tier) { return tier === 0 ? '#d9dde8' : G.rarityColor(tier); }

  function tileEl(inst, cls, sizeMul) {
    var cell = G.el('div', 'inv2-tile ' + (cls || '') + ' r' + inst.tier);
    cell.style.setProperty('--rc', rarityCol(inst.tier));
    var icon = inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 3) : G.itemIcon(inst.def, 3);
    if (icon) cell.appendChild(G.PX.node(icon));
    return cell;
  }

  G.UI.renderBag = function () {
    G.Inv2.adapt();
    var g = G.game, p = g.player;
    var grid = $('bagGrid');
    if (!grid) return;
    grid.innerHTML = '';

    /* 装备行 */
    var eqRow = G.el('div', 'inv2-equip');
    SLOTS.forEach(function (slot) {
      var inst = G.itemAtSlot ? G.itemAtSlot(p, slot.s) : null;
      var cell = G.el('div', 'inv2-slot' + (inst ? '' : ' empty'));
      cell.title = slot.name;
      if (inst) {
        cell.style.setProperty('--rc', rarityCol(inst.tier));
        cell.appendChild(tileEl(inst, 'equipped'));
        bindTip(cell, inst);
        cell.addEventListener('click', function () { G.UI.bagUnequip(slot.s, inst); });
      } else {
        cell.appendChild(G.el('span', 'inv2-slot-name', slot.name));
      }
      eqRow.appendChild(cell);
    });
    grid.appendChild(eqRow);

    /* 容量条 */
    var cells = G.invCells(g.bag);
    var bar = G.el('div', 'inv2-cap');
    var fill = G.el('div', 'inv2-cap-fill');
    fill.style.width = Math.min(100, cells / G.BAG_CELLS * 100) + '%';
    fill.style.background = cells > G.BAG_CELLS * 0.85 ? '#ff6b6b' : '#6ee787';
    bar.appendChild(fill);
    bar.appendChild(G.el('span', 'inv2-cap-txt', cells + ' / ' + G.BAG_CELLS + ' 格'));
    var head = G.el('div', 'inv2-grid-head');
    var btn = G.el('button', 'btn btn-sm', '整理');
    btn.addEventListener('click', function () {
      G.invSort(g.bag);
      G.invPackAll(g.bag, G.Inv2.bagCols, G.Inv2.bagRows);
      G.Audio.sfx('select');
      G.UI.renderBag();
    });
    head.appendChild(bar);
    head.appendChild(btn);
    grid.appendChild(head);

    /* 背包网格 */
    var wrap = G.el('div', 'inv2-grid');
    wrap.style.gridTemplateColumns = 'repeat(' + G.Inv2.bagCols + ', ' + G.Inv2.cell.bag + 'px)';
    G.invFixLayout(g.bag, G.Inv2.bagCols, G.Inv2.bagRows);
    var total = G.Inv2.bagCols * G.Inv2.bagRows;
    for (var i2 = 0; i2 < total; i2++) {
      var s = G.el('div', 'inv2-cell');
      s.dataset.c = (i2 % G.Inv2.bagCols);
      s.dataset.r = Math.floor(i2 / G.Inv2.bagCols);
      wrap.appendChild(s);
    }
    g.bag.forEach(function (inst) {
      var tile = tileEl(inst, 'draggable');
      tile.style.gridColumn = (inst.ix + 1) + ' / span ' + (inst.size[0]);
      tile.style.gridRow = (inst.iy + 1) + ' / span ' + (inst.size[1]);
      var drop = G.el('div', 'stash-sell bag-drop', '丢');
      drop.title = '丢在地上';
      drop.addEventListener('click', function (e) {
        e.stopPropagation();
        var g = G.game;
        var idx = g.bag.indexOf(inst);
        if (idx < 0) return;
        g.bag.splice(idx, 1);
        G.dropItemGround(inst);
        G.Audio.sfx('back');
        G.UI.renderBag();
      });
      tile.appendChild(drop);
      bindDrag(tile, inst, g.bag, wrap, 'bag', function () { G.UI.renderBag(); });
      bindTip(tile, inst);
      tile.addEventListener('click', function () { G.UI.bagEquip(inst); });
      wrap.appendChild(tile);
    });
    grid.appendChild(wrap);
    var count = $('bagCount');
    if (count) count.textContent = cells + ' / ' + G.BAG_CELLS + ' 格';
  };

  /* ---------- 渲染：仓库（拖拽 + 装备/出售） ---------- */
  G.UI.renderBase = function () {
    G.Inv2.adapt();
    var meta = G.Meta.get();
    var cur = $('baseCurrency');
    if (cur) cur.textContent = meta.currency;
    var cells = G.invCells(meta.stash);
    var count = $('baseStashCount');
    if (count) count.textContent = cells + ' / ' + meta.stashSize + ' 格 · ' + meta.stash.length + ' 件';

    /* 装备栏 */
    var eb = $('equipGrid');
    eb.innerHTML = '';
    SLOTS.forEach(function (slot) {
      var inst = meta.loadout[slot.s];
      var cell = G.el('div', 'inv2-slot equip-cell' + (inst ? '' : ' empty'));
      if (inst) {
        cell.style.setProperty('--rc', rarityCol(inst.tier));
        cell.appendChild(tileEl(inst, 'equipped'));
        bindTip(cell, inst);
        cell.addEventListener('click', function () {
          if (G.Meta.stashFull()) { G.UI.flashText(null, '仓库已满，无法卸下'); return; }
          G.Meta.setLoadout(slot.s, null);
          G.Meta.addToStash(inst);
          G.Audio.sfx('back');
          G.UI.renderBase();
        });
      } else {
        cell.appendChild(G.el('span', 'inv2-slot-name', slot.name));
      }
      eb.appendChild(cell);
    });

    /* 容量条 */
    var barHost = $('stashCapHost');
    if (barHost) {
      barHost.innerHTML = '';
      var bar = G.el('div', 'inv2-cap');
      var fill = G.el('div', 'inv2-cap-fill');
      fill.style.width = Math.min(100, cells / meta.stashSize * 100) + '%';
      fill.style.background = cells > meta.stashSize * 0.85 ? '#ff6b6b' : '#6ee787';
      bar.appendChild(fill);
      bar.appendChild(G.el('span', 'inv2-cap-txt', cells + ' / ' + meta.stashSize + ' 格'));
      barHost.appendChild(bar);
    }

    /* 仓库网格 */
    var sg = $('stashGrid');
    sg.innerHTML = '';
    var cols = G.Inv2.stashCols;
    var rows = G.Inv2.rowsFor('stash');
    sg.style.gridTemplateColumns = 'repeat(' + cols + ', ' + G.Inv2.cell.stash + 'px)';
    G.invFixLayout(meta.stash, cols, rows);
    var total = cols * rows;
    for (var i = 0; i < total; i++) {
      var s = G.el('div', 'inv2-cell');
      s.dataset.c = (i % cols);
      s.dataset.r = Math.floor(i / cols);
      sg.appendChild(s);
    }
    meta.stash.forEach(function (inst) {
      var tile = tileEl(inst, 'draggable');
      tile.style.gridColumn = (inst.ix + 1) + ' / span ' + (inst.size[0]);
      tile.style.gridRow = (inst.iy + 1) + ' / span ' + (inst.size[1]);
      var sell = G.el('div', 'stash-sell', '售 ' + G.itemWorth(inst));
      tile.appendChild(sell);
      bindDrag(tile, inst, meta.stash, sg, 'stash', function () { G.Meta.flush(); G.UI.renderBase(); });
      bindTip(tile, inst);
      tile.addEventListener('click', function () {
        var t = inst.type;
        var slot = null;
        if (t === 'weapon') slot = meta.loadout.w1 ? (meta.loadout.w2 ? null : 'w2') : 'w1';
        else {
          for (var si = 0; si < SLOTS.length; si++) {
            if (SLOTS[si].t === t && !meta.loadout[SLOTS[si].s]) { slot = SLOTS[si].s; break; }
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
      sg.appendChild(tile);
    });
    var expand = $('btnBaseExpand');
    if (expand) expand.textContent = '扩容仓库 +10 格 · ' + G.Meta.expandCost();

    var sortBtn = $('btnBaseSort');
    if (sortBtn) {
      sortBtn.addEventListener('click', function () {
        G.invSort(meta.stash);
        G.invPackAll(meta.stash, cols, rows);
        G.Meta.flush();
        G.Audio.sfx('select');
        G.UI.renderBase();
      });
    }
  };

  /* ---------- 拖拽 ---------- */
  function bindDrag(tile, inst, items, gridEl, where, onCommit) {
    var startX = 0, startY = 0, dragging = false, ghost = null;
    tile.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      startX = e.clientX; startY = e.clientY;
      dragging = false;
      var onMove = function (ev) {
        if (!dragging) {
          if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 6) return;
          dragging = true;
          tile.classList.add('drag-source');
          ghost = tile.cloneNode(true);
          ghost.className = 'inv2-ghost';
          ghost.style.width = tile.offsetWidth + 'px';
          ghost.style.height = tile.offsetHeight + 'px';
          document.body.appendChild(ghost);
          gridEl.classList.add('dragging');
        }
        ghost.style.left = (ev.clientX - ghost.offsetWidth / 2) + 'px';
        ghost.style.top = (ev.clientY - ghost.offsetHeight / 2) + 'px';
        highlightDrop(ev.clientX, ev.clientY, inst, gridEl, where);
      };
      var onUp = function (ev) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (!dragging) return;   // 视为点击
        var cell = cellAt(ev.clientX, ev.clientY, gridEl, where);
        var cols = G.Inv2.colsFor(where);
        var rows = G.Inv2.rowsFor(where);
        var r = G.invTryMove(items, cols, rows, inst, cell.c, cell.r);
        clearDrop(gridEl);
        if (r.ok) {
          G.Audio.sfx(r.swap ? 'reroll' : 'select');
        } else {
          G.Audio.sfx('back');
          tile.classList.add('shake');
          setTimeout(function () { tile.classList.remove('shake'); }, 260);
        }
        if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
        ghost = null;
        tile.classList.remove('drag-source');
        gridEl.classList.remove('dragging');
        onCommit();
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  function cellAt(px, py, gridEl, where) {
    var rect = gridEl.getBoundingClientRect();
    var cell = G.Inv2.cellFor(where) + G.Inv2.gap;
    var c = Math.floor((px - rect.left) / cell);
    var r = Math.floor((py - rect.top) / cell);
    return { c: c, r: r };
  }

  function highlightDrop(px, py, inst, gridEl, where) {
    var cols = G.Inv2.colsFor(where);
    var rows = G.Inv2.rowsFor(where);
    var cell = cellAt(px, py, gridEl, where);
    var w = (inst.size && inst.size[0]) || 1;
    var h = (inst.size && inst.size[1]) || 1;
    var ok = G.invCanPlace(where === 'stash' ? G.Meta.stash() : G.game.bag, cols, rows, cell.c, cell.r, w, h, inst);
    var cells = gridEl.querySelectorAll('.inv2-cell');
    cells.forEach(function (s) {
      var cc = +s.dataset.c, rr = +s.dataset.r;
      var inFoot = cc >= cell.c && cc < cell.c + w && rr >= cell.r && rr < cell.r + h;
      if (inFoot) {
        s.classList.remove('drop-ok', 'drop-bad');
        s.classList.add(ok ? 'drop-ok' : 'drop-bad');
      } else {
        s.classList.remove('drop-ok', 'drop-bad');
      }
    });
  }

  function clearDrop(gridEl) {
    var cells = gridEl.querySelectorAll('.inv2-cell');
    cells.forEach(function (s) { s.classList.remove('drop-ok', 'drop-bad'); });
  }

  function bindTip(node, inst) {
    node.addEventListener('mouseenter', function (e) {
      if (node.classList.contains('drag-source')) return;
      G.UI.showTip(inst.type === 'weapon' ? G.UI.weaponTip(inst.def, inst.tier) : G.UI.itemTip(inst.def), e.clientX, e.clientY);
    });
    node.addEventListener('mousemove', function (e) {
      if (node.classList.contains('drag-source')) return;
      G.UI.showTip(inst.type === 'weapon' ? G.UI.weaponTip(inst.def, inst.tier) : G.UI.itemTip(inst.def), e.clientX, e.clientY);
    });
    node.addEventListener('mouseleave', G.UI.hideTip);
  }

  /* HUD 背包计数按格（覆盖 33） */
  var _uh3 = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh3.call(this, g);
    var bc = $('bagCount');
    if (bc && g.bag) bc.textContent = G.invCells(g.bag) + ' / ' + G.BAG_CELLS + ' 格';
  };

})();
