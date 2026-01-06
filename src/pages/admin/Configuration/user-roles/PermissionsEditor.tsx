import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSIONS, groupPermissions } from "@/config/permissions";
import { formatPermissionLabel, RESOURCE_LABELS } from "@/config/permissionLabels";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  query?: string;
};

export default function PermissionsEditor({ value, onChange, query = "" }: Props) {
  const grouped = React.useMemo(() => groupPermissions(PERMISSIONS), []);
  const filteredGrouped = React.useMemo(() => {
    if (!query) return grouped;
    const q = query.toLowerCase();
    const out: Record<string, string[]> = {};
    for (const k of Object.keys(grouped)) {
      const items = grouped[k].filter((p) => p.toLowerCase().includes(q));
      if (items.length) out[k] = items;
    }
    return out;
  }, [grouped, query]);

  // ocultar grupos específicos (no mostrar en la UI)
  const HIDDEN_GROUPS = React.useMemo(() => new Set(["tenant", "plan"]), [] as unknown as string[]);

  const toggle = (p: string, checked: boolean) => {
    if (checked) onChange(Array.from(new Set([...value, p])));
    else onChange(value.filter((x) => x !== p));
  };

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggleCollapse = (g: string) => setCollapsed((s) => ({ ...s, [g]: !s[g] }));

  return (
    <div className="space-y-4">
      {Object.keys(filteredGrouped).length === 0 ? (
        <div className="text-sm text-muted-foreground">No se encontraron permisos</div>
      ) : (
        Object.keys(filteredGrouped)
          .filter((g) => !HIDDEN_GROUPS.has(g))
          .map((group) => {
          const items = filteredGrouped[group];
          const allSelected = items.every((p) => value.includes(p));
          return (
            <div key={group} className="rounded-lg border bg-white dark:bg-slate-800 p-4 shadow-sm">
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
                    onCheckedChange={(v) => {
                      if (v) onChange(Array.from(new Set([...value, ...items])));
                      else onChange(value.filter((x) => !items.includes(x)));
                    }}
                  />
                </label>
              </div>
              {!collapsed[group] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {items.map((p) => (
                    <div
                      key={p}
                      className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Checkbox checked={value.includes(p)} onCheckedChange={(v) => toggle(p, Boolean(v))} />
                      <div className="min-w-0">
                        <div className="text-sm truncate">{formatPermissionLabel(p)}</div>
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
