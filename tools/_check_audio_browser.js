/* 音效试听台浏览器冒烟：打开 tools/audio_preview.html，
   切风格 + 点代表性音效 + 跑三个演示，收集 console 错误。
   用法（需 Playwright + Edge）：
   $env:NODE_PATH='...\node\node_modules\.pnpm\node_modules'
   node tools/_check_audio_browser.js
*/
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const file = 'file:///' + path.resolve('tools/audio_preview.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(file, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  /* 解锁 + 风格切换 */
  await page.click('#styleSeg button[data-style="3"]');
  await page.waitForTimeout(250);
  await page.click('#styleSeg button[data-style="1"]');
  await page.waitForTimeout(250);
  await page.click('#styleSeg button[data-style="2"]');
  await page.waitForTimeout(250);

  /* 代表性音效（含多版本与分级） */
  const clicks = [
    ['#gCombat1 button', 0], ['#gCombat1 button', 1], ['#gCombat1 button', 2],
    ['#gCombat2 button', 3], ['#gCombat2 button', 4], ['#gCombat2 button', 5],
    ['#gCombat3 button', 6],
    ['#gChest button', 4], ['#gLoot button', 4],
    ['#gFlow button', 2]
  ];
  for (const [sel, idx] of clicks) {
    const btns = await page.$$(sel);
    if (btns[idx]) { await btns[idx].click(); await page.waitForTimeout(80); }
  }

  /* 演示 */
  await page.click('#btnCombo');
  await page.waitForTimeout(1100);
  await page.click('#btnChest');
  await page.waitForTimeout(4600);
  await page.click('#btnExtract');
  await page.waitForTimeout(2600);
  await page.click('#btnDescend');
  await page.waitForTimeout(900);

  const stylePill = await page.textContent('#stylePill');
  console.log('STYLE_PILL', stylePill.trim());
  await page.screenshot({ path: 'tools/cache/shot_audio_preview.png' });
  console.log('ERRORS', JSON.stringify(errors));

  await browser.close();
  if (errors.length) { console.error('FAIL: ' + errors.length + ' 个浏览器错误'); process.exit(1); }
  console.log('OK: 音效试听台浏览器冒烟通过');
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
