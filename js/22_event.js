/* ============================================================
   22_event.js —— 探索扩展：事件房间（随机抉择）
   房间内出现事件节点，按 E 触发二选一抉择：
   祝福 / 诅咒 / 材料 / 武器 / 升级 / 治疗 / 钥匙
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* ---------------- 事件定义 ---------------- */
  function rollChoice(map, p) {
    var pool = [
      { id: 'heal', name: '深渊圣泉', icon: '✚', col: '#6ee787', desc: '恢复 50% 最大生命',
        apply: function () { p.heal(Math.round(p.st.maxHp * 0.5)); } },
      { id: 'mats', name: '材料矿脉', icon: '◆', col: '#ffd24a', desc: '获得 18~30 材料',
        apply: function () { G.game.addMaterials(G.randInt(18, 30)); } },
      { id: 'level', name: '顿悟', icon: '✦', col: '#c07fff', desc: '立即获得一次强化选择',
        apply: function () { p.pendingLevels++; } },
      { id: 'bless_dmg', name: '狂怒祝福', icon: '⚔', col: '#ff8a5a', desc: '本局伤害 +12%',
        apply: function () { p.char.mods.damage = (p.char.mods.damage || 0) + 12; p.recalc(); } },
      { id: 'bless_spd', name: '疾风祝福', icon: '≫', col: '#7fe0c0', desc: '本局移动速度 +10%',
        apply: function () { p.char.mods.speed = (p.char.mods.speed || 0) + 10; p.recalc(); } },
      { id: 'curse', name: '深渊契约', icon: '☠', col: '#ff6b6b', desc: '最大生命 -15，获得 30 材料',
        apply: function () {
          p.char.mods.maxHp = (p.char.mods.maxHp || 0) - 15;
          p.recalc();
          if (p.hp > p.st.maxHp) p.hp = p.st.maxHp;
          G.game.addMaterials(30);
        } },
      { id: 'weapon', name: '军械残骸', icon: '≋', col: '#9ad0ff', desc: '获得一把本层武器',
        apply: function () {
          var w = G.rollLootWeapon(map.tierId, p.st.luck);
          if (G.grantItemOrDrop(w, p.x, p.y)) G.UI.showLootCard(w);
        } },
      { id: 'trinket', name: '遗物祭坛', icon: '❖', col: '#ffd24a', desc: '获得一件本层物品',
        apply: function () {
          var it = G.rollLootItem(map.tierId, p.st.luck + 8);
          if (G.grantItemOrDrop(it, p.x, p.y)) G.UI.showLootCard(it);
        } },
      { id: 'key', name: '流浪者遗物', icon: '⚿', col: '#e0c860', desc: '获得 1 把深渊钥匙',
        apply: function () { G.game.depthKeys = (G.game.depthKeys || 0) + 1; } },
      { id: 'gold', name: '深渊币袋', icon: '◆', col: '#ffd24a', desc: '获得 40 深渊币（局外）',
        apply: function () { G.Meta.addCurrency(40); } },
      { id: 'armor', name: '守护石匣', icon: '⛨', col: '#7fbfe8', desc: '本局护甲 +8',
        apply: function () {
          p.char.mods.armor = (p.char.mods.armor || 0) + 8;
          p.recalc();
        } },
      { id: 'gamble', name: '双生祭坛', icon: '⚖', col: '#c0c0cc', desc: '获得 10~24 材料，或换成随机护甲',
        apply: function () {
          if (Math.random() < 0.5) G.game.addMaterials(G.randInt(10, 24));
          else { p.char.mods.armor = (p.char.mods.armor || 0) + G.randInt(1, 3); p.recalc(); }
        } }
    ];
    return G.shuffle(pool).slice(0, 2);
  }

  /* ---------------- 地图事件节点 ---------------- */
  function addEventNode(game) {
    var m = game.map;
    if (!m || m.eventRoom !== undefined) return;
    var cands = [];
    m.rooms.forEach(function (rm) {
      if (rm.type !== 'combat' || rm.idx === m.startRoom || rm.idx === m.extractRoom) return;
      if (m.dist[rm.idx] >= m.dist[m.extractRoom] * 0.45) cands.push(rm);
    });
    if (!cands.length) return;
    /* 事件房数量：第一层 1 个，深层最多 2 个（随机分布在不同战斗房） */
    var maxEv = m.tierId && m.tierId > 1 ? 2 : 1;
    var pool = G.shuffle(cands.slice());
    var n = Math.min(maxEv, pool.length);
    game.events = [];
    for (var i = 0; i < n; i++) {
      var rm = pool[i];
      rm.type = 'event';
      var rc = G.Map.roomRect(rm.c, rm.r);
      game.events.push({
        id: 'evt' + rm.idx,
        x: (rc.x0 + rc.x1) / 2 + G.rand(-60, 60),
        y: (rc.y0 + rc.y1) / 2 + G.rand(-60, 60),
        room: rm.idx, used: false
      });
    }
  }

  var _nr2 = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    this.events = [];
    var r = _nr2.call(this, charDef, tierId);
    addEventNode(this);
    return r;
  };
  var _rr2 = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    this.events = [];
    var r = _rr2.call(this, data);
    addEventNode(this);
    if (data && data.eventsUsed) {
      this.events.forEach(function (e) { if (data.eventsUsed[e.id]) e.used = true; });
    }
    return r;
  };
  var _sr2 = G.game.saveRun;
  G.game.saveRun = function () {
    _sr2.call(this);
    var d = G.Save.getRun();
    if (d) {
      var used = {};
      (this.events || []).forEach(function (e) { if (e.used) used[e.id] = true; });
      d.eventsUsed = used;
      G.Save.saveRun(d);
    }
  };

  /* ---------------- 互动：触发事件 ---------------- */
  var _try2 = G.game.tryInteract;
  G.game.tryInteract = function () {
    var p = this.player;
    if (this.events) {
      for (var i = 0; i < this.events.length; i++) {
        var ev = this.events[i];
        if (ev.used) continue;
        if (G.dist(p.x, p.y, ev.x, ev.y) < 84) {
          G.UI.openEvent(ev, rollChoice(this.map, p));
          return;
        }
      }
    }
    return _try2.call(this);
  };

  /* 应用选择（核心逻辑，UI 薄层） */
  G.game.applyEvent = function (ev, choice) {
    if (!ev || ev.used || !choice) return;
    ev.used = true;
    try { choice.apply(); } catch (e) {}
    G.Audio.sfx('item_get');
    G.burst(ev.x, ev.y, 22, choice.col || '#c07fff', 220, { size: 3.5 });
    G.fx('ring', { x: ev.x, y: ev.y, r0: 8, r1: 150, col: choice.col || '#c07fff', w: 5, life: 0.55 });
    G.UI.banner('事件：「' + choice.name + '」', choice.col || '#c07fff');
    G.UI.closeEvent();
    this.saveRun();
  };

  /* ---------------- 事件面板（DOM 动态创建） ---------------- */
  function evtPanel() {
    var e = $('evtPanel');
    if (e) return e;
    e = document.createElement('div');
    e.id = 'evtPanel';
    e.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(4,6,12,.72);z-index:80;';
    var box = document.createElement('div');
    box.id = 'evtBox';
    box.style.cssText = 'background:linear-gradient(180deg,#181c2c,#101320);border:2px solid #c07fff;border-radius:12px;padding:24px 30px;max-width:640px;width:92%;box-shadow:0 0 60px #c07fff33;text-align:center;';
    e.appendChild(box);
    document.body.appendChild(e);
    return e;
  }

  G.UI.openEvent = function (ev, choices) {
    var e = evtPanel();
    var box = $('evtBox');
    box.innerHTML = '';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:24px;font-weight:900;letter-spacing:6px;color:#e0d0ff;margin-bottom:6px;';
    title.textContent = '深渊事件';
    box.appendChild(title);
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:12px;color:#8a90a8;margin-bottom:18px;letter-spacing:1px;';
    sub.textContent = '选择你的命运——没有回头路。';
    box.appendChild(sub);
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:14px;justify-content:center;flex-wrap:wrap;';
    choices.forEach(function (c, idx) {
      var card = document.createElement('div');
      card.style.cssText = 'flex:1;min-width:200px;border:1px solid ' + c.col + '66;border-radius:10px;padding:14px;cursor:pointer;background:rgba(16,19,32,.7);transition:transform .12s,border-color .12s;';
      card.style.borderColor = c.col + '88';
      var ic = document.createElement('div');
      ic.style.cssText = 'font-size:26px;color:' + c.col + ';';
      ic.textContent = c.icon;
      var nm = document.createElement('div');
      nm.style.cssText = 'font-size:15px;font-weight:800;color:' + c.col + ';margin:6px 0 4px;';
      nm.textContent = c.name;
      var ds = document.createElement('div');
      ds.style.cssText = 'font-size:11.5px;color:#aab;line-height:1.5;';
      ds.textContent = c.desc;
      card.appendChild(ic); card.appendChild(nm); card.appendChild(ds);
      card.addEventListener('click', function () {
        G.game.applyEvent(ev, choices[idx]);
      });
      row.appendChild(card);
    });
    box.appendChild(row);
    var close = document.createElement('div');
    close.style.cssText = 'margin-top:16px;font-size:11px;color:#6a7088;cursor:pointer;';
    close.textContent = '按 ESC 离开（不选择）';
    close.addEventListener('click', function () { G.UI.closeEvent(); });
    box.appendChild(close);
    e.style.display = 'flex';
    G.UI._evtOpen = true;
    G.Audio.sfx('extract_ready');
  };

  G.UI.closeEvent = function () {
    var e = $('evtPanel');
    if (e) e.style.display = 'none';
    G.UI._evtOpen = false;
  };

  /* ESC 关闭事件面板（10_game 的 ESC 处理器之前已绑定；这里补绑定到 window） */
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Escape' && G.UI._evtOpen) {
      G.UI.closeEvent();
      e.preventDefault();
      e.stopPropagation();
    }
  });

  /* ---------------- 事件节点视觉 ---------------- */
  var _render2 = G.game.render;
  G.game.render = function () {
    _render2.call(this);
    if (!this.events) return;
    var c = this.ctx;
    c.save();
    c.translate(Math.round(-this.camX), Math.round(-this.camY));
    for (var i = 0; i < this.events.length; i++) {
      var ev = this.events[i];
      if (ev.used) continue;
      var pulse = (Math.sin(this.runTime * 2.4 + i) + 1) / 2;
      c.globalAlpha = 0.14 + 0.10 * pulse;
      c.fillStyle = '#c07fff';
      c.beginPath(); c.arc(ev.x, ev.y, 46, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.7;
      c.strokeStyle = '#c07fff'; c.lineWidth = 3;
      c.beginPath(); c.arc(ev.x, ev.y, 30 + pulse * 5, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = '#e8d8ff';
      c.font = 'bold 22px "Segoe UI",sans-serif';
      c.textAlign = 'center';
      c.fillText('!', ev.x, ev.y + 8);
    }
    c.restore();
  };

})();
