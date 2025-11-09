#!/usr/bin/env python3
"""
FMP 주식 데이터 수집 수동 스크립트
주식 지표 및 가격 이력을 FMP API로부터 수집하여 DB에 저장

사용 방법:
    python collect_stock_data.py --indicators              # 지표만 수집
    python collect_stock_data.py --prices                  # 가격 이력만 수집
    python collect_stock_data.py --full                    # 모두 수집
    python collect_stock_data.py --indicators --symbols AAPL GOOGL  # 특정 종목만
    python collect_stock_data.py --full --force             # 기존 데이터 무시하고 다시 수집
"""

import asyncio
import sys
import argparse
from datetime import datetime
import logging

# 경로 설정
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.fmp_stock_data_service import FMPStockDataService
from app.core.config import settings

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('stock_data_collection.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

async def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='FMP 주식 데이터 수집 스크립트',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python collect_stock_data.py --indicators                        # 지표 수집
  python collect_stock_data.py --prices                            # 가격 이력 수집
  python collect_stock_data.py --full                              # 모두 수집
  python collect_stock_data.py --full --force                      # 강제 재수집
  python collect_stock_data.py --indicators --symbols AAPL GOOGL  # 특정 종목 지표
  python collect_stock_data.py --prices --symbols TSLA MSFT       # 특정 종목 가격
        """
    )

    # 수집 유형 선택
    parser.add_argument(
        '--indicators',
        action='store_true',
        help='주식 지표 수집 (기술지표, 재무지표)'
    )
    parser.add_argument(
        '--prices',
        action='store_true',
        help='주식 가격 이력 수집 (5년)'
    )
    parser.add_argument(
        '--full',
        action='store_true',
        help='지표 + 가격 이력 모두 수집'
    )

    # 옵션
    parser.add_argument(
        '--symbols',
        nargs='+',
        help='수집할 특정 종목 (예: AAPL GOOGL MSFT)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='이미 수집한 데이터도 다시 수집 (강제 새로고침)'
    )

    args = parser.parse_args()

    # 최소 하나의 수집 옵션 확인
    if not (args.indicators or args.prices or args.full):
        parser.print_help()
        sys.exit(1)

    # API 키 확인
    if not settings.fmp_api_key:
        logger.error("FMP_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
        sys.exit(1)

    logger.info("=" * 80)
    logger.info("FMP 주식 데이터 수집 시작")
    logger.info("=" * 80)

    service = FMPStockDataService.get_instance()

    try:
        if args.full:
            # 전체 데이터 수집
            logger.info(f"종목 데이터 (지표 + 가격): {args.symbols if args.symbols else '전체 100개'}")
            result = await service.collect_full_stock_data(
                symbols=args.symbols,
                force_refresh=args.force
            )
            _print_results(result)

        else:
            # 선택적 수집
            if args.indicators:
                logger.info(f"주식 지표 수집 중: {args.symbols if args.symbols else '전체 100개'}")
                result = await service.collect_all_stock_indicators(
                    symbols=args.symbols,
                    force_refresh=args.force
                )
                _print_results(result)

            if args.prices:
                logger.info(f"주식 가격 이력 수집 중: {args.symbols if args.symbols else '전체 100개'}")
                result = await service.collect_all_price_history(
                    symbols=args.symbols,
                    force_refresh=args.force
                )
                _print_results(result)

        logger.info("=" * 80)
        logger.info("수집 완료")
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
    logger.info("수집 결과")
    logger.info("=" * 80)

    if result.get('status') == 'error':
        logger.error(f"오류: {result.get('error')}")
        return

    # 전체 수집 결과인 경우
    if 'indicators' in result and 'price_history' in result:
        logger.info("\n[지표 수집]")
        _print_collection_result(result['indicators'])
        logger.info("\n[가격 이력 수집]")
        _print_collection_result(result['price_history'])
        logger.info(f"\n전체 소요 시간: {result.get('total_elapsed_seconds', 0):.2f}초")
    else:
        _print_collection_result(result)

    logger.info("=" * 80 + "\n")

def _print_collection_result(result: dict):
    """개별 수집 결과 출력"""
    logger.info(f"성공: {result.get('successful', 0)}/{result.get('total_symbols', 0)}")
    logger.info(f"실패: {result.get('failed', 0)}")

    if result.get('total_records'):
        logger.info(f"저장 레코드: {result.get('total_records', 0)}")

    elapsed = result.get('elapsed_seconds', 0)
    if elapsed:
        logger.info(f"소요 시간: {elapsed:.2f}초")

    if result.get('errors'):
        logger.warning(f"\n오류 목록 ({len(result['errors'])}개):")
        for error in result['errors'][:5]:
            logger.warning(f"  - {error}")
        if len(result['errors']) > 5:
            logger.warning(f"  ... 등 {len(result['errors']) - 5}개 더 있습니다")

if __name__ == '__main__':
    asyncio.run(main())
