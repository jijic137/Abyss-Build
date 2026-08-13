/* ============================================================
   43_aiart.js —— AI 美术资源集成（ComfyUI 批量产物）
   - 选图卡：5 区域概念图背景（缺失时优雅降级）
   - BOSS 血条：立绘头像
   - 事件/抉择面板：插画背景
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;
  var TIER_FILE = { 1: 'fringe', 2: 'corridor', 3: 'mine', 4: 'heartland', 5: 'gate' };

  /* ---------------- 选图卡区域背景 ---------------- */
  var _rms = G.UI.renderMapSelect;
  G.UI.renderMapSelect = function () {
    _rms.call(this);
    var box = $('mapCards');
    if (!box) return;
    var cards = box.children;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var tierId = (i + 1);
      var file = TIER_FILE[tierId];
      if (!file) continue;
      card.style.backgroundImage = "linear-gradient(rgba(8,10,16,.68), rgba(8,10,16,.86)), url('assets/art/ai/tiers/tier" + tierId + "_" + file + ".png')";
      card.style.backgroundSize = 'cover';
      card.style.backgroundPosition = 'center';
    }
  };

  /* ---------------- BOSS 立绘 ---------------- */
  function bossPortraitEl() {
    var el = $('bossPortrait');
    if (el) return el;
    var wrap = $('bossBarWrap');
    if (!wrap) return null;
    el = document.createElement('img');
    el.id = 'bossPortrait';
    el.alt = '';
    el.style.display = 'none';
    el.addEventListener('error', function () { el.style.display = 'none'; });
    wrap.appendChild(el);
    return el;
  }

  var _uh5 = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh5.call(this, g);
    var img = bossPortraitEl();
    if (!img) return;
    var boss = null;
    for (var i = 0; i < g.enemies.length; i++) {
      if (g.enemies[i].def.boss && !g.enemies[i].dead) { boss = g.enemies[i]; break; }
    }
    if (boss) {
      var src = boss.def.id === 'boss_abyss'
        ? 'assets/art/ai/boss/boss2_abyss.png'
        : 'assets/art/ai/boss/boss1_behemoth.png';
      img.src = src;
      img.style.display = 'block';
    } else {
      img.style.display = 'none';
    }
  };

  /* ---------------- 事件/抉择面板背景 ---------------- */
  var _oe = G.UI.openEvent;
  G.UI.openEvent = function (ev, choices) {
    var r = _oe.call(this, ev, choices);
    var box = $('evtBox');
    if (box) {
      box.style.backgroundImage = "linear-gradient(rgba(10,12,20,.82), rgba(10,12,20,.88)), url('assets/art/ai/events/event_altar.png')";
      box.style.backgroundSize = 'cover';
      box.style.backgroundPosition = 'center';
    }
    return r;
  };
  var _of = G.UI.openFlow;
  G.UI.openFlow = function (g) {
    var r = _of.call(this, g);
    var box = $('flowBox');
    if (box) {
      box.style.backgroundImage = "linear-gradient(rgba(10,12,20,.82), rgba(10,12,20,.88)), url('assets/art/ai/events/portal_rift.png')";
      box.style.backgroundSize = 'cover';
      box.style.backgroundPosition = 'center';
    }
    return r;
  };

})();
