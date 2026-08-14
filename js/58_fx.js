/* ============================================================
   58_fx.js —— 局内表现增强
   - 弹道 / 拾取物辉光（预渲染光晕，性能友好）
   - 区域氛围粒子（每层专属浮尘色彩）
   - 精英 / BOSS 击杀顿帧 + 暴击飘字
   ============================================================ */
'use strict';

(function () {

  /* ------------------------------------------------------------
     1. 预渲染辉光圆点
     ------------------------------------------------------------ */
  var _glowCache = {};
  G.glowDot = function (col, r) {
    var key = col + '|' + r;
    if (_glowCache[key]) return _glowCache[key];
    var s = Math.ceil(r * 2 + 6);
    var cv = document.createElement('canvas');
    cv.width = s; cv.height = s;
    var c = cv.getContext('2d');
    var g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
    return (_glowCache[key] = cv);
  };

  function glow(c, x, y, col, r, a) {
    var cv = G.glowDot(col, r);
    if (!cv) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = a == null ? 0.5 : a;
    c.drawImage(cv, x - cv.width / 2, y - cv.height / 2);
    c.restore();
  }

  /* ------------------------------------------------------------
     2. 弹道辉光
     ------------------------------------------------------------ */
  var _bdraw = G.Bullet.prototype.draw;
  G.Bullet.prototype.draw = function (c) {
    glow(c, this.x, this.y, this.col, 11, 0.40);
    _bdraw.call(this, c);
  };

  /* ------------------------------------------------------------
     3. 拾取物辉光
     ------------------------------------------------------------ */
  var _pdraw = G.Pickup.prototype.draw;
  G.Pickup.prototype.draw = function (c) {
    glow(c, this.x, this.y, this.type === 'mat' ? '#ffd24a' : '#6ee787', 15, 0.32);
    _pdraw.call(this, c);
  };

  /* ------------------------------------------------------------
     4. 区域氛围粒子
     ------------------------------------------------------------ */
  var _upd = G.game.update;
  G.game.update = function (dt) {
    var g = this;
    /* 击杀顿帧：暂停更新但仍渲染 */
    if (g._hitStop > 0) {
      g._hitStop -= dt;
      return;
    }
    var r = _upd.call(this, dt);
    if (g.state === 'play' && g.map && g.player && g.particles.length < 480) {
      g._moteT = (g._moteT || 0) + dt;
      var z = null;
      if (G.Art && G.Art.themeOf) {
        try {
          var th = G.Art.themeOf(g.map.tierId || 1);
          z = th && th.particles ? { col: th.particles.col } : null;
        } catch (e) { z = null; }
      }
      if (z && g._moteT > 0.22) {
        g._moteT = 0;
        var px = g.camX + G.rand(0, g.vw);
        var py = g.camY + G.rand(0, g.vh);
        var a = G.rand(0, Math.PI * 2), sp = G.rand(6, 24);
        g.particles.push(new G.Particle(px, py, {
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 10,
          life: G.rand(1.5, 3.0),
          size: G.rand(1.2, 2.4),
          col: z.col,
          drag: 0.985,
          shape: 'glow',
          grav: -2
        }));
      }
    }
    return r;
  };

  /* ------------------------------------------------------------
     5. 精英 / BOSS 击杀顿帧
     ------------------------------------------------------------ */
  var _kill3 = G.game.killEnemy;
  G.game.killEnemy = function (e) {
    var r = _kill3.call(this, e);
    if (e && e.def) {
      if (e.def.boss) this._hitStop = Math.max(this._hitStop || 0, 0.12);
      else if (e.def.elite) this._hitStop = Math.max(this._hitStop || 0, 0.05);
    }
    return r;
  };

  /* ------------------------------------------------------------
     6. 暴击飘字
     ------------------------------------------------------------ */
  var _dmg = G.game.damageEnemy;
  G.game.damageEnemy = function (e, dmg, o) {
    o = o || {};
    var crit = !!o.crit;
    var r = _dmg.apply(this, arguments);
    if (crit && e && !e.dead) {
      G.popText(e.x + G.rand(-6, 6), e.y - e.r * 0.9 - 20, '暴击!', {
        col: '#ffd24a', size: 13, life: 0.55
      });
    }
    return r;
  };

})();
