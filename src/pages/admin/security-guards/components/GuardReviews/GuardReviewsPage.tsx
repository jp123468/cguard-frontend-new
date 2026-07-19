import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import securityGuardService from '@/lib/api/securityGuardService';
import guardRatingService, { GuardRatingRecord } from '@/lib/api/guardRatingService';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, Section, StatCard, EmptyState } from '@/components/kit';
import { toast } from 'sonner';
import {
  Star, MessageSquareWarning, FileText, Loader2, Building2, MapPin, Calendar,
} from 'lucide-react';

function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function GuardReviewsPage() {
  const { id } = useParams();
  const tenantId = localStorage.getItem('tenantId') || '';

  const [guardName, setGuardName] = useState('');
  const [rows, setRows] = useState<GuardRatingRecord[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // "Generar memo/observación" modal, seeded from a specific review.
  const [action, setAction] = useState<{ review: GuardRatingRecord; type: 'memo' | 'observacion' } | null>(null);
  const [form, setForm] = useState({ subject: '', content: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await guardRatingService.list({ guardId: id, limit: 500 });
      setRows(res.rows || []);
      setAverage(res.average);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => {
    if (!id) return;
    securityGuardService.get(id).then((d: any) => {
      const g = d?.guard ?? d;
      setGuardName(g?.fullName || `${g?.firstName || ''} ${g?.lastName || ''}`.trim());
    }).catch(() => {});
  }, [id]);

  // Star distribution (5→1).
  const dist = useMemo(() => {
    const d = [0, 0, 0, 0, 0];
    rows.forEach((r) => { const n = Math.round(r.rating); if (n >= 1 && n <= 5) d[5 - n]++; });
    return d;
  }, [rows]);
  const total = rows.length;

  const openAction = (review: GuardRatingRecord, type: 'memo' | 'observacion') => {
    const label = type === 'memo' ? 'Memo' : 'Observación';
    setForm({
      subject: `${label} · calificación ${review.rating}★${review.clientName ? ' de ' + review.clientName : ''}`,
      content: review.comment
        ? `En referencia a la reseña del cliente: "${review.comment}".\n\n`
        : '',
    });
    setAction({ review, type });
  };

  const save = async () => {
    if (!action || !id) return;
    if (!form.subject.trim()) { toast.error('El asunto es obligatorio'); return; }
    setSaving(true);
    try {
      await api.post(`/tenant/${tenantId}/memos`, {
        data: {
          subject: form.subject.trim(),
          content: form.content.trim(),
          dateTime: new Date().toISOString(),
          guardName: id,
          type: action.type,
          guardRatingId: action.review.id,
          wasAccepted: false,
        },
      });
      toast.success(action.type === 'memo' ? 'Memo enviado al vigilante' : 'Observación registrada');
      setAction(null);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo registrar');
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.reviews">
        <div className="mx-auto max-w-5xl space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Star />}
              accent="orange"
              label="Promedio del vigilante"
              value={average != null ? average.toFixed(2) : '—'}
              hint={average != null ? <Stars value={average} /> : undefined}
            />
            <StatCard icon={<MessageSquareWarning />} accent="primary" label="Reseñas recibidas" value={total} />
            <div className="rounded-2xl border bg-card p-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Distribución</div>
              <div className="space-y-1">
                {dist.map((c, i) => {
                  const starVal = 5 - i;
                  const pct = total ? Math.round((c / total) * 100) : 0;
                  return (
                    <div key={starVal} className="flex items-center gap-2 text-xs">
                      <span className="w-3 tabular-nums text-muted-foreground">{starVal}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <div className="h-1.5 flex-1 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 tabular-nums text-right text-muted-foreground">{c}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reviews list */}
          <Section title="Reseñas de clientes" icon={<Star className="h-4 w-4" />}>
            {guardName && (
              <p className="mb-3 text-xs text-muted-foreground">
                Calificaciones enviadas por los clientes sobre {guardName}.
              </p>
            )}
            {loading ? (
              <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<Star className="h-5 w-5" />}
                title="Sin reseñas todavía"
                description="Cuando un cliente califique a este vigilante desde su app, la reseña aparecerá aquí."
              />
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-xl border p-4 transition hover:bg-muted/30">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Stars value={r.rating} />
                          <span className="text-sm font-semibold tabular-nums">{r.rating}.0</span>
                        </div>
                        {r.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{r.comment}</p>}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {r.clientName && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {r.clientName}</span>}
                          {r.stationName && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.stationName}</span>}
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate(r.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openAction(r, 'memo')}>
                          <FileText className="mr-1.5 h-3.5 w-3.5" /> Generar memo
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openAction(r, 'observacion')}>
                          <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" /> Observación
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Generate memo/observación modal */}
        <Modal
          open={!!action}
          onOpenChange={(o) => { if (!o && !saving) setAction(null); }}
          title={action?.type === 'memo' ? 'Generar memo' : 'Registrar observación'}
          icon={action?.type === 'memo' ? <FileText className="h-5 w-5" /> : <MessageSquareWarning className="h-5 w-5" />}
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setAction(null)} disabled={saving}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Guardando…</> : (action?.type === 'memo' ? 'Enviar memo' : 'Registrar')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {action?.type === 'memo'
                ? 'El memo se envía al vigilante y queda en su historial (con acuse de recibo).'
                : 'La observación queda en el historial interno del vigilante para conversar sobre el servicio.'}
              {' '}Origen: reseña de {action?.review.clientName || 'cliente'} ({action?.review.rating}★).
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Asunto</label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Contenido</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={6}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Detalle para conversar con el vigilante…"
              />
            </div>
          </div>
        </Modal>
      </GuardsLayout>
    </AppLayout>
  );
}
