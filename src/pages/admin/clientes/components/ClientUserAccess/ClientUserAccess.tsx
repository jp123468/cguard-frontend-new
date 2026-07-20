import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { clientService } from '@/lib/api/clientService';
import { Search, UserPlus, Users, Trash2, Mail, Smartphone, Loader2 } from 'lucide-react';
import { Section, EmptyState, StatusBadge, Modal } from '@/components/kit';
import { Button } from '@/components/ui/button';
import type { Client } from '@/types/client';

type Props = { client: Client };
// Row from GET /client-account/:id/access-users (clientAccountAccessUsers.ts).
interface AccessUser {
  id: string; pivotId: string | null; userId: string | null; isTitular: boolean;
  name: string; email: string | null; role: string; status?: string;
}
const inputCls = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-all placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]';

export default function ClientUserAccess({ client }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const [users, setUsers] = useState<AccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: '', channel: 'app' as 'app' | 'portal' });
  const [sending, setSending] = useState(false);

  const load = async () => {
    try { const u = await clientService.getClientAccessUsers(client.id); setUsers(Array.isArray(u) ? u : []); }
    catch { setUsers([]); } finally { setLoading(false); }
  };
  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [client.id]);

  const filtered = users.filter((u) => (u.name || '').toLowerCase().includes(query.toLowerCase()) || (u.email || '').toLowerCase().includes(query.toLowerCase()));

  const invite = async () => {
    const email = form.email.trim();
    if (!email) { toast.error('Ingresa un correo'); return; }
    setSending(true);
    try {
      if (form.channel === 'portal') await clientService.sendClientPortalInvitation(client.id, email);
      else await clientService.sendClientAppInvitation(client.id, email);
      toast.success(`Invitación enviada a ${email}`);
      setInviteOpen(false); setForm({ email: '', channel: 'app' });
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'No se pudo enviar la invitación'); }
    finally { setSending(false); }
  };

  const revoke = async (u: AccessUser) => {
    if (u.isTitular || !u.pivotId) { toast.error('El acceso del titular se gestiona editando el cliente.'); return; }
    if (!window.confirm(`¿Revocar el acceso de ${u.name}?`)) return;
    try { await clientService.revokeClientAccess(client.id, u.pivotId); toast.success('Acceso revocado'); await load(); }
    catch { toast.error('No se pudo revocar'); }
  };

  const initial = (n: string) => (n || '?').charAt(0).toUpperCase();

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Cargando accesos…</div>;

  return (
    <div ref={containerRef} className="space-y-4">
      <Section title="Usuarios con acceso" icon={<Users className="h-4 w-4" />}
        action={<Button size="sm" variant="brand" onClick={() => setInviteOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" /> Invitar acceso</Button>}>
        <div className="mb-3 relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputCls} pl-8`} placeholder="Buscar por nombre o correo" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title="Sin usuarios con acceso" description="Invita al titular o agrega accesos adicionales para que el cliente entre al portal y a la app Mi Seguridad." action={<Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" /> Invitar acceso</Button>} />
        ) : (
          <div className="divide-y">
            {filtered.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${u.isTitular ? 'cg-gradient-brand text-primary-foreground' : 'bg-primary/12 text-primary'}`}>{initial(u.name)}</span>
                  <div className="min-w-0"><div className="truncate text-sm font-medium">{u.name}</div><div className="truncate text-xs text-muted-foreground">{u.email || 'Sin correo'}</div></div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge tone={u.isTitular ? 'green' : 'blue'} dot={false}>{u.role || 'Acceso'}</StatusBadge>
                  {!u.isTitular && u.pivotId && (
                    <button onClick={() => revoke(u)} title="Revocar acceso" className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Los accesos otorgan al cliente visibilidad únicamente de su propia operación.</p>
      </Section>

      <Modal open={inviteOpen} onOpenChange={(o) => { if (!sending) setInviteOpen(o); }} title="Invitar acceso" icon={<UserPlus className="h-5 w-5" />}
        footer={<><Button variant="outline" onClick={() => setInviteOpen(false)} disabled={sending}>Cancelar</Button><Button variant="brand" onClick={invite} disabled={sending || !form.email.trim()}>{sending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Enviando…</> : 'Enviar invitación'}</Button></>}>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Correo de la persona</label><input type="email" className={inputCls} placeholder="persona@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de acceso</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setForm({ ...form, channel: 'app' })} className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${form.channel === 'app' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'}`}><Smartphone className="h-4 w-4" /> App Mi Seguridad</button>
              <button onClick={() => setForm({ ...form, channel: 'portal' })} className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${form.channel === 'portal' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'}`}><Mail className="h-4 w-4" /> Portal web</button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Se creará el acceso y se enviará un enlace para que la persona configure su contraseña.</p>
        </div>
      </Modal>
    </div>
  );
}
