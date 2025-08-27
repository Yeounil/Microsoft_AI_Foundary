import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import json
from datetime import datetime, timedelta
import logging
from app.core.config import settings
from app.services.sqlite_news_service import SQLiteNewsService

logger = logging.getLogger(__name__)

class NewsService:
    
    @staticmethod
    async def crawl_and_save_stock_news(symbol: str, limit: int = 10) -> List[Dict]:
        """특정 종목의 뉴스를 크롤링하고 데이터베이스에 저장"""
        try:
            # 각 소스당 최대 개수 계산
            per_source_limit = max(3, limit // 3)
            
            # News API에서 뉴스 가져오기
            news_api_articles = await NewsService.get_stock_news_from_api(symbol, per_source_limit)
            
            # Yahoo Finance에서 뉴스 가져오기
            yahoo_articles = await NewsService.get_yahoo_finance_news(symbol, per_source_limit)
            
            # Naver에서 한국 종목 뉴스 가져오기 (한국 종목인 경우)
            naver_articles = []
            if symbol.endswith(('.KS', '.KQ')) or any(korean_char in symbol for korean_char in ['삼성', '네이버', '카카오']):
                naver_articles = await NewsService.get_naver_stock_news(symbol, per_source_limit)
            
            # 모든 기사 통합
            all_articles = news_api_articles + yahoo_articles + naver_articles
            print(f"[DEBUG] 뉴스 소스별 수집: News API({len(news_api_articles)}), Yahoo({len(yahoo_articles)}), Naver({len(naver_articles)})")
            
            # 중복 제거 (URL 기준)
            unique_articles = []
            seen_urls = set()
            for article in all_articles:
                if article["url"] not in seen_urls:
                    unique_articles.append(article)
                    seen_urls.add(article["url"])
            
            # 데이터베이스에 저장
            if unique_articles:
                saved_ids = await SQLiteNewsService.save_news_articles(unique_articles)
                logger.info(f"{symbol}: {len(saved_ids)}개 새 뉴스 저장")
            
            return unique_articles[:limit]
            
        except Exception as e:
            logger.error(f"뉴스 크롤링 중 오류 ({symbol}): {str(e)}")
            return []
    
    @staticmethod
    async def get_yahoo_finance_news(symbol: str, limit: int = 5) -> List[Dict]:
        """Yahoo Finance에서 특정 종목 뉴스 가져오기"""
        try:
            import asyncio
            import aiohttp
            
            # Yahoo Finance 뉴스 URL
            base_symbol = symbol.replace('.KS', '').replace('.KQ', '')
            yahoo_url = f"https://finance.yahoo.com/quote/{base_symbol}/news"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(yahoo_url, headers=headers, timeout=10) as response:
                        if response.status == 200:
                            html = await response.text()
                            soup = BeautifulSoup(html, 'html.parser')
                            
                            articles = []
                            # Yahoo Finance 뉴스 아티클 선택자
                            news_items = soup.find_all(['h3', 'h2'], limit=limit*2)
                            
                            for item in news_items[:limit]:
                                try:
                                    # 제목과 링크 추출
                                    link_elem = item.find('a')
                                    if link_elem and link_elem.get('href'):
                                        title = link_elem.get_text(strip=True)
                                        href = link_elem.get('href')
                                        
                                        # 상대 URL을 절대 URL로 변환
                                        if href.startswith('/'):
                                            full_url = f"https://finance.yahoo.com{href}"
                                        else:
                                            full_url = href
                                        
                                        if title and full_url:
                                            articles.append({
                                                "title": title,
                                                "description": title[:100] + "...",
                                                "url": full_url,
                                                "source": "Yahoo Finance",
                                                "published_at": datetime.now().isoformat(),
                                                "symbol": symbol
                                            })
                                except Exception as item_error:
                                    continue
                            
                            logger.info(f"Yahoo Finance: {symbol}에 대한 {len(articles)}개 뉴스 수집")
                            return articles[:limit]
                            
                except asyncio.TimeoutError:
                    logger.warning(f"Yahoo Finance 요청 타임아웃: {symbol}")
                except Exception as req_error:
                    logger.error(f"Yahoo Finance 요청 오류: {req_error}")
                    
        except Exception as e:
            logger.error(f"Yahoo Finance 뉴스 수집 오류 ({symbol}): {str(e)}")
        
        return []
    
    @staticmethod
    async def get_stock_news_from_api(symbol: str, limit: int = 10) -> List[Dict]:
        """News API에서 특정 종목 뉴스 가져오기"""
        try:
            if not settings.news_api_key:
                return []
            
            # 회사명 매핑
            company_queries = {
                "AAPL": "Apple Inc",
                "GOOGL": "Google Alphabet",
                "MSFT": "Microsoft Corporation",
                "TSLA": "Tesla Inc",
                "NVDA": "NVIDIA Corporation",
                "AMZN": "Amazon.com Inc",
                "META": "Meta Platforms",
                "005930.KS": "Samsung Electronics",
                "000660.KS": "SK Hynix",
                "035420.KS": "NAVER Corporation",
                "035720.KS": "Kakao Corp"
            }
            
            query = company_queries.get(symbol, symbol)
            
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": query,
                "apiKey": settings.news_api_key,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": limit,
                "from": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
                "domains": "bloomberg.com,reuters.com,cnbc.com,marketwatch.com,yahoo.com,investing.com"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            articles = []
            
            for article in data.get("articles", []):
                articles.append({
                    "symbol": symbol,
                    "title": article.get("title", ""),
                    "description": article.get("description", ""),
                    "url": article.get("url", ""),
                    "source": article.get("source", {}).get("name", ""),
                    "author": article.get("author", ""),
                    "published_at": article.get("publishedAt", ""),
                    "image_url": article.get("urlToImage", ""),
                    "language": "en",
                    "category": "stock",
                    "api_source": "newsapi"
                })
            
            return articles
            
        except Exception as e:
            logger.error(f"News API 오류 ({symbol}): {str(e)}")
            return []
    
    @staticmethod
    async def get_naver_stock_news(symbol: str, limit: int = 10) -> List[Dict]:
        """Naver API에서 한국 종목 뉴스 가져오기"""
        try:
            if not settings.naver_client_id or not settings.naver_client_secret:
                return []
            
            # 종목 코드에서 회사명 추출
            company_names = {
                "005930.KS": "삼성전자",
                "000660.KS": "SK하이닉스",
                "035420.KS": "네이버",
                "035720.KS": "카카오",
                "207940.KS": "삼성바이오로직스",
                "006400.KS": "삼성SDI",
                "051910.KS": "LG화학",
                "068270.KS": "셀트리온",
                "028260.KS": "삼성물산"
            }
            
            query = company_names.get(symbol, symbol.split('.')[0])
            
            url = "https://openapi.naver.com/v1/search/news.json"
            headers = {
                "X-Naver-Client-Id": settings.naver_client_id,
                "X-Naver-Client-Secret": settings.naver_client_secret,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            params = {
                "query": query,
                "display": limit,
                "start": 1,
                "sort": "date"
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            articles = []
            
            for item in data.get("items", []):
                # HTML 태그 제거
                title = BeautifulSoup(item.get("title", ""), "html.parser").get_text()
                description = BeautifulSoup(item.get("description", ""), "html.parser").get_text()
                
                articles.append({
                    "symbol": symbol,
                    "title": title,
                    "description": description,
                    "url": item.get("link", ""),
                    "source": "네이버뉴스",
                    "author": "",
                    "published_at": item.get("pubDate", ""),
                    "image_url": "",
                    "language": "ko",
                    "category": "stock",
                    "api_source": "naver"
                })
            
            return articles
            
        except Exception as e:
            logger.error(f"Naver API 오류 ({symbol}): {str(e)}")
            return []
    
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