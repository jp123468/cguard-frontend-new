import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import attendanceService, { type AttendanceRecord } from "@/lib/api/attendanceService";
import GoogleMapEmbed from "@/components/GoogleMap/GoogleMapEmbed";
import { useFileUrl } from "@/lib/fileUrl";
import { StatusBadge, fmtDateTime, fmtTime, fmtHours } from "./shared";
import { MapPin, ImageOff } from "lucide-react";

const STATUS_OPTIONS = [
  "", "on_time", "late", "early_departure", "missed_clockout",
  "no_call_no_show", "overtime", "pending_review", "approved", "rejected",
];

export default function NominaRecords() {
  // Deep-link from a clock-in notification: ?focus=<id> auto-opens that record's
  // detail once the list loads (carried over from the old Programador · Asistencia).
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const [focusHandled, setFocusHandled] = useState(false);

  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [busy, setBusy] = useState(false);
  // Token-based selfie URL for the open record. punchInPhoto is a raw
  // privateUrl string (no companion downloadUrl), so resolve a token here at the
  // component top level (hooks rules) rather than inside the JSX IIFE below.
  const selfieUrl = useFileUrl(selected?.punchInPhoto ?? null);

  const load = useCallback(() => {
    setLoading(true);
    attendanceService
      .list({ "filter[status]": status || undefined, limit: 100 })
      .then((r) => setRows(r.rows || []))
      .catch((e) => toast.error(e?.message || "Error al cargar registros"))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(load, [load]);

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

  const act = async (fn: () => Promise<any>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<AttendanceRecord>[] = [
    { key: "guard", header: "Vigilante", render: (_v, r) => r.guardName?.fullName || "—" },
    { key: "station", header: "Puesto", render: (_v, r) => r.stationName?.stationName || "—" },
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
        <span className="font-medium text-[#C8860A]">{r.numberOfPatrolsDuringShift ?? 0}</span>
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
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Registros de Asistencia</h1>
            <p className="text-sm text-muted-foreground">Marcaciones de entrada / salida</p>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "" ? "Todos los estados" : s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>
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
            emptyState={<div className="py-12 text-center text-sm text-muted-foreground">Sin registros</div>}
          />
        )}
      </div>

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
                  <span className="text-xs text-muted-foreground">
                    Aprobación: {selected.approvalStatus}
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

                {selected.punchInLatitude != null && selected.punchInLongitude != null && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <GoogleMapEmbed
                      lat={Number(selected.punchInLatitude)}
                      lng={Number(selected.punchInLongitude)}
                      zoom={16}
                      showGeofence={!selected.stationName?.geofencePolygon && !!selected.stationName?.geofenceRadius}
                      geofenceRadius={selected.stationName?.geofenceRadius || 100}
                      polygon={selected.stationName?.geofencePolygon || undefined}
                      markers={[
                        { id: "punch", lat: Number(selected.punchInLatitude), lng: Number(selected.punchInLongitude), label: "Marcación" },
                      ]}
                    />
                    {selected.punchInOutsideGeofence && (
                      <p className="bg-red-500/10 px-3 py-2 text-xs text-red-500">
                        Marcación fuera de geocerca · {selected.punchInDistanceM ?? "?"} m del puesto
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    disabled={busy}
                    onClick={() => act(() => attendanceService.approve(selected.id), "Aprobado")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Aprobar
                  </Button>
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() => act(() => attendanceService.reject(selected.id), "Rechazado")}
                  >
                    Rechazar
                  </Button>
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
