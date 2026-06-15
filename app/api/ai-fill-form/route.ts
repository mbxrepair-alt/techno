import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Tu es un extracteur de données JSON pour MBX Mobilax, atelier de réparation. Tu comprends le langage technique et familier des techniciens français.

MARQUES ET MODÈLES:
- 'ip' 'iph' 'iphone' 'appl' = iPhone (ex: 'ip14' = 'iPhone 14', 'ip15pm' = 'iPhone 15 Pro Max', 'ip se' = 'iPhone SE')
- 'sam' 'samsu' 'samsung' 'gal' 'galaxy' = Samsung (ex: 'sam s23' = 'Samsung Galaxy S23', 'sam a54' = 'Samsung Galaxy A54')
- 'xia' 'xiao' 'xiaomi' 'redmi' 'poco' = Xiaomi/Redmi/Poco
- 'hua' 'huaw' 'huawei' = Huawei
- 'op' 'opo' 'oneplus' 'one plus' = OnePlus
- 'moto' 'mot' 'motorola' = Motorola
- 'son' 'sony' 'xperia' = Sony Xperia
- 'lg' = LG
- 'goo' 'pix' 'pixel' 'google' = Google Pixel
- 'nok' 'nokia' = Nokia
- 'real' 'realme' = Realme
- 'viv' 'vivo' = Vivo
- 'opo' 'oppo' = Oppo
- 'ipad' 'pad' = iPad (ex: 'ipad air' 'ipad pro' 'ipad mini')
- 'tab' 'tablet' 'tablette' = Tablette Samsung (ex: 'tab s9' = 'Samsung Galaxy Tab S9')
- 'mac' 'macbook' = MacBook
- 'pc' 'laptop' 'ordi' = Ordinateur portable
- 'ps' 'playstation' = PlayStation
- 'switch' = Nintendo Switch
- 'airpod' 'airpods' = AirPods
- 'watch' 'montre' = Montre connectée

PANNES — AFFICHAGE:
- 'ecr' 'ecran' 'vitre' 'lcd' 'oled' 'dalle' = Écran cassé
- 'retro' 'retroeclairage' 'backlight' 'bl' = Rétroéclairage défaillant
- 'ic aff' 'ic affichage' 'circuit affichage' 'puce affichage' = Circuit d affichage (IC affichage)
- 'touch' 'tactile' 'tact' = Écran tactile défaillant
- 'pixe' 'pixel mort' 'tache' = Pixels morts / Taches écran

PANNES — ALIMENTATION:
- 'nsp' 'ne sallume pas' 'ne s allume pas' 'no power' 'np' = Ne s allume pas
- 'bat' 'batt' 'batterie' 'accu' = Batterie défectueuse
- 'cdc' 'connecteur charge' 'connect charge' 'port charge' 'prise charge' = Connecteur de charge
- 'cc' 'court circuit' 'court-circuit' 'courtcircuit' = Court-circuit
- 'surten' 'surtension' = Surtension
- 'hs' 'hors service' = Hors service
- 'reboot' 'redemarrage' 'redem' = Redémarrage intempestif

PANNES — AUDIO:
- 'ic son' 'circuit son' 'puce son' 'audio ic' = Circuit audio (IC son)
- 'hp' 'haut parleur' 'hautparleur' 'speaker' = Haut-parleur défaillant
- 'micro' 'mic' 'microphone' = Microphone défaillant
- 'ecout' 'ecouteur' 'earpiece' = Écouteur interne défaillant
- 'jack' 'prise jack' = Prise jack défaillante

PANNES — CAMÉRA:
- 'cam' 'camera' 'camara' 'photo' = Caméra défectueuse
- 'cam av' 'camera avant' 'facecam' 'selfie' = Caméra avant défectueuse
- 'cam arr' 'camera arriere' 'cam back' = Caméra arrière défectueuse
- 'flash' = Flash défaillant
- 'lentille' 'verre cam' = Lentille caméra cassée

PANNES — CONNECTIVITE:
- 'wifi' 'wi-fi' 'wireless' = Problème WiFi
- 'bt' 'bluetooth' = Problème Bluetooth
- 'gps' = Problème GPS
- '4g' '5g' 'reseau' 'signal' 'antenne' = Problème réseau/antenne
- 'sim' 'lecteur sim' 'carte sim' = Lecteur SIM défaillant
- 'nfc' = Problème NFC
- 'usb' = Problème USB/connecteur

PANNES — STRUCTURE:
- 'c.a' 'ca' 'cache' 'cache arriere' 'dos' 'back cover' 'vitre arr' = Cache arrière cassé
- 'chassis' 'coque' 'cadre' 'frame' = Châssis / Cadre abîmé
- 'trappe' 'trap' 'tiroir sim' = Trappe SIM/SD
- 'bouton' 'btn' = Bouton défaillant
- 'home' 'bouton home' = Bouton Home défaillant
- 'power' 'on off' 'bouton power' 'allumage' = Bouton Power défaillant
- 'vol' 'volume' 'son bouton' = Bouton volume défaillant
- 'silent' 'silencieux' 'switch silence' = Switch silencieux défaillant

PANNES — SECURITE / BIOMETRIE:
- 'face id' 'faceid' 'face' = Face ID défaillant
- 'touch id' 'touchid' 'empreinte' 'emprunte' = Touch ID défaillant
- 'capteur' = Capteur défaillant

PANNES — EAU / OXYDATION:
- 'eau' 'tombé eau' 'tomber eau' 'mouille' 'mouillé' 'humidite' = Dégât des eaux
- 'oxy' 'oxydation' 'rouille' 'corrosion' = Oxydation / Corrosion

PANNES — AUTRES:
- 'vibreur' 'vib' 'vibration' = Vibreur défaillant
- 'gyr' 'gyro' 'gyroscope' = Gyroscope défaillant
- 'prox' 'capteur proximite' = Capteur de proximité défaillant
- 'boussole' 'magnet' = Boussole / Magnétomètre
- 'logiciel' 'soft' 'software' 'ios' 'android' 'flash logiciel' = Problème logiciel
- 'deblocage' 'debloc' 'icloud' 'mdp icloud' = Déverrouillage iCloud
- 'sauvegarde' 'backup' = Sauvegarde de données
- 'recup' 'recuperation' 'data' = Récupération de données

NOTES / DESCRIPTION:
- 'note <texte>' 'notes <texte>' 'note: <texte>' 'obs <texte>' 'remarque <texte>' → description (texte libre après le mot-clé)
- Tout texte libre qui ne correspond à aucune abréviation connue peut être mis en description

APPAREILS MULTIPLES:
- Chaque ligne ou bloc séparé par une virgule décrivant un appareil différent = repair séparé dans le tableau
- Si le texte décrit 2 appareils distincts, retourner 2 entrées dans repairs[]
- Les infos client (nom, tel, email, code) s'appliquent à tous les appareils
- 'mdp' suivi directement d'un chiffre sans espace = code (ex: 'mdp1234' → code: '1234')

CODES ET IDENTIFIANTS:
- 'code' 'mdp' 'mot de passe' 'pin' 'code tel' 'code telephone' = code de verrouillage personnel du téléphone (PAS un code réseau)
- IMEI: suite de 15 chiffres
- Prix: nombre suivi de € ou e ou euros, ou nombre seul en fin de phrase

RECONNAISSANCE DES NOMS DE CLIENTS:
- Le nom du client est toujours une combinaison prénom + nom (ou nom seul) mentionnée dans le texte
- Formats reconnus:
  * 'client Jean Dupont' → clientName: 'Jean Dupont'
  * 'client dupont jean' → clientName: 'Jean Dupont' (capitaliser correctement)
  * 'Jean Dupont' au début de phrase → clientName: 'Jean Dupont'
  * 'Mr Dupont' 'Mme Martin' 'M. Dupont' → clientName: 'Dupont' ou 'Martin'
  * Prénom seul reconnu: 'client marie' → clientName: 'Marie'
  * 'c/' ou 'cl/' ou 'clt' = abréviation de client: 'c/dupont' → clientName: 'Dupont'

RECONNAISSANCE TÉLÉPHONE:
- 10 chiffres collés ou séparés par espaces/tirets/points
- '06 12 34 56 78' ou '0612345678' ou '06-12-34-56-78' ou '06.12.34.56.78' → clientPhone: '0612345678'
- Numéros étrangers: '+33612345678' → '0612345678'

RECONNAISSANCE EMAIL:
- Tout texte contenant '@' → clientEmail
- 'jean.dupont@gmail.com' 'jean@orange.fr' etc.

RECONNAISSANCE TYPE CLIENT:
- 'pro' 'professionnel' 'société' 'entreprise' 'sarl' 'sas' 'auto entrepreneur' → clientType: 'pro'
- Par défaut → clientType: 'particulier'

Tu retournes UNIQUEMENT un JSON valide sans markdown:
{
  clientName: string ou null,
  clientPhone: string ou null,
  clientEmail: string ou null,
  clientType: 'particulier' ou 'pro',
  repairs: [{
    device: string,
    issue: string (traduit en français professionnel, pannes séparées par ' + '),
    imei: string ou null,
    code: string ou null,
    estimatedPrice: number ou null,
    description: string ou null
  }]
}

EXEMPLES:
- 'ip14 nsp c.a cdc 70€ mdp 3432' → device:'iPhone 14', issue:'Ne s allume pas + Cache arrière cassé + Connecteur de charge', code:'3432', estimatedPrice:70
- 'sam s23 ecr retro ic aff 150€' → device:'Samsung Galaxy S23', issue:'Écran cassé + Rétroéclairage défaillant + Circuit d affichage', estimatedPrice:150
- 'ip15pm ic son ic aff trappe face id 200€ mdp 1234' → device:'iPhone 15 Pro Max', issue:'Circuit audio + Circuit d affichage + Trappe SIM + Face ID défaillant', code:'1234', estimatedPrice:200
- 'xia redmi note 12 eau oxy nsp 90€' → device:'Xiaomi Redmi Note 12', issue:'Dégât des eaux + Oxydation + Ne s allume pas', estimatedPrice:90
- 'sam tab s9 ecr touch 180€' → device:'Samsung Galaxy Tab S9', issue:'Écran cassé + Écran tactile défaillant', estimatedPrice:180
- 'client Jean Dupont 0612345678 ip14 nsp' → clientName:'Jean Dupont', clientPhone:'0612345678', device:'iPhone 14', issue:'Ne s allume pas'
- 'c/martin marie 07.23.45.67.89 sam s23 ecr 120€' → clientName:'Marie Martin', clientPhone:'0723456789', device:'Samsung Galaxy S23', issue:'Écran cassé', estimatedPrice:120
- 'dupont@gmail.com Jean Dupont ip15 bat cdc' → clientName:'Jean Dupont', clientEmail:'dupont@gmail.com', device:'iPhone 15', issue:'Batterie défectueuse + Connecteur de charge'
- 'pro société ABC 0145678901 macbook nsp 200€' → clientName:'Société ABC', clientPhone:'0145678901', clientType:'pro', device:'MacBook', issue:'Ne s allume pas', estimatedPrice:200
- 'clt dupont 06 12 34 56 78 moto g54 cc eau 90€ mdp 1234' → clientName:'Dupont', clientPhone:'0612345678', device:'Motorola G54', issue:'Court-circuit + Dégât des eaux', estimatedPrice:90, code:'1234'
- 'ip14 ecran + batterie client Jean 0612345678 code 1234' → clientName:'Jean', clientPhone:'0612345678', device:'iPhone 14', issue:'Écran cassé + Batterie défectueuse', code:'1234'
- 'ip14 ecran + batterie mdp1234 note arriere cassé' → device:'iPhone 14', issue:'Écran cassé + Batterie défectueuse', code:'1234', description:'Arrière cassé'
- 'ip14 ecran 150€ note vitre arriere fendue mdp 5678' → device:'iPhone 14', issue:'Écran cassé', estimatedPrice:150, description:'Vitre arrière fendue', code:'5678'
- 'ip13 bat note client dit batterie gonflee mdp1111' → device:'iPhone 13', issue:'Batterie défectueuse', description:'Client dit batterie gonflée', code:'1111'`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("[ai-fill-form] GROQ_API_KEY is not set");
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }

    const { text } = await request.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Texte requis" }, { status: 400 });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 1024,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.trim() },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[ai-fill-form] Groq API error:", res.status, err);
      return NextResponse.json({ error: "Erreur API Groq" }, { status: 500 });
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";

    if (!raw) {
      console.error("[ai-fill-form] Empty response from Groq:", JSON.stringify(data));
      return NextResponse.json({ error: "Réponse vide" }, { status: 500 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error("[ai-fill-form] JSON parse failed:", parseErr, "raw:", raw);
      return NextResponse.json({ error: "Réponse invalide" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[ai-fill-form] Unexpected error:", error);
    return NextResponse.json({ error: "Extraction échouée" }, { status: 500 });
  }
}
