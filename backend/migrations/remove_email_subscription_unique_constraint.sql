-- ================================================
-- Remove unique constraint on email_subscriptions if exists
-- 사용자가 여러 이메일로 구독을 만들 수 있도록 제약 조건 제거
-- ================================================

-- 1. 기존 unique constraint 확인 및 제거
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- email_subscriptions 테이블의 모든 unique constraint 조회
    FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'email_subscriptions'
          AND tc.constraint_type = 'UNIQUE'
    LOOP
        -- Constraint 제거
        EXECUTE format('ALTER TABLE email_subscriptions DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- 2. 인덱스 확인 (unique index도 확인, primary key 제외)
DO $$
DECLARE
    index_name TEXT;
BEGIN
    FOR index_name IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'email_subscriptions'
          AND indexdef LIKE '%UNIQUE%'
          AND indexname NOT IN (
              SELECT conname
              FROM pg_constraint
              WHERE conrelid = 'email_subscriptions'::regclass
              AND contype = 'p'  -- primary key constraint
          )
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', index_name);
        RAISE NOTICE 'Dropped unique index: %', index_name;
    END LOOP;
END $$;

-- 3. 확인: 제약 조건 목록 출력
SELECT
    tc.constraint_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ') as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'email_subscriptions'
GROUP BY tc.constraint_name, tc.constraint_type
ORDER BY tc.constraint_type;

COMMENT ON TABLE email_subscriptions IS '이메일 구독 관리 - 사용자는 여러 이메일로 여러 구독을 만들 수 있음';
