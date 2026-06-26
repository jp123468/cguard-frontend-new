import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import taskService, { type TaskRow } from "@/lib/api/taskService";

function fmtDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-EC");
}

const PRIORITY_STYLE: Record<string, string> = {
  alta: "text-red-600",
  media: "text-amber-600",
  baja: "text-muted-foreground",
};

export default function TaskApprovals() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    taskService
      .byStatus({ status: "pending_approval", limit: 200 })
      .then((r) => setRows(r.rows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const approve = async (r: TaskRow) => {
    setBusy(true);
    try {
      await taskService.approve(r.id);
      toast.success("Tarea aprobada — enviada a los vigilantes del puesto");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const reject = async (r: TaskRow) => {
    const notes = window.prompt("Motivo del rechazo (opcional):") ?? undefined;
    setBusy(true);
    try {
      await taskService.reject(r.id, notes);
      toast.success("Tarea rechazada");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<TaskRow>[] = [
    { key: "taskToDo", header: "Tarea", render: (_v, r) => <span className="font-medium text-foreground">{r.taskToDo}</span> },
    { key: "station", header: "Puesto", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.taskBelongsToStation?.stationName || "—"}</span> },
    { key: "priority", header: "Prioridad", render: (_v, r) => <span className={`text-xs font-medium ${PRIORITY_STYLE[r.priority || "media"]}`}>{r.priority || "media"}</span> },
    { key: "dateToDoTheTask", header: "Fecha límite", render: (_v, r) => <span className="text-xs text-muted-foreground">{fmtDate(r.dateToDoTheTask)}</span> },
    { key: "createdAt", header: "Solicitada", render: (_v, r) => <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      render: (_v, r) => (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approve(r)}>
            Aprobar
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => reject(r)}>
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
          <h1 className="text-xl font-bold text-foreground">
            Tareas por aprobar
            {rows.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600">{rows.length}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">Tareas creadas por los clientes para sus puestos. Apruébalas para enviarlas a los vigilantes.</p>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            emptyState={<div className="py-10 text-center text-sm text-muted-foreground">No hay tareas pendientes de aprobación</div>}
          />
        )}
      </div>
    </AppLayout>
  );
}
