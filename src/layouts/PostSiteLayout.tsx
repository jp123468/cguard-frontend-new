import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { ApiService } from '@/services/api/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Menu, X, ChevronLeft, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = { title?: string; children: ReactNode; site?: any };

export default function PostSiteLayout({ title, children, site }: Props) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { id } = useParams();

  // A "sitio de servicio" is a broad view over its stations. Only these sections
  // belong to its scope; per-station detail lives inside each station.
  const sections = [
    {
      items: [
        { id: 'overview', label: t('postSites.Details.Stats', 'Estadísticas'), path: `/post-sites/${id || ':id'}/overview` },
        { id: 'profile', label: t('postSites.Details.Profile', 'Perfil'), path: `/post-sites/${id || ':id'}/profile` },
        { id: 'contacts', label: t('postSites.Details.Contacts', 'Contactos'), path: `/post-sites/${id || ':id'}/contacts` },
        { id: 'assignGuards', label: t('postSites.Details.GuardsList', 'Lista de vigilantes'), path: `/post-sites/${id || ':id'}/assign-guards` },
        { id: 'postOrders', label: t('postSites.Details.OperationalRequirements', 'Requisitos operativos'), path: `/post-sites/${id || ':id'}/post-orders` },
        { id: 'tasks', label: t('postSites.Details.TasksAssigned', 'Tareas asignadas'), path: `/post-sites/${id || ':id'}/tasks` },
        { id: 'stations', label: t('postSites.Details.Stations', 'Estaciones'), path: `/post-sites/${id || ':id'}/stations` },
      ],
    },
  ];

  const resolve = (p: string) => (id && p.includes(':id') ? p.replace(':id', id) : p);
  const flatItems = sections.flatMap(s => s.items);
  const activeItem = flatItems.find(it => {
    const path = resolve(it.path);
    return location.pathname === path || location.pathname.startsWith(path + '/') || location.pathname.endsWith(path);
  });
  const headerLabel = activeItem ? activeItem.label : (site?.businessName || site?.companyName || site?.name || title || t('postSites.postsite', 'Post Site'));

  const navRef = useRef<HTMLDivElement | null>(null);

  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryStations, setInventoryStations] = useState<any[]>([]);
  const [inventoryStationId, setInventoryStationId] = useState<string | null>(null);
  const [inventoryName, setInventoryName] = useState<string>('');
  const [creatingInventory, setCreatingInventory] = useState(false);

  useEffect(() => {
    if (!inventoryModalOpen) return;
    let mounted = true;
    (async () => {
      try {
        const tenantId = (site && (site.tenantId || site.tenant && site.tenant.id)) || localStorage.getItem('tenantId') || '';
        const postSiteId = site?.id || id || '';
        if (!postSiteId) return;
        const res = await ApiService.get(`/tenant/${tenantId}/station?postSiteId=${encodeURIComponent(postSiteId)}&limit=999`);
        const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
        if (!mounted) return;
        const mapped = rows.map((r: any) => ({ id: r.id || r.stationId, label: r.name || r.stationName || r.station_name || String(r.id) }));
        setInventoryStations(mapped || []);
      } catch (e) {
        console.error('Failed loading stations for inventory modal', e);
        setInventoryStations([]);
      }
    })();
    return () => { mounted = false; };
  }, [inventoryModalOpen, site, id]);

  const submitCreateInventory = async () => {
    try {
      // Client-side validation: require name
      if (!String(inventoryName || '').trim()) {
        toast.error(t('postSites.inventories.nameRequired', 'El nombre es obligatorio'));
        return;
      }
      setCreatingInventory(true);
      const tenantId = (site && (site.tenantId || site.tenant && site.tenant.id)) || localStorage.getItem('tenantId') || '';
      const belongsTo = inventoryStationId || site?.id || id;
      const payload = { data: { belongsTo, name: inventoryName || `Inventario ${belongsTo}` } };
      await ApiService.post(`/tenant/${tenantId}/inventory`, payload);
      toast.success('Inventario creado');
      setInventoryModalOpen(false);
      setInventoryName('');
      setInventoryStationId(null);
    } catch (e: any) {
      console.error('Create inventory failed', e);
      toast.error(e?.message || 'No se pudo crear inventario');
    } finally {
      setCreatingInventory(false);
    }
  };

  useEffect(() => {
    if (!activeItem || !navRef.current) return;
    try {
      // Prefer selecting the active link via data attribute for reliability
      const activeEl = navRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    } catch (err) {
      // ignore any errors
    }
  }, [activeItem, id, location.pathname]);

  return (
    <AppLayout>
      <div className="flex gap-6 h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar */}
        <aside className={`shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
          <div className="h-full flex flex-col">
            <div className="bg-card border border-border rounded-md p-4 m-3 flex-1 overflow-hidden">
              <div className="text-lg font-semibold mb-4">{site?.businessName || site?.companyName || site?.name || title || t('postSites.postsite', 'Post Site')}</div>
              <nav className="text-base">
                <div ref={navRef} className="max-h-[calc(100vh-120px)] overflow-y-auto pr-3 pb-20">
                  {sections.map((section, idx) => (
                    <div key={idx} className="mb-0 pb-0">
                      <ul className="divide-y">
                                {section.items.map((it) => {
                                  const path = resolve(it.path);
                                  const isActive = location.pathname === path;
                                  return (
                                    <li key={it.id} className="bg-card">
                                      <Link
                                        to={path}
                                        data-active={isActive ? 'true' : undefined}
                                        className={`flex items-center justify-between px-5 py-3 text-sm ${
                                          isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent'
                                        }`}
                                      >
                                        <span>{it.label}</span>
                                      </Link>
                                    </li>
                                  );
                                })}
                      </ul>
                    </div>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="bg-card border-b border-border rounded-md p-3 mb-4 flex items-center justify-between gap-3 sticky top-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setSidebarOpen((v) => !v)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent" title={t('common.toggleMenu', 'Menú')}>
                <Menu size={18} />
              </button>
              <Link to="/post-sites" className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent" title={t('postSites.backToList', 'Volver a sitios de servicio')}>
                <ChevronLeft size={18} />
              </Link>
              <div className="flex items-center gap-2 min-w-0 text-sm">
                <span className="font-semibold text-foreground truncate">
                  {site?.businessName || site?.companyName || site?.name || title || t('postSites.postsite', 'Post Site')}
                </span>
                {activeItem ? (
                  <>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="text-muted-foreground truncate">{activeItem.label}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {id ? (
                <Link to={`/post-sites/${id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil size={14} />
                    <span className="hidden sm:inline">{t('common.edit', 'Editar')}</span>
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="pb-20">{children}</div>
          <InventoryModal
            open={inventoryModalOpen}
            onClose={() => setInventoryModalOpen(false)}
            stations={inventoryStations}
            selectedStationId={inventoryStationId}
            setSelectedStationId={setInventoryStationId}
            name={inventoryName}
            setName={setInventoryName}
            onCreate={submitCreateInventory}
            creating={creatingInventory}
          />
        </main>
      </div>
    </AppLayout>
  );
}

// Inventory modal appended at file end
// Modal JSX (placed after component definition to keep component body focused)
const InventoryModal: React.FC<any> = ({ open, onClose, stations, selectedStationId, setSelectedStationId, name, setName, onCreate, creating }) => {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 z-50" />

      <div className="relative z-70 w-full sm:w-96 bg-card shadow-2xl overflow-y-auto rounded-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border bg-card rounded-t-md">
          <h2 className="text-lg font-semibold text-foreground">{t('postSites.inventories.createTitle', 'Crear Inventario')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-foreground mb-1">{t('postSites.inventories.selectStation', 'Seleccionar estación (opcional)')}</label>
            <select value={selectedStationId || ''} onChange={(e) => setSelectedStationId(e.target.value || null)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">{t('postSites.inventories.usePostsite', 'Usar puesto de seguridad (por defecto)')}</option>
              {(stations || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.label || s.id}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-foreground mb-1">{t('postSites.inventories.name', 'Nombre de inventario')}<span className="text-red-500">*</span></label>
            <input aria-required={true} required className="w-full border rounded px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-card rounded-b-md">
          <button onClick={onClose} className="px-4 py-2 rounded-md border text-sm">{t('common.cancel', 'Cancelar')}</button>
          <button onClick={onCreate} disabled={creating} className="px-6 py-2 bg-primary text-white rounded-md">{creating ? t('common.creating','Creando...') : t('postSites.inventories.create','Crear inventario')}</button>
        </div>
      </div>
    </div>
  );
};

export { InventoryModal };
