import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { toast } from 'sonner';

export default function PostSiteSettings({ site }: { site?: any }) {
  const [values, setValues] = useState<Record<string, any>>({
    enforceClockInBeforeCheckIn: true,
    notifyGeofenceEnterExit: false,
    enableCheckInInsideGeofence: false,
    enableCheckOutInsideGeofence: false,
    enforcePostOrderAcknowledgement: false,
    enableAutoCheckoutAfter24hrs: true,
    remindSubmitPassDownBeforeCheckout: false,
    enforceSubmitPassDownBeforeCheckout: false,
    allowViewSecurityTeamDetails: false,
    autoPublishOpenShiftsRequestedByClient: false,
    enforcePassdownAckForPastHours: 24,
  });

  function toggle(key: string) {
    setValues(v => ({ ...v, [key]: !v[key] }));
  }

  function setHours(h: number) {
    setValues(v => ({ ...v, enforcePassdownAckForPastHours: h }));
  }

  function save() {
    // Here you would call the API to persist settings; for now show toast
    console.log('Saving settings', values);
    toast.success('Settings saved');
  }

  return (
    <div className="relative bg-white border rounded-md shadow-sm">
      <div className="p-6 space-y-4 overflow-auto">
        <div className="space-y-4 mt-4">
          <SettingRow checked={values.enforceClockInBeforeCheckIn} onChange={() => toggle('enforceClockInBeforeCheckIn')}>Enforce clock-in before check-in</SettingRow>

          <SettingRow checked={values.notifyGeofenceEnterExit} onChange={() => toggle('notifyGeofenceEnterExit')}>Notify when guard enters or exits the geofence</SettingRow>

          <SettingRow checked={values.enableCheckInInsideGeofence} onChange={() => toggle('enableCheckInInsideGeofence')}>Enable Check-In inside geofence</SettingRow>

          <SettingRow checked={values.enableCheckOutInsideGeofence} onChange={() => toggle('enableCheckOutInsideGeofence')}>Enable Check-Out inside geofence</SettingRow>

          <SettingRow checked={values.enforcePostOrderAcknowledgement} onChange={() => toggle('enforcePostOrderAcknowledgement')}>Enforce post order acknowledgement</SettingRow>

          <SettingRow checked={values.enableAutoCheckoutAfter24hrs} onChange={() => toggle('enableAutoCheckoutAfter24hrs')}>Enable Auto check-out guard after 24hrs</SettingRow>

          <SettingRow checked={values.remindSubmitPassDownBeforeCheckout} onChange={() => toggle('remindSubmitPassDownBeforeCheckout')}>Remind guard to submit atleast one pass-down log before checking out of the post site</SettingRow>

          <SettingRow checked={values.enforceSubmitPassDownBeforeCheckout} onChange={() => toggle('enforceSubmitPassDownBeforeCheckout')}>Enforce guard to submit atleast one pass-down log before checking out of the post site</SettingRow>

          <SettingRow checked={values.allowViewSecurityTeamDetails} onChange={() => toggle('allowViewSecurityTeamDetails')}>Allow guard to view security team details</SettingRow>

          <SettingRow checked={values.autoPublishOpenShiftsRequestedByClient} onChange={() => toggle('autoPublishOpenShiftsRequestedByClient')}>Automatically publish open shifts requested by the client</SettingRow>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={true} readOnly className="w-4 h-4" />
              <span className="text-sm text-gray-700">Enforce pass-down acknowledgement for past</span>
            </label>

            <select value={values.enforcePassdownAckForPastHours} onChange={e => setHours(Number(e.target.value))} className="ml-4 border rounded px-3 h-10">
              <option value={6}>6 Hours</option>
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours</option>
            </select>

            <Info className="ml-2 text-gray-400" size={16} aria-label="Información sobre el enforzamiento" role="img" />
          </div>
        </div>
      </div>

      {/* Fixed footer */}
      <div className="border-t p-4 bg-white sticky bottom-0 z-10 flex justify-end">
        <button onClick={save} className="px-4 py-2 rounded-full bg-blue-600 text-white">Save</button>
      </div>
    </div>
  );
}

function SettingRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 mt-1" />
        <span className="text-sm text-gray-700">{children}</span>
      </label>
      <Info className="ml-2 text-gray-400 mt-1" size={14} aria-label="More info" role="img" />
    </div>
  );
}
