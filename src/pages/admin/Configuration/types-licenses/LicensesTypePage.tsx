import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";
import LicenseTypesTable, { LicenseTypeRow } from "./LicensesTypeTable";
import LicenseTypeDialog, { LicenseTypeDialogValues } from "./LicensesTypeDialog";
import licenseTypeService from "@/lib/api/licenseTypeService";

export default function LicenseTypePage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<LicenseTypeRow | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<LicenseTypeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      };
      if (query) params['filter[name]'] = query;
      const resp: { rows?: Array<{ id: string; name: string; status?: string }>; count?: number } = await licenseTypeService.list(params);
      const mapped: LicenseTypeRow[] = (resp?.rows || []).map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status === 'inactive' ? 'inactive' : 'active',
      }));
      setRows(mapped);
      setTotal(resp?.count || 0);
    } catch (e: any) {
      toast.error(e?.message || 'Error al cargar tipos de licencia');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [query, page, pageSize]);

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title={t('licenseTypes.page.title', { defaultValue: 'Tipos de Licencia' })}>
        <LicenseTypesTable
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
          onEdit={(r: LicenseTypeRow) => { setEdit(r); setOpen(true); }}
          onToggleStatus={async (row: LicenseTypeRow) => {
            try {
              await licenseTypeService.update(row.id, { status: row.status === 'active' ? 'inactive' : 'active' });
              toast.success('Estado actualizado');
              await fetchData();
            } catch (e: any) {
              toast.error(e?.message || 'Error al actualizar estado');
            }
          }}
          onBulkDelete={async (ids: string[]) => {
            if (!ids?.length) return;
            try {
              await licenseTypeService.destroy(ids);
              toast.success('Tipo(s) de licencia eliminado(s)');
              await fetchData();
            } catch (e: any) {
              toast.error(e?.message || 'Error al eliminar');
            }
          }}
        />
        <LicenseTypeDialog
          open={open}
          onOpenChange={setOpen}
          title={edit ? t('licenseTypes.dialog.title.edit', { defaultValue: 'Editar Tipo de Licencia' }) : t('licenseTypes.dialog.title.create', { defaultValue: 'Nuevo Tipo de Licencia' })}
          defaultValues={edit ? { name: edit.name } : null}
          onSubmit={async (values: LicenseTypeDialogValues) => {
            try {
              if (edit) {
                await licenseTypeService.update(edit.id, { name: values.name });
                toast.success('Tipo de licencia actualizado');
              } else {
                await licenseTypeService.create({ name: values.name });
                toast.success('Tipo de licencia creado');
              }
              setOpen(false);
              setEdit(null);
              await fetchData();
            } catch (e: any) {
              toast.error(e?.message || 'Error al guardar');
            }
          }}
        />
      </SettingsLayout>
    </AppLayout>
  );
}
