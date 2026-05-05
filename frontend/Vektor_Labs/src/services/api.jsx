import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { getStoredCsrfToken, refreshToken } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true, // Required for httpOnly cookies (refresh token)
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    const csrfToken = getStoredCsrfToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase())) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { toast } = await import('react-hot-toast');
    const response = error.response;

    if (!response) {
      toast.error('Network error. Check your connection.');
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized (Expired Access Token)
    if (response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Map HTTP Status Codes to User Behavior
    switch (response.status) {
      case 400:
      case 422:
        // Extract field-level errors
        return Promise.reject({
          ...error,
          errors: response.data?.errors || response.data?.detail || {}
        });

      case 403:
        toast.error('You do not have permission to do that.', { icon: '🚫' });
        break;

      case 404:
        return null; // Component handles inline

      case 429: {
        const retryAfter = response.headers['retry-after'] || 5;
        toast.error(`Too many requests. Try again in ${retryAfter}s.`, { 
          icon: '⏳',
          duration: retryAfter * 1000 
        });
        break;
      }

      case 500:
        toast.error("Something went wrong. We've been notified.", { icon: '⚠️' });
        break;

      case 503:
        toast.error(
          <div className="flex items-center gap-3">
            <span>System maintenance in progress.</span>
            <button 
              onClick={() => window.location.reload()}
              className="px-2 py-1 bg-brand-primary text-bg-pure text-[10px] font-bold rounded-sm"
            >
              RETRY
            </button>
          </div>,
          { duration: 6000 }
        );
        break;
    }

    return Promise.reject(error);
  }
);

export default api;
