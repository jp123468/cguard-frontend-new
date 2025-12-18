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
  Eye,
  Tag,
  Archive,
  Trash,
  RotateCcw,
} from "lucide-react";
import PostSiteImportDialog from "@/components/post-sites/PostSiteImportDialog";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import getServerErrorMessage from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { postSiteService, PostSite, PostSiteFilters } from "@/lib/api/postSiteService";
import { clientService } from "@/lib/api/clientService";
import { categoryService, type Category } from "@/lib/api/categoryService";
import CategoryManagerDialog from "@/components/categories/CategoryManagerDialog";
import CategoryAssignDialog from "@/components/categories/CategoryAssignDialog";
import PostSiteDetailsDialog from "@/components/post-sites/PostSiteDetailsDialog";
import { BulkActionsSelect, type BulkAction } from "@/components/table/BulkActionsSelect";
import { RowActionsMenu, type RowAction } from "@/components/table/RowActionsMenu";
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
  // By default show only active post sites in the list
  const [filters, setFilters] = useState<PostSiteFilters>({ active: true });
  
  // Filter options loading
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [openCategoryManager, setOpenCategoryManager] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [assignTargetIds, setAssignTargetIds] = useState<string[]>([]);
  const [bulkKey, setBulkKey] = useState(0);
  const navigate = useNavigate();
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  
  // Temporary filter state for the sheet
  const [tempFilters, setTempFilters] = useState<PostSiteFilters>({});

  const formatClientName = (client: Partial<Client>) => {
    const fullName = [client.name, client.lastName].filter(Boolean).join(" ").trim();
    return fullName || client.name || "";
  };

  const from = (postSites?.length ?? 0) > 0 ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, totalCount);

  // Load post sites
  const loadPostSites = async () => {
    setLoading(true);
    try {
      // Fetch post sites and clients in parallel so we can display client names
      // Build search filters: apply the query across name, email and phone
      // so backend can match any of these fields (more user-friendly).
      const searchFilters = { ...filters } as any;
      const q = (searchQuery || "").trim().toLowerCase();
      if (q) {
        // Only search by site/business name on the backend.
        // For better UX, also apply a client-side filter by site name
        // or client full name after we receive the rows.
        searchFilters.name = q;
      }

      // Debug: help inspect what filters are sent during search
      // eslint-disable-next-line no-console
      console.debug('[PostSitePage] searchFilters ->', searchFilters);

      // If category filter is provided, do not send it to backend (some endpoints
      // have inconsistent column names) — instead fetch and filter client-side.
      const categoryFilter = searchFilters.category ?? searchFilters.categoryId;
      if (categoryFilter) {
        // remove category from searchFilters before calling backend
        delete (searchFilters as any).category;
        delete (searchFilters as any).categoryId;
      }

      const [data, clientsResponse] = await Promise.all([
        postSiteService.list(searchFilters, { limit, offset: (page - 1) * limit }),
        clientService.getClients(),
      ]);

      // If we pulled data without backend category filter, apply it locally.
      if (categoryFilter) {
        data.rows = (data.rows || []).filter((r: any) => {
          const ids = (r as any).categoryIds || [];
          // accept if any category id matches or the mapped `categoryId` matches
          return ids.includes(categoryFilter) || (r.categoryId === categoryFilter);
        });
        data.count = data.rows.length;
      }

      const clientsMap = new Map<string, Client>();
      (clientsResponse.rows || []).forEach((c: Client) => clientsMap.set(c.id, c));

      // Attach client object to rows when possible
      const rowsWithClient: any[] = (data.rows || []).map((r: any) => ({
        ...r,
        client: r.client ?? clientsMap.get(r.clientId) ?? undefined,
      }));

      // If user searched, additionally filter client-side by site name or client name
      let finalRows = rowsWithClient;
      if (q) {
        finalRows = rowsWithClient.filter((r: any) => {
          const siteName = (r.name || "").toLowerCase();
          const clientName = (r.client ? formatClientName(r.client) : "").toLowerCase();
          return siteName.includes(q) || clientName.includes(q);
        });
      }

      setPostSites(finalRows);
      setTotalCount(q ? finalRows.length : data.count);
    } catch (error: any) {
      console.error(error);
      toast.error(getServerErrorMessage(error, "Error al cargar sitios de publicación"));
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
        .catch((error: any) => {
          console.error(error);
          toast.error(getServerErrorMessage(error, "Error al cargar opciones de filtro"));
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
      toast.warning("Selecciona al menos un sitio de publicación ");
      return;
    }
    // Open confirmation dialog for bulk delete
    setDeleteTargetIds(selectedIds.slice());
    setOpenDeleteDialog(true);
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
      toast.error(getServerErrorMessage(error, "Error al exportar PDF"));
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
      toast.error(getServerErrorMessage(error, "Error al exportar Excel"));
    }
  };

  const rowActions = (site: PostSite): RowAction[] => {
    const isActive = site.status === "active";
    if (isActive) {
      return [
        {
          label: "Ver Detalles",
          icon: <Eye className="h-4 w-4" />,
          onClick: () => {
            setSelectedSiteId(site.id);
            setOpenDetails(true);
          },
        },
        {
          label: "Categorizar",
          icon: <Tag className="h-4 w-4" />,
          onClick: () => {
            setAssignTargetIds([site.id]);
            setOpenAssignDialog(true);
          },
        },
        {
          label: "Archivo",
          icon: <Archive className="h-4 w-4" />,
          onClick: async () => {
            try {
              await postSiteService.update(site.id, { status: "inactive" } as any);
              toast.success("Sitio archivado");
              loadPostSites();
            } catch (e) {
              toast.error("Error al archivar");
            }
          },
        },
      ];
    }

      return [
      {
        label: "Ver Detalles",
        icon: <Eye className="h-4 w-4" />,
        onClick: () => {
          setSelectedSiteId(site.id);
          setOpenDetails(true);
        },
      },
      {
        label: "Eliminar",
        icon: <Trash className="h-4 w-4" />,
        onClick: () => {
          setDeleteTargetIds([site.id]);
          setOpenDeleteDialog(true);
        },
      },
      {
        label: "Restaurar",
        icon: <RotateCcw className="h-4 w-4" />,
        onClick: async () => {
          try {
            await postSiteService.update(site.id, { status: "active" } as any);
            toast.success("Sitio restaurado");
            loadPostSites();
          } catch (e) {
            toast.error("Error al restaurar");
          }
        },
      },
    ];
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
            <BulkActionsSelect
              key={bulkKey}
              actions={[
                { value: "mover", label: "Mover" },
                { value: "archivar", label: "Archivar" },
                { value: "gestionar-categorias", label: "Gestionar Categorías" },
              ]}
              onChange={async (action) => {
                if (action === "gestionar-categorias") {
                  setOpenCategoryManager(true);
                  setBulkKey((k) => k + 1);
                  return;
                }
                if (action === "archivar") {
                  if (selectedIds.length === 0) {
                    toast.warning("Selecciona al menos un sitio de publicación ");
                    setBulkKey((k) => k + 1);
                    return;
                  }
                  try {
                    await Promise.all(
                      selectedIds.map((id) => postSiteService.update(id, { status: "inactive" } as any))
                    );
                    toast.success("Sitios archivados");
                    setSelectedIds([]);
                    loadPostSites();
                    setBulkKey((k) => k + 1);
                  } catch (e) {
                    toast.error("Error al archivar");
                    setBulkKey((k) => k + 1);
                  }
                  return;
                }
                if (action === "mover") {
                  if (selectedIds.length === 0) {
                    toast.warning("Selecciona al menos un sitio de publicación ");
                    setBulkKey((k) => k + 1);
                    return;
                  }
                  setAssignTargetIds(selectedIds.slice());
                  setOpenAssignDialog(true);
                  setBulkKey((k) => k + 1);
                  return;
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar Sitios de Publicación"
                className="pl-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                    <Label>Correo Electrónico</Label>
                    <Input
                      placeholder="ejemplo@correo.com"
                      value={tempFilters.email || ""}
                      onChange={(e) =>
                        setTempFilters({
                          ...tempFilters,
                          email: e.target.value || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Número de Teléfono</Label>
                    <Input
                      placeholder="+593 123456789"
                      value={tempFilters.phoneNumber || ""}
                      onChange={(e) =>
                        setTempFilters({
                          ...tempFilters,
                          phoneNumber: e.target.value || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      placeholder="Quito"
                      value={tempFilters.city || ""}
                      onChange={(e) =>
                        setTempFilters({
                          ...tempFilters,
                          city: e.target.value || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>País</Label>
                    <Input
                      placeholder="Ecuador"
                      value={tempFilters.country || ""}
                      onChange={(e) =>
                        setTempFilters({
                          ...tempFilters,
                          country: e.target.value || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Categorías</Label>
                    <Select
                      value={tempFilters.category || "all"}
                      onValueChange={(v) =>
                        setTempFilters({
                          ...tempFilters,
                          category: v === "all" ? undefined : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={
                        tempFilters.active === undefined
                          ? "all"
                          : tempFilters.active
                          ? "active"
                          : "inactive"
                      }
                      onValueChange={(v) => {
                        if (v === "all") {
                          setTempFilters({ ...tempFilters, active: undefined });
                        } else if (v === "active") {
                          setTempFilters({ ...tempFilters, active: true });
                        } else {
                          setTempFilters({ ...tempFilters, active: false });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Archivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => {
                      const next = { ...tempFilters } as PostSiteFilters;
                      setFilters(next);
                      setOpenFilter(false);
                    }}
                  >
                    Aplicar Filtros
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setTempFilters({});
                      // Reset to default: only active items
                      setFilters({ active: true });
                      setSearchQuery("");
                      setOpenFilter(false);
                    }}
                  >
                    Limpiar Filtros
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
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" /> Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar como Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenImportDialog(true)}>
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
                  <Checkbox onCheckedChange={handleSelectAll} checked={selectedIds.length === postSites.length && postSites.length > 0} />
                </th>
                <th className="px-4 py-3 font-semibold">Sitio de publicación</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Teléfono</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
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
                      <p className="text-gray-500">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {(postSites ?? []).map((site) => (
                <tr key={site.id} className="border-b">
                  <td className="px-4 py-3">
                    <Checkbox 
                      checked={selectedIds.includes(site.id)}
                      onCheckedChange={(checked) => handleSelectOne(site.id, checked as boolean)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{site.name}</td>
                  <td className="px-4 py-3">{site.client ? formatClientName(site.client) : "-"}</td>
                  <td className="px-4 py-3">{site.email || "-"}</td>
                  <td className="px-4 py-3">{site.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      site.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {site.status === "active" ? "Activo" : "Archivado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActionsMenu actions={rowActions(site)} />
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

        <CategoryManagerDialog
          open={openCategoryManager}
          onOpenChange={setOpenCategoryManager}
          module="postSite"
          onChanged={loadPostSites}
        />

        <CategoryAssignDialog
          open={openAssignDialog}
          onOpenChange={setOpenAssignDialog}
          targetIds={assignTargetIds}
          onDone={() => {
            setSelectedIds([]);
            loadPostSites();
          }}
        />

        {/* Post site details dialog */}
        {selectedSiteId && (
          <>
            <PostSiteDetailsDialog
              open={openDetails}
              onOpenChange={(v) => setOpenDetails(v)}
              siteId={selectedSiteId}
            />
          </>
        )}

        {/* Confirm delete dialog (single or bulk) */}
        <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Eliminar sitio{deleteTargetIds.length > 1 ? 's' : ''}
              </AlertDialogTitle>
            </AlertDialogHeader>

            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar {deleteTargetIds.length} sitio{deleteTargetIds.length > 1 ? 's' : ''}? Esta acción no se puede deshacer.
            </AlertDialogDescription>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteTargetIds([])}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  try {
                    setDeleting(true);
                    await postSiteService.delete(deleteTargetIds);
                    toast.success(deleteTargetIds.length > 1 ? 'Sitios eliminados' : 'Sitio eliminado');
                    setSelectedIds([]);
                    setDeleteTargetIds([]);
                    setOpenDeleteDialog(false);
                    await loadPostSites();
                  } catch (e) {
                    console.error(e);
                    toast.error('Error al eliminar');
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PostSiteImportDialog
          open={openImportDialog}
          onOpenChange={(v) => setOpenImportDialog(v)}
          onSuccess={() => loadPostSites()}
        />

        </section>
    </AppLayout>
  );
}
