import React, { useEffect, useState } from 'react';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { Plus, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Stations({ site }: { site?: any }) {
  const { t } = useTranslation();
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedStationDetail, setSelectedStationDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // form state for create
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [stationSchedule, setStationSchedule] = useState('');
  const [numberOfGuardsInStation, setNumberOfGuardsInStation] = useState('1');
  const [startingTimeInDay, setStartingTimeInDay] = useState('');
  const [finishTimeInDay, setFinishTimeInDay] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        const postSiteId = site?.id || '';
        if (!postSiteId) return;
        setLoading(true);
        const res = await ApiService.get(`/tenant/${tenantId}/station?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);
        const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
        if (mounted) setStations(rows);
      } catch (err) {
        console.error('Failed to load stations', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [site]);

  useEffect(() => {
    if (!selectedStationId) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingDetail(true);
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        const res = await ApiService.get(`/tenant/${tenantId}/station/${encodeURIComponent(selectedStationId)}`);
        const detail = (res && (res.data || res)) || res;
        if (mounted) setSelectedStationDetail(detail);
      } catch (err) {
        // fallback: try to find in list
        const found = stations.find(s => (s.id === selectedStationId) || (s.stationId === selectedStationId));
        if (mounted) setSelectedStationDetail(found || null);
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedStationId, site, stations]);

  const createStation = async () => {
    try {
      const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
      const postSiteId = site?.id || '';
      if (!newName || !postSiteId) {
        toast.error(t('postSites.stations.provideName', 'Provide a name'));
        return;
      }
      if (!stationSchedule) {
        toast.error(t('postSites.stations.provideSchedule', 'Select a schedule'));
        return;
      }
      const latitud = site?.latitud || site?.latitude || '';
      const longitud = site?.longitud || site?.longitude || '';
      const payload = {
        stationName: newName,
        postSiteId,
        latitud,
        longitud,
        stationSchedule,
        numberOfGuardsInStation,
        startingTimeInDay,
        finishTimeInDay,
        description: newDescription,
      } as any;
      const res = await ApiService.post(`/tenant/${tenantId}/station`, { data: payload });
      const created = (res && (res.data || res)) || res;
      setStations(s => [created, ...s]);
      setNewName(''); setNewDescription(''); setStationSchedule(''); setNumberOfGuardsInStation('1'); setStartingTimeInDay(''); setFinishTimeInDay('');
      setShowNew(false);
      toast.success(t('postSites.stations.created', 'Station created'));
    } catch (err: any) {
      console.error('Failed creating station', err);
      toast.error(err?.message || t('postSites.stations.createFailed', 'Failed creating station'));
    }
  };

  const removeStation = async (id: string) => {
    try {
      const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
      await ApiService.delete(`/tenant/${tenantId}/station/${id}`);
      setStations(s => s.filter(x => x.id !== id));
      toast.success(t('postSites.stations.removed', 'Station removed'));
    } catch (err: any) {
      console.error('Failed remove station', err);
      toast.error(err?.message || t('postSites.stations.removeFailed', 'Failed to remove station'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('postSites.stations.title', 'Stations')}</h3>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <select className="border rounded px-3 py-1 text-sm text-gray-700">
              <option>{t('postSites.stations.action', 'Action')}</option>
              <option>{t('postSites.stations.deleteSelected', 'Delete selected')}</option>
            </select>
          </div>

          <div className="flex-1 mx-4">
            <input value={''} onChange={() => {}} placeholder={t('postSites.stations.searchPlaceholder', 'Search stations...')} className="w-full border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <button onClick={() => setShowNew(true)} className="px-6 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors">
              <Plus size={18} /> {t('postSites.stations.add', 'Add Station')}
            </button>
          </div>
        </div>

        <div className="w-full">
          {loading ? (
            <div>{t('postSites.stations.loading', 'Loading...')}</div>
          ) : stations.length === 0 ? (
            <div className="text-sm text-gray-500">{t('postSites.stations.noStations', 'No stations added yet.')}</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('postSites.stations.table.name', 'Name')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('postSites.stations.table.guards', 'Guards')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.map((st) => {
                      const id = st.id || st.stationId || '';
                      const name = st.name || st.stationName || st.station_name || '—';
                      const guardsCount = st.numberOfGuardsInStation || (Array.isArray(st.assignedGuards) ? String(st.assignedGuards.length) : '-');
                      return (
                        <tr key={id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">{name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{guardsCount}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <div className="inline-flex items-center gap-2">
                              <button onClick={() => { setSelectedStationId(id); setShowDetailModal(true); }} className="text-sm text-gray-700 hover:underline">{t('postSites.stations.view', 'Ver detalles')}</button>
                              <button onClick={() => removeStation(id)} className="text-red-600 hover:text-red-800 text-sm inline-flex items-center gap-2"><Trash size={14} /><span className="hidden sm:inline">{t('postSites.stations.remove', 'Remove')}</span></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden">
                <div className="space-y-3">
                  {stations.map((st) => {
                    const id = st.id || st.stationId || '';
                    const name = st.name || st.stationName || st.station_name || '—';
                    const guardsCount = st.numberOfGuardsInStation || (Array.isArray(st.assignedGuards) ? String(st.assignedGuards.length) : '-');
                    return (
                      <div key={id} className="border rounded-md p-3 bg-white shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-800">{name}</div>
                            <div className="text-sm text-gray-500 mt-1"><strong className="text-gray-600">{t('postSites.stations.table.guards', 'Guards')}:</strong> {guardsCount}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button onClick={() => { setSelectedStationId(id); setShowDetailModal(true); }} className="px-3 py-1 bg-orange-600 text-white rounded text-sm">{t('postSites.stations.view', 'Ver detalles')}</button>
                            <button onClick={() => removeStation(id)} className="text-red-600 text-sm">{t('postSites.stations.remove', 'Remove')}</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showNew && (
        <div className="fixed inset-0 z-60 flex items-center justify-center" onClick={() => setShowNew(false)}>
          <div className="absolute inset-0 bg-black/20 z-50" onClick={() => setShowNew(false)} />

          <div className="relative z-70 w-full sm:w-96 bg-white shadow-2xl overflow-y-auto rounded-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b bg-white rounded-t-md">
              <h2 className="text-lg font-semibold text-gray-800">{t('postSites.stations.createTitle', 'Create Station')}</h2>
              <button onClick={() => setShowNew(false)} className="p-2 rounded-full hover:bg-gray-100">✕</button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSites.stations.form.name', 'Name *')}</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('postSites.stations.placeholderName', 'Station name')} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSites.stations.form.schedule', 'Schedule *')}</label>
                <select value={stationSchedule} onChange={e => setStationSchedule(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">{t('postSites.stations.form.selectSchedule', 'Select schedule')}</option>
                  <option value="1 hora">1 hora</option>
                  <option value="4 horas">4 horas</option>
                  <option value="8 horas">8 horas</option>
                  <option value="12 horas">12 horas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSites.stations.form.guards', 'Guards')}</label>
                  <select value={numberOfGuardsInStation} onChange={e => setNumberOfGuardsInStation(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSites.stations.form.startTime', 'Start')}</label>
                  <input type="time" value={startingTimeInDay} onChange={e => setStartingTimeInDay(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSites.stations.form.description', 'Description')}</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder={t('postSites.stations.form.descriptionPlaceholder', 'Optional description')} className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 resize-none" rows={4} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-white rounded-b-md">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-md border text-sm">{t('actions.cancel') || 'Cancel'}</button>
              <button onClick={createStation} disabled={!newName} className={`px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700 text-sm ${!newName ? 'opacity-50 cursor-not-allowed' : ''}`}>{t('actions.save', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center" onClick={() => setShowDetailModal(false)}>
          <div className="absolute inset-0 bg-black/20 z-50" onClick={() => setShowDetailModal(false)} />

          <div className="relative z-70 w-full sm:w-96 bg-white shadow-2xl overflow-y-auto rounded-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b bg-white rounded-t-md">
              <h2 className="text-lg font-semibold text-gray-800">{t('postSites.stations.detailsTitle', 'Station details')}</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-full hover:bg-gray-100">✕</button>
            </div>

            <div className="p-6">
              {loadingDetail ? (
                <div>{t('postSites.stations.loading', 'Loading...')}</div>
              ) : !selectedStationDetail ? (
                <div className="text-sm text-gray-500">{t('postSites.stations.noDetails', 'No details available')}</div>
              ) : (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{selectedStationDetail.name || selectedStationDetail.stationName || selectedStationDetail.station_name}</h3>
                  {selectedStationDetail.description ? <p className="text-sm text-gray-500 mt-2">{selectedStationDetail.description || selectedStationDetail.notes}</p> : null}

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                      <dt className="text-xs font-medium text-gray-600">{t('postSites.stations.lat', 'Latitude')}</dt>
                      <dd className="text-base text-gray-800 mt-1">{selectedStationDetail.latitud || selectedStationDetail.latitude || '-'}</dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium text-gray-600">{t('postSites.stations.lng', 'Longitude')}</dt>
                      <dd className="text-base text-gray-800 mt-1">{selectedStationDetail.longitud || selectedStationDetail.longitude || '-'}</dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium text-gray-600">{t('postSites.stations.schedule', 'Schedule')}</dt>
                      <dd className="text-base text-gray-800 mt-1">{selectedStationDetail.stationSchedule || '-'}</dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium text-gray-600">{t('postSites.stations.guardsCount', 'Guards')}</dt>
                      <dd className="text-base text-gray-800 mt-1">{selectedStationDetail.numberOfGuardsInStation || (selectedStationDetail.assignedGuards ? selectedStationDetail.assignedGuards.length : '-')}</dd>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-white rounded-b-md">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 rounded-md border text-sm">{t('actions.close') || 'Close'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

