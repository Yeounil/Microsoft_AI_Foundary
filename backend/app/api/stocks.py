from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import List, Dict
from app.services.stock_service import StockService

router = APIRouter()

stock_service = StockService()

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
    save_to_db: bool = Query(True, description="DB에 저장 여부")
):
    """주식 지표만 조회 (빠른 조회, 자동 캐싱)"""
    try:
        data = await stock_service.get_stock_data(symbol.upper(), period=None, interval="1d")

        # 지표 데이터만 반환
        indicators = {
            "symbol": data["symbol"],
            "company_name": data["company_name"],
            "current_price": data["current_price"],
            "pe_ratio": data["pe_ratio"],
            "eps": data["eps"],
            "dividend_yield": data["dividend_yield"],
            "fifty_two_week_high": data["fifty_two_week_high"],
            "fifty_two_week_low": data["fifty_two_week_low"],
            "technical_indicators": data["technical_indicators"],
            "financial_ratios": data["financial_ratios"],
            "exchange": data["exchange"],
            "industry": data["industry"],
            "sector": data["sector"],
            "currency": data["currency"],
            "cache_info": data.get("cache_info", "")
        }

        if save_to_db and "Retrieved from cache" not in indicators.get("cache_info", ""):
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
    period: str = Query(None, description="조회 기간 (auto: 자동, 1d, 5d, 1mo, 3mo, 6mo, 1y 등)"),
    market: str = Query("us", description="시장 구분 (us: 미국만 지원)"),
    interval: str = Query("1d", description="데이터 간격 (1d, 5d, 1wk, 1mo)")
):
    """차트용 주식 데이터 조회 (자동 캐싱)"""
    try:
        if market.lower() == "kr":
            raise HTTPException(status_code=400, detail="한국 주식은 FMP API에서 지원하지 않습니다.")

        data = await stock_service.get_stock_data(symbol, period if period != "auto" else None, interval)

        # 차트에 필요한 데이터만 반환
        return {
            "symbol": data["symbol"],
            "company_name": data["company_name"],
            "current_price": data["current_price"],
            "currency": data["currency"],
            "chart_data": data["price_data"],
            "cache_info": data.get("cache_info", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))