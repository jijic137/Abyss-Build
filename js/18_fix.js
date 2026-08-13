/* ============================================================
   18_fix.js —— 收尾补丁（水合元存档 / 开箱接线 / 存档补全 / 升级回场）
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* ---------- 武器实例统一带 type ---------- */
  var _mkW = G.makeWeapon;
  G.makeWeapon = function (defId, tier) {
    var w = _mkW(defId, tier);
    if (w) w.type = 'weapon';
    return w;
  };

  /* ---------- 元存档水合（JSON → 带 def 的实例） ---------- */
  function hydrate(x) {
    if (!x) return null;
    if (G.WEAPON_MAP[x.defId]) return G.makeWeapon(x.defId, x.tier);
    return G.makeItem(x.defId, x.tier);
  }
  (function () {
    var d = G.Meta.get();
    var changed = false;
    d.stash = d.stash.map(function (x) {
      var h = hydrate(x);
      if (h && (!x.def)) changed = true;
      return h;
    }).filter(Boolean);
    var lo = d.loadout;
    for (var k in lo) {
      if (lo[k]) {
        var h2 = hydrate(lo[k]);
        if (h2 && (!lo[k].def)) { lo[k] = h2; changed = true; }
      }
    }
    if (changed) G.Meta.flush();
  })();

  /* ---------- 背包 ESC 判定 ---------- */
  var _iso = G.UI.isScreenOn;
  G.UI.isScreenOn = function (id) {
    if (id === 'scrBag') {
      var n = $('scrBag');
      return n ? !n.classList.contains('hidden') : false;
    }
    return _iso(id);
  };

  /* ---------- 开箱：接线奖励与反馈 ---------- */
  var _cOpen = G.Container.prototype.open;
  G.Container.prototype.open = function () {
    var out = _cOpen.call(this);
    if (G.game && G.game.onContainerOpen) G.game.onContainerOpen(this, out);
    return out;
  };

  /* ---------- 存档补全：背包实时写入 ---------- */
  G.game.saveRun = function () {
    if (!this.player || !this.map) return;
    var p = this.player;
    var data = {
      v: 2, mode: 'extract',
      charId: p.char.id,
      charMods: p.char.mods,
      tierId: this.map.tierId,
      salt: this.map.salt,
      materials: this.materials,
      level: p.level, xp: p.xp,
      pendingLevels: p.pendingLevels || 0,
      hp: p.hp,
      runTime: this.runTime || 0,
      stats: p.stats,
      carried: {
        weapons: (this.carried && this.carried.weapons) || [],
        items: (this.carried && this.carried.items) || [],
        starter: (this.carried && this.carried.starter) || [],
        bag: this.bag.map(function (b) { return G.itemData(b); })
      },
      mapTime: this.map.time,
      extractActive: !!this.map.extract.active,
      explored: [],
      opened: []
    };
    this.map.rooms.forEach(function (rm) { if (rm.explored) data.explored.push(rm.idx); });
    this.containers.forEach(function (c2) { if (c2.opened || c2.used) data.opened.push(c2.cid); });
    G.Save.saveRun(data);
  };

  /* ---------- 升级完成回到战斗并收起浮层 ---------- */
  G.game.openLevelUp = function () {
    var p = this.player;
    if (p.pendingLevels <= 0) {
      this.state = 'play';
      G.UI.showScreen(null);
      return;
    }
    this.state = 'level';
    this.levelCd = 0.8;
    var opts = G.rollLevelOptions(4, p.level);
    G.UI.renderLevelUp(this, opts, function (o) {
      p.char.mods[o.key] = (p.char.mods[o.key] || 0) + o.val;
      if (o.negKey) p.char.mods[o.negKey] = (p.char.mods[o.negKey] || 0) - o.negVal;
      p.recalc();
      if (p.st.maxHp < 1) p.st.maxHp = 1;
      if (o.key === 'maxHp') p.heal(o.val);
      if (p.hp > p.st.maxHp) p.hp = p.st.maxHp;
      p.pendingLevels--;
      G.game.openLevelUp();
      G.game.saveRun();
    });
    G.UI.showScreen('scrLevel');
    G.Audio.sfx('levelup');
  };

  /* ---------- 撤离引导完成立即结算（避免 setTimeout 依赖） ---------- */
  var _extUpd = G.Extract.update;
  G.Extract.update = function (dt) {
    var g = G.game, ex = g.map && g.map.extract;
    if (!ex || !ex.active || !g.player || g.player.dead) return;
    var d = G.dist(g.player.x, g.player.y, ex.x, ex.y);
    if (d < 78) {
      ex.channel += dt;
      ex.chOn = true;
      if (ex.channel >= G.Extract.CHANNEL) {
        g.onExtractSuccess();
        return;
      }
    } else {
      ex.channel = 0;
      ex.chOn = false;
    }
  };

})();
