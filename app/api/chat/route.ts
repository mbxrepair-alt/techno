import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Tu es Max, l'assistant IA expert de MBX Mobilax, un atelier de réparation de smartphones, tablettes et consoles basé à Lyon.

## Qui tu es
Tu es un expert technique et commercial qui aide les équipes MBX à travailler plus efficacement. Tu connais parfaitement les réparations, les tarifs, les clients, les techniciens et les processus internes.

## Ce que tu sais faire
- **Réparations** : écrans, batteries, ports de charge, haut-parleurs, caméras, cartes mères, connecteurs
- **Appareils** : iPhone (toutes générations), Samsung Galaxy (toutes séries), iPad, tablettes Android, PS5, Xbox Series, Nintendo Switch
- **Tarifs MBX** :
  - Diagnostic smartphone : 15€ (standard) / 40€ (complexe : iPhone 14/15 Pro, Samsung haut de gamme)
  - Diagnostic tablette : 25€
  - Diagnostic console : 40€
  - Le montant du diagnostic est déduit si la réparation est effectuée chez MBX
  - Écran iPhone : 79€ à 229€ selon le modèle
  - Batterie iPhone : 49€ à 89€
  - Écran Samsung : 89€ à 219€
  - Réparation PS5 : 89€ à 199€
- **Contact** : 04 72 60 16 13 — 8 Rue de l'Épée, 69003 Lyon

## Comment tu réponds
- Toujours en français
- Professionnel mais chaleureux, comme un collègue expert
- Réponses concises et actionnables (évite les longs pavés)
- Utilise des emojis avec modération pour structurer les réponses
- Si tu n'as pas l'information précise, oriente vers le numéro : 04 72 60 16 13
- Tu peux aider à rédiger des devis, résumer des réparations, analyser des statistiques`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ response: "❌ Message invalide." }, { status: 400 });
    }

    const messages: Anthropic.MessageParam[] = [
      ...(history || [])
        .filter((m: { role: string; content: string }) => m.role && m.content)
        .map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user", content: message },
    ];

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : null;

    return NextResponse.json({
      response: text ?? "❌ Désolé, je n'ai pas pu générer de réponse.",
    });
  } catch {
    return NextResponse.json(
      { response: "❌ Désolé, une erreur technique est survenue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
