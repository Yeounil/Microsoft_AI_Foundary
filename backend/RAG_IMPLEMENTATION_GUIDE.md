# RAG (Retrieval Augmented Generation) 구현 가이드

## 개요

이 문서는 Vector DB(Pinecone)를 활용하여 GPT-5에 실시간 금융 데이터를 제공하는 RAG 시스템의 구현 방법을 설명합니다.

---

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                      사용자 쿼리                             │
│                  "AI 기업의 성장 전망은?"                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                    Step 1: 임베딩
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   OpenAI Embedding API                      │
│        쿼리 → 1536차원 벡터로 변환                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                   Step 2: 검색
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pinecone Vector DB                       │
│     쿼리 벡터 ↔ 저장된 금융 데이터 벡터 비교               │
│      (코사인 유사도 계산)                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
              Step 3: 검색 결과 수집
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              유사한 기업 정보 (상위 5개)                    │
│   - NVDA, MSFT, GOOGL, META, AMZN                          │
│   (각각의 메타데이터 포함)                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
           Step 4: 컨텍스트 구성 & 강화
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              검색 결과 + 추가 재무 지표                     │
│  - 현재가, 시가총액, P/E비율, ROE, 순이익률 등             │
│  - Supabase에서 조회한 상세 정보                           │
└────────────────────────┬────────────────────────────────────┘
                         │
         Step 5: 프롬프트 구성 및 GPT-5 호출
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      GPT-5 API                              │
│  [시스템 프롬프트] + [검색 데이터] + [사용자 질문]          │
│              → 지능형 금융 분석 답변                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                    Step 6: 응답
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          GPT-5 기반 금융 분석 결과                          │
│  "AI 기업들의 성장 가능성은 매우 높습니다.               │
│   NVDA는 GPU 수요 증가로... MSFT는 클라우드 서비스...      │
│   따라서 현재 시점에 투자 가치가 있습니다."               │
└─────────────────────────────────────────────────────────────┘
```

---

## 핵심 구성 요소

### 1. RAGService (`app/services/rag_service.py`)

Vector DB와 GPT-5를 연결하는 메인 서비스입니다.

**주요 메서드:**

#### `search_similar_stocks(query, top_k, filters)`
- 사용자 쿼리를 임베딩으로 변환
- Pinecone에서 유사한 주식 검색
- 검색 결과에 추가 정보 추가

**Example:**
```python
rag = RAGService()
result = await rag.search_similar_stocks(
    query="AI 기업",
    top_k=5
)
# 결과: {"status": "success", "results": [...]}
```

#### `generate_rag_context(query, top_k)`
- 검색된 데이터를 GPT-5에 전달할 형식으로 컨텍스트 생성
- 자동 텍스트 포맷팅

**Example:**
```python
context_result = await rag.generate_rag_context(
    query="현재 기술주의 투자 가치는?",
    top_k=5
)
# 결과: 포맷된 텍스트 컨텍스트
```

#### `query_with_rag(query, system_prompt, top_k)`
- **가장 권장되는 메서드**
- Vector DB 검색 → 컨텍스트 생성 → GPT-5 호출 (자동 처리)

**Example:**
```python
result = await rag.query_with_rag(
    query="AAPL과 유사한 기업들의 향후 성장 전망은?",
    top_k=5
)
# 결과: {"status": "success", "response": "...", "source_symbols": [...]}
```

#### `compare_stocks(symbol_1, symbol_2, analysis_type)`
- 두 종목의 상세 비교 분석

**Example:**
```python
result = await rag.compare_stocks(
    symbol_1="AAPL",
    symbol_2="MSFT",
    analysis_type="comprehensive"
)
```

---

### 2. RAG API 엔드포인트 (`app/api/rag.py`)

FastAPI 라우터로 구현된 REST API입니다.

#### 엔드포인트 목록

##### `POST /api/v2/rag/search/similar-stocks`
유사한 주식 검색

**Request:**
```
POST /api/v2/rag/search/similar-stocks?query=AI+기업&top_k=5
```

**Response:**
```json
{
    "status": "success",
    "query": "AI 기업",
    "total_results": 5,
    "results": [
        {
            "symbol": "NVDA",
            "company_name": "NVIDIA",
            "similarity_score": 0.8534,
            "sector": "Technology",
            "current_price": 875.20,
            "market_cap": 2150000000000,
            "pe_ratio": 45.2,
            "roe": 48.5,
            "profit_margin": 45.2
        },
        ...
    ]
}
```

##### `POST /api/v2/rag/context/generate`
RAG용 컨텍스트 생성

**Request:**
```
POST /api/v2/rag/context/generate?query=기술주+동향&top_k=5
```

**Response:**
```json
{
    "status": "success",
    "query": "기술주 동향",
    "context": "================================================================================\n검색된 유사 기업 정보\n\n#1 NVDA - NVIDIA\n   유사도: 89.4%\n   ...",
    "source_data": [...],
    "total_results": 5
}
```

##### `POST /api/v2/rag/query` (권장)
RAG를 활용한 GPT-5 쿼리

**Request:**
```
POST /api/v2/rag/query?query=AAPL과+유사한+기업들의+향후+성장+전망은?&top_k=5
```

**Response:**
```json
{
    "status": "success",
    "query": "AAPL과 유사한 기업들의 향후 성장 전망은?",
    "response": "AAPL과 유사한 기업들(MSFT, NVDA, GOOGL, META)의 분석:\n\n공통점:\n1. 모두 높은 마진율의 기술 기업\n2. AI/클라우드 분야에 적극 투자\n...",
    "source_data_count": 5,
    "source_symbols": ["MSFT", "NVDA", "GOOGL", "META", "AMZN"],
    "timestamp": "2025-11-09T00:15:30.123456"
}
```

##### `GET /api/v2/rag/compare/{symbol_1}/vs/{symbol_2}`
두 종목 비교 분석

**Request:**
```
GET /api/v2/rag/compare/AAPL/vs/MSFT?analysis_type=comprehensive
```

**Response:**
```json
{
    "status": "success",
    "symbol_1": "AAPL",
    "symbol_2": "MSFT",
    "analysis_type": "comprehensive",
    "comparison": "AAPL과 MSFT의 비교 분석:\n\n1. 비즈니스 모델:\n   - Apple: 하드웨어 + 서비스 (iOS 생태계)\n   - Microsoft: 소프트웨어 + 클라우드 (엔터프라이즈)\n...",
    "timestamp": "2025-11-09T00:15:30.123456"
}
```

##### `GET /api/v2/rag/health`
RAG 서비스 상태 확인

---

## 데이터 흐름 상세 설명

### 1. 쿼리 임베딩 생성

```python
# 사용자 질문을 벡터로 변환
query = "높은 배당금을 지급하는 기업"
embedding = await openai_service.generate_embedding(query)
# embedding: [0.0234, -0.0156, 0.0891, ..., 0.0123]  (1536차원)
```

### 2. Pinecone 벡터 검색

```python
# 쿼리 임베딩과 저장된 벡터 간 유사도 계산
similar_stocks = await pinecone_service.query_similar_stocks(
    query_embedding=embedding,
    top_k=5
)
# 결과: 코사인 유사도 기반 상위 5개 기업 반환
```

### 3. 데이터 강화

```python
# Pinecone의 메타데이터 + Supabase의 추가 정보 결합
enriched = [
    {
        "symbol": "JNJ",
        "company_name": "Johnson & Johnson",
        "similarity_score": 0.89,
        "current_price": 159.82,
        "market_cap": 425000000000,
        "pe_ratio": 25.3,
        "dividend_yield": 2.8,  # Supabase에서 조회
        "roe": 35.2,           # Supabase에서 조회
        ...
    },
    ...
]
```

### 4. 컨텍스트 구성

```
================================================================================
검색된 유사 기업 정보
================================================================================

사용자 쿼리: 높은 배당금을 지급하는 기업

검색 날짜: 2025년 11월 09일 00:15:30

================================================================================

[검색 결과]

#1 JNJ - Johnson & Johnson
   유사도: 89.2%
   산업: Healthcare / Pharmaceuticals

   [가격 정보]
   - 현재 가격: $159.82
   - 시가총액: $425,000,000,000

   [밸류에이션]
   - P/E 비율: 25.30x
   - EPS: $6.32

   [수익성]
   - ROE: 35.20%
   - 순이익률: 28.50%

   [재무 안정성]
   - 부채비율(D/E): 0.45
   ...
```

### 5. GPT-5 호출

```python
messages = [
    {
        "role": "system",
        "content": "당신은 전문적인 금융 분석가입니다..."
    },
    {
        "role": "user",
        "content": "[위의 컨텍스트]\n\n높은 배당금을 지급하는 기업들의 특징은?"
    }
]

response = await openai_service.async_chat_completion(
    messages=messages,
    temperature=0.7,
    max_tokens=2000
)
```

### 6. 최종 응답

```
높은 배당금을 지급하는 기업들(JNJ, KO, PG)의 분석:

공통점:
1. 매우 안정적인 현금 흐름
   - 모두 50년 이상 배당금을 증가시킨 "Dividend Aristocrats"

2. 강력한 시장 지위
   - JNJ: 의약품 분야의 글로벌 리더
   - KO: 음료 산업의 절대 강자
   - PG: 소비재 분야의 독점적 지위

3. 높은 수익률과 낮은 변동성
   - 평균 P/E 비율: 25~30배 (시장 평균보다 낮음)
   - ROE: 30~40% (매우 높은 수익성)

특징:
- 배당 수익률: 2.5~3.5% (현 시점 양호)
- 부채비율: 낮음 (0.4~0.6) → 안전한 구조
- 순이익률: 25~35% → 강한 수익성

결론:
이러한 기업들은 장기 자산형 투자자에게 매우 적합합니다.
특히 인플레이션 시기에 가격 인상 능력으로 실질 수익을 보호합니다.
```

---

## 실제 사용 예제

### 예제 1: 특정 산업의 유망 기업 찾기

```python
import asyncio
from app.services.rag_service import RAGService

async def find_promising_tech_companies():
    rag = RAGService()

    result = await rag.query_with_rag(
        query="현재 기술 산업에서 가장 유망한 기업들은 어떤 특징을 가지고 있나?",
        top_k=5
    )

    if result["status"] == "success":
        print("GPT-5 분석:")
        print(result["response"])
        print(f"\n참조 기업: {', '.join(result['source_symbols'])}")

asyncio.run(find_promising_tech_companies())
```

### 예제 2: 두 기업 비교 분석

```python
async def compare_big_techs():
    rag = RAGService()

    result = await rag.compare_stocks(
        symbol_1="AAPL",
        symbol_2="GOOGL",
        analysis_type="valuation"
    )

    if result["status"] == "success":
        print("비교 분석:")
        print(result["comparison"])

asyncio.run(compare_big_techs())
```

### 예제 3: API를 통한 사용

```bash
# 1. 유사 주식 검색
curl -X POST "http://localhost:8000/api/v2/rag/search/similar-stocks?query=AI+기업&top_k=5"

# 2. RAG 쿼리 (권장)
curl -X POST "http://localhost:8000/api/v2/rag/query?query=AAPL과+유사한+기업들의+투자+가치는?"

# 3. 종목 비교
curl -X GET "http://localhost:8000/api/v2/rag/compare/AAPL/vs/MSFT?analysis_type=comprehensive"

# 4. 상태 확인
curl -X GET "http://localhost:8000/api/v2/rag/health"
```

---

## 성능 최적화

### 1. 벡터 검색 최적화

- **상위 K개 결정**: 정확도 vs 속도 트레이드오프
  - 금융 분석: top_k=5~10 권장
  - 빠른 응답: top_k=3
  - 정확한 분석: top_k=10~15

- **필터링 활용**:
```python
# 산업 필터 적용
result = await rag.search_similar_stocks(
    query="기술주",
    top_k=5,
    filters={"sector": "Technology"}
)
```

### 2. GPT-5 호출 최적화

```python
# 토큰 수 제한으로 비용 절감
response = await openai_service.async_chat_completion(
    messages=messages,
    max_tokens=1000,  # 기본값: 2000 → 절감
    temperature=0.7
)
```

### 3. 캐싱 전략

```python
# 자주 검색되는 쿼리 캐싱 (향후 구현)
cached_results = {
    "AI 기업": {...},  # 이전 검색 결과
}
```

---

## 문제 해결

### 1. 검색 결과가 너무 적거나 없음

```python
# top_k 증가
result = await rag.search_similar_stocks(query, top_k=10)

# 필터 제거
result = await rag.search_similar_stocks(query, filters=None)
```

### 2. GPT-5 응답이 부정확함

```python
# 시스템 프롬프트 개선
custom_prompt = """당신은 30년 경력의 금융 분석가입니다.
다음 데이터를 바탕으로 객관적이고 정확한 분석을 제공합니다.
추측이나 예측은 명확히 표시합니다."""

result = await rag.query_with_rag(query, system_prompt=custom_prompt)
```

### 3. 토큰 비용이 높음

```python
# 더 짧은 컨텍스트 사용
result = await rag.search_similar_stocks(query, top_k=3)

# temperature 낮추기 (더 일관된 응답)
response = await openai_service.async_chat_completion(
    messages=messages,
    temperature=0.5
)
```

---

## 테스트 방법

### 테스트 스크립트 실행

```bash
python rag_integration_test.py
```

**테스트 항목:**
1. 유사 주식 검색
2. RAG 컨텍스트 생성
3. GPT-5 쿼리 (실제 API 호출)
4. 종목 비교 분석
5. 전체 벡터 검색 플로우

---

## 다음 단계

### 1. 프로덕션 배포 체크리스트

- [ ] Pinecone 인덱스 성능 모니터링
- [ ] GPT-5 API 비용 추적 및 최적화
- [ ] 오류 핸들링 및 재시도 로직
- [ ] 속도 및 응답 시간 모니터링

### 2. 향상된 기능

- [ ] 쿼리 결과 캐싱
- [ ] 배치 처리 (여러 쿼리 동시 처리)
- [ ] 사용자별 커스텀 프롬프트
- [ ] 실시간 데이터 업데이트

### 3. 분석 고도화

- [ ] 포트폴리오 최적화 추천
- [ ] 리스크 분석
- [ ] 섹터별 성장률 비교
- [ ] 장기 트렌드 분석

---

## 참고 자료

- [Pinecone 문서](https://docs.pinecone.io/)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [RAG 개념 설명](https://python.langchain.com/docs/use_cases/question_answering/)
- [Supabase 문서](https://supabase.com/docs)
