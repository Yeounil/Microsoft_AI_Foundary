from fastapi import APIRouter, HTTPException, Query
from app.services.openai_service import OpenAIService
from app.services.stock_service import StockService

router = APIRouter()

@router.post("/stock/{symbol}")
async def analyze_stock(
    symbol: str,
    market: str = Query("us", description="시장 구분 (us: 미국, kr: 한국)"),
    period: str = Query("1y", description="분석 기간"),
    interval: str = Query("1d", description="데이터 간격")
):
    """주식 AI 분석"""
    try:
        # 주식 데이터 가져오기
        if market.lower() == "kr":
            stock_data = StockService.get_korean_stock_data(symbol, period, interval)
        else:
            stock_data = StockService.get_stock_data(symbol, period, interval)
        
        # OpenAI 분석 서비스
        openai_service = OpenAIService()
        analysis = await openai_service.analyze_stock(symbol, stock_data)
        
        return {
            "symbol": symbol,
            "company_name": stock_data.get("company_name", symbol),
            "current_price": stock_data.get("current_price", 0),
            "currency": stock_data.get("currency", "USD"),
            "analysis": analysis,
            "generated_at": "2024-01-01T00:00:00Z"  # 실제로는 datetime.now() 사용
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-summary")
async def get_market_summary():
    """전체 시장 요약 분석"""
    try:
        # 주요 지수들의 데이터 가져오기
        major_indices = ["^GSPC", "^DJI", "^IXIC", "^KS11", "^KQ11"]  # S&P500, 다우, 나스닥, 코스피, 코스닥
        market_data = []
        
        for index in major_indices:
            try:
                if index.startswith("^KS") or index.startswith("^KQ"):
                    data = StockService.get_korean_stock_data(index.replace("^", ""))
                else:
                    data = StockService.get_stock_data(index)
                market_data.append(data)
            except:
                continue
        
        # OpenAI로 시장 전체 분석
        openai_service = OpenAIService()
        
        market_context = "\n".join([
            f"{data['company_name']}: {data['current_price']} ({((data['current_price'] - data['previous_close']) / data['previous_close'] * 100):.2f}%)"
            for data in market_data
        ])
        
        prompt = f"""
        다음은 주요 주식 지수들의 현재 상황입니다:
        
        {market_context}
        
        전체 시장 상황을 분석하고 다음 항목을 포함하여 요약해주세요:
        1. 전체 시장 동향
        2. 섹터별 특징
        3. 국가별 시장 상황 (미국, 한국)
        4. 주요 이슈 및 리스크 요인
        5. 향후 전망
        """
        
        summary = await openai_service.summarize_news([{"title": "시장 분석", "description": prompt}])
        
        return {
            "market_data": market_data,
            "summary": summary,
            "generated_at": "2024-01-01T00:00:00Z"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))