#!/usr/bin/env node
// Génère les visuels publicitaires Alpha Import Exchange (un par secteur d'activité).
// Visuels 100 % originaux (aucune marque ni personne réelle). Sortie : public/ads/sectors/<id>-{preroll,banner}.jpg
// Usage : node scripts/generate-ad-creatives.mjs   (Playwright + Chromium requis)
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/ads/sectors');
const LEGAL = 'A.Onoseke House Investment RDC · RCCM CD/KNM/RCCM/21-A-01949 · Kinshasa';

const G = '#c9a84c', G2 = '#e8d08a', G3 = '#8a6f2a', INK = '#0d0a04', CREAM = '#f3ead2';

const globe = (cx, cy, r) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#orb)" stroke="${G}" stroke-width="2"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.45}" ry="${r}" fill="none" stroke="${G3}" stroke-width="1.5"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.8}" ry="${r}" fill="none" stroke="${G3}" stroke-width="1.2"/>
  <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${G3}" stroke-width="1.2"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.35}" fill="none" stroke="${G3}" stroke-width="1.2"/>
  <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${G3}" stroke-width="1.2"/>`;

const pin = (x, y, s = 1, c = G2) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 C-14 -22 -14 -40 0 -40 C14 -40 14 -22 0 0Z" fill="${c}" stroke="${INK}" stroke-width="2"/><circle cx="0" cy="-27" r="5" fill="${INK}"/></g>`;

const containers = (x, y, cols, rows, w = 46, h = 26) => {
  const pal = [G, G2, G3, '#b48a2e', '#d8b960'];
  let s = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    s += `<rect x="${x + c * (w + 3)}" y="${y - (r + 1) * (h + 3)}" width="${w}" height="${h}" rx="2" fill="${pal[(c * 3 + r * 2) % pal.length]}" stroke="${INK}" stroke-width="1.5"/>`;
    for (let k = 1; k < 4; k++) s += `<line x1="${x + c * (w + 3) + k * w / 4}" y1="${y - (r + 1) * (h + 3) + 4}" x2="${x + c * (w + 3) + k * w / 4}" y2="${y - (r + 1) * (h + 3) + h - 4}" stroke="${INK}" stroke-opacity=".35" stroke-width="1.5"/>`;
  }
  return s;
};

const waves = (y, color, amp = 10) => `<path d="M0 ${y} q40 ${-amp} 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 V600 H0Z" fill="${color}"/>`;

const SCENES = {
  sourcing: () => `${globe(300, 300, 190)}
    ${[[210, 215], [255, 190], [330, 205], [385, 240], [415, 300]].map(([x, y]) => pin(x, y, 0.8)).join('')}
    <circle cx="288" cy="352" r="9" fill="${CREAM}" stroke="${INK}" stroke-width="2"/>
    ${[[210, 215], [255, 190], [330, 205], [385, 240], [415, 300]].map(([x, y]) => `<path d="M${x} ${y - 14} Q${(x + 288) / 2} ${Math.min(y, 352) - 90} 288 352" fill="none" stroke="${CREAM}" stroke-width="2" stroke-dasharray="6 7" opacity=".85"/>`).join('')}`,
  maritime: () => `<circle cx="450" cy="150" r="70" fill="${G}" opacity=".18"/><circle cx="450" cy="150" r="42" fill="${G2}" opacity=".5"/>
    ${containers(150, 360, 6, 3)}
    <path d="M90 360 H500 L470 430 H130Z" fill="${CREAM}" stroke="${INK}" stroke-width="2"/>
    <rect x="460" y="250" width="40" height="110" fill="${G3}" stroke="${INK}" stroke-width="2"/><rect x="468" y="262" width="24" height="14" fill="${INK}" opacity=".6"/>
    <defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${G3}" stop-opacity=".95"/><stop offset="1" stop-color="${G3}" stop-opacity="0"/></linearGradient>
    <linearGradient id="fx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset=".12" stop-color="#fff"/><stop offset=".88" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="mx"><rect width="600" height="600" fill="url(#fx)"/></mask></defs>
    <g mask="url(#mx)">${waves(420, 'url(#sea)', 12).replace('V600', 'V560')}${waves(452, 'url(#sea)', 14).replace('V600', 'V560').replace('fill="url(#sea)"', 'fill="url(#sea)" opacity=".55"')}</g>`,
  aerien: () => `<path d="M60 430 Q300 120 540 330" fill="none" stroke="${G3}" stroke-width="2.5" stroke-dasharray="4 10"/>
    ${globe(300, 470, 120).replace(/stroke-width/g, 'stroke-opacity=".6" stroke-width')}
    <g transform="translate(300 215) rotate(-12)"><path d="M-130 0 L-20 -16 L-40 -85 L-14 -85 L50 -18 L120 -26 Q150 -22 150 0 Q150 22 120 26 L50 18 L-14 85 L-40 85 L-20 16 Z" fill="${CREAM}" stroke="${INK}" stroke-width="3"/><path d="M-130 0 L-95 -9 L-95 9Z" fill="${G}"/><circle cx="110" cy="0" r="4" fill="${INK}"/></g>
    <ellipse cx="120" cy="150" rx="55" ry="16" fill="${CREAM}" opacity=".12"/><ellipse cx="470" cy="120" rx="70" ry="18" fill="${CREAM}" opacity=".12"/>`,
  douane: () => `<rect x="120" y="110" width="270" height="360" rx="14" fill="${CREAM}" stroke="${INK}" stroke-width="3"/>
    ${[160, 195, 230, 265, 300].map((y, i) => `<rect x="150" y="${y}" width="${i % 2 ? 150 : 210}" height="10" rx="5" fill="${G3}" opacity=".6"/>`).join('')}
    <rect x="150" y="150" width="90" height="14" rx="4" fill="${INK}"/>
    <circle cx="370" cy="410" r="82" fill="none" stroke="${G}" stroke-width="7"/><circle cx="370" cy="410" r="64" fill="${G}" opacity=".18" stroke="${G}" stroke-width="2"/>
    <path d="M335 412 l26 28 l50 -62" fill="none" stroke="${G}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="410" y="170" width="120" height="14" fill="${G3}"/><rect x="520" y="140" width="14" height="330" fill="${G3}"/><path d="M410 185 H520 V200 H410Z" fill="repeating-linear-gradient(90deg,${G},${INK})" opacity=".0"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${415 + i * 22}" y="170" width="11" height="14" fill="${i % 2 ? CREAM : G}"/>`).join('')}`,
  qualite: () => `<g transform="translate(300 330)"><path d="M0 -150 L135 -75 V75 L0 150 L-135 75 V-75Z" fill="${G}" stroke="${INK}" stroke-width="3"/><path d="M0 -150 L135 -75 L0 0 L-135 -75Z" fill="${G2}" stroke="${INK}" stroke-width="3"/><path d="M0 0 V150" stroke="${INK}" stroke-width="3"/><path d="M-50 -105 L85 -30" stroke="${INK}" stroke-opacity=".4" stroke-width="12"/></g>
    <circle cx="380" cy="250" r="90" fill="${INK}" fill-opacity=".55" stroke="${CREAM}" stroke-width="12"/><line x1="445" y1="315" x2="520" y2="390" stroke="${CREAM}" stroke-width="22" stroke-linecap="round"/>
    <path d="M338 252 l30 32 l52 -66" fill="none" stroke="${G2}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`,
  securise: () => `<path d="M300 60 L480 128 V292 Q480 418 300 540 Q120 418 120 292 V128Z" fill="url(#orb)" stroke="${G}" stroke-width="6"/>
    <g transform="translate(300 178)"><circle r="50" fill="none" stroke="${G3}" stroke-width="18"/><circle r="50" fill="none" stroke="${G2}" stroke-width="18" stroke-dasharray="${2 * Math.PI * 50 * 0.6} 999" transform="rotate(-90)"/><text y="9" text-anchor="middle" font-family="Unbounded,sans-serif" font-weight="900" font-size="17" fill="${CREAM}">60/40</text></g>
    <g transform="translate(0 70)"><rect x="240" y="270" width="120" height="96" rx="12" fill="${G}" stroke="${INK}" stroke-width="3"/><path d="M262 270 v-30 a38 38 0 0 1 76 0 v30" fill="none" stroke="${G}" stroke-width="14"/><circle cx="300" cy="312" r="11" fill="${INK}"/><rect x="295" y="316" width="10" height="26" rx="4" fill="${INK}"/></g>`,
  financement: () => `${[0, 1, 2, 3, 4].map(i => `<rect x="${110 + i * 78}" y="${440 - (i + 1) * 62}" width="52" height="${(i + 1) * 62}" rx="6" fill="${i === 4 ? G2 : G}" stroke="${INK}" stroke-width="2.5" opacity="${0.55 + i * 0.11}"/>`).join('')}
    <path d="M100 360 L230 290 L310 320 L430 190 L520 140" fill="none" stroke="${CREAM}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M498 124 L535 132 L522 168Z" fill="${CREAM}"/>
    ${[0, 1, 2].map(i => `<ellipse cx="${130 + i * 6}" cy="${500 - i * 18}" rx="42" ry="13" fill="${G}" stroke="${INK}" stroke-width="2.5"/>`).join('')}<line x1="80" y1="446" x2="540" y2="446" stroke="${G3}" stroke-width="3"/>`,
  conseil: () => `<rect x="110" y="140" width="300" height="380" rx="14" fill="${CREAM}" stroke="${INK}" stroke-width="3" transform="rotate(-5 260 330)"/>
    <rect x="190" y="110" width="300" height="380" rx="14" fill="${G2}" stroke="${INK}" stroke-width="3" transform="rotate(5 340 300)"/>
    ${[0, 1, 2, 3].map(i => `<g transform="translate(225 ${190 + i * 66}) rotate(5)"><rect width="26" height="26" rx="6" fill="none" stroke="${INK}" stroke-width="4"/><path d="M5 13 l7 7 l12 -16" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><rect x="42" y="6" width="${150 - i * 22}" height="12" rx="6" fill="${INK}" opacity=".55"/></g>`).join('')}
    <g transform="translate(470 470)"><circle r="62" fill="${INK}" stroke="${G}" stroke-width="8"/><path d="M0 -44 L11 0 L0 44 L-11 0Z" fill="${G}"/><circle r="6" fill="${CREAM}"/></g>`,
};

const SECTORS = [
  { id: 'sourcing', scene: SCENES.sourcing, eyebrow: 'SOURCING & ACHATS', title: 'Achetez directement à la source', sub: 'Fournisseurs vérifiés en Chine, Turquie, Dubaï, Japon et Thaïlande.', cta: 'Demander un devis' },
  { id: 'maritime', scene: SCENES.maritime, eyebrow: 'FRET MARITIME', title: "Vos conteneurs, de l'Asie à Kinshasa", sub: "Un suivi complet, de l'embarquement à la livraison.", cta: 'Voir le circuit' },
  { id: 'aerien', scene: SCENES.aerien, eyebrow: 'FRET AÉRIEN', title: 'Urgent ? Livré par avion', sub: 'Des délais maîtrisés pour vos marchandises sensibles.', cta: 'Demander un devis' },
  { id: 'douane', scene: SCENES.douane, eyebrow: 'DÉDOUANEMENT KINSHASA', title: 'La douane sans casse-tête', sub: 'Commissionnaires agréés, dossier complet, circuit maîtrisé.', cta: 'Comment ça marche' },
  { id: 'qualite', scene: SCENES.qualite, eyebrow: 'CONTRÔLE QUALITÉ', title: 'Vérifié avant de partir', sub: "Inspection avant expédition et rapport photo.", cta: 'En savoir plus' },
  { id: 'securise', scene: SCENES.securise, eyebrow: 'PAIEMENT SÉCURISÉ 60/40', title: "Ne payez le solde qu'à réception", sub: '60 % sur compte séquestre, 40 % à la livraison conforme.', cta: 'Comment ça marche' },
  { id: 'financement', scene: SCENES.financement, eyebrow: 'FINANCEMENT TRADE', title: 'Financez vos achats à l’international', sub: 'Préfinancement, crédit documentaire, assurance-crédit.', cta: 'Nous contacter' },
  { id: 'conseil', scene: SCENES.conseil, eyebrow: 'CONSEIL & ACCOMPAGNEMENT', title: 'Un dossier d’import solide', sub: 'Étude de faisabilité, fiscalité et douane.', cta: 'Parler à un conseiller' },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function html(s, fmt) {
  const banner = fmt === 'banner';
  const W = banner ? 900 : 1280, H = banner ? 300 : 720;
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Figtree:wght@500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:${INK};font-family:'Figtree',system-ui,sans-serif;color:${CREAM};position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(900px 600px at 85% 40%,#3a2a05 0%,transparent 60%),linear-gradient(135deg,#0d0a04 0%,#1a1206 55%,#2a1e00 100%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(201,168,76,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.06) 1px,transparent 1px);background-size:${banner ? 30 : 48}px ${banner ? 30 : 48}px}
.bar{position:absolute;left:0;top:0;bottom:0;width:${banner ? 6 : 10}px;background:linear-gradient(${G},${G3})}
.scene{position:absolute;right:${banner ? 10 : 20}px;top:50%;transform:translateY(-50%);height:${banner ? 280 : 680}px;width:${banner ? 280 : 680}px}
.txt{position:absolute;left:${banner ? 34 : 80}px;top:0;bottom:0;width:${banner ? 560 : 660}px;display:flex;flex-direction:column;justify-content:center}
.eyebrow{font-family:'Unbounded';font-weight:700;letter-spacing:.14em;color:${G};font-size:${banner ? 11 : 17}px;margin-bottom:${banner ? 8 : 18}px}
h1{font-family:'Unbounded';font-weight:900;line-height:1.12;font-size:${banner ? 28 : 52}px;color:#fff;margin-bottom:${banner ? 8 : 18}px}
p{font-weight:500;color:${CREAM};opacity:.9;line-height:1.35;font-size:${banner ? 15 : 24}px;max-width:${banner ? 480 : 560}px}
.cta{display:inline-flex;align-self:flex-start;margin-top:${banner ? 12 : 30}px;padding:${banner ? '8px 16px' : '15px 30px'};border-radius:999px;background:linear-gradient(${G2},${G});color:${INK};font-weight:700;font-size:${banner ? 14 : 22}px}
.legal{position:absolute;left:${banner ? 34 : 80}px;bottom:${banner ? 10 : 26}px;font-size:${banner ? 9 : 13}px;color:${CREAM};opacity:.55;letter-spacing:.02em}
.brand{position:absolute;right:${banner ? 14 : 34}px;top:${banner ? 10 : 28}px;font-family:'Unbounded';font-weight:700;font-size:${banner ? 9 : 14}px;letter-spacing:.16em;color:${G}}
</style></head><body>
<div class="bg"></div><div class="grid"></div><div class="bar"></div>
<svg class="scene" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg"><defs>
<radialGradient id="orb" cx="38%" cy="35%" r="70%"><stop offset="0%" stop-color="#3a2a05"/><stop offset="100%" stop-color="#0d0900"/></radialGradient></defs>
${s.scene()}</svg>
<div class="brand">ALPHA IMPORT EXCHANGE</div>
<div class="txt"><div class="eyebrow">${esc(s.eyebrow)}</div><h1>${esc(s.title)}</h1><p>${esc(s.sub)}</p><span class="cta">${esc(s.cta)} →</span></div>
<div class="legal">${esc(LEGAL)}</div></body></html>`;
}

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined, args: ['--ignore-certificate-errors'] });
for (const s of SECTORS) {
  for (const fmt of ['preroll', 'banner']) {
    const [w, h] = fmt === 'banner' ? [900, 300] : [1280, 720];
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(html(s, fmt), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(outDir, `${s.id}-${fmt}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
    await page.close();
    console.log('✓', path.relative(root, file));
  }
}
await browser.close();
await fs.writeFile(path.join(outDir, 'sectors.json'), JSON.stringify(SECTORS, null, 2) + '\n');
