import { useState, useEffect } from "react";
import { Search, MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { ApiService } from "@/services/api/apiService";
import { toast } from 'sonner';


interface Item {
    id: string;
    name: string;
    price: number;
    tax: string;
    description?: string | null;
    taxName?: string | null;
    taxRate?: number | string | null;
}

export default function Items() {
    const { t } = useTranslation();
    const [items, setItems] = useState<Item[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // New Item Form State
    const [newItemName, setNewItemName] = useState("");
    const [newItemDescription, setNewItemDescription] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [newItemTax, setNewItemTax] = useState("");
    const [taxes, setTaxes] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [pendingBatchDeleteIds, setPendingBatchDeleteIds] = useState<string[] | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [actionValue, setActionValue] = useState<string>("");

    const handleAddItem = () => {
        (async () => {
            const tenantId = localStorage.getItem('tenantId') || '';
            const selectedTax = taxes.find((t) => t.id === newItemTax);
            // Client-side validation
            if (!newItemName || !newItemName.trim()) {
                toast.error(t('billing.items.form.validation.required_name', 'Por favor indica un nombre para el servicio'));
                return;
            }
            const priceVal = parseFloat(newItemPrice as any);
            if (isNaN(priceVal) || priceVal < 0) {
                toast.error(t('billing.items.form.validation.invalid_price', 'Por favor indica un precio válido'));
                return;
            }
            if (!newItemTax || newItemTax === '' || newItemTax === 'none') {
                toast.error(t('billing.items.form.validation.required_tax', 'Por favor selecciona un impuesto'));
                return;
            }
            const payload: any = {
                title: newItemName,
                description: newItemDescription || null,
                price: parseFloat(newItemPrice) || 0,
            };
            if (newItemTax && newItemTax !== 'none' && selectedTax) {
                payload.taxId = selectedTax.id;
                payload.taxName = selectedTax.name;
                payload.taxRate = String(selectedTax.rate);
            }

                try {
                if (!tenantId) {
                    console.warn('[Items] tenantId missing in localStorage');
                    alert('Tenant no configurado. Por favor inicia sesión o configura el tenantId.');
                    // fallback: add locally without calling backend
                    const newItemLocal: Item = {
                        id: `local-${Math.random().toString(36).substr(2, 9)}`,
                        name: newItemName,
                        price: parseFloat(newItemPrice) || 0,
                        tax: newItemTax,
                        description: newItemDescription || null,
                    };
                    setItems([...items, newItemLocal]);
                    setIsSheetOpen(false);
                    setNewItemName("");
                    setNewItemDescription("");
                    setNewItemPrice("");
                    setNewItemTax("");
                    return;
                }
                // If editing, call update route
                if (editingId) {
                    const res = await ApiService.put(`/tenant/${tenantId}/service/${editingId}`, payload);
                    const updated = res && (res.data || res) || {};
                    const updatedTaxId = updated.taxId ?? (updated.tax && (updated.tax.id || updated.tax._id)) ?? payload.taxId ?? newItemTax;
                    const updatedTaxName = updated.taxName ?? (updated.tax && updated.tax.name) ?? (selectedTax ? selectedTax.name : null);
                    const updatedTaxRate = updated.taxRate ?? (updated.tax && updated.tax.rate) ?? (selectedTax ? selectedTax.rate : null);
                    const newItems = items.map((it) => it.id === editingId ? ({
                        ...it,
                        name: newItemName,
                        description: newItemDescription || null,
                        price: parseFloat(newItemPrice) || 0,
                        tax: updatedTaxId,
                        taxName: updatedTaxName ?? null,
                        taxRate: updatedTaxRate ?? null,
                    }) : it);
                    setItems(newItems);
                    toast.success(t('billing.items.messages.updated'));
                    setIsSheetOpen(false);
                    setEditingId(null);
                } else {
                    const res = await ApiService.post(`/tenant/${tenantId}/service`, payload);
                    const created = res && (res.data || res);
                    const createdTaxId = created && (created.taxId || (created.tax && (created.tax.id || created.tax._id))) ? (created.taxId || (created.tax && (created.tax.id || created.tax._id))) : newItemTax;
                    const createdTaxName = created && (created.taxName || (created.tax && created.tax.name)) ? (created.taxName || (created.tax && created.tax.name)) : (selectedTax ? selectedTax.name : undefined);
                    const createdTaxRate = created && (created.taxRate || (created.tax && (created.tax.rate))) ? (created.taxRate || (created.tax && created.tax.rate)) : (selectedTax ? selectedTax.rate : undefined);

                    const newItem: Item = {
                        id: created && (created.id || created._id) ? (created.id || created._id) : `local-${Math.random().toString(36).substr(2, 9)}`,
                        name: newItemName,
                        description: newItemDescription || null,
                        price: parseFloat(newItemPrice) || 0,
                        tax: createdTaxId,
                        taxName: createdTaxName ?? null,
                        taxRate: createdTaxRate ?? null,
                    };
                    setItems([...items, newItem]);
                    toast.success(t('billing.items.messages.created'));
                    setIsSheetOpen(false);
                }
                // Reset form
                setNewItemName("");
                setNewItemDescription("");
                setNewItemPrice("");
                setNewItemTax("");
            } catch (err: any) {
                console.error('Error creando elemento', err);
                // If server responded with an HTTP status, show friendly message
                if (err && typeof err.status === 'number') {
                    const status = err.status;
                    if (status >= 500) {
                        toast.error(t('billing.items.messages.server_error', 'Error en el servidor. Inténtalo más tarde.'));
                        return;
                    }
                    // 400/422 - validation / bad request: show server message if available, otherwise friendly hint
                    if (status === 400 || status === 422) {
                        const serverMsg = (err.data && (err.data.message || err.data.error)) || err.message || t('billing.items.messages.invalid_input', 'Datos inválidos. Revisa los campos.');
                        // Map some common backend messages to friendlier ones
                        if (/Cannot read properties of undefined/i.test(String(serverMsg))) {
                            toast.error(t('billing.items.messages.invalid_input', 'Datos inválidos. Revisa los campos.'));
                        } else {
                            toast.error(serverMsg);
                        }
                        return;
                    }
                    // Other client errors: show message
                    toast.error(err.message || t('billing.items.messages.save_error', 'No se pudo guardar el artículo.'));
                    return;
                }

                // Network/connection error (no HTTP status): fallback to adding locally
                toast.error(t('billing.items.messages.network_error', 'No se pudo conectar con el servidor. Se agregó localmente.'));
                const fallbackTax = taxes.find((t) => t.id === newItemTax);
                const newItem: Item = {
                    id: `local-${Math.random().toString(36).substr(2, 9)}`,
                    name: newItemName,
                    description: newItemDescription || null,
                    price: parseFloat(newItemPrice) || 0,
                    tax: newItemTax,
                    taxName: fallbackTax ? fallbackTax.name : null,
                    taxRate: fallbackTax ? fallbackTax.rate : null,
                };
                setItems([...items, newItem]);
                setIsSheetOpen(false);
            }
        })();
    };

    const handleEditClick = (item: Item) => {
        (async () => {
            try {
                console.debug('[Items] edit click, item:', item);
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!tenantId) {
                    // fallback to using mapped item
                    setEditingId(item.id);
                    setNewItemName(item.name);
                    setNewItemPrice(String(item.price ?? ""));
                    setNewItemDescription(item.description ?? "");
                    setNewItemTax(item.tax ?? 'none');
                    setIsSheetOpen(true);
                    return;
                }
                const res = await ApiService.get(`/tenant/${tenantId}/service/${item.id}`);
                console.debug('[Items] service find response', res);
                const full = res && (res.data || res) ? (res.data || res) : res;
                const name = full && (full.title || full.name) ? (full.title || full.name) : item.name;
                const description = full && (full.description ?? full.desc) ? (full.description ?? full.desc) : (item.description ?? "");
                const price = full && (full.price !== undefined && full.price !== null) ? full.price : item.price;
                const taxId = full && (full.taxId || (full.tax && (full.tax.id || full.tax._id))) ? (full.taxId || (full.tax && (full.tax.id || full.tax._id))) : item.tax;
                setEditingId(item.id);
                setNewItemName(name);
                setNewItemPrice(String(price ?? ""));
                setNewItemDescription(description ?? "");
                setNewItemTax(taxId ?? 'none');
                setIsSheetOpen(true);
            } catch (e) {
                console.debug('[Items] failed to fetch full service for edit, falling back', e);
                setEditingId(item.id);
                setNewItemName(item.name);
                setNewItemPrice(String(item.price ?? ""));
                setNewItemDescription(item.description ?? "");
                setNewItemTax(item.tax ?? 'none');
                setIsSheetOpen(true);
            }
        })();
    };

    const confirmDelete = async () => {
        try {
            const tenantId = localStorage.getItem('tenantId') || '';
            if (!tenantId) {
                toast.error('El tenant no está configurado.');
                return;
            }
            if (pendingBatchDeleteIds && pendingBatchDeleteIds.length > 0) {
                const batch = pendingBatchDeleteIds.slice();
                const localIds = batch.filter((id) => String(id).startsWith('local-'));
                const serverIds = batch.filter((id) => !String(id).startsWith('local-'));
                if (serverIds.length > 0) {
                    const idsParam = serverIds.join(',');
                    await ApiService.delete(`/tenant/${tenantId}/service?ids=${idsParam}`);
                }
                setItems((prev) => prev.filter((it) => !batch.includes(it.id)));
                setSelectedIds((prev) => prev.filter((id) => !batch.includes(id)));
                toast.success(t('billing.items.messages.deleted'));
            } else if (pendingDelete) {
                const id = pendingDelete.id;
                if (String(id).startsWith('local-')) {
                    // local-only item — just remove from UI
                    setItems((prev) => prev.filter((it) => it.id !== id));
                    setSelectedIds((prev) => prev.filter((i) => i !== id));
                    toast.success(t('billing.items.messages.deleted'));
                } else {
                    await ApiService.delete(`/tenant/${tenantId}/service?ids=${id}`);
                    setItems((prev) => prev.filter((it) => it.id !== id));
                    setSelectedIds((prev) => prev.filter((i) => i !== id));
                    toast.success(t('billing.items.messages.deleted'));
                }
            }
        } catch (e) {
            console.error('Error eliminando elemento(s)', e);
                    toast.error(t('billing.items.messages.delete_error', 'No se pudieron eliminar los artículos.'));
        } finally {
            setIsDeleteDialogOpen(false);
            setPendingDelete(null);
            setPendingBatchDeleteIds(null);
            setActionValue('');
        }
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const tenantId = localStorage.getItem("tenantId") || "";
                if (!tenantId) {
                    console.warn("tenantId no encontrado en localStorage; no se cargarán impuestos para Items");
                    return;
                }
                // Only load when sheet opens to avoid extra calls
                if (!isSheetOpen) return;
                // Try to extract taxes from service records if tax endpoint is not used
                const res = await ApiService.get(`/tenant/${tenantId}/service?limit=1000&offset=0`);
                console.debug('[Items] /service response', res);
                const data = Array.isArray(res)
                    ? res
                    : res && res.rows
                    ? res.rows
                    : res && res.data && Array.isArray(res.data.rows)
                    ? res.data.rows
                    : [];
                if (!mounted) return;
                // Build unique tax list from services (use taxId/taxName/taxRate if present)
                const taxMap = new Map<string, { id: string; name: string; rate: number }>();
                for (const s of data) {
                    const id = s.taxId ?? (s.tax && (s.tax.id || s.tax._id)) ?? null;
                    const name = s.taxName ?? (s.tax && s.tax.name) ?? null;
                    const rate = Number(s.taxRate ?? (s.tax && s.tax.rate) ?? 0);
                    if (id) {
                        if (!taxMap.has(id)) taxMap.set(String(id), { id: String(id), name: name ?? String(id), rate });
                    }
                }
                // Also fetch canonical tax list and merge with taxes extracted from services
                try {
                    const res2 = await ApiService.get(`/tenant/${tenantId}/tax`);
                    console.debug('[Items] /tax response', res2);
                    const taxData = Array.isArray(res2) ? res2 : res2 && res2.rows ? res2.rows : res2 && res2.data && Array.isArray(res2.data.rows) ? res2.data.rows : [];
                    for (const t of taxData) {
                        const id = t.id ?? String(t._id ?? t.id);
                        if (!taxMap.has(String(id))) {
                            taxMap.set(String(id), { id: String(id), name: t.name ?? String(id), rate: Number(t.rate ?? 0) });
                        }
                    }
                } catch (e) {
                    console.debug('[Items] tax fetch failed', e);
                }
                setTaxes(Array.from(taxMap.values()));
            } catch (err) {
                console.error("Error cargando impuestos:", err);
            }
        })();
        return () => { mounted = false; };
    }, [isSheetOpen]);

    // Load existing services (items) from backend on mount
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const tenantId = localStorage.getItem("tenantId") || "";
                if (!tenantId) {
                    console.warn("tenantId no encontrado en localStorage; no se cargarán servicios para Items");
                    return;
                }
                const res = await ApiService.get(`/tenant/${tenantId}/service?limit=1000&offset=0`);
                console.debug('[Items] service list response', res);
                const data = Array.isArray(res)
                    ? res
                    : res && res.rows
                    ? res.rows
                    : res && res.data && Array.isArray(res.data.rows)
                    ? res.data.rows
                    : [];
                if (!mounted) return;
                const mapped = data.map((s: any) => ({
                    id: s.id ?? s._id ?? String(Math.random()).slice(2, 10),
                    name: s.title ?? s.name ?? "",
                    price: Number(s.price ?? 0),
                    tax: s.taxId ?? (s.tax && (s.tax.id || s.tax._id)) ?? 'none',
                    // include description from the service row
                    description: s.description ?? s.desc ?? null,
                    // map taxName and taxRate from service row (or nested tax) so table shows name and rate
                    taxName: s.taxName ?? (s.tax && (s.tax.name)) ?? null,
                    taxRate: s.taxRate ?? (s.tax && (s.tax.rate)) ?? null,
                }));
                console.debug('[Items] mapped items', mapped);
                setItems(mapped);
            } catch (err) {
                console.error('Error cargando servicios para Items:', err);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: t('dashboard.title'), path: "/dashboard" },
                    { label: t('billing.items.title') },
                ]}
            />
            <div className="p-6 space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="w-full md:w-48">
                        <Select value={actionValue} onValueChange={(v) => {
                            setActionValue(v);
                                if (v === 'delete') {
                                if (!selectedIds || selectedIds.length === 0) {
                                    toast.error(t('billing.common.no_selection'));
                                    setActionValue('');
                                    return;
                                }
                                setPendingBatchDeleteIds(selectedIds.slice());
                                setIsDeleteDialogOpen(true);
                            }
                        }}>
                                <SelectTrigger>
                                <SelectValue placeholder={t('actions.action')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="delete">{t('actions.delete')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder={t('billing.items.search_placeholder')}
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Sheet open={isSheetOpen} onOpenChange={(open) => { setIsSheetOpen(open); if (!open) setEditingId(null); }}>
                            <SheetTrigger asChild>
                                    <Button
                                        className="bg-white text-[#C8860A] border border-[#C8860A]/30 hover:bg-[#C8860A]/10 hover:text-[#C8860A]"
                                        onClick={() => {
                                            // Ensure sheet opens in "create" mode, clear any editing state
                                            setEditingId(null);
                                            setNewItemName("");
                                            setNewItemDescription("");
                                            setNewItemPrice("");
                                            setNewItemTax("");
                                        }}
                                    >
                                        {t('billing.items.actions.add')}
                                    </Button>
                                </SheetTrigger>
                            <SheetContent className="w-[400px] sm:w-[540px]">
                                    <SheetHeader>
                                    <SheetTitle>{editingId ? t('billing.items.form.title_edit') : t('billing.items.form.title_create')}</SheetTitle>
                                </SheetHeader>
                                <div className="grid gap-6 py-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">{`${t('billing.items.form.name')}*`}</Label>
                                        <Input
                                            id="name"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">{t('billing.items.form.description')}</Label>
                                        <Textarea
                                            id="description"
                                            placeholder={t('billing.items.form.description_placeholder', '')}
                                            value={newItemDescription}
                                            onChange={(e) => setNewItemDescription(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="price">{`${t('billing.items.form.price')}*`}</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            placeholder="0"
                                            value={newItemPrice}
                                            onChange={(e) => setNewItemPrice(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="tax">{`${t('billing.items.form.tax','Impuesto')}*`}</Label>
                                        <Select value={newItemTax} onValueChange={setNewItemTax}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('billing.items.form.select_tax', 'Seleccionar impuesto')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t('billing.items.form.no_tax', 'Ninguno')}</SelectItem>
                                                {taxes.map((t) => (
                                                    <SelectItem key={t.id} value={t.id}>{`${t.name} (${t.rate}%)`}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <SheetFooter>
                                    <Button
                                        className="w-full bg-[#C8860A] hover:bg-[#C8860A] text-white"
                                        onClick={handleAddItem}
                                    >
                                        {t('billing.items.form.save')}
                                    </Button>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                {/* Table */}
                <div className="border rounded-md">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                                        onCheckedChange={(v: any) => {
                                            if (v) {
                                                setSelectedIds(filteredItems.map((it) => it.id));
                                            } else {
                                                setSelectedIds([]);
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead className="font-bold text-slate-700">{t('billing.items.columns.name')}</TableHead>
                                <TableHead className="font-bold text-slate-700">{`${t('billing.items.columns.price')} ($)`}</TableHead>
                                <TableHead className="font-bold text-slate-700">{t('billing.items.columns.tax')}</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-[400px] text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <div className="bg-blue-50 p-6 rounded-full mb-4">
                                                <svg
                                                    className="w-12 h-12 text-blue-200"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-medium text-slate-700 mb-1">{t('billing.items.no_results', 'No se encontraron resultados')}</h3>
                                            <p className="text-sm max-w-xs">
                                                {t('billing.items.no_results_body', 'No pudimos encontrar ningún elemento que coincida con su búsqueda')}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={(v: any) => {
                                                    if (v) {
                                                        setSelectedIds((prev) => Array.from(new Set([...prev, item.id])));
                                                    } else {
                                                        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>${item.price.toFixed(2)}</TableCell>
                                        <TableCell>{
                                            item.tax && item.tax !== 'none'
                                                ? (
                                                    item.taxName
                                                        ? `${item.taxName} (${Number(item.taxRate ?? 0).toFixed(2)}%)`
                                                        : (() => {
                                                            const tx = taxes.find((x) => x.id === item.tax);
                                                            return tx ? `${tx.name} (${tx.rate}%)` : item.tax;
                                                        })()
                                                )
                                                : t('billing.items.form.no_tax', 'Ninguno')
                                        }</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4 text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleEditClick(item)}>{t('actions.edit')}</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setPendingDelete(item); setIsDeleteDialogOpen(true); }}>{t('actions.delete')}</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Delete confirmation dialog */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { setIsDeleteDialogOpen(open); if (!open) { setPendingDelete(null); setPendingBatchDeleteIds(null); setActionValue(''); } }}>
                        <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('actions.delete')}</DialogTitle>
                            <DialogDescription>
                                {pendingBatchDeleteIds && pendingBatchDeleteIds.length > 0 ? (
                                    <>{t('billing.common.confirm_delete')}</>
                                ) : (
                                    <>{t('billing.common.confirm_delete')}</>
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setPendingDelete(null); }}>{t('actions.cancel')}</Button>
                            <Button className="bg-red-600 text-white" onClick={confirmDelete}>{t('actions.delete')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Pagination (Static for now) */}
                <div className="flex items-center justify-end space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                        {t('billing.common.items_per_page')}
                    </div>
                    <Select defaultValue="25">
                        <SelectTrigger className="w-[70px]">
                            <SelectValue placeholder="25" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="text-sm text-muted-foreground mx-4">
                        0 of 0
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" disabled>
                            <span className="sr-only">Go to previous page</span>
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Button>
                        <Button variant="outline" size="icon" disabled>
                            <span className="sr-only">Go to next page</span>
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
