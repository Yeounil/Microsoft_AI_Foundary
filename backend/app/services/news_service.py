import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import json
from datetime import datetime, timedelta
import logging
from app.core.config import settings
from app.services.news_db_service import NewsDBService

logger = logging.getLogger(__name__)

class NewsService:
    
    @staticmethod
    async def crawl_and_save_stock_news(symbol: str, limit: int = 200) -> List[Dict]:
        """특정 종목의 뉴스를 Reuters API에서만 크롤링하고 데이터베이스에 저장

        마지막 크롤링 시점 이후의 뉴스만 가져옵니다.
        """
        try:
            # 마지막 크롤링 시점 조회
            last_crawl_date = await NewsDBService.get_last_crawl_date_for_symbol(symbol)

            if last_crawl_date:
                logger.info(f"[CRAWL] Starting incremental crawl for {symbol} from {last_crawl_date}")
            else:
                logger.info(f"[CRAWL] Starting full crawl for {symbol} (first time, limit: {limit})")

            # Reuters API에서 뉴스 가져오기 (마지막 크롤링 시점 이후)
            reuters_articles = await NewsService.get_reuters_news(symbol, limit, date_start=last_crawl_date)

            if not reuters_articles:
                logger.warning(f"[CRAWL] No articles found for {symbol} from Reuters API")
                return []

            logger.info(f"[CRAWL] Collected {len(reuters_articles)} articles from Reuters API for {symbol}")

            # 중복 제거 (URL 기준)
            unique_articles = []
            seen_urls = set()
            for article in reuters_articles:
                if article.get("url") and article["url"] not in seen_urls:
                    unique_articles.append(article)
                    seen_urls.add(article["url"])

            # 데이터베이스에 저장
            if unique_articles:
                saved_ids = await NewsDBService.save_news_articles(unique_articles)
                logger.info(f"[CRAWL] Saved {len(saved_ids)} new articles for {symbol} to database")

            return unique_articles[:limit]

        except Exception as e:
            logger.error(f"[ERROR] Error during news crawling for {symbol}: {str(e)}")
            return []
    
    @staticmethod
    async def get_stock_news_from_api(symbol: str, limit: int = 100, date_start: str = None) -> List[Dict]:
        """Reuters API에서 특정 종목 뉴스 가져오기 (유일한 소스)

        Args:
            symbol: 종목 심볼
            limit: 가져올 뉴스 개수
            date_start: 시작 날짜 (선택)
        """
        try:
            # Reuters API 사용 (유일한 뉴스 소스)
            reuters_articles = await NewsService.get_reuters_news(symbol, limit, date_start=date_start)
            if reuters_articles:
                return reuters_articles

            # Reuters API 실패 시 경고 후 빈 배열 반환
            logger.warning(f"[API] Reuters API returned no articles for {symbol}")
            return []

        except Exception as e:
            logger.error(f"[ERROR] Error fetching stock news for {symbol}: {str(e)}")
            return []

    @staticmethod
    async def get_reuters_news(symbol: str, limit: int = 100, date_start: str = None) -> List[Dict]:
        """newsapi.ai (Event Registry)를 통해 금융 뉴스 가져오기

        Args:
            symbol: 종목 심볼
            limit: 가져올 뉴스 개수
            date_start: 시작 날짜 (YYYY-MM-DD 형식 또는 ISO 8601). None이면 최근 150일

        공식 쿼리 형식을 사용:
        - Source: Reuters, Bloomberg, WSJ, CNBC, MarketWatch, Benzinga (고신뢰도 금융 뉴스)
        - Category: Business/Investing/Stocks_and_Bonds
        - Language: English
        - 전체 기사 본문(body) 포함
        - Time window: date_start 이후 또는 150일 (5개월)
        """
        try:
            if not settings.news_api_key:
                logger.warning("[NEWSAPI.AI] API 키가 설정되지 않았습니다")
                return []

            # Wikipedia 개념 URI 매핑 (회사명 -> Wikipedia URI)
            concept_uri_mapping = {
                "AAPL": "http://en.wikipedia.org/wiki/Apple_Inc.",
                "GOOGL": "http://en.wikipedia.org/wiki/Alphabet_Inc.",
                "GOOG": "http://en.wikipedia.org/wiki/Alphabet_Inc.",
                "MSFT": "http://en.wikipedia.org/wiki/Microsoft",
                "TSLA": "http://en.wikipedia.org/wiki/Tesla,_Inc.",
                "NVDA": "http://en.wikipedia.org/wiki/Nvidia",
                "AMZN": "http://en.wikipedia.org/wiki/Amazon_(company)",
                "META": "http://en.wikipedia.org/wiki/Meta_Platforms",
                "NFLX": "http://en.wikipedia.org/wiki/Netflix",
                "JPM": "http://en.wikipedia.org/wiki/JPMorgan_Chase",
                "JNJ": "http://en.wikipedia.org/wiki/Johnson_%26_Johnson",
                "WMT": "http://en.wikipedia.org/wiki/Walmart",
                "XOM": "http://en.wikipedia.org/wiki/ExxonMobil",
                "VZ": "http://en.wikipedia.org/wiki/Verizon_Communications",
                "PFE": "http://en.wikipedia.org/wiki/Pfizer",
                "005930.KS": "http://en.wikipedia.org/wiki/Samsung_Electronics",
                "000660.KS": "http://en.wikipedia.org/wiki/SK_Hynix",
                "035420.KS": "http://en.wikipedia.org/wiki/Naver_Corporation",
                "035720.KS": "http://en.wikipedia.org/wiki/Kakao_Corporation"
            }

            concept_uri = concept_uri_mapping.get(symbol, f"http://en.wikipedia.org/wiki/{symbol}")

            # 날짜 처리: ISO 8601 형식을 YYYY-MM-DD로 변환
            formatted_date_start = None
            if date_start:
                try:
                    # ISO 8601 형식 (2025-11-14T21:29:00+00:00) -> YYYY-MM-DD
                    from datetime import datetime
                    if 'T' in date_start:
                        dt = datetime.fromisoformat(date_start.replace('Z', '+00:00'))
                        formatted_date_start = dt.strftime('%Y-%m-%d')
                    else:
                        formatted_date_start = date_start  # 이미 YYYY-MM-DD 형식
                    logger.info(f"[NEWSAPI.AI] Using dateStart: {formatted_date_start}")
                except Exception as e:
                    logger.warning(f"[NEWSAPI.AI] Failed to parse date_start: {str(e)}")
                    formatted_date_start = None

            # Event Registry API 엔드포인트
            eventregistry_url = "http://eventregistry.org/api/v1/article/getArticles"

            # 공식 쿼리 형식 (Query DSL)
            query_dsl = {
                "$query": {
                    "$and": [
                        {
                            "conceptUri": concept_uri  # ✅ 회사 개념 URI
                        },
                        {
                            "categoryUri": "dmoz/Business/Investing/Stocks_and_Bonds"  # ✅ 카테고리
                        },
                        {
                            "$or": [
                                {
                                    "sourceUri": "reuters.com"  # ✅ Reuters
                                },
                                {
                                    "sourceUri": "bloomberg.com"  # ✅ Bloomberg
                                },
                                {
                                    "sourceUri": "wsj.com"  # ✅ Wall Street Journal
                                },
                                {
                                    "sourceUri": "cnbc.com"  # ✅ CNBC
                                },
                                {
                                    "sourceUri": "marketwatch.com"  # ✅ MarketWatch
                                },
                                {
                                    "sourceUri": "benzinga.com"  # ✅ Benzinga
                                }
                            ]
                        }
                    ]
                },
                "$filter": {
                    "forceMaxDataTimeWindow": "150"  # ✅ 최근 150일 (5개월)
                }
            }

            # 날짜 필터 추가 (date_start가 있으면)
            if formatted_date_start:
                query_dsl["$filter"]["dateStart"] = formatted_date_start

            # POST 요청을 위한 파라미터
            params = {
                "query": json.dumps(query_dsl),  # ✅ JSON 쿼리
                "resultType": "articles",
                "articlesSortBy": "date",
                "articlesSortByAsc": False,  # 최신순
                "articlesPage": 1,
                "articlesCount": limit,
                "includeArticleTitle": True,
                "includeArticleBasicInfo": True,
                "includeArticleBody": True,  # ✅ 기사 본문 포함
                "apiKey": settings.news_api_key
            }

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Content-Type": "application/json"
            }

            date_info = f" from {formatted_date_start}" if formatted_date_start else " (last 150 days)"
            logger.info(f"[NEWSAPI.AI] Requesting articles for {symbol}{date_info} (Reuters/Bloomberg, Stocks & Bonds)")

            # POST 요청으로 데이터 전송
            response = requests.post(eventregistry_url, json=params, headers=headers, timeout=15)
            response.raise_for_status()

            data = response.json()

            # 에러 확인
            if "error" in data:
                logger.warning(f"[NEWSAPI.AI] API error for {symbol}: {data.get('error', 'Unknown error')}")
                return []

            # 기사 개수 로깅
            articles_data = data.get("articles", {})
            total_articles = articles_data.get("totalHits", 0)
            result_articles = articles_data.get("results", [])

            logger.info(f"[NEWSAPI.AI] Found {total_articles} articles for {symbol}{date_info} (returning {len(result_articles)})")

            articles = []
            for item in result_articles[:limit]:
                try:
                    # 발행 날짜 파싱 (ISO format)
                    published_at = item.get("dateTime", "") or item.get("date", "")

                    articles.append({
                        "symbol": symbol,
                        "title": item.get("title", ""),
                        "description": item.get("summary", "") or item.get("title", ""),
                        "body": item.get("body", ""),  # ✅ 전체 기사 본문 저장
                        "url": item.get("url", ""),
                        "source": item.get("source", {}).get("title", "News Source") if isinstance(item.get("source"), dict) else str(item.get("source", "News Source")),
                        "author": item.get("author", ""),
                        "published_at": published_at,
                        "image_url": item.get("image", "") or item.get("image_url", ""),
                        "language": "en",  # English only
                        "category": "stock",
                        "api_source": "newsapi.ai"
                    })
                except Exception as article_error:
                    logger.warning(f"[NEWSAPI.AI] Error parsing article: {str(article_error)}")
                    continue

            logger.info(f"[NEWSAPI.AI] Collected {len(articles)} articles for {symbol}")
            return articles

        except Exception as e:
            logger.error(f"[NEWSAPI.AI] Error retrieving news for {symbol}: {str(e)}")
            return []
    
    @staticmethod
    def get_financial_news(query: str = "finance", limit: int = 10) -> List[Dict]:
        """금융 뉴스 가져오기 (Apify Reuters API 사용, 동기 버전)"""
        try:
            if not settings.apify_api_token:
                # Apify API 토큰이 없는 경우 더미 데이터 반환
                logger.warning("Apify API 토큰이 설정되지 않았습니다")
                return NewsService._get_dummy_news()

            import time

            # Apify Reuters API 엔드포인트 (토큰을 URL 파라미터로 전달)
            apify_url = f"https://api.apify.com/v2/acts/making-data-meaningful~reuters-api/runs?token={settings.apify_api_token}"
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0"
            }

            # Apify 액터 실행 요청
            body = {
                "searchQuery": query,
                "maxItems": limit
            }

            response = requests.post(apify_url, json=body, headers=headers, timeout=60)
            response.raise_for_status()

            data = response.json()
            run_id = data.get("data", {}).get("id")

            if not run_id:
                logger.warning(f"Reuters API: 실행 ID를 얻지 못했습니다 (financial news)")
                return NewsService._get_dummy_news()

            # 결과 폴링 (최대 30초 대기)
            for attempt in range(15):
                time.sleep(2)

                status_url = f"https://api.apify.com/v2/acts/making-data-meaningful~reuters-api/runs/{run_id}?token={settings.apify_api_token}"
                status_response = requests.get(status_url, headers=headers, timeout=10)

                if status_response.status_code == 200:
                    status_data = status_response.json()
                    status = status_data.get("data", {}).get("status")

                    if status == "SUCCEEDED":
                        # Dataset에서 뉴스 항목 가져오기
                        dataset_id = status_data.get("data", {}).get("defaultDatasetId")

                        if dataset_id:
                            dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={settings.apify_api_token}"
                            dataset_response = requests.get(dataset_url, headers=headers, timeout=10)

                            if dataset_response.status_code == 200:
                                items = dataset_response.json()

                                articles = []
                                for item in items[:limit]:
                                    articles.append({
                                        "title": item.get("title", "") or item.get("heading", ""),
                                        "description": item.get("description", "") or item.get("summary", "") or item.get("text", ""),
                                        "url": item.get("url", "") or item.get("link", "") or item.get("href", ""),
                                        "source": item.get("source", "Reuters") or item.get("sourceName", "Reuters"),
                                        "published_at": item.get("publishedDate", "") or item.get("date", "") or item.get("publicationDate", ""),
                                        "image_url": item.get("image", "") or item.get("thumbnail", "") or item.get("imageUrl", ""),
                                        "api_source": "reuters"
                                    })

                                return articles

                        break
                    elif status in ["FAILED", "ABORTED"]:
                        logger.error(f"Reuters API: 실행 실패: {status}")
                        break

            logger.warning(f"Reuters API: 실행 시간 초과 (financial news)")
            return NewsService._get_dummy_news()

        except Exception as e:
            logger.error(f"Apify Reuters API 오류: {str(e)}")
            return NewsService._get_dummy_news()
    
    @staticmethod
    def get_stock_related_news(symbol: str, limit: int = 5) -> List[Dict]:
        """특정 주식 관련 뉴스 (Apify Reuters API 사용, 동기 버전)"""
        try:
            if not settings.apify_api_token:
                logger.warning("Apify API 토큰이 설정되지 않았습니다")
                return NewsService._get_dummy_stock_news(symbol)

            import time

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

            # Apify Reuters API 엔드포인트 (토큰을 URL 파라미터로 전달)
            apify_url = f"https://api.apify.com/v2/acts/making-data-meaningful~reuters-api/runs?token={settings.apify_api_token}"
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0"
            }

            # Apify 액터 실행 요청
            body = {
                "searchQuery": query,
                "maxItems": limit
            }

            response = requests.post(apify_url, json=body, headers=headers, timeout=60)
            response.raise_for_status()

            data = response.json()
            run_id = data.get("data", {}).get("id")

            if not run_id:
                logger.warning(f"Reuters API: 실행 ID를 얻지 못했습니다 ({symbol})")
                return NewsService._get_dummy_stock_news(symbol)

            # 결과 폴링 (최대 30초 대기)
            for attempt in range(15):
                time.sleep(2)

                status_url = f"https://api.apify.com/v2/acts/making-data-meaningful~reuters-api/runs/{run_id}?token={settings.apify_api_token}"
                status_response = requests.get(status_url, headers=headers, timeout=10)

                if status_response.status_code == 200:
                    status_data = status_response.json()
                    status = status_data.get("data", {}).get("status")

                    if status == "SUCCEEDED":
                        # Dataset에서 뉴스 항목 가져오기
                        dataset_id = status_data.get("data", {}).get("defaultDatasetId")

                        if dataset_id:
                            dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={settings.apify_api_token}"
                            dataset_response = requests.get(dataset_url, headers=headers, timeout=10)

                            if dataset_response.status_code == 200:
                                items = dataset_response.json()

                                articles = []
                                for item in items[:limit]:
                                    articles.append({
                                        "title": item.get("title", "") or item.get("heading", ""),
                                        "description": item.get("description", "") or item.get("summary", "") or item.get("text", ""),
                                        "url": item.get("url", "") or item.get("link", "") or item.get("href", ""),
                                        "source": item.get("source", "Reuters") or item.get("sourceName", "Reuters"),
                                        "published_at": item.get("publishedDate", "") or item.get("date", "") or item.get("publicationDate", ""),
                                        "image_url": item.get("image", "") or item.get("thumbnail", "") or item.get("imageUrl", ""),
                                        "api_source": "reuters"
                                    })

                                return articles

                        break
                    elif status in ["FAILED", "ABORTED"]:
                        logger.error(f"Reuters API: 실행 실패 ({symbol}): {status}")
                        break

            logger.warning(f"Reuters API: 실행 시간 초과 ({symbol})")
            return NewsService._get_dummy_stock_news(symbol)

        except Exception as e:
            logger.error(f"주식 뉴스 API 오류: {str(e)}")
            return NewsService._get_dummy_stock_news(symbol)
    
    @staticmethod
    def _get_dummy_news() -> List[Dict]:
        """더미 금융 뉴스 데이터 (실제 같은 형태)"""
        from datetime import datetime, timedelta
        import random
        
        # 최근 날짜들 생성
        base_date = datetime.now()
        dates = [(base_date - timedelta(hours=i)).isoformat() + "Z" for i in range(0, 48, 2)]
        
        news_items = [
            {
                "title": "Global Stock Markets Show Strong Recovery Signals",
                "description": "International markets are displaying positive momentum as investors gain confidence in economic recovery prospects and corporate earnings outlook.",
                "url": "https://finance.yahoo.com/news/global-stock-markets-recovery-123456",
                "source": "Financial Times",
                "published_at": random.choice(dates),
                "image_url": "https://s.yimg.com/ny/api/res/1.2/finance1.jpg"
            },
            {
                "title": "Federal Reserve Policy Update: Interest Rate Decisions",
                "description": "The Federal Reserve maintains its current monetary policy stance while closely monitoring inflation indicators and employment data.",
                "url": "https://reuters.com/business/finance/fed-policy-update-789012",
                "source": "Reuters",
                "published_at": random.choice(dates),
                "image_url": "https://cloudfront-us-east-1.images.reuters.com/fed-building.jpg"
            },
            {
                "title": "Technology Sector Drives Market Growth",
                "description": "Leading technology companies report strong quarterly results, boosting investor confidence and driving market gains across multiple indices.",
                "url": "https://bloomberg.com/news/articles/tech-sector-growth-345678",
                "source": "Bloomberg",
                "published_at": random.choice(dates),
                "image_url": "https://assets.bwbx.io/images/tech-stocks.jpg"
            },
            {
                "title": "Emerging Markets Show Resilience Despite Challenges",
                "description": "Developing economies demonstrate surprising resilience in the face of global economic uncertainties and supply chain disruptions.",
                "url": "https://wsj.com/articles/emerging-markets-resilience-901234",
                "source": "Wall Street Journal",
                "published_at": random.choice(dates),
                "image_url": "https://images.wsj.net/im-emerging-markets.jpg"
            },
            {
                "title": "Cryptocurrency Market Stabilizes After Volatility",
                "description": "Digital asset markets show signs of stabilization following recent volatility, with institutional investors showing renewed interest.",
                "url": "https://cnbc.com/2024/crypto-market-stability-567890",
                "source": "CNBC",
                "published_at": random.choice(dates),
                "image_url": "https://image.cnbcfm.com/api/v1/image/crypto-stability.jpg"
            },
            {
                "title": "Energy Sector Outlook: Renewable Investment Surge",
                "description": "Renewable energy investments reach record levels as companies and governments accelerate transition to sustainable energy sources.",
                "url": "https://marketwatch.com/story/renewable-energy-investment-112233",
                "source": "MarketWatch",
                "published_at": random.choice(dates),
                "image_url": "https://mw3.wsj.net/mw5/content/renewable-energy.jpg"
            },
            {
                "title": "Banking Sector Reports Strong Quarterly Performance",
                "description": "Major financial institutions exceed analyst expectations with robust quarterly earnings driven by increased lending and improved credit conditions.",
                "url": "https://financial-news.com/banking-quarterly-results-445566",
                "source": "Financial News",
                "published_at": random.choice(dates),
                "image_url": "https://cdn.financial-news.com/banking-performance.jpg"
            },
            {
                "title": "Global Supply Chain Improvements Show Progress",
                "description": "International supply chains demonstrate significant improvements, reducing bottlenecks and supporting global trade recovery.",
                "url": "https://trade-journal.com/supply-chain-improvements-778899",
                "source": "Global Trade Journal",
                "published_at": random.choice(dates),
                "image_url": "https://assets.trade-journal.com/supply-chain.jpg"
            }
        ]
        
        return news_items[:8]  # 8개 뉴스 반환
    
    @staticmethod
    def _get_dummy_stock_news(symbol: str) -> List[Dict]:
        """특정 주식용 더미 뉴스 데이터"""
        from datetime import datetime, timedelta
        import random
        
        # 회사명 매핑
        company_names = {
            "AAPL": "Apple Inc.",
            "GOOGL": "Alphabet Inc.",
            "MSFT": "Microsoft Corporation",
            "TSLA": "Tesla Inc.",
            "AMZN": "Amazon.com Inc.",
            "NVDA": "NVIDIA Corporation",
            "META": "Meta Platforms Inc.",
            "NFLX": "Netflix Inc.",
            "005930.KS": "삼성전자",
            "000660.KS": "SK하이닉스",
            "035420.KS": "NAVER",
            "035720.KS": "카카오"
        }
        
        company_name = company_names.get(symbol, symbol.replace('.KS', ''))
        
        # 최근 날짜들 생성
        base_date = datetime.now()
        dates = [(base_date - timedelta(hours=i)).isoformat() + "Z" for i in range(0, 72, 3)]
        
        # 주식별 뉴스 템플릿
        news_templates = [
            {
                "title": f"{company_name} Reports Strong Quarterly Earnings",
                "description": f"{company_name} exceeded analyst expectations with robust revenue growth and positive future guidance, driving investor confidence.",
                "url": f"https://finance.yahoo.com/news/{symbol.lower()}-earnings-report",
                "source": "Yahoo Finance",
                "published_at": random.choice(dates),
                "image_url": f"https://s.yimg.com/ny/api/res/1.2/{symbol.lower()}-earnings.jpg"
            },
            {
                "title": f"Analysts Upgrade {company_name} Price Target",
                "description": f"Multiple Wall Street analysts have raised their price targets for {company_name} stock, citing strong market position and growth prospects.",
                "url": f"https://marketwatch.com/story/{symbol.lower()}-analyst-upgrade",
                "source": "MarketWatch",
                "published_at": random.choice(dates),
                "image_url": f"https://mw3.wsj.net/mw5/content/{symbol.lower()}-upgrade.jpg"
            },
            {
                "title": f"{company_name} Announces Strategic Partnership",
                "description": f"{company_name} unveils new strategic partnership aimed at expanding market reach and enhancing technological capabilities.",
                "url": f"https://reuters.com/business/{symbol.lower()}-partnership",
                "source": "Reuters",
                "published_at": random.choice(dates),
                "image_url": f"https://cloudfront-us-east-1.images.reuters.com/{symbol.lower()}-partnership.jpg"
            },
            {
                "title": f"{company_name} Stock Hits New 52-Week High",
                "description": f"{company_name} shares reach new 52-week high as investors respond positively to recent developments and market outlook.",
                "url": f"https://cnbc.com/{symbol.lower()}-52-week-high",
                "source": "CNBC",
                "published_at": random.choice(dates),
                "image_url": f"https://image.cnbcfm.com/api/v1/image/{symbol.lower()}-high.jpg"
            },
            {
                "title": f"Institutional Investors Increase {company_name} Holdings",
                "description": f"Major institutional investors have increased their positions in {company_name}, signaling continued confidence in the company's prospects.",
                "url": f"https://bloomberg.com/news/{symbol.lower()}-institutional-buying",
                "source": "Bloomberg",
                "published_at": random.choice(dates),
                "image_url": f"https://assets.bwbx.io/images/{symbol.lower()}-institutional.jpg"
            }
        ]
        
        return news_templates[:5]  # 5개 뉴스 반환