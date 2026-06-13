import { useEffect, useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { setTenantId } from "@/lib/api/clientService";
import { setTenantId as setCategoryTenantId } from "@/lib/api/categoryService";
import { useLocation, useNavigate } from "react-router-dom";
import TenantJoinModal from "@/components/TenantJoinModal";
import TrialBanner from "@/components/TrialBanner";
import { RadioRealtimeProvider } from "@/components/radio/RadioRealtimeProvider";
import RadioVoiceWidget from "@/components/radio/RadioVoiceWidget";
import OnboardingProvider from "@/components/onboarding/OnboardingProvider";
import tenantService from "@/services/tenant.service";
import { cacheTenantLocation, cacheTenantCountry, cacheTenantTimezone } from "@/utils/tenantLocation";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const { user, loading, isAdmin, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeSidebar = () => setSidebarOpen(false);

  // control body overflow when sidebar is open on mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    document.body.style.overflow = isMobile && sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Keep sidebar state in sync with breakpoint: desktop => open, mobile => closed
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Configurar tenantId globalmente cuando el usuario cambia
  useEffect(() => {
    try {
      let tenantId: string | null = null;
      if (user) {
        if (Array.isArray(user.tenants) && user.tenants.length > 0) {
          const t = user.tenants[0];
          tenantId = t.tenantId || t.id || t._id || (t.tenant && (t.tenant.id || t.tenant.tenantId)) || null;
        }
        if (!tenantId) {
          // legacy shapes
          tenantId = (user.tenant && (user.tenant.tenant?.id || user.tenant.tenantId || user.tenant.id || user.tenant._id)) || (user.tenantId || null);
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

    // Top-level tenantId or tenant as string
    if (u.tenantId) return true;
    if (typeof u.tenant === 'string' && u.tenant) return true;

    // Direct tenant shape (single-tenant mode) as object
    if (u.tenant && typeof u.tenant === 'object') {
      const t = u.tenant;
      const tid = t.tenantId || t.id || t._id || (t.tenant && (t.tenant.id || t.tenant.tenantId));
      if (tid) return true;
    }

    // Tenants array (multi-tenant or legacy shapes)
    if (Array.isArray(u.tenants) && u.tenants.length > 0) {
      // consider tenantUser entries that are active or have a tenantId
      return u.tenants.some((tu: any) => {
        if (!tu) return false;
        // If tenant entry is a string (legacy simple id array), consider it active
        if (typeof tu === 'string' && tu) return true;
        const tid = tu.tenantId || tu.id || tu._id || (tu.tenant && (tu.tenant.id || tu.tenant.tenantId));
        const status = tu.status || null;
        return Boolean(tid) && status !== 'invited';
      });
    }

    return false;
  };

  const hasTenantNow = Boolean(
    tenantIdNow || (user && userHasActiveTenant(user))
  );

  // Helper: detect if a user holds `superadmin` in any common shape
  const userIsSuperAdmin = (u: any) => {
    if (!u) return false;
    const normalize = (r: any) => {
      if (!r) return [];
      if (Array.isArray(r)) return r.map((it) => (typeof it === 'string' ? it : (it?.name || it?.key || it?.slug || ''))).filter(Boolean);
      if (typeof r === 'string') return [r];
      return [];
    };

    const global = normalize(u.roles ?? u.role ?? []);
    const tenantsArr = Array.isArray(u.tenants) ? u.tenants.flatMap((t: any) => normalize(t.roles ?? t.role ?? [])) : [];
    const singleTenant = u.tenant ? normalize(u.tenant.roles ?? u.tenant.role ?? []) : [];
    const all = [...global, ...tenantsArr, ...singleTenant].map((s) => (s || '').toString().toLowerCase());
    return all.some((n) => n.includes('superadmin'));
  };

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
        derived = t.tenantId || t.id || t._id || (t.tenant && (t.tenant.id || t.tenant.tenantId)) || null;
      }
      if (!derived && Array.isArray(user.tenants) && user.tenants.length > 0) {
        const first = user.tenants[0];
        derived = first.tenantId || first.id || first._id || (first.tenant && (first.tenant.id || first.tenant.tenantId)) || null;
      }
    } catch (e) {
      derived = null;
    }

    if (derived) {
      try { localStorage.setItem('tenantId', derived); } catch {}
      try { setTenantId(derived); } catch {}
      try { setCategoryTenantId(derived); } catch {}

      // Warm the business location cache so maps center on the business city
      (async () => {
        try {
          const res: any = await tenantService.findById(String(derived));
          const t = (res && (res.data || res.tenant)) ? (res.data || res.tenant) : res;
          cacheTenantLocation((t as any)?.latitude, (t as any)?.longitude);
          cacheTenantCountry((t as any)?.countryCode ?? (t as any)?.country_code ?? null);
          cacheTenantTimezone((t as any)?.timezone ?? null);
        } catch {}
      })();
    }
  }, [user]);

  // Only show the tenant modal after auth has finished loading. This prevents
  // a flash where the modal appears before the user's profile (and tenant)
  // are available and blocks the UI.
  // Do not show tenant join/create modal for global admins (superadmin)
  // Also hide if the `user` object contains `superadmin` anywhere to avoid
  // showing the modal while auth state is still syncing.
  // Only show modal for authenticated non-admin users whose profile is loaded
  const showTenantModal =
    !loading &&
    isAuthenticated &&
    !hasTenantNow &&
    location.pathname === "/dashboard" &&
    !isAdmin &&
    !userIsSuperAdmin(user);

  // Close sidebar on mobile when the route changes to avoid it staying open
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);


  return (
    <div className="app-shell h-screen w-full bg-background">
      <div className={["app-header sticky top-0 z-50 h-14 transition-[margin] duration-300", sidebarOpen ? "lg:ml-64" : "lg:ml-0"].join(" ")}>
        <Header toggleSidebar={toggleSidebar} />
      </div>

      <aside
        className={[
          "hidden lg:block fixed left-0 top-0 h-screen overflow-y-auto transition-[width] duration-300",
          sidebarOpen ? "w-64" : "w-0",
        ].join(" ")}
      >
        <Sidebar />
      </aside>

      <div
        className={[
          "fixed left-0 top-0 z-[60] w-64 h-screen lg:hidden transform transition-transform duration-300",
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
        <OnboardingProvider>
          <TrialBanner />
          {children}
        </OnboardingProvider>
      </main>

      {/* Single radio surface: the header radio icon opens this persistent
          open-channel widget (toggle on → stays connected + listening across
          navigation; the socket/audio live in a module singleton). The pase de
          novedades is started from inside it. RadioRealtimeProvider stays for the
          /radio console + radio event context. */}
      <RadioRealtimeProvider tenantId={tenantIdNow}>
        <RadioVoiceWidget />
      </RadioRealtimeProvider>

      {/* Toaster lives once globally in main.tsx — a second one here made every
          toast (notifications included) render twice. */}

      <TenantJoinModal open={showTenantModal} onOpenChange={() => { /* noop - modal controlled by presence */ }} />


    </div>
  );
}
