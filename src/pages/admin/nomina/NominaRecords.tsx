import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import attendanceService, { type AttendanceRecord } from "@/lib/api/attendanceService";
import GoogleMapEmbed from "@/components/GoogleMap/GoogleMapEmbed";
import { StatusBadge, fmtDateTime, fmtTime, fmtHours } from "./shared";
import { MapPin } from "lucide-react";

const STATUS_OPTIONS = [
  "", "on_time", "late", "early_departure", "missed_clockout",
  "no_call_no_show", "overtime", "pending_review", "approved", "rejected",
];

export default function NominaRecords() {
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    attendanceService
      .list({ "filter[status]": status || undefined, limit: 100 })
      .then((r) => setRows(r.rows || []))
      .catch((e) => toast.error(e?.message || "Error al cargar registros"))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(load, [load]);

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
    { key: "guard", header: "Guardia", render: (_v, r) => r.guardName?.fullName || "—" },
    { key: "station", header: "Puesto", render: (_v, r) => r.stationName?.stationName || "—" },
    { key: "scheduledStart", header: "Programado", render: (_v, r) => `${fmtTime(r.scheduledStart)} – ${fmtTime(r.scheduledEnd)}` },
    { key: "punchInTime", header: "Entrada", render: (_v, r) => fmtTime(r.punchInTime) },
    { key: "punchOutTime", header: "Salida", render: (_v, r) => fmtTime(r.punchOutTime) },
    { key: "hoursWorked", header: "Horas", render: (_v, r) => fmtHours(r.hoursWorked) },
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
            onRowClick={(r) => setSelected(r)}
            emptyState={<div className="py-12 text-center text-sm text-muted-foreground">Sin registros</div>}
          />
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.guardName?.fullName || "Guardia"}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
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
                </div>

                {selected.punchInLatitude != null && selected.punchInLongitude != null && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <GoogleMapEmbed
                      lat={Number(selected.punchInLatitude)}
                      lng={Number(selected.punchInLongitude)}
                      zoom={16}
                      showGeofence={!!selected.stationName?.geofenceRadius}
                      geofenceRadius={selected.stationName?.geofenceRadius || 100}
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
