/* ============================================================
   35_flow.js —— 撤离抉择（撤离 / 继续深入下一层）+ 市场重做
   - 撤离点开放后，站入按 E 弹出抉择：结算带出 或 深入下一层
   - 深入保留装备/背包/材料/强化/钥匙，进入更高档新图，奖励伤害+8%
   - 市场：分类页签 + 稀有度光柱卡片 + 一键出售白色
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* ---------------- 撤离点：不再自动结算，改为抉择 ---------------- */
  G.Extract.update = function (dt) {
    var g = G.game, ex = g.map && g.map.extract;
    if (!ex || !ex.active || !g.player || g.player.dead) return;
    ex.near = G.dist(g.player.x, g.player.y, ex.x, ex.y) < 96;
  };

  var _try = G.game.tryInteract;
  G.game.tryInteract = function () {
    var p = this.player;
    var ex = this.map && this.map.extract;
    if (ex && ex.active && G.dist(p.x, p.y, ex.x, ex.y) < 100) {
      G.UI.openFlow(this);
      return;
    }
    return _try.call(this);
  };

  /* ---------------- 抉择面板 ---------------- */
  function flowPanel() {
    var e = $('flowPanel');
    if (e) return e;
    e = document.createElement('div');
    e.id = 'flowPanel';
    e.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(4,6,12,.78);z-index:82;';
    var box = document.createElement('div');
    box.id = 'flowBox';
    box.style.cssText = 'background:linear-gradient(180deg,#181c2c,#101320);border:2px solid #6ee787;border-radius:14px;padding:26px 34px;max-width:720px;width:94%;box-shadow:0 0 70px #6ee78733;text-align:center;';
    e.appendChild(box);
    document.body.appendChild(e);
    return e;
  }

  G.UI.openFlow = function (g) {
    var e = flowPanel();
    var box = $('flowBox');
    box.innerHTML = '';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:24px;font-weight:900;letter-spacing:6px;color:#bfffd8;margin-bottom:4px;';
    title.textContent = '抉择时刻';
    box.appendChild(title);
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:12px;color:#8a90a8;margin-bottom:18px;';
    sub.textContent = '活着回去，还是继续向下？';
    box.appendChild(sub);
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:14px;justify-content:center;flex-wrap:wrap;';

    /* 撤离 */
    var card = document.createElement('div');
    card.style.cssText = 'flex:1;min-width:230px;border:1px solid #6ee78788;border-radius:12px;padding:18px 14px;cursor:pointer;background:rgba(16,24,20,.65);transition:transform .12s,border-color .12s;';
    card.appendChild(makeLine('✚ 撤离', '#6ee787', 20));
    card.appendChild(makeLine('结算本层：装备/背包/材料全部带出', '#aab', 12));
    card.appendChild(makeLine('材料 1:1 折现 · 首通奖励', '#8a90a8', 11));
    card.addEventListener('click', function () { G.UI.closeFlow(); g.extractNow(); });
    row.appendChild(card);

    /* 深入 */
    var nextTier = G.TIER_MAP[g.map.tierId + 1];
    var card2 = document.createElement('div');
    card2.style.cssText = 'flex:1;min-width:230px;border:1px solid #c07fff88;border-radius:12px;padding:18px 14px;cursor:pointer;background:rgba(24,16,32,.65);transition:transform .12s,border-color .12s;';
    card2.appendChild(makeLine('▼ 继续深入', '#c07fff', 20));
    card2.appendChild(makeLine(nextTier ? ('进入 ' + nextTier.name + '（第 ' + nextTier.id + ' 层）') : '已至最深处', '#aab', 12));
    card2.appendChild(makeLine('保留装备/战利品/材料/钥匙 · 伤害 +8% · 回血 30%', '#8a90a8', 11));
    if (!nextTier) card2.style.opacity = '.45';
    else card2.addEventListener('click', function () { G.UI.closeFlow(); g.descend(); });
    row.appendChild(card2);
    box.appendChild(row);
    var close = document.createElement('div');
    close.style.cssText = 'margin-top:16px;font-size:11px;color:#6a7088;cursor:pointer;';
    close.textContent = '按 ESC 离开（继续探索本层）';
    close.addEventListener('click', function () { G.UI.closeFlow(); });
    box.appendChild(close);
    e.style.display = 'flex';
    G.UI._flowOpen = true;
    G.Audio.sfx('extract_ready');
  };

  G.UI.closeFlow = function () {
    var e = $('flowPanel');
    if (e) e.style.display = 'none';
    G.UI._flowOpen = false;
  };

  function makeLine(txt, col, size) {
    var d = document.createElement('div');
    d.style.cssText = 'margin:6px 0;font-size:' + size + 'px;color:' + col + ';font-weight:700;';
    d.textContent = txt;
    return d;
  }

  /* ESC 关闭抉择（比暂停优先） */
  var _tp = G.game.togglePause;
  G.game.togglePause = function () {
    if (G.UI._flowOpen) { G.UI.closeFlow(); return; }
    return _tp.call(this);
  };

  /* 撤离：短引导动画后结算 */
  G.game.extractNow = function () {
    var g = this, ex = this.map.extract;
    ex.channel = 0;
    ex.chOn = true;
    G.Audio.sfx('extract_start');
    G.fx('ring', { x: ex.x, y: ex.y, r0: 10, r1: 120, col: '#6ee787', w: 6, life: 0.5 });
    this._extractTimer = setInterval(function () {
      ex.channel += 0.08;
      if (ex.channel >= 1) {
        clearInterval(g._extractTimer);
        g.onExtractSuccess();
      }
    }, 80);
  };

  /* ---------------- 继续深入下一层 ---------------- */
  G.game.descend = function () {
    var g = this, p = this.player;
    var next = g.map.tierId + 1;
    if (next > 5) return;
    var tier = G.TIER_MAP[next];

    /* 深入奖励 */
    g.depth = (g.depth || 0) + 1;
    p.char.mods.damage = (p.char.mods.damage || 0) + 8;
    p.heal(Math.round(p.st.maxHp * 0.30));
    p.recalc();

    /* 裂隙过渡 */
    G.burst(p.x, p.y, 36, '#c07fff', 300, { size: 4 });
    G.fx('ring', { x: p.x, y: p.y, r0: 8, r1: 220, col: '#c07fff', w: 7, life: 0.6 });
    G.Audio.sfx('extract_ready');

    g.map = G.Map.generate(next);
    g.arena = g.map.worldW;
    g.map.wave = g.map.tier.waveBand[1];
    g.buildWallRects();
    g.unlockedDoors = {};
    g.lastRoom = -1;
    g.levelCd = 0;
    g.portals = [];
    g.events = [];
    g.enemies = []; g.bullets = []; g.ebullets = [];
    g.pickups = []; g.particles = []; g.texts = [];
    g.effects = []; g.turrets = []; g.drones = []; g.mines = [];
    g.containers = g.map.containers.map(function (c) { return new G.Container(c); });
    g.traps = [];
    g.barrels = [];
    if (G.setupContent) G.setupContent(g);

    p.x = g.map.spawn.x; p.y = g.map.spawn.y;
    p.room = g.map.startRoom;
    g.enterRoom(g.map.startRoom);
    G.UI.banner('深入 · ' + tier.name, tier.col);
    G.UI.updateObjective(g.map);
    G.UI.updateHud(g);
    g.saveRun();
  };

  /* 存档/读档：深度 */
  var _sr = G.game.saveRun;
  G.game.saveRun = function () {
    _sr.call(this);
    var d = G.Save.getRun();
    if (d) { d.depth = this.depth || 0; G.Save.saveRun(d); }
  };
  var _rr = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    this.depth = (data && data.depth) || 0;
    return _rr.call(this, data);
  };
  var _nr = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    this.depth = 0;
    return _nr.call(this, charDef, tierId);
  };

  /* 互动标签：'E 撤离 / 深入' + 未开放提示 */
  G.game.drawInteractTag = function () {
    var p = this.player, i, target = null, label = '';
    var ex = this.map.extract;
    if (ex && ex.active && G.dist(p.x, p.y, ex.x, ex.y) < 112) {
      target = { x: ex.x, y: ex.y - 78 };
      label = 'E 撤离 / 深入';
    }
    if (!target) {
      for (i = 0; i < this.containers.length; i++) {
        var c = this.containers[i];
        if (c.opened || c.used) continue;
        if (G.dist(p.x, p.y, c.x, c.y) < 96) {
          target = { x: c.x, y: c.y - 34 };
          label = 'E ' + ((G.CONTAINER_INFO[c.type] || {}).name || '互动');
          break;
        }
      }
    }
    if (!target && this.events) {
      for (i = 0; i < this.events.length; i++) {
        var ev = this.events[i];
        if (ev.used) continue;
        if (G.dist(p.x, p.y, ev.x, ev.y) < 90) {
          target = { x: ev.x, y: ev.y - 40 };
          label = 'E 事件';
          break;
        }
      }
    }
    if (!target && this.map.lockedDoors) {
      for (i = 0; i < this.map.lockedDoors.length; i++) {
        var ld = this.map.lockedDoors[i];
        if (this.unlockedDoors && this.unlockedDoors[ld.key]) continue;
        var rc = ldRect(ld);
        var cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
        if (G.dist(p.x, p.y, cx, cy) < 96) {
          target = { x: cx, y: cy - 30 };
          label = 'E 开锁';
          break;
        }
      }
    }
    if (!target && ex && !ex.active && G.dist(p.x, p.y, ex.x, ex.y) < 130) {
      var c2 = this.ctx;
      var msg = '撤离点未开放 · ' + (G.UI._objText || '');
      c2.save();
      c2.font = 'bold 12px "Segoe UI",sans-serif';
      var w2 = c2.measureText(msg).width + 22;
      var bob = Math.sin(this.runTime * 4) * 2;
      var sx = Math.round(ex.x - this.camX), sy = Math.round(ex.y - this.camY - 78 + bob);
      c2.globalAlpha = 0.8;
      c2.fillStyle = '#0a0c12';
      c2.fillRect(sx - w2 / 2, sy - 20, w2, 24);
      c2.strokeStyle = '#5a5f72';
      c2.lineWidth = 1.5;
      c2.strokeRect(sx - w2 / 2, sy - 20, w2, 24);
      c2.globalAlpha = 1;
      c2.fillStyle = '#9aa0b0';
      c2.textAlign = 'center';
      c2.textBaseline = 'middle';
      c2.fillText(msg, sx, sy - 8);
      c2.restore();
      return;
    }
    if (!target) return;

    var c3 = this.ctx;
    var bob2 = Math.sin(this.runTime * 6) * 3;
    c3.save();
    c3.translate(Math.round(target.x - this.camX), Math.round(target.y - this.camY + bob2));
    c3.font = 'bold 12px "Segoe UI",sans-serif';
    var w3 = c3.measureText(label).width + 18;
    c3.globalAlpha = 0.78;
    c3.fillStyle = '#0a0c12';
    c3.fillRect(-w3 / 2, -19, w3, 22);
    c3.strokeStyle = '#ffd24a';
    c3.lineWidth = 1.5;
    c3.strokeRect(-w3 / 2, -19, w3, 22);
    c3.globalAlpha = 1;
    c3.fillStyle = '#ffd24a';
    c3.textAlign = 'center';
    c3.textBaseline = 'middle';
    c3.fillText(label, 0, -8);
    c3.restore();
  };

  function ldRect(ld) {
    var SEG = G.Map.SEG, W = G.Map.WALL, DOOR = G.Map.DOOR;
    if (ld.dir === 'H') {
      var rc = G.Map.roomRect(ld.c, ld.r);
      var dy = rc.y0 + G.Map.ROOM / 2;
      return { x0: (ld.c + 1) * SEG, y0: dy - DOOR / 2, x1: (ld.c + 1) * SEG + W, y1: dy + DOOR / 2 };
    }
    var rc2 = G.Map.roomRect(ld.c, ld.r);
    var dx = rc2.x0 + G.Map.ROOM / 2;
    return { x0: dx - DOOR / 2, y0: (ld.r + 1) * SEG, x1: dx + DOOR / 2, y1: (ld.r + 1) * SEG + W };
  }

  /* ---------------- 市场重做 ---------------- */
  var MKT_TABS = [
    { id: 'all', name: '全部' },
    { id: 'weapon', name: '武器' },
    { id: 'armor', name: '防具' },
    { id: 'trinket', name: '饰品' },
    { id: 'relic', name: '遗物' }
  ];
  G.UI._mktTab = G.UI._mktTab || 'all';

  G.UI.renderMarket = function () {
    var meta = G.Meta.get();
    var cur = $('marketCurrency');
    if (cur) cur.textContent = meta.currency;
    var tier = Math.max(1, meta.stats.bestTier || 1);
    if (!G.Market.offers.length) G.Market.refresh(tier, 0);
    var rcEl = $('marketRefreshCost');
    if (rcEl) rcEl.textContent = G.Market.refreshCost();

    /* 页签 */
    var tabs = $('mktTabs');
    if (tabs) {
      tabs.innerHTML = '';
      MKT_TABS.forEach(function (t) {
        var b = G.el('button', 'mkt-tab' + (G.UI._mktTab === t.id ? ' on' : ''), t.name);
        b.addEventListener('click', function () {
          G.UI._mktTab = t.id;
          G.Audio.sfx('select');
          G.UI.renderMarket();
        });
        tabs.appendChild(b);
      });
    }

    var box = $('marketCards');
    box.innerHTML = '';
    var shown = 0;
    G.Market.offers.forEach(function (o, idx) {
      var inst = G.Market.instance(o);
      if (!inst) return;
      if (G.UI._mktTab !== 'all' && inst.type !== G.UI._mktTab) return;
      shown++;
      var col = inst.tier === 0 ? '#d9dde8' : G.rarityColor(inst.tier);
      var card = G.el('div', 'mkt-card mkt-r' + inst.tier);
      card.style.setProperty('--rc', col);
      var head = G.el('div', 'mkt-head');
      var ic = G.el('div', 'mkt-icon');
      var icon = inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 5) : G.itemIcon(inst.def, 5);
      if (icon) ic.appendChild(G.PX.node(icon));
      head.appendChild(ic);
      var nm = G.el('div');
      nm.appendChild(G.el('div', 'mkt-name', inst.def.name));
      nm.appendChild(G.el('div', 'mkt-type', G.ITEM_TYPE_NAMES[inst.type] + ' · ' + G.rarityName(inst.tier)));
      head.appendChild(nm);
      card.appendChild(head);
      var body = G.el('div', 'mkt-mods');
      if (inst.type === 'weapon') {
        var tmp = { def: inst.def, tier: inst.tier };
        body.innerHTML = '<span>伤害 ' + G.fmt(G.wDamage(tmp), 1) + '</span><span>冷却 ' + G.fmt(G.wCooldown(tmp), 2) + 's</span><span>射程 ' + Math.round(inst.def.range) + '</span>';
      } else {
        var mods = inst.def.mods || {};
        var keys = Object.keys(mods).slice(0, 3);
        body.innerHTML = keys.map(function (k) { return '<span>' + G.statName(k) + ' ' + G.modText(k, mods[k]) + '</span>'; }).join('');
      }
      card.appendChild(body);
      card.appendChild(G.el('div', 'mkt-flavor', inst.type === 'weapon' ? inst.def.desc : (inst.def.fl || '')));
      var price = G.itemCost(inst);
      var buy = G.el('button', 'btn mkt-buy' + (meta.currency < price ? ' poor' : ''), '购买 · ' + price);
      buy.addEventListener('click', function () {
        var r = G.Market.buy(idx);
        if (!r.ok) { G.UI.flashText(buy, r.msg); return; }
        card.classList.add('buy-pop');
        var cr = card.getBoundingClientRect();
        G.UI.burstDom(cr.left + cr.width / 2, cr.top + cr.height / 2, col, 12);
        setTimeout(function () { G.UI.renderMarket(); }, 220);
      });
      card.appendChild(buy);
      card.addEventListener('mouseenter', function (e) {
        G.UI.showTip(inst.type === 'weapon' ? G.UI.weaponTip(inst.def, inst.tier) : G.UI.itemTip(inst.def), e.clientX, e.clientY);
      });
      card.addEventListener('mouseleave', G.UI.hideTip);
      box.appendChild(card);
    });
    if (!shown) box.appendChild(G.el('div', 'mkt-empty', '该分类暂无商品'));

    var sellAll = $('btnMktSellWhite');
    if (sellAll) {
      var whites = meta.stash.filter(function (x) { return x.tier === 0; });
      sellAll.textContent = '出售全部白色 · ' + whites.length + ' 件';
      sellAll.disabled = !whites.length;
    }
  };

  /* 一键出售白色 */
  var btnSell = $('btnMktSellWhite');
  if (btnSell) {
    btnSell.addEventListener('click', function () {
      var meta = G.Meta.get();
      var whites = meta.stash.filter(function (x) { return x.tier === 0; });
      var gain = 0;
      whites.forEach(function (x) {
        gain += G.itemWorth(x);
        G.Meta.removeFromStash(x.uid);
      });
      G.Meta.addCurrency(gain);
      G.Audio.sfx('select');
      G.UI.renderMarket();
    });
  }

})();
