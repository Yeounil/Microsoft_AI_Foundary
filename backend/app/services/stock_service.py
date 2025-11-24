import requests
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from app.core.config import settings
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class StockService:
    """Financial Modeling Prep API를 사용한 주식 데이터 서비스"""

    BASE_URL = "https://financialmodelingprep.com/stable"
    BASE_URL_V3 = "https://financialmodelingprep.com/api/v3"

    def __init__(self):
        self.api_key = settings.fmp_api_key if hasattr(settings, 'fmp_api_key') else None
        if not self.api_key:
            logger.warning("FMP API Key not configured. Please set FMP_API_KEY in environment.")

    @staticmethod
    def get_instance():
        """싱글톤 인스턴스"""
        if not hasattr(StockService, '_instance'):
            StockService._instance = StockService()
        return StockService._instance

    async def get_stock_indicators_from_db(self, symbol: str) -> Optional[Dict]:
        """DB에서 종목 지표 조회 (빠른 조회)"""
        try:
            supabase = get_supabase()
            result = supabase.table("stock_indicators")\
                .select("*")\
                .eq("symbol", symbol.upper())\
                .execute()

            if result.data and len(result.data) > 0:
                data = result.data[0]
                logger.info(f"Stock indicators loaded from DB for {symbol}")
                return {
                    "symbol": data.get("symbol"),
                    "company_name": data.get("company_name"),
                    "current_price": data.get("current_price"),
                    "previous_close": data.get("previous_close"),
                    "market_cap": data.get("market_cap"),
                    "fifty_two_week_high": data.get("fifty_two_week_high"),
                    "fifty_two_week_low": data.get("fifty_two_week_low"),
                    "currency": data.get("currency"),
                    "exchange": data.get("exchange"),
                    "industry": data.get("industry"),
                    "sector": data.get("sector"),
                    "financial_ratios": {
                        "current_ratio": data.get("current_ratio", 0),
                        "profit_margin": data.get("profit_margin", 0),
                        "quick_ratio": data.get("quick_ratio", 0)
                    },
                    "last_updated": data.get("last_updated"),
                    "cache_info": "Retrieved from DB"
                }

            return None

        except Exception as e:
            logger.error(f"Error loading stock indicators from DB for {symbol}: {str(e)}")
            return None

    async def get_price_history_from_db(
        self,
        symbol: str,
        period: str = "1y",
        limit: int = None
    ) -> List[Dict]:
        """DB에서 주가 히스토리 조회 (빠른 조회)"""
        try:
            supabase = get_supabase()

            # 기간에 따른 날짜 계산
            days_map = {
                "1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180,
                "1y": 365, "2y": 730, "5y": 1825, "10y": 3650, "max": 36500  # max: 100년
            }
            days = days_map.get(period, 365)

            # 날짜 계산
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)

            # DB 쿼리
            query = supabase.table("stock_price_history")\
                .select("*")\
                .eq("symbol", symbol.upper())\
                .gte("date", start_date.strftime("%Y-%m-%d"))\
                .order("date", desc=True)

            if limit:
                query = query.limit(limit)
            elif period == "max":
                # max일 때는 limit 없이 전체 조회
                pass
            else:
                query = query.limit(days * 2)  # 여유있게 2배

            result = query.execute()

            if result.data:
                price_data = []
                for record in result.data:
                    price_data.append({
                        "date": record.get("date"),
                        "open": record.get("open"),
                        "high": record.get("high"),
                        "low": record.get("low"),
                        "close": record.get("close"),
                        "volume": record.get("volume"),
                        "change": record.get("change"),
                        "change_percent": record.get("change_percent")
                    })

                logger.info(f"Loaded {len(price_data)} price records from DB for {symbol}")
                return price_data

            return []

        except Exception as e:
            logger.error(f"Error loading price history from DB for {symbol}: {str(e)}")
            return []

    async def _get_last_update_time(self, symbol: str) -> Optional[datetime]:
        """DB에서 해당 종목의 마지막 업데이트 시간 조회"""
        try:
            supabase = get_supabase()
            result = supabase.table("stock_indicators")\
                .select("last_updated")\
                .eq("symbol", symbol.upper())\
                .execute()

            if result.data and len(result.data) > 0:
                last_updated = result.data[0].get("last_updated")
                if last_updated:
                    # ISO 형식 파싱
                    return datetime.fromisoformat(last_updated.replace('Z', '+00:00')).replace(tzinfo=None)

            return None

        except Exception as e:
            logger.error(f"Error checking last update time for {symbol}: {str(e)}")
            return None

    async def _determine_data_period(self, symbol: str) -> str:
        """
        API 호출 시 조회할 데이터 기간 결정
        - 처음 호출: 1년 데이터
        - 당일 재호출: 요청 거부 (skip)
        - 다음날 이후: 마지막 업데이트 이후부터 오늘까지 데이터만 조회

        규칙: 하루에 한 번만 API 호출 허용
        """
        try:
            last_update = await self._get_last_update_time(symbol)

            if last_update is None:
                # 처음 호출: 1년 데이터
                logger.info(f"{symbol}: First time fetch - requesting 1 year of data")
                return "1y"

            # 마지막 업데이트 이후 경과 시간 계산
            now = datetime.now()
            last_update_date = last_update.date()
            today = now.date()

            logger.info(f"{symbol}: Last updated on {last_update_date}, today is {today}")

            # 같은 날짜 재요청: 거부
            if last_update_date == today:
                logger.info(f"{symbol}: Already updated today, rejecting request (one update per day limit)")
                return "skip"

            # 다음날 이후: 데이터 조회
            days_since_update = (today - last_update_date).days
            logger.info(f"{symbol}: {days_since_update} days since last update")

            if days_since_update == 1:
                return "1d"  # 1일 데이터 (어제 이후 데이터)
            elif days_since_update <= 7:
                return "1mo"  # 1개월 데이터
            else:
                return "1y"  # 1년 데이터

        except Exception as e:
            logger.error(f"Error determining data period for {symbol}: {str(e)}")
            return "1y"  # 오류 발생 시 기본값 반환

    async def get_stock_data(self, symbol: str, period: str = None, interval: str = "1d") -> Dict:
        """
        Financial Modeling Prep API를 사용해 주식 데이터 가져오기
        - 종목 정보 (회사명, 현재 주가, 시가총액, PE 비율)
        - 기술 지표 (RSI, MACD, Moving Average 등)
        - 재무 지표 (ROE, ROA, Debt Ratio 등)
        - 주가 히스토리 데이터

        캐싱 로직 (하루 한 번 API 호출 제한):
        - 처음 호출: 1년 데이터 API 조회 → DB 저장
        - 당일 재호출: 요청 거부 (error 응답)
        - 다음날 이후: 마지막 업데이트 이후 데이터만 API 조회
        """
        try:
            if not self.api_key:
                raise Exception("FMP API Key is not configured")

            logger.info(f"Fetching stock data for {symbol} from FMP API")

            # 1. 조회 기간 자동 결정 (캐싱 로직)
            if period is None:
                period = await self._determine_data_period(symbol)

            # 2. 당일 재요청 거부
            if period == "skip":
                logger.warning(f"{symbol}: Already updated today, rejecting request")
                raise Exception(f"Stock data for {symbol} has already been updated today. Please try again tomorrow.")

            # 3. 종목 기본 정보 및 재무 지표 조회
            quote_data = self._get_quote(symbol)
            if not quote_data:
                raise Exception(f"Stock {symbol} not found")

            # 4. 기술 지표 조회
            technical_indicators = self._get_technical_indicators(symbol, interval)

            # 5. 재무 지표 조회
            financial_ratios = self._get_financial_ratios(symbol)

            # 6. 주가 히스토리 조회
            price_history = self._get_historical_prices(symbol, period, interval)

            # 7. 기본 정보와 지표 통합
            stock_data = {
                "symbol": symbol.upper(),
                "company_name": quote_data.get("companyName", symbol),
                "current_price": round(float(quote_data.get("price", 0)), 2),
                "previous_close": round(float(quote_data.get("previousClose", 0)), 2),
                "market_cap": quote_data.get("marketCap", 0),
                "fifty_two_week_high": round(float(quote_data.get("52WeekHigh", 0)), 2) if quote_data.get("52WeekHigh") else 0,
                "fifty_two_week_low": round(float(quote_data.get("52WeekLow", 0)), 2) if quote_data.get("52WeekLow") else 0,
                "currency": quote_data.get("currency", "USD"),
                "price_data": price_history,
                "technical_indicators": technical_indicators,
                "financial_ratios": financial_ratios,
                "exchange": quote_data.get("exchange", ""),
                "industry": quote_data.get("industry", ""),
                "sector": quote_data.get("sector", ""),
                "data_period": period,
                "cache_info": f"Fetched {len(price_history)} price records"
            }

            logger.info(f"Stock data fetched successfully for {symbol} (period: {period})")
            return stock_data

        except Exception as e:
            logger.error(f"Error fetching stock data for {symbol}: {str(e)}")
            raise Exception(f"Error fetching stock data: {str(e)}")

    async def get_intraday_chart_data(
        self,
        symbol: str,
        interval: str = "1min",
        from_date: str = None,
        to_date: str = None
    ) -> List[Dict]:
        """
        FMP Intraday API로 분단위 차트 데이터 조회

        API: https://financialmodelingprep.com/api/v3/historical-chart/{interval}/{symbol}

        Parameters:
        - interval: 1min, 5min, 15min, 30min, 1hour
        - from_date: YYYY-MM-DD (선택)
        - to_date: YYYY-MM-DD (선택)

        Note: Free tier는 최근 7일만 조회 가능
        """
        try:
            if not self.api_key:
                raise Exception("FMP API Key is not configured")

            # FMP Intraday API 엔드포인트
            url = f"{self.BASE_URL_V3}/historical-chart/{interval}/{symbol.upper()}"

            params = {"apikey": self.api_key}
            if from_date:
                params["from"] = from_date
            if to_date:
                params["to"] = to_date

            logger.info(f"Fetching intraday data for {symbol} (interval: {interval})")

            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()

            if not isinstance(data, list):
                logger.warning(f"Unexpected response format for {symbol}: {type(data)}")
                return []

            # 데이터 정규화 (최신 데이터가 먼저 오므로 역순 정렬)
            normalized_data = []
            for item in reversed(data):  # 시간순 정렬 (오래된 것 → 최신)
                try:
                    # 날짜 형식: "2024-01-15 15:59:00"
                    date_str = item.get("date", "")
                    timestamp = int(datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S").timestamp())

                    normalized_data.append({
                        "time": timestamp,
                        "open": round(float(item.get("open", 0)), 2),
                        "high": round(float(item.get("high", 0)), 2),
                        "low": round(float(item.get("low", 0)), 2),
                        "close": round(float(item.get("close", 0)), 2),
                        "volume": int(item.get("volume", 0))
                    })
                except Exception as e:
                    logger.error(f"Error parsing candle data: {e}")
                    continue

            logger.info(f"Fetched {len(normalized_data)} intraday candles for {symbol}")
            return normalized_data

        except Exception as e:
            logger.error(f"Failed to get intraday data for {symbol}: {str(e)}")
            return []


    def _get_quote(self, symbol: str) -> Dict:
        """현재 주가 및 기본 정보 조회 (공식 문서: /stable/quote)"""
        try:
            # 공식 문서: https://site.financialmodelingprep.com/developer/docs
            # /stable/quote?symbol=AAPL&apikey=YOUR_API_KEY
            url = f"{self.BASE_URL}/quote"
            params = {
                "symbol": symbol.upper(),
                "apikey": self.api_key
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            return data

        except Exception as e:
            logger.error(f"Error fetching quote for {symbol}: {str(e)}")
            return {}

    def _get_historical_prices(self, symbol: str, period: str = "1y", interval: str = "1d") -> List[Dict]:
        """주가 히스토리 조회 (공식 문서: /stable/historical-price-eod/full)"""
        try:
            # 기간에 따른 일수 계산
            days_map = {
                "1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180,
                "1y": 365, "2y": 730, "5y": 1825, "10y": 3650
            }
            days = days_map.get(period, 365)

            # FMP API에서 historical 데이터 조회 (일봉 기준)
            # 공식 문서: https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=AAPL&apikey=YOUR_API_KEY
            url = f"{self.BASE_URL}/historical-price-eod/full"
            params = {
                "symbol": symbol.upper(),
                "apikey": self.api_key
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            # 응답이 리스트로 반환됨
            historical = data if isinstance(data, list) else data.get("historical", [])

            price_data = []
            for record in historical[:days]:  # 날짜 제한
                price_data.append({
                    "date": record.get("date"),
                    "open": round(float(record.get("open", 0)), 2),
                    "high": round(float(record.get("high", 0)), 2),
                    "low": round(float(record.get("low", 0)), 2),
                    "close": round(float(record.get("close", 0)), 2),
                    "volume": int(record.get("volume", 0)),
                    "change": round(float(record.get("change", 0) or 0), 2),
                    "change_percent": round(float(record.get("changePercent", 0) or 0), 2)
                })

            return price_data

        except Exception as e:
            logger.error(f"Error fetching historical prices for {symbol}: {str(e)}")
            return []

    def _get_technical_indicators(self, symbol: str, interval: str = "1d") -> Dict:
        """기술 지표 조회 (RSI) - Free 플랜에서는 사용 불가능"""
        try:
            # Technical Indicators (RSI)는 유료 플랜에서만 제공
            # Free 플랜에서는 402 Payment Required 에러 발생
            # 따라서 기본값 반환 (또는 프리미엄 플랜으로 업그레이드 필요)
            logger.warning(f"Technical Indicators (RSI) requires premium plan. Using default values.")

            return {
                "rsi": 0,
                "timestamp": None,
                "note": "Technical indicators available with premium plan only"
            }

        except Exception as e:
            logger.error(f"Error fetching technical indicators for {symbol}: {str(e)}")
            return {"rsi": 0, "timestamp": None}

    def _get_financial_ratios(self, symbol: str) -> Dict:
        """재무 지표 조회 (ROE, ROA, Debt Ratio 등)"""
        try:
            # 공식 문서: https://financialmodelingprep.com/stable/ratios?symbol=AAPL&apikey=YOUR_API_KEY
            url = f"{self.BASE_URL}/ratios"
            params = {
                "symbol": symbol.upper(),
                "apikey": self.api_key
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            # 응답이 리스트로 반환, 최신 데이터가 첫 번째
            if isinstance(data, list) and len(data) > 0:
                ratios = data[0]
                return {
                    "roe": round(float(ratios.get("roe", 0)), 4) if ratios.get("roe") else 0,
                    "roa": round(float(ratios.get("roa", 0)), 4) if ratios.get("roa") else 0,
                    "current_ratio": round(float(ratios.get("currentRatio", 0)), 2) if ratios.get("currentRatio") else 0,
                    "debt_to_equity": round(float(ratios.get("debtToEquity", 0)), 2) if ratios.get("debtToEquity") else 0,
                    "profit_margin": round(float(ratios.get("netProfitMargin", 0)), 4) if ratios.get("netProfitMargin") else 0,
                    "quick_ratio": round(float(ratios.get("quickRatio", 0)), 2) if ratios.get("quickRatio") else 0,
                    "debt_ratio": round(float(ratios.get("debtRatio", 0)), 2) if ratios.get("debtRatio") else 0
                }

            return {
                "roe": 0, "roa": 0, "current_ratio": 0,
                "debt_to_equity": 0, "profit_margin": 0, "quick_ratio": 0, "debt_ratio": 0
            }

        except Exception as e:
            logger.error(f"Error fetching financial ratios for {symbol}: {str(e)}")
            return {
                "roe": 0, "roa": 0, "current_ratio": 0,
                "debt_to_equity": 0, "profit_margin": 0, "quick_ratio": 0, "debt_ratio": 0
            }

    def save_stock_indicators_to_db(self, symbol: str, stock_data: Dict) -> Dict:
        """종목 지표 데이터를 Supabase에 저장"""
        try:
            supabase = get_supabase()

            # 저장할 데이터 준비
            indicator_data = {
                "symbol": symbol.upper(),
                "company_name": stock_data.get("company_name"),
                "current_price": stock_data.get("current_price"),
                "previous_close": stock_data.get("previous_close"),
                "market_cap": stock_data.get("market_cap"),
                "fifty_two_week_high": stock_data.get("fifty_two_week_high"),
                "fifty_two_week_low": stock_data.get("fifty_two_week_low"),
                "currency": stock_data.get("currency"),
                "exchange": stock_data.get("exchange"),
                "industry": stock_data.get("industry"),
                "sector": stock_data.get("sector"),
                "current_ratio": stock_data.get("financial_ratios", {}).get("current_ratio", 0),
                "profit_margin": stock_data.get("financial_ratios", {}).get("profit_margin", 0),
                "quick_ratio": stock_data.get("financial_ratios", {}).get("quick_ratio", 0),
                "last_updated": datetime.now().isoformat()
            }

            # Supabase에 upsert (기존 데이터 업데이트 또는 새로 삽입)
            result = supabase.table("stock_indicators")\
                .upsert(indicator_data, on_conflict="symbol")\
                .execute()

            logger.info(f"Stock indicators saved for {symbol}")
            return {
                "status": "success",
                "symbol": symbol,
                "message": "주식 지표가 저장되었습니다."
            }

        except Exception as e:
            logger.error(f"Error saving stock indicators to DB: {str(e)}")
            return {
                "status": "error",
                "symbol": symbol,
                "message": f"DB 저장 실패: {str(e)}"
            }

    def save_price_history_to_db(self, symbol: str, price_data: List[Dict]) -> Dict:
        """주가 히스토리 데이터를 Supabase에 저장"""
        try:
            supabase = get_supabase()

            # 각 가격 데이터에 심볼 추가
            records = []
            for price in price_data:
                record = {
                    "symbol": symbol.upper(),
                    "date": price.get("date"),
                    "open": price.get("open"),
                    "high": price.get("high"),
                    "low": price.get("low"),
                    "close": price.get("close"),
                    "volume": price.get("volume"),
                    "change": price.get("change"),
                    "change_percent": price.get("change_percent"),
                    "created_at": datetime.now().isoformat()
                }
                records.append(record)

            # 배치로 저장 (중복 무시)
            if records:
                result = supabase.table("stock_price_history")\
                    .upsert(records, on_conflict="symbol,date")\
                    .execute()

                logger.info(f"Saved {len(records)} price records for {symbol}")

            return {
                "status": "success",
                "symbol": symbol,
                "count": len(records),
                "message": f"{len(records)}개의 가격 데이터가 저장되었습니다."
            }

        except Exception as e:
            logger.error(f"Error saving price history to DB: {str(e)}")
            return {
                "status": "error",
                "symbol": symbol,
                "message": f"가격 데이터 저장 실패: {str(e)}"
            }

    @staticmethod
    def get_korean_stock_data(symbol: str, period: str = "1y", interval: str = "1d") -> Dict:
        """한국 주식 데이터 가져오기 (FMP API 지원 확인 필요)"""
        logger.warning("Korean stock data from FMP API not fully supported. Use US stocks instead.")
        raise Exception("Korean stock data is not supported via FMP API. Please use US stock symbols.")

    def get_all_tradable_stocks(
        self,
        market_cap_more_than: int = 1000000000,  # 10억 달러 이상
        limit: int = 500
    ) -> List[Dict]:
        """
        모든 거래 가능한 미국 주식 종목 리스트 조회

        FMP Stock Screener API 사용:
        - 시가총액 필터링
        - NASDAQ, NYSE 거래소만
        - 상위 N개 종목
        """
        try:
            if not self.api_key:
                raise Exception("FMP API Key is not configured")

            # Stock Screener API
            url = f"{self.BASE_URL_V3}/stock-screener"
            params = {
                "marketCapMoreThan": market_cap_more_than,
                "exchange": "NASDAQ,NYSE",
                "limit": limit,
                "apikey": self.api_key
            }

            logger.info(f"Fetching tradable stocks (limit: {limit}, marketCap > {market_cap_more_than})")

            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()

            if not isinstance(data, list):
                logger.warning(f"Unexpected response format: {type(data)}")
                return []

            # 필요한 필드만 추출
            stocks = []
            for item in data:
                stocks.append({
                    "symbol": item.get("symbol", ""),
                    "name": item.get("companyName", ""),
                    "exchange": item.get("exchangeShortName", ""),
                    "marketCap": item.get("marketCap", 0),
                    "sector": item.get("sector", ""),
                    "industry": item.get("industry", "")
                })

            logger.info(f"Fetched {len(stocks)} tradable stocks")
            return stocks

        except Exception as e:
            logger.error(f"Error fetching tradable stocks: {str(e)}")
            return []

    def get_batch_quotes(self, symbols: List[str]) -> List[Dict]:
        """
        여러 종목의 현재 가격을 배치로 조회

        FMP Batch Quote API 사용:
        - 최대 한번에 여러 종목 조회 가능
        - 프론트엔드에서 API 키 노출 방지
        """
        try:
            if not self.api_key:
                raise Exception("FMP API Key is not configured")

            if not symbols or len(symbols) == 0:
                return []

            # 심볼을 쉼표로 구분
            symbols_str = ",".join([s.upper() for s in symbols])

            # V3 Quote API (배치 지원)
            url = f"{self.BASE_URL_V3}/quote/{symbols_str}"
            params = {"apikey": self.api_key}

            logger.info(f"Fetching batch quotes for {len(symbols)} symbols")

            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()

            if not isinstance(data, list):
                logger.warning(f"Unexpected response format: {type(data)}")
                return []

            # 필요한 필드만 추출
            quotes = []
            for item in data:
                quotes.append({
                    "symbol": item.get("symbol", ""),
                    "name": item.get("name", ""),
                    "price": item.get("price", 0),
                    "change": item.get("change", 0),
                    "changePercent": item.get("changesPercentage", 0),
                    "volume": item.get("volume", 0)
                })

            logger.info(f"Fetched {len(quotes)} quotes")
            return quotes

        except Exception as e:
            logger.error(f"Error fetching batch quotes: {str(e)}")
            return []

    @staticmethod
    def search_stocks(query: str) -> List[Dict]:
        """주식 검색 (기본 값 유지)"""
        try:
            # 일반적인 주식 심볼 데이터
            common_stocks = {
                "AAPL": "Apple Inc.",
                "GOOGL": "Alphabet Inc.",
                "MSFT": "Microsoft Corporation",
                "TSLA": "Tesla, Inc.",
                "AMZN": "Amazon.com Inc.",
                "NVDA": "NVIDIA Corporation",
                "META": "Meta Platforms Inc.",
                "NFLX": "Netflix Inc.",
                "PYPL": "PayPal Inc.",
                "INTC": "Intel Corporation"
            }

            results = []
            query_lower = query.lower()

            for symbol, name in common_stocks.items():
                if query_lower in symbol.lower() or query_lower in name.lower():
                    results.append({
                        "symbol": symbol,
                        "name": name
                    })

            return results[:10]  # 최대 10개 결과 반환

        except Exception as e:
            raise Exception(f"Error searching stocks: {str(e)}")
