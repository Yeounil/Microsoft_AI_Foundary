#!/usr/bin/env python3
"""
Massive API를 사용한 비즈니스 뉴스 크롤링 스크립트
특정 기간 동안의 뉴스를 Massive API에서 크롤링하여 DB에 저장

사용 방법:
    python crawl_massive_news.py --start 2025-01-01 --end 2025-01-31              # 특정 기간
    python crawl_massive_news.py --start 2025-01-01                                # 시작일부터 현재까지
    python crawl_massive_news.py --days 7                                           # 최근 7일
    python crawl_massive_news.py --start 2025-01-01 --symbols AAPL GOOGL          # 특정 종목만
    python crawl_massive_news.py --start 2025-01-01 --limit 50                     # 종목당 최대 50개
"""

import asyncio
import sys
import argparse
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Optional
import aiohttp
from bs4 import BeautifulSoup

# 경로 설정
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.news_db_service import NewsDBService
from app.core.config import settings

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('massive_news_crawling.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Massive API 기본 설정
MASSIVE_API_BASE_URL = "https://api.massive.com"
MASSIVE_NEWS_ENDPOINT = "/v2/reference/news"

# 지원 종목 목록
SUPPORTED_SYMBOLS = [
    "AAPL", "GOOGL", "GOOG", "MSFT", "TSLA", "NVDA", "AMZN", "META",
    "NFLX", "JPM", "JNJ", "WMT", "XOM", "VZ", "PFE",
    "005930.KS", "000660.KS", "035420.KS", "035720.KS"
]


def sentiment_to_score(sentiment: Optional[str]) -> float:
    """sentiment를 ai_score로 변환

    Args:
        sentiment: positive, negative, neutral 중 하나

    Returns:
        ai_score 값 (positive: 0.7, negative: 0.3, neutral: 0.5)
    """
    if not sentiment:
        return 0.5

    sentiment_lower = sentiment.lower()
    if sentiment_lower == 'positive':
        return 0.7
    elif sentiment_lower == 'negative':
        return 0.3
    else:  # neutral or unknown
        return 0.5


async def fetch_article_body(session: aiohttp.ClientSession, url: str) -> Optional[str]:
    """기사 URL에서 본문 추출

    Args:
        session: aiohttp ClientSession
        url: 기사 URL

    Returns:
        기사 본문 텍스트 또는 None
    """
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
            if response.status != 200:
                return None

            html = await response.text()
            soup = BeautifulSoup(html, 'lxml')

            # 일반적인 기사 본문 선택자 시도
            # 사이트마다 다를 수 있으므로 여러 선택자 시도
            body_selectors = [
                'article',
                '.article-body',
                '.article-content',
                '.post-content',
                '.entry-content',
                '[itemprop="articleBody"]',
                'main article',
            ]

            for selector in body_selectors:
                body_elem = soup.select_one(selector)
                if body_elem:
                    # 스크립트, 스타일 태그 제거
                    for tag in body_elem(['script', 'style', 'nav', 'aside', 'footer']):
                        tag.decompose()

                    # 텍스트 추출 및 정리
                    text = body_elem.get_text(separator='\n', strip=True)
                    # 연속된 공백 줄 제거
                    lines = [line.strip() for line in text.split('\n') if line.strip()]
                    body = '\n'.join(lines)

                    if body and len(body) > 100:  # 최소 길이 체크
                        return body

            # 선택자로 찾지 못한 경우, 모든 p 태그 수집
            paragraphs = soup.find_all('p')
            if paragraphs:
                text = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
                if text and len(text) > 100:
                    return text

            return None

    except asyncio.TimeoutError:
        logger.warning(f"본문 추출 타임아웃: {url}")
        return None
    except Exception as e:
        logger.warning(f"본문 추출 실패 ({url}): {str(e)}")
        return None


def convert_massive_article_to_db_format(article: dict, symbol: str, body: Optional[str] = None) -> dict:
    """Massive API 응답을 DB 저장 형식으로 변환

    Args:
        article: Massive API 응답 article 객체
        symbol: 종목 심볼
        body: 기사 본문 (선택)

    Returns:
        DB 저장 형식의 딕셔너리
    """
    # sentiment 추출
    sentiment = None
    sentiment_reasoning = None
    if article.get('insights'):
        for insight in article['insights']:
            if insight.get('ticker') == symbol:
                sentiment = insight.get('sentiment')
                sentiment_reasoning = insight.get('sentiment_reasoning')
                break

    # sentiment를 ai_score로 변환
    ai_score = sentiment_to_score(sentiment)

    return {
        'title': article.get('title', ''),
        'url': article.get('article_url', ''),
        'description': article.get('description', ''),
        'source': article.get('publisher', {}).get('name', 'Massive API'),
        'published_at': article.get('published_utc', ''),
        'image_url': article.get('image_url'),
        'author': article.get('author'),
        'symbol': symbol,
        'tickers': article.get('tickers', []),
        'sentiment': sentiment,
        'sentiment_reasoning': sentiment_reasoning,
        'keywords': article.get('keywords', []),
        'ai_score': ai_score,
        'ai_analyzed_text': sentiment_reasoning,
        'body': body,
    }


async def fetch_massive_news(
    session: aiohttp.ClientSession,
    api_key: str,
    symbol: str,
    start_date: str,
    end_date: str = None,
    limit: int = 100
) -> List[dict]:
    """Massive API에서 뉴스 가져오기

    Args:
        session: aiohttp ClientSession
        api_key: Massive API 키
        symbol: 종목 심볼
        start_date: 시작 날짜 (YYYY-MM-DD)
        end_date: 종료 날짜 (YYYY-MM-DD)
        limit: 최대 결과 개수

    Returns:
        뉴스 article 리스트
    """
    url = f"{MASSIVE_API_BASE_URL}{MASSIVE_NEWS_ENDPOINT}"

    # 날짜를 UTC ISO 8601 형식으로 변환
    start_datetime = datetime.strptime(start_date, '%Y-%m-%d').strftime('%Y-%m-%dT00:00:00Z')
    end_datetime = None
    if end_date:
        end_datetime = datetime.strptime(end_date, '%Y-%m-%d').strftime('%Y-%m-%dT23:59:59Z')

    params = {
        'ticker': symbol,
        'published_utc.gte': start_datetime,
        'limit': min(limit, 1000),  # Massive API max limit is 1000
        'order': 'desc',
        'sort': 'published_utc'
    }

    if end_datetime:
        params['published_utc.lte'] = end_datetime

    headers = {
        'Authorization': f'Bearer {api_key}'
    }

    try:
        async with session.get(url, params=params, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                return data.get('results', [])
            elif response.status == 401:
                logger.error(f"API 인증 실패: API 키를 확인하세요")
                return []
            elif response.status == 429:
                logger.warning(f"API Rate Limit 초과, 잠시 대기 후 재시도")
                await asyncio.sleep(60)
                return []
            else:
                logger.error(f"API 요청 실패: {response.status} - {await response.text()}")
                return []

    except Exception as e:
        logger.error(f"API 요청 중 오류: {str(e)}")
        return []


async def crawl_news_for_period(
    start_date: str,
    end_date: str = None,
    symbols: list = None,
    limit_per_symbol: int = 100
) -> dict:
    """특정 기간 동안의 뉴스를 크롤링

    Args:
        start_date: 시작 날짜 (YYYY-MM-DD)
        end_date: 종료 날짜 (YYYY-MM-DD), None이면 현재까지
        symbols: 크롤링할 종목 목록, None이면 전체
        limit_per_symbol: 종목당 가져올 최대 뉴스 개수

    Returns:
        크롤링 결과 딕셔너리
    """
    try:
        # API 키 확인
        api_key = getattr(settings, 'massive_api_key', None)
        if not api_key:
            logger.error("MASSIVE_API_KEY가 설정되지 않았습니다.")
            return {
                'status': 'error',
                'error': 'MASSIVE_API_KEY not configured'
            }

        # 종목 목록 결정
        target_symbols = symbols if symbols else SUPPORTED_SYMBOLS

        # 종료 날짜 설정
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')

        logger.info(f"크롤링 기간: {start_date} ~ {end_date}")
        logger.info(f"대상 종목: {len(target_symbols)}개")
        logger.info(f"종목당 최대 개수: {limit_per_symbol}개")
        logger.info("=" * 80)

        total_collected = 0
        total_saved = 0
        total_duplicates = 0
        errors = []

        start_time = datetime.now()

        async with aiohttp.ClientSession() as session:
            for idx, symbol in enumerate(target_symbols, 1):
                try:
                    logger.info(f"\n[{idx}/{len(target_symbols)}] {symbol} 크롤링 시작...")

                    # Massive API에서 뉴스 가져오기
                    raw_articles = await fetch_massive_news(
                        session=session,
                        api_key=api_key,
                        symbol=symbol,
                        start_date=start_date,
                        end_date=end_date,
                        limit=limit_per_symbol
                    )

                    if not raw_articles:
                        logger.warning(f"{symbol}: 가져온 뉴스가 없습니다")
                        continue

                    logger.info(f"{symbol}: {len(raw_articles)}개 뉴스 수집 완료")
                    total_collected += len(raw_articles)

                    # 데이터 형식 변환 및 본문 추출
                    articles = []
                    for raw_article in raw_articles:
                        article_url = raw_article.get('article_url')
                        body = None

                        # 본문 추출 시도
                        if article_url:
                            logger.debug(f"본문 추출 중: {article_url}")
                            body = await fetch_article_body(session, article_url)
                            if body:
                                logger.debug(f"본문 추출 성공 ({len(body)} 자)")
                            else:
                                logger.debug(f"본문 추출 실패, description 사용")

                        # 데이터 변환
                        article = convert_massive_article_to_db_format(raw_article, symbol, body)
                        articles.append(article)

                        # 본문 추출 간 짧은 대기 (Rate Limit 방지)
                        await asyncio.sleep(0.2)

                    # 중복 제거 (URL 기준)
                    unique_articles = []
                    for article in articles:
                        url = article.get("url")
                        if not url:
                            continue

                        # DB에 이미 존재하는지 확인
                        exists = await NewsDBService.check_article_exists(url)
                        if exists:
                            total_duplicates += 1
                            continue

                        unique_articles.append(article)

                    if not unique_articles:
                        logger.info(f"{symbol}: 새로운 뉴스 없음 (모두 중복)")
                        continue

                    logger.info(f"{symbol}: {len(unique_articles)}개 새로운 뉴스 (중복 {len(articles) - len(unique_articles)}개 제외)")

                    # DB에 저장
                    saved_ids = await NewsDBService.save_news_articles(unique_articles)
                    total_saved += len(saved_ids)

                    logger.info(f"{symbol}: {len(saved_ids)}개 뉴스 DB 저장 완료")

                    # API Rate Limit 방지를 위한 짧은 대기
                    await asyncio.sleep(1)

                except Exception as e:
                    error_msg = f"{symbol}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    continue

        elapsed_time = (datetime.now() - start_time).total_seconds()

        return {
            'status': 'success',
            'total_symbols': len(target_symbols),
            'total_collected': total_collected,
            'total_saved': total_saved,
            'total_duplicates': total_duplicates,
            'successful': len(target_symbols) - len(errors),
            'failed': len(errors),
            'errors': errors,
            'elapsed_seconds': elapsed_time
        }

    except Exception as e:
        logger.error(f"크롤링 중 오류 발생: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'error': str(e)
        }


async def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='Massive API를 사용한 비즈니스 뉴스 크롤링',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python crawl_massive_news.py --start 2025-01-01 --end 2025-01-31              # 특정 기간
  python crawl_massive_news.py --start 2025-01-01                                # 시작일부터 현재까지
  python crawl_massive_news.py --days 7                                           # 최근 7일
  python crawl_massive_news.py --start 2025-01-01 --symbols AAPL GOOGL          # 특정 종목만
  python crawl_massive_news.py --start 2025-01-01 --limit 50                     # 종목당 최대 50개
        """
    )

    # 날짜 옵션
    date_group = parser.add_mutually_exclusive_group(required=True)
    date_group.add_argument(
        '--start',
        type=str,
        help='시작 날짜 (YYYY-MM-DD 형식)'
    )
    date_group.add_argument(
        '--days',
        type=int,
        help='최근 N일 (예: 7이면 최근 7일)'
    )

    parser.add_argument(
        '--end',
        type=str,
        help='종료 날짜 (YYYY-MM-DD 형식, 생략시 현재까지)'
    )

    # 종목 옵션
    parser.add_argument(
        '--symbols',
        nargs='+',
        help='크롤링할 특정 종목 (예: AAPL GOOGL MSFT)'
    )

    # 개수 제한
    parser.add_argument(
        '--limit',
        type=int,
        default=100,
        help='종목당 가져올 최대 뉴스 개수 (기본값: 100)'
    )

    args = parser.parse_args()

    # 날짜 계산
    if args.days:
        start_date = (datetime.now() - timedelta(days=args.days)).strftime('%Y-%m-%d')
        end_date = datetime.now().strftime('%Y-%m-%d')
    else:
        start_date = args.start
        end_date = args.end

    # 날짜 형식 검증
    try:
        datetime.strptime(start_date, '%Y-%m-%d')
        if end_date:
            datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError:
        logger.error("날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.")
        sys.exit(1)

    # 종목 검증
    if args.symbols:
        invalid_symbols = [s for s in args.symbols if s not in SUPPORTED_SYMBOLS]
        if invalid_symbols:
            logger.warning(f"지원하지 않는 종목: {invalid_symbols}")
            logger.info(f"지원 종목: {SUPPORTED_SYMBOLS}")

    logger.info("=" * 80)
    logger.info("Massive API 뉴스 크롤링 시작")
    logger.info("=" * 80)

    try:
        result = await crawl_news_for_period(
            start_date=start_date,
            end_date=end_date,
            symbols=args.symbols,
            limit_per_symbol=args.limit
        )

        _print_results(result)

        logger.info("=" * 80)
        logger.info("크롤링 완료")
        logger.info("=" * 80)

    except KeyboardInterrupt:
        logger.warning("사용자에 의해 중단되었습니다")
        sys.exit(130)
    except Exception as e:
        logger.error(f"오류 발생: {str(e)}", exc_info=True)
        sys.exit(1)


def _print_results(result: dict):
    """결과 출력"""
    logger.info("\n" + "=" * 80)
    logger.info("크롤링 결과")
    logger.info("=" * 80)

    if result.get('status') == 'error':
        logger.error(f"오류: {result.get('error')}")
        return

    logger.info(f"처리 종목: {result.get('successful', 0)}/{result.get('total_symbols', 0)}")
    logger.info(f"실패: {result.get('failed', 0)}")
    logger.info(f"수집된 뉴스: {result.get('total_collected', 0)}개")
    logger.info(f"저장된 뉴스: {result.get('total_saved', 0)}개")
    logger.info(f"중복 제외: {result.get('total_duplicates', 0)}개")
    logger.info(f"소요 시간: {result.get('elapsed_seconds', 0):.2f}초")

    if result.get('errors'):
        logger.warning(f"\n오류 목록 ({len(result['errors'])}개):")
        for error in result['errors'][:10]:
            logger.warning(f"  - {error}")
        if len(result['errors']) > 10:
            logger.warning(f"  ... 등 {len(result['errors']) - 10}개 더 있습니다")

    logger.info("=" * 80 + "\n")


if __name__ == '__main__':
    asyncio.run(main())
