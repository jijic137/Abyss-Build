/* ============================================================
   07_player.js —— 玩家角色 + 武器开火逻辑 + 敌人实体
   ============================================================ */
'use strict';

(function () {

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

    this.items = [];                 // 物品定义数组（可重复）
    this.weapons = [];               // 武器实例数组，最多 6
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
    this.recalc();
  }

  /** 重新计算最终属性（基础 + 角色 + 物品 + 武器附加） */
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

    // 最大生命变化时同步当前生命
    if (old && s.maxHp > old) this.hp += (s.maxHp - old);
    this.hp = G.clamp(this.hp, 1, s.maxHp);

    // 特殊效果集合
    this.sp = {};
    for (i = 0; i < this.items.length; i++) {
      if (this.items[i].sp) this.sp[this.items[i].sp] = (this.sp[this.items[i].sp] || 0) + 1;
    }
  };

  Player.prototype.hasSp = function (k) { return !!this.sp[k]; };

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

    // 荆棘反伤
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

    /* 移动 */
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
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.x = G.clamp(this.x, this.r, g.arena - this.r);
    this.y = G.clamp(this.y, this.r, g.arena - this.r);
    if (len > 0) {
      this.walkT += dt * 10;
      if (Math.random() < dt * 14) {
        g.particles.push(new G.Particle(this.x + G.rand(-5, 5), this.y + 14, {
          vx: -this.vx * 0.12, vy: G.rand(-12, -3),
          life: 0.3, size: 2.5, col: '#3a4258'
        }));
      }
    }

    /* 生命回复 */
    if (this.st.hpRegen > 0 && this.hp < this.st.maxHp) {
      this.regenAcc += this.st.hpRegen * dt;
      if (this.regenAcc >= 1) {
        var h = Math.floor(this.regenAcc);
        this.regenAcc -= h;
        this.heal(h);
      }
    }

    /* 光环类特效 */
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

    /* 雷霆光环：周期性向最近敌人释放连锁闪电 */
    this.thunderT = (this.thunderT || 0) - dt;
    if (this.hasSp('thunderAura') && this.thunderT <= 0) {
      this.thunderT = 0.9;
      var tt = g.nearestEnemy(this.x, this.y, 200);
      if (tt) G.chainLightning(g, this.x, this.y, tt, 8 + this.st.elementalDamage * 0.6, false, 3, 160, 0.82, null, '#9fe8ff');
    }

    /* 武器开火 */
    for (i = 0; i < this.weapons.length; i++) this.updateWeapon(this.weapons[i], dt, i);
  };

  /* ------------------------------------------------------------
     武器逻辑
     ------------------------------------------------------------ */
  Player.prototype.updateWeapon = function (w, dt, idx) {
    var g = G.game, def = w.def, st = this.st;
    w.swingT = Math.max(0, w.swingT - dt);
    w.timer -= dt;
    if (w.timer > 0) return;

    var rng = def.range * G.F.rangeMul(st.range);
    var target = g.nearestEnemy(this.x, this.y, rng);
    if (!target && def.kind !== 'turret' && def.kind !== 'pulse' && def.kind !== 'orbit') return;

    var cd = G.wCooldown(w) * G.F.cdMul(st.attackSpeed);
    w.timer = cd;
    if (def.kind !== 'swing' && def.kind !== 'thrust') w.swingT = Math.max(w.swingT, 0.07);
    var isMelee = (def.kind === 'swing' || def.kind === 'thrust');
    var pan = target ? Math.max(-1, Math.min(1, Math.cos(Math.atan2(target.y - this.y, target.x - this.x)) * 0.8)) : 0;
    G.Audio.sfx(isMelee ? 'swing' : 'fire', isMelee ? 0 : pan);

    var ang = target ? Math.atan2(target.y - this.y, target.x - this.x) : -Math.PI / 2;
    w.angle = ang;
    this.face = Math.cos(ang) >= 0 ? 1 : -1;

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
        var hitAny = false;
        var ls = g.queryEnemies(this.x, this.y, rng + 30);
        for (i = 0; i < ls.length; i++) {
          var e = ls[i];
          if (e.dead) continue;
          var dd = G.dist(this.x, this.y, e.x, e.y);
          if (dd > rng + e.r) continue;
          var da = Math.abs(angDiff(Math.atan2(e.y - this.y, e.x - this.x), ang));
          if (da > half) continue;
          d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
          g.damageEnemy(e, d.dmg, {
            crit: d.crit, x: e.x, y: e.y, knock: def.knock,
            kx: e.x - this.x, ky: e.y - this.y, stun: def.stun, srcW: w
          });
          hitAny = true;
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
          d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
          g.damageEnemy(e3, d.dmg, {
            crit: d.crit, x: e3.x, y: e3.y, silent: Math.random() > 0.35,
            burn: def.burn,
            slow: def.slow, slowTime: def.slowTime,
            poison: def.poison ? def.poison + st.elementalDamage * 0.3 : 0,
            srcW: w
          });
        }
        // 火焰粒子
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

      case 'pulse': {
        d = G.F.weaponDamage(st, { base: G.wDamage(w), tags: def.tags });
        G.explode(this.x, this.y, rng, d.dmg, { crit: d.crit, col: def.col, srcW: w });
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

    // 霜寒/毒雾光环
    if (this.hasSp('frostAura')) ringAura(c, this.x, this.y, 130, 'rgba(120,220,255,.12)', 'rgba(120,220,255,.35)');
    if (this.hasSp('poisonAura')) ringAura(c, this.x, this.y, 150, 'rgba(140,200,60,.10)', 'rgba(160,220,70,.30)');

    // 影子
    c.globalAlpha = 0.28; c.fillStyle = '#000';
    c.beginPath(); c.ellipse(this.x, this.y + 17, 12, 4.5, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;

    G.PX.draw(c, cv, this.x, this.y + bob, {
      flip: this.face < 0, flash: this.flash, alpha: inv ? 0.45 : 1
    });

    // 武器手持造型：朝目标悬浮，按 kind 做挥砍/突刺/后坐动画
    var n = this.weapons.length;
    for (var i = 0; i < n; i++) {
      var w = this.weapons[i];
      if (w.def.kind === 'turret') continue;
      var def = w.def;
      var a = w.angle;
      var reach = 13 + (i % 3) * 3;
      var rot = a + Math.PI / 2;            // 图标尖端指向目标
      if (def.kind === 'swing') {
        var sp = w.swingT > 0 ? (1 - w.swingT / 0.18) : 0;   // 0→1 挥砍进度
        var half = (def.arc || 1.6) / 2;
        a = a - half + sp * 2 * half;        // 沿弧扫动
        rot = a + Math.PI / 2;
        reach += 3;
      } else if (def.kind === 'thrust') {
        var tp = w.swingT > 0 ? (1 - w.swingT / 0.16) : 0;
        reach += Math.sin(tp * Math.PI) * 16; // 突刺前冲后回
        rot = a + Math.PI / 2;
      } else if (w.swingT > 0) {
        reach -= 5;                           // 远程开火微后坐
      }
      var perp = (i - (n - 1) / 2) * 5;       // 多武器沿垂直方向错开避免重叠
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

  /** 连锁闪电 */
  function chainLightning(g, sx, sy, first, dmg, crit, jumps, range, falloff, w, col) {
    var cur = first, px = sx, py = sy, hit = [], pts, d = dmg;
    col = col || '#8fe8ff';
    for (var j = 0; j <= jumps && cur; j++) {
      pts = [px, py];
      // 折线
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
