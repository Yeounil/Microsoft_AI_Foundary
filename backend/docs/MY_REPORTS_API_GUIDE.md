# "내 레포트" 기능 API 가이드

## 개요

사용자가 생성한 뉴스 분석 레포트를 조회하고 관리할 수 있는 API입니다.

- **인증**: 모든 API는 JWT 토큰 인증 필요
- **Base URL**: `http://localhost:8000/api/v1`
- **응답 형식**: JSON

---

## 1. API 엔드포인트

### 1.1. 내 레포트 목록 조회

사용자가 생성한 모든 레포트 목록을 조회합니다.

#### Request

```http
GET /api/v1/news-report/my-reports?limit=20&offset=0
Authorization: Bearer <access_token>
```

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| limit | integer | 아니오 | 20 | 조회할 레포트 개수 (최대: 100) |
| offset | integer | 아니오 | 0 | 건너뛸 레포트 개수 (페이징용) |

#### Response (200 OK)

```json
{
  "total_count": 25,
  "reports": [
    {
      "id": 123,
      "symbol": "AAPL",
      "analyzed_count": 20,
      "limit_used": 20,
      "created_at": "2025-11-21T01:30:00+00:00",
      "expires_at": "2025-11-22T01:30:00+00:00",
      "is_expired": false
    },
    {
      "id": 122,
      "symbol": "GOOGL",
      "analyzed_count": 15,
      "limit_used": 15,
      "created_at": "2025-11-20T15:20:00+00:00",
      "expires_at": "2025-11-21T15:20:00+00:00",
      "is_expired": false
    }
  ]
}
```

#### Response Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| total_count | integer | 전체 레포트 개수 |
| reports | array | 레포트 목록 |
| reports[].id | integer | 레포트 ID |
| reports[].symbol | string | 종목 심볼 (예: AAPL, GOOGL) |
| reports[].analyzed_count | integer | 분석된 뉴스 개수 |
| reports[].limit_used | integer | 분석 시 사용한 limit 값 |
| reports[].created_at | string | 생성 시각 (ISO 8601) |
| reports[].expires_at | string | 만료 시각 (ISO 8601, 24시간 후) |
| reports[].is_expired | boolean | 만료 여부 |

---

### 1.2. 특정 레포트 상세 조회

레포트 ID로 특정 레포트의 전체 내용을 조회합니다.

#### Request

```http
GET /api/v1/news-report/report/{report_id}
Authorization: Bearer <access_token>
```

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| report_id | integer | 예 | 레포트 ID |

#### Response (200 OK)

```json
{
  "id": 123,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "AAPL",
  "report_data": {
    "summary": "애플의 최근 실적 발표와 신제품 출시에 대한 시장 반응이 긍정적입니다...",
    "sentiment": "긍정적",
    "key_points": [
      "Q4 실적이 예상을 상회하며 주가 상승",
      "새로운 AI 기능 발표로 투자자 관심 증가",
      "공급망 문제 해결로 생산 정상화"
    ],
    "recommendations": [
      "단기적으로 상승 모멘텀 유지 전망",
      "장기 투자자에게 매수 기회"
    ],
    "analyzed_articles": [
      {
        "title": "Apple Reports Strong Q4 Earnings",
        "url": "https://...",
        "published_at": "2025-11-20T10:30:00Z",
        "sentiment": "positive",
        "impact_score": 0.85
      }
    ]
  },
  "analyzed_count": 20,
  "limit_used": 20,
  "created_at": "2025-11-21T01:30:00+00:00",
  "expires_at": "2025-11-22T01:30:00+00:00",
  "is_expired": false
}
```

#### Response Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| id | integer | 레포트 ID |
| user_id | string | 사용자 ID (UUID) |
| symbol | string | 종목 심볼 |
| report_data | object | Claude AI가 생성한 분석 내용 (구조는 프롬프트에 따라 다름) |
| analyzed_count | integer | 분석된 뉴스 개수 |
| limit_used | integer | 분석 시 사용한 limit 값 |
| created_at | string | 생성 시각 (ISO 8601) |
| expires_at | string | 만료 시각 (ISO 8601) |
| is_expired | boolean | 만료 여부 |

---

### 1.3. 심볼로 최신 레포트 조회

특정 종목의 가장 최근 레포트를 조회합니다 (만료되지 않은 것만).

#### Request

```http
GET /api/v1/news-report/{symbol}
Authorization: Bearer <access_token>
```

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| symbol | string | 예 | 종목 심볼 (예: AAPL, GOOGL) |

#### Response (200 OK)

`1.2. 특정 레포트 상세 조회`와 동일한 형식

#### Response (404 Not Found)

```json
{
  "detail": "AAPL 종목의 유효한 레포트가 없습니다. 새로운 레포트를 생성해주세요."
}
```

---

### 1.4. 새 레포트 생성

특정 종목에 대한 새로운 뉴스 분석 레포트를 생성합니다.

#### Request

```http
POST /api/v1/news-report
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "symbol": "AAPL",
  "limit": 20
}
```

#### Request Body

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| symbol | string | 예 | - | 종목 심볼 (예: AAPL, GOOGL) |
| limit | integer | 아니오 | 20 | 분석할 뉴스 개수 (최소: 5, 최대: 50) |

#### Response (200 OK)

```json
{
  "id": 124,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "AAPL",
  "report_data": { ... },
  "created_at": "2025-11-21T02:00:00+00:00",
  "expires_at": "2025-11-22T02:00:00+00:00",
  "saved": true
}
```

---

## 2. 프론트엔드 구현 예제

### 2.1. API 클라이언트 설정

```typescript
// lib/api/newsReportApi.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 모든 요청에 Authorization 헤더 추가
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 에러 시 로그인 페이지로 리다이렉트
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 또는 인증 실패
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2.2. API 함수

```typescript
// lib/api/newsReportApi.ts (계속)

export interface Report {
  id: number;
  symbol: string;
  analyzed_count: number;
  limit_used: number;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
}

export interface ReportDetail extends Report {
  user_id: string;
  report_data: any; // Claude가 생성한 분석 내용
}

export interface MyReportsResponse {
  total_count: number;
  reports: Report[];
}

/**
 * 내 레포트 목록 조회
 */
export async function getMyReports(
  limit: number = 20,
  offset: number = 0
): Promise<MyReportsResponse> {
  const response = await apiClient.get('/api/v1/news-report/my-reports', {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * 특정 레포트 상세 조회
 */
export async function getReportById(reportId: number): Promise<ReportDetail> {
  const response = await apiClient.get(`/api/v1/news-report/report/${reportId}`);
  return response.data;
}

/**
 * 심볼로 최신 레포트 조회
 */
export async function getReportBySymbol(symbol: string): Promise<ReportDetail> {
  const response = await apiClient.get(`/api/v1/news-report/${symbol.toUpperCase()}`);
  return response.data;
}

/**
 * 새 레포트 생성
 */
export async function createReport(
  symbol: string,
  limit: number = 20
): Promise<ReportDetail> {
  const response = await apiClient.post('/api/v1/news-report', {
    symbol: symbol.toUpperCase(),
    limit,
  });
  return response.data;
}
```

### 2.3. React 컴포넌트 예제

#### 레포트 목록 페이지

```typescript
// pages/my-reports.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getMyReports, Report } from '@/lib/api/newsReportApi';

export default function MyReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadReports();
  }, [page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;
      const data = await getMyReports(limit, offset);
      setReports(data.reports);
      setTotalCount(data.total_count);
    } catch (error) {
      console.error('레포트 목록 로드 실패:', error);
      alert('레포트 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = (reportId: number) => {
    router.push(`/reports/${reportId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">내 레포트</h1>

      <div className="mb-4 text-gray-600">
        전체 {totalCount}개의 레포트
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() => handleReportClick(report.id)}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-blue-600">
                  {report.symbol}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {report.analyzed_count}개 뉴스 분석
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {formatDate(report.created_at)}
                </div>
                {report.is_expired ? (
                  <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded">
                    만료됨
                  </span>
                ) : (
                  <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded">
                    유효
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      <div className="flex justify-center mt-8 space-x-2">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          이전
        </button>
        <span className="px-4 py-2">
          {page} / {Math.ceil(totalCount / limit)}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= Math.ceil(totalCount / limit)}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          다음
        </button>
      </div>
    </div>
  );
}
```

#### 레포트 상세 페이지

```typescript
// pages/reports/[reportId].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getReportById, ReportDetail } from '@/lib/api/newsReportApi';

export default function ReportDetailPage() {
  const router = useRouter();
  const { reportId } = router.query;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await getReportById(Number(reportId));
      setReport(data);
    } catch (error: any) {
      console.error('레포트 로드 실패:', error);
      if (error.response?.status === 404) {
        alert('레포트를 찾을 수 없습니다.');
        router.push('/my-reports');
      } else {
        alert('레포트를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (!report) {
    return <div>레포트를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/my-reports')}
          className="text-blue-600 hover:underline mb-4"
        >
          ← 목록으로 돌아가기
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{report.symbol} 뉴스 분석 레포트</h1>
            <p className="text-gray-600 mt-2">
              {new Date(report.created_at).toLocaleString('ko-KR')} 생성
            </p>
            <p className="text-sm text-gray-500">
              {report.analyzed_count}개 뉴스 분석
            </p>
          </div>

          {report.is_expired && (
            <span className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-100 rounded">
              만료됨
            </span>
          )}
        </div>
      </div>

      {/* 레포트 내용 */}
      <div className="bg-white p-8 rounded-lg shadow">
        {/* Summary */}
        {report.report_data.summary && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">📊 요약</h2>
            <p className="text-gray-700 leading-relaxed">
              {report.report_data.summary}
            </p>
          </div>
        )}

        {/* Sentiment */}
        {report.report_data.sentiment && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">💭 시장 감정</h2>
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold">
              {report.report_data.sentiment}
            </div>
          </div>
        )}

        {/* Key Points */}
        {report.report_data.key_points && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">🔑 주요 포인트</h2>
            <ul className="list-disc list-inside space-y-2">
              {report.report_data.key_points.map((point: string, index: number) => (
                <li key={index} className="text-gray-700">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {report.report_data.recommendations && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">💡 투자 제안</h2>
            <ul className="list-disc list-inside space-y-2">
              {report.report_data.recommendations.map((rec: string, index: number) => (
                <li key={index} className="text-gray-700">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Analyzed Articles */}
        {report.report_data.analyzed_articles && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">📰 분석된 뉴스</h2>
            <div className="space-y-3">
              {report.report_data.analyzed_articles.map((article: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {article.title}
                  </a>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(article.published_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2.4. 사용 시나리오

#### 시나리오 1: 사용자가 "내 레포트" 페이지 방문

```typescript
1. GET /api/v1/news-report/my-reports?limit=20&offset=0
   → 레포트 목록 표시

2. 사용자가 특정 레포트 클릭

3. GET /api/v1/news-report/report/123
   → 레포트 상세 내용 표시
```

#### 시나리오 2: 종목 페이지에서 레포트 확인

```typescript
1. 종목 페이지 (예: /stocks/AAPL) 방문

2. "AI 분석 레포트 보기" 버튼 클릭

3. GET /api/v1/news-report/AAPL
   → 성공 시: 최신 레포트 표시
   → 404 시: "레포트 생성" 버튼 표시

4. "레포트 생성" 버튼 클릭

5. POST /api/v1/news-report { "symbol": "AAPL", "limit": 20 }
   → 생성된 레포트 표시
```

---

## 3. 에러 처리

### 3.1. 일반적인 에러 코드

| 상태 코드 | 설명 | 대응 방법 |
|----------|------|----------|
| 401 Unauthorized | 인증 실패 (토큰 없음/만료) | 로그인 페이지로 리다이렉트 |
| 403 Forbidden | 권한 없음 (다른 사용자의 레포트) | 에러 메시지 표시 |
| 404 Not Found | 레포트 없음 | "레포트 생성" 안내 |
| 500 Internal Server Error | 서버 오류 | 재시도 또는 에러 메시지 표시 |

### 3.2. 에러 처리 예제

```typescript
try {
  const report = await getReportById(reportId);
  // 성공 처리
} catch (error: any) {
  if (error.response) {
    switch (error.response.status) {
      case 401:
        // 인증 실패
        alert('로그인이 필요합니다.');
        router.push('/login');
        break;
      case 404:
        // 레포트 없음
        alert('레포트를 찾을 수 없습니다.');
        router.push('/my-reports');
        break;
      case 500:
        // 서버 오류
        alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        break;
      default:
        alert(`오류가 발생했습니다: ${error.response.data.detail}`);
    }
  } else {
    // 네트워크 오류
    alert('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
  }
}
```

---

## 4. 추가 기능 제안

### 4.1. 레포트 필터링

```typescript
// 만료되지 않은 레포트만 표시
const validReports = reports.filter(report => !report.is_expired);

// 특정 심볼 검색
const appleReports = reports.filter(report => report.symbol === 'AAPL');

// 날짜순 정렬 (최신순)
const sortedReports = [...reports].sort((a, b) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);
```

### 4.2. 자동 새로고침

```typescript
// 만료 임박 레포트 자동 알림
useEffect(() => {
  const interval = setInterval(() => {
    reports.forEach(report => {
      const expiresAt = new Date(report.expires_at);
      const now = new Date();
      const hoursLeft = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursLeft < 1 && hoursLeft > 0) {
        console.log(`${report.symbol} 레포트가 곧 만료됩니다.`);
      }
    });
  }, 60000); // 1분마다 체크

  return () => clearInterval(interval);
}, [reports]);
```

### 4.3. 레포트 공유

```typescript
// 레포트 URL 복사
const shareReport = (reportId: number) => {
  const url = `${window.location.origin}/reports/${reportId}`;
  navigator.clipboard.writeText(url);
  alert('레포트 링크가 복사되었습니다!');
};
```

---

## 5. 성능 최적화

### 5.1. 캐싱

```typescript
// React Query 사용 예제
import { useQuery } from '@tanstack/react-query';

function useMyReports(limit: number, offset: number) {
  return useQuery({
    queryKey: ['myReports', limit, offset],
    queryFn: () => getMyReports(limit, offset),
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    cacheTime: 10 * 60 * 1000, // 10분간 캐시 보관
  });
}

function useReportDetail(reportId: number) {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReportById(reportId),
    enabled: !!reportId, // reportId가 있을 때만 실행
    staleTime: 10 * 60 * 1000, // 10분간 캐시 유지
  });
}
```

### 5.2. 무한 스크롤

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function useInfiniteReports(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['myReports', 'infinite'],
    queryFn: ({ pageParam = 0 }) => getMyReports(limit, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.length * limit;
      return loadedCount < lastPage.total_count ? loadedCount : undefined;
    },
  });
}
```

---

## 6. 테스트

### 6.1. 단위 테스트

```typescript
// __tests__/newsReportApi.test.ts
import { getMyReports, getReportById } from '@/lib/api/newsReportApi';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('News Report API', () => {
  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
  });

  it('should fetch my reports', async () => {
    const mockData = {
      total_count: 2,
      reports: [
        { id: 1, symbol: 'AAPL', analyzed_count: 20 },
        { id: 2, symbol: 'GOOGL', analyzed_count: 15 },
      ],
    };

    mockedAxios.get.mockResolvedValue({ data: mockData });

    const result = await getMyReports(20, 0);
    expect(result).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/v1/news-report/my-reports',
      { params: { limit: 20, offset: 0 } }
    );
  });

  it('should fetch report by id', async () => {
    const mockReport = {
      id: 123,
      symbol: 'AAPL',
      report_data: { summary: 'Test summary' },
    };

    mockedAxios.get.mockResolvedValue({ data: mockReport });

    const result = await getReportById(123);
    expect(result).toEqual(mockReport);
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/news-report/report/123');
  });
});
```

---

## 7. 참고사항

### 7.1. 토큰 갱신

Access Token은 60분 후 만료됩니다. Refresh Token으로 갱신하세요:

```typescript
// lib/api/auth.ts
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');

  const response = await axios.post(`${API_BASE_URL}/api/v2/auth/refresh`, {
    refresh_token: refreshToken,
  });

  const { access_token, refresh_token } = response.data;

  localStorage.setItem('access_token', access_token);
  localStorage.setItem('refresh_token', refresh_token);

  return access_token;
}
```

### 7.2. 환경 변수 설정

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 8. 문의 및 지원

- **Swagger UI**: http://localhost:8000/docs
- **API 문서**: 이 파일
- **백엔드 소스**: `backend/app/api/news_report_v1.py`

---

**마지막 업데이트**: 2025-11-21
**API 버전**: v1
