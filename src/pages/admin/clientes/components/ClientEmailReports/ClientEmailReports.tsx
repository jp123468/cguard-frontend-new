import React, { useEffect, useRef, useState } from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';

type Props = { client?: any };
export default function ClientEmailReports({ client }: { client: any }) {
  const [query, setQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [users, setUsers] = useState<any[]>(Array.isArray(client?.portalUsers) ? client.portalUsers : []);
  const [form, setForm] = useState({ postSite: '', email: '', frequency: '' });
  const [touched, setTouched] = useState({ postSite: false, email: false, frequency: false });
  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState('Action');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) setActionOpen(false);
    };
    if (actionOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [actionOpen]);

  const filtered = users.filter((u) => (u.name || '').toLowerCase().includes(query.toLowerCase()) || (u.email || '').toLowerCase().includes(query.toLowerCase()));

  function openInvite() {
    setForm({ postSite: '', email: '', frequency: '' });
    setTouched({ postSite: false, email: false, frequency: false });
    setShowInvite(true);
  }
  const reportsList = [
    'General Report',
    'Checked-In/Out Reports',
    'Site Tour Reports',
    'Task Reports',
    'Checklist Reports',
    'Standard Report',
    'Incident Report',
  ];

  const [selectedReports, setSelectedReports] = useState<string[]>(['Standard Report', 'Incident Report']);

  function toggleReport(name: string) {
    setSelectedReports((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  }

  function handleSaveEmail() {
    setTouched({ postSite: true, email: true, frequency: true });
    if (!form.postSite || !form.email.trim() || !form.frequency) return;
    const newEmail = { id: String(Date.now()), email: form.email, frequency: form.frequency, postSite: form.postSite, reports: selectedReports, date: new Date().toISOString(), status: 'Active' };
    setUsers((prev) => [newEmail as any, ...prev]);
    // eslint-disable-next-line no-alert
    alert(`Saved ${form.email}`);
    setShowInvite(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
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
                <button onClick={() => { setActionSelection('Eliminar'); setActionOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Eliminar</button>
              </div>
            )}
          </div>
          <div className="relative w-full max-w-lg">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search access list" className="w-full pl-9 pr-3 py-2 border rounded-full text-sm" />
          </div>

          <div className="ml-4">
            <button onClick={openInvite} className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2 rounded-full shadow hover:bg-orange-700 whitespace-nowrap">
              <Plus size={16} />
              Add New Email
            </button>
          </div>
        </div>

        <div className="mt-6 flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Frequency</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Post Site</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>

              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
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
                        <h3 className="text-lg font-semibold text-gray-700">No results found</h3>
                        <p className="text-sm text-gray-500 mt-1">We couldn't find<br />any items matching<br />your search</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-700">{u.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{u.frequency}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{(Array.isArray(client?.postSites) ? (client.postSites.find((ps: any) => ps.id === u.postSite)?.name) : u.postSite) || ''}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{u.date ? new Date(u.date).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{u.status || 'Active'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowInvite(false)} />

          <div className="fixed right-0 top-0 bottom-0 w-[520px] bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Add New Email</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Post Site*</label>
                  <select value={form.postSite} onChange={(e) => setForm((p) => ({ ...p, postSite: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, postSite: true }))} className="w-full border rounded-md h-12 px-3">
                    <option value="">Select Post Site</option>
                    {(Array.isArray(client?.postSites) ? client.postSites : []).map((ps: any) => (
                      <option key={ps.id} value={ps.id}>{ps.name}</option>
                    ))}
                  </select>
                  {touched.postSite && !form.postSite && <div className="text-red-600 text-sm mt-1">Required</div>}
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">New Email</label>
                  <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, email: true }))} placeholder="New Email..." className="w-full border rounded-md h-12 px-3" />
                  {touched.email && !form.email && <div className="text-red-600 text-sm mt-1">Required</div>}
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Select Frequency*</label>
                  <select value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, frequency: true }))} className="w-full border rounded-md h-12 px-3">
                    <option value="">Select Frequency</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                  {touched.frequency && !form.frequency && <div className="text-red-600 text-sm mt-1">Required</div>}
                </div>

                <div>
                  <div className="text-sm text-gray-700 mb-3">Select reports to be included in DAR :</div>
                  <div className="grid gap-3">
                    {reportsList.map((r) => {
                      const active = selectedReports.includes(r);
                      return (
                        <label key={r} className="flex items-start gap-3">
                          <button type="button" onClick={() => toggleReport(r)} className={`w-5 h-5 rounded-sm flex items-center justify-center border ${active ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-300'}`}>
                            {active ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            ) : null}
                          </button>
                          <span className={`${active ? 'text-orange-600 font-semibold' : 'text-gray-700'}`}>{r}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white sticky bottom-0 z-20">
              <div className="flex items-center justify-end">
                <button onClick={handleSaveEmail} className="ml-auto w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg hover:bg-orange-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
