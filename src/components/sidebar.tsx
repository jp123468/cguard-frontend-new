import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Shield, ChevronRight, Gauge, Activity, Users, BarChart3, MapPin,
  MessageSquare, Clock, FileText, Calendar, DollarSign, Receipt, Car,
  UserPlus, SquareParking, UserCog, type LucideIcon,
} from "lucide-react";
import sidebarMenuData from "../data/sidebar-menu.json";
import { useAuth } from "@/contexts/AuthContext";

type SubMenuItem = { id: string; name: string; path: string };
type MenuItem = {
  id: string; name: string; icon: LucideIcon; path?: string;
  active?: boolean; expandable?: boolean; subItems?: SubMenuItem[];
};

// Mapa de nombres de iconos a componentes de iconos
const iconMap: Record<string, LucideIcon> = {
  Shield, Gauge, Activity, Users, BarChart3, MapPin,
  MessageSquare, Clock, FileText, Calendar, DollarSign, Receipt, Car,
  UserPlus, SquareParking, UserCog
};

export default function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const toggleMenu = (menu: string) => setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));

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
    <aside className="h-full w-full bg-white border-r border-gray-200 overflow-hidden">
      <div className="h-full">
        {/* <div className="flex items-center gap-2 px-4 py-6">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">
            <span className="text-[#0C2459]">Guards</span>
            <span className="text-[#F36A6D]">Pro</span>
          </span>
        </div> */}

        <div className="flex items-center gap-2 px-5 py-3">
          <img
            src="../../assets/logo/logo.png" // 👈 cambia esta ruta por la de tu logo
            alt="GuardsPro Logo"
            className="w-10 select-none"
          />

          <span className="font-bold text-3xl">
            <span className="text-[#010B40]">C</span>
            <span className="text-[#FE6F02]">Guard</span>
          </span>

        </div>

        <nav className="p-2 overflow-y-auto h-[calc(100%-88px)]">
          {menuItems.map((item) => {
            const isExpanded = !!expandedMenus[item.id];
            const isExpandable = !!item.expandable;

            const ItemWrapper = ({ children }: { children: React.ReactNode }) => {
              // If user has no tenant, only allow Dashboard (panel) navigation; disable others
              if (!hasTenant && item.path && item.path !== "/dashboard") {
                return <div className="block rounded-lg mb-1 transition-colors font-bold text-gray-400 cursor-not-allowed">{children}</div>;
              }
              return !isExpandable && item.path ? (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `block rounded-lg mb-1 transition-colors font-bold ${isActive
                      ? "bg-gradient-to-r font-bold hover:bg-[#F8F8F8] from-[#FFF0F0] to-[#FFEAEA] text-[#F36A6D] border-l-4 border-[#F36A6D]"
                      : "text-[#0C2459] font-bold hover:bg-[#F8F8F8]"
                    }`
                  }
                >
                  {children}
                </NavLink>
              ) : (
                <div className="rounded-lg mb-1 font-bold text-[#0C2459]">{children}</div>
              );
            };

            return (
              <div key={item.id}>
                <ItemWrapper>
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasTenant && item.path !== "/dashboard") return; // block navigation when no tenant
                      if (isExpandable) toggleMenu(item.id);
                      else if (item.path) navigate(item.path);
                    }}
                    className={`w-full hover:bg-[#F8F8F8] rounded hover:cursor-pointer font-semibold flex items-center justify-between px-3 py-2 text-[12px] ${!hasTenant && item.path !== "/dashboard" ? 'opacity-60' : ''}`}
                    aria-disabled={!hasTenant && item.path !== "/dashboard"}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-[18px] h-[18px]" />
                      <span className="text-start">
                        {(() => {
                          // Prefer explicit label key: sidebar.<id>.label
                          const label = t(`sidebar.${item.id}.label`, { defaultValue: '' });
                          if (label) return label;
                          // Fallback to flattened key sidebar.<id>
                          const flat = t(`sidebar.${item.id}`, { defaultValue: '' });
                          if (flat) return flat;
                          return item.name;
                        })()}
                      </span>
                    </div>
                    {isExpandable && (
                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    )}
                  </button>
                </ItemWrapper>

                {isExpandable && isExpanded && item.subItems && hasTenant && (
                  <div className="ml-8 mb-2">
                    {item.subItems.map((sub) => {
                      const isActive = location.pathname.startsWith(sub.path);
                      return (
                        <NavLink
                          key={sub.id}
                          to={sub.path}
                          className={
                            `block w-full rounded font-semibold px-2 py-1.5 mb-1 text-[12px] ${isActive
                              ? "bg-gradient-to-r from-[#FFF0F0] to-[#FFEAEA] text-[#F36A6D] border-l-2 border-[#F36A6D]"
                              : "text-[#0C2459] hover:text-[#F36A6D]"
                            }`
                          }
                        >
                          {(() => {
                            // Try specific subkey under parent, then flat sub key, then fallback
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
      </div>
    </aside>
  );
}
