import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import { Search, Filter as FilterIcon } from "lucide-react";

import {
    vehicleFiltersSchema,
    type VehicleFilters,
    defaultVehicleFilters,
} from "@/lib/validators/vehicle-filters";

export default function VehiclesPage() {
    const [openFilter, setOpenFilter] = useState(false);
    const [filters, setFilters] = useState<VehicleFilters>(defaultVehicleFilters);

    const rows: Array<never> = [];

    const aplicarFiltros = () => {
        const parse = vehicleFiltersSchema.safeParse(filters);
        if (!parse.success) {
            console.error(parse.error.flatten());
            return;
        }
        console.log("Aplicando filtros:", parse.data);
        setOpenFilter(false);
    };

    const perPageText = useMemo(() => {
        if (filters.perPage === "10") return "10";
        if (filters.perPage === "25") return "25";
        return "50";
    }, [filters.perPage]);

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Vehículos" },
                ]}
            />

            <section className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Select onValueChange={(v) => console.log("Acción:", v)}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Acción" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="activar">Activar</SelectItem>
                                <SelectItem value="inactivar">Inactivar</SelectItem>
                                <SelectItem value="eliminar">Eliminar</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="w-72 pl-9"
                                placeholder="Buscar vehículo"
                                onChange={(e) => console.log("buscar:", e.target.value)}
                            />
                        </div>

                        <Button className="bg-orange-500 text-white hover:bg-orange-600" asChild>
                            <Link to="/vehicle-patrol/vehicles/add-vehicle">Nuevo vehículo</Link>
                        </Button>

                        <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="border-orange-200 text-orange-600">
                                    <FilterIcon className="mr-2 h-4 w-4" />
                                    Filtros
                                </Button>
                            </SheetTrigger>

                            <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                                <SheetHeader>
                                    <SheetTitle>Filtros</SheetTitle>
                                </SheetHeader>

                                <div className="mt-6 space-y-5">
                                    <div className="space-y-2">
                                        <Label>Categorías</Label>
                                        <Select
                                            value={filters.categoryId ?? ""}
                                            onValueChange={(v) => setFilters((s) => ({ ...s, categoryId: v }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Default" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="default">Default</SelectItem>
                                                <SelectItem value="flota-a">Flota A</SelectItem>
                                                <SelectItem value="flota-b">Flota B</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Estado</Label>
                                        <Select
                                            value={filters.status}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, status: v as VehicleFilters["status"] }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Activo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="activo">Activo</SelectItem>
                                                <SelectItem value="inactivo">Inactivo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button
                                        className="w-full bg-orange-500 text-white hover:bg-orange-600"
                                        onClick={aplicarFiltros}
                                    >
                                        Filtro
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr className="border-b">
                                <th className="px-4 py-3">
                                    <Checkbox />
                                </th>
                                <th className="px-4 py-3 font-semibold">Año</th>
                                <th className="px-4 py-3 font-semibold">Marca</th>
                                <th className="px-4 py-3 font-semibold">Modelo</th>
                                <th className="px-4 py-3 font-semibold">Matrícula</th>
                                <th className="px-4 py-3 font-semibold">Estado</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-20">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <img
                                                src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                                                alt="Sin datos"
                                                className="mb-4 h-36"
                                            />
                                            <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
                                            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                                                No pudimos encontrar ningún elemento que coincida con su búsqueda
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
                            <Select
                                value={filters.perPage}
                                onValueChange={(v) => setFilters((s: any) => ({ ...s, perPage: v }))}
                            >
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
