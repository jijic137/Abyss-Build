/* ============================================================
   36_content.js —— 机关与内容布置
   - 爆炸桶：可被子弹引爆，范围伤害敌我双方，可连锁
   - 尖刺陷阱：周期预警+弹出，玩家踩上受伤
   - 宝箱布置瘦身：战斗房最多 1 个容器并定位置，宝库房保持设计感
   ============================================================ */
'use strict';

(function () {

  /* ---------------- 爆炸桶 ---------------- */
  function Barrel(x, y, room) {
    this.x = x; this.y = y;
    this.r = 13;
    this.room = room;
    this.hp = 18; this.maxHp = 18;
    this.flash = 0;
    this.dead = false;
    this.t = G.rand(0, 6);
  }
  Barrel.prototype.hit = function (dmg) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 1;
    if (this.hp <= 0) this.explode();
  };
  Barrel.prototype.explode = function () {
    if (this.dead) return;
    this.dead = true;
    var g = G.game;
    var dmg = 28 + g.map.tier.danger * 6;
    G.explode(this.x, this.y, 130, dmg, { col: '#ff9a3a', debCol: '#5a2a1a' });
    var p = g.player;
    if (!p.dead && G.dist(p.x, p.y, this.x, this.y) < 130 + p.r) {
      p.takeDamage(Math.round(dmg * 0.7), { x: this.x, y: this.y });
    }
    /* 连锁引爆 */
    for (var i = 0; i < g.barrels.length; i++) {
      var b = g.barrels[i];
      if (!b.dead && b !== this && G.dist(this.x, this.y, b.x, b.y) < 150) b.explode();
    }
    for (var k = 0; k < 3; k++) {
      g.pickups.push(new G.Pickup(this.x + G.rand(-12, 12), this.y + G.rand(-12, 12), 'mat', 1));
    }
    g.shake(12, 0.4);
  };
  Barrel.prototype.update = function (dt) {
    this.flash = Math.max(0, this.flash - dt * 5);
    this.t += dt;
  };
  Barrel.prototype.draw = function (c) {
    var bob = Math.sin(this.t * 2.4) * 1.5;
    var cv = G.PX.getTint('crt_barrel', this.hp < this.maxHp * 0.5 ? '#ff5a3a' : '#b0563a', 3);
    G.PX.draw(c, cv, this.x, this.y + bob, { flash: this.flash * 0.7 });
    /* 引信火花 */
    c.save();
    c.fillStyle = (Math.sin(this.t * 10) > 0 ? '#ffd24a' : '#ff9a3a');
    c.beginPath(); c.arc(this.x, this.y - 16 + bob, 2.5, 0, Math.PI * 2); c.fill();
    c.restore();
  };
  G.Barrel = Barrel;

  /* ---------------- 尖刺陷阱 ---------------- */
  function Trap(x, y, room) {
    this.x = x; this.y = y;
    this.r = 24;
    this.room = room;
    this.t = G.rand(0, 3.6);
    this.cycle = 3.6;
    this.dead = false;
  }
  Trap.prototype.update = function (dt) {
    var g = G.game;
    this.t += dt;
    var tt = this.t % this.cycle;
    this.warn = tt < 0.9 ? (1 - tt / 0.9) : 0;
    this.up = tt >= 0.9 && tt < 1.8;
    if (this.up) {
      var p = g.player;
      if (!p.dead && p.hitCd <= 0 && G.dist(p.x, p.y, this.x, this.y) < this.r + 14) {
        p.takeDamage(10 + g.map.tier.danger * 3, this);
      }
    }
  };
  Trap.prototype.draw = function (c) {
    c.save();
    c.translate(this.x, this.y);
    /* 底盘 */
    c.fillStyle = '#242838';
    c.fillRect(-20, -6, 40, 12);
    c.strokeStyle = '#3a4258';
    c.lineWidth = 2;
    c.strokeRect(-20, -6, 40, 12);
    /* 预警 */
    if (this.warn > 0) {
      c.globalAlpha = this.warn * 0.5;
      c.fillStyle = '#ff6b4a';
      c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    /* 尖刺 */
    if (this.up) {
      var n = 5;
      for (var i = 0; i < n; i++) {
        var x = -16 + i * 8;
        c.fillStyle = '#9aa0b0';
        c.beginPath();
        c.moveTo(x - 3, 6);
        c.lineTo(x + 3, 6);
        c.lineTo(x, -12);
        c.closePath();
        c.fill();
      }
    }
    c.restore();
  };
  G.Trap = Trap;

  /* ---------------- 内容布置（开图 / 深入共用） ---------------- */
  G.setupContent = function (g) {
    var m = g.map;
    if (!m) return;

    /* 1) 战斗房容器瘦身 + 定位置 */
    var priority = { chest_abyss: 5, chest_gold: 4, chest_iron: 3, chest_wood: 2, crate: 1, barrel: 1 };
    var byRoom = {};
    g.containers.forEach(function (c) {
      (byRoom[c.room] = byRoom[c.room] || []).push(c);
    });
    var keep = [];
    Object.keys(byRoom).forEach(function (rid) {
      var idx = +rid;
      var list = byRoom[rid];
      var rm = m.rooms[idx];
      if (!rm || rm.type !== 'combat') {
        list.forEach(function (c) { keep.push(c); });
        return;
      }
      list.sort(function (a, b) { return (priority[b.type] || 0) - (priority[a.type] || 0); });
      var c = list[0];
      if (c) {
        var rc = G.Map.roomRect(rm.c, rm.r);
        var h1 = (idx * 7919) & 0xffff;
        c.x = rc.x0 + 130 + (h1 % Math.max(1, rc.x1 - rc.x0 - 260));
        c.y = rc.y0 + 130 + ((h1 >>> 4) % Math.max(1, rc.y1 - rc.y0 - 260));
        keep.push(c);
      }
    });
    g.containers = keep;
    m.containers = keep.map(function (c) {
      return { cid: c.cid, x: c.x, y: c.y, room: c.room, type: c.type, opened: c.opened, used: c.used, ch: c.ch, started: c.started, pulse: c.pulse };
    });

    /* 2) 爆炸桶（战斗房 1-2 个） */
    g.barrels = [];
    m.rooms.forEach(function (rm) {
      if (rm.type !== 'combat') return;
      var rc = G.Map.roomRect(rm.c, rm.r);
      var h2 = (rm.idx * 104729) & 0xffff;
      var n = 1 + (h2 % 2);
      for (var i = 0; i < n; i++) {
        g.barrels.push(new G.Barrel(
          rc.x0 + G.Map.ROOM / 2 - 130 + ((h2 + i * 13) % 260),
          rc.y0 + G.Map.ROOM / 2 - 130 + (((h2 >>> 3) + i * 7) % 260),
          rm.idx
        ));
      }
    });

    /* 3) 尖刺陷阱（战斗房 1 个） */
    g.traps = [];
    m.rooms.forEach(function (rm) {
      if (rm.type !== 'combat') return;
      var rc = G.Map.roomRect(rm.c, rm.r);
      var h3 = (rm.idx * 668265263) & 0xffff;
      g.traps.push(new G.Trap(
        rc.x0 + G.Map.ROOM / 2 - 120 + (h3 % 240),
        rc.y0 + G.Map.ROOM / 2 - 120 + ((h3 >>> 5) % 240),
        rm.idx
      ));
    });
  };

  /* ---------------- 开局/读档接入 ---------------- */
  var _nr4 = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    this.barrels = [];
    this.traps = [];
    var r = _nr4.call(this, charDef, tierId);
    if (this.map) G.setupContent(this);
    return r;
  };
  var _rr4 = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    this.barrels = [];
    this.traps = [];
    var r = _rr4.call(this, data);
    if (this.map) G.setupContent(this);
    return r;
  };

  /* ---------------- 子弹引爆爆炸桶 ---------------- */
  var _bu = G.Bullet.prototype.update;
  G.Bullet.prototype.update = function (dt) {
    _bu.call(this, dt);
    if (this.dead || this.hostile) return;
    var g = G.game;
    if (!g || !g.barrels || !g.barrels.length) return;
    for (var i = 0; i < g.barrels.length; i++) {
      var b = g.barrels[i];
      if (b.dead) continue;
      if (G.dist2(this.x, this.y, b.x, b.y) < (this.r + b.r) * (this.r + b.r)) {
        b.hit(this.dmg);
        this.dead = true;
        G.burst(this.x, this.y, 4, '#ff9a3a', 110, { size: 2.5 });
        return;
      }
    }
  };

  /* ---------------- 主循环接入 ---------------- */
  var _upd = G.game.update;
  G.game.update = function (dt) {
    _upd.call(this, dt);
    if (this.state !== 'play' || !this.map) return;
    var i;
    for (i = this.barrels.length - 1; i >= 0; i--) {
      this.barrels[i].update(dt);
      if (this.barrels[i].dead) this.barrels.splice(i, 1);
    }
    for (i = 0; i < this.traps.length; i++) this.traps[i].update(dt);
  };

  var _rnd = G.game.render;
  G.game.render = function () {
    _rnd.call(this);
    if (!this.map) return;
    var c = this.ctx;
    c.save();
    c.translate(Math.round(-this.camX), Math.round(-this.camY));
    for (var i = 0; i < this.traps.length; i++) this.traps[i].draw(c);
    for (i = 0; i < this.barrels.length; i++) this.barrels[i].draw(c);
    c.restore();
  };

})();
