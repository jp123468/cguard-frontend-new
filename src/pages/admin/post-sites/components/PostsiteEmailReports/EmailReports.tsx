import React, { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

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
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search emails" className="w-full h-10 rounded-full border pl-10 pr-4" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center"><Plus size={14} /></span>
              <span className="text-sm font-medium">Add New Email</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
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
                filtered.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(i.id)} onChange={() => toggleSelect(i.id)} /></td>
                    <td className="px-4 py-4 text-sm text-gray-700">{i.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{i.frequency}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{i.addedBy}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{i.status}</td>
                    <td className="px-4 py-4 text-right"><button className="px-3 py-1 rounded-full border text-sm">Actions</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer modal for Add Email */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />

          <div className="relative z-50 ml-auto w-full max-w-md h-full bg-white rounded-l-md shadow-lg pointer-events-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-50">
              <h3 className="text-lg font-semibold">Add Email</h3>
              <button className="p-2 text-gray-500 hover:text-gray-700" onClick={() => setModalOpen(false)}><X size={18} /></button>
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
                <div className="text-sm text-gray-600 mb-3">Select reports to be included in DAR :</div>
                <div className="space-y-3">
                  {SAMPLE_REPORTS.map(r => (
                    <label key={r} className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedReports.includes(r)} onChange={() => toggleReport(r)} />
                      <span className={`text-sm ${selectedReports.includes(r) ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Add spacing so content doesn't hide behind fixed footer when scrolling */}
              <div className="h-24" />
            </div>

            {/* Fixed footer with static Save/Cancel */}
            <div className="p-4 border-t bg-white flex justify-end sticky bottom-0">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 mr-3">Cancel</button>
              <button onClick={saveEmail} className="px-4 py-2 rounded-full bg-blue-600 text-white">Save</button>
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
