/* 用浏览器 canvas 裁剪掉封面图右下角水印区域，另存为 assets/art/covers/cover_nwm.png */
'use strict';
const fs = require('fs');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle' });

  const dataUrl = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          // 裁掉底部 110px（右下角水印所在区域），保留 1536×914
          const cropH = 110;
          c.width = img.width;
          c.height = img.height - cropH;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, img.width, c.height, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        } catch (e) { reject(e); }
      };
      img.onerror = (e) => reject(e);
      img.src = 'assets/art/covers/cover.png?t=' + Date.now();
    });
  });

  const base64 = dataUrl.split(',')[1];
  const buf = Buffer.from(base64, 'base64');
  fs.writeFileSync('assets/art/covers/cover_nwm.png', buf);
  console.log('CROP_OK size=' + buf.length);
  await browser.close();
})().catch(e => { console.error('CROP_FAIL: ' + e.message); process.exit(1); });
