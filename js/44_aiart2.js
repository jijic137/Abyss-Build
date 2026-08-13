/* ============================================================
   44_aiart2.js —— AI 美术集成二：基地/市场/结算背景 + 精英/BOSS 出场立绘
   图片缺失时优雅降级（背景 404 静默、立绘卡隐藏图片仅留文字）
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* ---------------- 基地 / 市场背景 ---------------- */
  var base = $('scrBase');
  if (base) {
    base.style.backgroundImage = "url('assets/art/ai/base/base_camp.png')";
  }
  var market = $('scrMarket');
  if (market) {
    market.style.backgroundImage = "url('assets/art/ai/base/base_camp.png')";
  }

  /* ---------------- 结算背景（按胜负） ---------------- */
  var _sr3 = G.UI.showResult;
  G.UI.showResult = function (g, win, info) {
    var r = _sr3.call(this, g, win, info);
    var sc = $('scrResult');
    if (sc) {
      sc.style.backgroundImage = "url('assets/art/ai/result/" + (win ? 'result_win' : 'result_lose') + ".png')";
    }
    return r;
  };

  /* ---------------- 精英 / BOSS 出场立绘弹卡 ---------------- */
  var ELITE_FILES = {
    el_warden: 'el1_warden', el_ironclad: 'el2_ironclad', el_butcher: 'el3_butcher',
    el_hexer: 'el4_hexer', el_brood: 'el5_brood', el_reaper: 'el6_reaper'
  };
  var BOSS_FILES = { boss_behemoth: 'boss1_behemoth', boss_abyss: 'boss2_abyss' };

  function spawnCard() {
    var el = $('spawnCard');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'spawnCard';
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  function showSpawnCard(name, file, col, sub) {
    var card = spawnCard();
    card.innerHTML = '';
    card.style.setProperty('--sc', col);
    card.style.borderColor = col;
    var img = document.createElement('img');
    img.src = 'assets/art/ai/' + (file.indexOf('boss') === 0 ? 'boss/' : 'elites/') + file + '.png';
    img.addEventListener('error', function () { img.style.display = 'none'; });
    var nameEl = document.createElement('div');
    nameEl.className = 'sc-name';
    nameEl.textContent = name;
    var subEl = document.createElement('div');
    subEl.className = 'sc-sub';
    subEl.textContent = sub;
    card.appendChild(img);
    card.appendChild(nameEl);
    card.appendChild(subEl);
    card.style.display = 'flex';
    card.classList.remove('pop');
    void card.offsetWidth;
    card.classList.add('pop');
    clearTimeout(G.UI._spawnT);
    G.UI._spawnT = setTimeout(function () {
      card.style.display = 'none';
    }, 2100);
  }

  var _er = G.game.enterRoom;
  G.game.enterRoom = function (idx) {
    var rm = this.map && this.map.rooms[idx];
    var wasVisited = rm ? rm.visited : true;
    var r = _er.call(this, idx);
    if (!rm || wasVisited || !rm.visited) return r;
    if (rm.bossId) {
      var bf = BOSS_FILES[rm.bossId];
      if (bf) showSpawnCard(G.ENEMY_MAP[rm.bossId].name, bf, '#ff4a4a', 'BOSS 苏醒');
    } else if (rm.eliteIds && rm.eliteIds.length) {
      var id = rm.eliteIds[0];
      var ef = ELITE_FILES[id];
      if (ef) showSpawnCard(G.ENEMY_MAP[id].name, ef, '#ffd24a', '精英出没');
    }
    return r;
  };

})();
