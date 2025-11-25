import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  showSessionExpiredDialog: boolean;

  // Actions
  login: (credentials: { username?: string; email?: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  setSessionExpired: (show: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      error: null,
      showSessionExpiredDialog: false,

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
        } catch (error: unknown) {
          let errorMessage = '로그인 중 오류가 발생했습니다';

          // 401 에러인 경우 사용자 친화적인 메시지 표시
          const axiosError = error as { response?: { status?: number } };
          if (axiosError?.response?.status === 401) {
            errorMessage = '아이디 또는 비밀번호를 확인해주세요';
          } else {
            errorMessage = extractErrorMessage(error);
          }

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
        } catch (error: unknown) {
          let errorMessage = '회원가입 중 오류가 발생했습니다';

          // 409 에러인 경우 (중복)
          const axiosError = error as { response?: { status?: number } };
          if (axiosError?.response?.status === 409) {
            errorMessage = '이미 사용 중인 아이디 또는 이메일입니다';
          } else {
            errorMessage = extractErrorMessage(error);
          }

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
        // HttpOnly 쿠키는 JavaScript에서 접근 불가
        // API 호출을 시도하여 인증 상태 확인
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

      setSessionExpired: (show: boolean) => {
        set({ showSessionExpiredDialog: show });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage), // sessionStorage 사용 (보안 강화)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);