import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, UserPlus, Users, X, Repeat, Shield, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiService } from '@/services/api/apiService';

type Props = { station: any; stationId: string; postSiteId: string };
type PosType = 'fijo' | 'sacafranco';

interface Assignment {
  id: string;
  guardUserId: string;
  guardName: string;
  positionId: string | null;
  positionName: string;
  type: PosType;
  rotation: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function StationGuards({ station, stationId }: Props) {
  const { t } = useTranslation();
  const tenantId = (station?.tenantId || localStorage.getItem('tenantId') || '') as string;

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
      const [aRes, pRes, gRes]: any[] = await Promise.all([
        ApiService.get(`/tenant/${tenantId}/guard-assignments?stationId=${encodeURIComponent(stationId)}&status=active&_=${ts}`).catch(() => []),
        ApiService.get(`/tenant/${tenantId}/station/${encodeURIComponent(stationId)}/positions?_=${ts}`).catch(() => []),
        ApiService.get(`/tenant/${tenantId}/security-guard?limit=999&_=${ts}`).catch(() => []),
      ]);

      const aRows = Array.isArray(aRes) ? aRes : (aRes?.rows ?? []);
      setRows(aRows.map((a: any): Assignment => {
        const g = a.guard || a.user || {};
        const pos = a.position || {};
        const type: PosType = (pos.type || (a.isRelief ? 'sacafranco' : 'fijo')) as PosType;
        return {
          id: String(a.id),
          guardUserId: g.id || a.guardId || '',
          guardName: g.fullName || `${g.firstName || ''} ${g.lastName || ''}`.trim() || g.email || '—',
          positionId: a.positionId || pos.id || null,
          positionName: pos.name || (type === 'sacafranco' ? 'Sacafranco' : 'Fijo'),
          type,
          rotation: a.rotationStyle?.name || a.rotationStyle?.pattern || '',
        };
      }));

      setPositions(Array.isArray(pRes) ? pRes : (pRes?.rows ?? []));

      const gRows = Array.isArray(gRes) ? gRes : (gRes?.rows ?? []);
      setGuards(gRows.map((r: any) => {
        const g = r.guard || r;
        return {
          id: g.id || r.guardId || r.id, // assignment needs the user id
          label: g.fullName || r.fullName || `${g.firstName || ''} ${g.lastName || ''}`.trim() || g.email || '—',
        };
      }).filter((x: any) => x.id && x.label));
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

  const submitAssign = async () => {
    if (!pickGuard) { toast.error(t('station.guards.pickGuard', 'Selecciona un guardia')); return; }
    setSaving(true);
    try {
      if (changeTarget) {
        // Change = remove old + assign new on the same position.
        await ApiService.delete(`/tenant/${tenantId}/guard-assignment/${encodeURIComponent(changeTarget.id)}`);
        await doAssign(pickGuard, changeTarget.type, changeTarget.positionId);
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
    if (!window.confirm(t('station.guards.confirmRemove', `¿Quitar a ${a.guardName} de este puesto?`).replace('{name}', a.guardName))) return;
    try {
      await ApiService.delete(`/tenant/${tenantId}/guard-assignment/${encodeURIComponent(a.id)}`);
      setRows((rs) => rs.filter((x) => x.id !== a.id));
      toast.success(t('station.guards.removed', 'Guardia removido del puesto'));
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
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openAssign('fijo')} className="inline-flex items-center gap-1.5 rounded-full bg-[#C8860A] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#B37809]">
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
    </>
  );
}
