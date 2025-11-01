import { setAuthToken, setRefreshToken } from './api';
import api from './api';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
}

class AuthService {
  constructor() {
    // 앱 시작 시 기존 토큰을 api.ts에도 설정
    const existingToken = this.getToken();
    if (existingToken) {
      setAuthToken(existingToken);
    }
  }

  // 로그인
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      console.log('Attempting login to:', '/api/v2/auth/login');
      const response = await api.post('/api/v2/auth/login', {
        username,
        password
      });
      console.log('Login successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      throw error;
    }
  }

  // 회원가입
  async register(username: string, email: string, password: string): Promise<RegisterResponse> {
    const response = await api.post('/api/v2/auth/register', {
      username,
      email,
      password
    });
    return response.data;
  }

  // 토큰 검증 및 사용자 정보 조회
  async getCurrentUser(): Promise<UserProfile> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token found');
    }

    const response = await api.get('/api/v2/auth/me');
    return response.data;
  }

  // 토큰 검증
  async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await api.get('/api/v2/auth/verify');

      return response.data.valid === true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  // 토큰 저장
  saveToken(token: string, refreshToken?: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }
    // api.ts의 axios 인스턴스에도 토큰 설정
    setAuthToken(token);
    if (refreshToken) {
      setRefreshToken(refreshToken);
    }
  }

  // 토큰 조회
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  // 로그아웃 (토큰 삭제)
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    // 서버에 로그아웃 요청 (Refresh Token 폐기)
    if (refreshToken) {
      try {
        await api.post('/api/v2/auth/logout', {
          refresh_token: refreshToken
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
        // 서버 요청 실패해도 로컬 토큰은 삭제
      }
    }

    // 로컬 스토리지에서 토큰 삭제
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    // api.ts의 axios 인스턴스에서도 토큰 제거
    setAuthToken('');
  }

  // 모든 기기에서 로그아웃
  async logoutAll(): Promise<void> {
    try {
      await api.post('/api/v2/auth/logout-all');
    } catch (error) {
      console.error('Logout all failed:', error);
      throw error;
    }

    // 로컬 스토리지에서 토큰 삭제
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    setAuthToken('');
  }

  // 리프레시 토큰 조회
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  // 로그인 상태 확인
  isLoggedIn(): boolean {
    const token = this.getToken();
    return token !== null;
  }
}

export const authService = new AuthService();