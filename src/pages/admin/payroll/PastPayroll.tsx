// src/pages/PastPayroll.tsx
import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function PastPayroll() {
    const [perPage, setPerPage] = useState<string>("10");
    const rows: Array<never> = [];

    const perPageText = useMemo(() => {
        if (perPage === "10") return "10";
        if (perPage === "25") return "25";
        return "50";
    }, [perPage]);

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Nómina Pasada" },
                ]}
            />

            <section className="p-6">
                <div className="mb-4 flex items-center gap-3">
                    <Select onValueChange={(v) => console.log("Acción:", v)}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Acción" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="eliminar">Eliminar</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr className="border-b">
                                <th className="px-4 py-3">
                                    <Checkbox />
                                </th>
                                <th className="px-4 py-3 font-semibold">Período de pago</th>
                                <th className="px-4 py-3 font-semibold">Total</th>
                                <th className="px-4 py-3 font-semibold">Salarios estimados</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-20">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <img
                                                src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                                                alt="Sin datos"
                                                className="mb-4 h-36"
                                            />
                                            <h3 className="text-lg font-semibold">
                                                No se encontraron resultados
                                            </h3>
                                            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                                                No pudimos encontrar ningún elemento que coincida con su
                                                búsqueda
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="flex items-center justify-between bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <span>Elementos por página</span>
                            <Select value={perPage} onValueChange={setPerPage}>
                                <SelectTrigger className="h-8 w-20">
                                    <SelectValue placeholder={perPageText} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>0 of 0</div>
                    </div>
                </div>
            </section>
        </AppLayout>
    );
}
