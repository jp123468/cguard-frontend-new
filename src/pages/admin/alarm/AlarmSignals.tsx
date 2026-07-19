import * as React from "react";
import { toast } from "sonner";
import {
  Radio,
  RefreshCw,
  Loader2,
  Search,
  ArrowDownUp,
  ArrowUpRight,
  Wifi,
  Signal,
  Server,
} from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  alarmService,
  type AlarmSignal,
} from "@/lib/api/alarmService";
import {
  PageContainer,
  PageHeader,
  Section,
  EmptyState,
} from "@/components/kit";

/* ------------------------------------------------------------------ */
/* Metadata (Spanish labels)                                           */
/* ------------------------------------------------------------------ */

const FORMAT_META: Record<string, { label: string; className: string }> = {
  sia: { label: "SIA DC-09", className: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30" },
  contactid: { label: "Contact ID", className: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  surgard: { label: "Sur-Gard", className: "bg-violet-500/15 text-violet-600 border-violet-500/30" },
  webhook: { label: "Webhook", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  manual: { label: "Manual", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
};

const QUALIFIER_META: Record<string, { label: string; className: string }> = {
  event: { label: "Evento", className: "bg-red-500/15 text-red-600 border-red-500/30" },
  restore: { label: "Restauración", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  status: { label: "Estado", className: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
};

const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode }> = {
  ip: { label: "IP", icon: <Wifi className="size-3.5" /> },
  cellular: { label: "Celular", icon: <Signal className="size-3.5" /> },
  receiver: { label: "Receptor", icon: <Server className="size-3.5" /> },
};

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        className || "",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AlarmSignals() {
  const [signals, setSignals] = React.useState<AlarmSignal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [limit, setLimit] = React.useState(100);

  const load = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const rows = await alarmService.signals({ limit });
        setSignals(Array.isArray(rows) ? rows : []);
      } catch (e) {
        const err = e as { data?: { message?: string }; message?: string };
        toast.error(err?.data?.message || err?.message || "No se pudieron cargar las señales");
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  React.useEffect(() => {
    load();
  }, [load]);

  // Sort newest first by receivedAt
  const sorted = React.useMemo(() => {
    return [...signals].sort((a, b) => {
      const ta = new Date(a.receivedAt).getTime() || 0;
      const tb = new Date(b.receivedAt).getTime() || 0;
      return tb - ta;
    });
  }, [signals]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((s) => {
      const hay = [
        s.accountNumber,
        s.eventCode,
        s.zoneNumber,
        s.format,
        s.qualifier,
        s.channel,
        s.receiverId,
        s.raw,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sorted, query]);

  return (
    <AppLayout>
      <PageContainer width="wide">
        <PageHeader
          icon={<Radio />}
          title="Registro de señales"
          subtitle="Tráfico crudo recibido de los paneles (inmutable)"
          actions={
            <Button
              variant="outline"
              onClick={() => load()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Actualizar
            </Button>
          }
        />

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cuenta, código, zona…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowDownUp className="size-4" />
            <span>Mostrar:</span>
            {[100, 250, 500].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={
                  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors " +
                  (limit === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted")
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Cargando señales…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Radio />}
            title="Sin señales"
            description={
              query
                ? "Ninguna señal coincide con la búsqueda."
                : "Aún no se han recibido señales."
            }
          />
        ) : (
          <Section contentClassName="-mx-1">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Recibida</th>
                    <th className="px-4 py-3 font-medium">Cuenta</th>
                    <th className="px-4 py-3 font-medium">Formato</th>
                    <th className="px-4 py-3 font-medium">Código</th>
                    <th className="px-4 py-3 font-medium">Calificador</th>
                    <th className="px-4 py-3 font-medium">Zona</th>
                    <th className="px-4 py-3 font-medium">Canal</th>
                    <th className="px-4 py-3 font-medium">Crudo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const fmt = (s.format && FORMAT_META[s.format]) || null;
                    const qual = (s.qualifier && QUALIFIER_META[s.qualifier]) || null;
                    const chan = (s.channel && CHANNEL_META[s.channel]) || null;
                    return (
                      <tr
                        key={s.id}
                        className="border-b last:border-0 align-top transition-colors hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatWhen(s.receivedAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          {s.accountNumber || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {fmt ? (
                            <Badge className={fmt.className}>{fmt.label}</Badge>
                          ) : (
                            <span className="text-muted-foreground">{s.format || "—"}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {s.eventCode || "—"}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          {qual ? (
                            <Badge className={qual.className}>{qual.label}</Badge>
                          ) : (
                            <span className="text-muted-foreground">{s.qualifier || "—"}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {s.zoneNumber || "—"}
                          {s.partition ? ` · P${s.partition}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          {chan ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              {chan.icon}
                              {chan.label}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{s.channel || "—"}</span>
                          )}
                          {s.receiverId ? (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                              <ArrowUpRight className="size-3" />
                              {s.receiverId}
                            </span>
                          ) : null}
                        </td>
                        <td className="max-w-[260px] px-4 py-3">
                          <code
                            className="block truncate text-xs text-muted-foreground"
                            title={s.raw || undefined}
                          >
                            {s.raw || "—"}
                          </code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {!loading && filtered.length > 0 ? (
          <p className="text-right text-xs text-muted-foreground">
            {filtered.length} señal{filtered.length === 1 ? "" : "es"}
            {query ? ` (de ${signals.length})` : ""}
          </p>
        ) : null}
      </PageContainer>
    </AppLayout>
  );
}
