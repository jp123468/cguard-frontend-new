import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import attendanceService from "@/lib/api/attendanceService";
import { EXCEPTION_LABEL, SEVERITY_META, EXC_STATUS_META, fmtDateTime } from "./shared";
import { PageContainer, PageHeader, Section, EmptyState, SkeletonCards } from "@/components/kit";
import { AlertTriangle, Filter, ListChecks, PartyPopper, CheckCircle2, Eye } from "lucide-react";

interface ExceptionRow {
  id: string;
  type: string;
  severity: string;
  status: string;
  reason: string | null;
  resolutionNotes?: string | null;
  detectedAt: string;
  resolvedAt?: string | null;
  meta?: any;
  guardShiftId?: string | null;
  guard?: { fullName?: string } | null;
  station?: { stationName?: string } | null;
  resolvedBy?: { firstName?: string; lastName?: string } | null;
}

const TYPE_OPTIONS = ["", "late_arrival", "no_call_no_show", "missed_clockout", "outside_geofence", "early_departure", "overtime"];
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "open", label: "Abiertas" },
  { value: "acknowledged", label: "Reconocidas" },
  { value: "resolved", label: "Resueltas" },
  { value: "all", label: "Todas (historial)" },
];
const SEVERITY_LABEL: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };

function fullName(u?: { firstName?: string; lastName?: string } | null): string {
  if (!u) return "";
  return `${u.firstName || ""} ${u.lastName || ""}`.trim();
}

function SeverityPill({ severity }: { severity: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_META[severity] || "bg-slate-400/15 text-slate-500"}`}>
      {SEVERITY_LABEL[severity] || severity}
    </span>
  );
}
function StatusPill({ status }: { status: string }) {
  const m = EXC_STATUS_META[status] || { label: status, cls: "bg-slate-400/15 text-slate-500" };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}>{m.label}</span>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}

export default function NominaExceptions() {
  const [rows, setRows] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("open");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<ExceptionRow | null>(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    attendanceService
      .exceptions({
        "filter[status]": status === "all" ? undefined : status,
        "filter[type]": type || undefined,
        limit: 200,
      })
      .then((r) => setRows(r.rows || []))
      .catch((e) => toast.error(e?.message || "Error al cargar excepciones"))
      .finally(() => setLoading(false));
  }, [type, status]);
  useEffect(load, [load]);

  const openSheet = (r: ExceptionRow) => { setSelected(r); setNotes(r.resolutionNotes || ""); };

  const act = async (id: string, newStatus: "resolved" | "acknowledged") => {
    setBusy(true);
    try {
      await attendanceService.resolveException(id, { status: newStatus, resolutionNotes: notes.trim() || undefined });
      toast.success(newStatus === "resolved" ? "Excepción resuelta" : "Excepción reconocida");
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<ExceptionRow>[] = [
    { key: "severity", header: "Severidad", render: (_v, r) => <SeverityPill severity={r.severity} /> },
    { key: "type", header: "Tipo", render: (_v, r) => EXCEPTION_LABEL[r.type] || r.type },
    { key: "guard", header: "Vigilante", render: (_v, r) => r.guard?.fullName || "—" },
    { key: "station", header: "Puesto", render: (_v, r) => r.station?.stationName || "—" },
    { key: "detectedAt", header: "Detectado", render: (_v, r) => <span className="text-xs text-muted-foreground">{fmtDateTime(r.detectedAt)}</span> },
    { key: "status", header: "Estado", render: (_v, r) => <StatusPill status={r.status} /> },
    {
      key: "resolvedAt",
      header: "Resuelto",
      render: (_v, r) =>
        r.resolvedAt ? (
          <span className="text-xs text-muted-foreground">
            {fmtDateTime(r.resolvedAt)}
            {fullName(r.resolvedBy) ? <span className="block opacity-70">por {fullName(r.resolvedBy)}</span> : null}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (_v, r) => (
        <Button size="sm" variant="outline" onClick={() => openSheet(r)}>
          <Eye className="mr-1 size-3.5" /> Revisar
        </Button>
      ),
    },
  ];

  const isOpenState = selected && (selected.status === "open" || selected.status === "acknowledged");

  return (
    <AppLayout>
      <PageContainer width="wide" className="p-4 sm:p-6">
        <PageHeader
          icon={<AlertTriangle />}
          title="Excepciones"
          subtitle="Desviaciones de asistencia — registro e historial de operación"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
                <ListChecks className="size-4 text-muted-foreground" />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-transparent text-sm outline-none">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
                <Filter className="size-4 text-muted-foreground" />
                <select value={type} onChange={(e) => setType(e.target.value)} className="bg-transparent text-sm outline-none">
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t === "" ? "Todos los tipos" : EXCEPTION_LABEL[t] || t}</option>
                  ))}
                </select>
              </div>
            </div>
          }
        />

        <Section title={STATUS_OPTIONS.find((s) => s.value === status)?.label || "Excepciones"} icon={<ListChecks />}>
          {loading ? (
            <SkeletonCards count={4} />
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              onRowClick={(r) => openSheet(r)}
              emptyState={
                <EmptyState
                  icon={<PartyPopper />}
                  title={status === "open" ? "Sin excepciones abiertas" : "Sin excepciones"}
                  description="No hay desviaciones de asistencia para los filtros seleccionados."
                />
              }
            />
          )}
        </Section>
      </PageContainer>

      {/* Detail + resolution */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {EXCEPTION_LABEL[selected.type] || selected.type}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityPill severity={selected.severity} />
                  <StatusPill status={selected.status} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vigilante" value={selected.guard?.fullName || "—"} />
                  <Field label="Puesto" value={selected.station?.stationName || "—"} />
                  <Field label="Detectado" value={fmtDateTime(selected.detectedAt)} />
                  <Field label="Estado" value={<StatusPill status={selected.status} />} />
                </div>

                {selected.reason && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Motivo</p>
                    <p className="mt-0.5 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-foreground">{selected.reason}</p>
                  </div>
                )}

                {/* Resolution history (read-only trail) */}
                {(selected.status === "resolved" || selected.status === "acknowledged" || selected.status === "approved" || selected.status === "rejected") && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <CheckCircle2 className="size-3.5 text-emerald-600" /> Resolución
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <Field label="Fecha" value={selected.resolvedAt ? fmtDateTime(selected.resolvedAt) : "—"} />
                      <Field label="Por" value={fullName(selected.resolvedBy) || "—"} />
                    </div>
                    {selected.resolutionNotes && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-foreground">{selected.resolutionNotes}</p>
                    )}
                  </div>
                )}

                {/* Resolve / acknowledge (only while actionable) */}
                {isOpenState && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Nota de resolución (queda en el historial)</p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Describe qué se hizo o por qué se cierra esta excepción…"
                      className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        disabled={busy}
                        onClick={() => act(selected.id, "resolved")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Resolver
                      </Button>
                      {selected.status === "open" && (
                        <Button disabled={busy} variant="outline" onClick={() => act(selected.id, "acknowledged")}>
                          Reconocer
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
