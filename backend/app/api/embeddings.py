"""
금융 데이터 임베딩 API
주식 정보, 뉴스, 기술 분석을 벡터화하여 Pinecone에 저장 및 검색
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Optional
import logging

from app.services.financial_embedding_service import FinancialEmbeddingService
from app.services.pinecone_service import PineconeService

logger = logging.getLogger(__name__)

router = APIRouter()

# 서비스 인스턴스
embedding_service = FinancialEmbeddingService()
pinecone_service = PineconeService()


@router.post("/stock/{symbol}/embed")
async def embed_stock_indicators(symbol: str):
    """
    단일 종목의 지표를 임베딩하여 Pinecone에 저장

    Args:
        symbol: 종목 코드 (예: AAPL)

    Returns:
        임베딩 결과
    """
    try:
        logger.info(f"[API] Embedding stock indicators for {symbol}")

        result = await embedding_service.embed_stock_indicators(symbol)

        return result

    except Exception as e:
        logger.error(f"[ERROR] Failed to embed stock indicators: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock/{symbol}/embed-comprehensive")
async def embed_stock_comprehensive(
    symbol: str,
    include_news: bool = Query(True, description="뉴스 포함 여부"),
):
    """
    종목의 모든 데이터(지표, 주가 히스토리, 뉴스)를 임베딩

    Args:
        symbol: 종목 코드
        include_news: 뉴스 포함 여부

    Returns:
        종합 임베딩 결과
    """
    try:
        logger.info(f"[API] Comprehensive embedding for {symbol}")

        result = await embedding_service.embed_stock_with_news(
            symbol=symbol,
            include_news=include_news
        )

        return result

    except Exception as e:
        logger.error(f"[ERROR] Failed to embed stock comprehensively: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stocks/embed-batch")
async def embed_batch_stocks(
    symbols: List[str] = Query(..., description="종목 코드 리스트"),
):
    """
    여러 종목을 배치로 임베딩 처리

    Args:
        symbols: 종목 코드 리스트

    Returns:
        배치 처리 결과
    """
    try:
        logger.info(f"[API] Batch embedding for {len(symbols)} symbols")

        if not symbols:
            raise HTTPException(status_code=400, detail="No symbols provided")

        if len(symbols) > 50:
            raise HTTPException(status_code=400, detail="Maximum 50 symbols allowed per request")

        result = await embedding_service.embed_batch_symbols(symbols)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] Failed to batch embed stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock/{symbol}/embed-price-history")
async def embed_price_history(
    symbol: str,
    chunk_size: int = Query(30, description="청크 크기 (일)"),
):
    """
    종목의 주가 히스토리를 청킹하여 임베딩

    Args:
        symbol: 종목 코드
        chunk_size: 청크 크기 (기본값: 30일)

    Returns:
        주가 히스토리 임베딩 결과
    """
    try:
        logger.info(f"[API] Embedding price history for {symbol}")

        result = await embedding_service.embed_price_history(
            symbol=symbol,
            chunk_size=chunk_size
        )

        return result

    except Exception as e:
        logger.error(f"[ERROR] Failed to embed price history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock/{symbol}/embed-news")
async def embed_recent_news(
    symbol: str,
    limit: int = Query(5, description="최근 뉴스 개수"),
):
    """
    종목의 최근 뉴스를 청킹하여 임베딩

    Args:
        symbol: 종목 코드
        limit: 조회할 뉴스 개수

    Returns:
        뉴스 임베딩 결과
    """
    try:
        logger.info(f"[API] Embedding recent news for {symbol}")

        result = await embedding_service.embed_recent_news(
            symbol=symbol,
            limit=limit
        )

        return result

    except Exception as e:
        logger.error(f"[ERROR] Failed to embed news: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/embeddings/{symbol}")
async def delete_embeddings(symbol: str):
    """
    특정 종목의 모든 임베딩 삭제

    Args:
        symbol: 종목 코드

    Returns:
        삭제 결과
    """
    try:
        logger.info(f"[API] Deleting embeddings for {symbol}")

        result = await pinecone_service.delete_by_symbol(symbol)

        return result

    except Exception as e:
        logger.error(f"[ERROR] Failed to delete embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stocks/embed-all-indicators")
async def embed_all_stock_indicators():
    """
    DB의 모든 stock_indicators를 Pinecone에 임베딩

    Returns:
        임베딩 결과
    """
    try:
        logger.info("[API] Embedding all stock indicators")

        # DB에서 모든 종목 조회
        from app.db.supabase_client import get_supabase
        supabase = get_supabase()

        result = supabase.table("stock_indicators").select("symbol").execute()
        symbols = [row.get("symbol") for row in result.data if row.get("symbol")]

        if not symbols:
            raise HTTPException(status_code=404, detail="No stock indicators found in database")

        # 배치 임베딩
        batch_result = await embedding_service.embed_batch_symbols(symbols)

        return batch_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] Failed to embed all stock indicators: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stocks/embed-all-prices")
async def embed_all_price_histories(
    chunk_size: int = Query(30, description="청크 크기 (일)"),
):
    """
    DB의 모든 stock_price_history를 Pinecone에 임베딩

    Args:
        chunk_size: 청크 크기 (기본값: 30일)

    Returns:
        임베딩 결과
    """
    try:
        logger.info("[API] Embedding all price histories")

        # DB에서 모든 종목 조회
        from app.db.supabase_client import get_supabase
        supabase = get_supabase()

        result = supabase.table("stock_price_history").select("symbol").execute()
        symbols_set = set(row.get("symbol") for row in result.data if row.get("symbol"))
        symbols = sorted(list(symbols_set))

        if not symbols:
            raise HTTPException(status_code=404, detail="No price history found in database")

        results = {
            "type": "price_history",
            "total": len(symbols),
            "successful": 0,
            "failed": 0,
            "total_chunks": 0,
            "details": []
        }

        for symbol in symbols:
            try:
                embed_result = await embedding_service.embed_price_history(symbol, chunk_size=chunk_size)
                if embed_result.get("status") == "success":
                    results["successful"] += 1
                    chunks = embed_result.get("chunks_created", 0)
                    results["total_chunks"] += chunks
                else:
                    results["failed"] += 1

                results["details"].append({
                    "symbol": symbol,
                    "status": embed_result.get("status"),
                    "chunks_created": embed_result.get("chunks_created")
                })
            except Exception as e:
                results["failed"] += 1
                results["details"].append({
                    "symbol": symbol,
                    "status": "error",
                    "error": str(e)
                })

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] Failed to embed all price histories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/embeddings/index/stats")
async def get_index_stats():
    """
    Pinecone 인덱스 통계 조회

    Returns:
        인덱스 통계 (총 벡터 수, 차원 등)
    """
    try:
        logger.info("[API] Getting Pinecone index stats")

        stats = await pinecone_service.get_index_stats()

        return stats

    except Exception as e:
        logger.error(f"[ERROR] Failed to get index stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embeddings/search/similar-stocks")
async def search_similar_stocks(
    symbol: str = Query(..., description="기준 종목"),
    top_k: int = Query(5, description="반환할 유사 종목 수"),
):
    """
    특정 종목과 유사한 다른 종목 찾기
    (향후 구현: 쿼리 임베딩 생성 필요)

    Args:
        symbol: 기준 종목 코드
        top_k: 반환할 상위 유사 종목 수

    Returns:
        유사 종목 리스트
    """
    try:
        logger.info(f"[API] Searching similar stocks for {symbol}")

        # TODO: symbol에 대한 임베딩을 조회한 후 유사 검색 수행
        # 현재는 구현 스케치 단계

        return {
            "status": "pending",
            "message": "Similar stock search will be implemented in the next phase",
            "symbol": symbol,
            "note": "Requires querying existing embedding vector for the symbol"
        }

    except Exception as e:
        logger.error(f"[ERROR] Failed to search similar stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
