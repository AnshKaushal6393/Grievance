import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import authService from "@/services/authService";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const location = useLocation();
  const token = authService.getToken();
  const user = authService.getCurrentUser();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const fallback =
      user.role === "admin"
        ? "/admin"
        : user.role === "officer"
          ? "/officer"
          : "/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default ProtectedRoute;
