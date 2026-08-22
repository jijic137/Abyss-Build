/* 制作单 HTML 版：把 css/js 全部内联进 index.html。
   产物：dist/single/深渊猎手_single.html （仍需与 assets/ 同目录，图片未内联）。
   用法：node tools/build_single.js */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_HTML = path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'dist', 'single');
const OUT_HTML = path.join(OUT_DIR, '深渊猎手_single.html');

let html = fs.readFileSync(SRC_HTML, 'utf8');

// 内联 CSS
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  const code = fs.readFileSync(path.join(ROOT, href), 'utf8');
  return '<style>' + code + '</style>';
});

// 内联 JS（顺序保持），转义可能破坏 HTML 的 </script>
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const code = fs.readFileSync(path.join(ROOT, src), 'utf8')
    .replace(/<\/script/gi, '<\\/script');
  return '<script>' + code + '</script>';
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_HTML, html, 'utf8');
console.log('已生成单 HTML：' + OUT_HTML);
console.log('  大小: ' + (fs.statSync(OUT_HTML).size / 1024 / 1024).toFixed(2) + ' MB');
