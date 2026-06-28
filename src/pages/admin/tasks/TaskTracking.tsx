import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckSquare, Plus, ListChecks } from "lucide-react";
import { PageContainer, PageHeader, Section, SkeletonCards } from "@/components/kit";
import taskService, { type TaskRow, type TaskStatus } from "@/lib/api/taskService";

function fmtDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-EC");
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending_approval: { label: "Por aprobar", cls: "bg-amber-500/15 text-amber-600" },
  approved: { label: "Aprobada", cls: "bg-blue-500/15 text-blue-600" },
  completed: { label: "Completada", cls: "bg-emerald-500/15 text-emerald-600" },
  rejected: { label: "Rechazada", cls: "bg-red-500/15 text-red-600" },
  cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
};

const FILTERS: Array<{ key: TaskStatus | "all"; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "pending_approval", label: "Por aprobar" },
  { key: "approved", label: "Aprobadas" },
  { key: "completed", label: "Completadas" },
  { key: "rejected", label: "Rechazadas" },
];

export default function TaskTracking() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");

  // New-task dialog
  const [open, setOpen] = useState(false);
  const [stations, setStations] = useState<Array<{ id: string; label: string }>>([]);
  const [form, setForm] = useState({ taskToDo: "", stationId: "", deadline: "", priority: "media" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    taskService
      .byStatus({ status: filter, limit: 200 })
      .then((r) => setRows(r.rows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);
  useEffect(load, [load]);

  const openDialog = async () => {
    setForm({ taskToDo: "", stationId: "", deadline: "", priority: "media" });
    setOpen(true);
    try {
      const r = await taskService.stations();
      const opts = (r.rows || r || []).map((s: any) => ({ id: s.id, label: s.label || s.stationName || s.id }));
      setStations(opts);
    } catch { /* silent */ }
  };

  const submit = async () => {
    if (!form.taskToDo.trim() || !form.stationId || !form.deadline) {
      toast.error("Completa tarea, puesto y fecha límite");
      return;
    }
    setSaving(true);
    try {
      await taskService.create({
        taskToDo: form.taskToDo.trim(),
        taskBelongsToStation: form.stationId,
        dateToDoTheTask: new Date(form.deadline).toISOString(),
        priority: form.priority as "alta" | "media" | "baja",
      });
      toast.success("Tarea creada y enviada a los vigilantes del puesto");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<TaskRow>[] = [
    { key: "taskToDo", header: "Tarea", render: (_v, r) => <span className="font-medium text-foreground">{r.taskToDo}</span> },
    { key: "station", header: "Puesto", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.taskBelongsToStation?.stationName || "—"}</span> },
    {
      key: "status", header: "Estado", render: (_v, r) => {
        const m = STATUS_META[r.status] || STATUS_META.pending_approval;
        return <Badge className={`${m.cls} border-0`}>{m.label}</Badge>;
      },
    },
    { key: "priority", header: "Prioridad", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.priority || "media"}</span> },
    { key: "source", header: "Origen", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.source === "client" ? "Cliente" : "Operación"}</span> },
    { key: "dateToDoTheTask", header: "Fecha límite", render: (_v, r) => <span className="text-xs text-muted-foreground">{fmtDate(r.dateToDoTheTask)}</span> },
    { key: "dateCompletedTask", header: "Completada", render: (_v, r) => <span className="text-xs text-muted-foreground">{fmtDate(r.dateCompletedTask)}</span> },
  ];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6">
        <PageContainer width="wide">
          <PageHeader
            icon={<CheckSquare />}
            title="Tareas"
            subtitle="Seguimiento de tareas de los puestos: por aprobar, en curso y completadas."
            actions={
              <Button variant="brand" onClick={openDialog}>
                <Plus className="mr-2 h-4 w-4" /> Nueva tarea
              </Button>
            }
          />

          <Section title="Tareas" icon={<ListChecks />} action={
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
                  {f.label}
                </Button>
              ))}
            </div>
          }>
            {loading ? (
              <SkeletonCards count={4} />
            ) : (
              <DataTable
                columns={columns}
                data={rows}
                emptyState={<div className="py-10 text-center text-sm text-muted-foreground">No hay tareas</div>}
              />
            )}
          </Section>
        </PageContainer>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Describe la tarea…" value={form.taskToDo} onChange={(e) => setForm((f) => ({ ...f, taskToDo: e.target.value }))} />
            <Select value={form.stationId} onValueChange={(v) => setForm((f) => ({ ...f, stationId: v }))}>
              <SelectTrigger><SelectValue placeholder="Puesto" /></SelectTrigger>
              <SelectContent>
                {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Creando…" : "Crear y asignar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
