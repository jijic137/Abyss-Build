/* ============================================================
   15_extract.js —— 搜打撤界面层（覆盖 09_ui 相关方法）
   整备 / 市场 / 选图 / HUD 小地图 / 背包 / 出货卡片 / 结算
   ============================================================ */
'use strict';

(function () {

  var $ = G.$, el = G.el;

  /* 物品掉落：实例档位 = 定义稀有度（武器保留品质档位） */
  G.rollLootItem = function (mapTier, luck) {
    var r = G.rollLootTier(mapTier, luck);
    var list = G.ITEMS_BY_R[r];
    if (!list || !list.length) return null;
    var it = G.pick(list);
    return G.makeItem(it.id, it.r);
  };

  /* ------------------------------------------------------------
     屏幕切换（扩展新屏，容错缺失节点）
     ------------------------------------------------------------ */
  var SCREENS = ['scrTitle', 'scrCharSelect', 'scrBase', 'scrMarket', 'scrMapSelect',
    'scrLevel', 'scrPause', 'scrResult', 'scrSettings', 'scrRecords', 'scrAch', 'scrSave'];

  G.UI.showScreen = function (id) {
    var ov = $('overlay');
    SCREENS.forEach(function (s) {
      var n = $(s);
      if (n) n.classList.toggle('on', s === id);
    });
    ov.classList.toggle('on', !!id);
    G.UI.hideTip();
    if (id === 'scrTitle' || id === 'scrRecords' || id === 'scrAch' || id === 'scrSave') {
      G.UI.renderSubPanels();
    }
    if (id === 'scrTitle') {
      var rb = $('btnResumeRun');
      if (rb) rb.classList.toggle('hidden', !G.Save.getRun());
    }
    if (id === 'scrCharSelect') G.UI._vortex('wheel').start();
    else G.UI._vortex('wheel').stop();
    var v = G.UI._vortices && G.UI._vortices['cover']; if (v) v.stop();
  };

  /* ------------------------------------------------------------
     轮盘确认 → 选图
     ------------------------------------------------------------ */
  G.UI.confirmWheelSelection = function () {
    var w = G.UI._wheel;
    if (!w || w.active === undefined) return;
    if (!w.chars || w.selected < 0 || !w.chars[w.selected]) return;
    var ch = w.chars[w.selected];
    G._exploring = false;
    G.Audio.sfx('confirm');
    G.UI._selectedChar = ch;
    G.UI.stopWheel();
    G.UI.renderMapSelect();
    G.UI.showScreen('scrMapSelect');
  };

  /* ------------------------------------------------------------
     目标行 / 互动提示
     ------------------------------------------------------------ */
  G.UI.updateObjective = function (map) {
    if (!map) return;
    var t = map.tierId, txt;
    if (map.objDone || map.extract.active) {
      txt = '撤离点已开放 —— 前往标记处撤离';
    } else if (t === 1) {
      txt = '目标：存活 ' + Math.max(0, Math.ceil(60 - map.time)) + ' 秒';
    } else if (t === 2) {
      txt = '目标：击杀精英 ' + map.eliteKills + ' / 1';
    } else if (t === 3) {
      txt = '目标：击败腐化巨兽';
    } else if (t === 4) {
      txt = '目标：击杀精英 ' + map.eliteKills + ' / 2';
    } else {
      txt = '目标：击败深渊之主';
    }
    G.UI._objText = txt;
    var n = $('objLine');
    if (n) n.textContent = txt;
  };

  function updateInteractHint(g) {
    var n = $('interactHint');
    if (!n) return;
    var p = g.player, txt = '';
    if (p && !p.dead && g.map) {
      var ex = g.map.extract;
      if (ex.active && G.dist(p.x, p.y, ex.x, ex.y) < 96) {
        txt = 'E · 撤离（引导中）';
      } else {
        for (var i = 0; i < g.containers.length; i++) {
          var c = g.containers[i];
          if (c.opened || c.used) continue;
          if (G.dist(p.x, p.y, c.x, c.y) < 84) {
            txt = 'E · ' + (G.CONTAINER_INFO[c.type] ? G.CONTAINER_INFO[c.type].name : '互动');
            break;
          }
        }
      }
    }
    n.textContent = txt;
    n.classList.toggle('hidden', !txt);
  }

  /* ------------------------------------------------------------
     HUD（搜打撤版）
     ------------------------------------------------------------ */
  var SP_INFO = {
    burnOnHit: { sym: '燃', col: '#ff8a3a', name: '命中灼烧', desc: '命中敌人有几率附加灼烧伤害' },
    chainOnHit: { sym: '链', col: '#8fe8ff', name: '命中连锁', desc: '命中敌人有几率连锁闪电' },
    frostAura: { sym: '冰', col: '#8fe8ff', name: '冰霜光环', desc: '周围敌人持续减速' },
    poisonAura: { sym: '毒', col: '#7ee06a', name: '剧毒光环', desc: '周围敌人持续中毒' },
    explodeOnKill: { sym: '爆', col: '#ff6b3a', name: '爆破协议', desc: '击杀时引发范围爆炸' },
    revive: { sym: '生', col: '#6ee787', name: '不屈', desc: '生命归零时复活一次' },
    execute: { sym: '斩', col: '#ff4a4a', name: '处决', desc: '对低血量敌人造成额外伤害' },
    critExplode: { sym: '星', col: '#ffd24a', name: '暴击新星', desc: '暴击时引发爆炸' },
    poisonOnHit: { sym: '毒', col: '#7ee06a', name: '淬毒', desc: '命中敌人有几率中毒' },
    thunderAura: { sym: '雷', col: '#c9a6ff', name: '雷霆光环', desc: '周期性释放连锁闪电' },
    critSlow: { sym: '缓', col: '#ff9ad0', name: '暴击迟滞', desc: '暴击使目标减速' },
    leechOnKill: { sym: '噬', col: '#ff5fa8', name: '噬魂', desc: '击杀敌人回复生命' }
  };

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  G.UI.updateHud = function (g) {
    var p = g.player;
    if (!p) return;
    var pct = G.clamp(p.hp / p.st.maxHp, 0, 1);
    $('hpFill').style.width = (pct * 100) + '%';
    $('hpText').textContent = Math.ceil(p.hp) + ' / ' + Math.round(p.st.maxHp);
    $('chipArmor').textContent = '护甲 ' + Math.round(p.st.armor) +
      '（-' + Math.round((1 - G.F.armorMul(p.st.armor)) * 100) + '%）';
    $('chipDodge').textContent = '闪避 ' + Math.round(G.F.dodgeChance(p.st.dodge) * 100) + '%';
    $('chipSpd').textContent = '速度 ' + Math.round(100 + p.st.speed) + '%';

    var m = g.map;
    if (m) {
      $('waveLabel').textContent = m.tier.name;
      var obj = '';
      if (m.extract.active) {
        obj = '撤离开放';
        $('waveTimer').style.color = '#6ee787';
      } else if (m.tierId === 1) {
        obj = Math.max(0, Math.ceil(60 - m.time)) + 's';
        $('waveTimer').style.color = '';
      } else {
        obj = '···';
        $('waveTimer').style.color = '';
      }
      $('waveTimer').textContent = obj;
      var prog = m.tierId === 1 ? G.clamp(m.time / 60, 0, 1) : G.clamp(m.time / 150, 0, 1);
      $('waveProg').style.width = (prog * 100) + '%';
      var rm = G.Map.roomAt(m, p.x, p.y);
      var tnames = { combat: '战斗区', treasure: '宝库', elite: '精英房', boss: 'BOSS 房', shrine: '圣泉', altar: '祭坛', extract: '撤离区', spawn: '出生区' };
      $('waveSub').textContent = tnames[rm.type] || '探索';
    }
    $('comboLabel').textContent = g.combo >= 2 ? (g.combo + ' 连击') : '';

    $('matText').textContent = g.materials;
    var xr = G.clamp(p.xp / p.xpNeed, 0, 1);
    $('xpFill').style.width = (xr * 100) + '%';
    $('xpText').textContent = 'Lv.' + p.level;

    /* 武器栏 */
    var bar = $('weaponBar');
    var sig = p.weapons.map(function (w) { return w.defId + w.tier; }).join(',');
    if (bar.childElementCount !== p.weapons.length || bar.dataset.sig !== sig) {
      bar.innerHTML = '';
      bar.dataset.sig = sig;
      p.weapons.forEach(function (w) {
        var s = el('div', 'wslot');
        s.style.borderColor = w.tier === 0 ? '#333a52' : G.rarityColor(w.tier);
        s.appendChild(G.PX.node(G.weaponIcon(w.def, w.tier, 3)));
        var cd = el('div', 'cd'); s.appendChild(cd);
        s._cd = cd; s._w = w;
        s.addEventListener('mouseenter', function (e) {
          G.UI.showTip(G.UI.weaponTip(w.def, w.tier), e.clientX, e.clientY);
        });
        s.addEventListener('mousemove', function (e) { G.UI.showTip(G.UI.weaponTip(w.def, w.tier), e.clientX, e.clientY); });
        s.addEventListener('mouseleave', G.UI.hideTip);
        bar.appendChild(s);
      });
    }
    Array.prototype.forEach.call(bar.children, function (s) {
      var w = s._w;
      if (!w) return;
      var full = G.wCooldown(w) * G.F.cdMul(p.st.attackSpeed);
      var r = G.clamp(w.timer / full, 0, 1);
      s._cd.style.height = (r * 100) + '%';
    });

    /* 状态效果 */
    var sbar = $('statusBar');
    var spList = [];
    for (var k in SP_INFO) if (p.hasSp(k)) spList.push(k);
    var ssig = spList.join(',');
    if (sbar.dataset.sig !== ssig) {
      sbar.dataset.sig = ssig;
      sbar.innerHTML = '';
      spList.forEach(function (sp) {
        var info = SP_INFO[sp];
        var c = el('div', 'status-chip');
        c.style.borderColor = info.col;
        c.style.color = info.col;
        c.textContent = info.sym;
        c.addEventListener('mouseenter', function (e) {
          G.UI.showTip('<div class="tt-name" style="color:' + info.col + '">' + info.name +
            '</div><div style="color:#8a90a8">' + info.desc + '</div>', e.clientX, e.clientY);
        });
        c.addEventListener('mouseleave', G.UI.hideTip);
        sbar.appendChild(c);
      });
    }

    /* BOSS 血条 */
    var boss = null;
    for (var bi = 0; bi < g.enemies.length; bi++) {
      if (g.enemies[bi].def.boss && !g.enemies[bi].dead) { boss = g.enemies[bi]; break; }
    }
    var bw = $('bossBarWrap');
    if (boss) {
      bw.classList.remove('hidden');
      $('bossName').textContent = boss.def.name + '　第 ' + boss.phase + ' 阶段';
      $('bossFill').style.width = G.clamp(boss.hp / boss.maxHp, 0, 1) * 100 + '%';
    } else bw.classList.add('hidden');

    /* 背包计数 */
    var bc = $('bagCount');
    if (bc) bc.textContent = g.bag.length + ' / ' + G.BAG_SIZE;

    updateInteractHint(g);
    drawMinimap(g);
    if (G.UI._objText) {
      var on = $('objLine');
      if (on) on.textContent = G.UI._objText;
    }
  };

  /* ---------------- 小地图 ---------------- */
  function drawMinimap(g) {
    var cv = $('minimap');
    if (!cv || !g.map) return;
    var c = cv.getContext('2d');
    var m = g.map;
    var W = cv.width, H = cv.height;
    var scale = Math.min(W / m.worldW, H / m.worldH);
    var ox = (W - m.worldW * scale) / 2, oy = (H - m.worldH * scale) / 2;
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(8,10,16,.82)';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#0b0d14';
    c.fillRect(ox, oy, m.worldW * scale, m.worldH * scale);
    var i;
    for (i = 0; i < m.rooms.length; i++) {
      var rm = m.rooms[i];
      if (!rm.explored) continue;
      var rc = G.Map.roomRect(rm.c, rm.r);
      var col = '#1a1e2c';
      if (rm.type === 'extract') col = '#2a3d30';
      else if (rm.type === 'treasure') col = '#3d3318';
      else if (rm.type === 'elite') col = '#3d2a18';
      else if (rm.type === 'boss') col = '#3d1a22';
      else if (rm.type === 'shrine') col = '#1f3326';
      else if (rm.type === 'altar') col = '#2a1f3d';
      c.fillStyle = col;
      c.fillRect(ox + rc.x0 * scale, oy + rc.y0 * scale, (rc.x1 - rc.x0) * scale, (rc.y1 - rc.y0) * scale);
      if (rm.type === 'extract') {
        c.fillStyle = m.extract.active ? '#6ee787' : '#4a5a52';
        c.beginPath();
        c.moveTo(ox + (rc.x0 + rc.x1) / 2 * scale, oy + (rc.y0 + 20) * scale);
        c.lineTo(ox + (rc.x0 + rc.x1) / 2 * scale, oy + (rc.y1 - 20) * scale);
        c.lineWidth = 2;
        c.strokeStyle = c.fillStyle;
        c.stroke();
      }
    }
    /* 玩家 */
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(ox + g.player.x * scale, oy + g.player.y * scale, 2.2, 0, Math.PI * 2);
    c.fill();
    /* 视野范围高亮 */
    var cur = G.Map.roomAt(m, g.player.x, g.player.y);
    var curRc = G.Map.roomRect(cur.c, cur.r);
    c.strokeStyle = 'rgba(255,255,255,.35)';
    c.lineWidth = 1;
    c.strokeRect(ox + curRc.x0 * scale, oy + curRc.y0 * scale, (curRc.x1 - curRc.x0) * scale, (curRc.y1 - curRc.y0) * scale);
    c.strokeStyle = 'rgba(120,140,200,.25)';
    c.strokeRect(ox + 0.5, oy + 0.5, m.worldW * scale - 1, m.worldH * scale - 1);
  }

  /* ------------------------------------------------------------
     背包
     ------------------------------------------------------------ */
  G.UI.toggleBag = function () {
    var n = $('scrBag');
    if (!n) return;
    var hid = n.classList.contains('hidden');
    if (hid) G.UI.renderBag();
    n.classList.toggle('hidden');
  };

  G.UI.renderBag = function () {
    var g = G.game, p = g.player;
    var grid = $('bagGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var i;
    var slotNames = { w1: '武器①', w2: '武器②', armor: '防具', trinket1: '饰品①', trinket2: '饰品②', relic: '遗物' };
    var slots = G.Meta.SLOT_ORDER;
    var used = {};
    slots.forEach(function (s) {
      var t = G.Meta.slotType(s);
      var inst = null;
      if (t === 'weapon') {
        var wi = slots.indexOf(s) === 0 ? 0 : 1;
        if (p.weapons[wi]) inst = { uid: p.weapons[wi].uid, defId: p.weapons[wi].defId, def: p.weapons[wi].def, tier: p.weapons[wi].tier, type: 'weapon' };
      } else {
        for (i = 0; i < p.items.length; i++) {
          if (G.itemType(p.items[i]) === t && !used[i]) { inst = { uid: p.items[i].id, defId: p.items[i].id, def: p.items[i], tier: G.clamp(p.items[i].r, 0, 4), type: t }; used[i] = true; break; }
        }
      }
      if (inst) {
        var cell = el('div', 'bag-cell equip-slot');
        cell.style.borderColor = inst.tier === 0 ? '#333a52' : G.rarityColor(inst.tier);
        cell.appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 3) : G.itemIcon(inst.def, 3)));
        cell.title = slotNames[s] + '：' + inst.def.name;
        bindTip2(cell, inst);
        cell.addEventListener('click', function () {
          G.UI.bagUnequip(s, inst);
        });
        grid.appendChild(cell);
      } else {
        var empty = el('div', 'bag-cell empty', slotNames[s]);
        grid.appendChild(empty);
      }
    });
    /* 背包物品 */
    g.bag.forEach(function (inst, idx) {
      var cell = el('div', 'bag-cell');
      cell.style.borderColor = inst.tier === 0 ? '#333a52' : G.rarityColor(inst.tier);
      cell.appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 3) : G.itemIcon(inst.def, 3)));
      bindTip2(cell, inst);
      cell.addEventListener('click', function () { G.UI.bagEquip(idx); });
      grid.appendChild(cell);
    });
    for (var k = 0; k < G.BAG_SIZE - g.bag.length && k < 4; k++) {
      grid.appendChild(el('div', 'bag-cell empty'));
    }
  };

  function bindTip2(node, inst) {
    node.addEventListener('mouseenter', function (e) {
      G.UI.showTip(inst.type === 'weapon' ? G.UI.weaponTip(inst.def, inst.tier) : G.UI.itemTip(inst.def), e.clientX, e.clientY);
    });
    node.addEventListener('mousemove', function (e) {
      G.UI.showTip(inst.type === 'weapon' ? G.UI.weaponTip(inst.def, inst.tier) : G.UI.itemTip(inst.def), e.clientX, e.clientY);
    });
    node.addEventListener('mouseleave', G.UI.hideTip);
  }

  G.UI.bagUnequip = function (slot, inst) {
    var g = G.game, p = g.player, t = G.Meta.slotType(slot);
    if (t === 'weapon') {
      var idx = slot === 'w1' ? 0 : 1;
      if (!p.weapons[idx]) return;
      if (g.bag.length >= G.BAG_SIZE) { G.UI.flashText(null, '背包已满'); return; }
      var old = p.weapons[idx];
      p.removeWeapon(idx);
      g.bag.push(G.makeWeapon(old.defId, old.tier));
      G.Audio.sfx('back');
    } else {
      for (var i = 0; i < p.items.length; i++) {
        if (G.itemType(p.items[i]) === t) {
          if (g.bag.length >= G.BAG_SIZE) { G.UI.flashText(null, '背包已满'); return; }
          var def = p.items[i];
          p.removeItem(i);
          g.bag.push(G.makeItem(def.id, G.clamp(def.r, 0, 4)));
          G.Audio.sfx('back');
          break;
        }
      }
    }
    G.UI.renderBag();
  };

  G.UI.bagEquip = function (bagIdx) {
    var g = G.game, p = g.player;
    var inst = g.bag[bagIdx];
    if (!inst) return;
    var t = inst.type;
    if (t === 'weapon') {
      if (p.weapons.length >= p.maxWeapons) {
        /* 换下第一把 */
        if (g.bag.length >= G.BAG_SIZE) { G.UI.flashText(null, '背包已满，先卸下装备'); return; }
        var old = p.weapons[0];
        p.removeWeapon(0);
        g.bag.push(G.makeWeapon(old.defId, old.tier));
      }
      p.addWeapon(G.makeWeapon(inst.defId, inst.tier));
      g.bag.splice(bagIdx, 1);
      G.Audio.sfx('buy');
    } else {
      /* 同类已有则换下 */
      for (var i = 0; i < p.items.length; i++) {
        if (G.itemType(p.items[i]) === t) {
          if (g.bag.length >= G.BAG_SIZE) { G.UI.flashText(null, '背包已满，先卸下装备'); return; }
          var def = p.items[i];
          p.removeItem(i);
          g.bag.push(G.makeItem(def.id, G.clamp(def.r, 0, 4)));
          break;
        }
      }
      p.addItem(inst.def);
      g.bag.splice(bagIdx, 1);
      G.Audio.sfx('buy');
    }
    G.UI.renderBag();
    G.UI.updateHud(g);
  };

  /* ------------------------------------------------------------
     出货卡片
     ------------------------------------------------------------ */
  G.UI.showLootCard = function (inst) {
    var toast = $('lootToast');
    if (!toast) return;
    var col = inst.tier === 0 ? '#d9dde8' : G.rarityColor(inst.tier);
    $('lootIcon').innerHTML = '';
    $('lootIcon').appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 4) : G.itemIcon(inst.def, 4)));
    $('lootName').textContent = inst.def.name;
    $('lootName').style.color = col;
    $('lootSub').textContent = (inst.type === 'weapon' ? '武器 · ' : '') + G.rarityName(inst.tier) + ' · 已入背包';
    toast.classList.remove('hidden');
    toast.style.borderColor = col;
    toast.style.boxShadow = '0 0 24px ' + col + '66';
    toast.classList.remove('loot-pop');
    void toast.offsetWidth;
    toast.classList.add('loot-pop');
    clearTimeout(G.UI._lootT);
    G.UI._lootT = setTimeout(function () {
      toast.classList.add('hidden');
      toast.style.boxShadow = '';
    }, 1500);
  };

  /* ------------------------------------------------------------
     整备仓库
     ------------------------------------------------------------ */
  G.UI.flashText = function (btn, msg) {
    var target = btn || $('objLine');
    if (!target) return;
    var old = target.textContent;
    target.textContent = msg;
    if (btn) btn.style.borderColor = '#ff6b6b';
    setTimeout(function () {
      target.textContent = old;
      if (btn) btn.style.borderColor = '';
    }, 1000);
  };

  var SLOT_LABEL = { w1: '武器①', w2: '武器②', armor: '防具', trinket1: '饰品①', trinket2: '饰品②', relic: '遗物' };

  G.UI.renderBase = function () {
    var meta = G.Meta.get();
    $('baseCurrency').textContent = meta.currency;
    $('baseStashCount').textContent = meta.stash.length + ' / ' + meta.stashSize;
    var eb = $('equipGrid');
    eb.innerHTML = '';
    G.Meta.SLOT_ORDER.forEach(function (slot) {
      var inst = meta.loadout[slot];
      var cell = el('div', 'inv-cell equip-cell');
      var label = el('div', 'equip-label', SLOT_LABEL[slot]);
      cell.appendChild(label);
      if (inst) {
        cell.style.borderColor = inst.tier === 0 ? '#333a52' : G.rarityColor(inst.tier);
        cell.appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 3) : G.itemIcon(inst.def, 3)));
        var nm = el('div', 'equip-name', inst.def.name);
        cell.appendChild(nm);
        bindTip2(cell, inst);
        cell.addEventListener('click', function () {
          if (G.Meta.stashFull()) { G.UI.flashText(null, '仓库已满，无法卸下'); return; }
          G.Meta.setLoadout(slot, null);
          G.Meta.addToStash(inst);
          G.Audio.sfx('back');
          G.UI.renderBase();
        });
      } else {
        cell.classList.add('empty');
      }
      eb.appendChild(cell);
    });

    /* 仓库 */
    var sg = $('stashGrid');
    sg.innerHTML = '';
    meta.stash.forEach(function (inst) {
      var cell = el('div', 'inv-cell stash-cell');
      cell.style.borderColor = inst.tier === 0 ? '#333a52' : G.rarityColor(inst.tier);
      cell.appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 3) : G.itemIcon(inst.def, 3)));
      var sell = el('div', 'stash-sell', '售 ' + G.itemWorth(inst));
      cell.appendChild(sell);
      bindTip2(cell, inst);
      cell.addEventListener('click', function () {
        var t = inst.type;
        var slot = null;
        if (t === 'weapon') {
          slot = meta.loadout.w1 ? (meta.loadout.w2 ? null : 'w2') : 'w1';
        } else {
          for (var s = 0; s < G.Meta.SLOT_ORDER.length; s++) {
            var sl = G.Meta.SLOT_ORDER[s];
            if (G.Meta.slotType(sl) === t && !meta.loadout[sl]) { slot = sl; break; }
          }
        }
        if (!slot) {
          G.UI.flashText(null, '对应栏位已满，无法装备（点「售」出售）');
          return;
        }
        G.Meta.setLoadout(slot, inst);
        G.Meta.removeFromStash(inst.uid);
        G.Audio.sfx('buy');
        G.UI.renderBase();
      });
      sell.addEventListener('click', function (e) {
        e.stopPropagation();
        G.Meta.removeFromStash(inst.uid);
        G.Meta.addCurrency(G.itemWorth(inst));
        G.Audio.sfx('select');
        G.UI.renderBase();
      });
      sg.appendChild(cell);
    });
    for (var i = meta.stash.length; i < Math.min(meta.stashSize, 36); i++) {
      sg.appendChild(el('div', 'inv-cell empty'));
    }
    var expand = $('btnBaseExpand');
    if (expand) expand.textContent = '扩容仓库 +10 · ' + G.Meta.expandCost();
  };

  /* ------------------------------------------------------------
     市场
     ------------------------------------------------------------ */
  G.UI.renderMarket = function () {
    var meta = G.Meta.get();
    $('marketCurrency').textContent = meta.currency;
    var tier = Math.max(1, meta.stats.bestTier || 1);
    if (!G.Market.offers.length) G.Market.refresh(tier, 0);
    $('marketRefreshCost').textContent = G.Market.refreshCost();
    var box = $('marketCards');
    box.innerHTML = '';
    G.Market.offers.forEach(function (o, idx) {
      var inst = G.Market.instance(o);
      if (!inst) return;
      var col = inst.tier === 0 ? '#d9dde8' : G.rarityColor(inst.tier);
      var card = el('div', 'card');
      card.style.setProperty('--rc', col);
      var head = el('div', 'card-head');
      var ic = el('div', 'card-icon');
      ic.appendChild(G.PX.node(inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 4) : G.itemIcon(inst.def, 4)));
      head.appendChild(ic);
      var nm = el('div');
      nm.appendChild(el('div', 'card-name', inst.def.name));
      nm.appendChild(el('div', 'card-type', G.ITEM_TYPE_NAMES[inst.type] + ' · ' + G.rarityName(inst.tier)));
      head.appendChild(nm);
      card.appendChild(head);
      var body = el('div', 'card-mods');
      if (inst.type === 'weapon') {
        var tmp = { def: inst.def, tier: inst.tier };
        body.innerHTML = '<div class="p">伤害 ' + G.fmt(G.wDamage(tmp), 1) +
          '　冷却 ' + G.fmt(G.wCooldown(tmp), 2) + 's</div>' +
          '<div class="p">射程 ' + Math.round(inst.def.range) + '</div>';
      } else {
        body.appendChild(el('div', 'p', '类型 ' + G.ITEM_TYPE_NAMES[inst.type]));
      }
      card.appendChild(body);
      card.appendChild(el('div', 'card-flavor', inst.type === 'weapon' ? inst.def.desc : (inst.def.fl || '')));
      var foot = el('div', 'card-foot');
      var price = G.itemCost(inst);
      var buy = el('button', 'btn card-buy' + (meta.currency < price ? ' poor' : ''), '购买 · ' + price);
      buy.addEventListener('click', function () {
        var r = G.Market.buy(idx);
        if (!r.ok) { G.UI.flashText(buy, r.msg); return; }
        card.classList.add('buy-pop');
        var cr = card.getBoundingClientRect();
        G.UI.burstDom(cr.left + cr.width / 2, cr.top + cr.height / 2, '#ffd24a', 10);
        setTimeout(function () { G.UI.renderMarket(); }, 220);
      });
      foot.appendChild(buy);
      card.appendChild(foot);
      bindTip2(card, inst);
      box.appendChild(card);
    });
  };

  /* ------------------------------------------------------------
     选图
     ------------------------------------------------------------ */
  G.UI.renderMapSelect = function () {
    var ch = G.UI._selectedChar;
    var cn = $('mapCharName');
    if (cn && ch) {
      cn.textContent = ch.name;
      cn.style.color = ch.color || '#fff';
    }
    var meta = G.Meta.get();
    var box = $('mapCards');
    box.innerHTML = '';
    G.TIERS.forEach(function (t) {
      var unlocked = G.Meta.tierUnlocked(t.id);
      var card = el('div', 'map-card' + (G.UI._selectedTier === t.id ? ' selected' : '') + (unlocked ? '' : ' locked'));
      card.style.setProperty('--mc', t.col);
      card.appendChild(el('div', 'map-name', t.name));
      card.appendChild(el('div', 'map-sub', t.sub));
      card.appendChild(el('div', 'map-obj', '目标：' + t.obj));
      var fee = t.fee === 0 ? '免费' : t.fee + ' 币';
      card.appendChild(el('div', 'map-fee', '门票 ' + fee));
      var danger = '', i;
      for (i = 0; i < 5; i++) danger += i < t.danger ? '▲' : '△';
      var loot = '';
      for (i = 0; i < 5; i++) loot += i < t.loot ? '◆' : '◇';
      card.appendChild(el('div', 'map-meta', '<span style="color:#ff8a7a">危险 ' + danger + '</span>　<span style="color:#ffd24a">掉落 ' + loot + '</span>'));
      if (!unlocked) {
        card.appendChild(el('div', 'map-lock', '未解锁 · 通关上一层解锁'));
      }
      card.addEventListener('click', function () {
        if (!unlocked) { G.UI.flashText(null, '先通关上一层再挑战这里'); return; }
        G.UI._selectedTier = t.id;
        G.Audio.sfx('select');
        G.UI.renderMapSelect();
      });
      box.appendChild(card);
    });
  };

  /* ------------------------------------------------------------
     结算（撤离成功 / 死亡）
     ------------------------------------------------------------ */
  G.UI.showResult = function (g, win, info) {
    info = info || {};
    var p = g.player;
    $('resultTitle').textContent = win ? '撤离成功' : '你倒下了';
    $('resultTitle').style.color = win ? '#6ee787' : '#ff6b6b';
    $('resultSub').textContent = win
      ? ('带出 ' + info.items + ' 件物品 · 材料折现 ' + info.mats + ' 币' +
         (info.firstClear ? ' · 首通奖励 +' + info.bonus : '') +
         (info.sold ? ' · 仓库满，折售 ' + info.sold + ' 件' : ''))
      : ('本局携带的一切都留在了深渊里：损失 ' + info.lost + ' 件物品。整备后再次出发。');

    var t = g.runTime || 0;
    var dps = t > 0 ? Math.round(p.stats.dmgDealt / t) : 0;
    var newAch = G.UI.evaluateEnd(g, p, win);

    var rows = [
      ['区域', g.map ? (g.map.tier.name + ' · 第 ' + (g.sublevel || 1) + ' / 16 小关') : '—'],
      ['存活时间', fmtTime(t)],
      ['击杀 / 精英 / BOSS', p.stats.kills + ' / ' + p.stats.eliteKills + ' / ' + p.stats.bossKills],
      ['最高连击', p.stats.comboMax + ' 连'],
      ['DPS', dps.toLocaleString()],
      ['累计伤害', Math.round(p.stats.dmgDealt).toLocaleString()],
      ['材料', g.materials]
    ];
    if (win) {
      rows.push(['带出物品', info.items + ' 件']);
      rows.push(['深渊币收入', '+' + (info.mats + (info.bonus || 0))]);
    } else {
      rows.push(['损失物品', info.lost + ' 件']);
    }
    if (newAch.length) {
      var names = newAch.map(function (id) {
        var a = null;
        for (var i = 0; i < G.ACHIEVEMENTS.length; i++) if (G.ACHIEVEMENTS[i].id === id) a = G.ACHIEVEMENTS[i];
        return a ? a.icon + ' ' + a.name : id;
      });
      rows.push(['★ 新成就', names.join('　')]);
    }
    var host = $('resultStats');
    host.innerHTML = '';
    rows.forEach(function (r) {
      var row = el('div', 'stat-row');
      row.appendChild(el('span', 'k', r[0]));
      var v = el('span', 'v', r[1]);
      if (typeof r[1] === 'string' && r[1].indexOf('★') >= 0) v.style.color = '#ffd24a';
      row.appendChild(v);
      host.appendChild(row);
    });
    G.UI.showScreen('scrResult');
  };

  /* 成就重定义 + 结算评定（搜打撤指标） */
  G.ACHIEVEMENTS = [
    { id: 'first_extract', name: '第一次活着回来', icon: '✦', desc: '完成第一次撤离' },
    { id: 'mid_abyss', name: '深部矿坑', icon: '⟁', desc: '抵达第 3 层区域' },
    { id: 'conqueror', name: '深渊征服者', icon: '☉', desc: '通关第 5 层「终焉之门」' },
    { id: 'slayer100', name: '百杀', icon: '⚔', desc: '单局击杀 ≥ 100' },
    { id: 'elite_hunter', name: '精英猎手', icon: '✸', desc: '单局精英击杀 ≥ 5' },
    { id: 'boss_slayer', name: '屠龙者', icon: '☠', desc: '单局击败 2 个 BOSS' },
    { id: 'combo_master', name: '连击大师', icon: '✺', desc: '单局最高连击 ≥ 30' },
    { id: 'annihilator', name: '毁灭输出', icon: '✹', desc: '单局 DPS ≥ 10000' },
    { id: 'ascetic', name: '苦行者', icon: '✠', desc: '不携带装备撤离成功' },
    { id: 'collector', name: '全职业撤离', icon: '⬡', desc: '用全部职业各撤离一次' },
    { id: 'speedrun', name: '速通', icon: '⟳', desc: '8 分钟内撤离成功' },
    { id: 'tycoon', name: '暴富', icon: '❖', desc: '单局累计材料 ≥ 500' }
  ];

  G.UI.evaluateEnd = function (g, p, win) {
    var t = g.runTime || 0;
    var dps = t > 0 ? p.stats.dmgDealt / t : 0;
    var s = G.Save.getStats();
    G.Save.addStats({ totalRuns: 1, totalKills: p.stats.kills, wins: win ? 1 : 0 });
    G.Save.setStats({ bestCombo: p.stats.comboMax, bestDps: Math.round(dps) });
    if (win) {
      G.Save.markCharWon(p.char.id);
      var won = G.Save.getStats().charsWon;
      var all = G.CHARACTERS.every(function (c) { return won[c.id]; });
      if (all) G.Save.unlockAch('collector');
    }
    var tier = g.map ? g.map.tierId : 1;
    var checks = {
      first_extract: win,
      mid_abyss: tier >= 3,
      conqueror: win && tier >= 5,
      slayer100: p.stats.kills >= 100,
      elite_hunter: p.stats.eliteKills >= 5,
      boss_slayer: p.stats.bossKills >= 2,
      combo_master: p.stats.comboMax >= 30,
      annihilator: dps >= 5000,
      ascetic: win && p.items.length === 0 && p.weapons.length === 0 && g.bag.length === 0,
      speedrun: win && t <= 480,
      tycoon: p.stats.matEarned >= 500
    };
    var unlocked = [];
    for (var id in checks) {
      if (checks[id] && G.Save.unlockAch(id)) unlocked.push(id);
    }
    return unlocked;
  };

  /* ------------------------------------------------------------
     记录（搜打撤统计）
     ------------------------------------------------------------ */
  G.UI.renderSubRecords = function () {
    var st = G.Meta.stats();
    var rows = [
      ['深渊币', G.Meta.currency()],
      ['仓库', G.Meta.stash().length + ' / ' + G.Meta.get().stashSize],
      ['撤离次数', st.extracts || 0],
      ['死亡次数', st.deaths || 0],
      ['带出物品', st.itemsExtracted || 0],
      ['损失物品', st.itemsLost || 0],
      ['最高区域', (st.bestTier || 0) + ' / 5 层'],
      ['累计获取', (st.totalEarned || 0) + ' 币'],
      ['累计花费', (st.totalSpent || 0) + ' 币'],
      ['历史最多击杀', G.Save.get().bestKills]
    ];
    var host = $('recBody');
    if (!host) return;
    host.innerHTML = '';
    rows.forEach(function (r) {
      var row = el('div', 'rec-row');
      row.appendChild(el('span', 'rec-k', r[0]));
      row.appendChild(el('span', 'rec-v', String(r[1])));
      host.appendChild(row);
    });
  };

  /* 存档子页（搜打撤快照） */
  G.UI.renderSubSave = function () {
    var host = $('saveBody');
    if (!host) return;
    host.innerHTML = '';
    var run = G.Save.getRun();
    if (!run || run.mode !== 'extract') {
      host.appendChild(el('div', 'save-empty', '暂无进行中的战局。<br>进图时自动保存，可在此继续或抹除。'));
      return;
    }
    var ch = G.CHAR_BY_ID[run.charId];
    var tier = G.TIER_MAP[run.tierId];
    var slot = el('div', 'save-slot');
    slot.style.borderLeft = '3px solid ' + (ch ? ch.color : '#7d8aa8');
    var head = el('div', 'save-head');
    head.appendChild(el('div', 'save-ch', ch ? ch.name : run.charId));
    head.appendChild(el('div', 'save-wave',
      (tier ? tier.name : '第 ' + run.tierId + ' 层') + ' · 第 ' + (run.sublevel || 1) + ' / 16 小关 · ' + fmtTime(run.runTime || 0) +
      (run.pendingLevels ? ' · 待升级 ×' + run.pendingLevels : '')));
    slot.appendChild(head);
    var grid = el('div', 'save-grid');
    grid.appendChild(saveStat('等级', run.level || 1));
    grid.appendChild(saveStat('材料', run.materials || 0));
    grid.appendChild(saveStat('击杀', (run.stats && run.stats.kills) || 0));
    grid.appendChild(saveStat('构筑', (run.carried && run.carried.weapons.length) + ' 武 · ' +
      ((run.carried && run.carried.items.length) || 0) + ' 装 · ' +
      ((run.carried && run.carried.bag.length) || 0) + ' 背包'));
    slot.appendChild(grid);
    var btnRow = el('div', 'save-btns');
    var bContinue = el('button', 'btn btn-primary', '继续');
    bContinue.addEventListener('click', function () {
      G.Audio.sfx('confirm');
      var data = G.Save.getRun(); if (!data) return;
      G.Audio.unlock(); G.Audio.setBgm(G.Save.getSettings().bgm);
      if (!G.game.resumeRun(data)) { G.Save.clearRun(); G.UI.renderSubSave(); }
    });
    var bErase = el('button', 'btn', '抹除');
    bErase.addEventListener('click', function () {
      G.Audio.sfx('back');
      G.Save.clearRun();
      var rb = $('btnResumeRun'); if (rb) rb.classList.add('hidden');
      G.UI.renderSubSave();
    });
    btnRow.appendChild(bContinue);
    btnRow.appendChild(bErase);
    slot.appendChild(btnRow);
    host.appendChild(slot);
  };

  function saveStat(k, v) {
    var c = el('div', 'save-stat');
    c.appendChild(el('div', 'save-stat-v', String(v)));
    c.appendChild(el('div', 'save-stat-k', k));
    return c;
  }

  /* 整备 / 市场内的按钮行为（由 11_main 绑定，这里兜底） */
  var expandBtn = $('btnBaseExpand');
  if (expandBtn) {
    expandBtn.addEventListener('click', function () {
      var r = G.Meta.expandStash();
      if (!r.ok) { G.UI.flashText(expandBtn, r.msg); return; }
      G.Audio.sfx('buy');
      G.UI.renderBase();
    });
  }
  var refreshBtn = $('btnMarketRefresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      var cost = G.Market.refreshCost();
      if (!G.Meta.spend(cost)) { G.UI.flashText(refreshBtn, '深渊币不足'); return; }
      var tier = Math.max(1, G.Meta.stats().bestTier || 1);
      G.Market.refresh(tier, 0);
      G.Audio.sfx('reroll');
      G.UI.renderMarket();
    });
  }
  var btnBaseMarket = $('btnBaseMarket');
  if (btnBaseMarket) {
    btnBaseMarket.addEventListener('click', function () {
      G.UI.renderMarket();
      G.UI.showScreen('scrMarket');
    });
  }
  var btnBaseMap = $('btnBaseMap');
  if (btnBaseMap) {
    btnBaseMap.addEventListener('click', function () {
      if (!G.UI._selectedChar) {
        G.UI.flashText(btnBaseMap, '先点「探索深渊」选择角色');
        return;
      }
      G.UI.renderMapSelect();
      G.UI.showScreen('scrMapSelect');
    });
  }
  var btnBagClose = $('btnBagClose');
  if (btnBagClose) btnBagClose.addEventListener('click', function () { G.UI.toggleBag(); });

})();
