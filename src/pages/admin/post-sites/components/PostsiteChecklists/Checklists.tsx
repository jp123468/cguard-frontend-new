import React, { useState, useRef } from 'react';
import { Search, Plus, X, List, ListChecks } from 'lucide-react';
import MobileCardList from '@/components/responsive/MobileCardList';
import { toast } from 'sonner';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { Button } from '@/components/ui/button';
import { Section, EmptyState } from '@/components/kit';

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
  const containerRef = useRef<HTMLDivElement | null>(null);

  useScrollToTopOnMount(containerRef);

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
    <div ref={containerRef} className="space-y-4">
      <Section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative">
            <select value={action} onChange={e => handleActionChange(e.target.value)} className="h-10 rounded-full border px-3 bg-card text-sm">
              <option value="">Action</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"><Search size={16} /></span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search checklists" className="w-full h-10 rounded-full border pl-10 pr-4" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button variant="brand" onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              <span>New Checklist</span>
            </Button>
          </div>
        </div>

        <div>
          <div className="md:block hidden overflow-x-auto">
            <table className="w-full">
            <thead className="bg-muted/30">
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
                    <td colSpan={5} className="px-4 py-12">
                      <EmptyState
                        icon={<ListChecks />}
                        title="No Result Found"
                        description="We can't find any item matching your search"
                      />
                    </td>
                  </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                    <td className="px-4 py-4 text-sm text-foreground">{c.name}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{new Date(c.date || '').toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{c.addedBy}</td>
                    <td className="px-4 py-4 text-right">
                      <button className="px-3 py-1 rounded-full border text-sm">Actions</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>

          <div className="md:hidden">
            <MobileCardList items={filtered} renderCard={(c: Checklist) => (
              <div>
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.date}</div>
              </div>
            )} loading={false} />
          </div>
        </div>
      </Section>

      {/* Modal as right-side drawer */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center">
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />

          <div className="w-full sm:ml-auto sm:w-full sm:max-w-md bg-card shadow-lg rounded-t-lg sm:rounded-l-md overflow-auto relative z-50">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-50">
              <h3 className="text-lg font-semibold">New Checklist</h3>
              <button className="p-2 text-muted-foreground hover:text-foreground" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-foreground/70">Name*</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg h-12 px-3 mt-2" placeholder="Name*" />
              </div>

              <div>
                <label className="block text-sm text-foreground/70">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-md p-3 mt-2 h-28" placeholder="Description" />
              </div>

              <div>
                <label className="block text-sm text-foreground/70 mb-2">Assign Guard*</label>
                <select value={assignedGuard} onChange={e => setAssignedGuard(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">Select guard</option>
                  {SAMPLE_GUARDS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-foreground/70">Add Checklist Item *</label>
                  <button onClick={addItem} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-card border text-blue-600">+ Add</button>
                </div>

                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={it.id} className="flex items-center gap-3">
                      <div className="p-3 bg-muted rounded"><span className="text-muted-foreground">≡</span></div>
                      <input value={it.text} onChange={e => updateItem(it.id, e.target.value)} placeholder="Checklist Item" className="flex-1 border rounded-md h-12 px-3" />
                      <button onClick={() => removeItem(it.id)} className="px-3 py-2 rounded-full bg-red-500/10 text-red-600">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => { submitDraft(true); }}>Save As Draft</Button>
                <Button variant="brand" onClick={() => { submitDraft(false); }}>Submit</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete.open && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete({ open: false })} />
          <div className="bg-card rounded-md shadow-lg w-full max-w-md" style={{ zIndex: 10000 }}>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-600">!</div>
                <div>
                  <h4 className="text-lg font-semibold">Confirmar eliminación</h4>
                  <p className="text-sm text-foreground/70 mt-1">¿Estás seguro que deseas eliminar los elementos seleccionados?</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setConfirmDelete({ open: false })} className="px-4 py-2 rounded-full bg-card border">Cancelar</button>
              <button onClick={() => deleteSelected(confirmDelete.ids)} className="px-4 py-2 rounded-full bg-red-600 text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
