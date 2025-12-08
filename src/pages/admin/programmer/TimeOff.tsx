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
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, EllipsisVertical, Upload, FileText, FileSpreadsheet, Printer, Mail, ChevronsUpDown, X } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";

interface TimeOffRequest {
  id: string;
  requestDate: string;
  guard: string;
  type: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
  comment?: string;
  status: "pending" | "approved" | "rejected";
  isPaid?: boolean;
}

export default function TimeOff() {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // New Request Form State
  const [newRequest, setNewRequest] = useState<Partial<TimeOffRequest>>({
    guard: "",
    type: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    reason: "",
    comment: "",
    isPaid: undefined,
  });

  // Filter State
  const [filters, setFilters] = useState({
    guard: "",
    entryType: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    showArchived: false,
  });

  const handleAddRequest = () => {
    if (!newRequest.guard || !newRequest.type || !newRequest.startDate || !newRequest.endDate || !newRequest.reason) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    const request: TimeOffRequest = {
      id: Math.random().toString(36).substr(2, 9),
      requestDate: new Date().toLocaleDateString("es-ES"),
      guard: newRequest.guard || "",
      type: newRequest.type || "",
      startDate: newRequest.startDate || "",
      startTime: newRequest.startTime || "",
      endDate: newRequest.endDate || "",
      endTime: newRequest.endTime || "",
      reason: newRequest.reason || "",
      comment: newRequest.comment,
      status: "pending",
      isPaid: newRequest.isPaid,
    };
    setRequests([...requests, request]);
    setIsNewRequestOpen(false);
    setNewRequest({
      guard: "",
      type: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      reason: "",
      comment: "",
      isPaid: undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aprobado</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Solicitudes de tiempo libre" },
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
                <SelectItem value="approve">Aprobar</SelectItem>
                <SelectItem value="reject">Rechazar</SelectItem>
                <SelectItem value="delete">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar tiempo libre"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Sheet open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                    Nueva entrada
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader className="relative">
                    <SheetTitle>Nueva solicitud de tiempo libre</SheetTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setIsNewRequestOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetHeader>
                  <div className="grid gap-6 py-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="guard">Guardia*</Label>
                        <Select value={newRequest.guard} onValueChange={(v) => setNewRequest({ ...newRequest, guard: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ernesto">Ernesto Guerrero</SelectItem>
                            <SelectItem value="juan">Juan Pérez</SelectItem>
                            <SelectItem value="maria">María González</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="type">Tipo*</Label>
                        <Select value={newRequest.type} onValueChange={(v) => setNewRequest({ ...newRequest, type: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Pagado</SelectItem>
                            <SelectItem value="unpaid">No pagado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="startDate">Desde*</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newRequest.startDate}
                          onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="startTime">En*</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newRequest.startTime}
                          onChange={(e) => setNewRequest({ ...newRequest, startTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="endDate">Hasta*</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={newRequest.endDate}
                          onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="endTime">En*</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newRequest.endTime}
                          onChange={(e) => setNewRequest({ ...newRequest, endTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="reason">Razón*</Label>
                      <Select value={newRequest.reason} onValueChange={(v) => setNewRequest({ ...newRequest, reason: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leave">Leave</SelectItem>
                          <SelectItem value="sick">Sick</SelectItem>
                          <SelectItem value="vacation">Vacation</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {!newRequest.reason && (
                        <p className="text-xs text-red-500">Razón requerida</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="comment">Comentario</Label>
                      <Textarea
                        id="comment"
                        rows={4}
                        value={newRequest.comment}
                        onChange={(e) => setNewRequest({ ...newRequest, comment: e.target.value })}
                        placeholder="Escriba su comentario aquí..."
                      />
                    </div>
                  </div>
                  <SheetFooter>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto"
                      onClick={handleAddRequest}
                    >
                      AÑADIR
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

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
                      <Label>Guardia*</Label>
                      <Select value={filters.guard} onValueChange={(v) => setFilters({ ...filters, guard: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ernesto Guerrero (+1 otro)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ernesto">Ernesto Guerrero (+1 otro)</SelectItem>
                          <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Tipo de entrada</Label>
                      <Select value={filters.entryType} onValueChange={(v) => setFilters({ ...filters, entryType: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ambos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Ambos</SelectItem>
                          <SelectItem value="paid">Pagado</SelectItem>
                          <SelectItem value="unpaid">No pagado</SelectItem>
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
                          guard: "",
                          entryType: "",
                          startDate: "",
                          startTime: "",
                          endDate: "",
                          endTime: "",
                          showArchived: false,
                        })}
                      >
                        Limpiar filtros
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
                    <Upload className="mr-2 h-4 w-4" /> Importar solicitudes
                  </DropdownMenuItem>
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
                    <Mail className="mr-2 h-4 w-4" /> Correo Electrónico
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
                <TableHead className="font-bold text-slate-700">ID</TableHead>
                <TableHead className="font-bold text-slate-700">Fecha de solicitud</TableHead>
                <TableHead className="font-bold text-slate-700">Guardia</TableHead>
                <TableHead className="font-bold text-slate-700">Desde</TableHead>
                <TableHead className="font-bold text-slate-700">Hasta</TableHead>
                <TableHead className="font-bold text-slate-700">Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
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
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell className="font-medium">{request.id}</TableCell>
                    <TableCell>{request.requestDate}</TableCell>
                    <TableCell>{request.guard}</TableCell>
                    <TableCell>
                      {request.startDate} {request.startTime}
                    </TableCell>
                    <TableCell>
                      {request.endDate} {request.endTime}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
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