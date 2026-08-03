/* 存档子页完整渲染验证（有存档时）——临时脚本 */
'use strict';
const fs = require('fs');
const vm = require('vm');
function cls(){const s={};return{add(c){s[c]=1},remove(c){delete s[c]},toggle(){},contains(c){return !!s[c]}}}
function ctx(){return new Proxy({},{get(t,k){if(k==='createImageData'||k==='getImageData')return(w,h)=>({data:new Uint8ClampedArray(((w|0)*(h|0)||1)*4)});if(k==='createRadialGradient'||k==='createLinearGradient')return()=>({addColorStop(){}});if(k in t)return t[k];return()=>{}},set(t,k,v){t[k]=v;return true}})}
function mkEl(){const t={style:{},dataset:{},classList:cls(),children:[],_text:''};return new Proxy(t,{get(o,k){if(k==='getContext')return()=>ctx();if(k==='appendChild')return n=>{o.children.push(n);if(n&&typeof n==='object'&&n._text!==undefined)o._text=(o._text||'')+n._text;return n};if(k==='removeChild')return()=>{};if(['addEventListener','querySelector','setAttribute','getAttribute','focus','blur'].includes(k))return()=>{};if(k==='textContent')return o._text;if(k==='innerHTML')return '';if(k in o)return o[k];return undefined},set(o,k,v){if(k==='textContent')o._text=v;else if(k==='innerHTML')o._text=String(v);else o[k]=v;return true}})}
const cache={};const doc={getElementById(id){return cache[id]||(cache[id]=mkEl())},createElement(){return mkEl()},addEventListener(){},readyState:'complete'};
global.window=global;global.addEventListener=()=>{};global.document=doc;global.performance={now:()=>Date.now()};global.requestAnimationFrame=()=>0;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};global.devicePixelRatio=1;global.innerWidth=1280;global.innerHeight=720;
const s={};s.window=s;s.G={};
for(const k of ['console','Math','Date','JSON','setTimeout','clearTimeout','requestAnimationFrame'])s[k]=global[k];
s.addEventListener=()=>{};s.document=doc;s.performance=global.performance;s.requestAnimationFrame=()=>0;s.localStorage=global.localStorage;s.devicePixelRatio=1;s.innerWidth=1280;s.innerHeight=720;
vm.createContext(s);
for(const f of ['js/00_util.js','js/12_audio.js','js/01_pixel.js','js/02_stats.js','js/03_items.js','js/04_weapons.js','js/05_enemies.js','js/06_entities.js','js/07_player.js','js/07b_enemy.js','js/08_shop.js','js/09_ui.js','js/10_game.js','js/11_main.js'])vm.runInContext(fs.readFileSync(f,'utf8'),s,{filename:f});
const G=s.G;
G.UI.renderLevelUp=()=>{};G.UI.renderShop=()=>{};
G.game.init();G.game.newRun(G.CHAR_BY_ID['engineer']);
const p=G.game.player;
G.game.materials=87;G.game.runTime=512;
p.stats.kills=340;p.stats.eliteKills=5;p.stats.comboMax=23;p.level=7;
p.addWeapon(G.makeWeapon('drone',2));p.addWeapon(G.makeWeapon('turret',1));
G.game.saveRun();
G.UI.renderSubSave();
const host=cache['saveBody'];
console.log('renderSubSave OK, children='+host.children.length);
console.log('SAVED RUN:', JSON.stringify(G.Save.getRun()).slice(0, 300));
console.log('HOST_TEXT:', JSON.stringify(host._text));
function walk(node, depth) {
  if (!node || typeof node !== 'object') return;
  if (node._text) console.log('  '.repeat(depth) + '[' + (node.className || '?') + '] _text=' + JSON.stringify(node._text.slice(0, 60)));
  (node.children || []).forEach(function (c) { walk(c, depth + 1); });
}
walk(host, 0);
const txt=host._text||'';
const checks=['/ 20 波','340','7','87','5','23','无人机','哨戒炮'];
let pass=0;
for(const c of checks){const ok=txt.includes(c);if(ok)pass++;console.log((ok?'  ok ':'  MISS ')+c);}
console.log(pass===checks.length?'RESULT: PASS':'RESULT: FAIL');
process.exit(pass===checks.length?0:1);
