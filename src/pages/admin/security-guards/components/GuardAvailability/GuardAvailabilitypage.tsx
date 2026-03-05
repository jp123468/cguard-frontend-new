import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';
import TimeInput from '@/components/TimeInput';
import MobileCardList from '@/components/responsive/MobileCardList';

type Av = { day: string; available: boolean; start: string; end: string };

type Props = {
  guard?: any;
};

// TimeInput extracted to shared component: src/components/TimeInput.tsx

          export default function GuardAvailability({guard}: Props) {
        const { t } = useTranslation();
  const [availability, setAvailability] = useState<Av[]>(() => {
    const base = [
        {day: 'Monday', available: true, start: '00:00', end: '23:59' },
        {day: 'Tuesday', available: true, start: '00:00', end: '23:59' },
        {day: 'Wednesday', available: true, start: '00:00', end: '23:59' },
        {day: 'Thursday', available: true, start: '00:00', end: '23:59' },
        {day: 'Friday', available: true, start: '00:00', end: '23:59' },
        {day: 'Saturday', available: true, start: '00:00', end: '23:59' },
        {day: 'Sunday', available: true, start: '00:00', end: '23:59' },
        ];
        if (!guard) return base;
    return base.map((b) => {
      const gDay = (guard.availability || []).find((x: any) => x.day === b.day);
        if (!gDay) return b;
        return {day: b.day, available: !!gDay.available, start: gDay.start ?? b.start, end: gDay.end ?? b.end };
    });
  });

  useEffect(() => {
    // Recompute availability whenever the guard prop changes
    const base = [
      {day: 'Monday', available: true, start: '00:00', end: '23:59' },
      {day: 'Tuesday', available: true, start: '00:00', end: '23:59' },
      {day: 'Wednesday', available: true, start: '00:00', end: '23:59' },
      {day: 'Thursday', available: true, start: '00:00', end: '23:59' },
      {day: 'Friday', available: true, start: '00:00', end: '23:59' },
      {day: 'Saturday', available: true, start: '00:00', end: '23:59' },
      {day: 'Sunday', available: true, start: '00:00', end: '23:59' },
    ];
    if (!guard) {
      setAvailability(base);
      return;
    }
    setAvailability(base.map((b) => {
      const gDay = (guard.availability || []).find((x: any) => x.day === b.day);
      if (!gDay) return b;
      return {day: b.day, available: !!gDay.available, start: gDay.start ?? b.start, end: gDay.end ?? b.end };
    }));
  }, [guard]);

  const updateAvailability = (index: number, v: Av) => {
          setAvailability((prev) => {
            const copy = [...prev];
            copy[index] = v;
            return copy;
          });
  };

    const handleSaveAvailability = () => {
      toast.success(t('guards.availability.toasts.saved'));
    };


  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.disponibilidad">
        <div>
          <div className="bg-white border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">{t('guards.availability.title', { defaultValue: 'Availability' })}</h3>
            <div>
              <div className="md:block hidden overflow-x-auto">
                <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="p-2">{t('guards.availability.table.day', { defaultValue: 'Day' })}</th>
                    <th className="p-2">{t('guards.availability.table.available', { defaultValue: 'Available' })}</th>
                    <th className="p-2">{t('guards.availability.table.from', { defaultValue: 'From' })}</th>
                    <th className="p-2">{t('guards.availability.table.to', { defaultValue: 'To' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {availability.map((a, i) => (
                    <tr key={a.day} className="border-t">
                      <td className="p-2">{t(`guards.availability.days.${a.day}`, { defaultValue: a.day })}</td>
                      <td className="p-2">
                        <input className="ml-6" type="checkbox" checked={a.available} onChange={(e) => updateAvailability(i, { ...a, available: e.target.checked })} />
                      </td>
                      <td className="p-2">
                        <div className={`${!a.available ? 'opacity-60' : ''}`}>
                          <TimeInput disabled={!a.available} value={a.start} onChange={(val) => updateAvailability(i, { ...a, start: val })} />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className={`${!a.available ? 'opacity-60' : ''}`}>
                          <TimeInput disabled={!a.available} value={a.end} onChange={(val) => updateAvailability(i, { ...a, end: val })} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              <div className="md:hidden">
                <MobileCardList
                  items={availability || []}
                  loading={false}
                  emptyMessage={t('guards.availability.empty', { defaultValue: 'No availability' }) as string}
                  renderCard={(a: any) => (
                    <div className="p-4 bg-white border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{t(`guards.availability.days.${a.day}`, { defaultValue: a.day })}</div>
                        <div className="text-xs text-gray-500">{a.available ? `${a.start} — ${a.end}` : t('guards.availability.notAvailable', { defaultValue: 'Not available' })}</div>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
              <div className="mt-4 flex justify-end">
              <button onClick={handleSaveAvailability} className="px-4 py-2 bg-orange-600 text-white rounded">{t('guards.availability.save', { defaultValue: 'Save' })}</button>
            </div>
          </div>
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}
