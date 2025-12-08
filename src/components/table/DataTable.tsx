import { Checkbox } from "@/components/ui/checkbox";
import { RowActionsMenu, type RowAction } from "./RowActionsMenu";

export type Column<T = any> = {
    key: keyof T | string;
    header: string;
    className?: string;
    render?: (value: any, row: T) => React.ReactNode;
};

type DataTableProps<T> = {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    selectedIds: string[];
    onSelectOne: (id: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    rowActions?: (row: T) => RowAction[];
    emptyState?: React.ReactNode;
};

export function DataTable<T extends { id: string }>({
    columns,
    data,
    loading,
    selectedIds,
    onSelectOne,
    onSelectAll,
    rowActions,
    emptyState,
}: DataTableProps<T>) {
    const allSelected = data.length > 0 && selectedIds.length === data.length;

    return (
        <div className="border rounded-lg overflow-hidden bg-white">
            <table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50">
                    <tr className="border-b">
                        <th className="px-4 py-3 w-10">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={(checked) => onSelectAll(!!checked)}
                            />
                        </th>
                        {columns.map((col) => (
                            <th
                                key={String(col.key)}
                                className={`px-4 py-3 font-semibold ${col.className ?? ""}`}
                            >
                                {col.header}
                            </th>
                        ))}
                        {rowActions && <th className="w-12" />}
                    </tr>
                </thead>

                <tbody>
                    {loading ? (
                        <tr>
                            <td
                                colSpan={columns.length + (rowActions ? 2 : 1)}
                                className="py-20 text-center"
                            >
                                Cargando...
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length + (rowActions ? 2 : 1)}
                                className="py-12"
                            >
                                {emptyState ?? (
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <p className="text-base font-medium">
                                            No se encontraron resultados
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                                            Intenta ajustar la búsqueda o los filtros.
                                        </p>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr key={row.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <Checkbox
                                        checked={selectedIds.includes(row.id)}
                                        onCheckedChange={(checked) =>
                                            onSelectOne(row.id, !!checked)
                                        }
                                    />
                                </td>

                                {columns.map((col) => {
                                    const value = (row as any)[col.key];
                                    return (
                                        <td
                                            key={String(col.key)}
                                            className={`px-4 py-3 text-gray-600 ${col.className ?? ""}`}
                                        >
                                            {col.render ? col.render(value, row) : value}
                                        </td>
                                    );
                                })}

                                {rowActions && (
                                    <td className="px-4 py-3 text-right">
                                        <RowActionsMenu actions={rowActions(row)} />
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
