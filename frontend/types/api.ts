export interface StockData {
  symbol: string;
  company_name: string;
  current_price: number;
  previous_close: number;
  market_cap: number;
  pe_ratio: number;
  currency: string;
  price_data: PriceData[];
}

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  image_url: string;
}

export interface StockAnalysis {
  symbol: string;
  company_name: string;
  current_price: number;
  currency: string;
  analysis: string;
  generated_at: string;
}

export interface NewsResponse {
  query: string;
  language: string;
  total_count: number;
  articles: NewsArticle[];
}

export interface NewsSummary {
  query: string;
  language: string;
  articles_count: number;
  articles: NewsArticle[];
  ai_summary: string;
  generated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Supabase용 추가 타입들
export interface SupabaseUserInterest {
  id: number;
  user_id: string;
  interest: string;
  created_at?: string;
}

export interface SupabaseInterestRequest {
  interest: string;
}

export interface SupabaseUser {
  id: string;
  username: string;
  email: string;
}