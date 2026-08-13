/* AI 生成看门狗：服务恢复后自动续跑 _gen_ai_art.js，跨断线自愈
   用法：node tools/_gen_ai_art_watch.js （建议后台运行）
   逻辑：每 60s 探测 /system_stats；服务在线则跑生成器；成功即全部完成退出；
         仍有失败则等待后重试。日志追加到 tools/cache/ai_watch.log
*/
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const API = 'http://36.150.116.215:8188';
const ROOT = path.join(__dirname, '..');
const LOG = path.join(__dirname, 'cache', 'ai_watch.log');
fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
function log(m) {
  const line = '[' + new Date().toISOString().slice(11, 19) + '] ' + m;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function up() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(function () { ctl.abort(); }, 12000);
    const r = await fetch(API + '/system_stats', { signal: ctl.signal });
    clearTimeout(t);
    return r.ok;
  } catch (e) {
    return false;
  }
}

function runGen() {
  return new Promise(function (resolve) {
    const node = process.execPath;
    const child = spawn(node, [path.join(__dirname, '_gen_ai_art.js')], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', function (d) { process.stdout.write(d); });
    child.stderr.on('data', function (d) { process.stderr.write(d); });
    child.on('exit', function (code) { resolve(code); });
  });
}

(async () => {
  log('看门狗启动');
  let done = false;
  while (!done) {
    if (await up()) {
      log('服务在线，开始/续跑生成');
      const code = await runGen();
      if (code === 0) {
        log('生成全部完成');
        done = true;
      } else {
        log('生成有失败（exit=' + code + '），等待后重试');
        await sleep(30000);
      }
    } else {
      await sleep(60000);
    }
  }
  log('看门狗退出');
  process.exit(0);
})();
