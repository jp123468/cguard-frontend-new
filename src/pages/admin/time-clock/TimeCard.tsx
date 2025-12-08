import { useState } from "react";
import AppLayout from "@/layouts/app-layout";

import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
    Filter,
    MoreVertical,
    FileSpreadsheet,
    FileText,
    Printer,
    Mail,
    BarChart3,
    CalendarDays,
    TrendingUp,
} from "lucide-react";

import Breadcrumb from "@/components/ui/breadcrumb";

export default function TimeCard() {
    const [openFilter, setOpenFilter] = useState(false);
    const [showStats, setShowStats] = useState(true);

    return (
        <AppLayout>
            {/* Breadcrumb */}
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Tarjeta de tiempo" },
                ]}
            />

            <div className="p-4">


                {/* === Estadísticas ================================================= */}
                {showStats && (
                < div className="border rounded-xl p-5 mb-6">
                    <h2 className="text-base font-semibold mb-4">
                        Estadísticas de Tarjeta de Tiempo
                    </h2>

                    <div className="grid md:grid-cols-4 gap-4">
                        <StatCard label="Horas regulares" value="0" color="text-pink-500" />
                        <StatCard label="Horas de descanso pagadas" value="0" color="text-green-500" />
                        <StatCard label="Horas de descanso no pagadas" value="0" color="text-gray-500" />
                        <StatCard label="Horas totales" value="0" color="text-blue-500" />
                    </div>
                    </div>
                )}

                {/* === Controles superiores ======================================== */}
                <div className="flex items-center justify-end flex-wrap gap-4 mb-4">

                    
                    {/* Buscador y botones */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Input placeholder="Buscar tarjeta de tiempo" className="pl-10 w-64" />
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 absolute left-3 top-2.5 text-gray-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387-1.414 1.414-4.387-4.387z" />
                            </svg>
                        </div>

                        {/* Mostrar información (toggle stats) */}
                        <Button
                            variant="outline"
                            className="border-orange-200 text-orange-600"
                            onClick={() => setShowStats((prev) => !prev)}
                            title={showStats ? "Ocultar información" : "Mostrar información"}
                        >
                            <TrendingUp className="h-4 w-4" />
                        </Button>

                        {/* Nueva entrada */}
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                            Nueva entrada
                        </Button>

                        {/* Filtros */}
                        <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="text-orange-600 border-orange-300"
                                >
                                    <Filter className="mr-2 h-4 w-4" /> Filtros
                                </Button>
                            </SheetTrigger>

                            <SheetContent
                                side="right"
                                className="w-[380px] sm:w-[430px] overflow-y-auto"
                            >
                                <SheetHeader>
                                    <SheetTitle className="text-lg font-semibold">Filtros</SheetTitle>
                                </SheetHeader>

                                {/* SOLO PESTAÑA FILTROS (sin guardados) */}
                                <Tabs defaultValue="filtros" className="mt-4">
                                    <TabsList className="grid grid-cols-1 w-full">
                                        <TabsTrigger value="filtros">Filtros</TabsTrigger>
                                    </TabsList>

                                    <div className="mt-5 space-y-5">

                                        {/* Cliente */}
                                        <FilterSelect label="Cliente*" placeholder="central (+1 otro)" />

                                        {/* Sitio de publicación */}
                                        <FilterSelect label="Sitio de publicación*" placeholder="Catolica (+2 otros)" />

                                        {/* Guardia */}
                                        <FilterSelect label="Guardia*" placeholder="José Alejo Pinos" />

                                        {/* Habilidades */}
                                        <FilterSelect label="Conjunto de Habilidades" />

                                        {/* Departamento */}
                                        <FilterSelect label="Departamento" />

                                        {/* Tipo entrada */}
                                        <FilterSelect label="Tipo de entrada" placeholder="Ambos" />

                                        {/* Desde */}
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">Desde la Fecha</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <DateInput />
                                                <TimeInput />
                                            </div>
                                        </div>

                                        {/* Hasta */}
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">Hasta la Fecha</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <DateInput />
                                                <TimeInput />
                                            </div>
                                        </div>

                                        {/* Mostrar archivados */}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox />
                                            <span className="text-sm text-gray-700">Mostrar datos archivados</span>
                                        </label>

                                        {/* Botón Filtrar */}
                                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                                            Filtro
                                        </Button>
                                    </div>
                                </Tabs>
                            </SheetContent>
                        </Sheet>

                        {/* Menú Exportar */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-5 w-5 text-gray-700" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem>
                                    <FileText className="h-4 w-4 mr-2" /> Exportar como PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar como Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Printer className="h-4 w-4 mr-2" /> Imprimir
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" /> Enviar Informe por Correo
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* === TABLA ======================================================== */}
                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr className="border-b">
                                <th className="px-4 py-3"></th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Guardia</th>
                                <th className="px-4 py-3">Horas regulares</th>
                                <th className="px-4 py-3">Horas de descanso pagadas</th>
                                <th className="px-4 py-3">Horas de descanso no pagadas</th>
                                <th className="px-4 py-3">Horas totales</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td colSpan={7} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <img
                                            src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                                            className="h-32 mb-3"
                                            alt="nodata"
                                        />
                                        <h3 className="text-lg font-semibold">
                                            No se encontraron resultados
                                        </h3>
                                        <p className="text-sm text-gray-500 max-w-xs mt-1">
                                            No pudimos encontrar ningún elemento que coincida con su búsqueda
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </AppLayout >
    );
}

/* ===============================================================
   SUB COMPONENTES
================================================================ */

function StatCard({ label, value, color }: any) {
    return (
        <div className="border rounded-xl p-4 text-center">
            <p className={`text-sm font-medium ${color}`}>{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}

function FilterSelect({ label = '', placeholder = "Seleccionar" }) {
    return (
        <div>
            <label className="text-sm font-medium block mb-2">{label}</label>
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="1">Opción 1</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

function DateInput() {
    return (
        <div className="relative">
            <Input defaultValue="Nov 17, 2025" />
            <CalendarDays className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
        </div>
    );
}

function TimeInput() {
    return <Input defaultValue="00:00" />;
}
