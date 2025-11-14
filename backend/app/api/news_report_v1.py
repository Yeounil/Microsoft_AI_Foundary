from fastapi import APIRouter, HTTPException, Query, Body
from app.services.claude_service import ClaudeService
from app.db.supabase_client import get_supabase
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("")
async def create_news_report(
    symbol: str = Body(..., description="종목 심볼"),
    limit: int = Body(20, description="분석할 뉴스 개수")
):
    """
    뉴스 분석 레포트 생성 및 저장 (POST)

    Claude 4.5 Sonnet을 사용하여 최신 뉴스를 분석하고
    레포트를 생성한 후 DB에 저장합니다.

    Args:
        symbol: 종목 심볼 (예: AAPL, GOOGL, TSLA)
        limit: 분석할 뉴스 개수 (기본: 20, 최대: 50)

    Returns:
        {
            "id": 123,
            "symbol": "AAPL",
            "report_data": {...},
            "created_at": "2025-01-08T16:30:00Z",
            "expires_at": "2025-01-09T16:30:00Z"
        }
    """
    try:
        # limit 범위 제한
        limit = min(max(limit, 5), 50)
        symbol = symbol.upper()

        supabase = get_supabase()

        logger.info(f"[NEWS_REPORT] {symbol} 레포트 생성 요청 (limit: {limit})")

        # 1. 최신 뉴스 조회
        query_builder = supabase.table("news_articles")\
            .select("id, title, body, url, source, published_at, symbol, positive_score, ai_score, ai_analyzed_text")\
            .eq("symbol", symbol)\
            .order("published_at", desc=True)\
            .limit(limit)

        result = query_builder.execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"{symbol} 종목의 뉴스가 없습니다."
            )

        news_articles = result.data
        logger.info(f"[NEWS_REPORT] {len(news_articles)}개 뉴스 조회 완료")

        # 2. Claude로 레포트 생성
        claude_service = ClaudeService()
        report_data = await claude_service.generate_news_report(
            symbol=symbol,
            news_articles=news_articles
        )

        logger.info(f"[NEWS_REPORT] ✅ {symbol} 레포트 생성 완료")

        # 3. DB에 저장
        expires_at = datetime.now() + timedelta(hours=24)

        insert_data = {
            "symbol": symbol,
            "report_data": report_data,
            "analyzed_count": len(news_articles),
            "limit_used": limit,
            "expires_at": expires_at.isoformat()
        }

        save_result = supabase.table("news_reports").insert(insert_data).execute()

        if not save_result.data or len(save_result.data) == 0:
            logger.error(f"[NEWS_REPORT] DB 저장 실패")
            # 저장 실패해도 레포트는 반환
            return {
                "id": None,
                "symbol": symbol,
                "report_data": report_data,
                "created_at": datetime.now().isoformat(),
                "expires_at": expires_at.isoformat(),
                "saved": False
            }

        saved_report = save_result.data[0]
        logger.info(f"[NEWS_REPORT] 💾 레포트 DB 저장 완료 (ID: {saved_report.get('id')})")

        return {
            "id": saved_report.get("id"),
            "symbol": symbol,
            "report_data": report_data,
            "created_at": saved_report.get("created_at"),
            "expires_at": saved_report.get("expires_at"),
            "saved": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[NEWS_REPORT] 레포트 생성 오류 ({symbol}): {str(e)}")
        import traceback
        logger.error(f"[NEWS_REPORT] 상세 오류:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"레포트 생성 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/{symbol}")
async def get_news_report(
    symbol: str,
    force_refresh: bool = Query(False, description="캐시 무시하고 새로 생성")
):
    """
    뉴스 분석 레포트 조회 (GET)

    DB에서 캐시된 레포트를 조회합니다 (24시간 이내).
    캐시가 없거나 만료되었으면 404를 반환합니다.

    Args:
        symbol: 종목 심볼 (예: AAPL, GOOGL, TSLA)
        force_refresh: True면 캐시 무시하고 새로 생성 안내

    Returns:
        레포트 데이터 또는 404 에러
    """
    try:
        symbol = symbol.upper()
        supabase = get_supabase()

        logger.info(f"[NEWS_REPORT] {symbol} 레포트 조회")

        if force_refresh:
            raise HTTPException(
                status_code=404,
                detail="새로운 레포트를 생성해주세요. POST /api/v1/news-report 를 사용하세요."
            )

        # DB에서 최신 레포트 조회 (만료되지 않은 것만)
        current_time = datetime.now().isoformat()

        query_result = supabase.table("news_reports")\
            .select("*")\
            .eq("symbol", symbol)\
            .gt("expires_at", current_time)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if not query_result.data or len(query_result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"{symbol} 종목의 유효한 레포트가 없습니다. 새로운 레포트를 생성해주세요."
            )

        cached_report = query_result.data[0]
        logger.info(f"[NEWS_REPORT] ✅ 캐시된 레포트 조회 (ID: {cached_report.get('id')})")

        # report_data 추출
        report_data = cached_report.get("report_data")

        return {
            "id": cached_report.get("id"),
            "symbol": symbol,
            "report_data": report_data,
            "created_at": cached_report.get("created_at"),
            "expires_at": cached_report.get("expires_at"),
            "from_cache": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[NEWS_REPORT] 레포트 조회 오류 ({symbol}): {str(e)}")
        import traceback
        logger.error(f"[NEWS_REPORT] 상세 오류:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"레포트 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/{symbol}/preview")
async def preview_news_for_report(
    symbol: str,
    limit: int = Query(20, description="조회할 뉴스 개수")
):
    """
    레포트 생성에 사용될 뉴스 미리보기

    Args:
        symbol: 종목 심볼
        limit: 조회할 뉴스 개수

    Returns:
        {
            "symbol": "AAPL",
            "total_count": 20,
            "articles": [...]
        }
    """
    try:
        # limit 범위 제한
        limit = min(max(limit, 5), 50)

        supabase = get_supabase()

        # 뉴스 조회
        query_builder = supabase.table("news_articles")\
            .select("id, title, published_at, symbol, positive_score, ai_score, ai_analyzed_text")\
            .eq("symbol", symbol.upper())\
            .order("published_at", desc=True)\
            .limit(limit)

        result = query_builder.execute()

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail=f"{symbol} 종목의 뉴스가 없습니다."
            )

        return {
            "symbol": symbol.upper(),
            "total_count": len(result.data),
            "articles": result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[NEWS_PREVIEW] 뉴스 미리보기 오류 ({symbol}): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
