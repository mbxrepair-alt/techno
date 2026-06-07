import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../public/icons");

async function makeIcon(size) {
  const fontSize = Math.round(size * 0.55);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#f97316"/>
      <text
        x="50%" y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        fill="white"
      >M</text>
    </svg>`
  );

  const dest = resolve(outDir, `icon-${size}x${size}.png`);
  await sharp(svg).png().toFile(dest);
  console.log(`✓ ${dest}`);
}

await makeIcon(192);
await makeIcon(512);
console.log("Icons generated.");
