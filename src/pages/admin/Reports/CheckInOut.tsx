import { LogIn } from "lucide-react";
import DataReport, { type ReportColumn } from "./DataReport";
import attendanceService from "@/lib/api/attendanceService";

interface Rec {
  guardName?: { fullName?: string } | string | null;
  stationName?: { stationName?: string } | string | null;
  punchInTime?: string | null;
  punchOutTime?: string | null;
  hoursWorked?: number | null;
  lateMinutes?: number | null;
  status?: string | null;
}

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

// Backend sometimes returns the association object, sometimes a plain string.
const guard = (r: Rec) => (typeof r.guardName === "string" ? r.guardName : r.guardName?.fullName) || "—";
const station = (r: Rec) => (typeof r.stationName === "string" ? r.stationName : r.stationName?.stationName) || "—";

const columns: ReportColumn<Rec>[] = [
  { key: "guard", label: "Vigilante", value: guard },
  { key: "station", label: "Puesto", value: station },
  { key: "in", label: "Entrada", value: (r) => fmt(r.punchInTime) },
  { key: "out", label: "Salida", value: (r) => fmt(r.punchOutTime) },
  { key: "hours", label: "Horas", value: (r) => (r.hoursWorked != null ? Number(r.hoursWorked).toFixed(2) : "—"), align: "right" },
  { key: "late", label: "Atraso (min)", value: (r) => String(r.lateMinutes ?? 0), align: "right" },
  { key: "status", label: "Estado", value: (r) => r.status || "—" },
];

export default function CheckInOut() {
  return (
    <DataReport<Rec>
      title="Informe de Entrada/Salida"
      description="Marcajes de asistencia (entrada, salida, horas y atrasos) por vigilante."
      icon={LogIn}
      accent="#0ea5e9"
      columns={columns}
      load={async ({ from, to }) => {
        const res = await attendanceService.list({
          "filter[punchInTimeRange][0]": `${from}T00:00:00.000Z`,
          "filter[punchInTimeRange][1]": `${to}T23:59:59.999Z`,
          limit: 2000,
          orderBy: "punchInTime_DESC",
        });
        return (res?.rows as Rec[]) || [];
      }}
    />
  );
}
