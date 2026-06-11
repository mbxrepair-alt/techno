import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Tu es un extracteur de données structurées pour un atelier de réparation de smartphones, tablettes et consoles.

Analyse le texte fourni (dicté ou tapé) et extrait toutes les informations dans le schéma JSON demandé.
Réponds UNIQUEMENT avec le JSON valide. Zéro texte autour, zéro markdown, zéro backtick.

Règles d'extraction :
- clientName : prénom et/ou nom complet du client (ex: "Jean Dupont", "Marie Martin")
- clientPhone : numéro de téléphone français (06XXXXXXXX, 07XXXXXXXX, +33XXXXXXXXX) — normalise en supprimant espaces/tirets
- clientEmail : adresse email si présente
- clientType : "pro" si le texte contient entreprise, société, SARL, SAS, EURL, SASU, EI, professionnel, pro, boutique, garage, magasin, enseigne — sinon "particulier"
- repairs : UN objet par appareil distinct mentionné dans le texte
- device : modèle exact ou approximatif (ex: "iPhone 14 Pro", "Samsung Galaxy S23", "PS5", "iPad Air")
- issue : panne ou problème décrit (ex: "écran cassé", "batterie qui ne charge plus", "port de charge HS")
- imei : numéro IMEI si présent (15 chiffres consécutifs)
- code : code PIN, mot de passe, ou schéma de déverrouillage mentionné
- estimatedPrice : prix estimé en nombre entier ou décimal (ex: 120, 89.5) — extrait uniquement le nombre, sans symbole
- description : toute remarque supplémentaire non capturée dans les autres champs (ex: "client pressé", "téléphone tombé dans l'eau")
- Champ absent ou non mentionné → null
- Ne jamais inventer une information absente du texte`;

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    clientName: { type: SchemaType.STRING, nullable: true },
    clientPhone: { type: SchemaType.STRING, nullable: true },
    clientEmail: { type: SchemaType.STRING, nullable: true },
    clientType: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["particulier", "pro"],
      nullable: false,
    },
    repairs: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          device: { type: SchemaType.STRING, nullable: true },
          issue: { type: SchemaType.STRING, nullable: true },
          imei: { type: SchemaType.STRING, nullable: true },
          code: { type: SchemaType.STRING, nullable: true },
          estimatedPrice: { type: SchemaType.NUMBER, nullable: true },
          description: { type: SchemaType.STRING, nullable: true },
        },
        required: ["device", "issue", "imei", "code", "estimatedPrice", "description"],
      },
    },
  },
  required: ["clientName", "clientPhone", "clientEmail", "clientType", "repairs"],
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error("[extract] GOOGLE_AI_API_KEY is not set");
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }
    console.log("[extract] API key present, length:", apiKey.length);

    const { text } = await request.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Texte requis" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    });

    const result = await model.generateContent(text.trim());
    const raw = result.response.text();
    console.log("[extract] Gemini raw response:", raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error("[extract] JSON parse failed:", parseErr, "raw:", raw);
      return NextResponse.json({ error: "Réponse Gemini invalide" }, { status: 500 });
    }

    console.log("[extract] Parsed data:", JSON.stringify(parsed));
    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error("[extract] Gemini API error:", error);
    return NextResponse.json({ error: "Extraction échouée" }, { status: 500 });
  }
}
