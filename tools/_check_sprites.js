/* 临时校验脚本：检查 PX.def 精灵各自行宽是否一致，并做模拟编译 */
'use strict';
const fs = require('fs');
const vm = require('vm');

const path = 'js/01_pixel.js';
const src = fs.readFileSync(path, 'utf8');

const names = ['boss_behemoth', 'boss_abyss',
  'el_ironclad', 'el_butcher', 'el_hexer', 'el_brood', 'el_reaper'];

function extractRows(name) {
  const re = new RegExp("PX\\.def\\('" + name + "'\\s*,\\s*\\{[^}]*\\}\\s*,\\s*(\\[[\\s\\S]*?\\])\\s*\\)\\s*;");
  const m = src.match(re);
  if (!m) return null;
  // 数组字面量里只有字符串，安全 eval
  return eval('(' + m[1] + ')');
}

let allOk = true;
for (const n of names) {
  const rows = extractRows(n);
  if (!rows) { console.log('!! 未找到精灵:', n); allOk = false; continue; }
  const lens = rows.map(r => r.length);
  const max = Math.max.apply(null, lens);
  const bad = lens.filter(l => l !== max).length;
  console.log(`\n[${n}] 行数=${rows.length} 行宽 max=${max} 不一致行=${bad}`);
  lens.forEach((l, i) => { if (l !== max) console.log(`   row ${i}: 宽=${l} 内容="${rows[i]}"`); });
  if (bad > 0) allOk = false;
}

/* 模拟编译：mock document/canvas，真正执行 PX.def + PX.get */
const noop = () => {};
const fakeCtx = {
  fillStyle: '', globalAlpha: 1, globalCompositeOperation: '',
  fillRect: noop, drawImage: noop, save: noop, restore: noop,
  translate: noop, rotate: noop, scale: noop, clearRect: noop,
  beginPath: noop, arc: noop, fill: noop, stroke: noop, fillText: noop,
};
function fakeCanvas() {
  return { width: 0, height: 0, getContext: () => fakeCtx, style: {} };
}
const sandbox = {
  document: { createElement: () => fakeCanvas() },
  console: console,
  Math: Math,
};
sandbox.G = {};
try {
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: path });
  for (const n of names) {
    const cv = sandbox.G.PX.get(n, 4);
    if (!cv) { console.log('!! 编译失败:', n); allOk = false; }
  }
  console.log('\n模拟编译：全部精灵 build 成功');
} catch (e) {
  console.log('\n!! 编译异常:', e.message);
  allOk = false;
}

console.log('\n=== 结果:', allOk ? 'OK' : '有不一致/错误', '===');
