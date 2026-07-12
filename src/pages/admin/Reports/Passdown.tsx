import { Package } from "lucide-react";
import DataReport, { type ReportColumn } from "./DataReport";
import passdownService, { type Passdown } from "@/lib/api/passdownService";

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const STATUS: Record<string, string> = {
  pending: "Pendiente",
  received: "Recibido",
  acknowledged: "Reconocido",
};

const columns: ReportColumn<Passdown>[] = [
  { key: "created", label: "Fecha", value: (r) => fmt(r.createdAt) },
  { key: "station", label: "Puesto", value: (r) => r.stationName || "—" },
  { key: "outgoing", label: "Vigilante saliente", value: (r) => r.outgoingGuardName || "—" },
  { key: "shift", label: "Turno", value: (r) => r.shiftLabel || "—" },
  { key: "notes", label: "Novedades", value: (r) => (r.notes ? (r.notes.length > 60 ? r.notes.slice(0, 60) + "…" : r.notes) : "Sin novedad") },
  { key: "instr", label: "Instrucciones", value: (r) => String(r.instructionCount ?? 0), align: "right" },
  { key: "status", label: "Estado", value: (r) => STATUS[String(r.status || "")] || r.status || "—" },
  { key: "received", label: "Recibido por", value: (r) => r.receivedByName || "—" },
];

export default function Passdown() {
  return (
    <DataReport<Passdown>
      title="Registros de Entrega"
      description="Pases de turno (relevos): novedades, instrucciones y recepción por el vigilante entrante."
      icon={Package}
      accent="#14b8a6"
      columns={columns}
      load={async ({ from, to }) => {
        const res = await passdownService.list({ limit: 2000 });
        const rows = res?.rows || [];
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
