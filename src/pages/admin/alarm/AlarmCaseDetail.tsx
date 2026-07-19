import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AlarmActionPlan from "@/components/alarm/AlarmActionPlan";
import AlarmVideoVerification from "@/components/alarm/AlarmVideoVerification";
import AlarmECV from "@/components/alarm/AlarmECV";
import {
  Siren,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Check,
  Radio,
  CheckCircle2,
  Lock,
  AlertTriangle,
  StickyNote,
  X,
  Clock,
  ShieldAlert,
  Flame,
  Hand,
  Bell,
  HeartPulse,
  Wrench,
  DoorOpen,
  Activity,
  MapPin,
  Cpu,
  FileText,
  History,
} from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PageContainer,
  Section,
  EmptyState,
} from "@/components/kit";
import {
  alarmService,
  alarmSourceMeta,
  type AlarmCase,
  type AlarmEvent,
  type AlarmAuditLog,
  type AlarmDispatchType,
  type AlarmCaseDisposition,
} from "@/lib/api/alarmService";

const GOLD = "#C8860A";

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<string, { label: string; className: string }> = {
  queued: { label: "En cola", className: "bg-red-500/15 text-red-600 border-red-500/30" },
  acknowledged: { label: "Reconocida", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  verifying: { label: "Verificando", className: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  dispatched: { label: "Despachada", className: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  resolved: { label: "Resuelta", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  closed: { label: "Cerrada", className: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
};

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  burglary: { label: "Intrusión", icon: <ShieldAlert className="size-4" /> },
  fire: { label: "Incendio", icon: <Flame className="size-4" /> },
  holdup: { label: "Atraco", icon: <Hand className="size-4" /> },
  panic: { label: "Pánico", icon: <Bell className="size-4" /> },
  medical: { label: "Médica", icon: <HeartPulse className="size-4" /> },
  tamper: { label: "Sabotaje", icon: <Wrench className="size-4" /> },
  trouble: { label: "Avería", icon: <AlertTriangle className="size-4" /> },
  openclose: { label: "Apertura/Cierre", icon: <DoorOpen className="size-4" /> },
  test: { label: "Prueba", icon: <Activity className="size-4" /> },
  supervisory: { label: "Supervisión", icon: <Activity className="size-4" /> },
  restore: { label: "Restauración", icon: <Activity className="size-4" /> },
};

function categoryMeta(cat?: string | null) {
  return (cat && CATEGORY_META[cat]) || { label: cat || "Alarma", icon: <Siren className="size-4" /> };
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

const DISPATCH_TYPES: { value: AlarmDispatchType; label: string }[] = [
  { value: "guard", label: "Vigilante" },
  { value: "police", label: "Policía" },
  { value: "fire", label: "Bomberos" },
  { value: "medical", label: "Médico" },
];

/** Fields present on the case payload but not on the base AlarmCase model. */
type AlarmCaseWithEcv = AlarmCase & { alarmPanelId?: string | null; ecvSatisfied?: boolean; calls?: unknown[] };

const DISPOSITIONS: { value: AlarmCaseDisposition; label: string }[] = [
  { value: "real", label: "Real" },
  { value: "false", label: "Falsa" },
  { value: "test", label: "Prueba" },
  { value: "runaway", label: "Reincidente" },
  { value: "cancelled", label: "Cancelada" },
];

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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const OPEN_STATUSES = new Set<string>(["queued", "acknowledged", "verifying", "dispatched"]);

/* ------------------------------------------------------------------ */
/* Modal shell (portal)                                                */
/* ------------------------------------------------------------------ */

function Modal({
  open,
  title,
  icon,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${GOLD}1A`, color: GOLD }}
            >
              {icon}
            </span>
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AlarmCaseDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = React.useState<AlarmCase | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  // Modal state
  const [dispatchOpen, setDispatchOpen] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [incidentOpen, setIncidentOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);

  // Form state
  const [dType, setDType] = React.useState<AlarmDispatchType>("guard");
  const [dTarget, setDTarget] = React.useState("");
  const [dNote, setDNote] = React.useState("");
  const [disposition, setDisposition] = React.useState<AlarmCaseDisposition>("real");
  const [incTitle, setIncTitle] = React.useState("");
  const [incDescription, setIncDescription] = React.useState("");
  const [noteText, setNoteText] = React.useState("");

  const load = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const c = await alarmService.case(id);
        setData(c || null);
      } catch (e) {
        const err = e as { data?: { message?: string }; message?: string };
        toast.error(err?.data?.message || err?.message || "No se pudo cargar el caso");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  React.useEffect(() => {
    if (id) load();
  }, [id, load]);

  const refetch = () => load({ silent: true });

  const runAction = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      await refetch();
      return true;
    } catch (e) {
      const err = e as { data?: { message?: string }; message?: string };
      toast.error(err?.data?.message || err?.message || "No se pudo completar la acción");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onAcknowledge = () =>
    runAction(() => alarmService.acknowledge(id), "Caso reconocido");

  const onResolve = () => runAction(() => alarmService.resolve(id), "Caso resuelto");

  const onDispatch = async () => {
    if (!dTarget.trim()) {
      toast.error("Indique el destino del despacho");
      return;
    }
    const ok = await runAction(
      () =>
        alarmService.dispatch(id, {
          type: dType,
          target: dTarget.trim(),
          note: dNote.trim() || undefined,
        }),
      "Despacho solicitado"
    );
    if (ok) {
      setDispatchOpen(false);
      setDTarget("");
      setDNote("");
    }
  };

  const onClose = async () => {
    const ok = await runAction(
      () => alarmService.close(id, { disposition }),
      "Caso cerrado"
    );
    if (ok) setCloseOpen(false);
  };

  const onIncident = async () => {
    const ok = await runAction(
      () =>
        alarmService.caseToIncident(id, {
          title: incTitle.trim() || undefined,
          description: incDescription.trim() || undefined,
        }),
      "Incidente creado"
    );
    if (ok) {
      setIncidentOpen(false);
      setIncTitle("");
      setIncDescription("");
    }
  };

  const onNote = async () => {
    if (!noteText.trim()) {
      toast.error("Escriba una nota");
      return;
    }
    const ok = await runAction(
      () => alarmService.addNote(id, { detail: noteText.trim() }),
      "Nota agregada"
    );
    if (ok) {
      setNoteOpen(false);
      setNoteText("");
    }
  };

  /* ------------------------------- render ------------------------------ */

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando caso…
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <PageContainer width="narrow">
          <EmptyState
            icon={<Siren />}
            title="Caso no encontrado"
            description="El caso solicitado no existe o ya no está disponible."
            action={
              <Button variant="outline" onClick={() => navigate("/alarm/queue")}>
                <ArrowLeft className="size-4" />
                Volver a la cola
              </Button>
            }
          />
        </PageContainer>
      </AppLayout>
    );
  }

  const cat = categoryMeta(data.category);
  const prio = priorityMeta(data.priority);
  const st = STATUS_META[data.status || "queued"] || STATUS_META.queued;
  const panel = data.panel || null;
  const isOpen = OPEN_STATUSES.has(data.status || "queued");
  const isClosed = data.status === "closed";
  const acked = Boolean(data.ackAt) || !["queued"].includes(data.status || "queued");

  const events: AlarmEvent[] = Array.isArray(data.events) ? data.events : [];
  const audit: AlarmAuditLog[] = Array.isArray(data.auditLogs) ? data.auditLogs : [];

  const sortedEvents = [...events].sort((a, b) => {
    const ta = new Date(a.at || a.createdAt || "").getTime() || 0;
    const tb = new Date(b.at || b.createdAt || "").getTime() || 0;
    return tb - ta;
  });
  const sortedAudit = [...audit].sort((a, b) => {
    const ta = new Date(a.at || a.createdAt || "").getTime() || 0;
    const tb = new Date(b.at || b.createdAt || "").getTime() || 0;
    return tb - ta;
  });

  return (
    <AppLayout>
      <PageContainer width="wide">
        {/* Back + refresh */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/alarm/queue")}>
            <ArrowLeft className="size-4" />
            Cola de alarmas
          </Button>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Actualizar
          </Button>
        </div>

        {/* Header card */}
        <Card className="mb-5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span
                className="flex size-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${GOLD}1A`, color: GOLD }}
              >
                <Siren className="size-6" />
              </span>
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge className={prio.className}>{prio.label}</Badge>
                  <Badge className="border-transparent bg-muted text-foreground">
                    {cat.icon}
                    {cat.label}
                  </Badge>
                  <Badge className={st.className}>{st.label}</Badge>
                  {(() => {
                    const sm = alarmSourceMeta(data.source);
                    return <Badge className={sm.className}>{sm.label}</Badge>;
                  })()}
                  {data.disposition ? (
                    <Badge className="border-transparent bg-slate-500/15 text-slate-600">
                      {DISPOSITIONS.find((d) => d.value === data.disposition)?.label ||
                        data.disposition}
                    </Badge>
                  ) : null}
                  {data.incidentId ? (
                    <Badge className="border-transparent bg-purple-500/15 text-purple-600">
                      <AlertTriangle className="size-3.5" />
                      Incidente
                    </Badge>
                  ) : null}
                </div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {data.title || cat.label}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Caso #{String(data.id).slice(0, 8)} · creado {formatWhen(data.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={busy || acked || isClosed}
              onClick={onAcknowledge}
            >
              <Check className="size-4" />
              Reconocer
            </Button>
            <Button
              size="sm"
              variant="brand"
              disabled={busy || !isOpen}
              onClick={() => setDispatchOpen(true)}
            >
              <Radio className="size-4" />
              Despachar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !isOpen}
              onClick={onResolve}
            >
              <CheckCircle2 className="size-4" />
              Resolver
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || isClosed}
              onClick={() => setCloseOpen(true)}
            >
              <Lock className="size-4" />
              Cerrar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || Boolean(data.incidentId)}
              onClick={() => setIncidentOpen(true)}
            >
              <AlertTriangle className="size-4" />
              Crear incidente
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setNoteOpen(true)}
            >
              <StickyNote className="size-4" />
              Nota
            </Button>
          </div>
        </Card>

        {/* Action plan — guided operator response */}
        <div className="mb-5">
          <AlarmActionPlan caseId={id} />
        </div>

        {/* Video verification — live linked camera(s) + verification clips */}
        <div className="mb-5">
          <AlarmVideoVerification caseId={id} />
        </div>

        {/* ECV — enhanced call verification + police dispatch */}
        <div className="mb-5">
          <AlarmECV
            caseId={id}
            panelId={(data as AlarmCaseWithEcv).alarmPanelId}
            category={data.category || undefined}
            ecvSatisfied={(data as AlarmCaseWithEcv).ecvSatisfied}
            calls={(data as AlarmCaseWithEcv).calls || []}
            status={data.status || undefined}
            onChanged={() => load()}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Panel / site info */}
          <Section title="Panel y sitio" icon={<Cpu />} className="lg:col-span-1">
            {panel ? (
              <dl className="space-y-2.5 text-sm">
                <Field label="Panel" value={panel.name} />
                <Field label="Cuenta" value={panel.accountNumber} mono />
                <Field
                  label="Tipo"
                  value={
                    panel.panelType
                      ? { intrusion: "Intrusión", fire: "Incendio", holdup: "Atraco", access: "Acceso", environmental: "Ambiental" }[panel.panelType] || panel.panelType
                      : null
                  }
                />
                <Field label="Protocolo" value={panel.protocol} />
                <Field
                  label="Equipo"
                  value={[panel.make, panel.model].filter(Boolean).join(" ") || null}
                />
                <Field
                  label="Comunicación"
                  value={
                    panel.comms
                      ? { ip: "IP", cellular: "Celular", dual: "Dual" }[panel.comms] || panel.comms
                      : null
                  }
                />
                <Field label="Estado del panel" value={panel.status} />
                <Field label="Última señal" value={formatWhen(panel.lastSignalAt)} />
                {panel.notes ? (
                  <div className="flex items-start gap-1.5 pt-1 text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span>{panel.notes}</span>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Sin información de panel.</p>
            )}
          </Section>

          {/* Events timeline */}
          <Section
            className="lg:col-span-2"
            icon={<FileText />}
            title={
              <span className="flex items-center gap-2">
                Cronología de eventos
                <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">
                  {sortedEvents.length}
                </span>
              </span>
            }
          >
            {sortedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
            ) : (
              <ol className="relative space-y-4 border-l pl-5">
                {sortedEvents.map((ev) => {
                  const ec = categoryMeta(ev.category);
                  return (
                    <li key={ev.id} className="relative">
                      <span
                        className="absolute -left-[27px] top-1 flex size-4 items-center justify-center rounded-full ring-4 ring-background"
                        style={{ backgroundColor: GOLD }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-transparent bg-muted text-foreground">
                          {ec.icon}
                          {ec.label}
                        </Badge>
                        {ev.priority ? (
                          <Badge className={priorityMeta(ev.priority).className}>
                            {priorityMeta(ev.priority).label}
                          </Badge>
                        ) : null}
                        {ev.zoneNumber ? (
                          <span className="text-xs text-muted-foreground">
                            Zona {ev.zoneNumber}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm">{ev.description || ec.label}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {formatWhen(ev.at || ev.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>

          {/* Audit log */}
          <Section
            className="lg:col-span-3"
            icon={<History />}
            title={
              <span className="flex items-center gap-2">
                Registro de auditoría
                <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">
                  {sortedAudit.length}
                </span>
              </span>
            }
          >
            {sortedAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin entradas de auditoría.</p>
            ) : (
              <ul className="divide-y">
                {sortedAudit.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <span className="font-medium">{a.action || "Acción"}</span>
                      {a.detail ? (
                        <span className="ml-2 text-sm text-muted-foreground">{a.detail}</span>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatWhen(a.at || a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </PageContainer>

      {/* ----------------------------- Modals ----------------------------- */}

      {/* Dispatch */}
      <Modal
        open={dispatchOpen}
        title="Despachar"
        icon={<Radio className="size-4" />}
        onClose={() => setDispatchOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDispatchOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={onDispatch} variant="brand" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
              Despachar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="d-type">Tipo</Label>
            <select
              id="d-type"
              className={selectClass}
              value={dType}
              onChange={(e) => setDType(e.target.value as AlarmDispatchType)}
            >
              {DISPATCH_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-target">Destino</Label>
            <Input
              id="d-target"
              value={dTarget}
              onChange={(e) => setDTarget(e.target.value)}
              placeholder="Unidad, nombre o número de contacto"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-note">Nota (opcional)</Label>
            <Textarea
              id="d-note"
              value={dNote}
              onChange={(e) => setDNote(e.target.value)}
              placeholder="Instrucciones para el despacho…"
              rows={3}
            />
          </div>
        </div>
      </Modal>

      {/* Close */}
      <Modal
        open={closeOpen}
        title="Cerrar caso"
        icon={<Lock className="size-4" />}
        onClose={() => setCloseOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={onClose} variant="brand" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Cerrar caso
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="disposition">Disposición</Label>
          <select
            id="disposition"
            className={selectClass}
            value={disposition}
            onChange={(e) => setDisposition(e.target.value as AlarmCaseDisposition)}
          >
            {DISPOSITIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Clasifique el desenlace del caso antes de cerrarlo.
          </p>
        </div>
      </Modal>

      {/* Incident */}
      <Modal
        open={incidentOpen}
        title="Crear incidente"
        icon={<AlertTriangle className="size-4" />}
        onClose={() => setIncidentOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setIncidentOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={onIncident} variant="brand" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
              Crear incidente
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inc-title">Título</Label>
            <Input
              id="inc-title"
              value={incTitle}
              onChange={(e) => setIncTitle(e.target.value)}
              placeholder={data.title || cat.label}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inc-desc">Descripción</Label>
            <Textarea
              id="inc-desc"
              value={incDescription}
              onChange={(e) => setIncDescription(e.target.value)}
              placeholder="Detalle del incidente…"
              rows={4}
            />
          </div>
        </div>
      </Modal>

      {/* Note */}
      <Modal
        open={noteOpen}
        title="Agregar nota"
        icon={<StickyNote className="size-4" />}
        onClose={() => setNoteOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setNoteOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={onNote} variant="brand" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <StickyNote className="size-4" />}
              Guardar nota
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="note-text">Nota</Label>
          <Textarea
            id="note-text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Observaciones del operador…"
            rows={4}
          />
        </div>
      </Modal>
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Small field row                                                     */
/* ------------------------------------------------------------------ */

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={["text-right", mono ? "font-mono text-xs" : ""].join(" ")}>
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
