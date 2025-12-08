import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import UserRolesTable, { UserRoleRow } from "./UserRolesTable";
import UserRoleDialog, { UserRoleDialogValues } from "./UserRoleDialog";

export default function UserRolesPage() {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState("25");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<UserRoleRow | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const rows: UserRoleRow[] = [];

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

  const onEdit = (r: UserRoleRow) => {
    setEdit(r);
    setOpen(true);
  };

  const onBulkDelete = () => {};

  const pageLabel = `${filtered.length === 0 ? 0 : 1} – ${filtered.length} of ${filtered.length}`;

  const submit = async (_data: UserRoleDialogValues) => {
    setOpen(false);
    setEdit(null);
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
          onEdit={onEdit}
          onBulkDelete={onBulkDelete}
          pageSize={pageSize}
          onPageSize={setPageSize}
          pageLabel={pageLabel}
        />

        <UserRoleDialog
          open={open}
          onOpenChange={setOpen}
          title={edit ? "Editar Rol" : "Nuevo Rol"}
          defaultValues={edit ? { name: edit.name, description: edit.description } : null}
          onSubmit={submit}
        />
      </SettingsLayout>
    </AppLayout>
  );
}
