from fastapi import APIRouter, HTTPException, Query, Depends
from app.services.news_service import NewsService
from app.services.openai_service import OpenAIService
from app.services.supabase_data_service import SupabaseDataService
from app.api.auth_supabase import get_current_active_user
from typing import Dict, Any
from datetime import datetime

router = APIRouter()

@router.get("/test")
async def test_news():
    """테스트용 뉴스 엔드포인트 (인증 없음)"""
    try:
        news = NewsService.get_financial_news("finance", 5)
        return {
            "status": "success",
            "total_count": len(news),
            "articles": news
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-ai")
async def test_ai_analysis():
    """테스트용 AI 분석 엔드포인트 (인증 없음)"""
    try:
        from app.core.config import settings
        
        # OpenAI GPT-5 설정 확인
        config_status = {
            "openai_api_key": bool(settings.openai_api_key and settings.openai_api_key.strip()),
            "openai_model_name": settings.openai_model_name
        }

        # OpenAI가 설정되어 있는지 확인
        has_openai = config_status["openai_api_key"]

        if not has_openai:
            return {
                "status": "error",
                "message": "OpenAI GPT-5 is not configured",
                "config_status": config_status
            }
        
        # 뉴스 가져오기
        news = NewsService.get_financial_news("finance", 3)
        
        # AI 분석 시도
        openai_service = OpenAIService()
        summary = await openai_service.summarize_news(news)
        
        return {
            "status": "success",
            "config_status": config_status,
            "ai_provider": "openai_gpt5",
            "news_count": len(news),
            "ai_summary": summary[:200] + "..." if len(summary) > 200 else summary
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "config_status": config_status if 'config_status' in locals() else {}
        }

@router.get("/test-supabase")
async def test_supabase_connection():
    """테스트용 Supabase 연결 엔드포인트 (인증 없음)"""
    try:
        from app.db.supabase_client import get_supabase

        supabase = get_supabase()

        # 간단한 테이블 조회로 연결 테스트
        response = supabase.table("auth_users").select("count", count="exact").limit(1).execute()

        return {
            "status": "success",
            "message": "Supabase connection successful",
            "user_count": response.count if response.count is not None else "unknown"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Supabase connection failed: {str(e)}"
        }

@router.get("/latest")
async def get_latest_news_public(
    limit: int = Query(20, description="가져올 뉴스 개수"),
    offset: int = Query(0, description="건너뛸 뉴스 개수"),
    start_date: str = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: str = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    sort_by: str = Query("published_date", description="정렬 기준 (published_date, ai_score)"),
    order: str = Query("desc", description="정렬 순서 (asc, desc)")
):
    """
    최신 뉴스 조회 (인증 불필요)
    - news_articles 테이블에서 직접 조회
    - 페이지네이션 지원 (limit, offset)
    - 날짜 범위 필터링 지원
    - 정렬 옵션 지원
    """
    try:
        from app.db.supabase_client import get_supabase

        supabase = get_supabase()

        # 기본 쿼리 구성
        query = supabase.table("news_articles").select("*")

        # 날짜 범위 필터
        if start_date:
            query = query.gte("published_date", start_date)
        if end_date:
            query = query.lte("published_date", end_date)

        # 정렬
        if sort_by == "ai_score":
            query = query.order("ai_score", desc=(order.lower() == "desc"))
        else:
            query = query.order("published_date", desc=(order.lower() == "desc"))

        # 페이지네이션
        query = query.range(offset, offset + limit - 1)

        result = query.execute()

        return {
            "total_count": len(result.data) if result.data else 0,
            "offset": offset,
            "limit": limit,
            "articles": result.data if result.data else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{symbol}/public")
async def get_stock_news_public(
    symbol: str,
    limit: int = Query(20, description="가져올 뉴스 개수"),
    offset: int = Query(0, description="건너뛸 뉴스 개수"),
    start_date: str = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: str = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    sort_by: str = Query("published_date", description="정렬 기준 (published_date, ai_score)"),
    order: str = Query("desc", description="정렬 순서 (asc, desc)")
):
    """
    특정 종목 뉴스 조회 (인증 불필요)
    - news_articles 테이블에서 직접 조회
    - 페이지네이션 지원 (limit, offset)
    - 날짜 범위 필터링 지원
    - 정렬 옵션 지원
    """
    try:
        from app.db.supabase_client import get_supabase

        supabase = get_supabase()

        # 기본 쿼리 구성
        query = supabase.table("news_articles").select("*").eq("symbol", symbol.upper())

        # 날짜 범위 필터
        if start_date:
            query = query.gte("published_date", start_date)
        if end_date:
            query = query.lte("published_date", end_date)

        # 정렬
        if sort_by == "ai_score":
            query = query.order("ai_score", desc=(order.lower() == "desc"))
        else:
            query = query.order("published_date", desc=(order.lower() == "desc"))

        # 페이지네이션
        query = query.range(offset, offset + limit - 1)

        result = query.execute()

        return {
            "symbol": symbol.upper(),
            "total_count": len(result.data) if result.data else 0,
            "offset": offset,
            "limit": limit,
            "articles": result.data if result.data else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    limit: int = Query(10, description="가져올 뉴스 개수"),
    ai_mode: bool = Query(True, description="AI 추천 모드 사용 여부"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """특정 주식 관련 뉴스 (AI 추천 시스템 연동)"""
    try:
        if ai_mode:
            # AI 추천 시스템 사용 (개선된 방식)
            from app.services.fast_recommendation_service import FastRecommendationService
            
            fast_service = FastRecommendationService()
            result = await fast_service.get_stock_specific_recommendations(
                current_user['id'], symbol, limit
            )
            
            # 활동 로그
            data_service = SupabaseDataService()
            try:
                await data_service.log_user_activity(
                    user_id=current_user['id'],
                    activity_type="stock_news_ai_fetch",
                    details={
                        "symbol": symbol,
                        "articles_count": result.get('total_recommendations', 0),
                        "ai_mode": True
                    }
                )
            except Exception as log_error:
                print(f"활동 로그 실패: {log_error}")
            
            return {
                "symbol": symbol,
                "ai_mode": ai_mode,
                "total_count": result.get('total_recommendations', 0),
                "articles": result.get('recommendations', []),
                "ai_summary": result.get('ai_summary'),
                "user_interests": result.get('user_interests', []),
                "recommendation_type": "stock_specific_ai",
                "generated_at": result.get('generated_at')
            }
        else:
            # 기존 방식 (레거시 지원)
            news = NewsService.get_stock_related_news(symbol, limit)
            
            # 활동 로그
            data_service = SupabaseDataService()
            try:
                await data_service.log_user_activity(
                    user_id=current_user['id'],
                    activity_type="stock_news_fetch",
                    details={
                        "symbol": symbol,
                        "articles_count": len(news),
                        "ai_mode": False
                    }
                )
            except Exception as log_error:
                print(f"활동 로그 실패: {log_error}")
            
            return {
                "symbol": symbol,
                "ai_mode": ai_mode,
                "total_count": len(news),
                "articles": news,
                "recommendation_type": "legacy"
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

@router.post("/summarize-article")
async def summarize_single_article(
    article: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """개별 뉴스 기사 AI 요약"""
    try:
        if not article:
            raise HTTPException(status_code=400, detail="뉴스 기사 정보가 필요합니다.")

        # OpenAI로 개별 기사 요약 생성
        openai_service = OpenAIService()
        summary = await openai_service.summarize_single_article(article)

        # 활동 로그 저장
        data_service = SupabaseDataService()
        try:
            await data_service.log_user_activity(
                user_id=current_user['id'],
                activity_type="article_summary",
                details={
                    "article_title": article.get('title', ''),
                    "article_url": article.get('url', '')
                }
            )
        except Exception as log_error:
            print(f"활동 로그 실패: {log_error}")

        return {
            "article_title": article.get('title', ''),
            "ai_summary": summary,
            "generated_at": datetime.utcnow().isoformat()
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