import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import {
  createBanner,
  createCertification,
  deleteBanner,
  deleteCertification,
  listBanners,
  listCertifications,
  updateBanner,
  updateCertification,
  uploadBannerImage,
  uploadCertificationIcon,
  uploadCertificationImage,
  listServices,
  updateService,
  createService,
  deleteService,
} from './MobilService';

interface BannerItem {
  id: string;
  title: string;
  description?: string;
  link?: string;
  imageUrl?: any[];
}

interface CertificationItem {
  id: string;
  title: string;
  code: string;
  description: string;
  acquisitionDate?: string;
  expirationDate?: string;
  image?: any[];
  icon?: any[];
}

const defaultBannerForm = {
  title: '',
  description: '',
  link: '',
  imageFile: null as File | null,
  imageUrl: [] as any[],
};

const defaultCertificationForm = {
  title: '',
  code: '',
  description: '',
  acquisitionDate: '',
  expirationDate: '',
  imageFile: null as File | null,
  iconFile: null as File | null,
  image: [] as any[],
  icon: [] as any[],
};

export default function MobilPage() {
  const [loading, setLoading] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [bannerItems, setBannerItems] = useState<BannerItem[]>([]);
  const [certItems, setCertItems] = useState<CertificationItem[]>([]);
  const [bannerForm, setBannerForm] = useState(defaultBannerForm);
  const [certForm, setCertForm] = useState(defaultCertificationForm);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<{
    id: string;
    label: string;
    type: 'banner' | 'certification' | 'service';
  } | null>(null);

  const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');

    const resolveFileUrl = (file: any) => {
    const rawUrl = file?.downloadUrl || file?.publicUrl || file?.privateUrl || '';
    const url = String(rawUrl || '').trim();
    if (!url) return '';

    if (/^https?:\/\//i.test(url)) {
      try {
        return encodeURI(url);
      } catch {
        return url;
      }
    }

    const apiBase = API_BASE_URL.replace(/\/+$/g, '');
    const apiRoot = apiBase.replace(/\/api$/i, '');

    if (url.startsWith('/')) {
      try {
        return new URL(url, apiRoot).toString();
      } catch {
        return `${apiRoot}${url}`;
      }
    }

    return `${apiBase}/file/download?privateUrl=${encodeURIComponent(url)}`;
  };

  const resolveBannerImageUrl = (item: BannerItem) => {
    return resolveFileUrl(item.imageUrl?.[0]);
  };

  const resolveCertificationImageUrl = (item: CertificationItem) => {
    return resolveFileUrl(item.image?.[0]);
  };

  const resolveCertificationIconUrl = (item: CertificationItem) => {
    return resolveFileUrl(item.icon?.[0]);
  };

  const openBannerPreview = (url: string) => {
    setImagePreviewUrl(url);
    setImagePreviewOpen(true);
  };

  const closeBannerPreview = () => {
    setImagePreviewOpen(false);
    setImagePreviewUrl(null);
  };

  const IMAGE_MAX_SIZE_MB = 10;
  const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024;
  const ICON_MAX_SIZE_MB = 3;
  const ICON_MAX_SIZE_BYTES = ICON_MAX_SIZE_MB * 1024 * 1024;

  const setBannerImageFile = (file: File | null) => {
    if (!file) {
      setBannerForm({ ...bannerForm, imageFile: null });
      return;
    }
    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      toast.error(`El archivo supera el límite de ${IMAGE_MAX_SIZE_MB} MB.`);
      return;
    }
    setBannerForm({ ...bannerForm, imageFile: file });
  };

  const setCertImageFile = (file: File | null) => {
    if (!file) {
      setCertForm({ ...certForm, imageFile: null });
      return;
    }
    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      toast.error(`El archivo supera el límite de ${IMAGE_MAX_SIZE_MB} MB.`);
      return;
    }
    setCertForm({ ...certForm, imageFile: file });
  };

  const setCertIconFile = (file: File | null) => {
    if (!file) {
      setCertForm({ ...certForm, iconFile: null });
      return;
    }
    if (file.size > ICON_MAX_SIZE_BYTES) {
      toast.error(`El archivo supera el límite de ${ICON_MAX_SIZE_MB} MB.`);
      return;
    }
    setCertForm({ ...certForm, iconFile: file });
  };

  const hasBannerImage = bannerForm.imageFile || bannerForm.imageUrl?.length > 0;
  const hasCertImage = certForm.imageFile || certForm.image?.length > 0;
  const hasCertIcon = certForm.iconFile || certForm.icon?.length > 0;

  const loadData = async () => {
    setLoading(true);
    try {
      const [banners, certifications, services] = await Promise.all([
        listBanners(),
        listCertifications(),
        listServices(),
      ]);
      setBannerItems(banners);
      setCertItems(certifications);
      setServices(services);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar la información de Mobil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateBanner = () => {
    setEditingBannerId(null);
    setBannerForm(defaultBannerForm);
    setBannerDialogOpen(true);
  };

  const openEditBanner = (item: BannerItem) => {
    setEditingBannerId(item.id);
    setBannerForm({
      title: item.title || '',
      description: item.description || '',
      link: item.link || '',
      imageFile: null,
      imageUrl: item.imageUrl ?? [],
    });
    setBannerDialogOpen(true);
  };

  const openCreateCertification = () => {
    setEditingCertificateId(null);
    setCertForm(defaultCertificationForm);
    setCertDialogOpen(true);
  };

  const openEditCertification = (item: CertificationItem) => {
    setEditingCertificateId(item.id);
    setCertForm({
      title: item.title || '',
      code: item.code || '',
      description: item.description || '',
      acquisitionDate: item.acquisitionDate || '',
      expirationDate: item.expirationDate || '',
      imageFile: null,
      iconFile: null,
      image: item.image ?? [],
      icon: item.icon ?? [],
    });
    setCertDialogOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!bannerForm.title.trim()) {
      toast.error('El título del banner es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: bannerForm.title,
        description: bannerForm.description,
        imageUrl: bannerForm.imageUrl,
      };

      if (bannerForm.imageFile) {
        const uploaded = await uploadBannerImage(bannerForm.imageFile);
        if (uploaded) {
          payload.imageUrl = [uploaded];
          payload.link = uploaded.privateUrl || uploaded.publicUrl || '';
        }
      } else if (bannerForm.imageUrl?.length > 0) {
        const existingFile = bannerForm.imageUrl[0];
        payload.link = bannerForm.link || existingFile?.privateUrl || existingFile?.publicUrl || '';
      }

      if (editingBannerId) {
        await updateBanner(editingBannerId, payload);
        toast.success('Banner actualizado.');
      } else {
        await createBanner(payload);
        toast.success('Banner creado.');
      }
      setBannerDialogOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el banner.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCertification = async () => {
    if (!certForm.title.trim() || !certForm.code.trim() || !certForm.description.trim()) {
      toast.error('Título, código y descripción son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: certForm.title,
        code: certForm.code,
        description: certForm.description,
        acquisitionDate: certForm.acquisitionDate || undefined,
        expirationDate: certForm.expirationDate || undefined,
        image: certForm.image,
        icon: certForm.icon,
      };

      if (certForm.imageFile) {
        const uploaded = await uploadCertificationImage(certForm.imageFile);
        if (uploaded) {
          payload.image = [uploaded];
        }
      }

      if (certForm.iconFile) {
        const uploaded = await uploadCertificationIcon(certForm.iconFile);
        if (uploaded) {
          payload.icon = [uploaded];
        }
      }

      if (editingCertificateId) {
        await updateCertification(editingCertificateId, payload);
        toast.success('Certificación actualizada.');
      } else {
        await createCertification(payload);
        toast.success('Certificación creada.');
      }
      setCertDialogOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la certificación.');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirmation = (id: string, label: string, type: 'banner' | 'certification' | 'service') => {
    setConfirmDeleteItem({ id, label, type });
    setConfirmDeleteOpen(true);
  };

  const closeDeleteConfirmation = () => {
    setConfirmDeleteOpen(false);
    setConfirmDeleteItem(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteItem) return;
    setConfirmDeleteOpen(false);
    setLoading(true);
    try {
      if (confirmDeleteItem.type === 'banner') {
        await deleteBanner(confirmDeleteItem.id);
        toast.success('Banner eliminado.');
      } else if (confirmDeleteItem.type === 'certification') {
        await deleteCertification(confirmDeleteItem.id);
        toast.success('Certificación eliminada.');
      } else if (confirmDeleteItem.type === 'service') {
        await deleteService(confirmDeleteItem.id);
        toast.success('Servicio eliminado.');
      }
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(
        confirmDeleteItem.type === 'banner'
          ? 'No se pudo eliminar el banner.'
          : confirmDeleteItem.type === 'certification'
          ? 'No se pudo eliminar la certificación.'
          : 'No se pudo eliminar el servicio.',
      );
    } finally {
      setLoading(false);
      setConfirmDeleteItem(null);
    }
  };

  const bannerTitle = editingBannerId ? 'Editar Banner Superior' : 'Nuevo Banner Superior';
  const certTitle = editingCertificateId ? 'Editar Certificación' : 'Nueva Certificación';

  const [services, setServices] = useState<any[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const defaultServiceForm = {
    title: '',
    description: '',
    price: '' as any,
    publishedOnMobile: false,
  };
  const [serviceForm, setServiceForm] = useState(defaultServiceForm);

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="MOBIL">
        <div className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">MOBIL</h1>
              <p className="text-sm text-muted-foreground">Administra banners y certificaciones desde este módulo.</p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
 
                <DialogContent className="w-[800px] max-w-full">
                  <DialogHeader>
                    <DialogTitle>Pricebook (Servicios)</DialogTitle>
                    <DialogDescription>Lista de servicios publicados por este tenant. La app móvil puede consumir estos servicios.</DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <Table className="table-fixed">
                      <colgroup>
                        <col style={{ width: '35%' }} />
                        <col style={{ width: '45%' }} />
                        <col style={{ width: '20%' }} />
                      </colgroup>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Publicado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {services.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{s.title}</TableCell>
                            <TableCell className="truncate">{s.description}</TableCell>
                            <TableCell>{s.price ?? '-'}</TableCell>
                            <TableCell>
                              <Switch
                                checked={Boolean(s.publishedOnMobile)}
                                onCheckedChange={async (checked) => {
                                  try {
                                    setServices((prev) => prev.map((it) => (it.id === s.id ? { ...it, publishedOnMobile: checked } : it)));
                                    await updateService(s.id, { publishedOnMobile: checked });
                                    // refresh full list to reflect server-side transforms
                                    const latest = await listServices();
                                    setServices(latest);
                                  } catch (err) {
                                    console.error(err);
                                    toast.error('No se pudo actualizar el estado de publicación.');
                                    setServices((prev) => prev.map((it) => (it.id === s.id ? { ...it, publishedOnMobile: s.publishedOnMobile } : it)));
                                  }
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost">Cerrar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Banner Superior</h2>
                <p className="text-sm text-muted-foreground">Crea, edita o elimina banners superiores.</p>
              </div>
              <Button onClick={openCreateBanner} className="inline-flex items-center gap-2 bg-orange-500 text-white hover:bg-orange-600">
                <Plus className="h-4 w-4" /> Nuevo banner
              </Button>
            </div>

            <Table className="table-fixed">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '45%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Imagen</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bannerItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                      {loading ? 'Cargando...' : 'No hay banners registrados.'}
                    </TableCell>
                  </TableRow>
                )}
                {bannerItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell className="text-center">
                        {resolveBannerImageUrl(item) ? (
                          <button
                            type="button"
                            onClick={() => openBannerPreview(resolveBannerImageUrl(item))}
                            className="group inline-flex items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white p-0 shadow-sm hover:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                          >
                            <img
                              src={resolveBannerImageUrl(item)}
                              alt={item.title || 'Banner'}
                              className="h-16 w-32 object-cover transition duration-200 group-hover:scale-105"
                              decoding="async"
                              crossOrigin="anonymous"
                            />
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground">{item.imageUrl?.length ?? 0} archivo(s)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50" onClick={() => openEditBanner(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openDeleteConfirmation(item.id, item.title || 'este banner', 'banner')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </section>

          <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Pricebook (Servicios)</h2>
                <p className="text-sm text-muted-foreground">Lista de servicios del tenant. Estos son consumidos por la app móvil.</p>
              </div>
              <div>
                <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                    <DialogTrigger asChild>
                    <Button onClick={() => { setEditingServiceId(null); setServiceForm(defaultServiceForm); setServiceDialogOpen(true); }} className="inline-flex items-center gap-2 bg-orange-500 text-white hover:bg-orange-600">
                      <Plus className="h-4 w-4" /> Nuevo servicio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingServiceId ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
                      <DialogDescription>Configura un servicio para la app móvil.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Título*</Label>
                        <Input value={serviceForm.title} onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })} placeholder="Título del servicio" />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} rows={4} />
                      </div>
                      <div>
                        <Label>Precio</Label>
                        <Input value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} placeholder="0.00" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Publicado en App</Label>
                        <Switch checked={Boolean(serviceForm.publishedOnMobile)} onCheckedChange={(val) => setServiceForm({ ...serviceForm, publishedOnMobile: !!val })} />
                      </div>
                    </div>
                    <DialogFooter className="mt-6 flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>Cancelar</Button>
                      <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={async () => {
                        try {
                          const payload: any = {
                            title: serviceForm.title,
                            description: serviceForm.description,
                            price: serviceForm.price || null,
                            publishedOnMobile: serviceForm.publishedOnMobile,
                          };
                          if (editingServiceId) {
                            await updateService(editingServiceId, payload);
                            toast.success('Servicio actualizado.');
                          } else {
                            await createService(payload);
                            toast.success('Servicio creado.');
                          }
                          setServiceDialogOpen(false);
                          loadData();
                        } catch (err) {
                          console.error(err);
                          toast.error('No se pudo guardar el servicio.');
                        }
                      }}>Guardar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div>
              <Table className="table-fixed">
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.title}</TableCell>
                      <TableCell className="truncate">{s.description}</TableCell>
                      <TableCell>{s.price ?? '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50" onClick={() => { setEditingServiceId(s.id); setServiceForm({ title: s.title || '', description: s.description || '', price: s.price ?? '', publishedOnMobile: !!s.publishedOnMobile }); setServiceDialogOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openDeleteConfirmation(s.id, s.title || 'este servicio', 'service')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Certificaciones</h2>
                <p className="text-sm text-muted-foreground">Administra certificaciones con fechas, archivos e íconos.</p>
              </div>
              <Button onClick={openCreateCertification} className="inline-flex items-center gap-2 bg-orange-500 text-white hover:bg-orange-600">
                <Plus className="h-4 w-4" /> Nueva certificación
              </Button>
            </div>

            <Table className="table-fixed">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-center">Imagen</TableHead>
                  <TableHead className="text-center">Icono</TableHead>
                  <TableHead className="text-center">Adquisición</TableHead>
                  <TableHead className="text-center">Vencimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      {loading ? 'Cargando...' : 'No hay certificaciones registradas.'}
                    </TableCell>
                  </TableRow>
                )}
                {certItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell className="text-center">
                      {resolveCertificationImageUrl(item) ? (
                        <button
                          type="button"
                          onClick={() => openBannerPreview(resolveCertificationImageUrl(item))}
                          className="group inline-flex items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white p-0 shadow-sm hover:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                        >
                          <img
                            src={resolveCertificationImageUrl(item)}
                            alt={item.title || 'Imagen certificación'}
                            className="h-16 w-32 object-contain transition duration-200 group-hover:scale-105"
                            decoding="async"
                            crossOrigin="anonymous"
                          />
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin imagen</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {resolveCertificationIconUrl(item) ? (
                        <button
                          type="button"
                          onClick={() => openBannerPreview(resolveCertificationIconUrl(item))}
                          className="group inline-flex items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white p-0 shadow-sm hover:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                        >
                          <img
                            src={resolveCertificationIconUrl(item)}
                            alt={item.title || 'Icono certificación'}
                            className="h-16 w-16 object-contain transition duration-200 group-hover:scale-105"
                            decoding="async"
                            crossOrigin="anonymous"
                          />
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin icono</span>
                      )}
                    </TableCell>
                    <TableCell>{item.acquisitionDate || '-'}</TableCell>
                    <TableCell>{item.expirationDate || '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50" onClick={() => openEditCertification(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openDeleteConfirmation(item.id, item.title || 'esta certificación', 'certification')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>

        <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="text-center">
              <DialogTitle className="mx-auto">{bannerTitle}</DialogTitle>
              <DialogDescription>Configura el banner que se mostrará en el módulo MOBIL.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Título*</Label>
                <Input
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="Título del banner"
                  required
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={bannerForm.description}
                  onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                  placeholder="Descripción del banner"
                  rows={3}
                />
              </div>
              <div>
                <Label>Imagen</Label>
                <div className="grid gap-2">
                  <div className="flex justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label
                            htmlFor="bannerImage"
                            className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 cursor-pointer"
                          >
                            Seleccionar archivo
                          </label>
                        </TooltipTrigger>
                        <TooltipContent>Límite de archivo: {IMAGE_MAX_SIZE_MB} MB.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <input
                      id="bannerImage"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => setBannerImageFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">Límite de tamaño por imagen: {IMAGE_MAX_SIZE_MB} MB.</p>
                  <div className="min-h-[54px] rounded-md border border-dashed border-gray-300 bg-slate-50 px-4 py-3 text-sm text-muted-foreground flex items-center justify-center text-center">
                    {bannerForm.imageFile ? bannerForm.imageFile.name : bannerForm.imageUrl?.[0]?.name || 'No se ha seleccionado archivo'}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button variant="outline" className="text-black border-black hover:bg-slate-100" onClick={() => setBannerDialogOpen(false)}>Cancelar</Button>
              <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={handleSaveBanner} disabled={loading}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="text-center">
              <DialogTitle className="mx-auto">{certTitle}</DialogTitle>
              <DialogDescription>Configura los datos de la certificación y sus archivos.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Título*</Label>
                <Input
                  value={certForm.title}
                  onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                  placeholder="Título de la certificación"
                  required
                />
              </div>
              <div>
                <Label>Código*</Label>
                <Input
                  value={certForm.code}
                  onChange={(e) => setCertForm({ ...certForm, code: e.target.value })}
                  placeholder="Código interno"
                  required
                />
              </div>
              <div>
                <Label>Descripción*</Label>
                <Textarea
                  value={certForm.description}
                  onChange={(e) => setCertForm({ ...certForm, description: e.target.value })}
                  placeholder="Descripción de la certificación"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de adquisición</Label>
                  <Input
                    type="date"
                    value={certForm.acquisitionDate}
                    onChange={(e) => setCertForm({ ...certForm, acquisitionDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fecha de expiración</Label>
                  <Input
                    type="date"
                    value={certForm.expirationDate}
                    onChange={(e) => setCertForm({ ...certForm, expirationDate: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <div>
                <Label>Imagen</Label>
                <div className="grid gap-2">
                  <div className="flex justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label
                            htmlFor="certImage"
                            className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 cursor-pointer"
                          >
                            Seleccionar archivo
                          </label>
                        </TooltipTrigger>
                        <TooltipContent>Límite de archivo: {IMAGE_MAX_SIZE_MB} MB.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <input
                      id="certImage"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => setCertImageFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">Límite de tamaño por imagen: {IMAGE_MAX_SIZE_MB} MB.</p>
                  <div className="min-h-[54px] rounded-md border border-dashed border-gray-300 bg-slate-50 px-4 py-3 text-sm text-muted-foreground flex items-center justify-center text-center">
                    {certForm.imageFile ? certForm.imageFile.name : certForm.image?.[0]?.name || 'No se ha seleccionado archivo'}
                  </div>
                </div>
              </div>
              <div>
                <Label>Icono</Label>
                <div className="grid gap-2">
                  <div className="flex justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label
                            htmlFor="certIcon"
                            className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 cursor-pointer"
                          >
                            Seleccionar archivo
                          </label>
                        </TooltipTrigger>
                        <TooltipContent>Límite de icono: {ICON_MAX_SIZE_MB} MB.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <input
                      id="certIcon"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => setCertIconFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">Límite de tamaño del icono: {ICON_MAX_SIZE_MB} MB.</p>
                  <div className="min-h-[54px] rounded-md border border-dashed border-gray-300 bg-slate-50 px-4 py-3 text-sm text-muted-foreground flex items-center justify-center text-center">
                    {certForm.iconFile ? certForm.iconFile.name : certForm.icon?.[0]?.name || 'No se ha seleccionado archivo'}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button variant="outline" className="text-black border-black hover:bg-slate-100" onClick={() => setCertDialogOpen(false)}>Cancelar</Button>
              <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={handleSaveCertification} disabled={loading}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
          <DialogContent
            showCloseButton={false}
            className="w-full max-w-[920px] max-h-[90vh] overflow-hidden rounded-3xl bg-white border border-slate-200 p-0 shadow-2xl"
          >
            <DialogHeader className="flex items-center justify-center gap-4 border-b border-slate-200 px-4 py-4 bg-white">
              <DialogTitle className="text-lg font-semibold text-slate-900">Vista previa</DialogTitle>
            </DialogHeader>
            <div className="flex min-h-[60vh] items-center justify-center overflow-hidden bg-slate-100 p-4">
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Banner preview"
                  className="max-h-[82vh] max-w-full rounded-3xl border border-slate-200 bg-white object-contain"
                  decoding="async"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="text-sm text-slate-500">No hay imagen para previsualizar.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader className="text-center">
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro que quieres eliminar {confirmDeleteItem?.label}?
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 text-sm text-slate-700">
              Esta acción no se puede deshacer.
            </div>
            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button variant="outline" className="text-slate-700 border-slate-300 hover:bg-slate-100" onClick={closeDeleteConfirmation}>
                Cancelar
              </Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteConfirmed}>
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsLayout>
    </AppLayout>
  );
}
