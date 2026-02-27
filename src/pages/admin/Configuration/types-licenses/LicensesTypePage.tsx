import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { useTranslation } from 'react-i18next';
import LicenseTypesTable, { LicenseTypeRow } from "./LicensesTypeTable";
import LicenseTypeDialog, { LicenseTypeDialogValues } from "./LicensesTypeDialog";

export default function LicenseTypePage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<LicenseTypeRow | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const rows: LicenseTypeRow[] = useMemo(() => [], []);
  const total = 0;
  const loading = false;

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
          onEdit={(r: any) => { setEdit(r); setOpen(true); }}
          onToggleStatus={() => {}}
          onBulkDelete={() => {}}
        />
        <LicenseTypeDialog
          open={open}
          onOpenChange={setOpen}
          title={edit ? t('licenseTypes.dialog.title.edit', { defaultValue: 'Editar Tipo de Licencia' }) : t('licenseTypes.dialog.title.create', { defaultValue: 'Nuevo Tipo de Licencia' })}
          defaultValues={edit ? { name: edit.name } : null}
          onSubmit={async (_values: LicenseTypeDialogValues) => {
            setOpen(false);
            setEdit(null);
          }}
        />
      </SettingsLayout>
    </AppLayout>
  );
}
