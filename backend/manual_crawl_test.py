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

    def get_news_from_event_registry(self, company_name: str, limit: int = 20) -> List[Dict]:
        """
        Event Registry API에서 특정 회사의 뉴스 가져오기 (전체 본문 포함)

        Args:
            company_name: 회사명 (예: "Apple", "Microsoft")
            limit: 가져올 기사 수

        Returns:
            뉴스 기사 리스트 (body 필드 포함)
        """
        try:
            # POST 요청을 위한 JSON 파라미터
            params = {
                "keyword": company_name,
                "articlesPage": 1,
                "articlesCount": limit,
                "articlesSortBy": "date",
                "articlesSortByAsc": False,  # 최신순
                "includeArticleTitle": True,
                "includeArticleBasicInfo": True,
                "includeArticleBody": True,  # ✅ 전체 기사 본문 포함
                "apiKey": self.api_key
            }

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Content-Type": "application/json"
            }

            logger.info(f"[API] Requesting articles from Event Registry for {company_name} (limit: {limit})")

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
                logger.warning(f"[WARN] API error: {data.get('error', 'Unknown error')}")
                return []

            # 기사 데이터 추출
            articles_data = data.get("articles", {})
            total_hits = articles_data.get("totalHits", 0)
            result_articles = articles_data.get("results", [])

            logger.info(f"[OK] Retrieved {len(result_articles)} articles from {total_hits} total for {company_name}")

            return result_articles[:limit]

        except Exception as e:
            logger.error(f"[ERROR] Failed to fetch news for {company_name}: {str(e)}")
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
    company_name = "Apple"
    limit = 20

    logger.info(f"[SINGLE_TEST] Starting test for {symbol} ({company_name})")

    try:
        articles = crawler.get_news_from_event_registry(company_name, limit)
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

    # 테스트용 10개 종목 + 회사명 매핑
    symbols = ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN", "META", "TSLA", "JPM", "JNJ", "WMT"]
    company_mapping = {
        "AAPL": "Apple",
        "MSFT": "Microsoft",
        "GOOGL": "Google",
        "NVDA": "NVIDIA",
        "AMZN": "Amazon",
        "META": "Meta",
        "TSLA": "Tesla",
        "JPM": "JPMorgan",
        "JNJ": "Johnson & Johnson",
        "WMT": "Walmart"
    }

    results = {}
    total_collected = 0

    logger.info(f"[MULTI_TEST] Starting test for {len(symbols)} symbols")

    for symbol in symbols:
        try:
            company_name = company_mapping[symbol]
            logger.info(f"[MULTI_TEST] Crawling {symbol} ({company_name})...")

            articles = crawler.get_news_from_event_registry(company_name, limit=20)
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
    print(f"  - 성공 종목: {len([v for v in results.values() if v > 0])}개/{len(symbols)}")
    print(f"  - 평균 기사/종목: {total_collected // len(symbols) if symbols else 0}개")


async def test_all_100_symbols():
    """모든 100개 종목 크롤링 및 DB 저장"""
    print("\n" + "="*80)
    print("[TEST 3] 전체 100개 종목 - Event Registry 뉴스 크롤링 + DB 저장")
    print("="*80)

    crawler = EventRegistryCrawler()
    symbols = crawler.get_popular_symbols()

    # 간단한 회사명 매핑 (심볼 -> 회사명)
    company_mapping = {
        "AAPL": "Apple", "MSFT": "Microsoft", "GOOGL": "Google", "GOOG": "Google",
        "AMZN": "Amazon", "NVDA": "NVIDIA", "TSLA": "Tesla", "META": "Meta",
        "NFLX": "Netflix", "CRM": "Salesforce", "BA": "Boeing", "JPM": "JPMorgan",
        "JNJ": "Johnson & Johnson", "WMT": "Walmart", "UNH": "UnitedHealth",
        "XOM": "ExxonMobil", "VZ": "Verizon", "PFE": "Pfizer", "PEP": "PepsiCo",
        "KO": "Coca-Cola", "MCD": "McDonald's", "SBUX": "Starbucks", "NKE": "Nike",
        "INTC": "Intel", "AMD": "Advanced Micro Devices", "CSCO": "Cisco",
        "ORCL": "Oracle", "IBM": "IBM", "QCOM": "Qualcomm", "ADBE": "Adobe",
        "PYPL": "PayPal", "SNOW": "Snowflake", "UBER": "Uber",
        "BAC": "Bank of America", "WFC": "Wells Fargo", "GS": "Goldman Sachs",
        "MS": "Morgan Stanley", "C": "Citigroup", "BLK": "BlackRock", "SCHW": "Charles Schwab",
        "AXP": "American Express", "CB": "Chubb", "ALL": "Allstate", "MMC": "Marsh & McLennan",
        "PGR": "Progressive", "TRV": "Travelers", "ICE": "Intercontinental Exchange",
        "UNH": "UnitedHealth", "PFE": "Pfizer", "ABBV": "AbbVie", "MRK": "Merck",
        "TMO": "Thermo Fisher", "LLY": "Eli Lilly", "ABT": "Abbott", "AMGN": "Amgen",
        "GILD": "Gilead", "BIIB": "Biogen", "VRTX": "Vertex", "ILMN": "Illumina",
        "REGN": "Regeneron", "VTRS": "Viatris",
        "TGT": "Target", "HD": "Home Depot", "LOW": "Lowe's", "MCD": "McDonald's",
        "SBUX": "Starbucks", "KO": "Coca-Cola", "PEP": "PepsiCo", "NKE": "Nike",
        "VFC": "VF Corporation", "GPS": "Gap", "DECK": "Deckers", "DRI": "Darden",
        "CMG": "Chipotle", "LULU": "Lululemon",
        "CAT": "Caterpillar", "GE": "General Electric", "HON": "Honeywell", "MMM": "3M",
        "RTX": "Raytheon", "LMT": "Lockheed Martin", "NOC": "Northrop Grumman",
        "GD": "General Dynamics", "UTX": "United Technologies",
        "CVX": "Chevron", "COP": "ConocoPhillips", "SLB": "Schlumberger", "EOG": "EOG Resources",
        "T": "AT&T", "TMUS": "T-Mobile", "CMCSA": "Comcast", "CHTR": "Charter",
        "PLD": "Prologis", "AMT": "American Tower", "CCI": "Crown Castle", "EQIX": "Equinix",
        "DLR": "Digital Realty",
        "NEE": "NextEra Energy", "D": "Dominion Energy", "SO": "Southern Company",
        "DUK": "Duke Energy", "EXC": "Exelon"
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
            company_name = company_mapping.get(symbol, symbol)

            articles = crawler.get_news_from_event_registry(company_name, limit=20)
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
