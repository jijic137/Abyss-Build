/* ============================================================
   01_pixel.js —— 像素精灵系统
   精灵用字符网格定义，编译成离屏 canvas 并按 scale 缓存。
   两类精灵：
     1) 固定调色板精灵  PX.def(name, palette, rows)
     2) 可染色精灵      PX.tint(name, rows)   —— 字符 o/A/B/C 分别是
        描边 / 主色 / 暗色 / 亮色，运行时按任意颜色生成变体
   ============================================================ */
'use strict';

(function () {

  var PX = {};
  G.PX = PX;

  var defs = {};      // name -> {rows, pal}
  var tintDefs = {};  // name -> rows
  var cache = {};     // key -> canvas

  /* ---------------- 颜色工具 ---------------- */
  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function rgb2hex(r, g, b) {
    function p(v) { v = Math.round(G.clamp(v, 0, 255)); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + p(r) + p(g) + p(b);
  }
  /** amt>0 变亮，amt<0 变暗 */
  function shade(color, amt) {
    var c = hex2rgb(color);
    if (amt >= 0) return rgb2hex(c[0] + (255 - c[0]) * amt, c[1] + (255 - c[1]) * amt, c[2] + (255 - c[2]) * amt);
    return rgb2hex(c[0] * (1 + amt), c[1] * (1 + amt), c[2] * (1 + amt));
  }
  PX.shade = shade;
  PX.hex2rgb = hex2rgb;

  /* ---------------- 定义 ---------------- */
  PX.def = function (name, pal, rows) { defs[name] = { pal: pal, rows: rows }; };
  PX.tint = function (name, rows) { tintDefs[name] = rows; };
  PX.has = function (name) { return !!(defs[name] || tintDefs[name]); };

  /* ---------------- 编译 ---------------- */
  function build(rows, pal, scale) {
    var h = rows.length, w = 0, y, x;
    for (y = 0; y < h; y++) w = Math.max(w, rows[y].length);
    var cv = document.createElement('canvas');
    cv.width = w * scale; cv.height = h * scale;
    var c = cv.getContext('2d');
    for (y = 0; y < h; y++) {
      var row = rows[y];
      for (x = 0; x < row.length; x++) {
        var ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        var col = pal[ch];
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    cv.pw = w; cv.ph = h;
    return cv;
  }

  /** 取固定调色板精灵 */
  PX.get = function (name, scale) {
    scale = scale || 1;
    var key = 'd|' + name + '|' + scale;
    if (cache[key]) return cache[key];
    var d = defs[name];
    if (!d) { console.warn('未定义精灵:', name); return null; }
    return (cache[key] = build(d.rows, d.pal, scale));
  };

  /** 取染色精灵 */
  PX.getTint = function (name, color, scale) {
    scale = scale || 1;
    var key = 't|' + name + '|' + color + '|' + scale;
    if (cache[key]) return cache[key];
    var rows = tintDefs[name];
    if (!rows) { console.warn('未定义染色精灵:', name); return null; }
    var pal = {
      o: shade(color, -0.72),
      A: color,
      B: shade(color, -0.35),
      C: shade(color, 0.45),
      D: shade(color, 0.8),
      w: '#f2f4ff',
      k: '#12141c'
    };
    return (cache[key] = build(rows, pal, scale));
  };

  /* ---------------- 绘制 ---------------- */
  /**
   * 居中绘制精灵
   * opt: {flip, rot, alpha, flash（0~1 白闪）, shadow}
   */
  PX.draw = function (ctx, cv, x, y, opt) {
    if (!cv) return;
    opt = opt || {};
    var w = cv.width, h = cv.height;
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
    ctx.translate(x, y);
    if (opt.rot) ctx.rotate(opt.rot);
    if (opt.flip) ctx.scale(-1, 1);
    ctx.drawImage(cv, -w / 2, -h / 2);
    if (opt.flash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = (opt.alpha === undefined ? 1 : opt.alpha) * opt.flash;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
  };

  /** 在 DOM 里塞一个精灵小画布（UI 用） */
  PX.node = function (cv) {
    var n = document.createElement('canvas');
    if (!cv) return n;
    n.width = cv.width; n.height = cv.height;
    n.style.width = cv.width + 'px'; n.style.height = cv.height + 'px';
    n.getContext('2d').drawImage(cv, 0, 0);
    return n;
  };

  /* ============================================================
     角色精灵 12x12 ~ 14x14
     ============================================================ */

  // —— 铁卫（坦克）
  PX.def('char_knight', {
    o: '#14161f', a: '#7d8aa8', b: '#4d5773', s: '#e8b98a', e: '#1a1c26', c: '#3f7dff'
  }, [
    '....oooo....',
    '...obbbbo...',
    '..oaaaaaao..',
    '..obssssbo..',
    '..obseesbo..',
    '...oassao...',
    '..oaaaaaao..',
    '.oabacacbao.',
    '.oaaaaaaaao.',
    '..oab..bao..',
    '..ob....bo..',
    '..oo....oo..'
  ]);

  // —— 游侠（远程）
  PX.def('char_ranger', {
    o: '#14161f', a: '#4fa86b', b: '#2f6b45', s: '#e8b98a', e: '#1a1c26', c: '#c9a227'
  }, [
    '....oooo....',
    '...oaaaao...',
    '..oaaaaaao..',
    '...osssso...',
    '...oseeso...',
    '....osso....',
    '...obbbbo...',
    '..obacabo...',
    '..obbbbbo...',
    '...ob..bo...',
    '...ob..bo...',
    '..ooo..ooo..'
  ]);

  // —— 术士（元素）
  PX.def('char_mage', {
    o: '#14161f', a: '#8b5cf6', b: '#5b32b8', s: '#e8b98a', e: '#ffe66d', c: '#ffd24a'
  }, [
    '.....oo.....',
    '....oaao....',
    '...oaaaao...',
    '..oaaaaaao..',
    '..osseesso..',
    '...ossso....',
    '..obaaabo...',
    '.obaacaabo..',
    '.obaaaaabo..',
    '..obaaabo...',
    '...obbbo....',
    '..oo....oo..'
  ]);

  // —— 狂徒（近战暴力）
  PX.def('char_brute', {
    o: '#14161f', a: '#c0392b', b: '#7b1f16', s: '#d9a06b', e: '#ffdd55', c: '#3a3f52'
  }, [
    '...oooooo...',
    '..obbbbbbo..',
    '..osssssso..',
    '..oseesseo..',
    '..ossccsso..',
    '...oaaaao...',
    '.oaaaaaaaao.',
    'oaabaaaabaao',
    '.oaaaaaaaao.',
    '..oaa..aao..',
    '..ob....bo..',
    '.ooo....ooo.'
  ]);

  // —— 工匠（工程）
  PX.def('char_engineer', {
    o: '#14161f', a: '#e0902a', b: '#8a5311', s: '#e8b98a', e: '#1a1c26', c: '#5aa7ff'
  }, [
    '...oooooo...',
    '..oaaaaaao..',
    '..obbbbbbo..',
    '...osssso...',
    '...oceeco...',
    '....osso....',
    '..obaaabo...',
    '.obacccabo..',
    '.obaaaaabo..',
    '..ob.a.bo...',
    '..ob...bo...',
    '.ooo...ooo..'
  ]);

  // —— 影刺（暴击闪避）
  PX.def('char_shadow', {
    o: '#0e0f16', a: '#3d4a6b', b: '#222a40', s: '#c9a78a', e: '#7de0ff', c: '#7de0ff'
  }, [
    '....oooo....',
    '...obbbbo...',
    '..obaaaabo..',
    '..obssssbo..',
    '..obeeeebo..',
    '...oaaaao...',
    '..obaaaabo..',
    '.obaacaabo..',
    '.obaaaaabo..',
    '..ob.aa.bo..',
    '...ob..bo...',
    '..oo....oo..'
  ]);

  // —— 炼金术士（毒/元素）
  PX.def('char_alchemist', {
    o: '#14161f', a: '#4f8a3a', b: '#2f5a24', s: '#e8d8b0', e: '#8fc040', c: '#c9a227'
  }, [
    '....oooo....',
    '...oaaaao...',
    '..oaaaaaao..',
    '..osssssso..',
    '..oseesseo..',
    '...oaaaao...',
    '..obaaabo...',
    '.obaacaabo..',
    '.obaaaaabo..',
    '..ob.ao.bo..',
    '...ob..bo...',
    '..oo....oo..'
  ]);

  // —— 守望者（工程/炮台）
  PX.def('char_warden', {
    o: '#14161f', a: '#5a7d9c', b: '#2f4457', s: '#e8b98a', e: '#ffd24a', c: '#c9d6e2'
  }, [
    '...oooooo...',
    '..oaaaaaao..',
    '..obbbbbbo..',
    '...osssso...',
    '...oceeco...',
    '....osso....',
    '..obaaabo...',
    '.obacccabo..',
    '.obaaaaabo..',
    '..obaaabo...',
    '...obbbo....',
    '.ooo...ooo..'
  ]);

  /* ============================================================
     敌人精灵
     ============================================================ */

  PX.def('e_worm', { o: '#2a1520', a: '#c2557a', b: '#8a2f4f', e: '#ffd24a' }, [
    '.....ooooo.....',
    '...oaaaaaao....',
    '..oaaaaaaaao...',
    '..oaeaaaaaaeao.',
    '..oaaaaaaaaaao.',
    '...obaaaaabao..',
    '....oaaaaao....',
    '...oaaaaaao....',
    '..oaaaaaaaao...',
    '...oaaaaao.....',
    '....obbbbo.....'
  ]);

  PX.def('e_bat', { o: '#1a1424', a: '#6f4ea8', b: '#3d2a63', e: '#ff5f5f' }, [
    'oo............oo',
    'obo..........obo',
    'ooboo......ooboo',
    '.oobooooooboo...',
    '..oabaaaabao....',
    '..oaeaaaaeao....',
    '..oaaaaaaaao....',
    '...obbbbbbo.....',
    '....o....o......',
    '.....oooo.......'
  ]);

  PX.def('e_beetle', { o: '#12180f', a: '#5a7a3a', b: '#33481f', e: '#ffcf4a', c: '#8fae5e' }, [
    '......cc......',
    '.....oco......',
    '...oooooo.....',
    '..oaaaaaao....',
    '.oacccccao....',
    'oacaaaaacaao..',
    'oacaaaaacaao..',
    'oabaaaaabao...',
    '.obaaaaabo....',
    '.oobbbboo.....',
    '.o.o..o.o.....',
    'o..o..o..o....'
  ]);

  PX.def('e_eye', { o: '#1b1020', a: '#d94f8c', b: '#8f2c5c', w: '#f4f6ff', e: '#160c1a' }, [
    '....oooo......',
    '..oaaaaaao....',
    '.oawwwwwwao...',
    'oawweewwwao...',
    'oawweewwwao...',
    'oawwwwwwwao...',
    '.oawwwwwao....',
    '..oaaaaaao....',
    '...oooooo.....',
    '....o..o......',
    '...o..o.......',
    '...o..o.......',
    '..o..o........',
    '..o..o........'
  ]);

  PX.def('e_slime', { o: '#0f2018', a: '#3fbf8f', b: '#217a5a', e: '#0f2018', c: '#8ff0cc' }, [
    '....cccc......',
    '..caaaaac.....',
    '.oaaaaaao.....',
    'oaeaaaaaeao...',
    'oaaaaaaaaao...',
    'oaaaaaaaaao...',
    'obaaaaaabo....',
    'obaabbbaabo...',
    'obaaaaaaabo...',
    '.obbbbbbbo....',
    '..o.oo.o.o....',
    '...o.o.o.o....',
    '....ooooo.....'
  ]);

  PX.def('e_skeleton', { o: '#1a1a1c', a: '#dcdfe8', b: '#9aa0b0', e: '#ff3b3b' }, [
    '...oooo.....',
    '..oaaaaao...',
    '.oaeaaaeao..',
    '.oaaaaaao...',
    '..o.aa.o....',
    '...oaoo.....',
    '..oaaaao....',
    '.oa.b.b.ao..',
    'oab.bb.bao..',
    'oab.bb.bao..',
    '.oabbbabao..',
    '..oab.bao...',
    '..oa...ao...',
    '..oa...ao...',
    '..oo...oo...',
    '..o.....o...'
  ]);

  PX.def('e_bomber', { o: '#241208', a: '#e07b39', b: '#8f4413', e: '#fff35c', c: '#ffdb4a' }, [
    '.....c.......',
    '....cec......',
    '...occco.....',
    '..ooooooo....',
    '.oaaaaaao....',
    'oaeaaaaaeao..',
    'oaaaaaaaao...',
    'obaaaaaabo...',
    '.obbbbbbo....',
    '..o.oo.o.....',
    '.o.o..o.o....',
    'o..o..o..o...'
  ]);

  PX.def('e_wraith', { o: '#101828', a: '#5fd7e0', b: '#2b7f8c', e: '#eaffff' }, [
    '...oooo.....',
    '..oaaaaao...',
    '.oaaaaaao...',
    '.oaeaaaeao..',
    '.oaaaaaao...',
    'obaaaaaabo..',
    'obaaaaaabo..',
    'obaaaaaabo..',
    '.obaaaaabo..',
    '..obaaabo...',
    '.o.obbo.o...',
    'oo.o..o.oo..',
    'o.o..o..o.o.',
    'o..o..o..o..',
    '..o....o....'
  ]);

  PX.def('e_spider', { o: '#120e18', a: '#7a3fbf', b: '#48237a', e: '#ff5f5f' }, [
    'o..o....o..o..',
    '.o.o....o.o...',
    '..oooooooo....',
    '.oaaaaaaaao...',
    'oaeaaaaaaeao..',
    'oaaaaaaaaaao..',
    '.obaaaaabo....',
    '..oooooo......',
    '.o.o..o.o.....',
    'o...o..o...o..',
    'o..o....o..o..',
    'o..o....o..o..'
  ]);

  PX.def('e_stone', { o: '#14161a', a: '#7d7f8c', b: '#4a4c57', e: '#5ad1ff', c: '#a2a5b2' }, [
    '..oooooooo....',
    '.oaaaaaaaao...',
    'oacaaaaacaao..',
    'oaaaaaaaaaao..',
    'oaeaaaaeaaao..',
    'obaaaaaaabo...',
    'oabbbbbbabo...',
    'oabccccabao...',
    'oabaaaaabao...',
    '.obaaaaabo....',
    '..oab.bao.....',
    '..oa...ao.....',
    '..oa...ao.....',
    '..oo...oo.....',
    '..o.....o.....'
  ]);

  PX.def('e_warlock', { o: '#150f22', a: '#4b3f8f', b: '#2a2154', e: '#7dffb0', c: '#9d7bff' }, [
    '...oooo.......',
    '..oaaaaao..c..',
    '.oaeaaaeao.c..',
    '.oaaaaaao..c..',
    '..oaaaaao..c..',
    '.oabbbbao..c..',
    'oabccccbao.c..',
    'oabaaaaabao...',
    'oabaaaaabao...',
    '.obaaaaabo....',
    '..obaaabo.....',
    '..o.bb.o......',
    '..o.bb.o......',
    '...oooo.......'
  ]);

  PX.def('e_charger', { o: '#1c1210', a: '#a8563a', b: '#6b2f1d', e: '#ffd24a', c: '#e8dcc8' }, [
    '..........cc..',
    '.........occo.',
    '........occoo.',
    '..ooooooooo...',
    '.oaaaaaaaao...',
    'oaeaaaaaaeao..',
    'oaaaaaaaaaao..',
    'obaaaaaaabo...',
    '.ob.oo.obo....',
    '.o.o..o.o.....',
    'o..o..o..o....',
    'o..o..o..o....'
  ]);

  /* -------- 精英 -------- */
  PX.def('el_ironclad', { o: '#0f1418', a: '#5b7d9c', b: '#2f4457', e: '#ff6b3b', c: '#c9d6e2' }, [
    '..oo......cc..',
    '.oooo....occo.',
    '.oaaaaaaccoo..',
    'oaacaeeaccoo..',
    'oaacaaaccoo...',
    'oaacccacccoo..',
    'obaaaaaccoo...',
    '.obbbbaccoo...',
    '..ob.occoo....',
    '..o.o.oo.o.o..',
    '..o.o..o.o.o..'
  ]);

  PX.def('el_butcher', { o: '#1a0d0d', a: '#b03030', b: '#6b1616', e: '#ffe14a', c: '#d9d9e0' }, [
    '...oooooo...',
    '..obbbbbbo..',
    '.oaaaaaaaao.',
    'oaaeaaaaeaao',
    'oaaaaaaaaaao',
    'oaaawwwwwaao',
    'obaaakkkkabo',
    'obbaaaaaabbo',
    '.oaa.kk.aao.',
    '.ob.kkkk.bo.',
    '.oo.oooo.oo.'
  ]);

  PX.def('el_hexer', { o: '#170f26', a: '#8f4fd6', b: '#4d2280', e: '#8fffd6', c: '#e0b3ff' }, [
    '....oooo....',
    '...oaaaao...',
    '..oaaaaaao..',
    '.oaaaaaaaao.',
    '.oaaeaaeaao.',
    '.oaaaaaaaao.',
    'obaaoooaabo.',
    'obaoowwoabo.',
    'obaoowwoabo.',
    'obaaoooaabo.',
    '.obaaaaabo..',
    '..obbbbbo...'
  ]);

  PX.def('el_brood', { o: '#101a12', a: '#4f9c46', b: '#26542a', e: '#ffe14a', c: '#9be86f' }, [
    'o...o..o...o',
    '.o..o..o..o.',
    '..oooooooo..',
    '.oaaccccaao.',
    'oaeaaaaaaeao',
    'oaaaaaaaaaao',
    'oaaccccccaao',
    'obaaaaaaaabo',
    '.obbbbbbbbo.',
    '..oooooooo..',
    '.o..o..o..o.',
    'o...o..o...o'
  ]);

  /* -------- BOSS -------- */
  PX.def('boss_behemoth', {
    o: '#100a12', a: '#8c3f6b', b: '#4d1f3c', e: '#ffdd4a', c: '#d97fb0', k: '#22101c', g: '#6fae3a'
  }, [
    '..o............o..',
    '..oo..........oo..',
    '.obo.oooooo.obo...',
    'oobooaaaaaaaoobo..',
    'ooaeoaaaaaaaaeoaao',
    'oaeaaaaeaaaaeaaaao',
    'oaeaaaaaaaaaaeaaao',
    'oaaaaakkkkkaaaaaao',
    'oaaakwwkkwwkaaaaao',
    'obaaakgkkgkaaaabo.',
    'obbaaakkkkaaaabbo.',
    'obbbaaaaaggabbbbo.',
    '.obbbbbbbbbbbbbo..',
    '.oo.oo.oooo.oo.oo.'
  ]);

  PX.def('boss_abyss', {
    o: '#08080f', a: '#3b2f8c', b: '#1c1550', e: '#ff3b6b', c: '#7d6bff', k: '#0d0a1e', w: '#e6e9ff', g: '#b39bff'
  }, [
    '..c.c.c.c.c.c.c...',
    '.ggggggggggggggg..',
    '..oooooooooooooo..',
    '.oaaaaaaaaaaaaaao.',
    'oaccccccccccccccao',
    'oaceaaaaaaeaaacaco',
    'oacaawwwwaaaaggaco',
    'oacagwwwwwwwaggaco',
    'oacagwwwwwwwaggaco',
    'oacaawwwwaaaaggaco',
    'oaccccccccccccccao',
    'obaaaaaaaaaaaaaabo',
    'obbbaaaaaaaaaabbbo',
    '.obbbbkkkkkkbbbbo.',
    '.oo.oo.kk.kk.oo.oo',
    '.o..o..oo.oo..o..o'
  ]);

  /* ---------------- 新增敌人 ---------------- */
  PX.def('e_swarmling', { o: '#14161f', a: '#7a3fbf', b: '#48237a', e: '#ff5f5f' }, [
    '...oooo.......',
    '..oaaaao......',
    '.oaeaeao......',
    '.oaaaaao......',
    '..oaaaao......',
    '.oaaaao.......',
    'oaaaao........',
    '.oaaaao.......',
    '..obbao.......',
    '...oo.........',
    '.o.o.o.o......',
    'o.o.o.o.o.....'
  ]);
  PX.def('e_mimic', { o: '#1a120a', a: '#b98a3f', b: '#7a5820', e: '#ffd24a', c: '#e0b96b' }, [
    'oooooooooooo..',
    'oaaaaaaaaaao..',
    'oabbbbbbbabo..',
    'oaooooooooao..',
    'oaeaaaaaeao...',
    'oaaaaaaaaao...',
    'oabbbbbbbao...',
    'obeeeeeebo....',
    'obe.ee.ebo....',
    'obeeeeeebo....',
    '.obbbbbobo....',
    '..ooooooo.....',
    '..............',
    '..............'
  ]);
  PX.def('e_gargoyle', { o: '#14161a', a: '#7d7f8c', b: '#4a4c57', e: '#5ad1ff', c: '#a2a5b2' }, [
    'c..........c..',
    'co........oc..',
    'oco......oco..',
    '.ooccccoo.....',
    '.oaaaaaao.....',
    '.oaceceao.....',
    '.oaeeeaeo.....',
    '.oaaaaaao.....',
    '.obaaaaabo....',
    '.oab..bao.....',
    '..ob..bo......',
    '..oo..oo......',
    '..............'
  ]);
  PX.def('e_hex_archer', { o: '#170f26', a: '#8f4fd6', b: '#4d2280', e: '#8fffd6', c: '#e0b3ff' }, [
    '...oooo.......',
    '..oaaaaao.....',
    '.oaeaaaeao....',
    '.oaaaaaao.....',
    '..oaaaaao.....',
    '.oabbbbao.....',
    'oabaaaaabao...',
    'oabaaaaabao...',
    '.obaaaaabo.c..',
    '..obaaabo.cc..',
    '..o.bb.o..c...',
    '..o.bb.o.c....',
    '...oooo..c....',
    '..............'
  ]);
  PX.def('e_void_horror', { o: '#0e0f16', a: '#3d4a6b', b: '#222a40', e: '#9f5cff', c: '#7de0ff' }, [
    '...oooo.......',
    '..oaaaaao.....',
    '.oaoeaoao.....',
    'oaeoaoeao.....',
    'oaoeaoaoo.....',
    '.oaaaaaao.....',
    'oabaacaabao...',
    'oabaaaaaabo...',
    '.ob.aa.bo.....',
    '..ob..bo......',
    '.oo....oo.....',
    '..o....o......',
    '..............'
  ]);
  PX.def('e_glutton', { o: '#0f2018', a: '#3fbf8f', b: '#217a5a', e: '#8ff0cc', c: '#0f2018' }, [
    '..oooooooo....',
    '.oaaaaaaaao...',
    'oacccccccaao..',
    'oaceeeeceao...',
    'oaceeeeeeaao..',
    'oae.eeee.eao..',
    'oae.eeee.eao..',
    'oaceeeeeeaao..',
    'oacccccccaao..',
    '.obaaaaaabo...',
    '..obbbbbbo....',
    '...oooooo.....'
  ]);
  PX.def('el_reaper', { o: '#0c0c14', a: '#2a2a3a', b: '#15151f', e: '#ff3b6b', c: '#c9c9d8', k: '#000' }, [
    '....oooo..c.',
    '...oaaaao.cc',
    '..oabbbaoccc',
    '..oakekao.cc',
    '..oaeeeao.c.',
    '...oaaaao.c.',
    '..oaaaaaao.c',
    '.oaaaaaaaok.',
    '.oaaccccaak.',
    '.oaaaaaaaok.',
    '..oabbbbao..',
    '..oab..bao..',
    '..ob....bo..',
    '.oo......oo.'
  ]);

  /* ============================================================
     掉落物 / 效果
     ============================================================ */
  PX.def('p_mat', { o: '#5a4400', a: '#ffd24a', c: '#fff3b0', b: '#c99a00' }, [
    '..oo..',
    '.ocao.',
    'ocaabo',
    'obaabo',
    '.obbo.',
    '..oo..'
  ]);
  PX.def('p_heal', { o: '#3a0d12', a: '#ff5f6d', c: '#ffb3bb' }, [
    '..oo..',
    '..ca..',
    'ooaaoo',
    'oaccao',
    '.oaao.',
    '..oo..'
  ]);
  PX.def('p_crate', { o: '#3a2a12', a: '#b98a3f', b: '#7a5820', c: '#e0b96b' }, [
    'oooooo',
    'ocaabo',
    'oaccao',
    'oaccao',
    'obaaco',
    'oooooo'
  ]);

  /* ============================================================
     可染色图标 —— 物品/武器通用（10x10）
     字符：o 描边 / A 主色 / B 暗 / C 亮 / D 高光 / w 白 / k 黑
     ============================================================ */

  function T(name, rows) { PX.tint(name, rows); }

  T('ic_gem', [
    '..oooo....',
    '.oCAABo...',
    'oCAAAABo..',
    'oAAAAAABo.',
    '.oAAAABo..',
    '..oAABo...',
    '...oAo....',
    '....o.....',
    '..........',
    '..........'
  ]);
  T('ic_shield', [
    '.oooooo...',
    'oCAAAABo..',
    'oAAAAAABo.',
    'oAADDAAABo',
    'oAADDAAABo',
    '.oAAAAABo.',
    '..oAAABo..',
    '...oABo...',
    '....oo....',
    '..........'
  ]);
  T('ic_boot', [
    '..oooo....',
    '..oCABo...',
    '..oAABo...',
    '..oAABo...',
    '..oAAABo..',
    '.oAAAAABo.',
    'oCAAAAAABo',
    'oBBBBBBBBo',
    '.oooooooo.',
    '..........'
  ]);
  T('ic_heart', [
    '.oo..oo...',
    'oCAooABo..',
    'oAAAAAABo.',
    'oAADAAAABo',
    '.oAAAAABo.',
    '..oAAABo..',
    '...oABo...',
    '....oo....',
    '..........',
    '..........'
  ]);
  T('ic_blade', [
    '.......ooo',
    '......oCAo',
    '.....oCABo',
    '....oCABo.',
    '...oCABo..',
    '..oCABo...',
    '.oBABo....',
    'oBBBo.....',
    'oBo.......',
    'o.........'
  ]);
  T('ic_bolt', [
    '....ooo...',
    '...oCAo...',
    '..oCAo....',
    '.oCAoooo..',
    'oCAAAAAo..',
    'oooooCAo..',
    '....oAo...',
    '...oAo....',
    '..oAo.....',
    '..oo......'
  ]);
  T('ic_flame', [
    '....oo....',
    '...oCAo...',
    '..oCAABo..',
    '.oCAAAABo.',
    'oCAADDAABo',
    'oAADwwDABo',
    'oAADDDDABo',
    '.oAAAAABo.',
    '..oBBBBo..',
    '...oooo...'
  ]);
  T('ic_eye', [
    '..oooooo..',
    '.oCAAAABo.',
    'oAAwwwwABo',
    'oAwwkkwwBo',
    'oAwwkkwwBo',
    'oAAwwwwABo',
    '.oBAAAABo.',
    '..oooooo..',
    '..........',
    '..........'
  ]);
  T('ic_ring', [
    '..oooo....',
    '.oCAABo...',
    'oAoooABo..',
    'oAo.oABo..',
    'oAo.oABo..',
    'oAoooABo..',
    '.oBAABo...',
    '..oooo....',
    '..........',
    '..........'
  ]);
  T('ic_skull', [
    '..oooooo..',
    '.oCAAAABo.',
    'oAAAAAAABo',
    'oAkkAAkkBo',
    'oAkkAAkkBo',
    'oAAAoAAABo',
    '.oAkokABo.',
    '..oAAABo..',
    '..okokoo..',
    '..oooo....'
  ]);
  T('ic_gear', [
    '..o.oo.o..',
    '.oCoAAoBo.',
    'oCAAAAAABo',
    '.oAAooAABo',
    'ooAo..oABo',
    'ooAo..oABo',
    '.oAAooAABo',
    'oBAAAAAABo',
    '.oBoAAoBo.',
    '..o.oo.o..'
  ]);
  T('ic_potion', [
    '...oooo...',
    '...oCAo...',
    '..ooAAoo..',
    '.oCAAAABo.',
    'oCAADDAABo',
    'oAADwwDABo',
    'oAAADDAABo',
    'oBAAAAAABo',
    '.oBBBBBBo.',
    '..oooooo..'
  ]);
  T('ic_book', [
    'oooooooooo',
    'oCAAoAAABo',
    'oAAAoAAABo',
    'oADAoADABo',
    'oAAAoAAABo',
    'oADAoADABo',
    'oAAAoAAABo',
    'oBBBoBBBBo',
    'oooooooooo',
    '..........'
  ]);
  T('ic_claw', [
    'o..o..o...',
    'oA.oA.oA..',
    'oA.oA.oA..',
    'oAAoAAoAo.',
    '.oAAAAAABo',
    '.oCAAAAABo',
    '..oBAAABo.',
    '...oBBBo..',
    '....ooo...',
    '..........'
  ]);
  T('ic_wing', [
    'oo........',
    'oCAo......',
    'oCAAo.....',
    'oCAAAo....',
    'oAAAAAo...',
    'oAAAAAAo..',
    'oBAAAAABo.',
    '.oBBBBBBo.',
    '..oooooo..',
    '..........'
  ]);
  T('ic_crystal', [
    '....oo....',
    '...oCAo...',
    '..oCAABo..',
    '.oCAAAABo.',
    'oCAAAAAABo',
    'oAAADDAABo',
    'oBAAAAAABo',
    '.oBAAAABo.',
    '..oBAABo..',
    '...oooo...'
  ]);
  T('ic_horn', [
    '.......ooo',
    '.....ooCAo',
    '...ooCAABo',
    '..oCAAAABo',
    '.oCAAAAABo',
    'oCAAAAABo.',
    'oAAAAABo..',
    'oBAAABo...',
    '.oBBBo....',
    '..ooo.....'
  ]);
  T('ic_coin', [
    '..oooooo..',
    '.oCAAAABo.',
    'oCAADDAABo',
    'oAADAADABo',
    'oAADAADABo',
    'oAADDDDABo',
    'oBAADDAABo',
    '.oBAAAABo.',
    '..oooooo..',
    '..........'
  ]);
  T('ic_orb', [
    '..oooooo..',
    '.oCDAAABo.',
    'oCDAAAAABo',
    'oDAAAAAABo',
    'oAAAAAAABo',
    'oAAAAAAABo',
    'oBAAAAABBo',
    '.oBBAABBo.',
    '..oooooo..',
    '..........'
  ]);
  T('ic_mask', [
    '.oooooooo.',
    'oCAAAAAABo',
    'oAkkAAkkBo',
    'oAkkAAkkBo',
    'oAAAAAAABo',
    'oBAAooAABo',
    '.oBAAAABo.',
    '..oBAABo..',
    '...oooo...',
    '..........'
  ]);
  T('ic_leaf', [
    '.......ooo',
    '....oooCAo',
    '..ooCAAAAo',
    '.oCAAAAAAo',
    'oCAAADAABo',
    'oAAADAAABo',
    'oAADAAABo.',
    'oBDAAABo..',
    '.oBBBo....',
    '..ooo.....'
  ]);
  T('ic_bone', [
    'oo.....oo.',
    'oCAo.oCAo.',
    'oAAAoAAABo',
    '.oAAAAABo.',
    '..oAAABo..',
    '.oAAAAABo.',
    'oAAAoAAABo',
    'oBAo.oBABo',
    'oo.....oo.',
    '..........'
  ]);
  T('ic_star', [
    '....oo....',
    '....CA....',
    '..ooCAoo..',
    'ooCAAAABoo',
    '.oCAAAABo.',
    '..oAAABo..',
    '.oAAoAABo.',
    'oBAo.oABo.',
    'oo.....oo.',
    '..........'
  ]);
  T('ic_hourglass', [
    'oooooooo..',
    'oBAAAAABo.',
    '.oBAAABo..',
    '..oBABo...',
    '...oAo....',
    '..oCAAo...',
    '.oCAAAAo..',
    'oCAAAAAAo.',
    'oooooooo..',
    '..........'
  ]);

  /* -------- 第二批新增敌人精灵 -------- */
  PX.def('e_mite', { o: '#2a1520', a: '#d2557a', b: '#8a2f4f', e: '#ffe' }, [
    '...oooo.......',
    '..oaaaao......',
    '.oaeaeao......',
    '.oaaaaao......',
    '..oaaaao......',
    '.oaaaao.......',
    'oaaaao........',
    '.obbao........',
    '...oo.........',
    '.o.o.o.o......',
    'o.o.o.o.o.....',
    '..............'
  ]);

  PX.def('e_crystal', { o: '#0a1a24', a: '#3bd6ff', b: '#1c6f8f', c: '#bfeaff', e: '#ff5f5f' }, [
    '.....cc.......',
    '....cac.......',
    '...caaac......',
    '..caaac.......',
    '.caaaaaac.....',
    'caaaaaeaac....',
    'caaaaaaaac....',
    '.caaaaac......',
    '..caaac.......',
    '...cac........',
    '....c.........',
    '..............',
    '..............'
  ]);

  PX.def('e_ogre', { o: '#12100c', a: '#7a6a4a', b: '#4a3f2a', c: '#a8966e', e: '#ffcf4a' }, [
    '..oooooooo....',
    '.oaaaaaaaao...',
    'oacaaaaacaao..',
    'oaeaaaaaeao...',
    'oaaaaaaaaaao..',
    'oabbaaaabbo...',
    '.oabbbbabo....',
    'ooaaaaaaaoo...',
    'oba.o..o.abo..',
    'oba.o..o.abo..',
    '.obaaaaabo....',
    '..obaaabo.....',
    '..oa..ao......',
    '..oa..ao......',
    '..oo..oo......'
  ]);

  PX.def('el_warden', { o: '#0c1420', a: '#3a5a7a', b: '#1f3548', e: '#7fffd6', c: '#cfe6ff' }, [
    '....oooo......',
    '...oaaaao.....',
    '..oaaaaaao....',
    '.oaaaaaaaao...',
    '.oaeeaeeaao...',
    '.oaaaaaaaao...',
    'ooaaaaaaaaoo..',
    'oobaaaaaaboo..',
    '.obbaaaaabbo..',
    '..obbaaabbbo..',
    '...obbbbbbo...',
    '....oooooo....'
  ]);

  /* -------- 武器图标（可染色，12x12） -------- */
  T('w_knife', [
    '.........ooo',
    '........oCAo',
    '.......oCAo.',
    '......oCAo..',
    '.....oCAo...',
    '....oCAo....',
    '...oCAo.....',
    '..oBAo......',
    '.oBBo.......',
    'oBoBBo......',
    'oo..oBo.....',
    '.....oo.....'
  ]);
  T('w_sword', [
    '........ooo.',
    '.......oCAo.',
    '......oCAo..',
    '.....oCAo...',
    '....oCAo....',
    '...oCAo.....',
    '..oCAo......',
    '.ooAoo......',
    'oBBBBBo.....',
    '.ooBoo......',
    '..oBo.......',
    '..ooo.......'
  ]);
  T('w_hammer', [
    '..oooooo....',
    '.oCAAAABo...',
    'oCAADDAABo..',
    'oCAADDAABo..',
    '.oBAAAABo...',
    '..oooAoo....',
    '....oAo.....',
    '....oAo.....',
    '....oAo.....',
    '....oAo.....',
    '...oBBBo....',
    '...ooooo....'
  ]);
  T('w_spear', [
    '.......oo...',
    '......oCAo..',
    '.....oCAAo..',
    '.....oCAo...',
    '....ooAo....',
    '...oBAo.....',
    '..oBAo......',
    '.oBAo.......',
    'oBAo........',
    'oAo.........',
    'oo..........',
    '............'
  ]);
  T('w_fist', [
    '..oooooo....',
    '.oCAAAABo...',
    'oCAAAAAABo..',
    'oAADAADABo..',
    'oAADAADABo..',
    'oAAAAAAABo..',
    'oBAAAAAABo..',
    '.oBAAAABo...',
    '..oBBBBo....',
    '...oooo.....',
    '............',
    '............'
  ]);
  T('w_chainsaw', [
    'o.o.o.o.....',
    'oAoAoAoo....',
    'oAAAAAABo...',
    'oCAAAAAABo..',
    'oAADDDAAABo.',
    'oAADwwDAABo.',
    'oBAADDDAABo.',
    '.oBAAAAABo..',
    '..oBBBBBo...',
    '...ooooo....',
    '............',
    '............'
  ]);
  T('w_pistol', [
    '..oooooooo..',
    '.oCAAAAAABo.',
    'oCAAAAAAABo.',
    'oAAoooooooo.',
    'oAABo.......',
    'oAABo.......',
    '.oAABo......',
    '..oAABo.....',
    '..oBBBo.....',
    '...ooo......',
    '............',
    '............'
  ]);
  T('w_shotgun', [
    'oooooooooo..',
    'oCAAAAAAABo.',
    'oCAAAAAAABo.',
    'ooooAAoooo..',
    '...oAABo....',
    '..oBAABo....',
    '.oBAABo.....',
    'oBAABo......',
    'oBBBo.......',
    'oooo........',
    '............',
    '............'
  ]);
  T('w_smg', [
    '..oooooooo..',
    '.oCAAAAAAo..',
    'oCAAAAAAAo..',
    'oAAoooooo...',
    'oAABo.......',
    'oAAABooo....',
    'oAAAAAABo...',
    '.oAABBBBo...',
    '..oAABo.....',
    '..oBBo......',
    '..ooo.......',
    '............'
  ]);
  T('w_sniper', [
    '....oooo....',
    '...oCAABo...',
    'oooooAAooooo',
    'oCAAAAAAAABo',
    'oCAAAAAAAABo',
    'ooooAAoooooo',
    '...oAABo....',
    '..oBAABo....',
    '.oBAABo.....',
    'oBBBo.......',
    'ooo.........',
    '............'
  ]);
  T('w_crossbow', [
    'o.........o.',
    'oAo.....oAo.',
    'oAAo...oAAo.',
    '.oAAoooAAo..',
    '..oAAAAAo...',
    '...oCAAo....',
    '....oAo.....',
    '....oAo.....',
    '...oBABo....',
    '..oBBBBBo...',
    '..ooooooo...',
    '............'
  ]);
  T('w_grenade', [
    '.....oo.....',
    '....oCAo....',
    '...ooAAoo...',
    '..oCAAAABo..',
    '.oCAAAAAABo.',
    'oCAADDDAABo.',
    'oAAADwDAABo.',
    'oAAAADDAABo.',
    'oBAAAAAAABo.',
    '.oBAAAAABo..',
    '..oBBBBBo...',
    '...ooooo....'
  ]);
  T('w_flamer', [
    '.oooooooo...',
    'oCAAAAAABo..',
    'oCAAAAAABoo.',
    'oAAoooooAAAo',
    'oAABo..ooooo',
    'oAABo.......',
    '.oAABo......',
    '..oAABo.....',
    '..oBBBo.....',
    '...ooo......',
    '............',
    '............'
  ]);
  T('w_wand', [
    '.......oo...',
    '......oCAo..',
    '.....oCDAo..',
    '.....oADAo..',
    '......oAo...',
    '.....oBo....',
    '....oBo.....',
    '...oBo......',
    '..oBo.......',
    '.oBo........',
    'oBo.........',
    'oo..........'
  ]);
  T('w_staff', [
    '....oooo....',
    '...oCAABo...',
    '..oCADDABo..',
    '..oAADDABo..',
    '..oBAAAABo..',
    '...oBAABo...',
    '.....oAo....',
    '.....oAo....',
    '.....oAo....',
    '.....oAo....',
    '....oBBo....',
    '....oooo....'
  ]);
  T('w_ice', [
    '....oo......',
    '..o.CA.o....',
    '..ooCAoo....',
    'ooooCAoooo..',
    'oCAAAAAAABo.',
    'ooooCAoooo..',
    '..ooCAoo....',
    '..o.BA.o....',
    '....oo......',
    '............',
    '............',
    '............'
  ]);
  T('w_dart', [
    '.........oo.',
    '........oCAo',
    '.......oCAo.',
    '..oo..oCAo..',
    '.oCAooCAo...',
    'oCAAAAAo....',
    '.oBAAAo.....',
    '..oBAAoo....',
    '...oBAABo...',
    '....oBBBo...',
    '.....ooo....',
    '............'
  ]);
  T('w_turret', [
    '....oooo....',
    '...oCAABo...',
    '..oCAAAABo..',
    '..oAADDABooo',
    '..oAADDABCAo',
    '..oBAAAABooo',
    '.ooBAAABoo..',
    'oCAAAAAAABo.',
    'oCAAAAAAABo.',
    'oBBBBBBBBBo.',
    'ooooooooooo.',
    '............'
  ]);
  T('w_drone', [
    '....oo......',
    '...oCAo.....',
    '..oCADCo....',
    '.oCAADACo...',
    'ooCAADDACo..',
    'oBCADDACBo..',
    'ooBABABCo...',
    '.oCACABo....',
    '..oBBBo.....',
    '..oooo......',
    '............',
    '............'
  ]);
  T('w_mine', [
    '....oooo....',
    '...oCAACo...',
    '..oCADDACo..',
    '.oCAADDDACo.',
    '.oCAADDAACo.',
    '.oBADDDAACo.',
    '.oBAAAAACo..',
    '..oBAAAAo...',
    '...oBBBBo...',
    '....oooo....',
    '............',
    '............'
  ]);
  T('w_boomerang', [
    '..oooo......',
    '.oCAABo.....',
    'oCAABo......',
    'oAABo.......',
    'oAABooo.....',
    'oAAAAABo....',
    'oBAAAAABo...',
    '.oBAAAAABo..',
    '..oBAAAABo..',
    '...oBBBBBo..',
    '....oooooo..',
    '............'
  ]);
  T('w_shuriken', [
    '.....oo.....',
    '....oCAo....',
    '....oAAo....',
    'oo..oAAo..oo',
    'oCAooAAooCAo',
    'oAAAAkkAAAAo',
    'oAAAAkkAAAAo',
    'oBAooAAooBAo',
    'oo..oAAo..oo',
    '....oAAo....',
    '....oBBo....',
    '.....oo.....'
  ]);

  /* -------- 新增武器图标 -------- */
  T('w_katana', [
    '.........ooo',
    '........oCAo',
    '.......oCAo.',
    '......oCAo..',
    '.....oCAo...',
    '....oCAo....',
    '...oCAo.....',
    '..oCAo......',
    '.ooAoo......',
    'oBBBo.......',
    'oo.oBo......',
    '...oo.......'
  ]);
  T('w_halberd', [
    '......oooo..',
    '.....oCAAo..',
    '....oCAAAo..',
    '...oCAAAABo.',
    '..ooCAAABoo.',
    '.oBAoooAAo..',
    'oBAo...oAo..',
    'oAo.....oo..',
    'oo..........',
    '............',
    '............',
    '............'
  ]);
  T('w_froststaff', [
    '....oooo....',
    '...oCAABo...',
    '..oCAAAABo..',
    '..oCAwwABo..',
    '..oBAAAABo..',
    '...oBAABo...',
    '.....oAo....',
    '.....oAo....',
    '.....oAo....',
    '.....oAo....',
    '....oBBo....',
    '....oooo....'
  ]);
  T('w_poison', [
    '...ooooo...',
    '..oCAAAo...',
    '..oAAAo....',
    '.oCAAAABo..',
    'oCAAwwwwABo',
    'oAAwwwwAABo',
    'oBAAAAAAABo',
    '.oBAAAAABo.',
    '..oBBBBBo..',
    '...ooooo...',
    '...........',
    '...........'
  ]);
  T('w_tesla', [
    '....o.o.o...',
    '...oCAACAo..',
    '..oCAAAAABo.',
    '.oCAAAAAABo.',
    'oCAAAkkAABoo',
    'oAAAkkkAABo.',
    'oCAAAkkAABo.',
    '.oBAAAAABo..',
    '..oBBBBBo...',
    '...o..o.....',
    '............',
    '............'
  ]);

  /* -------- 第二批新增武器图标 -------- */
  T('w_club', [
    '....oooo....',
    '...oCAAo....',
    '..oCAAAo....',
    '..oCAABo....',
    '...oCAAo....',
    '....oAo.....',
    '....oAo.....',
    '....oAo.....',
    '....oAo.....',
    '...oBAo.....',
    '...oBBo.....',
    '...oooo.....'
  ]);
  T('w_trident', [
    '..o..o..o...',
    '.oAo.oAo.oAo',
    '..oAooAooAo.',
    '...oAooAo...',
    '....oAAo....',
    '....oAAo....',
    '....oAAo....',
    '....oBo.....',
    '....oBo.....',
    '...oBBo.....',
    '...oooo.....',
    '............'
  ]);
  T('w_blunder', [
    'oooooooooo..',
    'oCAAAAAAABoo.',
    'oCAAAAAAABoo.',
    'ooooAAoooo..',
    '...oAABo....',
    '..oBAABo....',
    '.oBAABo.....',
    'oBAABo......',
    'oBBBo.......',
    'oooo........',
    '............',
    '............'
  ]);
  T('w_axe', [
    '..oooo......',
    '.oCAAABo....',
    'oCAAAAABo...',
    'oAAAAAABo...',
    'oBAkkkABo...',
    '.oBkkkBBo...',
    '..oBBBBo....',
    '...oAo......',
    '...oAo......',
    '...oBo......',
    '...oBo......',
    '...oo.......'
  ]);
  T('w_rod', [
    '....oooo....',
    '...oCAABo...',
    '..oCAAAABo..',
    '..oCAACABo..',
    '..oBAAAABo..',
    '...oBAABo...',
    '....oAo.....',
    '....oAo.....',
    '....oAo.....',
    '....oAo.....',
    '...oBBo.....',
    '...oooo.....'
  ]);

  /* -------- 子弹（染色，6x6 / 4x4） -------- */
  T('b_small', [
    '.oo.',
    'oAAo',
    'oAAo',
    '.oo.'
  ]);
  T('b_bullet', [
    '..oo..',
    '.oCAo.',
    'oCAABo',
    'oCAABo',
    '.oAABo',
    '..oo..'
  ]);
  T('b_orb', [
    '.oooo.',
    'oCDAAo',
    'oDAAAo',
    'oAAAAo',
    'oBAAABo',
    '.oooo.'
  ]);
  T('b_shard', [
    '..o...',
    '.oCo..',
    'oCAAo.',
    'oAAABo',
    '.oABo.',
    '..oo..'
  ]);

})();
