/* ============================================================
   07b_enemy.js —— 敌人实体与 AI
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

    this.burnT = 0; this.burnDmg = 0;
    this.poisonT = 0; this.poisonDmg = 0;
    this.slowT = 0; this.slowMul = 1;
    this.stunT = 0;
    this.dotAcc = 0;

    // AI 状态
    this.state = 'idle';
    this.sTimer = G.rand(0.4, 1.6);
    this.fireT = G.rand(0.4, 1.6);
    this.phase = 1;
    this.spiralA = 0;
    this.volley = 0;
    this.wave = wave;
  }

  Enemy.prototype.hurt = function () { this.flash = 1; };

  /* ------------------------------------------------------------
     更新
     ------------------------------------------------------------ */
  Enemy.prototype.update = function (dt) {
    var g = G.game, p = g.player;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.contactCd = Math.max(0, this.contactCd - dt);

    /* 持续伤害 */
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

    /* 击退衰减 */
    var kd = Math.pow(0.86, dt * 60);
    this.kx *= kd; this.ky *= kd;

    /* AI */
    var slow = this.slowT > 0 ? this.slowMul : 1;
    var frost = (p.hasSp('frostAura') && G.dist(this.x, this.y, p.x, p.y) < 130) ? 0.7 : 1;
    var mul = slow * frost;
    if (this.stunT <= 0) this.ai(dt, p, g, mul);
    else { this.vx *= 0.85; this.vy *= 0.85; }

    /* 位移 */
    this.x += (this.vx + this.kx) * dt;
    this.y += (this.vy + this.ky) * dt;

    /* 边界 */
    var m = this.r;
    if (this.x < m) { this.x = m; this.kx = Math.abs(this.kx) * 0.4; }
    if (this.y < m) { this.y = m; this.ky = Math.abs(this.ky) * 0.4; }
    if (this.x > g.arena - m) { this.x = g.arena - m; this.kx = -Math.abs(this.kx) * 0.4; }
    if (this.y > g.arena - m) { this.y = g.arena - m; this.ky = -Math.abs(this.ky) * 0.4; }

    if (Math.abs(this.vx) > 2) this.face = this.vx > 0 ? 1 : -1;

    /* 接触伤害 */
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
        }
      }
    }
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
          this.shoot(a, def);
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

      case 'boss1': this.boss1(dt, p, g, a, d, mul); break;
      case 'boss2': this.boss2(dt, p, g, a, d, mul); break;
    }

    /* 铁卫的震荡波 */
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
          G.explode(this.x, this.y, 215, this.dmg * 0.9, { hostile: true, col: '#d97fb0' });
          g.shake(20, 0.45);
          this.state = 'idle'; this.sTimer = 1.6 / ps;
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

    switch (this.state) {
      case 'idle':
        this.moveTo(a, this.spd * mul * ps, dt);
        if (this.sTimer <= 0) {
          var opts = ['radial', 'dash', 'summon', 'spiral'];
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

    // 影子
    c.globalAlpha = 0.3 * alpha; c.fillStyle = '#000';
    c.beginPath(); c.ellipse(this.x, this.y + this.r * 0.85, this.r * 0.8, this.r * 0.3, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;

    // 精英/BOSS 光环
    if (def.elite || def.boss) {
      c.save();
      var pr = this.r + 8 + Math.sin(this.t * 3) * 3;
      c.strokeStyle = def.boss ? 'rgba(255,70,110,.55)' : 'rgba(255,190,80,.5)';
      c.lineWidth = 2;
      c.beginPath(); c.arc(this.x, this.y, pr, 0, Math.PI * 2); c.stroke();
      c.restore();
    }

    var tint = 0;
    if (this.slowT > 0) tint = 1;
    G.PX.draw(c, cv, this.x, this.y + bob, {
      flip: this.face < 0, flash: this.flash, alpha: alpha
    });

    if (tint) {
      c.save(); c.globalAlpha = 0.28; c.fillStyle = '#7fd8ff';
      c.beginPath(); c.arc(this.x, this.y, this.r, 0, Math.PI * 2); c.fill(); c.restore();
    }
    if (this.burnT > 0) {
      c.save(); c.globalAlpha = 0.16; c.fillStyle = '#ff8a3a';
      c.beginPath(); c.arc(this.x, this.y, this.r + 2, 0, Math.PI * 2); c.fill(); c.restore();
    }

    // 血条（精英 / BOSS / 受伤的大怪）
    if ((def.elite || this.maxHp > 60) && !def.boss && this.hp < this.maxHp) {
      var w = this.r * 2.2, h = 4;
      var x = this.x - w / 2, y = this.y - this.r - 11;
      c.fillStyle = '#000a'; c.fillRect(x - 1, y - 1, w + 2, h + 2);
      c.fillStyle = def.elite ? '#ffb347' : '#e5484d';
      c.fillRect(x, y, w * (this.hp / this.maxHp), h);
    }
  };

  G.Enemy = Enemy;

})();
