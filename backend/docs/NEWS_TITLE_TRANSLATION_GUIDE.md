# 뉴스 제목 한글 번역 스크립트 가이드

## 개요

`translate_titles.py` 스크립트는 뉴스 기사의 영문 제목을 OpenAI GPT-4o-mini를 사용하여 한글로 번역합니다.

## 특징

- ✅ **고속 병렬 처리**: 기본 50개씩 동시 번역
- ✅ **스마트 필터링**: kr_title이 NULL인 기사만 자동 선택
- ✅ **선택적 번역**: 특정 종목이나 개수 제한 가능
- ✅ **안전한 테스트**: Dry-run 모드로 실제 저장 없이 테스트
- ✅ **상세한 로깅**: 진행 상황과 결과를 실시간 확인

## 사전 요구사항

### 1. DB 마이그레이션

먼저 `kr_title` 컬럼을 추가해야 합니다.

**Supabase SQL Editor에서 실행:**

```sql
-- migrations/add_kr_title_column.sql 파일 내용 실행
ALTER TABLE public.news_articles
ADD COLUMN IF NOT EXISTS kr_title character varying(500);

COMMENT ON COLUMN public.news_articles.kr_title IS '뉴스 기사 제목의 한글 번역';

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_news_articles_kr_title
ON public.news_articles USING gin(to_tsvector('korean', kr_title));
```

### 2. OpenAI API 키 설정

`.env` 파일에 OpenAI API 키를 설정해야 합니다:

```bash
OPENAI_API_KEY=sk-proj-your-api-key-here
```

### 3. Python 패키지 확인

```bash
pip install openai  # 최신 버전 권장
```

## 기본 사용법

### 스크립트 위치

```bash
backend/scripts/translate_titles.py
```

### 명령어 형식

```bash
cd /home/yeounil/MS_AI_FOUNDRY/backend
python scripts/translate_titles.py [옵션]
```

## 주요 옵션

| 옵션 | 설명 | 예시 |
|------|------|------|
| `--all` | 모든 미번역 제목 번역 | `--all` |
| `--limit N` | 최대 N개만 번역 | `--limit 100` |
| `--symbols` | 특정 종목만 번역 | `--symbols AAPL GOOGL` |
| `--batch-size N` | 배치 크기 조정 (기본: 50) | `--batch-size 100` |
| `--dry-run` | 테스트 모드 (실제 저장 안함) | `--dry-run` |

## 사용 예시

### 1. 모든 미번역 제목 번역

```bash
python scripts/translate_titles.py --all
```

**출력 예시:**
```
2025-11-25 10:00:00 - __main__ - INFO - ================================================================================
2025-11-25 10:00:00 - __main__ - INFO - 뉴스 기사 제목 한글 번역 시작
2025-11-25 10:00:00 - __main__ - INFO - ================================================================================
2025-11-25 10:00:01 - __main__ - INFO - 번역 대상 기사 조회 중...
2025-11-25 10:00:02 - __main__ - INFO - 번역 대상: 1523개
2025-11-25 10:00:02 - __main__ - INFO - 배치 크기: 50
2025-11-25 10:00:02 - __main__ - INFO - ================================================================================
2025-11-25 10:00:02 - __main__ - INFO - 제목 번역 시작...
2025-11-25 10:00:03 - __main__ - INFO - 배치 처리 중: 1~50/1523
2025-11-25 10:00:05 - __main__ - INFO - 배치 처리 중: 51~100/1523
...
2025-11-25 10:02:30 - __main__ - INFO - 번역 완료: 1523/1523
2025-11-25 10:02:30 - __main__ - INFO - DB 저장 중...
2025-11-25 10:02:45 - __main__ - INFO - ================================================================================
2025-11-25 10:02:45 - __main__ - INFO - 번역 결과
2025-11-25 10:02:45 - __main__ - INFO - ================================================================================
2025-11-25 10:02:45 - __main__ - INFO - 대상 기사: 1523개
2025-11-25 10:02:45 - __main__ - INFO - 번역 성공: 1523개
2025-11-25 10:02:45 - __main__ - INFO - 번역 실패: 0개
2025-11-25 10:02:45 - __main__ - INFO - DB 저장: 1523개
2025-11-25 10:02:45 - __main__ - INFO - 소요 시간: 165.23초
2025-11-25 10:02:45 - __main__ - INFO - 평균 속도: 9.21개/초
2025-11-25 10:02:45 - __main__ - INFO - ================================================================================
```

### 2. 제한된 개수만 번역 (테스트용)

```bash
python scripts/translate_titles.py --limit 100
```

첫 100개 미번역 제목만 번역합니다.

### 3. 특정 종목만 번역

```bash
# Communications와 ETF 종목만 번역
python scripts/translate_titles.py --all --symbols VZ T TMUS SPY QQQ DIA IWM VTI VOO VEA VWO AGG BND GLD SLV
```

### 4. Dry-run 모드 (테스트)

```bash
# 실제 DB 저장 없이 번역만 테스트
python scripts/translate_titles.py --limit 10 --dry-run
```

번역은 수행하지만 실제로 DB에 저장하지 않습니다. 스크립트 동작을 테스트할 때 유용합니다.

### 5. 배치 크기 조정

```bash
# 더 빠른 처리를 위해 배치 크기를 100으로 증가
python scripts/translate_titles.py --all --batch-size 100
```

**주의**: 배치 크기를 너무 크게 하면 OpenAI API Rate Limit에 걸릴 수 있습니다.

## 성능 및 비용

### 처리 속도

| 기사 수 | 배치 크기 | 예상 소요 시간 |
|---------|-----------|----------------|
| 100개 | 50 | ~10-15초 |
| 500개 | 50 | ~1분 |
| 1,000개 | 50 | ~2분 |
| 5,000개 | 50 | ~10분 |

**실제 속도는 네트워크 상황과 API 응답 속도에 따라 달라질 수 있습니다.**

### 비용 예측 (GPT-4o-mini)

- **입력 비용**: $0.150 / 1M tokens
- **출력 비용**: $0.600 / 1M tokens
- **제목 평균**: 입력 ~20 tokens, 출력 ~15 tokens

| 번역 개수 | 예상 비용 (USD) | 예상 비용 (KRW) |
|-----------|-----------------|-----------------|
| 100개 | ~$0.002 | ~3원 |
| 1,000개 | ~$0.02 | ~30원 |
| 10,000개 | ~$0.20 | ~300원 |

**매우 저렴합니다!** 수만 개를 번역해도 몇 백원 수준입니다.

## 로그 파일

### 로그 위치

```
backend/translate_titles.log
```

### 로그 레벨

- **INFO**: 진행 상황 및 결과
- **DEBUG**: 각 제목 번역 세부 내용
- **ERROR**: 오류 발생 시

### 로그 예시

```
2025-11-25 10:00:03 - __main__ - INFO - 배치 처리 중: 1~50/1523
2025-11-25 10:00:03 - __main__ - DEBUG - [12345] Apple Announces Record Q4 Earnings... → 애플, 4분기 사상 최대 실적 발표...
2025-11-25 10:00:03 - __main__ - DEBUG - [12346] Tesla Stock Surges on New Model... → 테슬라 주가, 신규 모델 발표로 급등...
```

## 번역 품질

### 번역 원칙

`prompt.txt`의 금융 뉴스 번역 원칙을 제목용으로 간소화하여 적용:

1. **정확한 금융 용어**: 업계 표준 한글 용어 사용
2. **자연스러운 표현**: 직역이 아닌 의미 번역
3. **전문적인 톤**: 금융 저널리즘에 적합한 격식체
4. **간결성**: 제목답게 핵심만 전달

### 번역 예시

| 영문 제목 | 한글 번역 |
|-----------|----------|
| Apple Reports Record-Breaking Q4 Earnings, Stock Surges | 애플, 4분기 사상 최대 실적 발표...주가 급등 |
| Fed Signals Potential Rate Cuts in 2025 | 연준, 2025년 금리 인하 가능성 시사 |
| Tesla's New Model Drives Stock to All-Time High | 테슬라 신규 모델, 주가 사상 최고치 견인 |
| JPMorgan CEO Warns of Economic Headwinds | JP모건 CEO, 경제 역풍 경고 |

## 문제 해결

### 1. OpenAI API 키 오류

```
ERROR - OPENAI_API_KEY가 설정되지 않았습니다.
```

**해결**: `.env` 파일에 `OPENAI_API_KEY` 추가

### 2. kr_title 컬럼 없음

```
ERROR - column "kr_title" does not exist
```

**해결**: `migrations/add_kr_title_column.sql` 실행

### 3. Rate Limit 초과

```
ERROR - Rate limit exceeded
```

**해결**:
- 배치 크기를 줄이기: `--batch-size 20`
- 잠시 후 다시 시도

### 4. 번역할 기사 없음

```
INFO - 번역할 기사가 없습니다.
```

**원인**: 모든 기사가 이미 번역됨

**확인**:
```sql
SELECT COUNT(*) FROM news_articles WHERE kr_title IS NULL;
```

## 운영 권장사항

### 정기 실행

새로 크롤링된 뉴스 제목을 자동으로 번역하려면 cron job 설정:

```bash
# 매일 자정에 미번역 제목 번역
0 0 * * * cd /home/yeounil/MS_AI_FOUNDRY/backend && python scripts/translate_titles.py --all >> logs/translate_titles_cron.log 2>&1
```

### 크롤링과 연계

뉴스 크롤링 후 자동으로 번역:

```bash
# 1. 뉴스 크롤링
python scripts/crawl_massive_news.py --days 1 --limit 100

# 2. 제목 번역
python scripts/translate_titles.py --all
```

### 대량 번역 시 주의사항

수만 개를 한 번에 번역할 때:

1. **배치 크기 조정**: `--batch-size 30~50` 권장
2. **중간 저장 확인**: 로그로 진행 상황 모니터링
3. **API 비용 확인**: OpenAI 대시보드에서 사용량 체크

## 참고

- 관련 문서: [NEWS_CRAWLING_GUIDE.md](./NEWS_CRAWLING_GUIDE.md)
- 번역 프롬프트: [prompt.txt](../prompt.txt)
- 스크립트 위치: [scripts/translate_titles.py](../scripts/translate_titles.py)
- 마이그레이션: [migrations/add_kr_title_column.sql](../migrations/add_kr_title_column.sql)
