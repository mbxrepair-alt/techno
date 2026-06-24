// Corrige le bug "OPPO OPPO Find X7", "Xiaomi Xiaomi 15", etc. : le champ `model` dans
// lib/devices-catalog.ts contenait déjà la marque, et deviceFullName() la rajoutait,
// d'où la duplication visible dans toute l'app (autocomplete, tarifs, tickets...).
//
// 1. Réécrit lib/devices-catalog.ts pour retirer le préfixe de marque redondant dans `model`.
// 2. Migre les valeurs existantes en base (panne_prices.device_model, repairs.device) vers le
//    nouveau nom complet, pour qu'elles continuent à correspondre au catalogue corrigé.
//
// Usage :
//   node dev/fix-duplicated-brand-models.mjs            -> aperçu (dry-run, rien n'est écrit)
//   node dev/fix-duplicated-brand-models.mjs --apply     -> applique réellement (fichier + DB)

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");

const envPath = join(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const catalogPath = join(__dirname, "..", "lib", "devices-catalog.ts");
const catalogSrc = readFileSync(catalogPath, "utf-8");

const lineRe = /\{\s*brand:\s*"([^"]+)",\s*model:\s*"([^"]+)",\s*family:\s*"([^"]+)",\s*sku:\s*"([^"]+)"\s*\}/g;

const fullName = (brand, model, sku) => (sku ? `${brand} ${model} ${sku}` : `${brand} ${model}`);

const mapping = []; // { oldName, newName }
let newCatalogSrc = catalogSrc.replace(lineRe, (whole, brand, model, family, sku) => {
  if (!model.startsWith(brand + " ")) return whole;
  const newModel = model.slice(brand.length + 1);
  const oldName = fullName(brand, model, sku);
  const newName = fullName(brand, newModel, sku);
  mapping.push({ oldName, newName });
  return whole.replace(`model: "${model}"`, `model: "${newModel}"`);
});

console.log(APPLY ? "Mode: APPLICATION RÉELLE" : "Mode: APERÇU (dry-run, rien n'est écrit)");
console.log(`${mapping.length} modèle(s) à corriger dans le catalogue.\n`);
for (const { oldName, newName } of mapping.slice(0, 10)) {
  console.log(`  "${oldName}"  ->  "${newName}"`);
}
if (mapping.length > 10) console.log(`  ... et ${mapping.length - 10} autres.`);

async function migrateTable(table, column) {
  let updated = 0;
  for (const { oldName, newName } of mapping) {
    const { data, error } = await supabase.from(table).update({ [column]: newName }).eq(column, oldName).select("id");
    if (error) { console.error(`Erreur ${table}.${column} pour "${oldName}":`, error.message); continue; }
    updated += data?.length || 0;
  }
  return updated;
}

async function main() {
  if (!APPLY) {
    console.log("\nAucune écriture effectuée (dry-run). Relancez avec --apply pour appliquer réellement.");
    return;
  }

  writeFileSync(catalogPath, newCatalogSrc, "utf-8");
  console.log("\n✅ lib/devices-catalog.ts mis à jour.");

  const panneUpdated = await migrateTable("panne_prices", "device_model");
  console.log(`✅ panne_prices.device_model : ${panneUpdated} ligne(s) migrée(s).`);

  const repairsUpdated = await migrateTable("repairs", "device");
  console.log(`✅ repairs.device : ${repairsUpdated} ligne(s) migrée(s).`);
}

main().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
