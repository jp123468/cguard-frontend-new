import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';

type Props = {
  guard: any;
  onGuardUpdate?: (updatedGuard: any) => void;
};

export default function GuardProfile({ guard, onGuardUpdate }: Props) {
  const { id } = useParams();
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedGuard, setEditedGuard] = useState({ ...guard });
  const [loading, setLoading] = useState(false);

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h4 className="font-semibold mb-4 text-base">{t(title)}</h4>
      {children}
    </div>
  );

  const InfoField = ({ label, value, field }: { label: string; value: string | number | null | undefined; field?: string }) => (
    <div>
      <div className="text-xs text-gray-500 mb-1">{t(label)}</div>
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

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await securityGuardService.update(id, editedGuard);
      toast.success(t('guards.profile.toasts.updated'));
      setIsEditing(false);
      if (onGuardUpdate) {
        onGuardUpdate(editedGuard);
      }
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

  const handleCancel = () => {
    setEditedGuard({ ...guard });
    setIsEditing(false);
  };

  return (

    <AppLayout>
      <GuardsLayout navKey="keep-safe" title={t('guards.nav.perfil')}>


        <div className="space-y-6 relative">
          {/* Edit/Save/Cancel Buttons */}
          <div className="fixed bottom-8 right-8 z-50 flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="bg-gray-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
                >
                  {t('guards.profile.actions.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? t('guards.profile.actions.saving') : t('guards.profile.actions.save')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors font-medium"
              >
                {t('guards.profile.actions.edit')}
              </button>
            )}
          </div>

          {/* Profile Image */}
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
              {editedGuard?.profileImage ? (
                <img src={editedGuard.profileImage} alt={editedGuard.fullName} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* General Information */}
              <InfoCard title="guards.profile.cards.general">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="guards.profile.fields.firstName" value={editedGuard?.guard?.firstName} field="firstName" />
                  <InfoField label="guards.profile.fields.lastName" value={editedGuard?.guard?.lastName} field="lastName" />
                  <InfoField label="guards.profile.fields.id1" value={editedGuard?.governmentId} field="governmentId" />
                  <InfoField label="guards.profile.fields.id2" value={editedGuard?.secondaryId} field="secondaryId" />
                  <InfoField label="guards.profile.fields.birthDate" value={editedGuard?.birthDate ? new Date(editedGuard.birthDate).toLocaleDateString('en-US') : null} field="birthDate" />
                  <InfoField label="guards.profile.fields.address" value={editedGuard?.address} field="address" />
                </div>
              </InfoCard>

              {/* Contact Details */}
              <InfoCard title="guards.profile.cards.contact">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="guards.profile.fields.email" value={editedGuard?.guard?.email} field="email" />
                  <InfoField label="guards.profile.fields.mobile" value={editedGuard?.guard?.phoneNumber || editedGuard?.phoneNumber} field="phoneNumber" />
                </div>
              </InfoCard>

              {/* Emergency Contact Details */}
              <InfoCard title="guards.profile.cards.emergency">
                <div className="space-y-4">
                  <InfoField label="guards.profile.fields.emergencyContact" value={editedGuard?.emergencyContactName} field="emergencyContactName" />
                  <InfoField label="guards.profile.fields.emergencyContactNumber" value={editedGuard?.emergencyContactPhone} field="emergencyContactPhone" />
                  <InfoField label="guards.profile.fields.emergencyRelation" value={editedGuard?.emergencyContactRelation} field="emergencyContactRelation" />
                </div>
              </InfoCard>
              {/* Personal Information */}
              <InfoCard title="guards.profile.cards.personal">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="guards.profile.fields.birthPlace" value={editedGuard?.birthPlace} field="birthPlace" />
                  <InfoField label="guards.profile.fields.maritalStatus" value={editedGuard?.maritalStatus} field="maritalStatus" />
                  <InfoField label="guards.profile.fields.bloodType" value={editedGuard?.bloodType} field="bloodType" />
                  <InfoField label="guards.profile.fields.education" value={editedGuard?.academicInstruction} field="academicInstruction" />
                  <InfoField label="guards.profile.fields.gender" value={editedGuard?.gender} field="gender" />
                  <InfoField label="guards.profile.fields.governmentId" value={editedGuard?.governmentId} field="governmentId" />
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
              {/* Device Information */}
              <InfoCard title="guards.profile.cards.deviceInfo">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="guards.profile.fields.deviceType" value={editedGuard?.deviceInfo?.platform || editedGuard?.deviceType} />
                  <InfoField label="guards.profile.fields.deviceModel" value={editedGuard?.deviceInfo?.model} />
                  <InfoField label="guards.profile.fields.osVersion" value={editedGuard?.deviceInfo?.osVersion} />
                  <InfoField label="guards.profile.fields.appVersion" value={editedGuard?.deviceInfo?.appVersion} />
                </div>
              </InfoCard>

              {/* Device Permissions */}
              <InfoCard title="guards.profile.cards.devicePermissions">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField
                    label="guards.profile.fields.pushNotifications"
                    value={editedGuard?.permissions?.pushNotifications ? t('guards.profile.values.enabled') : t('guards.profile.values.disabled')}
                  />
                  <InfoField
                    label="guards.profile.fields.gpsPermission"
                    value={editedGuard?.permissions?.gpsPermission || t('guards.profile.values.background')}
                  />
                  <InfoField
                    label="guards.profile.fields.camera"
                    value={editedGuard?.permissions?.camera ? t('guards.profile.values.enabled') : t('guards.profile.values.disabled')}
                  />
                  <InfoField
                    label="guards.profile.fields.microphone"
                    value={editedGuard?.permissions?.microphone ? t('guards.profile.values.enabled') : t('guards.profile.values.disabled')}
                  />
                </div>
              </InfoCard>

              {/* Languages & Skills */}
              <InfoCard title="guards.profile.cards.languagesSkills">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{t('guards.profile.fields.languages')}</div>
                    {isEditing ? (
                      <Input
                        value={editedGuard?.languages?.join(', ') || ''}
                        onChange={(e) => setEditedGuard({ ...editedGuard, languages: e.target.value.split(',').map(l => l.trim()) })}
                        placeholder={t('guards.profile.placeholders.languages')}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <div className="font-medium text-sm">{editedGuard?.languages?.join(', ') || '--'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{t('guards.profile.fields.skills')}</div>
                    {isEditing ? (
                      <Input
                        value={editedGuard?.skills?.join(', ') || ''}
                        onChange={(e) => setEditedGuard({ ...editedGuard, skills: e.target.value.split(',').map(s => s.trim()) })}
                        placeholder={t('guards.profile.placeholders.skills')}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <div className="font-medium text-sm">{editedGuard?.skills?.join(', ') || '--'}</div>
                    )}
                  </div>
                </div>
              </InfoCard>

              {/* Detalles de la Licencia */}
              <InfoCard title="guards.profile.cards.licenseDetails">
                {editedGuard?.licenses && editedGuard.licenses.length > 0 ? (
                  <div className="space-y-3">
                    {editedGuard.licenses.map((license: any, idx: number) => (
                      <div key={idx} className="border-b last:border-b-0 pb-3 last:pb-0">
                        <div className="grid grid-cols-2 gap-3">
                          <InfoField label="guards.profile.fields.licenseType" value={license.type} />
                          <InfoField label="guards.profile.fields.licenseNumber" value={license.number} />
                          <InfoField label="guards.profile.fields.issueDate" value={license.issueDate ? new Date(license.issueDate).toLocaleDateString('en-US') : null} />
                          <InfoField label="guards.profile.fields.expiryDate" value={license.expiryDate ? new Date(license.expiryDate).toLocaleDateString('en-US') : null} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{t('guards.profile.noLicense')}</p>
                )}
              </InfoCard>
            </div>
          </div>
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}
