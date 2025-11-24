-- ================================================
-- email_subscriptions 외래 키 수정
-- users 테이블 대신 auth_users 테이블 참조하도록 변경
-- ================================================

-- 1. 기존 외래 키 제약 조건 삭제
DO $$
BEGIN
    -- email_subscriptions_user_id_fkey 외래 키 제약 조건 삭제
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'email_subscriptions_user_id_fkey'
        AND table_name = 'email_subscriptions'
    ) THEN
        ALTER TABLE email_subscriptions DROP CONSTRAINT email_subscriptions_user_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint: email_subscriptions_user_id_fkey';
    END IF;
END $$;

-- 2. auth_users를 참조하는 새 외래 키 제약 조건 추가
DO $$
BEGIN
    -- auth_users 테이블을 참조하는 외래 키 추가
    ALTER TABLE email_subscriptions
    ADD CONSTRAINT email_subscriptions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth_users(id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Added foreign key constraint: email_subscriptions_user_id_fkey -> auth_users(id)';
END $$;

-- 3. 확인: 외래 키 제약 조건 조회
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'email_subscriptions';

COMMENT ON TABLE email_subscriptions IS 'auth_users 테이블 참조로 변경 완료 - 사용자는 여러 이메일로 여러 구독을 만들 수 있음';
