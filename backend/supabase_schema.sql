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

-- 10. refresh_tokens 테이블 (JWT Refresh Token 관리)
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    token_hash VARCHAR NOT NULL UNIQUE, -- 토큰의 해시값 저장 (보안)
    device_info VARCHAR, -- 디바이스 정보 (선택사항)
    ip_address VARCHAR, -- IP 주소 (선택사항)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE, -- 토큰 폐기 시각
    is_revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- RLS 정책 설정
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자 자신의 토큰만 조회 가능
CREATE POLICY "Users can view own tokens" ON refresh_tokens FOR SELECT USING (auth.uid()::text = user_id);

-- 만료된 토큰 자동 삭제 함수 (선택사항 - 정기적으로 실행)
CREATE OR REPLACE FUNCTION delete_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
    OR (is_revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- 11. stock_indicators 테이블 (종목별 기술지표 및 재무지표)
CREATE TABLE stock_indicators (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR NOT NULL UNIQUE, -- 종목 심볼 (UNIQUE KEY)
    company_name VARCHAR,
    current_price FLOAT,
    previous_close FLOAT,
    market_cap BIGINT,
    pe_ratio FLOAT,
    eps FLOAT,
    dividend_yield FLOAT,
    fifty_two_week_high FLOAT,
    fifty_two_week_low FLOAT,
    currency VARCHAR,
    exchange VARCHAR,
    industry VARCHAR,
    sector VARCHAR,
    -- 기술 지표
    sma_20 FLOAT, -- 20일 이동평균
    sma_50 FLOAT, -- 50일 이동평균
    sma_200 FLOAT, -- 200일 이동평균
    ema_12 FLOAT, -- 12일 지수이동평균
    ema_26 FLOAT, -- 26일 지수이동평균
    rsi_14 FLOAT, -- 14일 RSI
    macd FLOAT, -- MACD
    macd_signal FLOAT,
    macd_histogram FLOAT,
    -- 재무 지표
    roe FLOAT, -- Return on Equity
    roa FLOAT, -- Return on Assets
    current_ratio FLOAT,
    quick_ratio FLOAT,
    debt_to_equity FLOAT,
    debt_ratio FLOAT,
    profit_margin FLOAT,
    -- 스코어 지표
    altman_score FLOAT, -- Altman Z-Score
    piotroski_score FLOAT, -- Piotroski F-Score
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_indicators_symbol ON stock_indicators (symbol);
CREATE INDEX idx_stock_indicators_updated_at ON stock_indicators (updated_at DESC);
CREATE INDEX idx_stock_indicators_sector ON stock_indicators (sector);

-- 12. stock_price_history 테이블 (일별 가격 이력)
CREATE TABLE stock_price_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR NOT NULL,
    date DATE NOT NULL,
    open FLOAT NOT NULL,
    high FLOAT NOT NULL,
    low FLOAT NOT NULL,
    close FLOAT NOT NULL,
    volume BIGINT,
    change FLOAT,
    change_percent FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, date)
);

CREATE INDEX idx_stock_price_history_symbol ON stock_price_history (symbol);
CREATE INDEX idx_stock_price_history_date ON stock_price_history (date DESC);
CREATE INDEX idx_stock_price_history_symbol_date ON stock_price_history (symbol, date DESC);

-- 13. stock_data_sync_history 테이블 (데이터 동기화 이력 추적)
CREATE TABLE stock_data_sync_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR NOT NULL,
    sync_type VARCHAR NOT NULL, -- 'indicators', 'price_history', 'full'
    sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    data_period VARCHAR, -- e.g., '5y', '1y'
    last_sync_date DATE -- 마지막 데이터 동기화 날짜
);

CREATE INDEX idx_stock_data_sync_history_symbol ON stock_data_sync_history (symbol);
CREATE INDEX idx_stock_data_sync_history_completed_at ON stock_data_sync_history (sync_completed_at DESC);
CREATE INDEX idx_stock_data_sync_history_status ON stock_data_sync_history (status);