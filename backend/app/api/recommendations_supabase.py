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
    current_user: dict = Depends(get_current_user)
):
    """관심사 기반 추천 뉴스 (Supabase)"""
    try:
        interest_service = SupabaseUserInterestService()
        user_interests = await interest_service.get_user_interests_for_recommendation(current_user["user_id"])
        
        if not user_interests:
            return {
                "user_id": current_user["user_id"],
                "message": "관심사를 먼저 추가해주세요.",
                "recommendations": []
            }
        
        # 관심사 기반 뉴스 추천 (간단한 버전)
        # 실제 구현에서는 뉴스 서비스와 연동
        from app.services.sqlite_news_service import SQLiteNewsService
        
        all_news = []
        for interest in user_interests:
            # 관심사를 종목 심볼로 간주하고 뉴스 검색
            try:
                news = await SQLiteNewsService.get_latest_news_by_symbol(interest, limit=5)
                for article in news:
                    article['matched_interest'] = interest
                    article['recommendation_reason'] = f"관심사 '{interest}' 관련"
                all_news.extend(news)
            except:
                # 특정 관심사 뉴스 조회 실패해도 계속 진행
                continue
        
        # 중복 제거 및 제한
        seen_urls = set()
        unique_news = []
        for article in all_news:
            if article.get('url') not in seen_urls and len(unique_news) < limit:
                seen_urls.add(article.get('url'))
                unique_news.append(article)
        
        return {
            "user_id": current_user["user_id"],
            "user_interests": user_interests,
            "total_recommendations": len(unique_news),
            "recommendations": unique_news,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추천 뉴스 조회 오류: {str(e)}")