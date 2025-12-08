import { useState, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Filter,
    Search,
    ChevronLeft,
    ChevronRight,
    EllipsisVertical,
    Calendar as CalendarIcon,
    X
} from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { es } from "date-fns/locale";

// Tipos para los presupuestos
type EstimateStatus = "Borrador" | "Enviado" | "Aceptado" | "Rechazado" | "Expirado";

interface Estimate {
    id: string;
    date: Date;
    estimateNumber: string;
    client: string;
    total: number;
    expiryDate: Date;
    status: EstimateStatus;
}

export default function Estimates() {
    const [openFilter, setOpenFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEstimates, setSelectedEstimates] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Filtros
    const [dateFrom, setDateFrom] = useState<Date>();
    const [dateTo, setDateTo] = useState<Date>();

    // Estado principal SIN datos de prueba (para mostrar "No se encontraron resultados")
    const [estimates, setEstimates] = useState<Estimate[]>([]);

    // Filtrado
    const filteredEstimates = useMemo(() => {
        if (!searchQuery) return estimates;
        const lowerQuery = searchQuery.toLowerCase();
        return estimates.filter(
            (e) =>
                e.client.toLowerCase().includes(lowerQuery) ||
                e.estimateNumber.toLowerCase().includes(lowerQuery)
        );
    }, [estimates, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredEstimates.length / itemsPerPage));

    // Paginado
    const paginatedEstimates = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredEstimates.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredEstimates, currentPage, itemsPerPage]);

    // Selección
    const handleSelectEstimate = (id: string, checked: boolean) => {
        setSelectedEstimates((prev) =>
            checked ? [...prev, id] : prev.filter((item) => item !== id)
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const ids = paginatedEstimates.map((e) => e.id);
            setSelectedEstimates((prev) => Array.from(new Set([...prev, ...ids])));
        } else {
            const ids = paginatedEstimates.map((e) => e.id);
            setSelectedEstimates((prev) => prev.filter((id) => !ids.includes(id)));
        }
    };

    const allSelected =
        paginatedEstimates.length > 0 &&
        paginatedEstimates.every((e) => selectedEstimates.includes(e.id));

    const renderStatus = (status: EstimateStatus) => {
        const styles = {
            Borrador: "bg-gray-100 text-gray-800",
            Enviado: "bg-blue-100 text-blue-800",
            Aceptado: "bg-green-100 text-green-800",
            Rechazado: "bg-red-100 text-red-800",
            Expirado: "bg-orange-100 text-orange-800",
        };
        return (
            <Badge className={`${styles[status]} hover:${styles[status]}`}>
                {status}
            </Badge>
        );
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Estimaciones" },
                ]}
            />
            <div className="p-4">
                <section>
                    {/* Acciones superiores */}
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <Select>
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
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar en la lista de presupuestos"
                                    className="pl-9 w-80"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Button className="bg-orange-500 hover:bg-orange-600 text-white" asChild>
                                <Link to="/estimates/add-new">Nuevo Presupuesto</Link>
                            </Button>

                            {/* Filtros */}
                            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="text-orange-600 border-orange-200"
                                    >
                                        <Filter className="mr-2 h-4 w-4" />
                                        Filtros
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                                    <SheetHeader className="flex flex-row items-center justify-between border-b pb-4">
                                        <SheetTitle>Filtros</SheetTitle>
                                        {/* Close button is automatic in SheetContent usually, but we can add custom if needed */}
                                    </SheetHeader>

                                    <div className="mt-6 space-y-6">
                                        <div className="space-y-2">
                                            <Label>Cliente</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="central (+1 otro)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="todos">Todos</SelectItem>
                                                    <SelectItem value="central">Central</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Estado*</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Todo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="todos">Todo</SelectItem>
                                                    <SelectItem value="borrador">Borrador</SelectItem>
                                                    <SelectItem value="enviado">Enviado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Date Range */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Desde la Fecha</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal",
                                                                !dateFrom && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {dateFrom ? format(dateFrom, "PPP", { locale: es }) : <span>Seleccionar</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={dateFrom}
                                                            onSelect={setDateFrom}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Hora*</Label>
                                                <Input type="time" defaultValue="00:00" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Hasta la Fecha</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal",
                                                                !dateTo && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {dateTo ? format(dateTo, "PPP", { locale: es }) : <span>Seleccionar</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={dateTo}
                                                            onSelect={setDateTo}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Hora*</Label>
                                                <Input type="time" defaultValue="23:59" />
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-8"
                                            onClick={() => setOpenFilter(false)}
                                        >
                                            Filtro
                                        </Button>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="mt-4 border rounded-lg overflow-hidden bg-white">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-gray-50">
                                <tr className="border-b">
                                    <th className="px-4 py-3 w-10">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={(v) => handleSelectAll(Boolean(v))}
                                        />
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Fecha</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Presupuesto</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Cliente</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Total</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Fecha de Expiración</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Estado</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedEstimates.length > 0 ? (
                                    paginatedEstimates.map((estimate) => (
                                        <tr key={estimate.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <Checkbox
                                                    checked={selectedEstimates.includes(estimate.id)}
                                                    onCheckedChange={(v) => handleSelectEstimate(estimate.id, Boolean(v))}
                                                />
                                            </td>
                                            <td className="px-4 py-3">{format(estimate.date, "dd MMM yyyy", { locale: es })}</td>
                                            <td className="px-4 py-3 text-blue-600 hover:underline cursor-pointer">
                                                {estimate.estimateNumber}
                                            </td>
                                            <td className="px-4 py-3">{estimate.client}</td>
                                            <td className="px-4 py-3">${estimate.total.toFixed(2)}</td>
                                            <td className="px-4 py-3">{format(estimate.expiryDate, "dd MMM yyyy", { locale: es })}</td>
                                            <td className="px-4 py-3">{renderStatus(estimate.status)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <EllipsisVertical className="h-5 w-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>Ver</DropdownMenuItem>
                                                        <DropdownMenuItem>Editar</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600">Eliminar</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-20">
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <img
                                                    src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                                                    alt="Sin datos"
                                                    className="h-32 mb-4 opacity-80"
                                                />
                                                <h3 className="text-lg font-semibold text-slate-700">
                                                    No se encontraron resultados
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-500 max-w-xs">
                                                    No pudimos encontrar ningún elemento que coincida con su búsqueda
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Paginación */}
                        <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 border-t">
                            <div className="flex items-center gap-2">
                                <span>Elementos por página</span>
                                <Select
                                    value={String(itemsPerPage)}
                                    onValueChange={(value) => setItemsPerPage(Number(value))}
                                >
                                    <SelectTrigger className="h-8 w-16">
                                        <SelectValue placeholder={String(itemsPerPage)} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-4">
                                <span>
                                    {filteredEstimates.length > 0
                                        ? `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
                                            currentPage * itemsPerPage,
                                            filteredEstimates.length
                                        )} de ${filteredEstimates.length}`
                                        : "0 of 0"}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                        disabled={currentPage >= totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div >
        </AppLayout >
    );
}
