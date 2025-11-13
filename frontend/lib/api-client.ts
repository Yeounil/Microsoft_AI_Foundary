import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { AuthTokens } from '@/types';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            if (typeof window !== 'undefined') {
              // Dispatch session expired event
              window.dispatchEvent(new CustomEvent('session-expired'));
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  private setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }

  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.client
      .post<AuthTokens>('/api/v2/auth/refresh', {
        refresh_token: refreshToken,
      })
      .then((response) => {
        this.setTokens(response.data);
        return response.data.access_token;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  // Auth methods
  async register(data: { username: string; email: string; password: string }) {
    const response = await this.client.post('/api/v2/auth/register', data);
    return response.data;
  }

  async login(data: { username?: string; email?: string; password: string }) {
    const response = await this.client.post<AuthTokens>('/api/v2/auth/login', data);
    this.setTokens(response.data);
    return response.data;
  }

  async logout(refreshToken?: string) {
    const token = refreshToken || this.getRefreshToken();
    if (token) {
      try {
        await this.client.post('/api/v2/auth/logout', {
          refresh_token: token,
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    this.clearTokens();
  }

  async getMe() {
    const response = await this.client.get('/api/v2/auth/me');
    return response.data;
  }

  // Stock methods
  async getAllTradableStocks(marketCapMoreThan?: number, limit?: number) {
    const response = await this.client.get('/api/v1/stocks/list', {
      params: { market_cap_more_than: marketCapMoreThan, limit },
    });
    return response.data;
  }

  async getBatchQuotes(symbols: string[]) {
    const response = await this.client.post('/api/v1/stocks/quotes', symbols);
    return response.data;
  }

  async getSupportedStocks() {
    const response = await this.client.get('/api/v1/stocks/supported');
    return response.data;
  }

  async searchStocks(query: string) {
    const response = await this.client.get('/api/v1/stocks/search', {
      params: { q: query },
    });
    return response.data;
  }

  async getStockData(symbol: string, period?: string, interval?: string) {
    const response = await this.client.get(`/api/v1/stocks/${symbol}`, {
      params: { period, interval },
    });
    return response.data;
  }

  async getChartData(symbol: string, period?: string, interval?: string) {
    const response = await this.client.get(`/api/v1/stocks/${symbol}/chart`, {
      params: { period, interval },
    });
    return response.data;
  }

  async getIntradayData(symbol: string, interval: string, fromDate?: string, toDate?: string) {
    const response = await this.client.get(`/api/v1/stocks/${symbol}/intraday`, {
      params: {
        interval,
        from_date: fromDate,
        to_date: toDate
      },
    });
    return response.data;
  }

  // News methods
  async getLatestNews(limit: number = 10) {
    const response = await this.client.get('/api/v2/news/latest', {
      params: { limit },
    });
    return response.data;
  }

  async getStockNews(symbol: string, limit: number = 10, aiMode: boolean = true) {
    const response = await this.client.get(`/api/v2/news/stock/${symbol}`, {
      params: { limit, ai_mode: aiMode },
    });
    return response.data;
  }

  async getStockNewsPublic(symbol: string, limit: number = 10) {
    const response = await this.client.get(`/api/v2/news/stock/${symbol}/public`, {
      params: { limit },
    });
    return response.data;
  }

  async getFinancialNews(query: string = 'finance', limit: number = 10, lang: string = 'en') {
    const response = await this.client.get('/api/v2/news/financial', {
      params: { query, limit, lang },
    });
    return response.data;
  }

  async getFinancialNewsV1(params: {
    symbol?: string;
    page?: number;
    limit?: number;
    lang?: string;
  }) {
    const response = await this.client.get('/api/v1/news/financial', {
      params,
    });
    return response.data;
  }

  async getNewsById(newsId: number) {
    const response = await this.client.get(`/api/v1/news/${newsId}`);
    return response.data;
  }

  async summarizeNews(query: string = 'finance', limit: number = 5, lang: string = 'en') {
    const response = await this.client.post('/api/v2/news/summarize', null, {
      params: { query, limit, lang },
    });
    return response.data;
  }

  async summarizeArticle(article: { title: string; content?: string; url: string }) {
    const response = await this.client.post('/api/v2/news/summarize-article', article);
    return response.data;
  }

  // Analysis methods
  async analyzeStock(symbol: string, period: string = '1mo') {
    const response = await this.client.post('/api/v2/analysis/stock', {
      symbol,
      period,
    });
    return response.data;
  }

  async analyzePortfolio(stocks: string[], weights: number[]) {
    const response = await this.client.post('/api/v2/analysis/portfolio', {
      stocks,
      weights,
    });
    return response.data;
  }

  // Recommendations methods
  async getPersonalizedRecommendations(limit: number = 10) {
    const response = await this.client.get('/api/v2/recommendations/personalized', {
      params: { limit },
    });
    return response.data;
  }

  async getStockRecommendations(symbol: string, limit: number = 5) {
    const response = await this.client.get(`/api/v2/recommendations/stock/${symbol}`, {
      params: { limit },
    });
    return response.data;
  }

  // User interests
  async getUserInterests() {
    const response = await this.client.get('/api/v2/auth/interests');
    return response.data;
  }

  async addUserInterest(interest: string) {
    const response = await this.client.post('/api/v2/auth/interests', {
      interest,
    });
    return response.data;
  }

  async removeUserInterest(interestId: number) {
    const response = await this.client.delete(`/api/v2/auth/interests/${interestId}`);
    return response.data;
  }

  // Favorites (Watchlist)
  async getFavorites() {
    const response = await this.client.get('/api/v2/analysis/favorites');
    return response.data;
  }

  async addFavorite(symbol: string, companyName?: string) {
    const params = companyName ? { company_name: companyName } : {};
    const response = await this.client.post(`/api/v2/analysis/favorites/${symbol}`, null, {
      params,
    });
    return response.data;
  }

  async removeFavorite(symbol: string) {
    const response = await this.client.delete(`/api/v2/analysis/favorites/${symbol}`);
    return response.data;
  }

  // Generic request method
  async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
}

const apiClient = new ApiClient();
export default apiClient;