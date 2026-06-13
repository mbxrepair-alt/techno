/* -------------------------------------------------------------
   app/factures/page.jsx
   ------------------------------------------------------------- */

"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { getCurrentTechnician } from "../../lib/historique";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";

/* -------------------------------------------------------------
   Constantes générales
   ------------------------------------------------------------- */
const TVA_RATES = [0, 20];

export default function FacturesPage() {
  const router = useRouter();

  /* ----------------------- State ----------------------- */
  const [repairs, setRepairs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Espèces");
  const [isSending, setIsSending] = useState(false);
  const [clientTvaRates, setClientTvaRates] = useState({});
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [selectedGroupForEmail, setSelectedGroupForEmail] = useState(null);
  const [selectedRepairIds, setSelectedRepairIds] = useState<Set<number>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [companyProfile, setCompanyProfile] = useState<{ name: string; address: string; phone: string; email: string; siret: string; logo_url: string }>({ name: "MBX", address: "", phone: "", email: "", siret: "", logo_url: "" });
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [isGerant, setIsGerant] = useState(false);
  // Édition de facture (gérant)
  const [showEditModal, setShowEditModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editGroup, setEditGroup] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editRows, setEditRows] = useState<any[]>([]);
  const [editTva, setEditTva] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const t = getCurrentTechnician();
    setIsGerant(t?.is_gerant === true);
  }, []);

  /* -------------------------------------------------------------
     1️⃣ Chargement du taux de TVA par client
     ------------------------------------------------------------- */
  /* -------------------------------------------------------------
     2️⃣ Chargement des réparations terminées
     ------------------------------------------------------------- */
  const loadData = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Charger le profil entreprise + TVA + réparations en parallèle
      const [profileResult, tvaResult, repairsResult, clientsResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("clients").select("id, default_tva_rate").eq("user_id", user.id),
        supabase.from("repairs").select("*, clients(*)").eq("user_id", user.id).in("status", ["✅ Terminé", "📦 Rendu", "🚫 Refus client"]).order("created_at", { ascending: false }),
        supabase.from("clients").select("*").eq("user_id", user.id),
      ]);
      if (profileResult.error) console.error("Profil erreur:", profileResult.error);
      if (profileResult.data) {
        const p = profileResult.data;
        console.log("Profil chargé:", p);
        const profile = { name: (p.company_name || "MBX").replace(/\s*réparations?\s*/i, "").trim() || "MBX", address: p.contact_address || p.address || "", phone: p.contact_phone || p.phone || "", email: p.email || "", siret: p.siret || "", logo_url: p.logo_url || "" };
        setCompanyProfile(profile);
        // Convertir logo en base64 via canvas pour éviter CORS dans la popup d'impression
        if (p.logo_url) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d")!.drawImage(img, 0, 0);
            try { setLogoBase64(canvas.toDataURL("image/png")); } catch (_) { setLogoBase64(""); }
          };
          img.onerror = () => setLogoBase64("");
          img.src = p.logo_url;
        }
      }

      // Construire le map TVA directement (pas via state = pas de stale closure)
      const rates: Record<string, number> = {};
      tvaResult.data?.forEach((c) => (rates[c.id] = c.default_tva_rate ?? 0));
      setClientTvaRates(rates);

      if (clientsResult.data) setClients(clientsResult.data);
      if (repairsResult.error) throw repairsResult.error;

      const repairsWithDetails = (repairsResult.data || []).map((r) => {
        const priceHt = r.final_price ?? r.estimated_price ?? 0;
        // Priorité : TVA par défaut du client (= celle affichée/éditée), sinon
        // tva_rate de la réparation. Évite le désync TTC affiché ≠ TVA affichée.
        const tvaRate = rates[r.client_id] ?? r.tva_rate ?? 0;
        const totalTtc = tvaRate === 0 ? priceHt : priceHt * (1 + tvaRate / 100);
        const paid = r.paid_amount ?? 0;
        const remaining = Math.max(0, totalTtc - paid);

        return {
          ...r,
          client: r.clients,
          priceHt,
          tvaRate,
          totalTtc,
          paidTtc: paid,
          remainingTtc: remaining,
          isFullyPaid: remaining <= 0,
          payment_date: r.payment_date,
          payment_method: r.payment_method || "",
        };
      });

      setRepairs(repairsWithDetails);

      // Ouvrir automatiquement les groupes clients en attente
      const clientIds = new Set<string>();
      (repairsResult.data || []).forEach((r) => {
        if (!r.paid_amount || r.paid_amount < (r.final_price ?? r.estimated_price ?? 0)) {
          clientIds.add(String(r.client_id));
        }
      });
      setExpandedClients(clientIds);
    } catch (e) {
      console.error("Erreur chargement factures:", e);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------
     3️⃣ Mise à jour de la TVA d'un client
     ------------------------------------------------------------- */
  const updateClientTva = async (clientId, newTvaRate) => {
    setIsSending(true);
    try {
      // Mise à jour client + toutes ses réparations terminées
      await supabase.from("clients").update({ default_tva_rate: newTvaRate }).eq("id", clientId);
      const clientRepairIds = repairs.filter((r) => r.client_id === clientId).map((r) => r.id);
      if (clientRepairIds.length > 0) {
        await supabase.from("repairs").update({ tva_rate: newTvaRate }).in("id", clientRepairIds);
      }
      // Recharger depuis la DB — garantit un état cohérent, sans stale closure
      await loadData();
    } catch (e) {
      console.error("updateClientTva error:", e);
    } finally {
      setIsSending(false);
    }
  };

  /* -------------------------------------------------------------
     4️⃣ Regroupement par client
     ------------------------------------------------------------- */
  const groupByClient = (onlyPaid = false) => {
    const groups = new Map();
    let filtered = repairs;

    if (onlyPaid) {
      filtered = filtered.filter((r) => r.isFullyPaid);
    } else {
      filtered = filtered.filter((r) => !r.isFullyPaid && r.remainingTtc > 0);
    }

    filtered.forEach((r) => {
      const cid = r.client_id;
      // Soldées : une facture PAR PAIEMENT (client + date de paiement) →
      // les réparations payées ensemble se retrouvent sur la même facture.
      // À régler : une facture par client.
      const key = onlyPaid ? `${cid}__${r.payment_date || `solo-${r.id}`}` : cid;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          client: r.client,
          repairs: [],
          totalTtc: 0,
          totalPaid: 0,
          totalRemaining: 0,
          tvaRate: clientTvaRates[cid] ?? r.tvaRate ?? 0,
          payment_date: r.payment_date || null,
          payment_method: r.payment_method || "",
        });
      }
      const g = groups.get(key);
      g.repairs.push(r);
      g.totalTtc += r.totalTtc;
      g.totalPaid += r.paidTtc;
      g.totalRemaining += r.remainingTtc;
    });

    const result = Array.from(groups.values());
    if (onlyPaid) {
      // Plus récents en premier
      return result.sort(
        (a, b) => new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime()
      );
    }
    return result.sort((a, b) => b.totalRemaining - a.totalRemaining);
  };

  /* -------------------------------------------------------------
     5️⃣ Enregistrement d'un paiement
     ------------------------------------------------------------- */
  const registerPayment = async () => {
    if (!selectedGroup) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedGroup.totalRemaining) {
      alert(`Montant invalide. Max: ${selectedGroup.totalRemaining.toFixed(2)}€`);
      return;
    }

    setIsSending(true);
    try {
      let remaining = amount;
      const toPay = [...selectedGroup.repairs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      for (const rep of toPay) {
        if (remaining <= 0) break;
        if (rep.remainingTtc <= 0) continue;

        const apply = Math.min(remaining, rep.remainingTtc);
        const newPaid = rep.paidTtc + apply;

        await supabase
          .from("repairs")
          .update({
            paid_amount: newPaid,
            payment_status: newPaid >= rep.totalTtc ? "payé" : "partiel",
            payment_method: paymentMethod,
            payment_date: new Date().toISOString(),
          })
          .eq("id", rep.id);

        remaining -= apply;
      }

      await loadData();
      setShowPaymentModal(false);
      setPaymentAmount("");
      setSelectedGroup(null);
    } catch (e) {
      console.error("registerPayment error:", e);
    } finally {
      setIsSending(false);
    }
  };

  /* -------------------------------------------------------------
     6️⃣ Impression PDF
     ------------------------------------------------------------- */
  const printInvoice = (group) => {
    const win = window.open("", "_blank", "height=900,width=1000");
    if (!win) { alert("Autorisez les pop-ups pour imprimer."); return; }

    const cp = companyProfile;
    const shortName = cp.name || "MBX";
    const invoiceRef = `FACT-${String(group.client?.id || "").padStart(4, "0")}-${Date.now().toString().slice(-5)}`;
    const totalHt = group.repairs.reduce((s, r) => s + r.priceHt, 0);
    const totalTva = group.totalTtc - totalHt;
    const date = new Date().toLocaleDateString("fr-FR");
    const isSolde = group.totalRemaining <= 0;
    // Mode de paiement : on prend celui de la 1re réparation payée du groupe
    const payMethod = group.repairs.find((r) => r.payment_method)?.payment_method || "";
    const payMethodLabel: Record<string, string> = { "Espèces": "💵 Espèces", "Carte Bancaire": "💳 Carte Bancaire", "Virement": "🏦 Virement", "Chèque": "📄 Chèque" };
    const payMethodDisplay = payMethodLabel[payMethod] || payMethod;

    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" style="height:48px;max-width:160px;object-fit:contain;display:block" alt="logo"/>`
      : `<span style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#0f172a">${shortName}</span>`;

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Facture ${invoiceRef}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',system-ui,Arial,sans-serif;background:#f1f5f9;color:#0f172a;padding:32px 20px;min-height:100vh}
      .page{max-width:800px;margin:auto;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,.10)}

      /* ── BARRE ACCENT ── */
      .accent-bar{height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)}

      /* ── HEADER ── */
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding:32px 40px 24px}
      .header-logo{display:flex;flex-direction:column;gap:8px}
      .header-contact{font-size:11.5px;color:#64748b;line-height:1.8;margin-top:10px}
      .header-right{text-align:right}
      .header-facture-label{font-size:36px;font-weight:800;color:#e2e8f0;letter-spacing:-1px;line-height:1;margin-bottom:6px}
      .header-ref{font-size:13px;font-weight:600;color:#6366f1;font-family:monospace;letter-spacing:.5px}
      .header-date{font-size:11.5px;color:#94a3b8;margin-top:4px}
      .status-pill{display:inline-flex;align-items:center;gap:5px;margin-top:10px;padding:5px 14px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.4px}
      .pill-due{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
      .pill-paid{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}

      /* ── SEPARATOR ── */
      .sep{height:1px;background:#e2e8f0;margin:0 40px}

      /* ── PARTIES ── */
      .parties{display:grid;grid-template-columns:1fr 1fr;padding:24px 40px;gap:0;border-bottom:1px solid #f1f5f9}
      .party{padding-right:32px}
      .party+.party{padding-right:0;padding-left:32px;border-left:1px solid #f1f5f9}
      .party-tag{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px}
      .party-name{font-size:17px;font-weight:800;color:#0f172a;margin-bottom:6px;line-height:1.2}
      .party-info{font-size:12px;color:#64748b;line-height:1.9}

      /* ── TABLE ── */
      .table-wrap{padding:0 40px;margin-bottom:0}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      thead tr{border-bottom:2px solid #0f172a}
      th{padding:0 12px 10px;text-align:left;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8}
      th.r{text-align:right}
      tbody tr{border-bottom:1px solid #f1f5f9}
      tbody tr:last-child{border-bottom:none}
      td{padding:14px 12px;font-size:13px;color:#334155;vertical-align:middle}
      td.r{text-align:right;font-variant-numeric:tabular-nums}
      .ref-chip{font-family:monospace;font-size:11px;font-weight:700;color:#6366f1;background:#eef2ff;padding:3px 8px;border-radius:4px}
      .dev{font-weight:600;color:#0f172a;margin-bottom:2px}
      .iss{font-size:11.5px;color:#94a3b8}
      .amount{font-weight:600;color:#0f172a}

      /* ── TOTAUX ── */
      .bottom-wrap{display:flex;justify-content:flex-end;padding:24px 40px 32px;border-top:1px solid #f1f5f9}
      .totals{width:280px}
      .t-row{display:flex;justify-content:space-between;font-size:12.5px;color:#64748b;padding:5px 0;border-bottom:1px solid #f8fafc}
      .t-row:last-child{border-bottom:none}
      .t-row.ht{color:#94a3b8}
      .t-row.tva-row{color:#94a3b8}
      .t-row.ttc{border-top:2px solid #0f172a;margin-top:6px;padding-top:12px;font-size:18px;font-weight:800;color:#0f172a}
      .t-row.paid{color:#16a34a;font-weight:600}
      .t-row.due{font-size:15px;font-weight:800;padding-top:10px;border-top:1px dashed ${isSolde ? "#bbf7d0" : "#fecaca"};color:${isSolde ? "#16a34a" : "#dc2626"}}
      .t-row.method{font-size:11px;color:#94a3b8;padding-top:8px}
      .t-row.method span:last-child{font-weight:600;color:#475569}

      /* ── FOOTER ── */
      .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 40px;display:flex;justify-content:space-between;align-items:center}
      .footer-txt{font-size:10.5px;color:#94a3b8}
      .footer-ref{font-family:monospace;font-size:10px;background:#0f172a;color:#94a3b8;padding:3px 10px;border-radius:4px}

      @media print{
        body{background:#fff;padding:0}
        .page{box-shadow:none}
        .no-print{display:none!important}
      }
      .print-btn{display:flex;align-items:center;justify-content:center;gap:8px;margin:28px auto 0;padding:12px 40px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:.2px;width:fit-content}
    </style></head><body>
    <div class="page">

      <div class="accent-bar"></div>

      <!-- HEADER -->
      <div class="header">
        <div class="header-logo">
          ${logoHtml}
          <div class="header-contact">
            ${cp.address ? `${cp.address}<br>` : ""}
            ${cp.phone ? `${cp.phone}` : ""}${cp.email ? `${cp.phone ? " &nbsp;·&nbsp; " : ""}${cp.email}` : ""}
            ${cp.siret ? `<br>SIRET ${cp.siret}` : ""}
          </div>
        </div>
        <div class="header-right">
          <div class="header-facture-label">FACTURE</div>
          <div class="header-ref">${invoiceRef}</div>
          <div class="header-date">Émise le ${date}</div>
          <div><span class="status-pill ${isSolde ? "pill-paid" : "pill-due"}">${isSolde ? "✓ Soldée" : "⚠ À régler"}</span></div>
        </div>
      </div>

      <div class="sep"></div>

      <!-- PARTIES -->
      <div class="parties">
        <div class="party">
          <div class="party-tag">Prestataire</div>
          <div class="party-name">${shortName}</div>
          <div class="party-info">
            ${cp.address ? `${cp.address}<br>` : ""}
            ${cp.phone ? `${cp.phone}<br>` : ""}
            ${cp.email ? `${cp.email}` : ""}
          </div>
        </div>
        <div class="party">
          <div class="party-tag">Facturé à</div>
          <div class="party-name">${group.client?.name || "—"}</div>
          <div class="party-info">
            ${group.client?.phone && group.client.phone !== "NC" ? `${group.client.phone}<br>` : ""}
            ${group.client?.email && group.client.email !== "NC" ? `${group.client.email}<br>` : ""}
            ${group.client?.client_code ? `Réf. ${group.client.client_code}` : ""}
          </div>
        </div>
      </div>

      <!-- TABLE -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:90px">Réf.</th>
              <th>Prestation</th>
              <th class="r" style="width:85px">HT</th>
              <th class="r" style="width:60px">TVA</th>
              <th class="r" style="width:95px">TTC</th>
            </tr>
          </thead>
          <tbody>
            ${group.repairs.map((r) => `
              <tr>
                <td><span class="ref-chip">MBX-${r.id}</span></td>
                <td><div class="dev">${r.device}</div><div class="iss">${r.issue}</div></td>
                <td class="r">${r.priceHt.toFixed(2)} €</td>
                <td class="r">${r.tvaRate > 0 ? r.tvaRate + "%" : `<span style="color:#cbd5e1">—</span>`}</td>
                <td class="r amount">${r.totalTtc.toFixed(2)} €</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <!-- TOTAUX -->
      <div class="bottom-wrap">
        <div class="totals">
          <div class="t-row ht"><span>Sous-total HT</span><span>${totalHt.toFixed(2)} €</span></div>
          ${totalTva > 0.01
            ? `<div class="t-row tva-row"><span>TVA</span><span>${totalTva.toFixed(2)} €</span></div>`
            : `<div class="t-row tva-row"><span>TVA</span><span style="color:#cbd5e1">—</span></div>`}
          <div class="t-row ttc"><span>Total TTC</span><span>${group.totalTtc.toFixed(2)} €</span></div>
          ${group.totalPaid > 0 ? `<div class="t-row paid"><span>Déjà réglé</span><span>− ${group.totalPaid.toFixed(2)} €</span></div>` : ""}
          <div class="t-row due"><span>${isSolde ? "✓ Soldée" : "Reste à payer"}</span><span>${group.totalRemaining.toFixed(2)} €</span></div>
          ${isSolde && payMethodDisplay ? `<div class="t-row method"><span>Règlement</span><span>${payMethodDisplay}</span></div>` : ""}
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <span class="footer-txt">Conditions de paiement : à réception de facture</span>
        <span class="footer-ref">${invoiceRef} · ${date}</span>
      </div>

    </div>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / PDF</button>
    </body></html>`);
    win.document.close();
  };

  /* -------------------------------------------------------------
     7️⃣ Envoi email (via API route nodemailer — pas EmailJS)
     ------------------------------------------------------------- */
  const sendEmailInvoice = async () => {
    if (!selectedGroupForEmail) return;
    const recipient = emailTo || selectedGroupForEmail.client?.email;
    if (!recipient) { alert("Email manquant"); return; }

    setIsSending(true);
    try {
      const totalHt = selectedGroupForEmail.repairs.reduce((s, r) => s + r.priceHt, 0);
      const totalTva = selectedGroupForEmail.totalTtc - totalHt;
      const invoiceRef = `FACT-${String(selectedGroupForEmail.client?.id || "").padStart(4, "0")}-${Date.now().toString().slice(-5)}`;

      // Sauvegarder l'email dans la fiche client si différent ou manquant
      const clientId = selectedGroupForEmail.client?.id;
      if (clientId && recipient !== selectedGroupForEmail.client?.email) {
        await supabase.from("clients").update({ email: recipient }).eq("id", clientId);
      }

      const res = await fetch("/api/send-invoice-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          clientName: selectedGroupForEmail.client?.name || "Client",
          repairs: selectedGroupForEmail.repairs.map((r) => ({
            id: r.id,
            device: r.device,
            issue: r.issue,
            priceHt: r.priceHt,
            tvaRate: r.tvaRate,
            totalTtc: r.totalTtc,
          })),
          totalHt,
          totalTva,
          totalTtc: selectedGroupForEmail.totalTtc,
          totalRemaining: selectedGroupForEmail.totalRemaining,
          invoiceRef,
          companyName: companyProfile.name,
          companyAddress: companyProfile.address,
          companyPhone: companyProfile.phone,
          companyEmail: companyProfile.email,
          trackingCode: selectedGroupForEmail.client?.client_code || "",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("API send-invoice-email erreur:", err);
        throw new Error(err.error || "Erreur serveur");
      }

      setShowEmailModal(false);
      setEmailTo("");
      setSelectedGroupForEmail(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      alert(`❌ Envoi échoué : ${msg}`);
      console.error("sendEmailInvoice error:", e);
    } finally {
      setIsSending(false);
    }
  };

  /* -------------------------------------------------------------
     7️⃣ Édition d'une facture (gérant) + export Excel
     ------------------------------------------------------------- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEditModal = (group: any) => {
    if (!isGerant) return;
    setEditGroup(group);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEditRows(group.repairs.map((r: any) => ({ id: r.id, device: r.device, priceHt: r.priceHt, removed: false })));
    setEditTva(group.tvaRate ?? 0);
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editGroup) return;
    setSavingEdit(true);
    try {
      for (const row of editRows) {
        if (row.removed) {
          // Retirer de la facture : on remet la réparation "non facturée"
          await supabase
            .from("repairs")
            .update({ paid_amount: 0, payment_status: "non payé", payment_date: null })
            .eq("id", row.id);
        } else {
          const ht = Number(row.priceHt) || 0;
          const ttc = editTva === 0 ? ht : ht * (1 + editTva / 100);
          await supabase
            .from("repairs")
            .update({ final_price: ht, tva_rate: editTva, paid_amount: ttc })
            .eq("id", row.id);
        }
      }
      setShowEditModal(false);
      setEditGroup(null);
      await loadData();
    } catch (e) {
      console.error("saveEdit error:", e);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Export Excel (Ultra) d'une facture
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportExcel = async (group: any) => {
    const XLSX = await import("xlsx");
    const totalHt = group.repairs.reduce((s: number, r: any) => s + r.priceHt, 0);
    const totalTva = group.totalTtc - totalHt;
    const rows = [
      ["Facture", group.client?.name || "—"],
      ["Date", group.payment_date ? new Date(group.payment_date).toLocaleDateString("fr-FR") : ""],
      ["Société", companyProfile.name],
      [],
      ["Réf.", "Appareil", "Panne", "Prix HT (€)", "TVA (%)", "Prix TTC (€)"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...group.repairs.map((r: any) => [
        `MBX-${r.id}`,
        r.device,
        r.issue,
        Number(r.priceHt).toFixed(2),
        group.tvaRate,
        Number(r.totalTtc).toFixed(2),
      ]),
      [],
      ["", "", "", "Total HT", "", totalHt.toFixed(2)],
      ["", "", "", "TVA", "", totalTva.toFixed(2)],
      ["", "", "", "Total TTC", "", group.totalTtc.toFixed(2)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facture");
    const safeName = (group.client?.name || "client").replace(/[^a-z0-9]/gi, "_");
    XLSX.writeFile(wb, `Facture_${safeName}.xlsx`);
  };

  /* -------------------------------------------------------------
     8️⃣ Récupération des groupes
     ------------------------------------------------------------- */
  const unpaidGroups = groupByClient(false);
  const paidGroups = groupByClient(true);

  const totalTtc = [...unpaidGroups, ...paidGroups].reduce((s, g) => s + g.totalTtc, 0);
  const totalPaid = paidGroups.reduce((s, g) => s + g.totalPaid, 0);
  const totalRemaining = unpaidGroups.reduce((s, g) => s + g.totalRemaining, 0);

  /* -------------------------------------------------------------
     9️⃣ Chargement initial
     ------------------------------------------------------------- */
  useEffect(() => {
    loadData();
  }, []);

  /* -------------------------------------------------------------
     10️⃣ Rendu UI
     ------------------------------------------------------------- */
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Factures</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gestion des paiements · réparations terminées &amp; rendues</p>
          </div>
          <button onClick={loadData} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm border border-white/10 transition-all">
            🔄 Actualiser
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Facturé TTC</div>
            <div className="text-2xl font-black text-white">{totalTtc.toFixed(0)} €</div>
          </div>
          <div className="bg-[#16161d] border border-green-500/20 rounded-2xl p-4">
            <div className="text-[10px] font-semibold text-green-500/70 uppercase tracking-widest mb-1">Encaissé</div>
            <div className="text-2xl font-black text-green-400">{totalPaid.toFixed(0)} €</div>
          </div>
          <div className={`bg-[#16161d] border rounded-2xl p-4 ${totalRemaining > 0 ? "border-amber-500/20" : "border-white/8"}`}>
            <div className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-widest mb-1">Reste à encaisser</div>
            <div className={`text-2xl font-black ${totalRemaining > 0 ? "text-amber-400" : "text-gray-500"}`}>{totalRemaining.toFixed(0)} €</div>
          </div>
          <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Recouvrement</div>
            <div className="text-2xl font-black text-white">{totalTtc > 0 ? Math.round((totalPaid / totalTtc) * 100) : 0}%</div>
            <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${totalTtc > 0 ? Math.min(100, Math.round((totalPaid / totalTtc) * 100)) : 0}%` }} />
            </div>
          </div>
        </div>

        {/* RECHERCHE */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#16161d] border border-white/8 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none focus:border-white/20 transition-all"
          />
        </div>

        {/* FACTURES EN ATTENTE */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                En attente · {unpaidGroups.filter(g => g.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())).length} client(s)
              </h2>
            </div>
            {selectedRepairIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-semibold">{selectedRepairIds.size} sélectionnée(s)</span>
                <button
                  onClick={() => {
                    const sel = repairs.filter(r => selectedRepairIds.has(r.id));
                    const total = sel.reduce((s, r) => s + r.remainingTtc, 0);
                    const g = { client: sel[0]?.client, repairs: sel, totalRemaining: total, totalTtc: sel.reduce((s,r)=>s+r.totalTtc,0), totalPaid: sel.reduce((s,r)=>s+r.paidTtc,0), tvaRate: sel[0]?.tvaRate ?? 0 };
                    setSelectedGroup(g); setPaymentAmount(total.toFixed(2)); setShowPaymentModal(true);
                  }}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all"
                >💰 Encaisser sélection</button>
                <button
                  onClick={() => {
                    const sel = repairs.filter(r => selectedRepairIds.has(r.id));
                    const g = { client: sel[0]?.client, repairs: sel, totalRemaining: sel.reduce((s,r)=>s+r.remainingTtc,0), totalTtc: sel.reduce((s,r)=>s+r.totalTtc,0), totalPaid: sel.reduce((s,r)=>s+r.paidTtc,0), tvaRate: sel[0]?.tvaRate ?? 0 };
                    printInvoice(g);
                  }}
                  className="px-3 py-1.5 bg-white/8 hover:bg-white/12 text-gray-300 rounded-lg text-xs font-semibold transition-all border border-white/10"
                >🖨️ Imprimer sélection</button>
                <button
                  onClick={() => {
                    const sel = repairs.filter(r => selectedRepairIds.has(r.id));
                    const g = { client: sel[0]?.client, repairs: sel, totalRemaining: sel.reduce((s,r)=>s+r.remainingTtc,0), totalTtc: sel.reduce((s,r)=>s+r.totalTtc,0), totalPaid: sel.reduce((s,r)=>s+r.paidTtc,0), tvaRate: sel[0]?.tvaRate ?? 0 };
                    setSelectedGroupForEmail(g); setEmailTo(sel[0]?.client?.email || ""); setShowEmailModal(true);
                  }}
                  className="px-3 py-1.5 bg-white/8 hover:bg-white/12 text-gray-300 rounded-lg text-xs font-semibold transition-all border border-white/10"
                >✉️ Email sélection</button>
                <button onClick={() => setSelectedRepairIds(new Set())} className="text-gray-600 hover:text-gray-400 text-xs transition-all">✕ Annuler</button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {unpaidGroups
              .filter((g) => g.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((group) => {
                const cid = String(group.client?.id);
                const isOpen = expandedClients.has(cid);
                const groupSelectedCount = group.repairs.filter(r => selectedRepairIds.has(r.id)).length;
                const allSelected = groupSelectedCount === group.repairs.length;

                const toggleClient = () => setExpandedClients(prev => {
                  const next = new Set(prev);
                  isOpen ? next.delete(cid) : next.add(cid);
                  return next;
                });

                const toggleAllGroup = (e) => {
                  e.stopPropagation();
                  setSelectedRepairIds(prev => {
                    const next = new Set(prev);
                    if (allSelected) { group.repairs.forEach(r => next.delete(r.id)); }
                    else { group.repairs.forEach(r => next.add(r.id)); }
                    return next;
                  });
                };

                return (
                  <div key={cid} className="bg-[#16161d] border border-white/8 rounded-2xl overflow-hidden">
                    {/* Header accordéon */}
                    <div
                      className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-white/3 transition-colors"
                      onClick={toggleClient}
                    >
                      {/* Checkbox groupe */}
                      <div onClick={toggleAllGroup} className="shrink-0">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${allSelected && group.repairs.length > 0 ? "bg-amber-500 border-amber-500" : groupSelectedCount > 0 ? "bg-amber-500/30 border-amber-500/60" : "border-white/20 hover:border-white/40"}`}>
                          {allSelected && group.repairs.length > 0 ? <span className="text-white text-xs font-bold">✓</span> : groupSelectedCount > 0 ? <span className="text-amber-300 text-xs">−</span> : null}
                        </div>
                      </div>

                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                        {group.client?.name?.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm">{group.client?.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{group.repairs.length} réparation(s)</span>
                          <span className="text-gray-700">·</span>
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <span className="text-xs text-gray-500">TVA</span>
                            <select
                              value={group.tvaRate}
                              onChange={(e) => updateClientTva(group.client?.id, Number(e.target.value))}
                              className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-md px-1.5 py-0.5 outline-none"
                            >
                              {TVA_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xl font-black text-amber-400">{group.totalRemaining.toFixed(2)} €</div>
                        <div className="text-[10px] text-gray-600">dû</div>
                      </div>

                      <div className={`text-gray-600 ml-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5L7 10L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>

                    {/* Réparations (accordéon) */}
                    {isOpen && (
                      <>
                        <div className="border-t border-white/5 divide-y divide-white/5">
                          {group.repairs.map((r) => {
                            const isSelected = selectedRepairIds.has(r.id);
                            const paidPct = r.totalTtc > 0 ? Math.min(100, (r.paidTtc / r.totalTtc) * 100) : 0;
                            const statusColor = r.status === "✅ Terminé" ? "text-blue-400 bg-blue-500/10" : r.status === "📦 Rendu" ? "text-gray-400 bg-white/8" : "text-pink-400 bg-pink-500/10";

                            return (
                              <div
                                key={r.id}
                                onClick={() => setSelectedRepairIds(prev => {
                                  const next = new Set(prev);
                                  isSelected ? next.delete(r.id) : next.add(r.id);
                                  return next;
                                })}
                                className={`px-5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? "bg-amber-500/8 border-l-2 border-amber-500" : "hover:bg-white/3"}`}
                              >
                                {/* Checkbox */}
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? "bg-amber-500 border-amber-500" : "border-white/20"}`}>
                                  {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                                </div>

                                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md w-20 text-center shrink-0">MBX-{r.id}</span>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-white truncate">{r.device}</div>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${statusColor}`}>{r.status}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">{r.issue}</div>
                                  {r.paidTtc > 0 && r.remainingTtc > 0 && (
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${paidPct}%` }} />
                                      </div>
                                      <span className="text-[10px] text-gray-500 shrink-0">{r.paidTtc.toFixed(0)}€ payé</span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-right shrink-0 hidden sm:block">
                                  <div className="text-xs text-gray-600">{r.priceHt.toFixed(2)} HT</div>
                                  <div className="text-sm font-semibold text-white">{r.totalTtc.toFixed(2)} €</div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-[10px] text-gray-500">Reste</div>
                                  <div className="text-sm font-bold text-red-400">{r.remainingTtc.toFixed(2)} €</div>
                                </div>

                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedGroup({ ...group, repairs: [r], totalRemaining: r.remainingTtc }); setPaymentAmount(r.remainingTtc.toString()); setShowPaymentModal(true); }}
                                  className="shrink-0 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg text-xs font-semibold transition-all border border-green-500/20"
                                >
                                  Encaisser
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Actions groupe */}
                        <div className="px-5 py-3 bg-black/20 flex gap-2 justify-end border-t border-white/5">
                          <button
                            onClick={() => { setSelectedGroup(group); setPaymentAmount(group.totalRemaining.toString()); setShowPaymentModal(true); }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all"
                          >💰 Tout encaisser</button>
                          <button onClick={() => printInvoice(group)} className="px-4 py-2 bg-white/8 hover:bg-white/12 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/10">
                            🖨️ Imprimer
                          </button>
                          <button
                            onClick={() => { setSelectedGroupForEmail(group); setEmailTo(group.client?.email || ""); setShowEmailModal(true); }}
                            className="px-4 py-2 bg-white/8 hover:bg-white/12 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/10"
                          >✉️ Email</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            {unpaidGroups.length === 0 && (
              <div className="text-center text-gray-600 py-10 bg-[#16161d] border border-white/5 rounded-2xl text-sm">✅ Aucune facture en attente</div>
            )}
          </div>
        </div>

        {/* FACTURES PAYÉES */}
        {paidGroups.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Soldées · {paidGroups.length} client(s)</h2>
            </div>
            <div className="space-y-2">
              {paidGroups
                .filter((g) => g.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((group) => {
                  const cid = "paid-" + group.key;
                  const isOpen = expandedClients.has(cid);
                  const dateStr = group.payment_date ? new Date(group.payment_date).toLocaleDateString("fr-FR") : "";
                  return (
                    <div key={cid} className="bg-[#16161d] border border-green-500/15 rounded-2xl overflow-hidden">
                      <div
                        className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-white/3 transition-colors"
                        onClick={() => setExpandedClients(prev => { const next = new Set(prev); isOpen ? next.delete(cid) : next.add(cid); return next; })}
                      >
                        <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 font-black text-sm shrink-0">
                          {group.client?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm">{group.client?.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {group.repairs.length} réparation(s){dateStr ? ` · ${dateStr}` : ""}{group.payment_method ? ` · ${group.payment_method}` : ""}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-black text-green-400">{group.totalPaid.toFixed(2)} €</div>
                          <div className="text-[10px] text-gray-600">payé</div>
                        </div>
                        <div className={`text-gray-600 ml-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5L7 10L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-white/5">
                          <div className="divide-y divide-white/5">
                            {group.repairs.map((r) => (
                              <div key={r.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors">
                                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md w-20 text-center shrink-0">MBX-{r.id}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white truncate">{r.device}</div>
                                  <div className="text-xs text-gray-500 truncate">{r.issue}</div>
                                </div>
                                <div className="text-sm font-bold text-green-400 shrink-0">{r.totalTtc.toFixed(2)} €</div>
                              </div>
                            ))}
                          </div>
                          {/* Actions facture (paiement = 1 facture) */}
                          <div className="px-5 py-3 border-t border-white/5 flex flex-wrap items-center gap-2 bg-white/3">
                            <button onClick={() => printInvoice(group)} className="px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-lg text-xs font-semibold transition-all border border-indigo-500/20">
                              🧾 Facture PDF
                            </button>
                            <button onClick={() => exportExcel(group)} className="px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-300 rounded-lg text-xs font-semibold transition-all border border-green-500/20">
                              📊 Exporter Excel
                            </button>
                            {isGerant && (
                              <button onClick={() => openEditModal(group)} className="px-3 py-1.5 bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 rounded-lg text-xs font-semibold transition-all border border-orange-500/20">
                                ✏️ Modifier
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL PAIEMENT */}
      {showPaymentModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16161d] border border-white/10 border-t-2 border-t-purple-500 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">💰 Encaissement</h2>
            <p className="text-gray-400 text-sm"><span className="text-gray-500">Client:</span> <span className="text-white font-medium">{selectedGroup.client?.name}</span></p>
            <p className="text-red-400 font-bold my-3 text-lg">Reste: {selectedGroup.totalRemaining.toFixed(2)} €</p>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/15 transition-all my-2"
              step="0.01"
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/15 transition-all my-2"
            >
              <option>Espèces</option>
              <option>Carte Bancaire</option>
              <option>Virement</option>
              <option>Chèque</option>
            </select>
            <button onClick={registerPayment} disabled={isSending} className="w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl font-semibold text-sm transition-all mt-2 disabled:opacity-50">
              ✅ Encaisser
            </button>
            <button onClick={() => setShowPaymentModal(false)} className="w-full bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-sm border border-white/10 transition-all mt-2">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER FACTURE (gérant) */}
      {showEditModal && editGroup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16161d] border border-white/10 border-t-2 border-t-orange-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1">✏️ Modifier la facture</h2>
            <p className="text-gray-500 text-xs mb-4">{editGroup.client?.name}</p>

            {/* Réparations éditables */}
            <div className="space-y-2 mb-4">
              {editRows.map((row, i) => (
                <div key={row.id} className={`flex items-center gap-2 bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2 ${row.removed ? "opacity-40" : ""}`}>
                  <span className="font-mono text-[10px] text-indigo-400 shrink-0">MBX-{row.id}</span>
                  <span className="flex-1 text-xs text-white truncate">{row.device}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={row.priceHt}
                    disabled={row.removed}
                    onChange={(e) => setEditRows((prev) => prev.map((p, j) => j === i ? { ...p, priceHt: e.target.value } : p))}
                    className="w-20 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white text-xs text-right outline-none focus:border-orange-500/60"
                  />
                  <span className="text-[10px] text-gray-500">€ HT</span>
                  <button
                    onClick={() => setEditRows((prev) => prev.map((p, j) => j === i ? { ...p, removed: !p.removed } : p))}
                    className={`text-xs px-2 py-1 rounded-lg border transition-all ${row.removed ? "bg-white/5 text-gray-400 border-white/10" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}`}
                    title={row.removed ? "Annuler le retrait" : "Retirer de la facture"}
                  >
                    {row.removed ? "↩" : "🗑"}
                  </button>
                </div>
              ))}
            </div>

            {/* TVA */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gray-400">Taux de TVA</span>
              <select
                value={editTva}
                onChange={(e) => setEditTva(Number(e.target.value))}
                className="bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-orange-500/60"
              >
                {TVA_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>

            {/* Total recalculé en direct */}
            <div className="bg-white/5 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Nouveau total TTC</span>
              <span className="text-lg font-black text-orange-400">
                {editRows.filter((r) => !r.removed).reduce((s, r) => {
                  const ht = Number(r.priceHt) || 0;
                  return s + (editTva === 0 ? ht : ht * (1 + editTva / 100));
                }, 0).toFixed(2)} €
              </span>
            </div>

            <button onClick={saveEdit} disabled={savingEdit} className="w-full bg-orange-500 hover:bg-orange-400 text-black py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
              {savingEdit ? "Enregistrement…" : "💾 Enregistrer"}
            </button>
            <button onClick={() => { setShowEditModal(false); setEditGroup(null); }} className="w-full bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-sm border border-white/10 transition-all mt-2">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* MODAL EMAIL */}
      {showEmailModal && selectedGroupForEmail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16161d] border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">

            {/* En-tête */}
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Envoyer la facture par email</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedGroupForEmail.client?.name}</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-600 hover:text-gray-400 transition-colors text-lg leading-none">✕</button>
            </div>

            {/* Aperçu réparations */}
            <div className="px-6 py-4 border-b border-white/8">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Contenu de la facture</div>
              <div className="space-y-1.5">
                {selectedGroupForEmail.repairs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-indigo-400 shrink-0">MBX-{r.id}</span>
                      <span className="text-xs text-gray-300 truncate">{r.device} · {r.issue}</span>
                    </div>
                    <span className="text-xs font-semibold text-white shrink-0 ml-2">{r.totalTtc.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {selectedGroupForEmail.totalRemaining > 0
                    ? `Reste à payer`
                    : "Facture soldée"}
                </span>
                <span className={`text-sm font-black ${selectedGroupForEmail.totalRemaining > 0 ? "text-amber-400" : "text-green-400"}`}>
                  {selectedGroupForEmail.totalRemaining > 0
                    ? `${selectedGroupForEmail.totalRemaining.toFixed(2)} €`
                    : `${selectedGroupForEmail.totalTtc.toFixed(2)} € ✓`}
                </span>
              </div>
            </div>

            {/* Destinataire */}
            <div className="px-6 py-4">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Destinataire</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="email@client.fr"
                className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none focus:border-white/30 transition-all"
              />
              {!emailTo && selectedGroupForEmail.client?.email && (
                <button
                  onClick={() => setEmailTo(selectedGroupForEmail.client.email)}
                  className="mt-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Utiliser {selectedGroupForEmail.client.email}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex gap-2">
              <button
                onClick={sendEmailInvoice}
                disabled={isSending || !emailTo}
                className="flex-1 bg-white text-black py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 hover:bg-gray-100"
              >
                {isSending ? "Envoi en cours…" : "✉️ Envoyer"}
              </button>
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm border border-white/10 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
