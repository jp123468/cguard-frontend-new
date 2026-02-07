import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { useEffect, useState, useRef } from 'react';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from 'sonner';
import { Search, ChevronDown, Plus, X, Paperclip, Filter } from 'lucide-react';
import TimeInput from '@/components/TimeInput';
import MultiCombobox from '@/components/app/multicombobox';


export default function GuardRemindersPage() {
  const { id } = useParams();
  const [guard, setGuard] = useState<any>(null);
  const [guardsList, setGuardsList] = useState<any[]>([]);
  const guardsMapRef = useRef<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Action');
  const [searchQuery, setSearchQuery] = useState('');
  const [remindOpen, setRemindOpen] = useState(false);
  const remindContainerRef = useRef<HTMLDivElement | null>(null);
  const remindOptionsRef = useRef<HTMLDivElement | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [remindersData, setRemindersData] = useState<any[]>([]);
  const [selectedReminderIds, setSelectedReminderIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    datetime: new Date().toISOString().slice(0,16), // yyyy-mm-ddThh:mm
    createdFor: [] as string[],
    priority: 'Normal',
    remind: '30 Minutes Before',
    repeat: 'Never',
    status: 'Open',
    attachments: [] as File[],
  });

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

  // load guards for Created For multi-select
  useEffect(() => {
    let mounted = true;
    securityGuardService
      .list()
      .then((data: any) => {
        if (!mounted) return;
        const items = Array.isArray(data) ? data : data?.rows ?? [];
        const list = items.map((it: any) => {
          const g = it.guard ?? it;
          const id = g.id ?? g.guardId ?? it.id ?? '';
          const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
          const status = (g.status ?? it.status ?? '').toString().toLowerCase();
          return { id, fullName: fullName || '-', status };
        }).filter((x: any) => x.id && x.status !== 'pending' && x.status !== 'pendiente');
        setGuardsList(list);
        const map: Record<string,string> = {};
        list.forEach((g: any) => map[g.id] = g.fullName);
        guardsMapRef.current = map;
      })
      .catch((err: any) => {
        console.error('Error loading guards list:', err);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!remindOpen) return;
    const handleDocClick = (e: MouseEvent) => {
      if (remindContainerRef.current && !remindContainerRef.current.contains(e.target as Node)) {
        setRemindOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);

    // on open, scroll selected option to top of the list
    const container = remindOptionsRef.current;
    if (container) {
      const selector = container.querySelector(`[data-value="${formData.remind}"]`) as HTMLElement | null;
      if (selector && typeof selector.scrollIntoView === 'function') {
        // align selected option to start so options appear above
        selector.scrollIntoView({ block: 'start' });
      }
    }

    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [remindOpen, formData.remind]);

  const handleAddReminder = () => {
    setShowModal(true);
    setFormData({ title: '', description: '', datetime: new Date().toISOString().slice(0,16), createdFor: guard?.id ? [guard.id] : [], priority: 'Normal', remind: '30 Minutes Before', repeat: 'Never', status: 'Open', attachments: [] });
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSubmitReminder = () => {
    const newRem = {
      title: formData.title,
      description: formData.description,
      datetime: formData.datetime,
      createdFor: formData.createdFor,
      createdForNames: (formData.createdFor || []).map((id: string) => guardsMapRef.current[id] || id),
      createdBy: 'You',
      priority: formData.priority,
      remind: formData.remind,
      repeat: formData.repeat,
      status: formData.status,
      attachments: formData.attachments,
      id: Date.now().toString() + Math.random().toString(36).slice(2,7),
    };
    setRemindersData((prev) => [newRem, ...prev]);
    setShowModal(false);
    setFormData({ title: '', description: '', datetime: new Date().toISOString().slice(0,16), createdFor: [], priority: 'Normal', remind: '30 Minutes Before', repeat: 'Never', status: 'Open', attachments: [] });
  };

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.recordatorios">
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              {/* Left: Action Dropdown */}
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
                      onClick={() => { setActionSelection('Archive'); setActionOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>

              {/* Center: Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search reminders"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Right: Add Button */}
              <div className="flex items-center gap-3">
                
                <button onClick={() => setShowFilters(true)} className="px-3 py-2 bg-white text-gray-700 border rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <span>Filters</span>
                </button>
                <button
                  onClick={handleAddReminder}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors"
                >
                  <Plus size={16} />
                  Add Reminder
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        aria-label="select all"
                        checked={remindersData.length > 0 && selectedReminderIds.length === remindersData.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedReminderIds(remindersData.map((r) => r.id));
                          else setSelectedReminderIds([]);
                        }}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reminder Date/Time</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Created By</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {remindersData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12">
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
                            <h3 className="text-lg font-semibold text-gray-700">No Result Found</h3>
                            <p className="text-sm text-gray-500 mt-1">We can't find any item matching your search</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    remindersData.map((r, idx) => (
                      <tr key={r.id ?? idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedReminderIds.includes(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedReminderIds((prev) => [...prev, r.id]);
                              else setSelectedReminderIds((prev) => prev.filter((id) => id !== r.id));
                            }}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.datetime}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.createdForNames ? r.createdForNames.join(', ') : r.createdBy}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.priority}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50" onClick={handleCloseModal}>
              <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                  <h2 className="text-lg font-semibold text-gray-800">Add Reminder</h2>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X /></button>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Title*" className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea value={formData.description ?? ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" rows={4} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Selected Date*</label>
                      <input type="date" value={formData.datetime ? formData.datetime.split('T')[0] : ''} onChange={(e) => setFormData({ ...formData, datetime: `${e.target.value}T${(formData.datetime || '').split('T')[1] || '09:00'}` })} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">At*</label>
                      <TimeInput value={formData.datetime ? (formData.datetime.split('T')[1] || '').slice(0,5) : '09:00'} onChange={(val) => setFormData({ ...formData, datetime: `${(formData.datetime || '').split('T')[0] || new Date().toISOString().slice(0,10)}T${val}` })} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Created For*</label>
                    <MultiCombobox
                      value={formData.createdFor}
                      onChange={(vals) => setFormData({ ...formData, createdFor: vals })}
                      options={guardsList.map((g) => ({ value: g.id, label: g.fullName }))}
                      placeholder="Select guards"
                      aria-label="Created For"
                      className="w-full h-14"
                      popoverClassName="min-w-[20rem]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority*</label>
                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>

                  <div className="relative" ref={remindContainerRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remind</label>
                    <button
                      type="button"
                      onClick={() => setRemindOpen((s) => !s)}
                      className="w-full px-3 py-2 border rounded-md text-sm flex items-center justify-between"
                    >
                      <span className="text-gray-700">{formData.remind ?? '30 Minutes Before'}</span>
                      <ChevronDown size={16} />
                    </button>

                    {remindOpen && (
                      <div ref={remindOptionsRef} className="absolute left-0 right-0 z-20 mt-2 bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto">
                        {[
                          '30 Minutes Before',
                          '1 Hour Before',
                          '2 Hours Before',
                          '4 Hours Before',
                          '8 Hours Before',
                          '1 Day Before',
                          '2 Days Before',
                          '4 Days Before',
                          '8 Days Before',
                          '2 Weeks Before',
                          '4 Weeks Before',
                        ].map((opt) => (
                          <button
                            key={opt}
                            data-value={opt}
                            onClick={() => { setFormData({ ...formData, remind: opt }); setRemindOpen(false); }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 text-sm ${formData.remind === opt ? 'bg-gray-100' : ''}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Repeat</label>
                    <select value={formData.repeat ?? 'Never'} onChange={(e) => setFormData({ ...formData, repeat: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                      <option>Never</option>
                      <option>1 Week</option>
                      <option>2 Weeks</option>
                      <option>3 Weeks</option>
                      <option>Monthly</option>
                      <option>Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attachment</label>
                    <label className="relative w-full border rounded-md px-3 py-2 flex items-center justify-between text-sm text-gray-600 cursor-pointer">
                      <span className="truncate">{formData.attachments && formData.attachments.length > 0 ? formData.attachments.map(f => f.name).join(', ') : 'Attachment'}</span>
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <input type="file" multiple onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; setFormData({ ...formData, attachments: files }); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
                  <button onClick={handleSubmitReminder} className="px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700">Save</button>
                </div>
              </div>
            </div>
          )}

          {/* Filters Modal */}
          {showFilters && (
            <div className="fixed inset-0 z-50" onClick={() => setShowFilters(false)}>
              <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                  <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
                  <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status*</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                      <option>All</option>
                      <option>Pending</option>
                      <option>Completed</option>
                      <option>Archived</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
                  <button onClick={() => setShowFilters(false)} className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50">Cancel</button>
                  <button onClick={() => { /* TODO: apply filters */ setShowFilters(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-md">Apply</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}
