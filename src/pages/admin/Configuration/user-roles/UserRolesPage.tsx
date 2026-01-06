import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { ApiService, ApiError } from "@/services/api/apiService";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import UserRolesTable, { UserRoleRow } from "./UserRolesTable";
import UserRoleDialog, { UserRoleDialogValues } from "./UserRoleDialog";
import PermissionsEditor from "./PermissionsEditor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function UserRolesPage() {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState("25");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<UserRoleRow | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [dialogDefaults, setDialogDefaults] = useState<UserRoleDialogValues | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [expandedRolePerms, setExpandedRolePerms] = useState<string[]>([]);
  const [permQuery, setPermQuery] = useState("");

  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) return;
        const res = await ApiService.get(`/tenant/${tenantId}/role`);
        console.debug('[UserRolesPage] GET /role response ->', res);
        // Support several possible shapes returned by the API
        //  - an array of roles
        //  - { rows: [...], count }
        //  - { data: { rows: [...] } }
        const data = Array.isArray(res)
          ? res
          : (res && res.rows)
          ? res.rows
          : (res && (res.data && Array.isArray(res.data.rows)))
          ? res.data.rows
          : [];
        if (!mounted) return;
        // map to UserRoleRow shape, tolerate different id fields
        const mapped: UserRoleRow[] = data.map((r: any) => ({ id: r.id ?? r._id ?? String(r.id), name: r.name ?? r.label ?? "", description: r.description ?? r.desc ?? "", isDefault: !!r.isDefault }));
        setRows(mapped);
      } catch (err) {
        console.error('Error cargando roles:', err);
        toast.error('No se pudieron cargar los roles');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  const onCheckAll = (v: boolean) => {
    const next: Record<string, boolean> = {};
    if (v) filtered.forEach((r) => (next[r.id] = true));
    setChecked(next);
  };

  const onCheckRow = (id: string, v: boolean) => {
    setChecked((s) => ({ ...s, [id]: v }));
  };

  const onNew = () => {
    setEdit(null);
    setDialogDefaults(null);
    setOpen(true);
  };

  const onEdit = async (r: UserRoleRow) => {
    console.debug('[UserRolesPage] onEdit clicked for role', r.id, r.name);
    setEdit(r);
    setDialogDefaults(null);
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error('Tenant no configurado');
      const res = await ApiService.get(`/tenant/${tenantId}/role/${r.id}`);
      // support nested shapes
      const data = res && (res.data || res) ? (res.data || res) : {};
      setDialogDefaults({
        name: data.name ?? r.name,
        description: data.description ?? r.description ?? "",
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
      });
    } catch (err) {
      // fallback to basic values
      setDialogDefaults({ name: r.name, description: r.description ?? "", permissions: [] });
    }
    setOpen(true);
  };

  const toggleExpand = async (r: UserRoleRow) => {
    if (expandedRoleId === r.id) {
      setExpandedRoleId(null);
      setExpandedRolePerms([]);
      setPermQuery("");
      return;
    }

    // expand: fetch role details to get permissions
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error('Tenant no configurado');
      const res = await ApiService.get(`/tenant/${tenantId}/role/${r.id}`);
      const data = res && (res.data || res) ? (res.data || res) : {};
      const perms = Array.isArray(data.permissions) ? data.permissions : [];
      setExpandedRolePerms(perms);
    } catch (err) {
      // fallback: empty perms
      setExpandedRolePerms([]);
    }
    setExpandedRoleId(r.id);
  };

  const saveExpandedPermissions = async (id: string, perms: string[]) => {
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error('Tenant no configurado');
      await ApiService.put(`/tenant/${tenantId}/role/${id}`, { permissions: perms });
      toast.success('Permisos actualizados');
      // close expanded
      setExpandedRoleId(null);
      setExpandedRolePerms([]);
    } catch (err) {
      toast.error('Error guardando permisos');
    }
  };

 

  const pageLabel = `${filtered.length === 0 ? 0 : 1} – ${filtered.length} of ${filtered.length}`;

  const submit = async (data: UserRoleDialogValues) => {
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error('Tenant no configurado');

      if (edit) {
        // update
        const res = await ApiService.put(`/tenant/${tenantId}/role/${edit.id}`, data);
        setRows((s) => s.map((r) => (r.id === edit.id ? { ...r, name: res.name ?? data.name, description: res.description ?? data.description } : r)));
        toast.success('Rol actualizado');
      } else {
        // create
        const res = await ApiService.post(`/tenant/${tenantId}/role`, data);
        const newRow: UserRoleRow = { id: res.id || String(Math.random()), name: res.name ?? data.name, description: res.description ?? data.description };
        setRows((s) => [newRow, ...s]);
        toast.success('Rol creado');
      }

      setOpen(false);
      setEdit(null);
      setDialogDefaults(null);
    } catch (err) {
      toast.error('Error guardando rol');
    }
  };

  const onBulkDelete = async () => {
    const ids = Object.keys(checked).filter((id) => checked[id]);
    if (ids.length === 0) return;
    // open confirmation dialog
    setPendingDeleteIds(ids);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteIds || pendingDeleteIds.length === 0) return;
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error('Tenant no configurado');
      for (const id of pendingDeleteIds) {
        await ApiService.delete(`/tenant/${tenantId}/role/${id}`);
      }
      setRows((s) => s.filter((r) => !pendingDeleteIds.includes(r.id)));
      setChecked({});
      toast.success('Roles eliminados');
    } catch (err: any) {
      let message = 'Error eliminando roles';
      if (err instanceof ApiError) {
        // Prefer the ApiError.message, otherwise try structured data
        message = err.message || message;
        if (!message && err.data) {
          if (typeof err.data === 'string') message = err.data;
          else if (err.data.message) message = err.data.message;
          else if (err.data.error) message = err.data.error;
          else message = JSON.stringify(err.data);
        }
      } else if (err && err.message) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setDeleteDialogOpen(false);
      setPendingDeleteIds([]);
    }
  };

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Roles de Usuario">
        <UserRolesTable
          rows={filtered}
          checked={checked}
          onCheckAll={onCheckAll}
          onCheckRow={onCheckRow}
          query={query}
          onQueryChange={setQuery}
          onNew={onNew}
          onToggleExpand={toggleExpand}
          onEdit={onEdit}
          onBulkDelete={onBulkDelete}
          expandedRoleId={expandedRoleId}
          expandedContent={
            expandedRoleId ? (
              <div>
                <div className="mb-2">
                  <input className="border p-2 rounded w-full" placeholder="Buscar permisos..." value={permQuery} onChange={(e) => setPermQuery(e.target.value)} />
                </div>
                <PermissionsEditor value={expandedRolePerms} onChange={setExpandedRolePerms} query={permQuery} />
                <div className="flex gap-2 justify-end mt-3">
                  <Button variant="outline" onClick={() => { setExpandedRoleId(null); setExpandedRolePerms([]); setPermQuery(""); }}>Cancelar</Button>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => saveExpandedPermissions(expandedRoleId as string, expandedRolePerms)}>Guardar</Button>
                </div>
              </div>
            ) : null
          }
          pageSize={pageSize}
          onPageSize={setPageSize}
          pageLabel={pageLabel}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar roles</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              ¿Estás seguro que deseas eliminar {pendingDeleteIds.length} rol(es)? Esta acción no se puede deshacer.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setPendingDeleteIds([]); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <UserRoleDialog
          open={open}
          onOpenChange={setOpen}
          title={edit ? "Editar Rol" : "Nuevo Rol"}
          defaultValues={dialogDefaults}
          onSubmit={submit}
        />
      </SettingsLayout>
    </AppLayout>
  );
}
