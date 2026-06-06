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

export default function NominaApprovals() {
  const [rows, setRows] = useState<CorrectionRow[]>([]);
  const [coRows, setCoRows] = useState<ClockOutReqRow[]>([]);
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

  const coColumns: Column<ClockOutReqRow>[] = [
    { key: "guard", header: "Guardia", render: (_v, r) => <span className="font-medium text-foreground">{r.guard?.fullName || "—"}</span> },
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
          <p className="text-sm text-muted-foreground">Salidas anticipadas y correcciones pendientes</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <div className="space-y-6">
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
