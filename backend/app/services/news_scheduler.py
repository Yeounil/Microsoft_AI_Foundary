"""
뉴스 크롤링 스케줄러 서비스
- 5시간마다 자동으로 인기 종목 뉴스 크롤링
- 서버 재시작 시 누락된 뉴스 자동 보충
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger

from app.services.news_service import NewsService
from app.services.fmp_stock_data_service import FMPStockDataService
from app.services.financial_embedding_service import FinancialEmbeddingService
from app.services.subscription_service import SubscriptionService
from app.services.email_service import EmailService
from app.services.pdf_service import PDFService
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# 뉴스 수집 대상 종목 (news_service.py의 concept_uri_mapping과 동일)
POPULAR_SYMBOLS = [
    "AAPL", "GOOGL", "GOOG", "MSFT", "TSLA", "NVDA", "AMZN", "META", "NFLX",
    "JPM", "JNJ", "WMT", "XOM", "VZ", "PFE",
    "005930.KS", "000660.KS", "035420.KS", "035720.KS"
]

class NewsScheduler:
    """뉴스 크롤링 스케줄러"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.stock_data_service = FMPStockDataService.get_instance()
        self.embedding_service = FinancialEmbeddingService()
        self.subscription_service = SubscriptionService()
        self.email_service = EmailService()
        self.pdf_service = PDFService()
        self.is_running = False

    async def start(self):
        """스케줄러 시작"""
        if self.is_running:
            logger.warning("[WARN] Scheduler is already running")
            return

        logger.info("[INFO] Starting news crawling scheduler")

        # 1. 서버 시작 시 누락된 뉴스 확인 및 크롤링 (비동기로 즉시 실행)
        asyncio.create_task(self._recover_missing_news())

        # 2. 5시간마다 정기 크롤링 스케줄 등록
        self.scheduler.add_job(
            self._scheduled_crawl,
            trigger=IntervalTrigger(hours=5),
            id='news_crawl_5hours',
            name='News crawling every 5 hours',
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

        # 4. 매일 새벽 2시에 주식 지표 수집
        self.scheduler.add_job(
            self._collect_stock_indicators,
            trigger='cron',
            hour=2,
            minute=0,
            id='stock_indicators_daily',
            name='Collect stock indicators daily at 2 AM',
            replace_existing=True
        )

        # 5. 매일 새벽 3시에 주식 가격 이력 수집
        self.scheduler.add_job(
            self._collect_price_history,
            trigger='cron',
            hour=3,
            minute=0,
            id='price_history_daily',
            name='Collect price history daily at 3 AM',
            replace_existing=True
        )

        # 6. 매일 새벽 4시에 수집된 주식 데이터 Vector DB 임베딩
        self.scheduler.add_job(
            self._embed_stock_indicators,
            trigger='cron',
            hour=4,
            minute=0,
            id='stock_indicators_embedding_daily',
            name='Embed stock indicators to Pinecone daily at 4 AM',
            replace_existing=True
        )

        # 7. 매일 새벽 5시에 주가 이력 Vector DB 임베딩
        self.scheduler.add_job(
            self._embed_price_history,
            trigger='cron',
            hour=5,
            minute=0,
            id='price_history_embedding_daily',
            name='Embed price history to Pinecone daily at 5 AM',
            replace_existing=True
        )

        # 8. 매 시간마다 모든 구독 이메일 처리 (사용자 설정 시간 반영)
        # next_send_at이 현재 시간보다 이전인 모든 구독을 처리
        self.scheduler.add_job(
            self._process_all_pending_emails,
            trigger='cron',
            minute=0,  # 매 시간 정각에 실행
            id='all_email_subscriptions',
            name='Process all pending email subscriptions every hour',
            replace_existing=True
        )

        # 스케줄러 시작
        self.scheduler.start()
        self.is_running = True

        logger.info("[OK] News crawling scheduler started successfully")
        logger.info("[CONFIG] - Automatic news crawling every 5 hours")
        logger.info("[CONFIG] - Daily news cleanup at midnight")
        logger.info("[CONFIG] - Daily stock indicators collection at 2 AM")
        logger.info("[CONFIG] - Daily price history collection at 3 AM")
        logger.info("[CONFIG] - Daily stock indicators embedding at 4 AM")
        logger.info("[CONFIG] - Daily price history embedding at 5 AM")
        logger.info("[CONFIG] - Email subscriptions processing every hour (respects user-set send times)")

    async def stop(self):
        """스케줄러 중지"""
        if not self.is_running:
            return

        logger.info("[INFO] Stopping news crawling scheduler")
        self.scheduler.shutdown()

        self.is_running = False
        logger.info("[OK] Scheduler shutdown completed")

    async def _scheduled_crawl(self):
        """정기 크롤링 작업 (5시간마다 실행)"""
        crawl_start_time = datetime.now()

        try:
            logger.info("========== [SCHEDULED_CRAWL] News crawling started ==========")

            # 크롤링 시작 기록 저장
            supabase = get_supabase()
            crawl_record = supabase.table("news_crawl_history").insert({
                "symbol": "ALL",
                "crawl_type": "scheduled",
                "articles_collected": 0,
                "crawl_started_at": crawl_start_time.isoformat(),
                "status": "in_progress"
            }).execute()

            crawl_record_id = crawl_record.data[0]["id"] if crawl_record.data else None

            # 인기 종목 뉴스 수집
            total_collected = 0
            successful_symbols = []
            failed_symbols = []

            for symbol in POPULAR_SYMBOLS:
                try:
                    logger.info(f"[CRAWL] Collecting news for {symbol}...")
                    articles = await NewsService.crawl_and_save_stock_news(symbol, limit=200)

                    if articles:
                        total_collected += len(articles)
                        successful_symbols.append(symbol)
                        logger.info(f"[CRAWL] ✓ {symbol}: {len(articles)} articles collected")
                    else:
                        logger.warning(f"[CRAWL] ✗ {symbol}: No articles found")
                        failed_symbols.append(symbol)

                    # API 레이트 제한 고려하여 딜레이
                    await asyncio.sleep(1)

                except Exception as e:
                    logger.error(f"[CRAWL] ✗ {symbol}: Error - {str(e)}")
                    failed_symbols.append(symbol)

            logger.info(f"[CRAWL_RESULT] Total collected: {total_collected} articles")
            logger.info(f"[CRAWL_RESULT] Successful symbols: {len(successful_symbols)}")
            logger.info(f"[CRAWL_RESULT] Failed symbols: {len(failed_symbols)}")

            # 크롤링 완료 기록 업데이트
            if crawl_record_id:
                supabase.table("news_crawl_history").update({
                    "articles_collected": total_collected,
                    "crawl_completed_at": datetime.now().isoformat(),
                    "status": "completed"
                }).eq("id", crawl_record_id).execute()
                logger.info(f"[CRAWL_HISTORY] Crawl record saved (ID: {crawl_record_id})")

            logger.info("========== [SCHEDULED_CRAWL] Crawling completed ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during scheduled crawling: {str(e)}")

            # 오류 발생 시 크롤링 기록 업데이트
            if 'crawl_record_id' in locals() and crawl_record_id:
                try:
                    supabase.table("news_crawl_history").update({
                        "crawl_completed_at": datetime.now().isoformat(),
                        "status": "failed",
                        "error_message": str(e)
                    }).eq("id", crawl_record_id).execute()
                except:
                    pass

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

            # 3. 5시간 이상 경과했으면 즉시 크롤링
            if hours_passed >= 5:
                logger.info(f"[RECOVERY] More than 5 hours elapsed. Starting immediate crawl.")
                await self._scheduled_crawl()
            else:
                remaining_time = 5 - hours_passed
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

    async def _collect_stock_indicators(self):
        """주식 지표 수집 작업 (매일 새벽 2시)"""
        try:
            logger.info("========== [SCHEDULED] Stock indicators collection started ==========")

            result = await self.stock_data_service.collect_all_stock_indicators()

            logger.info(f"[STOCK_DATA] Indicators collected: {result.get('successful', 0)}/{result.get('total_symbols', 0)}")
            logger.info(f"[STOCK_DATA] Failed: {result.get('failed', 0)}")
            logger.info(f"[STOCK_DATA] Elapsed time: {result.get('elapsed_seconds', 0):.2f}s")

            if result.get('errors'):
                logger.warning(f"[STOCK_DATA] Errors: {result['errors'][:3]}")

            logger.info("========== [SCHEDULED] Stock indicators collection completed ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during stock indicators collection: {str(e)}")

    async def _collect_price_history(self):
        """주식 가격 이력 수집 작업 (매일 새벽 3시)"""
        try:
            logger.info("========== [SCHEDULED] Price history collection started ==========")

            result = await self.stock_data_service.collect_all_price_history()

            logger.info(f"[STOCK_DATA] Price history collected: {result.get('successful', 0)}/{result.get('total_symbols', 0)}")
            logger.info(f"[STOCK_DATA] Total records: {result.get('total_records', 0)}")
            logger.info(f"[STOCK_DATA] Failed: {result.get('failed', 0)}")
            logger.info(f"[STOCK_DATA] Elapsed time: {result.get('elapsed_seconds', 0):.2f}s")

            if result.get('errors'):
                logger.warning(f"[STOCK_DATA] Errors: {result['errors'][:3]}")

            logger.info("========== [SCHEDULED] Price history collection completed ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during price history collection: {str(e)}")

    async def trigger_manual_crawl(self, symbols: List[str] = None) -> Dict:
        """수동 크롤링 트리거 (API로 호출 가능)"""
        try:
            target_symbols = symbols if symbols else POPULAR_SYMBOLS
            logger.info(f"[MANUAL_CRAWL] Starting manual crawl: {len(target_symbols)} symbols")

            total_collected = 0
            results = []

            for symbol in target_symbols:
                try:
                    logger.info(f"[MANUAL_CRAWL] Collecting news for {symbol}...")
                    articles = await NewsService.crawl_and_save_stock_news(symbol, limit=200)

                    collected_count = len(articles) if articles else 0
                    total_collected += collected_count

                    results.append({
                        "symbol": symbol,
                        "collected_count": collected_count,
                        "status": "success"
                    })

                    logger.info(f"[MANUAL_CRAWL] Symbol {symbol}: {collected_count} articles collected")

                    # API 레이트 제한 고려하여 딜레이
                    await asyncio.sleep(1)

                except Exception as e:
                    logger.error(f"[ERROR] Symbol {symbol} crawl failed: {str(e)}")
                    results.append({
                        "symbol": symbol,
                        "collected_count": 0,
                        "status": "error",
                        "error": str(e)
                    })

            return {
                "status": "completed",
                "total_collected": total_collected,
                "results": results
            }

        except Exception as e:
            logger.error(f"[ERROR] Error during manual crawl: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def trigger_manual_stock_indicators(self, symbols: List[str] = None, force_refresh: bool = False) -> Dict:
        """수동 주식 지표 수집 트리거"""
        try:
            logger.info(f"[MANUAL_STOCK_DATA] Starting manual stock indicators collection")
            return await self.stock_data_service.collect_all_stock_indicators(symbols, force_refresh)
        except Exception as e:
            logger.error(f"[ERROR] Error during manual stock indicators collection: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def trigger_manual_price_history(self, symbols: List[str] = None, force_refresh: bool = False) -> Dict:
        """수동 주식 가격 이력 수집 트리거"""
        try:
            logger.info(f"[MANUAL_STOCK_DATA] Starting manual price history collection")
            return await self.stock_data_service.collect_all_price_history(symbols, force_refresh)
        except Exception as e:
            logger.error(f"[ERROR] Error during manual price history collection: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def trigger_manual_full_stock_data(self, symbols: List[str] = None, force_refresh: bool = False) -> Dict:
        """수동 전체 주식 데이터 수집 트리거"""
        try:
            logger.info(f"[MANUAL_STOCK_DATA] Starting manual full stock data collection")
            return await self.stock_data_service.collect_full_stock_data(symbols, force_refresh)
        except Exception as e:
            logger.error(f"[ERROR] Error during manual full stock data collection: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _embed_stock_indicators(self):
        """주식 지표 Vector DB 임베딩 (매일 새벽 4시)"""
        try:
            logger.info("========== [SCHEDULED_EMBEDDING] Stock indicators embedding started ==========")

            # DB에서 모든 종목 조회
            supabase = get_supabase()
            result = supabase.table("stock_indicators").select("symbol").execute()
            symbols = [row.get("symbol") for row in result.data if row.get("symbol")]

            if not symbols:
                logger.warning("[EMBEDDING] No symbols found for embedding")
                return

            logger.info(f"[EMBEDDING] Embedding {len(symbols)} stock indicators to Pinecone")

            successful = 0
            failed = 0

            for symbol in symbols:
                try:
                    embed_result = await self.embedding_service.embed_stock_indicators(symbol)
                    if embed_result.get("status") == "success":
                        successful += 1
                    else:
                        failed += 1
                        logger.warning(f"[EMBEDDING] Failed to embed {symbol}: {embed_result.get('reason')}")
                except Exception as e:
                    failed += 1
                    logger.warning(f"[EMBEDDING] Error embedding {symbol}: {str(e)}")

            logger.info(f"[EMBEDDING] Stock indicators embedding completed: {successful} successful, {failed} failed")
            logger.info("========== [SCHEDULED_EMBEDDING] Stock indicators embedding finished ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during stock indicators embedding: {str(e)}")

    async def _embed_price_history(self):
        """주가 이력 Vector DB 임베딩 (매일 새벽 5시)"""
        try:
            logger.info("========== [SCHEDULED_EMBEDDING] Price history embedding started ==========")

            # DB에서 모든 종목 조회
            supabase = get_supabase()
            result = supabase.table("stock_price_history").select("symbol").execute()
            symbols_set = set(row.get("symbol") for row in result.data if row.get("symbol"))
            symbols = sorted(list(symbols_set))

            if not symbols:
                logger.warning("[EMBEDDING] No symbols found for price history embedding")
                return

            logger.info(f"[EMBEDDING] Embedding {len(symbols)} price histories to Pinecone")

            successful = 0
            failed = 0
            total_chunks = 0

            for symbol in symbols:
                try:
                    embed_result = await self.embedding_service.embed_price_history(symbol, chunk_size=30)
                    if embed_result.get("status") == "success":
                        successful += 1
                        chunks = embed_result.get("chunks_created", 0)
                        total_chunks += chunks
                    else:
                        failed += 1
                        logger.warning(f"[EMBEDDING] Failed to embed price history for {symbol}: {embed_result.get('reason')}")
                except Exception as e:
                    failed += 1
                    logger.warning(f"[EMBEDDING] Error embedding price history for {symbol}: {str(e)}")

            logger.info(f"[EMBEDDING] Price history embedding completed: {successful} successful, {failed} failed, {total_chunks} chunks created")
            logger.info("========== [SCHEDULED_EMBEDDING] Price history embedding finished ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during price history embedding: {str(e)}")

    async def trigger_manual_embedding_stock_indicators(self, symbols: List[str] = None) -> Dict:
        """수동 주식 지표 임베딩 트리거"""
        try:
            logger.info(f"[MANUAL_EMBEDDING] Starting manual stock indicators embedding")

            # 종목 결정
            if symbols:
                embed_symbols = [s.upper() for s in symbols]
            else:
                supabase = get_supabase()
                result = supabase.table("stock_indicators").select("symbol").execute()
                embed_symbols = [row.get("symbol") for row in result.data if row.get("symbol")]

            results = {
                "type": "stock_indicators",
                "total": len(embed_symbols),
                "successful": 0,
                "failed": 0,
                "details": []
            }

            for symbol in embed_symbols:
                try:
                    embed_result = await self.embedding_service.embed_stock_indicators(symbol)
                    if embed_result.get("status") == "success":
                        results["successful"] += 1
                    else:
                        results["failed"] += 1
                    results["details"].append({
                        "symbol": symbol,
                        "status": embed_result.get("status"),
                        "vector_id": embed_result.get("vector_id")
                    })
                except Exception as e:
                    results["failed"] += 1
                    results["details"].append({
                        "symbol": symbol,
                        "status": "error",
                        "error": str(e)
                    })

            logger.info(f"[MANUAL_EMBEDDING] Completed: {results['successful']}/{len(embed_symbols)} successful")
            return results

        except Exception as e:
            logger.error(f"[ERROR] Error during manual stock indicators embedding: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def trigger_manual_embedding_price_history(self, symbols: List[str] = None, chunk_size: int = 30) -> Dict:
        """수동 주가 이력 임베딩 트리거"""
        try:
            logger.info(f"[MANUAL_EMBEDDING] Starting manual price history embedding")

            # 종목 결정
            if symbols:
                embed_symbols = [s.upper() for s in symbols]
            else:
                supabase = get_supabase()
                result = supabase.table("stock_price_history").select("symbol").execute()
                symbols_set = set(row.get("symbol") for row in result.data if row.get("symbol"))
                embed_symbols = sorted(list(symbols_set))

            results = {
                "type": "price_history",
                "total": len(embed_symbols),
                "successful": 0,
                "failed": 0,
                "total_chunks": 0,
                "details": []
            }

            for symbol in embed_symbols:
                try:
                    embed_result = await self.embedding_service.embed_price_history(symbol, chunk_size=chunk_size)
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

            logger.info(f"[MANUAL_EMBEDDING] Completed: {results['successful']}/{len(embed_symbols)} successful, {results['total_chunks']} chunks")
            return results

        except Exception as e:
            logger.error(f"[ERROR] Error during manual price history embedding: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _process_all_pending_emails(self):
        """모든 대기 중인 구독 이메일 처리 (매 시간마다 실행)"""
        try:
            logger.info("========== [SCHEDULED_EMAIL] Checking pending email subscriptions ==========")

            # next_send_at이 현재 시간보다 이전인 모든 활성 구독 조회
            subscriptions = await self.subscription_service.get_pending_subscriptions()

            if not subscriptions:
                logger.info("[EMAIL] No pending subscriptions to process")
                return

            logger.info(f"[EMAIL] Found {len(subscriptions)} pending subscriptions")

            # 빈도별로 그룹화
            daily_subs = [s for s in subscriptions if s.get('frequency') == 'daily']
            weekly_subs = [s for s in subscriptions if s.get('frequency') == 'weekly']
            monthly_subs = [s for s in subscriptions if s.get('frequency') == 'monthly']

            # 각 빈도별로 처리
            if daily_subs:
                logger.info(f"[EMAIL] Processing {len(daily_subs)} daily subscriptions")
                await self._send_subscription_emails(daily_subs, 'Daily')

            if weekly_subs:
                logger.info(f"[EMAIL] Processing {len(weekly_subs)} weekly subscriptions")
                await self._send_subscription_emails(weekly_subs, 'Weekly')

            if monthly_subs:
                logger.info(f"[EMAIL] Processing {len(monthly_subs)} monthly subscriptions")
                await self._send_subscription_emails(monthly_subs, 'Monthly')

            logger.info("========== [SCHEDULED_EMAIL] All pending subscriptions processed ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during email processing: {str(e)}")

    async def _send_subscription_emails(self, subscriptions: list, frequency_label: str):
        """구독 이메일 발송 (공통 로직)"""
        sent_count = 0
        failed_count = 0

        for sub in subscriptions:
            try:
                symbols = sub.get('symbols', [])
                report_types = sub.get('report_types', ['news'])

                logger.info(f"[EMAIL] Processing {frequency_label.lower()} subscription {sub.get('id')} for {', '.join(symbols)}")

                # 뉴스 데이터 수집
                news_data = []
                pdf_url = None

                # 빈도별 뉴스 개수 설정
                news_per_symbol = {
                    'Daily': 5,
                    'Weekly': 10,
                    'Monthly': 20
                }.get(frequency_label, 5)

                pdf_news_limit = {
                    'Daily': 20,
                    'Weekly': 30,
                    'Monthly': 50
                }.get(frequency_label, 20)

                # 각 종목별 최신 뉴스 수집
                for symbol in symbols[:3]:  # 최대 3개 종목
                    try:
                        news_service = NewsService()
                        symbol_news = await news_service.get_news_by_symbol(symbol, limit=news_per_symbol)

                        if symbol_news:
                            news_data.extend(symbol_news)
                            logger.info(f"[EMAIL] Collected {len(symbol_news)} news for {symbol}")
                    except Exception as news_error:
                        logger.warning(f"[EMAIL] Failed to collect news for {symbol}: {str(news_error)}")

                # PDF 생성 (뉴스 리포트)
                if news_data and 'news' in report_types:
                    try:
                        main_symbol = symbols[0]
                        pdf_result = await self.pdf_service.generate_news_report_pdf(
                            user_id=sub.get('user_id'),
                            symbol=main_symbol,
                            news_data=news_data[:pdf_news_limit],
                            analysis_summary=f"{frequency_label} report for {', '.join(symbols)}"
                        )

                        if pdf_result.get('status') != 'error':
                            pdf_url = pdf_result.get('file_url')
                            logger.info(f"[EMAIL] PDF generated: {pdf_url}")
                    except Exception as pdf_error:
                        logger.warning(f"[EMAIL] PDF generation failed: {str(pdf_error)}")

                # 리포트 데이터 생성
                positive_count = sum(1 for n in news_data if n.get('sentiment') == 'positive')
                negative_count = sum(1 for n in news_data if n.get('sentiment') == 'negative')
                neutral_count = len(news_data) - positive_count - negative_count

                period_text = {
                    'Daily': 'today',
                    'Weekly': 'the past 7 days',
                    'Monthly': 'the past 30 days'
                }.get(frequency_label, 'today')

                report_data = {
                    'symbol': ', '.join(symbols[:3]),
                    'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'executive_summary': f'{frequency_label} investment report for {", ".join(symbols[:3])} with {len(news_data)} news articles from {period_text}.',
                    'positive_count': positive_count,
                    'neutral_count': neutral_count,
                    'negative_count': negative_count,
                    'web_report_url': f'https://yourdomain.com/reports/{sub.get("id")}'
                }

                # 이메일 발송 (PDF 첨부)
                subject_date = {
                    'Daily': datetime.now().strftime('%Y-%m-%d'),
                    'Weekly': f"Week of {datetime.now().strftime('%Y-%m-%d')}",
                    'Monthly': datetime.now().strftime('%B %Y')
                }.get(frequency_label, datetime.now().strftime('%Y-%m-%d'))

                result = await self.email_service.send_report_email(
                    to=sub.get('email'),
                    subject=f"{frequency_label} Investment Report - {subject_date}",
                    report_data=report_data,
                    subscription_id=sub.get('id'),
                    attachment_url=pdf_url
                )

                if result.get('status') == 'success':
                    sent_count += 1
                    # 다음 발송 시각 업데이트
                    await self.subscription_service.update_next_send_time(sub.get('id'))
                    logger.info(f"[EMAIL] Email sent successfully to {sub.get('email')}")
                else:
                    failed_count += 1
                    logger.warning(f"[EMAIL] Failed to send email to {sub.get('email')}")

                # 레이트 제한 고려
                await asyncio.sleep(0.5)

            except Exception as e:
                failed_count += 1
                logger.error(f"[EMAIL] Error processing subscription {sub.get('id')}: {str(e)}")

        logger.info(f"[EMAIL] {frequency_label} email processing completed: {sent_count} sent, {failed_count} failed")

    async def _process_daily_emails(self):
        """일일 구독 이메일 처리"""
        try:
            logger.info("========== [SCHEDULED_EMAIL] Daily email subscriptions processing started ==========")

            # 오늘 발송할 일일 구독 조회
            subscriptions = await self.subscription_service.get_pending_subscriptions('daily')

            if not subscriptions:
                logger.info("[EMAIL] No daily subscriptions to process")
                return

            logger.info(f"[EMAIL] Processing {len(subscriptions)} daily subscriptions")

            sent_count = 0
            failed_count = 0

            for sub in subscriptions:
                try:
                    symbols = sub.get('symbols', [])
                    report_types = sub.get('report_types', ['news'])

                    logger.info(f"[EMAIL] Processing subscription {sub.get('id')} for {', '.join(symbols)}")

                    # 실제 뉴스 데이터 수집
                    news_data = []
                    analysis_summary = None
                    pdf_url = None

                    # 각 종목별 최신 뉴스 수집
                    for symbol in symbols[:3]:  # 최대 3개 종목
                        try:
                            news_service = NewsService()
                            symbol_news = await news_service.get_news_by_symbol(symbol, limit=5)

                            if symbol_news:
                                news_data.extend(symbol_news)
                                logger.info(f"[EMAIL] Collected {len(symbol_news)} news for {symbol}")
                        except Exception as news_error:
                            logger.warning(f"[EMAIL] Failed to collect news for {symbol}: {str(news_error)}")

                    # PDF 생성 (뉴스 리포트)
                    if news_data and 'news' in report_types:
                        try:
                            # 첫 번째 종목으로 PDF 생성
                            main_symbol = symbols[0]
                            pdf_result = await self.pdf_service.generate_news_report_pdf(
                                user_id=sub.get('user_id'),
                                symbol=main_symbol,
                                news_data=news_data[:20],  # 최대 20개 뉴스
                                analysis_summary=f"Daily report for {', '.join(symbols)}"
                            )

                            if pdf_result.get('status') != 'error':
                                pdf_url = pdf_result.get('file_url')
                                logger.info(f"[EMAIL] PDF generated: {pdf_url}")
                        except Exception as pdf_error:
                            logger.warning(f"[EMAIL] PDF generation failed: {str(pdf_error)}")

                    # 리포트 데이터 생성
                    positive_count = sum(1 for n in news_data if n.get('sentiment') == 'positive')
                    negative_count = sum(1 for n in news_data if n.get('sentiment') == 'negative')
                    neutral_count = len(news_data) - positive_count - negative_count

                    report_data = {
                        'symbol': ', '.join(symbols[:3]),
                        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        'executive_summary': f'Daily investment report for {", ".join(symbols[:3])} with {len(news_data)} news articles analyzed.',
                        'positive_count': positive_count,
                        'neutral_count': neutral_count,
                        'negative_count': negative_count,
                        'web_report_url': f'https://yourdomain.com/reports/{sub.get("id")}'
                    }

                    # 이메일 발송 (PDF 첨부)
                    result = await self.email_service.send_report_email(
                        to=sub.get('email'),
                        subject=f"Daily Investment Report - {datetime.now().strftime('%Y-%m-%d')}",
                        report_data=report_data,
                        subscription_id=sub.get('id'),
                        attachment_url=pdf_url  # PDF URL 첨부
                    )

                    if result.get('status') == 'success':
                        sent_count += 1
                        # 다음 발송 시각 업데이트
                        await self.subscription_service.update_next_send_time(sub.get('id'))
                    else:
                        failed_count += 1
                        logger.warning(f"[EMAIL] Failed to send email to {sub.get('email')}")

                    # 레이트 제한 고려
                    await asyncio.sleep(0.5)

                except Exception as e:
                    failed_count += 1
                    logger.error(f"[EMAIL] Error processing subscription {sub.get('id')}: {str(e)}")

            logger.info(f"[EMAIL] Daily email processing completed: {sent_count} sent, {failed_count} failed")
            logger.info("========== [SCHEDULED_EMAIL] Daily email processing finished ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during daily email processing: {str(e)}")

    async def _process_weekly_emails(self):
        """주간 구독 이메일 처리"""
        try:
            logger.info("========== [SCHEDULED_EMAIL] Weekly email subscriptions processing started ==========")

            subscriptions = await self.subscription_service.get_pending_subscriptions('weekly')

            if not subscriptions:
                logger.info("[EMAIL] No weekly subscriptions to process")
                return

            logger.info(f"[EMAIL] Processing {len(subscriptions)} weekly subscriptions")

            sent_count = 0
            failed_count = 0

            for sub in subscriptions:
                try:
                    symbols = sub.get('symbols', [])
                    report_types = sub.get('report_types', ['news'])

                    logger.info(f"[EMAIL] Processing weekly subscription {sub.get('id')} for {', '.join(symbols)}")

                    # 지난 7일간 뉴스 수집
                    news_data = []
                    pdf_url = None

                    for symbol in symbols[:3]:
                        try:
                            news_service = NewsService()
                            symbol_news = await news_service.get_news_by_symbol(symbol, limit=10)
                            if symbol_news:
                                news_data.extend(symbol_news)
                        except Exception as news_error:
                            logger.warning(f"[EMAIL] Failed to collect news for {symbol}: {str(news_error)}")

                    # PDF 생성
                    if news_data and 'news' in report_types:
                        try:
                            pdf_result = await self.pdf_service.generate_news_report_pdf(
                                user_id=sub.get('user_id'),
                                symbol=symbols[0],
                                news_data=news_data[:30],
                                analysis_summary=f"Weekly report for {', '.join(symbols)}"
                            )
                            if pdf_result.get('status') != 'error':
                                pdf_url = pdf_result.get('file_url')
                        except Exception as pdf_error:
                            logger.warning(f"[EMAIL] PDF generation failed: {str(pdf_error)}")

                    positive_count = sum(1 for n in news_data if n.get('sentiment') == 'positive')
                    negative_count = sum(1 for n in news_data if n.get('sentiment') == 'negative')
                    neutral_count = len(news_data) - positive_count - negative_count

                    report_data = {
                        'symbol': ', '.join(symbols[:3]),
                        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        'executive_summary': f'Weekly investment report for {", ".join(symbols[:3])} with {len(news_data)} news articles from the past 7 days.',
                        'positive_count': positive_count,
                        'neutral_count': neutral_count,
                        'negative_count': negative_count,
                        'web_report_url': f'https://yourdomain.com/reports/{sub.get("id")}'
                    }

                    result = await self.email_service.send_report_email(
                        to=sub.get('email'),
                        subject=f"Weekly Investment Report - Week of {datetime.now().strftime('%Y-%m-%d')}",
                        report_data=report_data,
                        subscription_id=sub.get('id'),
                        attachment_url=pdf_url
                    )

                    if result.get('status') == 'success':
                        sent_count += 1
                        await self.subscription_service.update_next_send_time(sub.get('id'))
                    else:
                        failed_count += 1

                    await asyncio.sleep(0.5)

                except Exception as e:
                    failed_count += 1
                    logger.error(f"[EMAIL] Error processing subscription {sub.get('id')}: {str(e)}")

            logger.info(f"[EMAIL] Weekly email processing completed: {sent_count} sent, {failed_count} failed")
            logger.info("========== [SCHEDULED_EMAIL] Weekly email processing finished ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during weekly email processing: {str(e)}")

    async def _process_monthly_emails(self):
        """월간 구독 이메일 처리"""
        try:
            logger.info("========== [SCHEDULED_EMAIL] Monthly email subscriptions processing started ==========")

            subscriptions = await self.subscription_service.get_pending_subscriptions('monthly')

            if not subscriptions:
                logger.info("[EMAIL] No monthly subscriptions to process")
                return

            logger.info(f"[EMAIL] Processing {len(subscriptions)} monthly subscriptions")

            sent_count = 0
            failed_count = 0

            for sub in subscriptions:
                try:
                    symbols = sub.get('symbols', [])
                    report_types = sub.get('report_types', ['news'])

                    logger.info(f"[EMAIL] Processing monthly subscription {sub.get('id')} for {', '.join(symbols)}")

                    # 지난 30일간 뉴스 수집
                    news_data = []
                    pdf_url = None

                    for symbol in symbols[:3]:
                        try:
                            news_service = NewsService()
                            symbol_news = await news_service.get_news_by_symbol(symbol, limit=20)
                            if symbol_news:
                                news_data.extend(symbol_news)
                        except Exception as news_error:
                            logger.warning(f"[EMAIL] Failed to collect news for {symbol}: {str(news_error)}")

                    # PDF 생성
                    if news_data and 'news' in report_types:
                        try:
                            pdf_result = await self.pdf_service.generate_news_report_pdf(
                                user_id=sub.get('user_id'),
                                symbol=symbols[0],
                                news_data=news_data[:50],
                                analysis_summary=f"Monthly report for {', '.join(symbols)}"
                            )
                            if pdf_result.get('status') != 'error':
                                pdf_url = pdf_result.get('file_url')
                        except Exception as pdf_error:
                            logger.warning(f"[EMAIL] PDF generation failed: {str(pdf_error)}")

                    positive_count = sum(1 for n in news_data if n.get('sentiment') == 'positive')
                    negative_count = sum(1 for n in news_data if n.get('sentiment') == 'negative')
                    neutral_count = len(news_data) - positive_count - negative_count

                    report_data = {
                        'symbol': ', '.join(symbols[:3]),
                        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        'executive_summary': f'Monthly investment report for {", ".join(symbols[:3])} with {len(news_data)} news articles from the past 30 days.',
                        'positive_count': positive_count,
                        'neutral_count': neutral_count,
                        'negative_count': negative_count,
                        'web_report_url': f'https://yourdomain.com/reports/{sub.get("id")}'
                    }

                    result = await self.email_service.send_report_email(
                        to=sub.get('email'),
                        subject=f"Monthly Investment Report - {datetime.now().strftime('%B %Y')}",
                        report_data=report_data,
                        subscription_id=sub.get('id'),
                        attachment_url=pdf_url
                    )

                    if result.get('status') == 'success':
                        sent_count += 1
                        await self.subscription_service.update_next_send_time(sub.get('id'))
                    else:
                        failed_count += 1

                    await asyncio.sleep(0.5)

                except Exception as e:
                    failed_count += 1
                    logger.error(f"[EMAIL] Error processing subscription {sub.get('id')}: {str(e)}")

            logger.info(f"[EMAIL] Monthly email processing completed: {sent_count} sent, {failed_count} failed")
            logger.info("========== [SCHEDULED_EMAIL] Monthly email processing finished ==========")

        except Exception as e:
            logger.error(f"[ERROR] Error during monthly email processing: {str(e)}")


# 전역 스케줄러 인스턴스
_scheduler_instance = None

def get_scheduler() -> NewsScheduler:
    """스케줄러 싱글톤 인스턴스 반환"""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = NewsScheduler()
    return _scheduler_instance
