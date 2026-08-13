/* ============================================================
   32_loot.js —— 开箱出货反馈：分级音效 + 揭示动画 + 品质差异
   白→红逐级加强：音效琶音长度/辉光/射线/震屏/画布特效
   ============================================================ */
'use strict';

(function () {

  var $ = G.$;

  /* ---------------- 分级程序化音效（WebAudio 合成） ---------------- */
  G.Loot = G.Loot || {};

  G.Loot.sfx = function (tier) {
    var A = G.Audio;
    if (!A || A.muted || !A.ctx) return;
    var t = A.ctx.currentTime;
    try {
      if (tier <= 0) {
        A._tone(t, { type: 'triangle', f0: 520, f1: 780, dur: 0.08, gain: 0.14 });
        A._noise(t, { dur: 0.05, gain: 0.05, filt: { type: 'highpass', f0: 1800 } });
      } else if (tier === 1) {
        A._tone(t, { type: 'triangle', f0: 660, f1: 880, dur: 0.09, gain: 0.15 });
        A._tone(t + 0.07, { type: 'triangle', f0: 880, f1: 1100, dur: 0.1, gain: 0.13 });
        A._noise(t + 0.05, { dur: 0.06, gain: 0.05, filt: { type: 'highpass', f0: 2200 } });
      } else if (tier === 2) {
        A._chord(t, [660, 880, 1175], { type: 'triangle', dur: 0.12, gain: 0.15, stagger: 0.06, send: 0.15 });
        A._noise(t + 0.08, { dur: 0.1, gain: 0.06, filt: { type: 'highpass', f0: 2600 } });
      } else if (tier === 3) {
        A._chord(t, [523, 659, 784], { type: 'triangle', dur: 0.2, gain: 0.18, stagger: 0.07, send: 0.22 });
        A._tone(t + 0.18, { type: 'square', f0: 1047, f1: 1319, dur: 0.16, gain: 0.08 });
        A._noise(t, { dur: 0.3, gain: 0.06, filt: { type: 'lowpass', f0: 500 }, send: 0.1 });
      } else {
        A._chord(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.3, gain: 0.2, stagger: 0.08, send: 0.3 });
        A._tone(t, { type: 'sawtooth', f0: 110, f1: 55, dur: 0.6, gain: 0.16, distort: 6, send: 0.2 });
        A._noise(t, { dur: 0.45, gain: 0.1, filt: { type: 'lowpass', f0: 900, f1: 200 }, send: 0.25 });
        A._tone(t + 0.3, { type: 'sine', f0: 1319, f1: 1760, dur: 0.5, gain: 0.1, send: 0.3 });
      }
    } catch (e) { /* 单音失败不影响游戏 */ }
  };

  /* 金箱/深渊箱开启重低音 */
  G.Loot.boom = function () {
    var A = G.Audio;
    if (!A || A.muted || !A.ctx) return;
    var t = A.ctx.currentTime;
    try {
      A._tone(t, { type: 'sawtooth', f0: 90, f1: 45, dur: 0.5, gain: 0.22, distort: 8, send: 0.22 });
      A._noise(t, { dur: 0.35, gain: 0.12, filt: { type: 'lowpass', f0: 500, f1: 150 }, send: 0.2 });
    } catch (e) { /* 忽略 */ }
  };

  G.Loot.tierStyle = function (tier) {
    return {
      col: tier === 0 ? '#d9dde8' : G.rarityColor(tier),
      name: G.rarityName(tier),
      power: [1, 1.4, 2.0, 3.0, 4.6][tier] || 1
    };
  };

  /* ---------------- 出货画布特效（按品质分级） ---------------- */
  G.Loot.fx = function (x, y, tier) {
    var g = G.game;
    if (!g) return;
    var st = G.Loot.tierStyle(tier);
    var col = st.col, pow = st.power;
    G.fx('ring', { x: x, y: y, r0: 8, r1: 90 + 26 * pow, col: col, w: 4 + pow, life: 0.45 });
    if (tier >= 2) G.fx('ring', { x: x, y: y, r0: 5, r1: 55 + 18 * pow, col: '#ffffff', w: 3, life: 0.3 });
    if (tier >= 3) G.fx('flash', { x: x, y: y, r: 60 + 26 * pow, col: col, life: 0.2 });
    G.burstMix(x, y, 12 + tier * 8, col, 200 + 60 * pow, { glow: tier >= 2, debCol: '#5a5f72', size: 3 });
    if (tier >= 3) g.shake(7 + tier * 3, 0.3 + tier * 0.1);
  };

  /* ---------------- 出货揭示动画（队列，逐件播放） ---------------- */
  G.UI._lootQ = G.UI._lootQ || [];
  G.UI._lootBusy = false;

  G.UI.showLootCard = function (inst) {
    G.UI._lootQ.push(inst);
    if (!G.UI._lootBusy) G.UI._lootNext();
  };

  G.UI._lootNext = function () {
    var e = $('lootToast');
    if (!e) { G.UI._lootQ = []; G.UI._lootBusy = false; return; }
    var inst = G.UI._lootQ.shift();
    if (!inst) { G.UI._lootBusy = false; return; }
    G.UI._lootBusy = true;
    var st = G.Loot.tierStyle(inst.tier);
    var iconHost = $('lootIcon');
    iconHost.innerHTML = '';
    /* 遗物大图标优先；闪光帧叠加 */
    var ic = inst.type === 'weapon' ? G.weaponIcon(inst.def, inst.tier, 4) : G.itemIcon(inst.def, 4);
    if (G.Art && G.Art.sparkFrames && st.power >= 2) {
      var spark = G.PX.getTint(G.Art.sparkFrames[inst.tier % G.Art.sparkFrames.length], '#ffffff', 3);
      if (spark) iconHost.appendChild(G.PX.node(spark));
    }
    if (ic) iconHost.appendChild(G.PX.node(ic));
    $('lootName').textContent = inst.def.name;
    $('lootName').style.color = st.col;
    $('lootSub').textContent = (inst.type === 'weapon' ? '武器 · ' : G.ITEM_TYPE_NAMES[inst.type] + ' · ') + st.name + ' · 已入背包';
    e.style.borderColor = st.col;
    e.style.boxShadow = '0 0 ' + (16 + st.power * 14) + 'px ' + st.col + (st.power >= 2 ? 'aa' : '55');
    e.className = 'loot-toast loot-r' + inst.tier;
    e.classList.remove('loot-pop');
    void e.offsetWidth;
    e.classList.add('loot-pop');
    G.Loot.sfx(inst.tier);
    var r = e.getBoundingClientRect();
    G.UI.burstDom(r.left + r.width / 2, r.top + r.height / 2, st.col, tierBurst(inst.tier));
    clearTimeout(G.UI._lootT);
    G.UI._lootT = setTimeout(function () {
      e.classList.add('hidden');
      e.style.boxShadow = '';
      G.UI._lootBusy = false;
      if (G.UI._lootQ.length) G.UI._lootNext();
    }, 650 + inst.tier * 220);
  };

  function tierBurst(t) { return t <= 0 ? 8 : (t === 1 ? 10 : t === 2 ? 14 : t === 3 ? 18 : 26); }

  /* 出货时画布特效 + 分级音效（包在奖励结算外） */
  var _acr3 = G.game.applyContainerReward;
  G.game.applyContainerReward = function (c, out) {
    var best = -1, i;
    for (i = 0; i < (out || []).length; i++) {
      var o = out[i];
      if (o.inst && o.inst.tier > best) best = o.inst.tier;
    }
    if (best >= 0) {
      G.Loot.fx(c.x, c.y - 8, best);
    }
    if (c.type === 'chest_gold' || c.type === 'chest_abyss') G.Loot.boom();
    return _acr3.call(this, c, out);
  };

})();
