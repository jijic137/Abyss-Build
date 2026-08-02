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
    critSlow:    { sym: '缓', col: '#ff9ad0', name: '暴击迟滞', desc: '暴击使目标减速' }
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
  var SCREENS = ['scrTitle', 'scrShop', 'scrLevel', 'scrPause', 'scrResult', 'scrSettings'];
  UI.showScreen = function (id) {
    var ov = $('overlay');
    SCREENS.forEach(function (s) { $(s).classList.toggle('on', s === id); });
    ov.classList.toggle('on', !!id);
    UI.hideTip();
    // 标题界面时，依据续局存档是否存在显示「继续游戏」
    if (id === 'scrTitle') {
      var rb = $('btnResumeRun');
      if (rb) rb.classList.toggle('hidden', !G.Save.getRun());
    }
  };

  // 判断某屏是否处于显示态（用于 ESC 等键盘逻辑判断）
  UI.isScreenOn = function (id) { return $(id).classList.contains('on'); };

  // 从指定界面打开设置（title=标题，pause=对局内暂停），关闭时回到原界面
  UI.openSettings = function (from) {
    UI._settingsFrom = (from === 'pause') ? 'scrPause' : 'scrTitle';
    UI.showScreen('scrSettings');
  };
  UI.closeSettings = function () {
    UI.showScreen(UI._settingsFrom || 'scrTitle');
  };

  /* ------------------------------------------------------------
     Tooltip
     ------------------------------------------------------------ */
  UI.showTip = function (html, x, y) {
    if (!tipEl) tipEl = $('tooltip');
    tipEl.innerHTML = html;
    tipEl.classList.remove('hidden');
    var w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var px = G.clamp(x + 16, 6, window.innerWidth - w - 6);
    var py = G.clamp(y - h - 12, 6, window.innerHeight - h - 6);
    tipEl.style.left = px + 'px';
    tipEl.style.top = py + 'px';
  };
  UI.hideTip = function () {
    if (!tipEl) tipEl = $('tooltip');
    tipEl.classList.add('hidden');
  };
  function bindTip(node, htmlFn) {
    node.addEventListener('mouseenter', function (e) { UI.showTip(htmlFn(), e.clientX, e.clientY); });
    node.addEventListener('mousemove', function (e) { UI.showTip(htmlFn(), e.clientX, e.clientY); });
    node.addEventListener('mouseleave', UI.hideTip);
  }

  /* ------------------------------------------------------------
     属性增量 → HTML
     ------------------------------------------------------------ */
  function modsHtml(mods, sp, spTxt) {
    var pos = [], neg = [];
    for (var k in mods) {
      var v = mods[k];
      if (Math.abs(v) < 0.001) continue;
      var s = G.statName(k) + ' ' + G.modText(k, v);
      (v > 0 ? pos : neg).push(s);
    }
    var h = '';
    pos.forEach(function (s) { h += '<div class="p">' + s + '</div>'; });
    neg.forEach(function (s) { h += '<div class="n">' + s + '</div>'; });
    if (sp && spTxt) h += '<div class="sp">◆ ' + spTxt + '</div>';
    return h;
  }
  UI.modsHtml = modsHtml;

  function itemTip(def) {
    return '<div class="tt-name" style="color:' + G.rarityColor(def.r) + '">' + def.name +
      ' <span style="font-size:11px;opacity:.7">' + G.rarityName(def.r) + '</span></div>' +
      modsHtml(def.mods || {}, def.sp, def.spTxt) +
      (def.fl ? '<div class="tt-f">' + def.fl + '</div>' : '');
  }
  function weaponTip(def, tier) {
    var col = tier === 0 ? '#d9dde8' : G.rarityColor(tier);
    var tmp = { def: def, tier: tier };
    var dmg = G.wDamage(tmp), cd = G.wCooldown(tmp);
    var tagName = { melee: '近战', ranged: '远程', elemental: '元素', engineering: '工程' };
    var tags = def.tags.map(function (t) { return tagName[t] || t; }).join(' / ');
    var h = '<div class="tt-name" style="color:' + col + '">' + def.name +
      ' <span style="font-size:11px;opacity:.7">' + G.rarityName(tier) + '</span></div>' +
      '<div style="font-size:11px;color:#8a90a8;margin-bottom:4px">' + tags + '</div>' +
      '<div class="p">基础伤害 ' + G.fmt(dmg, 1) + '</div>' +
      '<div class="p">冷却 ' + G.fmt(cd, 2) + 's　射程 ' + Math.round(def.range) + '</div>';
    var m = G.weaponMods(def, tier);
    if (m) h += modsHtml(m);
    h += '<div class="tt-f">' + def.desc + '</div>';
    return h;
  }
  UI.itemTip = itemTip;
  UI.weaponTip = weaponTip;

  /* ------------------------------------------------------------
     角色选择
     ------------------------------------------------------------ */
  UI.renderCharSelect = function (onPick) {
    var box = $('charSelect');
    box.innerHTML = '';
    G.CHARACTERS.forEach(function (ch, i) {
      var card = el('div', 'char-card' + (i === 0 ? ' sel' : ''));
      card.appendChild(G.PX.node(G.PX.get(ch.sprite, 4)));
      card.appendChild(el('div', 'char-name', ch.name));
      card.appendChild(el('div', 'char-desc', ch.desc));
      var wpn = G.WEAPON_MAP[ch.startWeapon];
      card.appendChild(el('div', 'char-mods',
        modsHtml(ch.mods) +
        '<div style="color:#8a90a8;margin-top:4px">起始武器：' + wpn.name + '</div>'));
      card.addEventListener('click', function () {
        Array.prototype.forEach.call(box.children, function (n) { n.classList.remove('sel'); });
        card.classList.add('sel');
        onPick(ch);
      });
      box.appendChild(card);
    });
    onPick(G.CHARACTERS[0]);
  };

  /* ------------------------------------------------------------
     HUD
     ------------------------------------------------------------ */
  UI.initHud = function () { $('hud').classList.remove('hidden'); };

  UI.updateHud = function (g) {
    var p = g.player;
    if (!p) return;
    var pct = G.clamp(p.hp / p.st.maxHp, 0, 1);
    $('hpFill').style.width = (pct * 100) + '%';
    $('hpText').textContent = Math.ceil(p.hp) + ' / ' + Math.round(p.st.maxHp);
    $('chipArmor').textContent = '护甲 ' + Math.round(p.st.armor) +
      '（-' + Math.round((1 - G.F.armorMul(p.st.armor)) * 100) + '%）';
    $('chipDodge').textContent = '闪避 ' + Math.round(G.F.dodgeChance(p.st.dodge) * 100) + '%';
    $('chipSpd').textContent = '速度 ' + Math.round(100 + p.st.speed) + '%';

    $('waveLabel').textContent = '第 ' + g.wave + ' / ' + G.MAX_WAVE + ' 波';
    $('waveTimer').textContent = Math.max(0, Math.ceil(g.waveTime));
    var dur = g.waveDur || 1;
    $('waveProg').style.width = G.clamp((1 - g.waveTime / dur), 0, 1) * 100 + '%';
    $('waveSub').textContent = (G.WAVES[g.wave - 1] || {}).label || '生存';
    $('comboLabel').textContent = g.combo >= 2 ? (g.combo + ' 连击') : '';

    $('matText').textContent = g.materials;
    var xr = G.clamp(p.xp / p.xpNeed, 0, 1);
    $('xpFill').style.width = (xr * 100) + '%';
    $('xpText').textContent = 'Lv.' + p.level;

    // 武器栏
    var bar = $('weaponBar');
    if (bar.childElementCount !== p.weapons.length || bar.dataset.sig !== wsig(p)) {
      bar.innerHTML = '';
      bar.dataset.sig = wsig(p);
      p.weapons.forEach(function (w) {
        var s = el('div', 'wslot');
        s.style.borderColor = w.tier === 0 ? '#333a52' : G.rarityColor(w.tier);
        s.appendChild(G.PX.node(G.weaponIcon(w.def, w.tier, 3)));
        var cd = el('div', 'cd'); s.appendChild(cd);
        s._cd = cd; s._w = w;
        bindTip(s, function () { return weaponTip(w.def, w.tier); });
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

    // 状态效果栏（玩家持有的特殊效果）
    var sbar = $('statusBar');
    var spList = collectSp(p);
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
        bindTip(c, function () {
          return '<div class="tt-name" style="color:' + info.col + '">' + info.name +
            '</div><div style="color:#8a90a8">' + info.desc + '</div>';
        });
        sbar.appendChild(c);
      });
    }

    // BOSS 血条
    var boss = g.enemies.find(function (e) { return e.def.boss && !e.dead; });
    var bw = $('bossBarWrap');
    if (boss) {
      bw.classList.remove('hidden');
      $('bossName').textContent = boss.def.name + '　第 ' + boss.phase + ' 阶段';
      $('bossFill').style.width = G.clamp(boss.hp / boss.maxHp, 0, 1) * 100 + '%';
    } else bw.classList.add('hidden');
  };

  function wsig(p) {
    return p.weapons.map(function (w) { return w.defId + w.tier; }).join(',');
  }

  UI.banner = function (txt, col) {
    var b = $('waveBanner');
    b.textContent = txt;
    b.style.color = col || '#fff';
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  };

  /* ------------------------------------------------------------
     属性面板
     ------------------------------------------------------------ */
  UI.renderStats = function (host, p) {
    host.innerHTML = '';
    var groups = {};
    G.STAT_DEFS.forEach(function (d) {
      (groups[d.group] = groups[d.group] || []).push(d);
    });
    ['生存', '输出', '机动', '增益'].forEach(function (gname) {
      var head = el('div', 'stat-panel-title', gname);
      head.style.marginTop = '8px';
      host.appendChild(head);
      groups[gname].forEach(function (d) {
        var v = p.st[d.key];
        var base = d.base;
        var row = el('div', 'stat-row');
        row.appendChild(el('span', 'k', d.name));
        var vs = el('span', 'v', G.statText(d.key, v));
        if (v > base) vs.style.color = '#6ee787';
        else if (v < base) vs.style.color = '#ff6b6b';
        row.appendChild(vs);
        bindTip(row, function () {
          return '<div class="tt-name">' + d.name + '</div><div style="color:#8a90a8">' + d.desc + '</div>';
        });
        host.appendChild(row);
      });
    });
  };

  UI.toggleStatPanel = function (p) {
    var el2 = $('statPanel');
    var hid = el2.classList.contains('hidden');
    if (hid) UI.renderStats($('statPanelBody'), p);
    el2.classList.toggle('hidden');
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
