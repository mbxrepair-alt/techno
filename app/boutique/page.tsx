"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { getCurrentTechnician } from "../../lib/historique";
import { Package, Plus, Trash2, ShoppingCart, ScanLine, X, Check, AlertTriangle, Download, Minus } from "lucide-react";
import QrScanner from "../../components/QrScanner";
import { createInvoice, type InvoiceItem } from "../../lib/invoices";
import CartValidationModal from "../../components/CartValidationModal";

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
  low_stock_threshold?: number | null;
  supplier?: string | null;
  created_at?: string;
}

const DEFAULT_LOW_STOCK = 5;
const lowThreshold = (p: { low_stock_threshold?: number | null }) =>
  p.low_stock_threshold != null && p.low_stock_threshold > 0 ? p.low_stock_threshold : DEFAULT_LOW_STOCK;

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
  const [productSearch, setProductSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "stock_asc" | "margin_desc" | "value_desc">("name");
  const [filterCat, setFilterCat] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
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
  const [outOfStockProduct, setOutOfStockProduct] = useState<Product | null>(null);
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
  const [modalProductSearch, setModalProductSearch] = useState("");
  const [showModalProductScanner, setShowModalProductScanner] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: "", phone: "", email: "" });
  const [techniciens, setTechniciens] = useState<{ id: number; name: string }[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>("");
  const [payments, setPayments] = useState<{ method: string; amount: string }[]>([{ method: "Carte", amount: "" }]);
  const [paymentError, setPaymentError] = useState<string>("");
  const [barcodeConflict, setBarcodeConflict] = useState<{ id: number; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) { router.push("/login"); return; }
      setUserId(companyId);
      const [pRes, sRes] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", companyId).order("name", { ascending: true }),
        supabase.from("product_sales").select("*").eq("user_id", companyId).order("sold_at", { ascending: false }).limit(200),
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
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) { router.push("/login"); return; }
      const t = getCurrentTechnician();
      setIsGerant(t?.is_gerant === true);
      setTechName(t?.name || "");
      setSelectedTech("");
      const { data: techs } = await supabase.from("technicians").select("id, name").eq("user_id", companyId);
      if (techs) setTechniciens(techs);
      await load();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addProduct = async () => {
    if (!form.name.trim()) { alert("Le nom du produit est requis."); return; }
    const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
    if (!companyId) { alert("Session expirée, veuillez vous reconnecter."); return; }
    // Vérifier doublon code-barres
    if (form.barcode.trim()) {
      const { data: existing } = await supabase.from("products").select("id, name").eq("user_id", companyId).eq("barcode", form.barcode.trim()).maybeSingle();
      if (existing) { setBarcodeConflict(existing); return; }
    }
    const { error } = await supabase.from("products").insert({
      user_id: companyId,
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
    // Produits : sale_price déjà TTC, TVA toggle s'applique uniquement à la réparation
    const productsTtc = cart.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0);
    const repairHt = repair ? (repair.final_price ?? repair.estimated_price ?? 0) : 0;
    const repairTtc = repairHt * (1 + tva / 100);
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
            ${cart.map(i => { const ttc = Number(i.product.sale_price) * i.quantity; const puHt = tva > 0 ? Number(i.product.sale_price) / (1 + tva / 100) : Number(i.product.sale_price); return `<tr><td><span style="font-family:monospace;font-size:11px;color:#a855f7;background:#faf5ff;padding:3px 8px;border-radius:4px">🛍️</span>&nbsp;&nbsp;<strong>${i.product.name}</strong></td><td class="r">${i.quantity}</td><td class="r">${puHt.toFixed(2)} €</td><td class="r" style="font-weight:600">${ttc.toFixed(2)} €</td></tr>`; }).join("")}
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
    const clientRequired = selectedClient || linkedRepair?.clients;
    if (!clientRequired) { setPaymentError("Client obligatoire"); setIsProcessingSale(false); return; }
    setIsProcessingSale(true);
    const cartSnapshot = [...cartItems];
    const repairSnapshot = linkedRepair;
    const clientForInvoice = selectedClient || (linkedRepair?.clients ? { id: linkedRepair.clients.id, name: linkedRepair.clients.name, phone: linkedRepair.clients.phone } : { name: clientSearch || "Client" });
    const currentTva = tvaRate;
    // Calcul grand total ici pour valider les paiements
    const productsTotal = cartSnapshot.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0);
    const repairTotal = repairSnapshot ? (repairSnapshot.final_price ?? repairSnapshot.estimated_price ?? 0) * (1 + currentTva / 100) : 0;
    const invoiceTotal = productsTotal + repairTotal;
    // Distribuer le reste sur les lignes sans montant
    const totalSaisi = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const reste = Math.max(0, invoiceTotal - totalSaisi);
    const resolvedPayments = payments.map((p, i) => {
      if (!p.amount) {
        // Première ligne vide = tout le reste (ou reste après les autres)
        const autresSaisis = payments.reduce((s, x, j) => j !== i ? s + (parseFloat(x.amount) || 0) : s, 0);
        const montant = Math.max(0, invoiceTotal - autresSaisis);
        return { ...p, amount: montant.toFixed(2) };
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
    setPaymentError("");
    const currentPayMethod = resolvedPayments.map(p => resolvedPayments.length > 1 || p.amount !== invoiceTotal.toFixed(2) ? `${p.method} ${parseFloat(p.amount).toFixed(2)}€` : p.method).join(" + ") || "Espèces";
    void reste;
    try {
      const items: InvoiceItem[] = cartSnapshot.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.product.sale_price),
        total: Number(item.product.sale_price) * item.quantity,
      }));

      // Récupère le vrai user_id Supabase Auth (ne pas se fier au state qui peut être vide)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const realUserId = authUser?.id || userId;
      if (!realUserId) { alert("Session expirée, reconnectez-vous."); return; }

      const result = await createInvoice(realUserId, clientForInvoice, items, currentTva, currentPayMethod);
      if (!result.success) { alert("Erreur création facture: " + result.error); return; }

      // invoice_id est integer dans Supabase — ne pas y mettre de string
      const boutiqueInvoiceId = null;

      for (const item of cartSnapshot) {
        const unitPrice = Number(item.product.sale_price);
        const unitCost = Number(item.product.purchase_price);
        const { error: saleErr } = await supabase.from("product_sales").insert({
          user_id: realUserId,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          unit_cost: unitCost,
          total: unitPrice * item.quantity,
          sold_by: selectedTech || techName || "Boutique",
          invoice_id: boutiqueInvoiceId,
          client_name: clientForInvoice.name,
          repair_id: repairSnapshot ? repairSnapshot.id : null,
        });
        if (saleErr) console.error("Erreur product_sales insert:", saleErr);
        await supabase.from("products").update({ stock: item.product.stock - item.quantity }).eq("id", item.product.id);
      }

      // Marquer la réparation liée comme payée
      if (repairSnapshot) {
        const paidAt = new Date().toISOString();
        const priceHt = repairSnapshot.final_price ?? repairSnapshot.estimated_price ?? 0;
        // TVA du toggle appliquée à la réparation uniquement
        const repairTtc = priceHt * (1 + currentTva / 100);
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
      setPayments([{ method: "Carte", amount: "" }]);
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

  const handleManualBarcodeSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && manualBarcode.trim()) {
      searchProductByBarcode(manualBarcode);
      setManualBarcode("");
      setShowManualInput(false);
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
    const { data: results } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .eq("barcode", barcode.trim())
      .order("stock", { ascending: false });
    const data = results?.[0] ?? null;
    if (!data) {
      alert(`Produit introuvable : ${barcode}`);
      setScannedProduct(null);
    } else if (data.stock <= 0) {
      setOutOfStockProduct(data as Product);
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

  // Réapprovisionnement : ajuste le stock et enregistre le mouvement (silencieux si table absente)
  const restock = async (p: Product, delta: number) => {
    const newStock = Math.max(0, (Number(p.stock) || 0) + delta);
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock: newStock } : x)));
    await supabase.from("products").update({ stock: newStock }).eq("id", p.id);
    try {
      await supabase.from("stock_movements").insert({
        product_id: p.id,
        product_name: p.name,
        type: delta >= 0 ? "entree" : "sortie",
        quantity: Math.abs(delta),
        stock_after: newStock,
        company_id: userId || null,
        author: techName || null,
      });
    } catch { /* table optionnelle */ }
  };

  // Catégories disponibles
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  );

  // Indicateurs de stock
  const stockStats = useMemo(() => {
    let valeurAchat = 0, valeurVente = 0, lowCount = 0, rupture = 0;
    products.forEach((p) => {
      const stock = Number(p.stock) || 0;
      valeurAchat += stock * (Number(p.purchase_price) || 0);
      valeurVente += stock * (Number(p.sale_price) || 0);
      if (stock <= 0) rupture += 1;
      else if (stock <= lowThreshold(p)) lowCount += 1;
    });
    return {
      count: products.length,
      valeurAchat,
      valeurVente,
      margePotentielle: valeurVente - valeurAchat,
      lowCount,
      rupture,
    };
  }, [products]);

  // Liste filtrée + triée
  const displayedProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    let list = products.filter((p) => {
      if (term && !(p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.includes(productSearch.trim())))) return false;
      if (filterCat !== "all" && p.category !== filterCat) return false;
      if (lowStockOnly && Number(p.stock) > lowThreshold(p)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "stock_asc") return (Number(a.stock) || 0) - (Number(b.stock) || 0);
      if (sortBy === "margin_desc") return ((Number(b.sale_price) || 0) - (Number(b.purchase_price) || 0)) - ((Number(a.sale_price) || 0) - (Number(a.purchase_price) || 0));
      if (sortBy === "value_desc") return ((Number(b.stock) || 0) * (Number(b.sale_price) || 0)) - ((Number(a.stock) || 0) * (Number(a.sale_price) || 0));
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [products, productSearch, filterCat, lowStockOnly, sortBy]);

  // Export CSV de l'inventaire
  const exportInventoryCsv = () => {
    const header = ["Nom", "Catégorie", "Stock", "Seuil", "Prix achat", "Prix vente", "Marge", "Valeur stock (vente)", "Code-barres"];
    const rows = displayedProducts.map((p) => {
      const stock = Number(p.stock) || 0;
      const achat = Number(p.purchase_price) || 0;
      const vente = Number(p.sale_price) || 0;
      return [p.name, p.category || "", stock, lowThreshold(p), achat.toFixed(2), vente.toFixed(2), (vente - achat).toFixed(2), (stock * vente).toFixed(2), p.barcode || ""];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventaire_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package size={18} className="text-fuchsia-400" />
            Stock
          </h1>
          {tab === "stock" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="flex items-center gap-2 px-4 py-2 bg-[#16161d] border border-white/10 text-gray-200 hover:border-pink-500/40 rounded-xl text-sm font-bold transition active:scale-95"
              >
                <ScanLine size={16} /> Code-barres
              </button>
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold transition active:scale-95"
              >
                <ScanLine size={16} /> Scanner
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
              <input autoComplete="new-password"
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

        {/* Rupture de stock */}
        {outOfStockProduct && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-amber-400 font-semibold text-sm">⚠️ Rupture de stock</span>
                <p className="text-white text-sm mt-0.5 truncate">{outOfStockProduct.name}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    const el = document.getElementById(`product-${outOfStockProduct.id}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setOutOfStockProduct(null);
                  }}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-semibold border border-blue-500/30 transition"
                >
                  + Ajouter stock
                </button>
                <button
                  onClick={() => {
                    setCartItems(prev => {
                      const ex = prev.find(i => i.product.id === outOfStockProduct.id);
                      return ex ? prev.map(i => i.product.id === outOfStockProduct.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { product: outOfStockProduct, quantity: 1 }];
                    });
                    setOutOfStockProduct(null);
                  }}
                  className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-xs font-semibold border border-green-500/30 transition"
                >
                  Ajouter
                </button>
                <button onClick={() => setOutOfStockProduct(null)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition">
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Produit scanné + bouton panier */}
        {(scannedProduct || cartItems.length > 0) && (
          <div className="mb-4 space-y-2">
            {scannedProduct && (
              <div className="p-4 bg-[#16161d] border border-green-500/30 rounded-2xl">
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
                      <input autoComplete="new-password" type="number" min={1} max={scannedProduct.stock} value={saleQuantity} onChange={(e) => setSaleQuantity(e.target.value)} className="w-16 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-white text-center text-sm outline-none focus:border-green-500/50" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Total</div>
                      <div className="text-sm font-bold text-green-400">{(Number(scannedProduct.sale_price) * (Number(saleQuantity) || 1)).toFixed(2)} €</div>
                    </div>
                    <button onClick={addToCart} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2">
                      <ShoppingCart size={14} /> Ajouter
                    </button>
                    <button onClick={() => setScannedProduct(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition">
                      <X size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {cartItems.length > 0 && (
              <button onClick={() => { setShowClientModal(true); searchExistingClients(""); }} className="w-full px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                <ShoppingCart size={16} /> Panier ({cartItems.reduce((s, i) => s + i.quantity, 0)}) · {cartItems.reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0).toFixed(2)} €
              </button>
            )}
          </div>
        )}

        {/* Onglets + recherche */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("stock")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 ${tab === "stock" ? "bg-pink-500/15 text-pink-300 border border-pink-500/30" : "bg-[#16161d] text-gray-400 border border-white/8"}`}>📦 Stock</button>
          <button onClick={() => setTab("ventes")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 ${tab === "ventes" ? "bg-pink-500/15 text-pink-300 border border-pink-500/30" : "bg-[#16161d] text-gray-400 border border-white/8"}`}>🧾 Ventes</button>
          {tab === "stock" && (
            <input autoComplete="new-password"
              type="text"
              placeholder="Rechercher par nom ou code-barres..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="flex-1 bg-[#16161d] border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-pink-500/50 placeholder-gray-600"
            />
          )}
        </div>

        {/* KPIs + contrôles stock */}
        {tab === "stock" && !loading && products.length > 0 && (
          <>
            {isGerant && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Produits</div>
                  <div className="text-2xl font-black text-white mt-1">{stockStats.count}</div>
                </div>
                <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Valeur stock (achat)</div>
                  <div className="text-2xl font-black text-blue-400 mt-1">{stockStats.valeurAchat.toFixed(0)} €</div>
                </div>
                <div className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Marge potentielle</div>
                  <div className="text-2xl font-black text-green-400 mt-1">{stockStats.margePotentielle.toFixed(0)} €</div>
                </div>
                <button onClick={() => setLowStockOnly((v) => !v)} className={`text-left rounded-2xl p-4 border transition ${lowStockOnly ? "bg-amber-500/15 border-amber-500/40" : "bg-[#16161d] border-white/8 hover:border-amber-500/30"}`}>
                  <div className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={12} className="text-amber-400" /> À recommander</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{stockStats.lowCount + stockStats.rupture}</div>
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pink-500/50">
                <option value="name">Trier : Nom A-Z</option>
                <option value="stock_asc">Trier : Stock croissant</option>
                <option value="margin_desc">Trier : Marge ↓</option>
                <option value="value_desc">Trier : Valeur stock ↓</option>
              </select>
              <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="bg-[#16161d] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pink-500/50">
                <option value="all">Toutes catégories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {lowStockOnly && (
                <button onClick={() => setLowStockOnly(false)} className="px-3 py-2 rounded-xl text-sm bg-amber-500/15 text-amber-300 border border-amber-500/40">⚠️ Stock bas seulement ✕</button>
              )}
              {isGerant && (
                <button onClick={exportInventoryCsv} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-[#16161d] border border-white/10 text-gray-300 hover:border-pink-500/40 transition">
                  <Download size={14} /> Export CSV
                </button>
              )}
            </div>
          </>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" /></div>
        ) : tab === "stock" ? (
          products.length === 0 ? (
            <div className="text-center text-gray-600 py-16 bg-[#16161d] border border-white/5 rounded-2xl text-sm">Aucun produit. Ajoutez-en avec le bouton « Produit ».</div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center text-gray-600 py-16 bg-[#16161d] border border-white/5 rounded-2xl text-sm">Aucun produit ne correspond.</div>
          ) : (
            <div className="space-y-2">
              {displayedProducts.map((p) => {
                const margin = (Number(p.sale_price) || 0) - (Number(p.purchase_price) || 0);
                return (
                  <div key={p.id} id={`product-${p.id}`} className="bg-[#16161d] border border-white/8 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.category || "—"}</div>
                        {p.barcode && <div className="text-[10px] text-gray-600 font-mono mt-0.5">▮▮ {p.barcode}</div>}
                        {p.imei && <div className="text-[10px] text-gray-600 font-mono">IMEI {p.imei}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold ${p.stock <= 0 ? "text-red-400" : p.stock <= lowThreshold(p) ? "text-amber-400" : "text-white"}`}>{p.stock} en stock</div>
                        {p.stock <= 0 ? (
                          <span className="inline-block mt-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded">⛔ Rupture</span>
                        ) : p.stock <= lowThreshold(p) ? (
                          <span className="inline-block mt-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded">⚠️ À recommander</span>
                        ) : null}
                        <div className="text-xs text-gray-500 mt-0.5">Vente : {Number(p.sale_price).toFixed(2)} €</div>
                      </div>
                    </div>
                    {isGerant && (
                      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
                        <label className="flex items-center gap-1.5">Stock
                          <input autoComplete="new-password" type="number" value={p.stock} onChange={(e) => updateField(p.id, "stock", Number(e.target.value))} onBlur={(e) => saveField(p.id, "stock", Number(e.target.value))} className="w-16 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-right outline-none focus:border-pink-500/50" />
                        </label>
                        <label className="flex items-center gap-1.5">Achat €
                          <input autoComplete="new-password" type="number" value={p.purchase_price} onChange={(e) => updateField(p.id, "purchase_price", Number(e.target.value))} onBlur={(e) => saveField(p.id, "purchase_price", Number(e.target.value))} className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-right outline-none focus:border-pink-500/50" />
                        </label>
                        <label className="flex items-center gap-1.5">Vente €
                          <input autoComplete="new-password" type="number" value={p.sale_price} onChange={(e) => updateField(p.id, "sale_price", Number(e.target.value))} onBlur={(e) => saveField(p.id, "sale_price", Number(e.target.value))} className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-right outline-none focus:border-pink-500/50" />
                        </label>
                        <label className="flex items-center gap-1.5">Seuil
                          <input autoComplete="new-password" type="number" value={p.low_stock_threshold ?? ""} placeholder={String(DEFAULT_LOW_STOCK)} onChange={(e) => updateField(p.id, "low_stock_threshold", Number(e.target.value))} onBlur={(e) => saveField(p.id, "low_stock_threshold", Number(e.target.value))} className="w-14 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-right outline-none focus:border-pink-500/50" />
                        </label>
                        <span className={`font-semibold ${margin >= 0 ? "text-green-400" : "text-red-400"}`}>Marge {margin.toFixed(2)} €</span>
                        <button onClick={() => deleteProduct(p.id)} className="ml-auto text-red-400 hover:text-red-300"><Trash2 size={15} /></button>
                      </div>
                    )}
                    {isGerant && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">Réappro :</span>
                        <button onClick={() => restock(p, -1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 flex items-center justify-center transition"><Minus size={13} /></button>
                        <button onClick={() => restock(p, 1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 flex items-center justify-center transition"><Plus size={13} /></button>
                        <button onClick={() => restock(p, 5)} className="px-2.5 h-7 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 text-xs font-semibold transition">+5</button>
                        <button onClick={() => restock(p, 10)} className="px-2.5 h-7 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 text-xs font-semibold transition">+10</button>
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
              <input autoComplete="new-password" placeholder="Nom du produit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50">
                <option value="">— Catégorie —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-2">
                <input autoComplete="new-password" placeholder="Code-barres" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
                <button type="button" onClick={() => setScanMode("form")} className="px-3 bg-pink-500/15 border border-pink-500/30 text-pink-300 rounded-xl hover:bg-pink-500/25 transition flex items-center gap-1.5 text-sm">
                  <ScanLine size={16} /> Scan
                </button>
              </div>
              {form.category === "Téléphone" && (
                <input autoComplete="new-password" placeholder="IMEI (téléphone)" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
              )}
              <div className="grid grid-cols-3 gap-2">
                <input autoComplete="new-password" type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
                <input autoComplete="new-password" type="number" placeholder="Achat €" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
                <input autoComplete="new-password" type="number" placeholder="Vente €" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
              </div>
            </div>
            {barcodeConflict ? (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <p className="text-sm text-amber-300 font-semibold">⚠️ Code-barres déjà utilisé par <span className="text-white">« {barcodeConflict.name} »</span></p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const conflictId = barcodeConflict.id;
                      setBarcodeConflict(null);
                      setShowAdd(false);
                      setTimeout(() => {
                        const el = document.getElementById(`product-${conflictId}`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 150);
                    }}
                    className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 py-2 rounded-xl text-sm font-semibold border border-amber-500/30"
                  >Voir le produit existant</button>
                  <button onClick={() => setBarcodeConflict(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-xl text-sm border border-white/10">Annuler</button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={addProduct} className="w-full mt-4 bg-pink-500 hover:bg-pink-400 text-white py-2.5 rounded-xl font-semibold text-sm transition">Ajouter</button>
                <button onClick={() => setShowAdd(false)} className="w-full mt-2 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-sm border border-white/10 transition">Annuler</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL PANIER + CLIENT */}
      {showClientModal && (
        <CartValidationModal
          cartItems={cartItems as any}
          setCartItems={setCartItems as any}
          linkedRepair={linkedRepair}
          setLinkedRepair={setLinkedRepair}
          products={products as any}
          userId={userId}
          soldBy={selectedTech || techName || "Boutique"}
          onClose={() => setShowClientModal(false)}
          onSuccess={() => { setCartItems(() => []); load(); }}
        />
      )}

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




    </Layout>
  );
}
