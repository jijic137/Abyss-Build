/* 穿墙/瞬移探针 v2：真实 game.update 驱动（含锁门/机关），
   沿墙冲刺并逐帧检测：位移跳变 > 50px（瞬移）、中心进墙。 */
'use strict';
const fs = require('fs');
const vm = require('vm');

function classList() {
  const s = {};
  return {
    add(c){ s[c]=1; }, remove(c){ delete s[c]; },
    toggle(c,f){ if(f===undefined) f=!s[c]; if(f) s[c]=1; else delete s[c]; return !!f; },
    contains(c){ return !!s[c]; }
  };
}
function ctxStub() {
  return new Proxy({}, {
    get(t,k){
      if(k==='createImageData'||k==='getImageData') return (w,h)=>({ data:new Uint8ClampedArray(((w|0)*(h|0)||1)*4), width:w, height:h });
      if(k==='createRadialGradient'||k==='createLinearGradient') return ()=>({ addColorStop(){} });
      if(k==='putImageData') return ()=>{};
      if(k==='measureText') return ()=>({ width: 40 });
      if(k in t) return t[k];
      return ()=>{};
    },
    set(t,k,v){ t[k]=v; return true; }
  });
}
function makeEl() {
  const styleStub = new Proxy({}, {
    get(t,k){ if(k==='setProperty') return ()=>{}; return t[k]; },
    set(t,k,v){ t[k]=v; return true; }
  });
  const t = { style: styleStub, dataset:{}, classList: classList(), children:[] };
  return new Proxy(t, {
    get(o,k){
      if(k==='childElementCount') return o.children.length;
      if(k==='textContent') return o._text||'';
      if(k==='appendChild') return n=>{ o.children.push(n); return n; };
      if(['addEventListener','removeEventListener','setAttribute','getAttribute','focus','blur'].includes(k)) return ()=>{};
      if(k==='getContext') return ()=>ctxStub();
      if(k==='getBoundingClientRect') return ()=>({left:0,top:0,width:100,height:100});
      if(k==='querySelector') return ()=>makeEl();
      if(k==='querySelectorAll') return ()=>[];
      if(k in o) return o[k];
      return undefined;
    },
    set(o,k,v){ o[k]=v; if(k==='textContent') o._text=v; return true; }
  });
}
const elCache = {};
const docStub = { getElementById(id){ return elCache[id] || (elCache[id]=makeEl()); }, createElement(){ return makeEl(); }, addEventListener(){}, readyState:'complete', body: makeEl() };
const mem = {};
const lsStub = { getItem(k){ return k in mem ? mem[k] : null; }, setItem(k,v){ mem[k]=String(v); }, removeItem(k){ delete mem[k]; } };
global.window = global;
global.addEventListener = ()=>{};
global.removeEventListener = ()=>{};
global.document = docStub;
global.performance = { now:()=>Date.now() };
global.requestAnimationFrame = ()=>0;
global.localStorage = lsStub;
global.devicePixelRatio = 1;
global.innerWidth = 1280; global.innerHeight = 720;

const html = fs.readFileSync('index.html', 'utf8');
const files = [];
const re = /<script src="js\/([\w]+\.js)"><\/script>/g;
let m;
while ((m = re.exec(html)) !== null) files.push(m[1]);
for (const f of files) {
  vm.runInThisContext(fs.readFileSync(`js/${f}`, 'utf8'), { filename: `js/${f}` });
}

/* 真实开局（含锁门/机关/词缀） */
Object.keys(mem).forEach(k => delete mem[k]);
const d = G.Meta.get();
d.currency = 60; d.stash = []; d.stashSize = 30;
d.loadout = { w1: null, w2: null, armor: null, trinket1: null, trinket2: null, relic: null };
d.tiers = { 1: true, 2: true };
d.stats = { extracts: 0, deaths: 0, itemsExtracted: 0, itemsLost: 0, bestTier: 0, totalEarned: 0, totalSpent: 0, tierCleared: {} };
G.Meta.flush();
G.game.init();
G.game.newRun(G.CHAR_BY_ID['knight'], 2);
const g = G.game;
g.player.maxHp = g.player.hp = 1e9;
const map = g.map;
const W = G.Map.WALL, SEG = G.Map.SEG, ROOM = G.Map.ROOM;

/* 1) 全图实心点假阴性扫描（含锁门） */
let falseNeg = 0, samples = 0;
const step = 6;
for (let y = W; y < map.worldH - W; y += step) {
  for (let x = W; x < map.worldW - W; x += step) {
    if (!G.Map.solid(map, x, y)) continue;
    samples++;
    if (!G.Map.bboxSolid(map, x, y, 14)) {
      falseNeg++;
      if (falseNeg <= 10) console.log('假阴性@', x.toFixed(0), y.toFixed(0));
    }
  }
}
console.log('假阴性点:', falseNeg + '/' + samples);

/* 2) 真实驱动：沿墙冲刺 */
const walls = [];
for (let c = 0; c < map.cols - 1; c++) {
  for (let r = 0; r < map.rows; r++) {
    if (!map.doorsH[c][r]) {
      const rc = G.Map.roomRect(c, r);
      walls.push({ kind: 'V', x: (c + 1) * SEG, y: rc.y0 + ROOM / 2 });
    }
  }
}
for (let c = 0; c < map.cols; c++) {
  for (let r = 0; r < map.rows - 1; r++) {
    if (!map.doorsV[c][r]) {
      const rc = G.Map.roomRect(c, r);
      walls.push({ kind: 'H', x: rc.x0 + ROOM / 2, y: (r + 1) * SEG });
    }
  }
}

let teleports = 0, wallCross = 0, tested = 0;
const dirs = [
  { k: 'right', vx: 1, vy: 0 }, { k: 'left', vx: -1, vy: 0 },
  { k: 'down', vx: 0, vy: 1 }, { k: 'up', vx: 0, vy: -1 },
  { k: 'right', vx: 0.85, vy: 0.52 }, { k: 'left', vx: -0.85, vy: 0.52 },
  { k: 'right', vx: 0.85, vy: -0.52 }, { k: 'left', vx: -0.85, vy: -0.52 }
];
for (const w of walls.slice(0, 24)) {
  for (const dir of dirs) {
    tested++;
    g.keys = {};
    g.keys[dir.k] = true;
    g.player.x = w.kind === 'V' ? w.x - 14 - 20 : w.x;
    g.player.y = w.kind === 'H' ? w.y - 14 - 20 : w.y;
    g.player.vx = 0; g.player.vy = 0;
    g.player.dead = false;
    let lastX = g.player.x, lastY = g.player.y, maxJump = 0, entered = false;
    for (let i = 0; i < 120; i++) {
      g.update(1 / 30);
      g.render();
      g.player.hp = g.player.st.maxHp = 1e9;
      const jump = Math.abs(g.player.x - lastX) + Math.abs(g.player.y - lastY);
      if (jump > maxJump) maxJump = jump;
      if (G.Map.solid(map, g.player.x, g.player.y)) entered = true;
      lastX = g.player.x; lastY = g.player.y;
      if (g.state !== 'play') break;
    }
    g.keys = {};
    if (maxJump > 50) {
      teleports++;
      if (teleports <= 8) console.log('瞬移@', w.kind, 'dir', dir.k, 'jump', maxJump.toFixed(1), 'end', g.player.x.toFixed(0), g.player.y.toFixed(0));
    }
    if (entered) {
      wallCross++;
      if (wallCross <= 8) console.log('穿墙@', w.kind, 'dir', dir.k, 'end', g.player.x.toFixed(0), g.player.y.toFixed(0));
    }
  }
}
console.log('真实驱动测试:', tested, '次 | 瞬移:', teleports, '| 进入墙体:', wallCross);
