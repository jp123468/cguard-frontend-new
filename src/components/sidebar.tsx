import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Shield, ChevronRight, Gauge, Activity, Users, BarChart3, MapPin,
  MessageSquare, Clock, FileText, Calendar, DollarSign, Receipt, Car,
  UserPlus, SquareParking, UserCog, Building2, Briefcase, Package, Cctv, Siren, type LucideIcon,
} from "lucide-react";
import sidebarMenuData from "../data/sidebar-menu.json";
import { useAuth } from "@/contexts/AuthContext";
import tenantService from "@/services/tenant.service";
import {
  getStoredTenantBranding,
  getCachedTenantBranding,
  setTenantBranding,
} from "@/lib/tenantBranding";

type SubMenuItem = { id: string; name: string; path: string };
type MenuItem = {
  id: string; name: string; icon: LucideIcon; path?: string;
  active?: boolean; expandable?: boolean; subItems?: SubMenuItem[];
  // optional allowedRoles controls visibility for global roles (e.g. ['superadmin'])
  allowedRoles?: string[];
};

// Mapa de nombres de iconos a componentes de iconos
const iconMap: Record<string, LucideIcon> = {
  Shield, Gauge, Activity, Users, BarChart3, MapPin,
  MessageSquare, Clock, FileText, Calendar, DollarSign, Receipt, Car,
  UserPlus, SquareParking, UserCog, Building2, Briefcase, Package, Cctv, Siren
};

export default function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const toggleMenu = (menu: string) => setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));

  // Tenant branding — seeded synchronously from the stored cache so it renders
  // instantly (no "CG / CGuard" placeholder flash) when AppLayout re-mounts on
  // navigation. We only hit the API once per tenant per session.
  const [tenantName, setTenantName] = useState<string>(() => getStoredTenantBranding().name);
  const [tenantLogo, setTenantLogo] = useState<string | null>(() => getStoredTenantBranding().logo);

  useEffect(() => {
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (!tenantId) return;

    // Already resolved this tenant this session -> use the cache, do NOT refetch.
    const cached = getCachedTenantBranding(tenantId);
    if (cached) {
      setTenantName(cached.name);
      setTenantLogo(cached.logo);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res: any = await tenantService.findById(tenantId);
        if (cancelled) return;
        const t = (res && (res.data || res.tenant)) ? (res.data || res.tenant) : res;
        const name = t?.name || '';
        const logoUrl =
          t?.logoUrl ||
          (Array.isArray(t?.settings) ? t.settings[0]?.logoUrl : t?.settings?.logoUrl || t?.settings?.logos?.[0]?.publicUrl) ||
          t?.logo?.downloadUrl ||
          null;
        if (name) setTenantName(name);
        setTenantLogo(logoUrl);
        // Persist to the memory + localStorage cache so subsequent re-mounts
        // render synchronously and skip the fetch.
        setTenantBranding({ tenantId, name, logo: logoUrl });
      } catch {
        // silently ignore — fall back to cached/initials
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Convertir los datos JSON a objetos MenuItem con los componentes de iconos correctos
  const menuItems: MenuItem[] = sidebarMenuData.map(item => ({
    ...item,
    icon: iconMap[item.icon as string] || UserCog
  }));

  const tenantIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
  const hasTenant = Boolean(
    tenantIdFromStorage ||
    (user && (user.tenant || (Array.isArray(user.tenants) && user.tenants.length > 0)))
  );

  // Determine whether the current user has a global admin role (not tenant-scoped)
  const isGlobalAdmin = (() => {
    if (!user) return false;
    const raw = user.roles ?? user.role ?? [];
    const arr = Array.isArray(raw) ? raw : [raw];
    const normalized = arr.map((r: any) => (typeof r === 'string' ? r.toLowerCase() : (r && (r.name || r.role) ? String(r.name || r.role).toLowerCase() : ''))).filter(Boolean);
    return normalized.includes('admin') || normalized.includes('superadmin') || normalized.includes('super admin');
  })();

  // Función para verificar si un menú debe estar expandido basado en la ruta actual
  const shouldExpandMenu = (item: MenuItem): boolean => {
    if (!item.expandable || !item.subItems) return false;

    return item.subItems.some(subItem =>
      location.pathname.startsWith(subItem.path)
    );
  };

  // Actualizar los menús expandidos cuando cambia la ruta
  useEffect(() => {
    const newExpandedMenus: Record<string, boolean> = {};

    menuItems.forEach(item => {
      if (shouldExpandMenu(item)) {
        newExpandedMenus[item.id] = true;
      }
    });

    setExpandedMenus(prev => ({
      ...prev,
      ...newExpandedMenus
    }));
  }, [location.pathname]);

  return (
    <aside className="app-sidebar h-full w-full overflow-y-auto hide-scrollbar flex flex-col">
      {/* Tenant branding */}
      <div className="app-sidebar-head sticky top-0 z-20 flex items-center gap-3 px-4 py-3.5">
        {/* Logo or initials avatar */}
        <div
          className="shrink-0 h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center border"
          style={{ background: "color-mix(in oklab, var(--cc-accent) 18%, transparent)", borderColor: "color-mix(in oklab, var(--cc-accent) 35%, transparent)" }}
        >
          {tenantLogo ? (
            <img
              src={tenantLogo}
              alt={tenantName || 'Logo'}
              className="h-full w-full object-contain p-0.5"
            />
          ) : (
            <span className="text-sm font-bold select-none leading-none cc-accent-text">
              {tenantName ? tenantName.substring(0, 2).toUpperCase() : 'CG'}
            </span>
          )}
        </div>
        {/* Name */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-[140px]" title={tenantName || 'CGuard'}>
            {tenantName || 'CGuard'}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Panel de control</p>
        </div>
      </div>

      <div className="flex flex-col flex-1">
        <nav className="p-3 flex-1 overflow-y-auto">
          {menuItems
            .filter(item => {
              if ((item as any).disabled) return false;
              if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
              if (item.allowedRoles.includes('superadmin')) return isGlobalAdmin;
              const raw = user?.roles ?? user?.role ?? [];
              const arr = Array.isArray(raw) ? raw : [raw];
              const normalized = arr.map((r: any) => (typeof r === 'string' ? r.toLowerCase() : (r && (r.name || r.role) ? String(r.name || r.role).toLowerCase() : ''))).filter(Boolean);
              return item.allowedRoles.some((ar: string) => normalized.includes(ar.toLowerCase()));
            })
            .map((item) => {
              const isExpanded = !!expandedMenus[item.id];
              const isExpandable = !!item.expandable;
              const isDisabled = !hasTenant && item.path && item.path !== "/dashboard";

              const ItemWrapper = ({ children }: { children: React.ReactNode }) => {
                if (isDisabled) {
                  return <div className="mb-0.5 cursor-not-allowed opacity-40">{children}</div>;
                }
                return !isExpandable && item.path ? (
                  <NavLink to={item.path} className="block mb-0.5">
                    {children}
                  </NavLink>
                ) : (
                  <div className="mb-0.5">{children}</div>
                );
              };

              return (
                <div key={item.id}>
                  <ItemWrapper>
                    <button
                      type="button"
                      onClick={() => {
                        if (isDisabled) return;
                        if (isExpandable) toggleMenu(item.id);
                        else if (item.path) navigate(item.path);
                      }}
                      className={`app-nav-item group ${!isExpandable && item.path && location.pathname === item.path ? "is-active" : ""}`}
                      aria-disabled={!!isDisabled}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="text-start text-[13px] leading-tight">
                          {(() => {
                            const label = t(`sidebar.${item.id}.label`, { defaultValue: '' });
                            if (label) return label;
                            const flat = t(`sidebar.${item.id}`, { defaultValue: '' });
                            if (flat) return flat;
                            return item.name;
                          })()}
                        </span>
                      </div>
                      {isExpandable && (
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform opacity-50 ${isExpanded ? "rotate-90" : ""}`} />
                      )}
                    </button>
                  </ItemWrapper>

                  {isExpandable && isExpanded && item.subItems && hasTenant && (
                    <div className="ml-7 mb-1 pl-3" style={{ borderLeft: "1px solid color-mix(in oklab, var(--cc-accent) 18%, var(--border))" }}>
                      {item.subItems.map((sub) => {
                        const isActive = location.pathname.startsWith(sub.path);
                        return (
                          <NavLink
                            key={sub.id}
                            to={sub.path}
                            className={`app-subnav-item ${isActive ? "is-active" : ""}`}
                          >
                            {(() => {
                              const parentSub = t(`sidebar.${item.id}.${sub.id}`, { defaultValue: '' });
                              if (parentSub) return parentSub;
                              const flat = t(`sidebar.${sub.id}`, { defaultValue: '' });
                              if (flat) return flat;
                              return sub.name;
                            })()}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] text-foreground/70 text-center">© {new Date().getFullYear()} CGUARD</p>
        </div>
      </div>
    </aside>
  );
}
