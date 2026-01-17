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
import { Badge } from "@/components/ui/badge";
import { clientService } from "@/lib/api/clientService";
import { postSiteService } from "@/lib/api/postSiteService";
import { userService } from "@/lib/api/userService";
import { toast } from "sonner";
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

interface TaxOption { id: string; name: string; rate: number }
interface ClientOption { id: string; name: string; raw?: any }
interface PostSiteOption { id: string; name: string; clientId?: string; raw?: any }

export default function EditInvoice() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [searchParams] = useSearchParams();
    const [tenantInfo, setTenantInfo] = useState<{ name?: string; address?: string; phone?: string } | null>(null);

    // Form State (same defaults as NewInvoice)
    const [title, setTitle] = useState("Invoice");
    const [summary, setSummary] = useState("");
    const [client, setClient] = useState("");
    const [site, setSite] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("1");
    const [poSoNumber, setPoSoNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(new Date());

    const [items, setItems] = useState<InvoiceItem[]>([
        { id: "1", name: "", quantity: 1, rate: 0, tax: 0, reset: 0 },
    ]);

    const [createdByName, setCreatedByName] = useState<string | null>(null);
    const [updatedByName, setUpdatedByName] = useState<string | null>(null);
    const [createdAt, setCreatedAt] = useState<Date | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [statusLabel, setStatusLabel] = useState<string | null>(null);
    const [amountDue, setAmountDue] = useState<number>(0);
    const [payments, setPayments] = useState<Array<any>>([]);
    const [invoiceRaw, setInvoiceRaw] = useState<any>(null);
    const [invoiceClientDetails, setInvoiceClientDetails] = useState<any | null>(null);
    const [invoiceSiteDetails, setInvoiceSiteDetails] = useState<any | null>(null);

    const [taxes, setTaxes] = useState<TaxOption[]>([]);
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [postSites, setPostSites] = useState<PostSiteOption[]>([]);
    const [services, setServices] = useState<Array<{ id: string; name: string; price: number; taxRate?: number }>>([]);

    // Create service modal
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
                const data = Array.isArray(res) ? res : res && res.rows ? res.rows : res && res.data && Array.isArray(res.data.rows) ? res.data.rows : [];
                if (!mounted) return;
                setTaxes((data || []).map((r: any) => ({ id: r.id ?? r._id ?? String(r.id), name: r.name ?? '', rate: Number(r.rate ?? 0) })));
            } catch (err) {
                console.error('Error loading taxes', err);
            }
        })();
        return () => { mounted = false };
    }, []);

    // load tenant info for preview header
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!tenantId) return;
                const res = await ApiService.get(`/tenant/${tenantId}`);
                const raw = res && (res.data || res) || res;
                if (!mounted) return;
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
                setTenantInfo({ name: name || undefined, phone: phone || undefined, address: address || undefined });
            } catch (err) {
                // ignore
            }
        })();
        return () => { mounted = false };
    }, []);

    // load services, clients similar to NewInvoice
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!tenantId) return;
                const [svcRes, clientsRes] = await Promise.all([
                    ApiService.get(`/tenant/${tenantId}/service`),
                    clientService.getClients(undefined, { limit: 9999, offset: 0 }),
                ]);
                const svcData = Array.isArray(svcRes) ? svcRes : svcRes && svcRes.rows ? svcRes.rows : svcRes && svcRes.data && Array.isArray(svcRes.data.rows) ? svcRes.data.rows : [];
                const mappedSvcs = (svcData || []).map((s: any) => ({ id: s.id ?? s._id ?? String(s.id), name: s.title ?? s.name ?? '', price: Number(s.price ?? s.amount ?? 0), taxRate: Number(s.taxRate ?? s.tax?.rate ?? 0) }));
                if (!mounted) return;
                setServices(mappedSvcs);
                const clientsData = (clientsRes.rows || []).map((c: any) => ({ id: c.id, name: c.companyName ?? (c.name && c.lastName ? `${c.name} ${c.lastName}` : c.name ?? c.lastName ?? ''), raw: c }));
                setClients(clientsData);
            } catch (err) {
                console.error('Error loading clients/services', err);
            }
        })();
        return () => { mounted = false };
    }, []);

    const loadPostSitesForClient = async (clientId: string) => {
        try {
            if (!clientId) { setPostSites([]); return; }
            const res = await postSiteService.list({ clientId }, { limit: 9999, offset: 0 });
            const mapped = (res.rows || []).map((s: any) => ({ id: s.id, name: s.name, clientId: s.client?.id ?? s.clientAccount?.id ?? s.clientId ?? s.clientAccountId ?? undefined, raw: s }));
            setPostSites(mapped.filter((ps: any) => !ps.clientId || ps.clientId === clientId ? true : ps.clientId === clientId));
        } catch (err) {
            console.error('Error loading post sites', err);
            setPostSites([]);
        }
    };

    // Load invoice by id
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!id) return;
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!tenantId) return;
                const res = await ApiService.get(`/tenant/${tenantId}/invoice/${id}`);
                const raw = res && (res.data || res) || res;
                if (!mounted) return;
                // map fields
                setInvoiceRaw(raw || null);
                // Normalize client/postSite to IDs when possible
                const resolvedClientId = raw.clientId ?? (raw.client && (raw.client.id || raw.client._id)) ?? '';
                const resolvedPostSiteId = raw.postSiteId ?? (raw.postSite && (raw.postSite.id || raw.postSite._id)) ?? '';
                setClient(resolvedClientId);
                setSite(resolvedPostSiteId);

                // Try to fetch client/postSite details if not embedded
                (async () => {
                    try {
                        if (resolvedClientId) {
                            try {
                                const c = await clientService.getClient(resolvedClientId);
                                setInvoiceClientDetails(c);
                            } catch (e) {
                                // fallback to embedded client object
                                if (raw.client && typeof raw.client === 'object') setInvoiceClientDetails(raw.client);
                                else setInvoiceClientDetails(null);
                            }
                        } else if (raw.client && typeof raw.client === 'object') {
                            setInvoiceClientDetails(raw.client);
                        } else {
                            setInvoiceClientDetails(null);
                        }

                        if (resolvedPostSiteId) {
                            try {
                                const s = await postSiteService.get(resolvedPostSiteId);
                                setInvoiceSiteDetails(s);
                            } catch (e) {
                                if (raw.postSite && typeof raw.postSite === 'object') setInvoiceSiteDetails(raw.postSite);
                                else setInvoiceSiteDetails(null);
                            }
                        } else if (raw.postSite && typeof raw.postSite === 'object') {
                            setInvoiceSiteDetails(raw.postSite);
                        } else {
                            setInvoiceSiteDetails(null);
                        }
                    } catch (e) {
                        setInvoiceClientDetails(null);
                        setInvoiceSiteDetails(null);
                    }
                })();
                // Normalize title: if backend stored the word 'Estimate' in the title, show 'Invoice'
                try {
                    const rawTitle = raw.title ?? raw.name ?? 'Invoice';
                    const tStr = String(rawTitle || '').trim();
                    const normalizedTitle = /estimate/i.test(tStr) ? 'Invoice' : tStr || 'Invoice';
                    setTitle(normalizedTitle);
                } catch (e) {
                    setTitle('Invoice');
                }
                setSummary(raw.summary ?? '');
                setInvoiceNumber(raw.invoiceNumber ?? raw.number ?? '');
                setPoSoNumber((raw.poSoNumber ?? raw.po_so ?? raw.po) || '');
                if (raw.date) setDate(new Date(raw.date));
                if (raw.dueDate) setDueDate(new Date(raw.dueDate));
                if (Array.isArray(raw.items)) {
                    const mappedItems = raw.items.map((it: any) => {
                        const svcObj = it.service || it.product || it.item || null;
                        const svcId = it.serviceId ?? (svcObj && (svcObj.id || svcObj._id)) ?? (typeof it.service === 'string' ? it.service : undefined);
                        const rate = Number(it.rate ?? it.price ?? (svcObj && (svcObj.price ?? svcObj.amount)) ?? 0);
                        const tax = Number(it.taxRate ?? it.tax ?? (svcObj && (svcObj.taxRate ?? svcObj.tax?.rate)) ?? 0);
                        const nameFromSvc = svcObj && (svcObj.title || svcObj.name);
                        const name = (it.name && String(it.name).trim()) || (nameFromSvc && String(nameFromSvc).trim()) || (rate ? `Artículo — $${Number(rate).toFixed(2)}` : 'Artículo');
                        return { id: it.id ?? String(Math.random()).slice(2, 10), name, quantity: Number(it.quantity ?? 1), rate, tax, serviceId: svcId ? String(svcId) : undefined, reset: 0 };
                    });
                    setItems(mappedItems);

                    // ensure services list contains any service objects present in the invoice items
                    const extraSvcs: Array<{ id: string; name: string; price: number; taxRate?: number }> = [];
                    (raw.items || []).forEach((it: any) => {
                        const svcObj = it.service || it.product || it.item || null;
                        const svcId = it.serviceId ?? (svcObj && (svcObj.id || svcObj._id)) ?? (typeof it.service === 'string' ? it.service : undefined);
                        const price = Number((svcObj && (svcObj.price ?? svcObj.amount)) ?? it.price ?? it.rate ?? 0);
                        const nameFromSvc = svcObj && (svcObj.title || svcObj.name);
                        const name = (nameFromSvc && String(nameFromSvc).trim()) || (it.name && String(it.name).trim()) || (price ? `Artículo — $${price.toFixed(2)}` : 'Artículo');
                        if (svcObj && svcId) {
                            extraSvcs.push({ id: String(svcId), name, price: price, taxRate: Number(svcObj.taxRate ?? svcObj.tax?.rate ?? 0) });
                        }
                    });
                    // Also add free-text items (no serviceId) as temporary options so Combobox can show the label
                    (raw.items || []).forEach((it: any) => {
                        const svcObj = it.service || it.product || it.item || null;
                        const svcId = it.serviceId ?? (svcObj && (svcObj.id || svcObj._id)) ?? (typeof it.service === 'string' ? it.service : undefined);
                        const nameCandidate = (it.name && String(it.name).trim()) || (svcObj && (svcObj.title || svcObj.name)) || undefined;
                        const price = Number((svcObj && (svcObj.price ?? svcObj.amount)) ?? it.price ?? it.rate ?? 0);
                        if (!svcId && nameCandidate) {
                            extraSvcs.push({ id: String(nameCandidate), name: nameCandidate, price: price, taxRate: Number(it.taxRate ?? it.tax ?? 0) });
                        }
                    });
                    if (extraSvcs.length) {
                        setServices((prev) => {
                            const ids = new Set(prev.map(s => String(s.id)));
                            const toAdd = extraSvcs.filter(s => !ids.has(String(s.id)));
                            return toAdd.length ? [...toAdd, ...prev] : prev;
                        });
                    }
                }
                setNotes(raw.notes ?? '');
                // records (created/updated)
                try {
                    const getName = (obj: any) => {
                        if (!obj) return null;
                        if (typeof obj === 'string') return obj;
                        if (typeof obj === 'object') return obj.name || obj.displayName || obj.email || null;
                        return null;
                    };
                    const cName = getName(raw.createdBy) || raw.createdByName || (raw.createdById ? String(raw.createdById) : null);
                    const uName = getName(raw.updatedBy) || raw.updatedByName || (raw.updatedById ? String(raw.updatedById) : null);
                    setCreatedByName(cName);
                    setUpdatedByName(uName);
                    setCreatedAt(raw.createdAt ? new Date(raw.createdAt) : (raw.created_at ? new Date(raw.created_at) : null));
                    setUpdatedAt(raw.updatedAt ? new Date(raw.updatedAt) : (raw.updated_at ? new Date(raw.updated_at) : null));
                    const total = Number(raw.total ?? 0);
                    const paid = Number(raw.paidAmount ?? raw.paid ?? 0);
                    const balance = Number(raw.balance ?? (total - paid));
                    setAmountDue(balance);
                    const st = raw.status || (balance <= 0 ? 'Pagado' : 'Pendiente');
                    setStatusLabel(st ? String(st) : null);
                } catch (e) {
                    // ignore
                }
                // load postSites for client to populate select
                if (raw.clientId || raw.client) {
                    await loadPostSitesForClient(raw.clientId || raw.client?.id || raw.client);
                }
                // load payments for this invoice (best-effort)
                // Prefer payments embedded on the invoice row (raw.payments) when available.
                (async () => {
                    try {
                        // use payments from the invoice record if present
                        if (raw && Array.isArray(raw.payments) && raw.payments.length) {
                            const mapped = (raw.payments || []).map((p: any) => ({
                                id: p.id ?? p._id ?? p.paymentId ?? String(Math.random()).slice(2,10),
                                amount: Number(p.amount ?? p.total ?? p.paid ?? p.value ?? 0),
                                date: p.date || p.createdAt || p.created_at || p.paymentDate || null,
                                method: p.method || p.paymentMethod || p.type || p.gateway || null,
                                reference: p.reference || p.txnId || p.txn_id || p.note || p.notes || null,
                                raw: p,
                            }));
                            setPayments(mapped);
                            return;
                        }

                        const tenantId = localStorage.getItem('tenantId') || '';
                        if (!tenantId || !id) return;

                        // try invoice-specific endpoint first
                        let payRes: any = null;
                        try {
                            payRes = await ApiService.get(`/tenant/${tenantId}/invoice/${id}/payments`);
                        } catch (e) {
                            // fallback to payments listing by query
                            try {
                                payRes = await ApiService.get(`/tenant/${tenantId}/payment?invoiceId=${id}`);
                            } catch (e2) {
                                payRes = null;
                            }
                        }
                        const payRows = Array.isArray(payRes) ? payRes : (payRes && (payRes.rows || payRes.data && payRes.data.rows) ? (payRes.rows || payRes.data.rows) : (payRes && payRes.data ? (Array.isArray(payRes.data) ? payRes.data : []) : []));
                        if (Array.isArray(payRows) && payRows.length) {
                            const mapped = payRows.map((p: any) => ({
                                id: p.id ?? p._id ?? p.paymentId ?? String(Math.random()).slice(2,10),
                                amount: Number(p.amount ?? p.total ?? p.paid ?? 0),
                                date: p.date || p.createdAt || p.created_at || p.paymentDate || null,
                                method: p.method || p.paymentMethod || p.type || p.gateway || null,
                                reference: p.reference || p.txnId || p.txn_id || p.note || p.notes || null,
                                raw: p,
                            }));
                            setPayments(mapped);
                        } else {
                            setPayments([]);
                        }
                    } catch (e) {
                        console.error('Error loading payments for invoice', e);
                        setPayments([]);
                    }
                })();
            } catch (err) {
                console.error('Error loading invoice', err);
                toast.error('No se pudo cargar la factura');
            }
        })();
        return () => { mounted = false };
    }, [id]);

    // Enable preview mode when ?preview=1 is present in the URL
    useEffect(() => {
        const p = searchParams.get('preview');
        if (p === '1' || p === 'true') setIsPreviewMode(true);
    }, [searchParams]);

    // When invoice raw data is loaded, try to resolve createdBy/updatedBy user names via userService
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!invoiceRaw) return;
                // prefer explicit createdById/updatedById fields
                if (invoiceRaw.createdById) {
                    try {
                        const u = await userService.fetchUser(String(invoiceRaw.createdById));
                        if (!mounted) return;
                        setCreatedByName(u?.fullName || u?.firstName || u?.name || u?.email || String(invoiceRaw.createdById));
                    } catch (e) {
                        setCreatedByName(String(invoiceRaw.createdById));
                    }
                } else if (invoiceRaw.createdBy && typeof invoiceRaw.createdBy === 'object' && (invoiceRaw.createdBy.id || invoiceRaw.createdBy._id)) {
                    try {
                        const id = String(invoiceRaw.createdBy.id ?? invoiceRaw.createdBy._id);
                        const u = await userService.fetchUser(id);
                        if (!mounted) return;
                        setCreatedByName(u?.fullName || u?.firstName || u?.name || u?.email || id);
                    } catch (e) {
                        // fallback to existing values handled elsewhere
                    }
                }

                if (invoiceRaw.updatedById) {
                    try {
                        const u2 = await userService.fetchUser(String(invoiceRaw.updatedById));
                        if (!mounted) return;
                        setUpdatedByName(u2?.fullName || u2?.firstName || u2?.name || u2?.email || String(invoiceRaw.updatedById));
                    } catch (e) {
                        setUpdatedByName(String(invoiceRaw.updatedById));
                    }
                } else if (invoiceRaw.updatedBy && typeof invoiceRaw.updatedBy === 'object' && (invoiceRaw.updatedBy.id || invoiceRaw.updatedBy._id)) {
                    try {
                        const id2 = String(invoiceRaw.updatedBy.id ?? invoiceRaw.updatedBy._id);
                        const u2 = await userService.fetchUser(id2);
                        if (!mounted) return;
                        setUpdatedByName(u2?.fullName || u2?.firstName || u2?.name || u2?.email || id2);
                    } catch (e) {
                        // ignore
                    }
                }
            } catch (e) {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, [invoiceRaw]);

    const addItem = () => setItems(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: '', quantity: 1, rate: 0, tax: 0, reset: 0 }]);
    const removeItem = (idItem: string) => { if (items.length > 1) setItems(items.filter(i => i.id !== idItem)); };
    const updateItem = (idItem: string, field: keyof InvoiceItem, value: string | number) => setItems(items.map(it => it.id === idItem ? { ...it, [field]: value } : it));

    const handleSelectService = (itemId: string, selectedValue: string) => {
        if (selectedValue === '__create__') { setCreateForItemId(itemId); setCreateModalOpen(true); return; }
        const svc = services.find(s => s.id === selectedValue);
        if (svc) setItems(prev => prev.map(it => it.id === itemId ? { ...it, serviceId: svc.id, name: svc.name, rate: svc.price, tax: (svc.taxRate != null ? svc.taxRate : 0) } : it));
        else setItems(prev => prev.map(it => it.id === itemId ? { ...it, serviceId: undefined, name: selectedValue } : it));
    };

    const createService = async () => {
        if (!createForItemId) return;
        setCreatingService(true);
        try {
            const tenantId = localStorage.getItem('tenantId') || '';
            if (!tenantId) { toast.error('Tenant no configurado'); setCreatingService(false); return; }
            const payload: any = { title: newServiceTitle, price: Number(newServicePrice) || 0 };
            if (newServiceTaxId) payload.taxId = newServiceTaxId;
            const res = await ApiService.post(`/tenant/${tenantId}/service`, { data: payload });
            const created = res && (res.data || res) || res;
            const svc = { id: created.id ?? created._id ?? String(Math.random()).slice(2, 10), name: created.title ?? created.name ?? newServiceTitle, price: Number(created.price ?? created.amount ?? payload.price), taxRate: Number(created.taxRate ?? created.tax?.rate ?? 0) };
            setServices(prev => [svc, ...prev]);
            setItems(prev => prev.map(it => it.id === createForItemId ? { ...it, serviceId: svc.id, name: svc.name, rate: svc.price, tax: (svc.taxRate != null ? svc.taxRate : 0), reset: it.reset ?? 0 } : it));
            toast.success('Artículo creado');
            setCreateModalOpen(false); setCreateForItemId(null); setNewServiceTitle(''); setNewServicePrice(0); setNewServiceTaxId(null);
        } catch (err: any) { console.error('Error creating service', err); toast.error(err?.message || 'Error creando servicio'); }
        finally { setCreatingService(false); }
    };

    const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

    const calculateSubtotal = () => {
        return items.reduce((acc, item) => {
            const line = round2(Number(item.quantity || 0) * Number(item.rate || 0));
            return acc + line;
        }, 0);
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => {
            const line = round2(Number(item.quantity || 0) * Number(item.rate || 0));
            const taxAmount = item.tax ? round2(line * (Number(item.tax || 0) / 100)) : 0;
            return acc + line + taxAmount;
        }, 0);
    };

    // Sum of recorded payments (best-effort). Used to disable register-payment when fully paid.
    const paymentsTotal = (payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const invoiceTotal = calculateTotal();
    const isFullyPaid = paymentsTotal >= (Number(invoiceTotal) - 0.005);

    const handlePreview = () => {
        if (!client || !site) {
            toast.error("Por favor seleccione un Cliente y un Sitio de publicación para ver la vista previa.");
            return;
        }
        setIsPreviewMode(true);
    };

    const buildPayload = () => ({
        clientId: client,
        postSiteId: site,
        title,
        summary,
        invoiceNumber,
        poSoNumber,
        date: date ? date.toISOString() : null,
        dueDate: dueDate ? dueDate.toISOString() : null,
        items: items.map(it => ({ id: it.id, name: it.name, quantity: it.quantity, rate: it.rate, taxRate: it.tax })),
        notes,
        subtotal: items.reduce((a, b) => a + b.quantity * b.rate, 0),
        total: items.reduce((a, b) => { const line = b.quantity * b.rate; const tax = b.tax ? line * (b.tax / 100) : 0; return a + line + tax; }, 0),
    });

    const handleSendInvoice = async () => {
        // open confirmation dialog (actual send performed in performSendInvoice)
        if (!id) return;
        setSendConfirmOpen(true);
    };

    // send-confirm dialog state + action
    const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
    const performSendInvoice = async () => {
        try {
            if (!id) return;
            const tenantId = localStorage.getItem('tenantId') || '';
            if (!tenantId) { toast.error('Tenant no configurado'); return; }
            // Validate client exists before attempting to send
            const resolvedClientId = invoiceRaw?.clientId ?? (invoiceRaw?.client && (invoiceRaw.client.id || invoiceRaw.client._id)) ?? client;
            if (!resolvedClientId && !invoiceClientDetails) {
                toast.error('No hay datos del cliente guardados para esta factura. Por favor asocie un cliente.');
                setSendConfirmOpen(false);
                return;
            }

            // If we have a clientId, ensure it exists in the backend (best-effort)
            if (resolvedClientId) {
                try {
                    await clientService.getClient(String(resolvedClientId));
                } catch (e) {
                    toast.error('El cliente asociado no existe en la base de datos. Verifique el registro del cliente.');
                    setSendConfirmOpen(false);
                    return;
                }
            }

            setSendConfirmOpen(false);
            const res = await ApiService.post(`/tenant/${tenantId}/invoice/${id}/send`);
            // If backend returned a message, show it; otherwise fallback
            const msg = res && (res.message || (res.invoice ? 'Factura enviada' : null)) || 'Factura enviada';
            toast.success(msg);
            // After successful send, return to invoices list
                try {
                    navigate('/invoices');
                } catch (e) {
                    // ignore navigation errors
                }
        } catch (err: any) {
            console.error('Error enviando factura', err);
            // If API returned validation for not fully paid, surface a friendly message
            if (err && err.name === 'ApiError' && err.status === 400) {
                try {
                    const payload = err.data || {};
                    const srvMsg = (payload && (payload.message || payload.error || payload.detail)) || err.message || '';
                    if (/pago|paid|not fully|not_paid|notpaid|no.*pag/i.test(String(srvMsg))) {
                        toast.error('Complete el pago para enviar la factura');
                    } else {
                        // default for 400 on send
                        toast.error('Complete el pago para enviar la factura');
                    }
                } catch (e) {
                    toast.error('Complete el pago para enviar la factura');
                }
            } else {
                toast.error(err?.message || 'Error al enviar factura');
            }
        }
    };

    const handleDownloadInvoice = async () => {
        try {
            if (!id) return;
            const tenantId = localStorage.getItem('tenantId') || '';
            if (!tenantId) { toast.error('Tenant no configurado'); return; }
            const blobRes = await ApiService.getBlob(`/tenant/${tenantId}/invoice/${id}/download?format=pdf`);
            const blob = new Blob([blobRes], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${invoiceNumber || id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) { console.error('Error descargando factura', err); toast.error('No se pudo descargar la factura'); }
    };

    const handleRegisterPayment = async () => {
        if (!id) return;
        // reset modal fields for a fresh entry
        setPaymentDate(new Date());
        setPaymentAmount(0);
        setPaymentMethod('');
        setPaymentNote('');
        setPaymentModalOpen(true);
    };

    // Payment modal state
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [paymentNote, setPaymentNote] = useState<string>('');
    const [savingPayment, setSavingPayment] = useState(false);

    const submitPayment = async () => {
        if (!id) return;
        try {
            const tenantId = localStorage.getItem('tenantId') || '';
            if (!tenantId) { toast.error('Tenant no configurado'); return; }
            if (!paymentAmount || Number(paymentAmount) <= 0) { toast.error('Ingrese un monto válido'); return; }
            setSavingPayment(true);
            // Frontend validation: do not allow payment that exceeds remaining balance
            const remaining = Number(invoiceTotal) - Number(paymentsTotal || 0);
            if (Number(paymentAmount || 0) > remaining + 0.005) {
                toast.error('El monto del pago excede el saldo pendiente de la factura');
                setSavingPayment(false);
                return;
            }
            const payload: any = {
                invoiceId: id,
                date: paymentDate ? paymentDate.toISOString() : new Date().toISOString(),
                amount: Number(paymentAmount),
                method: paymentMethod || 'Unknown',
                note: paymentNote || null,
            };
            const res = await ApiService.post(`/tenant/${tenantId}/payment`, { data: payload });
            const created = res && (res.data || res) || res;
            toast.success('Pago registrado');
            setPaymentModalOpen(false);
            // append to payments list (best-effort mapping)
            const mapped = {
                id: created.id ?? created._id ?? String(created.id || Math.random()).slice(2,10),
                amount: Number(created.amount ?? created.total ?? created.paid ?? payload.amount),
                date: created.date || created.createdAt || payload.date,
                method: created.method || created.paymentMethod || payload.method,
                reference: created.reference || created.txnId || created.txn_id || created.referenceId || created.note || created.notes || payload.note || null,
                raw: created,
            };
            setPayments(prev => [mapped, ...(prev || [])]);
            // reset modal fields after successful submit
            setPaymentDate(new Date());
            setPaymentAmount(0);
            setPaymentMethod('');
            setPaymentNote('');
        } catch (err: any) {
            console.error('Error creating payment', err);
            toast.error(err?.message || 'No se pudo registrar el pago');
        } finally { setSavingPayment(false); }
    };

    const handleSave = () => {
        const payload = buildPayload();
        (async () => {
            try {
                const tenantId = localStorage.getItem('tenantId') || '';
                if (!tenantId || !id) { toast.error('Faltan datos'); return; }
                const res = await ApiService.put(`/tenant/${tenantId}/invoice/${id}`, { data: payload });
                console.log('[EditInvoice] updated ->', res);
                toast.success('Factura actualizada');
                navigate('/invoices');
            } catch (err: any) { console.error('Error updating invoice', err); toast.error(err?.message || 'Error actualizando factura'); }
        })();
    };

    // If preview mode is enabled render the invoice preview (similar to NewInvoice)
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
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-lg border shadow-sm space-y-8">
                        {/* Preview action header (title + buttons + total/status) */}
                        <div className="border rounded p-4 bg-white">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">{title || `Factura #${invoiceNumber}`}</h3>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50" onClick={handleSendInvoice} disabled={!isFullyPaid} title={!isFullyPaid ? 'Complete el pago para enviar la factura' : 'Enviar'}>Enviar</Button>
                                        <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50" onClick={handleDownloadInvoice}>Descargar</Button>
                                        <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50" onClick={handleRegisterPayment} disabled={isFullyPaid}>Registrar un Pago</Button>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-sm text-slate-500">Total General:</p>
                                    <p className="text-xl font-semibold">${calculateTotal().toFixed(2)}</p>
                                    <div className="mt-2 flex justify-end">
                                        <Badge className={statusLabel && /enviad/i.test(String(statusLabel)) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}>{statusLabel ?? ''}</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payments received (moved above client details) */}
                        <div className="mt-4 bg-white p-6 rounded-lg border">
                            <h3 className="font-semibold text-lg mb-4">Pagos recibidos:</h3>
                            <div className="min-h-[80px]">
                                {(!payments || payments.length === 0) ? (
                                    <div className="text-center text-slate-500 py-6">No se encontró registro de pago</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2">Fecha</th>
                                                    <th className="px-4 py-2">Método</th>
                                                    <th className="px-4 py-2">Referencia</th>
                                                    <th className="px-4 py-2 text-right">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map((p) => (
                                                    <tr key={p.id} className="border-t">
                                                        <td className="px-4 py-3">{p.date ? format(new Date(p.date), 'MMM dd, yyyy', { locale: es }) : '-'}</td>
                                                        <td className="px-4 py-3">{p.method || '-'}</td>
                                                        <td className="px-4 py-3">{p.reference || '-'}</td>
                                                        <td className="px-4 py-3 text-right">${Number(p.amount || 0).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
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
                                        // Prefer the loaded invoice's embedded client/postSite data when present
                                        // Include raw embedded values (`rawClient` / `rawSite`) returned by the backend
                                        const selectedClient = invoiceClientDetails
                                            || clients.find(c => String(c.id) === String(client) || String(c.id) === String(invoiceRaw?.clientId))
                                            || (invoiceRaw?.rawClient || (invoiceRaw?.client && typeof invoiceRaw.client === 'object' ? invoiceRaw.client : null));

                                        const selectedSite = invoiceSiteDetails
                                            || postSites.find(s => String(s.id) === String(site) || String(s.id) === String(invoiceRaw?.postSiteId))
                                            || (invoiceRaw?.rawSite || (invoiceRaw?.postSite && typeof invoiceRaw.postSite === 'object' ? invoiceRaw.postSite : null));

                                        // Build client display values from multiple possible shapes
                                        const clientObj = selectedClient
                                            || (invoiceRaw?.rawClient || (invoiceRaw?.client && typeof invoiceRaw.client === 'object' ? invoiceRaw.client : (typeof invoiceRaw?.client === 'string' ? { name: invoiceRaw.client } : null)))
                                            || (invoiceRaw && invoiceRaw.clientId ? { id: invoiceRaw.clientId, name: invoiceRaw.clientName || invoiceRaw.client?.name } : null);
                                        const clientName = (clientObj && (clientObj.name || clientObj.companyName || clientObj.displayName || clientObj.companyName)) || '';

                                        const postRaw = (selectedSite && (selectedSite as any).raw) || (selectedSite && typeof selectedSite === 'object' ? selectedSite : (invoiceRaw && typeof invoiceRaw.postSite === 'object' ? invoiceRaw.postSite : null));
                                        // fallback address/phone/email sources
                                        const clientRawForAddr = (clientObj && (clientObj.raw || clientObj)) || invoiceRaw || null;
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

                                        // Render both client and post-site details if available
                                        return (
                                            <>
                                                <p className="font-semibold text-slate-800">{clientName || invoiceRaw?.clientName || invoiceRaw?.client?.name || invoiceRaw?.client?.companyName || '-'}</p>
                                                {(() => {
                                                    // attempt to show client address/phone/email from multiple shapes
                                                    const clientRaw = (clientObj && (clientObj.raw || clientObj)) || invoiceRaw || null;
                                                    const addrParts: string[] = [];
                                                    if (clientRaw) {
                                                        const c = clientRaw;
                                                        if (c.address && typeof c.address === 'string') addrParts.push(c.address);
                                                        else if (c.address && typeof c.address === 'object') {
                                                            if (c.address.street) addrParts.push(c.address.street);
                                                            if (c.address.city) addrParts.push(c.address.city);
                                                            if (c.address.state) addrParts.push(c.address.state);
                                                            if (c.address.postalCode) addrParts.push(c.address.postalCode);
                                                        }
                                                        if (c.location) addrParts.push(c.location);
                                                        if (c.addressLine1) addrParts.push(c.addressLine1);
                                                        if (c.companyAddress) addrParts.push(c.companyAddress);
                                                    }
                                                    const clientAddress = addrParts.filter(Boolean).join(', ');
                                                    const clientPhone = (clientRaw && (clientRaw.phone || clientRaw.phoneNumber || clientRaw.telephone)) || invoiceRaw?.clientPhone || '';
                                                    const clientEmail = (clientRaw && (clientRaw.email || clientRaw.contactEmail || clientRaw.primaryEmail)) || invoiceRaw?.clientEmail || '';

                                                    return (
                                                        <>
                                                            {clientAddress ? <p className="text-sm text-slate-500">{clientAddress}</p> : null}
                                                            {clientPhone ? <p className="text-sm text-slate-500">Tel: {clientPhone}</p> : null}
                                                            {clientEmail ? <p className="text-sm text-slate-500">{clientEmail}</p> : null}
                                                        </>
                                                    );
                                                })()}

                                                {postAddress ? <p className="text-sm text-slate-500 mt-2">{postAddress}</p> : null}
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
                                                <TableCell className="text-right font-medium">{(() => { const line = Math.round((Number(item.quantity || 0) * Number(item.rate || 0) + Number.EPSILON) * 100) / 100; const taxAmount = item.tax ? Math.round((line * (Number(item.tax || 0) / 100) + Number.EPSILON) * 100) / 100 : 0; return `$${(line + taxAmount).toFixed(2)}`; })()}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            <div className="flex justify-end p-4 bg-gray-50 border-t">
                                <div className="w-64">
                                    <div className="flex justify-between text-sm text-slate-700">
                                        <span>Subtotal</span>
                                        <span>${calculateSubtotal().toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-700 mt-1">
                                        <span>Impuesto</span>
                                        <span>${(Math.round(((calculateTotal() - calculateSubtotal()) + Number.EPSILON) * 100) / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        <span className="font-bold text-slate-700">Total</span>
                                        <span className="font-bold text-slate-800">${calculateTotal().toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Records */}
                        <div className="mt-6 bg-white p-6 rounded-lg border">
                            <h3 className="font-semibold text-lg mb-4">Registros de la Factura</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2">Nombre de Usuario</th>
                                            <th className="px-4 py-2">Fecha del Evento</th>
                                            <th className="px-4 py-2">Nombre del Evento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {createdByName ? (
                                            <tr className="border-t">
                                                <td className="px-4 py-3">{(invoiceRaw && invoiceRaw.createdBy && (invoiceRaw.createdBy.name || invoiceRaw.createdBy.displayName)) || createdByName}</td>
                                                <td className="px-4 py-3">{createdAt ? format(createdAt, "MMM dd, yyyy HH:mm", { locale: es }) : '-'}</td>
                                                <td className="px-4 py-3">Creado</td>
                                            </tr>
                                        ) : null}
                                        {updatedByName ? (
                                            <tr className="border-t">
                                                <td className="px-4 py-3">{(invoiceRaw && invoiceRaw.updatedBy && (invoiceRaw.updatedBy.name || invoiceRaw.updatedBy.displayName)) || updatedByName}</td>
                                                <td className="px-4 py-3">{updatedAt ? format(updatedAt, "MMM dd, yyyy HH:mm", { locale: es }) : '-'}</td>
                                                <td className="px-4 py-3">Actualizado</td>
                                            </tr>
                                        ) : null}
                                        {(!createdByName && !updatedByName) && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-4 text-slate-500">No hay registros disponibles</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Register Payment Modal (also render in preview) */}
                <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar un Pago</DialogTitle>
                            <DialogDescription>Registra un pago para esta factura.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                            <div>
                                <Label>Fecha de Pago</Label>
                                <Input type="date" value={paymentDate ? (paymentDate.toISOString().slice(0,10)) : ''} onChange={(e) => setPaymentDate(e.target.value ? new Date(e.target.value) : undefined)} />
                            </div>
                            <div>
                                <Label>Monto ($)</Label>
                                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} />
                            </div>
                            <div>
                                <Label>Método de Pago</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger><SelectValue placeholder="Método de Pago" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Efectivo</SelectItem>
                                        <SelectItem value="card">Tarjeta</SelectItem>
                                        <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                                        <SelectItem value="other">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Nota</Label>
                                <Textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
                                <Button  className="bg-orange-500 hover:bg-orange-600 text-white" onClick={submitPayment} disabled={savingPayment}>{savingPayment ? 'Guardando...' : 'Registrar Pago'}</Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* Send confirmation dialog */}
                <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Confirmar envío</DialogTitle>
                            <DialogDescription>¿Desea enviar esta factura por correo?</DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setSendConfirmOpen(false)}>Cancelar</Button>
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={performSendInvoice}>Enviar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AppLayout>
        );
    }
    

    // Render uses same structure as NewInvoice but without duplicating preview-heavy code here — reuse simple form and items table
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-xl font-semibold mb-6">Editar Factura</h1>
                <div className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Factura</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-md" />
                        </div>
                        <div className="grid gap-2">
                            <Input placeholder="Resumen" value={summary} onChange={(e) => setSummary(e.target.value)} className="max-w-md" />
                        </div>
                    </div>

                    {/* Static Company Info (tenant) */}
                    <div className="py-4">
                        <h3 className="font-medium text-lg text-slate-700">{tenantInfo?.name ?? 'Seguridad BAS'}</h3>
                        <p className="text-sm text-slate-500">{tenantInfo?.address ?? ''}</p>
                        <p className="text-sm text-slate-500">{tenantInfo?.phone ?? ''}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label className="text-xs text-gray-500">Cliente*</Label>
                            <Combobox value={client} onChange={(v) => { setClient(v); setSite(''); loadPostSitesForClient(v); }} options={clients.map(c => ({ value: c.id, label: c.name }))} placeholder="Seleccionar Cliente" />
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">Sitio de publicación*</Label>
                                <Select value={site} onValueChange={setSite}>
                                    <SelectTrigger><SelectValue placeholder="Sitio de publicación*" /></SelectTrigger>
                                    <SelectContent>{postSites.length === 0 ? <SelectItem value="none" disabled>No hay sitios disponibles</SelectItem> : postSites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
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

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Número de Factura*</Label>
                                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs text-gray-500">Número PO/SO</Label>
                                <Input placeholder="Número PO/SO" value={poSoNumber} onChange={(e) => setPoSoNumber(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
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
                                {items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Combobox
                                                    key={`cb-${item.id}-${item.reset ?? 0}`}
                                                    value={item.serviceId ?? item.name}
                                                    onChange={(v) => handleSelectService(item.id, v)}
                                                    options={[
                                                        { value: '__create__', label: '+ Crear nuevo artículo' },
                                                        { value: item.serviceId ?? item.name ?? String(item.id), label: item.name ?? (services.find(s => s.id === item.serviceId)?.name ?? item.name ?? '') },
                                                    ].concat(services.map(s => ({ value: s.id, label: `${s.name} — $${s.price.toFixed(2)}` })))}
                                                    placeholder="Seleccionar o escribir artículo"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setItems(prev => prev.map(it => it.id === item.id ? ({ ...it, serviceId: undefined, name: '', reset: ((it.reset ?? 0) + 1) }) : it));
                                                        // close/blur any active input (attempt to close combobox popover)
                                                        setTimeout(() => { try { (document.activeElement as HTMLElement)?.blur(); } catch (e) { } }, 0);
                                                    }}
                                                    title="Reiniciar artículo"
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="border-0 shadow-none focus-visible:ring-0 px-0" /></TableCell>
                                        <TableCell><Input type="number" min="0" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className="border-0 shadow-none focus-visible:ring-0 px-0" /></TableCell>
                                        <TableCell>
                                            <Select value={String(item.tax)} onValueChange={(v) => updateItem(item.id, 'tax', Number(v))}>
                                                <SelectTrigger className="border-0 shadow-none focus:ring-0 px-0"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">Ninguno</SelectItem>
                                                    {taxes.map(t => <SelectItem key={t.id} value={String(t.rate)}>{t.name} ({t.rate}%)</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">${(item.quantity * item.rate).toFixed(2)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="p-4 bg-white border-t"><Button variant="ghost" className="text-orange-500" onClick={addItem}><Plus className="h-4 w-4 mr-2" />Añadir un artículo</Button></div>
                    </div>

                    <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
                        <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50" onClick={handlePreview}>Vista previa</Button>
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave}>Actualizar Factura</Button>
                    </div>
                </div>
            </div>
                {/* Register Payment Modal */}
                <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar un Pago</DialogTitle>
                            <DialogDescription>Registra un pago para esta factura.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                            <div>
                                <Label>Fecha de Pago</Label>
                                <Input type="date" value={paymentDate ? (paymentDate.toISOString().slice(0,10)) : ''} onChange={(e) => setPaymentDate(e.target.value ? new Date(e.target.value) : undefined)} />
                            </div>
                            <div>
                                <Label>Monto ($)</Label>
                                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} />
                            </div>
                            <div>
                                <Label>Método de Pago</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger><SelectValue placeholder="Método de Pago" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Efectivo</SelectItem>
                                        <SelectItem value="card">Tarjeta</SelectItem>
                                        <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                                        <SelectItem value="other">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Nota</Label>
                                <Textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
                                <Button onClick={submitPayment} disabled={savingPayment}>{savingPayment ? 'Guardando...' : 'Registrar Pago'}</Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
        </AppLayout>
    );
}
