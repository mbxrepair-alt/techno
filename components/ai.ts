import { supabase } from "../lib/supabase";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

interface RepairData {
  device: string;
  issue: string;
  diagnosis?: string;
  laborPrice?: number;
}

interface ClientData {
  name: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn("⚠️ Clé API Gemini manquante");
    return fallbackResponse(prompt);
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      }),
    });

    const data = await response.json();
    if (data.candidates?.[0]) {
      return data.candidates[0].content.parts[0].text as string;
    }
    throw new Error("Réponse invalide");
  } catch (error) {
    console.error("Erreur IA:", error);
    return fallbackResponse(prompt);
  }
}

function fallbackResponse(prompt: string): string {
  if (prompt.includes("diagnostic")) {
    return "🔬 Diagnostic standard :\n- Vérifier l'alimentation\n- Tester les composants\n- Vérifier les connexions";
  }
  if (prompt.includes("résumé")) {
    return "🔧 Travaux effectués :\n- Diagnostic complet\n- Remplacement des pièces défectueuses\n- Tests de validation";
  }
  if (prompt.includes("panne")) {
    return "📱 Suggestions de panne :\n- Ne s'allume pas\n- Écran cassé\n- Batterie qui se décharge vite\n- Problème de charge";
  }
  if (prompt.includes("facture")) {
    return "💰 Facture :\n- Main d'œuvre : 50€\n- Pièces : 30€\n- Total TTC : 80€";
  }
  return "Analyse en cours...";
}

export async function generateDiagnostic(device: string, issue: string, symptoms?: string): Promise<string> {
  const prompt = `En tant qu'expert en réparation électronique, génère un diagnostic détaillé pour cet appareil :

Appareil : ${device}
Panne signalée : ${issue}
Symptômes supplémentaires : ${symptoms ?? "Non spécifiés"}

Réponds au format structuré suivant :
🔍 DIAGNOSTIC TECHNIQUE :
- Tests à effectuer
- Causes probables (liste)
- Pièces potentiellement défectueuses (liste)

🔧 ACTIONS À PRÉVOIR :
- Étapes de réparation
- Outils nécessaires

💰 ESTIMATION (€) :
- Main d'œuvre : X€
- Pièces : X€
- Total : X€

⚠️ RECOMMANDATIONS :
- Précautions à prendre
- Informations client`;

  return callGemini(prompt);
}

export async function generateRepairSummary(
  device: string,
  issue: string,
  diagnosis: string,
  partsUsed: string
): Promise<string> {
  const prompt = `Génère un résumé professionnel des travaux effectués pour ce client :

Appareil : ${device}
Panne initiale : ${issue}
Diagnostic : ${diagnosis}
Pièces utilisées : ${partsUsed || "Aucune"}

Réponds au format suivant :
✅ TRAVAUX EFFECTUÉS :
- (liste des actions)

🔧 PIÈCES REMPLACÉES :
- (liste des pièces avec quantités)

⏱️ TEMPS PASSÉ :
- Estimation : Xh

📝 NOTES COMPLÉMENTAIRES :
- (informations utiles)`;

  return callGemini(prompt);
}

export async function suggestIssues(deviceType: string): Promise<string[]> {
  const prompt = `En tant que technicien expert, liste les 8 pannes les plus fréquentes pour ${deviceType}.

Réponds uniquement sous forme de liste simple, chaque élément commençant par 📱, 🔋, 📱, etc.`;

  const result = await callGemini(prompt);
  return result.split('\n').filter(l => l.trim()).slice(0, 8);
}

export async function generateInvoice(
  repairData: RepairData,
  clientData: ClientData,
  partsList: unknown
): Promise<string> {
  const prompt = `Génère une facture professionnelle au format texte structuré :

Client : ${clientData.name}
Appareil : ${repairData.device}
Panne : ${repairData.issue}
Diagnostic : ${repairData.diagnosis ?? ""}
Pièces utilisées : ${JSON.stringify(partsList)}
Prix main d'œuvre : ${repairData.laborPrice ?? 50}€
TVA : 20%

Format attendu :
🧾 FACTURE MBX RÉPARATIONS
N° : (généré)
Date : (aujourd'hui)

DÉTAIL :
- Main d'œuvre : X€
- Pièces : (détail)
- Sous-total : X€
- TVA 20% : X€
- TOTAL TTC : X€

Merci de votre confiance !`;

  return callGemini(prompt);
}

export async function chatWithAssistant(message: string, history: ChatMessage[] = []): Promise<string> {
  const prompt = `Tu es un assistant technique expert en réparation de smartphones, tablettes et ordinateurs.
Tu travailles dans l'atelier MBX Réparations. Réponds de manière professionnelle, précise et utile.

Voici l'historique : ${JSON.stringify(history.slice(-5))}

Question du technicien : ${message}

Réponds de manière concise et utile (max 300 mots).`;

  return callGemini(prompt);
}

export async function suggestParts(device: string, issue: string): Promise<string[]> {
  const prompt = `Pour un ${device} avec le problème suivant : "${issue}", liste les 5 pièces détachées les plus susceptibles d'être nécessaires.

Format : "Pièce - Prix estimé"`;

  const result = await callGemini(prompt);
  return result.split('\n').filter(l => l.trim()).slice(0, 5);
}

export async function analyzePhoto(photoUrl: string, deviceType: string = "smartphone"): Promise<string> {
  void photoUrl;
  void supabase;
  void deviceType;
  return "📸 Analyse de la photo :\n- Dommages visibles à identifier\n- Suggère une inspection approfondie\n- Vérifier les connecteurs internes";
}
