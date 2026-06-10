import { NextRequest, NextResponse } from "next/server";
import { createTransporter, fromAddress } from "../../../lib/mailer";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { to, clientName, repairs, totalHt, totalTva, totalTtc, totalRemaining, invoiceRef, companyName, companyAddress, companyPhone, companyEmail, trackingCode } = body;

    if (!to || !repairs?.length) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const transporter = createTransporter();

    const isSolde = totalRemaining <= 0;
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://technophone.vercel.app";
    const trackingLink = trackingCode ? `${BASE_URL}/suivi-client?code=${trackingCode}` : "";

    const repairRows = repairs
      .map(
        (r: { id: number; device: string; issue: string; priceHt: number; tvaRate: number; totalTtc: number }) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:13px;color:#4f46e5;font-weight:700;white-space:nowrap">MBX-${r.id}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">
            <div style="font-weight:600;color:#1e293b;font-size:13px">${r.device}</div>
            <div style="color:#94a3b8;font-size:12px;margin-top:2px">${r.issue}</div>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#64748b;font-size:13px;white-space:nowrap">${r.priceHt.toFixed(2)} €</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#94a3b8;font-size:12px">${r.tvaRate > 0 ? r.tvaRate + "%" : "—"}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e293b;font-size:13px;white-space:nowrap">${r.totalTtc.toFixed(2)} €</td>
        </tr>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

  <!-- HEADER -->
  <div style="background:#0f0f13;padding:28px 32px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">${companyName || "MBX Réparations"}</div>
      ${companyAddress ? `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px">${companyAddress}</div>` : ""}
      ${companyPhone ? `<div style="font-size:12px;color:rgba(255,255,255,0.5)">${companyPhone}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px">Facture</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:2px">${invoiceRef}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px">${new Date().toLocaleDateString("fr-FR")}</div>
    </div>
  </div>

  <!-- CLIENT -->
  <div style="padding:20px 32px;border-bottom:1px solid #f1f5f9;background:#fafafa">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Destinataire</div>
    <div style="font-size:15px;font-weight:700;color:#1e293b">${clientName}</div>
  </div>

  <!-- TABLE -->
  <div style="padding:0 32px">
    <table style="width:100%;border-collapse:collapse;margin-top:4px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #e2e8f0">Réf.</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #e2e8f0">Prestation</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #e2e8f0">HT</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #e2e8f0">TVA</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #e2e8f0">TTC</th>
        </tr>
      </thead>
      <tbody>${repairRows}</tbody>
    </table>
  </div>

  <!-- TOTAUX -->
  <div style="padding:16px 32px 24px;display:flex;justify-content:flex-end">
    <table style="min-width:220px;border-collapse:collapse">
      ${totalTva > 0.01 ? `
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#64748b">Sous-total HT</td>
        <td style="padding:4px 0 4px 24px;text-align:right;font-size:13px;color:#1e293b">${totalHt.toFixed(2)} €</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#64748b">TVA</td>
        <td style="padding:4px 0 4px 24px;text-align:right;font-size:13px;color:#64748b">${totalTva.toFixed(2)} €</td>
      </tr>` : ""}
      <tr>
        <td style="padding:8px 0 4px;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0">Total TTC</td>
        <td style="padding:8px 0 4px 24px;text-align:right;font-size:14px;font-weight:700;color:#1e293b;border-top:1px solid #e2e8f0">${totalTtc.toFixed(2)} €</td>
      </tr>
      <tr>
        <td style="padding:8px 16px 8px 0;font-size:14px;font-weight:800;border-top:2px solid #0f0f13">${isSolde ? "✓ Soldée" : "Reste à payer"}</td>
        <td style="padding:8px 0 8px 24px;text-align:right;font-size:18px;font-weight:900;border-top:2px solid #0f0f13;color:${isSolde ? "#16a34a" : "#dc2626"}">${totalRemaining.toFixed(2)} €</td>
      </tr>
    </table>
  </div>

  ${trackingLink ? `
  <!-- SUIVI -->
  <div style="margin:0 32px 24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center">
    <div style="font-size:12px;color:#166534;font-weight:700;margin-bottom:8px">Suivre l'avancement de vos réparations</div>
    <a href="${trackingLink}" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:700">🔍 Voir le suivi en ligne</a>
  </div>` : ""}

  <!-- FOOTER -->
  <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:12px;color:#94a3b8">Conditions de paiement : à réception · ${companyName || "MBX Réparations"}</p>
    ${companyEmail ? `<p style="margin:4px 0 0;font-size:11px;color:#cbd5e1">${companyEmail}</p>` : ""}
  </div>

</div>
</body>
</html>`;

    await transporter.sendMail({
      from: fromAddress(companyName),
      to,
      replyTo: companyEmail || undefined,
      subject: `Facture ${invoiceRef} — ${clientName}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("send-invoice-email error:", message, stack);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
