/* ============================================================
   48_pause.js —— 暂停菜单随时存档
   - 「保存进度」：原位保存，暂停中提示已保存
   - 「存档并返回标题」：保存后安全退出到标题页，可继续游戏
   - 存档扩展：记录玩家当前位置，读档时原位恢复
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* 存档：附带玩家当前位置 */
  var _sr5 = G.game.saveRun;
  G.game.saveRun = function () {
    _sr5.call(this);
    var d = G.Save.getRun();
    if (d && this.player && this.map) {
      d.px = this.player.x;
      d.py = this.player.y;
      d.room = G.Map.roomAt(this.map, this.player.x, this.player.y).idx;
      G.Save.saveRun(d);
    }
  };

  /* 读档：原位恢复 */
  var _rr5 = G.game.resumeRun;
  G.game.resumeRun = function (data) {
    var r = _rr5.call(this, data);
    var p = this.player;
    if (r && p && data && data.px != null && data.py != null && this.map) {
      var tx = G.clamp(data.px, G.Map.WALL + p.r, this.map.worldW - G.Map.WALL - p.r);
      var ty = G.clamp(data.py, G.Map.WALL + p.r, this.map.worldH - G.Map.WALL - p.r);
      if (G.Map.bboxSolid(this.map, tx, ty, p.r)) {
        var f = G.resolveFree(this.map, tx, ty, p.r);
        tx = f.x; ty = f.y;
      }
      p.x = tx; p.y = ty;
      p.room = data.room != null ? data.room : this.map.startRoom;
      this.lastRoom = data.room != null ? data.room : -1;
      if (this.lastRoom >= 0) {
        var rm = this.map.rooms[this.lastRoom];
        if (rm) rm.explored = true;
      }
    }
    return r;
  };

  /* 按钮接线 */
  var btnSave = $('btnSaveProgress');
  if (btnSave) {
    btnSave.addEventListener('click', function () {
      var g = G.game;
      if (!g || !g.player || !g.map) return;
      g.saveRun();
      G.Audio.sfx('save');
      G.Audio.sfx('select');
      G.UI.flashText(btnSave, '✓ 进度已保存');
    });
  }

  var btnSaveQuit = $('btnSaveQuit');
  if (btnSaveQuit) {
    btnSaveQuit.addEventListener('click', function () {
      var g = G.game;
      if (!g || !g.player || !g.map) return;
      g.saveRun();
      G.Audio.sfx('confirm');
      G.Audio.stopMusic();
      g.state = 'title';
      g.player = null;
      g.map = null;
      if (G.UI._flowOpen) G.UI.closeFlow();
      if (G.UI._evtOpen) G.UI.closeEvent();
      var hud = $('hud');
      if (hud) hud.classList.add('hidden');
      var sp = $('statPanel');
      if (sp) sp.classList.add('hidden');
      G.UI.showScreen('scrTitle');
    });
  }

})();
