"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase, getCurrentUser } from "../../../lib/supabase";
import Link from "next/link";
import {
  Globe,
  Smartphone,
  Download,
  UserCheck,
  Monitor,
  Tablet,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

const OWNER_EMAIL = "mbxrepair@gmail.com";

interface Evt {
  id: number;
  event_type: string;
  path: string | null;
  user_email: string | null;
  technician_name: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  is_standalone: boolean | null;
  referrer: string | null;
  ip_address: string | null;
  device_name: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
}

/** "FR" + "Lyon" → "Lyon, FR" */
function place(e: { city: string | null; region: string | null; country: string | null }): string | null {
  const parts = [e.city, e.country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

const PERIODS = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "all", label: "Tout" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeviceIcon({ type, size = 14 }: { type: string | null; size?: number }) {
  if (type === "mobile") return <Smartphone size={size} />;
  if (type === "tablette") return <Tablet size={size} />;
  return <Monitor size={size} />;
}

export default function AnalyticsPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user || user.email !== OWNER_EMAIL) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      const { data } = await supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      setEvents(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (period === "all") return events;
    const cutoff = Date.now() - parseInt(period) * 86400000;
    return events.filter((e) => new Date(e.created_at).getTime() >= cutoff);
  }, [events, period]);

  const stats = useMemo(() => {
    const by = (t: string) => filtered.filter((e) => e.event_type === t);
    const siteVisits = by("site_visit");
    const installs = by("app_install");
    const proVisits = by("pro_visit");
    const techLogins = by("tech_login");

    const countBy = (list: Evt[], key: keyof Evt) => {
      const m: Record<string, number> = {};
      list.forEach((e) => {
        const k = (e[key] as string) || "—";
        m[k] = (m[k] || 0) + 1;
      });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };

    const places: Record<string, number> = {};
    filtered.forEach((e) => {
      const p = place(e);
      if (p) places[p] = (places[p] || 0) + 1;
    });

    return {
      siteVisits,
      installs,
      proVisits,
      techLogins,
      devices: countBy(siteVisits, "device_type"),
      os: countBy(siteVisits, "os"),
      browsers: countBy(siteVisits, "browser"),
      places: Object.entries(places).sort((a, b) => b[1] - a[1]),
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f13] text-center px-6">
        <ShieldAlert size={48} className="text-red-400 mb-4" />
        <h1 className="text-white text-lg font-bold mb-1">Accès réservé</h1>
        <p className="text-gray-500 text-sm mb-5">Cette page est réservée au propriétaire du compte.</p>
        <Link href="/dashboard" className="text-orange-400 text-sm hover:underline">← Retour</Link>
      </div>
    );
  }

  const kpis = [
    { label: "Visites du site", value: stats.siteVisits.length, Icon: Globe, color: "#378ADD" },
    { label: "Installations app", value: stats.installs.length, Icon: Download, color: "#10b981" },
    { label: "Accès espace pro", value: stats.proVisits.length, Icon: UserCheck, color: "#f97316" },
    { label: "Connexions", value: stats.techLogins.length, Icon: Smartphone, color: "#7f77dd" },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">📊 Statistiques de visites</h1>
            <p className="text-xs text-gray-500">Site, installations et accès espace pro</p>
          </div>
        </div>
        <div className="flex gap-1 bg-[#16161d] border border-white/8 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${period === p.value ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-[#16161d] border border-white/5 rounded-2xl p-4">
            <k.Icon size={18} style={{ color: k.color }} />
            <div className="text-2xl font-black mt-2" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {[
          { title: "📱 Type d'appareil", data: stats.devices },
          { title: "💻 Système", data: stats.os },
          { title: "🌐 Navigateur", data: stats.browsers },
          { title: "📍 Localisation", data: stats.places },
        ].map((block) => (
          <div key={block.title} className="bg-[#16161d] border border-white/5 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">{block.title}</h3>
            {block.data.length === 0 ? (
              <p className="text-xs text-gray-600">Aucune donnée</p>
            ) : (
              <div className="space-y-2">
                {block.data.slice(0, 6).map(([name, count]) => {
                  const max = block.data[0][1];
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">{name}</span>
                        <span className="text-gray-500">{count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500/70 rounded-full" style={{ width: `${(count / max) * 100}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Download size={15} className="text-green-400" /> Installations de l'app</h3>
          {stats.installs.length === 0 ? (
            <p className="text-xs text-gray-600">Aucune installation enregistrée</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats.installs.slice(0, 50).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-xs bg-white/3 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-2 text-gray-300 min-w-0">
                    <DeviceIcon type={e.device_type} />
                    <span className="font-medium text-white truncate">{e.device_name || e.os}</span>
                    {place(e) && <span className="text-gray-500 shrink-0">{place(e)}</span>}
                    {e.ip_address && <span className="text-gray-600 font-mono shrink-0">{e.ip_address}</span>}
                  </span>
                  <span className="text-gray-600 shrink-0">{fmtDate(e.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><UserCheck size={15} className="text-orange-400" /> Connexions espace pro</h3>
          {stats.techLogins.length === 0 ? (
            <p className="text-xs text-gray-600">Aucune connexion enregistrée</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats.techLogins.slice(0, 50).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-xs bg-white/3 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-2 text-gray-300 min-w-0">
                    <DeviceIcon type={e.device_type} />
                    <span className="font-medium text-white truncate">{e.technician_name || e.user_email || "—"}</span>
                    <span className="text-gray-600 shrink-0">{e.device_name || e.os}</span>
                    {place(e) && <span className="text-gray-500 shrink-0">{place(e)}</span>}
                    {e.ip_address && <span className="text-gray-600 font-mono shrink-0">{e.ip_address}</span>}
                  </span>
                  <span className="text-gray-600 shrink-0">{fmtDate(e.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
