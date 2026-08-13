/* ============================================================
   16_collide.js —— 实体墙体碰撞（覆盖 06_entities 的子弹 / 掉落物）
   ============================================================ */
'use strict';

(function () {

  /* ---------- 子弹：撞墙消失 / 世界边界 ---------- */
  var _BulletUpdate = G.Bullet.prototype.update;
  G.Bullet.prototype.update = function (dt) {
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
        this.lastHit[oe._oid] = 0.4;
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
        g.particles.push(new G.Particle(this.x, this.y, {
          vx: G.rand(-18, 18), vy: G.rand(-18, 18),
          life: 0.24, size: this.trail, col: this.col, drag: 0.86
        }));
      }
    }

    if (this.mode === 'lob') {
      if (G.dist2(this.x, this.y, this.tx, this.ty) < 260) { this.expire(); return; }
    }

    /* 世界边界（搜打撤地图） */
    var pad = 40;
    var limW = g.map ? g.map.worldW - G.Map.WALL : g.arena;
    var limH = g.map ? g.map.worldH - G.Map.WALL : g.arena;
    if (this.x < -pad || this.y < -pad || this.x > limW + pad || this.y > limH + pad) {
      if (this.mode === 'returner' && !this.back) { this.back = true; this.hit = []; }
      else { this.dead = true; return; }
    }

    /* 撞墙：子弹消失（回旋镖反弹回程） */
    if (g.map && G.Map.solid(g.map, this.x, this.y)) {
      if (this.mode === 'returner' && !this.back) { this.back = true; this.hit = []; }
      else {
        this.dead = true;
        G.burst(this.x, this.y, 3, this.col, 80, { size: 2 });
        return;
      }
    }

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

  /* ---------- 掉落物：世界边界 / 不进墙 ---------- */
  G.Pickup.prototype.update = function (dt) {
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
    var nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    var limW = g.map ? g.map.worldW - G.Map.WALL : g.arena;
    var limH = g.map ? g.map.worldH - G.Map.WALL : g.arena;
    nx = G.clamp(nx, 10, limW - 10);
    ny = G.clamp(ny, 10, limH - 10);
    if (!g.map || !G.Map.solid(g.map, nx, ny)) {
      this.x = nx; this.y = ny;
    } else {
      this.vx *= 0.4; this.vy *= 0.4;
    }
    if (d < p.r + 6) { this.collect(); }
  };

})();
