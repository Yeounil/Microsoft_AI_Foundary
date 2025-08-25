from fastapi import APIRouter, HTTPException, Query
from app.services.news_service import NewsService
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
    limit: int = Query(5, description="가져올 뉴스 개수")
):
    """특정 주식 관련 뉴스"""
    try:
        news = NewsService.get_stock_related_news(symbol, limit)
        
        return {
            "symbol": symbol,
            "total_count": len(news),
            "articles": news
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

@router.post("/stock/{symbol}/summarize")
async def summarize_stock_news(
    symbol: str,
    limit: int = Query(5, description="요약할 뉴스 개수")
):
    """특정 주식 관련 뉴스 AI 요약"""
    try:
        # 해당 주식 뉴스 가져오기
        news = NewsService.get_stock_related_news(symbol, limit)
        
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
            "generated_at": "2024-01-01T00:00:00Z"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))