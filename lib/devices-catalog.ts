/**
 * MBX Réparations — Catalogue complet appareils & pièces détachées
 * Couvre : Apple, Samsung, Xiaomi, Google, OnePlus, OPPO, Motorola, Huawei,
 *          Honor, Sony, Nokia, Realme, Vivo, Infinix, Tecno, Wiko, ZTE,
 *          Nothing, Fairphone, TCL, Asus, LG, HTC, BlackBerry, CAT
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface Part {
  id: string;
  name: string;
  category: PartCategory;
}

export type PartCategory =
  | "ecran"
  | "batterie"
  | "connecteur"
  | "vitre"
  | "camera"
  | "audio"
  | "bouton"
  | "capteur"
  | "circuit"
  | "chassis"
  | "antenne"
  | "sim"
  | "autre";

export interface DeviceEntry {
  brand: string;
  model: string;
  family: string; // clé vers PARTS_BY_FAMILY
  sku?: string;   // numéro de modèle officiel (ex: SM-G973F, A2197)
}

// ─────────────────────────────────────────────
// CATÉGORIES DE PIÈCES (labels FR)
// ─────────────────────────────────────────────

export const PART_CATEGORY_LABELS: Record<PartCategory, string> = {
  ecran: "Écran",
  batterie: "Batterie",
  connecteur: "Connecteur",
  vitre: "Vitre",
  camera: "Caméra",
  audio: "Audio",
  bouton: "Bouton / Nappe",
  capteur: "Capteur",
  circuit: "Circuit (microsoudure)",
  chassis: "Châssis / Cadre",
  antenne: "Antenne",
  sim: "SIM / Lecteur",
  autre: "Autre",
};

// ─────────────────────────────────────────────
// PIÈCES COMMUNES — BASE (tous smartphones)
// ─────────────────────────────────────────────

const COMMON_PARTS: Part[] = [
  { id: "ecran_complet", name: "Écran complet (dalle + tactile assemblé)", category: "ecran" },
  { id: "vitre_tactile", name: "Vitre tactile seule", category: "ecran" },
  { id: "batterie", name: "Batterie", category: "batterie" },
  { id: "connecteur_charge", name: "Connecteur de charge", category: "connecteur" },
  { id: "vitre_arriere", name: "Vitre arrière", category: "vitre" },
  { id: "camera_avant", name: "Caméra avant (selfie)", category: "camera" },
  { id: "camera_principale", name: "Caméra arrière principale", category: "camera" },
  { id: "hp_ecouteur", name: "Haut-parleur écouteur (oreillette)", category: "audio" },
  { id: "hp_principal", name: "Haut-parleur principal (buzzer)", category: "audio" },
  { id: "micro_principal", name: "Micro principal", category: "audio" },
  { id: "micro_secondaire", name: "Micro secondaire / bruit de fond", category: "audio" },
  { id: "nappe_power", name: "Nappe / bouton power (marche/arrêt)", category: "bouton" },
  { id: "nappe_volume", name: "Nappe / boutons volume", category: "bouton" },
  { id: "vibreur", name: "Vibreur (moteur)", category: "capteur" },
  { id: "capteur_proximite", name: "Capteur de proximité / luminosité", category: "capteur" },
  { id: "chassis_cadre", name: "Châssis / cadre central", category: "chassis" },
  { id: "antenne_nfc", name: "Antenne NFC", category: "antenne" },
  { id: "antenne_wifi", name: "Antenne Wi-Fi / Bluetooth", category: "antenne" },
  { id: "lecteur_sim", name: "Lecteur SIM + plateau", category: "sim" },
  { id: "connecteur_sim", name: "Connecteur SIM (nappe)", category: "sim" },
  { id: "joint_etancheite", name: "Joint d'étanchéité", category: "autre" },
  // Circuits microsoudure
  { id: "ic_charge", name: "Circuit de charge (IC charge / PMIC)", category: "circuit" },
  { id: "ic_affichage", name: "Circuit d'affichage (IC display / TDDI)", category: "circuit" },
  { id: "ic_modem", name: "Circuit modem (baseband IC)", category: "circuit" },
  { id: "ic_audio", name: "Circuit audio (IC audio)", category: "circuit" },
  { id: "ic_wifi", name: "Circuit Wi-Fi / Bluetooth (IC RF)", category: "circuit" },
  { id: "ic_tactile", name: "Circuit tactile (IC touch)", category: "circuit" },
  { id: "ic_camera", name: "Circuit caméra (ISP)", category: "circuit" },
  { id: "cms_resistance", name: "Condensateurs / résistances CMS", category: "circuit" },
  { id: "filtre_emi", name: "Filtre EMI / antiparasite", category: "circuit" },
  { id: "coil_qi", name: "Bobine charge sans fil (Qi)", category: "circuit" },
  { id: "carte_mere", name: "Carte mère (motherboard)", category: "circuit" },
];

// ─────────────────────────────────────────────
// PIÈCES SUPPLÉMENTAIRES PAR FAMILLE
// ─────────────────────────────────────────────

const APPLE_EXTRA: Part[] = [
  { id: "face_id", name: "Module Face ID (TrueDepth)", category: "capteur" },
  { id: "touch_id", name: "Touch ID (bouton Home + nappe)", category: "bouton" },
  { id: "taptic_engine", name: "Taptic Engine (vibreur linéaire)", category: "capteur" },
  { id: "camera_ultrawide", name: "Caméra ultra grand-angle", category: "camera" },
  { id: "camera_tele", name: "Caméra téléobjectif", category: "camera" },
  { id: "lidar", name: "Scanner LiDAR", category: "capteur" },
  { id: "magsafe_antenne", name: "Antenne MagSafe", category: "antenne" },
  { id: "btn_action", name: "Bouton Action (iPhone 15 Pro / 16)", category: "bouton" },
  { id: "btn_camera_ctrl", name: "Bouton Camera Control (iPhone 16)", category: "bouton" },
  { id: "nappe_silent", name: "Nappe bouton silence / sonnerie", category: "bouton" },
  { id: "ic_u2", name: "IC U2 (Tristar / Hydra) — charge USB", category: "circuit" },
  { id: "ic_tigris", name: "IC Tigris — gestion batterie", category: "circuit" },
  { id: "ic_booster", name: "IC Boost (convertisseur charge rapide)", category: "circuit" },
  { id: "dock_lightning", name: "Connecteur Lightning (dock)", category: "connecteur" },
  { id: "dock_usbc", name: "Connecteur USB-C (dock)", category: "connecteur" },
];

const SAMSUNG_EXTRA: Part[] = [
  { id: "camera_ultrawide", name: "Caméra ultra grand-angle", category: "camera" },
  { id: "camera_tele", name: "Caméra téléobjectif", category: "camera" },
  { id: "camera_tele2", name: "Caméra périscopique / tele 2×", category: "camera" },
  { id: "spen", name: "S-Pen (stylet)", category: "autre" },
  { id: "charniere", name: "Charnière (Z Fold / Z Flip)", category: "chassis" },
  { id: "ecran_interne", name: "Écran interne pliable (Z Fold / Flip)", category: "ecran" },
  { id: "ecran_externe", name: "Écran externe couverture (Z Flip)", category: "ecran" },
  { id: "scanner_iris", name: "Scanner iris (Note/S8-S10)", category: "capteur" },
  { id: "scanner_empreinte", name: "Lecteur d'empreintes sous-écran", category: "capteur" },
  { id: "ic_charge_samsung", name: "IC charge Samsung (SM5720)", category: "circuit" },
];

const XIAOMI_EXTRA: Part[] = [
  { id: "camera_ultrawide", name: "Caméra ultra grand-angle", category: "camera" },
  { id: "camera_tele", name: "Caméra téléobjectif / macro", category: "camera" },
  { id: "scanner_empreinte", name: "Lecteur d'empreintes sous-écran / latéral", category: "capteur" },
  { id: "nappe_silent", name: "Nappe bouton silent (slider)", category: "bouton" },
  { id: "ic_charge_xiaomi", name: "IC charge Xiaomi (PMIC)", category: "circuit" },
];

const GOOGLE_EXTRA: Part[] = [
  { id: "camera_ultrawide", name: "Caméra ultra grand-angle", category: "camera" },
  { id: "camera_tele", name: "Caméra téléobjectif", category: "camera" },
  { id: "scanner_empreinte", name: "Lecteur d'empreintes (arrière/latéral)", category: "capteur" },
  { id: "titan_m", name: "Puce Titan M2 (sécurité)", category: "circuit" },
];

const ONEPLUS_EXTRA: Part[] = [
  { id: "camera_ultrawide", name: "Caméra ultra grand-angle", category: "camera" },
  { id: "camera_tele", name: "Caméra téléobjectif", category: "camera" },
  { id: "nappe_alert", name: "Nappe bouton Alert Slider", category: "bouton" },
  { id: "scanner_empreinte", name: "Lecteur d'empreintes sous-écran", category: "capteur" },
];

const HUAWEI_EXTRA: Part[] = [
  { id: "camera_ultrawide", name: "Caméra ultra grand-angle", category: "camera" },
  { id: "camera_tele", name: "Caméra périscopique / téléobjectif", category: "camera" },
  { id: "scanner_empreinte", name: "Lecteur d'empreintes sous-écran / latéral", category: "capteur" },
  { id: "kirin_ic", name: "SoC Kirin (processeur principal)", category: "circuit" },
];

const SONY_EXTRA: Part[] = [
  { id: "camera_ultrawide", name: "Caméra ultra grand-angle", category: "camera" },
  { id: "camera_tele", name: "Caméra téléobjectif", category: "camera" },
  { id: "btn_shutter", name: "Bouton obturateur caméra", category: "bouton" },
  { id: "jack_35", name: "Jack 3.5mm audio", category: "connecteur" },
];

const MOTOROLA_EXTRA: Part[] = [
  { id: "camera_ultrawide", name: "Caméra ultra grand-angle", category: "camera" },
  { id: "jack_35", name: "Jack 3.5mm audio", category: "connecteur" },
  { id: "scanner_empreinte", name: "Lecteur d'empreintes (arrière/latéral)", category: "capteur" },
];

const TABLET_EXTRA: Part[] = [
  { id: "connecteur_clavier", name: "Connecteur clavier / Smart Connector", category: "connecteur" },
  { id: "stylet", name: "Stylet (Apple Pencil / S-Pen Tab)", category: "autre" },
  { id: "camera_ultrawide", name: "Caméra ultra grand-angle", category: "camera" },
  { id: "jack_35", name: "Jack 3.5mm audio", category: "connecteur" },
];

// ─────────────────────────────────────────────
// FAMILLES → PIÈCES
// ─────────────────────────────────────────────

export const PARTS_BY_FAMILY: Record<string, Part[]> = {
  // ── Apple ──────────────────────────────────
  apple_iphone_modern: [...COMMON_PARTS, ...APPLE_EXTRA], // iPhone X → 16
  apple_iphone_home: [                                     // iPhone 6 → 8 + SE
    ...COMMON_PARTS,
    ...APPLE_EXTRA.filter((p) => !["face_id", "btn_action", "btn_camera_ctrl"].includes(p.id)),
  ],
  apple_ipad: [...COMMON_PARTS, ...APPLE_EXTRA, ...TABLET_EXTRA],
  // ── Samsung ────────────────────────────────
  samsung_s_flagship: [...COMMON_PARTS, ...SAMSUNG_EXTRA],
  samsung_a_mid: [...COMMON_PARTS, ...SAMSUNG_EXTRA.filter((p) => !["spen", "scanner_iris"].includes(p.id))],
  samsung_z_fold: [...COMMON_PARTS, ...SAMSUNG_EXTRA],
  samsung_z_flip: [...COMMON_PARTS, ...SAMSUNG_EXTRA],
  samsung_tab: [...COMMON_PARTS, ...SAMSUNG_EXTRA, ...TABLET_EXTRA],
  // ── Xiaomi / Redmi / POCO ──────────────────
  xiaomi_flagship: [...COMMON_PARTS, ...XIAOMI_EXTRA],
  xiaomi_mid: [...COMMON_PARTS, ...XIAOMI_EXTRA],
  // ── Google Pixel ───────────────────────────
  google_pixel: [...COMMON_PARTS, ...GOOGLE_EXTRA],
  // ── OnePlus ────────────────────────────────
  oneplus: [...COMMON_PARTS, ...ONEPLUS_EXTRA],
  // ── OPPO ───────────────────────────────────
  oppo: [...COMMON_PARTS, ...XIAOMI_EXTRA],
  // ── Motorola ───────────────────────────────
  motorola: [...COMMON_PARTS, ...MOTOROLA_EXTRA],
  // ── Huawei / Honor ─────────────────────────
  huawei: [...COMMON_PARTS, ...HUAWEI_EXTRA],
  honor: [...COMMON_PARTS, ...HUAWEI_EXTRA],
  // ── Sony Xperia ────────────────────────────
  sony: [...COMMON_PARTS, ...SONY_EXTRA],
  // ── Nokia ──────────────────────────────────
  nokia: [...COMMON_PARTS],
  // ── Realme ─────────────────────────────────
  realme: [...COMMON_PARTS, ...XIAOMI_EXTRA],
  // ── Vivo / iQOO ────────────────────────────
  vivo: [...COMMON_PARTS, ...XIAOMI_EXTRA],
  // ── Infinix / Tecno / itel ─────────────────
  infinix: [...COMMON_PARTS],
  tecno: [...COMMON_PARTS],
  itel: [...COMMON_PARTS],
  // ── Wiko ───────────────────────────────────
  wiko: [...COMMON_PARTS],
  // ── ZTE / Nubia ────────────────────────────
  zte: [...COMMON_PARTS, ...XIAOMI_EXTRA],
  // ── Nothing ────────────────────────────────
  nothing: [...COMMON_PARTS],
  // ── Fairphone ──────────────────────────────
  fairphone: [...COMMON_PARTS],
  // ── TCL ────────────────────────────────────
  tcl: [...COMMON_PARTS],
  // ── Asus ROG / Zenfone ─────────────────────
  asus: [...COMMON_PARTS, ...XIAOMI_EXTRA, { id: "ventilateur", name: "Ventilateur de refroidissement (ROG)", category: "autre" }],
  // ── LG ─────────────────────────────────────
  lg: [...COMMON_PARTS, { id: "jack_35", name: "Jack 3.5mm audio", category: "connecteur" }],
  // ── Generic / autres ───────────────────────
  generic: [...COMMON_PARTS],
};

// ─────────────────────────────────────────────
// CATALOGUE COMPLET APPAREILS
// ─────────────────────────────────────────────

export const DEVICES: DeviceEntry[] = [
  // ════════════════════════════════════════════
  // APPLE — iPhone (modernes, Face ID)
  // ════════════════════════════════════════════
  { brand: "Apple", model: "iPhone 16 Pro Max", family: "apple_iphone_modern", sku: "A3295" },
  { brand: "Apple", model: "iPhone 16 Pro", family: "apple_iphone_modern", sku: "A3293" },
  { brand: "Apple", model: "iPhone 16 Plus", family: "apple_iphone_modern", sku: "A3291" },
  { brand: "Apple", model: "iPhone 16", family: "apple_iphone_modern", sku: "A3287" },
  { brand: "Apple", model: "iPhone 15 Pro Max", family: "apple_iphone_modern", sku: "A2849" },
  { brand: "Apple", model: "iPhone 15 Pro", family: "apple_iphone_modern", sku: "A2848" },
  { brand: "Apple", model: "iPhone 15 Plus", family: "apple_iphone_modern", sku: "A2847" },
  { brand: "Apple", model: "iPhone 15", family: "apple_iphone_modern", sku: "A2846" },
  { brand: "Apple", model: "iPhone 14 Pro Max", family: "apple_iphone_modern", sku: "A2651" },
  { brand: "Apple", model: "iPhone 14 Pro", family: "apple_iphone_modern", sku: "A2650" },
  { brand: "Apple", model: "iPhone 14 Plus", family: "apple_iphone_modern", sku: "A2632" },
  { brand: "Apple", model: "iPhone 14", family: "apple_iphone_modern", sku: "A2649" },
  { brand: "Apple", model: "iPhone 13 Pro Max", family: "apple_iphone_modern", sku: "A2484" },
  { brand: "Apple", model: "iPhone 13 Pro", family: "apple_iphone_modern", sku: "A2483" },
  { brand: "Apple", model: "iPhone 13", family: "apple_iphone_modern", sku: "A2482" },
  { brand: "Apple", model: "iPhone 13 Mini", family: "apple_iphone_modern", sku: "A2481" },
  { brand: "Apple", model: "iPhone 12 Pro Max", family: "apple_iphone_modern", sku: "A2342" },
  { brand: "Apple", model: "iPhone 12 Pro", family: "apple_iphone_modern", sku: "A2341" },
  { brand: "Apple", model: "iPhone 12", family: "apple_iphone_modern", sku: "A2403" },
  { brand: "Apple", model: "iPhone 12 Mini", family: "apple_iphone_modern", sku: "A2176" },
  { brand: "Apple", model: "iPhone 11 Pro Max", family: "apple_iphone_modern", sku: "A2161" },
  { brand: "Apple", model: "iPhone 11 Pro", family: "apple_iphone_modern", sku: "A2160" },
  { brand: "Apple", model: "iPhone 11", family: "apple_iphone_modern", sku: "A2111" },
  { brand: "Apple", model: "iPhone XS Max", family: "apple_iphone_modern", sku: "A1921" },
  { brand: "Apple", model: "iPhone XS", family: "apple_iphone_modern", sku: "A1920" },
  { brand: "Apple", model: "iPhone XR", family: "apple_iphone_modern", sku: "A1984" },
  { brand: "Apple", model: "iPhone X", family: "apple_iphone_modern", sku: "A1865" },
  // Apple — iPhone (Touch ID)
  { brand: "Apple", model: "iPhone SE 3e gen (2022)", family: "apple_iphone_home", sku: "A2595" },
  { brand: "Apple", model: "iPhone SE 2e gen (2020)", family: "apple_iphone_home", sku: "A2275" },
  { brand: "Apple", model: "iPhone SE 1e gen (2016)", family: "apple_iphone_home", sku: "A1662" },
  { brand: "Apple", model: "iPhone 8 Plus", family: "apple_iphone_home", sku: "A1864" },
  { brand: "Apple", model: "iPhone 8", family: "apple_iphone_home", sku: "A1863" },
  { brand: "Apple", model: "iPhone 7 Plus", family: "apple_iphone_home", sku: "A1661" },
  { brand: "Apple", model: "iPhone 7", family: "apple_iphone_home", sku: "A1660" },
  { brand: "Apple", model: "iPhone 6s Plus", family: "apple_iphone_home", sku: "A1687" },
  { brand: "Apple", model: "iPhone 6s", family: "apple_iphone_home", sku: "A1688" },
  { brand: "Apple", model: "iPhone 6 Plus", family: "apple_iphone_home", sku: "A1524" },
  { brand: "Apple", model: "iPhone 6", family: "apple_iphone_home", sku: "A1549" },
  { brand: "Apple", model: "iPhone 5s", family: "apple_iphone_home", sku: "A1457" },
  { brand: "Apple", model: "iPhone 5c", family: "apple_iphone_home", sku: "A1456" },
  { brand: "Apple", model: "iPhone 5", family: "apple_iphone_home", sku: "A1428" },
  // Apple — iPad
  { brand: "Apple", model: "iPad Pro 13\" M4", family: "apple_ipad", sku: "A2925" },
  { brand: "Apple", model: "iPad Pro 11\" M4", family: "apple_ipad", sku: "A2836" },
  { brand: "Apple", model: "iPad Pro 12.9\" M2 (6e gen)", family: "apple_ipad", sku: "A2436" },
  { brand: "Apple", model: "iPad Pro 11\" M2 (4e gen)", family: "apple_ipad", sku: "A2759" },
  { brand: "Apple", model: "iPad Pro 12.9\" M1 (5e gen)", family: "apple_ipad", sku: "A2378" },
  { brand: "Apple", model: "iPad Pro 11\" M1 (3e gen)", family: "apple_ipad", sku: "A2377" },
  { brand: "Apple", model: "iPad Pro 12.9\" (4e gen)", family: "apple_ipad", sku: "A2229" },
  { brand: "Apple", model: "iPad Pro 11\" (2e gen)", family: "apple_ipad", sku: "A2228" },
  { brand: "Apple", model: "iPad Pro 12.9\" (3e gen)", family: "apple_ipad", sku: "A1876" },
  { brand: "Apple", model: "iPad Pro 11\" (1e gen)", family: "apple_ipad", sku: "A1980" },
  { brand: "Apple", model: "iPad Air M2 (6e gen)", family: "apple_ipad", sku: "A2898" },
  { brand: "Apple", model: "iPad Air M1 (5e gen)", family: "apple_ipad", sku: "A2588" },
  { brand: "Apple", model: "iPad Air (4e gen)", family: "apple_ipad", sku: "A2316" },
  { brand: "Apple", model: "iPad Air (3e gen)", family: "apple_ipad", sku: "A2152" },
  { brand: "Apple", model: "iPad mini 7 (7e gen)", family: "apple_ipad", sku: "A2984" },
  { brand: "Apple", model: "iPad mini 6 (6e gen)", family: "apple_ipad", sku: "A2567" },
  { brand: "Apple", model: "iPad mini 5 (5e gen)", family: "apple_ipad", sku: "A2133" },
  { brand: "Apple", model: "iPad mini 4", family: "apple_ipad", sku: "A1538" },
  { brand: "Apple", model: "iPad 10e gen", family: "apple_ipad", sku: "A2696" },
  { brand: "Apple", model: "iPad 9e gen", family: "apple_ipad", sku: "A2602" },
  { brand: "Apple", model: "iPad 8e gen", family: "apple_ipad", sku: "A2270" },
  { brand: "Apple", model: "iPad 7e gen", family: "apple_ipad", sku: "A2197" },

  // ════════════════════════════════════════════
  // SAMSUNG — Galaxy S
  // ════════════════════════════════════════════
  { brand: "Samsung", model: "Galaxy S25 Ultra", family: "samsung_s_flagship", sku: "SM-S938B" },
  { brand: "Samsung", model: "Galaxy S25+", family: "samsung_s_flagship", sku: "SM-S936B" },
  { brand: "Samsung", model: "Galaxy S25", family: "samsung_s_flagship", sku: "SM-S931B" },
  { brand: "Samsung", model: "Galaxy S24 Ultra", family: "samsung_s_flagship", sku: "SM-S928B" },
  { brand: "Samsung", model: "Galaxy S24+", family: "samsung_s_flagship", sku: "SM-S926B" },
  { brand: "Samsung", model: "Galaxy S24", family: "samsung_s_flagship", sku: "SM-S921B" },
  { brand: "Samsung", model: "Galaxy S24 FE", family: "samsung_s_flagship", sku: "SM-S721B" },
  { brand: "Samsung", model: "Galaxy S23 Ultra", family: "samsung_s_flagship", sku: "SM-S918B" },
  { brand: "Samsung", model: "Galaxy S23+", family: "samsung_s_flagship", sku: "SM-S916B" },
  { brand: "Samsung", model: "Galaxy S23", family: "samsung_s_flagship", sku: "SM-S911B" },
  { brand: "Samsung", model: "Galaxy S23 FE", family: "samsung_s_flagship", sku: "SM-S711B" },
  { brand: "Samsung", model: "Galaxy S22 Ultra", family: "samsung_s_flagship", sku: "SM-S908B" },
  { brand: "Samsung", model: "Galaxy S22+", family: "samsung_s_flagship", sku: "SM-S906B" },
  { brand: "Samsung", model: "Galaxy S22", family: "samsung_s_flagship", sku: "SM-S901B" },
  { brand: "Samsung", model: "Galaxy S21 Ultra", family: "samsung_s_flagship", sku: "SM-G998B" },
  { brand: "Samsung", model: "Galaxy S21+", family: "samsung_s_flagship", sku: "SM-G996B" },
  { brand: "Samsung", model: "Galaxy S21", family: "samsung_s_flagship", sku: "SM-G991B" },
  { brand: "Samsung", model: "Galaxy S21 FE", family: "samsung_s_flagship", sku: "SM-G990B" },
  { brand: "Samsung", model: "Galaxy S20 Ultra", family: "samsung_s_flagship", sku: "SM-G988B" },
  { brand: "Samsung", model: "Galaxy S20+", family: "samsung_s_flagship", sku: "SM-G985F" },
  { brand: "Samsung", model: "Galaxy S20", family: "samsung_s_flagship", sku: "SM-G981B" },
  { brand: "Samsung", model: "Galaxy S20 FE", family: "samsung_s_flagship", sku: "SM-G780F" },
  { brand: "Samsung", model: "Galaxy S10+", family: "samsung_s_flagship", sku: "SM-G975F" },
  { brand: "Samsung", model: "Galaxy S10", family: "samsung_s_flagship", sku: "SM-G973F" },
  { brand: "Samsung", model: "Galaxy S10e", family: "samsung_s_flagship", sku: "SM-G970F" },
  { brand: "Samsung", model: "Galaxy S10 5G", family: "samsung_s_flagship", sku: "SM-G977B" },
  { brand: "Samsung", model: "Galaxy S9+", family: "samsung_s_flagship", sku: "SM-G965F" },
  { brand: "Samsung", model: "Galaxy S9", family: "samsung_s_flagship", sku: "SM-G960F" },
  { brand: "Samsung", model: "Galaxy S8+", family: "samsung_s_flagship", sku: "SM-G955F" },
  { brand: "Samsung", model: "Galaxy S8", family: "samsung_s_flagship", sku: "SM-G950F" },
  // Samsung — Note
  { brand: "Samsung", model: "Galaxy Note 20 Ultra", family: "samsung_s_flagship", sku: "SM-N986B" },
  { brand: "Samsung", model: "Galaxy Note 20", family: "samsung_s_flagship", sku: "SM-N981B" },
  { brand: "Samsung", model: "Galaxy Note 10+", family: "samsung_s_flagship", sku: "SM-N975F" },
  { brand: "Samsung", model: "Galaxy Note 10", family: "samsung_s_flagship", sku: "SM-N970F" },
  { brand: "Samsung", model: "Galaxy Note 9", family: "samsung_s_flagship", sku: "SM-N960F" },
  { brand: "Samsung", model: "Galaxy Note 8", family: "samsung_s_flagship", sku: "SM-N950F" },
  // Samsung — Z Fold
  { brand: "Samsung", model: "Galaxy Z Fold 6", family: "samsung_z_fold", sku: "SM-F956B" },
  { brand: "Samsung", model: "Galaxy Z Fold 5", family: "samsung_z_fold", sku: "SM-F946B" },
  { brand: "Samsung", model: "Galaxy Z Fold 4", family: "samsung_z_fold", sku: "SM-F936B" },
  { brand: "Samsung", model: "Galaxy Z Fold 3", family: "samsung_z_fold", sku: "SM-F926B" },
  { brand: "Samsung", model: "Galaxy Z Fold 2", family: "samsung_z_fold", sku: "SM-F916B" },
  // Samsung — Z Flip
  { brand: "Samsung", model: "Galaxy Z Flip 6", family: "samsung_z_flip", sku: "SM-F741B" },
  { brand: "Samsung", model: "Galaxy Z Flip 5", family: "samsung_z_flip", sku: "SM-F731B" },
  { brand: "Samsung", model: "Galaxy Z Flip 4", family: "samsung_z_flip", sku: "SM-F721B" },
  { brand: "Samsung", model: "Galaxy Z Flip 3", family: "samsung_z_flip", sku: "SM-F711B" },
  // Samsung — A série
  { brand: "Samsung", model: "Galaxy A56", family: "samsung_a_mid", sku: "SM-A566B" },
  { brand: "Samsung", model: "Galaxy A55", family: "samsung_a_mid", sku: "SM-A556B" },
  { brand: "Samsung", model: "Galaxy A54", family: "samsung_a_mid", sku: "SM-A546B" },
  { brand: "Samsung", model: "Galaxy A53", family: "samsung_a_mid", sku: "SM-A536B" },
  { brand: "Samsung", model: "Galaxy A52s", family: "samsung_a_mid", sku: "SM-A528B" },
  { brand: "Samsung", model: "Galaxy A52", family: "samsung_a_mid", sku: "SM-A525F" },
  { brand: "Samsung", model: "Galaxy A51", family: "samsung_a_mid", sku: "SM-A515F" },
  { brand: "Samsung", model: "Galaxy A50", family: "samsung_a_mid", sku: "SM-A505F" },
  { brand: "Samsung", model: "Galaxy A36", family: "samsung_a_mid", sku: "SM-A366B" },
  { brand: "Samsung", model: "Galaxy A35", family: "samsung_a_mid", sku: "SM-A356B" },
  { brand: "Samsung", model: "Galaxy A34", family: "samsung_a_mid", sku: "SM-A346B" },
  { brand: "Samsung", model: "Galaxy A33", family: "samsung_a_mid", sku: "SM-A336B" },
  { brand: "Samsung", model: "Galaxy A32", family: "samsung_a_mid", sku: "SM-A325F" },
  { brand: "Samsung", model: "Galaxy A31", family: "samsung_a_mid", sku: "SM-A315F" },
  { brand: "Samsung", model: "Galaxy A30s", family: "samsung_a_mid", sku: "SM-A307F" },
  { brand: "Samsung", model: "Galaxy A26", family: "samsung_a_mid", sku: "SM-A266B" },
  { brand: "Samsung", model: "Galaxy A25", family: "samsung_a_mid", sku: "SM-A256B" },
  { brand: "Samsung", model: "Galaxy A24", family: "samsung_a_mid", sku: "SM-A245F" },
  { brand: "Samsung", model: "Galaxy A23", family: "samsung_a_mid", sku: "SM-A235F" },
  { brand: "Samsung", model: "Galaxy A16", family: "samsung_a_mid", sku: "SM-A165F" },
  { brand: "Samsung", model: "Galaxy A15", family: "samsung_a_mid", sku: "SM-A155F" },
  { brand: "Samsung", model: "Galaxy A14", family: "samsung_a_mid", sku: "SM-A145F" },
  { brand: "Samsung", model: "Galaxy A13", family: "samsung_a_mid", sku: "SM-A135F" },
  { brand: "Samsung", model: "Galaxy A12", family: "samsung_a_mid", sku: "SM-A125F" },
  { brand: "Samsung", model: "Galaxy A06", family: "samsung_a_mid", sku: "SM-A065F" },
  { brand: "Samsung", model: "Galaxy A05s", family: "samsung_a_mid", sku: "SM-A057F" },
  { brand: "Samsung", model: "Galaxy A04s", family: "samsung_a_mid", sku: "SM-A047F" },
  { brand: "Samsung", model: "Galaxy M55", family: "samsung_a_mid", sku: "SM-M556B" },
  { brand: "Samsung", model: "Galaxy M35", family: "samsung_a_mid", sku: "SM-M356B" },
  { brand: "Samsung", model: "Galaxy M15", family: "samsung_a_mid", sku: "SM-M156B" },
  // Samsung — Tablettes
  { brand: "Samsung", model: "Galaxy Tab S10 Ultra", family: "samsung_tab", sku: "SM-X926B" },
  { brand: "Samsung", model: "Galaxy Tab S10+", family: "samsung_tab", sku: "SM-X826B" },
  { brand: "Samsung", model: "Galaxy Tab S10", family: "samsung_tab", sku: "SM-X716B" },
  { brand: "Samsung", model: "Galaxy Tab S9 Ultra", family: "samsung_tab", sku: "SM-X916B" },
  { brand: "Samsung", model: "Galaxy Tab S9+", family: "samsung_tab", sku: "SM-X816B" },
  { brand: "Samsung", model: "Galaxy Tab S9", family: "samsung_tab", sku: "SM-X716B" },
  { brand: "Samsung", model: "Galaxy Tab S9 FE", family: "samsung_tab", sku: "SM-X510" },
  { brand: "Samsung", model: "Galaxy Tab S8 Ultra", family: "samsung_tab", sku: "SM-X906B" },
  { brand: "Samsung", model: "Galaxy Tab S8+", family: "samsung_tab", sku: "SM-X806B" },
  { brand: "Samsung", model: "Galaxy Tab S8", family: "samsung_tab", sku: "SM-X700" },
  { brand: "Samsung", model: "Galaxy Tab S7 FE", family: "samsung_tab", sku: "SM-T736B" },
  { brand: "Samsung", model: "Galaxy Tab A9+", family: "samsung_tab", sku: "SM-X210" },
  { brand: "Samsung", model: "Galaxy Tab A9", family: "samsung_tab", sku: "SM-X115" },
  { brand: "Samsung", model: "Galaxy Tab A8", family: "samsung_tab", sku: "SM-X200" },
  { brand: "Samsung", model: "Galaxy Tab A7 Lite", family: "samsung_tab", sku: "SM-T220" },

  // ════════════════════════════════════════════
  // XIAOMI
  // ════════════════════════════════════════════
  { brand: "Xiaomi", model: "Xiaomi 15 Ultra", family: "xiaomi_flagship", sku: "24121APCTU" },
  { brand: "Xiaomi", model: "Xiaomi 15 Pro", family: "xiaomi_flagship", sku: "24116PN5BG" },
  { brand: "Xiaomi", model: "Xiaomi 15", family: "xiaomi_flagship", sku: "24127PN0CC" },
  { brand: "Xiaomi", model: "Xiaomi 14 Ultra", family: "xiaomi_flagship", sku: "23UIF2C" },
  { brand: "Xiaomi", model: "Xiaomi 14 Pro", family: "xiaomi_flagship", sku: "23116PN5BC" },
  { brand: "Xiaomi", model: "Xiaomi 14", family: "xiaomi_flagship", sku: "23127PN0CC" },
  { brand: "Xiaomi", model: "Xiaomi 14T Pro", family: "xiaomi_flagship", sku: "24078CPH1RU" },
  { brand: "Xiaomi", model: "Xiaomi 14T", family: "xiaomi_flagship", sku: "24071PN49G" },
  { brand: "Xiaomi", model: "Xiaomi 13 Ultra", family: "xiaomi_flagship", sku: "2304FPN6DC" },
  { brand: "Xiaomi", model: "Xiaomi 13 Pro", family: "xiaomi_flagship", sku: "2210132G" },
  { brand: "Xiaomi", model: "Xiaomi 13", family: "xiaomi_flagship", sku: "2211133G" },
  { brand: "Xiaomi", model: "Xiaomi 13 Lite", family: "xiaomi_mid", sku: "2210129SG" },
  { brand: "Xiaomi", model: "Xiaomi 13T Pro", family: "xiaomi_flagship", sku: "23078PND5G" },
  { brand: "Xiaomi", model: "Xiaomi 13T", family: "xiaomi_flagship", sku: "23078RN4DG" },
  { brand: "Xiaomi", model: "Xiaomi 12 Pro", family: "xiaomi_flagship", sku: "2201122G" },
  { brand: "Xiaomi", model: "Xiaomi 12", family: "xiaomi_flagship", sku: "2201123G" },
  { brand: "Xiaomi", model: "Xiaomi 12 Lite", family: "xiaomi_mid", sku: "2203129G" },
  { brand: "Xiaomi", model: "Xiaomi 11 Ultra", family: "xiaomi_flagship", sku: "M2102K1G" },
  { brand: "Xiaomi", model: "Xiaomi 11 Pro", family: "xiaomi_flagship", sku: "M2102K1AC" },
  { brand: "Xiaomi", model: "Xiaomi 11", family: "xiaomi_flagship", sku: "M2011K2G" },
  { brand: "Xiaomi", model: "Xiaomi 11 Lite 5G NE", family: "xiaomi_mid", sku: "2109119DG" },
  // Redmi Note
  { brand: "Xiaomi", model: "Redmi Note 14 Pro+", family: "xiaomi_mid", sku: "24117RA68G" },
  { brand: "Xiaomi", model: "Redmi Note 14 Pro", family: "xiaomi_mid", sku: "24117RA3IG" },
  { brand: "Xiaomi", model: "Redmi Note 14", family: "xiaomi_mid", sku: "24117PG14G" },
  { brand: "Xiaomi", model: "Redmi Note 13 Pro+", family: "xiaomi_mid", sku: "23054RA19I" },
  { brand: "Xiaomi", model: "Redmi Note 13 Pro", family: "xiaomi_mid", sku: "23054RA19G" },
  { brand: "Xiaomi", model: "Redmi Note 13", family: "xiaomi_mid", sku: "23129RA73G" },
  { brand: "Xiaomi", model: "Redmi Note 12 Pro+", family: "xiaomi_mid", sku: "22101316UCP" },
  { brand: "Xiaomi", model: "Redmi Note 12 Pro", family: "xiaomi_mid", sku: "22101316C" },
  { brand: "Xiaomi", model: "Redmi Note 12", family: "xiaomi_mid", sku: "22111317I" },
  { brand: "Xiaomi", model: "Redmi Note 11 Pro+", family: "xiaomi_mid", sku: "2201116SG" },
  { brand: "Xiaomi", model: "Redmi Note 11 Pro", family: "xiaomi_mid", sku: "2201116TG" },
  { brand: "Xiaomi", model: "Redmi Note 11", family: "xiaomi_mid", sku: "2201117TG" },
  { brand: "Xiaomi", model: "Redmi Note 10 Pro", family: "xiaomi_mid", sku: "M2101K6G" },
  { brand: "Xiaomi", model: "Redmi Note 10", family: "xiaomi_mid", sku: "M2101K7AG" },
  { brand: "Xiaomi", model: "Redmi Note 9 Pro", family: "xiaomi_mid", sku: "M2003J6B2G" },
  { brand: "Xiaomi", model: "Redmi Note 9", family: "xiaomi_mid", sku: "M2003J15SG" },
  // Redmi
  { brand: "Xiaomi", model: "Redmi 14C", family: "xiaomi_mid", sku: "24111RN14I" },
  { brand: "Xiaomi", model: "Redmi 13C", family: "xiaomi_mid", sku: "23100RN82L" },
  { brand: "Xiaomi", model: "Redmi 13", family: "xiaomi_mid", sku: "24053PY09I" },
  { brand: "Xiaomi", model: "Redmi 12C", family: "xiaomi_mid", sku: "22120RN86G" },
  { brand: "Xiaomi", model: "Redmi 12", family: "xiaomi_mid", sku: "23053RN02Y" },
  { brand: "Xiaomi", model: "Redmi 10C", family: "xiaomi_mid", sku: "220333QNY" },
  { brand: "Xiaomi", model: "Redmi 10A", family: "xiaomi_mid", sku: "220233L2G" },
  { brand: "Xiaomi", model: "Redmi 9A", family: "xiaomi_mid", sku: "M2006C3LG" },
  { brand: "Xiaomi", model: "Redmi 9C", family: "xiaomi_mid", sku: "M2006C3MG" },
  // POCO
  { brand: "Xiaomi", model: "POCO F6 Pro", family: "xiaomi_flagship", sku: "23113RKC6G" },
  { brand: "Xiaomi", model: "POCO F6", family: "xiaomi_flagship", sku: "23129PN74G" },
  { brand: "Xiaomi", model: "POCO F5 Pro", family: "xiaomi_flagship", sku: "23013PC75G" },
  { brand: "Xiaomi", model: "POCO F5", family: "xiaomi_flagship", sku: "23049PCD8G" },
  { brand: "Xiaomi", model: "POCO F4 GT", family: "xiaomi_flagship", sku: "22021211RG" },
  { brand: "Xiaomi", model: "POCO F4", family: "xiaomi_flagship", sku: "22021211RG" },
  { brand: "Xiaomi", model: "POCO X6 Pro", family: "xiaomi_mid", sku: "23122PCD1G" },
  { brand: "Xiaomi", model: "POCO X6", family: "xiaomi_mid", sku: "23122PCD1I" },
  { brand: "Xiaomi", model: "POCO X5 Pro", family: "xiaomi_mid", sku: "22101320G" },
  { brand: "Xiaomi", model: "POCO X5", family: "xiaomi_mid", sku: "22111317PG" },
  { brand: "Xiaomi", model: "POCO M6 Pro", family: "xiaomi_mid", sku: "23117RA7BI" },
  { brand: "Xiaomi", model: "POCO M5s", family: "xiaomi_mid", sku: "2207117BPG" },
  { brand: "Xiaomi", model: "POCO C65", family: "xiaomi_mid", sku: "23129RAA4G" },
  // Xiaomi Pad
  { brand: "Xiaomi", model: "Xiaomi Pad 7 Pro", family: "samsung_tab", sku: "24122PC91G" },
  { brand: "Xiaomi", model: "Xiaomi Pad 7", family: "samsung_tab", sku: "24122PC95G" },
  { brand: "Xiaomi", model: "Xiaomi Pad 6 Pro", family: "samsung_tab", sku: "23043RP34G" },
  { brand: "Xiaomi", model: "Xiaomi Pad 6", family: "samsung_tab", sku: "23043RP34C" },
  { brand: "Xiaomi", model: "Redmi Pad Pro", family: "samsung_tab", sku: "23106RN0DG" },
  { brand: "Xiaomi", model: "Redmi Pad SE", family: "samsung_tab", sku: "23073RPBFG" },

  // ════════════════════════════════════════════
  // GOOGLE PIXEL
  // ════════════════════════════════════════════
  { brand: "Google", model: "Pixel 9 Pro XL", family: "google_pixel", sku: "GP4BC" },
  { brand: "Google", model: "Pixel 9 Pro Fold", family: "google_pixel", sku: "GP4BE" },
  { brand: "Google", model: "Pixel 9 Pro", family: "google_pixel", sku: "GP4BB" },
  { brand: "Google", model: "Pixel 9", family: "google_pixel", sku: "GP4BA" },
  { brand: "Google", model: "Pixel 9a", family: "google_pixel", sku: "GP4BF" },
  { brand: "Google", model: "Pixel 8 Pro", family: "google_pixel", sku: "GP4BC" },
  { brand: "Google", model: "Pixel 8a", family: "google_pixel", sku: "GKWS6" },
  { brand: "Google", model: "Pixel 8", family: "google_pixel", sku: "GKWS3" },
  { brand: "Google", model: "Pixel 7 Pro", family: "google_pixel", sku: "GE2AE" },
  { brand: "Google", model: "Pixel 7a", family: "google_pixel", sku: "GWKK3" },
  { brand: "Google", model: "Pixel 7", family: "google_pixel", sku: "GVU6C" },
  { brand: "Google", model: "Pixel 6 Pro", family: "google_pixel", sku: "GF5KQ" },
  { brand: "Google", model: "Pixel 6a", family: "google_pixel", sku: "GB17L" },
  { brand: "Google", model: "Pixel 6", family: "google_pixel", sku: "GB7N6" },
  { brand: "Google", model: "Pixel 5a", family: "google_pixel", sku: "G1F8F" },
  { brand: "Google", model: "Pixel 5", family: "google_pixel", sku: "GD1YQ" },
  { brand: "Google", model: "Pixel 4a 5G", family: "google_pixel", sku: "G025I" },
  { brand: "Google", model: "Pixel 4a", family: "google_pixel", sku: "G025J" },
  { brand: "Google", model: "Pixel 4 XL", family: "google_pixel", sku: "G020P" },
  { brand: "Google", model: "Pixel 4", family: "google_pixel", sku: "G020I" },
  { brand: "Google", model: "Pixel Tablet", family: "samsung_tab", sku: "G10RE" },
  { brand: "Google", model: "Pixel Fold", family: "samsung_z_fold", sku: "G0B96" },

  // ════════════════════════════════════════════
  // OnePlus
  // ════════════════════════════════════════════
  { brand: "OnePlus", model: "OnePlus 13", family: "oneplus", sku: "CPH2673" },
  { brand: "OnePlus", model: "OnePlus 13R", family: "oneplus", sku: "CPH2655" },
  { brand: "OnePlus", model: "OnePlus 12", family: "oneplus", sku: "CPH2581" },
  { brand: "OnePlus", model: "OnePlus 12R", family: "oneplus", sku: "CPH2583" },
  { brand: "OnePlus", model: "OnePlus 11", family: "oneplus", sku: "CPH2449" },
  { brand: "OnePlus", model: "OnePlus 11R", family: "oneplus", sku: "CPH2487" },
  { brand: "OnePlus", model: "OnePlus 10 Pro", family: "oneplus", sku: "NE2213" },
  { brand: "OnePlus", model: "OnePlus 10T", family: "oneplus", sku: "CPH2415" },
  { brand: "OnePlus", model: "OnePlus 10R", family: "oneplus", sku: "CPH2411" },
  { brand: "OnePlus", model: "OnePlus 9 Pro", family: "oneplus", sku: "LE2123" },
  { brand: "OnePlus", model: "OnePlus 9R", family: "oneplus", sku: "LE2101" },
  { brand: "OnePlus", model: "OnePlus 9", family: "oneplus", sku: "LE2113" },
  { brand: "OnePlus", model: "OnePlus 8 Pro", family: "oneplus", sku: "IN2023" },
  { brand: "OnePlus", model: "OnePlus 8T", family: "oneplus", sku: "KB2003" },
  { brand: "OnePlus", model: "OnePlus 8", family: "oneplus", sku: "IN1013" },
  { brand: "OnePlus", model: "OnePlus Nord CE 4 Lite", family: "oneplus", sku: "CPH2665" },
  { brand: "OnePlus", model: "OnePlus Nord CE 4", family: "oneplus", sku: "CPH2631" },
  { brand: "OnePlus", model: "OnePlus Nord CE 3 Lite", family: "oneplus", sku: "CPH2465" },
  { brand: "OnePlus", model: "OnePlus Nord CE 3", family: "oneplus", sku: "CPH2467" },
  { brand: "OnePlus", model: "OnePlus Nord CE 2 Lite", family: "oneplus", sku: "CPH2381" },
  { brand: "OnePlus", model: "OnePlus Nord CE 2", family: "oneplus", sku: "IV2201" },
  { brand: "OnePlus", model: "OnePlus Nord 4", family: "oneplus", sku: "CPH2609" },
  { brand: "OnePlus", model: "OnePlus Nord 3", family: "oneplus", sku: "CPH2493" },
  { brand: "OnePlus", model: "OnePlus Nord 2T", family: "oneplus", sku: "CPH2399" },
  { brand: "OnePlus", model: "OnePlus Nord 2", family: "oneplus", sku: "DN2103" },
  { brand: "OnePlus", model: "OnePlus Nord", family: "oneplus", sku: "AC2003" },
  { brand: "OnePlus", model: "OnePlus Open", family: "samsung_z_fold", sku: "CPH2551" },

  // ════════════════════════════════════════════
  // OPPO
  // ════════════════════════════════════════════
  { brand: "OPPO", model: "OPPO Find X8 Pro", family: "oppo", sku: "PHY110" },
  { brand: "OPPO", model: "OPPO Find X8", family: "oppo", sku: "PHX110" },
  { brand: "OPPO", model: "OPPO Find X7 Ultra", family: "oppo", sku: "CPH2585" },
  { brand: "OPPO", model: "OPPO Find X7", family: "oppo", sku: "CPH2555" },
  { brand: "OPPO", model: "OPPO Find X6 Pro", family: "oppo", sku: "PGEM10" },
  { brand: "OPPO", model: "OPPO Find X6", family: "oppo", sku: "PGET10" },
  { brand: "OPPO", model: "OPPO Find N3 Flip", family: "samsung_z_flip", sku: "CPH2519" },
  { brand: "OPPO", model: "OPPO Find N3", family: "samsung_z_fold", sku: "CPH2491" },
  { brand: "OPPO", model: "OPPO Reno 12 Pro", family: "oppo", sku: "CPH2641" },
  { brand: "OPPO", model: "OPPO Reno 12", family: "oppo", sku: "CPH2625" },
  { brand: "OPPO", model: "OPPO Reno 11 Pro", family: "oppo", sku: "CPH2599" },
  { brand: "OPPO", model: "OPPO Reno 11", family: "oppo", sku: "CPH2585" },
  { brand: "OPPO", model: "OPPO Reno 10 Pro+", family: "oppo", sku: "CPH2525" },
  { brand: "OPPO", model: "OPPO Reno 10 Pro", family: "oppo", sku: "CPH2507" },
  { brand: "OPPO", model: "OPPO Reno 10", family: "oppo", sku: "CPH2473" },
  { brand: "OPPO", model: "OPPO Reno 8 Pro", family: "oppo", sku: "CPH2357" },
  { brand: "OPPO", model: "OPPO Reno 8", family: "oppo", sku: "CPH2359" },
  { brand: "OPPO", model: "OPPO A98", family: "oppo", sku: "CPH2529" },
  { brand: "OPPO", model: "OPPO A78", family: "oppo", sku: "CPH2483" },
  { brand: "OPPO", model: "OPPO A58", family: "oppo", sku: "CPH2577" },
  { brand: "OPPO", model: "OPPO A38", family: "oppo", sku: "CPH2579" },
  { brand: "OPPO", model: "OPPO A18", family: "oppo", sku: "CPH2591" },

  // ════════════════════════════════════════════
  // MOTOROLA
  // ════════════════════════════════════════════
  { brand: "Motorola", model: "Motorola Edge 50 Ultra", family: "motorola", sku: "XT2341-3" },
  { brand: "Motorola", model: "Motorola Edge 50 Pro", family: "motorola", sku: "XT2309-2" },
  { brand: "Motorola", model: "Motorola Edge 50 Fusion", family: "motorola", sku: "XT2429-1" },
  { brand: "Motorola", model: "Motorola Edge 50", family: "motorola", sku: "XT2429-2" },
  { brand: "Motorola", model: "Motorola Edge 40 Pro", family: "motorola", sku: "XT2301-4" },
  { brand: "Motorola", model: "Motorola Edge 40 Neo", family: "motorola", sku: "XT2307-2" },
  { brand: "Motorola", model: "Motorola Edge 40", family: "motorola", sku: "XT2303-2" },
  { brand: "Motorola", model: "Motorola Edge 30 Ultra", family: "motorola", sku: "XT2241-1" },
  { brand: "Motorola", model: "Motorola Edge 30 Pro", family: "motorola", sku: "XT2203-1" },
  { brand: "Motorola", model: "Motorola Edge 30", family: "motorola", sku: "XT2203-4" },
  { brand: "Motorola", model: "Moto G85", family: "motorola", sku: "XT2429-3" },
  { brand: "Motorola", model: "Moto G84", family: "motorola", sku: "XT2347-1" },
  { brand: "Motorola", model: "Moto G64", family: "motorola", sku: "XT2377-2" },
  { brand: "Motorola", model: "Moto G54", family: "motorola", sku: "XT2343-2" },
  { brand: "Motorola", model: "Moto G34", family: "motorola", sku: "XT2363-2" },
  { brand: "Motorola", model: "Moto G24", family: "motorola", sku: "XT2423-1" },
  { brand: "Motorola", model: "Moto G14", family: "motorola", sku: "XT2341-1" },
  { brand: "Motorola", model: "Motorola Razr 50 Ultra", family: "samsung_z_flip", sku: "XT2451-1" },
  { brand: "Motorola", model: "Motorola Razr 50", family: "samsung_z_flip", sku: "XT2451-2" },
  { brand: "Motorola", model: "Motorola Razr 40 Ultra", family: "samsung_z_flip", sku: "XT2321-1" },
  { brand: "Motorola", model: "Motorola Razr 40", family: "samsung_z_flip", sku: "XT2323-1" },

  // ════════════════════════════════════════════
  // HUAWEI
  // ════════════════════════════════════════════
  { brand: "Huawei", model: "Huawei Mate 70 Pro+", family: "huawei", sku: "ALN-AL20" },
  { brand: "Huawei", model: "Huawei Mate 70 Pro", family: "huawei", sku: "BRA-AL10" },
  { brand: "Huawei", model: "Huawei Mate 70", family: "huawei", sku: "BVL-AL20" },
  { brand: "Huawei", model: "Huawei Mate 60 Pro+", family: "huawei", sku: "MNA-AL00" },
  { brand: "Huawei", model: "Huawei Mate 60 Pro", family: "huawei", sku: "BVL-AL00" },
  { brand: "Huawei", model: "Huawei Mate 60", family: "huawei", sku: "BVL-AL60" },
  { brand: "Huawei", model: "Huawei Mate 50 Pro", family: "huawei", sku: "DCO-AL00" },
  { brand: "Huawei", model: "Huawei Mate 50", family: "huawei", sku: "CET-AL00" },
  { brand: "Huawei", model: "Huawei Mate 40 Pro", family: "huawei", sku: "NOH-NX9" },
  { brand: "Huawei", model: "Huawei Mate 40", family: "huawei", sku: "OCE-AN10" },
  { brand: "Huawei", model: "Huawei P70 Pro", family: "huawei", sku: "BVL-AL90" },
  { brand: "Huawei", model: "Huawei P60 Pro", family: "huawei", sku: "MNA-LX9" },
  { brand: "Huawei", model: "Huawei P60", family: "huawei", sku: "ABRA-AL00" },
  { brand: "Huawei", model: "Huawei P50 Pro", family: "huawei", sku: "JAD-LX9" },
  { brand: "Huawei", model: "Huawei P50", family: "huawei", sku: "ABR-LX9" },
  { brand: "Huawei", model: "Huawei P40 Pro+", family: "huawei", sku: "ELS-AN10" },
  { brand: "Huawei", model: "Huawei P40 Pro", family: "huawei", sku: "ELS-NX9" },
  { brand: "Huawei", model: "Huawei P40", family: "huawei", sku: "ANA-LX4" },
  { brand: "Huawei", model: "Huawei P30 Pro", family: "huawei", sku: "VOG-L29" },
  { brand: "Huawei", model: "Huawei P30", family: "huawei", sku: "ELE-L29" },
  { brand: "Huawei", model: "Huawei Nova 13 Pro", family: "huawei", sku: "BMO-AL00" },
  { brand: "Huawei", model: "Huawei Nova 12 Pro", family: "huawei", sku: "HBN-AL10" },
  { brand: "Huawei", model: "Huawei Nova 12", family: "huawei", sku: "HBN-AL00" },
  { brand: "Huawei", model: "Huawei Nova 11 Pro", family: "huawei", sku: "GOA-LX9" },
  { brand: "Huawei", model: "Huawei Nova 11", family: "huawei", sku: "FOA-LX9" },
  { brand: "Huawei", model: "Huawei Pura 70 Ultra", family: "huawei", sku: "BVL-AN60" },
  { brand: "Huawei", model: "Huawei Pura 70 Pro", family: "huawei", sku: "BVL-AN50" },

  // ════════════════════════════════════════════
  // HONOR
  // ════════════════════════════════════════════
  { brand: "Honor", model: "Honor Magic 7 Pro", family: "honor", sku: "ALT-AN00" },
  { brand: "Honor", model: "Honor Magic 6 Pro", family: "honor", sku: "MLS-AN00" },
  { brand: "Honor", model: "Honor Magic 6 Ultimate", family: "honor", sku: "MLS-AN10" },
  { brand: "Honor", model: "Honor Magic 6", family: "honor", sku: "BVL-AN00" },
  { brand: "Honor", model: "Honor Magic 5 Pro", family: "honor", sku: "PGT-N09" },
  { brand: "Honor", model: "Honor Magic 5 Ultimate", family: "honor", sku: "PGT-AN10" },
  { brand: "Honor", model: "Honor Magic 5", family: "honor", sku: "PGT-AN00" },
  { brand: "Honor", model: "Honor Magic V3", family: "samsung_z_fold", sku: "MCO-AN00" },
  { brand: "Honor", model: "Honor Magic V2", family: "samsung_z_fold", sku: "VER-AN00" },
  { brand: "Honor", model: "Honor Magic Vs", family: "samsung_z_fold", sku: "FLQ-AN00" },
  { brand: "Honor", model: "Honor 200 Pro", family: "honor", sku: "REP-AL00" },
  { brand: "Honor", model: "Honor 200", family: "honor", sku: "REP-NX9" },
  { brand: "Honor", model: "Honor 90 Pro", family: "honor", sku: "REA-AN00" },
  { brand: "Honor", model: "Honor 90", family: "honor", sku: "REA-NX9" },
  { brand: "Honor", model: "Honor 80 Pro", family: "honor", sku: "PNA-AN00" },
  { brand: "Honor", model: "Honor 80", family: "honor", sku: "CRT-NX9" },
  { brand: "Honor", model: "Honor 70 Pro", family: "honor", sku: "RNE-AN00" },
  { brand: "Honor", model: "Honor 70", family: "honor", sku: "FNE-NX9" },
  { brand: "Honor", model: "Honor X9b", family: "honor", sku: "ALI-NX3" },
  { brand: "Honor", model: "Honor X9a", family: "honor", sku: "RMO-NX1" },
  { brand: "Honor", model: "Honor X8b", family: "honor", sku: "LLY-NX1" },
  { brand: "Honor", model: "Honor X8a", family: "honor", sku: "CRT-LX1" },
  { brand: "Honor", model: "Honor X7b", family: "honor", sku: "AIT-LX1" },

  // ════════════════════════════════════════════
  // SONY XPERIA
  // ════════════════════════════════════════════
  { brand: "Sony", model: "Sony Xperia 1 VI", family: "sony", sku: "XQ-EC72" },
  { brand: "Sony", model: "Sony Xperia 1 V", family: "sony", sku: "XQ-DQ72" },
  { brand: "Sony", model: "Sony Xperia 1 IV", family: "sony", sku: "XQ-CT72" },
  { brand: "Sony", model: "Sony Xperia 1 III", family: "sony", sku: "XQ-BC72" },
  { brand: "Sony", model: "Sony Xperia 5 VI", family: "sony", sku: "XQ-ES72" },
  { brand: "Sony", model: "Sony Xperia 5 V", family: "sony", sku: "XQ-DE72" },
  { brand: "Sony", model: "Sony Xperia 5 IV", family: "sony", sku: "XQ-CQ72" },
  { brand: "Sony", model: "Sony Xperia 5 III", family: "sony", sku: "XQ-BQ72" },
  { brand: "Sony", model: "Sony Xperia 10 VI", family: "sony", sku: "XQ-ES44" },
  { brand: "Sony", model: "Sony Xperia 10 V", family: "sony", sku: "XQ-DC72" },
  { brand: "Sony", model: "Sony Xperia 10 IV", family: "sony", sku: "XQ-CC72" },
  { brand: "Sony", model: "Sony Xperia 10 III", family: "sony", sku: "XQ-BT52" },

  // ════════════════════════════════════════════
  // NOKIA
  // ════════════════════════════════════════════
  { brand: "Nokia", model: "Nokia G42 5G", family: "nokia", sku: "TA-1581" },
  { brand: "Nokia", model: "Nokia G22", family: "nokia", sku: "TA-1528" },
  { brand: "Nokia", model: "Nokia G21", family: "nokia", sku: "TA-1418" },
  { brand: "Nokia", model: "Nokia G20", family: "nokia", sku: "TA-1336" },
  { brand: "Nokia", model: "Nokia G10", family: "nokia", sku: "TA-1334" },
  { brand: "Nokia", model: "Nokia X30 5G", family: "nokia", sku: "TA-1450" },
  { brand: "Nokia", model: "Nokia X20", family: "nokia", sku: "TA-1341" },
  { brand: "Nokia", model: "Nokia X10", family: "nokia", sku: "TA-1332" },
  { brand: "Nokia", model: "Nokia C32", family: "nokia", sku: "TA-1534" },
  { brand: "Nokia", model: "Nokia C22", family: "nokia", sku: "TA-1530" },
  { brand: "Nokia", model: "Nokia C21", family: "nokia", sku: "TA-1356" },
  { brand: "Nokia", model: "Nokia C12", family: "nokia", sku: "TA-1524" },

  // ════════════════════════════════════════════
  // REALME
  // ════════════════════════════════════════════
  { brand: "Realme", model: "Realme GT 6 Pro", family: "realme", sku: "RMX3900" },
  { brand: "Realme", model: "Realme GT 6", family: "realme", sku: "RMX3851" },
  { brand: "Realme", model: "Realme GT 5 Pro", family: "realme", sku: "RMX3888" },
  { brand: "Realme", model: "Realme GT 5", family: "realme", sku: "RMX3706" },
  { brand: "Realme", model: "Realme GT 3 Pro", family: "realme", sku: "RMX3741" },
  { brand: "Realme", model: "Realme GT 3", family: "realme", sku: "RMX3741" },
  { brand: "Realme", model: "Realme GT Neo 6", family: "realme", sku: "RMX3900" },
  { brand: "Realme", model: "Realme GT Neo 5", family: "realme", sku: "RMX3706" },
  { brand: "Realme", model: "Realme 13 Pro+", family: "realme", sku: "RMX3888" },
  { brand: "Realme", model: "Realme 13 Pro", family: "realme", sku: "RMX3851" },
  { brand: "Realme", model: "Realme 13", family: "realme", sku: "RMX3900" },
  { brand: "Realme", model: "Realme 12 Pro+", family: "realme", sku: "RMX3840" },
  { brand: "Realme", model: "Realme 12 Pro", family: "realme", sku: "RMX3840" },
  { brand: "Realme", model: "Realme 12", family: "realme", sku: "RMX3825" },
  { brand: "Realme", model: "Realme 11 Pro+", family: "realme", sku: "RMX3741" },
  { brand: "Realme", model: "Realme 11 Pro", family: "realme", sku: "RMX3771" },
  { brand: "Realme", model: "Realme 11", family: "realme", sku: "RMX3636" },
  { brand: "Realme", model: "Realme 10 Pro+", family: "realme", sku: "RMX3686" },
  { brand: "Realme", model: "Realme 10 Pro", family: "realme", sku: "RMX3686" },
  { brand: "Realme", model: "Realme C67", family: "realme", sku: "RMX3890" },
  { brand: "Realme", model: "Realme C55", family: "realme", sku: "RMX3710" },
  { brand: "Realme", model: "Realme C53", family: "realme", sku: "RMX3760" },
  { brand: "Realme", model: "Realme C35", family: "realme", sku: "RMX3511" },

  // ════════════════════════════════════════════
  // VIVO / iQOO
  // ════════════════════════════════════════════
  { brand: "Vivo", model: "Vivo X200 Ultra", family: "vivo", sku: "V2411A" },
  { brand: "Vivo", model: "Vivo X200 Pro", family: "vivo", sku: "V2412A" },
  { brand: "Vivo", model: "Vivo X200", family: "vivo", sku: "V2407A" },
  { brand: "Vivo", model: "Vivo X100 Ultra", family: "vivo", sku: "V2327A" },
  { brand: "Vivo", model: "Vivo X100 Pro", family: "vivo", sku: "V2324A" },
  { brand: "Vivo", model: "Vivo X100", family: "vivo", sku: "V2309A" },
  { brand: "Vivo", model: "Vivo X90 Pro", family: "vivo", sku: "V2227A" },
  { brand: "Vivo", model: "Vivo X90", family: "vivo", sku: "V2219A" },
  { brand: "Vivo", model: "Vivo V40 Pro", family: "vivo", sku: "V2404A" },
  { brand: "Vivo", model: "Vivo V40", family: "vivo", sku: "V2406A" },
  { brand: "Vivo", model: "Vivo V30 Pro", family: "vivo", sku: "V2317A" },
  { brand: "Vivo", model: "Vivo V30", family: "vivo", sku: "V2319A" },
  { brand: "Vivo", model: "Vivo V29 Pro", family: "vivo", sku: "V2234A" },
  { brand: "Vivo", model: "Vivo V29", family: "vivo", sku: "V2246A" },
  { brand: "Vivo", model: "iQOO 13 Pro", family: "vivo", sku: "V2413A" },
  { brand: "Vivo", model: "iQOO 13", family: "vivo", sku: "V2411A" },
  { brand: "Vivo", model: "iQOO 12 Pro", family: "vivo", sku: "V2312A" },
  { brand: "Vivo", model: "iQOO 12", family: "vivo", sku: "V2307A" },
  { brand: "Vivo", model: "iQOO Neo 9 Pro", family: "vivo", sku: "V2348A" },
  { brand: "Vivo", model: "iQOO Neo 9", family: "vivo", sku: "V2344A" },

  // ════════════════════════════════════════════
  // ZTE / NUBIA
  // ════════════════════════════════════════════
  { brand: "ZTE", model: "ZTE Axon 60 Ultra", family: "zte", sku: "ZTE-A2024P" },
  { brand: "ZTE", model: "ZTE Axon 50 Ultra", family: "zte", sku: "ZTE-A2023P" },
  { brand: "ZTE", model: "ZTE Axon 40 Ultra", family: "zte", sku: "ZTE-A2022P" },
  { brand: "ZTE", model: "ZTE Blade V50 Design", family: "zte", sku: "ZTE-V50" },
  { brand: "ZTE", model: "Nubia Z70 Ultra", family: "zte", sku: "NX712J" },
  { brand: "ZTE", model: "Nubia Z60 Ultra", family: "zte", sku: "NX709J" },
  { brand: "ZTE", model: "Nubia Z50 Ultra", family: "zte", sku: "NX611J" },
  { brand: "ZTE", model: "Nubia Red Magic 10 Pro", family: "zte", sku: "NX679J" },
  { brand: "ZTE", model: "Nubia Red Magic 9 Pro", family: "zte", sku: "NX769J" },
  { brand: "ZTE", model: "Nubia Red Magic 8 Pro", family: "zte", sku: "NX769S" },

  // ════════════════════════════════════════════
  // NOTHING
  // ════════════════════════════════════════════
  { brand: "Nothing", model: "Nothing Phone 3a Pro", family: "nothing", sku: "A065" },
  { brand: "Nothing", model: "Nothing Phone 3a", family: "nothing", sku: "A063" },
  { brand: "Nothing", model: "Nothing Phone 2a Plus", family: "nothing", sku: "A059" },
  { brand: "Nothing", model: "Nothing Phone 2a", family: "nothing", sku: "A057" },
  { brand: "Nothing", model: "Nothing Phone 2", family: "nothing", sku: "A065" },
  { brand: "Nothing", model: "Nothing Phone 1", family: "nothing", sku: "A063" },
  { brand: "Nothing", model: "Nothing CMF Phone 1", family: "nothing", sku: "A015" },

  // ════════════════════════════════════════════
  // FAIRPHONE
  // ════════════════════════════════════════════
  { brand: "Fairphone", model: "Fairphone 5", family: "fairphone", sku: "FP5" },
  { brand: "Fairphone", model: "Fairphone 4", family: "fairphone", sku: "FP4" },
  { brand: "Fairphone", model: "Fairphone 3+", family: "fairphone", sku: "FP3+" },
  { brand: "Fairphone", model: "Fairphone 3", family: "fairphone", sku: "FP3" },

  // ════════════════════════════════════════════
  // TCL / ALCATEL
  // ════════════════════════════════════════════
  { brand: "TCL", model: "TCL 50 Pro 5G", family: "tcl", sku: "T775H" },
  { brand: "TCL", model: "TCL 50 5G", family: "tcl", sku: "T776H" },
  { brand: "TCL", model: "TCL 40 R 5G", family: "tcl", sku: "T671H" },
  { brand: "TCL", model: "TCL 40 NXTpaper", family: "tcl", sku: "T612H" },
  { brand: "TCL", model: "TCL 30+", family: "tcl", sku: "T776H" },
  { brand: "TCL", model: "TCL 20 Pro 5G", family: "tcl", sku: "T810H" },
  { brand: "TCL", model: "Alcatel 3L", family: "tcl", sku: "5029D" },
  { brand: "TCL", model: "Alcatel 1S", family: "tcl", sku: "5028D" },

  // ════════════════════════════════════════════
  // WIKO
  // ════════════════════════════════════════════
  { brand: "Wiko", model: "Wiko T60", family: "wiko", sku: "T60" },
  { brand: "Wiko", model: "Wiko T50", family: "wiko", sku: "T50" },
  { brand: "Wiko", model: "Wiko T40", family: "wiko", sku: "T40" },
  { brand: "Wiko", model: "Wiko Power U30", family: "wiko", sku: "W-K130" },
  { brand: "Wiko", model: "Wiko Fever SE", family: "wiko", sku: "W-K400" },
  { brand: "Wiko", model: "Wiko Y82", family: "wiko", sku: "W-K430" },
  { brand: "Wiko", model: "Wiko Y62", family: "wiko", sku: "W-K220" },
  { brand: "Wiko", model: "Wiko View 5", family: "wiko", sku: "W-K400" },
  { brand: "Wiko", model: "Wiko View 4", family: "wiko", sku: "W-K210" },

  // ════════════════════════════════════════════
  // ASUS
  // ════════════════════════════════════════════
  { brand: "Asus", model: "Asus ROG Phone 9 Pro", family: "asus", sku: "AI2502-D" },
  { brand: "Asus", model: "Asus ROG Phone 9", family: "asus", sku: "AI2502-C" },
  { brand: "Asus", model: "Asus ROG Phone 8 Pro", family: "asus", sku: "AI2401-D" },
  { brand: "Asus", model: "Asus ROG Phone 8", family: "asus", sku: "AI2401-C" },
  { brand: "Asus", model: "Asus ROG Phone 7 Ultimate", family: "asus", sku: "AI2205-1D" },
  { brand: "Asus", model: "Asus ROG Phone 7", family: "asus", sku: "AI2205-1C" },
  { brand: "Asus", model: "Asus Zenfone 11 Ultra", family: "asus", sku: "AI2401-1" },
  { brand: "Asus", model: "Asus Zenfone 10", family: "asus", sku: "AI2302" },
  { brand: "Asus", model: "Asus Zenfone 9", family: "asus", sku: "AI2202" },

  // ════════════════════════════════════════════
  // INFINIX
  // ════════════════════════════════════════════
  { brand: "Infinix", model: "Infinix Zero 40 Pro", family: "infinix", sku: "X6965B" },
  { brand: "Infinix", model: "Infinix Zero 40", family: "infinix", sku: "X6963" },
  { brand: "Infinix", model: "Infinix Note 40 Pro", family: "infinix", sku: "X6851B" },
  { brand: "Infinix", model: "Infinix Note 40", family: "infinix", sku: "X6853" },
  { brand: "Infinix", model: "Infinix Note 30 Pro", family: "infinix", sku: "X678B" },
  { brand: "Infinix", model: "Infinix Note 30", family: "infinix", sku: "X6833B" },
  { brand: "Infinix", model: "Infinix Hot 40 Pro", family: "infinix", sku: "X6837" },
  { brand: "Infinix", model: "Infinix Hot 40", family: "infinix", sku: "X6836" },
  { brand: "Infinix", model: "Infinix Hot 30i", family: "infinix", sku: "X669" },
  { brand: "Infinix", model: "Infinix Smart 8 Pro", family: "infinix", sku: "X6526" },
  { brand: "Infinix", model: "Infinix Smart 8", family: "infinix", sku: "X6525" },

  // ════════════════════════════════════════════
  // TECNO
  // ════════════════════════════════════════════
  { brand: "Tecno", model: "Tecno Phantom X2 Pro", family: "tecno", sku: "AD8Pro" },
  { brand: "Tecno", model: "Tecno Phantom X2", family: "tecno", sku: "AD8" },
  { brand: "Tecno", model: "Tecno Camon 30 Pro", family: "tecno", sku: "CL8" },
  { brand: "Tecno", model: "Tecno Camon 30", family: "tecno", sku: "CL7" },
  { brand: "Tecno", model: "Tecno Camon 20 Pro", family: "tecno", sku: "CK8n" },
  { brand: "Tecno", model: "Tecno Camon 20", family: "tecno", sku: "CK6" },
  { brand: "Tecno", model: "Tecno Spark 20 Pro", family: "tecno", sku: "KJ7" },
  { brand: "Tecno", model: "Tecno Spark 20", family: "tecno", sku: "KJ5" },
  { brand: "Tecno", model: "Tecno Pop 8", family: "tecno", sku: "BG6" },

  // ════════════════════════════════════════════
  // ITEL
  // ════════════════════════════════════════════
  { brand: "itel", model: "itel A70", family: "itel", sku: "A665L" },
  { brand: "itel", model: "itel A60s", family: "itel", sku: "A603W" },
  { brand: "itel", model: "itel P55+", family: "itel", sku: "P663L" },
  { brand: "itel", model: "itel P40", family: "itel", sku: "P682L" },
  { brand: "itel", model: "itel S23+", family: "itel", sku: "S681LN" },

  // ════════════════════════════════════════════
  // LG (modèles encore en réparation)
  // ════════════════════════════════════════════
  { brand: "LG", model: "LG Velvet", family: "lg", sku: "LM-G900" },
  { brand: "LG", model: "LG V60 ThinQ", family: "lg", sku: "LM-V600" },
  { brand: "LG", model: "LG V50 ThinQ", family: "lg", sku: "LM-V500" },
  { brand: "LG", model: "LG G8 ThinQ", family: "lg", sku: "LM-G820" },
  { brand: "LG", model: "LG G7 ThinQ", family: "lg", sku: "LM-G710" },
  { brand: "LG", model: "LG K92", family: "lg", sku: "LM-K920" },
  { brand: "LG", model: "LG K52", family: "lg", sku: "LM-K520" },
  { brand: "LG", model: "LG K42", family: "lg", sku: "LM-K420" },
  { brand: "LG", model: "LG Wing", family: "lg", sku: "LM-F100N" },

  // ════════════════════════════════════════════
  // Consoles / Gaming (déjà en base)
  // ════════════════════════════════════════════
  { brand: "Sony", model: "PlayStation 5", family: "generic", sku: "CFI-1016A" },
  { brand: "Sony", model: "PlayStation 5 Slim", family: "generic", sku: "CFI-2016" },
  { brand: "Sony", model: "PlayStation 4 Pro", family: "generic", sku: "CUH-7216B" },
  { brand: "Sony", model: "PlayStation 4", family: "generic", sku: "CUH-1216A" },
  { brand: "Microsoft", model: "Xbox Series X", family: "generic", sku: "RRT-00001" },
  { brand: "Microsoft", model: "Xbox Series S", family: "generic", sku: "RRS-00001" },
  { brand: "Microsoft", model: "Xbox One X", family: "generic", sku: "FMQ-00001" },
  { brand: "Microsoft", model: "Xbox One S", family: "generic", sku: "ZQ9-00001" },
  { brand: "Nintendo", model: "Nintendo Switch OLED", family: "generic", sku: "HEG-001" },
  { brand: "Nintendo", model: "Nintendo Switch", family: "generic", sku: "HAC-001" },
  { brand: "Nintendo", model: "Nintendo Switch Lite", family: "generic", sku: "HDH-001" },
  { brand: "Valve", model: "Steam Deck OLED", family: "generic", sku: "1030" },
  { brand: "Valve", model: "Steam Deck", family: "generic", sku: "1010" },
  { brand: "Asus", model: "Asus ROG Ally X", family: "asus", sku: "RC72LA" },
  { brand: "Asus", model: "Asus ROG Ally", family: "asus", sku: "RC71L" },
  { brand: "Lenovo", model: "Lenovo Legion Go", family: "generic", sku: "83E1" },
  // MacBook
  { brand: "Apple", model: "MacBook Pro M4 Max 16\"", family: "generic", sku: "MX2Y3LL/A" },
  { brand: "Apple", model: "MacBook Pro M4 Pro 14\"", family: "generic", sku: "MX2D3LL/A" },
  { brand: "Apple", model: "MacBook Pro M3 Max 16\"", family: "generic", sku: "MRW33LL/A" },
  { brand: "Apple", model: "MacBook Pro M3 Pro 14\"", family: "generic", sku: "MRX33LL/A" },
  { brand: "Apple", model: "MacBook Pro M2 Max 16\"", family: "generic", sku: "MNWA3LL/A" },
  { brand: "Apple", model: "MacBook Air M3 15\"", family: "generic", sku: "MRYU3LL/A" },
  { brand: "Apple", model: "MacBook Air M3 13\"", family: "generic", sku: "MRXN3LL/A" },
  { brand: "Apple", model: "MacBook Air M2 15\"", family: "generic", sku: "MQKP3LL/A" },
  { brand: "Apple", model: "MacBook Air M2 13\"", family: "generic", sku: "MLY33LL/A" },
  // Apple Watch
  { brand: "Apple", model: "Apple Watch Ultra 2", family: "generic", sku: "A2986" },
  { brand: "Apple", model: "Apple Watch Series 10", family: "generic", sku: "A3051" },
  { brand: "Apple", model: "Apple Watch Series 9", family: "generic", sku: "A2978" },
  { brand: "Apple", model: "Apple Watch SE (2e gen)", family: "generic", sku: "A2723" },
  { brand: "Apple", model: "Apple Watch Series 8", family: "generic", sku: "A2771" },
  { brand: "Apple", model: "Apple Watch Series 7", family: "generic", sku: "A2477" },

  // ════════════════════════════════════════════
  // APPLE — iPhone 17 (2025)
  // ════════════════════════════════════════════
  { brand: "Apple", model: "iPhone 17 Pro Max", family: "apple_iphone_modern", sku: "A3628" },
  { brand: "Apple", model: "iPhone 17 Pro", family: "apple_iphone_modern", sku: "A3626" },
  { brand: "Apple", model: "iPhone 17 Air", family: "apple_iphone_modern", sku: "A3624" },
  { brand: "Apple", model: "iPhone 17", family: "apple_iphone_modern", sku: "A3622" },

  // ════════════════════════════════════════════
  // APPLE — iPad supplémentaires
  // ════════════════════════════════════════════
  { brand: "Apple", model: "iPad Pro 13\" M4 (Wi-Fi + Cellular)", family: "apple_ipad", sku: "A2925" },
  { brand: "Apple", model: "iPad Air 13\" M2", family: "apple_ipad", sku: "A2898" },
  { brand: "Apple", model: "iPad Air 11\" M2", family: "apple_ipad", sku: "A2902" },
  { brand: "Apple", model: "iPad Pro 12.9\" (1e gen)", family: "apple_ipad", sku: "A1584" },
  { brand: "Apple", model: "iPad Air 2", family: "apple_ipad", sku: "A1566" },
  { brand: "Apple", model: "iPad mini 3", family: "apple_ipad", sku: "A1599" },
  { brand: "Apple", model: "iPad mini 2", family: "apple_ipad", sku: "A1489" },
  { brand: "Apple", model: "iPad 6e gen", family: "apple_ipad", sku: "A1893" },
  { brand: "Apple", model: "iPad 5e gen", family: "apple_ipad", sku: "A1822" },
  { brand: "Apple", model: "iPad 4e gen", family: "apple_ipad", sku: "A1458" },
  // MacBook supplémentaires
  { brand: "Apple", model: "MacBook Pro M4 16\"", family: "generic", sku: "MX2Y3LL/A" },
  { brand: "Apple", model: "MacBook Pro M4 14\"", family: "generic", sku: "MX2D3LL/A" },
  { brand: "Apple", model: "MacBook Air M4 15\"", family: "generic", sku: "MRYU3LL/A" },
  { brand: "Apple", model: "MacBook Air M4 13\"", family: "generic", sku: "MRXN3LL/A" },
  { brand: "Apple", model: "MacBook Pro 13\" Intel", family: "generic", sku: "MYD82LL/A" },
  { brand: "Apple", model: "MacBook Air 2020 Intel", family: "generic", sku: "MVH42LL/A" },
  // Apple Watch supplémentaires
  { brand: "Apple", model: "Apple Watch Ultra", family: "generic", sku: "A2622" },
  { brand: "Apple", model: "Apple Watch Series 6", family: "generic", sku: "A2293" },
  { brand: "Apple", model: "Apple Watch Series 5", family: "generic", sku: "A2156" },
  { brand: "Apple", model: "Apple Watch SE 1e gen", family: "generic", sku: "A2355" },
  { brand: "Apple", model: "Apple Watch Series 4", family: "generic", sku: "A1978" },
  { brand: "Apple", model: "Apple Watch Series 3", family: "generic", sku: "A1860" },

  // ════════════════════════════════════════════
  // SAMSUNG — Galaxy S (2025 + anciens)
  // ════════════════════════════════════════════
  { brand: "Samsung", model: "Galaxy S25 FE", family: "samsung_s_flagship", sku: "SM-S731B" },
  { brand: "Samsung", model: "Galaxy S25 Edge", family: "samsung_s_flagship", sku: "SM-S937B" },
  { brand: "Samsung", model: "Galaxy S7", family: "samsung_s_flagship", sku: "SM-G930F" },
  { brand: "Samsung", model: "Galaxy S7 Edge", family: "samsung_s_flagship", sku: "SM-G935F" },
  { brand: "Samsung", model: "Galaxy S6", family: "samsung_s_flagship", sku: "SM-G920F" },
  { brand: "Samsung", model: "Galaxy S6 Edge", family: "samsung_s_flagship", sku: "SM-G925F" },
  // Galaxy A supplémentaires
  { brand: "Samsung", model: "Galaxy A73", family: "samsung_a_mid", sku: "SM-A736B" },
  { brand: "Samsung", model: "Galaxy A72", family: "samsung_a_mid", sku: "SM-A725F" },
  { brand: "Samsung", model: "Galaxy A71", family: "samsung_a_mid", sku: "SM-A715F" },
  { brand: "Samsung", model: "Galaxy A70", family: "samsung_a_mid", sku: "SM-A705F" },
  { brand: "Samsung", model: "Galaxy A42", family: "samsung_a_mid", sku: "SM-A426B" },
  { brand: "Samsung", model: "Galaxy A41", family: "samsung_a_mid", sku: "SM-A415F" },
  { brand: "Samsung", model: "Galaxy A40", family: "samsung_a_mid", sku: "SM-A405F" },
  { brand: "Samsung", model: "Galaxy A21s", family: "samsung_a_mid", sku: "SM-A217F" },
  { brand: "Samsung", model: "Galaxy A20s", family: "samsung_a_mid", sku: "SM-A207F" },
  { brand: "Samsung", model: "Galaxy A10s", family: "samsung_a_mid", sku: "SM-A107F" },
  { brand: "Samsung", model: "Galaxy M34", family: "samsung_a_mid", sku: "SM-M346B" },
  { brand: "Samsung", model: "Galaxy M14", family: "samsung_a_mid", sku: "SM-M146B" },
  { brand: "Samsung", model: "Galaxy F15", family: "samsung_a_mid", sku: "SM-E156B" },
  // Z Fold supplémentaires
  { brand: "Samsung", model: "Galaxy Z Fold 7", family: "samsung_z_fold", sku: "SM-F968B" },
  // Z Flip supplémentaires
  { brand: "Samsung", model: "Galaxy Z Flip 7", family: "samsung_z_flip", sku: "SM-F771B" },
  { brand: "Samsung", model: "Galaxy Z Flip 2", family: "samsung_z_flip", sku: "SM-F707B" },

  // ════════════════════════════════════════════
  // XIAOMI — modèles 2025 + manquants
  // ════════════════════════════════════════════
  { brand: "Xiaomi", model: "Xiaomi 15 Ultra", family: "xiaomi_flagship", sku: "24121APCTU" },
  { brand: "Xiaomi", model: "Xiaomi 15S Pro", family: "xiaomi_flagship", sku: "25031PN91G" },
  { brand: "Xiaomi", model: "Xiaomi Mix Fold 5", family: "samsung_z_fold", sku: "25022PN7DG" },
  { brand: "Xiaomi", model: "Xiaomi Mix Fold 4", family: "samsung_z_fold", sku: "24053PY09G" },
  { brand: "Xiaomi", model: "Xiaomi Mix Flip", family: "samsung_z_flip", sku: "2405CPX3DG" },
  { brand: "Xiaomi", model: "Redmi Note 14 Pro+ 5G", family: "xiaomi_mid", sku: "24117RA68G" },
  { brand: "Xiaomi", model: "Redmi Note 14 Turbo", family: "xiaomi_mid", sku: "24109PCD8G" },
  { brand: "Xiaomi", model: "Redmi Note 8 Pro", family: "xiaomi_mid", sku: "M1906G7G" },
  { brand: "Xiaomi", model: "Redmi Note 8", family: "xiaomi_mid", sku: "M1908C3JG" },
  { brand: "Xiaomi", model: "Redmi Note 7", family: "xiaomi_mid", sku: "M1901F7G" },
  { brand: "Xiaomi", model: "Redmi 14R", family: "xiaomi_mid", sku: "24116RA5IG" },
  { brand: "Xiaomi", model: "Redmi 8A", family: "xiaomi_mid", sku: "M1908C3KG" },
  { brand: "Xiaomi", model: "Redmi 6A", family: "xiaomi_mid", sku: "MZB6548IN" },
  { brand: "Xiaomi", model: "POCO F7 Ultra", family: "xiaomi_flagship", sku: "25012PC75G" },
  { brand: "Xiaomi", model: "POCO F7 Pro", family: "xiaomi_flagship", sku: "25011PFN5G" },
  { brand: "Xiaomi", model: "POCO X7 Pro", family: "xiaomi_mid", sku: "24129PC91G" },
  { brand: "Xiaomi", model: "POCO X7", family: "xiaomi_mid", sku: "24128PC91G" },
  { brand: "Xiaomi", model: "POCO M7 Pro", family: "xiaomi_mid", sku: "24073PY49I" },
  { brand: "Xiaomi", model: "POCO C75", family: "xiaomi_mid", sku: "24101SC91G" },

  // ════════════════════════════════════════════
  // GOOGLE — Pixel 2025
  // ════════════════════════════════════════════
  { brand: "Google", model: "Pixel 10 Pro XL", family: "google_pixel", sku: "GP5BC" },
  { brand: "Google", model: "Pixel 10 Pro", family: "google_pixel", sku: "GP5BB" },
  { brand: "Google", model: "Pixel 10", family: "google_pixel", sku: "GP5BA" },
  { brand: "Google", model: "Pixel 9 Pro Fold 2", family: "google_pixel", sku: "GP4BG" },
  { brand: "Google", model: "Pixel 3a XL", family: "google_pixel", sku: "G020C" },
  { brand: "Google", model: "Pixel 3a", family: "google_pixel", sku: "G020G" },

  // ════════════════════════════════════════════
  // OnePlus — 2025
  // ════════════════════════════════════════════
  { brand: "OnePlus", model: "OnePlus 13s", family: "oneplus", sku: "CPH2691" },
  { brand: "OnePlus", model: "OnePlus 13T", family: "oneplus", sku: "CPH2709" },
  { brand: "OnePlus", model: "OnePlus Nord CE 5", family: "oneplus", sku: "CPH2707" },
  { brand: "OnePlus", model: "OnePlus Nord 5", family: "oneplus", sku: "CPH2699" },
  { brand: "OnePlus", model: "OnePlus 7T Pro", family: "oneplus", sku: "HD1913" },
  { brand: "OnePlus", model: "OnePlus 7T", family: "oneplus", sku: "HD1901" },
  { brand: "OnePlus", model: "OnePlus 7 Pro", family: "oneplus", sku: "GM1913" },
  { brand: "OnePlus", model: "OnePlus 6T", family: "oneplus", sku: "A6013" },
  { brand: "OnePlus", model: "OnePlus 6", family: "oneplus", sku: "A6003" },

  // ════════════════════════════════════════════
  // OPPO — 2025
  // ════════════════════════════════════════════
  { brand: "OPPO", model: "OPPO Find X8 Ultra", family: "oppo", sku: "PHY210" },
  { brand: "OPPO", model: "OPPO Find X9 Pro", family: "oppo", sku: "CPH2719" },
  { brand: "OPPO", model: "OPPO Reno 13 Pro", family: "oppo", sku: "CPH2675" },
  { brand: "OPPO", model: "OPPO Reno 13", family: "oppo", sku: "CPH2659" },
  { brand: "OPPO", model: "OPPO A3 Pro", family: "oppo", sku: "CPH2657" },
  { brand: "OPPO", model: "OPPO A3", family: "oppo", sku: "CPH2655" },
  { brand: "OPPO", model: "OPPO A79", family: "oppo", sku: "CPH2553" },
  { brand: "OPPO", model: "OPPO A59", family: "oppo", sku: "CPH2635" },

  // ════════════════════════════════════════════
  // MOTOROLA — 2025
  // ════════════════════════════════════════════
  { brand: "Motorola", model: "Motorola Edge 60 Ultra", family: "motorola", sku: "XT2465-1" },
  { brand: "Motorola", model: "Motorola Edge 60 Pro", family: "motorola", sku: "XT2463-1" },
  { brand: "Motorola", model: "Motorola Edge 60 Fusion", family: "motorola", sku: "XT2461-1" },
  { brand: "Motorola", model: "Motorola Edge 60", family: "motorola", sku: "XT2459-1" },
  { brand: "Motorola", model: "Moto G Stylus 5G", family: "motorola", sku: "XT2435-1" },
  { brand: "Motorola", model: "Moto G Power 5G", family: "motorola", sku: "XT2435-2" },
  { brand: "Motorola", model: "Motorola Razr 60 Ultra", family: "samsung_z_flip", sku: "XT2481-1" },
  { brand: "Motorola", model: "Motorola Razr 60", family: "samsung_z_flip", sku: "XT2479-1" },
  { brand: "Motorola", model: "Moto G73", family: "motorola", sku: "XT2237-2" },
  { brand: "Motorola", model: "Moto G53", family: "motorola", sku: "XT2335-2" },
  { brand: "Motorola", model: "Moto G23", family: "motorola", sku: "XT2333-2" },
  { brand: "Motorola", model: "Moto G13", family: "motorola", sku: "XT2331-2" },

  // ════════════════════════════════════════════
  // HUAWEI — 2025
  // ════════════════════════════════════════════
  { brand: "Huawei", model: "Huawei Mate X5", family: "samsung_z_fold", sku: "ALT-AL10" },
  { brand: "Huawei", model: "Huawei Pura 80 Ultra", family: "huawei", sku: "BVL-AN80" },
  { brand: "Huawei", model: "Huawei Pura 80 Pro", family: "huawei", sku: "BVL-AN70" },
  { brand: "Huawei", model: "Huawei Pura 80", family: "huawei", sku: "BVL-AN60" },
  { brand: "Huawei", model: "Huawei Nova 13i", family: "huawei", sku: "MAO-LX3" },
  { brand: "Huawei", model: "Huawei Nova 11i", family: "huawei", sku: "MAO-LX9" },
  { brand: "Huawei", model: "Huawei Y9s", family: "huawei", sku: "STK-L21" },
  { brand: "Huawei", model: "Huawei Y9a", family: "huawei", sku: "FRL-L22" },

  // ════════════════════════════════════════════
  // HONOR — 2025
  // ════════════════════════════════════════════
  { brand: "Honor", model: "Honor Magic 8 Pro", family: "honor", sku: "MRS-AN00" },
  { brand: "Honor", model: "Honor Magic 8", family: "honor", sku: "MRS-AN10" },
  { brand: "Honor", model: "Honor Magic V4", family: "samsung_z_fold", sku: "VIC-AN00" },
  { brand: "Honor", model: "Honor 300 Pro", family: "honor", sku: "SYN-AN00" },
  { brand: "Honor", model: "Honor 300", family: "honor", sku: "SYN-AN10" },
  { brand: "Honor", model: "Honor X9c", family: "honor", sku: "REP-NX3" },
  { brand: "Honor", model: "Honor X8c", family: "honor", sku: "AYN-LX3" },
  { brand: "Honor", model: "Honor X6b", family: "honor", sku: "VNE-LX3" },

  // ════════════════════════════════════════════
  // SONY — 2025
  // ════════════════════════════════════════════
  { brand: "Sony", model: "Sony Xperia 1 VII", family: "sony", sku: "XQ-FD72" },
  { brand: "Sony", model: "Sony Xperia 5 VII", family: "sony", sku: "XQ-FE72" },
  { brand: "Sony", model: "Sony Xperia 10 VII", family: "sony", sku: "XQ-FF52" },

  // ════════════════════════════════════════════
  // NOTHING — 2025
  // ════════════════════════════════════════════
  { brand: "Nothing", model: "Nothing Phone 3", family: "nothing", sku: "A075" },
  { brand: "Nothing", model: "Nothing CMF Phone 2 Pro", family: "nothing", sku: "A073" },
  { brand: "Nothing", model: "Nothing CMF Phone 2", family: "nothing", sku: "A071" },

  // ════════════════════════════════════════════
  // REALME — 2025
  // ════════════════════════════════════════════
  { brand: "Realme", model: "Realme GT 7 Pro", family: "realme", sku: "RMX3910" },
  { brand: "Realme", model: "Realme GT 7", family: "realme", sku: "RMX3890" },
  { brand: "Realme", model: "Realme GT Neo 7", family: "realme", sku: "RMX3910" },
  { brand: "Realme", model: "Realme 14 Pro+", family: "realme", sku: "RMX3910" },
  { brand: "Realme", model: "Realme 14 Pro", family: "realme", sku: "RMX3910" },
  { brand: "Realme", model: "Realme 14", family: "realme", sku: "RMX3910" },
  { brand: "Realme", model: "Realme C75", family: "realme", sku: "RMX3890" },
  { brand: "Realme", model: "Realme C61", family: "realme", sku: "RMX3890" },

  // ════════════════════════════════════════════
  // VIVO — 2025
  // ════════════════════════════════════════════
  { brand: "Vivo", model: "Vivo X200 Ultra Mini", family: "vivo", sku: "V2501A" },
  { brand: "Vivo", model: "Vivo V50 Pro", family: "vivo", sku: "V2501A" },
  { brand: "Vivo", model: "Vivo V50", family: "vivo", sku: "V2503A" },
  { brand: "Vivo", model: "iQOO 14 Pro", family: "vivo", sku: "V2501A" },
  { brand: "Vivo", model: "iQOO 14", family: "vivo", sku: "V2503A" },
  { brand: "Vivo", model: "iQOO Neo 10 Pro", family: "vivo", sku: "V2505A" },
  { brand: "Vivo", model: "iQOO Neo 10", family: "vivo", sku: "V2507A" },
  { brand: "Vivo", model: "iQOO Z10 Turbo Pro", family: "vivo", sku: "V2509A" },

  // ════════════════════════════════════════════
  // NOKIA — supplémentaires
  // ════════════════════════════════════════════
  { brand: "Nokia", model: "Nokia G420", family: "nokia", sku: "TA-1624" },
  { brand: "Nokia", model: "Nokia G310", family: "nokia", sku: "TA-1585" },
  { brand: "Nokia", model: "Nokia C300", family: "nokia", sku: "TA-1543" },
  { brand: "Nokia", model: "Nokia 5.4", family: "nokia", sku: "TA-1333" },
  { brand: "Nokia", model: "Nokia 3.4", family: "nokia", sku: "TA-1288" },
  { brand: "Nokia", model: "Nokia 2.4", family: "nokia", sku: "TA-1270" },
  { brand: "Nokia", model: "Nokia 1.4", family: "nokia", sku: "TA-1322" },

  // ════════════════════════════════════════════
  // ASUS — 2025
  // ════════════════════════════════════════════
  { brand: "Asus", model: "Asus ROG Phone 9 Pro Edition", family: "asus", sku: "AI2502-E" },
  { brand: "Asus", model: "Asus Zenfone 12 Ultra", family: "asus", sku: "AI2501" },
  { brand: "Asus", model: "Asus ROG Ally 2", family: "asus", sku: "RC74L" },

  // ════════════════════════════════════════════
  // ZTE / NUBIA — 2025
  // ════════════════════════════════════════════
  { brand: "ZTE", model: "Nubia Red Magic 10S Pro", family: "zte", sku: "NX679S" },
  { brand: "ZTE", model: "Nubia Z70S Ultra", family: "zte", sku: "NX712S" },
  { brand: "ZTE", model: "ZTE Blade V60 Design", family: "zte", sku: "ZTE-V60" },

  // ════════════════════════════════════════════
  // INFINIX — supplémentaires
  // ════════════════════════════════════════════
  { brand: "Infinix", model: "Infinix Zero Ultra", family: "infinix", sku: "X9FD" },
  { brand: "Infinix", model: "Infinix Note 12 Pro", family: "infinix", sku: "X671B" },
  { brand: "Infinix", model: "Infinix Note 12", family: "infinix", sku: "X663D" },
  { brand: "Infinix", model: "Infinix Hot 30 Play", family: "infinix", sku: "X6835B" },
  { brand: "Infinix", model: "Infinix Hot 20i", family: "infinix", sku: "X665E" },
  { brand: "Infinix", model: "Infinix Smart 7", family: "infinix", sku: "X6515" },
  { brand: "Infinix", model: "Infinix Smart 6", family: "infinix", sku: "X6511D" },

  // ════════════════════════════════════════════
  // TECNO — supplémentaires
  // ════════════════════════════════════════════
  { brand: "Tecno", model: "Tecno Pova 6 Pro", family: "tecno", sku: "LH8n" },
  { brand: "Tecno", model: "Tecno Pova 5 Pro", family: "tecno", sku: "LH8" },
  { brand: "Tecno", model: "Tecno Camon 30 Premier", family: "tecno", sku: "CL9" },
  { brand: "Tecno", model: "Tecno Spark 30 Pro", family: "tecno", sku: "KJ9" },
  { brand: "Tecno", model: "Tecno Spark 30", family: "tecno", sku: "KJ7n" },
  { brand: "Tecno", model: "Tecno Pop 9", family: "tecno", sku: "BH9" },

  // ════════════════════════════════════════════
  // LG — supplémentaires
  // ════════════════════════════════════════════
  { brand: "LG", model: "LG V50S ThinQ", family: "lg", sku: "LM-V510N" },
  { brand: "LG", model: "LG G8X ThinQ", family: "lg", sku: "LM-G850" },
  { brand: "LG", model: "LG K62", family: "lg", sku: "LM-K525" },
  { brand: "LG", model: "LG Stylo 6", family: "lg", sku: "LM-Q730" },

  // ════════════════════════════════════════════
  // WIKO — supplémentaires
  // ════════════════════════════════════════════
  { brand: "Wiko", model: "Wiko Hi Enjoy 70 Pro", family: "wiko", sku: "W-K680" },
  { brand: "Wiko", model: "Wiko Hi Enjoy 60s", family: "wiko", sku: "W-K660" },
  { brand: "Wiko", model: "Wiko Hi Enjoy 50 Pro", family: "wiko", sku: "W-K640" },

  // ════════════════════════════════════════════
  // FAIRPHONE — 2025
  // ════════════════════════════════════════════
  { brand: "Fairphone", model: "Fairphone 6", family: "fairphone", sku: "FP6" },

  // ════════════════════════════════════════════
  // TCL — 2025
  // ════════════════════════════════════════════
  { brand: "TCL", model: "TCL 60 Pro 5G", family: "tcl", sku: "T795H" },
  { brand: "TCL", model: "TCL 60 5G", family: "tcl", sku: "T793H" },
  { brand: "TCL", model: "TCL 50 XE NXTpaper", family: "tcl", sku: "T609H" },
  { brand: "TCL", model: "Alcatel 5S", family: "tcl", sku: "5033D" },
  { brand: "TCL", model: "Alcatel 3X", family: "tcl", sku: "5048U" },

  // ════════════════════════════════════════════
  // CONSOLES — 2025
  // ════════════════════════════════════════════
  { brand: "Nintendo", model: "Nintendo Switch 2", family: "generic", sku: "HAC-001-02" },
  { brand: "Sony", model: "PlayStation 5 Pro", family: "generic", sku: "CFI-7000" },
];

// ─────────────────────────────────────────────
// FONCTIONS UTILITAIRES
// ─────────────────────────────────────────────

/** Formate le nom complet d'un device : "Apple iPhone 16 Pro A3292" */
export function deviceFullName(d: DeviceEntry): string {
  return d.sku ? `${d.brand} ${d.model} ${d.sku}` : `${d.brand} ${d.model}`;
}

/** Liste flat de tous les appareils au format "Marque Modèle [SKU]" — pour l'autocomplete */
export const DEVICES_LIST: string[] = DEVICES.map(deviceFullName);

/** Trouve un DeviceEntry depuis un nom complet, juste le modèle, ou le SKU */
export function findDevice(name: string): DeviceEntry | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  return (
    DEVICES.find((d) => deviceFullName(d).toLowerCase() === lower) ??
    DEVICES.find((d) => d.sku?.toLowerCase() === lower) ??
    DEVICES.find((d) => d.model.toLowerCase() === lower) ??
    DEVICES.find((d) => deviceFullName(d).toLowerCase().includes(lower)) ??
    DEVICES.find((d) => d.model.toLowerCase().includes(lower))
  );
}

/** Toutes les marques uniques */
export const BRANDS: string[] = [...new Set(DEVICES.map((d) => d.brand))];

/** Modèles d'une marque donnée */
export function getModelsByBrand(brand: string): DeviceEntry[] {
  return DEVICES.filter((d) => d.brand === brand);
}

/** Pièces d'un modèle donné (accepte "Marque Modèle" ou "Modèle" seul) */
export function getPartsForModel(modelName: string): Part[] {
  const device = findDevice(modelName);
  if (!device) return COMMON_PARTS;
  return PARTS_BY_FAMILY[device.family] ?? COMMON_PARTS;
}

/** Pièces groupées par catégorie pour un modèle */
export function getPartsGroupedByCategory(modelName: string): Record<PartCategory, Part[]> {
  const parts = getPartsForModel(modelName);
  const grouped = {} as Record<PartCategory, Part[]>;
  for (const part of parts) {
    if (!grouped[part.category]) grouped[part.category] = [];
    grouped[part.category].push(part);
  }
  return grouped;
}

// ─────────────────────────────────────────────
// SUGGESTIONS INTELLIGENTES DE PANNES
// ─────────────────────────────────────────────

/** Pannes types communes à tous les smartphones */
const ISSUES_GENERIC: string[] = [
  "Écran cassé / fissuré",
  "Écran noir (ne s'allume plus)",
  "Écran tactile ne répond pas / partiellement",
  "Écran avec lignes / traces / pixels morts",
  "Écran qui clignote / scintille",
  "Batterie qui ne tient plus la charge",
  "Batterie qui gonfle",
  "Ne charge plus",
  "Charge très lente",
  "Port de charge cassé / oxydé",
  "Haut-parleur grésille / distordu",
  "Haut-parleur principal HS",
  "Écouteur interne HS (pas de son en appel)",
  "Micro ne fonctionne pas",
  "Pas de son / muet",
  "Caméra avant floue / HS",
  "Caméra arrière principale floue",
  "Flash HS",
  "Pas de réseau / pas de SIM détectée",
  "SIM non reconnue",
  "Wi-Fi ne fonctionne pas / se déconnecte",
  "Bluetooth HS",
  "GPS ne fonctionne pas",
  "NFC HS",
  "Bouton power HS",
  "Boutons volume HS",
  "Vibreur HS",
  "Capteur de proximité HS (écran reste noir en appel)",
  "Vitre arrière cassée",
  "Châssis tordu / plié",
  "Tombé dans l'eau / oxydation",
  "Bootloop / redémarre en boucle",
  "Téléphone ne s'allume plus",
  "Surchauffe",
  "Stockage interne plein / lent",
  "Mise à jour bloquée",
];

/** Pannes spécifiques par famille */
const ISSUES_BY_FAMILY: Record<string, string[]> = {
  apple_iphone_modern: [
    "Écran OLED cassé / fissuré",
    "Écran noir (backlight HS)",
    "Face ID ne fonctionne plus",
    "Face ID partiellement HS (authentification lente)",
    "Caméra ultra grand-angle HS",
    "Caméra téléobjectif HS",
    "LiDAR Scanner HS",
    "Bouton Action HS",
    "Camera Control HS",
    "MagSafe ne charge plus",
    "Charge sans fil HS",
    "IC U2 / Tristar HS (ne charge pas sur USB-C/Lightning)",
    "IC Tigris HS (batterie non reconnue)",
    "Taptic Engine HS (vibreur)",
    "True Tone ne fonctionne plus",
    "Connecteur USB-C HS",
    "Connecteur Lightning HS",
  ],
  apple_iphone_home: [
    "Écran LCD cassé / fissuré",
    "Touch ID ne fonctionne plus (empreinte)",
    "Bouton Home HS / enfoncé",
    "Caméra ultra grand-angle HS",
    "IC U2 / Tristar HS (ne charge pas)",
    "IC Tigris HS (batterie non reconnue)",
    "Nappe bouton Home déchirée",
    "Connecteur Lightning HS",
  ],
  apple_ipad: [
    "Écran LCD / Liquid Retina cassé",
    "Apple Pencil non détecté",
    "Smart Connector HS (clavier)",
    "Face ID iPad HS",
    "Touch ID iPad HS",
    "Connecteur USB-C HS",
    "Connecteur Lightning iPad HS",
    "Batterie qui gonfle (clavier gonflé sous l'écran)",
  ],
  samsung_s_flagship: [
    "Écran AMOLED cassé / fissuré",
    "Écran Dynamic AMOLED cassé",
    "Lecteur d'empreintes sous-écran HS",
    "S-Pen ne fonctionne pas / non détecté",
    "Caméra périscopique / zoom HS",
    "Caméra ultra grand-angle HS",
    "Charge rapide 45W / 65W HS",
    "Samsung Dex HS (connexion USB-C écran)",
    "Charnière Z Fold / Flip HS",
    "Écran extérieur Z Flip cassé",
    "Écran intérieur pliable cassé",
    "Samsung Pay / NFC HS",
    "IC charge SM5720 HS",
  ],
  samsung_a_mid: [
    "Écran AMOLED / LCD cassé",
    "Lecteur d'empreintes latéral / sous-écran HS",
    "Caméra ultra grand-angle HS",
    "Charge rapide HS",
    "Micro secondaire HS (bruit de fond en appel)",
  ],
  samsung_z_fold: [
    "Écran intérieur pliable cassé / rayé",
    "Écran extérieur cassé",
    "Charnière HS / grince",
    "S-Pen Z Fold ne fonctionne plus",
    "Décollement écran intérieur",
    "Fibre optique écran (crease) très visible",
  ],
  samsung_z_flip: [
    "Écran interne cassé / rayé",
    "Écran externe cassé",
    "Charnière HS / claquement",
    "Décollement écran interne",
    "Crease écran trop visible",
  ],
  xiaomi_flagship: [
    "Écran AMOLED 120Hz cassé",
    "Lecteur d'empreintes sous-écran HS",
    "Caméra Leica / Hasselblad floue",
    "Caméra périscopique HS",
    "Charge 120W / 200W ne fonctionne plus",
    "Charge sans fil HyperCharge HS",
    "IC charge Xiaomi (PMIC) HS",
    "Slider alerte HS (OnePlus-like)",
  ],
  xiaomi_mid: [
    "Écran AMOLED / LCD cassé",
    "Lecteur d'empreintes latéral / arrière HS",
    "Caméra ultra grand-angle HS",
    "Charge rapide HS",
    "Bouton home HS",
  ],
  google_pixel: [
    "Écran OLED cassé",
    "Lecteur d'empreintes sous-écran / arrière HS",
    "Caméra Pixel IA floue",
    "Caméra ultra grand-angle HS",
    "Caméra téléobjectif HS",
    "Puce Titan M2 HS (sécurité)",
    "Écran du Pixel Fold (intérieur) cassé",
    "Charge sans fil HS",
  ],
  oneplus: [
    "Écran AMOLED cassé",
    "Lecteur d'empreintes sous-écran HS",
    "Charge SUPERVOOC / WARP HS",
    "Alert Slider HS",
    "Caméra Hasselblad floue",
    "Caméra téléobjectif HS",
    "Écran OnePlus Open (intérieur) cassé",
  ],
  oppo: [
    "Écran AMOLED cassé",
    "Lecteur d'empreintes sous-écran HS",
    "Charge SUPERVOOC HS",
    "Caméra Hasselblad / Leica floue",
    "Caméra périscopique HS",
    "Écran pliant cassé",
  ],
  motorola: [
    "Écran OLED / LCD cassé",
    "Lecteur d'empreintes arrière / latéral HS",
    "Jack 3.5mm HS",
    "Charge TurboPower HS",
    "Caméra ultra grand-angle HS",
    "Écran Razr (interne) cassé",
  ],
  huawei: [
    "Écran OLED cassé",
    "Lecteur d'empreintes sous-écran / latéral HS",
    "Caméra Leica floue",
    "Caméra périscopique HS",
    "Charge SuperCharge / UltraCharge HS",
    "Kirin SoC chauffe excessivement",
    "Pas de 5G (puce modem Kirin)",
    "Huawei Pay HS",
  ],
  honor: [
    "Écran AMOLED cassé",
    "Lecteur d'empreintes sous-écran HS",
    "Caméra périscopique HS",
    "Charge SuperCharge HS",
    "Écran pliant Magic V HS",
  ],
  sony: [
    "Écran 4K / OLED Xperia cassé",
    "Bouton déclencheur photo HS",
    "Jack 3.5mm HS",
    "Lecteur d'empreintes latéral HS",
    "Caméra principale Zeiss floue",
    "Caméra télé / ultra grand-angle HS",
    "Mode Pro Video HS",
  ],
  generic: [],
};

/**
 * Retourne les pannes rapides (chips) pour un modèle donné
 * — Top 8 pannes les plus fréquentes pour cette famille
 */
export function getQuickIssues(modelName: string): string[] {
  const device = findDevice(modelName);
  const family = device?.family ?? "generic";
  const familyIssues = ISSUES_BY_FAMILY[family] ?? [];
  // Top 8 : mix family-specific + generic
  return [...familyIssues.slice(0, 5), ...ISSUES_GENERIC.slice(0, 3)];
}

/**
 * Suggestions intelligentes pour le champ panne
 * Combine : pannes génériques + pannes famille + noms des pièces
 * Filtrées par le searchTerm saisi
 */
export function getSmartIssueSuggestions(modelName: string, searchTerm: string): string[] {
  const device = findDevice(modelName);
  const family = device?.family ?? "generic";

  // Pool 1 : pannes génériques
  const pool: string[] = [...ISSUES_GENERIC];

  // Pool 2 : pannes spécifiques famille
  const familyIssues = ISSUES_BY_FAMILY[family] ?? [];
  for (const issue of familyIssues) {
    if (!pool.includes(issue)) pool.push(issue);
  }

  // Pool 3 : noms des pièces sous forme "Remplacement [pièce]"
  const parts = getPartsForModel(modelName);
  for (const part of parts) {
    const label = `Remplacement ${part.name}`;
    if (!pool.includes(label)) pool.push(label);
  }

  if (!searchTerm.trim()) {
    // Sans recherche → retourne les 10 premiers (pannes les + fréquentes)
    return [...familyIssues.slice(0, 6), ...ISSUES_GENERIC.slice(0, 4)];
  }

  const lower = searchTerm.toLowerCase();
  return pool
    .filter((s) => s.toLowerCase().includes(lower))
    .slice(0, 10);
}
