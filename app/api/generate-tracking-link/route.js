export const runtime = 'nodejs';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { repairId, clientName, clientPhone, clientEmail, baseUrl } = body;

    console.log("📝 Génération lien pour:", { repairId, clientName });

    // Validation
    if (!repairId || !clientName) {
      return NextResponse.json({ 
        success: false, 
        error: "Paramètres manquants: repairId et clientName sont requis" 
      }, { status: 400 });
    }

    // Générer un token unique
    const hash = crypto.createHash('sha256');
    hash.update(`${clientName}-${repairId}-${Date.now()}-${Math.random()}`);
    const token = hash.digest('hex').substring(0, 32);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Sauvegarder dans Supabase
    const { data, error: insertError } = await supabase
      .from("tracking_links")
      .insert({
        repair_id: parseInt(repairId),
        client_name: clientName,
        client_phone: clientPhone || null,
        client_email: clientEmail || null,
        access_token: token,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        view_count: 0
      })
      .select();

    if (insertError) {
      console.error("❌ Erreur Supabase:", insertError);
      return NextResponse.json({ 
        success: false, 
        error: `Erreur base de données: ${insertError.message}` 
      }, { status: 500 });
    }

    // Construire l'URL - CORRIGÉ POUR VERCEL
    let appUrl = baseUrl;
    if (!appUrl) {
      if (process.env.NODE_ENV === 'development') {
        appUrl = 'http://localhost:3000';
      } else {
        appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://technophone.vercel.app';
      }
    }
    
    const trackingUrl = `${appUrl}/suivi/${token}`;

    console.log("✅ Lien généré avec succès:", trackingUrl);

    return NextResponse.json({
      success: true,
      url: trackingUrl,
      token: token,
      expires_at: expiresAt.toISOString()
    });

  } catch (error) {
    console.error("❌ Erreur API:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur interne du serveur" 
    }, { status: 500 });
  }
}