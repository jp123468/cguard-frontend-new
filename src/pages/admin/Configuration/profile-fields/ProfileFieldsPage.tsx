import { useMemo, useState } from "react";
import ProfileFieldsTable, { ProfileFieldRow } from "./ProfileFieldsTable";
import ProfileFieldDialog, { ProfileFieldDialogValues } from "./ProfileFieldDialog";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";

export default function ProfileFieldsPage() {
    const [query, setQuery] = useState("");
    const [pageSize, setPageSize] = useState("25");
    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState<ProfileFieldRow | null>(null);
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    const rows: ProfileFieldRow[] = [];

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

    const onEdit = (r: ProfileFieldRow) => {
        setEdit(r);
        setOpen(true);
    };

    const onToggleStatus = (_r: ProfileFieldRow) => { };
    const onBulkDelete = () => { };

    const pageLabel = `${filtered.length === 0 ? 0 : 1} – ${filtered.length} of ${filtered.length}`;

    const submit = async (data: ProfileFieldDialogValues) => {
        setOpen(false);
        setEdit(null);
    };

    return (
        <AppLayout>
            <SettingsLayout navKey="configuracion" title="Campos de Perfil">
                <ProfileFieldsTable
                    rows={filtered}
                    checked={checked}
                    onCheckAll={onCheckAll}
                    onCheckRow={onCheckRow}
                    query={query}
                    onQueryChange={setQuery}
                    onNew={onNew}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                    onBulkDelete={onBulkDelete}
                    pageSize={pageSize}
                    onPageSize={setPageSize}
                    pageLabel={pageLabel}
                />

                <ProfileFieldDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={edit ? "Editar Campo de Perfil" : "Añadir Campo de Perfil"}
                    defaultValues={edit ? { name: edit.name, type: edit.type as any } : null}
                    onSubmit={submit}
                />
            </SettingsLayout>

        </AppLayout>
    );
}
