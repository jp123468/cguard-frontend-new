import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarOff, Loader2, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import guardMeService from '@/lib/api/guardMeService';

export default function GuardTimeOff() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [type, setType] = useState('vacaciones');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await guardMeService.timeOffList();
      setRows(res?.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecciona fechas de inicio y fin');
      return;
    }
    setSaving(true);
    try {
      await guardMeService.timeOffCreate({ type, startDate, endDate, reason });
      toast.success('Solicitud enviada');
      setShowForm(false);
      setType('vacaciones');
      setStartDate('');
      setEndDate('');
      setReason('');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || 'Error al enviar solicitud');
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={14} className="text-green-600" />;
      case 'rejected': return <XCircle size={14} className="text-red-600" />;
      default: return <Clock size={14} className="text-amber-600" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      default: return 'Pendiente';
    }
  };

  const fmtDay = (v: any) => {
    if (!v) return '-';
    try { return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)); }
    catch { return String(v); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-[#C8860A]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CalendarOff size={22} className="text-[#C8860A]" />
          {t('guard.timeOff.title', 'Mis Permisos')}
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-[#C8860A] text-white rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-[#B37809]"
        >
          <Plus size={14} /> Solicitar
        </button>
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Nueva solicitud</h3>
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1">Tipo</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-2 py-1.5 border rounded-md text-sm">
              <option value="vacaciones">Vacaciones</option>
              <option value="enfermedad">Enfermedad</option>
              <option value="personal">Personal</option>
              <option value="calamidad">Calamidad doméstica</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">Desde</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-1.5 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">Hasta</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-1.5 border rounded-md text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1">Motivo (opcional)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="w-full px-2 py-1.5 border rounded-md text-sm resize-none" placeholder="Describe el motivo..." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 border rounded-md text-sm">Cancelar</button>
            <button onClick={handleSubmit} disabled={saving} className="px-4 py-1.5 bg-[#C8860A] text-white rounded-md text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {/* Existing requests */}
      {rows.length === 0 ? (
        <div className="bg-card border rounded-xl p-6 text-center text-sm text-muted-foreground">
          No tienes solicitudes de permiso.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r: any) => (
            <div key={r.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground capitalize">{r.type || 'Permiso'}</p>
                <span className="flex items-center gap-1 text-xs font-medium">
                  {statusIcon(r.status)}
                  {statusLabel(r.status)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtDay(r.startDate)} — {fmtDay(r.endDate)}
              </p>
              {r.reason && <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
