import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
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
  Smartphone,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { clientService } from "@/lib/api/clientService";
type Client = any;

type ClientFilters = {
  active?: boolean;
  email?: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  category?: string;
  name?: string;
  lastName?: string;
};

import { categoryService, type Category } from "@/lib/api/categoryService";
import CategoryManagerDialog from "@/components/categories/CategoryManagerDialog";
import { BulkActionsSelect, type BulkAction } from "@/components/table/BulkActionsSelect";
import { DataTable, type Column } from "@/components/table/DataTable";
import type { RowAction } from "@/components/table/RowActionsMenu";
import { RowActionsMenu } from "@/components/table/RowActionsMenu";
import MobileCardList from '@/components/responsive/MobileCardList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CategorySelect } from "@/components/categories/CategorySelect";
import { ImportDialog } from "@/components/clients/ImportDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useClientSelection } from '@/contexts/ClientSelectionContext';

// Local replacement for missing hook: useDebouncedValue
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handler = window.setTimeout(() => setDebounced(value), delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debounced;
}

const getServerErrorMessage = (error: any, defaultMessage = "Error") => {
  try {
    return (
      error?.response?.data?.message ??
      error?.message ??
      defaultMessage
    );
  } catch {
    return defaultMessage;
  }
};

export default function ClientesPage() {
  const { t } = useTranslation();
  usePageTitle('Clientes');
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [openFilter, setOpenFilter] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openCategoryManager, setOpenCategoryManager] = useState(false);
  // Details now open in separate page; modal state removed

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ClientFilters>({ active: true });
  const [bulkKey, setBulkKey] = useState(0);
  // Sorting state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [openMoveDialog, setOpenMoveDialog] = useState(false);
  const [moveCategories, setMoveCategories] = useState<string[]>([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const [openCategorizeDialog, setOpenCategorizeDialog] = useState(false);
  const [categorizeClientId, setCategorizeClientId] = useState<string | null>(null);
  const [categorizeClientName, setCategorizeClientName] = useState<string>("");
  const [categorizeCategories, setCategorizeCategories] = useState<string[]>([]);
  const [categorizeLoading, setCategorizeLoading] = useState(false);
  const [categorizeSaving, setCategorizeSaving] = useState(false);
  const [openArchiveBulkDialog, setOpenArchiveBulkDialog] = useState(false);
  const [openArchiveSingleDialog, setOpenArchiveSingleDialog] = useState(false);
  const [archiveSingleClient, setArchiveSingleClient] = useState<Client | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [restoreClient, setRestoreClient] = useState<Client | null>(null);
  const [openRestoreBulkDialog, setOpenRestoreBulkDialog] = useState(false);
  const [openDeleteBulkDialog, setOpenDeleteBulkDialog] = useState(false);
  const [openSendAccessDialog, setOpenSendAccessDialog] = useState(false);
  const [sendAccessClient, setSendAccessClient] = useState<Client | null>(null);
  const [sendingAccess, setSendingAccess] = useState(false);
  const { setSelectedClient } = useClientSelection();

  const debouncedSearch = useDebouncedValue(searchQuery, 500);

  // Ensure we only notify tenant-missing once per page lifecycle
  const tenantMissingNotifiedRef = useRef(false);

  const loadClients = async () => {
    setLoading(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) {
        if (!tenantMissingNotifiedRef.current) {
          toast.error("El usuario debe estar vinculado a una empresa para continuar");
          tenantMissingNotifiedRef.current = true;
        }
        setClients([]);
        setTotalCount(0);
        return;
      }
      const pagination: any = { limit, offset: (page - 1) * limit };
      if (sortKey && sortDir) pagination.orderBy = `${sortKey}:${sortDir}`;

      const data = await clientService.getClients(
        {
          ...filters,
          name: debouncedSearch || undefined,
          lastName: debouncedSearch || undefined
        },
        pagination
      );
      setClients(data.rows);
      setTotalCount(data.count);
    } catch (error: any) {
      console.error(error);
      toast.error(getServerErrorMessage(error, t('clients.errorLoadingClients')));
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) {
        if (!tenantMissingNotifiedRef.current) {
          toast.error("El usuario debe estar vinculado a una empresa para continuar");
          tenantMissingNotifiedRef.current = true;
        }
        setCategories([]);
        return;
      }
      const data = await categoryService.list({ filter: { module: "clientAccount" }, limit: 1000 });
      setCategories(data.rows || []);
    } catch (error) {
      console.error("Error al cargar Sectores:", error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (openCategorizeDialog) {
      loadCategories();
    }
  }, [openCategorizeDialog]);

  useEffect(() => {
    if (openMoveDialog) {
      loadCategories();
    }
  }, [openMoveDialog]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  // When changing between responsive layouts (mobile <-> desktop)
  // ensure the page scrolls to the top so the user always sees
  // the beginning of the new layout. This listens to the MD
  // breakpoint used in the UI (`md:` = 768px).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const scrollTopMain = () => {
      try {
        // AppLayout renders the scrollable area inside a <main> element
        const main = document.querySelector('main');
        if (main && typeof (main as HTMLElement).scrollTo === 'function') {
          (main as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch (e) {
        // ignore and fallthrough to window
      }
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
    };

    const onChange = () => scrollTopMain();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange as any);
      else mq.removeListener(onChange as any);
    };
  }, []);

  // Reset bulk action selector when filter (active state) changes to reflect new options
  useEffect(() => {
    setBulkKey((k) => k + 1);
  }, [filters.active]);

  useEffect(() => {
    loadClients();
  }, [page, limit, debouncedSearch, filters, sortKey, sortDir]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(clients.map((c) => c.id));
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

  const openCategorizeForClient = async (client: Client) => {
    setCategorizeClientId(client.id);
    setCategorizeClientName(`${client.name}${client.lastName ? ` ${client.lastName}` : ""}`);
    setCategorizeLoading(true);
    setCategorizeCategories([]);
    setOpenCategorizeDialog(true);
    try {
      const data = await clientService.getClient(client.id);
      setCategorizeCategories((data as any).categoryIds ?? []);
    } catch (error: any) {
      // error handled by backend
      setOpenCategorizeDialog(false);
    } finally {
      setCategorizeLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === "gestionar-Sectores") {
      // Permitir reabrir/retocar el diálogo aunque ya esté abierto
      setOpenCategoryManager((prev) => {
        if (prev) {
          // toggle para forzar re-render del diálogo
          setTimeout(() => setOpenCategoryManager(true), 0);
          return false;
        }
        return true;
      });
      // Resetear el selector para poder re-seleccionar la misma opción
      setBulkKey((k) => k + 1);
      return;
    }

    if (action === "mover") {
      if (selectedIds.length === 0) {
        // user-visible warnings/errors are handled by backend
        setBulkKey((k) => k + 1);
        return;
      }
      setMoveCategories([]);
      setOpenMoveDialog(true);
      setBulkKey((k) => k + 1);
      return;
    }

    if (selectedIds.length === 0) {
      // backend will notify user
      setBulkKey((k) => k + 1);
      return;
    }

    if (action === "archivar") {
      const invalid = selectedIds.filter((id) => {
        const c = clients.find((x) => x.id === id);
        return !c || c.active === false;
      });
      if (invalid.length > 0) {
        // backend will notify user
        setSelectedIds([]);
        setBulkKey((k) => k + 1);
        return;
      }
      setOpenArchiveBulkDialog(true);
      setBulkKey((k) => k + 1);
      return;
    }

    if (action === "restaurar") {
      const invalid = selectedIds.filter((id) => {
        const c = clients.find((x) => x.id === id);
        return !c || c.active === true;
      });
      if (invalid.length > 0) {
        // backend will notify user
        setSelectedIds([]);
        setBulkKey((k) => k + 1);
        return;
      }
      setOpenRestoreBulkDialog(true);
      setBulkKey((k) => k + 1);
      return;
    }

    if (action === "eliminar") {
      const invalid = selectedIds.filter((id) => {
        const c = clients.find((x) => x.id === id);
        return !c || c.active === true;
      });
      if (invalid.length > 0) {
        // backend will notify user
        setSelectedIds([]);
        setBulkKey((k) => k + 1);
        return;
      }
      setOpenDeleteBulkDialog(true);
      setBulkKey((k) => k + 1);
      return;
    }

    toast.info(t('clients.actionNotImplemented', { action }));
    // Resetear el selector tras cualquier acción
    setBulkKey((k) => k + 1);
  };

  const handleExportPDF = async () => {
    try {

      toast.loading(t('clients.generatingPDF'));
      const blob = await clientService.exportPDF({
        ...filters,
        name: debouncedSearch || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientes-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(t('clients.pdfDownloaded'));
    } catch (error: any) {
      toast.dismiss();
      // backend handles error notification
    }
  };

  const handleExportExcel = async () => {
    try {

      toast.loading(t('clients.generatingExcel'));
      const blob = await clientService.exportExcel({
        ...filters,
        name: debouncedSearch || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientes-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(t('clients.excelDownloaded'));
    } catch (error: any) {
      toast.dismiss();
      // backend handles error notification
    }
  };

  const handleCategorizeSubmit = async () => {
    if (!categorizeClientId) return;
    setCategorizeSaving(true);
    console.log('🔵 Categorizando cliente:', {
      clientId: categorizeClientId,
      categoryIds: categorizeCategories,
    });
    try {
      await clientService.updateClient(categorizeClientId, {
        categoryIds: categorizeCategories,
      } as any);
      toast.success(t('clients.categoriesUpdated'));
      setOpenCategorizeDialog(false);
      loadClients();
      loadCategories();
    } catch (error: any) {
      // backend handles error notification
    } finally {
      setCategorizeSaving(false);
    }
  };

  const handleMoveSubmit = async () => {
    if (moveCategories.length === 0) {
      toast.warning(t('clients.selectAtLeastOneCategory'));
      return;
    }
    setMoveLoading(true);
    console.log('🟢 Moviendo clientes a Sectores:', {
      selectedIds,
      categoryIds: moveCategories,
    });
    try {
      await Promise.all(
        selectedIds.map((id) =>
          clientService.updateClient(id, {
            categoryIds: moveCategories,
          } as any)
        )
      );
      toast.success(t('clients.categoriesUpdated'));
      setOpenMoveDialog(false);
      setSelectedIds([]);
      loadClients();
      loadCategories();
    } catch (error: any) {
      // backend handles error notification
    } finally {
      setMoveLoading(false);
    }
  };

  const bulkActions: BulkAction[] = useMemo(() => {
    const actions: BulkAction[] = [];
    // mover (cambiar categoría) requires edit
    if (hasPermission('clientAccountEdit')) actions.push({ value: "mover", label: t('actions.move') });
    if (filters.active === true) {
      if (hasPermission('clientAccountEdit')) actions.push({ value: "archivar", label: t('actions.archive') });
    } else if (filters.active === false) {
      if (hasPermission('clientAccountEdit')) actions.push({ value: "restaurar", label: t('actions.restore') });
      if (hasPermission('clientAccountDestroy')) actions.push({ value: "eliminar", label: t('actions.delete') });
    } else {
      if (hasPermission('clientAccountEdit')) actions.push({ value: "archivar", label: t('actions.archive') });
      if (hasPermission('clientAccountEdit')) actions.push({ value: "restaurar", label: t('actions.restore') });
      if (hasPermission('clientAccountDestroy')) actions.push({ value: "eliminar", label: t('actions.delete') });
    }
    if (hasPermission('clientAccountEdit')) actions.push({ value: "gestionar-Sectores", label: t('actions.manageCategories') });
    return actions;
  }, [filters.active]);

  const columns: Column<Client>[] = useMemo(
    () => [
      {
        key: "name",
        header: t('clients.columns.name'),
        className: "font-medium",
        render: (value, row) => {
          if ((row as any).commercialName) return (row as any).commercialName;
          const lastName = row.lastName && row.lastName !== 'undefined' ? row.lastName : '';
          return lastName ? `${row.name} ${lastName}` : row.name;
        }

      },
      // Hide less-important columns on smaller breakpoints to favor compact layouts
      { key: "address", header: t('clients.columns.address'), className: "hidden lg:table-cell" },
      { key: "email", header: t('clients.columns.email'), className: "hidden lg:table-cell" },
      { key: "phoneNumber", header: t('clients.columns.phone'), className: "hidden lg:table-cell" },
      {
        key: "more",
        header: t('clients.columns.more', 'Más'),
        className: "hidden",
        render: (_v: any, row: Client) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('clients.columns.more', 'Más')}>
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 text-sm">
                  <div className="font-medium truncate">{(row as any).commercialName || (row.lastName ? `${row.name} ${row.lastName}` : row.name)}</div>
                  <div className="text-xs text-muted-foreground truncate">{row.email || '-'}</div>
                  <div className="text-xs text-muted-foreground truncate">{row.phoneNumber || '-'}</div>
                  <div className="mt-2">
                    <Link to={`/clients/${row.id}/overview`} className="text-sm text-[#C8860A]">{t('actions.viewDetails', 'Ver')}</Link>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
      {
        key: "active",
        header: t('clients.columns.status'),
        render: (_value: any, row: Client) => {
          // El backend puede enviar booleano o entero (0/1)
          const isActive = row.active === true;
          return (
            <span className={`px-2 py-1 text-xs rounded-full ${isActive ? "bg-green-100 text-green-800" : "bg-red-500/15 text-red-700"
              }`}>
              {isActive ? t('clients.status.active') : t('clients.status.archived')}
            </span>
          );
        },
      },
      {
        key: "onboardingStatus",
        header: t('clients.columns.appAccess', 'App'),
        render: (_value: any, row: Client) => {
          const status = (row as any).onboardingStatus || 'not_invited';
          const map: Record<string, { label: string; cls: string }> = {
            not_invited: { label: t('clients.onboarding.not_invited', 'Sin acceso'), cls: 'bg-muted text-muted-foreground' },
            invited:     { label: t('clients.onboarding.invited',     'Invitado'),   cls: 'bg-amber-500/15 text-amber-700' },
            active:      { label: t('clients.onboarding.active',      'En app'),     cls: 'bg-green-100 text-green-800' },
            suspended:   { label: t('clients.onboarding.suspended',   'Suspendido'), cls: 'bg-red-500/15 text-red-700' },
          };
          const badge = map[status] || map.not_invited;
          return (
            <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${badge.cls}`}>
              {badge.label}
            </span>
          );
        },
      },
    ],
    [t]
  );

  const rowActions = (client: Client): RowAction[] => {
    const isActive = client.active === true;
    const actions: RowAction[] = [];

    if (hasPermission('clientAccountRead')) {
      actions.push({
        label: t('actions.viewDetails'),
        icon: <Eye className="h-4 w-4" />,
        onClick: () => {
          // Navigate to client details page instead of opening modal
          navigate(`/clients/${client.id}/overview`);
        },
      });
    }

    if (isActive) {
      if (hasPermission('clientAccountEdit')) {
        actions.push({
          label: t('actions.categorize'),
          icon: <Tag className="h-4 w-4" />,
          onClick: () => openCategorizeForClient(client),
        });

        actions.push({
          label: t('actions.archive'),
          icon: <Archive className="h-4 w-4" />,
          onClick: async () => {
            try {
              await clientService.updateClient(client.id, { active: false } as any);
              toast.success(t('clients.clientArchived'));
              loadClients();
            } catch (error: any) {
              toast.error(getServerErrorMessage(error, t('clients.errorArchiveClient')));
            }
          },
        });
      }

      if (hasPermission('clientAccountDestroy')) {
        actions.push({
          label: t('actions.delete', 'Eliminar'),
          icon: <Trash className="h-4 w-4 text-red-500" />,
          onClick: () => {
            setDeleteClient(client);
            setOpenDeleteDialog(true);
          },
        });
      }
    } else {
      if (hasPermission('clientAccountDestroy')) {
        actions.push({
          label: t('actions.delete', 'Eliminar'),
          icon: <Trash className="h-4 w-4 text-red-500" />,
          onClick: () => {
            setDeleteClient(client);
            setOpenDeleteDialog(true);
          },
        });
      }

      if (hasPermission('clientAccountEdit')) {
        actions.push({
          label: t('actions.restore'),
          icon: <RotateCcw className="h-4 w-4" />,
          onClick: () => {
            setRestoreClient(client);
            setOpenRestoreDialog(true);
          },
        });
      }
    }

    if (hasPermission('clientAccountEdit')) {
      actions.push({
        label: (client as any).onboardingStatus === 'invited' || (client as any).onboardingStatus === 'active'
          ? t('clients.resendAppAccess', 'Reenviar invitación')
          : t('clients.sendAppAccess', 'Enviar acceso a la app'),
        icon: <Smartphone className="h-4 w-4" />,
        onClick: () => {
          setSendAccessClient(client);
          setOpenSendAccessDialog(true);
        },
      });
    }

    return actions;
  };

  const from = clients.length > 0 ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, totalCount);

  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      try {
        setIsSmallScreen(window.innerWidth < 640);
      } catch {
        setIsSmallScreen(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sheetSide = isSmallScreen ? ('bottom' as const) : ('right' as const);
  const sheetClass = isSmallScreen
    ? 'w-full h-[85vh] overflow-y-auto rounded-t-lg px-4 py-3'
    : 'w-full sm:w-[400px] md:w-[460px] h-[calc(100vh-6rem)] sm:h-auto overflow-y-auto';

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: t('clients.breadcrumb.dashboard'), path: "/dashboard" },
          { label: t('clients.breadcrumb.clients') },
        ]}
      />

      <section className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_320px] items-center gap-3">
            <div className="flex items-center gap-2">
              <BulkActionsSelect key={bulkKey} actions={bulkActions} onChange={handleBulkAction} />
            </div>

            <div className="flex justify-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('clients.searchPlaceholder')}
                  className="pl-9 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-2 justify-end w-full md:w-auto">
              <div className="flex w-full md:w-auto gap-2">
                <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-[#C8860A] border-[#C8860A]/30 flex-1 md:flex-none justify-center"
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      {t('clients.filters.title')}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side={sheetSide} className={sheetClass}>
                    <SheetHeader>
                      <SheetTitle>{t('clients.filters.title')}</SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <Label>{t('clients.filters.email')}</Label>
                        <Input placeholder={t('clients.placeholders.emailExample')} value={filters.email || ""} onChange={(e) => setFilters({ ...filters, email: e.target.value || undefined })} />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('clients.filters.phone')}</Label>
                        <Input placeholder={t('clients.placeholders.phoneExample')} value={filters.phoneNumber || ""} onChange={(e) => setFilters({ ...filters, phoneNumber: e.target.value || undefined })} />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('clients.filters.city')}</Label>
                        <Input placeholder={t('clients.placeholders.cityExample')} value={filters.city || ""} onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })} />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('clients.filters.country')}</Label>
                        <Input placeholder={t('clients.placeholders.countryExample')} value={filters.country || ""} onChange={(e) => setFilters({ ...filters, country: e.target.value || undefined })} />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('clients.filters.categories')}</Label>
                        <Select value={filters.category || "all"} onValueChange={(v: string) => setFilters({ ...filters, category: v === "all" ? undefined : v })}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('clients.filters.all')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('clients.filters.all')}</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('clients.filters.status')}</Label>
                        <Select value={filters.active === undefined ? "all" : filters.active ? "active" : "inactive"} onValueChange={(v: string) => { if (v === "all") setFilters({ ...filters, active: undefined }); else if (v === "active") setFilters({ ...filters, active: true }); else setFilters({ ...filters, active: false }); }}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('clients.filters.all')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('clients.filters.all')}</SelectItem>
                            <SelectItem value="active">{t('clients.filters.active')}</SelectItem>
                            <SelectItem value="inactive">{t('clients.filters.archived')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button className="w-full bg-[#C8860A] hover:bg-[#B37809] text-white" onClick={() => setOpenFilter(false)}>{t('clients.applyFilters')}</Button>
                      <Button variant="outline" className="w-full" onClick={() => { setFilters({ active: true }); setOpenFilter(false); }}>{t('clients.clearFilters')}</Button>
                    </div>
                  </SheetContent>
                </Sheet>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border w-12 md:w-auto flex items-center justify-center">
                      <EllipsisVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleExportPDF}><FileDown className="mr-2 h-4 w-4" /> {t('clients.exportPDF', 'Exportar PDF')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> {t('clients.exportExcel', 'Exportar Excel')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenImport(true)}><ArrowDownUp className="mr-2 h-4 w-4" /> {t('clients.import', 'Importar')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {hasPermission('clientAccountCreate') && (
                <div className="w-full md:w-auto">
                  <Button
                    className="bg-[#C8860A] hover:bg-[#B37809] text-white w-full md:w-auto"
                    asChild
                  >
                    <Link to="/clients/add-new">{t('clients.newClient')}</Link>
                  </Button>
                </div>
              )}
            </div>
        </div>

        <div className="mt-4 md:block hidden">
          <DataTable<Client>
            columns={columns}
            data={clients}
            loading={loading}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            rowActions={rowActions}
            onRowClick={(r) => navigate(`/clients/${r.id}/overview`)}
            sortKey={sortKey ?? undefined}
            sortDir={sortDir ?? undefined}
            onSortChange={(key, dir) => {
              setSortKey(dir ? key : null);
              setSortDir(dir);
              setPage(1);
            }}
            emptyState={
              <div className="flex flex-col items-center justify-center text-center">
                <img
                  src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                  alt={t('clients.empty.alt')}
                  className="h-36 mb-4"
                />
                <h3 className="text-lg font-semibold">
                  {t('clients.empty.title')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  {t('clients.empty.description')}
                </p>
              </div>
            }
          />

          <div className="flex items-center justify-between px-4 py-3 text-sm text-foreground/70 bg-muted/30 border-x border-b rounded-b-lg">
            <div className="flex items-center gap-2">
              <span>{t('clients.pagination.itemsPerPage')}</span>
                <Select
                value={limit.toString()}
                onValueChange={(v: string) => {
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
                {t('clients.pagination.prev')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= totalCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('clients.pagination.next')}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="mt-4 md:hidden">
          <MobileCardList
            items={clients}
            loading={loading}
            emptyMessage={t('clients.empty.title') as string}
            renderCard={(client: any) => (
              <div className="p-4 bg-card border rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{client.name}{client.lastName ? ` ${client.lastName}` : ''}</div>
                    <div className="text-xs text-muted-foreground truncate">{client.email || '-'}</div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end ml-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${client.active ? 'bg-green-100 text-green-800' : 'bg-red-500/15 text-red-700'}`}>
                      {client.active ? t('clients.status.active') : t('clients.status.archived')}
                    </span>
                    {(() => {
                      const s = (client as any).onboardingStatus || 'not_invited';
                      const mobileMap: Record<string, { label: string; cls: string }> = {
                        not_invited: { label: t('clients.onboarding.not_invited', 'Sin acceso'), cls: 'bg-muted text-muted-foreground' },
                        invited:     { label: t('clients.onboarding.invited', 'Invitado'),      cls: 'bg-amber-500/15 text-amber-700' },
                        active:      { label: t('clients.onboarding.active', 'En app'),         cls: 'bg-green-100 text-green-800' },
                        suspended:   { label: t('clients.onboarding.suspended', 'Suspendido'),  cls: 'bg-red-500/15 text-red-700' },
                      };
                      const b = mobileMap[s] || mobileMap.not_invited;
                      return (
                        <span className={`mt-1 px-2 py-0.5 text-xs rounded-full ${b.cls}`}>{b.label}</span>
                      );
                    })()}
                    <div className="mt-2">
                      <RowActionsMenu actions={rowActions(client)} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <div className="truncate">{client.phoneNumber || '-'}</div>
                  <div className="truncate">{client.address || '-'}</div>
                </div>
              </div>
            )}
          />
        </div>
      </section>

      <ImportDialog open={openImport} onOpenChange={setOpenImport} onSuccess={loadClients} />
      <Dialog open={openMoveDialog} onOpenChange={setOpenMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clients.dialogs.changeCategories.title')}</DialogTitle>
            <DialogDescription>
              {t('clients.dialogs.changeCategories.desc', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{t('clients.dialogs.changeCategories.newCategories')}</Label>
            <CategorySelect
              module="clientAccount"
              multiple
              value={moveCategories}
              onChange={(val) => setMoveCategories(Array.isArray(val) ? val : [])}
              placeholder={categories.length === 0 ? t('categories.loading') : t('clients.selectCategories')}
              options={categories.map((c) => ({ id: c.id, name: c.name }))}
              onCategoryCreated={loadCategories}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMoveDialog(false)} disabled={moveLoading}>
              {t('clients.cancel')}
            </Button>
            <Button onClick={handleMoveSubmit} disabled={moveLoading}>
              {moveLoading ? t('clients.saving') : t('clients.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={openCategorizeDialog} onOpenChange={setOpenCategorizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clients.dialogs.categorize.title')}</DialogTitle>
            <DialogDescription>
              {categorizeClientName || t('clients.client')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{t('clients.filters.categories')}</Label>
            <CategorySelect
              module="clientAccount"
              multiple
              value={categorizeCategories}
              onChange={(val) => setCategorizeCategories(Array.isArray(val) ? val : [])}
              placeholder={categorizeLoading || categories.length === 0 ? t('clients.loading') : t('clients.selectCategories')}
              options={categories.map((c) => ({ id: c.id, name: c.name }))}
              onCategoryCreated={loadCategories}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline" onClick={() => setOpenCategorizeDialog(false)} disabled={categorizeSaving}
              >
              {t('clients.cancel')}
            </Button>
            <Button
              className="bg-[#C8860A]-500 hover:bg-[#C8860A]-600"
              onClick={handleCategorizeSubmit} disabled={categorizeSaving || categorizeLoading}
              >
              {categorizeSaving ? t('clients.saving') : t('clients.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CategoryManagerDialog open={openCategoryManager} onOpenChange={setOpenCategoryManager} module="clientAccount" onChanged={loadCategories} />
      {/* ClientDetailsDialog removed: navigation uses ClientsDetails page instead of modal */}

      <AlertDialog open={openArchiveBulkDialog} onOpenChange={setOpenArchiveBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.archiveClients.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.archiveClients.desc', { count: selectedIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await Promise.all(
                    selectedIds.map((id) =>
                      clientService.updateClient(id, { active: false } as any)
                    )
                  );
                  toast.success(t('clients.clientsArchived'));
                  setSelectedIds([]);
                  loadClients();
                  setOpenArchiveBulkDialog(false);
                } catch (error: any) {
                  // backend handles errors
                }
              }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openRestoreBulkDialog} onOpenChange={setOpenRestoreBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.restoreClients.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.restoreClients.desc', { count: selectedIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#C8860A] hover:bg-[#B37809] text-white"
              onClick={async () => {
                try {
                  await Promise.all(
                    selectedIds.map((id) =>
                      clientService.updateClient(id, { active: true } as any)
                    )
                  );
                  toast.success(t('clients.clientsRestored'));
                  setSelectedIds([]);
                  loadClients();
                  setOpenRestoreBulkDialog(false);
                } catch (error: any) {
                  // backend handles errors
                }
              }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openDeleteBulkDialog} onOpenChange={setOpenDeleteBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.deleteClients.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.deleteClients.desc', { count: selectedIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={async () => {
                try {
                  await clientService.deleteClients(selectedIds);
                  toast.success(t('clients.clientsDeleted'));
                  setSelectedIds([]);
                  loadClients();
                  setOpenDeleteBulkDialog(false);
                } catch (error: any) {
                  toast.error(getServerErrorMessage(error, t('clients.deleteError')));
                }
              }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.deleteClient.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.deleteClient.desc', { name: deleteClient?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={async () => {
                if (!deleteClient) return;
                try {
                  await clientService.deleteClients([deleteClient.id]);
                  toast.success(t('clients.clientDeleted'));
                  loadClients();
                } catch (error: any) {
                  toast.error(getServerErrorMessage(error, t('clients.deleteError')));
                }
              }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openRestoreDialog} onOpenChange={setOpenRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.alerts.restoreClient.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.alerts.restoreClient.desc', { name: restoreClient?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clients.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#C8860A] hover:bg-[#B37809] text-white"
              onClick={async () => {
                if (!restoreClient) return;
                try {
                  await clientService.updateClient(restoreClient.id, { active: true } as any);
                  toast.success(t('clients.clientRestored'));
                  loadClients();
                } catch (error: any) {
                  // backend handles errors
                }
              }}
            >
              {t('clients.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send app access dialog */}
      <AlertDialog open={openSendAccessDialog} onOpenChange={(v) => { if (!sendingAccess) setOpenSendAccessDialog(v); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C8860A]/10">
                <Smartphone className="h-5 w-5 text-[#C8860A]" />
              </div>
              <AlertDialogTitle className="text-base">
                {(sendAccessClient as any)?.onboardingStatus === 'invited' || (sendAccessClient as any)?.onboardingStatus === 'active'
                  ? t('clients.resendAppAccess', 'Reenviar invitación')
                  : t('clients.sendAppAccess', 'Enviar acceso a la app')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-foreground/70">
                {sendAccessClient?.email ? (
                  <>
                    <p>
                      Se enviará un correo de invitación a{' '}
                      <span className="font-semibold text-foreground">{sendAccessClient?.email}</span>{' '}
                      para que <span className="font-semibold text-foreground">{sendAccessClient?.name}</span> pueda acceder a la app móvil.
                    </p>
                    <div className="rounded-lg bg-amber-500/10 border border-amber-200 p-3 text-amber-700 text-xs space-y-1">
                      <p className="font-medium">¿Cómo funciona?</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>El cliente recibe un correo con un enlace de acceso</li>
                        <li>Hace clic en el enlace y establece su contraseña</li>
                        <li>Inicia sesión en la app con su correo y contraseña</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg bg-red-500/10 border border-red-200 p-3 text-red-700 text-xs">
                    <p className="font-medium">Este cliente no tiene correo electrónico configurado.</p>
                    <p className="mt-1">Edita el cliente, agrega un correo electrónico y vuelve a intentarlo.</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingAccess}>{t('clients.cancel', 'Cancelar')}</AlertDialogCancel>
            {sendAccessClient?.email && (
              <AlertDialogAction
                className="bg-[#C8860A] hover:bg-[#B37809] text-white"
                disabled={sendingAccess}
                onClick={async (e) => {
                  e.preventDefault();
                  if (!sendAccessClient?.id) return;
                  setSendingAccess(true);
                  try {
                    await clientService.sendClientPortalInvitation(
                      sendAccessClient.id,
                      sendAccessClient.email || undefined,
                    );
                    toast.success(`Invitación enviada a ${sendAccessClient.email || sendAccessClient.name}`);
                    // Update local state so the badge reflects the new status immediately
                    setClients(prev => prev.map(c =>
                      c.id === sendAccessClient.id ? { ...c, onboardingStatus: 'invited' } : c
                    ));
                    setOpenSendAccessDialog(false);
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || err?.message || 'No se pudo enviar la invitación');
                  } finally {
                    setSendingAccess(false);
                  }
                }}
              >
                {sendingAccess ? 'Enviando...' : 'Enviar invitación'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
