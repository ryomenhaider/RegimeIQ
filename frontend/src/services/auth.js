import api, { setCsrfToken } from './api';
import { useAuthStore } from '../store/authStore';

/**
 * Authentication service
 * - All functions are async
 * - Token stored in memory only (via authStore)
 * - CSRF token fetched on app mount
 */

/**
 * Get CSRF token from backend
 * Called once on app initialization
 */
export const getCsrfToken = async () => {
  try {
    const response = await api.get('/auth/csrf');
    const token = response.data.csrf_token;
    setCsrfToken(token);
    return token;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    throw error;
  }
};

/**
 * Login with email and password
 * On success: stores token in authStore (memory only)
 */
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { token, username, plan, expiresIn } = response.data;

    // Store in memory only
    const authStore = useAuthStore.getState();
    authStore.setAuth(token, username, plan, expiresIn);

    return { username };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid email or password');
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = `Too many login attempts. Try again in ${retryAfter} seconds.`;
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Register new user
 * On success: auto-logs in (stores token in authStore)
 */
export const register = async (email, username, password) => {
  try {
    const response = await api.post('/auth/register', { email, username, password });
    const { token, plan, expiresIn } = response.data;

    // Auto-login: store token in memory
    const authStore = useAuthStore.getState();
    authStore.setAuth(token, username, plan, expiresIn);

    return { username };
  } catch (error) {
    if (error.response?.status === 409) {
      throw new Error('Email or username already exists');
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = `Too many registration attempts. Try again in ${retryAfter} seconds.`;
      throw new Error(message);
    }
    throw error;
  }
};

/**
 * Logout
 * Clears auth state and redirects to login
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout', {});
  } catch (error) {
    // Always clear auth even if logout request fails
    console.error('Logout request failed:', error);
  } finally {
    const authStore = useAuthStore.getState();
    authStore.clearAuth();
    window.location.href = '/login';
  }
};

/**
 * Refresh authentication token
 * Called automatically on 401 by axios interceptor
 */
export const refreshToken = async () => {
  try {
    const response = await api.post('/auth/refresh', {});
    const { token, username, plan, expiresIn } = response.data;

    const authStore = useAuthStore.getState();
    authStore.setAuth(token, username, plan, expiresIn);

    return { token, username };
  } catch (error) {
    const authStore = useAuthStore.getState();
    authStore.clearAuth();
    throw error;
  }
};

/**
 * Request password reset
 * Always returns success — never reveals if email exists
 */
export const forgotPassword = async (email) => {
  try {
    await api.post('/auth/forgot-password', { email });
    return { success: true };
  } catch (error) {
    // Always return success to prevent email enumeration
    console.error('Forgot password error:', error);
    return { success: true };
  }
};
