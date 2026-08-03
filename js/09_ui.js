/* ============================================================
   09_ui.js —— 全部 DOM 界面
   ============================================================ */
'use strict';

(function () {

  var UI = {};
  G.UI = UI;

  var $ = G.$, el = G.el;
  var tipEl;

  /* ---- 特殊效果信息表（HUD 状态栏 / 结算用） ---- */
  var SP_INFO = {
    burnOnHit:   { sym: '燃', col: '#ff8a3a', name: '命中灼烧', desc: '命中敌人有几率附加灼烧伤害' },
    chainOnHit:  { sym: '链', col: '#8fe8ff', name: '命中连锁', desc: '命中敌人有几率连锁闪电' },
    frostAura:   { sym: '冰', col: '#8fe8ff', name: '冰霜光环', desc: '周围敌人持续减速' },
    poisonAura:  { sym: '毒', col: '#7ee06a', name: '剧毒光环', desc: '周围敌人持续中毒' },
    explodeOnKill:{ sym: '爆', col: '#ff6b3a', name: '爆破协议', desc: '击杀时引发范围爆炸' },
    revive:      { sym: '生', col: '#6ee787', name: '不屈', desc: '生命归零时复活一次' },
    execute:     { sym: '斩', col: '#ff4a4a', name: '处决', desc: '对低血量敌人造成额外伤害' },
    critExplode: { sym: '星', col: '#ffd24a', name: '暴击新星', desc: '暴击时引发爆炸' },
    poisonOnHit: { sym: '毒', col: '#7ee06a', name: '淬毒', desc: '命中敌人有几率中毒' },
    thunderAura: { sym: '雷', col: '#c9a6ff', name: '雷霆光环', desc: '周期性释放连锁闪电' },
    critSlow:    { sym: '缓', col: '#ff9ad0', name: '暴击迟滞', desc: '暴击使目标减速' },
    leechOnKill: { sym: '噬', col: '#ff5fa8', name: '噬魂', desc: '击杀敌人回复生命' }
  };
  function collectSp(p) {
    var out = [];
    for (var k in SP_INFO) if (p.hasSp(k)) out.push(k);
    return out;
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  /* ------------------------------------------------------------
     通用：屏幕切换
     ------------------------------------------------------------ */
  var SCREENS = ['scrTitle', 'scrCharSelect', 'scrShop', 'scrLevel', 'scrPause', 'scrResult', 'scrSettings', 'scrRecords', 'scrAch', 'scrSave'];
  UI.showScreen = function (id) {
    var ov = $('overlay');
    SCREENS.forEach(function (s) { $(s).classList.toggle('on', s === id); });
    ov.classList.toggle('on', !!id);
    UI.hideTip();
    // 标题 / 子页（记录·成就·存档）需要刷新数据
    if (id === 'scrTitle' || id === 'scrRecords' || id === 'scrAch' || id === 'scrSave') {
      UI.renderSubPanels();
    }
    // 标题界面时，依据续局存档是否存在显示「继续游戏」
    if (id === 'scrTitle') {
      var rb = $('btnResumeRun');
      if (rb) rb.classList.toggle('hidden', !G.Save.getRun());
    }
    // 菜单漩涡背景：轮盘随界面启停；封面背景现为 AI 生成的静态图（assets/cover.png）
    if (id === 'scrCharSelect') {
      UI._vortex('wheel').start();
    } else {
      UI._vortex('wheel').stop();
    }
    // 旧的封面 vortex 引用（已移除 coverBg canvas，启动空操作）
    if (UI._vortex && UI._vortex('cover')) {
      // 停掉可能存在的老 daemon
      var v = UI._vortices && UI._vortices['cover']; if (v) v.stop();
    }
  };

  /* ------------------------------------------------------------
     子页：记录 / 成就 / 存档（从封面点开，不在封面上直接展示）
     ------------------------------------------------------------ */
  UI.renderSubPanels = function () {
    if (!($('recBody') && $('achBody') && $('saveBody'))) return;   // 缺节点则跳过（无头环境）
    UI.renderSubRecords();
    UI.renderSubAch();
    UI.renderSubSave();
  };

  /* ------------------------------------------------------------
     商店
     ------------------------------------------------------------ */
  UI.renderShop = function (g) {
    var p = g.player, S = G.Shop;
    $('shopWave').textContent = '第 ' + (g.wave - 1) + ' 波结束　下一波：第 ' + g.wave + ' 波 · ' +
      ((G.WAVES[g.wave - 1] || {}).label || '');
    $('shopMat').textContent = g.materials;
    $('rerollCost').textContent = S.rerollCost();
    $('btnReroll').disabled = g.materials < S.rerollCost();
    $('btnNextWave').textContent = g.wave > G.MAX_WAVE ? '完成' : '进入第 ' + g.wave + ' 波 →';

    /* --- 商品卡 --- */
    var box = $('shopCards');
    box.innerHTML = '';
    S.offers.forEach(function (o, i) {
      var col = o.kind === 'weapon'
        ? (o.tier === 0 ? '#d9dde8' : G.rarityColor(o.tier))
        : G.rarityColor(o.def.r);
      var card = el('div', 'card' + (o.sold ? ' sold' : ''));
      card.style.setProperty('--rc', col);

      var head = el('div', 'card-head');
      var ic = el('div', 'card-icon');
      ic.appendChild(G.PX.node(o.kind === 'weapon'
        ? G.weaponIcon(o.def, o.tier, 4)
        : G.itemIcon(o.def, 4)));
      head.appendChild(ic);
      var nm = el('div');
      nm.appendChild(el('div', 'card-name', o.def.name));
      nm.appendChild(el('div', 'card-type',
        (o.kind === 'weapon' ? '武器 · ' : '物品 · ') + G.rarityName(o.kind === 'weapon' ? o.tier : o.def.r)));
      head.appendChild(nm);
      card.appendChild(head);

      var body = el('div', 'card-mods');
      if (o.kind === 'weapon') {
        var tmp = { def: o.def, tier: o.tier };
        body.innerHTML = '<div class="p">伤害 ' + G.fmt(G.wDamage(tmp), 1) +
          '　冷却 ' + G.fmt(G.wCooldown(tmp), 2) + 's</div>' +
          '<div class="p">射程 ' + Math.round(o.def.range) + '</div>' +
          modsHtml(G.weaponMods(o.def, o.tier) || {});
      } else {
        body.innerHTML = modsHtml(o.def.mods || {}, o.def.sp, o.def.spTxt);
      }
      card.appendChild(body);
      if (o.kind === 'weapon') {
        card.appendChild(el('div', 'card-dmgattr', '伤害加成 · ' + G.F.damageAttrText(o.def.tags)));
      }
      card.appendChild(el('div', 'card-flavor', o.kind === 'weapon' ? o.def.desc : (o.def.fl || '')));

      var foot = el('div', 'card-foot');
      var buy = el('button', 'btn card-buy' + (g.materials < o.price ? ' poor' : ''),
        o.sold ? '已购买' : ('购买 · ' + o.price));
      buy.disabled = o.sold;
      buy.addEventListener('click', function () {
        var r = G.Shop.buy(i, p);
        if (!r.ok) { flashMsg(buy, r.msg); return; }
        // 成功反馈：卡片脉冲 + DOM 粒子爆发（音效已在 Shop.buy 内播放）
        card.classList.add('buy-pop');
        var cr = card.getBoundingClientRect();
        UI.burstDom(cr.left + cr.width / 2, cr.top + cr.height / 2, '#ffd24a', 10);
        setTimeout(function () { UI.renderShop(g); }, 230);
      });
      foot.appendChild(buy);

      var lock = el('button', 'btn card-lock' + (o.locked ? ' on' : ''), o.locked ? '🔒' : '🔓');
      lock.title = '锁定后重掷不会替换';
      lock.addEventListener('click', function () { o.locked = !o.locked; UI.renderShop(g); });
      foot.appendChild(lock);
      card.appendChild(foot);

      bindTip(card, function () {
        return o.kind === 'weapon' ? weaponTip(o.def, o.tier) : itemTip(o.def);
      });
      box.appendChild(card);
    });

    /* --- 我的武器 --- */
    $('wpnCount').textContent = p.weapons.length + '/' + p.maxWeapons;
    var wg = $('invWeapons');
    wg.innerHTML = '';
    p.weapons.forEach(function (w, i) {
      var cell = el('div', 'inv-cell');
      cell.style.borderColor = w.tier === 0 ? '#333a52' : G.rarityColor(w.tier);
      cell.appendChild(G.PX.node(G.weaponIcon(w.def, w.tier, 2)));
      bindTip(cell, function () {
        return weaponTip(w.def, w.tier) +
          '<div style="margin-top:6px;color:#ffd24a">点击出售 · +' +
          G.weaponSell(w.def, w.tier, G.Shop.wave) + '</div>';
      });
      cell.addEventListener('click', function () { G.Shop.sellWeapon(i, p); UI.renderShop(g); });
      wg.appendChild(cell);
    });
    for (var k = p.weapons.length; k < p.maxWeapons; k++) wg.appendChild(el('div', 'inv-cell empty'));

    /* --- 我的物品 --- */
    $('itemCount').textContent = p.items.length;
    var ig = $('invItems');
    ig.innerHTML = '';
    p.items.forEach(function (it, i) {
      var cell = el('div', 'inv-cell');
      cell.style.borderColor = G.rarityColor(it.r);
      cell.appendChild(G.PX.node(G.itemIcon(it, 2)));
      bindTip(cell, function () {
        return itemTip(it) + '<div style="margin-top:6px;color:#ffd24a">点击出售 · +' +
          G.sellPrice(it, G.Shop.wave) + '</div>';
      });
      cell.addEventListener('click', function () { G.Shop.sellItem(i, p); UI.renderShop(g); });
      ig.appendChild(cell);
    });

    UI.renderStats($('sideStats'), p);
  };

  function flashMsg(btn, msg) {
    var old = btn.textContent;
    btn.textContent = msg;
    btn.style.borderColor = '#ff6b6b';
    setTimeout(function () { btn.textContent = old; btn.style.borderColor = ''; }, 900);
  }

  /* ------------------------------------------------------------
     升级
     ------------------------------------------------------------ */
  UI.renderLevelUp = function (g, opts, onPick) {
    var p = g.player;
    $('lvSub').textContent = 'Lv.' + p.level + '　剩余 ' + p.pendingLevels + ' 次选择';
    var box = $('lvOptions');
    box.innerHTML = '';
    opts.forEach(function (o) {
      var d = G.STAT_MAP[o.key];
      var card = el('div', 'lv-opt' + (o.trade ? ' lv-trade' : ''));
      card.appendChild(el('div', 'n', d.name));
      card.appendChild(el('div', 'd', G.modText(o.key, o.val)));
      if (o.negKey) {
        var nd = G.STAT_MAP[o.negKey];
        card.appendChild(el('div', 'dn', '− ' + nd.name + ' ' + G.modText(o.negKey, -o.negVal)));
      }
      card.appendChild(el('div', 'x', d.desc));
      card.addEventListener('click', function () {
        if (card.classList.contains('picked')) return;
        card.classList.add('picked');
        var r = card.getBoundingClientRect();
        UI.burstDom(r.left + r.width / 2, r.top + r.height / 2, o.trade ? '#ff9a9a' : '#ffd24a', 12);
        G.Audio.sfx('levelup');
        setTimeout(function () { onPick(o); }, 240);   // 让选中动画/粒子播放完再应用
      });
      box.appendChild(card);
    });
  };

  /* DOM 粒子爆发（购买 / 升级确认等界面内反馈，非画布） */
  UI.burstDom = function (cx, cy, color, n) {
    n = n || 8;
    for (var i = 0; i < n; i++) {
      var p = el('div', 'dom-particle');
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = color;
      p.style.color = color;   // 供 box-shadow: currentColor 上色辉光
      var ang = Math.random() * Math.PI * 2;
      var dist = 34 + Math.random() * 54;
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      document.body.appendChild(p);
      (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 620); })(p);
    }
  };

  /* ------------------------------------------------------------
     结算时评定成就 + 扩展记录（在提交最高分之后调用，确保 stats 已落库）
     返回本次「新解锁」的成就数组
     ------------------------------------------------------------ */
  UI.evaluateEnd = function (g, p, win) {
    var t = g.runTime || 0;
    var dps = t > 0 ? p.stats.dmgDealt / t : 0;
    var s = G.Save.getStats();

    // 累计 / 最高类记录
    G.Save.addStats({ totalRuns: 1, totalKills: p.stats.kills, wins: win ? 1 : 0 });
    G.Save.setStats({ bestCombo: p.stats.comboMax, bestDps: Math.round(dps) });
    if (win) G.Save.setStats({ fastestWin: Math.round(t) });

    // 通关则标记职业并判定「全职业通关」
    if (win) {
      G.Save.markCharWon(p.char.id);
      var won = G.Save.getStats().charsWon;
      var all = G.CHARACTERS.every(function (c) { return won[c.id]; });
      if (all) G.Save.unlockAch('collector');
    }

    // 逐条评定成就
    var checks = {
      first_dive:   g.wave >= 2,
      halfway:      g.wave >= 10,
      conqueror:    win,
      slayer100:    p.stats.kills >= 100,
      elite_hunter: p.stats.eliteKills >= 5,
      boss_slayer:  p.stats.bossKills >= 2,
      combo_master: p.stats.comboMax >= 30,
      annihilator:  dps >= 5000,
      ascetic:      win && p.items.length === 0,
      speedrun:     win && t <= 600,
      tycoon:       p.stats.matEarned >= 500
    };
    var unlocked = [];
    for (var id in checks) {
      if (checks[id] && G.Save.unlockAch(id)) unlocked.push(id);
    }
    return unlocked;
  };

  /* ------------------------------------------------------------
     结算
     ------------------------------------------------------------ */
  UI.showResult = function (g, win) {
    var p = g.player;
    var rec = G.Save.submit(g.wave, p.stats.kills, win);
    $('resultTitle').textContent = win ? '深渊已被清空' : '你倒下了';
    $('resultTitle').style.color = win ? '#ffd24a' : '#ff6b6b';
    $('resultSub').textContent = win
      ? '20 波全部通过 —— 这套构筑成立了。'
      : '倒在第 ' + g.wave + ' 波。下一次换个思路。';

    var t = g.runTime || 0;
    var dps = t > 0 ? Math.round(p.stats.dmgDealt / t) : 0;
    var best = G.Save.get();
    var star = function (b) { return b ? '　★ 新纪录' : ''; };

    // 评定成就与扩展记录（在提交最高分之后）
    var newAch = UI.evaluateEnd(g, p, win);

    var rows = [
      ['角色', p.char.name],
      ['抵达波次', g.wave + ' / ' + G.MAX_WAVE + star(rec.newWave)],
      ['等级', 'Lv.' + p.level],
      ['存活时间', fmtTime(t)],
      ['击杀数', p.stats.kills + star(rec.newKills)],
      ['精英击杀', p.stats.eliteKills],
      ['BOSS 击杀', p.stats.bossKills],
      ['最高连击', p.stats.comboMax + ' 连'],
      ['DPS', dps.toLocaleString()],
      ['累计伤害', Math.round(p.stats.dmgDealt).toLocaleString()],
      ['累计材料', Math.round(p.stats.matEarned)],
      ['武器 / 物品', p.weapons.length + ' / ' + p.items.length],
      ['历史最佳', '第 ' + best.bestWave + ' 波 · ' + best.bestKills + ' 击杀']
    ];
    if (newAch.length) {
      var names = newAch.map(function (id) {
        var a = G.ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0];
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
    UI.showScreen('scrResult');
  };

})();
