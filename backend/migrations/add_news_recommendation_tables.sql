-- 사용자 관심 종목 테이블
CREATE TABLE IF NOT EXISTS user_interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    market VARCHAR(10) NOT NULL,
    company_name VARCHAR(100),
    priority INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 사용자 뉴스 선호도 테이블
CREATE TABLE IF NOT EXISTS user_news_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category VARCHAR(50),
    preference_score REAL DEFAULT 0.0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 사용자 뉴스 상호작용 추적 테이블
CREATE TABLE IF NOT EXISTS user_news_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    news_url VARCHAR(500) NOT NULL,
    news_title VARCHAR(200),
    symbol VARCHAR(20),
    action VARCHAR(20),
    interaction_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 뉴스 추천 결과 저장 테이블
CREATE TABLE IF NOT EXISTS news_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    news_url VARCHAR(500) NOT NULL,
    symbol VARCHAR(20),
    recommendation_score REAL,
    reason VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_shown BOOLEAN DEFAULT FALSE,
    is_clicked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_symbol ON user_interests(symbol);
CREATE INDEX IF NOT EXISTS idx_user_interests_active ON user_interests(is_active);

CREATE INDEX IF NOT EXISTS idx_user_news_preferences_user_id ON user_news_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_news_preferences_category ON user_news_preferences(category);

CREATE INDEX IF NOT EXISTS idx_user_news_interactions_user_id ON user_news_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_news_interactions_symbol ON user_news_interactions(symbol);
CREATE INDEX IF NOT EXISTS idx_user_news_interactions_created_at ON user_news_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_news_recommendations_user_id ON news_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_news_recommendations_symbol ON news_recommendations(symbol);
CREATE INDEX IF NOT EXISTS idx_news_recommendations_created_at ON news_recommendations(created_at);