import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, UserPlus, Users, X, Repeat, Shield, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiService } from '@/services/api/apiService';
import ShiftAssignModal from './ShiftAssignModal';

type Props = { station: any; stationId: string; postSiteId: string };
type PosType = 'fijo' | 'sacafranco';

interface Assignment {
  id: string;                    // row key: `a:<assignmentId>` or `s:<userId>`
  assignmentId: string | null;   // guardAssignment id, if any
  guardUserId: string;
  guardName: string;
  positionId: string | null;
  positionName: string;
  type: PosType;
  rotation: string;
  workDays: Set<string>;
  shiftIds: string[];            // all of this guard's shift ids at the station
}

const today = () => new Date().toISOString().slice(0, 10);

// Local YYYY-MM-DD key (don't use toISOString — it shifts by timezone).
const dk = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEKDAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
// The next 4 weeks (28 days), starting today.
const NEXT_DAYS: Date[] = Array.from({ length: 28 }, (_, i) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d;
});

/** A 4-week strip: filled on the days this guard works, muted on days off. For a
 *  fijo, the muted (rest) days are exactly what the sacafranco should fill. A
 *  small gap separates each week. */
function CoverageStrip({ work, type }: { work: Set<string>; type: PosType }) {
  if (!work || work.size === 0) return null;
  const onCls = type === 'sacafranco' ? 'bg-indigo-500 text-white' : 'bg-[#C8860A] text-white';
  return (
    <div className="mt-1.5 flex gap-px overflow-x-auto pb-1">
      {NEXT_DAYS.map((d, i) => {
        const on = work.has(dk(d));
        const isToday = i === 0;
        const weekGap = i > 0 && i % 7 === 0 ? 'ml-1.5' : '';
        return (
          <div
            key={i}
            title={`${dk(d)} — ${on ? (type === 'sacafranco' ? 'cubre' : 'trabaja') : 'descansa'}`}
            className={`flex h-6 w-[18px] shrink-0 flex-col items-center justify-center rounded-sm text-[8px] font-semibold leading-none ${weekGap} ${on ? onCls : 'bg-muted/40 text-muted-foreground'} ${isToday ? 'ring-1 ring-foreground/50' : ''}`}
          >
            <span className="opacity-60">{WEEKDAY[d.getDay()]}</span>
            <span>{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StationGuards({ station, stationId, postSiteId }: Props) {
  const { t } = useTranslation();
  const tenantId = (station?.tenantId || localStorage.getItem('tenantId') || '') as string;
  const [showShiftModal, setShowShiftModal] = useState(false);

  const [rows, setRows] = useState<Assignment[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [guards, setGuards] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal state: 'fijo' | 'sacafranco' = assign new; or a change target.
  const [assignType, setAssignType] = useState<PosType | null>(null);
  const [changeTarget, setChangeTarget] = useState<Assignment | null>(null);
  const [pickGuard, setPickGuard] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    setError(null);
    try {
      const ts = Date.now();
      const [aRes, pRes, gRes, sRes]: any[] = await Promise.all([
        ApiService.get(`/tenant/${tenantId}/guard-assignments?stationId=${encodeURIComponent(stationId)}&status=active&_=${ts}`).catch(() => []),
        ApiService.get(`/tenant/${tenantId}/station/${encodeURIComponent(stationId)}/positions?_=${ts}`).catch(() => []),
        ApiService.get(`/tenant/${tenantId}/security-guard?limit=999&_=${ts}`).catch(() => []),
        ApiService.get(`/tenant/${tenantId}/shift?filter[station]=${encodeURIComponent(stationId)}&limit=999&_=${ts}`).catch(() => []),
      ]);

      // Alias map: any guard id (securityGuard id, user id) -> canonical user id.
      // Lets us match shifts (which may reference either) to one guard reliably.
      const gRows = Array.isArray(gRes) ? gRes : (gRes?.rows ?? []);
      const aliasToUser: Record<string, string> = {};
      const nameByUser: Record<string, string> = {};
      const guardOptions: { id: string; label: string }[] = [];
      for (const r of gRows) {
        const u = r.guard || r;
        const userId = String(u.id || r.guardId || r.id || '');
        if (!userId) continue;
        const label = u.fullName || r.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '—';
        aliasToUser[userId] = userId;
        if (r.id) aliasToUser[String(r.id)] = userId;
        if (r.guardId) aliasToUser[String(r.guardId)] = userId;
        if (u.id) aliasToUser[String(u.id)] = userId;
        nameByUser[userId] = label;
        guardOptions.push({ id: userId, label });
      }
      setGuards(guardOptions.filter((x) => x.id && x.label));

      // Per-guard work-days + shift ids from generated shifts (source of truth —
      // the Turnos tab writes raw shifts), canonicalized to the user id.
      const workByGuard: Record<string, Set<string>> = {};
      const shiftIdsByGuard: Record<string, string[]> = {};
      const sRows = Array.isArray(sRes) ? sRes : (sRes?.rows ?? []);
      for (const s of sRows) {
        const when = s.startTime || s.start || s.punchInTime;
        if (!when) continue;
        const d = new Date(when);
        if (isNaN(d.getTime())) continue;
        const sg = s.guard || s.securityGuard || s.user || {};
        const rawId = sg.id || sg.guardId || s.guardId || s.securityGuardId;
        if (!rawId) continue;
        const uid = aliasToUser[String(rawId)] || String(rawId);
        (workByGuard[uid] ||= new Set()).add(dk(d));
        (shiftIdsByGuard[uid] ||= []).push(String(s.id));
        if (!nameByUser[uid]) {
          const nm = sg.fullName || `${sg.firstName || ''} ${sg.lastName || ''}`.trim() || sg.email;
          if (nm) nameByUser[uid] = nm;
        }
      }

      // Rows: guard-assignments first (rich: type + position), then shift-only
      // guards added via the Turnos tab (no guard-assignment record).
      const aRows = Array.isArray(aRes) ? aRes : (aRes?.rows ?? []);
      const seen = new Set<string>();
      const out: Assignment[] = [];
      for (const a of aRows) {
        const g = a.guard || a.user || {};
        const pos = a.position || {};
        const type: PosType = (pos.type || (a.isRelief ? 'sacafranco' : 'fijo')) as PosType;
        const uid = aliasToUser[String(g.id || a.guardId || '')] || String(g.id || a.guardId || '');
        if (uid) seen.add(uid);
        out.push({
          id: `a:${a.id}`,
          assignmentId: String(a.id),
          guardUserId: uid,
          guardName: g.fullName || `${g.firstName || ''} ${g.lastName || ''}`.trim() || g.email || nameByUser[uid] || '—',
          positionId: a.positionId || pos.id || null,
          positionName: pos.name || (type === 'sacafranco' ? 'Sacafranco' : 'Fijo'),
          type,
          rotation: a.rotationStyle?.name || a.rotationStyle?.pattern || '',
          workDays: workByGuard[uid] || new Set(),
          shiftIds: Array.from(new Set(shiftIdsByGuard[uid] || [])),
        });
      }
      for (const uid of Object.keys(shiftIdsByGuard)) {
        if (seen.has(uid)) continue;
        out.push({
          id: `s:${uid}`,
          assignmentId: null,
          guardUserId: uid,
          guardName: nameByUser[uid] || '—',
          positionId: null,
          positionName: t('station.guards.viaTurnos', 'Turno asignado'),
          type: 'fijo',
          rotation: '',
          workDays: workByGuard[uid] || new Set(),
          shiftIds: Array.from(new Set(shiftIdsByGuard[uid] || [])),
        });
      }
      setRows(out);
      setPositions(Array.isArray(pRes) ? pRes : (pRes?.rows ?? []));
    } catch (e: any) {
      setError(e?.message || t('station.guards.loadError', 'Error al cargar guardias'));
    } finally {
      setLoading(false);
    }
  }, [stationId, tenantId, t]);

  useEffect(() => { load(); }, [load]);

  // Find a position of the given type, creating one if the station has none.
  const ensurePosition = async (type: PosType): Promise<string | null> => {
    const existing = positions.find((p) => (p.type || 'fijo') === type);
    if (existing) return existing.id;
    try {
      const created: any = await ApiService.post(`/tenant/${tenantId}/station/${encodeURIComponent(stationId)}/positions`, {
        name: type === 'sacafranco' ? 'Sacafranco' : 'Fijo 1',
        type,
        startTime: station?.startingTimeInDay || '07:00',
        endTime: station?.finishTimeInDay || '19:00',
        guardsNeeded: 1,
      });
      const id = created?.id || created?.data?.id || null;
      return id;
    } catch {
      return null; // fall back to an ad-hoc assignment (positionId null)
    }
  };

  const doAssign = async (guardUserId: string, type: PosType, positionId?: string | null) => {
    const pid = positionId !== undefined ? positionId : await ensurePosition(type);
    await ApiService.post(`/tenant/${tenantId}/guard-assignment`, {
      guardId: guardUserId,
      stationId,
      positionId: pid || undefined,
      isRelief: type === 'sacafranco',
      startDate: today(),
    });
  };

  // Delete shifts in batches (keeps the request URL within limits).
  const deleteShifts = async (ids: string[]) => {
    for (let i = 0; i < ids.length; i += 40) {
      const grp = ids.slice(i, i + 40);
      if (grp.length) await ApiService.delete(`/tenant/${tenantId}/shift?ids=${grp.map(encodeURIComponent).join(',')}`);
    }
  };

  const submitAssign = async () => {
    if (!pickGuard) { toast.error(t('station.guards.pickGuard', 'Selecciona un guardia')); return; }
    setSaving(true);
    try {
      if (changeTarget) {
        if (changeTarget.assignmentId) {
          // Assignment-based: end the old assignment + its shifts, then create a
          // fresh assignment (with rotation) for the new guard.
          await ApiService.delete(`/tenant/${tenantId}/guard-assignment/${encodeURIComponent(changeTarget.assignmentId)}`);
          await deleteShifts(changeTarget.shiftIds);
          await doAssign(pickGuard, changeTarget.type, changeTarget.positionId);
        } else {
          // Turnos-based (raw shifts): reassign each shift to the new guard,
          // keeping the existing schedule intact.
          for (const sid of changeTarget.shiftIds) {
            await ApiService.patch(`/tenant/${tenantId}/shift/${encodeURIComponent(sid)}/assign`, { data: { guard: pickGuard } });
          }
        }
        toast.success(t('station.guards.changed', 'Guardia actualizado'));
      } else if (assignType) {
        await doAssign(pickGuard, assignType);
        toast.success(assignType === 'sacafranco'
          ? t('station.guards.sacaAdded', 'Sacafranco asignado')
          : t('station.guards.added', 'Guardia asignado'));
      }
      closeModal();
      load();
    } catch (e: any) {
      toast.error(e?.message || t('station.guards.assignFailed', 'No se pudo asignar'));
    } finally {
      setSaving(false);
    }
  };

  const removeGuard = async (a: Assignment) => {
    if (!window.confirm(`¿Quitar a ${a.guardName} de este puesto? Se eliminarán sus turnos en este sitio.`)) return;
    try {
      if (a.assignmentId) {
        await ApiService.delete(`/tenant/${tenantId}/guard-assignment/${encodeURIComponent(a.assignmentId)}`);
      }
      // Remove their shifts so they disappear from the Turnos tab too.
      await deleteShifts(a.shiftIds);
      setRows((rs) => rs.filter((x) => x.id !== a.id));
      toast.success(t('station.guards.removed', 'Guardia removido del puesto y de los turnos'));
    } catch (e: any) {
      toast.error(e?.message || t('station.guards.removeFailed', 'No se pudo quitar'));
    }
  };

  const openAssign = (type: PosType) => { setAssignType(type); setChangeTarget(null); setPickGuard(''); };
  const openChange = (a: Assignment) => { setChangeTarget(a); setAssignType(null); setPickGuard(''); };
  const closeModal = () => { setAssignType(null); setChangeTarget(null); setPickGuard(''); };

  const modalOpen = !!assignType || !!changeTarget;
  const modalIsSaca = assignType === 'sacafranco' || changeTarget?.type === 'sacafranco';
  const selectCls = 'w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-[#C8860A] focus:ring-2 focus:ring-[#C8860A]/20';

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t('station.guards.title', 'Guardias Asignados')}
              {rows.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({rows.length})</span>}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('station.guards.hint', 'El fijo cubre la rotación; el sacafranco cubre sus días de descanso.')}
            </p>
            {rows.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="font-medium">Próximas 4 semanas:</span>
                <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-[#C8860A]" /> Fijo trabaja</span>
                <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-indigo-500" /> Sacafranco cubre</span>
                <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-muted/40" /> Descanso</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShiftModal(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#C8860A] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#B37809]">
              <UserPlus size={15} /> {t('station.guards.assign', 'Asignar guardia')}
            </button>
            <button onClick={() => openAssign('sacafranco')} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/30">
              <Repeat size={15} /> {t('station.guards.addSaca', 'Agregar sacafranco')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-[#C8860A]" /></div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Users className="h-8 w-8 opacity-50" />
            <p className="text-sm">{t('station.guards.empty', 'No hay guardias asignados. Asigna un guardia fijo para empezar.')}</p>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.type === 'sacafranco' ? 'bg-indigo-500/12 text-indigo-600' : 'bg-[#C8860A]/12 text-[#C8860A]'}`}>
                  {a.type === 'sacafranco' ? <Repeat size={16} /> : <Shield size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{a.guardName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.type === 'sacafranco' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-[#C8860A]/10 text-[#C8860A]'}`}>
                      {a.type === 'sacafranco' ? 'Sacafranco' : 'Fijo'}
                    </span>
                    {a.rotation ? <span className="text-xs text-muted-foreground">· {a.rotation}</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{a.positionName}</div>
                  <CoverageStrip work={a.workDays} type={a.type} />
                </div>
                <button onClick={() => openChange(a)} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted/40" title={t('station.guards.change', 'Cambiar')}>
                  <RefreshCw size={13} /> {t('station.guards.change', 'Cambiar')}
                </button>
                <button onClick={() => removeGuard(a)} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600" title={t('station.guards.remove', 'Quitar')}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Assign / Change modal — portaled so the station layout can't clip it */}
      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={closeModal}>
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border/30 bg-card shadow-2xl max-h-[90vh] animate-in fade-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl sm:zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${modalIsSaca ? 'bg-indigo-500/12 text-indigo-600' : 'bg-[#C8860A]/12 text-[#C8860A]'}`}>
                  {modalIsSaca ? <Repeat size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground">
                    {changeTarget ? t('station.guards.changeTitle', 'Cambiar guardia') : modalIsSaca ? t('station.guards.sacaTitle', 'Agregar sacafranco') : t('station.guards.assignTitle', 'Asignar guardia')}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {modalIsSaca
                      ? t('station.guards.sacaSub', 'Cubre los días de descanso del guardia fijo')
                      : t('station.guards.assignSub', 'Guardia fijo de la rotación del puesto')}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/30 hover:text-foreground"><X size={16} /></button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {changeTarget && (
                <div className="rounded-xl bg-muted/20 px-3 py-2.5 text-sm">
                  {t('station.guards.replacing', 'Reemplazando a')} <span className="font-medium text-foreground">{changeTarget.guardName}</span>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('station.guards.guard', 'Guardia')}</label>
                <select value={pickGuard} onChange={(e) => setPickGuard(e.target.value)} className={selectCls} autoFocus>
                  <option value="">{t('station.guards.selectGuard', 'Seleccionar guardia…')}</option>
                  {guards.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/20 px-5 py-3">
              <button onClick={closeModal} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/20 hover:text-foreground">{t('common.cancel', 'Cancelar')}</button>
              <button onClick={submitAssign} disabled={saving || !pickGuard} className="inline-flex items-center gap-1.5 rounded-xl bg-[#C8860A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B37809] disabled:opacity-40">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {changeTarget ? t('station.guards.save', 'Guardar') : t('station.guards.assignBtn', 'Asignar')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <ShiftAssignModal
        open={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSaved={() => { setShowShiftModal(false); load(); }}
        station={station}
        stationId={stationId}
        postSiteId={postSiteId}
      />
    </>
  );
}
