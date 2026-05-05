import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  accessToken: null,
  username: null,
  plan: null,
  expiry: null,

  setAuth: (accessToken, username, plan, expiry) => 
    set({ accessToken, username, plan, expiry }),

  clearAuth: () => 
    set({ accessToken: null, username: null, plan: null, expiry: null }),

  isAuthenticated: () => {
    const { accessToken, expiry } = get();
    if (!accessToken || !expiry) return false;
    return Date.now() < expiry;
  },
}));
