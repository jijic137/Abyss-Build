/* ============================================================
   11_main.js —— 启动 / 按钮绑定 / 流程衔接（搜打撤版）
   流程：标题 → 角色轮盘 → 选图 → 进图探索 → 撤离/死亡 → 整备循环
   ============================================================ */
'use strict';

(function () {

  function boot() {
    G.game.init();

    var settings = G.Save.getSettings();
    G.Audio.volume = settings.volume;
    G.Audio.musicVolume = settings.music;
    G.Audio.setBgm(settings.bgm);
    G.game.shakeScale = settings.shake;

    var selectedChar = G.CHARACTERS[0];

    function byId(id) { return document.getElementById(id); }

    /* 探索深渊：漩涡过渡 → 角色轮盘 */
    byId('btnExplore').addEventListener('click', function () {
      if (G._exploring || G.UI.isScreenOn('scrCharSelect')) return;
      G._exploring = true;
      G.Audio.unlock();
      G.Audio.sfx('abyss');
      G.UI._vortex('cover').pulseUp();
      var cover = byId('scrTitle');
      cover.classList.add('leaving');
      setTimeout(function () {
        cover.classList.remove('leaving');
        G.UI.renderCharWheel(function (ch) { selectedChar = ch; });
        G.UI.showScreen('scrCharSelect');
      }, 620);
    });

    var HOVER_IDS = ['btnExplore', 'btnResumeRun', 'btnBase', 'btnMarket', 'btnSettings',
      'btnResume', 'btnQuit', 'btnRestart', 'btnSettingsBack',
      'btnRecords', 'btnAch', 'btnRecordsBack', 'btnAchBack', 'btnSave', 'btnSaveBack',
      'btnMarketBack', 'btnBaseBack', 'btnMapBack', 'btnMapGo'];
    HOVER_IDS.forEach(function (id) {
      var b = byId(id);
      if (b) b.addEventListener('mouseenter', function () { G.Audio.sfx('hover'); });
    });

    /* 继续游戏 */
    byId('btnResumeRun').addEventListener('click', function () {
      var data = G.Save.getRun();
      if (!data) return;
      G.Audio.unlock();
      G.Audio.setBgm(G.Save.getSettings().bgm);
      var ok = G.game.resumeRun(data);
      if (!ok) { G.Save.clearRun(); G.UI.showScreen('scrTitle'); }
    });

    /* 整备仓库 */
    byId('btnBase').addEventListener('click', function () {
      G.Audio.unlock();
      G.Audio.sfx('select');
      G.UI.renderBase();
      G.UI.showScreen('scrBase');
    });

    /* 市场 */
    byId('btnMarket').addEventListener('click', function () {
      G.Audio.unlock();
      G.Audio.sfx('select');
      G.UI.renderMarket();
      G.UI.showScreen('scrMarket');
    });

    /* 设置 */
    function populateSettings() {
      var s = G.Save.getSettings();
      byId('setVolume').value = s.volume;
      byId('setVolumeVal').textContent = Math.round(s.volume * 100) + '%';
      byId('setMusic').value = s.music;
      byId('setMusicVal').textContent = Math.round(s.music * 100) + '%';
      byId('setBgm').checked = !!s.bgm;
      byId('setBgmVal').textContent = s.bgm ? '开' : '关';
      byId('setShake').value = s.shake;
      byId('setShakeVal').textContent = Math.round(s.shake * 100) + '%';
      syncSfxStyle();
    }
    function syncSfxStyle() {
      var btns = document.querySelectorAll('#setSfxStyle .seg-btn');
      var val = byId('setSfxStyleVal');
      var cur = G.Audio.sfxStyle || 2;
      btns.forEach(function (b) {
        var on = parseInt(b.getAttribute('data-style'), 10) === cur;
        b.classList.toggle('on', on);
      });
      if (val) val.textContent = G.Audio.sfxStyleName ? G.Audio.sfxStyleName() : (cur === 1 ? '经典' : cur === 3 ? '史诗' : '冲击');
    }
    function openSettings(from) { populateSettings(); G.UI.openSettings(from); }
    byId('btnSettings').addEventListener('click', function () { openSettings('title'); });
    byId('btnPauseSettings').addEventListener('click', function () { openSettings('pause'); });
    byId('setVolume').addEventListener('input', function (e) {
      var v = parseFloat(e.target.value);
      G.Audio.volume = v;
      byId('setVolumeVal').textContent = Math.round(v * 100) + '%';
      G.Save.setSettings({ volume: v });
    });
    byId('setMusic').addEventListener('input', function (e) {
      var v = parseFloat(e.target.value);
      G.Audio.setMusicVolume(v);
      byId('setMusicVal').textContent = Math.round(v * 100) + '%';
      G.Save.setSettings({ music: v });
    });
    byId('setBgm').addEventListener('change', function (e) {
      var on = e.target.checked;
      G.Audio.setBgm(on);
      byId('setBgmVal').textContent = on ? '开' : '关';
      G.Save.setSettings({ bgm: on });
    });
    byId('setShake').addEventListener('input', function (e) {
      var v = parseFloat(e.target.value);
      G.game.shakeScale = v;
      byId('setShakeVal').textContent = Math.round(v * 100) + '%';
      G.Save.setSettings({ shake: v });
    });
    var styleBtns = document.querySelectorAll('#setSfxStyle .seg-btn');
    styleBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var n = parseInt(b.getAttribute('data-style'), 10);
        G.Audio.setSfxStyle(n);
        syncSfxStyle();
        G.Audio.sfx('crit');
      });
    });
    byId('btnSettingsBack').addEventListener('click', function () { G.UI.closeSettings(); });

    /* 封面 → 子页：记录 / 成就 / 存档 */
    function openSub(subId) {
      G.Audio.unlock();
      G.Audio.sfx('select');
      G.UI.showScreen(subId);
    }
    byId('btnRecords').addEventListener('click', function () { openSub('scrRecords'); });
    byId('btnAch').addEventListener('click', function () { openSub('scrAch'); });
    byId('btnSave').addEventListener('click', function () { openSub('scrSave'); });
    byId('btnRecordsBack').addEventListener('click', function () { G.Audio.sfx('back'); G.UI.showScreen('scrTitle'); });
    byId('btnAchBack').addEventListener('click', function () { G.Audio.sfx('back'); G.UI.showScreen('scrTitle'); });
    byId('btnSaveBack').addEventListener('click', function () { G.Audio.sfx('back'); G.UI.showScreen('scrTitle'); });

    /* 市场 / 整备 / 选图 返回 */
    byId('btnMarketBack').addEventListener('click', function () { G.Audio.sfx('back'); G.UI.showScreen('scrTitle'); });
    byId('btnBaseBack').addEventListener('click', function () { G.Audio.sfx('back'); G.UI.showScreen('scrTitle'); });
    byId('btnMapBack').addEventListener('click', function () { G.Audio.sfx('back'); G.UI.renderBase(); G.UI.showScreen('scrBase'); });
    byId('btnMapGo').addEventListener('click', function () {
      var tier = G.UI._selectedTier || 1;
      var tierDef = G.TIER_MAP[tier];
      var fee = tierDef.fee;
      if (!G.Meta.tierUnlocked(tier)) { G.UI.flashText(byId('btnMapGo'), '尚未解锁'); return; }
      if (!G.Meta.spend(fee)) { G.UI.flashText(byId('btnMapGo'), '深渊币不足'); return; }
      if (!selectedChar) { G.UI.flashText(byId('btnMapGo'), '请先选择角色'); return; }
      G.Audio.sfx('confirm');
      G.Save.clearRun();
      G.Audio.unlock();
      G.UI.stopWheel();
      G.UI.showScreen(null);
      G.game.newRun(selectedChar, tier);
    });

    /* 暂停 → 继续 / 放弃 */
    byId('btnResume').addEventListener('click', function () { G.game.togglePause(); });
    byId('btnQuit').addEventListener('click', function () {
      G.Save.clearRun();
      G.Audio.stopMusic();
      G.game.state = 'title';
      G.game.player = null;
      G.game.map = null;
      byId('hud').classList.add('hidden');
      byId('statPanel').classList.add('hidden');
      G.UI.showScreen('scrTitle');
    });

    /* 结算 → 再来一局（回整备） */
    byId('btnRestart').addEventListener('click', function () {
      G.Audio.stopMusic();
      G.game.state = 'title';
      G.game.player = null;
      G.game.map = null;
      byId('hud').classList.add('hidden');
      byId('statPanel').classList.add('hidden');
      G.UI.stopWheel();
      G.UI.renderBase();
      G.UI.showScreen('scrBase');
    });

    G.UI.showScreen('scrTitle');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
