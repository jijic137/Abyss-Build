'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function readZipEntries(file) {
  // Minimal central-directory walk to list entry names without third-party deps.
  const buf = fs.readFileSync(file);
  const entries = [];
  let i = buf.length - 22; // min EOCD size
  // locate EOCD signature
  while (i >= 0 && buf.readUInt32LE(i) !== 0x06054b50) i--;
  if (i < 0) return entries;
  const count = buf.readUInt16LE(i + 10);
  const cdSize = buf.readUInt32LE(i + 12);
  const cdStart = buf.readUInt32LE(i + 16);
  let p = cdStart;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.push(name);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const zip = path.join(ROOT, '深渊猎手_AbyssHunter.zip');
const single = path.join(ROOT, 'dist', 'single', '深渊猎手_single.html');
const multi = path.join(ROOT, 'dist', 'index.html');

if (fs.existsSync(zip)) {
  const names = readZipEntries(zip);
  console.log('ZIP 条目数: ' + names.length);
  console.log('  index.html: ' + names.includes('index.html'));
  console.log('  art/cover_old: ' + names.includes('assets/art/covers/cover_old.png'));
  console.log('  js/69_daily: ' + names.includes('js/69_daily.js'));
} else {
  console.log('ZIP 缺失');
}
console.log('多文件 dist/index.html: ' + fs.existsSync(multi));
console.log('单文件: ' + fs.existsSync(single) + '  (' + (fs.existsSync(single) ? Math.round(fs.statSync(single).size/1024) : 0) + ' KB)');
