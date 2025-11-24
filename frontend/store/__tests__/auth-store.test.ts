import { act } from "@testing-library/react";
import { useAuthStore } from "../auth-store";
import apiClient from "@/lib/api-client";

// Mock the API client
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("auth-store", () => {
  beforeEach(() => {
    // Reset store state
    const { setState } = useAuthStore;
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      showSessionExpiredDialog: false,
      isHydrated: false,
    });

    // Clear all mocks
    jest.clearAllMocks();

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.showSessionExpiredDialog).toBe(false);
    });
  });

  describe("login", () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
    };

    it("should login successfully", async () => {
      mockApiClient.login.mockResolvedValueOnce(undefined);
      mockApiClient.getMe.mockResolvedValueOnce(mockUser);

      await act(async () => {
        await useAuthStore.getState().login({
          username: "testuser",
          password: "password123",
        });
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during login", async () => {
      mockApiClient.login.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 100);
          })
      );
      mockApiClient.getMe.mockResolvedValueOnce(mockUser);

      const loginPromise = useAuthStore.getState().login({
        username: "testuser",
        password: "password123",
      });

      // Check loading state
      expect(useAuthStore.getState().isLoading).toBe(true);

      await act(async () => {
        await loginPromise;
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("should handle login error", async () => {
      const error = { response: { status: 401 } };
      mockApiClient.login.mockRejectedValueOnce(error);

      await expect(
        act(async () => {
          await useAuthStore.getState().login({
            username: "testuser",
            password: "wrongpassword",
          });
        })
      ).rejects.toEqual(error);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.error).toBe("아이디 또는 비밀번호를 확인해주세요");
      expect(state.isLoading).toBe(false);
    });

    it("should support email login", async () => {
      mockApiClient.login.mockResolvedValueOnce(undefined);
      mockApiClient.getMe.mockResolvedValueOnce(mockUser);

      await act(async () => {
        await useAuthStore.getState().login({
          email: "test@example.com",
          password: "password123",
        });
      });

      expect(mockApiClient.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  describe("register", () => {
    const mockUser = {
      id: 1,
      username: "newuser",
      email: "new@example.com",
    };

    it("should register and auto-login successfully", async () => {
      mockApiClient.register.mockResolvedValueOnce(undefined);
      mockApiClient.login.mockResolvedValueOnce(undefined);
      mockApiClient.getMe.mockResolvedValueOnce(mockUser);

      await act(async () => {
        await useAuthStore.getState().register({
          username: "newuser",
          email: "new@example.com",
          password: "password123",
        });
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it("should handle duplicate user error", async () => {
      const error = { response: { status: 409 } };
      mockApiClient.register.mockRejectedValueOnce(error);

      await expect(
        act(async () => {
          await useAuthStore.getState().register({
            username: "existinguser",
            email: "existing@example.com",
            password: "password123",
          });
        })
      ).rejects.toEqual(error);

      const state = useAuthStore.getState();
      expect(state.error).toBe("이미 사용 중인 아이디 또는 이메일입니다");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      // Set logged in state
      useAuthStore.setState({
        user: { id: 1, username: "testuser", email: "test@example.com" },
        isAuthenticated: true,
      });

      mockApiClient.logout.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should clear state even if logout API fails", async () => {
      useAuthStore.setState({
        user: { id: 1, username: "testuser", email: "test@example.com" },
        isAuthenticated: true,
      });

      mockApiClient.logout.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("fetchUser", () => {
    it("should fetch user when access token exists", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      (localStorage.getItem as jest.Mock).mockReturnValue("valid-token");
      mockApiClient.getMe.mockResolvedValueOnce(mockUser);

      await act(async () => {
        await useAuthStore.getState().fetchUser();
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it("should not fetch when no access token", async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      await act(async () => {
        await useAuthStore.getState().fetchUser();
      });

      expect(mockApiClient.getMe).not.toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should handle fetch error", async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue("expired-token");
      mockApiClient.getMe.mockRejectedValueOnce(new Error("Unauthorized"));

      await act(async () => {
        await useAuthStore.getState().fetchUser();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useAuthStore.setState({ error: "Some error" });

      act(() => {
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe("setSessionExpired", () => {
    it("should set session expired dialog state", () => {
      act(() => {
        useAuthStore.getState().setSessionExpired(true);
      });

      expect(useAuthStore.getState().showSessionExpiredDialog).toBe(true);

      act(() => {
        useAuthStore.getState().setSessionExpired(false);
      });

      expect(useAuthStore.getState().showSessionExpiredDialog).toBe(false);
    });
  });
});
