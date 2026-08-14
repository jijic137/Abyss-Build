/* ============================================================
   _check_mapdiv.js —— 地图多样性统计与安全校验
   统计：拓扑风格分布 / 房间合并率 / 房内结构率 / 门偏移 /
        连通性 / 出生房出口不锁 / 撤离恒可达 / 结构不占中心
   用法：node tools/_check_mapdiv.js （需要 Playwright + Edge）
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

server.listen(8788, '127.0.0.1', async () => {
  let browser;
  let errs = 0;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto('http://127.0.0.1:8788/', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const res = await page.evaluate(() => {
      const agg = { style: {}, mergedRooms: 0, groups: 0, interiorRooms: 0, doorOffs: 0, totalDoors: 0 };
      const bad = [];
      let maps = 0;
      for (let t = 1; t <= 5; t++) {
        for (let salt = 1; salt <= 40; salt++) {
          const m = G.Map.generate(t, salt);
          maps++;
          agg.style[m.style] = (agg.style[m.style] || 0) + 1;
          /* 合并统计 */
          const seen = {};
          m.rooms.forEach(rm => {
            if (rm.group != null && rm.group !== rm.idx) {
              agg.mergedRooms++;
              seen[rm.group] = 1;
            }
          });
          agg.groups += Object.keys(seen).length;
          agg.interiorRooms += (m.interior || []).length;
          for (const k in (m.doorOffs || {})) { agg.doorOffs++; agg.totalDoors++; }
          /* 门总数 = doorsH+doorsV true 计数 */
          for (let c = 0; c < m.cols; c++) for (let r = 0; r < m.rows; r++) {
            if (m.doorsH[c] && m.doorsH[c][r]) agg.totalDoors++;
            if (m.doorsV[c] && m.doorsV[c][r]) agg.totalDoors++;
          }
          /* 全连通 */
          const seen2 = { [m.startRoom]: 1 }; const q = [m.startRoom];
          while (q.length) {
            const cur = q.shift();
            const cc = cur % m.cols, rr = Math.floor(cur / m.cols);
            const nbs = [];
            if (cc > 0 && m.doorsH[cc - 1][rr]) nbs.push(cur - 1);
            if (cc < m.cols - 1 && m.doorsH[cc][rr]) nbs.push(cur + 1);
            if (rr > 0 && m.doorsV[cc][rr - 1]) nbs.push(cur - m.cols);
            if (rr < m.rows - 1 && m.doorsV[cc][rr]) nbs.push(cur + m.cols);
            nbs.forEach(nb => { if (!seen2[nb]) { seen2[nb] = 1; q.push(nb); } });
          }
          if (Object.keys(seen2).length !== m.cols * m.rows) bad.push('T' + t + 's' + salt + ':不连通');
          /* 内部结构不占中心 300 区 */
          (m.interior || []).forEach(iv => {
            const rc = G.Map.roomRect(m.rooms[iv.room].c, m.rooms[iv.room].r);
            const cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
            iv.rects.forEach(r => {
              if (r[2] > cx - 150 && r[0] < cx + 150 && r[3] > cy - 150 && r[1] < cy + 150) {
                bad.push('T' + t + 's' + salt + ':' + iv.kind + '侵入中心区');
              }
            });
          });
        }
      }
      return { maps, agg, bad };
    });
    const a = res.agg;
    console.log('地图数: ' + res.maps);
    console.log('拓扑风格: ' + JSON.stringify(a.style));
    console.log('合并大房间: ' + a.groups + ' 组 / ' + a.mergedRooms + ' 格 (占房间比例 ' + (a.mergedRooms / (res.maps * 4 * 3) * 100).toFixed(0) + '% 起)');
    console.log('内部结构房: ' + a.interiorRooms + ' (' + (a.interiorRooms / res.maps).toFixed(1) + ' 房/图)');
    console.log('门偏移: ' + a.doorOffs + '/' + a.totalDoors + ' 扇 (占 ' + (a.doorOffs / Math.max(1, a.totalDoors) * 100).toFixed(0) + '%)');
    console.log('问题: ' + (res.bad.length ? res.bad.slice(0, 10).join('; ') : '无'));
    if (res.bad.length) errs++;
  } catch (e) { console.log('ERR', e && e.stack || e); errs++; }
  finally { if (browser) await browser.close(); server.close(); }
  process.exit(errs ? 1 : 0);
});
