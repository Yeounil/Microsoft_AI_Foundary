# Next.js 마이그레이션 완료

이 프로젝트가 Create React App에서 Next.js 13+ (App Router)로 성공적으로 마이그레이션되었습니다.

## 변경 사항

### 1. 프로젝트 구조
```
frontend/
├── app/                    # Next.js App Router 구조
│   ├── globals.css        # 글로벌 스타일
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 메인 페이지
│   ├── providers.tsx      # MUI ThemeProvider
│   └── theme.tsx          # MUI 테마 설정
├── components/            # React 컴포넌트
│   ├── MainApp.tsx        # 메인 앱 컴포넌트
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── StockSearch.tsx
│   ├── StockChart.tsx
│   ├── StockAnalysis.tsx
│   ├── NewsSection.tsx
│   ├── RecommendedNews.tsx
│   ├── LandingPage.tsx
│   └── LandingPage.css
├── services/              # API 서비스
│   ├── api.ts
│   └── authService.ts
├── types/                 # TypeScript 타입 정의
│   └── api.ts
├── assets/                # 정적 자산 (이미지 등)
│   └── myLogo.png
├── public/                # 정적 파일
├── next.config.js         # Next.js 설정
├── tsconfig.json          # TypeScript 설정
└── .env                   # 환경 변수
```

### 2. 주요 변경 사항

#### 환경 변수
- `REACT_APP_*` → `NEXT_PUBLIC_*`
- 예: `REACT_APP_API_BASE_URL` → `NEXT_PUBLIC_API_BASE_URL`

#### 컴포넌트
- 모든 클라이언트 컴포넌트에 `'use client'` 디렉티브 추가
- Import 경로를 `@/` alias로 변경
- `<img>` → `<Image>` (Next.js Image 컴포넌트)

#### 스타일링
- MUI 테마를 별도 파일로 분리
- 글로벌 CSS를 `app/globals.css`로 이동

#### 서비스 레이어
- `localStorage` 사용 시 `typeof window !== 'undefined'` 체크 추가
- Next.js SSR 호환성 확보

## 실행 방법

### 개발 서버 시작
```bash
npm run dev
```
- 브라우저에서 http://localhost:3000 접속

### 프로덕션 빌드
```bash
npm run build
npm start
```

### 린트 실행
```bash
npm run lint
```

## 패키지 변경

### 추가된 패키지
- `next` ^16.0.0
- `typescript` ^5.9.3
- `@types/node` ^24.9.1
- `@types/react` ^19.2.2

### 제거된 패키지
- `react-scripts`
- CRA 관련 모든 의존성

### 유지된 패키지
- `react` ^19.2.0
- `react-dom` ^19.2.0
- `@mui/material` ^5.18.0
- `@mui/icons-material` ^5.18.0
- `@emotion/react` ^11.14.0
- `@emotion/styled` ^11.14.1
- `axios` ^1.11.0
- `recharts` ^3.1.2

## 주요 기능

### 1. App Router (Next.js 13+)
- 서버 컴포넌트와 클라이언트 컴포넌트 분리
- 자동 코드 분할
- 향상된 성능

### 2. 이미지 최적화
- Next.js Image 컴포넌트를 통한 자동 이미지 최적화
- Lazy loading 지원

### 3. TypeScript 지원
- TypeScript 5.9.3로 업그레이드
- Next.js와 완전히 호환

### 4. API 라우팅
- `next.config.js`에서 API 프록시 설정
- 백엔드 API와의 원활한 통합

## 환경 설정

### .env 파일
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 백엔드 연동

백엔드 서버가 실행 중이어야 합니다:
```bash
cd ../backend
# 백엔드 시작 명령어
```

## 문제 해결

### 빌드 오류
```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 환경 변수 인식 안됨
- `.env` 파일이 프로젝트 루트에 있는지 확인
- `NEXT_PUBLIC_` 접두사가 있는지 확인
- 개발 서버 재시작

### localStorage 오류
- 서비스 파일에 `typeof window !== 'undefined'` 체크가 있는지 확인

## 추가 정보

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js 마이그레이션 가이드](https://nextjs.org/docs/app/building-your-application/upgrading/from-create-react-app)

## 마이그레이션 체크리스트

- [x] Next.js 설치 및 설정
- [x] App Router 구조 생성
- [x] 컴포넌트 이동 및 'use client' 추가
- [x] 서비스 레이어 SSR 호환성 확보
- [x] 환경 변수 업데이트
- [x] 이미지 컴포넌트 변경
- [x] TypeScript 업그레이드
- [x] CRA 파일 제거
- [x] 빌드 성공 확인

모든 마이그레이션이 완료되었습니다! 🎉
