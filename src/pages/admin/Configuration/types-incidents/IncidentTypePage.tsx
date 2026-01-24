import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import IncidentTypesTable, { IncidentTypeRow } from "./IncidentTypesTable";
import IncidentTypeDialog, { IncidentTypeDialogValues } from "./IncidentTypeDialog";
import IncidentTypesService from "@/services/incident-types.service";
import { useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function IncidentTypePage() {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<IncidentTypeRow | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<IncidentTypeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp: any = await IncidentTypesService.list(query, page, pageSize);
      const mapped = (resp.rows || []).map((r: any) => ({ id: r.id, name: r.name, status: r.active === true || r.active === 1 ? 'active' : 'inactive' }));
      setRows(mapped);
      setTotal(resp.count || 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [query, page, pageSize]);

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Tipos de Incidentes">
        <IncidentTypesTable
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          query={query}
          onQueryChange={setQuery}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onCreate={() => { setEdit(null); setOpen(true); }}
          onEdit={(r) => { setEdit(r); setOpen(true); }}
          onToggleStatus={async (id: string) => {
            try {
              await IncidentTypesService.toggle(id);
              toast.success('Estado actualizado');
              await fetchData();
            } catch (e: any) {
              toast.error(e?.message || 'Error al actualizar estado');
            }
          }}
          onBulkDelete={(ids: string[]) => {
            setDeleteIds(ids || []);
            setConfirmOpen(true);
          }}
        />
        <IncidentTypeDialog
          open={open}
          onOpenChange={setOpen}
          title={edit ? "Editar Tipo de Incidente" : "Nuevo Tipo de Incidente"}
          defaultValues={edit ? { name: edit.name } : null}
          onSubmit={async (values: IncidentTypeDialogValues) => {
            try {
              if (edit) {
                await IncidentTypesService.update(edit.id, { name: values.name });
                toast.success("Tipo de incidente actualizado");
              } else {
                await IncidentTypesService.create({ name: values.name });
                toast.success("Tipo de incidente creado");
              }
              await fetchData();
            } catch (e: any) {
              const msg = e?.message || "Error al guardar";
              try { toast.error(msg); } catch {}
            } finally {
              setOpen(false);
              setEdit(null);
            }
          }}
        />
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
            </DialogHeader>
            <div className="py-2">¿Estás seguro que deseas eliminar {deleteIds.length} tipo(s) de incidente? Esta acción no se puede deshacer.</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
              <Button className="bg-red-600 text-white" onClick={async () => {
                try {
                  await IncidentTypesService.destroyAll(deleteIds);
                  toast.success('Tipos de incidente eliminados');
                  await fetchData();
                } catch (e: any) {
                  toast.error(e?.message || 'Error al eliminar');
                } finally {
                  setConfirmOpen(false);
                  setDeleteIds([]);
                }
              }}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsLayout>
    </AppLayout>
  );
}
