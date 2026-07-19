import { CheckSquare } from "lucide-react";
import DataReport, { type ReportColumn } from "./DataReport";
import taskService, { type TaskRow } from "@/lib/api/taskService";

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const STATUS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  completed: "Completada",
};
const SOURCE: Record<string, string> = { client: "Cliente", staff: "Personal", passdown: "Relevo" };
const PRIORITY: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };

const columns: ReportColumn<TaskRow>[] = [
  { key: "created", label: "Creada", value: (r) => fmt(r.createdAt) },
  { key: "task", label: "Tarea", value: (r) => (r.taskToDo ? (r.taskToDo.length > 70 ? r.taskToDo.slice(0, 70) + "…" : r.taskToDo) : "—") },
  { key: "station", label: "Puesto", value: (r) => r.taskBelongsToStation?.stationName || "—" },
  { key: "source", label: "Origen", value: (r) => SOURCE[String(r.source || "")] || r.source || "—" },
  { key: "priority", label: "Prioridad", value: (r) => PRIORITY[String(r.priority || "")] || r.priority || "—", align: "center" },
  { key: "due", label: "Para", value: (r) => fmt(r.dateToDoTheTask) },
  { key: "done", label: "Realizada", value: (r) => (r.wasItDone ? "Sí" : "No"), align: "center" },
  { key: "status", label: "Estado", value: (r) => STATUS[String(r.status || "")] || r.status || "—" },
];

export default function Task() {
  return (
    <DataReport<TaskRow>
      title="Informe de Tareas"
      description="Tareas de cliente/personal aprobadas y ejecutadas por los vigilantes en turno."
      icon={CheckSquare}
      accent="#0ea5e9"
      columns={columns}
      load={async ({ from, to }) => {
        const res: TaskRow[] | { rows?: TaskRow[] } = await taskService.byStatus({ status: "all", limit: 2000 });
        const rows: TaskRow[] = Array.isArray(res) ? res : res?.rows || [];
        const start = new Date(`${from}T00:00:00.000Z`).getTime();
        const end = new Date(`${to}T23:59:59.999Z`).getTime();
        return rows.filter((r) => {
          const ts = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
          return !Number.isNaN(ts) && ts >= start && ts <= end;
        });
      }}
    />
  );
}
