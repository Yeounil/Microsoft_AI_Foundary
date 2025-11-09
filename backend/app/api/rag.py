"""
RAG (Retrieval Augmented Generation) API 엔드포인트
Vector DB의 데이터를 활용하여 GPT-5에 컨텍스트를 제공하는 API
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)
router = APIRouter()

# RAG 서비스 인스턴스
rag_service = RAGService()


@router.post("/search/similar-stocks")
async def search_similar_stocks(
    query: str = Query(..., min_length=1, description="검색 쿼리 (예: 'AI 기업', 'Apple과 유사한 회사')"),
    top_k: int = Query(5, ge=1, le=20, description="반환할 결과 개수"),
    sector: Optional[str] = Query(None, description="필터링할 산업군 (선택사항)")
):
    """
    유사한 주식 검색 (Pinecone 벡터 검색)

    쿼리를 임베딩으로 변환하여 Pinecone에서 유사한 기업을 검색합니다.

    **Example:**
    ```
    GET /api/v2/rag/search/similar-stocks?query=AI+기업&top_k=5
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
                "pe_ratio": 45.2
            },
            ...
        ]
    }
    ```
    """
    try:
        logger.info(f"[API] Search similar stocks: '{query}' (top_k={top_k})")

        # 필터 구성
        filters = {}
        if sector:
            filters["sector"] = sector

        # RAG 서비스 호출
        result = await rag_service.search_similar_stocks(
            query=query,
            top_k=top_k,
            filters=filters if filters else None
        )

        if result.get("status") != "success":
            raise HTTPException(
                status_code=400,
                detail=result.get("reason", "Search failed")
            )

        return result

    except Exception as e:
        logger.error(f"[API] Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/context/generate")
async def generate_rag_context(
    query: str = Query(..., min_length=1, description="사용자 쿼리"),
    top_k: int = Query(5, ge=1, le=20, description="검색할 상위 결과 개수")
):
    """
    RAG용 컨텍스트 생성

    사용자 쿼리에 기반하여 검색된 데이터로 GPT-5에 전달할 컨텍스트를 생성합니다.

    **Example:**
    ```
    POST /api/v2/rag/context/generate?query=최근+AI+기업+동향&top_k=5
    ```

    **Response:**
    ```json
    {
        "status": "success",
        "query": "최근 AI 기업 동향",
        "context": "================================================================================\n검색된 유사 기업 정보\n...",
        "source_data": [...],
        "total_results": 5
    }
    ```
    """
    try:
        logger.info(f"[API] Generate RAG context: '{query}'")

        result = await rag_service.generate_rag_context(
            query=query,
            top_k=top_k
        )

        if result.get("status") != "success":
            raise HTTPException(
                status_code=400,
                detail=result.get("reason", "Context generation failed")
            )

        return result

    except Exception as e:
        logger.error(f"[API] Context generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
async def query_with_rag(
    query: str = Query(..., min_length=1, description="사용자 질문"),
    top_k: int = Query(5, ge=1, le=20, description="검색할 상위 결과 개수"),
    system_prompt: Optional[str] = Query(None, description="커스텀 시스템 프롬프트 (선택사항)")
):
    """
    RAG를 활용한 GPT-5 쿼리 (권장되는 방법)

    Vector DB의 실제 금융 데이터를 기반으로 GPT-5가 답변합니다.

    **Example:**
    ```
    POST /api/v2/rag/query?query=AAPL과+유사한+기업들의+향후+성장+전망은?&top_k=5
    ```

    **Response:**
    ```json
    {
        "status": "success",
        "query": "AAPL과 유사한 기업들의 향후 성장 전망은?",
        "response": "AAPL과 유사한 기업들(MSFT, NVDA, GOOGL)의 분석:\n\n공통점:\n...",
        "source_data_count": 5,
        "source_symbols": ["MSFT", "NVDA", "GOOGL", "META", "AMZN"],
        "timestamp": "2025-11-09T00:15:30.123456"
    }
    ```
    """
    try:
        logger.info(f"[API] RAG query: '{query}' (top_k={top_k})")

        result = await rag_service.query_with_rag(
            query=query,
            system_prompt=system_prompt,
            top_k=top_k
        )

        if result.get("status") != "success":
            raise HTTPException(
                status_code=400,
                detail=result.get("reason", "Query failed")
            )

        return result

    except Exception as e:
        logger.error(f"[API] Query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare/{symbol_1}/vs/{symbol_2}")
async def compare_stocks(
    symbol_1: str,
    symbol_2: str,
    analysis_type: str = Query("comprehensive", description="분석 유형: comprehensive, valuation, profitability")
):
    """
    두 종목 비교 분석

    두 기업의 재무 지표를 비교하여 GPT-5가 분석을 제공합니다.

    **Example:**
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
        "comparison": "AAPL과 MSFT의 비교 분석:\n\n1. 비즈니스 모델:\n...",
        "timestamp": "2025-11-09T00:15:30.123456"
    }
    ```
    """
    try:
        logger.info(f"[API] Compare stocks: {symbol_1} vs {symbol_2} ({analysis_type})")

        # 기호를 대문자로 변환
        symbol_1 = symbol_1.upper()
        symbol_2 = symbol_2.upper()

        result = await rag_service.compare_stocks(
            symbol_1=symbol_1,
            symbol_2=symbol_2,
            analysis_type=analysis_type
        )

        if result.get("status") != "success":
            raise HTTPException(
                status_code=400,
                detail=result.get("reason", "Comparison failed")
            )

        return result

    except Exception as e:
        logger.error(f"[API] Comparison failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    RAG 서비스 상태 확인

    Vector DB와 LLM 연결 상태를 확인합니다.
    """
    try:
        logger.info("[API] Health check requested")

        # Pinecone 상태 확인
        pinecone_status = await rag_service.pinecone_service.get_index_stats()

        health_data = {
            "status": "healthy",
            "timestamp": str(__import__("datetime").datetime.now().isoformat()),
            "services": {
                "rag_service": "operational",
                "openai_service": "operational",
                "pinecone_service": pinecone_status
            }
        }

        return health_data

    except Exception as e:
        logger.error(f"[API] Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
