import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus } from 'lucide-react';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';

type Props = { station: any; stationId: string; postSiteId: string };

export default function StationShifts({ station, stationId, postSiteId }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create shift form state
  const [showForm, setShowForm] = useState(false);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [shiftGuard, setShiftGuard] = useState('');
  const [guardsOptions, setGuardsOptions] = useState<{ id: string; label: string }[]>([]);
  const [loadingGuards, setLoadingGuards] = useState(false);
  const [saving, setSaving] = useState(false);

  const tenantId = localStorage.getItem('tenantId') || '';

  const loadShifts = async () => {
    if (!stationId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await ApiService.get(
        `/tenant/${tenantId}/shift?filter[station]=${encodeURIComponent(stationId)}&limit=999`
      );
      const list = Array.isArray(res) ? res : (res?.rows ?? []);
      setRows(list);
    } catch (e: any) {
      setError(e?.message || t('station.shifts.loadError', 'Error al cargar turnos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [stationId]);

  const fetchGuards = async () => {
    try {
      setLoadingGuards(true);
      const res = await ApiService.get(`/tenant/${tenantId}/security-guard/autocomplete?limit=200`);
      const list = Array.isArray(res) ? res : (res?.rows ?? []);
      setGuardsOptions(
        list.map((r: any) => ({
          id: r.guardId || r.id || r.value,
          label: r.fullName || r.name || r.label || r.email || '',
        })).filter((g: any) => g.id)
      );
    } catch {
      setGuardsOptions([]);
    } finally {
      setLoadingGuards(false);
    }
  };

  // Pre-fill shift times based on station schedule
  const getDefaultTimes = () => {
    const now = new Date();
    const startHour = station?.startingTimeInDay || '07:00';
    const endHour = station?.finishTimeInDay || '19:00';

    // Build start datetime = today at startHour
    const [sh, sm] = startHour.split(':').map(Number);
    const [eh, em] = endHour.split(':').map(Number);

    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh || 7, sm || 0);
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh || 19, em || 0);
    // If end is before start, assume next day
    if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);

    // Format for datetime-local input
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmtLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    return { start: fmtLocal(startDate), end: fmtLocal(endDate) };
  };

  const openForm = () => {
    const defaults = getDefaultTimes();
    setShiftStart(defaults.start);
    setShiftEnd(defaults.end);
    setShiftGuard('');
    fetchGuards();
    setShowForm(true);
  };

  const saveShift = async () => {
    if (!shiftGuard || !shiftStart || !shiftEnd) {
      toast.error(t('station.shifts.fillFields', 'Complete all fields'));
      return;
    }
    setSaving(true);
    try {
      await ApiService.post(`/tenant/${tenantId}/shift`, {
        data: {
          startTime: new Date(shiftStart).toISOString(),
          endTime: new Date(shiftEnd).toISOString(),
          station: stationId,
          guard: shiftGuard,
          postSiteId: postSiteId,
        },
      });
      toast.success(t('station.shifts.created', 'Turno creado'));
      setShowForm(false);
      loadShifts();
    } catch (e: any) {
      toast.error(e?.message || t('station.shifts.createError', 'Error al crear turno'));
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: any) => {
    if (!v) return '-';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(v));
    } catch {
      return String(v);
    }
  };

  const getStatus = (startTime: any, endTime: any) => {
    if (!startTime || !endTime) return { label: '-', color: '' };
    const now = Date.now();
    const s = new Date(startTime).getTime();
    const e = new Date(endTime).getTime();
    if (now >= s && now <= e) return { label: t('station.shifts.status.active', 'En servicio'), color: 'text-green-600 bg-green-500/10' };
    if (now < s) return { label: t('station.shifts.status.upcoming', 'Programado'), color: 'text-blue-600 bg-blue-500/10' };
    return { label: t('station.shifts.status.completed', 'Completado'), color: 'text-muted-foreground bg-muted/30' };
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {t('station.shifts.title', 'Turnos')}
          {rows.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({rows.length})</span>
          )}
        </h3>
        <button
          onClick={openForm}
          className="px-3 py-1.5 bg-[#C8860A] text-white rounded-md text-sm font-medium flex items-center gap-1.5 hover:bg-[#B37809] transition-colors"
        >
          <Plus size={14} /> {t('station.shifts.create', 'Nuevo turno')}
        </button>
      </div>

      {/* Create shift form */}
      {showForm && (
        <div className="px-6 py-4 border-b bg-muted/20 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">
                {t('station.shifts.col.guard', 'Guardia')}
              </label>
              {loadingGuards ? (
                <div className="text-xs text-muted-foreground">Cargando...</div>
              ) : (
                <select
                  value={shiftGuard}
                  onChange={(e) => setShiftGuard(e.target.value)}
                  className="w-full px-2 py-1.5 border rounded-md text-sm"
                >
                  <option value="">{t('station.shifts.selectGuard', 'Seleccionar guardia')}</option>
                  {guardsOptions.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">
                {t('station.shifts.col.start', 'Inicio')}
              </label>
              <input
                type="datetime-local"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full px-2 py-1.5 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">
                {t('station.shifts.col.end', 'Fin')}
              </label>
              <input
                type="datetime-local"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full px-2 py-1.5 border rounded-md text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 border rounded-md text-sm">
              {t('actions.cancel', 'Cancelar')}
            </button>
            <button
              onClick={saveShift}
              disabled={saving || !shiftGuard}
              className="px-4 py-1.5 bg-[#C8860A] text-white rounded-md text-sm font-medium hover:bg-[#B37809] disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : t('actions.save', 'Guardar')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-[#C8860A]" />
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          {t('station.shifts.empty', 'No hay turnos para este puesto.')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.shifts.col.guard', 'Guardia')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.shifts.col.start', 'Inicio')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.shifts.col.end', 'Fin')}
                </th>
                <th className="px-6 py-3 text-left font-semibold text-foreground/70">
                  {t('station.shifts.col.status', 'Estado')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r: any, i: number) => {
                const g = r.guard || r.securityGuard || r.user || {};
                const guardName =
                  g.fullName ||
                  g.name ||
                  `${g.firstName || ''} ${g.lastName || ''}`.trim() ||
                  r.guardName ||
                  r.guard_name ||
                  '-';
                const start = r.startTime || r.punchInTime || r.start;
                const end = r.endTime || r.punchOutTime || r.end;
                const status = getStatus(start, end);
                return (
                  <tr key={r.id || i} className="hover:bg-muted/30">
                    <td className="px-6 py-3 text-foreground font-medium">{guardName}</td>
                    <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{fmt(start)}</td>
                    <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{fmt(end)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
