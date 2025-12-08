import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

// Tipo para los registros
type DeveloperRequest = {
  id: number;
  createdAt: string;
  requestUrl: string;
  method: string;
  statusCode: number;
};

// Datos de ejemplo - reemplaza con datos reales de tu API
const mockRequests: DeveloperRequest[] = [];

export default function DeveloperRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filtrar datos
  const filteredRequests = mockRequests.filter((request) => {
    const matchesSearch = request.requestUrl
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesMethod =
      methodFilter === "all" || request.method === methodFilter;
    const matchesStatus =
      statusFilter === "all" || request.statusCode.toString() === statusFilter;
    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / parseInt(itemsPerPage));
  const startIndex = (currentPage - 1) * parseInt(itemsPerPage);
  const endIndex = startIndex + parseInt(itemsPerPage);
  const currentItems = filteredRequests.slice(startIndex, endIndex);

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <AppLayout>
      <SettingsLayout
        navKey="configuracion"
        title="Registros de solicitudes de desarrolladores"
      >
        <div className="space-y-6">
          {/* Barra de búsqueda y filtros */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Registros de solicitudes de búsqueda"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 whitespace-nowrap">
                  <Filter className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-600">Filtros</span>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Aplica filtros para refinar tu búsqueda
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Tipo de método</Label>
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Código de estado</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="200">200 - OK</SelectItem>
                        <SelectItem value="201">201 - Created</SelectItem>
                        <SelectItem value="400">400 - Bad Request</SelectItem>
                        <SelectItem value="401">401 - Unauthorized</SelectItem>
                        <SelectItem value="404">404 - Not Found</SelectItem>
                        <SelectItem value="500">500 - Server Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setMethodFilter("all");
                        setStatusFilter("all");
                      }}
                    >
                      Limpiar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setFilterOpen(false);
                        setCurrentPage(1);
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Tabla */}
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">
                    Fecha de creación
                  </TableHead>
                  <TableHead className="font-semibold">Solicitar URL</TableHead>
                  <TableHead className="font-semibold">Tipo de método</TableHead>
                  <TableHead className="font-semibold">
                    Código de estado de respuesta
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center py-12">
                        <svg
                          className="mb-4 h-32 w-32 text-blue-200"
                          viewBox="0 0 200 200"
                          fill="none"
                        >
                          <rect
                            x="60"
                            y="80"
                            width="80"
                            height="100"
                            rx="4"
                            fill="currentColor"
                          />
                          <circle cx="100" cy="50" r="25" fill="currentColor" />
                          <line
                            x1="85"
                            y1="45"
                            x2="95"
                            y2="45"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <line
                            x1="105"
                            y1="45"
                            x2="115"
                            y2="45"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 90 60 Q 100 55 110 60"
                            stroke="white"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                          />
                          <line
                            x1="170"
                            y1="30"
                            x2="175"
                            y2="25"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <line
                            x1="180"
                            y1="40"
                            x2="185"
                            y2="35"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <line
                            x1="160"
                            y1="50"
                            x2="165"
                            y2="45"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                        <h3 className="mb-2 text-lg font-semibold text-gray-700">
                          No se encontraron resultados
                        </h3>
                        <p className="text-center text-sm text-muted-foreground">
                          No pudimos encontrar
                          <br />
                          ningún elemento que
                          <br />
                          coincida con su
                          <br />
                          búsqueda
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.createdAt}</TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {request.requestUrl}
                      </TableCell>
                      <TableCell>{request.method}</TableCell>
                      <TableCell>{request.statusCode}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Elementos por página
              </span>
              <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {totalItems === 0
                  ? "0 de 0"
                  : `${startIndex + 1}-${Math.min(endIndex, totalItems)} de ${totalItems}`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={currentPage === 1 || totalItems === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={currentPage >= totalPages || totalItems === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}