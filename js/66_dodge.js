/* ============================================================
   66_dodge.js ?? Shift ????? + ??? + ???
   ??? G.Player ??????
   ???????dodgeCd / dodgeCdMax / dodgeT / dodgeLock / dodgeDX / dodgeDY
   ????? takeDamage ????????????
   update ???????? 07_player.js??????????
   ============================================================ */
'use strict';

(function () {
  var G = window.G || (window.G = {});
  var P = G.Player;
  if (!P) return;

  /* ???? */
  var CFG = {
    cdMax: 1.0,     // ?????
    iframes: 0.30,  // ??????
    dash: 0.18,     // ???????
    burstSpd: 650   // ????
  };

  function ensure(p) {
    if (!p._dodgeInit) {
      p._dodgeInit = true;
      p.dodgeCd = 0;
      p.dodgeCdMax = CFG.cdMax;
      p.dodgeT = 0;
      p.dodgeLock = 0;
      p.dodgeDX = 1;
      p.dodgeDY = 0;
    }
    return p;
  }

  /* ????? */
  P.prototype.dodgeReady = function () {
    return !!(this && !this.dead && this.dodgeCd <= 0);
  };

  /* ???? */
  P.prototype.dodge = function () {
    ensure(this);
    if (this.dead || this.dodgeCd > 0) return false;
    var g = G.game;
    if (!g || g.state !== 'play') return false;

    this.dodgeCd = CFG.cdMax;
    this.dodgeT = CFG.iframes;
    this.dodgeLock = CFG.dash;

    /* ??????????????????? */
    var dx = 0, dy = 0;
    if (g.key) {
      if (g.key('left')) dx -= 1;
      if (g.key('right')) dx += 1;
      if (g.key('up')) dy -= 1;
      if (g.key('down')) dy += 1;
    }
    if (dx === 0 && dy === 0) { dx = this.face; dy = 0; }
    var len = Math.hypot(dx, dy) || 1;
    this.dodgeDX = dx / len;
    this.dodgeDY = dy / len;
    if (dx !== 0) this.face = dx > 0 ? 1 : -1;

    /* ?????SFX ???????? */
    if (G.Audio && G.Audio.sfx) { try { G.Audio.sfx('swing'); } catch (e) {} }
    if (G.fx) { try { G.fx('ring', { x: this.x, y: this.y, r0: 4, r1: 90, col: '#7fd8ff', w: 5, life: 0.32 }); } catch (e) {} }
    if (G.burst) { try { G.burst(this.x, this.y, 14, '#7fd8ff', 240, { size: 3, lifeMul: 0.7 }); } catch (e) {} }
    if (G.popText) { try { G.popText(this.x, this.y - 34, '??', { col: '#7fd8ff', size: 17, life: 0.7 }); } catch (e) {} }
    return true;
  };

  /* ???????? */
  var _td = P.prototype.takeDamage;
  P.prototype.takeDamage = function (raw, src) {
    if (this.dodgeT > 0) {
      if (G.popText) { try { G.popText(this.x, this.y - 20, '??', { col: '#7fd8ff', size: 12, life: 0.4 }); } catch (e) {} }
      this.hitCd = Math.max(this.hitCd || 0, 0.2);
      return;
    }
    return _td.call(this, raw, src);
  };

  /* 保留 07_player.js 的原版 update，在其基础上增量叠加闪避，
     避免日后 07 内新增移动/技能逻辑时本副本静默过期。 */
  var _origUpdate = P.prototype.update;

  P.prototype.update = function (dt) {
    ensure(this);

    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.dodgeT = Math.max(0, this.dodgeT - dt);
    var dashing = this.dodgeLock > 0;
    this.dodgeLock = Math.max(0, this.dodgeLock - dt);

    /* 原版逻辑（移动/碰撞/回血/光环/技能/武器开火） */
    _origUpdate.call(this, dt);

    /* 闪避冲刺：在原版移动基础上叠加 dash 位移（分轴 + 墙体碰撞） */
    if (dashing) {
      var g = G.game;
      var m = g && g.map;
      var nx = this.x + this.dodgeDX * CFG.burstSpd * dt;
      var ny = this.y + this.dodgeDY * CFG.burstSpd * dt;
      if (!m || !G.Map.bboxSolid(m, nx, this.y, this.r)) this.x = nx;
      if (!m || !G.Map.bboxSolid(m, this.x, ny, this.r)) this.y = ny;
      if (G.collideWorld) {
        var cl = G.collideWorld(this.x, this.y, this.r);
        this.x = cl.x; this.y = cl.y;
      }
      this.vx = this.dodgeDX * CFG.burstSpd;
      this.vy = this.dodgeDY * CFG.burstSpd;
    }
  };
})();
