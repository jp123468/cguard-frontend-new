import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { hasPermission, hasAny } = useAuth();
  return { hasPermission, hasAny };
}

export function RequirePermission({ permission, any, children, fallback = null }: { permission?: string; any?: string[]; children: ReactNode; fallback?: ReactNode }) {
  const { hasPermission, hasAny } = useAuth();
  if (permission && hasPermission(permission)) return <>{children}</>;
  if (any && any.length > 0 && hasAny(any)) return <>{children}</>;
  return <>{fallback}</>;
}
