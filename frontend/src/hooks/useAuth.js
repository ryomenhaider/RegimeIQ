import clsx from 'clsx';
import { useAuthStore } from '../store/authStore';

/**
 * Custom hook for authentication state
 * Returns user info and auth methods
 */
export function useAuth() {
  const { username, plan, isAuthenticated, getToken, clearAuth, accessToken } = useAuthStore();

  return {
    user: username ? { username, plan } : null,
    isAuthenticated,
    getToken,
    clearAuth,
    accessToken,
    username,
    plan
  };
}
