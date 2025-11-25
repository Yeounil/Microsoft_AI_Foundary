// User types
export interface User {
  id: string;
  username: string;
  email: string;
  created_at?: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
}

export interface UserLogin {
  username?: string;
  email?: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Stock types
export interface Stock {
  symbol: string;
  company_name: string;
  current_price: number;
  pe_ratio?: number;
  eps?: number;
  dividend_yield?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  exchange?: string;
  industry?: string;
  sector?: string;
  currency?: string;
}

export interface StockPriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change?: number;
  changePercent?: number;
}

export interface ChartData {
  symbol: string;
  company_name: string;
  current_price: number;
  currency: string;
  chart_data: StockPriceData[];
  cache_info?: string;
}

// WebSocket types - Import from dedicated websocket types file
export type { PriceUpdate, WebSocketMessage } from '@/types/websocket';

// News types
export interface NewsArticle {
  title: string;
  kr_title?: string;  // 한글 번역 제목
  content?: string;
  summary?: string;
  url: string;
  source?: string;
  published_at?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  ai_score?: number;
  related_stocks?: string[];
  image_url?: string;
}

export interface NewsResponse {
  total_count: number;
  articles: NewsArticle[];
  ai_summary?: string;
  user_interests?: string[];
  recommendation_type?: string;
  generated_at?: string;
}

// Analysis types
export interface StockAnalysis {
  symbol: string;
  ai_score: number;
  market_sentiment: number;
  volatility_index: number;
  liquidity_score: number;
  recommendation: string;
  technical_indicators?: {
    rsi?: number;
    macd?: number;
    ma_50?: number;
    ma_200?: number;
  };
  financial_ratios?: {
    pe_ratio?: number;
    pb_ratio?: number;
    debt_to_equity?: number;
    roe?: number;
  };
  risk_analysis?: {
    market_risk: 'low' | 'medium' | 'high';
    volatility_risk: 'low' | 'medium' | 'high';
    liquidity_risk: 'low' | 'medium' | 'high';
  };
}

export interface NewsAnalysis {
  id: string;
  title: string;
  kr_title?: string;  // 한글 번역 제목
  published_at: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact_prediction: string;
  related_stocks: string[];
  ai_summary: string;
  original_content?: string;
  translated_content?: string;
}

export interface NewsReport {
  id: string;
  title: string;
  generated_at: string;
  analysis_period: string;
  analyzed_count: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  executive_summary: string;
  market_reaction: string;
  price_impact: string;
  competitor_analysis: string;
  risk_factors: string;
  investment_recommendation: string;
  conclusion: string;
  disclaimer: string;
}

// My Reports types (News Report API v1)
export interface Report {
  id: number;
  symbol: string;
  analyzed_count: number;
  limit_used: number;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
}

export interface ReportDetail extends Report {
  user_id: string;
  report_data: {
    summary?: string;
    sentiment?: string;
    key_points?: string[];
    recommendations?: string[];
    analyzed_articles?: {
      title: string;
      url: string;
      published_at: string;
      sentiment?: string;
      impact_score?: number;
    }[];
    [key: string]: any;
  };
}

export interface MyReportsResponse {
  total_count: number;
  reports: Report[];
}