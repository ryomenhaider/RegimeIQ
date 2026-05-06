import { create } from 'zustand';

/**
 * Zustand store for authentication state (memory only)
 * - NEVER uses localStorage or sessionStorage
 * - NEVER persists across page reloads
 * - No rehydration on mount — state begins empty
 */
export const useAuthStore = create((set, get) => ({
  // State
  accessToken: null,
  username: null,
  plan: null, // 'trial' | 'standard' | 'unlimited'
  expiry: null, // Unix ms timestamp

  // Actions
  setAuth: (token, username, plan, expiresIn) => {
    const expiry = Date.now() + expiresIn * 1000;
    set({
      accessToken: token,
      username,
      plan,
      expiry
    });
  },

  clearAuth: () => {
    set({
      accessToken: null,
      username: null,
      plan: null,
      expiry: null
    });
  },

  isAuthenticated: () => {
    const { accessToken, expiry } = get();
    return accessToken !== null && Date.now() < expiry;
  },

  // Getter for token
  getToken: () => {
    const { accessToken, expiry } = get();
    if (accessToken && Date.now() < expiry) {
      return accessToken;
    }
    return null;
  },

  // Getter for remaining time in seconds
  getExpiresIn: () => {
    const { expiry } = get();
    if (!expiry) return 0;
    const remaining = Math.max(0, expiry - Date.now());
    return Math.floor(remaining / 1000);
  }
}));
