/* ============================================================
   _gen_aiart.js —— 程序化像素美术资产生成器
   生成 assets/art/ai/ 下缺失的背景图 / 立绘（本地像素风格，无外部依赖）
   用法：node tools/_gen_aiart.js   （需要 Playwright + Edge）
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const PLAYWRIGHT = 'C:/Users/ts/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT);

const ROOT = path.normalize(path.join(__dirname, '..'));
const OUT = path.join(ROOT, 'assets', 'art', 'ai');
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': types[path.extname(fp)] || 'application/octet-stream' });
  res.end(fs.readFileSync(fp));
});

const GEN = `
  function scene(w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    return { cv, c, w, h };
  }
  function px(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x, y, s, s); }
  function dither(c, w, h, c1, c2, step) {
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
      px(c, x, y, step, ((x / step + y / step) % 2 === 0) ? c1 : c2);
    }
  }
  function glow(c, x, y, col, r, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = a == null ? 0.5 : a;
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  function spr(c, name, col, x, y, scale) {
    const cv = G.PX.getTint(name, col, scale);
    if (!cv) return;
    G.PX.draw(c, cv, x, y, { alpha: 0.95 });
  }
  function floor(c, zone, w, h) {
    const bio = G.Art.getBiome(zone);
    const t = bio && G.PX.getTint(bio.floor, bio.floorCol, 3);
    dither(c, w, h, 'rgba(10,12,18,1)', 'rgba(12,14,22,1)', 4);
    if (!t) return;
    for (let y = 24; y < h; y += 36) for (let x = 8; x < w; x += 36) {
      c.globalAlpha = 0.32;
      c.drawImage(t, x - t.width / 2, y - t.height / 2);
    }
    c.globalAlpha = 1;
  }
  function vignette(c, w, h, col) {
    const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col || 'rgba(0,0,0,0.66)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  function scatter(c, zone, n, x0, y0, x1, y1, seed) {
    const names = Object.keys(G.Art.envSprites);
    for (let i = 0; i < n; i++) {
      const h1 = ((seed * 374761393 + i * 104729) & 0x7fffffff) / 0x7fffffff;
      const h2 = ((seed * 668265263 + i * 7919) & 0x7fffffff) / 0x7fffffff;
      const x = x0 + h1 * (x1 - x0), y = y0 + h2 * (y1 - y0);
      const name = names[(i * 3 + zone) % names.length];
      const col = G.Art.envColors[name];
      const sc = 2 + (h1 > 0.75 ? 1 : 0);
      spr(c, G.Art.envSprites[name], col, x, y, sc);
    }
  }
  function portrait(c, sprite, sc, w, h, glowCol, floorCol) {
    dither(c, w, h, '#0d0f18', '#10131e', 4);
    glow(c, w / 2, h * 0.58, glowCol, w * 0.5, 0.34);
    const cv = G.PX.get(sprite, sc);
    if (cv) {
      c.drawImage(cv, w / 2 - cv.width / 2, h * 0.62 - cv.height / 2);
      glow(c, w / 2, h * 0.62, glowCol, cv.width * 0.8, 0.25);
    }
    const g = c.createLinearGradient(0, h * 0.72, 0, h);
    g.addColorStop(0, 'rgba(8,9,15,0)'); g.addColorStop(1, 'rgba(8,9,15,0.92)');
    c.fillStyle = g; c.fillRect(0, h * 0.72, w, h * 0.28);
    vignette(c, w, h);
  }
  window.__gen = {
    tier: function (zone) {
      const s = scene(640, 360);
      floor(s.c, zone, 640, 360);
      const top = s.c.createLinearGradient(0, 0, 0, 190);
      const zc = G.TIER_MAP[zone].col;
      top.addColorStop(0, zc + '33'); top.addColorStop(1, 'rgba(0,0,0,0)');
      s.c.fillStyle = top; s.c.fillRect(0, 0, 640, 190);
      scatter(s.c, zone, 26, 30, 60, 610, 330, 7 + zone * 131);
      glow(s.c, 320, 150, zc, 190, 0.18);
      vignette(s.c, 640, 360);
      return s.cv;
    },
    boss: function (sprite, col) {
      const s = scene(232, 310);
      portrait(s.c, sprite, 9, 232, 310, col, null);
      return s.cv;
    },
    elite: function (sprite, col) {
      const s = scene(232, 310);
      portrait(s.c, sprite, 11, 232, 310, col, null);
      return s.cv;
    },
    camp: function () {
      const s = scene(640, 360);
      floor(s.c, 1, 640, 360);
      scatter(s.c, 1, 10, 20, 90, 620, 330, 5);
      glow(s.c, 320, 250, '#ffb347', 150, 0.20);
      glow(s.c, 90, 240, '#ffb347', 80, 0.28);
      glow(s.c, 550, 240, '#ffb347', 80, 0.28);
      spr(s.c, 'env_torch', '#ffb347', 90, 250, 3);
      spr(s.c, 'env_torch', '#ffb347', 550, 250, 3);
      spr(s.c, 'env_rubble', '#8a8fa8', 320, 290, 3);
      spr(s.c, 'env_rubble', '#8a8fa8', 280, 300, 2);
      const g = s.c.createLinearGradient(0, 0, 0, 360);
      g.addColorStop(0, 'rgba(10,8,6,0.72)'); g.addColorStop(1, 'rgba(8,7,5,0.9)');
      s.c.fillStyle = g; s.c.fillRect(0, 0, 640, 360);
      vignette(s.c, 640, 360, 'rgba(0,0,0,0.7)');
      return s.cv;
    },
    market: function () {
      const s = scene(640, 360);
      floor(s.c, 2, 640, 360);
      scatter(s.c, 2, 8, 20, 100, 620, 330, 11);
      const g = s.c.createLinearGradient(0, 40, 0, 190);
      g.addColorStop(0, '#2a2440'); g.addColorStop(1, '#16121f');
      s.c.fillStyle = g; s.c.fillRect(0, 40, 640, 150);
      for (let i = 0; i < 8; i++) {
        s.c.fillStyle = i % 2 ? '#8f4fd6' : '#d8a03a';
        s.c.fillRect(20 + i * 80, 40, 40, 18);
      }
      s.c.fillStyle = '#3a344d'; s.c.fillRect(20, 190, 600, 8);
      for (let i = 0; i < 4; i++) {
        s.c.fillStyle = '#26202f'; s.c.fillRect(40 + i * 150, 220, 110, 100);
        s.c.fillStyle = '#6f5a2f'; s.c.fillRect(48 + i * 150, 230, 94, 70);
      }
      glow(s.c, 320, 120, '#ffd24a', 120, 0.22);
      spr(s.c, 'env_crystal', '#3bd6ff', 60, 300, 2);
      spr(s.c, 'env_crystal', '#c07fff', 590, 300, 2);
      vignette(s.c, 640, 360);
      return s.cv;
    },
    records: function () {
      const s = scene(640, 360);
      const g = s.c.createLinearGradient(0, 0, 0, 360);
      g.addColorStop(0, '#1a1a28'); g.addColorStop(1, '#10101a');
      s.c.fillStyle = g; s.c.fillRect(0, 0, 640, 360);
      dither(s.c, 640, 360, 'rgba(26,26,40,1)', 'rgba(22,22,34,1)', 4);
      for (let r = 0; r < 3; r++) for (let col = 0; col < 4; col++) {
        const x = 60 + col * 150, y = 50 + r * 100;
        s.c.fillStyle = '#262636'; s.c.fillRect(x, y, 120, 80);
        s.c.strokeStyle = '#3a3a52'; s.c.lineWidth = 2; s.c.strokeRect(x + 1, y + 1, 118, 78);
        s.c.fillStyle = '#8f8fae';
        s.c.fillRect(x + 14, y + 18, 92, 10);
        s.c.fillRect(x + 14, y + 38, 70, 6);
        s.c.fillRect(x + 14, y + 52, 80, 6);
        s.c.fillStyle = '#d8a03a';
        s.c.fillRect(x + 100, y + 8, 10, 10);
      }
      glow(s.c, 320, 60, '#7fa8ff', 160, 0.12);
      vignette(s.c, 640, 360);
      return s.cv;
    },
    altar: function () {
      const s = scene(640, 360);
      floor(s.c, 3, 640, 360);
      scatter(s.c, 3, 12, 20, 80, 620, 330, 17);
      for (let i = 0; i < 3; i++) {
        s.c.fillStyle = '#3a3f58'; s.c.fillRect(285 + i * 24, 210, 24, 80);
      }
      s.c.fillStyle = '#4a5068'; s.c.fillRect(260, 200, 122, 16);
      glow(s.c, 320, 190, '#c07fff', 130, 0.42);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        s.c.fillStyle = i % 2 ? '#c07fff' : '#7d5fd8';
        s.c.fillRect(320 + Math.cos(a) * 90 - 4, 195 + Math.sin(a) * 90 - 4, 8, 8);
      }
      vignette(s.c, 640, 360, 'rgba(0,0,0,0.62)');
      return s.cv;
    },
    rift: function () {
      const s = scene(640, 360);
      dither(s.c, 640, 360, '#0c0a18', '#100c20', 4);
      glow(s.c, 320, 180, '#8f4aff', 240, 0.55);
      glow(s.c, 320, 180, '#c07fff', 130, 0.5);
      for (let i = 0; i < 6; i++) {
        s.c.strokeStyle = i % 2 ? 'rgba(192,127,255,0.8)' : 'rgba(143,74,255,0.7)';
        s.c.lineWidth = 3;
        s.c.beginPath();
        s.c.arc(320, 180, 60 + i * 26, 0, Math.PI * 2);
        s.c.stroke();
      }
      for (let i = 0; i < 40; i++) {
        const h1 = ((i * 104729 + 13) & 0x7fffffff) / 0x7fffffff;
        const h2 = ((i * 7919 + 29) & 0x7fffffff) / 0x7fffffff;
        const x = 320 + (h1 - 0.5) * 520, y = 180 + (h2 - 0.5) * 300;
        s.c.fillStyle = h1 > 0.5 ? '#c07fff' : '#7d5fd8';
        s.c.fillRect(x, y, 3, 3);
      }
      vignette(s.c, 640, 360, 'rgba(0,0,0,0.55)');
      return s.cv;
    },
    result: function (win) {
      const s = scene(640, 360);
      dither(s.c, 640, 360, win ? '#1a1408' : '#140a0c', win ? '#241c0c' : '#1c0e12', 4);
      glow(s.c, 320, 90, win ? '#ffd24a' : '#ff4a5a', 260, win ? 0.5 : 0.34);
      glow(s.c, 320, 320, win ? '#b8860b' : '#7a1420', 200, 0.28);
      const g = s.c.createLinearGradient(0, 0, 0, 360);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.82)');
      s.c.fillStyle = g; s.c.fillRect(0, 0, 640, 360);
      return s.cv;
    }
  };
`;

const JOBS = [
  { dir: 'tiers', file: 'tier1_fringe.png', fn: 'tier(1)' },
  { dir: 'tiers', file: 'tier2_corridor.png', fn: 'tier(2)' },
  { dir: 'tiers', file: 'tier3_mine.png', fn: 'tier(3)' },
  { dir: 'tiers', file: 'tier4_heartland.png', fn: 'tier(4)' },
  { dir: 'tiers', file: 'tier5_gate.png', fn: 'tier(5)' },
  { dir: 'boss', file: 'boss1_behemoth.png', fn: "boss('boss_behemoth','#ff5a7a')" },
  { dir: 'boss', file: 'boss2_abyss.png', fn: "boss('boss_abyss','#8f4aff')" },
  { dir: 'elites', file: 'el1_warden.png', fn: "elite('el_warden','#7fffd6')" },
  { dir: 'elites', file: 'el2_ironclad.png', fn: "elite('el_ironclad','#7fd8ff')" },
  { dir: 'elites', file: 'el3_butcher.png', fn: "elite('el_butcher','#ff5a5a')" },
  { dir: 'elites', file: 'el4_hexer.png', fn: "elite('el_hexer','#b06fff')" },
  { dir: 'elites', file: 'el5_brood.png', fn: "elite('el_brood','#ffe08a')" },
  { dir: 'elites', file: 'el6_reaper.png', fn: "elite('el_reaper','#ff3b6b')" },
  { dir: 'events', file: 'event_altar.png', fn: 'altar()' },
  { dir: 'events', file: 'portal_rift.png', fn: 'rift()' },
  { dir: 'base', file: 'base_camp.png', fn: 'camp()' },
  { dir: 'market', file: 'market_stall.png', fn: 'market()' },
  { dir: 'records', file: 'records_wall.png', fn: 'records()' },
  { dir: 'result', file: 'result_win.png', fn: 'result(true)' },
  { dir: 'result', file: 'result_lose.png', fn: 'result(false)' }
];

server.listen(8775, '127.0.0.1', async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8775/', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.addScriptTag({ content: GEN });
    let ok = 0;
    for (const job of JOBS) {
      const dataUrl = await page.evaluate((fn) => {
        const cv = eval('window.__gen.' + fn);
        return cv.toDataURL('image/png');
      }, job.fn);
      const dir = path.join(OUT, job.dir);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, job.file), Buffer.from(dataUrl.split(',')[1], 'base64'));
      ok++;
    }
    console.log('GENERATED ' + ok + '/' + JOBS.length + ' assets, errors=' + JSON.stringify(errors));
  } catch (e) { console.log('ERR', e && e.stack || e); }
  finally { if (browser) await browser.close(); server.close(); }
});
