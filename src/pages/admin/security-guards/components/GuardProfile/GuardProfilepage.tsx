import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getTenantTimezone } from '@/utils/tenantLocation';
import securityGuardService from '@/lib/api/securityGuardService';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';
import type { GuardDetail } from '../../guardDetailTypes';

/** The linked app user carried under `guard` on the securityGuard record. */
interface ProfileUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  hasPassword?: boolean;
  invitationTokenExpiresAt?: string;
  lastLoginAt?: string;
  homeAddress?: string;
}

/** A license summary shown in the sidebar. */
interface ProfileLicense {
  type?: string;
  number?: string;
  expiryDate?: string;
}

/**
 * The full securityGuard record this page loads/edits. Only a whitelisted subset
 * (EDITABLE_*) is actually persisted; the rest is read-only. Index signature
 * covers dynamic field access in the edit-form builder.
 */
interface ProfileGuard extends Omit<GuardDetail, 'guard'> {
  address?: string;
  birthPlace?: string;
  birthDate?: string;
  hiringContractDate?: string;
  gender?: string;
  bloodType?: string;
  maritalStatus?: string;
  academicInstruction?: string;
  guardCredentials?: string;
  languages?: string[] | string;
  skills?: string[] | string;
  deviceType?: string;
  deviceInfo?: { platform?: string; model?: string; osVersion?: string; appVersion?: string };
  licenses?: ProfileLicense[];
  guard?: ProfileUser;
  [key: string]: unknown;
}

type Props = {
  guard: ProfileGuard;
  onGuardUpdate?: (updatedGuard: ProfileGuard) => void;
};

/** A guard-shift attendance row (read-only history). */
interface GuardShiftRow {
  id: string;
  stationName?: string | { stationName?: string; name?: string };
  station?: { stationName?: string; name?: string };
  shiftSchedule?: string;
  sessions?: Array<{ in?: string; out?: string }>;
  punchInTime?: string;
  punchOutTime?: string;
}


/** Dropdown options matching the backend isIn validators. */
const FIELD_OPTIONS: Record<string, string[]> = {
  gender: ['Masculino', 'Femenino'],
  bloodType: ['A+', 'A-', 'AB+', 'AB-', 'O+', 'O-', 'B+', 'B-'],
  maritalStatus: ['Soltero', 'Casado', 'Unión libre', 'Divorciado'],
  academicInstruction: ['Primaria', 'Secundaria', 'Universitaria', 'Universidad', 'Especial'],
};

/** ONLY these securityGuard fields are accepted by the update endpoint. The save
 *  payload is built from exactly this list, so editing actually persists (the old
 *  page POSTed the whole bloated object — incl. the nested user/image arrays —
 *  which silently failed). Name/email/phone live on the linked USER (identity) and
 *  are shown read-only in the header. */
const EDITABLE_TEXT = ['governmentId', 'address', 'birthPlace', 'guardCredentials'] as const;
const EDITABLE_SELECT = ['gender', 'bloodType', 'maritalStatus', 'academicInstruction'] as const;
const EDITABLE_DATE = ['birthDate', 'hiringContractDate'] as const;

function toDateInput(v: string | number | Date | null | undefined): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// ── Small presentational helpers ────────────────────────────────────────────
const Section = ({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-card border rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h4 className="font-semibold text-sm tracking-tight">{title}</h4>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const ReadField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
    <div className="font-medium text-sm text-foreground truncate">{value || '—'}</div>
  </div>
);

const EditText = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
    <Input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
  </div>
);

const EditSelect = ({ label, value, field, onChange }: { label: string; value: string; field: string; onChange: (v: string) => void }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2"
    >
      <option value="">Seleccionar…</option>
      {(FIELD_OPTIONS[field] || []).map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default function GuardProfile({ guard, onGuardUpdate }: Props) {
  const { id } = useParams();
  const { t } = useTranslation();

  const [data, setData] = useState<ProfileGuard>({ ...guard });
  const [form, setForm] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const savedRef = useRef<ProfileGuard>({ ...guard });

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // ── Load full guard ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      try {
        const resp = await securityGuardService.get(id) as ProfileGuard & { data?: ProfileGuard };
        if (!mounted) return;
        const payload: ProfileGuard = resp && resp.id ? resp : (resp && resp.data) ? resp.data : resp;
        setData((prev) => ({ ...prev, ...payload }));
        savedRef.current = { ...savedRef.current, ...payload };
        if (onGuardUpdate) onGuardUpdate(payload);
      } catch (err) {
        console.error('Error cargando vigilante:', err);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const beginEdit = () => {
    const src = data || ({} as ProfileGuard);
    const next: Record<string, string> = {};
    [...EDITABLE_TEXT, ...EDITABLE_SELECT].forEach((f) => { next[f] = (src[f] as string) ?? ''; });
    EDITABLE_DATE.forEach((f) => { next[f] = toDateInput(src[f] as string | undefined); });
    next.languages = Array.isArray(src.languages) ? src.languages.join(', ') : (src.languages || '');
    next.skills = Array.isArray(src.skills) ? src.skills.join(', ') : (src.skills || '');
    setForm(next);
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setForm({}); };

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Build a CLEAN payload — ONLY backend-accepted securityGuard fields.
      const payload: Record<string, unknown> = {};
      [...EDITABLE_TEXT, ...EDITABLE_SELECT].forEach((f) => { payload[f] = form[f] ?? null; });
      EDITABLE_DATE.forEach((f) => { if (form[f]) payload[f] = form[f]; });
      payload.languages = String(form.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      payload.skills = String(form.skills || '').split(',').map((s: string) => s.trim()).filter(Boolean);

      await securityGuardService.update(id, payload);
      const merged = { ...data, ...payload };
      setData(merged);
      savedRef.current = merged;
      setEditing(false);
      setForm({});
      toast.success(t('guards.profile.toasts.updated') || 'Perfil actualizado');
      if (onGuardUpdate) onGuardUpdate(merged);
    } catch (error: any) {
      console.error('Error actualizando vigilante:', error);
      toast.error(error?.message || t('guards.profile.toasts.updateError') || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Attendance (read-only history) ──────────────────────────────────────────
  const [guardShifts, setGuardShifts] = useState<GuardShiftRow[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoadingShifts(true);
      try {
        const tenantId = localStorage.getItem('tenantId') || '';
        const resp = await ApiService.get(`/tenant/${tenantId}/guard-shift?filter[guardName]=${encodeURIComponent(id)}&limit=20`) as { rows?: GuardShiftRow[] } | GuardShiftRow[];
        setGuardShifts(Array.isArray(resp) ? resp : (resp && resp.rows) ? resp.rows : []);
      } catch (err) {
        console.error('Failed loading guard shifts', err);
      } finally {
        setLoadingShifts(false);
      }
    })();
  }, [id]);

  const handleSendAppAccess = async () => {
    if (!id) return;
    setSendingInvite(true);
    try {
      const payload: Record<string, unknown> = { securityGuardId: id };
      if (data?.guard?.id) payload.guard = data.guard.id;
      else if (data?.guard?.email) payload.contact = data.guard.email;
      if (data?.guard?.firstName) payload.firstName = data.guard.firstName;
      if (data?.guard?.lastName) payload.lastName = data.guard.lastName;
      await securityGuardService.resendInvite(payload);
      toast.success(t('guards.profile.access.inviteSent') || 'Invitación enviada');
      const refreshed = await securityGuardService.get(id) as ProfileGuard & { data?: ProfileGuard };
      const d = refreshed && refreshed.id ? refreshed : (refreshed && refreshed.data) ? refreshed.data : refreshed;
      setData((prev) => ({ ...prev, ...d }));
    } catch (err: any) {
      console.error('Send app access failed', err);
      toast.error(err?.message || t('guards.profile.access.inviteError') || 'Error al enviar invitación');
    } finally {
      setSendingInvite(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const avatar = (() => {
    const pi = data?.profileImage;
    if (Array.isArray(pi)) return pi[0]?.downloadUrl || pi[0]?.publicUrl || null;
    return pi?.downloadUrl || pi?.publicUrl || (typeof pi === 'string' && pi ? pi : null);
  })();
  const fullName = data?.fullName || [data?.guard?.firstName, data?.guard?.lastName].filter(Boolean).join(' ') || t('guards.profile.nav') || 'Vigilante';
  const onDuty = !!data?.isOnDuty;
  const gStatus = data?.guard?.status;
  const hasPassword = data?.guard?.hasPassword;
  const isActivated = hasPassword && gStatus === 'active';
  const tokenExpires = data?.guard?.invitationTokenExpiresAt;
  const tokenExpired = tokenExpires && new Date(tokenExpires) < new Date();

  const accessBadge = isActivated
    ? { txt: t('guards.profile.access.statusActive') || 'App activa', cls: 'bg-green-500/15 text-green-700', dot: 'bg-green-500' }
    : tokenExpired
      ? { txt: t('guards.profile.access.statusExpired') || 'Invitación expirada', cls: 'bg-red-500/15 text-red-700', dot: 'bg-red-500' }
      : { txt: t('guards.profile.access.statusPending') || 'Acceso pendiente', cls: 'bg-orange-500/15 text-orange-700', dot: 'bg-orange-500' };

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title={t('guards.nav.perfil')}>
        <div className="mx-auto max-w-5xl space-y-6 pb-24">

          {/* Edit toolbar — the guard's identity (avatar/name/status) lives in
              the shared GuardsLayout header card above. */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">{t('guards.nav.perfil', 'Perfil')}</h2>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button onClick={beginEdit} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.536-6.536a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" /></svg>
                  {t('guards.profile.actions.edit') || 'Editar'}
                </button>
              ) : (
                <>
                  <button onClick={cancelEdit} disabled={saving} className="text-sm px-3 py-2 rounded-lg border hover:bg-muted transition disabled:opacity-50">{t('guards.profile.actions.cancel') || 'Cancelar'}</button>
                  <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm disabled:opacity-50">
                    {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {saving ? (t('guards.profile.actions.saving') || 'Guardando…') : (t('guards.profile.actions.save') || 'Guardar')}
                  </button>
                </>
              )}
            </div>
          </div>

          {editing && (
            <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              {t('guards.profile.editHint') || 'El nombre, correo y teléfono son la identidad del vigilante y se gestionan desde la invitación de acceso.'}
            </div>
          )}

          {/* ── INFO GRID ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* MAIN (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <Section title={t('guards.profile.cards.general') || 'Información general'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReadField label={t('guards.profile.fields.firstName') || 'Nombres'} value={data?.guard?.firstName} />
                  <ReadField label={t('guards.profile.fields.lastName') || 'Apellidos'} value={data?.guard?.lastName} />
                  {editing ? (
                    <>
                      <EditText label={t('guards.profile.fields.id1') || 'Cédula / ID'} value={form.governmentId} onChange={(v) => setField('governmentId', v)} />
                      <EditText label={t('guards.profile.fields.birthDate') || 'Fecha de nacimiento'} value={form.birthDate} onChange={(v) => setField('birthDate', v)} type="date" />
                      <EditText label={t('guards.profile.fields.birthPlace') || 'Lugar de nacimiento'} value={form.birthPlace} onChange={(v) => setField('birthPlace', v)} />
                      <EditText label={t('guards.profile.fields.address') || 'Dirección'} value={form.address} onChange={(v) => setField('address', v)} />
                    </>
                  ) : (
                    <>
                      <ReadField label={t('guards.profile.fields.id1') || 'Cédula / ID'} value={data?.governmentId} />
                      <ReadField label={t('guards.profile.fields.birthDate') || 'Fecha de nacimiento'} value={data?.birthDate ? new Date(data.birthDate).toLocaleDateString('es') : null} />
                      <ReadField label={t('guards.profile.fields.birthPlace') || 'Lugar de nacimiento'} value={data?.birthPlace} />
                      <ReadField label={t('guards.profile.fields.address') || 'Dirección'} value={data?.address || data?.guard?.homeAddress} />
                    </>
                  )}
                </div>
              </Section>

              <Section title={t('guards.profile.cards.personal') || 'Información personal'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {editing ? (
                    <>
                      <EditSelect label={t('guards.profile.fields.gender') || 'Género'} field="gender" value={form.gender} onChange={(v) => setField('gender', v)} />
                      <EditSelect label={t('guards.profile.fields.bloodType') || 'Tipo de sangre'} field="bloodType" value={form.bloodType} onChange={(v) => setField('bloodType', v)} />
                      <EditSelect label={t('guards.profile.fields.maritalStatus') || 'Estado civil'} field="maritalStatus" value={form.maritalStatus} onChange={(v) => setField('maritalStatus', v)} />
                      <EditSelect label={t('guards.profile.fields.education') || 'Instrucción académica'} field="academicInstruction" value={form.academicInstruction} onChange={(v) => setField('academicInstruction', v)} />
                      <EditText label={t('guards.profile.fields.guardCredentials') || 'Credencial'} value={form.guardCredentials} onChange={(v) => setField('guardCredentials', v)} />
                      <EditText label={t('guards.profile.fields.hireDate', 'Fecha de contratación')} value={form.hiringContractDate} onChange={(v) => setField('hiringContractDate', v)} type="date" />
                    </>
                  ) : (
                    <>
                      <ReadField label={t('guards.profile.fields.gender') || 'Género'} value={data?.gender} />
                      <ReadField label={t('guards.profile.fields.bloodType') || 'Tipo de sangre'} value={data?.bloodType} />
                      <ReadField label={t('guards.profile.fields.maritalStatus') || 'Estado civil'} value={data?.maritalStatus} />
                      <ReadField label={t('guards.profile.fields.education') || 'Instrucción académica'} value={data?.academicInstruction} />
                      <ReadField label={t('guards.profile.fields.guardCredentials') || 'Credencial'} value={data?.guardCredentials} />
                      <ReadField label={t('guards.profile.fields.hireDate', 'Fecha de contratación')} value={data?.hiringContractDate ? new Date(data.hiringContractDate).toLocaleDateString('es') : null} />
                    </>
                  )}
                </div>
              </Section>

              <Section title={t('guards.profile.cards.languagesSkills') || 'Idiomas y habilidades'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {editing ? (
                    <>
                      <EditText label={t('guards.profile.fields.languages') || 'Idiomas'} value={form.languages} onChange={(v) => setField('languages', v)} />
                      <EditText label={t('guards.profile.fields.skills') || 'Habilidades'} value={form.skills} onChange={(v) => setField('skills', v)} />
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('guards.profile.fields.languages') || 'Idiomas'}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(data?.languages) ? data.languages : []).filter(Boolean).map((l: string) => (
                            <span key={l} className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">{l}</span>
                          ))}
                          {(!data?.languages || !data.languages.length) && <span className="text-sm text-muted-foreground">—</span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('guards.profile.fields.skills') || 'Habilidades'}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(data?.skills) ? data.skills : []).filter(Boolean).map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">{s}</span>
                          ))}
                          {(!data?.skills || !data.skills.length) && <span className="text-sm text-muted-foreground">—</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {editing && <p className="mt-2 text-[11px] text-muted-foreground">{t('guards.profile.placeholders.csvHint') || 'Separa con comas.'}</p>}
              </Section>

              {/* Attendance */}
              <Section title={t('guards.profile.cards.attendance') || 'Asistencia reciente'}>
                {loadingShifts ? (
                  <div className="text-sm text-muted-foreground">{t('common.loading') || 'Cargando…'}</div>
                ) : guardShifts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('guards.profile.noAttendance') || 'Sin registros de asistencia.'}</div>
                ) : (
                  <ul className="divide-y">
                    {guardShifts.slice(0, 8).map((s) => {
                      // The guard-shift rows expose `stationName`/`guardName` as
                      // nested OBJECTS ({ stationName }, { fullName }) — rendering
                      // one raw throws React #31. And punch times live on the
                      // dedup `sessions[]` (in/out), not flat punchIn/OutTime.
                      const stationLabel =
                        (s.stationName && typeof s.stationName === 'object'
                          ? s.stationName.stationName || s.stationName.name
                          : s.stationName) ||
                        (s.station && (s.station.stationName || s.station.name)) ||
                        s.shiftSchedule ||
                        '—';
                      const sessions = Array.isArray(s.sessions) ? s.sessions : [];
                      const lastSession = sessions.length ? sessions[sessions.length - 1] : null;
                      const punchIn = lastSession?.in || s.punchInTime || null;
                      const punchOut = lastSession?.out || s.punchOutTime || null;
                      return (
                        <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{stationLabel}</div>
                            <div className="text-xs text-muted-foreground">
                              {punchIn ? new Date(punchIn).toLocaleString('es', { timeZone: getTenantTimezone() }) : '—'}
                              {' → '}
                              {punchOut ? new Date(punchOut).toLocaleString('es', { timeZone: getTenantTimezone() }) : <span className="text-green-600 font-medium">En curso</span>}
                            </div>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${punchOut ? 'bg-muted text-foreground/60' : 'bg-green-500/15 text-green-700'}`}>{s.shiftSchedule || 'Turno'}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>
            </div>

            {/* SIDEBAR (1/3) */}
            <div className="space-y-6">
              {/* App access */}
              <Section title={t('guards.profile.cards.appAccess') || 'Acceso a la app'}>
                <div className="space-y-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${accessBadge.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${accessBadge.dot}`} />{accessBadge.txt}
                  </span>
                  {data?.guard?.lastLoginAt && (
                    <div className="text-xs text-muted-foreground">{t('guards.profile.access.lastLogin') || 'Último ingreso'}: <span className="font-medium text-foreground">{new Date(data.guard.lastLoginAt).toLocaleString('es')}</span></div>
                  )}
                  {data?.guard?.email && (
                    <div className="text-xs text-muted-foreground">{t('guards.profile.access.sendTo') || 'Enviar a'}: <span className="font-medium text-foreground">{data.guard.email}</span></div>
                  )}
                  {data?.guard?.email && (
                    <button onClick={handleSendAppAccess} disabled={sendingInvite} className="mt-1 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-medium py-2 px-4 rounded-lg disabled:opacity-60 transition">
                      {sendingInvite ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      )}
                      {isActivated ? (t('guards.profile.access.resendInvite') || 'Reenviar invitación') : (t('guards.profile.access.sendInvite') || 'Enviar acceso')}
                    </button>
                  )}
                </div>
              </Section>

              {/* Device */}
              <Section title={t('guards.profile.cards.deviceInfo') || 'Dispositivo'}>
                <div className="grid grid-cols-2 gap-3">
                  <ReadField label={t('guards.profile.fields.deviceType') || 'Plataforma'} value={data?.deviceInfo?.platform || data?.deviceType} />
                  <ReadField label={t('guards.profile.fields.deviceModel') || 'Modelo'} value={data?.deviceInfo?.model} />
                  <ReadField label={t('guards.profile.fields.osVersion') || 'SO'} value={data?.deviceInfo?.osVersion} />
                  <ReadField label={t('guards.profile.fields.appVersion') || 'App'} value={data?.deviceInfo?.appVersion} />
                </div>
              </Section>

              {/* Licenses */}
              <Section title={t('guards.profile.cards.licenseDetails') || 'Licencias'}>
                {data?.licenses && data.licenses.length > 0 ? (
                  <div className="space-y-3">
                    {data.licenses.map((lic: ProfileLicense, idx: number) => (
                      <div key={idx} className="rounded-lg border p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <ReadField label={t('guards.profile.fields.licenseType') || 'Tipo'} value={lic.type} />
                          <ReadField label={t('guards.profile.fields.licenseNumber') || 'Número'} value={lic.number} />
                          <ReadField label={t('guards.profile.fields.expiryDate') || 'Vence'} value={lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString('es') : null} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('guards.profile.noLicense') || 'Sin licencias registradas.'}</p>
                )}
              </Section>
            </div>
          </div>
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}
