import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Check,
  Radio,
  RefreshCw,
  Loader2,
  Video,
  Bell,
  ShieldAlert,
  WifiOff,
  Hand,
  Filter,
} from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import {
  PageContainer,
  PageHeader,
  Section,
  EmptyState,
  SkeletonCards,
  FadeIn,
  Stagger,
} from "@/components/kit";
import {
  CreateIncidentModal,
  DispatchModal,
} from "@/components/video/VideoActionModals";
import {
  videoService,
  type VideoEvent,
  type Camera,
} from "@/lib/api/videoService";


/* ------------------------------------------------------------------ */
/* Status / type / severity metadata (Spanish labels)                  */
/* ------------------------------------------------------------------ */

type StatusFilter = "all" | "new" | "ack" | "resolved";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "new", label: "Nuevos" },
  { value: "ack", label: "Reconocidos" },
  { value: "resolved", label: "Resueltos" },
];

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  new: { label: "Nuevo", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  ack: { label: "Reconocido", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  resolved: { label: "Resuelto", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
};

const TYPE_META: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  motion: { label: "Movimiento", icon: <Activity className="size-3.5" /> },
  alarm: { label: "Alarma", icon: <Bell className="size-3.5" /> },
  manual: { label: "Manual", icon: <Hand className="size-3.5" /> },
  offline: { label: "Sin conexión", icon: <WifiOff className="size-3.5" /> },
  tamper: { label: "Sabotaje", icon: <ShieldAlert className="size-3.5" /> },
};

const SEVERITY_META: Record<
  string,
  { label: string; className: string }
> = {
  low: { label: "Baja", className: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  medium: { label: "Media", className: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  high: { label: "Alta", className: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  critical: { label: "Crítica", className: "bg-red-500/15 text-red-600 border-red-500/30" },
};

function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
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
  });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function VideoEvents() {
  const [events, setEvents] = React.useState<VideoEvent[]>([]);
  const [cameras, setCameras] = React.useState<Record<string, Camera>>({});
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Modal state
  const [incidentEvent, setIncidentEvent] = React.useState<VideoEvent | null>(null);
  const [dispatchEvent, setDispatchEvent] = React.useState<VideoEvent | null>(null);

  const load = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const [evs, cams] = await Promise.all([
          videoService.events(status === "all" ? undefined : { status }),
          videoService.cameras(),
        ]);
        setEvents(Array.isArray(evs) ? evs : []);
        const map: Record<string, Camera> = {};
        for (const c of Array.isArray(cams) ? cams : []) {
          if (c?.id) map[c.id] = c;
        }
        setCameras(map);
      } catch (e) {
        const err = e as { data?: { message?: string }; message?: string };
        toast.error(err?.data?.message || err?.message || "No se pudieron cargar los eventos");
      } finally {
        setLoading(false);
      }
    },
    [status]
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const cameraName = (ev: VideoEvent): string => {
    const cam = ev.videoCameraId ? cameras[ev.videoCameraId] : undefined;
    return cam?.name || "Cámara desconocida";
  };

  const cameraFor = (ev: VideoEvent): Camera | null =>
    (ev.videoCameraId ? cameras[ev.videoCameraId] : undefined) || null;

  const setEventStatus = async (
    ev: VideoEvent,
    next: "ack" | "resolved"
  ) => {
    setBusyId(ev.id);
    try {
      const updated = await videoService.updateEvent(ev.id, { status: next });
      setEvents((prev) =>
        prev.map((e) =>
          e.id === ev.id ? { ...e, ...updated, status: updated?.status ?? next } : e
        )
      );
      toast.success(next === "ack" ? "Evento reconocido" : "Evento resuelto");
    } catch (e) {
      const err = e as { data?: { message?: string }; message?: string };
      toast.error(err?.data?.message || err?.message || "No se pudo actualizar el evento");
    } finally {
      setBusyId(null);
    }
  };

  const counts = React.useMemo(() => {
    const c = { new: 0, ack: 0, resolved: 0 };
    for (const e of events) {
      const s = (e.status || "new") as keyof typeof c;
      if (s in c) c[s] += 1;
    }
    return c;
  }, [events]);

  return (
    <AppLayout>
      <PageContainer width="wide">
        <PageHeader
          icon={<Activity />}
          title="Eventos de video"
          subtitle="Alertas de movimiento, alarmas y sabotaje de sus cámaras"
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

        {/* Filters */}
        <FadeIn className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="size-4" />
            Estado:
          </span>
          {STATUS_FILTERS.map((f) => {
            const active = status === f.value;
            const count =
              f.value === "all"
                ? events.length
                : counts[f.value as keyof typeof counts];
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors"
                style={
                  active
                    ? { backgroundColor: "var(--primary)", borderColor: "var(--primary)", color: "var(--primary-foreground)" }
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
        </FadeIn>

        {/* List */}
        {loading ? (
          <SkeletonCards count={4} className="sm:grid-cols-1" />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Video />}
            title="No hay eventos"
            description={
              status === "all"
                ? "Aún no se han registrado eventos de video."
                : "No hay eventos con este estado."
            }
          />
        ) : (
          <Stagger className="space-y-3">
            {events.map((ev) => {
              const type = TYPE_META[ev.type || "manual"] || TYPE_META.manual;
              const sev = SEVERITY_META[ev.severity || "medium"] || SEVERITY_META.medium;
              const st = STATUS_META[ev.status || "new"] || STATUS_META.new;
              const rowBusy = busyId === ev.id;
              const isResolved = ev.status === "resolved";
              const isAck = ev.status === "ack" || isResolved;

              return (
                <div
                  key={ev.id}
                  className="cg-card cg-card-hover p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left: info */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <Badge className="border-transparent bg-muted text-foreground">
                          {type.icon}
                          {type.label}
                        </Badge>
                        <Badge className={sev.className}>{sev.label}</Badge>
                        <Badge className={st.className}>{st.label}</Badge>
                        {ev.incidentId ? (
                          <Badge className="border-transparent bg-purple-500/15 text-purple-600">
                            <AlertTriangle className="size-3.5" />
                            Incidente
                          </Badge>
                        ) : null}
                      </div>

                      <p className="truncate font-medium">
                        {ev.title || type.label}
                      </p>
                      {ev.description ? (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {ev.description}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Video className="size-3.5" />
                          {cameraName(ev)}
                        </span>
                        <span>{formatWhen(ev.at)}</span>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={rowBusy || isAck}
                        onClick={() => setEventStatus(ev, "ack")}
                      >
                        {rowBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        Reconocer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={rowBusy || isResolved}
                        onClick={() => setEventStatus(ev, "resolved")}
                      >
                        <CheckCircle2 className="size-4" />
                        Resolver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={rowBusy || Boolean(ev.incidentId)}
                        onClick={() => setIncidentEvent(ev)}
                      >
                        <AlertTriangle className="size-4" />
                        Crear incidente
                      </Button>
                      <Button
                        size="sm"
                        disabled={rowBusy}
                        onClick={() => setDispatchEvent(ev)}
                        style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                        className="hover:opacity-90"
                      >
                        <Radio className="size-4" />
                        Despachar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </Stagger>
        )}
      </PageContainer>

      {/* Modals */}
      <CreateIncidentModal
        open={Boolean(incidentEvent)}
        eventId={incidentEvent?.id}
        camera={incidentEvent ? cameraFor(incidentEvent) : null}
        onClose={() => setIncidentEvent(null)}
        onCreated={() => {
          load({ silent: true });
        }}
      />

      <DispatchModal
        open={Boolean(dispatchEvent)}
        eventId={dispatchEvent?.id}
        camera={dispatchEvent ? cameraFor(dispatchEvent) : null}
        onClose={() => setDispatchEvent(null)}
        onDispatched={() => {
          load({ silent: true });
        }}
      />
    </AppLayout>
  );
}
