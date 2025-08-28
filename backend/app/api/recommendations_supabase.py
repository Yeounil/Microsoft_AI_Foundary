from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel

from app.services.supabase_user_interest_service import SupabaseUserInterestService
from app.services.supabase_user_service import SupabaseUserService
from app.core.auth_supabase import get_current_user_or_create_temp as get_current_user

router = APIRouter()

class UserInterestRequest(BaseModel):
    interest: str

class InterestUpdateRequest(BaseModel):
    interest: str

@router.get("/interests")
async def get_user_interests(
    current_user: dict = Depends(get_current_user)
):
    """사용자 관심사 목록 조회 (Supabase)"""
    try:
        interest_service = SupabaseUserInterestService()
        interests = await interest_service.get_user_interests(current_user["user_id"])
        
        return {
            "user_id": current_user["user_id"],
            "total_count": len(interests),
            "interests": interests
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"관심사 조회 오류: {str(e)}")

@router.post("/interests")
async def add_user_interest(
    interest_request: UserInterestRequest,
    current_user: dict = Depends(get_current_user)
):
    """사용자 관심사 추가 (Supabase)"""
    try:
        interest_service = SupabaseUserInterestService()
        
        result = await interest_service.add_user_interest(
            user_id=current_user["user_id"],
            interest=interest_request.interest
        )
        
        if result:
            return {
                "message": f"'{interest_request.interest}' 관심사가 추가되었습니다.",
                "interest": interest_request.interest,
                "added_at": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=400, detail="관심사 추가에 실패했습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"관심사 추가 오류: {str(e)}")

@router.delete("/interests/{interest_id}")
async def remove_user_interest(
    interest_id: int,
    current_user: dict = Depends(get_current_user)
):
    """사용자 관심사 삭제 (ID로) (Supabase)"""
    try:
        interest_service = SupabaseUserInterestService()
        
        success = await interest_service.remove_user_interest(
            user_id=current_user["user_id"],
            interest_id=interest_id
        )
        
        if success:
            return {
                "message": f"관심사 ID {interest_id}가 삭제되었습니다.",
                "interest_id": interest_id,
                "deleted_at": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail="해당 관심사를 찾을 수 없습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"관심사 삭제 오류: {str(e)}")

@router.delete("/interests/symbol/{interest}")
async def remove_user_interest_by_symbol(
    interest: str,
    current_user: dict = Depends(get_current_user)
):
    """사용자 관심사 삭제 (심볼로) (Supabase)"""
    try:
        interest_service = SupabaseUserInterestService()
        
        success = await interest_service.remove_user_interest_by_symbol(
            user_id=current_user["user_id"],
            interest=interest
        )
        
        if success:
            return {
                "message": f"'{interest}' 관심사가 삭제되었습니다.",
                "interest": interest,
                "deleted_at": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail="해당 관심사를 찾을 수 없습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"관심사 삭제 오류: {str(e)}")

@router.put("/interests/{interest_id}")
async def update_user_interest(
    interest_id: int,
    update_request: InterestUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """사용자 관심사 업데이트 (Supabase)"""
    try:
        interest_service = SupabaseUserInterestService()
        
        success = await interest_service.update_user_interest(
            user_id=current_user["user_id"],
            interest_id=interest_id,
            new_interest=update_request.interest
        )
        
        if success:
            return {
                "message": f"관심사 ID {interest_id}가 업데이트되었습니다.",
                "interest_id": interest_id,
                "new_interest": update_request.interest,
                "updated_at": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail="해당 관심사를 찾을 수 없습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"관심사 업데이트 오류: {str(e)}")

@router.get("/interests/for-recommendations")
async def get_user_interests_for_recommendations(
    current_user: dict = Depends(get_current_user)
):
    """추천용 사용자 관심사 목록 (단순 심볼 리스트) (Supabase)"""
    try:
        interest_service = SupabaseUserInterestService()
        interests = await interest_service.get_user_interests_for_recommendation(current_user["user_id"])
        
        return {
            "user_id": current_user["user_id"],
            "interests_count": len(interests),
            "interests": interests
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추천용 관심사 조회 오류: {str(e)}")

@router.get("/interests/statistics")
async def get_interest_statistics(
    current_user: dict = Depends(get_current_user)
):
    """사용자 관심사 통계 (Supabase)"""
    try:
        interest_service = SupabaseUserInterestService()
        stats = await interest_service.get_interest_statistics(current_user["user_id"])
        
        return {
            "user_id": current_user["user_id"],
            "statistics": stats,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"관심사 통계 조회 오류: {str(e)}")

@router.get("/news/recommended")
async def get_recommended_news_by_interests(
    limit: int = Query(10, description="추천 뉴스 개수"),
    fast_mode: bool = Query(True, description="빠른 모드 사용 여부 (DB 기반)"),
    current_user: dict = Depends(get_current_user)
):
    """AI 기반 관심사 추천 뉴스 (빠른 모드)"""
    try:
        # 빠른 모드 (기본값) - DB에서 사전 분석된 뉴스 사용
        if fast_mode:
            from app.services.fast_recommendation_service import FastRecommendationService
            
            fast_service = FastRecommendationService()
            result = await fast_service.get_personalized_recommendations(
                current_user["user_id"], limit
            )
            return result
        
        # 기존 실시간 모드 (폴백)
        from app.services.ai_news_recommendation_service import AINewsRecommendationService
        
        ai_service = AINewsRecommendationService()
        result = await ai_service.get_ai_personalized_recommendations(
            current_user["user_id"], limit
        )
        result["recommendation_type"] = "realtime"
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추천 뉴스 조회 오류: {str(e)}")

@router.get("/news/ai-sentiment")
async def get_ai_market_sentiment(
    symbols: List[str] = Query(..., description="분석할 종목 심볼들"),
    days_back: int = Query(3, description="분석 기간 (일)"),
    current_user: dict = Depends(get_current_user)
):
    """AI 기반 시장 감정 분석"""
    try:
        from app.services.ai_news_recommendation_service import AINewsRecommendationService
        
        ai_service = AINewsRecommendationService()
        result = await ai_service.get_ai_market_sentiment_analysis(symbols, days_back)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 감정 분석 오류: {str(e)}")

@router.get("/news/ai-insights/{symbol}")
async def get_ai_stock_insights(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """특정 종목에 대한 AI 인사이트"""
    try:
        from app.services.ai_news_recommendation_service import AINewsRecommendationService
        
        ai_service = AINewsRecommendationService()
        result = await ai_service.generate_ai_news_insights(
            current_user["user_id"], symbol
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 인사이트 생성 오류: {str(e)}")

@router.post("/news/auto-collect")
async def trigger_auto_news_collection(
    force_refresh: bool = Query(False, description="강제 새로고침 여부"),
    current_user: dict = Depends(get_current_user)
):
    """사용자 관심사 기반 자동 뉴스 수집 트리거"""
    try:
        from app.services.ai_news_recommendation_service import AINewsRecommendationService
        
        # 사용자 관심사 조회
        interest_service = SupabaseUserInterestService()
        user_interests = await interest_service.get_user_interests_for_recommendation(
            current_user["user_id"]
        )
        
        if not user_interests:
            return {
                "message": "관심사를 먼저 추가해주세요.",
                "collected_count": 0
            }
        
        # AI 서비스로 뉴스 수집
        ai_service = AINewsRecommendationService()
        news_data = await ai_service._collect_and_analyze_news(user_interests, 50)
        
        return {
            "message": "자동 뉴스 수집 완료",
            "user_interests": user_interests,
            "collected_count": len(news_data),
            "collection_time": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자동 뉴스 수집 오류: {str(e)}")

@router.post("/news/background-collect")
async def trigger_background_news_collection(
    limit_per_symbol: int = Query(20, description="종목당 수집할 뉴스 개수"),
    current_user: dict = Depends(get_current_user)
):
    """백그라운드 뉴스 수집 (인기 종목 기반)"""
    try:
        from app.services.background_news_collector import BackgroundNewsCollector
        
        collector = BackgroundNewsCollector()
        result = await collector.collect_popular_symbols_news(limit_per_symbol)
        
        return {
            "message": "백그라운드 뉴스 수집 완료",
            "collection_result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"백그라운드 뉴스 수집 오류: {str(e)}")

@router.get("/news/trending")
async def get_trending_news(
    limit: int = Query(10, description="트렌딩 뉴스 개수"),
    current_user: dict = Depends(get_current_user)
):
    """트렌딩 뉴스 조회 (적합 점수 기반)"""
    try:
        from app.services.fast_recommendation_service import FastRecommendationService
        
        fast_service = FastRecommendationService()
        result = await fast_service.get_trending_news(limit)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"트렌딩 뉴스 조회 오류: {str(e)}")

@router.post("/news/cleanup")
async def cleanup_old_news(
    days_old: int = Query(7, description="삭제할 뉴스의 기준일 (일)"),
    current_user: dict = Depends(get_current_user)
):
    """오래된 뉴스 정리"""
    try:
        from app.services.background_news_collector import BackgroundNewsCollector
        
        collector = BackgroundNewsCollector()
        result = await collector.cleanup_old_news(days_old)
        
        return {
            "message": f"{days_old}일 이전 뉴스 정리 완료",
            "cleanup_result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"뉴스 정리 오류: {str(e)}")