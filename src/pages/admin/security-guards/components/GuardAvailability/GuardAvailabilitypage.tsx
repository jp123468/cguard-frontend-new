import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';
import TimeInput from '@/components/TimeInput';

type Av = { day: string; available: boolean; start: string; end: string };

type Props = {
  guard?: any;
};

// TimeInput extracted to shared component: src/components/TimeInput.tsx

        export default function GuardAvailability({guard}: Props) {
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

  const updateAvailability = (index: number, v: Av) => {
          setAvailability((prev) => {
            const copy = [...prev];
            copy[index] = v;
            return copy;
          });
  };

    const handleSaveAvailability = () => {
      toast.success('Availability saved');
    };


  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.disponibilidad">
        <div>
          <div className="bg-white border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Availability</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="p-2">Day</th>
                    <th className="p-2">Available</th>
                    <th className="p-2">From</th>
                    <th className="p-2">To</th>
                  </tr>
                </thead>
                <tbody>
                  {availability.map((a, i) => (
                    <tr key={a.day} className="border-t">
                      <td className="p-2">{a.day}</td>
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
              <div className="mt-4 flex justify-end">
              <button onClick={handleSaveAvailability} className="px-4 py-2 bg-orange-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}
