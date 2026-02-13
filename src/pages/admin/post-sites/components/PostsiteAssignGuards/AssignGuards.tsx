import React, { useState } from 'react';
import { Search, ChevronDown, Plus, X, EllipsisVertical, Eye, Trash } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AssignGuards({ site }: { site?: any }) {
    const [actionOpen, setActionOpen] = useState(false);
    const [actionSelection, setActionSelection] = useState<string>('Action');
    const [query, setQuery] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);

    const [skillSet, setSkillSet] = useState('');
    const [department, setDepartment] = useState('');
    const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
    const [selectedGuard, setSelectedGuard] = useState<string | null>(null);
    const [guardQuery, setGuardQuery] = useState('');
    const [showGuardsDropdown, setShowGuardsDropdown] = useState(false);

    const [guardOptions, setGuardOptions] = useState<{ id: string; name: string }[]>([]);
    const [assignedGuards, setAssignedGuards] = useState<any[]>([]);
    const navigate = useNavigate();

    const [viewAssignments, setViewAssignments] = useState<any[]>([]);
    const [viewModalOpen, setViewModalOpen] = useState(false);

    const handleView = async (g: any) => {
        try {
            const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
            const idToUse = g.securityGuardId || g.guardUserId || g.userId || g.guardId || g.tenantUserUserId || null;
            if (!idToUse) {
                toast.info('No guard identifier available');
                return;
            }
            const resp = await ApiService.get(`/tenant/${tenantId}/security-guard/${idToUse}/assignments`);
            const rows = resp && resp.rows ? resp.rows : (Array.isArray(resp) ? resp : []);
            setViewAssignments(rows);
            setViewModalOpen(true);
        } catch (err: any) {
            console.error('Failed to load guard assignments', err);
            const message = err?.data?.message || err?.message || 'Failed to load guard assignments';
            toast.error(message);
        }
    };

    const [pendingDeleteAssignment, setPendingDeleteAssignment] = useState<any | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

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
            await ApiService.delete(`/tenant/${tenantId}/post-site/${postSiteId}/guards/${g.id}`);
            setAssignedGuards((prev) => prev.filter((x) => x.id !== g.id));
            toast.success('Assignment removed');
        } catch (err: any) {
            console.error('Failed to remove assignment', err);
            const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to remove assignment';
            toast.error(msg);
        } finally {
            setPendingDeleteAssignment(null);
            setOpenDeleteDialog(false);
        }
    };

    React.useEffect(() => {
        // Load assigned guards for this post site
        let mountedAssigned = true;
        (async () => {
            try {
                const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                const postSiteId = site?.id || '';
                if (!postSiteId) return;
                const data = await ApiService.get(`/tenant/${tenantId}/post-site/${postSiteId}/guards`);
                const rows = Array.isArray(data) ? data : (data && data.rows) ? data.rows : [];
                if (mountedAssigned) setAssignedGuards(rows);
            } catch (err) {
                console.error('Failed to load assigned guards', err);
            }
        })();

        return () => { mountedAssigned = false; };
    }, [site]);


    React.useEffect(() => {
        let mounted = true;
        const timer = setTimeout(async () => {
            try {
                const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                const q = guardQuery || '';
                const data = await ApiService.get(`/tenant/${tenantId}/security-guard/autocomplete?limit=50&query=${encodeURIComponent(q)}`);
                const items = Array.isArray(data) ? data : (data && data.rows) ? data.rows : [];
                const normalized = items.map((r: any) => {
                    const guardObj = r.guard ?? r;
                    // Prefer the underlying user id when available (r.guardId),
                    // else use any user id present on the returned object (guardObj.id),
                    // else fall back to the securityGuard record id (r.id).
                    const id = r.guardId ?? guardObj.id ?? r.id ?? '';
                    const name = (guardObj.firstName || guardObj.lastName)
                        ? `${guardObj.firstName || ''} ${guardObj.lastName || ''}`.trim()
                        : (r.fullName || r.name || r.label || '');
                    return { id, name };
                }).filter((g: any) => g.id);

                // Deduplicate by id (backend may return duplicate entries coming
                // from security_guard rows and tenant_user rows for same user)
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
    }, [guardQuery, site]);
    const [assignSiteTours, setAssignSiteTours] = useState('');
    const [assignTasks, setAssignTasks] = useState('');
    const [assignPostOrders, setAssignPostOrders] = useState('');
    const [assignChecklists, setAssignChecklists] = useState('');

    return (
        <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="relative">
                        <button onClick={() => setActionOpen(v => !v)} className="px-3 py-2 border rounded-full bg-white text-sm inline-flex items-center gap-2">
                            {actionSelection}
                            <ChevronDown size={14} />
                        </button>
                        {actionOpen && (
                            <div className="absolute mt-2 bg-white border rounded-md shadow-lg z-10 w-48">
                                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Assign Selected</button>
                                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Unassign</button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex justify-center">
                        <div className="relative w-full max-w-xl">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                <Search size={16} />
                            </span>
                            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Guards" className="w-full h-10 rounded-full border pl-10 pr-4" />
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        <button onClick={() => setShowAssignModal(true)} className="inline-flex items-center gap-3 bg-orange-600 text-white px-4 py-2 rounded-full hover:bg-orange-700">
                            <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                <Plus size={14} />
                            </span>
                            <span className="text-sm font-medium">Assign Guard</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3"><input type="checkbox" /></th>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-left">Mobile Number</th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignedGuards.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-40 h-40">
                                                <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                                                    <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                                                    <circle cx="85" cy="100" r="8" fill="white" />
                                                    <circle cx="115" cy="100" r="8" fill="white" />
                                                    <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-lg font-semibold text-gray-700">No Result Found</h3>
                                                <p className="text-sm text-gray-500 mt-1">No guards are assigned to this post site.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                assignedGuards.map((g) => (
                                    <tr key={g.id} className="border-b">
                                        <td className="px-4 py-3"><input type="checkbox" /></td>
                                        <td className="px-4 py-3 text-left">
                                            {(g.firstName || g.lastName) ? `${g.firstName || ''} ${g.lastName || ''}`.trim() : (g.fullName || g.label || g.email || g.userId || '-')}
                                        </td>
                                        <td className="px-4 py-3 text-left">{g.phoneNumber || '-'}</td>
                                        <td className="px-4 py-3 text-left">{g.email || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2 rounded hover:bg-gray-50">
                                                        <EllipsisVertical size={18} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleView(g)}>
                                                        <Eye className="mr-2 h-4 w-4" /> View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(g)} className="text-red-600">
                                                        <Trash className="mr-2 h-4 w-4" /> Delete
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

                {viewModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setViewModalOpen(false)} />
                        <aside className="relative mx-auto w-full max-w-xl max-h-[60vh] bg-white shadow-xl overflow-auto rounded-lg">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-2xl font-semibold">Guard Assignments </h3>
                                <button onClick={() => setViewModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-700">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-4">
                                {viewAssignments.length > 0 ? (
                                    <div className="border rounded bg-white p-4">
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
                                                                    <dt className="text-sm font-medium text-gray-600">Post Site</dt>
                                                                    <dd><div className="bg-gray-50 p-2 rounded text-base text-gray-800">{a.postSiteName || a.businessInfoId || '-'}</div></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-gray-600">Security Guard</dt>
                                                                    <dd><div className="bg-gray-50 p-2 rounded text-base text-gray-800">{(a.guardFirstName || a.guardLastName) ? `${a.guardFirstName || ''} ${a.guardLastName || ''}`.trim() : (a.guardEmail || a.guardUserId || '-')}</div></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-gray-600">Skill Set</dt>
                                                                    <dd><div className="bg-gray-50 p-2 rounded text-base text-gray-800">{format(a.skillSet)}</div></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-gray-600">Department</dt>
                                                                    <dd><div className="bg-gray-50 p-2 rounded text-base text-gray-800">{format(a.department)}</div></dd>
                                                                </div>
                                                            </dl>
                                                        </div>

                                                        <div>
                                                            <dl className="space-y-2 text-base">
                                                                <div>
                                                                    <dt className="text-sm font-medium text-gray-600">Site Tours</dt>
                                                                    <dd className="text-base text-gray-800"><pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded text-base">{format(a.siteTours)}</pre></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-gray-600">Tasks</dt>
                                                                    <dd className="text-base text-gray-800"><pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded text-base">{format(a.tasks)}</pre></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-gray-600">Post Orders</dt>
                                                                    <dd className="text-base text-gray-800"><pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded text-base">{format(a.postOrders)}</pre></dd>
                                                                </div>

                                                                <div>
                                                                    <dt className="text-sm font-medium text-gray-600">Checklists</dt>
                                                                    <dd className="text-base text-gray-800"><pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded text-base">{format(a.checklists)}</pre></dd>
                                                                </div>
                                                            </dl>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500">No assignments found.</div>
                                )}
                            </div>
                        </aside>
                    </div>
                )}



                {showAssignModal && (
                    <div className="fixed inset-0 z-50 flex">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowAssignModal(false)} />

                        <aside className="relative ml-auto w-full max-w-md h-full bg-white shadow-xl overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-lg font-semibold">Assign Guard</h3>
                                <button onClick={() => setShowAssignModal(false)} className="p-2 text-gray-500 hover:text-gray-700">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto h-[calc(100vh-160px)] space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Skill Set</label>
                                    <select value={skillSet} onChange={e => setSkillSet(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                                        <option value="">Select skill set</option>
                                        <option value="security-level-1">Security Level 1</option>
                                        <option value="security-level-2">Security Level 2</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Department</label>
                                    <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                                        <option value="">Select department</option>
                                        <option value="operations">Operations</option>
                                        <option value="reception">Reception</option>
                                    </select>
                                </div>

                                <div className="relative">
                                    <label className="block text-sm text-gray-600 mb-2">Guards*</label>
                                    <div className="relative">
                                        <input
                                            value={guardQuery || (selectedGuard ? guardOptions.find(g => g.id === selectedGuard)?.name ?? '' : '')}
                                            onChange={e => { setGuardQuery(e.target.value); setShowGuardsDropdown(true); setSelectedGuard(null); }}
                                            onFocus={() => setShowGuardsDropdown(true)}
                                            placeholder="Search guards"
                                            className="w-full border rounded-lg h-12 px-3"
                                        />

                                        {showGuardsDropdown && (
                                            <ul className="absolute z-40 w-full bg-white border rounded-md mt-1 max-h-48 overflow-auto">
                                                {guardOptions.filter(g => g.name.toLowerCase().includes((guardQuery || '').toLowerCase())).map(g => (
                                                    <li key={g.id} onMouseDown={(e) => { e.preventDefault(); setSelectedGuard(g.id); setGuardQuery(''); setShowGuardsDropdown(false); }} className="px-3 py-2 hover:bg-gray-50 cursor-pointer">{g.name}</li>
                                                ))}
                                                {guardOptions.filter(g => g.name.toLowerCase().includes((guardQuery || '').toLowerCase())).length === 0 && (
                                                    <li className="px-3 py-2 text-sm text-gray-400">No results</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Type to search and pick a guard</p>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Assign Site Tours</label>
                                    <select value={assignSiteTours} onChange={e => setAssignSiteTours(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                                        <option value="">None</option>
                                        <option value="tour-1">Site Tour 1</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Assign Tasks</label>
                                    <select value={assignTasks} onChange={e => setAssignTasks(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                                        <option value="">None</option>
                                        <option value="task-1">Daily Rounds</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Assign Post Orders</label>
                                    <select value={assignPostOrders} onChange={e => setAssignPostOrders(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                                        <option value="">None</option>
                                        <option value="po-1">Post Order 1</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Assign Checklists</label>
                                    <select value={assignChecklists} onChange={e => setAssignChecklists(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                                        <option value="">None</option>
                                        <option value="checklist-1">Checklist A</option>
                                    </select>
                                </div>
                            </div>
                            <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-end gap-3">
                                <button onClick={async () => {
                                    try {
                                        // Build payload
                                        const payload: any = {
                                            securityGuardId: selectedGuard,
                                            assignSiteTours,
                                            assignTasks,
                                            assignPostOrders,
                                            assignChecklists,
                                            skillSet,
                                            department,
                                        };

                                        const tenantId = (site && site.tenantId) ? site.tenantId : '';
                                        const postSiteId = (site && site.id) ? site.id : '';

                                        // Basic validation
                                        if (!selectedGuard || !postSiteId) {
                                            console.warn('Missing guard or post site id');
                                            setShowAssignModal(false);
                                            return;
                                        }

                                        const url = `/tenant/${tenantId}/post-site/${postSiteId}/assign-guard`;

                                        try {
                                            await ApiService.post(url, { data: payload });
                                            toast.success('Guard assigned successfully');
                                        } catch (err: any) {
                                            console.error('Assign guard failed', err);
                                            const msg = err && err.message ? err.message : 'Assign guard failed';
                                            toast.error(msg);
                                        }
                                    } catch (err) {
                                        console.error('Assign guard error', err);
                                    } finally {
                                        setShowAssignModal(false);
                                    }
                                }} className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg">
                                    SAVE
                                </button>
                            </div>
                        </aside>
                    </div>
                )}

                <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm removal</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to remove this guard assignment? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => { setPendingDeleteAssignment(null); setOpenDeleteDialog(false); }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-500 text-white" onClick={confirmDelete}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

