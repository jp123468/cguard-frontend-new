import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/app/combobox";
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Plus, Trash2, X } from "lucide-react";
import { ApiService } from "@/services/api/apiService";
import { clientService } from "@/lib/api/clientService";
import { postSiteService } from "@/lib/api/postSiteService";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";


interface InvoiceItem {
    id: string;
    name: string;
    quantity: number;
    rate: number;
    tax: number;
    serviceId?: string;
    reset?: number;
}

interface TaxOption {
    id: string;
    name: string;
    rate: number;
}

interface ClientOption {
    id: string;
    name: string;
    raw?: any;
}

interface PostSiteOption {
    id: string;
    name: string;
    clientId?: string;
    raw?: any;
}

export default function NewInvoice() {
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const navigate = useNavigate();

    // Form State
    const [title, setTitle] = useState("Invoice");
    const [summary, setSummary] = useState("");
    const [client, setClient] = useState("");
    const [site, setSite] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [poSoNumber, setPoSoNumber] = useState("");
    const [notes, setNotes] = useState("");

    const [date, setDate] = useState<Date | undefined>(new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(new Date());

    const [items, setItems] = useState<InvoiceItem[]>([
        { id: "1", name: "", quantity: 1, rate: 0, tax: 0, reset: 0 },
    ]);

    const [taxes, setTaxes] = useState<TaxOption[]>([]);
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [postSites, setPostSites] = useState<PostSiteOption[]>([]);
    // Services for items (to allow selecting existing or creating new)
    const [services, setServices] = useState<Array<{ id: string; name: string; price: number; taxId?: string; taxName?: string; taxRate?: number }>>([]);

    // Create-new-service modal state
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForItemId, setCreateForItemId] = useState<string | null>(null);
    const [newServiceTitle, setNewServiceTitle] = useState('');
    const [newServicePrice, setNewServicePrice] = useState<number | string>(0);
    const [newServiceTaxId, setNewServiceTaxId] = useState<string | null>(null);
    const [creatingService, setCreatingService] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const tenantId = localStorage.getItem("tenantId") || "";
                if (!tenantId) return;
                const res = await ApiService.get(`/tenant/${tenantId}/tax`);
                const data = Array.isArray(res)
                    ? res
                    : res && res.rows
                    ? res.rows
                    : res && res.data && Array.isArray(res.data.rows)
                    ? res.data.rows
                    : [];
                if (!mounted) return;
                const mapped: TaxOption[] = data.map((r: any) => ({ id: r.id ?? r._id ?? String(r.id), name: r.name ?? "", rate: Number(r.rate ?? 0) }));
                setTaxes(mapped);
            } catch (err) {
                console.error('Error cargando impuestos', err);
            }
        })();
        return () => { mounted = false };
    }, []);

    // Cargar servicios/items para usar en los artículos
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!tenantId) return;
                const res = await ApiService.get(`/tenant/${tenantId}/service`);
                const data = Array.isArray(res)
                    ? res
                    : res && res.rows
                        ? res.rows
                        : res && res.data && Array.isArray(res.data.rows)
                            ? res.data.rows
                            : [];
                if (!mounted) return;
                const mapped = (data || []).map((s: any) => ({
                    id: s.id ?? s._id ?? String(s.id),
                    name: s.title ?? s.name ?? s.title ?? s.name ?? s.label ?? '',
                    price: Number(s.price ?? s.amount ?? 0),
                    taxId: s.taxId ?? s.tax?.id ?? undefined,
                    taxName: s.taxName ?? s.tax?.name ?? undefined,
                    taxRate: Number(s.taxRate ?? s.tax?.rate ?? 0),
                }));
                setServices(mapped);
            } catch (err) {
                console.error('Error cargando servicios para artículos', err);
            }
        })();
        return () => { mounted = false };
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await clientService.getClients(undefined, { limit: 9999, offset: 0 });
                if (!mounted) return;
                const mapped = (data.rows || []).map((c: any) => ({
                    id: c.id,
                    name: c.companyName ?? (c.name && c.lastName ? `${c.name} ${c.lastName}` : c.name ?? c.lastName ?? ""),
                    raw: c,
                }));
                setClients(mapped);
            } catch (err) {
                console.error('Error cargando clientes', err);
            }
        })();
        return () => { mounted = false };
    }, []);

    const loadPostSitesForClient = async (clientId: string) => {
        try {
            if (!clientId || clientId === "none") {
                setPostSites([]);
                return;
            }
            const res = await postSiteService.list({ clientId }, { limit: 9999, offset: 0 });
            const mapped = (res.rows || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                clientId: s.client?.id ?? s.clientAccount?.id ?? s.clientId ?? s.clientAccountId ?? undefined,
                raw: s,
            }));
            // Ensure only sites matching the requested client are stored (defensive)
            setPostSites(mapped.filter((ps: any) => !ps.clientId || ps.clientId === clientId ? true : ps.clientId === clientId));
        } catch (err) {
            console.error('Error cargando sitios de publicación', err);
            setPostSites([]);
        }
    };

    const addItem = () => {
        setItems([
            ...items,
            { id: Math.random().toString(36).substr(2, 9), name: "", quantity: 1, rate: 0, tax: 0, reset: 0 },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const handleSelectService = (itemId: string, selectedValue: string) => {
        if (selectedValue === '__create__') {
            setCreateForItemId(itemId);
            setCreateModalOpen(true);
            return;
        }
        const svc = services.find((s) => s.id === selectedValue);
        if (svc) {
            setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, serviceId: svc.id, name: svc.name, rate: svc.price, tax: (svc.taxRate != null ? svc.taxRate : 0) } : it));
        } else {
            setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, serviceId: undefined, name: selectedValue } : it));
        }
    };

    const createService = async () => {
        if (!createForItemId) return;
        setCreatingService(true);
        try {
            const tenantId = localStorage.getItem('tenantId') || '';
            if (!tenantId) {
                toast.error('El tenant no está configurado.');
                setCreatingService(false);
                return;
            }
            const payload: any = {
                title: newServiceTitle,
                price: Number(newServicePrice) || 0,
            };
            if (newServiceTaxId) {
                const taxObj = taxes.find((t) => String(t.id) === String(newServiceTaxId));
                if (taxObj) {
                    payload.taxId = taxObj.id;
                    payload.taxName = taxObj.name;
                    payload.taxRate = String(taxObj.rate ?? 0);
                }
            }
            const res = await ApiService.post(`/tenant/${tenantId}/service`, { data: payload });
            const created = res && (res.data || res);
            const svc = {
                id: created && (created.id || created._id) ? (created.id || created._id) : String(Math.random()).slice(2, 10),
                name: created && (created.title || created.name) ? (created.title || created.name) : newServiceTitle,
                price: Number(((created && (created.price ?? created.amount)) ?? payload.price)),
                taxId: created && (created.taxId || (created.tax && (created.tax.id || created.tax._id))) ? (created.taxId || (created.tax && (created.tax.id || created.tax._id))) : (payload.taxId ?? undefined),
                taxName: created && (created.taxName || (created.tax && created.tax.name)) ? (created.taxName || (created.tax && created.tax.name)) : (payload.taxName ?? undefined),
                taxRate: Number(((created && (created.taxRate || (created.tax && created.tax.rate))) ?? payload.taxRate) ?? 0),
            };
            setServices((prev) => [svc, ...prev]);
            // select into the row (also set tax)
            setItems((prev) => prev.map((it) => it.id === createForItemId ? { ...it, serviceId: svc.id, name: svc.name, rate: svc.price, tax: (svc.taxRate != null ? svc.taxRate : 0), reset: it.reset ?? 0 } : it));
            toast.success('Artículo creado');
            setCreateModalOpen(false);
            setCreateForItemId(null);
            setNewServiceTitle('');
            setNewServicePrice(0);
            setNewServiceTaxId(null);
        } catch (err: any) {
            console.error('Error creando servicio', err);
            const backendMessage = (err && err.data && (err.data.message || err.data.error)) || err?.message || 'Error creando servicio';
            toast.error(String(backendMessage));
        } finally {
            setCreatingService(false);
        }
    };

    const calculateSubtotal = () => {
        return items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => {
            const line = item.quantity * item.rate;
            const taxAmount = item.tax ? (line * (item.tax / 100)) : 0;
            return acc + line + taxAmount;
        }, 0);
    };

    const calculateTaxTotal = () => {
        const subtotal = calculateSubtotal();
        const total = calculateTotal();
        return total - subtotal;
    };

    const handlePreview = () => {
        if (!client || !site) {
            toast.error("Por favor seleccione un Cliente y un Sitio de publicación para ver la vista previa.");
            return;
        }
        setIsPreviewMode(true);
    };

    const buildPayload = () => {
        return {
            clientId: client,
            postSiteId: site,
            title,
            summary,
            invoiceNumber,
            poSoNumber,
            date: date ? date.toISOString() : null,
            dueDate: dueDate ? dueDate.toISOString() : null,
            items: items.map((it) => {
                const line = it.quantity * it.rate;
                const taxAmount = it.tax ? (line * (it.tax / 100)) : 0;
                const taxOption = taxes.find((t) => Number(t.rate) === Number(it.tax));
                return {
                    id: it.id,
                    name: it.name,
                    quantity: it.quantity,
                    rate: it.rate,
                    taxRate: it.tax,
                    taxName: taxOption ? taxOption.name : undefined,
                    line: line,
                    taxAmount: taxAmount,
                    lineTotal: line + taxAmount,
                };
            }),
            notes,
            subtotal: calculateSubtotal(),
            total: calculateTotal(),
        };
    };

    const handleSaveLog = () => {
        const payload = buildPayload();
        (async () => {
            try {
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!tenantId) {
                    toast.error('Tenant no disponible.');
                    return;
                }
                // Post to backend
                const res = await ApiService.post(`/tenant/${tenantId}/invoice`, { data: payload });
                // eslint-disable-next-line no-console
                console.log('[NewInvoice] saved ->', res);
                toast.success('Factura guardada correctamente');
                try {
                    navigate('/invoices');
                } catch (e) {
                    window.location.href = '/invoices';
                }
            } catch (err: any) {
                console.error('Error saving invoice', err);
                toast.error(err?.message || 'Error guardando factura');
            }
        })();
    };

    if (isPreviewMode) {
        return (
            <AppLayout>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-xl font-semibold">Facturas</h1>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="text-orange-500 border-orange-200 hover:bg-orange-50"
                                onClick={() => setIsPreviewMode(false)}
                            >
                                Editar Factura
                            </Button>
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveLog}>
                                Guardar y continuar
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-lg border shadow-sm space-y-8">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                {/* left can hold logo if needed */}
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-slate-800">Factura</h2>
                                <h3 className="font-semibold text-lg text-slate-700 mt-2">Seguridad BAS</h3>
                                <p className="text-sm text-slate-500">Antonio Miguel de solier N29-26 y bartolome de las casas</p>
                                <p className="text-sm text-slate-500">+18014004269</p>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="font-bold text-lg mb-4">{title}</h3>
                            {summary && <p className="text-gray-600 mb-4">{summary}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-12">
                            <div>
                                <h3 className="text-lg font-medium text-slate-700 mb-4">Facturar a</h3>
                                <div className="space-y-1">
                                    {(() => {
                                        const selectedClient = clients.find(c => c.id === client);
                                        const selectedSite = postSites.find(s => s.id === site);
                                        const clientName = selectedClient?.name ?? (selectedClient && (selectedClient as any).raw && ((selectedClient as any).raw.companyName || (selectedClient as any).raw.name)) ?? client;

                                        // build postSite address/phone/email from raw fields when available
                                        const postRaw = (selectedSite && (selectedSite as any).raw) || null;
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
                                            if (postRaw.secondAddress) postAddrParts.push(postRaw.secondAddress);
                                        }
                                        const postAddress = postAddrParts.filter(Boolean).join(', ');
                                        const postPhone = postRaw && (postRaw.phone || postRaw.phoneNumber || postRaw.telephone || postRaw.contactPhone || postRaw.contactPhoneNumber) || '';
                                        const postEmail = postRaw && (postRaw.email || postRaw.contactEmail || postRaw.primaryEmail || postRaw.contactEmailAddress) || '';

                                        return (
                                            <>
                                                <p className="font-semibold text-slate-800">{clientName}</p>
                                                {postAddress ? <p className="text-sm text-slate-500">{postAddress}</p> : null}
                                                {postPhone ? <p className="text-sm text-slate-500">Tel: {postPhone}</p> : null}
                                                {postEmail ? <p className="text-sm text-slate-500">{postEmail}</p> : null}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-700">Número de Factura</span>
                                    <span className="text-slate-600">{invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-700">Número PO/SO</span>
                                    <span className="text-slate-600">{poSoNumber || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-700">Fecha de la Factura</span>
                                    <span className="text-slate-600">{date ? format(date, "MMM dd, yyyy", { locale: es }) : "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-700">Pago debido</span>
                                    <span className="text-slate-600">{dueDate ? format(dueDate, "MMM dd, yyyy", { locale: es }) : "-"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="mt-8 border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[40%] font-bold text-slate-700">Artículo</TableHead>
                                        <TableHead className="w-[15%] font-bold text-slate-700">Cantidad</TableHead>
                                        <TableHead className="w-[15%] font-bold text-slate-700">Tasa</TableHead>
                                        <TableHead className="w-[15%] font-bold text-slate-700">Impuesto</TableHead>
                                        <TableHead className="w-[15%] text-right font-bold text-slate-700">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.length === 0 || (items.length === 1 && !items[0].name) ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4 text-slate-500">
                                                No ha añadido ningún artículo.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>${item.rate}</TableCell>
                                                <TableCell>{item.tax ? `${item.tax}%` : "-"}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {(() => {
                                                        const line = item.quantity * item.rate;
                                                        const taxAmount = item.tax ? (line * (item.tax / 100)) : 0;
                                                        return `$${(line + taxAmount).toFixed(2)}`;
                                                    })()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            <div className="flex justify-end p-4 bg-gray-50 border-t">
                                <div className="w-64 flex justify-between items-center">
                                    <span className="font-bold text-slate-700">Total</span>
                                    <span className="font-bold text-slate-800">${calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Registros del Presupuesto (Placeholder based on screenshot) */}
                        <div className="mt-8 border rounded-lg p-4">
                            <h4 className="font-medium text-slate-700 mb-4">Registros de la Factura</h4>
                            <div className="bg-slate-50 p-3 rounded text-sm grid grid-cols-3 font-medium text-slate-600">
                                <span>Nombre de Usuario</span>
                                <span>Fecha del Evento</span>
                                <span>Nombre del Evento</span>
                            </div>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-xl font-semibold mb-6">Título y resumen de la factura</h1>

                <div className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
                    {/* Title and Summary */}
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title" className="text-gray-500">Factura</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="max-w-md"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Input
                                id="summary"
                                placeholder="Resumen"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                    </div>

                    {/* Static Company Info */}
                    <div className="py-4">
                        <h3 className="font-medium text-lg text-slate-700">Seguridad BAS</h3>
                        <p className="text-sm text-slate-500">Antonio Miguel de solier N29-26 y bartolome de las casas</p>
                        <p className="text-sm text-slate-500">+18014004269</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Client & Site */}
                        <div className="space-y-6">
                            <h3 className="font-medium text-lg text-slate-700">Facturar a</h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Cliente*</Label>
                                    <Combobox
                                        value={client}
                                        onChange={(v) => { setClient(v); setSite(""); loadPostSitesForClient(v); }}
                                        options={clients.map((c) => ({ value: c.id, label: c.name }))}
                                        placeholder="Seleccionar Cliente"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Sitio de publicación*</Label>
                                    <Select value={site} onValueChange={setSite}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sitio de publicación*" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {postSites.length === 0 ? (
                                                <SelectItem value="none" disabled>No hay sitios disponibles</SelectItem>
                                            ) : (
                                                postSites.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Inline preview panel: show client and postSite details in the editor */}
                                <div className="bg-white p-3 rounded border mt-3">
                                    {(() => {
                                        const selectedClient = clients.find(c => c.id === client);
                                        const selectedSite = postSites.find(s => s.id === site);
                                        const clientName = selectedClient?.name ?? '—';
                                        const rawC = selectedClient?.raw;
                                        const postRaw = selectedSite?.raw;
                                        const postName = selectedSite?.name ?? '—';
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
                                        const postPhone = (postRaw && (postRaw.phone || postRaw.phoneNumber || postRaw.telephone || postRaw.contactPhone || postRaw.contactPhoneNumber)) || '';
                                        const postEmail = (postRaw && (postRaw.email || postRaw.contactEmail || postRaw.primaryEmail || postRaw.contactEmailAddress)) || '';

                                        const clientAddrCandidates: string[] = [];
                                        if (rawC) {
                                            if (rawC.companyAddress) clientAddrCandidates.push(rawC.companyAddress);
                                            if (rawC.address) clientAddrCandidates.push(typeof rawC.address === 'string' ? rawC.address : [rawC.address.street, rawC.address.city, rawC.address.state, rawC.address.postalCode].filter(Boolean).join(', '));
                                            if (rawC.location) clientAddrCandidates.push(rawC.location);
                                        }
                                        const clientAddress = clientAddrCandidates.find(Boolean) ?? '';
                                        const clientPhone = (rawC && (rawC.phone || rawC.phoneNumber || rawC.telephone)) || '';

                                        return (
                                            <div>
                                                <p className="text-xs text-gray-400">Cliente</p>
                                                <p className="font-semibold text-slate-800">{clientName}</p>
                                                <div className="mt-2">
                                                    <p className="text-xs text-gray-400">Sitio</p>
                                                    <p className="text-sm font-medium text-slate-700">{postName}</p>
                                                    {postAddress ? <p className="text-sm text-slate-500">{postAddress}</p> : null}
                                                    {postPhone ? <p className="text-sm text-slate-500">Tel: {postPhone}</p> : null}
                                                    {postEmail ? <p className="text-sm text-slate-500">{postEmail}</p> : null}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Invoice Details */}
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Número de Factura*</Label>
                                <Input
                                    value={invoiceNumber}
                                    placeholder="Asignado automáticamente"
                                    readOnly
                                    disabled
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Número PO/SO</Label>
                                <Input
                                    placeholder="Número PO/SO"
                                    value={poSoNumber}
                                    onChange={(e) => setPoSoNumber(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Fecha de la Factura</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-between text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            {date ? format(date, "MMM dd, yyyy", { locale: es }) : <span>Seleccionar</span>}
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[380px] p-3 rounded-lg shadow-lg">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Pago debido</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-between text-left font-normal",
                                                !dueDate && "text-muted-foreground"
                                            )}
                                        >
                                            {dueDate ? format(dueDate, "MMM dd, yyyy", { locale: es }) : <span>Seleccionar</span>}
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[380px] p-3 rounded-lg shadow-lg">
                                        <Calendar
                                            mode="single"
                                            selected={dueDate}
                                            onSelect={setDueDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mt-8 border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="w-[40%]">Artículo</TableHead>
                                    <TableHead className="w-[15%]">Cantidad</TableHead>
                                    <TableHead className="w-[15%]">Tasa</TableHead>
                                    <TableHead className="w-[15%]">Impuesto</TableHead>
                                    <TableHead className="w-[15%] text-right">Monto</TableHead>
                                    <TableHead className="w-[5%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Combobox
                                                    key={`cb-${item.id}-${item.reset ?? 0}`}
                                                    value={(item as any).serviceId ?? item.name}
                                                    onChange={(v) => handleSelectService(item.id, v)}
                                                    options={[{ value: '__create__', label: '+ Crear nuevo artículo' }].concat(
                                                        services
                                                            .filter((s) => s.id === (item as any).serviceId || !items.some((it) => (it as any).serviceId === s.id))
                                                            .map((s) => ({ value: s.id, label: `${s.name} — $${s.price.toFixed(2)}` }))
                                                    )}
                                                    placeholder="Seleccionar o escribir artículo"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setItems(prev => prev.map(it => it.id === item.id ? ({ ...it, serviceId: undefined, name: '', reset: ((it.reset ?? 0) + 1) }) : it))}
                                                    title="Reiniciar artículo"
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                                                className="border-0 shadow-none focus-visible:ring-0 px-0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={item.rate}
                                                onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                                                className="border-0 shadow-none focus-visible:ring-0 px-0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Select value={String(item.tax)} onValueChange={(v) => updateItem(item.id, "tax", Number(v))}>
                                                <SelectTrigger className="border-0 shadow-none focus:ring-0 px-0">
                                                    <SelectValue placeholder="Ninguno" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">Ninguno</SelectItem>
                                                    {taxes.map((t) => (
                                                        <SelectItem key={t.id} value={String(t.rate)}>{t.name} ({t.rate}%)</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${(item.quantity * item.rate).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItem(item.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="p-4 bg-white border-t">
                            <Button
                                variant="ghost"
                                className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                onClick={addItem}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Añadir un artículo
                            </Button>
                        </div>

                        {/* Create Service Modal */}
                        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Crear nuevo artículo</DialogTitle>
                                    <DialogDescription>Crear un artículo y usarlo en la fila seleccionada.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 mt-2">
                                    <div className="grid gap-2">
                                        <Label>Título</Label>
                                        <Input value={newServiceTitle} onChange={(e) => setNewServiceTitle(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Precio</Label>
                                        <Input type="number" value={String(newServicePrice)} onChange={(e) => setNewServicePrice(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Impuesto</Label>
                                        <Select value={newServiceTaxId ?? "0"} onValueChange={(v) => setNewServiceTaxId(v === "0" ? null : v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Ninguno" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Ninguno</SelectItem>
                                                {taxes.map((t) => (
                                                    <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.rate}%)</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => { setCreateModalOpen(false); setCreateForItemId(null); }}>Cancelar</Button>
                                    <Button className="bg-orange-500 text-white" disabled={creatingService || !newServiceTitle} onClick={createService}>{creatingService ? 'Creando...' : 'Crear'}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

             
                  

                    {/* Action Buttons */}
                    <div className="mt-6">
                        <div className="flex justify-end mb-4">
                            <div className="w-64 bg-white p-4 rounded border">
                                <div className="flex justify-between text-sm text-slate-600 mb-2">
                                    <span>Subtotal</span>
                                    <span>${calculateSubtotal().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-600 mb-2">
                                    <span>Impuestos</span>
                                    <span>${calculateTaxTotal().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-base font-semibold text-slate-800 border-t pt-2">
                                    <span>Total a pagar</span>
                                    <span>${calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <Label className="text-xs text-gray-500">Notas</Label>
                        <Textarea
                            placeholder="Notas..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full h-28"
                        />
                    </div>

                    <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
                        <Button
                            variant="outline"
                            className="text-orange-500 border-orange-200 hover:bg-orange-50"
                            onClick={handlePreview}
                        >
                            Vista previa
                        </Button>
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveLog}>
                            Guardar y continuar
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
