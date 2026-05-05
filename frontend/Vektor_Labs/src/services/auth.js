import api from './api';
import { useAuthStore } from '../store/authStore';

let csrfToken = null;

export const getCsrfToken = async () => {
  const response = await api.get('/auth/csrf');
  csrfToken = response.data.csrfToken;
  return csrfToken;
};

export const login = async (email, password) => {
  const { setAuth } = useAuthStore.getState();
  const response = await api.post('/auth/login', { email, password });
  const { accessToken, username, plan, expiresIn } = response.data;
  
  // expiresIn is expected in seconds, convert to absolute ms timestamp
  const expiry = Date.now() + expiresIn * 1000;
  
  setAuth(accessToken, username, plan, expiry);
  return response.data;
};

export const register = async (email, username, password) => {
  const response = await api.post('/auth/register', { email, username, password });
  // Auto-login on success
  return login(email, password);
};

export const logout = async () => {
  const { clearAuth } = useAuthStore.getState();
  try {
    await api.post('/auth/logout');
  } finally {
    clearAuth();
    window.location.href = '/login';
  }
};

export const refreshToken = async () => {
  const { setAuth, clearAuth } = useAuthStore.getState();
  try {
    const response = await api.post('/auth/refresh');
    const { accessToken, username, plan, expiresIn } = response.data;
    const expiry = Date.now() + expiresIn * 1000;
    setAuth(accessToken, username, plan, expiry);
    return accessToken;
  } catch (error) {
    clearAuth();
    throw error;
  }
};

export const getStoredCsrfToken = () => csrfToken;
