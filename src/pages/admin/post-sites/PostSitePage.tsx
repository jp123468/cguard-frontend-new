import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { usePageTitle } from '@/hooks/usePageTitle';
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
  Pencil,
  ChevronRight,
  ChevronDown,
  Loader2,
  ChevronUp,
  Building2,
  CheckCircle2,
  Archive as ArchiveIcon,
  Layers,
} from "lucide-react";
import { PageContainer, PageHeader, Section, StatCard, StatusBadge, EmptyState, Stagger } from "@/components/kit";
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
import { stationService, PostSite, PostSiteFilters } from "@/lib/api/stationService";
import { useTranslation } from "react-i18next";
import { clientService } from "@/lib/api/clientService";
import { categoryService, type Category } from "@/lib/api/categoryService";
import CategoryManagerDialog from "@/components/categories/CategoryManagerDialog";
import CategoryAssignDialog from "@/components/categories/CategoryAssignDialog";
import MobileCardList from '@/components/responsive/MobileCardList';
import { ServiceTypeBadge } from '@/components/post-sites/ServiceTypeBadge';
import { SERVICE_TYPES } from '@/lib/serviceTypes';
// PostSiteDetailsDialog is now rendered as a full page under /post-sites/:id
import { BulkActionsSelect, type BulkAction } from "@/components/table/BulkActionsSelect";
import { RowActionsMenu, type RowAction } from "@/components/table/RowActionsMenu";
import type { Client } from "@/types/client";
import { usePermissions } from '@/hooks/usePermissions';

export default function PostSitePage() {
  const { t } = useTranslation();
  usePageTitle('Puestos de Vigilancia');

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
  const { hasPermission } = usePermissions();
  // Sorting state (client-side for post sites list)
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  // Expandable rows: stations sub-items
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [stationsMap, setStationsMap] = useState<Record<string, any[]>>({});
  const [loadingStations, setLoadingStations] = useState<Set<string>>(new Set());
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);

  // Temporary filter state for the sheet
  const [tempFilters, setTempFilters] = useState<PostSiteFilters>({});

  const toggleExpand = async (siteId: string) => {
    const next = new Set(expandedIds);
    if (next.has(siteId)) {
      next.delete(siteId);
      setExpandedIds(next);
      return;
    }
    next.add(siteId);
    setExpandedIds(next);
    // Fetch stations if not already cached
    if (!stationsMap[siteId]) {
      setLoadingStations((prev) => new Set(prev).add(siteId));
      try {
        const res = await stationService.list({ postSite: siteId } as any, { limit: 50, offset: 0 });
        setStationsMap((prev) => ({ ...prev, [siteId]: res.rows }));
      } catch {
        setStationsMap((prev) => ({ ...prev, [siteId]: [] }));
      } finally {
        setLoadingStations((prev) => { const s = new Set(prev); s.delete(siteId); return s; });
      }
    }
  };

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
        stationService.list(searchFilters, { limit, offset: (page - 1) * limit }),
        // Fetch a high limit so every client is present in clientsMap below;
        // otherwise tenants with more clients than the default page size get
        // client:undefined on out-of-page rows → 'Cliente —'.
        clientService.getClients(undefined, { limit: 1000, offset: 0 }),
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

      // Apply client-side sorting if requested
      if (sortKey) {
        finalRows = finalRows.slice().sort((a: any, b: any) => {
          const getVal = (row: any) => {
            if (sortKey === "name") return (row.name || "").toString().toLowerCase();
            if (sortKey === "client") return (row.client ? formatClientName(row.client) : "").toString().toLowerCase();
            if (sortKey === "email") return (row.email || "").toString().toLowerCase();
            if (sortKey === "phone") return (row.phone || "").toString().toLowerCase();
            return (row[sortKey] ?? "").toString().toLowerCase();
          };
          const va = getVal(a);
          const vb = getVal(b);
          if (va < vb) return sortDir === "asc" ? -1 : 1;
          if (va > vb) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }

      setPostSites(finalRows);
      setTotalCount(q ? finalRows.length : data.count);
    } catch (error: any) {
      console.error(error);
      // Do not show error toast; log instead
      console.warn(getServerErrorMessage(error, "Error al cargar Puestos de Vigilancia"));
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
          console.warn(getServerErrorMessage(error, "Error al cargar opciones de filtro"));
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
      console.warn(t('postSites.selectAtLeastOne', 'Selecciona al menos un Puesto de seguridad'));
      return;
    }
    // Open confirmation dialog for bulk delete
    setDeleteTargetIds(selectedIds.slice());
    setOpenDeleteDialog(true);
  };

  const handleExportPDF = async () => {
    try {
      toast.loading(t('postSites.generatingPDF', 'Generando PDF...'));
      const blob = await stationService.exportPDF(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sitios-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(t('postSites.pdfDownloaded', 'PDF descargado'));
    } catch (error: any) {
      toast.dismiss();
      console.warn(getServerErrorMessage(error, "Error al exportar PDF"));
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.loading(t('postSites.generatingExcel', 'Generando Excel...'));
      const blob = await stationService.exportExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sitios-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(t('postSites.excelDownloaded', 'Excel descargado'));
    } catch (error: any) {
      toast.dismiss();
      console.warn(getServerErrorMessage(error, "Error al exportar Excel"));
    }
  };

  const rowActions = (site: PostSite): RowAction[] => {
    const isActive = site.status === "active";
    if (isActive) {
      return [
        {
          label: t('postSites.viewDetails', 'Ver Detalles'),
          icon: <Eye className="h-4 w-4" />,
          onClick: () => {
            navigate(`/post-sites/${site.id}`);
          },
        },
        {
          label: t('postSites.edit', 'Editar'),
          icon: <Pencil className="h-4 w-4" />,
          onClick: () => {
            navigate(`/post-sites/${site.id}/edit`);
          },
        },
        {
          label: t('postSites.categorize', 'Sectorizar'),
          icon: <Tag className="h-4 w-4" />,
          onClick: () => {
            setAssignTargetIds([site.id]);
            setOpenAssignDialog(true);
          },
        },
        {
          label: t('postSites.archive', 'Archivo'),
          icon: <Archive className="h-4 w-4" />,
          onClick: async () => {
              try {
              await stationService.update(site.id, { status: "inactive" } as any);
              toast.success("Sitio archivado");
              loadPostSites();
            } catch (e) {
              toast.error("Error al archivar");
            }
          },
        },
        {
          label: t('actions.delete', 'Eliminar'),
          icon: <Trash className="h-4 w-4 text-red-500" />,
          onClick: () => {
            setDeleteTargetIds([site.id]);
            setOpenDeleteDialog(true);
          },
        },
      ];
    }

    return [
      {
        label: t('actions.viewDetails', 'Ver Detalles'),
        icon: <Eye className="h-4 w-4" />,
        onClick: () => {
          navigate(`/post-sites/${site.id}`);
        },
      },
      {
        label: t('postSites.edit', 'Editar'),
        icon: <Pencil className="h-4 w-4" />,
        onClick: () => {
          navigate(`/post-sites/${site.id}/edit`);
        },
      },
      {
        label: t('actions.delete', 'Eliminar'),
        icon: <Trash className="h-4 w-4" />,
        onClick: () => {
          setDeleteTargetIds([site.id]);
          setOpenDeleteDialog(true);
        },
      },
      {
        label: t('actions.restore', 'Restaurar'),
        icon: <RotateCcw className="h-4 w-4" />,
            onClick: async () => {
            try {
              await stationService.update(site.id, { status: "active" } as any);
            toast.success(t('postSites.postsiterestore', 'Sitio restaurado'));
            loadPostSites();
          } catch (e) {
            toast.error(t('postSites.postsiterestoreerror', 'Error al restaurar el sitio'));
          }
        },
      },
    ];
  };

  // KPI counts (presentation-only, derived from already-loaded rows/state)
  const activeCount = (postSites ?? []).filter((s) => s.status === "active").length;
  const archivedCount = (postSites ?? []).filter((s) => s.status !== "active").length;

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: t('postSites.postsitdash', 'Panel de control'), path: "/dashboard" },
          { label: t('postSites.postsite', 'Puestos de Vigilancia') },
        ]}
      />

      <section className="p-4">
        <PageContainer width="wide">
        <PageHeader
          icon={<Building2 />}
          title={t('postSites.postsite', 'Puestos de Vigilancia')}
          subtitle={t('postSites.heroSubtitle', 'Gestiona tus sitios de vigilancia, estaciones y servicios.') as string}
          actions={
            hasPermission('postSiteCreate') ? (
              <Button asChild variant="brand" className="w-full sm:w-auto">
                <Link to="/post-sites/new">{t('postSites.newPostSite', 'Nuevo Puesto de seguridad')}</Link>
              </Button>
            ) : undefined
          }
        />

        {/* KPIs */}
        <Stagger className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t('postSites.kpiTotal', 'Total mostrados') as string}
            value={totalCount}
            icon={<Layers />}
            accent="primary"
          />
          <StatCard
            label={t('postSites.filters.active', 'Activo') as string}
            value={activeCount}
            icon={<CheckCircle2 />}
            accent="green"
          />
          <StatCard
            label={t('postSites.filters.archived', 'Archivado') as string}
            value={archivedCount}
            icon={<ArchiveIcon />}
            accent="slate"
          />
        </Stagger>

        {/* Acciones superiores */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BulkActionsSelect
              key={bulkKey}
              actions={useMemo(() => {
                const actions: BulkAction[] = [];
                if (hasPermission('postSiteEdit')) actions.push({ value: "mover", label: t('postSites.move', 'Mover') });
                if (filters.active === true) {
                  if (hasPermission('postSiteEdit')) actions.push({ value: "archivar", label: t('postSites.archive', 'Archivar') });
                } else if (filters.active === false) {
                  if (hasPermission('postSiteEdit')) actions.push({ value: "restaurar", label: t('postSites.restore', 'Restaurar') });
                  if (hasPermission('postSiteDestroy')) actions.push({ value: "eliminar", label: t('postSites.delete', 'Eliminar') });
                } else {
                  if (hasPermission('postSiteEdit')) actions.push({ value: "archivar", label: t('postSites.archive', 'Archivar') });
                  if (hasPermission('postSiteEdit')) actions.push({ value: "restaurar", label: t('postSites.restore', 'Restaurar') });
                  if (hasPermission('postSiteDestroy')) actions.push({ value: "eliminar", label: t('postSites.delete', 'Eliminar') });
                }
                if (hasPermission('postSiteEdit')) actions.push({ value: "gestionar-Tipos", label: t('postSites.manageCategories', 'Gestionar Sectores') });
                return actions;
              }, [filters.active, hasPermission])}
              onChange={async (action) => {
                // centralized bulk action handler
                if (action === "gestionar-Tipos") {
                  setOpenCategoryManager(true);
                  setBulkKey((k) => k + 1);
                  return;
                }
                if (action === "archivar") {
                  if (selectedIds.length === 0) { console.warn(t('postSites.selectAtLeastOne', 'Selecciona al menos un Puesto de seguridad')); setBulkKey((k) => k + 1); return; }
                  try {
                    await Promise.all(selectedIds.map((id) => stationService.update(id, { status: "inactive" } as any)));
                    toast.success(t('postSites.sitesArchived', 'Sitios archivados'));
                    setSelectedIds([]);
                    loadPostSites();
                    setBulkKey((k) => k + 1);
                  } catch (e) {
                    console.warn('Error al archivar');
                    setBulkKey((k) => k + 1);
                  }
                  return;
                }
                if (action === "restaurar") {
                  if (selectedIds.length === 0) { console.warn(t('postSites.selectAtLeastOne', 'Selecciona al menos un Puesto de seguridad')); setBulkKey((k) => k + 1); return; }
                  try {
                    await Promise.all(selectedIds.map((id) => stationService.update(id, { status: "active" } as any)));
                    toast.success(t('postSites.sitesRestored', 'Sitios restaurados'));
                    setSelectedIds([]);
                    loadPostSites();
                    setBulkKey((k) => k + 1);
                  } catch (e) {
                    console.warn('Error al restaurar');
                    setBulkKey((k) => k + 1);
                  }
                  return;
                }
                if (action === "eliminar") {
                  if (selectedIds.length === 0) { setBulkKey((k) => k + 1); return; }
                  setDeleteTargetIds(selectedIds.slice());
                  setOpenDeleteDialog(true);
                  setBulkKey((k) => k + 1);
                  return;
                }
                if (action === "mover") {
                  if (selectedIds.length === 0) { console.warn(t('postSites.selectAtLeastOne', 'Selecciona al menos un Puesto de seguridad')); setBulkKey((k) => k + 1); return; }
                  setAssignTargetIds(selectedIds.slice());
                  setOpenAssignDialog(true);
                  setBulkKey((k) => k + 1);
                  return;
                }
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('postSites.searchPlaceholder', 'Buscar Puestos de Vigilancia')}
                className="pl-9 w-full sm:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filtros */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="text-primary border-primary/30"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {t('postSites.filtersTitle', 'Filtros')}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[460px] h-full sm:h-auto">
                <SheetHeader>
                  <SheetTitle>{t('postSites.filtersTitle', 'Filtros')}</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>{t('postSites.filters.city', 'Ciudad')}</Label>
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
                    <Label>{t('postSites.filters.country', 'País')}</Label>
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
                    <Label>{t('postSites.filters.categories', 'Sectores')}</Label>
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
                        <SelectValue placeholder={t('postSites.filters.categories', 'Sectores')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('postSites.filters.all', 'Todas')}</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de servicio</Label>
                    <Select
                      value={(tempFilters as any).serviceType || "all"}
                      onValueChange={(v) =>
                        setTempFilters({
                          ...tempFilters,
                          serviceType: v === "all" ? undefined : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {SERVICE_TYPES.map((st) => (
                          <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('postSites.filters.status', 'Estado')}</Label>
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
                        <SelectValue placeholder={t('postSites.filters.status', 'Estado')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('postSites.filters.all', 'Todos')}</SelectItem>
                        <SelectItem value="active">{t('postSites.filters.active', 'Activo')}</SelectItem>
                        <SelectItem value="inactive">{t('postSites.filters.archived', 'Archivado')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="brand"
                    className="w-full"
                    onClick={() => {
                      const next = { ...tempFilters } as PostSiteFilters;
                      setFilters(next);
                      setOpenFilter(false);
                    }}
                  >
                    {t('postSites.filters.applyFilters', 'Aplicar Filtros')}
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
                    {t('postSites.filters.clearFilters', 'Limpiar Filtros')}
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
                  <FileDown className="mr-2 h-4 w-4" /> {t('postSites.pdfexport', 'Exportar como PDF')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> {t('postSites.excelexport', 'Exportar como Excel')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenImportDialog(true)}>
                  <ArrowDownUp className="mr-2 h-4 w-4" /> {t('postSites.import', 'Importar')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabla */}
        <Section
          title={t('postSites.listTitle', 'Listado de puestos') as string}
          icon={<Building2 />}
          className="hidden md:block"
          contentClassName="border rounded-xl overflow-hidden"
        >
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox onCheckedChange={handleSelectAll} checked={selectedIds.length === postSites.length && postSites.length > 0} />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (sortKey !== "name") {
                        setSortKey("name");
                        setSortDir("asc");
                      } else if (sortDir === "asc") {
                        setSortDir("desc");
                      } else {
                        setSortKey(null);
                        setSortDir(null);
                      }
                      setPage(1);
                    }}
                  >
                    <span>{t('postSites.postsite', 'Puesto de seguridad')}</span>
                    <span className="text-xs text-muted-foreground">{sortKey === "name" ? (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : sortDir === "desc" ? <ChevronDown className="h-3.5 w-3.5" /> : null) : null}</span>
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (sortKey !== "client") {
                        setSortKey("client");
                        setSortDir("asc");
                      } else if (sortDir === "asc") {
                        setSortDir("desc");
                      } else {
                        setSortKey(null);
                        setSortDir(null);
                      }
                      setPage(1);
                    }}
                  >
                    <span>{t('postSites.client', 'Cliente')}</span>
                    <span className="text-xs text-muted-foreground">{sortKey === "client" ? (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : sortDir === "desc" ? <ChevronDown className="h-3.5 w-3.5" /> : null) : null}</span>
                  </button>
                </th>
                {/* Guards and Schedule columns hidden as requested */}
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">{t('postSites.filters.status', 'Estado')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('postSites.actions', 'Acciones')}</th>
              </tr>
            </thead>

            <tbody>
              {/* sin filas por defecto */}
              {(postSites?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="p-6">
                    <EmptyState
                      icon={<Building2 />}
                      title={t('postSites.notsearch') as string}
                      description={t('postSites.emptyHint', 'Crea tu primer puesto de vigilancia para comenzar.') as string}
                      action={
                        hasPermission('postSiteCreate') ? (
                          <Button asChild variant="brand">
                            <Link to="/post-sites/new">{t('postSites.newPostSite', 'Nuevo Puesto de seguridad')}</Link>
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              )}
              {(postSites ?? []).map((site) => (
                <React.Fragment key={site.id}>
                <tr className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => { navigate(`/post-sites/${site.id}`); }}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-0.5 rounded hover:bg-muted"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(site.id); }}
                      >
                        {expandedIds.has(site.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <Checkbox
                        checked={selectedIds.includes(site.id)}
                        onCheckedChange={(checked) => handleSelectOne(site.id, checked as boolean)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{site.name}</td>
                  <td className="px-4 py-3">{site.client ? formatClientName(site.client) : "-"}</td>
                  <td className="px-4 py-3">
                    <ServiceTypeBadge value={(site as any).serviceType} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={site.status === "active" ? "green" : "slate"}>
                      {site.status === "active" ? t('postSites.filters.active', 'Activo') : t('postSites.filters.archived', 'Archivado')}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu actions={rowActions(site)} />
                  </td>
                </tr>
                {expandedIds.has(site.id) && (
                  <>
                    {loadingStations.has(site.id) && (
                      <tr className="bg-muted/10">
                        <td colSpan={6} className="px-4 py-2 pl-14">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Cargando estaciones...
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loadingStations.has(site.id) && (stationsMap[site.id] || []).length === 0 && (
                      <tr className="bg-muted/10">
                        <td colSpan={6} className="px-4 py-2 pl-14 text-xs text-muted-foreground italic">
                          Sin estaciones registradas
                        </td>
                      </tr>
                    )}
                    {(stationsMap[site.id] || []).map((station: any) => {
                      // Parse stationSchedule JSON into readable shifts
                      let shifts: { nombre: string; startTime: string; endTime: string; guardsCount: string }[] = [];
                      try {
                        const raw = station.stationSchedule;
                        if (raw && typeof raw === 'string') shifts = JSON.parse(raw);
                        else if (Array.isArray(raw)) shifts = raw;
                      } catch { /* ignore */ }
                      // Prefer backend `guardsCount` (assigned ∪ scheduled-via-shifts); the
                      // assignedGuards junction alone is usually empty even when guards work here.
                      const assignedCount = typeof station.guardsCount === 'number'
                        ? station.guardsCount
                        : (Array.isArray(station.assignedGuards) ? station.assignedGuards.length : 0);

                      return (
                      <tr
                        key={station.id}
                        className="bg-muted/5 hover:bg-muted/15 cursor-pointer border-b border-border/30 transition-colors"
                        onClick={() => navigate(`/post-sites/${site.id}/stations/${station.id}`)}
                      >
                        <td className="px-4 py-2.5"></td>
                        <td className="px-4 py-2.5 pl-12">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
                            <span className="text-sm font-medium text-foreground/80">
                              {station.name || station.stationName || 'Estación'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-muted-foreground">
                            {assignedCount > 0 ? `${assignedCount} vigilante${assignedCount > 1 ? 's' : ''}` : 'Sin vigilantes'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {shifts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {shifts.map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-primary/10 text-primary">
                                  {s.nombre} {s.startTime}–{s.endTime}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                      );
                    })}
                  </>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Footer de tabla - Única sección de paginación */}
          <div className="flex items-center justify-between px-4 py-3 text-sm text-foreground/70 bg-muted/30 border-t">
            <div className="flex items-center gap-2">
              <span>{t('clients.pagination.itemsPerPage')}</span>
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
              {page} – {Math.max(1, Math.ceil(totalCount / limit))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('clients.pagination.prev', 'Anterior')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= totalCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('clients.pagination.next', 'Siguiente')}
              </Button>
            </div>
          </div>
        </Section>

        {/* Mobile cards */}
        <div className="md:hidden">
          <MobileCardList
            items={postSites}
            loading={loading}
            emptyMessage={t('postSites.notsearch') as string}
            renderCard={(site: any) => (
              <div className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm">{site.name}</div>
                    <div className="text-xs text-muted-foreground">{site.client ? formatClientName(site.client) : "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs">
                      <StatusBadge tone={site.status === "active" ? "green" : "slate"}>
                        {site.status === "active" ? t('postSites.filters.active', 'Activo') : t('postSites.filters.archived', 'Archivado')}
                      </StatusBadge>
                    </div>
                    <div className="mt-2">
                      <RowActionsMenu actions={rowActions(site)} />
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  <div>{site.email || '-'}</div>
                  <div>{site.phone || '-'}</div>
                  {/* Guards and Schedule hidden in mobile view */}
                </div>
              </div>
            )}
          />
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

        {/* Post site details now opened via dedicated page /post-sites/:id */}

        {/* Confirm delete dialog (single or bulk) */}
        <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('postSites.postsitesttiledelete', 'Eliminar sitio')}{deleteTargetIds.length > 1 ? 's' : ''}
              </AlertDialogTitle>
            </AlertDialogHeader>

            <AlertDialogDescription>
              {t('postSites.postesitedeleteconfirm', { count: deleteTargetIds.length })}
            </AlertDialogDescription>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteTargetIds([])}>{t('actions.cancel', 'Cancelar')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  try {
                    setDeleting(true);
                    await stationService.delete(deleteTargetIds);
                    toast.success(deleteTargetIds.length > 1 ? t('postSites.postsitedeletedPlural', 'Post Sites Deleted') : t('postSites.postsitedeleted', 'Post Site Deleted'));
                    setSelectedIds([]);
                    setDeleteTargetIds([]);
                    setOpenDeleteDialog(false);
                    await loadPostSites();
                  } catch (e) {
                    console.error(e);
                    toast.error(t('postSites.postsitedeleteerror', 'Error deleting post site'));
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? t('actions.deleting', 'Eliminando...') : t('actions.delete', 'Eliminar')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PostSiteImportDialog
          open={openImportDialog}
          onOpenChange={(v) => setOpenImportDialog(v)}
          onSuccess={() => loadPostSites()}
        />

        </PageContainer>
      </section>
    </AppLayout>
  );
}
