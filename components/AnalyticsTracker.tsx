"use client";

import { useEffect } from "react";
import { trackEvent, trackOncePerSession } from "../lib/analytics";

/** Traque les visites du site et les installations de l'app (monté dans le layout racine). */
export default function AnalyticsTracker() {
  useEffect(() => {
    // Visite du site (une fois par session)
    trackOncePerSession("site_visit", "site_visit");

    // App lancée en mode application (installée) → installation détectée une fois par session
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      navigator.standalone === true;
    if (standalone) trackOncePerSession("app_install", "app_install");

    // Événement natif d'installation (Android / Chrome)
    const onInstalled = () => trackEvent("app_install");
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}
