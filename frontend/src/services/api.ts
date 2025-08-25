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
} from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 토큰 관리
export const setAuthToken = (token: string) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// 로컬 스토리지에서 토큰 로드
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

// 인증 API
export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/api/v1/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post('/api/v1/auth/register', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  },

  verifyToken: async (): Promise<{ valid: boolean; username: string }> => {
    const response = await api.get('/api/v1/auth/verify');
    return response.data;
  }
};

// 주식 API
export const stockAPI = {
  searchStocks: async (query: string) => {
    const response = await api.get(`/api/v1/stocks/search?q=${query}`);
    return response.data;
  },

  getStockData: async (symbol: string, period: string = '1y', market: string = 'us'): Promise<StockData> => {
    const response = await api.get(`/api/v1/stocks/${symbol}?period=${period}&market=${market}`);
    return response.data;
  },

  getChartData: async (symbol: string, period: string = '1y', market: string = 'us') => {
    const response = await api.get(`/api/v1/stocks/${symbol}/chart?period=${period}&market=${market}`);
    return response.data;
  }
};

// 뉴스 API
export const newsAPI = {
  getFinancialNews: async (query: string = 'finance', limit: number = 10, lang: string = 'en'): Promise<NewsResponse> => {
    const response = await api.get(`/api/v1/news/financial?query=${query}&limit=${limit}&lang=${lang}`);
    return response.data;
  },

  getStockNews: async (symbol: string, limit: number = 5): Promise<NewsResponse> => {
    const response = await api.get(`/api/v1/news/stock/${symbol}?limit=${limit}`);
    return response.data;
  },

  summarizeNews: async (query: string = 'finance', limit: number = 5, lang: string = 'en'): Promise<NewsSummary> => {
    const response = await api.post(`/api/v1/news/summarize?query=${query}&limit=${limit}&lang=${lang}`);
    return response.data;
  },

  summarizeStockNews: async (symbol: string, limit: number = 5): Promise<NewsSummary> => {
    const response = await api.post(`/api/v1/news/stock/${symbol}/summarize?limit=${limit}`);
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

export default api;