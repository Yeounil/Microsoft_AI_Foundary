import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import json
from datetime import datetime, timedelta
from app.core.config import settings

class NewsService:
    
    @staticmethod
    def get_financial_news(query: str = "finance", limit: int = 10) -> List[Dict]:
        """금융 뉴스 가져오기 (News API 사용)"""
        try:
            if not settings.news_api_key:
                # News API 키가 없는 경우 더미 데이터 반환
                return NewsService._get_dummy_news()
            
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": query,
                "apiKey": settings.news_api_key,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": limit,
                "domains": "bloomberg.com,reuters.com,cnbc.com,marketwatch.com,yahoo.com"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            articles = []
            
            for article in data.get("articles", []):
                articles.append({
                    "title": article.get("title", ""),
                    "description": article.get("description", ""),
                    "url": article.get("url", ""),
                    "source": article.get("source", {}).get("name", ""),
                    "published_at": article.get("publishedAt", ""),
                    "image_url": article.get("urlToImage", "")
                })
            
            return articles
            
        except Exception as e:
            print(f"뉴스 API 오류: {str(e)}")
            return NewsService._get_dummy_news()
    
    @staticmethod
    def get_korean_financial_news(limit: int = 10) -> List[Dict]:
        """한국 금융 뉴스 크롤링"""
        try:
            # 네이버 금융 뉴스 크롤링 (예시)
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            # 실제 크롤링 대신 더미 데이터 반환
            # 실제 구현에서는 robots.txt를 확인하고 적절한 크롤링을 수행해야 함
            return NewsService._get_dummy_korean_news()
            
        except Exception as e:
            print(f"한국 뉴스 크롤링 오류: {str(e)}")
            return NewsService._get_dummy_korean_news()
    
    @staticmethod
    def get_stock_related_news(symbol: str, limit: int = 5) -> List[Dict]:
        """특정 주식 관련 뉴스"""
        try:
            if not settings.news_api_key:
                return NewsService._get_dummy_stock_news(symbol)
            
            # 회사명이나 심볼로 검색
            company_queries = {
                "AAPL": "Apple",
                "GOOGL": "Google Alphabet",
                "MSFT": "Microsoft",
                "TSLA": "Tesla",
                "005930.KS": "삼성전자",
                "000660.KS": "SK하이닉스"
            }
            
            query = company_queries.get(symbol, symbol)
            
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": query,
                "apiKey": settings.news_api_key,
                "language": "en" if not symbol.endswith(('.KS', '.KQ')) else "ko",
                "sortBy": "publishedAt",
                "pageSize": limit,
                "from": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            articles = []
            
            for article in data.get("articles", []):
                articles.append({
                    "title": article.get("title", ""),
                    "description": article.get("description", ""),
                    "url": article.get("url", ""),
                    "source": article.get("source", {}).get("name", ""),
                    "published_at": article.get("publishedAt", ""),
                    "image_url": article.get("urlToImage", "")
                })
            
            return articles
            
        except Exception as e:
            print(f"주식 뉴스 API 오류: {str(e)}")
            return NewsService._get_dummy_stock_news(symbol)
    
    @staticmethod
    def _get_dummy_news() -> List[Dict]:
        """더미 금융 뉴스 데이터"""
        return [
            {
                "title": "Stock Market Reaches New Heights Amid Economic Optimism",
                "description": "Major stock indices continue to climb as investors remain optimistic about economic recovery and corporate earnings.",
                "url": "https://example.com/news1",
                "source": "Financial Times",
                "published_at": "2024-01-01T10:00:00Z",
                "image_url": "https://example.com/image1.jpg"
            },
            {
                "title": "Federal Reserve Maintains Interest Rate Stance",
                "description": "The Federal Reserve announced it will maintain current interest rates while monitoring inflation trends.",
                "url": "https://example.com/news2",
                "source": "Reuters",
                "published_at": "2024-01-01T09:30:00Z",
                "image_url": "https://example.com/image2.jpg"
            },
            {
                "title": "Technology Stocks Lead Market Rally",
                "description": "Tech giants continue to drive market growth with strong quarterly performances and future guidance.",
                "url": "https://example.com/news3",
                "source": "Bloomberg",
                "published_at": "2024-01-01T09:00:00Z",
                "image_url": "https://example.com/image3.jpg"
            }
        ]
    
    @staticmethod
    def _get_dummy_korean_news() -> List[Dict]:
        """더미 한국 금융 뉴스 데이터"""
        return [
            {
                "title": "코스피, 연초 강세 지속...2,600선 회복",
                "description": "국내 증시가 외국인 순매수와 기관 매수세에 힘입어 상승세를 이어가고 있습니다.",
                "url": "https://example.com/korean-news1",
                "source": "연합뉴스",
                "published_at": "2024-01-01T10:00:00Z",
                "image_url": "https://example.com/korean-image1.jpg"
            },
            {
                "title": "삼성전자, 반도체 업황 개선 기대감에 상승",
                "description": "메모리 반도체 가격 상승과 AI 수요 증가로 삼성전자 주가가 강세를 보이고 있습니다.",
                "url": "https://example.com/korean-news2",
                "source": "매일경제",
                "published_at": "2024-01-01T09:30:00Z",
                "image_url": "https://example.com/korean-image2.jpg"
            }
        ]
    
    @staticmethod
    def _get_dummy_stock_news(symbol: str) -> List[Dict]:
        """특정 주식용 더미 뉴스 데이터"""
        company_name = {
            "AAPL": "Apple",
            "GOOGL": "Google",
            "MSFT": "Microsoft",
            "TSLA": "Tesla",
            "005930.KS": "삼성전자"
        }.get(symbol, symbol)
        
        return [
            {
                "title": f"{company_name} Reports Strong Quarterly Results",
                "description": f"{company_name} exceeded analyst expectations with robust revenue growth and positive future outlook.",
                "url": f"https://example.com/{symbol}-news1",
                "source": "Financial News",
                "published_at": "2024-01-01T10:00:00Z",
                "image_url": "https://example.com/stock-image1.jpg"
            },
            {
                "title": f"Analysts Upgrade {company_name} Stock Rating",
                "description": f"Multiple analysts have upgraded their ratings on {company_name} citing strong fundamentals.",
                "url": f"https://example.com/{symbol}-news2",
                "source": "Market Watch",
                "published_at": "2024-01-01T09:00:00Z",
                "image_url": "https://example.com/stock-image2.jpg"
            }
        ]