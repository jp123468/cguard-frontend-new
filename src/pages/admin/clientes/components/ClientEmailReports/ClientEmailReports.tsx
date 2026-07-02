import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { Search, Plus, X, ChevronDown, Mail, Check } from 'lucide-react';
import MobileCardList from '@/components/responsive/MobileCardList';
import { EmptyState, StatusBadge } from '@/components/kit';
import { Button } from '@/components/ui/button';

type Props = { client?: any };
export default function ClientEmailReports({ client }: { client: any }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
    toast.success(`Saved ${form.email}`);
    setShowInvite(false);
  }

  useScrollToTopOnMount(containerRef);

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col">
      <div className="bg-card border rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative" ref={actionRef}>
            <button
              onClick={() => setActionOpen(!actionOpen)}
              className="px-3 py-2 border rounded-md bg-card text-foreground text-sm font-medium flex items-center gap-2 hover:bg-muted/30 min-w-[100px]"
            >
              {actionSelection}
              <ChevronDown size={16} />
            </button>
            {actionOpen && (
              <div className="absolute left-0 mt-1 bg-card border rounded-md shadow-lg z-10 w-full">
                <button onClick={() => { setActionSelection('Eliminar'); setActionOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted">Eliminar</button>
              </div>
            )}
          </div>
          <div className="relative w-full max-w-lg">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search access list" className="w-full pl-9 pr-3 py-2 border rounded-full text-sm" />
          </div>

          <div className="ml-4">
            <Button onClick={openInvite} variant="brand" className="rounded-full whitespace-nowrap">
              <Plus size={16} />
              Add New Email
            </Button>
          </div>
        </div>

        <div className="mt-6 flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Frequency</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Post Site</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Status</th>

              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <EmptyState
                      icon={<Mail />}
                      title="No results found"
                      description="We couldn't find any items matching your search."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 text-sm text-foreground">{u.email}</td>
                    <td className="px-4 py-4 text-sm text-foreground">{u.frequency}</td>
                    <td className="px-4 py-4 text-sm text-foreground">{(Array.isArray(client?.postSites) ? (client.postSites.find((ps: any) => ps.id === u.postSite)?.name) : u.postSite) || ''}</td>
                    <td className="px-4 py-4 text-sm text-foreground">{u.date ? new Date(u.date).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-4 text-sm text-foreground">
                      <StatusBadge tone={(u.status || 'Active') === 'Active' ? 'green' : 'slate'}>{u.status || 'Active'}</StatusBadge>
                    </td>
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

          <div className="fixed right-0 top-0 bottom-0 w-[520px] bg-card dark:bg-[#202020] shadow-2xl flex flex-col text-foreground dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card dark:bg-[#202020] z-10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary [&_svg]:size-4">
                  <Mail />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground dark:text-gray-100">Add New Email</h3>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition dark:text-muted-foreground/60 dark:hover:text-white"><X /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-foreground dark:text-muted-foreground/40 mb-2">Post Site*</label>
                  <select value={form.postSite} onChange={(e) => setForm((p) => ({ ...p, postSite: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, postSite: true }))} className="w-full border rounded-md h-12 px-3 bg-card dark:bg-[#171717] dark:text-white dark:border-white/10">
                    <option value="">Select Post Site</option>
                    {(Array.isArray(client?.postSites) ? client.postSites : []).map((ps: any) => (
                      <option key={ps.id} value={ps.id}>{ps.name}</option>
                    ))}
                  </select>
                  {touched.postSite && !form.postSite && <div className="text-red-600 text-sm mt-1">Required</div>}
                </div>

                <div>
                  <label className="block text-sm text-foreground dark:text-muted-foreground/40 mb-2">New Email</label>
                  <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, email: true }))} placeholder="New Email..." className="w-full border rounded-md h-12 px-3 bg-card dark:bg-[#171717] dark:text-white dark:border-white/10" />
                  {touched.email && !form.email && <div className="text-red-600 text-sm mt-1">Required</div>}
                </div>

                <div>
                  <label className="block text-sm text-foreground dark:text-muted-foreground/40 mb-2">Select Frequency*</label>
                  <select value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, frequency: true }))} className="w-full border rounded-md h-12 px-3 bg-card dark:bg-[#171717] dark:text-white dark:border-white/10">
                    <option value="">Select Frequency</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                  {touched.frequency && !form.frequency && <div className="text-red-600 text-sm mt-1">Required</div>}
                </div>

                <div>
                  <div className="text-sm text-foreground dark:text-muted-foreground/40 mb-3">Select reports to be included in DAR :</div>
                  <div className="grid gap-3">
                    {reportsList.map((r) => {
                      const active = selectedReports.includes(r);
                      return (
                        <label key={r} className="flex items-start gap-3">
                          <button type="button" onClick={() => toggleReport(r)} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${active ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border'}`}>
                            {active ? <Check size={12} strokeWidth={3} /> : null}
                          </button>
                          <span className={`${active ? 'text-primary font-semibold' : 'text-foreground dark:text-muted-foreground/40'}`}>{r}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-muted/30 dark:bg-[#202020] sticky bottom-0 z-20">
              <div className="flex items-center justify-end">
                <Button onClick={handleSaveEmail} variant="brand">Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
