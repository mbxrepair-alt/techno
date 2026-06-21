"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Layout from "../../components/Layout";
import { DEVICES_LIST, SCREEN_QUALITIES } from "../../lib/devices-catalog";
import { Tag, Plus, Trash2, Search, Copy, Settings, Pencil, X, Check } from "lucide-react";
import {
  fetchCustomCatalog, buildMergedCategories, addCustomCategory, removeCustomCategory, renameCustomCategory,
  addCustomIssue, removeCustomIssue, renameCustomIssue,
  hideBuiltinCategory, hideBuiltinIssue, renameBuiltinCategory, renameBuiltinIssue,
  isCustomCategoryId, CustomCategoryRow, CustomIssueRow, HiddenItemRow,
} from "../../lib/customCategories";

interface PanneRow {
  id: number;
  device_model: string;
  issue_label: string;
  price_min: number;
  price_max: number;
}

export default function TarifsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PanneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGerant, setIsGerant] = useState(false);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");

  // Catégories/pannes personnalisées + éléments masqués/renommés par l'atelier
  const [customCategories, setCustomCategories] = useState<CustomCategoryRow[]>([]);
  const [customIssues, setCustomIssues] = useState<CustomIssueRow[]>([]);
  const [hiddenItems, setHiddenItems] = useState<HiddenItemRow[]>([]);
  const mergedCategories = useMemo(() => buildMergedCategories(customCategories, customIssues, hiddenItems), [customCategories, customIssues, hiddenItems]);

  const reloadCustomCatalog = async (companyId: string) => {
    const { customCategories: cats, customIssues: iss, hiddenItems: hid } = await fetchCustomCatalog(companyId);
    setCustomCategories(cats);
    setCustomIssues(iss);
    setHiddenItems(hid);
  };

  // Gestionnaire de catégories/pannes (modifier / supprimer, standard ou perso)
  const [showCatalogManager, setShowCatalogManager] = useState(false);
  const [managingCategoryId, setManagingCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState("");
  const [editingIssueKey, setEditingIssueKey] = useState<string | null>(null);
  const [editingIssueLabel, setEditingIssueLabel] = useState("");
  const [newIssueForManager, setNewIssueForManager] = useState("");
  const [newCategoryForManager, setNewCategoryForManager] = useState("");

  const [form, setForm] = useState({ device_model: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deviceSuggestions, setDeviceSuggestions] = useState<string[]>([]);
  const [showDeviceSuggestions, setShowDeviceSuggestions] = useState(false);

  // Modèles supplémentaires pour appliquer le même tarif à plusieurs appareils d'un coup
  const [extraModels, setExtraModels] = useState<string[]>([]);

  // Plusieurs pannes (catégorie + panne + prix) ajoutées d'un coup avec +/-
  const EMPTY_PANNE_ROW = { category_id: "", issue_label: "", price_min: "", price_max: "", screenQuality: "" };
  const [panneRows, setPanneRows] = useState([{ ...EMPTY_PANNE_ROW }]);

  const updatePanneRow = (index: number, patch: Partial<typeof EMPTY_PANNE_ROW>) => {
    setPanneRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addPanneRow = () => setPanneRows((prev) => [...prev, { ...EMPTY_PANNE_ROW }]);

  const removePanneRow = (index: number) => {
    setPanneRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ ...EMPTY_PANNE_ROW }]));
  };

  // ─── Duplication des tarifs d'un modèle vers d'autres modèles ─────────────
  const [dupSource, setDupSource] = useState("");
  const [dupTargetInput, setDupTargetInput] = useState("");
  const [dupTargets, setDupTargets] = useState<string[]>([]);
  const [dupTargetSuggestions, setDupTargetSuggestions] = useState<string[]>([]);
  const [showDupSuggestions, setShowDupSuggestions] = useState(false);
  const [dupSaving, setDupSaving] = useState(false);
  const [dupError, setDupError] = useState("");
  const [dupSuccess, setDupSuccess] = useState("");

  // Édition rapide des prix d'une panne existante (dans l'aperçu du modèle source)
  const [editedPrices, setEditedPrices] = useState<Record<number, { price_min: string; price_max: string }>>({});

  const handlePriceEdit = (id: number, field: "price_min" | "price_max", value: string, current: PanneRow) => {
    setEditedPrices((prev) => ({
      ...prev,
      [id]: {
        price_min: prev[id]?.price_min ?? String(current.price_min),
        price_max: prev[id]?.price_max ?? String(current.price_max),
        [field]: value,
      },
    }));
  };

  const saveEditedPrice = async (row: PanneRow) => {
    const edited = editedPrices[row.id];
    if (!edited) return;
    const min = parseFloat(edited.price_min);
    const max = parseFloat(edited.price_max);
    if (isNaN(min) || isNaN(max) || min < 0 || max < min) return;
    if (min === row.price_min && max === row.price_max) return;
    await supabase.from("panne_prices").update({ price_min: min, price_max: max }).eq("id", row.id);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, price_min: min, price_max: max } : r)));
  };

  // Ajout rapide d'une panne supplémentaire pour le modèle source (depuis l'aperçu)
  const [quickAdd, setQuickAdd] = useState({ category_id: "", issue_label: "", price_min: "", price_max: "" });
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const handleQuickAdd = async () => {
    const min = parseFloat(quickAdd.price_min);
    const max = parseFloat(quickAdd.price_max);
    if (!dupSource || !quickAdd.issue_label || isNaN(min) || isNaN(max) || min < 0 || max < min) return;
    setQuickAddSaving(true);
    try {
      const { data, error: upsertError } = await supabase
        .from("panne_prices")
        .upsert(
          { company_id: userId, device_model: dupSource, issue_label: quickAdd.issue_label, price_min: min, price_max: max },
          { onConflict: "company_id,device_model,issue_label" }
        )
        .select()
        .single();
      if (upsertError) throw upsertError;
      setRows((prev) => [...prev.filter((r) => !(r.device_model === dupSource && r.issue_label === quickAdd.issue_label)), data]);
      setQuickAdd({ category_id: "", issue_label: "", price_min: "", price_max: "" });
    } catch (e) {
      console.error(e);
    } finally {
      setQuickAddSaving(false);
    }
  };

  const handleDupTargetInput = (value: string) => {
    setDupTargetInput(value);
    if (!value.trim()) { setDupTargetSuggestions([]); setShowDupSuggestions(false); return; }
    const lower = value.toLowerCase();
    setDupTargetSuggestions(DEVICES_LIST.filter((d) => d.toLowerCase().includes(lower)).slice(0, 8));
    setShowDupSuggestions(true);
  };

  const addDupTarget = () => {
    const model = dupTargetInput.trim();
    if (!model) return;
    setDupTargets((prev) => (prev.includes(model) ? prev : [...prev, model]));
    setDupTargetInput("");
    setShowDupSuggestions(false);
  };

  const removeDupTarget = (model: string) => {
    setDupTargets((prev) => prev.filter((m) => m !== model));
  };

  const handleDuplicate = async () => {
    setDupError(""); setDupSuccess("");
    const sourceRows = rows.filter((r) => r.device_model === dupSource);
    if (!dupSource || sourceRows.length === 0) { setDupError("Choisissez un modèle source ayant des tarifs."); return; }
    if (dupTargets.length === 0) { setDupError("Ajoutez au moins un modèle cible."); return; }

    setDupSaving(true);
    try {
      const payload = dupTargets.flatMap((device_model) =>
        sourceRows.map((r) => ({
          company_id: userId,
          device_model,
          issue_label: r.issue_label,
          price_min: r.price_min,
          price_max: r.price_max,
        }))
      );
      const { error: upsertError } = await supabase
        .from("panne_prices")
        .upsert(payload, { onConflict: "company_id,device_model,issue_label" });
      if (upsertError) throw upsertError;
      setDupSuccess(`${sourceRows.length} panne(s) dupliquée(s) vers ${dupTargets.length} modèle(s).`);
      setDupTargets([]);
      await load();
    } catch (e) {
      console.error(e);
      setDupError("Erreur lors de la duplication.");
    } finally {
      setDupSaving(false);
    }
  };

  const handleDeviceInput = (value: string) => {
    setForm((f) => ({ ...f, device_model: value }));
    if (!value.trim()) { setDeviceSuggestions([]); setShowDeviceSuggestions(false); return; }
    const lower = value.toLowerCase();
    setDeviceSuggestions(DEVICES_LIST.filter((d) => d.toLowerCase().includes(lower)).slice(0, 8));
    setShowDeviceSuggestions(true);
  };

  const addExtraModel = () => {
    const model = form.device_model.trim();
    if (!model) return;
    setExtraModels((prev) => (prev.includes(model) ? prev : [...prev, model]));
    setForm((f) => ({ ...f, device_model: "" }));
    setShowDeviceSuggestions(false);
  };

  const removeExtraModel = (model: string) => {
    setExtraModels((prev) => prev.filter((m) => m !== model));
  };

  const load = async () => {
    setLoading(true);
    try {
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) { router.push("/login"); return; }
      setUserId(companyId);
      const techPermissions = localStorage.getItem("technician_permissions");
      if (techPermissions) setIsGerant(JSON.parse(techPermissions)?.is_gerant === true);

      const { data } = await supabase
        .from("panne_prices")
        .select("*")
        .eq("company_id", companyId)
        .order("device_model", { ascending: true });
      setRows(data || []);
      await reloadCustomCatalog(companyId);
    } catch (e) {
      console.error("Erreur chargement tarifs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const models = Array.from(new Set([...extraModels, form.device_model.trim()].filter(Boolean)));
    if (models.length === 0) { setError("Au moins un modèle est requis."); return; }

    const payloadRows: { issue_label: string; price_min: number; price_max: number }[] = [];
    for (const row of panneRows) {
      if (!row.issue_label) continue;
      const isScreenChange = row.issue_label === "Changement d'écran";
      if (isScreenChange && !row.screenQuality) { setError("Choisissez la qualité de l'écran pour chaque panne \"Changement d'écran\"."); return; }
      const finalIssueLabel = isScreenChange ? `Changement d'écran - ${row.screenQuality}` : row.issue_label;
      const min = parseFloat(row.price_min);
      const max = parseFloat(row.price_max);
      if (isNaN(min) || isNaN(max) || min < 0 || max < min) { setError(`Prix invalide pour "${finalIssueLabel}" (min doit être ≤ max).`); return; }
      payloadRows.push({ issue_label: finalIssueLabel, price_min: min, price_max: max });
    }
    if (payloadRows.length === 0) { setError("Ajoutez au moins une panne."); return; }

    setSaving(true);
    try {
      const payload = models.flatMap((device_model) =>
        payloadRows.map((r) => ({ company_id: userId, device_model, ...r }))
      );
      const { error: upsertError } = await supabase
        .from("panne_prices")
        .upsert(payload, { onConflict: "company_id,device_model,issue_label" });
      if (upsertError) throw upsertError;
      setForm({ device_model: "" });
      setExtraModels([]);
      setPanneRows([{ ...EMPTY_PANNE_ROW }]);
      await load();
    } catch (e) {
      console.error(e);
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce tarif ?")) return;
    await supabase.from("panne_prices").delete().eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const existingModels = useMemo(() => Array.from(new Set(rows.map((r) => r.device_model))).sort(), [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) => r.device_model.toLowerCase().includes(term) || r.issue_label.toLowerCase().includes(term)
    );
  }, [rows, search]);

  // Regroupement par modèle pour un affichage clair
  const grouped = useMemo(() => {
    const map = new Map<string, PanneRow[]>();
    filtered.forEach((r) => {
      if (!map.has(r.device_model)) map.set(r.device_model, []);
      map.get(r.device_model)!.push(r);
    });
    return Array.from(map.entries());
  }, [filtered]);

  // ─── Gestionnaire de catégories / pannes (modifier / supprimer) ───────────
  const handleDeleteCategory = async (cat: { id: string; label: string }) => {
    if (!confirm(`Supprimer la catégorie « ${cat.label} » ?`)) return;
    if (isCustomCategoryId(cat.id)) {
      await removeCustomCategory(Number(cat.id.replace("custom_", "")));
    } else {
      await hideBuiltinCategory(userId, cat.id);
    }
    await reloadCustomCatalog(userId);
    if (managingCategoryId === cat.id) setManagingCategoryId(null);
  };

  const startEditCategory = (cat: { id: string; label: string }) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryLabel(cat.label.replace(/^🆕 /, ""));
  };

  const confirmEditCategory = async (cat: { id: string; label: string; issues: string[] }) => {
    const newLabel = editingCategoryLabel.trim();
    if (!newLabel) return;
    if (isCustomCategoryId(cat.id)) {
      await renameCustomCategory(Number(cat.id.replace("custom_", "")), newLabel);
    } else {
      await renameBuiltinCategory(userId, cat.id, cat.label, cat.issues, newLabel);
      if (managingCategoryId === cat.id) setManagingCategoryId(null);
    }
    await reloadCustomCatalog(userId);
    setEditingCategoryId(null);
  };

  const handleDeleteIssue = async (catId: string, issueLabel: string) => {
    if (!confirm(`Supprimer la panne « ${issueLabel} » ?`)) return;
    const match = customIssues.find((ci) => ci.category_id === catId && ci.issue_label === issueLabel);
    if (match) {
      await removeCustomIssue(match.id);
    } else {
      await hideBuiltinIssue(userId, catId, issueLabel);
    }
    await reloadCustomCatalog(userId);
  };

  const startEditIssue = (catId: string, issueLabel: string) => {
    setEditingIssueKey(`${catId}::${issueLabel}`);
    setEditingIssueLabel(issueLabel);
  };

  const confirmEditIssue = async (catId: string, oldLabel: string) => {
    const newLabel = editingIssueLabel.trim();
    if (!newLabel) return;
    const match = customIssues.find((ci) => ci.category_id === catId && ci.issue_label === oldLabel);
    if (match) {
      await renameCustomIssue(match.id, newLabel);
    } else {
      await renameBuiltinIssue(userId, catId, oldLabel, newLabel);
    }
    await reloadCustomCatalog(userId);
    setEditingIssueKey(null);
  };

  const handleAddCategoryFromManager = async () => {
    if (!newCategoryForManager.trim()) return;
    await addCustomCategory(userId, newCategoryForManager.trim());
    await reloadCustomCatalog(userId);
    setNewCategoryForManager("");
  };

  const handleAddIssueFromManager = async (categoryId: string) => {
    if (!newIssueForManager.trim()) return;
    await addCustomIssue(userId, categoryId, newIssueForManager.trim());
    await reloadCustomCatalog(userId);
    setNewIssueForManager("");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Tag size={20} className="text-orange-400" />
          <h1 className="text-xl font-bold text-white tracking-tight">Tarifs des pannes</h1>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Définissez un prix (min – max) par modèle et par panne. Affiché automatiquement au client quand il déclare son appareil.
        </p>

        {isGerant && (
          <form onSubmit={handleAdd} className="bg-[#16161d] border border-white/5 rounded-2xl p-4 mb-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  📱 Modèle exact
                  {extraModels.length > 0 && <span className="ml-2 text-orange-400 normal-case font-semibold tracking-normal">({extraModels.length} modèle{extraModels.length > 1 ? "s" : ""} sélectionné{extraModels.length > 1 ? "s" : ""})</span>}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={form.device_model}
                      onChange={(e) => handleDeviceInput(e.target.value)}
                      onFocus={() => { if (deviceSuggestions.length > 0) setShowDeviceSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowDeviceSuggestions(false), 150)}
                      placeholder="Ex: Apple iPhone 15 Pro Max A2849"
                      className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/60"
                    />
                    {showDeviceSuggestions && deviceSuggestions.length > 0 && (
                      <div className="absolute z-30 w-full mt-1 bg-[#16161d] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                        {deviceSuggestions.map((d, i) => (
                          <div key={i} onMouseDown={() => { setForm((f) => ({ ...f, device_model: d })); setShowDeviceSuggestions(false); }}
                            className="px-3 py-2.5 hover:bg-orange-500/10 cursor-pointer text-sm text-gray-200 border-b border-white/5 last:border-0">
                            {d}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={addExtraModel} title="Ajouter ce modèle à la liste"
                    className="shrink-0 bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40 text-gray-300 hover:text-orange-300 rounded-xl px-3 transition">
                    <Plus size={16} />
                  </button>
                </div>
                {extraModels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {extraModels.map((m) => (
                      <span key={m} className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/25 text-orange-300 text-xs rounded-full px-3 py-1">
                        {m}
                        <button type="button" onClick={() => removeExtraModel(m)} className="hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-500 mt-1">💡 Tapez un modèle puis cliquez sur + pour appliquer le même tarif à plusieurs modèles (ex: toute la gamme iPhone 14 à 16 Pro Max).</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">🗂️ Catégorie / 🔧 Panne</label>
                <button type="button" onClick={() => setShowCatalogManager(true)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition">
                  <Settings size={11} /> Gérer les catégories / pannes
                </button>
              </div>
              {panneRows.map((row, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-start bg-white/3 rounded-xl p-2">
                  <select
                    value={row.category_id}
                    onChange={(e) => updatePanneRow(index, { category_id: e.target.value, issue_label: "", screenQuality: "" })}
                    className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm outline-none focus:border-orange-500/60"
                  >
                    <option value="">— Catégorie —</option>
                    {mergedCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <select
                    value={row.issue_label}
                    onChange={(e) => updatePanneRow(index, { issue_label: e.target.value, screenQuality: "" })}
                    disabled={!row.category_id}
                    className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm outline-none focus:border-orange-500/60 disabled:opacity-40"
                  >
                    <option value="">— Panne —</option>
                    {mergedCategories.find((c) => c.id === row.category_id)?.issues.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  {row.issue_label === "Changement d'écran" && (
                    <select
                      value={row.screenQuality}
                      onChange={(e) => updatePanneRow(index, { screenQuality: e.target.value })}
                      className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm outline-none focus:border-orange-500/60"
                    >
                      <option value="">— Qualité —</option>
                      {SCREEN_QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  )}
                  <input type="number" min="0" step="1" value={row.price_min} onChange={(e) => updatePanneRow(index, { price_min: e.target.value })}
                    placeholder="60€" className="w-full md:w-20 bg-[#1a1d2e] border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm outline-none focus:border-orange-500/60" />
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" step="1" value={row.price_max} onChange={(e) => updatePanneRow(index, { price_max: e.target.value })}
                      placeholder="120€" className="w-full md:w-20 bg-[#1a1d2e] border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm outline-none focus:border-orange-500/60" />
                    <button type="button" onClick={() => removePanneRow(index)} title="Supprimer cette panne"
                      className="shrink-0 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-gray-400 hover:text-red-400 rounded-lg p-2 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addPanneRow}
                className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition font-semibold">
                <Plus size={14} /> Ajouter une autre panne
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-95">
              <Plus size={16} /> {saving ? "Enregistrement..." : "Ajouter / Mettre à jour"}
            </button>
          </form>
        )}

        {isGerant && existingModels.length > 0 && (
          <div className="bg-[#16161d] border border-white/5 rounded-2xl p-4 mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <Copy size={16} className="text-orange-400" />
              <h2 className="text-sm font-bold text-white">Dupliquer les tarifs d&apos;un modèle vers d&apos;autres modèles</h2>
            </div>
            <p className="text-[10px] text-gray-500">Copie toutes les pannes/prix déjà configurés pour un modèle de référence vers un ou plusieurs autres modèles (ex: même réparations/prix pour toute une gamme).</p>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">📱 Modèle source (référence)</label>
              <select
                value={dupSource}
                onChange={(e) => setDupSource(e.target.value)}
                className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/60"
              >
                <option value="">— Choisir un modèle —</option>
                {existingModels.map((m) => (
                  <option key={m} value={m}>{m} ({rows.filter((r) => r.device_model === m).length} panne{rows.filter((r) => r.device_model === m).length > 1 ? "s" : ""})</option>
                ))}
              </select>
              {dupSource && (
                <div className="mt-2 bg-white/3 rounded-xl p-3 space-y-2">
                  {rows.filter((r) => r.device_model === dupSource).map((r) => {
                    const edited = editedPrices[r.id];
                    return (
                      <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-gray-300 truncate">{r.issue_label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number" min="0"
                            value={edited?.price_min ?? r.price_min}
                            onChange={(e) => handlePriceEdit(r.id, "price_min", e.target.value, r)}
                            onBlur={() => saveEditedPrice(r)}
                            className="w-14 bg-[#1a1d2e] border border-white/10 rounded-lg px-1.5 py-1 text-green-400 font-semibold text-xs outline-none focus:border-orange-500/60"
                          />
                          <span className="text-gray-500">–</span>
                          <input
                            type="number" min="0"
                            value={edited?.price_max ?? r.price_max}
                            onChange={(e) => handlePriceEdit(r.id, "price_max", e.target.value, r)}
                            onBlur={() => saveEditedPrice(r)}
                            className="w-14 bg-[#1a1d2e] border border-white/10 rounded-lg px-1.5 py-1 text-green-400 font-semibold text-xs outline-none focus:border-orange-500/60"
                          />
                          <span className="text-gray-500">€</span>
                          <button type="button" onClick={() => handleDelete(r.id)} className="text-gray-500 hover:text-red-400 transition p-1" title="Supprimer">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                    <select
                      value={quickAdd.category_id}
                      onChange={(e) => setQuickAdd({ ...quickAdd, category_id: e.target.value, issue_label: "" })}
                      className="bg-[#1a1d2e] border border-white/10 rounded-lg px-1.5 py-1 text-white text-[11px] outline-none focus:border-orange-500/60 max-w-[110px]"
                    >
                      <option value="">Catégorie...</option>
                      {mergedCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <select
                      value={quickAdd.issue_label}
                      onChange={(e) => setQuickAdd({ ...quickAdd, issue_label: e.target.value })}
                      disabled={!quickAdd.category_id}
                      className="bg-[#1a1d2e] border border-white/10 rounded-lg px-1.5 py-1 text-white text-[11px] outline-none focus:border-orange-500/60 disabled:opacity-40 flex-1 min-w-0"
                    >
                      <option value="">Panne...</option>
                      {mergedCategories.find((c) => c.id === quickAdd.category_id)?.issues.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                    <input
                      type="number" min="0" placeholder="min"
                      value={quickAdd.price_min}
                      onChange={(e) => setQuickAdd({ ...quickAdd, price_min: e.target.value })}
                      className="w-12 bg-[#1a1d2e] border border-white/10 rounded-lg px-1.5 py-1 text-white text-[11px] outline-none focus:border-orange-500/60"
                    />
                    <input
                      type="number" min="0" placeholder="max"
                      value={quickAdd.price_max}
                      onChange={(e) => setQuickAdd({ ...quickAdd, price_max: e.target.value })}
                      className="w-12 bg-[#1a1d2e] border border-white/10 rounded-lg px-1.5 py-1 text-white text-[11px] outline-none focus:border-orange-500/60"
                    />
                    <button type="button" onClick={handleQuickAdd} disabled={quickAddSaving}
                      className="shrink-0 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-lg p-1.5 transition">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">📱 Modèle(s) cible(s)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={dupTargetInput}
                    onChange={(e) => handleDupTargetInput(e.target.value)}
                    onFocus={() => { if (dupTargetSuggestions.length > 0) setShowDupSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowDupSuggestions(false), 150)}
                    placeholder="Ex: Apple iPhone 15 Pro Max A2849"
                    className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/60"
                  />
                  {showDupSuggestions && dupTargetSuggestions.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-[#16161d] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                      {dupTargetSuggestions.map((d, i) => (
                        <div key={i} onMouseDown={() => { setDupTargetInput(d); setShowDupSuggestions(false); }}
                          className="px-3 py-2.5 hover:bg-orange-500/10 cursor-pointer text-sm text-gray-200 border-b border-white/5 last:border-0">
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={addDupTarget} title="Ajouter ce modèle cible"
                  className="shrink-0 bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40 text-gray-300 hover:text-orange-300 rounded-xl px-3 transition">
                  <Plus size={16} />
                </button>
              </div>
              {dupTargets.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {dupTargets.map((m) => (
                    <span key={m} className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/25 text-orange-300 text-xs rounded-full px-3 py-1">
                      {m}
                      <button type="button" onClick={() => removeDupTarget(m)} className="hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {dupError && <p className="text-xs text-red-400">{dupError}</p>}
            {dupSuccess && <p className="text-xs text-green-400">✅ {dupSuccess}</p>}
            <button type="button" onClick={handleDuplicate} disabled={dupSaving}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-95">
              <Copy size={16} /> {dupSaving ? "Duplication..." : "Dupliquer"}
            </button>
          </div>
        )}

        <div className="bg-[#16161d] border border-white/5 rounded-2xl p-3 mb-4 flex items-center gap-2">
          <Search size={14} className="text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un modèle ou une panne..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
          />
        </div>

        {grouped.length === 0 ? (
          <div className="text-center text-gray-600 py-16 bg-[#16161d] border border-white/5 rounded-2xl text-sm">
            Aucun tarif configuré. {isGerant ? "Ajoutez-en un avec le formulaire ci-dessus." : ""}
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(([model, items]) => (
              <div key={model} className="bg-[#16161d] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/15">
                  <span className="text-sm font-semibold text-orange-300">📱 {model}</span>
                </div>
                <div className="divide-y divide-white/5">
                  {items.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="text-sm text-gray-300">{r.issue_label}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-green-400">{r.price_min}€ – {r.price_max}€</span>
                        {isGerant && (
                          <button onClick={() => handleDelete(r.id)} className="text-gray-500 hover:text-red-400 transition p-1" title="Supprimer">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCatalogManager && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => { setShowCatalogManager(false); setManagingCategoryId(null); setEditingCategoryId(null); setEditingIssueKey(null); }}>
          <div className="bg-[#16161d] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#16161d] flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                {managingCategoryId && (
                  <button onClick={() => setManagingCategoryId(null)} className="text-gray-400 hover:text-white">←</button>
                )}
                <h2 className="text-sm font-bold text-white">
                  {managingCategoryId ? mergedCategories.find((c) => c.id === managingCategoryId)?.label : "Catégories / pannes"}
                </h2>
              </div>
              <button onClick={() => { setShowCatalogManager(false); setManagingCategoryId(null); }} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-3 space-y-1.5">
              {!managingCategoryId ? (
                <>
                  {mergedCategories.map((cat) => (
                    <div key={cat.id} className="bg-white/3 rounded-xl px-3 py-2.5">
                      {editingCategoryId === cat.id ? (
                        <div className="flex items-center gap-1.5">
                          <input autoFocus value={editingCategoryLabel} onChange={(e) => setEditingCategoryLabel(e.target.value)}
                            className="flex-1 bg-[#1a1d2e] border border-blue-500/40 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none" />
                          <button onClick={() => confirmEditCategory(cat)} className="text-green-400 hover:text-green-300 p-1"><Check size={14} /></button>
                          <button onClick={() => setEditingCategoryId(null)} className="text-gray-500 hover:text-red-400 p-1"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <button onClick={() => setManagingCategoryId(cat.id)} className="flex-1 text-left text-sm text-gray-200 hover:text-white">
                            {cat.label} <span className="text-gray-600 text-xs">({cat.issues.length})</span>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEditCategory(cat)} title="Modifier" className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={13} /></button>
                            <button onClick={() => handleDeleteCategory(cat)} title="Supprimer" className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-1.5 pt-1">
                    <input value={newCategoryForManager} onChange={(e) => setNewCategoryForManager(e.target.value)}
                      placeholder="Ex: 🎮 Boutons physiques"
                      className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm outline-none focus:border-blue-500/60" />
                    <button onClick={handleAddCategoryFromManager} className="shrink-0 bg-blue-500 hover:bg-blue-400 text-white rounded-lg px-3 text-sm font-bold transition">
                      <Plus size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {mergedCategories.find((c) => c.id === managingCategoryId)?.issues.map((issueLabel) => {
                    const key = `${managingCategoryId}::${issueLabel}`;
                    return (
                      <div key={issueLabel} className="bg-white/3 rounded-xl px-3 py-2.5">
                        {editingIssueKey === key ? (
                          <div className="flex items-center gap-1.5">
                            <input autoFocus value={editingIssueLabel} onChange={(e) => setEditingIssueLabel(e.target.value)}
                              className="flex-1 bg-[#1a1d2e] border border-blue-500/40 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none" />
                            <button onClick={() => confirmEditIssue(managingCategoryId, issueLabel)} className="text-green-400 hover:text-green-300 p-1"><Check size={14} /></button>
                            <button onClick={() => setEditingIssueKey(null)} className="text-gray-500 hover:text-red-400 p-1"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="flex-1 text-sm text-gray-200">{issueLabel}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => startEditIssue(managingCategoryId, issueLabel)} title="Modifier" className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={13} /></button>
                              <button onClick={() => handleDeleteIssue(managingCategoryId, issueLabel)} title="Supprimer" className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex gap-1.5 pt-1">
                    <input value={newIssueForManager} onChange={(e) => setNewIssueForManager(e.target.value)}
                      placeholder="Ex: Vibreur"
                      className="flex-1 bg-[#1a1d2e] border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm outline-none focus:border-blue-500/60" />
                    <button onClick={() => handleAddIssueFromManager(managingCategoryId)} className="shrink-0 bg-blue-500 hover:bg-blue-400 text-white rounded-lg px-3 text-sm font-bold transition">
                      <Plus size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
