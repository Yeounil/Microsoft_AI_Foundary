# 뉴스 AI Score 평가 시스템 가이드

## 📊 개요

GPT-5를 활용하여 뉴스가 주가에 미치는 영향을 자동으로 평가하는 시스템입니다.

### 두 가지 점수 체계

1. **AI Score (ai_score)**: 주가에 미치는 **영향의 크기** (0.0 ~ 1.0)
2. **Positive Score (positive_score)**: 주가에 미치는 **영향의 방향** (0.0 ~ 1.0)

---

## 🎯 점수 평가 기준

### AI Score (영향의 크기)

| 범위 | 의미 | 예시 |
|------|------|------|
| 0.8~1.0 | 매우 큰 영향 | CEO 교체, 대형 스캔들, 시장 충격 |
| 0.6~0.8 | 큰 영향 | 대규모 M&A, 규제 변화 |
| 0.4~0.6 | 중간 영향 | 분기 실적, 제품 출시 |
| 0.2~0.4 | 약간의 영향 | 작은 계약, 인사 변경 |
| 0.0~0.2 | 영향 거의 없음 | 일반 뉴스, 루틴 발표 |

### Positive Score (영향의 방향)

| 범위 | 의미 | 설명 |
|------|------|------|
| 0.8~1.0 | 매우 긍정적 📈 | 주가 급등 가능성 |
| 0.6~0.8 | 긍정적 📈 | 주가 상승 예상 |
| **0.4~0.6** | **중립/보통 ➡️** | **방향성 불확실** |
| 0.2~0.4 | 부정적 📉 | 주가 하락 예상 |
| 0.0~0.2 | 매우 부정적 📉 | 주가 급락 가능성 |

---

## 📝 평가 예시

### 예시 1: 긍정적 뉴스
```
제목: "Apple announces groundbreaking AI chip"

AI Score: 0.75 (큰 영향)
Positive Score: 0.85 (매우 긍정적)
Impact Direction: positive
```

### 예시 2: 부정적 뉴스
```
제목: "Tesla faces massive recall over safety concerns"

AI Score: 0.70 (큰 영향)
Positive Score: 0.25 (부정적)
Impact Direction: negative
```

### 예시 3: 중립적 뉴스
```
제목: "Microsoft announces quarterly earnings in line with expectations"

AI Score: 0.50 (중간 영향)
Positive Score: 0.50 (중립)
Impact Direction: neutral
```

---

## 🚀 사용 방법

### 1. 스크립트로 전체 재평가

```bash
# 1. 테스트 실행 (10개, DB 업데이트 안함)
python scripts/re_evaluate_all_news.py --limit 10 --dry-run

# 2. 미평가 뉴스만 평가
python scripts/re_evaluate_all_news.py --unevaluated --limit 50

# 3. 특정 종목만 재평가
python scripts/re_evaluate_all_news.py --symbol AAPL

# 4. 모든 뉴스 재평가 (주의!)
python scripts/re_evaluate_all_news.py --all --limit 100
```

### 2. API로 평가

```bash
# 서버 시작
uvicorn app.main:app --reload

# 특정 뉴스 평가
curl -X POST http://localhost:8000/api/v2/news-ai-score/news/123/evaluate-score

# 미평가 뉴스 자동 평가
curl -X POST "http://localhost:8000/api/v2/news-ai-score/news/evaluate-unevaluated?limit=50"

# 통계 조회
curl http://localhost:8000/api/v2/news-ai-score/statistics
```

---

## 📊 데이터베이스 스키마

### news_articles 테이블

```sql
-- 기존 컬럼
id: integer (PK)
title: varchar
description: text
body: text
symbol: varchar
published_at: timestamp

-- AI 평가 컬럼
ai_score: double precision         -- 영향의 크기 (0.0 ~ 1.0)
positive_score: double precision   -- 영향의 방향 (0.0 ~ 1.0)
analyzed_at: timestamp             -- 분석 시간
```

---

## 🔧 기술 스택

- **AI Model**: GPT-5
- **Framework**: FastAPI, Python
- **Database**: Supabase (PostgreSQL)
- **특징**:
  - 할루시네이션 45% 감소
  - 400K 토큰 컨텍스트
  - 향상된 추론 능력

---

## 📈 평가 결과 해석

### 조합 예시

| AI Score | Positive Score | 해석 |
|----------|---------------|------|
| 0.9 | 0.9 | 🔥 **매우 중요한 긍정 뉴스** (즉시 주목) |
| 0.9 | 0.1 | ⚠️ **매우 중요한 부정 뉴스** (위험 경고) |
| 0.8 | 0.5 | ❓ **중요하지만 방향 불확실** (주의 관찰) |
| 0.3 | 0.8 | ✅ **작은 긍정 뉴스** (소폭 상승) |
| 0.3 | 0.2 | 📉 **작은 부정 뉴스** (소폭 하락) |
| 0.1 | 0.5 | 💤 **영향 미미** (무시 가능) |

---

## ⚠️ 주의사항

### 1. API 비용
- GPT-5 사용으로 비용 발생
- 대량 처리 시 비용 증가 주의
- 예상 비용: ~$0.01-0.02 per news

### 2. 처리 시간
- 1개 뉴스: ~2-3초
- 100개 뉴스: ~5-10분 (배치 5개, 딜레이 1초)
- 1000개 뉴스: ~1시간 예상

### 3. 레이트 제한
- OpenAI API 제한 준수
- `--batch-size`와 `--delay`로 조절
- 권장: batch-size=5, delay=1.0

### 4. 데이터 정확성
- GPT-5는 45% 낮은 할루시네이션
- 하지만 100% 정확하지 않음
- 중요 결정 시 사람의 검증 필요

---

## 🔄 스크립트 출력 예시

```bash
$ python scripts/re_evaluate_all_news.py --limit 10 --dry-run

================================================================================
🔄 뉴스 AI Score 재평가 시작
================================================================================
📅 시작 시간: 2025-11-11 15:00:00
🎯 대상: 모든 뉴스
📊 제한: 최대 10개
⚙️  배치 크기: 5개 동시 처리
⏱️  딜레이: 1.0초
================================================================================

📋 [1/3] 대상 뉴스 조회 중...
✅ 10개 뉴스 발견

🚀 [2/3] AI Score 재평가 시작... (총 10개)
================================================================================

📦 배치 1/2 처리 중...
  ✅ [101] Apple announces new iPhone... - AI: 0.650, Pos: 0.750 📈 (positive)
     💡 근거: 신제품 출시로 단기적 매출 증가 예상. 시장의 긍정적 반응이 기대됨
  ✅ [102] Tesla stock drops 5%... - AI: 0.720, Pos: 0.250 📉 (negative)
     💡 근거: 주가 하락은 투자자 신뢰 저하를 나타냄. 단기적으로 부정적 영향 예상
  ✅ [103] Microsoft earnings beat... - AI: 0.550, Pos: 0.650 📈 (positive)
     💡 근거: 실적 호조로 주가 상승 가능성. 클라우드 사업 성장이 주요 요인
  ✅ [104] NVIDIA launches AI chip... - AI: 0.780, Pos: 0.850 📈 (positive)
     💡 근거: 혁신적인 AI 칩 발표로 시장 선점 효과. 매우 긍정적인 영향 예상
  ✅ [105] Amazon faces lawsuit... - AI: 0.480, Pos: 0.350 📉 (negative)
     💡 근거: 법적 리스크 증가로 단기적 주가 압박 예상. 중기적으로는 해결 가능
  📊 진행률: 5/10 (50.0%)

📦 배치 2/2 처리 중...
  ✅ [106] Google announces layoffs... - AI: 0.680, Pos: 0.300 📉 (negative)
     💡 근거: 대규모 구조조정은 단기적으로 부정적. 장기적으론 비용 절감 효과
  ✅ [107] Meta reveals new VR... - AI: 0.600, Pos: 0.700 📈 (positive)
     💡 근거: VR 신제품 공개로 메타버스 전략 강화. 긍정적 시장 반응 예상
  ✅ [108] AMD partners with... - AI: 0.450, Pos: 0.550 ➡️ (neutral)
     💡 근거: 파트너십은 장기적으로 긍정적이나 즉각적 영향은 제한적
  ✅ [109] Intel reports revenue... - AI: 0.520, Pos: 0.500 ➡️ (neutral)
     💡 근거: 매출 보고는 예상치와 부합. 특별한 긍정/부정 요인 없음
  ✅ [110] Qualcomm wins patent... - AI: 0.580, Pos: 0.720 📈 (positive)
     💡 근거: 특허 승소로 경쟁력 강화. 중기적으로 긍정적 영향 예상
  📊 진행률: 10/10 (100.0%)

================================================================================
📊 [3/3] 재평가 완료
================================================================================
✅ 성공: 10개
❌ 실패: 0개
📈 성공률: 100.0%

📅 완료 시간: 2025-11-11 15:05:30
================================================================================
```

---

## 🎓 Best Practices

### 1. 처음 시작할 때
```bash
# Step 1: 소량 테스트
python scripts/re_evaluate_all_news.py --limit 10 --dry-run

# Step 2: 미평가 뉴스부터
python scripts/re_evaluate_all_news.py --unevaluated --limit 100

# Step 3: 점진적으로 확대
python scripts/re_evaluate_all_news.py --unevaluated --limit 500
```

### 2. 정기적인 업데이트
```bash
# 매일 새로운 뉴스만 평가
python scripts/re_evaluate_all_news.py --unevaluated --limit 50
```

### 3. 특정 종목 집중 분석
```bash
# 관심 종목만 재평가
python scripts/re_evaluate_all_news.py --symbol AAPL
python scripts/re_evaluate_all_news.py --symbol TSLA
```

### 4. 대량 재평가 (주의)
```bash
# 전체 재평가 (시간과 비용이 많이 듦)
python scripts/re_evaluate_all_news.py --all --batch-size 3 --delay 2.0
```

---

## 📚 추가 정보

### API 엔드포인트

- `POST /api/v2/news-ai-score/news/{id}/evaluate-score` - 단일 뉴스 평가
- `POST /api/v2/news-ai-score/news/batch-evaluate` - 배치 평가
- `POST /api/v2/news-ai-score/news/evaluate-unevaluated` - 미평가 자동 처리
- `GET /api/v2/news-ai-score/statistics` - 통계 조회
- `GET /api/v2/news-ai-score/health` - 헬스 체크

### 파일 구조

```
backend/
├── app/
│   ├── services/
│   │   ├── openai_service.py           # GPT-5 평가 로직
│   │   └── news_ai_score_service.py    # AI Score 서비스
│   └── api/
│       └── news_ai_score.py            # API 엔드포인트
└── scripts/
    └── re_evaluate_all_news.py         # 재평가 스크립트
```

---

## 💡 FAQ

**Q: ai_score와 positive_score의 차이는?**
A: ai_score는 영향의 '크기', positive_score는 영향의 '방향'입니다.

**Q: 평가가 느린데 어떻게 하나요?**
A: `--batch-size`를 늘리고 `--delay`를 줄이세요. 단, API 제한 주의.

**Q: 평가 결과가 이상한데?**
A: GPT-5도 완벽하지 않습니다. 이상한 결과는 수동으로 확인 필요.

**Q: 비용이 얼마나 나오나요?**
A: 뉴스 1개당 약 $0.01-0.02 예상 (뉴스 길이에 따라 다름)

**Q: 기존 점수를 덮어쓰려면?**
A: `--all` 옵션 사용 (주의: 모든 점수 재평가)

---

**버전**: 2.0.0
**마지막 업데이트**: 2025-11-11
**작성자**: AI Finance Team
