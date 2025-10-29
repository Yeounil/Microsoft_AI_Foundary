-- 기존 데이터베이스 구조에 맞춘 Supabase 테이블 스키마

-- 1. auth_users 테이블 (기존 구조 그대로)
CREATE TABLE auth_users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL
);

CREATE INDEX idx_auth_users_username ON auth_users (username);
CREATE INDEX idx_auth_users_email ON auth_users (email);

-- 2. news_history 테이블 (기존 구조 그대로)
CREATE TABLE news_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    article_url VARCHAR NOT NULL,
    title VARCHAR,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_users (id)
);

CREATE INDEX idx_news_history_article_url ON news_history (article_url);

-- 3. search_history 테이블 (기존 구조 그대로)
CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_users (id)
);

CREATE INDEX idx_search_history_symbol ON search_history (symbol);

-- 4. user_interests 테이블 (기존 구조 그대로)
CREATE TABLE user_interests (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    interest VARCHAR NOT NULL,
    FOREIGN KEY (user_id) REFERENCES auth_users (id)
);

-- 5. user_profiles 테이블 (기존 구조 그대로)
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    date_of_birth DATE,
    gender VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_users (id)
);

-- 추가 테이블들 (AI 분석 기능을 위해 필요한 테이블들)

-- 6. news_articles 테이블 (크롤링한 뉴스 데이터 저장)
CREATE TABLE news_articles (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR, -- 관련 종목 심볼 (NULL 가능 - 일반 금융뉴스의 경우)
    title VARCHAR NOT NULL,
    description TEXT,
    content TEXT, -- 전체 기사 내용 (AI 분석용)
    url VARCHAR UNIQUE NOT NULL, -- 중복 체크용 고유 URL
    source VARCHAR,
    author VARCHAR,
    published_at TIMESTAMP WITH TIME ZONE,
    image_url VARCHAR,
    language VARCHAR DEFAULT 'en', -- 'en', 'ko'
    category VARCHAR DEFAULT 'finance', -- 'finance', 'stock', 'market' 등
    api_source VARCHAR, -- 'newsapi', 'naver', 'manual' 등 출처 구분
    relevance_score FLOAT DEFAULT 0.5, -- AI 기반 적합성 점수 (0.0 ~ 1.0)
    base_score FLOAT DEFAULT 0.5, -- 기본 적합성 점수 (0.0 ~ 1.0)
    ai_score FLOAT DEFAULT 0.5, -- AI 분석 점수 (0.0 ~ 1.0)
    analyzed_at TIMESTAMP WITH TIME ZONE, -- AI 분석 시각
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_news_articles_symbol ON news_articles (symbol);
CREATE INDEX idx_news_articles_url ON news_articles (url);
CREATE INDEX idx_news_articles_published_at ON news_articles (published_at DESC);
CREATE INDEX idx_news_articles_category ON news_articles (category);
CREATE INDEX idx_news_articles_api_source ON news_articles (api_source);

-- 7. ai_analysis_history 테이블 (AI 분석 결과 저장)
CREATE TABLE ai_analysis_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    analysis_type VARCHAR NOT NULL, -- 'stock_analysis', 'news_summary', 'market_summary'
    analysis_content TEXT,
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_users (id)
);

CREATE INDEX idx_ai_analysis_history_symbol ON ai_analysis_history (symbol);
CREATE INDEX idx_ai_analysis_history_type ON ai_analysis_history (analysis_type);

-- 8. user_favorites 테이블 (관심 종목 관리)
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    company_name VARCHAR,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_users (id),
    UNIQUE(user_id, symbol)
);

-- RLS (Row Level Security) 정책 설정
-- auth_users 테이블은 회원가입을 위해 RLS를 비활성화
-- ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- 사용자 자신의 데이터만 접근 가능하도록 정책 설정
CREATE POLICY "Users can view own data" ON news_history FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own data" ON news_history FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own data" ON search_history FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own data" ON search_history FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own data" ON user_interests FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own data" ON user_profiles FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own data" ON ai_analysis_history FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own data" ON user_favorites FOR ALL USING (auth.uid()::text = user_id);

-- 9. news_crawl_history 테이블 (뉴스 크롤링 이력 추적)
CREATE TABLE news_crawl_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR NOT NULL, -- 크롤링한 종목
    crawl_type VARCHAR DEFAULT 'scheduled', -- 'scheduled', 'manual', 'recovery'
    articles_collected INTEGER DEFAULT 0, -- 수집된 뉴스 개수
    crawl_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    crawl_completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    error_message TEXT
);

CREATE INDEX idx_news_crawl_history_symbol ON news_crawl_history (symbol);
CREATE INDEX idx_news_crawl_history_completed_at ON news_crawl_history (crawl_completed_at DESC);
CREATE INDEX idx_news_crawl_history_status ON news_crawl_history (status);