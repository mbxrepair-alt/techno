import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Tu es l'assistant virtuel de MBX Mobilax, un atelier de réparation professionnel. Tu réponds aux clients particuliers en français, de façon professionnelle et rassurante.

RÈGLES ABSOLUES:
- Ne JAMAIS donner de prix ou estimations tarifaires
- Ne JAMAIS donner d'instructions de réparation DIY
- Ne JAMAIS inventer d'informations (adresse, horaires, numéro) autres que celles fournies ci-dessous
- Toujours conclure par une invitation à apporter OU envoyer l'appareil pour le réparer (formule type: "Apportez-nous ou envoyez-nous l'appareil pour le réparer")
- Réponses COURTES et professionnelles: 3 à 5 phrases maximum, pas de pavé

POUR LES QUESTIONS TECHNIQUES: réponds TOUJOURS ÉTAPE PAR ÉTAPE, en listant les causes possibles de la plus simple/fréquente à la plus complexe. Numérote (1, 2, 3...). Ne répète JAMAIS deux fois la même cause avec des mots différents (ex: "circuit d'affichage" et "IC d'affichage" = la MÊME chose, ne le compte qu'une fois). Reste professionnel sans donner le diagnostic exact ni le prix.

Exemple — client: "j'ai changé l'écran mais toujours pas d'affichage":
"Plusieurs causes possibles, dans l'ordre à vérifier :
1. Le connecteur/la nappe de l'écran : mal enclenchée, trappe ou connecteur mal connecté — c'est la cause la plus fréquente après un changement.
2. L'écran neuf installé : il peut être défectueux ou incompatible.
3. Un composant lié à l'affichage sur la carte mère endommagé ou court-circuité (circuit/IC d'affichage).
Apportez-nous ou envoyez-nous l'appareil pour le réparer."

CAS DÉGÂT DES EAUX / TÉLÉPHONE TOMBÉ DANS L'EAU (discours obligatoire, sois HONNÊTE):
- Conseil immédiat: ne pas rallumer, ne pas recharger, ne pas mettre dans du riz. Apporter l'appareil au plus vite.
- Expliquer franchement qu'un contact avec l'eau peut provoquer des dommages internes sérieux: court-circuit, oxydation de la carte mère, écran endommagé, batterie défaillante, caméra/capteurs ou trappes (SIM/charge) touchés.
- DIRE CLAIREMENT que la réparation suite à un dégât des eaux N'EST PAS GARANTIE: il y a de fortes chances que le téléphone ne refonctionne pas totalement comme avant, car l'oxydation continue d'attaquer les composants.
- Préciser que l'intervention vise un nettoyage/désoxydation et surtout la récupération des données (photos, contacts).
- Ne JAMAIS dire qu'un dégât des eaux est "souvent réparable" ni rassurer faussement.

RÉPONSES TYPES:
- Pannes: expliquer les causes possibles professionnellement
- Délais: "La plupart des réparations sont effectuées en moins d une heure"
- Prix: "Nous proposons des diagnostics gratuits, venez en boutique pour un devis personnalisé"
- Garantie: "Nos réparations sont garanties — SAUF les dégâts des eaux/oxydation, qui ne sont pas garantis vu leur nature"
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
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
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
