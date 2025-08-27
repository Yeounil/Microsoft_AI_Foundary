from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from app.services.news_service import NewsService
from app.services.news_db_service import NewsDBService
from app.services.openai_service import OpenAIService

router = APIRouter()

@router.get("/financial")
async def get_financial_news(
    query: str = Query("finance", description="검색 키워드"),
    limit: int = Query(10, description="가져올 뉴스 개수"),
    lang: str = Query("en", description="언어 (en: 영어, kr: 한국어)")
):
    """금융 뉴스 가져오기"""
    try:
        if lang.lower() == "kr":
            news = NewsService.get_korean_financial_news(limit)
        else:
            news = NewsService.get_financial_news(query, limit)
        
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
    force_crawl: bool = Query(False, description="강제 크롤링 여부")
):
    """특정 주식 관련 뉴스 (DB에서 가져오기 + 옵션으로 크롤링)"""
    try:
        if force_crawl:
            # 새로 크롤링
            news = await NewsService.crawl_and_save_stock_news(symbol, limit * 2)
        else:
            # DB에서 가져오기
            news = await NewsDBService.get_latest_news_by_symbol(symbol, limit)
            
            # DB에 뉴스가 부족한 경우 크롤링
            if len(news) < limit // 2:
                crawled_news = await NewsService.crawl_and_save_stock_news(symbol, limit)
                news = await NewsDBService.get_latest_news_by_symbol(symbol, limit)
        
        return {
            "symbol": symbol,
            "total_count": len(news),
            "articles": news
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stock/{symbol}/crawl")
async def crawl_stock_news(
    symbol: str,
    limit: int = Query(10, description="크롤링할 뉴스 개수")
):
    """특정 종목 뉴스 크롤링 및 저장"""
    try:
        articles = await NewsService.crawl_and_save_stock_news(symbol, limit)
        
        return {
            "symbol": symbol,
            "crawled_count": len(articles),
            "articles": articles,
            "message": f"{symbol} 종목의 {len(articles)}개 뉴스가 크롤링되어 저장되었습니다."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summarize")
async def summarize_news(
    query: str = Query("finance", description="검색 키워드"),
    limit: int = Query(5, description="요약할 뉴스 개수"),
    lang: str = Query("en", description="언어")
):
    """뉴스 AI 요약"""
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
            "generated_at": "2024-01-01T00:00:00Z"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stock/{symbol}/analyze")
async def analyze_stock_with_news(
    symbol: str,
    analysis_days: int = Query(7, description="분석할 뉴스 기간 (일)"),
    news_limit: int = Query(20, description="분석에 사용할 최대 뉴스 개수")
):
    """종목 뉴스 기반 AI 분석"""
    try:
        print(f"[DEBUG] 분석 시작: {symbol}, days={analysis_days}, limit={news_limit}")
        
        # 분석용 뉴스 데이터 가져오기
        news = await NewsDBService.get_news_for_analysis(symbol, analysis_days, news_limit)
        print(f"[DEBUG] 조회된 뉴스 개수: {len(news)}")
        
        # 뉴스가 부족한 경우 크롤링
        if len(news) < 5:
            await NewsService.crawl_and_save_stock_news(symbol, 10)
            news = await NewsDBService.get_news_for_analysis(symbol, analysis_days, news_limit)
        
        if not news:
            raise HTTPException(status_code=404, detail=f"{symbol} 관련 뉴스를 찾을 수 없습니다.")
        
        # OpenAI로 종합 분석 생성
        openai_service = OpenAIService()
        analysis_result = await openai_service.analyze_stock_with_news(symbol, news)
        
        # 사용자에게 보여줄 최신 뉴스 5개 선별
        display_news = sorted(news, key=lambda x: x.get('published_at', ''), reverse=True)[:5]
        
        return {
            "symbol": symbol,
            "analysis_period_days": analysis_days,
            "total_news_analyzed": len(news),
            "ai_analysis": analysis_result,
            "related_news": display_news,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stock/{symbol}/summarize")
async def summarize_stock_news(
    symbol: str,
    limit: int = Query(5, description="요약할 뉴스 개수")
):
    """특정 주식 관련 뉴스 AI 요약 (기존 호환성 유지)"""
    try:
        # DB에서 최신 뉴스 가져오기
        news = await NewsDBService.get_latest_news_by_symbol(symbol, limit)
        
        # 뉴스가 없으면 크롤링
        if not news:
            await NewsService.crawl_and_save_stock_news(symbol, limit)
            news = await NewsDBService.get_latest_news_by_symbol(symbol, limit)
        
        if not news:
            raise HTTPException(status_code=404, detail=f"{symbol} 관련 뉴스가 없습니다.")
        
        # OpenAI로 요약 생성
        openai_service = OpenAIService()
        summary = await openai_service.summarize_news(news)
        
        return {
            "symbol": symbol,
            "articles_count": len(news),
            "articles": news,
            "ai_summary": summary,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))