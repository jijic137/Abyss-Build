/* ============================================================
   50_fix.js —— 深入新图重建探索元素（锁门/事件/传送门）
   与开局逻辑保持一致：优先锁宝库/精英/BOSS 门，事件与传送门各一。
   ============================================================ */
'use strict';

(function () {

  G.rebuildExtras = function (g) {
    var m = g.map;
    if (!m) return;

    /* 锁门：统一走安全生成（保证撤离房无需钥匙可达，出生侧保留钥匙来源） */
    if (G.secureLockDoors) m.lockedDoors = G.secureLockDoors(m);
    else m.lockedDoors = [];

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
