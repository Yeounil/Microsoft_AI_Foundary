#!/usr/bin/env python3
"""
뉴스 크롤링 스크립트
특정 기간 동안의 뉴스를 newsapi.ai (Event Registry)에서 크롤링하여 DB에 저장

사용 방법:
    python crawl_news.py --start 2025-01-01 --end 2025-01-31              # 특정 기간
    python crawl_news.py --start 2025-01-01                                # 시작일부터 현재까지
    python crawl_news.py --days 7                                           # 최근 7일
    python crawl_news.py --start 2025-01-01 --symbols AAPL GOOGL          # 특정 종목만
    python crawl_news.py --start 2025-01-01 --limit 50                     # 종목당 최대 50개
"""

import asyncio
import sys
import argparse
from datetime import datetime, timedelta
import logging

# 경로 설정
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.news_service import NewsService
from app.services.news_db_service import NewsDBService
from app.core.config import settings

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('news_crawling.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 지원 종목 목록 (모든 섹터)
SUPPORTED_SYMBOLS = [
    # Tech
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "META", "NFLX", "CRM",
    "ORCL", "ADBE", "INTC", "AMD", "MU", "QCOM", "IBM", "CSCO", "HPQ", "AVGO",
    # Finance
    "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP", "CB",
    "AIG", "MMC", "ICE", "CBOE", "V",
    # Healthcare
    "JNJ", "UNH", "PFE", "ABBV", "MRK", "TMO", "LLY", "ABT", "AMGN", "GILD",
    "CVS", "ISRG", "REGN", "BIIB", "VRTX",
    # Retail & Consumer
    "WMT", "TGT", "HD", "LOW", "MCD", "SBUX", "KO", "PEP", "NKE", "VFC",
    "LULU", "DKS", "RH", "COST", "DIS",
    # Industrials
    "CAT", "BA", "MMM", "RTX", "HON", "JCI", "PCAR", "GE", "DE", "LMT",
    # Energy
    "XOM", "CVX", "COP", "MPC", "PSX", "VLO", "EOG", "OXY", "MRO", "SLB",
    # Communications
    "VZ", "T", "TMUS",
    # ETFs
    "SPY", "QQQ", "DIA", "IWM", "VTI", "VOO", "VEA", "VWO", "AGG", "BND", "GLD", "SLV"
]

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

        for idx, symbol in enumerate(target_symbols, 1):
            try:
                logger.info(f"\n[{idx}/{len(target_symbols)}] {symbol} 크롤링 시작...")

                # newsapi.ai에서 뉴스 가져오기
                articles = await NewsService.get_reuters_news(
                    symbol=symbol,
                    limit=limit_per_symbol,
                    date_start=start_date
                )

                if not articles:
                    logger.warning(f"{symbol}: 가져온 뉴스가 없습니다")
                    continue

                logger.info(f"{symbol}: {len(articles)}개 뉴스 수집 완료")
                total_collected += len(articles)

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
                await asyncio.sleep(0.5)

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
        description='뉴스 크롤링 스크립트 (newsapi.ai)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python crawl_news.py --start 2025-01-01 --end 2025-01-31              # 특정 기간
  python crawl_news.py --start 2025-01-01                                # 시작일부터 현재까지
  python crawl_news.py --days 7                                           # 최근 7일
  python crawl_news.py --start 2025-01-01 --symbols AAPL GOOGL          # 특정 종목만
  python crawl_news.py --start 2025-01-01 --limit 50                     # 종목당 최대 50개
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

    # API 키 확인
    if not settings.news_api_key:
        logger.error("NEWS_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
        sys.exit(1)

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
    logger.info("뉴스 크롤링 시작")
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
