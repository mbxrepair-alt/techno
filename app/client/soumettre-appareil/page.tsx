"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { supabase } from "../../../lib/supabase";
import PatternLock from "../../../components/PatternLock";
import { DEVICES_LIST, getSmartIssueSuggestions, getQuickIssues } from "../../../lib/devices-catalog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  device: string;
  issue: string;
  imei: string;
  unlock_code: string;
  unlock_pattern: string;
  description: string;
  // État de l'appareil (checkboxes)
  screen_broken: boolean;
  back_broken: boolean;
  oxidation: boolean;
  missing_sim_tray: boolean;
  buttons_broken: boolean;
  camera_broken: boolean;
  charge_port_broken: boolean;
  missing_parts: string;
}

interface SubmittedTicket {
  id: number;
  device: string;
  issue: string;
}

const EMPTY_FORM: FormData = {
  device: "",
  issue: "",
  imei: "",
  unlock_code: "",
  unlock_pattern: "",
  description: "",
  screen_broken: false,
  back_broken: false,
  oxidation: false,
  missing_sim_tray: false,
  buttons_broken: false,
  camera_broken: false,
  charge_port_broken: false,
  missing_parts: "",
};

// ─── Helpers catalog API ───────────────────────────────────────────────────────

async function fetchCatalog(): Promise<{ customDevices: string[]; customIssues: string[]; hiddenIssues: string[] }> {
  try {
    const res = await fetch("/api/catalog");
    const data = await res.json();
    if (data.success) return data;
  } catch { /* ignore */ }
  return { customDevices: [], customIssues: [], hiddenIssues: [] };
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function SoumettreAppareilPage() {
  const router = useRouter();

  // Auth
  const [clientName, setClientName] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [client, setClient] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Formulaire
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [patternValue, setPatternValue] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submittedTickets, setSubmittedTickets] = useState<SubmittedTicket[]>([]);

  // Autocomplete modèle
  const [allDevices, setAllDevices] = useState<string[]>([]);
  const [deviceSuggestions, setDeviceSuggestions] = useState<string[]>([]);
  const [showDeviceSuggestions, setShowDeviceSuggestions] = useState(false);
  const deviceRef = useRef<HTMLDivElement>(null);

  // Autocomplete panne
  const [customIssues, setCustomIssues] = useState<string[]>([]);
  const [hiddenIssues, setHiddenIssues] = useState<Set<string>>(new Set());
  const [issueSuggestions, setIssueSuggestions] = useState<string[]>([]);
  const [showIssueSuggestions, setShowIssueSuggestions] = useState(false);
  const issueRef = useRef<HTMLDivElement>(null);

  // Charger les listes depuis Supabase via /api/catalog
  useEffect(() => {
    fetchCatalog().then((data) => {
      setAllDevices([...DEVICES_LIST, ...data.customDevices]);
      setCustomIssues(data.customIssues);
      setHiddenIssues(new Set(data.hiddenIssues));
    });
  }, []);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (deviceRef.current && !deviceRef.current.contains(e.target as Node))
        setShowDeviceSuggestions(false);
      if (issueRef.current && !issueRef.current.contains(e.target as Node))
        setShowIssueSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Autocomplete helpers ──────────────────────────────────────────────────

  const handleDeviceInput = (value: string) => {
    setFormData((p) => ({ ...p, device: value, issue: "" }));
    setIssueSuggestions([]);
    if (!value.trim()) { setDeviceSuggestions([]); setShowDeviceSuggestions(false); return; }
    const lower = value.toLowerCase();
    const matches = allDevices.filter((d) => d.toLowerCase().includes(lower)).slice(0, 8);
    setDeviceSuggestions(matches);
    setShowDeviceSuggestions(matches.length > 0);
  };

  const selectDevice = (device: string) => {
    setFormData((p) => ({ ...p, device }));
    setShowDeviceSuggestions(false);
    // Pré-charger les pannes rapides
    const quick = getQuickIssues(device).filter((i) => !hiddenIssues.has(i));
    setIssueSuggestions(quick);
  };

  const handleIssueInput = (value: string) => {
    setFormData((p) => ({ ...p, issue: value }));
    if (!value.trim()) {
      if (formData.device) {
        const quick = getQuickIssues(formData.device).filter((i) => !hiddenIssues.has(i));
        setIssueSuggestions(quick);
        setShowIssueSuggestions(quick.length > 0);
      } else {
        setIssueSuggestions([]);
        setShowIssueSuggestions(false);
      }
      return;
    }
    let results: string[];
    if (formData.device) {
      results = getSmartIssueSuggestions(formData.device, value).filter((i) => !hiddenIssues.has(i));
    } else {
      const lower = value.toLowerCase();
      results = [...customIssues, ...getSmartIssueSuggestions("", value)]
        .filter((i) => !hiddenIssues.has(i) && i.toLowerCase().includes(lower))
        .slice(0, 8);
    }
    setIssueSuggestions(results);
    setShowIssueSuggestions(results.length > 0);
  };

  const selectIssue = (issue: string) => {
    setFormData((p) => ({ ...p, issue }));
    setShowIssueSuggestions(false);
  };

  // ─── Auth ──────────────────────────────────────────────────────────────────

  const handleIdentification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientCode.trim()) { setError("Veuillez entrer votre code client"); return; }
    setLoading(true); setError("");
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients").select("*").eq("client_code", clientCode.toUpperCase()).single();
      if (clientError || !clientData) {
        setError("Code client invalide. Vérifiez votre code."); setLoading(false); return;
      }
      if (clientName.trim() && clientData.name.toLowerCase() !== clientName.trim().toLowerCase()) {
        setError(`Le nom ne correspond pas. Client associé : ${clientData.name}`); setLoading(false); return;
      }
      setClient(clientData); setStep(2);
    } catch { setError("Erreur de connexion"); } finally { setLoading(false); }
  };

  // ─── Pattern ───────────────────────────────────────────────────────────────

  const handlePatternComplete = (pattern: number[]) => {
    const str = pattern.join("-");
    setPatternValue(str);
    setFormData((p) => ({ ...p, unlock_pattern: str }));
  };
  const handlePatternClear = () => {
    setPatternValue("");
    setFormData((p) => ({ ...p, unlock_pattern: "" }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    setFormData((p) => ({ ...p, [name]: type === "checkbox" ? target.checked : value }));
  };

  const resetForm = () => { setFormData(EMPTY_FORM); setPatternValue(""); setError(""); };

  const isMissingBoth = () => !formData.unlock_code?.trim() && !formData.unlock_pattern?.trim();

  // ─── Soumission ────────────────────────────────────────────────────────────

  const handleSubmitAppareil = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");

    const { data: clientWithUser, error: clientFetchError } = await supabase
      .from("clients").select("user_id").eq("id", client.id).single();
    if (clientFetchError || !clientWithUser?.user_id) {
      setError("Impossible de trouver l'atelier associé"); setLoading(false); return;
    }
    const targetUserId = clientWithUser.user_id;

    // Construire le résumé état
    const stateLines = [
      formData.screen_broken     && "- Écran cassé/fissuré",
      formData.back_broken       && "- Dos cassé",
      formData.oxidation         && "- Oxydation signalée",
      formData.missing_sim_tray  && "- Tiroir SIM manquant",
      formData.buttons_broken    && "- Boutons cassés",
      formData.camera_broken     && "- Caméra cassée",
      formData.charge_port_broken && "- Connecteur de charge cassé",
      formData.missing_parts     && `- Pièces manquantes : ${formData.missing_parts}`,
    ].filter(Boolean).join("\n");

    const diagnosis = [
      formData.screen_broken     && "⚠️ Écran cassé / fissuré",
      formData.back_broken       && "⚠️ Dos cassé",
      formData.oxidation         && "⚠️ Oxydation - Test impossible, pas pris en garantie",
      formData.missing_sim_tray  && "⚠️ Tiroir SIM manquant",
      formData.buttons_broken    && "⚠️ Boutons cassés",
      formData.camera_broken     && "⚠️ Caméra cassée",
      formData.charge_port_broken && "⚠️ Connecteur de charge cassé",
      formData.missing_parts     && `⚠️ Pièces manquantes : ${formData.missing_parts}`,
    ].filter(Boolean).join("\n");

    let observations = formData.description || "";
    if (isMissingBoth()) {
      observations += "\n⚠️ CODE ET SCHÉMA DÉVERROUILLAGE NON FOURNIS - Test impossible, pas pris en garantie";
    }

    const technicienDiagnosis = `📋 INFORMATIONS CLIENT :
📱 Modèle: ${formData.device}
🔧 Panne déclarée: ${formData.issue}
🔢 IMEI: ${formData.imei || "NON FOURNI"}
🎨 Schéma: ${formData.unlock_pattern ? "FOURNI" : "NON FOURNI"}
🔑 Code: ${formData.unlock_code || "NON FOURNI"}

⚠️ ÉTAT CONSTATÉ PAR LE CLIENT :
${stateLines || "Aucun problème signalé"}

📝 DESCRIPTION CLIENT :
${formData.description || "Aucune description"}

---
🔧 À vérifier par le technicien :
- [ ] Vérifier l'état réel de l'écran
- [ ] Vérifier la présence d'oxydation
- [ ] Tester la charge
- [ ] Diagnostic complet à réaliser
`;

    const newTickets: SubmittedTicket[] = [];
    try {
      for (let i = 0; i < quantity; i++) {
        const { data: newTicket, error: insertError } = await supabase
          .from("repairs")
          .insert({
            client_id: client.id,
            device: formData.device,
            issue: formData.issue,
            imei: formData.imei || "NC",
            unlock_code: formData.unlock_code || "NC",
            unlock_pattern: formData.unlock_pattern || "",
            description: observations,
            diagnosis,
            diagnostic_technicien: technicienDiagnosis,
            status: "📤 Envoyé à l'atelier",
            user_id: targetUserId,
            is_client_submitted: true,
            submitted_at: new Date().toISOString(),
          })
          .select().single();
        if (insertError) throw insertError;
        newTickets.push({ id: newTicket.id, device: formData.device, issue: formData.issue });
      }
      setSubmittedTickets((prev) => [...prev, ...newTickets]);
      resetForm();
      setQuantity(1);
      showToast(`✅ ${quantity} appareil(s) "${formData.device}" ajouté(s) avec succès !`);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'enregistrement");
    } finally { setLoading(false); }
  };

  // ─── Impression ticket (format dashboard : TECHNICIEN + CLIENT) ────────────

  const escHtml = (s: string) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const printTicket = async (ticket: SubmittedTicket) => {
    const BASE_URL = "https://technophone.vercel.app";

    // QR 1 — Technicien : fiche réparation
    let qrTechUrl: string | null = null;
    try {
      qrTechUrl = await QRCode.toDataURL(`${BASE_URL}/repairs/${ticket.id}`, {
        width: 140, margin: 1,
        color: { dark: "#1e3a8a", light: "#ffffff" },
        errorCorrectionLevel: "M" as const,
      });
    } catch { /* ignore */ }

    // QR 2 — Client : suivi
    let qrClientUrl: string | null = null;
    if (client?.client_code) {
      try {
        qrClientUrl = await QRCode.toDataURL(`${BASE_URL}/suivi-client?code=${client.client_code}`, {
          width: 140, margin: 1,
          color: { dark: "#166534", light: "#ffffff" },
          errorCorrectionLevel: "H" as const,
        });
      } catch { /* ignore */ }
    }

    const rawCode = formData.unlock_code || "";
    const hasCode = rawCode && rawCode !== "NC" && rawCode.trim() !== "";
    const codeValue = hasCode ? rawCode : null;
    const note = formData.description && formData.description !== "NC"
      ? escHtml(formData.description) : "—";
    const dateStr = new Date().toLocaleDateString("fr-FR");
    const timeStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const clientName = escHtml(client?.name ?? "—");
    const clientCode = client?.client_code ?? "—";
    const clientPhone = escHtml(client?.phone ?? "");

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Ticket MBX-${ticket.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;background:#e5e7eb;display:flex;justify-content:center;padding:16px}
  .wrapper{display:flex;flex-direction:column;align-items:center;gap:0;width:90mm}
  /* TECHNICIEN */
  .tech-card{width:90mm;background:#fff;border-radius:4mm;padding:4mm;border:1px solid #c7d2fe}
  .tech-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e0e7ff;padding-bottom:2mm;margin-bottom:2mm}
  .tech-header-left h2{font-size:11px;font-weight:900;color:#1e3a8a;letter-spacing:.5px}
  .tech-header-left p{font-size:8px;color:#64748b}
  .badge-tech{background:#1e3a8a;color:#fff;font-size:8px;font-weight:700;padding:1mm 2.5mm;border-radius:2mm}
  .ticket-id{text-align:center;font-size:20px;font-weight:900;color:#1e3a8a;letter-spacing:1px;padding:2mm 0;border-bottom:1px dashed #c7d2fe;margin-bottom:2mm}
  .row{display:flex;justify-content:space-between;align-items:flex-start;gap:3mm}
  .info-block{flex:1;font-size:8.5px;line-height:1.55}
  .lbl{font-weight:700;color:#334155;font-size:7.5px;text-transform:uppercase;letter-spacing:.5px}
  .code-box{font-size:8px;padding:1.5mm 2mm;border-radius:2mm;margin-top:2mm;border-left:2.5px solid #22c55e;background:#f0fdf4;color:#166534}
  .code-box.no-code{border-left-color:#ef4444;background:#fef2f2;color:#991b1b;font-weight:700}
  .note-box{font-size:8px;background:#fffbeb;border-left:2.5px solid #f59e0b;padding:1.5mm 2mm;border-radius:2mm;margin-top:2mm;color:#78350f}
  .qr-tech-area{text-align:center;min-width:28mm}
  .qr-tech-area img{width:28mm;height:28mm;display:block}
  .qr-tech-label{font-size:6.5px;color:#1e3a8a;font-weight:700;text-align:center;margin-top:1mm;line-height:1.2}
  .tech-footer{display:flex;justify-content:space-between;font-size:7.5px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:1.5mm;margin-top:2mm}
  /* DÉCOUPE */
  .cut{width:90mm;text-align:center;font-size:8px;color:#9ca3af;letter-spacing:2px;padding:1.5mm 0;border-top:1.5px dashed #9ca3af}
  /* CLIENT */
  .client-card{width:90mm;background:#fff;border-radius:4mm;padding:3mm 4mm;border:1px solid #bbf7d0}
  .client-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2mm}
  .client-header-title{font-size:10px;font-weight:900;color:#166534}
  .client-header-title span{font-size:8px;font-weight:normal;color:#64748b;display:block}
  .badge-client{background:#166534;color:#fff;font-size:8px;font-weight:700;padding:1mm 2.5mm;border-radius:2mm}
  .client-info-row{display:flex;justify-content:space-between;align-items:flex-start;gap:3mm}
  .client-info-block{flex:1;font-size:8.5px;line-height:1.6}
  .client-code-big{font-size:15px;font-weight:900;color:#166534;letter-spacing:1px;margin:1mm 0}
  .qr-client-area{text-align:center;min-width:28mm}
  .qr-client-area img{width:28mm;height:28mm;display:block}
  .qr-client-label{font-size:6.5px;color:#166534;font-weight:700;text-align:center;margin-top:1mm;line-height:1.2}
  @media print{
    body{background:#fff;padding:0}
    .no-print{display:none!important}
    .tech-card,.client-card,.cut{page-break-inside:avoid}
  }
  .no-print{text-align:center;margin-top:6mm;display:flex;gap:3mm;justify-content:center}
  button{padding:3mm 6mm;background:#1e3a8a;color:#fff;border:none;border-radius:3mm;font-size:10px;cursor:pointer}
  button.close{background:#64748b}
</style></head>
<body><div class="wrapper">

  <!-- TICKET TECHNICIEN — À envoyer avec le téléphone -->
  <div class="tech-card">
    <div class="tech-header">
      <div class="tech-header-left">
        <h2>🔧 MBX Réparations</h2>
        <p>Ticket de dépôt appareil</p>
      </div>
      <span class="badge-tech">ATELIER</span>
    </div>
    <div class="ticket-id">MBX-${ticket.id}</div>
    <div class="row">
      <div class="info-block">
        <div style="font-size:11px;font-weight:900;color:#1e293b;line-height:1.2">${clientName}</div>
        <div style="font-size:10px;font-weight:800;color:#1e3a8a;margin-top:1.5mm">${escHtml(ticket.device).substring(0, 28)}</div>
        <div style="font-size:9.5px;font-weight:700;color:#374151;margin-top:1mm;margin-bottom:2mm">${escHtml(ticket.issue).substring(0, 35)}</div>
        <div style="font-size:8px;color:#64748b">${clientPhone}</div>
        ${formData.imei && formData.imei !== "NC" ? `<div style="font-size:7.5px;color:#94a3b8;margin-top:1mm">IMEI : ${escHtml(formData.imei)}</div>` : ""}
        ${codeValue ? `<div class="code-box">🔑 Code : ${escHtml(codeValue)}</div>` : `<div class="code-box no-code">⚠️ Code non fourni</div>`}
        <div class="note-box">📝 ${note}</div>
      </div>
      <div class="qr-tech-area">
        ${qrTechUrl ? `<img src="${qrTechUrl}"/>` : ""}
        <div class="qr-tech-label">📲 Scanner pour<br>ouvrir la fiche</div>
      </div>
    </div>
    <div class="tech-footer">
      <span>⏱ ${dateStr} ${timeStr}</span>
      <span>MBX Réparations</span>
    </div>
  </div>

  <!-- LIGNE DE DÉCOUPE -->
  <div class="cut">✂ - - - - - - - - -  DÉCOUPER · partie client  - - - - - - - - - ✂</div>

  <!-- TICKET CLIENT — À conserver par le client -->
  <div class="client-card">
    <div class="client-header">
      <div class="client-header-title">
        🎫 MBX-${ticket.id}
        <span>${escHtml(ticket.device).substring(0, 30)} · ${dateStr}</span>
      </div>
      <span class="badge-client">CLIENT</span>
    </div>
    <div class="client-info-row">
      <div class="client-info-block">
        <div><span class="lbl">Client</span><br>${clientName}</div>
        <div style="margin-top:2mm"><span class="lbl">Panne déclarée</span><br>${escHtml(ticket.issue).substring(0, 30)}</div>
        ${!codeValue ? `<div style="font-size:7.5px;background:#fef2f2;border-left:2px solid #ef4444;color:#991b1b;font-weight:700;padding:1.5mm 2mm;border-radius:2mm;margin-top:2mm">⚠️ Appareil non testé — pas pris en garantie (code non fourni)</div>` : ""}
        <div style="margin-top:2mm">
          <span class="lbl">Votre code de suivi</span>
          <div class="client-code-big">${clientCode}</div>
          <span style="font-size:7px;color:#64748b">→ technophone.vercel.app/suivi-client</span>
        </div>
      </div>
      <div class="qr-client-area">
        ${qrClientUrl ? `<img src="${qrClientUrl}"/>` : ""}
        <div class="qr-client-label">🔍 Suivre votre<br>réparation</div>
      </div>
    </div>
  </div>

  <div class="no-print">
    <button onclick="window.print()">🖨️ Imprimer</button>
    <button class="close" onclick="window.close()">✕ Fermer</button>
  </div>
</div></body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const iframeDoc = (iframe.contentWindow as Window).document;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    setTimeout(() => {
      (iframe.contentWindow as Window).focus();
      (iframe.contentWindow as Window).print();
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 2000);
    }, 500);
  };

  const printAllTickets = () => {
    submittedTickets.forEach((t, i) => {
      setTimeout(() => printTicket(t), i * 800);
    });
  };

  const showToast = (msg: string) => {
    const d = document.createElement("div");
    d.className = "fixed bottom-4 right-4 bg-green-500 text-white px-5 py-3 rounded-xl shadow-2xl z-50 font-semibold text-sm";
    d.innerText = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3500);
  };

  const finishAndGoHome = () => router.push("/");

  // ──────────────────────────────────────────────────────────────────────────
  // ÉTAPE 1 — Identification
  // ──────────────────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Blobs néon fond */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.04)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500/15 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-orange-600/15 rounded-full blur-[80px] animate-pulse" />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <a href="/" className="inline-flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 opacity-60 blur-md group-hover:opacity-90 transition" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden">
                  <img src="/logo.png" alt="MBX" className="w-full h-full object-cover rounded-xl" />
                </div>
              </div>
              <div className="leading-tight text-left">
                <span className="text-white font-black text-2xl tracking-tight">MBX</span>
                <span className="text-orange-400 text-[10px] block -mt-1 font-bold tracking-[0.2em]">RÉPARATIONS</span>
              </div>
            </a>
          </div>

          {/* Card */}
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-[0_0_40px_rgba(249,115,22,0.1)] p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                <span className="text-3xl">🔑</span>
              </div>
              <h1 className="text-2xl font-black text-white mb-1">Soumettre un appareil</h1>
              <p className="text-gray-400 text-sm">Identifiez-vous avec votre code client</p>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-6">
              <p className="text-sm text-orange-300 text-center">💡 Votre code client se trouve sur l&apos;email de confirmation</p>
            </div>

            <form onSubmit={handleIdentification} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">👤 Votre nom</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">🔑 Code client *</label>
                <input type="text" required value={clientCode} onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                  placeholder="Ex: DOM923167"
                  className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono text-center text-lg tracking-widest transition"
                  autoFocus />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_35px_rgba(249,115,22,0.5)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition" />
                <span className="relative z-10">
                  {loading ? "⏳ Vérification..." : "Continuer →"}
                </span>
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/" className="text-gray-500 hover:text-orange-400 text-xs transition">← Retour à l&apos;accueil</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ÉTAPE 2 — Formulaire appareil
  // ──────────────────────────────────────────────────────────────────────────

  const showMissingMessage = isMissingBoth();

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      {/* Fond grille + blobs */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(249,115,22,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.04)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px] animate-pulse" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-2xl border-b border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 opacity-50 blur-sm group-hover:opacity-80 transition" />
              <div className="relative w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg overflow-hidden">
                <img src="/logo.png" alt="MBX" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="leading-tight">
              <span className="text-white font-black text-lg tracking-tight">MBX</span>
              <span className="text-orange-400 text-[9px] block -mt-0.5 font-bold tracking-[0.2em]">RÉPARATIONS</span>
            </div>
          </a>

          <div className="flex items-center gap-3">
            {/* Badge client connecté */}
            <div className="hidden sm:flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-orange-300 text-xs font-semibold">{client?.name}</span>
              <span className="text-gray-500 text-xs font-mono">{client?.client_code}</span>
            </div>
            {submittedTickets.length > 0 && (
              <span className="bg-green-500/10 border border-green-500/40 text-green-400 px-2.5 py-1 rounded-full text-xs font-bold">
                ✅ {submittedTickets.length} ticket{submittedTickets.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Tickets déjà soumis */}
        {submittedTickets.length > 0 && (
          <div className="bg-green-500/5 border border-green-500/30 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
                📦 Appareils déclarés
              </p>
              <button onClick={printAllTickets}
                className="bg-orange-500/10 border border-orange-500/40 text-orange-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-500/20 transition flex items-center gap-1">
                🖨️ Tout imprimer
              </button>
            </div>
            <div className="space-y-2">
              {submittedTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-1 rounded-lg font-bold">MBX-{ticket.id}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{ticket.device}</div>
                      <div className="text-xs text-gray-400">{ticket.issue}</div>
                    </div>
                  </div>
                  <button onClick={() => printTicket(ticket)}
                    className="bg-orange-500/10 border border-orange-500/40 text-orange-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-500/20 transition flex items-center gap-1">
                    🖨️ Ticket
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire principal */}
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-[0_0_40px_rgba(249,115,22,0.08)] overflow-hidden">

          {/* Header formulaire */}
          <div className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-6 py-5 border-b border-orange-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.06)_1px,transparent_1px)] bg-[size:30px_30px]" />
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)] text-xl">📱</div>
              <div>
                <h1 className="text-lg font-black text-white">Déclaration d&apos;appareil</h1>
                <p className="text-orange-400/70 text-xs">Remplissez les informations de votre appareil</p>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-1">
                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" /></span>
                <span className="text-orange-400 text-[10px] font-bold tracking-wider">EXPERT EN RÉPARATION</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitAppareil} className="p-6 space-y-5">

            {/* Modèle — autocomplete */}
            <div ref={deviceRef} className="relative">
              <label className="block text-sm font-semibold text-gray-300 mb-1.5 flex items-center gap-2">
                📱 Modèle du téléphone *
              </label>
              <input
                type="text"
                name="device"
                required
                placeholder="Ex: Apple iPhone 15 Pro A2848, Samsung Galaxy S24..."
                value={formData.device}
                onChange={(e) => handleDeviceInput(e.target.value)}
                onFocus={() => { if (deviceSuggestions.length > 0) setShowDeviceSuggestions(true); }}
                className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
              {showDeviceSuggestions && deviceSuggestions.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                  {deviceSuggestions.map((d, i) => (
                    <div key={i} onMouseDown={() => selectDevice(d)}
                      className="px-4 py-2.5 hover:bg-orange-500/10 cursor-pointer text-sm text-gray-200 border-b border-gray-700 last:border-0 flex items-center gap-2 transition">
                      <span className="text-orange-400">📱</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Tapez la marque, le modèle ou le numéro (ex: SM-G973F, A2197)</p>
            </div>

            {/* Panne — autocomplete intelligent */}
            <div ref={issueRef} className="relative">
              <label className="block text-sm font-semibold text-gray-300 mb-1.5 flex items-center gap-2">
                🔧 Panne / Problème *
                {formData.device && (
                  <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-full">
                    ✨ Suggestions auto
                  </span>
                )}
              </label>
              <input
                type="text"
                name="issue"
                required
                placeholder="Ex: Ne charge plus, écran noir, batterie gonflée..."
                value={formData.issue}
                onChange={(e) => handleIssueInput(e.target.value)}
                onFocus={() => {
                  if (issueSuggestions.length > 0) { setShowIssueSuggestions(true); return; }
                  if (formData.device) {
                    const q = getQuickIssues(formData.device).filter((i) => !hiddenIssues.has(i));
                    setIssueSuggestions(q);
                    setShowIssueSuggestions(q.length > 0);
                  }
                }}
                className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
              {showIssueSuggestions && issueSuggestions.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                  {formData.device && (
                    <div className="px-4 py-1.5 text-[10px] font-bold text-orange-400 bg-orange-500/10 border-b border-orange-500/20 uppercase tracking-wider">
                      ✨ Suggestions pour {formData.device.split(" ").slice(0, 3).join(" ")}
                    </div>
                  )}
                  {issueSuggestions.map((s, i) => (
                    <div key={i} onMouseDown={() => selectIssue(s)}
                      className="px-4 py-2.5 hover:bg-orange-500/10 cursor-pointer text-sm text-gray-200 border-b border-gray-700 last:border-0 flex items-center gap-2 transition">
                      <span>{s.startsWith("Remplacement") ? "🔩" : "🔧"}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* IMEI + Code — 2 colonnes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">🔢 IMEI</label>
                <input type="text" name="imei" placeholder="*#06# pour l'obtenir"
                  value={formData.imei} onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">🔑 Code déverrouillage</label>
                <input type="text" name="unlock_code" placeholder="4 ou 6 chiffres"
                  value={formData.unlock_code} onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>
            </div>

            {/* Schéma */}
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">🎨 Schéma déverrouillage</label>
                {patternValue && (
                  <span className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">✓ {patternValue.split("-").length} points</span>
                )}
              </div>
              <PatternLock onComplete={handlePatternComplete} onClear={handlePatternClear} />
              {showMissingMessage && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400 text-center font-semibold">
                    ⚠️ CODE ET SCHÉMA NON FOURNIS — Test impossible, pas pris en garantie
                  </p>
                </div>
              )}
            </div>

            {/* État de l'appareil */}
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
              <label className="block text-sm font-bold text-gray-200 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-xs">📱</span>
                État de l&apos;appareil
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { name: "screen_broken",      label: "📱 Écran cassé / fissuré",               warn: false },
                  { name: "back_broken",         label: "🔧 Dos cassé",                           warn: false },
                  { name: "oxidation",           label: "💧 Oxydation",                           warn: true  },
                  { name: "missing_sim_tray",    label: "📭 Tiroir SIM manquant",                 warn: true  },
                  { name: "buttons_broken",      label: "🔇 Boutons cassés (power / volume)",     warn: false },
                  { name: "camera_broken",       label: "📷 Caméra cassée / vitre fêlée",         warn: false },
                  { name: "charge_port_broken",  label: "🔌 Connecteur de charge endommagé",      warn: true  },
                ].map(({ name, label, warn }) => (
                  <label key={name} className="flex items-center gap-3 cursor-pointer bg-gray-900/50 hover:bg-orange-500/5 rounded-lg px-3 py-2.5 border border-gray-700 hover:border-orange-500/40 transition group">
                    <input type="checkbox" name={name}
                      checked={(formData as any)[name]}
                      onChange={handleInputChange}
                      className="w-4 h-4 accent-orange-500 shrink-0" />
                    <span className="text-sm text-gray-300 group-hover:text-white transition">{label}</span>
                    {warn && <span className="text-orange-500 text-xs font-bold ml-auto shrink-0">⚠️</span>}
                  </label>
                ))}
              </div>
            </div>

            {/* Pièces manquantes */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">⚠️ Pièces manquantes</label>
              <input type="text" name="missing_parts"
                placeholder="Ex: Vis, cache batterie, carte SIM, écouteur..."
                value={formData.missing_parts} onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">📝 Description complète</label>
              <textarea name="description" rows={3}
                placeholder="Décrivez précisément les problèmes constatés, l'état général, depuis quand..."
                value={formData.description} onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition resize-none" />
            </div>

            {/* Disclaimer */}
            <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-lg shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-red-400">Information importante</p>
                  <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                    Si les informations fournies (modèle, CODE, SCHÉMA, état, etc.) ne correspondent pas
                    à votre appareil, nous nous réservons le droit de refuser la réparation.
                  </p>
                </div>
              </div>
            </div>

            {/* Quantité */}
            <div className="bg-gray-800/40 border border-orange-500/20 rounded-xl p-4">
              <label className="block text-sm font-semibold text-orange-300 mb-1 flex items-center gap-2">
                <span className="w-5 h-5 bg-orange-500/20 rounded flex items-center justify-center text-xs">🔢</span>
                Plusieurs exemplaires du MÊME modèle ?
              </label>
              <p className="text-xs text-gray-500 mb-3">Pour un appareil <span className="text-orange-300">différent</span>, laissez sur 1 et ajoutez-le après validation.</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-900/70 border border-gray-600 rounded-xl px-3 py-2">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 font-black text-lg flex items-center justify-center transition">−</button>
                  <span className="w-8 text-center font-black text-white text-xl">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    className="w-8 h-8 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 font-black text-lg flex items-center justify-center transition">+</button>
                </div>
                <span className="text-sm text-gray-400">
                  {quantity} appareil{quantity > 1 ? "s" : ""} identique{quantity > 1 ? "s" : ""} seront créés
                </span>
              </div>
              {quantity > 1 && (
                <p className="text-xs text-orange-400/60 mt-2">✨ Utile pour un lot de réparation avec la même panne</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm text-center font-semibold">{error}</p>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading}
                className="flex-1 relative group overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-black text-sm shadow-[0_0_25px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <><span className="animate-spin">⏳</span> Enregistrement...</>
                  ) : submittedTickets.length > 0 ? (
                    <>➕ Ajouter cet appareil {quantity > 1 ? `(${quantity})` : ""}</>
                  ) : (
                    <>✨ Déclarer cet appareil {quantity > 1 ? `(${quantity})` : ""}</>
                  )}
                </span>
              </button>
              {submittedTickets.length > 0 && (
                <button type="button" onClick={finishAndGoHome}
                  className="px-5 bg-green-500/10 border border-green-500/40 text-green-400 py-4 rounded-xl font-bold hover:bg-green-500/20 transition text-sm">
                  ✅ Terminer
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 text-center -mt-1">
              💡 Après validation, le formulaire se vide pour ajouter un <span className="text-orange-300">autre appareil (modèle différent)</span>. Cliquez « Terminer » quand vous avez fini.
            </p>

          </form>
        </div>

        {/* Résumé final */}
        {submittedTickets.length > 0 && (
          <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.05)] p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-center text-xl">🎉</div>
              <div>
                <h2 className="font-black text-white">Récapitulatif</h2>
                <p className="text-sm text-gray-400">{submittedTickets.length} appareil(s) enregistré(s) — imprimez les tickets</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={printAllTickets}
                className="flex-1 relative group overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] transition text-sm flex items-center justify-center gap-2">
                <span className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition" />
                <span className="relative z-10 flex items-center gap-2">🖨️ Imprimer tous les tickets ({submittedTickets.length})</span>
              </button>
              <button onClick={finishAndGoHome}
                className="px-5 bg-gray-800/70 border border-gray-600 text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-700 transition text-sm">
                ← Retour
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
