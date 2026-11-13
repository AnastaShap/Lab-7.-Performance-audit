// Генерує зменшені WebP-версії зображень з оригінальних PNG (assets-src/)
// у public/, звідки їх віддає Vite. Запуск: npm run images
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const PHOTO_WIDTHS = [400, 800]; // картка ~250–350 px, 800 — для екранів 2x
const HERO_WIDTHS = [960, 1600, 2400];

async function convert(input, outDir, widths) {
  await mkdir(outDir, { recursive: true });
  const { name } = path.parse(input);
  for (const width of widths) {
    const output = path.join(outDir, `${name}-${width}.webp`);
    await sharp(input).resize({ width }).webp({ quality: 75 }).toFile(output);
    console.log(output);
  }
}

const photos = (await readdir('assets-src/photos')).filter((f) => f.endsWith('.png'));
for (const file of photos) {
  await convert(path.join('assets-src/photos', file), 'public/photos', PHOTO_WIDTHS);
}
await convert('assets-src/hero.png', 'public/images', HERO_WIDTHS);
