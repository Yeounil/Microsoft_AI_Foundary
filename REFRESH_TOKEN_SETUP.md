# JWT Refresh Token 설정 가이드 (Supabase Cloud DB)

## 개요
현업 표준에 따라 JWT Refresh Token을 Supabase Cloud Database에 저장하여 보안을 강화하고 세션을 관리합니다.

## 주요 기능
- ✅ **Access Token (1시간)** + **Refresh Token (7일)** 이중 토큰 시스템
- ✅ **자동 토큰 갱신**: 401 에러 발생 시 자동으로 새 토큰 발급
- ✅ **DB 기반 토큰 검증**: Supabase에 Refresh Token 해시 저장 (보안)
- ✅ **토큰 폐기 기능**: 로그아웃 시 즉시 토큰 무효화
- ✅ **세션 관리**: 디바이스별 활성 세션 추적
- ✅ **토큰 회전(Rotation)**: 갱신 시 기존 토큰 폐기 + 새 토큰 발급

---

## 1. Supabase DB 설정

### 1-1. Supabase Dashboard 접속
1. [Supabase Dashboard](https://app.supabase.com/) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 1-2. 테이블 생성 쿼리 실행
아래 파일의 SQL을 복사하여 실행:
```
📁 supabase_refresh_tokens_migration.sql
```

**또는 아래 SQL을 직접 실행:**

```sql
-- refresh_tokens 테이블 생성
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
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

-- RLS 정책
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
```

### 1-3. 테이블 생성 확인
```sql
-- 테이블 존재 확인
SELECT * FROM refresh_tokens LIMIT 5;

-- 인덱스 확인
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'refresh_tokens';

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'refresh_tokens';
```

---

## 2. 백엔드 파일 구조

```
backend/
├── app/
│   ├── api/
│   │   └── auth_supabase.py         # 인증 API (업데이트됨)
│   ├── core/
│   │   ├── config.py                # 설정 (토큰 만료 시간)
│   │   └── security.py              # JWT 생성/검증
│   └── services/
│       └── refresh_token_service.py # Refresh Token 관리 (신규)
└── supabase_schema.sql              # 전체 DB 스키마
```

### 주요 변경사항

#### `config.py`
```python
access_token_expire_minutes: int = 60  # 1시간
refresh_token_expire_days: int = 7     # 7일
```

#### `security.py`
```python
def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None)
def verify_token(token: str, token_type: str = "access")
```

#### `refresh_token_service.py` (신규)
- `store_refresh_token()`: DB에 토큰 저장
- `verify_refresh_token()`: DB에서 토큰 검증
- `revoke_refresh_token()`: 토큰 폐기
- `revoke_all_user_tokens()`: 모든 토큰 폐기
- `rotate_refresh_token()`: 토큰 회전

---

## 3. 프론트엔드 파일 구조

```
frontend/
├── services/
│   ├── api.ts           # Axios Interceptor (자동 토큰 갱신)
│   └── authService.ts   # 인증 서비스
├── components/
│   └── LoginPage.tsx    # 로그인 페이지
└── types/
    └── api.ts           # 타입 정의
```

### 주요 변경사항

#### `api.ts`
- **Axios Response Interceptor** 추가
  - 401 에러 시 자동으로 `/api/v2/auth/refresh` 호출
  - 큐 시스템으로 중복 요청 방지
  - 갱신 실패 시 자동 로그아웃

#### `authService.ts`
```typescript
async logout(): Promise<void>          // 로그아웃 (서버에 토큰 폐기 요청)
async logoutAll(): Promise<void>       // 모든 기기에서 로그아웃
getRefreshToken(): string | null       // Refresh Token 조회
```

---

## 4. API 엔드포인트

### 4-1. 로그인
```http
POST /api/v2/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "testpass"
}
```

**응답:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### 4-2. 토큰 갱신
```http
POST /api/v2/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

**응답:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### 4-3. 로그아웃
```http
POST /api/v2/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

### 4-4. 모든 기기에서 로그아웃
```http
POST /api/v2/auth/logout-all
Authorization: Bearer <access_token>
```

### 4-5. 활성 세션 조회
```http
GET /api/v2/auth/sessions
Authorization: Bearer <access_token>
```

**응답:**
```json
{
  "total_sessions": 2,
  "sessions": [
    {
      "id": 1,
      "device_info": "Mozilla/5.0...",
      "ip_address": "192.168.1.1",
      "created_at": "2025-10-31T10:00:00Z",
      "expires_at": "2025-11-07T10:00:00Z"
    }
  ]
}
```

---

## 5. 동작 흐름

### 5-1. 로그인 시
1. 사용자가 로그인 요청
2. 백엔드가 Access Token (1시간) + Refresh Token (7일) 생성
3. **Refresh Token의 해시값을 Supabase DB에 저장** (평문 저장 X)
4. 프론트엔드가 두 토큰을 localStorage에 저장

### 5-2. API 요청 시
1. Access Token을 헤더에 포함하여 요청
2. 토큰이 유효하면 정상 처리
3. 토큰이 만료되면 401 에러 반환

### 5-3. 자동 토큰 갱신 (Axios Interceptor)
1. 401 에러 감지
2. Refresh Token으로 `/api/v2/auth/refresh` 호출
3. 백엔드가 **DB에서 Refresh Token 검증**
4. 유효하면 새 Access Token + Refresh Token 발급
5. **기존 Refresh Token 폐기 + 새 Refresh Token DB에 저장**
6. 실패한 원래 요청을 새 토큰으로 재시도

### 5-4. 로그아웃 시
1. `/api/v2/auth/logout` 호출
2. **DB에서 Refresh Token을 폐기(is_revoked = true)**
3. localStorage에서 토큰 삭제

---

## 6. 보안 특징

### 6-1. 토큰 해시 저장
- DB에 **평문 토큰을 저장하지 않고 SHA-256 해시값만 저장**
- DB 탈취 시에도 실제 토큰 노출 방지

### 6-2. 토큰 회전 (Rotation)
- 토큰 갱신 시 **기존 토큰을 즉시 폐기하고 새 토큰 발급**
- 탈취된 Refresh Token의 재사용 방지

### 6-3. 즉시 폐기 가능
- 로그아웃 시 DB에서 토큰을 폐기하여 즉시 무효화
- 탈취된 토큰으로 로그인 불가

### 6-4. 세션 추적
- 디바이스별 활성 세션 추적 가능
- 의심스러운 세션 즉시 차단 가능

---

## 7. 유지보수

### 7-1. 만료된 토큰 정리
**방법 1: 수동 실행 (Supabase SQL Editor)**
```sql
SELECT delete_expired_refresh_tokens();
```

**방법 2: Cron Job 설정 (선택사항)**
Supabase Dashboard > Database > Cron Jobs에서 설정:
```sql
-- 매일 자정에 실행
SELECT cron.schedule(
  'delete-expired-tokens',
  '0 0 * * *',
  $$SELECT delete_expired_refresh_tokens()$$
);
```

### 7-2. 활성 토큰 모니터링
```sql
-- 사용자별 활성 토큰 수
SELECT user_id, COUNT(*) as active_tokens
FROM refresh_tokens
WHERE is_revoked = FALSE AND expires_at > NOW()
GROUP BY user_id;

-- 전체 통계
SELECT
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE is_revoked = FALSE) as active_tokens,
  COUNT(*) FILTER (WHERE is_revoked = TRUE) as revoked_tokens,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens
FROM refresh_tokens;
```

---

## 8. 테스트 방법

### 8-1. 로그인 테스트
```bash
curl -X POST http://localhost:8000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### 8-2. 토큰 갱신 테스트
```bash
curl -X POST http://localhost:8000/api/v2/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
```

### 8-3. 로그아웃 테스트
```bash
curl -X POST http://localhost:8000/api/v2/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
```

---

## 9. 문제 해결

### DB 연결 오류
```python
# backend/app/core/config.py 확인
supabase_url: str = os.getenv("SUPABASE_URL")
supabase_key: str = os.getenv("SUPABASE_KEY")
```

### RLS 정책 오류
```sql
-- RLS 정책 비활성화 (임시 - 개발 중에만 사용)
ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;

-- 다시 활성화
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
```

### 토큰이 자동 갱신되지 않음
- 브라우저 콘솔에서 네트워크 탭 확인
- `/api/v2/auth/refresh` 호출 여부 확인
- Refresh Token이 localStorage에 저장되어 있는지 확인

---

## 10. 향후 개선 사항 (선택)

1. **httpOnly Cookie 사용** (localStorage 대신)
   - XSS 공격 방어 강화
   - 브라우저가 자동으로 쿠키 관리

2. **Redis 캐싱**
   - 토큰 검증 시 DB 조회 대신 Redis 사용
   - 성능 향상

3. **Fingerprinting**
   - 디바이스 지문 인식으로 토큰 탈취 방지

4. **IP 화이트리스트**
   - 특정 IP에서만 토큰 사용 허용

---

## 참고 자료
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Supabase Documentation](https://supabase.com/docs)
