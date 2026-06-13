import { NextRequest, NextResponse } from "next/server";
import { createTransporter, fromAddress } from "../../../lib/mailer";

// Messages intelligents par statut
const STATUS_MESSAGES: Record<string, { subject: string; title: string; body: string; cta: string }> = {
  "⏳ Attente validation client": {
    subject: "Votre validation est requise",
    title: "⏳ Votre accord est nécessaire",
    body:
      "Le diagnostic de votre {device} est terminé et nécessite votre validation avant que nous poursuivions la réparation. " +
      "Consultez le détail (travaux et tarif) puis donnez votre accord en ligne. La réparation démarrera dès votre confirmation.",
    cta: "Valider ma réparation",
  },
  "🔐 Mot de passe incorrect": {
    subject: "Code de déverrouillage incorrect",
    title: "🔐 Nous avons besoin du bon code",
    body:
      "Le code de déverrouillage que vous nous avez communiqué pour votre {device} ne fonctionne pas. " +
      "Sans accès à l'appareil, nous ne pouvons pas effectuer les tests ni finaliser la réparation. " +
      "Merci de nous transmettre le bon code (schéma ou code PIN) au plus vite.",
    cta: "Communiquer mon code",
  },
  "📦 Attente pièce": {
    subject: "Pièce en commande pour votre réparation",
    title: "📦 Pièce en cours d'approvisionnement",
    body:
      "La réparation de votre {device} nécessite une pièce que nous venons de commander. " +
      "Dès sa réception, nous reprenons la réparation immédiatement et vous tenons informé. " +
      "Aucune action n'est requise de votre part pour le moment, merci de votre patience.",
    cta: "Suivre ma réparation",
  },
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { to, clientName, device, status, trackingLink, companyName, companyPhone, companyEmail } =
      await request.json();

    if (!to) return NextResponse.json({ error: "Email destinataire manquant" }, { status: 400 });
    const cfg = STATUS_MESSAGES[status];
    if (!cfg) return NextResponse.json({ error: "Statut non concerné" }, { status: 400 });

    const transporter = createTransporter();
    const dev = device || "appareil";
    const body = cfg.body.replace(/\{device\}/g, dev);
    const atelier = companyName || "MBX Réparations";

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:540px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#0f0f13;padding:24px 32px">
    <div style="font-size:19px;font-weight:900;color:#fff">${atelier}</div>
    <div style="font-size:12px;color:#f97316;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-top:4px">Suivi de réparation</div>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:15px;color:#1e293b;margin:0 0 4px">Bonjour ${clientName || ""},</p>
    <h2 style="font-size:17px;color:#0f172a;margin:16px 0 8px">${cfg.title}</h2>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0">${body}</p>
    ${trackingLink ? `
    <div style="text-align:center;margin:24px 0 8px">
      <a href="${trackingLink}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:11px 26px;border-radius:9px;font-size:14px;font-weight:700">${cfg.cta}</a>
    </div>` : ""}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:12px;color:#94a3b8">${atelier}${companyPhone ? " · " + companyPhone : ""}</p>
  </div>
</div></body></html>`;

    await transporter.sendMail({
      from: fromAddress(atelier),
      to,
      replyTo: companyEmail || undefined,
      subject: `${cfg.subject} — ${dev}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-status-email error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
