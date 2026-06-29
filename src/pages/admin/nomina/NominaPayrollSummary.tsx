import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { FileDown, Printer, Lock, FileSpreadsheet, Save, Wallet, CalendarDays, Clock, Timer, Pencil } from "lucide-react";
import * as XLSX from "xlsx";
import attendanceService from "@/lib/api/attendanceService";
import { PageContainer, PageHeader, Section, StatCard, Stagger } from "@/components/kit";

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
  daysWorked?: number;
  monthlySalary?: number | null;
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
  const [salaryBasis, setSalaryBasis] = useState<"hourly" | "monthly">("hourly");
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
        setSalaryBasis((d as any).salaryBasis === "monthly" ? "monthly" : "hourly");
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
    if (!(await confirmDialog({ title: 'Cerrar periodo', message: `Cerrar el periodo hasta ${to}? Los registros quedarán bloqueados (solo lectura).`, confirmText: 'Cerrar periodo', tone: 'danger' }))) return;
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
      Vigilante: r.guardName,
      Turnos: r.shifts,
      "Días trabajados": r.daysWorked ?? 0,
      ...(salaryBasis === "monthly" ? { "Sueldo mensual": r.monthlySalary ?? 0 } : {}),
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
    const esc = (s: any) =>
      String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
    const head = ["Vigilante", "Turnos", "H. reg.", "H. extra", "H. tot.", "Tardanzas", "Inasist.", "Correc."]
      .concat(ratesEnabled ? ["Pago bruto"] : []);
    const body = rows
      .map((r) => {
        const cells = [r.guardName, r.shifts, r.regularHours.toFixed(2), r.overtimeHours.toFixed(2), r.totalHours.toFixed(2), r.lateCount, r.noShows, r.approvedCorrections]
          .concat(ratesEnabled ? [money(r.grossPay)] : []);
        return `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
      })
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Nómina ${esc(from)} a ${esc(to)}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:18px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#C8860A;color:#fff}</style></head>
      <body><h1>Resumen de Nómina · ${esc(from)} a ${esc(to)}</h1>
      <table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const exportCsv = () => {
    const headers = [
      "Vigilante", "Turnos", "Horas regulares", "Horas extra", "Horas totales",
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
    { key: "guardName", header: "Vigilante" },
    { key: "shifts", header: "Turnos" },
    { key: "daysWorked", header: "Días trab.", render: (_v, r) => <span className="font-medium">{r.daysWorked ?? 0}</span> },
    { key: "regularHours", header: "H. regulares", render: (_v, r) => r.regularHours.toFixed(2) },
    { key: "overtimeHours", header: "H. extra", render: (_v, r) => r.overtimeHours.toFixed(2) },
    { key: "totalHours", header: "H. totales", render: (_v, r) => r.totalHours.toFixed(2) },
    { key: "lateCount", header: "Tardanzas" },
    { key: "noShows", header: "Inasistencias" },
    { key: "approvedCorrections", header: "Correcciones" },
    { key: "payableHours", header: "H. pagables", render: (_v, r) => <span className="font-semibold">{r.payableHours.toFixed(2)}</span> },
    // Hourly basis → editable per-guard rate. Monthly basis → monthly salary column.
    ...(salaryBasis === "hourly"
      ? [{
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
        } as Column<any>]
      : [{
          key: "monthlySalary",
          header: "Sueldo mensual",
          render: (_v: any, r: SummaryRow) => <span className="text-muted-foreground">{r.monthlySalary != null ? money(r.monthlySalary) : "—"}</span>,
        } as Column<any>]),
    ...(ratesEnabled
      ? [{ key: "grossPay", header: salaryBasis === "monthly" ? "Total a pagar" : "Pago bruto", render: (_v: any, r: SummaryRow) => <span className="font-semibold text-primary">{money(r.grossPay)}</span> } as Column<any>]
      : []),
  ];

  return (
    <AppLayout>
      <PageContainer width="wide" className="p-4 sm:p-6">
        <PageHeader
          icon={<Wallet />}
          title="Resumen de Nómina"
          subtitle="Días trabajados, horas y pago por vigilante en el periodo"
        />

        {/* Toolbar: rango de fechas (izquierda) · exportar y acciones (derecha) */}
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-2">
            <label className="cg-eyebrow">
              Desde
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-border bg-background px-3 py-1.5 text-sm" />
            </label>
            <label className="cg-eyebrow">
              Hasta
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-border bg-background px-3 py-1.5 text-sm" />
            </label>
            <Button variant="brand" onClick={load} disabled={loading}>
              {loading ? "Generando…" : "Generar"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <FileDown className="mr-1.5 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!rows.length}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={!rows.length}>
              <Printer className="mr-1.5 h-4 w-4" /> PDF
            </Button>
            {salaryBasis === "hourly" && (
              editRates ? (
                <Button size="sm" onClick={saveRates} disabled={savingRates} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Save className="mr-1.5 h-4 w-4" /> {savingRates ? "Guardando…" : "Guardar tarifas"}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditRates(true)} disabled={!rows.length}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Editar tarifas
                </Button>
              )
            )}
            <Button variant="outline" size="sm" onClick={closePeriod} disabled={closing} className="text-red-600">
              <Lock className="mr-1.5 h-4 w-4" /> {closing ? "Cerrando…" : "Cerrar periodo"}
            </Button>
          </div>
        </div>

        {totals && (
          <Stagger className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={<CalendarDays />} accent="primary" label="Turnos" value={totals.shifts} />
            <StatCard icon={<Clock />} accent="blue" label="Horas totales" value={Number(totals.totalHours).toFixed(2)} />
            <StatCard icon={<Timer />} accent="orange" label="Horas extra" value={Number(totals.overtimeHours).toFixed(2)} />
            <StatCard
              icon={<Wallet />}
              accent={ratesEnabled ? "green" : "red"}
              label={ratesEnabled ? (salaryBasis === "monthly" ? "Total a pagar" : "Pago bruto") : "Tardanzas / Inasist."}
              value={ratesEnabled ? money(totals.grossPay) : `${totals.lateCount} / ${totals.noShows}`}
            />
          </Stagger>
        )}

        <div className="mt-5">
          <Section title="Detalle por vigilante" icon={<Wallet />}>
            <div className="overflow-x-auto">
              <DataTable
                columns={columns}
                data={rows}
                emptyState={<div className="py-12 text-center text-sm text-muted-foreground">Sin datos en el rango</div>}
              />
            </div>
          </Section>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
