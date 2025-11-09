"""
금융 데이터 임베딩 서비스
수치 데이터 → 자연어 변환 → 임베딩 → Pinecone 저장
"""

import logging
import math
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import asyncio

from app.services.textification_service import TextificationService
from app.services.pinecone_service import PineconeService
from app.services.openai_service import OpenAIService
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class FinancialEmbeddingService:
    """금융 데이터를 임베딩으로 변환하여 Pinecone에 저장"""

    def __init__(self):
        self.textification = TextificationService()
        self.pinecone_service = PineconeService()
        self.embedding_service = OpenAIService()
        self.supabase = get_supabase()

    async def embed_stock_indicators(self, symbol: str) -> Dict:
        """
        주식 지표 정보를 임베딩으로 변환하여 Pinecone에 저장

        Args:
            symbol: 종목 코드

        Returns:
            처리 결과
        """
        try:
            logger.info(f"[EMBED] Starting stock indicators embedding for {symbol}")

            # 1. DB에서 주식 지표 조회
            result = self.supabase.table("stock_indicators")\
                .select("*")\
                .eq("symbol", symbol.upper())\
                .execute()

            if not result.data or len(result.data) == 0:
                logger.warning(f"[WARN] No stock indicators found for {symbol}")
                return {
                    "status": "error",
                    "symbol": symbol,
                    "reason": "No stock indicators found"
                }

            indicators = result.data[0]

            # 2. 수치 데이터를 자연어로 변환
            text = TextificationService.textify_stock_indicators(symbol, indicators)

            # 3. 자연어 텍스트를 임베딩으로 변환
            embedding = await self.embedding_service.generate_embedding(text)

            if not embedding:
                logger.error(f"[ERROR] Failed to generate embedding for {symbol}")
                return {
                    "status": "error",
                    "symbol": symbol,
                    "reason": "Failed to generate embedding"
                }

            # 4. 메타데이터 준비 - NULL 안전성: None을 0.0으로 변환
            def safe_float(value):
                """None 값을 안전하게 float로 변환"""
                if value is None:
                    return 0.0
                try:
                    return float(value)
                except (TypeError, ValueError):
                    return 0.0

            metadata = {
                "symbol": symbol.upper(),
                "company_name": indicators.get("company_name") or symbol,
                "data_type": "stock_indicators",
                "sector": indicators.get("sector") or "Unknown",
                "industry": indicators.get("industry") or "Unknown",
                "current_price": safe_float(indicators.get("current_price")),
                "market_cap": safe_float(indicators.get("market_cap")),
                "profit_margin": safe_float(indicators.get("profit_margin")),
                "timestamp": indicators.get("last_updated", datetime.now().isoformat()),
                "text_preview": text[:200]  # 첫 200자만 메타데이터에 저장
            }

            # 5. Pinecone에 저장
            vector_id = PineconeService._generate_vector_id({
                "symbol": symbol,
                "data_type": "stock_indicators",
                "timestamp": metadata["timestamp"],
                "chunk_idx": 0
            })

            success = await self.pinecone_service.upsert_stock_embedding(
                vector_id=vector_id,
                embedding=embedding,
                metadata=metadata
            )

            if success:
                logger.info(f"[OK] Stock indicators embedded for {symbol}")
                return {
                    "status": "success",
                    "symbol": symbol,
                    "vector_id": vector_id,
                    "embedding_dimension": len(embedding),
                    "text_length": len(text)
                }
            else:
                return {
                    "status": "error",
                    "symbol": symbol,
                    "reason": "Failed to save to Pinecone"
                }

        except Exception as e:
            logger.error(f"[ERROR] Error embedding stock indicators for {symbol}: {str(e)}")
            return {
                "status": "error",
                "symbol": symbol,
                "reason": str(e)
            }

    async def embed_price_history(self, symbol: str, chunk_size: int = 30) -> Dict:
        """
        주가 히스토리를 청킹하여 임베딩 저장

        Args:
            symbol: 종목 코드
            chunk_size: 청킹 크기 (days)

        Returns:
            처리 결과
        """
        try:
            logger.info(f"[EMBED] Starting price history embedding for {symbol}")

            # 1. DB에서 주가 히스토리 조회
            result = self.supabase.table("stock_price_history") \
                .select("*") \
                .eq("symbol", symbol.upper()) \
                .order("date", desc=True) \
                .limit(365) \
                .execute()  # 최근 1년만 가져오기

            if not result.data or len(result.data) == 0:
                logger.warning(f"[WARN] No price history found for {symbol}")
                return {
                    "status": "error",
                    "symbol": symbol,
                    "reason": "No price history found"
                }

            price_data = result.data

            # 2. 청킹: chunk_size일씩 그룹화
            chunks = self._chunk_price_data(price_data, chunk_size)

            # 3. 각 청크를 임베딩으로 변환
            embeddings_to_save = []

            for chunk_idx, chunk in enumerate(chunks):
                # 청크 데이터를 자연어로 변환
                chunk_text = self._textify_price_chunk(symbol, chunk, chunk_idx)

                # 임베딩 생성
                embedding = await self.embedding_service.generate_embedding(chunk_text)

                if not embedding:
                    logger.warning(f"[WARN] Failed to generate embedding for chunk {chunk_idx}")
                    continue

                # 메타데이터 준비
                start_date = chunk[0].get("date") if chunk else None
                end_date = chunk[-1].get("date") if chunk else None

                metadata = {
                    "symbol": symbol.upper(),
                    "data_type": "price_history",
                    "chunk_idx": chunk_idx,
                    "start_date": start_date,
                    "end_date": end_date,
                    "chunk_size": len(chunk),
                    "timestamp": datetime.now().isoformat(),
                    "text_preview": chunk_text[:200]
                }

                vector_id = PineconeService._generate_vector_id({
                    "symbol": symbol,
                    "data_type": "price_history",
                    "timestamp": end_date,
                    "chunk_idx": chunk_idx
                })

                embeddings_to_save.append((vector_id, embedding, metadata))

            # 4. 배치로 Pinecone에 저장
            if embeddings_to_save:
                result = await self.pinecone_service.upsert_batch_embeddings(embeddings_to_save)

                logger.info(f"[OK] Price history embedded for {symbol}: {len(embeddings_to_save)} chunks")
                return {
                    "status": "success",
                    "symbol": symbol,
                    "chunks_created": len(embeddings_to_save),
                    "total_days": len(price_data),
                    "pinecone_result": result
                }
            else:
                return {
                    "status": "error",
                    "symbol": symbol,
                    "reason": "No valid chunks to save"
                }

        except Exception as e:
            logger.error(f"[ERROR] Error embedding price history for {symbol}: {str(e)}")
            return {
                "status": "error",
                "symbol": symbol,
                "reason": str(e)
            }

    async def embed_stock_with_news(self, symbol: str, include_news: bool = True) -> Dict:
        """
        주식 정보 + 최신 뉴스를 통합하여 임베딩

        Args:
            symbol: 종목 코드
            include_news: 뉴스 포함 여부

        Returns:
            처리 결과
        """
        try:
            logger.info(f"[EMBED] Starting comprehensive embedding for {symbol} (news: {include_news})")

            # 1. 주식 지표 임베딩
            indicators_result = await self.embed_stock_indicators(symbol)

            # 2. 주가 히스토리 임베딩
            history_result = await self.embed_price_history(symbol)

            # 3. 뉴스 임베딩 (옵션)
            news_result = None
            if include_news:
                news_result = await self.embed_recent_news(symbol)

            return {
                "status": "success",
                "symbol": symbol,
                "indicators": indicators_result,
                "price_history": history_result,
                "news": news_result,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"[ERROR] Error embedding stock with news for {symbol}: {str(e)}")
            return {
                "status": "error",
                "symbol": symbol,
                "reason": str(e)
            }

    async def embed_recent_news(self, symbol: str, limit: int = 5) -> Dict:
        """
        최근 뉴스를 청킹하여 임베딩 저장

        Args:
            symbol: 종목 코드
            limit: 조회할 뉴스 개수

        Returns:
            처리 결과
        """
        try:
            logger.info(f"[EMBED] Starting news embedding for {symbol}")

            # 1. DB에서 최근 뉴스 조회
            result = self.supabase.table("news_articles")\
                .select("*")\
                .eq("symbol", symbol.upper())\
                .order("published_at", desc=True)\
                .limit(limit)\
                .execute()

            if not result.data:
                logger.warning(f"[WARN] No news found for {symbol}")
                return {
                    "status": "error",
                    "symbol": symbol,
                    "reason": "No news articles found"
                }

            news_articles = result.data
            embeddings_to_save = []

            for article_idx, article in enumerate(news_articles):
                # 뉴스를 청킹 (본문이 너무 길 수 있음)
                chunks = self._chunk_article_text(
                    article.get("body") or article.get("description"),
                    max_tokens=500
                )

                for chunk_idx, chunk_text in enumerate(chunks):
                    # 임베딩 생성
                    embedding = await self.embedding_service.generate_embedding(chunk_text)

                    if not embedding:
                        logger.warning(f"[WARN] Failed to generate embedding for news chunk")
                        continue

                    metadata = {
                        "symbol": symbol.upper(),
                        "data_type": "news",
                        "article_idx": article_idx,
                        "chunk_idx": chunk_idx,
                        "title": article.get("title", ""),
                        "source": article.get("source", ""),
                        "published_at": article.get("published_at"),
                        "url": article.get("url"),
                        "timestamp": datetime.now().isoformat(),
                        "text_preview": chunk_text[:200]
                    }

                    vector_id = PineconeService._generate_vector_id({
                        "symbol": symbol,
                        "data_type": "news",
                        "timestamp": article.get("published_at", datetime.now().isoformat()),
                        "chunk_idx": article_idx * 100 + chunk_idx
                    })

                    embeddings_to_save.append((vector_id, embedding, metadata))

            # 2. 배치로 Pinecone에 저장
            if embeddings_to_save:
                result = await self.pinecone_service.upsert_batch_embeddings(embeddings_to_save)

                logger.info(f"[OK] News embedded for {symbol}: {len(embeddings_to_save)} chunks")
                return {
                    "status": "success",
                    "symbol": symbol,
                    "articles_processed": len(news_articles),
                    "chunks_created": len(embeddings_to_save),
                    "pinecone_result": result
                }
            else:
                return {
                    "status": "error",
                    "symbol": symbol,
                    "reason": "No valid news chunks to save"
                }

        except Exception as e:
            logger.error(f"[ERROR] Error embedding news for {symbol}: {str(e)}")
            return {
                "status": "error",
                "symbol": symbol,
                "reason": str(e)
            }

    async def embed_batch_symbols(self, symbols: List[str]) -> Dict:
        """
        여러 종목을 배치로 임베딩 처리

        Args:
            symbols: 종목 코드 리스트

        Returns:
            처리 결과
        """
        try:
            logger.info(f"[EMBED] Starting batch embedding for {len(symbols)} symbols")

            results = {
                "status": "success",
                "total_symbols": len(symbols),
                "successful": 0,
                "failed": 0,
                "details": []
            }

            # 동시 처리 (최대 5개 동시 실행)
            semaphore = asyncio.Semaphore(5)

            async def embed_with_semaphore(symbol):
                async with semaphore:
                    return await self.embed_stock_with_news(symbol)

            # 모든 심볼 처리
            tasks = [embed_with_semaphore(symbol) for symbol in symbols]
            embed_results = await asyncio.gather(*tasks, return_exceptions=True)

            # 결과 집계
            for symbol, result in zip(symbols, embed_results):
                if isinstance(result, Exception):
                    results["failed"] += 1
                    results["details"].append({
                        "symbol": symbol,
                        "status": "error",
                        "reason": str(result)
                    })
                elif result.get("status") == "success":
                    results["successful"] += 1
                    results["details"].append(result)
                else:
                    results["failed"] += 1
                    results["details"].append(result)

            logger.info(f"[OK] Batch embedding completed: {results['successful']} successful, {results['failed']} failed")
            return results

        except Exception as e:
            logger.error(f"[ERROR] Error in batch embedding: {str(e)}")
            return {
                "status": "error",
                "reason": str(e)
            }

    # ===== Helper Methods =====

    @staticmethod
    def _chunk_price_data(price_data: List[Dict], chunk_size: int = 30) -> List[List[Dict]]:
        """
        주가 데이터를 chunk_size일씩 그룹화

        Args:
            price_data: 주가 데이터 리스트
            chunk_size: 청크 크기 (일)

        Returns:
            청킹된 데이터
        """
        chunks = []
        for i in range(0, len(price_data), chunk_size):
            chunks.append(price_data[i:i + chunk_size])
        return chunks

    @staticmethod
    def _textify_price_chunk(symbol: str, chunk: List[Dict], chunk_idx: int) -> str:
        """
        주가 청크를 자연어로 변환

        Args:
            symbol: 종목 코드
            chunk: 주가 데이터 청크
            chunk_idx: 청크 인덱스

        Returns:
            자연어 문장
        """
        if not chunk:
            return f"No price data available for {symbol}."

        # 정렬 (날짜 오래된 것부터)
        sorted_chunk = sorted(chunk, key=lambda x: x.get("date", ""), reverse=True)

        start_date = sorted_chunk[-1].get("date", "")
        end_date = sorted_chunk[0].get("date", "")

        # 통계 계산
        closes = [float(c.get("close", 0)) for c in sorted_chunk if c.get("close")]
        if not closes:
            return f"Insufficient price data for {symbol}."

        start_price = closes[-1] if closes else 0
        end_price = closes[0] if closes else 0
        min_price = min(closes)
        max_price = max(closes)
        avg_price = sum(closes) / len(closes)

        price_change = end_price - start_price
        price_change_percent = (price_change / start_price * 100) if start_price else 0

        # 평균 거래량
        volumes = [int(v.get("volume", 0)) for v in sorted_chunk if v.get("volume")]
        avg_volume = sum(volumes) / len(volumes) if volumes else 0

        text = (
            f"Price history for {symbol} from {start_date} to {end_date} ({len(sorted_chunk)} days): "
            f"The stock moved from ${start_price:.2f} to ${end_price:.2f}, "
            f"a {'+' if price_change > 0 else ''}{price_change_percent:.2f}% change. "
            f"During this period, the price ranged from a low of ${min_price:.2f} to a high of ${max_price:.2f}, "
            f"with an average price of ${avg_price:.2f}. "
            f"Average daily trading volume was {avg_volume:,.0f} shares. "
            f"This {'upward' if price_change > 0 else 'downward' if price_change < 0 else 'stable'} trend reflects "
            f"{'strong buying pressure' if price_change_percent > 5 else 'selling pressure' if price_change_percent < -5 else 'market consolidation'}."
        )

        return text

    @staticmethod
    def _chunk_article_text(text: str, max_tokens: int = 500) -> List[str]:
        """
        긴 기사 텍스트를 토큰 기반으로 청킹

        Args:
            text: 기사 본문
            max_tokens: 최대 토큰 수

        Returns:
            청킹된 텍스트 리스트
        """
        if not text:
            return []

        # 간단한 토큰 근사 (1 단어 ≈ 1.3 토큰)
        token_to_char_ratio = 4  # 대략 4글자 = 1토큰

        max_chars = max_tokens * token_to_char_ratio

        # 문장별로 분할
        sentences = text.split(".")
        chunks = []
        current_chunk = ""

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            test_chunk = current_chunk + sentence + ". "

            if len(test_chunk) <= max_chars:
                current_chunk = test_chunk
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "

        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks if chunks else [text[:max_chars]]
