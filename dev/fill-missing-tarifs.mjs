// Script ponctuel : pour chaque modèle déjà présent dans panne_prices, complète les pannes
// du catalogue (standard + perso de l'atelier) qui n'ont pas encore de tarif, avec un prix
// par défaut entre 30€ et 120€ (à ajuster ensuite manuellement dans la page /tarifs).
//
// Usage :
//   node dev/fill-missing-tarifs.mjs            -> aperçu (dry-run, n'écrit rien)
//   node dev/fill-missing-tarifs.mjs --apply     -> applique réellement les insertions

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Charge .env.local manuellement (pas de dépendance dotenv nécessaire)
const envPath = join(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Variables SUPABASE manquantes dans .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const APPLY = process.argv.includes("--apply");

// Catalogue standard (copie de lib/devices-catalog.ts -> ISSUE_CATEGORIES)
const ISSUE_CATEGORIES = [
  { id: "affichage", issues: ["Changement d'écran", "Trappe d'affichage (connecteur)", "Circuit d'affichage (microsoudure)"] },
  { id: "tactile", issues: ["Changement de vitre tactile", "Connecteur tactile (nappe)", "Circuit tactile (microsoudure)"] },
  { id: "charge", issues: ["Nettoyage port de charge", "Connecteur de charge", "Batterie", "Circuit de charge (microsoudure)"] },
  { id: "audio", issues: ["Haut-parleur", "Micro", "Circuit audio (microsoudure)"] },
  { id: "camera", issues: ["Caméra avant", "Caméra arrière", "Circuit caméra (microsoudure)"] },
  { id: "reseau", issues: ["Carte SIM", "Antennes réseau", "Circuit modem / baseband (microsoudure)"] },
  { id: "eau", issues: ["Désoxydation + bain à ultrasons", "Recherche court-circuit (caméra thermique)", "Récupération de données"] },
  { id: "boutons", issues: ["Bouton power", "Boutons volume", "Châssis / cadre", "Vitre arrière"] },
  { id: "logiciel", issues: ["Mise à jour et restauration", "Flash", "Déverrouillage Gmail / FRP"] },
  { id: "carte_mere", issues: ["Ne s'allume pas (carte mère)", "Extinction intempestive (carte mère)", "Court-circuit (carte mère)", "Oxydation (carte mère)"] },
];

const SCREEN_QUALITIES = [
  "Ecran Tactile Original Apple (Service Pack)",
  "Ecran Tactile Original Pulled",
  "Ecran Tactile Soft Oled",
  "Ecran Tactile Hard Oled",
  "Ecran Tactile Incell FHD",
];

// Étend "Changement d'écran" en ses variantes de qualité réellement stockées en base
function expandIssue(issueLabel) {
  if (issueLabel === "Changement d'écran") {
    return SCREEN_QUALITIES.map((q) => `Changement d'écran - ${q}`);
  }
  return [issueLabel];
}

function randomPrice() {
  const min = Math.round((30 + Math.random() * 70) / 5) * 5; // 30-100, multiple de 5
  const max = Math.min(120, min + Math.round((10 + Math.random() * 10) / 5) * 5); // +10 à +20, plafonné à 120
  return { price_min: min, price_max: max };
}

async function main() {
  console.log(APPLY ? "Mode: APPLICATION RÉELLE" : "Mode: APERÇU (dry-run, rien n'est écrit)");

  const { data: allRows, error: rowsErr } = await supabase.from("panne_prices").select("*");
  if (rowsErr) throw rowsErr;

  // Regroupe par company_id -> device_model -> Set(issue_label déjà tarifés)
  const byCompany = new Map();
  for (const r of allRows) {
    if (!byCompany.has(r.company_id)) byCompany.set(r.company_id, new Map());
    const byModel = byCompany.get(r.company_id);
    if (!byModel.has(r.device_model)) byModel.set(r.device_model, new Set());
    byModel.get(r.device_model).add(r.issue_label);
  }

  let totalToInsert = [];

  for (const [companyId, byModel] of byCompany.entries()) {
    const [{ data: customCats }, { data: customIssues }, { data: hidden }] = await Promise.all([
      supabase.from("custom_panne_categories").select("*").eq("company_id", companyId),
      supabase.from("custom_panne_issues").select("*").eq("company_id", companyId),
      supabase.from("hidden_panne_items").select("*").eq("company_id", companyId),
    ]);

    const isCategoryHidden = (catId) => (hidden || []).some((h) => h.category_id === catId && h.issue_label === null);
    const isIssueHidden = (catId, issueLabel) => (hidden || []).some((h) => h.category_id === catId && h.issue_label === issueLabel);

    // Construit la liste complète des libellés de pannes (standard non masqués + perso), pannes déjà expansées
    let fullIssueList = [];
    for (const cat of ISSUE_CATEGORIES) {
      if (isCategoryHidden(cat.id)) continue;
      for (const issue of cat.issues) {
        if (isIssueHidden(cat.id, issue)) continue;
        fullIssueList.push(...expandIssue(issue));
      }
    }
    for (const cc of customCats || []) {
      const catId = `custom_${cc.id}`;
      if (isCategoryHidden(catId)) continue;
      const issuesForCat = (customIssues || []).filter((i) => i.category_id === catId).map((i) => i.issue_label);
      fullIssueList.push(...issuesForCat);
    }
    fullIssueList = Array.from(new Set(fullIssueList));

    for (const [deviceModel, pricedSet] of byModel.entries()) {
      const missing = fullIssueList.filter((issue) => !pricedSet.has(issue));
      for (const issueLabel of missing) {
        const { price_min, price_max } = randomPrice();
        totalToInsert.push({ company_id: companyId, device_model: deviceModel, issue_label: issueLabel, price_min, price_max });
      }
    }
  }

  console.log(`\n${totalToInsert.length} tarif(s) manquant(s) à créer, répartis sur ${byCompany.size} compte(s) atelier.`);
  const byModelCount = new Map();
  for (const row of totalToInsert) {
    byModelCount.set(row.device_model, (byModelCount.get(row.device_model) || 0) + 1);
  }
  for (const [model, count] of byModelCount.entries()) {
    console.log(`  - ${model} : ${count} panne(s) à ajouter`);
  }

  if (!APPLY) {
    console.log("\nAucune écriture effectuée (dry-run). Relancez avec --apply pour insérer réellement ces tarifs.");
    return;
  }

  // Insertion par lots de 500
  for (let i = 0; i < totalToInsert.length; i += 500) {
    const batch = totalToInsert.slice(i, i + 500);
    const { error } = await supabase
      .from("panne_prices")
      .upsert(batch, { onConflict: "company_id,device_model,issue_label", ignoreDuplicates: true });
    if (error) throw error;
  }
  console.log(`\n✅ ${totalToInsert.length} tarif(s) inséré(s) avec un prix par défaut (30€-120€). À ajuster dans /tarifs.`);
}

main().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
