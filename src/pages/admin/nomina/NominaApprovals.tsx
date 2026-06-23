import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import attendanceService from "@/lib/api/attendanceService";
import { fmtDateTime } from "./shared";

interface CorrectionRow {
  id: string;
  field: string;
  originalValue: string | null;
  correctedValue: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

interface ClockOutReqRow {
  id: string;
  reason: string | null;
  scheduledEnd: string | null;
  createdAt: string;
  guard?: { fullName?: string } | null;
  station?: { stationName?: string } | null;
}

interface ClockInReqRow {
  id: string;
  status: string;
  reason: string | null;
  scheduledStart: string | null;
  createdAt: string;
  expiresAt: string | null;
  decisionNotes: string | null;
  guard?: { id?: string; fullName?: string } | null;
  station?: { id?: string; stationName?: string } | null;
}

// How late (in minutes) the request was made relative to the scheduled start.
function lateBy(scheduledStart: string | null, createdAt: string): string {
  if (!scheduledStart) return "—";
  const start = new Date(scheduledStart).getTime();
  const made = new Date(createdAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(made)) return "—";
  const mins = Math.round((made - start) / 60000);
  if (mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export default function NominaApprovals() {
  const [rows, setRows] = useState<CorrectionRow[]>([]);
  const [coRows, setCoRows] = useState<ClockOutReqRow[]>([]);
  const [ciRows, setCiRows] = useState<ClockInReqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      attendanceService
        .corrections({ "filter[status]": "pending", limit: 100 })
        .then((r) => setRows(r.rows || []))
        .catch(() => {}),
      attendanceService
        .clockOutRequests({ status: "pending", limit: 100 })
        .then((r) => setCoRows(r.rows || []))
        .catch(() => {}),
      attendanceService
        .clockInRequests({ status: "pending", limit: 100 })
        .then((r) => setCiRows(r.rows || []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setBusy(true);
    try {
      await attendanceService.approveCorrection(id, { decision });
      toast.success(decision === "approved" ? "Corrección aplicada" : "Corrección rechazada");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const decideClockOut = async (id: string, status: "approved" | "rejected") => {
    setBusy(true);
    try {
      await attendanceService.decideClockOutRequest(id, { status });
      toast.success(status === "approved" ? "Salida aprobada" : "Salida rechazada");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const decideClockIn = async (id: string, status: "approved" | "rejected") => {
    setBusy(true);
    try {
      await attendanceService.decideClockInRequest(id, { status });
      toast.success(status === "approved" ? "Entrada aprobada" : "Entrada rechazada");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const ciColumns: Column<ClockInReqRow>[] = [
    { key: "guard", header: "Vigilante", render: (_v, r) => <span className="font-medium text-foreground">{r.guard?.fullName || "—"}</span> },
    { key: "station", header: "Puesto", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.station?.stationName || "—"}</span> },
    { key: "scheduledStart", header: "Inicio de turno", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.scheduledStart ? fmtDateTime(r.scheduledStart) : "—"}</span> },
    { key: "lateBy", header: "Retraso", render: (_v, r) => <span className="text-xs font-medium text-amber-600">{lateBy(r.scheduledStart, r.createdAt)}</span> },
    { key: "reason", header: "Motivo", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.reason || "—"}</span> },
    { key: "createdAt", header: "Solicitado", render: (_v, r) => fmtDateTime(r.createdAt) },
    {
      key: "actions",
      header: "",
      render: (_v, r) => (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => decideClockIn(r.id, "approved")}>
            Aprobar
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decideClockIn(r.id, "rejected")}>
            Rechazar
          </Button>
        </div>
      ),
    },
  ];

  const coColumns: Column<ClockOutReqRow>[] = [
    { key: "guard", header: "Vigilante", render: (_v, r) => <span className="font-medium text-foreground">{r.guard?.fullName || "—"}</span> },
    { key: "station", header: "Puesto", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.station?.stationName || "—"}</span> },
    { key: "scheduledEnd", header: "Fin de turno", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.scheduledEnd ? fmtDateTime(r.scheduledEnd) : "—"}</span> },
    { key: "reason", header: "Motivo", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.reason || "—"}</span> },
    { key: "createdAt", header: "Solicitado", render: (_v, r) => fmtDateTime(r.createdAt) },
    {
      key: "actions",
      header: "",
      render: (_v, r) => (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => decideClockOut(r.id, "approved")}>
            Aprobar
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decideClockOut(r.id, "rejected")}>
            Rechazar
          </Button>
        </div>
      ),
    },
  ];

  const columns: Column<CorrectionRow>[] = [
    { key: "field", header: "Campo" },
    { key: "originalValue", header: "Original", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.originalValue || "—"}</span> },
    { key: "correctedValue", header: "Corregido", render: (_v, r) => <span className="text-xs font-medium text-foreground">{r.correctedValue || "—"}</span> },
    { key: "reason", header: "Motivo", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.reason}</span> },
    { key: "createdAt", header: "Solicitado", render: (_v, r) => fmtDateTime(r.createdAt) },
    {
      key: "actions",
      header: "",
      render: (_v, r) => (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => decide(r.id, "approved")}>
            Aprobar
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(r.id, "rejected")}>
            Rechazar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Aprobaciones</h1>
          <p className="text-sm text-muted-foreground">Entradas tardías, salidas anticipadas y correcciones pendientes</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <div className="space-y-6">
            {/* Late clock-in requests */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">
                Entradas tardías
                {ciRows.length > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600">
                    {ciRows.length}
                  </span>
                )}
              </h2>
              <DataTable
                columns={ciColumns}
                data={ciRows}
                emptyState={<div className="py-10 text-center text-sm text-muted-foreground">Sin solicitudes de entrada tardía</div>}
              />
            </div>

            {/* Early clock-out requests */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">
                Salidas anticipadas
                {coRows.length > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600">
                    {coRows.length}
                  </span>
                )}
              </h2>
              <DataTable
                columns={coColumns}
                data={coRows}
                emptyState={<div className="py-10 text-center text-sm text-muted-foreground">Sin solicitudes de salida anticipada</div>}
              />
            </div>

            {/* Manual corrections */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Correcciones manuales</h2>
              <DataTable
                columns={columns}
                data={rows}
                emptyState={<div className="py-10 text-center text-sm text-muted-foreground">Sin correcciones pendientes</div>}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
