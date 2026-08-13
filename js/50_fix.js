/* ============================================================
   50_fix.js —— 深入新图重建探索元素（锁门/事件/传送门）
   与开局逻辑保持一致：优先锁宝库/精英/BOSS 门，事件与传送门各一。
   ============================================================ */
'use strict';

(function () {

  G.rebuildExtras = function (g) {
    var m = g.map;
    if (!m) return;

    /* 锁门（1-2 扇，优先通往宝库/精英/BOSS） */
    var cands = [];
    function roomType(c, r) {
      if (c < 0 || r < 0 || c >= m.cols || r >= m.rows) return null;
      return m.rooms[c + r * m.cols].type;
    }
    for (var c = 0; c < m.cols - 1; c++) {
      for (var r = 0; r < m.rows; r++) {
        if (!m.doorsH[c][r]) continue;
        var t1 = roomType(c, r), t2 = roomType(c + 1, r);
        var w = (t1 === 'treasure' || t2 === 'treasure') ? 3 :
                (t1 === 'elite' || t2 === 'elite' || t1 === 'boss' || t2 === 'boss') ? 2 : 1;
        cands.push({ c: c, r: r, dir: 'H', w: w });
      }
    }
    for (c = 0; c < m.cols; c++) {
      for (r = 0; r < m.rows - 1; r++) {
        if (!m.doorsV[c][r]) continue;
        var t3 = roomType(c, r), t4 = roomType(c, r + 1);
        var w2 = (t3 === 'treasure' || t4 === 'treasure') ? 3 :
                 (t3 === 'elite' || t4 === 'elite' || t3 === 'boss' || t4 === 'boss') ? 2 : 1;
        cands.push({ c: c, r: r, dir: 'V', w: w2 });
      }
    }
    cands = cands.filter(function (ld) {
      var a = roomType(ld.c, ld.r);
      var b = roomType(ld.dir === 'H' ? ld.c + 1 : ld.c, ld.dir === 'H' ? ld.r : ld.r + 1);
      return a !== 'spawn' && b !== 'spawn' && a !== 'extract' && b !== 'extract';
    });
    var locked = [];
    var want = m.tierId === 1 ? 1 : 2;
    var guard = 0;
    while (locked.length < want && cands.length && guard++ < 40) {
      var total = cands.reduce(function (a, b) { return a + b.w; }, 0);
      var roll = Math.random() * total, idx = 0;
      for (var i = 0; i < cands.length; i++) { roll -= cands[i].w; if (roll <= 0) { idx = i; break; } }
      var pick = cands.splice(idx, 1)[0];
      pick.key = (pick.dir === 'H' ? 'H:' : 'V:') + pick.c + ':' + pick.r;
      locked.push(pick);
    }
    m.lockedDoors = locked;

    /* 事件 */
    g.events = [];
    var evCands = m.rooms.filter(function (rm) {
      return rm.type === 'combat' && rm.idx !== m.startRoom && rm.idx !== m.extractRoom &&
             m.dist[rm.idx] >= m.dist[m.extractRoom] * 0.45;
    });
    if (evCands.length) {
      var evRm = G.pick(evCands);
      evRm.type = 'event';
      var erc = G.Map.roomRect(evRm.c, evRm.r);
      g.events = [{
        id: 'evt' + evRm.idx,
        x: (erc.x0 + erc.x1) / 2 + G.rand(-60, 60),
        y: (erc.y0 + erc.y1) / 2 + G.rand(-60, 60),
        room: evRm.idx, used: false
      }];
    }

    /* 传送门 */
    g.portals = [];
    var ptCands = m.rooms.filter(function (rm) {
      return rm.type === 'combat' && rm.idx !== m.startRoom && rm.idx !== m.extractRoom &&
             m.dist[rm.idx] >= m.dist[m.extractRoom] * 0.35;
    });
    if (ptCands.length) {
      var ptRm = G.pick(ptCands);
      ptRm.type = 'portal';
      var prc = G.Map.roomRect(ptRm.c, ptRm.r);
      g.portals = [{
        id: 'pt' + ptRm.idx,
        x: (prc.x0 + prc.x1) / 2 + G.rand(-40, 40),
        y: (prc.y0 + prc.y1) / 2 + G.rand(-40, 40),
        room: ptRm.idx, used: false
      }];
    }
  };

})();
