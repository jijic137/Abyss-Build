/* ============================================================
   06_entities.js —— 弹幕 / 掉落 / 粒子 / 飘字 / 炮台 / 视觉特效
   ============================================================ */
'use strict';

(function () {

  /* ============================================================
     粒子（支持形态：dot 方块 / spark 火星长条 / debris 碎片 / glow 辉光）
     ============================================================ */
  function Particle(x, y, o) {
    o = o || {};
    this.x = x; this.y = y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.life = this.max = o.life || 0.4;
    this.size = o.size || 3;
    this.col = o.col || '#fff';
    this.drag = o.drag === undefined ? 0.90 : o.drag;
    this.shrink = o.shrink === undefined ? true : o.shrink;
    this.shape = o.shape || 'dot';
    this.grav = o.grav || 0;
    this.rot = o.rot !== undefined ? o.rot : G.rand(0, Math.PI * 2);
    this.rotSpd = o.rotSpd || 0;
    this.trail = o.trail || 0;
    this.dead = false;
  }
  Particle.prototype.update = function (dt) {
    this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    var d = Math.pow(this.drag, dt * 60);
    this.vx *= d; this.vy *= d;
    this.rot += this.rotSpd * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  };
  Particle.prototype.draw = function (c) {
    var t = this.life / this.max;
    var s = this.shrink ? this.size * t : this.size;
    if (s < 0.5) return;
    var x = this.x, y = this.y;
    c.globalAlpha = G.clamp(t * 1.4, 0, 1);
    if (this.shape === 'spark') {
      // 火星：沿速度方向的长条（拖尾感）
      var ang = Math.atan2(this.vy, this.vx) + (this.rotSpd ? this.rot : 0);
      var len = (this.trail || this.size * 2.6) * t + 1.5;
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      c.fillStyle = this.col;
      c.fillRect(0, -s * 0.28, len, s * 0.56);
      c.restore();
    } else if (this.shape === 'glow') {
      // 辉光：外层大而淡 + 内核小而亮
      var gs = s * (1.6 + t * 0.8);
      c.globalAlpha = G.clamp(t * 0.30, 0, 0.3);
      c.fillStyle = this.col;
      c.fillRect(x - gs, y - gs, gs * 2, gs * 2);
      c.globalAlpha = G.clamp(t * 1.1, 0, 1);
      c.fillRect(x - s * 0.35, y - s * 0.35, s * 0.7, s * 0.7);
    } else if (this.shape === 'debris') {
      // 碎片：旋转方块（受重力，见 update）
      c.save();
      c.translate(x, y);
      c.rotate(this.rot);
      c.fillStyle = this.col;
      c.fillRect(-s / 2, -s / 2, s, s * 0.62);
      c.restore();
    } else {
      c.fillStyle = this.col;
      c.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), Math.ceil(s), Math.ceil(s));
    }
    c.globalAlpha = 1;
  };
  G.Particle = Particle;

  /** 快捷爆点（支持 o.shape/grav/trail） */
  G.burst = function (x, y, n, col, spd, o) {
    o = o || {};
    var g = G.game;
    if (g.particles.length > 600) return;        // 性能护栏
    for (var i = 0; i < n; i++) {
      var a = G.rand(0, Math.PI * 2), s = G.rand(spd * 0.35, spd);
      g.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: G.rand(0.22, 0.55) * (o.lifeMul || 1),
        size: o.size || G.rand(2, 4.5),
        col: col, drag: o.drag,
        shape: o.shape, grav: o.grav, rotSpd: o.rotSpd, trail: o.trail
      }));
    }
  };

  /** 混合爆点：火花 + 碎片 + 辉光（命中 / 击杀 / 爆炸用，更有冲击力） */
  G.burstMix = function (x, y, n, col, spd, o) {
    o = o || {};
    var g = G.game;
    if (g.particles.length > 600) return;
    var i, a, s;
    // 火花（约 55%）：快、带拖尾、微重力
    var sn = Math.max(2, Math.round(n * 0.55));
    for (i = 0; i < sn; i++) {
      a = G.rand(0, Math.PI * 2); s = G.rand(spd * 0.4, spd);
      g.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: G.rand(0.16, 0.38) * (o.lifeMul || 1),
        size: G.rand(1.5, 3.2),
        col: col, drag: 0.88, shape: 'spark', grav: 140,
        rotSpd: G.rand(-6, 6), trail: 9
      }));
    }
    // 碎片（约 30%）：旋转方块、重一些
    var dn = Math.max(1, Math.round(n * 0.3));
    for (i = 0; i < dn; i++) {
      a = G.rand(0, Math.PI * 2); s = G.rand(spd * 0.2, spd * 0.55);
      g.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: G.rand(0.3, 0.6) * (o.lifeMul || 1),
        size: G.rand(2.5, 5),
        col: o.debCol || '#9aa7c8', drag: 0.9, shape: 'debris', grav: 380,
        rotSpd: G.rand(-10, 10)
      }));
    }
    // 辉光（少量）：慢速扩散、寿命长
    if (o.glow !== false) {
      var gn = Math.max(1, Math.round(n * 0.16));
      for (i = 0; i < gn; i++) {
        a = G.rand(0, Math.PI * 2); s = G.rand(6, 26);
        g.particles.push(new Particle(x, y, {
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: G.rand(0.4, 0.7) * (o.lifeMul || 1),
          size: G.rand(4, 7),
          col: o.glowCol || col, drag: 0.94, shape: 'glow'
        }));
      }
    }
  };

  /* ============================================================
     飘字
     ============================================================ */
  function FloatText(x, y, text, o) {
    o = o || {};
    this.x = x + G.rand(-6, 6); this.y = y;
    this.text = text;
    this.col = o.col || '#fff';
    this.size = o.size || 13;
    this.life = this.max = o.life || 0.72;
    this.vy = o.vy || -46;
    this.vx = G.rand(-14, 14);
    this.dead = false;
  }
  FloatText.prototype.update = function (dt) {
    this.y += this.vy * dt; this.x += this.vx * dt;
    this.vy += 62 * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  };
  FloatText.prototype.draw = function (c) {
    var t = this.life / this.max;
    c.globalAlpha = G.clamp(t * 1.8, 0, 1);
    c.font = '700 ' + this.size + 'px "Segoe UI", sans-serif';
    c.textAlign = 'center';
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)';
    c.strokeText(this.text, this.x, this.y);
    c.fillStyle = this.col;
    c.fillText(this.text, this.x, this.y);
    c.globalAlpha = 1;
  };
  G.FloatText = FloatText;
  G.popText = function (x, y, txt, o) { G.game.texts.push(new FloatText(x, y, txt, o)); };

  /* ============================================================
     视觉特效（环、闪光、闪电）
     ============================================================ */
  function Effect(type, o) {
    this.type = type;
    this.o = o || {};
    this.life = this.max = o.life || 0.34;
    this.dead = false;
  }
  Effect.prototype.update = function (dt) {
    this.life -= dt; if (this.life <= 0) this.dead = true;
  };
  Effect.prototype.draw = function (c) {
    var t = 1 - this.life / this.max, o = this.o;
    c.save();
    if (this.type === 'ring') {
      var r = G.lerp(o.r0 || 4, o.r1 || 60, t);
      c.globalAlpha = (1 - t) * (o.alpha || 0.9);
      c.strokeStyle = o.col || '#fff';
      c.lineWidth = (o.w || 4) * (1 - t * 0.6);
      c.beginPath(); c.arc(o.x, o.y, r, 0, Math.PI * 2); c.stroke();
    } else if (this.type === 'flash') {
      c.globalAlpha = (1 - t) * 0.9;
      c.fillStyle = o.col || '#fff';
      c.beginPath(); c.arc(o.x, o.y, (o.r || 40) * (0.4 + t * 0.8), 0, Math.PI * 2); c.fill();
      } else if (this.type === 'bolt') {
        // 连锁闪电：彩色外晕 + 白色内芯，更亮更精细
        var pts = o.pts;
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(pts[0], pts[1]);
        for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
        c.globalAlpha = (1 - t) * 0.5;
        c.strokeStyle = o.col || '#8fe8ff';
        c.lineWidth = (o.w || 3) * 3;
        c.stroke();
        c.globalAlpha = (1 - t);
        c.strokeStyle = '#ffffff';
        c.lineWidth = Math.max(1.2, (o.w || 3) * 0.6);
        c.stroke();
      } else if (this.type === 'arc') {
        // 近战挥砍弧（彩色外层 + 白色内芯，更精细）
        var aR = o.r * (0.86 + t * 0.2), a0 = o.a0 + t * 0.5, a1 = o.a1 + t * 0.5;
        c.lineCap = 'round';
        c.globalAlpha = (1 - t) * 0.55;
        c.strokeStyle = o.col || '#fff';
        c.lineWidth = (o.w || 7) * (1 - t * 0.5) * 2.1;
        c.beginPath(); c.arc(o.x, o.y, aR, a0, a1); c.stroke();
        c.globalAlpha = (1 - t) * 0.9;
        c.strokeStyle = '#ffffff';
        c.lineWidth = Math.max(1.5, (o.w || 7) * 0.42 * (1 - t * 0.5));
        c.beginPath(); c.arc(o.x, o.y, aR, a0, a1); c.stroke();
      }
    c.restore();
  };
  G.Effect = Effect;
  G.fx = function (type, o) { G.game.effects.push(new Effect(type, o)); };

  /* ============================================================
     子弹
     ============================================================ */
  function Bullet(o) {
    this.x = o.x; this.y = o.y;
    this.vx = o.vx; this.vy = o.vy;
    this.dmg = o.dmg;
    this.crit = !!o.crit;
    this.r = o.r || 5;
    this.life = o.life || 2.2;
    this.pierce = o.pierce || 0;
    this.hostile = !!o.hostile;
    this.sprite = o.sprite || 'b_small';
    this.col = o.col || '#ffd24a';
    this.scale = o.scale || 3;
    this.mode = o.mode || 'normal';   // normal / homing / lob / returner / bouncer
    this.knock = o.knock || 0;
    this.burn = o.burn || 0;
    this.poison = o.poison || 0;
    this.slow = o.slow || 0;
    this.slowTime = o.slowTime || 0;
    this.boom = o.boom || 0;
    this.boomDmg = o.boomDmg || 0;
    this.turn = o.turn || 0;
    this.bounce = o.bounce || 0;
    this.owner = o.owner || null;
    this.srcW = o.srcW || null;
    this.hit = [];
    this.dead = false;
    this.rot = Math.atan2(this.vy, this.vx);
    this.spin = o.spin || 0;
    this.trail = o.trail || 0;
    this.trailT = 0;

    // returner / lob 专用
    this.tx = o.tx; this.ty = o.ty;
    this.maxDist = o.maxDist || 0;
    this.travel = 0;
    this.back = false;

    // orbit 专用（绕玩家旋转的卫星刃）
    this.orbAng = o.orbAng || 0;
    this.orbR = o.orbR || 0;
    this.orbSpd = o.orbSpd || 2.0;
    this.lastHit = {};
  }

  Bullet.prototype.update = function (dt) {
    var g = G.game, i;
    this.life -= dt;
    if (this.life <= 0) { this.expire(); return; }

    if (this.mode === 'homing' && !this.hostile) {
      var t = g.nearestEnemy(this.x, this.y, 460, this.hit);
      if (t) {
        var want = Math.atan2(t.y - this.y, t.x - this.x);
        var cur = Math.atan2(this.vy, this.vx);
        var d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        cur += G.clamp(d, -this.turn * dt, this.turn * dt);
        var sp = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(cur) * sp; this.vy = Math.sin(cur) * sp;
      }
    }

    if (this.mode === 'returner') {
      if (!this.back) {
        this.travel += Math.hypot(this.vx, this.vy) * dt;
        if (this.travel >= this.maxDist) { this.back = true; this.hit = []; }
      } else {
        var p = g.player;
        var a = Math.atan2(p.y - this.y, p.x - this.x);
        var sp2 = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(a) * sp2; this.vy = Math.sin(a) * sp2;
        if (G.dist2(this.x, this.y, p.x, p.y) < 400) { this.dead = true; return; }
      }
    }

    // orbit：绕玩家旋转的卫星刃，持续命中（带每敌冷却避免单帧多次）
    if (this.mode === 'orbit') {
      var pl2 = g.player;
      if (!pl2 || pl2.dead) { this.dead = true; return; }
      for (var lk in this.lastHit) this.lastHit[lk] = Math.max(0, this.lastHit[lk] - dt);
      this.orbAng += this.orbSpd * dt;
      this.x = pl2.x + Math.cos(this.orbAng) * this.orbR;
      this.y = pl2.y + Math.sin(this.orbAng) * this.orbR;
      this.rot += this.spin * dt;
      var ols = g.queryEnemies(this.x, this.y, this.r + 26);
      for (i = 0; i < ols.length; i++) {
        var oe = ols[i];
        if (oe.dead) continue;
        if (oe._oid === undefined) oe._oid = (G._eoid = (G._eoid || 0) + 1);
        if (this.lastHit[oe._oid] > 0) continue;
        var orr = this.r + oe.r;
        if (G.dist2(this.x, this.y, oe.x, oe.y) > orr * orr) continue;
        this.lastHit[oe._oid] = 0.4;   // 同一敌人 0.4s 内不重复受击
        g.damageEnemy(oe, this.dmg, {
          crit: this.crit, x: oe.x, y: oe.y, knock: 50,
          kx: oe.x - this.x, ky: oe.y - this.y, srcW: this.srcW
        });
      }
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.spin * dt;
    if (!this.spin) this.rot = Math.atan2(this.vy, this.vx);

    if (this.trail > 0) {
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.02;
        g.particles.push(new Particle(this.x, this.y, {
          vx: G.rand(-18, 18), vy: G.rand(-18, 18),
          life: 0.24, size: this.trail, col: this.col, drag: 0.86
        }));
      }
    }

    // lob：到达落点即爆
    if (this.mode === 'lob') {
      if (G.dist2(this.x, this.y, this.tx, this.ty) < 260) { this.expire(); return; }
    }

    // 出界
    var pad = 40;
    if (this.x < -pad || this.y < -pad || this.x > g.arena + pad || this.y > g.arena + pad) {
      if (this.mode === 'returner' && !this.back) { this.back = true; this.hit = []; }
      else { this.dead = true; return; }
    }

    // 碰撞
    if (this.hostile) {
      var p2 = g.player;
      if (!p2.dead && G.dist2(this.x, this.y, p2.x, p2.y) < (this.r + p2.r) * (this.r + p2.r)) {
        p2.takeDamage(this.dmg, this);
        this.dead = true;
        G.burst(this.x, this.y, 5, this.col, 90);
      }
      return;
    }

    var list = g.queryEnemies(this.x, this.y, this.r + 30);
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.dead || this.hit.indexOf(e) >= 0) continue;
      var rr = this.r + e.r;
      if (G.dist2(this.x, this.y, e.x, e.y) > rr * rr) continue;
      this.onHitEnemy(e);
      if (this.dead) return;
    }
  };

  Bullet.prototype.onHitEnemy = function (e) {
    var g = G.game;
    this.hit.push(e);
    g.damageEnemy(e, this.dmg, {
      crit: this.crit, x: this.x, y: this.y,
      knock: this.knock, kx: this.vx, ky: this.vy,
      burn: this.burn, poison: this.poison,
      slow: this.slow, slowTime: this.slowTime,
      srcW: this.srcW
    });
    G.burst(this.x, this.y, 4, this.col, 110, { size: 2.5 });

    if (this.boom > 0) { this.expire(); return; }

    if (this.mode === 'bouncer' && this.bounce > 0) {
      this.bounce--;
      var t = g.nearestEnemy(this.x, this.y, 260, this.hit);
      if (t) {
        var a = Math.atan2(t.y - this.y, t.x - this.x);
        var sp = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
        this.life = Math.max(this.life, 0.9);
        return;
      }
      this.dead = true; return;
    }

    if (this.mode === 'returner') return;   // 回旋镖全穿透

    if (this.pierce > 0) { this.pierce--; return; }
    this.dead = true;
  };

  Bullet.prototype.expire = function () {
    this.dead = true;
    if (this.boom > 0) {
      G.explode(this.x, this.y, this.boom, this.boomDmg || this.dmg, {
        crit: this.crit, col: this.col, hostile: this.hostile
      });
    }
  };

  Bullet.prototype.draw = function (c) {
    var cv = G.PX.getTint(this.sprite, this.col, this.scale);
    G.PX.draw(c, cv, this.x, this.y, { rot: this.rot });
  };
  G.Bullet = Bullet;

  /** 范围爆炸 */
  G.explode = function (x, y, radius, dmg, o) {
    o = o || {};
    var g = G.game, i;
    // 双环：内白外色（更强的爆发层次）
    G.fx('ring', { x: x, y: y, r0: 6, r1: radius, col: o.col || '#ffb347', w: 5, life: 0.36 });
    G.fx('ring', { x: x, y: y, r0: 4, r1: radius * 0.55, col: '#ffffff', w: 3, life: 0.22 });
    G.fx('flash', { x: x, y: y, r: radius * 0.62, col: o.col || '#ffd98a', life: 0.16 });
    G.burstMix(x, y, 18, o.col || '#ff9a3a', 300, { glow: true, debCol: o.debCol });
    g.shake(6, 0.18);

    if (o.hostile) {
      var p = g.player;
      if (!p.dead && G.dist(x, y, p.x, p.y) < radius + p.r) p.takeDamage(dmg, { x: x, y: y });
      return;
    }
    var list = g.queryEnemies(x, y, radius + 40);
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.dead) continue;
      var d = G.dist(x, y, e.x, e.y);
      if (d > radius + e.r) continue;
      var falloff = G.clamp(1 - (d / (radius + e.r)) * 0.45, 0.55, 1);
      g.damageEnemy(e, dmg * falloff, {
        crit: o.crit, x: e.x, y: e.y, knock: 140,
        kx: e.x - x, ky: e.y - y, noChain: true, srcW: o.srcW
      });
    }
  };

  /* ============================================================
     掉落物
     ============================================================ */
  function Pickup(x, y, type, value) {
    this.x = x; this.y = y;
    this.type = type;           // 'mat' | 'heal'
    this.value = value;
    var a = G.rand(0, Math.PI * 2), s = G.rand(30, 105);
    this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
    this.r = 8;
    this.t = G.rand(0, 6);
    this.dead = false;
    this.magnet = false;
  }
  Pickup.prototype.update = function (dt) {
    var g = G.game, p = g.player;
    this.t += dt;
    var range = 62 * (1 + p.st.pickupRange / 100);
    var d = G.dist(this.x, this.y, p.x, p.y);
    if (d < range) this.magnet = true;
    if (this.magnet) {
      var a = Math.atan2(p.y - this.y, p.x - this.x);
      var sp = G.clamp(700 - d * 1.6, 240, 760);
      this.vx = G.lerp(this.vx, Math.cos(a) * sp, 0.22);
      this.vy = G.lerp(this.vy, Math.sin(a) * sp, 0.22);
    } else {
      var dd = Math.pow(0.90, dt * 60);
      this.vx *= dd; this.vy *= dd;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.x = G.clamp(this.x, 8, g.arena - 8);
    this.y = G.clamp(this.y, 8, g.arena - 8);
    if (d < p.r + 6) { this.collect(); }
  };
  Pickup.prototype.collect = function () {
    var g = G.game, p = g.player;
    this.dead = true;
    if (this.type === 'mat') {
      g.addMaterials(this.value);
      p.addXp(this.value);
      G.burst(this.x, this.y, 3, '#ffd24a', 90, { size: 2 });
      G.Audio.sfx('pickup');
    } else {
      p.heal(this.value);
      G.popText(this.x, this.y - 8, '+' + this.value, { col: '#6ee787', size: 12 });
      G.burst(this.x, this.y, 5, '#6ee787', 110, { size: 2.5 });
      G.Audio.sfx('heal');
    }
  };
  Pickup.prototype.draw = function (c) {
    var bob = Math.sin(this.t * 5) * 2;
    var cv = G.PX.get(this.type === 'mat' ? 'p_mat' : 'p_heal', 3);
    G.PX.draw(c, cv, this.x, this.y + bob);
  };
  G.Pickup = Pickup;

  /* ============================================================
     炮台（工程武器）
     ============================================================ */
  function Turret(x, y, w, st) {
    this.x = x; this.y = y;
    this.w = w;
    this.st = st;
    this.life = w.def.tlife;
    this.max = w.def.tlife;
    this.timer = 0;
    this.angle = -Math.PI / 2;
    this.r = 14;
    this.dead = false;
    this.flash = 0;
  }
  Turret.prototype.update = function (dt) {
    var g = G.game;
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      G.burst(this.x, this.y, 10, '#e0902a', 150);
      return;
    }
    this.flash = Math.max(0, this.flash - dt * 4);
    var def = this.w.def;
    var rng = def.range * G.F.rangeMul(this.st.range);
    var t = g.nearestEnemy(this.x, this.y, rng);
    if (!t) return;
    this.angle = Math.atan2(t.y - this.y, t.x - this.x);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = def.tcd * G.F.cdMul(this.st.attackSpeed);
      var d = G.F.weaponDamage(this.st, { base: G.wDamage(this.w), tags: def.tags });
      if (def.laser) {
        // 激光塔：高速穿透光束
        g.bullets.push(new Bullet({
          x: this.x + Math.cos(this.angle) * 12,
          y: this.y + Math.sin(this.angle) * 12,
          vx: Math.cos(this.angle) * def.bspd,
          vy: Math.sin(this.angle) * def.bspd,
          dmg: d.dmg, crit: d.crit, r: 4, sprite: 'b_bullet',
          col: '#aee8ff', pierce: def.pierce || 3, life: rng / def.bspd + 0.2, srcW: this.w
        }));
      } else {
        g.bullets.push(new Bullet({
          x: this.x + Math.cos(this.angle) * 12,
          y: this.y + Math.sin(this.angle) * 12,
          vx: Math.cos(this.angle) * def.bspd,
          vy: Math.sin(this.angle) * def.bspd,
          dmg: d.dmg, crit: d.crit, r: 5, sprite: 'b_bullet',
          col: '#ffc45a', life: rng / def.bspd + 0.15, srcW: this.w
        }));
      }
      this.flash = 1;
      G.burst(this.x + Math.cos(this.angle) * 14, this.y + Math.sin(this.angle) * 14, 3, def.laser ? '#aef4ff' : '#ffd98a', 120, { size: 2 });
    }
  };
  Turret.prototype.draw = function (c) {
    var a = this.life < 3 ? (Math.sin(this.life * 18) > 0 ? 0.45 : 1) : 1;
    var cv = G.PX.getTint('w_turret', '#e0902a', 3);
    G.PX.draw(c, cv, this.x, this.y, { alpha: a, flash: this.flash * 0.6 });
    // 炮口方向
    c.save(); c.globalAlpha = a * 0.9;
    c.strokeStyle = '#ffd98a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(this.x, this.y);
    c.lineTo(this.x + Math.cos(this.angle) * 17, this.y + Math.sin(this.angle) * 17);
    c.stroke(); c.restore();
  };
  G.Turret = Turret;

  /* ============================================================
     无人机：跟随玩家、自动索敌射击（工程）
     ============================================================ */
  function Drone(x, y, w, st) {
    this.x = x; this.y = y;
    this.w = w; this.st = st;
    this.life = w.def.tlife || 20;
    this.max = this.life;
    this.timer = 0;
    this.angle = -Math.PI / 2;
    this.r = 10;
    this.dead = false;
    this.flash = 0;
    this.bob = G.rand(0, Math.PI * 2);
  }
  Drone.prototype.update = function (dt) {
    var g = G.game, p = g.player;
    this.life -= dt;
    if (this.life <= 0 || p.dead) {
      this.dead = true;
      G.burst(this.x, this.y, 8, '#4fd0e8', 150);
      return;
    }
    this.flash = Math.max(0, this.flash - dt * 4);
    // 环绕玩家悬浮（可被拉扯，不是死钉在轨道上）
    this.bob += dt * 1.9;
    var tx = p.x + Math.cos(this.bob) * 58;
    var ty = p.y + Math.sin(this.bob * 0.9) * 42 - 18;
    this.x = G.lerp(this.x, tx, G.clamp(dt * 3.2, 0, 1));
    this.y = G.lerp(this.y, ty, G.clamp(dt * 3.2, 0, 1));
    // 索敌射击
    var def = this.w.def;
    var rng = def.range * G.F.rangeMul(this.st.range);
    var t = g.nearestEnemy(this.x, this.y, rng);
    if (!t) return;
    this.angle = Math.atan2(t.y - this.y, t.x - this.x);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = def.tcd * G.F.cdMul(this.st.attackSpeed);
      var d = G.F.weaponDamage(this.st, { base: G.wDamage(this.w), tags: def.tags });
      g.bullets.push(new Bullet({
        x: this.x + Math.cos(this.angle) * 10,
        y: this.y + Math.sin(this.angle) * 10,
        vx: Math.cos(this.angle) * def.bspd,
        vy: Math.sin(this.angle) * def.bspd,
        dmg: d.dmg, crit: d.crit, r: 4, sprite: 'b_bullet',
        col: '#8fe8ff', life: rng / def.bspd + 0.15, srcW: this.w
      }));
      this.flash = 1;
      G.burst(this.x + Math.cos(this.angle) * 12, this.y + Math.sin(this.angle) * 12, 2, '#aef4ff', 110, { size: 2 });
    }
  };
  Drone.prototype.draw = function (c) {
    var a = this.life < 3 ? (Math.sin(this.life * 18) > 0 ? 0.45 : 1) : 1;
    var cv = G.PX.getTint('w_drone', '#4fd0e8', 2.6);
    G.PX.draw(c, cv, this.x, this.y, { alpha: a, flash: this.flash * 0.6, rot: this.angle + Math.PI / 2 });
    // 旋翼（旋转的圆弧）
    c.save(); c.globalAlpha = a * 0.85;
    c.strokeStyle = '#9ff0ff'; c.lineWidth = 2;
    c.beginPath(); c.arc(this.x, this.y - 11, 6 + Math.sin(this.bob * 6) * 2, 0, Math.PI * 2); c.stroke();
    c.restore();
  };
  G.Drone = Drone;

  /* ============================================================
     震荡地雷：部署后敌人靠近即引爆（工程）
     ============================================================ */
  function Mine(x, y, w, st) {
    this.x = x; this.y = y;
    this.w = w; this.st = st;
    this.arm = (w.def.armT || 0.45);
    this.r = 9;
    this.dead = false;
    this.blink = G.rand(0, Math.PI * 2);
  }
  Mine.prototype.update = function (dt) {
    var g = G.game;
    if (this.arm > 0) { this.arm -= dt; return; }
    this.blink += dt * 5;
    var def = this.w.def;
    var t = g.nearestEnemy(this.x, this.y, 34);
    if (t) {
      this.dead = true;
      var d = G.F.weaponDamage(this.st, { base: G.wDamage(this.w), tags: def.tags });
      G.explode(this.x, this.y, def.rad, d.dmg, { col: '#ff9a3a', crit: d.crit, srcW: this.w });
      G.Audio.sfx('hit');
    }
  };
  Mine.prototype.draw = function (c) {
    var blink = this.arm > 0 ? 0.35 : (Math.sin(this.blink) > 0 ? 0.55 : 1);
    var cv = G.PX.getTint('w_mine', '#e0902a', 2);
    G.PX.draw(c, cv, this.x, this.y, { alpha: blink, flash: 0 });
    // 警示圈
    if (this.arm <= 0) {
      c.save(); c.globalAlpha = 0.22; c.strokeStyle = '#ff9a3a'; c.lineWidth = 2;
      c.beginPath(); c.arc(this.x, this.y, this.w.def.rad * 0.35, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
  };
  G.Mine = Mine;

})();
