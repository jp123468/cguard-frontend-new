import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { Search, Plus, Users, UserPlus } from 'lucide-react';
import MobileCardList from '@/components/responsive/MobileCardList';
import { Section, EmptyState, StatusBadge, Modal } from '@/components/kit';
import { Button } from '@/components/ui/button';

type Props = { client?: any };

export default function ClientUserAccess({ client }: Props) {
  const [query, setQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [users, setUsers] = useState<any[]>(Array.isArray(client?.portalUsers) ? client.portalUsers : []);
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  useScrollToTopOnMount(containerRef);

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
        toast.success(`Invited existing ${existing.name}`);
      }
    } else {
      const newUser = { id: String(Date.now()), name: form.name, email: form.email, role: form.accessLevel, status: 'Invited' };
      setUsers((prev) => [newUser, ...prev]);
      toast.success(`Invited ${newUser.name}`);
    }
    setShowInvite(false);
  }

  return (
    <div ref={containerRef}>
      <Section
        title="Access list"
        icon={<Users />}
        action={
          <Button variant="brand" size="sm" onClick={openInvite} className="gap-2">
            <Plus className="size-4" />
            Invite User
          </Button>
        }
      >
        <div className="mb-6 relative w-full max-w-lg">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search access list" className="w-full pl-9 pr-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div className="md:block hidden overflow-x-auto rounded-xl border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <EmptyState
                      icon={<Users />}
                      title="No results found"
                      description="We couldn't find any items matching your search"
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-foreground">{u.name}</td>
                    <td className="px-4 py-4 text-sm text-foreground">{u.email}</td>
                    <td className="px-4 py-4 text-sm text-foreground">{u.role || 'User'}</td>
                    <td className="px-4 py-4 text-sm">
                      <StatusBadge tone={(u.status || 'Active') === 'Active' ? 'green' : 'orange'}>{u.status || 'Active'}</StatusBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden">
          <MobileCardList
            items={users}
            loading={false}
            emptyMessage={'No results found'}
            renderCard={(u: any) => (
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-foreground">{u.role || 'User'}</div>
                </div>
              </div>
            )}
          />
        </div>
      </Section>

      <Modal
        open={showInvite}
        onOpenChange={(o) => { if (!o) setShowInvite(false); }}
        title="Invite User"
        icon={<UserPlus />}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button variant="brand" onClick={handleInvite}>Invite</Button>
          </div>
        }
      >
        <div className="mb-4 text-sm font-medium text-foreground">Select Existing User</div>
        <select className="w-full border rounded-md h-10 px-3 mb-6" value={selectedExisting} onChange={(e) => setSelectedExisting(e.target.value)}>
          <option value="">Select Existing User</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
          ))}
        </select>

        <div className="text-center text-sm text-muted-foreground mb-4">Or Add New User</div>

        <div className="space-y-4">
          <div>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, name: true }))} placeholder="Name *" className="w-full border rounded-md h-10 px-3 focus:outline-none focus:ring-2 focus:ring-primary" />
            {touched.name && !form.name && <div className="text-red-600 text-sm mt-1">Required</div>}
          </div>

          <div>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, email: true }))} placeholder="Email *" className="w-full border rounded-md h-10 px-3 focus:outline-none focus:ring-2 focus:ring-primary" />
            {touched.email && !form.email && <div className="text-red-600 text-sm mt-1">Required</div>}
          </div>

          <div>
            <select value={form.accessLevel} onChange={(e) => setForm((p) => ({ ...p, accessLevel: e.target.value }))} onBlur={() => setTouched((p) => ({ ...p, accessLevel: true }))} className="w-full border rounded-md h-10 px-3 focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Access Level *</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="User">User</option>
            </select>
            {touched.accessLevel && !form.accessLevel && <div className="text-red-600 text-sm mt-1">Required</div>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
