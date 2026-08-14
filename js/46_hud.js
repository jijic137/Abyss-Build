/* ============================================================
   46_hud.js —— HUD 信息增强
   - 目标进度：精英/BOSS 击杀计数（T2/T3/T4/T5）
   - 高危警示：当前房间敌人密度高时，屏幕边缘泛红
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  var _uh8 = G.UI.updateHud;
  G.UI.updateHud = function (g) {
    _uh8.call(this, g);
    var p = g.player, slot = $('skillSlot');
    if (p && p.char && p.char.skill) {
      var sk = p.char.skill;
      if (slot) {
        slot.classList.remove('hidden');
        var sym = $('skillSym'), nm = $('skillName'), cd = $('skillCd');
        var ready = $('skillReady'), cdFill = $('skillCooldown');
        if (sym) {
          sym.textContent = sk.sym || '技';
          sym.style.color = sk.col || '#ffd24a';
          sym.style.borderColor = sk.col || '#ffd24a';
        }
        if (nm) nm.textContent = sk.name;
        var skCol = sk.col || '#ffd24a';
        slot.style.setProperty('--sk-c', skCol);
        var readyNow = p.skillCd <= 0;
        slot.classList.toggle('ready', readyNow);
        var r = G.clamp(1 - (p.skillCd / (sk.cd || 1)), 0, 1);
        slot.style.setProperty('--fill', (r * 360) + 'deg');
        if (cdFill) {
          cdFill.style.height = readyNow ? '0%' : ((1 - r) * 100) + '%';
          cdFill.style.opacity = readyNow ? '0' : '1';
        }
        if (cd) {
          cd.textContent = readyNow ? '' : Math.ceil(p.skillCd) + 's';
          cd.style.color = readyNow ? '' : skCol;
        }
        if (ready) ready.textContent = readyNow ? 'SPACE 就绪' : '蓄力中';
        if (slot && !slot._skTip) {
          slot._skTip = true;
          slot.addEventListener('mouseenter', function (e) {
            G.UI.showTip('<div class="tt-name" style="color:' + (sk.col || '#ffd24a') + '">' +
            (sk.sym || '技') + ' ' + sk.name + ' <span style="font-size:11px;opacity:.7">按 空格 使用</span></div>' +
            '<div style="color:#8a90a8">' + (sk.desc || '') + '</div>' +
            '<div style="color:#ffd24a;margin-top:5px">冷却 ' + sk.cd + 's</div>', e.clientX, e.clientY);
          });
          slot.addEventListener('mousemove', function (e) {
            G.UI.showTip('<div class="tt-name" style="color:' + (sk.col || '#ffd24a') + '">' +
            (sk.sym || '技') + ' ' + sk.name + ' <span style="font-size:11px;opacity:.7">按 空格 使用</span></div>' +
            '<div style="color:#8a90a8">' + (sk.desc || '') + '</div>' +
            '<div style="color:#ffd24a;margin-top:5px">冷却 ' + sk.cd + 's</div>', e.clientX, e.clientY);
          });
          slot.addEventListener('mouseleave', function () { G.UI.hideTip(); });
        }
      }
    } else if (slot) {
      slot.classList.add('hidden');
    }
    var m = g.map, timer = $('waveTimer');
    if (!m || !timer || m.extract.active) return;
    var txt = null;
    if (m.tierId === 2) txt = '精英 ' + m.eliteKills + ' / 1';
    else if (m.tierId === 3) txt = 'BOSS ' + (m.bossKills ? '1 / 1' : '0 / 1');
    else if (m.tierId === 4) txt = '精英 ' + m.eliteKills + ' / 2';
    else if (m.tierId === 5) txt = 'BOSS ' + (m.bossKills ? '1 / 1' : '0 / 1');
    if (txt !== null) {
      timer.textContent = txt;
      timer.style.color = '';
    }
  };

  /* 高危警示：同房间存活敌人 >= 8 时屏幕边缘泛红 */
  var _rd = G.game.render;
  G.game.render = function () {
    _rd.call(this);
    var g = this;
    if (g.state !== 'play' || !g.map || !g.player) return;
    var rm = G.Map.roomAt(g.map, g.player.x, g.player.y);
    var n = 0;
    for (var i = 0; i < g.enemies.length; i++) {
      if (!g.enemies[i].dead && g.enemies[i].room === rm.idx) n++;
    }
    if (n >= 8) {
      var a = Math.min(0.16, (n - 8) * 0.016);
      g.ctx.fillStyle = 'rgba(255,60,70,' + a + ')';
      g.ctx.fillRect(0, 0, g.vw, g.vh);
    }
  };

})();
