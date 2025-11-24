# 소셜 로그인 설정 가이드

## 개요

이 프로젝트는 카카오, 구글, 네이버 소셜 로그인을 지원합니다.
현재 **카카오 로그인**이 완전히 구현되어 있으며, 구글과 네이버는 향후 추가 예정입니다.

## 아키텍처

### 디렉토리 구조
```
backend/
├── app/
│   ├── core/
│   │   ├── social_auth_base.py    # 소셜 로그인 추상 베이스 클래스
│   │   ├── kakao_auth.py          # 카카오 로그인 구현
│   │   └── config.py              # 환경 변수 설정
│   ├── api/
│   │   └── social_auth.py         # 소셜 로그인 API 엔드포인트
│   └── services/
│       └── direct_db_service.py   # DB 직접 접근 서비스 (소셜 사용자 CRUD)
└── migrations/
    └── add_social_login_columns.sql  # DB 마이그레이션
```

### 주요 기능

1. **확장 가능한 설계**: `SocialAuthProvider` 추상 클래스를 상속하여 새로운 소셜 로그인 제공자를 쉽게 추가
2. **JWT 토큰 통합**: 기존 JWT 인증 시스템과 완벽히 통합
3. **자동 회원가입**: 소셜 로그인 시 신규 사용자 자동 생성
4. **중복 방지**: provider + provider_user_id로 사용자 고유성 보장

---

## 1. 데이터베이스 마이그레이션

### Supabase SQL Editor에서 실행

`backend/migrations/add_social_login_columns.sql` 파일의 내용을 Supabase SQL Editor에서 실행하세요.

```sql
-- auth_users 테이블에 소셜 로그인 컬럼 추가
ALTER TABLE public.auth_users
ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500);

-- 유니크 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_provider_user
ON public.auth_users(provider, provider_user_id)
WHERE provider IS NOT NULL AND provider_user_id IS NOT NULL;
```

### 추가된 컬럼 설명

- `provider`: 소셜 로그인 제공자 (예: `kakao`, `google`, `naver`, `local`)
- `provider_user_id`: 제공자별 고유 사용자 ID (예: 카카오 회원번호)
- `profile_image`: 프로필 이미지 URL (선택)

---

## 2. 카카오 로그인 설정

### 2.1 카카오 애플리케이션 생성

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. **내 애플리케이션** > **애플리케이션 추가하기**
3. 앱 이름, 사업자명 입력 후 생성

### 2.2 플랫폼 등록

1. 생성한 앱 선택 > **앱 설정** > **플랫폼**
2. **Web 플랫폼 등록**
   - 사이트 도메인: `http://localhost:3000` (개발), `https://yourdomain.com` (운영)

### 2.3 Redirect URI 설정

1. **제품 설정** > **카카오 로그인**
2. **Redirect URI 등록**
   - 개발: `http://localhost:3000/auth/kakao/callback`
   - 운영: `https://yourdomain.com/auth/kakao/callback`

### 2.4 동의 항목 설정

1. **제품 설정** > **카카오 로그인** > **동의 항목**
2. 다음 항목을 **필수 동의**로 설정:
   - 닉네임
   - 프로필 이미지 (선택 동의)
   - 카카오계정(이메일) ← **중요: 이메일은 필수**

### 2.5 키 발급 확인

1. **앱 설정** > **앱 키** 에서 다음 키 확인:
   - **REST API 키**: `KAKAO_CLIENT_ID`로 사용
   - **Client Secret**: (선택) 보안 강화를 위해 발급 가능

### 2.6 환경 변수 설정

`.env` 파일에 다음 값 추가:

```bash
# Kakao Login
KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret  # 선택사항
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
```

**중요**: Client Secret은 선택사항이지만, 보안을 위해 발급하여 사용하는 것을 권장합니다.

---

## 3. API 사용법

### 3.1 카카오 로그인 플로우

#### Step 1: 인가 URL 조회 (프론트엔드)

```typescript
// GET /api/v2/social-auth/kakao/authorize
const response = await fetch('http://localhost:8000/api/v2/social-auth/kakao/authorize');
const { authorization_url } = await response.json();

// 사용자를 카카오 로그인 페이지로 리다이렉트
window.location.href = authorization_url;
```

#### Step 2: 카카오 로그인 콜백 처리 (프론트엔드)

카카오 로그인 완료 후 `http://localhost:3000/auth/kakao/callback?code=XXXXX` 로 리다이렉트됩니다.

```typescript
// URL에서 인가 코드 추출
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (!code) {
  console.error('인가 코드가 없습니다');
  return;
}
```

#### Step 3: 백엔드로 인가 코드 전송 및 JWT 토큰 획득

```typescript
// POST /api/v2/social-auth/kakao/login
const response = await fetch('http://localhost:8000/api/v2/social-auth/kakao/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ code }),
});

const { access_token, refresh_token, token_type } = await response.json();

// 로컬 스토리지에 토큰 저장
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);

// 메인 페이지로 리다이렉트
window.location.href = '/dashboard';
```

### 3.2 API 엔드포인트 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v2/social-auth/{provider}/authorize` | 소셜 로그인 인가 URL 조회 |
| POST | `/api/v2/social-auth/{provider}/login` | 소셜 로그인 처리 및 JWT 토큰 발급 |
| GET | `/api/v2/social-auth/{provider}/user-info` | 소셜 사용자 정보 조회 (디버깅용) |

**지원 Provider**: `kakao` (현재), `google`, `naver` (향후)

### 3.3 응답 예시

#### 로그인 성공

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### 에러 응답

```json
{
  "detail": "Failed to get access token from provider"
}
```

---

## 4. 프론트엔드 예시 (React)

### 4.1 카카오 로그인 버튼 컴포넌트

```tsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const KakaoLoginButton: React.FC = () => {
  const handleKakaoLogin = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v2/social-auth/kakao/authorize');
      const { authorization_url } = await response.json();
      window.location.href = authorization_url;
    } catch (error) {
      console.error('카카오 로그인 실패:', error);
    }
  };

  return (
    <button onClick={handleKakaoLogin}>
      카카오로 로그인
    </button>
  );
};
```

### 4.2 카카오 로그인 콜백 페이지

```tsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const KakaoCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');

      if (!code) {
        console.error('인가 코드가 없습니다');
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/api/v2/social-auth/kakao/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error('로그인 실패');
        }

        const { access_token, refresh_token } = await response.json();

        // 토큰 저장
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);

        // 메인 페이지로 이동
        navigate('/dashboard');
      } catch (error) {
        console.error('카카오 로그인 처리 실패:', error);
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return <div>로그인 처리 중...</div>;
};
```

### 4.3 라우터 설정

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { KakaoCallback } from './components/KakaoCallback';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
        {/* 기타 라우트 */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 5. 향후 확장 (구글, 네이버)

### 5.1 새로운 소셜 로그인 제공자 추가 방법

1. **새 Provider 클래스 생성**:
   - `backend/app/core/google_auth.py` 생성
   - `SocialAuthProvider` 추상 클래스 상속
   - 필수 메서드 구현:
     - `get_authorization_url()`
     - `get_access_token()`
     - `get_user_info()`
     - `normalize_user_info()`

2. **API 라우터에 등록**:
   - `backend/app/api/social_auth.py`의 `get_social_provider()` 함수에 추가

3. **환경 변수 추가**:
   - `.env`에 Google/Naver 관련 설정 추가

### 5.2 구글 로그인 예시 (참고)

```python
# backend/app/core/google_auth.py
from app.core.social_auth_base import SocialAuthProvider

class GoogleAuthProvider(SocialAuthProvider):
    AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    def get_authorization_url(self, state=None):
        # 구글 OAuth 인가 URL 생성
        pass

    # ... 기타 메서드 구현
```

---

## 6. 테스트

### 6.1 로컬 테스트

1. 백엔드 서버 실행:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. 프론트엔드 서버 실행:
   ```bash
   cd frontend
   npm start  # 또는 npm run dev
   ```

3. 브라우저에서 `http://localhost:3000` 접속

### 6.2 API 테스트 (Postman/Thunder Client)

#### 1. 인가 URL 조회
```http
GET http://localhost:8000/api/v2/social-auth/kakao/authorize
```

#### 2. 브라우저에서 카카오 로그인 수행 후 인가 코드 획득

#### 3. 로그인 처리
```http
POST http://localhost:8000/api/v2/social-auth/kakao/login
Content-Type: application/json

{
  "code": "YOUR_AUTHORIZATION_CODE"
}
```

---

## 7. 트러블슈팅

### 7.1 "Failed to get access token from provider"

- Redirect URI가 카카오 개발자 콘솔에 정확히 등록되어 있는지 확인
- `.env` 파일의 `KAKAO_REDIRECT_URI`가 등록된 URI와 일치하는지 확인

### 7.2 "This email is already registered with another method"

- 해당 이메일로 이미 일반 회원가입이 되어 있음
- 기존 계정과 소셜 계정을 연동하는 기능이 필요할 수 있음

### 7.3 "Invalid authentication credentials"

- 카카오 REST API 키가 올바른지 확인
- Client Secret이 설정된 경우 정확히 입력되었는지 확인

### 7.4 CORS 에러

- `backend/app/main.py`의 `CORS` 설정에 프론트엔드 URL이 포함되어 있는지 확인

---

## 8. 보안 권장 사항

1. **HTTPS 사용**: 운영 환경에서는 반드시 HTTPS를 사용하세요
2. **Client Secret 사용**: 카카오 Client Secret을 설정하여 보안을 강화하세요
3. **State 파라미터**: CSRF 공격 방지를 위해 state 파라미터를 사용하는 것을 권장합니다
4. **토큰 저장**:
   - Access Token: 메모리 또는 httpOnly 쿠키에 저장
   - Refresh Token: httpOnly 쿠키에 저장 (XSS 공격 방지)

---

## 9. 참고 자료

- [카카오 로그인 REST API 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)

---

## 문의

소셜 로그인 관련 문제가 있으면 GitHub Issues에 등록해주세요.
