import axios from 'axios';
import { setAuthToken } from './api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Supabase API v2 사용
const AUTH_API_URL = `${API_BASE_URL}/api/v2/auth`;

export interface LoginResponse {
  access_token: string;
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
    const response = await axios.post(`${AUTH_API_URL}/login`, {
      username,
      password
    });
    return response.data;
  }

  // 회원가입
  async register(username: string, email: string, password: string): Promise<RegisterResponse> {
    const response = await axios.post(`${AUTH_API_URL}/register`, {
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

    const response = await axios.get(`${AUTH_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }

  // 토큰 검증
  async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await axios.get(`${AUTH_API_URL}/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.valid === true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  // 토큰 저장
  saveToken(token: string): void {
    localStorage.setItem('token', token);
    // api.ts의 axios 인스턴스에도 토큰 설정
    setAuthToken(token);
  }

  // 토큰 조회
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // 로그아웃 (토큰 삭제)
  logout(): void {
    localStorage.removeItem('token');
    // api.ts의 axios 인스턴스에서도 토큰 제거
    setAuthToken('');
  }

  // 로그인 상태 확인
  isLoggedIn(): boolean {
    const token = this.getToken();
    return token !== null;
  }

  // Axios 인터셉터 설정 (자동으로 토큰을 헤더에 추가)
  setupAxiosInterceptors(): void {
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터: 401 에러 시 자동 로그아웃
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          // 로그인 페이지로 리다이렉트 (필요시)
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }
}

export const authService = new AuthService();