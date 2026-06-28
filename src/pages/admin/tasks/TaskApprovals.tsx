import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClipboardCheck, Inbox } from "lucide-react";
import { PageContainer, PageHeader, Section, StatusBadge, SkeletonCards, EmptyState } from "@/components/kit";
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
      <div className="p-4 sm:p-6">
        <PageContainer width="wide">
          <PageHeader
            icon={<ClipboardCheck />}
            title="Tareas por aprobar"
            subtitle="Tareas creadas por los clientes para sus puestos. Apruébalas para enviarlas a los vigilantes."
            badges={rows.length > 0 ? <StatusBadge tone="orange">{rows.length} pendientes</StatusBadge> : undefined}
          />

          <Section title="Pendientes de aprobación" icon={<ClipboardCheck />}>
            {loading ? (
              <SkeletonCards count={4} />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<Inbox />}
                title="No hay tareas pendientes de aprobación"
                description="Las tareas que los clientes creen para sus puestos aparecerán aquí."
              />
            ) : (
              <DataTable
                columns={columns}
                data={rows}
                emptyState={<div className="py-10 text-center text-sm text-muted-foreground">No hay tareas pendientes de aprobación</div>}
              />
            )}
          </Section>
        </PageContainer>
      </div>
    </AppLayout>
  );
}
