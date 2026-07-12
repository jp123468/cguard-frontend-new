import { Route } from "lucide-react";
import DataReport, { type ReportColumn } from "./DataReport";
import { ApiService } from "@/services/api/apiService";

interface TagScan {
  id: string;
  scannedAt?: string | null;
  validLocation?: boolean | null;
  distanceMeters?: number | null;
  tag?: { name?: string; tagIdentifier?: string; siteTour?: { name?: string } } | null;
  guard?: { fullName?: string } | null;
  station?: { stationName?: string } | null;
}

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const columns: ReportColumn<TagScan>[] = [
  { key: "scanned", label: "Fecha/Hora", value: (r) => fmt(r.scannedAt) },
  { key: "tour", label: "Recorrido", value: (r) => r.tag?.siteTour?.name || "—" },
  { key: "tag", label: "Punto (etiqueta)", value: (r) => r.tag?.name || r.tag?.tagIdentifier || "—" },
  { key: "guard", label: "Vigilante", value: (r) => r.guard?.fullName || "—" },
  { key: "station", label: "Estación", value: (r) => r.station?.stationName || "—" },
  { key: "valid", label: "Ubicación", value: (r) => (r.validLocation ? "Válida" : "Fuera de rango"), align: "center" },
  { key: "dist", label: "Distancia (m)", value: (r) => (r.distanceMeters != null ? Number(r.distanceMeters).toFixed(0) : "—"), align: "right" },
];

export default function SiteTour() {
  return (
    <DataReport<TagScan>
      title="Informe de Recorridos del Sitio"
      description="Escaneos de rondas: puntos de control marcados por vigilante, con validación de ubicación."
      icon={Route}
      accent="#0ea5e9"
      columns={columns}
      load={async ({ from, to }) => {
        const tenantId = localStorage.getItem("tenantId") || "";
        const res: any = await ApiService.get(`/tenant/${tenantId}/site-tour/tag-scans?limit=2000`);
        const rows: TagScan[] = Array.isArray(res) ? res : res?.rows || [];
        const start = new Date(`${from}T00:00:00.000Z`).getTime();
        const end = new Date(`${to}T23:59:59.999Z`).getTime();
        return rows.filter((r) => {
          const t = r.scannedAt ? new Date(r.scannedAt).getTime() : NaN;
          return !Number.isNaN(t) && t >= start && t <= end;
        });
      }}
    />
  );
}
