import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import TaxesTable, { TaxRow } from "./TaxesTable";
import TaxDialog, { TaxDialogValues } from "./TaxeDialog";

function TaxesContent() {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState("25");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TaxRow | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const rows: TaxRow[] = [];
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
    setEdit(r);
    setOpen(true);
  };

  const onDeactivate = (_r: TaxRow) => {};
  const onBulkDelete = () => {};

  const pageLabel = `${filtered.length === 0 ? 0 : 1} – ${filtered.length} of ${filtered.length}`;

  const submit = async (_data: TaxDialogValues) => {
    setOpen(false);
    setEdit(null);
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
        onBulkDelete={onBulkDelete}
        pageSize={pageSize}
        onPageSize={setPageSize}
        pageLabel={pageLabel}
      />
      <TaxDialog
        open={open}
        onOpenChange={setOpen}
        title={edit ? "Editar Impuesto" : "Nuevo Impuesto"}
        defaultValues={edit ? { name: edit.name, rate: edit.rate } : null}
        onSubmit={submit}
      />
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
