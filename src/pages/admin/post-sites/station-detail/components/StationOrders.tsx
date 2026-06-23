import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Plus, Clock, Pencil, Trash2, X, ClipboardList, Loader2, Repeat, CalendarDays, AlertCircle,
  Bell, Image as ImageIcon, Video, Mic, User, CheckCircle2, FileText,
} from 'lucide-react';
import { stationOrderService } from '@/lib/api/stationOrderService';

type Props = { station: any; stationId: string; postSiteId: string };

type Recurrence = 'daily' | 'weekdays' | 'weekend' | 'weekly' | 'monthly' | 'once';
interface Order {
  id?: string;
  title: string; description?: string; time?: string;
  recurrence: Recurrence; days?: number[]; dayOfMonth?: number | null;
  date?: string | null; priority: 'baja' | 'media' | 'alta'; active: boolean;
  notifyEnabled: boolean; notifyMinutesBefore: number;
}

const EMPTY: Order = { title: '', description: '', time: '', recurrence: 'daily', days: [], dayOfMonth: null, date: null, priority: 'media', active: true, notifyEnabled: true, notifyMinutesBefore: 0 };
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
const fileUrl = (u?: string | null) => (u ? `${API_BASE}${u}` : null);
const DOW = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // Sun..Sat (index = JS getDay)
const DOW_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const PRIO: Record<string, { label: string; cls: string }> = {
  alta: { label: 'Alta', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  media: { label: 'Media', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  baja: { label: 'Baja', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
};

function recurrenceSummary(o: Order, t: any): string {
  switch (o.recurrence) {
    case 'daily': return t('station.orders.rec.daily', 'Todos los días');
    case 'weekdays': return t('station.orders.rec.weekdays', 'Lunes a viernes');
    case 'weekend': return t('station.orders.rec.weekend', 'Fines de semana');
    case 'weekly': return (o.days && o.days.length)
      ? t('station.orders.rec.weeklyDays', 'Cada {{days}}', { days: o.days.slice().sort().map((d) => DOW_FULL[d]).join(', ') })
      : t('station.orders.rec.weekly', 'Semanal');
    case 'monthly': return t('station.orders.rec.monthly', 'Día {{n}} de cada mes', { n: o.dayOfMonth || 1 });
    case 'once': return o.date ? t('station.orders.rec.onceDate', 'El {{date}}', { date: o.date }) : t('station.orders.rec.once', 'Una sola vez');
    default: return '';
  }
}

export default function StationOrders({ stationId }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'log'>('list');

  const load = async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res: any = await stationOrderService.list(stationId);
      const list = Array.isArray(res) ? res : (res?.rows ?? []);
      setRows(list.map((r: any) => ({ ...r, days: Array.isArray(r.days) ? r.days : (() => { try { return JSON.parse(r.days || '[]'); } catch { return []; } })() })));
    } catch (e: any) {
      toast.error(e?.message || t('station.orders.loadError', 'No se pudieron cargar las consignas'));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [stationId]);

  const save = async () => {
    if (!modal) return;
    if (!modal.title.trim()) { toast.error(t('station.orders.titleRequired', 'El título es obligatorio')); return; }
    setSaving(true);
    try {
      const payload = { ...modal, title: modal.title.trim() };
      if (modal.id) await stationOrderService.update(stationId, modal.id, payload);
      else await stationOrderService.create(stationId, payload);
      toast.success(t('station.orders.saved', 'Consigna guardada'));
      setModal(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || t('station.orders.saveError', 'No se pudo guardar'));
    } finally { setSaving(false); }
  };

  const remove = async (o: Order) => {
    if (!o.id) return;
    if (!window.confirm(t('station.orders.confirmDelete', '¿Eliminar esta consigna?'))) return;
    try {
      await stationOrderService.remove(stationId, o.id);
      setRows((r) => r.filter((x) => x.id !== o.id));
      toast.success(t('station.orders.deleted', 'Consigna eliminada'));
    } catch (e: any) { toast.error(e?.message || t('station.orders.deleteError', 'No se pudo eliminar')); }
  };

  const toggleActive = async (o: Order) => {
    if (!o.id) return;
    try {
      await stationOrderService.update(stationId, o.id, { active: !o.active });
      setRows((r) => r.map((x) => (x.id === o.id ? { ...x, active: !o.active } : x)));
    } catch (e: any) { toast.error(e?.message || 'Error'); }
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="glass flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: 'color-mix(in oklab, var(--cc-accent) 16%, transparent)', color: 'var(--cc-accent)' }}>
            <ClipboardList size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t('station.orders.title', 'Consignas específicas')}</h2>
            <p className="text-xs text-muted-foreground">{t('station.orders.subtitle', 'Requisitos recurrentes que los vigilantes deben completar en esta estación.')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-background p-0.5">
            <button onClick={() => setView('list')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === 'list' ? 'text-[color:var(--cc-accent)]' : 'text-muted-foreground'}`} style={view === 'list' ? { background: 'color-mix(in oklab, var(--cc-accent) 14%, transparent)' } : undefined}>{t('station.orders.tabList', 'Consignas')}</button>
            <button onClick={() => setView('log')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === 'log' ? 'text-[color:var(--cc-accent)]' : 'text-muted-foreground'}`} style={view === 'log' ? { background: 'color-mix(in oklab, var(--cc-accent) 14%, transparent)' } : undefined}>{t('station.orders.tabLog', 'Registro de actividad')}</button>
          </div>
          {view === 'list' && (
            <button onClick={() => setModal({ ...EMPTY })}
              className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-black"
              style={{ background: 'var(--cc-accent)' }}>
              <Plus size={16} /> {t('station.orders.add', 'Agregar consigna')}
            </button>
          )}
        </div>
      </div>

      {view === 'log' ? (
        <ActivityLog stationId={stationId} t={t} />
      ) : /* list */ loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="glass grid place-items-center py-14 text-center">
          <ClipboardList className="mb-2 text-muted-foreground/40" size={32} />
          <p className="text-sm font-medium text-foreground">{t('station.orders.emptyTitle', 'Sin consignas')}</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">{t('station.orders.emptyHint', 'Agrega tareas recurrentes (por ejemplo: abrir los baños públicos a las 09:00) que el vigilante deberá completar.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((o) => (
            <div key={o.id} className={`glass cc-glass-hover p-4 ${o.active ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{o.title}</h3>
                    <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${PRIO[o.priority]?.cls || PRIO.media.cls}`}>{PRIO[o.priority]?.label || o.priority}</span>
                  </div>
                  {o.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{o.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {o.time && <span className="flex items-center gap-1"><Clock size={12} className="text-[color:var(--cc-accent)]" />{o.time}</span>}
                    <span className="flex items-center gap-1"><Repeat size={12} className="text-[color:var(--cc-accent)]" />{recurrenceSummary(o, t)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => toggleActive(o)} title={o.active ? t('station.orders.deactivate', 'Desactivar') : t('station.orders.activate', 'Activar')}
                    className={`h-5 w-9 rounded-full transition-colors relative ${o.active ? '' : 'bg-white/10'}`} style={o.active ? { background: 'var(--cc-accent)' } : undefined}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${o.active ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                  <button onClick={() => setModal({ ...o })} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"><Pencil size={15} /></button>
                  <button onClick={() => remove(o)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-400"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <OrderModal value={modal} onChange={setModal} onClose={() => setModal(null)} onSave={save} saving={saving} t={t} />}
    </div>
  );
}

function OrderModal({ value, onChange, onClose, onSave, saving, t }: any) {
  const o: Order = value;
  const set = (patch: Partial<Order>) => onChange({ ...o, ...patch });
  const toggleDay = (d: number) => set({ days: o.days?.includes(d) ? o.days.filter((x) => x !== d) : [...(o.days || []), d] });
  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[color:var(--cc-accent)]';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="glass relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{o.id ? t('station.orders.edit', 'Editar consigna') : t('station.orders.add', 'Agregar consigna')}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <Field label={t('station.orders.fTitle', 'Título')}>
            <input className={inputCls} value={o.title} onChange={(e) => set({ title: e.target.value })} placeholder={t('station.orders.fTitlePh', 'Ej: Abrir baños públicos')} />
          </Field>
          <Field label={t('station.orders.fDesc', 'Descripción')}>
            <textarea className={inputCls} rows={2} value={o.description || ''} onChange={(e) => set({ description: e.target.value })} placeholder={t('station.orders.fDescPh', 'Detalles de lo que debe hacerse...')} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={<span className="flex items-center gap-1"><Clock size={12} />{t('station.orders.fTime', 'Hora')}</span>}>
              <input type="time" className={inputCls} value={o.time || ''} onChange={(e) => set({ time: e.target.value })} />
            </Field>
            <Field label={<span className="flex items-center gap-1"><AlertCircle size={12} />{t('station.orders.fPriority', 'Prioridad')}</span>}>
              <select className={inputCls} value={o.priority} onChange={(e) => set({ priority: e.target.value as any })}>
                <option value="alta">{t('station.orders.prio.alta', 'Alta')}</option>
                <option value="media">{t('station.orders.prio.media', 'Media')}</option>
                <option value="baja">{t('station.orders.prio.baja', 'Baja')}</option>
              </select>
            </Field>
          </div>

          <Field label={<span className="flex items-center gap-1"><Repeat size={12} />{t('station.orders.fRecurrence', 'Recurrencia')}</span>}>
            <select className={inputCls} value={o.recurrence} onChange={(e) => set({ recurrence: e.target.value as Recurrence })}>
              <option value="daily">{t('station.orders.rec.daily', 'Todos los días')}</option>
              <option value="weekdays">{t('station.orders.rec.weekdays', 'Lunes a viernes')}</option>
              <option value="weekend">{t('station.orders.rec.weekend', 'Fines de semana')}</option>
              <option value="weekly">{t('station.orders.recSel.weekly', 'Días específicos de la semana')}</option>
              <option value="monthly">{t('station.orders.recSel.monthly', 'Mensual')}</option>
              <option value="once">{t('station.orders.recSel.once', 'Una sola vez')}</option>
            </select>
          </Field>

          {o.recurrence === 'weekly' && (
            <Field label={t('station.orders.fDays', 'Días')}>
              <div className="flex gap-1.5">
                {DOW.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`grid h-9 w-9 place-items-center rounded-lg border text-xs font-semibold transition-colors ${o.days?.includes(i) ? 'text-black' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    style={o.days?.includes(i) ? { background: 'var(--cc-accent)', borderColor: 'var(--cc-accent)' } : undefined}>
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {o.recurrence === 'monthly' && (
            <Field label={t('station.orders.fDayOfMonth', 'Día del mes')}>
              <input type="number" min={1} max={31} className={`${inputCls} w-24`} value={o.dayOfMonth || ''} onChange={(e) => set({ dayOfMonth: Number(e.target.value) || null })} />
            </Field>
          )}
          {o.recurrence === 'once' && (
            <Field label={<span className="flex items-center gap-1"><CalendarDays size={12} />{t('station.orders.fDate', 'Fecha')}</span>}>
              <input type="date" className={inputCls} value={o.date || ''} onChange={(e) => set({ date: e.target.value })} />
            </Field>
          )}

          {/* Notifications */}
          <div className="rounded-lg border border-border bg-white/[0.02] p-3">
            <label className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground"><Bell size={14} className="text-[color:var(--cc-accent)]" />{t('station.orders.fNotify', 'Notificar a los vigilantes por push')}</span>
              <button type="button" onClick={() => set({ notifyEnabled: !o.notifyEnabled })}
                className={`relative h-5 w-9 rounded-full transition-colors ${o.notifyEnabled ? '' : 'bg-white/10'}`} style={o.notifyEnabled ? { background: 'var(--cc-accent)' } : undefined}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${o.notifyEnabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </label>
            {o.notifyEnabled && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('station.orders.fNotifyBefore', 'Avisar')}</span>
                <input type="number" min={0} max={120} className={`${inputCls} w-20`} value={o.notifyMinutesBefore} onChange={(e) => set({ notifyMinutesBefore: Number(e.target.value) || 0 })} />
                <span>{t('station.orders.fNotifyMin', 'minutos antes de la hora')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">{t('common.cancel', 'Cancelar')}</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'var(--cc-accent)' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} {t('common.save', 'Guardar')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

/** Activity log — guard completions of this station's consignas, with evidence. */
function ActivityLog({ stationId, t }: { stationId: string; t: any }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    stationOrderService.completions(stationId)
      .then((res: any) => setRows(Array.isArray(res) ? res : (res?.rows ?? [])))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [stationId]);

  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (!rows.length) return (
    <div className="glass grid place-items-center py-14 text-center">
      <CheckCircle2 className="mb-2 text-muted-foreground/40" size={32} />
      <p className="text-sm font-medium text-foreground">{t('station.orders.logEmpty', 'Sin actividad registrada')}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t('station.orders.logEmptyHint', 'Cuando un vigilante complete una consigna, aparecerá aquí con su evidencia.')}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {rows.map((c) => (
        <div key={c.id} className="glass p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-online-soft text-online"><CheckCircle2 size={16} /></span>
              <div>
                <p className="text-sm font-semibold text-foreground">{c.order?.title || t('station.orders.order', 'Consigna')}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><User size={11} />{c.guardName || '—'} · {new Date(c.completedAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
            </div>
            {c.order?.time && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock size={11} />{c.order.time}</span>}
          </div>
          {c.note && <p className="mt-2 flex items-start gap-1.5 text-sm text-foreground"><FileText size={13} className="mt-0.5 shrink-0 text-muted-foreground" />{c.note}</p>}
          {(c.photos?.length || c.videoDownloadUrl || c.audioDownloadUrl) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(c.photos || []).map((ph: any, i: number) => fileUrl(ph.downloadUrl) && (
                <a key={i} href={fileUrl(ph.downloadUrl)!} target="_blank" rel="noreferrer" className="block h-16 w-16 overflow-hidden rounded-lg border border-border">
                  <img src={fileUrl(ph.downloadUrl)!} alt="" className="h-full w-full object-cover" />
                </a>
              ))}
              {c.videoDownloadUrl && (
                <a href={fileUrl(c.videoDownloadUrl)!} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:text-[color:var(--cc-accent)]">
                  <Video size={14} /> {t('station.orders.viewVideo', 'Ver video')}
                </a>
              )}
              {c.audioDownloadUrl && (
                <span className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1">
                  <Mic size={13} className="text-muted-foreground" />
                  <audio src={fileUrl(c.audioDownloadUrl)!} controls className="h-7" />
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
