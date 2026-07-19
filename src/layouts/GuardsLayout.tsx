import { ReactNode, useEffect, useState } from 'react';
import guardsNav from '@/data/guards-nav.json';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight, Pencil, Mail, Phone, IdCard, MapPin, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import securityGuardService from '@/lib/api/securityGuardService';
import { supervisorService } from '@/lib/api/supervisorService';
import { fileUrlFromFile } from '@/lib/fileUrl';
import GuardRatingLevel from '@/pages/admin/security-guards/GuardRatingLevel';
import guardRatingService from '@/lib/api/guardRatingService';

type Props = {
  navKey: string;
  title?: string;
  children: ReactNode;
};

// Guard nav ids kept out of the horizontal strip (stub / low-traffic sections).
// Mirrors the old sidebar's hidden set. Supervisors show all of their items.
const HIDDEN_GUARD_IDS = new Set([
  'disponibilidad', 'indicadores-kpi', 'recordatorios', 'archivos',
  'conjunto-habilidades', 'departamento', 'configuracion',
]);

const HUES = [28, 205, 150, 265, 340, 95, 180, 12];
const hueFor = (s: string) => {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
};

export default function GuardsLayout({ navKey, title, children }: Props) {
  const { t } = useTranslation();
  const cfg: any = (guardsNav as any)[navKey] || null;
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isSupervisor = navKey === 'supervisors';

  const [entity, setEntity] = useState<any>(null);
  const [rating, setRating] = useState<{ average: number; count: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        if (isSupervisor) {
          const s: any = await supervisorService.get(id);
          if (!mounted) return;
          setEntity({
            name: s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Supervisor',
            photo: s.photoUrl || null,
            onDuty: !!s.isOnDuty,
            email: s.email, phone: s.phoneNumber, code: s.governmentId,
            role: 'Supervisor', zone: s.zone,
          });
        } else {
          const d: any = await securityGuardService.get(id);
          if (!mounted) return;
          const g = d?.guard ?? d;
          const pi = d?.profileImage ?? g?.profileImage;
          const photoFile = Array.isArray(pi) ? pi[0] : pi;
          const photo = d?.photoUrl ?? g?.photoUrl ?? fileUrlFromFile(photoFile) ?? null;
          setEntity({
            name: g?.fullName || `${g?.firstName || ''} ${g?.lastName || ''}`.trim() || 'Vigilante',
            photo,
            onDuty: !!g?.isOnDuty,
            activated: !!g?.hasPassword && g?.status === 'active',
            email: g?.email, phone: g?.phoneNumber || g?.phone,
            code: d?.employeeCode || d?.guardNumber || g?.guardNumber || null,
            role: g?.role || null,
          });
        }
      } catch { /* header stays sparse */ }
    })();
    return () => { mounted = false; };
  }, [id, isSupervisor]);

  // Guard review level for the header (link → Reseñas tab).
  useEffect(() => {
    if (!id || isSupervisor) return;
    let alive = true;
    guardRatingService.summary([id]).then((m) => { if (alive) setRating(m[id] || null); }).catch(() => {});
    return () => { alive = false; };
  }, [id, isSupervisor]);

  const resolvePath = (path: string) => (id && path.includes(':id') ? path.replace(':id', id) : path);

  const allItems: any[] = (cfg?.sections || []).flatMap((s: any) => s.items || []);
  const items = allItems.filter((it: any) => isSupervisor || !HIDDEN_GUARD_IDS.has(it.id));

  const labelOf = (it: any) => (String(it.label || '').includes('.') ? t(it.label) : it.label);
  const activeItem =
    allItems.find((it: any) => location.pathname === resolvePath(it.path)) ||
    allItems.find((it: any) => location.pathname.startsWith(resolvePath(it.path) + '/'));

  const listPath = isSupervisor ? '/supervisors' : '/security-guards';
  const rootLabel = isSupervisor ? 'Supervisores' : t('guards.list.title', 'Vigilantes');
  const landingPath = isSupervisor ? `/supervisors/${id}/perfil` : `/guards/${id}/resumen`;
  const displayName = entity?.name || (title ? t(title) : (cfg?.title ? t(cfg.title) : '—'));
  const nm = String(displayName || '?');
  const hue = hueFor(nm);

  const editTarget = isSupervisor ? `/supervisors/${id}/perfil` : `/security-guards/edit/${id}`;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-4">
      {/* Breadcrumb: {Raíz} › {Nombre} › {Pestaña} */}
      <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={listPath} className="shrink-0 hover:text-primary">{rootLabel}</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        {activeItem ? (
          <>
            <Link to={landingPath} className="max-w-[180px] truncate hover:text-primary sm:max-w-[240px]" title={displayName}>{displayName}</Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="shrink-0 font-medium text-foreground">{labelOf(activeItem)}</span>
          </>
        ) : (
          <span className="max-w-[220px] truncate font-medium text-foreground sm:max-w-[320px]" title={displayName}>{displayName}</span>
        )}
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {entity?.photo ? (
              <img src={entity.photo} alt="" className="h-16 w-16 shrink-0 rounded-2xl border object-cover bg-muted" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold" style={{ backgroundColor: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 60% 32%)` }}>
                {nm.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                {isSupervisor ? (
                  <span className="rounded-full bg-blue-500/12 px-2.5 py-0.5 font-semibold text-blue-600">Supervisor</span>
                ) : (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${entity?.activated ? 'bg-emerald-500/12 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    <ShieldCheck className="h-3 w-3" /> {entity?.activated ? t('guards.profile.access.statusActive', 'App activa') : t('guards.profile.access.statusPending', 'App pendiente')}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 font-medium ${entity?.onDuty ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${entity?.onDuty ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {entity?.onDuty ? 'En servicio' : 'Fuera de servicio'}
                </span>
                {entity?.zone && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground"><MapPin className="h-3 w-3" /> {entity.zone}</span>}
                {!isSupervisor && rating && (
                  <GuardRatingLevel average={rating.average} count={rating.count} onClick={() => navigate(`/guards/${id}/reviews`)} />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                {entity?.code && <span className="inline-flex items-center gap-1.5"><IdCard className="h-3.5 w-3.5" /> {entity.code}</span>}
                {entity?.email && <span className="inline-flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5" /> {entity.email}</span>}
                {entity?.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {entity.phone}</span>}
              </div>
            </div>
          </div>
          {id && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(editTarget)}>
                <Pencil className="mr-1 h-4 w-4" /> {t('common.edit', 'Editar')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs (sección horizontal, igual que el detalle de cliente) */}
      <div className="overflow-x-auto">
        <nav className="flex min-w-max items-center gap-1 border-b border-border">
          {items.map((it: any) => {
            const path = resolvePath(it.path);
            const active = location.pathname === path || location.pathname.startsWith(path + '/');
            return (
              <Link
                key={it.id}
                to={path}
                className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {labelOf(it)}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
}
