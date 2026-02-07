import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { useEffect, useState, useRef } from 'react';
import { Search, ChevronDown, Plus, X } from 'lucide-react';
import securityGuardService from '@/lib/api/securityGuardService';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function GuardAsignarSitiosPage() {
  const { id } = useParams();
  const [guard, setGuard] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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

  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Action');

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([
    { id: 'c1', name: 'Jose Pasante' },
    { id: 'c2', name: 'Acme Corp' },
  ]);
  const [postSites, setPostSites] = useState<Array<{ id: string; name: string }>>([
    { id: 'p1', name: 'josePasante' },
    { id: 'p2', name: 'Central Office' },
  ]);

  const [mappings, setMappings] = useState<Array<{ id: string; client: string; site: string }>>([
    { id: 'm1', client: 'Jose Pasante', site: 'josePasante' },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPostSite, setSelectedPostSite] = useState('');

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(mappings.map((m) => m.id)); else setSelectedIds([]);
  };

  const assignSite = () => {
    if (!selectedClient || !selectedPostSite) {
      toast.error('Please select client and post site');
      return;
    }
    const clientName = clients.find((c) => c.id === selectedClient)?.name ?? selectedClient;
    const siteName = postSites.find((p) => p.id === selectedPostSite)?.name ?? selectedPostSite;

    // Try to persist to backend pivot table first
    (async () => {
      try {
        const tenantId = localStorage.getItem('tenantId');
        let mappingId = Date.now().toString();
        if (tenantId) {
          const payload = {
            tenantUserId: id, // current guard id from route
            businessInfoId: selectedPostSite,
            clientAccountId: selectedClient,
          } as any;
          const { data } = await api.post(`/tenant/${tenantId}/tenant-user-post-sites`, payload, { toast: { success: 'Assigned' } } as any);
          mappingId = data?.id ?? mappingId;
        }
        const newMapping = { id: mappingId, client: clientName, site: siteName, tenantUserId: id, businessInfoId: selectedPostSite };
        setMappings((prev) => [newMapping, ...prev]);
        setSelectedClient('');
        setSelectedPostSite('');
        setAssignModalOpen(false);
      } catch (err) {
        console.error('Assign failed', err);
        toast.error('Assign failed');
      }
    })();
  };

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.asignarSitios">
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
                      placeholder="Search Post Sites"
                      value={''}
                      onChange={() => {}}
                      className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => setAssignModalOpen(true)} className="px-4 py-2 bg-orange-600 text-white rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-orange-700">
                    <Plus size={14} />
                    Assign Post Sites
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Client</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Post Sites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={(e) => {
                            if (e.target.checked) setSelectedIds((prev) => [...prev, m.id]); else setSelectedIds((prev) => prev.filter(id => id !== m.id));
                          }} className="h-4 w-4" />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{m.client}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{m.site}</td>
                      </tr>
                    ))}
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

        {/* Assign Modal/Drawer */}
        {assignModalOpen && (
          <div className="fixed inset-0 z-50" onClick={() => setAssignModalOpen(false)}>
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
                <h3 className="text-lg font-semibold">Assign Sites</h3>
                <button onClick={() => setAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-2">Client*</label>
                    <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="">Select client</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 block mb-2">Post Site*</label>
                    <select value={selectedPostSite} onChange={(e) => setSelectedPostSite(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="">Select post site</option>
                      {postSites.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t bg-white">
                <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50">Cancel</button>
                <button onClick={assignSite} className="px-4 py-2 bg-orange-600 text-white rounded-md">Assign</button>
              </div>
            </div>
          </div>
        )}
      </GuardsLayout>
    </AppLayout>
  )

}
