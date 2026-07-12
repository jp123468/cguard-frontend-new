import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import ReportPageShell from "./ReportPageShell";

export interface ReportColumn<T> {
  key: string;
  label: string;
  /** Cell value as a string (used for the table, CSV and print alike). */
  value: (row: T) => string;
  align?: "left" | "right" | "center";
}

interface DataReportProps<T> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  accent?: string;
  columns: ReportColumn<T>[];
  /** Fetch rows for a date range. Return the full set to display + export. */
  load: (range: { from: string; to: string }) => Promise<T[]>;
  /** Optional client-side text search over the rendered row values. */
  searchable?: boolean;
  /** Days back the default range spans (default 30). */
  defaultDays?: number;
  emptyMessage?: string;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function csvCell(v: string): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generic, data-driven report page. Wraps ReportPageShell with a real data
 * fetch, a themed table, a date-range filter and WORKING exports (Excel/CSV,
 * PDF and print — all client-side, no backend needed). Turns a 6-line dead
 * shell into a functioning, exportable report.
 */
export default function DataReport<T>({
  title, description, icon, accent, columns, load, searchable = true, defaultDays = 30, emptyMessage,
}: DataReportProps<T>) {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - defaultDays); return ymd(d); });
  const [to, setTo] = useState(() => ymd(today));
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchRows = useCallback(() => {
    setLoading(true);
    load({ from, to })
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch(() => { setRows([]); toast.error("No se pudo cargar el informe"); })
      .finally(() => setLoading(false));
  }, [from, to, load]);

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [from, to]);

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) => columns.some((c) => c.value(row).toLowerCase().includes(q)));
  }, [rows, search, columns, searchable]);

  const rangeLabel = `${from} a ${to}`;
  const fileBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const exportExcel = () => {
    const header = columns.map((c) => csvCell(c.label)).join(",");
    const body = filtered.map((row) => columns.map((c) => csvCell(c.value(row))).join(",")).join("\n");
    // UTF-8 BOM so Excel opens accents correctly.
    download(`${fileBase}-${to}.csv`, new Blob(["﻿" + header + "\n" + body], { type: "text/csv;charset=utf-8;" }));
    toast.success("Informe exportado (Excel)");
  };

  const printableHtml = () => {
    const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
    const body = filtered
      .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(c.value(row))}</td>`).join("")}</tr>`)
      .join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>
        body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;margin:28px}
        h1{font-size:18px;margin:0 0 2px} .sub{color:#666;font-size:12px;margin:0 0 16px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th{background:#0f2747;color:#fff;text-align:left;padding:7px 9px}
        td{padding:6px 9px;border-bottom:1px solid #e5e7eb}
        tr:nth-child(even) td{background:#f7f8fa}
        .foot{margin-top:18px;color:#9aa3af;font-size:10px;text-align:right}
      </style></head><body>
      <h1>${escapeHtml(title)}</h1>
      <p class="sub">Rango: ${escapeHtml(rangeLabel)} · ${filtered.length} registro(s)</p>
      <table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length}" style="text-align:center;color:#999;padding:24px">Sin datos</td></tr>`}</tbody></table>
      <p class="foot">Generado por CGuardPro</p>
      </body></html>`;
  };

  const openPrint = (autoPrint: boolean) => {
    const w = window.open("", "_blank");
    if (!w) { toast.error("Habilita las ventanas emergentes para exportar"); return; }
    w.document.write(printableHtml());
    w.document.close();
    if (autoPrint) { w.focus(); setTimeout(() => w.print(), 300); }
  };

  return (
    <ReportPageShell
      title={title}
      description={description}
      icon={icon}
      accent={accent}
      count={filtered.length}
      search={searchable ? search : undefined}
      onSearchChange={searchable ? setSearch : undefined}
      onExportExcel={exportExcel}
      onExportPdf={() => openPrint(true)}
      onPrint={() => openPrint(true)}
      empty={{ message: emptyMessage }}
      filters={
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Desde</label>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Hasta</label>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={26} />
        </div>
      ) : filtered.length === 0 ? null : (
        <div ref={tableRef} className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-2.5 font-semibold ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-2.5 text-foreground ${c.align === "right" ? "text-right tabular-nums" : c.align === "center" ? "text-center" : ""}`}>{c.value(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportPageShell>
  );
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
