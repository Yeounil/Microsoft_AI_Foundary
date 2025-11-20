-- ================================================================================
-- Supabase Database Schema
-- ================================================================================
-- Generated: 2025-11-20
-- Total Tables: 13
-- Source: Live Supabase Database
--
-- This schema represents the actual structure of the production database.
-- All tables, columns, constraints, and relationships are included.
-- ================================================================================

-- ================================================================================
-- Table 1: ai_analysis_history
-- ================================================================================
-- AI 분석 히스토리 저장
-- 사용자별 종목 분석 결과를 기록
-- ================================================================================

CREATE TABLE public.ai_analysis_history (
  id integer NOT NULL DEFAULT nextval('ai_analysis_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  symbol character varying(20) NOT NULL,
  analysis_type character varying(50) DEFAULT 'stock_analysis'::character varying,
  analysis_content text NOT NULL,
  additional_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_analysis_history_pkey PRIMARY KEY (id),
  CONSTRAINT ai_analysis_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);

-- ================================================================================
-- Table 2: auth_users
-- ================================================================================
-- 사용자 인증 테이블 (중심 테이블)
-- 모든 사용자 관련 테이블의 부모 테이블
-- ================================================================================

CREATE TABLE public.auth_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying(50) NOT NULL,
  email character varying(255) NOT NULL,
  hashed_password character varying(255) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT auth_users_pkey PRIMARY KEY (id),
  CONSTRAINT auth_users_email_key UNIQUE (email),
  CONSTRAINT auth_users_username_key UNIQUE (username)
);

-- ================================================================================
-- Table 3: news_articles
-- ================================================================================
-- 뉴스 기사 테이블 (핵심 테이블)
-- 뉴스 본문, 메타데이터, AI 분석 점수 모두 포함
-- URL 중복 방지로 같은 뉴스 재수집 방지
-- ================================================================================

CREATE TABLE public.news_articles (
  id integer NOT NULL DEFAULT nextval('news_articles_id_seq'::regclass),
  symbol character varying(20),
  title character varying(500) NOT NULL,
  description text,
  content text,
  url character varying(500) NOT NULL,
  source character varying(100),
  author character varying(100),
  published_at timestamp with time zone,
  image_url character varying(500),
  language character varying(10) DEFAULT 'en'::character varying,
  category character varying(50) DEFAULT 'finance'::character varying,
  api_source character varying(50),
  relevance_score double precision DEFAULT 0.5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  base_score double precision DEFAULT 0.5,
  ai_score double precision DEFAULT 0.5,           -- GPT-5 주가 영향도 (0.0~1.0)
  analyzed_at timestamp with time zone,
  body text,
  positive_score double precision,                 -- 영향 방향 (0.0=부정, 1.0=긍정)
  ai_analyzed_text text,                           -- AI 분석 근거
  kr_translate text,                               -- 한글 번역
  CONSTRAINT news_articles_pkey PRIMARY KEY (id),
  CONSTRAINT news_articles_url_key UNIQUE (url)
);

-- ================================================================================
-- Table 4: news_crawl_history
-- ================================================================================
-- 뉴스 크롤링 작업 추적
-- 크롤링 성공/실패 로그 및 오류 메시지 저장
-- ================================================================================

CREATE TABLE public.news_crawl_history (
  id integer NOT NULL DEFAULT nextval('news_crawl_history_id_seq'::regclass),
  symbol character varying NOT NULL,
  crawl_type character varying DEFAULT 'scheduled'::character varying,
  articles_collected integer DEFAULT 0,
  crawl_started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  crawl_completed_at timestamp with time zone,
  status character varying DEFAULT 'in_progress'::character varying,
  error_message text,
  CONSTRAINT news_crawl_history_pkey PRIMARY KEY (id)
);

-- ================================================================================
-- Table 5: news_reports
-- ================================================================================
-- 뉴스 분석 리포트 캐싱
-- 종목별 뉴스 분석 결과를 24시간 동안 캐싱
-- ================================================================================

CREATE TABLE public.news_reports (
  id integer NOT NULL DEFAULT nextval('news_reports_id_seq'::regclass),
  symbol character varying(20) NOT NULL,
  report_data jsonb NOT NULL,
  analyzed_count integer NOT NULL DEFAULT 20,
  limit_used integer NOT NULL DEFAULT 20,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  CONSTRAINT news_reports_pkey PRIMARY KEY (id)
);

-- ================================================================================
-- Table 6: refresh_tokens
-- ================================================================================
-- JWT Refresh Token 관리
-- 토큰 만료, 폐기 추적
-- ================================================================================

CREATE TABLE public.refresh_tokens (
  id integer NOT NULL DEFAULT nextval('refresh_tokens_id_seq'::regclass),
  user_id uuid NOT NULL,
  token_hash character varying NOT NULL,
  device_info character varying,
  ip_address character varying,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  revoked_at timestamp with time zone,
  is_revoked boolean DEFAULT false,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id, id),
  CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash),
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);

-- ================================================================================
-- Table 7: search_history
-- ================================================================================
-- 사용자 검색 기록
-- 검색 패턴 분석용
-- ================================================================================

CREATE TABLE public.search_history (
  id integer NOT NULL DEFAULT nextval('search_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  symbol character varying(20) NOT NULL,
  searched_at timestamp with time zone DEFAULT now(),
  CONSTRAINT search_history_pkey PRIMARY KEY (id),
  CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);

-- ================================================================================
-- Table 8: stock_indicators
-- ================================================================================
-- 주식 지표 테이블
-- 종목별 기본 정보 및 재무 지표
-- symbol UNIQUE - 종목당 1개 레코드만 존재
-- ================================================================================

CREATE TABLE public.stock_indicators (
  id bigint NOT NULL DEFAULT nextval('stock_indicators_id_seq'::regclass),
  symbol character varying(10) NOT NULL,
  company_name character varying(255),
  currency character varying(3) DEFAULT 'USD'::character varying,
  exchange character varying(50),
  industry character varying(100),
  sector character varying(100),
  current_price numeric(12, 2),
  previous_close numeric(12, 2),
  market_cap bigint,
  fifty_two_week_high numeric(12, 2),
  fifty_two_week_low numeric(12, 2),
  current_ratio numeric(8, 2),
  profit_margin numeric(8, 4),
  quick_ratio numeric(8, 2),
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_indicators_pkey PRIMARY KEY (id),
  CONSTRAINT symbol_unique UNIQUE (symbol)
);

-- ================================================================================
-- Table 9: stock_price_history
-- ================================================================================
-- 주식 가격 이력
-- 일별 OHLC 데이터 (5년치)
-- 벡터 임베딩 시 30일 단위로 청크 분할
-- ================================================================================

CREATE TABLE public.stock_price_history (
  id bigint NOT NULL DEFAULT nextval('stock_price_history_id_seq'::regclass),
  symbol character varying(10) NOT NULL,
  date date NOT NULL,
  open numeric(12, 2),
  high numeric(12, 2),
  low numeric(12, 2),
  close numeric(12, 2),
  volume bigint DEFAULT 0,
  change numeric(10, 2),
  change_percent numeric(8, 4),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_price_history_pkey PRIMARY KEY (id),
  CONSTRAINT symbol_date_unique UNIQUE (symbol, date)
);

-- ================================================================================
-- Table 10: user_activity_logs
-- ================================================================================
-- 사용자 활동 로그
-- 행동 추적 및 감사 로그
-- ================================================================================

CREATE TABLE public.user_activity_logs (
  id integer NOT NULL DEFAULT nextval('user_activity_logs_id_seq'::regclass),
  user_id uuid NOT NULL,
  activity_type character varying(50) NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);

-- ================================================================================
-- Table 11: user_favorites
-- ================================================================================
-- 사용자 즐겨찾기 종목
-- user_id + symbol 조합으로 UNIQUE
-- ================================================================================

CREATE TABLE public.user_favorites (
  id integer NOT NULL DEFAULT nextval('user_favorites_id_seq'::regclass),
  user_id uuid NOT NULL,
  symbol character varying(20) NOT NULL,
  company_name character varying(100),
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT user_favorites_user_id_symbol_key UNIQUE (user_id, symbol),
  CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);

-- ================================================================================
-- Table 12: user_interests
-- ================================================================================
-- 사용자 관심 종목 (개인화 추천의 핵심)
-- user_interests와 user_favorites는 별도 관리
-- ================================================================================

CREATE TABLE public.user_interests (
  id integer NOT NULL DEFAULT nextval('user_interests_id_seq'::regclass),
  user_id uuid NOT NULL,
  interest character varying(50) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_interests_pkey PRIMARY KEY (id),
  CONSTRAINT user_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);

-- ================================================================================
-- Table 13: user_profiles
-- ================================================================================
-- 사용자 프로필 정보
-- auth_users와 1:1 관계
-- ================================================================================

CREATE TABLE public.user_profiles (
  id integer NOT NULL DEFAULT nextval('user_profiles_id_seq'::regclass),
  user_id uuid NOT NULL,
  name character varying(100),
  date_of_birth date,
  gender character varying(10),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);

-- ================================================================================
-- 외래키 관계 요약
-- ================================================================================
-- auth_users (중심 테이블)
--     ├── ai_analysis_history (1:N)
--     ├── refresh_tokens (1:N)
--     ├── search_history (1:N)
--     ├── user_activity_logs (1:N)
--     ├── user_favorites (1:N)
--     ├── user_interests (1:N)
--     └── user_profiles (1:1)
--
-- 독립 테이블 (FK 없음):
--     - news_articles
--     - news_crawl_history
--     - news_reports
--     - stock_indicators
--     - stock_price_history
-- ================================================================================

-- ================================================================================
-- 주요 인덱스 정보
-- ================================================================================
-- PRIMARY KEY와 UNIQUE 제약조건은 자동으로 인덱스 생성
--
-- 권장 추가 인덱스 (성능 최적화):
-- CREATE INDEX idx_news_articles_symbol ON news_articles(symbol);
-- CREATE INDEX idx_news_articles_published_at ON news_articles(published_at DESC);
-- CREATE INDEX idx_news_articles_ai_score ON news_articles(ai_score DESC);
-- CREATE INDEX idx_stock_price_history_symbol_date ON stock_price_history(symbol, date DESC);
-- CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
-- CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
-- ================================================================================

-- ================================================================================
-- 스키마 버전 정보
-- ================================================================================
-- Version: 2.0.0
-- Last Updated: 2025-11-20
-- Total Tables: 13
-- Total Foreign Keys: 8
-- Total Unique Constraints: 10
-- ================================================================================
