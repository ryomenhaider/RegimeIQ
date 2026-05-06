import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

// CSRF token stored in memory
let csrfToken = null;

/**
 * Axios instance configured for API requests
 * - baseURL from environment variable
 * - withCredentials: true (httpOnly cookie sent automatically)
 * - Request/response interceptors for auth, CSRF, and error handling
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Track if refresh is in progress to prevent infinite loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Request interceptor
 * - Attach Authorization header if token exists
 * - Attach X-CSRF-Token on mutation requests
 */
api.interceptors.request.use((config) => {
  const authStore = useAuthStore.getState();
  const token = authStore.getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach CSRF token on POST, PATCH, DELETE requests
  if (['post', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
});

/**
 * Response interceptor with comprehensive error handling
 * - Handle 401 with token refresh
 * - Handle 403 with permission error
 * - Handle 404 (return null, component handles)
 * - Handle 429 rate limiting with Retry-After
 * - Handle 422 validation errors
 * - Handle 500/503 server errors
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Handle 401 Unauthorized with token refresh
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Another request is already refreshing, queue this one
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        // Attempt to refresh token
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { token, username, plan, expiresIn } = response.data;
        const authStore = useAuthStore.getState();
        authStore.setAuth(token, username, plan, expiresIn);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        processQueue(null, token);

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        const authStore = useAuthStore.getState();
        authStore.clearAuth();
        processQueue(refreshError, null);

        // Redirect to login
        window.location.href = '/login';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 400 Bad Request - return data for form handling
    if (status === 400) {
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (status === 403) {
      toast.error('You do not have permission to do that.');
      return Promise.reject(error);
    }

    // Handle 404 Not Found - return null, component handles
    if (status === 404) {
      return Promise.reject(error);
    }

    // Handle 422 Unprocessable Entity (validation errors)
    if (status === 422) {
      return Promise.reject(error);
    }

    // Handle 429 Rate Limiting
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        error.retryAfter = parseInt(retryAfter, 10);
        toast.error(`Too many requests. Try again in ${retryAfter}s.`);
      } else {
        toast.error('Too many requests. Please slow down.');
      }
      return Promise.reject(error);
    }

    // Handle 500 Internal Server Error
    if (status === 500) {
      toast.error('Something went wrong. We have been notified.');
      return Promise.reject(error);
    }

    // Handle 503 Service Unavailable
    if (status === 503) {
      toast.error('System maintenance in progress.', {
        duration: Infinity,
        action: {
          label: 'Retry',
          onClick: () => window.location.reload()
        }
      });
      return Promise.reject(error);
    }

    // Generic error handling
    if (error.response) {
      // Server responded with error status
      return Promise.reject(error);
    }

    if (error.request) {
      // Request was made but no response
      toast.error('Network error. Check your connection.');
      return Promise.reject(error);
    }

    // Something happened in setting up the request
    return Promise.reject(error);
  }
);

export const setCsrfToken = (token) => {
  csrfToken = token;
};

export const getCsrfToken = () => csrfToken;

export default api;
