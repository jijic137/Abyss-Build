/* 批量 AI 美术生成：调 ComfyUI API（flux2-dev 立绘/概念图）
   特性：连接超时 + 请求重试 + 断点续跑（已下载的跳过）+ 服务预检
   用法：node tools/_gen_ai_art.js
   产物：assets/art/ai/{cover,tiers,boss,events}/
   日志：tools/cache/ai_gen.log
*/
'use strict';
const fs = require('fs');
const path = require('path');

const API = 'http://36.150.116.215:8188';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'art', 'ai');
const LOG = path.join(__dirname, 'cache', 'ai_gen.log');
fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });

function log(m) {
  const line = '[' + new Date().toISOString().slice(11, 19) + '] ' + m;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

async function fetchRetry(url, opts, tries) {
  opts = opts || {};
  tries = tries || 3;
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(function () { ctl.abort(); }, opts.timeout || 20000);
      const res = await fetch(url, Object.assign({}, opts, { signal: ctl.signal }));
      clearTimeout(timer);
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 5000 * (i + 1)));
    }
  }
  throw lastErr;
}

function workflow(prompt, seed, width, height, prefix) {
  return {
    '1': { class_type: 'CLIPLoader', inputs: { clip_name: 'mistral_3_small_flux2_fp8.safetensors', type: 'flux2' } },
    '2': { class_type: 'VAELoader', inputs: { vae_name: 'flux2-vae.safetensors' } },
    '3': { class_type: 'UnetLoaderGGUF', inputs: { unet_name: 'flux2-dev-Q4_K_S.gguf', weight_dtype: 'default' } },
    '4': { class_type: 'EmptyLatentImage', inputs: { width: width, height: height, batch_size: 1 } },
    '5': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 0] } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['1', 0] } },
    '10': { class_type: 'FluxGuidance', inputs: { conditioning: ['5', 0], guidance: 3.5 } },
    '7': { class_type: 'KSampler', inputs: { model: ['3', 0], seed: seed, steps: 20, cfg: 1.0, sampler_name: 'euler', scheduler: 'simple', positive: ['10', 0], negative: ['6', 0], latent_image: ['4', 0], denoise: 1.0 } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['7', 0], vae: ['2', 0] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: prefix, images: ['8', 0] } }
  };
}

const STYLE = 'dark fantasy game concept art, stylized painterly, atmospheric, dramatic lighting, deep shadows, teal and amber accents, highly detailed, moody, 2D game art';
const JOBS = [
  { key: 'cover', file: 'ah_cover', w: 1216, h: 832, p: 'wide key art, a lone abyss hunter in worn cloak and bandolier standing at a rift portal holding a glowing relic, loot pack on back, cinematic composition, ' + STYLE },
  { key: 'tiers', file: 'tier1_fringe', w: 1216, h: 832, p: 'wide landscape concept art, lush overgrown fissure at the edge of an abyss, glowing green veins in cracked stone, ancient ruins swallowed by moss and vines, pale mist, distant spiral gate, ' + STYLE },
  { key: 'tiers', file: 'tier2_corridor', w: 1216, h: 832, p: 'wide concept art, vast underground corridor of blue-grey stone arches, ancient pillars, cold blue torchlight, drifting fog, silhouetted shrine in the distance, ' + STYLE },
  { key: 'tiers', file: 'tier3_mine', w: 1216, h: 832, p: 'wide concept art, deep mine cavern with amber crystal veins, wooden scaffolding and broken carts, warm torchlight against darkness, glowing ore deposits, ' + STYLE },
  { key: 'tiers', file: 'tier4_heartland', w: 1216, h: 832, p: 'wide concept art, hellish inner abyss with rivers of lava and dark violet stone, floating embers, ominous citadel silhouette, crimson glow, epic scale, ' + STYLE },
  { key: 'tiers', file: 'tier5_gate', w: 1216, h: 832, p: 'wide concept art, colossal black-gold gate at the heart of the abyss, swirling void energy, floating debris, a tiny lone explorer standing before it, apocalyptic scale, ' + STYLE },
  { key: 'boss', file: 'boss1_behemoth', w: 832, h: 1216, p: 'portrait concept art, colossal corrupted behemoth with chitinous armor and glowing molten cracks, heavy chains, snarling, full body, ' + STYLE },
  { key: 'boss', file: 'boss2_abyss', w: 832, h: 1216, p: 'portrait concept art, the Lord of the Abyss, regal eldritch figure in tattered black-gold robes, void crown, seven glowing eyes, tendrils of darkness, floating, imposing, full body, ' + STYLE },
  { key: 'events', file: 'event_altar', w: 832, h: 1216, p: 'concept art, mysterious altar in a dark shrine room, floating runes, offering bowl with violet flame, treasure chests around, intimate scale, ' + STYLE },
  { key: 'events', file: 'portal_rift', w: 832, h: 1216, p: 'concept art, swirling violet rift portal between reality and the abyss, energy tendrils, cracked stone arch, glowing particles, centered composition, ' + STYLE },
  { key: 'elites', file: 'el1_warden', w: 832, h: 1216, p: 'portrait concept art, armored elite abyss warden with a heavy shield and glowing green runes, stern, full body, ' + STYLE },
  { key: 'elites', file: 'el2_ironclad', w: 832, h: 1216, p: 'portrait concept art, massive ironclad elite golem with layered plate armor and glowing blue core, slow and menacing, full body, ' + STYLE },
  { key: 'elites', file: 'el3_butcher', w: 832, h: 1216, p: 'portrait concept art, crazed butcher elite with twin cleavers and blood-soaked apron, crimson eyes, charging pose, full body, ' + STYLE },
  { key: 'elites', file: 'el4_hexer', w: 832, h: 1216, p: 'portrait concept art, hooded hexer elite casting purple curse magic, floating runes around hands, glowing eyes, full body, ' + STYLE },
  { key: 'elites', file: 'el5_brood', w: 832, h: 1216, p: 'portrait concept art, bloated broodmother elite with spider eggs hanging from her back, green ichor glow, unsettling, full body, ' + STYLE },
  { key: 'elites', file: 'el6_reaper', w: 832, h: 1216, p: 'portrait concept art, hooded reaper elite wielding a giant scythe, wispy dark cloak, glowing white eyes, full body, ' + STYLE },
  { key: 'base', file: 'base_camp', w: 1216, h: 832, p: 'wide concept art, underground base camp with wooden tables, weapons rack, treasure chests, warm lanterns, maps on the wall, an abyss hunter organizing loot, ' + STYLE },
  { key: 'result', file: 'result_win', w: 1216, h: 832, p: 'wide key art, triumphant abyss hunter walking away from a glowing rift with a heavy loot pack, golden light, floating embers, cinematic, ' + STYLE },
  { key: 'result', file: 'result_lose', w: 1216, h: 832, p: 'wide key art, fallen abyss hunter gear scattered on dark stone before a cold void gate, somber mood, fading embers, ' + STYLE },
  { key: 'system', file: 'daily_challenge', w: 1216, h: 832, p: 'wide banner art, ominous clockwork hourglass above an abyss gate, magical hourglass with purple sand, challenge sigils floating, ' + STYLE },
  { key: 'chars', file: 'char_knight', w: 832, h: 1216, p: 'portrait concept art, iron knight abyss hunter in heavy plate armor with a spear, heroic stance, teal rim light, ' + STYLE },
  { key: 'chars', file: 'char_ranger', w: 832, h: 1216, p: 'portrait concept art, agile ranger abyss hunter in leather coat with a pistol, calm aim, green accents, ' + STYLE },
  { key: 'chars', file: 'char_mage', w: 832, h: 1216, p: 'portrait concept art, hooded mage abyss hunter channeling violet elemental magic, floating runes, ' + STYLE },
  { key: 'chars', file: 'char_brute', w: 832, h: 1216, p: 'portrait concept art, massive berserker abyss hunter with a war hammer, scarred and grinning, orange accents, ' + STYLE },
  { key: 'chars', file: 'char_engineer', w: 832, h: 1216, p: 'portrait concept art, engineer abyss hunter with goggles and a shoulder turret, wrench in hand, amber workshop glow, ' + STYLE },
  { key: 'chars', file: 'char_shadow', w: 832, h: 1216, p: 'portrait concept art, shadow assassin abyss hunter in dark cloak with twin daggers, purple smoke, ' + STYLE },
  { key: 'chars', file: 'char_alchemist', w: 832, h: 1216, p: 'portrait concept art, alchemist abyss hunter with a venom flask and poison vapor, green glow, ' + STYLE },
  { key: 'chars', file: 'char_warden', w: 832, h: 1216, p: 'portrait concept art, warden abyss hunter in armor with a tower shield and turret, steadfast, blue accents, ' + STYLE },
  { key: 'market', file: 'market_stall', w: 1216, h: 832, p: 'wide concept art, underground black market stall with glowing wares, lanterns, mysterious merchant behind the counter, ' + STYLE },
  { key: 'records', file: 'records_wall', w: 1216, h: 832, p: 'wide concept art, memorial wall in a dark base with framed trophies, maps and bloodstained banners, candlelight, ' + STYLE }
];

async function submit(prompt, seed, width, height, prefix) {
  const body = { prompt: workflow(prompt, seed, width, height, prefix) };
  const res = await fetchRetry(API + '/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.prompt_id) throw new Error('no_prompt: ' + JSON.stringify(data));
  return data.prompt_id;
}

async function poll(id, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await new Promise(r => setTimeout(r, 10000));
    try {
      const res = await fetchRetry(API + '/history/' + id, { timeout: 15000 }, 2);
      const data = await res.json();
      const h = data[id];
      if (!h) continue;
      const st = h.status && h.status.status_str;
      if (st === 'success') {
        const imgs = h.outputs && h.outputs['9'] && h.outputs['9'].images;
        if (imgs && imgs.length) return imgs[0].filename;
        throw new Error('success 但无图片输出');
      }
      if (st === 'error') throw new Error('execution_error: ' + JSON.stringify(h.status).slice(0, 500));
    } catch (e) {
      log('  轮询异常（继续）: ' + e.message);
    }
  }
  throw new Error('超时');
}

async function download(filename, dest) {
  const res = await fetchRetry(API + '/view?filename=' + encodeURIComponent(filename) + '&type=output', { timeout: 60000 }, 3);
  if (!res.ok) throw new Error('download ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

(async () => {
  /* 服务预检 */
  try {
    const res = await fetchRetry(API + '/system_stats', { timeout: 15000 }, 2);
    const st = await res.json();
    log('服务在线 devices=' + (st.devices ? st.devices.length : '?'));
  } catch (e) {
    log('服务不可达，请确认服务器/网络后重试: ' + e.message);
    process.exit(2);
  }

  let ok = 0, fail = 0, skip = 0;
  for (let i = 0; i < JOBS.length; i++) {
    const job = JOBS[i];
    const dir = path.join(OUT, job.key);
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, job.file + '.png');
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      log(`[${i + 1}/${JOBS.length}] ${job.file} 已存在，跳过`);
      skip++;
      continue;
    }
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      log(`[${i + 1}/${JOBS.length}] ${job.file} 提交中（第 ${attempt} 次）...`);
      try {
        const id = await submit(job.p, 1000 + i * 137 + attempt, job.w, job.h, 'ah_' + job.file);
        log(`  prompt_id=${id} 轮询中...`);
        const filename = await poll(id, 10 * 60 * 1000);
        const bytes = await download(filename, dest);
        log(`  ✓ 已下载 ${job.file}.png (${(bytes / 1024).toFixed(0)}KB)`);
        ok++;
        done = true;
      } catch (e) {
        log(`  ✗ 第 ${attempt} 次失败: ${e.message}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    if (!done) fail++;
  }
  log(`=== 完成：成功 ${ok} / 失败 ${fail} / 跳过 ${skip} ===`);
  process.exit(fail ? 1 : 0);
})();
