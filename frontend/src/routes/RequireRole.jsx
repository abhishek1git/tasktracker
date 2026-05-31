import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function RequireRole({ roles, children }) {
  const { user } = useAuthStore();

  if (!roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}