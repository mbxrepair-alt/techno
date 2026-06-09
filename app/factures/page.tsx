/* -------------------------------------------------------------
   app/factures/page.jsx
   ------------------------------------------------------------- */

"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import emailjs from "@emailjs/browser";

/* -------------------------------------------------------------
   Variables d’environnement (exposées côté client)
   ------------------------------------------------------------- */
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "MBX Réparations";
const FROM_EMAIL = process.env.NEXT_PUBLIC_FROM_EMAIL || "no-reply@mbx-reparations.fr";

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

      // Charger les TVA clients ET les réparations en parallèle
      const [tvaResult, repairsResult, clientsResult] = await Promise.all([
        supabase.from("clients").select("id, default_tva_rate").eq("user_id", user.id),
        supabase.from("repairs").select("*, clients(*)").eq("user_id", user.id).in("status", ["✅ Terminé", "📦 Rendu", "🚫 Refus client"]).order("created_at", { ascending: false }),
        supabase.from("clients").select("*").eq("user_id", user.id),
      ]);

      // Construire le map TVA directement (pas via state = pas de stale closure)
      const rates: Record<string, number> = {};
      tvaResult.data?.forEach((c) => (rates[c.id] = c.default_tva_rate ?? 0));
      setClientTvaRates(rates);

      if (clientsResult.data) setClients(clientsResult.data);
      if (repairsResult.error) throw repairsResult.error;

      const repairsWithDetails = (repairsResult.data || []).map((r) => {
        const priceHt = r.final_price ?? r.estimated_price ?? 0;
        // Priorité : tva_rate de la réparation, sinon tva du client (depuis rates frais, pas state)
        const tvaRate = r.tva_rate ?? rates[r.client_id] ?? 0;
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
        };
      });

      setRepairs(repairsWithDetails);
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
      if (!groups.has(cid)) {
        groups.set(cid, {
          client: r.client,
          repairs: [],
          totalTtc: 0,
          totalPaid: 0,
          totalRemaining: 0,
          tvaRate: clientTvaRates[cid] ?? r.tvaRate ?? 0,
        });
      }
      const g = groups.get(cid);
      g.repairs.push(r);
      g.totalTtc += r.totalTtc;
      g.totalPaid += r.paidTtc;
      g.totalRemaining += r.remainingTtc;
    });

    return Array.from(groups.values()).sort((a, b) => b.totalRemaining - a.totalRemaining);
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
    const win = window.open("", "_blank", "height=800,width=900");
    if (!win) { alert("Autorisez les pop-ups pour imprimer."); return; }

    const invoiceRef = `FACT-${String(group.client?.id || "").slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-5)}`;
    const totalHt = group.repairs.reduce((s, r) => s + r.priceHt, 0);
    const totalTva = group.totalTtc - totalHt;
    const date = new Date().toLocaleDateString("fr-FR");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Facture ${invoiceRef}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:30px;color:#1a1a2e}
      .page{max-width:800px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}
      .header{background:linear-gradient(135deg,#6c2bd9,#4f46e5);color:#fff;padding:32px 36px;display:flex;justify-content:space-between;align-items:flex-start}
      .logo{font-size:26px;font-weight:900;letter-spacing:-1px}
      .logo span{color:#c4b5fd}
      .invoice-meta{text-align:right}
      .invoice-meta h2{font-size:18px;font-weight:700;color:#c4b5fd;text-transform:uppercase;letter-spacing:2px}
      .invoice-meta p{font-size:13px;opacity:.85;margin-top:4px}
      .body{padding:32px 36px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
      .info-box h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6c2bd9;margin-bottom:8px;border-bottom:2px solid #e0d7ff;padding-bottom:4px}
      .info-box p{font-size:13px;color:#444;line-height:1.7}
      .info-box .name{font-size:15px;font-weight:700;color:#1a1a2e}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      thead tr{background:#f5f3ff}
      th{padding:10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6c2bd9;border-bottom:2px solid #e0d7ff}
      th.right,td.right{text-align:right}
      td{padding:11px 12px;font-size:13px;color:#333;border-bottom:1px solid #f0f0f0}
      tr:last-child td{border-bottom:none}
      tr:hover td{background:#faf8ff}
      .ticket{font-family:monospace;font-weight:700;color:#6c2bd9}
      .totals{display:flex;justify-content:flex-end;margin-bottom:28px}
      .totals-box{width:280px;background:#f9f7ff;border-radius:10px;padding:16px;border:1px solid #e0d7ff}
      .totals-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;color:#555}
      .totals-row.tva{border-top:1px solid #e0d7ff;margin-top:4px;padding-top:8px}
      .totals-row.ttc{border-top:2px solid #6c2bd9;margin-top:6px;padding-top:10px;font-weight:700;font-size:16px;color:#1a1a2e}
      .totals-row.paid{color:#16a34a;font-weight:600}
      .totals-row.due{color:#dc2626;font-weight:700;font-size:14px;border-top:1px dashed #fca5a5;margin-top:6px;padding-top:8px}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
      .badge-paid{background:#dcfce7;color:#16a34a}
      .badge-due{background:#fef2f2;color:#dc2626}
      .footer{background:#f9f7ff;border-top:1px solid #e0d7ff;padding:18px 36px;font-size:11px;color:#888;display:flex;justify-content:space-between}
      @media print{body{padding:0;background:#fff}.page{box-shadow:none}.no-print{display:none!important}}
      .print-btn{display:block;text-align:center;margin:20px auto;padding:12px 32px;background:linear-gradient(135deg,#6c2bd9,#4f46e5);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.5px}
    </style></head><body>
    <div class="page">
      <div class="header">
        <div>
          <div class="logo">MBX <span>Réparations</span></div>
          <p style="margin-top:6px;font-size:12px;opacity:.8">Atelier de réparation mobile &amp; électronique</p>
        </div>
        <div class="invoice-meta">
          <h2>Facture</h2>
          <p>${invoiceRef}</p>
          <p>Date : ${date}</p>
        </div>
      </div>
      <div class="body">
        <div class="info-grid">
          <div class="info-box">
            <h3>Émetteur</h3>
            <p class="name">MBX Réparations</p>
            <p>8 Rue de l'Épée, 69003 Lyon</p>
            <p>contact@mbx-reparations.fr</p>
            <p>04 72 60 16 13</p>
          </div>
          <div class="info-box">
            <h3>Client</h3>
            <p class="name">${group.client?.name || "—"}</p>
            ${group.client?.phone ? `<p>📞 ${group.client.phone}</p>` : ""}
            ${group.client?.email ? `<p>✉️ ${group.client.email}</p>` : ""}
            ${group.client?.client_code ? `<p>Code : <strong>${group.client.client_code}</strong></p>` : ""}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Appareil</th>
              <th>Désignation</th>
              <th class="right">Prix HT</th>
              <th class="right">TVA</th>
              <th class="right">Total TTC</th>
            </tr>
          </thead>
          <tbody>
            ${group.repairs.map((r) => `
              <tr>
                <td><span class="ticket">MBX-${r.id}</span></td>
                <td>${r.device}</td>
                <td style="color:#555">${r.issue}</td>
                <td class="right">${r.priceHt.toFixed(2)} €</td>
                <td class="right">${r.tvaRate > 0 ? r.tvaRate + "%" : "—"}</td>
                <td class="right" style="font-weight:600">${r.totalTtc.toFixed(2)} €</td>
              </tr>`).join("")}
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-box">
            <div class="totals-row"><span>Total HT</span><span>${totalHt.toFixed(2)} €</span></div>
            ${totalTva > 0 ? `<div class="totals-row tva"><span>TVA</span><span>${totalTva.toFixed(2)} €</span></div>` : ""}
            <div class="totals-row ttc"><span>Total TTC</span><span>${group.totalTtc.toFixed(2)} €</span></div>
            ${group.totalPaid > 0 ? `<div class="totals-row paid"><span>Déjà réglé</span><span>− ${group.totalPaid.toFixed(2)} €</span></div>` : ""}
            <div class="totals-row due">
              <span>Reste à payer</span>
              <span>${group.totalRemaining.toFixed(2)} €
                <span class="badge ${group.totalRemaining <= 0 ? "badge-paid" : "badge-due"}">${group.totalRemaining <= 0 ? "SOLDÉ" : "DÛ"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="footer">
        <span>Merci pour votre confiance · MBX Réparations</span>
        <span>Garantie : 3 mois pièces &amp; main d'œuvre</span>
      </div>
    </div>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
    </body></html>`);
    win.document.close();
  };

  /* -------------------------------------------------------------
     7️⃣ Envoi email
     ------------------------------------------------------------- */
  const sendEmailInvoice = async () => {
    if (!selectedGroupForEmail) {
      alert("Aucun groupe sélectionné!");
      return;
    }

    const recipient = selectedGroupForEmail.client?.email || emailTo;
    if (!recipient) {
      alert("Email manquant");
      return;
    }

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      alert("Erreur de configuration EmailJS");
      return;
    }

    setIsSending(true);
    try {
      // Construction du tableau HTML des réparations
      const repairRows = selectedGroupForEmail.repairs
        .map(
          (r) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">MBX-${r.id}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${r.device}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${r.issue}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${r.priceHt.toFixed(2)} €</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${r.tvaRate}%</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${r.totalTtc.toFixed(2)} €</td>
      </tr>
    `
        )
        .join("");

      const repairDetailsHtml = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f3f3;">
            <th style="padding:8px;text-align:left;">Ticket</th>
            <th style="padding:8px;text-align:left;">Appareil</th>
            <th style="padding:8px;text-align:left;">Panne</th>
            <th style="padding:8px;text-align:right;">Montant HT</th>
            <th style="padding:8px;text-align:right;">TVA</th>
            <th style="padding:8px;text-align:right;">Montant TTC</th>
          </tr>
        </thead>
        <tbody>
          ${repairRows}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #ddd;">
            <td colspan="3" style="padding:8px;text-align:right;"><strong>Total HT:</strong></td>
            <td style="padding:8px;text-align:right;"><strong>${selectedGroupForEmail.repairs.reduce((s, r) => s + r.priceHt, 0).toFixed(2)} €</strong></td>
            <td style="padding:8px;text-align:right;"></td>
            <td style="padding:8px;text-align:right;"></td>
          </tr>
          <tr>
            <td colspan="3" style="padding:8px;text-align:right;"><strong>TVA (20%):</strong></td>
            <td style="padding:8px;text-align:right;"><strong>${(selectedGroupForEmail.totalTtc - selectedGroupForEmail.repairs.reduce((s, r) => s + r.priceHt, 0)).toFixed(2)} €</strong></td>
            <td style="padding:8px;text-align:right;"></td>
            <td style="padding:8px;text-align:right;"></td>
          </tr>
          <tr>
            <td colspan="3" style="padding:8px;text-align:right;"><strong>Total TTC:</strong></td>
            <td style="padding:8px;text-align:right;"></td>
            <td style="padding:8px;text-align:right;"></td>
            <td style="padding:8px;text-align:right;"><strong>${selectedGroupForEmail.totalTtc.toFixed(2)} €</strong></td>
          </tr>
        </tfoot>
      </table>
    `;

      const emailData = {
        to_email: recipient,
        client_name: selectedGroupForEmail.client?.name || "Client",
        company_name: COMPANY_NAME,
        from_email: FROM_EMAIL,
        invoice_date: new Date().toLocaleDateString("fr-FR"),
        invoice_reference: `FACT-${selectedGroupForEmail.client?.id}-${Date.now().toString().slice(-6)}`,
        repair_details: repairDetailsHtml,
        invoice_total_ht: selectedGroupForEmail.repairs
          .reduce((s, r) => s + r.priceHt, 0)
          .toFixed(2),
        invoice_total_vat: (
          selectedGroupForEmail.totalTtc -
          selectedGroupForEmail.repairs.reduce((s, r) => s + r.priceHt, 0)
        ).toFixed(2),
        invoice_total_ttc: selectedGroupForEmail.totalTtc.toFixed(2),
        invoice_amount_due: selectedGroupForEmail.totalRemaining.toFixed(2),
        tracking_url: `https://technophone.vercel.app/suivi-client?code=${selectedGroupForEmail.client?.client_code || ""}`,
        year: new Date().getFullYear(),
      };

      console.log("📤 Envoi EmailJS avec:", emailData);

      const result = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        emailData,
        EMAILJS_PUBLIC_KEY
      );

      console.log("✅ EmailJS réponse:", result);
      setShowEmailModal(false);
      setEmailTo("");
      setSelectedGroupForEmail(null);
    } catch (e) {
      console.error("sendEmailInvoice error:", e);
    } finally {
      setIsSending(false);
    }
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
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl px-6 py-5 mb-6">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative">
            <h1 className="text-2xl font-black text-white tracking-tight">💰 Factures</h1>
            <p className="text-xs text-white/60 uppercase tracking-widest mt-1">Gestion des paiements · réparations terminées</p>
          </div>
        </div>

        {/* STATISTIQUES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-purple-500/25">
            <div className="text-xs font-medium text-white/70 uppercase tracking-wider">Total TTC facturé</div>
            <div className="text-3xl font-black mt-1">{totalTtc.toFixed(2)} €</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg shadow-green-500/25">
            <div className="text-xs font-medium text-white/70 uppercase tracking-wider">Total payé</div>
            <div className="text-3xl font-black mt-1">{totalPaid.toFixed(2)} €</div>
          </div>
          <div className={`bg-gradient-to-br rounded-2xl p-5 text-white shadow-lg ${totalRemaining > 500 ? "from-red-500 to-red-600 shadow-red-500/25" : "from-violet-500 to-purple-600 shadow-violet-500/25"}`}>
            <div className="text-xs font-medium text-white/70 uppercase tracking-wider">Reste à payer</div>
            <div className="text-3xl font-black mt-1">{totalRemaining.toFixed(2)} €</div>
          </div>
          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recouvrement</div>
            <div className="text-3xl font-black mt-1 text-purple-400">
              {totalTtc > 0 ? Math.round((totalPaid / totalTtc) * 100) : 0}%
            </div>
            <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full transition-all" style={{ width: `${totalTtc > 0 ? Math.min(100, Math.round((totalPaid / totalTtc) * 100)) : 0}%` }} />
            </div>
          </div>
        </div>

        {/* RECHERCHE */}
        <div className="flex gap-3 mb-6 p-4 bg-[#16161d] border border-white/5 rounded-2xl">
          <input
            type="text"
            placeholder="🔍 Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/15 transition-all duration-200"
          />
          <button
            onClick={loadData}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm border border-white/10 transition-all"
          >
            🔄 Actualiser
          </button>
        </div>

        {/* SECTION FACTURES IMPAYÉES */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            📋 Factures en attente ({unpaidGroups.length} client(s))
          </h2>
          <div className="space-y-4">
            {unpaidGroups
              .filter((g) => g.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((group) => (
                <div key={group.client?.id} className="bg-[#16161d] border border-white/5 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">{group.client?.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-white/70">TVA</span>
                          <select
                            value={group.tvaRate}
                            onChange={(e) => updateClientTva(group.client?.id, Number(e.target.value))}
                            className="bg-white/20 text-white text-xs rounded-lg px-2 py-1 outline-none"
                          >
                            {TVA_RATES.map((r) => (
                              <option key={r} value={r}>{r}%</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-white/70">Total dû</div>
                        <div className="text-2xl font-black">{group.totalRemaining.toFixed(2)} €</div>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-purple-500/10 border-b border-white/5">
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-purple-400 uppercase tracking-widest">Ticket</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-purple-400 uppercase tracking-widest">Appareil</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-purple-400 uppercase tracking-widest">Panne</th>
                          <th className="px-4 py-2.5 text-center text-xs font-bold text-purple-400 uppercase tracking-widest">HT</th>
                          <th className="px-4 py-2.5 text-center text-xs font-bold text-purple-400 uppercase tracking-widest">TVA</th>
                          <th className="px-4 py-2.5 text-center text-xs font-bold text-purple-400 uppercase tracking-widest">TTC</th>
                          <th className="px-4 py-2.5 text-center text-xs font-bold text-purple-400 uppercase tracking-widest">Reste</th>
                          <th className="px-4 py-2.5 text-center text-xs font-bold text-purple-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {group.repairs.map((r) => (
                          <tr key={r.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono text-purple-400 text-sm font-bold">MBX-{r.id}</td>
                            <td className="px-4 py-3 text-sm text-white">{r.device}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">{r.issue}</td>
                            <td className="px-4 py-3 text-center text-white text-sm font-semibold">{r.priceHt.toFixed(2)}€</td>
                            <td className="px-4 py-3 text-center text-gray-400 text-sm">{r.tvaRate}%</td>
                            <td className="px-4 py-3 text-center text-gray-300 text-sm">{r.totalTtc.toFixed(2)}€</td>
                            <td className="px-4 py-3 text-center text-red-400 text-sm font-bold">{r.remainingTtc.toFixed(2)}€</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => { setSelectedGroup({ ...group, repairs: [r], totalRemaining: r.remainingTtc }); setPaymentAmount(r.remainingTtc.toString()); setShowPaymentModal(true); }}
                                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs transition-all font-medium"
                              >
                                💵 Encaisser
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-white/5 flex gap-2 justify-end">
                    <button
                      onClick={() => { setSelectedGroup(group); setPaymentAmount(group.totalRemaining.toString()); setShowPaymentModal(true); }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition-all"
                    >
                      💰 Encaisser le solde
                    </button>
                    <button onClick={() => printInvoice(group)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-all">
                      🖨️ Imprimer
                    </button>
                    <button
                      onClick={() => { setSelectedGroupForEmail(group); setEmailTo(group.client?.email || ""); setShowEmailModal(true); }}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all"
                    >
                      ✉️ Email
                    </button>
                  </div>
                </div>
              ))}
            {unpaidGroups.length === 0 && (
              <div className="text-center text-gray-500 py-8 bg-[#16161d] border border-white/5 rounded-2xl text-sm">✅ Aucune facture en attente</div>
            )}
          </div>
        </div>

        {/* SECTION FACTURES PAYÉES */}
        {paidGroups.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
              ✅ Factures payées ({paidGroups.length} client(s))
            </h2>
            <div className="space-y-4">
              {paidGroups
                .filter((g) => g.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((group) => (
                  <div key={group.client?.id} className="bg-[#16161d] border border-green-500/20 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-green-700 to-green-600 text-white">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold">{group.client?.name}</h3>
                        <div className="text-right">
                          <div className="text-xs text-white/70">Total payé</div>
                          <div className="text-2xl font-black">{group.totalPaid.toFixed(2)} €</div>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-green-500/10 border-b border-white/5">
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-green-400 uppercase tracking-widest">Ticket</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-green-400 uppercase tracking-widest">Appareil</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-green-400 uppercase tracking-widest">Panne</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-green-400 uppercase tracking-widest">HT</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-green-400 uppercase tracking-widest">TVA</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-green-400 uppercase tracking-widest">TTC</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-green-400 uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {group.repairs.map((r) => (
                            <tr key={r.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 font-mono text-purple-400 text-sm font-bold">MBX-{r.id}</td>
                              <td className="px-4 py-3 text-sm text-white">{r.device}</td>
                              <td className="px-4 py-3 text-sm text-gray-400">{r.issue}</td>
                              <td className="px-4 py-3 text-center text-white text-sm font-semibold">{r.priceHt.toFixed(2)}€</td>
                              <td className="px-4 py-3 text-center text-gray-400 text-sm">{r.tvaRate}%</td>
                              <td className="px-4 py-3 text-center text-green-400 text-sm font-bold">{r.totalTtc.toFixed(2)}€</td>
                              <td className="px-4 py-3 text-center">
                                <button onClick={() => printInvoice({ ...group, repairs: [r] })} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs transition-all font-medium">
                                  🧾 Facture
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL PAIEMENT */}
      {showPaymentModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#232742] border border-white/10 border-t-2 border-t-purple-500 rounded-2xl max-w-md w-full p-6 shadow-2xl">
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
            <button onClick={registerPayment} disabled={isSending} className="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 transition-all mt-2 disabled:opacity-50">
              ✅ Encaisser
            </button>
            <button onClick={() => setShowPaymentModal(false)} className="w-full bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-sm border border-white/10 transition-all mt-2">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* MODAL EMAIL */}
      {showEmailModal && selectedGroupForEmail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#232742] border border-white/10 border-t-2 border-t-purple-500 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">✉️ Envoyer la facture</h2>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="Email du client"
              className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/15 transition-all mb-4"
            />
            <button onClick={sendEmailInvoice} disabled={isSending} className="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 transition-all disabled:opacity-50">
              Envoyer
            </button>
            <button onClick={() => setShowEmailModal(false)} className="w-full bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-sm border border-white/10 transition-all mt-2">
              Annuler
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
