"use client";

import { useState, useEffect, useCallback } from "react";

interface CatalogState {
  customIssues: string[];
  hiddenIssues: string[];
  customDevices: string[];
  loading: boolean;
}

export function useCatalog() {
  const [state, setState] = useState<CatalogState>({
    customIssues: [],
    hiddenIssues: [],
    customDevices: [],
    loading: true,
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog");
      const data = await res.json();
      if (data.success) {
        setState({
          customIssues: data.customIssues ?? [],
          hiddenIssues: data.hiddenIssues ?? [],
          customDevices: data.customDevices ?? [],
          loading: false,
        });
      }
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addIssue = async (label: string) => {
    await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "issue", label }),
    });
    await load();
  };

  const addDevice = async (label: string) => {
    await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "device", label }),
    });
    await load();
  };

  const hideIssue = async (label: string) => {
    await fetch("/api/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, hidden: true }),
    });
    await load();
  };

  const showIssue = async (label: string) => {
    await fetch("/api/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, hidden: false }),
    });
    await load();
  };

  const deleteIssue = async (label: string) => {
    await fetch("/api/catalog", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "issue", label }),
    });
    await load();
  };

  const deleteDevice = async (label: string) => {
    await fetch("/api/catalog", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "device", label }),
    });
    await load();
  };

  return {
    ...state,
    reload: load,
    addIssue,
    addDevice,
    hideIssue,
    showIssue,
    deleteIssue,
    deleteDevice,
  };
}
