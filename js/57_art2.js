/* ============================================================
   57_art2.js —— 美术表现全面升级
   - 像素帧动画支持（PX.animDef / PX.getAnim）
   - 武器图标：稀有度分层辉光（白→彩→曜光），更生动的造型（见下方图鉴）
   - 敌人渲染：动画帧 / 速度挤压 / 精英&BOSS 光晕 / 蓄力预警 / 词缀视觉
   - 死亡特效：按精灵调色板生成彩色像素碎屑
   ============================================================ */
'use strict';

(function () {

  var PX = G.PX;

  /* ------------------------------------------------------------
     1. 帧动画支持
     ------------------------------------------------------------ */
  var _anims = {};
  var _animCache = {};

  /** 注册多帧动画精灵（固定调色板，调色板键自动做大小写别名） */
  PX.animDef = function (name, pal, frames) {
    var p = {};
    for (var k in pal) {
      p[k] = pal[k];
      if (k >= 'a' && k <= 'z') p[k.toUpperCase()] = pal[k];
      else if (k >= 'A' && k <= 'Z') p[k.toLowerCase()] = pal[k];
    }
    _anims[name] = { pal: p, frames: frames };
  };

  /** 取动画帧数组（缓存），无动画返回 null */
  PX.getAnim = function (name, scale) {
    scale = scale || 1;
    var key = name + '|' + scale;
    if (_animCache[key]) return _animCache[key];
    var d = _anims[name];
    if (!d || !d.frames || !d.frames.length) return null;
    var cvs = [];
    for (var i = 0; i < d.frames.length; i++) {
      var nm = name + '_f' + i;
      PX.def(nm, d.pal, d.frames[i]);
      cvs.push(PX.get(nm, scale));
    }
    return (_animCache[key] = cvs);
  };

  PX.animCount = function (name) {
    return _anims[name] ? _anims[name].frames.length : 0;
  };

  /* ------------------------------------------------------------
     2. 武器图标：稀有度辉光强化
     ------------------------------------------------------------ */
  G.weaponIcon = function (def, tier, scale) {
    scale = scale || 3;
    var key = 'wi2|' + def.icon + '|' + tier + '|' + scale;
    if (G._wiCache && G._wiCache[key]) return G._wiCache[key];
    var c = tier === 0 ? def.col : G.RARITY[tier].color;
    var base = G.PX.getTint(def.icon, c, scale);
    if (!base) return null;
    var pad = 5 + tier * 2;
    var cv = document.createElement('canvas');
    cv.width = base.width + pad * 2;
    cv.height = base.height + pad * 2;
    var cx = cv.getContext('2d');
    var ox = pad, oy = pad;
    /* 投影 */
    cx.save();
    cx.shadowColor = 'rgba(0,0,0,0.55)';
    cx.shadowBlur = 4;
    cx.shadowOffsetX = 1;
    cx.shadowOffsetY = 2;
    cx.drawImage(base, ox, oy);
    cx.restore();
    /* 稀有度彩光 */
    cx.save();
    cx.shadowColor = (tier === 0 ? 'rgba(180,195,215,0.55)' : G.RARITY[tier].color);
    cx.shadowBlur = 4 + tier * 2.5;
    cx.drawImage(base, ox, oy);
    cx.restore();
    /* 史诗/传说：内层曜光 */
    if (tier >= 3) {
      cx.save();
      cx.shadowColor = '#ffffff';
      cx.shadowBlur = 3;
      cx.drawImage(base, ox, oy);
      cx.restore();
    }
    /* 本体 */
    cx.drawImage(base, ox, oy);
    cv.pw = base.pw;
    cv.ph = base.ph;
    G._wiCache = G._wiCache || {};
    return (G._wiCache[key] = cv);
  };

  /* ------------------------------------------------------------
     3. 敌人渲染升级
     ------------------------------------------------------------ */
  var _edraw = G.Enemy.prototype.draw;
  G.Enemy.prototype.draw = function (c) {
    var def = this.def;
    var frames = PX.getAnim(def.sprite, def.sc);
    var cv = frames
      ? frames[Math.floor(this.t * 5) % frames.length]
      : G.PX.get(def.sprite, def.sc);
    var bob = Math.sin(this.t * 6) * (def.boss ? 2.5 : 1.4);
    var alpha = def.ghost ? 0.62 + Math.sin(this.t * 3) * 0.14 : 1;
    var jx = 0, jy = 0;
    if (this.hurtT > 0) {
      var k = Math.floor(this.hurtT * 60) % 2 ? 1.6 : -1.6;
      jx = k * (this.hurtT > 0.06 ? 1 : 0.6);
      jy = k * 0.8;
    }
    var dx = this.x + jx, dy = this.y + jy;

    c.globalAlpha = 0.3 * alpha;
    c.fillStyle = '#000';
    c.beginPath();
    c.ellipse(this.x, this.y + this.r * 0.85, this.r * 0.8, this.r * 0.3, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;

    /* 精英 / BOSS：彩色光晕 */
    if (def.elite || def.boss) {
      c.save();
      var grd = c.createRadialGradient(dx, dy, this.r * 0.25, dx, dy, this.r * 1.9);
      var ac = def.boss ? '255,74,110' : '255,184,74';
      grd.addColorStop(0, 'rgba(' + ac + ',0.20)');
      grd.addColorStop(1, 'rgba(' + ac + ',0)');
      c.fillStyle = grd;
      c.beginPath();
      c.arc(dx, dy, this.r * 1.9, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    /* 狂暴词缀：红色煞气 */
    var frenzy = false, shielded = false;
    if (this.affixes && this.affixes.length) {
      for (var afi = 0; afi < this.affixes.length; afi++) {
        if (this.affixes[afi].id === 'frenzy') frenzy = true;
        if (this.affixes[afi].id === 'shield') shielded = true;
      }
    }
    if (frenzy) {
      c.save();
      c.globalAlpha = 0.22 + Math.sin(this.t * 12) * 0.1;
      c.fillStyle = '#ff4a4a';
      c.beginPath();
      c.arc(dx, dy, this.r * 1.45, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    /* 蓄力 / 施法预警 */
    var winding = this.state === 'charge' ||
      (this.state && this.state.indexOf('Wind') >= 0) ||
      (this.state === 'windup');
    if (winding && !def.boss) {
      c.save();
      var wr = this.r + 7 + Math.sin(this.t * 15) * 3;
      c.strokeStyle = 'rgba(255,210,74,0.8)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(dx, dy, wr, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.55 + Math.sin(this.t * 18) * 0.35;
      c.fillStyle = '#ffd24a';
      c.font = 'bold 10px monospace';
      c.textAlign = 'center';
      c.fillText('!', dx, dy - this.r - 16);
      c.restore();
    }

    /* 本体（动画帧 + 方向 + 速度挤压） */
    var spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    var sq = def.boss ? 0 : G.clamp(spd / 320, 0, 0.22);
    c.save();
    c.translate(dx, dy + bob);
    if (this.face < 0) c.scale(-1, 1);
    if (sq > 0.02) c.scale(1 + sq, 1 - sq * 0.8);
    c.globalAlpha = alpha;
    c.drawImage(cv, -cv.width / 2, -cv.height / 2);
    if (this.flash > 0) {
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = alpha * this.flash;
      c.fillStyle = '#fff';
      c.fillRect(-cv.width / 2, -cv.height / 2, cv.width, cv.height);
    }
    c.restore();

    var tint = 0;
    if (this.slowT > 0) tint = 1;
    if (tint) {
      c.save();
      c.globalAlpha = 0.28;
      c.fillStyle = '#7fd8ff';
      c.beginPath();
      c.arc(dx, dy, this.r, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    if (this.burnT > 0) {
      c.save();
      c.globalAlpha = 0.16;
      c.fillStyle = '#ff8a3a';
      c.beginPath();
      c.arc(dx, dy, this.r + 2, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    if (this.poisonT > 0) {
      c.save();
      c.globalAlpha = 0.20 + Math.sin(this.t * 9) * 0.06;
      c.fillStyle = '#8fc040';
      c.beginPath();
      c.arc(dx, dy, this.r + 1, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(143,192,64,0.55)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(dx, dy, this.r + 4 + Math.sin(this.t * 6) * 2, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    /* 护盾词缀：蓝色圆弧 */
    if (shielded) {
      c.save();
      c.strokeStyle = 'rgba(96,200,255,0.9)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(dx, dy, this.r + 8, Math.PI * 0.15, Math.PI * 0.85);
      c.stroke();
      c.strokeStyle = 'rgba(160,230,255,0.5)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(dx, dy, this.r + 8, -Math.PI * 0.85, -Math.PI * 0.15);
      c.stroke();
      c.restore();
    }

    /* 精英 / BOSS 光环 + 词缀光环 + 标记 */
    if (def.elite || def.boss) {
      c.save();
      var pr = this.r + 8 + Math.sin(this.t * 3) * 3;
      c.strokeStyle = def.boss ? 'rgba(255,70,110,.55)' : 'rgba(255,190,80,.5)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(this.x, this.y, pr, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    if (this.affixes && this.affixes.length) {
      c.save();
      for (var qi = 0; qi < this.affixes.length; qi++) {
        var afq = this.affixes[qi];
        var ar = this.r + 11 + Math.sin(this.t * 3 + qi * 2.1) * 3 + qi * 6;
        c.strokeStyle = afq.color;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(this.x, this.y, ar, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
      c.save();
      c.font = 'bold 11px monospace';
      c.textAlign = 'center';
      var sy2 = this.y - this.r - 22;
      for (var si2 = 0; si2 < this.affixes.length; si2++) {
        c.fillStyle = this.affixes[si2].color;
        c.fillText(this.affixes[si2].mark, this.x + (si2 - (this.affixes.length - 1) / 2) * 13, sy2);
      }
      c.restore();
    }

    if ((def.elite || this.maxHp > 60) && !def.boss && this.hp < this.maxHp) {
      var w = this.r * 2.2, h = 4;
      var hx = dx - w / 2, hy = dy - this.r - 11;
      c.fillStyle = '#000a';
      c.fillRect(hx - 1, hy - 1, w + 2, h + 2);
      c.fillStyle = def.elite ? '#ffb347' : '#e5484d';
      c.fillRect(hx, hy, w * (this.hp / this.maxHp), h);
    }

    if (this.rifts && this.rifts.length) {
      c.save();
      for (var rki = 0; rki < this.rifts.length; rki++) {
        var rfp = this.rifts[rki];
        var blink = (Math.sin(rfp.fuse * 14) > 0) ? 0.55 : 1;
        c.globalAlpha = blink;
        c.strokeStyle = '#c07fff';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(rfp.x, rfp.y, 55, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = blink * 0.25;
        c.fillStyle = '#8f4aff';
        c.beginPath();
        c.arc(rfp.x, rfp.y, 45, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  };

  /* ------------------------------------------------------------
     4. 死亡：精灵调色板像素碎屑
     ------------------------------------------------------------ */
  G.pixelDebris = function (e) {
    if (!e || !e.def) return;
    var cv = G.PX.get(e.def.sprite, 2);
    var g = G.game;
    if (!cv || !g || g.particles.length > 700) return;
    var ctx = cv.getContext('2d');
    var img = null;
    try { img = ctx.getImageData(0, 0, cv.width, cv.height); }
    catch (err) { return; }
    var cols = {};
    var data = img.data;
    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 40) continue;
      var key = data[i] + ',' + data[i + 1] + ',' + data[i + 2];
      cols[key] = 'rgb(' + key + ')';
    }
    var keys = Object.keys(cols);
    if (!keys.length) return;
    var n = e.def.elite ? 30 : (e.def.boss ? 64 : 14);
    for (var j = 0; j < n; j++) {
      var col = cols[keys[Math.floor(Math.random() * keys.length)]];
      var a = G.rand(0, Math.PI * 2), s = G.rand(30, e.def.boss ? 420 : 210);
      g.particles.push(new G.Particle(e.x, e.y, {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 30,
        life: G.rand(0.25, 0.55) * (e.def.boss ? 1.4 : 1),
        size: e.def.boss ? G.rand(3, 6.5) : G.rand(2, 4.5),
        col: col, drag: 0.9, shape: 'debris', grav: 330,
        rotSpd: G.rand(-9, 9)
      }));
    }
  };

  var _kill = G.game.killEnemy;
  G.game.killEnemy = function (e) {
    var r = _kill.call(this, e);
    G.pixelDebris(e);
    return r;
  };

  /* 精英/BOSS 出生传送特效 */
  var _spawn = G.game.spawnEnemy;
  G.game.spawnEnemy = function (id, x, y) {
    var e = _spawn.apply(this, arguments);
    if (e && (e.def.elite || e.def.boss) && !e._spawnFx && G.fx) {
      e._spawnFx = true;
      G.fx('ring', { x: e.x, y: e.y, r0: 4, r1: e.r + 14, col: e.def.boss ? '#ff4a6b' : '#ffd24a', w: 3, life: 0.5 });
      G.burst(e.x, e.y, e.def.boss ? 16 : 8, e.def.boss ? '#ff4a6b' : '#ffd24a', 160, { size: 2.5 });
    }
    return e;
  };

  /* ============================================================
     5. 武器图标图鉴（可染色：o 描边 / A 主色 / B 暗部 / C 高光 / D 亮部 / w 白 / k 黑）
     ============================================================ */
  function T(name, rows) { PX.tint(name, rows); }

  /* 小刀：带锯齿脊与护手的短刃 */
  T('w_knife', [
    '.........oooo.',
    '........oCDAo.',
    '.......oCDAoo.',
    '......oCDAo...',
    '.....oCDAo....',
    '....oCDAo.....',
    '...oCDAo......',
    '..oCDAo.......',
    '.oCBDAo.......',
    'oBBBBBo.......',
    'oo.oBDo.......',
    '..oBBo........',
    '..oo..........'
  ]);

  /* 巨剑：带血槽的阔刃 + 十字护手 */
  T('w_sword', [
    '.....ooo......',
    '....oCDAo.....',
    '...oCDDAo.....',
    '..oCDDDAo.....',
    '..oCDDDAo.....',
    '.oCDDDDAo.....',
    '.oCDDDDAo.....',
    '.oCDDDDAo.....',
    'oCDDDDDAo.....',
    'oCDDDDDAo.....',
    'oBBBBBBBo.....',
    'oooooooooooo..',
    '..oBBBBBBo....',
    '...ooooooo....'
  ]);

  /* 战锤：符文锤头 + 长柄 */
  T('w_hammer', [
    '..oooooooo....',
    '.oCCAAAABBo...',
    'oCDAAAADABo...',
    'oCDAADwDABo...',
    'oCDAAAADABo...',
    'oCBAAAAAABo...',
    '.oBBBBBBBo....',
    '..ooAAAoo.....',
    '....oAAo......',
    '....oAAo......',
    '...oBAAo......',
    '...oBBo.......',
    '..oBBBo.......',
    '..oooo........'
  ]);

  /* 长矛：柳叶矛头 + 缠绳握柄 */
  T('w_spear', [
    '.....ooo......',
    '....oCDAo.....',
    '....oCDAo.....',
    '...oCDDAo.....',
    '...oCDDAo.....',
    '..oCDDDAo.....',
    '..oCDDDAo.....',
    '...oCDAo......',
    '....oCAo......',
    '....oBAo......',
    '...oBAo.......',
    '..oBAo........',
    '..oBo.........',
    '.oooo.........'
  ]);

  /* 铁拳：指虎拳套 */
  T('w_fist', [
    '...oooooo.....',
    '..oCCAAAABo...',
    '.oCDAAAABBo...',
    '.oCDAADAABo...',
    '.oCDAADAABo...',
    '.oCDAAAAABo...',
    '.oCBAAAAABo...',
    '..oBAAAAABo...',
    '..oBAAAAABo...',
    '...oBBBBBo....',
    '....ooooo.....',
    '.o..o.o..o....',
    'oo.oo.oo.oo...',
    'oooooooooooo..'
  ]);

  /* 电锯：锯齿导板 + 机体 + 握把 */
  T('w_chainsaw', [
    'oooooooooo....',
    'oADAAAAAABo...',
    'oADDAAAABBBo..',
    'oADDAAABBBBo..',
    'oADDDABBBBo...',
    'oADDAABBBBo...',
    'oAAAABBBBBo...',
    'oBBBBBBBBBo...',
    '.oooooooooo...',
    '.o..o..o.o....',
    '.o..o..o.o....',
    '.o..o..o.o....',
    '..oooooo......'
  ]);

  /* 手枪：滑套 + 准星 + 握把 */
  T('w_pistol', [
    '..........o...',
    'oooooooooo....',
    'oDDDDDDDDo....',
    'oADDDDDAAo....',
    'oAAAAAAAABo...',
    'oAAAAAAAABo...',
    'ooBBBBBBBo....',
    '..ooooooo.....',
    '..oAAAAo......',
    '..oAAAAo......',
    '..oAAAAo......',
    '..oBBBBo......',
    '...oooo.......'
  ]);

  /* 霰弹枪：双管 + 泵动护木 */
  T('w_shotgun', [
    'ooooooooooo...',
    'oAAAAAAAAAo...',
    'oADDAAADDDo...',
    'oAAAAAAAAAo...',
    'oBAAAAAAABo...',
    'oBBBBBBBBBo...',
    '.ooooooooo....',
    '.oAAAAAAAo....',
    '.oAAAAAAAo....',
    '.oBBBBBBBo....',
    '..oooooBo.....',
    '.....oBBo.....',
    '....oBBBo.....',
    '....oooo......'
  ]);

  /* 冲锋枪：紧凑枪身 + 弹匣 */
  T('w_smg', [
    'oooooooooo....',
    'oADDDDDAAo....',
    'oADDDDDAAo....',
    'oAAAAAAAABo...',
    'oBBBBBBBBo....',
    '..ooooooo.....',
    '..oAAAAo......',
    '..oAAAAo......',
    '..oBAAAo......',
    '..oBAAAo......',
    '..oBAAAo......',
    '..oBBBBo......',
    '...oooo.......'
  ]);

  /* 狙击枪：长枪管 + 瞄具 */
  T('w_sniper', [
    '.....ooooo....',
    '....oAAAAAo...',
    '...oAAAAAAAo..',
    '..oAAAAAAAAAo.',
    '..oAAAAAAAAAo.',
    '.oAAAAAAAAAAo.',
    '.oAAAAAAAAAAo.',
    'oAAAAAAAAAAo..',
    'oAAAAAAAAAo...',
    'oBAAAAAAAo....',
    'ooBBBBBBBo....',
    '.ooooooooo....',
    '...oAAAAo.....',
    '...oBBBBo.....',
    '....oooo......'
  ]);

  /* 强弩：弓臂 + 弩弦 + 箭矢 */
  T('w_crossbow', [
    'o................',
    '.o...............',
    '..oooooooooooo...',
    '..oCCCCCCCBBo....',
    '..oCDDDDDCBo.....',
    '..oCCCCCCCBo.....',
    '..oAAAAAAAo......',
    '..oAAAAAAAo......',
    '..oBBBBBBBBo.....',
    '...oooooooo......',
    '......oAAo.......',
    '......oBBo.......',
    '.......oo........'
  ]);

  /* 手雷：拉环 + 保险杆 + 卵形弹体 */
  T('w_grenade', [
    '......oo.......',
    '......oBo......',
    '.....oBBo......',
    '....ooooo......',
    '...oCAAAo......',
    '..oCDAAAo......',
    '.oCDDAAAo......',
    '.oCDDAAAo......',
    '.oCDDAAAo......',
    '.oCDAAAAo......',
    '.oBAAAAo.......',
    '..oBBBBo.......',
    '...oooo........'
  ]);

  /* 回旋镖：流线弯刃 */
  T('w_boomerang', [
    'ooooo..........',
    'oDDDDo.........',
    '.oAAAoooo......',
    '.oAAAoDDo......',
    '..ooAoAAo......',
    '....oAAo.......',
    '....oAAo.......',
    '...oAAo........',
    '..oAAo.........',
    '.oAAo..........',
    '.oBo...........',
    'oo............',
  ]);

  /* 手里剑：四棱星刃 */
  T('w_shuriken', [
    '.....oo........',
    '....oAAo.......',
    '....oAAo.......',
    'oo..oAAo..oo...',
    'oAo.oAAo.oAo...',
    'oAAo.oo.oAAo...',
    '.oAAooooAAo....',
    '..ooAAAoo......',
    '....oAAo.......',
    '....oAAo.......',
    '...oAAo........',
    '..oAAo.........',
    '..oo...........'
  ]);

  /* 火焰喷射器：燃料罐 + 喷口 */
  T('w_flamer', [
    '.ooooooooo.....',
    '.oAAAAAAAo.....',
    '.oADDDAAAo.....',
    '.oADDDAAAo.....',
    '.oADDDAAAo.....',
    '.oAAAAAAAo.....',
    '.oBBBBBBBo.....',
    '..ooooooBo.....',
    '......oBBBo....',
    '.....oBBBBBo...',
    '....oBBBBBBo...',
    '....oDwwDDo....',
    '.....ooooo.....'
  ]);

  /* 法杖：杖身 + 晶核 */
  T('w_wand', [
    '.....ooo.......',
    '....oCDAo......',
    '....oCDAo......',
    '...oCCDAo......',
    '...oCCDAo......',
    '..oCCDDAo......',
    '..oCCDDAo......',
    '..oCCDDAo......',
    '...oCCDo.......',
    '....oBDo.......',
    '.....oDo.......',
    '....oBBo.......',
    '....ooo........'
  ]);

  /* 闪电权杖：雷光叉头 */
  T('w_staff', [
    '.....oo........',
    '....oAAo.......',
    '....oAAo.......',
    '...oADDo.......',
    '..oAADDo.......',
    '.oAADDDDo......',
    'oAADDDDDDo.....',
    'oAADDDDDDo.....',
    '.oAADDDDo......',
    '..oAADDo.......',
    '...oADDo.......',
    '....oAAo.......',
    '....oBBo.......',
    '...oooo........'
  ]);

  /* 冰锥：锋利冰晶 */
  T('w_ice', [
    '......oo.......',
    '.....oDDo......',
    '....oCDDo......',
    '...oCDDDo......',
    '..oCDDDDo......',
    '..oCDDDDo......',
    '.oCDDDDDo......',
    '.oCDDDDDo......',
    '.oCDDDDo.......',
    '.oCDDDo........',
    '.oCDDo.........',
    '..oBDo.........',
    '..ooo..........'
  ]);

  /* 毒镖：镖身 + 尾翼 */
  T('w_dart', [
    '.....oo........',
    '....oAAo.......',
    '....oAAo.......',
    '...oAAAAo......',
    '...oAAAAo......',
    '..oAAAAAo......',
    '..oAAAAAo......',
    '.oAAAAAAo......',
    'oAAkAAAo.......',
    'oAAkkAo........',
    'oo.oo.oo.......',
    '..o..o.........',
    '..............'
  ]);

  /* 哨戒炮：炮塔 + 支腿 */
  T('w_turret', [
    '....ooooo......',
    '...oADDAo......',
    '...oAAAAo......',
    '..oAAAAAAo.....',
    '..oAAAAAAo.....',
    '..oAAAAAAo.....',
    '..oBBBBBBo.....',
    '.oo.oooo.oo....',
    '.o...oo...o....',
    'o....oo....o...',
    '.....oo........',
    '.....oo........',
    '.....oo........'
  ]);

  /* 无人机：四旋翼 */
  T('w_drone', [
    '..o.......o....',
    '..oo.....oo....',
    '..oAo...oAo....',
    '...oo...oo.....',
    '....ooooo......',
    '....oAAAo......',
    '....oADDAo.....',
    '....oADDAo.....',
    '....oAAAAo.....',
    '....oBBBBo.....',
    '...oo...oo.....',
    '..o.o...o.o....'
  ]);

  /* 震荡地雷：尖刺雷体 */
  T('w_mine', [
    '.....o.o.......',
    '....o.o.o......',
    '...o.o.o.o.....',
    '..ooooooooo....',
    '.ooAAAkAAAoo...',
    'oAAADkkkDAAAo..',
    'oAAADkkkDAAAo..',
    'oAAADkkkDAAAo..',
    '.ooAAAkAAAoo...',
    '..ooooooooo....',
    '...o.o.o.o.....',
    '....o.o.o......',
    '.....o.o.......'
  ]);

  /* 特斯拉力场：线圈 + 电弧 */
  T('w_tesla', [
    '......oo.......',
    '.....oAAo......',
    '....oAAAAo.....',
    '....oAAAAo.....',
    '....oAAAAo.....',
    '....oAAAAo.....',
    '....oAAAAo.....',
    '....oAAAAo.....',
    '.....oAAo......',
    '......oo.......',
    '...o..oo..o....',
    '....o.oo.o.....',
    '.....oooo......'
  ]);

  /* 武士刀：弧刃 + 刀镡 */
  T('w_katana', [
    'oooo...........',
    'oDDDo..........',
    '.oAAo..........',
    '.oAAo..........',
    '..oAAo.........',
    '..oAAAo........',
    '...oAAAo.......',
    '....oAAAo......',
    '.....oAAAo.....',
    '......oAAAo....',
    '......oAAAAo...',
    '.....oBBBBBBo..',
    '.....oooooooo..',
    '....oBBBBo.....',
    '....ooooo......'
  ]);

  /* 长戟：戟刃 + 尖刺 */
  T('w_halberd', [
    '..oooo....o....',
    '.oCDAo...oA....',
    '.oCDAo..oAA....',
    'oCDDDAooAAo....',
    'oCDDDDAAAAo....',
    'oCDDDAAAAAo....',
    '.oCDAAAAAo.....',
    '.oCDAAAAo......',
    '..oCDAAo.......',
    '...oCAo........',
    '....oBAo.......',
    '....oBAo.......',
    '....oBo........',
    '....oo.........'
  ]);

  /* 霜寒之杖：冰晶杖头 */
  T('w_froststaff', [
    '......oo.......',
    '.....oDDo......',
    '....oCDDo......',
    '....oCDDo......',
    '...oCDDDo......',
    '...oCDDDo......',
    '..oCDDDDo......',
    '...oCDDDo......',
    '...oCDDDo......',
    '....oCDDo......',
    '....oCCDo......',
    '.....oBDo......',
    '.....oBo.......',
    '....ooo........'
  ]);

  /* 毒雾喷壶：罐体 + 喷嘴 */
  T('w_poison', [
    '..ooooooo......',
    '.oAAAAAAo......',
    '.oADDDAAo......',
    '.oADDDAAo......',
    '.oADDDAAo......',
    '.oAAAAAAo......',
    '.oAAAAAAo......',
    '.oBBBBBBo......',
    '..ooooooo......',
    '.....oBDo......',
    '....oBBBo......',
    '...oDwwDo......',
    '....ooooo......'
  ]);

  /* 飞斧：战斧 */
  T('w_axe', [
    '.oooo.........',
    'oCDDo.........',
    'oCDDDo........',
    'oCDDDDo.......',
    'oCDDDDDo......',
    'oCDDDDDo......',
    'oCDDDDo.......',
    '.oCDDo........',
    '.oCDDo........',
    '.oCDDo........',
    '.oCDDo........',
    '.oBBDDo.......',
    '..oBBBo.......',
    '..oBBBo.......',
    '...ooo........'
  ]);

  /* 燧发枪（blunder）：喇叭口短枪 */
  T('w_blunder', [
    '....ooooo.....',
    '...oAAAAo.....',
    '..oAAAAAAo....',
    '..oAAAAAAo....',
    '.oAAAAAAAAo...',
    '.oAAAAAAAAo...',
    '.oAAAAAAAAo...',
    '.oAAAAAAAAo...',
    '.oAAAAAAAo....',
    'oAAAAAAAo.....',
    'oAAAAAAAo.....',
    'oBBBBBBBo.....',
    '.oooooooo.....',
    '...oBBo.......',
    '...ooo........'
  ]);

  /* 能量法杖（rod）：充能导管 */
  T('w_rod', [
    '.....ooo.......',
    '....oCDAo......',
    '....oCDAo......',
    '...oCDDAo......',
    '..oCDDDAo......',
    '..oCDDDAo......',
    '.oCDDDDDo......',
    '.oCDDDDDo......',
    '.oCDDDDDo......',
    '..oCDDDo.......',
    '..oCDDDo.......',
    '...oCDDo.......',
    '....oBBo.......',
    '....ooo........'
  ]);

  /* 三叉戟：三尖戟头 */
  T('w_trident', [
    '..o.....o......',
    '..oA...oA......',
    '..oAA.oAA......',
    '..oAAAAAAo.....',
    '..oAAAAAAo.....',
    '..oAAAAAAo.....',
    '...oAAAAo......',
    '....oAAo.......',
    '....oAAo.......',
    '....oAAo.......',
    '....oBAo.......',
    '....oBAo.......',
    '....oBo........',
    '....oo.........'
  ]);

  /* 狼牙棒：钉刺棍棒 */
  T('w_club', [
    '...oooooo.....',
    '..oADDDDo....',
    '.oADDDDDDo...',
    '.oADDDDDDo...',
    '.oADDDDDDo...',
    '.oADDDDDDo...',
    '..oADDDDo....',
    '..ooAAAoo.....',
    '....oAAo......',
    '....oAAo......',
    '....oAAo......',
    '....oBAo......',
    '....oBAo......',
    '.....oo.......'
  ]);

  /* 固定调色板精灵注册（自动补齐大小写别名，避免通道漏渲） */
  function DEF(name, pal, rows) {
    var p = {};
    for (var k in pal) {
      p[k] = pal[k];
      if (k >= 'a' && k <= 'z') p[k.toUpperCase()] = pal[k];
      else if (k >= 'A' && k <= 'Z') p[k.toLowerCase()] = pal[k];
    }
    PX.def(name, p, rows);
  }

  /* ============================================================
     6. 敌人精灵图鉴（固定调色板，o 描边 / a 主色 / b 暗部 /
        c 高光 / d 亮部 / e 眼部或发光 / w 白 / k 黑 / g 点缀）
     ============================================================ */

  /* 腐虫：节肢蠕虫，口器发光 */
  DEF('e_worm', { o: '#100a14', a: '#b85c8c', b: '#6f2f57', c: '#e89fc0', e: '#8fffd6', g: '#4a1f3c' }, [
    '..oooooo........',
    '.oaaaaaaao......',
    'oabbbbbbbao.....',
    'oagbbbbbbbao....',
    'oagbbbbbbbao....',
    'oabbbbbbbbao....',
    'oaeeeeeeeao.....',
    'oaaaaaaaaaao....',
    'oabbbbbbbbao....',
    '.oaaaaaaaaao....',
    '..oooooooo......',
    '..o..o..o.......',
    '.o...o...o......'
  ]);

  /* 尖啸蝠：双帧振翅 */
  PX.animDef('e_bat', { o: '#14101c', a: '#6f4fb8', b: '#3d2873', e: '#ff7a8a', c: '#a98fe8' }, [
    [
      '..o........o....',
      '.oao......oao...',
      '.oaao....oaao...',
      '.oaaao..oaaao...',
      '.oaaAaaooaaAao..',
      '.oaaaaaaaaaaao..',
      '..oaaaaaaaaao...',
      '...oaaeeaaao....',
      '....oaaaaao.....',
      '.....oaaao......',
      '.....oaeeo......',
      '......oao.......',
      '.......oo.......'
    ],
    [
      '..............',
      '..o........o..',
      '.oao......oao.',
      '.oaao....oaao.',
      '.oaaao..oaaao.',
      '.oaaAaaooaaAa.',
      '.oaaaaaaaaaaa.',
      '..oaaaaaaaao..',
      '...oaaeeaaao..',
      '....oaaaaao...',
      '.....oaeeo....',
      '.....oaaao....',
      '......oao.....',
      '.......oo.....'
    ]
  ]);

  /* 裂凝胶：双帧伸缩 */
  PX.animDef('e_slime', { o: '#0f2018', a: '#3fbf8f', b: '#217a5a', e: '#0f2018', c: '#8ff0cc', k: '#10241b' }, [
    [
      '....oooooo....',
      '..ooaaaaaaoo..',
      '.oaaaaaaaaaao.',
      'oabbbbbbbbbao.',
      'oaaaaaaaakkao.',
      'oaaaaaaaaaaao.',
      '.oabbbbbbbbao.',
      '..oaaaaaaaao..',
      '...oooooooo...'
    ],
    [
      '..oooooooooo..',
      '.oaaaaaaaaaao.',
      'oaaaaaaaaaaao.',
      'oabbbbbbbbbao.',
      'oaaaaaakkaaao.',
      '.oaaaaaaaaaao.',
      '..oabbbbbbao..',
      '...oooooooo...'
    ]
  ]);

  /* 骷髅兵：颅骨 + 肋骨 + 腿骨 */
  DEF('e_skeleton', { o: '#15161c', a: '#d8dbe2', b: '#8f93a2', e: '#5ad1ff', c: '#f4f6fa' }, [
    '....oooo......',
    '...oaaaaao....',
    '..oaaeaeao....',
    '..oaaaaaaao...',
    '..oaccccao....',
    '..oaccccao....',
    '..oaaaaaaao...',
    '...oabbbao....',
    '...oabbbao....',
    '..oaaabbao....',
    '..oa.bb.ao....',
    '..o..b..o.....',
    '..o..b..o.....',
    '..o..b..o.....'
  ]);

  /* 铁甲虫：甲壳 + 巨颚 + 侧足 */
  DEF('e_beetle', { o: '#12180f', a: '#5a7a3a', b: '#33481f', e: '#ffcf4a', c: '#8fae5e', k: '#1b2414' }, [
    '......cc......',
    '.....oco......',
    '...oooooo.....',
    '..oaccccao....',
    '.oacccccaao...',
    'oacccckkcaao..',
    'oaccccccccao..',
    'oabcccccccao..',
    '.obaaaaaaabo..',
    '.oobbbbbboo...',
    '.o.o..o..o.o..',
    'o..o..o..o..o.',
    'o..o..o..o..o.',
    '...o......o...'
  ]);

  /* 窥视者：巨瞳 + 血丝触须 */
  PX.animDef('e_eye', { o: '#1b1020', a: '#d94f8c', b: '#8f2c5c', w: '#f4f6ff', e: '#160c1a', c: '#ff9ac0' }, [
    [
      '....oooo......',
      '..oaaaaaao....',
      '.oawwwwwwao...',
      'oawweewwwao...',
      'oawwewewwao...',
      'oawwwwwwwao...',
      '.oawwwwwao....',
      '..oaaaaaao....',
      '...oooooo.....',
      '....o..o......',
      '...o..o.......',
      '...o..o.......',
      '..o..o........',
      '..o..o........'
    ],
    [
      '....oooo......',
      '..oaaaaaao....',
      '.oawwwwwwao...',
      'oawwwewwao....',
      'oawwewwwao....',
      'oawwwwwwwao...',
      '.oawwwwwao....',
      '..oaaaaaao....',
      '...oooooo.....',
      '...o..o.......',
      '..o..o........',
      '..o..o........',
      '.o..o.........',
      '.o..o.........'
    ]
  ]);

  /* 跃蛛：节肢蜘蛛 */
  DEF('e_spider', { o: '#140f18', a: '#8c4f6f', b: '#4d2840', e: '#7de8ff', c: '#c88fa8', k: '#24101c' }, [
    '...o.....o....',
    '..o.o...o.o...',
    '..o..ooo..o...',
    '...oaaaaao....',
    '..oaeeaeeao...',
    '..oaacccaao...',
    '...oaaaaao....',
    '..o.obbo.o....',
    '.o..obbo..o...',
    '.o..o..o..o...',
    '.o..o..o..o...',
    'o...o..o...o..'
  ]);

  /* 游魂：残破斗篷 + 幽光 */
  PX.animDef('e_wraith', { o: '#0c101a', a: '#4d6f9f', b: '#24364f', e: '#7de8ff', c: '#8fb4e8', k: '#10182a' }, [
    [
      '....oooooo....',
      '...oaaaaaao...',
      '..oaaeaaaeao..',
      '..oaaeaaaeao..',
      '..oaacccaao...',
      '..oaacccaao...',
      '...oaaaaao....',
      '...oabbbao....',
      '..oab.bbao....',
      '..oab.bbao....',
      '.oa.bb.bbao...',
      '.o.bb.bb.bo...',
      '.o.b...b.bo...',
      'o..b...b..bo..'
    ],
    [
      '....oooooo....',
      '...oaaaaaao...',
      '..oaaeaaaeao..',
      '..oaaeaaaeao..',
      '..oaacccaao...',
      '..oaacccaao...',
      '...oaaaaao....',
      '...oabbbao....',
      '...oabbbao....',
      '..oa.bb.ao....',
      '..oa.bb.ao....',
      '.o..bb.bb.o...',
      '.o..b...b..o..',
      '.o..b...b..o..'
    ]
  ]);

  /* 爆弹虫：燃烧引信 + 虫体 */
  DEF('e_bomber', { o: '#1a0f0a', a: '#c0602f', b: '#7a3820', e: '#ffd24a', c: '#ff9a5a', k: '#2a150c', d: '#fff2a8', D: '#fff2a8' }, [
    '........o.....',
    '.......oo.....',
    '......oDo.....',
    '.....oDDo.....',
    '....oDDDo.....',
    '...oDDDo......',
    '...oooooo.....',
    '..oaakkaao....',
    '.oaakeekaao...',
    '.oaaakkaao....',
    '.oaaaaaaaao...',
    '.obbbbbbbbo...',
    '..o.oo.oo.o...',
    '..o.o..o.o....'
  ]);

  /* 邪术师：兜帽 + 法球 */
  DEF('e_warlock', { o: '#160f24', a: '#7a3fa8', b: '#46225f', e: '#b06fff', c: '#c8a0e8', k: '#1e1030' }, [
    '...oooooo.....',
    '..oaaaaaao....',
    '.oaaeaaaeao...',
    '.oaeaaaeao....',
    '.oaaaaaaao....',
    '.oabbbbbao....',
    '.oaaaaaaao....',
    '.oaaaaaaao....',
    '.obaaaaaao....',
    '..obbbbbbo....',
    '...o....o.....',
    '..o.eeee.o....',
    '..o.eeee.o....',
    '...oooooo.....'
  ]);

  /* 石魔：裂纹岩石 + 熔光 */
  DEF('e_stone', { o: '#171310', a: '#8a8278', b: '#4f4a44', e: '#ff9a3a', c: '#b8b0a6', k: '#211c18' }, [
    '...ooooooo....',
    '..oaaaaaaao...',
    '.oaccccccao...',
    '.oaccckccao...',
    'oaccccccccao..',
    'oacceeecccao..',
    'oacceeecccao..',
    'oaccccccccao..',
    'oabcccccccao..',
    '.obaaaaaaabo..',
    '.oabbbbbbbao..',
    '..o.oo.oo.o...',
    '..o.o...o.o...',
    '..o.o...o.o...'
  ]);

  /* 蛮角兽：冲锋巨角 + 鬃毛 */
  DEF('e_charger', { o: '#1a130c', a: '#a86f3a', b: '#5f3a1f', e: '#ffd24a', c: '#d8a86b', k: '#241610', d: '#ffe9a0', D: '#ffe9a0' }, [
    '.oo....oo.....',
    'oDDo..oDDo....',
    'oDDoooooDDo...',
    '.oaaaaaaaao...',
    '.oaeeaaaeao...',
    '.oaaaaaaaao...',
    '.oacccccaao...',
    'oaaaccccaaao..',
    'oaaabbbbaaao..',
    '.oaabbbbaao...',
    '.oaaaaaaaao...',
    '..oabbbbo.....',
    '..o.bb.bo.....',
    '..o..o..o.....',
    '..o..o..o.....'
  ]);

  /* 虫群：多头小虫 */
  PX.animDef('e_swarmling', { o: '#14161f', a: '#7a3fbf', b: '#48237a', e: '#ff5f5f', c: '#b889e8' }, [
    [
      '...oooo.......',
      '..oaaaaao.....',
      '.oaeaeaeao....',
      '.oaaaaaaao....',
      '..oaaaaao.....',
      '.oaaaaao......',
      'oaaaaao.......',
      '.oaaaaao......',
      '..obbbbo......',
      '...oo.........',
      '.o.o.o.o......',
      'o.o.o.o.o.....'
    ],
    [
      '...oooo.......',
      '..oaaaaao.....',
      '.oaeaeaeao....',
      '.oaaaaaaao....',
      '..oaaaaao.....',
      '..oaaaaao.....',
      '.oaaaaao......',
      'oaaaaao.......',
      '.obbbbo.......',
      '..oo..........',
      'o.o.o.o.o.....',
      '.o.o.o.o.o....'
    ]
  ]);

  /* 拟态箱：箱体 + 獠牙 */
  DEF('e_mimic', { o: '#1a120a', a: '#b98a3f', b: '#7a5820', e: '#ffd24a', c: '#e0b96b', k: '#2a1c0e', w: '#ffe9a0' }, [
    'oooooooooooo..',
    'oaaaaaaaaaao..',
    'oaccccccccao..',
    'oaccccccccao..',
    'oakkkkkkkkao..',
    'oakwwwwwwkao..',
    'oakkkkkkkkao..',
    'oaeaaaaaeao...',
    'oaaaaaaaaao...',
    'oabbbbbbbao...',
    'obeeeeeeebo...',
    'obe.ee.ebo....',
    'obeeeeeebo....',
    '.obbbbbobo....',
    '..ooooooo.....'
  ]);

  /* 石像鬼：石翼 + 幽瞳 */
  DEF('e_gargoyle', { o: '#14161a', a: '#7d7f8c', b: '#4a4c57', e: '#5ad1ff', c: '#a2a5b2', k: '#20222a' }, [
    'c..........c..',
    'co........oc..',
    'oco......oco..',
    '.ooccccoo.....',
    '.oaccccao.....',
    '.oaeeaeeao....',
    '.oaeaaaaeao...',
    '.oaaaaaaaao...',
    '.oacccccaao...',
    '.oaaccccaao...',
    '.oaaaaaaaao...',
    '..oabbbbao....',
    '..oa..aa.o....',
    '..o....o..o...',
    '..o....o...o..'
  ]);

  /* 咒术弓手：兜帽 + 骨弓 */
  DEF('e_hex_archer', { o: '#170f26', a: '#8f4fd6', b: '#4d2280', e: '#8fffd6', c: '#e0b3ff', k: '#221038' }, [
    '...oooooo.....',
    '..oaaaaaao....',
    '.oaeeaaeeao...',
    '.oaeeaaeeao...',
    '.oaaaaaaao....',
    '.oabbbbbao....',
    '.oaaaaaaao....',
    '.oaaaaaaao....',
    '.obbbbbbbo....',
    '...o...o......',
    '..oo..o.......',
    '.o.o.o.o.......',
    'o..oo..oo......',
    '...o....o......'
  ]);

  /* 虚空恐魔：触须 + 虚空核心 */
  DEF('e_void_horror', { o: '#0e0f16', a: '#3d4a6b', b: '#222a40', e: '#9f5cff', c: '#7de0ff', k: '#10121c' }, [
    '...oooo.......',
    '..oaaaaao.....',
    '.oaeeaaeeao...',
    '.oaeeaaeeao...',
    '..oaaaaao.....',
    '.oaccccao.....',
    'oaccccccao....',
    'oaccckcccao...',
    '.oaccccao.....',
    '.oaaaaaaao....',
    '.o.aaaaa.o....',
    'o..aaaaa..o...',
    'o..o...o..o...',
    'o..o...o..o...'
  ]);

  /* 贪食者：血盆大口 */
  DEF('e_glutton', { o: '#0f2018', a: '#3fbf8f', b: '#217a5a', e: '#8ff0cc', c: '#0f2018', k: '#0d1a13', w: '#eafff4' }, [
    '..oooooooo....',
    '.oaaaaaaaao...',
    'oaccccccccao..',
    'oaekkkkkkeao..',
    'oaekwwwwkeao..',
    'oaekkkkkkeao..',
    'oaeeeeeeeeao..',
    'oaccccccccao..',
    '.oaaaaaaaao...',
    '.obbbbbbbbo...',
    '..oooooooo....'
  ]);

  /* 啮螨：尖牙小虫 */
  PX.animDef('e_mite', { o: '#161019', a: '#c05c8c', b: '#6f2f57', e: '#ffe08a', c: '#e89fc0', k: '#24101c' }, [
    [
      '..oo....oo....',
      '.oaa...oaa....',
      '.oae..oae.....',
      '.oaaaaaaa.....',
      '.oaaaaaaa.....',
      '..obbbbbbo....',
      '..o.o..o.o....',
      '.o..o..o..o...',
      '.o..o..o..o...'
    ],
    [
      '...oo....oo...',
      '..oaa...oaa...',
      '..oae..oae....',
      '..oaaaaaaa....',
      '..oaaaaaaa....',
      '...obbbbbbo...',
      '...o.o..o.o...',
      '..o..o..o..o..',
      '..o..o..o..o..'
    ]
  ]);

  /* 寒晶：浮游冰晶簇 */
  PX.animDef('e_crystal', { o: '#0e1a24', a: '#5fc8e8', b: '#2f7a9f', e: '#c8f4ff', c: '#9fe0ff', k: '#122433', d: '#eafcff' }, [
    [
      '......o.......',
      '.....oDo......',
      '....oDDo......',
      '...oCDDo......',
      '..oCDDDo......',
      '..oCDDDDo.....',
      '.oCDDDDDo.....',
      '.oCDDDDDo.....',
      '.oCDDDDo......',
      '.oCDDDo.......',
      '..oCDDo.......',
      '..oBDo........',
      '.o.o.o........',
      'o.o.o.o.......'
    ],
    [
      '......o.......',
      '.....oDo......',
      '....oDDo......',
      '...oCDDo......',
      '..oCDDDo......',
      '..oCDDDDo.....',
      '.oCDDDDDo.....',
      '.oCDDDDDo.....',
      '.oCDDDDo......',
      '.oCDDDo.......',
      '..oCDDo.......',
      '..oBDo........',
      '...o.o........',
      '..o.o.o.......',
      '..o.o.o.o.....'
    ]
  ]);

  /* 石拳魔：粗壮独眼巨人 */
  DEF('e_ogre', { o: '#12100c', a: '#7a6a4a', b: '#4a3f2a', c: '#a8966e', e: '#ffcf4a', k: '#201b12' }, [
    '..oooooooo....',
    '.oaaaaaaaao...',
    'oacaaaaacaao..',
    'oaeaaaaaeao...',
    'oaeaaaaaeao...',
    'oaaaaaaaaaao..',
    'oabbaaaabbo...',
    '.oabbbbbbo....',
    'ooaaaaaaaoo...',
    'oba.o..o.abo..',
    'oba.o..o.abo..',
    '.obaaaaabo....',
    '..obaaabo.....',
    '..oa..ao......',
    '..oa..ao......',
    '..oo..oo......'
  ]);

  /* ============================================================
     7. 精英精灵图鉴
     ============================================================ */

  /* 守望者：光晕 + 重盔 */
  DEF('el_warden', { o: '#0c1420', a: '#3a5a7a', b: '#1f3548', e: '#7fffd6', c: '#cfe6ff', k: '#101c2c' }, [
    '.c.oooooo.c....',
    '..oaaaaaao.....',
    '.oacccccaao....',
    '.oaeeaaeeao....',
    '.oaeeaaeeao....',
    '.oaaaaaaaao....',
    '.oacccccaao....',
    '.oaaaaaaaao....',
    '.oabbbbbbo.....',
    '.oabbbbbbo.....',
    'oa.aaaaaa.ao...',
    'oa.aaaaaa.ao...',
    'oa.bbbbbb.ao...',
    'oa.bbbbbb.ao...',
    '.o........o....',
    '..oooooooo.....'
  ]);

  /* 铁卫：全身板甲 + 目缝 */
  DEF('el_ironclad', { o: '#0e141c', a: '#8f9ab0', b: '#4a5368', e: '#7fd8ff', c: '#c9d4e8', k: '#141a26', g: '#d8a03a', w: '#d8ecff' }, [
    '...oooooo......',
    '..oaaaaaao.....',
    '.oacccccaao....',
    '.oakkkkkaao....',
    '.oakwewkaao....',
    '.oakkkkkaao....',
    '.oaaaaaaaao....',
    '.oacccccaao....',
    '.oacccccaao....',
    '.oaaaaaaaao....',
    'oa.aaaaaa.ao...',
    'oa.aaaaaa.ao...',
    'oa.bbbbbb.ao...',
    '.o.bbbbbb.o....',
    '..oooooooo.....'
  ]);

  /* 血屠：屠夫围裙 + 血污 + 巨斧 */
  DEF('el_butcher', { o: '#1a0f0d', a: '#a8503f', b: '#5f2a24', e: '#ff5a5a', c: '#e08a70', k: '#2a1410', w: '#ffe8dc' }, [
    '....oooooo.....',
    '...oaaaaaao....',
    '..oaeeaaeao....',
    '..oaeeaaeao....',
    '..oaaaaaaao....',
    '..oabbbbaao....',
    '.oaaabbbaaao...',
    '.oaabbbbbbaao..',
    '.oaabbbbbao....',
    '.oaeaaaaao.....',
    '.oaeaaaaao.....',
    '.oawaaaeao.....',
    '.obbbbbbo......',
    '..o.bb.o.......',
    '..o..o..o......',
    '..o..o..o......'
  ]);

  /* 术法者：兜帽 + 双法球 */
  DEF('el_hexer', { o: '#170f26', a: '#8f4fd6', b: '#4d2280', e: '#b06fff', c: '#e0b3ff', k: '#221038', w: '#f2e6ff' }, [
    '...oooooo......',
    '..oaaaaaao.....',
    '.oaeeaaeeao....',
    '.oaeaaaeao.....',
    '.oaaaaaaao.....',
    '.oabbbbbao.....',
    '.oaaaaaaao.....',
    '.oaaaaaaao.....',
    '.obbbbbbbo.....',
    '..o....o.......',
    '..o.ee.o.......',
    '..o.ee.o.......',
    '..o.ee.o.......',
    '...oooo........'
  ]);

  /* 孵化者：肿胀囊体 + 幼虫 */
  DEF('el_brood', { o: '#14200f', a: '#6f9f4f', b: '#3d5f2a', e: '#ffe08a', c: '#a8d880', k: '#1c2c14', w: '#f0ffe0' }, [
    '...oooooo......',
    '..oaaaaaao.....',
    '.oaeeaaeeao....',
    '.oaeeaaeeao....',
    '.oaaaaaaao.....',
    '.oaaacccao.....',
    '.oaaccccao.....',
    '.oacccccao.....',
    '.oacccccaao....',
    '.oaaaaaaaao....',
    '.oabbbbbbo.....',
    '.o.bbbb.o......',
    '..o.bb.o.......',
    '..o..o.o.......',
    '..o..o.o.......'
  ]);

  /* 收割者：兜帽 + 镰刀 */
  DEF('el_reaper', { o: '#0c0c14', a: '#4d4f66', b: '#262838', e: '#ff3b6b', c: '#aab0cc', k: '#14141e', w: '#eef0ff', d: '#c9c9d8', D: '#c9c9d8' }, [
    '...oooooo.......',
    '..oaaaaaao..oo..',
    '.oaeeaaeeao.oDo.',
    '.oaeeaaeeao.oDo.',
    '.oaaaaaaao.oDo..',
    '.oabbbbbao.oD...',
    '.oaaaaaaao.o....',
    '.oaaaaaaao.o....',
    '.oabbbbbbo.oo...',
    '..oabbbbo..o....',
    '..oa.bb.bo.o....',
    '..oa.bb.bo.o....',
    '...o.bb.o.o.....',
    '...o.bb.oo......',
    '....oooo........'
  ]);

  /* ============================================================
     8. 玩家角色精灵升级（与敌人美术风格统一）
     ============================================================ */

  /* 铁卫：重盔 + 顶缨 + 甲胄高光 */
  DEF('char_knight', { o: '#14161f', a: '#7d8aa8', b: '#4d5773', s: '#e8b98a', e: '#1a1c26', c: '#3f7dff', d: '#c9d4e8', k: '#10121a' }, [
    '....oooo......',
    '...obbbbo..c.',
    '..oaaaaaao..c.',
    '..oaccccao.c..',
    '..obseeesbo...',
    '..obaaaaabo...',
    '..oaccccaao...',
    '.oaaacccaaao..',
    '.oaaaaaaaao...',
    '..oabbbbbao...',
    '..oa.bb.ao....',
    '..ob....bo....',
    '..oo....oo....'
  ]);

  /* 游侠：兜帽 + 围巾 + 箭袋 */
  DEF('char_ranger', { o: '#14161f', a: '#4fa86b', b: '#2f6b45', s: '#e8b98a', e: '#d8ffa0', c: '#c9a227', d: '#8fe0a8', k: '#12241a' }, [
    '....oooo......',
    '...oaaaao.....',
    '..oaaaaaao....',
    '..osssssso....',
    '..oseeeeso....',
    '...osssso.....',
    '..obbbbbbo....',
    '.obacccacbo...',
    '.obaaaaaabo...',
    '..ob.bb.bo....',
    '..ob..b.bo....',
    '..ob..b.bo....',
    '..oo..oo......'
  ]);

  /* 术士：尖兜帽 + 法眼 */
  DEF('char_mage', { o: '#14161f', a: '#8b5cf6', b: '#5b32b8', s: '#e8b98a', e: '#ffe66d', c: '#ffd24a', d: '#c8a0ff', k: '#1c1230' }, [
    '.....oo.......',
    '....oaao......',
    '...oaaaao.....',
    '..oaaaaaao....',
    '..osseesso....',
    '..osssssso....',
    '...ossso......',
    '..obaaabo.....',
    '.obaacaabo....',
    '.obaaaaabo....',
    '..obaaabo.....',
    '...obbbbo.....',
    '..oo....oo....'
  ]);

  /* 狂徒：伤疤 + 獠牙 + 厚甲 */
  DEF('char_brute', { o: '#14161f', a: '#c0392b', b: '#7b1f16', s: '#d9a06b', e: '#ffdd55', c: '#3a3f52', d: '#e06050', k: '#1e0f0c', w: '#ffe8d0' }, [
    '...oooooo.....',
    '..obbbbbbo....',
    '..osssssso....',
    '..oseecceo....',
    '..ossccsso....',
    '...oaaaao.....',
    '.oaaaaaaaao...',
    'oaabaaaabaao..',
    '.oaaaaaaaao...',
    '..oaawwaao....',
    '..ob.ww.bo....',
    '..ob....bo....',
    '.ooo....ooo...'
  ]);

  /* 工匠：护目镜 + 扳手 */
  DEF('char_engineer', { o: '#14161f', a: '#e0902a', b: '#8a5311', s: '#e8b98a', e: '#1a1c26', c: '#5aa7ff', d: '#ffd24a', k: '#241506' }, [
    '...oooooo.....',
    '..oaaaaaao....',
    '..obbbbbbo....',
    '..osssssso....',
    '..oceeecco....',
    '..ossssso.....',
    '..obaaabo.....',
    '.obacccabo....',
    '.obaaaaabo....',
    '..ob.a.bo.....',
    '..ob...bo.....',
    '.ooo...ooo....'
  ]);

  /* 影刺：兜帽 + 幽瞳 + 披风 */
  DEF('char_shadow', { o: '#0e0f16', a: '#3d4a6b', b: '#222a40', s: '#c9a78a', e: '#7de0ff', c: '#7de0ff', d: '#a0c8ff', k: '#0a0c12' }, [
    '....oooo......',
    '...obbbbo.....',
    '..obaaaabo....',
    '..obssssbo....',
    '..obeeeebo....',
    '...oaaaao.....',
    '..obaaaabo....',
    '.obaacaabo....',
    '.obaaaaabo....',
    '..ob.aa.bo....',
    '...ob..bo.....',
    '..oo....oo....'
  ]);

  /* 炼金术士：风镜 + 药剂壶 */
  DEF('char_alchemist', { o: '#14161f', a: '#4f8a3a', b: '#2f5a24', s: '#e8d8b0', e: '#8fc040', c: '#c9a227', d: '#b8f078', k: '#16240f' }, [
    '....oooo......',
    '...oaaaao.....',
    '..oaaaaaao....',
    '..osssssso....',
    '..osecceso....',
    '...oaaaao.....',
    '..obaaabo.....',
    '.obaacaabo....',
    '.obaaaaabo....',
    '..ob.ao.bo....',
    '...ob..bo.....',
    '..oo....oo....'
  ]);

  /* 守望者：冠盔 + 金瞳 */
  DEF('char_warden', { o: '#14161f', a: '#5a7d9c', b: '#2f4457', s: '#e8b98a', e: '#ffd24a', c: '#c9d6e2', d: '#9fd0ff', k: '#141c26' }, [
    '...oooooo.....',
    '..oaaaaaao....',
    '..occcccco....',
    '..obbbbbbo....',
    '..oseeeeso....',
    '..ossssso.....',
    '..obaaabo.....',
    '.obacccabo....',
    '.obaaaaabo....',
    '..obaaabo.....',
    '...obbbo......',
    '.ooo...ooo....'
  ]);

})();
