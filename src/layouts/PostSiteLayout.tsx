import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { ApiService } from '@/services/api/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = { title?: string; children: ReactNode; site?: any };

export default function PostSiteLayout({ title, children, site }: Props) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { id } = useParams();

  const sections = [
    {
      items: [
        { id: 'overview', label: t('postSites.Details.Overview', 'Overview'), path: `/post-sites/${id || ':id'}/overview` },
        { id: 'profile', label: t('postSites.Details.Profile', 'Profile'), path: `/post-sites/${id || ':id'}/profile` },
        { id: 'contacts', label: t('postSites.Details.Contacts', 'Contacts'), path: `/post-sites/${id || ':id'}/contacts` },
        { id: 'kpis', label: t('postSites.Details.KPIs', 'KPIs'), path: `/post-sites/${id || ':id'}/kpis` },
        { id: 'postOrders', label: t('postSites.Details.PostOrders', 'Post Orders'), path: `/post-sites/${id || ':id'}/post-orders` },
        { id: 'notes', label: t('postSites.Details.Notes', 'Notes'), path: `/post-sites/${id || ':id'}/notes` },
        { id: 'files', label: t('postSites.Details.Files', 'Files'), path: `/post-sites/${id || ':id'}/files` },
        { id: 'assignGuards', label: t('postSites.Details.AssignGuards', 'Assign Guards'), path: `/post-sites/${id || ':id'}/assign-guards` },
        { id: 'stations', label: t('postSites.Details.Stations', 'Stations'), path: `/post-sites/${id || ':id'}/stations` },
        { id: 'inventory', label: t('postSites.Details.Inventories', 'Inventories'), path: `/post-sites/${id || ':id'}/inventory` },
        { id: 'tasks', label: t('postSites.Details.Tasks', 'Tasks'), path: `/post-sites/${id || ':id'}/tasks` },
        { id: 'siteTours', label: t('postSites.Details.SiteTours', 'Site Tours'), path: `/post-sites/${id || ':id'}/site-tours` },
        { id: 'siteTourTags', label: t('postSites.Details.SiteTourTags', 'Site Tour Tags'), path: `/post-sites/${id || ':id'}/site-tour-tags` },
        { id: 'tagScans', label: t('postSites.Details.TagScans', 'Tag Scans'), path: `/post-sites/${id || ':id'}/tag-scans` },
        { id: 'geoFence', label: t('postSites.Details.GeoFence', 'Geo-Fence'), path: `/post-sites/${id || ':id'}/geo-fence` },
        { id: 'assignReports', label: t('postSites.Details.AssignReports', 'Assign Reports'), path: `/post-sites/${id || ':id'}/assign-reports` },
        { id: 'incidents', label: t('postSites.Details.Incidents', 'Incidents'), path: `/post-sites/${id || ':id'}/incidents` },
        { id: 'checklists', label: t('postSites.Details.Checklists', 'Checklists'), path: `/post-sites/${id || ':id'}/checklists` },
        { id: 'emailReports', label: t('postSites.Details.EmailReports', 'Email Reports'), path: `/post-sites/${id || ':id'}/email-reports` },
        { id: 'settings', label: t('postSites.Details.Settings', 'Settings'), path: `/post-sites/${id || ':id'}/settings` },
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
            <div className="bg-white border rounded-md p-4 m-3 flex-1 overflow-hidden">
              <div className="text-lg font-semibold mb-4">{site?.businessName || site?.companyName || site?.name || title || t('postSites.postsite', 'Post Site')}</div>
              <nav className="text-base">
                <div ref={navRef} className="max-h-[calc(100vh-120px)] overflow-y-auto pr-3 pb-20">
                  {sections.map((section, idx) => (
                    <div key={idx} className="mb-0 pb-0">
                      <ul className="divide-y">
                                {section.items.map((it) => {
                                  const path = resolve(it.path);
                                  const isActive = location.pathname === path;
                                  // Temporarily hide these menu IDs by rendering an HTML comment
                                  const hiddenIds = [
                                    'kpis',
                                    'postOrders',
                                    'notes',
                                    'files',
                                    'tasks',
                                    'geoFence',
                                    'assignReports',
                                    'checklists',
                                    'emailReports',
                                    'settings',
                                    'informes'
                                  ];

                                  if (hiddenIds.includes(it.id)) {
                                    const comment = `<!-- hidden-menu: id=${it.id} label=${it.label} path=${path} -->`;
                                    return (
                                      <li key={it.id} className="bg-white" dangerouslySetInnerHTML={{ __html: comment }} />
                                    );
                                  }

                                  // Render menu item normally (inventory is included in sections)

                                  return (
                                    <li key={it.id} className="bg-white">
                                      <Link
                                        to={path}
                                        data-active={isActive ? 'true' : undefined}
                                        className={`flex items-center justify-between px-5 py-3 text-sm ${
                                          isActive ? 'bg-[#C8860A]/10 text-[#C8860A] font-medium' : 'text-gray-700 hover:bg-gray-50'
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
          <div className="bg-white rounded-md p-4 mb-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen((v) => !v)} className="text-gray-600 hover:text-gray-800 p-1">
                <Menu size={20} />
              </button>
              <div className="text-sm font-medium text-gray-700">{headerLabel}</div>
            </div>
            <div className="text-sm text-gray-600" />
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

      <div className="relative z-70 w-full sm:w-96 bg-white shadow-2xl overflow-y-auto rounded-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b bg-white rounded-t-md">
          <h2 className="text-lg font-semibold text-gray-800">{t('postSites.inventories.createTitle', 'Crear Inventario')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">{t('postSites.inventories.selectStation', 'Seleccionar estación (opcional)')}</label>
            <select value={selectedStationId || ''} onChange={(e) => setSelectedStationId(e.target.value || null)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">{t('postSites.inventories.usePostsite', 'Usar puesto de seguridad (por defecto)')}</option>
              {(stations || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.label || s.id}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">{t('postSites.inventories.name', 'Nombre de inventario')}<span className="text-red-500">*</span></label>
            <input aria-required={true} required className="w-full border rounded px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-white rounded-b-md">
          <button onClick={onClose} className="px-4 py-2 rounded-md border text-sm">{t('common.cancel', 'Cancelar')}</button>
          <button onClick={onCreate} disabled={creating} className="px-6 py-2 bg-[#C8860A] text-white rounded-md">{creating ? t('common.creating','Creando...') : t('postSites.inventories.create','Crear inventario')}</button>
        </div>
      </div>
    </div>
  );
};

export { InventoryModal };
