import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import attendanceService, { type AttendanceRecord } from "@/lib/api/attendanceService";
import departmentService, { type Department } from "@/lib/api/departmentService";
import GoogleMapEmbed from "@/components/GoogleMap/GoogleMapEmbed";
import { useFileUrl } from "@/lib/fileUrl";
import { StatusBadge, ApprovalBadge, STATUS_META, approvalLabel, fmtDateTime, fmtTime, fmtHours } from "./shared";
import { PageContainer, PageHeader, Section, EmptyState, SkeletonCards } from "@/components/kit";
import { MapPin, ImageOff, ClipboardCheck, ClipboardList, Filter, Download, ChevronLeft, ChevronRight, LogIn, LogOut } from "lucide-react";

const STATUS_OPTIONS = [
  "", "on_time", "late", "early_departure", "missed_clockout",
  "no_call_no_show", "overtime", "pending_review", "approved", "rejected",
];

type Period = "day" | "week" | "month";

/** [start, end] Date bounds for the period containing `anchor` (local time). */
function rangeFor(period: Period, anchor: Date): [Date, Date] {
  const y = anchor.getFullYear(), m = anchor.getMonth(), d = anchor.getDate();
  if (period === "day") {
    return [new Date(y, m, d, 0, 0, 0, 0), new Date(y, m, d, 23, 59, 59, 999)];
  }
  if (period === "week") {
    const dow = (anchor.getDay() + 6) % 7; // Monday = 0
    const start = new Date(y, m, d - dow, 0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    return [start, end];
  }
  return [new Date(y, m, 1, 0, 0, 0, 0), new Date(y, m + 1, 0, 23, 59, 59, 999)];
}

/** Shift the anchor by ±1 of the period unit. */
function shiftAnchor(period: Period, anchor: Date, dir: number): Date {
  const d = new Date(anchor);
  if (period === "day") d.setDate(d.getDate() + dir);
  else if (period === "week") d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d;
}

function rangeLabel(period: Period, anchor: Date): string {
  const [s, e] = rangeFor(period, anchor);
  if (period === "day") return s.toLocaleDateString("es", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  if (period === "month") return s.toLocaleDateString("es", { month: "long", year: "numeric" });
  const sameMonth = s.getMonth() === e.getMonth();
  return `${s.toLocaleDateString("es", { day: "2-digit", month: sameMonth ? undefined : "short" })} – ${e.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function NominaRecords() {
  // Deep-link from a clock-in notification: ?focus=<id> auto-opens that record's
  // detail once the list loads (carried over from the old Programador · Asistencia).
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const [focusHandled, setFocusHandled] = useState(false);

  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [period, setPeriod] = useState<Period>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const [rangeStart, rangeEnd] = useMemo(() => rangeFor(period, anchor), [period, anchor]);
  // Token-based selfie URL for the open record. punchInPhoto is a raw
  // privateUrl string (no companion downloadUrl), so resolve a token here at the
  // component top level (hooks rules) rather than inside the JSX IIFE below.
  const selfieUrl = useFileUrl(selected?.punchInPhoto ?? null);

  const load = useCallback(() => {
    setLoading(true);
    attendanceService
      .list({
        "filter[status]": status || undefined,
        "filter[departmentId]": departmentId || undefined,
        // Day/week/month window — sent as the backend's punchInTimeRange [start, end].
        "filter[punchInTimeRange][0]": rangeStart.toISOString(),
        "filter[punchInTimeRange][1]": rangeEnd.toISOString(),
        limit: 1000,
        orderBy: "punchInTime_DESC",
      })
      .then((r) => setRows(r.rows || []))
      .catch((e) => toast.error(e?.message || "Error al cargar registros"))
      .finally(() => setLoading(false));
  }, [status, departmentId, rangeStart, rangeEnd]);
  useEffect(load, [load]);

  useEffect(() => {
    departmentService
      .list()
      .then((r) => setDepartments(r.rows.filter((d) => d.active)))
      .catch(() => {});
  }, []);

  // Export the current period's records to CSV (UTF-8 BOM so Excel reads accents).
  const exportCsv = () => {
    if (!rows.length) { toast.error("No hay registros para exportar"); return; }
    const headers = [
      "Fecha", "Vigilante", "Puesto", "Programado inicio", "Programado fin",
      "Entrada", "Salida", "Horas", "Tarde (min)", "Extra (min)",
      "Rondas", "Incidentes", "Fuera de geocerca", "Estado", "Aprobación",
    ];
    const body = rows.map((r) => [
      r.punchInTime ? new Date(r.punchInTime).toLocaleDateString("es") : "",
      r.guardName?.fullName || "",
      r.stationName?.stationName || "",
      fmtTime(r.scheduledStart), fmtTime(r.scheduledEnd),
      r.punchInTime ? new Date(r.punchInTime).toLocaleString("es") : "",
      r.punchOutTime ? new Date(r.punchOutTime).toLocaleString("es") : "",
      r.hoursWorked ?? "", r.lateMinutes ?? 0, r.overtimeMinutes ?? 0,
      r.numberOfPatrolsDuringShift ?? 0, r.numberOfIncidentsDurindShift ?? 0,
      r.punchInOutsideGeofence ? "Sí" : "No",
      STATUS_META[r.status]?.label || r.status || "", approvalLabel(r.approvalStatus),
    ]);
    const csv = [headers, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asistencia_${period}_${rangeStart.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} registro(s) exportado(s)`);
  };

  // Once rows are loaded, open the detail for the notification's record (once).
  useEffect(() => {
    if (focusHandled || !focusId || loading) return;
    const match = rows.find((r) => r.id === focusId);
    if (match) {
      setSelected(match);
      attendanceService.find(match.id).then(setSelected).catch(() => {});
      setFocusHandled(true);
    }
  }, [focusId, focusHandled, loading, rows]);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    const openId = selected?.id;
    try {
      await fn();
      toast.success(okMsg);
      // Refresh the open record IN PLACE so its approval badge + action buttons
      // reflect the new state immediately (previously the sheet closed, so an
      // already-approved record kept offering "Aprobar" when reopened).
      if (openId) {
        try { setSelected(await attendanceService.find(openId)); } catch { setSelected(null); }
      }
      load();
    } catch (e) {
      toast.error((e as { message?: string })?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: "guard",
      header: "Vigilante",
      render: (_v, r) => (
        <span className="flex items-center gap-1.5">
          {r.guardName?.fullName || "—"}
          {r.role === "supervisor" && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              Supervisor
            </span>
          )}
          {r.role === "administrative" && (
            <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
              Administrativo
            </span>
          )}
        </span>
      ),
    },
    { key: "station", header: "Puesto", render: (_v, r) => r.stationName?.stationName || (r.role === "supervisor" ? "Supervisión" : r.role === "administrative" ? "Oficina" : "—") },
    { key: "scheduledStart", header: "Programado", render: (_v, r) => `${fmtTime(r.scheduledStart)} – ${fmtTime(r.scheduledEnd)}` },
    {
      key: "punchInTime",
      header: "Entrada",
      render: (_v, r) => (
        <span>
          {fmtTime(r.punchInTime)}
          {Array.isArray(r.sessions) && r.sessions.length > 1 && (
            <span className="ml-1 text-[10px] font-medium text-muted-foreground">
              ·{r.sessions.length} sesiones
            </span>
          )}
        </span>
      ),
    },
    { key: "punchOutTime", header: "Salida", render: (_v, r) => fmtTime(r.punchOutTime) },
    { key: "hoursWorked", header: "Horas", render: (_v, r) => fmtHours(r.hoursWorked) },
    {
      key: "patrols",
      header: "Rondas",
      render: (_v, r) => (
        <span className="font-medium text-primary">{r.numberOfPatrolsDuringShift ?? 0}</span>
      ),
    },
    {
      key: "incidents",
      header: "Incidentes",
      render: (_v, r) =>
        (r.numberOfIncidentsDurindShift ?? 0) > 0 ? (
          <span className="font-bold text-red-600 dark:text-red-400">
            {r.numberOfIncidentsDurindShift}
          </span>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      key: "geo",
      header: "Ubicación",
      render: (_v, r) =>
        r.punchInOutsideGeofence ? (
          <span className="inline-flex items-center gap-1 text-xs text-red-500">
            <MapPin size={12} /> Fuera ({r.punchInDistanceM ?? "?"} m)
          </span>
        ) : (
          <span className="text-xs text-emerald-600">OK</span>
        ),
    },
    { key: "status", header: "Estado", render: (_v, r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <AppLayout>
      <PageContainer width="wide" className="p-4 sm:p-6">
        <PageHeader
          icon={<ClipboardCheck />}
          title="Registros de Asistencia"
          subtitle="Marcaciones de entrada / salida"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* Período: Día / Semana / Mes */}
              <div className="inline-flex rounded-xl border border-border bg-background p-0.5">
                {(["day", "week", "month"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${period === p ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {p === "day" ? "Día" : p === "week" ? "Semana" : "Mes"}
                  </button>
                ))}
              </div>
              {/* Navegación de fecha */}
              <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-1.5 py-1">
                <button onClick={() => setAnchor((a) => shiftAnchor(period, a, -1))} className="p-1 rounded hover:bg-muted" aria-label="Anterior">
                  <ChevronLeft className="size-4" />
                </button>
                <button onClick={() => setAnchor(new Date())} title="Ir a hoy" className="px-2 text-sm min-w-[9rem] text-center capitalize">
                  {rangeLabel(period, anchor)}
                </button>
                <button onClick={() => setAnchor((a) => shiftAnchor(period, a, +1))} className="p-1 rounded hover:bg-muted" aria-label="Siguiente">
                  <ChevronRight className="size-4" />
                </button>
              </div>
              {/* Filtro de estado */}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
                <Filter className="size-4 text-muted-foreground" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s === "" ? "Todos los estados" : (STATUS_META[s]?.label ?? s)}</option>
                  ))}
                </select>
              </div>
              {/* Filtro de departamento (solo si el tenant creó departamentos) */}
              {departments.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
                  <Filter className="size-4 text-muted-foreground" />
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="bg-transparent text-sm outline-none"
                  >
                    <option value="">Todos los departamentos</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Exportar */}
              <Button variant="outline" onClick={exportCsv} className="gap-2">
                <Download className="size-4" /> Exportar
              </Button>
            </div>
          }
        />

        <Section title="Marcaciones" icon={<ClipboardList />}>
          {!loading && (
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span><span className="font-semibold text-foreground">{rows.length}</span> registro(s)</span>
              <span>Horas totales: <span className="font-semibold text-foreground">{fmtHours(rows.reduce((sum, r) => sum + (Number(r.hoursWorked) || 0), 0))}</span></span>
              <span className="capitalize">{rangeLabel(period, anchor)}</span>
            </div>
          )}
          {loading ? (
            <SkeletonCards count={4} />
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              onRowClick={(r) => {
                // Open immediately with the lean list row, then hydrate the full
                // record (selfie/photos/device) — the list no longer ships those blobs.
                setSelected(r);
                attendanceService.find(r.id).then(setSelected).catch(() => {});
              }}
              emptyState={
                <EmptyState
                  icon={<ClipboardList />}
                  title="Sin registros"
                  description="No hay marcaciones para los filtros seleccionados."
                />
              }
            />
          )}
        </Section>
      </PageContainer>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.guardName?.fullName || "Vigilante"}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                {/* Clock-in selfie (geo-stamped by the worker app) + timestamp */}
                {(() => {
                  if (!selfieUrl) {
                    return (
                      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 py-8 text-muted-foreground">
                        <ImageOff size={20} />
                        <span className="text-xs">Sin selfie de entrada</span>
                      </div>
                    );
                  }
                  return (
                    <a
                      href={selfieUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={selfieUrl}
                        alt="Selfie de entrada"
                        className="w-full rounded-xl border border-border object-contain bg-muted"
                      />
                      <p className="mt-1.5 text-center text-xs text-muted-foreground">
                        Entrada · {fmtDateTime(selected.punchInTime)}
                        {selected.punchInAddress ? ` · ${selected.punchInAddress}` : ""}
                      </p>
                    </a>
                  );
                })()}

                <div className="flex items-center justify-between">
                  <StatusBadge status={selected.status} />
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Aprobación: <ApprovalBadge status={selected.approvalStatus} />
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Puesto" value={selected.stationName?.stationName || "—"} />
                  <Field label="Horas" value={fmtHours(selected.hoursWorked)} />
                  <Field label="Programado" value={`${fmtDateTime(selected.scheduledStart)}`} />
                  <Field label="Fin programado" value={`${fmtDateTime(selected.scheduledEnd)}`} />
                  <Field label="Entrada" value={fmtDateTime(selected.punchInTime)} />
                  <Field label="Salida" value={fmtDateTime(selected.punchOutTime)} />
                  <Field label="Tarde (min)" value={String(selected.lateMinutes || 0)} />
                  <Field label="Extra (min)" value={String(selected.overtimeMinutes || 0)} />
                  {selected.shiftSchedule && (
                    <Field label="Turno" value={selected.shiftSchedule} />
                  )}
                  <Field label="Rondas" value={String(selected.numberOfPatrolsDuringShift ?? 0)} />
                  <Field label="Incidentes" value={String(selected.numberOfIncidentsDurindShift ?? 0)} />
                </div>

                {selected.observations && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Observaciones
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-foreground">
                      {selected.observations}
                    </p>
                  </div>
                )}

                {/* Sessions — every clock in/out pair accumulated in this record */}
                {Array.isArray(selected.sessions) && selected.sessions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">
                      Sesiones ({selected.sessions.length})
                    </p>
                    <div className="divide-y divide-border rounded-xl border border-border">
                      {selected.sessions.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3 py-2 text-xs"
                        >
                          <span className="text-muted-foreground">#{i + 1}</span>
                          <span className="text-foreground">
                            {fmtTime(s.in)} → {s.out ? fmtTime(s.out) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location on the map for BOTH punches, captured at clock-in and
                    clock-out. Each map is centered on the stored GPS of that punch. */}
                {((selected.punchInLatitude != null && selected.punchInLongitude != null) ||
                  (selected.punchOutLatitude != null && selected.punchOutLongitude != null)) && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Ubicación
                    </p>

                    {/* Clock-in location */}
                    {selected.punchInLatitude != null && selected.punchInLongitude != null && (
                      <div className="overflow-hidden rounded-xl border border-border">
                        <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <LogIn size={13} className="text-emerald-600" /> Entrada
                          </span>
                          <span className="font-normal text-muted-foreground">{fmtDateTime(selected.punchInTime)}</span>
                        </div>
                        <GoogleMapEmbed
                          lat={Number(selected.punchInLatitude)}
                          lng={Number(selected.punchInLongitude)}
                          zoom={16}
                          height="200px"
                          showGeofence={!selected.stationName?.geofencePolygon && !!selected.stationName?.geofenceRadius}
                          geofenceRadius={selected.stationName?.geofenceRadius || 100}
                          polygon={selected.stationName?.geofencePolygon || undefined}
                          markers={[
                            { id: "in", lat: Number(selected.punchInLatitude), lng: Number(selected.punchInLongitude), label: "Entrada" },
                          ]}
                        />
                        {selected.punchInOutsideGeofence && (
                          <p className="bg-red-500/10 px-3 py-2 text-xs text-red-500">
                            Marcación fuera de geocerca · {selected.punchInDistanceM ?? "?"} m del puesto
                          </p>
                        )}
                      </div>
                    )}

                    {/* Clock-out location */}
                    {selected.punchOutLatitude != null && selected.punchOutLongitude != null ? (
                      <div className="overflow-hidden rounded-xl border border-border">
                        <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <LogOut size={13} className="text-orange-600" /> Salida
                          </span>
                          <span className="font-normal text-muted-foreground">{fmtDateTime(selected.punchOutTime)}</span>
                        </div>
                        <GoogleMapEmbed
                          lat={Number(selected.punchOutLatitude)}
                          lng={Number(selected.punchOutLongitude)}
                          zoom={16}
                          height="200px"
                          showGeofence={!selected.stationName?.geofencePolygon && !!selected.stationName?.geofenceRadius}
                          geofenceRadius={selected.stationName?.geofenceRadius || 100}
                          polygon={selected.stationName?.geofencePolygon || undefined}
                          markers={[
                            { id: "out", lat: Number(selected.punchOutLatitude), lng: Number(selected.punchOutLongitude), label: "Salida" },
                          ]}
                        />
                      </div>
                    ) : selected.punchOutTime ? (
                      <p className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        Salida sin ubicación (marcación automática o GPS no disponible).
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {selected.role === "supervisor" || selected.role === "administrative" ? (
                    <p className="w-full text-xs text-muted-foreground">
                      {selected.role === "administrative"
                        ? "Registro administrativo — sin flujo de aprobación."
                        : "Registro de supervisor — sin flujo de aprobación."}
                    </p>
                  ) : (
                    <>
                      {/* Approval is only meaningful when the punch actually needs
                          review (outside geofence → pending_review, or a request left
                          it pending) or was already decided (so it can be reversed). A
                          normal on-time / in-geofence punch needs no approval — showing
                          an "Aprobar" button there was the source of confusion. */}
                      {(() => {
                        const needsReview =
                          selected.status === "pending_review" || selected.approvalStatus === "pending";
                        const wasDecided =
                          selected.approvalStatus === "approved" || selected.approvalStatus === "rejected";
                        if (!needsReview && !wasDecided) {
                          return (
                            <p className="w-full text-xs text-muted-foreground">
                              Sin aprobación requerida — marcación válida.
                            </p>
                          );
                        }
                        return (
                          <>
                            {wasDecided ? (
                              <p className="w-full text-xs text-muted-foreground">
                                {selected.approvalStatus === "approved" ? "Aprobado" : "Rechazado"}
                                {(selected as AttendanceRecord & { approvedAt?: string }).approvedAt ? ` · ${fmtDateTime((selected as AttendanceRecord & { approvedAt?: string }).approvedAt)}` : ""}
                                {" — puedes cambiar la decisión."}
                              </p>
                            ) : (
                              <p className="w-full text-xs text-amber-600">
                                {selected.punchInOutsideGeofence
                                  ? "Marcación fuera de la geocerca — requiere aprobación."
                                  : "Marcación pendiente de revisión."}
                              </p>
                            )}
                            {selected.approvalStatus !== "approved" && (
                              <Button
                                disabled={busy}
                                onClick={() => act(() => attendanceService.approve(selected.id), "Aprobado")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Aprobar
                              </Button>
                            )}
                            {selected.approvalStatus !== "rejected" && (
                              <Button
                                disabled={busy}
                                variant="outline"
                                onClick={() => act(() => attendanceService.reject(selected.id), "Rechazado")}
                              >
                                Rechazar
                              </Button>
                            )}
                          </>
                        );
                      })()}
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => {
                          const reason = window.prompt("Motivo de la corrección:");
                          if (!reason) return;
                          const value = window.prompt("Nueva hora de entrada (ISO, ej. 2026-06-06T13:00:00Z):", selected.punchInTime);
                          if (!value) return;
                          act(
                            () => attendanceService.correct(selected.id, { field: "punchInTime", correctedValue: value, reason }),
                            "Corrección enviada",
                          );
                        }}
                      >
                        Corregir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
