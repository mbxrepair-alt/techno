"use client";

import { useEffect, useState } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { getCurrentTechnician } from "../../lib/historique";
import { Store, Plus, Trash2, ShoppingCart, ScanLine } from "lucide-react";
import QrScanner from "../../components/QrScanner";

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

export default function BoutiquePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"stock" | "ventes">("stock");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGerant, setIsGerant] = useState(false);
  const [techName, setTechName] = useState("");
  const [userId, setUserId] = useState<string>("");

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", stock: "", purchase_price: "", sale_price: "", barcode: "", imei: "" });
  // scan: "form" = remplir le code-barres du formulaire, "sell" = trouver un produit à vendre
  const [scanMode, setScanMode] = useState<null | "form" | "sell">(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sellProduct, setSellProduct] = useState<any>(null);
  const [sellQty, setSellQty] = useState("1");

  const load = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      const [pRes, sRes] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id).order("name", { ascending: true }),
        supabase.from("product_sales").select("*").eq("user_id", user.id).order("sold_at", { ascending: false }).limit(200),
      ]);
      setProducts(pRes.data || []);
      setSales(sRes.data || []);
    } catch (e) {
      console.error("boutique load:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = getCurrentTechnician();
    setIsGerant(t?.is_gerant === true);
    setTechName(t?.name || "");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addProduct = async () => {
    if (!form.name.trim()) return;
    await supabase.from("products").insert({
      user_id: userId,
      name: form.name.trim(),
      category: form.category.trim(),
      stock: Number(form.stock) || 0,
      purchase_price: Number(form.purchase_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      barcode: form.barcode.trim(),
      imei: form.imei.trim(),
    });
    setForm({ name: "", category: "", stock: "", purchase_price: "", sale_price: "", barcode: "", imei: "" });
    setShowAdd(false);
    await load();
  };

  // Résultat d'un scan code-barres
  const handleScan = (text: string) => {
    const code = (text || "").trim();
    const mode = scanMode;
    setScanMode(null);
    if (!code) return;
    if (mode === "form") {
      setForm((f) => ({ ...f, barcode: code }));
      return;
    }
    // mode "sell" : chercher le produit par code-barres
    const found = products.find((p) => p.barcode && p.barcode === code);
    if (found) {
      setSellProduct(found);
      setSellQty("1");
    } else {
      // pas trouvé → proposer de créer le produit avec ce code-barres
      if (isGerant && confirm("Produit introuvable pour ce code-barres. Créer un nouveau produit avec ce code ?")) {
        setForm((f) => ({ ...f, barcode: code }));
        setShowAdd(true);
      } else {
        alert("Aucun produit avec ce code-barres : " + code);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = (id: number, field: string, value: number) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };
  const saveField = async (id: number, field: string, value: number) => {
    await supabase.from("products").update({ [field]: value }).eq("id", id);
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    await supabase.from("products").delete().eq("id", id);
    await load();
  };

  const confirmSale = async () => {
    if (!sellProduct) return;
    const qty = Math.max(1, Number(sellQty) || 1);
    if (qty > sellProduct.stock) {
      alert(`Stock insuffisant (${sellProduct.stock} disponible).`);
      return;
    }
    const unit = Number(sellProduct.sale_price) || 0;
    const cost = Number(sellProduct.purchase_price) || 0;
    await supabase.from("product_sales").insert({
      user_id: userId,
      product_id: sellProduct.id,
      product_name: sellProduct.name,
      quantity: qty,
      unit_price: unit,
      unit_cost: cost,
      total: unit * qty,
      sold_by: techName,
    });
    await supabase.from("products").update({ stock: sellProduct.stock - qty }).eq("id", sellProduct.id);
    setSellProduct(null);
    setSellQty("1");
    await load();
  };

  const totalSales = sales.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const totalProfit = sales.reduce((s, v) => s + ((Number(v.unit_price) || 0) - (Number(v.unit_cost) || 0)) * (Number(v.quantity) || 0), 0);

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Store size={18} className="text-pink-400" />
            Boutique
          </h1>
          {tab === "stock" && (
            <div className="flex items-center gap-2">
              <button onClick={() => setScanMode("sell")} className="flex items-center gap-2 px-4 py-2 bg-[#16161d] border border-white/10 text-gray-200 hover:border-pink-500/40 rounded-xl text-sm font-bold transition active:scale-95">
                <ScanLine size={16} /> Scanner
              </button>
              {isGerant && (
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-400 text-white rounded-xl text-sm font-bold transition active:scale-95">
                  <Plus size={16} /> Produit
                </button>
              )}
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
                      onClick={() => { setSellProduct(p); setSellQty("1"); }}
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
          // Onglet ventes
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
              {/* Code-barres + scan */}
              <div className="flex gap-2">
                <input placeholder="Code-barres" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-pink-500/50" />
                <button type="button" onClick={() => setScanMode("form")} className="px-3 bg-pink-500/15 border border-pink-500/30 text-pink-300 rounded-xl hover:bg-pink-500/25 transition flex items-center gap-1.5 text-sm">
                  <ScanLine size={16} /> Scan
                </button>
              </div>
              {/* IMEI uniquement pour les téléphones */}
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

      {/* MODAL VENTE */}
      {sellProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSellProduct(null)}>
          <div className="bg-[#16161d] border border-white/10 rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">🛒 Vendre</h2>
            <p className="text-sm text-gray-400 mb-4">{sellProduct.name} · {Number(sellProduct.sale_price).toFixed(2)} € · stock {sellProduct.stock}</p>
            <label className="block text-xs text-gray-400 mb-1">Quantité</label>
            <input type="number" min={1} max={sellProduct.stock} value={sellQty} onChange={(e) => setSellQty(e.target.value)} className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50 mb-3" />
            <div className="bg-white/5 rounded-xl px-4 py-2.5 mb-4 flex justify-between text-sm">
              <span className="text-gray-400">Total</span>
              <span className="font-bold text-green-400">{((Number(sellProduct.sale_price) || 0) * (Number(sellQty) || 0)).toFixed(2)} €</span>
            </div>
            <button onClick={confirmSale} className="w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl font-semibold text-sm transition">✅ Valider la vente</button>
            <button onClick={() => setSellProduct(null)} className="w-full mt-2 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-sm border border-white/10 transition">Annuler</button>
          </div>
        </div>
      )}

      {/* SCANNER CODE-BARRES */}
      {scanMode && (
        <QrScanner onScan={handleScan} onClose={() => setScanMode(null)} />
      )}
    </Layout>
  );
}
