/* 真实浏览器自检 v2：真实存档数据 / 读档 / 撤离 / UI 遮挡 / 箱子尺寸
   用法：node tools/_browser_check.js （需要 playwright + Edge，NODE_PATH 指向 .pnpm/node_modules） */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const PLAYWRIGHT = 'C:/Users/ts/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT);

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'cache');
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404); res.end('nf'); return;
  }
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png'
  };
  res.writeHead(200, { 'Content-Type': types[path.extname(fp)] || 'application/octet-stream' });
  res.end(fs.readFileSync(fp));
});

function overlaps(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

server.listen(8765, '127.0.0.1', async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

    await page.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
    await page.waitForTimeout(900);

    /* 预置真实存档数据 */
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (e) {}
      const d = G.Meta.get();
      d.currency = 260;
      d.stash = [
        G.makeWeapon('pistol', 1),
        G.makeItem('iron_plate', 0),
        G.makeItem('bandage', 0),
        G.makeItem('clover', 0),
        G.makeItem('burn_brand', 2),
        G.makeWeapon('smg', 2)
      ];
      d.stashSize = 30;
      d.loadout = {
        w1: G.makeWeapon('knife', 2),
        w2: null,
        armor: G.makeItem('tac_vest', 1),
        trinket1: G.makeItem('lucky_coin', 0),
        trinket2: null,
        relic: G.makeItem('executioner', 4)
      };
      d.tiers = { 1: true, 2: true, 3: true };
      d.stats = { extracts: 2, deaths: 1, itemsExtracted: 5, itemsLost: 3, bestTier: 2, totalEarned: 120, totalSpent: 40, tierCleared: { 1: true } };
      G.Meta.flush();
      G.game.newRun(G.CHAR_BY_ID['knight'], 2);
      G.game.player.maxHp = G.game.player.hp = 1e9;
      G.game.saveRun();
    });
    await page.waitForTimeout(1200);

    /* 读档 */
    const resume = await page.evaluate(() => {
      const snap = G.Save.getRun();
      if (!snap) return { ok: false };
      const r = G.game.resumeRun(snap);
      return { ok: r, tier: G.game.map.tierId, weapons: G.game.player.weapons.length, mods: (G.game.mapMods || []).map(x => x.id) };
    });
    console.log('RESUME ' + JSON.stringify(resume));

    /* UI 遮挡测量 */
    const rects = await page.evaluate(() => {
      function r(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { id, left: b.left, top: b.top, right: b.right, bottom: b.bottom, w: b.width, h: b.height, disp: getComputedStyle(el).display };
      }
      return {
        weaponBar: r('weaponBar'),
        statusBar: r('statusBar'),
        keyHud: r('keyHud'),
        modLine: r('modLine'),
        objLine: r('objLine'),
        interactHint: r('interactHint'),
        minimap: r('minimap'),
        waveBanner: r('waveBanner')
      };
    });
    console.log('RECTS ' + JSON.stringify(rects));

    /* 箱子精灵尺寸 */
    const spr = await page.evaluate(() => {
      const a = G.PX.getTint('crt_gold', '#ffd24a', 3.6);
      const b = G.PX.get('p_crate', 3);
      return { gold: a ? a.width + 'x' + a.height : null, old: b ? b.width + 'x' + b.height : null };
    });
    console.log('SPRITE ' + JSON.stringify(spr));

    /* 新背包/仓库界面渲染 */
    await page.evaluate(() => { G.UI.renderBase(); G.UI.renderMarket(); G.UI.renderBag(); });
    await page.waitForTimeout(400);    /* 全屏布局体检：逐屏开启，检测越界元素 */
    const layout = await page.evaluate(() => {
      const screens = ['scrTitle','scrPause','scrBase','scrMarket','scrMapSelect','scrSettings','scrRecords','scrAch','scrSave','scrResult','scrLevel','scrCharSelect'];
      const vw = window.innerWidth, vh = window.innerHeight;
      const issues = [];
      screens.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('on');
        const bad = [];
        el.querySelectorAll('*').forEach(n => {
          const r = n.getBoundingClientRect();
          if (r.width < 2 && r.height < 2) return;
          if (r.left < -4 || r.top < -4 || r.right > vw + 4 || r.bottom > vh + 4) {
            bad.push((n.id || n.className || n.tagName) + '@' + [r.left.toFixed(0), r.top.toFixed(0), r.right.toFixed(0), r.bottom.toFixed(0)].join(','));
          }
        });
        if (bad.length) issues.push({ screen: id, bad: bad.slice(0, 8) });
        el.classList.remove('on');
      });
      return issues;
    });
    console.log('LAYOUT ' + JSON.stringify(layout));
    if (layout.length) throw new Error('布局越界 ' + JSON.stringify(layout));    /* 关键界面截图（供人工审阅） */
    await page.evaluate(() => { document.getElementById('scrBase').classList.add('on'); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '10_base.png') });
    await page.evaluate(() => {
      document.getElementById('scrBase').classList.remove('on');
      document.getElementById('scrMarket').classList.add('on');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '11_market.png') });
    await page.evaluate(() => {
      document.getElementById('scrMarket').classList.remove('on');
      document.getElementById('scrMapSelect').classList.add('on');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '12_mapselect.png') });
    await page.evaluate(() => { document.getElementById('scrMapSelect').classList.remove('on'); });    /* 穿墙/瞬移实机验证：顶墙跑 1.2s */
    await page.evaluate(() => {
      const g = G.game, m = g.map;
      const SEG = G.Map.SEG, ROOM = G.Map.ROOM;
      let wall = null;
      for (let c = 0; c < m.cols - 1 && !wall; c++) {
        for (let r = 0; r < m.rows; r++) {
          if (!m.doorsH[c][r]) { wall = { x: (c + 1) * SEG, y: G.Map.roomRect(c, r).y0 + ROOM / 2 }; break; }
        }
      }
      window._wallX = wall ? wall.x : 0;
      if (wall) { g.player.x = wall.x - 20; g.player.y = wall.y; g.player.vx = 0; g.player.vy = 0; }
      window._wallStart = g.player.x;
    });
    await page.keyboard.down('d');
    await page.waitForTimeout(1200);
    await page.keyboard.up('d');
    const wallEnd = await page.evaluate(() => ({ x: G.game.player.x, start: window._wallStart, wallX: window._wallX }));
    const wallOk = wallEnd.wallX > 0 && wallEnd.x <= wallEnd.wallX - 14 + 3 && Math.abs(wallEnd.x - wallEnd.start) < 80;
    console.log('WALLTEST ' + JSON.stringify(wallEnd) + ' ok=' + wallOk);
    if (!wallOk) throw new Error('穿墙或瞬移');    /* 背包浮层与撤离抉择面板截图 */
    await page.evaluate(() => { G.UI.toggleBag(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '13_bag.png') });
    await page.evaluate(() => { G.UI.toggleBag(); });
    await page.evaluate(() => {
      const g = G.game;
      g.map.eliteKills = 1;
      g.map.time = 999;
      g.checkObjective();
      g.player.x = g.map.extract.x;
      g.player.y = g.map.extract.y;
      g.tryInteract();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '14_flow.png') });
    await page.evaluate(() => { G.UI.closeFlow(); });    /* 撤离 */
    await page.evaluate(() => {
      const g = G.game;
      g.map.eliteKills = 1;
      g.map.time = 999;
      g.checkObjective();
      g.player.x = g.map.extract.x;
      g.player.y = g.map.extract.y;
      g.tryInteract();
      if (G.UI._flowOpen) g.extractNow();
    });
    await page.waitForTimeout(4200);
    const result = await page.evaluate(() => ({
      state: G.game.state,
      resultOn: document.getElementById('scrResult').classList.contains('on'),
      title: document.getElementById('resultTitle').textContent
    }));
    console.log('RESULT ' + JSON.stringify(result));
    console.log('ERRORS ' + JSON.stringify(errors));
    await browser.close();
    server.close();
    process.exit(0);
  } catch (e) {
    console.error('FATAL ' + (e && e.stack || e));
    if (browser) await browser.close().catch(() => {});
    server.close();
    process.exit(1);
  }
});

/* 测试用：T2 目标改为已杀精英 */

