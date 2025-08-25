from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict
from app.services.stock_service import StockService

router = APIRouter()

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
    period: str = Query("1y", description="조회 기간 (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    market: str = Query("us", description="시장 구분 (us: 미국, kr: 한국)")
):
    """주식 데이터 조회"""
    try:
        if market.lower() == "kr":
            data = StockService.get_korean_stock_data(symbol, period)
        else:
            data = StockService.get_stock_data(symbol, period)
        
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}/chart")
async def get_chart_data(
    symbol: str,
    period: str = Query("1y", description="조회 기간"),
    market: str = Query("us", description="시장 구분")
):
    """차트용 주식 데이터 조회"""
    try:
        if market.lower() == "kr":
            data = StockService.get_korean_stock_data(symbol, period)
        else:
            data = StockService.get_stock_data(symbol, period)
        
        # 차트에 필요한 데이터만 반환
        return {
            "symbol": data["symbol"],
            "company_name": data["company_name"],
            "current_price": data["current_price"],
            "currency": data["currency"],
            "chart_data": data["price_data"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))