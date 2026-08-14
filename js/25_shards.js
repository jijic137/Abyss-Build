/* ============================================================
   25_shards.js —— 属性碎片系统（取代等级/经验）
   打怪与事件获得碎片，攒满 3 颗触发一次强化选择；
   材料不再提供经验。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;
  var SHARD_NEED = 3;
  G.SHARD_NEED = SHARD_NEED;

  /* 收满碎片 → 触发强化选择 */
  function shardGain(v) {
    var g = G.game;
    if (!g || !g.player) return;
    g.shards = (g.shards || 0) + v;
    if (g.shards >= SHARD_NEED) {
      g.shards -= SHARD_NEED;
      g.player.pendingLevels = (g.player.pendingLevels || 0) + 1;
      G.UI.banner('属性碎片共鸣！', '#c07fff');
      G.Audio.sfx('levelup');
    }
  }

  /* 物品掉落地面：背包放不下 / 手动丢弃时用 */
  G.dropItemGround = function (inst, x, y) {
    var g = G.game;
    if (!g) return;
    var px = x == null ? g.player.x : x;
    var py = y == null ? g.player.y : y;
    g.pickups.push(new G.Pickup(px + G.rand(-14, 14), py + G.rand(-14, 14), 'item', inst));
  };
  /* 统一授予：先入包，背包满则掉落地面：背包放不下时直接掉落地面而不消失 */
  G.grantItemOrDrop = function (inst, x, y) {
    var g = G.game;
    if (!inst) return false;
    if (G.addBagItem(inst)) {
      if (G.discoverTreasure) G.discoverTreasure(inst);
      return true;
    }
    var px = (x == null) ? g.player.x : x;
    var py = (y == null) ? g.player.y : y;
    G.dropItemGround(inst, px, py);
    G.popText(px, py - 36, '背包已满 · 物品掉落地面', { col: '#ffd24a', size: 13, life: 1.4 });
    G.burst(px, py, 10, '#ffd24a', 150, { size: 3 });
    if (G.Audio && G.Audio.sfx) G.Audio.sfx('pickup');
    return false;
  };


  /* 掉落：普通 12%（+幸运修正） / 精英 100% / BOSS 2 颗 */
  var _drop = G.game.dropLoot;
  G.game.dropLoot = function (e) {
    _drop.call(this, e);
    if (!this.map || this.state !== 'play') return;
    var p = this.player;
    var ch = e.def.boss ? 1 : (e.def.elite ? 1 : 0.12 + (p.st.luck || 0) * 0.0015);
    var n = e.def.boss ? 2 : 1;
    if (Math.random() < ch) {
      for (var i = 0; i < n; i++) {
        this.pickups.push(new G.Pickup(e.x + G.rand(-10, 10), e.y + G.rand(-10, 10), 'shard', 1));
      }
    }
  };

  /* 拾取：碎片计数组装；材料不再给经验 */
  var _collect = G.Pickup.prototype.collect;
  G.Pickup.prototype.collect = function () {
    var g = G.game, p = g.player;
    if (this.type === 'shard') {
      this.dead = true;
      shardGain(this.value);
      G.burst(this.x, this.y, 8, '#c07fff', 150, { size: 2.5 });
      G.Audio.sfx('item_get');
      G.popText(this.x, this.y - 10, '碎片 +' + this.value, { col: '#c07fff', size: 12 });
      return;
    }
    if (this.type === 'item') {
      var inst = this.value;
      if (!G.addBagItem(inst)) {
        G.popText(this.x, this.y - 12, '背包已满', { col: '#ff6b6b', size: 12, life: 1 });
        G.burst(this.x, this.y, 6, '#ff6b6b', 120, { size: 2.2 });
        return;   // 留在原地，不移除
      }
      this.dead = true;
      G.Audio.sfx('item_get');
      G.UI.showLootCard(inst);
      G.popText(this.x, this.y - 10, (inst.type === 'weapon' ? '武器 ' : '') + inst.def.name, { col: G.rarityColor(inst.tier), size: 12 });
      return;
    }
    this.dead = true;
    if (this.type === 'mat') {
      g.addMaterials(this.value);
      G.burst(this.x, this.y, 3, '#ffd24a', 90, { size: 2 });
      G.Audio.sfx('pickup');
    } else {
      p.heal(this.value);
      G.popText(this.x, this.y - 8, '+' + this.value, { col: '#6ee787', size: 12 });
      G.burst(this.x, this.y, 5, '#6ee787', 110, { size: 2.5 });
      G.Audio.sfx('heal');
    }
  };

  /* 开箱材料不再加经验 */
  G.game.applyContainerReward = function (c, out) {
    var p = this.player, i;
    for (i = 0; i < out.length; i++) {
      var o = out[i];
      if (o.kind === 'mats') {
        this.addMaterials(o.value);
        G.burst(c.x, c.y + 8, 10, '#ffd24a', 170, { size: 2.6 });
        G.popText(c.x, c.y - 30, '+' + o.value, { col: '#ffd24a', size: 15 });
        G.Audio.sfx('pickup');
      } else if (o.kind === 'heal') {
        p.heal(o.value);
        G.popText(c.x, c.y - 30, '+' + o.value + ' 生命', { col: '#6ee787', size: 13 });
      } else if (o.inst) {
        if (G.addBagItem(o.inst)) {
          G.Audio.sfx('item_get');
          G.UI.showLootCard(o.inst);
        } else {
          G.dropItemGround(o.inst, c.x, c.y);   // 背包满：掉落地面而不消失
          G.popText(c.x, c.y - 40, '背包已满 · 物品掉落地面', { col: '#ffd24a', size: 13, life: 1.4 });
          G.burst(c.x, c.y, 10, '#ffd24a', 150, { size: 3 });
          G.Audio.sfx('pickup');
        }
      }
    }
  };

  /* 事件「顿悟」改为直接给碎片 */
  var _applyEv = G.game.applyEvent;
  G.game.applyEvent = function (ev, choice) {
    if (choice && choice.id === 'level') {
      shardGain(SHARD_NEED);
      ev.used = true;
      G.Audio.sfx('item_get');
      G.burst(ev.x, ev.y, 22, '#c07fff', 220, { size: 3.5 });
      G.fx('ring', { x: ev.x, y: ev.y, r0: 8, r1: 150, col: '#c07fff', w: 5, life: 0.55 });
      G.UI.banner('顿悟 · 属性碎片 +3', '#c07fff');
      G.UI.closeEvent();
      this.saveRun();
      return;
    }
    return _applyEv.call(this, ev, choice);
  };

  /* HUD：经验条改为碎片计数 */
  var _uh = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh.call(this, g);
    var xpText = $('xpText'), xpFill = $('xpFill');
    if (xpText) xpText.textContent = '碎片 ' + (g.shards || 0) + '/' + SHARD_NEED;
    if (xpFill) xpFill.style.width = (G.clamp((g.shards || 0) / SHARD_NEED, 0, 1) * 100) + '%';
  };

  /* 强化选择界面文案（等级 → 碎片） */
  G.UI.renderLevelUp = function (g, opts, onPick) {
    var p = g.player;
    $('lvSub').textContent = '属性碎片共鸣 · 选择一项强化' +
      (p.pendingLevels > 1 ? '（剩余 ' + p.pendingLevels + ' 次）' : '');
    var box = $('lvOptions');
    box.innerHTML = '';
    opts.forEach(function (o) {
      var d = G.STAT_MAP[o.key];
      var affinity = p.chars && p.chars.affinity ? p.chars.affinity.indexOf(o.key) >= 0
        : (p.char && p.char.affinity ? p.char.affinity.indexOf(o.key) >= 0 : false);
      var card = G.el('div', 'lv-opt' + (o.trade ? ' lv-trade' : '') + (affinity ? ' lv-affinity' : ''));
      card.appendChild(G.el('div', 'n', d.name));
      if (affinity) card.appendChild(G.el('div', 'tag', '契合本角色'));
      card.appendChild(G.el('div', 'd', G.modText(o.key, o.val)));
      if (o.negKey) {
        var nd = G.STAT_MAP[o.negKey];
        card.appendChild(G.el('div', 'dn', '− ' + nd.name + ' ' + G.modText(o.negKey, -o.negVal)));
      }
      card.appendChild(G.el('div', 'x', d.desc));
      card.addEventListener('click', function () {
        if (card.classList.contains('picked')) return;
        card.classList.add('picked');
        var r = card.getBoundingClientRect();
        G.UI.burstDom(r.left + r.width / 2, r.top + r.height / 2, o.trade ? '#ff9a9a' : '#ffd24a', 12);
        G.Audio.sfx('levelup');
        setTimeout(function () { onPick(o); }, 240);
      });
      box.appendChild(card);
    });
  };

  /* 存档/读档：碎片计数 */
  var _sr = G.game.saveRun;
  G.game.saveRun = function () {
    _sr.call(this);
    var d = G.Save.getRun();
    if (d) {
      d.shards = this.shards || 0;
      G.Save.saveRun(d);
    }
  };
  var _rr = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    this.shards = (data && data.shards) || 0;
    return _rr.call(this, data);
  };
  var _nr = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    this.shards = 0;
    return _nr.call(this, charDef, tierId);
  };

  /* 存档子页：等级行改为碎片 */
  var _rss = G.UI.renderSubSave;
  G.UI.renderSubSave = function () {
    _rss.call(this);
    var host = $('saveBody');
    if (!host) return;
    var run = G.Save.getRun();
    if (!run || run.mode !== 'extract') return;
    var rows = host.querySelectorAll ? host.querySelectorAll('.save-stat') : [];
    for (var i = 0; i < rows.length; i++) {
      var k = rows[i].querySelector && rows[i].querySelector('.save-stat-k');
      if (k && k.textContent === '等级') {
        var v = rows[i].querySelector('.save-stat-v');
        if (v) v.textContent = (run.shards || 0) + ' / ' + SHARD_NEED;
        k.textContent = '碎片';
        break;
      }
    }
  };

})();
