import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Plus, X, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MobileCardList from '@/components/responsive/MobileCardList';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';

export default function PostSiteTours({ site, guards = [] }: { site?: any; guards?: any[] }) {
  const { t } = useTranslation();
  const [actionOpen, setActionOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showNewTourModal, setShowNewTourModal] = useState(false);

  const [tourName, setTourName] = useState('');
  const [tourDesc, setTourDesc] = useState('');
  const [scheduledDays, setScheduledDays] = useState('');
  const [continuous, setContinuous] = useState(false);
  const [timeMode, setTimeMode] = useState('specific');
  const [selectTime, setSelectTime] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [tagType, setTagType] = useState('');
  const [tags, setTags] = useState('');
  const [assignGuard, setAssignGuard] = useState('');
  const [enableNotes, setEnableNotes] = useState(false);
  const [forceMedia, setForceMedia] = useState(false);

  const [localGuards, setLocalGuards] = useState<any[]>(guards || []);
  const [loadingGuards, setLoadingGuards] = useState(false);
  const [guardLoadError, setGuardLoadError] = useState<string | null>(null);
  const [tours, setTours] = useState<any[]>([]);
  const [loadingTours, setLoadingTours] = useState(false);
  const [toursError, setToursError] = useState<string | null>(null);
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const guardsLoadedRef = useRef(false);

  useEffect(() => {
    // Solo cargar guardias asignados a este post site cuando se abre el modal
    if (showNewTourModal && !guardsLoadedRef.current && localGuards.length === 0) {
      guardsLoadedRef.current = true;
      setLoadingGuards(true);
      setGuardLoadError(null);

      const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
      const postSiteId = site?.id || '';

      if (!postSiteId) {
        setGuardLoadError(t('siteTour.form.noPostSiteId', 'No post site selected'));
        setLoadingGuards(false);
        return;
      }

      ApiService.get(`/tenant/${tenantId}/post-site/${postSiteId}/guards`)
        .then((data) => {
          // El endpoint puede retornar un array o { rows, count }
          const guardsList = Array.isArray(data) ? data : (data && data.rows) ? data.rows : [];
          setLocalGuards(guardsList || []);
        })
        .catch((err) => {
          console.error('Failed to load assigned guards', err);
          setGuardLoadError(t('siteTour.form.errorLoadingGuards', 'Error loading guards'));
        })
        .finally(() => {
          setLoadingGuards(false);
        });
    }
  }, [showNewTourModal, site, t]);

  // Load tenant site tours (tenant-scoped)
  const fetchTours = async () => {
    const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
    if (!tenantId) return;
    setLoadingTours(true);
    setToursError(null);
    try {
      const postSiteId = site?.id || '';
      const qs = postSiteId ? `?postSiteId=${encodeURIComponent(postSiteId)}` : '';
      const resp: any = await ApiService.get(`/tenant/${tenantId}/site-tour${qs}`);
      const rows = resp && resp.rows ? resp.rows : (Array.isArray(resp) ? resp : []);
      setTours(rows || []);
    } catch (err: any) {
      console.error('Failed to load site tours', err);
      setToursError(t('siteTour.form.errorLoadingTours', 'Error loading site tours'));
    } finally {
      setLoadingTours(false);
    }
  };

  useEffect(() => { fetchTours(); }, [site]);



  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative">
            <button onClick={() => setActionOpen(v => !v)} className="px-3 py-2 border rounded-full bg-white text-sm inline-flex items-center gap-2">
              Action
              <ChevronDown size={14} />
            </button>
            {actionOpen && (
              <div className="absolute mt-2 bg-white border rounded-md shadow-lg z-10 w-48">
                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Archive Selected</button>
                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export</button>
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <Search size={16} />
              </span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('siteTour.searchPlaceholder')} className="w-full h-10 rounded-full border pl-10 pr-4" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <button onClick={() => setShowNewTourModal(true)} className="inline-flex items-center gap-3 bg-orange-600 text-white px-4 py-2 rounded-full hover:bg-orange-700">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                <Plus size={14} />
              </span>
              <span className="text-sm font-medium">{t('siteTour.newTour')}</span>
            </button>
          </div>
        </div>

        <div>
          <div className="md:block hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3"><input type="checkbox" /></th>
                  <th className="px-4 py-3 text-left">{t('siteTour.table.name')}</th>
                  <th className="px-4 py-3 text-left">{t('siteTour.table.duration')}</th>
                  <th className="px-4 py-3 text-left">{t('siteTour.table.type')}</th>
                </tr>
              </thead>
              <tbody>
                {loadingTours ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">{t('siteTour.loading', 'Loading...')}</td>
                  </tr>
                ) : tours.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-40 h-40">
                          <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                            <rect x="40" y="48" width="120" height="84" fill="currentColor" rx="10" />
                            <path d="M60 78 L140 78" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="90" cy="100" r="6" fill="white" />
                            <circle cx="110" cy="100" r="6" fill="white" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-700">{t('siteTour.empty.title')}</h3>
                          <p className="text-sm text-gray-500 mt-1">{t('siteTour.empty.message')}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tours.map((tour: any) => (
                    <tr key={tour.id} className="border-b">
                      <td className="px-4 py-3"><input type="checkbox" /></td>
                      <td className="px-4 py-3 text-left">{tour.name || '-'}</td>
                      <td className="px-4 py-3 text-left">{tour.maxDuration || '-'}</td>
                      <td className="px-4 py-3 text-left">{tour.timeMode || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            <MobileCardList
              items={tours}
              renderCard={(tour: any) => (
                <div className="p-4 bg-white border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{tour.name || t('siteTour.placeholders.tourNameFallback')}</div>
                      <div className="text-xs text-gray-500">{tour.timeMode || t('siteTour.table.type')}</div>
                    </div>
                    <div className="text-sm text-gray-600">{tour.maxDuration || '-'}</div>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {showNewTourModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewTourModal(false)} />

          <aside className="relative w-full sm:ml-auto sm:max-w-md lg:max-w-xl bg-white shadow-xl overflow-hidden rounded-lg flex flex-col h-screen">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{t('siteTour.modal.title')}</h3>
              <button onClick={() => setShowNewTourModal(false)} className="p-2 text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[90vh] space-y-4">
              <div>
                <input value={tourName} onChange={e => setTourName(e.target.value)} placeholder={t('siteTour.form.tourName')} className="w-full border rounded-lg h-12 px-3" />
              </div>

              <div>
                <textarea value={tourDesc} onChange={e => setTourDesc(e.target.value)} placeholder={t('siteTour.form.tourDescription')} className="w-full border rounded-lg px-3 py-3 min-h-[120px]" />
              </div>

              <div>
                <select value={scheduledDays} onChange={e => setScheduledDays(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">{t('siteTour.form.scheduledDays')}</option>
                  <option value="mon">{t('siteTour.options.monFri')}</option>
                  <option value="sat">{t('siteTour.options.weekend')}</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">{t('siteTour.form.continuous')}</label>
                  <input type="checkbox" checked={continuous} onChange={e => setContinuous(e.target.checked)} className="h-5 w-8" />
                </div>

                <div className="flex-1">
                  <select
                    value={timeMode}
                    onChange={e => {
                      const v = e.target.value;
                      setTimeMode(v);
                      if (v !== 'specific') setSelectTime('');
                    }}
                    className="w-full border rounded-lg h-12 px-3"
                  >
                    <option value="specific">{t('siteTour.form.timeMode.specific')}</option>
                    <option value="any">{t('siteTour.form.timeMode.any')}</option>
                  </select>
                </div>
              </div>

              {timeMode === 'specific' && (
                <div
                  className="relative"
                  onClick={() => {
                    if (timeInputRef.current) {
                      try {
                        // Prefer showPicker if available (Chrome/Edge)
                        if (typeof (timeInputRef.current as any).showPicker === 'function') {
                          (timeInputRef.current as any).showPicker();
                        } else {
                          timeInputRef.current.focus();
                        }
                      } catch (e) {
                        timeInputRef.current.focus();
                      }
                    }
                  }}
                >
                  <input
                    ref={timeInputRef}
                    type="time"
                    value={selectTime}
                    onChange={e => setSelectTime(e.target.value)}
                    className="w-full border rounded-lg h-12 px-3"
                    placeholder={t('siteTour.form.selectTime')}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (timeInputRef.current) {
                        if (typeof (timeInputRef.current as any).showPicker === 'function') {
                          (timeInputRef.current as any).showPicker();
                        } else {
                          timeInputRef.current.focus();
                        }
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500"
                    aria-label={t('siteTour.form.openTimePicker', 'Open time picker')}
                  >
                    <Clock size={18} />
                  </button>
                </div>
              )}

              <div>
                <select value={maxDuration} onChange={e => setMaxDuration(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">{t('siteTour.form.maxDuration.placeholder')}</option>
                  <option value="15">{t('siteTour.form.maxDuration.15')}</option>
                  <option value="30">{t('siteTour.form.maxDuration.30')}</option>
                </select>
              </div>

              <div>
                <select value={tagType} onChange={e => setTagType(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">{t('siteTour.form.tagType')}</option>
                  <option value="type-a">{t('siteTour.form.tagTypeOptionA')}</option>
                </select>
              </div>

              <div>
                <select value={tags} onChange={e => setTags(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">{t('siteTour.form.tags')}</option>
                  <option value="tag-1">{t('siteTour.form.tagsOption1')}</option>
                </select>
              </div>

              <div>
                <select value={assignGuard} onChange={e => setAssignGuard(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">{t('siteTour.form.assignGuard')}</option>
                  {loadingGuards ? (
                    <option disabled value="">{t('siteTour.form.loadingGuards', 'Loading guards...')}</option>
                  ) : guardLoadError ? (
                    <option disabled value="">{guardLoadError}</option>
                  ) : localGuards.length === 0 ? (
                    <option disabled value="">{t('siteTour.form.noGuardsFound', 'No guards found')}</option>
                  ) : (
                    localGuards.map((g: any) => {
                      const display = (g.firstName || g.lastName)
                        ? `${g.firstName || ''} ${g.lastName || ''}`.trim()
                        : (g.fullName || g.displayName || g.name || g.email || g.id || '');
                      return (
                        <option key={g.id || display} value={g.id}>{display || String(g.id)}</option>
                      );
                    })
                  )}
                </select>
              </div>

              {/*<div className="space-y-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={enableNotes} onChange={e => setEnableNotes(e.target.checked)} /> {t('siteTour.form.enableNotes')}</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={forceMedia} onChange={e => setForceMedia(e.target.checked)} /> {t('siteTour.form.forceMedia')}</label>
              </div>*/}
            </div>

            <div className="p-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                  <button onClick={() => { /* save as draft */ setShowNewTourModal(false); }} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">{t('siteTour.buttons.saveDraft')}</button>
                </div>
                <div>
                  <button onClick={async () => {
                    // submit new site tour
                    try {
                      const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                      if (!tenantId || !site?.id) {
                        toast.error(t('siteTour.form.noPostSiteId', 'No post site selected'));
                        return;
                      }

                      const payload: any = {
                        name: tourName,
                        description: tourDesc,
                        postSiteId: site?.id || null,
                        scheduledDays,
                        continuous,
                        timeMode,
                        selectTime,
                        maxDuration,
                        // include selected guard id when provided so backend can create assignment
                        securityGuardId: assignGuard || null,
                        active: true,
                      };

                      await ApiService.post(`/tenant/${tenantId}/site-tour`, payload);
                      toast.success(t('siteTour.notifications.created', 'Site tour created'));
                      // refresh list
                      try { await fetchTours(); } catch (e) { /* ignore */ }
                      // reset and close
                      setTourName('');
                      setTourDesc('');
                      setScheduledDays('');
                      setContinuous(false);
                      setTimeMode('specific');
                      setSelectTime('');
                      setMaxDuration('');
                      setAssignGuard('');
                      setShowNewTourModal(false);
                    } catch (err: any) {
                      console.error('Create site tour failed', err);
                      const msg = err?.response?.data?.message || err?.message || t('siteTour.form.errorCreating', 'Error creating site tour');
                      toast.error(msg);
                    }
                  }} className="ml-2 inline-flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700">
                    <span className="text-sm font-semibold">{t('siteTour.buttons.submit')}</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
