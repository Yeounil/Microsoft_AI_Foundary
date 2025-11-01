import axios from 'axios';
import {
  StockData,
  NewsResponse,
  NewsSummary,
  StockAnalysis,
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 토큰 새로고침 상태 관리
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

// 토큰 관리
export const setAuthToken = (token: string) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  } else {
    delete api.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }
};

// 리프레시 토큰 저장/조회
export const setRefreshToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('refreshToken', token);
  }
};

export const getRefreshToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
};

// Response Interceptor - 토큰 자동 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고, 아직 재시도하지 않은 요청인 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 이미 토큰을 새로고침 중이면 큐에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // 리프레시 토큰이 없으면 로그아웃 처리
        setAuthToken('');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // 리프레시 토큰으로 새 액세스 토큰 요청
        const response = await axios.post(`${API_BASE_URL}/api/v2/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;

        // 새 토큰 저장
        setAuthToken(access_token);
        setRefreshToken(refresh_token);

        // 큐에 있는 요청들 처리
        processQueue(null);
        isRefreshing = false;

        // 원래 요청 재시도
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // 리프레시 실패 시 로그아웃 처리
        processQueue(refreshError);
        isRefreshing = false;
        setAuthToken('');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// 로컬 스토리지에서 토큰 로드 (클라이언트 측에서만)
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('token');
  if (token) {
    setAuthToken(token);
  }
}

// 인증 API (Supabase)
export const authSupabaseAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/api/v2/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post('/api/v2/auth/register', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/v2/auth/me');
    return response.data;
  },

  verifyToken: async (): Promise<{ valid: boolean; username: string }> => {
    const response = await api.get('/api/v2/auth/verify');
    return response.data;
  }
};

// 주식 API
export const stockAPI = {
  searchStocks: async (query: string) => {
    const response = await api.get(`/api/v1/stocks/search?q=${query}`);
    return response.data;
  },

  getStockData: async (symbol: string, period: string = '1y', market: string = 'us', interval: string = '1d'): Promise<StockData> => {
    const response = await api.get(`/api/v1/stocks/${symbol}?period=${period}&market=${market}&interval=${interval}`);
    return response.data;
  },

  getChartData: async (symbol: string, period: string = '1y', market: string = 'us', interval: string = '1d') => {
    const response = await api.get(`/api/v1/stocks/${symbol}/chart?period=${period}&market=${market}&interval=${interval}`);
    return response.data;
  }
};

// 뉴스 API
export const newsAPI = {
  getFinancialNews: async (query: string = 'finance', limit: number = 10, lang: string = 'en'): Promise<NewsResponse> => {
    const response = await api.get(`/api/v1/news/financial?query=${query}&limit=${limit}&lang=${lang}`);
    return response.data;
  },

  getStockNews: async (symbol: string, limit: number = 5, forceCrawl: boolean = false): Promise<NewsResponse> => {
    const response = await api.get(`/api/v1/news/stock/${symbol}?limit=${limit}&force_crawl=${forceCrawl}`);
    return response.data;
  },

  crawlStockNews: async (symbol: string, limit: number = 10): Promise<NewsResponse & { message: string; crawled_count: number }> => {
    const response = await api.post(`/api/v1/news/stock/${symbol}/crawl?limit=${limit}`);
    return response.data;
  },

  analyzeStockWithNews: async (symbol: string, analysisDays: number = 7, newsLimit: number = 20): Promise<{
    symbol: string;
    analysis_period_days: number;
    total_news_analyzed: number;
    ai_analysis: string;
    related_news: NewsResponse['articles'];
    generated_at: string;
  }> => {
    const response = await api.post(`/api/v1/news/stock/${symbol}/analyze?analysis_days=${analysisDays}&news_limit=${newsLimit}`);
    return response.data;
  },

  summarizeNews: async (query: string = 'finance', limit: number = 5, lang: string = 'en'): Promise<NewsSummary> => {
    const response = await api.post(`/api/v1/news/summarize?query=${query}&limit=${limit}&lang=${lang}`);
    return response.data;
  },

  summarizeStockNews: async (symbol: string, limit: number = 5): Promise<NewsSummary> => {
    const response = await api.post(`/api/v1/news/stock/${symbol}/summarize?limit=${limit}`);
    return response.data;
  },

  summarizeSingleArticle: async (article: any): Promise<{ article_title: string; ai_summary: string; generated_at: string }> => {
    const response = await api.post('/api/v2/news/summarize-article', article);
    return response.data;
  }
};

// 분석 API
export const analysisAPI = {
  analyzeStock: async (symbol: string, market: string = 'us', period: string = '1y'): Promise<StockAnalysis> => {
    const response = await api.post(`/api/v1/analysis/stock/${symbol}?market=${market}&period=${period}`);
    return response.data;
  },

  getMarketSummary: async () => {
    const response = await api.get('/api/v1/analysis/market-summary');
    return response.data;
  }
};

// 뉴스 추천 API (Supabase)
export const recommendationSupabaseAPI = {
  getUserInterests: async () => {
    const response = await api.get('/api/v2/recommendations/interests');
    return response.data;
  },

  addUserInterest: async (interest: { interest: string }) => {
    const response = await api.post('/api/v2/recommendations/interests', interest);
    return response.data;
  },

  removeUserInterestById: async (interestId: number) => {
    const response = await api.delete(`/api/v2/recommendations/interests/${interestId}`);
    return response.data;
  },

  removeUserInterestBySymbol: async (interest: string) => {
    const response = await api.delete(`/api/v2/recommendations/interests/symbol/${interest}`);
    return response.data;
  },

  updateUserInterest: async (interestId: number, interest: string) => {
    const response = await api.put(`/api/v2/recommendations/interests/${interestId}`, { interest });
    return response.data;
  },

  getUserInterestsForRecommendations: async () => {
    const response = await api.get('/api/v2/recommendations/interests/for-recommendations');
    return response.data;
  },

  getInterestStatistics: async () => {
    const response = await api.get('/api/v2/recommendations/interests/statistics');
    return response.data;
  },

  getRecommendedNewsByInterests: async (limit: number = 10) => {
    const response = await api.get(`/api/v2/recommendations/news/recommended?limit=${limit}`);
    return response.data;
  }
};

export default api;