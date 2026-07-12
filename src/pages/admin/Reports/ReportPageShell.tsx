import { useState, type ReactNode } from "react";
import {
  Search, Filter, MoreVertical, FileText, FileSpreadsheet, Printer, Mail,
  ChevronLeft, ChevronRight, Inbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { PageContainer, PageHeader, Section, EmptyState } from "@/components/kit";

const fieldCls =
  "w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Default filter fields, used when a page doesn't supply its own. */
function DefaultFilters() {
  return (
    <>
      {["Cliente", "Puesto de seguridad", "Vigilante"].map((label) => (
        <div key={label} className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">{label}</label>
          <select className={fieldCls}>
            <option>Todos</option>
          </select>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Desde</label>
          <input type="date" className={fieldCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Hasta</label>
          <input type="date" className={fieldCls} />
        </div>
      </div>
      <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
        <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
        Mostrar datos archivados
      </label>
    </>
  );
}

/**
 * Premium shared chrome for every report page: themed kit PageHeader, toolbar
 * (search + filters drawer + export menu), a Section content frame with a clean
 * empty state, and a pagination footer. Pass `children` to render a real table.
 */
export default function ReportPageShell({
  title, breadcrumb, description, icon: Icon, accent = "#C8860A",
  filters, children, empty, count = 0,
  search: searchProp, onSearchChange,
  onExportPdf, onExportExcel, onPrint, onEmail, exporting,
}: {
  title: string;
  breadcrumb?: string;
  description?: string;
  icon?: LucideIcon;
  accent?: string;
  filters?: ReactNode;
  children?: ReactNode;
  empty?: { title?: string; message?: string };
  count?: number;
  /** Controlled search (optional — falls back to local state). */
  search?: string;
  onSearchChange?: (v: string) => void;
  /** Export actions — wired into the dropdown. Omitted actions are hidden. */
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
  exporting?: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const search = searchProp !== undefined ? searchProp : localSearch;
  const setSearch = (v: string) => (onSearchChange ? onSearchChange(v) : setLocalSearch(v));
  const hasExport = !!(onExportPdf || onExportExcel || onPrint || onEmail);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Reportes", path: "/reports" },
          { label: breadcrumb || title },
        ]}
      />

      <PageContainer width="wide">
        {/* ── Header + toolbar ── */}
        <PageHeader
          title={title}
          subtitle={description}
          icon={Icon ? <Icon /> : undefined}
          actions={
            <>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar…"
                  className="w-full rounded-xl border border-border/50 bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                    <Filter className="h-4 w-4" /> Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] overflow-y-auto sm:w-[440px]">
                  <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                  <div className="mt-6 space-y-5">
                    {filters || <DefaultFilters />}
                    <Button variant="brand" onClick={() => setFiltersOpen(false)} className="w-full">
                      Aplicar filtros
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {hasExport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Exportar" disabled={exporting}>
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {onExportPdf && (
                      <DropdownMenuItem className="gap-2" onSelect={onExportPdf}><FileText className="h-4 w-4 text-muted-foreground" /> Exportar como PDF</DropdownMenuItem>
                    )}
                    {onExportExcel && (
                      <DropdownMenuItem className="gap-2" onSelect={onExportExcel}><FileSpreadsheet className="h-4 w-4 text-muted-foreground" /> Exportar como Excel</DropdownMenuItem>
                    )}
                    {onPrint && (
                      <DropdownMenuItem className="gap-2" onSelect={onPrint}><Printer className="h-4 w-4 text-muted-foreground" /> Imprimir</DropdownMenuItem>
                    )}
                    {onEmail && (
                      <DropdownMenuItem className="gap-2" onSelect={onEmail}><Mail className="h-4 w-4 text-muted-foreground" /> Enviar por correo</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          }
        />

        {/* ── Content frame ── */}
        <Section className="p-0 overflow-hidden" contentClassName="">
          {children ? (
            children
          ) : (
            <div className="px-6 py-16">
              <EmptyState
                className="border-0 py-0"
                icon={<Inbox />}
                title={empty?.title || "Sin datos para mostrar"}
                description={empty?.message || "Ajusta los filtros o el rango de fechas para ver resultados en este informe."}
                action={
                  <Button onClick={() => setFiltersOpen(true)} variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                    <Filter className="h-4 w-4" /> Configurar filtros
                  </Button>
                }
              />
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border/30 px-4 py-3 text-xs text-muted-foreground">
            <span>Elementos por página: 25</span>
            <div className="flex items-center gap-3">
              <span>{count === 0 ? "0 – 0 de 0" : `1 – ${count} de ${count}`}</span>
              <div className="flex items-center gap-1">
                <button disabled className="grid h-7 w-7 place-items-center rounded-lg opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled className="grid h-7 w-7 place-items-center rounded-lg opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </Section>
      </PageContainer>
    </AppLayout>
  );
}
