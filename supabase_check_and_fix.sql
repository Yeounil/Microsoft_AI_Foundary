-- =====================================================
-- Supabase 타입 확인 및 수정 스크립트
-- =====================================================

-- 1단계: auth_users 테이블의 id 컬럼 타입 확인
SELECT
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'auth_users'
AND column_name = 'id';

-- 결과를 보고 아래 중 하나를 선택하세요:

-- =====================================================
-- 방법 1: auth_users.id가 UUID인 경우 (가장 가능성 높음)
-- =====================================================

-- refresh_tokens 테이블 생성 (user_id를 UUID로)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,  -- UUID 타입 사용
    token_hash VARCHAR NOT NULL UNIQUE,
    device_info VARCHAR,
    ip_address VARCHAR,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- RLS 활성화
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can view own tokens"
ON refresh_tokens
FOR SELECT
USING (auth.uid() = user_id);  -- UUID 타입이므로 ::text 제거

-- 만료된 토큰 자동 삭제 함수
CREATE OR REPLACE FUNCTION delete_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
    OR (is_revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 방법 2: auth_users.id가 VARCHAR인 경우
-- =====================================================

-- refresh_tokens 테이블 생성 (user_id를 VARCHAR로)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,  -- VARCHAR 타입 사용
    token_hash VARCHAR NOT NULL UNIQUE,
    device_info VARCHAR,
    ip_address VARCHAR,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- RLS 활성화
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can view own tokens"
ON refresh_tokens
FOR SELECT
USING (auth.uid()::text = user_id);

-- 만료된 토큰 자동 삭제 함수
CREATE OR REPLACE FUNCTION delete_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
    OR (is_revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3단계: 테이블 생성 확인
-- =====================================================

-- 테이블 구조 확인
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'refresh_tokens'
ORDER BY ordinal_position;

-- 외래키 확인
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name='refresh_tokens';

-- 데이터 확인
SELECT * FROM refresh_tokens LIMIT 5;
