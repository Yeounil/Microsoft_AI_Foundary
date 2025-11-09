# Pinecone Vector DB 설정 가이드

## 📋 목차
1. [Pinecone 계정 생성](#1-pinecone-계정-생성)
2. [API 키 획득](#2-api-키-획득)
3. [인덱스 생성](#3-인덱스-생성)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [연결 테스트](#5-연결-테스트)
6. [트러블슈팅](#6-트러블슈팅)

---

## 1. Pinecone 계정 생성

### Step 1: 웹사이트 접속
```
https://www.pinecone.io/
```

### Step 2: 회원가입
1. **Sign Up** 버튼 클릭
2. 다음 중 하나 선택:
   - 이메일 입력 후 비밀번호 설정
   - Google 계정으로 로그인
   - GitHub 계정으로 로그인

### Step 3: 플랜 선택
- **Starter (무료)** 선택 (추천)
  - 1개 Project 포함
  - 1개 Index 생성 가능
  - 1GB 스토리지
  - API 호출 제한 없음
  - 개발/테스트에 최적

---

## 2. API 키 획득

### Step 1: 콘솔 접속
1. Pinecone 웹사이트에서 로그인
2. **Console** 또는 **Dashboard** 클릭

### Step 2: API 키 찾기
1. 좌측 메뉴에서 **API Keys** 클릭
2. 기본 키가 표시됨 (보통 "default-key")
3. 복사 아이콘 클릭하여 API 키 복사

### Step 3: 키 형식 확인
```
API 키 형식: pcsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx...

예시:
PINECONE_API_KEY=pcsk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

---

## 3. 인덱스 생성

### Step 1: 인덱스 생성 페이지 접속
1. 콘솔에서 **Indexes** 탭 클릭
2. **Create Index** 버튼 클릭

### Step 2: 인덱스 설정
```
┌─────────────────────────────────────────┐
│ Create Index 설정                       │
├─────────────────────────────────────────┤
│ Name:                                   │
│ ├─ financial-embeddings ⭐ (권장)      │
│                                         │
│ Dimension:                              │
│ ├─ 1536 ⭐ (OpenAI ada-002)           │
│                                         │
│ Metric:                                 │
│ ├─ cosine ⭐ (텍스트 유사도)          │
│ ├─ euclidean (거리 기반)               │
│ └─ dotproduct (내적)                   │
│                                         │
│ Environment:                            │
│ └─ us-east-1 (지역 선택)              │
└─────────────────────────────────────────┘
```

### Step 3: 인덱스 생성 완료
- "Create Index" 버튼 클릭
- 생성 완료 대기 (약 1-2분)
- 상태가 "Ready"가 되면 사용 가능

---

## 4. 환경 변수 설정

### Step 1: .env 파일 수정

```bash
# 파일 위치: /backend/.env

# 기존 내용 (유지)
SUPABASE_URL=...
SUPABASE_KEY=...
OPENAI_API_KEY=...
# ... 나머지 설정들

# 추가할 내용 (새로 추가)
# Pinecone Vector DB
PINECONE_API_KEY=pcsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx...
```

### Step 2: API 키 교체
```bash
# AS-IS (예시)
PINECONE_API_KEY=your_pinecone_api_key_here

# TO-BE (실제 키로 변경)
PINECONE_API_KEY=pcsk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

### Step 3: 파일 저장
```bash
# VS Code에서:
Ctrl + S (Windows) / Cmd + S (Mac)

# 또는 명령줄에서:
git add .env
# (주의: .env는 .gitignore에 포함되어야 함)
```

---

## 5. 연결 테스트

### Step 1: 필요한 패키지 설치
```bash
cd /backend

# Pinecone 라이브러리 설치
pip install pinecone-client

# 또는 requirements.txt에 추가
echo "pinecone-client>=3.0.0" >> requirements.txt
pip install -r requirements.txt
```

### Step 2: 연결 테스트 스크립트 실행
```bash
# 전체 임베딩 테스트 실행
python embedding_test.py

# 또는 간단한 연결 테스트
python -c "
import sys
sys.path.insert(0, r'E:\Microsoft_AI_Foundary\backend')

from app.services.pinecone_service import PineconeService
import asyncio

async def test():
    service = PineconeService()
    stats = await service.get_index_stats()
    print('Pinecone 연결 상태:')
    print(stats)

asyncio.run(test())
"
```

### Step 3: 예상 출력
```bash
# 성공 메시지:
[OK] Connected to Pinecone index: financial-embeddings

Pinecone 연결 상태:
{
    'status': 'success',
    'index_name': 'financial-embeddings',
    'total_vectors': 0,
    'dimension': 1536,
    'timestamp': '2025-11-08T10:30:45.123456'
}

# 또는 실패 메시지:
[ERROR] Failed to connect to Pinecone index: ...
[WARN] Pinecone API key not configured
```

---

## 6. 트러블슈팅

### 문제 1: "API key not configured"
```
❌ 증상:
[WARN] Pinecone API key not configured

✅ 해결책:
1. .env 파일 확인
   - PINECONE_API_KEY=... 라인 있는지 확인
   - 앞뒤 공백 제거: "pcsk_..." (공백 없음)

2. .env 파일 위치 확인
   - 올바른 위치: /backend/.env
   - config.py에서 읽는지 확인

3. Python 재시작
   - IDE 재시작 (VS Code 등)
   - Python 인터프리터 재실행
```

### 문제 2: "Failed to connect to Pinecone index"
```
❌ 증상:
[ERROR] Failed to connect to Pinecone index: ...

✅ 해결책:
1. API 키 확인
   - 키가 정확한지 다시 확인
   - 복사 시 앞뒤 공백 제거

2. 인덱스 이름 확인
   - 인덱스명: financial-embeddings
   - Pinecone 콘솔에서 인덱스가 "Ready" 상태인지 확인

3. 네트워크 확인
   - 인터넷 연결 확인
   - 방화벽 설정 확인

4. API 할당량 확인
   - Pinecone 콘솔 → Usage에서 API 호출 통계 확인
   - Rate limit 초과 여부 확인
```

### 문제 3: "Dimension mismatch"
```
❌ 증상:
ValueError: Expected dimension 1536, got 384

✅ 해결책:
1. OpenAI Embedding 모델 확인
   - ada-002 사용 확인 (1536차원)
   - text-embedding-3-small (384차원) 사용 중인지 확인

2. 인덱스 다시 생성
   - Pinecone에서 인덱스 삭제
   - 차원을 1536으로 설정하여 재생성
```

### 문제 4: "Connection timeout"
```
❌ 증상:
TimeoutError: Request timed out

✅ 해결책:
1. 네트워크 확인
   - 인터넷 속도 확인
   - VPN 사용 시 끄고 테스트

2. Timeout 값 증가
   - 코드에서 timeout 매개변수 조정
   - pinecone_service.py에서 timeout 설정 확인

3. 지역 선택 변경
   - Pinecone 콘솔에서 가장 가까운 지역 선택
   - us-east-1 → 서울(ap-northeast-2) 등
```

---

## API 사용 예시

### 단일 종목 임베딩
```bash
curl -X POST "http://localhost:8000/api/v2/embeddings/stock/AAPL/embed" \
  -H "Content-Type: application/json"
```

### 배치 임베딩
```bash
curl -X POST "http://localhost:8000/api/v2/embeddings/stocks/embed-batch?symbols=AAPL&symbols=MSFT&symbols=GOOGL" \
  -H "Content-Type: application/json"
```

### 인덱스 통계
```bash
curl -X GET "http://localhost:8000/api/v2/embeddings/index/stats" \
  -H "Content-Type: application/json"
```

---

## 보안 주의사항

### ⚠️ API 키 보호
```bash
# ❌ 하면 안되는 것
- API 키를 GitHub에 커밋
- API 키를 프론트엔드에 노출
- API 키를 로그에 출력

# ✅ 해야 할 것
- .env 파일은 .gitignore에 추가
- 환경 변수로만 관리
- 정기적으로 키 교체
```

### .gitignore 설정
```bash
# /backend/.gitignore

# 환경 변수
.env
.env.local
.env.*.local

# Python
__pycache__/
*.py[cod]
*$py.class
```

---

## 성능 최적화

### 배치 처리
```python
# 50개 종목을 한 번에 임베딩 (권장)
POST /api/v2/embeddings/stocks/embed-batch?symbols=AAPL,MSFT,GOOGL,...

# 처리 시간: ~2-3분 (50개 종목)
# API 호출: 총 50회 (병렬 처리)
```

### 메타데이터 필터링
```python
# symbol별로 검색
filter={"symbol": {"$eq": "AAPL"}}

# 섹터별 검색
filter={"sector": {"$eq": "Technology"}}

# 날짜 범위 검색
filter={"timestamp": {"$gte": "2025-11-01", "$lte": "2025-11-08"}}
```

---

## 참고 자료

- [Pinecone 공식 문서](https://docs.pinecone.io/)
- [Pinecone Python 클라이언트](https://github.com/pinecone-io/pinecone-python)
- [벡터 DB 비교](https://www.vectordatabase.com/)

---

**마지막 업데이트**: 2025-11-08
