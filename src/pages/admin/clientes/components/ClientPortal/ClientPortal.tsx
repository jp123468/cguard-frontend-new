import { useEffect, useMemo, useRef, useState } from 'react';
import { clientDisplayName } from '@/lib/clientName';
import type { Client } from '@/types/client';
import { useNavigate } from 'react-router-dom';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { clientService } from '@/lib/api/clientService';
import { toast } from 'sonner';
import { Section, StatusBadge, Modal, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import {
  Globe, Mail, CheckCircle2, AlertCircle, Loader2, Smartphone, Users, ShieldCheck,
  KeyRound, ArrowRight, Building2, AlertTriangle, FileBarChart, ClipboardList, MapPin, Bell,
} from 'lucide-react';
import type { ReactNode } from 'react';

type Props = { client?: Client & { contactEmail?: string; contactName?: string; userId?: string } };
type Kind = 'portal' | 'app';

// Row from GET /client-account/:id/access-users (clientAccountAccessUsers.ts).
interface AccessUser {
  id: string; pivotId: string | null; userId: string | null; isTitular: boolean;
  name: string; email: string | null; role: string; status?: string;
}

const PORTAL_FEATURES = [
  { icon: MapPin, label: 'Sedes y estaciones', desc: 'Ubicaciones y cobertura de su operación' },
  { icon: Users, label: 'Vigilantes asignados', desc: 'Quién está en turno en cada sitio' },
  { icon: AlertTriangle, label: 'Incidentes y novedades', desc: 'Reportes en tiempo real' },
  { icon: FileBarChart, label: 'Reportes', desc: 'Informes operativos de su servicio' },
  { icon: ClipboardList, label: 'Tareas y solicitudes', desc: 'Pedidos y seguimiento' },
  { icon: Bell, label: 'Notificaciones', desc: 'Avisos de turno, SOS y alertas' },
];

function Kpi({ icon, value, label, accent = 'primary' }: { icon: ReactNode; value: ReactNode; label: string; accent?: string }) {
  const ACC: Record<string, string> = {
    primary: 'bg-primary/12 text-primary', green: 'bg-emerald-500/12 text-emerald-600',
    orange: 'bg-orange-500/12 text-orange-600', blue: 'bg-blue-500/12 text-blue-600', slate: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="cg-card p-4">
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${ACC[accent]} [&_svg]:size-4`}>{icon}</div>
      <div className="font-display text-xl font-bold leading-tight truncate">{value}</div>
      <div className="text-xs text-muted-foreground truncate">{label}</div>
    </div>
  );
}

export default function ClientPortal({ client }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const email = client?.email || client?.contactEmail || '';
  const name = clientDisplayName(client, client?.contactName || 'este cliente');
  const linked = !!client?.userId;
  // Real access roster from /access-users (client.portalUsers never existed in
  // the backend — this card always said 0/1 while Accesos showed the truth).
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  useEffect(() => {
    let alive = true;
    if (!client?.id) return;
    clientService.getClientAccessUsers(client.id)
      .then((r) => { if (alive) setAccessUsers(Array.isArray(r) ? r : (r?.rows ?? [])); })
      .catch(() => { /* keep empty */ });
    return () => { alive = false; };
  }, [client?.id]);
  const accessCount = accessUsers.length || (linked ? 1 : 0);

  const [confirm, setConfirm] = useState<Kind | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ kind: Kind; recipient: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const send = async (kind: Kind) => {
    setSending(true); setErrorMsg('');
    try {
      const res = kind === 'portal'
        ? await clientService.sendClientPortalInvitation(client?.id ?? "", email || undefined)
        : await clientService.sendClientAppInvitation(client?.id ?? "", email || undefined);
      setResult({ kind, recipient: res?.recipient || email });
      setConfirm(null);
      toast.success(kind === 'portal' ? 'Invitación al portal enviada' : 'Invitación a la app enviada');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'No se pudo enviar la invitación. Intenta de nuevo.');
      setConfirm(null);
    } finally { setSending(false); }
  };

  const initial = (name || '?').charAt(0).toUpperCase();
  const kindLabel = useMemo(() => (confirm === 'app' ? 'a la app Mi Seguridad' : 'al portal del cliente'), [confirm]);

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Status KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={<Globe />} value={linked ? 'Vinculado' : 'Sin usuario'} label="Acceso al portal" accent={linked ? 'green' : 'slate'} />
        <Kpi icon={<Users />} value={accessCount} label="Usuarios con acceso" accent="blue" />
        <Kpi icon={<Smartphone />} value="Mi Seguridad" label="App móvil del cliente" accent="primary" />
        <Kpi icon={<Mail />} value={email ? 'Con correo' : 'Sin correo'} label={email || 'Agrega un correo al cliente'} accent={email ? 'green' : 'orange'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* LEFT — access + actions */}
        <div className="space-y-4">
          <Section title="Acceso al portal del cliente" icon={<KeyRound className="h-4 w-4" />}>
            {/* Titular */}
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full cg-gradient-brand text-primary-foreground shadow-sm"><span className="text-base font-semibold">{initial}</span></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{email || 'Sin correo electrónico'}</p>
              </div>
              <StatusBadge tone={linked ? 'green' : 'slate'}>{linked ? 'Usuario vinculado' : 'Sin usuario'}</StatusBadge>
            </div>

            {/* Result / error banners */}
            {result && (
              <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-500/10 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-emerald-800">¡Invitación enviada!</p>
                  <p className="text-emerald-700">Se envió la invitación {result.kind === 'app' ? 'a la app' : 'al portal'} a <strong>{result.recipient}</strong>. El cliente debe revisar su bandeja de entrada.</p>
                </div>
                <button onClick={() => setResult(null)} className="text-xs text-emerald-700 underline">Cerrar</button>
              </div>
            )}
            {errorMsg && (
              <div className="mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-500/10 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div className="flex-1 text-sm"><p className="font-semibold text-red-700">Error al enviar</p><p className="text-red-700">{errorMsg}</p></div>
                <button onClick={() => setErrorMsg('')} className="text-xs text-red-700 underline">Cerrar</button>
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="brand" onClick={() => setConfirm('portal')} disabled={!email && !linked}><Mail className="mr-1.5 h-4 w-4" /> {linked ? 'Reenviar invitación al portal' : 'Enviar invitación al portal'}</Button>
              <Button variant="outline" onClick={() => setConfirm('app')} disabled={!email && !linked}><Smartphone className="mr-1.5 h-4 w-4" /> Invitar a la app Mi Seguridad</Button>
            </div>
            {(!email && !linked) && <p className="mt-2 text-xs text-orange-600">Este cliente no tiene correo ni usuario vinculado. Edita el cliente y agrega un correo para habilitar el acceso.</p>}
          </Section>

          <Section title="Usuarios con acceso" icon={<Users className="h-4 w-4" />}
            action={<button onClick={() => navigate(`/clients/${client?.id}/user-access`)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Gestionar accesos <ArrowRight className="h-3.5 w-3.5" /></button>}>
            {accessCount === 0 ? (
              <EmptyState icon={<Users className="h-5 w-5" />} title="Sin usuarios con acceso" description="Invita al titular o agrega accesos adicionales para que el cliente entre al portal y la app." />
            ) : (
              <div className="divide-y">
                {/* /access-users already includes the titular — only fall back
                    to the linked-user row when the fetch returned nothing. */}
                {linked && accessUsers.length === 0 && (
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{initial}</span><div><div className="text-sm font-medium">{name}</div><div className="text-xs text-muted-foreground">{email || '—'}</div></div></div>
                    <StatusBadge tone="green" dot={false}>Titular</StatusBadge>
                  </div>
                )}
                {accessUsers.map((u, i) => (
                  <div key={u.id || i} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-semibold">{(u.name || u.email || '?').charAt(0).toUpperCase()}</span><div><div className="text-sm font-medium">{u.name || u.email}</div><div className="text-xs text-muted-foreground">{u.email || ''}</div></div></div>
                    <StatusBadge tone={(u.status || '').toLowerCase().includes('activ') ? 'green' : 'slate'} dot={false}>{u.role || u.status || 'Acceso'}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* RIGHT — what the client sees + how it works */}
        <div className="space-y-4">
          <Section title="¿Qué puede ver el cliente?" icon={<Smartphone className="h-4 w-4" />}>
            <div className="space-y-2.5">
              {PORTAL_FEATURES.map((f) => (
                <div key={f.label} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4"><f.icon /></span>
                  <div><div className="text-sm font-medium">{f.label}</div><div className="text-xs text-muted-foreground">{f.desc}</div></div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="¿Cómo funciona?" icon={<ShieldCheck className="h-4 w-4" />}>
            <ol className="space-y-2.5">
              {['Se envía un correo de invitación al cliente.', 'El cliente abre el enlace y crea su contraseña.', 'Inicia sesión en el portal web o en la app Mi Seguridad.', 'Accede en tiempo real a su operación de seguridad.'].map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> El acceso muestra únicamente la información de este cliente; nunca datos de otros clientes.
            </div>
          </Section>
        </div>
      </div>

      {/* Confirm modal */}
      <Modal open={!!confirm} onOpenChange={(o) => { if (!o && !sending) setConfirm(null); }} title="Enviar invitación" icon={<Mail className="h-5 w-5" />} size="sm"
        footer={<><Button variant="outline" onClick={() => setConfirm(null)} disabled={sending}>Cancelar</Button><Button variant="brand" onClick={() => confirm && send(confirm)} disabled={sending}>{sending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Enviando…</> : 'Enviar'}</Button></>}>
        <p className="text-sm text-muted-foreground">Se enviará una invitación <b>{kindLabel}</b> a:</p>
        <div className="mt-3 rounded-xl bg-muted/40 px-4 py-3 text-center">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-sm text-primary">{email || '(sin correo registrado)'}</p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">El cliente recibirá un enlace para crear su contraseña y acceder.</p>
      </Modal>
    </div>
  );
}
