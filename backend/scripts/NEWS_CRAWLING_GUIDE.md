# 뉴스 크롤링 스크립트 사용 가이드

## 개요

이 문서는 두 가지 뉴스 크롤링 스크립트의 사용 방법을 설명합니다:
- `crawl_news.py`: NewsAPI.ai (Event Registry)를 사용한 뉴스 크롤링
- `crawl_massive_news.py`: Massive API를 사용한 비즈니스 뉴스 크롤링

## 스크립트 비교

| 특징 | crawl_news.py | crawl_massive_news.py |
|------|---------------|----------------------|
| API 소스 | NewsAPI.ai (Event Registry) | Massive API |
| 필요한 API 키 | NEWS_API_KEY | MASSIVE_API_KEY |
| 본문 추출 | API에서 제공 | 별도 크롤링 수행 |
| 감성 분석 | API에서 제공 | API에서 제공 |
| 로그 파일 | news_crawling.log | massive_news_crawling.log |

## 사전 요구사항

### 1. API 키 설정

`.env` 파일에 해당 API 키를 설정해야 합니다:

```bash
# NewsAPI.ai 사용 시
NEWS_API_KEY=your_newsapi_key_here

# Massive API 사용 시
MASSIVE_API_KEY=your_massive_api_key_here
```

### 2. Python 패키지 설치

```bash
pip install aiohttp beautifulsoup4 lxml
```

## 기본 사용법

### crawl_news.py

```bash
# 기본 형식
python scripts/crawl_news.py [옵션]

# Windows에서 절대 경로 사용
python E:\Microsoft_AI_Foundary\backend\scripts\crawl_news.py [옵션]
```

### crawl_massive_news.py

```bash
# 기본 형식
python scripts/crawl_massive_news.py [옵션]

# Windows에서 절대 경로 사용
python E:\Microsoft_AI_Foundary\backend\scripts\crawl_massive_news.py [옵션]
```

## 명령어 옵션

### 날짜 옵션 (필수 - 둘 중 하나 선택)

| 옵션 | 설명 | 예시 |
|------|------|------|
| `--start` | 시작 날짜 (YYYY-MM-DD) | `--start 2025-01-01` |
| `--days` | 최근 N일 | `--days 7` |

### 선택적 옵션

| 옵션 | 설명 | 기본값 | 예시 |
|------|------|--------|------|
| `--end` | 종료 날짜 (YYYY-MM-DD) | 현재 날짜 | `--end 2025-01-31` |
| `--symbols` | 특정 종목만 크롤링 | 전체 종목 | `--symbols AAPL GOOGL MSFT` |
| `--limit` | 종목당 최대 뉴스 개수 | 100 | `--limit 50` |

## 사용 예시

### 1. 특정 기간의 뉴스 크롤링

```bash
# 2025년 1월 전체
python scripts/crawl_news.py --start 2025-01-01 --end 2025-01-31

# 1월 1일부터 현재까지
python scripts/crawl_news.py --start 2025-01-01
```

### 2. 최근 N일의 뉴스 크롤링

```bash
# 최근 7일
python scripts/crawl_news.py --days 7

# 최근 30일
python scripts/crawl_massive_news.py --days 30
```

### 3. 특정 종목만 크롤링

```bash
# Apple과 Google만
python scripts/crawl_news.py --start 2025-01-01 --symbols AAPL GOOGL

# Tech 섹터 주요 종목
python scripts/crawl_massive_news.py --days 7 --symbols AAPL MSFT GOOGL NVDA TSLA
```

### 4. 종목당 뉴스 개수 제한

```bash
# 종목당 최대 50개씩만 가져오기
python scripts/crawl_news.py --start 2025-01-01 --limit 50

# 최근 3일, 종목당 20개씩
python scripts/crawl_massive_news.py --days 3 --limit 20
```

### 5. 섹터별 크롤링 예시

```bash
# Finance 섹터
python scripts/crawl_news.py --days 7 --symbols JPM BAC WFC GS MS C BLK SCHW AXP CB AIG MMC ICE CBOE V

# Healthcare 섹터
python scripts/crawl_massive_news.py --days 7 --symbols JNJ UNH PFE ABBV MRK TMO LLY ABT AMGN GILD CVS ISRG REGN BIIB VRTX

# Energy 섹터
python scripts/crawl_news.py --days 7 --symbols XOM CVX COP MPC PSX VLO EOG OXY MRO SLB
```

## 지원 종목 목록

현재 **85개 종목**을 지원합니다:

### Tech (20개)
```
AAPL, MSFT, GOOGL, GOOG, AMZN, NVDA, TSLA, META, NFLX, CRM,
ORCL, ADBE, INTC, AMD, MU, QCOM, IBM, CSCO, HPQ, AVGO
```

### Finance (15개)
```
JPM, BAC, WFC, GS, MS, C, BLK, SCHW, AXP, CB,
AIG, MMC, ICE, CBOE, V
```

### Healthcare (15개)
```
JNJ, UNH, PFE, ABBV, MRK, TMO, LLY, ABT, AMGN, GILD,
CVS, ISRG, REGN, BIIB, VRTX
```

### Retail & Consumer (15개)
```
WMT, TGT, HD, LOW, MCD, SBUX, KO, PEP, NKE, VFC,
LULU, DKS, RH, COST, DIS
```

### Industrials (10개)
```
CAT, BA, MMM, RTX, HON, JCI, PCAR, GE, DE, LMT
```

### Energy (10개)
```
XOM, CVX, COP, MPC, PSX, VLO, EOG, OXY, MRO, SLB
```

## 출력 정보

스크립트 실행 시 다음 정보가 출력됩니다:

```
================================================================================
크롤링 결과
================================================================================
처리 종목: 85/85
실패: 0
수집된 뉴스: 850개
저장된 뉴스: 720개
중복 제외: 130개
소요 시간: 425.67초
================================================================================
```

## 로그 파일

### crawl_news.py
- 로그 파일: `news_crawling.log`
- 위치: 스크립트 실행 디렉토리

### crawl_massive_news.py
- 로그 파일: `massive_news_crawling.log`
- 위치: 스크립트 실행 디렉토리

로그 파일에는 다음 정보가 기록됩니다:
- 각 종목별 크롤링 진행 상황
- 수집/저장된 뉴스 개수
- 중복 제외 개수
- 오류 메시지 및 스택 트레이스

## 동작 원리

### 1. 뉴스 수집
- API를 통해 지정된 기간의 뉴스 가져오기
- 종목별로 순차적으로 처리

### 2. 중복 제거
- URL 기준으로 DB에 이미 존재하는 뉴스 확인
- 중복된 뉴스는 저장하지 않음

### 3. 데이터 저장
- 고유한 뉴스만 DB에 저장
- 다음 정보 포함:
  - 제목, URL, 설명, 출처
  - 발행일시, 이미지 URL, 작성자
  - 종목 심볼, 관련 티커
  - 감성 분석 결과 (sentiment, ai_score)
  - 키워드
  - 본문 (가능한 경우)

### 4. Rate Limiting
- API Rate Limit 방지를 위한 대기 시간:
  - 종목 간: 0.5~1초
  - 본문 추출 간: 0.2초

## 주의사항

### 1. API 키 설정
- 반드시 `.env` 파일에 올바른 API 키를 설정해야 합니다
- API 키가 없으면 스크립트가 실행되지 않습니다

### 2. Rate Limiting
- API 제공자의 Rate Limit을 초과하지 않도록 주의
- 대량의 데이터를 크롤링할 때는 `--limit` 옵션 조정 권장
- 429 오류 발생 시 60초 대기 후 자동 재시도

### 3. 실행 시간
- 전체 종목(85개) 크롤링 시 상당한 시간 소요
- 예상 시간: 약 7~15분 (종목당 평균 5~10초)
- 백그라운드 실행 권장

### 4. 네트워크
- 안정적인 인터넷 연결 필요
- 본문 추출 시 다양한 뉴스 사이트에 접근

### 5. 데이터베이스
- DB 연결이 활성화되어 있어야 함
- 충분한 저장 공간 확보 필요

## 스크립트 중단

실행 중인 스크립트를 중단하려면:
- `Ctrl + C` 키를 누르면 안전하게 종료됩니다
- 종료 코드 130으로 종료

## 트러블슈팅

### API 인증 실패
```
ERROR - API 인증 실패: API 키를 확인하세요
```
**해결:** `.env` 파일의 API 키 확인

### 날짜 형식 오류
```
ERROR - 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.
```
**해결:** 날짜를 `2025-01-01` 형식으로 입력

### 지원하지 않는 종목
```
WARNING - 지원하지 않는 종목: ['INVALID']
```
**해결:** 지원 종목 목록 확인 후 올바른 심볼 사용

### DB 연결 오류
```
ERROR - 크롤링 중 오류 발생: database connection error
```
**해결:**
1. DB 서버 실행 여부 확인
2. `.env`의 DB 연결 정보 확인
3. 네트워크 연결 확인

## 권장 사용 패턴

### 일일 크롤링
```bash
# 매일 최근 1일의 뉴스 수집
python scripts/crawl_news.py --days 1
python scripts/crawl_massive_news.py --days 1
```

### 주간 크롤링
```bash
# 매주 최근 7일의 뉴스 수집
python scripts/crawl_news.py --days 7 --limit 50
python scripts/crawl_massive_news.py --days 7 --limit 50
```

### 특정 이벤트 크롤링
```bash
# 특정 기간에 특정 종목만 집중 크롤링
python scripts/crawl_news.py --start 2025-01-15 --end 2025-01-20 --symbols NVDA TSLA --limit 200
```

### 초기 데이터 수집
```bash
# 과거 30일의 데이터를 한 번에 수집
python scripts/crawl_news.py --days 30 --limit 100
python scripts/crawl_massive_news.py --days 30 --limit 100
```

## 추가 정보

- 두 스크립트는 동시에 실행 가능합니다 (다른 API 사용)
- 중복 제거는 URL 기준으로 수행되므로 두 API에서 같은 뉴스가 나와도 한 번만 저장됩니다
- 감성 분석 점수(ai_score)는 자동으로 계산됩니다:
  - positive: 0.7
  - negative: 0.3
  - neutral: 0.5

## 도움말 보기

```bash
python scripts/crawl_news.py --help
python scripts/crawl_massive_news.py --help
```
