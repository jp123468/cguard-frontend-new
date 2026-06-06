import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getTenantTimezone } from '@/utils/tenantLocation';
import securityGuardService from '@/lib/api/securityGuardService';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';

type Props = {
  guard: any;
  onGuardUpdate?: (updatedGuard: any) => void;
};

// Pencil icon for card edit trigger
const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15.232 5.232l3.536 3.536M9 13l6.536-6.536a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
  </svg>
);

// Card with optional per-card edit controls in header
const InfoCard = ({
  title,
  children,
  t,
  cardId,
  editingCard,
  saving,
  onEdit,
  onSave,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  t: any;
  cardId?: string;
  editingCard?: string | null;
  saving?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
}) => {
  const isThisEditing = cardId != null && editingCard === cardId;
  return (
    <div className="bg-card border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-base">{t(title)}</h4>
        {cardId && !isThisEditing && (
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-[#C8860A] transition-colors p-1 rounded"
            title={t('guards.profile.actions.edit')}
          >
            <PencilIcon />
          </button>
        )}
        {isThisEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 border rounded transition-colors disabled:opacity-50"
            >
              {t('guards.profile.actions.cancel')}
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="text-xs bg-[#C8860A] text-white px-3 py-1 rounded hover:bg-[#B37809] transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {saving && <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? t('guards.profile.actions.saving') : t('guards.profile.actions.save')}
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

const InfoField = ({
  label,
  value,
  field,
  isEditing,
  editedGuard,
  setEditedGuard,
  t,
}: {
  label: string;
  value: string | number | null | undefined;
  field?: string;
  isEditing: boolean;
  editedGuard: any;
  setEditedGuard: (guard: any) => void;
  t: any;
}) => (
  <div>
    <div className="text-xs text-muted-foreground mb-1">{t(label)}</div>
    {isEditing && field ? (
      <Input
        value={editedGuard?.[field] || ''}
        onChange={(e) => setEditedGuard({ ...editedGuard, [field]: e.target.value })}
        className="h-8 text-sm"
      />
    ) : (
      <div className="font-medium text-sm">{value || '--'}</div>
    )}
  </div>
);

export default function GuardProfile({ guard, onGuardUpdate }: Props) {
  const { id } = useParams();
  const { t } = useTranslation()
  // Which card is currently being edited (null = view mode)
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editedGuard, setEditedGuard] = useState({ ...guard });
  // Track last successfully saved state so cancel reverts correctly
  const savedGuardRef = useRef({ ...guard });
  const [loading, setLoading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  const handleCardEdit = (cardId: string) => setEditingCard(cardId);

  const handleCardCancel = () => {
    setEditedGuard({ ...savedGuardRef.current });
    setEditingCard(null);
  };

  const handleCardSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await securityGuardService.update(id, editedGuard);
      savedGuardRef.current = { ...editedGuard };
      toast.success(t('guards.profile.toasts.updated'));
      setEditingCard(null);
      if (onGuardUpdate) onGuardUpdate(editedGuard);
    } catch (error) {
      console.error('Error actualizando guardia:', error);
      toast.error(t('guards.profile.toasts.updateError'));
    } finally {
      setSaving(false);
    }
  };

  // Fetch full guard details when component mounts or id changes
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await securityGuardService.get(id);
        if (!mounted) return;
        // Some endpoints return { rows, count } for lists; single-get should return object
        const payload = data && data.id ? data : (data && data.data) ? data.data : data;
        setEditedGuard((prev: any) => ({ ...prev, ...payload }));
        savedGuardRef.current = { ...savedGuardRef.current, ...payload };
        if (onGuardUpdate) onGuardUpdate(payload);
      } catch (err) {
        console.error('Error cargando guardia:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  // GuardShift (attendance) state
  const [guardShifts, setGuardShifts] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);
  const [createPunchIn, setCreatePunchIn] = useState<string>('');
  const [createPunchOut, setCreatePunchOut] = useState<string>('');
  const [createSchedule, setCreateSchedule] = useState<string>('Diurno');

  const loadGuardShifts = async () => {
    if (!id) return;
    setLoadingShifts(true);
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      const resp = await ApiService.get(`/tenant/${tenantId}/guard-shift?filter[guardName]=${encodeURIComponent(id)}&limit=50`);
      const rows = Array.isArray(resp) ? resp : (resp && resp.rows) ? resp.rows : [];
      setGuardShifts(rows);
    } catch (err) {
      console.error('Failed loading guard shifts', err);
    } finally {
      setLoadingShifts(false);
    }
  };

  useEffect(() => {
    loadGuardShifts();
  }, [id]);

  const handlePunchInNow = async () => {
    if (!id) return;
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      const payload = { punchInTime: new Date().toISOString(), guardName: id };
      await ApiService.post(`/tenant/${tenantId}/guard-shift`, { data: payload });
      toast.success('Punch in recorded');
      await loadGuardShifts();
    } catch (err: any) {
      console.error('Punch in failed', err);
      toast.error(err?.message || 'Failed to punch in');
    }
  };

  const handlePunchOutLast = async () => {
    if (!id) return;
    try {
      // find last open shift (no punchOutTime)
      const open = guardShifts.find(g => !g.punchOutTime);
      if (!open) {
        toast.info('No open punch found');
        return;
      }
      const tenantId = localStorage.getItem('tenantId') || '';
      const now = new Date().toISOString();
      await ApiService.patch(`/tenant/${tenantId}/guard-shift/${open.id}`, { data: { punchOutTime: now } });
      toast.success('Punch out recorded');
      await loadGuardShifts();
    } catch (err: any) {
      console.error('Punch out failed', err);
      toast.error(err?.message || 'Failed to punch out');
    }
  };

  const handleCreateManual = async () => {
    if (!id) return;
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      const payload: any = { guardName: id, shiftSchedule: createSchedule };
      if (createPunchIn) payload.punchInTime = new Date(createPunchIn).toISOString();
      if (createPunchOut) payload.punchOutTime = new Date(createPunchOut).toISOString();
      await ApiService.post(`/tenant/${tenantId}/guard-shift`, { data: payload });
      toast.success('Attendance record created');
      setShowCreateShiftModal(false);
      setCreatePunchIn(''); setCreatePunchOut(''); setCreateSchedule('Diurno');
      await loadGuardShifts();
    } catch (err: any) {
      console.error('Create guard shift failed', err);
      toast.error(err?.message || 'Failed creating record');
    }
  };

  const handleSendAppAccess = async () => {
    if (!id) return;
    setSendingInvite(true);
    try {
      const payload: any = {};
      if (editedGuard?.guard?.id) {
        payload.guard = editedGuard.guard.id;
      } else if (editedGuard?.guard?.email) {
        payload.contact = editedGuard.guard.email;
      }
      payload.securityGuardId = id;
      if (editedGuard?.guard?.firstName) payload.firstName = editedGuard.guard.firstName;
      if (editedGuard?.guard?.lastName) payload.lastName = editedGuard.guard.lastName;
      await securityGuardService.resendInvite(payload);
      toast.success(t('guards.profile.access.inviteSent'));
      // Reload guard to update access status
      const refreshed = await securityGuardService.get(id);
      const data = refreshed && (refreshed as any).id ? refreshed : (refreshed && (refreshed as any).data) ? (refreshed as any).data : refreshed;
      setEditedGuard((prev: any) => ({ ...prev, ...data }));
      if (onGuardUpdate) onGuardUpdate(data);
    } catch (err: any) {
      console.error('Send app access failed', err);
      toast.error(err?.message || t('guards.profile.access.inviteError'));
    } finally {
      setSendingInvite(false);
    }
  };

  return (

    <AppLayout>
      <GuardsLayout navKey="keep-safe" title={t('guards.nav.perfil')}>


        <div className="space-y-6 relative">

          {/* Profile Image */}
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
              {(() => {
                const pi = editedGuard?.profileImage;
                const src = Array.isArray(pi)
                  ? (pi[0]?.downloadUrl || pi[0]?.publicUrl || null)
                  : (pi?.downloadUrl || pi?.publicUrl || (typeof pi === 'string' && pi ? pi : null));
                return src ? (
                  <img src={src} alt={editedGuard?.fullName || ''} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <svg className="w-24 h-24 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* General Information */}
              <InfoCard title="guards.profile.cards.general" t={t} cardId="general" editingCard={editingCard} saving={saving} onEdit={() => handleCardEdit('general')} onSave={handleCardSave} onCancel={handleCardCancel}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="guards.profile.fields.firstName" value={editedGuard?.guard?.firstName} field="firstName" isEditing={editingCard === 'general'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.lastName" value={editedGuard?.guard?.lastName} field="lastName" isEditing={editingCard === 'general'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  {(editedGuard?.guard?.middleName) && (
                    <InfoField label="guards.profile.fields.middleName" value={editedGuard?.guard?.middleName} field="middleName" isEditing={editingCard === 'general'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  )}
                  <InfoField label="guards.profile.fields.id1" value={editedGuard?.governmentId} field="governmentId" isEditing={editingCard === 'general'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.id2" value={editedGuard?.secondaryId} field="secondaryId" isEditing={editingCard === 'general'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.birthDate" value={editedGuard?.birthDate ? new Date(editedGuard.birthDate).toLocaleDateString('en-US') : null} field="birthDate" isEditing={editingCard === 'general'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.address" value={editedGuard?.address || editedGuard?.guard?.homeAddress} field="address" isEditing={editingCard === 'general'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                </div>
              </InfoCard>

              {/* Contact Details */}
              <InfoCard title="guards.profile.cards.contact" t={t} cardId="contact" editingCard={editingCard} saving={saving} onEdit={() => handleCardEdit('contact')} onSave={handleCardSave} onCancel={handleCardCancel}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="guards.profile.fields.email" value={editedGuard?.guard?.email} field="email" isEditing={editingCard === 'contact'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.mobile" value={editedGuard?.guard?.phoneNumber || editedGuard?.guard?.phone || editedGuard?.phoneNumber} field="phoneNumber" isEditing={editingCard === 'contact'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                </div>
              </InfoCard>

              {/* Emergency Contact Details */}
              <InfoCard title="guards.profile.cards.emergency" t={t} cardId="emergency" editingCard={editingCard} saving={saving} onEdit={() => handleCardEdit('emergency')} onSave={handleCardSave} onCancel={handleCardCancel}>
                <div className="space-y-4">
                  <InfoField label="guards.profile.fields.emergencyContact" value={editedGuard?.emergencyContactName} field="emergencyContactName" isEditing={editingCard === 'emergency'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.emergencyContactNumber" value={editedGuard?.emergencyContactPhone} field="emergencyContactPhone" isEditing={editingCard === 'emergency'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.emergencyRelation" value={editedGuard?.emergencyContactRelation} field="emergencyContactRelation" isEditing={editingCard === 'emergency'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                </div>
              </InfoCard>
              {/* Personal Information */}
              <InfoCard title="guards.profile.cards.personal" t={t} cardId="personal" editingCard={editingCard} saving={saving} onEdit={() => handleCardEdit('personal')} onSave={handleCardSave} onCancel={handleCardCancel}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="guards.profile.fields.birthPlace" value={editedGuard?.birthPlace} field="birthPlace" isEditing={editingCard === 'personal'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.maritalStatus" value={editedGuard?.maritalStatus} field="maritalStatus" isEditing={editingCard === 'personal'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.bloodType" value={editedGuard?.bloodType} field="bloodType" isEditing={editingCard === 'personal'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.education" value={editedGuard?.academicInstruction} field="academicInstruction" isEditing={editingCard === 'personal'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.gender" value={editedGuard?.gender} field="gender" isEditing={editingCard === 'personal'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.guardCredentials" value={editedGuard?.guardCredentials} field="guardCredentials" isEditing={editingCard === 'personal'} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                </div>
              </InfoCard>
              {/* More Information */}
           { /*  <InfoCard title="More Information">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Driver License" value={editedGuard?.driverLicense} field="driverLicense" />
                  <InfoField label="Employee Number" value={editedGuard?.employeeCode || editedGuard?.guardNumber} field="employeeCode" />
                  <InfoField label="Hire Date" value={editedGuard?.hireDate ? new Date(editedGuard.hireDate).toLocaleDateString('en-US') : null} field="hireDate" />
                  <InfoField label="Hiring Contract Date" value={editedGuard?.hiringContractDate ? new Date(editedGuard.hiringContractDate).toLocaleDateString('en-US') : null} field="hiringContractDate" />
                  <InfoField label="Payroll Number" value={editedGuard?.payrollNumber} field="payrollNumber" />
                  <InfoField label="Payment Type" value={editedGuard?.paymentType || 'Hourly'} field="paymentType" />
                  <InfoField label="Hourly Rate" value={editedGuard?.hourlyRate} field="hourlyRate" />
                  <InfoField label="deed" value={editedGuard?.deed} field="deed" />
                </div>
              </InfoCard>*/}



            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Device Information — read-only (set by mobile app) */}
              <InfoCard title="guards.profile.cards.deviceInfo" t={t}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="guards.profile.fields.deviceType" value={editedGuard?.deviceInfo?.platform || editedGuard?.deviceType} isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.deviceModel" value={editedGuard?.deviceInfo?.model} isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.osVersion" value={editedGuard?.deviceInfo?.osVersion} isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                  <InfoField label="guards.profile.fields.appVersion" value={editedGuard?.deviceInfo?.appVersion} isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                </div>
              </InfoCard>

              {/* Device Permissions — read-only (set by mobile app) */}
              <InfoCard title="guards.profile.cards.devicePermissions" t={t}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField
                    label="guards.profile.fields.pushNotifications"
                    value={editedGuard?.permissions?.pushNotifications ? t('guards.profile.values.enabled') : t('guards.profile.values.disabled')}
                    isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t}
                  />
                  <InfoField
                    label="guards.profile.fields.gpsPermission"
                    value={editedGuard?.permissions?.gpsPermission || t('guards.profile.values.background')}
                    isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t}
                  />
                  <InfoField
                    label="guards.profile.fields.camera"
                    value={editedGuard?.permissions?.camera ? t('guards.profile.values.enabled') : t('guards.profile.values.disabled')}
                    isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t}
                  />
                  <InfoField
                    label="guards.profile.fields.microphone"
                    value={editedGuard?.permissions?.microphone ? t('guards.profile.values.enabled') : t('guards.profile.values.disabled')}
                    isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t}
                  />
                </div>
              </InfoCard>

              {/* App Access */}
              {(() => {
                const guardStatus = editedGuard?.guard?.status;
                const hasPassword = editedGuard?.guard?.hasPassword;
                const lastLogin = editedGuard?.guard?.lastLoginAt;
                const tokenExpires = editedGuard?.guard?.invitationTokenExpiresAt;
                const isActivated = hasPassword && guardStatus === 'active';
                const isPending = !hasPassword || guardStatus === 'invited' || guardStatus === 'pending';
                const tokenIsExpired = tokenExpires && new Date(tokenExpires) < new Date();
                return (
                  <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <h4 className="font-semibold mb-4 text-base">{t('guards.profile.cards.appAccess')}</h4>
                    <div className="space-y-3">
                      {/* Status badge */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          isActivated
                            ? 'bg-green-100 text-green-700'
                            : isPending
                              ? (tokenIsExpired ? 'bg-red-500/15 text-red-700' : 'bg-orange-500/15 text-orange-700')
                              : 'bg-muted text-foreground/70'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActivated ? 'bg-green-500' : isPending ? (tokenIsExpired ? 'bg-red-500' : 'bg-orange-500') : 'bg-gray-400'}`} />
                          {isActivated
                            ? t('guards.profile.access.statusActive')
                            : tokenIsExpired
                              ? t('guards.profile.access.statusExpired')
                              : isPending
                                ? t('guards.profile.access.statusPending')
                                : t('guards.profile.access.statusNoAccess')}
                        </span>
                      </div>

                      {/* Last login */}
                      {lastLogin && (
                        <div className="text-xs text-muted-foreground">
                          {t('guards.profile.access.lastLogin')}: <span className="font-medium text-foreground">{new Date(lastLogin).toLocaleString()}</span>
                        </div>
                      )}

                      {/* Token expiry */}
                      {tokenExpires && !isActivated && (
                        <div className={`text-xs ${tokenIsExpired ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {tokenIsExpired
                            ? t('guards.profile.access.tokenExpired')
                            : `${t('guards.profile.access.tokenExpires')}: ${new Date(tokenExpires).toLocaleDateString()}`}
                        </div>
                      )}

                      {/* Guard email (for context) */}
                      {editedGuard?.guard?.email && (
                        <div className="text-xs text-muted-foreground">
                          {t('guards.profile.access.sendTo')}: <span className="font-medium text-foreground">{editedGuard.guard.email}</span>
                        </div>
                      )}

                      {/* Send / Resend invitation button */}
                      {editedGuard?.guard?.email && (
                        <button
                          onClick={handleSendAppAccess}
                          disabled={sendingInvite}
                          className="mt-1 w-full flex items-center justify-center gap-2 bg-[#C8860A] hover:bg-[#B37809] disabled:opacity-60 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
                        >
                          {sendingInvite ? (
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                          {isActivated
                            ? t('guards.profile.access.resendInvite')
                            : t('guards.profile.access.sendInvite')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Languages & Skills */}
              <InfoCard title="guards.profile.cards.languagesSkills" t={t} cardId="languages" editingCard={editingCard} saving={saving} onEdit={() => handleCardEdit('languages')} onSave={handleCardSave} onCancel={handleCardCancel}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('guards.profile.fields.languages')}</div>
                    {editingCard === 'languages' ? (
                      <Input
                        value={editedGuard?.languages?.join(', ') || ''}
                        onChange={(e) => setEditedGuard({ ...editedGuard, languages: e.target.value.split(',').map((l: string) => l.trim()) })}
                        placeholder={t('guards.profile.placeholders.languages')}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <div className="font-medium text-sm">{editedGuard?.languages?.join(', ') || '--'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('guards.profile.fields.skills')}</div>
                    {editingCard === 'languages' ? (
                      <Input
                        value={editedGuard?.skills?.join(', ') || ''}
                        onChange={(e) => setEditedGuard({ ...editedGuard, skills: e.target.value.split(',').map((s: string) => s.trim()) })}
                        placeholder={t('guards.profile.placeholders.skills')}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <div className="font-medium text-sm">{editedGuard?.skills?.join(', ') || '--'}</div>
                    )}
                  </div>
                </div>
              </InfoCard>

              {/* Attendance / GuardShift */}
              <InfoCard title="guards.profile.cards.attendance" t={t}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={handlePunchInNow} className="bg-green-600 text-white px-3 py-2 rounded">Punch In (now)</button>
                    <button onClick={handlePunchOutLast} className="bg-red-600 text-white px-3 py-2 rounded">Punch Out (last)</button>
                    <button onClick={() => setShowCreateShiftModal(true)} className="px-3 py-2 rounded border">Create Record</button>
                  </div>

                  <div>
                    {loadingShifts ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : guardShifts.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No attendance records.</div>
                    ) : (
                      <ul className="space-y-2">
                        {guardShifts.map((s) => (
                          <li key={s.id} className="border rounded p-2 bg-card">
                            <div className="text-sm font-medium">{s.shiftSchedule || s.schedule || '-'}</div>
                            <div className="text-xs text-foreground/70">In: {s.punchInTime ? new Date(s.punchInTime).toLocaleString('es', { timeZone: getTenantTimezone() }) : '-'}</div>
                            <div className="text-xs text-foreground/70">Out: {s.punchOutTime ? new Date(s.punchOutTime).toLocaleString('es', { timeZone: getTenantTimezone() }) : '-'}</div>
                            <div className="text-xs text-muted-foreground">Station: {s.stationName || (s.station && s.station.name) || '-'}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </InfoCard>

              {/* Detalles de la Licencia */}
              <InfoCard title="guards.profile.cards.licenseDetails" t={t}>
                {editedGuard?.licenses && editedGuard.licenses.length > 0 ? (
                  <div className="space-y-3">
                    {editedGuard.licenses.map((license: any, idx: number) => (
                      <div key={idx} className="border-b last:border-b-0 pb-3 last:pb-0">
                        <div className="grid grid-cols-2 gap-3">
                          <InfoField label="guards.profile.fields.licenseType" value={license.type} isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                          <InfoField label="guards.profile.fields.licenseNumber" value={license.number} isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                          <InfoField label="guards.profile.fields.issueDate" value={license.issueDate ? new Date(license.issueDate).toLocaleDateString('en-US') : null} isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                          <InfoField label="guards.profile.fields.expiryDate" value={license.expiryDate ? new Date(license.expiryDate).toLocaleDateString('en-US') : null} isEditing={false} editedGuard={editedGuard} setEditedGuard={setEditedGuard} t={t} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('guards.profile.noLicense')}</p>
                )}
              </InfoCard>
            </div>
          </div>
        </div>
        {showCreateShiftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateShiftModal(false)} />
            <aside className="relative mx-auto w-full max-w-md bg-card shadow-xl overflow-auto rounded-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Create Attendance Record</h3>
                <button onClick={() => setShowCreateShiftModal(false)} className="p-2 text-muted-foreground hover:text-foreground">Close</button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm text-foreground/70 mb-1">Punch In</label>
                  <input type="datetime-local" value={createPunchIn} onChange={e => setCreatePunchIn(e.target.value)} className="w-full border rounded h-10 px-3" />
                </div>
                <div>
                  <label className="block text-sm text-foreground/70 mb-1">Punch Out</label>
                  <input type="datetime-local" value={createPunchOut} onChange={e => setCreatePunchOut(e.target.value)} className="w-full border rounded h-10 px-3" />
                </div>
                <div>
                  <label className="block text-sm text-foreground/70 mb-1">Shift Schedule</label>
                  <select value={createSchedule} onChange={e => setCreateSchedule(e.target.value)} className="w-full border rounded h-10 px-3">
                    <option value="Diurno">Diurno</option>
                    <option value="Nocturno">Nocturno</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowCreateShiftModal(false)} className="px-3 py-2 rounded border">Cancel</button>
                  <button onClick={handleCreateManual} className="px-3 py-2 rounded bg-[#C8860A] text-white">Create</button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </GuardsLayout>
    </AppLayout>
  );
}
