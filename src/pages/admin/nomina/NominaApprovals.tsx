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

export default function NominaApprovals() {
  const [rows, setRows] = useState<CorrectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    attendanceService
      .corrections({ "filter[status]": "pending", limit: 100 })
      .then((r) => setRows(r.rows || []))
      .catch((e) => toast.error(e?.message || "Error al cargar aprobaciones"))
      .finally(() => setLoading(false));
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
          <p className="text-sm text-muted-foreground">Correcciones manuales pendientes de aprobación</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            emptyState={<div className="py-12 text-center text-sm text-muted-foreground">Sin aprobaciones pendientes</div>}
          />
        )}
      </div>
    </AppLayout>
  );
}
