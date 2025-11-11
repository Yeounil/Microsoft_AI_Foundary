"""
뉴스 AI Score 평가 API
뉴스의 주가 영향도를 AI로 평가하는 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, List
import logging

from app.services.news_ai_score_service import NewsAIScoreService

logger = logging.getLogger(__name__)
router = APIRouter()

# 서비스 인스턴스
ai_score_service = NewsAIScoreService()


@router.post("/news/{news_id}/evaluate-score")
async def evaluate_news_score(news_id: int):
    """
    특정 뉴스의 AI Score 평가 및 DB 업데이트

    주가에 미치는 영향도를 0.0~1.0으로 평가합니다.

    **Example:**
    ```
    POST /api/v2/news-ai-score/news/123/evaluate-score
    ```

    **Response:**
    ```json
    {
        "status": "success",
        "news_id": 123,
        "ai_score": 0.65,
        "impact_direction": "positive",
        "reasoning": "신제품 출시 발표로 긍정적 영향 예상",
        "updated": true
    }
    ```
    """
    try:
        logger.info(f"[API] 뉴스 ID {news_id} AI Score 평가 요청")

        result = await ai_score_service.evaluate_and_update_news_score(news_id)

        if result.get("status") != "success":
            raise HTTPException(
                status_code=400,
                detail=result.get("reason", "AI Score 평가 실패")
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] 뉴스 {news_id} 평가 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/news/batch-evaluate")
async def batch_evaluate_news_scores(
    news_ids: List[int] = Body(..., description="평가할 뉴스 ID 리스트"),
    batch_size: int = Body(5, description="동시 처리 개수"),
    delay: float = Body(1.0, description="배치 간 딜레이 (초)")
):
    """
    여러 뉴스 AI Score 배치 평가

    **Example:**
    ```json
    POST /api/v2/news-ai-score/news/batch-evaluate
    {
        "news_ids": [101, 102, 103, 104, 105],
        "batch_size": 5,
        "delay": 1.0
    }
    ```

    **Response:**
    ```json
    {
        "total": 5,
        "successful": 4,
        "failed": 1,
        "results": [
            {
                "status": "success",
                "news_id": 101,
                "ai_score": 0.72,
                "updated": true
            },
            ...
        ]
    }
    ```
    """
    try:
        logger.info(f"[API] {len(news_ids)}개 뉴스 배치 평가 요청")

        if not news_ids:
            raise HTTPException(status_code=400, detail="뉴스 ID가 비어있습니다")

        if len(news_ids) > 100:
            raise HTTPException(status_code=400, detail="최대 100개까지만 배치 처리 가능합니다")

        result = await ai_score_service.evaluate_batch_news_scores(
            news_ids=news_ids,
            batch_size=batch_size,
            delay=delay
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] 배치 평가 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/news/evaluate-unevaluated")
async def evaluate_unevaluated_news(
    limit: int = Query(50, ge=1, le=200, description="최대 처리 개수"),
    symbol: Optional[str] = Query(None, description="특정 종목만 처리 (선택)")
):
    """
    아직 AI Score가 없는 뉴스들을 자동으로 평가

    **Example:**
    ```
    POST /api/v2/news-ai-score/news/evaluate-unevaluated?limit=50&symbol=AAPL
    ```

    **Response:**
    ```json
    {
        "total": 45,
        "successful": 43,
        "failed": 2,
        "results": [...]
    }
    ```
    """
    try:
        logger.info(f"[API] 미평가 뉴스 자동 평가 요청 (limit: {limit}, symbol: {symbol})")

        result = await ai_score_service.evaluate_unevaluated_news(
            limit=limit,
            symbol=symbol
        )

        return result

    except Exception as e:
        logger.error(f"[API] 미평가 뉴스 평가 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_ai_score_statistics(
    symbol: Optional[str] = Query(None, description="특정 종목의 통계 (선택)")
):
    """
    뉴스 AI Score 통계 조회

    **Example:**
    ```
    GET /api/v2/news-ai-score/statistics?symbol=AAPL
    ```

    **Response:**
    ```json
    {
        "total_news": 500,
        "evaluated_news": 450,
        "unevaluated_news": 50,
        "average_score": 0.542,
        "evaluation_rate": 90.0
    }
    ```
    """
    try:
        logger.info(f"[API] AI Score 통계 조회 (symbol: {symbol})")

        stats = await ai_score_service.get_news_score_statistics(symbol)

        return stats

    except Exception as e:
        logger.error(f"[API] 통계 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    AI Score 서비스 상태 확인

    **Response:**
    ```json
    {
        "status": "healthy",
        "service": "news_ai_score",
        "openai_available": true
    }
    ```
    """
    try:
        # OpenAI 서비스 사용 가능 여부 확인
        openai_available = ai_score_service.openai_service.client is not None

        return {
            "status": "healthy" if openai_available else "degraded",
            "service": "news_ai_score",
            "openai_available": openai_available,
            "model": "gpt-5"
        }

    except Exception as e:
        logger.error(f"[API] 헬스 체크 오류: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
