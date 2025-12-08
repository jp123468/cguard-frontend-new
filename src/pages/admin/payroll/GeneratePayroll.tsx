import { useMemo, useState } from "react";
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    Filter as FilterIcon,
    MoreVertical,
    FileDown,
    FileSpreadsheet,
    Printer,
    Mail,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

type PerPage = "10" | "25" | "50";

interface PayrollFilters {
    guard: string;
    fromDate: string;
    fromTime: string;
    toDate: string;
    toTime: string;
    showArchived: boolean;
    perPage: PerPage;
}

const defaultFilters: PayrollFilters = {
    guard: "",
    fromDate: "",
    fromTime: "00:00",
    toDate: "",
    toTime: "23:59",
    showArchived: false,
    perPage: "10",
};

export default function GeneratePayroll() {
    const [openFilter, setOpenFilter] = useState(false);
    const [filters, setFilters] = useState<PayrollFilters>(defaultFilters);

    const perPageText = useMemo(() => {
        if (filters.perPage === "10") return "10";
        if (filters.perPage === "25") return "25";
        return "50";
    }, [filters.perPage]);

    const applyFilters = () => {
        setOpenFilter(false);
    };

    const handleExportPdf = () => {
        console.log("Exportar como PDF");
    };

    const handleExportExcel = () => {
        console.log("Exportar como Excel");
    };

    const handlePrint = () => {
        console.log("Imprimir");
    };

    const handleSendEmail = () => {
        console.log("Enviar informe por correo");
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Generar Nómina" },
                ]}
            />

            <section className="p-6">
                <div className="mb-6 flex items-center justify-end gap-2">
                    <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                className="rounded-full border-orange-200 px-5 text-orange-600 hover:bg-orange-50"
                            >
                                <FilterIcon className="mr-2 h-4 w-4" />
                                Filtros
                            </Button>
                        </SheetTrigger>

                        <SheetContent side="right" className="w-full max-w-md">
                            <SheetHeader>
                                <SheetTitle>Filtros</SheetTitle>
                            </SheetHeader>

                            <div className="mt-6 space-y-5">
                                <div className="space-y-2">
                                    <Label>Seleccionar guardia(s)*</Label>
                                    <Select
                                        value={filters.guard}
                                        onValueChange={(v) =>
                                            setFilters((s) => ({ ...s, guard: v }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar guardia(s)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="guard-1">Guardia 1</SelectItem>
                                            <SelectItem value="guard-2">Guardia 2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Desde la Fecha</Label>
                                        <Input
                                            type="date"
                                            value={filters.fromDate}
                                            onChange={(e) =>
                                                setFilters((s) => ({
                                                    ...s,
                                                    fromDate: e.target.value,
                                                }))
                                            }
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Hora*</Label>
                                        <Input
                                            type="time"
                                            value={filters.fromTime}
                                            onChange={(e) =>
                                                setFilters((s) => ({
                                                    ...s,
                                                    fromTime: e.target.value,
                                                }))
                                            }
                                            className="h-10"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Hasta la Fecha</Label>
                                        <Input
                                            type="date"
                                            value={filters.toDate}
                                            onChange={(e) =>
                                                setFilters((s) => ({
                                                    ...s,
                                                    toDate: e.target.value,
                                                }))
                                            }
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Hora*</Label>
                                        <Input
                                            type="time"
                                            value={filters.toTime}
                                            onChange={(e) =>
                                                setFilters((s) => ({
                                                    ...s,
                                                    toTime: e.target.value,
                                                }))
                                            }
                                            className="h-10"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="show-archived"
                                        checked={filters.showArchived}
                                        onCheckedChange={(checked) =>
                                            setFilters((s) => ({
                                                ...s,
                                                showArchived: Boolean(checked),
                                            }))
                                        }
                                    />
                                    <Label htmlFor="show-archived" className="text-sm">
                                        Mostrar datos archivados
                                    </Label>
                                </div>

                                <Button
                                    className="w-full bg-orange-500 text-white hover:bg-orange-600"
                                    onClick={applyFilters}
                                >
                                    Filtro
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuItem onClick={handleExportPdf}>
                                <FileDown className="mr-2 h-4 w-4" />
                                <span>Exportar como PDF</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportExcel}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                <span>Exportar como Excel</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" />
                                <span>Imprimir</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleSendEmail}>
                                <Mail className="mr-2 h-4 w-4" />
                                <span>Enviar Informe por Correo</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl bg-slate-50">
                    <img
                        src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                        alt="Sin datos"
                        className="mb-4 h-40"
                    />
                    <h2 className="text-lg font-semibold text-slate-800">
                        No se encontraron resultados
                    </h2>
                    <p className="mt-1 max-w-md text-center text-sm text-slate-500">
                        No pudimos encontrar ningún elemento que coincida con su búsqueda
                    </p>
                </div>

                <div className="mt-4 flex items-center justify-end gap-6 rounded-b-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <span>Elementos por página</span>
                        <Select
                            value={filters.perPage}
                            onValueChange={(v) =>
                                setFilters((s) => ({ ...s, perPage: v as PerPage }))
                            }
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

                    <div className="flex items-center gap-3">
                        <span>0 of 0</span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </AppLayout>
    );
}
