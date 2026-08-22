/* BGM 扩展（区域分模式）针对性校验：
   - startZone(tier) 切换 _root/_bpm/_wave，且各区域不同
   - 每个区域模式跑完整 16 步 _playStep 不抛错
   复用 Node 内 fake AudioContext。 */
'use strict';
const fs = require('fs');
const vm = require('vm');

function makeNode() {
  return {
    connect: function () { return this; }, disconnect: function () { return this; },
    start: function () {}, stop: function () {},
    gain: { value: 0, setValueAtTime: function () {}, exponentialRampToValueAtTime: function () {}, linearRampToValueAtTime: function () {} },
    frequency: { value: 220, setValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} },
    detune: { value: 0, setValueAtTime: function () {} },
    Q: { value: 1 }, pan: { value: 0 }, curve: null, oversample: 'none',
    buffer: null, threshold: { value: -20 }, knee: { value: 22 }, ratio: { value: 4 },
    attack: { value: 0.003 }, release: { value: 0.16 }
  };
}
function FakeCtx() { this.sampleRate = 44100; this.currentTime = 0; this.state = 'running'; this.destination = makeNode(); }
FakeCtx.prototype.createGain = function () { return makeNode(); };
FakeCtx.prototype.createOscillator = function () { return makeNode(); };
FakeCtx.prototype.createBuffer = function (ch, len) { return { getChannelData: function () { return new Float32Array(len); } }; };
FakeCtx.prototype.createBufferSource = function () { return makeNode(); };
FakeCtx.prototype.createStereoPanner = function () { return makeNode(); };
FakeCtx.prototype.createWaveShaper = function () { return makeNode(); };
FakeCtx.prototype.createConvolver = function () { return makeNode(); };
FakeCtx.prototype.createBiquadFilter = function () { return makeNode(); };
FakeCtx.prototype.createDynamicsCompressor = function () { return makeNode(); };
FakeCtx.prototype.resume = function () { this.state = 'running'; };

global.window = global;
global.AudioContext = FakeCtx;
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };

for (const f of ['00_util.js', '12_audio.js']) {
  vm.runInThisContext(fs.readFileSync('js/' + f, 'utf8'), { filename: 'js/' + f });
}
const G = global.G;
const A = G.Audio;

let ERR = 0;
function check(label, cond, detail) {
  if (cond) console.log('  ✓ ' + label + (detail ? '  [' + detail + ']' : ''));
  else { ERR++; console.log('  ✗ ' + label + (detail ? '  [' + detail + ']' : '')); }
}

// 初始化一个可用 ctx（AudioSys 构造时若已是 fake 会创建 bus）
A.ctx = new FakeCtx();
A.musicBus = A.ctx.createGain();
A.master = A.ctx.createGain();

// 5 套区域都应切换且互不相同
const seenRoot = {}, seenBpm = {};
for (let tier = 1; tier <= 5; tier++) {
  let threw = null;
  try { A._initMusicPattern(tier); }
  catch (e) { threw = e; }
  check('init 模式(' + tier + ') 不抛错', !threw, threw ? threw.message : 'root=' + A._root);
  seenRoot[A._root] = (seenRoot[A._root] || 0) + 1;
  seenBpm[A._bpm] = (seenBpm[A._bpm] || 0) + 1;
}
check('5 区域根音互不相同', Object.keys(seenRoot).length === 5, Object.keys(seenRoot).join(','));
check('5 区域节拍互不相同', Object.keys(seenBpm).length === 5, Object.keys(seenBpm).join(','));

// 每个区域跑完整 16 步，验证 _playStep 不抛错
let stepErr = null;
for (let tier = 1; tier <= 5; tier++) {
  try {
    A._initMusicPattern(tier);
    for (let s = 0; s < 16; s++) A._playStep(s, 0.1 + s * 0.05);
  } catch (e) { stepErr = e; break; }
}
check('各区域完整 16 步无错', !stepErr, stepErr ? stepErr.message : '');

// 无参 startMusic 兼容（回退到 corridor 模式）
A._musicOn = false;
A.startMusic();
check('无参 startMusic 可跑', A._musicOn === true, 'root=' + A._root);

console.log(ERR === 0 ? '\nBGM 扩展校验 PASS' : '\n有 ' + ERR + ' 项未通过');
process.exit(ERR === 0 ? 0 : 1);
