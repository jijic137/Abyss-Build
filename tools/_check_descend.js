/* 层间整备浏览器诊断：流面板渲染 + descend 链路 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/ts/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const ROOT = path.join(__dirname, '..');
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': types[path.extname(fp)] || 'application/octet-stream' });
  res.end(fs.readFileSync(fp));
});

server.listen(8766, '127.0.0.1', async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8766/', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (e) {}
      const d = G.Meta.get();
      d.currency = 60; d.stash = []; d.stashSize = 30;
      d.loadout = { w1: null, w2: null, armor: null, trinket1: null, trinket2: null, relic: null };
      d.tiers = { 1: true, 2: true };
      d.stats = { extracts: 0, deaths: 0, itemsExtracted: 0, itemsLost: 0, bestTier: 0, totalEarned: 0, totalSpent: 0, tierCleared: {} };
      G.Meta.flush();
      G.game.newRun(G.CHAR_BY_ID['knight'], 2);
      G.game.player.maxHp = G.game.player.hp = 1e9;
    });
    await page.waitForTimeout(800);

    /* 开流面板 */
    const flow = await page.evaluate(() => {
      const g = G.game;
      g.map.eliteKills = 1; g.map.time = 999; g.checkObjective();
      g.player.x = g.map.extract.x; g.player.y = g.map.extract.y;
      g.tryInteract();
      const panel = document.getElementById('flowPanel');
      const box = document.getElementById('flowBox');
      const cards = box ? box.querySelectorAll('div') : [];
      const cardInfo = [];
      for (let i = 0; i < cards.length; i++) {
        cardInfo.push((cards[i].style.cursor || 'no') + ':' + (cards[i].textContent || '').slice(0, 10));
      }
      return {
        flowOpen: !!G.UI._flowOpen,
        panelDisplay: panel ? getComputedStyle(panel).display : 'none',
        boxChildren: box ? box.children.length : -1,
        cardInfo: cardInfo.slice(0, 6)
      };
    });
    console.log('FLOW ' + JSON.stringify(flow));

    /* 直接 descend */
    const prep = await page.evaluate(() => {
      const g = G.game;
      let err = null;
      try { g.descend(); } catch (e) { err = e.message; }
      const bar = document.getElementById('bagPrepBar');
      return {
        err: err,
        pending: !!g._pendingDescend,
        state: g.state,
        tier: g.map.tierId,
        bagOpen: !document.getElementById('scrBag').classList.contains('hidden'),
        bar: !!bar,
        barDisplay: bar ? getComputedStyle(bar).display : 'none',
        barText: bar ? bar.textContent : '',
        bagLen: g.bag.length,
        weapons: g.player.weapons.length,
        items: g.player.items.length
      };
    });
    console.log('PREP ' + JSON.stringify(prep));

    const go = await page.evaluate(() => {
      const g = G.game;
      let err = null;
      try { g.beginNextFloor(); } catch (e) { err = e.message; }
      return { err: err, state: g.state, pending: !!g._pendingDescend, tier: g.map.tierId };
    });
    console.log('PREPGO ' + JSON.stringify(go));
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
