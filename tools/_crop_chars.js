/* 批量去水印：把 assets/chars/{id}/Pixel_art_*.png 裁掉底部 110px 写成 assets/chars/{id}.png */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const CROP = 110;
const IDS = ['engineer', 'alchemist', 'warden', 'knight', 'shadow', 'mage'];

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle' });

  for (const id of IDS) {
    const dir = path.join('assets', 'chars', id);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    if (files.length === 0) continue;
    const src = path.join(dir, files[0]);
    const dataUrl = await page.evaluate((srcPath) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height - 110;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, img.width, c.height, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = srcPath + '?t=' + Date.now();
      });
    }, src);
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    fs.writeFileSync(path.join('assets', 'chars', id + '.png'), buf);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* 目录清理失败不阻塞 */ }
    console.log('OK ' + id + ' ' + buf.length + 'B');
  }
  await browser.close();
})().catch(e => { console.error('FAIL: ' + e.message); process.exit(1); });
