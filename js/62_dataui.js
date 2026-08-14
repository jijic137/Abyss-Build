/* ============================================================
   62_dataui.js —— 数据管理页（三槽位自动存档）
   - 三个独立存档槽：切换 / 手动覆盖保存
   - 自动快照：结算、开新局、深入、手动保存时更新当前槽位
   - 导出 JSON 文件（落盘备份）/ 导入 / 重置当前槽位
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  function msg(text, isErr) {
    var el = $('dataMsg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'data-msg' + (isErr ? ' err' : '');
  }

  G.UI.refreshAfterExternalChange = function () {
    if (G.UI._dataShown) renderData();
  };

  function fmtTime(t) {
    if (!t) return '—';
    var d = new Date(t);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  }

  /* ---------- 槽位卡片 ---------- */
  function renderSlots() {
    var host = $('slotGrid');
    if (!host) return;
    host.innerHTML = '';
    var cur = G.Storage.currentSlot();
    for (var i = 1; i <= G.Storage.slotCount; i++) {
      var card = G.el('div', 'slot-card' + (i === cur ? ' current' : ''));
      var head = G.el('div', 'slot-head');
      head.appendChild(G.el('span', '', '槽位 ' + i));
      if (i === cur) head.appendChild(G.el('span', 'slot-cur', '使用中'));
      card.appendChild(head);

      var s = G.Storage.slotSummary(i);
      var sub;
      if (!s) {
        sub = G.el('div', 'slot-sub', '<span class="slot-empty">空存档</span>');
        var st = G.el('div', 'slot-stats', '保存后这里会记录你的完整进度。');
        card.appendChild(sub);
        card.appendChild(st);
      } else {
        sub = G.el('div', 'slot-sub', '最后保存：' + fmtTime(s.savedAt));
        var st = G.el('div', 'slot-stats',
          '深渊币 <b>' + s.currency + '</b> · 仓库 <b>' + s.stash + '</b> 件<br>' +
          '战役 <b>第 ' + Math.min(16, s.bestSublevel + 1) + ' / 16 小关</b> · 撤离 <b>' + s.extracts + '</b> 次<br>' +
          (s.running ? '<span class="ok">进行中战局（可继续）</span>' : '无进行中战局'));
        card.appendChild(sub);
        card.appendChild(st);
      }

      var btns = G.el('div', 'slot-btns');
      var bSwitch = G.el('button', 'btn btn-sm', i === cur ? '当前槽位' : '切换到此槽位');
      if (i !== cur) {
        bSwitch.addEventListener('click', function (slot) {
          return function () {
            var r = G.Storage.loadSlot(slot);
            if (!r.ok) { msg('切换失败：' + r.msg, true); return; }
            msg('已切换到槽位 ' + slot + '。');
            G.Audio.sfx('confirm');
            renderData();
          };
        }(i));
      } else {
        bSwitch.disabled = true;
      }
      var bSave = G.el('button', 'btn btn-sm btn-primary', '保存到此槽位');
      bSave.addEventListener('click', function (slot) {
        return function () {
          var r = G.Storage.saveSlot(slot);
          if (r.ok) {
            msg('已保存到槽位 ' + slot + '（' + fmtTime(r.savedAt) + '）。');
            G.Audio.sfx('confirm');
          } else {
            msg('保存失败：' + r.msg, true);
            G.Audio.sfx('back');
          }
          renderData();
        };
      }(i));
      btns.appendChild(bSwitch);
      btns.appendChild(bSave);
      card.appendChild(btns);
      host.appendChild(card);
    }
  }

  function renderData() {
    var body = $('dataBody');
    if (!body) return;
    var oi = null;
    try { oi = G.Storage.originInfo(); }
    catch (e) { oi = null; }
    body.innerHTML = '';
    if (!oi) {
      body.appendChild(G.el('div', 'data-tip', '存储模块初始化失败。'));
      return;
    }
    body.appendChild(G.el('div', 'data-tip',
      '游戏会自动把进度保存到<b>当前槽位</b>（结算、开新局、深入下一小关、手动保存时更新）。' +
      '三个槽位相互独立：想开新档就切到空槽位；想回滚就切回旧槽位。'));

    var grid = G.el('div', 'slot-grid');
    grid.id = 'slotGrid';
    body.appendChild(grid);
    renderSlots();

    body.appendChild(G.el('div', 'data-tip',
      oi.note +
      '<br><br>「导出档案」会把当前槽位保存成 JSON 文件（真正落盘的备份，可跨电脑恢复）；' +
      '「导入档案」会覆盖当前槽位并立即生效；「重置档案」清空当前槽位与当前进度（其余槽位保留）。'));
    var msgEl = G.el('div', 'data-msg', '');
    msgEl.id = 'dataMsg';
    body.appendChild(msgEl);
    msg('');
  }

  G.UI.renderData = function () {
    G.UI._dataShown = true;
    renderData();
  };

  /* ---------- 下载 ---------- */
  function downloadExport() {
    try {
      var json = G.Storage.exportProfile();
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.href = url;
      a.download = 'abyss-hunter-slot' + G.Storage.currentSlot() + '-' + stamp + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      msg('档案已导出。');
      G.Audio.sfx('confirm');
    } catch (e) {
      msg('导出失败：' + (e && e.message || e), true);
    }
  }

  /* ---------- 导入（读文件 → 覆盖当前槽位） ---------- */
  function onFile() {
    var input = $('dataFileInput');
    var f = input && input.files && input.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var res = G.Storage.importProfile(String(reader.result), { merge: 'replace' });
      renderData();
      if (res.ok) {
        msg('档案已导入到当前槽位。');
        G.Audio.sfx('item_get');
      } else {
        msg('导入失败：' + res.msg, true);
        G.Audio.sfx('back');
      }
    };
    reader.onerror = function () { msg('读取文件失败。', true); };
    reader.readAsText(f);
  }

  /* ---------- 重置当前槽位 ---------- */
  function resetProfile() {
    var ok = confirm('确定要清空当前槽位（槽位 ' + G.Storage.currentSlot() + '）的全部数据吗？\n' +
      '（深渊币 / 仓库 / 装备 / 战役进度 / 成就 / 进行中战局将清空）\n\n其余槽位不受影响，仍可切换回去。');
    if (!ok) return;
    var res = G.Storage.resetProfile({ keepSettings: true });
    if (res.ok) {
      renderData();
      msg('当前槽位已重置（设置已保留）。');
      G.Audio.sfx('back');
    }
  }

  /* ---------- 接线 ---------- */
  var btnData = $('btnData');
  if (btnData) {
    btnData.addEventListener('click', function () {
      G.Audio.sfx('select');
      G.UI.renderData();
      G.UI.showScreen('scrData');
    });
  }
  var btnBack = $('btnDataBack');
  if (btnBack) btnBack.addEventListener('click', function () {
    G.UI._dataShown = false;
    G.Audio.sfx('back');
    G.UI.showScreen('scrTitle');
  });
  var btnExport = $('btnDataExport');
  if (btnExport) btnExport.addEventListener('click', downloadExport);

  var btnImport = $('btnDataImport');
  if (btnImport) {
    btnImport.addEventListener('click', function () {
      G.Audio.sfx('select');
      var input = $('dataFileInput');
      if (input) { input.value = ''; input.click(); }
    });
  }
  var input = $('dataFileInput');
  if (input) input.addEventListener('change', onFile);

  var btnReset = $('btnDataReset');
  if (btnReset) btnReset.addEventListener('click', resetProfile);

  /* 槽位切换 / 外部写入后自动刷新 */
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('abyss-profile-changed', function () {
      if (G.UI && G.UI._dataShown) renderData();
    });
  }

})();
