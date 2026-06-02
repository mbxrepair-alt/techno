// app/api/send-ticket-email/route.js
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import nodemailer from "nodemailer"; // ou utilise un service tiers

export async function POST(request) {
  try {
    const { ticketId, email } = await request.json();
    if (!ticketId || !email) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Récupère les infos du ticket
    const { data: ticket, error } = await supabase
      .from("repairs")
      .select("*, clients(*)")
      .eq("id", ticketId)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }

    // Configuration de l'envoi (ici avec Nodemailer + Gmail en exemple)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://technophone.vercel.app'}/suivi/${ticket.tracking_code}`;

    await transporter.sendMail({
      from: `"MBX Réparations" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Votre ticket ${ticket.tracking_code} a été créé`,
      html: `
        <h2>Ticket ${ticket.tracking_code}</h2>
        <p><strong>Client :</strong> ${ticket.clients.name}</p>
        <p><strong>Appareil :</strong> ${ticket.device}</p>
        <p><strong>Panne :</strong> ${ticket.issue}</p>
        <p><strong>Suivi :</strong> <a href="${trackingLink}">${trackingLink}</a></p>
        <p>Merci de votre confiance.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
