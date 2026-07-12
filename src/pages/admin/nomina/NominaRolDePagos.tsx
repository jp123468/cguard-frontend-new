import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Wallet, FileSpreadsheet, Printer, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { PageContainer, PageHeader, Section, StatCard } from "@/components/kit";
import payrollService, { type Roster, type RosterRow } from "@/lib/api/payrollService";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const SOURCE_LABEL: Record<string, string> = {
  "guard-override": "Configurado",
  "tenant-default": "Sueldo base tenant",
  "sbu-fallback": "SBU (sin configurar)",
};

export default function NominaRolDePagos() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [decimo13, setDecimo13] = useState(true);
  const [decimo14, setDecimo14] = useState(true);
  const [fondos, setFondos] = useState(true);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    payrollService
      .roster(year, month, {
        decimoTerceroMensualizado: decimo13,
        decimoCuartoMensualizado: decimo14,
        fondosReservaMensualizado: fondos,
      })
      .then((r) => setRoster(r))
      .catch((e) => toast.error(e?.message || "No se pudo generar el rol de pagos"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, decimo13, decimo14, fondos]);

  useEffect(() => { load(); /* on mount */ /* eslint-disable-next-line */ }, []);

  const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
  const extras = (r: RosterRow) => r.payroll.earnings.supplementaryPay + r.payroll.earnings.extraordinaryPay + r.payroll.earnings.nightSurcharge;
  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const fallbackCount = useMemo(() => (roster?.rows || []).filter((r) => r.salarySource === "sbu-fallback").length, [roster]);

  // ── Exports ────────────────────────────────────────────────────────────────
  const COLS: Array<[string, (r: RosterRow) => string | number]> = [
    ["Vigilante", (r) => r.guardName],
    ["Sueldo", (r) => r.payroll.earnings.baseSalary],
    ["Horas extra ($)", (r) => Number(extras(r).toFixed(2))],
    ["Imponible", (r) => r.payroll.earnings.imponible],
    ["Décimo 13", (r) => r.payroll.earnings.decimoTercero],
    ["Décimo 14", (r) => r.payroll.earnings.decimoCuarto],
    ["Fondos reserva", (r) => r.payroll.earnings.fondosReserva],
    ["IESS personal", (r) => r.payroll.deductions.iessPersonal],
    ["Otras deduc.", (r) => r.payroll.deductions.other],
    ["Total ingresos", (r) => r.payroll.earnings.totalEarnings],
    ["Total deduc.", (r) => r.payroll.deductions.totalDeductions],
    ["Neto a pagar", (r) => r.payroll.netPay],
    ["IESS patronal", (r) => r.payroll.employerCost.iessPatronal],
    ["Salario", (r) => SOURCE_LABEL[r.salarySource] || r.salarySource],
  ];

  const exportExcel = () => {
    if (!roster) return;
    const header = COLS.map((c) => c[0]);
    const body = roster.rows.map((r) => COLS.map((c) => c[1](r)));
    const totalRow = ["TOTALES", "", "", roster.totals.imponible, "", "", "", roster.totals.iessPersonal, "", roster.totals.totalEarnings, roster.totals.totalDeductions, roster.totals.netPay, roster.totals.iessPatronal, ""];
    const ws = XLSX.utils.aoa_to_sheet([header, ...body, [], totalRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rol de pagos");
    XLSX.writeFile(wb, `rol-de-pagos-${year}-${String(month).padStart(2, "0")}.xlsx`);
    toast.success("Rol de pagos exportado (Excel)");
  };

  const printPdf = () => {
    if (!roster) return;
    const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const head = COLS.map((c) => `<th>${esc(c[0])}</th>`).join("");
    const rows = roster.rows
      .map((r) => `<tr>${COLS.map((c, i) => `<td class="${i === 0 || i === COLS.length - 1 ? "l" : "r"}">${i === 0 || i === COLS.length - 1 ? esc(c[1](r)) : money(Number(c[1](r)) || 0)}</td>`).join("")}</tr>`)
      .join("");
    const w = window.open("", "_blank");
    if (!w) { toast.error("Habilita las ventanas emergentes para exportar"); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Rol de pagos ${esc(periodLabel)}</title>
      <style>body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;margin:26px}
      h1{font-size:17px;margin:0 0 2px}.sub{color:#666;font-size:12px;margin:0 0 14px}
      table{border-collapse:collapse;width:100%;font-size:10.5px}
      th{background:#0f2747;color:#fff;padding:6px 7px;text-align:right}th:first-child,th:last-child{text-align:left}
      td{padding:5px 7px;border-bottom:1px solid #e5e7eb}.r{text-align:right;font-variant-numeric:tabular-nums}.l{text-align:left}
      tr:nth-child(even) td{background:#f7f8fa}
      tfoot td{font-weight:700;border-top:2px solid #0f2747;background:#eef2f7}
      .foot{margin-top:16px;color:#9aa3af;font-size:10px;text-align:right}</style></head><body>
      <h1>Rol de pagos — ${esc(periodLabel)}</h1>
      <p class="sub">${roster.count} trabajador(es) · Neto total a pagar: ${money(roster.totals.netPay)} · Costo patronal: ${money(roster.totals.employerCost)}</p>
      <table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td class="l">TOTALES</td><td class="r"></td><td class="r"></td><td class="r">${money(roster.totals.imponible)}</td><td class="r"></td><td class="r"></td><td class="r"></td><td class="r">${money(roster.totals.iessPersonal)}</td><td class="r"></td><td class="r">${money(roster.totals.totalEarnings)}</td><td class="r">${money(roster.totals.totalDeductions)}</td><td class="r">${money(roster.totals.netPay)}</td><td class="r">${money(roster.totals.iessPatronal)}</td><td class="l"></td></tr></tfoot>
      </table>
      <p class="foot">Generado por CGuardPro · para procesamiento contable</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const years = Array.from({ length: 4 }, (_, i) => now.getUTCFullYear() - i);

  return (
    <AppLayout>
      <PageContainer width="wide">
        <PageHeader
          icon={<Wallet />}
          title="Rol de pagos"
          subtitle="Calcula el rol de pagos del mes desde las horas registradas y expórtalo para que contabilidad procese las transferencias."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportExcel} disabled={!roster?.rows.length} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" onClick={printPdf} disabled={!roster?.rows.length} className="gap-2">
                <Printer className="h-4 w-4" /> PDF
              </Button>
            </div>
          }
        />

        {/* Period + options */}
        <Section title="Periodo" icon={<Wallet size={16} />}>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Mes</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Año</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Pagar este mes (mensualizado)</span>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><Checkbox checked={decimo13} onCheckedChange={(v) => setDecimo13(!!v)} /> Décimo 13</label>
                <label className="flex items-center gap-2"><Checkbox checked={decimo14} onCheckedChange={(v) => setDecimo14(!!v)} /> Décimo 14</label>
                <label className="flex items-center gap-2"><Checkbox checked={fondos} onCheckedChange={(v) => setFondos(!!v)} /> Fondos de reserva</label>
              </div>
            </div>
            <Button variant="brand" onClick={load} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Calcular
            </Button>
          </div>
        </Section>

        {/* Totals */}
        {roster && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<Wallet />} accent="green" label="Neto a pagar" value={money(roster.totals.netPay)} />
            <StatCard icon={<Wallet />} accent="blue" label="Total ingresos" value={money(roster.totals.totalEarnings)} />
            <StatCard icon={<Wallet />} accent="amber" label="IESS personal" value={money(roster.totals.iessPersonal)} />
            <StatCard icon={<Wallet />} accent="violet" label="Costo patronal" value={money(roster.totals.employerCost)} />
          </div>
        )}

        {fallbackCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {fallbackCount} vigilante(s) sin sueldo configurado — se usó el SBU. Configura sus sueldos en Nómina › Ajustes para un cálculo exacto.
          </div>
        )}

        {/* Table */}
        <Section className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center"><Loader2 className="animate-spin text-primary" size={26} /></div>
          ) : !roster || roster.rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">Sin vigilantes o sin datos para {periodLabel}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-semibold">Vigilante</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Sueldo</th>
                    <th className="px-3 py-2.5 text-right font-semibold">H. extra</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Imponible</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Déc. 13</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Déc. 14</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Fondos</th>
                    <th className="px-3 py-2.5 text-right font-semibold">IESS</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Neto a pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.rows.map((r) => (
                    <tr key={r.guardId} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-3 py-2.5 text-foreground">
                        {r.guardName}
                        {r.salarySource === "sbu-fallback" && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">SBU</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(r.payroll.earnings.baseSalary)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(extras(r))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(r.payroll.earnings.imponible)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(r.payroll.earnings.decimoTercero)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(r.payroll.earnings.decimoCuarto)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(r.payroll.earnings.fondosReserva)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-red-500">−{money(r.payroll.deductions.iessPersonal)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">{money(r.payroll.netPay)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-primary/40 bg-muted/40 font-semibold">
                    <td className="px-3 py-3">TOTALES ({roster.count})</td>
                    <td /><td /><td className="px-3 py-3 text-right tabular-nums">{money(roster.totals.imponible)}</td>
                    <td /><td /><td /><td className="px-3 py-3 text-right tabular-nums text-red-500">−{money(roster.totals.iessPersonal)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(roster.totals.netPay)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Section>
      </PageContainer>
    </AppLayout>
  );
}
