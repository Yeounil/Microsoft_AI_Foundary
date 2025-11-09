#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pinecone 인덱스 설정 스크립트
financial-embeddings 인덱스를 생성합니다.
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


async def create_pinecone_index():
    """Pinecone 인덱스 생성"""
    logger.info("=" * 70)
    logger.info("🔧 Pinecone 인덱스 설정 시작")
    logger.info("=" * 70)

    try:
        from pinecone import Pinecone
        from app.core.config import settings

        # Pinecone API 키 확인
        pinecone_api_key = getattr(settings, "pinecone_api_key", None)
        if not pinecone_api_key:
            logger.error("❌ PINECONE_API_KEY가 설정되지 않았습니다")
            return False

        logger.info("✅ PINECONE_API_KEY 확인됨")

        # Pinecone 클라이언트 초기화
        pc = Pinecone(api_key=pinecone_api_key)
        logger.info("✅ Pinecone 클라이언트 초기화 완료")

        # Admin 클라이언트를 통해 인덱스 생성
        from pinecone import Pinecone

        index_name = "financial-embeddings"
        dimension = 1536
        metric = "cosine"

        # 기존 인덱스 확인
        logger.info("\n📋 기존 인덱스 목록 확인...")
        indexes_response = pc.list_indexes()

        # 인덱스 이름 목록 추출
        if hasattr(indexes_response, 'names'):
            existing_indexes = list(indexes_response.names())
        else:
            existing_indexes = [idx['name'] for idx in indexes_response]

        logger.info(f"현재 생성된 인덱스: {existing_indexes}")

        if index_name in existing_indexes:
            logger.warning(f"⚠️  인덱스 '{index_name}'이 이미 존재합니다")
            logger.info("기존 인덱스를 사용합니다")

            # 기존 인덱스에 연결
            index = pc.Index(index_name)
            stats = index.describe_index_stats()
            logger.info(f"✅ 인덱스 연결 성공: {index_name}")
            logger.info(f"   - 저장된 벡터 수: {stats.get('total_vector_count', 0):,}")
            logger.info(f"   - 벡터 차원: {stats.get('dimension', 0)}")
            return True

        # 새로운 인덱스 생성
        logger.info(f"\n📝 새로운 인덱스 생성 중...")
        logger.info(f"   - 인덱스명: {index_name}")
        logger.info(f"   - 차원: {dimension}")
        logger.info(f"   - 메트릭: {metric}")

        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric=metric,
            spec={
                "serverless": {
                    "cloud": "aws",
                    "region": "us-east-1"
                }
            }
        )

        logger.info("✅ 인덱스 생성 완료")

        # 인덱스 준비 대기
        logger.info("\n⏳ 인덱스 준비 중... (최대 2-3분 소요)")

        max_wait = 180  # 3분
        wait_interval = 5
        elapsed = 0

        while elapsed < max_wait:
            indexes_response = pc.list_indexes()
            if hasattr(indexes_response, 'names'):
                existing_indexes = list(indexes_response.names())
            else:
                existing_indexes = [idx['name'] for idx in indexes_response]

            if index_name in existing_indexes:
                index = pc.Index(index_name)
                stats = index.describe_index_stats()
                logger.info(f"✅ 인덱스 준비 완료!")
                logger.info(f"   인덱스명: {index_name}")
                logger.info(f"   차원: {stats.get('dimension', 0)}")
                logger.info(f"   저장된 벡터 수: {stats.get('total_vector_count', 0):,}")
                return True

            logger.info(f"   {elapsed}/{max_wait}초... 대기 중...")
            await asyncio.sleep(wait_interval)
            elapsed += wait_interval

        logger.error("❌ 인덱스 생성 시간 초과")
        return False

    except Exception as e:
        logger.error(f"❌ 인덱스 생성 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """메인 함수"""
    success = await create_pinecone_index()

    logger.info("\n" + "=" * 70)
    if success:
        logger.info("🎉 Pinecone 인덱스 설정 완료!")
        logger.info("이제 embedding_test.py를 실행할 수 있습니다")
    else:
        logger.error("⚠️  Pinecone 인덱스 설정 실패")
        logger.error("위의 오류 메시지를 확인하세요")
    logger.info("=" * 70)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n설정 중단됨")
    except Exception as e:
        logger.error(f"설정 실패: {str(e)}")
        import traceback
        traceback.print_exc()
