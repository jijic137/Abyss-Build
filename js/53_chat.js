/* ============================================================
   53_chat.js —— 怪物台词气泡 + 玩家快捷回应
   - 怪物按情境说话：进房挑衅 / 受击喊疼 / 死亡遗言 / 低血嘲讽 /
     词缀台词 / 精英挑衅 / BOSS 登场与阶段台词
   - 按 T 玩家说出角色口头禅（8 职业各有设定），附近怪物可能接话
   - 世界坐标气泡，限流防刷屏
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* ---------------- 台词池 ---------------- */
  var POOLS = {
    ambient: ['饿……', '血肉的味道……', '嘶……', '别想跑……', '深渊……在呼唤……', '你也是来送死的？', '好香……好香……', '别眨眼……'],
    angry: ['啊！', '疼！', '你惹错人了！', '我要撕碎你！', '记住我的样子！', '小看你了……'],
    death: ['不……', '为什么……', '我……不该来的……', '深渊……会记住你的……', '你也会……下来陪我的……', '呵……呵……'],
    taunt: ['快不行了吧？', '跑啊，继续跑！', '你的血归我了！', '放弃吧……', '深渊饿着呢……'],
    elite: ['深渊赐我力量！', '休想过去！', '你这种货色也配进深渊？', '精英不是白叫的！'],
    bossIntro: ['又一个送死的……', '我闻到了你的恐惧。'],
    bossPhase: ['愤怒……沸腾！', '这才是开始！', '此间的法则，由我改写……', '绝望吧，蝼蚁！'],
    affix: {
      frenzy: ['杀！杀！杀！'],
      split: ['你打不散我们！'],
      vamp: ['血……美味……'],
      shield: ['打不动的！']
    }
  };

  /* 角色口头禅（按职业设定） */
  var CATCHPHRASES = {
    knight: ['让开！', '盾在，人在。', '你们的死期到了。'],
    ranger: ['正中靶心。', '跑得再快也没用。', '一箭一个。'],
    mage: ['元素在低语……', '湮灭。', '你的生命到此为止。'],
    brute: ['哈哈哈哈！', '再来！再来！', '打不死的我！'],
    engineer: ['尝尝这个！', '工程学的力量！', '完美计算。'],
    shadow: ['你已经死了。', '影子比你快。', '悄无声息。'],
    alchemist: ['小心，我调的毒很浓。', '配方是致命的。', '慢——慢——毒发。'],
    warden: ['我守护这片土地。', '退后。', '深渊终将被净化。']
  };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var Chat = {
    lastT: 0,
    active: 0,
    maxActive: 4,
    minGap: 1.6,

    say: function (e, text, dur, col) {
      if (!e || !text) return;
      var now = performance.now() / 1000;
      if (now - this.lastT < this.minGap && !e.bubble) return;
      if (this.active >= this.maxActive && !e.bubble) return;
      this.lastT = now;
      if (!e.bubble) this.active++;
      e.bubble = { text: text, t: 0, dur: dur || 2.0, col: col || '#ff7a6a', player: false };
      e.chatCd = 6 + Math.random() * 6;
    },

    end: function (e) {
      if (e && e.bubble) { this.active = Math.max(0, this.active - 1); e.bubble = null; }
    },

    playerSay: function () {
      var g = G.game, p = g.player;
      if (!p || p.dead) return;
      var id = p.char.id;
      var list = CATCHPHRASES[id] || CATCHPHRASES.knight;
      var text = pick(list);
      if (p.bubble) this.active = Math.max(0, this.active - 1);
      p.bubble = { text: text, t: 0, dur: 2.2, col: '#7fd8ff', player: true };

      G.Audio.sfx('select');
      /* 附近怪物 45% 概率接话 */
      if (Math.random() < 0.45) {
        var near = null, bd = 420 * 420;
        for (var i = 0; i < g.enemies.length; i++) {
          var e = g.enemies[i];
          if (e.dead || e.bubble) continue;
          var d = G.dist2(p.x, p.y, e.x, e.y);
          if (d < bd) { bd = d; near = e; }
        }
        if (near) this.say(near, pick(POOLS.angry), 1.8);
      this.lastT = performance.now() / 1000;
      }
    },

    tick: function (g, dt) {
      var p = g.player, i;
      /* 衰减 */
      if (p && p.bubble) {
        p.bubble.t += dt;
        if (p.bubble.t >= p.bubble.dur) this.end(p);
      }
      for (i = 0; i < g.enemies.length; i++) {
        var e = g.enemies[i];
        if (e.dead) continue;
        if (e.bubble) {
          e.bubble.t += dt;
          if (e.bubble.t >= e.bubble.dur) this.end(e);
        }
        /* 环境台词：玩家靠近时偶尔开口 */
        e.chatCd = (e.chatCd || 2) - dt;
        if (e.chatCd <= 0 && !e.bubble && G.dist(e.x, e.y, p.x, p.y) < 380) {
          e.chatCd = 7 + Math.random() * 9;
          if (Math.random() < 0.18) {
            var txt = pick(POOLS.ambient);
            var af = e.affixes && e.affixes.length ? e.affixes[0].id : null;
            if (af && POOLS.affix[af] && Math.random() < 0.6) txt = pick(POOLS.affix[af]);
            if (e.def.elite && Math.random() < 0.5) txt = pick(POOLS.elite);
            this.say(e, txt, 1.9, e.def.elite ? '#ffd24a' : '#ff8a7a');
          }
        }
      }
      /* 低血嘲讽 */
      if (p && !p.dead && p.hp / p.st.maxHp < 0.3) {
        this.tauntT = (this.tauntT || 0) - dt;
        if (this.tauntT <= 0 && this.active < this.maxActive) {
          this.tauntT = 6;
          var tNear = null, td = 360 * 360;
          for (i = 0; i < g.enemies.length; i++) {
            var e2 = g.enemies[i];
            if (e2.dead || e2.bubble) continue;
            var d2 = G.dist2(e2.x, e2.y, p.x, p.y);
            if (d2 < td) { td = d2; tNear = e2; }
          }
          if (tNear) this.say(tNear, pick(POOLS.taunt), 1.8, '#ff8a7a');
        }
      }
    },

    /* ---------------- 气泡绘制（世界坐标） ---------------- */
    draw: function (c, g) {
      var p = g.player;
      c.save();
      c.translate(Math.round(-g.camX), Math.round(-g.camY));
      var i;
      for (i = 0; i < g.enemies.length; i++) {
        var e = g.enemies[i];
        if (e.bubble && !e.dead) {
          var off = (e.def ? e.def.r : 20) + 26;
          this.bubble(c, e.x, e.y - off, e.bubble);
        }
      }
      if (p && p.bubble && !p.dead) this.bubble(c, p.x, p.y - 34, p.bubble);
      c.restore();
    },

    bubble: function (c, x, y, b) {
      var t = b.t / b.dur;
      var alpha = t < 0.12 ? t / 0.12 : (t > 0.82 ? (1 - t) / 0.18 : 1);
      alpha = G.clamp(alpha, 0, 1);
      if (alpha <= 0.02) return;
      c.save();
      c.font = 'bold 11px "Segoe UI",sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      var maxW = 150;
      var words = b.text.split('');
      var lines = [''];
      for (var i = 0; i < words.length; i++) {
        if (c.measureText(lines[lines.length - 1] + words[i]).width > maxW - 14) lines.push('');
        lines[lines.length - 1] += words[i];
      }
      var w = 0;
      for (i = 0; i < lines.length; i++) w = Math.max(w, c.measureText(lines[i]).width + 16);
      w = Math.max(w, 34);
      var h = lines.length * 16 + 10;
      var bx = x - w / 2, by = y - h;
      c.globalAlpha = alpha * 0.92;
      c.fillStyle = '#0b0e16';
      c.fillRect(bx, by, w, h);
      c.strokeStyle = b.col;
      c.lineWidth = 2;
      c.strokeRect(bx, by, w, h);
      /* 尾巴 */
      c.beginPath();
      c.moveTo(x - 5, by + h - 1);
      c.lineTo(x + 5, by + h - 1);
      c.lineTo(x, by + h + 7);
      c.closePath();
      c.fillStyle = '#0b0e16';
      c.fill();
      c.strokeStyle = b.col;
      c.stroke();
      c.globalAlpha = alpha;
      c.fillStyle = '#e8ecf8';
      for (i = 0; i < lines.length; i++) c.fillText(lines[i], x, by + 9 + i * 16);
      c.restore();
    }
  };
  G.Chat = Chat;

  /* ---------------- 主循环接入 ---------------- */
  var _updC = G.game.update;
  G.game.update = function (dt) {
    _updC.call(this, dt);
    if (this.state !== 'play' || !this.map || !this.player) return;
    Chat.tick(this, dt);
  };

  var _rndC = G.game.render;
  G.game.render = function () {
    _rndC.call(this);
    if (this.map && this.player) Chat.draw(this.ctx, this);
  };

  /* ---------------- 事件台词 ---------------- */
  var _killC = G.game.killEnemy;
  G.game.killEnemy = function (e) {
    _killC.call(this, e);
    if (e.dead && !e.bubble && !e.def.boss && Math.random() < 0.5) {
      Chat.say(e, pick(POOLS.death), 1.7, '#8a90a8');
    }
  };

  var _dmgC = G.game.damageEnemy;
  G.game.damageEnemy = function (e, dmg, o) {
    _dmgC.call(this, e, dmg, o);
    if (!e.dead && !e.bubble && !o.dot && Math.random() < 0.05) {
      Chat.say(e, pick(POOLS.angry), 1.2);
    }
  };

  var _enterC = G.game.enterRoom;
  G.game.enterRoom = function (idx) {
    var r = _enterC.call(this, idx);
    var rm = this.map && this.map.rooms[idx];
    if (rm && rm.visited && !rm._chatIntro) {
      rm._chatIntro = true;
      for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        if (e.dead || e.room !== idx) continue;
        if (e.def.boss) { Chat.say(e, pick(POOLS.bossIntro), 2.6, '#ff4a6b'); break; }
        if (e.def.elite && Math.random() < 0.8) { Chat.say(e, pick(POOLS.elite), 2.2, '#ffd24a'); break; }
      }
    }
    return r;
  };

  /* BOSS 阶段台词 */
  var _phaseC = G.Enemy.prototype.enterPhase;
  G.Enemy.prototype.enterPhase = function (n, g) {
    _phaseC.call(this, n, g);
    Chat.say(this, pick(POOLS.bossPhase), 2.4, '#ff4a6b');
  };

  /* ---------------- T 键快捷回应 ---------------- */
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyT') {
      var g = G.game;
      if (g && g.state === 'play' && g.player && !g.player.dead) {
        G.Chat.playerSay();
      }
    }
  });

})();
