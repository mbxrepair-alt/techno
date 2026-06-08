import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Tu es Max, assistant IA expert pour MBX Mobilax, un atelier de réparation. Tu réponds en français, de façon professionnelle et concise.`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[chat] GEMINI_API_KEY is not set");
      return NextResponse.json(
        { response: "❌ Clé API manquante." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];
    const context: string | undefined = body.context;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { response: "❌ Messages manquants." },
        { status: 400 }
      );
    }

    const systemInstruction = context
      ? `${SYSTEM_PROMPT}\n\nContexte supplémentaire : ${context}`
      : SYSTEM_PROMPT;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction,
    });

    // Split history (all but last) from the current user message (last)
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("[chat] Gemini API error:", error);
    return NextResponse.json(
      { response: "❌ Désolé, une erreur technique est survenue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
