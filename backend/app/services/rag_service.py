"""
RAG (Retrieval Augmented Generation) 서비스
Vector DB에서 검색한 데이터를 기반으로 GPT-5에 컨텍스트를 제공하는 서비스
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class RAGService:
    """
    Retrieval Augmented Generation 서비스
    Pinecone의 벡터 검색 결과를 활용하여 GPT-5에 정확한 금융 데이터 제공
    """

    def __init__(self):
        """RAG 서비스 초기화"""
        from app.services.pinecone_service import PineconeService
        from app.services.openai_service import OpenAIService
        from app.db.supabase_client import get_supabase

        self.pinecone_service = PineconeService()
        self.openai_service = OpenAIService()
        self.supabase = get_supabase()

        logger.info("[INIT] RAG Service initialized")

    async def search_similar_stocks(
        self,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict] = None
    ) -> Dict:
        """
        사용자 쿼리를 기반으로 유사한 주식 검색

        Args:
            query: 사용자 쿼리 (예: "AI 기업", "반도체 기업", "Apple과 유사한 회사")
            top_k: 반환할 결과 개수 (기본값: 5)
            filters: 필터링 조건 (예: {"sector": "technology"})

        Returns:
            검색 결과 및 메타데이터
        """
        try:
            logger.info(f"[RAG] Starting search for query: '{query}'")

            # 1단계: 사용자 쿼리를 임베딩으로 변환
            logger.info("[RAG] Step 1: Generating embedding for query...")
            query_embedding = await self.openai_service.generate_embedding(query)

            if not query_embedding:
                logger.error("[RAG] Failed to generate query embedding")
                return {
                    "status": "error",
                    "reason": "Failed to generate query embedding"
                }

            logger.info(f"[RAG] Query embedding generated (dimension: {len(query_embedding)})")

            # 2단계: Pinecone에서 유사 벡터 검색
            logger.info("[RAG] Step 2: Searching similar vectors in Pinecone...")
            similar_stocks = await self.pinecone_service.query_similar_stocks(
                query_embedding=query_embedding,
                top_k=top_k,
                filters=filters
            )

            logger.info(f"[RAG] Found {len(similar_stocks)} similar stocks")

            # 3단계: 검색 결과에 추가 정보 추가
            logger.info("[RAG] Step 3: Enriching search results with detailed data...")
            enriched_results = await self._enrich_search_results(similar_stocks)

            return {
                "status": "success",
                "query": query,
                "total_results": len(enriched_results),
                "top_k": top_k,
                "results": enriched_results,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"[RAG] Search failed: {str(e)}")
            return {
                "status": "error",
                "reason": str(e)
            }

    async def _enrich_search_results(
        self,
        search_results: List[Dict]
    ) -> List[Dict]:
        """
        검색 결과에 Supabase의 추가 정보를 추가

        Args:
            search_results: Pinecone 검색 결과

        Returns:
            상세 정보가 포함된 검색 결과
        """
        enriched = []

        for result in search_results:
            symbol = result.get("symbol")

            try:
                # Supabase에서 주식 지표 정보 조회
                indicator_result = self.supabase.table("stock_indicators") \
                    .select("*") \
                    .eq("symbol", symbol) \
                    .execute()

                if indicator_result.data:
                    indicators = indicator_result.data[0]

                    enriched.append({
                        "vector_id": result.get("vector_id"),
                        "similarity_score": round(result.get("score", 0), 4),
                        "symbol": symbol,
                        "company_name": result.get("company_name", indicators.get("company_name")),
                        "sector": result.get("sector", indicators.get("sector")),
                        "industry": result.get("industry", indicators.get("industry")),
                        "current_price": indicators.get("current_price"),
                        "market_cap": indicators.get("market_cap"),
                        "pe_ratio": indicators.get("pe_ratio"),
                        "eps": indicators.get("eps"),
                        "dividend_yield": indicators.get("dividend_yield"),
                        "roe": indicators.get("roe"),
                        "roa": indicators.get("roa"),
                        "debt_to_equity": indicators.get("debt_to_equity"),
                        "profit_margin": indicators.get("profit_margin"),
                        "current_ratio": indicators.get("current_ratio"),
                        "metadata": result.get("metadata")
                    })
                    logger.info(f"[RAG] Enriched data for {symbol}")

                else:
                    # 기본 정보만 포함
                    logger.warning(f"[RAG] No indicators found for {symbol}, using basic info")
                    enriched.append(result)

            except Exception as e:
                logger.warning(f"[RAG] Failed to enrich {symbol}: {str(e)}")
                enriched.append(result)

        return enriched

    async def generate_rag_context(
        self,
        query: str,
        top_k: int = 5
    ) -> Dict:
        """
        RAG용 컨텍스트 생성 (GPT-5에 전달할 형식)

        Args:
            query: 사용자 쿼리
            top_k: 검색할 상위 결과 개수

        Returns:
            GPT-5에 전달할 포맷의 컨텍스트
        """
        try:
            logger.info(f"[RAG] Generating context for query: '{query}'")

            # 유사 주식 검색
            search_result = await self.search_similar_stocks(query, top_k)

            if search_result.get("status") != "success":
                return {
                    "status": "error",
                    "reason": search_result.get("reason")
                }

            results = search_result.get("results", [])

            # 컨텍스트 문본 생성
            context_text = self._build_context_text(query, results)

            return {
                "status": "success",
                "query": query,
                "context": context_text,
                "source_data": results,
                "total_results": len(results),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"[RAG] Context generation failed: {str(e)}")
            return {
                "status": "error",
                "reason": str(e)
            }

    def _build_context_text(self, query: str, results: List[Dict]) -> str:
        """
        GPT-5에 전달할 컨텍스트 텍스트 구성

        Args:
            query: 사용자 쿼리
            results: 검색된 주식 결과

        Returns:
            포맷된 컨텍스트 텍스트
        """
        context_lines = [
            "=" * 80,
            "검색된 유사 기업 정보",
            "=" * 80,
            f"\n사용자 쿼리: {query}\n",
            f"검색 날짜: {datetime.now().strftime('%Y년 %m월 %d일 %H:%M:%S')}\n",
            "=" * 80,
            "\n[검색 결과]\n"
        ]

        for idx, result in enumerate(results, 1):
            # 기본 정보
            symbol = result.get("symbol", "N/A")
            company_name = result.get("company_name", "N/A")
            score = result.get("similarity_score", 0)
            sector = result.get("sector", "N/A")
            industry = result.get("industry", "N/A")

            # 재무 정보
            current_price = result.get("current_price", 0)
            market_cap = result.get("market_cap", 0)
            pe_ratio = result.get("pe_ratio", 0)
            eps = result.get("eps", 0)
            roe = result.get("roe", 0)
            profit_margin = result.get("profit_margin", 0)
            debt_to_equity = result.get("debt_to_equity", 0)

            context_lines.append(f"#{idx} {symbol} - {company_name}")
            context_lines.append(f"   유사도: {score*100:.1f}%")
            context_lines.append(f"   산업: {sector} / {industry}")
            context_lines.append(f"")
            context_lines.append(f"   [가격 정보]")
            context_lines.append(f"   - 현재 가격: ${current_price:,.2f}")
            context_lines.append(f"   - 시가총액: ${market_cap:,.0f}")
            context_lines.append(f"")
            context_lines.append(f"   [밸류에이션]")
            context_lines.append(f"   - P/E 비율: {pe_ratio:.2f}x")
            context_lines.append(f"   - EPS: ${eps:.2f}")
            context_lines.append(f"")
            context_lines.append(f"   [수익성]")
            context_lines.append(f"   - ROE: {roe:.2f}%")
            context_lines.append(f"   - 순이익률: {profit_margin:.2f}%")
            context_lines.append(f"")
            context_lines.append(f"   [재무 안정성]")
            context_lines.append(f"   - 부채비율(D/E): {debt_to_equity:.2f}")
            context_lines.append(f"")

        context_lines.append("=" * 80)
        context_lines.append("\n이 정보를 바탕으로 사용자의 질문에 답변해주세요.\n")

        return "\n".join(context_lines)

    async def query_with_rag(
        self,
        query: str,
        system_prompt: Optional[str] = None,
        top_k: int = 5
    ) -> Dict:
        """
        RAG를 활용한 GPT-5 쿼리

        Args:
            query: 사용자 질문
            system_prompt: 시스템 프롬프트 (기본값: 금융 분석 전문가)
            top_k: 검색할 상위 결과 개수

        Returns:
            GPT-5 응답
        """
        try:
            logger.info(f"[RAG] Starting RAG query: '{query}'")

            # 1단계: 컨텍스트 생성
            logger.info("[RAG] Step 1: Generating RAG context...")
            context_result = await self.generate_rag_context(query, top_k)

            if context_result.get("status") != "success":
                return {
                    "status": "error",
                    "reason": context_result.get("reason")
                }

            context = context_result.get("context")
            source_data = context_result.get("source_data")

            # 2단계: GPT-5에 프롬프트 전송
            logger.info("[RAG] Step 2: Calling GPT-5 with RAG context...")

            if not system_prompt:
                system_prompt = """당신은 전문적인 금융 분석가입니다.
다음의 실시간 금융 데이터를 바탕으로 사용자의 질문에 정확하고 객관적인 답변을 제공합니다.

분석할 때 다음 사항을 고려하세요:
1. 제공된 데이터를 바탕으로만 답변
2. 불확실한 정보는 명확히 표시
3. 투자 조언이 아닌 정보 제공
4. 각 기업의 강점과 약점을 균형있게 분석
5. 구체적인 수치와 지표 활용"""

            # 프롬프트 구성
            messages = [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": f"{context}\n\n사용자 질문: {query}"
                }
            ]

            # GPT-5 호출
            response = await self.openai_service.async_chat_completion(
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )

            if not response:
                logger.error("[RAG] GPT-5 call failed")
                return {
                    "status": "error",
                    "reason": "GPT-5 call failed"
                }

            logger.info("[RAG] GPT-5 response received successfully")

            return {
                "status": "success",
                "query": query,
                "response": response,
                "source_data_count": len(source_data),
                "source_symbols": [r.get("symbol") for r in source_data],
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"[RAG] Query failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "status": "error",
                "reason": str(e)
            }

    async def compare_stocks(
        self,
        symbol_1: str,
        symbol_2: str,
        analysis_type: str = "comprehensive"
    ) -> Dict:
        """
        두 종목 비교 분석

        Args:
            symbol_1: 첫 번째 종목
            symbol_2: 두 번째 종목
            analysis_type: 분석 유형 ('comprehensive', 'valuation', 'profitability')

        Returns:
            비교 분석 결과
        """
        try:
            logger.info(f"[RAG] Comparing {symbol_1} vs {symbol_2}")

            # 두 종목의 데이터 조회
            result_1 = self.supabase.table("stock_indicators") \
                .select("*") \
                .eq("symbol", symbol_1) \
                .execute()

            result_2 = self.supabase.table("stock_indicators") \
                .select("*") \
                .eq("symbol", symbol_2) \
                .execute()

            if not result_1.data or not result_2.data:
                logger.error(f"[RAG] Stock data not found")
                return {
                    "status": "error",
                    "reason": "One or both stocks not found"
                }

            stock_1 = result_1.data[0]
            stock_2 = result_2.data[0]

            # 비교 프롬프트 생성
            comparison_context = self._build_comparison_context(
                symbol_1, stock_1,
                symbol_2, stock_2,
                analysis_type
            )

            # GPT-5 호출
            messages = [
                {
                    "role": "system",
                    "content": "당신은 전문적인 금융 분석가입니다. 제공된 데이터를 바탕으로 객관적인 비교 분석을 제공합니다."
                },
                {
                    "role": "user",
                    "content": comparison_context
                }
            ]

            response = await self.openai_service.async_chat_completion(
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )

            return {
                "status": "success",
                "symbol_1": symbol_1,
                "symbol_2": symbol_2,
                "analysis_type": analysis_type,
                "comparison": response,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"[RAG] Comparison failed: {str(e)}")
            return {
                "status": "error",
                "reason": str(e)
            }

    def _build_comparison_context(
        self,
        symbol_1: str,
        stock_1: Dict,
        symbol_2: str,
        stock_2: Dict,
        analysis_type: str
    ) -> str:
        """비교 분석용 컨텍스트 구성"""
        context = f"""
다음 두 기업을 분석 유형 '{analysis_type}'에 따라 비교해주세요.

기업 1: {symbol_1}
- 회사명: {stock_1.get('company_name')}
- 현재 가격: ${stock_1.get('current_price', 0):,.2f}
- 시가총액: ${stock_1.get('market_cap', 0):,.0f}
- P/E 비율: {stock_1.get('pe_ratio', 0):.2f}x
- ROE: {stock_1.get('roe', 0):.2f}%
- 순이익률: {stock_1.get('profit_margin', 0):.2f}%
- 부채비율(D/E): {stock_1.get('debt_to_equity', 0):.2f}
- 유동비율: {stock_1.get('current_ratio', 0):.2f}

기업 2: {symbol_2}
- 회사명: {stock_2.get('company_name')}
- 현재 가격: ${stock_2.get('current_price', 0):,.2f}
- 시가총액: ${stock_2.get('market_cap', 0):,.0f}
- P/E 비율: {stock_2.get('pe_ratio', 0):.2f}x
- ROE: {stock_2.get('roe', 0):.2f}%
- 순이익률: {stock_2.get('profit_margin', 0):.2f}%
- 부채비율(D/E): {stock_2.get('debt_to_equity', 0):.2f}
- 유동비율: {stock_2.get('current_ratio', 0):.2f}

비교 분석:
1. 두 기업의 주요 차이점과 유사점
2. 각 기업의 강점과 약점
3. 투자 관점에서의 상대적 가치 평가
4. 향후 성장 잠재력 비교
"""
        return context
