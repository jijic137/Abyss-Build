/* ============================================================
   55_campaign.js —— 16 小关战役系统
   五大层（区域）每层 3 小关，第 5 层 4 小关，最后一关 BOSS 战。
   局外选图 = 区域入口（进入该层第 1 小关），向下深入贯穿 16 关。
   每小关独立目标/难度/掉落；区域 BOSS 关：幽暗回廊·三（幽影霸主）、
   深部矿坑·终、终焉之门·终。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* ---------------- 16 小关配置 ---------------- */
  G.ZONE_START = [1, 4, 7, 10, 13];           // 各区域起始小关
  G.ZONE_FINAL = { 1: 3, 2: 6, 3: 9, 4: 12, 5: 16 };
  G.SUBLEVELS = [
    { name: '裂隙边缘 · 一', zone: 1, waveBand: [1, 2], objType: 'survive', survive: 45, danger: 1.0, loot: 1.0 },
    { name: '裂隙边缘 · 二', zone: 1, waveBand: [2, 3], objType: 'survive', survive: 55, danger: 1.15, loot: 1.15 },
    { name: '裂隙边缘 · 三', zone: 1, waveBand: [3, 4], objType: 'survive', survive: 65, danger: 1.3, loot: 1.3 },
    { name: '幽暗回廊 · 一', zone: 2, waveBand: [5, 6], objType: 'elite', objNeed: 1, danger: 1.9, loot: 1.7 },
    { name: '幽暗回廊 · 二', zone: 2, waveBand: [6, 8], objType: 'elite', objNeed: 1, danger: 2.2, loot: 1.9 },
    { name: '幽暗回廊 · 三', zone: 2, waveBand: [8, 9], objType: 'boss', boss: 'boss_wraith', danger: 2.6, loot: 2.3 },
    { name: '深部矿坑 · 一', zone: 3, waveBand: [10, 11], objType: 'elite', objNeed: 1, danger: 3.3, loot: 2.8 },
    { name: '深部矿坑 · 二', zone: 3, waveBand: [11, 13], objType: 'elite', objNeed: 2, danger: 3.7, loot: 3.1 },
    { name: '深部矿坑 · 终', zone: 3, waveBand: [13, 14], objType: 'boss', boss: 'boss_behemoth', danger: 4.2, loot: 3.4 },
    { name: '深渊腹地 · 一', zone: 4, waveBand: [15, 16], objType: 'elite', objNeed: 2, danger: 5.2, loot: 4.4 },
    { name: '深渊腹地 · 二', zone: 4, waveBand: [16, 18], objType: 'elite', objNeed: 2, danger: 5.7, loot: 4.8 },
    { name: '深渊腹地 · 三', zone: 4, waveBand: [18, 19], objType: 'elite', objNeed: 3, danger: 6.3, loot: 5.2 },
    { name: '终焉之门 · 一', zone: 5, waveBand: [20, 20], objType: 'elite', objNeed: 2, danger: 7.8, loot: 7.0 },
    { name: '终焉之门 · 二', zone: 5, waveBand: [20, 20], objType: 'elite', objNeed: 3, danger: 8.4, loot: 7.6 },
    { name: '终焉之门 · 三', zone: 5, waveBand: [20, 20], objType: 'elite', objNeed: 2, danger: 9.0, loot: 8.2 },
    { name: '终焉之门 · 终', zone: 5, waveBand: [20, 20], objType: 'boss', boss: 'boss_abyss', danger: 10.0, loot: 9.0 }
  ];

  /* ---------------- 小关应用（地图后处理） ---------------- */
  G.applySublevel = function (g, sub) {
    var S = G.SUBLEVELS[sub - 1];
    var m = g.map;
    if (!S || !m) return;
    g.sublevel = sub;
    var zone = S.zone;
    m.sublevel = sub;
    m.zoneId = zone;
    m.waveBand = S.waveBand;
    m.wave = S.waveBand[1];
    m.tier = Object.assign({}, G.TIER_MAP[zone], { danger: S.danger, loot: S.loot, waveBand: S.waveBand });
    m.danger = S.danger;
    m.loot = S.loot;
    m.obj = { type: S.objType, need: S.objNeed || 0, survive: S.survive || 0, boss: S.boss || null };
    m.tierId = zone;

    /* 1) BOSS 房：仅 BOSS 小关保留 */
    var bossRoom = null;
    m.rooms.forEach(function (rm) {
      if (rm.bossId) {
        if (S.boss) bossRoom = rm;
        else { rm.type = 'combat'; rm.bossId = null; }
      }
    });
    if (S.boss && !bossRoom) {
      var bc = m.rooms.filter(function (rm) {
        return rm.type === 'combat' && rm.idx !== m.startRoom && rm.idx !== m.extractRoom;
      });
      if (bc.length) {
        var br = G.pick(bc);
        br.type = 'boss';
        br.bossId = S.boss;
      }
    }

    /* 2) 精英房数量满足目标 */
    if (S.objType === 'elite') {
      var have = m.rooms.filter(function (rm) { return rm.type === 'elite'; }).length;
      var need = S.objNeed || 0;
      var pool = [];
      for (var w = S.waveBand[0]; w <= S.waveBand[1]; w++) {
        var cfg = G.WAVES[w - 1];
        if (cfg && cfg.elites) cfg.elites.forEach(function (e) { pool.push(e[0]); });
      }
      if (!pool.length) pool = ['el_butcher', 'el_warden', 'el_hexer'];
      var combats = m.rooms.filter(function (rm) {
        return rm.type === 'combat' && rm.idx !== m.startRoom && rm.idx !== m.extractRoom;
      });
      while (have < need && combats.length) {
        var er = combats.shift();
        /* 合并房整组转精英，避免拆散大房间 */
        var gset = (er.group != null)
          ? m.rooms.filter(function (x) { return x.group === er.group; })
          : [er];
        gset.forEach(function (x) { x.type = 'elite'; x.eliteIds = [G.pick(pool)]; });
        have++;
      }
    }

    /* 3) 深度附加：宝箱/陷阱随小关递增 */
    var extra = Math.floor((sub - 1) / 3) + (sub % 3 === 0 ? 1 : 0);
    var depthT = Math.min(4, Math.floor((sub - 1) / 3));
    var chestTypes = ['chest_wood', 'chest_iron', 'chest_gold', 'chest_abyss'];
    var combats2 = m.rooms.filter(function (rm) { return rm.type === 'combat'; });
    var i;
    for (i = 0; i < extra && combats2.length; i++) {
      var cr = combats2.splice(G.randInt(0, combats2.length - 1), 1)[0];
      var rc = G.Map.roomRect(cr.c, cr.r);
      var type = chestTypes[Math.min(3, depthT + (i % 2))] || 'chest_wood';
      var n = {
        cid: 'c' + cr.idx + '_' + (200 + i),
        x: rc.x0 + G.Map.ROOM / 2 - 130 + G.rand(0, 260),
        y: rc.y0 + G.Map.ROOM / 2 - 130 + G.rand(0, 260),
        room: cr.idx, type: type,
        opened: false, used: false, ch: 0, started: false, pulse: G.rand(0, 6)
      };
      g.containers.push(new G.Container(n));
      m.containers.push({ cid: n.cid, x: n.x, y: n.y, room: n.room, type: n.type, opened: false, used: false, ch: 0, started: false, pulse: n.pulse });
      g.traps.push(new G.Trap(rc.x0 + G.Map.ROOM / 2 - 120 + G.rand(0, 240), rc.y0 + G.Map.ROOM / 2 - 120 + G.rand(0, 240), cr.idx));
      g.barrels.push(new G.Barrel(rc.x0 + G.Map.ROOM / 2 - 130 + G.rand(0, 260), rc.y0 + G.Map.ROOM / 2 - 130 + G.rand(0, 260), cr.idx));
    }
    /* 统一安全锁门：基于最终房型，保证撤离房无需钥匙可达、出生侧保留钥匙来源 */
    if (G.secureLockDoors) m.lockedDoors = G.secureLockDoors(m);
    else m.lockedDoors = [];
  };

  /* ---------------- 目标（统一） ---------------- */
  var _co = G.game.checkObjective;
  G.game.checkObjective = function () {
    var m = this.map;
    if (!m || m.objDone) return;
    var o = m.obj, done = false;
    if (!o) return;
    if (o.type === 'survive') done = m.time >= o.survive;
    else if (o.type === 'elite') done = m.eliteKills >= o.need;
    else if (o.type === 'boss') done = m.bossKills >= 1;
    if (done) {
      m.objDone = true;
      m.extract.active = true;
      G.UI.banner('撤离点已开放', '#6ee787');
      G.Audio.sfx('extract_ready');
      G.UI.updateObjective(m);
      this.saveRun();
    }
  };

  var _uo = G.UI.updateObjective;
  G.UI.updateObjective = function (m) {
    if (!m) return;
    var o = m.obj, txt;
    if (!o) return;
    if (m.objDone || m.extract.active) txt = '撤离点已开放 —— 前往标记处撤离';
    else if (o.type === 'survive') txt = '目标：存活 ' + Math.max(0, Math.ceil(o.survive - m.time)) + ' 秒';
    else if (o.type === 'elite') txt = '目标：击杀精英 ' + m.eliteKills + ' / ' + o.need;
    else if (o.type === 'boss') txt = '目标：击败 ' + (G.ENEMY_MAP[o.boss] ? G.ENEMY_MAP[o.boss].name : 'BOSS');
    G.UI._objText = txt;
    var n = $('objLine');
    if (n) n.textContent = txt;
  };

  /* HUD 目标进度 */
  var _uh10 = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh10.call(this, g);
    var m = g.map, timer = $('waveTimer');
    var lbl = $('waveLabel');
    var sub = g.sublevel || 1;
    if (lbl) lbl.textContent = '第 ' + sub + ' / 16 · ' + (G.SUBLEVELS[sub - 1] ? G.SUBLEVELS[sub - 1].name : '');
    if (!m || !timer || m.extract.active) return;
    var o = m.obj;
    if (!o) return;
    var prog = 0;
    if (o.type === 'survive') {
      timer.textContent = Math.max(0, Math.ceil(o.survive - m.time)) + 's'; timer.style.color = '';
      prog = G.clamp(m.time / o.survive, 0, 1);
    } else if (o.type === 'elite') {
      timer.textContent = '精英 ' + m.eliteKills + ' / ' + o.need; timer.style.color = '';
      prog = G.clamp(m.eliteKills / o.need, 0, 1);
    } else if (o.type === 'boss') {
      timer.textContent = 'BOSS'; timer.style.color = '#ff6b6b';
      prog = m.bossKills >= 1 ? 1 : 0.35;
    }
    var progEl = $('waveProg');
    if (progEl) progEl.style.width = (prog * 100) + '%';
  };

  /* ---------------- 生命周期 ---------------- */
  var _nrA = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    var r = _nrA.call(this, charDef, tierId);
    if (this.map) {
      var zone = this.map.tierId || 1;
      G.applySublevel(this, G.ZONE_START[zone - 1]);
    }
    return r;
  };
  var _rrA = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    var r = _rrA.call(this, data);
    if (this.map) {
      var sub = (data && data.sublevel) || G.ZONE_START[(this.map.tierId || 1) - 1];
      G.applySublevel(this, sub);
    }
    return r;
  };
  var _srA = G.game.saveRun;
  G.game.saveRun = function () {
    _srA.call(this);
    var d = G.Save.getRun();
    if (d) {
      d.sublevel = this.sublevel || 1;
      G.Save.saveRun(d);
    }
  };

  /* 深入下一层（小关 +1，跨区域自动换主题） */
  G.game.descend = function () {
    var g = this, p = g.player;
    var next = (g.sublevel || 1) + 1;
    if (next > 16) return;
    var S = G.SUBLEVELS[next - 1];
    var zone = S.zone;

    g.depth = (g.depth || 0) + 1;
    p.char.mods.damage = (p.char.mods.damage || 0) + 8;
    p.heal(Math.round(p.st.maxHp * 0.30));
    p.recalc();

    G.burst(p.x, p.y, 36, '#c07fff', 300, { size: 4 });
    G.fx('ring', { x: p.x, y: p.y, r0: 8, r1: 220, col: '#c07fff', w: 7, life: 0.6 });
    G.Audio.sfx('extract_ready');

    g.map = G.Map.generate(zone);
    g.arena = g.map.worldW;
    g.buildWallRects();
    g.unlockedDoors = {};
    g.lastRoom = -1;
    g.levelCd = 0;
    g.portals = [];
    g.events = [];
    g.enemies = []; g.bullets = []; g.ebullets = [];
    g.pickups = []; g.particles = []; g.texts = [];
    g.effects = []; g.turrets = []; g.drones = []; g.mines = [];
    g.containers = g.map.containers.map(function (c) { return new G.Container(c); });
    g.traps = [];
    g.barrels = [];
    if (G.setupContent) G.setupContent(g);
    if (G.rebuildExtras) G.rebuildExtras(g);
    if (G.placeChests) G.placeChests(g, false);
    G.applySublevel(g, next);

    if (g._extractTimer) { clearInterval(g._extractTimer); g._extractTimer = null; }
    g._pendingDescend = { sublevel: next, name: S.name, col: G.TIER_MAP[zone].col };
    g._prepOpen = true;
    g.state = 'pause';
    g._bagPrev = null;
    G.UI.openPrep();
  };

  /* 结算：记录最佳小关 + 区域解锁按「通关该层最后一小关」 */
  var _oes5 = G.game.onExtractSuccess;
  G.game.onExtractSuccess = function () {
    var g = this, sub = g.sublevel || 1;
    var r = _oes5.call(this);
    var d = G.Meta.get();
    d.stats.bestSublevel = Math.max(d.stats.bestSublevel || 0, sub);
    d.tiers = d.tiers || {};
    d.tiers[1] = true;
    for (var z = 2; z <= 5; z++) {
      if ((d.stats.bestSublevel || 0) >= G.ZONE_FINAL[z - 1]) d.tiers[z] = true;
      else d.tiers[z] = false;
    }
    G.Meta.flush();
    return r;
  };

  /* ---------------- 撤离抉择面板（小关版） ---------------- */
  function makeLine(txt, col, size) {
    var d = document.createElement('div');
    d.style.cssText = 'margin:6px 0;font-size:' + size + 'px;color:' + col + ';font-weight:700;';
    d.textContent = txt;
    return d;
  }
  function flowPanel() {
    var e = $('flowPanel');
    if (e) return e;
    e = document.createElement('div');
    e.id = 'flowPanel';
    e.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(4,6,12,.78);z-index:82;';
    var box = document.createElement('div');
    box.id = 'flowBox';
    box.style.cssText = 'background:linear-gradient(180deg,#181c2c,#101320);border:2px solid #6ee787;border-radius:14px;padding:26px 34px;max-width:720px;width:94%;box-shadow:0 0 70px #6ee78733;text-align:center;background-size:cover;background-position:center;';
    e.appendChild(box);
    document.body.appendChild(e);
    return e;
  }
  G.UI.openFlow = function (g) {
    var e = flowPanel();
    var box = $('flowBox');
    box.innerHTML = '';
    box.style.backgroundImage = "linear-gradient(rgba(10,12,20,.84), rgba(10,12,20,.9)), url('assets/art/ai/events/portal_rift.png')";
    var title = document.createElement('div');
    title.style.cssText = 'font-size:24px;font-weight:900;letter-spacing:6px;color:#bfffd8;margin-bottom:4px;';
    title.textContent = '抉择时刻';
    box.appendChild(title);
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:12px;color:#8a90a8;margin-bottom:18px;';
    sub.textContent = '第 ' + (g.sublevel || 1) + ' / 16 小关 · 活着回去，还是继续向下？';
    box.appendChild(sub);
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:14px;justify-content:center;flex-wrap:wrap;';

    var card = document.createElement('div');
    card.style.cssText = 'flex:1;min-width:230px;border:1px solid #6ee78788;border-radius:12px;padding:18px 14px;cursor:pointer;background:rgba(16,24,20,.65);transition:transform .12s,border-color .12s;';
    card.appendChild(makeLine('✚ 撤离', '#6ee787', 20));
    card.appendChild(makeLine('结算本层：装备/背包/材料全部带出', '#aab', 12));
    card.appendChild(makeLine('材料 1:1 折现 · 记录深渊进度', '#8a90a8', 11));
    card.addEventListener('click', function () { G.UI.closeFlow(); g.extractNow(); });
    row.appendChild(card);

    var next = (g.sublevel || 1) + 1;
    var NS = G.SUBLEVELS[next - 1];
    var card2 = document.createElement('div');
    card2.style.cssText = 'flex:1;min-width:230px;border:1px solid #c07fff88;border-radius:12px;padding:18px 14px;cursor:pointer;background:rgba(24,16,32,.65);transition:transform .12s,border-color .12s;';
    card2.appendChild(makeLine('▼ 继续深入', '#c07fff', 20));
    card2.appendChild(makeLine(NS ? ('进入 ' + NS.name + '（第 ' + next + ' / 16 小关）') : '已至深渊尽头', '#aab', 12));
    card2.appendChild(makeLine('保留装备/战利品/材料/钥匙 · 伤害 +8 · 回血 30%', '#8a90a8', 11));
    if (!NS) card2.style.opacity = '.45';
    else card2.addEventListener('click', function () { G.UI.closeFlow(); g.descend(); });
    row.appendChild(card2);
    box.appendChild(row);
    var close = document.createElement('div');
    close.style.cssText = 'margin-top:16px;font-size:11px;color:#6a7088;cursor:pointer;';
    close.textContent = '按 ESC 离开（继续探索本层）';
    close.addEventListener('click', function () { G.UI.closeFlow(); });
    box.appendChild(close);
    e.style.display = 'flex';
    G.UI._flowOpen = true;
    G.Audio.sfx('extract_ready');
  };

  /* ---------------- 局外选图：深渊进度 + 区域小关范围 ---------------- */
  function objText(S) {
    if (!S) return '';
    if (S.objType === 'survive') return '存活 ' + S.survive + ' 秒';
    if (S.objType === 'elite') return '击杀精英 ' + (S.objNeed || 1);
    if (S.objType === 'boss') return '击败 ' + (G.ENEMY_MAP[S.boss] ? G.ENEMY_MAP[S.boss].name : 'BOSS');
    return '';
  }
  var _rmsA = G.UI.renderMapSelect;
  G.UI.renderMapSelect = function () {
    var r = _rmsA.call(this);
    var box = $('mapCards');
    if (!box) return r;
    var line = $('campaignLine');
    if (!line) {
      line = document.createElement('div');
      line.id = 'campaignLine';
      line.className = 'campaign-line';
      box.parentNode.insertBefore(line, box);
    }
    var best = G.Meta.stats().bestSublevel || 0;
    line.textContent = '深渊战役 · 已通过 ' + best + ' / 16 小关 · 下一站第 ' + Math.min(16, best + 1) + ' 小关';
    /* 区域卡片补注小关范围 */
    var cards = box.children;
    var nextZone = 1;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var a = G.ZONE_START[i];
      var b = G.ZONE_FINAL[i + 1];
      if (a == null) continue;
      var S0 = G.SUBLEVELS[a - 1];
      /* 目标文案换成小关战役口径 */
      var objEl = card.querySelector ? card.querySelector('.map-obj') : null;
      if (objEl) objEl.textContent = '目标：' + objText(S0) + (b > a ? ' · 本区 ' + a + '~' + b + ' 小关' : '');
      var lockEl = card.querySelector ? card.querySelector('.map-lock') : null;
      if (lockEl) lockEl.textContent = '未解锁 · 通关第 ' + G.ZONE_FINAL[i] + ' 小关解锁';
      var tag = card.querySelector ? card.querySelector('.map-zone-range') : null;
      if (!tag) {
        tag = document.createElement('div');
        tag.className = 'map-zone-range';
        card.appendChild(tag);
      }
      tag.textContent = '第 ' + a + '~' + b + ' 小关 · 起点「' + S0.name + '」' + (S0.objType === 'boss' ? ' · BOSS 战' : '');
      if (best < b && a <= best + 1) {
        tag.className = 'map-zone-range hot';
        nextZone = i + 1;
      }
    }
    if (nextZone > 1) line.textContent += ' · 推荐区域：' + (G.TIER_MAP[nextZone] ? G.TIER_MAP[nextZone].name : '');
    return r;
  };

})();
