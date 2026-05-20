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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Search, Filter, EllipsisVertical, FileText, FileSpreadsheet, Printer, Mail, ChevronsUpDown, X, Loader2, UserCheck } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import shiftService, { ShiftRecord } from "@/lib/api/shiftService";
import { securityGuardService } from "@/lib/api/securityGuardService";

// ── helpers ──────────────────────────────────────────────────────────────────

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

function durationHours(start: string, end: string) {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
  if (diff <= 0) return "—";
  return `${diff.toFixed(1)} h`;
}

interface GuardOption {
  userId: string;
  fullName: string;
}

// ── component ────────────────────────────────────────────────────────────────

export default function OpenShifts() {
  const [rawShifts, setRawShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Assign modal
  const [assignTarget, setAssignTarget] = useState<ShiftRecord | null>(null);
  const [allGuards, setAllGuards] = useState<GuardOption[]>([]);
  const [guardSearch, setGuardSearch] = useState("");
  const [selectedGuard, setSelectedGuard] = useState<GuardOption | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Filter State
  const [filters, setFilters] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // ── fetch open shifts ─────────────────────────────────────────────────────
  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { "filter[openOnly]": "true", limit: 500 };

      if (appliedFilters.startDate) {
        const from = appliedFilters.startDate + (appliedFilters.startTime ? `T${appliedFilters.startTime}` : "T00:00:00");
        params["filter[startTimeRange]"] = [new Date(from).toISOString()];
      }
      if (appliedFilters.endDate) {
        const to = appliedFilters.endDate + (appliedFilters.endTime ? `T${appliedFilters.endTime}` : "T23:59:59");
        const existing = params["filter[startTimeRange]"] ?? [];
        params["filter[startTimeRange]"] = [...existing, new Date(to).toISOString()];
      }

      const { rows } = await shiftService.list(params);
      setRawShifts(rows);
    } catch (err) {
      console.error("Failed to fetch open shifts", err);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  // ── load guards once when assign modal opens ──────────────────────────────
  useEffect(() => {
    if (!assignTarget) return;
    if (allGuards.length > 0) return; // already loaded
    (async () => {
      try {
        const resp: any = await securityGuardService.list({ limit: 200, offset: 0 } as any);
        const items: any[] = Array.isArray(resp) ? resp : (resp.rows ?? []);
        const opts: GuardOption[] = items
          .map((item: any) => {
            const userId = item.guard?.id ?? item.guardId ?? null;
            const fullName =
              item.fullName ??
              (item.guard?.firstName && item.guard?.lastName
                ? `${item.guard.firstName} ${item.guard.lastName}`
                : item.guard?.fullName ?? "");
            return userId ? { userId, fullName } : null;
          })
          .filter(Boolean) as GuardOption[];
        setAllGuards(opts);
      } catch (e) {
        console.error("Failed to load guards", e);
      }
    })();
  }, [assignTarget, allGuards.length]);

  // ── derived data ──────────────────────────────────────────────────────────
  const todayStr = new Date().toDateString();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const stats = {
    total: rawShifts.length,
    today: rawShifts.filter((s) => new Date(s.startTime).toDateString() === todayStr).length,
    thisWeek: rawShifts.filter((s) => new Date(s.startTime) >= weekStart).length,
  };

  const q = searchQuery.toLowerCase().trim();
  const filtered = rawShifts.filter((s) => {
    if (!q) return true;
    return (
      formatDate(s.startTime).toLowerCase().includes(q) ||
      (s.station?.stationName ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const filteredGuards = allGuards.filter((g) =>
    !guardSearch || g.fullName.toLowerCase().includes(guardSearch.toLowerCase())
  );

  // ── assign handler ────────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!assignTarget || !selectedGuard) return;
    setAssigning(true);
    try {
      await shiftService.assign(assignTarget.id, selectedGuard.userId);
      setRawShifts((prev) => prev.filter((s) => s.id !== assignTarget.id));
      setAssignTarget(null);
      setSelectedGuard(null);
      setGuardSearch("");
    } catch (err) {
      console.error("Failed to assign guard", err);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Turno Abierto" },
        ]}
      />
      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Abiertos</p>
            <p className="text-2xl font-bold text-orange-600">{stats.total}</p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Hoy</p>
            <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Esta Semana</p>
            <p className="text-2xl font-bold text-purple-600">{stats.thisWeek}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-end gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar estación o fecha"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10 hover:text-[#C8860A]">
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
                        className="w-full bg-[#C8860A] hover:bg-[#B37809] text-white"
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
                        className="w-full text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10"
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
                <TableHead className="font-bold text-foreground">Estación</TableHead>
                <TableHead className="font-bold text-foreground">Hora de Inicio</TableHead>
                <TableHead className="font-bold text-foreground">Hora de Fin</TableHead>
                <TableHead className="font-bold text-foreground">Duración</TableHead>
                <TableHead className="font-bold text-foreground">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[200px] text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="bg-blue-500/10 p-6 rounded-full mb-4">
                        <svg className="w-12 h-12 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">No hay turnos abiertos</h3>
                      <p className="text-sm max-w-xs">Todos los turnos tienen guardia asignado o no hay turnos en el período seleccionado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell><Checkbox /></TableCell>
                    <TableCell>{formatDate(shift.startTime)}</TableCell>
                    <TableCell>{shift.station?.stationName ?? "—"}</TableCell>
                    <TableCell>{formatTime(shift.startTime)}</TableCell>
                    <TableCell>{formatTime(shift.endTime)}</TableCell>
                    <TableCell>{durationHours(shift.startTime, shift.endTime)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10 hover:text-[#C8860A]"
                        onClick={() => {
                          setAssignTarget(shift);
                          setSelectedGuard(null);
                          setGuardSearch("");
                        }}
                      >
                        <UserCheck className="h-4 w-4 mr-1" /> Asignar guardia
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

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
      </div>

      {/* Assign Guard Modal */}
      <Dialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open) { setAssignTarget(null); setSelectedGuard(null); setGuardSearch(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Guardia</DialogTitle>
          </DialogHeader>
          {assignTarget && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-md p-3 text-sm">
                <div className="font-medium">{assignTarget.station?.stationName ?? "Sin estación"}</div>
                <div className="text-muted-foreground">
                  {formatDate(assignTarget.startTime)} · {formatTime(assignTarget.startTime)} – {formatTime(assignTarget.endTime)}
                  {" "}({durationHours(assignTarget.startTime, assignTarget.endTime)})
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar guardia..."
                  className="pl-9"
                  value={guardSearch}
                  onChange={(e) => setGuardSearch(e.target.value)}
                />
              </div>

              <div className="border rounded-md max-h-56 overflow-y-auto">
                {filteredGuards.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {allGuards.length === 0 ? "Cargando guardias..." : "No se encontraron guardias"}
                  </div>
                ) : (
                  filteredGuards.map((g) => (
                    <div
                      key={g.userId}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 border-b last:border-b-0 ${selectedGuard?.userId === g.userId ? "bg-orange-50" : ""}`}
                      onClick={() => setSelectedGuard(g)}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selectedGuard?.userId === g.userId ? "border-[#C8860A] bg-[#C8860A]" : "border-slate-300"}`} />
                      <span className="text-sm">{g.fullName}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setAssignTarget(null); setSelectedGuard(null); setGuardSearch(""); }}>
              Cancelar
            </Button>
            <Button
              className="bg-[#C8860A] hover:bg-[#B37809] text-white"
              disabled={!selectedGuard || assigning}
              onClick={handleAssign}
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}