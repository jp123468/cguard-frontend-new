import React, { useState } from 'react';
import { Search, ChevronDown, Plus, X } from 'lucide-react';

export default function Tasks({ site }: { site?: any }) {
    const [actionOpen, setActionOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);

    const [taskName, setTaskName] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [maxDuration, setMaxDuration] = useState('');
    const [assignGuard, setAssignGuard] = useState('');
    const [tab, setTab] = useState<'oneoff' | 'recurring'>('oneoff');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [subTasks, setSubTasks] = useState<string[]>([]);
    const [newSubTask, setNewSubTask] = useState('');

    const guardOptions = [
        { id: 'guard-1', name: 'John Doe' },
        { id: 'guard-2', name: 'Jane Smith' },
        { id: 'guard-3', name: 'Carlos Ruiz' },
    ];

    return (
        <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="relative">
                        <button onClick={() => setActionOpen(v => !v)} className="px-3 py-2 border rounded-full bg-white text-sm inline-flex items-center gap-2">
                            Action
                            <ChevronDown size={14} />
                        </button>
                        {actionOpen && (
                            <div className="absolute mt-2 bg-white border rounded-md shadow-lg z-10 w-48">
                                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Archive Selected</button>
                                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export</button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex justify-center">
                        <div className="relative w-full max-w-xl">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                <Search size={16} />
                            </span>
                            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks" className="w-full h-10 rounded-full border pl-10 pr-4" />
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        <button onClick={() => setShowNewTaskModal(true)} className="inline-flex items-center gap-3 bg-orange-600 text-white px-4 py-2 rounded-full hover:bg-orange-700">
                            <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                <Plus size={14} />
                            </span>
                            <span className="text-sm font-medium">New Task</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3"><input type="checkbox" /></th>
                                <th className="px-4 py-3 text-left">Task Name</th>
                                <th className="px-4 py-3 text-left">Duration</th>
                                <th className="px-4 py-3 text-left">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={4} className="px-4 py-12">
                                    <div className="flex flex-col items-center justify-center gap-4">
                                        <div className="w-40 h-40">
                                            <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                                                <rect x="40" y="48" width="120" height="84" fill="currentColor" rx="10" />
                                                <path d="M60 78 L140 78" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                                <circle cx="90" cy="100" r="6" fill="white" />
                                                <circle cx="110" cy="100" r="6" fill="white" />
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

                {showNewTaskModal && (
                    <div className="fixed inset-0 z-50 flex">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewTaskModal(false)} />

                        <aside className="relative ml-auto w-full max-w-md h-full bg-white shadow-xl overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-lg font-semibold">New Task</h3>
                                <button onClick={() => setShowNewTaskModal(false)} className="p-2 text-gray-500 hover:text-gray-700">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto h-[calc(100vh-160px)] space-y-4">
                                <div>
                                    <input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Task Name*" className="w-full border rounded-lg h-12 px-3" />
                                </div>

                                <div>
                                    <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Task Description" className="w-full border rounded-lg px-3 py-3 min-h-[120px]" />
                                </div>

                                <div>
                                    <select value={maxDuration} onChange={e => setMaxDuration(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                                        <option value="">Max Duration</option>
                                        <option value="30">30 mins</option>
                                        <option value="60">60 mins</option>
                                        <option value="120">120 mins</option>
                                    </select>
                                </div>

                                <div>
                                    <select value={assignGuard} onChange={e => setAssignGuard(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                                        <option value="">Assign Guard*</option>
                                        {guardOptions.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex items-center gap-6">
                                        <button onClick={() => setTab('oneoff')} className={`pb-2 ${tab === 'oneoff' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}>One-off Task</button>
                                        <button onClick={() => setTab('recurring')} className={`pb-2 ${tab === 'recurring' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}>Recurring Task</button>
                                    </div>

                                    {tab === 'oneoff' && (
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-2">Start Date</label>
                                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-lg h-12 px-3" />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-2">Start Time</label>
                                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border rounded-lg h-12 px-3" />
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 mb-2">Due Date</label>
                                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border rounded-lg h-12 px-3" />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-2">Due Time</label>
                                                <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="w-full border rounded-lg h-12 px-3" />
                                            </div>
                                        </div>
                                    )}

                                    {tab === 'recurring' && (
                                        <div className="mt-4 text-sm text-gray-500">Recurring scheduling controls (placeholder)</div>
                                    )}

                                    <div className="mt-4">
                                        <label className="block text-sm text-gray-600 mb-2">Sub Tasks</label>
                                        <div className="flex gap-2">
                                            <input value={newSubTask} onChange={e => setNewSubTask(e.target.value)} placeholder="New sub task" className="flex-1 border rounded-lg h-10 px-3" />
                                            <button onClick={() => { if (newSubTask.trim()) { setSubTasks(s => [...s, newSubTask.trim()]); setNewSubTask(''); } }} className="px-3 py-2 border rounded-lg text-orange-600">+ Add</button>
                                        </div>

                                        <ul className="mt-2 space-y-2">
                                            {subTasks.map((s, i) => (
                                                <li key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                    <span>{s}</span>
                                                    <button onClick={() => setSubTasks(st => st.filter((_, idx) => idx !== i))} className="text-sm text-red-500">Remove</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <button onClick={() => { /* save as draft behaviour */ setShowNewTaskModal(false); }} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">Save As Draft</button>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-4 right-4">
                                <button onClick={() => { /* submit */ setShowNewTaskModal(false); }} className="ml-2 inline-flex items-center justify-center w-12 h-12 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700">
                                    <span className="text-sm font-semibold">Submit</span>
                                </button>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div >
    );
}

