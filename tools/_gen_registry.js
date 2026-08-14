/* 由源码生成 content_registry.md（内容登记表）
   - 读取 00_util / 03_items / 04_weapons / 05_enemies / 02_stats / 13_meta
   - 生成主体表格；保留文件中 <!--CHANGELOG_START--> ... <!--CHANGELOG_END--> 之间的手工变更日志
   用法：node _gen_registry.js
*/
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = __dirname;
const FILES = ['../js/00_util.js', '../js/03_items.js', '../js/04_weapons.js', '../js/05_enemies.js', '../js/02_stats.js', '../js/13_meta.js'];

const sandbox = {};
sandbox.window = sandbox;
sandbox.G = {};
sandbox.console = console;
sandbox.Math = Math;
sandbox.Date = Date;
sandbox.JSON = JSON;
sandbox.setTimeout = setTimeout;
sandbox.clearTimeout = clearTimeout;
sandbox.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
// 03_items.js 加载时会引用 G.PX.has/tint（仅 ic_hammer_r 兜底），桩掉
sandbox.G.PX = { has: () => false, tint: () => {}, get: () => null, getTint: () => null };
vm.createContext(sandbox);

for (const f of FILES) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}
const G = sandbox.G;

function esc(s) { return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' '); }
function modStr(m) {
  if (!m) return '';
  return Object.keys(m).map(k => `${k} ${m[k] > 0 ? '+' : ''}${m[k]}`).join(', ');
}

/* ---------------- 敌人 ---------------- */
function enemyTable(rows, extra) {
  let s = '| id | 名称 | sprite | 缩放 | 半径 | HP | 速度 | 伤害 | 护甲 | 材料 | 危险 | AI | 备注 |\n';
  s += '|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  rows.forEach(e => {
    let note = [];
    if (e.splitInto) note.push(`分裂→${e.splitInto}×${e.splitCount}`);
    if (e.sumWhat) note.push(`召唤→${e.sumWhat}×${e.sumCount}`);
    if (e.salvo) note.push(`齐射×${e.salvo}`);
    if (e.noScale) note.push('固定(不随波次)');
    if (e.elite) note.push('精英');
    if (e.boss) note.push('BOSS');
    if (e.ghost) note.push('虚体');
    s += `| ${e.id} | ${esc(e.name)} | ${e.sprite} | ${e.sc} | ${e.r} | ${e.hp} | ${e.spd} | ${e.dmg} | ${e.armor} | ${e.mat} | ${e.danger} | ${e.ai} | ${esc(note.join('; '))} |\n`;
  });
  return s;
}

const normals = G.ENEMIES.filter(e => !e.elite && !e.boss);
const elites = G.ENEMIES.filter(e => e.elite);
const bosses = G.ENEMIES.filter(e => e.boss);

/* ---------------- 武器 ---------------- */
function weaponTable(rows) {
  let s = '| id | 名称 | 类型 | 标签 | 基础伤害 | 冷却 | 特性 | 描述 |\n';
  s += '|---|---|---|---|---|---|---|---|\n';
  rows.forEach(w => {
    let feat = [];
    if (w.range) feat.push(`射程${w.range}`);
    if (w.bullet) feat.push(`弹${w.bullet}`);
    if (w.count) feat.push(`弹数${w.count}`);
    if (w.chain) feat.push(`连锁${w.chain}`);
    if (w.pierce) feat.push(`穿透${w.pierce}`);
    if (w.burn) feat.push(`灼烧${w.burn}`);
    if (w.slow) feat.push(`减速${w.slow}`);
    if (w.poison) feat.push(`毒${w.poison}`);
    if (w.arc) feat.push(`弧度${w.arc}`);
    s += `| ${w.id} | ${esc(w.name)} | ${w.kind} | ${esc((w.tags || []).join('/'))} | ${w.base} | ${w.cd} | ${esc(feat.join(', '))} | ${esc(w.desc)} |\n`;
  });
  return s;
}
const wTags = {};
G.WEAPONS.forEach(w => (w.tags || []).forEach(t => wTags[t] = (wTags[t] || 0) + 1));

/* ---------------- 物品 ---------------- */
const typeNames = { armor: '防具', trinket: '饰品', relic: '遗物', treasure: '宝物' };
function itemTable(rows) {
  let s = '| id | 名称 | 类型 | 主要属性 | 特效 | 风味 |\n';
  s += '|---|---|---|---|---|---|\n';
  rows.forEach(it => {
    const t = typeNames[G.itemType(it)] || '饰品';
    s += `| ${it.id} | ${esc(it.name)} | ${t} | ${esc(modStr(it.mods))} | ${esc(it.sp || '')} | ${esc(it.fl)} |\n`;
  });
  return s;
}
const byR = [[], [], [], [], []];
G.ITEMS.forEach(it => byR[it.r].push(it));
const rNames = ['白', '绿', '蓝', '紫', '红'];
const byType = { armor: [], trinket: [], relic: [], treasure: [] };
G.ITEMS.forEach(it => byType[G.itemType(it)].push(it));

/* ---------------- 品质分布 ---------------- */
function effWeights(wave, luck) {
  const w = G.F.rarityWeights(wave, luck);
  const out = w.slice();
  if (wave < 4) { out[3] = 0; out[4] = 0; }
  if (wave < 8) { out[4] = 0; }
  const tot = out.reduce((a, b) => a + b, 0) || 1;
  return out.map(x => +(100 * x / tot).toFixed(1));
}
const ws = [1, 4, 8, 10, 14, 19];
let distTable = '| 波次 | 白% | 绿% | 蓝% | 紫% | 红% |\n|---|---|---|---|---|---|\n';
ws.forEach(wv => {
  const p = effWeights(wv, 0);
  distTable += `| ${wv} | ${p[0]} | ${p[1]} | ${p[2]} | ${p[3]} | ${p[4]} |\n`;
});

/* ---------------- 20 波 ---------------- */
let waveTable = '| 波 | 时长 | 投放率 | 精英 | BOSS | 标签 |\n|---|---|---|---|---|---|\n';
G.WAVES.forEach((w, i) => {
  let el = (w.elites || []).map(e => `${e[0]}@${e[1]}`).join(', ');
  waveTable += `| ${i + 1} | ${w.dur} | ${w.rate} | ${esc(el)} | ${esc(w.boss || '')} | ${esc(w.label)} |\n`;
});

/* ---------------- 搜打撤地图档位 ---------------- */
let tierTable = '| 层 | 区域 | 房间 | 门票 | 难度 | 掉落 | 撤离目标 |\n|---|---|---|---|---|---|---|\n';
G.TIERS.forEach(t => {
  const danger = '▲'.repeat(Math.round(t.danger));
  const loot = '◆'.repeat(Math.round(t.loot));
  tierTable += `| ${t.id} | ${esc(t.name)} | ${t.grid[0]}×${t.grid[1]} | ${t.fee} | ${danger} | ${loot} | ${esc(t.obj)} |\n`;
});

/* ---------------- 组装 ---------------- */
let md = '';
md += '# 深渊猎手 · 内容登记表 (Content Registry)\n\n';
md += '> 本文件由 _gen_registry.js 从源码生成主体表格（保证与代码一致）；底部「变更日志」为手工维护，重新生成时保留。\n';
md += '> 每次新增/修改敌人、武器、物品、地图档位、品质比例或平衡数值后，都应重新生成本表并追加一条变更记录。\n\n';

md += '## 1. 数值总览\n\n';
md += '- 敌人总数：**' + G.ENEMIES.length + '**（普通 ' + normals.length + ' / 精英 ' + elites.length + ' / BOSS ' + bosses.length + '）\n';
md += '- 武器总数：**' + G.WEAPONS.length + '**（按标签：' + Object.keys(wTags).map(t => t + '×' + wTags[t]).join('，') + '）\n';
md += '- 物品总数：**' + G.ITEMS.length + '**（白 ' + byR[0].length + ' / 绿 ' + byR[1].length + ' / 蓝 ' + byR[2].length + ' / 紫 ' + byR[3].length + ' / 红 ' + byR[4].length + '；防具 ' + byType.armor.length + ' / 饰品 ' + byType.trinket.length + ' / 遗物 ' + byType.relic.length + ' / 宝物 ' + byType.treasure.length + '）\n';
md += '- 角色（职业）：**' + G.CHARACTERS.length + '**\n';
md += '- 深渊区域（地图档位）：**' + G.TIERS.length + '**\n';
md += '- 波次配置：**' + G.WAVES.length + '**（作为地图刷怪难度曲线复用；BOSS 波：10、20）\n\n';

md += '## 2. 敌人\n\n';
md += '### 2.1 普通敌人（' + normals.length + '）\n\n' + enemyTable(normals) + '\n';
md += '### 2.2 精英（' + elites.length + '，随波次缩放）\n\n' + enemyTable(elites) + '\n';
md += '### 2.3 BOSS（' + bosses.length + '，固定不随波次）\n\n' + enemyTable(bosses) + '\n';
md += '### 2.4 二十波配置\n\n' + waveTable + '\n';

md += '## 3. 武器（' + G.WEAPONS.length + '）\n\n' + weaponTable(G.WEAPONS) + '\n';
md += '> 武器在掉落/商店出现时，其「品质档位」= 抽到的稀有度（0白~4红），档位只改数值（TIER_DMG / TIER_CD）不改机制。\n\n';

md += '## 4. 物品（按品质）\n\n';
for (let r = 0; r < 5; r++) {
  md += '### 4.' + (r + 1) + ' ' + rNames[r] + ' · 稀有度 ' + r + '（' + byR[r].length + '）\n\n' + itemTable(byR[r]) + '\n';
}

md += '## 5. 品质分布\n\n';
md += '### 5.1 权重公式 (02_stats.js 的 F.rarityWeights(wave, luck)，luck 为幸运属性/100)\n\n';
md += '~~~\n白 = max(3,   92  - wave*3.6 - luck*26)\n绿 = max(6,   20  + wave*1.7 + luck*12)\n蓝 = max(2,   4   + wave*2.1 + luck*17)\n紫 = max(1,  (wave>=4 ? -2 + wave*1.25 : 0) + luck*14)\n红 = max(0,  (wave>=8 ? -4 + wave*0.80 : 0) + luck*11)\n（式中 luck 为 幸运属性/100；02_stats.js 内 F.rarityWeights 实际以 l=luck/100 代入）\n~~~\n\n';
md += '### 5.2 抽取门槛 (13_meta.js 的 rollRarityForMarket / rollLootTier)\n\n';
md += '- 市场/掉落按地图档位动态上浮；紫色、红色随档位与幸运逐步解锁\n\n';
md += '### 5.3 实际比例（幸运=0，已应用门槛）\n\n' + distTable + '\n';

md += '## 6. 平衡参数\n\n';
md += '### 6.1 难度成长 G.waveScale(wave)（作用于普通/精英；BOSS 用 noScale 固定）\n\n';
md += '~~~\nhp  = 1 + 0.5*(wave-1) + 0.04*(wave-1)^2\ndmg = 1 + 0.105*(wave-1)\nspd = 1 + 0.011*(wave-1)\nmat = 1 + 0.13*(wave-1)\n~~~\n\n';
md += '### 6.2 经济参数（搜打撤）\n\n';
md += '- 局外货币「深渊币」：卖掉落物（≈基础价×1.25）、撤离时材料 1:1 折现、首通奖励 25×层数\n';
md += '- 市场买入价 ≈ 基础价×2.5；仓库初始 30 格，扩容 +10 格 = 120×(扩容次数+1) 币\n';
md += '- 进图门票：T1 免费，T2~T5 分别为 45/140/380/950 币；通关上一层解锁下一层\n';
md += '- 死亡惩罚：本局携带（装备+背包+材料）全部失去\n\n';

md += '## 7. 搜打撤地图档位\n\n';
md += tierTable + '\n';
md += '> 地图为房间网格世界（js/14_map.js）：房间 700px、墙 36px、门洞 104px；每层随机连通+回边，迷雾逐房揭示；房间类型含 战斗/宝库/精英/BOSS/圣泉/祭坛/撤离。\n\n';

md += '## 8. 如何扩充（改动清单）\n\n';
md += '- **新增敌人**：js/05_enemies.js 的 E 数组；若需新像素，在 js/01_pixel.js 用 PX.def 定义 sprite，注意行宽一致。出现波次在 W 数组的 pool/elites/boss。\n';
md += '- **新增武器**：js/04_weapons.js 的 WEAPONS；图标在 js/01_pixel.js 用 PX.tint 定义 icon。\n';
md += '- **新增物品**：js/03_items.js 的 ITEMS，设 r（0~4）决定品质；类型由 js/13_meta.js 的 G.itemType 按属性自动判定（防具/饰品/遗物）。\n';
md += '- **新增地图档位**：js/13_meta.js 的 G.TIERS（房间网格、门票、难度、掉落、撤离目标）。\n';
md += '- **调品质比例**：02_stats.js 的 F.rarityWeights + 13_meta.js 的 rollRarityForMarket / rollLootTier。\n';
md += '- **调平衡**：05_enemies.js 的 waveScale 与敌人基础值；精英/Boss 的血量直接改 hp（Boss 为 noScale 固定值）。\n';
md += '- **改完后**：node --check 各文件 → 重跑 _gen_registry.js 刷新本表 → 追加变更日志。\n\n';

md += '<!--CHANGELOG_START-->\n';
const CL_PATH = path.join(ROOT, '..', 'docs', 'content_registry.md');
if (fs.existsSync(CL_PATH)) {
  const prev = fs.readFileSync(CL_PATH, 'utf8');
  const m = prev.match(/<!--CHANGELOG_START-->([\s\S]*?)<!--CHANGELOG_END-->/);
  if (m) md += m[1];
}
md += '<!--CHANGELOG_END-->\n';

fs.writeFileSync(CL_PATH, md, 'utf8');
console.log('已生成 content_registry.md');
console.log('敌人', G.ENEMIES.length, '| 武器', G.WEAPONS.length, '| 物品', G.ITEMS.length,
  '(白' + byR[0].length + ' 绿' + byR[1].length + ' 蓝' + byR[2].length + ' 紫' + byR[3].length + ' 红' + byR[4].length + ')',
  '| 区域', G.TIERS.length);
