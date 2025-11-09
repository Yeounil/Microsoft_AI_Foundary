"""
뉴스 크롤링 스케줄러 서비스
- 2시간마다 자동으로 인기 종목 뉴스 크롤링
- 서버 재시작 시 누락된 뉴스 자동 보충
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger

from app.services.background_news_collector import BackgroundNewsCollector
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class NewsScheduler:
    """뉴스 크롤링 스케줄러"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.collector = BackgroundNewsCollector()
        self.is_running = False

    async def start(self):
        """스케줄러 시작"""
        if self.is_running:
            logger.warning("[WARN] Scheduler is already running")
            return

        logger.info("[INFO] Starting news crawling scheduler")

        # 1. 서버 시작 시 누락된 뉴스 확인 및 크롤링 (비동기로 즉시 실행)
        asyncio.create_task(self._recover_missing_news())

        # 2. 2시간마다 정기 크롤링 스케줄 등록
        self.scheduler.add_job(
            self._scheduled_crawl,
            trigger=IntervalTrigger(hours=2),
            id='news_crawl_2hours',
            name='News crawling every 2 hours',
            replace_existing=True
        )

        # 3. 매일 자정에 오래된 뉴스 정리
        self.scheduler.add_job(
            self._cleanup_old_news,
            trigger='cron',
            hour=0,
            minute=0,
            id='cleanup_old_news',
            name='Cleanup old news daily',
            replace_existing=True
        )

        # 스케줄러 시작
        self.scheduler.start()
        self.is_running = True

        logger.info("[OK] News crawling scheduler started successfully")
        logger.info("[CONFIG] - Automatic crawling every 2 hours")
        logger.info("[CONFIG] - Daily news cleanup at midnight")

    async def stop(self):
        """스케줄러 중지"""
        if not self.is_running:
            return

        logger.info("[INFO] Stopping news crawling scheduler")
        self.scheduler.shutdown()

        # 백그라운드 수집기의 스레드 풀 정리
        self.collector.shutdown()

        self.is_running = False
        logger.info("[OK] Scheduler and thread pool cleanup completed")

    async def _scheduled_crawl(self):
        """정기 크롤링 작업 (2시간마다 실행)"""
        try:
            logger.info("========== [SCHEDULED_CRAWL] News crawling started ==========")

            # 인기 종목 뉴스 수집
            result = await self.collector.collect_popular_symbols_news(limit_per_symbol=100)

            logger.info(f"[CRAWL_RESULT] Total collected: {result.get('total_collected', 0)} articles")
            logger.info(f"[CRAWL_RESULT] Successful symbols: {len(result.get('successful_symbols', []))}")
            logger.info(f"[CRAWL_RESULT] Failed symbols: {len(result.get('failed_symbols', []))}")
            logger.info("========== [SCHEDULED_CRAWL] Crawling completed ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during scheduled crawling: {str(e)}")

    async def _recover_missing_news(self):
        """서버 재시작 시 누락된 뉴스 복구"""
        try:
            logger.info("========== [RECOVERY] Server restart: Checking for missing news ==========")

            # 1. 마지막 성공적인 크롤링 시각 확인
            last_crawl_time = await self._get_last_successful_crawl_time()

            if not last_crawl_time:
                logger.info("[RECOVERY] No previous crawl records found. Starting immediate crawl.")
                await self._scheduled_crawl()
                return

            # 2. 현재 시각과 비교
            now = datetime.now()
            time_diff = now - last_crawl_time
            hours_passed = time_diff.total_seconds() / 3600

            logger.info(f"[RECOVERY] Last crawl: {last_crawl_time.strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"[RECOVERY] Time elapsed: {hours_passed:.1f} hours")

            # 3. 2시간 이상 경과했으면 즉시 크롤링
            if hours_passed >= 2:
                logger.info(f"[RECOVERY] More than 2 hours elapsed. Starting immediate crawl.")
                await self._scheduled_crawl()
            else:
                remaining_time = 2 - hours_passed
                logger.info(f"[RECOVERY] {remaining_time:.1f} hours remaining until next scheduled crawl.")

            logger.info("========== [RECOVERY] Recovery check completed ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during missing news recovery: {str(e)}")
            # 오류 발생 시에도 크롤링 진행
            logger.info("[RECOVERY] Starting immediate crawl due to error.")
            await self._scheduled_crawl()

    async def _get_last_successful_crawl_time(self) -> datetime | None:
        """마지막 성공적인 크롤링 시각 조회"""
        try:
            supabase = get_supabase()

            # news_crawl_history에서 마지막 완료된 크롤링 시각 조회
            result = supabase.table("news_crawl_history")\
                .select("crawl_completed_at")\
                .eq("status", "completed")\
                .order("crawl_completed_at", desc=True)\
                .limit(1)\
                .execute()

            if result.data and len(result.data) > 0:
                crawl_time_str = result.data[0].get('crawl_completed_at')
                if crawl_time_str:
                    # ISO 8601 형식 파싱
                    return datetime.fromisoformat(crawl_time_str.replace('Z', '+00:00')).replace(tzinfo=None)

            return None

        except Exception as e:
            logger.error(f"[ERROR] Error retrieving last crawl time: {str(e)}")
            return None

    async def _cleanup_old_news(self):
        """오래된 뉴스 정리 (1년 이상 지난 뉴스 자동 삭제)"""
        try:
            from app.services.news_db_service import NewsDBService

            logger.info("[CLEANUP] Starting old news cleanup (1 year or older)")

            # 1년 이상 된 뉴스 삭제
            deleted_count = await NewsDBService.delete_old_news(days=365)

            logger.info(f"[CLEANUP] Old news cleanup completed: {deleted_count}개 뉴스 삭제")

        except Exception as e:
            logger.error(f"[ERROR] Error during news cleanup: {str(e)}")

    async def trigger_manual_crawl(self, symbols: List[str] = None) -> Dict:
        """수동 크롤링 트리거 (API로 호출 가능, 멀티스레드 지원)"""
        try:
            logger.info(f"[MANUAL_CRAWL] Starting manual crawl (multithreaded): {symbols if symbols else 'all symbols'}")

            if symbols:
                # 특정 종목만 크롤링 (멀티스레드로 병렬 처리)
                loop = asyncio.get_event_loop()
                futures = []

                for symbol in symbols:
                    # 각 종목을 별도 스레드에서 수집
                    future = loop.run_in_executor(
                        self.collector.collection_executor,
                        self.collector._collect_and_analyze_symbol_news_sync,
                        symbol,
                        20
                    )
                    futures.append((symbol, future))

                # 모든 스레드 작업 완료 대기
                total_collected = 0
                results = []

                for symbol, future in futures:
                    try:
                        result = await future
                        total_collected += result.get('collected_count', 0)
                        results.append(result)
                        logger.info(f"[MANUAL_CRAWL] Symbol {symbol}: {result.get('collected_count', 0)} collected")
                    except Exception as e:
                        logger.error(f"[ERROR] Symbol {symbol} crawl failed: {str(e)}")
                        results.append({
                            "symbol": symbol,
                            "collected_count": 0,
                            "error": str(e)
                        })

                return {
                    "status": "completed",
                    "total_collected": total_collected,
                    "results": results
                }
            else:
                # 전체 인기 종목 크롤링 (멀티스레드 버전)
                return await self.collector.collect_popular_symbols_news(limit_per_symbol=100)

        except Exception as e:
            logger.error(f"[ERROR] Error during manual crawl: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }


# 전역 스케줄러 인스턴스
_scheduler_instance = None

def get_scheduler() -> NewsScheduler:
    """스케줄러 싱글톤 인스턴스 반환"""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = NewsScheduler()
    return _scheduler_instance
