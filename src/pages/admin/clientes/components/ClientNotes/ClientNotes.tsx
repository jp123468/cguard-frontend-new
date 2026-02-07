import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Plus, X, Calendar as CalendarIcon, EllipsisVertical, Pencil, Trash, Eye } from 'lucide-react';
import ClientsLayout from '@/layouts/ClientsLayout';
import AppLayout from '@/layouts/app-layout';
import { useTranslation } from "react-i18next";
import { clientService } from '@/lib/api/clientService';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

type Props = {
    client?: any;
};

export default function ClientNotes({ client }: Props) {
    const { t } = useTranslation();
    const actionRef = useRef<HTMLDivElement>(null);
    const [pickerMonth, setPickerMonth] = useState<Date>(() => new Date());

    const [actionOpen, setActionOpen] = useState(false);
    const [actionSelection, setActionSelection] = useState<string>('actions.action');
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [notesData, setNotesData] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[]>([]);
    const [detailsNote, setDetailsNote] = useState<any | null>(null);

    // selection state for checkboxes (master + per-row)
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
    const toggleSelect = (id: string) => {
        setSelectedNoteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        attachments: [] as File[],
    });

    const isFormValid = formData.title.trim() !== '' && formData.description.trim() !== '' && Boolean(formData.date);

    const handleAddNote = () => {
        setIsEditing(false);
        setEditingNoteId(null);
        setShowModal(true);
        setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], attachments: [] });
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditingNoteId(null);
    };

    // Load notes for client
    useEffect(() => {
        let mounted = true;
        async function loadNotes() {
            if (!client || !client.id) {
                setNotesData([]);
                return;
            }
            try {
                const resp = await clientService.getClientNotes(client.id, { limit: 9999, offset: 0 });
                if (!mounted) return;
                const rows = Array.isArray(resp?.rows) ? resp.rows : [];
                setNotesData(rows);
            } catch (err) {
                console.warn('[ClientNotes] failed to load notes', err);
                setNotesData([]);
            }
        }
        loadNotes();
        return () => { mounted = false; };
    }, [client?.id]);

    const confirmNames = (confirmDeleteIds || []).map(id => {
        const found = (notesData || []).find(n => n.id === id);
        return found ? (found.title || String(found.id)) : String(id);
    });

    const filtered = useMemo(() => {
        const q = (searchQuery || '').toLowerCase().trim();
        if (!q) return notesData;
        return (notesData || []).filter(n => {
            const title = (n.title || '').toString().toLowerCase();
            const desc = (n.description || '').toString().toLowerCase();
            const date = ((n.noteDate || n.createdAt) || '').toString().toLowerCase();
            const cbName = n.createdBy ? (((n.createdBy.name || n.createdBy.firstName || '') + ' ' + (n.createdBy.lastName || '')).toLowerCase()) : '';
            const clientName = client ? (((client.name || client.firstName || '') + ' ' + (client.lastName || '')).toLowerCase()) : '';
            return title.includes(q) || desc.includes(q) || date.includes(q) || cbName.includes(q) || clientName.includes(q);
        });
    }, [notesData, searchQuery, client]);

    // keep selection in sync with visible/filtered notes (remove ids no longer in view)
    useEffect(() => {
        setSelectedNoteIds(prev => prev.filter(id => filtered.some(n => n.id === id)));
    }, [filtered]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionRef.current && !actionRef.current.contains(event.target as Node)) setActionOpen(false);
        };
        if (actionOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [actionOpen]);

    const handleSubmitNote = async () => {
        if (!formData.title || !formData.title.trim()) {
            toast.error(t('clients.notes.validation.titleRequired', 'Title is required'));
            return;
        }
        if (!formData.description || !formData.description.trim()) {
            toast.error(t('clients.notes.validation.descriptionRequired', 'Description is required'));
            return;
        }
        if (!formData.date) {
            toast.error(t('clients.notes.validation.dateRequired', 'Date is required'));
            return;
        }
        const payload: any = {
            title: formData.title,
            description: formData.description,
            noteDate: formData.date || null,
            attachment: null, // files not yet uploaded; placeholder for future
        };

        if (!client || !client.id) {
            // local-only
            const local = { id: String(Date.now()), ...payload, addedBy: 'You' };
            setNotesData(prev => [local, ...prev]);
            setShowModal(false);
            setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], attachments: [] });
            return;
        }

        try {
            if (isEditing && editingNoteId) {
                const resp = await clientService.updateClientNote(client.id, editingNoteId, payload);
                const updated = resp && resp.data ? resp.data : resp;
                setNotesData(prev => prev.map(n => n.id === updated.id ? updated : n));
                const msg = resp && resp.messageCode ? t(resp.messageCode) : (resp && resp.message ? resp.message : t('clients.notes.noteUpdated'));
                toast.success(msg);
            } else {
                const resp = await clientService.createClientNote(client.id, payload);
                const created = resp && resp.data ? resp.data : resp;
                setNotesData(prev => [created, ...prev]);
                const msg = resp && resp.messageCode ? t(resp.messageCode) : (resp && resp.message ? resp.message : t('clients.notes.noteCreated'));
                toast.success(msg);
            }

            setShowModal(false);
            setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], attachments: [] });
            setIsEditing(false);
            setEditingNoteId(null);
        } catch (err) {
            console.warn('[ClientNotes] failed to save note', err);
            const errorMsg = isEditing ? t('clients.notes.noteUpdateFailed', 'Could not update note') : t('clients.notes.noteCreateFailed', 'Could not create note');
            toast.error(errorMsg);
            // fallback to local
            const local = { id: String(Date.now()), ...payload, addedBy: 'You' };
            setNotesData(prev => [local, ...prev]);
            setShowModal(false);
            setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], attachments: [] });
            setIsEditing(false);
            setEditingNoteId(null);
        }
    };

    const removeAttachment = (index: number) => setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));

    const shortName = (name: string, max = 28) => (name.length <= max ? name : name.slice(0, max) + '...');

    return (
        <div className="min-h-screen flex flex-col">
            <div className="bg-white border rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="relative" ref={actionRef}>
                        <button
                            onClick={() => setActionOpen(!actionOpen)}
                            className="px-3 py-2 border rounded-md bg-white text-gray-700 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 min-w-[100px]"
                        >
                            {t('actions.action', '-')}
                            <ChevronDown size={16} />
                        </button>
                        {actionOpen && (
                            <div className="absolute left-0 mt-1 bg-white border rounded-md shadow-lg z-10 w-full">
                                <button onClick={() => { if (selectedNoteIds.length > 0) setConfirmDeleteIds(selectedNoteIds); setActionOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedNoteIds.length === 0 ? 'text-gray-400 cursor-not-allowed' : ''}`}>{t('actions.delete')}</button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 max-w-xs">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('clients.notes.notesearchPlaceholder', 'Search notes')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleAddNote}
                        className="px-6 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors"
                    >
                        <Plus size={18} />
                        {t('clients.notes.addNote', 'New Note')}
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                    <table className="w-full">
                        <thead className="-mx-6 px-6 bg-gray-50">
                            <tr className="border-b">
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        className="rounded"
                                        onChange={(e) => { const checked = e.target.checked; if (checked) setSelectedNoteIds(filtered.map(n => n.id)); else setSelectedNoteIds([]); }}
                                        checked={selectedNoteIds.length === filtered.length && filtered.length > 0}
                                        aria-label="Select all notes"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.notes.Title', 'Title')}</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.notes.Date', 'Date')}</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.notes.Added By', 'Added By')}</th>
                                <th className="px-4 py-3 text-left"></th>
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
                                                </svg>
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-lg font-semibold text-gray-700">{t('clients.empty.title', 'No results found')}</h3>
                                                <p className="text-sm text-gray-500 mt-1">{t('clients.empty.description', "We couldn't find any items matching your search")}</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                notesData.map((note) => (
                                    <tr key={note.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            <input
                                                type="checkbox"
                                                className="rounded"
                                                checked={selectedNoteIds.includes(note.id)}
                                                onChange={() => toggleSelect(note.id)}
                                                aria-label={`Select note ${note.id}`}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{note.title}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{note.noteDate || note.noteDate === null ? note.noteDate : note.createdAt?.split('T')?.[0]}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {(() => {
                                                const cb = note.createdBy as any;
                                                const name = cb ? ((cb.fullName || cb.name || cb.firstName || '') + (cb.lastName ? ' ' + cb.lastName : '')) : '';
                                                return (name && name.trim()) ? name : (note.createdById || '-');
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 relative">
                                            <Popover open={openPopoverId === note.id} onOpenChange={(open) => setOpenPopoverId(open ? note.id : null)}>
                                                <PopoverTrigger asChild>
                                                    <button aria-label={t('header.openMenu') || 'Open menu'} className="p-2 rounded-full hover:bg-gray-100">
                                                        <EllipsisVertical className="h-5 w-5 text-slate-400" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-44 p-1 rounded-md shadow-lg">
                                                    <button onClick={() => { setDetailsNote(note); setOpenPopoverId(null); }} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-gray-50">
                                                        <Eye className="h-4 w-4 text-slate-400" />
                                                        {t('actions.viewDetails', 'Details')}
                                                    </button>
                                                    <button onClick={() => { setFormData({ title: note.title, description: note.description, date: note.noteDate || note.createdAt?.split('T')?.[0], attachments: [] }); setIsEditing(true); setEditingNoteId(note.id); setShowModal(true); setOpenPopoverId(null); }} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-gray-50"><Pencil className="h-4 w-4" />{t('actions.edit') || 'Edit'}</button>
                                                    <button onClick={() => { setConfirmDeleteIds([note.id]); setOpenPopoverId(null); }} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-gray-50 text-red-600"><Trash className="h-4 w-4" />{t('actions.delete') || 'Delete'}</button>
                                                </PopoverContent>
                                            </Popover>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50" onClick={handleCloseModal}>
                    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                            <h2 className="text-lg font-semibold text-gray-800">{t('clients.notes.form.Title', 'Add New Note')}</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('clients.notes.form.Titlenote', 'Title')} </label>
                                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t('clients.notes.form.Titleinput', 'Enter note title')} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('clients.notes.form.Description', 'Description')} </label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('clients.notes.form.Descriptioninput', 'Enter note description')} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" rows={6} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('clients.notes.form.Date', 'Date')} </label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between text-left font-normal">
                                            {formData.date ? format(new Date(formData.date), 'MMM dd, yyyy', { locale: es }) : <span>{t('clients.notes.form.selectDate', 'Select')}</span>}
                                            <CalendarIcon className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[320px] p-3 rounded-lg shadow-lg">
                                        <Calendar
                                            mode="single"
                                            selected={formData.date ? new Date(formData.date) : undefined}
                                            onSelect={(d) => { if (d) { setFormData(prev => ({ ...prev, date: d.toISOString().slice(0, 10) })); } }}
                                            initialFocus
                                            toDate={new Date()}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('clients.notes.form.AttachFile', 'Attachments')}</label>
                                <label className="w-full border border-gray-300 rounded-md p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-gray-400">
                                    <div className="flex-1">
                                        <div className="text-sm text-gray-600">
                                            {formData.attachments && formData.attachments.length > 0 ? (
                                                <div className="space-y-2">
                                                    {formData.attachments.map((f, i) => (
                                                        <div key={i} className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 truncate">
                                                                <span className="text-sm text-gray-700 font-medium truncate" style={{ maxWidth: 200 }} title={f.name}>{shortName(f.name, 28)}</span>
                                                            </div>
                                                            <button onClick={(e) => { e.stopPropagation(); removeAttachment(i); }} className="text-gray-500 hover:text-red-500 p-1 rounded" aria-label={`Remove ${f.name}`}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-500">{t('clients.notes.form.AttachFileinput', 'No files selected')}</span>
                                            )}
                                        </div>
                                    </div>
                                    <input type="file" multiple onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; setFormData({ ...formData, attachments: files }); }} className="sr-only" />
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
                            <button
                                onClick={handleSubmitNote}
                                disabled={!isFormValid}
                                className={`px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700 ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isEditing ? t('clients.notes.SaveChanges', 'Save changes') : t('clients.notes.Save', 'Save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details modal */}
            {detailsNote && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-30" onClick={() => setDetailsNote(null)} />
                    <div className="bg-white rounded-md shadow-xl p-6 z-70 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-2 text-center">{t('clients.notes.Details.detailsTitle', 'Note details')}</h3>
                        <div className="text-sm text-gray-700 mb-2"><strong>{t('clients.notes.Details.Title', 'Title')}: </strong>{detailsNote.title}</div>
                        <div className="text-sm text-gray-700 mb-2"><strong>{t('clients.notes.Details.Date', 'Date')}: </strong>{detailsNote.noteDate || detailsNote.createdAt?.split('T')?.[0]}</div>
                        <div className="text-sm text-gray-700 mb-4"><strong>{t('clients.notes.Details.Description', 'Description')}: </strong><div className="mt-1 whitespace-pre-wrap">{detailsNote.description}</div></div>
                        <div className="text-sm text-gray-700 mb-4"><strong>{t('clients.notes.addedBy', 'Added by')}: </strong>{(detailsNote.createdBy && (detailsNote.createdBy.fullName || detailsNote.createdBy.name)) || detailsNote.createdBy || detailsNote.createdById || '-'}</div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setFormData({ title: detailsNote.title, description: detailsNote.description, date: detailsNote.noteDate || detailsNote.createdAt?.split('T')?.[0], attachments: [] }); setIsEditing(true); setEditingNoteId(detailsNote.id); setShowModal(true); setDetailsNote(null); }} className="px-4 py-2 bg-orange-600 text-white rounded-md">{t('actions.edit') || 'Edit'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm delete modal */}
            {confirmDeleteIds.length > 0 && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-30" onClick={() => setConfirmDeleteIds([])} />
                    <div className="bg-white rounded-md shadow-xl p-6 z-70 w-full max-w-md">
                        <h3 className="w-full text-center text-lg font-semibold mb-2">{t('clients.notes.confirmDeleteTitle', 'Delete note(s)?')}</h3>
                        <p className="text-sm text-gray-600 mb-2 text-center">{confirmNames.join(', ')}</p>
                        <p className="text-sm text-gray-600 mb-4">{t('clients.notes.confirmDeleteMessage', 'Are you sure you want to permanently delete the selected note(s)? This action cannot be undone.')}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={async () => {
                                // bulk delete selected notes (confirmDeleteIds may contain 1 or many)
                                if (!confirmDeleteIds || confirmDeleteIds.length === 0) return setConfirmDeleteIds([]);
                                // local-only (no client id) -> just remove
                                if (!client || !client.id) {
                                    setNotesData(prev => prev.filter(n => !confirmDeleteIds.includes(n.id)));
                                    toast.success(t('clients.notes.noteDeleted'));
                                    setSelectedNoteIds([]);
                                    return setConfirmDeleteIds([]);
                                }

                                try {
                                    const results = await Promise.allSettled(confirmDeleteIds.map(id => clientService.destroyClientNote(client.id, id)));
                                    const successes = results.reduce((acc, r, idx) => (r.status === 'fulfilled' ? acc.concat(confirmDeleteIds[idx]) : acc), [] as string[]);
                                    // remove successfully deleted notes from UI
                                    if (successes.length > 0) {
                                        setNotesData(prev => prev.filter(n => !successes.includes(n.id)));
                                        setSelectedNoteIds(prev => prev.filter(id => !successes.includes(id)));
                                        toast.success(t('clients.notes.noteDeleted'));
                                    }
                                    const failures = results.filter(r => r.status === 'rejected');
                                    if (failures.length > 0) {
                                        console.error('Some deletions failed', failures);
                                        toast.error(t('clients.notes.deleteFailed'));
                                    }
                                } catch (err) {
                                    console.error('Error deleting notes', err);
                                    toast.error(t('clients.notes.deleteFailed'));
                                } finally {
                                    setConfirmDeleteIds([]);
                                }
                            }} className="px-4 py-2 rounded-md bg-red-600 text-white">{t('clients.contacts.delete', 'Delete')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
