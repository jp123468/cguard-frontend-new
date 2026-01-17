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
    SheetFooter,
    SheetClose,
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
    X
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { es } from "date-fns/locale";
import { clientService } from "@/lib/api/clientService";
import { ApiService } from "@/services/api/apiService";
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

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
    clientId?: string;
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
    // Clientes para el filtro
    const [clients, setClients] = useState<any[]>([]);
    const [clientFilter, setClientFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

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

    // Filtrado
    const filteredEstimates = useMemo(() => {
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

        return estimates.filter((e) => {
            // Search query (number or client name)
            if (lowerQuery) {
                const matches = (e.client || "").toLowerCase().includes(lowerQuery) || (e.estimateNumber || "").toLowerCase().includes(lowerQuery);
                if (!matches) return false;
            }

            // Client filter by id
            if (clientFilter) {
                if (!e.clientId || String(e.clientId) !== String(clientFilter)) return false;
            }

            // Status filter
            if (statusFilter) {
                if (!e.status || !e.status.toString().toLowerCase().includes(statusFilter)) return false;
            }

            // Date range semantics:
            // - If only `dateFrom` is set: include estimates with `date >= startBound`.
            // - If only `dateTo` is set: include estimates with `expiryDate <= endBound` (if expiryDate exists).
            // - If both are set: include estimates where `date >= startBound` AND `expiryDate <= endBound`.
            if (startBound && !endBound) {
                const eDateTs = e.date ? Date.UTC(e.date.getFullYear(), e.date.getMonth(), e.date.getDate(), 0, 0, 0, 0) : NaN;
                const sTs = Date.UTC(startBound.getFullYear(), startBound.getMonth(), startBound.getDate(), 0, 0, 0, 0);
                if (isNaN(eDateTs) || eDateTs < sTs) return false;
            } else if (!startBound && endBound) {
                const ex = e.expiryDate;
                const exTs = ex ? Date.UTC(ex.getFullYear(), ex.getMonth(), ex.getDate(), 23, 59, 59, 999) : NaN;
                const enTs = Date.UTC(endBound.getFullYear(), endBound.getMonth(), endBound.getDate(), 23, 59, 59, 999);
                if (isNaN(exTs) || exTs > enTs) return false;
            } else if (startBound && endBound) {
                const eDateTs = e.date ? Date.UTC(e.date.getFullYear(), e.date.getMonth(), e.date.getDate(), 0, 0, 0, 0) : NaN;
                const ex = e.expiryDate;
                const exTs = ex ? Date.UTC(ex.getFullYear(), ex.getMonth(), ex.getDate(), 23, 59, 59, 999) : NaN;
                const sTs = Date.UTC(startBound.getFullYear(), startBound.getMonth(), startBound.getDate(), 0, 0, 0, 0);
                const enTs = Date.UTC(endBound.getFullYear(), endBound.getMonth(), endBound.getDate(), 23, 59, 59, 999);
                if (isNaN(eDateTs) || isNaN(exTs)) return false;
                if (eDateTs < sTs) return false;
                if (exTs > enTs) return false;
            }

            return true;
        });
    }, [estimates, searchQuery, clientFilter, statusFilter, dateFrom, dateTo]);

    // Cargar clientes cuando se abre el panel de filtros
    useEffect(() => {
        let mounted = true;
        if (!openFilter) return;

        (async () => {
            try {
                const data = await clientService.getClients({}, { limit: 1000, offset: 0 });
                if (!mounted) return;
                setClients(data.rows || []);
            } catch (err) {
                console.error("Error cargando clientes para filtro:", err);
            }
        })();
        return () => { mounted = false; };
    }, [openFilter]);

    // Load estimates from backend
    useEffect(() => {
        let mounted = true;
        const parseStatus = (raw: any): EstimateStatus => {
            try {
                // expiry override
                const expiry = raw?.expiryDate || raw?.expiry || raw?.expiresAt || raw?.expiry_date;
                if (expiry) {
                    const ex = new Date(expiry);
                    if (!isNaN(ex.getTime()) && ex < new Date()) return 'Expirado';
                }

                // explicit flags
                if (raw?.acceptedAt || raw?.accepted_at || raw?.accepted) return 'Aceptado';
                if (raw?.rejectedAt || raw?.rejected_at || raw?.rejected) return 'Rechazado';
                if (raw?.sentAt || raw?.sent_at || raw?.sent) return 'Enviado';

                const candidate = (raw?.status || raw?.state || raw?.statusName || raw?.status_label || '').toString().toLowerCase();
                if (!candidate) return 'Borrador';
                if (candidate.includes('draft') || candidate.includes('borrador')) return 'Borrador';
                if (candidate.includes('sent') || candidate.includes('enviado')) return 'Enviado';
                if (candidate.includes('accept') || candidate.includes('acept')) return 'Aceptado';
                if (candidate.includes('reject') || candidate.includes('rechaz')) return 'Rechazado';
                if (candidate.includes('expir') || candidate.includes('expired')) return 'Expirado';
                return 'Borrador';
            } catch (e) {
                return 'Borrador';
            }
        };
        (async () => {
            try {
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!tenantId) {
                    if (mounted) setEstimates([]);
                    return;
                }
                const res = await ApiService.get(`/tenant/${tenantId}/estimate`);
                const data = Array.isArray(res)
                    ? res
                    : res && res.rows
                        ? res.rows
                        : res && res.data && Array.isArray(res.data.rows)
                            ? res.data.rows
                            : res && res.data && Array.isArray(res.data)
                                ? res.data
                                : [];
                if (!mounted) return;
                const mapped = (data || []).map((e: any) => ({
                    id: e.id ?? e._id ?? String(e.id ?? Math.random()),
                    date: e.date ? parseDateOnly(e.date) : (e.createdAt ? parseDateOnly(e.createdAt) : new Date()),
                    estimateNumber: e.estimateNumber ?? e.number ?? (e.id ?? ''),
                    client: (e.client && (e.client.name || e.client.companyName)) || e.clientId || (e.client || ''),
                    clientId: e.clientId ?? (e.client && (e.client.id || e.client._id)) ?? undefined,
                    rawClient: e.client ?? null,
                    rawSite: e.postSite ?? e.site ?? e.postSiteRaw ?? null,
                    total: Number(e.total ?? e.amount ?? 0),
                    expiryDate: e.expiryDate ? parseDateOnly(e.expiryDate) : (e.expiresAt ? parseDateOnly(e.expiresAt) : undefined),
                    status: parseStatus(e),
                }));
                setEstimates(mapped);
            } catch (err) {
                console.error('Error cargando estimaciones', err);
                toast.error('Error cargando estimaciones');
                setEstimates([]);
            }
        })();
        return () => { mounted = false; };
    }, []);

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

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectKey, setSelectKey] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewEstimate, setPreviewEstimate] = useState<any | null>(null);
    const [previewAsInvoice, setPreviewAsInvoice] = useState(false);
    const navigate = useNavigate();
    const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
    const [convertConfirmOpen, setConvertConfirmOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const handleSendPreview = () => {
        if (!previewEstimate?.id) {
            toast.error('Estimación no válida');
            return;
        }
        setSendConfirmOpen(true);
    };

    const performSendEstimate = async () => {
        setActionLoading(true);
        try {
            const id = previewEstimate?.id;
            const tenantId = localStorage.getItem('tenantId') || '';
            if (!id || !tenantId) throw new Error('Faltan parámetros');
            await ApiService.post(`/tenant/${tenantId}/estimate/${id}/send`);
            toast.success('Estimación enviada');
            // Update local UI state: mark preview and list item as Enviado
            setPreviewEstimate((prev: any) => prev ? ({ ...prev, status: 'Enviado', sentAt: new Date().toISOString(), sent: true }) : prev);
            setEstimates((prev) => prev.map((e) => e.id === id ? ({ ...e, status: 'Enviado' }) : e));
            setSendConfirmOpen(false);
            setPreviewOpen(false);
        } catch (err) {
            console.error('Error enviando estimación', err);
            toast.error('Error enviando estimación');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConvertPreview = () => {
        if (!previewEstimate?.id) {
            toast.error('Estimación no válida');
            return;
        }
        setConvertConfirmOpen(true);
    };

    // Reset preview-as-invoice flag when preview changes or closes
    useEffect(() => {
        if (!previewOpen) {
            setPreviewAsInvoice(false);
        }
    }, [previewOpen]);

    const performConvertEstimate = async () => {
        setActionLoading(true);
        try {
            const id = previewEstimate?.id;
            const tenantId = localStorage.getItem('tenantId') || '';
            if (!id || !tenantId) throw new Error('Faltan parámetros');
            // update preview UI to show invoice title immediately
            setPreviewAsInvoice(true);
            await ApiService.post(`/tenant/${tenantId}/estimate/${id}/convert`);
            toast.success('Estimación convertida a factura');
            setConvertConfirmOpen(false);
            setPreviewOpen(false);
        } catch (err) {
            console.error('Error convirtiendo estimación', err);
            toast.error('Error convirtiendo estimación');
            setPreviewAsInvoice(false);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadPreview = () => {
        (async () => {
            try {
                const id = previewEstimate?.id;
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!id || !tenantId) {
                    toast.error('No se puede descargar esta estimación');
                    return;
                }

                const blob = await ApiService.getBlob(`/tenant/${tenantId}/estimate/${id}/download?format=pdf`);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `estimate-${previewEstimate.estimateNumber || id}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } catch (err: any) {
                console.error('Error descargando estimación', err);
                const msg = err?.message || 'Error descargando estimación';
                toast.error(msg);
            }
        })();
    };
    const handleConfirmDelete = async () => {
        try {
            const tenantId = localStorage.getItem('tenantId') || '';
            if (deletingId) {
                await ApiService.delete(`/tenant/${tenantId}/estimate/${deletingId}`);
                setEstimates((prev) => prev.filter((e) => e.id !== deletingId));
                toast.success('Estimación eliminada');
                setDeletingId(null);
            } else if (selectedEstimates.length > 0) {
                // Bulk delete
                await Promise.all(
                    selectedEstimates.map((id) => ApiService.delete(`/tenant/${tenantId}/estimate/${id}`))
                );
                setEstimates((prev) => prev.filter((e) => !selectedEstimates.includes(e.id)));
                toast.success(`${selectedEstimates.length} estimación(es) eliminada(s)`);
                setSelectedEstimates([]);
            }
            setDeleteModalOpen(false);
            setSelectKey((s) => s + 1);
        } catch (err) {
            console.error('Error eliminando estimación(es)', err);
            toast.error('Error eliminando estimación(es)');
        }
    };
    const handleTopAction = (value: string) => {
        // bump a key so the uncontrolled Select remounts and clears selection
        setSelectKey((s) => s + 1);
        if (value === 'eliminar') {
            if (selectedEstimates.length === 0) {
                toast.error('Seleccione al menos una estimación para eliminar');
                return;
            }
            setDeletingId(null);
            setDeleteModalOpen(true);
        }
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
                            <Select key={selectKey} onValueChange={handleTopAction}>
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
                            {/* Use shared InvoiceFilters component */}
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
                                applyLabel="Aplicar filtros"
                            />
                        </div>
                    </div>

                    {/* Confirm delete dialog */}
                    <Dialog open={deleteModalOpen} onOpenChange={(v) => { if (!v) { setDeletingId(null); } setDeleteModalOpen(v); }}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Eliminar estimación</DialogTitle>
                                <DialogDescription>
                                    {deletingId
                                        ? '¿Estás seguro de que deseas eliminar esta estimación? Esta acción no se puede deshacer.'
                                        : `¿Estás seguro de que deseas eliminar las ${selectedEstimates.length} estimación(es) seleccionada(s)? Esta acción no se puede deshacer.`}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
                                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmDelete}>Eliminar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Preview dialog for client/site details */}
                    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                        <DialogContent className="sm:max-w-3xl">
                            {previewEstimate ? (
                                <>
                                        <div className="border-b pb-4 mb-4 flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-semibold">{previewAsInvoice ? 'Factura' : 'Presupuesto'} #{previewEstimate.estimateNumber || previewEstimate.id}</h3>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Button variant="outline" className="bg-white" onClick={handleSendPreview}>Enviar</Button>
                                                <Button variant="outline" className="bg-white" onClick={handleConvertPreview}>Convertir a Factura</Button>
                                                <Button variant="outline" className="bg-white" onClick={handleDownloadPreview}>Descargar</Button>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-sm text-slate-500">Total General:</p>
                                            <p className="text-xl font-semibold">${(Number(previewEstimate.total) || 0).toFixed(2)}</p>
                                            <div className="mt-2 flex justify-end">{renderStatus(previewEstimate.status)}</div>
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {(() => {
                                                const c = previewEstimate.rawClient;
                                                const s = previewEstimate.rawSite;
                                                const clientName = c?.name || c?.companyName || c?.fullName || previewEstimate.client || '—';
                                                const siteName = s?.name || s?.label || '—';
                                                const postRaw = s;
                                                const postAddrParts: string[] = [];
                                                if (postRaw) {
                                                    if (postRaw.address) {
                                                        if (typeof postRaw.address === 'string') postAddrParts.push(postRaw.address);
                                                        else {
                                                            if (postRaw.address.street) postAddrParts.push(postRaw.address.street);
                                                            if (postRaw.address.city) postAddrParts.push(postRaw.address.city);
                                                            if (postRaw.address.state) postAddrParts.push(postRaw.address.state);
                                                            if (postRaw.address.postalCode) postAddrParts.push(postRaw.address.postalCode);
                                                        }
                                                    }
                                                    if (postRaw.location) postAddrParts.push(postRaw.location);
                                                    if (postRaw.addressLine1) postAddrParts.push(postRaw.addressLine1);
                                                }
                                                const postAddress = postAddrParts.filter(Boolean).join(', ');
                                                const postPhone = (postRaw && (postRaw.phone || postRaw.phoneNumber || postRaw.telephone)) || '';
                                                const postEmail = (postRaw && (postRaw.email || postRaw.contactEmail || postRaw.primaryEmail)) || '';

                                                return (
                                                    <>
                                                        <div className="bg-white p-4 rounded border">
                                                            <p className="text-xs text-gray-400">Cliente</p>
                                                            <p className="font-semibold text-slate-800">{clientName}</p>
                                                            {c?.address || c?.phone || c?.email ? (
                                                                <div className="mt-3 text-sm text-slate-600">
                                                                    {c?.address ? <p>{c.address}</p> : null}
                                                                    {c?.phone ? <p>Tel: {c.phone}</p> : null}
                                                                    {c?.email ? <p>{c.email}</p> : null}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        <div className="bg-white p-4 rounded border">
                                                            <p className="text-xs text-gray-400">Sitio</p>
                                                            <p className="font-medium text-slate-700">{siteName}</p>
                                                            {postAddress ? <p className="text-sm text-slate-500 mt-1">{postAddress}</p> : null}
                                                            {postPhone ? <p className="text-sm text-slate-500">Tel: {postPhone}</p> : null}
                                                            {postEmail ? <p className="text-sm text-slate-500">{postEmail}</p> : null}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-4">No hay datos disponibles</div>
                            )}

                            <DialogFooter className="mt-4">
                                <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Send confirmation dialog */}
                    <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Confirmar envío</DialogTitle>
                                <DialogDescription>
                                    ¿Deseas enviar por correo esta estimación?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSendConfirmOpen(false)} disabled={actionLoading}>Cancelar</Button>
                                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={performSendEstimate} disabled={actionLoading}>{actionLoading ? 'Enviando...' : 'Enviar'}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Convert confirmation dialog */}
                    <Dialog open={convertConfirmOpen} onOpenChange={setConvertConfirmOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Confirmar conversión</DialogTitle>
                                <DialogDescription>
                                    ¿Deseas convertir esta estimación a factura? Esta acción puede ser irreversible.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setConvertConfirmOpen(false)} disabled={actionLoading}>Cancelar</Button>
                                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={performConvertEstimate} disabled={actionLoading}>{actionLoading ? 'Convirtiendo...' : 'Convertir'}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

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
                                            <td className="px-4 py-3">{estimate.estimateNumber}</td>
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
                                                        <DropdownMenuItem asChild>
                                                            <button
                                                                className="w-full text-left"
                                                                onClick={() => {
                                                                    // Navigate to the edit page but in preview mode
                                                                    navigate(`/estimates/${estimate.id}?preview=1`);
                                                                }}
                                                            >
                                                                Ver
                                                            </button>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link to={`/estimates/${estimate.id}`}>Editar</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <button
                                                                className="w-full text-left text-red-600"
                                                                onClick={() => {
                                                                    setDeletingId(estimate.id);
                                                                    setDeleteModalOpen(true);
                                                                }}
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </DropdownMenuItem>
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
