import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

import {
  EllipsisVertical,
  Filter,
  FileDown,
  FileSpreadsheet,
  ArrowDownUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Tag,
  Archive,
} from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumb from "@/components/ui/breadcrumb";
import securityGuardService from "@/lib/api/securityGuardService";

// Tipos para los guardias de seguridad
type GuardStatus = "Activo" | "Pendiente" | "Invitado";

interface SecurityGuard {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: GuardStatus;
  raw?: any; // Para detalles
}

export default function SecurityGuardsPage() {
  const [openFilter, setOpenFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Estado principal SIN datos de prueba
  const [guards, setGuards] = useState<SecurityGuard[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsGuard, setDetailsGuard] = useState<SecurityGuard | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ejemplo de dónde cargar datos reales:
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    securityGuardService
      .list()
      .then((data) => {
        console.log("[SecurityGuardsPage] securityGuardService.list response:", data);
        if (!mounted) return;
        // Algunos endpoints devuelven { rows, count } u otras formas
        const normalize = (item: any): SecurityGuard => {
          const guardObj = item.guard ?? {};
          const id = guardObj.id ?? item.guardId ?? item.id ?? "";
          const name =
            (guardObj.firstName && guardObj.lastName)
              ? `${guardObj.firstName} ${guardObj.lastName}`
              : item.fullName ?? `${guardObj.firstName ?? ""} ${guardObj.lastName ?? ""}`.trim();
          const email = guardObj.email ?? item.email ?? "";
          const phone =
            guardObj.phone ?? guardObj.phoneNumber ?? item.phone ?? item.mobile ?? "";
          const status: GuardStatus = ((): GuardStatus => {
            const s = (guardObj.status ?? item.status ?? "").toString().toLowerCase();
            if (s === "active" || s === "activo") return "Activo";
            if (s === "invited" || s === "invitado") return "Invitado";
            if (s === "pending" || s === "pendiente") return "Pendiente";
            if (typeof item.isOnDuty === "boolean") return item.isOnDuty ? "Activo" : "Pendiente";
            return "Pendiente";
          })();

          return {
            id,
            name: name || "-",
            email,
            phone,
            status,
            raw: item,
          };
        };

        if (Array.isArray(data)) setGuards(data.map(normalize));
        else if (data && Array.isArray((data as any).rows)) setGuards((data as any).rows.map(normalize));
        else setGuards([]);
      })
      .catch((err) => {
        console.log("[SecurityGuardsPage] securityGuardService.list error:", err);
        if (!mounted) return;
        console.error("Error cargando guardias:", err);
        setError(String(err?.message || err));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Reiniciar página cuando cambie criterio de búsqueda o tamaño de página
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // Filtrado por búsqueda
  const filteredGuards = useMemo(() => {
    if (!searchQuery) return guards;
    const lowerQuery = searchQuery.toLowerCase();
    return guards.filter(
      (g) =>
        g.name.toLowerCase().includes(lowerQuery) ||
        g.email.toLowerCase().includes(lowerQuery) ||
        g.phone.includes(searchQuery)
    );
  }, [guards, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredGuards.length / itemsPerPage));

  // Paginado
  const paginatedGuards = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredGuards.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGuards, currentPage, itemsPerPage]);

  // Selección individual
  const handleSelectGuard = useCallback((guardId: string, checked: boolean) => {
    setSelectedGuards((prev) =>
      checked ? [...prev, guardId] : prev.filter((id) => id !== guardId)
    );
  }, []);

  // Seleccionar/deseleccionar todos EN LA PÁGINA ACTUAL
  const allOnPageSelected =
    paginatedGuards.length > 0 &&
    paginatedGuards.every((g) => selectedGuards.includes(g.id));

  const handleSelectAllGuards = useCallback((checked: boolean) => {
    setSelectedGuards((prev) => {
      const idsOnPage = paginatedGuards.map((g) => g.id);
      if (checked) {
        const merged = new Set([...prev, ...idsOnPage]);
        return Array.from(merged);
        } else {
        return prev.filter((id) => !idsOnPage.includes(id));
      }
    });
  }, [paginatedGuards]);

  // Badges de estado
  const renderStatus = useCallback((status: GuardStatus) => {
    switch (status) {
      case "Activo":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Activo
          </Badge>
        );
      case "Pendiente":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Pendiente
          </Badge>
        );
      case "Invitado":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Invitado
          </Badge>
        );
      default:
        return null;
    }
  }, []);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Guardias de Seguridad" },
        ]}
      />
      <div className="p-4">
        <section className="">
          {/* Acciones superiores */}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activar">Activar</SelectItem>
                  <SelectItem value="inactivar">Inactivar</SelectItem>
                  <SelectItem value="eliminar">Eliminar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar guardia"
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Button className="bg-orange-500 hover:bg-orange-600 text-white" asChild>
                <Link to="/security-guards/new">Nuevo Guardia</Link>
              </Button>

              {/* Filtros */}
              <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-orange-600 border-orange-200"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Categorías</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">Todas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Sitio de publicación</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sitio de publicación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Conjunto de Habilidades</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Conjunto de Habilidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Departamento</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estado*</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los Guardias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los Guardias</SelectItem>
                          <SelectItem value="activos">Activos</SelectItem>
                          <SelectItem value="pendientes">Pendientes</SelectItem>
                          <SelectItem value="invitados">Invitados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => {
                        // Aplica tus filtros reales aquí
                        setOpenFilter(false);
                      }}
                    >
                      Filtro
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Menú superior (exportar/importar) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <EllipsisVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => console.log("Exportar PDF")}>
                    <FileDown className="mr-2 h-4 w-4" /> Exportar como PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log("Exportar Excel")}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar como Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log("Importar")}>
                    <ArrowDownUp className="mr-2 h-4 w-4" /> Importar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tabla */}
          <div className="mt-4 border rounded-lg overflow-hidden">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="px-4 py-3">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={(v) =>
                        handleSelectAllGuards(Boolean(v))
                      }
                      aria-label="Seleccionar todos los guardias de esta página"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Correo Electrónico</th>
                  <th className="px-4 py-3 font-semibold">Número de Móvil</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {paginatedGuards.length > 0 ? (
                  paginatedGuards.map((guard) => (
                    <tr key={guard.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedGuards.includes(guard.id)}
                          onCheckedChange={(v) =>
                            handleSelectGuard(guard.id, Boolean(v))
                          }
                          aria-label={`Seleccionar ${guard.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                          {(guard.name?.trim()?.[0] ?? "G").toUpperCase()}
                        </div>
                        {guard.name}
                      </td>
                      <td className="px-4 py-3">{guard.email}</td>
                      <td className="px-4 py-3">{guard.phone}</td>
                      <td className="px-4 py-3">{renderStatus(guard.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <EllipsisVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setDetailsGuard(guard);
                                setDetailsOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                // Placeholder para categorizar
                                alert("Funcionalidad de categorizar próximamente");
                              }}
                            >
                              <Tag className="mr-2 h-4 w-4" /> Categorizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                // Archivar (placeholder)
                                alert("Guardia archivado (simulado)");
                              }}
                            >
                              <Archive className="mr-2 h-4 w-4" /> Archivo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-20">
                      <div className="flex flex-col items-center justify-center text-center">
                        <img
                          src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                          alt="Sin datos"
                          className="h-36 mb-4"
                        />
                        <h3 className="text-lg font-semibold">
                          No se encontraron resultados
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                          No pudimos encontrar ningún elemento que coincida con
                          su búsqueda
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Paginación (única) */}
            <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50">
              <div className="flex items-center gap-2">
                <span>Elementos por página</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue placeholder={String(itemsPerPage)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  {filteredGuards.length > 0
                    ? `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
                        currentPage * itemsPerPage,
                        filteredGuards.length
                      )} de ${filteredGuards.length}`
                    : "0 – 0 de 0"}
                </div>
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-r-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8 rounded-l-none border-l-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {/* Modal de detalles del guardia */}
      {detailsOpen && detailsGuard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            // Solo cerrar si el click es en el fondo, no en el modal
            if (e.target === e.currentTarget) setDetailsOpen(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 sm:p-10 relative border border-gray-200 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold"
              onClick={() => setDetailsOpen(false)}
              aria-label="Cerrar"
              style={{ lineHeight: 1 }}
            >
              ×
            </button>
            <h2 className="text-xl sm:text-2xl font-bold mb-1 text-center">Detalles del Guardia</h2>
            <div className="mb-4 text-xs sm:text-sm text-gray-500 text-center">Información detallada del guardia seleccionado.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
              <div>
                <div className="font-semibold text-gray-700 text-sm">Nombre</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.firstName ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Apellidos</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.lastName ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Correo</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.email ?? detailsGuard.email ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Teléfono</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guard?.phoneNumber ?? detailsGuard.phone ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Cédula</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.governmentId ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Credencial Guardia</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.guardCredentials ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Dirección</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.address ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Fecha de nacimiento</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.birthDate ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Lugar de nacimiento</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.birthPlace ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Estado civil</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.maritalStatus ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Tipo de sangre</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.bloodType ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Instrucción académica</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.academicInstruction ?? "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Contrato</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.hiringContractDate ?? "-"}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="font-semibold text-gray-700 text-sm">Género</div>
                <div className="text-gray-800 text-sm break-words">{detailsGuard.raw?.gender ?? "-"}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setDetailsOpen(false)}
                className="text-sm px-4 py-1"
              >
                Cerrar
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-1"
                onClick={() => {
                  setDetailsOpen(false);
                  const realId = detailsGuard.raw?.id || detailsGuard.id;
                  navigate(`/security-guards/edit/${realId}`);
                }}
              >
                Editar
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}