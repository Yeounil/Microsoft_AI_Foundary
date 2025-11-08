#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pinecone 연결 테스트 스크립트
.env 설정이 올바른지 확인하고 인덱스 연결을 테스트합니다.
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


def test_env_file():
    """1단계: .env 파일 확인"""
    logger.info("=" * 70)
    logger.info("[STEP 1] .env 파일 확인")
    logger.info("=" * 70)

    env_file = Path(__file__).parent / ".env"

    if not env_file.exists():
        logger.error(f"❌ .env 파일이 없습니다: {env_file}")
        return False

    logger.info(f"✅ .env 파일 발견: {env_file}")

    # .env 파일 내용 확인
    with open(env_file, "r") as f:
        content = f.read()

    # PINECONE_API_KEY 확인
    if "PINECONE_API_KEY=" in content:
        logger.info("✅ PINECONE_API_KEY 설정 확인")

        # 값 확인
        for line in content.split("\n"):
            if line.startswith("PINECONE_API_KEY="):
                key_value = line.split("=", 1)[1].strip()
                if key_value and not key_value.startswith("your_"):
                    logger.info(f"✅ API 키 값 설정됨 (길이: {len(key_value)} 문자)")
                    logger.info(f"   키 형식: {key_value[:10]}...{key_value[-10:]}")
                    return True
                else:
                    logger.error("❌ API 키 값이 설정되지 않았거나 예시값입니다")
                    logger.error(f"   현재 값: {key_value}")
                    return False
    else:
        logger.error("❌ PINECONE_API_KEY가 .env에 없습니다")
        return False

    return False


def test_config_loading():
    """2단계: Config 설정 로드 확인"""
    logger.info("\n" + "=" * 70)
    logger.info("[STEP 2] Config 설정 로드 확인")
    logger.info("=" * 70)

    try:
        from app.core.config import settings

        pinecone_key = getattr(settings, "pinecone_api_key", None)

        if pinecone_key:
            logger.info("✅ Config에서 PINECONE_API_KEY 로드됨")
            logger.info(f"   키 길이: {len(pinecone_key)} 문자")
            return True
        else:
            logger.error("❌ Config에서 PINECONE_API_KEY를 찾을 수 없습니다")
            return False

    except Exception as e:
        logger.error(f"❌ Config 로드 실패: {str(e)}")
        return False


async def test_pinecone_connection():
    """3단계: Pinecone 연결 테스트"""
    logger.info("\n" + "=" * 70)
    logger.info("[STEP 3] Pinecone 연결 테스트")
    logger.info("=" * 70)

    try:
        from app.services.pinecone_service import PineconeService

        service = PineconeService()

        # Pinecone 클라이언트 확인
        if service.pc is None:
            logger.error("❌ Pinecone 클라이언트 초기화 실패")
            logger.error("   → pinecone-client 패키지가 설치되었는지 확인하세요")
            logger.error("   → pip install pinecone-client")
            return False

        logger.info("✅ Pinecone 클라이언트 초기화 성공")

        # 인덱스 연결 확인
        if service.index is None:
            logger.error("❌ Pinecone 인덱스 연결 실패")
            logger.error("   → 인덱스명: financial-embeddings")
            logger.error("   → Pinecone 콘솔에서 인덱스가 'Ready' 상태인지 확인하세요")
            return False

        logger.info("✅ Pinecone 인덱스 연결 성공")
        logger.info(f"   인덱스명: {service.index_name}")

        return True

    except ImportError as e:
        logger.error(f"❌ 패키지 임포트 실패: {str(e)}")
        logger.error("   → pip install pinecone-client")
        return False
    except Exception as e:
        logger.error(f"❌ Pinecone 연결 중 오류: {str(e)}")
        return False


async def test_pinecone_stats():
    """4단계: Pinecone 인덱스 통계 조회"""
    logger.info("\n" + "=" * 70)
    logger.info("[STEP 4] Pinecone 인덱스 통계 조회")
    logger.info("=" * 70)

    try:
        from app.services.pinecone_service import PineconeService

        service = PineconeService()

        if service.index is None:
            logger.warning("⚠️  Pinecone 인덱스가 연결되지 않았습니다 (이전 단계 확인)")
            return False

        stats = await service.get_index_stats()

        if stats.get("status") == "success":
            logger.info("✅ 인덱스 통계 조회 성공")
            logger.info(f"   - 인덱스명: {stats.get('index_name')}")
            logger.info(f"   - 저장된 벡터 수: {stats.get('total_vectors'):,}")
            logger.info(f"   - 벡터 차원: {stats.get('dimension')}")
            logger.info(f"   - Timestamp: {stats.get('timestamp')}")
            return True
        else:
            logger.error(f"❌ 통계 조회 실패: {stats.get('reason')}")
            return False

    except Exception as e:
        logger.error(f"❌ 통계 조회 중 오류: {str(e)}")
        return False


async def test_embedding_generation():
    """5단계: 임베딩 생성 테스트 (옵션)"""
    logger.info("\n" + "=" * 70)
    logger.info("[STEP 5] 임베딩 생성 테스트")
    logger.info("=" * 70)

    try:
        from app.services.openai_service import OpenAIService

        service = OpenAIService()

        test_text = "Apple Inc. (AAPL) is a technology company with a market cap of $3.2 trillion."

        logger.info(f"테스트 텍스트: {test_text}")

        embedding = await service.generate_embedding(test_text)

        if embedding and len(embedding) > 0:
            logger.info("✅ 임베딩 생성 성공")
            logger.info(f"   - 차원: {len(embedding)}")
            logger.info(f"   - 첫 5개 값: {embedding[:5]}")
            return True
        else:
            logger.error("❌ 임베딩 생성 실패")
            return False

    except Exception as e:
        logger.error(f"❌ 임베딩 생성 중 오류: {str(e)}")
        return False


async def main():
    """메인 테스트 함수"""
    logger.info("\n" + "🔧 Pinecone 연결 테스트 시작\n")

    results = {
        "env_file": False,
        "config_loading": False,
        "pinecone_connection": False,
        "pinecone_stats": False,
        "embedding_generation": False
    }

    # 1단계: .env 파일 확인
    results["env_file"] = test_env_file()

    if not results["env_file"]:
        logger.error("\n❌ .env 파일 설정 오류 - 이후 테스트 건너뜀")
        print_summary(results)
        return

    # 2단계: Config 로드 확인
    results["config_loading"] = test_config_loading()

    if not results["config_loading"]:
        logger.error("\n❌ Config 로드 오류 - Pinecone 테스트 건너뜀")
        print_summary(results)
        return

    # 3단계: Pinecone 연결 테스트
    results["pinecone_connection"] = await test_pinecone_connection()

    if not results["pinecone_connection"]:
        logger.error("\n❌ Pinecone 연결 실패 - 이후 테스트 건너뜀")
        print_summary(results)
        return

    # 4단계: 인덱스 통계 조회
    results["pinecone_stats"] = await test_pinecone_stats()

    # 5단계: 임베딩 생성 테스트
    results["embedding_generation"] = await test_embedding_generation()

    # 결과 요약
    print_summary(results)


def print_summary(results: dict):
    """테스트 결과 요약"""
    logger.info("\n" + "=" * 70)
    logger.info("📊 테스트 결과 요약")
    logger.info("=" * 70)

    tests = [
        ("1. .env 파일 확인", results["env_file"]),
        ("2. Config 설정 로드", results["config_loading"]),
        ("3. Pinecone 연결", results["pinecone_connection"]),
        ("4. 인덱스 통계 조회", results["pinecone_stats"]),
        ("5. 임베딩 생성 테스트", results["embedding_generation"]),
    ]

    passed = 0
    for test_name, passed_flag in tests:
        status = "✅ PASS" if passed_flag else "❌ FAIL"
        logger.info(f"{test_name}: {status}")
        if passed_flag:
            passed += 1

    logger.info("=" * 70)
    logger.info(f"총 결과: {passed}/{len(tests)} 통과\n")

    if passed == len(tests):
        logger.info("🎉 모든 테스트 통과! Pinecone이 올바르게 설정되었습니다.")
    else:
        logger.error(f"⚠️  {len(tests) - passed}개 테스트 실패 - 위의 오류 메시지를 확인하세요")


if __name__ == "__main__":
    logger.info("\n🔌 Pinecone 연결 테스트 (5단계)\n")

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n테스트 중단됨")
    except Exception as e:
        logger.error(f"테스트 실패: {str(e)}")
        import traceback

        traceback.print_exc()
