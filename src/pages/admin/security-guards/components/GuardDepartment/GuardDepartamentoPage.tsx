import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { useEffect, useState, useRef } from 'react';
import { Search, ChevronDown, Plus, X } from 'lucide-react';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from 'sonner';

export default function GuardDepartamentoPage() {
  const { id } = useParams();
  const [guard, setGuard] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Action');

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [mappings, setMappings] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownQuery, setDropdownQuery] = useState('');

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(mappings.map((m) => m.id)); else setSelectedIds([]);
  };

  const handleAssignFromDropdown = () => {
    if (selectedIds.length === 0) { toast.error('Please select at least one department'); return; }
    const items = departments.filter(s => selectedIds.includes(s.id)).map(s => ({ id: Date.now().toString() + Math.random().toString(36).slice(2,6), name: s.name, description: s.description }));
    setMappings((prev) => [...items, ...prev]);
    setSelectedIds([]);
    setDropdownQuery('');
    setShowDropdown(false);
    setAssignModalOpen(false);
  };

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    securityGuardService
      .get(id)
      .then((data: any) => {
        if (!mounted) return;
        const g = data.guard ?? data;
        const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
        setGuard({ ...g, fullName });
      })
      .catch((err: any) => {
        console.error('Error cargando guardia:', err);
        toast.error('No se pudo cargar guardia');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  // demo: prefill some departments
  useEffect(() => {
    setDepartments([
      { id: 'd1', name: 'Security Ops', description: 'Operations department' },
      { id: 'd2', name: 'Administration', description: 'Admin and HR' },
    ]);
    setMappings([]);
  }, []);

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.departamento">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Cargando...</div>
          </div>
        ) : guard ? (
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
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
                        onClick={() => { setActionSelection('Delete'); setActionOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search departments"
                      value={''}
                      onChange={() => {}}
                      className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => setAssignModalOpen(true)} className="px-4 py-2 bg-orange-600 text-white rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-orange-700">
                    <Plus size={14} />
                    Assign Department
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          aria-label="select all"
                          checked={mappings.length > 0 && selectedIds.length === mappings.length}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="h-4 w-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-12">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-48 h-48">
                              <svg viewBox="0 0 200 200" className="w-full h-full text-orange-50">
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
                    ) : (
                      mappings.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={(e) => {
                              if (e.target.checked) setSelectedIds((prev) => [...prev, m.id]); else setSelectedIds((prev) => prev.filter(id => id !== m.id));
                            }} className="h-4 w-4" />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{m.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{m.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">No se pudo cargar el guardia</div>
          </div>
        )}

        {assignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setAssignModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b bg-white">
                <h3 className="text-lg font-semibold">Assign Department</h3>
                <button onClick={() => setAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className={`text-sm block mb-2 ${selectedIds.length === 0 ? 'text-red-600' : 'text-gray-600'}`}>Department*</label>

                    <div className={`border rounded-md ${selectedIds.length === 0 ? 'border-red-500' : 'border-gray-200'} bg-white`}>
                      <div className="px-3 py-2 flex items-center justify-between cursor-pointer" onClick={() => setShowDropdown((s) => !s)}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <span className="block text-sm text-gray-700 truncate">
                              {selectedIds.length === 0 ? 'Select departments...' : `${selectedIds.length} selected`}
                            </span>
                          </div>
                        </div>
                        <ChevronDown size={16} />
                      </div>
                      {showDropdown && (
                        <div className="border-t border-gray-100 bg-white p-3">
                          <div className="mb-2">
                            <input
                              type="text"
                              placeholder="Search..."
                              className="w-full px-3 py-2 border rounded-md text-sm"
                              value={dropdownQuery}
                              onChange={(e) => setDropdownQuery(e.target.value)}
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {departments.filter(s => s.name.toLowerCase().includes(dropdownQuery.toLowerCase())).map((s) => (
                              <label key={s.id} className="flex items-center gap-3 py-2 cursor-pointer">
                                <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={(e) => {
                                  if (e.target.checked) setSelectedIds((prev) => [...prev, s.id]); else setSelectedIds((prev) => prev.filter(id => id !== s.id));
                                }} className="h-4 w-4" />
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-700 truncate">{s.name}</div>
                                  {s.description && <div className="text-xs text-gray-400 truncate">{s.description}</div>}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t bg-white">
                <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50">Cancel</button>
                <button onClick={handleAssignFromDropdown} className="px-4 py-2 bg-orange-600 text-white rounded-md">Assign</button>
              </div>
            </div>
          </div>
        )}
      </GuardsLayout>
    </AppLayout>
  );
}
