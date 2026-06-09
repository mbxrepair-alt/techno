import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Tu es Max, l'assistant IA de MBX Mobilax, un atelier de réparation de téléphones et appareils électroniques à Lyon. Tu aides les techniciens à gérer les réparations.

Tu comprends les abréviations et l'argot des techniciens:
- Marques: 'ip'/'iph' = iPhone, 'sam'/'gal' = Samsung, 'xia'/'redmi'/'poco' = Xiaomi, 'hua' = Huawei, 'moto'/'mot' = Motorola, 'pix'/'goo' = Google Pixel, 'op'/'opo' = OnePlus
- Pannes affichage: 'ecr'/'vitre'/'lcd'/'oled' = écran cassé, 'retro'/'bl' = rétroéclairage, 'ic aff' = circuit affichage, 'touch'/'tact' = tactile
- Pannes alim: 'nsp'/'np' = ne s'allume pas, 'bat'/'batt'/'accu' = batterie, 'cdc'/'port charge' = connecteur charge, 'cc' = court-circuit, 'reboot'/'redem' = redémarrage
- Pannes audio: 'ic son'/'audio ic' = circuit audio, 'hp'/'speaker' = haut-parleur, 'micro'/'mic' = microphone, 'ecout' = écouteur, 'jack' = prise jack
- Pannes caméra: 'cam'/'photo' = caméra, 'cam av'/'selfie' = caméra avant, 'cam arr' = caméra arrière, 'lentille' = verre caméra
- Structure: 'c.a'/'ca'/'cache'/'dos' = cache arrière, 'chassis'/'cadre'/'frame' = châssis, 'trappe'/'trap' = tiroir SIM
- Boutons: 'home' = bouton home, 'power'/'on off' = bouton power, 'vol' = volume, 'silent' = switch silencieux
- Biométrie: 'face id'/'faceid' = Face ID, 'touch id'/'empreinte' = Touch ID
- Eau: 'eau'/'mouillé'/'humidite' = dégât des eaux, 'oxy'/'oxydation'/'rouille' = oxydation
- Autres: 'vibreur'/'vib' = vibreur, 'prox' = capteur proximité, 'logiciel'/'soft' = problème logiciel, 'icloud'/'debloc' = déverrouillage iCloud, 'recup'/'data' = récupération données
- 'code'/'mdp'/'pin' = CODE DE VERROUILLAGE PERSONNEL (pas un code réseau)

Prix courants MBX: écran iPhone 80-200€, batterie 40-80€, connecteur charge 60-90€, cache arrière 30-60€, carte mère 150-300€, dégât des eaux diagnostic 40€.

Réponds toujours en français, de façon courte et professionnelle. Si on te donne des infos client/appareil, résume: Appareil, Panne(s), Diagnostic suggéré, Prix estimé.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("[chat] GROQ_API_KEY is not set");
      return NextResponse.json(
        { response: "❌ Clé API manquante." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { response: "❌ Messages manquants." },
        { status: 400 }
      );
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
      console.error("[chat] Groq API error:", res.status, err);
      return NextResponse.json(
        { response: "❌ Désolé, une erreur technique est survenue. Veuillez réessayer." },
        { status: 500 }
      );
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";

    if (!text) {
      console.error("[chat] Empty response from Groq:", JSON.stringify(data));
      return NextResponse.json(
        { response: "❌ Désolé, je n'ai pas pu générer de réponse." },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("[chat] Unexpected error:", error);
    return NextResponse.json(
      { response: "❌ Désolé, une erreur technique est survenue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
