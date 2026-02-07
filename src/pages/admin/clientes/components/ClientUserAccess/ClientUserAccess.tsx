import React, { useEffect, useRef, useState } from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';

type Props = { client?: any };

export default function ClientUserAccess({ client }: Props) {
  const [query, setQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [users, setUsers] = useState<any[]>(Array.isArray(client?.portalUsers) ? client.portalUsers : []);
  const [selectedExisting, setSelectedExisting] = useState<string | ''>('');
  const [form, setForm] = useState({ name: '', email: '', accessLevel: '' });
  const [touched, setTouched] = useState({ name: false, email: false, accessLevel: false });
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
    setSelectedExisting('');
    setForm({ name: '', email: '', accessLevel: '' });
    setTouched({ name: false, email: false, accessLevel: false });
    setShowInvite(true);
  }

  function handleInvite() {
    setTouched({ name: true, email: true, accessLevel: true });
    if (!selectedExisting && (!form.name.trim() || !form.email.trim() || !form.accessLevel)) return;
    if (selectedExisting) {
      const existing = users.find((u) => u.id === selectedExisting);
      if (existing) {
        // eslint-disable-next-line no-alert
        alert(`Invited existing ${existing.name}`);
      }
    } else {
      const newUser = { id: String(Date.now()), name: form.name, email: form.email, role: form.accessLevel, status: 'Invited' };
      setUsers((prev) => [newUser, ...prev]);
      // eslint-disable-next-line no-alert
      alert(`Invited ${newUser.name}`);
    }
    setShowInvite(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative w-full max-w-lg">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search access list" className="w-full pl-9 pr-3 py-2 border rounded-full text-sm" />
          </div>

          <div className="ml-4">
            <button onClick={openInvite} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-full shadow hover:bg-orange-700">
              <Plus size={16} />
              Invite User
            </button>
          </div>
        </div>

        <div className="mt-6 flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
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
                    <td className="px-4 py-4 text-sm text-gray-700">{u.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{u.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{u.role || 'User'}</td>
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
              <h3 className="text-lg font-semibold">Invite User</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 text-sm text-gray-700">Select Existing User</div>
              <select className="w-full border rounded-md h-10 px-3 mb-6" value={selectedExisting} onChange={(e) => setSelectedExisting(e.target.value)}>
                <option value="">Select Existing User</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                ))}
              </select>

              <div className="text-center text-sm text-gray-500 mb-4">Or Add New User</div>

              <div className="space-y-4">
                <div>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, name: true }))} placeholder="Name *" className="w-full border rounded-md h-10 px-3" />
                  {touched.name && !form.name && <div className="text-red-600 text-sm mt-1">Required</div>}
                </div>

                <div>
                  <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, email: true }))} placeholder="Email *" className="w-full border rounded-md h-10 px-3" />
                  {touched.email && !form.email && <div className="text-red-600 text-sm mt-1">Required</div>}
                </div>

                <div>
                  <select value={form.accessLevel} onChange={(e) => setForm((p) => ({ ...p, accessLevel: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, accessLevel: true }))} className="w-full border rounded-md h-10 px-3">
                    <option value="">Access Level *</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="User">User</option>
                  </select>
                  {touched.accessLevel && !form.accessLevel && <div className="text-red-600 text-sm mt-1">Required</div>}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-white sticky bottom-0 z-20">
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50">Cancel</button>
                <button onClick={handleInvite} className="px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700">Invite</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
