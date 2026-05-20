import React, { useState, useRef, useEffect } from 'react';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { Search, ChevronDown, Plus, X, EllipsisVertical, Eye, Trash, Edit } from 'lucide-react';
import MobileCardList from '@/components/responsive/MobileCardList';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AssignGuards({ site }: { site?: any }) {
    const { t } = useTranslation();

    const [actionOpen, setActionOpen] = useState(false);
    const [actionSelection, setActionSelection] = useState<string>(t('clients.assignGuards.actionDefault', 'Action'));
    const [query, setQuery] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);

    const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
    const [selectedGuard, setSelectedGuard] = useState<string | null>(null);
    const [guardQuery, setGuardQuery] = useState('');
    const [showGuardsDropdown, setShowGuardsDropdown] = useState(false);

    const [guardOptions, setGuardOptions] = useState<{ id: string; name: string }[]>([]);
    const [assignedGuards, setAssignedGuards] = useState<any[]>([]);
    const [stations, setStations] = useState<any[]>([]);
    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    const [showNewStation, setShowNewStation] = useState(false);
    const [newStationName, setNewStationName] = useState('');
    const [newStationStart, setNewStationStart] = useState('');
    const [newStationEnd, setNewStationEnd] = useState('');
    const [creatingStation, setCreatingStation] = useState(false);
    const navigate = useNavigate();

    const guardDropdownRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useScrollToTopOnMount(containerRef);

    useEffect(() => {
        const onDocClick = (e: any) => {
            if (!showGuardsDropdown) return;
            if (guardDropdownRef.current && !guardDropdownRef.current.contains(e.target)) {
                setShowGuardsDropdown(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowGuardsDropdown(false);
        };
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('click', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [showGuardsDropdown]);

    const [viewAssignments, setViewAssignments] = useState<any[]>([]);
    const [viewModalOpen, setViewModalOpen] = useState(false);

    // Helpers to resolve display names from possible fields returned by backend
    const resolveTenantUserName = (rec: any) => {
        return (
            rec?.tenantUser?.fullName ||
            (rec?.tenantUser?.user && `${rec.tenantUser.user.firstName || ''} ${rec.tenantUser.user.lastName || ''}`.trim()) ||
            rec?.tenantUserName ||
            rec?.tenantUserFullName ||
            rec?.tenantUser ||
            rec?.tenantUserId ||
            rec?.tenant_user_id ||
            '-'
        );
    };

    const resolveBusinessInfoName = (rec: any) => {
        return (
            rec?.businessInfo?.name ||
            rec?.postSiteName ||
            rec?.businessInfoName ||
            rec?.businessInfo ||
            rec?.businessInfoId ||
            rec?.business_info_id ||
            '-'
        );
    };

    const resolveSecurityGuardName = (rec: any) => {
        const guardNameFromGuard = rec?.guard ? (rec.guard.fullName || `${rec.guard.firstName || ''} ${rec.guard.lastName || ''}`.trim()) : null;
        const guardNameFromSecurityGuard = rec?.securityGuard ? (rec.securityGuard.fullName || `${rec.securityGuard.firstName || ''} ${rec.securityGuard.lastName || ''}`.trim()) : null;
        const guardNameFromFields = (rec?.guardFirstName || rec?.guardLastName) ? `${rec.guardFirstName || ''} ${rec.guardLastName || ''}`.trim() : null;

        return (
            guardNameFromGuard ||
            guardNameFromSecurityGuard ||
            guardNameFromFields ||
            rec?.securityGuardName ||
            rec?.security_guard_name ||
            rec?.security_guard_id ||
            rec?.securityGuardId ||
            rec?.guardId ||
            '-'
        );
    };

    // Match a row against the current query (name, email, phone)
    const matchesQuery = (row: any, q: string) => {
        if (!q) return true;
        const s = q.trim().toLowerCase();
        const name = (row.guardName || row.fullName || row.name || '').toString().toLowerCase();
        const email = (row.email || '').toString().toLowerCase();
        const phone = (row.phoneNumber || row.mobile || '').toString().toLowerCase();
        return name.includes(s) || email.includes(s) || phone.includes(s);
    };

    const handleView = async (g: any) => {
        try {
            const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
            const idToUse = g.securityGuardId || g.guardUserId || g.userId || g.guardId || g.tenantUserUserId || null;
            if (!idToUse) {
                toast.info(t('clients.assignGuards.noGuardIdentifier', 'No guard identifier available'));
                return;
            }
            const resp = await ApiService.get(`/tenant/${tenantId}/security-guard/${idToUse}/assignments`);
            const rows = resp && resp.rows ? resp.rows : (Array.isArray(resp) ? resp : []);
            // Resolve names for each assignment row (businessInfo, guard, tenantUser)
            const businessCache: Record<string, any> = {};
            const guardCache: Record<string, any> = {};

            await Promise.all((rows || []).map(async (row: any) => {
                try {
                    const bizId = row.businessInfoId || row.business_info_id || row.postSiteId || row.postSiteId;
                    if (bizId && !row.businessInfoName && !businessCache[bizId]) {
                        try {
                            const r = await ApiService.get(`/tenant/${tenantId}/post-site/${bizId}`, { toast: { silentError: true } } as any);
                            const b = r && (r.data || r) ? (r.data || r) : r;
                            businessCache[bizId] = b;
                            row.businessInfoName = b && (b.name || b.postSiteName) || null;
                        } catch (e) {
                            businessCache[bizId] = null;
                        }
                    } else if (bizId && businessCache[bizId]) {
                        const b = businessCache[bizId];
                        row.businessInfoName = b && (b.name || b.postSiteName) || null;
                    }

                    const sgId = row.security_guard_id || row.securityGuardId || row.guardId || row.guard?.id || row.guardId;
                    if (sgId && !row.guardName && !guardCache[sgId]) {
                        try {
                            const r = await ApiService.get(`/tenant/${tenantId}/security-guard/${sgId}`, { toast: { silentError: true } } as any);
                            let g2 = r && (r.data || r) ? (r.data || r) : r;
                            // Try tenant public then global public if tenant-scoped fetch didn't include a name
                            let resolvedName = g2 && (g2.fullName || (g2.guard && (g2.guard.fullName || `${g2.guard.firstName || ''} ${g2.guard.lastName || ''}`.trim())) || (g2.firstName || g2.lastName ? `${g2.firstName || ''} ${g2.lastName || ''}`.trim() : null));
                            if (!resolvedName) {
                                try {
                                    const pubUrl = tenantId ? `/tenant/${tenantId}/security-guard/public?securityGuardId=${encodeURIComponent(String(sgId))}` : `/security-guard/public?securityGuardId=${encodeURIComponent(String(sgId))}`;
                                    const p = await ApiService.get(pubUrl, { toast: { silentError: true } } as any).catch(() => null);
                                    const pData = p && (p.data || p) ? (p.data || p) : p;
                                    if (pData) {
                                        resolvedName = pData.fullName || (pData.guard && (pData.guard.fullName || `${pData.guard.firstName || ''} ${pData.guard.lastName || ''}`.trim())) || (pData.firstName || pData.lastName ? `${pData.firstName || ''} ${pData.lastName || ''}`.trim() : null) || resolvedName;
                                        // prefer using public payload for cache if tenant fetch was empty
                                        if (!g2 || !g2.fullName) g2 = pData;
                                    }
                                } catch (e) {
                                    // ignore
                                }
                            }

                            guardCache[sgId] = g2;
                            row.guardName = resolvedName || null;
                        } catch (e) {
                            guardCache[sgId] = null;
                        }
                    } else if (sgId && guardCache[sgId]) {
                        const g2 = guardCache[sgId];
                        const resolvedName = g2 && (g2.fullName || (g2.guard && (g2.guard.fullName || `${g2.guard.firstName || ''} ${g2.guard.lastName || ''}`.trim())) || (g2.firstName || g2.lastName ? `${g2.firstName || ''} ${g2.lastName || ''}`.trim() : null));
                        row.guardName = resolvedName || null;
                    }

                    if (!row.tenantUserName) {
                        if (row.tenantUser && row.tenantUser.user) {
                            row.tenantUserName = `${row.tenantUser.user.firstName || ''} ${row.tenantUser.user.lastName || ''}`.trim();
                        } else if (row.guardName) {
                            row.tenantUserName = row.guardName;
                        }
                    }
                } catch (e) {
                    // ignore per-row resolution errors
                }
            }));

            setViewAssignments(rows);
            setViewModalOpen(true);
        } catch (err: any) {
            console.error('Failed to load guard assignments', err);
            const message = err?.data?.message || err?.message || t('clients.assignGuards.failedLoadAssignments', 'Failed to load guard assignments');
            toast.error(message);
        }
    };

    const [pendingDeleteAssignment, setPendingDeleteAssignment] = useState<any | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false);

    const handleDelete = (g: any) => {
        setPendingDeleteAssignment(g);
        setOpenDeleteDialog(true);
    };

    const confirmDelete = async () => {
        const g = pendingDeleteAssignment;
        if (!g) {
            setOpenDeleteDialog(false);
            return;
        }
        try {
            const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
            const postSiteId = site?.id || '';
            if (!tenantId || !postSiteId) throw new Error('Missing tenant or post site id');
            // Support deleting assignments from different sources
            if (g.source === 'shift') {
                await ApiService.delete(`/tenant/${tenantId}/shift/${g.id}`);
            } else if (g.source === 'guardShift') {
                await ApiService.delete(`/tenant/${tenantId}/guard-shift/${g.id}`);
            } else {
                await ApiService.delete(`/tenant/${tenantId}/post-site/${postSiteId}/guards/${g.id}`);
            }
            setAssignedGuards((prev) => prev.filter((x) => x.id !== g.id));
            toast.success(t('clients.assignGuards.assignmentRemoved', 'Assignment removed'));
            try {
                window.dispatchEvent(new CustomEvent('assignments:changed', { detail: { action: 'delete', id: g.id } }));
            } catch (e) {}
        } catch (err: any) {
            console.error('Failed to remove assignment', err);
            const msg = err?.response?.data?.message ?? err?.message ?? t('clients.assignGuards.removeFailed', 'Failed to remove assignment');
            toast.error(msg);
        } finally {
            setPendingDeleteAssignment(null);
            setOpenDeleteDialog(false);
        }
    };

    // Selection handlers for bulk actions
    const toggleSelect = (id: string) => {
        setSelectedGuards(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            return [...prev, id];
        });
    };

    const toggleSelectAll = () => {
        const visible = assignedGuards.filter(r => matchesQuery(r, query));
        if (selectedGuards.length === visible.length) {
            setSelectedGuards([]);
            return;
        }
        const ids = visible.map(a => a.id).filter(Boolean);
        setSelectedGuards(ids);
    };

    const handleBulkDeleteSelected = () => {
        if (!selectedGuards || selectedGuards.length === 0) {
            toast.info(t('clients.assignGuards.noSelection', 'No items selected'));
            return;
        }
        // open confirmation dialog
        setOpenBulkDeleteDialog(true);
    };

    const confirmBulkDelete = async () => {
        try {
            const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
            const postSiteId = site?.id || '';
            const toDelete = assignedGuards.filter(a => selectedGuards.includes(a.id));
            const promises = toDelete.map((g) => {
                if (g.source === 'shift') return ApiService.delete(`/tenant/${tenantId}/shift/${g.id}`);
                if (g.source === 'guardShift') return ApiService.delete(`/tenant/${tenantId}/guard-shift/${g.id}`);
                return ApiService.delete(`/tenant/${tenantId}/post-site/${postSiteId}/guards/${g.id}`);
            });
            await Promise.all(promises);
            setAssignedGuards(prev => prev.filter(a => !selectedGuards.includes(a.id)));
            const deletedIds = selectedGuards.slice();
            setSelectedGuards([]);
            toast.success(t('clients.assignGuards.bulkDeleteSuccess', 'Selected assignments removed'));
            try { window.dispatchEvent(new CustomEvent('assignments:changed', { detail: { action: 'bulk-delete', ids: deletedIds } })); } catch (e) {}
        } catch (err: any) {
            console.error('Failed to bulk delete assignments', err);
            const msg = err?.response?.data?.message ?? err?.message ?? t('clients.assignGuards.removeFailed', 'Failed to remove assignment');
            toast.error(msg);
        } finally {
            setOpenBulkDeleteDialog(false);
        }
    };

    const openEditAssignment = (g: any) => {
        // Prefill modal state from the selected assignment
        const guardId = g.guardId || g.securityGuardId || g.userId || g.id || null;
        setSelectedGuard(guardId);
        // set guardQuery to a display name so the input shows the guard when guardOptions doesn't contain the item
        setGuardQuery(g.guardName || g.fullName || g.name || '');
        setSelectedStation(g.stationId || (g.station && (g.station.id || g.station.stationId)) || null);
        setShiftStart(toDatetimeLocal(g.shiftStart || g.startTime || g.start || ''));
        setShiftEnd(toDatetimeLocal(g.shiftEnd || g.endTime || g.end || ''));
        setShiftSchedule(g.schedule || g.shiftSchedule || shiftSchedule);
        // open modal for editing
        setShowAssignModal(true);
    };

    // Load assigned guards (and shifts) for this post site — try multiple endpoints and normalize
    const loadAssigned = async () => {
        try {
            const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
            const postSiteId = site?.id || '';
            if (!postSiteId) return;

            const tryPaths = [
                // prefer shifts endpoint so we surface created shifts
                `/tenant/${tenantId}/shift?postSiteId=${encodeURIComponent(postSiteId)}`,
                `/tenant/${tenantId}/post-site/${postSiteId}/guards`,
                `/tenant/${tenantId}/post-site/${postSiteId}/assigned-guards`,
                `/tenant/${tenantId}/post-site/${postSiteId}/security-guards`,
                `/tenant/${tenantId}/security-guard?postSiteId=${encodeURIComponent(postSiteId)}`,
                `/tenant/${tenantId}/security-guards?postSiteId=${encodeURIComponent(postSiteId)}`,
            ];

            let rows: any[] | undefined;
            let loadedFrom = '';
            for (const path of tryPaths) {
                try {
                    const resp = await ApiService.get(path, { toast: { silentError: true } } as any);
                    const body = resp && (resp.rows || resp.data) ? (resp.rows || resp.data) : resp;
                    if (Array.isArray(body) || (body && (body.rows || body.data))) {
                        rows = Array.isArray(body) ? body : (body.rows || body.data || []);
                        loadedFrom = path;
                        console.log('[AssignGuards] loaded from', path, 'count=', Array.isArray(rows) ? rows.length : 0);
                        break;
                    }
                } catch (err) {
                    // ignore and try next path
                }
            }

            // if still empty, try generic endpoint that may return assignments
            if ((!rows || rows.length === 0)) {
                try {
                    const resp2 = await ApiService.get(`/tenant/${tenantId}/post-site/${postSiteId}`);
                    const body2 = resp2 && (resp2.data || resp2) || {};
                    if (Array.isArray(body2.guards) && body2.guards.length > 0) {
                        rows = body2.guards;
                        loadedFrom = `/tenant/${tenantId}/post-site/${postSiteId}`;
                    }
                } catch (e) {
                    // ignore
                }
            }

            const raw = rows || [];
            const normalized = raw.map((r: any) => {
                const id = r.id || r.guardId || r.securityGuardId || r.userId || r.guardUserId || '';
                const firstName = r.firstName || r.guardFirstName || (r.guard && r.guard.firstName) || '';
                const lastName = r.lastName || r.guardLastName || (r.guard && r.guard.lastName) || '';
                const fullName = r.fullName || r.name || `${firstName} ${lastName}`.trim();
                const phoneNumber = r.phoneNumber || r.mobile || r.guardPhone || (r.guard && (r.guard.phoneNumber || r.guard.mobile)) || '';
                const email = r.email || r.guardEmail || (r.guard && (r.guard.email)) || '';
                const stationName = r.stationName || (r.station && (r.station.name || r.stationName)) || r.postSiteStationName || '';
                const source = r.source || r._source || (r.stationId || r.guardId || loadedFrom.includes('/shift') ? 'shift' : 'pivot');
                const tenantUserId = r.tenantUserId || r.tenant_user_id || (r.tenantUser && (r.tenantUser.id || r.tenantUser.userId)) || null;
                const siteTours = r.siteTours || r.site_tours || null;
                const tasksField = r.tasks || null;
                const shiftStart = r.startTime || r.start_time || r.shiftStart || r.start || null;
                const shiftEnd = r.endTime || r.end_time || r.shiftEnd || r.end || null;
                const postOrders = r.postOrders || r.post_orders || null;
                const checklistsField = r.checklists || r.checklists || null;
                const skillSetField = r.skillSet || r.skill_set || null;
                const departmentField = r.department || null;
                const guardFull = (r.guard && (r.guard.firstName || r.guard.lastName)) ? `${r.guard.firstName || ''} ${r.guard.lastName || ''}`.trim() : (r.fullName || r.name || null);

                return {
                    ...r,
                    id,
                    firstName,
                    lastName,
                    fullName,
                    phoneNumber,
                    email,
                    stationName,
                    source,
                    guardName: guardFull,
                    tenantUserId,
                    siteTours,
                    tasks: tasksField,
                    shiftStart,
                    shiftEnd,
                    postOrders,
                    checklists: checklistsField,
                    skillSet: skillSetField,
                    department: departmentField,
                };
            });

            // Resolve human-friendly names for businessInfo and security guards when missing
            const businessCache: Record<string, any> = {};
            const guardCache: Record<string, any> = {};
            const resolveNames = async () => {
                await Promise.all(normalized.map(async (row: any) => {
                    try {
                        // Business / post site name
                        const bizId = row.businessInfoId || row.business_info_id || row.postSiteId || row.post_site_id || null;
                        if (bizId && !row.businessInfoName && !businessCache[bizId]) {
                            try {
                                const resp = await ApiService.get(`/tenant/${tenantId}/post-site/${bizId}`, { toast: { silentError: true } } as any);
                                const b = resp && (resp.data || resp) ? (resp.data || resp) : resp;
                                businessCache[bizId] = b;
                                row.businessInfoName = b && (b.name || b.postSiteName) || null;
                            } catch (e) {
                                businessCache[bizId] = null;
                            }
                        } else if (bizId && businessCache[bizId]) {
                            const b = businessCache[bizId];
                            row.businessInfoName = b && (b.name || b.postSiteName) || null;
                        }

                        // Security guard name
                        const sgId = row.security_guard_id || row.securityGuardId || row.guardId || (row.guard && row.guard.id) || null;
                        if (sgId && !row.guardName && !guardCache[sgId]) {
                            try {
                                const resp = await ApiService.get(`/tenant/${tenantId}/security-guard/${sgId}`, { toast: { silentError: true } } as any);
                                const g2 = resp && (resp.data || resp) ? (resp.data || resp) : resp;
                                guardCache[sgId] = g2;
                                row.guardName = (g2 && g2.guard && (g2.guard.firstName || g2.guard.lastName)) ? `${g2.guard.firstName || ''} ${g2.guard.lastName || ''}`.trim() : (g2 && (g2.firstName || g2.lastName) ? `${g2.firstName || ''} ${g2.lastName || ''}`.trim() : null);
                            } catch (e) {
                                guardCache[sgId] = null;
                            }
                        } else if (sgId && guardCache[sgId]) {
                            const g2 = guardCache[sgId];
                            row.guardName = (g2 && g2.guard && (g2.guard.firstName || g2.guard.lastName)) ? `${g2.guard.firstName || ''} ${g2.guard.lastName || ''}`.trim() : (g2 && (g2.firstName || g2.lastName) ? `${g2.firstName || ''} ${g2.lastName || ''}`.trim() : null);
                        }

                        // TenantUser name fallback
                        if (!row.tenantUserName) {
                            if (row.tenantUser && row.tenantUser.user) {
                                row.tenantUserName = `${row.tenantUser.user.firstName || ''} ${row.tenantUser.user.lastName || ''}`.trim();
                            } else if (row.guardName) {
                                row.tenantUserName = row.guardName;
                            } else if (row.tenantUserId) {
                                row.tenantUserName = String(row.tenantUserId);
                            }
                        }
                    } catch (e) {
                        // ignore per-row resolution errors
                    }
                }));
            };

            await resolveNames();

            // Filter out rows that clearly belong to a different postSite (defensive check)
            const filtered = normalized.filter((r: any) => {
                const rPost = r.postSiteId || r.post_site_id || (r.postSite && (r.postSite.id || r.postSite.postSiteId)) || r.businessInfoId || r.business_info_id || null;
                if (!rPost) return true; // keep if we can't determine
                try {
                    return String(rPost) === String(postSiteId);
                } catch (e) {
                    return true;
                }
            });

            if (filtered.length !== normalized.length) {
                console.warn('[AssignGuards] filtered out assignments for other postSites', { requested: postSiteId, before: normalized.length, after: filtered.length });
            }

            setAssignedGuards(filtered);
        } catch (err) {
            console.error('Failed to load assigned guards', err);
        }
    };

    React.useEffect(() => {
        let mounted = true;
        if (mounted) loadAssigned();
        return () => { mounted = false; };
    }, [site]);

    // Load stations for this site so assign modal can link guard->station
    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                const postSiteId = site?.id || '';
                if (!postSiteId) return;
                const resp = await ApiService.get(`/tenant/${tenantId}/station?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);

                // Normalize different response shapes from API
                let rows: any[] = [];
                if (!resp) rows = [];
                else if (Array.isArray(resp)) rows = resp;
                else if (Array.isArray(resp.rows)) rows = resp.rows;
                else if (Array.isArray(resp.data)) rows = resp.data;
                else if (Array.isArray((resp as any).stations)) rows = (resp as any).stations;

                // Fallback: some pages embed stations on the `site` object
                if ((!rows || rows.length === 0) && site && Array.isArray((site as any).stations)) {
                    rows = (site as any).stations;
                }

                // Map to a consistent shape to avoid missing labels/ids
                const mapped = (rows || []).map((r: any) => ({
                    id: r.id || r.stationId || r._id || r.station_id || String(r._id || r.id || JSON.stringify(r)),
                    name: r.name || r.stationName || r.station_name || r.label || r.title || (r.description ? String(r.description).slice(0, 60) : '') || ''
                }));

                if (mounted) {
                    setStations(mapped);
                    if (!mapped || mapped.length === 0) console.warn('[AssignGuards] no stations found for postSite', postSiteId, 'resp=', resp, 'site.stations=', (site as any).stations);
                }
            } catch (err) {
                console.error('Failed to load stations', err);
            }
        })();

        return () => { mounted = false; };
    }, [site]);


    React.useEffect(() => {
        let mounted = true;
        // If a station is selected, use the station-scoped guards endpoint first
        // and fall back to shifts and tenant-level guards only if needed.
        (async () => {
            try {
                const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                const postSiteId = site?.id || '';

                if (!selectedStation) {
                    // No station selected: keep original autocomplete behavior
                    const timer = setTimeout(async () => {
                        try {
                            const q = guardQuery || '';
                            const data = await ApiService.get(`/tenant/${tenantId}/security-guard/autocomplete?limit=50&query=${encodeURIComponent(q)}`);
                            const items = Array.isArray(data) ? data : (data && data.rows) ? data.rows : [];
                            const normalized = items.map((r: any) => {
                                const guardObj = r.guard ?? r;
                                const id = r.guardId ?? guardObj.id ?? r.id ?? '';
                                const name = (guardObj.firstName || guardObj.lastName)
                                    ? `${guardObj.firstName || ''} ${guardObj.lastName || ''}`.trim()
                                    : (r.fullName || r.name || r.label || '');
                                return { id, name };
                            }).filter((g: any) => g.id);

                            const deduped = Object.values(
                                normalized.reduce((acc: Record<string, any>, g: any) => {
                                    if (!acc[g.id]) acc[g.id] = g;
                                    return acc;
                                }, {}),
                            ) as { id: string; name: string }[];

                            if (mounted) setGuardOptions(deduped);
                        } catch (err) {
                            console.error('Failed to load guards', err);
                        }
                    }, 250);

                    return () => { mounted = false; clearTimeout(timer); };
                }

                // Station selected: try station-assigned guards endpoint first
                try {
                    const stationResp = await ApiService.get(`/tenant/${tenantId}/stations/${selectedStation}/guards`, { toast: { silentError: true } } as any);
                    let items = Array.isArray(stationResp) ? stationResp : (stationResp && stationResp.rows) ? stationResp.rows : (stationResp && stationResp.data) ? stationResp.data : [];
                    items = items || [];
                    const normalized = items.map((r: any) => {
                        const guardObj = r.guard ?? r;
                        const id = r.guardId ?? guardObj.id ?? r.id ?? '';
                        const name = r.fullName || r.name || (guardObj.firstName || guardObj.lastName) ? `${guardObj.firstName || ''} ${guardObj.lastName || ''}`.trim() : (r.label || '');
                        return { id, name };
                    }).filter((g: any) => g.id);

                    const deduped = Object.values(
                        normalized.reduce((acc: Record<string, any>, g: any) => {
                            if (!acc[g.id]) acc[g.id] = g;
                            return acc;
                        }, {}),
                    ) as { id: string; name: string }[];

                    if (deduped.length > 0) {
                        if (mounted) setGuardOptions(deduped);
                        return;
                    }
                } catch (e) {
                    // ignore and fallback
                }

                // Fallback #1: extract guards from shifts for this station
                try {
                    const shiftsResp = await ApiService.get(`/tenant/${tenantId}/shift?postSiteId=${encodeURIComponent(postSiteId)}&stationId=${encodeURIComponent(selectedStation)}&limit=999`, { toast: { silentError: true } } as any);
                    let rows = Array.isArray(shiftsResp) ? shiftsResp : (shiftsResp && shiftsResp.rows) ? shiftsResp.rows : (shiftsResp && shiftsResp.data) ? shiftsResp.data : [];
                    rows = rows || [];
                    const extracted = rows.flatMap((sh: any) => {
                        const g = sh.guard ?? sh.securityGuard ?? sh.security_guard ?? (sh.guard && (sh.guard.guard || sh.guard));
                        const id = g?.id || g?.guardId || sh.guardId || sh.security_guard_id || null;
                        const name = g?.fullName || (g && (g.firstName || g.lastName) ? `${g.firstName || ''} ${g.lastName || ''}`.trim() : (g?.name || sh.guardName || sh.guard_name || null));
                        if (id) return [{ id, name }];
                        return [];
                    });

                    const dedupedShifts = Object.values(
                        (extracted || []).reduce((acc: Record<string, any>, g: any) => {
                            if (!acc[g.id]) acc[g.id] = g;
                            return acc;
                        }, {}),
                    ) as { id: string; name: string }[];

                    if (dedupedShifts.length > 0) {
                        if (mounted) setGuardOptions(dedupedShifts);
                        return;
                    }
                } catch (e) {
                    // ignore
                }

                // Fallback #2: tenant-level guards filtered by station
                try {
                    const tenantGuards = await ApiService.get(`/tenant/${tenantId}/security-guard?filter[station]=${encodeURIComponent(selectedStation)}&limit=999`, { toast: { silentError: true } } as any);
                    let items = Array.isArray(tenantGuards) ? tenantGuards : (tenantGuards && tenantGuards.rows) ? tenantGuards.rows : (tenantGuards && tenantGuards.data) ? tenantGuards.data : [];
                    items = items || [];
                    const normalized = items.map((r: any) => {
                        const guardObj = r.guard ?? r;
                        const id = r.guardId ?? guardObj.id ?? r.id ?? '';
                        const name = r.fullName || r.name || (guardObj.firstName || guardObj.lastName) ? `${guardObj.firstName || ''} ${guardObj.lastName || ''}`.trim() : (r.label || '');
                        return { id, name };
                    }).filter((g: any) => g.id);

                    const deduped = Object.values(
                        normalized.reduce((acc: Record<string, any>, g: any) => {
                            if (!acc[g.id]) acc[g.id] = g;
                            return acc;
                        }, {}),
                    ) as { id: string; name: string }[];

                    if (mounted) setGuardOptions(deduped);
                } catch (e) {
                    // ignore
                }
            } catch (err) {
                console.error('Failed to load guards', err);
            }
        })();
        return () => { mounted = false; };
    }, [guardQuery, site, selectedStation]);
    
    const [shiftStart, setShiftStart] = useState('');
    const [shiftEnd, setShiftEnd] = useState('');
    const [shiftSchedule, setShiftSchedule] = useState('Diurno');
    const [shiftStartError, setShiftStartError] = useState<string | null>(null);
    const [shiftEndError, setShiftEndError] = useState<string | null>(null);

    // Convert ISO or other date strings to `datetime-local` input value (YYYY-MM-DDTHH:MM)
    const toDatetimeLocal = (val: any) => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const isFormValid = Boolean(selectedGuard && selectedStation && shiftStart && shiftEnd);

    return (
        <div ref={containerRef} className="space-y-4">
            <div className="bg-card border rounded-lg p-4 flex flex-col">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="relative flex items-center pl-2">
                        <button onClick={() => setActionOpen(v => !v)} className="px-3 py-2 border rounded-full bg-card text-sm inline-flex items-center gap-2">
                            {actionSelection}
                            <ChevronDown size={14} />
                        </button>
                        {actionOpen && (
                            <div className="absolute mt-20 bg-card border rounded-md shadow-lg z-10 w-48 left-0">
                                    <button onClick={() => { setActionOpen(false); handleBulkDeleteSelected(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted/30 text-red-600">{t('clients.assignGuards.actionDeleteSelected', 'Delete Selected')}</button>
                                </div>
                        )}
                    </div>

                    <div className="flex-1 flex justify-center">
                        <div className="relative w-full max-w-xl">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
                                <Search size={16} />
                            </span>
                            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('clients.assignGuards.headerSearchPlaceholder','Search Guards')} className="w-full h-10 rounded-full border pl-10 pr-4" />
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        <button onClick={() => setShowAssignModal(true)} className="inline-flex items-center gap-3 bg-[#C8860A] text-white px-4 py-2 rounded-full hover:bg-[#B37809]">
                            <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                <Plus size={14} />
                            </span>
                            <span className="text-sm font-medium">{t('clients.assignGuards.assignButton', 'Assign Guard')}</span>
                        </button>
                    </div>
                </div>

                <div>
                    <div className="md:block hidden overflow-x-auto flex-1 min-h-[60vh]">
                        <table className="w-full">
                        <thead className="bg-muted/30">
                                <tr>
                                <th className="px-6 py-4 flex items-center justify-center"><input type="checkbox" checked={(assignedGuards.filter(r => matchesQuery(r, query)).length > 0) && selectedGuards.length === assignedGuards.filter(r => matchesQuery(r, query)).length} onChange={toggleSelectAll} /></th>
                                <th className="px-6 py-4 text-left text-base">{t('clients.assignGuards.table.name', 'Name')}</th>
                                <th className="px-6 py-4 text-left text-base">{t('clients.assignGuards.table.mobile', 'Mobile Number')}</th>
                                <th className="px-6 py-4 text-left text-base">{t('clients.assignGuards.table.email', 'Email')}</th>
                                <th className="px-6 py-4 text-left text-base">{t('clients.assignGuards.table.station', 'Estación')}</th>
                                <th className="px-6 py-4 text-right text-base">{t('clients.assignGuards.table.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                                {assignedGuards.filter(r => matchesQuery(r, query)).length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-40 h-40">
                                                <svg viewBox="0 0 200 200" className="w-full h-full text-[#C8860A]/10">
                                                    <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                                                    <circle cx="85" cy="100" r="8" fill="white" />
                                                    <circle cx="115" cy="100" r="8" fill="white" />
                                                    <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-lg font-semibold text-foreground">{t('clients.assignGuards.emptyTitle', 'No Result Found')}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">{t('clients.assignGuards.emptyMessage', 'No guards are assigned to this post site.')}</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                ) : (
                                assignedGuards.filter(r => matchesQuery(r, query)).map((g) => (
                                    <tr key={g.id} className="border-b">
                                        <td className="px-6 py-4 flex items-center justify-center"><input type="checkbox" checked={selectedGuards.includes(g.id)} onChange={() => toggleSelect(g.id)} /></td>
                                        <td className="px-6 py-4 text-left text-base">
                                            {g.guardName || (g.firstName || g.lastName) ? `${g.firstName || ''} ${g.lastName || ''}`.trim() : (g.fullName || g.label || g.email || g.userId || '-')}
                                        </td>
                                        <td className="px-6 py-4 text-left text-base">{g.phoneNumber || '-'}</td>
                                        <td className="px-6 py-4 text-left text-base">{g.email || '-'}</td>
                                        <td className="px-6 py-4 text-left text-base">{g.businessInfoName || (g.station && (g.station.stationName || g.station.name)) || g.stationName || g.stationId || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2 rounded hover:bg-muted/30">
                                                        <EllipsisVertical size={18} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleView(g)}>
                                                        <Eye className="mr-2 h-4 w-4" /> {t('clients.assignGuards.actionView','View')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditAssignment(g)}>
                                                        <Edit className="mr-2 h-4 w-4" /> {t('clients.assignGuards.actionEdit','Edit')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(g)} className="text-red-600">
                                                        <Trash className="mr-2 h-4 w-4" /> {t('clients.assignGuards.actionDelete','Delete')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        </table>
                    </div>

                    <div className="md:hidden flex-1">
                                <MobileCardList items={assignedGuards.filter(r => matchesQuery(r, query))} renderCard={(g: any) => (
                            <div>
                                <div className="text-sm font-semibold">{g.guardName || (g.firstName || g.lastName) ? `${g.firstName || ''} ${g.lastName || ''}`.trim() : (g.fullName || g.label || g.email || g.userId || '-')}</div>
                                <div className="text-xs text-muted-foreground">{g.phoneNumber || g.email || '-'}</div>
                                <div className="text-xs text-muted-foreground">{g.businessInfoName || (g.station && (g.station.stationName || g.station.name)) || g.stationName || g.stationId || ''}</div>
                            </div>
                        )} loading={false} />
                    </div>
                </div>

                {viewModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setViewModalOpen(false)} />
                        <aside className="relative mx-auto w-full max-w-xl max-h-[60vh] bg-card shadow-xl overflow-auto rounded-lg">
                                            <div className="relative p-4 border-b">
                                                <h3 className="text-2xl font-semibold text-center">{t('clients.assignGuards.viewModalTitle', 'Guard Assignments')}</h3>
                                                <button aria-label="close" onClick={() => setViewModalOpen(false)} className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center text-foreground/70 hover:bg-muted">
                                                    X
                                                </button>
                                            </div>
                            <div className="p-4">
                                {viewAssignments.length > 0 ? (
                                    <div className="border rounded bg-card p-4">
                                        {viewAssignments.map((a: any, idx: number) => {
                                            const format = (v: any) => {
                                                if (v === null || v === undefined || v === '') return '-';
                                                if (typeof v === 'string') return v;
                                                try { return JSON.stringify(v, null, 2); } catch (e) { return String(v); }
                                            };

                                            return (
                                                <div key={a.id} className={idx < viewAssignments.length - 1 ? 'pb-4 mb-4 border-b' : ''}>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div>
                                                            <dl className="space-y-2 text-base">
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">ID</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{a.id || '-'}</div></dd>
                                                                </div>
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">Tenant User</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{a.tenantUserName || resolveTenantUserName(a)}</div></dd>
                                                                </div>
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">Puesto</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{a.businessInfoName || resolveBusinessInfoName(a)}</div></dd>
                                                                </div>
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">Created At</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{a.createdAt || a.created_at || '-'}</div></dd>
                                                                </div>
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">Updated At</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{a.updatedAt || a.updated_at || '-'}</div></dd>
                                                                </div>
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">Deleted At</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{a.deletedAt || a.deleted_at || '-'}</div></dd>
                                                                </div>
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">Guardia</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{resolveSecurityGuardName(a)}</div></dd>
                                                                </div>
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">{t('clients.assignGuards.postSiteLabel','Post Site')}</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{a.postSiteName || a.businessInfoName || a.businessInfoId || '-'}</div></dd>
                                                                </div>
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">{t('clients.assignGuards.stationLabel','Station')}</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{a.stationName || a.station?.name || '-'}</div></dd>
                                                                </div>
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">{t('clients.assignGuards.securityGuardLabel','Security Guard')}</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{a.guardName || resolveSecurityGuardName(a) || (a.guardEmail || a.guardUserId || '-')}</div></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">{t('clients.assignGuards.skillSetLabel','Skill Set')}</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{format(a.skillSet)}</div></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">{t('clients.assignGuards.departmentLabel','Department')}</dt>
                                                                    <dd><div className="bg-muted/30 p-2 rounded text-base text-foreground">{format(a.department)}</div></dd>
                                                                </div>
                                                            </dl>
                                                        </div>

                                                        <div>
                                                            <dl className="space-y-2 text-base">
                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">{t('clients.assignGuards.siteToursLabel','Site Tours')}</dt>
                                                                    <dd className="text-base text-foreground"><pre className="whitespace-pre-wrap bg-muted/30 p-2 rounded text-base">{format(a.siteTours)}</pre></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">{t('clients.assignGuards.tasksLabel','Tasks')}</dt>
                                                                    <dd className="text-base text-foreground"><pre className="whitespace-pre-wrap bg-muted/30 p-2 rounded text-base">{format(a.tasks)}</pre></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">{t('clients.assignGuards.postOrdersLabel','Post Orders')}</dt>
                                                                    <dd className="text-base text-foreground"><pre className="whitespace-pre-wrap bg-muted/30 p-2 rounded text-base">{format(a.postOrders)}</pre></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-foreground/70">{t('clients.assignGuards.checklistsLabel','Checklists')}</dt>
                                                                    <dd className="text-base text-foreground"><pre className="whitespace-pre-wrap bg-muted/30 p-2 rounded text-base">{format(a.checklists)}</pre></dd>
                                                                </div>
                                                            </dl>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">{t('clients.assignGuards.viewNoAssignments','No assignments found.')}</div>
                                )}
                            </div>
                        </aside>
                    </div>
                )}



                {showAssignModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowAssignModal(false)} />

                        <aside className="relative w-full sm:ml-auto sm:max-w-md bg-card shadow-xl overflow-hidden rounded-t-lg sm:rounded-lg">
                            <div className="flex items-center justify-between p-4 border-b">
                                                <h3 className="text-lg font-semibold">{t('clients.assignGuards.modalTitle', 'Assign Guard')}</h3>
                                <button onClick={() => setShowAssignModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[80vh] space-y-4">
                                {/* Training reminder from serviceConfig */}
                                {(() => {
                                  const training: string[] = site?.serviceConfig?.trainingRequired ?? [];
                                  if (!training.length) return null;
                                  return (
                                    <div className="rounded-lg border border-blue-200 bg-blue-500/10 px-4 py-3 flex gap-3">
                                      <span className="text-blue-500 text-lg leading-none mt-0.5">ℹ</span>
                                      <div>
                                        <p className="text-xs font-semibold text-blue-600 mb-1">Capacitación requerida para guardias de este puesto</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {training.map((item: string) => (
                                            <span key={item} className="inline-block rounded-full bg-blue-500/15 border border-blue-300 text-blue-600 text-[11px] font-medium px-2 py-0.5">{item}</span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                                

                                <div ref={guardDropdownRef} className="relative">
                                    <label className="block text-sm text-foreground/70 mb-2">{t('clients.assignGuards.guardsLabel', 'Guards*')}</label>
                                    <div className="relative">
                                        <input
                                            value={guardQuery || (selectedGuard ? guardOptions.find(g => g.id === selectedGuard)?.name ?? '' : '')}
                                            onChange={e => { setGuardQuery(e.target.value); setShowGuardsDropdown(true); setSelectedGuard(null); }}
                                            onFocus={() => { setShowGuardsDropdown(true); }}
                                            placeholder={t('clients.assignGuards.searchPlaceholder', 'Search guards')}
                                            className="w-full border rounded-lg h-12 px-3"
                                        />

                                        {showGuardsDropdown && (
                                            <ul className="absolute z-40 w-full bg-card border rounded-md mt-1 max-h-48 overflow-auto">
                                                {guardOptions.filter(g => g.name.toLowerCase().includes((guardQuery || '').toLowerCase())).length === 0 ? (
                                                    <li className="px-3 py-2 text-sm text-muted-foreground">{guardQuery ? t('clients.assignGuards.noResults', 'No results') : t('clients.assignGuards.searchHelp', 'Type to search and pick a guard')}</li>
                                                ) : (
                                                    guardOptions.filter(g => g.name.toLowerCase().includes((guardQuery || '').toLowerCase())).map(g => (
                                                        <li key={g.id} onMouseDown={(e) => { e.preventDefault(); setSelectedGuard(g.id); setGuardQuery(g.name || ''); setShowGuardsDropdown(false); }} className="px-3 py-2 hover:bg-muted/30 cursor-pointer">{g.name}</li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* Assignment type removed — always creating a Shift */}

                                <>
                                    <div>
                                        <label className="block text-sm text-foreground/70 mb-2">{t('postSites.stations.form.startTime', 'Start')} <span className="text-red-600">*</span></label>
                                        <input type="datetime-local" value={shiftStart} onChange={e => { setShiftStart(e.target.value); if (shiftStartError) setShiftStartError(null); }} className="w-full border rounded-lg h-12 px-3" />
                                        {shiftStartError && <p className="text-xs text-red-600 mt-1">{shiftStartError}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-foreground/70 mb-2">{t('postSites.stations.form.finishTime', 'End')} <span className="text-red-600">*</span></label>
                                        <input type="datetime-local" value={shiftEnd} onChange={e => { setShiftEnd(e.target.value); if (shiftEndError) setShiftEndError(null); }} className="w-full border rounded-lg h-12 px-3" />
                                        {shiftEndError && <p className="text-xs text-red-600 mt-1">{shiftEndError}</p>}
                                    </div>
                                </>

                                {/* guardShift option removed — attendance managed in guard profile */}

                                

                                <div>
                                    <label className="block text-sm text-foreground/70 mb-2">{t('clients.assignGuards.stationLabel', 'Station*')}</label>
                                        {showNewStation ? (
                                        <div className="space-y-2">
                                            <input value={newStationName} onChange={e => setNewStationName(e.target.value)} placeholder={t('clients.stations.placeholderName','Station name')} className="border rounded-lg h-12 px-3 w-full" />
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs text-muted-foreground mb-1">{t('clients.assignGuards.startShort','Start (hh:mm)')}</label>
                                                    <input type="time" value={newStationStart} onChange={e => setNewStationStart(e.target.value)} className="border rounded-lg h-10 px-3 w-full" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-muted-foreground mb-1">{t('clients.assignGuards.endShort','End (hh:mm)')}</label>
                                                    <input type="time" value={newStationEnd} onChange={e => setNewStationEnd(e.target.value)} className="border rounded-lg h-10 px-3 w-full" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <button disabled={creatingStation} onClick={async () => {
                                                    try {
                                                        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                                                        const postSiteId = site?.id || '';
                                                        if (!newStationName || !postSiteId) { toast.error(t('clients.stations.provideName', 'Provide station name')); return; }
                                                        setCreatingStation(true);
                                                        const payload: any = { name: newStationName, postSiteId };
                                                        if (newStationStart) payload.startTimeInDay = newStationStart;
                                                        if (newStationEnd) payload.finishTimeInDay = newStationEnd;
                                                        const res = await ApiService.post(`/tenant/${tenantId}/station`, { data: payload });
                                                        const created = (res && (res.data || res)) || res;
                                                        setStations(s => [created, ...s]);
                                                        setSelectedStation(created.id || created._id || created.stationId || null);
                                                        setNewStationName(''); setNewStationStart(''); setNewStationEnd('');
                                                        setShowNewStation(false);
                                                        toast.success(t('clients.stations.created', 'Station created'));
                                                    } catch (err: any) {
                                                        console.error('Failed creating station', err);
                                                        toast.error(err?.message || t('clients.stations.createFailed', 'Failed creating station'));
                                                    } finally { setCreatingStation(false); }
                                                }} className="bg-[#C8860A] text-white px-3 py-2 rounded border text-sm">{t('clients.stations.create', 'Create')}</button>
                                                <button onClick={() => { setShowNewStation(false); setNewStationName(''); setNewStationStart(''); setNewStationEnd(''); }} className="px-3 py-2 rounded border text-sm">{t('clients.stations.cancel', 'Cancel')}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <select value={selectedStation || ''} onChange={e => setSelectedStation(e.target.value || null)} className="w-full border rounded-lg h-12 px-3">
                                                <option value="">{t('clients.assignGuards.selectStationOption', '-- select station --')}</option>
                                                {stations.map(s => {
                                                    const id = s.id || s.stationId || s._id || '';
                                                    const label = s.name || s.stationName || s.station_name || s.name || s.label || t('clients.assignGuards.unnamedStation','Unnamed station');
                                                    return <option key={id || JSON.stringify(s)} value={id}>{label}</option>;
                                                })}
                                            </select>
                                            <button onClick={() => setShowNewStation(true)} className="px-3 py-2 rounded border text-sm">{t('clients.assignGuards.addStation', 'Add Station')}</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="sticky bottom-0 bg-card border-t p-4 flex items-center justify-end gap-3">
                                <button
                                    disabled={!isFormValid}
                                    onClick={async () => {
                                        console.log('[AssignGuards] assign button clicked', { selectedGuard, selectedStation, shiftStart, shiftEnd });
                                        let succeeded = false;
                                        try {
                                            const tenantId = (site && site.tenantId) ? site.tenantId : '';
                                            const postSiteId = (site && site.id) ? site.id : '';

                                            // Basic validation: require postSiteId
                                            if (!postSiteId) {
                                                toast.error(t('clients.assignGuards.missingPostSite', 'Missing post site id'));
                                                return;
                                            }

                                            // If guard not selected, show error and keep modal open so user can fill other fields
                                            if (!selectedGuard) {
                                                toast.error(t('clients.assignGuards.selectGuardRequired', 'Please select a guard before assigning'));
                                                return;
                                            }

                                            // Require a station for every Shift created from this modal
                                            if (!selectedStation) {
                                                toast.error(t('clients.assignGuards.selectStationRequired', 'Please select or create a station before assigning'));
                                                return;
                                            }

                                            // Validate start/end times (both required)
                                            setShiftStartError(null);
                                            setShiftEndError(null);
                                            if (!shiftStart || !shiftEnd) {
                                                if (!shiftStart) setShiftStartError(t('clients.assignGuards.startRequired', 'Start time is required'));
                                                if (!shiftEnd) setShiftEndError(t('clients.assignGuards.endRequired', 'End time is required'));
                                                toast.error(t('clients.assignGuards.hoursRequiredToast', 'Please enter both start and end times before assigning'));
                                                return;
                                            }

                                            // Always create a Shift when assigning from this modal
                                            const payload: any = {
                                                startTime: shiftStart ? new Date(shiftStart).toISOString() : undefined,
                                                endTime: shiftEnd ? new Date(shiftEnd).toISOString() : undefined,
                                                station: selectedStation,
                                                guard: selectedGuard,
                                            };
                                            console.log('[AssignGuards] creating shift payload:', payload);
                                            const resp = await ApiService.post(`/tenant/${tenantId}/shift`, { data: payload });
                                            console.log('[AssignGuards] shift create response:', resp);
                                            toast.success(t('clients.assignGuards.shiftCreated', 'Shift created and guard assigned'));
                                            try { await loadAssigned(); } catch (e) { console.error('Failed to reload assigned after shift create', e); }
                                            // notify other views/pages that assignments changed
                                            try {
                                                const detail = { action: 'assign', resource: resp };
                                                window.dispatchEvent(new CustomEvent('assignments:changed', { detail }));
                                            } catch (e) {
                                                // ignore
                                            }
                                            succeeded = true;
                                        } catch (err: any) {
                                            console.error('Assign guard failed', err);
                                            const serverMsg = err?.response?.data?.message || err?.message || '';
                                            // Map common DB notNull violations to friendlier messages
                                            if (typeof serverMsg === 'string' && /startTime\s+cannot\s+be\s+null/i.test(serverMsg)) {
                                                toast.error(t('clients.assignGuards.startRequired', 'Start time is required'));
                                            } else if (typeof serverMsg === 'string' && /endTime\s+cannot\s+be\s+null/i.test(serverMsg)) {
                                                toast.error(t('clients.assignGuards.endRequired', 'End time is required'));
                                            } else if (typeof serverMsg === 'string' && /startTime\s+cannot\s+be\s+null|endTime\s+cannot\s+be\s+null/i.test(serverMsg)) {
                                                toast.error(t('clients.assignGuards.hoursRequiredToast', 'Please enter both start and end times before assigning'));
                                            } else {
                                                const msg = serverMsg || t('clients.assignGuards.assignFailed', 'Assign guard failed');
                                                toast.error(msg);
                                            }
                                        } finally {
                                            if (succeeded) setShowAssignModal(false);
                                        }
                                    }}
                                    className={`w-12 h-12 bg-[#C8860A] text-white rounded-full flex items-center justify-center shadow-lg ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    aria-label={t('clients.assignGuards.assignButtonAria', 'Assign')}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </aside>
                    </div>
                )}

                <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('clients.assignGuards.confirmRemovalTitle','Confirm removal')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('clients.assignGuards.confirmRemovalDesc','Are you sure you want to remove this guard assignment? This action cannot be undone.')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => { setPendingDeleteAssignment(null); setOpenDeleteDialog(false); }}>{t('clients.assignGuards.cancel','Cancel')}</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-500 text-white" onClick={confirmDelete}>{t('clients.assignGuards.remove','Remove')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <AlertDialog open={openBulkDeleteDialog} onOpenChange={setOpenBulkDeleteDialog}>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('clients.assignGuards.confirmBulkRemovalTitle','Confirm bulk removal')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('clients.assignGuards.confirmBulkRemovalDesc','Are you sure you want to remove the selected assignments? This action cannot be undone.')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => { setOpenBulkDeleteDialog(false); }}>{t('clients.assignGuards.cancel','Cancel')}</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-500 text-white" onClick={confirmBulkDelete}>{t('clients.assignGuards.remove','Remove')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

