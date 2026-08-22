/* ============================================================
   68_hud.js - HUD combat polish (AAA-inspired, additive only)
   - Health bar: .AH-hp / .AH-xp classes (segment ticks + gloss)
   - Equip icon slots: .AH-cn class (corner frames / gem border)
   - Skill ring: .AH-slot class (readiness glow + cooldown sweep)
   - Panel layering: .AH-fix class (no-overlap defensive CSS)
   Never removes/renames existing ids/classes; additive only.
   Every DOM lookup is existence-guarded.
   ============================================================ */
(function () {
  'use strict';

  var appliedLow = false;

  function ready(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') { fn(); }
    else if (document.addEventListener) { document.addEventListener('DOMContentLoaded', fn); }
    else { fn(); }
  }

  function q(sel) { try { return document.querySelector(sel); } catch (e) { return null; } }
  function qa(sel) { try { var n = document.querySelectorAll(sel); return n ? n : []; } catch (e) { return []; } }

  function applyHealth() {
    var bar = document.getElementById('hpbar') || q('.hpbar');
    if (bar) { bar.classList.add('AH-hp'); appliedLow = false; }
    var xp = document.getElementById('xpbar') || q('.xpbar');
    if (xp) xp.classList.add('AH-xp');
  }

  function applyEquip() {
    var cells = qa('#equipGrid .equip-cell, .bag-grid .equip-slot, .inv2-equip .inv2-slot');
    for (var i = 0; i < cells.length; i++) cells[i].classList.add('AH-cn');
  }

  function applySkill() {
    var core = document.getElementById('skillCore') || q('.skill-core');
    var slot = document.getElementById('skillSlot') || q('.skill-mod');
    if (core) core.classList.add('AH-slot');
    if (slot) slot.classList.add('AH-slot');
  }

  function applyFix() {
    var cmd = q('.hud-command');
    if (cmd) cmd.classList.add('AH-fix');
    var bottom = q('.hud-bottom');
    if (bottom) bottom.classList.add('AH-fix');
  }

  function once() { applyHealth(); applyEquip(); applySkill(); applyFix(); }

  ready(once);

  /* Public hook: re-decorate after any HUD rebuild (safe, additive). */
  if (typeof G !== 'undefined') {
    G.HUD68 = G.HUD68 || {};
    G.HUD68.decorate = function () { once(); };
  }

  /* Liaise with G.UI.updateHud (guarded): keep low-HP class synced. */
  if (typeof G !== 'undefined' && G.UI && typeof G.UI.updateHud === 'function') {
    var _up = G.UI.updateHud;
    G.UI.updateHud = function (g) {
      var r = _up.call(this, g);
      var p = g && g.player;
      var low = p && p.st && p.st.maxHp > 0 && (p.hp / p.st.maxHp) <= 0.35;
      var bar = document.getElementById('hpbar') || q('.hpbar');
      if (bar) {
        if (low) { bar.classList.add('AH-low'); appliedLow = true; }
        else if (appliedLow) { bar.classList.remove('AH-low'); appliedLow = false; }
      }
      return r;
    };
  }

})();