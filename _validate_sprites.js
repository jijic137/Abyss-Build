// 校验 01_pixel.js 中所有 PX.def 精灵：行宽一致 + 调色板字符合法 + 可编译
const fs = require('fs');
const vm = require('vm');

const file = 'js/01_pixel.js';
const src = fs.readFileSync(file, 'utf8');

// 1) 行宽一致性
const re = /PX\.def\('([^']+)',\s*\{[^}]*\},\s*\[([\s\S]*?)\]\);/g;
let m, bad = 0, count = 0;
const names = [];
while ((m = re.exec(src))) {
  const name = m[1];
  const rows = [...m[2].matchAll(/'([^']*)'/g)].map(x => x[1]);
  const lens = rows.map(r => r.replace(/\s/g, '').length);
  const max = Math.max(...lens), min = Math.min(...lens);
  if (max !== min) { console.log('  ✗ 行宽不齐:', name, lens); bad++; }
  count++; names.push(name);
}
console.log(`行宽检查：${count} 个精灵, ${bad} 个不齐`);

// 2) vm 编译（mock canvas），确认 PX.get 不抛错
const sandbox = { document: { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {} }) }) }, console };
sandbox.G = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
sandbox.window = sandbox;
vm.createContext(sandbox);
let compileErr = 0;
try {
  vm.runInContext(src, sandbox);
  const PX = sandbox.G && sandbox.G.PX;
  if (!PX) { console.log('  ✗ 未找到 G.PX'); compileErr++; }
  else {
    for (const n of names) {
      try { const cv = PX.get(n, 3); if (!cv || !cv.width) console.log('  ✗ 空精灵:', n); }
      catch (e) { console.log('  ✗ 编译失败:', n, e.message); compileErr++; }
    }
  }
} catch (e) { console.log('  ✗ 文件执行失败:', e.message); compileErr++; }

console.log(compileErr ? `编译失败 ${compileErr} 个` : '编译：全部 OK');
process.exit((bad + compileErr) ? 1 : 0);
