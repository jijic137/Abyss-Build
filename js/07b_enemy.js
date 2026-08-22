/* ============================================================
   07b_enemy.js —— 敌人实体与 AI（搜打撤版：分轴碰撞 / 房间归属 / 视线）
   修复穿墙与瞬移：移动改为分轴 + 包围盒判定。
   ============================================================ */
'use strict';

(function () {

  function Enemy(def, x, y, wave) {
    var sc = def.noScale ? { hp: 1, dmg: 1, spd: 1, mat: 1 } : G.waveScale(wave);
    this.def = def;
    this.isEnemy = true;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.kx = 0; this.ky = 0;
    this.r = def.r;
    this.maxHp = Math.max(1, Math.round(def.hp * sc.hp));
    this.hp = this.maxHp;
    this.dmg = def.dmg * sc.dmg;
    this.armor = def.armor || 0;
    this.spd = def.spd * sc.spd;
    this.mat = Math.max(1, Math.round(def.mat * sc.mat));
    this.face = 1;
    this.dead = false;
    this.flash = 0;
    this.t = G.rand(0, 10);
    this.contactCd = 0;
    this.room = -1;

    this.burnT = 0; this.burnDmg = 0;
    this.poisonT = 0; this.poisonDmg = 0;
    this.slowT = 0; this.slowMul = 1;
    this.stunT = 0;
    this.dotAcc = 0;

    this.state = 'idle';
    this.sTimer = G.rand(0.4, 1.6);
    this.fireT = G.rand(0.4, 1.6);
    this.phase = 1;
    this.spiralA = 0;
    this.volley = 0;
    this.wave = wave;
    this.wanderA = G.rand(0, Math.PI * 2);
    this.wanderT = G.rand(1, 2.5);
  }

  Enemy.prototype.hurt = function () { this.flash = 1; this.hurtT = 0.11; };

  /* 世界边界夹紧（碰撞已在移动时分轴处理） */
  Enemy.prototype._clampMove = function () {
    var g = G.game, m = g.map;
    if (!m) {
      this.x = G.clamp(this.x, this.r, g.arena - this.r);
      this.y = G.clamp(this.y, this.r, g.arena - this.r);
      return;
    }
    var W = G.Map.WALL;
    this.x = G.clamp(this.x, W + this.r, m.worldW - W - this.r);
    this.y = G.clamp(this.y, W + this.r, m.worldH - W - this.r);
  };

  /* ------------------------------------------------------------
     更新
     ------------------------------------------------------------ */
  Enemy.prototype.update = function (dt) {
    var g = G.game, p = g.player;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.contactCd = Math.max(0, this.contactCd - dt);

    if (this.burnT > 0) {
      this.burnT -= dt;
      this.dotAcc += this.burnDmg * dt;
      if (Math.random() < dt * 12) {
        g.particles.push(new G.Particle(this.x + G.rand(-6, 6), this.y + G.rand(-8, 4), {
          vx: G.rand(-10, 10), vy: G.rand(-40, -14), life: 0.35,
          size: G.rand(2, 4), col: G.pick(['#ffdd55', '#ff8a3a'])
        }));
      }
    }
    if (this.poisonT > 0) {
      this.poisonT -= dt;
      this.dotAcc += this.poisonDmg * dt;
      if (Math.random() < dt * 8) {
        g.particles.push(new G.Particle(this.x + G.rand(-6, 6), this.y, {
          vx: G.rand(-8, 8), vy: G.rand(-24, -6), life: 0.4,
          size: 2.5, col: '#9be86f'
        }));
      }
    }
    if (this.dotAcc >= 1) {
      var d = Math.floor(this.dotAcc);
      this.dotAcc -= d;
      g.damageEnemy(this, d, { x: this.x, y: this.y, silent: true, noChain: true, dot: true });
      if (this.dead) return;
    }
    if (this.slowT > 0) this.slowT -= dt; else this.slowMul = 1;
    if (this.stunT > 0) this.stunT -= dt;

    var kd = Math.pow(0.86, dt * 60);
    this.kx *= kd; this.ky *= kd;

    var slow = this.slowT > 0 ? this.slowMul : 1;
    var frost = (p.hasSp('frostAura') && G.dist(this.x, this.y, p.x, p.y) < 130) ? 0.7 : 1;
    var mul = slow * frost;

    var sameRoom = !g.map || this.room < 0 || this.room === p.room;
    if (this.stunT <= 0) {
      if (sameRoom) this.ai(dt, p, g, mul);
      else this.wander(dt, mul);
    } else {
      this.vx *= 0.85; this.vy *= 0.85;
    }

    /* 分轴移动 + 包围盒碰撞（不可穿墙） */
    var m = g.map;
    if (m) {
      var ex = this.x + (this.vx + this.kx) * dt;
      var ey = this.y + (this.vy + this.ky) * dt;
      if (!G.Map.bboxSolid(m, ex, this.y, this.r)) this.x = ex;
      else { this.vx = 0; this.kx = 0; }
      if (!G.Map.bboxSolid(m, this.x, ey, this.r)) this.y = ey;
      else { this.vy = 0; this.ky = 0; }
    } else {
      this.x += (this.vx + this.kx) * dt;
      this.y += (this.vy + this.ky) * dt;
    }
    this._clampMove();

    if (Math.abs(this.vx) > 2) this.face = this.vx > 0 ? 1 : -1;

    if (g.map && this.room >= 0 && this.room !== p.room && G.dist(this.x, this.y, p.x, p.y) > 1500) {
      G.burst(this.x, this.y, 4, '#556', 80);
      this.dead = true;
      return;
    }

    if (!p.dead) {
      var rr = this.r + p.r;
      if (G.dist2(this.x, this.y, p.x, p.y) < rr * rr && this.contactCd <= 0) {
        if (this.def.ai === 'bomber') {
          this.fuseNow = true;
        } else {
          p.takeDamage(this.dmg, this);
          this.contactCd = 0.55;
          this.kx += (this.x - p.x) * 2.2;
          this.ky += (this.y - p.y) * 2.2;
          if (this.affixes && this.hp < this.maxHp) {
            for (var vi = 0; vi < this.affixes.length; vi++) {
              if (this.affixes[vi].id === 'vamp') {
                var vh = Math.max(1, Math.round(this.dmg * 0.35));
                this.hp = Math.min(this.maxHp, this.hp + vh);
                G.popText(this.x, this.y - this.r - 12, '+' + vh, { col: '#ff6a92', size: 11, life: 0.5 });
                break;
              }
            }
          }
        }
      }
    }
  };

  /* 巡逻：房间内随机游荡 */
  Enemy.prototype.wander = function (dt, mul) {
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = G.rand(1.2, 2.6);
      this.wanderA = G.rand(0, Math.PI * 2);
    }
    var m = G.game.map;
    if (m) {
      var rm = m.rooms[this.room];
      if (rm) {
        var rc = G.Map.roomRect(rm.c, rm.r);
        var cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
        if (G.dist(this.x, this.y, cx, cy) > ROOM_WANDER_R) this.wanderA = Math.atan2(cy - this.y, cx - this.x);
      }
    }
    this.moveTo(this.wanderA, this.spd * 0.35 * mul, dt);
  };

  /* ------------------------------------------------------------
     AI 分派
     ------------------------------------------------------------ */
  Enemy.prototype.ai = function (dt, p, g, mul) {
    var def = this.def;
    var a = Math.atan2(p.y - this.y, p.x - this.x);
    var d = G.dist(this.x, this.y, p.x, p.y);

    switch (def.ai) {

      case 'chase':
      case 'splitter':
        this.moveTo(a, this.spd * mul, dt);
        break;

      case 'zigzag': {
        var wob = Math.sin(this.t * (def.wob || 2.5)) * 0.7;
        this.moveTo(a + wob, this.spd * mul, dt);
        break;
      }

      case 'leaper': {
        this.sTimer -= dt;
        if (this.state === 'leap') {
          if (this.sTimer <= 0) { this.state = 'idle'; this.sTimer = def.leapCd; }
          break;
        }
        if (this.sTimer <= 0 && d < 330) {
          this.state = 'leap';
          this.sTimer = def.leapTime;
          this.vx = Math.cos(a) * def.leapSpd * mul;
          this.vy = Math.sin(a) * def.leapSpd * mul;
          G.burst(this.x, this.y, 5, '#b07fe8', 90, { size: 2 });
        } else {
          this.moveTo(a, this.spd * 0.72 * mul, dt);
        }
        break;
      }

      case 'shooter': {
        var keep = def.keep;
        if (d > keep + 30) this.moveTo(a, this.spd * mul, dt);
        else if (d < keep - 60) this.moveTo(a + Math.PI, this.spd * 0.85 * mul, dt);
        else this.moveTo(a + Math.PI / 2 * (Math.sin(this.t * 0.7) > 0 ? 1 : -1), this.spd * 0.55 * mul, dt);
        this.fireT -= dt * mul;
        if (this.fireT <= 0 && d < keep + 130) {
          this.fireT = def.fireCd;
          if (!g.map || G.Map.los(g.map, this.x, this.y, p.x, p.y)) this.shoot(a, def);
        }
        break;
      }

      case 'bomber': {
        this.moveTo(a, this.spd * mul, dt);
        if (this.fuseNow || d < this.r + p.r + 14) {
          this.state = 'fuse';
        }
        if (this.state === 'fuse') {
          this.fuse = (this.fuse || 0) + dt;
          this.flash = Math.max(this.flash, (Math.sin(this.fuse * 30) + 1) / 2);
          if (this.fuse >= def.fuse) this.blow();
        }
        break;
      }

      case 'charger': {
        this.sTimer -= dt;
        if (this.state === 'wind') {
          this.vx *= 0.8; this.vy *= 0.8;
          this.chargeA = a;
          this.flash = Math.max(this.flash, 0.5 + Math.sin(this.t * 30) * 0.4);
          if (this.sTimer <= 0) {
            this.state = 'dash'; this.sTimer = def.chargeTime;
            G.burst(this.x, this.y, 10, '#ffb347', 180);
          }
        } else if (this.state === 'dash') {
          this.vx = Math.cos(this.chargeA) * def.chargeSpd * mul;
          this.vy = Math.sin(this.chargeA) * def.chargeSpd * mul;
          if (Math.random() < dt * 30) {
            g.particles.push(new G.Particle(this.x, this.y, {
              vx: G.rand(-30, 30), vy: G.rand(-30, 30), life: 0.3, size: 3, col: '#c98a5a'
            }));
          }
          if (this.sTimer <= 0) { this.state = 'idle'; this.sTimer = def.chargeCd; }
        } else {
          this.moveTo(a, this.spd * 0.6 * mul, dt);
          if (this.sTimer <= 0 && d < 400) { this.state = 'wind'; this.sTimer = def.windup; }
        }
        break;
      }

      case 'summoner': {
        this.moveTo(a, this.spd * mul, dt);
        this.fireT -= dt;
        if (this.fireT <= 0) {
          this.fireT = def.sumCd;
          for (var i = 0; i < def.sumCount; i++) {
            var aa = G.rand(0, Math.PI * 2);
            g.spawnEnemy(def.sumWhat, this.x + Math.cos(aa) * 34, this.y + Math.sin(aa) * 34);
          }
          G.fx('ring', { x: this.x, y: this.y, r0: 6, r1: 70, col: '#9be86f', w: 4, life: 0.4 });
        }
        break;
      }

      case 'orbit': {
        /* 保持中距离环绕玩家，周期性甩出扇形弹幕 */
        var orbitDir = (((this.t * 0.8) % 2) > 1) ? -1 : 1;
        var tang = a + Math.PI / 2 * orbitDir;
        var radialOff = d - def.orbitR;
        var ang = (Math.abs(radialOff) > 40) ? a : tang;
        this.moveTo(ang + Math.sin(this.t * 1.7) * 0.22, this.spd * mul, dt);
        this.fireT -= dt;
        if (this.fireT <= 0) {
          this.fireT = def.orbitCd;
          if (!g.map || G.Map.los(g.map, this.x, this.y, p.x, p.y)) {
            this.shoot(a, def);
            if (def.salvoArc) this.shoot(a - def.salvoArc / 2, def);
            else this.shoot(a - 0.28, def);
            if (def.salvoArc) this.shoot(a + def.salvoArc / 2, def);
            else this.shoot(a + 0.28, def);
          }
        }
        break;
      }

      case 'boss1': this.boss1(dt, p, g, a, d, mul); break;
      case 'boss2': this.boss2(dt, p, g, a, d, mul); break;
      case 'boss3': this.boss3(dt, p, g, a, d, mul); break;
    }

    if (this.def.shockCd) {
      this.shockT = (this.shockT === undefined ? this.def.shockCd : this.shockT) - dt;
      if (this.shockT <= 0 && d < this.def.shockR + 60) {
        this.shockT = this.def.shockCd;
        G.fx('ring', { x: this.x, y: this.y, r0: 10, r1: this.def.shockR, col: '#ff8a5a', w: 6, life: 0.4 });
        g.shake(7, 0.2);
        if (d < this.def.shockR) p.takeDamage(this.def.shockDmg * G.waveScale(this.wave).dmg, this);
      }
    }
  };

  Enemy.prototype.moveTo = function (a, spd, dt) {
    this.vx = G.lerp(this.vx, Math.cos(a) * spd, G.clamp(9 * dt, 0, 1));
    this.vy = G.lerp(this.vy, Math.sin(a) * spd, G.clamp(9 * dt, 0, 1));
  };

  Enemy.prototype.shoot = function (a, def) {
    var g = G.game, n = def.salvo || 1, arc = def.salvoArc || 0;
    for (var i = 0; i < n; i++) {
      var aa = a + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0);
      g.ebullets.push(new G.Bullet({
        x: this.x + Math.cos(aa) * this.r, y: this.y + Math.sin(aa) * this.r,
        vx: Math.cos(aa) * def.bspd, vy: Math.sin(aa) * def.bspd,
        dmg: def.bdmg * G.waveScale(this.wave).dmg,
        r: 6, sprite: 'b_orb', col: '#ff5f7a', hostile: true, life: 4, trail: 2
      }));
    }
    G.burst(this.x, this.y, 4, '#ff5f7a', 100, { size: 2 });
  };

  Enemy.prototype.blow = function () {
    var g = G.game, def = this.def;
    this.dead = true;
    this.exploded = true;
    G.explode(this.x, this.y, def.boomR, def.boomDmg * G.waveScale(this.wave).dmg,
      { hostile: true, col: '#ff9a3a' });
    g.dropLoot(this);
  };

  /* ------------------------------------------------------------
     BOSS 1 —— 腐化巨兽
     ------------------------------------------------------------ */
  Enemy.prototype.boss1 = function (dt, p, g, a, d, mul) {
    var hpr = this.hp / this.maxHp;
    if (hpr < 0.5 && this.phase === 1) {
      this.phase = 2;
      G.fx('ring', { x: this.x, y: this.y, r0: 20, r1: 320, col: '#ff5f7a', w: 8, life: 0.7 });
      G.popText(this.x, this.y - 60, '狂暴！', { col: '#ff5f7a', size: 24, life: 1.4 });
      g.shake(18, 0.5);
    }
    var ps = this.phase === 2 ? 1.35 : 1;
    this.sTimer -= dt;

    switch (this.state) {
      case 'idle':
        this.moveTo(a, this.spd * mul * ps, dt);
        if (this.sTimer <= 0) {
          var opts = ['slam', 'charge', 'summon'];
          if (this.phase === 2) opts.push('spray');
          this.state = G.pick(opts) + 'Wind';
          this.sTimer = this.state === 'chargeWind' ? 0.65 : 0.85;
        }
        break;

      case 'slamWind':
        this.vx *= 0.82; this.vy *= 0.82;
        this.flash = Math.max(this.flash, 0.4 + Math.sin(this.t * 26) * 0.35);
        if (this.sTimer <= 0) {
          this.state = 'slam';
          this.sTimer = 0;
          this.slamN = this.phase === 2 ? 3 : 1;
        }
        break;

      case 'slam':
        this.vx *= 0.8; this.vy *= 0.8;
        if (this.sTimer <= 0) {
          this.slamN--;
          var rr = 200 + (this.slamN * 8);
          G.explode(this.x, this.y, rr, this.dmg * 0.9, { hostile: true, col: '#d97fb0' });
          G.fx('ring', { x: this.x, y: this.y, r0: 16, r1: rr, col: '#ff7f9a', w: 6, life: 0.45 });
          g.shake(this.slamN >= 0 ? 18 : 20, 0.4);
          if (this.slamN > 0) { this.sTimer = 0.32; }
          else { this.state = 'idle'; this.sTimer = 1.6 / ps; }
        }
        break;

      case 'chargeWind':
        this.vx *= 0.8; this.vy *= 0.8;
        this.chargeA = a;
        this.flash = Math.max(this.flash, 0.5);
        if (this.sTimer <= 0) { this.state = 'charge'; this.sTimer = 1.1; }
        break;

      case 'charge':
        this.vx = Math.cos(this.chargeA) * 520 * ps;
        this.vy = Math.sin(this.chargeA) * 520 * ps;
        if (Math.random() < dt * 40) G.burst(this.x, this.y, 1, '#8c3f6b', 60, { size: 4 });
        if (this.sTimer <= 0) { this.state = 'idle'; this.sTimer = 1.3 / ps; }
        break;

      case 'summonWind':
        this.vx *= 0.85; this.vy *= 0.85;
        if (this.sTimer <= 0) {
          for (var i = 0; i < (this.phase === 2 ? 8 : 5); i++) {
            var aa = Math.PI * 2 * i / 6;
            g.spawnEnemy(G.pick(['worm', 'bat', 'skeleton']),
              this.x + Math.cos(aa) * 70, this.y + Math.sin(aa) * 70);
          }
          G.fx('ring', { x: this.x, y: this.y, r0: 10, r1: 110, col: '#c07fd8', w: 5, life: 0.5 });
          this.state = 'idle'; this.sTimer = 1.5 / ps;
        }
        break;

      case 'sprayWind':
        this.vx *= 0.85; this.vy *= 0.85;
        if (this.sTimer <= 0) {
          for (var k = 0; k < 14; k++) {
            var ang = Math.PI * 2 * k / 14 + this.t;
            g.ebullets.push(new G.Bullet({
              x: this.x, y: this.y,
              vx: Math.cos(ang) * 210, vy: Math.sin(ang) * 210,
              dmg: this.dmg * 0.5, r: 7, sprite: 'b_orb', col: '#e07fb0',
              hostile: true, life: 5, trail: 2
            }));
          }
          this.state = 'idle'; this.sTimer = 1.2;
        }
        break;
    }
  };

  /* ------------------------------------------------------------
     BOSS 2 —— 深渊之主
     ------------------------------------------------------------ */
  Enemy.prototype.boss2 = function (dt, p, g, a, d, mul) {
    var hpr = this.hp / this.maxHp;
    if (hpr < 0.65 && this.phase === 1) this.enterPhase(2, g);
    if (hpr < 0.30 && this.phase === 2) this.enterPhase(3, g);
    var ps = 1 + (this.phase - 1) * 0.28;
    this.sTimer -= dt;

    if (this.rifts && this.rifts.length) {
      for (var ri = this.rifts.length - 1; ri >= 0; ri--) {
        var rf = this.rifts[ri];
        rf.fuse -= dt;
        if (rf.fuse <= 0) {
          G.explode(rf.x, rf.y, rf.rad, this.dmg * 0.55, { hostile: true, col: '#8f4aff' });
          this.rifts.splice(ri, 1);
        }
      }
    }

    switch (this.state) {
      case 'idle':
        this.moveTo(a, this.spd * mul * ps, dt);
        if (this.sTimer <= 0) {
          var opts = ['radial', 'dash', 'summon', 'spiral'];
          if (this.phase >= 3) opts.push('rift');
          this.state = G.pick(opts) + 'Wind';
          this.sTimer = 0.7;
          this.volley = 0;
        }
        break;

      case 'radialWind':
        this.vx *= 0.82; this.vy *= 0.82;
        this.flash = Math.max(this.flash, 0.35 + Math.sin(this.t * 24) * 0.3);
        if (this.sTimer <= 0) { this.state = 'radial'; this.sTimer = 0; this.volley = 0; }
        break;

      case 'radial':
        if (this.sTimer <= 0) {
          var n = 14 + this.phase * 4;
          for (var i = 0; i < n; i++) {
            var ang = Math.PI * 2 * i / n + this.volley * 0.22;
            g.ebullets.push(new G.Bullet({
              x: this.x, y: this.y,
              vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230,
              dmg: this.dmg * 0.42, r: 7, sprite: 'b_orb', col: '#8f7fff',
              hostile: true, life: 6, trail: 2
            }));
          }
          g.shake(6, 0.15);
          this.volley++;
          this.sTimer = 0.42;
          if (this.volley >= 2 + this.phase) { this.state = 'idle'; this.sTimer = 1.3 / ps; }
        }
        this.vx *= 0.9; this.vy *= 0.9;
        break;

      case 'spiralWind':
        this.vx *= 0.85; this.vy *= 0.85;
        if (this.sTimer <= 0) { this.state = 'spiral'; this.sTimer = 2.2 + this.phase * 0.4; this.spiralA = 0; }
        break;

      case 'spiral':
        this.vx *= 0.92; this.vy *= 0.92;
        this.spiralA += dt * 4.2;
        if (Math.random() < dt * 26) {
          for (var s = 0; s < 2 + this.phase; s++) {
            var sa = this.spiralA + Math.PI * 2 * s / (2 + this.phase);
            g.ebullets.push(new G.Bullet({
              x: this.x, y: this.y,
              vx: Math.cos(sa) * 195, vy: Math.sin(sa) * 195,
              dmg: this.dmg * 0.34, r: 6, sprite: 'b_small', col: '#c07fff',
              hostile: true, life: 6, scale: 4
            }));
          }
        }
        if (this.sTimer <= 0) { this.state = 'idle'; this.sTimer = 1.1 / ps; }
        break;

      case 'dashWind':
        this.vx *= 0.78; this.vy *= 0.78;
        this.chargeA = a;
        this.flash = Math.max(this.flash, 0.6);
        if (this.sTimer <= 0) { this.state = 'dash'; this.sTimer = 0.85; this.dashN = (this.dashN || 0); }
        break;

      case 'dash':
        this.vx = Math.cos(this.chargeA) * 640 * ps;
        this.vy = Math.sin(this.chargeA) * 640 * ps;
        if (Math.random() < dt * 50) {
          g.ebullets.push(new G.Bullet({
            x: this.x, y: this.y, vx: G.rand(-30, 30), vy: G.rand(-30, 30),
            dmg: this.dmg * 0.3, r: 8, sprite: 'b_small', col: '#6f5fd8',
            hostile: true, life: 1.8, scale: 4
          }));
        }
        if (this.sTimer <= 0) {
          this.dashN++;
          if (this.dashN % (1 + this.phase) === 0) { this.state = 'idle'; this.sTimer = 1.2 / ps; }
          else { this.state = 'dashWind'; this.sTimer = 0.42; }
        }
        break;

      case 'summonWind':
        this.vx *= 0.85; this.vy *= 0.85;
        if (this.sTimer <= 0) {
          var pool = this.phase >= 3 ? ['wraith', 'bomber', 'charger'] : ['wraith', 'bomber', 'skeleton'];
          for (var q = 0; q < 5 + this.phase * 2; q++) {
            var qa = G.rand(0, Math.PI * 2), qd = G.rand(60, 130);
            g.spawnEnemy(G.pick(pool), this.x + Math.cos(qa) * qd, this.y + Math.sin(qa) * qd);
          }
          G.fx('ring', { x: this.x, y: this.y, r0: 12, r1: 160, col: '#8f7fff', w: 6, life: 0.6 });
          this.state = 'idle'; this.sTimer = 1.4 / ps;
        }
        break;

      case 'riftWind':
        this.vx *= 0.85; this.vy *= 0.85;
        this.flash = Math.max(this.flash, 0.4 + Math.sin(this.t * 22) * 0.3);
        if (this.sTimer <= 0) {
          this.rifts = this.rifts || [];
          var m = g.map, W = G.Map.WALL;
          var lo = W + 60, hiW = m ? m.worldW - W - 60 : g.arena - 60;
          var hiH = m ? m.worldH - W - 60 : g.arena - 60;
          for (var rk = 0; rk < 4; rk++) {
            var ra = Math.PI * 2 * rk / 4 + G.rand(-0.25, 0.25);
            var rd = G.rand(90, 150);
            var rx = G.clamp(p.x + Math.cos(ra) * rd, lo, hiW);
            var ry = G.clamp(p.y + Math.sin(ra) * rd, lo, hiH);
            this.rifts.push({ x: rx, y: ry, fuse: 1.1 + rk * 0.15, rad: 95 });
            G.fx('ring', { x: rx, y: ry, r0: 8, r1: 70, col: '#b98aff', w: 4, life: 0.5 });
          }
          G.popText(p.x, p.y - 40, '深渊裂地！', { col: '#c07fff', size: 20, life: 1.2 });
          this.state = 'idle'; this.sTimer = 1.3 / ps;
        }
        break;
    }
  };

  /* ------------------------------------------------------------
     BOSS 3 —— 幽影霸主
     阶段 1：环形弹幕 + 寒潮地板（贴近减速）
     阶段 2（<55%）：幽灵分身直线狙击 + 大范围寒潮环
     ------------------------------------------------------------ */
  Enemy.prototype.boss3 = function (dt, p, g, a, d, mul) {
    if (this.hp / this.maxHp < 0.45 && this.phase === 1) {
      this.phase = 2;
      G.fx('ring', { x: this.x, y: this.y, r0: 20, r1: 420, col: '#7fd8ff', w: 9, life: 0.9 });
      G.popText(this.x, this.y - 66, '寒潮迸涌！', { col: '#7fd8ff', size: 24, life: 1.6 });
      g.shake(20, 0.6);
      this.state = 'idle'; this.sTimer = 0.5;
    }
    var ps = this.phase === 2 ? 1.25 : 1;
    this.sTimer -= dt;

    switch (this.state) {
      case 'idle':
        this.moveTo(a, this.spd * mul * ps, dt);
        if (this.sTimer <= 0) {
          var opts = ['ring', 'frost', 'ghost'];
          this.state = G.pick(opts) + 'Wind';
          this.sTimer = 0.55;
        }
        break;

      case 'ringWind':
        this.vx *= 0.82; this.vy *= 0.82;
        if (this.sTimer <= 0) { this.state = 'ring'; this.sTimer = 0; this.volley = 0; }
        break;

      case 'ring':
        if (this.sTimer <= 0) {
          var n = this.phase === 2 ? 22 : 16;
          var ang0 = this.t;
          for (var i = 0; i < n; i++) {
            var ang = Math.PI * 2 * i / n + ang0;
            g.ebullets.push(new G.Bullet({
              x: this.x + Math.cos(ang) * this.r, y: this.y + Math.sin(ang) * this.r,
              vx: Math.cos(ang) * 235, vy: Math.sin(ang) * 235,
              dmg: this.dmg * (this.phase === 2 ? 0.5 : 0.42), r: 7,
              sprite: 'b_orb', col: '#6fd8ff', hostile: true, life: 7, trail: 2
            }));
          }
          g.shake(6, 0.12);
          this.volley++;
          this.sTimer = 0.5;
          if (this.volley >= 2 + this.phase) { this.state = 'idle'; this.sTimer = 1.2 / ps; }
        }
        this.vx *= 0.9; this.vy *= 0.9;
        break;

      case 'frostWind':
        this.vx *= 0.85; this.vy *= 0.85;
        if (this.sTimer <= 0) { this.state = 'frost'; this.sTimer = 0.06; this.frostN = 0; }
        break;

      case 'frost':
        this.vx *= 0.9; this.vy *= 0.9;
        this.sTimer -= dt;
        if (this.frosts) {
          for (var fi = this.frosts.length - 1; fi >= 0; fi--) {
            this.frosts[fi].t -= dt;
            if (this.frosts[fi].t <= 0) this.frosts.splice(fi, 1);
          }
        }
        if (this.sTimer <= 0 && this.frostN < (this.phase === 2 ? 6 : 4)) {
          this.frostN++;
          this.sTimer = 0.5;
          this.frosts = this.frosts || [];
          this.frosts.push({ x: p.x + G.rand(-70, 140), y: p.y + G.rand(-70, 140),
            r: 96, t: 3.2 });
          G.fx('ring', { x: this.x, y: this.y, r0: 8, r1: 120, col: '#7fd8ff', w: 4, life: 0.45 });
        } else if (this.sTimer <= 0) {
          this.state = 'idle'; this.sTimer = 1.2 / ps;
        }
        break;

      case 'ghostWind':
        this.vx *= 0.8; this.vy *= 0.8;
        this.chargeA = a;
        this.flash = Math.max(this.flash, 0.55);
        if (this.sTimer <= 0) { this.state = 'ghost'; this.sTimer = 0.62; this.ghostN = 0; }
        break;

      case 'ghost':
        this.vx = Math.cos(this.chargeA) * (this.phase === 2 ? 680 : 560) * ps;
        this.vy = Math.sin(this.chargeA) * (this.phase === 2 ? 680 : 560) * ps;
        if (Math.random() < dt * 40) G.burst(this.x, this.y, 1, '#9fe8ff', 60, { size: 4 });
        if (this.sTimer <= 0) {
          this.ghostN++;
          if (this.ghostN % (1 + this.phase) === 0) { this.state = 'idle'; this.sTimer = 1.1 / ps; }
          else { this.state = 'ghostWind'; this.sTimer = 0.4; }
        }
        break;
    }
  };

  Enemy.prototype.enterPhase = function (n, g) {
    this.phase = n;
    G.fx('ring', { x: this.x, y: this.y, r0: 20, r1: 380, col: '#ff4a6b', w: 9, life: 0.8 });
    G.popText(this.x, this.y - 70, '第 ' + n + ' 阶段', { col: '#ff6b8a', size: 26, life: 1.6 });
    g.shake(22, 0.6);
    this.state = 'idle'; this.sTimer = 0.6;
  };

  /* ------------------------------------------------------------
     绘制
     ------------------------------------------------------------ */
  Enemy.prototype.draw = function (c) {
    var def = this.def;
    var cv = G.PX.get(def.sprite, def.sc);
    var bob = Math.sin(this.t * 6) * (def.boss ? 2.5 : 1.4);
    var alpha = def.ghost ? 0.62 + Math.sin(this.t * 3) * 0.14 : 1;
    var jx = 0, jy = 0;
    if (this.hurtT > 0) {
      var k = Math.floor(this.hurtT * 60) % 2 ? 1.6 : -1.6;
      jx = k * (this.hurtT > 0.06 ? 1 : 0.6);
      jy = k * 0.8;
    }
    var dx = this.x + jx, dy = this.y + jy;

    c.globalAlpha = 0.3 * alpha; c.fillStyle = '#000';
    c.beginPath(); c.ellipse(this.x, this.y + this.r * 0.85, this.r * 0.8, this.r * 0.3, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;

    if (def.elite || def.boss) {
      c.save();
      var pr = this.r + 8 + Math.sin(this.t * 3) * 3;
      c.strokeStyle = def.boss ? 'rgba(255,70,110,.55)' : 'rgba(255,190,80,.5)';
      c.lineWidth = 2;
      c.beginPath(); c.arc(this.x, this.y, pr, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    if (this.frosts && this.frosts.length) {
      for (var fdi = 0; fdi < this.frosts.length; fdi++) {
        var fp = this.frosts[fdi];
        var fade = Math.max(0, Math.min(1, fp.t / 3.2));
        c.save();
        c.globalAlpha = 0.22 * fade;
        c.fillStyle = '#8fd8ff';
        c.beginPath(); c.arc(fp.x, fp.y, fp.r, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 0.9 * fade;
        c.strokeStyle = '#a8ecff'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(fp.x, fp.y, fp.r, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 0.5 * fade;
        c.beginPath(); c.arc(fp.x, fp.y, 6, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }
    if (this.affixes && this.affixes.length) {
      c.save();
      for (var qi = 0; qi < this.affixes.length; qi++) {
        var afq = this.affixes[qi];
        var ar = this.r + 11 + Math.sin(this.t * 3 + qi * 2.1) * 3 + qi * 6;
        c.strokeStyle = afq.color;
        c.lineWidth = 2;
        c.beginPath(); c.arc(this.x, this.y, ar, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
      c.save();
      c.font = 'bold 11px monospace'; c.textAlign = 'center';
      var sy2 = this.y - this.r - 22;
      for (var si2 = 0; si2 < this.affixes.length; si2++) {
        c.fillStyle = this.affixes[si2].color;
        c.fillText(this.affixes[si2].mark, this.x + (si2 - (this.affixes.length - 1) / 2) * 13, sy2);
      }
      c.restore();
    }

    var tint = 0;
    if (this.slowT > 0) tint = 1;
    G.PX.draw(c, cv, dx, dy + bob, {
      flip: this.face < 0, flash: this.flash, alpha: alpha
    });

    if (tint) {
      c.save(); c.globalAlpha = 0.28; c.fillStyle = '#7fd8ff';
      c.beginPath(); c.arc(dx, dy, this.r, 0, Math.PI * 2); c.fill(); c.restore();
    }
    if (this.burnT > 0) {
      c.save(); c.globalAlpha = 0.16; c.fillStyle = '#ff8a3a';
      c.beginPath(); c.arc(dx, dy, this.r + 2, 0, Math.PI * 2); c.fill(); c.restore();
    }

    if ((def.elite || this.maxHp > 60) && !def.boss && this.hp < this.maxHp) {
      var w = this.r * 2.2, h = 4;
      var hx = dx - w / 2, hy = dy - this.r - 11;
      c.fillStyle = '#000a'; c.fillRect(hx - 1, hy - 1, w + 2, h + 2);
      c.fillStyle = def.elite ? '#ffb347' : '#e5484d';
      c.fillRect(hx, hy, w * (this.hp / this.maxHp), h);
    }

    if (this.rifts && this.rifts.length) {
      c.save();
      for (var rki = 0; rki < this.rifts.length; rki++) {
        var rfp = this.rifts[rki];
        var blink = (Math.sin(rfp.fuse * 14) > 0) ? 0.55 : 1;
        c.globalAlpha = blink;
        c.strokeStyle = '#c07fff';
        c.lineWidth = 3;
        c.beginPath(); c.arc(rfp.x, rfp.y, 55, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = blink * 0.25;
        c.fillStyle = '#8f4aff';
        c.beginPath(); c.arc(rfp.x, rfp.y, 45, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
  };

  G.Enemy = Enemy;

  var ROOM_WANDER_R = 260;

})();
