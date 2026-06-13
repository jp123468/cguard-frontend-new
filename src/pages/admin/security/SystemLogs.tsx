import { Fragment, useEffect, useMemo, useState } from "react";
import { ScrollText, RefreshCw, Search, ChevronDown, ChevronRight, PlusCircle, PencilLine, Trash2, Activity } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { ApiService } from "@/services/api/apiService";

type LogRow = {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  createdById?: string | null;
  createdByEmail?: string | null;
  timestamp: string;
  values?: any;
};

const fmt = (d?: string) => {
  try {
    return new Date(d as string).toLocaleString(undefined, {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return "";
  }
};

function actionMeta(action: string) {
  const a = String(action || "").toLowerCase();
  if (a.includes("create")) return { label: "Creación", cls: "bg-green-100 text-green-700", icon: <PlusCircle className="size-3.5" /> };
  if (a.includes("update")) return { label: "Actualización", cls: "bg-amber-100 text-amber-700", icon: <PencilLine className="size-3.5" /> };
  if (a.includes("delete") || a.includes("destroy")) return { label: "Eliminación", cls: "bg-red-100 text-red-700", icon: <Trash2 className="size-3.5" /> };
  return { label: action || "—", cls: "bg-slate-100 text-slate-600", icon: <Activity className="size-3.5" /> };
}

const FILTERS = [
  { key: "", label: "Todas" },
  { key: "create", label: "Creaciones" },
  { key: "update", label: "Actualizaciones" },
  { key: "delete", label: "Eliminaciones" },
];

export default function SystemLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const tid = () => localStorage.getItem("tenantId") || "";

  const load = () => {
    setLoading(true);
    ApiService.get(`/tenant/${tid()}/audit-log?limit=500&orderBy=timestamp_DESC`)
      .then((r: any) => setRows(Array.isArray(r) ? r : (r?.rows ?? [])))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (action && !String(r.action || "").toLowerCase().includes(action)) return false;
      if (!q.trim()) return true;
      const blob = `${r.entityName} ${r.entityId} ${r.action} ${r.createdByEmail || ""}`.toLowerCase();
      return blob.includes(q.toLowerCase());
    });
  }, [rows, q, action]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <ScrollText className="size-5 text-[#C8860A]" /> Registros del Sistema
            </h1>
            <p className="text-sm text-muted-foreground">
              Todas las acciones (creaciones, cambios y eliminaciones) realizadas en la plataforma — quién, qué y cuándo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por entidad, usuario o ID…"
                className="h-9 w-64 rounded-lg border border-input bg-background pl-8 pr-3 text-sm focus:border-[#C8860A] focus:outline-none"
              />
            </div>
            <button onClick={load} className="grid h-9 w-9 place-items-center rounded-lg border border-input text-muted-foreground hover:text-foreground" title="Recargar">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action filter */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setAction(f.key)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                (action === f.key ? "bg-[#C8860A] text-white" : "bg-muted text-muted-foreground hover:bg-muted/70")
              }
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-muted-foreground">{filtered.length} registro(s)</span>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Acción</th>
                  <th className="px-3 py-2">Entidad</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2 text-right">Fecha</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Sin registros.</td></tr>
                ) : filtered.map((r) => {
                  const m = actionMeta(r.action);
                  const isOpen = expanded === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className="cursor-pointer border-b border-border/50 hover:bg-muted/40"
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                      >
                        <td className="px-4 py-2">
                          <span className={"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium " + m.cls}>
                            {m.icon}{m.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-foreground">{r.entityName}</span>
                          <span className="ml-1 font-mono text-[10px] text-muted-foreground">{(r.entityId || "").slice(0, 8)}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.createdByEmail || "—"}</td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">{fmt(r.timestamp)}</td>
                        <td className="px-2 py-2 text-muted-foreground">{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-border/50 bg-muted/20">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="mb-1 text-xs text-muted-foreground">
                              ID: <span className="font-mono">{r.entityId}</span>
                            </div>
                            <pre className="max-h-72 overflow-auto rounded-lg bg-background p-3 text-xs text-foreground">
                              {JSON.stringify(r.values ?? {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
