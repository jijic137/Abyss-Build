/* ============================================================
   _check_art.js —— 美术资源回归校验（浏览器内）
   校验：所有敌人/武器/角色精灵可编译、每帧 ≥2 色、无页面报错
   用法：node tools/_check_art.js （需要 Playwright + Edge）
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const PLAYWRIGHT = 'C:/Users/ts/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT);

const ROOT = path.normalize(path.join(__dirname, '..'));
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': types[path.extname(fp)] || 'application/octet-stream' });
  res.end(fs.readFileSync(fp));
});

server.listen(8777, '127.0.0.1', async () => {
  let browser;
  let errs = 0;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8777/', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const audit = await page.evaluate(() => {
      const bad = [];
      const enemyCount = Object.keys(G.ENEMY_MAP).length;
      function check(name, frames) {
        frames.forEach((cv, fi) => {
          if (!cv || !cv.width) { bad.push(name + '#' + fi + ':NO_CANVAS'); return; }
          const img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
          let n = 0; const cols = new Set();
          for (let i = 0; i < img.data.length; i += 4) {
            if (img.data[i + 3] < 40) continue;
            n++;
            cols.add(img.data[i] + ',' + img.data[i + 1] + ',' + img.data[i + 2]);
          }
          if (n < 8) bad.push(name + '#' + fi + ':TOO_EMPTY');
          if (cols.size < 2) bad.push(name + '#' + fi + ':1_COLOR');
        });
      }
      for (const id in G.ENEMY_MAP) {
        const def = G.ENEMY_MAP[id];
        check(def.sprite, G.PX.getAnim(def.sprite, def.sc) || [G.PX.get(def.sprite, def.sc)]);
      }
      const icons = [...new Set(G.WEAPONS.map(w => w.icon))];
      icons.forEach(nm => {
        const def = { icon: nm, col: '#c9d4e8' };
        check('w_' + nm, [G.weaponIcon(def, 2, 3)]);
      });
      G.CHARACTERS.forEach(ch => {
        check(ch.sprite, [G.PX.get(ch.sprite, 3)]);
      });
      ['wall_brick', 'wall_pillar', 'wall_ruin', 'wall_panel'].forEach(nm => {
        check(nm, [G.PX.getTint(nm, '#7d8aa8', 3)]);
      });
      return { bad, enemyCount };
    });
    if (audit.bad.length) { errs++; console.log('ART ISSUES:\n' + audit.bad.join('\n')); }
    if (errors.length) { errs++; console.log('PAGE ERRORS:\n' + errors.join('\n')); }
    console.log(errs ? 'FAIL ' + errs : 'ART OK: ' + audit.enemyCount + ' enemies + ' + audit.bad.length + ' issues');
  } catch (e) { console.log('ERR', e && e.stack || e); errs++; }
  finally { if (browser) await browser.close(); server.close(); }
  process.exit(errs ? 1 : 0);
});
