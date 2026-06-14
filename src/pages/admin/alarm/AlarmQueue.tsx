import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Siren,
  RefreshCw,
  Loader2,
  Filter,
  Clock,
  ShieldAlert,
  Flame,
  Hand,
  Bell,
  HeartPulse,
  Wrench,
  AlertTriangle,
  DoorOpen,
  Activity,
  ChevronRight,
} from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  alarmService,
  type AlarmCase,
  type AlarmCaseStatus,
} from "@/lib/api/alarmService";
import { openEventStream } from "@/lib/api/eventStream";

const GOLD = "#C8860A";

/* ------------------------------------------------------------------ */
/* Metadata (Spanish labels)                                           */
/* ------------------------------------------------------------------ */

type StatusFilter = "all" | AlarmCaseStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "queued", label: "En cola" },
  { value: "acknowledged", label: "Reconocidas" },
  { value: "verifying", label: "Verificando" },
  { value: "dispatched", label: "Despachadas" },
  { value: "resolved", label: "Resueltas" },
  { value: "closed", label: "Cerradas" },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  queued: { label: "En cola", className: "bg-red-500/15 text-red-600 border-red-500/30" },
  acknowledged: { label: "Reconocida", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  verifying: { label: "Verificando", className: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  dispatched: { label: "Despachada", className: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  resolved: { label: "Resuelta", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  closed: { label: "Cerrada", className: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
};

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  burglary: { label: "Intrusión", icon: <ShieldAlert className="size-3.5" /> },
  fire: { label: "Incendio", icon: <Flame className="size-3.5" /> },
  holdup: { label: "Atraco", icon: <Hand className="size-3.5" /> },
  panic: { label: "Pánico", icon: <Bell className="size-3.5" /> },
  medical: { label: "Médica", icon: <HeartPulse className="size-3.5" /> },
  tamper: { label: "Sabotaje", icon: <Wrench className="size-3.5" /> },
  trouble: { label: "Avería", icon: <AlertTriangle className="size-3.5" /> },
  openclose: { label: "Apertura/Cierre", icon: <DoorOpen className="size-3.5" /> },
  test: { label: "Prueba", icon: <Activity className="size-3.5" /> },
  supervisory: { label: "Supervisión", icon: <Activity className="size-3.5" /> },
  restore: { label: "Restauración", icon: <Activity className="size-3.5" /> },
};

function categoryMeta(cat?: string | null) {
  return (cat && CATEGORY_META[cat]) || { label: cat || "Alarma", icon: <Siren className="size-3.5" /> };
}

const PRIORITY_META: Record<number, { label: string; className: string }> = {
  1: { label: "P1 · Crítica", className: "bg-red-600 text-white border-red-600" },
  2: { label: "P2 · Alta", className: "bg-orange-500 text-white border-orange-500" },
  3: { label: "P3 · Media", className: "bg-amber-500 text-white border-amber-500" },
  4: { label: "P4 · Baja", className: "bg-sky-500 text-white border-sky-500" },
  5: { label: "P5 · Info", className: "bg-slate-500 text-white border-slate-500" },
};

function priorityMeta(p?: number) {
  return PRIORITY_META[p || 3] || PRIORITY_META[3];
}

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

function caseTime(c: AlarmCase): string {
  return c.createdAt || c.updatedAt || "";
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
  });
}

/* SLA "since" timer — compact elapsed string */
function elapsedSince(iso?: string | null, now?: number): string {
  if (!iso) return "—";
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return "—";
  let secs = Math.max(0, Math.floor(((now ?? Date.now()) - start) / 1000));
  const h = Math.floor(secs / 3600);
  secs -= h * 3600;
  const m = Math.floor(secs / 60);
  const s = secs - m * 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/* color the SLA badge by age + how "live" the case is */
function slaClass(iso: string | null | undefined, live: boolean, now: number): string {
  if (!live) return "bg-muted text-muted-foreground border-transparent";
  if (!iso) return "bg-muted text-muted-foreground border-transparent";
  const ageMin = (now - new Date(iso).getTime()) / 60000;
  if (ageMin >= 10) return "bg-red-500/15 text-red-600 border-red-500/30 animate-pulse";
  if (ageMin >= 5) return "bg-orange-500/15 text-orange-600 border-orange-500/30";
  return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
}

const OPEN_STATUSES = new Set<string>(["queued", "acknowledged", "verifying", "dispatched"]);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AlarmQueue() {
  const navigate = useNavigate();
  const [cases, setCases] = React.useState<AlarmCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [now, setNow] = React.useState(() => Date.now());

  const load = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const rows = await alarmService.cases(
          status === "all" ? undefined : { status }
        );
        setCases(Array.isArray(rows) ? rows : []);
      } catch (e: any) {
        toast.error(e?.data?.message || e?.message || "No se pudieron cargar las alarmas");
      } finally {
        setLoading(false);
      }
    },
    [status]
  );

  React.useEffect(() => {
    load();
  }, [load]);

  // Live SLA timer tick + silent auto-refresh of the queue (poll is the SSE fallback)
  React.useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => load({ silent: true }), 20000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [load]);

  // Real-time: subscribe to the platform SSE stream; refresh instantly on alarm events.
  React.useEffect(() => {
    const tid = localStorage.getItem("tenantId") || "";
    let t: ReturnType<typeof setTimeout> | null = null;
    const debouncedReload = () => { if (t) clearTimeout(t); t = setTimeout(() => load({ silent: true }), 600); };
    // Shared helper centralizes the token-in-URL setup (see eventStream.ts security note).
    const es = openEventStream(tid);
    if (es) {
      const onEvent = (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data);
          if (typeof data?.eventType === "string" && data.eventType.startsWith("alarm")) {
            if (data.eventType === "alarm.case.new" || data.eventType === "alarm.case.escalated") {
              toast(data.title || "Nueva alarma", { description: data.body });
            }
            debouncedReload();
          }
        } catch { /* heartbeat / non-JSON */ }
      };
      es.addEventListener("notification", onEvent as EventListener);
    } // else SSE unsupported — the poll covers it
    return () => { es?.close(); if (t) clearTimeout(t); };
  }, [load]);

  // Sort by priority (asc, 1=critical first) then by time (newest first)
  const sorted = React.useMemo(() => {
    return [...cases].sort((a, b) => {
      const pa = a.priority ?? 3;
      const pb = b.priority ?? 3;
      if (pa !== pb) return pa - pb;
      const ta = new Date(caseTime(a)).getTime() || 0;
      const tb = new Date(caseTime(b)).getTime() || 0;
      return tb - ta;
    });
  }, [cases]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const cs of cases) {
      const s = cs.status || "queued";
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [cases]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${GOLD}1A`, color: GOLD }}
            >
              <Siren className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Cola de alarmas
              </h1>
              <p className="text-sm text-muted-foreground">
                Casos de la central receptora ordenados por prioridad
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => load()}
            disabled={loading}
            className="self-start sm:self-auto"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Actualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="size-4" />
            Estado:
          </span>
          {STATUS_FILTERS.map((f) => {
            const active = status === f.value;
            const count = f.value === "all" ? cases.length : counts[f.value] || 0;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors"
                style={
                  active
                    ? { backgroundColor: GOLD, borderColor: GOLD, color: "#fff" }
                    : undefined
                }
              >
                {f.label}
                <span
                  className={[
                    "rounded-full px-1.5 text-xs",
                    active ? "bg-white/20" : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Cargando alarmas…
          </div>
        ) : sorted.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span
              className="flex size-12 items-center justify-center rounded-full"
              style={{ backgroundColor: `${GOLD}14`, color: GOLD }}
            >
              <Siren className="size-6" />
            </span>
            <div>
              <p className="font-medium">Sin alarmas</p>
              <p className="text-sm text-muted-foreground">
                {status === "all"
                  ? "No hay casos de alarma en este momento."
                  : "No hay casos con este estado."}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map((c) => {
              const cat = categoryMeta(c.category);
              const prio = priorityMeta(c.priority);
              const st = STATUS_META[c.status || "queued"] || STATUS_META.queued;
              const live = OPEN_STATUSES.has(c.status || "queued");
              const panelName = c.panel?.name || "Panel desconocido";
              const accountNumber = c.panel?.accountNumber;

              return (
                <Card
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/alarm/case/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/alarm/case/${c.id}`);
                    }
                  }}
                  className="cursor-pointer p-4 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-3">
                    {/* Priority badge */}
                    <Badge className={`shrink-0 ${prio.className}`}>{prio.label}</Badge>

                    {/* Center info */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge className="border-transparent bg-muted text-foreground">
                          {cat.icon}
                          {cat.label}
                        </Badge>
                        <Badge className={st.className}>{st.label}</Badge>
                        {c.incidentId ? (
                          <Badge className="border-transparent bg-purple-500/15 text-purple-600">
                            <AlertTriangle className="size-3.5" />
                            Incidente
                          </Badge>
                        ) : null}
                      </div>

                      <p className="truncate font-medium">
                        {c.title || cat.label}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ShieldAlert className="size-3.5" />
                          {panelName}
                          {accountNumber ? ` · #${accountNumber}` : ""}
                        </span>
                        <span>{formatWhen(caseTime(c))}</span>
                      </div>
                    </div>

                    {/* SLA timer */}
                    <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                      <Badge className={slaClass(caseTime(c), live, now)}>
                        <Clock className="size-3.5" />
                        {elapsedSince(caseTime(c), now)}
                      </Badge>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        en cola
                      </span>
                    </div>

                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
