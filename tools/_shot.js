/* 用系统 Edge 截图封面页（网络受限时替代 agent-browser 的 Chromium） */
'use strict';
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600); // 等漩涡/立绘渲染
  const out = process.argv[2] || 'cover_shot.png';
  await page.screenshot({ path: out });
  console.log('SHOT_OK: ' + out);
  await browser.close();
})().catch(e => { console.error('SHOT_FAIL: ' + e.message); process.exit(1); });
