# 구독 기능 설정 가이드

## 문제: 409 Conflict 에러 발생

구독 생성 시 409 Conflict 에러가 발생하는 경우, Supabase의 email_subscriptions 테이블에 unique constraint가 설정되어 있을 수 있습니다.

## 해결 방법

### 1. Supabase 대시보드에서 확인

1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택
3. **Table Editor** → **email_subscriptions** 테이블 선택
4. **Indexes & Constraints** 탭에서 unique constraint 확인

### 2. Unique Constraint 제거

Supabase SQL Editor에서 다음 SQL 실행:

```sql
-- 기존 unique constraint 확인
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
    AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.constraint_name, tc.constraint_type;

-- Unique constraint 제거 (constraint_name을 위에서 확인한 이름으로 변경)
ALTER TABLE email_subscriptions DROP CONSTRAINT IF EXISTS [constraint_name];
```

또는 `/backend/migrations/remove_email_subscription_unique_constraint.sql` 파일의 전체 내용을 복사해서 실행

### 3. 브라우저 콘솔에서 에러 확인

1. 브라우저 개발자 도구 열기 (F12)
2. **Console** 탭으로 이동
3. 구독 생성 시도
4. 다음 로그 확인:
   - `Sending subscription data:` - 전송되는 데이터 확인
   - `Error response:` - 백엔드에서 반환된 상세 에러 메시지 확인

### 4. 테스트

1. 프론트엔드에서 구독 생성 시도
2. 성공하면 완료!
3. 여전히 에러 발생 시, 콘솔 로그와 백엔드 로그 확인

## 주의사항

- 사용자는 최대 5개까지 구독을 만들 수 있습니다
- 각 구독은 다른 이메일 주소를 사용할 수 있습니다
- 같은 이메일로 여러 구독을 만들 수 있습니다 (서로 다른 종목/리포트 타입)

## 환경 변수

backend/.env 파일에 다음 설정이 필요합니다:

```env
# Resend API (이메일 발송)
RESEND_API_KEY=re_...

# Supabase 설정
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```
