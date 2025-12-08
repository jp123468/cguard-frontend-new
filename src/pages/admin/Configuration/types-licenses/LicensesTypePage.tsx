import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import LicenseTypesTable, { LicenseTypeRow } from "./LicensesTypeTable";
import LicenseTypeDialog, { LicenseTypeDialogValues } from "./LicensesTypeDialog";

export default function LicenseTypePage() {
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
      <SettingsLayout navKey="configuracion" title="Tipos de Licencia">
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
          title={edit ? "Editar Tipo de Licencia" : "Nuevo Tipo de Licencia"}
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
