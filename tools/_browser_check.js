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

    /* 撤离 */
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

