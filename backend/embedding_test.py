#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금융 데이터 임베딩 테스트 스크립트
주식 지표, 주가 히스토리, 뉴스를 임베딩하여 Pinecone에 저장
"""

import asyncio
import logging
import sys
from datetime import datetime

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 프로젝트 경로 추가
sys.path.insert(0, r'E:\Microsoft_AI_Foundary\backend')

from app.services.financial_embedding_service import FinancialEmbeddingService
from app.services.textification_service import TextificationService
from app.services.pinecone_service import PineconeService
from app.db.supabase_client import get_supabase


async def test_textification():
    """Textification 테스트"""
    logger.info("=" * 80)
    logger.info("[TEST] Textification Service")
    logger.info("=" * 80)

    supabase = get_supabase()

    # DB에서 샘플 데이터 조회
    result = supabase.table("stock_indicators").select("*").limit(1).execute()

    if not result.data:
        logger.warning("[WARN] No stock indicators found in database")
        return

    indicators = result.data[0]
    symbol = indicators.get("symbol")

    logger.info(f"\n[Sample] Stock: {symbol}")
    logger.info(f"  - Company: {indicators.get('company_name')}")
    logger.info(f"  - Current Price: ${indicators.get('current_price'):.2f}")
    logger.info(f"  - Market Cap: ${indicators.get('market_cap'):,.0f}")
    logger.info(f"  - P/E Ratio: {indicators.get('pe_ratio'):.1f}")

    # Textification
    text = TextificationService.textify_stock_indicators(symbol, indicators)

    logger.info(f"\n[Textified Output]:")
    logger.info(f"{text}\n")

    # 추가 테스트: Price Movement
    price_text = TextificationService.textify_price_movement(
        symbol=symbol,
        current_price=indicators.get("current_price", 0),
        previous_close=indicators.get("previous_close", 0),
        fifty_two_week_high=indicators.get("fifty_two_week_high", 0),
        fifty_two_week_low=indicators.get("fifty_two_week_low", 0)
    )

    logger.info(f"[Price Movement]:")
    logger.info(f"{price_text}\n")

    # 재무 건강도
    financial_health_text = TextificationService.textify_financial_health(
        symbol=symbol,
        ratios={
            "roe": indicators.get("roe", 0),
            "roa": indicators.get("roa", 0),
            "current_ratio": indicators.get("current_ratio", 0),
            "debt_to_equity": indicators.get("debt_to_equity", 0),
            "quick_ratio": indicators.get("quick_ratio", 0),
            "debt_ratio": indicators.get("debt_ratio", 0),
            "profit_margin": indicators.get("profit_margin", 0)
        }
    )

    logger.info(f"[Financial Health]:")
    logger.info(f"{financial_health_text}\n")


async def test_embedding_single_stock():
    """단일 주식 임베딩 테스트"""
    logger.info("=" * 80)
    logger.info("[TEST] Single Stock Embedding")
    logger.info("=" * 80)

    embedding_service = FinancialEmbeddingService()

    # 테스트할 종목
    test_symbols = ["AAPL", "GOOGL", "MSFT"]

    for symbol in test_symbols:
        logger.info(f"\n[Processing] {symbol}")

        result = await embedding_service.embed_stock_with_news(symbol, include_news=True)

        logger.info(f"  Status: {result.get('status')}")
        if result.get('indicators'):
            logger.info(f"    - Indicators: {result['indicators'].get('status')}")
        if result.get('price_history'):
            logger.info(f"    - Price History: {result['price_history'].get('status')}")
            logger.info(f"      Chunks created: {result['price_history'].get('chunks_created')}")
        if result.get('news'):
            logger.info(f"    - News: {result['news'].get('status')}")
            if result['news'].get('status') == 'success':
                logger.info(f"      Chunks created: {result['news'].get('chunks_created')}")


async def test_batch_embedding():
    """배치 임베딩 테스트"""
    logger.info("=" * 80)
    logger.info("[TEST] Batch Embedding")
    logger.info("=" * 80)

    embedding_service = FinancialEmbeddingService()

    # 배치 처리할 종목들
    symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN"]

    logger.info(f"\n[Processing] {len(symbols)} symbols")

    result = await embedding_service.embed_batch_symbols(symbols)

    logger.info(f"\n[Batch Result]:")
    logger.info(f"  Total: {result.get('total_symbols')}")
    logger.info(f"  Successful: {result.get('successful')}")
    logger.info(f"  Failed: {result.get('failed')}")

    if result.get('details'):
        logger.info(f"\n[Details]:")
        for detail in result.get('details', [])[:3]:  # 처음 3개만 표시
            logger.info(f"  - {detail.get('symbol')}: {detail.get('status')}")


async def test_pinecone_stats():
    """Pinecone 인덱스 통계 확인"""
    logger.info("=" * 80)
    logger.info("[TEST] Pinecone Index Stats")
    logger.info("=" * 80)

    pinecone_service = PineconeService()

    stats = await pinecone_service.get_index_stats()

    logger.info(f"\n[Pinecone Stats]:")
    logger.info(f"  Status: {stats.get('status')}")
    if stats.get('status') == 'success':
        logger.info(f"  Index Name: {stats.get('index_name')}")
        logger.info(f"  Total Vectors: {stats.get('total_vectors'):,}")
        logger.info(f"  Dimension: {stats.get('dimension')}")
        logger.info(f"  Timestamp: {stats.get('timestamp')}")
    else:
        logger.info(f"  Reason: {stats.get('reason')}")


async def main():
    """메인 테스트 함수"""
    logger.info("\n" + "=" * 80)
    logger.info("금융 데이터 임베딩 테스트 시작")
    logger.info("=" * 80 + "\n")

    try:
        # 1. Textification 테스트
        await test_textification()

        # 2. 단일 주식 임베딩 테스트
        await test_embedding_single_stock()

        # 3. 배치 임베딩 테스트
        await test_batch_embedding()

        # 4. Pinecone 통계 확인
        await test_pinecone_stats()

        logger.info("\n" + "=" * 80)
        logger.info("테스트 완료!")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"[ERROR] Test failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
