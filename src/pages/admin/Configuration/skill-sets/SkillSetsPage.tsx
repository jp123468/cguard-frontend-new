import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import SkillSetsTable, { SkillSetRow } from "./SkillSetsTable";
import SkillSetDialog, { SkillSetDialogValues } from "./SkillSetDialog";

export default function SkillSetsPage() {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<SkillSetRow | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const rows: SkillSetRow[] = useMemo(() => [], []);
  const total = 0;
  const loading = false;
  const guards = useMemo(() => [] as { id: string; name: string }[], []);

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Conjuntos de Habilidades">
        <SkillSetsTable
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
        <SkillSetDialog
          open={open}
          onOpenChange={setOpen}
          title={edit ? "Editar Conjunto de Habilidades" : "Nuevo Conjunto de Habilidades"}
          defaultValues={
            edit ? { name: edit.name, description: edit.description ?? "", guardId: undefined } : null
          }
          guards={guards}
          onSubmit={async (_values: SkillSetDialogValues) => {
            setOpen(false);
            setEdit(null);
          }}
        />
      </SettingsLayout>
    </AppLayout>
  );
}
