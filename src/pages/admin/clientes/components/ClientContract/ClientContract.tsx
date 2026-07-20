import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Client } from '@/types/client';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { clientService } from '@/lib/api/clientService';
import { Section, EmptyState, StatCard, StatusBadge, Modal, Field } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  FileText, Calendar, ScrollText, ClipboardList, Shield, Car, Monitor,
  Users, UserCheck, Bell, Lock, CalendarCheck, Plus, Pencil, Trash2, Clock,
  History, StickyNote, Gauge, Timer, ClipboardCheck, Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Shape of GET /client-account/:id/contract (clientAccountContract.ts) ──
interface ContractTerms {
  id: string; name: string; code: string | null; active: boolean;
  contractNumber: string | null; contractType: string | null; currency: string | null;
  paymentTerms: string | null; contractDate: string | null; contractEndDate: string | null;
  autoRenew: boolean | null; autoRenewDaysBefore: number | null; penaltyClause: string | null;
  earlyCancellationNotice: string | null; jurisdiction: string | null;
  contractedHoursPerMonth: number | null; contractNotes: string | null;
  slaUptimeTarget: number | null; slaResponseMinutes: number | null;
  slaRoundsTarget: number | null; slaReportsTarget: number | null;
}
interface ContractServiceRow {
  id: string; serviceKey: string; name: string; unit?: string | null; description?: string | null;
  contractedQty: number | null; slaTarget?: number | null; active: boolean;
  used: number | null; compliance: number | null; sortOrder?: number;
}
interface ContractRenewalRow {
  id: string; periodLabel?: string | null; fromDate?: string | null; toDate?: string | null;
  durationMonths?: number | null; status?: string | null;
}
interface ContractDerived {
  sedesCount: number; stationsCount: number; guardsCount: number; hoursUsed: number;
  hoursContracted: number | null; daysRemaining: number | null; durationMonths: number | null;
  incidentsThisMonth: number; roundsCompliance: number | null; tenantTimezone: string | null;
}
interface ContractData {
  contract: ContractTerms;
  services: ContractServiceRow[];
  renewals: ContractRenewalRow[];
  usage: Record<string, number | null>;
  derived: ContractDerived;
}
// Subset of a client-document row we render in the "Documentos del contrato" panel.
interface DocRow { id: string; name?: string; filename?: string; downloadUrl?: string | null; url?: string | null; createdAt?: string; }

// Edit-modal buffer: text/number inputs held as strings; autoRenew is the only boolean.
interface ContractForm {
  contractNumber?: string; contractType?: string; currency?: string; paymentTerms?: string;
  contractDate?: string; contractEndDate?: string; autoRenew?: boolean; autoRenewDaysBefore?: string | number;
  contractedHoursPerMonth?: string | number; jurisdiction?: string; penaltyClause?: string;
  earlyCancellationNotice?: string; slaUptimeTarget?: string | number; slaResponseMinutes?: string | number;
  slaRoundsTarget?: string | number; slaReportsTarget?: string | number; contractNotes?: string;
  [k: string]: string | number | boolean | undefined;
}

// ----- service catalog metadata (drives live-usage on the backend) ----------
const SERVICE_PRESETS: Record<string, { name: string; unit: string; icon: LucideIcon }> = {
  fixed_guard: { name: 'Vigilancia fija 24/7', unit: 'Estación', icon: Shield },
  mobile_patrol: { name: 'Patrullaje móvil', unit: 'Rondas', icon: Car },
  camera_monitoring: { name: 'Monitoreo de cámaras', unit: 'Cámaras', icon: Monitor },
  access_control: { name: 'Control de acceso', unit: 'Estación', icon: UserCheck },
  visitor_management: { name: 'Gestión de visitantes', unit: 'Visitantes', icon: Users },
  alarm_response: { name: 'Respuesta a alarmas', unit: 'Eventos', icon: Bell },
  asset_custody: { name: 'Custodia de activos', unit: 'Servicio', icon: Lock },
  event_security: { name: 'Seguridad para eventos', unit: 'Eventos', icon: CalendarCheck },
  custom: { name: '', unit: '', icon: ClipboardList },
};
const SERVICE_KEYS = Object.keys(SERVICE_PRESETS);

const fmtDate = (d: string | number | Date | null | undefined) => {
  if (!d) return '—';
  const dt = new Date(typeof d === 'string' && d.length <= 10 ? `${d}T00:00:00` : d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const orDash = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : (v as ReactNode));

const inputCls = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-all placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]';

function Bar({ pct, tone = 'ok' }: { pct: number; tone?: 'ok' | 'warn' | 'crit' }) {
  const color = tone === 'crit' ? 'bg-red-500' : tone === 'warn' ? 'bg-orange-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-full min-w-[60px] rounded-full bg-muted">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
    </div>
  );
}

export default function ClientContract({ client }: { client: Client }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  const [data, setData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  // Real contract documents (Documentos tab, categoría "Contratos") — the old
  // panel was a hardcoded EmptyState that said "Sin documentos" forever.
  const [contractDocs, setContractDocs] = useState<DocRow[]>([]);
  useEffect(() => {
    let alive = true;
    if (!client?.id) return;
    // getClientDocuments returns { documents: DocRow[], ... } — the array is
    // under `documents` (NOT rows/docs), so read that field.
    clientService.getClientDocuments(client.id, { category: 'Contratos', perPage: 20 })
      .then((r) => { if (alive) setContractDocs(Array.isArray(r) ? r : (r?.documents ?? [])); })
      .catch(() => { /* keep empty */ });
    return () => { alive = false; };
  }, [client?.id]);

  const [editOpen, setEditOpen] = useState(false);
  // Controlled-form buffers: numeric inputs are held as strings while editing;
  // autoRenew is the only boolean (bound via `checked`, not `value`).
  const [form, setForm] = useState<ContractForm>({});
  const [saving, setSaving] = useState(false);

  const [svcOpen, setSvcOpen] = useState(false);
  // Service/renewal edit buffers spread a row then hold string-typed input values;
  // deliberately loose while editing.
  const [svcForm, setSvcForm] = useState<any>(null);

  const [renOpen, setRenOpen] = useState(false);
  const [renForm, setRenForm] = useState<any>(null);

  const load = async () => {
    try {
      const d = await clientService.getClientContract(client.id);
      setData(d);
    } catch { setData(null); } finally { setLoading(false); }
  };
  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [client.id]);

  const c: Partial<ContractTerms> = data?.contract || {};
  const derived: Partial<ContractDerived> = data?.derived || {};
  const services: ContractServiceRow[] = data?.services || [];
  const renewals: ContractRenewalRow[] = data?.renewals || [];

  const diff = useMemo(() => {
    if (derived.hoursContracted == null) return null;
    return (derived.hoursUsed || 0) - derived.hoursContracted;
  }, [derived]);

  // ---- contract terms modal -------------------------------------------------
  const openEdit = () => {
    setForm({
      contractNumber: c.contractNumber || '', contractType: c.contractType || '',
      currency: c.currency || 'USD', paymentTerms: c.paymentTerms || '',
      contractDate: c.contractDate || '', contractEndDate: c.contractEndDate || '',
      autoRenew: !!c.autoRenew, autoRenewDaysBefore: c.autoRenewDaysBefore ?? '',
      penaltyClause: c.penaltyClause || '', earlyCancellationNotice: c.earlyCancellationNotice || '',
      jurisdiction: c.jurisdiction || '', contractedHoursPerMonth: c.contractedHoursPerMonth ?? '',
      contractNotes: c.contractNotes || '',
      slaUptimeTarget: c.slaUptimeTarget ?? '', slaResponseMinutes: c.slaResponseMinutes ?? '',
      slaRoundsTarget: c.slaRoundsTarget ?? '', slaReportsTarget: c.slaReportsTarget ?? '',
    });
    setEditOpen(true);
  };
  const saveContract = async () => {
    setSaving(true);
    try {
      await clientService.updateClientContract(client.id, form);
      toast.success('Contrato actualizado');
      setEditOpen(false);
      await load();
    } catch { toast.error('No se pudo guardar'); } finally { setSaving(false); }
  };

  // ---- service modal --------------------------------------------------------
  const openSvc = (s?: ContractServiceRow) => {
    setSvcForm(s
      ? { ...s }
      : { serviceKey: 'fixed_guard', name: SERVICE_PRESETS.fixed_guard.name, unit: SERVICE_PRESETS.fixed_guard.unit, description: '', contractedQty: '', slaTarget: '', active: true });
    setSvcOpen(true);
  };
  const saveSvc = async () => {
    if (!svcForm?.name?.trim()) { toast.error('Nombre del servicio requerido'); return; }
    setSaving(true);
    try {
      if (svcForm.id) await clientService.updateContractService(client.id, svcForm.id, svcForm);
      else await clientService.createContractService(client.id, svcForm);
      setSvcOpen(false);
      await load();
    } catch { toast.error('No se pudo guardar el servicio'); } finally { setSaving(false); }
  };
  const delSvc = async (s: ContractServiceRow) => {
    if (!window.confirm(`¿Eliminar el servicio "${s.name}"?`)) return;
    try { await clientService.deleteContractService(client.id, s.id); await load(); }
    catch { toast.error('No se pudo eliminar'); }
  };

  // ---- renewal modal --------------------------------------------------------
  const openRen = (r?: ContractRenewalRow) => {
    setRenForm(r ? { ...r } : { periodLabel: '', fromDate: '', toDate: '', durationMonths: '', status: 'active' });
    setRenOpen(true);
  };
  const saveRen = async () => {
    setSaving(true);
    try {
      if (renForm.id) await clientService.updateContractRenewal(client.id, renForm.id, renForm);
      else await clientService.createContractRenewal(client.id, renForm);
      setRenOpen(false);
      await load();
    } catch { toast.error('No se pudo guardar'); } finally { setSaving(false); }
  };
  const delRen = async (r: ContractRenewalRow) => {
    if (!window.confirm('¿Eliminar este periodo del historial?')) return;
    try { await clientService.deleteContractRenewal(client.id, r.id); await load(); }
    catch { toast.error('No se pudo eliminar'); }
  };

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Cargando contrato…</div>;
  }

  const renewalDate = c.contractEndDate;

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Estado del contrato strip */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Estado del contrato</div>
              <div className="mt-1"><StatusBadge tone={c.active ? 'green' : 'slate'}>{c.active ? 'Activo' : 'Inactivo'}</StatusBadge></div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Días restantes</div>
              <div className={`mt-1 text-2xl font-semibold ${derived.daysRemaining != null && derived.daysRemaining < 30 ? 'text-orange-500' : 'text-emerald-600'}`}>
                {derived.daysRemaining != null ? `${derived.daysRemaining} días` : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Próxima renovación</div>
              <div className="mt-1 text-2xl font-semibold">{fmtDate(renewalDate)}</div>
            </div>
          </div>
          <Button onClick={openEdit}><Pencil className="mr-2 h-4 w-4" /> Editar contrato</Button>
        </div>
      </div>

      {/* Row 1 — four info cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Section title="Información del contrato" icon={<FileText className="h-4 w-4" />}>
          <div className="space-y-2.5">
            <Field label="Número de contrato" value={orDash(c.contractNumber)} />
            <Field label="Tipo de contrato" value={orDash(c.contractType)} />
            <Field label="Moneda" value={orDash(c.currency)} />
            <Field label="Forma de pago" value={orDash(c.paymentTerms)} />
          </div>
        </Section>

        <Section title="Fechas" icon={<Calendar className="h-4 w-4" />}>
          <div className="space-y-2.5">
            <Field label="Fecha de inicio" value={fmtDate(c.contractDate)} />
            <Field label="Fecha de vencimiento" value={fmtDate(c.contractEndDate)} />
            <Field label="Duración" value={derived.durationMonths != null ? `${derived.durationMonths} meses` : '—'} />
            <Field label="Renovación automática" value={c.autoRenew ? `Sí${c.autoRenewDaysBefore ? ` (${c.autoRenewDaysBefore} días antes)` : ''}` : 'No'} />
          </div>
        </Section>

        <Section title="Términos principales" icon={<ScrollText className="h-4 w-4" />}>
          <div className="space-y-2.5">
            <Field label="SLA acordado" value={c.slaUptimeTarget != null ? `${c.slaUptimeTarget}% de cumplimiento` : '—'} />
            <Field label="Penalización por incumplimiento" value={orDash(c.penaltyClause)} />
            <Field label="Cancelación anticipada" value={orDash(c.earlyCancellationNotice)} />
            <Field label="Jurisdicción" value={orDash(c.jurisdiction)} />
          </div>
        </Section>

        <Section title="Documentos del contrato" icon={<ClipboardList className="h-4 w-4" />}>
          {contractDocs.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="Sin documentos"
              description="Sube el contrato firmado y anexos en la pestaña Documentos (categoría Contratos)."
            />
          ) : (
            <div className="divide-y">
              {contractDocs.map((d) => (
                <a
                  key={d.id}
                  href={d.downloadUrl || d.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 py-2.5 hover:bg-muted/30 rounded-md px-1"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{d.name || d.filename || 'Documento'}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}
                  </span>
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Servicios contratados */}
      <Section
        title="Servicios contratados"
        icon={<ClipboardCheck className="h-4 w-4" />}
        action={<Button size="sm" variant="outline" onClick={() => openSvc()}><Plus className="mr-1.5 h-4 w-4" /> Agregar servicio</Button>}
      >
        {services.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="Aún no hay servicios contratados"
            description="Agrega los servicios de este contrato. El uso se calcula en vivo desde la operación."
            action={<Button size="sm" onClick={() => openSvc()}><Plus className="mr-1.5 h-4 w-4" /> Agregar servicio</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Servicio</th>
                  <th className="px-2 py-2 font-medium">Descripción</th>
                  <th className="px-2 py-2 font-medium">Unidad</th>
                  <th className="px-2 py-2 font-medium text-right">Contratado</th>
                  <th className="px-2 py-2 font-medium text-right">Utilizado (mes)</th>
                  <th className="px-2 py-2 font-medium">Cumplimiento</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const Icon = SERVICE_PRESETS[s.serviceKey]?.icon || ClipboardList;
                  const contracted = s.contractedQty == null ? 'Ilimitado' : s.contractedQty;
                  const used = s.used == null ? '—' : s.used.toLocaleString('es-EC');
                  const comp = s.compliance;
                  const target = s.slaTarget ?? 90;
                  const estado = comp == null ? 'Activo' : comp >= target ? 'Cumple' : 'Atención';
                  const tone = comp == null ? 'ok' : comp >= target ? 'ok' : comp >= target * 0.75 ? 'warn' : 'crit';
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                          {s.name}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">{s.description || '—'}</td>
                      <td className="px-2 py-2.5">{s.unit || '—'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{contracted}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{used}</td>
                      <td className="px-2 py-2.5">
                        {comp == null ? <span className="text-muted-foreground">—</span> : (
                          <div className="flex items-center gap-2">
                            <span className="w-9 text-xs tabular-nums">{comp}%</span>
                            <Bar pct={comp} tone={tone} />
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <StatusBadge tone={estado === 'Cumple' ? 'green' : estado === 'Atención' ? 'orange' : 'slate'}>{estado}</StatusBadge>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openSvc(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => delSvc(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Horas contratadas / mes" value={derived.hoursContracted != null ? `${derived.hoursContracted.toLocaleString('es-EC')} h` : '—'} icon={<Clock className="h-4 w-4" />} hint="Según el contrato" />
        <StatCard label="Horas utilizadas (mes)" value={`${(derived.hoursUsed || 0).toLocaleString('es-EC')} h`} icon={<Timer className="h-4 w-4" />} hint="De turnos reales" />
        <StatCard
          label="Diferencia"
          value={diff == null ? '—' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('es-EC')} h`}
          accent={diff != null && diff < 0 ? 'red' : 'green'}
          icon={<Gauge className="h-4 w-4" />}
          hint={diff == null ? 'Define horas contratadas' : diff < 0 ? 'Por debajo de lo contratado' : 'Dentro / sobre lo contratado'}
        />
        <StatCard label="Cumplimiento de rondas" value={derived.roundsCompliance != null ? `${derived.roundsCompliance}%` : '—'} icon={<ClipboardCheck className="h-4 w-4" />} hint="Rondas del mes vs. contratado" />
      </div>

      {/* Row 3 — SLA, notas, historial */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title="Acuerdo de nivel de servicio (SLA)" icon={<Gauge className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-4">
            <SlaCell icon={<Wifi className="h-4 w-4" />} label="Uptime del servicio" value={c.slaUptimeTarget} suffix="%" />
            <SlaCell icon={<Timer className="h-4 w-4" />} label="Tiempo de respuesta" value={c.slaResponseMinutes} suffix=" min" />
            <SlaCell icon={<ClipboardCheck className="h-4 w-4" />} label="Cumplimiento de rondas" value={c.slaRoundsTarget} suffix="%" actual={derived.roundsCompliance} />
            <SlaCell icon={<FileText className="h-4 w-4" />} label="Reportes entregados" value={c.slaReportsTarget} suffix="%" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Objetivos acordados en el contrato.</p>
        </Section>

        <Section title="Notas del contrato" icon={<StickyNote className="h-4 w-4" />}>
          {c.contractNotes
            ? <p className="whitespace-pre-line text-sm text-muted-foreground">{c.contractNotes}</p>
            : <EmptyState icon={<StickyNote className="h-5 w-5" />} title="Sin notas" description="Agrega notas del contrato al editarlo." />}
        </Section>

        <Section
          title="Historial de renovaciones"
          icon={<History className="h-4 w-4" />}
          action={<Button size="sm" variant="outline" onClick={() => openRen()}><Plus className="mr-1.5 h-4 w-4" /> Agregar</Button>}
        >
          {renewals.length === 0 ? (
            <EmptyState icon={<History className="h-5 w-5" />} title="Sin historial" description="Registra los periodos del contrato." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Periodo</th>
                    <th className="px-2 py-2 font-medium">Desde</th>
                    <th className="px-2 py-2 font-medium">Hasta</th>
                    <th className="px-2 py-2 font-medium">Duración</th>
                    <th className="px-2 py-2 font-medium">Estado</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {renewals.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-2 py-2.5 font-medium">{r.periodLabel || '—'}</td>
                      <td className="px-2 py-2.5">{fmtDate(r.fromDate)}</td>
                      <td className="px-2 py-2.5">{fmtDate(r.toDate)}</td>
                      <td className="px-2 py-2.5">{r.durationMonths ? `${r.durationMonths} meses` : '—'}</td>
                      <td className="px-2 py-2.5"><StatusBadge tone={r.status === 'active' ? 'green' : 'slate'}>{r.status === 'active' ? 'Activo' : 'Finalizado'}</StatusBadge></td>
                      <td className="px-2 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openRen(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => delRen(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* ---- Contract terms modal ---- */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Editar contrato" icon={<FileText className="h-5 w-5" />} size="lg"
        footer={<><Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button><Button onClick={saveContract} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button></>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Lbl label="Número de contrato"><input className={inputCls} value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} /></Lbl>
          <Lbl label="Tipo de contrato"><input className={inputCls} placeholder="Servicio integral" value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })} /></Lbl>
          <Lbl label="Moneda"><input className={inputCls} placeholder="USD" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Lbl>
          <Lbl label="Forma de pago"><input className={inputCls} placeholder="Mensual" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /></Lbl>
          <Lbl label="Fecha de inicio"><input type="date" className={inputCls} value={form.contractDate || ''} onChange={(e) => setForm({ ...form, contractDate: e.target.value })} /></Lbl>
          <Lbl label="Fecha de vencimiento"><input type="date" className={inputCls} value={form.contractEndDate || ''} onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })} /></Lbl>
          <Lbl label="Renovación automática">
            <div className="flex items-center gap-2 h-9">
              <input id="autoRenew" type="checkbox" className="h-4 w-4" checked={!!form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} />
              <label htmlFor="autoRenew" className="text-sm text-muted-foreground">Renovar automáticamente</label>
            </div>
          </Lbl>
          <Lbl label="Aviso de renovación (días antes)"><input type="number" className={inputCls} value={form.autoRenewDaysBefore} onChange={(e) => setForm({ ...form, autoRenewDaysBefore: e.target.value })} /></Lbl>
          <Lbl label="Horas contratadas / mes"><input type="number" className={inputCls} value={form.contractedHoursPerMonth} onChange={(e) => setForm({ ...form, contractedHoursPerMonth: e.target.value })} /></Lbl>
          <Lbl label="Jurisdicción"><input className={inputCls} placeholder="Ecuador" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} /></Lbl>
          <Lbl label="Penalización por incumplimiento" full><input className={inputCls} placeholder="Crédito del 5% mensual" value={form.penaltyClause} onChange={(e) => setForm({ ...form, penaltyClause: e.target.value })} /></Lbl>
          <Lbl label="Cancelación anticipada" full><input className={inputCls} placeholder="60 días de notificación" value={form.earlyCancellationNotice} onChange={(e) => setForm({ ...form, earlyCancellationNotice: e.target.value })} /></Lbl>
          <div className="sm:col-span-2 mt-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Lbl label="SLA uptime (%)"><input type="number" className={inputCls} value={form.slaUptimeTarget} onChange={(e) => setForm({ ...form, slaUptimeTarget: e.target.value })} /></Lbl>
            <Lbl label="Respuesta (min)"><input type="number" className={inputCls} value={form.slaResponseMinutes} onChange={(e) => setForm({ ...form, slaResponseMinutes: e.target.value })} /></Lbl>
            <Lbl label="Rondas (%)"><input type="number" className={inputCls} value={form.slaRoundsTarget} onChange={(e) => setForm({ ...form, slaRoundsTarget: e.target.value })} /></Lbl>
            <Lbl label="Reportes (%)"><input type="number" className={inputCls} value={form.slaReportsTarget} onChange={(e) => setForm({ ...form, slaReportsTarget: e.target.value })} /></Lbl>
          </div>
          <Lbl label="Notas del contrato" full><textarea rows={3} className={`${inputCls} h-auto py-2`} value={form.contractNotes} onChange={(e) => setForm({ ...form, contractNotes: e.target.value })} /></Lbl>
        </div>
      </Modal>

      {/* ---- Service modal ---- */}
      <Modal open={svcOpen} onOpenChange={setSvcOpen} title={svcForm?.id ? 'Editar servicio' : 'Agregar servicio'} icon={<ClipboardCheck className="h-5 w-5" />}
        footer={<><Button variant="outline" onClick={() => setSvcOpen(false)}>Cancelar</Button><Button onClick={saveSvc} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button></>}>
        {svcForm && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Lbl label="Tipo de servicio" full>
              <select className={inputCls} value={svcForm.serviceKey}
                onChange={(e) => {
                  const k = e.target.value; const p = SERVICE_PRESETS[k];
                  setSvcForm({ ...svcForm, serviceKey: k, name: (svcForm.id ? svcForm.name : p.name) || svcForm.name, unit: (svcForm.id ? svcForm.unit : p.unit) || svcForm.unit });
                }}>
                {SERVICE_KEYS.map((k) => <option key={k} value={k}>{k === 'custom' ? 'Personalizado' : SERVICE_PRESETS[k].name}</option>)}
              </select>
            </Lbl>
            <Lbl label="Nombre" full><input className={inputCls} value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} /></Lbl>
            <Lbl label="Descripción" full><input className={inputCls} value={svcForm.description || ''} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} /></Lbl>
            <Lbl label="Unidad"><input className={inputCls} placeholder="Estación, Rondas…" value={svcForm.unit || ''} onChange={(e) => setSvcForm({ ...svcForm, unit: e.target.value })} /></Lbl>
            <Lbl label="Cantidad contratada"><input type="number" className={inputCls} placeholder="Vacío = ilimitado" value={svcForm.contractedQty ?? ''} onChange={(e) => setSvcForm({ ...svcForm, contractedQty: e.target.value })} /></Lbl>
            <Lbl label="Objetivo SLA (%)"><input type="number" className={inputCls} value={svcForm.slaTarget ?? ''} onChange={(e) => setSvcForm({ ...svcForm, slaTarget: e.target.value })} /></Lbl>
          </div>
        )}
      </Modal>

      {/* ---- Renewal modal ---- */}
      <Modal open={renOpen} onOpenChange={setRenOpen} title={renForm?.id ? 'Editar periodo' : 'Agregar periodo'} icon={<History className="h-5 w-5" />}
        footer={<><Button variant="outline" onClick={() => setRenOpen(false)}>Cancelar</Button><Button onClick={saveRen} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button></>}>
        {renForm && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Lbl label="Periodo" full><input className={inputCls} placeholder="Actual / Anterior" value={renForm.periodLabel} onChange={(e) => setRenForm({ ...renForm, periodLabel: e.target.value })} /></Lbl>
            <Lbl label="Desde"><input type="date" className={inputCls} value={renForm.fromDate || ''} onChange={(e) => setRenForm({ ...renForm, fromDate: e.target.value })} /></Lbl>
            <Lbl label="Hasta"><input type="date" className={inputCls} value={renForm.toDate || ''} onChange={(e) => setRenForm({ ...renForm, toDate: e.target.value })} /></Lbl>
            <Lbl label="Duración (meses)"><input type="number" className={inputCls} value={renForm.durationMonths ?? ''} onChange={(e) => setRenForm({ ...renForm, durationMonths: e.target.value })} /></Lbl>
            <Lbl label="Estado">
              <select className={inputCls} value={renForm.status} onChange={(e) => setRenForm({ ...renForm, status: e.target.value })}>
                <option value="active">Activo</option>
                <option value="finished">Finalizado</option>
              </select>
            </Lbl>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Lbl({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SlaCell({ icon, label, value, suffix, actual }: { icon: ReactNode; label: string; value: ReactNode; suffix?: string; actual?: number | null }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-xl font-semibold">{value != null && value !== '' ? `${value}${suffix || ''}` : '—'}</div>
      {actual != null && <div className="text-xs text-muted-foreground">Real: {actual}%</div>}
    </div>
  );
}
