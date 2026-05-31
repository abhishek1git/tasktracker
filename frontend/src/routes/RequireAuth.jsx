import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import Loader from "../components/Loader";

export default function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <Loader />;
  }

  return isAuthenticated
    ? children
    : <Navigate to="/login" replace />;
}