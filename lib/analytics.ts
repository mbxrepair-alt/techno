export type AnalyticsEventType = "site_visit" | "pro_visit" | "tech_login" | "app_install";

interface ClientInfo {
  os?: string;
  browser?: string;
  device_type?: string;
  is_standalone?: boolean;
  user_agent?: string;
}

/** Détecte OS / navigateur / type d'appareil / mode application à partir du user-agent. */
function detectClient(): ClientInfo {
  if (typeof navigator === "undefined") return {};
  const ua = navigator.userAgent;

  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches) ||
    // @ts-expect-error iOS Safari
    navigator.standalone === true;

  let os = "Autre";
  if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Autre";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";

  const device_type = /mobile|iphone|ipod/i.test(ua) && !/ipad|tablet/i.test(ua)
    ? "mobile"
    : /ipad|tablet|android(?!.*mobile)/i.test(ua)
      ? "tablette"
      : "ordinateur";

  return { os, browser, device_type, is_standalone: !!isStandalone, user_agent: ua };
}

/**
 * Enregistre un événement analytics via la route serveur /api/track
 * (le serveur ajoute l'IP réelle et le nom de l'appareil). Silencieux en cas d'erreur.
 */
export async function trackEvent(
  eventType: AnalyticsEventType,
  extra: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const client = detectClient();
    const companyId = localStorage.getItem("company_id") || null;
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_type: eventType,
        path: window.location.pathname,
        referrer: document.referrer || null,
        company_id: companyId,
        ...client,
        ...extra,
      }),
    });
  } catch {
    // silencieux : le tracking ne doit jamais casser l'app
  }
}

/** Enregistre un événement au plus une fois par session navigateur. */
export function trackOncePerSession(
  key: string,
  eventType: AnalyticsEventType,
  extra: Record<string, unknown> = {},
): void {
  try {
    const flag = `analytics_${key}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
  } catch {
    // sessionStorage indisponible → on log quand même
  }
  void trackEvent(eventType, extra);
}
