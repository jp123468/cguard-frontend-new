import { useState } from "react";
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
import { Filter, EllipsisVertical, FileText, FileSpreadsheet, Printer, Mail, Upload, CheckSquare, ChevronLeft, ChevronRight, DollarSign, BarChart3, Plus } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import ScheduleSidebar from "@/components/schedule/ScheduleSidebar";
import DayView from "@/components/schedule/DayView";
import WeekView from "@/components/schedule/WeekView";
import MonthView from "@/components/schedule/MonthView";
import ListView from "@/components/schedule/ListView";

interface ScheduleStats {
  totalShifts: number;
  confirmedShifts: number;
  unconfirmedShifts: number;
  openShifts: number;
  vacantShifts: number;
  unpublishedShifts: number;
  requestedShifts: number;
}

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 21)); // Nov 21, 2025
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "list">("day");
  const [selectedGuard, setSelectedGuard] = useState("Guardia");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showStatsCards, setShowStatsCards] = useState(true);
  const [showIncomeCards, setShowIncomeCards] = useState(true);

  // Stats
  const [stats] = useState<ScheduleStats>({
    totalShifts: 0,
    confirmedShifts: 0,
    unconfirmedShifts: 0,
    openShifts: 0,
    vacantShifts: 0,
    unpublishedShifts: 0,
    requestedShifts: 0,
  });

  // Estimated income
  const [estimatedIncome] = useState({
    postSiteHours: 0,
    guardHours: 0,
    laborCostIncome: 0,
  });

  // Filter State
  const [filters, setFilters] = useState({
    client: "",
    postSite: "",
    guard: "",
    shiftStatus: "",
    shiftType: "",
    startDate: "Nov 21, 2025",
    startTime: "00:00",
    endDate: "Nov 22, 2025",
    endTime: "00:00",
    showArchived: false,
  });

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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.totalShifts}</div>
              <div className="text-sm text-gray-600 mt-1">Horas</div>
              <div className="text-xs text-purple-600 font-medium mt-1">Total de Turnos</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.confirmedShifts}</div>
              <div className="text-sm text-gray-600 mt-1">Horas</div>
              <div className="text-xs text-green-600 font-medium mt-1">Turno Confirmado</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-gray-600">{stats.unconfirmedShifts}</div>
              <div className="text-sm text-gray-600 mt-1">Horas</div>
              <div className="text-xs text-gray-600 font-medium mt-1">Turno No Confirmado</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.openShifts}</div>
              <div className="text-sm text-gray-600 mt-1">Horas</div>
              <div className="text-xs text-blue-600 font-medium mt-1">Turno Abierto</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{stats.vacantShifts}</div>
              <div className="text-sm text-gray-600 mt-1">Horas</div>
              <div className="text-xs text-red-600 font-medium mt-1">Turno Vacante</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.unpublishedShifts}</div>
              <div className="text-sm text-gray-600 mt-1">Horas</div>
              <div className="text-xs text-blue-600 font-medium mt-1">Despublicar Turno</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.requestedShifts}</div>
              <div className="text-sm text-gray-600 mt-1">Horas</div>
              <div className="text-xs text-blue-600 font-medium mt-1">Turno Solicitado</div>
            </div>
          </div>
        )}

        {/* Income Cards - Conditional */}
        {showIncomeCards && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">$ {estimatedIncome.postSiteHours}</div>
              <div className="text-sm text-gray-600 mt-1">Horas del Sitio de Publicacion <span className="text-purple-600 font-medium">0</span></div>
              <div className="text-xs text-purple-600 font-medium mt-1">Ingreso Estimado</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">$ {estimatedIncome.guardHours}</div>
              <div className="text-sm text-gray-600 mt-1">Horas de Guardia <span className="text-blue-600 font-medium">0</span></div>
              <div className="text-xs text-blue-600 font-medium mt-1">Costo Laboral Estimado</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">$ {estimatedIncome.laborCostIncome}</div>
              <div className="text-sm text-gray-600 mt-1">Ingresos - Costo Laboral</div>
              <div className="text-xs text-purple-600 font-medium mt-1">Ganancia Bruta Estimada</div>
            </div>
          </div>
        )}

        {/* View Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div className="flex gap-2">
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              onClick={() => setViewMode("day")}
              className={viewMode === "day" ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : ""}
            >
              Día
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              onClick={() => setViewMode("week")}
              className={viewMode === "week" ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : ""}
            >
              Semana
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              onClick={() => setViewMode("month")}
              className={viewMode === "month" ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : ""}
            >
              Mes
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : ""}
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
              className={`${showIncomeCards ? 'text-orange-500 hover:bg-orange-50' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
              onClick={() => setShowIncomeCards(!showIncomeCards)}
              title="Mostrar/Ocultar Tarjetas de Ingresos"
            >
              <DollarSign className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`${showStatsCards ? 'text-orange-500 hover:bg-orange-50' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
              onClick={() => setShowStatsCards(!showStatsCards)}
              title="Mostrar/Ocultar Tarjetas de Estadísticas"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>

            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
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
                    <Label>Sitio de publicación*</Label>
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
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      Filtro
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-orange-500">
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

        {/* Calendar View */}
        <div className="bg-white border rounded-lg flex relative">
          {/* Sidebar */}
          <ScheduleSidebar
            selectedView={selectedGuard}
            onViewChange={setSelectedGuard}
          />

          {/* Main Content Area */}
          {viewMode === "day" && <DayView currentDate={currentDate} />}
          {viewMode === "week" && <WeekView currentDate={currentDate} />}
          {viewMode === "month" && <MonthView currentDate={currentDate} />}
          {viewMode === "list" && <ListView currentDate={currentDate} />}
        </div>
      </div>
    </AppLayout>
  );
}