/* ============================================================
   37_fix.js —— 碰撞/撤离加固
   1) 帧末位置安全校验：任何原因导致玩家中心进墙，立即解析回最近安全点
   2) 撤离引导定时器：死亡/离开范围/重复触发都会正确清理，不再串局
   3) 传送落点安全化：传送后若落点被卡，就近找安全点
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* 找最近安全点：沿四方向扫描，取最近的非实心位置 */
  function resolveFree(m, x, y, r) {
    var W = G.Map.WALL;
    x = G.clamp(x, W + r, m.worldW - W - r);
    y = G.clamp(y, W + r, m.worldH - W - r);
    if (!G.Map.bboxSolid(m, x, y, r)) return { x: x, y: y };
    var best = null, bd = Infinity, i, s;
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (i = 0; i < dirs.length; i++) {
      var dx = dirs[i][0], dy = dirs[i][1];
      for (s = 2; s <= 120; s += 2) {
        var nx = x + dx * s, ny = y + dy * s;
        if (nx < W + r || ny < W + r || nx > m.worldW - W - r || ny > m.worldH - W - r) break;
        if (!G.Map.bboxSolid(m, nx, ny, r)) {
          var d = Math.abs(nx - x) + Math.abs(ny - y);
          if (d < bd) { bd = d; best = { x: nx, y: ny }; }
          break;
        }
      }
    }
    return best || { x: m.spawn.x, y: m.spawn.y };
  }
  G.resolveFree = resolveFree;

  /* 帧末安全校验（包在 game.update 外，最后执行） */
  var _upd = G.game.update;
  G.game.update = function (dt) {
    _upd.call(this, dt);
    var p = this.player, m = this.map;
    if (!p || !m || this.state !== 'play') return;
    if (G.Map.bboxSolid(m, p.x, p.y, p.r)) {
      var f = resolveFree(m, p.x, p.y, p.r);
      G.burst(f.x, f.y, 10, '#9fb4ff', 160, { size: 3 });
      G.popText(f.x, f.y - 22, '回到安全位置', { col: '#9fb4ff', size: 12 });
      p.x = f.x; p.y = f.y;
      p.vx = 0; p.vy = 0;
    }
  };

  /* 撤离引导定时器加固 */
  G.game.extractNow = function () {
    var g = this, p = this.player, ex = this.map.extract;
    if (g._extracting || g._extractTimer) return;
    if (!p || p.dead) return;
    ex.channel = 0;
    ex.chOn = true;
    G.Audio.sfx('extract_start');
    G.fx('ring', { x: ex.x, y: ex.y, r0: 10, r1: 120, col: '#6ee787', w: 6, life: 0.5 });
    g._extractTimer = setInterval(function () {
      /* 玩家死亡 / 状态变化 / 离开引导区 → 取消 */
      if (g.player.dead || g.state !== 'play' || g.map !== g._extractMap || G.dist(g.player.x, g.player.y, ex.x, ex.y) > 110) {
        clearInterval(g._extractTimer);
        g._extractTimer = null;
        ex.channel = 0;
        ex.chOn = false;
        return;
      }
      ex.channel += 0.08;
      if (ex.channel >= 1) {
        clearInterval(g._extractTimer);
        g._extractTimer = null;
        g.onExtractSuccess();
      }
    }, 80);
    g._extractMap = this.map;
  };

  /* 死亡 / 开局 / 读档 / 深入：清理遗留引导定时器 */
  function clearExtractTimer(g) {
    if (g._extractTimer) { clearInterval(g._extractTimer); g._extractTimer = null; }
    if (g.map && g.map.extract) { g.map.extract.channel = 0; g.map.extract.chOn = false; }
  }
  var _death = G.game.onPlayerDeath;
  G.game.onPlayerDeath = function () {
    clearExtractTimer(this);
    return _death.call(this);
  };
  var _nr = G.game.newRun;
  G.game.newRun = function (c, t) {
    clearExtractTimer(this);
    return _nr.call(this, c, t);
  };
  var _rr = G.game.resumeRun;
  G.game.resumeRun = function (d) {
    clearExtractTimer(this);
    return _rr.call(this, d);
  };
  var _desc = G.game.descend;
  G.game.descend = function () {
    clearExtractTimer(this);
    return _desc.call(this);
  };

  /* 传送落点安全化 */
  var _portal = G.game.usePortal;
  G.game.usePortal = function (pt) {
    var r = _portal.call(this, pt);
    var p = this.player, m = this.map;
    if (p && m && G.Map.bboxSolid(m, p.x, p.y, p.r)) {
      var f = resolveFree(m, p.x, p.y, p.r);
      p.x = f.x; p.y = f.y;
    }
    return r;
  };

})();
