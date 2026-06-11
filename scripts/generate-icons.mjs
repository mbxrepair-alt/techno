import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../public/icons");
const logoPath = resolve(__dirname, "../public/logo.png");

// Couleur de fond échantillonnée sur le coin du logo (pour les icônes maskable).
async function getBackgroundColor() {
  try {
    const { data } = await sharp(logoPath)
      .resize(1, 1, { position: "left top" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { r: data[0], g: data[1], b: data[2] };
  } catch {
    return { r: 0, g: 0, b: 0 }; // noir par défaut (charte MBX)
  }
}

// Icône "any" : le logo redimensionné, contenu dans le carré sur le fond.
async function makeAny(size, bg) {
  const dest = resolve(outDir, `icon-${size}x${size}.png`);
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([
      {
        input: await sharp(logoPath)
          .resize(size, size, { fit: "contain", background: bg })
          .toBuffer(),
      },
    ])
    .png()
    .toFile(dest);
  console.log(`✓ ${dest}`);
}

// Icône "maskable" : logo réduit à ~78 % (zone de sécurité) centré sur le fond,
// pour qu'Android puisse le rogner (cercle/rond) sans couper le logo.
async function makeMaskable(size, bg) {
  const safe = Math.round(size * 0.78);
  const dest = resolve(outDir, `icon-${size}-maskable.png`);
  const logo = await sharp(logoPath)
    .resize(safe, safe, { fit: "contain", background: bg })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(dest);
  console.log(`✓ ${dest}`);
}

const bg = await getBackgroundColor();
console.log(`Fond maskable: rgb(${bg.r},${bg.g},${bg.b})`);

for (const size of [192, 512]) {
  await makeAny(size, bg);
  await makeMaskable(size, bg);
}
// Icône Apple (écran d'accueil iOS) : 180px, sans transparence.
await makeAny(180, bg).then(() => {});

console.log("Icônes générées depuis le logo MBX.");
