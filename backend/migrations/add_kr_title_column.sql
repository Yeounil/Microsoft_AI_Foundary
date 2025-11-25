-- ================================================================================
-- Add kr_title column to news_articles table
-- ================================================================================
-- 뉴스 기사 제목의 한글 번역을 저장하기 위한 컬럼 추가
-- Generated: 2025-11-25
-- ================================================================================

ALTER TABLE public.news_articles
ADD COLUMN IF NOT EXISTS kr_title character varying(500);

COMMENT ON COLUMN public.news_articles.kr_title IS '뉴스 기사 제목의 한글 번역';

-- 인덱스 추가 (검색 성능 향상)
-- Supabase는 기본적으로 'simple' 텍스트 검색 설정을 사용
CREATE INDEX IF NOT EXISTS idx_news_articles_kr_title
ON public.news_articles USING gin(to_tsvector('simple', kr_title));
