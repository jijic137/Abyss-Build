/* ============================================================
   27_runmods.js —— 每局随机性：深渊词缀 + 传送门房间
   每局开局随机 1~2 个全局修正；钩子一次性挂载，跨局不叠加。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* ---------------- 词缀池 ---------------- */
  var POOL = [
    { id: 'threat', name: '怪潮汹涌', icon: '≋', col: '#ff8a5a', w: 8, desc: '敌人刷新更快' },
    { id: 'elites', name: '精英成群', icon: '✸', col: '#ffd24a', w: 6, desc: '多一处精英巢穴' },
    { id: 'loot', name: '宝箱丰收', icon: '◆', col: '#ffd24a', w: 7, desc: '额外宝箱散落' },
    { id: 'mats', name: '材料横流', icon: '◈', col: '#ffb347', w: 7, desc: '材料获得 +50%' },
    { id: 'swift', name: '迅捷猎手', icon: '≫', col: '#ff6b6b', w: 6, desc: '敌人更快' },
    { id: 'armor', name: '坚实护甲', icon: '▣', col: '#9ad0ff', w: 6, desc: '敌人护甲 +1' },
    { id: 'bless', name: '深渊祝福', icon: '✦', col: '#6ee787', w: 7, desc: '本局伤害 +12%' },
    { id: 'curse', name: '厄运缠身', icon: '☠', col: '#c07fff', w: 5, desc: '本局最大生命 -12%' },
    { id: 'dark', name: '黑暗笼罩', icon: '☾', col: '#8a8fa8', w: 6, desc: '视野更暗' },
    { id: 'haste', name: '疾风步', icon: '➤', col: '#7fe0c0', w: 6, desc: '本局移速 +10%' }
  ];

  function hasMod(g, id) {
    var mods = g.mapMods || [];
    for (var i = 0; i < mods.length; i++) if (mods[i].id === id) return true;
    return false;
  }

  function rollMods(tierId) {
    var n = tierId === 1 ? 1 : (Math.random() < 0.55 ? 2 : 1);
    var pool = POOL.slice();
    var out = [];
    for (var i = 0; i < n && pool.length; i++) {
      var total = pool.reduce(function (a, b) { return a + b.w; }, 0);
      var roll = Math.random() * total, idx = 0;
      for (var j = 0; j < pool.length; j++) { roll -= pool[j].w; if (roll <= 0) { idx = j; break; } }
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }

  /* ---------------- 开局接线（词缀按局生成并落位） ---------------- */
  var _nr = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    this.portals = [];
    this.mapMods = [];
    var r = _nr.call(this, charDef, tierId);
    if (this.map) {
      this.mapMods = rollMods(this.map.tierId);
      applyMapMods(this);
      applyStatMods(this);
      addPortal(this);
      var names = this.mapMods.map(function (x) { return x.icon + ' ' + x.name; }).join(' · ');
      if (names) {
        G.UI.banner('本局：' + names, '#9fb4ff');
        var g = this;
        setTimeout(function () {
          G.UI.banner(g.map.tier.name + ' · ' + g.map.tier.sub, g.map.tier.col);
        }, 2600);
      }
    }
    return r;
  };

  var _rr = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    this.portals = [];
    this.mapMods = [];
    var r = _rr.call(this, data);
    if (this.map) {
      if (data && data.mapMods) {
        this.mapMods = data.mapMods.map(function (id) {
          for (var i = 0; i < POOL.length; i++) if (POOL[i].id === id) return POOL[i];
          return null;
        }).filter(Boolean);
        applyStatMods(this);
      }
      addPortal(this);
      if (data && data.portalsUsed) {
        this.portals.forEach(function (pt) { if (data.portalsUsed[pt.id]) pt.used = true; });
      }
    }
    return r;
  };

  var _sr = G.game.saveRun;
  G.game.saveRun = function () {
    _sr.call(this);
    var d = G.Save.getRun();
    if (d) {
      d.mapMods = (this.mapMods || []).map(function (x) { return x.id; });
      var used = {};
      (this.portals || []).forEach(function (pt) { if (pt.used) used[pt.id] = true; });
      d.portalsUsed = used;
      G.Save.saveRun(d);
    }
  };

  /* 地图级：精英巢穴 / 额外宝箱（每局一次，作用于当前地图） */
  function applyMapMods(game) {
    var m = game.map;
    if (hasMod(game, 'elites')) {
      var pool = [];
      for (var w = m.tier.waveBand[0]; w <= m.tier.waveBand[1]; w++) {
        var cfg = G.WAVES[w - 1];
        if (cfg && cfg.elites) cfg.elites.forEach(function (e) { pool.push(e[0]); });
      }
      if (!pool.length) pool = ['el_butcher', 'el_warden', 'el_hexer'];
      var cands = m.rooms.filter(function (rm) {
        return rm.type === 'combat' && rm.idx !== m.startRoom && rm.idx !== m.extractRoom;
      });
      if (cands.length) {
        var rm = G.pick(cands);
        rm.type = 'elite';
        rm.eliteIds = [G.pick(pool)];
      }
    }
    if (hasMod(game, 'loot')) {
      var combat = m.rooms.filter(function (rm) { return rm.type === 'combat'; });
      for (var i = 0; i < 3 && combat.length; i++) {
        var cr = G.pick(combat);
        var rc = G.Map.roomRect(cr.c, cr.r);
        var n = {
          cid: 'x' + (m.containers.length + i),
          x: rc.x0 + 90 + G.rand(0, 520), y: rc.y0 + 90 + G.rand(0, 520),
          room: cr.idx, type: Math.random() < 0.4 ? 'chest_iron' : 'crate',
          opened: false, used: false, ch: 0, started: false, pulse: G.rand(0, 6)
        };
        m.containers.push(n);
        game.containers.push(new G.Container(n));
      }
    }
  }

  /* 属性级：祝福 / 诅咒 / 疾风（写进角色基底，随存档保留） */
  function applyStatMods(game) {
    var p = game.player;
    if (hasMod(game, 'bless')) {
      p.char.mods.damage = (p.char.mods.damage || 0) + 12;
    }
    if (hasMod(game, 'curse')) {
      p.char.mods.maxHp = (p.char.mods.maxHp || 0) - Math.round(p.st.maxHp * 0.12);
    }
    if (hasMod(game, 'haste')) {
      p.char.mods.speed = (p.char.mods.speed || 0) + 10;
    }
    p.recalc();
    if (p.hp > p.st.maxHp) p.hp = p.st.maxHp;
  }

  /* ---------------- 一次性钩子（跨局不叠加） ---------------- */
  var _am = G.game.addMaterials;
  G.game.addMaterials = function (v) {
    var mul = hasMod(this, 'mats') ? 1.5 : 1;
    _am.call(this, Math.round(v * mul));
  };

  var _sp = G.game.spawnEnemy;
  G.game.spawnEnemy = function (id, x, y) {
    var e = _sp.call(this, id, x, y);
    if (e && this.mapMods) {
      for (var i = 0; i < this.mapMods.length; i++) {
        if (this.mapMods[i].id === 'swift') e.spd *= 1.25;
        if (this.mapMods[i].id === 'armor') e.armor = (e.armor || 0) + 1;
      }
    }
    return e;
  };

  var _us = G.game.updateSpawning;
  G.game.updateSpawning = function (dt) {
    if (!hasMod(this, 'threat')) { _us.call(this, dt); return; }
    var m = this.map, p = this.player;
    var rm = G.Map.roomAt(m, p.x, p.y);
    var roomCap = { combat: 8, treasure: 4, elite: 6, boss: 6, shrine: 4, altar: 4, extract: 5, spawn: 3, event: 4, portal: 4 };
    var cap = roomCap[rm.type] || 5;
    var inRoom = 0;
    for (var i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].dead && this.enemies[i].room === rm.idx) inRoom++;
    }
    var interval = G.clamp((1.65 - m.time * 0.008 - m.tier.danger * 0.055) * 0.72, 0.4, 1.4);
    m.threatAcc += dt;
    if (inRoom < cap && this.enemies.length < 222 && m.threatAcc >= interval) {
      m.threatAcc = 0;
      var eid = this.rollMapEnemy();
      if (eid) this.spawnEnemy(eid);
    }
  };

  var _render = G.game.render;
  G.game.render = function () {
    _render.call(this);
    if (hasMod(this, 'dark') && this.map) {
      var c = this.ctx;
      c.fillStyle = 'rgba(4,6,14,0.20)';
      c.fillRect(0, 0, this.vw, this.vh);
    }
    if (this.portals) {
      var c2 = this.ctx;
      c2.save();
      c2.translate(Math.round(-this.camX), Math.round(-this.camY));
      for (var i = 0; i < this.portals.length; i++) {
        var pt = this.portals[i];
        if (pt.used) continue;
        var pulse = (Math.sin(this.runTime * 3 + i) + 1) / 2;
        c2.globalAlpha = 0.14 + 0.10 * pulse;
        c2.fillStyle = '#8f7fff';
        c2.beginPath(); c2.arc(pt.x, pt.y, 48, 0, Math.PI * 2); c2.fill();
        c2.globalAlpha = 0.8;
        c2.strokeStyle = '#b9a6ff'; c2.lineWidth = 3;
        c2.beginPath(); c2.arc(pt.x, pt.y, 36 + pulse * 6, 0, Math.PI * 2); c2.stroke();
        c2.globalAlpha = 1;
        var cv = G.PX.getTint('p_portal', '#b9a6ff', 3);
        G.PX.draw(c2, cv, pt.x, pt.y + Math.sin(this.runTime * 4) * 2);
      }
      c2.restore();
    }
  };

  /* ---------------- 传送门 ---------------- */
  function addPortal(game) {
    var m = game.map;
    if (!m || game.portals.length) return;
    var cands = [];
    m.rooms.forEach(function (rm) {
      if (rm.type !== 'combat' || rm.idx === m.startRoom || rm.idx === m.extractRoom) return;
      if (m.dist[rm.idx] >= m.dist[m.extractRoom] * 0.35) cands.push(rm);
    });
    if (!cands.length) return;
    var rm = G.pick(cands);
    rm.type = 'portal';
    var rc = G.Map.roomRect(rm.c, rm.r);
    game.portals = [{
      id: 'pt' + rm.idx,
      x: (rc.x0 + rc.x1) / 2 + G.rand(-40, 40),
      y: (rc.y0 + rc.y1) / 2 + G.rand(-40, 40),
      room: rm.idx, used: false
    }];
  }

  var _try = G.game.tryInteract;
  G.game.tryInteract = function () {
    var p = this.player;
    if (this.portals) {
      for (var i = 0; i < this.portals.length; i++) {
        var pt = this.portals[i];
        if (pt.used) continue;
        if (G.dist(p.x, p.y, pt.x, pt.y) < 84) {
          this.usePortal(pt);
          return;
        }
      }
    }
    return _try.call(this);
  };

  G.game.usePortal = function (pt) {
    pt.used = true;
    var m = this.map;
    var cands = [];
    m.rooms.forEach(function (rm) {
      if (rm.idx === m.startRoom || rm.idx === m.extractRoom) return;
      if (!rm.visited && m.dist[rm.idx] >= m.dist[m.extractRoom] * 0.4) cands.push(rm);
    });
    if (!cands.length) cands = m.rooms.filter(function (rm) { return rm.idx !== m.startRoom; });
    var target = G.pick(cands);
    var rc = G.Map.roomRect(target.c, target.r);
    G.burst(this.player.x, this.player.y, 30, '#8f7fff', 260, { size: 4 });
    G.fx('ring', { x: this.player.x, y: this.player.y, r0: 6, r1: 120, col: '#8f7fff', w: 5, life: 0.4 });
    this.player.x = (rc.x0 + rc.x1) / 2;
    this.player.y = (rc.y0 + rc.y1) / 2;
    this.player.room = target.idx;
    this.lastRoom = -1;
    this.enterRoom(target.idx);
    G.burst(this.player.x, this.player.y, 30, '#8f7fff', 260, { size: 4 });
    G.fx('ring', { x: this.player.x, y: this.player.y, r0: 6, r1: 120, col: '#8f7fff', w: 5, life: 0.4 });
    G.Audio.sfx('extract_ready');
    G.UI.banner('穿过深渊裂隙', '#b9a6ff');
    this.saveRun();
  };

  /* ---------------- HUD 词缀行 ---------------- */
  function modLine() {
    var e = $('modLine');
    if (e) return e;
    var hud = $('hud');
    if (!hud) return null;
    e = document.createElement('div');
    e.id = 'modLine';
    hud.appendChild(e);
    return e;
  }
  var _uh = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh.call(this, g);
    var e = modLine();
    if (e) {
      e.textContent = (g.mapMods || []).map(function (x) { return x.icon + ' ' + x.name; }).join(' · ');
    }
  };

})();
