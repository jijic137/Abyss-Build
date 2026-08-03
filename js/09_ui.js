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
    // 菜单漩涡背景：轮盘随界面启停；封面背景为 AI 生成的静态图（assets/cover.png）
    if (id === 'scrCharSelect') {
      UI._vortex('wheel').start();
    } else {
      UI._vortex('wheel').stop();
    }
    // 停掉封面旧 vortex daemon（若存在；封面 canvas 已移除，此处仅作兜底）
    if (UI._vortex) {
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
     子页：记录 / 成就 / 存档（从封面点开，不在封面上直接展示）
     ------------------------------------------------------------ */
  UI.renderSubPanels = function () {
    if (!($('recBody') && $('achBody') && $('saveBody'))) return;   // 缺节点则跳过（无头环境）
    UI.renderSubRecords();
    UI.renderSubAch();
    UI.renderSubSave();
  };

  UI.renderSubRecords = function () {
    var d = G.Save.get();
    var s = d.stats;
    var won = 0; for (var k in s.charsWon) if (s.charsWon[k]) won++;
    var rows = [
      ['历史最佳波次', d.bestWave + ' / ' + G.MAX_WAVE],
      ['历史最多击杀', d.bestKills],
      ['总场次', s.totalRuns],
      ['通关次数', s.wins],
      ['累计击杀', s.totalKills],
      ['最高连击', s.bestCombo + ' 连'],
      ['最高 DPS', s.bestDps ? s.bestDps.toLocaleString() : '—'],
      ['最快通关', s.fastestWin ? fmtTime(s.fastestWin) : '—'],
      ['已通关职业', won + ' / ' + G.CHARACTERS.length]
    ];
    var host = $('recBody'); host.innerHTML = '';
    rows.forEach(function (r) {
      var row = el('div', 'rec-row');
      row.appendChild(el('span', 'rec-k', r[0]));
      row.appendChild(el('span', 'rec-v', String(r[1])));
      host.appendChild(row);
    });
  };

  UI.renderSubAch = function () {
    var got = G.Save.getAch();
    var host = $('achBody'); host.innerHTML = '';
    var cnt = 0; G.ACHIEVEMENTS.forEach(function (a) { if (got[a.id]) cnt++; });
    host.appendChild(el('div', 'ach-count', '已解锁 ' + cnt + ' / ' + G.ACHIEVEMENTS.length));
    var grid = el('div', 'ach-grid');
    G.ACHIEVEMENTS.forEach(function (a) {
      var unlocked = !!got[a.id];
      var tile = el('div', 'ach-tile' + (unlocked ? ' got' : ''));
      tile.appendChild(el('div', 'ach-ico', unlocked ? a.icon : '?'));
      var txt = el('div', 'ach-txt');
      txt.appendChild(el('div', 'ach-name', a.name));
      txt.appendChild(el('div', 'ach-desc', a.desc));
      tile.appendChild(txt);
      grid.appendChild(tile);
    });
    host.appendChild(grid);
  };

  UI.renderSubSave = function () {
    var host = $('saveBody'); host.innerHTML = '';
    var run = G.Save.getRun();
    if (!run) {
      var empty = el('div', 'save-empty', '暂无进行中的存档。<br>每通过一波会自动保存，可在此继续或抹除。');
      empty.style.padding = '40px 8px';
      host.appendChild(empty);
      return;
    }
    var ch = G.CHAR_BY_ID[run.charId];
    var chCol = ch ? (ch.color || '#7d8aa8') : '#7d8aa8';
    var st = run.stats || {};
    var slot = el('div', 'save-slot');
    slot.style.borderLeft = '3px solid ' + chCol;

    // 头部：职业 + 波次/时间
    var head = el('div', 'save-head');
    head.appendChild(el('div', 'save-ch', ch ? ch.name : run.charId));
    head.appendChild(el('div', 'save-wave',
      '第 ' + run.wave + ' / ' + G.MAX_WAVE + ' 波 · ' + fmtTime(run.runTime || 0) +
      (run.pendingLevels ? ' · 待升级 ×' + run.pendingLevels : '')));
    slot.appendChild(head);

    // 波次进度条
    var prog = el('div', 'save-prog');
    var bar = el('div', 'save-prog-bar');
    bar.style.width = Math.round(G.clamp(run.wave / G.MAX_WAVE, 0, 1) * 100) + '%';
    prog.appendChild(bar);
    slot.appendChild(prog);

    // 战局摘要
    var grid = el('div', 'save-grid');
    grid.appendChild(saveStat('击杀', st.kills || 0));
    grid.appendChild(saveStat('等级', run.level || 1));
    grid.appendChild(saveStat('材料', run.materials || 0));
    grid.appendChild(saveStat('精英', st.eliteKills || 0));
    grid.appendChild(saveStat('构筑', (run.weapons || []).length + ' 武 · ' + (run.items || []).length + ' 物'));
    grid.appendChild(saveStat('最高连击', st.comboMax || 0));
    slot.appendChild(grid);

    // 构筑摘要（首 3 把武器）
    var ws = (run.weapons || []).slice(0, 3);
    if (ws.length) {
      var build = el('div', 'save-build');
      build.appendChild(el('div', 'save-build-t', '武器'));
      var wrow = el('div', 'save-build-row');
      ws.forEach(function (w) {
        var d = G.WEAPON_MAP[w.defId] || G.WEAPONS.find(function (x) { return x.id === w.defId; });
        if (!d) return;
        var tag = el('span', 'save-wtag');
        tag.style.borderColor = w.tier === 0 ? '#3a4158' : G.rarityColor(w.tier);
        tag.style.color = w.tier === 0 ? '#c6cde0' : G.rarityColor(w.tier);
        tag.textContent = d.name;
        wrow.appendChild(tag);
      });
      if (ws.length > 3) wrow.appendChild(el('span', 'save-wtag more', '+' + (ws.length - 3)));
      build.appendChild(wrow);
      slot.appendChild(build);
    }

    var btnRow = el('div', 'save-btns');
    var bContinue = el('button', 'btn btn-primary', '继续');
    bContinue.addEventListener('click', function () {
      G.Audio.sfx('confirm');
      var data = G.Save.getRun(); if (!data) return;
      G.Audio.unlock(); G.Audio.setBgm(G.Save.getSettings().bgm);
      if (!G.game.resumeRun(data)) { G.Save.clearRun(); UI.renderSubSave(); }
    });
    var bErase = el('button', 'btn', '抹除');
    bErase.addEventListener('click', function () {
      G.Audio.sfx('back');
      G.Save.clearRun();
      var rb = $('btnResumeRun'); if (rb) rb.classList.add('hidden');
      UI.renderSubSave();
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
    h += '<div class="tt-attr">伤害加成 · ' + G.F.damageAttrText(def.tags) + '（额外受全局「伤害%」影响）</div>';
    h += '<div class="tt-f">' + def.desc + '</div>';
    return h;
  }
  UI.itemTip = itemTip;
  UI.weaponTip = weaponTip;

  /* ------------------------------------------------------------
     漩涡背景动画（封面 / 轮盘共用）
     requestAnimationFrame 驱动；无头 / 无 canvas 时自动降级为静默
     ------------------------------------------------------------ */
  var Vortex = (function () {
    function nowMs() {
      if (typeof performance !== 'undefined' && performance.now) return performance.now();
      return Date.now();
    }
    function mix(c1, c2, t) {
      var a = G.PX.hex2rgb(c1), b = G.PX.hex2rgb(c2);
      return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
        Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
        Math.round(a[2] + (b[2] - a[2]) * t) + ')';
    }
    function Inst(canvas, opt) {
      opt = opt || {};
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.count = opt.count || 200;
      this.hue = opt.hue || '#3f7dff';
      this.base = opt.speed || 1;
      this.alpha = (opt.alpha == null) ? 1 : opt.alpha;
      this.coreBoost = opt.coreBoost || 1;
      this.parts = [];
      this.spin = Math.random() * Math.PI * 2;
      this.pulse = 0;
      this.running = false;
      this.w = 1; this.h = 1; this.dpr = 1;
      this._raf = null;
      if (this.ctx) { this.resize(); this._seed(); }
    }
    Inst.prototype.resize = function () {
      if (!this.ctx) return;
      var c = this.canvas;
      var w = c.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1);
      var h = c.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1);
      this.dpr = Math.min((window.devicePixelRatio || 1), 2);
      c.width = Math.max(1, Math.floor(w * this.dpr));
      c.height = Math.max(1, Math.floor(h * this.dpr));
      this.w = w; this.h = h;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    };
    Inst.prototype._seed = function () {
      this.parts.length = 0;
      for (var i = 0; i < this.count; i++) this.parts.push(this._mk(true));
    };
    Inst.prototype._mk = function (any) {
      return {
        a: Math.random() * Math.PI * 2,
        r: any ? Math.random() : 1,
        sp: 0.4 + Math.random() * 0.9,
        vr: 0.05 + Math.random() * 0.10,
        sz: 1.2 + Math.random() * 2.4,
        tw: Math.random() * Math.PI * 2,
        gold: Math.random() < 0.08
      };
    };
    Inst.prototype.pulseUp = function () { this.pulse = 1; };
    Inst.prototype.start = function () {
      if (this.running || !this.ctx) return;
      if (typeof requestAnimationFrame !== 'function') return;
      this.running = true;
      var self = this, last = nowMs();
      function step(now) {
        if (!self.running) return;
        var dt = Math.min(0.05, (now - last) / 1000); last = now;
        self.frame(dt || 0.016);
        self._raf = requestAnimationFrame(step);
      }
      self._raf = requestAnimationFrame(step);
    };
    Inst.prototype.stop = function () {
      this.running = false;
      if (this._raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);
      this._raf = null;
    };
    Inst.prototype.frame = function (dt) {
      var ctx = this.ctx; if (!ctx) return;
      var w = this.w, h = this.h, cx = w / 2, cy = h / 2;
      var R = Math.min(w, h) * 0.62;
      this.spin += (0.06 + 0.35 * this.pulse) * this.base * dt;
      this.pulse *= Math.pow(0.9, dt * 60);
      var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
      bg.addColorStop(0, '#0a0e1a');
      bg.addColorStop(0.55, '#070912');
      bg.addColorStop(1, '#04050a');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      var gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
      gl.addColorStop(0, 'rgba(120,160,255,' + ((0.16 + 0.22 * this.pulse) * this.coreBoost) + ')');
      gl.addColorStop(0.5, 'rgba(70,110,220,' + ((0.06 + 0.10 * this.pulse) * this.coreBoost) + ')');
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, w, h);
      var inner = '#e6eeff';
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < this.parts.length; i++) {
        var p = this.parts[i];
        p.a += (p.sp + 0.3) * this.base * (1 + this.pulse * 2.2) * dt;
        p.r -= p.vr * this.base * (1 + this.pulse * 3) * dt;
        p.tw += dt * 4;
        if (p.r <= 0.03) { this.parts[i] = this._mk(false); continue; }
        var ang = p.a + this.spin;
        var rad = p.r * R;
        var x = cx + Math.cos(ang) * rad;
        var y = cy + Math.sin(ang) * rad;
        var m = 1 - p.r;
        var col = p.gold ? mix('#ffd24a', '#fff4cf', m) : mix(this.hue, inner, m * 0.9);
        var sz = p.sz * (0.5 + m * 1.6);
        var tw = 0.6 + 0.4 * Math.sin(p.tw);
        ctx.globalAlpha = (0.12 + 0.6 * m) * tw * this.alpha;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
    return Inst;
  })();

  UI._vortices = {};
  UI._vortex = function (which) {
    if (!UI._vortices[which]) {
      var cv = $('vortex' + (which === 'cover' ? 'Cover' : 'Wheel'));
      UI._vortices[which] = new Vortex(cv, which === 'cover'
        ? { count: 150, hue: '#3f7dff', speed: 0.7, alpha: 0.6, coreBoost: 1.6 }
        : { count: 170, hue: '#6a4bd6', speed: 0.8, alpha: 0.8 });
    }
    return UI._vortices[which];
  };
  if (typeof window !== 'undefined' && !UI._resizeBound) {
    UI._resizeBound = true;
    window.addEventListener('resize', function () {
      UI._vortex('cover').resize();
      UI._vortex('wheel').resize();
      if (UI._wheel && UI._wheel.active) wheelLayout(UI._wheel);
    });
  }

  /* ------------------------------------------------------------
     角色选择 —— 圆形轮盘
     ------------------------------------------------------------ */
  UI._wheel = { active: false };

  function wheelLayout(w) {
    var n = w.chars.length, stage = w.stage;
    var R = Math.max(170, Math.min(300, Math.min(stage.clientWidth, stage.clientHeight) * 0.37));
    for (var i = 0; i < n; i++) {
      var it = w.items[i];
      var va = (((it.base + w.rot) % 360) + 360) % 360;
      var f = Math.cos((va - 180) * Math.PI / 180);
      var half = (f + 1) / 2;
      var scale = 0.6 + 0.45 * half;
      var arcUp = -((1 - f) / 2) * 48;
      it.el.style.transform = 'rotate(' + it.base + 'deg) translateY(' + (-R) + 'px) rotate(' + (-it.base) + 'deg) translateY(' + arcUp + 'px) scale(' + scale + ')';
      it.el.style.opacity = (0.30 + 0.70 * half).toFixed(3);
      it.el.style.zIndex = Math.round(f * 10) + 10;
      it.el.classList.toggle('front', f > 0.92);
    }
    var best = -2, idx = w.selected;
    for (var k = 0; k < n; k++) {
      var vk = (((w.items[k].base + w.rot) % 360) + 360) % 360;
      var fk = Math.cos((vk - 180) * Math.PI / 180);
      if (fk > best) { best = fk; idx = k; }
    }
    if (!w.spinning && idx !== w.selected) {
      w.selected = idx;
      w.onPick(w.chars[idx]);
      updateWheelInfo(w.chars[idx]);
      G.Audio.sfx('select');
      popToken(w.items[idx].token);
      burstAt(stage, w.chars[idx].color);
    }
  }

  function popToken(tok) {
    if (!tok) return;
    tok.classList.remove('pop');
    void tok.offsetWidth;
    tok.classList.add('pop');
  }

  function updateWheelInfo(ch) {
    var box = $('wheelInfo');
    $('wiName').textContent = ch.name;
    $('wiName').style.color = ch.color;
    $('wiName').style.setProperty('--c', ch.color);
    $('wiDesc').textContent = ch.desc;
    $('wiMods').innerHTML = modsHtml(ch.mods);
    var wpn = G.WEAPON_MAP[ch.startWeapon];
    $('wiWeapon').innerHTML = '起始武器：<b style="color:#cfd4e6">' + wpn.name + '</b>';
    box.classList.remove('flash');
    void box.offsetWidth;
    box.classList.add('flash');
  }

  function burstAt(stage, color) {
    var r = stage.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var i = 0; i < 10; i++) {
      var d = document.createElement('div');
      d.className = 'dom-particle';
      d.style.left = cx + 'px';
      d.style.top = cy + 'px';
      d.style.color = color || '#ffd24a';
      d.style.background = color || '#ffd24a';
      var ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 70;
      d.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      d.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      document.body.appendChild(d);
      (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 650); })(d);
    }
  }

  UI.renderCharWheel = function (onPick) {
    var stage = $('wheelStage');
    var ring = $('wheelRing');
    ring.innerHTML = '';
    var chars = G.CHARACTERS, n = chars.length, step = 360 / n;
    var w = UI._wheel;
    w.chars = chars; w.onPick = onPick; w.stage = stage; w.ring = ring;
    w.items = [];
    for (var i = 0; i < n; i++) {
      var ch = chars[i];
      var item = document.createElement('div');
      item.className = 'wheel-item';
      var tok = document.createElement('div');
      tok.className = 'wheel-token';
      tok.style.setProperty('--c', ch.color);
      var spr = G.PX.node(G.PX.get(ch.sprite, 4));
      if (spr) { spr.style.width = '76px'; spr.style.height = '76px'; tok.appendChild(spr); }
      var nm = document.createElement('div');
      nm.className = 'wheel-token-name';
      nm.textContent = ch.name;
      nm.style.color = ch.color;
      tok.appendChild(nm);
      item.appendChild(tok);
      (function (idx, itEl, tokEl) {
        itEl.addEventListener('click', function () { selectWheelIndex(idx); });
        itEl.addEventListener('mouseenter', function () { G.Audio.sfx('hover'); });
      })(i, item, tok);
      ring.appendChild(item);
      w.items.push({ el: item, token: tok, ch: ch, base: i * step });
    }
    w.selected = 0;
    w.targetRot = 180;
    w.rot = 180 + 540;            // 入场旋转动画
    w.spinning = true;            // 入场旋转期间暂不触发选中反馈
    updateWheelInfo(chars[0]);
    onPick(chars[0]);
    UI._wheelActive = true;
    bindWheelInput();
    layoutWheelStart();
  };

  function selectWheelIndex(idx) {
    var w = UI._wheel; if (!w.items) return;
    w.spinning = false;
    var step = 360 / w.chars.length;
    var desired = 180 - w.items[idx].base;
    while (desired - w.rot > 180) desired -= 360;
    while (desired - w.rot < -180) desired += 360;
    w.targetRot = desired;
  }
  UI.selectWheelIndex = selectWheelIndex;

  function snapWheel() {
    var w = UI._wheel; if (!w.items) return;
    var step = 360 / w.chars.length;
    w.targetRot = Math.round((w.rot - 180) / step) * step + 180;
  }

  function bindWheelInput() {
    if (UI._wheelInputBound) return;
    UI._wheelInputBound = true;
    var stage = $('wheelStage');
    var dragging = false, lastX = 0;
    stage.addEventListener('pointerdown', function (e) { dragging = true; UI._wheel.spinning = false; lastX = e.clientX; e.preventDefault(); });
    window.addEventListener('pointerup', function () { if (dragging) { dragging = false; snapWheel(); } });
    window.addEventListener('pointermove', function (e) {
      if (!dragging || !UI._wheel.active) return;
      var dx = e.clientX - lastX; lastX = e.clientX;
      UI._wheel.rot += dx * 0.5; UI._wheel.targetRot += dx * 0.5;
    });
    stage.addEventListener('wheel', function (e) {
      if (!UI._wheel.active) return;
      e.preventDefault();
      UI._wheel.spinning = false;
      var step = 360 / UI._wheel.chars.length;
      UI._wheel.targetRot += (e.deltaY > 0 ? -step : step);
    }, { passive: false });
    window.addEventListener('keydown', function (e) {
      if (!UI._wheel.active) return;
      var step = 360 / UI._wheel.chars.length;
      UI._wheel.spinning = false;
      if (e.key === 'ArrowRight' || e.key === 'KeyD') { UI._wheel.targetRot -= step; e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'KeyA') { UI._wheel.targetRot += step; e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === 'Space') { var b = $('btnConfirm'); if (b) b.click(); e.preventDefault(); }
    });
  }

  function layoutWheelStart() {
    var w = UI._wheel;
    if (!w.active) {
      w.active = true;
      if (typeof requestAnimationFrame === 'function') w._raf = requestAnimationFrame(wheelTick);
    }
  }
  function wheelTick() {
    var w = UI._wheel;
    if (!w || !w.active) return;
    w.rot += (w.targetRot - w.rot) * 0.16;
    if (Math.abs(w.targetRot - w.rot) < 0.02) w.rot = w.targetRot;
    if (Math.abs(w.targetRot - w.rot) < 0.5) w.spinning = false;
    wheelLayout(w);
    w._raf = requestAnimationFrame(wheelTick);
  }
  UI.stopWheel = function () {
    var w = UI._wheel;
    w.active = false;
    if (w._raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(w._raf);
    w._raf = null;
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
