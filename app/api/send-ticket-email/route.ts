import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { createTransporter, fromAddress } from "../../../lib/mailer";

interface EmailBody {
  ticketId: string;
  email: string;
  /** Atelier info (optional — enriches the email header) */
  atelierName?: string;
  atelierPhone?: string;
  atelierAddress?: string;
  atelierEmail?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as EmailBody;
    const { ticketId, email, atelierName, atelierPhone, atelierAddress, atelierEmail } = body;

    if (!ticketId || !email) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const { data: ticket, error } = await supabase
      .from("repairs")
      .select("*, clients(*)")
      .eq("id", ticketId)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }

    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://technophone.vercel.app";
    const trackingLink = `${BASE_URL}/suivi-client?code=${ticket.clients?.client_code}`;
    const hasCode =
      ticket.unlock_code &&
      ticket.unlock_code !== "NC" &&
      ticket.unlock_code !== "Non fourni" &&
      ticket.unlock_code.trim() !== "";

    const noCodeWarning = !hasCode
      ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:10px 14px;border-radius:6px;margin:16px 0;color:#991b1b;font-weight:700;font-size:14px">
           ⚠️ Appareil non testé — pas pris en garantie<br>
           <span style="font-weight:normal;font-size:12px">Aucun code ni schéma de déverrouillage fourni. Le test de l'appareil n'a pas pu être effectué. La réparation ne sera pas couverte par la garantie.</span>
         </div>`
      : "";

    const atelier = atelierName || "MBX Réparations";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#f9fafb;padding:24px;border-radius:12px">
        <div style="background:#0f0f13;color:#fff;border-radius:10px;padding:20px 24px;margin-bottom:20px">
          <div style="font-size:20px;font-weight:900;letter-spacing:-0.5px">${atelier}</div>
          ${atelierAddress ? `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px">${atelierAddress}</div>` : ""}
          ${atelierPhone ? `<div style="font-size:12px;color:rgba(255,255,255,0.5)">${atelierPhone}</div>` : ""}
          <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:8px">Confirmation de dépôt</div>
        </div>
        <div style="background:#fff;border-radius:10px;padding:20px 24px;border:1px solid #e2e8f0">
          <div style="font-size:28px;font-weight:900;color:#1e293b;text-align:center;margin-bottom:16px">MBX-${ticket.id}</div>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="color:#64748b;padding:5px 0;width:40%">Client</td><td style="font-weight:700;color:#1e293b">${ticket.clients?.name || "—"}</td></tr>
            <tr><td style="color:#64748b;padding:5px 0">Appareil</td><td style="font-weight:700;color:#1e293b">${ticket.device}</td></tr>
            <tr><td style="color:#64748b;padding:5px 0">Panne déclarée</td><td style="font-weight:700;color:#1e293b">${ticket.issue}</td></tr>
            ${ticket.estimated_price ? `<tr><td style="color:#64748b;padding:5px 0">Prix estimé</td><td style="font-weight:700;color:#1e293b">${Number(ticket.estimated_price).toFixed(2)} €</td></tr>` : ""}
            <tr><td style="color:#64748b;padding:5px 0">Date de dépôt</td><td style="color:#1e293b">${new Date().toLocaleDateString("fr-FR")}</td></tr>
          </table>
          ${noCodeWarning}
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-top:16px;text-align:center">
            <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Votre code de suivi</div>
            <div style="font-size:26px;font-weight:900;color:#166534;letter-spacing:2px">${ticket.clients?.client_code || "—"}</div>
            <a href="${trackingLink}" style="display:inline-block;margin-top:10px;background:#166534;color:#fff;text-decoration:none;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:700">🔍 Suivre ma réparation</a>
          </div>
        </div>
        <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px">Merci pour votre confiance · ${atelier}</p>
      </div>
    `;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: fromAddress(atelier),
      to: email,
      replyTo: atelierEmail || undefined,
      subject: `🎫 Votre ticket MBX-${ticket.id} — ${atelier}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-ticket-email error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
