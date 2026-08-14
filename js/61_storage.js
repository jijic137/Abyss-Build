/* ============================================================
   61_storage.js —— 统一持久化层（为账号体系预留）

   设计：
   - 档案模型 PlayerProfile：meta（仓库/货币/装备/解锁/统计）
     + best（记录/成就/统计）+ settings + run（进行中战局）
   - 存储后端抽象 G.Storage.backend：当前 LocalStorage 后端，
     未来可替换为远程后端（云端存档 / 账号绑定）。
   - 版本迁移 migrate()：schema 升级时逐级迁移，旧数据无缝升级。
   - 导出 / 导入：完整档案 JSON（跨设备备份、迁移、云同步的载体）。
   - 合并策略 mergeProfiles()：未来云端冲突解决（较新者胜 / 字段级合并）。
   - 账号占位 G.Account：定义未来接入的接口契约（signIn/upload/download...），
     当前返回「未接入」并保留本地存档可用。

   向后兼容：不改动现有 localStorage key 与 G.Save / G.Meta 的读写语义。
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;
  var LS = typeof localStorage !== 'undefined' ? localStorage : null;

  /* ------------------------------------------------------------
     1. 设备标识（本地持久，跨导入保留）
     ------------------------------------------------------------ */
  var DEV_KEY = 'abyss_hunter_device';
  var _device = null;
  G.deviceId = function () {
    if (_device) return _device;
    try {
      _device = LS && LS.getItem(DEV_KEY);
      if (!_device) {
        _device = 'dev_' + Math.random().toString(36).slice(2, 10) +
          Date.now().toString(36);
        if (LS) LS.setItem(DEV_KEY, _device);
      }
    } catch (e) {
      _device = 'dev_mem_' + Math.random().toString(36).slice(2, 10);
    }
    return _device;
  };

  /* ------------------------------------------------------------
     2. 版本与迁移
     ------------------------------------------------------------ */
  var SCHEMA = 2;                     // 当前档案结构版本
  var APP = 'abyss-hunter';

  /**
   * 迁移任意输入 → 标准化档案文档。
   * 支持：
   *   - 本游戏导出的档案（schema 2）
   *   - 旧版平铺 meta JSON（仅含 meta 字段）
   *   - 旧版平铺 best JSON（含 settings/bestWave 等）
   */
  function migrate(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var doc = {
      app: APP,
      schema: SCHEMA,
      device: raw.device || G.deviceId(),
      exportedAt: raw.exportedAt || new Date().toISOString(),
      profile: {
        meta: {},
        best: {},
        settings: {},
        run: null
      }
    };

    if (raw.profile && typeof raw.profile === 'object') {
      // 本游戏导出格式（含未来更高 schema 的字段，此处只接管已知部分）
      doc.profile.meta = raw.profile.meta || {};
      doc.profile.best = raw.profile.best || {};
      doc.profile.settings = raw.profile.settings || raw.profile.best.settings || {};
      doc.profile.run = raw.profile.run || null;
      // 若旧 schema 把 settings 挂在 best 里，抽出来
      if (doc.profile.best.settings && !raw.profile.settings) {
        doc.profile.settings = doc.profile.best.settings;
        delete doc.profile.best.settings;
      }
    } else {
      // 平铺旧数据：按特征归类
      if ('stash' in raw || 'currency' in raw || 'loadout' in raw) {
        doc.profile.meta = raw;
      }
      if ('settings' in raw || 'bestWave' in raw || 'achievements' in raw) {
        doc.profile.best = raw;
        if (raw.settings) {
          doc.profile.settings = raw.settings;
          delete doc.profile.best.settings;
        }
      }
      if ('run' in raw) doc.profile.run = raw.run;
    }

    /* 保证各分区至少为对象 */
    doc.profile.meta = doc.profile.meta || {};
    doc.profile.best = doc.profile.best || {};
    doc.profile.settings = doc.profile.settings || {};

    /* 未来扩展点：schema 3+ 的逐级迁移在此追加 */
    return doc;
  }

  /* ------------------------------------------------------------
     3. 当前档案读取（权威来源：G.Save / G.Meta 的内存态）
     ------------------------------------------------------------ */
  function currentProfile() {
    G.Save.flush();
    G.Meta.flush();
    var best = G.Save.get();
    var meta = G.Meta.get();
    return {
      meta: meta,
      best: best,
      settings: best.settings || {},
      run: best.run || null
    };
  }

  /* ------------------------------------------------------------
     4. 合并策略（未来云同步冲突解决）
     ------------------------------------------------------------ */
  function tsOf(p) {
    var t = (p && p.meta && p.meta.updatedAt) || 0;
    return t;
  }

  /**
   * 合并两份档案。
   * strategy:
   *   'newer'  —— 整体以较新者为准（默认）
   *   'merge'  —— 字段级合并：成就/解锁取并集，数值统计取最大值，
   *               货币取较新者，仓库/装备/战局取较新者
   */
  function mergeProfiles(a, b, strategy) {
    if (!a) return b;
    if (!b) return a;
    if (strategy !== 'merge') {
      return tsOf(b) >= tsOf(a) ? b : a;
    }
    var out = JSON.parse(JSON.stringify(a));
    var bm = b.meta || {}, am = a.meta || {};
    var bb = b.best || {}, ab = a.best || {};

    /* stats：数值取大，其余以较新者为准 */
    function mergeStats(x, y) {
      var r = {};
      var keys = {};
      for (var k in x) keys[k] = 1;
      for (var k2 in y) keys[k2] = 1;
      for (var kk in keys) {
        var vx = x[kk], vy = y[kk];
        if (typeof vx === 'number' && typeof vy === 'number') r[kk] = Math.max(vx, vy);
        else r[kk] = vy != null ? vy : vx;
      }
      return r;
    }
    function union(x, y) {
      var r = {};
      for (var k in x) r[k] = x[k];
      for (var k2 in y) if (!r[k2]) r[k2] = y[k2];
      return r;
    }

    out.meta = am;
    out.meta.stats = mergeStats(am.stats || {}, bm.stats || {});
    out.meta.tiers = union(am.tiers || {}, bm.tiers || {});
    out.meta.achievements = union(am.achievements || {}, bm.achievements || {});
    out.meta.currency = tsOf(b) >= tsOf(a)
      ? (bm.currency != null ? bm.currency : am.currency)
      : (am.currency != null ? am.currency : bm.currency);
    out.meta.stash = tsOf(b) >= tsOf(a) ? (bm.stash || []) : (am.stash || []);
    out.meta.loadout = tsOf(b) >= tsOf(a) ? (bm.loadout || {}) : (am.loadout || {});
    out.meta.shop = tsOf(b) >= tsOf(a) ? (bm.shop || null) : (am.shop || null);
    out.meta.stashSize = Math.max(am.stashSize || 0, bm.stashSize || 0);
    out.meta.expansions = Math.max(am.expansions || 0, bm.expansions || 0);
    out.meta.updatedAt = Math.max(am.updatedAt || 0, bm.updatedAt || 0);

    out.best = ab;
    out.best.stats = mergeStats(ab.stats || {}, bb.stats || {});
    out.best.achievements = union(ab.achievements || {}, bb.achievements || {});
    out.best.bestWave = Math.max(ab.bestWave || 0, bb.bestWave || 0);
    out.best.bestKills = Math.max(ab.bestKills || 0, bb.bestKills || 0);
    out.best.updatedAt = Math.max(ab.updatedAt || 0, bb.updatedAt || 0);

    out.settings = tsOf(b) >= tsOf(a) ? (b.settings || {}) : (a.settings || {});
    out.run = tsOf(b) >= tsOf(a) ? (b.run || null) : (a.run || null);
    return out;
  }

  /* ------------------------------------------------------------
     5. 写入后端
     ------------------------------------------------------------ */
  function writeProfile(profile) {
    var meta = profile.meta || {};
    var best = profile.best || {};
    best.settings = profile.settings || best.settings || {};
    /* 通过 G.Save / G.Meta 的公共接口写入，保证与游戏内缓存一致 */
    var d = G.Meta.get();
    for (var mk in meta) d[mk] = meta[mk];
    G.Meta.flush();

    var b = G.Save.get();
    for (var bk in best) b[bk] = best[bk];
    b.run = profile.run || null;
    G.Save.flush();
  }

  /* ------------------------------------------------------------
     6. 导出 / 导入 / 重置
     ------------------------------------------------------------ */
  G.Storage = {
    SCHEMA: SCHEMA,
    app: APP,

    profile: currentProfile,

    /** 导出完整档案（便携 JSON 文档） */
    exportProfile: function () {
      var p = currentProfile();
      return JSON.stringify({
        app: APP,
        schema: SCHEMA,
        device: G.deviceId(),
        exportedAt: new Date().toISOString(),
        profile: p
      }, null, 2);
    },

    /** 导入档案；opts.merge: 'replace'（默认，整体覆盖）| 'newer' | 'merge' */
    importProfile: function (json, opts) {
      opts = opts || {};
      if (!json || typeof json !== 'string') return { ok: false, msg: '数据为空' };
      var raw;
      try { raw = JSON.parse(json); }
      catch (e) { return { ok: false, msg: '不是有效的 JSON 文件' }; }

      var doc = migrate(raw);
      if (!doc) return { ok: false, msg: '无法识别的存档格式' };
      if (doc.app && doc.app !== APP && opts.strict !== false) {
        return { ok: false, msg: '不是本游戏的存档文件' };
      }

      var incoming = doc.profile;
      var strategy = opts.merge || 'replace';
      var finalProfile;
      if (strategy === 'replace') {
        finalProfile = incoming;
      } else {
        finalProfile = mergeProfiles(currentProfile(), incoming, strategy);
      }

      writeProfile(finalProfile);
      /* 清空缓存，下次读取直接反映导入结果 */
      G.Save.reload();
      G.Meta.reload();
      return { ok: true, strategy: strategy, device: doc.device };
    },

    /** 重置游戏数据（保留设备标识；opts.keepSettings 保留设置） */
    resetProfile: function (opts) {
      opts = opts || {};
      var keepSettings = !!opts.keepSettings;
      var settings = keepSettings ? (G.Save.get().settings || {}) : null;
      var meta = {
        v: 1, currency: 60, stash: [], stashSize: 30,
        loadout: { w1: null, w2: null, armor: null, trinket1: null, trinket2: null, relic: null },
        tiers: { 1: true },
        stats: { extracts: 0, deaths: 0, itemsExtracted: 0, itemsLost: 0, bestTier: 0, totalEarned: 0, totalSpent: 0 },
        expansions: 0, shop: null
      };
      writeProfile({ meta: meta, best: {}, settings: settings || {}, run: null });
      G.Save.reload();
      G.Meta.reload();
      return { ok: true, keepSettings: keepSettings };
    },

    /** 档案摘要（数据管理页展示） */
    summary: function () {
      var p = currentProfile();
      var m = p.meta || {};
      var st = p.best.stats || {};
      var r = p.run;
      return {
        device: G.deviceId(),
        exportedAt: new Date().toISOString(),
        currency: m.currency || 0,
        stash: Array.isArray(m.stash) ? m.stash.length : 0,
        stashSize: m.stashSize || 30,
        bestSublevel: m.stats ? (m.stats.bestSublevel || 0) : 0,
        extracts: m.stats ? (m.stats.extracts || 0) : 0,
        deaths: m.stats ? (m.stats.deaths || 0) : 0,
        totalEarned: m.stats ? (m.stats.totalEarned || 0) : 0,
        lastSave: p.best.updatedAt || m.updatedAt || null,
        running: !!r
      };
    },

    /** 存储环境说明（数据页展示：数据在哪、会不会丢） */
    originInfo: function () {
      var proto = '';
      var href = '';
      try {
        proto = window.location.protocol;
        href = window.location.href;
      } catch (e) { /* 无 window */ }
      var lsOk = false;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('__abyss_probe', '1');
          localStorage.removeItem('__abyss_probe');
          lsOk = true;
        }
      } catch (e) { lsOk = false; }
      return {
        protocol: proto || 'unknown',
        isFile: proto === 'file:',
        isHttp: proto === 'http:' || proto === 'https:',
        href: href,
        localStorageOk: lsOk,
        note: proto === 'file:'
          ? '当前是直接打开 index.html（file://）。数据保存在这个浏览器的本地存储中（绑定 file:// 来源）。只要固定用同一个浏览器、同一个文件路径打开，不清除浏览数据、不用无痕模式，数据就不会丢。'
          : '当前通过 ' + (proto || '?') + ' 打开，数据保存在该来源的浏览器本地存储中。注意：文件方式与本地服务器方式是两套独立存储，互不共享。'
      };
    },

    mergeProfiles: mergeProfiles,
    migrate: migrate
  };

  /* ------------------------------------------------------------
     7. 账号体系占位（未来接入契约）

     未来的远程实现应保持相同接口：
       G.Account.status      -> 'local' | 'guest' | 'online'
       G.Account.provider    -> null | 'server' | 'steam' ...
       G.Account.signIn(opts)   -> Promise<{ok, profile?}>
       G.Account.signOut()      -> Promise<void>
       G.Account.upload()       -> Promise<{ok}>   上传本地档案
       G.Account.download()     -> Promise<{ok, profile?}> 拉取云端档案
       G.Account.sync()         -> Promise<{ok, strategy}> 双向同步（冲突合并）

     同步约定：
       - 登录成功后：download() 远端档案 → mergeProfiles(本地, 远端, 'merge')
         → writeProfile → upload()。
       - 每次关键节点（撤离/死亡/手动存档）后调用 upload()（防抖）。
     ------------------------------------------------------------ */
  G.Account = {
    status: 'local',
    provider: null,
    signIn: function () {
      return Promise.reject(new Error('账号系统未接入：本地存档模式运行中'));
    },
    signOut: function () {
      return Promise.resolve();
    },
    upload: function () {
      return Promise.resolve({ ok: false, reason: 'no-provider' });
    },
    download: function () {
      return Promise.resolve({ ok: false, reason: 'no-provider' });
    },
    sync: function () {
      return Promise.resolve({ ok: false, reason: 'no-provider' });
    }
  };

  /* ------------------------------------------------------------
     8. 跨标签页同步：另一标签写入后自动刷新缓存
     ------------------------------------------------------------ */
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', function (e) {
      if (!e || !e.key) return;
      if (e.key === 'abyss_hunter_meta_v1' || e.key === 'abyss_hunter_best_v1') {
        G.Save.reload();
        G.Meta.reload();
        if (G.UI && G.UI.refreshAfterExternalChange) G.UI.refreshAfterExternalChange();
      }
    });
  }

})();
