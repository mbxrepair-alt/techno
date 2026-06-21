import { supabase } from "./supabase";
import { ISSUE_CATEGORIES, IssueCategory } from "./devices-catalog";

export interface CustomCategoryRow {
  id: number;
  company_id: string;
  label: string;
}

export interface CustomIssueRow {
  id: number;
  company_id: string;
  category_id: string;
  issue_label: string;
}

export interface HiddenItemRow {
  id: number;
  company_id: string;
  category_id: string;
  issue_label: string | null;
}

export async function fetchCustomCatalog(companyId: string) {
  const [{ data: categories }, { data: issues }, { data: hidden }] = await Promise.all([
    supabase.from("custom_panne_categories").select("*").eq("company_id", companyId),
    supabase.from("custom_panne_issues").select("*").eq("company_id", companyId),
    supabase.from("hidden_panne_items").select("*").eq("company_id", companyId),
  ]);
  return {
    customCategories: (categories || []) as CustomCategoryRow[],
    customIssues: (issues || []) as CustomIssueRow[],
    hiddenItems: (hidden || []) as HiddenItemRow[],
  };
}

/** Fusionne les catégories standard avec les catégories/pannes personnalisées de l'atelier, en retirant les éléments masqués */
export function buildMergedCategories(
  customCategories: CustomCategoryRow[],
  customIssues: CustomIssueRow[],
  hiddenItems: HiddenItemRow[] = []
): IssueCategory[] {
  const isCategoryHidden = (categoryId: string) => hiddenItems.some((h) => h.category_id === categoryId && h.issue_label === null);
  const isIssueHidden = (categoryId: string, issueLabel: string) => hiddenItems.some((h) => h.category_id === categoryId && h.issue_label === issueLabel);

  const merged: IssueCategory[] = ISSUE_CATEGORIES.filter((c) => !isCategoryHidden(c.id)).map((c) => ({
    ...c,
    issues: [
      ...c.issues.filter((i) => !isIssueHidden(c.id, i)),
      ...customIssues.filter((i) => i.category_id === c.id).map((i) => i.issue_label),
    ],
  }));
  customCategories
    .filter((cc) => !isCategoryHidden(`custom_${cc.id}`))
    .forEach((cc) => {
      const catId = `custom_${cc.id}`;
      merged.push({
        id: catId,
        label: `🆕 ${cc.label}`,
        issues: customIssues.filter((i) => i.category_id === catId).map((i) => i.issue_label),
      });
    });
  return merged;
}

export const isCustomCategoryId = (id: string) => id.startsWith("custom_");

export async function addCustomCategory(companyId: string, label: string): Promise<CustomCategoryRow> {
  const { data, error } = await supabase
    .from("custom_panne_categories")
    .insert({ company_id: companyId, label })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeCustomCategory(id: number) {
  const categoryId = `custom_${id}`;
  await supabase.from("custom_panne_issues").delete().eq("category_id", categoryId);
  await supabase.from("custom_panne_categories").delete().eq("id", id);
}

export async function renameCustomCategory(id: number, newLabel: string) {
  await supabase.from("custom_panne_categories").update({ label: newLabel }).eq("id", id);
}

export async function addCustomIssue(companyId: string, categoryId: string, issueLabel: string): Promise<CustomIssueRow> {
  const { data, error } = await supabase
    .from("custom_panne_issues")
    .insert({ company_id: companyId, category_id: categoryId, issue_label: issueLabel })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeCustomIssue(id: number) {
  await supabase.from("custom_panne_issues").delete().eq("id", id);
}

export async function renameCustomIssue(id: number, newLabel: string) {
  await supabase.from("custom_panne_issues").update({ issue_label: newLabel }).eq("id", id);
}

/** Masque une catégorie standard pour cet atelier (ne supprime rien globalement) */
export async function hideBuiltinCategory(companyId: string, categoryId: string) {
  await supabase.from("hidden_panne_items").insert({ company_id: companyId, category_id: categoryId, issue_label: null });
}

/** Masque une panne standard (d'une catégorie standard ou perso) pour cet atelier */
export async function hideBuiltinIssue(companyId: string, categoryId: string, issueLabel: string) {
  return supabase.from("hidden_panne_items").insert({ company_id: companyId, category_id: categoryId, issue_label: issueLabel });
}

/** Renomme une catégorie standard : la masque et recrée une catégorie perso équivalente avec ses pannes */
export async function renameBuiltinCategory(companyId: string, categoryId: string, currentLabel: string, currentIssues: string[], newLabel: string) {
  await hideBuiltinCategory(companyId, categoryId);
  const newCat = await addCustomCategory(companyId, newLabel);
  const newCategoryId = `custom_${newCat.id}`;
  for (const issue of currentIssues) {
    await addCustomIssue(companyId, newCategoryId, issue);
  }
  return newCategoryId;
}

/** Renomme une panne standard : la masque et ajoute une panne perso équivalente dans la même catégorie */
export async function renameBuiltinIssue(companyId: string, categoryId: string, oldLabel: string, newLabel: string) {
  await hideBuiltinIssue(companyId, categoryId, oldLabel);
  await addCustomIssue(companyId, categoryId, newLabel);
}
