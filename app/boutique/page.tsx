"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { getCurrentTechnician } from "../../lib/historique";
import { Store, Plus, Trash2, ShoppingCart, ScanLine, X, Check } from "lucide-react";
import QrScanner from "../../components/QrScanner";
import { createInvoice, type InvoiceItem } from "../../lib/invoices";

const CATEGORIES = [
  "Téléphone",
  "Coque",
  "Vitre / Verre trempé",
  "Chargeur",
  "Câble",
  "Écouteurs / Casque",
  "Batterie externe",
  "Pièce détachée",
  "Carte SIM",
  "Accessoire",
  "Autre",
];

interface Product {
  id: number;
  user_id: string;
  name: string;
  category: string;
  stock: number;
  purchase_price: number;
  sale_price: number;
  barcode: string;
  imei: string;
  created_at?: string;
}

interface Sale {
  id: number;
  user_id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total: number;
  sold_by: string;
  sold_at: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ClientSearchResult {
  id: number;
  name: string;
  phone: string;
  email: string;
}

export default function BoutiquePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"stock" | "ventes">("stock");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGerant, setIsGerant] = useState(false);
  const [techName, setTechName] = useState("");
  const [userId, setUserId] = useState<string>("");

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    stock: "",
    purchase_price: "",
    sale_price: "",
    barcode: "",
    imei: "",
  });
  const [scanMode, setScanMode] = useState<null | "form">(null);

  const [manualBarcode, setManualBarcode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id?: number; name: string; phone?: string; email?: string } | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<ClientSearchResult[]>([]);
  const [tvaRate, setTvaRate] = useState(0);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [linkedRepair, setLinkedRepair] = useState<any>(null);
  const [repairCodeInput, setRepairCodeInput] = useState("");
  const [showRepairScanner, setShowRepairScanner] = useState(false);
  const [salePaymentMethod, setSalePaymentMethod] = useState("Espèces");

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.push("/login"); return; }
      setUserId(user.id);
      const [pRes, sRes] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id).order("name", { ascending: true }),
        supabase.from("product_sales").select("*").eq("user_id", user.id).order("sold_at", { ascending: false }).limit(200),
      ]);
      if (pRes.error) throw pRes.error;
      if (sRes.error) throw sRes.error;
      setProducts(pRes.data || []);
      setSales(sRes.data || []);
    } catch (e) {
      console.error("boutique load:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const t = getCurrentTechnician();
      setIsGerant(t?.is_gerant === true);
      setTechName(t?.name || "");
      await load();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addProduct = async () => {
    if (!form.name.trim()) { alert("Le nom du produit est requis."); return; }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { alert("Vous devez être connecté pour ajouter un produit."); return; }
    const { error } = await supabase.from("products").insert({
      user_id: user.id,
      name: form.name.trim(),
      category: form.category.trim() || null,
      stock: Number(form.stock) || 0,
      purchase_price: Number(form.purchase_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      barcode: form.barcode.trim() || null,
      imei: form.imei.trim() || null,
    });
    if (error) { alert("Erreur enregistrement : " + (error.message || JSON.stringify(error))); return; }
    setForm({ name: "", category: "", stock: "", purchase_price: "", sale_price: "", barcode: "", imei: "" });
    setShowAdd(false);
    await load();
  };

  const searchExistingClients = async (search: string) => {
    if (!search.trim() || !userId) { setClientSearchResults([]); return; }
    const { data } = await supabase
      .from("clients")
      .select("id, name, phone, email")
      .eq("user_id", userId)
      .ilike("name", `%${search}%`)
      .limit(10);
    setClientSearchResults(data || []);
  };

  const fetchRepairByCode = async (code: string) => {
    const repairId = code.replace(/^MBX-/i, "").trim();
    if (!repairId || isNaN(Number(repairId))) { alert("Code invalide (ex: MBX-42)"); return; }
    const { data, error } = await supabase
      .from("repairs")
      .select("*, clients(*)")
      .eq("id", Number(repairId))
      .eq("user_id", userId)
      .single();
    if (error || !data) { alert("Réparation introuvable"); return; }
    setLinkedRepair(data);
    if (!selectedClient && data.clients) {
      setSelectedClient({ id: data.clients.id, name: data.clients.name, phone: data.clients.phone, email: data.clients.email });
      setClientSearch(data.clients.name);
    }
    setRepairCodeInput("");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const printCombinedBoutiqueInvoice = (invoiceId: string, client: { name: string }, cart: CartItem[], repair: any, tva: number, payMethod: string) => {
    const win = window.open("", "_blank", "height=900,width=1000");
    if (!win) return;
    const date = new Date().toLocaleDateString("fr-FR");
    const productsHt = cart.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0);
    const productsTtc = productsHt * (1 + tva / 100);
    const repairHt = repair ? (repair.final_price ?? repair.estimated_price ?? 0) : 0;
    const repairTtaRate = repair ? (repair.tva_rate ?? 0) : 0;
    const repairTtc = repairHt * (1 + repairTtaRate / 100);
    const grandTotal = productsTtc + repairTtc;
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
            ${repair ? `<tr><td><span style="font-family:monospace;font-size:11px;color:#6366f1;background:#eef2ff;padding:3px 8px;border-radius:4px">MBX-${repair.id}</span>&nbsp;&nbsp;<strong>${repair.device}</strong><div style="font-size:11.5px;color:#94a3b8">${repair.issue || ""}</div></td><td class="r">1</td><td class="r">${repairHt.toFixed(2)} €</td><td class="r" style="font-weight:600">${repairTtc.toFixed(2)} €</td></tr>` : ""}
            ${cart.map(i => `<tr><td><span style="font-family:monospace;font-size:11px;color:#a855f7;background:#faf5ff;padding:3px 8px;border-radius:4px">🛍️</span>&nbsp;&nbsp;<strong>${i.product.name}</strong></td><td class="r">${i.quantity}</td><td class="r">${Number(i.product.sale_price).toFixed(2)} €</td><td class="r" style="font-weight:600">${(Number(i.product.sale_price) * i.quantity * (1 + tva / 100)).toFixed(2)} €</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="bottom-wrap">
        <div class="totals">
          <div class="t-row ttc"><span>Total TTC</span><span>${grandTotal.toFixed(2)} €</span></div>
          <div class="t-row paid"><span>✓ Réglé · ${payLabel[payMethod] || payMethod}</span><span>${grandTotal.toFixed(2)} €</span></div>
        </div>
      </div>
      <div class="footer"><span class="footer-txt">Merci pour votre confiance</span><span class="footer-ref">${invoiceId} · ${date}</span></div>
    </div>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / PDF</button>
    </body></html>`);
    win.document.close();
  };

  const validateSaleWithInvoice = async () => {
    if (cartItems.length === 0 && !linkedRepair) { alert("Ajoutez des produits ou liez une réparation"); return; }
    setIsProcessingSale(true);
    const cartSnapshot = [...cartItems];
    const repairSnapshot = linkedRepair;
    const clientForInvoice = selectedClient || { name: "Vente directe" };
    const currentTva = tvaRate;
    const currentPayMethod = salePaymentMethod;
    try {
      const items: InvoiceItem[] = cartSnapshot.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.product.sale_price),
        total: Number(item.product.sale_price) * item.quantity,
      }));

      const result = await createInvoice(userId, clientForInvoice, items, currentTva, currentPayMethod);
      if (!result.success) { alert("Erreur création facture: " + result.error); return; }

      for (const item of cartSnapshot) {
        const unitPrice = Number(item.product.sale_price);
        const unitCost = Number(item.product.purchase_price);
        await supabase.from("product_sales").insert({
          user_id: userId,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          unit_cost: unitCost,
          total: unitPrice * item.quantity,
          sold_by: techName || "Boutique",
          invoice_id: result.invoiceId,
          client_name: clientForInvoice.name,
        });
        await supabase.from("products").update({ stock: item.product.stock - item.quantity }).eq("id", item.product.id);
      }

      // Marquer la réparation liée comme payée
      if (repairSnapshot) {
        const paidAt = new Date().toISOString();
        const priceHt = repairSnapshot.final_price ?? repairSnapshot.estimated_price ?? 0;
        const repairTtc = priceHt * (1 + (repairSnapshot.tva_rate ?? 0) / 100);
        await supabase.from("repairs").update({
          paid_amount: repairTtc,
          payment_status: "payé",
          payment_method: currentPayMethod,
          payment_date: paidAt,
          status: "📦 Rendu",
        }).eq("id", repairSnapshot.id);
      }

      printCombinedBoutiqueInvoice(result.invoiceId || "", clientForInvoice, cartSnapshot, repairSnapshot, currentTva, currentPayMethod);

      setCartItems([]);
      setSelectedClient(null);
      setClientSearch("");
      setClientSearchResults([]);
      setLinkedRepair(null);
      setRepairCodeInput("");
      setShowClientModal(false);
      await load();
    } catch (err) {
      console.error("Erreur validation vente:", err);
      alert("Erreur lors de la validation de la vente");
    } finally {
      setIsProcessingSale(false);
    }
  };

  const searchProductByBarcode = async (barcode: string) => {
    if (!barcode.trim() || !userId) return;
    // Si le code scanné est un code réparation MBX-xxx → lier la réparation
    if (/^MBX-\d+$/i.test(barcode.trim())) {
      await fetchRepairByCode(barcode.trim());
      setShowClientModal(true);
      return;
    }
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .eq("barcode", barcode.trim())
      .single();
    if (error || !data) {
      alert(`Produit introuvable : ${barcode}`);
      setScannedProduct(null);
    } else {
      setScannedProduct(data as Product);
      setSaleQuantity("1");
    }
  };

  const addToCart = () => {
    if (!scannedProduct) return;
    const qty = Math.max(1, Number(saleQuantity) || 1);
    if (qty > scannedProduct.stock) { alert(`Stock insuffisant (${scannedProduct.stock} disponible)`); return; }
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === scannedProduct.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > scannedProduct.stock) { alert(`Stock insuffisant (${scannedProduct.stock} disponible)`); return prev; }
        return prev.map((item) => item.product.id === scannedProduct.id ? { ...item, quantity: newQty } : item);
      }
      return [...prev, { product: scannedProduct, quantity: qty }];
    });
    setScannedProduct(null);
    setSaleQuantity("1");
    setManualBarcode("");
  };

  const handleManualBarcodeSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && manualBarcode.trim()) {
      searchProductByBarcode(manualBarcode);
      setManualBarcode("");
      setShowManualInput(false);
    }
  };

  const updateField = (id: number, field: keyof Product, value: number) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const saveField = async (id: number, field: string, value: number) => {
    const { error } = await supabase.from("products").update({ [field]: value }).eq("id", id);
    if (error) console.error("saveField error:", error);
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) console.error("deleteProduct error:", error);
    await load();
  };

  const totalSales = sales.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const totalProfit = sales.reduce((s, v) => s + ((Number(v.unit_price) || 0) - (Number(v.unit_cost) || 0)) * (Number(v.quantity) || 0), 0);

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Store size={18} className="text-pink-400" />
            Boutique
          </h1>
          {tab === "stock" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="flex items-center gap-2 px-4 py-2 bg-[#16161d] border border-white/10 text-gray-200 hover:border-pink-500/40 rounded-xl text-sm font-bold transition active:scale-95"
              >
                <ScanLine size={16} /> Code-barres
              </button>
              {isGerant && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-400 text-white rounded-xl text-sm font-bold transition active:scale-95"
                >
                  <Plus size={16} /> Produit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Saisie manuelle code-barres */}
        {showManualInput && tab === "stock" && (
          <div className="mb-4 p-3 bg-[#16161d] border border-white/10 rounded-xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Saisir un code-barres..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={handleManualBarcodeSubmit}
                className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50"
                autoFocus
              />
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="px-4 py-2.5 bg-pink-500/15 border border-pink-500/30 text-pink-300 rounded-xl hover:bg-pink-500/25 transition flex items-center gap-2 text-sm font-medium"
              >
                <ScanLine size={16} /> Scanner
              </button>
              <button
                onClick={() => { setShowManualInput(false); setManualBarcode(""); }}
                className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">💡 Saisissez un code-barres et appuyez sur Entrée</p>
          </div>
        )}

        {/* Bandeau Vente Rapide */}
        <div className="mb-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Vente rapide</h2>
                <p className="text-xs text-gray-400">Scanner un code-barres pour vendre</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <ScanLine size={16} /> Scanner
              </button>
              {cartItems.length > 0 && (
                <button
                  onClick={() => { setShowClientModal(true); searchExistingClients(""); }}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  <ShoppingCart size={16} />
                  Panier ({cartItems.reduce((s, i) => s + i.quantity, 0)})
                </button>
              )}
            </div>
          </div>

          {/* Produit scanné */}
          {scannedProduct && (
            <div className="mt-4 p-4 bg-[#1a1d2e] rounded-xl border border-green-500/30">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="font-bold text-white">{scannedProduct.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Prix : {Number(scannedProduct.sale_price).toFixed(2)} € · Stock : {scannedProduct.stock}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Qté :</label>
                    <input
                      type="number"
                      min={1}
                      max={scannedProduct.stock}
                      value={saleQuantity}
                      onChange={(e) => setSaleQuantity(e.target.value)}
                      className="w-16 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-center text-sm outline-none focus:border-green-500/50"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-sm font-bold text-green-400">
                      {(Number(scannedProduct.sale_price) * (Number(saleQuantity) || 1)).toFixed(2)} €
                    </div>
                  </div>
                  <button
                    onClick={addToCart}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                  >
                    <ShoppingCart size={14} /> Ajouter
                  </button>
                  <button onClick={() => setScannedProduct(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("stock")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === "stock" ? "bg-pink-500/15 text-pink-300 border border-pink-500/30" : "bg-[#16161d] text-gray-400 border border-white/8"}`}>📦 Stock</button>
          <button onClick={() => setTab("ventes")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === "ventes" ? "bg-pink-500/15 text-pink-300 border border-pink-500/30" : "bg-[#16161d] text-gray-400 border border-white/8"}`}>🧾 Ventes</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" /></div>
        ) : tab === "stock" ? (
          products.length === 0 ? (
            <div className="text-center text-gray-600 py-16 bg-[#16161d] border border-white/5 rounded-2xl text-sm">Aucun produit. Ajoutez-en avec le bouton « Produit ».</div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => {
                const margin = (Number(p.sale_price) || 0) - (Number(p.purchase_price) || 0);
                return (
                  <div key={p.id} className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.category || "—"}</div>
                        {p.barcode && <div className="text-[10px] text-gray-600 font-mono mt-0.5">▮▮ {p.barcode}</div>}
                        {p.imei && <div className="text-[10px] text-gray-600 font-mono">IMEI {p.imei}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold ${p.stock <= 0 ? "text-red-400" : p.stock <= 3 ? "text-amber-400" : "text-white"}`}>{p.stock} en stock</div>
                        <div className="text-xs text-gray-500">Vente : {Number(p.sale_price).toFixed(2)} €</div>
                      </div>
                    </div>
                    {isGerant && (
                      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
                        <label className="flex items-center gap-1.5">Stock
                          <input type="number" value={p.stock} onChange={(e) => updateField(p.id, "stock", Number(e.target.value))} onBlur={(e) => saveField(p.id, "stock", Number(e.target.value))} className="w-16 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-right outline-none focus:border-pink-500/50" />
                        </label>
                        <label className="flex items-center gap-1.5">Achat €
                          <input type="number" value={p.purchase_price} onChange={(e) => updateField(p.id, "purchase_price", Number(e.target.value))} onBlur={(e) => saveField(p.id, "purchase_price", Number(e.target.value))} className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-right outline-none focus:border-pink-500/50" />
                        </label>
                        <label className="flex items-center gap-1.5">Vente €
                          <input type="number" value={p.sale_price} onChange={(e) => updateField(p.id, "sale_price", Number(e.target.value))} onBlur={(e) => saveField(p.id, "sale_price", Number(e.target.value))} className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-right outline-none focus:border-pink-500/50" />
                        </label>
                        <span className={`font-semibold ${margin >= 0 ? "text-green-400" : "text-red-400"}`}>Marge {margin.toFixed(2)} €</span>
                        <button onClick={() => deleteProduct(p.id)} className="ml-auto text-red-400 hover:text-red-300"><Trash2 size={15} /></button>
                      </div>
                    )}
                    <button
                      onClick={() => { setScannedProduct(p); setSaleQuantity("1"); }}
                      disabled={p.stock <= 0}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white py-2 rounded-xl text-sm font-semibold transition"
                    >
                      <ShoppingCart size={15} /> {p.stock <= 0 ? "Rupture" : "Vendre"}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div>
            <div className={`grid ${isGerant ? "grid-cols-2" : "grid-cols-1"} gap-3 mb-4`}>
              <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total ventes</div>
                <div className="text-2xl font-black text-white mt-1">{totalSales.toFixed(0)} €</div>
              </div>
              {isGerant && (
                <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Bénéfice</div>
                  <div className="text-2xl font-black text-green-400 mt-1">{totalProfit.toFixed(0)} €</div>
                </div>
              )}
            </div>
            {sales.length === 0 ? (
              <div className="text-center text-gray-600 py-16 bg-[#16161d] border border-white/5 rounded-2xl text-sm">Aucune vente</div>
            ) : (
              <div className="space-y-2">
                {sales.map((s) => (
                  <div key={s.id} className="bg-[#16161d] border border-white/8 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{s.product_name} {s.quantity > 1 ? `× ${s.quantity}` : ""}</div>
                      <div className="text-xs text-gray-500">{new Date(s.sold_at).toLocaleString("fr-FR")}{s.sold_by ? ` · ${s.sold_by}` : ""}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-green-400">{Number(s.total).toFixed(2)} €</div>
                      {isGerant && <div className="text-[10px] text-gray-500">marge {(((Number(s.unit_price) || 0) - (Number(s.unit_cost) || 0)) * (Number(s.quantity) || 0)).toFixed(2)} €</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL AJOUT PRODUIT */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-[#16161d] border border-white/10 rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">➕ Nouveau produit</h2>
            <div className="space-y-3">
              <input placeholder="Nom du produit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50">
                <option value="">— Catégorie —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-2">
                <input placeholder="Code-barres" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
                <button type="button" onClick={() => setScanMode("form")} className="px-3 bg-pink-500/15 border border-pink-500/30 text-pink-300 rounded-xl hover:bg-pink-500/25 transition flex items-center gap-1.5 text-sm">
                  <ScanLine size={16} /> Scan
                </button>
              </div>
              {form.category === "Téléphone" && (
                <input placeholder="IMEI (téléphone)" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
              )}
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
                <input type="number" placeholder="Achat €" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
                <input type="number" placeholder="Vente €" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
              </div>
            </div>
            <button onClick={addProduct} className="w-full mt-4 bg-pink-500 hover:bg-pink-400 text-white py-2.5 rounded-xl font-semibold text-sm transition">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="w-full mt-2 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-sm border border-white/10 transition">Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL PANIER + CLIENT */}
      {showClientModal && (() => {
        const productsHt = cartItems.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0);
        const productsTtc = productsHt * (1 + tvaRate / 100);
        const repairHt = linkedRepair ? (linkedRepair.final_price ?? linkedRepair.estimated_price ?? 0) : 0;
        const repairTtc = repairHt * (1 + (linkedRepair?.tva_rate ?? 0) / 100);
        const grandTotal = productsTtc + repairTtc;
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#16161d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-[#16161d] border-b border-white/10 px-5 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-tight">🛒 Validation de la vente</h2>
                <button onClick={() => setShowClientModal(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">

                {/* Lier à une réparation */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">🔗 Réparation à inclure (optionnel)</label>
                  {linkedRepair ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">MBX-{linkedRepair.id} · {linkedRepair.device}</div>
                        <div className="text-xs text-gray-400">{linkedRepair.issue} · {repairTtc.toFixed(2)} €</div>
                        {linkedRepair.clients && <div className="text-xs text-indigo-300 mt-0.5">Client : {linkedRepair.clients.name}</div>}
                      </div>
                      <button onClick={() => setLinkedRepair(null)} className="text-red-400 hover:text-red-300 text-xs ml-3">✕ Retirer</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="MBX-42 ou scanner..."
                        value={repairCodeInput}
                        onChange={(e) => setRepairCodeInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchRepairByCode(repairCodeInput)}
                        className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50"
                      />
                      <button onClick={() => fetchRepairByCode(repairCodeInput)} className="px-3 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-xl text-sm border border-indigo-500/20 transition">OK</button>
                      <button onClick={() => setShowRepairScanner(true)} className="px-3 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-xl text-sm border border-indigo-500/20 transition">📷</button>
                    </div>
                  )}
                </div>

                {/* Client */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Client <span className="text-gray-600 normal-case font-normal">(optionnel — sans sélection = Vente directe)</span></label>
                  <input
                    type="text"
                    placeholder="Rechercher un client existant..."
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); searchExistingClients(e.target.value); }}
                    className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50"
                  />
                  {clientSearchResults.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {clientSearchResults.map((client) => (
                        <div key={client.id} onClick={() => { setSelectedClient(client); setClientSearch(client.name); setClientSearchResults([]); }} className="p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                          <div className="font-medium text-white text-sm">{client.name}</div>
                          <div className="text-xs text-gray-500">{client.phone} {client.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      const name = prompt("Nom du nouveau client :");
                      if (name) { const phone = prompt("Téléphone :") || ""; const email = prompt("Email :") || ""; setSelectedClient({ name, phone, email }); setClientSearch(name); }
                    }}
                    className="mt-2 text-xs text-pink-400 hover:text-pink-300"
                  >+ Nouveau client</button>
                  {selectedClient && (
                    <div className="mt-2 bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white text-sm">{selectedClient.name}</div>
                        {(selectedClient.phone || selectedClient.email) && <div className="text-xs text-gray-400">{selectedClient.phone} {selectedClient.email}</div>}
                      </div>
                      <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="text-xs text-red-400 hover:text-red-300">Modifier</button>
                    </div>
                  )}
                </div>

                {/* Mode de paiement */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Mode de paiement</label>
                    <select value={salePaymentMethod} onChange={(e) => setSalePaymentMethod(e.target.value)} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50">
                      <option>Espèces</option>
                      <option>Carte Bancaire</option>
                      <option>Virement</option>
                      <option>Chèque</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">TVA</label>
                    <select value={tvaRate} onChange={(e) => setTvaRate(Number(e.target.value))} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50">
                      <option value={0}>0%</option>
                      <option value={20}>20%</option>
                    </select>
                  </div>
                </div>

                {/* Panier */}
                {cartItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">🛍️ Produits</h3>
                    <div className="space-y-2">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1d2e] rounded-xl">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{item.product.name}</div>
                            <div className="text-xs text-gray-500">{item.quantity} × {Number(item.product.sale_price).toFixed(2)} €</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-green-400">{(Number(item.product.sale_price) * item.quantity).toFixed(2)} €</div>
                            <button onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-300">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="bg-white/5 rounded-xl px-4 py-3">
                  {linkedRepair && <div className="flex justify-between text-sm text-gray-400 mb-1"><span>🔧 Réparation MBX-{linkedRepair.id}</span><span>{repairTtc.toFixed(2)} €</span></div>}
                  {cartItems.length > 0 && <div className="flex justify-between text-sm text-gray-400 mb-1"><span>🛍️ Produits ({cartItems.length})</span><span>{productsTtc.toFixed(2)} €</span></div>}
                  <div className="flex justify-between font-bold border-t border-white/10 pt-2 mt-1">
                    <span className="text-white">Total à encaisser</span>
                    <span className="text-pink-400 text-lg">{grandTotal.toFixed(2)} €</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={validateSaleWithInvoice}
                    disabled={(cartItems.length === 0 && !linkedRepair) || isProcessingSale}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    {isProcessingSale ? "⏳ Traitement..." : "✅ Valider · 🖨️ Imprimer"}
                  </button>
                  <button onClick={() => setShowClientModal(false)} className="px-5 bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl transition-all">Annuler</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SCANNER formulaire ajout produit */}
      {scanMode && (
        <QrScanner
          onScan={(code) => { setScanMode(null); if (code) setForm((f) => ({ ...f, barcode: code })); }}
          onClose={() => setScanMode(null)}
          label="Scanner un code-barres"
        />
      )}

      {/* SCANNER vente */}
      {showBarcodeScanner && (
        <QrScanner
          onScan={(code) => { setShowBarcodeScanner(false); if (code) searchProductByBarcode(code); }}
          onClose={() => setShowBarcodeScanner(false)}
          label="Scanner un code-barres"
        />
      )}

      {/* SCANNER réparation (depuis modal panier) */}
      {showRepairScanner && (
        <QrScanner
          onScan={(code) => { setShowRepairScanner(false); if (code) fetchRepairByCode(code); }}
          onClose={() => setShowRepairScanner(false)}
          label="Scanner le QR code de la réparation"
        />
      )}
    </Layout>
  );
}
