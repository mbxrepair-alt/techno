"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Layout from "../../components/Layout";
import { DEVICES_LIST, ISSUE_CATEGORIES, SCREEN_QUALITIES } from "../../lib/devices-catalog";
import { Tag, Plus, Trash2, Search, Copy } from "lucide-react";

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

  const [form, setForm] = useState({ device_model: "", category_id: "", issue_label: "", price_min: "", price_max: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deviceSuggestions, setDeviceSuggestions] = useState<string[]>([]);
  const [showDeviceSuggestions, setShowDeviceSuggestions] = useState(false);

  // Modèles supplémentaires pour appliquer le même tarif à plusieurs appareils d'un coup
  const [extraModels, setExtraModels] = useState<string[]>([]);

  // Qualité d'écran (uniquement si la panne choisie est "Changement d'écran")
  const [screenQuality, setScreenQuality] = useState("");

  // ─── Duplication des tarifs d'un modèle vers d'autres modèles ─────────────
  const [dupSource, setDupSource] = useState("");
  const [dupTargetInput, setDupTargetInput] = useState("");
  const [dupTargets, setDupTargets] = useState<string[]>([]);
  const [dupTargetSuggestions, setDupTargetSuggestions] = useState<string[]>([]);
  const [showDupSuggestions, setShowDupSuggestions] = useState(false);
  const [dupSaving, setDupSaving] = useState(false);
  const [dupError, setDupError] = useState("");
  const [dupSuccess, setDupSuccess] = useState("");

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
    const min = parseFloat(form.price_min);
    const max = parseFloat(form.price_max);
    const models = Array.from(new Set([...extraModels, form.device_model.trim()].filter(Boolean)));
    const isScreenChange = form.issue_label === "Changement d'écran";
    if (isScreenChange && !screenQuality) { setError("Choisissez la qualité de l'écran."); return; }
    const finalIssueLabel = isScreenChange ? `Changement d'écran - ${screenQuality}` : form.issue_label.trim();
    if (models.length === 0 || !finalIssueLabel) { setError("Modèle(s) et panne sont requis."); return; }
    if (isNaN(min) || isNaN(max) || min < 0 || max < min) { setError("Prix invalide (min doit être ≤ max)."); return; }

    setSaving(true);
    try {
      const { error: upsertError } = await supabase.from("panne_prices").upsert(
        models.map((device_model) => ({
          company_id: userId,
          device_model,
          issue_label: finalIssueLabel,
          price_min: min,
          price_max: max,
        })),
        { onConflict: "company_id,device_model,issue_label" }
      );
      if (upsertError) throw upsertError;
      setForm({ device_model: "", category_id: "", issue_label: "", price_min: "", price_max: "" });
      setExtraModels([]);
      setScreenQuality("");
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">🗂️ Catégorie</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value, issue_label: "" })}
                  className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/60"
                >
                  <option value="">— Choisir une catégorie —</option>
                  {ISSUE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">🔧 Panne</label>
                <select
                  value={form.issue_label}
                  onChange={(e) => { setForm({ ...form, issue_label: e.target.value }); setScreenQuality(""); }}
                  disabled={!form.category_id}
                  className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/60 disabled:opacity-40"
                >
                  <option value="">— Choisir une panne —</option>
                  {ISSUE_CATEGORIES.find((c) => c.id === form.category_id)?.issues.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              {form.issue_label === "Changement d'écran" && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">✨ Qualité de l&apos;écran</label>
                  <select
                    value={screenQuality}
                    onChange={(e) => setScreenQuality(e.target.value)}
                    className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/60"
                  >
                    <option value="">— Choisir la qualité —</option>
                    {SCREEN_QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">💰 Prix min (€)</label>
                <input type="number" min="0" step="1" value={form.price_min} onChange={(e) => setForm({ ...form, price_min: e.target.value })}
                  placeholder="60" className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/60" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">💰 Prix max (€)</label>
                <input type="number" min="0" step="1" value={form.price_max} onChange={(e) => setForm({ ...form, price_max: e.target.value })}
                  placeholder="120" className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/60" />
              </div>
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
                <div className="mt-2 bg-white/3 rounded-xl p-3 space-y-1.5">
                  {rows.filter((r) => r.device_model === dupSource).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">{r.issue_label}</span>
                      <span className="text-green-400 font-semibold shrink-0">{r.price_min}€ – {r.price_max}€</span>
                    </div>
                  ))}
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
    </Layout>
  );
}
