/**
 * M3 W4 "NOIR PIXEL" — asset generation for the Dead Drop art pass.
 *
 * Generates 9 pixel-art assets with a LOCKED style suffix so the whole set
 * reads as one game, then saves raw renders to assets-raw/ for the PIL
 * post-processor (m3_w4_pixelate.py) which forces the chunky pixel grid.
 *
 * Run: bun scripts/m3_w4_gen_assets.mjs
 */
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT_DIR = '/home/z/my-project/assets-raw';
fs.mkdirSync(OUT_DIR, { recursive: true });

// Locked art direction — every prompt ends with this.
const STYLE =
  '16-bit pixel art, retro adventure game asset, dark film-noir palette: deep ink navy #0d1321, ' +
  'midnight blue #1b2438, warm amber #e8a33d, blood red #a62f2f, cream paper #e8ddc7, muted teal #3d7068. ' +
  'Crisp chunky pixels, subtle dithering, high contrast, moody cinematic lighting, ' +
  'no text, no words, no letters, no watermark, no border';

const ASSETS = [
  {
    name: 'title-city',
    size: '1440x704',
    prompt:
      'Wide establishing shot of a rainy noir megacity at night viewed across rooftops, silhouette skyscrapers with sparse amber lit windows, one tall clock tower, red neon signs glowing through drizzle, wet streets reflecting light below, low clouds',
  },
  {
    name: 'portrait-detective',
    size: '1024x1024',
    prompt:
      'Centered bust portrait of a hard-boiled detective in a beige trench coat and dark fedora, tired sharp eyes, thin cigarette smoke curling upward, strong amber rim light on one side of the face, deep navy shadow background, square composition',
  },
  {
    name: 'portrait-courier',
    size: '1024x1024',
    prompt:
      'Centered bust portrait of a mysterious courier fugitive, face half hidden in shadow under a dark hood, leather satchel strap across the chest, thin blood-red neon rim light on the silhouette edge, deep navy shadow background, square composition',
  },
  {
    name: 'lineup',
    size: '1344x768',
    prompt:
      'Police lineup of four shady criminal suspects standing shoulder to shoulder against a wall with painted height measurement lines, harsh interrogation flash from the front, each suspect in different coat hat and posture, wide composition',
  },
  {
    name: 'verdict-capture',
    size: '1024x1024',
    prompt:
      'Dramatic scene of a suspect being handcuffed against a brick wall in a dark alley, single harsh spotlight from above, faint red and blue police light glow bouncing off wet cobblestones, rain drizzle',
  },
  {
    name: 'verdict-escape',
    size: '1024x1024',
    prompt:
      'Lone hooded figure with a satchel walking away into thick fog through an open iron railway gate at dawn, distant train tail lights dissolving in mist, empty wet platform, cold teal and amber dawn light',
  },
  {
    name: 'verdict-expiry',
    size: '1024x1024',
    prompt:
      'Empty deserted city street at first light of dawn, a single paper folder blowing across the cobblestones in the wind, cold pale morning light, long shadows, clock tower face faintly glowing in the background mist',
  },
  {
    name: 'cork',
    size: '1024x1024',
    prompt:
      'Perfectly seamless tileable cork notice board texture, warm mid-brown pressed cork with small darker speckles and fine fiber flecks evenly distributed, completely flat even lighting, straight top-down view, no objects, no pins',
  },
  {
    name: 'paper',
    size: '1024x1024',
    prompt:
      'Perfectly seamless tileable aged manila folder paper texture, cream beige with subtle horizontal fibers and one faint brown coffee stain ring, completely flat even lighting, straight top-down view, no objects, no text',
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
