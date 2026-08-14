/* ============================================================
   52_chests.js —— 分层内容密度（越深越危险 / 怪越多 / 宝箱越多）
   - 宝箱数量与品质随层数提升（战斗房出现率/二次箱子/宝库扩容）
   - 新增专门「陷阱房」「道具房」（随层数增加）
   - 陷阱/爆炸桶数量随层数提升；怪物房间密度随层数提升
   - 「宝箱丰收」词缀在分层基础上再叠加
   ============================================================ */
'use strict';

(function () {

  /* 战斗房箱子类型权重（按层 1..5） */
  function rollChestType(T) {
    var w;
    if (T === 0) w = [['crate', 38], ['barrel', 18], ['chest_wood', 32], ['chest_iron', 12]];
    else if (T === 1) w = [['crate', 18], ['barrel', 8], ['chest_wood', 38], ['chest_iron', 28], ['chest_gold', 8]];
    else if (T === 2) w = [['crate', 8], ['barrel', 4], ['chest_wood', 26], ['chest_iron', 36], ['chest_gold', 22], ['chest_abyss', 4]];
    else if (T === 3) w = [['crate', 3], ['barrel', 2], ['chest_wood', 16], ['chest_iron', 34], ['chest_gold', 36], ['chest_abyss', 9]];
    else w = [['crate', 1], ['barrel', 1], ['chest_wood', 8], ['chest_iron', 26], ['chest_gold', 42], ['chest_abyss', 22]];
    var total = 0, i;
    for (i = 0; i < w.length; i++) total += w[i][1];
    var r = Math.random() * total;
    for (i = 0; i < w.length; i++) { r -= w[i][1]; if (r <= 0) return w[i][0]; }
    return w[w.length - 1][0];
  }

  function hasMod(g, id) {
    var mods = g.mapMods || [];
    for (var i = 0; i < mods.length; i++) if (mods[i].id === id) return true;
    return false;
  }

  /* 重排容器 / 陷阱 / 爆炸桶（fresh=false 时保留已开容器与类型） */
  G.placeChests = function (g, preserve) {
    var m = g.map;
    if (!m) return;
    var tier = m.tierId || 1;
    var T = tier - 1;
    var lootMod = hasMod(g, 'loot');

    /* 1) 专门房：陷阱房 / 道具房（从战斗房转换） */
    var trapN = [0, 1, 1, 2, 2][T];
    var itemN = [1, 1, 1, 2, 2][T];
    var combats = m.rooms.filter(function (rm) { return rm.type === 'combat'; });
    function setGroupType(rm, type) {
      if (rm.group == null) { rm.type = type; return; }
      m.rooms.forEach(function (x) { if (x.group === rm.group) x.type = type; });
    }
    for (var ci = combats.length - 1; ci > 0; ci--) {
      var j = Math.floor(Math.random() * (ci + 1));
      var tmp = combats[ci]; combats[ci] = combats[j]; combats[j] = tmp;
    }
    for (var ti = 0; ti < trapN && combats.length; ti++) {
      var tr = combats.shift();
      setGroupType(tr, 'trap');
    }
    for (var ii = 0; ii < itemN && combats.length; ii++) {
      var ir = combats.shift();
      setGroupType(ir, 'item');
    }

    /* 2) 容器重排 */
    var byRoom = {};
    g.containers.forEach(function (c) {
      (byRoom[c.room] = byRoom[c.room] || []).push(c);
    });
    var out = [];
    function ensure(rm, type, opts) {
      var list = byRoom[rm.idx] || [];
      var c = list.shift();
      if (c) {
        if ((!c.opened && !c.used) && type) {
          c.type = type;
          if (opts && opts.forceItem) c.forceItem = true;
        }
        out.push(c);
        return c;
      }
      var rc = G.Map.roomRect(rm.c, rm.r);
      var h = (rm.idx * 7919 + out.length) & 0xffff;
      var px = rc.x0 + 110 + (h % Math.max(1, rc.x1 - rc.x0 - 220));
      var py = rc.y0 + 110 + ((h >>> 4) % Math.max(1, rc.y1 - rc.y0 - 220));
      /* 避让房内结构：重叠则挪到中心安全区 */
      var rects = m.interiorByRoom ? m.interiorByRoom[rm.idx] : null;
      if (rects) {
        var ov = false;
        for (var hi = 0; hi < rects.length; hi++) {
          if (px > rects[hi][0] - 30 && px < rects[hi][2] + 30 &&
              py > rects[hi][1] - 30 && py < rects[hi][3] + 30) { ov = true; break; }
        }
        if (ov) {
          px = rc.x0 + G.Map.ROOM / 2 - 120 + ((h >>> 7) % 240);
          py = rc.y0 + G.Map.ROOM / 2 - 120 + ((h >>> 11) % 240);
        }
      }
      var n = {
        cid: 'c' + rm.idx + '_' + (100 + out.length),
        x: px, y: py,
        room: rm.idx, type: type,
        opened: false, used: false, ch: 0, started: false, pulse: Math.random() * 6
      };
      var inst = new G.Container(n);
      if (opts && opts.forceItem) inst.forceItem = true;
      out.push(inst);
      return inst;
    }

    var combatChance = [0.35, 0.55, 0.78, 0.92, 1.0][T] + (lootMod ? 0.2 : 0);
    var secondChance = [0, 0, 0.18, 0.34, 0.5][T] + (lootMod ? 0.15 : 0);
    var treasureN = [3, 3, 4, 5, 6][T] + (lootMod ? 1 : 0);

    m.rooms.forEach(function (rm) {
      if (rm.type === 'spawn' || rm.type === 'extract' || rm.type === 'shrine' || rm.type === 'altar') return;
      var i, n, type;
      if (rm.type === 'treasure') {
        for (i = 0; i < treasureN; i++) {
          type = i === 0 ? 'chest_gold' :
       i === 1 ? (T >= 2 ? 'chest_gold' : 'chest_wood') :
       i === 2 ? 'chest_iron' :
       i === 3 ? (T >= 2 ? 'chest_gold' : 'chest_iron') :
       (i === 4 ? 'chest_abyss' : 'chest_gold');
          ensure(rm, type);
        }
      } else if (rm.type === 'trap') {
        ensure(rm, T >= 2 ? 'chest_gold' : 'chest_iron');
      } else if (rm.type === 'item') {
        n = T >= 3 ? 3 : 2;
        for (i = 0; i < n; i++) ensure(rm, rollChestType(T), { forceItem: true });
      } else if (rm.type === 'elite') {
        ensure(rm, T >= 2 ? 'chest_gold' : 'chest_iron');
      } else if (rm.type === 'boss') {
        ensure(rm, 'chest_gold');
      } else if (rm.type === 'combat') {
        n = (Math.random() < combatChance ? 1 : 0) + (Math.random() < secondChance ? 1 : 0);
        for (i = 0; i < n; i++) ensure(rm, rollChestType(T));
      }
    });

    g.containers = out;
    m.containers = out.map(function (c) {
      return { cid: c.cid, x: c.x, y: c.y, room: c.room, type: c.type, opened: c.opened, used: c.used, ch: c.ch, started: c.started, pulse: c.pulse };
    });

    /* 3) 陷阱 / 爆炸桶（随层数增强） */
    g.traps = [];
    g.barrels = [];
    m.rooms.forEach(function (rm) {
      var rc = G.Map.roomRect(rm.c, rm.r);
      var h = (rm.idx * 668265263) & 0xffff;
      var trapN2 = 0, barrelN = 0;
      if (rm.type === 'trap') { trapN2 = 6; barrelN = 3; }
      else if (rm.type === 'combat') { trapN2 = [1, 1, 1, 2, 2][T]; barrelN = [1, 1, 2, 2, 3][T]; }
      else if (rm.type === 'item') { trapN2 = 1; barrelN = 1; }
      else if (rm.type === 'treasure') { barrelN = T >= 3 ? 1 : 0; }
      var i;
      for (i = 0; i < trapN2; i++) {
        g.traps.push(new G.Trap(
          rc.x0 + G.Map.ROOM / 2 - 120 + ((h + i * 101) % 240),
          rc.y0 + G.Map.ROOM / 2 - 120 + (((h >>> 5) + i * 67) % 240),
          rm.idx
        ));
      }
      for (i = 0; i < barrelN; i++) {
        g.barrels.push(new G.Barrel(
          rc.x0 + G.Map.ROOM / 2 - 130 + ((h + i * 43) % 260),
          rc.y0 + G.Map.ROOM / 2 - 130 + (((h >>> 3) + i * 29) % 260),
          rm.idx
        ));
      }
    });
  };

  /* 道具房宝箱必出物品（无则补一件） */
  var _cOpen = G.Container.prototype.open;
  G.Container.prototype.open = function () {
    var out = _cOpen.call(this);
    if (this.forceItem && out) {
      var has = false;
      for (var i = 0; i < out.length; i++) if (out[i].inst) { has = true; break; }
      if (!has) {
        var inst = G.rollLootItem(G.game.map ? G.game.map.tierId : 1, G.game.player ? G.game.player.st.luck : 0);
        if (inst) out.push({ kind: 'item', inst: inst });
      }
    }
    return out;
  };

  /* ---------------- 生命周期接入 ---------------- */
  var _nr9 = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    var r = _nr9.call(this, charDef, tierId);
    if (this.map) G.placeChests(this, false);
    return r;
  };
  var _rr9 = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    var r = _rr9.call(this, data);
    if (this.map) G.placeChests(this, true);
    return r;
  };
  var _desc9 = G.game.descend;
  G.game.descend = function () {
    var r = _desc9.call(this);
    if (this.map) G.placeChests(this, false);
    return r;
  };

  /* ---------------- 怪物密度随层数提升 ---------------- */
  G.game.updateSpawning = function (dt) {
    var g = this, m = g.map, p = g.player;
    if (!m || !p) return;
    var rm = G.Map.roomAt(m, p.x, p.y);
    var tier = m.tierId || 1;
    var base = {
      combat: 6 + tier, trap: 5 + tier, item: 4 + tier,
      treasure: 3 + tier, elite: 5 + tier, boss: 5 + tier,
      shrine: 3, altar: 3, extract: 4, spawn: 3, event: 4, portal: 4
    };
    var cap = base[rm.type] || 5;
    var inRoom = 0;
    for (var i = 0; i < g.enemies.length; i++) {
      if (!g.enemies[i].dead && g.enemies[i].room === rm.idx) inRoom++;
    }
    var fast = hasMod(g, 'threat');
    var interval = G.clamp((1.65 - m.time * 0.008 - m.tier.danger * 0.055) * (fast ? 0.72 : 1), 0.4, 1.65);
    m.threatAcc += dt;
    if (inRoom < cap && g.enemies.length < 222 && m.threatAcc >= interval) {
      m.threatAcc = 0;
      var eid = g.rollMapEnemy();
      if (eid) g.spawnEnemy(eid);
    }
  };

  /* 房间名：陷阱房 / 道具房 */
  var _uh9 = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh9.call(this, g);
    var sub = G.$('waveSub');
    if (sub && g.map && g.player) {
      var rm = G.Map.roomAt(g.map, g.player.x, g.player.y);
      if (rm.type === 'trap') sub.textContent = '陷阱房';
      else if (rm.type === 'item') sub.textContent = '道具房';
    }
  };

})();
