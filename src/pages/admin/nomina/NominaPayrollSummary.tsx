import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileDown, Printer, Lock, FileSpreadsheet, Save } from "lucide-react";
import * as XLSX from "xlsx";
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
  grossPay: number | null;
  hourlyRate: number | null;
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
  const [ratesEnabled, setRatesEnabled] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [closing, setClosing] = useState(false);
  const [editRates, setEditRates] = useState(false);
  const [rateEdits, setRateEdits] = useState<Record<string, number>>({});
  const [savingRates, setSavingRates] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    attendanceService
      .payrollSummary({ from: `${from}T00:00:00`, to: `${to}T23:59:59` })
      .then((d) => {
        const rws: SummaryRow[] = d.rows || [];
        setRows(rws);
        setTotals(d.totals || null);
        setRatesEnabled(!!d.ratesEnabled);
        setCurrency(d.currency || "USD");
        const re: Record<string, number> = {};
        rws.forEach((r) => { re[r.guardId] = r.hourlyRate || 0; });
        setRateEdits(re);
      })
      .catch((e) => toast.error(e?.message || "Error al generar el resumen"))
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(load, []);

  const money = (n: number | null | undefined) =>
    n == null ? "—" : `${currency} ${Number(n).toFixed(2)}`;

  const closePeriod = async () => {
    if (!window.confirm(`Cerrar el periodo hasta ${to}? Los registros quedarán bloqueados (solo lectura).`)) return;
    setClosing(true);
    try {
      const r = await attendanceService.closePeriod(`${to}T23:59:59`);
      toast.success(`Periodo cerrado · ${r.lockedCount} registro(s) bloqueado(s)`);
    } catch (e: any) {
      toast.error(e?.message || "Error al cerrar el periodo");
    } finally {
      setClosing(false);
    }
  };

  const saveRates = async () => {
    setSavingRates(true);
    try {
      await attendanceService.saveGuardRates(rateEdits);
      toast.success("Tarifas guardadas");
      setEditRates(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar tarifas");
    } finally {
      setSavingRates(false);
    }
  };

  const exportXlsx = () => {
    const data = rows.map((r) => ({
      Guardia: r.guardName,
      Turnos: r.shifts,
      "Horas regulares": r.regularHours,
      "Horas extra": r.overtimeHours,
      "Horas totales": r.totalHours,
      Tardanzas: r.lateCount,
      "Sin salida": r.missedClockouts,
      Inasistencias: r.noShows,
      Correcciones: r.approvedCorrections,
      ...(ratesEnabled ? { "Tarifa/h": r.hourlyRate ?? 0, "Pago bruto": r.grossPay ?? 0 } : {}),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nómina");
    XLSX.writeFile(wb, `nomina-${from}_${to}.xlsx`);
  };

  const exportPdf = () => {
    const head = ["Guardia", "Turnos", "H. reg.", "H. extra", "H. tot.", "Tardanzas", "Inasist.", "Correc."]
      .concat(ratesEnabled ? ["Pago bruto"] : []);
    const body = rows
      .map((r) => {
        const cells = [r.guardName, r.shifts, r.regularHours.toFixed(2), r.overtimeHours.toFixed(2), r.totalHours.toFixed(2), r.lateCount, r.noShows, r.approvedCorrections]
          .concat(ratesEnabled ? [money(r.grossPay)] : []);
        return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
      })
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Nómina ${from} a ${to}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:18px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#C8860A;color:#fff}</style></head>
      <body><h1>Resumen de Nómina · ${from} a ${to}</h1>
      <table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const exportCsv = () => {
    const headers = [
      "Guardia", "Turnos", "Horas regulares", "Horas extra", "Horas totales",
      "Tardanzas", "Sin salida", "Inasistencias", "Correcciones", "Horas pagables",
    ].concat(ratesEnabled ? ["Pago bruto"] : []);
    const lines = rows.map((r) =>
      [r.guardName, r.shifts, r.regularHours, r.overtimeHours, r.totalHours, r.lateCount, r.missedClockouts, r.noShows, r.approvedCorrections, r.payableHours]
        .concat(ratesEnabled ? [r.grossPay ?? 0] : [])
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
    {
      key: "hourlyRate",
      header: "Tarifa/h",
      render: (_v: any, r: SummaryRow) =>
        editRates ? (
          <input
            type="number"
            step="0.01"
            value={rateEdits[r.guardId] ?? 0}
            onChange={(e) => setRateEdits((p) => ({ ...p, [r.guardId]: Number(e.target.value) }))}
            className="w-20 rounded border border-border bg-background px-2 py-1 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-muted-foreground">{r.hourlyRate ? `${currency} ${r.hourlyRate}` : "—"}</span>
        ),
    } as Column<any>,
    ...(ratesEnabled
      ? [{ key: "grossPay", header: "Pago bruto", render: (_v: any, r: SummaryRow) => <span className="font-semibold text-[#C8860A]">{money(r.grossPay)}</span> } as Column<any>]
      : []),
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
            <Button variant="outline" onClick={exportXlsx} disabled={!rows.length}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={exportPdf} disabled={!rows.length}>
              <Printer className="mr-1.5 h-4 w-4" /> PDF
            </Button>
            {editRates ? (
              <Button onClick={saveRates} disabled={savingRates} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="mr-1.5 h-4 w-4" /> {savingRates ? "Guardando…" : "Guardar tarifas"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setEditRates(true)} disabled={!rows.length}>
                Editar tarifas
              </Button>
            )}
            <Button variant="outline" onClick={closePeriod} disabled={closing} className="text-red-600">
              <Lock className="mr-1.5 h-4 w-4" /> {closing ? "Cerrando…" : "Cerrar periodo"}
            </Button>
          </div>
        </div>

        {totals && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Turnos" value={totals.shifts} />
            <Tile label="Horas totales" value={Number(totals.totalHours).toFixed(2)} />
            <Tile label="Horas extra" value={Number(totals.overtimeHours).toFixed(2)} />
            <Tile label={ratesEnabled ? "Pago bruto" : "Tardanzas / Inasist."} value={ratesEnabled ? money(totals.grossPay) : `${totals.lateCount} / ${totals.noShows}`} />
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
