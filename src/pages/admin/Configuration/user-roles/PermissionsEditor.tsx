import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSIONS, groupPermissions } from "@/config/permissions";
import { formatPermissionLabel, RESOURCE_LABELS } from "@/config/permissionLabels";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  query?: string;
  readOnly?: boolean;
  // Permissions that must stay enabled and cannot be toggled off (e.g. the admin
  // floor). Rendered as checked + disabled even when the editor is editable.
  lockedPermissions?: string[];
};

export default function PermissionsEditor({ value, onChange, query = "", readOnly = false, lockedPermissions = [] }: Props) {
  const lockedSet = React.useMemo(() => new Set(lockedPermissions), [lockedPermissions]);
  const isLocked = (p: string) => lockedSet.has(p);
  const grouped = React.useMemo(() => groupPermissions(PERMISSIONS), []);
  const filteredGrouped = React.useMemo(() => {
    if (!query) return grouped;
    const q = query.toLowerCase();
    const out: Record<string, string[]> = {};
    for (const k of Object.keys(grouped)) {
      const items = grouped[k].filter((p) => {
        const key = p.toLowerCase();
        const label = formatPermissionLabel(p).toLowerCase();
        const groupLabel = (RESOURCE_LABELS[k] ?? k).toLowerCase();
        return key.includes(q) || label.includes(q) || groupLabel.includes(q);
      });
      if (items.length) out[k] = items;
    }
    return out;
  }, [grouped, query]);

  // ocultar grupos específicos (no mostrar en la UI)
  const HIDDEN_GROUPS = React.useMemo(() => new Set(["tenant", "plan"]), [] as unknown as string[]);

  const toggle = (p: string, checked: boolean) => {
    if (readOnly || isLocked(p)) return;
    if (checked) onChange(Array.from(new Set([...value, p])));
    else onChange(value.filter((x) => x !== p));
  };

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggleCollapse = (g: string) => setCollapsed((s) => ({ ...s, [g]: !s[g] }));

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          Este rol está bloqueado. No se pueden modificar los permisos predeterminados.
        </div>
      )}
      {Object.keys(filteredGrouped).length === 0 ? (
        <div className="text-sm text-muted-foreground">No se encontraron permisos</div>
      ) : (
        Object.keys(filteredGrouped)
          .filter((g) => !HIDDEN_GROUPS.has(g))
          .map((group) => {
          const items = filteredGrouped[group];
          const allSelected = items.every((p) => value.includes(p));
          return (
            <div key={group} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCollapse(group)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleCollapse(group);
                    }
                  }}
                  className="cursor-pointer"
                  aria-expanded={!collapsed[group]}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{RESOURCE_LABELS[group] ?? group}</div>
                    <div className="text-xs text-muted-foreground">{items.length} permisos</div>
                    <div className="text-sm text-muted-foreground">{collapsed[group] ? '►' : '▼'}</div>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <span className="text-sm">Seleccionar todo</span>
                  <Checkbox
                    checked={allSelected}
                    disabled={readOnly}
                    onCheckedChange={(v) => {
                      if (readOnly) return;
                      if (v) onChange(Array.from(new Set([...value, ...items])));
                      // keep locked permissions selected when deselecting a group
                      else onChange(value.filter((x) => !items.includes(x) || isLocked(x)));
                    }}
                  />
                </label>
              </div>
              {!collapsed[group] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {items.map((p) => (
                    <div
                      key={p}
                      className={"flex items-start gap-3 p-2 rounded-xl transition-colors " + (readOnly ? "bg-muted/40" : "hover:bg-muted/60")}
                      title={isLocked(p) ? "Requerido para el acceso de administrador" : undefined}
                    >
                      <Checkbox checked={value.includes(p) || isLocked(p)} disabled={readOnly || isLocked(p)} onCheckedChange={(v) => toggle(p, Boolean(v))} />
                      <div className="min-w-0">
                        <div className="text-sm truncate">
                          {formatPermissionLabel(p)}
                          {isLocked(p) && <span className="ml-1 text-[10px] uppercase text-amber-600">obligatorio</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{p}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
