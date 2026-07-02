import React from "react";
import { PERMISSIONS, groupPermissions, ADMIN_FLOOR_PERMISSIONS } from "@/config/permissions";
import { formatPermissionLabel, RESOURCE_LABELS } from "@/config/permissionLabels";

export type Overrides = { grant: string[]; deny: string[] };

type Props = {
  // Permissions the user inherits from their selected role(s).
  rolePermissions: string[];
  // Slug of the selected role — used to lock the admin floor.
  roleSlug?: string;
  grant: string[];
  deny: string[];
  onChange: (next: Overrides) => void;
  query?: string;
  disabled?: boolean;
};

const HIDDEN_GROUPS = new Set(["tenant", "plan"]);

export default function UserPermissionOverrides({
  rolePermissions,
  roleSlug,
  grant,
  deny,
  onChange,
  query = "",
  disabled = false,
}: Props) {
  const inherited = React.useMemo(() => new Set(rolePermissions), [rolePermissions]);
  const grantSet = React.useMemo(() => new Set(grant), [grant]);
  const denySet = React.useMemo(() => new Set(deny), [deny]);
  const isAdmin = String(roleSlug || "").toLowerCase() === "admin";
  const isFloor = (p: string) => isAdmin && ADMIN_FLOOR_PERMISSIONS.includes(p);

  const grouped = React.useMemo(() => groupPermissions(PERMISSIONS), []);
  const filtered = React.useMemo(() => {
    if (!query) return grouped;
    const q = query.toLowerCase();
    const out: Record<string, string[]> = {};
    for (const k of Object.keys(grouped)) {
      const items = grouped[k].filter((p) => {
        const label = formatPermissionLabel(p).toLowerCase();
        const groupLabel = (RESOURCE_LABELS[k] ?? k).toLowerCase();
        return p.toLowerCase().includes(q) || label.includes(q) || groupLabel.includes(q);
      });
      if (items.length) out[k] = items;
    }
    return out;
  }, [grouped, query]);

  // Cycle: inherited → grant → deny → inherited. Floor perms can't be denied.
  const cycle = (p: string) => {
    if (disabled) return;
    const nextGrant = new Set(grantSet);
    const nextDeny = new Set(denySet);
    if (grantSet.has(p)) {
      nextGrant.delete(p);
      if (!isFloor(p)) nextDeny.add(p); // grant → deny (skip for floor)
    } else if (denySet.has(p)) {
      nextDeny.delete(p); // deny → inherited
    } else {
      nextGrant.add(p); // inherited → grant
    }
    onChange({ grant: Array.from(nextGrant), deny: Array.from(nextDeny) });
  };

  const stateOf = (p: string): { label: string; cls: string } => {
    if (denySet.has(p)) return { label: "Denegado", cls: "bg-red-100 text-red-700 border-red-300" };
    if (grantSet.has(p)) return { label: "Concedido", cls: "bg-green-100 text-green-700 border-green-300" };
    if (isFloor(p)) return { label: "Obligatorio", cls: "bg-amber-100 text-amber-700 border-amber-300" };
    return inherited.has(p)
      ? { label: "Heredado ✓", cls: "bg-slate-100 text-slate-600 border-slate-300" }
      : { label: "Heredado ✗", cls: "bg-slate-50 text-slate-400 border-slate-200" };
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Haz clic en un permiso para alternar entre heredado del rol, concedido (+) y denegado (−).
        Lo denegado tiene prioridad sobre el rol.
      </p>
      {Object.keys(filtered).length === 0 ? (
        <div className="text-sm text-muted-foreground">No se encontraron permisos</div>
      ) : (
        Object.keys(filtered)
          .filter((g) => !HIDDEN_GROUPS.has(g))
          .map((group) => (
            <div key={group} className="rounded-2xl border bg-card dark:bg-[#202020] p-4 shadow-sm">
              <div className="text-sm font-semibold mb-3 tracking-tight">{RESOURCE_LABELS[group] ?? group}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered[group].map((p) => {
                  const st = stateOf(p);
                  return (
                    <button
                      type="button"
                      key={p}
                      disabled={disabled}
                      onClick={() => cycle(p)}
                      title={isFloor(p) ? "Requerido para el acceso de administrador (no se puede denegar)" : p}
                      className={"flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition " + (disabled ? "opacity-60 cursor-not-allowed " : "hover:bg-primary/5 hover:border-primary/30 dark:hover:bg-[#2a2a2a] ")}
                    >
                      <span className="min-w-0 truncate text-sm">{formatPermissionLabel(p)}</span>
                      <span className={"shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold " + st.cls}>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
