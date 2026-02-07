import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus, X, EllipsisVertical, Eye, Pencil, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { postSiteService } from '@/lib/api/postSiteService';
import { toast } from 'sonner';

type Props = {
  site?: any;
};

export default function PostSiteNotes({ site }: Props) {
  const { t } = useTranslation();
  const actionRef = useRef<HTMLDivElement>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Action');
  const [searchQuery, setSearchQuery] = useState('');
  const [notesData, setNotesData] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    date: string;
    attachments: File[];
    id?: string;
  }>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    attachments: [],
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [detailsNote, setDetailsNote] = useState<any | null>(null);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[]>([]);

  const isFormValid = formData.title.trim() !== '' && formData.description.trim() !== '' && Boolean(formData.date);

  const validateForm = () => {
    if (!formData.title || !formData.title.trim()) {
      toast.error(t('clients.notes.validation.titleRequired', 'Title is required'));
      return false;
    }
    if (!formData.description || !formData.description.trim()) {
      toast.error(t('clients.notes.validation.descriptionRequired', 'Description is required'));
      return false;
    }
    if (!formData.date) {
      toast.error(t('clients.notes.validation.dateRequired', 'Date is required'));
      return false;
    }
    return true;
  };

  const handleAddNote = () => {
    setViewOnly(false);
    setShowModal(true);
    setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], attachments: [] });
  };

  const handleCloseModal = () => { setShowModal(false); setViewOnly(false); };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
        setActionOpen(false);
      }
    };

    if (actionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [actionOpen]);

  // Load notes when site changes
  useEffect(() => {
    let mounted = true;
    async function loadNotes() {
      if (!site || !site.id) return;
      try {
        const resp = await postSiteService.getPostSiteNotes(String(site.id), { limit: 9999, offset: 0 });
        if (!mounted) return;
        const rows = Array.isArray(resp?.rows) ? resp.rows : (Array.isArray(resp) ? resp : []);
        setNotesData(rows.map((r: any) => ({ id: String(r.id || r._id), title: r.title || '', description: r.description || '', date: r.noteDate || (r.createdAt ? r.createdAt.split('T')[0] : ''), addedBy: (r.createdBy && r.createdBy.fullName) || r.createdById || '', raw: r })));
      } catch (err) {
        console.warn('[PostSiteNotes] load error', err);
        toast.error(t('notes.loadError', 'Could not load notes'));
      }
    }
    loadNotes();
    return () => { mounted = false; };
  }, [site && site.id]);

  const handleSubmitNote = () => {
    if (!site || !site.id) {
      toast.error(t('notes.noSite', 'No post site selected'));
      return;
    }

    (async () => {
      try {
        const payload: any = {
          title: formData.title,
          description: formData.description,
          noteDate: formData.date,
        };

        if (!validateForm()) return;

        // If editing an existing note (we store id in formData as well)
        if ((formData as any).id) {
          const noteId = String((formData as any).id);
          const resp = await postSiteService.updatePostSiteNote(String(site.id), noteId, payload);
          const created = resp && resp.data ? resp.data : resp;
          setNotesData(prev => prev.map(n => (String(n.id) === String(noteId) ? { ...n, title: created.title || payload.title, description: created.description || payload.description, date: created.noteDate || payload.noteDate } : n)));
          toast.success(t('notes.updated', 'Note updated'));
        } else {
          const resp = await postSiteService.createPostSiteNote(String(site.id), payload);
          const created = resp && resp.data ? resp.data : resp;
          const row = { id: String(created.id || created._id || Date.now()), title: created.title || payload.title, description: created.description || payload.description, date: created.noteDate || payload.noteDate, addedBy: (created.createdBy && created.createdBy.fullName) || created.createdById || '' };
          setNotesData(prev => [row, ...prev]);
          toast.success(t('notes.created', 'Note created'));
        }

        setShowModal(false);
        setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], attachments: [] });
      } catch (err) {
        console.warn('[PostSiteNotes] submit error', err);
        toast.error(t('notes.saveError', 'Could not save note'));
      }
    })();
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function deleteSelected() {
    if (!site || !site.id) return;
    if (selectedIds.length === 0) return toast.error(t('notes.noSelection', 'No notes selected'));
    const ids = [...selectedIds];
    try {
      for (const id of ids) {
        await postSiteService.destroyPostSiteNote(String(site.id), id);
      }
      setNotesData(prev => prev.filter(n => !ids.includes(String(n.id))));
      setSelectedIds([]);
      toast.success(t('notes.deleted', 'Notes deleted'));
    } catch (err) {
      console.warn('[PostSiteNotes] delete error', err);
      toast.error(t('notes.deleteError', 'Could not delete notes'));
    }
  }

  const shortName = (name: string, max = 28) => (name.length <= max ? name : name.slice(0, max) + '...');

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative" ref={actionRef}>
            <button onClick={() => setActionOpen(v => !v)} className="px-3 py-2 border rounded-md bg-white text-gray-700 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 min-w-[100px]">
              {t('actions.action', 'Action')}
              <ChevronDown size={16} />
            </button>
            {actionOpen && (
              <div className="absolute left-0 mt-1 bg-white border rounded-md shadow-lg z-10 w-full">
                <button onClick={() => { setActionOpen(false); setConfirmDeleteIds(selectedIds); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">{t('clients.notes.delete', 'Delete')}</button>
              </div>
            )}
          </div>

          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input type="text" placeholder={t('clients.notes.notesearchPlaceholder', 'Search note')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <button onClick={handleAddNote} className="px-6 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors">
            <Plus size={18} />
           {(t('clients.notes.addNote', 'Add Note'))}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded"
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) setSelectedIds((notesData || []).map(n => String(n.id)));
                      else setSelectedIds([]);
                    }}
                    checked={(notesData || []).length > 0 && selectedIds.length === (notesData || []).length}
                    aria-label="Select all notes"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.notes.Title')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.notes.Date')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.notes.Added By')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700"></th>
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
                        <h3 className="text-lg font-semibold text-gray-700">{t('clients.empty.title')}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t('clients.empty.description')}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                notesData.map((note, idx) => (
                  <tr key={note.id || idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700"><input type="checkbox" checked={selectedIds.includes(String(note.id))} onChange={() => toggleSelect(String(note.id))} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{note.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{note.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{note.addedBy || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenuId(prev => (prev === note.id ? null : String(note.id)))}
                          className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
                          title={t('actions.action') || 'Actions'}
                        >
                          <EllipsisVertical size={18} />
                        </button>

                        {openMenuId === String(note.id) && (
                          <div className="absolute right-0 mt-2 w-44 bg-white border rounded-md shadow-lg z-50">
                            <button
                              onClick={() => { setDetailsNote(note.raw || note); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 focus:outline-none"
                            >
                              <Eye size={16} />
                              <span className="text-sm">{t('actions.viewDetails') || 'View Details'}</span>
                            </button>
                            <button
                              onClick={() => { setFormData({ title: note.title, description: note.description, date: note.date, attachments: [], id: note.id }); setViewOnly(false); setShowModal(true); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 focus:outline-none"
                            >
                              <Pencil size={16} />
                              <span className="text-sm">{t('actions.edit') || 'Edit'}</span>
                            </button>
                            <button
                              onClick={() => { setOpenMenuId(null); setConfirmDeleteIds([String(note.id)]); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-gray-50 focus:outline-none"
                            >
                              <Trash size={16} />
                              <span className="text-sm">{t('actions.delete') || 'Delete'}</span>
                            </button>
                          </div>
                        )}
                      </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('clients.notes.form.Titlenote', 'Title *')} </label>
                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder={t('clients.notes.form.Titlenote', 'Title *')} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('clients.notes.form.Description', 'Description *')} </label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder={t('clients.notes.form.Descriptioninput', 'Description *')} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" rows={6} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('clients.notes.form.Date', 'Date *')} </label>
                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer" />
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
                        <span className="text-sm text-gray-500">{t('clients.notes.form.NoFilesSelected', 'No files selected')}</span>
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
                {t('actions.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDeleteIds.length > 0 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setConfirmDeleteIds([])} />
          <div className="bg-white rounded-md shadow-xl p-6 z-70 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2 text-center">{t('clients.notes.confirmDeleteTitle', 'Delete contact(s)?')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('clients.notes.confirmDeleteMessage', 'Are you sure you want to permanently delete the selected note(s)? This action cannot be undone.')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteIds([])} className="px-4 py-2 rounded-md border">{t('actions.cancel') || 'Cancel'}</button>
              <button
                onClick={async () => {
                  if (!site || !site.id) {
                    setNotesData(prev => prev.filter(n => !confirmDeleteIds.includes(String(n.id))));
                    toast.success(t('notes.deleted', 'Notes deleted'));
                    setConfirmDeleteIds([]);
                    return;
                  }

                  try {
                    const results = await Promise.allSettled(confirmDeleteIds.map(id => postSiteService.destroyPostSiteNote(String(site.id), id)));
                    const successes = results.reduce((acc, r, idx) => (r.status === 'fulfilled' ? acc.concat(confirmDeleteIds[idx]) : acc), [] as string[]);
                    if (successes.length > 0) {
                      setNotesData(prev => prev.filter(n => !successes.includes(String(n.id))));
                      setSelectedIds(prev => prev.filter(id => !successes.includes(id)));
                      toast.success(t('notes.deleted', 'Notes deleted'));
                    }
                    const failures = results.filter(r => r.status === 'rejected');
                    if (failures.length > 0) {
                      console.error('Some deletions failed', failures);
                      toast.error(t('notes.deleteError', 'Could not delete notes'));
                    }
                  } catch (err) {
                    console.warn('[PostSiteNotes] delete error', err);
                    toast.error(t('notes.deleteError', 'Could not delete notes'));
                  } finally {
                    setConfirmDeleteIds([]);
                  }
                }}
                className="px-4 py-2 rounded-md bg-red-600 text-white"
              >
                {t('actions.delete') || 'Delete'}
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
            <h3 className="text-lg font-semibold mb-2 text-center">{t('clients.notes.detailsTitle', 'Note details')}</h3>
            <div className="text-sm text-gray-700 mb-2"><strong>{t('clients.notes.form.Title', 'Title')}: </strong>{detailsNote.title}</div>
            <div className="text-sm text-gray-700 mb-2"><strong>{t('clients.notes.form.Date', 'Date')}: </strong>{detailsNote.noteDate || detailsNote.createdAt?.split('T')?.[0]}</div>
            <div className="text-sm text-gray-700 mb-4"><strong>{t('clients.notes.form.Description', 'Description')}: </strong><div className="mt-1 whitespace-pre-wrap">{detailsNote.description}</div></div>
            <div className="text-sm text-gray-700 mb-4"><strong>{t('clients.notes.addedBy', 'Added by')}: </strong>{(detailsNote.createdBy && (detailsNote.createdBy.fullName || detailsNote.createdBy.name)) || detailsNote.createdBy || detailsNote.createdById || '-'}</div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setFormData({ title: detailsNote.title, description: detailsNote.description, date: detailsNote.noteDate || detailsNote.createdAt?.split('T')?.[0], attachments: [], id: detailsNote.id || detailsNote._id }); setViewOnly(false); setShowModal(true); setDetailsNote(null); }} className="px-4 py-2 bg-orange-600 text-white rounded-md">{t('actions.edit', 'Edit')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
