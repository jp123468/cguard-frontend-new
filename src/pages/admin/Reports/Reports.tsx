import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, ArrowRight, Search, BarChart3, X } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { REPORT_SECTIONS } from "@/config/reports-config";
import { SECTION_THEME, iconForReport } from "./reportIcons";

interface ReportsProps {
  onNavigate?: (href: string) => void;
}

const Reports: React.FC<ReportsProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const go = (href?: string) => {
    if (!href) return;
    onNavigate ? onNavigate(href) : navigate(href);
  };

  const totalReports = useMemo(
    () => REPORT_SECTIONS.reduce((n, s) => n + s.reports.length, 0),
    [],
  );

  // Live filter across every report.
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return REPORT_SECTIONS;
    return REPORT_SECTIONS
      .map((s) => ({
        ...s,
        reports: s.reports.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.description || "").toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.reports.length > 0);
  }, [query]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-8 p-4 lg:p-8">
        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-[#C8860A]/10 via-card to-card p-6 lg:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#C8860A]/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#C8860A]/15 text-[#C8860A] shadow-sm">
                <BarChart3 size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">Centro de Reportes</h1>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  {totalReports} informes operativos, de incidentes, tiempo y nómina — todo en un solo lugar.
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar un informe…"
                className="w-full rounded-xl border border-border/50 bg-background/70 py-2.5 pl-10 pr-9 text-sm text-foreground outline-none backdrop-blur transition-all placeholder:text-muted-foreground/60 focus:border-[#C8860A] focus:ring-2 focus:ring-[#C8860A]/20"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted/40">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Sections ── */}
        {sections.length === 0 ? (
          <div className="py-20 text-center">
            <Search size={28} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Ningún informe coincide con “{query}”.</p>
          </div>
        ) : (
          sections.map((section) => {
            const theme = SECTION_THEME[section.id] || SECTION_THEME.general;
            const SectionIcon = theme.icon;
            return (
              <section key={section.id} className="space-y-3">
                {/* Section header */}
                <div className="flex items-center justify-between gap-4 px-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} ${theme.text}`}>
                      <SectionIcon size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">{section.title}</h2>
                      <p className="text-[11px] text-muted-foreground">{section.reports.length} informe{section.reports.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {section.settingsHref && (
                      <button
                        title="Configuración"
                        onClick={() => go(section.settingsHref)}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-border/40 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                      >
                        <Settings size={15} />
                      </button>
                    )}
                    {section.viewAllHref && (
                      <button
                        onClick={() => go(section.viewAllHref)}
                        className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-[#C8860A] transition-colors hover:bg-[#C8860A]/10"
                      >
                        Ver todo <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {section.reports.map((report) => {
                    const Icon = iconForReport(report.id, section.id);
                    return (
                      <button
                        key={report.id}
                        onClick={() => go(report.href)}
                        className={`group relative flex items-start gap-3.5 overflow-hidden rounded-2xl border border-border/40 bg-card p-4 text-left shadow-sm ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${theme.ring}`}
                      >
                        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} ${theme.text} transition-transform duration-200 group-hover:scale-105`}>
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold leading-snug text-foreground">{report.title}</h3>
                            {(report.openCount !== undefined || report.closedCount !== undefined) && (
                              <div className="flex shrink-0 gap-1">
                                {report.openCount !== undefined && (
                                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-bold text-emerald-500">{report.openCount}</span>
                                )}
                                {report.closedCount !== undefined && (
                                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted/60 px-1.5 text-[10px] font-bold text-muted-foreground">{report.closedCount}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{report.description}</p>
                        </div>
                        <ArrowRight size={16} className="absolute bottom-3 right-3 text-muted-foreground/0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/60" />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppLayout>
  );
};

export default Reports;
