"""
Pinecone 벡터 DB를 통한 금융 데이터 임베딩 및 검색 서비스
"""

import logging
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)


class PineconeService:
    """
    Pinecone 벡터 데이터베이스를 통한 임베딩 저장 및 검색
    금융 데이터(기업 지표, 뉴스, 기술적 분석)를 벡터화하여 저장
    """

    def __init__(self):
        """Pinecone 클라이언트 초기화"""
        try:
            from pinecone import Pinecone
            from app.core.config import settings

            self.pinecone_api_key = settings.pinecone_api_key if hasattr(settings, 'pinecone_api_key') else None

            if not self.pinecone_api_key:
                logger.warning("[WARN] Pinecone API key not configured")
                self.pc = None
                self.index = None
                return

            # Pinecone 클라이언트 초기화
            self.pc = Pinecone(api_key=self.pinecone_api_key)

            # 인덱스 이름 설정
            self.index_name = "financial-embedding"

            # 인덱스 가져오기
            try:
                self.index = self.pc.Index(self.index_name)
                logger.info(f"[OK] Connected to Pinecone index: {self.index_name}")
            except Exception as e:
                logger.error(f"[ERROR] Failed to connect to Pinecone index: {str(e)}")
                self.index = None

        except ImportError:
            logger.warning("[WARN] Pinecone library not installed. Install with: pip install pinecone-client")
            self.pc = None
            self.index = None

    @staticmethod
    def _generate_vector_id(data_dict: Dict) -> str:
        """
        데이터 기반으로 고유한 벡터 ID 생성

        Args:
            data_dict: 데이터 딕셔너리 (symbol, type, timestamp 등 포함)

        Returns:
            생성된 벡터 ID
        """
        symbol = data_dict.get("symbol", "unknown")
        data_type = data_dict.get("data_type", "unknown")
        timestamp = data_dict.get("timestamp", datetime.now().isoformat())
        chunk_idx = data_dict.get("chunk_idx", 0)

        # 고유 ID 생성 (format: symbol_type_timestamp_chunk)
        id_string = f"{symbol}_{data_type}_{timestamp}_{chunk_idx}"
        return hashlib.md5(id_string.encode()).hexdigest()[:12]

    async def upsert_stock_embedding(
        self,
        vector_id: str,
        embedding: List[float],
        metadata: Dict
    ) -> bool:
        """
        주식 정보 임베딩을 Pinecone에 저장

        Args:
            vector_id: 벡터 고유 ID
            embedding: 임베딩 벡터 (1536 또는 384 차원)
            metadata: 메타데이터 (symbol, company_name, market_cap 등)

        Returns:
            저장 성공 여부
        """
        try:
            if not self.index:
                logger.warning("[WARN] Pinecone index not available")
                return False

            # 메타데이터 정리
            clean_metadata = {}
            for key, value in metadata.items():
                if isinstance(value, (str, int, float, bool)):
                    clean_metadata[key] = value
                elif value is None:
                    continue
                else:
                    clean_metadata[key] = str(value)

            # Pinecone에 벡터 저장 (upsert)
            self.index.upsert(
                vectors=[(
                    vector_id,
                    embedding,
                    clean_metadata
                )]
            )

            logger.info(f"[OK] Embedding upserted: {vector_id}")
            return True

        except Exception as e:
            logger.error(f"[ERROR] Failed to upsert embedding: {str(e)}")
            return False

    async def upsert_batch_embeddings(
        self,
        vectors_data: List[Tuple[str, List[float], Dict]]
    ) -> Dict:
        """
        배치 임베딩 저장

        Args:
            vectors_data: [(vector_id, embedding, metadata), ...] 리스트

        Returns:
            저장 결과 통계
        """
        try:
            if not self.index:
                logger.warning("[WARN] Pinecone index not available")
                return {"status": "error", "reason": "Pinecone index not available"}

            # 메타데이터 정리 및 배치 준비
            batch = []
            for vector_id, embedding, metadata in vectors_data:
                clean_metadata = {}
                for key, value in metadata.items():
                    if isinstance(value, (str, int, float, bool)):
                        clean_metadata[key] = value
                    elif value is None:
                        continue
                    else:
                        clean_metadata[key] = str(value)

                batch.append((vector_id, embedding, clean_metadata))

            # Pinecone에 배치 저장
            self.index.upsert(vectors=batch, batch_size=100)

            logger.info(f"[OK] Batch upserted: {len(batch)} embeddings")
            return {
                "status": "success",
                "total_upserted": len(batch),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"[ERROR] Failed to upsert batch: {str(e)}")
            return {"status": "error", "reason": str(e)}

    async def query_similar_stocks(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        """
        유사한 주식 찾기

        Args:
            query_embedding: 쿼리 임베딩
            top_k: 반환할 상위 결과 수
            filters: 필터링 조건 (예: {"sector": "technology"})

        Returns:
            유사 주식 정보 리스트
        """
        try:
            if not self.index:
                logger.warning("[WARN] Pinecone index not available")
                return []

            # Pinecone 쿼리
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filters
            )

            # 결과 정리
            similar_stocks = []
            for match in results.get("matches", []):
                similar_stocks.append({
                    "vector_id": match.get("id"),
                    "score": match.get("score"),
                    "symbol": match.get("metadata", {}).get("symbol"),
                    "company_name": match.get("metadata", {}).get("company_name"),
                    "sector": match.get("metadata", {}).get("sector"),
                    "industry": match.get("metadata", {}).get("industry"),
                    "market_cap": match.get("metadata", {}).get("market_cap"),
                    "metadata": match.get("metadata")
                })

            logger.info(f"[OK] Query returned {len(similar_stocks)} similar stocks")
            return similar_stocks

        except Exception as e:
            logger.error(f"[ERROR] Failed to query similar stocks: {str(e)}")
            return []

    async def delete_embedding(self, vector_id: str) -> bool:
        """
        임베딩 삭제

        Args:
            vector_id: 삭제할 벡터 ID

        Returns:
            삭제 성공 여부
        """
        try:
            if not self.index:
                logger.warning("[WARN] Pinecone index not available")
                return False

            self.index.delete(ids=[vector_id])
            logger.info(f"[OK] Embedding deleted: {vector_id}")
            return True

        except Exception as e:
            logger.error(f"[ERROR] Failed to delete embedding: {str(e)}")
            return False

    async def delete_by_symbol(self, symbol: str) -> Dict:
        """
        특정 종목의 모든 임베딩 삭제

        Args:
            symbol: 종목 코드

        Returns:
            삭제 결과
        """
        try:
            if not self.index:
                logger.warning("[WARN] Pinecone index not available")
                return {"status": "error", "reason": "Pinecone index not available"}

            # 필터를 통해 해당 심볼의 벡터만 삭제
            self.index.delete(
                filter={"symbol": {"$eq": symbol}}
            )

            logger.info(f"[OK] All embeddings deleted for symbol: {symbol}")
            return {
                "status": "success",
                "symbol": symbol,
                "message": f"All embeddings for {symbol} have been deleted"
            }

        except Exception as e:
            logger.error(f"[ERROR] Failed to delete embeddings for {symbol}: {str(e)}")
            return {"status": "error", "reason": str(e)}

    async def get_index_stats(self) -> Dict:
        """
        Pinecone 인덱스 통계 조회

        Returns:
            인덱스 통계
        """
        try:
            if not self.index:
                return {"status": "error", "reason": "Pinecone index not available"}

            stats = self.index.describe_index_stats()

            return {
                "status": "success",
                "index_name": self.index_name,
                "total_vectors": stats.get("total_vector_count", 0),
                "dimension": stats.get("dimension", 0),
                "namespace_count": len(stats.get("namespaces", {})),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"[ERROR] Failed to get index stats: {str(e)}")
            return {"status": "error", "reason": str(e)}
