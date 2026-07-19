/**
 * Detalle de usuario administrativo — mismo lenguaje visual que el detalle de
 * cliente/vigilante: breadcrumb + header card (identidad) + pestañas horizontales.
 * Pestañas: Perfil (vista + Editar) y Permisos (rol + resumen de overrides +
 * gestionar). La edición real (datos y overrides) vive en el formulario de
 * edición existente para no duplicar lógica sensible.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import userService from '@/lib/api/userService';
import { Button } from '@/components/ui/button';
import { Section, EmptyState } from '@/components/kit';
import {
  ChevronRight, Pencil, Mail, Phone, MapPin, ShieldCheck, IdCard,
  UserCog, KeyRound, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const HUES = [28, 205, 150, 265, 340, 95, 180, 12];
const hueFor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return HUES[h % HUES.length]; };

const photoOf = (u: any): string | null => {
  const a = u?.avatars ?? u?.avatar ?? u?.profileImage;
  const f = Array.isArray(a) ? a[0] : a;
  return (f?.downloadUrl || f?.publicUrl || (typeof f === 'string' ? f : null)) || u?.photoUrl || null;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-emerald-500/12 text-emerald-600' },
  invited: { label: 'Invitación pendiente', cls: 'bg-orange-500/12 text-orange-600' },
  pending: { label: 'Invitación pendiente', cls: 'bg-orange-500/12 text-orange-600' },
  archived: { label: 'Archivado', cls: 'bg-muted text-muted-foreground' },
};

const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'perfil' | 'permisos'>('perfil');

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    userService.fetchUser(id)
      .then((res: any) => { if (mounted) setUser((res?.data ?? res) || null); })
      .catch(() => { if (mounted) setUser(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
  const tenantEntry = useMemo(() => {
    if (!Array.isArray(user?.tenants)) return null;
    return user.tenants.find((t: any) => (t.tenantId === tenantId) || (t.tenant && (t.tenant.id === tenantId))) || user.tenants[0] || null;
  }, [user, tenantId]);

  const name = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || user?.email || 'Usuario';
  const photo = photoOf(user);
  const nm = String(name || '?');
  const hue = hueFor(nm);
  const statusKey = String(user?.status || 'active').toLowerCase();
  const status = STATUS_META[statusKey] || STATUS_META.active;

  const roleName = (() => {
    const r = tenantEntry?.roles;
    const first = Array.isArray(r) ? r[0] : (r || tenantEntry?.role || user?.role || (Array.isArray(user?.roles) ? user.roles[0] : user?.roles));
    if (!first) return null;
    return typeof first === 'object' ? (first.name || first.slug || first.id) : String(first);
  })();

  const overrides = (() => {
    const ov = tenantEntry?.permissionOverrides;
    return {
      grant: Array.isArray(ov?.grant) ? ov.grant : [],
      deny: Array.isArray(ov?.deny) ? ov.deny : [],
    };
  })();

  const isSupervisor = String(roleName || '').toLowerCase().includes('supervisor');

  const TABS: Array<{ id: 'perfil' | 'permisos'; label: string; icon: LucideIcon }> = [
    { id: 'perfil', label: 'Perfil', icon: IdCard },
    { id: 'permisos', label: 'Permisos', icon: KeyRound },
  ];

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-4">
        {/* Breadcrumb */}
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/back-office" className="shrink-0 hover:text-primary">Usuarios administrativos</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link to={`/back-office/${id}`} className="max-w-[180px] truncate hover:text-primary sm:max-w-[240px]" title={name}>{name}</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="shrink-0 font-medium text-foreground">{tab === 'perfil' ? 'Perfil' : 'Permisos'}</span>
        </div>

        {/* Header card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              {photo ? (
                <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-2xl border object-cover bg-muted" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold" style={{ backgroundColor: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 60% 32%)` }}>
                  {nm.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${status.cls}`}>
                    <ShieldCheck className="h-3 w-3" /> {status.label}
                  </span>
                  {roleName && <span className="rounded-full bg-blue-500/12 px-2.5 py-0.5 font-semibold text-blue-600">{roleName}</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                  {user?.email && <span className="inline-flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5" /> {user.email}</span>}
                  {(user?.phoneNumber || user?.phone) && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {user.phoneNumber || user.phone}</span>}
                </div>
              </div>
            </div>
            {id && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {isSupervisor && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/supervisors/${id}`)}>
                    <UserCog className="mr-1 h-4 w-4" /> Perfil de supervisor
                  </Button>
                )}
                <Button variant="brand" size="sm" onClick={() => navigate(`/back-office/edit/${id}`)}>
                  <Pencil className="mr-1 h-4 w-4" /> Editar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto">
          <nav className="flex min-w-max items-center gap-1 border-b border-border">
            {TABS.map((it) => {
              const active = tab === it.id;
              const Icon = it.icon;
              return (
                <button
                  key={it.id}
                  onClick={() => setTab(it.id)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon className="h-4 w-4" /> {it.label}
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !user ? (
          <EmptyState icon={<UserCog className="h-5 w-5" />} title="Usuario no encontrado" description="No se pudo cargar este usuario administrativo." />
        ) : tab === 'perfil' ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Section title="Información general" icon={<IdCard className="h-4 w-4" />} action={<Button variant="outline" size="sm" onClick={() => navigate(`/back-office/edit/${id}`)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar información</Button>}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nombre completo" value={name} />
                  <Field label="Correo electrónico" value={user.email} />
                  <Field label="Teléfono" value={user.phoneNumber || user.phone} />
                  <Field label="Rol de acceso" value={roleName} />
                  <Field label="Miembro desde" value={fmtDate(user.createdAt)} />
                  <Field label="Estado" value={status.label} />
                </div>
              </Section>
            </div>
            <div>
              <Section title="Ubicación de oficina" icon={<MapPin className="h-4 w-4" />}>
                {user.officeAddress ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 text-primary" /> <span>{user.officeAddress}</span></div>
                    {user.officeGeofenceRadiusM != null && <div className="text-xs text-muted-foreground">Geocerca: {user.officeGeofenceRadiusM} m</div>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin ubicación de oficina configurada.</p>
                )}
              </Section>
            </div>
          </div>
        ) : (
          <Section
            title="Permisos"
            icon={<KeyRound className="h-4 w-4" />}
            action={<Button variant="brand" size="sm" onClick={() => navigate(`/back-office/edit/${id}`)}><KeyRound className="mr-1.5 h-3.5 w-3.5" /> Gestionar permisos</Button>}
          >
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
                Rol base: <span className="font-medium text-foreground">{roleName || '—'}</span>. Los permisos se heredan del rol y pueden ajustarse por usuario.
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Concedidos ({overrides.grant.length})</div>
                  {overrides.grant.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {overrides.grant.slice(0, 12).map((p: string) => <span key={p} className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700">{p}</span>)}
                      {overrides.grant.length > 12 && <span className="text-[11px] text-muted-foreground">+{overrides.grant.length - 12} más</span>}
                    </div>
                  ) : <p className="mt-1 text-xs text-muted-foreground">Sin permisos adicionales al rol.</p>}
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-600"><XCircle className="h-4 w-4" /> Denegados ({overrides.deny.length})</div>
                  {overrides.deny.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {overrides.deny.slice(0, 12).map((p: string) => <span key={p} className="rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] text-red-700">{p}</span>)}
                      {overrides.deny.length > 12 && <span className="text-[11px] text-muted-foreground">+{overrides.deny.length - 12} más</span>}
                    </div>
                  ) : <p className="mt-1 text-xs text-muted-foreground">Ningún permiso del rol fue restringido.</p>}
                </div>
              </div>
            </div>
          </Section>
        )}
      </div>
    </AppLayout>
  );
}
