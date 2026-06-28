import React, { useState, useRef } from 'react';
import { Search, Plus, X, Mail } from 'lucide-react';
import MobileCardList from '@/components/responsive/MobileCardList';
import { toast } from 'sonner';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { Button } from '@/components/ui/button';
import { Section, EmptyState, StatusBadge } from '@/components/kit';

type EmailReport = {
  id: string;
  email: string;
  frequency: string;
  addedBy?: string;
  status?: string;
  reports?: string[];
};

const SAMPLE_REPORTS = [
  'General Report',
  'Checked-In/Out Reports',
  'Site Tour Reports',
  'Task Reports',
  'Checklist Reports',
  'Standard Report',
  'Hourly Report',
  'Vehicle Inspection Report',
  'Equipment Inspection Report',
  'Incident Report',
  'General Incident report',
  'Detailed Incident Report',
  'Parking Violation',
  'Break-In',
  'Fire Alarm',
  'Vandalism',
  'Suspicious Activity',
  'Police Onsite',
  'Trespassing',
];

export default function PostSiteEmailReports({ site }: { site?: any }) {
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [list, setList] = useState<EmailReport[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState('');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids?: string[] }>({ open: false });

  const filtered = list.filter(i => i.email.toLowerCase().includes(query.toLowerCase()));

  function toggleSelect(id: string) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }
  function toggleSelectAll() {
    const visibleIds = list.filter(i => i.email.toLowerCase().includes(query.toLowerCase())).map(i => i.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  }

  function handleActionChange(val: string) {
    setAction('');
    if (val === 'delete') {
      if (!selectedIds || selectedIds.length === 0) {
        toast.error('Selecciona al menos un elemento');
        return;
      }
      setConfirmDelete({ open: true, ids: selectedIds });
    }
  }

  function deleteSelected(ids?: string[]) {
    const idsToDelete = ids ?? selectedIds;
    setList(prev => prev.filter(i => !idsToDelete.includes(i.id)));
    setSelectedIds([]);
    setConfirmDelete({ open: false });
    toast.success(idsToDelete.length > 1 ? 'Elementos eliminados' : 'Elemento eliminado');
  }

  function toggleReport(name: string) {
    setSelectedReports(prev => (prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]));
  }

  function saveEmail() {
    if (!email) return toast.error('Email es obligatorio');
    if (!frequency) return toast.error('Selecciona frecuencia');
    const item: EmailReport = {
      id: `e-${Date.now()}`,
      email,
      frequency,
      addedBy: 'Tú',
      status: 'Active',
      reports: selectedReports,
    };
    setList(prev => [item, ...prev]);
    setModalOpen(false);
    setEmail('');
    setFrequency('');
    setSelectedReports([]);
    toast.success('Email añadido');
  }

  useScrollToTopOnMount(containerRef);

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
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search emails" className="w-full h-10 rounded-full border pl-10 pr-4" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button variant="brand" onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              <span>Add New Email</span>
            </Button>
          </div>
        </div>

        <div>
          <div className="md:block hidden overflow-x-auto">
            <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" checked={list.length > 0 && list.filter(i => i.email.toLowerCase().includes(query.toLowerCase())).every(i => selectedIds.includes(i.id))} onChange={toggleSelectAll} /></th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Frequency</th>
                <th className="px-4 py-3 text-left">Added By</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <EmptyState
                      icon={<Mail />}
                      title="No Result Found"
                      description="We can't find any item matching your search"
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(i.id)} onChange={() => toggleSelect(i.id)} /></td>
                    <td className="px-4 py-4 text-sm text-foreground">{i.email}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{i.frequency}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{i.addedBy}</td>
                    <td className="px-4 py-4">{i.status ? <StatusBadge tone={i.status === 'Active' ? 'green' : 'slate'}>{i.status}</StatusBadge> : '-'}</td>
                    <td className="px-4 py-4 text-right"><button className="px-3 py-1 rounded-full border text-sm">Actions</button></td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>

          <div className="md:hidden">
            <MobileCardList items={list} renderCard={(r: any) => (
              <div>
                <div className="text-sm font-semibold">{r.email}</div>
                <div className="text-xs text-muted-foreground">{r.frequency}</div>
              </div>
            )} loading={false} />
          </div>
        </div>
      </Section>

      {/* Drawer modal for Add Email */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center">
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />

          <div className="w-full sm:ml-auto sm:w-full sm:max-w-md bg-card rounded-t-lg sm:rounded-l-md shadow-lg pointer-events-auto flex flex-col overflow-hidden relative z-50">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-50">
              <h3 className="text-lg font-semibold">Add Email</h3>
              <button className="p-2 text-muted-foreground hover:text-foreground" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>

            {/* Scrollable content */}
            <div className="p-6 space-y-4 overflow-auto flex-1">
              <div>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="New Email..." className="w-full border rounded-lg h-12 px-3" />
              </div>

              <div>
                <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">Select Frequency*</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <div className="text-sm text-foreground/70 mb-3">Select reports to be included in DAR :</div>
                <div className="space-y-3">
                  {SAMPLE_REPORTS.map(r => (
                    <label key={r} className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedReports.includes(r)} onChange={() => toggleReport(r)} />
                      <span className={`text-sm ${selectedReports.includes(r) ? 'text-blue-600 font-semibold' : 'text-foreground'}`}>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Add spacing so content doesn't hide behind fixed footer when scrolling */}
              <div className="h-24" />
            </div>

            {/* Fixed footer with static Save/Cancel */}
            <div className="p-4 border-t bg-card flex justify-end gap-3 sticky bottom-0">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="brand" onClick={saveEmail}>Save</Button>
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
