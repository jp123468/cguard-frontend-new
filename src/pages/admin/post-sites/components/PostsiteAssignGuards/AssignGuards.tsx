import React, { useState } from 'react';
import { Search, ChevronDown, Plus, X } from 'lucide-react';

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

    const guardOptions = [
        { id: 'guard-1', name: 'John Doe' },
        { id: 'guard-2', name: 'Jane Smith' },
        { id: 'guard-3', name: 'Carlos Ruiz' },
    ];
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
                            </tr>
                        </thead>
                        <tbody>
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
                                            <p className="text-sm text-gray-500 mt-1">We can't find any item matching your search</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>



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
                                <button onClick={() => { /* save action */ setShowAssignModal(false); }} className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg">
                                    SAVE
                                </button>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}

