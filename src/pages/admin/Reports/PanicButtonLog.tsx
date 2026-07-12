import { Siren } from "lucide-react";
import DataReport, { type ReportColumn } from "./DataReport";
import { alarmService, type AlarmCase } from "@/lib/api/alarmService";

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const ORIGIN: Record<string, string> = {
  alarm_panel: "Panel de alarma",
  client_app: "App cliente (SOS)",
  worker_app: "Botón de pánico (vigilante)",
  manual: "Manual",
};

const STATUS: Record<string, string> = {
  open: "Abierto",
  acknowledged: "Reconocido",
  dispatched: "Despachado",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const columns: ReportColumn<AlarmCase>[] = [
  { key: "created", label: "Fecha", value: (r) => fmt(r.createdAt) },
  { key: "title", label: "Título", value: (r) => r.title || "Alerta de pánico" },
  { key: "origin", label: "Origen", value: (r) => ORIGIN[String(r.source || "")] || r.source || "—" },
  { key: "priority", label: "Prioridad", value: (r) => String(r.priority ?? "—"), align: "center" },
  { key: "status", label: "Estado", value: (r) => STATUS[String(r.status || "")] || r.status || "—" },
  { key: "ack", label: "Reconocido", value: (r) => fmt(r.ackAt) },
  { key: "resolved", label: "Resuelto", value: (r) => fmt(r.resolvedAt) },
];

export default function PanicButtonLog() {
  return (
    <DataReport<AlarmCase>
      title="Registros del Botón de Pánico"
      description="Alertas de pánico y SOS: origen, prioridad, reconocimiento y resolución."
      icon={Siren}
      accent="#ef4444"
      columns={columns}
      load={async ({ from, to }) => {
        const cases = await alarmService.cases();
        const start = new Date(`${from}T00:00:00.000Z`).getTime();
        const end = new Date(`${to}T23:59:59.999Z`).getTime();
        return (cases || []).filter((c) => {
          if (c.category !== "panic") return false;
          const t = c.createdAt ? new Date(c.createdAt).getTime() : NaN;
          return !Number.isNaN(t) && t >= start && t <= end;
        });
      }}
    />
  );
}
