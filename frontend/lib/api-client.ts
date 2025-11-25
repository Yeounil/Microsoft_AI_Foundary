import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { AuthTokens } from '@/types';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<void> | null = null;
  // 인증 상태 추적 (세션 만료 이벤트용)
  private isAuthenticated: boolean = false;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // HttpOnly 쿠키 자동 전송
    });

    // Request interceptor - 쿠키가 자동 전송되므로 Authorization 헤더 불필요
    this.client.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Skip retry for login/register requests
        const skipAuthRetry = originalRequest.headers?.['X-Skip-Auth-Retry'] === 'true';

        if (error.response?.status === 401 && !originalRequest._retry && !skipAuthRetry) {
          originalRequest._retry = true;

          try {
            await this.refreshAccessToken();
            // 쿠키가 갱신되었으므로 재요청
            return this.client(originalRequest);
          } catch (refreshError) {
            // 세션 만료 이벤트 발생 (이전에 인증된 상태였던 경우에만)
            if (typeof window !== 'undefined' && this.isAuthenticated) {
              this.isAuthenticated = false;
              window.dispatchEvent(new CustomEvent('session-expired'));
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // HttpOnly 쿠키 기반: 쿠키가 자동으로 전송됨
    this.refreshPromise = axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v2/auth/refresh`,
        {}, // body 비움 - 쿠키에서 refresh_token 읽음
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      )
      .then(() => {
        // 쿠키가 서버에서 갱신됨 - 별도 처리 불필요
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  // Auth methods
  async register(data: { username: string; email: string; password: string }) {
    const response = await this.client.post('/api/v2/auth/register', data, {
      headers: { 'X-Skip-Auth-Retry': 'true' }
    });
    return response.data;
  }

  async login(data: { username?: string; email?: string; password: string }) {
    const response = await this.client.post<AuthTokens>('/api/v2/auth/login', data, {
      headers: { 'X-Skip-Auth-Retry': 'true' }
    });
    // 로그인 성공 - 쿠키는 서버에서 설정됨
    this.isAuthenticated = true;
    return response.data;
  }

  async logout() {
    try {
      // HttpOnly 쿠키 기반: 서버에서 쿠키 삭제
      await this.client.post('/api/v2/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }
    this.isAuthenticated = false;
  }

  async getMe() {
    const response = await this.client.get('/api/v2/auth/me');
    // getMe 성공 시 인증 상태 업데이트
    this.isAuthenticated = true;
    return response.data;
  }

  // Social Login methods
  async getSocialAuthUrl(provider: 'kakao' | 'google' | 'naver', state?: string) {
    const response = await this.client.get(`/api/v2/social-auth/${provider}/authorize`, {
      params: state ? { state } : undefined,
    });
    return response.data;
  }

  async socialLogin(provider: 'kakao' | 'google' | 'naver', code: string, state?: string) {
    const response = await this.client.post<AuthTokens>(
      `/api/v2/social-auth/${provider}/login`,
      { code, state },
      {
        headers: { 'X-Skip-Auth-Retry': 'true' }
      }
    );
    // 소셜 로그인 성공 - 쿠키는 서버에서 설정됨
    this.isAuthenticated = true;
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
    symbols?: string;
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

  async createNewsReport(symbol: string, limit: number = 20) {
    const response = await this.client.post('/api/v1/news-report', {
      symbol,
      limit,
    });
    return response.data;
  }

  async getNewsReport(symbol: string) {
    const response = await this.client.get(`/api/v1/news-report/${symbol}`);
    return response.data;
  }

  async previewNewsForReport(symbol: string, limit: number = 20) {
    const response = await this.client.get(`/api/v1/news-report/${symbol}/preview`, {
      params: { limit },
    });
    return response.data;
  }

  // Analysis methods
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

  // User Interests (Watchlist)
  async getFavorites() {
    const response = await this.client.get('/api/v2/recommendations/interests');
    return response.data;
  }

  async addFavorite(symbol: string, userId: string) {
    const response = await this.client.post('/api/v2/recommendations/interests', {
      user_id: userId,
      interest: symbol,
    });
    return response.data;
  }

  async removeFavorite(symbol: string) {
    const response = await this.client.delete(`/api/v2/recommendations/interests/symbol/${symbol}`);
    return response.data;
  }

  // PDF methods
  async generateNewsReportPDF(symbol: string, newsData: any[], analysisSummary?: string) {
    const response = await this.client.post('/api/v2/pdf/generate/news-report', {
      symbol,
      news_data: newsData,
      analysis_summary: analysisSummary,
    });
    return response.data;
  }

  async generateStockAnalysisPDF(symbol: string, analysisData: any) {
    const response = await this.client.post('/api/v2/pdf/generate/stock-analysis', {
      symbol,
      analysis_data: analysisData,
    });
    return response.data;
  }

  async generateComprehensiveReportPDF(symbols: string[], reportData: any) {
    const response = await this.client.post('/api/v2/pdf/generate/comprehensive-report', {
      symbols,
      report_data: reportData,
    });
    return response.data;
  }

  async getPDFHistory(limit: number = 20) {
    const response = await this.client.get('/api/v2/pdf/history', {
      params: { limit },
    });
    return response.data;
  }

  // Generic request method
  async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  // Generic HTTP methods
  get<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }

  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config);
  }

  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config);
  }

  delete<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config);
  }
}

const apiClient = new ApiClient();
export default apiClient;
