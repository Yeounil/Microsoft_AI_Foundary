"""
뉴스 번역 API

Claude Sonnet API를 사용하여 영문 뉴스를 한글로 번역하고 Supabase에 저장
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import logging
from app.services.news_translation_service import NewsTranslationService

logger = logging.getLogger(__name__)

router = APIRouter()
translation_service = NewsTranslationService()


@router.post("/news/{news_id}/translate")
async def translate_single_news(news_id: int):
    """
    단일 뉴스 번역

    Args:
        news_id: 번역할 뉴스 ID

    Returns:
        번역 결과
    """
    try:
        logger.info(f"🔄 뉴스 번역 시작: ID {news_id}")

        success = await translation_service.translate_and_save_news(news_id)

        if success:
            return {
                "status": "success",
                "news_id": news_id,
                "message": "뉴스가 성공적으로 번역되었습니다"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="뉴스 번역에 실패했습니다"
            )

    except Exception as e:
        logger.error(f"❌ 번역 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"번역 오류: {str(e)}"
        )


@router.post("/batch-translate")
async def batch_translate_news(
    news_ids: Optional[List[int]] = Query(None),
    limit: Optional[int] = Query(None),
    untranslated_only: bool = Query(False),
    batch_size: int = Query(3),
    delay: float = Query(2.0)
):
    """
    배치 뉴스 번역

    Args:
        news_ids: 번역할 뉴스 ID 목록 (쿼리 파라미터, 예: ?news_ids=1&news_ids=2&news_ids=3)
        limit: 최대 처리 개수
        untranslated_only: True이면 미번역 뉴스만 처리
        batch_size: 동시 처리 개수 (기본: 3)
        delay: 배치 간 딜레이 초 (기본: 2.0)

    Returns:
        번역 결과 통계
    """
    try:
        logger.info(f"🔄 배치 번역 시작")

        results = await translation_service.translate_batch_news(
            news_ids=news_ids,
            limit=limit,
            untranslated_only=untranslated_only,
            batch_size=batch_size,
            delay=delay
        )

        return {
            "status": "success",
            "summary": {
                "total": results["total"],
                "successful": results["successful"],
                "failed": results["failed"],
                "success_rate": f"{(results['successful'] / results['total'] * 100):.1f}%" if results["total"] > 0 else "0%"
            },
            "errors": results["errors"][:10] if results["errors"] else []
        }

    except Exception as e:
        logger.error(f"❌ 배치 번역 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"배치 번역 오류: {str(e)}"
        )


@router.post("/translate-untranslated")
async def translate_untranslated_news(
    limit: int = Query(50),
    batch_size: int = Query(3),
    delay: float = Query(2.0)
):
    """
    미번역 뉴스 자동 번역

    Args:
        limit: 최대 처리 개수 (기본: 50)
        batch_size: 동시 처리 개수 (기본: 3)
        delay: 배치 간 딜레이 초 (기본: 2.0)

    Returns:
        번역 결과 통계
    """
    try:
        logger.info(f"🔄 미번역 뉴스 자동 번역 시작 (최대: {limit}개)")

        results = await translation_service.translate_batch_news(
            limit=limit,
            untranslated_only=True,
            batch_size=batch_size,
            delay=delay
        )

        return {
            "status": "success",
            "summary": {
                "total": results["total"],
                "successful": results["successful"],
                "failed": results["failed"],
                "success_rate": f"{(results['successful'] / results['total'] * 100):.1f}%" if results["total"] > 0 else "0%"
            },
            "errors": results["errors"][:10] if results["errors"] else []
        }

    except Exception as e:
        logger.error(f"❌ 미번역 뉴스 번역 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"미번역 뉴스 번역 오류: {str(e)}"
        )


@router.get("/statistics")
async def get_translation_statistics():
    """
    번역 통계 조회

    Returns:
        번역 관련 통계
    """
    try:
        from app.db.supabase_client import get_supabase

        supabase = get_supabase()

        # 전체 뉴스
        total_result = supabase.table("news_articles")\
            .select("id")\
            .execute()
        total_news = len(total_result.data) if total_result.data else 0

        # 번역된 뉴스
        translated_result = supabase.table("news_articles")\
            .select("id")\
            .not_.is_("kr_translate", "null")\
            .execute()
        translated_news = len(translated_result.data) if translated_result.data else 0

        # 미번역 뉴스
        untranslated_news = total_news - translated_news

        return {
            "status": "success",
            "statistics": {
                "total_news": total_news,
                "translated_news": translated_news,
                "untranslated_news": untranslated_news,
                "translation_rate": f"{(translated_news / total_news * 100):.1f}%" if total_news > 0 else "0%"
            }
        }

    except Exception as e:
        logger.error(f"❌ 통계 조회 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"통계 조회 오류: {str(e)}"
        )


@router.get("/health")
async def translation_service_health():
    """
    번역 서비스 상태 확인

    Returns:
        서비스 상태
    """
    try:
        from app.db.supabase_client import get_supabase

        # Supabase 연결 확인
        supabase = get_supabase()
        supabase.table("news_articles").select("id").limit(1).execute()

        # API 키 확인
        import os
        has_anthropic_key = bool(os.getenv("ANTHROPIC_API_KEY"))

        return {
            "status": "healthy" if has_anthropic_key else "degraded",
            "services": {
                "supabase": "✅ Connected",
                "anthropic_api": "✅ Configured" if has_anthropic_key else "⚠️ Missing"
            }
        }

    except Exception as e:
        logger.error(f"❌ 헬스 체크 오류: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
