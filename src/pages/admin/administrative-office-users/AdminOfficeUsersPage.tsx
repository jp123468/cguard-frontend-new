import { useEffect, useMemo, useState } from "react";
import { ApiService } from "@/services/api/apiService";
import userService from "@/lib/api/userService";
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
  Send,
  Archive,
  Users,
  LayoutGrid,
  List as ListIcon,
  Pencil,
  RotateCw,
  Trash,
  UserCog,
} from "lucide-react";
import AdminUserCardsGrid, { type AdminUserCardAction } from "./AdminUserCardsGrid";
import { PageContainer, PageHeader, Section, StatusBadge, EmptyState } from "@/components/kit";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from "react-router-dom";
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionedButton } from '@/components/permissions/Permissioned';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import MobileCardList from '@/components/responsive/MobileCardList';

/* Debounce helper */
function useDebounced<T>(value: T, delay = 400) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return deb;
}

export default function AdminOfficeUsersPage() {
  const { t } = useTranslation();
  const [openFilter, setOpenFilter] = useState(false);
  // Vista Tarjetas ⇄ Lista (persistida). Tarjetas por defecto, como en Clientes/Vigilantes.
  const [viewMode, setViewMode] = useState<"cards" | "list">(
    () => (localStorage.getItem("adminUsers.viewMode") as "cards" | "list") || "cards",
  );
  useEffect(() => { localStorage.setItem("adminUsers.viewMode", viewMode); }, [viewMode]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [clientOptions, setClientOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [selectKey, setSelectKey] = useState(0);

  const debouncedQuery = useDebounced(query, 450);

  // filas desde API
  const [rows, setRows] = useState<any[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const { hasPermission, hasAny } = usePermissions();
  const canManageUsers = hasAny(['userEdit', 'userDestroy', 'userImport', 'userCreate', 'userExport']);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedUserToAct, setSelectedUserToAct] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const formatUserDisplay = (u: any) => {
    if (!u) return "";
    return (
      u.fullName ||
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.name ||
      u.email ||
      ""
    );
  };

  const normalizeRolesForUser = (roles: any): string[] => {
    if (!roles) return [];
    if (Array.isArray(roles)) return roles.map((x) => (typeof x === 'string' ? x : (x.name || x.role) || '')).filter(Boolean).map((s) => String(s).toLowerCase().trim());
    if (typeof roles === 'string') return [roles.toLowerCase().trim()];
    return [(roles.name || roles.role || '').toString().toLowerCase().trim()];
  };

  // UX-ONLY guard. This role-string check prevents the suspend/delete UI from
  // targeting admins, but it is NOT authorization: roles may arrive in an
  // unrecognized shape (normalizeRolesForUser handles only a few), so the real
  // protection MUST be enforced server-side (the backend must reject suspend/
  // delete of admin users regardless of this client check).
  const isUserAdmin = (u: any) => {
    if (!u) return false;
    const r = normalizeRolesForUser(u.roles || u.role || u.rolesList || u._rolesDisplay);
    return r.includes('admin') || r.includes('super admin') || r.includes('superadmin');
  };

  const loadUsers = async () => {
    try {
      const usersResp = await userService.listUsers();
      let users: any[] = usersResp || [];

      const normalizeRoles = (roles: any): string[] => {
        if (!roles) return [];
        if (Array.isArray(roles)) {
          return roles
            .map((r) => (typeof r === "string" ? r : r && (r.name || r.role) ? (r.name || r.role) : ""))
            .filter(Boolean)
            .map((s) => String(s).toLowerCase().trim());
        }
        if (typeof roles === "string") return [roles.toLowerCase().trim()];
        if (typeof roles === "object") {
          const candidate = roles.name || roles.role || roles.type || "";
          return candidate ? [String(candidate).toLowerCase().trim()] : [];
        }
        return [];
      };

      // Mostrar todos los usuarios (incluye vigilantes). Normalizar roles para mostrar.
      const filtered = (users || [])
        .map((u) => ({
          ...u,
          _rolesDisplay: (normalizeRoles(u.roles || u.role || u.rolesList) || []).join(", "),
        }))
        .filter((u) => {
          const roles = normalizeRoles(u.roles || u.role || u.rolesList || u._rolesDisplay);
          return !roles.includes('customer');
        });

      setRows(filtered);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    }
  };

  const loadClients = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      if (!tenantId) return;
      const resp = await ApiService.get(`/tenant/${tenantId}/client-account`);
      const rows = Array.isArray(resp) ? resp : (resp && resp.rows) ? resp.rows : [];
      const mapped = (rows || []).map((c: any) => {
        const first = c.name || c.firstName || c.label || c.companyName || c.clientName || c.clientAccountName || '';
        const last = c.lastName || c.last_name || c.surname || c.lastname || '';
        const display = [first, last].filter(Boolean).join(' ');
        return { id: c.id ?? c._id ?? String(c.id), name: display || first || last || '' };
      });
      setClientOptions(mapped);
    } catch (e) {
      console.error('Error cargando clientes para filtros', e);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const me = await userService.fetchCurrentUser();

      const extractRoles = (obj: any): string[] => {
        if (!obj) return [];
        // common shapes
        if (Array.isArray(obj)) return obj.map((x) => (typeof x === 'string' ? x : (x.name || x.role) || '')).filter(Boolean).map((s) => String(s).toLowerCase().trim());
        if (typeof obj === 'string') return [obj.toLowerCase().trim()];
        if (typeof obj === 'object') {
          // role may be a string or object
          if (obj.name || obj.role) return [String(obj.name || obj.role).toLowerCase().trim()];
        }
        return [];
      };

      // try multiple locations where backend may put tenant-role info
      let rolesCollected: string[] = [];
      rolesCollected = rolesCollected.concat(extractRoles(me?.roles || me?.role || me?.rolesList));
      // tenant-level roles: me.tenant.roles or me.tenantUser.roles
      rolesCollected = rolesCollected.concat(extractRoles(me?.tenant?.roles));
      rolesCollected = rolesCollected.concat(extractRoles(me?.tenantUser?.roles));
      // some backends return tenants array with tenantUser per tenant
      if (Array.isArray(me?.tenants)) {
        for (const t of me.tenants) {
          rolesCollected = rolesCollected.concat(extractRoles(t?.roles));
          rolesCollected = rolesCollected.concat(extractRoles(t?.tenantUser?.roles));
        }
      }

      // normalize set
      const rset = Array.from(new Set((rolesCollected || []).filter(Boolean).map((s) => String(s).toLowerCase().trim())));
      setIsAdminUser(rset.includes('admin') || rset.includes('super admin') || rset.includes('superadmin'));
    } catch (e) {
      console.warn('No se pudo obtener usuario actual', e);
      setIsAdminUser(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
    loadClients();
  }, []);

  const navigate = useNavigate();

  const exportUsersFile = async (format: "excel" | "pdf" | "csv") => {
    try {
      const blob = await userService.exportFile(format);
      const ext = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
      const filename = `usuarios_${new Date().toISOString().slice(0, 10)}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando usuarios:', err);
      toast.error(t('adminOfficeUsers.toasts.exportError', { defaultValue: 'No se pudo exportar usuarios' }));
    }
  };

  const handleSuspendUser = async (user: any) => {
    if (!user) return;
    if (isUserAdmin(user)) {
      toast.error(t('adminOfficeUsers.toasts.cannotSuspendAdmin', { defaultValue: 'No se puede suspender a un usuario administrador' }));
      return;
    }
    try {
      setActionLoading(true);
      await userService.suspendUser(user.id);
      setRows((prev) => prev.map((g) => (g.id === user.id ? { ...g, status: "Archivado", active: false, raw: { ...(g.raw || {}), status: "archived" } } : g)));
      toast.success(t('adminOfficeUsers.toasts.suspendedArchivedSuccess', { defaultValue: 'Usuario suspendido y archivado' }));
    } catch (err: any) {
      console.error(err);
      const serverMsg = err?.response?.data?.message || err?.message || (typeof err === 'string' ? err : null);
      toast.error(serverMsg || t('adminOfficeUsers.toasts.errorSuspendingUser', { defaultValue: 'Error suspendiendo usuario' }));
    } finally {
      setActionLoading(false);
      setSelectedUserToAct(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!userId) return;
    const row = rows.find((r) => String(r.id || r._id || r.raw?.id) === String(userId));
    if (isUserAdmin(row)) {
      toast.error(t('adminOfficeUsers.toasts.cannotDeleteAdmin', { defaultValue: 'No se puede eliminar a un usuario administrador' }));
      return;
    }
    try {
      setActionLoading(true);
      await userService.deleteUser(userId);
      setRows((prev) => prev.filter((g) => g.id !== userId));
      toast.success(t('adminOfficeUsers.toasts.deletedSuccess', { defaultValue: 'Usuario eliminado' }));
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t('adminOfficeUsers.toasts.deleteError', { defaultValue: 'Error eliminando usuario' }));
    } finally {
      setActionLoading(false);
      setSelectedUserToAct(null);
    }
  };


  const filteredRows = useMemo(() => {
    let out = rows || [];

    // Apply search query
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      out = out.filter((r) => {
        const name = (r.firstName || r.name || "").toString().toLowerCase();
        const email = (r.email || "").toString().toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    // Apply client filter: be permissive to many possible shapes returned by backend
    if (filterClient && filterClient !== 'all') {
      const clientIdStr = String(filterClient);
      const userHasClient = (u: any) => {
        // direct fields
        const candidates = [
          u.clientId,
          u.clientAccountId,
          u.clientIds,
          u.assignedClients,
          u.clients,
          u.client,
        ];

        for (const cand of candidates) {
          if (!cand) continue;
          if (Array.isArray(cand)) {
            if (cand.map(String).includes(clientIdStr)) return true;
          } else if (typeof cand === 'object') {
            // object or nested shape
            if ((cand.id && String(cand.id) === clientIdStr) || (cand._id && String(cand._id) === clientIdStr)) return true;
            // sometimes it's an array under object
            const vals = Object.values(cand).flat ? Object.values(cand).flat() : Object.values(cand);
            if (Array.isArray(vals) && vals.map(String).includes(clientIdStr)) return true;
          } else if (String(cand) === clientIdStr) {
            return true;
          }
        }

        // tenant-scoped assignments: check tenants array for assignedClients/postSiteIds
        if (Array.isArray(u.tenants)) {
          for (const t of u.tenants) {
            const asg = t.assignedClients || t.clientIds || t.clientIds || t.assignedClientIds || null;
            if (!asg) continue;
            if (Array.isArray(asg) && asg.map(String).includes(clientIdStr)) return true;
            if (String(asg) === clientIdStr) return true;
          }
        }

        return false;
      };

      out = out.filter((r) => userHasClient(r));
    }

    // Apply status filter
    if (filterStatus && filterStatus !== 'all') {
      out = out.filter((r) => {
        const status = (r.status || '').toString().toLowerCase();
        if (filterStatus === 'Activo') {
          // Exclude archived and invitation/pending statuses
          if (status === 'archived' || status === 'archivado') return false;
          if (status === 'invited' || status === 'pending') return false;
          if (r.active === false) return false;
          return true;
        }
        if (filterStatus === 'Inactivo') {
          return r.active === false;
        }
        if (filterStatus === 'Suspendido') {
          return status === 'archived' || status === 'archivado' || (r.active === false && (status === 'archived' || status === 'archivado'));
        }
        return true;
      });
    }

    return out;
  }, [rows, debouncedQuery, filterClient, filterStatus]);

  // Client-side pagination: slice the filtered list by the selected pageSize.
  // (Server-side paging in userService.listUsers would be the ideal next step.)
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  // Keep the current page within range when the result set or pageSize changes.
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const pageStartIndex = (currentPage - 1) * pageSize;
  const pagedRows = useMemo(
    () => filteredRows.slice(pageStartIndex, pageStartIndex + pageSize),
    [filteredRows, pageStartIndex, pageSize],
  );

  const rangeStart = filteredRows.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, filteredRows.length);

  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUsers((prev) => {
      if (checked) {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      } else {
        return prev.filter((id) => id !== userId);
      }
    });
  };

  const handleSelectAllUsers = (checked: boolean) => {
    if (!checked) {
      setSelectedUsers([]);
      return;
    }
    // do not include admin users when selecting all
    const idsOnPage = filteredRows
      .filter((r) => !isUserAdmin(r))
      .map((r) => r.id || r._id || r.raw?.id)
      .filter(Boolean)
      .map(String);
    const merged = Array.from(new Set([...selectedUsers, ...idsOnPage]));
    setSelectedUsers(merged);
  };

  const allOnPageSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedUsers.includes(String(r.id || r._id || r.raw?.id)));

  const handleBulkSuspend = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    try {
      setActionLoading(true);
      // filter out any admin ids so admins cannot be suspended in bulk
      const idsToSuspend = ids.filter((id) => {
        const r = rows.find((rr) => String(rr.id || rr._id || rr.raw?.id) === String(id));
        return !isUserAdmin(r);
      });
      if (idsToSuspend.length === 0) {
        toast.error(t('adminOfficeUsers.toasts.noValidUsersToSuspend', { defaultValue: 'Ningún usuario válido para suspender (los administradores no pueden suspenderse)' }));
        return;
      }
      if (idsToSuspend.length < ids.length) {
        toast.warning(t('adminOfficeUsers.toasts.skippedAdminsWarning', { defaultValue: 'Se omitieron administradores del proceso de suspensión' }));
      }
      await userService.suspendUsers(idsToSuspend);
      // update local rows to reflect archived status
      setRows((prev) => prev.map((r) => {
        const key = String(r.id || r._id || r.raw?.id);
        if (idsToSuspend.includes(key)) {
          return { ...r, status: 'Archivado', active: false, raw: { ...(r.raw || {}), status: 'archived' } };
        }
        return r;
      }));
      toast.success(t('adminOfficeUsers.toasts.suspendedCount', { defaultValue: 'Suspendidos {{count}} usuario(s)', count: idsToSuspend.length }));
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error al suspender en bloque:', err);
      toast.error(t('adminOfficeUsers.toasts.suspendAllError', { defaultValue: 'No se pudo suspender a todos los usuarios' }));
    } finally {
      setActionLoading(false);
      // force Select to remount so it resets its internal selection state
      setSelectKey((k) => k + 1);
    }
  };

  const handleBulkActivate = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    try {
      setActionLoading(true);
      await userService.restoreUsers(ids);
      setRows((prev) => prev.map((r) => {
        const key = String(r.id || r._id || r.raw?.id);
        if (ids.includes(key)) {
          return { ...r, status: 'Active', active: true, raw: { ...(r.raw || {}), status: 'active' } };
        }
        return r;
      }));
      toast.success(t('adminOfficeUsers.toasts.activatedCount', { defaultValue: 'Activados {{count}} usuario(s)', count: ids.length }));
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error al activar en bloque:', err);
      toast.error(t('adminOfficeUsers.toasts.activateAllError', { defaultValue: 'No se pudo activar a todos los usuarios' }));
    } finally {
      setActionLoading(false);
      setSelectKey((k) => k + 1);
    }
  };

  // Acciones del menú de cada tarjeta (mismos handlers/estados que la tabla).
  const userCardActions = (u: any): AdminUserCardAction[] => {
    const status = (u.status || "").toString().toLowerCase();
    const acts: AdminUserCardAction[] = [];
    if (status === "invited" || status === "pending") {
      acts.push({ label: 'Reenviar invitación', icon: <Send className="h-4 w-4" />, disabled: !hasPermission('userEdit'), onClick: () => { setSelectedUserToAct(u); setResendDialogOpen(true); } });
      acts.push({ label: 'Suspender', icon: <Archive className="h-4 w-4" />, disabled: !hasPermission('userEdit'), onClick: () => { setSelectedUserToAct(u); handleSuspendUser(u); } });
    } else if (status === "archived" || status === "archivado") {
      acts.push({ label: 'Restaurar', icon: <RotateCw className="h-4 w-4" />, disabled: !hasPermission('userEdit'), onClick: () => { setSelectedUserToAct(u); setRestoreDialogOpen(true); } });
      acts.push({ label: 'Eliminar', icon: <Trash className="h-4 w-4" />, destructive: true, disabled: !hasPermission('userDestroy'), onClick: () => { setSelectedUserToAct(u); setDeleteDialogOpen(true); } });
    } else {
      acts.push({ label: 'Editar', icon: <Pencil className="h-4 w-4" />, disabled: !hasPermission('userEdit'), onClick: () => navigate(`/back-office/edit/${u.id}`) });
      if (normalizeRolesForUser(u.roles || u.role || u.rolesList || u._rolesDisplay).includes('securitysupervisor')) {
        acts.push({ label: 'Perfil de supervisor', icon: <UserCog className="h-4 w-4" />, onClick: () => navigate(`/supervisors/${u.id}`) });
      }
      if (!isUserAdmin(u)) {
        acts.push({ label: 'Suspender', icon: <Archive className="h-4 w-4" />, disabled: !hasPermission('userEdit'), onClick: () => { setSelectedUserToAct(u); handleSuspendUser(u); } });
      }
    }
    return acts;
  };

  const openUser = (u: any) => {
    if (normalizeRolesForUser(u.roles || u.role || u.rolesList || u._rolesDisplay).includes('securitysupervisor')) { navigate(`/supervisors/${u.id}`); return; }
    if (hasPermission('userEdit')) navigate(`/back-office/edit/${u.id}`);
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: t('adminOfficeUsers.breadcrumb.dashboard', { defaultValue: 'Panel de control' }), path: '/dashboard' },
          { label: t('adminOfficeUsers.title', { defaultValue: 'Usuarios de Oficina Administrativa' }) },
        ]}
      />

      <PageContainer width="wide" className="p-4">
        <PageHeader
          icon={<Users />}
          title={t('adminOfficeUsers.title', { defaultValue: 'Usuarios de Oficina Administrativa' })}
          subtitle={t('adminOfficeUsers.subtitle', { defaultValue: 'Administra el acceso, los roles y los permisos del personal de oficina' })}
          actions={(
            <PermissionedButton permission="userCreate" asChild variant="brand">
              <Link to="/back-office/new">{t('adminOfficeUsers.newUser.breadcrumb.new', { defaultValue: 'Nuevo Usuario' })}</Link>
            </PermissionedButton>
          )}
        />

        <Section>
        {/* Acciones superiores */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {/* Bulk action: show Suspender and conditionally Activar if any selected is archived */}
            <Select key={selectKey} value={bulkAction ?? undefined} onValueChange={(v) => {
              const action = v;
              setBulkAction(null);
              (async () => {
                if (!selectedUsers || selectedUsers.length === 0) {
                  toast.error(t('adminOfficeUsers.toasts.selectAtLeastOne', { defaultValue: 'Selecciona al menos un usuario' }));
                  return;
                }

                if (action === 'suspender') {
                  await handleBulkSuspend(selectedUsers);
                  return;
                }

                if (action === 'activar') {
                  await handleBulkActivate(selectedUsers);
                  return;
                }
              })();
            }}>
              <SelectTrigger className="w-40" disabled={selectedUsers.length === 0 || !canManageUsers}>
                <SelectValue placeholder={t('adminOfficeUsers.bulkAction.placeholder', { defaultValue: 'Acción' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suspender">{t('adminOfficeUsers.bulkAction.suspend', { defaultValue: 'Suspender' })}</SelectItem>
                {/** show activate if any selected user is archived */}
                {selectedUsers.length > 0 && (() => {
                  const selectedSet = new Set(selectedUsers.map(String));
                  const anyArchived = rows.some((r) => selectedSet.has(String(r.id || r._id || r.raw?.id)) && ((String(r.status || '').toLowerCase() === 'archived') || (String(r.status || '').toLowerCase() === 'archivado') || r.active === false));
                  if (anyArchived) return <SelectItem value="activar">{t('adminOfficeUsers.bulkAction.activate', { defaultValue: 'Activar' })}</SelectItem>;
                  return null;
                })()}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('adminOfficeUsers.searchPlaceholder', { defaultValue: 'Buscar usuario' })}
                className="w-64 pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t('adminOfficeUsers.searchPlaceholder', { defaultValue: 'Buscar usuario' })}
              />
            </div>

            {/* Filtros */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="border-primary/30 text-primary"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {t('adminOfficeUsers.filters.title', { defaultValue: 'Filtros' })}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                <SheetHeader>
                  <SheetTitle>{t('adminOfficeUsers.filters.title', { defaultValue: 'Filtros' })}</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>{t('adminOfficeUsers.filters.categories', { defaultValue: 'Sectores' })}</Label>
                    <Select value={filterCategory ?? 'all'} onValueChange={(v) => setFilterCategory(v === 'all' ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('adminOfficeUsers.filters.categories', { defaultValue: 'Sectores' })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('adminOfficeUsers.filters.categoriesAll', { defaultValue: 'Todas' })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('adminOfficeUsers.filters.client', { defaultValue: 'Cliente' })}</Label>
                    <Select value={filterClient ?? 'all'} onValueChange={(v) => setFilterClient(v === 'all' ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('adminOfficeUsers.filters.client', { defaultValue: 'Cliente' })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('adminOfficeUsers.filters.clientAll', { defaultValue: 'Todos' })}</SelectItem>
                        {clientOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('adminOfficeUsers.filters.status', { defaultValue: 'Estado' })}</Label>
                    <Select value={filterStatus ?? 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('adminOfficeUsers.filters.statusAllLabel', { defaultValue: 'Todos los Usuarios' })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('adminOfficeUsers.filters.statusAll', { defaultValue: 'Todos los Usuarios' })}</SelectItem>
                        <SelectItem value="Activo">{t('adminOfficeUsers.filters.statusActive', { defaultValue: 'Activo' })}</SelectItem>
                        <SelectItem value="Inactivo">{t('adminOfficeUsers.filters.statusInactive', { defaultValue: 'Inactivo' })}</SelectItem>
                        <SelectItem value="Suspendido">{t('adminOfficeUsers.filters.statusSuspended', { defaultValue: 'Suspendido' })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-primary text-white hover:bg-primary/90"
                    onClick={() => {
                      // aplica filtros y cierra
                      setOpenFilter(false);
                    }}
                  >
                    {t('adminOfficeUsers.filters.apply', { defaultValue: 'Filtro' })}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Toggle vista Tarjetas / Lista (desktop) */}
            <div className="hidden md:inline-flex items-center rounded-xl border bg-card p-0.5">
              <Button variant={viewMode === "cards" ? "brand" : "ghost"} size="sm" className="h-8 px-2.5" aria-label="Vista de tarjetas" onClick={() => setViewMode("cards")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "list" ? "brand" : "ghost"} size="sm" className="h-8 px-2.5" aria-label="Vista de lista" onClick={() => setViewMode("list")}>
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Menú superior (export/import) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más acciones">
                  <EllipsisVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled={!hasPermission('userExport')} onClick={async () => { if (!hasPermission('userExport')) return; await exportUsersFile('pdf'); }}>
                  <FileDown className="mr-2 h-4 w-4" /> {t('adminOfficeUsers.actions.exportPdf', { defaultValue: 'Exportar como PDF' })}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!hasPermission('userExport')} onClick={async () => { if (!hasPermission('userExport')) return; await exportUsersFile('excel'); }}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> {t('adminOfficeUsers.actions.exportExcel', { defaultValue: 'Exportar como Excel' })}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!hasPermission('userImport')} onClick={() => { if (!hasPermission('userImport')) return; console.log('Importar') }}>
                  <ArrowDownUp className="mr-2 h-4 w-4" /> {t('adminOfficeUsers.actions.import', { defaultValue: 'Importar' })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

        {/* Tabla */}
        <div className="mt-4 overflow-hidden rounded-xl border">
          <div className="md:block hidden">
            {viewMode === "cards" ? (
              <AdminUserCardsGrid
                users={pagedRows}
                loading={false}
                selectedIds={selectedUsers}
                canSelect={(u) => canManageUsers && !isUserAdmin(u)}
                onSelect={handleSelectUser}
                onOpen={openUser}
                actions={userCardActions}
              />
            ) : (
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-4 py-3">
                    <Checkbox disabled={!canManageUsers} checked={allOnPageSelected} onCheckedChange={(v) => handleSelectAllUsers(Boolean(v))} aria-label="Seleccionar todos" />
                  </th>
                  <th className="px-4 py-3 font-semibold">{t('adminOfficeUsers.table.headers.contactName', { defaultValue: 'Nombre de Contacto' })}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminOfficeUsers.table.headers.email', { defaultValue: 'Correo Electrónico' })}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminOfficeUsers.table.headers.accessLevel', { defaultValue: 'Nivel de Acceso' })}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminOfficeUsers.table.headers.lastLogin', { defaultValue: 'Último Inicio de Sesión' })}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminOfficeUsers.table.headers.status', { defaultValue: 'Estado' })}</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12">
                      <EmptyState
                        icon={<Users />}
                        title={t('adminOfficeUsers.noData.title', { defaultValue: 'No se encontraron resultados' })}
                        description={t('adminOfficeUsers.noData.message', { defaultValue: 'No pudimos encontrar ningún elemento que coincida con su búsqueda' })}
                        className="border-0"
                      />
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((u, i) => (
                    <tr
                      key={u.id || u._id || u.raw?.id || `${currentPage}-${i}`}
                      className={`border-b ${normalizeRolesForUser(u.roles || u.role || u.rolesList || u._rolesDisplay).includes('securitysupervisor') ? 'cursor-pointer hover:bg-muted/40' : ''}`}
                      onClick={() => {
                        if (normalizeRolesForUser(u.roles || u.role || u.rolesList || u._rolesDisplay).includes('securitysupervisor')) {
                          navigate(`/supervisors/${u.id || u._id || u.raw?.id}`);
                        }
                      }}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><Checkbox disabled={!canManageUsers || isUserAdmin(u)} checked={selectedUsers.includes(String(u.id || u._id || u.raw?.id))} onCheckedChange={(v) => handleSelectUser(String(u.id || u._id || u.raw?.id), Boolean(v))} /></td>
                      <td className="px-4 py-3">{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "-"}</td>
                      <td className="px-4 py-3">{u.email || "-"}</td>
                      <td className="px-4 py-3">{
                        (() => {
                          if (u._rolesDisplay) return u._rolesDisplay;
                          const roles = u.roles ?? u.role ?? [];
                          if (Array.isArray(roles)) {
                            return roles
                              .map((r: any) => (typeof r === 'string' ? r : (r && (r.name || r.role) ? (r.name || r.role) : '')))
                              .filter(Boolean)
                              .join(', ');
                          }
                          if (typeof roles === 'string') return roles;
                          if (roles && typeof roles === 'object') return roles.name || roles.role || '';
                          return '-';
                        })()
                      }</td>
                      <td className="px-4 py-3">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const status = (u.status || "").toString().toLowerCase();
                          // archived (backend) or archivado (spanish) => show red Archivado
                          if (status === "archived" || status === "archivado") {
                            return (
                              <StatusBadge tone="red">
                                {t('adminOfficeUsers.statuses.archived', { defaultValue: 'Archivado' })}
                              </StatusBadge>
                            );
                          }

                          if (status === "invited" || status === "pending") {
                            return (
                              <StatusBadge tone="orange">
                                {t('adminOfficeUsers.statuses.pending', { defaultValue: 'Pendiente' })}
                              </StatusBadge>
                            );
                          }

                          if (u.active === false) {
                            return (
                              <StatusBadge tone="slate">
                                {t('adminOfficeUsers.statuses.inactive', { defaultValue: 'Inactivo' })}
                              </StatusBadge>
                            );
                          }

                          return (
                            <StatusBadge tone="green">
                              {t('adminOfficeUsers.statuses.active', { defaultValue: 'Activo' })}
                            </StatusBadge>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><EllipsisVertical className="h-5 w-5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(() => {
                              const status = (u.status || "").toString().toLowerCase();
                              if (status === "invited" || status === "pending") {
                                return (
                                  <>
                                    <DropdownMenuItem disabled={!hasPermission('userEdit')}
                                      onClick={() => {
                                        if (!hasPermission('userEdit')) return;
                                        setSelectedUserToAct(u);
                                        setResendDialogOpen(true);
                                      }}
                                    >
                                      <Send className="mr-2 h-4 w-4" /> {t('adminOfficeUsers.rowActions.resendInvitation', { defaultValue: 'Reenviar Invitación' })}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem disabled={!hasPermission('userEdit')}
                                      onClick={() => {
                                        if (!hasPermission('userEdit')) return;
                                        setSelectedUserToAct(u);
                                        handleSuspendUser(u);
                                      }}
                                    >
                                      <Archive className="mr-2 h-4 w-4" /> {t('adminOfficeUsers.rowActions.suspend', { defaultValue: 'Suspender' })}
                                    </DropdownMenuItem>

                                  </>
                                );
                              }

                              if (status === "archived" || status === "archivado") {
                                return (
                                  <>
                                    <DropdownMenuItem disabled={!hasPermission('userEdit')}
                                      onClick={() => {
                                        if (!hasPermission('userEdit')) return;
                                        setSelectedUserToAct(u);
                                        setRestoreDialogOpen(true);
                                      }}
                                    >
                                      {t('adminOfficeUsers.rowActions.restore', { defaultValue: 'Restaurar' })}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem disabled={!hasPermission('userDestroy')}
                                      onClick={() => {
                                        if (!hasPermission('userDestroy')) return;
                                        setSelectedUserToAct(u);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      {t('adminOfficeUsers.rowActions.delete', { defaultValue: 'Eliminar' })}
                                    </DropdownMenuItem>
                                  </>
                                );
                              }

                              return (
                                <>
                                  <DropdownMenuItem disabled={!hasPermission('userEdit')} onClick={() => { if (!hasPermission('userEdit')) return; navigate(`/back-office/edit/${u.id}`); }}>{t('adminOfficeUsers.rowActions.edit', { defaultValue: 'Editar' })}</DropdownMenuItem>
                                  {normalizeRolesForUser(u.roles || u.role || u.rolesList || u._rolesDisplay).includes('securitysupervisor') && (
                                    <DropdownMenuItem onClick={() => navigate(`/supervisors/${u.id}`)}>
                                      {t('adminOfficeUsers.rowActions.supervisorProfile', { defaultValue: 'Perfil de supervisor' })}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem disabled={!hasPermission('userEdit')}
                                    onClick={() => {
                                      if (!hasPermission('userEdit')) return;
                                      setSelectedUserToAct(u);
                                      handleSuspendUser(u);
                                    }}
                                  >
                                    {t('adminOfficeUsers.rowActions.suspend', { defaultValue: 'Suspender' })}
                                  </DropdownMenuItem>
                                </>
                              );
                            })()}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            )}
          </div>

          <div className="md:hidden">
            <MobileCardList
              items={pagedRows || []}
              loading={false}
              emptyMessage={t('adminOfficeUsers.noData.title', { defaultValue: 'No se encontraron resultados' }) as string}
              renderCard={(u: any) => (
                <div className="p-4 bg-card border rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || '-'}</div>
                      <div className="text-xs text-muted-foreground">{u.email || '-'}</div>
                      <div className="text-xs text-muted-foreground mt-1">{(u._rolesDisplay) || (Array.isArray(u.roles) ? u.roles.join(', ') : (u.roles || u.role || '-'))}</div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {(() => {
                        const status = (u.status || '').toString().toLowerCase();
                        if (status === 'archived' || status === 'archivado') return t('adminOfficeUsers.statuses.archived', { defaultValue: 'Archivado' });
                        if (status === 'invited' || status === 'pending') return t('adminOfficeUsers.statuses.pending', { defaultValue: 'Pendiente' });
                        if (u.active === false) return t('adminOfficeUsers.statuses.inactive', { defaultValue: 'Inactivo' });
                        return t('adminOfficeUsers.statuses.active', { defaultValue: 'Activo' });
                      })()}
                      <div className="text-xs text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
        {/* Footer de tabla */}
        <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3 text-sm text-foreground/70">
          <div className="flex items-center gap-2">
            <span>{t('adminOfficeUsers.footer.itemsPerPage', { defaultValue: 'Elementos por página' })}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue placeholder="25" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <div>
              {filteredRows.length === 0 ? t('adminOfficeUsers.pagination.zero', { defaultValue: '0 – 0 de 0' }) : t('adminOfficeUsers.pagination.range', { defaultValue: '{{start}} – {{end}} de {{total}}', start: rangeStart, end: rangeEnd, total: filteredRows.length })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ◀
              </Button>
              <span className="text-xs">{currentPage} / {pageCount}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pageCount}
                onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              >
                ▶
              </Button>
            </div>
          </div>
        </div>
        </Section>

        {/* Confirm dialogs for resend and suspend */ }
  <AlertDialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t('adminOfficeUsers.dialogs.resend.title', { defaultValue: 'Reenviar invitación' })}</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogDescription>
        {t('adminOfficeUsers.dialogs.resend.description', { defaultValue: '¿Deseas reenviar la invitación a {{user}}?', user: formatUserDisplay(selectedUserToAct) })}
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setSelectedUserToAct(null)}>{t('adminOfficeUsers.dialogs.common.cancel', { defaultValue: 'Cancelar' })}</AlertDialogCancel>
        <AlertDialogAction
          className="bg-primary text-white hover:bg-primary/90"
          onClick={async () => {
            if (!selectedUserToAct) return;
            try {
              setActionLoading(true);
              await userService.resendInvitation(selectedUserToAct.id);
              toast.success(t('adminOfficeUsers.dialogs.resend.success', { defaultValue: 'Invitación reenviada' }));
              setResendDialogOpen(false);
            } catch (err) {
              console.error(err);
              toast.error(t('adminOfficeUsers.dialogs.resend.error', { defaultValue: 'Error reenviando invitación' }));
            } finally {
              setActionLoading(false);
              setSelectedUserToAct(null);
            }
          }}
        >
          {actionLoading ? t('adminOfficeUsers.dialogs.common.sending', { defaultValue: 'Enviando…' }) : t('adminOfficeUsers.dialogs.resend.confirm', { defaultValue: 'Reenviar' })}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  {/* Suspend confirmation removed: suspender ahora actúa de inmediato desde el menú */ }
        <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('adminOfficeUsers.dialogs.restore.title', { defaultValue: 'Restaurar usuario' })}</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              {t('adminOfficeUsers.dialogs.restore.description', { defaultValue: '¿Deseas restaurar al usuario {{user}}? Esto devolverá el usuario a estado activo.', user: formatUserDisplay(selectedUserToAct) })}
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUserToAct(null)}>{t('adminOfficeUsers.dialogs.common.cancel', { defaultValue: 'Cancelar' })}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-primary text-white hover:bg-primary/90"
                onClick={async () => {
                  if (!selectedUserToAct) return;
                    try {
                      setActionLoading(true);
                      let res: any = null;
                      try {
                        res = await userService.restoreUser(selectedUserToAct.id);
                      } catch (e) {
                        console.warn("Restore endpoint failed", e);
                      }

                      // refresh list to keep UI in sync
                      await loadUsers();

                      toast.success(t('adminOfficeUsers.dialogs.restore.success', { defaultValue: 'Usuario restaurado' }));
                      setRestoreDialogOpen(false);
                    } catch (err) {
                      console.error(err);
                      toast.error(t('adminOfficeUsers.dialogs.restore.error', { defaultValue: 'Error restaurando usuario' }));
                    } finally {
                      setActionLoading(false);
                      setSelectedUserToAct(null);
                    }
                }}
              >
                {actionLoading ? t('adminOfficeUsers.dialogs.common.processing', { defaultValue: 'Restaurando…' }) : t('adminOfficeUsers.dialogs.restore.confirm', { defaultValue: 'Restaurar' })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('adminOfficeUsers.dialogs.delete.title', { defaultValue: 'Eliminar usuario' })}</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              {t('adminOfficeUsers.dialogs.delete.description', { defaultValue: '¿Estás seguro que deseas eliminar permanentemente a {{user}}? Esta acción no se puede deshacer.', user: formatUserDisplay(selectedUserToAct) })}
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUserToAct(null)}>{t('adminOfficeUsers.dialogs.common.cancel', { defaultValue: 'Cancelar' })}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  if (!selectedUserToAct) return;
                  await handleDeleteUser(selectedUserToAct.id);
                }}
              >
                {actionLoading ? t('adminOfficeUsers.dialogs.common.processingDelete', { defaultValue: 'Eliminando…' }) : t('adminOfficeUsers.dialogs.delete.confirm', { defaultValue: 'Eliminar' })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </AppLayout >
  );
}
