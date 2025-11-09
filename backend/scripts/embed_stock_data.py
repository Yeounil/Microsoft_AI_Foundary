#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
주식 데이터(stock_indicators, stock_price_history) 일괄 임베딩 스크립트
Vector DB(Pinecone)에 모든 주식 데이터를 임베딩하여 저장합니다.

사용법:
    # 모든 종목 임베딩
    python scripts/embed_stock_data.py --all

    # 특정 종목만 임베딩
    python scripts/embed_stock_data.py --symbols AAPL GOOGL MSFT

    # 지표만 임베딩
    python scripts/embed_stock_data.py --indicators-only

    # 가격 이력만 임베딩
    python scripts/embed_stock_data.py --prices-only
"""

import asyncio
import logging
import sys
from pathlib import Path
from argparse import ArgumentParser
from typing import List, Dict, Optional
from datetime import datetime

# 프로젝트 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase_client import get_supabase
from app.services.financial_embedding_service import FinancialEmbeddingService

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class StockDataEmbeddingService:
    """주식 데이터 임베딩 관리 서비스"""

    def __init__(self):
        self.supabase = get_supabase()
        self.embedding_service = FinancialEmbeddingService()
        self.total_processed = 0
        self.total_succeeded = 0
        self.total_failed = 0

    async def get_all_symbols(self) -> List[str]:
        """
        DB에서 모든 종목 심볼 조회

        Returns:
            종목 심볼 리스트
        """
        try:
            logger.info("[DB] 종목 심볼 조회 중...")
            result = self.supabase.table("stock_indicators")\
                .select("symbol")\
                .execute()

            symbols = [row.get("symbol") for row in result.data if row.get("symbol")]
            logger.info(f"[OK] {len(symbols)}개 종목 조회 완료")
            return sorted(symbols)

        except Exception as e:
            logger.error(f"[ERROR] 종목 조회 실패: {str(e)}")
            return []

    async def embed_stock_indicators_for_symbols(
        self,
        symbols: List[str],
        skip_existing: bool = False
    ) -> Dict:
        """
        여러 종목의 지표를 임베딩

        Args:
            symbols: 종목 코드 리스트
            skip_existing: 기존 임베딩 스킵 여부

        Returns:
            처리 결과
        """
        try:
            logger.info("=" * 70)
            logger.info(f"📊 주식 지표 임베딩 시작 ({len(symbols)}개 종목)")
            logger.info("=" * 70)

            results = {
                "type": "stock_indicators",
                "total": len(symbols),
                "succeeded": 0,
                "failed": 0,
                "details": []
            }

            for idx, symbol in enumerate(symbols, 1):
                try:
                    logger.info(f"\n[{idx}/{len(symbols)}] {symbol} 지표 임베딩 중...")

                    result = await self.embedding_service.embed_stock_indicators(symbol)

                    if result.get("status") == "success":
                        results["succeeded"] += 1
                        self.total_succeeded += 1
                        logger.info(f"[OK] {symbol} 지표 임베딩 완료")
                    else:
                        results["failed"] += 1
                        self.total_failed += 1
                        logger.warning(f"[WARN] {symbol} 지표 임베딩 실패: {result.get('reason')}")

                    results["details"].append({
                        "symbol": symbol,
                        "status": result.get("status"),
                        "vector_id": result.get("vector_id"),
                        "reason": result.get("reason")
                    })

                    self.total_processed += 1

                except Exception as e:
                    results["failed"] += 1
                    self.total_failed += 1
                    self.total_processed += 1
                    logger.error(f"[ERROR] {symbol} 처리 중 오류: {str(e)}")
                    results["details"].append({
                        "symbol": symbol,
                        "status": "error",
                        "reason": str(e)
                    })

            logger.info("\n" + "=" * 70)
            logger.info(f"지표 임베딩 완료: {results['succeeded']}/{len(symbols)} 성공")
            logger.info("=" * 70)

            return results

        except Exception as e:
            logger.error(f"[ERROR] 지표 임베딩 실패: {str(e)}")
            return {
                "status": "error",
                "reason": str(e)
            }

    async def embed_price_history_for_symbols(
        self,
        symbols: List[str],
        chunk_size: int = 30
    ) -> Dict:
        """
        여러 종목의 가격 이력을 임베딩

        Args:
            symbols: 종목 코드 리스트
            chunk_size: 청크 크기 (일)

        Returns:
            처리 결과
        """
        try:
            logger.info("=" * 70)
            logger.info(f"📈 가격 이력 임베딩 시작 ({len(symbols)}개 종목, 청크 크기: {chunk_size}일)")
            logger.info("=" * 70)

            results = {
                "type": "price_history",
                "total": len(symbols),
                "succeeded": 0,
                "failed": 0,
                "total_chunks": 0,
                "details": []
            }

            for idx, symbol in enumerate(symbols, 1):
                try:
                    logger.info(f"\n[{idx}/{len(symbols)}] {symbol} 가격 이력 임베딩 중...")

                    result = await self.embedding_service.embed_price_history(
                        symbol=symbol,
                        chunk_size=chunk_size
                    )

                    if result.get("status") == "success":
                        results["succeeded"] += 1
                        chunks = result.get("chunks_created", 0)
                        results["total_chunks"] += chunks
                        self.total_succeeded += 1
                        logger.info(f"[OK] {symbol} 가격 이력 임베딩 완료 ({chunks}개 청크)")
                    else:
                        results["failed"] += 1
                        self.total_failed += 1
                        logger.warning(f"[WARN] {symbol} 가격 이력 임베딩 실패: {result.get('reason')}")

                    results["details"].append({
                        "symbol": symbol,
                        "status": result.get("status"),
                        "chunks_created": result.get("chunks_created"),
                        "total_days": result.get("total_days"),
                        "reason": result.get("reason")
                    })

                    self.total_processed += 1

                except Exception as e:
                    results["failed"] += 1
                    self.total_failed += 1
                    self.total_processed += 1
                    logger.error(f"[ERROR] {symbol} 처리 중 오류: {str(e)}")
                    results["details"].append({
                        "symbol": symbol,
                        "status": "error",
                        "reason": str(e)
                    })

            logger.info("\n" + "=" * 70)
            logger.info(f"가격 이력 임베딩 완료: {results['succeeded']}/{len(symbols)} 성공")
            logger.info(f"총 생성된 청크: {results['total_chunks']}")
            logger.info("=" * 70)

            return results

        except Exception as e:
            logger.error(f"[ERROR] 가격 이력 임베딩 실패: {str(e)}")
            return {
                "status": "error",
                "reason": str(e)
            }

    async def embed_batch_symbols(
        self,
        symbols: List[str],
        include_news: bool = True
    ) -> Dict:
        """
        여러 종목의 모든 데이터(지표 + 가격 이력 + 뉴스)를 종합 임베딩

        Args:
            symbols: 종목 코드 리스트
            include_news: 뉴스 포함 여부

        Returns:
            처리 결과
        """
        try:
            logger.info("=" * 70)
            logger.info(f"🔄 종합 임베딩 시작 ({len(symbols)}개 종목, 뉴스 포함: {include_news})")
            logger.info("=" * 70)

            results = await self.embedding_service.embed_batch_symbols(symbols)

            logger.info("\n" + "=" * 70)
            logger.info("종합 임베딩 완료")
            logger.info("=" * 70)

            return results

        except Exception as e:
            logger.error(f"[ERROR] 종합 임베딩 실패: {str(e)}")
            return {
                "status": "error",
                "reason": str(e)
            }

    def print_summary(self):
        """처리 요약 출력"""
        logger.info("\n" + "=" * 70)
        logger.info("📋 처리 요약")
        logger.info("=" * 70)
        logger.info(f"총 처리: {self.total_processed}개")
        logger.info(f"성공: {self.total_succeeded}개")
        logger.info(f"실패: {self.total_failed}개")
        logger.info(f"성공률: {(self.total_succeeded / self.total_processed * 100):.1f}%" if self.total_processed > 0 else "처리된 항목 없음")
        logger.info("=" * 70)


async def main():
    """메인 함수"""
    parser = ArgumentParser(description="주식 데이터 Vector DB 임베딩 스크립트")

    parser.add_argument(
        "--all",
        action="store_true",
        help="모든 종목의 모든 데이터 임베딩"
    )
    parser.add_argument(
        "--symbols",
        nargs="+",
        help="특정 종목 코드 리스트 (예: AAPL GOOGL MSFT)"
    )
    parser.add_argument(
        "--indicators-only",
        action="store_true",
        help="지표만 임베딩"
    )
    parser.add_argument(
        "--prices-only",
        action="store_true",
        help="가격 이력만 임베딩"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=30,
        help="가격 이력 청크 크기 (기본값: 30일)"
    )
    parser.add_argument(
        "--skip-news",
        action="store_true",
        help="뉴스 임베딩 스킵"
    )

    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("🚀 주식 데이터 임베딩 시작")
    logger.info("=" * 70)

    service = StockDataEmbeddingService()

    # 종목 결정
    if args.symbols:
        symbols = [s.upper() for s in args.symbols]
        logger.info(f"임베딩할 종목: {', '.join(symbols)}")
    elif args.all:
        symbols = await service.get_all_symbols()
        logger.info(f"모든 종목 임베딩: {len(symbols)}개 종목")
    else:
        parser.print_help()
        return

    if not symbols:
        logger.error("❌ 임베딩할 종목이 없습니다")
        return

    try:
        all_results = {
            "start_time": datetime.now().isoformat(),
            "symbols": symbols,
            "results": {}
        }

        # 지표 임베딩
        if not args.prices_only:
            indicators_result = await service.embed_stock_indicators_for_symbols(symbols)
            all_results["results"]["indicators"] = indicators_result

        # 가격 이력 임베딩
        if not args.indicators_only:
            prices_result = await service.embed_price_history_for_symbols(
                symbols,
                chunk_size=args.chunk_size
            )
            all_results["results"]["prices"] = prices_result

        all_results["end_time"] = datetime.now().isoformat()

        service.print_summary()

        logger.info("\n✅ 임베딩 작업 완료!")

    except KeyboardInterrupt:
        logger.info("\n⏸️  작업이 중단되었습니다")
    except Exception as e:
        logger.error(f"❌ 작업 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
