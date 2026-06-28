import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, Paperclip, Eye, FileDown, Trash, Pencil, IdCard, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';
import { useParams, useNavigate } from 'react-router-dom';
import securityGuardService from '@/lib/api/securityGuardService';
import licenseTypeService from '@/lib/api/licenseTypeService';
import LicenseTypeDialog from '@/pages/admin/Configuration/types-licenses/LicensesTypeDialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  guard?: any;
};

const GOLD = '#C8860A';

// ── Expiry status helper ─────────────────────────────────────────────────────
// Returns a three-state badge config based on the expiry date.
function expiryStatus(expiryDate: any, t: (k: string, o?: any) => string) {
  if (!expiryDate) {
    return { txt: t('guards.licenses.status.noExpiry', { defaultValue: 'Sin vencimiento' }), cls: 'bg-muted text-foreground/60', dot: 'bg-gray-400' };
  }
  const exp = new Date(expiryDate);
  const now = new Date();
  const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  if (days < 0) {
    return { txt: t('guards.licenses.status.expired', { defaultValue: 'Vencida' }), cls: 'bg-red-500/15 text-red-700', dot: 'bg-red-500' };
  }
  if (days <= 30) {
    return { txt: t('guards.licenses.status.soon', { defaultValue: 'Por vencer' }), cls: 'bg-orange-500/15 text-orange-700', dot: 'bg-orange-500' };
  }
  return { txt: t('guards.licenses.status.valid', { defaultValue: 'Vigente' }), cls: 'bg-green-500/15 text-green-700', dot: 'bg-green-500' };
}

// ── Small presentational helpers ─────────────────────────────────────────────
const Field = ({ label, value }: { label: string; value: any }) => (
  <div className="min-w-0">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
    <div className="font-medium text-sm text-foreground truncate">{value || '—'}</div>
  </div>
);

export default function GuardLicenses({ guard }: Props) {
  const { id } = useParams();
  const { t } = useTranslation();
  const actionRef = useRef<HTMLDivElement>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>(() => t('guards.licenses.action.default', { defaultValue: 'Action' }));
  const [searchQuery, setSearchQuery] = useState('');
  const [licenseData, setLicenseData] = useState<any[]>([]); // Vacío inicialmente
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkKey, setBulkKey] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [currentLicense, setCurrentLicense] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<any | null>(null);

  // Form state
  const [formData, setFormData] = useState<any>({
    licenseType: '',
    customLicenseName: '',
    licenseNumber: '',
    expiryDate: '',
    frontImage: null,
    backImage: null,
  });

  const [licenseTypes, setLicenseTypes] = useState<any[]>([]);
  const [showCreateLicenseType, setShowCreateLicenseType] = useState(false);
  const { hasPermission } = useAuth();

  const handleAddLicense = () => {
    setShowModal(true);
    setFormData({
      licenseType: '',
      customLicenseName: '',
      licenseNumber: '',
      expiryDate: '',
      frontImage: null,
      backImage: null,
    });
    setCurrentLicense('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const openDetails = async (licenseId: string) => {
    if (!id) return;
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const data = await securityGuardService.getSecurityGuardLicense(id as string, licenseId);
      setDetailsData(data || null);
    } catch (err) {
      console.error('Error loading license details', err);
      toast.error(t('guards.licenses.toasts.loadError', { defaultValue: 'Could not load licenses' }));
      setDetailsData(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsData(null);
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
        setActionOpen(false);
      }
    };

    if (actionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [actionOpen]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    securityGuardService
      .getSecurityGuardLicenses(id as string, { limit, offset: (page - 1) * limit })
      .then((data: any) => {
        if (!mounted) return;
        setLicenseData(data.rows || []);
        setTotalCount(data.count || 0);
      })
      .catch((err: any) => {
        console.error('Error loading licenses', err);
        toast.error(t('guards.licenses.toasts.loadError', { defaultValue: 'Could not load licenses' }));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [id, page, limit]);

  // Extracted loader so we can refresh after creating
  const loadLicenses = async (pageToUse = page, limitToUse = limit) => {
    if (!id) return;
    setLoading(true);
    try {
      const data: any = await securityGuardService.getSecurityGuardLicenses(id as string, { limit: limitToUse, offset: (pageToUse - 1) * limitToUse });
      setLicenseData(data.rows || []);
      setTotalCount(data.count || 0);
    } catch (err: any) {
      console.error('Error loading licenses', err);
      toast.error(t('guards.licenses.toasts.loadError', { defaultValue: 'Could not load licenses' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, [id, page, limit]);

  // load license types for tenant to populate select
  useEffect(() => {
    let mounted = true;
    licenseTypeService
      .list({ limit: 100 })
      .then((data: any) => {
        if (!mounted) return;
        // backend returns { rows, count }
        const rows = data?.rows ?? data?.data ?? data ?? [];
        setLicenseTypes(rows);
      })
      .catch((err) => {
        console.error('Error loading license types', err);
      });

    return () => { mounted = false; };
  }, []);

  const onSelectOne = (selId: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, selId] : prev.filter((x) => x !== selId)));
  };

  const onSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? licenseData.map((r) => r.id) : []);
  };

  // Row-level actions, preserved verbatim from the previous DataTable rowActions.
  const startEdit = (row: any) => {
    setCurrentLicense(row.id);
    setFormData({
      licenseType: row.licenseType?.id ?? (row.customName ? 'other' : ''),
      customLicenseName: row.customName || '',
      licenseNumber: row.number || '',
      expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString().slice(0, 10) : '',
      frontImage: row.frontImage && row.frontImage.length ? row.frontImage[0] : null,
      backImage: row.backImage && row.backImage.length ? row.backImage[0] : null,
    });
    setShowModal(true);
  };

  const downloadRow = async (row: any) => {
    try {
      if (row.frontImage?.[0]?.privateUrl) window.open(row.frontImage[0].privateUrl);
      else if (row.frontImage?.[0]?.publicUrl) window.open(row.frontImage[0].publicUrl);
    } catch {}
  };

  const deleteRow = async (row: any) => {
    try {
      await securityGuardService.destroySecurityGuardLicenses(id as string, [row.id]);
      toast.success(t('guards.licenses.toasts.deleted', { defaultValue: 'Deleted' }));
      await loadLicenses(1, limit);
    } catch {
      toast.error(t('guards.licenses.toasts.deleteError', { defaultValue: 'Could not delete' }));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await securityGuardService.destroySecurityGuardLicenses(id as string, selectedIds);
      toast.success(t('guards.licenses.toasts.deletedBulk', { defaultValue: 'Deleted' }));
      setSelectedIds([]);
      await loadLicenses(1, limit);
    } catch (err) {
      toast.error(t('guards.licenses.toasts.deleteError', { defaultValue: 'Could not delete' }));
    }
  };

  const handleSubmitLicense = async () => {
    try {
      const payload: any = {};
      // If user selected an existing license type, send its id. If 'other', send custom name.
      if (formData.licenseType && formData.licenseType !== 'other') {
        payload.licenseTypeId = formData.licenseType;
      } else if (formData.licenseType === 'other') {
        payload.customName = formData.customLicenseName;
      } else {
        payload.customName = formData.customLicenseName || null;
      }
      payload.number = formData.licenseNumber;
      payload.expiryDate = formData.expiryDate || null;

      // Images: if user provided a File, upload; if existing descriptors (have id), pass through
      if (formData.frontImage) {
        if ((formData.frontImage as any) instanceof File) {
          const front = await securityGuardService.uploadGuardLicenseImage(formData.frontImage as File);
          payload.frontImage = [front];
        } else if (Array.isArray(formData.frontImage)) {
          payload.frontImage = formData.frontImage;
        } else if ((formData.frontImage as any).id) {
          payload.frontImage = [formData.frontImage];
        }
      }

      if (formData.backImage) {
        if ((formData.backImage as any) instanceof File) {
          const back = await securityGuardService.uploadGuardLicenseImage(formData.backImage as File);
          payload.backImage = [back];
        } else if (Array.isArray(formData.backImage)) {
          payload.backImage = formData.backImage;
        } else if ((formData.backImage as any).id) {
          payload.backImage = [formData.backImage];
        }
      }

      if (currentLicense) {
        await securityGuardService.updateSecurityGuardLicense(id as string, currentLicense, payload);
        toast.success(t('guards.licenses.toasts.updated', { defaultValue: 'License updated' }));
      } else {
        await securityGuardService.createSecurityGuardLicense(id as string, payload);
        toast.success(t('guards.licenses.toasts.created', { defaultValue: 'License created' }));
      }
      setCurrentLicense('');
      setShowModal(false);
      setSelectedIds([]);
      // refresh list and go to first page to show the new item
      setPage(1);
      await loadLicenses(1, limit);
    } catch (err: any) {
      console.error('Error creating license', err);
      toast.error(t('guards.licenses.toasts.createError', { defaultValue: 'Could not create license' }));
    }
  };

  // ── Client-side search over the loaded page (purely presentational filter) ──
  const visibleLicenses = licenseData.filter((lic: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (lic.licenseType?.name || lic.customName || '').toLowerCase();
    const num = (lic.number || '').toLowerCase();
    return name.includes(q) || num.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const isEditing = !!currentLicense;

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.licencias">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* ── HEADER / TOOLBAR ──────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t('guards.nav.licencias') || 'Licencias'}</h1>
              <p className="text-sm text-muted-foreground">
                {t('guards.licenses.subtitle', { defaultValue: 'Documentos y credenciales del vigilante' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('guards.licenses.searchPlaceholder', { defaultValue: 'Search license' })}
                  className="pl-9 h-9 text-sm w-full sm:w-56"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={handleAddLicense}
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition whitespace-nowrap"
                style={{ background: GOLD }}
              >
                <Plus size={16} />
                {t('guards.licenses.newLicense', { defaultValue: 'New License' })}
              </button>
            </div>
          </div>

          {/* ── BULK ACTION BAR (shown only with a selection) ─────────────────── */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-2.5">
              <span className="text-sm font-medium">
                {selectedIds.length} {t('guards.licenses.selected', { defaultValue: 'seleccionadas' })}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIds([])} className="text-sm px-3 py-1.5 rounded-lg border hover:bg-muted transition">
                  {t('actions.cancel', { defaultValue: 'Cancelar' })}
                </button>
                <button onClick={handleBulkDelete} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-red-500/15 text-red-700 hover:bg-red-500/25 transition">
                  <Trash className="h-4 w-4" />
                  {t('actions.delete', { defaultValue: 'Eliminar' })}
                </button>
              </div>
            </div>
          )}

          {/* ── LICENSE CARDS ─────────────────────────────────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-card border rounded-2xl p-5 shadow-sm animate-pulse">
                  <div className="h-4 w-1/3 bg-muted rounded mb-3" />
                  <div className="h-3 w-2/3 bg-muted rounded mb-2" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : visibleLicenses.length === 0 ? (
            <div className="bg-card border rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <IdCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">{t('guards.licenses.empty.title')}</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs" dangerouslySetInnerHTML={{ __html: t('guards.licenses.empty.description') }} />
              <button
                onClick={handleAddLicense}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition"
                style={{ background: GOLD }}
              >
                <Plus size={16} />
                {t('guards.licenses.newLicense', { defaultValue: 'New License' })}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleLicenses.map((lic: any) => {
                const status = expiryStatus(lic.expiryDate, t);
                const selected = selectedIds.includes(lic.id);
                const typeName = lic.licenseType?.name || lic.customName || t('guards.licenses.untitled', { defaultValue: 'Licencia' });
                return (
                  <div
                    key={lic.id}
                    className={`group relative bg-card border rounded-2xl p-5 shadow-sm transition hover:shadow-md cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => openDetails(lic.id)}
                  >
                    {/* selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onSelectOne(lic.id, e.target.checked)}
                      className="absolute top-4 right-4 h-4 w-4 rounded border-input accent-primary cursor-pointer opacity-0 group-hover:opacity-100 checked:opacity-100 transition"
                    />

                    <div className="flex items-start gap-3 pr-6">
                      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}1a` }}>
                        <IdCard className="w-5 h-5" style={{ color: GOLD }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm tracking-tight truncate">{typeName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {lic.number || t('guards.licenses.noNumber', { defaultValue: 'Sin número' })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Field
                        label={t('guards.licenses.form.issueDate', { defaultValue: 'Emitida' })}
                        value={lic.issueDate ? new Date(lic.issueDate).toLocaleDateString('es') : null}
                      />
                      <Field
                        label={t('guards.licenses.table.expires', { defaultValue: 'Expires On' })}
                        value={lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString('es') : null}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.txt}
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                        <button title={t('actions.viewDetails', { defaultValue: 'View' })} onClick={() => openDetails(lic.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button title={t('actions.edit', { defaultValue: 'Editar' })} onClick={() => startEdit(lic)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button title={t('actions.download', { defaultValue: 'Download' })} onClick={() => downloadRow(lic)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition">
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button title={t('actions.delete', { defaultValue: 'Delete' })} onClick={() => deleteRow(lic)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition">
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PAGINATION ────────────────────────────────────────────────────── */}
          {!loading && visibleLicenses.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 text-sm text-foreground/70 bg-card border rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <span>{t('clients.pagination.itemsPerPage')}</span>
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>{page} – {totalPages}</div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>{t('clients.pagination.prev')}</Button>
                <Button variant="outline" size="sm" disabled={page * limit >= totalCount || loading} onClick={() => setPage((p) => p + 1)}>{t('clients.pagination.next')}</Button>
              </div>
            </div>
          )}

          {/* Modal (add / edit) */}
          {showModal && (
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={handleCloseModal}
            >
              <div
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card shadow-2xl overflow-y-auto rounded-l-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-card z-10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}1a` }}>
                      <ShieldCheck className="w-5 h-5" style={{ color: GOLD }} />
                    </span>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      {isEditing
                        ? t('guards.licenses.modal.editTitle', { defaultValue: 'Editar licencia' })
                        : t('guards.licenses.modal.title', { defaultValue: 'Add New License' })}
                    </h2>
                  </div>
                  <button onClick={handleCloseModal} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6">
                  <form className="space-y-5">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                        {t('guards.licenses.form.licenseType', { defaultValue: 'Tipo de licencia' })} <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formData.licenseType}
                        onValueChange={(v) => {
                          // placeholder token
                          if (v === '__empty') {
                            setFormData({ ...formData, licenseType: '', customLicenseName: '' });
                            return;
                          }
                          // if user chose to create a new license type
                          if (v === 'other') {
                            // check permission
                            if (!hasPermission('licenseTypeCreate')) {
                              toast.error(t('guards.licenses.toasts.noPermissionCreateType', { defaultValue: 'No tiene permiso para crear tipos de licencia' }));
                              return;
                            }
                            // open dialog to create new type
                            setShowCreateLicenseType(true);
                            return;
                          }
                          setFormData({ ...formData, licenseType: v, customLicenseName: '' });
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={t('guards.licenses.form.selectLicenseType', { defaultValue: 'Selecciona tipo' })} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty">{t('guards.licenses.form.selectLicenseType', { defaultValue: 'Selecciona tipo' })}</SelectItem>
                          {licenseTypes.map((lt: any) => (
                            <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                          ))}
                          <SelectItem value="other">{t('guards.licenses.form.option.other', { defaultValue: 'Other' })}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('guards.licenses.form.licenseNumber', { defaultValue: 'Número de licencia' })} <span className="text-red-500">*</span></label>
                      <Input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        placeholder={t('guards.licenses.form.licenseNumberPlaceholder', { defaultValue: 'Ingresa número' })}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('guards.licenses.form.expiryDate', { defaultValue: 'Vence el' })}</label>
                      <Input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="h-9 text-sm cursor-pointer"
                      />
                    </div>

                    {(formData.licenseType === 'other' || !formData.licenseType) && (
                      <div>
                        <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('guards.licenses.form.customLicenseName', { defaultValue: 'Nombre personalizado' })}</label>
                        <Input
                          type="text"
                          value={formData.customLicenseName}
                          onChange={(e) => setFormData({ ...formData, customLicenseName: e.target.value })}
                          placeholder={t('guards.licenses.form.customLicensePlaceholder', { defaultValue: 'Nombre (si aplica)' })}
                          className="h-9 text-sm"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('guards.licenses.form.frontImageLabel', { defaultValue: 'Imagen frontal' })}</label>
                        <input type="file" accept="image/*" id="frontImage" className="hidden" onChange={(e) => setFormData({ ...formData, frontImage: e.target.files?.[0] || null })} />
                        <label htmlFor="frontImage" className="flex items-center gap-2 px-3 h-9 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted/50 transition">
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground/70 truncate">{formData.frontImage ? (formData.frontImage.name || t('guards.licenses.form.fileSelected', { defaultValue: 'Archivo seleccionado' })) : t('guards.licenses.form.chooseFile', { defaultValue: 'Seleccionar archivo' })}</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('guards.licenses.form.backImageLabel', { defaultValue: 'Imagen trasera' })}</label>
                        <input type="file" accept="image/*" id="backImage" className="hidden" onChange={(e) => setFormData({ ...formData, backImage: e.target.files?.[0] || null })} />
                        <label htmlFor="backImage" className="flex items-center gap-2 px-3 h-9 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted/50 transition">
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground/70 truncate">{formData.backImage ? (formData.backImage.name || t('guards.licenses.form.fileSelected', { defaultValue: 'Archivo seleccionado' })) : t('guards.licenses.form.chooseFile', { defaultValue: 'Seleccionar archivo' })}</span>
                        </label>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-card">
                  <button onClick={handleCloseModal} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition">{t('guards.licenses.modal.cancel', { defaultValue: 'Cancelar' })}</button>
                  <button onClick={handleSubmitLicense} className="text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition" style={{ background: GOLD }}>{t('guards.licenses.modal.save', { defaultValue: 'Guardar' })}</button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Dialog to create a new license type (tenant-scoped). */}
        <LicenseTypeDialog
          open={showCreateLicenseType}
          onOpenChange={(v) => setShowCreateLicenseType(v)}
          onSubmit={async (values) => {
            try {
              const created = await licenseTypeService.create({ name: values.name });
              const newType = created && (created.data ?? created) ? (created.data ?? created) : created;
              const added = Array.isArray(newType) ? newType[0] : newType;
                if (added) {
                setLicenseTypes((prev) => [...prev, added]);
                setFormData((f: any) => ({ ...f, licenseType: String(added.id) }));
              }
              setShowCreateLicenseType(false);
            } catch (err) {
              console.error('Error creating license type', err);
              toast.error(t('licenseTypes.dialog.createError', { defaultValue: 'Could not create license type' }));
            }
          }}
        />

        {/* Details modal */}
        {detailsOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={closeDetails}>
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card shadow-2xl overflow-y-auto rounded-l-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}1a` }}>
                    <IdCard className="w-5 h-5" style={{ color: GOLD }} />
                  </span>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">{t('guards.licenses.details.title', { defaultValue: 'License details' })}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => {
                    // Prefill form and open edit modal
                    if (!detailsData) return;
                    setCurrentLicense(detailsData.id);
                    setFormData({
                      licenseType: detailsData.licenseType?.id ?? (detailsData.customName ? 'other' : ''),
                      customLicenseName: detailsData.customName || '',
                      licenseNumber: detailsData.number || '',
                      expiryDate: detailsData.expiryDate ? new Date(detailsData.expiryDate).toISOString().slice(0,10) : '',
                      frontImage: detailsData.frontImage && detailsData.frontImage.length ? detailsData.frontImage[0] : null,
                      backImage: detailsData.backImage && detailsData.backImage.length ? detailsData.backImage[0] : null,
                    });
                    setDetailsOpen(false);
                    setShowModal(true);
                  }} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition">
                    <Pencil className="h-4 w-4" />
                    {t('guards.licenses.details.edit', { defaultValue: 'Editar' })}
                  </button>
                  <button onClick={closeDetails} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"><X className="h-5 w-5" /></button>
                </div>
              </div>

              <div className="p-6">
                {detailsLoading && <div className="text-sm text-muted-foreground">{t('loading', { defaultValue: 'Loading...' })}</div>}
                {!detailsLoading && !detailsData && (
                  <div className="text-sm text-muted-foreground">{t('guards.licenses.details.notFound', { defaultValue: 'Details not available' })}</div>
                )}

                {!detailsLoading && detailsData && (
                  <div className="space-y-5">
                    {(() => {
                      const status = expiryStatus(detailsData.expiryDate, t);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.txt}
                        </span>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-4">
                      <Field label={t('guards.licenses.table.type', { defaultValue: 'License Type' })} value={detailsData.licenseType?.name || detailsData.customName} />
                      <Field label={t('guards.licenses.form.licenseNumber', { defaultValue: 'Número de licencia' })} value={detailsData.number} />
                      <Field label={t('guards.licenses.form.issueDate', { defaultValue: 'Issued' })} value={detailsData.issueDate ? new Date(detailsData.issueDate).toLocaleDateString('es') : null} />
                      <Field label={t('guards.licenses.form.expiryDate', { defaultValue: 'Vence el' })} value={detailsData.expiryDate ? new Date(detailsData.expiryDate).toLocaleDateString('es') : null} />
                      <Field label={t('guards.licenses.table.addedBy', { defaultValue: 'Added By' })} value={detailsData.createdBy?.fullName || detailsData.createdBy?.email} />
                    </div>

                    <div className="border-t pt-4 grid grid-cols-1 gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('guards.licenses.form.frontImageLabel', { defaultValue: 'Imagen frontal' })}</div>
                        <div className="flex flex-wrap gap-2">
                          {detailsData.frontImage?.map((f: any, idx: number) => (
                            <a key={idx} href={f.privateUrl ?? f.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium hover:bg-muted/70 transition">
                              <Paperclip className="h-3.5 w-3.5" />
                              {f.name || (f.publicUrl ? t('actions.view', { defaultValue: 'Ver' }) : t('actions.download', { defaultValue: 'Descargar' }))}
                            </a>
                          ))}
                          {!detailsData.frontImage?.length && <div className="text-sm text-muted-foreground">—</div>}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('guards.licenses.form.backImageLabel', { defaultValue: 'Imagen trasera' })}</div>
                        <div className="flex flex-wrap gap-2">
                          {detailsData.backImage?.map((f: any, idx: number) => (
                            <a key={idx} href={f.privateUrl ?? f.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium hover:bg-muted/70 transition">
                              <Paperclip className="h-3.5 w-3.5" />
                              {f.name || (f.publicUrl ? t('actions.view', { defaultValue: 'Ver' }) : t('actions.download', { defaultValue: 'Descargar' }))}
                            </a>
                          ))}
                          {!detailsData.backImage?.length && <div className="text-sm text-muted-foreground">—</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-card">
                <button onClick={async () => {
                  if (!detailsData) return;
                  try {
                    const blob = await securityGuardService.downloadSecurityGuardLicenseReport(id as string, detailsData.id);
                    const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `license-${detailsData.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Error downloading report', err);
                    toast.error(t('guards.licenses.toasts.downloadError', { defaultValue: 'Could not download report' }));
                  }
                }} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border hover:bg-muted transition">
                  <FileDown className="h-4 w-4" />
                  {t('guards.licenses.details.download', { defaultValue: 'Descargar' })}
                </button>
                <button onClick={closeDetails} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition">{t('guards.licenses.modal.close', { defaultValue: 'Cerrar' })}</button>
              </div>
            </div>
          </div>
        )}
      </GuardsLayout>
    </AppLayout>
  );
}
