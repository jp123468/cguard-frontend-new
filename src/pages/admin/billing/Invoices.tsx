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
} from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { es } from "date-fns/locale";

// Tipos para las facturas
type InvoiceStatus = "Borrador" | "Enviado" | "Pagado" | "Vencido" | "Parcial";

interface Invoice {
    id: string;
    date: Date;
    invoiceNumber: string;
    client: string;
    total: number;
    amountDue: number;
    dueDate: Date;
    status: InvoiceStatus;
}

export default function Invoices() {
    const [openFilter, setOpenFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Filtros
    const [dateFrom, setDateFrom] = useState<Date>();
    const [dateTo, setDateTo] = useState<Date>();

    // Estado principal SIN datos de prueba (para mostrar "No se encontraron resultados")
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    // Filtrado
    const filteredInvoices = useMemo(() => {
        if (!searchQuery) return invoices;
        const lowerQuery = searchQuery.toLowerCase();
        return invoices.filter(
            (inv) =>
                inv.client.toLowerCase().includes(lowerQuery) ||
                inv.invoiceNumber.toLowerCase().includes(lowerQuery)
        );
    }, [invoices, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));

    // Paginado
    const paginatedInvoices = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredInvoices, currentPage, itemsPerPage]);

    // Selección
    const handleSelectInvoice = (id: string, checked: boolean) => {
        setSelectedInvoices((prev) =>
            checked ? [...prev, id] : prev.filter((item) => item !== id)
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const ids = paginatedInvoices.map((inv) => inv.id);
            setSelectedInvoices((prev) => Array.from(new Set([...prev, ...ids])));
        } else {
            const ids = paginatedInvoices.map((inv) => inv.id);
            setSelectedInvoices((prev) => prev.filter((id) => !ids.includes(id)));
        }
    };

    const allSelected =
        paginatedInvoices.length > 0 &&
        paginatedInvoices.every((inv) => selectedInvoices.includes(inv.id));

    const renderStatus = (status: InvoiceStatus) => {
        const styles = {
            Borrador: "bg-gray-100 text-gray-800",
            Enviado: "bg-blue-100 text-blue-800",
            Pagado: "bg-green-100 text-green-800",
            Vencido: "bg-red-100 text-red-800",
            Parcial: "bg-orange-100 text-orange-800",
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
                    { label: "Facturas" },
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
                                    placeholder="Buscar en la lista de facturas"
                                    className="pl-9 w-80"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Button className="bg-orange-500 hover:bg-orange-600 text-white" asChild>
                                <Link to="/billing/invoices/new">Nueva Factura</Link>
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
                                                    <SelectItem value="pagado">Pagado</SelectItem>
                                                    <SelectItem value="vencido">Vencido</SelectItem>
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
                                    <th className="px-4 py-3 font-semibold text-gray-700">Factura</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Cliente</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Total</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Monto Adeudado</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Fecha de Vencimiento</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Estado</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedInvoices.length > 0 ? (
                                    paginatedInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <Checkbox
                                                    checked={selectedInvoices.includes(invoice.id)}
                                                    onCheckedChange={(v) => handleSelectInvoice(invoice.id, Boolean(v))}
                                                />
                                            </td>
                                            <td className="px-4 py-3">{format(invoice.date, "dd MMM yyyy", { locale: es })}</td>
                                            <td className="px-4 py-3 text-blue-600 hover:underline cursor-pointer">
                                                {invoice.invoiceNumber}
                                            </td>
                                            <td className="px-4 py-3">{invoice.client}</td>
                                            <td className="px-4 py-3">${invoice.total.toFixed(2)}</td>
                                            <td className="px-4 py-3">${invoice.amountDue.toFixed(2)}</td>
                                            <td className="px-4 py-3">{format(invoice.dueDate, "dd MMM yyyy", { locale: es })}</td>
                                            <td className="px-4 py-3">{renderStatus(invoice.status)}</td>
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
                                        <td colSpan={9} className="py-20">
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
                                    {filteredInvoices.length > 0
                                        ? `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
                                            currentPage * itemsPerPage,
                                            filteredInvoices.length
                                        )} de ${filteredInvoices.length}`
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
            </div>
        </AppLayout>
    );
}
