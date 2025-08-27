-- 뉴스 크롤링 기능을 위한 news_articles 테이블 추가
-- 실행 방법: Supabase 콘솔의 SQL Editor에서 이 스크립트를 복사하여 실행

-- news_articles 테이블 생성 (크롤링한 뉴스 데이터 저장)
CREATE TABLE IF NOT EXISTS news_articles (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (검색 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_news_articles_symbol ON news_articles (symbol);
CREATE INDEX IF NOT EXISTS idx_news_articles_url ON news_articles (url);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles (category);
CREATE INDEX IF NOT EXISTS idx_news_articles_api_source ON news_articles (api_source);

-- 완료 확인 메시지
SELECT 'news_articles 테이블과 인덱스가 성공적으로 생성되었습니다.' as result;