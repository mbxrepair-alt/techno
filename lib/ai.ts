// lib/ai.ts

interface ChatMessage {
  role: string;
  content: string;
}

interface RepairData {
  device?: string;
  issue?: string;
  diagnosis?: string;
  partsUsed?: string;
}

interface ClientData {
  name?: string;
}

export async function chatWithAssistant(
  message: string,
  history: ChatMessage[] = []
): Promise<string> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data?.response ?? "❌ Désolé, une erreur technique est survenue. Veuillez réessayer.";
    }

    const data = await res.json();
    return data?.response ?? "❌ Désolé, une erreur technique est survenue. Veuillez réessayer.";
  } catch {
    return "❌ Désolé, une erreur technique est survenue. Veuillez réessayer.";
  }
}

export async function suggestIssues(deviceType: string): Promise<string[]> {
  const type = deviceType?.toLowerCase() || "";

  if (type.includes("console") || type.includes("ps5") || type.includes("xbox")) {
    return [
      "🎮 Diagnostic console - 40€",
      "🎮 PS5 ne s'allume pas - 89€",
      "🎮 Xbox surchauffe - 59€",
      "🎮 Switch écran cassé - 89€",
    ];
  }

  if (type.includes("tablette") || type.includes("ipad")) {
    return [
      "📟 Diagnostic tablette - 25€",
      "📟 iPad écran cassé - 89-189€",
      "📟 Tablette batterie faible - 59-89€",
    ];
  }

  if (
    type.includes("iphone") &&
    (type.includes("pro") || type.includes("14") || type.includes("15"))
  ) {
    return [
      "🔧 Diagnostic iPhone Pro - 40€",
      "📱 Écran iPhone 14 - 229€",
      "🔋 Batterie iPhone 14 - 89€",
    ];
  }

  return [
    "📱 Diagnostic smartphone - 15€",
    "📱 Écran cassé - 79-229€",
    "🔋 Batterie - 49-89€",
    "🔌 Port charge - 45-59€",
  ];
}

export async function generateDiagnostic(
  device: string,
  issue: string,
  symptoms?: string
): Promise<string> {
  return `🔍 **DIAGNOSTIC TECHNIQUE**

📱 Appareil : ${device}
🛠️ Panne : ${issue}

💰 **Tarif diagnostic :**
- Smartphone simple : 15€
- Smartphone complexe (Pro/Ultra) : 40€
- Tablette : 25€
- Console : 40€

✅ Déduit si réparation
⏱️ Durée : 30-60 min

📞 **04 72 60 16 13**
📍 8 Rue de l'Épée, 69003 Lyon`;
}

export async function generateRepairSummary(
  device: string,
  issue: string,
  diagnosis: string,
  partsUsed: string
): Promise<string> {
  return `✅ **RÉSUMÉ DES TRAVAUX**

📱 Appareil : ${device}
🛠️ Panne : ${issue}
🔍 Diagnostic : ${diagnosis || "Confirmé"}

🔧 Actions effectuées :
- Diagnostic complet
- Remplacement des pièces
- Tests de validation

🔩 Pièces : ${partsUsed || "D'origine certifiée"}
⏱️ Délai : 2-5 jours
🔧 Garantie : 3 mois (6 mois batterie)`;
}

export interface ExtractedRepair {
  device: string | null;
  issue: string | null;
  imei: string | null;
  code: string | null;
  estimatedPrice: number | null;
  description: string | null;
}

export interface ExtractedFormData {
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientType: "particulier" | "pro";
  repairs: ExtractedRepair[];
}

export async function extractFormDataFromText(
  text: string
): Promise<ExtractedFormData | null> {
  try {
    const res = await fetch("/api/ai-fill-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      let rawText = "";
      try { rawText = await res.text(); } catch { /* ignore */ }
      console.error("[extractFormDataFromText] API error", {
        status: res.status,
        statusText: res.statusText,
        rawResponse: rawText,
      });
      return null;
    }

    const rawText = await res.text();
    console.log("[extractFormDataFromText] Raw API response:", rawText);

    let parsed: ExtractedFormData | null = null;
    try {
      parsed = JSON.parse(rawText) as ExtractedFormData;
    } catch (parseErr) {
      console.error("[extractFormDataFromText] JSON parse error", parseErr, "raw:", rawText);
      return null;
    }

    console.log("[extractFormDataFromText] Parsed result:", parsed);
    return parsed;
  } catch (err) {
    console.error("[extractFormDataFromText] Network or unexpected error:", err);
    return null;
  }
}

export async function generateInvoice(
  repairData: RepairData,
  clientData: ClientData,
  partsList: unknown
): Promise<string> {
  return `🧾 **FACTURE MBX RÉPARATIONS**

N° : F-${Date.now()}
Date : ${new Date().toLocaleDateString()}

Client : ${clientData?.name || "Client"}
Appareil : ${repairData?.device || "Appareil"}

DÉTAIL :
- Diagnostic : selon appareil (15/25/40€)
- Main d'œuvre : 49€
- Pièces : À définir
- TOTAL TTC : À définir

Merci de votre confiance !`;
}
