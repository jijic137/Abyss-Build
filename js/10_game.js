/* ============================================================
   10_game.js —— 核心循环 / 波次管理 / 碰撞 / 结算
   ============================================================ */
'use strict';

(function () {

  var ARENA = 1600;
  var CELL = 90;
  var MAX_ENEMIES = 230;

  var game = {
    state: 'title',     // title | play | shop | level | pause | result
    arena: ARENA,
    canvas: null, ctx: null,
    dpr: 1, vw: 0, vh: 0,
    camX: 0, camY: 0,

    player: null,
    enemies: [], bullets: [], ebullets: [], pickups: [],
    particles: [], texts: [], effects: [], turrets: [],

    wave: 1, waveTime: 0, waveDur: 0,
    budget: 0, spawnAcc: 0,
    eliteQueue: [], bossSpawned: false,
    materials: 0,

    shakeAmt: 0, shakeT: 0, hurtFlash: 0, shakeScale: 0.4,
    keys: {}, grid: null,
    lastT: 0, acc: 0, running: false
  };
  G.game = game;

  /* ============================================================
     初始化
     ============================================================ */
  game.init = function () {
    this.canvas = G.$('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.resize();
    window.addEventListener('resize', function () { game.resize(); });

    var map = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down'
    };
    window.addEventListener('keydown', function (e) {
      if (map[e.code]) { game.keys[map[e.code]] = true; e.preventDefault(); }
      if (e.code === 'Tab') { e.preventDefault(); if (game.player) G.UI.toggleStatPanel(game.player); }
      if (e.code === 'Escape') {
        e.preventDefault();
        // 设置页内按 ESC 直接返回（回到暂停或标题），不触发暂停切换
        if (G.UI.isScreenOn('scrSettings')) { G.UI.closeSettings(); return; }
        game.togglePause();
      }
    });
    window.addEventListener('keyup', function (e) {
      if (map[e.code]) { game.keys[map[e.code]] = false; e.preventDefault(); }
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
  };

  /* ============================================================
     开局
     ============================================================ */
  game.newRun = function (charDef) {
    // 浅克隆角色定义，避免升级写回的 mods 污染全局 G.CHARACTERS
    var c = Object.assign({}, charDef);
    c.mods = Object.assign({}, charDef.mods || {});
    this.player = new G.Player(c);
    this.player.x = ARENA / 2;
    this.player.y = ARENA / 2;
    this.player.addWeapon(G.makeWeapon(charDef.startWeapon, 0));
    this.materials = charDef.startMat;
    this.wave = 1;
    this.enemies = []; this.bullets = []; this.ebullets = [];
    this.pickups = []; this.particles = []; this.texts = [];
    this.effects = []; this.turrets = [];
    this.hurtFlash = 0; this.shakeAmt = 0;
    this.combo = 0; this.comboTimer = 0; this.runTime = 0;
    G.$('statPanel').classList.add('hidden');
    G.UI.initHud();
    this.startWave(1);
    if (!this.running) { this.running = true; this.lastT = performance.now(); requestAnimationFrame(loop); }
  };

  /* ============================================================
     波次
     ============================================================ */
  game.startWave = function (n) {
    var cfg = G.WAVES[n - 1];
    this.wave = n;
    this.waveDur = cfg.dur;
    this.waveTime = cfg.dur;
    this.budget = 0;
    this.bossSpawned = false;
    this.eliteQueue = (cfg.elites || []).map(function (e) {
      return { id: e[0], at: cfg.dur * (1 - e[1]) };  // 剩余时间到达该值时出现
    });
    this.state = 'play';
    G.UI.showScreen(null);
    G.UI.banner('第 ' + n + ' 波', cfg.boss ? '#ff6b6b' : (cfg.elites ? '#ffd24a' : '#fff'));
    G.Audio.sfx('wave');
    // 清掉上一波残留
    this.bullets.length = 0; this.ebullets.length = 0;

    if (cfg.boss) {
      var b = this.spawnEnemy(cfg.boss, ARENA / 2, ARENA / 2 - 340);
      if (b) { this.bossSpawned = true; }
      G.UI.banner(G.ENEMY_MAP[cfg.boss].name, '#ff4a4a');
      G.Audio.sfx('boss');
    }
  };

  game.bossAlive = function () {
    for (var i = 0; i < this.enemies.length; i++)
      if (this.enemies[i].def.boss && !this.enemies[i].dead) return true;
    return false;
  };

  game.updateWave = function (dt) {
    var cfg = G.WAVES[this.wave - 1];
    if (this.waveTime > 0) this.waveTime -= dt;

    // 精英登场
    for (var i = this.eliteQueue.length - 1; i >= 0; i--) {
      if (this.waveTime <= this.eliteQueue[i].at) {
        var id = this.eliteQueue[i].id;
        this.eliteQueue.splice(i, 1);
        var e = this.spawnEnemy(id);
        if (e) {
          G.UI.banner('精英出现', '#ffd24a');
          G.fx('ring', { x: e.x, y: e.y, r0: 10, r1: 180, col: '#ffd24a', w: 6, life: 0.6 });
        }
      }
    }

    // 常规刷怪
    if (this.waveTime > 0) {
      this.budget += cfg.rate * dt;
      var guard = 0;
      while (this.budget > 0 && this.enemies.length < MAX_ENEMIES && guard++ < 12) {
        var eid = G.rollEnemy(this.wave);
        var def = G.ENEMY_MAP[eid];
        if (this.budget < def.danger) break;
        this.budget -= def.danger;
        this.spawnEnemy(eid);
      }
    }

    // 结束判定
    if (this.waveTime <= 0 && !this.bossAlive()) this.endWave();
  };

  game.endWave = function () {
    var p = this.player, i;
    // 清场
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      G.burst(e.x, e.y, 6, '#556', 120);
      e.dead = true;
    }
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.ebullets.length = 0;
    this.turrets.length = 0;

    // 自动收取地面材料
    var got = 0;
    for (i = 0; i < this.pickups.length; i++) {
      if (this.pickups[i].type === 'mat') { got += this.pickups[i].value; p.addXp(this.pickups[i].value); }
    }
    if (got) this.addMaterials(got);
    this.pickups.length = 0;

    // 收获
    var hv = G.F.harvestGain(p.st.harvesting, this.wave);
    if (hv > 0) this.addMaterials(hv);

    // 波末治疗
    var heal = Math.round(p.st.maxHp * p.st.waveHeal / 100);
    if (heal > 0) p.heal(heal);

    this.wave++;
    if (this.wave > G.MAX_WAVE) { this.onVictory(); return; }

    if (p.pendingLevels > 0) this.openLevelUp();
    else this.openShop();
  };

  game.openLevelUp = function () {
    var p = this.player;
    if (p.pendingLevels <= 0) { this.openShop(); return; }
    this.state = 'level';
    var opts = G.rollLevelOptions(4, p.level);
    G.UI.renderLevelUp(this, opts, function (o) {
      G.addStats(p.st, {});           // 保底
      p.char.mods[o.key] = (p.char.mods[o.key] || 0) + o.val;  // 写进角色基底，recalc 后保留
      if (o.negKey) p.char.mods[o.negKey] = (p.char.mods[o.negKey] || 0) - o.negVal;  // 权衡卡负面
      p.recalc();
      if (p.st.maxHp < 1) p.st.maxHp = 1;
      if (o.key === 'maxHp') p.heal(o.val);
      if (p.hp > p.st.maxHp) p.hp = p.st.maxHp;   // 负面削减最大生命后夹紧当前血量
      p.pendingLevels--;
      G.game.openLevelUp();
    });
    G.UI.showScreen('scrLevel');
    G.Audio.sfx('levelup');
  };

  game.openShop = function () {
    this.state = 'shop';
    G.Shop.open(this.wave, this.player);
    G.UI.renderShop(this);
    G.UI.showScreen('scrShop');
    this.saveRun();                       // 进入商店即存盘（关卡 + 构筑快照）
  };

  /* ============================================================
     存档：进行中战局序列化 / 恢复
     ============================================================ */
  game.saveRun = function () {
    if (!this.player) return;
    var p = this.player;
    var data = {
      v: 1,
      charId: p.char.id,
      charMods: p.char.mods,               // 升级写回的属性（recalc 会再次应用）
      wave: this.wave,                     // 即将进行的下一波
      materials: this.materials,
      level: p.level,
      xp: p.xp,
      pendingLevels: p.pendingLevels || 0,
      hp: p.hp,
      runTime: this.runTime || 0,
      stats: p.stats,
      items: p.items.map(function (it) { return it.id; }),
      weapons: p.weapons.map(function (w) { return { defId: w.def.id, tier: w.tier }; })
    };
    G.Save.saveRun(data);
  };

  game.resumeRun = function (data) {
    if (!data || !data.charId) return false;
    var base = G.CHAR_BY_ID[data.charId];
    if (!base) return false;

    // 用存档中的 mods 重建角色定义（不含初始武器，由武器快照重建）
    var c = Object.assign({}, base);
    c.mods = Object.assign({}, data.charMods || {});
    this.player = new G.Player(c);

    // 重置战斗现场
    this.enemies = []; this.bullets = []; this.ebullets = [];
    this.pickups = []; this.particles = []; this.texts = [];
    this.effects = []; this.turrets = [];
    this.hurtFlash = 0; this.shakeAmt = 0;
    this.combo = 0; this.comboTimer = 0; this.runTime = data.runTime || 0;

    // 进度
    this.materials = data.materials;
    this.wave = data.wave;

    var p = this.player;
    p.level = data.level;
    p.xp = data.xp;
    p.xpNeed = G.xpForLevel(data.level);
    p.pendingLevels = data.pendingLevels || 0;
    (data.items || []).forEach(function (id) { var d = G.ITEM_MAP[id]; if (d) p.addItem(d); });
    (data.weapons || []).forEach(function (w) { p.addWeapon(G.makeWeapon(w.defId, w.tier)); });
    p.recalc();
    p.hp = G.clamp(data.hp, 1, p.st.maxHp);
    p.stats = data.stats || p.stats;

    G.$('statPanel').classList.add('hidden');
    G.UI.initHud();
    if (!this.running) { this.running = true; this.lastT = performance.now(); requestAnimationFrame(loop); }
    this.openShop();                       // 回到存档时的商店界面，可继续购买后进入下一波
    G.Audio.setBgm(G.Save.getSettings().bgm);   // 续局按设置恢复 BGM
    return true;
  };

  game.nextWave = function () {
    if (this.wave > G.MAX_WAVE) { this.onVictory(); return; }
    this.player.hitCd = 0.8;
    this.startWave(this.wave);
  };

  game.togglePause = function () {
    if (this.state === 'play') { this.state = 'pause'; G.UI.showScreen('scrPause'); }
    else if (this.state === 'pause') { this.state = 'play'; G.UI.showScreen(null); }
  };

  game.onPlayerDeath = function () {
    var g = this;
    G.burst(this.player.x, this.player.y, 40, '#ff6b6b', 320, { size: 5 });
    this.shake(24, 0.6);
    G.Audio.sfx('death');
    G.Audio.stopMusic();
    G.Save.clearRun();                  // 战局结束，清除续局存档
    setTimeout(function () {
      g.state = 'result';
      G.UI.showResult(g, false);
    }, 900);
  };

  game.onVictory = function () {
    this.state = 'result';
    G.UI.showResult(this, true);
    G.Save.clearRun();                  // 通关，清除续局存档
    G.Audio.sfx('victory');
    G.Audio.stopMusic();
  };

  /* ============================================================
     敌人生成
     ============================================================ */
  game.spawnEnemy = function (id, x, y) {
    var def = G.ENEMY_MAP[id];
    if (!def) return null;
    if (this.enemies.length >= MAX_ENEMIES + 40) return null;
    if (x === undefined) {
      var p = this.player;
      var rad = Math.max(this.vw, this.vh) * 0.58 + G.rand(20, 120);
      for (var t = 0; t < 10; t++) {
        var a = G.rand(0, Math.PI * 2);
        x = p.x + Math.cos(a) * rad;
        y = p.y + Math.sin(a) * rad;
        if (x > 30 && y > 30 && x < ARENA - 30 && y < ARENA - 30) break;
        x = undefined;
      }
      if (x === undefined) {
        // 退化：随机边缘
        var side = G.randInt(0, 3);
        x = side === 0 ? 40 : side === 1 ? ARENA - 40 : G.rand(40, ARENA - 40);
        y = side === 2 ? 40 : side === 3 ? ARENA - 40 : G.rand(40, ARENA - 40);
      }
    }
    x = G.clamp(x, def.r + 4, ARENA - def.r - 4);
    y = G.clamp(y, def.r + 4, ARENA - def.r - 4);
    var e = new G.Enemy(def, x, y, this.wave);
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
    // 网格半径不够时退化到全表（BOSS 等大目标）
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

    // 处决
    if (p.hasSp('execute') && e.hp / e.maxHp < 0.18 && !o.dot) dmg *= 3;

    // 敌人护甲
    if (e.armor > 0 && !o.dot) dmg *= 1 - Math.min(e.armor / (e.armor + 30), 0.7);

    dmg = Math.max(1, dmg);
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
    // 命中粒子：按武器元素/颜色上色，像素+辉光混合风格
    if (!o.dot && o.srcW && !o.noHitFx) {
      var wd = o.srcW.def, hc = wd.col;
      if (wd.burn) hc = '#ff7a2a';
      else if (wd.slow) hc = '#7fd0ff';
      else if (wd.poison) hc = '#9ad84a';
      else if (wd.chain) hc = '#9fe8ff';
      var hx = o.x != null ? o.x : e.x, hy = o.y != null ? o.y : e.y;
      G.burst(hx, hy, o.crit ? 5 : 3, hc, o.crit ? 180 : 120, { size: 2, lifeMul: 0.5, drag: 0.9 });
    }
    if (o.crit) {
      this.shake(3, 0.08);
      G.Audio.sfx('crit', Math.max(-1, Math.min(1, (e.x - p.x) / 350)));
      if (p.hasSp('critExplode')) {
        G.explode(e.x, e.y, 74, dmg * 0.6, { col: '#ffd24a' });
      }
      if (p.hasSp('critSlow') && !e.def.boss) {
        e.slowT = Math.max(e.slowT, 1.2);
        e.slowMul = Math.min(e.slowMul, 0.6);
      }
    }

    // 击退
    if (o.knock) {
      var kl = Math.hypot(o.kx || 0, o.ky || 0) || 1;
      var mass = e.def.boss ? 0.06 : (e.def.elite ? 0.28 : 1);
      e.kx += (o.kx / kl) * o.knock * mass;
      e.ky += (o.ky / kl) * o.knock * mass;
    }
    if (o.stun && !e.def.boss) e.stunT = Math.max(e.stunT, o.stun);

    // 状态
    if (o.burn) { e.burnT = Math.max(e.burnT, 3); e.burnDmg = Math.max(e.burnDmg, o.burn + p.st.elementalDamage * 0.4); }
    if (o.poison) { e.poisonT = Math.max(e.poisonT, 3.5); e.poisonDmg = Math.max(e.poisonDmg, o.poison); }
    if (o.slow) { e.slowT = Math.max(e.slowT, o.slowTime || 1.2); e.slowMul = Math.min(e.slowMul, 1 - o.slow); }

    // 物品触发
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
        var t = this.nearestEnemy(e.x, e.y, 170, [e]);
        if (t) G.chainLightning(this, e.x, e.y, t, dmg * 0.5, false, 2, 150, 0.8, o.srcW, '#8fe8ff');
      }
    }

    // 吸血
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
    if (e.def.elite) p.stats.eliteKills++;
    if (e.def.boss) p.stats.bossKills++;
    this.combo++; this.comboTimer = 3.0;
    if (this.combo > p.stats.comboMax) p.stats.comboMax = this.combo;
    G.Audio.sfx(e.def.boss ? 'bossdie' : 'kill',
      e.def.boss ? 0 : Math.max(-1, Math.min(1, (e.x - p.x) / 350)));

    G.burst(e.x, e.y, e.def.boss ? 60 : (e.def.elite ? 26 : 8), '#ff8a8a', e.def.boss ? 420 : 200,
      { size: e.def.boss ? 6 : 3 });

    if (e.def.boss) {
      G.fx('ring', { x: e.x, y: e.y, r0: 20, r1: 460, col: '#ffd24a', w: 10, life: 1.0 });
      G.fx('flash', { x: e.x, y: e.y, r: 260, col: '#fff', life: 0.4 });
      this.shake(30, 0.9);
      G.UI.banner(e.def.name + ' 已被击败', '#ffd24a');
    } else if (e.def.elite) {
      G.fx('ring', { x: e.x, y: e.y, r0: 10, r1: 180, col: '#ffd24a', w: 5, life: 0.5 });
      this.shake(10, 0.3);
    }

    // 分裂
    if (e.def.ai === 'splitter' && e.def.splitInto) {
      for (var i = 0; i < e.def.splitCount; i++) {
        var a = Math.PI * 2 * i / e.def.splitCount + G.rand(0, 1);
        this.spawnEnemy(e.def.splitInto, e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18);
      }
    }
    // 爆弹虫死亡也炸
    if (e.def.ai === 'bomber' && !e.exploded) {
      G.explode(e.x, e.y, e.def.boomR * 0.8, e.def.boomDmg * 0.7 * G.waveScale(this.wave).dmg,
        { hostile: true, col: '#ff9a3a' });
    }
    // 爆破协议
    if (p.hasSp('explodeOnKill')) {
      G.explode(e.x, e.y, 82, 12 + p.st.elementalDamage, { col: '#ff6b3a' });
    }

    this.dropLoot(e);
  };

  game.dropLoot = function (e) {
    var p = this.player;
    // 经济校准（方向二）：普通怪每杀的「期望材料」= e.mat * MAT_MUL * (1+dropRate%)，
    // 用「整数部分必掉 + 小数部分按概率补一个 1 材料包」实现，使每波总材料≈旧配置；
    // 精英/BOSS 为里程碑奖励，保持原设计不缩放。
    var mul = (e.def.elite || e.def.boss) ? 1 : (G.MAT_MUL || 1);
    var expect = e.mat * mul * (1 + p.st.dropRate / 100);
    if (expect <= 0) return;
    var whole = Math.floor(expect);
    var frac = expect - whole;
    var n = whole + (Math.random() < frac ? 1 : 0);
    if (n <= 0) return;
    var cap = Math.min(n, 10);
    for (var i = 0; i < cap; i++) {
      this.pickups.push(new G.Pickup(e.x + G.rand(-8, 8), e.y + G.rand(-8, 8), 'mat', 1));
    }
    if (n > 10) this.pickups.push(new G.Pickup(e.x, e.y, 'mat', n - 10));
    // 治疗掉落
    var chance = 0.014 + p.st.luck * 0.00035;
    if (e.def.elite) chance = 0.55;
    if (e.def.boss) chance = 1;
    if (Math.random() < chance) {
      var amt = Math.round(p.st.maxHp * (e.def.boss ? 0.35 : e.def.elite ? 0.15 : 0.07));
      this.pickups.push(new G.Pickup(e.x, e.y, 'heal', Math.max(3, amt)));
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

    this.rebuildGrid();
    this.player.update(dt);
    this.updateWave(dt);

    // 敌人
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.dead) e.update(dt);
    }
    this.separate();

    arr = this.enemies; for (i = arr.length - 1; i >= 0; i--) if (arr[i].dead) arr.splice(i, 1);

    // 其他实体
    stepList(this.bullets, dt);
    stepList(this.ebullets, dt);
    stepList(this.pickups, dt);
    stepList(this.turrets, dt);
    stepList(this.particles, dt);
    stepList(this.texts, dt);
    stepList(this.effects, dt);

    // 摄像机
    var tx = this.player.x - this.vw / 2;
    var ty = this.player.y - this.vh / 2;
    if (ARENA < this.vw) tx = (ARENA - this.vw) / 2; else tx = G.clamp(tx, 0, ARENA - this.vw);
    if (ARENA < this.vh) ty = (ARENA - this.vh) / 2; else ty = G.clamp(ty, 0, ARENA - this.vh);
    this.camX = G.lerp(this.camX, tx, G.clamp(dt * 12, 0, 1));
    this.camY = G.lerp(this.camY, ty, G.clamp(dt * 12, 0, 1));

    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeAmt = 0; }
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.6);

    G.UI.updateHud(this);
  };

  function stepList(list, dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      list[i].update(dt);
      if (list[i].dead) list.splice(i, 1);
    }
  }

  /** 敌人之间的相互推挤，避免完全重叠 */
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
    if (!this.player) return;

    var sx = 0, sy = 0;
    if (this.shakeT > 0) {
      var k = this.shakeAmt * (this.shakeT > 0 ? 1 : 0);
      sx = G.rand(-k, k); sy = G.rand(-k, k);
    }
    c.save();
    c.translate(Math.round(-this.camX + sx), Math.round(-this.camY + sy));

    this.drawArena(c);

    for (i = 0; i < this.pickups.length; i++) this.pickups[i].draw(c);
    for (i = 0; i < this.turrets.length; i++) this.turrets[i].draw(c);

    // 敌人按 y 排序，避免穿插错乱
    var es = this.enemies.slice().sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < es.length; i++) es[i].draw(c);

    this.player.draw(c);

    for (i = 0; i < this.bullets.length; i++) this.bullets[i].draw(c);
    for (i = 0; i < this.ebullets.length; i++) this.ebullets[i].draw(c);
    for (i = 0; i < this.particles.length; i++) this.particles[i].draw(c);
    for (i = 0; i < this.effects.length; i++) this.effects[i].draw(c);
    for (i = 0; i < this.texts.length; i++) this.texts[i].draw(c);

    c.restore();

    this.drawOffscreenMarks(c);

    // 受伤红闪
    if (this.hurtFlash > 0) {
      c.fillStyle = 'rgba(200,30,40,' + (this.hurtFlash * 0.28) + ')';
      c.fillRect(0, 0, this.vw, this.vh);
    }
    // 低血预警
    var hr = this.player.hp / this.player.st.maxHp;
    if (hr < 0.3 && !this.player.dead) {
      var pulse = (Math.sin(performance.now() / 220) + 1) / 2;
      c.fillStyle = 'rgba(180,20,30,' + (0.05 + (0.3 - hr) * 0.5 * pulse) + ')';
      c.fillRect(0, 0, this.vw, this.vh);
    }
    // 暗角
    var grd = c.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.35,
      this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = grd;
    c.fillRect(0, 0, this.vw, this.vh);
  };

  game.drawArena = function (c) {
    // 地板
    c.fillStyle = '#12141d';
    c.fillRect(0, 0, ARENA, ARENA);

    // 棋盘格
    var tile = 64;
    c.fillStyle = '#151824';
    for (var i = 0; i * tile < ARENA; i++) {
      for (var j = 0; j * tile < ARENA; j++) {
        if ((i + j) % 2) c.fillRect(i * tile, j * tile, tile, tile);
      }
    }
    // 网格线
    c.strokeStyle = 'rgba(90,110,160,.07)';
    c.lineWidth = 1;
    c.beginPath();
    for (var k = 0; k <= ARENA; k += tile) {
      c.moveTo(k, 0); c.lineTo(k, ARENA);
      c.moveTo(0, k); c.lineTo(ARENA, k);
    }
    c.stroke();

    // 中心标记
    c.strokeStyle = 'rgba(90,120,200,.10)';
    c.lineWidth = 3;
    c.beginPath(); c.arc(ARENA / 2, ARENA / 2, 130, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(ARENA / 2, ARENA / 2, 58, 0, Math.PI * 2); c.stroke();

    // 边框
    c.strokeStyle = '#3a4766';
    c.lineWidth = 6;
    c.strokeRect(3, 3, ARENA - 6, ARENA - 6);
    c.strokeStyle = 'rgba(120,150,230,.25)';
    c.lineWidth = 2;
    c.strokeRect(8, 8, ARENA - 16, ARENA - 16);
  };

  /** 屏幕外敌人指示箭头 */
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
      var rx = Math.min(cx - margin, cy - margin);
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
