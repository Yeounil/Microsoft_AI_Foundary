-- =====================================================
-- Supabase Cloud DB에 적용할 Refresh Tokens 테이블 생성 스크립트
-- =====================================================
-- 이 스크립트를 Supabase Dashboard > SQL Editor에서 실행하세요
-- =====================================================

-- 0. auth_users 테이블의 id 타입 확인 (먼저 실행해서 확인)
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'auth_users' AND column_name = 'id';

-- =====================================================
-- 방법 1: auth_users.id가 UUID인 경우 (대부분의 경우)
-- =====================================================

-- 1. refresh_tokens 테이블 생성
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,  -- UUID 타입으로 변경
    token_hash VARCHAR NOT NULL UNIQUE, -- 토큰의 해시값 저장 (보안)
    device_info VARCHAR, -- 디바이스 정보 (User-Agent)
    ip_address VARCHAR, -- IP 주소
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE, -- 토큰 폐기 시각
    is_revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성 - 사용자 자신의 토큰만 조회 가능
CREATE POLICY "Users can view own tokens"
ON refresh_tokens
FOR SELECT
USING (auth.uid() = user_id);  -- UUID 타입이므로 ::text 제거

-- 5. 만료된 토큰 자동 삭제 함수
CREATE OR REPLACE FUNCTION delete_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
    OR (is_revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- 6. 주석 추가 (선택사항 - 테이블 설명)
COMMENT ON TABLE refresh_tokens IS 'JWT Refresh Token 저장 및 관리 테이블';
COMMENT ON COLUMN refresh_tokens.token_hash IS '토큰의 SHA-256 해시값 (보안을 위해 평문 저장 안함)';
COMMENT ON COLUMN refresh_tokens.is_revoked IS '토큰 폐기 여부 (로그아웃 시 true)';
COMMENT ON COLUMN refresh_tokens.device_info IS '클라이언트 User-Agent 정보';

-- =====================================================
-- 적용 후 확인 쿼리
-- =====================================================

-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'refresh_tokens'
ORDER BY ordinal_position;

-- 외래키 확인
SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='refresh_tokens';

-- 인덱스 확인
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'refresh_tokens';

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'refresh_tokens';

-- 데이터 확인
SELECT * FROM refresh_tokens LIMIT 5;
