from fastapi import APIRouter, HTTPException, Query, Body, Depends, BackgroundTasks
from app.services.claude_service import ClaudeService
from app.db.supabase_client import get_supabase
from app.core.auth_supabase import get_current_user
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging
import json
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter()


async def _generate_report_background(symbol: str, limit: int, user_id: str):
    """백그라운드에서 레포트 생성 (내부 함수)"""
    try:
        supabase = get_supabase()
        logger.info(f"[BACKGROUND] 레포트 생성 시작 - {symbol}, user: {user_id}")

        # 1. 최신 뉴스 조회
        query_builder = supabase.table("news_articles")\
            .select("id, title, body, url, source, published_at, symbol, positive_score, ai_score, ai_analyzed_text")\
            .eq("symbol", symbol)\
            .order("published_at", desc=True)\
            .limit(limit)

        result = query_builder.execute()

        if not result.data or len(result.data) == 0:
            logger.error(f"[BACKGROUND] 뉴스 없음 - {symbol}")
            from app.api.notifications_sse import notify_report_failed
            await notify_report_failed(user_id, symbol, f"{symbol} 종목의 뉴스가 없습니다.")
            return

        news_articles = result.data
        logger.info(f"[BACKGROUND] {len(news_articles)}개 뉴스 조회 완료")

        # 2. Claude로 레포트 생성
        claude_service = ClaudeService()
        report_data = await claude_service.generate_news_report(
            symbol=symbol,
            news_articles=news_articles
        )

        logger.info(f"[BACKGROUND] ✅ {symbol} 레포트 생성 완료")

        # 3. DB에 저장
        expires_at = datetime.now() + timedelta(hours=24)

        insert_data = {
            "user_id": user_id,
            "symbol": symbol,
            "report_data": report_data,
            "analyzed_count": len(news_articles),
            "limit_used": limit,
            "expires_at": expires_at.isoformat()
        }

        save_result = supabase.table("news_reports").insert(insert_data).execute()

        if save_result.data and len(save_result.data) > 0:
            saved_report = save_result.data[0]
            report_id = saved_report.get('id')
            logger.info(f"[BACKGROUND] 💾 레포트 DB 저장 완료 (ID: {report_id})")

            # 4. SSE로 완료 알림 전송
            from app.api.notifications_sse import notify_report_completed
            await notify_report_completed(user_id, report_id, symbol)
        else:
            logger.error(f"[BACKGROUND] DB 저장 실패")
            from app.api.notifications_sse import notify_report_failed
            await notify_report_failed(user_id, symbol, "레포트 저장에 실패했습니다.")

    except Exception as e:
        logger.error(f"[BACKGROUND] 레포트 생성 오류 ({symbol}): {str(e)}")
        import traceback
        logger.error(f"[BACKGROUND] 상세 오류:\n{traceback.format_exc()}")

        from app.api.notifications_sse import notify_report_failed
        await notify_report_failed(user_id, symbol, f"레포트 생성 중 오류: {str(e)}")


@router.post("")
async def create_news_report(
    background_tasks: BackgroundTasks,
    symbol: str = Body(..., description="종목 심볼"),
    limit: int = Body(20, description="분석할 뉴스 개수"),
    current_user: dict = Depends(get_current_user)
):
    """
    뉴스 분석 레포트 생성 및 저장 (POST) - 인증 필요

    백그라운드에서 레포트를 생성하고, 완료 시 SSE로 알림을 전송합니다.

    Args:
        symbol: 종목 심볼 (예: AAPL, GOOGL, TSLA)
        limit: 분석할 뉴스 개수 (기본: 20, 최대: 50)
        current_user: 현재 로그인한 사용자 정보 (자동 주입)

    Returns:
        {
            "status": "processing",
            "symbol": "AAPL",
            "message": "레포트 생성이 시작되었습니다. 완료되면 알림을 보내드립니다."
        }
    """
    try:
        # limit 범위 제한
        limit = min(max(limit, 5), 50)
        symbol = symbol.upper()
        user_id = current_user["user_id"]

        logger.info(f"[NEWS_REPORT] {symbol} 레포트 생성 요청 (user_id: {user_id}, limit: {limit})")

        # 백그라운드 작업으로 레포트 생성
        background_tasks.add_task(_generate_report_background, symbol, limit, user_id)

        return {
            "status": "processing",
            "symbol": symbol,
            "message": f"{symbol} 레포트를 생성하고 있습니다. 완료되면 알림을 보내드립니다."
        }

    except Exception as e:
        logger.error(f"[NEWS_REPORT] 레포트 생성 요청 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"레포트 생성 요청 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/my-reports")
async def get_my_reports(
    limit: int = Query(20, description="조회할 레포트 개수"),
    offset: int = Query(0, description="건너뛸 개수"),
    current_user: dict = Depends(get_current_user)
):
    """
    현재 사용자의 모든 레포트 목록 조회 (GET) - 인증 필요

    자신이 생성한 모든 레포트를 최신순으로 조회합니다.
    만료된 레포트도 포함됩니다.

    Args:
        limit: 조회할 레포트 개수 (기본: 20, 최대: 100)
        offset: 건너뛸 개수 (페이징용)
        current_user: 현재 로그인한 사용자 정보 (자동 주입)

    Returns:
        {
            "total_count": 50,
            "reports": [
                {
                    "id": 123,
                    "symbol": "AAPL",
                    "analyzed_count": 20,
                    "created_at": "2025-01-08T16:30:00Z",
                    "expires_at": "2025-01-09T16:30:00Z",
                    "is_expired": false
                },
                ...
            ]
        }
    """
    try:
        logger.info(f"[NEWS_REPORT] my-reports 엔드포인트 진입 - current_user: {current_user}")
        user_id = current_user["user_id"]
        limit = min(max(limit, 1), 100)
        supabase = get_supabase()

        logger.info(f"[NEWS_REPORT] 사용자 레포트 목록 조회 시작 (user_id: {user_id}, limit: {limit}, offset: {offset})")

        # 전체 개수 조회
        logger.info(f"[NEWS_REPORT] Supabase count 쿼리 실행 중...")
        try:
            count_result = supabase.table("news_reports")\
                .select("id", count="exact")\
                .eq("user_id", user_id)\
                .execute()
            logger.info(f"[NEWS_REPORT] Count 쿼리 성공: {count_result.count}")
        except Exception as count_error:
            logger.error(f"[NEWS_REPORT] Count 쿼리 실패: {type(count_error).__name__} - {str(count_error)}")
            raise

        total_count = count_result.count if count_result.count else 0

        # 레포트 목록 조회
        logger.info(f"[NEWS_REPORT] Supabase select 쿼리 실행 중...")
        try:
            query_result = supabase.table("news_reports")\
                .select("id, symbol, analyzed_count, limit_used, created_at, expires_at")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            logger.info(f"[NEWS_REPORT] Select 쿼리 성공: {len(query_result.data) if query_result.data else 0}개")
        except Exception as select_error:
            logger.error(f"[NEWS_REPORT] Select 쿼리 실패: {type(select_error).__name__} - {str(select_error)}")
            raise

        if not query_result.data:
            return {
                "total_count": 0,
                "reports": []
            }

        # 만료 여부 추가
        from datetime import timezone
        current_time = datetime.now(timezone.utc)  # timezone-aware로 변경
        reports = []
        for report in query_result.data:
            expires_at = datetime.fromisoformat(report["expires_at"].replace("Z", "+00:00"))
            reports.append({
                **report,
                "is_expired": expires_at < current_time
            })

        logger.info(f"[NEWS_REPORT] ✅ {len(reports)}개 레포트 조회 완료 (total: {total_count})")

        return {
            "total_count": total_count,
            "reports": reports
        }

    except Exception as e:
        logger.error(f"[NEWS_REPORT] 레포트 목록 조회 오류: {str(e)}")
        import traceback
        logger.error(f"[NEWS_REPORT] 상세 오류:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"레포트 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/report/{report_id}")
async def get_report_by_id(
    report_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    특정 레포트 상세 조회 (GET) - 인증 필요

    레포트 ID로 특정 레포트를 조회합니다.
    자신의 레포트만 조회 가능합니다 (RLS 적용).

    Args:
        report_id: 레포트 ID
        current_user: 현재 로그인한 사용자 정보 (자동 주입)

    Returns:
        {
            "id": 123,
            "user_id": "uuid",
            "symbol": "AAPL",
            "report_data": {...},
            "analyzed_count": 20,
            "limit_used": 20,
            "created_at": "2025-01-08T16:30:00Z",
            "expires_at": "2025-01-09T16:30:00Z",
            "is_expired": false
        }
    """
    try:
        user_id = current_user["user_id"]
        supabase = get_supabase()

        logger.info(f"[NEWS_REPORT] 레포트 상세 조회 (report_id: {report_id}, user_id: {user_id})")

        # 레포트 조회 (RLS로 자동으로 본인 레포트만 조회됨)
        query_result = supabase.table("news_reports")\
            .select("*")\
            .eq("id", report_id)\
            .eq("user_id", user_id)\
            .execute()

        if not query_result.data or len(query_result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail="레포트를 찾을 수 없습니다. 본인의 레포트만 조회 가능합니다."
            )

        report = query_result.data[0]

        # 만료 여부 확인
        from datetime import timezone
        expires_at = datetime.fromisoformat(report["expires_at"].replace("Z", "+00:00"))
        is_expired = expires_at < datetime.now(timezone.utc)

        logger.info(f"[NEWS_REPORT] ✅ 레포트 조회 완료 (ID: {report_id})")

        return {
            **report,
            "is_expired": is_expired
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[NEWS_REPORT] 레포트 상세 조회 오류 (ID: {report_id}): {str(e)}")
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


@router.delete("/report/{report_id}")
async def delete_report(
    report_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    레포트 삭제 (DELETE) - 인증 필요

    자신의 레포트를 삭제합니다.
    보안을 위해 user_id를 확인하여 본인의 레포트만 삭제 가능합니다.

    Args:
        report_id: 삭제할 레포트 ID
        current_user: 현재 로그인한 사용자 정보 (자동 주입)

    Returns:
        {
            "success": true,
            "message": "레포트가 삭제되었습니다",
            "deleted_id": 123
        }
    """
    try:
        user_id = current_user["user_id"]
        supabase = get_supabase()

        logger.info(f"[NEWS_REPORT] 레포트 삭제 요청 (report_id: {report_id}, user_id: {user_id})")

        # 먼저 해당 레포트가 본인의 것인지 확인
        query_result = supabase.table("news_reports")\
            .select("id, symbol")\
            .eq("id", report_id)\
            .eq("user_id", user_id)\
            .execute()

        if not query_result.data or len(query_result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail="레포트를 찾을 수 없거나 삭제 권한이 없습니다."
            )

        # 레포트 삭제
        delete_result = supabase.table("news_reports")\
            .delete()\
            .eq("id", report_id)\
            .eq("user_id", user_id)\
            .execute()

        logger.info(f"[NEWS_REPORT] ✅ 레포트 삭제 완료 (ID: {report_id}, Symbol: {query_result.data[0]['symbol']})")

        return {
            "success": True,
            "message": "레포트가 삭제되었습니다",
            "deleted_id": report_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[NEWS_REPORT] 레포트 삭제 오류 (ID: {report_id}): {str(e)}")
        import traceback
        logger.error(f"[NEWS_REPORT] 상세 오류:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"레포트 삭제 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/{symbol}")
async def get_news_report(
    symbol: str,
    force_refresh: bool = Query(False, description="캐시 무시하고 새로 생성"),
    current_user: dict = Depends(get_current_user)
):
    """
    뉴스 분석 레포트 조회 (GET) - 인증 필요

    DB에서 현재 사용자의 캐시된 레포트를 조회합니다 (24시간 이내).
    자신의 레포트만 조회 가능합니다 (RLS 적용).

    Args:
        symbol: 종목 심볼 (예: AAPL, GOOGL, TSLA)
        force_refresh: True면 캐시 무시하고 새로 생성 안내
        current_user: 현재 로그인한 사용자 정보 (자동 주입)

    Returns:
        레포트 데이터 또는 404 에러
    """
    try:
        symbol = symbol.upper()
        user_id = current_user["user_id"]
        supabase = get_supabase()

        logger.info(f"[NEWS_REPORT] {symbol} 레포트 조회 (user_id: {user_id})")

        if force_refresh:
            raise HTTPException(
                status_code=404,
                detail="새로운 레포트를 생성해주세요. POST /api/v1/news-report 를 사용하세요."
            )

        # DB에서 현재 사용자의 최신 레포트 조회 (만료되지 않은 것만)
        current_time = datetime.now().isoformat()

        query_result = supabase.table("news_reports")\
            .select("*")\
            .eq("user_id", user_id)\
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
        logger.info(f"[NEWS_REPORT] ✅ 캐시된 레포트 조회 (ID: {cached_report.get('id')}, User: {user_id})")

        # report_data 추출
        report_data = cached_report.get("report_data")

        return {
            "id": cached_report.get("id"),
            "user_id": user_id,
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