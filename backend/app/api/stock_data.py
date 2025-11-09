"""
주식 데이터 수집 API 엔드포인트
주식 지표 및 가격 이력 수동 수집 및 조회 API
"""

from fastapi import APIRouter, Query, HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from app.services.news_scheduler import get_scheduler
from app.services.fmp_stock_data_service import FMPStockDataService
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stock-data", tags=["stock_data"])

# ============= 수동 수집 엔드포인트 =============

@router.post("/collect/indicators", tags=["stock_data"])
async def trigger_collect_indicators(
    symbols: Optional[List[str]] = Query(None, description="수집할 종목 리스트 (없으면 전체 100개)"),
    force_refresh: bool = Query(False, description="이미 수집된 데이터도 다시 수집")
) -> Dict[str, Any]:
    """
    주식 지표 수집 트리거

    - 기술 지표: SMA, EMA, RSI, MACD
    - 재무 지표: ROE, ROA, 유동비율, 부채비율 등
    - 스코어: Altman Z-Score, Piotroski F-Score
    """
    try:
        logger.info(f"[API] 주식 지표 수집 요청: {symbols if symbols else '전체'}")

        scheduler = get_scheduler()
        result = await scheduler.trigger_manual_stock_indicators(symbols, force_refresh)

        return {
            "status": "success",
            "message": "주식 지표 수집 완료",
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"[ERROR] 주식 지표 수집 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"주식 지표 수집 중 오류 발생: {str(e)}"
        )

@router.post("/collect/prices", tags=["stock_data"])
async def trigger_collect_prices(
    symbols: Optional[List[str]] = Query(None, description="수집할 종목 리스트 (없으면 전체 100개)"),
    force_refresh: bool = Query(False, description="기존 데이터도 다시 수집")
) -> Dict[str, Any]:
    """
    주식 가격 이력 수집 트리거 (5년)

    - OHLCV 데이터: 시가, 고가, 저가, 종가, 거래량
    - 5년간의 일별 가격 이력
    - 자동 중복 제거 (symbol, date 기준)
    """
    try:
        logger.info(f"[API] 주식 가격 이력 수집 요청: {symbols if symbols else '전체'}")

        scheduler = get_scheduler()
        result = await scheduler.trigger_manual_price_history(symbols, force_refresh)

        return {
            "status": "success",
            "message": "주식 가격 이력 수집 완료",
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"[ERROR] 주식 가격 이력 수집 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"주식 가격 이력 수집 중 오류 발생: {str(e)}"
        )

@router.post("/collect/full", tags=["stock_data"])
async def trigger_collect_full_data(
    symbols: Optional[List[str]] = Query(None, description="수집할 종목 리스트 (없으면 전체 100개)"),
    force_refresh: bool = Query(False, description="기존 데이터도 다시 수집")
) -> Dict[str, Any]:
    """
    전체 주식 데이터 수집 (지표 + 가격 이력)

    순서:
    1. 주식 지표 수집 (기술/재무 지표)
    2. 주식 가격 이력 수집 (5년 OHLCV)
    """
    try:
        logger.info(f"[API] 전체 주식 데이터 수집 요청: {symbols if symbols else '전체'}")

        scheduler = get_scheduler()
        result = await scheduler.trigger_manual_full_stock_data(symbols, force_refresh)

        return {
            "status": "success",
            "message": "전체 주식 데이터 수집 완료",
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"[ERROR] 전체 주식 데이터 수집 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"전체 주식 데이터 수집 중 오류 발생: {str(e)}"
        )

# ============= 조회 엔드포인트 =============

@router.get("/indicators/{symbol}", tags=["stock_data"])
async def get_stock_indicators(symbol: str) -> Dict[str, Any]:
    """
    특정 종목의 주식 지표 조회
    """
    try:
        supabase = get_supabase()

        response = supabase.table("stock_indicators")\
            .select("*")\
            .eq("symbol", symbol.upper())\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"종목 {symbol}의 지표 데이터가 없습니다"
            )

        return {
            "status": "success",
            "data": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] 주식 지표 조회 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"주식 지표 조회 중 오류 발생: {str(e)}"
        )

@router.get("/indicators", tags=["stock_data"])
async def get_all_stock_indicators(
    limit: int = Query(10, ge=1, le=100, description="조회 개수"),
    sector: Optional[str] = Query(None, description="섹터 필터 (e.g., 'Technology')")
) -> Dict[str, Any]:
    """
    모든 주식 지표 조회 (최신 업데이트 기준 정렬)
    """
    try:
        supabase = get_supabase()

        query = supabase.table("stock_indicators")\
            .select("*")\
            .order("updated_at", desc=True)

        if sector:
            query = query.eq("sector", sector)

        response = query.limit(limit).execute()

        return {
            "status": "success",
            "total": len(response.data),
            "limit": limit,
            "data": response.data
        }
    except Exception as e:
        logger.error(f"[ERROR] 주식 지표 목록 조회 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"주식 지표 목록 조회 중 오류 발생: {str(e)}"
        )

@router.get("/prices/{symbol}", tags=["stock_data"])
async def get_price_history(
    symbol: str,
    limit: int = Query(30, ge=1, le=500, description="조회할 최신 레코드 개수"),
    start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)")
) -> Dict[str, Any]:
    """
    특정 종목의 가격 이력 조회
    """
    try:
        supabase = get_supabase()

        query = supabase.table("stock_price_history")\
            .select("*")\
            .eq("symbol", symbol.upper())\
            .order("date", desc=True)

        if start_date:
            query = query.gte("date", start_date)

        response = query.limit(limit).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"종목 {symbol}의 가격 이력이 없습니다"
            )

        return {
            "status": "success",
            "symbol": symbol,
            "total": len(response.data),
            "data": response.data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] 가격 이력 조회 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"가격 이력 조회 중 오류 발생: {str(e)}"
        )

@router.get("/sync-history", tags=["stock_data"])
async def get_sync_history(
    limit: int = Query(20, ge=1, le=100, description="조회 개수"),
    status_filter: Optional[str] = Query(None, description="상태 필터 (completed, failed, in_progress)")
) -> Dict[str, Any]:
    """
    주식 데이터 동기화 이력 조회
    """
    try:
        supabase = get_supabase()

        query = supabase.table("stock_data_sync_history")\
            .select("*")\
            .order("sync_completed_at", desc=True)

        if status_filter:
            query = query.eq("status", status_filter)

        response = query.limit(limit).execute()

        return {
            "status": "success",
            "total": len(response.data),
            "data": response.data
        }
    except Exception as e:
        logger.error(f"[ERROR] 동기화 이력 조회 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"동기화 이력 조회 중 오류 발생: {str(e)}"
        )

@router.get("/stats", tags=["stock_data"])
async def get_stock_data_stats() -> Dict[str, Any]:
    """
    주식 데이터 통계 조회
    """
    try:
        supabase = get_supabase()

        # 저장된 지표 개수
        indicators_response = supabase.table("stock_indicators")\
            .select("count", count="exact")\
            .execute()

        # 저장된 가격 이력 개수
        prices_response = supabase.table("stock_price_history")\
            .select("count", count="exact")\
            .execute()

        # 최근 동기화 시간
        sync_response = supabase.table("stock_data_sync_history")\
            .select("*")\
            .eq("status", "completed")\
            .order("sync_completed_at", desc=True)\
            .limit(1)\
            .execute()

        last_sync = None
        if sync_response.data:
            last_sync = sync_response.data[0]

        return {
            "status": "success",
            "stock_indicators_count": indicators_response.count or 0,
            "price_history_count": prices_response.count or 0,
            "last_sync": last_sync,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"[ERROR] 통계 조회 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"통계 조회 중 오류 발생: {str(e)}"
        )
