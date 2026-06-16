import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Déduit un nom/modèle d'appareil lisible à partir du user-agent. */
function deviceName(ua?: string | null): string | null {
  if (!ua) return null;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  // Modèle Android : "...; Android 13; SM-G991B)" → "SM-G991B"
  const and = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|\))/i);
  if (and && and[1]) {
    const model = and[1].replace(/\s*wv\s*$/i, "").trim();
    if (model && !/^[\d.]+$/.test(model)) return model;
    return "Appareil Android";
  }
  if (/windows/i.test(ua)) return "PC Windows";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/linux/i.test(ua)) return "Linux";
  return null;
}

/** Extrait l'IP cliente depuis les en-têtes (Vercel place l'IP réelle dans x-forwarded-for). */
function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/** Localisation approximative fournie par Vercel à partir de l'IP (uniquement en production). */
function geo(req: NextRequest) {
  const dec = (v: string | null) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  return {
    country: dec(req.headers.get("x-vercel-ip-country")),
    region: dec(req.headers.get("x-vercel-ip-country-region")),
    city: dec(req.headers.get("x-vercel-ip-city")),
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: "config" }, { status: 200 });
    }
    const body = await req.json();
    const ua = req.headers.get("user-agent") || body.user_agent || null;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    await supabase.from("analytics_events").insert({
      event_type: body.event_type,
      path: body.path ?? null,
      referrer: body.referrer ?? null,
      company_id: body.company_id ?? null,
      user_email: body.user_email ?? null,
      technician_name: body.technician_name ?? null,
      device_type: body.device_type ?? null,
      os: body.os ?? null,
      browser: body.browser ?? null,
      is_standalone: body.is_standalone ?? false,
      user_agent: ua,
      ip_address: clientIp(req),
      device_name: deviceName(ua),
      ...geo(req),
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Le tracking ne doit jamais casser quoi que ce soit
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
