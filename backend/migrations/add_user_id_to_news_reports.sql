-- ================================================================================
-- Migration: Add user_id to news_reports table
-- ================================================================================
-- Date: 2025-11-20
-- Description:
--   뉴스 레포트에 user_id를 추가하여 유저별 레포트 관리 가능하도록 변경
--   각 유저가 자신의 레포트만 조회/관리할 수 있도록 RLS 정책 설정
-- ================================================================================

-- Step 1: user_id 컬럼 추가
ALTER TABLE public.news_reports
ADD COLUMN user_id uuid;

-- Step 2: 외래키 제약조건 추가
ALTER TABLE public.news_reports
ADD CONSTRAINT news_reports_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;

-- Step 3: user_id 인덱스 생성 (조회 성능 향상)
CREATE INDEX idx_news_reports_user_id ON public.news_reports(user_id);

-- Step 4: symbol + user_id 복합 인덱스 (같은 종목에 대해 유저별 조회)
CREATE INDEX idx_news_reports_user_symbol ON public.news_reports(user_id, symbol);

-- ================================================================================
-- RLS (Row Level Security) 정책 설정
-- ================================================================================

-- Step 5: RLS 활성화
ALTER TABLE public.news_reports ENABLE ROW LEVEL SECURITY;

-- Step 6: SELECT 정책 - 자신의 레포트만 조회 가능
CREATE POLICY "Users can view their own reports"
ON public.news_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Step 7: INSERT 정책 - 자신의 user_id로만 생성 가능
CREATE POLICY "Users can create their own reports"
ON public.news_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 8: UPDATE 정책 - 자신의 레포트만 수정 가능
CREATE POLICY "Users can update their own reports"
ON public.news_reports
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 9: DELETE 정책 - 자신의 레포트만 삭제 가능
CREATE POLICY "Users can delete their own reports"
ON public.news_reports
FOR DELETE
USING (auth.uid() = user_id);

-- ================================================================================
-- 기존 데이터 처리 (선택사항)
-- ================================================================================
-- 기존에 생성된 레포트가 있다면 user_id가 NULL입니다.
-- 필요시 기존 데이터를 특정 user_id로 할당하거나 삭제할 수 있습니다:
--
-- Option 1: 기존 데이터 삭제
-- DELETE FROM public.news_reports WHERE user_id IS NULL;
--
-- Option 2: 특정 유저에게 할당 (테스트 유저 등)
-- UPDATE public.news_reports
-- SET user_id = 'YOUR_USER_UUID_HERE'
-- WHERE user_id IS NULL;
-- ================================================================================

-- ================================================================================
-- 검증 쿼리
-- ================================================================================
-- 변경사항 확인
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'news_reports'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- RLS 정책 확인
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'news_reports';

-- ================================================================================
-- Rollback (필요시)
-- ================================================================================
-- 마이그레이션을 되돌리려면:
--
-- DROP POLICY IF EXISTS "Users can delete their own reports" ON public.news_reports;
-- DROP POLICY IF EXISTS "Users can update their own reports" ON public.news_reports;
-- DROP POLICY IF EXISTS "Users can create their own reports" ON public.news_reports;
-- DROP POLICY IF EXISTS "Users can view their own reports" ON public.news_reports;
-- ALTER TABLE public.news_reports DISABLE ROW LEVEL SECURITY;
-- DROP INDEX IF EXISTS idx_news_reports_user_symbol;
-- DROP INDEX IF EXISTS idx_news_reports_user_id;
-- ALTER TABLE public.news_reports DROP CONSTRAINT IF EXISTS news_reports_user_id_fkey;
-- ALTER TABLE public.news_reports DROP COLUMN IF EXISTS user_id;
-- ================================================================================
