"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { createInvoice, type InvoiceItem } from "../lib/invoices";
import { ScanLine, X, SendHorizonal } from "lucide-react";
import QrScanner from "./QrScanner";

export interface CartProduct {
  id: number;
  name: string;
  stock: number;
  sale_price: number;
  purchase_price: number;
  barcode?: string;
  [key: string]: unknown;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface Props {
  cartItems: CartItem[];
  setCartItems: (fn: (prev: CartItem[]) => CartItem[]) => void;
  linkedRepair: any | null;
  setLinkedRepair: (r: any | null) => void;
  products: CartProduct[];
  userId: string;
  soldBy?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CartValidationModal({
  cartItems,
  setCartItems,
  linkedRepair,
  setLinkedRepair,
  products,
  userId,
  soldBy = "Boutique",
  onClose,
  onSuccess,
}: Props) {
  const [selectedClient, setSelectedClient] = useState<{ id?: number; name: string; phone?: string; email?: string } | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: "", phone: "", email: "" });
  const [modalProductSearch, setModalProductSearch] = useState("");
  const [showModalProductScanner, setShowModalProductScanner] = useState(false);
  const [showRepairScanner, setShowRepairScanner] = useState(false);
  const [repairCodeInput, setRepairCodeInput] = useState("");
  const [payments, setPayments] = useState<{ method: string; amount: string }[]>([{ method: "Carte", amount: "" }]);
  const [paymentError, setPaymentError] = useState("");
  const [tvaRate, setTvaRate] = useState(20);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // Séparer les items réparation (MBX-xxx) des produits boutique
  const extraRepairItems = cartItems.filter((i) => /^MBX-\d+/i.test(String(i.product.barcode || "")));
  const visibleCartItems = cartItems.filter((i) => !/^MBX-\d+/i.test(String(i.product.barcode || "")) && (!linkedRepair || (String(i.product.barcode) !== `MBX-${linkedRepair.id}` && i.product.id !== linkedRepair.id)));

  const extraRepairsTtc = extraRepairItems.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0);
  const productsTtc = visibleCartItems.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0);
  const repairHt = linkedRepair ? (linkedRepair.final_price ?? linkedRepair.estimated_price ?? 0) : 0;
  const repairTtc = repairHt * (1 + tvaRate / 100);
  const grandTotal = productsTtc + repairTtc + extraRepairsTtc;

  const modalFiltered = modalProductSearch.trim()
    ? products.filter(
        (p) =>
          p.stock > 0 &&
          (p.name.toLowerCase().includes(modalProductSearch.toLowerCase()) ||
            (p.barcode && p.barcode.includes(modalProductSearch.trim()))) &&
          !cartItems.find((c) => c.product.id === p.id)
      )
    : [];

  const addToCartDirect = (p: CartProduct) => {
    setCartItems((prev) => {
      const ex = prev.find((i) => i.product.id === p.id);
      return ex
        ? prev.map((i) => (i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { product: p, quantity: 1 }];
    });
    setModalProductSearch("");
  };

  const searchExistingClients = async (search: string) => {
    if (!search.trim() || !userId) { setClientSearchResults([]); return; }
    const { data } = await supabase.from("clients").select("id,name,phone,email").eq("user_id", userId).ilike("name", `%${search}%`).limit(5);
    setClientSearchResults(data || []);
  };

  const fetchRepairByCode = async (code: string) => {
    const repairId = code.replace(/^MBX-/i, "").trim();
    if (!repairId || isNaN(Number(repairId))) { alert("Code invalide (ex: MBX-42)"); return; }
    const { data } = await supabase.from("repairs").select("*,clients(id,name,phone,email)").eq("id", Number(repairId)).eq("user_id", userId).maybeSingle();
    if (!data) { alert(`Réparation MBX-${repairId} introuvable`); return; }
    setLinkedRepair(data);
    setRepairCodeInput("");
  };

  const printCombinedInvoice = (invoiceId: string, client: { name: string }, cart: CartItem[], repair: any, tva: number, payMethod: string) => {
    const win = window.open("", "_blank", "height=900,width=1000");
    if (!win) return;
    const date = new Date().toLocaleDateString("fr-FR");
    const productsTtcLocal = cart.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0);
    const repairHtLocal = repair ? (repair.final_price ?? repair.estimated_price ?? 0) : 0;
    const repairTtcLocal = repairHtLocal * (1 + tva / 100);
    const grandTotalLocal = productsTtcLocal + repairTtcLocal;
    const payLabel: Record<string, string> = { "Espèces": "💵 Espèces", "Carte Bancaire": "💳 Carte Bancaire", "Virement": "🏦 Virement", "Chèque": "📄 Chèque" };
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Facture ${invoiceId}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;color:#0f172a;padding:32px 20px}.page{max-width:800px;margin:auto;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,.10)}.accent-bar{height:4px;background:linear-gradient(90deg,#a855f7,#6366f1,#06b6d4)}.header{display:flex;justify-content:space-between;align-items:flex-start;padding:32px 40px 24px}.header-right{text-align:right}.ref{font-size:13px;font-weight:600;color:#6366f1;font-family:monospace}.pill{display:inline-flex;align-items:center;margin-top:10px;padding:5px 14px;border-radius:99px;font-size:11px;font-weight:700;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}.sep{height:1px;background:#e2e8f0;margin:0 40px}.parties{display:grid;grid-template-columns:1fr 1fr;padding:24px 40px;border-bottom:1px solid #f1f5f9}.party-tag{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px}.party-name{font-size:17px;font-weight:800;color:#0f172a}.table-wrap{padding:0 40px}table{width:100%;border-collapse:collapse;margin-top:24px}thead tr{border-bottom:2px solid #0f172a}th{padding:0 12px 10px;text-align:left;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8}th.r{text-align:right}tbody tr{border-bottom:1px solid #f1f5f9}td{padding:14px 12px;font-size:13px;color:#334155}td.r{text-align:right}.bottom-wrap{display:flex;justify-content:flex-end;padding:24px 40px 32px;border-top:1px solid #f1f5f9}.totals{width:280px}.t-row{display:flex;justify-content:space-between;font-size:12.5px;color:#64748b;padding:5px 0}.t-row.ttc{border-top:2px solid #0f172a;margin-top:6px;padding-top:12px;font-size:18px;font-weight:800;color:#0f172a}.t-row.paid{color:#16a34a;font-weight:700}.footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 40px;display:flex;justify-content:space-between}.footer-txt{font-size:10.5px;color:#94a3b8}.footer-ref{font-family:monospace;font-size:10px;background:#0f172a;color:#94a3b8;padding:3px 10px;border-radius:4px}@media print{body{background:#fff;padding:0}.page{box-shadow:none}.no-print{display:none!important}}.print-btn{display:flex;align-items:center;justify-content:center;margin:28px auto 0;padding:12px 40px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;width:fit-content}</style></head><body>
    <div class="page">
      <div class="accent-bar"></div>
      <div class="header">
        <div><span style="font-size:24px;font-weight:900;color:#0f172a">MBX</span><div style="font-size:11px;color:#64748b;margin-top:8px">Réparations & Accessoires</div></div>
        <div class="header-right">
          <div style="font-size:36px;font-weight:800;color:#e2e8f0;letter-spacing:-1px">FACTURE</div>
          <div class="ref">${invoiceId}</div>
          <div style="font-size:11.5px;color:#94a3b8">Le ${date}</div>
          <div><span class="pill">✓ Soldée · ${payLabel[payMethod] || payMethod}</span></div>
        </div>
      </div>
      <div class="sep"></div>
      <div class="parties">
        <div class="party"><div class="party-tag">Vendeur</div><div class="party-name">MBX</div></div>
        <div class="party"><div class="party-tag">Client</div><div class="party-name">${client.name}</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Description</th><th class="r" style="width:70px">Qté</th><th class="r" style="width:90px">P.U. HT</th><th class="r" style="width:90px">Total TTC</th></tr></thead>
          <tbody>
            ${repair ? `<tr><td><span style="font-family:monospace;font-size:11px;color:#6366f1;background:#eef2ff;padding:3px 8px;border-radius:4px">MBX-${repair.id}</span>&nbsp;&nbsp;<strong>${repair.device}</strong><div style="font-size:11.5px;color:#94a3b8">${repair.issue || ""}</div></td><td class="r">1</td><td class="r">${repairHtLocal.toFixed(2)} €</td><td class="r" style="font-weight:600">${repairTtcLocal.toFixed(2)} €</td></tr>` : ""}
            ${cart.map((i) => { const ttc = Number(i.product.sale_price) * i.quantity; const puHt = tva > 0 ? Number(i.product.sale_price) / (1 + tva / 100) : Number(i.product.sale_price); return `<tr><td><span style="font-family:monospace;font-size:11px;color:#a855f7;background:#faf5ff;padding:3px 8px;border-radius:4px">🛍️</span>&nbsp;&nbsp;<strong>${i.product.name}</strong></td><td class="r">${i.quantity}</td><td class="r">${puHt.toFixed(2)} €</td><td class="r" style="font-weight:600">${ttc.toFixed(2)} €</td></tr>`; }).join("")}
          </tbody>
        </table>
      </div>
      <div class="bottom-wrap">
        <div class="totals">
          ${tva > 0 ? `
          <div class="t-row"><span>Total HT</span><span>${(grandTotalLocal / (1 + tva / 100)).toFixed(2)} €</span></div>
          <div class="t-row"><span>TVA ${tva}%</span><span>${(grandTotalLocal - grandTotalLocal / (1 + tva / 100)).toFixed(2)} €</span></div>
          ` : ""}
          <div class="t-row ttc"><span>Total TTC</span><span>${grandTotalLocal.toFixed(2)} €</span></div>
          <div class="t-row paid"><span>✓ Réglé · ${payLabel[payMethod] || payMethod}</span><span>${grandTotalLocal.toFixed(2)} €</span></div>
        </div>
      </div>
      <div class="footer"><span class="footer-txt">Merci pour votre confiance</span><span class="footer-ref">${invoiceId} · ${date}</span></div>
    </div>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / PDF</button>
    </body></html>`);
    win.document.close();
  };

  const validateAndSendEmail = async (emailOverride?: string) => {
    const recipient = emailOverride || clientEmail;
    if (!recipient) { setShowEmailPrompt(true); return; }
    setShowEmailPrompt(false);
    setEmailInput("");

    // Sauvegarder l'email saisi sur la fiche client
    if (emailOverride) {
      const clientId = selectedClient?.id || linkedRepair?.clients?.id;
      if (clientId) await supabase.from("clients").update({ email: emailOverride }).eq("id", clientId);
    }

    if (cartItems.length === 0 && !linkedRepair) { alert("Panier vide"); return; }
    const clientRequired = selectedClient || linkedRepair?.clients;
    if (!clientRequired) { alert("Client obligatoire"); return; }
    setIsProcessingSale(true);

    const cartSnapshot = [...cartItems];
    const repairSnapshot = linkedRepair;
    const clientForInvoice = selectedClient || (linkedRepair?.clients ? { id: linkedRepair.clients.id, name: linkedRepair.clients.name, phone: linkedRepair.clients.phone, email: linkedRepair.clients.email } : { name: clientSearch.trim() || "Vente directe" });
    const currentTva = tvaRate;
    const productsTotal = cartSnapshot.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0);
    const repairHt = repairSnapshot ? (repairSnapshot.final_price ?? repairSnapshot.estimated_price ?? 0) : 0;
    const repairTtc = repairHt * (1 + currentTva / 100);
    const invoiceTotal = productsTotal + repairTtc;

    const resolvedPayments = payments.map((p, i) => {
      if (!p.amount) {
        const autres = payments.reduce((s, x, j) => j !== i ? s + (parseFloat(x.amount) || 0) : s, 0);
        return { ...p, amount: Math.max(0, invoiceTotal - autres).toFixed(2) };
      }
      return p;
    });
    const totalResolu = resolvedPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    if (Math.abs(totalResolu - invoiceTotal) > 0.01) {
      const diff = invoiceTotal - totalResolu;
      setPaymentError(diff > 0 ? `Manque ${diff.toFixed(2)} €` : `Surplus de ${Math.abs(diff).toFixed(2)} €`);
      setIsProcessingSale(false);
      return;
    }

    const currentPayMethod = resolvedPayments.map((p) => resolvedPayments.length > 1 ? `${p.method} ${parseFloat(p.amount).toFixed(2)}€` : p.method).join(" + ") || "Espèces";

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const realUserId = authUser?.id || userId;
      if (!realUserId) { alert("Session expirée"); setIsProcessingSale(false); return; }

      const items: InvoiceItem[] = cartSnapshot.map((item) => ({ product_id: item.product.id, product_name: item.product.name, quantity: item.quantity, unit_price: Number(item.product.sale_price), total: Number(item.product.sale_price) * item.quantity }));
      const result = await createInvoice(realUserId, clientForInvoice, items, currentTva, currentPayMethod);
      if (!result.success) { alert("Erreur facture: " + result.error); setIsProcessingSale(false); return; }

      for (const item of cartSnapshot) {
        await supabase.from("product_sales").insert({ user_id: realUserId, product_id: item.product.id, product_name: item.product.name, quantity: item.quantity, unit_price: Number(item.product.sale_price), unit_cost: Number(item.product.purchase_price), total: Number(item.product.sale_price) * item.quantity, sold_by: soldBy, invoice_id: null, client_name: clientForInvoice.name, repair_id: repairSnapshot ? repairSnapshot.id : null });
        await supabase.from("products").update({ stock: item.product.stock - item.quantity }).eq("id", item.product.id);
      }
      if (repairSnapshot) {
        await supabase.from("repairs").update({ paid_amount: repairTtc, payment_status: "payé", payment_method: currentPayMethod, payment_date: new Date().toISOString(), status: "📦 Rendu" }).eq("id", repairSnapshot.id);
      }

      const { data: profile } = await supabase.from("profiles").select("company_name,contact_address,contact_phone,email").eq("user_id", realUserId).maybeSingle();
      const cp = { name: (profile?.company_name || "MBX").replace(/\s*réparations?\s*/i, "").trim() || "MBX", address: profile?.contact_address || "", phone: profile?.contact_phone || "", email: profile?.email || "" };
      const invoiceRef = result.invoiceId || `FACT-${Date.now().toString().slice(-6)}`;

      const repairsForEmail = repairSnapshot ? [{ id: repairSnapshot.id, device: repairSnapshot.device, issue: repairSnapshot.issue || "", priceHt: repairHt, tvaRate: currentTva, totalTtc: repairTtc }] : [];
      const productRows = cartSnapshot.map((i) => {
        const ttc = Number(i.product.sale_price) * i.quantity;
        const ht = currentTva > 0 ? ttc / (1 + currentTva / 100) : ttc;
        return { id: i.product.id, device: i.product.name, issue: `× ${i.quantity}`, priceHt: ht, tvaRate: currentTva, totalTtc: ttc };
      });
      const productsHt = cartSnapshot.reduce((s, i) => {
        const ttc = Number(i.product.sale_price) * i.quantity;
        return s + (currentTva > 0 ? ttc / (1 + currentTva / 100) : ttc);
      }, 0);

      await fetch("/api/send-invoice-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient, clientName: clientForInvoice.name, repairs: [...repairsForEmail, ...productRows], totalHt: productsHt + repairHt, totalTva: invoiceTotal - (productsHt + repairHt), totalTtc: invoiceTotal, totalRemaining: 0, invoiceRef, companyName: cp.name, companyAddress: cp.address, companyPhone: cp.phone, companyEmail: cp.email, trackingCode: linkedRepair?.clients?.client_code || "" }),
      });

      alert(`✅ Facture envoyée à ${recipient}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi");
    } finally {
      setIsProcessingSale(false);
    }
  };

  const validateSale = async () => {
    if (cartItems.length === 0 && !linkedRepair) { alert("Ajoutez des produits ou liez une réparation"); return; }
    const clientRequired = selectedClient || linkedRepair?.clients;
    if (!clientRequired) { setPaymentError("Client obligatoire"); return; }
    setIsProcessingSale(true);
    setPaymentError("");

    const cartSnapshot = [...cartItems];
    const repairSnapshot = linkedRepair;
    const clientForInvoice = selectedClient || (linkedRepair?.clients ? { id: linkedRepair.clients.id, name: linkedRepair.clients.name, phone: linkedRepair.clients.phone } : { name: clientSearch.trim() || "Vente directe" });
    const currentTva = tvaRate;
    const productsTotal = cartSnapshot.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0);
    const repairTotal = repairSnapshot ? (repairSnapshot.final_price ?? repairSnapshot.estimated_price ?? 0) * (1 + currentTva / 100) : 0;
    const invoiceTotal = productsTotal + repairTotal;

    const resolvedPayments = payments.map((p, i) => {
      if (!p.amount) {
        const autresSaisis = payments.reduce((s, x, j) => j !== i ? s + (parseFloat(x.amount) || 0) : s, 0);
        return { ...p, amount: Math.max(0, invoiceTotal - autresSaisis).toFixed(2) };
      }
      return p;
    });
    const totalResolu = resolvedPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    if (Math.abs(totalResolu - invoiceTotal) > 0.01) {
      const diff = invoiceTotal - totalResolu;
      setPaymentError(diff > 0 ? `Manque ${diff.toFixed(2)} €` : `Surplus de ${Math.abs(diff).toFixed(2)} €`);
      setIsProcessingSale(false);
      return;
    }

    const currentPayMethod = resolvedPayments.map((p) =>
      resolvedPayments.length > 1 ? `${p.method} ${parseFloat(p.amount).toFixed(2)}€` : p.method
    ).join(" + ") || "Espèces";

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const realUserId = authUser?.id || userId;
      if (!realUserId) { alert("Session expirée, reconnectez-vous."); setIsProcessingSale(false); return; }

      const items: InvoiceItem[] = cartSnapshot.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.product.sale_price),
        total: Number(item.product.sale_price) * item.quantity,
      }));

      const result = await createInvoice(realUserId, clientForInvoice, items, currentTva, currentPayMethod);
      if (!result.success) { alert("Erreur création facture: " + result.error); setIsProcessingSale(false); return; }

      for (const item of cartSnapshot) {
        await supabase.from("product_sales").insert({
          user_id: realUserId,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: Number(item.product.sale_price),
          unit_cost: Number(item.product.purchase_price),
          total: Number(item.product.sale_price) * item.quantity,
          sold_by: soldBy,
          invoice_id: null,
          client_name: clientForInvoice.name,
          repair_id: repairSnapshot ? repairSnapshot.id : null,
        });
        await supabase.from("products").update({ stock: item.product.stock - item.quantity }).eq("id", item.product.id);
      }

      if (repairSnapshot) {
        const priceHt = repairSnapshot.final_price ?? repairSnapshot.estimated_price ?? 0;
        await supabase.from("repairs").update({
          paid_amount: priceHt * (1 + currentTva / 100),
          payment_status: "payé",
          payment_method: currentPayMethod,
          payment_date: new Date().toISOString(),
          status: "📦 Rendu",
        }).eq("id", repairSnapshot.id);
      }

      // Mettre à jour les réparations extras (MBX-xxx dans le panier)
      for (const item of cartSnapshot) {
        const match = String(item.product.barcode || "").match(/^MBX-(\d+)$/i);
        if (match) {
          const repairId = Number(match[1]);
          const priceHt = Number(item.product.sale_price);
          await supabase.from("repairs").update({
            paid_amount: priceHt * (1 + currentTva / 100),
            payment_status: "payé",
            payment_method: currentPayMethod,
            payment_date: new Date().toISOString(),
            status: "📦 Rendu",
          }).eq("id", repairId);
        }
      }

      printCombinedInvoice(result.invoiceId || "", clientForInvoice, cartSnapshot, repairSnapshot, currentTva, currentPayMethod);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Erreur validation vente:", err);
      alert("Erreur lors de la validation de la vente");
    } finally {
      setIsProcessingSale(false);
    }
  };

  const rawEmail = selectedClient?.email || linkedRepair?.clients?.email || "";
  const clientEmail = rawEmail && rawEmail !== "NC" && rawEmail.includes("@") ? rawEmail : "";

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-[#16161d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-[#16161d] border-b border-white/10 px-5 py-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">🛒 Validation</h2>
            <button onClick={onClose} className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 text-sm">✕</button>
          </div>

          <div className="p-4 space-y-3">

            {/* 1. CLIENT */}
            <div>
              {(selectedClient || linkedRepair) ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <span className="text-sm text-green-300 flex-1 font-medium">
                    {linkedRepair ? linkedRepair.clients?.name : selectedClient?.name}
                    {(selectedClient?.phone && !linkedRepair) ? ` · ${selectedClient.phone}` : ""}
                  </span>
                  <button onClick={() => { setSelectedClient(null); setClientSearch(""); setShowNewClientForm(false); setLinkedRepair(null); }} className="text-xs text-red-400 hover:text-red-300">✕</button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2 items-center">
                    <input autoComplete="new-password"
                      type="text"
                      placeholder="Rechercher client *"
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); searchExistingClients(e.target.value); }}
                      className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pink-500/50"
                    />
                    <button onClick={() => { setShowNewClientForm((v) => !v); setNewClientForm({ name: "", phone: "", email: "" }); }} className="w-8 h-8 shrink-0 bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 rounded-xl text-lg font-bold border border-pink-500/20 flex items-center justify-center">+</button>
                  </div>
                  {clientSearchResults.length > 0 && (
                    <div className="mt-1 space-y-1 max-h-28 overflow-y-auto">
                      {clientSearchResults.map((c) => (
                        <div key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(c.name); setClientSearchResults([]); }} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-pink-500/10 rounded-lg cursor-pointer transition-colors">
                          <span className="text-sm text-white flex-1">{c.name}</span>
                          <span className="text-xs text-gray-500">{c.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {showNewClientForm && (
                    <div className="mt-2 space-y-2 p-3 bg-white/5 rounded-xl border border-white/10">
                      <input autoComplete="new-password" type="text" placeholder="Nom *" value={newClientForm.name} onChange={(e) => setNewClientForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-pink-500/50" />
                      <div className="flex gap-2">
                        <input autoComplete="new-password" type="text" placeholder="Téléphone" value={newClientForm.phone} onChange={(e) => setNewClientForm((f) => ({ ...f, phone: e.target.value }))} className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-pink-500/50" />
                        <input autoComplete="new-password" type="email" placeholder="Email" value={newClientForm.email} onChange={(e) => setNewClientForm((f) => ({ ...f, email: e.target.value }))} className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-pink-500/50" />
                      </div>
                      <button onClick={async () => {
                        if (!newClientForm.name.trim()) return;
                        const { data: authUser } = await supabase.auth.getUser();
                        const uid = authUser?.user?.id || userId;
                        const { data: nc } = await supabase.from("clients").insert({ name: newClientForm.name, phone: newClientForm.phone, email: newClientForm.email, user_id: uid }).select().single();
                        if (nc) { setSelectedClient({ id: nc.id, name: nc.name, phone: nc.phone, email: nc.email }); setClientSearch(nc.name); }
                        setShowNewClientForm(false);
                      }} className="w-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 py-1.5 rounded-lg text-sm border border-pink-500/20">Créer le client</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. RÉPARATION LIÉE + CHAMP PRODUIT */}
            <div className="space-y-2">
              {linkedRepair && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-indigo-400">MBX-{linkedRepair.id}</span>
                    <span className="text-sm text-white font-medium ml-2">{linkedRepair.device}</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-300 shrink-0">{repairTtc.toFixed(2)} €</span>
                  <button onClick={() => setLinkedRepair(null)} className="text-red-400 hover:text-red-300 text-xs shrink-0">✕</button>
                </div>
              )}
              {extraRepairItems.map((item, idx) => (
                <div key={idx} className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-indigo-400">{item.product.barcode}</span>
                    <span className="text-sm text-white font-medium ml-2">{item.product.name.replace(/^MBX-\d+ — /i, "")}</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-300 shrink-0">{Number(item.product.sale_price).toFixed(2)} €</span>
                  <button onClick={() => setCartItems((prev) => prev.filter((i) => i.product.id !== item.product.id))} className="text-red-400 hover:text-red-300 text-xs shrink-0">✕</button>
                </div>
              ))}
              <div>
                <div className="flex gap-2">
                  <input autoComplete="new-password"
                    type="text"
                    placeholder="Nom ou code-barres produit..."
                    value={modalProductSearch}
                    onChange={(e) => setModalProductSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" || !modalProductSearch.trim()) return;
                      const v = modalProductSearch.trim();
                      const byBarcode = products.find((pr) => pr.barcode === v);
                      if (byBarcode) { addToCartDirect(byBarcode); setModalProductSearch(""); return; }
                      if (modalFiltered.length > 0) { addToCartDirect(modalFiltered[0]); setModalProductSearch(""); return; }
                      alert("Produit introuvable : " + v);
                    }}
                    className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pink-500/50"
                  />
                  <button onClick={() => setShowModalProductScanner(true)} className="px-3 py-2 bg-pink-500/15 text-pink-300 rounded-xl text-xs border border-pink-500/20">📷</button>
                </div>
                {modalFiltered.length > 0 && (
                  <div className="mt-1 max-h-36 overflow-y-auto space-y-1">
                    {modalFiltered.slice(0, 6).map((p) => (
                      <div key={p.id} onClick={() => { addToCartDirect(p); setModalProductSearch(""); }} className="flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-pink-500/10 rounded-lg cursor-pointer transition-colors">
                        <span className="text-sm text-white truncate">{p.name}</span>
                        <span className="text-xs text-pink-300 shrink-0 ml-2">{Number(p.sale_price).toFixed(2)} € · stock {p.stock}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. PANIER */}
            {visibleCartItems.length > 0 && (
              <div className="space-y-1.5">
                {visibleCartItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-[#1a1d2e] rounded-xl">
                    <span className="flex-1 text-sm text-white truncate">{item.product.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setCartItems((prev) => prev.map((i, j) => i.product.id === item.product.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="w-6 h-6 bg-white/10 rounded text-gray-400 text-xs">−</button>
                      <span className="text-white text-sm w-5 text-center">{item.quantity}</span>
                      <button onClick={() => setCartItems((prev) => prev.map((i, j) => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))} className="w-6 h-6 bg-white/10 rounded text-gray-400 text-xs">+</button>
                    </div>
                    <span className="text-sm font-bold text-green-400 shrink-0 w-16 text-right">{(Number(item.product.sale_price) * item.quantity).toFixed(2)} €</span>
                    <button onClick={() => setCartItems((prev) => prev.filter((i) => i.product.id !== item.product.id))} className="text-red-400 hover:text-red-300 text-xs shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Paiement multi-méthodes */}
            <div className="space-y-2">
              {payments.map((p, i) => {
                const autresSaisis = payments.reduce((s, x, j) => j !== i ? s + (parseFloat(x.amount) || 0) : s, 0);
                const autoMontant = Math.max(0, grandTotal - autresSaisis);
                const methods = [
                  { key: "Carte", icon: "💳", label: "Carte" },
                  { key: "Espèces", icon: "💵", label: "Cash" },
                  { key: "Virement", icon: "🏦", label: "Virement" },
                  { key: "Chèque", icon: "📄", label: "Chèque" },
                ];
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {methods.map((m) => (
                        <button key={m.key} onClick={() => setPayments((prev) => prev.map((x, j) => j === i ? { ...x, method: m.key } : x))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${p.method === m.key ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#1a1d2e] border-white/10 text-gray-400 hover:text-white hover:border-white/20"}`}>
                          <span>{m.icon}</span>{m.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                    <input autoComplete="new-password"
                      type="number"
                      value={p.amount || (autoMontant > 0 ? autoMontant.toFixed(2) : "")}
                      onChange={(e) => { setPayments((prev) => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x)); setPaymentError(""); }}
                      className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pink-500/50"
                    />
                    <span className="text-gray-500 text-xs shrink-0">€</span>
                    {payments.length > 1 && (
                      <button onClick={() => setPayments((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs shrink-0">✕</button>
                    )}
                  </div>
                  </div>
                );
              })}
              {payments.length < 3 && (
                <button onClick={() => {
                  const lastMethod = payments[payments.length - 1]?.method;
                  const nextMethod = lastMethod === "Carte" ? "Espèces" : "Espèces";
                  setPayments((prev) => [...prev, { method: nextMethod, amount: "" }]);
                }} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  + Ajouter un moyen de paiement
                </button>
              )}
            </div>

            {/* Récap total + TVA */}
            <div className="bg-white/5 border border-white/8 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/8">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-sm text-gray-400 shrink-0">{linkedRepair ? `Réparations (${extraRepairItems.length + 1})` : "TVA"}</span>
                    <span className="text-xs text-gray-500 shrink-0">TVA :</span>
                    <div className="flex rounded-lg overflow-hidden border border-white/10 shrink-0">
                      <button onClick={() => setTvaRate(0)} className={`px-2.5 py-1 text-xs font-semibold transition-all ${tvaRate === 0 ? "bg-indigo-600 text-white" : "bg-[#1a1d2e] text-gray-500 hover:text-gray-300"}`}>0%</button>
                      <button onClick={() => setTvaRate(20)} className={`px-2.5 py-1 text-xs font-semibold transition-all ${tvaRate === 20 ? "bg-indigo-600 text-white" : "bg-[#1a1d2e] text-gray-500 hover:text-gray-300"}`}>20%</button>
                    </div>
                  </div>
                  {linkedRepair && <span className="text-sm font-bold text-indigo-300 shrink-0">{(repairTtc + extraRepairsTtc).toFixed(2)} €</span>}
                </div>
              {visibleCartItems.length > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Produits ({visibleCartItems.reduce((s, i) => s + i.quantity, 0)} art.)</span>
                  <span>{productsTtc.toFixed(2)} €</span>
                </div>
              )}
              {(() => {
                const totalSaisi = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                const resteAPayer = grandTotal - totalSaisi;
                return (
                  <>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-gray-300 font-semibold">Total à encaisser</span>
                      <span className="text-pink-400 text-2xl font-black">{grandTotal.toFixed(2)} €</span>
                    </div>
                    {totalSaisi > 0 && Math.abs(resteAPayer) > 0.005 && (
                      <div className={`flex justify-between items-center text-sm font-semibold ${resteAPayer > 0 ? "text-amber-400" : "text-green-400"}`}>
                        <span>{resteAPayer > 0 ? "Reste à saisir" : "Surplus"}</span>
                        <span>{Math.abs(resteAPayer).toFixed(2)} €</span>
                      </div>
                    )}
                    {totalSaisi > 0 && Math.abs(resteAPayer) <= 0.005 && (
                      <div className="flex justify-between items-center text-sm text-green-400 font-semibold">
                        <span>✓ Paiement complet</span>
                        <span>{totalSaisi.toFixed(2)} €</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {paymentError && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-semibold">
                ⚠️ {paymentError}
              </div>
            )}

            {showEmailPrompt && (
              <div className="flex gap-2 mb-2">
                <input autoComplete="new-password"
                  type="email"
                  placeholder="Email du client..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && emailInput.trim()) validateAndSendEmail(emailInput.trim()); if (e.key === "Escape") setShowEmailPrompt(false); }}
                  className="flex-1 bg-black/30 border border-sky-500/30 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-sky-500/60"
                  autoFocus
                />
                <button onClick={() => { if (emailInput.trim()) validateAndSendEmail(emailInput.trim()); }} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold transition">Envoyer</button>
                <button onClick={() => setShowEmailPrompt(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition"><X size={14} className="text-gray-400" /></button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={validateSale}
                disabled={(visibleCartItems.length === 0 && !linkedRepair) || isProcessingSale}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              >
                {isProcessingSale ? "⏳..." : "✅ Valider · 🖨️ Imprimer"}
              </button>
              <button
                onClick={() => validateAndSendEmail()}
                disabled={isProcessingSale}
                className="px-4 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 py-3 rounded-xl text-sm border border-sky-500/20 transition-all disabled:opacity-50"
                title="Valider et envoyer par email"
              ><SendHorizonal size={15} /></button>
              <button onClick={onClose} className="px-4 bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl text-sm">Annuler</button>
            </div>
          </div>
        </div>
      </div>

      {(showRepairScanner || showModalProductScanner) && (
        <QrScanner
          onScan={(code) => {
            setShowRepairScanner(false);
            setShowModalProductScanner(false);
            if (!code) return;
            if (/^MBX-\d+$/i.test(code.trim())) { fetchRepairByCode(code.trim()); return; }
            if (/^(MBX-\d+,?)+$/i.test(code.trim())) {
              const ids = code.trim().split(",").map((c) => Number(c.replace(/^MBX-/i, "").trim())).filter(Boolean);
              supabase.from("repairs").select("*,clients(id,name,phone,email)").in("id", ids).eq("user_id", userId).then(({ data }) => {
                if (!data?.length) { alert("Réparations introuvables"); return; }
                setLinkedRepair(data[0]);
                if (data.length > 1) {
                  const extra = data.slice(1).map((r) => ({ product: { id: r.id, name: `MBX-${r.id} — ${r.device}`, sale_price: r.final_price ?? r.estimated_price ?? 0, stock: 1, barcode: `MBX-${r.id}` } as any, quantity: 1 }));
                  setCartItems((prev) => [...prev, ...extra]);
                }
              });
              return;
            }
            const p = products.find((pr) => pr.barcode === code.trim());
            if (p) addToCartDirect(p);
            else alert("Produit introuvable : " + code);
          }}
          onClose={() => { setShowRepairScanner(false); setShowModalProductScanner(false); }}
          label="Scanner réparation ou produit"
        />
      )}
    </>
  );
}
