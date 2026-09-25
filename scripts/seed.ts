import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { getDb } from '../lib/db';
import { REELS } from '../lib/reels';

const PRIVATE_DIR = path.join(process.cwd(), 'private', 'reels');

function createFrameImage(
  reelId: string,
  reelTitle: string,
  year: string,
  frameNum: number,
  totalFrames: number,
  isFree: boolean
): Buffer {
  const width = 640;
  const height = 480;
  const png = new PNG({ width, height });

  // Color definitions (Sepia & Vintage Bioscope palette)
  // Background: dark warm sepia / mahogany
  const bgR = 40 + (frameNum * 3) % 15;
  const bgG = 28 + (frameNum * 2) % 10;
  const bgB = 18;

  // Frame border / brass
  const borderR = 198;
  const borderG = 156;
  const borderB = 89;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;

      // Check if sprocket hole region (left side x < 40 or right side x > 600)
      const isSprocketColumn = (x >= 8 && x <= 32) || (x >= 608 && x <= 632);
      const isSprocketHole = isSprocketColumn && ((y % 48) >= 12 && (y % 48) <= 36);

      if (isSprocketHole) {
        // Black sprocket hole
        png.data[idx] = 10;
        png.data[idx + 1] = 8;
        png.data[idx + 2] = 5;
        png.data[idx + 3] = 255;
        continue;
      }

      // Check inner view screen area (x: 50 to 590, y: 30 to 450)
      const isBorder =
        (x >= 42 && x <= 50) || (x >= 590 && x <= 598) ||
        (y >= 22 && y <= 30) || (y >= 450 && y <= 458);

      if (isBorder) {
        png.data[idx] = borderR;
        png.data[idx + 1] = borderG;
        png.data[idx + 2] = borderB;
        png.data[idx + 3] = 255;
        continue;
      }

      // Inside view area calculation
      const inViewport = x > 50 && x < 590 && y > 30 && y < 450;
      if (!inViewport) {
        // Outer dark wood/brass texture
        png.data[idx] = bgR;
        png.data[idx + 1] = bgG;
        png.data[idx + 2] = bgB;
        png.data[idx + 3] = 255;
        continue;
      }

      // Viewport sepia background + dynamic graphic patterns per frame & reel
      const dx = (x - 320) / 270;
      const dy = (y - 240) / 210;
      const distSq = dx * dx + dy * dy;
      const vignette = Math.max(0.2, 1 - distSq * 0.7);

      // Scene illustration variations based on reelId and frameNum
      let sceneBrightness = 140;

      if (reelId === 'reel-1') {
        // Calcutta Trams - horizontal motion tracks & tram silhouette
        const tramX = 150 + frameNum * 40;
        const inTram = Math.abs(x - tramX) < 60 && Math.abs(y - 260) < 50;
        const isTrack = Math.abs(y - 320) < 6;
        if (inTram) sceneBrightness = 60;
        else if (isTrack) sceneBrightness = 200;
        else sceneBrightness = 130 + Math.sin(x / 20 + frameNum) * 30;
      } else if (reelId === 'reel-2') {
        // Durga Puja - river waves & festive archway
        const wave = Math.sin(x / 30 + frameNum * 0.8) * 15;
        const isRiver = y > 280 + wave;
        const isArch = Math.abs(x - 320) < 180 && y < 200 && y > 80;
        if (isRiver) sceneBrightness = 170 + Math.cos(x / 10) * 20;
        else if (isArch) sceneBrightness = 80;
        else sceneBrightness = 120;
      } else {
        // Circus Elephant - circus tent canopy & elephant shape
        const canopy = Math.sin(x / 40) * 20 + 120;
        const isTent = y < canopy;
        const elX = 220 + frameNum * 30;
        const isElephant = Math.abs(x - elX) < 70 && Math.abs(y - 280) < 60;
        if (isTent) sceneBrightness = (Math.floor(x / 30) % 2 === 0) ? 90 : 180;
        else if (isElephant) sceneBrightness = 50;
        else sceneBrightness = 140;
      }

      // Add film grain noise
      const grain = (Math.sin(x * 12.9898 + y * 78.233 + frameNum * 43758.5453) * 43758.5453) % 1;
      const noise = (grain - 0.5) * 30;

      // Sepia tone conversion
      const finalVal = Math.min(255, Math.max(0, (sceneBrightness + noise) * vignette));
      const sepiaR = Math.min(255, Math.floor(finalVal * 1.05));
      const sepiaG = Math.min(255, Math.floor(finalVal * 0.85));
      const sepiaB = Math.min(255, Math.floor(finalVal * 0.55));

      png.data[idx] = sepiaR;
      png.data[idx + 1] = sepiaG;
      png.data[idx + 2] = sepiaB;
      png.data[idx + 3] = 255;
    }
  }

  return PNG.sync.write(png);
}

export async function seed() {
  console.log('🎞️  Seeding Bioscope database & private media frames...');

  // Initialize DB tables
  getDb();
  console.log('✅ SQLite database initialized.');

  // Create private media directories
  for (const reelId of Object.keys(REELS)) {
    const reel = REELS[reelId];
    const reelDir = path.join(PRIVATE_DIR, reelId);

    if (!fs.existsSync(reelDir)) {
      fs.mkdirSync(reelDir, { recursive: true });
    }

    for (let f = 1; f <= reel.totalFrames; f++) {
      const isFree = f === 1;
      const frameBuffer = createFrameImage(
        reelId,
        reel.title,
        reel.year,
        f,
        reel.totalFrames,
        isFree
      );
      const framePath = path.join(reelDir, `frame_${f}.png`);
      fs.writeFileSync(framePath, frameBuffer);
    }
    console.log(`✅ Private frames generated for ${reelId} (${reel.totalFrames} frames in private/reels/${reelId})`);
  }

  console.log('🎉 Seeding complete!');
}

if (require.main === module || process.argv[1]?.includes('seed.ts')) {
  seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
