/* 音效 2.0 冒烟：Node 内 fake AudioContext 跑通全部合成路径（含变体/分级）
   用法：node tools/_check_audio.js
   错误数 = 0 即通过
*/
'use strict';
const fs = require('fs');
const vm = require('vm');

/* ---------- Fake WebAudio ---------- */
function makeNode() {
  return {
    connect: function () { return this; },
    disconnect: function () { return this; },
    start: function () {},
    stop: function () {},
    gain: {
      value: 0,
      setValueAtTime: function () {},
      exponentialRampToValueAtTime: function () {},
      linearRampToValueAtTime: function () {}
    },
    frequency: { value: 220, setValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} },
    detune: { value: 0, setValueAtTime: function () {} },
    Q: { value: 1 },
    pan: { value: 0 },
    curve: null,
    oversample: 'none',
    buffer: null,
    threshold: { value: -20 },
    knee: { value: 22 },
    ratio: { value: 4 },
    attack: { value: 0.003 },
    release: { value: 0.16 }
  };
}

function FakeCtx() {
  this.sampleRate = 44100;
  this.currentTime = 0;
  this.state = 'running';
  this.destination = makeNode();
}
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

/* ---------- 沙箱 ---------- */
global.window = global;
global.AudioContext = FakeCtx;
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };

const files = ['00_util.js', '12_audio.js', '17_audio.js'];
for (const f of files) {
  vm.runInThisContext(fs.readFileSync('js/' + f, 'utf8'), { filename: 'js/' + f });
}

const G = global.G;
/* 65_audio2 会重写 G.Loot.sfx（分级出货入口）；先给个占位对象 */
G.Loot = G.Loot || {};
G.Loot.sfx = function () {};
vm.runInThisContext(fs.readFileSync('js/65_audio2.js', 'utf8'), { filename: 'js/65_audio2.js' });

const A = G.Audio;
if (!A) { console.error('FAIL: G.Audio 未定义'); process.exit(1); }

A.unlock();
if (!A.ctx) { console.error('FAIL: AudioContext 未初始化'); process.exit(1); }
if (!A._comp) { console.error('FAIL: 压缩器未插入主总线'); process.exit(1); }

let errors = 0;
function check(label, fn) {
  try { fn(); }
  catch (e) { errors++; console.error('ERROR [' + label + ']: ' + (e && e.stack ? e.stack : e)); }
}

/* 全音效（含显式变体） */
const names = [
  'fire', 'fire_v2', 'fire_v3',
  'swing', 'swing_v2', 'swing_v3',
  'hit', 'hit_v2', 'hit_v3',
  'crit', 'crit_v2', 'crit_v3',
  'kill', 'kill_v2', 'kill_v3',
  'bossdie', 'bossdie_v2', 'bossdie_v3',
  'boss', 'boss_v2', 'boss_v3',
  'hurt', 'hurt_v2', 'hurt_v3',
  'death', 'death_v2', 'death_v3',
  'chest_start',
  'item_get', 'item_get_v2', 'item_get_v3',
  'pickup',
  'map_enter', 'descend',
  'extract_ready', 'extract_ready_v2', 'extract_ready_v3',
  'extract_start',
  'extract_done', 'extract_done_v2', 'extract_done_v3',
  'victory', 'victory_v2', 'victory_v3',
  'lose', 'save', 'levelup', 'buy', 'reroll', 'abyss', 'heal',
  'confirm', 'select', 'back', 'hover', 'wave'
];
names.forEach(function (n) {
  check('sfx(' + n + ')', function () { A.sfx(n); });
});

/* 分级音效 */
for (let tier = 0; tier <= 4; tier++) {
  check('chest_open t' + tier, function () { A.sfx('chest_open', 0, { tier: tier }); });
  check('loot t' + tier, function () { A.sfx('loot', 0, { tier: tier }); });
  check('G.Loot.sfx(' + tier + ')', function () { G.Loot.sfx(tier); });
}

/* 风格切换 + 单音效覆盖 */
check('setSfxStyle(1)', function () { A.setSfxStyle(1); A.sfx('crit'); A.sfx('kill'); A.sfx('chest_open', 0, { tier: 4 }); });
check('setSfxStyle(3)', function () { A.setSfxStyle(3); A.sfx('crit'); A.sfx('extract_done'); });
check('setSfxStyle(2)', function () { A.setSfxStyle(2); });
check('setSfxVariant', function () { A.setSfxVariant('crit', 3); A.sfx('crit'); A.clearSfxVariant('crit'); });

/* 容器品质映射 */
const mapExpect = { crate: 0, barrel: 0, chest_wood: 1, chest_iron: 2, chest_gold: 3, chest_abyss: 4 };
Object.keys(mapExpect).forEach(function (k) {
  check('chestTierOf(' + k + ')', function () {
    const got = G.chestTierOf(k);
    if (got !== mapExpect[k]) throw new Error(k + ' -> ' + got + ' 期望 ' + mapExpect[k]);
  });
});

/* 立体声 pan 路径 */
check('sfx pan', function () { A.sfx('crit', 0.8); A.sfx('hit', -0.7); });

if (errors === 0) {
  console.log('OK: 音效合成路径全部通过（' + (names.length + 10 + 6) + ' 次调用，含三档风格/五档分级/覆盖）');
  process.exit(0);
} else {
  console.error('FAIL: ' + errors + ' 个错误');
  process.exit(1);
}
