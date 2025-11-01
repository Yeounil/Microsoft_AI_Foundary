import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 뉴스 관련 타입
export interface News {
  id: number;
  symbol?: string;
  title: string;
  description: string | null;
  content?: string;
  url: string;
  source: string;
  author?: string;
  published_at: string;
  image_url?: string;
  language?: string;
  category?: string;
  api_source?: string;
  created_at: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// 뉴스 직접 조회 함수들
export const newsDB = {
  // 최신 뉴스 가져오기
  async getLatestNews(limit: number = 10) {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase getLatestNews error:', error);
      throw error;
    }
    return data as News[];
  },

  // 종목별 뉴스 가져오기
  async getNewsBySymbol(symbol: string, limit: number = 5) {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .or(`symbol.eq.${symbol},title.ilike.%${symbol}%`)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase getNewsBySymbol error:', error);
      throw error;
    }
    return data as News[];
  },

  // 특정 기간의 뉴스 가져오기
  async getNewsByDateRange(startDate: string, endDate: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .gte('published_at', startDate)
      .lte('published_at', endDate)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase getNewsByDateRange error:', error);
      throw error;
    }
    return data as News[];
  },

  // 오늘의 뉴스 가져오기
  async getTodayNews(limit: number = 10) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .gte('published_at', today.toISOString())
      .lt('published_at', tomorrow.toISOString())
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase getTodayNews error:', error);
      throw error;
    }
    return data as News[];
  }
};

// 사용자 관심 종목 관련
export interface UserInterest {
  id: number;
  user_id: string;
  interest: string;
  created_at: string;
}

export const interestsDB = {
  // 사용자 관심 종목 가져오기
  async getUserInterests(userId: string) {
    const { data, error } = await supabase
      .from('user_interests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getUserInterests error:', error);
      throw error;
    }
    return data as UserInterest[];
  }
};
