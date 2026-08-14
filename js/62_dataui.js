/* ============================================================
   62_dataui.js —— 数据管理页
   档案摘要 / 导出 / 导入 / 重置（为未来账号云同步预留入口）
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

  function renderData() {
    var body = $('dataBody');
    if (!body) return;
    var s;
    try { s = G.Storage.summary(); }
    catch (e) { s = null; }
    var oi = null;
    try { oi = G.Storage.originInfo(); }
    catch (e) { oi = null; }
    body.innerHTML = '';
    if (!s || !oi) {
      body.appendChild(G.el('div', 'data-tip', '存储模块初始化失败。'));
      return;
    }
    var rows = [
      ['设备标识', '<b>' + s.device + '</b>'],
      ['存储位置', '<b>' + (oi.isFile ? '本地文件模式 (file://)' : (oi.protocol || '未知')) + '</b>'],
      ['本地存储可用', oi.localStorageOk ? '<b style="color:#6ee787">可用</b>' : '<b style="color:#ff7a7a">不可用（数据不会持久）</b>'],
      ['深渊币', '<b>' + s.currency + '</b>'],
      ['仓库物品', '<b>' + s.stash + ' / ' + s.stashSize + '</b>'],
      ['战役进度', '<b>第 ' + Math.min(16, s.bestSublevel + 1) + ' / 16 小关</b>（已通过 ' + s.bestSublevel + '）'],
      ['撤离 / 阵亡', '<b>' + s.extracts + ' / ' + s.deaths + '</b>'],
      ['累计收入', '<b>' + s.totalEarned + '</b> 深渊币'],
      ['进行中战局', s.running ? '<b style="color:#6ee787">有（可继续）</b>' : '无'],
      ['最后保存', '<b>' + fmtTime(s.lastSave) + '</b>']
    ];
    var grid = G.el('div', 'data-summary');
    rows.forEach(function (r) {
      var row = G.el('div', 'ds-row');
      row.appendChild(G.el('span', '', r[0]));
      row.appendChild(G.el('span', '', r[1]));
      grid.appendChild(row);
    });
    body.appendChild(grid);
    body.appendChild(G.el('div', 'data-tip',
      oi.note +
      '<br><br>你的游戏数据保存在浏览器的本地存储里（不是项目文件），每次打开 index.html 会自动读取。' +
      '为了万无一失，建议定期点「导出档案」把数据保存成 JSON 文件（这才是真正落盘的文件备份），' +
      '以后换电脑/重装浏览器时用「导入档案」即可恢复。'));
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
    var json;
    try {
      json = G.Storage.exportProfile();
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.href = url;
      a.download = 'abyss-hunter-' + stamp + '.json';
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

  /* ---------- 导入（读文件 → 覆盖/合并） ---------- */
  function pickImport(strategy) {
    var input = $('dataFileInput');
    if (!input) return;
    input.value = '';
    input.setAttribute('data-strategy', strategy);
    input.click();
  }

  function onFile() {
    var input = $('dataFileInput');
    var f = input && input.files && input.files[0];
    if (!f) return;
    var strategy = input.getAttribute('data-strategy') || 'replace';
    var reader = new FileReader();
    reader.onload = function () {
      var res = G.Storage.importProfile(String(reader.result), { merge: strategy });
      renderData();
      if (res.ok) {
        msg(strategy === 'replace' ? '档案已覆盖导入。' : '档案已合并导入。');
        G.Audio.sfx('item_get');
      } else {
        msg('导入失败：' + res.msg, true);
        G.Audio.sfx('back');
      }
    };
    reader.onerror = function () { msg('读取文件失败。', true); };
    reader.readAsText(f);
  }

  /* ---------- 重置 ---------- */
  function resetProfile() {
    var ok = confirm('确定要重置全部游戏数据吗？\n（深渊币 / 仓库 / 装备 / 战役进度 / 成就将全部清空，且不可恢复）\n\n建议先「导出档案」备份。');
    if (!ok) return;
    var res = G.Storage.resetProfile({ keepSettings: true });
    if (res.ok) {
      renderData();
      msg('档案已重置（设置已保留）。');
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
      pickImport('replace');
    });
  }
  var input = $('dataFileInput');
  if (input) input.addEventListener('change', onFile);

  var btnReset = $('btnDataReset');
  if (btnReset) btnReset.addEventListener('click', resetProfile);

})();
