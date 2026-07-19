import { useState, useEffect, useCallback } from "react";
import { getTenantTimezone } from "@/utils/tenantLocation";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Search, Filter, EllipsisVertical, FileText, FileSpreadsheet, Printer, Mail, ChevronsUpDown, X, Loader2, ListChecks, Clock, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { PageContainer, PageHeader, Section, StatCard, Stagger, StatusBadge, EmptyState } from "@/components/kit";
import shiftService, { ShiftRecord } from "@/lib/api/shiftService";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    // Same tz as formatTime — mixed zones made a row's Fecha disagree with
    // its own hours for viewers outside the company timezone.
    timeZone: getTenantTimezone(),
  });
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: getTenantTimezone(),
  });
}

type ShiftStatusValue = "completed" | "in-progress" | "pending" | "cancelled";

function computeStatus(row: ShiftRecord): ShiftStatusValue {
  const now = new Date();
  const start = new Date(row.startTime);
  const end = new Date(row.endTime);
  if (!row.guardId) {
    return end < now ? "cancelled" : "pending";
  }
  if (now >= start && now <= end) return "in-progress";
  if (end < now) return "completed";
  return "pending";
}

// ── component ────────────────────────────────────────────────────────────────

export default function ShiftStatus() {
  const [rawShifts, setRawShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShiftStatusValue | "all">("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Date range filter
  const [filters, setFilters] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const fromDate = appliedFilters.startDate
        ? new Date(appliedFilters.startDate + (appliedFilters.startTime ? `T${appliedFilters.startTime}` : "T00:00:00")).toISOString()
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = appliedFilters.endDate
        ? new Date(appliedFilters.endDate + (appliedFilters.endTime ? `T${appliedFilters.endTime}` : "T23:59:59")).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { rows } = await shiftService.list({
        "filter[startTimeRange]": [fromDate, toDate],
        limit: 500,
        orderBy: "startTime_ASC",
      });
      setRawShifts(rows);
    } catch (err) {
      console.error("Failed to fetch shifts", err);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  // ── derived data ──────────────────────────────────────────────────────────
  const withStatus = rawShifts.map((r) => ({
    ...r,
    _status: computeStatus(r),
    _guardName: r.guard?.fullName ?? "Sin asignar",
    _stationName: r.station?.stationName ?? "Sin estación",
  }));

  const stats = {
    pending: withStatus.filter((r) => r._status === "pending").length,
    inProgress: withStatus.filter((r) => r._status === "in-progress").length,
    completed: withStatus.filter((r) => r._status === "completed").length,
    cancelled: withStatus.filter((r) => r._status === "cancelled").length,
  };

  const q = searchQuery.toLowerCase().trim();
  const filtered = withStatus.filter((r) => {
    if (statusFilter !== "all" && r._status !== statusFilter) return false;
    if (
      q &&
      !r._guardName.toLowerCase().includes(q) &&
      !r._stationName.toLowerCase().includes(q) &&
      !formatDate(r.startTime).toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── status badge ──────────────────────────────────────────────────────────
  const getStatusBadge = (status: ShiftStatusValue) => {
    switch (status) {
      case "pending":
        return <StatusBadge tone="orange">Pendiente</StatusBadge>;
      case "in-progress":
        return <StatusBadge tone="blue">En Progreso</StatusBadge>;
      case "completed":
        return <StatusBadge tone="green">Completado</StatusBadge>;
      case "cancelled":
        return <StatusBadge tone="red">Cancelado</StatusBadge>;
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Estado del Turno" },
        ]}
      />
      <PageContainer width="wide" className="px-4 lg:px-6">
        <PageHeader
          icon={<ListChecks />}
          title="Estado de Turnos"
          subtitle="Seguimiento del progreso de los turnos: pendientes, en curso y completados."
        />

        {/* Stats */}
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Pendientes" value={stats.pending} icon={<Clock />} accent="orange" />
          <StatCard label="En Progreso" value={stats.inProgress} icon={<PlayCircle />} accent="blue" />
          <StatCard label="Completados" value={stats.completed} icon={<CheckCircle2 />} accent="green" />
          <StatCard label="Cancelados" value={stats.cancelled} icon={<XCircle />} accent="red" />
        </Stagger>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="w-full md:w-52">
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v as ShiftStatusValue | "all"); setPage(1); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in-progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar vigilante o estación"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-primary border-primary/30 hover:bg-primary/10 hover:text-primary">
                    <Filter className="h-4 w-4 mr-2" /> Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader className="relative">
                    <SheetTitle>Filtros</SheetTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setIsFiltersOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Desde la Fecha</Label>
                        <Input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Hora</Label>
                        <Input
                          type="time"
                          value={filters.startTime}
                          onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Hasta la Fecha</Label>
                        <Input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Hora</Label>
                        <Input
                          type="time"
                          value={filters.endTime}
                          onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <Button
                        variant="brand"
                        className="w-full"
                        onClick={() => {
                          setAppliedFilters({ ...filters });
                          setIsFiltersOpen(false);
                          setPage(1);
                        }}
                      >
                        Aplicar Filtros
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => {
                          const empty = { startDate: "", startTime: "", endDate: "", endTime: "" };
                          setFilters(empty);
                          setAppliedFilters(empty);
                          setPage(1);
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Table */}
        <Section title="Turnos" icon={<ListChecks />} contentClassName="overflow-x-auto -mx-1">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[50px]"><Checkbox /></TableHead>
                <TableHead className="font-bold text-foreground">Fecha</TableHead>
                <TableHead className="font-bold text-foreground">Vigilante</TableHead>
                <TableHead className="font-bold text-foreground">Estación</TableHead>
                <TableHead className="font-bold text-foreground">Hora de Inicio</TableHead>
                <TableHead className="font-bold text-foreground">Hora de Fin</TableHead>
                <TableHead className="font-bold text-foreground">Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-[200px] text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-[360px] text-center">
                    <EmptyState
                      icon={<ListChecks />}
                      title="No se encontraron resultados"
                      description="No pudimos encontrar ningún elemento que coincida con su búsqueda."
                      className="border-0 py-2"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Checkbox /></TableCell>
                    <TableCell>{formatDate(row.startTime)}</TableCell>
                    <TableCell>{row._guardName}</TableCell>
                    <TableCell>{row._stationName}</TableCell>
                    <TableCell>{formatTime(row.startTime)}</TableCell>
                    <TableCell>{formatTime(row.endTime)}</TableCell>
                    <TableCell>{getStatusBadge(row._status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Section>

        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="text-sm text-muted-foreground">Elementos por página</div>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground mx-4">
            {filtered.length === 0
              ? "0 of 0"
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} of ${filtered.length}`}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <span className="sr-only">Página anterior</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <span className="sr-only">Página siguiente</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
