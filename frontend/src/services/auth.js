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
    const token = response.data.data.token;
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
    const { access_token, username, plan } = response.data.data;

    // Store in memory only
    const authStore = useAuthStore.getState();
    authStore.setAuth(access_token, username, plan, 900);

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
export const register = async (email, username, password, betaCode = null) => {
  try {
    const body = { email, username, password };
    if (betaCode) body.beta_code = betaCode;
    const response = await api.post('/auth/register', body);
    const { access_token, username: user, plan, skip_billing } = response.data.data;

    const authStore = useAuthStore.getState();
    authStore.setAuth(access_token, user, plan, 900);

    return { username: user, plan, skip_billing };
  } catch (error) {
    if (error.response?.status === 409) {
      throw new Error('Email or username already exists');
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = `Too many registration attempts. Try again in ${retryAfter} seconds.`;
      throw new Error(message);
    }
    const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Registration failed';
    throw new Error(msg);
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
    const { access_token, username, plan } = response.data.data;

    const authStore = useAuthStore.getState();
    authStore.setAuth(access_token, username, plan, 900);

    return { access_token, username };
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
    await api.post('/forgot-password', { email });
    return { success: true };
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: true };
  }
};

/**
 * Admin login with username and password
 */
export const adminLogin = async (username, password) => {
  try {
    const response = await api.post('/auth/admin-login', { username, password });
    const { access_token, username: user, plan } = response.data.data;

    const authStore = useAuthStore.getState();
    authStore.setAuth(access_token, user, plan, 900);

    return { username: user, plan };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid admin credentials');
    }
    throw error;
  }
};
