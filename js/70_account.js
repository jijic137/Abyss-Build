/* 70_account.js —— 账号接入（演示后端 / Supabase 可替换）
   - 把 61_storage 的 G.Account 占位换成真实远程实现
   - 标题页加「账号」按钮：注册 / 登录 / 登出 / 手动同步
   - 登录后：download(合并) → 写本地 → 关键节点 upload（槽位维度）
   - 后端不可达时回退 local 模式，单机可玩不丢档 */
(function () {
  'use strict';
  var G = window.G || (window.G = {});
  var $ = G.$;
  var BASE = (window.AH_API_BASE || '');

  var TOKEN_KEY = 'abyss_hunter_token';
  var SESSION_KEY = 'abyss_hunter_user';
  var _token = null;
  var _user = null;
  var _uploading = false;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }

  /* 后端地址：未配置 BASE 时按同源 / 或 localhost:8788 演示 */
  function apiBase() {
    if (BASE) return BASE;
    return (location && location.origin && location.origin.indexOf('file:') !== 0) ? location.origin : 'http://localhost:8788';
  }

  function api(path, opts) {
    return fetch(apiBase() + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {})).then(function (r) {
      return r.json().catch(function () { return { ok: false, msg: 'bad response' }; });
    });
  }
  function authed(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers, { Authorization: 'Bearer ' + token() });
    return api(path, opts);
  }

  function token() { return _token || lsGet(TOKEN_KEY) || ''; }
  function restoreSession() {
    var t = lsGet(TOKEN_KEY);
    var u = lsGet(SESSION_KEY);
    if (t && u) { _token = t; try { _user = JSON.parse(u); } catch (e) { _user = null; } G.Account.status = 'online'; }
  }

  G.Account = {
    status: 'local',
    provider: null,
    register: function (email, password) {
      return api('/api/register', { method: 'POST', body: JSON.stringify({ email: email, password: password }) });
    },
    signIn: function (opts) {
      opts = opts || {};
      return api('/api/signin', { method: 'POST', body: JSON.stringify({ email: opts.email, password: opts.password }) })
        .then(function (r) {
          if (!r.ok) return r;
          _token = r.token;
          _user = { id: r.userId || r.id || '', email: opts.email || '' };
          lsSet(TOKEN_KEY, _token);
          lsSet(SESSION_KEY, JSON.stringify(_user));
          G.Account.status = 'online';
          return G.Account.sync().then(function () { return { ok: true, profile: r.profile }; });
        });
    },
    signOut: function () {
      _token = null; _user = null;
      lsDel(TOKEN_KEY); lsDel(SESSION_KEY);
      G.Account.status = 'local'; G.Account.provider = null;
      return Promise.resolve();
    },
    upload: function () {
      if (!_token || G.Account.status !== 'online' || _uploading) return Promise.resolve({ ok: true, reason: 'noop' });
      _uploading = true;
      var slot = G.Storage ? G.Storage.currentSlot() : 1;
      return authed('/api/save', { method: 'POST', body: JSON.stringify({ slot: slot, profile: G.Storage.profile() }) })
        .then(function (r) { _uploading = false; return r; })
        .catch(function (e) { _uploading = false; return { ok: false, reason: 'offline' }; });
    },
    download: function () {
      if (!_token) return Promise.resolve({ ok: false, reason: 'no-token' });
      var slot = G.Storage ? G.Storage.currentSlot() : 1;
      return authed('/api/load?slot=' + slot)
        .then(function (r) {
          if (r.ok && r.profile) {
            G.Storage.profile = G.Storage.profile;
            if (G.Storage.writeProfile) G.Storage.writeProfile(r.profile);
            else writeProfile(r.profile);
          }
          return r;
        })
        .catch(function () { return { ok: false, reason: 'offline' }; });
    },
    sync: function () {
      return G.Account.download().then(function (d) {
        if (d.ok) return G.Account.upload();
        return d;
      });
    },
    _api: api,
    _authed: authed,
    _token: token
  };

  /* 登录后：覆盖写入本地（调用 61_storage 的 writeProfile，若暴露则用） */
  function writeProfile(profile) {
    if (!profile) return;
    var meta = profile.meta || {};
    var best = profile.best || {};
    var d = G.Meta.get();
    for (var mk in meta) d[mk] = meta[mk];
    G.Meta.flush();
    var b = G.Save.get();
    for (var bk in best) b[bk] = best[bk];
    b.run = profile.run || null;
    G.Save.flush();
  }

  /* ---------- 标题页账号按钮 / 面板 ---------- */
  function ensurePanel() {
    var p = $('accountPanel');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'accountPanel';
    p.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(4,6,12,.78);z-index:99;';
    var box = document.createElement('div');
    box.style.cssText = 'background:linear-gradient(180deg,#1a1e30,#10131f);border:2px solid #7fa8ff;border-radius:10px;padding:22px 26px;max-width:360px;width:90%;text-align:center;color:#dbe4ff;';
    box.innerHTML = '<div style="font-size:20px;font-weight:900;letter-spacing:3px;color:#7fa8ff;margin-bottom:4px;">账号</div>' +
      '<div id="accountStatus" style="font-size:12px;color:#9aa6c8;margin-bottom:14px;min-height:16px;"></div>' +
      '<input id="acctEmail" placeholder="邮箱" style="width:92%;padding:8px;margin-bottom:8px;box-sizing:border-box;"/>' +
      '<input id="acctPw" type="password" placeholder="密码（≥4位）" style="width:92%;padding:8px;margin-bottom:12px;box-sizing:border-box;"/>' +
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
      '<button id="acctRegister" class="btn btn-sm">注册</button>' +
      '<button id="acctLogin" class="btn btn-sm">登录</button>' +
      '<button id="acctSync" class="btn btn-sm">同步存档</button>' +
      '<button id="acctLogout" class="btn btn-sm">退出</button>' +
      '</div>' +
      '<button id="acctClose" style="margin-top:14px;background:none;border:none;color:#7a86a8;cursor:pointer;">关闭</button>';
    p.appendChild(box);
    document.body.appendChild(p);
    return p;
  }
  function renderAccount() {
    var el = $('accountStatus'); if (!el) return;
    if (G.Account.status === 'online' && _user) el.textContent = '已登录：' + (_user.email || '账号') + ' · 云端存档中';
    else el.textContent = '未登录 · 本地存档模式';
  }
  function openPanel() {
    var p = ensurePanel(); p.style.display = 'flex';
    renderAccount();
    var reg = $('acctRegister'), log = $('acctLogin'), sync = $('acctSync'), out = $('acctLogout'), clo = $('acctClose');
    reg.onclick = function () { doSignup(); };
    log.onclick = function () { doSignin(); };
    sync.onclick = function () { G.Account.sync().then(function (r) { renderAccount(); if (G.UI && G.UI.flashText) G.UI.flashText(sync, r && r.ok ? '已同步' : '同步失败'); }); };
    out.onclick = function () { G.Account.signOut().then(renderAccount); };
    clo.onclick = function () { p.style.display = 'none'; };
  }
  function creds() { return { email: $('acctEmail') ? $('acctEmail').value.trim() : '', password: $('acctPw') ? $('acctPw').value : '' }; }
  function doSignup() { var c = creds(); G.Account.register(c.email, c.password).then(function (r) { afterAuth(r); }); }
  function doSignin() { var c = creds(); G.Account.signIn(c).then(afterAuth); }
  function afterAuth(r) {
    renderAccount();
    if (r && !r.ok && G.UI && G.UI.flashText) G.UI.flashText($('acctClose'), r.msg || '操作失败');
  }

  function injectButton() {
    if (!$('btnAccount')) {
      var menu = $('cover-menu') || $('coverMenu');
      if (!menu) return;
      var b = document.createElement('button');
      b.id = 'btnAccount'; b.className = 'btn';
      b.textContent = '账号';
      b.onclick = openPanel;
      menu.appendChild(b);
    }
  }

  function onReady() {
    if (!window.fetch) return;
    restoreSession();
    injectButton();
    /* 关键节点后自动上传（槽位维度） */
    if (G.game && G.game.saveRun && G.Storage && G.Storage.autoSave) {
      var _saveRun = G.game.saveRun;
      G.game.saveRun = function () {
        var r = _saveRun.apply(this, arguments);
        if (G.Account.status === 'online') setTimeout(function () { G.Account.upload(); }, 0);
        return r;
      };
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') onReady();
  else if (document.addEventListener) document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
