import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { ApiService, ApiError } from "@/services/api/apiService";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import TaxesTable, { TaxRow } from "./TaxesTable";
import TaxDialog, { TaxDialogValues } from "./TaxeDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function TaxesContent() {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState("25");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TaxRow | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const [rows, setRows] = useState<TaxRow[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);
  const [pendingDeactivateName, setPendingDeactivateName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) return;
        const res = await ApiService.get(`/tenant/${tenantId}/tax`);
        const data = Array.isArray(res)
          ? res
          : res && res.rows
          ? res.rows
          : res && res.data && Array.isArray(res.data.rows)
          ? res.data.rows
          : [];
        if (!mounted) return;
          const mapped: TaxRow[] = data.map((r: any) => ({ id: r.id ?? r._id ?? String(r.id), name: r.name ?? "", rate: Number(r.rate ?? 0), description: r.description ?? "", status: (r.status ?? "active") as any }));
        setRows(mapped);
      } catch (err) {
        console.error('Error cargando impuestos', err);
        toast.error('No se pudieron cargar los impuestos');
      }
    })();
    return () => { mounted = false };
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
    setOpen(true);
  };

  const onEditRow = (r: TaxRow) => {
    // fetch fresh data for this tax if possible
    (async () => {
      setEdit(r);
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) throw new Error('Tenant no configurado');
        const res = await ApiService.get(`/tenant/${tenantId}/tax/${r.id}`);
        const data = res && (res.data || res) ? (res.data || res) : {};
        setEdit({ id: r.id, name: data.name ?? r.name, rate: Number(data.rate ?? r.rate), description: data.description ?? r.description ?? "", status: data.status ?? r.status });
      } catch (err) {
        // fallback to provided row
        setEdit(r);
      } finally {
        setOpen(true);
      }
    })();
  };

  const onDeactivate = (r: TaxRow) => {
    setPendingDeactivateId(r.id);
    setPendingDeactivateName(r.name);
    setDeactivateDialogOpen(true);
  };

  const onDeleteRow = (r: TaxRow) => {
    setPendingDeleteIds([r.id]);
    setDeleteDialogOpen(true);
  };

  const onBulkDelete = () => {
    const ids = Object.keys(checked).filter((id) => checked[id]);
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteIds || pendingDeleteIds.length === 0) return;
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error('Tenant no configurado');
      await ApiService.request(`/tenant/${tenantId}/tax`, { method: 'DELETE', body: JSON.stringify({ ids: pendingDeleteIds }) });
      setRows((s) => s.filter((r) => !pendingDeleteIds.includes(r.id)));
      setChecked({});
      toast.success('Impuestos eliminados');
    } catch (err: any) {
      let message = 'Error eliminando impuestos';
      if (err instanceof ApiError) message = err.message || message;
      else if (err && err.message) message = err.message;
      toast.error(message);
    } finally {
      setDeleteDialogOpen(false);
      setPendingDeleteIds([]);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!pendingDeactivateId) return;
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error('Tenant no configurado');
      const res = await ApiService.put(`/tenant/${tenantId}/tax/${pendingDeactivateId}`, { status: 'inactive' });
      setRows((s) => s.map((x) => (x.id === pendingDeactivateId ? { ...x, status: res.status ?? 'inactive' } : x)));
      toast.success('Impuesto desactivado');
    } catch (err) {
      toast.error('Error desactivando impuesto');
    } finally {
      setDeactivateDialogOpen(false);
      setPendingDeactivateId(null);
      setPendingDeactivateName(null);
    }
  };

  const pageLabel = `${filtered.length === 0 ? 0 : 1} – ${filtered.length} of ${filtered.length}`;

  const submit = async (_data: TaxDialogValues) => {
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error('Tenant no configurado');
      // Ensure payload has numeric rate
      const payload = { name: _data.name, rate: Number(_data.rate), description: _data.description ?? "" };
      console.debug('[TaxesPage] submit payload ->', payload);

      if (edit) {
        const res = await ApiService.put(`/tenant/${tenantId}/tax/${edit.id}`, payload);
        setRows((s) => s.map((r) => (r.id === edit.id ? { ...r, name: res.name ?? payload.name, rate: Number(res.rate ?? payload.rate), description: res.description ?? payload.description } : r)));
        toast.success('Impuesto actualizado');
      } else {
        const res = await ApiService.post(`/tenant/${tenantId}/tax`, payload);
        const newRow: TaxRow = { id: res.id || String(Math.random()), name: res.name ?? payload.name, rate: Number(res.rate ?? payload.rate), description: res.description ?? payload.description, status: res.status ?? 'active' };
        setRows((s) => [newRow, ...s]);
        toast.success('Impuesto creado');
      }
    } catch (err) {
      let message = 'Error guardando impuesto';
      if (err instanceof ApiError) message = err.message || message;
      else if (err && (err as any).message) message = (err as any).message;
      toast.error(message);
    } finally {
      setOpen(false);
      setEdit(null);
    }
  };

  return (
    <>
      <TaxesTable
        rows={filtered}
        checked={checked}
        onCheckAll={onCheckAll}
        onCheckRow={onCheckRow}
        query={query}
        onQueryChange={setQuery}
        onNew={onNew}
        onEdit={onEditRow}
        onDeactivate={onDeactivate}
        onDelete={onDeleteRow}
        onBulkDelete={onBulkDelete}
        pageSize={pageSize}
        onPageSize={setPageSize}
        pageLabel={pageLabel}
      />
      <TaxDialog
        open={open}
        onOpenChange={setOpen}
        title={edit ? "Editar Impuesto" : "Nuevo Impuesto"}
        defaultValues={edit ? { name: edit.name, rate: edit.rate, description: edit.description } : null}
        onSubmit={submit}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar impuestos</DialogTitle>
            <DialogDescription>¿Estás seguro que deseas eliminar {pendingDeleteIds.length} impuesto(s)? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <DialogClose asChild>
              <Button variant="outline" onClick={() => { setPendingDeleteIds([]); }}>Cancelar</Button>
            </DialogClose>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar impuesto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas desactivar el impuesto &quot;
              {pendingDeactivateName}
              &quot;?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <DialogClose asChild>
              <Button variant="outline" onClick={() => { setPendingDeactivateId(null); setPendingDeactivateName(null); }}>Cancelar</Button>
            </DialogClose>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleConfirmDeactivate}>Desactivar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TaxesPage() {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Impuestos">
        <TaxesContent />
      </SettingsLayout>
    </AppLayout>
  );
}
