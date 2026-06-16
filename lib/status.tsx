import {
  Inbox,
  Microscope,
  CircleCheck,
  Hourglass,
  KeyRound,
  PackageSearch,
  Wrench,
  XCircle,
  Ban,
  BadgeCheck,
  PackageCheck,
  Send,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";

export interface StatusMeta {
  /** Libellé court sans emoji */
  label: string;
  /** Icône lucide associée */
  Icon: LucideIcon;
  /** Couleur Tailwind de base (ex: "amber", "blue") */
  tone: string;
}

/**
 * Source de vérité unique : statut stocké en base (avec emoji) -> métadonnées d'affichage.
 * On NE change PAS les chaînes stockées en base, on remplace seulement l'emoji par une icône lucide à l'affichage.
 */
export const STATUS_META: Record<string, StatusMeta> = {
  "📤 Envoyé à l'atelier": { label: "Envoyé à l'atelier", Icon: Send, tone: "blue" },
  "📥 Réceptionné": { label: "Réceptionné", Icon: Inbox, tone: "amber" },
  "🔬 Diagnostic": { label: "Diagnostic", Icon: Microscope, tone: "blue" },
  "✅ Validé client": { label: "Validé client", Icon: CircleCheck, tone: "emerald" },
  "⏳ Attente validation client": { label: "Attente validation client", Icon: Hourglass, tone: "orange" },
  "🔐 Mot de passe incorrect": { label: "Mot de passe incorrect", Icon: KeyRound, tone: "red" },
  "📦 Attente pièce": { label: "Attente pièce", Icon: PackageSearch, tone: "purple" },
  "🔧 En réparation": { label: "En réparation", Icon: Wrench, tone: "orange" },
  "❌ KO": { label: "KO - Irréparable", Icon: XCircle, tone: "red" },
  "🚫 Refus client": { label: "Refus client", Icon: Ban, tone: "pink" },
  "✅ Terminé": { label: "Terminé", Icon: BadgeCheck, tone: "green" },
  "📦 Rendu": { label: "Rendu", Icon: PackageCheck, tone: "gray" },
};

/** Retourne les métadonnées d'un statut (fallback générique si inconnu). */
export function getStatusMeta(status?: string | null): StatusMeta {
  if (status && STATUS_META[status]) return STATUS_META[status];
  return { label: status?.replace(/^[^\p{L}\p{N}]+/u, "").trim() || "Inconnu", Icon: CircleHelp, tone: "gray" };
}

/** Libellé sans emoji. */
export function getStatusLabel(status?: string | null): string {
  return getStatusMeta(status).label;
}

/** Icône lucide d'un statut, prête à rendre : <StatusIcon status={...} size={16} /> */
export function StatusIcon({
  status,
  size = 16,
  className = "",
}: {
  status?: string | null;
  size?: number;
  className?: string;
}) {
  const { Icon } = getStatusMeta(status);
  return <Icon size={size} className={className} />;
}

/** Couleurs par tonalité pour le style "contour lumineux" (badge transparent + bord qui glow). */
const TONE_STYLE: Record<string, { border: string; text: string; glow: string }> = {
  blue: { border: "#378ADD", text: "#7cc0f5", glow: "rgba(55,138,221,0.55)" },
  amber: { border: "#EF9F27", text: "#f5c172", glow: "rgba(239,159,39,0.55)" },
  orange: { border: "#f97316", text: "#fdba74", glow: "rgba(249,115,22,0.55)" },
  emerald: { border: "#10b981", text: "#6ee7b7", glow: "rgba(16,185,129,0.55)" },
  green: { border: "#97C459", text: "#a9da6f", glow: "rgba(151,196,89,0.55)" },
  red: { border: "#E24B4A", text: "#f09595", glow: "rgba(226,75,74,0.55)" },
  purple: { border: "#7f77dd", text: "#b4a9ec", glow: "rgba(127,119,221,0.55)" },
  pink: { border: "#D4537E", text: "#ED93B1", glow: "rgba(212,83,126,0.55)" },
  gray: { border: "#888780", text: "#cbd5e1", glow: "rgba(136,135,128,0.5)" },
};

/**
 * Badge de statut style "contour lumineux" (N) : fond transparent, bordure colorée qui glow,
 * icône + libellé colorés. Taille "sm" pour les listes, "md" pour les en-têtes.
 */
export function StatusBadge({
  status,
  size = "sm",
  className = "",
}: {
  status?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const { Icon, tone } = getStatusMeta(status);
  const c = TONE_STYLE[tone] || TONE_STYLE.gray;
  const dims =
    size === "md"
      ? { padding: "6px 14px", fontSize: 13, icon: 15, gap: 7 }
      : { padding: "3px 9px", fontSize: 11, icon: 12, gap: 5 };
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${className}`}
      style={{
        gap: dims.gap,
        padding: dims.padding,
        fontSize: dims.fontSize,
        color: c.text,
        border: `1.5px solid ${c.border}`,
        background: "transparent",
        boxShadow: `0 0 9px ${c.glow}, inset 0 0 7px ${c.glow.replace("0.55", "0.22").replace("0.5", "0.2")}`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={dims.icon} />
      {getStatusLabel(status)}
    </span>
  );
}
