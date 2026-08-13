/* ============================================================
   34_loot_fly.js —— 开箱出货飞行动画
   物品从宝箱位置弹出（稀有度辉光）→ 停顿 → 飞向出货卡/toast
   与 32_loot.js 的分级音效、出货卡队列串联，形成完整开箱反馈链。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  function rarityCol(tier) {
    return tier === 0 ? '#d9dde8' : G.rarityColor(tier);
  }

  /* 世界坐标 → 视口坐标（与 21_explore 的画布平移一致：cam 为左上角世界坐标） */
  function toScreen(wx, wy) {
    var g = G.game;
    var rect = g.canvas.getBoundingClientRect();
    return {
      x: wx - g.camX + rect.left,
      y: wy - g.camY + rect.top
    };
  }

  /* 目标点：出货卡中心；不可见时退回左下 1/4 处 */
  function targetPos() {
    var toast = $('lootToast');
    if (toast && toast.classList && !toast.classList.contains('hidden')) {
      var r = toast.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    var g = G.game;
    var rect = g.canvas.getBoundingClientRect();
    return { x: rect.left + rect.width * 0.22, y: rect.top + rect.height * 0.74 };
  }

  /* 单件飞行动画：扫描光环 → 弹出 → 停顿 → 飞向目标并淡出 */
  function flyOne(inst, wx, wy) {
    var g = G.game;
    if (!g || !g.canvas || typeof document === 'undefined') return;
    var col = rarityCol(inst.tier);
    var sp = toScreen(wx, wy);
    var body = document.body;
    if (!body) return;

    /* 搜索光环：开箱"扫描"感（稀有度越高越亮） */
    var scan = document.createElement('div');
    scan.className = 'loot-scan';
    scan.style.left = sp.x + 'px';
    scan.style.top = sp.y + 'px';
    scan.style.setProperty('--rc', col);
    scan.style.boxShadow = '0 0 ' + (8 + inst.tier * 5) + 'px ' + col +
      ', inset 0 0 ' + (6 + inst.tier * 4) + 'px ' + col;
    body.appendChild(scan);
    setTimeout(function () {
      if (scan.parentNode) scan.parentNode.removeChild(scan);
    }, 300);

    /* 图标：复制精灵画布，包一层固定定位容器 */
    var icon = G.PX.node(inst.type === 'weapon'
      ? G.weaponIcon(inst.def, inst.tier, 4)
      : G.itemIcon(inst.def, 4));
    var holder = document.createElement('div');
    holder.className = 'loot-fly';
    holder.style.left = sp.x + 'px';
    holder.style.top = sp.y + 'px';
    holder.style.setProperty('--rc', col);
    holder.appendChild(icon);
    body.appendChild(holder);

    /* 弹出（等扫描光环先亮 110ms） */
    setTimeout(function () {
      holder.classList.add('loot-fly-pop');
      /* 停顿后飞向目标 */
      setTimeout(function () {
        var t = targetPos();
        holder.classList.add('loot-fly-fly');
        holder.style.left = t.x + 'px';
        holder.style.top = t.y + 'px';
        setTimeout(function () {
          if (holder.parentNode) holder.parentNode.removeChild(holder);
        }, 470);
      }, 160);
    }, 110);
  }

  /* 对外 API：排队错开（delayMs 默认 0） */
  G.UI.lootFly = function (inst, worldX, worldY, delayMs) {
    var d = +delayMs || 0;
    if (d > 0) {
      setTimeout(function () { flyOne(inst, worldX, worldY); }, d);
    } else {
      flyOne(inst, worldX, worldY);
    }
  };

  /* 包裹开箱结算：保留既有链路（分级特效/出货卡），确认入包后再飞 */
  var _acr = G.game.applyContainerReward;
  G.game.applyContainerReward = function (c, out) {
    _acr.call(this, c, out);
    var g = this;
    if (!g || !g.bag) return;
    var n = 0, i;
    for (i = 0; i < (out || []).length; i++) {
      var o = out[i];
      if (o.inst && g.bag.indexOf(o.inst) >= 0) {
        G.UI.lootFly(o.inst, c.x, c.y - 10, n * 150);
        n++;
      }
    }
  };

})();
