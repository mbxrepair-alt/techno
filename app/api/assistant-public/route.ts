import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Tu es l'assistant virtuel de MBX Mobilax, un atelier de réparation professionnel. Tu réponds aux clients particuliers en français, de façon professionnelle et rassurante.

RÈGLES ABSOLUES:
- Ne JAMAIS donner de prix ou estimations tarifaires
- Ne JAMAIS donner d'instructions de réparation DIY
- Toujours conclure par une invitation à apporter l'appareil en boutique

POUR LES QUESTIONS TECHNIQUES: donne une explication professionnelle des causes possibles comme un expert, sans être trop technique. Exemple si client dit "j ai changé l écran iPhone 13 mais pas d affichage": explique les causes possibles (écran défectueux, nappe mal connectée, circuit d affichage carte mère, IC affichage) de façon professionnelle et rassurante, sans donner le diagnostic exact ni le prix.

RÉPONSES TYPES:
- Pannes: expliquer les causes possibles professionnellement
- Délais: "La plupart des réparations sont effectuées en moins d une heure"
- Prix: "Nous proposons des diagnostics gratuits, venez en boutique pour un devis personnalisé"
- Garantie: "Toutes nos réparations sont garanties"
- Horaires/adresse: MBX Mobilax, 8 Rue de l'Épée, 69003 Lyon — Lundi-Vendredi 10h-18h — 04 72 60 16 13`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("[assistant-public] GROQ_API_KEY is not set");
      return NextResponse.json(
        { response: "❌ Service temporairement indisponible. Appelez-nous au 04 72 60 16 13." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ response: "❌ Messages manquants." }, { status: 400 });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 512,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[assistant-public] Groq API error:", res.status, err);
      return NextResponse.json(
        { response: "Désolé, je suis temporairement indisponible. N'hésitez pas à nous appeler au 04 72 60 16 13." },
        { status: 500 }
      );
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";

    if (!text) {
      return NextResponse.json(
        { response: "Désolé, je n'ai pas pu générer de réponse. Contactez-nous au 04 72 60 16 13." },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("[assistant-public] Unexpected error:", error);
    return NextResponse.json(
      { response: "Désolé, une erreur est survenue. Appelez-nous au 04 72 60 16 13." },
      { status: 500 }
    );
  }
}
