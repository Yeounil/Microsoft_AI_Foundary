from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Body
from typing import List, Dict
from app.services.stock_service import StockService

router = APIRouter()

stock_service = StockService()

@router.get("/list")
async def get_all_stocks(
    market_cap_more_than: int = Query(1000000000, description="최소 시가총액 (기본: 10억 달러)"),
    limit: int = Query(500, description="최대 종목 수 (기본: 500)")
):
    """
    모든 거래 가능한 미국 주식 종목 리스트 조회

    FMP Stock Screener API를 통해 NASDAQ, NYSE 거래소의 종목을 조회합니다.
    - 시가총액 필터링 가능
    - 최대 조회 개수 제한 가능
    """
    try:
        stocks = stock_service.get_all_tradable_stocks(market_cap_more_than, limit)
        return {
            "count": len(stocks),
            "stocks": stocks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quotes")
async def get_batch_quotes(symbols: List[str] = Body(..., description="조회할 종목 심볼 리스트")):
    """
    여러 종목의 현재 가격을 배치로 조회

    프론트엔드에서 API 키 노출 없이 여러 종목의 실시간 가격을 조회합니다.
    - 한번에 여러 종목 조회 가능
    - 현재가, 변동폭, 변동률, 거래량 포함
    """
    try:
        if not symbols or len(symbols) == 0:
            raise HTTPException(status_code=400, detail="종목 심볼이 필요합니다.")

        if len(symbols) > 100:
            raise HTTPException(status_code=400, detail="한번에 최대 100개 종목만 조회 가능합니다.")

        quotes = stock_service.get_batch_quotes(symbols)
        return {
            "count": len(quotes),
            "quotes": quotes
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supported")
async def get_supported_stocks():
    """
    지원하는 100개 주식 종목 심볼 리스트 반환

    카테고리별로 분류된 주식 종목 리스트를 제공합니다:
    - Tech (20개)
    - Finance (15개)
    - Healthcare (15개)
    - Retail/Consumer (15개)
    - Industrials (10개)
    - Energy (10개)
    - Communications (3개)
    - ETFs (12개)

    총 100개 종목
    """
    try:
        supported_stocks = {
            "tech": [
                "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "META", "NFLX", "CRM",
                "ORCL", "ADBE", "INTC", "AMD", "MU", "QCOM", "IBM", "CSCO", "HPQ", "AVGO"
            ],
            "finance": [
                "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP", "CB",
                "AIG", "MMC", "ICE", "CBOE", "V"
            ],
            "healthcare": [
                "JNJ", "UNH", "PFE", "ABBV", "MRK", "TMO", "LLY", "ABT", "AMGN", "GILD",
                "CVS", "ISRG", "REGN", "BIIB", "VRTX"
            ],
            "retail_consumer": [
                "WMT", "TGT", "HD", "LOW", "MCD", "SBUX", "KO", "PEP", "NKE", "VFC",
                "LULU", "DKS", "RH", "COST", "DIS"
            ],
            "industrials": [
                "CAT", "BA", "MMM", "RTX", "HON", "JCI", "PCAR", "GE", "DE", "LMT"
            ],
            "energy": [
                "XOM", "CVX", "COP", "MPC", "PSX", "VLO", "EOG", "OXY", "MRO", "SLB"
            ],
            "communications": [
                "VZ", "T", "TMUS"
            ],
            "etfs": [
                "SPY", "QQQ", "DIA", "IWM", "VTI", "VOO", "VEA", "VWO", "AGG", "BND", "GLD", "SLV"
            ]
        }

        # 전체 심볼 리스트 (평면화)
        all_symbols = []
        for category_symbols in supported_stocks.values():
            all_symbols.extend(category_symbols)

        return {
            "total_count": len(all_symbols),
            "categories": supported_stocks,
            "all_symbols": all_symbols
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_stocks(q: str = Query(..., description="검색할 주식명 또는 심볼")):
    """주식 검색"""
    try:
        results = StockService.search_stocks(q)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}")
async def get_stock_data(
    symbol: str,
    period: str = Query(None, description="조회 기간 (기본: auto, 1d, 5d, 1mo, 1y 등)"),
    market: str = Query("us", description="시장 구분 (us: 미국만 지원)"),
    interval: str = Query("1d", description="데이터 간격 (1d, 5d, 1wk, 1mo)"),
    save_to_db: bool = Query(True, description="DB에 저장 여부 (기본: True)")
):
    """
    주식 데이터 조회 및 DB 저장

    📋 하루 한 번 API 호출 제한 정책:
    - 처음 호출: 1년 데이터 API 조회 → DB 저장 ✅
    - 당일 재호출: 에러 응답 (409 Conflict) ❌
    - 다음날 호출: 증분 데이터만 API 조회 → DB 업데이트 ✅

    목적: FMP API 할당량 절약 (Free: 250/day)
    """
    try:
        if market.lower() == "kr":
            raise HTTPException(status_code=400, detail="한국 주식은 FMP API에서 지원하지 않습니다. 미국 주식만 조회 가능합니다.")

        # FMP API에서 데이터 조회 (자동 캐싱 로직 포함)
        data = await stock_service.get_stock_data(symbol, period if period != "auto" else None, interval)

        # DB 저장
        indicator_result = stock_service.save_stock_indicators_to_db(symbol, data)
        history_result = stock_service.save_price_history_to_db(symbol, data.get("price_data", []))

        data["db_save"] = {
            "indicators": indicator_result,
            "price_history": history_result
        }

        return data
    except Exception as e:
        # 당일 재호출 시 409 Conflict 응답
        if "already been updated today" in str(e):
            raise HTTPException(
                status_code=409,
                detail=str(e)
            )
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}/intraday")
async def get_intraday_chart_data(
    symbol: str,
    interval: str = Query("1min", description="데이터 간격 (1min, 5min, 15min, 30min, 1hour)"),
    from_date: str = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    to_date: str = Query(None, description="종료 날짜 (YYYY-MM-DD)")
):
    """
    분단위 Intraday 차트 데이터 조회

    FMP Intraday API를 사용하여 분단위 캔들 데이터를 제공합니다.

    Note:
    - Free tier는 최근 7일만 조회 가능
    - Paid tier는 최근 30일~5년 조회 가능
    - 실시간 차트 구현 시 이 API + WebSocket 조합 사용
    """
    try:
        data = await stock_service.get_intraday_chart_data(
            symbol.upper(),
            interval,
            from_date,
            to_date
        )

        return {
            "symbol": symbol.upper(),
            "interval": interval,
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}/indicators")
async def get_stock_indicators(
    symbol: str,
    force_api: bool = Query(False, description="API 강제 호출 여부 (True: API 우선, False: DB 우선)")
):
    """
    주식 지표 조회 (DB 우선, 빠른 조회)
    - DB에 데이터가 있으면 DB에서 조회 (빠름)
    - DB에 없거나 force_api=True이면 API 호출
    """
    try:
        # DB 우선 조회 (force_api가 False일 때만)
        if not force_api:
            db_data = await stock_service.get_stock_indicators_from_db(symbol.upper())
            if db_data:
                return db_data

        # DB에 없거나 force_api=True면 API 호출
        data = await stock_service.get_stock_data(symbol.upper(), period=None, interval="1d")

        # 지표 데이터만 반환
        indicators = {
            "symbol": data["symbol"],
            "company_name": data["company_name"],
            "current_price": data["current_price"],
            "previous_close": data.get("previous_close"),
            "market_cap": data.get("market_cap"),
            "fifty_two_week_high": data["fifty_two_week_high"],
            "fifty_two_week_low": data["fifty_two_week_low"],
            "technical_indicators": data.get("technical_indicators"),
            "financial_ratios": data["financial_ratios"],
            "exchange": data["exchange"],
            "industry": data["industry"],
            "sector": data["sector"],
            "currency": data["currency"],
            "cache_info": data.get("cache_info", "Fetched from API")
        }

        # API로 가져온 데이터는 DB에 저장
        result = stock_service.save_stock_indicators_to_db(symbol, data)
        indicators["db_save"] = result

        return indicators
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{symbol}/save-to-db")
async def save_stock_to_db(
    symbol: str,
    save_price_history: bool = Query(True, description="주가 히스토리 저장 여부")
):
    """이미 조회한 주식 데이터를 DB에 저장 (수동 저장)"""
    try:
        # 데이터 조회 (자동 캐싱 로직 포함)
        data = await stock_service.get_stock_data(symbol.upper(), period=None, interval="1d")

        results = {}

        # 지표 저장
        results["indicators"] = stock_service.save_stock_indicators_to_db(symbol, data)

        # 주가 히스토리 저장
        if save_price_history:
            results["price_history"] = stock_service.save_price_history_to_db(symbol, data.get("price_data", []))

        return {
            "status": "success",
            "symbol": symbol.upper(),
            "save_results": results,
            "cache_info": data.get("cache_info", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}/chart")
async def get_chart_data(
    symbol: str,
    period: str = Query("1y", description="조회 기간 (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y)"),
    market: str = Query("us", description="시장 구분 (us: 미국만 지원)"),
    force_api: bool = Query(False, description="API 강제 호출 여부 (True: API 우선, False: DB 우선)")
):
    """
    차트용 주식 데이터 조회 (DB 우선, 빠른 조회)
    - DB에 데이터가 있으면 DB에서 조회 (빠름, 5년치 데이터 활용)
    - DB에 없거나 force_api=True이면 API 호출
    """
    try:
        if market.lower() == "kr":
            raise HTTPException(status_code=400, detail="한국 주식은 FMP API에서 지원하지 않습니다.")

        # DB 우선 조회 (force_api가 False일 때만)
        if not force_api:
            price_data = await stock_service.get_price_history_from_db(symbol.upper(), period)
            if price_data:
                # 기본 정보는 DB에서 조회
                indicators = await stock_service.get_stock_indicators_from_db(symbol.upper())

                return {
                    "symbol": symbol.upper(),
                    "company_name": indicators.get("company_name") if indicators else symbol.upper(),
                    "current_price": indicators.get("current_price") if indicators else None,
                    "currency": indicators.get("currency") if indicators else "USD",
                    "chart_data": price_data,
                    "cache_info": f"Retrieved from DB ({len(price_data)} records)"
                }

        # DB에 없거나 force_api=True면 API 호출
        data = await stock_service.get_stock_data(symbol, period, "1d")

        # 차트에 필요한 데이터만 반환
        return {
            "symbol": data["symbol"],
            "company_name": data["company_name"],
            "current_price": data["current_price"],
            "currency": data["currency"],
            "chart_data": data["price_data"],
            "cache_info": data.get("cache_info", "Fetched from API")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))