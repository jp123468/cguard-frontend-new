import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus, X } from 'lucide-react';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';


type Props = {
    guard?: any;
};

export default function GuardNotes({ guard }: Props) {
    const actionRef = useRef<HTMLDivElement>(null);
    const [actionOpen, setActionOpen] = useState(false);
    const [actionSelection, setActionSelection] = useState<string>('Action');
    const [searchQuery, setSearchQuery] = useState('');
    const [notesData, setNotesData] = useState<any[]>([]); // Vacío inicialmente
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        attachments: [] as File[],
    });

    const handleAddNote = () => {
        setShowModal(true);
        setFormData({
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            attachments: [],
        });
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
                setActionOpen(false);
            }
        };

        if (actionOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [actionOpen]);

    const handleSubmitNote = () => {
        // Logic to save the note will go here
        const newNote = {
            title: formData.title,
            description: formData.description,
            date: formData.date,
            addedBy: 'You',
            attachments: formData.attachments,
        };
        setNotesData((prev) => [newNote, ...prev]);
        setShowModal(false);
        // clear form
        setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], attachments: [] });
    };

    const removeAttachment = (index: number) => {
        setFormData((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
    };

    const shortName = (name: string, max = 28) => {
        if (name.length <= max) return name;
        return name.slice(0, max) + '...';
    };

    return (
        <AppLayout>
            <GuardsLayout navKey="keep-safe" title="guards.nav.notas">
                <div className="space-y-4">
                    <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            {/* Left: Action Dropdown */}
                            <div className="relative" ref={actionRef}>
                                <button
                                    onClick={() => setActionOpen(!actionOpen)}
                                    className="px-3 py-2 border rounded-md bg-white text-gray-700 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 min-w-[100px]"
                                >
                                    {actionSelection}
                                    <ChevronDown size={16} />
                                </button>
                                {actionOpen && (
                                    <div className="absolute left-0 mt-1 bg-white border rounded-md shadow-lg z-10 w-full">
                                        <button
                                            onClick={() => { setActionSelection('Eliminar'); setActionOpen(false); }}
                                            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Center: Search */}
                            <div className="flex-1 max-w-xs">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                        type="text"
                                        placeholder="Search note"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            {/* Right: Add Button */}
                            <button
                                onClick={handleAddNote}
                                className="px-6 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors"
                            >
                                <Plus size={18} />
                                Nueva Nota
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="px-4 py-3 text-left">
                                            <input type="checkbox" className="rounded" />
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Added By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notesData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12">
                                                <div className="flex flex-col items-center justify-center gap-4">
                                                    <div className="w-32 h-32">
                                                        <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                                                            <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                                                            <circle cx="85" cy="100" r="8" fill="white" />
                                                            <circle cx="115" cy="100" r="8" fill="white" />
                                                            <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                                                            <path d="M 60 60 L 70 50 M 140 60 L 150 50 M 80 40 L 90 30 M 120 40 L 110 30" stroke="currentColor" strokeWidth="2" />
                                                        </svg>
                                                    </div>
                                                    <div className="text-center">
                                                        <h3 className="text-lg font-semibold text-gray-700">No results found</h3>
                                                        <p className="text-sm text-gray-500 mt-1">We couldn't find<br />any items matching<br />your search</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        notesData.map((note, idx) => (
                                            <tr key={idx} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-700">{note.title}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{note.date}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{note.addedBy}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Modal */}
                    {showModal && (
                        <div
                            className="fixed inset-0 z-50"
                            onClick={handleCloseModal}
                        >
                            <div
                                className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                                    <h2 className="text-lg font-semibold text-gray-800">Add New Note</h2>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-6">
                                    {/* Título */}
                                    <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="Enter note title"
                                            className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>

                                    {/* Descripción */}
                                    <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Enter note description"
                                            className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                            rows={6}
                                        />
                                    </div>

                                    {/* Fecha */}
                                    <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                                        />
                                    </div>

                                    {/* Attachments */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>

                                        <label className="w-full border border-gray-300 rounded-md p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-gray-400">
                                            <div className="flex-1">
                                                <div className="text-sm text-gray-600">
                                                    {formData.attachments && formData.attachments.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {formData.attachments.map((f, i) => (
                                                                <div key={i} className="flex items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-3 truncate">
                                                                        <span className="text-sm text-gray-700 font-medium truncate" style={{maxWidth: 200}} title={f.name}>{shortName(f.name, 28)}</span>
                                                                    </div>
                                                                    <button onClick={(e) => { e.stopPropagation(); removeAttachment(i); }} className="text-gray-500 hover:text-red-500 p-1 rounded" aria-label={`Remove ${f.name}`}>
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">No files selected</span>
                                                    )}
                                                </div>
                                            </div>

                                           
                                            <input
                                                type="file"
                                                multiple
                                                onChange={(e) => {
                                                    const files = e.target.files ? Array.from(e.target.files) : [];
                                                    setFormData({ ...formData, attachments: files });
                                                }}
                                                className="sr-only"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
                                    <button
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitNote}
                                        className="px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </GuardsLayout>
        </AppLayout>
    );
}
