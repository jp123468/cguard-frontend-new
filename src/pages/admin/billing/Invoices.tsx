import { useState, useMemo, useEffect } from "react";
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
import InvoiceFilters from "@/components/filters/InvoiceFilters";
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
import { useNavigate } from 'react-router-dom';
import { es } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ApiService } from "@/services/api/apiService";
import { toast } from "sonner";
import { clientService } from "@/lib/api/clientService";
import { postSiteService } from "@/lib/api/postSiteService";

// Tipos para las facturas
type InvoiceStatus = "Borrador" | "Enviado" | "Pagado" | "Vencido" | "Parcial";

interface Invoice {
    id: string;
    date: Date;
    invoiceNumber: string;
    client: string;
    clientId?: string | number;
    total: number;
    amountDue: number;
    dueDate: Date;
    status: InvoiceStatus;
    raw?: any;
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
    const [clients, setClients] = useState<any[]>([]);
    const [clientFilter, setClientFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    // Estado principal SIN datos de prueba (para mostrar "No se encontraron resultados")
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [tenantInfo, setTenantInfo] = useState<{ name?: string; address?: string; phone?: string } | null>(null);
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [clientDetails, setClientDetails] = useState<any | null>(null);
    const [siteDetails, setSiteDetails] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [pendingBatchDeleteIds, setPendingBatchDeleteIds] = useState<string[] | null>(null);
    const [actionValue, setActionValue] = useState<string>('');

    useEffect(() => {
        if (!previewInvoice) {
            setClientDetails(null);
            setSiteDetails(null);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                // Determine client id or raw object
                const maybeClientId = typeof previewInvoice.client === 'string' ? previewInvoice.client : (previewInvoice as any).client?.id || (previewInvoice as any).clientId || null;
                if (maybeClientId) {
                    try {
                        const c = await clientService.getClient(maybeClientId);
                        if (mounted) setClientDetails(c);
                    } catch (e) {
                        // fallback: if previewInvoice.client is an object, use it
                        if ((previewInvoice as any).client && typeof (previewInvoice as any).client === 'object') {
                            if (mounted) setClientDetails((previewInvoice as any).client);
                        }
                    }
                } else if ((previewInvoice as any).client && typeof (previewInvoice as any).client === 'object') {
                    if (mounted) setClientDetails((previewInvoice as any).client);
                }

                // Determine postSite id from common fields
                const maybeSiteId = (previewInvoice as any).postSiteId || (previewInvoice as any).siteId || (previewInvoice as any).postSite || (previewInvoice as any).site || null;
                if (maybeSiteId) {
                    try {
                        const s = await postSiteService.get(maybeSiteId);
                        if (mounted) setSiteDetails(s);
                    } catch (e) {
                        if ((previewInvoice as any).rawSite) {
                            if (mounted) setSiteDetails((previewInvoice as any).rawSite);
                        }
                    }
                } else if ((previewInvoice as any).rawSite) {
                    if (mounted) setSiteDetails((previewInvoice as any).rawSite);
                }
            } catch (err) {
                // ignore
            }
        })();
        return () => { mounted = false };
    }, [previewInvoice]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!tenantId) return;
                const res = await ApiService.get(`/tenant/${tenantId}`);
                const raw = res && (res.data || res) || res;
                const t = raw?.tenant || raw || {};
                const name = (t?.name || t?.companyName || t?.businessName || t?.label || '');
                const phone = (t?.phone || t?.phoneNumber || t?.telephone || '');
                const addressParts: string[] = [];
                if (t?.address) {
                    if (typeof t.address === 'string') addressParts.push(t.address);
                    else {
                        if (t.address.street) addressParts.push(t.address.street);
                        if (t.address.city) addressParts.push(t.address.city);
                        if (t.address.state) addressParts.push(t.address.state);
                        if (t.address.postalCode) addressParts.push(t.address.postalCode);
                        if (t.address.country) addressParts.push(t.address.country);
                    }
                }
                if (t?.addressLine1) addressParts.push(t.addressLine1);
                if (t?.addressLine2) addressParts.push(t.addressLine2);
                const address = addressParts.join(', ') || t?.location || t?.fullAddress || '';
                if (!mounted) return;
                setTenantInfo({ name: name || undefined, phone: phone || undefined, address: address || undefined });
            } catch (err) {
                // ignore
            }
        })();
        return () => { mounted = false };
    }, []);

    // Load clients for filter when sheet opens
    useEffect(() => {
        let mounted = true;
        if (!openFilter) return;
        (async () => {
            try {
                const data = await clientService.getClients({}, { limit: 1000, offset: 0 });
                if (!mounted) return;
                setClients(data.rows || []);
            } catch (err) {
                console.debug('[Invoices] no se pudieron cargar clientes para filtro', err);
            }
        })();
        return () => { mounted = false; };
    }, [openFilter]);

    // Helper to parse dates stored as YYYY-MM-DD (avoid timezone shifts)
    const parseDateOnly = (value: any): Date | undefined => {
        if (!value) return undefined;
        if (typeof value === 'string') {
            const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
            const d = new Date(value);
            return isNaN(d.getTime()) ? undefined : d;
        }
        const d = new Date(value);
        return isNaN(d.getTime()) ? undefined : d;
    };

    // Load invoices list (exposed to refresh)
    const fetchInvoices = async () => {
        try {
            const tenantId = localStorage.getItem('tenantId') || '';
            if (!tenantId) return;
            const res = await ApiService.get(`/tenant/${tenantId}/invoice`);
            console.debug('[Invoices] raw response ->', res);
            const data = Array.isArray(res) ? res : res && res.rows ? res.rows : res && res.data && Array.isArray(res.data.rows) ? res.data.rows : [];
            console.debug('[Invoices] normalized data count ->', Array.isArray(data) ? data.length : 0);
            const mapped = (data || []).map((r: any) => {
                const id = r.id ?? r._id ?? String(r.id ?? Math.random()).slice(2, 10);
                const date = r.date ? parseDateOnly(r.date) ?? (r.createdAt ? parseDateOnly(r.createdAt) ?? new Date() : new Date()) : (r.createdAt ? parseDateOnly(r.createdAt) ?? new Date() : new Date());
                const dueDate = r.dueDate ? parseDateOnly(r.dueDate) ?? (r.due_date ? parseDateOnly(r.due_date) ?? date : date) : (r.due_date ? parseDateOnly(r.due_date) ?? date : date);
                const invoiceNumber = r.invoiceNumber ?? r.number ?? r.invoice_no ?? '';
                const clientName = (r.client && (r.client.companyName || r.client.name)) || r.clientName || (typeof r.client === 'string' ? r.client : '');
                const total = Number(r.total ?? r.amount ?? r.subtotal ?? 0);
                const amountDue = Number(r.amountDue ?? r.balance ?? (r.total ? r.total : 0));
                const status = (r.status && String(r.status)) || 'Borrador';
                return {
                    id,
                    date,
                    invoiceNumber,
                    client: clientName || '',
                    clientId: r.clientId ?? (r.client && (r.client.id || r.client._id)) ?? undefined,
                    total: isNaN(total) ? 0 : total,
                    amountDue: isNaN(amountDue) ? 0 : amountDue,
                    dueDate,
                    status: status as any,
                    raw: r,
                };
            });
            setInvoices(mapped);
        } catch (err) {
            console.error('Error cargando facturas', err);
            setError('Error cargando facturas. Revisa permisos o la sesión.');
        }
    };

    useEffect(() => { fetchInvoices(); }, []);
    const navigate = useNavigate();

    // Filtrado (incluye búsqueda, cliente, estado y rango de fechas con límites de día completos)
    const filteredInvoices = useMemo(() => {
        const lowerQuery = (searchQuery || "").toLowerCase();

        // Build date bounds if provided (use full-day bounds)
        let startBound: Date | undefined;
        let endBound: Date | undefined;
        if (dateFrom) {
            startBound = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate(), 0, 0, 0, 0);
        }
        if (dateTo) {
            endBound = new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999);
        }

        return invoices.filter((inv) => {
            // Search query (number or client name)
            if (lowerQuery) {
                const matches = (inv.client || "").toLowerCase().includes(lowerQuery) || (inv.invoiceNumber || "").toLowerCase().includes(lowerQuery);
                if (!matches) return false;
            }

            // Client filter by id
            if (clientFilter) {
                if (!inv.clientId || String(inv.clientId) !== String(clientFilter)) return false;
            }

            // Status filter
            if (statusFilter) {
                if (!inv.status || !inv.status.toString().toLowerCase().includes(statusFilter)) return false;
            }

            // Date range semantics like Estimates:
            // - If only `dateFrom` is set: include invoices with `date >= startBound`.
            // - If only `dateTo` is set: include invoices with `dueDate <= endBound`.
            // - If both are set: include invoices where `date >= startBound` AND `dueDate <= endBound`.
            if (startBound && !endBound) {
                const invTs = inv.date ? Date.UTC(inv.date.getFullYear(), inv.date.getMonth(), inv.date.getDate(), 0, 0, 0, 0) : NaN;
                const sTs = Date.UTC(startBound.getFullYear(), startBound.getMonth(), startBound.getDate(), 0, 0, 0, 0);
                if (isNaN(invTs) || invTs < sTs) return false;
            } else if (!startBound && endBound) {
                const due = inv.dueDate;
                const dueTs = due ? Date.UTC(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999) : NaN;
                const enTs = Date.UTC(endBound.getFullYear(), endBound.getMonth(), endBound.getDate(), 23, 59, 59, 999);
                if (isNaN(dueTs) || dueTs > enTs) return false;
            } else if (startBound && endBound) {
                const invTs = inv.date ? Date.UTC(inv.date.getFullYear(), inv.date.getMonth(), inv.date.getDate(), 0, 0, 0, 0) : NaN;
                const due = inv.dueDate;
                const dueTs = due ? Date.UTC(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999) : NaN;
                const sTs = Date.UTC(startBound.getFullYear(), startBound.getMonth(), startBound.getDate(), 0, 0, 0, 0);
                const enTs = Date.UTC(endBound.getFullYear(), endBound.getMonth(), endBound.getDate(), 23, 59, 59, 999);
                if (isNaN(invTs) || isNaN(dueTs)) return false;
                if (invTs < sTs) return false;
                if (dueTs > enTs) return false;
            }

            return true;
        });
    }, [invoices, searchQuery, clientFilter, statusFilter, dateFrom, dateTo]);

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
                {error ? (
                    <div className="mb-4 p-3 rounded bg-red-50 text-red-700 flex items-center justify-between">
                        <div>{error}</div>
                        <div>
                            <Button variant="outline" onClick={() => { setError(null); fetchInvoices(); }}>
                                Reintentar
                            </Button>
                        </div>
                    </div>
                ) : null}
                <section>
                    {/* Acciones superiores */}
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                                    <Select value={actionValue} onValueChange={(val) => {
                                        // If the user selects the batch-delete action, open confirmation
                                        if (val === 'eliminar') {
                                            if (!selectedInvoices || selectedInvoices.length === 0) {
                                                toast.error('No hay facturas seleccionadas');
                                                setActionValue('');
                                                return;
                                            }
                                            setPendingBatchDeleteIds(selectedInvoices);
                                            setIsDeleteDialogOpen(true);
                                            // Reset the combobox to show the placeholder again
                                            setActionValue('');
                                        } else {
                                            // For other values, set normally
                                            setActionValue(val);
                                        }
                                    }}>
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
                                <Link to="/invoices/new">Nueva Factura</Link>
                            </Button>

                            <InvoiceFilters
                                open={openFilter}
                                onOpenChange={setOpenFilter}
                                dateFrom={dateFrom}
                                setDateFrom={setDateFrom}
                                dateTo={dateTo}
                                setDateTo={setDateTo}
                                clients={clients}
                                clientValue={clientFilter}
                                setClientValue={setClientFilter}
                                statusValue={statusFilter}
                                setStatusValue={setStatusFilter}
                                applyLabel="Filtro"
                            />
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
                                            <td className="px-4 py-3">
                                                <a
                                                    href={`/invoices/${invoice.id}?preview=1`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        try {
                                                            navigate(`/invoices/${invoice.id}?preview=1`);
                                                        } catch (err) {
                                                            window.location.href = `${window.location.origin}/invoices/${invoice.id}?preview=1`;
                                                        }
                                                    }}
                                                    className="text-blue-600 hover:underline cursor-pointer"
                                                >
                                                    {invoice.invoiceNumber}
                                                </a>
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
                                                        <DropdownMenuItem onClick={() => {
                                                            try {
                                                                navigate(`/invoices/${invoice.id}?preview=1`);
                                                            } catch (e) {
                                                                window.location.href = `${window.location.origin}/invoices/${invoice.id}?preview=1`;
                                                            }
                                                        }}>Ver</DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link to={`/invoices/${invoice.id}`}>Editar</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600" onClick={() => { setPendingDeleteId(invoice.id); setIsDeleteDialogOpen(true); }}>Eliminar</DropdownMenuItem>
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

                        {/* Preview Dialog (Factura) */}
                        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Factura</DialogTitle>
                                </DialogHeader>
                                {previewInvoice ? (
                                    <div className="space-y-6">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div className="md:w-2/3 space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:justify-between gap-6">
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-400">Cliente</p>
                                                        <p className="font-semibold text-slate-800 text-lg">{(clientDetails && (clientDetails.companyName || clientDetails.name)) || previewInvoice.client || '—'}</p>
                                                        { (clientDetails?.address || clientDetails?.location || clientDetails?.postalCode) ? (
                                                            <p className="text-sm text-slate-500 mt-1">{clientDetails.address || clientDetails.location || clientDetails.postalCode}</p>
                                                        ) : null }
                                                        { (clientDetails?.phone || clientDetails?.phoneNumber || clientDetails?.telephone) ? (
                                                            <p className="text-sm text-slate-500">Tel: {clientDetails.phone || clientDetails.phoneNumber || clientDetails.telephone}</p>
                                                        ) : null }
                                                        { clientDetails?.email ? (
                                                            <p className="text-sm text-slate-500">{clientDetails.email}</p>
                                                        ) : null }
                                                    </div>

                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-400">Sitio</p>
                                                        <p className="font-medium text-slate-700">{(siteDetails && (siteDetails.companyName || siteDetails.name)) || '—'}</p>
                                                        { (siteDetails?.address || siteDetails?.location || siteDetails?.secondAddress) ? (
                                                            <p className="text-sm text-slate-500 mt-1">{siteDetails.address || siteDetails.location || siteDetails.secondAddress}</p>
                                                        ) : null }
                                                        { (siteDetails?.phone || siteDetails?.contactPhone || siteDetails?.contactPhoneNumber) ? (
                                                            <p className="text-sm text-slate-500">Tel: {siteDetails.phone || siteDetails.contactPhone || siteDetails.contactPhoneNumber}</p>
                                                        ) : null }
                                                        { (siteDetails?.email || siteDetails?.contactEmail || siteDetails?.contactEmailAddress) ? (
                                                            <p className="text-sm text-slate-500">{siteDetails.email || siteDetails.contactEmail || siteDetails.contactEmailAddress}</p>
                                                        ) : null }
                                                    </div>
                                                </div>

                                                {/* Items */}
                                                <div className="mt-2">
                                                    <h4 className="text-sm font-medium text-slate-700 mb-2">Detalle</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="text-left text-slate-600 text-xs border-b">
                                                                <tr>
                                                                    <th className="pb-2">Descripción</th>
                                                                    <th className="pb-2">Cantidad</th>
                                                                    <th className="pb-2">Precio Unit.</th>
                                                                    <th className="pb-2 text-right">Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(previewInvoice.raw?.items || previewInvoice.raw?.lineItems || (previewInvoice as any).items || []).length > 0 ? (
                                                                    (previewInvoice.raw?.items || previewInvoice.raw?.lineItems || (previewInvoice as any).items || []).map((it: any, idx: number) => (
                                                                        <tr key={idx} className="border-b last:border-b-0">
                                                                            <td className="py-2 align-top">{it.description || it.name || it.title || '—'}</td>
                                                                            <td className="py-2 align-top">{it.quantity ?? it.qty ?? 1}</td>
                                                                            <td className="py-2 align-top">${Number(it.unitPrice ?? it.price ?? it.rate ?? 0).toFixed(2)}</td>
                                                                            <td className="py-2 align-top text-right">${Number(it.total ?? (it.quantity ? (it.quantity * (it.unitPrice ?? it.price ?? it.rate ?? 0)) : (it.unitPrice ?? it.price ?? it.rate ?? 0))).toFixed(2)}</td>
                                                                        </tr>
                                                                    ))
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan={4} className="py-6 text-center text-sm text-slate-500">Sin líneas de detalle</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:w-1/3 bg-gray-50 p-4 rounded-md">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h2 className="text-xl font-bold text-slate-800">Factura</h2>
                                                        <p className="text-sm text-slate-600">{tenantInfo?.name ?? ''}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-slate-600">{tenantInfo?.address ?? ''}</div>
                                                        <div className="text-sm text-slate-600">{tenantInfo?.phone ?? ''}</div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-700">Número</span>
                                                        <span className="text-slate-600">{previewInvoice.invoiceNumber || '—'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-700">Fecha</span>
                                                        <span className="text-slate-600">{format(previewInvoice.date, "MMM dd, yyyy", { locale: es })}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-700">Vencimiento</span>
                                                        <span className="text-slate-600">{format(previewInvoice.dueDate, "MMM dd, yyyy", { locale: es })}</span>
                                                    </div>

                                                    <div className="border-t pt-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-700">Subtotal</span>
                                                            <span className="text-slate-600">${Number(previewInvoice.raw?.subtotal ?? previewInvoice.total ?? 0).toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-700">Impuestos</span>
                                                            <span className="text-slate-600">${Number(previewInvoice.raw?.tax ?? previewInvoice.raw?.taxAmount ?? 0).toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between font-semibold mt-2">
                                                            <span className="text-slate-800">Total</span>
                                                            <span className="text-slate-800">${Number(previewInvoice.total ?? previewInvoice.raw?.total ?? 0).toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center mt-2">
                                                            <span className="text-slate-700">Estado</span>
                                                            <span>{renderStatus(previewInvoice.status)}</span>
                                                        </div>
                                                        <div className="flex justify-between mt-2">
                                                            <span className="text-slate-700">Monto adeudado</span>
                                                            <span className="text-slate-700">${Number(previewInvoice.amountDue ?? previewInvoice.raw?.balance ?? 0).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                                <DialogFooter>
                                    <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Delete confirmation dialog */}
                        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { setIsDeleteDialogOpen(open); if (!open) { setPendingDeleteId(null); setPendingBatchDeleteIds(null); } }}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Confirmar eliminación</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    <p>¿Estás seguro que deseas eliminar esta factura? Esta acción no se puede deshacer.</p>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setPendingDeleteId(null); }}>Cancelar</Button>
                                    <Button className="bg-red-600 text-white" onClick={async () => {
                                        try {
                                            const tenantId = localStorage.getItem('tenantId') || '';
                                            if (!tenantId) { toast.error('Tenant no configurado'); return; }
                                            setDeleting(true);
                                            if (pendingBatchDeleteIds && pendingBatchDeleteIds.length > 0) {
                                                // delete all selected
                                                await Promise.all(pendingBatchDeleteIds.map(id => ApiService.delete(`/tenant/${tenantId}/invoice/${id}`)));
                                                setInvoices(prev => prev.filter(inv => !pendingBatchDeleteIds.includes(inv.id)));
                                                toast.success('Facturas eliminadas');
                                            } else if (pendingDeleteId) {
                                                await ApiService.delete(`/tenant/${tenantId}/invoice/${pendingDeleteId}`);
                                                setInvoices(prev => prev.filter(inv => inv.id !== pendingDeleteId));
                                                toast.success('Factura eliminada');
                                            }
                                            setPendingDeleteId(null);
                                            setPendingBatchDeleteIds(null);
                                            setIsDeleteDialogOpen(false);
                                            setSelectedInvoices([]);
                                            await fetchInvoices();
                                        } catch (err) {
                                            console.error('Error eliminando factura(s)', err);
                                            toast.error('No se pudo eliminar la(s) factura(s)');
                                        } finally {
                                            setDeleting(false);
                                        }
                                    }} disabled={deleting}>{deleting ? 'Eliminando...' : 'Eliminar'}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

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
