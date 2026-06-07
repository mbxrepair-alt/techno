// lib/suggestions.js
import { supabase, getCurrentUser } from "./supabase";

// ============================================================
// APPAREILS
// ============================================================

export const saveDeviceSuggestion = async (deviceName) => {
  if (!deviceName || deviceName.trim() === "") return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    const { data: existing } = await supabase
      .from("device_suggestions")
      .select("id, usage_count")
      .eq("name", deviceName.trim())
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("device_suggestions")
        .update({
          usage_count: existing.usage_count + 1,
          last_used: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("device_suggestions").insert({
        name: deviceName.trim(),
        user_id: user.id,
      });
    }
  } catch (error) {
    console.error("Erreur sauvegarde appareil:", error);
  }
};

export const getDeviceSuggestions = async () => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("device_suggestions")
    .select("name")
    .eq("user_id", user.id)
    .order("usage_count", { ascending: false })
    .order("last_used", { ascending: false })
    .limit(30);

  return data?.map((d) => d.name) || [];
};

export const deleteDeviceSuggestion = async (deviceName) => {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from("device_suggestions").delete().eq("name", deviceName).eq("user_id", user.id);
};

// ============================================================
// PANNES
// ============================================================

export const saveIssueSuggestion = async (issueName) => {
  if (!issueName || issueName.trim() === "") return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    const { data: existing } = await supabase
      .from("issue_suggestions")
      .select("id, usage_count")
      .eq("name", issueName.trim())
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("issue_suggestions")
        .update({
          usage_count: existing.usage_count + 1,
          last_used: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("issue_suggestions").insert({
        name: issueName.trim(),
        user_id: user.id,
      });
    }
  } catch (error) {
    console.error("Erreur sauvegarde panne:", error);
  }
};

export const getIssueSuggestions = async () => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("issue_suggestions")
    .select("name")
    .eq("user_id", user.id)
    .order("usage_count", { ascending: false })
    .order("last_used", { ascending: false })
    .limit(30);

  return data?.map((d) => d.name) || [];
};

export const deleteIssueSuggestion = async (issueName) => {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from("issue_suggestions").delete().eq("name", issueName).eq("user_id", user.id);
};

// ============================================================
// DIAGNOSTICS
// ============================================================

export const saveDiagnosisSuggestion = async (diagnosis) => {
  if (!diagnosis || diagnosis.trim() === "") return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    const { data: existing } = await supabase
      .from("diagnosis_suggestions")
      .select("id, usage_count")
      .eq("name", diagnosis.trim())
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("diagnosis_suggestions")
        .update({
          usage_count: existing.usage_count + 1,
          last_used: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("diagnosis_suggestions").insert({
        name: diagnosis.trim(),
        user_id: user.id,
      });
    }
  } catch (error) {
    console.error("Erreur sauvegarde diagnostic:", error);
  }
};

export const getDiagnosisSuggestions = async () => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("diagnosis_suggestions")
    .select("name")
    .eq("user_id", user.id)
    .order("usage_count", { ascending: false })
    .order("last_used", { ascending: false })
    .limit(30);

  return data?.map((d) => d.name) || [];
};

export const deleteDiagnosisSuggestion = async (diagnosis) => {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase
    .from("diagnosis_suggestions")
    .delete()
    .eq("name", diagnosis)
    .eq("user_id", user.id);
};

// ============================================================
// RÉPARATIONS EFFECTUÉES
// ============================================================

export const saveRepairDescSuggestion = async (description) => {
  if (!description || description.trim() === "") return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    const { data: existing } = await supabase
      .from("repair_desc_suggestions")
      .select("id, usage_count")
      .eq("name", description.trim())
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("repair_desc_suggestions")
        .update({
          usage_count: existing.usage_count + 1,
          last_used: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("repair_desc_suggestions").insert({
        name: description.trim(),
        user_id: user.id,
      });
    }
  } catch (error) {
    console.error("Erreur sauvegarde réparation:", error);
  }
};

export const getRepairDescSuggestions = async () => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("repair_desc_suggestions")
    .select("name")
    .eq("user_id", user.id)
    .order("usage_count", { ascending: false })
    .order("last_used", { ascending: false })
    .limit(30);

  return data?.map((d) => d.name) || [];
};

export const deleteRepairDescSuggestion = async (description) => {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase
    .from("repair_desc_suggestions")
    .delete()
    .eq("name", description)
    .eq("user_id", user.id);
};
