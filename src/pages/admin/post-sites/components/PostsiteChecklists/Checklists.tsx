import React, { useState } from 'react';
import { Search, Plus, X, List } from 'lucide-react';
import { toast } from 'sonner';

type ChecklistItem = { id: string; text: string };

type Checklist = {
  id: string;
  name: string;
  description?: string;
  date?: string;
  addedBy?: string;
  items?: ChecklistItem[];
};

const SAMPLE_GUARDS = [
  { id: 'g1', name: 'Juan Perez' },
  { id: 'g2', name: 'Maria Lopez' },
];

export default function PostSiteChecklists({ site }: { site?: any }) {
  const [query, setQuery] = useState('');
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedGuard, setAssignedGuard] = useState<string | ''>('');
  const [items, setItems] = useState<ChecklistItem[]>([{ id: String(Date.now()), text: '' }]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids?: string[] }>({ open: false });

  function toggleSelect(id: string) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    const visibleIds = checklists.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).map(c => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  }

  function handleActionChange(val: string) {
    setAction('');
    if (val === 'delete') {
      if (!selectedIds || selectedIds.length === 0) {
        // Use toast for consistency
        toast.error('Selecciona al menos un elemento');
        return;
      }
      setConfirmDelete({ open: true, ids: selectedIds });
    }
  }

  function deleteSelected(ids?: string[]) {
    const idsToDelete = ids ?? selectedIds;
    setChecklists(prev => prev.filter(c => !idsToDelete.includes(c.id)));
    setSelectedIds([]);
    setConfirmDelete({ open: false });
    toast.success(idsToDelete.length > 1 ? 'Elementos eliminados' : 'Elemento eliminado');
  }

  function addItem() {
    setItems(i => [...i, { id: `it-${Date.now()}-${Math.random()}`, text: '' }]);
  }

  function removeItem(id: string) {
    setItems(i => i.filter(x => x.id !== id));
  }

  function updateItem(id: string, text: string) {
    setItems(i => i.map(x => (x.id === id ? { ...x, text } : x)));
  }

  function submitDraft(asDraft = false) {
    const c: Checklist = {
      id: `c-${Date.now()}`,
      name,
      description,
      date: new Date().toISOString(),
      addedBy: 'Tú',
      items,
    };

    setChecklists(prev => [c, ...prev]);
    // Reset
    setModalOpen(false);
    setName('');
    setDescription('');
    setAssignedGuard('');
    setItems([{ id: String(Date.now()), text: '' }]);
  }

  const filtered = checklists.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative">
            <select value={action} onChange={e => handleActionChange(e.target.value)} className="h-10 rounded-full border px-3 bg-white text-sm">
              <option value="">Action</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"><Search size={16} /></span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search checklists" className="w-full h-10 rounded-full border pl-10 pr-4" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center"><Plus size={14} /></span>
              <span className="text-sm font-medium">New Checklist</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" checked={filtered.length > 0 && filtered.every(c => selectedIds.includes(c.id))} onChange={() => toggleSelectAll()} /></th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Added By</th>
                <th className="px-4 py-3 text-right">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-40 h-40">
                          <svg viewBox="0 0 200 200" className="w-full h-full text-blue-100">
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
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                    <td className="px-4 py-4 text-sm text-gray-700">{c.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{new Date(c.date || '').toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{c.addedBy}</td>
                    <td className="px-4 py-4 text-right">
                      <button className="px-3 py-1 rounded-full border text-sm">Actions</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal as right-side drawer */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay behind the drawer */}
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />

          {/* Drawer on the right (pointer-events ensured for inputs) */}
          <div className="relative z-50 ml-auto w-full max-w-md h-full overflow-auto bg-white rounded-l-md shadow-lg pointer-events-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-50">
              <h3 className="text-lg font-semibold">New Checklist</h3>
              <button className="p-2 text-gray-500 hover:text-gray-700" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600">Name*</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg h-12 px-3 mt-2" placeholder="Name*" />
              </div>

              <div>
                <label className="block text-sm text-gray-600">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-md p-3 mt-2 h-28" placeholder="Description" />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Assign Guard*</label>
                <select value={assignedGuard} onChange={e => setAssignedGuard(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">Select guard</option>
                  {SAMPLE_GUARDS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">Add Checklist Item *</label>
                  <button onClick={addItem} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border text-blue-600">+ Add</button>
                </div>

                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={it.id} className="flex items-center gap-3">
                      <div className="p-3 bg-gray-100 rounded"><span className="text-gray-400">≡</span></div>
                      <input value={it.text} onChange={e => updateItem(it.id, e.target.value)} placeholder="Checklist Item" className="flex-1 border rounded-md h-12 px-3" />
                      <button onClick={() => removeItem(it.id)} className="px-3 py-2 rounded-full bg-red-50 text-red-600">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => { submitDraft(true); }} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">Save As Draft</button>
                <button onClick={() => { submitDraft(false); }} className="px-4 py-2 rounded-full bg-blue-600 text-white">Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete.open && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete({ open: false })} />
          <div className="bg-white rounded-md shadow-lg w-full max-w-md" style={{ zIndex: 10000 }}>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600">!</div>
                <div>
                  <h4 className="text-lg font-semibold">Confirmar eliminación</h4>
                  <p className="text-sm text-gray-600 mt-1">¿Estás seguro que deseas eliminar los elementos seleccionados?</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setConfirmDelete({ open: false })} className="px-4 py-2 rounded-full bg-white border">Cancelar</button>
              <button onClick={() => deleteSelected(confirmDelete.ids)} className="px-4 py-2 rounded-full bg-red-600 text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
