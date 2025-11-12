from fastapi import APIRouter, HTTPException, Query, Depends
from app.services.openai_service import OpenAIService
from app.services.stock_service import StockService
from app.services.supabase_data_service import SupabaseDataService
from app.api.auth_supabase import get_current_active_user
from typing import Dict, Any, Optional
from datetime import datetime

router = APIRouter()

@router.post("/stock/{symbol}")
async def analyze_stock(
    symbol: str,
    market: str = Query("us", description="시장 구분 (us: 미국, kr: 한국)"),
    period: str = Query("1y", description="분석 기간"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """주식 AI 분석 (Supabase 저장)"""
    try:
        data_service = SupabaseDataService()
        stock_service = StockService()

        # 검색 기록 추가
        await data_service.add_search_history(
            user_id=current_user['id'],
            symbol=symbol
        )

        # 주식 데이터 가져오기
        if market.lower() == "kr":
            stock_data = StockService.get_korean_stock_data(symbol, period)
        else:
            stock_data = await stock_service.get_stock_data(symbol, period)
        
        # OpenAI 분석 서비스
        openai_service = OpenAIService()
        analysis = await openai_service.analyze_stock(symbol, stock_data)
        
        # 분석 결과 데이터 구성
        analysis_result = {
            "symbol": symbol,
            "company_name": stock_data.get("company_name", symbol),
            "current_price": stock_data.get("current_price", 0),
            "currency": stock_data.get("currency", "USD"),
            "analysis": analysis,
            "market_data": stock_data,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # Supabase에 분석 결과 저장
        saved_analysis = await data_service.save_stock_analysis(
            user_id=current_user['id'],
            symbol=symbol,
            analysis_data=analysis_result
        )
        
        return {
            **analysis_result,
            "saved_id": saved_analysis['id'] if saved_analysis else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{symbol}/history")
async def get_stock_analysis_history(
    symbol: str,
    limit: int = Query(5, description="조회할 분석 개수"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """특정 종목의 분석 기록 조회"""
    try:
        data_service = SupabaseDataService()
        analyses = await data_service.get_stock_analysis_by_symbol(
            user_id=current_user['id'],
            symbol=symbol,
            limit=limit
        )
        
        return {
            "symbol": symbol,
            "analyses": analyses,
            "total_count": len(analyses)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_user_analysis_history(
    limit: int = Query(10, description="조회할 분석 개수"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """사용자의 모든 분석 기록 조회"""
    try:
        data_service = SupabaseDataService()
        analyses = await data_service.get_user_stock_analyses(
            user_id=current_user['id'],
            limit=limit
        )
        
        return {
            "analyses": analyses,
            "total_count": len(analyses)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-summary")
async def get_market_summary(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """전체 시장 요약 분석 (Supabase 저장)"""
    try:
        # 주요 지수들의 데이터 가져오기
        major_indices = ["^GSPC", "^DJI", "^IXIC", "^KS11", "^KQ11"]  # S&P500, 다우, 나스닥, 코스피, 코스닥
        market_data = []
        stock_service = StockService()

        for index in major_indices:
            try:
                if index.startswith("^KS") or index.startswith("^KQ"):
                    data = StockService.get_korean_stock_data(index.replace("^", ""))
                else:
                    data = await stock_service.get_stock_data(index)
                market_data.append(data)
            except:
                continue
        
        # OpenAI로 시장 전체 분석
        openai_service = OpenAIService()
        
        market_context = "\\n".join([
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
        
        # 시장 요약 결과 구성
        market_summary = {
            "market_data": market_data,
            "summary": summary,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # Supabase에 시장 요약 저장 (특별한 심볼로 저장)
        data_service = SupabaseDataService()
        await data_service.save_stock_analysis(
            user_id=current_user['id'],
            symbol="MARKET_SUMMARY",
            analysis_data=market_summary
        )
        
        # 활동 로그
        await data_service.log_user_activity(
            user_id=current_user['id'],
            activity_type="market_summary",
            details={"indices_count": len(major_indices)}
        )
        
        return market_summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/favorites/{symbol}")
async def add_favorite_stock(
    symbol: str,
    company_name: str = Query("", description="회사명 (선택사항)"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """관심 종목 추가"""
    try:
        data_service = SupabaseDataService()
        favorite = await data_service.add_favorite_stock(
            user_id=current_user['id'],
            symbol=symbol,
            company_name=company_name
        )
        
        if not favorite:
            raise HTTPException(status_code=500, detail="Failed to add favorite stock")
        
        # 활동 로그
        await data_service.log_user_activity(
            user_id=current_user['id'],
            activity_type="favorite_add",
            details={"symbol": symbol, "company_name": company_name}
        )
        
        return {
            "message": "Stock added to favorites",
            "favorite": favorite
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/favorites")
async def get_favorite_stocks(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """관심 종목 조회"""
    try:
        data_service = SupabaseDataService()
        favorites = await data_service.get_user_favorites(current_user['id'])
        
        return {
            "favorites": favorites,
            "total_count": len(favorites)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/favorites/{symbol}")
async def remove_favorite_stock(
    symbol: str,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """관심 종목 제거"""
    try:
        data_service = SupabaseDataService()
        success = await data_service.remove_favorite_stock(
            user_id=current_user['id'],
            symbol=symbol
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Favorite stock not found")
        
        return {"message": "Stock removed from favorites"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search-history")
async def get_search_history(
    limit: int = Query(20, description="조회할 검색 기록 개수"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """사용자 검색 기록 조회"""
    try:
        data_service = SupabaseDataService()
        search_history = await data_service.get_search_history(
            user_id=current_user['id'],
            limit=limit
        )
        
        return {
            "search_history": search_history,
            "total_count": len(search_history)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))