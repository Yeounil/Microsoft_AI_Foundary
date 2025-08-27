"""
데이터베이스 스키마 확인 및 테이블 생성 스크립트
news_articles 테이블이 존재하는지 확인하고, 없으면 생성합니다.
"""
import os
from supabase import create_client
from app.core.config import settings

def check_and_create_tables():
    """필요한 테이블들이 존재하는지 확인하고 생성"""
    
    if not settings.supabase_url or not settings.supabase_key:
        print("ERROR: Supabase URL과 KEY가 설정되지 않았습니다.")
        print("환경변수를 확인해주세요: SUPABASE_URL, SUPABASE_KEY")
        return
    
    try:
        # Supabase 클라이언트 생성
        supabase = create_client(settings.supabase_url, settings.supabase_key)
        
        # news_articles 테이블 존재 여부 확인
        result = supabase.table("news_articles").select("id").limit(1).execute()
        print("OK: news_articles 테이블이 이미 존재합니다.")
        
    except Exception as e:
        if "relation \"news_articles\" does not exist" in str(e):
            print("WARNING: news_articles 테이블이 존재하지 않습니다.")
            print("\n다음 SQL을 Supabase 콘솔에서 실행해주세요:")
            print("=" * 50)
            
            sql_script = """
-- news_articles 테이블 생성
CREATE TABLE news_articles (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR,
    title VARCHAR NOT NULL,
    description TEXT,
    content TEXT,
    url VARCHAR UNIQUE NOT NULL,
    source VARCHAR,
    author VARCHAR,
    published_at TIMESTAMP WITH TIME ZONE,
    image_url VARCHAR,
    language VARCHAR DEFAULT 'en',
    category VARCHAR DEFAULT 'finance',
    api_source VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_news_articles_symbol ON news_articles (symbol);
CREATE INDEX idx_news_articles_url ON news_articles (url);
CREATE INDEX idx_news_articles_published_at ON news_articles (published_at DESC);
CREATE INDEX idx_news_articles_category ON news_articles (category);
CREATE INDEX idx_news_articles_api_source ON news_articles (api_source);
"""
            print(sql_script)
            print("=" * 50)
            print("\n실행 방법:")
            print("1. Supabase 대시보드 → SQL Editor")
            print("2. 위 SQL 코드 복사 & 실행")
            print("3. 다시 이 스크립트 실행하여 확인")
            
        else:
            print(f"ERROR: 데이터베이스 연결 오류: {str(e)}")

if __name__ == "__main__":
    check_and_create_tables()