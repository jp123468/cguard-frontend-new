import { useMemo, useState } from "react";
import { Search, Filter as FilterIcon, MoreVertical, FileDown, FileSpreadsheet, Printer, Mail } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type VisitsFilters = {
    clientId: string;
    siteId: string;
    guardId: string;
    fromDate: string;
    fromTime: string;
    toDate: string;
    toTime: string;
    showArchived: boolean;
    perPage: string;
};

const defaultFilters: VisitsFilters = {
    clientId: "",
    siteId: "",
    guardId: "",
    fromDate: "",
    fromTime: "00:00",
    toDate: "",
    toTime: "23:59",
    showArchived: false,
    perPage: "25",
};

export default function Visits() {
    const [openFilter, setOpenFilter] = useState(false);
    const [filters, setFilters] = useState<VisitsFilters>(defaultFilters);

    const rows: Array<never> = [];

    const aplicarFiltros = () => {
        console.log("Aplicando filtros:", filters);
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
                    { label: "Visitas" },
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
                                <SelectItem value="eliminar">Eliminar</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="w-72 pl-9"
                                placeholder="Buscar registro de visitas"
                                onChange={(e) => console.log("buscar:", e.target.value)}
                            />
                        </div>

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
                                        <Label className="text-xs">Cliente*</Label>
                                        <Select
                                            value={filters.clientId}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, clientId: v }))
                                            }
                                        >
                                            <SelectTrigger className="h-10 text-xs">
                                                <SelectValue placeholder="central (+1 otro)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="central">central (+1 otro)</SelectItem>
                                                <SelectItem value="cliente-2">Cliente 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs">Sitio de publicación*</Label>
                                        <Select
                                            value={filters.siteId}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, siteId: v }))
                                            }
                                        >
                                            <SelectTrigger className="h-10 text-xs">
                                                <SelectValue placeholder="Catolica (+2 otros)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="catolica">Catolica (+2 otros)</SelectItem>
                                                <SelectItem value="site-2">Sitio 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs">Guardia</Label>
                                        <Select
                                            value={filters.guardId}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, guardId: v }))
                                            }
                                        >
                                            <SelectTrigger className="h-10 text-xs">
                                                <SelectValue placeholder="Selecciona un guardia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="guard-1">José Alejo Pinos</SelectItem>
                                                <SelectItem value="guard-2">Guardia 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Desde la Fecha</Label>
                                            <Input
                                                type="date"
                                                className="h-10 text-xs"
                                                value={filters.fromDate}
                                                onChange={(e) =>
                                                    setFilters((s) => ({ ...s, fromDate: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Hora*</Label>
                                            <Input
                                                type="time"
                                                className="h-10 text-xs"
                                                value={filters.fromTime}
                                                onChange={(e) =>
                                                    setFilters((s) => ({ ...s, fromTime: e.target.value }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Hasta la Fecha</Label>
                                            <Input
                                                type="date"
                                                className="h-10 text-xs"
                                                value={filters.toDate}
                                                onChange={(e) =>
                                                    setFilters((s) => ({ ...s, toDate: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Hora*</Label>
                                            <Input
                                                type="time"
                                                className="h-10 text-xs"
                                                value={filters.toTime}
                                                onChange={(e) =>
                                                    setFilters((s) => ({ ...s, toTime: e.target.value }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 pt-2">
                                        <Checkbox
                                            id="showArchived"
                                            checked={filters.showArchived}
                                            onCheckedChange={(v) =>
                                                setFilters((s) => ({
                                                    ...s,
                                                    showArchived: Boolean(v),
                                                }))
                                            }
                                        />
                                        <Label
                                            htmlFor="showArchived"
                                            className="text-xs font-medium text-slate-700"
                                        >
                                            Mostrar datos archivados
                                        </Label>
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

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => console.log("Exportar PDF")}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    <span>Exportar como PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => console.log("Exportar Excel")}
                                >
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    <span>Exportar como Excel</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log("Imprimir")}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    <span>Imprimir</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => console.log("Correo Electrónico")}
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    <span>Correo Electrónico</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr className="border-b">
                                <th className="px-4 py-3">
                                    <Checkbox />
                                </th>
                                <th className="px-4 py-3 font-semibold">Nombre</th>
                                <th className="px-4 py-3 font-semibold">Vehículo</th>
                                <th className="px-4 py-3 font-semibold">Hora de entrada</th>
                                <th className="px-4 py-3 font-semibold">Hora de salida</th>
                                <th className="px-4 py-3 font-semibold">Sitio de publicación</th>
                                <th className="px-4 py-3 font-semibold">Registrado por</th>
                                <th className="px-4 py-3 font-semibold">Salido por</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-20">
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
                            <Select
                                value={filters.perPage}
                                onValueChange={(v) =>
                                    setFilters((s) => ({ ...s, perPage: v }))
                                }
                            >
                                <SelectTrigger className="h-8 w-20">
                                    <SelectValue placeholder={perPageText} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
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
