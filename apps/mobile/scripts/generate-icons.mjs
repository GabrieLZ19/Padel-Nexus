import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "assets/images");

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const CHARTREUSE = { r: 203, g: 254, b: 1, alpha: 1 };

/** Solo la marca negra "pa" — sin el cuadrado verde del SVG original. */
const MARK_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122 129">
  <path fill="#000000" d="M80.84,57.37v1.5c-2-1.4-4.58-2.24-7.73-2.18-5.01.09-6.04,2.24-9.56,4.47-4.74,3-7.19-2.12-11.12-3.58-3.04-1.13-6.37-1.11-9.3.1-1.43.53-2.69,1.27-3.78,2.24v-2.48h-6.05v31.89h6.1v-10.1c1.24,1.11,2.77,1.89,4.45,2.4.05.02.1.05.15.07,3.42,1.03,7.08.64,10.36-1.22,3.11-1.76,4.31-4.92,8.62-2.93,3.14,1.45,4.02,4.17,8.64,4.63,3.84.38,6.92-.46,9.22-2.04v1.27h5.4v-24.06h-5.4ZM59.11,71.48c-5.58.66-7.25,6.58-13.3,4.96-.57-.15-1.25-.42-1.92-.75-1.22-.71-2.9-1.94-3.54-2.97-.71-1.14-.9-1.71-.9-3.13s.36-2.69,1.07-3.83c.71-1.14,1.68-2.03,2.9-2.68.71-.49,1.77-.73,2.82-.82,7.22-.64,8.15,7.16,16.97,5.08,3.91-.92,5.81-4.59,9.13-4.89,10.22-.92,10.91,13.19,1.99,14.22-5.89.68-7.43-6.11-15.24-5.19Z"/>
</svg>`;

/** Notificación Android: marca blanca sobre transparente. */
const NOTIFICATION_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122 129">
  <path fill="#FFFFFF" d="M80.84,57.37v1.5c-2-1.4-4.58-2.24-7.73-2.18-5.01.09-6.04,2.24-9.56,4.47-4.74,3-7.19-2.12-11.12-3.58-3.04-1.13-6.37-1.11-9.3.1-1.43.53-2.69,1.27-3.78,2.24v-2.48h-6.05v31.89h6.1v-10.1c1.24,1.11,2.77,1.89,4.45,2.4.05.02.1.05.15.07,3.42,1.03,7.08.64,10.36-1.22,3.11-1.76,4.31-4.92,8.62-2.93,3.14,1.45,4.02,4.17,8.64,4.63,3.84.38,6.92-.46,9.22-2.04v1.27h5.4v-24.06h-5.4ZM59.11,71.48c-5.58.66-7.25,6.58-13.3,4.96-.57-.15-1.25-.42-1.92-.75-1.22-.71-2.9-1.94-3.54-2.97-.71-1.14-.9-1.71-.9-3.13s.36-2.69,1.07-3.83c.71-1.14,1.68-2.03,2.9-2.68.71-.49,1.77-.73,2.82-.82,7.22-.64,8.15,7.16,16.97,5.08,3.91-.92,5.81-4.59,9.13-4.89,10.22-.92,10.91,13.19,1.99,14.22-5.89.68-7.43-6.11-15.24-5.19Z"/>
</svg>`;

async function renderMark(size, fillSvg = MARK_SVG) {
  return sharp(Buffer.from(fillSvg), { density: 300 })
    .resize(size, size, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();
}

/** Icono full-bleed: fondo chartreuse + marca negra centrada (sin padding negro). */
async function renderAppIcon(size, markRatio = 0.58) {
  const mark = await renderMark(Math.round(size * markRatio));
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: CHARTREUSE,
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

/**
 * Adaptive foreground: solo la marca sobre transparente.
 * Android pinta el backgroundColor (#CBFE01) detrás y enmascara.
 * markRatio ~0.55 deja margen en la safe zone del adaptive icon.
 */
async function renderAdaptiveForeground(size, markRatio = 0.55) {
  const markSize = Math.round(size * markRatio);
  const mark = await renderMark(markSize);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const icon = await renderAppIcon(1024, 0.58);
  const adaptive = await renderAdaptiveForeground(1024, 0.55);
  const splash = await renderAppIcon(512, 0.5);
  const favicon = await renderAppIcon(48, 0.62);
  const notification = await renderMark(96, NOTIFICATION_SVG);

  await writeFile(path.join(outDir, "icon.png"), icon);
  await writeFile(path.join(outDir, "adaptive-icon.png"), adaptive);
  await writeFile(path.join(outDir, "splash-icon.png"), splash);
  await writeFile(path.join(outDir, "favicon.png"), favicon);
  await writeFile(path.join(outDir, "notification-icon.png"), notification);

  console.log("Iconos regenerados (fondo chartreuse, sin padding negro) en", outDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
