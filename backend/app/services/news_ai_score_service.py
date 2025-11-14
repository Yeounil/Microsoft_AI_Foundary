"""
뉴스 AI Score 평가 서비스
뉴스 기사의 주가 영향도를 AI로 평가하고 DB에 업데이트
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
import asyncio

from app.services.openai_service import OpenAIService
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class NewsAIScoreService:
    """
    뉴스 AI Score 평가 및 업데이트 서비스

    주요 기능:
    1. 단일 뉴스 AI Score 평가 및 DB 업데이트
    2. 배치 뉴스 AI Score 평가
    3. 미평가 뉴스 자동 처리
    """

    def __init__(self):
        self.openai_service = OpenAIService()
        self.supabase = get_supabase()

    async def evaluate_and_update_news_score(
        self,
        news_id: int,
        news_article: Optional[Dict] = None
    ) -> Dict:
        """
        뉴스 AI Score 평가 및 DB 업데이트

        Args:
            news_id: news_articles 테이블의 ID
            news_article: 뉴스 기사 데이터 (없으면 DB에서 조회)

        Returns:
            {
                "status": "success|error",
                "news_id": int,
                "ai_score": float,
                "updated": bool
            }
        """
        try:
            # 뉴스 기사 조회 (없으면 DB에서)
            if not news_article:
                news_article = await self._fetch_news_by_id(news_id)
                if not news_article:
                    logger.warning(f"[AI_SCORE] 뉴스 ID {news_id} 를 찾을 수 없음")
                    return {
                        "status": "error",
                        "news_id": news_id,
                        "reason": "뉴스를 찾을 수 없음"
                    }

            # AI Score 평가
            logger.info(f"[AI_SCORE] 뉴스 ID {news_id} 평가 시작")

            evaluation_result = await self.openai_service.evaluate_news_stock_impact(
                news_article=news_article,
                symbol=news_article.get('symbol')
            )

            ai_score = evaluation_result.get('ai_score', 0.5)
            positive_score = evaluation_result.get('positive_score', 0.5)
            impact_direction = evaluation_result.get('impact_direction', 'neutral')
            reasoning = evaluation_result.get('reasoning', '')
            analyzed_text = evaluation_result.get('analyzed_text', '')

            # DB 업데이트
            update_success = await self._update_news_ai_score(
                news_id=news_id,
                ai_score=ai_score,
                positive_score=positive_score,
                analyzed_text=analyzed_text,
                evaluation_result=evaluation_result
            )

            if update_success:
                logger.info(f"[AI_SCORE] ✅ 뉴스 ID {news_id} - AI Score: {ai_score:.3f}, Positive: {positive_score:.3f} ({impact_direction}) 업데이트 완료")
                return {
                    "status": "success",
                    "news_id": news_id,
                    "ai_score": ai_score,
                    "positive_score": positive_score,
                    "impact_direction": impact_direction,
                    "reasoning": reasoning,
                    "updated": True
                }
            else:
                logger.error(f"[AI_SCORE] ❌ 뉴스 ID {news_id} DB 업데이트 실패")
                return {
                    "status": "error",
                    "news_id": news_id,
                    "reason": "DB 업데이트 실패"
                }

        except Exception as e:
            logger.error(f"[AI_SCORE] 뉴스 ID {news_id} 평가 오류: {str(e)}")
            return {
                "status": "error",
                "news_id": news_id,
                "reason": str(e)
            }

    async def evaluate_batch_news_scores(
        self,
        news_ids: List[int],
        batch_size: int = 5,
        delay: float = 1.0
    ) -> Dict:
        """
        여러 뉴스 AI Score 배치 평가

        Args:
            news_ids: 뉴스 ID 리스트
            batch_size: 동시 처리 개수
            delay: 배치 간 딜레이 (초)

        Returns:
            {
                "total": int,
                "successful": int,
                "failed": int,
                "results": List[Dict]
            }
        """
        try:
            logger.info(f"[AI_SCORE_BATCH] {len(news_ids)}개 뉴스 배치 평가 시작")

            results = {
                "total": len(news_ids),
                "successful": 0,
                "failed": 0,
                "results": []
            }

            # 배치 단위로 처리
            for i in range(0, len(news_ids), batch_size):
                batch_ids = news_ids[i:i+batch_size]

                logger.info(f"[AI_SCORE_BATCH] 배치 {i//batch_size + 1}/{(len(news_ids) + batch_size - 1)//batch_size} 처리 중...")

                # 동시 평가
                tasks = [
                    self.evaluate_and_update_news_score(news_id)
                    for news_id in batch_ids
                ]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)

                # 결과 집계
                for result in batch_results:
                    if isinstance(result, Exception):
                        results["failed"] += 1
                        results["results"].append({
                            "status": "error",
                            "reason": str(result)
                        })
                    elif result.get("status") == "success":
                        results["successful"] += 1
                        results["results"].append(result)
                    else:
                        results["failed"] += 1
                        results["results"].append(result)

                # 배치 간 딜레이 (API 레이트 제한 고려)
                if i + batch_size < len(news_ids):
                    await asyncio.sleep(delay)

            logger.info(f"[AI_SCORE_BATCH] ✅ 배치 평가 완료 - 성공: {results['successful']}, 실패: {results['failed']}")

            return results

        except Exception as e:
            logger.error(f"[AI_SCORE_BATCH] 배치 평가 오류: {str(e)}")
            return {
                "total": len(news_ids),
                "successful": 0,
                "failed": len(news_ids),
                "results": [],
                "error": str(e)
            }

    async def evaluate_unevaluated_news(
        self,
        limit: int = 50,
        symbol: Optional[str] = None
    ) -> Dict:
        """
        아직 AI Score가 없는 뉴스들을 자동으로 평가

        Args:
            limit: 최대 처리 개수
            symbol: 특정 종목만 처리 (선택)

        Returns:
            배치 평가 결과
        """
        try:
            logger.info(f"[AI_SCORE_AUTO] 미평가 뉴스 자동 평가 시작 (limit: {limit})")

            # 미평가 뉴스 조회
            unevaluated_news = await self._fetch_unevaluated_news(limit, symbol)

            if not unevaluated_news:
                logger.info("[AI_SCORE_AUTO] 평가할 뉴스가 없습니다")
                return {
                    "total": 0,
                    "successful": 0,
                    "failed": 0,
                    "results": []
                }

            news_ids = [news['id'] for news in unevaluated_news]

            logger.info(f"[AI_SCORE_AUTO] {len(news_ids)}개 미평가 뉴스 발견")

            # 배치 평가
            result = await self.evaluate_batch_news_scores(news_ids)

            return result

        except Exception as e:
            logger.error(f"[AI_SCORE_AUTO] 자동 평가 오류: {str(e)}")
            return {
                "total": 0,
                "successful": 0,
                "failed": 0,
                "results": [],
                "error": str(e)
            }

    async def _fetch_news_by_id(self, news_id: int) -> Optional[Dict]:
        """뉴스 ID로 뉴스 기사 조회"""
        try:
            result = self.supabase.table("news_articles")\
                .select("*")\
                .eq("id", news_id)\
                .execute()

            if result.data and len(result.data) > 0:
                return result.data[0]

            return None

        except Exception as e:
            logger.error(f"[DB] 뉴스 조회 오류 (ID: {news_id}): {str(e)}")
            return None

    async def _fetch_unevaluated_news(
        self,
        limit: int,
        symbol: Optional[str] = None
    ) -> List[Dict]:
        """부분 평가 또는 미평가 뉴스 조회 (ai_analyzed_text 또는 positive_score가 NULL)"""
        try:
            query = self.supabase.table("news_articles")\
                .select("id, title, description, body, symbol, published_at, ai_score, analyzed_at, ai_analyzed_text, positive_score")\
                .is_("ai_analyzed_text", "null")\
                .order("published_at", desc=True)\
                .limit(limit)

            # 종목 필터링
            if symbol:
                query = query.eq("symbol", symbol)

            result = query.execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"[DB] 미평가 뉴스 조회 오류: {str(e)}")
            return []

    async def _update_news_ai_score(
        self,
        news_id: int,
        ai_score: float,
        positive_score: float,
        analyzed_text: str,
        evaluation_result: Dict
    ) -> bool:
        """뉴스 AI Score, Positive Score 및 분석 텍스트를 DB에 업데이트"""
        try:
            # 업데이트 데이터 준비
            update_data = {
                "ai_score": ai_score,
                "positive_score": positive_score,
                "ai_analyzed_text": analyzed_text,
                "analyzed_at": datetime.now().isoformat()
            }

            # 추가 분석 결과를 JSON으로 저장 (선택적)
            # analyzed_metadata 컬럼이 있다면 활용 가능
            # update_data["analyzed_metadata"] = {
            #     "impact_direction": evaluation_result.get("impact_direction"),
            #     "confidence": evaluation_result.get("confidence"),
            #     "reasoning": evaluation_result.get("reasoning"),
            #     "key_factors": evaluation_result.get("key_factors"),
            #     "time_horizon": evaluation_result.get("time_horizon"),
            #     "volatility_impact": evaluation_result.get("volatility_impact")
            # }

            # Supabase 업데이트
            result = self.supabase.table("news_articles")\
                .update(update_data)\
                .eq("id", news_id)\
                .execute()

            return bool(result.data)

        except Exception as e:
            logger.error(f"[DB] AI Score 업데이트 오류 (ID: {news_id}): {str(e)}")
            return False

    async def get_news_score_statistics(self, symbol: Optional[str] = None) -> Dict:
        """뉴스 AI Score 통계 조회"""
        try:
            query = self.supabase.table("news_articles")\
                .select("ai_score, symbol, published_at")

            if symbol:
                query = query.eq("symbol", symbol)

            result = query.execute()

            if not result.data:
                return {
                    "total_news": 0,
                    "evaluated_news": 0,
                    "unevaluated_news": 0,
                    "average_score": 0.0
                }

            total = len(result.data)
            evaluated = [news for news in result.data if news.get('ai_score') is not None]
            unevaluated = total - len(evaluated)

            avg_score = 0.0
            if evaluated:
                avg_score = sum(news['ai_score'] for news in evaluated) / len(evaluated)

            return {
                "total_news": total,
                "evaluated_news": len(evaluated),
                "unevaluated_news": unevaluated,
                "average_score": round(avg_score, 3),
                "evaluation_rate": round(len(evaluated) / total * 100, 1) if total > 0 else 0.0
            }

        except Exception as e:
            logger.error(f"[STATS] 통계 조회 오류: {str(e)}")
            return {
                "total_news": 0,
                "evaluated_news": 0,
                "unevaluated_news": 0,
                "average_score": 0.0,
                "error": str(e)
            }
