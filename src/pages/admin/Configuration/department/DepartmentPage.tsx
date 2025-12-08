import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import DepartmentsTable, { DepartmentRow } from "./DepartmentTable";
import DepartmentDialog, { DepartmentDialogValues } from "./DepartmentDialog";

export default function DepartmentPage() {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<DepartmentRow | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const rows: DepartmentRow[] = useMemo(() => [], []);
  const total = 0;
  const loading = false;
  const guards = useMemo(() => [] as { id: string; name: string }[], []);

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Departamentos">
        <DepartmentsTable
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
        <DepartmentDialog
          open={open}
          onOpenChange={setOpen}
          title={edit ? "Editar Departamento" : "Nuevo Departamento"}
          defaultValues={
            edit ? { name: edit.name, description: edit.description ?? "", guardId: undefined } : null
          }
          guards={guards}
          onSubmit={async (_values: DepartmentDialogValues) => {
            setOpen(false);
            setEdit(null);
          }}
        />
      </SettingsLayout>
    </AppLayout>
  );
}
