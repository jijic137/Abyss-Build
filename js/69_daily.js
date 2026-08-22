/* ============================================================
   69_daily.js —— 每日挑战
   - 当日日期盐 → 确定性地图布局（T1）
   - 选图页顶部「今日挑战」卡片：每日完成一次并记录成绩
   - 当日已结算则提示，不重复覆盖成绩
   纯增量：只包 renderMapSelect / newRun / showResult。
   ============================================================ */
(function () {
  'use strict';
  var G = window.G || (window.G = {});

  function dateKey() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function today() { return dateKey(); }

  /* 当前记录：今日已结算返回对象，否则 null */
  function status() {
    var d = G.Meta && G.Meta.get() ? G.Meta.get().daily : null;
    return (d && d.date === today()) ? d : null;
  }

  G.Daily = {
    seed: today,
    today: today,
    status: status
  };

  /* ---------------- 选图页注入今日挑战卡片 ---------------- */
  var _sel = G.UI.renderMapSelect;
  G.UI.renderMapSelect = function () {
    _sel.call(this);
    G.Daily.injectCard();
  };

  G.Daily.injectCard = function () {
    var box = document.getElementById('mapCards');
    if (!box) return;
    var existing = document.getElementById('dailyCard');
    if (existing) existing.remove();
    var done = G.Daily.status();
    var card = document.createElement('div');
    card.id = 'dailyCard';
    card.style.cssText = 'border:1px solid #ffd24a;border-radius:8px;padding:12px 14px;' +
      'margin-bottom:10px;background:linear-gradient(180deg,rgba(40,34,12,.6),rgba(20,18,10,.6));cursor:pointer;';
    var head = document.createElement('div');
    head.style.cssText = 'font-weight:900;color:#ffd24a;font-size:15px;letter-spacing:2px;';
    head.textContent = '✦ 今日挑战';
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:#cbb87a;margin-top:4px;line-height:1.5;';
    sub.textContent = done
      ? ('今日已完成 · 存活 ' + done.best + 's' + (done.win ? ' · 挑战成功' : ' · 未能撤离'))
      : '当天固定的确定性地图 · 一次机会 · 撤离即记录成绩';
    card.appendChild(head);
    card.appendChild(sub);
    card.addEventListener('click', function () {
      if (G.Daily.status()) { if (G.UI.flashText) G.UI.flashText(card, '今日已完成'); return; }
      G.Daily.start();
    });
    if (box.parentNode && box.parentNode.insertBefore) box.parentNode.insertBefore(card, box);
    else box.appendChild(card);
  };

  /* ---------------- 启动：设日期盐后走常规出发 ---------------- */
  G.Daily.start = function () {
    var ch = G.UI._selectedChar;
    if (!ch) { if (G.UI.flashText) G.UI.flashText(document.getElementById('dailyCard'), '请先选择角色'); return; }
    var g = G.game;
    g._daily = { seed: G.Daily.seed(), tier: 1, date: G.Daily.today() };
    G.Audio.sfx('confirm');
    G.Save.clearRun();
    G.Audio.unlock();
    if (G.UI.stopWheel) G.UI.stopWheel();
    G.UI.showScreen(null);
    G.game.newRun(ch, 1);
  };

  /* newRun：启动前把每日盐塞进实例，交给最底层生成地图 */
  var _nr = G.game.newRun;
  G.game.newRun = function (charDef, tierId) {
    if (this._daily) this._dailySeed = this._daily.seed;
    var r = _nr.call(this, charDef, tierId);
    return r;
  };

  /* ---------------- 结算：撤离成功才记录，每日仅一次 ---------------- */
  var _sr = G.UI.showResult;
  G.UI.showResult = function (g, win, info) {
    var r = _sr.call(this, g, win, info);
    if (g && g._daily && win) {
      var d = G.Meta.get();
      if (!d.daily || d.daily.date !== G.Daily.today()) {
        d.daily = { date: G.Daily.today(), win: true, best: Math.round(g.runTime || 0) };
        G.Meta.flush();
      }
    }
    return r;
  };

})();
