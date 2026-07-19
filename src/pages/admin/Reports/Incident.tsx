import { AlertTriangle } from "lucide-react";
import DataReport, { type ReportColumn } from "./DataReport";
import { ApiService } from "@/services/api/apiService";

interface Incident {
  id: string;
  createdAt?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  location?: string | null;
  postSite?: { name?: string } | null;
  station?: { stationName?: string } | null;
}

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const trim = (s?: string | null, n = 80) => {
  const v = (s || "").trim();
  return v.length > n ? `${v.slice(0, n)}…` : v || "—";
};

const columns: ReportColumn<Incident>[] = [
  { key: "created", label: "Fecha", value: (r) => fmt(r.createdAt) },
  { key: "title", label: "Título", value: (r) => r.title || "—" },
  { key: "priority", label: "Prioridad", value: (r) => r.priority || "—", align: "center" },
  { key: "status", label: "Estado", value: (r) => r.status || "—" },
  { key: "site", label: "Puesto/Estación", value: (r) => r.postSite?.name || r.station?.stationName || "—" },
  { key: "location", label: "Ubicación", value: (r) => r.location || "—" },
  { key: "desc", label: "Descripción", value: (r) => trim(r.description) },
];

export default function Incident() {
  return (
    <DataReport<Incident>
      title="Informe de Incidente"
      description="Incidentes reportados: prioridad, estado, ubicación y descripción por puesto."
      icon={AlertTriangle}
      accent="#ef4444"
      columns={columns}
      load={async ({ from, to }) => {
        const tenantId = localStorage.getItem("tenantId") || "";
        // Filter by date range on the SERVER (filter[createdAtRange]) — the old
        // limit=2000 + client-side date filter silently dropped any range older
        // than the newest 2000 incidents.
        const start = new Date(`${from}T00:00:00.000Z`).toISOString();
        const end = new Date(`${to}T23:59:59.999Z`).toISOString();
        const params = new URLSearchParams();
        params.append("filter[createdAtRange][]", start);
        params.append("filter[createdAtRange][]", end);
        params.append("orderBy", "createdAt_DESC");
        params.append("limit", "5000");
        const res: any = await ApiService.get(
          `/tenant/${tenantId}/incident?${params.toString()}`,
        );
        const rows: Incident[] = Array.isArray(res) ? res : res?.rows || [];
        return rows;
      }}
    />
  );
}
