import { create } from 'zustand';
import api from '../api/client';
import type { UserResponse } from '../types';
interface AuthState {
  user: UserResponse | null;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  hydrate: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null });
  },
}));
