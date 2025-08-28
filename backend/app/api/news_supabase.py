from fastapi import APIRouter, HTTPException, Query, Depends
from app.services.news_service import NewsService
from app.services.openai_service import OpenAIService
from app.services.supabase_data_service import SupabaseDataService
from app.api.auth_supabase import get_current_active_user
from typing import Dict, Any
from datetime import datetime

router = APIRouter()

@router.get("/financial")
async def get_financial_news(
    query: str = Query("finance", description="검색 키워드"),
    limit: int = Query(10, description="가져올 뉴스 개수"),
    lang: str = Query("en", description="언어 (en: 영어, kr: 한국어)"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """금융 뉴스 가져오기"""
    try:
        # 동기 함수 호출 (await 제거)
        if lang.lower() == "kr":
            news = NewsService.get_korean_financial_news(limit)
        else:
            news = NewsService.get_financial_news(query, limit)
        
        # 뉴스 조회 기록 추가 (각 뉴스 기사별로)
        data_service = SupabaseDataService()
        try:
            for article in news[:5]:  # 상위 5개 기사만 기록
                if article.get('url'):
                    await data_service.add_news_history(
                        user_id=current_user['id'],
                        article_url=article['url'],
                        title=article.get('title', '')
                    )
        except Exception as log_error:
            print(f"뉴스 기록 로그 실패: {log_error}")
        
        return {
            "query": query,
            "language": lang,
            "total_count": len(news),
            "articles": news
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{symbol}")
async def get_stock_news(
    symbol: str,
    limit: int = Query(5, description="가져올 뉴스 개수"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """특정 주식 관련 뉴스"""
    try:
        # 동기 함수 호출 (await 제거)
        news = NewsService.get_stock_related_news(symbol, limit)
        
        # 활동 로그
        data_service = SupabaseDataService()
        try:
            await data_service.log_user_activity(
                user_id=current_user['id'],
                activity_type="stock_news_fetch",
                details={
                    "symbol": symbol,
                    "articles_count": len(news)
                }
            )
        except Exception as log_error:
            print(f"활동 로그 실패: {log_error}")
        
        return {
            "query": symbol,
            "language": "en",
            "total_count": len(news),
            "articles": news
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summarize")
async def summarize_news(
    query: str = Query("finance", description="검색 키워드"),
    limit: int = Query(5, description="요약할 뉴스 개수"),
    lang: str = Query("en", description="언어"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """뉴스 AI 요약 (Supabase 저장)"""
    try:
        # 뉴스 가져오기 (동기 함수 호출)
        if lang.lower() == "kr":
            news = NewsService.get_korean_financial_news(limit)
        else:
            news = NewsService.get_financial_news(query, limit)
        
        if not news:
            raise HTTPException(status_code=404, detail="요약할 뉴스가 없습니다.")
        
        # OpenAI로 요약 생성
        openai_service = OpenAIService()
        summary = await openai_service.summarize_news(news)
        
        # 뉴스 요약 데이터 구성
        news_summary_data = {
            "query": query,
            "language": lang,
            "articles_count": len(news),
            "articles": news,
            "ai_summary": summary,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # Supabase에 뉴스 요약 저장
        data_service = SupabaseDataService()
        saved_summary = await data_service.save_news_summary(
            user_id=current_user['id'],
            news_data=news_summary_data
        )
        
        # 활동 로그 저장
        await data_service.log_user_activity(
            user_id=current_user['id'],
            activity_type="news_summary",
            details={
                "query": query,
                "language": lang,
                "articles_count": len(news)
            }
        )
        
        return {
            **news_summary_data,
            "saved_id": saved_summary['id'] if saved_summary else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stock/{symbol}/summarize")
async def summarize_stock_news(
    symbol: str,
    limit: int = Query(5, description="요약할 뉴스 개수"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """특정 주식 관련 뉴스 AI 요약 (Supabase 저장)"""
    try:
        # 해당 주식 뉴스 가져오기 (동기 함수 호출)
        news = NewsService.get_stock_related_news(symbol, limit)
        
        if not news:
            raise HTTPException(status_code=404, detail=f"{symbol} 관련 뉴스가 없습니다.")
        
        # OpenAI로 요약 생성
        openai_service = OpenAIService()
        summary = await openai_service.summarize_news(news)
        
        # 뉴스 요약 데이터 구성
        news_summary_data = {
            "query": f"stock_{symbol}",
            "language": "en",
            "articles_count": len(news),
            "articles": news,
            "ai_summary": summary,
            "stock_symbol": symbol,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # Supabase에 뉴스 요약 저장
        data_service = SupabaseDataService()
        saved_summary = await data_service.save_news_summary(
            user_id=current_user['id'],
            news_data=news_summary_data
        )
        
        # 활동 로그 저장
        await data_service.log_user_activity(
            user_id=current_user['id'],
            activity_type="stock_news_summary",
            details={
                "symbol": symbol,
                "articles_count": len(news)
            }
        )
        
        return {
            **news_summary_data,
            "saved_id": saved_summary['id'] if saved_summary else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summaries/history")
async def get_news_summaries_history(
    limit: int = Query(10, description="조회할 요약 개수"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """사용자의 뉴스 요약 기록 조회"""
    try:
        data_service = SupabaseDataService()
        summaries = await data_service.get_user_news_summaries(
            user_id=current_user['id'],
            limit=limit
        )
        
        return {
            "summaries": summaries,
            "total_count": len(summaries)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_news_history(
    limit: int = Query(20, description="조회할 뉴스 기록 개수"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """사용자 뉴스 조회 기록"""
    try:
        data_service = SupabaseDataService()
        news_history = await data_service.get_news_history(
            user_id=current_user['id'],
            limit=limit
        )
        
        return {
            "news_history": news_history,
            "total_count": len(news_history)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))