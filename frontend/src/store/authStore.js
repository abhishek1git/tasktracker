import { create } from "zustand";
import { authAPI } from "../services/api";

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const res = await authAPI.me();
      set({ user: res.data.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { user, access_token, refresh_token } = res.data.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    set({ user, isAuthenticated: true });
    return user;
  },

  register: async (data) => {
    const res = await authAPI.register(data);
    const { user, access_token, refresh_token } = res.data.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    set({ user, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    try {
      await authAPI.logout(refreshToken);
    } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updates) =>
    set((state) => ({ user: { ...state.user, ...updates } })),
}));

export default useAuthStore;
