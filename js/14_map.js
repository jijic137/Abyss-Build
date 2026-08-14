/* ============================================================
   14_map.js —— 地图生成 / 探索（搜打撤核心）
   - 房间网格世界：房间 + 墙壁 + 门洞，连续坐标系，迷雾逐房揭示
   - 房间类型：出生 / 撤离 / 战斗 / 宝库 / 精英 / BOSS / 圣泉 / 祭坛
   - 容器：木桶 / 木箱 / 铁箱 / 金箱 / 深渊箱 / 圣泉 / 祭坛
   - 撤离点：目标达成后激活，站入引导 2.2s 撤离
   ============================================================ */
'use strict';

(function () {

  var ROOM = 700;        // 房间内边长
  var WALL = 36;         // 墙厚
  var DOOR = 104;        // 门洞宽
  var SEG = ROOM + WALL;
  var EXTRACT_CHANNEL = 2.2;

  G.MAP_ROOM = ROOM;
  G.MAP_WALL = WALL;

  /* ---------------- 种子随机（地图确定性，支持读档） ---------------- */
  function Rng(seed) {
    this.s = (seed >>> 0) || 1;
  }
  Rng.prototype.next = function () {
    this.s |= 0; this.s = (this.s + 0x6D2B79F5) | 0;
    var t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  Rng.prototype.int = function (a, b) { return Math.floor(this.range(a, b + 1)); };
  Rng.prototype.pick = function (arr) { return arr[this.int(0, arr.length - 1)]; };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  function seedFromTier(tierId, salt) {
    return ((tierId * 7919 + (salt || 0) * 104729) >>> 0) || 1;
  }

  /* ---------------- 拓扑风格（层 1） ---------------- */
  function styleOf(rng) {
    var r = rng.next();
    if (r < 0.22) return { id: 'maze', backEdge: 0.10, merge: 0.18, interior: 0.70 };
    if (r < 0.72) return { id: 'standard', backEdge: 0.22, merge: 0.30, interior: 0.62 };
    return { id: 'open', backEdge: 0.34, merge: 0.42, interior: 0.55 };
  }

  /* ---------------- 房间数与形状（层 0）：随机生长，非矩形轮廓 ---------------- */
  var ROOM_RANGES = {
    1: [10, 14], 2: [12, 17], 3: [14, 20], 4: [16, 23], 5: [18, 27]
  };

  /**
   * 在 cols×rows 网格内生长一块连通区域：
   * 中心 + 2~4 条随机方向的"臂"（星形/十字骨架）→ blob 填充到目标房间数。
   * 结果：房间数量随机、整体轮廓不规则（多臂/凹陷/斜切），不再是固定长方形。
   */
  function growShape(cols, rows, rng, target) {
    var active = [];
    for (var i = 0; i < cols * rows; i++) active.push(false);
    var sc = Math.floor(cols / 2), sr = Math.floor(rows / 2);
    var start = sc + sr * cols;
    active[start] = true;
    var n = 1;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    /* 1) 臂骨架 */
    var arms = rng.int(2, 4);
    var idxs = [0, 1, 2, 3];
    for (var a = 0; a < arms; a++) {
      var di = idxs.splice(rng.int(0, idxs.length - 1), 1)[0];
      var d = dirs[di];
      var len = rng.int(1, Math.max(1, Math.min(cols, rows) - 1));
      var cx = sc, cy = sr;
      for (var s = 0; s < len && n < target; s++) {
        cx += d[0]; cy += d[1];
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) break;
        var id = cx + cy * cols;
        if (!active[id]) { active[id] = true; n++; }
      }
    }
    /* 2) blob 填充到 target */
    var frontier = [];
    function pushF(c, r) {
      if (c > 0 && !active[(c - 1) + r * cols]) frontier.push((c - 1) + r * cols);
      if (c < cols - 1 && !active[(c + 1) + r * cols]) frontier.push((c + 1) + r * cols);
      if (r > 0 && !active[c + (r - 1) * cols]) frontier.push(c + (r - 1) * cols);
      if (r < rows - 1 && !active[c + (r + 1) * cols]) frontier.push(c + (r + 1) * cols);
    }
    for (i = 0; i < cols * rows; i++) if (active[i]) pushF(i % cols, Math.floor(i / cols));
    while (frontier.length && n < target) {
      var gi = frontier.splice(rng.int(0, frontier.length - 1), 1)[0];
      if (active[gi]) continue;
      active[gi] = true; n++;
      pushF(gi % cols, Math.floor(gi / cols));
    }
    return { active: active, start: start, count: n };
  }

  /* ---------------- 房间合并（层 2）：战斗房组合成 1x2/2x1/2x2/L 大空间 ---------------- */
  function mergeCombatRooms(map, rng, style) {
    var cols = map.cols, rows = map.rows, rooms = map.rooms;
    var internal = map.internalDoors;
    var used = {};
    var merged = 0;
    for (var idx = 0; idx < rooms.length; idx++) {
      if (used[idx]) continue;
      var rm = rooms[idx];
      if (rm.type !== 'combat') continue;
      var cc = rm.c, rr = rm.r;
      var group = [idx];
      var horiz = cc < cols - 1 && !used[idx + 1] && rooms[idx + 1].type === 'combat' &&
                  rng.chance(style.merge);
      var vert = rr < rows - 1 && !used[idx + cols] && rooms[idx + cols].type === 'combat' &&
                 rng.chance(style.merge);
      if (horiz) group.push(idx + 1);
      if (vert) group.push(idx + cols);
      if (horiz && vert && cc < cols - 1 && rr < rows - 1) {
        var br = idx + 1 + cols;
        if (!used[br] && rooms[br].type === 'combat' && rng.chance(0.72)) {
          group.push(br);
          /* L 形：随机挖掉一个角，保留 3 格 */
          if (group.length === 4 && rng.chance(0.35)) {
            group.splice(1 + rng.int(0, 2), 1);
          }
        }
      }
      if (group.length < 2) continue;
      for (var g = 0; g < group.length; g++) {
        var gid = group[g];
        used[gid] = true;
        rooms[gid].group = idx;
        var gc = gid % cols, gr = Math.floor(gid / cols);
        if (gc < cols - 1 && group.indexOf(gid + 1) >= 0) {
          map.doorsH[gc][gr] = true;
          internal['H:' + gc + ':' + gr] = true;
        }
        if (gc > 0 && group.indexOf(gid - 1) >= 0) {
          map.doorsH[gc - 1][gr] = true;
          internal['H:' + (gc - 1) + ':' + gr] = true;
        }
        if (gr < rows - 1 && group.indexOf(gid + cols) >= 0) {
          map.doorsV[gc][gr] = true;
          internal['V:' + gc + ':' + gr] = true;
        }
        if (gr > 0 && group.indexOf(gid - cols) >= 0) {
          map.doorsV[gc][gr - 1] = true;
          internal['V:' + gc + ':' + (gr - 1)] = true;
        }
      }
      rooms[idx].group = idx;
      merged++;
    }
    return merged;
  }

  /* ---------------- 房内结构（层 3）：单格战斗房内部掩体 ---------------- */
  function buildInterior(map, rng, style) {
    var interior = [];
    var byRoom = {};
    map.rooms.forEach(function (rm) {
      if (rm.type !== 'combat') return;
      if (rm.group != null && rm.group !== rm.idx) return;   // 合并房保持开敞
      if (!rng.chance(style.interior)) return;
      var kind = rng.pick(['pillar', 'cross', 'corner', 'alcove', 'ruins']);
      var rects = [];
      var rc = G.Map.roomRect(rm.c, rm.r);
      var cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
      if (kind === 'pillar') {
        /* 四根细石柱：细长立柱，不厚重 */
        rects.push([rc.x0 + 112, rc.y0 + 70, rc.x0 + 138, rc.y0 + 150]);
        rects.push([rc.x1 - 138, rc.y0 + 70, rc.x1 - 112, rc.y0 + 150]);
        rects.push([rc.x0 + 112, rc.y1 - 150, rc.x0 + 138, rc.y1 - 70]);
        rects.push([rc.x1 - 138, rc.y1 - 150, rc.x1 - 112, rc.y1 - 70]);
      } else if (kind === 'cross') {
        /* 十字细墙：中央安全区留空 */
        rects.push([rc.x0 + 70, cy - 10, cx - 150, cy + 10]);
        rects.push([cx + 150, cy - 10, rc.x1 - 70, cy + 10]);
        rects.push([cx - 10, rc.y0 + 70, cx + 10, cy - 150]);
        rects.push([cx - 10, cy + 150, cx + 10, rc.y1 - 70]);
      } else if (kind === 'corner') {
        /* L 形细墙 */
        rects.push([rc.x0 + 40, rc.y0 + 40, rc.x0 + 62, rc.y1 - 40]);
        rects.push([rc.x0 + 40, rc.y0 + 40, rc.x1 - 40, rc.y0 + 62]);
      } else if (kind === 'alcove') {
        /* 上下细隔墙 */
        rects.push([rc.x0 + 40, rc.y0 + 40, rc.x1 - 40, rc.y0 + 62]);
        rects.push([rc.x0 + 40, rc.y1 - 62, rc.x1 - 40, rc.y1 - 40]);
      } else { /* ruins */
        var n = rng.int(3, 5);
        for (var i = 0; i < n; i++) {
          var w = rng.int(30, 56), h = rng.int(24, 48);
          var rx = rc.x0 + 70 + rng.range(0, Math.max(1, ROOM - 140 - w));
          var ry = rc.y0 + 70 + rng.range(0, Math.max(1, ROOM - 140 - h));
          /* 块与中心 300px 安全区相交则跳过 */
          if (rx + w > cx - 150 && rx < cx + 150 && ry + h > cy - 150 && ry < cy + 150) continue;
          rects.push([rx, ry, rx + w, ry + h]);
        }
      }
      if (!rects.length) return;
      interior.push({ room: rm.idx, kind: kind, rects: rects });
      byRoom[rm.idx] = rects;
    });
    return { interior: interior, byRoom: byRoom };
  }

  /* ---------------- 生成 ---------------- */
  function generate(tierId, salt) {
    var tier = G.TIER_MAP[tierId];
    if (!tier) tier = G.TIERS[0];
    var cols = tier.grid[0], rows = tier.grid[1];
    var rng = new Rng(seedFromTier(tierId, salt));
    var style = styleOf(rng);

    var worldW = cols * ROOM + (cols + 1) * WALL;
    var worldH = rows * ROOM + (rows + 1) * WALL;

    /* 房间数随机 + 形状生长（非矩形轮廓，层 0） */
    var RANGE = ROOM_RANGES[tierId] || ROOM_RANGES[1];
    var target = rng.int(RANGE[0], RANGE[1]);
    var shape = growShape(cols, rows, rng, target);
    var active = shape.active;
    var start = shape.start;

    /* 连通图：active 子图上的随机 Prim 生成树 + 按风格回边 */
    var doorsH = [], doorsV = [];
    for (var c = 0; c < cols; c++) { doorsH.push([]); for (var r = 0; r < rows; r++) doorsH[c].push(false); }
    for (c = 0; c < cols; c++) { doorsV.push([]); for (r = 0; r < rows; r++) doorsV[c].push(false); }

    var inTree = [];
    for (var i = 0; i < cols * rows; i++) inTree.push(!active[i]);   // 非活动格视为已入树
    inTree[start] = true;
    var frontier = [];
    function pushFrontier(c, r) {
      function tryAdd(nc, nr) {
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return;
        if (!active[nc + nr * cols]) return;
        if (!inTree[nc + nr * cols]) frontier.push([c, r, nc - c, nr - r]);
      }
      tryAdd(c - 1, r); tryAdd(c + 1, r); tryAdd(c, r - 1); tryAdd(c, r + 1);
    }
    pushFrontier(start % cols, Math.floor(start / cols));
    while (frontier.length) {
      var fi = rng.int(0, frontier.length - 1);
      var f = frontier.splice(fi, 1)[0];
      var nc = f[0] + f[2], nr = f[1] + f[3];
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (inTree[nc + nr * cols]) continue;
      inTree[nc + nr * cols] = true;
      if (f[2] !== 0) doorsH[Math.min(f[0], nc)][f[1]] = true;   // 水平门
      else doorsV[f[0]][Math.min(f[1], nr)] = true;              // 垂直门
      pushFrontier(nc, nr);
    }
    /* 再按风格随机补一些回边 */
    for (c = 0; c < cols - 1; c++) {
      for (r = 0; r < rows; r++) {
        if (!active[c + r * cols] || !active[c + 1 + r * cols]) continue;
        if (!doorsH[c][r] && rng.chance(style.backEdge)) doorsH[c][r] = true;
      }
    }
    for (c = 0; c < cols; c++) {
      for (r = 0; r < rows - 1; r++) {
        if (!active[c + r * cols] || !active[c + (r + 1) * cols]) continue;
        if (!doorsV[c][r] && rng.chance(style.backEdge)) doorsV[c][r] = true;
      }
    }

    /* 门偏移（层 4）：沿墙方向错位，±140px 且门边留足空间 */
    var doorOffs = {};
    for (c = 0; c < cols - 1; c++) {
      for (r = 0; r < rows; r++) {
        if (doorsH[c][r]) doorOffs['H:' + c + ':' + r] = Math.round(rng.range(-140, 140));
      }
    }
    for (c = 0; c < cols; c++) {
      for (r = 0; r < rows - 1; r++) {
        if (doorsV[c][r]) doorOffs['V:' + c + ':' + r] = Math.round(rng.range(-140, 140));
      }
    }

    /* 房间类型分配 */
    var rooms = [];
    var TYPE = { combat: 0, treasure: 1, elite: 2, boss: 3, shrine: 4, altar: 5 };
    for (i = 0; i < cols * rows; i++) {
      rooms.push({ type: active[i] ? 'combat' : 'void', active: !!active[i],
        c: i % cols, r: Math.floor(i / cols), idx: i,
        explored: false, visited: false, spawned: false, eliteIds: [], containers: [] });
    }

    /* 图距离（BFS） */
    var dist = [];
    for (i = 0; i < cols * rows; i++) dist.push(-1);
    var queue = [start]; dist[start] = 0;
    while (queue.length) {
      var cur = queue.shift();
      var cc = cur % cols, cr = Math.floor(cur / cols);
      var nbs = [];
      if (cc > 0 && doorsH[cc - 1][cr]) nbs.push(cur - 1);
      if (cc < cols - 1 && doorsH[cc][cr]) nbs.push(cur + 1);
      if (cr > 0 && doorsV[cc][cr - 1]) nbs.push(cur - cols);
      if (cr < rows - 1 && doorsV[cc][cr]) nbs.push(cur + cols);
      nbs.forEach(function (nb) { if (dist[nb] < 0) { dist[nb] = dist[cur] + 1; queue.push(nb); } });
    }
    var maxDist = 0, extractIdx = start;
    for (i = 0; i < dist.length; i++) {
      if (dist[i] > maxDist) { maxDist = dist[i]; extractIdx = i; }
    }
    rooms[extractIdx].type = 'extract';

    function pickFarRoom(minRatio, avoid) {
      var pool = [];
      for (i = 0; i < rooms.length; i++) {
        if (!rooms[i].active) continue;
        if (i === start || i === extractIdx) continue;
        if (avoid && avoid.indexOf(i) >= 0) continue;
        if (dist[i] >= maxDist * minRatio) pool.push(i);
      }
      if (!pool.length) pool = rooms.map(function (x) { return x.idx; }).filter(function (x) {
        return rooms[x].active && x !== start && x !== extractIdx;
      });
      return rng.pick(pool);
    }

    if (tierId === 3 || tierId === 5) {
      var bi = pickFarRoom(0.55);
      rooms[bi].type = 'boss';
    }
    if (tierId >= 2) {
      var e1 = pickFarRoom(0.3, []);
      rooms[e1].type = 'elite';
      if (tierId >= 4) {
        var e2 = pickFarRoom(0.5, [e1]);
        rooms[e2].type = 'elite';
      }
    }
    /* 宝库 ×2（T1 也给，培养开箱正反馈） */
    var t1 = pickFarRoom(0.15, []);
    rooms[t1].type = 'treasure';
    var t2 = pickFarRoom(0.35, [t1]);
    rooms[t2].type = 'treasure';
    /* 圣泉 / 祭坛 */
    var s1 = pickFarRoom(0.1, []);
    rooms[s1].type = 'shrine';
    var a1 = pickFarRoom(0.25, [s1]);
    rooms[a1].type = 'altar';

    /* 精英房敌人（按档位轮换表） */
    var elitePool = [];
    G.WAVES.forEach(function (w, wi) {
      var waveNo = wi + 1;
      if (waveNo < tier.waveBand[0] || waveNo > tier.waveBand[1]) return;
      (w.elites || []).forEach(function (e) { elitePool.push(e[0]); });
    });
    rooms.forEach(function (rm) {
      if (rm.type === 'elite' && elitePool.length) {
        rm.eliteIds = [rng.pick(elitePool)];
      }
      if (rm.type === 'boss') rm.bossId = tierId === 5 ? 'boss_abyss' : 'boss_behemoth';
    });

    /* 多样性：合并战斗房成 1x2/2x1/2x2/L 大空间 + 单格房内部结构 */
    var internalDoors = {};
    var tmpMap = {
      cols: cols, rows: rows, rooms: rooms,
      doorsH: doorsH, doorsV: doorsV, internalDoors: internalDoors
    };
    mergeCombatRooms(tmpMap, rng, style);
    var interiorRes = buildInterior(tmpMap, rng, style);

    /* 容器 */
    function roomRect(c2, r2) {
      return { x0: c2 * SEG + WALL, y0: r2 * SEG + WALL, x1: c2 * SEG + WALL + ROOM, y1: r2 * SEG + WALL + ROOM };
    }
    function placeInRoom(rm, pad) {
      var rc = roomRect(rm.c, rm.r);
      pad = pad || 90;
      var rects = interiorRes.byRoom[rm.idx];
      for (var t = 0; t < 8; t++) {
        var px = rc.x0 + pad + rng.range(0, ROOM - pad * 2);
        var py = rc.y0 + pad + rng.range(0, ROOM - pad * 2);
        var hit = false;
        if (rects) {
          for (var i = 0; i < rects.length; i++) {
            if (px > rects[i][0] - 34 && px < rects[i][2] + 34 &&
                py > rects[i][1] - 34 && py < rects[i][3] + 34) { hit = true; break; }
          }
        }
        if (!hit) return { x: px, y: py };
      }
      return { x: rc.x0 + ROOM / 2, y: rc.y0 + ROOM / 2 };
    }
    var containers = [];
    rooms.forEach(function (rm) {
      if (!rm.active) return;   // 非活动（形状外）格无内容
      if (rm.type === 'spawn' || rm.type === 'extract') return;
      var n = 0;
      if (rm.type === 'treasure') {
        containers.push(mkContainer(rm, 'chest_gold'));
        containers.push(mkContainer(rm, 'chest_abyss'));
        containers.push(mkContainer(rm, 'crate'));
        containers.push(mkContainer(rm, 'barrel'));
        n = 4;
      } else if (rm.type === 'combat') {
        n = rng.int(1, 2);
        for (var k = 0; k < n; k++) {
          containers.push(mkContainer(rm, rng.chance(0.45) ? 'crate' : 'barrel'));
        }
        if (rng.chance(0.35)) containers.push(mkContainer(rm, 'chest_wood'));
        if (rng.chance(0.18)) containers.push(mkContainer(rm, 'chest_iron'));
      } else if (rm.type === 'elite') {
        containers.push(mkContainer(rm, 'chest_iron'));
      } else if (rm.type === 'boss') {
        containers.push(mkContainer(rm, 'chest_gold'));
      } else if (rm.type === 'shrine') {
        containers.push(mkContainer(rm, 'shrine'));
      } else if (rm.type === 'altar') {
        containers.push(mkContainer(rm, 'altar'));
      }
    });

    function mkContainer(rm, type) {
      var p = placeInRoom(rm, 100);
      return {
        cid: 'c' + rm.idx + '_' + (containers.length),
        x: p.x, y: p.y, room: rm.idx, type: type,
        opened: false, used: false, ch: 0, started: false, pulse: rng.range(0, 6)
      };
    }

    var spawn = { room: start, x: rooms[start].c * SEG + WALL + ROOM / 2, y: rooms[start].r * SEG + WALL + ROOM / 2 };
    var ex = roomRect(rooms[extractIdx].c, rooms[extractIdx].r);
    var extract = { room: extractIdx, x: ex.x0 + ROOM / 2, y: ex.y0 + ROOM / 2, active: false, channel: 0, chOn: false };

    var map = {
      seed: seedFromTier(tierId, salt),
      salt: salt || 0,
      tierId: tierId, tier: tier,
      cols: cols, rows: rows,
      style: style.id,
      activeCount: shape.count,
      worldW: worldW, worldH: worldH,
      rooms: rooms, doorsH: doorsH, doorsV: doorsV,
      doorOffs: doorOffs, internalDoors: internalDoors,
      interior: interiorRes.interior, interiorByRoom: interiorRes.byRoom,
      spawn: spawn, extract: extract,
      containers: containers,
      startRoom: start, extractRoom: extractIdx,
      dist: dist,
      threat: 0, threatAcc: 0,
      objDone: false,
      eliteKills: 0, bossKills: 0,
      time: 0
    };
    return map;
  }

  G.Map = {
    generate: generate,
    ROOM: ROOM, WALL: WALL, DOOR: DOOR, SEG: SEG,

    roomRect: function (c, r) {
      return { x0: c * SEG + WALL, y0: r * SEG + WALL, x1: c * SEG + WALL + ROOM, y1: r * SEG + WALL + ROOM };
    },
    roomCenter: function (c, r) {
      var rc = G.Map.roomRect(c, r);
      return { x: (rc.x0 + rc.x1) / 2, y: (rc.y0 + rc.y1) / 2 };
    },
    roomAt: function (map, x, y) {
      var c = G.clamp(Math.floor((x - WALL) / SEG), 0, map.cols - 1);
      var r = G.clamp(Math.floor((y - WALL) / SEG), 0, map.rows - 1);
      return map.rooms[c + r * map.cols];
    },
    solid: function (map, x, y) {
      if (x < WALL || y < WALL || x >= map.worldW - WALL || y >= map.worldH - WALL) return true;
      var relX = x - WALL, relY = y - WALL;
      var c = Math.floor(relX / SEG), r = Math.floor(relY / SEG);
      var room = map.rooms[c + r * map.cols];
      if (room && room.active === false) return true;   // 形状外：整格视为墙
      var offX = relX - c * SEG, offY = relY - r * SEG;
      var inVWall = offX >= ROOM;
      var inHWall = offY >= ROOM;
      if (!inVWall && !inHWall) {
        /* 房内结构：实心掩体 */
        var rects = map.interiorByRoom && map.interiorByRoom[c + r * map.cols];
        if (rects) {
          for (var k = 0; k < rects.length; k++) {
            var rr2 = rects[k];
            if (x >= rr2[0] && x <= rr2[2] && y >= rr2[1] && y <= rr2[3]) return true;
          }
        }
        return false;
      }
      var rc = G.Map.roomRect(c, r);
      if (inVWall && c < map.cols - 1) {
        if (map.doorsH[c][r]) {
          var doorY = rc.y0 + ROOM / 2 + (map.doorOffs ? (map.doorOffs['H:' + c + ':' + r] || 0) : 0);
          if (Math.abs(y - doorY) < DOOR / 2) return false;
        }
      }
      if (inHWall && r < map.rows - 1) {
        if (map.doorsV[c][r]) {
          var doorX = rc.x0 + ROOM / 2 + (map.doorOffs ? (map.doorOffs['V:' + c + ':' + r] || 0) : 0);
          if (Math.abs(x - doorX) < DOOR / 2) return false;
        }
      }
      return true;
    },
    /* 门中心 / 门洞矩形（含错位偏移，统一出入口） */
    doorCenter: function (map, dir, c, r) {
      var rc = G.Map.roomRect(c, r);
      var off = map.doorOffs ? (map.doorOffs[dir + ':' + c + ':' + r] || 0) : 0;
      if (dir === 'H') return { x: (c + 1) * SEG, y: rc.y0 + ROOM / 2 + off };
      return { x: rc.x0 + ROOM / 2 + off, y: (r + 1) * SEG };
    },
    doorRect: function (map, dir, c, r) {
      if (typeof dir === 'object') { var ld = dir; dir = ld.dir; c = ld.c; r = ld.r; }
      var ctr = G.Map.doorCenter(map, dir, c, r);
      if (dir === 'H') {
        return { x0: ctr.x, y0: ctr.y - DOOR / 2, x1: ctr.x + WALL, y1: ctr.y + DOOR / 2 };
      }
      return { x0: ctr.x - DOOR / 2, y0: ctr.y, x1: ctr.x + DOOR / 2, y1: ctr.y + WALL };
    },
    /* 视线：48px 步进采样，墙挡视线 */
    los: function (map, x1, y1, x2, y2) {
      var d = G.dist(x1, y1, x2, y2);
      var steps = Math.max(1, Math.floor(d / 48));
      for (var i = 1; i < steps; i++) {
        var t = i / steps;
        if (G.Map.solid(map, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
      }
      return true;
    },
    pointInRoom: function (map, x, y, roomIdx) {
      var rm = map.rooms[roomIdx];
      var rc = G.Map.roomRect(rm.c, rm.r);
      return x >= rc.x0 && x <= rc.x1 && y >= rc.y0 && y <= rc.y1;
    },
    /* 实体撞墙推挤：返回修正后的坐标 */
    resolveSolid: function (map, x, y, r) {
      var pts = [[x - r, y], [x + r, y], [x, y - r], [x, y + r]];
      var ok = true;
      for (var i = 0; i < pts.length; i++) {
        if (G.Map.solid(map, pts[i][0], pts[i][1])) { ok = false; break; }
      }
      if (ok) return { x: x, y: y, hit: false };
      /* 尝试逐轴回退 */
      var nx = x, ny = y;
      if (!G.Map.solid(map, x, y - r) && !G.Map.solid(map, x, y + r)) {
        while (nx > WALL + r && G.Map.solid(map, nx, y)) nx -= 3;
        while (nx < map.worldW - WALL - r && G.Map.solid(map, nx, y)) nx += 3;
      } else {
        while (ny > WALL + r && G.Map.solid(map, x, ny)) ny -= 3;
        while (ny < map.worldH - WALL - r && G.Map.solid(map, x, ny)) ny += 3;
      }
      return { x: nx, y: ny, hit: true };
    }
  };

  /* ------------------------------------------------------------
     容器 / 交互物实体
     ------------------------------------------------------------ */
  var CONTAINER_INFO = {
    barrel:      { name: '木桶', col: '#a8763f', mat: [4, 8], itemCh: 0.10, tierBoost: 0 },
    crate:       { name: '木箱', col: '#b98a3f', mat: [5, 9], itemCh: 0.18, tierBoost: 0 },
    chest_wood:  { name: '旧木箱', col: '#8b6f4e', mat: [7, 12], itemCh: 0.60, tierBoost: 0 },
    chest_iron:  { name: '铁皮箱', col: '#8f96a8', mat: [11, 18], itemCh: 0.85, tierBoost: 1 },
    chest_gold:  { name: '金纹箱', col: '#ffd24a', mat: [18, 28], itemCh: 1.0, tierBoost: 2, extra: 0.45 },
    chest_abyss: { name: '深渊宝箱', col: '#b45cff', mat: [28, 44], itemCh: 1.0, tierBoost: 3, extra: 1.0 }
  };

  function Container(c) {
    this.cid = c.cid;
    this.x = c.x; this.y = c.y;
    this.room = c.room;
    this.type = c.type;
    this.opened = c.opened || false;
    this.used = c.used || false;
    this.ch = 0;
    this.started = false;
    this.pulse = c.pulse || 0;
    this.dead = false;
    this.info = CONTAINER_INFO[this.type] || null;
  }
  Container.prototype.update = function (dt) {
    this.pulse += dt;
    if (this.started && !this.opened) {
      this.ch += dt;
      if (this.ch >= 0.95) this.open();
    }
  };
  Container.prototype.open = function () {
    var g = G.game;
    this.opened = true;
    this.started = false;
    this.ch = 0;
    var info = this.info;
    var out = [];
    if (this.type === 'shrine') {
      this.used = true;
      var healAmt = Math.round(g.player.st.maxHp * 0.38);
      g.player.heal(healAmt);
      g.popText(this.x, this.y - 34, '+' + healAmt + ' 生命', { col: '#6ee787', size: 16, life: 1 });
      G.fx('ring', { x: this.x, y: this.y, r0: 8, r1: 150, col: '#6ee787', w: 5, life: 0.6 });
      G.burst(this.x, this.y, 24, '#6ee787', 200, { size: 3 });
      G.Audio.sfx('heal');
      return { mats: 0, items: out, heal: healAmt };
    }
    if (this.type === 'altar') {
      var cost = 12;
      if (g.materials >= cost) {
        g.materials -= cost;
        g.player.pendingLevels++;
        this.used = true;
        G.fx('ring', { x: this.x, y: this.y, r0: 8, r1: 180, col: '#c07fff', w: 6, life: 0.7 });
        G.burst(this.x, this.y, 30, '#c07fff', 240, { size: 4 });
        G.Audio.sfx('levelup');
        G.popText(this.x, this.y - 40, '祭坛共鸣 · +1 强化', { col: '#c07fff', size: 16, life: 1.2 });
        g.openLevelUpSoon = true;
        return { mats: 0, items: out, altar: true };
      }
      this.opened = false;
      return { mats: 0, items: out, noMat: true };
    }

    /* 物资箱 / 宝箱 */
    var tier = g.map.tierId, luck = g.player.st.luck;
    var mats = Math.round(G.rand(info.mat[0], info.mat[1]) * (0.8 + tier * 0.18));
    out.push({ kind: 'mats', value: mats });
    if (info.itemCh > 0 && Math.random() < info.itemCh) {
      var r = G.clamp(G.rollLootTier(tier + info.tierBoost, luck + info.tierBoost * 8), 0, 4);
      if (Math.random() < (this.type === 'chest_abyss' ? 0.35 : 0.18)) {
        out.push({ kind: 'weapon', inst: G.rollLootWeapon(tier + info.tierBoost, luck), r: r });
      } else {
        out.push({ kind: 'item', inst: G.rollLootItem(tier + info.tierBoost, luck), r: r });
      }
    }
    if (info.extra && Math.random() < info.extra) {
      var r2 = G.rollLootTier(tier + info.tierBoost, luck);
      out.push({ kind: 'item', inst: G.rollLootItem(tier + info.tierBoost, luck), r: r2 });
    }
    if (Math.random() < 0.16) {
      out.push({ kind: 'heal', value: Math.round(g.player.st.maxHp * 0.10) });
    }
    return out;
  };
  Container.prototype.reward = function (out) {
    var g = G.game, i;
    for (i = 0; i < out.length; i++) {
      var o = out[i];
      if (o.kind === 'mats') {
        g.addMaterials(o.value);
        G.burst(this.x, this.y + 10, 6, '#ffd24a', 140, { size: 2.4 });
        g.popText(this.x, this.y - 28, '+' + o.value, { col: '#ffd24a', size: 13 });
      } else if (o.kind === 'heal') {
        g.player.heal(o.value);
        g.popText(this.x, this.y - 28, '+' + o.value + ' 生命', { col: '#6ee787', size: 12 });
      } else if (o.inst) {
        if (G.grantItemOrDrop(o.inst, this.x, this.y)) {
          G.Audio.sfx('item_get');
          g.popText(this.x, this.y - 34, (o.inst.type === 'weapon' ? '武器 ' : '') + o.inst.def.name, { col: G.rarityColor(o.inst.tier), size: 14, life: 1.2 });
        }
      }
    }
  };
  Container.prototype.draw = function (c) {
    var g = G.game;
    if (this.opened) return;
    var info = this.info;
    var bob = Math.sin(this.pulse * 2.2) * 2;
    if (this.type === 'shrine' || this.type === 'altar') {
      var col = this.type === 'shrine' ? '#6ee787' : '#c07fff';
      var pulseA = 0.16 + 0.10 * (Math.sin(this.pulse * 3) + 1) / 2;
      c.save();
      c.globalAlpha = pulseA;
      c.fillStyle = col;
      c.beginPath(); c.arc(this.x, this.y, 44, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.5 + 0.3 * (Math.sin(this.pulse * 2) + 1) / 2;
      c.strokeStyle = col; c.lineWidth = 2;
      c.beginPath(); c.arc(this.x, this.y, 30 + Math.sin(this.pulse * 2) * 4, 0, Math.PI * 2); c.stroke();
      c.restore();
      var cv = G.PX.getTint('p_crate', col, 3);
      G.PX.draw(c, cv, this.x, this.y + bob);
      c.save(); c.textAlign = 'center'; c.fillStyle = col;
      c.font = 'bold 11px "Segoe UI",sans-serif';
      c.fillText(this.type === 'shrine' ? '圣泉' : '祭坛', this.x, this.y - 34);
      c.restore();
      if (this.started) drawChannel(c, this);
      return;
    }
    var col2 = info ? info.col : '#a8763f';
    /* 稀有容器：呼吸辉光 */
    if (this.type === 'chest_gold' || this.type === 'chest_abyss') {
      var glow = 0.14 + 0.10 * (Math.sin(this.pulse * 2.4) + 1) / 2;
      c.save();
      c.globalAlpha = glow;
      c.fillStyle = col2;
      c.beginPath(); c.arc(this.x, this.y, 34 + Math.sin(this.pulse * 2.4) * 3, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    var cv2 = G.PX.getTint('p_crate', col2, this.type === 'barrel' || this.type === 'crate' ? 2 : 3);
    G.PX.draw(c, cv2, this.x, this.y + bob);
    if (this.type === 'chest_abyss') {
      c.save(); c.textAlign = 'center';
      c.font = 'bold 10px "Segoe UI",sans-serif'; c.fillStyle = '#e0c0ff';
      c.fillText('✦', this.x, this.y + 22);
      c.restore();
    }
    if (this.started) drawChannel(c, this);
  };
  function drawChannel(c, cont) {
    var t = G.clamp(cont.ch / 0.95, 0, 1);
    c.save();
    c.strokeStyle = '#ffd24a'; c.lineWidth = 3;
    c.beginPath(); c.arc(cont.x, cont.y, 34, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2); c.stroke();
    c.globalAlpha = 0.25; c.fillStyle = '#ffd24a';
    c.beginPath(); c.arc(cont.x, cont.y, 30, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  G.Container = Container;
  G.CONTAINER_INFO = CONTAINER_INFO;

  /* ------------------------------------------------------------
     撤离区
     ------------------------------------------------------------ */
  G.Extract = {
    CHANNEL: EXTRACT_CHANNEL,
    update: function (dt) {
      var g = G.game, ex = g.map.extract, p = g.player;
      if (!ex || !ex.active || !p || p.dead) return;
      var d = G.dist(p.x, p.y, ex.x, ex.y);
      if (d < 78) {
        ex.channel += dt;
        ex.chOn = true;
        if (!ex._sfx) { G.Audio.sfx('extract_start'); ex._sfx = true; }
        if (ex.channel >= EXTRACT_CHANNEL) {
          g.onExtractSuccess();
          return;
        }
      } else {
        if (ex.chOn) G.Audio.sfx('back');
        ex.channel = 0;
        ex.chOn = false;
        ex._sfx = false;
      }
      p.vx *= 0.72; p.vy *= 0.72;   // 引导时减速（站桩）
    },
    draw: function (c) {
      var g = G.game, ex = g.map.extract;
      if (!ex) return;
      var pulse = (Math.sin(g.runTime * 3.2) + 1) / 2;
      var col = ex.active ? '#6ee787' : '#5a5f72';
      c.save();
      c.globalAlpha = ex.active ? 0.10 + 0.08 * pulse : 0.06;
      c.fillStyle = col;
      c.beginPath(); c.arc(ex.x, ex.y, 70, 0, Math.PI * 2); c.fill();
      c.globalAlpha = ex.active ? 0.7 : 0.3;
      c.strokeStyle = col; c.lineWidth = 3;
      c.beginPath(); c.arc(ex.x, ex.y, 70, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = ex.active ? 0.9 : 0.4;
      c.strokeStyle = col; c.lineWidth = 2;
      c.beginPath(); c.arc(ex.x, ex.y, 62 + pulse * 5, 0, Math.PI * 2); c.stroke();
      if (ex.active) {
        c.globalAlpha = 0.5 + 0.4 * pulse;
        c.fillStyle = '#bfffd8';
        c.font = 'bold 13px "Segoe UI",sans-serif'; c.textAlign = 'center';
        c.fillText('撤离点 · 站入引导', ex.x, ex.y - 92);
      }
      if (ex.chOn && ex.channel > 0) {
        var t = G.clamp(ex.channel / EXTRACT_CHANNEL, 0, 1);
        c.strokeStyle = '#bfffd8'; c.lineWidth = 5;
        c.beginPath(); c.arc(ex.x, ex.y, 84, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2); c.stroke();
      }
      c.restore();
    }
  };
  G.Map.EXTRACT_CHANNEL = EXTRACT_CHANNEL;

})();
