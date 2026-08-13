/* ============================================================
   21_explore.js —— 探索扩展：上锁房门 + 深渊钥匙
   精英/BOSS/金箱可掉钥匙；靠近锁门按 E 消耗钥匙开启。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  function keyInst() {
    return {
      uid: 'key_' + Date.now().toString(36),
      defId: 'abyss_key',
      def: { name: '深渊钥匙', icon: 'ic_gem', col: '#ffd24a', r: 2, desc: '打开一扇上锁的深渊之门' },
      tier: 2, type: 'trinket'
    };
  }

  /* 门洞线段 */
  function doorRect(map, ld) {
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

  /* 选门上锁：优先通往 宝库/精英/BOSS 房 */
  function lockDoors(map) {
    var cands = [];
    var i, c, r;
    function roomType(c2, r2) {
      if (c2 < 0 || r2 < 0 || c2 >= map.cols || r2 >= map.rows) return null;
      return map.rooms[c2 + r2 * map.cols].type;
    }
    for (c = 0; c < map.cols - 1; c++) {
      for (r = 0; r < map.rows; r++) {
        if (!map.doorsH[c][r]) continue;
        var t1 = roomType(c, r), t2 = roomType(c + 1, r);
        var w = (t1 === 'treasure' || t2 === 'treasure') ? 3 :
                (t1 === 'elite' || t2 === 'elite' || t1 === 'boss' || t2 === 'boss') ? 2 : 1;
        cands.push({ c: c, r: r, dir: 'H', w: w });
      }
    }
    for (c = 0; c < map.cols; c++) {
      for (r = 0; r < map.rows - 1; r++) {
        if (!map.doorsV[c][r]) continue;
        var t3 = roomType(c, r), t4 = roomType(c, r + 1);
        var w2 = (t3 === 'treasure' || t4 === 'treasure') ? 3 :
                 (t3 === 'elite' || t4 === 'elite' || t3 === 'boss' || t4 === 'boss') ? 2 : 1;
        cands.push({ c: c, r: r, dir: 'V', w: w2 });
      }
    }
    /* 不要锁出生房/撤离房的门 */
    cands = cands.filter(function (ld) {
      var tA = roomType(ld.c, ld.r), tB = roomType(ld.dir === 'H' ? ld.c + 1 : ld.c, ld.dir === 'H' ? ld.r : ld.r + 1);
      return tA !== 'spawn' && tB !== 'spawn' && tA !== 'extract' && tB !== 'extract';
    });
    var want = map.tierId === 1 ? 1 : 2;
    var locked = [];
    var guard2 = 0;
    while (locked.length < want && cands.length && guard2++ < 40) {
      var total = cands.reduce(function (a, b) { return a + b.w; }, 0);
      var roll = Math.random() * total, idx = 0;
      for (i = 0; i < cands.length; i++) { roll -= cands[i].w; if (roll <= 0) { idx = i; break; } }
      var pick = cands.splice(idx, 1)[0];
      pick.key = (pick.dir === 'H' ? 'H:' : 'V:') + pick.c + ':' + pick.r;
      locked.push(pick);
    }
    map.lockedDoors = locked;
    return locked;
  }

  /* 锁门参与墙体判定 */
  var _solid = G.Map.solid;
  G.Map.solid = function (map, x, y) {
    if (_solid(map, x, y)) return true;
    if (!map || !map.lockedDoors || !map.lockedDoors.length) return false;
    var game = G.game;
    var unlocked = game && game.unlockedDoors;
    for (var i = 0; i < map.lockedDoors.length; i++) {
      var ld = map.lockedDoors[i];
      if (unlocked && unlocked[ld.key]) continue;
      var rc = doorRect(map, ld);
      if (x >= rc.x0 && x <= rc.x1 && y >= rc.y0 && y <= rc.y1) return true;
    }
    return false;
  };

  /* 开局/读档时给门上锁 */
  var _nr = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    this.unlockedDoors = {};
    this.depthKeys = 0;
    var r = _nr.call(this, charDef, tierId);
    if (this.map) this.map.lockedDoors = lockDoors(this.map);
    return r;
  };
  var _rr = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    this.unlockedDoors = {};
    this.depthKeys = (data && data.depthKeys) || 0;
    var r = _rr.call(this, data);
    if (this.map) this.map.lockedDoors = lockDoors(this.map);
    if (data && data.unlockedDoors) {
      for (var k in data.unlockedDoors) this.unlockedDoors[k] = true;
    }
    return r;
  };

  /* 存档补全钥匙状态 */
  var _sr = G.game.saveRun;
  G.game.saveRun = function () {
    _sr.call(this);
    var d = G.Save.getRun();
    if (d) {
      d.depthKeys = this.depthKeys || 0;
      d.unlockedDoors = this.unlockedDoors || {};
      G.Save.saveRun(d);
    }
  };

  /* 互动：开锁 */
  var _try = G.game.tryInteract;
  G.game.tryInteract = function () {
    var p = this.player;
    if (this.map && this.map.lockedDoors) {
      for (var i = 0; i < this.map.lockedDoors.length; i++) {
        var ld = this.map.lockedDoors[i];
        if (this.unlockedDoors[ld.key]) continue;
        var rc = doorRect(this.map, ld);
        var cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
        if (G.dist(p.x, p.y, cx, cy) < 92) {
          if ((this.depthKeys || 0) > 0) {
            this.depthKeys--;
            this.unlockedDoors[ld.key] = true;
            G.Audio.sfx('item_get');
            G.fx('ring', { x: cx, y: cy, r0: 8, r1: 130, col: '#ffd24a', w: 5, life: 0.55 });
            G.burst(cx, cy, 18, '#ffd24a', 200, { size: 3 });
            G.UI.banner('深渊之门已开启', '#ffd24a');
            this.saveRun();
          } else {
            G.UI.flashText(null, '需要深渊钥匙（精英 / 宝箱掉落）');
            G.Audio.sfx('back');
          }
          return;
        }
      }
    }
    return _try.call(this);
  };

  /* 钥匙掉落：精英 55% / BOSS 100% / 金箱、深渊箱 35%（上限 3） */
  var _drop = G.game.dropLoot;
  G.game.dropLoot = function (e) {
    _drop.call(this, e);
    if (!this.map || (this.depthKeys || 0) >= 3) return;
    var ch = e.def.boss ? 1 : (e.def.elite ? 0.55 : 0);
    if (ch > 0 && Math.random() < ch) {
      this.depthKeys++;
      G.UI.showLootCard(keyInst());
    }
  };
  var _acr = G.game.applyContainerReward;
  G.game.applyContainerReward = function (c, out) {
    _acr.call(this, c, out);
    if (!this.map || (this.depthKeys || 0) >= 3) return;
    if ((c.type === 'chest_gold' || c.type === 'chest_abyss') && Math.random() < 0.35) {
      this.depthKeys++;
      G.UI.showLootCard(keyInst());
    }
  };

  /* 门体渲染（世界坐标，覆盖在实体之上） */
  var _render = G.game.render;
  G.game.render = function () {
    _render.call(this);
    if (this.map && this.map.lockedDoors && this.map.lockedDoors.length) this.drawGates();
  };
  G.game.drawGates = function () {
    var c = this.ctx, m = this.map;
    c.save();
    c.translate(Math.round(-this.camX), Math.round(-this.camY));
    for (var i = 0; i < m.lockedDoors.length; i++) {
      var ld = m.lockedDoors[i];
      if (this.unlockedDoors[ld.key]) continue;
      var rc = doorRect(m, ld);
      var w = rc.x1 - rc.x0, h = rc.y1 - rc.y0;
      var cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
      c.fillStyle = '#151827';
      c.fillRect(rc.x0, rc.y0, w, h);
      c.strokeStyle = '#3a4258'; c.lineWidth = 2;
      c.strokeRect(rc.x0 + 2, rc.y0 + 2, w - 4, h - 4);
      /* 铁栅 */
      c.strokeStyle = '#8a93b5'; c.lineWidth = 3;
      var bars = ld.dir === 'H' ? 3 : 4;
      for (var b = 1; b < bars; b++) {
        var t = b / bars;
        if (ld.dir === 'H') {
          c.beginPath(); c.moveTo(rc.x0 + w * t, rc.y0); c.lineTo(rc.x0 + w * t, rc.y1); c.stroke();
        } else {
          c.beginPath(); c.moveTo(rc.x0, rc.y0 + h * t); c.lineTo(rc.x1, rc.y0 + h * t); c.stroke();
        }
      }
      /* 锁 */
      var pulse = (Math.sin(G.game.runTime * 3) + 1) / 2;
      c.fillStyle = '#ffd24a';
      c.globalAlpha = 0.75 + 0.25 * pulse;
      c.fillRect(cx - 7, cy - 4, 14, 10);
      c.strokeStyle = '#8a6a1a'; c.lineWidth = 3;
      c.beginPath(); c.arc(cx, cy - 4, 6, Math.PI, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
    }
    c.restore();
  };

  /* HUD 钥匙计数 + 小地图锁标记 */
  function keyEl() {
    var e = $('keyHud');
    if (e) return e;
    var hud = $('hud');
    if (!hud) return null;
    e = document.createElement('div');
    e.id = 'keyHud';
    e.style.cssText = 'position:absolute;left:50%;bottom:48px;transform:translateX(-50%);font-size:12px;font-weight:800;color:#ffd24a;letter-spacing:2px;text-shadow:0 0 8px #ffd24a66;z-index:30;';
    hud.appendChild(e);
    return e;
  }
  var _uh = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh.call(this, g);
    var e = keyEl();
    if (e) e.textContent = '深渊钥匙 × ' + (g.depthKeys || 0);
    var cv = $('minimap');
    if (cv && g.map && g.map.lockedDoors) {
      var c = cv.getContext('2d');
      var m = g.map;
      var scale = Math.min(cv.width / m.worldW, cv.height / m.worldH);
      var ox = (cv.width - m.worldW * scale) / 2, oy = (cv.height - m.worldH * scale) / 2;
      c.fillStyle = '#ffd24a';
      for (var i = 0; i < m.lockedDoors.length; i++) {
        var ld = m.lockedDoors[i];
        if (g.unlockedDoors && g.unlockedDoors[ld.key]) continue;
        var rc = doorRect(m, ld);
        var cx = (rc.x0 + rc.x1) / 2 * scale + ox;
        var cy = (rc.y0 + rc.y1) / 2 * scale + oy;
        c.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      }
    }
  };

})();
