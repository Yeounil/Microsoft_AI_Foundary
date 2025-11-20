/**
 * Supabase를 이용한 뉴스 데이터 조회 및 다양성 알고리즘
 */

import { createClient } from "@supabase/supabase-js";
import { NewsArticle } from "@/types";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseNewsArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: string;
  ai_score: number;
  related_stocks: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * 다양성 알고리즘을 적용하여 종목별 분산을 보장
 */
function applyDiversityAlgorithm(
  articles: SupabaseNewsArticle[],
  maxArticles: number = 20,
  maxPerStock: number = 3
): SupabaseNewsArticle[] {
  const result: SupabaseNewsArticle[] = [];
  const stockCounts: Record<string, number> = {};

  for (const article of articles) {
    if (result.length >= maxArticles) break;

    // 각 종목별 아티클 개수 확인
    const stocks = article.related_stocks || [];
    const primaryStock = stocks[0];

    // 주 종목 초기화
    if (!stockCounts[primaryStock]) {
      stockCounts[primaryStock] = 0;
    }

    // 주 종목이 maxPerStock에 도달하면 다음 아티클로
    if (stockCounts[primaryStock] >= maxPerStock) {
      continue;
    }

    result.push(article);
    stockCounts[primaryStock]++;
  }

  return result;
}

/**
 * Supabase에서 뉴스 아티클 조회
 * 정렬: 날짜 desc → ai_score desc
 */
export async function getNewsArticles(
  limit: number = 20,
  applyDiversity: boolean = true
): Promise<NewsArticle[]> {
  try {
    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .order("published_at", { ascending: false })
      .order("ai_score", { ascending: false })
      .limit(limit * 2); // 다양성 알고리즘 적용을 위해 더 많이 가져옴

    if (error) {
      console.error("[Supabase] Error fetching news:", error);
      return [];
    }

    if (!data) {
      logger.warn("[Supabase] No news articles found");
      return [];
    }

    // 타입 변환 및 다양성 알고리즘 적용
    let articles = data as SupabaseNewsArticle[];

    if (applyDiversity) {
      articles = applyDiversityAlgorithm(articles, limit);
    } else {
      articles = articles.slice(0, limit);
    }

    return articles.map((article) => ({
      title: article.title,
      content: article.content,
      url: article.url,
      source: article.source,
      published_at: article.published_at,
      sentiment: article.sentiment as "positive" | "negative" | "neutral",
      ai_score: article.ai_score,
      related_stocks: article.related_stocks || [],
    })) as NewsArticle[];
  } catch (error) {
    console.error("[Supabase] Exception fetching news:", error);
    return [];
  }
}

/**
 * 특정 날짜의 뉴스 조회
 */
export async function getNewsByDate(
  date: Date,
  limit: number = 20,
  applyDiversity: boolean = true
): Promise<NewsArticle[]> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .gte("published_at", startOfDay.toISOString())
      .lte("published_at", endOfDay.toISOString())
      .order("ai_score", { ascending: false })
      .limit(limit * 2);

    if (error) {
      console.error("[Supabase] Error fetching news by date:", error);
      return [];
    }

    if (!data) return [];

    let articles = data as SupabaseNewsArticle[];

    if (applyDiversity) {
      articles = applyDiversityAlgorithm(articles, limit);
    } else {
      articles = articles.slice(0, limit);
    }

    return articles.map((article) => ({
      title: article.title,
      content: article.content,
      url: article.url,
      source: article.source,
      published_at: article.published_at,
      sentiment: article.sentiment as "positive" | "negative" | "neutral",
      ai_score: article.ai_score,
      related_stocks: article.related_stocks || [],
    })) as NewsArticle[];
  } catch (error) {
    console.error("[Supabase] Exception fetching news by date:", error);
    return [];
  }
}

/**
 * 특정 종목 관련 뉴스 조회
 */
export async function getNewsByStock(
  symbol: string,
  limit: number = 10
): Promise<NewsArticle[]> {
  try {
    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .contains("related_stocks", [symbol.toUpperCase()])
      .order("published_at", { ascending: false })
      .order("ai_score", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[Supabase] Error fetching stock news:", error);
      return [];
    }

    if (!data) return [];

    return (data as SupabaseNewsArticle[]).map((article) => ({
      title: article.title,
      content: article.content,
      url: article.url,
      source: article.source,
      published_at: article.published_at,
      sentiment: article.sentiment as "positive" | "negative" | "neutral",
      ai_score: article.ai_score,
      related_stocks: article.related_stocks || [],
    })) as NewsArticle[];
  } catch (error) {
    console.error("[Supabase] Exception fetching stock news:", error);
    return [];
  }
}

/**
 * ai_score 높은 뉴스 조회 (HOT 뉴스)
 */
export async function getHotNews(
  limit: number = 20,
  daysBack: number = 7
): Promise<NewsArticle[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .gte("published_at", cutoffDate.toISOString())
      .order("ai_score", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit * 2);

    if (error) {
      console.error("[Supabase] Error fetching hot news:", error);
      return [];
    }

    if (!data) return [];

    // 다양성 알고리즘 적용
    const articles = applyDiversityAlgorithm(
      data as SupabaseNewsArticle[],
      limit
    );

    return articles.map((article) => ({
      title: article.title,
      content: article.content,
      url: article.url,
      source: article.source,
      published_at: article.published_at,
      sentiment: article.sentiment as "positive" | "negative" | "neutral",
      ai_score: article.ai_score,
      related_stocks: article.related_stocks || [],
    })) as NewsArticle[];
  } catch (error) {
    console.error("[Supabase] Exception fetching hot news:", error);
    return [];
  }
}
