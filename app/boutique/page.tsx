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

  const validateSaleWithInvoice = async () => {
    if (!selectedClient) { alert("Veuillez sélectionner un client"); return; }
    if (cartItems.length === 0) { alert("Ajoutez des produits au panier"); return; }
    setIsProcessingSale(true);
    try {
      const items: InvoiceItem[] = cartItems.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.product.sale_price),
        total: Number(item.product.sale_price) * item.quantity,
      }));

      const result = await createInvoice(userId, selectedClient, items, tvaRate, "Espèces");
      if (!result.success) { alert("Erreur création facture: " + result.error); return; }

      for (const item of cartItems) {
        const unitPrice = Number(item.product.sale_price);
        const unitCost = Number(item.product.purchase_price);
        const { error: saleError } = await supabase.from("product_sales").insert({
          user_id: userId,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          unit_cost: unitCost,
          total: unitPrice * item.quantity,
          sold_by: techName || "Boutique",
          invoice_id: result.invoiceId,
          client_name: selectedClient?.name || "",
        });
        if (!saleError) {
          await supabase.from("products").update({ stock: item.product.stock - item.quantity }).eq("id", item.product.id);
        }
      }

      setCartItems([]);
      setSelectedClient(null);
      setClientSearch("");
      setClientSearchResults([]);
      setShowClientModal(false);
      alert(`✅ Vente validée ! Facture ${result.invoiceId}`);
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
      {showClientModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16161d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-[#16161d] border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight">🛒 Validation de la vente</h2>
              <button onClick={() => setShowClientModal(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Recherche client */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Client</label>
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
              </div>

              {/* Nouveau client */}
              <div className="border-t border-white/10 pt-3">
                <button
                  onClick={() => {
                    const name = prompt("Nom du nouveau client :");
                    if (name) {
                      const phone = prompt("Téléphone (optionnel) :") || "";
                      const email = prompt("Email (optionnel) :") || "";
                      setSelectedClient({ name, phone, email });
                      setClientSearch(name);
                    }
                  }}
                  className="text-sm text-pink-400 hover:text-pink-300 flex items-center gap-1"
                >
                  + Nouveau client
                </button>
              </div>

              {selectedClient && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-green-400">Client sélectionné</span>
                      <div className="font-medium text-white">{selectedClient.name}</div>
                      {(selectedClient.phone || selectedClient.email) && <div className="text-xs text-gray-400">{selectedClient.phone} {selectedClient.email}</div>}
                    </div>
                    <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="text-xs text-red-400 hover:text-red-300">Modifier</button>
                  </div>
                </div>
              )}

              {/* TVA */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">TVA</label>
                <select value={tvaRate} onChange={(e) => setTvaRate(Number(e.target.value))} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50">
                  <option value={0}>0%</option>
                  <option value={20}>20%</option>
                </select>
              </div>

              {/* Panier */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">🛍️ Panier</h3>
                {cartItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-sm">Aucun produit dans le panier</div>
                ) : (
                  <div className="space-y-2">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1d2e] rounded-xl">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{item.product.name}</div>
                          <div className="text-xs text-gray-500">{item.quantity} × {item.product.sale_price.toFixed(2)} €</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-400">{(item.product.sale_price * item.quantity).toFixed(2)} €</div>
                          <button onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-300">Supprimer</button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-white/10">
                      {tvaRate > 0 && (
                        <div className="flex justify-between py-1 text-sm">
                          <span className="text-gray-400">TVA ({tvaRate}%)</span>
                          <span className="text-white">{(cartItems.reduce((s, i) => s + i.product.sale_price * i.quantity, 0) * tvaRate / 100).toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 mt-1 border-t border-white/10 font-bold">
                        <span className="text-white">Total TTC</span>
                        <span className="text-pink-400 text-lg">{(cartItems.reduce((s, i) => s + i.product.sale_price * i.quantity, 0) * (1 + tvaRate / 100)).toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={validateSaleWithInvoice}
                  disabled={cartItems.length === 0 || !selectedClient || isProcessingSale}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {isProcessingSale ? "⏳ Traitement..." : "✅ Valider la vente"}
                </button>
                <button onClick={() => setShowClientModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl transition-all">Annuler</button>
              </div>
            </div>
          </div>
        </div>
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
