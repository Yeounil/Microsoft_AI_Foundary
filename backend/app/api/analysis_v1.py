from fastapi import APIRouter, HTTPException, Query
from app.services.stock_service import StockService
from app.services.openai_service import OpenAIService
from datetime import datetime

router = APIRouter()

@router.post("/stock/{symbol}")
async def analyze_stock_v1(
    symbol: str,
    market: str = Query("us", description="시장 구분 (us: 미국, kr: 한국)"),
    period: str = Query("1y", description="분석 기간")
):
    """주식 기술적 분석 (v1 호환성)"""
    try:
        # 주식 데이터 가져오기
        stock_service = StockService()
        if market.lower() == "kr":
            stock_data = StockService.get_korean_stock_data(symbol, period, "1d")
        else:
            stock_data = await stock_service.get_stock_data(symbol, period, "1d")
        
        if not stock_data or not stock_data.get("price_data"):
            raise HTTPException(status_code=404, detail=f"{symbol} 주식 데이터를 찾을 수 없습니다.")
        
        # OpenAI로 기술적 분석 생성
        openai_service = OpenAIService()
        analysis = await openai_service.analyze_stock(symbol, stock_data)
        
        return {
            "symbol": symbol,
            "company_name": stock_data.get("company_name", symbol),
            "market": market,
            "period": period,
            "current_price": stock_data.get("current_price"),
            "previous_close": stock_data.get("previous_close"),
            "price_change": stock_data.get("current_price", 0) - stock_data.get("previous_close", 0),
            "price_change_percent": ((stock_data.get("current_price", 0) - stock_data.get("previous_close", 0)) / stock_data.get("previous_close", 1)) * 100,
            "currency": stock_data.get("currency", "USD"),
            "analysis": analysis,  # ai_analysis -> analysis로 변경
            "generated_at": datetime.utcnow().isoformat(),  # analysis_date -> generated_at으로 변경
            "data_points_analyzed": len(stock_data.get("price_data", []))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-summary")
async def get_market_summary_v1():
    """시장 요약 정보 (v1 호환성)"""
    try:
        # 주요 지수들의 데이터 가져오기
        indices = ["^GSPC", "^DJI", "^IXIC"]  # S&P 500, Dow Jones, NASDAQ
        market_data = {}
        stock_service = StockService()

        for index in indices:
            try:
                data = await stock_service.get_stock_data(index, "1d", "1d")
                if data:
                    market_data[index] = {
                        "symbol": data.get("symbol"),
                        "company_name": data.get("company_name"),
                        "current_price": data.get("current_price"),
                        "previous_close": data.get("previous_close"),
                        "change": data.get("current_price", 0) - data.get("previous_close", 0),
                        "change_percent": ((data.get("current_price", 0) - data.get("previous_close", 0)) / data.get("previous_close", 1)) * 100
                    }
            except Exception:
                # 개별 지수 실패 시 계속 진행
                continue
        
        return {
            "market_indices": market_data,
            "summary_date": datetime.utcnow().isoformat(),
            "status": "success" if market_data else "partial"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))