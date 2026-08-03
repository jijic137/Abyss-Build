/* 战斗特效截图：进入游戏 → 放置敌人 → 开火/命中/击杀 → 截图
   用法：NODE_PATH=... node tools/_shot_battle.js <out.png> */
'use strict';
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const logs = [];
  page.on('pageerror', e => logs.push('ERR:' + e.message));
  await page.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const G = window.G;
    // 直接进入战斗
    G.game.newRun(G.CHAR_BY_ID['knight']);
    G.game.state = 'play';
    G.game.wave = 3;
    G.game.waveTime = 30; G.game.waveDur = 60;
    const p = G.game.player;
    p.x = 640; p.y = 360;
    p.maxHp = 1e9; p.hp = 1e9;
    // 给一挺霰弹枪制造命中粒子
    p.weapons = [G.makeWeapon('shotgun', 3)];
    p.recalc && p.recalc();
    // 放 6 只敌人围住玩家
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const e = G.game.spawnEnemy('worm', 640 + Math.cos(a) * 130, 360 + Math.sin(a) * 130);
      if (e) { e.hp = 200; e.maxHp = 200; }
    }
  });

  // 驱动 30 帧接近敌人 + 30 帧近距疯狂开火 + 2 次爆炸（播放粒子密集时刻）
  await page.evaluate(() => {
    const G = window.G;
    const p = G.game.player;
    p.weapons = [G.makeWeapon('shotgun', 3), G.makeWeapon('turret', 0)];
    p.recalc && p.recalc();
    // 30 帧：玩家不动，敌人被多次打中
    for (let i = 0; i < 30; i++) G.game.update(1 / 30);
    // 触发两次爆炸制造粒子高峰（爆炸用现有 explode API）
    const e1 = G.game.enemies[0]; if (e1) G.explode(e1.x, e1.y, 120, 80, { col: '#ff9a3a' });
    const e2 = G.game.enemies[1]; if (e2) G.explode(e2.x, e2.y, 90, 60, { col: '#ff7a2a' });
    // 驱 3 帧让粒子展开
    for (let i = 0; i < 3; i++) G.game.update(1 / 30);
  });
  await page.waitForTimeout(150);

  // 最后一次渲染并截取战斗画面
  await page.evaluate(() => { window.G.game.render(); });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.G.game.render(); });

  const out = process.argv[2] || 'battle_shot.png';
  await page.screenshot({ path: out });
  console.log('SHOT_OK: ' + out);
  if (logs.length) console.log('LOGS:', logs.join(' | '));
  await browser.close();
})().catch(e => { console.error('SHOT_FAIL: ' + e.message); process.exit(1); });
