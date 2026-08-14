/* ============================================================
   49_flow2.js —— 进入流程理顺
   探索深渊 → 选角色 → 整备仓库 → 选图 → 出发
   - 角色确认后进入整备页（不再直接开始）
   - 默认行者 + 整备页当前行者展示/更换，消除「请先选择角色」死路
   - 深入下一层前：层间整备（背包整理后点「继续深入」出发）
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* 默认行者，避免未选角色时的死路提示 */
  if (!G.UI._selectedChar) G.UI._selectedChar = G.CHARACTERS[0];

  /* 角色确认 → 整备仓库 */
  G.UI.confirmWheelSelection = function () {
    var w = G.UI._wheel;
    if (!w || w.active === undefined) return;
    if (!w.chars || w.selected < 0 || !w.chars[w.selected]) return;
    var ch = w.chars[w.selected];
    G._exploring = false;
    G.Audio.sfx('confirm');
    G.UI._selectedChar = ch;
    G.game._charDef = ch;
    G.UI._wheelFrom = null;
    G.UI.stopWheel();
    G.UI.renderBase();
    G.UI.showScreen('scrBase');
    G.UI.banner('已选择「' + ch.name + '」· 整备后选图出发', ch.color || '#fff');
  };

  /* 轮盘 ESC 返回：来自整备「更换」则回整备 */
  var _exit = G.UI.exitCharSelect;
  G.UI.exitCharSelect = function () {
    var from = G.UI._wheelFrom;
    G.UI._wheelFrom = null;
    if (from === 'base') {
      var w = G.UI._wheel;
      w.active = false;
      if (w._raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(w._raf);
      G._exploring = false;
      G.Audio.sfx('back');
      G.UI.renderBase();
      G.UI.showScreen('scrBase');
      return;
    }
    return _exit.call(this);
  };

  /* 整备页：当前行者展示 + 更换 */
  var _rb = G.UI.renderBase;
  G.UI.renderBase = function () {
    var r = _rb.call(this);
    var sc = $('scrBase');
    if (!sc) return r;
    var line = $('baseCharLine');
    if (!line) {
      line = document.createElement('div');
      line.id = 'baseCharLine';
      line.className = 'base-char-line';
      sc.insertBefore(line, sc.firstChild);
    }
    var ch = G.UI._selectedChar || G.CHARACTERS[0];
    line.innerHTML = '';
    var name = document.createElement('span');
    name.style.color = ch.color || '#fff';
    name.textContent = '当前行者：' + ch.name;
    var btn = document.createElement('button');
    btn.className = 'btn btn-sm';
    btn.textContent = '更换';
    btn.addEventListener('click', function () {
      G.UI._wheelFrom = 'base';
      G.UI.renderCharWheel(function (c2) {
        G.UI._selectedChar = c2;
        G.game._charDef = c2;
      });
      G.UI.showScreen('scrCharSelect');
    });
    line.appendChild(name);
    line.appendChild(btn);
    return r;
  };

  /* 开局用已选行者（防闭包旧引用） */
  var _nr8 = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    var use = this._charDef || charDef;
    this._pendingDescend = null;
    this._prepOpen = false;
    return _nr8.call(this, use, tierId);
  };
  var _rr8 = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    this._pendingDescend = null;
    this._prepOpen = false;
    var bag = $('scrBag');
    if (bag) bag.classList.add('hidden');
    return _rr8.call(this, data);
  };

  /* ---------------- 深入下一层：层间整备 ---------------- */
  G.game.descend = function () {
    var g = this, p = this.player;
    var next = g.map.tierId + 1;
    if (next > 5) return;
    var tier = G.TIER_MAP[next];

    /* 深入奖励 */
    g.depth = (g.depth || 0) + 1;
    p.char.mods.damage = (p.char.mods.damage || 0) + 8;
    p.heal(Math.round(p.st.maxHp * 0.30));
    p.recalc();

    G.burst(p.x, p.y, 36, '#c07fff', 300, { size: 4 });
    G.fx('ring', { x: p.x, y: p.y, r0: 8, r1: 220, col: '#c07fff', w: 7, life: 0.6 });
    G.Audio.sfx('extract_ready');

    /* 布置新图 */
    g.map = G.Map.generate(next);
    g.arena = g.map.worldW;
    g.map.wave = g.map.tier.waveBand[1];
    g.buildWallRects();
    g.unlockedDoors = {};
    g.lastRoom = -1;
    g.levelCd = 0;
    g.portals = [];
    g.events = [];
    g.enemies = []; g.bullets = []; g.ebullets = [];
    g.pickups = []; g.particles = []; g.texts = [];
    g.effects = []; g.turrets = []; g.drones = []; g.mines = [];
    g._poisonClouds = [];
    g.containers = g.map.containers.map(function (c) { return new G.Container(c); });
    g.traps = [];
    g.barrels = [];
    if (G.setupContent) G.setupContent(g);
    /* 锁门 / 事件 / 传送门（与开局一致） */
    if (G.rebuildExtras) G.rebuildExtras(g);

    /* 层间整备：打开背包整理，点「继续深入」出发 */
    if (g._extractTimer) { clearInterval(g._extractTimer); g._extractTimer = null; }
    g._pendingDescend = { tier: next, name: tier.name, col: tier.col };
    g._prepOpen = true;
    g.state = 'pause';
    g._bagPrev = null;
    G.UI.openPrep();
  };

  G.UI.openPrep = function () {
    var g = G.game;
    var bag = $('scrBag');
    if (!bag) return;
    bag.classList.remove('hidden');
    var bar = $('bagPrepBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'bagPrepBar';
      var panel = bag.querySelector ? (bag.querySelector('.bag-panel') || bag) : bag;
    var head = panel.querySelector ? panel.querySelector('.bag-head') : null;
      if (head && head.nextSibling) panel.insertBefore(bar, head.nextSibling);
      else panel.appendChild(bar);
    }
    var prep = g._pendingDescend || {};
    bar.innerHTML = '';
    var txt = document.createElement('span');
    txt.style.color = prep.col || '#c07fff';
    txt.textContent = '层间整备 · 即将进入 ' + (prep.name || '下一层') + '（第 ' + (prep.tier || '?') + ' 层）';
    var go = document.createElement('button');
    go.className = 'btn btn-primary btn-sm';
    go.textContent = '继续深入 →';
    go.addEventListener('click', function () { G.game.beginNextFloor(); });
    bar.appendChild(txt);
    bar.appendChild(go);
    G.UI.renderBag();
    if (G.UI.updateHud) G.UI.updateHud(g);
  };

  G.game.beginNextFloor = function () {
    var g = this;
    var prep = g._pendingDescend;
    if (!prep) return;
    g._pendingDescend = null;
    g._prepOpen = false;
    var bag = $('scrBag');
    if (bag) bag.classList.add('hidden');
    var p = g.player;
    p.x = g.map.spawn.x;
    p.y = g.map.spawn.y;
    p.room = g.map.startRoom;
    g.lastRoom = -1;
    g.enterRoom(g.map.startRoom);
    if (g.seedStartEnemies) g.seedStartEnemies();
    g.state = 'play';
    G.UI.banner('深入 · ' + prep.name, prep.col);
    G.UI.updateObjective(g.map);
    G.UI.updateHud(g);
    g.saveRun();
  };

  /* 层间整备期间禁止关闭背包（避免卡死） */
  var _tb2 = G.UI.toggleBag;
  G.UI.toggleBag = function () {
    var g = G.game;
    var bag = $('scrBag');
    if (bag && !bag.classList.contains('hidden') && g && g._pendingDescend) {
      G.UI.flashText(null, '层间整备中，先点击「继续深入」');
      G.Audio.sfx('back');
      return;
    }
    return _tb2.call(this);
  };

})();
