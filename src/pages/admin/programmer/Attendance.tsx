import { useState, useEffect, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  EllipsisVertical,
  FileText,
  FileSpreadsheet,
  Printer,
  Mail,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  ClipboardCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import guardShiftService from "@/lib/api/guardShiftService";
import { toast } from "sonner";

// ── types ─────────────────────────────────────────────────────────────────

interface GuardShiftRecord {
  id: string;
  punchInTime: string;
  punchOutTime: string | null;
  punchInLatitude: number | null;
  punchInLongitude: number | null;
  punchOutLatitude: number | null;
  punchOutLongitude: number | null;
  shiftSchedule: "Diurno" | "Nocturno";
  numberOfPatrolsDuringShift: number | null;
  numberOfIncidentsDurindShift: number;
  observations: string;
  postSiteId: string | null;
  guardName: { id: string; fullName: string; governmentId?: string } | null;
  stationName: { id: string; stationName: string } | null;
  patrolsDone: any[];
  dailyIncidents: any[];
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function durationHours(start: string, end: string | null) {
  if (!end) return "—";
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (isNaN(diff) || diff <= 0) return "—";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function shiftStatus(rec: GuardShiftRecord) {
  if (rec.punchOutTime) return "completed";
  const inTime = new Date(rec.punchInTime).getTime();
  const now = Date.now();
  // if punched in within last 24h and no punch-out → "on duty"
  if (now - inTime < 24 * 3600 * 1000) return "onDuty";
  return "incomplete";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 font-medium">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Completado
      </Badge>
    );
  if (status === "onDuty")
    return (
      <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 font-medium">
        <Clock className="h-3 w-3 mr-1" />
        En Turno
      </Badge>
    );
  return (
    <Badge className="bg-red-500/15 text-red-700 border-red-200 font-medium">
      <AlertCircle className="h-3 w-3 mr-1" />
      Incompleto
    </Badge>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────────────

function DetailPanel({
  record,
  open,
  onClose,
}: {
  record: GuardShiftRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!record) return null;
  const status = shiftStatus(record);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Asistencia</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2 text-sm">
          {/* Guard & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-base">
                {record.guardName?.fullName ?? "Guardia desconocido"}
              </p>
              {record.guardName?.governmentId && (
                <p className="text-muted-foreground text-xs">
                  CI: {record.guardName.governmentId}
                </p>
              )}
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Schedule + Station */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Turno</p>
              <p className="font-medium">{record.shiftSchedule}</p>
            </div>
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Estación</p>
              <p className="font-medium">
                {record.stationName?.stationName ?? "—"}
              </p>
            </div>
          </div>

          {/* Punch In */}
          <div className="bg-green-500/10 rounded-md p-3 space-y-1">
            <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">
              Entrada
            </p>
            <p className="font-medium">
              {formatDate(record.punchInTime)}{" "}
              <span className="text-green-700">
                {formatTime(record.punchInTime)}
              </span>
            </p>
            {record.punchInLatitude && record.punchInLongitude && (
              <a
                href={`https://maps.google.com/?q=${record.punchInLatitude},${record.punchInLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline"
              >
                <MapPin className="h-3 w-3" />
                Ver ubicación
              </a>
            )}
          </div>

          {/* Punch Out */}
          {record.punchOutTime ? (
            <div className="bg-blue-500/10 rounded-md p-3 space-y-1">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                Salida
              </p>
              <p className="font-medium">
                {formatDate(record.punchOutTime)}{" "}
                <span className="text-blue-600">
                  {formatTime(record.punchOutTime)}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">
                Duración: {durationHours(record.punchInTime, record.punchOutTime)}
              </p>
              {record.punchOutLatitude && record.punchOutLongitude && (
                <a
                  href={`https://maps.google.com/?q=${record.punchOutLatitude},${record.punchOutLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <MapPin className="h-3 w-3" />
                  Ver ubicación
                </a>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-md p-3 text-muted-foreground text-xs italic">
              Sin registro de salida
            </div>
          )}

          {/* Counters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Rondas realizadas</p>
              <p className="text-xl font-bold text-[#C8860A]">
                {record.numberOfPatrolsDuringShift ?? 0}
              </p>
            </div>
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Incidentes</p>
              <p className="text-xl font-bold text-red-600">
                {record.numberOfIncidentsDurindShift ?? 0}
              </p>
            </div>
          </div>

          {/* Observations */}
          {record.observations && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                Observaciones
              </p>
              <p className="bg-slate-50 rounded-md p-3 text-foreground whitespace-pre-wrap">
                {record.observations}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [25, 50, 100];

// Default date window: last 30 days
function defaultDateFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}
function defaultDateTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const [allRecords, setAllRecords] = useState<GuardShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<GuardShiftRecord | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    startDate: defaultDateFrom(),
    endDate: defaultDateTo(),
    schedule: "",
  });

  // ── fetch ────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        limit: 500,
        orderBy: "punchInTime_DESC",
      };
      const rangeStart = filters.startDate
        ? filters.startDate + "T00:00:00.000Z"
        : "";
      const rangeEnd = filters.endDate
        ? filters.endDate + "T23:59:59.999Z"
        : "";
      if (rangeStart || rangeEnd) {
        params["filter[punchInTimeRange][]"] = [rangeStart, rangeEnd];
      }
      if (filters.schedule) {
        params["filter[shiftSchedule]"] = filters.schedule;
      }
      const res = await guardShiftService.list(params);
      const rows = Array.isArray(res) ? res : (res as any)?.rows ?? res;
      setAllRecords(rows);
    } catch {
      toast.error("Error al cargar registros de asistencia");
    } finally {
      setLoading(false);
    }
  }, [filters.startDate, filters.endDate, filters.schedule]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ── client-side search ───────────────────────────────────────────────────
  const filtered = allRecords.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.guardName?.fullName ?? "").toLowerCase().includes(q) ||
      (r.stationName?.stationName ?? "").toLowerCase().includes(q) ||
      (r.shiftSchedule ?? "").toLowerCase().includes(q) ||
      formatDate(r.punchInTime).toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── stats ────────────────────────────────────────────────────────────────
  const completedCount = allRecords.filter((r) => r.punchOutTime).length;
  const onDutyCount = allRecords.filter(
    (r) => !r.punchOutTime && Date.now() - new Date(r.punchInTime).getTime() < 24 * 3600 * 1000,
  ).length;
  const incompleteCount = allRecords.filter(
    (r) => !r.punchOutTime && Date.now() - new Date(r.punchInTime).getTime() >= 24 * 3600 * 1000,
  ).length;
  const totalIncidents = allRecords.reduce(
    (s, r) => s + (r.numberOfIncidentsDurindShift ?? 0),
    0,
  );

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Asistencia" },
        ]}
      />
      <div className="p-6 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total registros</p>
            <p className="text-2xl font-bold text-[#C8860A]">
              {loading ? "…" : allRecords.length}
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Completados</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? "…" : completedCount}
              </p>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">En Turno</p>
              <p className="text-2xl font-bold text-blue-600">
                {loading ? "…" : onDutyCount}
              </p>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Incidentes</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? "…" : totalIncidents}
              </p>
            </div>
          </div>
        </div>

        {/* Incomplete alert */}
        {!loading && incompleteCount > 0 && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>{incompleteCount}</strong>{" "}
              {incompleteCount === 1
                ? "registro sin salida hace más de 24h"
                : "registros sin salida hace más de 24h"}
            </span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por guardia, estación..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10 hover:text-[#C8860A]">
                    <Filter className="h-4 w-4 mr-2" /> Filtros
                    {(filters.startDate || filters.endDate || filters.schedule) && (
                      <Badge className="ml-2 bg-[#C8860A] text-white text-xs px-1.5 py-0.5">
                        activos
                      </Badge>
                    )}
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
                        <Label>Hasta la Fecha</Label>
                        <Input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Tipo de Turno</Label>
                      <Select
                        value={filters.schedule}
                        onValueChange={(v) => setFilters({ ...filters, schedule: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                          <SelectItem value="Diurno">Diurno</SelectItem>
                          <SelectItem value="Nocturno">Nocturno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 pt-4">
                      <Button
                        className="w-full bg-[#C8860A] hover:bg-[#b37809] text-white"
                        onClick={() => { setPage(1); setIsFiltersOpen(false); }}
                      >
                        Aplicar filtros
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10"
                        onClick={() => {
                          setFilters({
                            startDate: defaultDateFrom(),
                            endDate: defaultDateTo(),
                            schedule: "",
                          });
                          setPage(1);
                        }}
                      >
                        Restablecer filtros
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#C8860A]">
                    <EllipsisVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" /> Exportar como PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar como Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Mail className="mr-2 h-4 w-4" /> Enviar Informe por Correo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]"><Checkbox /></TableHead>
                <TableHead className="font-bold text-foreground">Fecha</TableHead>
                <TableHead className="font-bold text-foreground">Guardia</TableHead>
                <TableHead className="font-bold text-foreground">Estación</TableHead>
                <TableHead className="font-bold text-foreground">Turno</TableHead>
                <TableHead className="font-bold text-foreground">Entrada</TableHead>
                <TableHead className="font-bold text-foreground">Salida</TableHead>
                <TableHead className="font-bold text-foreground">Duración</TableHead>
                <TableHead className="font-bold text-foreground text-center">Rondas</TableHead>
                <TableHead className="font-bold text-foreground text-center">Incidentes</TableHead>
                <TableHead className="font-bold text-foreground">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-[300px] text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-[#C8860A]" />
                      <p className="text-sm">Cargando registros de asistencia...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="bg-blue-500/10 p-6 rounded-full mb-4">
                        <ClipboardCheck className="w-12 h-12 text-blue-200" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">
                        No se encontraron registros
                      </h3>
                      <p className="text-sm max-w-xs text-muted-foreground">
                        Prueba ajustando el rango de fechas o la búsqueda.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((rec) => {
                  const status = shiftStatus(rec);
                  return (
                    <TableRow
                      key={rec.id}
                      className="cursor-pointer hover:bg-slate-50/60"
                      onClick={() => setDetailRecord(rec)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(rec.punchInTime)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {rec.guardName?.fullName ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        {rec.stationName ? (
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                            {rec.stationName.stationName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            rec.shiftSchedule === "Diurno"
                              ? "bg-amber-500/15 text-amber-700 border-amber-200"
                              : "bg-indigo-500/15 text-indigo-700 border-indigo-200"
                          }
                        >
                          {rec.shiftSchedule}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-700 font-medium whitespace-nowrap">
                        {formatTime(rec.punchInTime)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {rec.punchOutTime ? (
                          <span className="text-blue-600 font-medium">
                            {formatTime(rec.punchOutTime)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {durationHours(rec.punchInTime, rec.punchOutTime)}
                      </TableCell>
                      <TableCell className="text-center font-medium text-[#C8860A]">
                        {rec.numberOfPatrolsDuringShift ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {(rec.numberOfIncidentsDurindShift ?? 0) > 0 ? (
                          <span className="font-bold text-red-600">
                            {rec.numberOfIncidentsDurindShift}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Elementos por página</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {filtered.length === 0
                ? "0 de 0"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} de ${filtered.length}`}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        record={detailRecord}
        open={!!detailRecord}
        onClose={() => setDetailRecord(null)}
      />
    </AppLayout>
  );
}
