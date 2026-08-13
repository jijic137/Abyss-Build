/* ============================================================
   10_game.js —— 搜打撤核心循环：进图探索 / 目标 / 撤离 / 结算
   ============================================================ */
'use strict';

(function () {

  var CELL = 90;
  var MAX_ENEMIES = 230;
  var BAG_SIZE = 12;
  G.BAG_SIZE = BAG_SIZE;

  var game = {
    state: 'title',     // title | play | level | pause | result
    arena: 0,
    map: null,
    bag: [],
    carried: null,
    canvas: null, ctx: null,
    dpr: 1, vw: 0, vh: 0,
    camX: 0, camY: 0,

    player: null,
    enemies: [], bullets: [], ebullets: [], pickups: [],
    particles: [], texts: [], effects: [], turrets: [],
    drones: [], mines: [], containers: [],

    wave: 1,
    materials: 0,
    lastRoom: -1,
    levelCd: 0,
    _wallRects: [],

    shakeAmt: 0, shakeT: 0, hurtFlash: 0, shakeScale: 0.4,
    keys: {}, grid: null,
    lastT: 0, running: false,
    _renderBuf: [], _vigGrd: null
  };
  G.game = game;

  /* 局内背包 */
  G.addBagItem = function (inst) {
    var g = G.game;
    if (!g || !g.bag) return false;
    if (g.bag.length >= BAG_SIZE) return false;
    g.bag.push(inst);
    return true;
  };

  /* ============================================================
     初始化
     ============================================================ */
  game.init = function () {
    this.canvas = G.$('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.resize();
    window.addEventListener('resize', function () { game.resize(); });

    var mapKeys = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down'
    };
    window.addEventListener('keydown', function (e) {
      if (mapKeys[e.code]) { game.keys[mapKeys[e.code]] = true; e.preventDefault(); }
      if (e.code === 'Tab') { e.preventDefault(); if (game.player) G.UI.toggleStatPanel(game.player); }
      if (e.code === 'KeyE' && game.state === 'play' && game.player) {
        e.preventDefault();
        game.tryInteract();
      }
      if (e.code === 'KeyI' && game.state === 'play' && game.player) {
        e.preventDefault();
        G.UI.toggleBag();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        if (G.UI.isScreenOn('scrBag')) { G.UI.toggleBag(); return; }
        if (G.UI.isScreenOn('scrSettings')) { G.UI.closeSettings(); return; }
        game.togglePause();
      }
    });
    window.addEventListener('keyup', function (e) {
      if (mapKeys[e.code]) { game.keys[mapKeys[e.code]] = false; e.preventDefault(); }
    });
    window.addEventListener('blur', function () { game.keys = {}; });
  };

  game.key = function (k) { return !!this.keys[k]; };

  game.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.canvas.width = Math.floor(this.vw * dpr);
    this.canvas.height = Math.floor(this.vh * dpr);
    this.ctx.imageSmoothingEnabled = false;
    try {
      var grd = this.ctx.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.35,
        this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.72);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,.55)');
      this._vigGrd = grd;
    } catch (e) { this._vigGrd = null; }
  };

  /* ============================================================
     开局（携带局外装备进图）
     ============================================================ */
  game.newRun = function (charDef, tierId) {
    var c = Object.assign({}, charDef);
    c.mods = Object.assign({}, charDef.mods || {});
    this.player = new G.Player(c);
    this.player.maxWeapons = 2;

    var lo = G.Meta.loadout();
    var carried = { weapons: [], items: [], bag: [], starter: [] };
    var i;

    var wSlots = [lo.w1, lo.w2];
    for (i = 0; i < 2; i++) {
      var wInst = wSlots[i];
      if (wInst && G.WEAPON_MAP[wInst.defId]) {
        var w = G.makeWeapon(wInst.defId, wInst.tier);
        this.player.addWeapon(w);
        carried.weapons.push({ defId: wInst.defId, tier: wInst.tier, starter: false });
      } else {
        var sw = G.makeWeapon(charDef.startWeapon, 0);
        if (sw) {
          this.player.addWeapon(sw);
          carried.weapons.push({ defId: charDef.startWeapon, tier: 0, starter: true });
          carried.starter.push('w:' + charDef.startWeapon);
        }
      }
    }

    var iSlots = [lo.armor, lo.trinket1, lo.trinket2, lo.relic];
    for (i = 0; i < 4; i++) {
      var inst = iSlots[i];
      if (inst && G.ITEM_MAP[inst.defId]) {
        this.player.addItem(G.ITEM_MAP[inst.defId]);
        carried.items.push({ defId: inst.defId, tier: inst.tier, starter: false });
      } else if (i === 0) {
        var ci = G.ITEM_MAP['cloth_wrap'];
        if (ci) {
          this.player.addItem(ci);
          carried.items.push({ defId: 'cloth_wrap', tier: 0, starter: true });
          carried.starter.push('i:cloth_wrap');
        }
      }
    }
    this.player.recalc();

    this.materials = charDef.startMat;
    this.bag = [];
    this.carried = carried;
    this.map = G.Map.generate(tierId || 1);
    this.arena = this.map.worldW;
    this.map.wave = this.map.tier.waveBand[1];
    this.buildWallRects();
    this.containers = this.map.containers.map(function (c2) { return new G.Container(c2); });
    this.lastRoom = -1;
    this.levelCd = 0;
    this.hurtFlash = 0; this.shakeAmt = 0;
    this.combo = 0; this.comboTimer = 0; this.runTime = 0;

    this.enemies = []; this.bullets = []; this.ebullets = [];
    this.pickups = []; this.particles = []; this.texts = [];
    this.effects = []; this.turrets = []; this.drones = []; this.mines = [];

    this.player.x = this.map.spawn.x;
    this.player.y = this.map.spawn.y;
    this.player.room = this.map.startRoom;

    G.$('statPanel').classList.add('hidden');
    if (G.$('scrBag')) G.$('scrBag').classList.add('hidden');
    G.UI.initHud();
    this.state = 'play';
    G.UI.showScreen(null);
    this.enterRoom(this.map.startRoom);
    G.UI.banner(this.map.tier.name + ' · ' + this.map.tier.sub, this.map.tier.col);
    G.UI.updateObjective(this.map);
    G.Audio.sfx('map_enter');
    G.Audio.setBgm(G.Save.getSettings().bgm);
    this.saveRun();
    if (!this.running) { this.running = true; this.lastT = performance.now(); requestAnimationFrame(loop); }
  };

  /* 预计算墙矩形（含门洞分段），渲染用 */
  game.buildWallRects = function () {
    var m = this.map, rects = [];
    var W = G.Map.WALL, ROOM = G.Map.ROOM, DOOR = G.Map.DOOR, SEG = G.Map.SEG;
    var ww = m.worldW, wh = m.worldH;
    function push(x0, y0, x1, y1) {
      if (x1 - x0 < 1 || y1 - y0 < 1) return;
      rects.push([x0, y0, x1, y1]);
    }
    push(0, 0, ww, W);
    push(0, wh - W, ww, wh);
    push(0, 0, W, wh);
    push(ww - W, 0, ww, wh);
    for (var c = 0; c < m.cols - 1; c++) {
      var x = (c + 1) * SEG;
      for (var r = 0; r < m.rows; r++) {
        var rc = G.Map.roomRect(c, r);
        var doorY = rc.y0 + ROOM / 2;
        if (m.doorsH[c][r]) {
          push(x, 0, x + W, doorY - DOOR / 2);
          push(x, doorY + DOOR / 2, x + W, wh);
        } else {
          push(x, 0, x + W, wh);
        }
      }
    }
    for (c = 0; c < m.cols; c++) {
      for (r = 0; r < m.rows - 1; r++) {
        var y = (r + 1) * SEG;
        var rc2 = G.Map.roomRect(c, r);
        var doorX = rc2.x0 + ROOM / 2;
        if (m.doorsV[c][r]) {
          push(0, y, doorX - DOOR / 2, y + W);
          push(doorX + DOOR / 2, y, ww, y + W);
        } else {
          push(0, y, ww, y + W);
        }
      }
    }
    this._wallRects = rects;
  };

  /* ============================================================
     房间事件 / 目标 / 互动
     ============================================================ */
  game.enterRoom = function (idx) {
    var rm = this.map.rooms[idx];
    if (!rm) return;
    rm.explored = true;
    var wasVisited = rm.visited;
    rm.visited = true;
    if (wasVisited) return;

    if (rm.eliteIds && rm.eliteIds.length) {
      var center = G.Map.roomCenter(rm.c, rm.r);
      rm.eliteIds.forEach(function (id) {
        game.spawnEnemy(id, center.x + G.rand(-80, 80), center.y + G.rand(-80, 80));
      });
      G.UI.banner('精英出没', '#ffd24a');
      G.Audio.sfx('boss');
      rm.spawned = true;
    }
    if (rm.bossId) {
      var bc = G.Map.roomCenter(rm.c, rm.r);
      var b = this.spawnEnemy(rm.bossId, bc.x, bc.y - 220);
      if (b) {
        G.UI.banner(G.ENEMY_MAP[rm.bossId].name + ' 苏醒', '#ff4a4a');
        G.Audio.sfx('boss');
        this.shake(18, 0.6);
      }
      rm.spawned = true;
    }
  };

  game.checkObjective = function () {
    var m = this.map;
    if (!m || m.objDone) return;
    var t = m.tierId, done = false;
    if (t === 1) done = m.time >= 60;
    else if (t === 2) done = m.eliteKills >= 1;
    else if (t === 3) done = m.bossKills >= 1;
    else if (t === 4) done = m.eliteKills >= 2;
    else if (t === 5) done = m.bossKills >= 1;
    if (done) {
      m.objDone = true;
      m.extract.active = true;
      G.UI.banner('撤离点已开放', '#6ee787');
      G.Audio.sfx('extract_ready');
      this.saveRun();
    }
  };

  game.tryInteract = function () {
    var p = this.player, i;
    if (!this.map) return;
    var ex = this.map.extract;
    if (ex.active && G.dist(p.x, p.y, ex.x, ex.y) < 96) {
      ex.channel = Math.max(ex.channel, 0.01);
      return;
    }
    for (i = 0; i < this.containers.length; i++) {
      var c = this.containers[i];
      if (c.opened || c.used) continue;
      if (G.dist(p.x, p.y, c.x, c.y) < 80) {
        if (!c.started) {
          c.started = true;
          c.ch = 0;
          G.Audio.sfx('chest_start');
        }
        return;
      }
    }
  };

  game.applyContainerReward = function (c, out) {
    var p = this.player, i;
    for (i = 0; i < out.length; i++) {
      var o = out[i];
      if (o.kind === 'mats') {
        this.addMaterials(o.value);
        p.addXp(o.value);
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
          G.popText(c.x, c.y - 36, '背包已满', { col: '#ff6b6b', size: 13, life: 1 });
          G.burst(c.x, c.y, 8, '#ff6b6b', 120, { size: 2.5 });
        }
      }
    }
  };

  /* ============================================================
     撤离 / 死亡
     ============================================================ */
  game.onExtractSuccess = function () {
    var p = this.player;
    this.state = 'result';
    var g = this;
    var itemsOut = 0, sold = 0;
    var deposit = function (inst) {
      if (!inst) return;
      itemsOut++;
      if (G.Meta.stashFull()) {
        G.Meta.addCurrency(Math.round(G.itemWorth(inst) * 0.6));
        sold++;
      } else {
        G.Meta.addToStash(inst);
      }
    };
    var i;
    for (i = 0; i < p.weapons.length; i++) deposit(G.makeWeapon(p.weapons[i].defId, p.weapons[i].tier));
    for (i = 0; i < p.items.length; i++) deposit(G.makeItem(p.items[i].id, G.clamp(p.items[i].r, 0, 4)));
    for (i = 0; i < this.bag.length; i++) deposit(this.bag[i]);

    var mats = this.materials;
    G.Meta.addCurrency(mats);
    var earned = mats;
    var t = this.map.tierId;
    var d = G.Meta.get();
    var cleared = d.stats.tierCleared = d.stats.tierCleared || {};
    var firstClear = !cleared[t];
    var bonus = 0;
    if (firstClear) {
      cleared[t] = true;
      bonus = 25 * t;
      G.Meta.addCurrency(bonus);
      earned += bonus;
    }
    if (t < 5) G.Meta.unlockTier(t + 1);
    G.Meta.addStat('extracts', 1);
    G.Meta.addStat('itemsExtracted', itemsOut);
    G.Meta.addStat('totalEarned', earned);
    G.Meta.addStat('bestTier', Math.max(G.Meta.stats().bestTier || 0, t));
    G.Meta.flush();

    G.Save.submit(G.MAX_WAVE, p.stats.kills, true);
    G.Save.clearRun();
    G.Audio.sfx('extract_done');
    G.Audio.stopMusic();
    setTimeout(function () {
      G.UI.showResult(g, true, { mats: mats, items: itemsOut, sold: sold, firstClear: firstClear, bonus: bonus });
    }, 650);
  };

  game.onPlayerDeath = function () {
    var g = this;
    G.burst(this.player.x, this.player.y, 40, '#ff6b6b', 320, { size: 5 });
    this.shake(24, 0.6);
    G.Audio.sfx('death');
    G.Audio.stopMusic();
    var lost = (this.player.weapons.length + this.player.items.length + this.bag.length);
    G.Meta.addStat('deaths', 1);
    G.Meta.addStat('itemsLost', lost);
    G.Save.clearRun();
    setTimeout(function () {
      g.state = 'result';
      G.UI.showResult(g, false, { lost: lost });
    }, 900);
  };

  /* 占位：旧入口（新循环不再使用） */
  game.openShop = function () {};
  game.nextWave = function () {};
  game.onVictory = function () { this.onExtractSuccess(); };

  /* ============================================================
     敌人生成
     ============================================================ */
  game.spawnEnemy = function (id, x, y) {
    var def = G.ENEMY_MAP[id];
    if (!def) return null;
    if (this.enemies.length >= MAX_ENEMIES + 40) return null;
    var m = this.map, p = this.player;
    if (x === undefined) {
      var rad = Math.max(this.vw, this.vh) * 0.58 + G.rand(20, 120);
      for (var t = 0; t < 10; t++) {
        var a = G.rand(0, Math.PI * 2);
        x = p.x + Math.cos(a) * rad;
        y = p.y + Math.sin(a) * rad;
        if (x > G.Map.WALL + 40 && y > G.Map.WALL + 40 &&
            x < m.worldW - G.Map.WALL - 40 && y < m.worldH - G.Map.WALL - 40 &&
            !G.Map.solid(m, x, y)) break;
        x = undefined;
      }
      if (x === undefined) {
        var rc = G.Map.roomRect(p.room % m.cols, Math.floor(p.room / m.cols));
        x = G.clamp(p.x + G.rand(-260, 260), rc.x0 + 60, rc.x1 - 60);
        y = G.clamp(p.y + G.rand(-260, 260), rc.y0 + 60, rc.y1 - 60);
      }
    }
    x = G.clamp(x, G.Map.WALL + def.r + 4, m.worldW - G.Map.WALL - def.r - 4);
    y = G.clamp(y, G.Map.WALL + def.r + 4, m.worldH - G.Map.WALL - def.r - 4);
    if (G.Map.solid(m, x, y)) {
      var rc2 = G.Map.roomRect(Math.floor(G.clamp((x - G.Map.WALL) / G.Map.SEG, 0, m.cols - 1)),
        Math.floor(G.clamp((y - G.Map.WALL) / G.Map.SEG, 0, m.rows - 1)));
      x = G.clamp(x, rc2.x0 + def.r + 8, rc2.x1 - def.r - 8);
      y = G.clamp(y, rc2.y0 + def.r + 8, rc2.y1 - def.r - 8);
    }
    var wave = m.wave || 1;
    var e = new G.Enemy(def, x, y, wave);
    e.room = G.Map.roomAt(m, x, y).idx;
    if (!def.boss) {
      var aff = G.rollAffixes(def.elite, wave);
      if (aff.length) {
        e.affixes = aff;
        for (var ai = 0; ai < aff.length; ai++) {
          var af = aff[ai];
          if (af.id === 'frenzy') {
            e.maxHp = Math.max(1, Math.round(e.maxHp * 0.7));
            e.hp = e.maxHp;
            e.spd *= 1.35;
            e.dmg *= 1.25;
          } else if (af.id === 'shield') {
            e.shieldHp = Math.round(e.maxHp * (def.elite ? 0.22 : 0.35));
          }
        }
        if (def.elite) G.fx('ring', { x: e.x, y: e.y, r0: 6, r1: 48, col: aff[0].color, w: 4, life: 0.5 });
      }
    }
    this.enemies.push(e);
    if (def.elite || def.boss) G.burst(x, y, 14, def.boss ? '#ff4a6b' : '#ffd24a', 200, { size: 4 });
    return e;
  };

  /* ============================================================
     空间网格
     ============================================================ */
  function Grid() { this.map = {}; }
  Grid.prototype.clear = function () { this.map = {}; };
  Grid.prototype.add = function (e) {
    var k = (e.x / CELL | 0) + ',' + (e.y / CELL | 0);
    (this.map[k] || (this.map[k] = [])).push(e);
  };
  Grid.prototype.query = function (x, y, r, out) {
    out = out || [];
    var x0 = (x - r) / CELL | 0, x1 = (x + r) / CELL | 0;
    var y0 = (y - r) / CELL | 0, y1 = (y + r) / CELL | 0;
    for (var i = x0; i <= x1; i++) {
      for (var j = y0; j <= y1; j++) {
        var c = this.map[i + ',' + j];
        if (c) for (var k = 0; k < c.length; k++) out.push(c[k]);
      }
    }
    return out;
  };
  game.grid = new Grid();

  game.rebuildGrid = function () {
    this.grid.clear();
    for (var i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].dead) this.grid.add(this.enemies[i]);
    }
  };

  game.queryEnemies = function (x, y, r) { return this.grid.query(x, y, r); };

  game.nearestEnemy = function (x, y, maxR, exclude) {
    var best = null, bd = maxR * maxR;
    var list = this.grid.query(x, y, maxR);
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.dead) continue;
      if (exclude && exclude.indexOf(e) >= 0) continue;
      var d = G.dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best && maxR > 200) {
      for (var j = 0; j < this.enemies.length; j++) {
        var e2 = this.enemies[j];
        if (e2.dead) continue;
        if (exclude && exclude.indexOf(e2) >= 0) continue;
        var d2 = G.dist2(x, y, e2.x, e2.y);
        if (d2 < maxR * maxR && (!best || d2 < bd)) { bd = d2; best = e2; }
      }
    }
    return best;
  };

  /* ============================================================
     伤害 / 死亡 / 掉落
     ============================================================ */
  game.damageEnemy = function (e, dmg, o) {
    if (e.dead) return;
    o = o || {};
    var p = this.player;

    if (p.hasSp('execute') && e.hp / e.maxHp < 0.18 && !o.dot) dmg *= 3;
    if (e.armor > 0 && !o.dot) dmg *= 1 - Math.min(e.armor / (e.armor + 30), 0.7);
    dmg = Math.max(1, dmg);

    if (e.shieldHp > 0 && !o.dot) {
      var absorbed = Math.min(e.shieldHp, dmg);
      e.shieldHp -= absorbed;
      dmg -= absorbed;
      if (dmg > 0) {
        G.popText(e.x, e.y - e.r * 0.6 - 8, '-' + Math.round(absorbed), { col: '#7fd8ff', size: 11, life: 0.4 });
      } else {
        G.popText(e.x, e.y - e.r - 14, '护盾击碎', { col: '#7fd8ff', size: 12, life: 0.6 });
        G.burst(e.x, e.y, 10, '#7fd8ff', 180, { size: 3 });
        return;
      }
    }

    e.hp -= dmg;
    e.hurt();
    if (!o.dot) G.Audio.sfx('hit', Math.max(-1, Math.min(1, (e.x - p.x) / 350)));
    p.stats.dmgDealt += dmg;

    if (!o.silent) {
      G.popText(o.x || e.x, (o.y || e.y) - e.r * 0.6, Math.round(dmg) + (o.crit ? '!' : ''), {
        col: o.crit ? '#ffd24a' : (o.thorn ? '#9be86f' : '#fff'),
        size: o.crit ? 17 : 13
      });
    }
    if (!o.dot && o.srcW && !o.noHitFx) {
      var wd = o.srcW.def, hc = wd.col;
      if (wd.burn) hc = '#ff7a2a';
      else if (wd.slow) hc = '#7fd0ff';
      else if (wd.poison) hc = '#9ad84a';
      else if (wd.chain) hc = '#9fe8ff';
      var hx = o.x != null ? o.x : e.x, hy = o.y != null ? o.y : e.y;
      G.burstMix(hx, hy, o.crit ? 9 : 5, hc, o.crit ? 230 : 140, {
        glow: false, debCol: '#8a93b5', lifeMul: 0.8
      });
      if (o.crit) G.fx('ring', { x: hx, y: hy, r0: 3, r1: 26, col: '#ffd24a', w: 2.5, life: 0.24 });
    }
    if (o.crit) {
      this.shake(3, 0.08);
      G.Audio.sfx('crit', Math.max(-1, Math.min(1, (e.x - p.x) / 350)));
      if (p.hasSp('critExplode')) G.explode(e.x, e.y, 74, dmg * 0.6, { col: '#ffd24a' });
      if (p.hasSp('critSlow') && !e.def.boss) {
        e.slowT = Math.max(e.slowT, 1.2);
        e.slowMul = Math.min(e.slowMul, 0.6);
      }
    }

    if (o.knock) {
      var kl = Math.hypot(o.kx || 0, o.ky || 0) || 1;
      var mass = e.def.boss ? 0.06 : (e.def.elite ? 0.28 : 1);
      e.kx += (o.kx / kl) * o.knock * mass;
      e.ky += (o.ky / kl) * o.knock * mass;
    }
    if (o.stun && !e.def.boss) e.stunT = Math.max(e.stunT, o.stun);

    if (o.burn) { e.burnT = Math.max(e.burnT, 3); e.burnDmg = Math.max(e.burnDmg, o.burn + p.st.elementalDamage * 0.4); }
    if (o.poison) { e.poisonT = Math.max(e.poisonT, 3.5); e.poisonDmg = Math.max(e.poisonDmg, o.poison); }
    if (o.slow) { e.slowT = Math.max(e.slowT, o.slowTime || 1.2); e.slowMul = Math.min(e.slowMul, 1 - o.slow); }

    if (!o.noChain && !o.dot) {
      if (p.hasSp('burnOnHit') && Math.random() < 0.25) {
        e.burnT = Math.max(e.burnT, 3);
        e.burnDmg = Math.max(e.burnDmg, 4 + p.st.elementalDamage * 0.4);
      }
      if (p.hasSp('poisonOnHit') && Math.random() < 0.22) {
        e.poisonT = Math.max(e.poisonT, 3.5);
        e.poisonDmg = Math.max(e.poisonDmg, 4 + p.st.elementalDamage * 0.3);
      }
      if (p.hasSp('chainOnHit') && Math.random() < 0.12) {
        var t2 = this.nearestEnemy(e.x, e.y, 170, [e]);
        if (t2) G.chainLightning(this, e.x, e.y, t2, dmg * 0.5, false, 2, 150, 0.8, o.srcW, '#8fe8ff');
      }
    }

    if (p.st.lifesteal > 0 && !o.dot && p.lsCd <= 0 && !p.dead) {
      var h = Math.max(1, Math.round(dmg * p.st.lifesteal / 100));
      if (p.hp < p.st.maxHp) {
        p.heal(h);
        p.lsCd = 0.15;
        G.popText(p.x + G.rand(-8, 8), p.y - 26, '+' + h, { col: '#6ee787', size: 11, life: 0.5 });
      }
    }

    G.burst(o.x || e.x, o.y || e.y, o.crit ? 6 : 3, o.crit ? '#ffd24a' : '#ffffff', 130, { size: 2.5, lifeMul: 0.7 });

    if (e.hp <= 0) this.killEnemy(e);
  };

  game.killEnemy = function (e) {
    if (e.dead) return;
    e.dead = true;
    var p = this.player;
    p.stats.kills++;
    if (e.def.elite) {
      p.stats.eliteKills++;
      if (this.map) this.map.eliteKills++;
    }
    if (e.def.boss) {
      p.stats.bossKills++;
      if (this.map) this.map.bossKills++;
    }
    this.combo++; this.comboTimer = 3.0;
    if (this.combo > p.stats.comboMax) p.stats.comboMax = this.combo;
    G.Audio.sfx(e.def.boss ? 'bossdie' : 'kill',
      e.def.boss ? 0 : Math.max(-1, Math.min(1, (e.x - p.x) / 350)));

    G.burstMix(e.x, e.y, e.def.boss ? 70 : (e.def.elite ? 34 : 12), '#ff8a8a', e.def.boss ? 460 : 240, {
      glow: true, debCol: e.def.boss ? '#5a3a4a' : '#6a6f88', lifeMul: 1.1
    });

    if (e.def.boss) {
      G.fx('ring', { x: e.x, y: e.y, r0: 20, r1: 460, col: '#ffd24a', w: 10, life: 1.0 });
      G.fx('ring', { x: e.x, y: e.y, r0: 10, r1: 300, col: '#ffffff', w: 5, life: 0.6 });
      G.fx('flash', { x: e.x, y: e.y, r: 260, col: '#fff', life: 0.4 });
      this.shake(30, 0.9);
      G.UI.banner(e.def.name + ' 已被击败', '#ffd24a');
    } else if (e.def.elite) {
      G.fx('ring', { x: e.x, y: e.y, r0: 10, r1: 180, col: '#ffd24a', w: 5, life: 0.5 });
      G.fx('ring', { x: e.x, y: e.y, r0: 6, r1: 110, col: '#ffffff', w: 3, life: 0.32 });
      this.shake(10, 0.3);
    }

    if (e.def.ai === 'splitter' && e.def.splitInto) {
      for (var i = 0; i < e.def.splitCount; i++) {
        var a = Math.PI * 2 * i / e.def.splitCount + G.rand(0, 1);
        this.spawnEnemy(e.def.splitInto, e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18);
      }
    }
    if (e.affixes && e.affixes.length) {
      for (var afi = 0; afi < e.affixes.length; afi++) {
        if (e.affixes[afi].id === 'split') {
          for (var si = 0; si < 2; si++) {
            var sa = Math.PI * si + G.rand(-0.45, 0.45);
            this.spawnEnemy('swarmling', e.x + Math.cos(sa) * 20, e.y + Math.sin(sa) * 20);
          }
          break;
        }
      }
    }
    if (e.def.ai === 'bomber' && !e.exploded) {
      G.explode(e.x, e.y, e.def.boomR * 0.8, e.def.boomDmg * 0.7 * G.waveScale(this.map ? this.map.wave : 1).dmg,
        { hostile: true, col: '#ff9a3a' });
    }
    if (p.hasSp('explodeOnKill')) G.explode(e.x, e.y, 82, 12 + p.st.elementalDamage, { col: '#ff6b3a' });
    if (p.hasSp('leechOnKill')) {
      var heal = Math.max(1, Math.round(p.st.maxHp * 0.012));
      p.heal(heal);
    }

    this.dropLoot(e);
    this.checkObjective();
  };

  game.dropLoot = function (e) {
    var p = this.player;
    var mul = (e.def.elite || e.def.boss) ? 1 : (G.MAT_MUL || 1);
    var expect = e.mat * mul * (1 + p.st.dropRate / 100);
    if (expect > 0) {
      var whole = Math.floor(expect);
      var frac = expect - whole;
      var n = whole + (Math.random() < frac ? 1 : 0);
      if (n > 0) {
        var cap = Math.min(n, 10);
        for (var i = 0; i < cap; i++) {
          this.pickups.push(new G.Pickup(e.x + G.rand(-8, 8), e.y + G.rand(-8, 8), 'mat', 1));
        }
        if (n > 10) this.pickups.push(new G.Pickup(e.x, e.y, 'mat', n - 10));
      }
    }
    var chance = 0.014 + p.st.luck * 0.00035;
    if (e.def.elite) chance = 0.55;
    if (e.def.boss) chance = 1;
    if (Math.random() < chance) {
      var amt = Math.round(p.st.maxHp * (e.def.boss ? 0.35 : e.def.elite ? 0.15 : 0.07));
      this.pickups.push(new G.Pickup(e.x, e.y, 'heal', Math.max(3, amt)));
    }
    /* 物品掉落 → 背包 */
    var loot = G.rollEnemyLoot(e.def, this.map ? this.map.tierId : 1, p.st.luck);
    for (var li = 0; li < loot.length; li++) {
      var inst = loot[li];
      if (G.addBagItem(inst)) {
        if (e.def.elite || e.def.boss) {
          G.Audio.sfx('item_get');
          G.UI.showLootCard(inst);
        }
      }
    }
  };

  game.addMaterials = function (v) {
    this.materials += v;
    this.player.stats.matEarned += v;
  };

  game.shake = function (amt, t) {
    var s = (this.shakeScale != null) ? this.shakeScale : 0.4;
    this.shakeAmt = Math.max(this.shakeAmt, amt * s);
    this.shakeT = Math.max(this.shakeT, t);
  };

  /* ============================================================
     更新
     ============================================================ */
  game.update = function (dt) {
    var i, arr;
    if (this.state !== 'play') return;

    this.runTime += dt;
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    if (this.map) {
      this.map.time += dt;
      this.levelCd = Math.max(0, this.levelCd - dt);
    }

    this.rebuildGrid();
    this.player.update(dt);

    /* 房间切换 */
    var curRoom = G.Map.roomAt(this.map, this.player.x, this.player.y).idx;
    if (curRoom !== this.lastRoom) {
      this.lastRoom = curRoom;
      this.enterRoom(curRoom);
      this.player.room = curRoom;
    }

    this.updateSpawning(dt);
    this.checkObjective();

    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.dead) e.update(dt);
    }
    this.separate();
    arr = this.enemies; for (i = arr.length - 1; i >= 0; i--) if (arr[i].dead) arr.splice(i, 1);

    stepList(this.bullets, dt);
    stepList(this.ebullets, dt);
    stepList(this.pickups, dt);
    stepList(this.turrets, dt);
    stepList(this.drones, dt);
    stepList(this.mines, dt);
    stepList(this.containers, dt);
    stepList(this.particles, dt);
    stepList(this.texts, dt);
    stepList(this.effects, dt);

    G.Extract.update(dt);

    /* 升级弹出（战斗中短暂滞后） */
    if (this.player.pendingLevels > 0 && this.levelCd <= 0 && this.state === 'play') {
      this.openLevelUp();
    }

    var tx = this.player.x - this.vw / 2;
    var ty = this.player.y - this.vh / 2;
    var ww = this.map.worldW, wh = this.map.worldH;
    if (ww < this.vw) tx = (ww - this.vw) / 2; else tx = G.clamp(tx, 0, ww - this.vw);
    if (wh < this.vh) ty = (wh - this.vh) / 2; else ty = G.clamp(ty, 0, wh - this.vh);
    this.camX = G.lerp(this.camX, tx, G.clamp(dt * 12, 0, 1));
    this.camY = G.lerp(this.camY, ty, G.clamp(dt * 12, 0, 1));

    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeAmt = 0; }
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.6);

    G.UI.updateHud(this);
  };

  /* 地图威胁刷怪：当前房间内持续压迫，随停留时间加剧 */
  game.updateSpawning = function (dt) {
    var m = this.map, p = this.player;
    var rm = G.Map.roomAt(m, p.x, p.y);
    var roomCap = { combat: 8, treasure: 4, elite: 6, boss: 6, shrine: 4, altar: 4, extract: 5, spawn: 3 };
    var cap = roomCap[rm.type] || 5;
    var inRoom = 0;
    for (var i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].dead && this.enemies[i].room === rm.idx) inRoom++;
    }
    var danger = m.tier.danger;
    var interval = G.clamp(1.65 - m.time * 0.008 - danger * 0.055, 0.45, 1.65);
    m.threatAcc += dt;
    if (inRoom < cap && this.enemies.length < MAX_ENEMIES - 8 && m.threatAcc >= interval) {
      m.threatAcc = 0;
      var eid = this.rollMapEnemy();
      if (eid) this.spawnEnemy(eid);
    }
  };

  game.rollMapEnemy = function () {
    var m = this.map;
    var ids = [], ws = [];
    for (var w = m.tier.waveBand[0]; w <= m.tier.waveBand[1]; w++) {
      var cfg = G.WAVES[w - 1];
      if (!cfg) continue;
      for (var i = 0; i < cfg.pool.length; i++) {
        var id = cfg.pool[i][0];
        var wgt = cfg.pool[i][1];
        var idx = ids.indexOf(id);
        if (idx >= 0) ws[idx] += wgt;
        else { ids.push(id); ws.push(wgt); }
      }
    }
    if (!ids.length) return null;
    return G.weightedPick(ids, ws);
  };

  function stepList(list, dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      list[i].update(dt);
      if (list[i].dead) list.splice(i, 1);
    }
  }

  game.separate = function () {
    var arr = this.enemies, i, j;
    if (arr.length > 260) return;
    for (i = 0; i < arr.length; i++) {
      var a = arr[i];
      if (a.dead || a.def.boss) continue;
      var near = this.grid.query(a.x, a.y, a.r * 2 + 8);
      var cnt = 0;
      for (j = 0; j < near.length && cnt < 6; j++) {
        var b = near[j];
        if (b === a || b.dead) continue;
        var dx = a.x - b.x, dy = a.y - b.y;
        var rr = (a.r + b.r) * 0.86;
        var d2 = dx * dx + dy * dy;
        if (d2 > rr * rr || d2 < 0.0001) continue;
        var d = Math.sqrt(d2);
        var push = (rr - d) / rr * 46;
        a.kx += (dx / d) * push;
        a.ky += (dy / d) * push;
        cnt++;
      }
    }
  };

  /* ============================================================
     渲染
     ============================================================ */
  game.render = function () {
    var c = this.ctx, i;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#0a0c12';
    c.fillRect(0, 0, this.vw, this.vh);
    if (!this.player || !this.map) return;

    var sx = 0, sy = 0;
    if (this.shakeT > 0) {
      var k = this.shakeAmt;
      sx = G.rand(-k, k); sy = G.rand(-k, k);
    }
    c.save();
    c.translate(Math.round(-this.camX + sx), Math.round(-this.camY + sy));

    this.drawMap(c);

    for (i = 0; i < this.pickups.length; i++) this.pickups[i].draw(c);
    for (i = 0; i < this.containers.length; i++) this.containers[i].draw(c);
    for (i = 0; i < this.turrets.length; i++) this.turrets[i].draw(c);
    for (i = 0; i < this.drones.length; i++) this.drones[i].draw(c);
    for (i = 0; i < this.mines.length; i++) this.mines[i].draw(c);

    var es = this._renderBuf;
    es.length = 0;
    for (i = 0; i < this.enemies.length; i++) es.push(this.enemies[i]);
    es.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < es.length; i++) es[i].draw(c);

    this.player.draw(c);

    for (i = 0; i < this.bullets.length; i++) this.bullets[i].draw(c);
    for (i = 0; i < this.ebullets.length; i++) this.ebullets[i].draw(c);
    for (i = 0; i < this.particles.length; i++) this.particles[i].draw(c);
    for (i = 0; i < this.effects.length; i++) this.effects[i].draw(c);
    for (i = 0; i < this.texts.length; i++) this.texts[i].draw(c);

    G.Extract.draw(c);
    c.restore();

    this.drawOffscreenMarks(c);

    if (this.hurtFlash > 0) {
      c.fillStyle = 'rgba(200,30,40,' + (this.hurtFlash * 0.28) + ')';
      c.fillRect(0, 0, this.vw, this.vh);
    }
    var hr = this.player.hp / this.player.st.maxHp;
    if (hr < 0.3 && !this.player.dead) {
      var pulse = (Math.sin(performance.now() / 220) + 1) / 2;
      c.fillStyle = 'rgba(180,20,30,' + (0.05 + (0.3 - hr) * 0.5 * pulse) + ')';
      c.fillRect(0, 0, this.vw, this.vh);
    }
    if (this._vigGrd) {
      c.fillStyle = this._vigGrd;
      c.fillRect(0, 0, this.vw, this.vh);
    }
  };

  game.drawMap = function (c) {
    var m = this.map, i;
    var tile = 64;
    /* 地板：只画可见房间 */
    var c0 = G.clamp(Math.floor((this.camX - G.Map.WALL) / G.Map.SEG), 0, m.cols - 1);
    var r0 = G.clamp(Math.floor((this.camY - G.Map.WALL) / G.Map.SEG), 0, m.rows - 1);
    var c1 = G.clamp(Math.ceil((this.camX + this.vw - G.Map.WALL) / G.Map.SEG), 0, m.cols - 1);
    var r1 = G.clamp(Math.ceil((this.camY + this.vh - G.Map.WALL) / G.Map.SEG), 0, m.rows - 1);
    c.fillStyle = '#12141d';
    c.fillRect(0, 0, m.worldW, m.worldH);
    for (var cr = r0; cr <= r1; cr++) {
      for (var cc = c0; cc <= c1; cc++) {
        var rm = m.rooms[cc + cr * m.cols];
        var rc = G.Map.roomRect(cc, cr);
        var explored = rm.explored;
        c.fillStyle = explored ? '#151824' : '#0d0f16';
        c.fillRect(rc.x0, rc.y0, rc.x1 - rc.x0, rc.y1 - rc.y0);
        if (explored) {
          c.fillStyle = '#181b28';
          for (var tx = rc.x0; tx < rc.x1; tx += tile) {
            for (var ty = rc.y0; ty < rc.y1; ty += tile) {
              if (((tx - rc.x0) / tile + (ty - rc.y0) / tile) % 2) c.fillRect(tx, ty, tile, tile);
            }
          }
          /* 房间类型装饰 */
          if (rm.type === 'extract') {
            c.strokeStyle = 'rgba(110,231,135,.18)'; c.lineWidth = 6;
            c.strokeRect(rc.x0 + 10, rc.y0 + 10, rc.x1 - rc.x0 - 20, rc.y1 - rc.y0 - 20);
          } else if (rm.type === 'treasure') {
            c.strokeStyle = 'rgba(255,210,74,.12)'; c.lineWidth = 4;
            c.strokeRect(rc.x0 + 14, rc.y0 + 14, rc.x1 - rc.x0 - 28, rc.y1 - rc.y0 - 28);
          } else if (rm.type === 'boss') {
            c.strokeStyle = 'rgba(255,74,107,.16)'; c.lineWidth = 6;
            c.strokeRect(rc.x0 + 8, rc.y0 + 8, rc.x1 - rc.x0 - 16, rc.y1 - rc.y0 - 16);
          }
        } else {
          c.fillStyle = '#0a0c12';
          c.fillRect(rc.x0 + 2, rc.y0 + 2, rc.x1 - rc.x0 - 4, rc.y1 - rc.y0 - 4);
        }
      }
    }
    /* 墙 */
    c.fillStyle = '#1d2232';
    for (i = 0; i < this._wallRects.length; i++) {
      var w = this._wallRects[i];
      if (w[2] < this.camX - 40 || w[0] > this.camX + this.vw + 40 ||
          w[3] < this.camY - 40 || w[1] > this.camY + this.vh + 40) continue;
      c.fillRect(w[0], w[1], w[2] - w[0], w[3] - w[1]);
    }
    /* 门洞边缘光 */
    c.fillStyle = '#262c40';
    c.strokeStyle = '#3a4766'; c.lineWidth = 3;
    for (var dr = 0; dr < m.rows; dr++) {
      for (var dc = 0; dc < m.cols - 1; dc++) {
        if (m.doorsH[dc][dr]) {
          var rch = G.Map.roomRect(dc, dr);
          var dy = rch.y0 + G.Map.ROOM / 2;
          c.fillRect((dc + 1) * G.Map.SEG, dy - G.Map.DOOR / 2, G.Map.WALL, G.Map.DOOR);
        }
      }
    }
    for (var dr2 = 0; dr2 < m.rows - 1; dr2++) {
      for (var dc2 = 0; dc2 < m.cols; dc2++) {
        if (m.doorsV[dc2][dr2]) {
          var rcv = G.Map.roomRect(dc2, dr2);
          var dx = rcv.x0 + G.Map.ROOM / 2;
          c.fillRect(dx - G.Map.DOOR / 2, (dr2 + 1) * G.Map.SEG, G.Map.DOOR, G.Map.WALL);
        }
      }
    }
  };

  game.drawOffscreenMarks = function (c) {
    var cx = this.vw / 2, cy = this.vh / 2;
    var margin = 34;
    var count = 0;
    for (var i = 0; i < this.enemies.length && count < 26; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      var x = e.x - this.camX, y = e.y - this.camY;
      if (x > -20 && y > -20 && x < this.vw + 20 && y < this.vh + 20) continue;
      if (!e.def.elite && !e.def.boss && Math.random() > 0.35) continue;
      count++;
      var a = Math.atan2(y - cy, x - cx);
      var px = cx + Math.cos(a) * (cx - margin);
      var py = cy + Math.sin(a) * (cy - margin);
      px = G.clamp(px, margin, this.vw - margin);
      py = G.clamp(py, margin, this.vh - margin);
      c.save();
      c.translate(px, py); c.rotate(a);
      c.fillStyle = e.def.boss ? '#ff4a6b' : e.def.elite ? '#ffd24a' : 'rgba(200,90,110,.55)';
      var s = e.def.boss ? 11 : e.def.elite ? 9 : 5;
      c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.7, s * 0.7); c.lineTo(-s * 0.7, -s * 0.7); c.closePath(); c.fill();
      c.restore();
    }
    /* 撤离点标记（未开放时也提示方向） */
    if (this.map) {
      var ex = this.map.extract;
      var exx = ex.x - this.camX, exy = ex.y - this.camY;
      if (exx < -20 || exy < -20 || exx > this.vw + 20 || exy > this.vh + 20) {
        var ea = Math.atan2(exy - cy, exx - cx);
        var epx = cx + Math.cos(ea) * (cx - 46);
        var epy = cy + Math.sin(ea) * (cy - 46);
        epx = G.clamp(epx, 46, this.vw - 46);
        epy = G.clamp(epy, 46, this.vh - 46);
        c.save(); c.translate(epx, epy);
        c.fillStyle = ex.active ? '#6ee787' : '#5a5f72';
        c.beginPath(); c.moveTo(0, -9); c.lineTo(7, 6); c.lineTo(-7, 6); c.closePath(); c.fill();
        c.restore();
      }
    }
  };

  /* ============================================================
     升级（就地选择，返回战斗）
     ============================================================ */
  game.openLevelUp = function () {
    var p = this.player;
    if (p.pendingLevels <= 0) { this.state = 'play'; return; }
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

  game.togglePause = function () {
    if (this.state === 'play') { this.state = 'pause'; G.UI.showScreen('scrPause'); }
    else if (this.state === 'pause') { this.state = 'play'; G.UI.showScreen(null); }
  };

  /* ============================================================
     存档：进图即存（读档回到进图状态，地图按种子重建）
     ============================================================ */
  game.saveRun = function () {
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
      carried: this.carried,
      mapTime: this.map.time,
      extractActive: !!this.map.extract.active,
      explored: [],
      opened: []
    };
    this.map.rooms.forEach(function (rm) { if (rm.explored) data.explored.push(rm.idx); });
    this.containers.forEach(function (c2) { if (c2.opened || c2.used) data.opened.push(c2.cid); });
    G.Save.saveRun(data);
  };

  game.resumeRun = function (data) {
    if (!data || !data.charId || data.mode !== 'extract') return false;
    var base = G.CHAR_BY_ID[data.charId];
    if (!base) return false;
    var c = Object.assign({}, base);
    c.mods = Object.assign({}, data.charMods || {});
    this.player = new G.Player(c);
    this.player.maxWeapons = 2;

    this.enemies = []; this.bullets = []; this.ebullets = [];
    this.pickups = []; this.particles = []; this.texts = [];
    this.effects = []; this.turrets = []; this.drones = []; this.mines = [];
    this.hurtFlash = 0; this.shakeAmt = 0;
    this.combo = 0; this.comboTimer = 0; this.runTime = data.runTime || 0;
    this.materials = data.materials;
    this.carried = data.carried || { weapons: [], items: [], bag: [], starter: [] };

    var p = this.player;
    p.level = data.level;
    p.xp = data.xp;
    p.xpNeed = G.xpForLevel(data.level);
    p.pendingLevels = data.pendingLevels || 0;

    var i;
    (this.carried.weapons || []).forEach(function (w) {
      var wk = G.makeWeapon(w.defId, w.tier);
      if (wk) p.addWeapon(wk);
    });
    (this.carried.items || []).forEach(function (it) {
      var d = G.ITEM_MAP[it.defId];
      if (d) p.addItem(d);
    });
    this.bag = [];
    (this.carried.bag || []).forEach(function (b) {
      var inst = G.itemFromData(b);
      if (inst) this.bag.push(inst);
    }, this);
    p.recalc();
    p.hp = G.clamp(data.hp, 1, p.st.maxHp);
    p.stats = data.stats || p.stats;

    this.map = G.Map.generate(data.tierId || 1, data.salt || 0);
    this.arena = this.map.worldW;
    this.map.wave = this.map.tier.waveBand[1];
    this.map.time = data.mapTime || 0;
    this.map.extract.active = !!data.extractActive;
    if (data.extractActive) this.map.objDone = true;
    this.buildWallRects();
    this.containers = this.map.containers.map(function (c2) { return new G.Container(c2); });
    var openedSet = {};
    (data.opened || []).forEach(function (id) { openedSet[id] = 1; });
    this.containers.forEach(function (c2) {
      if (openedSet[c2.cid]) { c2.opened = true; c2.used = true; }
    });
    (data.explored || []).forEach(function (idx) { if (G.game.map.rooms[idx]) G.game.map.rooms[idx].explored = true; });

    this.player.x = this.map.spawn.x;
    this.player.y = this.map.spawn.y;
    this.player.room = this.map.startRoom;
    this.lastRoom = -1;
    this.levelCd = 0;

    G.$('statPanel').classList.add('hidden');
    G.UI.initHud();
    this.state = 'play';
    G.UI.showScreen(null);
    this.enterRoom(this.map.startRoom);
    G.UI.banner('继续探索 · ' + this.map.tier.name, this.map.tier.col);
    G.UI.updateObjective(this.map);
    if (!this.running) { this.running = true; this.lastT = performance.now(); requestAnimationFrame(loop); }
    G.Audio.setBgm(G.Save.getSettings().bgm);
    return true;
  };

  /* ============================================================
     主循环
     ============================================================ */
  function loop(t) {
    var dt = (t - game.lastT) / 1000;
    game.lastT = t;
    dt = Math.min(dt, 0.05);
    game.update(dt);
    game.render();
    requestAnimationFrame(loop);
  }

})();
