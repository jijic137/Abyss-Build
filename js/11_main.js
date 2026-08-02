/* ============================================================
   11_main.js —— 启动 / 按钮绑定 / 流程衔接
   ============================================================ */
'use strict';

(function () {

  function boot() {
    G.game.init();

    /* 应用存档设置：音量 / 震屏强度 / BGM */
    var settings = G.Save.getSettings();
    G.Audio.volume = settings.volume;
    G.Audio.musicVolume = settings.music;
    G.Audio.setBgm(settings.bgm);          // 标题界面 ctx 未解锁：仅记录标志，开局时再启动
    G.game.shakeScale = settings.shake;

    /* 角色选择：renderCharSelect 会在内部回调选中项（默认第一个） */
    var selectedChar = G.CHARACTERS[0];
    G.UI.renderCharSelect(function (ch) { selectedChar = ch; });

    function byId(id) { return document.getElementById(id); }

    /* 开始游戏 */
    byId('btnStart').addEventListener('click', function () {
      if (!selectedChar) return;
      G.Save.clearRun();        // 新开一局：放弃旧的续局存档
      G.Audio.unlock();          // 首次用户手势：解锁音频
      G.Audio.setBgm(G.Save.getSettings().bgm);   // 按设置启停 BGM
      G.UI.showScreen(null);
      G.game.newRun(selectedChar);
    });

    /* 继续游戏（读取续局存档） */
    byId('btnResumeRun').addEventListener('click', function () {
      var data = G.Save.getRun();
      if (!data) return;
      G.Audio.unlock();
      G.Audio.setBgm(G.Save.getSettings().bgm);   // 按设置恢复 BGM
      var ok = G.game.resumeRun(data);
      if (!ok) { G.Save.clearRun(); G.UI.showScreen('scrTitle'); }
    });

    /* 填充设置面板控件（从存档读数） */
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
    }
    function openSettings(from) { populateSettings(); G.UI.openSettings(from); }

    /* 设置（标题进入） */
    byId('btnSettings').addEventListener('click', function () { openSettings('title'); });
    /* 设置（对局内暂停进入） */
    byId('btnPauseSettings').addEventListener('click', function () { openSettings('pause'); });

    byId('btnSettingsBack').addEventListener('click', function () {
      G.UI.closeSettings();      // 回到来处（标题或暂停）
    });
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

    /* 商店 → 下一波 */
    byId('btnNextWave').addEventListener('click', function () {
      G.game.nextWave();
    });

    /* 商店 → 重掷 */
    byId('btnReroll').addEventListener('click', function () {
      var ok = G.Shop.reroll(G.game.player);
      if (!ok) return;
      G.UI.renderShop(G.game);
    });

    /* 暂停 → 继续 */
    byId('btnResume').addEventListener('click', function () {
      G.game.togglePause();
    });

    /* 暂停 → 放弃本局，回到标题 */
    byId('btnQuit').addEventListener('click', function () {
      G.Save.clearRun();        // 放弃本局：清除续局存档
      G.Audio.stopMusic();      // 停止 BGM
      G.game.state = 'title';
      G.game.player = null;
      byId('hud').classList.add('hidden');
      byId('statPanel').classList.add('hidden');
      G.UI.showScreen('scrTitle');
    });

    /* 结算 → 再来一局 */
    byId('btnRestart').addEventListener('click', function () {
      G.Save.clearRun();        // 结算后再来：清除续局存档
      G.Audio.stopMusic();      // 停止 BGM
      G.game.state = 'title';
      G.game.player = null;
      byId('hud').classList.add('hidden');
      byId('statPanel').classList.add('hidden');
      G.UI.renderCharSelect(function (ch) { selectedChar = ch; });
      G.UI.showScreen('scrTitle');
    });

    /* 进入标题界面（覆盖层默认可见） */
    G.UI.showScreen('scrTitle');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
