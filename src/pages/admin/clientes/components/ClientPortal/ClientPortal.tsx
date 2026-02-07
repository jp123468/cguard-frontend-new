import React, { useEffect, useRef, useState } from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';

type Props = { client?: any };

export default function ClientPortal({ client }: Props) {
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [touched, setTouched] = useState({ name: false, email: false });
  const [selectAll, setSelectAll] = useState(false);

  const permissions = [
    { label: 'Checked-In/Out Reports', type: 'option' },
    { label: 'DAR Reports', type: 'option' },
    { label: 'Site Tour Reports', type: 'option' },
    { label: 'Task Reports', type: 'option' },
    { label: 'Passdown Logs', type: 'option' },
    { label: 'Watch Mode Logs', type: 'option' },
    { label: 'Tour Checkpoint Logs', type: 'option' },
    { label: 'Checklist Report', type: 'option' },
    { label: 'Vehicle Patrol Reports', type: 'option' },
    { label: 'Post Order', type: 'header' },
    { label: 'View Post Order', type: 'option' },
    { label: 'Add/Update Post Order', type: 'option' },
    { label: 'Visitor Manager', type: 'header' },
    { label: 'View Visitor Manager', type: 'option' },
    { label: 'Add/Update Visitor', type: 'option' },
    { label: 'Add/Update Vehicle', type: 'option' },
    { label: 'Dispatcher', type: 'header' },
    { label: 'View Dispatcher Log', type: 'option' },
    { label: 'View Dispatcher Log Details', type: 'option' },
    { label: 'Add/Update Dispatcher', type: 'option' },
    { label: 'Time Clock', type: 'header' },
    { label: 'View Time Log', type: 'option' },
    { label: 'View Time Card', type: 'option' },
    { label: 'Scheduler', type: 'header' },
    { label: 'View Scheduler', type: 'option' },
    { label: 'Allow Request Shifts', type: 'option' },
    { label: 'View Shift Status', type: 'option' },
    { label: 'Parking Manager', type: 'header' },
    { label: 'View Contacts', type: 'option' },
    { label: 'Add/Update Contacts', type: 'option' },
    { label: 'View Vehicles', type: 'option' },
    { label: 'Add/Update Vehicles', type: 'option' },
    { label: 'View Parking Areas', type: 'option' },
    { label: 'Add/Update Parking Areas', type: 'option' },
    { label: 'View Parking Lots', type: 'option' },
    { label: 'Add/Update Parking Lots', type: 'option' },
    { label: 'View Parking Incidents', type: 'option' },
    { label: 'GPS Tracker', type: 'header' },
    { label: 'View Tracking History', type: 'option' },
    { label: 'View Live Tracking', type: 'option' },
  ];

  const [checks, setChecks] = useState<boolean[]>(permissions.map(() => false));

  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Action');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) setActionOpen(false);
    };
    if (actionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [actionOpen]);

  function handleToggleCheck(idx: number) {
    setChecks((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }

  function handleSelectAll(v: boolean) {
    setSelectAll(v);
    setChecks(permissions.map((p) => (p.type === 'option' ? v : false)));
  }

  function handleInvite() {
    setTouched({ name: true, email: true });
    if (!form.name.trim() || !form.email.trim()) return;
    // TODO: send invite to API
    // temporary feedback
    // eslint-disable-next-line no-alert
    alert(`Invited ${form.name} <${form.email}>`);
    setShowInvite(false);
    setForm({ name: '', email: '' });
    setChecks(permissions.map(() => false));
    setSelectAll(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-4 mb-4">

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search client portal"
                className="w-full pl-9 pr-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={() => setShowInvite(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors"
            >
              <Plus size={16} />
              Invite
            </button>
          </div>
        </div>



        <div className="mt-6 flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Access Level</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Access Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(client?.portalUsers) ? client.portalUsers : []).length === 0 ? (
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
                (client.portalUsers || []).map((u: any, idx: number) => (
                  <tr key={u.id || idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <input type="checkbox" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.name || u.contactName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.accessLevel || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.status || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.role || '-'}</td>
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

          <div className="fixed right-0 top-0 bottom-0 w-[540px] bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Invite Client</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
                <X />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 text-sm text-gray-700">
                <span className="font-semibold text-gray-800 mr-2">First user is by default the super admin account.
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Contact Name*</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                    className={`w-full border rounded-md h-10 px-3 ${touched.name && !form.name.trim() ? 'border-red-500' : ''}`}
                  />
                  {touched.name && !form.name.trim() && <div className="text-red-600 text-sm mt-1">Contact name required</div>}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Email*</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    className={`w-full border rounded-md h-10 px-3 ${touched.email && !form.email.trim() ? 'border-red-500' : ''}`}
                  />
                  {touched.email && !form.email.trim() && <div className="text-red-600 text-sm mt-1">Email required</div>}
                </div>

                <div className="text-sm text-gray-700">Select the access level for the super admin client portal user, all subsequent users will have same access level</div>

                <div className="pt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <input id="selectAll" type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} className="h-4 w-4" />
                    <label htmlFor="selectAll" className="text-sm font-medium">
                      Select All
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {permissions.map((p, i) =>
                      p.type === 'header' ? (
                        <div key={p.label} className="col-span-2 mt-3">
                          <label className="flex items-center gap-3 text-sm font-semibold text-blue-600">
                            <input type="checkbox" checked={checks[i]} onChange={() => handleToggleCheck(i)} className="h-4 w-4" />
                            <span>{p.label}</span>
                          </label>
                        </div>
                      ) : (
                        <label key={p.label} className="flex items-center gap-3 text-sm">
                          <input type="checkbox" checked={checks[i]} onChange={() => handleToggleCheck(i)} className="h-4 w-4" />
                          <span>{p.label}</span>
                        </label>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-white sticky bottom-0 z-20">
              <div className="flex items-center justify-end gap-3">
                <button onClick={handleInvite} className="px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700">
                  Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
