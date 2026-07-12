import { MapPin } from "lucide-react";
import DataReport, { type ReportColumn } from "./DataReport";
import attendanceService from "@/lib/api/attendanceService";

interface Rec {
  guardName?: { fullName?: string } | null;
  stationName?: { stationName?: string } | null;
  punchInTime?: string | null;
  punchOutTime?: string | null;
  punchInDistanceM?: number | null;
  punchOutDistanceM?: number | null;
  punchInOutsideGeofence?: boolean | null;
  punchOutOutsideGeofence?: boolean | null;
}

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
const dist = (m?: number | null) => (m == null ? "—" : `${Math.round(m)} m`);

const columns: ReportColumn<Rec>[] = [
  { key: "date", label: "Fecha", value: (r) => fmt(r.punchInTime) },
  { key: "guard", label: "Vigilante", value: (r) => r.guardName?.fullName || "—" },
  { key: "station", label: "Puesto", value: (r) => r.stationName?.stationName || "—" },
  { key: "inDist", label: "Dist. entrada", value: (r) => dist(r.punchInDistanceM), align: "right" },
  { key: "in", label: "Entrada", value: (r) => (r.punchInOutsideGeofence ? "Fuera de valla" : "OK"), align: "center" },
  { key: "outDist", label: "Dist. salida", value: (r) => dist(r.punchOutDistanceM), align: "right" },
  { key: "out", label: "Salida", value: (r) => (r.punchOutOutsideGeofence ? "Fuera de valla" : "OK"), align: "center" },
];

export default function GeoFenceLog() {
  return (
    <DataReport<Rec>
      title="Registros de Geo Vallas"
      description="Marcajes realizados FUERA del perímetro (geo valla) del puesto, con la distancia al centro."
      icon={MapPin}
      accent="#14b8a6"
      columns={columns}
      emptyMessage="Sin marcajes fuera de la geo valla en este rango — todo dentro del perímetro."
      load={async ({ from, to }) => {
        const res = await attendanceService.list({
          "filter[punchInTimeRange][0]": `${from}T00:00:00.000Z`,
          "filter[punchInTimeRange][1]": `${to}T23:59:59.999Z`,
          limit: 2000,
          orderBy: "punchInTime_DESC",
        });
        const rows = (res?.rows as Rec[]) || [];
        // Only the violations — a geo-fence LOG is about the breaches.
        return rows.filter((r) => r.punchInOutsideGeofence || r.punchOutOutsideGeofence);
      }}
    />
  );
}
