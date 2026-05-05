import { useAuthStore } from '../store/authStore';
import * as authService from '../services/auth';

export const useAuth = () => {
  const { accessToken, username, plan, expiry, isAuthenticated, logout } = useAuthStore();

  return {
    user: { username, plan },
    token: accessToken,
    expiry,
    isAuthenticated: isAuthenticated(),
    login: authService.login,
    register: authService.register,
    logout: authService.logout,
  };
};
