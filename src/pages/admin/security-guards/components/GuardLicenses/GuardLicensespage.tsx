import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus, X, Upload, Paperclip, Eye, FileDown, Trash, RotateCcw, Tag, EllipsisVertical, ArrowDownUp, FileSpreadsheet, FileDown as FileDownIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';
import { useParams, useNavigate } from 'react-router-dom';
import securityGuardService from '@/lib/api/securityGuardService';
import licenseTypeService from '@/lib/api/licenseTypeService';
import LicenseTypeDialog from '@/pages/admin/Configuration/types-licenses/LicensesTypeDialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import MobileCardList from '@/components/responsive/MobileCardList';
import { DataTable, type Column } from '@/components/table/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BulkActionsSelect, type BulkAction } from '@/components/table/BulkActionsSelect';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

  const columns: Column[] = [
    {
      key: 'type',
      header: t('guards.licenses.table.type', { defaultValue: 'License Type' }),
      className: 'font-medium',
      render: (v, row) => (
        <div>
          <div className="text-sm font-medium">{row.licenseType?.name || row.customName || '-'}</div>
          <div className="text-xs text-gray-500">{row.number || '-'}</div>
        </div>
      ),
    },
    {
      key: 'expiry',
      header: t('guards.licenses.table.expires', { defaultValue: 'Expires On' }),
      render: (v, row) => {
        if (!row.expiryDate) return '-';
        const exp = new Date(row.expiryDate);
        const now = new Date();
        const isValid = exp >= now;
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {exp.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'addedBy',
      header: t('guards.licenses.table.addedBy', { defaultValue: 'Added By' }),
      render: (v, row) => <div className="text-sm text-gray-600">{row.createdBy?.fullName || row.createdBy?.email || '-'}</div>,
    },
  ];

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

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.licencias">
        <div className="space-y-4">
          <div className="p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              {/* Left: Bulk actions + export */}
              <div className="flex items-center gap-2">
                <BulkActionsSelect key={bulkKey} actions={[{ value: 'eliminar', label: t('actions.delete') }]} onChange={async (action: string) => {
                  if (action === 'eliminar') {
                    // simple bulk delete flow
                      if (selectedIds.length === 0) return setBulkKey(k => k + 1);
                    try {
                      await securityGuardService.destroySecurityGuardLicenses(id as string, selectedIds);
                      toast.success(t('guards.licenses.toasts.deletedBulk', { defaultValue: 'Deleted' }));
                      setSelectedIds([]);
                      setBulkKey(k => k + 1);
                    } catch (err) {
                      toast.error(t('guards.licenses.toasts.deleteError', { defaultValue: 'Could not delete' }));
                    }
                  }
                }} />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <EllipsisVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem disabled>
                      <FileDownIcon className="mr-2 h-4 w-4" /> {t('actions.exportPdf')}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> {t('actions.exportExcel')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Center: Search */}
              <div className="flex-1 max-w-xs">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('guards.licenses.searchPlaceholder', { defaultValue: 'Search license' })}
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Right: Add Button */}
              <button
                onClick={handleAddLicense}
                className="px-6 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors"
              >
                <Plus size={18} />
                {t('guards.licenses.newLicense', { defaultValue: 'New License' })}
              </button>
            </div>

            {/* Table */}
            <div>
              <div className="md:block hidden">
                <div className="rounded-md border overflow-hidden bg-white">
                  <DataTable
                    containerless
                    columns={columns}
                    data={licenseData}
                    loading={loading}
                    selectedIds={selectedIds}
                    onSelectOne={onSelectOne}
                    onSelectAll={onSelectAll}
                    sortKey={sortKey ?? undefined}
                    sortDir={sortDir ?? undefined}
                    onSortChange={(key, dir) => { setSortKey(dir ? key : null); setSortDir(dir); setPage(1); }}
                    rowActions={(row: any) => {
                      const actions: any[] = [];
                      actions.push({ label: t('actions.edit', { defaultValue: 'Editar' }), icon: <RotateCcw className="h-4 w-4" />, onClick: () => {
                        // Prefill form and open edit modal from row action
                        setCurrentLicense(row.id);
                        setFormData({
                          licenseType: row.licenseType?.id ?? (row.customName ? 'other' : ''),
                          customLicenseName: row.customName || '',
                          licenseNumber: row.number || '',
                          expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString().slice(0,10) : '',
                          frontImage: row.frontImage && row.frontImage.length ? row.frontImage[0] : null,
                          backImage: row.backImage && row.backImage.length ? row.backImage[0] : null,
                        });
                        setShowModal(true);
                      }});
                      actions.push({ label: t('actions.viewDetails', { defaultValue: 'View' }), icon: <Eye className="h-4 w-4" />, onClick: () => openDetails(row.id) });
                      actions.push({ label: t('actions.download', { defaultValue: 'Download' }), icon: <FileDown className="h-4 w-4" />, onClick: async () => { try { if (row.frontImage?.[0]?.privateUrl) window.open(row.frontImage[0].privateUrl); else if (row.frontImage?.[0]?.publicUrl) window.open(row.frontImage[0].publicUrl); } catch {} } });
                      actions.push({ label: t('actions.delete', { defaultValue: 'Delete' }), icon: <Trash className="h-4 w-4" />, onClick: async () => { try { await securityGuardService.destroySecurityGuardLicenses(id as string, [row.id]); toast.success(t('guards.licenses.toasts.deleted', { defaultValue: 'Deleted' })); await loadLicenses(1, limit); } catch { toast.error(t('guards.licenses.toasts.deleteError', { defaultValue: 'Could not delete' })); } } });
                      return actions;
                    }}
                    emptyState={(
                      <div className="flex flex-col items-center justify-center text-center">
                        <img src="https://app.guardspro.com/assets/icons/custom/no-data-found.png" alt={t('guards.licenses.empty.title')} className="h-36 mb-4" />
                        <h3 className="text-lg font-semibold">{t('guards.licenses.empty.title')}</h3>
                        <p className="mt-1 text-sm text-muted-foreground max-w-xs" dangerouslySetInnerHTML={{ __html: t('guards.licenses.empty.description') }} />
                      </div>
                    )}
                    onRowClick={(r) => openDetails(r.id)}
                  />

                  {/* Pagination footer matching ClientsPage style */}
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50 border-x border-b rounded-b-lg">
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

                    <div>
                      {Math.min((page - 1) * limit + 1, totalCount === 0 ? 0 : (page - 1) * limit + 1)} – {Math.min(page * limit, totalCount)} {t('clients.pagination.of')} {totalCount}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>{t('clients.pagination.prev')}</Button>
                      <Button variant="outline" size="sm" disabled={page * limit >= totalCount || loading} onClick={() => setPage((p) => p + 1)}>{t('clients.pagination.next')}</Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:hidden">
                <MobileCardList
                  items={licenseData || []}
                  loading={loading}
                  emptyMessage={t('guards.licenses.empty.title', { defaultValue: 'No results found' }) as string}
                  renderCard={(lic: any) => (
                    <div className="p-4 bg-white border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">{lic.licenseType?.name || lic.customName}</div>
                          <div className="text-xs text-gray-500">{lic.number}</div>
                        </div>
                        <div className="text-xs text-gray-500">{lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString() : '-'}</div>
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Pagination footer moved inside desktop table above to avoid duplicate/bordered boxes */}
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div
              className="fixed inset-0 z-50"
              onClick={handleCloseModal}
            >
              <div
                className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                  <h2 className="text-lg font-semibold text-gray-800">{t('guards.licenses.modal.title', { defaultValue: 'Add New License' })}</h2>
                </div>

                {/* Body */}
                <div className="p-6">
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          <SelectTrigger className="h-10">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('guards.licenses.form.licenseNumber', { defaultValue: 'Número de licencia' })} <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                          placeholder={t('guards.licenses.form.licenseNumberPlaceholder', { defaultValue: 'Ingresa número' })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('guards.licenses.form.expiryDate', { defaultValue: 'Vence el' })}</label>
                        <input
                          type="date"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                        />
                      </div>

                      {(formData.licenseType === 'other' || !formData.licenseType) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('guards.licenses.form.customLicenseName', { defaultValue: 'Nombre personalizado' })}</label>
                          <input
                            type="text"
                            value={formData.customLicenseName}
                            onChange={(e) => setFormData({ ...formData, customLicenseName: e.target.value })}
                            placeholder={t('guards.licenses.form.customLicensePlaceholder', { defaultValue: 'Nombre (si aplica)' })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('guards.licenses.form.frontImageLabel', { defaultValue: 'Imagen frontal' })}</label>
                        <div>
                          <input type="file" accept="image/*" id="frontImage" className="hidden" onChange={(e) => setFormData({ ...formData, frontImage: e.target.files?.[0] || null })} />
                          <label htmlFor="frontImage" className="flex items-center gap-2 px-3 h-10 rounded-md border border-input bg-background text-sm cursor-pointer">
                            <Paperclip className="text-gray-400" />
                            <span className="text-sm text-gray-600">{formData.frontImage ? formData.frontImage.name : t('guards.licenses.form.chooseFile', { defaultValue: 'Seleccionar archivo' })}</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('guards.licenses.form.backImageLabel', { defaultValue: 'Imagen trasera' })}</label>
                        <div>
                          <input type="file" accept="image/*" id="backImage" className="hidden" onChange={(e) => setFormData({ ...formData, backImage: e.target.files?.[0] || null })} />
                          <label htmlFor="backImage" className="flex items-center gap-2 px-3 h-10 rounded-md border border-input bg-background text-sm cursor-pointer">
                            <Paperclip className="text-gray-400" />
                            <span className="text-sm text-gray-600">{formData.backImage ? formData.backImage.name : t('guards.licenses.form.chooseFile', { defaultValue: 'Seleccionar archivo' })}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
                  <Button variant="ghost" onClick={handleCloseModal}>{t('guards.licenses.modal.cancel', { defaultValue: 'Cancelar' })}</Button>
                  <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={handleSubmitLicense}>{t('guards.licenses.modal.save', { defaultValue: 'Guardar' })}</Button>
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
                setFormData((f) => ({ ...f, licenseType: String(added.id) }));
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
          <div className="fixed inset-0 z-50" onClick={closeDetails}>
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                <h2 className="text-lg font-semibold text-gray-800">{t('guards.licenses.details.title', { defaultValue: 'License details' })}</h2>
                <div className="flex items-center gap-2">
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
                  }} className="text-gray-500 hover:text-gray-700">{t('guards.licenses.details.edit', { defaultValue: 'Editar' })}</button>
                  <button onClick={closeDetails} className="text-gray-500 hover:text-gray-700"><X /></button>
                </div>
              </div>

              <div className="p-6">
                {detailsLoading && <div className="text-sm text-gray-500">{t('loading', { defaultValue: 'Loading...' })}</div>}
                {!detailsLoading && !detailsData && (
                  <div className="text-sm text-gray-500">{t('guards.licenses.details.notFound', { defaultValue: 'Details not available' })}</div>
                )}

                {!detailsLoading && detailsData && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-500">{t('guards.licenses.table.type', { defaultValue: 'License Type' })}</div>
                      <div className="text-sm font-medium">{detailsData.licenseType?.name || detailsData.customName || '-'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">{t('guards.licenses.form.licenseNumber', { defaultValue: 'Número de licencia' })}</div>
                      <div className="text-sm">{detailsData.number || '-'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">{t('guards.licenses.form.issueDate', { defaultValue: 'Issued' })}</div>
                      <div className="text-sm">{detailsData.issueDate ? new Date(detailsData.issueDate).toLocaleDateString() : '-'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">{t('guards.licenses.form.expiryDate', { defaultValue: 'Vence el' })}</div>
                      <div className="text-sm">{detailsData.expiryDate ? new Date(detailsData.expiryDate).toLocaleDateString() : '-'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">{t('guards.licenses.table.addedBy', { defaultValue: 'Added By' })}</div>
                      <div className="text-sm">{detailsData.createdBy?.fullName || detailsData.createdBy?.email || '-'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">{t('guards.licenses.form.frontImageLabel', { defaultValue: 'Imagen frontal' })}</div>
                      <div className="flex gap-2 mt-2">
                        {detailsData.frontImage?.map((f: any, idx: number) => (
                          <a key={idx} href={f.privateUrl ?? f.publicUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">{f.name || (f.publicUrl ? 'Ver' : 'Descargar')}</a>
                        ))}
                        {!detailsData.frontImage?.length && <div className="text-sm text-gray-500">-</div>}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">{t('guards.licenses.form.backImageLabel', { defaultValue: 'Imagen trasera' })}</div>
                      <div className="flex gap-2 mt-2">
                        {detailsData.backImage?.map((f: any, idx: number) => (
                          <a key={idx} href={f.privateUrl ?? f.publicUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">{f.name || (f.publicUrl ? 'Ver' : 'Descargar')}</a>
                        ))}
                        {!detailsData.backImage?.length && <div className="text-sm text-gray-500">-</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
                <Button variant="outline" onClick={async () => {
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
                }}>{t('guards.licenses.details.download', { defaultValue: 'Descargar' })}</Button>
                <Button variant="ghost" onClick={closeDetails}>{t('guards.licenses.modal.close', { defaultValue: 'Cerrar' })}</Button>
              </div>
            </div>
          </div>
        )}
      </GuardsLayout>
    </AppLayout>
  );
}
