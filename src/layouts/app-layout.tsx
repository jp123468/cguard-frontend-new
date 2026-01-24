import { useEffect, useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Toaster } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { setTenantId } from "@/lib/api/clientService";
import { setTenantId as setCategoryTenantId } from "@/lib/api/categoryService";
import { useLocation, useNavigate } from "react-router-dom";
import TenantJoinModal from "@/components/TenantJoinModal";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    document.body.style.overflow = isMobile && sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Configurar tenantId globalmente cuando el usuario cambia
  useEffect(() => {
    try {
      let tenantId: string | null = null;
      if (user) {
        if (Array.isArray(user.tenants) && user.tenants.length > 0) {
          const t = user.tenants[0];
          tenantId = t.tenantId || (t.tenant && (t.tenant.id || t.tenant.tenantId)) || null;
        }
        if (!tenantId) {
          // legacy shapes
          tenantId = (user.tenant && (user.tenant.tenant?.id || user.tenant.tenantId)) || (user.tenantId || null);
        }
      }
      if (tenantId) {
        setTenantId(tenantId);
        setCategoryTenantId(tenantId);
      }
    } catch (e) {
      // ignore
    }
  }, [user]);

  // If user has no tenant, ensure they stay on dashboard route
  useEffect(() => {
    // Wait until auth finished loading to avoid redirecting before profile is ready
    if (loading) return;

    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    const hasTenant = Boolean(tenantId || (user && (user.tenant || (Array.isArray(user.tenants) && user.tenants.length > 0))));
    if (!hasTenant && location.pathname !== "/dashboard") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // show modal when user has no tenant and is on dashboard
  const tenantIdNow = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;

  const userHasActiveTenant = (u: any) => {
    if (!u) return false;
    // Direct tenant shape (single-tenant mode)
    if (u.tenant) {
      const t = u.tenant;
      const tid = t.tenantId || (t.tenant && (t.tenant.id || t.tenant.tenantId));
      if (tid) return true;
    }
    // Tenants array (multi-tenant or legacy shapes)
    if (Array.isArray(u.tenants) && u.tenants.length > 0) {
      // consider tenantUser entries that are active or have a tenantId
      return u.tenants.some((tu: any) => {
        if (!tu) return false;
        const tid = tu.tenantId || (tu.tenant && (tu.tenant.id || tu.tenant.tenantId));
        const status = tu.status || null;
        return Boolean(tid) && status !== 'invited';
      });
    }
    return false;
  };

  const hasTenantNow = Boolean(
    tenantIdNow || (user && userHasActiveTenant(user))
  );

  // If the user object contains an active tenant but localStorage isn't
  // populated yet (race on initial load), persist it so other codepaths
  // (permissions, services) pick it up and the modal doesn't show.
  useEffect(() => {
    if (!user) return;
    if (tenantIdNow) return;
    if (!userHasActiveTenant(user)) return;

    // Derive tenantId from `user` shape
    let derived: string | null = null;
    try {
      if (user.tenant) {
        const t = user.tenant;
        derived = t.tenantId || (t.tenant && (t.tenant.id || t.tenant.tenantId)) || null;
      }
      if (!derived && Array.isArray(user.tenants) && user.tenants.length > 0) {
        const first = user.tenants[0];
        derived = first.tenantId || (first.tenant && (first.tenant.id || first.tenant.tenantId)) || null;
      }
    } catch (e) {
      derived = null;
    }

    if (derived) {
      try { localStorage.setItem('tenantId', derived); } catch {}
      try { setTenantId(derived); } catch {}
      try { setCategoryTenantId(derived); } catch {}
    }
  }, [user]);

  // Only show the tenant modal after auth has finished loading. This prevents
  // a flash where the modal appears before the user's profile (and tenant)
  // are available and blocks the UI.
  const showTenantModal = !loading && !hasTenantNow && location.pathname === "/dashboard";


  return (
    <div className="h-screen w-full bg-gray-50">
      <div className={["sticky top-0 z-50 bg-white border-b border-gray-200 h-14 transition-[margin] duration-300", sidebarOpen ? "lg:ml-64" : "lg:ml-0"].join(" ")}>
        <Header toggleSidebar={toggleSidebar} />
      </div>

      <aside
        className={[
          "hidden lg:block fixed left-0 top-0 h-screen bg-white border-r border-gray-200 overflow-hidden transition-[width] duration-300",
          sidebarOpen ? "w-64" : "w-0",
        ].join(" ")}
      >
        <Sidebar />
      </aside>

      <div
        className={[
          "fixed left-0 top-0 z-[60] w-64 h-screen bg-white border-r border-gray-200 lg:hidden transform transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[55] bg-black/30 lg:hidden" onClick={closeSidebar} />
      )}

      <main
        className={[
          "relative h-[calc(100vh-56px)] overflow-y-auto transition-[margin] duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-0",
        ].join(" ")}
      >
        {children}
      </main>

      {/* Global toaster for notifications */}
      <Toaster position="top-right" />

      <TenantJoinModal open={showTenantModal} onOpenChange={() => { /* noop - modal controlled by presence */ }} />


    </div>
  );
}
