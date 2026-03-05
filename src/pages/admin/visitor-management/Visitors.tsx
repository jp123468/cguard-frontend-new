import { useMemo, useState, FormEvent, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

import {
    Search,
    Filter as FilterIcon,
    MoreVertical,
    Upload,
    FileDown,
    FileSpreadsheet,
    Printer,
    Mail,
    UserPlus,
} from "lucide-react";
import visitorLogService from "@/lib/api/visitorLogService";
import { useTranslation } from 'react-i18next';
import { clientService } from '@/lib/api/clientService';
import { postSiteService } from '@/lib/api/postSiteService';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from "sonner";

type VisitorFilters = {
    client: string;
    site: string;
    guard: string;
    placeType: string;
    tag: string;
    archived: boolean;
};

type NewVisitor = {
    client: string;
    site: string;
    guard: string;
    placeTypeKind?: string;
    placeTypeValue?: string;
    firstName: string;
    lastName: string;
    idNumber: string;
    mobile: string;
    numPeople?: number;
    reason?: string;
};

import * as XLSX from 'xlsx';

export default function Visitors() {
    const [openFilter, setOpenFilter] = useState(false);
    const [openAddVisitor, setOpenAddVisitor] = useState(false);
    const [filters, setFilters] = useState<VisitorFilters>({
        client: "",
        site: "",
        guard: "",
        placeType: "",
        tag: "",
        archived: false,
    });
    const [newVisitor, setNewVisitor] = useState<NewVisitor>({
        client: "",
        site: "",
        guard: "",
        placeTypeKind: '',
        placeTypeValue: '',
        firstName: "",
        lastName: "",
        idNumber: "",
        mobile: "",
        numPeople: 1,
        reason: "",
    });
    const [perPage, setPerPage] = useState("25");
    const [action, setAction] = useState<string | undefined>(undefined);

    const rows: Array<never> = [];

    // --- Visitor Logs (Bitácoras) integration ---
    const [logs, setLogs] = useState<any[]>([]);
    const [logsCount, setLogsCount] = useState(0);
    const [logsLimit, setLogsLimit] = useState(25);
    const [logsOffset, setLogsOffset] = useState(0);
    const [logsSearch, setLogsSearch] = useState("");
    const [logsLoading, setLogsLoading] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState<Record<string, boolean>>({});
    const [viewLogOpen, setViewLogOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [postSites, setPostSites] = useState<any[]>([]);
    const [postSitesForFilter, setPostSitesForFilter] = useState<any[]>([]);
    const [postSitesForNewVisitor, setPostSitesForNewVisitor] = useState<any[]>([]);
    const [guards, setGuards] = useState<any[]>([]);
    const [guardsForFilter, setGuardsForFilter] = useState<any[]>([]);
    const [guardsForNewVisitor, setGuardsForNewVisitor] = useState<any[]>([]);
    const { t } = useTranslation();

    const clientDisplayName = (c: any) => {
        if (!c) return '';
        if (c.displayName) return c.displayName;
        if (c.companyName) return c.companyName;
        // Prefer `name` + `lastName` (backend uses `name` for first name)
        const first = c.name ?? c.firstName ?? '';
        const last = c.lastName ?? '';
        const joined = `${first} ${last}`.trim();
        if (joined) return joined;
        return c.name || c.id || '';
    };

    const getClientLabelFromRecord = (rec: any) => {
        if (!rec) return '-';
        if (rec.client) {
            if (typeof rec.client === 'string' || typeof rec.client === 'number') return String(rec.client);
            return clientDisplayName(rec.client);
        }
        // common id fields
        const id = rec.clientId || rec.clientAccountId || rec.clientAccount || rec.client_id || rec.clientIdAccount;
        if (id && clients && clients.length) {
            const found = clients.find((c) => String(c.id) === String(id) || String(c._id) === String(id));
            if (found) return clientDisplayName(found);
        }
        // fallback to any names present on the record
        const fallback = rec.clientName || rec.clientAccountName || (rec.postSite && (rec.postSite.clientAccountName || rec.postSite.clientName));
        if (fallback) return fallback;
        if (id) return String(id);
        return '-';
    };

    const getPostSiteLabelFromRecord = (rec: any) => {
        if (!rec) return '-';
        if (rec.postSite && typeof rec.postSite === 'object') {
            return rec.postSite.companyName || rec.postSite.name || rec.postSite.postSiteName || '-';
        }
        const id = rec.postSiteId || rec.postSite || rec.postSite_id || rec.postSiteIdValue;
        if (id && postSites && postSites.length) {
            const found = postSites.find((p) => String(p.id) === String(id) || String(p._id) === String(id));
            if (found) return found.companyName || found.name || found.postSiteName || String(id);
        }
        return rec.postSiteName || rec.postSiteTitle || '-';
    };

    const toggleSelectLog = (id: string) => {
        setSelectedLogs((s) => ({ ...s, [id]: !s[id] }));
    };

    const selectAllLogs = (checked: boolean) => {
        if (checked) {
            const map: Record<string, boolean> = {};
            logs.forEach((l) => (map[l.id] = true));
            setSelectedLogs(map);
        } else {
            setSelectedLogs({});
        }
    };

    const handleDeleteSelected = async () => {
        const ids = Object.keys(selectedLogs).filter((k) => selectedLogs[k]);
        if (!ids.length) {
            toast.error(t('guards.deleteNoneSelected') || 'No hay elementos seleccionados');
            return;
        }
        // open confirm modal for bulk delete
        setConfirmDeleteIds(ids);
        setConfirmDeleteOpen(true);
    };

    const handleActionChange = (v: string | undefined) => {
        setAction(v);
        if (!v) return;
        if (v === 'eliminar') {
            handleDeleteSelected();
        } else {
            toast.error(t('guards.actionNotImplemented') || 'Acción no implementada');
        }
        // reset the select so options are ready for next use
        setAction(undefined);
    };

    const viewLog = async (id: string) => {
        try {
            const data = await visitorLogService.get(id);
            setSelectedLog(data || null);
            setViewLogOpen(true);
        } catch (e) {
            console.error('Error loading log', e);
            toast.error(t('visitantes.loadError') || 'No se pudo cargar el registro');
        }
    };

    const markExit = async (id: string) => {
        try {
            const now = new Date().toISOString();
            await visitorLogService.update(id, { exitTime: now });
            toast.success(t('visitantes.exitMarked') || 'Salida marcada');
            setSelectedLogs({});
            fetchLogs();
        } catch (e) {
            console.error('Error marking exit time', e);
            toast.error(t('visitantes.exitError') || 'Error marcando la salida');
        }
    };

    const formatDateTime = (val: string | undefined | null) => {
        if (!val) return '-';
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return String(val);
            return d.toLocaleString();
        } catch (e) {
            return String(val);
        }
    };

    const archiveLog = async (id: string) => {
        if (!confirm(t('visitantes.confirmArchive') || 'Archivar este registro?')) return;
        try {
            await visitorLogService.update(id, { archived: true });
            toast.success(t('visitantes.archived') || 'Registro archivado');
            fetchLogs();
        } catch (e) {
            console.error('Error archiving log', e);
            toast.error(t('visitantes.archiveError') || 'Error archivando registro');
        }
    };

    const deleteLog = async (id: string) => {
        // open confirm modal for single delete
        setConfirmDeleteIds([id]);
        setConfirmDeleteOpen(true);
    };

    const performDeleteConfirmed = async () => {
        if (!confirmDeleteIds || confirmDeleteIds.length === 0) {
            setConfirmDeleteOpen(false);
            return;
        }
        try {
            await visitorLogService.delete(confirmDeleteIds);
            toast.success(t('visitantes.deleted') || 'Registro(s) eliminado(s)');
            setSelectedLogs({});
            setConfirmDeleteOpen(false);
            setConfirmDeleteIds([]);
            fetchLogs();
        } catch (e) {
            console.error('Error deleting logs', e);
            toast.error(t('visitantes.deleteError') || 'Error eliminando registro(s)');
        }
    };


    const handleExportCSV = () => {
        const ids = Object.keys(selectedLogs).filter((k) => selectedLogs[k]);
        if (!ids || ids.length === 0) {
            toast.error(t('visitantes.noSelectionExport') || 'No hay registros seleccionados para exportar');
            return;
        }

        const rowsToExport = logs.filter((r) => ids.includes(String(r.id)));
        if (!rowsToExport.length) {
            toast.error(t('visitantes.noSelectionExport') || 'No hay registros seleccionados para exportar');
            return;
        }

        const keys = ['Date', 'Last name', 'First name', 'ID', 'Reason of visit', 'Exit Time', 'Number of people', 'Client', 'Site'];
        const rowsCsv = rowsToExport.map((r) => ({
            Date: formatDateTime(r.visitDate),
            'Last name': r.lastName ?? '',
            'First name': r.firstName ?? '',
            ID: r.idNumber ?? '',
            'Reason of visit': r.reason ?? '',
            'Exit Time': formatDateTime(r.exitTime),
            'Number of people': r.numPeople ?? '',
            Client: getClientLabelFromRecord(r) || '',
            Site: getPostSiteLabelFromRecord(r) || '',
        }));

        const csv = [keys.join(',')]
            .concat(rowsCsv.map((r) => keys.map((k) => `"${String((r as any)[k] ?? '').replace(/"/g, '""')}"`).join(',')))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bitacoras_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportExcel = () => {
        const ids = Object.keys(selectedLogs).filter((k) => selectedLogs[k]);
        if (!ids || ids.length === 0) {
            toast.error(t('visitantes.noSelectionExport') || 'No hay registros seleccionados para exportar');
            return;
        }

        const rowsToExport = logs.filter((r) => ids.includes(String(r.id)));
        if (!rowsToExport.length) {
            toast.error(t('visitantes.noSelectionExport') || 'No hay registros seleccionados para exportar');
            return;
        }

        // Build array of objects with desired column order
        const data = rowsToExport.map((r) => ({
            Date: formatDateTime(r.visitDate),
            'Last name': r.lastName ?? '',
            'First name': r.firstName ?? '',
            ID: r.idNumber ?? '',
            'Reason of visit': r.reason ?? '',
            'Exit Time': formatDateTime(r.exitTime),
            'Number of people': r.numPeople ?? '',
            Client: getClientLabelFromRecord(r) || '',
            Site: getPostSiteLabelFromRecord(r) || '',
        }));

        try {
            const header = ['Date', 'Last name', 'First name', 'ID', 'Reason of visit', 'Exit Time', 'Number of people', 'Client', 'Site'];
            const worksheet = XLSX.utils.json_to_sheet(data, { header });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Bitacoras');
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bitacoras_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Excel export failed', e);
            toast.error(t('visitantes.exportError') || 'Error exportando a Excel');
        }
    };

    const handleExportPDF = () => {
        const ids = Object.keys(selectedLogs).filter((k) => selectedLogs[k]);
        if (!ids || ids.length === 0) {
            toast.error(t('visitantes.noSelectionExport') || 'No hay registros seleccionados para exportar');
            return;
        }

        const rowsToExport = logs.filter((r) => ids.includes(String(r.id)));
        if (!rowsToExport.length) {
            toast.error(t('visitantes.noSelectionExport') || 'No hay registros seleccionados para exportar');
            return;
        }

        const tableRows = rowsToExport.map((r) => `
                    <tr>
                        <td>${formatDateTime(r.visitDate)}</td>
                        <td>${(r.lastName || '')}</td>
                        <td>${(r.firstName || '')}</td>
                        <td>${(r.idNumber || '')}</td>
                        <td>${(r.reason || '')}</td>
                        <td>${(formatDateTime(r.exitTime) || '')}</td>
                        <td>${(r.numPeople ?? '')}</td>
                        <td>${(getClientLabelFromRecord(r) || '')}</td>
                        <td>${(getPostSiteLabelFromRecord(r) || '')}</td>
                    </tr>
                `).join('');

        const html = `
                        <html>
                        <head>
                            <title>Bitácoras</title>
                            <style>
                                table{border-collapse:collapse;width:100%}
                                th,td{border:1px solid #ccc;padding:6px;text-align:left}
                                th{background:#f5f5f5}
                            </style>
                        </head>
                        <body>
                            <h2>${t('visitantes.bitacoras') || 'Bitácoras'}</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th><th>${t('visitantes.logTable.firstName') || 'Nombre'}</th><th>${t('visitantes.logTable.lastName') || 'Apellidos'}</th><th>${t('visitantes.logTable.idNumber') || 'ID'}</th><th>${t('visitantes.logTable.date') || 'Fecha'}</th><th>${t('visitantes.logTable.site') || 'Sitio'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </body>
                        </html>
                `;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
            w.focus();
            setTimeout(() => { w.print(); }, 500);
        } else {
            toast.error(t('visitantes.printError') || 'No se pudo abrir ventana para imprimir');
        }
    };

    const handlePrintSelected = () => {
        const ids = Object.keys(selectedLogs).filter((k) => selectedLogs[k]);
        if (!ids || ids.length === 0) {
            toast.error(t('visitantes.notprint') || 'No hay registros seleccionados para imprimir');
            return;
        }

        const rowsToPrint = logs.filter((r) => ids.includes(String(r.id)));
        if (!rowsToPrint.length) {
            toast.error(t('visitantes.notprint') || 'No hay registros seleccionados para imprimir');
            return;
        }

        const tableRows = rowsToPrint.map((r) => `
            <tr>
                <td>${formatDateTime(r.visitDate)}</td>
                <td>${(r.lastName || '')}</td>
                <td>${(r.firstName || '')}</td>
                <td>${(r.idNumber || '')}</td>
                <td>${(r.reason || '')}</td>
                <td>${(formatDateTime(r.exitTime) || '')}</td>
                <td>${(r.numPeople ?? '')}</td>
                <td>${(getClientLabelFromRecord(r) || '')}</td>
                <td>${(getPostSiteLabelFromRecord(r) || '')}</td>
            </tr>
        `).join('');

        const html = `
            <html>
            <head>
                <title>Bitácoras - Imprimir</title>
                <style>
                    table{border-collapse:collapse;width:100%}
                    th,td{border:1px solid #ccc;padding:6px;text-align:left}
                    th{background:#f5f5f5}
                </style>
            </head>
            <body>
                <h2>${t('visitantes.bitacoras') || 'Bitácoras'}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th><th>Last name</th><th>First name</th><th>ID</th><th>Reason of visit</th><th>Exit Time</th><th>Number of people</th><th>Client</th><th>Site</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
            w.focus();
            setTimeout(() => { w.print(); }, 500);
        } else {
            toast.error(t('visitantes.printError') || 'No se pudo abrir ventana para imprimir');
        }
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const f: any = {};
            // free-text search: prefer idNumber when numeric, otherwise lastName
            if (logsSearch) {
                const s = String(logsSearch).trim();
                if (!s) {
                    // noop
                } else if (/^[0-9]+$/.test(s)) {
                    f.idNumber = s;
                } else {
                    // search both first and last name for non-numeric queries
                    f.query = s;
                }
            }

            // apply filter controls
            if (filters.client) f.clientId = filters.client;
            if (filters.site) f.postSiteId = filters.site;
            if (filters.guard) f.guardId = filters.guard;
            if (filters.placeType) f.placeType = filters.placeType;
            if (filters.tag) f.tag = filters.tag;
            if (typeof filters.archived === 'boolean') f.archived = filters.archived;

            const resp = await visitorLogService.list(f, { limit: logsLimit, offset: logsOffset });
            setLogs(resp.rows || []);
            setLogsCount(resp.count || 0);
        } catch (err) {
            console.error('Error fetching visitor logs', err);
        } finally {
            setLogsLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [logsLimit, logsOffset]);
    // when filter client changes, load postSites for that client
    useEffect(() => {
        const load = async () => {
            try {
                if (!filters.client) {
                    // no client selected -> empty list
                    setPostSitesForFilter([]);
                    return;
                }
                const resp = await postSiteService.list({ clientId: filters.client }, { limit: 200, offset: 0 } as any);
                setPostSitesForFilter(resp.rows || []);
                // clear dependent selects when client changes
                setFilters((s) => ({ ...s, site: '', guard: '' }));
            } catch (e) {
                console.error('Failed to load post sites for filter', e);
            }
        };
        load();
    }, [filters.client]);

    // when newVisitor.client changes, load postSites for that client (used in add visitor form)
    useEffect(() => {
        const load = async () => {
            try {
                if (!newVisitor.client) {
                    setPostSitesForNewVisitor([]);
                    return;
                }
                const resp = await postSiteService.list({ clientId: newVisitor.client }, { limit: 200, offset: 0 } as any);
                setPostSitesForNewVisitor(resp.rows || []);
                setNewVisitor((s) => ({ ...s, site: '', guard: '' }));
            } catch (e) {
                console.error('Failed to load post sites for new visitor form', e);
            }
        };
        load();
    }, [newVisitor.client]);

    // when filter client changes, load guards for that client
    useEffect(() => {
        const loadGuards = async () => {
            try {
                if (!filters.client) {
                    setGuardsForFilter([]);
                    return;
                }
                const resp = await securityGuardService.list({ 'filter[clientId]': filters.client, limit: 200, offset: 0 } as any);
                const list = Array.isArray(resp) ? resp : (resp.rows || []);
                setGuardsForFilter(list || []);
            } catch (e) {
                console.error('Failed to load guards for filter', e);
            }
        };
        loadGuards();
    }, [filters.client]);

    // when newVisitor.client changes, load guards for that client (used in add visitor form)
    useEffect(() => {
        const loadGuards = async () => {
            try {
                if (!newVisitor.client) {
                    setGuardsForNewVisitor([]);
                    return;
                }
                const resp = await securityGuardService.list({ 'filter[clientId]': newVisitor.client, limit: 200, offset: 0 } as any);
                const list = Array.isArray(resp) ? resp : (resp.rows || []);
                setGuardsForNewVisitor(list || []);
            } catch (e) {
                console.error('Failed to load guards for new visitor form', e);
            }
        };
        loadGuards();
    }, [newVisitor.client]);
    useEffect(() => {
        // load clients, post sites and guards for selects
        const load = async () => {
            try {
                const cResp = await clientService.getClients(undefined, { limit: 100, offset: 0 });
                setClients(cResp.rows || []);
            } catch (e) {
                console.error('Failed to load clients', e);
            }

            try {
                const pResp = await postSiteService.list({}, { limit: 100, offset: 0 } as any);
                const rows = pResp.rows || [];
                setPostSites(rows);
                // Do not preload per-client lists — keep them empty until a client is selected
                setPostSitesForFilter([]);
                setPostSitesForNewVisitor([]);
            } catch (e) {
                console.error('Failed to load post sites', e);
            }

            try {
                const gResp = await securityGuardService.list({ limit: 100, offset: 0 } as any);
                // securityGuardService.list returns { rows, count } or array
                const guardsList = Array.isArray(gResp) ? gResp : (gResp.rows || []);
                setGuards(guardsList || []);
                // Do not preload per-client guard lists
                setGuardsForFilter([]);
                setGuardsForNewVisitor([]);
            } catch (e) {
                console.error('Failed to load guards', e);
            }
        };

        load();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => { setLogsOffset(0); fetchLogs(); }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logsSearch]);

    const perPageText = useMemo(() => {
        if (perPage === "10") return "10";
        if (perPage === "50") return "50";
        return "25";
    }, [perPage]);

    const onSubmitFilters = (e: FormEvent) => {
        e.preventDefault();
        console.log("Aplicando filtros:", filters);
        // reset paging and refetch with new filters
        setLogsOffset(0);
        fetchLogs();
        setOpenFilter(false);
    };

    const onSubmitVisitor = async (e: FormEvent) => {
        e.preventDefault();
        // Validate required fields
        const missing: string[] = [];
        if (!newVisitor.client) missing.push(t('visitantes.client') || 'Cliente');
        if (!newVisitor.site) missing.push(t('visitantes.site') || 'Sitio');
        if (!newVisitor.guard) missing.push(t('visitantes.guard') || 'Guardia');
        if (!newVisitor.firstName) missing.push(t('visitantes.form.name') || 'Nombre');
        if (!newVisitor.lastName) missing.push(t('visitantes.form.lastName') || 'Apellidos');
        if (!newVisitor.idNumber) missing.push(t('visitantes.form.idNumber') || 'Número de identificación');
        if (!newVisitor.mobile) missing.push(t('visitantes.form.mobile') || 'Número de Móvil');
        if (!newVisitor.numPeople || Number(newVisitor.numPeople) < 1) missing.push(t('visitantes.form.numPeople') || 'Número de personas');

        if (missing.length) {
            toast.error(`${t('visitantes.missingFields') || 'Faltan campos obligatorios'}: ${missing.join(', ')}`);
            return;
        }

        try {
            // Build payload. Set visitDate to now (ISO)
            const now = new Date();
            const payload: any = {
                visitDate: now.toISOString(),
                firstName: newVisitor.firstName,
                lastName: newVisitor.lastName,
                idNumber: newVisitor.idNumber,
                mobile: newVisitor.mobile,
                numPeople: newVisitor.numPeople || 1,
                reason: newVisitor.reason || undefined,
                clientId: newVisitor.client,
                postSiteId: newVisitor.site,
                guardId: newVisitor.guard,
                // combine type and value into a single string, e.g. "DEPARTAMENTO - 24"
                placeType: newVisitor.placeTypeKind && newVisitor.placeTypeValue ? `${newVisitor.placeTypeKind.toUpperCase()} - ${newVisitor.placeTypeValue}` : (newVisitor.placeTypeValue || undefined),
            };

            const created = await visitorLogService.create(payload);
            // created should include visitDate from backend
            const createdVisitDate = created?.visitDate;
            const createdDateObj = createdVisitDate ? new Date(createdVisitDate) : null;
            const diffMs = createdDateObj ? Math.abs(createdDateObj.getTime() - now.getTime()) : null;

            toast.success(t('visitantes.created') || 'Visitante creado');
            setOpenAddVisitor(false);
            setNewVisitor((s) => ({ ...s, firstName: '', lastName: '', idNumber: '', mobile: '', client: '', site: '', guard: '', placeTypeKind: '', placeTypeValue: '', numPeople: 1, reason: '' } as any));
            fetchLogs();

            // Internal logging only: do not display visitDate information to the user
            if (diffMs !== null && diffMs <= 5000) {
                console.debug('visitDate synced:', createdVisitDate);
            } else if (createdVisitDate) {
                console.debug('visitDate received:', createdVisitDate);
            } else {
                console.debug('visitDate missing from create response');
            }
        } catch (e) {
            console.error('Error creating visitor', e);
            toast.error(t('visitantes.createError') || 'Error creando visitante');
        }
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={
                    [
                        { label: t('visitantes.dashboard') || 'Panel de control', path: '/dashboard' },
                        { label: t('visitantes.title') || 'Visitantes' },
                    ]
                }
            />

            <section className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Select value={action} onValueChange={(v) => { handleActionChange(v); setAction(''); }}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder={t('actions.action') || 'Acción'} />
                            </SelectTrigger>
                            <SelectContent>
                                {/* <SelectItem value="activar">{t('actions.activate') || 'Activar'}</SelectItem> */}
                                {/* <SelectItem value="inactivar">{t('actions.desactivate') || 'Inactivar'}</SelectItem> */}
                                <SelectItem value="eliminar">{t('actions.delete') || 'Eliminar'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="w-72 pl-9"
                                placeholder={t('visitantes.searchVisitor') || 'Buscar visitante'}
                                onChange={(e) => setLogsSearch(e.target.value)}
                            />
                        </div>

                        <Button
                            className="bg-orange-500 text-white hover:bg-orange-600"
                            type="button"
                            onClick={() => setOpenAddVisitor(true)}
                        >
                            {t('visitantes.addVisitor') || 'Añadir visitante'}
                        </Button>

                        <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                            <SheetTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-orange-200 text-orange-600"
                                >
                                    <FilterIcon className="mr-2 h-4 w-4" />
                                    {t('visitantes.filters') || 'Filtros'}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full max-w-md h-full sm:h-auto">
                                <SheetHeader>
                                    <SheetTitle>{t('visitantes.filters') || 'Filtros'}</SheetTitle>
                                </SheetHeader>

                                <form className="mt-6 space-y-5" onSubmit={onSubmitFilters}>
                                    <div className="space-y-2">
                                        <Label>{t('visitantes.client') || 'Cliente*'}</Label>
                                        <Select
                                            value={filters.client}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, client: v }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('visitantes.selectClient') || 'Selecciona un cliente'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clients.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>{clientDisplayName(c)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('visitantes.site') || 'Sitio de publicación*'}</Label>
                                        <Select
                                            value={filters.site}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, site: v }))
                                            }
                                            disabled={postSitesForFilter.length === 0}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('visitantes.selectSite') || 'Selecciona un sitio'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {postSitesForFilter.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.companyName || p.name || p.id}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('visitantes.guard') || 'Guardia'}</Label>
                                        <Select
                                            value={filters.guard}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, guard: v }))
                                            }
                                            disabled={guardsForFilter.length === 0}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('visitantes.selectGuard') || 'Selecciona un guardia'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {guardsForFilter.map((g) => (
                                                    <SelectItem key={g.id} value={g.id}>{g.fullName || g.displayName || g.name || g.id}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('visitantes.placeType') || 'Tipo de lugar'}</Label>
                                        <Input
                                            value={filters.placeType}
                                            onChange={(e) => setFilters((s) => ({ ...s, placeType: e.target.value }))}
                                            placeholder={t('visitantes.placeTypeFilterPlaceholder') || 'Ej: DEPARTAMENTO - 24'}
                                        />
                                    </div>
                                    {/*
                                    <div className="space-y-2">
                                        <Label>{t('visitantes.tag') || 'Etiqueta'}</Label>
                                        <Select
                                            value={filters.tag}
                                            onValueChange={(v) =>
                                                setFilters((s) => ({ ...s, tag: v }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('visitantes.selectTag') || 'Selecciona una etiqueta'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="vip">{t('visitantes.tag.vip') || 'VIP'}</SelectItem>
                                                <SelectItem value="proveedor">{t('visitantes.tag.provider') || 'Proveedor'}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>*/}
                                    <div className="flex items-center gap-2 pt-2">
                                        <Checkbox
                                            id="archived"
                                            checked={filters.archived}
                                            onCheckedChange={(checked) =>
                                                setFilters((s) => ({
                                                    ...s,
                                                    archived: Boolean(checked),
                                                }))
                                            }
                                        />
                                        <Label htmlFor="archived" className="text-sm font-normal">
                                            {t('visitantes.showArchived') || 'Mostrar datos archivados'}
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="mt-4 w-full bg-orange-500 text-white hover:bg-orange-600"
                                    >
                                        {t('visitantes.filterButton') || 'Filtro'}
                                    </Button>
                                </form>
                            </SheetContent>
                        </Sheet>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-full border-slate-200 text-slate-600"
                                    type="button"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={handleExportCSV}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    {t('visitantes.exportCSV') || 'Exportar CSV'}
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={handleExportPDF}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('visitantes.exportPDF') || 'Exportar PDF'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePrintSelected}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('visitantes.print') || 'Imprimir'}
                                </DropdownMenuItem>
                                {/*<DropdownMenuItem onClick={() => console.log('Correo') }>
                                    <Mail className="mr-2 h-4 w-4" />
                                    {t('visitantes.email') || 'Correo Electrónico'}
                                </DropdownMenuItem>*/}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border">
                    {/* Desktop table (hidden on small screens) */}
                    <div className="bg-white border rounded p-4 md:block hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 text-left text-sm text-gray-600">
                                    <tr>
                                        <th className="px-4 py-2">
                                            <input type="checkbox" onChange={(e) => selectAllLogs(e.target.checked)} checked={logs.length > 0 && Object.keys(selectedLogs).length > 0 && logs.every(l => selectedLogs[l.id])} />
                                        </th>
                                        <th className="px-4 py-2">{t('visitantes.logTable.firstName') || 'Nombre'}</th>
                                        <th className="px-4 py-2">{t('visitantes.logTable.lastName') || 'Apellidos'}</th>
                                        <th className="px-4 py-2">{t('visitantes.logTable.idNumber') || 'ID'}</th>
                                        <th className="px-4 py-2">{t('visitantes.logTable.client') || 'Cliente'}</th>
                                        <th className="px-4 py-2">{t('visitantes.logTable.postSite') || 'Post Site'}</th>
                                        <th className="px-4 py-2">{t('visitantes.logTable.date') || 'Fecha'}</th>
                                        <th className="px-4 py-2 text-right" />
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {logsLoading ? (
                                        <tr>
                                            <td colSpan={12} className="p-6 text-center">{t('visitantes.loading') || 'Cargando...'}</td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={12} className="p-6 text-center text-muted-foreground">{t('visitantes.noLogs') || 'No se encontraron registros de bitácoras'}</td>
                                        </tr>
                                    ) : (
                                        logs.map((r) => (
                                            <tr key={r.id} className="text-sm">
                                                <td className="px-4 py-3">
                                                    <input type="checkbox" checked={!!selectedLogs[r.id]} onChange={() => toggleSelectLog(r.id)} />
                                                </td>
                                                <td className="px-4 py-3">{r.firstName}</td>
                                                <td className="px-4 py-3">{r.lastName}</td>
                                                <td className="px-4 py-3">{r.idNumber}</td>
                                                <td className="px-4 py-3">{getClientLabelFromRecord(r)}</td>
                                                <td className="px-4 py-3">{r.postSite?.companyName || r.postSite?.name || r.postSiteName || '-'}</td>
                                                <td className="px-4 py-3">{formatDateTime(r.visitDate)}</td>
                                                <td className="px-2 py-3 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => viewLog(r.id)}>{t('actions.viewDetails') || 'Ver detalles'}</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => markExit(r.id)} disabled={!!r.exitTime}>{t('visitantes.markExit') || 'Marcar salida'}</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => deleteLog(r.id)}>{t('actions.delete') || 'Eliminar'}</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile list (cards) visible on small screens */}
                    <div className="md:hidden p-2 space-y-3">
                        {logsLoading ? (
                            <div className="p-4 bg-white rounded text-center">{t('visitantes.loading') || 'Cargando...'}</div>
                        ) : logs.length === 0 ? (
                            <div className="p-4 bg-white rounded text-center text-muted-foreground">{t('visitantes.noLogs') || 'No se encontraron registros de bitácoras'}</div>
                        ) : (
                            logs.map((r) => (
                                <div key={r.id} className="bg-white rounded-lg border p-3 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-base font-medium">{r.firstName} {r.lastName}</div>
                                        <div className="text-sm text-gray-500">{formatDateTime(r.visitDate)}</div>
                                    </div>
                                    <div className="text-sm text-gray-600">{t('visitantes.logTable.idNumber') || 'ID'}: {r.idNumber || '-'}</div>
                                    <div className="text-sm text-gray-600">{t('visitantes.logTable.client') || 'Cliente'}: {getClientLabelFromRecord(r)}</div>
                                    <div className="text-sm text-gray-600">{t('visitantes.logTable.postSite') || 'Post Site'}: {r.postSite?.companyName || r.postSite?.name || r.postSiteName || '-'}</div>
                                    <div className="flex items-center justify-end mt-2 space-x-2">
                                        <Button size="sm" variant="ghost" onClick={() => viewLog(r.id)}>{t('actions.viewDetails') || 'Ver'}</Button>
                                        <Button size="sm" variant="ghost" onClick={() => markExit(r.id)} disabled={!!r.exitTime}>{t('visitantes.markExit') || 'Salida'}</Button>
                                        <Button size="sm" className="bg-red-600 text-white" onClick={() => deleteLog(r.id)}>{t('actions.delete') || 'Eliminar'}</Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                </div>

                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">{t('clients.pagination.itemsPerPage') || 'Elementos por página'}</span>
                        <select
                            className="rounded border px-2 py-1 text-sm"
                            value={logsLimit}
                            onChange={(e) => { setLogsLimit(Number(e.target.value)); setLogsOffset(0); }}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                            {logsCount === 0
                                ? `0 - 0 de 0`
                                : `${Math.min(logsOffset + 1, logsCount)} - ${Math.min(logsOffset + logsLimit, logsCount)} de ${logsCount}`}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={logsOffset === 0}
                                onClick={() => setLogsOffset(Math.max(0, logsOffset - logsLimit))}
                            >
                                ◀
                            </Button>

                            <div className="text-sm text-gray-600">
                                {Math.floor(logsOffset / logsLimit) + 1} / {Math.max(1, Math.ceil(logsCount / logsLimit))}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={logsOffset + logsLimit >= logsCount}
                                onClick={() => setLogsOffset(Math.min(logsOffset + logsLimit, (Math.ceil(logsCount / logsLimit) - 1) * logsLimit))}
                            >
                                ▶
                            </Button>
                        </div>
                    </div>
                </div>
        </section>

            {
        confirmDeleteOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                <div className="fixed inset-0 bg-black opacity-40" onClick={() => setConfirmDeleteOpen(false)} />
                <div className="bg-white rounded-t-lg sm:rounded-lg shadow-lg w-full sm:max-w-md z-10 p-4 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900">{t('visitantes.confirmDeleteTitle') || 'Confirmar eliminación'}</h3>
                    <p className="mt-2 text-sm text-gray-600">{t('visitantes.confirmDeleteMessage') || `¿Estás seguro de que deseas eliminar ${confirmDeleteIds.length} registro(s)? Esta acción no se puede deshacer.`}</p>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => { setConfirmDeleteOpen(false); setConfirmDeleteIds([]); }}> {t('actions.cancel') || 'Cancelar'} </Button>
                        <Button className="bg-red-600 text-white hover:bg-red-700" onClick={performDeleteConfirmed}>{t('actions.delete') || 'Eliminar'}</Button>
                    </div>
                </div>
            </div>
        )
    }
    <>
        <Sheet open={viewLogOpen} onOpenChange={setViewLogOpen}>
            <SheetContent side="right" className="w-full max-w-lg h-full sm:h-auto">
                <SheetHeader>
                    <SheetTitle>{t('visitantes.logDetails') || 'Detalles del registro'}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                    {!selectedLog ? (
                        <div className="text-gray-500">{t('visitantes.loading') || 'Cargando...'}</div>
                    ) : (
                        <dl className="grid grid-cols-1 gap-3">
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.date') || 'Fecha'}</dt>
                                <dd className="text-base text-gray-800">{formatDateTime(selectedLog.visitDate)}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.lastName') || 'Apellidos'}</dt>
                                <dd className="text-base text-gray-800">{selectedLog.lastName || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.firstName') || 'Nombre'}</dt>
                                <dd className="text-base text-gray-800">{selectedLog.firstName || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.idNumber') || 'ID'}</dt>
                                <dd className="text-base text-gray-800">{selectedLog.idNumber || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.reason') || 'Motivo'}</dt>
                                <dd className="text-base text-gray-800">{selectedLog.reason || selectedLog.visitReason || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.exitTime') || 'Hora de salida'}</dt>
                                <dd className="text-base text-gray-800">{formatDateTime(selectedLog.exitTime || selectedLog.exitAt || selectedLog.leaveTime)}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.numPeople') || 'Número de personas'}</dt>
                                <dd className="text-base text-gray-800">{selectedLog.numPeople || selectedLog.peopleCount || selectedLog.numberPeople || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.client') || 'Cliente'}</dt>
                                <dd className="text-base text-gray-800">{getClientLabelFromRecord(selectedLog)}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.postSite') || 'Post Site'}</dt>
                                <dd className="text-base text-gray-800">{getPostSiteLabelFromRecord(selectedLog)}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-600">{t('visitantes.logTable.placeType') || 'Tipo de lugar'}</dt>
                                <dd className="text-base text-gray-800">{selectedLog.placeType || '-'}</dd>
                            </div>
                        </dl>
                    )}
                </div>
            </SheetContent>
        </Sheet>

        <Sheet open={openAddVisitor} onOpenChange={setOpenAddVisitor}>
            <SheetContent side="right" className="w-full max-w-xl h-full sm:h-auto">
                <SheetHeader className="mb-4">
                    <SheetTitle>{t('visitantes.newVisitor') || 'Nuevo Visitante'}</SheetTitle>
                </SheetHeader>

                <form className="space-y-4" onSubmit={onSubmitVisitor}>


                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label>{t('visitantes.client') || 'Cliente'}<span className="text-red-600">*</span></Label>
                            <Select
                                value={newVisitor.client}
                                onValueChange={(v) =>
                                    setNewVisitor((s) => ({ ...s, client: v }))
                                }
                                aria-required="true"
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('visitantes.selectClient') || 'Selecciona un cliente'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{clientDisplayName(c)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('visitantes.site') || 'Sitio de publicación'}<span className="text-red-600">*</span></Label>
                            <Select
                                value={newVisitor.site}
                                onValueChange={(v) =>
                                    setNewVisitor((s) => ({ ...s, site: v }))
                                }
                                disabled={postSitesForNewVisitor.length === 0}
                                aria-required="true"
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('visitantes.selectSite') || 'Selecciona un sitio'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {postSitesForNewVisitor.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.companyName || p.name || p.id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('visitantes.guard') || 'Guardia'}<span className="text-red-600">*</span></Label>
                            <Select
                                value={newVisitor.guard}
                                onValueChange={(v) =>
                                    setNewVisitor((s) => ({ ...s, guard: v }))
                                }
                                disabled={guardsForNewVisitor.length === 0}
                                aria-required="true"
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('visitantes.selectGuard') || 'Selecciona un guardia'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {guardsForNewVisitor.map((g) => (
                                        <SelectItem key={g.id} value={g.id}>{g.fullName || g.displayName || g.name || g.id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('visitantes.placeTypeSelect') || 'Tipo de lugar'}</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Select
                                    value={newVisitor.placeTypeKind}
                                    onValueChange={(v) => setNewVisitor((s) => ({ ...s, placeTypeKind: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('visitantes.placeTypeSelect') || 'Selecciona tipo'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Casa">{t('visitantes.placeType.house') || 'Casa'}</SelectItem>
                                        <SelectItem value="Departamento">{t('visitantes.placeType.apartment') || 'Departamento'}</SelectItem>
                                        <SelectItem value="Oficina">{t('visitantes.placeType.office') || 'Oficina'}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Input
                                    value={newVisitor.placeTypeValue}
                                    onChange={(e) => setNewVisitor((s) => ({ ...s, placeTypeValue: e.target.value }))}
                                    placeholder={t('visitantes.placeTypeValue') || 'Nro/Detalle (24)'}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('visitantes.form.name') || 'Nombre'}<span className="text-red-600">*</span></Label>
                            <Input
                                value={newVisitor.firstName}
                                onChange={(e) =>
                                    setNewVisitor((s) => ({ ...s, firstName: e.target.value }))
                                }
                                placeholder={t('visitantes.placeholder.name') || 'Nombre'}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('visitantes.form.lastName') || 'Apellidos'}<span className="text-red-600">*</span></Label>
                            <Input
                                value={newVisitor.lastName}
                                onChange={(e) =>
                                    setNewVisitor((s) => ({ ...s, lastName: e.target.value }))
                                }
                                placeholder={t('visitantes.placeholder.lastName') || 'Apellidos'}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('visitantes.form.idNumber') || 'Número de identificación'}<span className="text-red-600">*</span></Label>
                            <Input
                                value={newVisitor.idNumber}
                                onChange={(e) =>
                                    setNewVisitor((s) => ({ ...s, idNumber: e.target.value }))
                                }
                                placeholder={t('visitantes.placeholder.idNumber') || 'e.g. 12015550123'}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('visitantes.form.idImage') || 'Imagen del ID'}</Label>
                            <Input type="file" />
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('visitantes.form.mobile') || 'Número de Móvil'}<span className="text-red-600">*</span></Label>
                            <Input
                                value={newVisitor.mobile}
                                onChange={(e) =>
                                    setNewVisitor((s) => ({ ...s, mobile: e.target.value }))
                                }
                                placeholder={t('visitantes.placeholder.mobile') || 'e.g. +12015550123'}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('visitantes.form.numPeople') || 'Número de personas'}<span className="text-red-600">*</span></Label>
                            <Input
                                type="number"
                                min={1}
                                value={newVisitor.numPeople ?? ''}
                                onChange={(e) =>
                                    setNewVisitor((s) => ({ ...s, numPeople: e.target.value ? Number(e.target.value) : undefined }))
                                }
                                placeholder={t('visitantes.placeholder.numPeople') || '1'}
                                required
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <Label>{t('visitantes.form.reason') || 'Motivo'}</Label>
                            <textarea
                                className="w-full rounded border px-3 py-2"
                                value={newVisitor.reason ?? ''}
                                onChange={(e) =>
                                    setNewVisitor((s) => ({ ...s, reason: e.target.value }))
                                }
                                placeholder={t('visitantes.placeholder.reason') || 'Motivo de la visita'}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            type="submit"
                            className="bg-orange-500 text-white hover:bg-orange-600"
                        >
                            {t('visitantes.save') || 'Guardar'}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    </>
        </AppLayout >
    );
}
