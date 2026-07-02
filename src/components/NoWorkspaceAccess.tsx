import { useAuth } from "@/contexts/AuthContext"

/**
 * Full-screen, non-dismissible modal shown when a user is authenticated but has
 * NO tenant membership (no workspace). Previously this state white-screened the
 * app: the dashboard's tenant-scoped services call getTenantId(), which throws
 * "Tenant ID no configurado" when localStorage.tenantId is empty, crashing the
 * React tree. Now we intercept the state in ProtectedRoute and render this modal
 * BEFORE any tenant-scoped page mounts, so the user gets a clear message and a
 * way out (sign out) instead of a blank screen.
 *
 * Platform superadmins are handled separately (routed to /superadmin/tenants) —
 * this screen is for end users whose account was not attached to any workspace.
 */
export default function NoWorkspaceAccess() {
  const { user, signOut } = useAuth()
  const email = user?.email || ""

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0A0A0A] p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="no-workspace-title"
        className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl dark:bg-[#171717]"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-7 w-7 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </div>

        <h2
          id="no-workspace-title"
          className="text-center text-lg font-semibold text-slate-900 dark:text-slate-50"
        >
          Sin acceso a un espacio de trabajo
        </h2>

        <p className="mt-3 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Tu cuenta no está asociada a ninguna empresa. Pídele a un administrador
          que te asigne a un espacio de trabajo para poder ingresar.
        </p>

        {email && (
          <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
            Sesión iniciada como <span className="font-medium">{email}</span>
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a96f08] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-[#202020]"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}
