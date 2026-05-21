import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, EllipsisVertical, FileText, FileSpreadsheet, Printer, Mail, Upload, CheckSquare, ChevronLeft, ChevronRight, DollarSign, BarChart3, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import ScheduleSidebar from "@/components/schedule/ScheduleSidebar";
import DayView from "@/components/schedule/DayView";
import WeekView from "@/components/schedule/WeekView";
import MonthView from "@/components/schedule/MonthView";
import ListView from "@/components/schedule/ListView";
import ShiftFormModal from "@/components/schedule/ShiftFormModal";
import shiftService, { ShiftRecord } from "@/lib/api/shiftService";
import { stationService } from "@/lib/api/stationService";

interface CoverageGap {
  startTime: string;
  endTime: string;
  hoursUncovered: number;
  stationName?: string;
}

interface StationCoverage {
  id: string;
  stationName: string;
  coverageScore: number;
  gaps: CoverageGap[];
}

export default function Schedule() {
  const [searchParams] = useSearchParams();
  const urlStationId = searchParams.get('stationId') || '';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "list">("week");
  const [selectedGuard, setSelectedGuard] = useState("Guardia");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showStatsCards, setShowStatsCards] = useState(true);
  const [showIncomeCards, setShowIncomeCards] = useState(false);

  // Real shift data
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // AI Schedule generation
  const [aiSchedule, setAiSchedule] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Coverage gap data
  const [stationCoverages, setStationCoverages] = useState<StationCoverage[]>([]);

  // Shift modal
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);

  // Filter State
  const [filters, setFilters] = useState({
    client: "",
    postSite: "",
    guard: "",
    shiftStatus: "",
    shiftType: "",
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "00:00",
    showArchived: false,
  });

  // Compute the date window for fetching
  const dateWindow = useMemo(() => {
    const from = new Date(currentDate);
    const to = new Date(currentDate);
    if (viewMode === 'day') {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      from.setDate(from.getDate() - from.getDay() + 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else if (viewMode === 'month') {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setMonth(to.getMonth() + 1, 0);
      to.setHours(23, 59, 59, 999);
    } else {
      // list: 14 days from current
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() + 13);
      to.setHours(23, 59, 59, 999);
    }
    return { from, to };
  }, [currentDate, viewMode]);

  const fetchShifts = () => {
    setLoading(true);
    shiftService
      .list({
        'filter[startTimeRange]': [dateWindow.from.toISOString(), dateWindow.to.toISOString()],
        limit: 500,
      })
      .then((res) => setShifts(res.rows ?? []))
      .catch(() => setShifts([]))
      .finally(() => setLoading(false));
  };

  const fetchCoverageGaps = (postSiteId: string) => {
    stationService
      .coverageGaps(postSiteId, dateWindow.from.toISOString(), dateWindow.to.toISOString())
      .then((res) => {
        setStationCoverages(
          res.stations.map((s) => ({
            id: s.id,
            stationName: s.stationName,
            coverageScore: s.coverageScore,
            gaps: s.gaps.map((g) => ({ ...g, stationName: s.stationName })),
          }))
        );
      })
      .catch(() => setStationCoverages([]));
  };

  useEffect(() => {
    fetchShifts();
    if (filters.postSite) fetchCoverageGaps(filters.postSite);
    else setStationCoverages([]);
  }, [dateWindow, filters.postSite]);

  // Auto-generate AI schedule when redirected from quick-assign with stationId
  useEffect(() => {
    if (!urlStationId) return;
    const tenantId = localStorage.getItem('tenantId') || '';
    if (!tenantId) return;

    setAiLoading(true);
    setAiError(null);

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days

    import('@/lib/api').then(({ default: api }) => {
      api.post(`/tenant/${tenantId}/scheduler/generate`, {
        stationId: urlStationId,
        startDate,
        endDate,
      })
        .then((resp: any) => {
          setAiSchedule(resp?.data || resp);
        })
        .catch((err: any) => {
          console.error('[AI Scheduler]', err);
          setAiError(err?.response?.data?.message || 'Error al generar horario');
        })
        .finally(() => setAiLoading(false));
    });
  }, [urlStationId]);

  const handleApplyAiSchedule = async () => {
    if (!aiSchedule?.proposedShifts) return;
    const tenantId = localStorage.getItem('tenantId') || '';
    setAiLoading(true);
    try {
      const { default: api } = await import('@/lib/api');
      await api.post(`/tenant/${tenantId}/scheduler/apply`, {
        stationId: urlStationId,
        proposedShifts: aiSchedule.proposedShifts,
      });
      setAiSchedule(null);
      fetchShifts(); // Refresh shifts list
    } catch (err: any) {
      setAiError(err?.response?.data?.message || 'Error al aplicar horario');
    } finally {
      setAiLoading(false);
    }
  };

  // Flat list of all gaps across all stations (for view overlays)
  const allGaps = useMemo<CoverageGap[]>(
    () => stationCoverages.flatMap((sc) => sc.gaps),
    [stationCoverages]
  );

  // Stations with coverage issues
  const stationsWithGaps = useMemo(
    () => stationCoverages.filter((sc) => sc.gaps.length > 0),
    [stationCoverages]
  );

  // Derived stats from real data
  const stats = useMemo(() => {
    const total = shifts.length;
    const withGuard = shifts.filter(s => s.guardId).length;
    const open = shifts.filter(s => !s.guardId).length;
    const totalHours = shifts.reduce((sum, s) => {
      const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
      return sum + ms / (1000 * 60 * 60);
    }, 0);
    return {
      total,
      withGuard,
      open,
      totalHours: Math.round(totalHours * 10) / 10,
    };
  }, [shifts]);

  const openCreateModal = () => {
    setEditingShift(null);
    setShiftModalOpen(true);
  };

  const openEditModal = (shift: ShiftRecord) => {
    setEditingShift(shift);
    setShiftModalOpen(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 14 : -14));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getWeekRange = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return `${startOfWeek.getDate()} ${startOfWeek.toLocaleDateString('es-ES', { month: 'short' })} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('es-ES', { month: 'short' })}`;
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Horario" },
        ]}
      />
      <div className="p-6 space-y-6">
        {/* Stats Cards - Conditional */}
        {showStatsCards && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
              <div className="text-sm text-foreground/70 mt-1">Turnos</div>
              <div className="text-xs text-purple-600 font-medium mt-1">Total del Período</div>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.withGuard}</div>
              <div className="text-sm text-foreground/70 mt-1">Asignados</div>
              <div className="text-xs text-green-600 font-medium mt-1">Con Guardia</div>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-500">{stats.open}</div>
              <div className="text-sm text-foreground/70 mt-1">Sin Guardia</div>
              <div className="text-xs text-red-500 font-medium mt-1">Turnos Abiertos</div>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalHours}</div>
              <div className="text-sm text-foreground/70 mt-1">Horas</div>
              <div className="text-xs text-blue-600 font-medium mt-1">Horas Totales</div>
            </div>
          </div>
        )}

        {/* Income Cards - Conditional (placeholder) */}
        {showIncomeCards && (
          <div className="bg-amber-500/10 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
            Las tarjetas de ingresos estarán disponibles cuando se configure la tarifa por hora por guardia y puesto.
          </div>
        )}

        {/* AI Schedule Generation Panel */}
        {(aiLoading || aiSchedule || aiError) && (
          <div className="bg-card border-2 border-purple-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-lg">Horario Generado por IA</h3>
            </div>

            {aiLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generando horario óptimo...</span>
              </div>
            )}

            {aiError && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>{aiError}</span>
              </div>
            )}

            {aiSchedule && !aiLoading && (
              <>
                <div className="text-sm text-muted-foreground">
                  Estación: <strong>{aiSchedule.station?.name}</strong> | 
                  Período: {aiSchedule.dateRange?.startDate} → {aiSchedule.dateRange?.endDate}
                </div>

                {aiSchedule.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2 text-center">
                      <div className="text-xl font-bold text-purple-600">{aiSchedule.summary.totalShifts}</div>
                      <div className="text-xs">Turnos Totales</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-center">
                      <div className="text-xl font-bold text-green-600">{aiSchedule.summary.titularShifts}</div>
                      <div className="text-xs">Titular</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2 text-center">
                      <div className="text-xl font-bold text-orange-600">{aiSchedule.summary.sacafrancoShifts}</div>
                      <div className="text-xs">Sacafranco</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-center">
                      <div className="text-xl font-bold text-blue-600">{aiSchedule.summary.totalHours}</div>
                      <div className="text-xs">Horas</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 text-center">
                      <div className="text-xl font-bold text-red-600">{aiSchedule.summary.overtimeHours}</div>
                      <div className="text-xs">Horas Extra</div>
                    </div>
                  </div>
                )}

                {aiSchedule.sacafrancoAssignments?.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Cobertura Sacafranco:</p>
                    <ul className="list-disc list-inside text-muted-foreground max-h-32 overflow-y-auto">
                      {aiSchedule.sacafrancoAssignments.slice(0, 10).map((sa: any, i: number) => (
                        <li key={i}>{sa.date}: <strong>{sa.sacafrancoName}</strong> cubre a {sa.coversFor} ({sa.reason})</li>
                      ))}
                      {aiSchedule.sacafrancoAssignments.length > 10 && (
                        <li>...y {aiSchedule.sacafrancoAssignments.length - 10} más</li>
                      )}
                    </ul>
                  </div>
                )}

                {aiSchedule.warnings?.length > 0 && (
                  <div className="text-sm text-amber-600">
                    <p className="font-medium">⚠️ Advertencias:</p>
                    <ul className="list-disc list-inside">
                      {aiSchedule.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleApplyAiSchedule} className="bg-purple-600 hover:bg-purple-700 text-white">
                    Aplicar Horario
                  </Button>
                  <Button variant="outline" onClick={() => setAiSchedule(null)}>
                    Descartar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* View Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div className="flex gap-2">
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              onClick={() => setViewMode("day")}
              className={viewMode === "day" ? "bg-muted text-foreground hover:bg-gray-300" : ""}
            >
              Día
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              onClick={() => setViewMode("week")}
              className={viewMode === "week" ? "bg-muted text-foreground hover:bg-gray-300" : ""}
            >
              Semana
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              onClick={() => setViewMode("month")}
              className={viewMode === "month" ? "bg-muted text-foreground hover:bg-gray-300" : ""}
            >
              Mes
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-muted text-foreground hover:bg-gray-300" : ""}
            >
              Lista
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium min-w-[150px] text-center">
              {viewMode === "week" ? getWeekRange() : formatDate(currentDate)}
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoy
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className={`${showIncomeCards ? 'text-[#C8860A] hover:bg-[#C8860A]/10' : 'bg-[#C8860A] text-white hover:bg-[#B37809]'}`}
              onClick={() => setShowIncomeCards(!showIncomeCards)}
              title="Mostrar/Ocultar Tarjetas de Ingresos"
            >
              <DollarSign className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`${showStatsCards ? 'text-[#C8860A] hover:bg-[#C8860A]/10' : 'bg-[#C8860A] text-white hover:bg-[#B37809]'}`}
              onClick={() => setShowStatsCards(!showStatsCards)}
              title="Mostrar/Ocultar Tarjetas de Estadísticas"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>

            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10 hover:text-[#C8860A]">
                  <Filter className="h-4 w-4 mr-2" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="relative">
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-4">
                  <div className="grid gap-2">
                    <Label>Cliente*</Label>
                    <Select value={filters.client} onValueChange={(v) => setFilters({ ...filters, client: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="central (+1 otro)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="central">central (+1 otro)</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Puesto de seguridad*</Label>
                    <Select value={filters.postSite} onValueChange={(v) => setFilters({ ...filters, postSite: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Catolica (+2 otros)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catolica">Catolica (+2 otros)</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Guardia*</Label>
                    <Select value={filters.guard} onValueChange={(v) => setFilters({ ...filters, guard: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="José Alejo Pinos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jose">José Alejo Pinos</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Estado del Turno</Label>
                    <Select value={filters.shiftStatus} onValueChange={(v) => setFilters({ ...filters, shiftStatus: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Tipo de Turno</Label>
                    <Select value={filters.shiftType} onValueChange={(v) => setFilters({ ...filters, shiftType: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo</SelectItem>
                        <SelectItem value="morning">Mañana</SelectItem>
                        <SelectItem value="evening">Tarde</SelectItem>
                        <SelectItem value="night">Noche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Desde la Fecha</Label>
                      <Input
                        type="text"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Hora*</Label>
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
                        type="text"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Hora*</Label>
                      <Input
                        type="time"
                        value={filters.endTime}
                        onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="archived"
                      checked={filters.showArchived}
                      onCheckedChange={(checked) => setFilters({ ...filters, showArchived: checked as boolean })}
                    />
                    <Label htmlFor="archived" className="text-sm font-normal cursor-pointer">
                      Mostrar datos archivados
                    </Label>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Button className="w-full bg-[#C8860A] hover:bg-[#C8860A] text-white">
                      Filtro
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
                <DropdownMenuItem>
                  <Upload className="mr-2 h-4 w-4" /> Publicar y Despublicar
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CheckSquare className="mr-2 h-4 w-4" /> Asignar Turno en Masa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Coverage Alert Banner */}
        {stationsWithGaps.length > 0 && (
          <div className="bg-red-500/10 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-red-700">
                  {stationsWithGaps.length} estación{stationsWithGaps.length > 1 ? 'es' : ''} sin cobertura completa en este período
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {stationsWithGaps.map((sc) => (
                    <span key={sc.id} className="inline-flex items-center gap-1.5 text-xs bg-card border border-red-200 text-red-700 px-2 py-1 rounded-full">
                      <span className={`w-2 h-2 rounded-full ${sc.coverageScore >= 80 ? 'bg-yellow-400' : sc.coverageScore >= 50 ? 'bg-orange-400' : 'bg-red-500'}`} />
                      {sc.stationName} — {sc.coverageScore}% cobertura
                    </span>
                  ))}
                </div>
              </div>
              {stationCoverages.length > 0 && stationCoverages.every(sc => sc.gaps.length === 0) && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-500/10 border border-green-200 px-3 py-1.5 rounded-full">
                  <ShieldCheck className="h-3.5 w-3.5" /> Cobertura completa
                </div>
              )}
            </div>
          </div>
        )}

        {stationCoverages.length > 0 && stationsWithGaps.length === 0 && (
          <div className="bg-green-500/10 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-800">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Todas las estaciones tienen cobertura completa en este período.
          </div>
        )}

        {/* Calendar View */}
        <div className="bg-card border rounded-lg flex relative">
          {/* Sidebar */}
          <ScheduleSidebar
            selectedView={selectedGuard}
            onViewChange={setSelectedGuard}
          />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20 rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-[#C8860A]" />
            </div>
          )}

          {/* Main Content Area */}
          {viewMode === "day" && (
            <DayView
              currentDate={currentDate}
              shifts={shifts}
              gaps={allGaps}
              onCreateShift={openCreateModal}
              onEditShift={openEditModal}
            />
          )}
          {viewMode === "week" && (
            <WeekView
              currentDate={currentDate}
              shifts={shifts}
              gaps={allGaps}
              onCreateShift={openCreateModal}
              onEditShift={openEditModal}
            />
          )}
          {viewMode === "month" && <MonthView currentDate={currentDate} />}
          {viewMode === "list" && (
            <ListView
              currentDate={currentDate}
              shifts={shifts}
              onCreateShift={openCreateModal}
              onEditShift={openEditModal}
            />
          )}
        </div>
      </div>

      {/* Shift Create/Edit Modal */}
      <ShiftFormModal
        open={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        onSuccess={fetchShifts}
        initialDate={currentDate}
        editShift={editingShift}
      />
    </AppLayout>
  );
}