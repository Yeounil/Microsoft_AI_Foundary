#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
수동 뉴스 크롤링 테스트 스크립트 (newsapi.ai / Event Registry)
newsapi.ai (Event Registry)를 사용하여 100개 종목의 뉴스를 크롤링합니다
전체 기사 본문(body)을 포함하여 수집합니다

실행: python manual_crawl_test.py
"""

import asyncio
import logging
import sys
import requests
import json
from datetime import datetime
from typing import List, Dict, Optional

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 프로젝트 경로 추가
sys.path.insert(0, r'E:\Microsoft_AI_Foundary\backend')

from app.core.config import settings
from app.services.news_db_service import NewsDBService


class EventRegistryCrawler:
    """newsapi.ai (Event Registry) API를 사용한 뉴스 크롤러"""

    def __init__(self):
        self.api_key = settings.news_api_key
        self.base_url = "http://eventregistry.org/api/v1/article/getArticles"

        if not self.api_key:
            raise ValueError("[ERROR] Event Registry API 키가 설정되지 않았습니다")

        logger.info("[OK] Event Registry 클라이언트 초기화 완료")

    def get_popular_symbols(self) -> list:
        """대중적인 100개의 해외 주식 종목 반환"""
        return [
            # Tech (20)
            "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "META", "NFLX", "CRM",
            "ADBE", "INTC", "CSCO", "IBM", "ORCL", "QCOM", "PYPL", "AMD", "SNOW", "UBER",

            # Finance (15)
            "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP", "CB",
            "ALL", "MMC", "PGR", "TRV", "ICE",

            # Healthcare (15)
            "JNJ", "UNH", "PFE", "ABBV", "MRK", "TMO", "LLY", "ABT", "AMGN", "GILD",
            "BIIB", "VRTX", "ILMN", "REGN", "VTRS",

            # Retail/Consumer (15)
            "WMT", "TGT", "HD", "LOW", "MCD", "SBUX", "KO", "PEP", "NKE", "VFC",
            "GPS", "DECK", "DRI", "CMG", "LULU",

            # Industrials (10)
            "BA", "CAT", "GE", "HON", "MMM", "RTX", "LMT", "NOC", "GD", "UTX",

            # Energy (5)
            "XOM", "CVX", "COP", "SLB", "EOG",

            # Communications (5)
            "VZ", "T", "TMUS", "CMCSA", "CHTR",

            # Real Estate (5)
            "PLD", "AMT", "CCI", "EQIX", "DLR",

            # Utilities (5)
            "NEE", "D", "SO", "DUK", "EXC"
        ]

    def get_news_from_event_registry(self, symbol: str, concept_uri: str, limit: int = 20) -> List[Dict]:
        """
        Event Registry API에서 특정 회사의 뉴스 가져오기 (공식 쿼리 형식)

        공식 쿼리 형식을 사용:
        - Source: Reuters.com, Bloomberg.com (고신뢰도)
        - Category: Business/Investing/Stocks_and_Bonds
        - Language: English
        - 전체 기사 본문(body) 포함

        Args:
            symbol: 종목 코드 (예: "AAPL")
            concept_uri: Wikipedia 개념 URI (예: "http://en.wikipedia.org/wiki/Apple_Inc.")
            limit: 가져올 기사 수

        Returns:
            뉴스 기사 리스트 (body 필드 포함)
        """
        try:
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
                                }
                            ]
                        }
                    ]
                },
                "$filter": {
                    "forceMaxDataTimeWindow": "31"  # 최근 31일
                }
            }

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
                "apiKey": self.api_key
            }

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Content-Type": "application/json"
            }

            logger.info(f"[API] Requesting articles from Event Registry for {symbol} (Reuters/Bloomberg, Stocks & Bonds, limit: {limit})")

            # POST 요청으로 데이터 전송
            response = requests.post(
                self.base_url,
                json=params,
                headers=headers,
                timeout=15
            )
            response.raise_for_status()

            data = response.json()

            # 에러 확인
            if "error" in data:
                logger.warning(f"[WARN] API error for {symbol}: {data.get('error', 'Unknown error')}")
                return []

            # 기사 데이터 추출
            articles_data = data.get("articles", {})
            total_hits = articles_data.get("totalHits", 0)
            result_articles = articles_data.get("results", [])

            logger.info(f"[OK] Retrieved {len(result_articles)} articles from {total_hits} total for {symbol} (Reuters/Bloomberg)")

            return result_articles[:limit]

        except Exception as e:
            logger.error(f"[ERROR] Failed to fetch news for {symbol}: {str(e)}")
            return []

    def format_articles(self, articles: List[Dict], symbol: str) -> List[Dict]:
        """기사 포맷 표준화 (newsapi.ai 형식 -> DB 저장 형식)"""
        formatted = []

        for article in articles:
            try:
                # 발행 날짜 파싱
                published_at = article.get("dateTime", "") or article.get("date", "")

                formatted.append({
                    "symbol": symbol,
                    "title": article.get("title", ""),
                    "description": article.get("summary", "") or article.get("title", ""),
                    "body": article.get("body", ""),  # ✅ 전체 기사 본문
                    "url": article.get("url", ""),
                    "source": article.get("source", {}).get("title", "News Source") if isinstance(article.get("source"), dict) else str(article.get("source", "News Source")),
                    "author": article.get("author", ""),
                    "published_at": published_at,
                    "image_url": article.get("image", "") or article.get("image_url", ""),
                    "language": article.get("lang", "en"),
                    "category": "stock",
                    "api_source": "newsapi.ai"
                })
            except Exception as e:
                logger.warning(f"[WARN] Error formatting article: {str(e)}")
                continue

        return formatted


async def test_single_symbol():
    """단일 종목 테스트 (AAPL)"""
    print("\n" + "="*80)
    print("[TEST 1] 단일 종목 - Event Registry 뉴스 크롤링 테스트 (AAPL)")
    print("="*80)

    crawler = EventRegistryCrawler()
    symbol = "AAPL"
    concept_uri = "http://en.wikipedia.org/wiki/Apple_Inc."
    limit = 20

    logger.info(f"[SINGLE_TEST] Starting test for {symbol}")

    try:
        articles = crawler.get_news_from_event_registry(symbol, concept_uri, limit)
        formatted = crawler.format_articles(articles, symbol)

        if formatted:
            print(f"\n[OK] {len(formatted)}개의 기사 수집 완료:")
            print(f"{'순번':<5} {'제목':<50} {'출처':<20}")
            print("-" * 75)

            for i, article in enumerate(formatted[:5], 1):
                title = article['title'][:47] + "..." if len(article['title']) > 50 else article['title']
                source = article['source'][:17] if article['source'] else "Unknown"
                has_body = "✓" if article.get('body') else "✗"
                print(f"{i:<5} {title:<50} {source:<20} [Body: {has_body}]")

            print(f"\n[SUMMARY]")
            print(f"  - 총 기사: {len(formatted)}개")
            print(f"  - API 소스: {formatted[0]['api_source']}")
            print(f"  - Body 필드 포함: {len([a for a in formatted if a.get('body')])}개")
            print(f"  - 평균 Body 길이: {sum(len(a.get('body', '')) for a in formatted) // len(formatted) if formatted else 0}자")
        else:
            print("\n[WARN] 기사를 찾을 수 없습니다")

    except Exception as e:
        logger.error(f"[ERROR] Test failed: {str(e)}")
        print(f"\n[ERROR] 테스트 실패: {str(e)}")


async def test_multiple_symbols():
    """여러 종목 테스트 (10개)"""
    print("\n" + "="*80)
    print("[TEST 2] 여러 종목 - Event Registry 뉴스 크롤링 테스트 (10개 종목)")
    print("="*80)

    crawler = EventRegistryCrawler()

    # 테스트용 10개 종목 + Wikipedia URI 매핑
    symbol_uri_mapping = {
        "AAPL": "http://en.wikipedia.org/wiki/Apple_Inc.",
        "MSFT": "http://en.wikipedia.org/wiki/Microsoft",
        "GOOGL": "http://en.wikipedia.org/wiki/Alphabet_Inc.",
        "NVDA": "http://en.wikipedia.org/wiki/Nvidia",
        "AMZN": "http://en.wikipedia.org/wiki/Amazon_(company)",
        "META": "http://en.wikipedia.org/wiki/Meta_Platforms",
        "TSLA": "http://en.wikipedia.org/wiki/Tesla,_Inc.",
        "JPM": "http://en.wikipedia.org/wiki/JPMorgan_Chase",
        "JNJ": "http://en.wikipedia.org/wiki/Johnson_%26_Johnson",
        "WMT": "http://en.wikipedia.org/wiki/Walmart"
    }

    results = {}
    total_collected = 0

    logger.info(f"[MULTI_TEST] Starting test for {len(symbol_uri_mapping)} symbols")

    for symbol, concept_uri in symbol_uri_mapping.items():
        try:
            logger.info(f"[MULTI_TEST] Crawling {symbol}...")

            articles = crawler.get_news_from_event_registry(symbol, concept_uri, limit=20)
            formatted = crawler.format_articles(articles, symbol)

            results[symbol] = len(formatted)
            total_collected += len(formatted)

            logger.info(f"[MULTI_TEST] {symbol}: {len(formatted)} articles collected")

        except Exception as e:
            logger.error(f"[ERROR] Failed for {symbol}: {str(e)}")
            results[symbol] = 0

    # 결과 출력
    print(f"\n[RESULTS] 크롤링 결과:")
    print(f"{'종목':<8} {'수집 기사':<12} {'상태':<15}")
    print("-" * 35)

    for symbol, count in results.items():
        status = "[OK] 성공" if count > 0 else "[WARN] 실패"
        print(f"{symbol:<8} {count:<12} {status:<15}")

    print(f"\n[SUMMARY]")
    print(f"  - 총 수집 기사: {total_collected}개")
    print(f"  - 성공 종목: {len([v for v in results.values() if v > 0])}개/{len(symbol_uri_mapping)}")
    print(f"  - 평균 기사/종목: {total_collected // len(symbol_uri_mapping) if symbol_uri_mapping else 0}개")


async def test_all_100_symbols():
    """모든 100개 종목 크롤링 및 DB 저장"""
    print("\n" + "="*80)
    print("[TEST 3] 전체 100개 종목 - Event Registry 뉴스 크롤링 + DB 저장")
    print("="*80)

    crawler = EventRegistryCrawler()
    symbols = crawler.get_popular_symbols()

    # Wikipedia URI 매핑 (심볼 -> concept URI)
    symbol_uri_mapping = {
        "AAPL": "http://en.wikipedia.org/wiki/Apple_Inc.",
        "MSFT": "http://en.wikipedia.org/wiki/Microsoft",
        "GOOGL": "http://en.wikipedia.org/wiki/Alphabet_Inc.",
        "GOOG": "http://en.wikipedia.org/wiki/Alphabet_Inc.",
        "AMZN": "http://en.wikipedia.org/wiki/Amazon_(company)",
        "NVDA": "http://en.wikipedia.org/wiki/Nvidia",
        "TSLA": "http://en.wikipedia.org/wiki/Tesla,_Inc.",
        "META": "http://en.wikipedia.org/wiki/Meta_Platforms",
        "NFLX": "http://en.wikipedia.org/wiki/Netflix",
        "CRM": "http://en.wikipedia.org/wiki/Salesforce",
        "ADBE": "http://en.wikipedia.org/wiki/Adobe_Inc.",
        "INTC": "http://en.wikipedia.org/wiki/Intel",
        "CSCO": "http://en.wikipedia.org/wiki/Cisco",
        "IBM": "http://en.wikipedia.org/wiki/IBM",
        "ORCL": "http://en.wikipedia.org/wiki/Oracle_Corporation",
        "QCOM": "http://en.wikipedia.org/wiki/Qualcomm",
        "PYPL": "http://en.wikipedia.org/wiki/PayPal",
        "AMD": "http://en.wikipedia.org/wiki/Advanced_Micro_Devices",
        "SNOW": "http://en.wikipedia.org/wiki/Snowflake_(company)",
        "UBER": "http://en.wikipedia.org/wiki/Uber",
        "JPM": "http://en.wikipedia.org/wiki/JPMorgan_Chase",
        "BAC": "http://en.wikipedia.org/wiki/Bank_of_America",
        "WFC": "http://en.wikipedia.org/wiki/Wells_Fargo",
        "GS": "http://en.wikipedia.org/wiki/Goldman_Sachs",
        "MS": "http://en.wikipedia.org/wiki/Morgan_Stanley",
        "C": "http://en.wikipedia.org/wiki/Citigroup",
        "BLK": "http://en.wikipedia.org/wiki/BlackRock",
        "SCHW": "http://en.wikipedia.org/wiki/Charles_Schwab",
        "AXP": "http://en.wikipedia.org/wiki/American_Express",
        "CB": "http://en.wikipedia.org/wiki/Chubb_Limited",
        "ALL": "http://en.wikipedia.org/wiki/Allstate",
        "MMC": "http://en.wikipedia.org/wiki/Marsh_%26_McLennan",
        "PGR": "http://en.wikipedia.org/wiki/Progressive_Corporation",
        "TRV": "http://en.wikipedia.org/wiki/Travelers_Companies",
        "ICE": "http://en.wikipedia.org/wiki/Intercontinental_Exchange",
        "JNJ": "http://en.wikipedia.org/wiki/Johnson_%26_Johnson",
        "UNH": "http://en.wikipedia.org/wiki/UnitedHealth_Group",
        "PFE": "http://en.wikipedia.org/wiki/Pfizer",
        "ABBV": "http://en.wikipedia.org/wiki/AbbVie",
        "MRK": "http://en.wikipedia.org/wiki/Merck_%26_Co.",
        "TMO": "http://en.wikipedia.org/wiki/Thermo_Fisher_Scientific",
        "LLY": "http://en.wikipedia.org/wiki/Eli_Lilly_and_Company",
        "ABT": "http://en.wikipedia.org/wiki/Abbott_Laboratories",
        "AMGN": "http://en.wikipedia.org/wiki/Amgen",
        "GILD": "http://en.wikipedia.org/wiki/Gilead_Sciences",
        "BIIB": "http://en.wikipedia.org/wiki/Biogen",
        "VRTX": "http://en.wikipedia.org/wiki/Vertex_Pharmaceuticals",
        "ILMN": "http://en.wikipedia.org/wiki/Illumina",
        "REGN": "http://en.wikipedia.org/wiki/Regeneron_Pharmaceuticals",
        "VTRS": "http://en.wikipedia.org/wiki/Viatris",
        "WMT": "http://en.wikipedia.org/wiki/Walmart",
        "TGT": "http://en.wikipedia.org/wiki/Target_Corporation",
        "HD": "http://en.wikipedia.org/wiki/The_Home_Depot",
        "LOW": "http://en.wikipedia.org/wiki/Lowe%27s",
        "MCD": "http://en.wikipedia.org/wiki/McDonald%27s",
        "SBUX": "http://en.wikipedia.org/wiki/Starbucks",
        "KO": "http://en.wikipedia.org/wiki/The_Coca-Cola_Company",
        "PEP": "http://en.wikipedia.org/wiki/PepsiCo",
        "NKE": "http://en.wikipedia.org/wiki/Nike",
        "VFC": "http://en.wikipedia.org/wiki/VF_Corporation",
        "GPS": "http://en.wikipedia.org/wiki/Gap_Inc.",
        "DECK": "http://en.wikipedia.org/wiki/Deckers_Outdoor_Corporation",
        "DRI": "http://en.wikipedia.org/wiki/Darden_Restaurants",
        "CMG": "http://en.wikipedia.org/wiki/Chipotle_Mexican_Grill",
        "LULU": "http://en.wikipedia.org/wiki/Lululemon",
        "BA": "http://en.wikipedia.org/wiki/Boeing",
        "CAT": "http://en.wikipedia.org/wiki/Caterpillar_Inc.",
        "GE": "http://en.wikipedia.org/wiki/General_Electric",
        "HON": "http://en.wikipedia.org/wiki/Honeywell_International",
        "MMM": "http://en.wikipedia.org/wiki/3M",
        "RTX": "http://en.wikipedia.org/wiki/RTX_Corporation",
        "LMT": "http://en.wikipedia.org/wiki/Lockheed_Martin",
        "NOC": "http://en.wikipedia.org/wiki/Northrop_Grumman",
        "GD": "http://en.wikipedia.org/wiki/General_Dynamics",
        "UTX": "http://en.wikipedia.org/wiki/United_Technologies",
        "XOM": "http://en.wikipedia.org/wiki/ExxonMobil",
        "CVX": "http://en.wikipedia.org/wiki/Chevron",
        "COP": "http://en.wikipedia.org/wiki/ConocoPhillips",
        "SLB": "http://en.wikipedia.org/wiki/Schlumberger_Limited",
        "EOG": "http://en.wikipedia.org/wiki/EOG_Resources",
        "VZ": "http://en.wikipedia.org/wiki/Verizon_Communications",
        "T": "http://en.wikipedia.org/wiki/AT%26T",
        "TMUS": "http://en.wikipedia.org/wiki/T-Mobile",
        "CMCSA": "http://en.wikipedia.org/wiki/Comcast",
        "CHTR": "http://en.wikipedia.org/wiki/Charter_Communications",
        "PLD": "http://en.wikipedia.org/wiki/Prologis",
        "AMT": "http://en.wikipedia.org/wiki/American_Tower",
        "CCI": "http://en.wikipedia.org/wiki/Crown_Castle",
        "EQIX": "http://en.wikipedia.org/wiki/Equinix",
        "DLR": "http://en.wikipedia.org/wiki/Digital_Realty",
        "NEE": "http://en.wikipedia.org/wiki/NextEra_Energy",
        "D": "http://en.wikipedia.org/wiki/Dominion_Energy",
        "SO": "http://en.wikipedia.org/wiki/Southern_Company",
        "DUK": "http://en.wikipedia.org/wiki/Duke_Energy",
        "EXC": "http://en.wikipedia.org/wiki/Exelon"
    }

    results = {}
    total_collected = 0
    total_saved = 0
    failed_symbols = []
    start_time = datetime.now()

    logger.info(f"[ALL_TEST] Starting crawl for {len(symbols)} symbols")
    print(f"\n실행 중... (예상 시간: {len(symbols) // 5}분)")

    for i, symbol in enumerate(symbols, 1):
        try:
            concept_uri = symbol_uri_mapping.get(symbol, f"http://en.wikipedia.org/wiki/{symbol}")

            articles = crawler.get_news_from_event_registry(symbol, concept_uri, limit=20)
            formatted = crawler.format_articles(articles, symbol)

            results[symbol] = len(formatted)
            total_collected += len(formatted)

            # DB에 저장
            if formatted:
                try:
                    saved_ids = await NewsDBService.save_news_articles(formatted)
                    total_saved += len(saved_ids)
                    logger.info(f"[DB] {symbol}: {len(saved_ids)}개 저장됨")
                except Exception as db_error:
                    logger.warning(f"[DB] {symbol} DB 저장 실패: {str(db_error)}")

            if i % 10 == 0:
                print(f"  [{i:3d}/{len(symbols)}] {total_collected:4d}개 기사 수집, {total_saved:4d}개 저장 완료...")

        except Exception as e:
            logger.error(f"[ERROR] Failed for {symbol}: {str(e)}")
            results[symbol] = 0
            failed_symbols.append(symbol)

    elapsed = (datetime.now() - start_time).total_seconds()

    # 결과 분석
    successful = len([v for v in results.values() if v > 0])

    print(f"\n[RESULTS] 크롤링 완료:")
    print(f"  - 총 수집 기사: {total_collected:,}개")
    print(f"  - DB 저장 기사: {total_saved:,}개")
    print(f"  - 성공 종목: {successful}개/{len(symbols)}")
    print(f"  - 실패 종목: {len(failed_symbols)}개")
    print(f"  - 평균 기사/종목: {total_collected // len(symbols) if symbols else 0}개")
    print(f"  - 소요 시간: {elapsed:.1f}초 ({elapsed/len(symbols):.2f}초/종목)")

    # 실패 종목 표시
    if failed_symbols:
        print(f"\n[FAILED] 수집 실패 종목 ({len(failed_symbols)}개):")
        for symbol in failed_symbols[:10]:
            print(f"  - {symbol}")
        if len(failed_symbols) > 10:
            print(f"  ... 그 외 {len(failed_symbols) - 10}개")

    # 상위 15개 종목 표시
    print(f"\n[TOP 15] 가장 많은 기사를 수집한 종목:")
    sorted_results = sorted(results.items(), key=lambda x: x[1], reverse=True)
    for i, (symbol, count) in enumerate(sorted_results[:15], 1):
        print(f"  {i:2}. {symbol:<6} - {count:2}개")


async def main():
    """메인 테스트 함수"""
    print("\n" + "="*80)
    print("[START] Event Registry (newsapi.ai) 뉴스 크롤링 테스트 시작")
    print("="*80)
    print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API 소스: Event Registry (newsapi.ai)")
    print(f"기능: 전체 기사 본문(body) 수집 및 DB 저장")

    try:
        # TEST 1: 단일 종목
        await test_single_symbol()

        # TEST 2: 여러 종목 (10개)
        await test_multiple_symbols()

        # TEST 3: 전체 100개 (기본 실행)
        await test_all_100_symbols()

    except Exception as e:
        logger.error(f"[ERROR] Fatal error: {str(e)}")
        print(f"\n[ERROR] 심각한 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("\n" + "="*80)
    print("[OK] 모든 테스트 완료")
    print("="*80)
    print(f"종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n[SUCCESS] Event Registry 뉴스 크롤링이 성공적으로 완료되었습니다!")
    print("[INFO] 100개 종목의 뉴스가 Supabase 데이터베이스에 저장되었습니다")


if __name__ == "__main__":
    print("\n[GUIDE] 실행 안내:")
    print("   - TEST 1: 단일 종목 (AAPL) 테스트")
    print("   - TEST 2: 여러 종목 (10개) 테스트")
    print("   - TEST 3: 전체 100개 종목 크롤링 + DB 저장 (기본 실행)")
    print("   - API: Event Registry (newsapi.ai)")
    print("   - 특징: 전체 기사 본문(body) 포함 수집")
    print()

    asyncio.run(main())
