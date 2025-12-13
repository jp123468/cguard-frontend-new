import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
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
import {
  EllipsisVertical,
  Filter,
  FileDown,
  FileSpreadsheet,
  ArrowDownUp,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { postSiteService, PostSite, PostSiteFilters } from "@/lib/api/postSiteService";
import { clientService } from "@/lib/api/clientService";
import { categoryService, type Category } from "@/lib/api/categoryService";
import type { Client } from "@/types/client";

export default function PostSitePage() {
  const [openFilter, setOpenFilter] = useState(false);
  const [postSites, setPostSites] = useState<PostSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<PostSiteFilters>({});
  
  // Filter options loading
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  
  // Temporary filter state for the sheet
  const [tempFilters, setTempFilters] = useState<PostSiteFilters>({});

  const formatClientName = (client: Client) => {
    const fullName = [client.name, client.lastName].filter(Boolean).join(" ").trim();
    return fullName || client.name;
  };

  const from = (postSites?.length ?? 0) > 0 ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, totalCount);

  // Load post sites
  const loadPostSites = async () => {
    setLoading(true);
    try {
      const data = await postSiteService.list(
        { ...filters, name: searchQuery || undefined },
        { limit, offset: (page - 1) * limit }
      );
      setPostSites(data.rows);
      setTotalCount(data.count);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar sitios de publicación");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  useEffect(() => {
    loadPostSites();
  }, [page, limit, searchQuery, filters]);

  // Load filter options when sheet opens
  useEffect(() => {
    if (openFilter) {
      setLoadingFilters(true);
      Promise.all([
        clientService.getClients(),
        categoryService.list({ filter: { module: "postSite" } }),
      ])
        .then(([clientsResponse, categoriesResponse]) => {
          setClients(clientsResponse.rows);
          setCategories(categoriesResponse.rows);
          // Initialize temp filters from current filters
          setTempFilters(filters);
        })
        .catch((error) => {
          console.error(error);
          toast.error("Error al cargar opciones de filtro");
        })
        .finally(() => {
          setLoadingFilters(false);
        });
    }
  }, [openFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((postSites ?? []).map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Selecciona al menos un sitio");
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar ${selectedIds.length} sitio(s)?`)) return;
    try {
      await postSiteService.delete(selectedIds);
      toast.success("Sitios eliminados");
      setSelectedIds([]);
      loadPostSites();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.loading("Generando PDF...");
      const blob = await postSiteService.exportPDF(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sitios-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("PDF descargado");
    } catch (error: any) {
      toast.dismiss();
      toast.error(error?.response?.data?.message || "Error al exportar PDF");
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.loading("Generando Excel...");
      const blob = await postSiteService.exportExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sitios-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Excel descargado");
    } catch (error: any) {
      toast.dismiss();
      toast.error(error?.response?.data?.message || "Error al exportar Excel");
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Sitios de publicación" },
        ]}
      />

      <section className="p-4">
        {/* Acciones superiores */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select onValueChange={(action) => {
              if (action === "eliminar") handleBulkDelete();
            }}>
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
                placeholder="Buscar Sitios de Publicación"
                className="pl-9 w-64"
                onChange={(e) => console.log("buscar:", e.target.value)}
              />
            </div>

            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => console.log("Nuevo sitio de publicación")}
            >
              <Link to="/post-sites/new">Nuevo Sitio de Publicación</Link>
            </Button>

            {/* Filtros */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button variant="outline" className="text-orange-600 border-orange-200">
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
                    <Select 
                      value={tempFilters.categoryId || ""} 
                      onValueChange={(value) => {
                        setTempFilters(prev => ({
                          ...prev,
                          categoryId: value || undefined
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas las categorías</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select 
                      value={tempFilters.clientId || ""} 
                      onValueChange={(value) => {
                        setTempFilters(prev => ({
                          ...prev,
                          clientId: value || undefined
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos los clientes</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {formatClientName(client)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select 
                      value={tempFilters.status || ""} 
                      onValueChange={(value) => {
                        setTempFilters(prev => {
                          const newFilters: PostSiteFilters = { ...prev };
                          if (value === "") {
                            delete newFilters.status;
                          } else {
                            newFilters.status = value as 'active' | 'inactive';
                          }
                          return newFilters;
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos los estados</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => {
                      setFilters(tempFilters);
                      setOpenFilter(false);
                    }}
                    disabled={loadingFilters}
                  >
                    Aplicar Filtros
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
                  <Checkbox />
                </th>
                <th className="px-4 py-3 font-semibold">Sitio de publicación</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Correo Electrónico</th>
                <th className="px-4 py-3 font-semibold">Número de Teléfono</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {/* sin filas por defecto */}
              {(postSites?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                        alt="Sin datos"
                        className="h-36 mb-4"
                      />
                      <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
                      <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {(postSites ?? []).map((site) => (
                <tr key={site.id} className="border-b">
                  <td className="px-4 py-3">
                    <Checkbox />
                  </td>
                  <td className="px-4 py-3 font-medium">{site.name}</td>
                  <td className="px-4 py-3">{site.client?.name || "-"}</td>
                  <td className="px-4 py-3">{site.email || "-"}</td>
                  <td className="px-4 py-3">{site.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      site.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {site.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <EllipsisVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer de tabla - Única sección de paginación */}
          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50 border-x border-b rounded-b-lg">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
              <Select
                value={limit.toString()}
                onValueChange={(v) => {
                  setLimit(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              {from} – {to} de {totalCount}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= totalCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>

        </section>
    </AppLayout>
  );
}
