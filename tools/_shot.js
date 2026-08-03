/* 用系统 Edge 截图（网络受限时替代 agent-browser 的 Chromium）。
   临时截图统一输出到 tools/cache/（.gitignore 忽略，不入库）。 */
'use strict';
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600); // 等封面/角色渲染
  const name = process.argv[2] || ('shot_' + Date.now() + '.png');
  const out = path.join('tools', 'cache', name);
  await page.screenshot({ path: out });
  console.log('SHOT_OK: ' + out);
  await browser.close();
})().catch(e => { console.error('SHOT_FAIL: ' + e.message); process.exit(1); });
