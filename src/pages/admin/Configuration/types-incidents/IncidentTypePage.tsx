import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import IncidentTypesTable, { IncidentTypeRow } from "./IncidentTypesTable";
import IncidentTypeDialog, { IncidentTypeDialogValues } from "./IncidentTypeDialog";

export default function IncidentTypePage() {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<IncidentTypeRow | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const rows: IncidentTypeRow[] = useMemo(() => [], []);
  const total = 0;
  const loading = false;

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
          onToggleStatus={() => {}}
          onBulkDelete={() => {}}
        />
        <IncidentTypeDialog
          open={open}
          onOpenChange={setOpen}
          title={edit ? "Editar Tipo de Incidente" : "Nuevo Tipo de Incidente"}
          defaultValues={edit ? { name: edit.name } : null}
          onSubmit={async (_values: IncidentTypeDialogValues) => {
            setOpen(false);
            setEdit(null);
          }}
        />
      </SettingsLayout>
    </AppLayout>
  );
}
