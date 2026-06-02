import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../../shared/types';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    set({ user: data.user });
  },

  register: async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    set({ user: data.user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    disconnectSocket();
    set({ user: null });
  },

  restore: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const { data } = await api.get('/users/me');
        set({ user: data });
      }
    } catch {
      // token invalid — user stays logged out
    } finally {
      set({ isLoading: false });
    }
  },
}));
