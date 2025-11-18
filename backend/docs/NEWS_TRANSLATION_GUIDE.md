# 뉴스 번역 시스템 가이드

## 📋 개요

Claude Sonnet API를 사용하여 영문 뉴스 기사를 전문적인 한글로 번역하고 Supabase `news_articles` 테이블의 `kr_translate` 컬럼에 저장합니다.

### 특징
- **고품질 번역**: Claude Sonnet 4.5 모델 사용
- **자동화**: 배치 처리로 대량 뉴스 자동 번역
- **전문 용어**: 금융 용어를 정확하게 한글로 번역
- **형식 유지**: 제목, 소제목, 본문 구조 보존
- **빠른 처리**: 배치 크기 조정으로 처리 속도 최적화

---

## 🚀 시작하기

### 1. 환경 변수 설정

`.env` 파일에 다음을 추가합니다:

```bash
# Claude API (필수)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase (필수)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_api_key

# 기타 (기존 설정)
OPENAI_API_KEY=...
```

**API 키 획득 방법:**
- **Anthropic API Key**: https://console.anthropic.com/
- **Supabase**: 기존 설정 사용

### 2. 번역 프롬프트 파일

프로젝트 루트의 `prompt.txt` 파일이 번역에 사용됩니다.
- 파일이 없으면 기본 프롬프트 사용
- 프롬프트는 금융 뉴스 전문 번역용으로 최적화됨

---

## 📖 사용 방법

### A. API를 통한 번역

#### 1. 단일 뉴스 번역

```bash
curl -X POST http://localhost:8000/api/v2/news-translation/news/123/translate
```

응답:
```json
{
  "status": "success",
  "news_id": 123,
  "message": "뉴스가 성공적으로 번역되었습니다"
}
```

#### 2. 배치 번역

```bash
# 특정 뉴스 ID 목록 번역
curl -X POST "http://localhost:8000/api/v2/news-translation/batch-translate?news_ids=1&news_ids=2&news_ids=3"
```

#### 3. 미번역 뉴스 자동 번역

```bash
# 미번역 뉴스 50개까지 번역
curl -X POST "http://localhost:8000/api/v2/news-translation/translate-untranslated?limit=50&batch_size=3&delay=2.0"
```

**파라미터:**
- `limit`: 최대 처리 개수 (기본: 50)
- `batch_size`: 동시 처리 개수 (기본: 3)
- `delay`: 배치 간 딜레이 초 (기본: 2.0)

#### 4. 번역 통계 조회

```bash
curl http://localhost:8000/api/v2/news-translation/statistics
```

응답:
```json
{
  "status": "success",
  "statistics": {
    "total_news": 150,
    "translated_news": 120,
    "untranslated_news": 30,
    "translation_rate": "80.0%"
  }
}
```

#### 5. 서비스 상태 확인

```bash
curl http://localhost:8000/api/v2/news-translation/health
```

---

### B. 스크립트를 통한 번역

#### 스크립트 실행 기본 문법

```bash
python scripts/translate_all_news.py [옵션]
```

#### 1. 미번역 뉴스만 번역 (권장)

```bash
# 최대 50개
python scripts/translate_all_news.py --untranslated --limit 50

# 최대 100개, 배치 5개씩, 1초 딜레이
python scripts/translate_all_news.py --untranslated --limit 100 --batch-size 5 --delay 1.0
```

#### 2. 특정 종목만 번역

```bash
# AAPL 종목의 모든 뉴스 번역
python scripts/translate_all_news.py --symbol AAPL

# AAPL 종목의 미번역 뉴스만 번역
python scripts/translate_all_news.py --symbol AAPL --untranslated
```

#### 3. 모든 뉴스 번역 (기존 번역 덮어쓰기)

```bash
# ⚠️ 주의: 기존 번역 모두 삭제하고 새로 번역
python scripts/translate_all_news.py --all --limit 200
```

#### 4. 테스트 실행 (DRY RUN)

```bash
# 실제 DB 업데이트 없이 번역만 테스트 (5개)
python scripts/translate_all_news.py --limit 5 --dry-run

# 미번역 뉴스 10개 테스트
python scripts/translate_all_news.py --untranslated --limit 10 --dry-run
```

#### 5. 배치 크기 및 딜레이 조정

```bash
# 작은 배치 (안정적이지만 느림)
python scripts/translate_all_news.py --untranslated --batch-size 2 --delay 3.0

# 큰 배치 (빠르지만 API 제한 주의)
python scripts/translate_all_news.py --untranslated --batch-size 5 --delay 0.5
```

---

## 📊 번역 결과 확인

### Supabase 대시보드에서 확인

```sql
-- 번역된 뉴스 확인
SELECT id, title, kr_translate, updated_at
FROM news_articles
WHERE kr_translate IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 미번역 뉴스 개수
SELECT COUNT(*) as untranslated_count
FROM news_articles
WHERE kr_translate IS NULL;

-- 번역 통계
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN kr_translate IS NOT NULL THEN 1 ELSE 0 END) as translated,
  SUM(CASE WHEN kr_translate IS NULL THEN 1 ELSE 0 END) as untranslated
FROM news_articles;
```

### Python에서 확인

```python
from app.db.supabase_client import get_supabase

supabase = get_supabase()

# 최근 번역된 뉴스
result = supabase.table("news_articles")\
    .select("id, title, kr_translate, updated_at")\
    .not_.is_("kr_translate", "null")\
    .order("updated_at", desc=True)\
    .limit(5)\
    .execute()

for news in result.data:
    print(f"ID: {news['id']}")
    print(f"Title: {news['title']}")
    print(f"Translation: {news['kr_translate'][:100]}...")
    print()
```

---

## ⚙️ 고급 설정

### 배치 크기 및 딜레이 최적화

| 상황 | 배치 크기 | 딜레이 | 설명 |
|------|---------|--------|------|
| **API 제한 걱정** | 2-3 | 2.0-3.0 | 안정적이지만 느림 (권장) |
| **일반 사용** | 3-4 | 1.5-2.0 | 균형잡힌 설정 |
| **빠른 처리** | 5-10 | 0.5-1.0 | 빠르지만 API 제한 주의 |
| **테스트** | 1-2 | 1.0 | 문제 디버깅용 |

### 처리 시간 예상

- **1개 뉴스**: ~3-5초 (첫 API 호출 포함)
- **50개 뉴스**: ~3-5분 (배치 3, 딜레이 2.0)
- **100개 뉴스**: ~6-10분 (배치 3, 딜레이 2.0)
- **1000개 뉴스**: ~1-2시간 (배치 3, 딜레이 2.0)

### API 비용

Claude Sonnet 4.5 가격:
- **Input**: $3/M tokens
- **Output**: $15/M tokens

뉴스당 예상 비용:
- 평균 기사 (500-1000 words): ~$0.03-0.10
- 긴 기사 (1000+ words): ~$0.10-0.20

---

## 🛠️ 문제 해결

### 1. "ANTHROPIC_API_KEY가 설정되지 않음" 오류

**해결책:**
```bash
# .env 파일 확인
cat .env | grep ANTHROPIC_API_KEY

# API 키 설정
export ANTHROPIC_API_KEY=your_key_here

# 또는 .env 파일에 추가
echo "ANTHROPIC_API_KEY=your_key_here" >> .env
```

### 2. "처리할 뉴스가 없습니다" 메시지

**원인**: 번역할 뉴스가 없거나 필터 조건이 맞지 않음

**해결책:**
```bash
# 전체 뉴스 개수 확인
curl http://localhost:8000/api/v2/news-translation/statistics

# 미번역 뉴스 확인 (limit 없이)
python scripts/translate_all_news.py --untranslated

# 특정 종목만 확인
python scripts/translate_all_news.py --symbol AAPL
```

### 3. "API 타임아웃" 오류

**원인**: API 응답이 너무 오래 걸림

**해결책:**
```bash
# 배치 크기 줄이기
python scripts/translate_all_news.py --untranslated --batch-size 1 --limit 5

# 딜레이 늘리기
python scripts/translate_all_news.py --untranslated --delay 5.0
```

### 4. "Supabase 연결 오류"

**해결책:**
```bash
# Supabase 키 확인
echo $SUPABASE_URL
echo $SUPABASE_KEY

# API 테스트
curl http://localhost:8000/health/detailed
```

### 5. 번역 품질이 좋지 않음

**확인사항:**
- `prompt.txt` 파일이 최신인지 확인
- 기사 본문(body)이 완전한지 확인
- API 키가 유효한지 확인

**개선방법:**
```bash
# 테스트 실행으로 품질 확인
python scripts/translate_all_news.py --limit 3 --dry-run

# Supabase에서 번역 확인
SELECT id, title, tr_translate
FROM news_articles
WHERE tr_translate IS NOT NULL
LIMIT 3;
```

---

## 📈 모니터링

### 번역 진행 상황 실시간 확인

**터미널에서:**
```bash
# 진행 중인 작업 모니터링
while true; do
  curl http://localhost:8000/api/v2/news-translation/statistics
  sleep 30
done
```

**로그 확인:**
```bash
# FastAPI 백엔드 로그 (터미널 1)
uvicorn app.main:app --reload

# 번역 스크립트 로그 (터미널 2)
python scripts/translate_all_news.py --untranslated --limit 100 2>&1 | tee translation.log
```

---

## 🎓 Best Practices

### 1. 처음 시작할 때

```bash
# Step 1: 작은 테스트 (3개, DRY RUN)
python scripts/translate_all_news.py --limit 3 --dry-run

# Step 2: 실제 번역 (5개)
python scripts/translate_all_news.py --limit 5

# Step 3: 결과 확인
curl http://localhost:8000/api/v2/news-translation/statistics

# Step 4: 미번역 뉴스 확대 처리
python scripts/translate_all_news.py --untranslated --limit 50
```

### 2. 정기적인 번역

```bash
# 매일 새로운 뉴스만 번역 (cron job)
0 1 * * * cd /path/to/backend && python scripts/translate_all_news.py --untranslated --limit 100
```

### 3. 대량 번역 (비용 효율적)

```bash
# 1. 미번역 뉴스 확인
python scripts/translate_all_news.py --untranslated --limit 500 --dry-run

# 2. 큰 배치로 처리
python scripts/translate_all_news.py --untranslated --limit 500 --batch-size 5 --delay 1.0
```

### 4. 특정 작업 재처리

```bash
# 미번역 뉴스만 다시 시도
# (DB에서 kr_translate이 NULL인 것들)
python scripts/translate_all_news.py --untranslated --limit 20
```

---

## 🔄 데이터 흐름

```
영문 기사 (body)
    ↓
Claude Sonnet API
    ↓
한글 번역 (kr_translate)
    ↓
Supabase 저장
    ↓
updated_at 자동 갱신
```

---

## 📚 API 문서

### 엔드포인트 목록

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/v2/news-translation/news/{id}/translate` | 단일 뉴스 번역 |
| POST | `/api/v2/news-translation/batch-translate` | 배치 번역 |
| POST | `/api/v2/news-translation/translate-untranslated` | 미번역 자동 번역 |
| GET | `/api/v2/news-translation/statistics` | 번역 통계 |
| GET | `/api/v2/news-translation/health` | 서비스 상태 |

### 요청/응답 예시

#### POST /batch-translate

**요청:**
```bash
curl -X POST "http://localhost:8000/api/v2/news-translation/batch-translate?news_ids=1&news_ids=2&news_ids=3&batch_size=3&delay=2.0"
```

**응답:**
```json
{
  "status": "success",
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "success_rate": "100.0%"
  },
  "errors": []
}
```

---

## 버전 정보

- **버전**: 1.0.0
- **마지막 업데이트**: 2025-11-11
- **Claude 모델**: claude-sonnet-4-5-20250929
- **프레임워크**: FastAPI + Python 3.9+

---

## 📞 지원

문제 발생 시:
1. **로그 확인**: 터미널 출력 확인
2. **환경 변수 확인**: ANTHROPIC_API_KEY, SUPABASE_URL 설정 확인
3. **API 키 유효성 확인**: https://console.anthropic.com/
4. **문제 해결 섹션 참조**: 위의 "문제 해결" 참조

---

**상태**: ✅ Production Ready
**작성자**: AI Finance Team
