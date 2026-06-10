"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, getCurrentUser } from "../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Layout from "../../../components/Layout";
import SmartTextarea from "../../../components/SmartTextarea";
import QRCode from "qrcode";

export default function RepairDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [repair, setRepair] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [historique, setHistorique] = useState([]);
  const [showHistorique, setShowHistorique] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allRepairs, setAllRepairs] = useState([]);
  const [allClients, setAllClients] = useState([]);

  const [diagnosticTechnicien, setDiagnosticTechnicien] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [diagnosticPrice, setDiagnosticPrice] = useState("");
  const [risks, setRisks] = useState("");
  const [testsPassed, setTestsPassed] = useState("");

  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [parts, setParts] = useState([]);
  const [currentPart, setCurrentPart] = useState({ name: "", quantity: 1, price: 0 });

  const [showPartModal, setShowPartModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [companyInfo, setCompanyInfo] = useState({ name: "", phone: "", address: "", email: "" });

  // Pour éviter les doublons d'historique
  const lastSavedRef = useRef({
    diagnostic: "",
    repairDescription: "",
    risks: "",
    testsPassed: "",
    finalPrice: 0,
  });

  const quickActions = [
    {
      status: "📤 Envoyé à l'atelier",
      label: "Envoyé",
      color: "bg-blue-500",
      textColor: "text-white",
    },
    {
      label: "⏳ Attente validation client",
      status: "⏳ Attente validation client",
      color: "bg-amber-500",
      textColor: "text-white",
    },
    {
      label: "🔐 Mot de passe incorrect",
      status: "🔐 Mot de passe incorrect",
      color: "bg-red-500",
      textColor: "text-white",
    },
    {
      label: "📦 Attente pièce",
      status: "📦 Attente pièce",
      color: "bg-orange-500",
      textColor: "text-white",
    },
    {
      label: "🔬 Diagnostic",
      status: "🔬 Diagnostic",
      color: "bg-blue-500",
      textColor: "text-white",
    },
    {
      label: "🔧 En réparation",
      status: "🔧 En réparation",
      color: "bg-orange-600",
      textColor: "text-white",
    },
    { label: "✅ Terminé", status: "✅ Terminé", color: "bg-purple-500", textColor: "text-white" },
    { label: "📦 Rendu au client", status: "📦 Rendu", color: "bg-gray-600", textColor: "text-white" },
    { label: "❌ KO - Irréparable", status: "❌ KO", color: "bg-red-600", textColor: "text-white" },
    {
      label: "🚫 Refus client",
      status: "🚫 Refus client",
      color: "bg-pink-600",
      textColor: "text-white",
    },
  ];

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
        // Load company profile for email sending
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_name, contact_phone, contact_address, email")
          .eq("id", user.id)
          .single();
        if (profile) {
          setCompanyInfo({
            name: profile.company_name || "",
            phone: profile.contact_phone || "",
            address: profile.contact_address || "",
            email: profile.email || "",
          });
        }
      }
      if (id) {
        await loadRepair();
        await loadHistorique();
        await loadAllDataForSearch();
      }
    };
    init();
  }, [id]);

  const loadAllDataForSearch = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const { data: repairsData } = await supabase
        .from("repairs")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false });
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", user.id);
      setAllRepairs(repairsData || []);
      setAllClients(clientsData || []);
    } catch (error) {
      console.error("Erreur chargement données recherche:", error);
    }
  };

  const loadRepair = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("repairs")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      setRepair(data);
      if (data.client_id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", data.client_id)
          .single();
        setClient(clientData);
        setEmailTo(clientData.email || "");
      }
      setDiagnosticTechnicien(data.diagnostic_technicien || "");
      setRepairDescription(data.repair_description || "");
      setFinalPrice(data.final_price || data.estimated_price || "");
      setDiagnosticPrice(data.diagnostic_price || "");
      setRisks(data.risks || "");
      setTestsPassed(data.tests_passed || "");
      setPhotos(data.photos || []);
      if (data.parts_used) {
        try {
          setParts(JSON.parse(data.parts_used));
        } catch {
          setParts([]);
        }
      }

      lastSavedRef.current = {
        diagnostic: data.diagnostic_technicien || "",
        repairDescription: data.repair_description || "",
        risks: data.risks || "",
        testsPassed: data.tests_passed || "",
        finalPrice: parseFloat(data.final_price || 0),
      };
    } catch (err) {
      console.error(err);
      showMessage("Erreur chargement réparation", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadHistorique = async () => {
    try {
      const { data, error } = await supabase
        .from("historique")
        .select("*")
        .eq("entity_type", "appareil")
        .eq("entity_id", String(id))
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistorique(data || []);
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    }
  };

  // 🔧 FONCTION AJOUTER HISTORIQUE CORRIGÉE
  const ajouterHistorique = async (action, description, oldValue = null, newValue = null) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Récupérer le vrai nom du technicien connecté depuis sessionStorage
      let userName = user.email?.split("@")[0] || "Utilisateur";
      let technicianId = null;

      if (typeof window !== "undefined") {
        const techPermissions = sessionStorage.getItem("technician_permissions");
        if (techPermissions) {
          const tech = JSON.parse(techPermissions);
          if (tech && tech.name) {
            userName = tech.name;
            technicianId = tech.id;
          }
        }
      }

      const { error } = await supabase.from("historique").insert([
        {
          entity_type: "appareil",
          entity_id: String(id),
          action: action,
          description: description,
          old_value: oldValue,
          new_value: newValue,
          user_id: user.id,
          technician_id: technicianId,
          user_type: "technicien",
          user_name: userName,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
      await loadHistorique();
      return true;
    } catch (error) {
      console.error("Erreur ajout historique:", error);
      return false;
    }
  };

  const autoSave = async () => {
    const updateData = {
      diagnostic_technicien: diagnosticTechnicien,
      risks,
      repair_description: repairDescription,
      final_price: parseFloat(String(finalPrice || 0)),
      ...(diagnosticPrice !== "" && { diagnostic_price: parseFloat(String(diagnosticPrice)) }),
      tests_passed: testsPassed,
      parts_used: JSON.stringify(parts),
      photos: photos,
    };

    const { error } = await supabase.from("repairs").update(updateData).eq("id", id);
    if (error) console.error("Erreur sauvegarde auto:", error);

    if (diagnosticTechnicien !== lastSavedRef.current.diagnostic && diagnosticTechnicien !== "") {
      await ajouterHistorique(
        "modification",
        `📝 Diagnostic technicien modifié`,
        lastSavedRef.current.diagnostic || "(vide)",
        diagnosticTechnicien
      );
      lastSavedRef.current.diagnostic = diagnosticTechnicien;
    }

    if (repairDescription !== lastSavedRef.current.repairDescription && repairDescription !== "") {
      await ajouterHistorique(
        "modification",
        `🔧 Travaux effectués modifiés`,
        lastSavedRef.current.repairDescription || "(vide)",
        repairDescription
      );
      lastSavedRef.current.repairDescription = repairDescription;
    }

    if (risks !== lastSavedRef.current.risks && risks !== "") {
      await ajouterHistorique(
        "modification",
        `⚠️ Risques modifiés`,
        lastSavedRef.current.risks || "(vide)",
        risks
      );
      lastSavedRef.current.risks = risks;
    }

    if (testsPassed !== lastSavedRef.current.testsPassed && testsPassed !== "") {
      await ajouterHistorique(
        "modification",
        `✅ Tests modifiés`,
        lastSavedRef.current.testsPassed || "(vide)",
        testsPassed
      );
      lastSavedRef.current.testsPassed = testsPassed;
    }

    const newPrice = parseFloat(String(finalPrice || 0));
    if (newPrice !== lastSavedRef.current.finalPrice && finalPrice !== "") {
      await ajouterHistorique(
        "modification",
        `💰 Prix modifié`,
        `${lastSavedRef.current.finalPrice}€`,
        `${newPrice}€`
      );
      lastSavedRef.current.finalPrice = newPrice;
    }
  };

  useEffect(() => {
    if (!loading && id) {
      const timer = setTimeout(() => autoSave(), 2000);
      return () => clearTimeout(timer);
    }
  }, [diagnosticTechnicien, risks, repairDescription, finalPrice, diagnosticPrice, testsPassed, parts, photos]);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const term = value.toLowerCase();
    const clientMap = new Map();
    allClients.forEach((c) => clientMap.set(c.id, c));
    const filtered = allRepairs.filter((repair) => {
      const ticketMatch = repair.id.toString().includes(term) || `mbx-${repair.id}`.includes(term);
      const client = clientMap.get(repair.client_id);
      const clientName = client?.name?.toLowerCase() || "";
      const clientMatch = clientName.includes(term);
      const deviceMatch = repair.device?.toLowerCase().includes(term) || false;
      return ticketMatch || clientMatch || deviceMatch;
    });
    const results = filtered.map((repair) => ({
      ...repair,
      clientName: clientMap.get(repair.client_id)?.name || "Client inconnu",
    }));
    setSearchResults(results.slice(0, 8));
    setShowSearchResults(results.length > 0);
  };

  const goToRepair = (repairId) => router.push(`/repairs/${repairId}`);

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showMessage("Veuillez sélectionner une image", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage("L'image ne doit pas dépasser 5Mo", "error");
      return;
    }
    setUploading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `repairs/${id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("repair-photos")
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("repair-photos").getPublicUrl(filePath);
      const newPhotos = [...photos, publicUrl];
      setPhotos(newPhotos);
      await ajouterHistorique("modification", `📸 Photo ajoutée`);
      showMessage("Photo ajoutée", "success");
    } catch (error) {
      console.error("Erreur upload:", error);
      showMessage("Erreur lors de l'upload", "error");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoUrl) => {
    const newPhotos = photos.filter((p) => p !== photoUrl);
    setPhotos(newPhotos);
    await ajouterHistorique("modification", `🗑️ Photo supprimée`);
    showMessage("Photo supprimée", "success");
  };

  const updateStatus = async (newStatus) => {
    const oldStatus = repair?.status;

    const { error } = await supabase.from("repairs").update({ status: newStatus }).eq("id", id);

    if (error) {
      showMessage("Erreur mise à jour", "error");
    } else {
      await ajouterHistorique(
        "changement_statut",
        `🔄 Statut : "${oldStatus}" → "${newStatus}"`,
        oldStatus,
        newStatus
      );
      showMessage(`Statut: ${newStatus}`);
      loadRepair();
    }
  };

  const escapeHtml = (str: string) =>
    String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const printRepairTicket = async () => {
    if (!repair || !client) return;
    const BASE_URL = "https://technophone.vercel.app";

    let qrTechUrl: string | null = null;
    try {
      qrTechUrl = await QRCode.toDataURL(`${BASE_URL}/repairs/${repair.id}`, {
        width: 140, margin: 1,
        color: { dark: "#1e3a8a", light: "#ffffff" },
        errorCorrectionLevel: "M" as const,
      });
    } catch (_) { /* ignore */ }

    let qrClientUrl: string | null = null;
    if (client.client_code) {
      try {
        qrClientUrl = await QRCode.toDataURL(`${BASE_URL}/suivi-client?code=${client.client_code}`, {
          width: 140, margin: 1,
          color: { dark: "#166534", light: "#ffffff" },
          errorCorrectionLevel: "H" as const,
        });
      } catch (_) { /* ignore */ }
    }

    const rawCode = repair.unlock_code || repair.code || "";
    const hasCode = rawCode && rawCode !== "NC" && rawCode !== "Non fourni" && rawCode.trim() !== "";
    const codeValue = hasCode ? rawCode : null;
    const dateStr = new Date().toLocaleDateString("fr-FR");
    const timeStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket MBX-${repair.id}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;background:#e5e7eb;display:flex;justify-content:center;padding:16px}.wrapper{display:flex;flex-direction:column;align-items:center;width:90mm}.tech-card{width:90mm;background:#fff;border-radius:4mm 4mm 0 0;padding:4mm;border:1px solid #c7d2fe;border-bottom:none}.tech-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e0e7ff;padding-bottom:2mm;margin-bottom:2mm}.tech-header-left h2{font-size:11px;font-weight:900;color:#1e3a8a}.tech-header-left p{font-size:8px;color:#64748b}.badge-tech{background:#1e3a8a;color:#fff;font-size:8px;font-weight:700;padding:1mm 2.5mm;border-radius:2mm}.ticket-id{text-align:center;font-size:20px;font-weight:900;color:#1e3a8a;padding:2mm 0;border-bottom:1px dashed #c7d2fe;margin-bottom:2mm}.row{display:flex;justify-content:space-between;gap:3mm}.info-block{flex:1;font-size:8.5px;line-height:1.55}.lbl{font-weight:700;color:#334155;font-size:7.5px;text-transform:uppercase}.code-box{font-size:8px;padding:1.5mm 2mm;border-radius:2mm;margin-top:2mm;border-left:2.5px solid #22c55e;background:#f0fdf4;color:#166534}.qr-tech-area{text-align:center;min-width:28mm}.qr-tech-area img{width:28mm;height:28mm;display:block}.qr-tech-label{font-size:6.5px;color:#1e3a8a;font-weight:700;text-align:center;margin-top:1mm}.tech-footer{display:flex;justify-content:space-between;font-size:7.5px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:1.5mm;margin-top:2mm}.cut{width:90mm;text-align:center;font-size:8px;color:#9ca3af;letter-spacing:3px;padding:2mm 0;border-top:1px dashed #9ca3af;border-bottom:1px dashed #9ca3af;background:#f9fafb}.client-card{width:90mm;background:#fff;border-radius:0 0 4mm 4mm;padding:3mm 4mm;border:1px solid #bbf7d0;border-top:none}.client-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2mm}.client-header-title{font-size:10px;font-weight:900;color:#166534}.badge-client{background:#166534;color:#fff;font-size:8px;font-weight:700;padding:1mm 2.5mm;border-radius:2mm}.client-info-row{display:flex;justify-content:space-between;gap:3mm}.client-info-block{flex:1;font-size:8.5px;line-height:1.6}.client-code-big{font-size:15px;font-weight:900;color:#166534;letter-spacing:1px;margin:1mm 0}.qr-client-area{text-align:center;min-width:28mm}.qr-client-area img{width:28mm;height:28mm;display:block}.qr-client-label{font-size:6.5px;color:#166534;font-weight:700;text-align:center;margin-top:1mm}@media print{body{background:#fff;padding:0}.no-print{display:none!important}}.no-print{text-align:center;margin-top:6mm;display:flex;gap:3mm;justify-content:center}button{padding:3mm 6mm;background:#1e3a8a;color:#fff;border:none;border-radius:3mm;font-size:10px;cursor:pointer}button.close{background:#64748b}</style></head><body><div class="wrapper">
    <div class="tech-card"><div class="tech-header"><div class="tech-header-left"><h2>🔧 MBX Réparations</h2><p>Ticket technicien</p></div><span class="badge-tech">ATELIER</span></div><div class="ticket-id">MBX-${repair.id}</div>
    <div class="row"><div class="info-block"><div style="font-size:11px;font-weight:900;color:#1e293b">${escapeHtml(client.name)}</div><div style="font-size:10px;font-weight:800;color:#1e3a8a;margin-top:1.5mm">${escapeHtml(repair.device)}</div><div style="font-size:9.5px;font-weight:700;color:#374151;margin-top:1mm;margin-bottom:2mm">${escapeHtml(repair.issue)}</div><div style="font-size:8px;color:#64748b">${escapeHtml(client.phone || "")}</div>${codeValue ? `<div class="code-box">🔑 Code : ${escapeHtml(codeValue)}</div>` : ""}</div>
    <div class="qr-tech-area">${qrTechUrl ? `<img src="${qrTechUrl}"/>` : ""}<div class="qr-tech-label">📲 Scanner pour<br>ouvrir la fiche</div></div></div>
    <div class="tech-footer"><span>⏱ ${dateStr} ${timeStr}</span><span>MBX Réparations</span></div></div>
    <div class="cut">✂ &nbsp; À remettre au client &nbsp; ✂</div>
    <div class="client-card"><div class="client-header"><div class="client-header-title">🎫 MBX-${repair.id}<span style="font-size:8px;font-weight:normal;color:#64748b;display:block">${escapeHtml(repair.device)} · ${dateStr}</span></div><span class="badge-client">CLIENT</span></div>
    <div class="client-info-row"><div class="client-info-block"><div><span class="lbl">Client</span><br>${escapeHtml(client.name)}</div><div style="margin-top:2mm"><span class="lbl">Panne déclarée</span><br>${escapeHtml(repair.issue)}</div>${repair.estimated_price ? `<div style="margin-top:2mm"><span class="lbl">Prix estimé</span><br><span style="font-size:12px;font-weight:900;color:#166534">${Number(repair.estimated_price).toFixed(2)} €</span></div>` : ""}${!codeValue ? `<div style="font-size:7.5px;background:#fef2f2;border-left:2px solid #ef4444;color:#991b1b;font-weight:700;padding:1.5mm 2mm;border-radius:2mm;margin-top:2mm">⚠️ Appareil non testé — pas pris en garantie</div>` : ""}<div style="margin-top:2mm"><span class="lbl">Code de suivi</span><div class="client-code-big">${client.client_code || "—"}</div><span style="font-size:7px;color:#64748b">→ technophone.vercel.app/suivi-client</span></div></div>
    <div class="qr-client-area">${qrClientUrl ? `<img src="${qrClientUrl}"/>` : ""}<div class="qr-client-label">🔍 Suivre votre<br>réparation</div></div></div></div>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimer</button><button class="close" onclick="window.close()">✕ Fermer</button></div>
    </div></body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow!.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
    }, 500);
  };

  const addPart = async () => {
    if (!currentPart.name) return;
    const newPart = { ...currentPart, id: Date.now() };
    const newParts = [...parts, newPart];
    setParts(newParts);
    setCurrentPart({ name: "", quantity: 1, price: 0 });
    setShowPartModal(false);
    await ajouterHistorique(
      "modification",
      `🔩 Pièce ajoutée : ${currentPart.name} x${currentPart.quantity} (${currentPart.price * currentPart.quantity}€)`
    );
    showMessage(`Pièce ajoutée`, "success");
  };

  const removePart = async (partId) => {
    const removedPart = parts.find((p) => p.id === partId);
    setParts(parts.filter((p) => p.id !== partId));
    if (removedPart) {
      await ajouterHistorique("modification", `🔩 Pièce retirée : "${removedPart.name}"`);
    }
  };

  const sendEmailReceipt = async () => {
    if (!emailTo || !emailTo.trim()) {
      showMessage("Aucun email client", "error");
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch("/api/send-ticket-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: String(repair.id),
          email: emailTo,
          atelierName: companyInfo.name || "MBX Réparations",
          atelierPhone: companyInfo.phone || "",
          atelierAddress: companyInfo.address || "",
          atelierEmail: companyInfo.email || "",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur envoi");
      }
      await ajouterHistorique("commentaire", `✉️ Email envoyé à ${emailTo}`);
      showMessage(`✅ Email envoyé`, "success");
      setShowEmailModal(false);
    } catch (err) {
      showMessage(`❌ Échec envoi: ${err.message}`, "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const steps = [
    { status: "📥 Réceptionné", label: "Reçu", icon: "📥", color: "amber", step: 1 },
    { status: "🔬 Diagnostic", label: "Diag", icon: "🔬", color: "blue", step: 2 },
    { status: "🔧 En réparation", label: "Réparation", icon: "🔧", color: "orange", step: 3 },
    { status: "✅ Terminé", label: "Terminé", icon: "✅", color: "purple", step: 4 },
  ];

  const getCurrentStep = () => {
    const step = steps.find((s) => s.status === repair?.status);
    return step ? step.step : 1;
  };
  const currentStep = getCurrentStep();

  const PatternSmall = ({ pattern }) => {
    if (!pattern) return null;
    const pointsIds = pattern.split("-").map(Number);
    const points = [
      { id: 1, x: 10, y: 10 },
      { id: 2, x: 50, y: 10 },
      { id: 3, x: 90, y: 10 },
      { id: 4, x: 10, y: 50 },
      { id: 5, x: 50, y: 50 },
      { id: 6, x: 90, y: 50 },
      { id: 7, x: 10, y: 90 },
      { id: 8, x: 50, y: 90 },
      { id: 9, x: 90, y: 90 },
    ];
    const getLines = () => {
      const lines = [];
      for (let i = 0; i < pointsIds.length - 1; i++) {
        const from = points.find((p) => p.id === pointsIds[i]);
        const to = points.find((p) => p.id === pointsIds[i + 1]);
        if (from && to) lines.push({ from, to });
      }
      return lines;
    };
    return (
      <div className="w-14 h-14 relative">
        {pointsIds.length > 0 && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></div>
        )}
        <div className="w-full h-full relative bg-gray-800 rounded-lg border border-gray-700 shadow-sm">
          <svg className="absolute inset-0 w-full h-full">
            {getLines().map((line, idx) => (
              <line
                key={idx}
                x1={`${line.from.x}%`}
                y1={`${line.from.y}%`}
                x2={`${line.to.x}%`}
                y2={`${line.to.y}%`}
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}
          </svg>
          {points.map((point) => {
            const isSelected = pointsIds.includes(point.id);
            const isStart = point.id === pointsIds[0];
            const isEnd = point.id === pointsIds[pointsIds.length - 1];
            return (
              <div
                key={point.id}
                className={`absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full transition-all duration-200 ${
                  isSelected
                    ? isStart
                      ? "bg-green-500 ring-2 ring-green-300 shadow-[0_0_10px_rgba(34,197,94,0.6)]"
                      : isEnd
                        ? "bg-red-500 ring-2 ring-red-300 shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                        : "bg-orange-500 ring-2 ring-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                    : "bg-gray-600 border-2 border-gray-500"
                }`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {message.text && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg text-white shadow-lg z-50 text-sm ${message.type === "error" ? "bg-red-500" : "bg-green-500"}`}
        >
          {message.text}
        </div>
      )}

      {showPhotoModal && selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto}
              alt="Photo"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5">
            <h2 className="text-lg font-bold mb-3">✉️ Envoi par email</h2>
            <input
              type="email"
              className="w-full border rounded-lg p-2 mb-3"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="Email du client"
            />
            <div className="flex gap-2">
              <button
                onClick={sendEmailReceipt}
                disabled={sendingEmail}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg"
              >
                {sendingEmail ? "Envoi..." : "Envoyer"}
              </button>
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 bg-gray-200 py-2 rounded-lg"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuickActions && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5">
            <h2 className="text-lg font-bold mb-3">⚡ Actions rapides</h2>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    updateStatus(action.status);
                    setShowQuickActions(false);
                  }}
                  className={`${action.color} ${action.textColor} py-2 rounded-lg text-sm font-semibold`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPartModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5">
            <h2 className="text-lg font-bold mb-3">🔧 Ajouter une pièce</h2>
            <input
              type="text"
              placeholder="Nom"
              className="w-full border rounded-lg p-2 mb-2"
              value={currentPart.name}
              onChange={(e) => setCurrentPart({ ...currentPart, name: e.target.value })}
            />
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                placeholder="Qté"
                className="flex-1 border rounded-lg p-2"
                value={currentPart.quantity}
                onChange={(e) =>
                  setCurrentPart({ ...currentPart, quantity: parseInt(e.target.value) || 1 })
                }
              />
              <input
                type="number"
                placeholder="Prix"
                className="flex-1 border rounded-lg p-2"
                value={currentPart.price}
                onChange={(e) =>
                  setCurrentPart({ ...currentPart, price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex gap-2">
              <button onClick={addPart} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                Ajouter
              </button>
              <button
                onClick={() => setShowPartModal(false)}
                className="flex-1 bg-gray-200 py-2 rounded-lg"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full mx-auto px-0 py-4">
        {/* BARRE DE RECHERCHE */}
        <div className="mb-5 relative">
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="🔍 Rechercher par nom client ou numéro de ticket..."
                  className="w-full p-2 pl-8 border rounded-lg text-sm"
                />
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  🔍
                </div>
              </div>
              <button
                onClick={() => setShowSearchResults(false)}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => goToRepair(result.id)}
                    className="p-2 hover:bg-gray-50 cursor-pointer border-b flex justify-between items-center text-sm"
                  >
                    <div>
                      <span className="font-bold text-blue-600 text-base">🎫 MBX-{result.id}</span>
                      <span className="ml-2 text-gray-700">- {result.clientName}</span>
                      <br />
                      <span className="text-xs text-gray-500">{result.device}</span>
                    </div>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs">
                      Voir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* HEADER CARD AVEC INFOS IMPORTANTES EN EVIDENCE */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="p-6">
            {/* Ligne 1 : Ticket et statut */}
            <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-white text-blue-700 font-bold text-2xl px-4 py-2 rounded-xl shadow-lg">
                  🎫 MBX-{id}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    repair?.status === "✅ Terminé"
                      ? "bg-green-500 text-white"
                      : repair?.status === "📦 Rendu"
                        ? "bg-gray-600 text-white"
                        : repair?.status === "🔧 En réparation"
                          ? "bg-orange-500 text-white"
                          : repair?.status === "🔬 Diagnostic"
                            ? "bg-blue-500 text-white"
                            : repair?.status === "📥 Réceptionné"
                              ? "bg-amber-500 text-white"
                              : repair?.status === "❌ KO"
                                ? "bg-red-600 text-white"
                                : repair?.status === "🚫 Refus client"
                                  ? "bg-pink-600 text-white"
                                  : "bg-gray-500 text-white"
                  }`}
                >
                  {repair?.status || "📥 Réceptionné"}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={printRepairTicket}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                >
                  🖨️ Ticket
                </button>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                >
                  ✉️ Email
                </button>
                {repair?.status === "✅ Terminé" && (
                  <button
                    onClick={() => updateStatus("📦 Rendu")}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-bold transition"
                  >
                    📦 Rendu
                  </button>
                )}
                <button
                  onClick={() => setShowQuickActions(true)}
                  className="bg-white/20 hover:bg-white/30 text-white w-10 h-10 rounded-lg text-xl font-bold transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Ligne 2 : Nom client + Téléphone + Code + IMEI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-blue-200 text-xs mb-1">👤 CLIENT</p>
                <p className="text-white font-bold text-xl">{client?.name || "Client inconnu"}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-blue-200 text-xs mb-1">📞 TÉLÉPHONE</p>
                <p className="text-white font-bold text-xl">
                  {client?.phone !== "NC" ? client?.phone : "Non renseigné"}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-blue-200 text-xs mb-1">🔑 CODE DÉVERROUILLAGE</p>
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-xl">
                    {repair?.unlock_code !== "NC" ? repair?.unlock_code : "Non fourni"}
                  </p>
                  {repair?.unlock_pattern && repair.unlock_pattern !== "" && (
                    <PatternSmall pattern={repair.unlock_pattern} />
                  )}
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-blue-200 text-xs mb-1">🔢 IMEI</p>
                <p className="text-white font-mono text-lg">
                  {repair?.imei !== "NC" ? repair?.imei : "Non renseigné"}
                </p>
              </div>
            </div>

            {/* Ligne 3 : Appareil + Panne + Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-blue-200 text-xs mb-1">📱 APPAREIL</p>
                <p className="text-white font-bold text-lg">{repair?.device || "-"}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-blue-200 text-xs mb-1">🔧 PANNE</p>
                <p className="text-white font-bold text-lg">{repair?.issue || "-"}</p>
              </div>
            </div>

            {/* Description si présente */}
            {repair?.description && repair.description !== "NC" && repair.description !== "" && (
              <div className="mt-4 bg-white/10 rounded-lg p-3">
                <p className="text-blue-200 text-xs mb-1">📝 DESCRIPTION</p>
                <p className="text-white">{repair.description}</p>
              </div>
            )}

            {/* Suivi des statuts avec progression */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 -translate-y-1/2 rounded-full"></div>
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-blue-300 to-blue-400 -translate-y-1/2 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>
                <div className="relative flex justify-between">
                  {steps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => updateStatus(step.status)}
                      className="flex flex-col items-center group flex-1"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-all duration-300 ${
                          currentStep >= step.step
                            ? `${
                                step.status === "✅ Terminé"
                                  ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]"
                                  : step.status === "🔧 En réparation"
                                    ? "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                                    : "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                              } text-white`
                            : "bg-white/20 text-white/50"
                        }`}
                      >
                        {step.icon}
                      </div>
                      <span
                        className={`text-xs mt-2 font-medium ${currentStep >= step.step ? "text-white" : "text-white/50"}`}
                      >
                        {step.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RÉPONSE CLIENT */}
        {repair?.client_response && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-600 font-semibold text-sm">📝 Réponse client</span>
              {repair.client_response_type === "accepte" && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Accepté
                </span>
              )}
              {repair.client_response_type === "refuse" && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Refusé</span>
              )}
            </div>
            <p className="text-gray-700 text-sm italic">"{repair.client_response}"</p>
            <p className="text-xs text-gray-400 mt-1">
              Le {new Date(repair.updated_at).toLocaleString("fr-FR")}
            </p>
          </div>
        )}

        {/* BOUTON HISTORIQUE */}
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => setShowHistorique(!showHistorique)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
          >
            <span className="text-lg">📜</span>
            <span>{showHistorique ? "Masquer" : "Afficher"} l'historique</span>
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">
              {historique.length}
            </span>
          </button>
        </div>

        {/* HISTORIQUE - AFFICHAGE CORRIGÉ AVEC LE NOM DU TECHNICIEN */}
        {showHistorique && (
          <div className="mb-6 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span>📜</span> Historique complet
              </h3>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {historique.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-2xl mb-2">📭</p>
                  <p>Aucun historique enregistré pour cet appareil</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historique.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-lg p-3 border-l-4 ${
                        entry.action === "changement_statut"
                          ? "border-purple-500 bg-purple-50"
                          : entry.action === "changement_technicien"
                            ? "border-orange-500 bg-orange-50"
                            : entry.action === "modification"
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-400 bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <p className="text-sm text-gray-700 flex-1">{entry.description}</p>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          ⏱️ {new Date(entry.created_at).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">
                          👤 {entry.user_name || "Inconnu"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${entry.user_type === "client" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                        >
                          {entry.user_type === "client"
                            ? "👤 Client"
                            : `🔧 ${entry.user_name || "Technicien"}`}
                        </span>
                      </div>
                      {entry.old_value && entry.new_value && (
                        <div className="mt-2 text-xs text-gray-500 bg-white/50 rounded p-1">
                          🔄 {entry.old_value} → {entry.new_value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-500">
              📊 Total: {historique.length} action(s)
            </div>
          </div>
        )}

        {/* GRILLE 2 COLONNES */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* COLONNE GAUCHE */}
          <div className="space-y-5">
            {/* DIAGNOSTIC TECHNICIEN */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h2 className="font-semibold text-gray-700 text-sm">🔍 Diagnostic technicien</h2>
              </div>
              <div className="p-3">
                <SmartTextarea
                  value={diagnosticTechnicien}
                  onChange={(e) => setDiagnosticTechnicien(e.target.value)}
                  placeholder="=== DIAGNOSTIC TECHNIQUE ===
🔍 Tests effectués:
🔧 Actions à prévoir:
💰 Devis estimé:"
                  className="w-full border-0 focus:ring-0 text-gray-700 resize-none text-sm font-mono"
                  rows={6}
                  type="diagnostic"
                  repairData={{ device: repair?.device, issue: repair?.issue }}
                />
                <p className="text-xs text-gray-400 mt-1">🔒 Ce texte est INTERNE</p>
              </div>
            </div>

            {/* TRAVAUX EFFECTUÉS */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                <h2 className="font-semibold text-gray-700 text-sm">🔧 Travaux effectués</h2>
                <button
                  onClick={() => setShowPartModal(true)}
                  className="text-blue-600 text-xs hover:text-blue-700 flex items-center gap-1"
                >
                  <span className="text-lg">+</span> Pièce
                </button>
              </div>
              <div className="p-3">
                <SmartTextarea
                  value={repairDescription}
                  onChange={(e) => setRepairDescription(e.target.value)}
                  placeholder="✅ Détail des travaux effectués..."
                  className="w-full border-0 focus:ring-0 text-gray-700 resize-none text-sm"
                  rows={5}
                  type="work"
                />
                {parts.length > 0 && (
                  <div className="mt-3 bg-gray-50 rounded p-2">
                    <h3 className="text-xs font-semibold text-gray-600 mb-1">
                      🔩 Pièces utilisées
                    </h3>
                    {parts.map((part) => (
                      <div key={part.id} className="flex justify-between text-xs py-1">
                        <span>
                          {part.name} x{part.quantity}
                        </span>
                        <span className="font-medium">{part.price * part.quantity}€</span>
                        <button
                          onClick={() => removePart(part.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RISQUES */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h2 className="font-semibold text-gray-700 text-sm">⚠️ Risques & Préconisations</h2>
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    "⚠️ Risque qu'il ne se rallume plus",
                    "⚠️ Données non garanties",
                    "⚠️ Écran peut se détériorer davantage",
                    "⚠️ Batterie peut gonfler",
                    "⚠️ Micro/haut-parleur peut rester défaillant",
                    "⚠️ Prise en charge non couverte par la garantie",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setRisks((prev) => prev ? prev + "\n" + chip : chip)}
                      className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-1 rounded-full hover:bg-orange-100 transition"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={risks}
                  onChange={(e) => setRisks(e.target.value)}
                  className="w-full border-0 focus:ring-0 text-gray-700 resize-none text-sm"
                  placeholder="Risques potentiels..."
                />
              </div>
            </div>

            {/* TESTS */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h2 className="font-semibold text-gray-700 text-sm">
                  ✅ Tests & contrôles qualité
                </h2>
              </div>
              <div className="p-3">
                <textarea
                  rows={3}
                  value={testsPassed}
                  onChange={(e) => setTestsPassed(e.target.value)}
                  className="w-full border-0 focus:ring-0 text-gray-700 resize-none text-sm"
                  placeholder="Tests effectués..."
                />
              </div>
            </div>
          </div>

          {/* COLONNE DROITE */}
          <div className="space-y-5">
            {/* PRIX */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h2 className="font-semibold text-gray-700 text-sm">💰 À payer</h2>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Montant réparation :</span>
                  <input
                    type="number"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    className="w-36 text-right text-lg font-bold border rounded-lg p-2 text-center"
                    step="1"
                  />
                </div>
                {repair?.estimated_price && repair?.estimated_price > 0 && !repair?.final_price && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Prix estimé: {repair.estimated_price}€
                  </p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div>
                    <span className="text-sm text-gray-600">Forfait diagnostic :</span>
                    <p className="text-xs text-gray-400">Facturé si client refuse la réparation</p>
                  </div>
                  <input
                    type="number"
                    value={diagnosticPrice}
                    onChange={(e) => setDiagnosticPrice(e.target.value)}
                    className="w-28 text-right text-base font-semibold border rounded-lg p-2 text-center"
                    step="1"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* STATUT ACTUEL */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h2 className="font-semibold text-gray-700 text-sm">📊 Statut actuel</h2>
              </div>
              <div className="p-3">
                <div
                  className={`px-4 py-3 rounded-lg text-white font-semibold text-center shadow-md ${
                    repair?.status === "✅ Terminé"
                      ? "bg-green-500"
                      : repair?.status === "🔧 En réparation"
                        ? "bg-orange-500"
                        : repair?.status === "🔬 Diagnostic"
                          ? "bg-blue-500"
                          : repair?.status === "📦 Rendu"
                            ? "bg-gray-600"
                            : repair?.status === "📥 Réceptionné"
                              ? "bg-amber-500"
                              : repair?.status === "🚫 Refus client"
                                ? "bg-pink-500"
                                : repair?.status === "❌ KO"
                                  ? "bg-red-600"
                                  : "bg-gray-500"
                  }`}
                >
                  {repair?.status || "📥 Réceptionné"}
                </div>
              </div>
            </div>

            {/* PHOTOS */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                <h2 className="font-semibold text-gray-700 text-sm">📸 Photos</h2>
                <label className="cursor-pointer text-blue-600 text-xs hover:text-blue-700 flex items-center gap-1">
                  <span className="text-lg">+</span> Ajouter
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadPhoto}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="p-3">
                {photos.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 border-2 border-dashed rounded-lg text-sm">
                    📭 Aucune photo
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
                      >
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => {
                            setSelectedPhoto(photo);
                            setShowPhotoModal(true);
                          }}
                        />
                        <button
                          onClick={() => deletePhoto(photo)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
