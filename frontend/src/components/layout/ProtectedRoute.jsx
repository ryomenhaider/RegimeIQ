import { Navigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';

/**
 * Protected route wrapper
 * - Checks if user is authenticated (token exists and not expired)
 * - Stores intended route in sessionStorage before redirect
 * - Reads from authStore (memory only), never from storage
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  // Not authenticated: save intended route and redirect to login
  if (!isAuthenticated) {
    sessionStorage.setItem('intended_route', location.pathname);
    return <Navigate to="/login" replace />;
  }

  // Authenticated: render children
  return children;
}
