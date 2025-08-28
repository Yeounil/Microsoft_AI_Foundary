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

// 인증 API (Legacy SQLite)
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

// 뉴스 추천 API (Legacy SQLite)
export const recommendationAPI = {
  getRecommendedNews: async (limit: number = 10, daysBack: number = 7) => {
    const response = await api.get(`/api/v1/recommendations/news?limit=${limit}&days_back=${daysBack}`);
    return response.data;
  },

  getUserInterests: async () => {
    const response = await api.get('/api/v1/recommendations/interests');
    return response.data;
  },

  addUserInterest: async (interest: {
    symbol: string;
    market: string;
    company_name?: string;
    priority: number;
  }) => {
    const response = await api.post('/api/v1/recommendations/interests', interest);
    return response.data;
  },

  removeUserInterest: async (symbol: string, market: string) => {
    const response = await api.delete(`/api/v1/recommendations/interests/${symbol}?market=${market}`);
    return response.data;
  },

  trackNewsInteraction: async (interaction: {
    news_url: string;
    action: string;
    news_title?: string;
    symbol?: string;
    interaction_time?: number;
  }) => {
    const response = await api.post('/api/v1/recommendations/interactions', interaction);
    return response.data;
  },

  getSymbolRelatedNews: async (symbol: string, market: string = 'us', limit: number = 10) => {
    const response = await api.get(`/api/v1/recommendations/news/${symbol}?market=${market}&limit=${limit}`);
    return response.data;
  },

  autoAddInterestFromNews: async (symbol: string, market: string = 'us') => {
    const response = await api.post(`/api/v1/recommendations/news/${symbol}/auto-interest?market=${market}`);
    return response.data;
  },

  getTrendingNews: async (limit: number = 20, hours: number = 24) => {
    const response = await api.get(`/api/v1/recommendations/news/trending?limit=${limit}&hours=${hours}`);
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