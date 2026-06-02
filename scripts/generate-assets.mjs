/**
 * Generates all required Expo app store assets using Sharp.
 * Run from repo root: node scripts/generate-assets.mjs
 *
 * Requires Sharp to be installed (it is, in the server workspace):
 *   node --require ../server/node_modules/sharp scripts/generate-assets.mjs
 * Or simpler: cd server && node ../scripts/generate-assets.mjs
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load Sharp from server workspace
let sharp;
try {
  sharp = require(path.join(__dirname, '../server/node_modules/sharp'));
} catch {
  console.error('Sharp not found. Run: cd server && pnpm install');
  process.exit(1);
}

const ASSETS_DIR = path.join(__dirname, '../mobile/assets/images');
fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Brand colors
const PURPLE_DARK = { r: 76, g: 29, b: 149 };   // #4c1d95
const PURPLE_MID  = { r: 124, g: 58, b: 237 };  // #7c3aed
const WHITE       = { r: 255, g: 255, b: 255 };

/** Render an "M" letter as SVG text centered in a box */
function letterSVG(size, fontSize, color = 'white') {
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="50%" y="50%"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="${fontSize}"
        font-weight="900"
        fill="${color}"
        text-anchor="middle"
        dominant-baseline="central"
        letter-spacing="-2"
      >M</text>
    </svg>
  `);
}

async function generateIcon() {
  const size = 1024;
  await sharp({
    create: { width: size, height: size, channels: 4, background: PURPLE_MID },
  })
    .composite([{ input: letterSVG(size, 580), gravity: 'center' }])
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('✓ icon.png (1024×1024)');
}

async function generateAdaptiveIcon() {
  const size = 1024;
  // Adaptive icon: white letter on purple, with some padding
  await sharp({
    create: { width: size, height: size, channels: 4, background: PURPLE_DARK },
  })
    .composite([{ input: letterSVG(size, 520), gravity: 'center' }])
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png (1024×1024)');
}

async function generateSplash() {
  const width = 1242;
  const height = 2688; // iPhone 14 Pro Max

  // Dark purple background
  const bg = await sharp({
    create: { width, height, channels: 4, background: { r: 26, g: 10, b: 46 } },
  })
    .png()
    .toBuffer();

  // Centered logo mark (300×300) + wordmark
  const logoMark = await sharp({
    create: { width: 300, height: 300, channels: 4, background: { ...PURPLE_MID, alpha: 0.15 } },
  })
    .composite([{ input: letterSVG(300, 180), gravity: 'center' }])
    .png()
    .toBuffer();

  const wordmark = Buffer.from(`
    <svg width="300" height="80" xmlns="http://www.w3.org/2000/svg">
      <text
        x="150" y="55"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="56"
        font-weight="900"
        fill="white"
        text-anchor="middle"
        letter-spacing="-2"
        opacity="0.95"
      >Manter</text>
    </svg>
  `);

  await sharp(bg)
    .composite([
      { input: logoMark, left: Math.round((width - 300) / 2), top: Math.round(height / 2) - 220 },
      { input: wordmark, left: Math.round((width - 300) / 2), top: Math.round(height / 2) - 40 },
    ])
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash.png'));
  console.log('✓ splash.png (1242×2688)');
}

async function generateNotificationIcon() {
  const size = 96;
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: letterSVG(size, 64, '#7c3aed'), gravity: 'center' }])
    .png()
    .toFile(path.join(ASSETS_DIR, 'notification-icon.png'));
  console.log('✓ notification-icon.png (96×96)');
}

async function generateFavicon() {
  const size = 48;
  await sharp({
    create: { width: size, height: size, channels: 4, background: PURPLE_MID },
  })
    .composite([{ input: letterSVG(size, 28), gravity: 'center' }])
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('✓ favicon.png (48×48)');
}

console.log('Generating Manter app assets...\n');
await Promise.all([
  generateIcon(),
  generateAdaptiveIcon(),
  generateSplash(),
  generateNotificationIcon(),
  generateFavicon(),
]);
console.log('\nAll assets generated in mobile/assets/images/');
