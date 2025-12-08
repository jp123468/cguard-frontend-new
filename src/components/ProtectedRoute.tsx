import { useAuth } from "@/contexts/AuthContext"
import { Navigate, useLocation } from "react-router-dom"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireVerified?: boolean
}

export default function ProtectedRoute({ 
  children, 
  requireVerified = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    )
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
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || "/dashboard"
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}