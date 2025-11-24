-- ================================================================================
-- Social Login Migration
-- ================================================================================
-- Date: 2025-11-22
-- Purpose: auth_users 테이블에 소셜 로그인 관련 컬럼 추가
-- Providers: Kakao, Google, Naver (향후 확장)
-- ================================================================================

-- auth_users 테이블에 소셜 로그인 컬럼 추가
ALTER TABLE public.auth_users
ADD COLUMN IF NOT EXISTS provider VARCHAR(50),  -- 소셜 로그인 제공자 (kakao, google, naver 등)
ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR(255),  -- 제공자별 고유 사용자 ID
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500);  -- 프로필 이미지 URL

-- 소셜 로그인 사용자의 고유성을 위한 복합 인덱스 생성
-- provider와 provider_user_id의 조합은 유니크해야 함
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_provider_user
ON public.auth_users(provider, provider_user_id)
WHERE provider IS NOT NULL AND provider_user_id IS NOT NULL;

-- provider 컬럼에 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_auth_users_provider
ON public.auth_users(provider)
WHERE provider IS NOT NULL;

-- ================================================================================
-- 기존 사용자 데이터 처리
-- ================================================================================
-- 기존 사용자들은 일반 회원가입 사용자이므로 provider를 'local'로 설정
-- (선택사항: 필요한 경우에만 실행)
-- UPDATE public.auth_users
-- SET provider = 'local'
-- WHERE provider IS NULL;

-- ================================================================================
-- 제약 조건 및 설명
-- ================================================================================
-- provider: 소셜 로그인 제공자 이름 ('kakao', 'google', 'naver', 'local' 등)
-- provider_user_id: 제공자별 고유 사용자 식별자 (예: 카카오 회원번호)
-- profile_image: 소셜 로그인에서 제공하는 프로필 이미지 URL
--
-- 일반 회원가입 사용자: provider = NULL 또는 'local'
-- 소셜 로그인 사용자: provider = 'kakao', 'google', 'naver' 등
-- ================================================================================

-- ================================================================================
-- 롤백 (필요시)
-- ================================================================================
-- ALTER TABLE public.auth_users DROP COLUMN IF EXISTS provider;
-- ALTER TABLE public.auth_users DROP COLUMN IF EXISTS provider_user_id;
-- ALTER TABLE public.auth_users DROP COLUMN IF EXISTS profile_image;
-- DROP INDEX IF EXISTS idx_auth_users_provider_user;
-- DROP INDEX IF EXISTS idx_auth_users_provider;
-- ================================================================================
