import { useState, useEffect, useRef, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Search, Pencil, Trash2, X, Package, ChevronDown, ChevronUp, ImagePlus, ZoomIn,
  CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { PageContainer, PageHeader, Section, Stagger, StatCard, StatusBadge, EmptyState, Modal } from '@/components/kit';
import inventoryItemService, {
  InventoryItem, InventoryItemInput, InventoryItemPhoto, ItemType, ItemCondition, ItemStatus,
  ITEM_TYPE_LABELS, ITEM_STATUS_LABELS, ITEM_CONDITION_LABELS, ITEM_STATUS_COLORS,
} from '@/lib/api/inventoryItemService';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';

// Shape of the errors thrown by the API layer (axios-style response envelope).
type ApiError = { response?: { data?: { message?: string } }; message?: string };

const ITEM_TYPES = Object.keys(ITEM_TYPE_LABELS) as ItemType[];
const STATUSES = Object.keys(ITEM_STATUS_LABELS) as ItemStatus[];
const CONDITIONS = Object.keys(ITEM_CONDITION_LABELS) as ItemCondition[];

const CONDITION_COLORS: Record<ItemCondition, string> = {
  bueno: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  regular: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  dañado: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

const EMPTY_FORM: InventoryItemInput = {
  name: '',
  type: 'radio',
  brand: '',
  modelName: '',
  serialNumber: '',
  condition: 'bueno',
  status: 'disponible',
  notes: '',
  expirationDate: '',
  photos: [],
};

export default function GlobalInventoryPage() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  useScrollToTopOnMount(containerRef);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<InventoryItemInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded row for details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const filter: Record<string, string> = {};
      if (query) filter['name'] = query;
      if (filterType) filter['type'] = filterType;
      if (filterStatus) filter['status'] = filterStatus;
      const res = await inventoryItemService.list({
        filter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setItems(res.rows || []);
      setTotal(res.count || 0);
    } catch (e) {
      toast.error((e as ApiError)?.message || 'Error cargando inventario');
    } finally {
      setLoading(false);
    }
  };

  // Debounce text search into a settled value that drives loading.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Reset to first page when the settled search text changes (filter Selects
  // reset the page imperatively in their onValueChange to avoid a double fetch).
  useEffect(() => { setPage(0); }, [debouncedQuery]);

  // Single source of truth for list requests: exactly one per settled change.
  useEffect(() => { load(); }, [page, debouncedQuery, filterType, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      type: item.type,
      brand: item.brand || '',
      modelName: item.modelName || '',
      serialNumber: item.serialNumber || '',
      condition: item.condition,
      status: item.status,
      notes: item.notes || '',
      expirationDate: item.expirationDate || '',
      photos: item.photos || [],
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingItem(null); };

  const setField = <K extends keyof InventoryItemInput>(k: K, v: InventoryItemInput[K]) =>
    setForm((f) => ({ ...f, [k]: v } as InventoryItemInput));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    try {
      setSaving(true);
      const payload: InventoryItemInput = {
        ...form,
        brand: form.brand || undefined,
        modelName: form.modelName || undefined,
        serialNumber: form.serialNumber || undefined,
        notes: form.notes || undefined,
        expirationDate: form.expirationDate || undefined,
        photos: form.photos || [],
      };
      if (editingItem) {
        await inventoryItemService.update(editingItem.id, payload);
        toast.success('Artículo actualizado');
      } else {
        await inventoryItemService.create(payload);
        toast.success('Artículo creado');
      }
      closeModal();
      load();
    } catch (e) {
      toast.error((e as ApiError)?.response?.data?.message || (e as ApiError)?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Validate: images only, max 20MB each
    for (const file of files) {
      if (!file.type.startsWith('image/')) { toast.error(`"${file.name}" no es una imagen válida`); return; }
      if (file.size > 20 * 1024 * 1024) { toast.error(`"${file.name}" excede el límite de 20 MB`); return; }
    }
    setUploadingPhoto(true);
    try {
      const uploaded: InventoryItemPhoto[] = await Promise.all(
        files.map((f) => inventoryItemService.uploadPhoto(f)),
      );
      setForm((prev) => ({ ...prev, photos: [...(prev.photos || []), ...uploaded] }));
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Error subiendo imagen');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const removePhoto = (idx: number) =>
    setForm((prev) => ({ ...prev, photos: (prev.photos || []).filter((_, i) => i !== idx) }));

  const getPhotoUrl = (photo: InventoryItemPhoto) =>
    photo.downloadUrl || photo.publicUrl || photo.privateUrl || null;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await inventoryItemService.delete([deleteTarget.id]);
      toast.success('Artículo eliminado');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error((e as ApiError)?.response?.data?.message || (e as ApiError)?.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppLayout>
      <div ref={containerRef}>
      <PageContainer width="wide" className="px-4 py-6">
        <Breadcrumb
          items={[
            { label: 'Panel de control', path: '/dashboard' },
            { label: 'Inventario Global' },
          ]}
        />

        <PageHeader
          icon={<Package />}
          title="Inventario Global"
          subtitle="Catálogo de equipos y recursos de la empresa"
          actions={(
            <Button variant="brand" onClick={openCreate} className="shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Nuevo artículo
            </Button>
          )}
        />

        <Stagger className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Artículos" value={total} icon={<Package />} accent="primary" />
          <StatCard label="Disponibles" value={items.filter((i) => i.status === 'disponible').length} icon={<CheckCircle2 />} accent="green" />
          <StatCard label="Dañados" value={items.filter((i) => i.condition === 'dañado').length} icon={<AlertTriangle />} accent="red" />
        </Stagger>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 cg-card p-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={filterType || '__all__'} onValueChange={(v) => { setPage(0); setFilterType(v === '__all__' ? '' : v); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los tipos</SelectItem>
              {ITEM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{ITEM_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus || '__all__'} onValueChange={(v) => { setPage(0); setFilterStatus(v === '__all__' ? '' : v); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los estados</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ITEM_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(query || filterType || filterStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setQuery(''); setFilterType(''); setFilterStatus(''); }}
            >
              <X className="w-4 h-4 mr-1" /> Limpiar
            </Button>
          )}
        </div>

        {/* Table */}
        <Section
          title="Catálogo de inventario"
          icon={<Package />}
          action={<span className="text-sm text-muted-foreground">{loading ? 'Cargando...' : `${total} artículo${total !== 1 ? 's' : ''}`}</span>}
          contentClassName="-mx-5 -mb-5 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70 w-10"></th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70 hidden sm:table-cell">N° Serie</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70 hidden md:table-cell">Condición</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground/70">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Cargando...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6">
                      <EmptyState
                        icon={<Package />}
                        title="Sin artículos en el catálogo"
                        description="Agrega tu primer equipo o recurso para empezar a inventariar."
                        action={(
                          <Button size="sm" variant="brand" onClick={openCreate}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Agregar primer artículo
                          </Button>
                        )}
                      />
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <Fragment key={item.id}>
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/30 cursor-pointer transition-colors ${expandedId === item.id ? 'bg-blue-500/10' : ''}`}
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        <td className="px-2 py-3 w-10">
                          <button className="text-muted-foreground p-1 hover:text-foreground/70">
                            {expandedId === item.id
                              ? <ChevronUp className="w-4 h-4" />
                              : <ChevronDown className="w-4 h-4" />
                            }
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{item.name}</span>
                        </td>
                        <td className="px-4 py-3 text-foreground/70">
                          {ITEM_TYPE_LABELS[item.type] || item.type}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                          {item.serialNumber || '—'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONDITION_COLORS[item.condition]}`}>
                            {ITEM_CONDITION_LABELS[item.condition]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ITEM_STATUS_COLORS[item.status]}`}>
                            {ITEM_STATUS_LABELS[item.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-blue-600 transition-colors"
                              onClick={() => openEdit(item)}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors"
                              onClick={() => setDeleteTarget(item)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedId === item.id && (
                        <tr key={`${item.id}-detail`} className="bg-blue-500/10">
                          <td colSpan={7} className="px-6 py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                              {item.brand && (
                                <div>
                                  <span className="text-muted-foreground block">Marca</span>
                                  <span className="font-medium text-foreground">{item.brand}</span>
                                </div>
                              )}
                              {item.modelName && (
                                <div>
                                  <span className="text-muted-foreground block">Modelo</span>
                                  <span className="font-medium text-foreground">{item.modelName}</span>
                                </div>
                              )}
                              {item.serialNumber && (
                                <div>
                                  <span className="text-muted-foreground block">N° Serie</span>
                                  <span className="font-mono font-medium text-foreground">{item.serialNumber}</span>
                                </div>
                              )}
                              {item.expirationDate && (
                                <div>
                                  <span className="text-muted-foreground block">Vencimiento</span>
                                  <span className="font-medium text-foreground">
                                    {new Date(item.expirationDate).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {item.notes && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground block">Notas</span>
                                  <span className="text-foreground">{item.notes}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground block">Creado</span>
                                <span className="text-foreground">
                                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                                </span>
                              </div>
                              {item.photos && item.photos.length > 0 && (
                                <div className="col-span-full mt-1">
                                  <span className="text-muted-foreground block mb-1.5">Fotos</span>
                                  <div className="flex flex-wrap gap-2">
                                    {item.photos.map((photo, idx) => {
                                      const src = photo.downloadUrl || photo.publicUrl || null;
                                      return src ? (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setLightboxSrc(src); }}
                                          className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-blue-400 transition-all flex-shrink-0"
                                        >
                                          <img src={src} alt="" className="w-full h-full object-cover" />
                                        </button>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Section>
      </PageContainer>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onOpenChange={(o) => { if (!o) closeModal(); }}
        title={editingItem ? 'Editar artículo' : 'Nuevo artículo'}
        icon={<Package className="h-5 w-5" />}
        size="md"
        footer={(
          <>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Crear artículo'}
            </Button>
          </>
        )}
      >
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <Label htmlFor="inv-name">Nombre <span className="text-red-500">*</span></Label>
                <Input
                  id="inv-name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Ej: Radio Motorola #3"
                />
              </div>

              {/* Type */}
              <div className="space-y-1">
                <Label>Tipo <span className="text-red-500">*</span></Label>
                <Select value={form.type} onValueChange={(v) => setField('type', v as ItemType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{ITEM_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand + Model */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="inv-brand">Marca</Label>
                  <Input
                    id="inv-brand"
                    value={form.brand}
                    onChange={(e) => setField('brand', e.target.value)}
                    placeholder="Motorola"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="inv-model">Modelo</Label>
                  <Input
                    id="inv-model"
                    value={form.modelName}
                    onChange={(e) => setField('modelName', e.target.value)}
                    placeholder="EP350"
                  />
                </div>
              </div>

              {/* Serial */}
              <div className="space-y-1">
                <Label htmlFor="inv-serial">Número de serie</Label>
                <Input
                  id="inv-serial"
                  value={form.serialNumber}
                  onChange={(e) => setField('serialNumber', e.target.value)}
                  placeholder="SN-12345"
                />
              </div>

              {/* Condition + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Condición</Label>
                  <Select value={form.condition} onValueChange={(v) => setField('condition', v as ItemCondition)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{ITEM_CONDITION_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Estado</Label>
                  <Select value={form.status} onValueChange={(v) => setField('status', v as ItemStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{ITEM_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Expiration (only for vest / weapon) */}
              {(form.type === 'chaleco_antibalas' || form.type === 'arma') && (
                <div className="space-y-1">
                  <Label htmlFor="inv-exp">Fecha de vencimiento</Label>
                  <Input
                    id="inv-exp"
                    type="date"
                    value={form.expirationDate}
                    onChange={(e) => setField('expirationDate', e.target.value)}
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="inv-notes">Notas (opcional)</Label>
                <textarea
                  id="inv-notes"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Observaciones adicionales..."
                />
              </div>

              {/* Photos */}
              <div className="space-y-2">
                <Label>Fotos del artículo</Label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border rounded-lg w-full justify-center text-sm text-muted-foreground hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                >
                  {uploadingPhoto
                    ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                    : <ImagePlus className="w-4 h-4" />}
                  {uploadingPhoto ? 'Subiendo...' : 'Agregar fotos'}
                </button>
                {(form.photos || []).length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {(form.photos || []).map((photo, idx) => {
                      const src = getPhotoUrl(photo);
                      return (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted/30">
                          {src ? (
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/60">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
      </Modal>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Eliminar artículo"
        icon={<Trash2 className="h-5 w-5" />}
        size="sm"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-foreground/70">
          ¿Estás seguro de que quieres eliminar{' '}
          <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
          Esta acción no se puede deshacer.
        </p>
      </Modal>
    </AppLayout>
  );
}
