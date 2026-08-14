/* ============================================================
   07_player.js —— 玩家角色 + 武器开火逻辑 + 敌人实体
   （搜打撤版：分轴移动碰撞 / 视线遮挡；修复穿墙与瞬移）
   ============================================================ */
'use strict';

(function () {

  /* 世界碰撞（房间地图） */
  G.Map = G.Map || {};
  G.Map.canStand = function (m, x, y, r) {
    if (!m) return true;
    if (G.Map.solid(m, x - r, y - r) || G.Map.solid(m, x + r, y - r) ||
        G.Map.solid(m, x - r, y + r) || G.Map.solid(m, x + r, y + r) ||
        G.Map.solid(m, x, y)) return false;
    return true;
  };
  G.Map.bboxSolid = function (m, x, y, r) {
    if (!m) return false;
    return G.Map.solid(m, x - r, y - r) || G.Map.solid(m, x + r, y - r) ||
           G.Map.solid(m, x - r, y + r) || G.Map.solid(m, x + r, y + r) ||
           G.Map.solid(m, x, y);
  };
  function collideWorld(x, y, r) {
    var g = G.game;
    if (!g.map) {
      x = G.clamp(x, r, g.arena - r);
      y = G.clamp(y, r, g.arena - r);
      return { x: x, y: y };
    }
    var m = g.map, W = G.Map.WALL;
    x = G.clamp(x, W + r, m.worldW - W - r);
    y = G.clamp(y, W + r, m.worldH - W - r);
    return { x: x, y: y };
  }
  G.collideWorld = collideWorld;

  /* ============================================================
     玩家
     ============================================================ */
  function Player(charDef) {
    this.char = charDef;
    this.x = 0; this.y = 0;
    this.r = 14;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.dead = false;
    this.room = -1;

    this.items = [];
    this.weapons = [];
    this.maxWeapons = 6;

    this.st = G.baseStats();
    G.addStats(this.st, charDef.mods);
    this.hp = this.st.maxHp;

    this.level = 1;
    this.xp = 0;
    this.xpNeed = G.xpForLevel(1);
    this.pendingLevels = 0;

    this.hitCd = 0;
    this.lsCd = 0;
    this.flash = 0;
    this.walkT = 0;
    this.regenAcc = 0;
    this.auraTick = 0;
    this.revived = false;

    this.stats = { dmgDealt: 0, kills: 0, matEarned: 0, eliteKills: 0, bossKills: 0, comboMax: 0 };
    this.skillCd = 0;
    this.skillBuff = null;
    this.skillBuffT = 0;
    this.skillImmuneT = 0;
    this.recalc();
  }

  Player.prototype.recalc = function () {
    var old = this.st ? this.st.maxHp : 0;
    var s = G.baseStats();
    G.addStats(s, this.char.mods);
    var i;
    for (i = 0; i < this.items.length; i++) G.addStats(s, this.items[i].mods || {});
    for (i = 0; i < this.weapons.length; i++) {
      var m = G.weaponMods(this.weapons[i].def, this.weapons[i].tier);
      if (m) G.addStats(s, m);
    }
    s.maxHp = Math.max(10, Math.round(s.maxHp));
    this.st = s;

    if (old && s.maxHp > old) this.hp += (s.maxHp - old);
    this.hp = G.clamp(this.hp, 1, s.maxHp);

    this.sp = {};
    for (i = 0; i < this.items.length; i++) {
      if (this.items[i].sp) this.sp[this.items[i].sp] = (this.sp[this.items[i].sp] || 0) + 1;
    }
  };

  Player.prototype.hasSp = function (k) { return !!this.sp[k]; };

  Player.prototype.skillDef = function () { return this.char.skill || null; };

  Player.prototype.useSkill = function () {
    if (this.dead || this.skillCd > 0) return false;
    var def = this.skillDef();
    if (!def) return false;
    var g = G.game;
    if (!g || g.state !== 'play') return false;

    this.skillCd = def.cd;
    G.Audio.sfx('levelup');
    G.popText(this.x, this.y - 34, def.name, { col: def.col || '#ffd24a', size: 17, life: 0.9 });

    var st = this.st;
    var dmg;
    switch (def.effect) {
      case 'quake': {
        var rq = 150 + st.range * 0.8;
        dmg = 14 + st.meleeDamage * 2.2 + st.damage * 0.5;
        G.explode(this.x, this.y, rq, dmg, { col: '#d9c98a' });
        var ql = g.queryEnemies(this.x, this.y, rq + 60);
        for (var qi = 0; qi < ql.length; qi++) {
          var qe = ql[qi];
          if (qe.dead) continue;
          var qd = G.dist(this.x, this.y, qe.x, qe.y);
          if (qd > rq + qe.r) continue;
          var qk = qd > 1 ? (rq / qd) * 0.4 : 1;
          qe.kx += (qe.x - this.x) / (qd || 1) * 460 * Math.min(2.4, qk);
          qe.ky += (qe.y - this.y) / (qd || 1) * 460 * Math.min(2.4, qk);
        }
        this.skillBuff = 'armor';
        this.skillBuffT = 3;
        break;
      }
      case 'volley': {
        var nv = 8 + Math.floor(this.level / 2);
        var used = [];
        for (var vi = 0; vi < nv; vi++) {
          var te = g.nearestEnemy(this.x, this.y, 600, used);
          if (!te) break;
          dmg = 8 + st.rangedDamage * 1.6 + st.damage * 0.5;
          var va = Math.atan2(te.y - this.y, te.x - this.x) + G.rand(-0.12, 0.12);
          var vsp = 640;
          g.bullets.push(new G.Bullet({
            x: this.x, y: this.y,
            vx: Math.cos(va) * vsp, vy: Math.sin(va) * vsp,
            dmg: dmg, crit: Math.random() < G.clamp(st.critChance / 100, 0, 1),
            r: 6, sprite: 'b_bullet', col: '#a8e6a0', pierce: 0,
            life: 1.4, srcW: { def: { col: '#a8e6a0' } }
          }));
          used.push(te);
        }
        G.fx('ring', { x: this.x, y: this.y, r0: 8, r1: 60, col: '#a8e6a0', w: 4, life: 0.3 });
        break;
      }
      case 'nova': {
        var rn = 170 + st.range * 0.8;
        dmg = 16 + st.elementalDamage * 2.4 + st.damage * 0.5;
        G.explode(this.x, this.y, rn, dmg, { col: '#c9a6ff' });
        for (var ai = 0; ai < 8; ai++) {
          var aa = Math.PI * 2 * ai / 8;
          G.fx('bolt', { pts: [this.x, this.y, this.x + Math.cos(aa) * rn * 0.9, this.y + Math.sin(aa) * rn * 0.9], col: '#c9a6ff', w: 4, life: 0.25 });
        }
        break;
      }
      case 'rage': {
        this.skillBuff = 'rage';
        this.skillBuffT = 5;
        G.fx('ring', { x: this.x, y: this.y, r0: 8, r1: 130, col: '#c0392b', w: 6, life: 0.45 });
        G.burst(this.x, this.y, 26, '#ff8a6b', 240, { size: 4 });
        break;
      }
      case 'overcharge': {
        G.fx('ring', { x: this.x, y: this.y, r0: 8, r1: 140, col: '#e0902a', w: 5, life: 0.45 });
        g.turrets.forEach(function (t) { if (!t.dead) { t.timer = Math.max(0, (t.timer || 0) - 4); t.life = t.max; t.flash = 1; } });
        g.drones.forEach(function (d) { if (!d.dead) { d.timer = Math.max(0, (d.timer || 0) - 4); d.life = d.max; d.flash = 1; } });
        g.mines.forEach(function (m) { if (!m.dead) { m.arm = 0; } });
        break;
      }
      case 'ambush': {
        var te2 = g.nearestEnemy(this.x, this.y, 420);
        var tx = te2 ? te2.x : this.x, ty = te2 ? te2.y : this.y;
        var dx = tx - this.x, dy = ty - this.y;
        var dl = Math.hypot(dx, dy) || 1;
        var ang = Math.atan2(dy, dx);
        this.x = G.clamp(tx - Math.cos(ang) * 26, 24, g.arena - 24);
        this.y = G.clamp(ty - Math.sin(ang) * 26, 24, g.arena - 24);
        G.fx('ring', { x: this.x, y: this.y, r0: 6, r1: 150, col: '#3d4a6b', w: 6, life: 0.4 });
        dmg = 12 + st.meleeDamage * 1.8 + st.damage * 0.5;
        G.explode(this.x, this.y, 120, dmg, { col: '#8a9ad8', crit: Math.random() < G.clamp(st.critChance / 100, 0, 1) });
        G.burst(tx - Math.cos(ang) * 26, ty - Math.sin(ang) * 26, 30, '#ffffff', 300, { size: 3 });
        break;
      }
      case 'smoke': {
        var sr = 130;
        for (var si = 0; si < 46; si++) {
          var sa = Math.random() * Math.PI * 2, sd = Math.sqrt(Math.random()) * sr;
          g.particles.push(new G.Particle(this.x + Math.cos(sa) * sd, this.y + Math.sin(sa) * sd, {
            vx: G.rand(-20, 20), vy: G.rand(-20, 20),
            life: G.rand(1.6, 2.4), size: G.rand(10, 18), col: '#6ab04c',
            drag: 0.96, shape: 'glow'
          }));
        }
        if (!g._poisonClouds) g._poisonClouds = [];
g._poisonClouds.push({
x: this.x, y: this.y, r: sr, t: 5,
tick: 0, dmg: 6 + st.elementalDamage * 1.1,
draw: function (c, t) {
var cloudR = this.r;
var wob = 1 + Math.sin(t * 9 + this.x) * 0.06;
for (var ci = 0; ci < 2; ci++) {
var lr = cloudR * (0.45 + 0.28 * ci) * wob;
var lx = this.x + Math.cos(t * 5 + ci * 2.1) * cloudR * 0.18;
var ly = this.y + Math.sin(t * 6 + ci * 1.7) * cloudR * 0.18;
c.globalAlpha = (0.10 - ci * 0.03) * (0.6 + 0.4 * Math.sin(t * 8));
c.fillStyle = '#6ab04c';
c.beginPath(); c.arc(lx, ly, lr, 0, Math.PI * 2); c.fill();
}
c.globalAlpha = 0.16;
c.strokeStyle = '#6ab04c';
c.lineWidth = 2;
c.beginPath(); c.arc(this.x, this.y, cloudR, 0, Math.PI * 2); c.stroke();
c.globalAlpha = 1;
}
});
        break;
      }
      case 'bulwark': {
        this.skillBuff = 'bulwark';
        this.skillBuffT = 3.5;
        this.skillImmuneT = 2.2;
        G.fx('ring', { x: this.x, y: this.y, r0: 10, r1: 170, col: '#5a7d9c', w: 8, life: 0.6 });
        var bl = g.queryEnemies(this.x, this.y, 210);
        for (var bi = 0; bi < bl.length; bi++) {
          var be = bl[bi];
          if (be.dead) continue;
          var bd = G.dist(this.x, this.y, be.x, be.y);
          if (bd > 210 + be.r) continue;
          var k2 = (bd > 1) ? (210 / bd) * 0.4 : 1;
          be.kx += (be.x - this.x) / (bd || 1) * 420 * Math.min(2.2, k2);
          be.ky += (be.y - this.y) / (bd || 1) * 420 * Math.min(2.2, k2);
          if (!be.def.boss) be.stunT = Math.max(be.stunT, 0.8);
        }
        break;
      }
      default:
        return false;
    }
    return true;
  };

  Player.prototype.addItem = function (def) {
    this.items.push(def);
    this.recalc();
  };
  Player.prototype.removeItem = function (idx) {
    this.items.splice(idx, 1);
    this.recalc();
  };
  Player.prototype.addWeapon = function (w) {
    if (this.weapons.length >= this.maxWeapons) return false;
    w.slotIdx = this.weapons.length;
    this.weapons.push(w);
    this.recalc();
    return true;
  };
  Player.prototype.removeWeapon = function (idx) {
    this.weapons.splice(idx, 1);
    for (var i = 0; i < this.weapons.length; i++) this.weapons[i].slotIdx = i;
    this.recalc();
  };

  Player.prototype.heal = function (v) {
    this.hp = Math.min(this.st.maxHp, this.hp + v);
  };

  Player.prototype.addXp = function (v) {
    this.xp += v * (1 + this.st.xpGain / 100);
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.xpNeed = G.xpForLevel(this.level);
      this.pendingLevels++;
    }
  };

  Player.prototype.takeDamage = function (raw, src) {
    if (this.dead || this.hitCd > 0) return;
    var g = G.game;

    if (this.skillImmuneT > 0) {
      G.popText(this.x, this.y - 20, '守护', { col: '#7fd8ff', size: 12, life: 0.4 });
      this.hitCd = 0.2;
      return;
    }

    if (Math.random() < G.F.dodgeChance(this.st.dodge)) {
      G.popText(this.x, this.y - 20, '闪避', { col: '#c4a6ff', size: 13 });
      this.hitCd = 0.20;
      return;
    }

    var dmg = Math.max(1, Math.round(raw * G.F.armorMul(this.st.armor)));
    this.hp -= dmg;
    this.hitCd = 0.42;
    this.flash = 1;
    g.shake(7, 0.2);
    g.hurtFlash = 1;
    G.popText(this.x, this.y - 22, '-' + dmg, { col: '#ff6b6b', size: 16 });
    G.burst(this.x, this.y, 8, '#ff6b6b', 160, { size: 3 });
    G.Audio.sfx('hurt');

    if (this.st.thorns > 0 && src && src.isEnemy) {
      g.damageEnemy(src, this.st.thorns, { x: src.x, y: src.y, thorn: true });
    }

    if (this.hp <= 0) {
      if (this.hasSp('revive') && !this.revived) {
        this.revived = true;
        this.hp = Math.round(this.st.maxHp * 0.45);
        this.hitCd = 1.6;
        G.fx('ring', { x: this.x, y: this.y, r0: 8, r1: 220, col: '#ff9a3a', w: 7, life: 0.7 });
        G.burst(this.x, this.y, 40, '#ff9a3a', 320, { size: 5 });
        G.popText(this.x, this.y - 40, '不死鸟之烬！', { col: '#ff9a3a', size: 20, life: 1.6 });
        g.shake(16, 0.5);
        return;
      }
      this.hp = 0;
      this.dead = true;
      g.onPlayerDeath();
    }
  };

  Player.prototype.update = function (dt) {
    var g = G.game, i;
    if (this.dead) return;

    this.hitCd = Math.max(0, this.hitCd - dt);
    this.lsCd = Math.max(0, this.lsCd - dt);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.skillImmuneT = Math.max(0, this.skillImmuneT - dt);
    if (this.skillBuff) {
      this.skillBuffT -= dt;
      if (this.skillBuffT <= 0) { this.skillBuff = null; this.skillBuffT = 0; }
    }

    var ix = 0, iy = 0;
    if (g.key('left')) ix -= 1;
    if (g.key('right')) ix += 1;
    if (g.key('up')) iy -= 1;
    if (g.key('down')) iy += 1;
    var len = Math.hypot(ix, iy);
    if (len > 0) { ix /= len; iy /= len; this.face = ix !== 0 ? (ix > 0 ? 1 : -1) : this.face; }

    var spd = G.F.moveSpeed(210, this.st.speed);
    var tvx = ix * spd, tvy = iy * spd;
    var acc = len > 0 ? 16 : 13;
    this.vx = G.lerp(this.vx, tvx, G.clamp(acc * dt, 0, 1));
    this.vy = G.lerp(this.vy, tvy, G.clamp(acc * dt, 0, 1));

    /* 分轴移动 + 包围盒碰撞（不可穿墙） */
    var m = g.map;
    if (m) {
      var tx = this.x + this.vx * dt;
      var ty = this.y + this.vy * dt;
      if (!G.Map.bboxSolid(m, tx, this.y, this.r)) this.x = tx;
      else this.vx = 0;
      if (!G.Map.bboxSolid(m, this.x, ty, this.r)) this.y = ty;
      else this.vy = 0;
      var cl = collideWorld(this.x, this.y, this.r);
      this.x = cl.x; this.y = cl.y;
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      var cl2 = collideWorld(this.x, this.y, this.r);
      this.x = cl2.x; this.y = cl2.y;
    }

    if (len > 0) {
      this.walkT += dt * 10;
      if (Math.random() < dt * 14) {
        g.particles.push(new G.Particle(this.x + G.rand(-5, 5), this.y + 14, {
          vx: -this.vx * 0.12, vy: G.rand(-12, -3),
          life: 0.3, size: 2.5, col: '#3a4258'
        }));
      }
    }

    if (this.st.hpRegen > 0 && this.hp < this.st.maxHp) {
      this.regenAcc += this.st.hpRegen * dt;
      if (this.regenAcc >= 1) {
        var h = Math.floor(this.regenAcc);
        this.regenAcc -= h;
        this.heal(h);
      }
    }

    this.auraTick -= dt;
    if (this.auraTick <= 0) {
      this.auraTick = 0.25;
      if (this.hasSp('poisonAura')) {
        var pd = (3 + this.st.elementalDamage * 0.35) * 0.25;
        var ls = g.queryEnemies(this.x, this.y, 150);
        for (i = 0; i < ls.length; i++) {
          if (G.dist(this.x, this.y, ls[i].x, ls[i].y) < 150)
            g.damageEnemy(ls[i], pd, { x: ls[i].x, y: ls[i].y, silent: true, noChain: true });
        }
      }
    }
    if (this.hasSp('frostAura') && Math.random() < dt * 8) {
      G.burst(this.x + G.rand(-60, 60), this.y + G.rand(-60, 60), 1, '#8fe8ff', 20, { size: 2 });
    }

    /* 技能持续效果 */
    if (g._poisonClouds && g._poisonClouds.length) {
      var pc;
      for (var ci = g._poisonClouds.length - 1; ci >= 0; ci--) {
        pc = g._poisonClouds[ci];
        pc.t -= dt;
        pc.tick -= dt;
        if (pc.t <= 0) { g._poisonClouds.splice(ci, 1); continue; }
        if (pc.tick <= 0) {
          pc.tick = 0.35;
          var pls = g.queryEnemies(pc.x, pc.y, pc.r + 30);
          for (var pi = 0; pi < pls.length; pi++) {
            var pe = pls[pi];
            if (pe.dead) continue;
            if (G.dist(pc.x, pc.y, pe.x, pe.y) < pc.r + pe.r) {
              g.damageEnemy(pe, pc.dmg * 0.45, { x: pe.x, y: pe.y, silent: true, noChain: true, dot: true, poison: pc.dmg * 0.35 });
            }
          }
        }
      }
    }

    this.thunderT = (this.thunderT || 0) - dt;
    if (this.hasSp('thunderAura') && this.thunderT <= 0) {
      this.thunderT = 0.9;
      var tt = g.nearestEnemy(this.x, this.y, 200);
      if (tt) G.chainLightning(g, this.x, this.y, tt, 8 + this.st.elementalDamage * 0.6, false, 3, 160, 0.82, null, '#9fe8ff');
    }

    for (i = 0; i < this.weapons.length; i++) this.updateWeapon(this.weapons[i], dt, i);
  };

  /* 视线遮挡（近战 / 锥形不隔墙打人） */
  function hasLOS(x1, y1, x2, y2) {
    var g = G.game;
    if (!g.map || !G.Map.los) return true;
    return G.Map.los(g.map, x1, y1, x2, y2);
  }

  Player.prototype.updateWeapon = function (w, dt, idx) {
    var g = G.game, def = w.def;
    var st = this.st;
    if (this.skillBuff === 'rage' && this.skillBuffT > 0) {
      st = Object.assign({}, this.st, {
        attackSpeed: this.st.attackSpeed + 40,
        critChance: this.st.critChance + 30,
        critDamage: this.st.critDamage + 40,
        damage: this.st.damage + 18
      });
    } else if (this.skillBuff === 'armor' && this.skillBuffT > 0) {
      st = Object.assign({}, this.st, { armor: this.st.armor + 40 });
    } else if (this.skillBuff === 'bulwark' && this.skillBuffT > 0) {
      st = Object.assign({}, this.st, { armor: this.st.armor + 55 });
    }
    w.swingT = Math.max(0, w.swingT - dt);
    w.timer -= dt;
    if (w.timer > 0) return;

    var rng = def.range * G.F.rangeMul(st.range);
    var target = g.nearestEnemy(this.x, this.y, rng);
    if (!target && def.kind !== 'turret' && def.kind !== 'drone' && def.kind !== 'mine' &&
        def.kind !== 'pulse' && def.kind !== 'orbit') return;

    var cd = G.wCooldown(w) * G.F.cdMul(st.attackSpeed);
    w.timer = cd;
    if (def.kind !== 'swing' && def.kind !== 'thrust') w.swingT = Math.max(w.swingT, 0.07);
    var isMelee = (def.kind === 'swing' || def.kind === 'thrust');
    var pan = target ? Math.max(-1, Math.min(1, Math.cos(Math.atan2(target.y - this.y, target.x - this.x)) * 0.8)) : 0;
    G.Audio.sfx(isMelee ? 'swing' : 'fire', isMelee ? 0 : pan);

    var ang = target ? Math.atan2(target.y - this.y, target.x - this.x) : -Math.PI / 2;
    w.angle = ang;
    this.face = Math.cos(ang) >= 0 ? 1 : -1;

    if (['shot', 'spread', 'lob', 'bouncer', 'returner', 'cone', 'chain', 'homing'].indexOf(def.kind) >= 0) {
      var mx = this.x + Math.cos(ang) * 24, my = this.y + Math.sin(ang) * 24;
      G.fx('flash', { x: mx, y: my, r: 9, col: def.col || '#ffd98a', life: 0.07 });
      G.burst(mx, my, 2, def.col || '#ffd98a', 90, { size: 1.6, lifeMul: 0.4, drag: 0.86 });
    }

    var d, i;
    switch (def.kind) {

      case 'swing': {
        w.swingT = 0.18;
        var half = def.arc / 2;
        G.fx('arc', {
          x: this.x, y: this.y, r: rng * 0.9,
          a0: ang - half, a1: ang + half,
          col: def.col, w: 8, life: 0.2
        });
        var ls = g.queryEnemies(this.x, this.y, rng + 30);
        for (i = 0; i < ls.length; i++) {
          var e = ls[i];
          if (e.dead) continue;
          var dd = G.dist(this.x, this.y, e.x, e.y);
          if (dd > rng + e.r) continue;
          var da = Math.abs(angDiff(Math.atan2(e.y - this.y, e.x - this.x), ang));
          if (da > half) continue;
          if (!hasLOS(this.x, this.y, e.x, e.y)) continue;
          d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
          g.damageEnemy(e, d.dmg, {
            crit: d.crit, x: e.x, y: e.y, knock: def.knock,
            kx: e.x - this.x, ky: e.y - this.y, stun: def.stun, srcW: w
          });
        }
        break;
      }

      case 'thrust': {
        w.swingT = 0.16;
        var ex = this.x + Math.cos(ang) * rng, ey = this.y + Math.sin(ang) * rng;
        G.fx('bolt', { pts: [this.x, this.y, ex, ey], col: def.col, w: 5, life: 0.16 });
        var ls2 = g.queryEnemies((this.x + ex) / 2, (this.y + ey) / 2, rng);
        for (i = 0; i < ls2.length; i++) {
          var e2 = ls2[i];
          if (e2.dead) continue;
          if (distToSeg(e2.x, e2.y, this.x, this.y, ex, ey) > (def.width / 2 + e2.r)) continue;
          if (!hasLOS(this.x, this.y, e2.x, e2.y)) continue;
          d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
          g.damageEnemy(e2, d.dmg, {
            crit: d.crit, x: e2.x, y: e2.y, knock: def.knock,
            kx: Math.cos(ang), ky: Math.sin(ang), srcW: w
          });
        }
        break;
      }

      case 'shot': {
        d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
        var a = ang + (def.jitter ? G.rand(-def.jitter, def.jitter) : 0);
        g.bullets.push(new G.Bullet({
          x: this.x + Math.cos(a) * 16, y: this.y + Math.sin(a) * 16,
          vx: Math.cos(a) * def.bspd, vy: Math.sin(a) * def.bspd,
          dmg: d.dmg, crit: d.crit, r: 6, sprite: def.bullet || 'b_bullet',
          col: def.col, pierce: def.pierce || 0,
          life: rng / def.bspd + 0.2,
          slow: def.slow, slowTime: def.slowTime, poison: def.poison ? def.poison + st.elementalDamage * 0.3 : 0,
          burn: def.burn, srcW: w, trail: def.pierce ? 2 : 0
        }));
        muzzle(this, a, def.col);
        break;
      }

      case 'spread': {
        for (i = 0; i < def.count; i++) {
          d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
          var a2 = ang + (i / (def.count - 1) - 0.5) * def.spread + G.rand(-0.05, 0.05);
          g.bullets.push(new G.Bullet({
            x: this.x + Math.cos(a2) * 14, y: this.y + Math.sin(a2) * 14,
            vx: Math.cos(a2) * def.bspd * G.rand(0.88, 1.12),
            vy: Math.sin(a2) * def.bspd * G.rand(0.88, 1.12),
            dmg: d.dmg, crit: d.crit, r: 5, sprite: def.bullet || 'b_small',
            col: def.col, knock: def.knock || 0, pierce: def.pierce || 0,
            trail: def.pierce ? 2 : 0,
            life: rng / def.bspd + 0.1, srcW: w
          }));
        }
        muzzle(this, ang, def.col, 8);
        break;
      }

      case 'lob': {
        d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
        var tx = target.x, ty = target.y;
        var aa = Math.atan2(ty - this.y, tx - this.x);
        g.bullets.push(new G.Bullet({
          x: this.x, y: this.y,
          vx: Math.cos(aa) * def.bspd, vy: Math.sin(aa) * def.bspd,
          dmg: d.dmg, crit: d.crit, r: 7, sprite: 'w_grenade', scale: 2,
          col: def.col, mode: 'lob', tx: tx, ty: ty,
          boom: def.boom, boomDmg: d.dmg, spin: 9, life: 2.4, srcW: w, trail: 2
        }));
        break;
      }

      case 'cone': {
        var half2 = def.arc / 2;
        var ls3 = g.queryEnemies(this.x, this.y, rng + 20);
        for (i = 0; i < ls3.length; i++) {
          var e3 = ls3[i];
          if (e3.dead) continue;
          var dd3 = G.dist(this.x, this.y, e3.x, e3.y);
          if (dd3 > rng + e3.r) continue;
          if (Math.abs(angDiff(Math.atan2(e3.y - this.y, e3.x - this.x), ang)) > half2) continue;
          if (!hasLOS(this.x, this.y, e3.x, e3.y)) continue;
          d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
          g.damageEnemy(e3, d.dmg, {
            crit: d.crit, x: e3.x, y: e3.y, silent: Math.random() > 0.35,
            burn: def.burn,
            slow: def.slow, slowTime: def.slowTime,
            poison: def.poison ? def.poison + st.elementalDamage * 0.3 : 0,
            srcW: w
          });
        }
        for (i = 0; i < 3; i++) {
          var fa = ang + G.rand(-half2, half2);
          var fs = G.rand(rng * 1.4, rng * 2.4);
          g.particles.push(new G.Particle(
            this.x + Math.cos(ang) * 12, this.y + Math.sin(ang) * 12, {
              vx: Math.cos(fa) * fs, vy: Math.sin(fa) * fs,
              life: rng / fs * 1.1, size: G.rand(4, 8),
              col: G.pick(['#ffdd55', '#ff9a3a', '#ff5f2a']), drag: 0.94
            }));
        }
        break;
      }

      case 'chain': {
        d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
        chainLightning(g, this.x, this.y, target, d.dmg, d.crit, def.chain, def.chainRange, def.falloff, w, def.col);
        break;
      }

      case 'homing': {
        var hn = def.count || 1;
        for (i = 0; i < hn; i++) {
          d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
          var ha = ang + (hn > 1 ? (i / (hn - 1) - 0.5) * 0.5 : 0);
          g.bullets.push(new G.Bullet({
            x: this.x + Math.cos(ha) * 14, y: this.y + Math.sin(ha) * 14,
            vx: Math.cos(ha) * def.bspd, vy: Math.sin(ha) * def.bspd,
            dmg: d.dmg, crit: d.crit, r: 7, sprite: def.bullet || 'b_orb',
            col: def.col, mode: 'homing', turn: def.turn,
            life: 2.6, srcW: w, trail: 3
          }));
        }
        break;
      }

      case 'returner': {
        d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
        g.bullets.push(new G.Bullet({
          x: this.x, y: this.y,
          vx: Math.cos(ang) * def.bspd, vy: Math.sin(ang) * def.bspd,
          dmg: d.dmg, crit: d.crit, r: 10, sprite: 'w_boomerang', scale: 2,
          col: def.col, mode: 'returner', maxDist: rng, spin: 16,
          life: 4, srcW: w
        }));
        break;
      }

      case 'bouncer': {
        d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
        g.bullets.push(new G.Bullet({
          x: this.x, y: this.y,
          vx: Math.cos(ang) * def.bspd, vy: Math.sin(ang) * def.bspd,
          dmg: d.dmg, crit: d.crit, r: 8, sprite: 'w_shuriken', scale: 2,
          col: def.col, mode: 'bouncer', bounce: def.bounce, spin: 22,
          life: rng / def.bspd + 0.4, srcW: w
        }));
        break;
      }

      case 'turret': {
        if (g.turrets.length >= 4) { w.timer = 1.2; break; }
        g.turrets.push(new G.Turret(this.x, this.y, w, st));
        G.fx('ring', { x: this.x, y: this.y, r0: 4, r1: 40, col: '#e0902a', w: 3, life: 0.3 });
        break;
      }

      case 'drone': {
        if (g.drones.length >= (def.count || 1)) { w.timer = 1.0; break; }
        g.drones.push(new G.Drone(this.x, this.y, w, st));
        G.fx('ring', { x: this.x, y: this.y, r0: 4, r1: 34, col: def.col, w: 3, life: 0.3 });
        break;
      }

      case 'mine': {
        if (g.mines.length >= (def.cap || 6)) { w.timer = 0.8; break; }
        g.mines.push(new G.Mine(this.x, this.y, w, st));
        G.fx('ring', { x: this.x, y: this.y, r0: 4, r1: 20, col: '#ff9a3a', w: 3, life: 0.25 });
        break;
      }

      case 'pulse': {
        d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
        G.explode(this.x, this.y, rng, d.dmg, { crit: d.crit, col: def.col, srcW: w });
        if (def.slow) {
          var plist = g.queryEnemies(this.x, this.y, rng + 40);
          for (i = 0; i < plist.length; i++) {
            var se = plist[i];
            if (se.dead) continue;
            se.slowT = Math.max(se.slowT, def.slowTime || 1.2);
            se.slowMul = Math.min(se.slowMul, 1 - def.slow);
          }
        }
        break;
      }

      case 'orbit': {
        var on = def.count || 2;
        var od = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
        var olife = cd + 0.25;
        var oR = rng * (def.orbR || 0.62);
        for (i = 0; i < on; i++) {
          var oa = (i / on) * Math.PI * 2;
          g.bullets.push(new G.Bullet({
            x: this.x + Math.cos(oa) * oR, y: this.y + Math.sin(oa) * oR,
            vx: 0, vy: 0,
            dmg: od.dmg, crit: od.crit, r: 9, sprite: def.bullet || 'w_shuriken', scale: 2,
            col: def.col, mode: 'orbit', orbR: oR, orbAng: oa,
            orbSpd: def.orbSpd || 2.4, life: olife, srcW: w, spin: 18
          }));
        }
        G.fx('ring', { x: this.x, y: this.y, r0: oR * 0.7, r1: oR, col: def.col, w: 3, life: 0.3 });
        break;
      }
    }
  };

  Player.prototype.draw = function (c) {
    var cv = G.PX.get(this.char.sprite, 3);
    var bob = Math.sin(this.walkT) * 1.6;
    var inv = this.hitCd > 0 && Math.floor(this.hitCd * 22) % 2 === 0;

    if (this.hasSp('frostAura')) ringAura(c, this.x, this.y, 130, 'rgba(120,220,255,.12)', 'rgba(120,220,255,.35)');
    if (this.hasSp('poisonAura')) ringAura(c, this.x, this.y, 150, 'rgba(140,200,60,.10)', 'rgba(160,220,70,.30)');

    c.globalAlpha = 0.28; c.fillStyle = '#000';
    c.beginPath(); c.ellipse(this.x, this.y + 17, 12, 4.5, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;

    G.PX.draw(c, cv, this.x, this.y + bob, {
      flip: this.face < 0, flash: this.flash, alpha: inv ? 0.45 : 1
    });

    var n = this.weapons.length;
    for (var i = 0; i < n; i++) {
      var w = this.weapons[i];
      if (w.def.kind === 'turret' || w.def.kind === 'drone' || w.def.kind === 'mine') continue;
      var def = w.def;
      var a = w.angle;
      var reach = 13 + (i % 3) * 3;
      var rot = a + Math.PI / 2;
      if (def.kind === 'swing') {
        var sp = w.swingT > 0 ? (1 - w.swingT / 0.18) : 0;
        var half = (def.arc || 1.6) / 2;
        a = a - half + sp * 2 * half;
        rot = a + Math.PI / 2;
        reach += 3;
      } else if (def.kind === 'thrust') {
        var tp = w.swingT > 0 ? (1 - w.swingT / 0.16) : 0;
        reach += Math.sin(tp * Math.PI) * 16;
        rot = a + Math.PI / 2;
      } else if (w.swingT > 0) {
        reach -= 5;
      }
      var perp = (i - (n - 1) / 2) * 5;
      var wx = this.x + Math.cos(a) * reach + Math.cos(a + Math.PI / 2) * perp;
      var wy = this.y + Math.sin(a) * reach + Math.sin(a + Math.PI / 2) * perp + bob;
      var wc = G.weaponIcon(w.def, w.tier, 2);
      G.PX.draw(c, wc, wx, wy, { rot: rot, alpha: 0.96 });
    }
  };

  G.Player = Player;

  /* ------------------------------------------------------------
     工具
     ------------------------------------------------------------ */
  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  G.angDiff = angDiff;

  function distToSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var l2 = dx * dx + dy * dy;
    if (l2 === 0) return G.dist(px, py, x1, y1);
    var t = G.clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
    return G.dist(px, py, x1 + t * dx, y1 + t * dy);
  }
  G.distToSeg = distToSeg;

  function muzzle(p, a, col, n) {
    G.burst(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 18, n || 6, col, 190, { size: 3, lifeMul: 0.55, drag: 0.9 });
  }

  function ringAura(c, x, y, r, fill, stroke) {
    c.save();
    c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = stroke; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  function chainLightning(g, sx, sy, first, dmg, crit, jumps, range, falloff, w, col) {
    var cur = first, px = sx, py = sy, hit = [], pts, d = dmg;
    col = col || '#8fe8ff';
    for (var j = 0; j <= jumps && cur; j++) {
      pts = [px, py];
      var steps = 3;
      for (var s = 1; s < steps; s++) {
        var t = s / steps;
        pts.push(G.lerp(px, cur.x, t) + G.rand(-14, 14));
        pts.push(G.lerp(py, cur.y, t) + G.rand(-14, 14));
      }
      pts.push(cur.x, cur.y);
      G.fx('bolt', { pts: pts, col: col, w: 3, life: 0.18 });
      g.damageEnemy(cur, d, { crit: crit, x: cur.x, y: cur.y, noChain: true, srcW: w });
      hit.push(cur);
      px = cur.x; py = cur.y;
      d *= falloff;
      cur = g.nearestEnemy(px, py, range, hit);
    }
  }
  G.chainLightning = chainLightning;

})();
