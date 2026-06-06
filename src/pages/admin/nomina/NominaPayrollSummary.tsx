import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import attendanceService from "@/lib/api/attendanceService";

interface SummaryRow {
  guardId: string;
  guardName: string;
  shifts: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  lateCount: number;
  missedClockouts: number;
  noShows: number;
  approvedCorrections: number;
  payableHours: number;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function NominaPayrollSummary() {
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - 14 * 864e5)));
  const [to, setTo] = useState(isoDay(new Date()));
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    attendanceService
      .payrollSummary({ from: `${from}T00:00:00`, to: `${to}T23:59:59` })
      .then((d) => {
        setRows(d.rows || []);
        setTotals(d.totals || null);
      })
      .catch((e) => toast.error(e?.message || "Error al generar el resumen"))
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(load, []);

  const exportCsv = () => {
    const headers = [
      "Guardia", "Turnos", "Horas regulares", "Horas extra", "Horas totales",
      "Tardanzas", "Sin salida", "Inasistencias", "Correcciones", "Horas pagables",
    ];
    const lines = rows.map((r) =>
      [r.guardName, r.shifts, r.regularHours, r.overtimeHours, r.totalHours, r.lateCount, r.missedClockouts, r.noShows, r.approvedCorrections, r.payableHours]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `nomina-${from}_${to}.csv`;
    link.click();
  };

  const columns: Column<any>[] = [
    { key: "guardName", header: "Guardia" },
    { key: "shifts", header: "Turnos" },
    { key: "regularHours", header: "H. regulares", render: (_v, r) => r.regularHours.toFixed(2) },
    { key: "overtimeHours", header: "H. extra", render: (_v, r) => r.overtimeHours.toFixed(2) },
    { key: "totalHours", header: "H. totales", render: (_v, r) => r.totalHours.toFixed(2) },
    { key: "lateCount", header: "Tardanzas" },
    { key: "noShows", header: "Inasistencias" },
    { key: "approvedCorrections", header: "Correcciones" },
    { key: "payableHours", header: "H. pagables", render: (_v, r) => <span className="font-semibold">{r.payableHours.toFixed(2)}</span> },
  ];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Resumen de Nómina</h1>
            <p className="text-sm text-muted-foreground">Horas pagables por guardia (sin cálculo de pago)</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted-foreground">
              Desde
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-border bg-background px-3 py-1.5 text-sm" />
            </label>
            <label className="text-xs text-muted-foreground">
              Hasta
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-border bg-background px-3 py-1.5 text-sm" />
            </label>
            <Button onClick={load} disabled={loading} className="bg-[#C8860A] hover:bg-[#B37809] text-white">
              {loading ? "Generando…" : "Generar"}
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <FileDown className="mr-1.5 h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        {totals && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Turnos" value={totals.shifts} />
            <Tile label="Horas totales" value={Number(totals.totalHours).toFixed(2)} />
            <Tile label="Horas extra" value={Number(totals.overtimeHours).toFixed(2)} />
            <Tile label="Tardanzas / Inasist." value={`${totals.lateCount} / ${totals.noShows}`} />
          </div>
        )}

        <DataTable
          columns={columns}
          data={rows}
          emptyState={<div className="py-12 text-center text-sm text-muted-foreground">Sin datos en el rango</div>}
        />
      </div>
    </AppLayout>
  );
}

function Tile({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
