from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.news_recommendation_service import NewsRecommendationService
from app.core.auth_temp import get_current_user_or_create_temp as get_current_user
from app.models.user import User

router = APIRouter()

class UserInterestRequest(BaseModel):
    symbol: str
    market: str
    company_name: Optional[str] = None
    priority: int = 1

class NewsInteractionRequest(BaseModel):
    news_url: str
    action: str  # 'view', 'like', 'dislike', 'share', 'bookmark'
    news_title: Optional[str] = None
    symbol: Optional[str] = None
    interaction_time: int = 0

@router.get("/news")
async def get_recommended_news(
    limit: int = Query(10, description="추천 뉴스 개수"),
    days_back: int = Query(7, description="검색할 뉴스 기간(일)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """사용자 맞춤 뉴스 추천"""
    try:
        recommendation_service = NewsRecommendationService(db)
        
        recommended_news = await recommendation_service.get_personalized_news_recommendations(
            user_id=current_user.id,
            limit=limit,
            days_back=days_back
        )
        
        return {
            "user_id": current_user.id,
            "total_count": len(recommended_news),
            "recommendations": recommended_news,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"뉴스 추천 생성 오류: {str(e)}")

@router.get("/interests")
async def get_user_interests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """사용자 관심 종목 목록 조회"""
    try:
        recommendation_service = NewsRecommendationService(db)
        interests = recommendation_service.get_user_interests(current_user.id)
        
        return {
            "user_id": current_user.id,
            "interests": interests
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"관심 종목 조회 오류: {str(e)}")

@router.post("/interests")
async def add_user_interest(
    interest_request: UserInterestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """사용자 관심 종목 추가"""
    try:
        recommendation_service = NewsRecommendationService(db)
        
        success = await recommendation_service.add_user_interest(
            user_id=current_user.id,
            symbol=interest_request.symbol,
            market=interest_request.market,
            company_name=interest_request.company_name,
            priority=interest_request.priority
        )
        
        if success:
            return {
                "message": f"{interest_request.symbol} 종목이 관심 목록에 추가되었습니다.",
                "symbol": interest_request.symbol,
                "market": interest_request.market
            }
        else:
            raise HTTPException(status_code=400, detail="관심 종목 추가에 실패했습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"관심 종목 추가 오류: {str(e)}")

@router.delete("/interests/{symbol}")
async def remove_user_interest(
    symbol: str,
    market: str = Query(..., description="시장 구분 (us/kr)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """사용자 관심 종목 제거"""
    try:
        recommendation_service = NewsRecommendationService(db)
        
        success = await recommendation_service.remove_user_interest(
            user_id=current_user.id,
            symbol=symbol,
            market=market
        )
        
        if success:
            return {
                "message": f"{symbol} 종목이 관심 목록에서 제거되었습니다.",
                "symbol": symbol
            }
        else:
            raise HTTPException(status_code=404, detail="해당 관심 종목을 찾을 수 없습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"관심 종목 제거 오류: {str(e)}")

@router.post("/interactions")
async def track_news_interaction(
    interaction: NewsInteractionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """뉴스 상호작용 추적"""
    try:
        recommendation_service = NewsRecommendationService(db)
        
        success = await recommendation_service.track_news_interaction(
            user_id=current_user.id,
            news_url=interaction.news_url,
            action=interaction.action,
            news_title=interaction.news_title,
            symbol=interaction.symbol,
            interaction_time=interaction.interaction_time
        )
        
        if success:
            return {
                "message": "상호작용이 기록되었습니다.",
                "action": interaction.action,
                "url": interaction.news_url
            }
        else:
            raise HTTPException(status_code=400, detail="상호작용 기록에 실패했습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상호작용 추적 오류: {str(e)}")

@router.get("/news/{symbol}")
async def get_symbol_related_news(
    symbol: str,
    market: str = Query("us", description="시장 구분 (us/kr)"),
    limit: int = Query(10, description="뉴스 개수"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """특정 종목 관련 뉴스 (관심 종목에 자동 추가 옵션)"""
    try:
        from app.services.news_db_service import NewsDBService
        
        # 뉴스 가져오기
        news = await NewsDBService.get_latest_news_by_symbol(symbol, limit)
        
        # 이 종목이 사용자 관심 목록에 있는지 확인
        recommendation_service = NewsRecommendationService(db)
        user_interests = recommendation_service.get_user_interests(current_user.id)
        is_interested = any(
            interest['symbol'] == symbol and interest['market'] == market 
            for interest in user_interests
        )
        
        return {
            "symbol": symbol,
            "market": market,
            "is_user_interest": is_interested,
            "total_count": len(news),
            "articles": news,
            "suggestion": "이 종목을 관심 목록에 추가하시겠습니까?" if not is_interested else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"종목 뉴스 조회 오류: {str(e)}")

@router.post("/news/{symbol}/auto-interest")
async def auto_add_interest_from_news(
    symbol: str,
    market: str = Query("us", description="시장 구분"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """뉴스 조회 시 자동으로 관심 종목에 추가"""
    try:
        # 종목 정보 가져오기 (회사명 등)
        from app.services.stock_service import StockService
        
        if market.lower() == "kr":
            stock_data = StockService.get_korean_stock_data(symbol, "1d")
        else:
            stock_data = StockService.get_stock_data(symbol, "1d")
        
        company_name = stock_data.get("company_name", symbol)
        
        # 관심 종목에 추가
        recommendation_service = NewsRecommendationService(db)
        success = await recommendation_service.add_user_interest(
            user_id=current_user.id,
            symbol=symbol,
            market=market,
            company_name=company_name,
            priority=2  # 자동 추가는 중간 우선순위
        )
        
        if success:
            return {
                "message": f"{company_name}({symbol})이 관심 종목에 추가되었습니다.",
                "symbol": symbol,
                "company_name": company_name,
                "auto_added": True
            }
        else:
            raise HTTPException(status_code=400, detail="자동 관심 종목 추가 실패")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자동 관심 종목 추가 오류: {str(e)}")

@router.get("/news/trending")
async def get_trending_news(
    limit: int = Query(20, description="인기 뉴스 개수"),
    hours: int = Query(24, description="집계 시간 범위"),
    db: Session = Depends(get_db)
):
    """인기 뉴스 (사용자 상호작용 기반)"""
    try:
        # 최근 시간 내에 가장 많은 상호작용을 받은 뉴스
        from sqlalchemy import func, desc
        from app.models.user_interest import UserNewsInteraction
        from datetime import timedelta
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # 상호작용이 많은 뉴스 URL 조회
        trending_urls = db.query(
            UserNewsInteraction.news_url,
            UserNewsInteraction.news_title,
            func.count(UserNewsInteraction.id).label('interaction_count'),
            func.count(func.distinct(UserNewsInteraction.user_id)).label('unique_users')
        ).filter(
            UserNewsInteraction.created_at >= cutoff_time
        ).group_by(
            UserNewsInteraction.news_url, 
            UserNewsInteraction.news_title
        ).order_by(
            desc('interaction_count'),
            desc('unique_users')
        ).limit(limit).all()
        
        trending_news = [
            {
                "url": item.news_url,
                "title": item.news_title,
                "interaction_count": item.interaction_count,
                "unique_users": item.unique_users,
                "trending_score": item.interaction_count * 0.7 + item.unique_users * 0.3
            }
            for item in trending_urls
        ]
        
        return {
            "period_hours": hours,
            "total_count": len(trending_news),
            "trending_news": trending_news,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"인기 뉴스 조회 오류: {str(e)}")