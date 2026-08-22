/* 制作可分发的静态发布目录（零依赖、零构建）。
   用法：node tools/build_dist.js
   产物：dist/ 目录（index.html + css + js + assets），可直接双击 index.html 游玩。
   之后若要 zip：见下方提示或用压缩工具打包 dist/。 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SRC = ['index.html', 'css', 'js', 'assets'];

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

// 逐文件复制（比整目录 cpSync 更稳，避免 Windows 目录句柄竞态）
function copyTree(src, dst) {
  const st = fs.statSync(src);
  if (st.isFile()) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    copyTree(path.join(src, name), path.join(dst, name));
  }
}

rmrf(DIST);
fs.mkdirSync(DIST, { recursive: true });
for (const item of SRC) {
  const src = path.join(ROOT, item);
  if (fs.existsSync(src)) copyTree(src, path.join(DIST, item));
}

function sizeOf(p) {
  if (fs.statSync(p).isFile()) return fs.statSync(p).size;
  let total = 0;
  for (const f of fs.readdirSync(p)) total += sizeOf(path.join(p, f));
  return total;
}
const total = sizeOf(DIST);
console.log('已生成 dist/（可直接双击 index.html 游玩）');
console.log('  目录: ' + DIST);
console.log('  大小: ' + (total / 1024 / 1024).toFixed(2) + ' MB');
