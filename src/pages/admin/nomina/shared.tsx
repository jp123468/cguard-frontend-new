import { getTenantTimezone } from "@/utils/tenantLocation";

/** Status → label + tailwind classes (brand-consistent pills). */
export const STATUS_META: Record<string, { label: string; cls: string }> = {
  on_time: { label: "A tiempo", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  late: { label: "Tarde", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  early_departure: { label: "Salida anticipada", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  missed_clockin: { label: "Sin entrada", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  missed_clockout: { label: "Sin salida", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  no_call_no_show: { label: "Inasistencia", cls: "bg-red-600/20 text-red-700 dark:text-red-400" },
  overtime: { label: "Tiempo extra", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  pending_review: { label: "En revisión", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  approved: { label: "Aprobado", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  rejected: { label: "Rechazado", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

/** guardShift.approvalStatus → label + pill classes. "none" (the DB default)
 *  means no approval was requested/needed — not a raw value to show the user. */
export const APPROVAL_META: Record<string, { label: string; cls: string }> = {
  none: { label: "Sin aprobación", cls: "bg-slate-400/15 text-slate-500" },
  pending: { label: "Pendiente", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  approved: { label: "Aprobada", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  rejected: { label: "Rechazada", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

/** Human label for an approval status (for text / CSV). */
export function approvalLabel(v: string | null | undefined): string {
  return (APPROVAL_META[v || "none"] || APPROVAL_META.none).label;
}

/** Colored pill for an approval status. */
export function ApprovalBadge({ status }: { status: string | null | undefined }) {
  const m = APPROVAL_META[status || "none"] || APPROVAL_META.none;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

export const EXCEPTION_LABEL: Record<string, string> = {
  late_arrival: "Llegada tarde",
  early_departure: "Salida anticipada",
  missed_clockin: "Sin marcar entrada",
  missed_clockout: "Sin marcar salida",
  no_call_no_show: "Inasistencia (no-show)",
  outside_geofence: "Fuera de geocerca",
  overtime: "Tiempo extra",
  correction_pending: "Corrección pendiente",
};

export const SEVERITY_META: Record<string, string> = {
  low: "bg-slate-400/15 text-slate-500",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  critical: "bg-red-600/20 text-red-700 dark:text-red-400",
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || { label: status, cls: "bg-slate-400/15 text-slate-500" };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: getTenantTimezone(),
    });
  } catch {
    return "—";
  }
}

export function fmtTime(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: getTenantTimezone(),
    });
  } catch {
    return "—";
  }
}

export function fmtHours(h: number | null | undefined): string {
  if (h == null) return "—";
  return `${Number(h).toFixed(2)} h`;
}
