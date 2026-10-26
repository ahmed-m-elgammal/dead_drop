/**
 * M3 polish sprint — asset generation for the incremental UI/UX pass.
 *
 * Generates the 8 assets the existing game actually lacks (audit-driven):
 *   - 4 archetype mugshots → SetupScreen "known associates" dossier cards
 *   - 4 district surveillance vignettes → evidence-log reveal notes
 *     (Sidebar + FugitiveLog) + CaseBriefing "the neighborhood" polaroid
 *
 * Same LOCKED style suffix as the W4 set so everything reads as one game.
 * Raw renders go to assets-raw/; scripts/m3_polish_pixelate.py forces the
 * chunky pixel grid into public/art/.
 *
 * Run: bun scripts/m3_polish_gen_assets.mjs
 */
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT_DIR = '/home/z/my-project/assets-raw';
fs.mkdirSync(OUT_DIR, { recursive: true });

// Locked art direction — identical to scripts/m3_w4_gen_assets.mjs.
const STYLE =
  '16-bit pixel art, retro adventure game asset, dark film-noir palette: deep ink navy #0d1321, ' +
  'midnight blue #1b2438, warm amber #e8a33d, blood red #a62f2f, cream paper #e8ddc7, muted teal #3d7068. ' +
  'Crisp chunky pixels, subtle dithering, high contrast, moody cinematic lighting, ' +
  'no text, no words, no letters, no watermark, no border';

const ASSETS = [
  // ---- archetype mugshots (police dossier table, interrogation flash) ----
  {
    name: 'mugshot-baseline',
    size: '1024x1024',
    prompt:
      'Police mugshot bust portrait of a plain methodical courier, flat unreadable stare straight ahead, ordinary flat cap and plain work jacket, perfectly centered rigid posture, gray interrogation wall backdrop with height lines, harsh frontal flash',
  },
  {
    name: 'mugshot-random',
    size: '1024x1024',
    prompt:
      'Police mugshot bust portrait of a jittery young street courier, wide restless eyes glancing sideways, messy hair under a crooked beanie, patched mismatched jacket, restless half-smirk, gray interrogation wall backdrop with height lines, harsh frontal flash',
  },
  {
    name: 'mugshot-cautious',
    size: '1024x1024',
    prompt:
      'Police mugshot bust portrait of a careful older courier, collar turned up and scarf hiding the lower face, wary narrowed eyes looking slightly away, neat dark coat, composed guarded expression, gray interrogation wall backdrop with height lines, harsh frontal flash',
  },
  {
    name: 'mugshot-deceptive',
    size: '1024x1024',
    prompt:
      'Police mugshot bust portrait of a charming criminal boss courier, confident knowing smile that does not reach cold eyes, sharp pinstripe suit and fedora tilted low, relaxed elegant posture, gray interrogation wall backdrop with height lines, harsh frontal flash',
  },
  // ---- district surveillance vignettes (aerial night views) ----
  {
    name: 'district-D1',
    size: '1344x768',
    prompt:
      'High-angle night view of a rainy industrial harbor district, tall dock cranes over a moored cargo freighter, stacked shipping containers along a wet quay, amber floodlights reflecting in black water, fog rolling over the pier',
  },
  {
    name: 'district-D2',
    size: '1344x768',
    prompt:
      'High-angle night view of a narrow cobbled old-town street, crooked brick tenements with a few amber lit windows, a small stone arch bridge over a canal, flickering gas lampposts, drizzle haze between the rooftops',
  },
  {
    name: 'district-D3',
    size: '1344x768',
    prompt:
      'High-angle night view of a shuttered street market, rows of closed stalls with canvas awnings, strings of dim amber lanterns swaying over wet cobblestones, scattered crates and awning poles, thin fog between the lamp pools',
  },
  {
    name: 'district-D4',
    size: '1344x768',
    prompt:
      'High-angle night view of a rail yard, fanned train tracks with weathered freight cars, one signal light glowing red, a silhouetted water tower, sodium lamps casting long amber pools over gravel and rails, low mist',
  },
];

async function main() {
  const zai = await ZAI.create();
  const results = [];
  for (const a of ASSETS) {
    const outPath = path.join(OUT_DIR, `${a.name}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`skip (exists): ${a.name}`);
      results.push({ name: a.name, ok: true });
      continue;
    }
    let ok = false;
    let lastErr = null;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        const res = await zai.images.generations.create({
          prompt: `${a.prompt}, ${STYLE}`,
          size: a.size,
        });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error('empty base64');
        fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
        console.log(`ok: ${a.name} (${a.size}) -> ${outPath}`);
        ok = true;
      } catch (err) {
        lastErr = err;
        console.error(`attempt ${attempt} failed for ${a.name}: ${String(err)}`);
        await new Promise((r) => setTimeout(r, 1200 * attempt));
      }
    }
    results.push({ name: a.name, ok, err: ok ? undefined : String(lastErr) });
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\nDone. ${results.length - failed.length}/${results.length} generated.`);
  if (failed.length) {
    console.error('FAILED:', failed.map((f) => f.name).join(', '));
    process.exitCode = 1;
  }
}

main();
