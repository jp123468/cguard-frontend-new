import { useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Search, MoreVertical, Upload, FileDown, FileSpreadsheet, Printer, Mail } from "lucide-react";

export default function Vehicles() {
    const [perPage, setPerPage] = useState("25");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [visitor, setVisitor] = useState("");
    const [visitorError, setVisitorError] = useState(false);

    const rows: Array<never> = [];

    const perPageText = useMemo(() => {
        if (perPage === "10") return "10";
        if (perPage === "25") return "25";
        return "50";
    }, [perPage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!visitor) {
            setVisitorError(true);
            return;
        }
        setVisitorError(false);
        setIsAddOpen(false);
    };

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

                        <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <SheetTrigger asChild>
                                <Button className="bg-orange-500 text-white hover:bg-orange-600">
                                    Añadir vehículo
                                </Button>
                            </SheetTrigger>

                            <SheetContent side="right" className="w-full max-w-xl">
                                <SheetHeader className="mb-4">
                                    <SheetTitle>Nuevo vehículo</SheetTitle>
                                </SheetHeader>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label>Año</Label>
                                            <Input type="number" placeholder="e.g. 2024" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>
                                                Marca<span className="text-red-500">*</span>
                                            </Label>
                                            <Input placeholder="e.g. Toyota" required />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Modelo</Label>
                                        <Input placeholder="e.g. Corolla" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>
                                            Color<span className="text-red-500">*</span>
                                        </Label>
                                        <Input placeholder="e.g. Blanco" required />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>
                                            Matrícula<span className="text-red-500">*</span>
                                        </Label>
                                        <Input placeholder="Número de placa" required />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Propiedad</Label>
                                        <Select defaultValue="empresa">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una opción" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="empresa">Propiedad de la empresa</SelectItem>
                                                <SelectItem value="guardia">Propiedad del guardia</SelectItem>
                                                <SelectItem value="alquilado">Alquilado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Número VIN</Label>
                                        <Input placeholder="Identificador del vehículo" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Descripción</Label>
                                        <Textarea
                                            rows={3}
                                            placeholder="Notas adicionales sobre el vehículo"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>
                                            Visitante<span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={visitor}
                                            onValueChange={(value) => {
                                                setVisitor(value);
                                                setVisitorError(false);
                                            }}
                                        >
                                            <SelectTrigger
                                                className={
                                                    visitorError
                                                        ? "border-red-500 focus-visible:ring-red-500"
                                                        : ""
                                                }
                                            >
                                                <SelectValue placeholder="Selecciona un visitante" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="visitor-1">Visitante 1</SelectItem>
                                                <SelectItem value="visitor-2">Visitante 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {visitorError && (
                                            <p className="text-xs text-red-500">Visitante requerido</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsAddOpen(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-orange-500 text-white hover:bg-orange-600"
                                        >
                                            Enviar
                                        </Button>
                                    </div>
                                </form>
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
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem className="flex items-center gap-2">
                                    <Upload className="h-4 w-4" />
                                    <span>Importar vehículos</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-2">
                                    <FileDown className="h-4 w-4" />
                                    <span>Exportar como PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4" />
                                    <span>Exportar como Excel</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-2">
                                    <Printer className="h-4 w-4" />
                                    <span>Imprimir</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
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
                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                                </th>
                                <th className="px-4 py-3 font-semibold">Color</th>
                                <th className="px-4 py-3 font-semibold">Modelo</th>
                                <th className="px-4 py-3 font-semibold">Marca</th>
                                <th className="px-4 py-3 font-semibold">Año</th>
                                <th className="px-4 py-3 font-semibold">Licencia</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20">
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
