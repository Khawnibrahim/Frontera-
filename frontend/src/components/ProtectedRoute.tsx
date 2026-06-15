import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "internal_staff" | "client_user" | "provider_user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  portalType?: "provider" | "client" | "corporate";
}

const ProtectedRoute = ({ children, allowedRoles, portalType }: ProtectedRouteProps) => {
  const { user, loading, roles, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins can access everything
  if (isAdmin) {
    return <>{children}</>;
  }

  // Portal-type check: map portal to required role
  if (portalType) {
    const portalRoleMap: Record<string, AppRole[]> = {
      provider: ["provider_user"],
      client: ["client_user"],
      corporate: ["internal_staff", "admin"],
    };
    const requiredRoles = portalRoleMap[portalType];
    if (requiredRoles && !requiredRoles.some((r) => roles.includes(r))) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  // Explicit role check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.some((r) => roles.includes(r))) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
