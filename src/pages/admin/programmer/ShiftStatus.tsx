import { useState } from "react";
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
import { Search, Filter, EllipsisVertical, FileText, FileSpreadsheet, Printer, Mail, ChevronsUpDown, X } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";

interface ShiftStatus {
  id: string;
  date: string;
  guard: string;
  shiftTitle: string;
  startTime: string;
  endTime: string;
  status: "completed" | "in-progress" | "pending" | "cancelled";
}

export default function ShiftStatus() {
  const [shifts, setShifts] = useState<ShiftStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Filter State
  const [filters, setFilters] = useState({
    client: "",
    site: "",
    guard: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    showArchived: false,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En Progreso</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completado</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="w-full md:w-48">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Completar</SelectItem>
                <SelectItem value="cancel">Cancelar</SelectItem>
                <SelectItem value="delete">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar estado del turno"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
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
                      <Select value={filters.site} onValueChange={(v) => setFilters({ ...filters, site: v })}>
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
                          type="date"
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
                      <Button
                        variant="outline"
                        className="w-full text-orange-500 border-orange-200 hover:bg-orange-50"
                        onClick={() => setFilters({
                          client: "",
                          site: "",
                          guard: "",
                          startDate: "",
                          startTime: "",
                          endDate: "",
                          endTime: "",
                          showArchived: false,
                        })}
                      >
                        Guardar filtros
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
                <TableHead className="w-[50px]">
                  <Checkbox />
                </TableHead>
                <TableHead className="font-bold text-slate-700">Fecha</TableHead>
                <TableHead className="font-bold text-slate-700">Guardia</TableHead>
                <TableHead className="font-bold text-slate-700">Título del Turno</TableHead>
                <TableHead className="font-bold text-slate-700">Hora de Inicio</TableHead>
                <TableHead className="font-bold text-slate-700">Hora de Fin</TableHead>
                <TableHead className="font-bold text-slate-700">Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="bg-blue-50 p-6 rounded-full mb-4">
                        <svg
                          className="w-12 h-12 text-blue-200"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-slate-700 mb-1">No se encontraron resultados</h3>
                      <p className="text-sm max-w-xs">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell>{shift.date}</TableCell>
                    <TableCell>{shift.guard}</TableCell>
                    <TableCell>{shift.shiftTitle}</TableCell>
                    <TableCell>{shift.startTime}</TableCell>
                    <TableCell>{shift.endTime}</TableCell>
                    <TableCell>{getStatusBadge(shift.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <ChevronsUpDown className="h-4 w-4 text-slate-400" />
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
          <div className="text-sm text-muted-foreground">
            Elementos por página
          </div>
          <Select defaultValue="25">
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="25" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground mx-4">
            0 of 0
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" disabled>
              <span className="sr-only">Go to previous page</span>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button variant="outline" size="icon" disabled>
              <span className="sr-only">Go to next page</span>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}