import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Shield, ChevronRight, Gauge, Activity, Users, BarChart3, MapPin,
  MessageSquare, Clock, FileText, Calendar, DollarSign, Receipt, Car,
  UserPlus, SquareParking, UserCog, Building2, Briefcase, type LucideIcon,
} from "lucide-react";
import sidebarMenuData from "../data/sidebar-menu.json";
import { useAuth } from "@/contexts/AuthContext";
import tenantService from "@/services/tenant.service";

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
  UserPlus, SquareParking, UserCog, Building2, Briefcase
};

export default function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const toggleMenu = (menu: string) => setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));

  // Tenant branding
  const [tenantName, setTenantName] = useState<string>('');
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);

  useEffect(() => {
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (!tenantId) return;
    let cancelled = false;
    (async () => {
      try {
        const res: any = await tenantService.findById(tenantId);
        if (cancelled) return;
        const t = (res && (res.data || res.tenant)) ? (res.data || res.tenant) : res;
        if (t?.name) setTenantName(t.name);
        const logoUrl =
          t?.logoUrl ||
          (Array.isArray(t?.settings) ? t.settings[0]?.logoUrl : t?.settings?.logoUrl || t?.settings?.logos?.[0]?.publicUrl) ||
          t?.logo?.downloadUrl ||
          null;
        if (logoUrl) setTenantLogo(logoUrl);
      } catch {
        // silently ignore — fall back to initials
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
    <aside
      className="h-full w-full overflow-y-auto hide-scrollbar flex flex-col"
      style={{ background: "linear-gradient(180deg, #0F1923 0%, #1C2B3A 100%)" }}
    >
      {/* Tenant branding */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3.5"
        style={{ background: "#0F1923", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo or initials avatar */}
        <div className="shrink-0 h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center bg-amber-500/20 border border-amber-500/30">
          {tenantLogo ? (
            <img
              src={tenantLogo}
              alt={tenantName || 'Logo'}
              className="h-full w-full object-contain p-0.5"
            />
          ) : (
            <span className="text-sm font-bold text-amber-400 select-none leading-none">
              {tenantName ? tenantName.substring(0, 2).toUpperCase() : 'CG'}
            </span>
          )}
        </div>
        {/* Name */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-tight truncate max-w-[140px]" title={tenantName || 'CGuard'}>
            {tenantName || 'CGuard'}
          </p>
          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Panel de control</p>
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
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `block mb-0.5 rounded-lg transition-all ${isActive
                        ? "text-white"
                        : "text-slate-400 hover:text-white"
                      }`
                    }
                  >
                    {children}
                  </NavLink>
                ) : (
                  <div className="mb-0.5 rounded-lg text-slate-400">{children}</div>
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
                      className={`w-full rounded-lg flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all group ${isDisabled ? '' : 'hover:bg-white/5'}`}
                      aria-disabled={!!isDisabled}
                      style={
                        !isExpandable && item.path && location.pathname === item.path
                          ? { background: "rgba(200,134,10,0.15)", color: "#F5C300", borderLeft: "3px solid #C8860A" }
                          : {}
                      }
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
                    <div className="ml-7 mb-1 border-l border-white/10 pl-3">
                      {item.subItems.map((sub) => {
                        const isActive = location.pathname.startsWith(sub.path);
                        return (
                          <NavLink
                            key={sub.id}
                            to={sub.path}
                            className={`block rounded px-2 py-2 mb-0.5 text-[12px] font-medium transition-all ${isActive
                              ? "text-[#F5C300]"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                            }`}
                            style={isActive ? { background: "rgba(200,134,10,0.12)" } : {}}
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
          <p className="text-[10px] text-slate-600 text-center">© {new Date().getFullYear()} CGUARD</p>
        </div>
      </div>
    </aside>
  );
}
