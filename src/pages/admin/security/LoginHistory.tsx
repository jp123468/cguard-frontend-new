import { useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, Smartphone, AlertTriangle, RefreshCw, Search, History, ShieldCheck } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { ApiService } from "@/services/api/apiService";

type Row = {
  id: string; event: string; outcome?: string | null; email?: string | null;
  ip?: string | null; userAgent?: string | null; deviceId?: string | null;
  platform?: string | null; detail?: string | null; at: string; userId?: string | null;
};

const EVENT_META: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  login: { label: "Inicio de sesión", icon: <LogIn className="size-3.5" />, color: "#16a34a" },
  login_failed: { label: "Intento fallido", icon: <AlertTriangle className="size-3.5" />, color: "#dc2626" },
  logout: { label: "Cierre de sesión", icon: <LogOut className="size-3.5" />, color: "#64748b" },
  device_registered: { label: "Dispositivo registrado", icon: <Smartphone className="size-3.5" />, color: "#0ea5e9" },
  device_evicted: { label: "Dispositivo retirado", icon: <Smartphone className="size-3.5" />, color: "#f59e0b" },
};

const FILTERS = [
  { key: "", label: "Todos", match: () => true },
  { key: "login", label: "Inicios", match: (e: string) => e === "login" },
  { key: "login_failed", label: "Fallidos", match: (e: string) => e === "login_failed" },
  { key: "logout", label: "Cierres", match: (e: string) => e === "logout" },
  { key: "device", label: "Dispositivos", match: (e: string) => e.startsWith("device") },
];

const fmt = (d?: string) => {
  try {
    return new Date(d as string).toLocaleString(undefined, {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return ""; }
};

export default function LoginHistory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const tid = () => localStorage.getItem("tenantId") || "";

  const load = () => {
    setLoading(true);
    ApiService.get(`/tenant/${tid()}/security/audit-logs?limit=300`)
      .then((r: any) => setRows(Array.isArray(r) ? r : (r?.rows ?? [])))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const matcher = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!matcher.match(String(r.event || ""))) return false;
      if (!q.trim()) return true;
      const blob = `${r.event} ${r.email || ""} ${r.ip || ""} ${r.platform || ""} ${r.detail || ""}`.toLowerCase();
      return blob.includes(q.toLowerCase());
    });
  }, [rows, q, matcher]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <History className="size-5 text-[#C8860A]" /> Historial de Inicio de Sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              Inicios y cierres de sesión, intentos fallidos y eventos de dispositivos de esta empresa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por usuario, IP o dispositivo…"
                className="h-9 w-64 rounded-lg border border-input bg-background pl-8 pr-3 text-sm focus:border-[#C8860A] focus:outline-none"
              />
            </div>
            <button onClick={load} className="grid h-9 w-9 place-items-center rounded-lg border border-input text-muted-foreground hover:text-foreground" title="Recargar">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                (filter === f.key ? "bg-[#C8860A] text-white" : "bg-muted text-muted-foreground hover:bg-muted/70")
              }
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-muted-foreground">{filtered.length} evento(s)</span>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Evento</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">Plataforma</th>
                  <th className="px-3 py-2">Detalle</th>
                  <th className="px-3 py-2 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin eventos.</td></tr>
                ) : filtered.map((r) => {
                  const m = EVENT_META[r.event] || { label: r.event, icon: <ShieldCheck className="size-3.5" />, color: "#64748b" };
                  return (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: m.color }}>{m.icon}{m.label}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.email || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.ip || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.platform || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground" title={r.detail || ""}>{(r.detail || "").slice(0, 60)}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{fmt(r.at)}</td>
                    </tr>
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
