from fastapi import APIRouter, HTTPException, Query, Depends
from app.services.news_service import NewsService
from app.services.openai_service import OpenAIService
from app.services.supabase_data_service import SupabaseDataService
from app.api.auth_supabase import get_current_active_user
from typing import Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/financial")
async def get_financial_news_v1(
    symbol: Optional[str] = Query(None, description="특정 종목 심볼 (옵셔널)"),
    symbols: Optional[str] = Query(None, description="여러 종목 심볼 (쉼표로 구분, 예: AAPL,MSFT,GOOGL)"),
    limit: int = Query(5, description="가져올 뉴스 개수"),
    page: int = Query(1, description="페이지 번호 (1부터 시작)"),
    lang: str = Query("en", description="언어 (en: 영어, kr: 한국어)")
):
    """금융 뉴스 가져오기 (v1 호환성) - 페이지네이션 지원

    조건:
    - kr_translate가 NULL이 아닌 기사만
    - ai_score가 0.5 이상인 기사만
    - analyzed_at이 NULL이 아닌 기사만
    - positive_score가 NULL이 아닌 기사만
    - published_at 내림차순 정렬 (최신 기사부터)
    - symbol이 제공되면 해당 종목 기사만
    - symbols가 제공되면 해당 종목들의 기사만 (OR 조건)
    """
    try:
        from app.db.supabase_client import get_supabase

        supabase = get_supabase()

        # offset 계산 (페이지네이션)
        offset = (page - 1) * limit

        # 쿼리 빌드
        query_builder = supabase.table("news_articles").select("*")

        # 필터링 조건
        # 1. kr_translate가 NULL이 아닌 것만
        query_builder = query_builder.not_.is_("kr_translate", "null")

        # 2. ai_score가 0.5 이상인 것만
        query_builder = query_builder.gte("ai_score", 0.5)

        # 3. analyzed_at이 NULL이 아닌 것만
        query_builder = query_builder.not_.is_("analyzed_at", "null")

        # 4. positive_score가 NULL이 아닌 것만
        query_builder = query_builder.not_.is_("positive_score", "null")

        # 5. symbol(s) 필터링
        if symbols:
            # 여러 종목의 경우 (쉼표로 구분)
            symbol_list = [s.strip().upper() for s in symbols.split(",")]
            query_builder = query_builder.in_("symbol", symbol_list)
        elif symbol:
            # 단일 종목의 경우
            query_builder = query_builder.eq("symbol", symbol.upper())

        # 6. published_at 내림차순 정렬 (최신 기사부터)
        query_builder = query_builder.order("published_at", desc=True)

        # 7. 페이지네이션 (offset과 limit)
        query_builder = query_builder.range(offset, offset + limit - 1)

        # 실행
        result = query_builder.execute()

        news = result.data if result.data else []

        # kr_title이 있으면 title을 대체
        for article in news:
            if article.get("kr_title"):
                article["title"] = article["kr_title"]

        return {
            "symbol": symbol,
            "symbols": symbols,
            "language": lang,
            "page": page,
            "limit": limit,
            "total_count": len(news),
            "articles": news
        }

    except Exception as e:
        logger.error(f"금융 뉴스 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{news_id}")
async def get_news_by_id(news_id: int):
    """뉴스 ID로 특정 뉴스 상세 정보 조회"""
    try:
        from app.db.supabase_client import get_supabase

        supabase = get_supabase()

        # 뉴스 ID로 조회
        result = supabase.table("news_articles").select("*").eq("id", news_id).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"뉴스를 찾을 수 없습니다 (ID: {news_id})")

        news = result.data[0]

        # kr_title이 있으면 title을 대체
        if news.get("kr_title"):
            news["title"] = news["kr_title"]

        return news

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"뉴스 조회 오류 (ID: {news_id}): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{symbol}")
async def get_stock_news_v1(
    symbol: str,
    limit: int = Query(20, description="가져올 뉴스 개수"),
    force_crawl: bool = Query(False, description="강제 크롤링 여부")
):
    """특정 주식 관련 뉴스 (v1 호환성)"""
    try:
        from app.services.news_db_service import NewsDBService

        # 1. DB에서 뉴스 조회
        news = await NewsDBService.get_latest_news_by_symbol(symbol=symbol, limit=limit)

        # 2. 뉴스가 부족하면 크롤링
        if len(news) < 5 or force_crawl:
            logger.info(f"{symbol} 뉴스가 부족합니다 ({len(news)}개). 크롤링을 시작합니다.")
            await NewsService.crawl_and_save_stock_news(symbol, limit)
            # 크롤링 후 다시 조회
            news = await NewsDBService.get_latest_news_by_symbol(symbol=symbol, limit=limit)

        # kr_title이 있으면 title을 대체
        for article in news:
            if article.get("kr_title"):
                article["title"] = article["kr_title"]

        return {
            "symbol": symbol,
            "total_count": len(news),
            "articles": news,
            "force_crawl": force_crawl
        }

    except Exception as e:
        logger.error(f"뉴스 조회 오류 ({symbol}): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stock/{symbol}/crawl")
async def crawl_stock_news_v1(
    symbol: str,
    limit: int = Query(10, description="크롤링할 뉴스 개수")
):
    """특정 주식 뉴스 크롤링 (v1 호환성)"""
    try:
        from app.services.news_db_service import NewsDBService

        # 실제 크롤링 수행
        logger.info(f"{symbol} 뉴스 크롤링 시작...")
        crawled_news = await NewsService.crawl_and_save_stock_news(symbol, limit)

        # 크롤링 후 DB에서 조회
        news = await NewsDBService.get_latest_news_by_symbol(symbol=symbol, limit=limit)

        # kr_title이 있으면 title을 대체
        for article in news:
            if article.get("kr_title"):
                article["title"] = article["kr_title"]

        return {
            "symbol": symbol,
            "message": f"{symbol} 뉴스를 성공적으로 크롤링했습니다.",
            "crawled_count": len(crawled_news),
            "total_count": len(news),
            "articles": news
        }

    except Exception as e:
        logger.error(f"뉴스 크롤링 오류 ({symbol}): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stock/{symbol}/analyze")
async def analyze_stock_with_news_v1(
    symbol: str,
    analysis_days: int = Query(7, description="분석 기간 (일)"),
    news_limit: int = Query(20, description="분석할 뉴스 개수")
):
    """뉴스 기반 주식 분석 (v1 호환성)"""
    import logging
    import traceback
    
    logger = logging.getLogger(__name__)
    logger.info(f"주식 분석 시작: {symbol}, news_limit: {news_limit}")
    
    try:
        # 뉴스 가져오기
        logger.info(f"뉴스 서비스에서 {symbol} 뉴스 가져오는 중...")
        news = NewsService.get_stock_related_news(symbol, news_limit)
        logger.info(f"뉴스 가져오기 완료: {len(news)}개")
        
        if not news:
            logger.warning(f"{symbol} 관련 뉴스가 없음")
            raise HTTPException(status_code=404, detail=f"{symbol} 관련 뉴스가 없습니다.")
        
        # AI 분석 생성
        logger.info(f"OpenAI 서비스 초기화 중...")
        openai_service = OpenAIService()
        logger.info(f"OpenAI 서비스 초기화 완료, 분석 실행 중...")
        
        analysis = await openai_service.analyze_stock_with_news(symbol, news)
        logger.info(f"AI 분석 완료: {len(analysis) if analysis else 0}자")
        
        return {
            "symbol": symbol,
            "analysis_period_days": analysis_days,
            "total_news_analyzed": len(news),
            "ai_analysis": analysis,
            "related_news": news[:10],  # 상위 10개만 반환
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"주식 분석 오류 ({symbol}): {str(e)}")
        logger.error(f"에러 트레이스백: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"주식 분석 중 오류가 발생했습니다: {str(e)}")

@router.post("/summarize")
async def summarize_news_v1(
    query: str = Query("finance", description="검색 키워드"),
    limit: int = Query(5, description="요약할 뉴스 개수"),
    lang: str = Query("en", description="언어")
):
    """뉴스 AI 요약 (v1 호환성)"""
    try:
        # 뉴스 가져오기
        if lang.lower() == "kr":
            news = NewsService.get_korean_financial_news(limit)
        else:
            news = NewsService.get_financial_news(query, limit)
        
        if not news:
            raise HTTPException(status_code=404, detail="요약할 뉴스가 없습니다.")
        
        # OpenAI로 요약 생성
        openai_service = OpenAIService()
        summary = await openai_service.summarize_news(news)
        
        return {
            "query": query,
            "language": lang,
            "articles_count": len(news),
            "articles": news,
            "ai_summary": summary,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stock/{symbol}/summarize")
async def summarize_stock_news_v1(
    symbol: str,
    limit: int = Query(5, description="요약할 뉴스 개수")
):
    """특정 주식 관련 뉴스 AI 요약 (v1 호환성)"""
    try:
        # 해당 주식 뉴스 가져오기
        news = NewsService.get_stock_related_news(symbol, limit)
        
        if not news:
            raise HTTPException(status_code=404, detail=f"{symbol} 관련 뉴스가 없습니다.")
        
        # OpenAI로 요약 생성
        openai_service = OpenAIService()
        summary = await openai_service.summarize_news(news)
        
        return {
            "query": f"stock_{symbol}",
            "language": "en",
            "articles_count": len(news),
            "articles": news,
            "ai_summary": summary,
            "stock_symbol": symbol,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))