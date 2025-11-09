"""
FMP (Financial Modeling Prep) 종목 데이터 수집 서비스
주가 지표(Stock Indicators)와 가격 이력(Price History) 수집 및 저장
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import aiohttp
import requests
import time

from app.core.config import settings
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class FMPStockDataService:
    """FMP API를 통한 주식 데이터 수집 서비스"""

    BASE_URL = "https://financialmodelingprep.com/stable"

    # 레이트 제한 설정 (FMP 프리 티어: 250 calls/day)
    MAX_CONCURRENT_REQUESTS = 5  # 동시 요청 수 제한
    REQUEST_DELAY = 0.3  # 요청 간 딜레이 (초)

    _instance = None
    _semaphore = None

    def __init__(self):
        self.api_key = settings.fmp_api_key
        if not self.api_key:
            logger.warning("FMP_API_KEY is not configured")
        # Semaphore는 클래스 레벨에서 관리
        if FMPStockDataService._semaphore is None:
            try:
                FMPStockDataService._semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_REQUESTS)
            except RuntimeError:
                # event loop가 없으면 나중에 생성
                FMPStockDataService._semaphore = None

    @property
    def semaphore(self):
        """Semaphore를 동적으로 생성/반환"""
        if FMPStockDataService._semaphore is None:
            try:
                FMPStockDataService._semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_REQUESTS)
            except RuntimeError:
                # 새로운 event loop 생성
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                FMPStockDataService._semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_REQUESTS)
        return FMPStockDataService._semaphore

    @staticmethod
    def get_instance():
        """싱글톤 인스턴스 반환"""
        if FMPStockDataService._instance is None:
            FMPStockDataService._instance = FMPStockDataService()
        return FMPStockDataService._instance

    async def collect_all_stock_indicators(
        self,
        symbols: Optional[List[str]] = None,
        force_refresh: bool = False
    ) -> Dict:
        """
        모든 종목의 주식 지표 수집

        Args:
            symbols: 수집할 종목 리스트 (None이면 기본 100개)
            force_refresh: True이면 이미 있는 데이터도 다시 가져오기

        Returns:
            수집 결과 요약
        """
        try:
            if symbols is None:
                symbols = self._get_default_100_symbols()

            logger.info(f"주식 지표 수집 시작: {len(symbols)}개 종목")

            # 동기화 이력 기록 시작
            start_time = datetime.now()

            # 이미 업데이트된 종목 필터링
            if not force_refresh:
                symbols = await self._filter_already_synced_symbols(symbols, 'indicators')
                logger.info(f"동기화할 종목: {len(symbols)}개 (이미 있는 종목 제외)")

            if not symbols:
                logger.info("동기화할 종목이 없습니다")
                return {
                    "status": "success",
                    "message": "동기화할 종목이 없습니다",
                    "total_symbols": 0,
                    "successful": 0,
                    "failed": 0
                }

            # 병렬로 데이터 수집
            tasks = [self._collect_single_indicator(symbol) for symbol in symbols]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 결과 처리
            successful = 0
            failed = 0
            errors = []

            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"종목 {symbols[i]} 지표 수집 실패: {str(result)}")
                    failed += 1
                    errors.append(f"{symbols[i]}: {str(result)}")
                elif result:
                    successful += 1

            # 동기화 이력 기록 (주석: stock_data_sync_history 테이블이 없을 경우)
            # await self._record_sync_history(
            #     symbol=None,
            #     sync_type='indicators',
            #     status='completed',
            #     records_processed=successful,
            #     error_message='; '.join(errors[:10]) if errors else None
            # )

            elapsed_time = (datetime.now() - start_time).total_seconds()

            logger.info(f"주식 지표 수집 완료: {successful}/{len(symbols)} 성공 ({elapsed_time:.2f}초)")

            return {
                "status": "success",
                "total_symbols": len(symbols),
                "successful": successful,
                "failed": failed,
                "elapsed_seconds": elapsed_time,
                "errors": errors[:10] if errors else []
            }

        except Exception as e:
            logger.error(f"주식 지표 수집 중 오류: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "successful": 0,
                "failed": len(symbols) if symbols else 0
            }

    async def collect_all_price_history(
        self,
        symbols: Optional[List[str]] = None,
        force_refresh: bool = False
    ) -> Dict:
        """
        모든 종목의 가격 이력 수집 (5년)

        Args:
            symbols: 수집할 종목 리스트 (None이면 기본 100개)
            force_refresh: True이면 이미 있는 데이터도 다시 가져오기

        Returns:
            수집 결과 요약
        """
        try:
            if symbols is None:
                symbols = self._get_default_100_symbols()

            logger.info(f"가격 이력 수집 시작: {len(symbols)}개 종목 (5년)")

            # 동기화 이력 기록 시작
            start_time = datetime.now()

            # 이미 업데이트된 종목 필터링
            if not force_refresh:
                symbols = await self._filter_already_synced_symbols(symbols, 'price_history')
                logger.info(f"동기화할 종목: {len(symbols)}개 (이미 있는 종목 제외)")

            if not symbols:
                logger.info("동기화할 종목이 없습니다")
                return {
                    "status": "success",
                    "message": "동기화할 종목이 없습니다",
                    "total_symbols": 0,
                    "successful": 0,
                    "failed": 0
                }

            # 병렬로 데이터 수집
            tasks = [self._collect_single_price_history(symbol) for symbol in symbols]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 결과 처리
            successful = 0
            failed = 0
            total_records = 0
            errors = []

            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"종목 {symbols[i]} 가격 이력 수집 실패: {str(result)}")
                    failed += 1
                    errors.append(f"{symbols[i]}: {str(result)}")
                elif result and result.get('success'):
                    successful += 1
                    total_records += result.get('records', 0)

            # 동기화 이력 기록 (주석: stock_data_sync_history 테이블이 없을 경우)
            # await self._record_sync_history(
            #     symbol=None,
            #     sync_type='price_history',
            #     status='completed',
            #     records_processed=total_records,
            #     error_message='; '.join(errors[:10]) if errors else None
            # )

            elapsed_time = (datetime.now() - start_time).total_seconds()

            logger.info(f"가격 이력 수집 완료: {successful}/{len(symbols)} 성공, {total_records}개 레코드 ({elapsed_time:.2f}초)")

            return {
                "status": "success",
                "total_symbols": len(symbols),
                "successful": successful,
                "failed": failed,
                "total_records": total_records,
                "elapsed_seconds": elapsed_time,
                "errors": errors[:10] if errors else []
            }

        except Exception as e:
            logger.error(f"가격 이력 수집 중 오류: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "successful": 0,
                "failed": len(symbols) if symbols else 0
            }

    async def collect_full_stock_data(
        self,
        symbols: Optional[List[str]] = None,
        force_refresh: bool = False
    ) -> Dict:
        """
        주식 지표와 가격 이력 모두 수집

        Args:
            symbols: 수집할 종목 리스트
            force_refresh: 기존 데이터 무시하고 다시 수집

        Returns:
            수집 결과 요약
        """
        try:
            logger.info("전체 주식 데이터 수집 시작")

            start_time = datetime.now()

            # 지표 수집
            indicators_result = await self.collect_all_stock_indicators(symbols, force_refresh)

            # 가격 이력 수집
            price_result = await self.collect_all_price_history(symbols, force_refresh)

            elapsed_time = (datetime.now() - start_time).total_seconds()

            return {
                "status": "success",
                "indicators": indicators_result,
                "price_history": price_result,
                "total_elapsed_seconds": elapsed_time
            }

        except Exception as e:
            logger.error(f"전체 주식 데이터 수집 중 오류: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _make_api_request(self, url: str, max_retries: int = 3) -> Optional[Dict]:
        """
        레이트 제한을 고려한 API 요청

        Args:
            url: API URL
            max_retries: 최대 재시도 횟수

        Returns:
            API 응답 또는 None (실패 시)
        """
        async with self.semaphore:
            for attempt in range(max_retries):
                try:
                    await asyncio.sleep(self.REQUEST_DELAY)  # 요청 간 딜레이

                    async with aiohttp.ClientSession() as session:
                        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                            if response.status == 200:
                                return await response.json()
                            elif response.status == 429:
                                # Rate limit - exponential backoff
                                wait_time = 2 ** attempt
                                logger.warning(f"Rate limit (429) - {wait_time}초 대기 후 재시도")
                                await asyncio.sleep(wait_time)
                                continue
                            elif response.status == 404:
                                return None
                            else:
                                logger.warning(f"API 오류: {response.status}")
                                return None
                except asyncio.TimeoutError:
                    logger.warning(f"API 타임아웃 - 재시도 {attempt + 1}/{max_retries}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1)
                    continue
                except Exception as e:
                    logger.error(f"API 요청 오류: {str(e)}")
                    return None

            return None

    async def _collect_single_indicator(self, symbol: str) -> bool:
        """단일 종목의 지표 수집"""
        try:
            # 주요 지표 가져오기
            key_metrics = await self._get_key_metrics(symbol)
            financial_ratios = await self._get_financial_ratios(symbol)
            financial_scores = await self._get_financial_scores(symbol)

            if not key_metrics:
                logger.warning(f"종목 {symbol}의 주요 지표를 가져올 수 없습니다")
                return False

            # 데이터 통합 (실제 DB 컬럼에 맞게)
            indicator_data = {
                'symbol': symbol,
                'company_name': key_metrics.get('companyName'),
                'current_price': key_metrics.get('price'),
                'previous_close': key_metrics.get('priceAvg50'),  # 근사값
                'market_cap': key_metrics.get('marketCap'),
                'pe_ratio': key_metrics.get('peRatio'),
                'eps': key_metrics.get('eps'),
                'dividend_yield': key_metrics.get('dividendYield'),
                'fifty_two_week_high': key_metrics.get('52WeekHigh'),
                'fifty_two_week_low': key_metrics.get('52WeekLow'),
                'currency': key_metrics.get('currency'),
                'exchange': key_metrics.get('exchange'),
                'industry': key_metrics.get('industry'),
                'sector': key_metrics.get('sector'),
                'rsi': None,  # RSI는 일단 NULL (프리미엄 기능)
            }

            # 재무 지표 추가
            if financial_ratios:
                indicator_data.update({
                    'roe': financial_ratios.get('ROE'),
                    'roa': financial_ratios.get('ROA'),
                    'current_ratio': financial_ratios.get('currentRatio'),
                    'quick_ratio': financial_ratios.get('quickRatio'),
                    'debt_to_equity': financial_ratios.get('debtEquityRatio'),
                    'debt_ratio': financial_ratios.get('debtRatio'),
                    'profit_margin': financial_ratios.get('netProfitMargin'),
                })

            # DB에 저장
            await self._save_indicators_to_db(indicator_data)

            logger.debug(f"종목 {symbol} 지표 수집 완료")
            return True

        except Exception as e:
            logger.error(f"종목 {symbol} 지표 수집 오류: {str(e)}")
            return False

    async def _collect_single_price_history(self, symbol: str) -> Dict:
        """단일 종목의 가격 이력 수집 (5년)"""
        try:
            # 5년 가격 이력 가져오기
            price_data = await self._get_historical_prices(symbol)

            if not price_data:
                logger.debug(f"종목 {symbol}의 가격 이력을 가져올 수 없습니다 (빈 결과)")
                return {"success": False, "records": 0}

            # DB에 저장
            saved_count = await self._save_price_history_to_db(symbol, price_data)

            if saved_count > 0:
                logger.debug(f"종목 {symbol} 가격 이력 {saved_count}개 저장 완료")

            return {
                "success": saved_count > 0,
                "records": saved_count,
                "symbol": symbol
            }

        except Exception as e:
            logger.error(f"종목 {symbol} 가격 이력 수집 오류: {str(e)}")
            return {"success": False, "records": 0}

    async def _get_key_metrics(self, symbol: str) -> Optional[Dict]:
        """주요 지표 API 호출"""
        try:
            url = f"{self.BASE_URL}/key-metrics?symbol={symbol}&apikey={self.api_key}"
            data = await self._make_api_request(url)

            if data:
                # API는 리스트로 반환, 최신 데이터 가져오기
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
            return None
        except Exception as e:
            logger.error(f"종목 {symbol} 주요 지표 조회 오류: {str(e)}")
            return None

    async def _get_financial_ratios(self, symbol: str) -> Optional[Dict]:
        """재무 비율 API 호출"""
        try:
            url = f"{self.BASE_URL}/ratios?symbol={symbol}&apikey={self.api_key}"
            data = await self._make_api_request(url)

            if data and isinstance(data, list) and len(data) > 0:
                return data[0]
            return None
        except Exception as e:
            logger.warning(f"종목 {symbol} 재무 비율 조회 오류: {str(e)}")
            return None

    async def _get_financial_scores(self, symbol: str) -> Optional[Dict]:
        """재무 스코어 API 호출"""
        try:
            url = f"{self.BASE_URL}/financial-scores?symbol={symbol}&apikey={self.api_key}"
            data = await self._make_api_request(url)

            if data and isinstance(data, list) and len(data) > 0:
                return data[0]
            return None
        except Exception as e:
            logger.warning(f"종목 {symbol} 재무 스코어 조회 오류: {str(e)}")
            return None

    async def _get_historical_prices(self, symbol: str) -> Optional[List[Dict]]:
        """5년 가격 이력 API 호출"""
        try:
            # EOD (End of Day) 데이터 전체 이력 가져오기
            url = f"{self.BASE_URL}/historical-price-eod/full?symbol={symbol}&apikey={self.api_key}"
            data = await self._make_api_request(url, max_retries=3)

            if data:
                # FMP API 응답이 리스트 형식일 수도 있음
                historical = None
                if isinstance(data, list):
                    historical = data
                elif isinstance(data, dict):
                    if 'historical' in data:
                        historical = data['historical']
                    elif 'results' in data:
                        historical = data['results']
                    elif 'data' in data:
                        historical = data['data']

                if historical:
                    # 5년 데이터만 필터링
                    cutoff_date = datetime.now() - timedelta(days=365*5)
                    filtered = [
                        record for record in historical
                        if datetime.fromisoformat(record.get('date', record.get('Date', ''))) >= cutoff_date
                    ]

                    logger.debug(f"종목 {symbol}: 전체 {len(historical)}개 중 5년치 {len(filtered)}개 선택")
                    return filtered
                else:
                    logger.debug(f"종목 {symbol} - 응답 포맷 불일치: {list(data.keys()) if isinstance(data, dict) else 'list'}")
                    return None

            return None
        except Exception as e:
            logger.error(f"종목 {symbol} 가격 이력 조회 오류: {str(e)}")
            return None

    async def _save_indicators_to_db(self, indicator_data: Dict) -> bool:
        """주식 지표를 DB에 저장"""
        try:
            supabase = get_supabase()

            # UPSERT를 위해 필터링 (None 값 제거)
            # 실제 DB 컬럼만 포함
            actual_columns = {
                'symbol', 'company_name', 'currency', 'exchange', 'industry', 'sector',
                'current_price', 'previous_close', 'market_cap',
                'pe_ratio', 'eps', 'dividend_yield', 'fifty_two_week_high', 'fifty_two_week_low',
                'rsi',
                'roe', 'roa', 'current_ratio', 'debt_to_equity', 'profit_margin', 'quick_ratio', 'debt_ratio',
                'last_updated', 'created_at'
            }

            data = {k: v for k, v in indicator_data.items() if v is not None and k in actual_columns}
            data['last_updated'] = datetime.now().isoformat()

            # market_cap 문제 처리: BIGINT 범위를 초과하면 제거 또는 변환
            if 'market_cap' in data and data['market_cap'] is not None:
                try:
                    market_cap_val = float(data['market_cap'])
                    # BIGINT 최대값: 9223372036854775807
                    if market_cap_val > 9223372036854775807:
                        logger.warning(f"종목 {indicator_data.get('symbol')} market_cap이 BIGINT 범위 초과, 제거")
                        data.pop('market_cap')
                    else:
                        # 정수로 변환
                        data['market_cap'] = int(market_cap_val)
                except (ValueError, TypeError):
                    data.pop('market_cap', None)

            response = supabase.table("stock_indicators")\
                .upsert(data, on_conflict="symbol")\
                .execute()

            if response.data:
                logger.debug(f"지표 저장: {indicator_data.get('symbol')}")
                return True
            return False

        except Exception as e:
            logger.error(f"DB 저장 오류 ({indicator_data.get('symbol')}): {str(e)}")
            return False

    async def _save_price_history_to_db(self, symbol: str, price_data: List[Dict]) -> int:
        """가격 이력을 DB에 저장"""
        try:
            supabase = get_supabase()

            saved_count = 0

            # 배치로 저장 (한 번에 100개씩)
            batch_size = 100
            for i in range(0, len(price_data), batch_size):
                batch = price_data[i:i+batch_size]

                # 데이터 변환
                records = []
                for record in batch:
                    records.append({
                        'symbol': symbol,
                        'date': record['date'],
                        'open': record['open'],
                        'high': record['high'],
                        'low': record['low'],
                        'close': record['close'],
                        'volume': record.get('volume'),
                        'change': record.get('change'),
                        'change_percent': record.get('changePercent'),
                    })

                # UPSERT
                response = supabase.table("stock_price_history")\
                    .upsert(records, on_conflict="symbol,date")\
                    .execute()

                if response.data:
                    saved_count += len(response.data)

            logger.debug(f"가격 이력 저장: {symbol} {saved_count}개")
            return saved_count

        except Exception as e:
            logger.error(f"가격 이력 DB 저장 오류: {str(e)}")
            return 0

    async def _record_sync_history(
        self,
        symbol: Optional[str],
        sync_type: str,
        status: str,
        records_processed: int = 0,
        error_message: Optional[str] = None
    ) -> bool:
        """동기화 이력 기록"""
        try:
            supabase = get_supabase()

            data = {
                'symbol': symbol or 'ALL',
                'sync_type': sync_type,
                'sync_completed_at': datetime.now().isoformat(),
                'status': status,
                'records_processed': records_processed,
                'error_message': error_message,
            }

            response = supabase.table("stock_data_sync_history")\
                .insert(data)\
                .execute()

            return bool(response.data)

        except Exception as e:
            logger.error(f"동기화 이력 기록 오류: {str(e)}")
            return False

    async def _filter_already_synced_symbols(
        self,
        symbols: List[str],
        sync_type: str
    ) -> List[str]:
        """이미 오늘 동기화된 종목 필터링"""
        try:
            supabase = get_supabase()

            today = datetime.now().date().isoformat()

            # 오늘 완료된 동기화 목록 조회
            # 주: stock_data_sync_history 테이블이 없을 경우 오류 무시하고 모든 종목 반환
            try:
                response = supabase.table("stock_data_sync_history")\
                    .select("symbol")\
                    .eq("sync_type", sync_type)\
                    .eq("status", "completed")\
                    .gte("sync_completed_at", f"{today}T00:00:00")\
                    .execute()

                synced_symbols = {row['symbol'] for row in response.data}

                # 동기화되지 않은 종목만 반환
                return [s for s in symbols if s not in synced_symbols]
            except Exception as db_error:
                logger.warning(f"stock_data_sync_history 테이블 조회 불가 (생성되지 않음): {str(db_error)}")
                # 테이블이 없으면 모든 종목 반환
                return symbols

        except Exception as e:
            logger.warning(f"동기화 이력 조회 오류: {str(e)}")
            # 오류 발생 시 모든 종목 반환 (안전하게)
            return symbols

    @staticmethod
    def _get_default_100_symbols() -> List[str]:
        """기본 100개 종목 목록 반환 (뉴스 수집 종목과 동일)"""
        # News collector와 동일한 100개 종목
        return [
            # Tech (20)
            'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'CRM',
            'ORCL', 'ADOBE', 'INTEL', 'AMD', 'MU', 'QCOM', 'IBM', 'CSCO', 'HPQ', 'AVGO',
            # Finance (15)
            'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW', 'AXP', 'CB',
            'AIG', 'MMC', 'ICE', 'CBOE', 'TROW',
            # Healthcare (15)
            'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'TMO', 'LLY', 'ABT', 'AMGN', 'GILD',
            'CVS', 'REGN', 'BIIB', 'VRTX', 'IDXX',
            # Retail/Consumer (15)
            'WMT', 'TGT', 'HD', 'LOW', 'MCD', 'SBUX', 'KO', 'PEP', 'NKE', 'VFC',
            'LULU', 'DKS', 'RH', 'COST', 'ROST',
            # Industrials (10)
            'CAT', 'BA', 'MMM', 'RTX', 'HON', 'JCI', 'PCAR', 'GE', 'DE', 'LMT',
            # Energy (10)
            'XOM', 'CVX', 'COP', 'MPC', 'PSX', 'VLO', 'EOG', 'OXY', 'MRO', 'SLB',
            # Communications (5)
            'VZ', 'T', 'TMUS', 'CMCSA', 'CHTR',
            # Real Estate (5)
            'SPG', 'DLR', 'PLD', 'PSA', 'EQIX',
        ]
