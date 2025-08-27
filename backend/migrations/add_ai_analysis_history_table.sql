-- AI 분석 이력 테이블 생성
CREATE TABLE IF NOT EXISTS ai_analysis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    market TEXT NOT NULL DEFAULT 'us',
    company_name TEXT,
    analysis_type TEXT DEFAULT 'stock_analysis',
    analysis_prompt TEXT,
    analysis_result TEXT NOT NULL,
    referenced_news_count INTEGER DEFAULT 0,
    referenced_news_sources TEXT, -- JSON 형태로 참조한 뉴스 소스들 저장
    stock_price_at_analysis REAL,
    analysis_period TEXT DEFAULT '1y',
    analysis_interval TEXT DEFAULT '1d',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE -- 분석 결과의 활성 상태 (오래된 분석은 비활성화)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_symbol ON ai_analysis_history(symbol);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_market ON ai_analysis_history(market);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_created_at ON ai_analysis_history(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_symbol_market ON ai_analysis_history(symbol, market);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_active ON ai_analysis_history(is_active);