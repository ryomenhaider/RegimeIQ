import clsx from 'clsx';
import { useAuthStore } from '../store/authStore';

/**
 * Custom hook for authentication state
 * Returns user info and auth methods
 */
export function useAuth() {
  const { user, login, logout, isAuthenticated } = useAuthStore();

  return {
    user,
    login,
    logout,
    isAuthenticated
  };
}
