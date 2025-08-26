-- 회원가입을 위한 RLS 정책 생성
-- auth_users 테이블에 INSERT 권한을 부여하는 정책

-- 방법 1: 모든 사용자에게 INSERT 권한 허용 (회원가입용)
CREATE POLICY "Allow anonymous user registration" ON auth_users
FOR INSERT 
TO anon
WITH CHECK (true);

-- 방법 2: 인증된 사용자가 자신의 데이터를 조회할 수 있게 함
CREATE POLICY "Users can view own auth data" ON auth_users
FOR SELECT 
TO authenticated
USING (auth.uid()::text = id);

-- 방법 3: 만약 RLS를 완전히 비활성화하려면 (보안에 주의)
-- ALTER TABLE auth_users DISABLE ROW LEVEL SECURITY;

-- 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'auth_users';