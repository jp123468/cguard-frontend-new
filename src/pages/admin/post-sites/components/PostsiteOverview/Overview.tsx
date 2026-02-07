import React from 'react';
import { useTranslation } from "react-i18next";
import IncidentMap from "@/components/IncidentMap/IncidentMap";
import { useState } from 'react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";

export default function PostSiteOverview({ site }: { site?: any }) {
  const { t } = useTranslation();
  const [openFilter, setOpenFilter] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const typeKeys = [
    'callOffRequest','checkList','checkedIn','checkedOut','clockedIn','clockedOut',
    'companyPolicy','dispatch','exchangeShift','geoFence','guardAvailability','guardIdle',
    'guardDeviceFall','incidentReport','lowBattery','openShiftConfirmation','panicAlert',
    'parkingManager','passdownReport','postOrder','shiftConfirmation','siteTour','standardReport',
    'taskReport','timeOff','vehiclePatrol','watchModeReport'
  ];

  const toggleType = (key: string) => {
    setSelectedTypes((s) =>
      s.includes(key) ? s.filter((x) => x !== key) : [...s, key]
    );
  };
  const stats = [
    { id: 'assigned', label: t('postSites.overview.Stats.guardsAssigned'), value: 0, color: 'text-blue-600' },
    { id: 'onsite', label: t('postSites.overview.Stats.guardOnSite'), value: 0, color: 'text-orange-500' },
    { id: 'tours', label: t('postSites.overview.Stats.toursCompleted'), value: 0, color: 'text-gray-600' },
    { id: 'tasks', label: t('postSites.overview.Stats.tasksCompleted'), value: 0, color: 'text-blue-600' },
    { id: 'incidents', label: t('postSites.overview.Stats.incidentsReported'), value: 0, color: 'text-orange-500' },
    { id: 'hrs', label: t('postSites.overview.Stats.hoursLogged'), value: '00:00', color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-md p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">{t('postSites.overview.Stats.title')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.id} className="p-6 bg-white rounded-lg border border-gray-100 flex flex-col items-center text-center">
              <div className={`text-sm mb-3 ${s.color}`}>{s.label}</div>
                <div className={`text-3xl font-semibold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-md p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('postSites.overview.Map.title')}</h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">{t('postSites.overview.Map.MapType')}</div>
            <select className="border rounded px-3 py-1 text-sm">
              <option>{t('postSites.overview.Map.Roadmap')}</option>
              <option>{t('postSites.overview.Map.Satellite')}</option>
              <option>{t('postSites.overview.Map.Hybrid')}</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" className="form-checkbox h-5 w-8" />
              <span>{t('postSites.overview.Map.GeoFence')}</span>
            </label>
          </div>
        </div>

        {(() => {
          const lat = site?.latitud ?? site?.latitude ?? site?.lat ?? (site?.location && site.location.lat);
          const lng = site?.longitud ?? site?.longitude ?? site?.lng ?? (site?.location && site.location.lng);
          const address = site?.address || site?.secondAddress || site?.companyAddress || '';

          if (lat && lng) {
            const latNum = Number(lat);
            const lngNum = Number(lng);
            if (!isNaN(latNum) && !isNaN(lngNum)) {
              return (
                <div className="h-72 rounded-md overflow-hidden mb-2">
                  <IncidentMap lat={latNum} lng={lngNum} label={site?.companyName || site?.name || 'Client location'} />
                </div>
              );
            }
          }

          if (address) {
            const search = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            return (
              <div className="h-72 bg-gray-100 rounded-md overflow-hidden mb-2 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div>No coordinates available for this site.</div>
                  <a href={search} target="_blank" rel="noreferrer" className="text-blue-600 underline mt-2 inline-block">Open in Google Maps</a>
                </div>
              </div>
            );
          }

          return (
            <div className="h-72 bg-gray-100 rounded-md overflow-hidden mb-2 flex items-center justify-center text-gray-500">Mapa (no hay datos)</div>
          );
        })()}
      </div>

      <div className="bg-white border rounded-md p-6 shadow-sm">
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium">{t('postSites.overview.LatestActivity')}</h4>
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <button className="text-sm bg-white border rounded px-3 py-1">{t('postSites.overview.Filters', 'Filtros')}</button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[400px] sm:w-[460px] z-[9999]">
                <SheetHeader>
                  <SheetTitle>{t('postSites.overview.Filters', 'Filtros')}</SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                  <div className="text-sm text-gray-600">{t('postSites.overview.FilterHelp', 'Selecciona filtros para la vista.')}</div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">{t('postSites.overview.Filter.fromDate', 'From Date')}</label>
                    <input type="date" className="w-full border rounded px-3 py-2" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">{t('postSites.overview.Filter.toDate', 'To Date')}</label>
                    <input type="date" className="w-full border rounded px-3 py-2" />
                  </div>

                  <div>
                    <label className="text-sm font-medium">{t('postSites.overview.Filter.type', 'Type')}</label>
                    <div className="mt-2 max-h-60 overflow-auto border rounded p-2 bg-white">
                      {typeKeys.map((key) => (
                        <label key={key} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded">
                          <Checkbox checked={selectedTypes.includes(key)} onCheckedChange={() => toggleType(key)} />
                          <span className="text-sm text-gray-700">{t(`postSites.overview.types.${key}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <button onClick={() => setOpenFilter(false)} className="px-4 py-2 bg-orange-600 text-white rounded-md">{t('common.apply', 'Filtrar')}</button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="mt-4 text-sm text-gray-600">{t('postSites.overview.noActivity', 'No activity yet.')}</div>
        </div>
      </div>
    </div>
  );
}
