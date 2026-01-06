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
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionedButton } from '@/components/permissions/Permissioned';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [openFilter, setOpenFilter] = useState(false);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [selectKey, setSelectKey] = useState(0);

  const debouncedQuery = useDebounced(query, 450);

  // filas desde API
  const [rows, setRows] = useState<any[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const { hasPermission, hasAny } = usePermissions();
  const canManageUsers = hasAny(['userEdit','userDestroy','userImport','userCreate','userExport']);
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

      // Mostrar todos los usuarios (incluye guardias). Normalizar roles para mostrar.
      const filtered = (users || []).map((u) => ({
        ...u,
        _rolesDisplay: (normalizeRoles(u.roles || u.role || u.rolesList) || []).join(", "),
      }));

      setRows(filtered);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
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
  }, []);

  const navigate = useNavigate();

  const exportUsersFile = async (format: "excel" | "pdf" | "csv") => {
    try {
      const blob = await userService.exportFile(format);
      const ext = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
      const filename = `usuarios_${new Date().toISOString().slice(0,10)}.${ext}`;
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
      toast.error('No se pudo exportar usuarios');
    }
  };

  const handleSuspendUser = async (user: any) => {
    if (!user) return;
    if (isUserAdmin(user)) {
      toast.error('No se puede suspender a un usuario administrador');
      return;
    }
    try {
      setActionLoading(true);
      await userService.suspendUser(user.id);
      setRows((prev) => prev.map((g) => (g.id === user.id ? { ...g, status: "Archivado", active: false, raw: { ...(g.raw || {}), status: "archived" } } : g)));
      toast.success("Usuario suspendido y archivado");
    } catch (err: any) {
        console.error(err);
        const serverMsg = err?.response?.data?.message || err?.message || (typeof err === 'string' ? err : null);
        toast.error(serverMsg || "Error suspendiendo usuario");
      } finally {
      setActionLoading(false);
      setSelectedUserToAct(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!userId) return;
    const row = rows.find((r) => String(r.id || r._id || r.raw?.id) === String(userId));
    if (isUserAdmin(row)) {
      toast.error('No se puede eliminar a un usuario administrador');
      return;
    }
    try {
      setActionLoading(true);
      await userService.deleteUser(userId);
      setRows((prev) => prev.filter((g) => g.id !== userId));
      toast.success("Usuario eliminado");
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Error eliminando usuario");
    } finally {
      setActionLoading(false);
      setSelectedUserToAct(null);
    }
  };


  const filteredRows = useMemo(() => {
    if (!debouncedQuery) return rows;
    const q = debouncedQuery.toLowerCase();
    return rows.filter((r) => {
      const name = (r.firstName || r.name || "").toString().toLowerCase();
      const email = (r.email || "").toString().toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, debouncedQuery]);

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
        toast.error('Ningún usuario válido para suspender (los administradores no pueden suspenderse)');
        return;
      }
      if (idsToSuspend.length < ids.length) {
        toast.warning('Se omitieron administradores del proceso de suspensión');
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
      toast.success(`Suspendidos ${idsToSuspend.length} usuario(s)`);
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error al suspender en bloque:', err);
      toast.error('No se pudo suspender a todos los usuarios');
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
      toast.success(`Activados ${ids.length} usuario(s)`);
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error al activar en bloque:', err);
      toast.error('No se pudo activar a todos los usuarios');
    } finally {
      setActionLoading(false);
      setSelectKey((k) => k + 1);
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Usuarios de Oficina Administrativa" },
        ]}
      />

      <section className="p-4">
        {/* Acciones superiores */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {/* Bulk action: show Suspender and conditionally Activar if any selected is archived */}
            <Select key={selectKey} value={bulkAction ?? undefined} onValueChange={(v) => {
              const action = v;
              setBulkAction(null);
              (async () => {
                if (!selectedUsers || selectedUsers.length === 0) {
                  toast.error('Selecciona al menos un usuario');
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
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suspender">Suspender</SelectItem>
                {/** show activate if any selected user is archived */}
                {selectedUsers.length > 0 && (() => {
                  const selectedSet = new Set(selectedUsers.map(String));
                  const anyArchived = rows.some((r) => selectedSet.has(String(r.id || r._id || r.raw?.id)) && ((String(r.status || '').toLowerCase() === 'archived') || (String(r.status || '').toLowerCase() === 'archivado') || r.active === false));
                  if (anyArchived) return <SelectItem value="activar">Activar</SelectItem>;
                  return null;
                })()}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario"
                className="w-64 pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar usuario"
              />
            </div>

            <PermissionedButton permission="userCreate" asChild className="bg-orange-500 text-white hover:bg-orange-600">
              <Link to="/back-office/new">Nuevo Usuario</Link>
            </PermissionedButton>

            {/* Filtros */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="border-orange-200 text-orange-600"
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
                        {/* llena con tus categorías reales */}
                        <SelectItem value="all">Todas</SelectItem>
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
                        {/* llena con tus clientes reales */}
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los Usuarios" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* estados reales */}
                        <SelectItem value="all">Todos los Usuarios</SelectItem>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Inactivo">Inactivo</SelectItem>
                        <SelectItem value="Suspendido">Suspendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-orange-500 text-white hover:bg-orange-600"
                    onClick={() => {
                      // aplica filtros y cierra
                      setOpenFilter(false);
                    }}
                  >
                    Filtro
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Menú superior (export/import) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más acciones">
                  <EllipsisVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled={!hasPermission('userExport')} onClick={async () => { if (!hasPermission('userExport')) return; await exportUsersFile('pdf'); }}>
                    <FileDown className="mr-2 h-4 w-4" /> Exportar como PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!hasPermission('userExport')} onClick={async () => { if (!hasPermission('userExport')) return; await exportUsersFile('excel'); }}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar como Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!hasPermission('userImport')} onClick={() => { if (!hasPermission('userImport')) return; console.log("Importar") }}>
                    <ArrowDownUp className="mr-2 h-4 w-4" /> Importar
                  </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

        {/* Tabla */}
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox disabled={!canManageUsers} checked={allOnPageSelected} onCheckedChange={(v) => handleSelectAllUsers(Boolean(v))} aria-label="Seleccionar todos" />
                </th>
                <th className="px-4 py-3 font-semibold">Nombre de Contacto</th>
                <th className="px-4 py-3 font-semibold">Correo Electrónico</th>
                <th className="px-4 py-3 font-semibold">Nivel de Acceso</th>
                <th className="px-4 py-3 font-semibold">Último Inicio de Sesión</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                        alt="Sin datos"
                        className="mb-4 h-36"
                      />
                      <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
                      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((u, i) => (
                  <tr key={u.id || i} className="border-b">
                  <td className="px-4 py-3"><Checkbox disabled={!canManageUsers || isUserAdmin(u)} checked={selectedUsers.includes(String(u.id || u._id || u.raw?.id))} onCheckedChange={(v) => handleSelectUser(String(u.id || u._id || u.raw?.id), Boolean(v))} /></td>
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
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              Archivado
                            </Badge>
                          );
                        }

                        if (status === "invited" || status === "pending") {
                          return (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                              Pendiente
                            </Badge>
                          );
                        }

                        if (u.active === false) {
                          return (
                            <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                              Inactivo
                            </Badge>
                          );
                        }

                        return (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Activo
                          </Badge>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
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
                                      <Send className="mr-2 h-4 w-4" /> Reenviar Invitación
                                    </DropdownMenuItem>

                                  <DropdownMenuItem disabled={!hasPermission('userEdit')}
                                    onClick={() => {
                                      if (!hasPermission('userEdit')) return;
                                      setSelectedUserToAct(u);
                                      handleSuspendUser(u);
                                    }}
                                  >
                                    <Archive className="mr-2 h-4 w-4" /> Suspender
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
                                    Restaurar
                                  </DropdownMenuItem>

                                  <DropdownMenuItem disabled={!hasPermission('userDestroy')}
                                    onClick={() => {
                                      if (!hasPermission('userDestroy')) return;
                                      setSelectedUserToAct(u);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    Eliminar
                                  </DropdownMenuItem>
                                </>
                              );
                            }

                            return (
                                <>
                                <DropdownMenuItem disabled={!hasPermission('userEdit')} onClick={() => { if (!hasPermission('userEdit')) return; navigate(`/back-office/edit/${u.id}`); }}>Editar</DropdownMenuItem>
                                <DropdownMenuItem disabled={!hasPermission('userEdit')}
                                  onClick={() => {
                                    if (!hasPermission('userEdit')) return;
                                    setSelectedUserToAct(u);
                                    handleSuspendUser(u);
                                  }}
                                >
                                  Suspender
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

          {/* Footer de tabla */}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Elementos por página</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
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
            <div>
              {filteredRows.length === 0 ? "0 – 0 de 0" : `1 – ${filteredRows.length} de ${filteredRows.length}`}
            </div>
          </div>
        </div>
        {/* Confirm dialogs for resend and suspend */}
        <AlertDialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reenviar invitación</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              ¿Deseas reenviar la invitación a {formatUserDisplay(selectedUserToAct)}?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUserToAct(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-orange-500 text-white hover:bg-orange-600"
                onClick={async () => {
                  if (!selectedUserToAct) return;
                    try {
                      setActionLoading(true);
                      await userService.resendInvitation(selectedUserToAct.id);
                      toast.success("Invitación reenviada");
                      setResendDialogOpen(false);
                    } catch (err) {
                      console.error(err);
                      toast.error("Error reenviando invitación");
                    } finally {
                      setActionLoading(false);
                      setSelectedUserToAct(null);
                    }
                }}
              >
                {actionLoading ? "Enviando…" : "Reenviar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Suspend confirmation removed: suspender ahora actúa de inmediato desde el menú */}
        <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar usuario</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              ¿Deseas restaurar al usuario {formatUserDisplay(selectedUserToAct)}? Esto devolverá el usuario a estado activo.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUserToAct(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-orange-500 text-white hover:bg-orange-600"
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

                      toast.success("Usuario restaurado");
                      setRestoreDialogOpen(false);
                    } catch (err) {
                      console.error(err);
                      toast.error("Error restaurando usuario");
                    } finally {
                      setActionLoading(false);
                      setSelectedUserToAct(null);
                    }
                }}
              >
                {actionLoading ? "Restaurando…" : "Restaurar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              ¿Estás seguro que deseas eliminar permanentemente a {formatUserDisplay(selectedUserToAct)}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUserToAct(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  if (!selectedUserToAct) return;
                  await handleDeleteUser(selectedUserToAct.id);
                }}
              >
                {actionLoading ? "Eliminando…" : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </AppLayout>
  );
}
