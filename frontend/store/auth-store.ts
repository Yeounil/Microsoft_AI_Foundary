import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: { username?: string; email?: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.login(credentials);
          const userData = await apiClient.getMe();
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error) {
          const errorMessage = extractErrorMessage(error);
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.register(data);
          // Auto login after registration
          await get().login({ username: data.username, password: data.password });
        } catch (error) {
          const errorMessage = extractErrorMessage(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiClient.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            error: null
          });
        }
      },

      fetchUser: async () => {
        if (!localStorage.getItem('access_token')) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const userData = await apiClient.getMe();
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false
          });
        } catch {
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);