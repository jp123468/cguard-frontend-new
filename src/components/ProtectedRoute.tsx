import { useAuth } from "@/contexts/AuthContext"
import { Navigate, useLocation } from "react-router-dom"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireVerified?: boolean
}

/**
 * Full-screen boot/auth loader (shown on every reload while the session is
 * verified). Multitenant-aware: shows the current tenant's logo, cached in
 * localStorage by the sidebar on load. Falls back to a logo-less gold spinner —
 * never the platform brand — so a white-labeled tenant never sees the wrong
 * logo. Warm off-white (light) / slate-950 (dark) to match the new design.
 */
function LoadingScreen() {
  let tenantLogo: string | null = null
  try {
    tenantLogo = localStorage.getItem("tenantLogoUrl")
  } catch {
    tenantLogo = null
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#F8F7F4] dark:bg-slate-950">
      {tenantLogo && (
        <img
          src={tenantLogo}
          alt="Logo"
          className="h-14 max-w-[200px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      )}
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C8860A]/20 border-t-[#C8860A]" />
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ 
  children, 
  requireVerified = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return <LoadingScreen />
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Si requiere email verificado y no lo está
  if (requireVerified && user && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />
  }

  // Si todo está bien, mostrar el contenido protegido
  return <>{children}</>
}

// Variante para rutas públicas (solo accesibles si NO estás autenticado)
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  // Permitir acceso si hay un token de invitación en la URL (flujo de registro)
  const searchParams = new URLSearchParams(location.search)
  const hasInviteToken = searchParams.has('token') || searchParams.has('invitationToken') || searchParams.has('invite')
  const isInvitationFlow = location.pathname.includes('/invitation') || 
                           location.pathname.includes('/registration') ||
                           searchParams.get('inviteType') === 'guard' ||
                           searchParams.get('inviteType') === 'client'

  // Si hay un token de invitación o es flujo de registro, permitir acceso sin importar autenticación
  if (hasInviteToken || isInvitationFlow) {
    return <>{children}</>
  }

  // Si ya está autenticado y NO es flujo de invitación, redirigir al dashboard
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || "/dashboard"
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}