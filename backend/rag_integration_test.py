#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAG (Retrieval Augmented Generation) 통합 테스트 스크립트
Vector DB → GPT-5 파이프라인 검증
"""

import asyncio
import sys
import logging
from pathlib import Path

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 프로젝트 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

from app.services.rag_service import RAGService


async def test_search_similar_stocks():
    """유사 주식 검색 테스트"""
    logger.info("=" * 80)
    logger.info("[TEST 1] Search Similar Stocks")
    logger.info("=" * 80)

    rag = RAGService()

    # 테스트 케이스
    test_queries = [
        "AI 기업",
        "반도체 회사",
        "Apple과 유사한 기업",
        "클라우드 서비스 제공업체"
    ]

    for query in test_queries:
        logger.info(f"\n🔍 Query: '{query}'")
        result = await rag.search_similar_stocks(query, top_k=3)

        if result.get("status") == "success":
            logger.info(f"✅ Found {result.get('total_results')} results:")
            for idx, stock in enumerate(result.get("results", []), 1):
                symbol = stock.get("symbol", "N/A")
                name = stock.get("company_name", "N/A")
                score = stock.get("similarity_score", 0)
                sector = stock.get("sector", "N/A")
                price = stock.get("current_price", 0)
                logger.info(f"   {idx}. {symbol} ({name}) - Score: {score*100:.1f}%")
                logger.info(f"      Sector: {sector}, Price: ${price:,.2f}")
        else:
            logger.error(f"❌ Search failed: {result.get('reason')}")


async def test_generate_context():
    """RAG 컨텍스트 생성 테스트"""
    logger.info("\n" + "=" * 80)
    logger.info("[TEST 2] Generate RAG Context")
    logger.info("=" * 80)

    rag = RAGService()

    query = "기술주 중에서 가장 안정적인 기업은?"

    logger.info(f"\n📝 Generating context for: '{query}'")
    result = await rag.generate_rag_context(query, top_k=3)

    if result.get("status") == "success":
        logger.info("✅ Context generated successfully!")
        logger.info(f"\n[Context Preview (first 500 chars)]:")
        context = result.get("context", "")
        logger.info(context[:500] + "...")
        logger.info(f"\n[Total sources: {result.get('total_results')}]")
    else:
        logger.error(f"❌ Context generation failed: {result.get('reason')}")


async def test_rag_query():
    """RAG 쿼리 테스트 (GPT-5 호출)"""
    logger.info("\n" + "=" * 80)
    logger.info("[TEST 3] RAG Query with GPT-5")
    logger.info("=" * 80)

    rag = RAGService()

    test_queries = [
        "현재 시점에서 AI 기업들의 투자 가치는 어떻게 되나?",
        "반도체 기업들 중 어느 기업이 가장 실적이 좋은가?",
        "기술 대형주들의 공통점은 무엇인가?"
    ]

    for query in test_queries:
        logger.info(f"\n💬 Query: '{query}'")
        logger.info("⏳ Calling GPT-5 with RAG context...")

        result = await rag.query_with_rag(query, top_k=3)

        if result.get("status") == "success":
            logger.info("✅ GPT-5 Response received!")
            response = result.get("response", "")
            logger.info(f"\n[Response (first 800 chars)]:")
            logger.info(response[:800] + "...")
            logger.info(f"\n[Source Symbols: {result.get('source_symbols')}]")
        else:
            logger.error(f"❌ Query failed: {result.get('reason')}")


async def test_stock_comparison():
    """종목 비교 분석 테스트"""
    logger.info("\n" + "=" * 80)
    logger.info("[TEST 4] Stock Comparison Analysis")
    logger.info("=" * 80)

    rag = RAGService()

    comparison_pairs = [
        ("AAPL", "MSFT"),
        ("NVDA", "AMD"),
        ("TSLA", "F")
    ]

    for symbol_1, symbol_2 in comparison_pairs:
        logger.info(f"\n⚖️  Comparing {symbol_1} vs {symbol_2}")
        logger.info("⏳ Analyzing comparison...")

        result = await rag.compare_stocks(
            symbol_1=symbol_1,
            symbol_2=symbol_2,
            analysis_type="comprehensive"
        )

        if result.get("status") == "success":
            logger.info("✅ Comparison analysis complete!")
            comparison = result.get("comparison", "")
            logger.info(f"\n[Comparison (first 600 chars)]:")
            logger.info(comparison[:600] + "...")
        else:
            logger.warning(f"⚠️  Comparison not available: {result.get('reason')}")


async def test_vector_search_flow():
    """전체 벡터 검색 플로우 테스트"""
    logger.info("\n" + "=" * 80)
    logger.info("[TEST 5] Complete Vector Search Flow")
    logger.info("=" * 80)

    rag = RAGService()

    logger.info("\n📋 Step 1: Generate Query Embedding")
    query = "높은 배당금을 지급하는 대형 기업"
    query_embedding = await rag.openai_service.generate_embedding(query)

    if query_embedding:
        logger.info(f"✅ Embedding generated: {len(query_embedding)} dimensions")

        logger.info("\n📍 Step 2: Search Pinecone for Similar Vectors")
        similar = await rag.pinecone_service.query_similar_stocks(
            query_embedding=query_embedding,
            top_k=3
        )
        logger.info(f"✅ Found {len(similar)} similar stocks")

        logger.info("\n💾 Step 3: Enrich with Additional Data")
        enriched = await rag._enrich_search_results(similar)
        logger.info(f"✅ Enriched {len(enriched)} stocks with detailed data")

        logger.info("\n📝 Step 4: Build Context for GPT-5")
        context = rag._build_context_text(query, enriched)
        logger.info(f"✅ Context built: {len(context)} characters")

        logger.info("\n🤖 Step 5: Send to GPT-5")
        messages = [
            {
                "role": "system",
                "content": "당신은 전문적인 금융 분석가입니다."
            },
            {
                "role": "user",
                "content": f"{context}\n\n질문: {query}를 제공하는 기업들의 특징은?"
            }
        ]

        response = await rag.openai_service.async_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )

        if response:
            logger.info("✅ GPT-5 Response received!")
            logger.info(f"\n[Analysis (first 500 chars)]:")
            logger.info(response[:500] + "...")
        else:
            logger.error("❌ GPT-5 call failed")
    else:
        logger.error("❌ Embedding generation failed")


async def main():
    """메인 테스트 함수"""
    logger.info("\n" + "=" * 80)
    logger.info("🚀 RAG Integration Test Suite Starting")
    logger.info("=" * 80)

    try:
        # 테스트 1: 유사 주식 검색
        await test_search_similar_stocks()

        # 테스트 2: 컨텍스트 생성
        await test_generate_context()

        # 테스트 3: RAG 쿼리
        await test_rag_query()

        # 테스트 4: 종목 비교
        await test_stock_comparison()

        # 테스트 5: 전체 플로우
        await test_vector_search_flow()

        logger.info("\n" + "=" * 80)
        logger.info("✅ All RAG tests completed successfully!")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
