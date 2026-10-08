#!/usr/bin/env node
// Génère les icônes PWA / Android à partir de public/favicon.svg (vectoriel => rendu net à toute taille).
// Usage : node scripts/generate-icons.mjs   (nécessite Playwright + Chromium)
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = await fs.readFile(path.join(root, 'public/favicon.svg'), 'utf8');
const BG = '#0d0a04';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});

async function render(file, w, h, logoScale, background) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const size = Math.round(Math.min(w, h) * logoScale);
  await page.setContent(
    `<body style="margin:0;background:${background};display:flex;align-items:center;justify-content:center;width:${w}px;height:${h}px">` +
      `<div style="width:${size}px;height:${size}px">${svg.replace(/width="100" height="100"/, 'width="100%" height="100%"')}</div></body>`,
  );
  await page.screenshot({ path: path.join(root, 'public/icons', file), omitBackground: background === 'transparent' });
  await page.close();
  console.log('✓', file, `${w}x${h}`);
}

await render('icon-192.png', 192, 192, 1, BG);
await render('icon-512.png', 512, 512, 1, BG);
await render('icon-maskable-512.png', 512, 512, 0.7, BG); // zone de sécurité 80 %
await render('apple-touch-icon.png', 180, 180, 1, BG);
await render('tv-banner-640x360.png', 640, 360, 0.8, BG); // bannière Android TV / Fire TV (16:9)
await render('adaptive-foreground-1024.png', 1024, 1024, 0.62, 'transparent');
await browser.close();
