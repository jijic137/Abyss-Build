/* ============================================================
   26_extract.js —— 撤离加固 + 世界坐标互动标签
   - 撤离引导半径统一 96px，引导时减速
   - 结算全程兜底：任何异常都保证进入结果界面，不再卡死
   - E 互动提示改为目标头顶标签（不再与 HUD 互相遮挡）
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* ---------- 撤离引导 ---------- */
  G.Extract.update = function (dt) {
    var g = G.game, ex = g.map && g.map.extract;
    if (!ex || !ex.active || !g.player || g.player.dead) return;
    var d = G.dist(g.player.x, g.player.y, ex.x, ex.y);
    if (d < 96) {
      ex.channel += dt;
      ex.chOn = true;
      if (ex.channel >= G.Extract.CHANNEL) {
        g.onExtractSuccess();
        return;
      }
      g.player.vx *= 0.72;
      g.player.vy *= 0.72;
    } else {
      ex.channel = 0;
      ex.chOn = false;
    }
  };

  /* ---------- 结算兜底：任何异常都进入结果界面 ---------- */
  var _oes = G.game.onExtractSuccess;
  G.game.onExtractSuccess = function () {
    var g = this;
    if (g._extracting) return;
    g._extracting = true;
    try {
      _oes.call(g);
    } catch (e) {
      if (typeof console !== 'undefined') console.error('extract settle error', e);
      g.state = 'result';
      setTimeout(function () {
        try { G.UI.showResult(g, true, { mats: g.materials || 0, items: 0, sold: 0, firstClear: false, bonus: 0 }); }
        catch (e2) { /* 极端的最后兜底：直接显示空结算 */ }
      }, 400);
    }
  };

  var _showResult = G.UI.showResult;
  G.UI.showResult = function (g, win, info) {
    try {
      _showResult.call(this, g, win, info);
    } catch (e) {
      if (typeof console !== 'undefined') console.error('showResult error', e);
      try {
        $('resultTitle').textContent = win ? '撤离成功' : '你倒下了';
        $('resultTitle').style.color = win ? '#6ee787' : '#ff6b6b';
        $('resultSub').textContent = '战利品已处理完毕。';
        G.UI.showScreen('scrResult');
      } catch (e2) { /* 忽略 */ }
    }
  };

  /* ---------- 世界坐标互动标签（替代 DOM hint） ---------- */
  var _render = G.game.render;
  G.game.render = function () {
    _render.call(this);
    if (this.state === 'play' && this.map) this.drawInteractTag();
  };

  G.game.drawInteractTag = function () {
    var p = this.player, i, target = null, label = '';
    var ex = this.map.extract;
    if (ex && ex.active && G.dist(p.x, p.y, ex.x, ex.y) < 112) {
      target = { x: ex.x, y: ex.y - 78 };
      label = 'E 撤离';
    }
    if (!target) {
      for (i = 0; i < this.containers.length; i++) {
        var c = this.containers[i];
        if (c.opened || c.used) continue;
        if (G.dist(p.x, p.y, c.x, c.y) < 96) {
          target = { x: c.x, y: c.y - 34 };
          label = 'E ' + ((G.CONTAINER_INFO[c.type] || {}).name || '互动');
          break;
        }
      }
    }
    if (!target && this.events) {
      for (i = 0; i < this.events.length; i++) {
        var ev = this.events[i];
        if (ev.used) continue;
        if (G.dist(p.x, p.y, ev.x, ev.y) < 90) {
          target = { x: ev.x, y: ev.y - 40 };
          label = 'E 事件';
          break;
        }
      }
    }
    if (!target && this.map.lockedDoors) {
      for (i = 0; i < this.map.lockedDoors.length; i++) {
        var ld = this.map.lockedDoors[i];
        if (this.unlockedDoors && this.unlockedDoors[ld.key]) continue;
        var rc = ldRect(ld);
        var cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
        if (G.dist(p.x, p.y, cx, cy) < 96) {
          target = { x: cx, y: cy - 30 };
          label = 'E 开锁';
          break;
        }
      }
    }
    if (!target) return;

    var c = this.ctx;
    var bob = Math.sin(this.runTime * 6) * 3;
    c.save();
    c.translate(Math.round(target.x - this.camX), Math.round(target.y - this.camY + bob));
    c.font = 'bold 12px "Segoe UI",sans-serif';
    var w = c.measureText(label).width + 18;
    c.globalAlpha = 0.78;
    c.fillStyle = '#0a0c12';
    c.fillRect(-w / 2, -19, w, 22);
    c.strokeStyle = '#ffd24a';
    c.lineWidth = 1.5;
    c.strokeRect(-w / 2, -19, w, 22);
    c.globalAlpha = 1;
    c.fillStyle = '#ffd24a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, 0, -8);
    c.restore();
  };

  function ldRect(ld) {
    var SEG = G.Map.SEG, W = G.Map.WALL, DOOR = G.Map.DOOR;
    if (ld.dir === 'H') {
      var rc = G.Map.roomRect(ld.c, ld.r);
      var dy = rc.y0 + G.Map.ROOM / 2;
      return { x0: (ld.c + 1) * SEG, y0: dy - DOOR / 2, x1: (ld.c + 1) * SEG + W, y1: dy + DOOR / 2 };
    }
    var rc2 = G.Map.roomRect(ld.c, ld.r);
    var dx = rc2.x0 + G.Map.ROOM / 2;
    return { x0: dx - DOOR / 2, y0: (ld.r + 1) * SEG, x1: dx + DOOR / 2, y1: (ld.r + 1) * SEG + W };
  }

})();
