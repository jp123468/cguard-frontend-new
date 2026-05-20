import React, { useEffect, useState } from 'react';
import { ApiService } from '@/services/api/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileDown, Printer, Funnel } from 'lucide-react';
import { toast } from 'sonner';

export default function TagScans({
  tourId,
  postSiteId,
  site,
}: {
  tourId?: string | null;
  postSiteId?: string | null;
  site?: any;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<any | null>(null);
  const [detailNames, setDetailNames] = useState<Record<string, string>>({});
  const [guardNameMap, setGuardNameMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);
  const [filterGuard, setFilterGuard] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadGuardNamesForRows = async (list: any[]) => {
      try {
        // Build a map of any guard names already present on the rows (assignment.guard, guardName, etc.)
        const localNames: Record<string, string> = {};
        const ids = Array.from(new Set(
          list
            .map((x: any) => {
              const id = x?.securityGuardId ?? x?.security_guard_id ?? x?.assignment?.guardId ?? x?.assignment?.guard?.id ?? x?.assignment?.guard?._id ?? x?.guard?.id ?? x?.guard?._id;
              if (id != null) {
                const sid = String(id);
                const localName = x?.assignment?.guardName || (x?.assignment?.guard && (x.assignment.guard.fullName || x.assignment.guard.name || `${x.assignment.guard.firstName || ''} ${x.assignment.guard.lastName || ''}`.trim())) || x?.guard && (x.guard.fullName || x.guard.name || `${x.guard.firstName || ''} ${x.guard.lastName || ''}`.trim() || x.guard.username) || x?.fullName || ((x?.firstName || '') + ' ' + (x?.lastName || '')).trim() || x?.guardName || x?.guard_name || '';
                if (localName) localNames[sid] = localName;
                return sid;
              }
              return null;
            })
            .filter((id: string | null): id is string => !!id)
        ));

        // Only fetch names for IDs that are not already known from local rows or cache
        const missing = ids.filter((id: string) => !guardNameMap[id] && !localNames[id]);
        if (missing.length) {
          const tenantIdFallback = site?.tenantId || localStorage.getItem('tenantId') || '';
          if (tenantIdFallback) {
            const results = await Promise.all(missing.map(async (id) => {
              try {
                const resp: any = await ApiService.get(`/tenant/${tenantIdFallback}/security-guard/${encodeURIComponent(id)}`).catch(() => null);
                const data = resp && (resp.data !== undefined ? resp.data : resp);
                const resolvedGuardName = data && (
                  data.fullName ||
                  data.name ||
                  (data.guard && (data.guard.fullName || data.guard.name || `${data.guard.firstName || ''} ${data.guard.lastName || ''}`.trim() || data.guard.username)) ||
                  ((data.firstName || '') + ' ' + (data.lastName || '')).trim()
                ) ?
                  (data.fullName || data.name || (data.guard && (data.guard.fullName || data.guard.name || `${data.guard.firstName || ''} ${data.guard.lastName || ''}`.trim() || data.guard.username)) || ((data.firstName || '') + ' ' + (data.lastName || '')).trim()) : '';
                return { id, name: resolvedGuardName };
              } catch (e) {
                return { id, name: '' };
              }
            }));

            const map: Record<string, string> = {};
            for (const r of results) {
              if (r.name) map[r.id] = r.name;
            }
            if (mounted) setGuardNameMap((prev) => ({ ...prev, ...localNames, ...map }));
          } else if (mounted) {
            setGuardNameMap((prev) => ({ ...prev, ...localNames }));
          }
        } else if (mounted) {
          setGuardNameMap((prev) => ({ ...prev, ...localNames }));
        }
      } catch (err) {
        console.warn('loadGuardNamesForRows failed', err);
      }
    };
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
        if (!tenantId) return setRows([]);
        const qsParts: string[] = [];
        let url = '';
        if (tourId) {
          qsParts.push(`tourId=${encodeURIComponent(String(tourId))}`);
          url = `/tenant/${tenantId}/site-tour/tag-scans`;
        } else if (postSiteId) {
          url = `/tenant/${tenantId}/post-site/${encodeURIComponent(String(postSiteId))}/tag-scans`;
        } else {
          url = `/tenant/${tenantId}/site-tour/tag-scans`;
        }
        qsParts.push('limit=1000');
        const qs = qsParts.length ? `?${qsParts.join('&')}` : '';
        const resp: any = await ApiService.get(`${url}${qs}`);
        const list = resp && (resp.rows || resp.data) ? (resp.rows || resp.data) : (Array.isArray(resp) ? resp : []);
        const listArr: any[] = Array.isArray(list) ? list as any[] : [];
        if (!mounted) return;
        setRows(listArr || []);
        // load missing guard names
        try {
          await loadGuardNamesForRows(listArr || []);
        } catch (err) {
          console.warn('Failed loading guard names', err);
        }
      } catch (e: any) {
        console.error('Failed loading tag scans', e);
        // If ApiService threw an ApiError include status and data to help debugging
        if (e && e.status) {
          try {
            setError(`${e.message || 'Error'} (${e.status})` + (e.data ? ` - ${JSON.stringify(e.data)}` : ''));
          } catch (_) {
            setError(`${e.message || 'Error'} (${e.status})`);
          }
        } else {
          setError(e?.message || 'Error cargando registros');
        }

        // No fallback routes. Use the supported tenant-scoped /site-tour/tag-scans endpoint only.
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [tourId, postSiteId, site]);

  const formatScannedData = (d: any) => {
    if (!d) return null;
    if (typeof d === 'string') return d;
    if (typeof d === 'object') {
      // common shape: { latitude, longitude, extra }
      if ((d.latitude || d.longitude) && (d.latitude !== undefined || d.longitude !== undefined)) {
        const lat = d.latitude ?? d.lat ?? '';
        const lng = d.longitude ?? d.lng ?? '';
        // prefer extra.note if available
        if (d.extra && typeof d.extra === 'object' && d.extra.note) return d.extra.note;
        return `${lat}${lat && lng ? ', ' : ''}${lng}` || JSON.stringify(d);
      }
      if (d.extra && typeof d.extra === 'string') return d.extra;
      if (d.extra && typeof d.extra === 'object') return d.extra.note ? d.extra.note : JSON.stringify(d.extra);
      return JSON.stringify(d);
    }
    return String(d);
  };

  const getGuardDisplay = (r: any) => {
    const guardId = r.securityGuardId || r.security_guard_id || r.assignment?.guardId || r.assignment?.guard?.id || r.assignment?.guard?._id || r.guard?.id || r.guard?._id || null;
    const guardName = r.guardName || r.guard_name || r.fullName ||
      (r.guard && (r.guard.fullName || r.guard.name || `${r.guard.firstName || ''} ${r.guard.lastName || ''}`.trim() || r.guard.username)) ||
      (r.assignment && (r.assignment.guardName || (r.assignment.guard && (r.assignment.guard.fullName || r.assignment.guard.name || `${r.assignment.guard.firstName || ''} ${r.assignment.guard.lastName || ''}`.trim())))) ||
      ((r.firstName || '') + ' ' + (r.lastName || '')).trim() || '';
    const resolvedGuardName = guardName || (guardId ? guardNameMap[guardId] : '') || '';
    if (resolvedGuardName) {
      return resolvedGuardName;
    }
    return guardId || '-';
  };

  const formatRowForDetails = (r: any) => {
    const guardName = r.guardName || r.guard_name || (r.guard && (r.guard.fullName || r.guard.name || r.guard.username)) || (r.assignment && (r.assignment.guardName || (r.assignment.guard && (r.assignment.guard.fullName || r.assignment.guard.name)))) || '';
    const stationName = r.stationName || (r.station && (r.station.stationName || r.station.name)) || null;
    const note = r.scannedData && r.scannedData.extra && (r.scannedData.extra.note ?? r.scannedData.extra.message) ? (r.scannedData.extra.note ?? r.scannedData.extra.message) : null;
    const lat = r.scannedData && (r.scannedData.latitude ?? r.scannedData.lat);
    const lng = r.scannedData && (r.scannedData.longitude ?? r.scannedData.lng);

    const resolvedSecurityGuardId = r.securityGuardId ?? r.security_guard_id ?? r.assignment?.guardId ?? r.assignment?.guard?.id ?? r.assignment?.guard?._id ?? r.guard?.id ?? r.guard?._id ?? null;

    return {
      id: r.id || null,
      scannedAt: r.scannedAt || r.createdAt || null,
      tagIdentifier: r.tagIdentifier || null,
      tagName: r.tagName || (r.tag && r.tag.name) || null,
      stationId: r.stationId || (r.station && (r.station.id || null)) || null,
      stationName: stationName,
      securityGuardId: resolvedSecurityGuardId,
      guardName: guardName,
      tourId: r.tourId || (r.tag && r.tag.siteTourId) || null,
      tourTenantId: r.tourTenantId || null,
      tourAssignmentId: r.tourAssignmentId || r.assignmentId || null,
      siteTourTagId: r.siteTourTagId || null,
      tenantId: r.tenantId || null,
      note: note,
      latitude: typeof lat !== 'undefined' ? lat : null,
      longitude: typeof lng !== 'undefined' ? lng : null,
      createdAt: r.createdAt || null,
      updatedAt: r.updatedAt || null,
      deletedAt: r.deletedAt || null,
      importHash: r.importHash || null,
    };
  };

  const filteredRows = rows.filter((r) => {
    const query = searchQuery.trim().toLowerCase();
    const guardLabel = getGuardDisplay(r).toString().toLowerCase();
    const stationLabel = ((r.station && (r.station.stationName || r.station.name)) || r.stationName || '').toString().toLowerCase();
    const tagLabel = ((r.tag && (r.tag.tagIdentifier || r.tag.name)) || r.tagIdentifier || r.tagName || '').toString().toLowerCase();

    if (filterGuard && !guardLabel.includes(filterGuard.toLowerCase())) return false;
    if (filterStation && !stationLabel.includes(filterStation.toLowerCase())) return false;
    if (query && !(guardLabel.includes(query) || stationLabel.includes(query) || tagLabel.includes(query))) return false;
    return true;
  });

  const guardOptions = Array.from(new Set(rows
    .map((r) => getGuardDisplay(r))
    .filter((value) => Boolean(value)) as string[]));

  const stationOptions = Array.from(new Set(rows
    .map((r) => ((r.station && (r.station.stationName || r.station.name)) || r.stationName || '').toString())
    .filter((value) => Boolean(value))));

  const getById = (r: any) => String(r.id || r._id || '');
  const isAllSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedScanIds.includes(getById(r)));

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedScanIds(filteredRows.map((r) => getById(r)).filter(Boolean));
      return;
    }
    setSelectedScanIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedScanIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  };

  const downloadExport = async (format: 'pdf' | 'excel', ids?: string[]) => {
    try {
      const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
      if (!tenantId) return;
      const qsParts: string[] = [];
      if (tourId) qsParts.push(`tourId=${encodeURIComponent(String(tourId))}`);
      if (postSiteId) qsParts.push(`postSiteId=${encodeURIComponent(String(postSiteId))}`);
      if (ids && ids.length) qsParts.push(`ids=${ids.map(encodeURIComponent).join(',')}`);
      const qs = qsParts.length ? `&${qsParts.join('&')}` : '';
      const url = `/tenant/${tenantId}/site-tour/tag-scans/export?format=${format}${qs}`;
      const blob: Blob = await ApiService.getBlob(url);
      const filename = `etiquetas-recorrido${tourId ? `-${tourId}` : ''}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      console.error('Export failed', e);
      if (e && e.status) {
        toast.error(`Error al exportar: ${e.message || 'Error'} (${e.status})`);
      } else {
        toast.error('Error al exportar');
      }
    }
  };

  const exportSelected = async (format: 'pdf' | 'excel') => {
    if (!selectedScanIds.length) {
      toast.error('Selecciona al menos un registro para exportar.');
      return;
    }
    await downloadExport(format, selectedScanIds);
  };

  const clearFilters = () => {
    setFilterGuard('');
    setFilterStation('');
  };

  const selectedCount = selectedScanIds.length;

  const handleActionChange = (action: string) => {
    switch (action) {
      case 'clearSelection':
        if (!selectedScanIds.length) {
          toast.error('No hay registros seleccionados para borrar.');
          break;
        }
        setShowClearConfirm(true);
        break;
      case 'exportSelectedPdf':
        exportSelected('pdf');
        break;
      case 'exportSelectedExcel':
        exportSelected('excel');
        break;
      case 'toggleFilters':
        setShowFilters((current) => !current);
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 flex-1 flex flex-col">
      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,12rem)_minmax(24rem,1fr)_auto] lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <Select value="" onValueChange={(value) => {
            handleActionChange(value);
          }}>
            <SelectTrigger className="h-9 min-w-[10rem] max-w-[12rem] rounded-2xl border border-slate-200 bg-card px-3 text-sm text-foreground focus:border-slate-400 focus:ring-1 focus:ring-slate-200">
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border border-slate-200 bg-card shadow-lg">
              <SelectItem value="clearSelection">Borrar selección</SelectItem>
              <SelectItem value="exportSelectedPdf">Exportar selección PDF</SelectItem>
              <SelectItem value="exportSelectedExcel">Exportar selección Excel</SelectItem>
            </SelectContent>
          </Select>

          {selectedCount > 0 && (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-foreground">
              {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex w-full items-center justify-center">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar etiqueta, estación o guardia"
            className="h-10 w-full max-w-[44rem] rounded-2xl"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-2xl w-full bg-[#C8860A] hover:bg-[#C8860A] text-white">
                <Funnel className="mr-2 h-4 w-4 text-white" />
                FILTROS
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-md h-full sm:h-auto rounded-3xl text-lg">
              <SheetHeader>
                <SheetTitle className="text-xl">Filtros</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-base font-medium text-foreground">Guardia</label>
                  <Select value={filterGuard || "__all_guards__"} onValueChange={(value) => setFilterGuard(value === "__all_guards__" ? "" : value)}>
                    <SelectTrigger className="rounded-2xl border border-slate-200 bg-card px-3 text-base text-foreground focus:border-slate-400 focus:ring-1 focus:ring-slate-200 w-full">
                      <SelectValue placeholder="Todos los guardias" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-slate-200 bg-card shadow-lg w-full">
                      <SelectItem value="__all_guards__">Todos los guardias</SelectItem>
                      {guardOptions.map((guard) => (
                        <SelectItem key={guard} value={guard}>{guard}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-base font-medium text-foreground">Estación</label>
                  <Select value={filterStation || "__all_stations__"} onValueChange={(value) => setFilterStation(value === "__all_stations__" ? "" : value)}>
                    <SelectTrigger className="rounded-2xl border border-slate-200 bg-card px-3 text-base text-foreground focus:border-slate-400 focus:ring-1 focus:ring-slate-200 w-full">
                      <SelectValue placeholder="Todas las estaciones" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-slate-200 bg-card shadow-lg w-full">
                      <SelectItem value="__all_stations__">Todas las estaciones</SelectItem>
                      {stationOptions.map((station) => (
                        <SelectItem key={station} value={station}>{station}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full rounded-2xl bg-[#C8860A] hover:bg-[#C8860A] text-white"
                >
                  Limpiar filtros
                </button>
              </div>
            </SheetContent>
          </Sheet>

          <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar borrado</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estás seguro de que quieres borrar la selección de registros?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    toggleSelectAll(false);
                    setShowClearConfirm(false);
                  }}
                >
                  Borrar selección
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Cargando registros...</div>
      ) : error || filteredRows.length === 0 ? (
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td colSpan={6} className="py-20">
                  <div className="flex flex-col items-center justify-center text-center">
                    <img
                      src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
                      alt="Sin datos"
                      className="h-36 mb-4"
                    />
                    <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                      {tourId || postSiteId
                        ? 'No hay etiquetas escaneadas para este recorrido o puesto.'
                        : 'No hay etiquetas escaneadas.'}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left"><input type="checkbox" checked={isAllSelected} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
                <th className="px-4 py-2 text-left">Fecha y hora</th>
                <th className="px-4 py-2 text-left">Etiqueta / Datos</th>
                <th className="px-4 py-2 text-left">Estación</th>
                <th className="px-4 py-2 text-left">Guardia</th>
                <th className="px-4 py-2 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r: any, i: number) => {
                const rowId = String(r.id || r._id || '');
                return (
                  <React.Fragment key={(r.id || r._id || i)}>
                    <tr className="border-b">
                      <td className="px-4 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={selectedScanIds.includes(rowId)}
                          onChange={() => toggleSelect(rowId)}
                        />
                      </td>
                      <td className="px-4 py-2 align-top">{r.scannedAt ? new Date(r.scannedAt).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : '-')}</td>
                      <td className="px-4 py-2 align-top break-words">{(formatScannedData(r.scannedData) || r.tagIdentifier) ?? '-'}</td>
                      <td className="px-4 py-2 align-top">{(r.station && (r.station.stationName || r.station.name)) || r.stationName || '-'}</td>
                      <td className="px-4 py-2 align-top">{getGuardDisplay(r)}</td>
                      <td className="px-4 py-2 align-top">
                        <button
                          className="px-2 py-1 bg-muted rounded"
                          onClick={async () => {
                            setDetailRow(r);
                            setDetailNames({});
                            setDetailModalOpen(true);
                            try {
                              const tenantId = site?.tenantId || localStorage.getItem('tenantId') || '';
                              const names: Record<string, string> = {};
                              if (r.tourId && tenantId) {
                                try {
                                  const tourResp: any = await ApiService.get(`/tenant/${tenantId}/site-tour/${encodeURIComponent(String(r.tourId))}`);
                                  const tour = tourResp && (tourResp.data !== undefined ? tourResp.data : tourResp);
                                  if (tour && (tour.name || tour.title)) names.tourName = tour.name || tour.title;
                                } catch (e) { /* ignore */ }
                              }
                              if (r.siteTourTagId && r.tourId && tenantId) {
                                try {
                                  const tagResp: any = await ApiService.get(`/tenant/${tenantId}/site-tour/${encodeURIComponent(String(r.tourId))}/tag/${encodeURIComponent(String(r.siteTourTagId))}`).catch(() => null);
                                  const tag = tagResp && (tagResp.data !== undefined ? tagResp.data : tagResp);
                                  if (tag && (tag.name || tag.tagIdentifier)) names.tagName = tag.name || tag.tagIdentifier;
                                } catch (e) { /* ignore */ }
                              }
                              // assignment: try to use assignment.guard or assignment.guardName
                              if (r.tourAssignmentId) {
                                const aGuard = r.assignment && (r.assignment.guard && (r.assignment.guard.fullName || r.assignment.guard.name));
                                if (aGuard) names.assignmentName = aGuard;
                                else if (r.assignment && r.assignment.guardName) names.assignmentName = r.assignment.guardName;
                              }
                              if (Object.keys(names).length) setDetailNames(names);
                            } catch (err) {
                              console.warn('Failed resolving detail names', err);
                            }
                          }}
                        >
                          Detalles
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {detailModalOpen && detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setDetailModalOpen(false)} />
          <div className="bg-card rounded-3xl border border-slate-200 shadow-lg max-w-2xl w-full mx-4 z-10 overflow-auto max-h-[80vh] text-base">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h4 className="font-semibold text-center flex-1 text-xl">Detalles de etiqueta</h4>
              <button className="px-2 py-1 text-xl font-semibold" aria-label="Cerrar" onClick={() => setDetailModalOpen(false)}>×</button>
            </div>
            <div className="p-4">
              {(() => {
                const d = formatRowForDetails(detailRow);
                const fields = [
                  { label: 'Fecha', value: d.createdAt ? new Date(d.createdAt).toLocaleString() : '-' },
                  { label: 'Etiqueta (ID)', value: d.tagIdentifier || '-' },
                  { label: 'Nombre etiqueta', value: d.tagName || (detailNames.tagName || '-') },
                  { label: 'Estación', value: d.stationName || '-' },
                  { label: 'Guardia', value: getGuardDisplay(detailRow) },
                  { label: 'Recorrido', value: detailNames.tourName || d.tourId || '-' },
                  { label: 'Asignación', value: detailNames.assignmentName || d.tourAssignmentId || '-' },
                  { label: 'Etiqueta recorrido (tag)', value: detailNames.tagName || d.siteTourTagId || '-' },
                  { label: 'Nota', value: d.note || '-' },
                  { label: 'Latitud', value: d.latitude ?? '-' },
                  { label: 'Longitud', value: d.longitude ?? '-' },
                ];

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {fields.map((f) => (
                      <div key={f.label} className="rounded p-3">
                        <div className="text-sm text-muted-foreground">{f.label}</div>
                        <div className="mt-2 text-base font-medium text-foreground">{f.value === null || typeof f.value === 'undefined' || f.value === '' ? '-' : String(f.value)}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
