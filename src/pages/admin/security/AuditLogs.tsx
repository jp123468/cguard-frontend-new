import { useEffect, useState } from "react";
import { ShieldCheck, LogIn, LogOut, Smartphone, AlertTriangle, RefreshCw, Search } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { PageContainer, PageHeader, Section } from "@/components/kit";
import { ApiService } from "@/services/api/apiService";

type AuditRow = {
  id: string; event: string; outcome?: string | null; email?: string | null;
  ip?: string | null; userAgent?: string | null; deviceId?: string | null;
  platform?: string | null; detail?: string | null; at: string; userId?: string | null;
};

const EVENT_META: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  login: { label: "Inicio de sesión", icon: <LogIn className="size-3.5" />, color: "#22c55e" },
  login_failed: { label: "Inicio fallido", icon: <AlertTriangle className="size-3.5" />, color: "#ef4444" },
  logout: { label: "Cierre de sesión", icon: <LogOut className="size-3.5" />, color: "#64748b" },
  device_registered: { label: "Dispositivo registrado", icon: <Smartphone className="size-3.5" />, color: "#0ea5e9" },
  device_evicted: { label: "Dispositivo retirado", icon: <Smartphone className="size-3.5" />, color: "#f59e0b" },
};

const fmt = (d?: string) => { try { return new Date(d as string).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return ""; } };

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const tid = () => localStorage.getItem("tenantId") || "";

  const load = () => {
    setLoading(true);
    setError(false);
    ApiService.get(`/tenant/${tid()}/security/audit-logs?limit=300`)
      .then((r: any) => setRows(Array.isArray(r) ? r : (r?.rows ?? [])))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const blob = `${r.event} ${r.email || ""} ${r.ip || ""} ${r.platform || ""} ${r.detail || ""}`.toLowerCase();
    return blob.includes(q.toLowerCase());
  });

  return (
    <AppLayout>
      <PageContainer width="wide">
        <PageHeader
          icon={<ShieldCheck />}
          title="Registro de seguridad"
          subtitle="Inicios y cierres de sesión, intentos fallidos y eventos de dispositivos."
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
                  className="h-9 rounded-lg border border-input bg-background pl-8 pr-3 text-sm focus:border-primary focus:outline-none" />
              </div>
              <button onClick={load} className="grid h-9 w-9 place-items-center rounded-lg border border-input text-muted-foreground hover:text-foreground">
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          }
        />

        <Section contentClassName="-mx-5 -mb-5">
          <div className="overflow-x-auto rounded-b-2xl">
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
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <AlertTriangle className="size-6 text-destructive" />
                        <span>No se pudo cargar el registro de seguridad.</span>
                        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                          <RefreshCw className="size-4" /> Reintentar
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin registros.</td></tr>
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
        </Section>
      </PageContainer>
    </AppLayout>
  );
}
